// EL ARRANQUE TERMINA CON SU REGISTRO DE FRICCION (change `el-arranque-deja-su-friccion`).
//
// Lo que este banco vigila NO es que el registro se arme bonito. Es que **la herramienta no
// pueda decir «LISTO» sin haberlo dejado**, porque ese es todo el diseno: un paso que se
// puede omitir se omite, y el marco ya midio que un ritual que alguien tiene que acordarse
// de hacer no es enforcement. Hasta este cambio el registro de friccion era una plantilla en
// blanco (docs/plantillas/registro-de-friccion.md) que alguien tenia que acordarse de llenar
// mientras corria la guia, y la unica instancia del repo es la de otra organizacion.
//
// Viene de Rigel 1.14.0 (change 2026-09-01-arranque-ejecutable, commit 8b24629), adaptado:
// alla lo abre una skill paralela a la guia; aca lo deja la herramienta que YA ejecuta el
// arranque —el asistente y `projects init`—, porque una skill al lado duplicaria su logica.
//
// Tres frentes, y cada uno tiene su rojo:
//   1. La condicion de termino: la corrida exitosa deja el archivo y lo dice ANTES de LISTO.
//   2. Lo que registra sale solo: todo `::warning::` de la corrida entra sin que nadie lo
//      anote, y los tropiezos del asistente viajan de su proceso al del arranque.
//   3. Lo que NO lleva: el nombre del proyecto, la cuenta ni rutas de la maquina, porque el
//      destino natural del registro es un issue en el repositorio del marco, y ese es publico.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import {
  CLASES,
  NOMBRE_PENDIENTE,
  NOMBRE_REGISTRO,
  PREGUNTA_DEL_ISSUE,
  apartamiento,
  claseDeAviso,
  comandoDelIssue,
  crearRegistro,
  cuerpo,
  escribirPendiente,
  leerPendiente,
  ofrecerElIssue,
  redactar,
  repoDelRemoto,
  tituloDelRegistro,
  vigilarAvisos,
} from "../../herramientas/registro-de-friccion.mjs";
import { PREGUNTAS, correrAsistente, reparto } from "../../herramientas/projects-asistente.mjs";
import { FORMATOS, REQUERIDOS } from "../../herramientas/projects-init.mjs";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const HERRAMIENTA = path.join(RAIZ, "herramientas/projects-init.mjs");

const VALORES = {
  PROYECTO: "people-agenda",
  ORG: "Ejemplo-Org",
  PAQUETE_API: "api",
  PAQUETE_WEB: "web",
  PAQUETE_E2E: "e2e",
  PAQUETE_SITIO: "sitio",
  ORG_MARCO: "im-diego-ec",
  GENERAR_CLIENTE_DATOS: "prisma generate",
  EQUIPO_BUILDERS: "builders",
  EQUIPO_PO: "po",
  BUILDER_1: "builder-uno",
  BUILDER_2: "builder-dos",
  PO: "el-po",
  CUENTA_DEV: "111111111111",
  CUENTA_PROD: "222222222222",
  REGION: "us-east-1",
  PERFIL_DEV: "perfil-dev",
  PERFIL_PROD: "perfil-prod",
  PREFIJO_RECURSOS: "agenda",
  DOMINIO_DEV: "agenda-dev.ejemplo.com",
  DOMINIO_PROD: "agenda.ejemplo.com",
  CANAL_ALERTAS: "#alertas-prod",
  ID_MCP_SLACK: "id-de-slack",
};

const unApartamiento = () =>
  apartamiento({
    clase: "SIN_COMPROBAR",
    punto: "la proteccion de main",
    real: "PROTECCION DE MAIN: NO se pudo medir (sin-auth: gh no tiene sesion)",
  });

// ─────────────────────────── las piezas ───────────────────────────

test("las seis clases estan todas, y ninguna de mas", () => {
  // Las cinco de Rigel mas PREGUNTA, que es la que aca justifica el asistente: Rigel no tiene
  // uno, y la friccion de una pregunta que no se entiende a la primera no cabe en ninguna de
  // las otras. Una clase de mas es una categoria que alguien invento y la proxima persona
  // toma por buena.
  assert.deepEqual(Object.keys(CLASES).sort(), [
    "COMANDO",
    "ORDEN",
    "PASO_NO_APLICA",
    "PREGUNTA",
    "SIN_COMPROBAR",
    "VALOR_INFERIDO",
  ]);
});

test("un apartamiento sin punto exacto, o de una clase inventada, NO se puede construir", () => {
  // Es la forma barata de que el registro exista y no sirva: lineas que dicen «hubo que
  // ajustar algo» y nadie sabe donde.
  assert.throws(() => apartamiento({ clase: "COMANDO", punto: "" }), /punto exacto/);
  assert.throws(() => apartamiento({ clase: "INVENTADA", punto: "x" }), /clase de apartamiento/);
  assert.equal(unApartamiento().clase, "SIN_COMPROBAR");
});

test("una corrida SIN apartamientos tambien deja registro, y lo dice", () => {
  // Un registro que solo existe cuando algo salio mal no distingue «el camino aguanto una
  // corrida entera» de «nadie miro»: las dos se ven igual, que es la ausencia de un archivo.
  const texto = cuerpo({ procedimiento: "arranque", apartamientos: [] });
  assert.match(texto, /Sin apartamientos/);
  assert.match(texto, /nadie (haya )?mir/i);
  assert.match(tituloDelRegistro("arranque", 0), /sin apartamientos/);
});

test("una corrida que termino bien rodeando cosas NO se reporta como exito limpio", () => {
  const texto = cuerpo({
    procedimiento: "arranque",
    apartamientos: [unApartamiento(), apartamiento({ clase: "PASO_NO_APLICA", punto: "el arranque", real: "se pidio --sin-arranque" })],
  });
  assert.match(texto, /2 apartamiento/);
  assert.match(texto, /NO se reporta como exito limpio/);
  assert.match(texto, /la proteccion de main/, "cada apartamiento lleva su punto exacto");
  assert.match(texto, /sin-auth/, "y lo que paso, textual");
  assert.match(tituloDelRegistro("arranque", 2), /2 apartamiento/);
});

test("el mismo tropiezo repetido se cuenta, no se copia tres veces", () => {
  // Tres rechazos de la misma pregunta son UNA senal fuerte, no tres bloques identicos que
  // el lector tiene que comparar a ojo para darse cuenta.
  const a = () => apartamiento({ clase: "PREGUNTA", punto: "el asistente, pregunta ORG", esperado: "un usuario de GitHub" });
  const texto = cuerpo({ procedimiento: "arranque", apartamientos: [a(), a(), a()] });
  assert.match(texto, /3 apartamiento/, "el conteo sigue siendo de ocurrencias");
  assert.equal(texto.match(/pregunta ORG/g).length, 1, "el bloque tiene que aparecer una sola vez");
  assert.match(texto, /Veces\*\*: 3/);
});

test("todo ::warning:: de la corrida entra al registro sin que nadie lo anote", () => {
  // LA PROPIEDAD QUE HACE QUE ESTO NO DEPENDA DE ACORDARSE. Cada fail-open del arranque ya
  // es ruidoso por regla del marco; si el registro dependiera de una llamada al lado de cada
  // aviso, el primer aviso nuevo que se escriba sin esa llamada quedaria fuera, en silencio.
  const registro = crearRegistro({ fase: "la proteccion de main" });
  const escritas = [];
  const consola = { log: (...a) => escritas.push(a.join(" ")), error: (...a) => escritas.push(a.join(" ")), warn: () => {} };
  const vigia = vigilarAvisos(registro, consola);
  consola.error("::warning::PROTECCION DE MAIN: NO se pudo medir (sin-gh: no hay gh)");
  consola.log("una linea comun");
  consola.error("texto\n::warning::un aviso en la segunda linea de un mensaje");
  consola.error("::warning::PROTECCION DE MAIN: medido — el repo NO puede tener proteccion");
  vigia.soltar();
  consola.error("::warning::despues de soltar no se mira");

  assert.equal(escritas.length, 5, "vigilar no puede tragarse lo que se imprime");
  const reales = registro.apartamientos.map((a) => a.real);
  assert.equal(registro.apartamientos.length, 2, `entraron ${JSON.stringify(reales)}`);
  assert.match(reales[0], /NO se pudo medir/);
  assert.equal(registro.apartamientos[0].punto, "la proteccion de main", "el punto es la fase en la que salio");
  assert.match(reales[1], /segunda linea/);
});

test("la clase de un aviso: lo MEDIDO no es un apartamiento, lo inferido si", () => {
  // «medido —» es la convencion de esta herramienta para un hallazgo sobre la cuenta (la
  // proteccion que el plan no ofrece, un equipo vacio): la corrida hizo lo que decia. Un
  // aviso que no se reconoce cae en SIN_COMPROBAR, que es el lado que no pierde nada.
  assert.equal(claseDeAviso("PROTECCION DE MAIN: medido — el repo NO puede tener proteccion"), null);
  assert.equal(claseDeAviso("PO DE CODEOWNERS: medido — el equipo x/po no tiene miembros"), null);
  assert.equal(
    claseDeAviso('no pude preguntarle a GitHub si "x" es una cuenta de persona o de organización (hace falta gh)'),
    "VALOR_INFERIDO",
  );
  assert.equal(claseDeAviso("se pidio --sin-arranque: el repo quedo ESCRITO pero sin instalar"), "PASO_NO_APLICA");
  assert.equal(claseDeAviso("un aviso que nadie clasifico todavia"), "SIN_COMPROBAR");
});

test("el registro no lleva el nombre del proyecto, la cuenta ni rutas de la maquina", () => {
  const destino = path.join(os.tmpdir(), "un-destino", "people-agenda");
  const texto =
    `no pude medir Ejemplo-Org/people-agenda desde ${destino} ` +
    `ni en ${os.homedir()}; el PO es el-po y el dominio agenda.ejemplo.com, la palabra agendas queda`;
  const limpio = redactar(texto, { valores: VALORES, rutas: [destino, os.homedir()] });
  for (const dato of ["Ejemplo-Org", "people-agenda", destino, os.homedir(), "el-po", "agenda.ejemplo.com"]) {
    assert.ok(!limpio.includes(dato), `quedo "${dato}" en: ${limpio}`);
  }
  assert.match(limpio, /<ORG>\/<PROYECTO>/);
  assert.match(limpio, /agendas queda/, "un valor corto no puede comerse una palabra que lo contiene");
});

test("el repositorio del marco sale del remoto del clon, en las dos formas de git", () => {
  assert.equal(repoDelRemoto("https://github.com/im-diego-ec/Projects.git"), "im-diego-ec/Projects");
  assert.equal(repoDelRemoto("git@github.com:im-diego-ec/Projects.git\n"), "im-diego-ec/Projects");
  assert.equal(repoDelRemoto("https://github.com/un-fork/Projects"), "un-fork/Projects");
  assert.equal(repoDelRemoto("https://gitlab.com/x/y.git"), null, "otro servidor no es un repositorio de GitHub");
  assert.equal(repoDelRemoto(null), null);
  assert.equal(repoDelRemoto("https://github.com/a;rm/b"), null, "lo que no tiene forma de cuenta no llega a gh");
});

// ─────────────────────────── mandarlo al marco ───────────────────────────

function ghFalso({ sinGh = false, sinSesion = false, falla = false } = {}) {
  const llamadas = [];
  const ejecutar = (programa, args) => {
    llamadas.push([programa, ...args]);
    if (sinGh) return { presente: false, codigo: null, stdout: "", stderr: "" };
    if (args[0] === "issue" && falla) return { presente: true, codigo: 1, stdout: "", stderr: "HTTP 403: Resource not accessible" };
    if (args[0] === "issue") return { presente: true, codigo: 0, stdout: "https://github.com/im-diego-ec/Projects/issues/7\n", stderr: "" };
    return { presente: true, codigo: 0, stdout: "gh version 2.0.0\n", stderr: "" };
  };
  return { ejecutar, llamadas, haySesion: () => !sinSesion };
}

function oferta(extra) {
  const dicho = [];
  const avisado = [];
  const base = {
    repo: "im-diego-ec/Projects",
    titulo: "Friccion del arranque: 2 apartamiento(s)",
    ruta: path.join(os.tmpdir(), "p", NOMBRE_REGISTRO),
    decir: (l) => dicho.push(l),
    avisar: (l) => avisado.push(l),
  };
  return { args: { ...base, ...extra }, dicho, avisado };
}

test("sin terminal NO se manda nada afuera, y queda el comando para hacerlo despues", async () => {
  // Abrir un issue es visible desde afuera: la misma regla que crear el repositorio.
  const gh = ghFalso();
  const o = oferta({ preguntar: null, ejecutar: gh.ejecutar, haySesion: gh.haySesion });
  const r = await ofrecerElIssue(o.args);
  assert.equal(r.resultado, "sin-terminal");
  assert.deepEqual(gh.llamadas, [], "sin alguien que confirme no se llama a gh, ni para preguntar");
  assert.match(o.dicho.join("\n"), /gh issue create --repo im-diego-ec\/Projects/);
});

test("Enter NO es que si: sin un si escrito, no se abre", async () => {
  const gh = ghFalso();
  const o = oferta({ preguntar: async () => "", ejecutar: gh.ejecutar, haySesion: gh.haySesion });
  const r = await ofrecerElIssue(o.args);
  assert.equal(r.resultado, "no-confirmado");
  assert.ok(!gh.llamadas.some((l) => l[1] === "issue"), "se abrio un issue que nadie confirmo");
  assert.match(o.dicho.join("\n"), /--body-file/, "y queda el comando exacto");
});

test("con un si, se abre en el repositorio del marco con el archivo como cuerpo", async () => {
  const gh = ghFalso();
  let preguntado = null;
  const o = oferta({ preguntar: async (t) => ((preguntado = t), "si"), ejecutar: gh.ejecutar, haySesion: gh.haySesion });
  const r = await ofrecerElIssue(o.args);
  assert.equal(preguntado, PREGUNTA_DEL_ISSUE);
  assert.equal(r.resultado, "mandado");
  assert.equal(r.url, "https://github.com/im-diego-ec/Projects/issues/7");
  const crear = gh.llamadas.find((l) => l[1] === "issue");
  assert.deepEqual(crear.slice(0, 3), ["gh", "issue", "create"]);
  assert.equal(crear[crear.indexOf("--repo") + 1], "im-diego-ec/Projects");
  assert.equal(crear[crear.indexOf("--body-file") + 1], o.args.ruta);
  assert.ok(!crear.includes("--label"), "una label que el repositorio no tenga hace fallar la creacion entera");
});

test("si gh falla, falta o no tiene sesion, lo dice fuerte y deja el comando", async () => {
  for (const [opciones, esperado] of [
    [{ falla: true }, "fallo"],
    [{ sinGh: true }, "sin-gh"],
    [{ sinSesion: true }, "sin-sesion"],
  ]) {
    const gh = ghFalso(opciones);
    const o = oferta({ preguntar: async () => "si", ejecutar: gh.ejecutar, haySesion: gh.haySesion });
    const r = await ofrecerElIssue(o.args);
    assert.equal(r.resultado, esperado);
    assert.match(o.avisado.join("\n"), /::warning::/, `${esperado}: un envio que no ocurrio tiene que avisarse`);
    assert.match(o.avisado.join("\n"), /gh issue create/, `${esperado}: sin el comando, el registro se queda en la maquina`);
  }
});

test("sin repositorio del marco reconocible, no se inventa uno", async () => {
  const gh = ghFalso();
  const o = oferta({ repo: null, preguntar: async () => "si", ejecutar: gh.ejecutar, haySesion: gh.haySesion });
  const r = await ofrecerElIssue(o.args);
  assert.equal(r.resultado, "sin-repo");
  assert.deepEqual(gh.llamadas, []);
  assert.match(o.avisado.join("\n"), /::warning::/);
});

test("el comando para despues cita la ruta si tiene espacios", () => {
  const c = comandoDelIssue({ repo: "a/b", titulo: "Friccion del arranque: sin apartamientos", ruta: "/tmp/con espacio/r.md" });
  assert.match(c, /--body-file "\/tmp\/con espacio\/r\.md"/);
  assert.match(c, /--title "Friccion del arranque: sin apartamientos"/);
});

// ─────────────────────────── el asistente ───────────────────────────

/** Contesta en orden y registra que pregunta se hizo. */
function guion(respuestas) {
  let i = 0;
  return async () => respuestas[i++] ?? "";
}

test("el asistente anota donde se trabo la persona, sin guardar lo que escribio", async () => {
  // PROYECTO bien; ORG con el correo (el error mas probable del recorrido) y despues bien;
  // en `forma` escribe el nombre en vez del numero y despues vuelve atras.
  const r = await correrAsistente(
    guion(["agenda", "diego@ejemplo.com", "una-cuenta", "supabase", "atras", "", ...Array(30).fill("")]),
    {},
    FORMATOS,
    () => {},
    { ORG_MARCO: "im-diego-ec" },
  );
  const t = r.tropiezos ?? [];
  assert.ok(
    t.some((a) => a.clase === "PREGUNTA" && /pregunta ORG/.test(a.punto)),
    `falta el rechazo de ORG: ${JSON.stringify(t)}`,
  );
  assert.ok(t.some((a) => a.clase === "PREGUNTA" && /pregunta forma/.test(a.punto)), "falta el rechazo de la opcion");
  assert.ok(t.some((a) => a.clase === "ORDEN" && /forma/.test(a.punto) && /ORG/.test(a.punto)), "falta la vuelta atras");
  // Lo escrito NO viaja: puede ser un correo, y el registro puede terminar en un issue publico.
  assert.ok(!JSON.stringify(t).includes("diego@ejemplo.com"), "el registro guardo el correo que la persona escribio");
  assert.ok(!JSON.stringify(t).includes("supabase"), "el registro guardo lo que la persona escribio");
});

test("cuanto se pregunto y cuanto derivo derivar(): se calcula, no se copia", async () => {
  // Rigel copiaba «20 de 23» en prosa y envejecio a la primera. Aca sale de derivar() y de
  // las preguntas que de verdad se hicieron, asi que no puede quedar viejo. Y juntos cubren
  // TODO lo requerido: un valor sin pregunta y sin derivacion no tiene fuente.
  const r = await correrAsistente(guion(["agenda", "una-cuenta", ...Array(30).fill("")]), {}, FORMATOS, () => {}, {
    ORG_MARCO: "im-diego-ec",
  });
  const n = reparto(r.respuestas, REQUERIDOS);
  assert.equal(n.preguntas, (r.preguntadas ?? []).length);
  assert.equal(n.contestados + n.derivados, REQUERIDOS.length, "hay un valor requerido sin fuente");
  assert.ok(n.derivados > n.contestados, "el caso simple deriva mas de lo que pregunta");
  assert.ok(n.preguntas <= PREGUNTAS.length);
});

test("lo que el asistente anota sobrevive al proceso que lo anoto", () => {
  // Los lanzadores corren el asistente y el arranque en DOS procesos. Sin un archivo en el
  // medio, lo que el primero anoto se perdia al terminar.
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "friccion-pendiente-"));
  escribirPendiente(dir, { apartamientos: [unApartamiento()], reparto: { preguntas: 8 } });
  const r = leerPendiente(dir);
  assert.equal(r.ok, true);
  assert.equal(r.datos.apartamientos.length, 1);
  assert.equal(r.datos.apartamientos[0].clase, "SIN_COMPROBAR");
  fs.writeFileSync(path.join(dir, NOMBRE_PENDIENTE), "{roto");
  assert.equal(leerPendiente(dir).ok, false, "uno roto se dice, no se toma como vacio");
  fs.rmSync(dir, { recursive: true, force: true });
  assert.equal(leerPendiente(dir).existe, false);
});

// ─────────────────────────── la condicion de termino, de punta a punta ───────────────────────────

function corrida({ valores = VALORES, pendiente = null } = {}) {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), "registro-friccion-"));
  const destino = path.join(base, "proyecto");
  fs.mkdirSync(destino);
  const ruta = path.join(base, "valores.json");
  fs.writeFileSync(ruta, JSON.stringify(valores));
  if (pendiente) fs.writeFileSync(path.join(base, NOMBRE_PENDIENTE), JSON.stringify(pendiente));
  const r = spawnSync(
    process.execPath,
    [HERRAMIENTA, "--sin-arranque", "--sin-herramientas", "--valores", ruta, "--destino", destino],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
  );
  const archivo = path.join(destino, NOMBRE_REGISTRO);
  return {
    base,
    destino,
    codigo: r.status ?? -1,
    stdout: r.stdout ?? "",
    salida: `${r.stdout ?? ""}${r.stderr ?? ""}`,
    archivo,
    texto: fs.existsSync(archivo) ? fs.readFileSync(archivo, "utf8") : "",
    pendienteQueda: fs.existsSync(path.join(base, NOMBRE_PENDIENTE)),
  };
}

test("LA CONDICION DE TERMINO: no hay LISTO sin el registro, y se dice antes", () => {
  const r = corrida({
    pendiente: {
      apartamientos: [{ clase: "PREGUNTA", punto: "el asistente, pregunta ORG", esperado: "un usuario de GitHub" }],
      reparto: { preguntas: 8, contestados: 2, derivados: 21, total: 23 },
    },
  });
  assert.equal(r.codigo, 0, `esta corrida tendria que pasar:\n${r.salida.slice(-1200)}`);
  assert.ok(r.texto, `salio 0 y NO dejo ${NOMBRE_REGISTRO} en el proyecto`);

  const lineas = r.stdout.split(/\r?\n/);
  const dondeRegistro = lineas.findIndex((l) => l.includes(NOMBRE_REGISTRO));
  const dondeListo = lineas.findIndex((l) => /^LISTO/.test(l));
  assert.ok(dondeListo >= 0, "no aparecio LISTO");
  assert.ok(dondeRegistro >= 0, "la pantalla no dice donde quedo el registro");
  assert.ok(dondeRegistro < dondeListo, "el registro tiene que quedar dicho ANTES de LISTO, no despues");

  // --sin-arranque es un apartamiento de verdad: el camino dice instalar y verificar. Se
  // busca EL APARTAMIENTO y no la bandera: la linea «Banderas» tambien dice --sin-arranque,
  // y medido, con esa busqueda el caso seguia verde con la consola sin vigilar.
  assert.match(
    r.texto,
    /`PASO_NO_APLICA`\)\n\n- \*\*Punto\*\*: el arranque[^\n]*\n- \*\*Lo que paso\*\*: se pidio --sin-arranque/,
    "el aviso de --sin-arranque no entro al registro como apartamiento",
  );
  assert.match(r.texto, /NO se reporta como exito limpio/);
  // Lo que anoto el asistente en su proceso llega, y el archivo del medio se consume.
  assert.match(r.texto, /pregunta ORG/, "lo que el asistente anoto no llego al registro");
  assert.match(r.texto, /8 preguntas/, "el camino del asistente no quedo dicho");
  assert.equal(r.pendienteQueda, false, `${NOMBRE_PENDIENTE} quedo: la proxima corrida lo contaria dos veces`);

  // Y no lleva lo que no tiene que llevar.
  for (const dato of [VALORES.PROYECTO, VALORES.ORG, r.destino, r.base, os.homedir()]) {
    assert.ok(!r.texto.includes(dato), `el registro lleva "${dato}", y su destino es un repositorio publico`);
  }
  fs.rmSync(r.base, { recursive: true, force: true });
});

test("una corrida que FALLA no deja registro en el proyecto ni consume lo del asistente", () => {
  // El fallo ya tiene su archivo —la bitacora— y un rojo. Lo del asistente queda para el
  // reintento: consumirlo aca lo perderia justo en la corrida que mas tiene para contar.
  const r = corrida({ valores: { PROYECTO: "x" }, pendiente: { apartamientos: [] } });
  assert.notEqual(r.codigo, 0);
  assert.equal(fs.existsSync(r.archivo), false, "un fallo tiene que dejar el destino como estaba");
  assert.equal(r.pendienteQueda, true, "lo que anoto el asistente se perdio en un fallo");
  fs.rmSync(r.base, { recursive: true, force: true });
});

test("copiada SOLA fuera de su clon, la herramienta corre igual y dice FUERTE que no hay registro", () => {
  // La herramienta tiene que poder correr copiada sin sus modulos hermanos (hay bancos que
  // lo hacen, y es como se la usa desde un clon parcial). La primera version importaba el
  // registro de forma estatica y, medido, mataba el proceso ANTES de la primera linea: sin
  // `::error::`, sin bitacora, con una traza de node. Ahora se carga cuando hace falta, y si
  // falta, la condicion de termino se degrada A LA VISTA, no en silencio.
  const raiz = fs.mkdtempSync(path.join(os.tmpdir(), "registro-friccion-sola-"));
  fs.mkdirSync(path.join(raiz, "herramientas"));
  fs.copyFileSync(HERRAMIENTA, path.join(raiz, "herramientas", "projects-init.mjs"));
  fs.cpSync(path.join(RAIZ, "plantilla"), path.join(raiz, "plantilla"), { recursive: true });
  const destino = path.join(raiz, "destino");
  fs.mkdirSync(destino);
  const valores = path.join(raiz, "valores.json");
  fs.writeFileSync(valores, JSON.stringify(VALORES));
  const r = spawnSync(
    process.execPath,
    [path.join(raiz, "herramientas", "projects-init.mjs"), "--sin-arranque", "--sin-herramientas", "--valores", valores, "--destino", destino],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
  );
  const salida = `${r.stdout ?? ""}${r.stderr ?? ""}`;
  assert.equal(r.status, 0, `sin el modulo del registro la corrida tiene que seguir:\n${salida.slice(-800)}`);
  assert.match(salida, /::warning::no pude cargar herramientas\/registro-de-friccion\.mjs/);
  assert.match(salida, /NO deja su registro de friccion/);
  assert.equal(fs.existsSync(path.join(destino, NOMBRE_REGISTRO)), false);
  fs.rmSync(raiz, { recursive: true, force: true });
});

test("ni el registro ni el archivo del medio entran a un repositorio", () => {
  // El del proyecto: el registro queda en su raiz y la puerta web hace `git add -A` despues de
  // copiarla. El del clon: los lanzadores corren el asistente ahi.
  const andamio = fs.readFileSync(path.join(RAIZ, "plantilla/.gitignore"), "utf8");
  for (const f of [NOMBRE_REGISTRO, NOMBRE_PENDIENTE]) {
    assert.ok(new RegExp(`^${f.replace(/\./g, "\\.")}$`, "m").test(andamio), `plantilla/.gitignore no ignora ${f}`);
  }
  const marco = fs.readFileSync(path.join(RAIZ, ".gitignore"), "utf8");
  assert.ok(new RegExp(`^${NOMBRE_PENDIENTE.replace(/\./g, "\\.")}$`, "m").test(marco), `.gitignore no ignora ${NOMBRE_PENDIENTE}`);
});
