import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  noViajanPorForma,
  formaDe,
  podarPorForma,
  seExcluyeDelCopiado,
  archivosDelAndamio,
  instanciar,
  TODAS,
  PASOS_DEL_ARRANQUE,
  pasosQueCorren,
} from "../../herramientas/projects-init.mjs";
import { PREGUNTAS, correrAsistente } from "../../herramientas/projects-asistente.mjs";

/** Lo que la herramienta DERIVA y no pregunta: la cuenta donde vive el marco,
 *  que sale del remoto del clon. En el banco se fija a mano para que estos casos
 *  no dependan de que la maquina donde corren tenga un remoto configurado. */
const DERIVADOS = { ORG_MARCO: "im-diego-ec" };

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const ANDAMIO = path.join(RAIZ, "plantilla");

// ---------------------------------------------------------------------------
// LAS FORMAS DE PROYECTO, Y QUE NINGUNA QUEDE EN PAPEL.
//
// La carta de docs/03-stack.md explica cuatro formas de construir. Una carta que
// invita a elegir mientras la herramienta reparte siempre lo mismo promete algo
// que no cumple, y este repositorio ya pago ese defecto dos veces —con la clave
// `plataforma`, que existia y nadie leia, y con Slack y GCP, que se ofrecian y
// no funcionaban—.
//
// Este banco fija que la eleccion mande y que lo ofrecido ande.
// ---------------------------------------------------------------------------

test("aplicacion es el valor por defecto, y eso protege a los proyectos viejos", () => {
  // Un archivo de valores escrito ANTES de que esta clave existiera describe la
  // unica forma que el andamio repartia. Cambiar eso en silencio le sacaria a un
  // proyecto la mitad de sus carpetas.
  assert.equal(formaDe({}), "aplicacion", "sin la clave, se asume lo que el andamio siempre reparti");
  assert.equal(formaDe({ forma: "" }), "aplicacion", "una cadena vacia no es una eleccion");
  assert.equal(formaDe(null), "aplicacion");
  assert.equal(formaDe({ forma: "SITIO" }), "sitio", "la mayuscula no cambia la eleccion");
});

test("un sitio para leer NO recibe servidor, ni pantallas con sesion, ni base de datos", () => {
  const fuera = noViajanPorForma("sitio");
  for (const c of ["web", "api", "e2e"]) {
    assert.ok(fuera.includes(c), `un sitio no usa ${c}/ y dejarselo no seria generoso, seria confuso`);
  }
  // `docker-compose.yml` levanta UNA sola cosa: el Postgres del proyecto.
  assert.ok(fuera.includes("docker-compose.yml"), "un sitio no tiene base de datos que levantar");
  assert.equal(seExcluyeDelCopiado("api/src/app.ts", "supabase", "sitio"), true);
  assert.equal(seExcluyeDelCopiado("sitio/src/pages/index.astro", "supabase", "sitio"), false);
});

test("y al reves: una aplicacion no recibe el sitio", () => {
  assert.deepEqual(noViajanPorForma("aplicacion"), ["sitio", ".github/workflows/desplegar.yml"]);
  // El workflow de despliegue hoy solo sabe publicar un sitio y su texto nombra
  // el paquete del sitio: repartirselo a una aplicacion le dejaria un workflow
  // apuntando a una carpeta que ese proyecto no tiene.
  assert.equal(seExcluyeDelCopiado("sitio/package.json", "supabase", "aplicacion"), true);
  assert.equal(seExcluyeDelCopiado("api/src/app.ts", "supabase", "aplicacion"), false);
});

test("TODAS no filtra nada, y por eso las funciones que preguntan «que TIENE el andamio» la usan", () => {
  // Sin esta constante, `paquetesDelAndamio` devolvia los paquetes de UNA forma
  // y escondia los de la otra: la validacion de que ningun nombre de paquete sea
  // texto libre pasaba a mirar medio andamio.
  assert.deepEqual(noViajanPorForma(TODAS), []);
  const todos = archivosDelAndamio(ANDAMIO, "aws", TODAS);
  assert.ok(todos.some((r) => r.startsWith("sitio/")), "con TODAS tiene que ver el sitio");
  assert.ok(todos.some((r) => r.startsWith("api/")), "y tambien el servidor");
});

test("el `verificar` de un sitio no encadena el paso que necesita un servidor", () => {
  // EL DEFECTO QUE ESTE CASO VIGILA, medido sobre un sitio recien generado: el
  // `verificar` de la raiz encadenaba `pnpm datos`, que filtra el paquete del
  // servidor. Un sitio no lo tiene, pnpm contestaba «No projects matched the
  // filters», y la forma nueva nacia ROJA el dia uno.
  const original = fs.readFileSync(path.join(ANDAMIO, "package.json"), "utf-8");
  const podado = JSON.parse(podarPorForma(original, "package.json", "sitio"));

  assert.equal(podado.scripts.datos, undefined, "sin servidor no hay cliente de datos que generar");
  assert.equal(podado.scripts.e2e, undefined, "ni suite de extremo a extremo");
  assert.equal(/pnpm datos/.test(podado.scripts.verificar), false, "y la cadena de verificar tampoco puede nombrarlo");
  assert.ok(/pnpm lint/.test(podado.scripts.verificar), "el resto de la cadena se queda entera");

  assert.equal(podarPorForma(original, "package.json", "aplicacion"), original, "una aplicacion no se toca");
});

// ---------------------------------------------------------------------------
// DE PUNTA A PUNTA
// ---------------------------------------------------------------------------

async function armar(forma) {
  const destino = fs.mkdtempSync(path.join(os.tmpdir(), `forma-${forma}-`));
  const opcion = forma === "sitio" ? "2" : "1";
  const { valores } = await correrAsistente(
    async (_t, id) => ({ PROYECTO: "mi-proyecto", ORG: "alguien", forma: opcion })[id] ?? "",
    {},
    {},
    () => {},
    DERIVADOS,
  );
  const r = instanciar({ raizAndamio: ANDAMIO, destino, valores });
  return { destino, r, valores };
}

test("de punta a punta: un sitio para leer nace con lo suyo y sin lo ajeno", async () => {
  const { destino, r, valores } = await armar("sitio");
  assert.equal(valores.forma, "sitio", "la eleccion tiene que quedar escrita en el archivo de valores");

  assert.ok(fs.existsSync(path.join(destino, "sitio/src/pages/index.astro")), "la pagina de inicio");
  assert.ok(fs.existsSync(path.join(destino, "sitio/README.md")), "y el README que declara que NO se verifica por tipos");
  for (const c of ["api", "web", "e2e", "docker-compose.yml"]) {
    assert.equal(fs.existsSync(path.join(destino, c)), false, `un sitio no recibe ${c}`);
  }
  assert.ok(r.escritos.length >= 25, `sigue siendo un proyecto completo: ${r.escritos.length} archivos`);

  const raiz = JSON.parse(fs.readFileSync(path.join(destino, "package.json"), "utf-8"));
  assert.equal(/pnpm datos/.test(raiz.scripts.verificar), false, "y su verificacion no nombra el paso del servidor");
});

test("de punta a punta: una aplicacion sigue recibiendo todo, como siempre", async () => {
  const { destino, r, valores } = await armar("aplicacion");
  assert.equal(valores.forma, "aplicacion");
  for (const c of ["api/src/app.ts", "web/package.json", "e2e/package.json"]) {
    assert.ok(fs.existsSync(path.join(destino, c)), `una aplicacion recibe ${c}`);
  }
  assert.equal(fs.existsSync(path.join(destino, "sitio")), false, "y no recibe el sitio");
  assert.ok(r.escritos.length > 50);
});

test("MUERDE: si la forma dejara de leerse, las dos saldrian iguales", async () => {
  // El caso que prueba que todo lo de arriba no pasa por vacuidad, y es
  // exactamente el estado del que se viene con la plataforma: la clave existia y
  // nadie la leia.
  const sitio = await armar("sitio");
  const app = await armar("aplicacion");
  assert.notEqual(
    sitio.r.escritos.length,
    app.r.escritos.length,
    "si las dos formas producen la misma cantidad de archivos, la eleccion volvio a no significar nada",
  );
});

test("toda opcion de la pregunta de forma produce un proyecto que se puede armar", async () => {
  const pregunta = PREGUNTAS.find((p) => p.id === "forma");
  assert.ok(pregunta, "la pregunta tiene que existir: es la decision que mas cuesta si se toma tarde");
  assert.ok(pregunta.opciones.length >= 2, "con una sola opcion no hay eleccion, y entonces no habria que preguntar");

  const rotas = [];
  for (const o of pregunta.opciones) {
    const destino = fs.mkdtempSync(path.join(os.tmpdir(), `opcion-${o.valor}-`));
    const idx = String(pregunta.opciones.indexOf(o) + 1);
    const { valores, respuestas } = await correrAsistente(
      async (_t, id) => ({ PROYECTO: "p", ORG: "o", forma: idx })[id] ?? "",
      {},
      {},
      () => {},
      DERIVADOS,
    );
    if (respuestas.forma !== o.valor) {
      rotas.push(`${o.valor}: se contesto por id y quedo "${respuestas.forma}"`);
      continue;
    }
    try {
      const r = instanciar({ raizAndamio: ANDAMIO, destino, valores });
      if (r.faltantes.length) rotas.push(`${o.valor}: marcadores sin valor -> ${r.faltantes.join(", ")}`);
      if (r.escritos.length < 20) rotas.push(`${o.valor}: solo ${r.escritos.length} archivos`);
    } catch (e) {
      rotas.push(`${o.valor}: ${e.message}`);
    }
  }
  assert.deepEqual(
    rotas,
    [],
    "una forma que el asistente ofrece y que despues no se puede armar es el mismo defecto que ya se pago con Slack " +
      `y con GCP: la persona elige bien y el error no habla de lo que eligio.\n  ${rotas.join("\n  ")}`,
  );
});

// ---------------------------------------------------------------------------
// EL ARRANQUE CONTRA EL MANIFIESTO, y por que este caso no existia.
//
// El caso de mas arriba se llama "toda opcion de la pregunta de forma produce un
// proyecto que se puede armar" y para en `instanciar()`, que solo ESCRIBE
// archivos. El nombre promete arrancar; la medicion mide copiar, y en el hueco
// entre las dos cosas vivio el defecto: `podarPorForma` borraba `datos` del
// package.json de un sitio y dos lineas despues el arranque mandaba correr
// `pnpm run datos`. Medido antes del arreglo: `[ERR_PNPM_NO_SCRIPT] Missing
// script: datos`, salida 1, en la mitad de las combinaciones que el asistente
// ofrece. El banco entero estaba en verde mientras eso pasaba.
// ---------------------------------------------------------------------------

test("cada paso del arranque nombra un script que la forma elegida declara de verdad", async () => {
  const pregunta = PREGUNTAS.find((p) => p.id === "forma");
  const rotos = [];
  for (const o of pregunta.opciones) {
    const destino = fs.mkdtempSync(path.join(os.tmpdir(), `arranque-${o.valor}-`));
    const idx = String(pregunta.opciones.indexOf(o) + 1);
    const { valores } = await correrAsistente(
      async (_t, id) => ({ PROYECTO: "p", ORG: "o", forma: idx })[id] ?? "",
      {},
      {},
      () => {},
      DERIVADOS,
    );
    instanciar({ raizAndamio: ANDAMIO, destino, valores });
    const scripts = JSON.parse(fs.readFileSync(path.join(destino, "package.json"), "utf-8")).scripts ?? {};
    const { corren, salteados } = pasosQueCorren(destino);

    for (const paso of corren) {
      const script = paso.args[0] === "run" ? paso.args[1] : null;
      if (script && !(script in scripts)) {
        rotos.push(`${o.valor}: el arranque correria \`pnpm run ${script}\` y esta forma no declara ese script`);
      }
    }
    // Y la otra mitad, que es la que evita que el arreglo se pase de largo: un
    // paso salteado tiene que ser uno que DE VERDAD no esta, no uno que el
    // filtro se comio por error.
    for (const s of salteados) {
      if (s.script in scripts) rotos.push(`${o.valor}: saltea "${s.script}" y el manifiesto SI lo declara`);
    }
    if (!corren.length) rotos.push(`${o.valor}: no corre ningun paso, asi que el arranque no verifica nada`);
  }
  assert.deepEqual(
    rotos,
    [],
    "un paso del arranque que nombra un script inexistente mata a la persona en mitad de la generacion, con un repo " +
      `ya escrito y un arreglo imposible:\n  ${rotos.join("\n  ")}`,
  );
});

test("MUERDE: si los pasos volvieran a ser una lista fija, el sitio se rompe otra vez", () => {
  // El caso que prueba que el de arriba no pasa por vacuidad. Se simula un
  // destino con el package.json podado —el de un sitio— y se exige que la lista
  // FIJA choque y la derivada no. Si algun dia las dos coinciden, es que el
  // andamio dejo de podar y este control dejo de mirar lo que cree.
  const destino = fs.mkdtempSync(path.join(os.tmpdir(), "arranque-muerde-"));
  const podado = JSON.parse(podarPorForma(fs.readFileSync(path.join(ANDAMIO, "package.json"), "utf-8"), "package.json", "sitio"));
  fs.writeFileSync(path.join(destino, "package.json"), JSON.stringify(podado));

  const fijos = PASOS_DEL_ARRANQUE.filter((p) => p.args[0] === "run").map((p) => p.args[1]);
  const inexistentes = fijos.filter((x) => !(x in podado.scripts));
  assert.ok(
    inexistentes.length >= 1,
    "la lista fija ya no nombra ningun script que un sitio no tenga: si el andamio dejo de podar, este caso mide aire",
  );

  const { corren, salteados } = pasosQueCorren(destino);
  assert.deepEqual(
    salteados.map((s) => s.script),
    inexistentes,
    "la derivacion tiene que saltear exactamente los que faltan, ni uno mas ni uno menos",
  );
  assert.ok(corren.length < PASOS_DEL_ARRANQUE.length, "y correr menos pasos que la lista fija");
});

// ---------------------------------------------------------------------------
// EL PIPELINE CONTRA LOS PAQUETES QUE LA FORMA REPARTE.
//
// EL DEFECTO QUE ESTE BANCO CIERRA, medido: `podarPorForma` podaba el
// package.json y nada mas, asi que el ci.yml de un sitio conservaba
// `--filter <api> --fail-if-no-match exec prisma generate` sobre un workspace
// sin paquete de API —«No projects matched the filters», salida 1, que es
// exactamente lo que `--fail-if-no-match` existe para provocar— y las
// EXCEPCIONES de un paquete E2E que la forma no reparte.
//
// Y LO QUE HACIA QUE FUERA PEOR QUE UN ROJO: `desplegar.yml` solo publica con
// `workflow_run.conclusion == 'success'`. Con el CI rojo, el despliegue no se
// dispara nunca. Arreglar solo el arranque habria cambiado un rojo ruidoso por
// un silencio.
// ---------------------------------------------------------------------------

/** Los directorios de primer nivel que son paquetes en el destino. */
function paquetesDe(destino) {
  return fs
    .readdirSync(destino, { withFileTypes: true })
    .filter((e) => e.isDirectory() && fs.existsSync(path.join(destino, e.name, "package.json")))
    .map((e) => e.name)
    .sort();
}

test("el pipeline de cada forma solo nombra paquetes que esa forma reparte", async () => {
  const pregunta = PREGUNTAS.find((p) => p.id === "forma");
  const rotos = [];
  for (const o of pregunta.opciones) {
    const destino = fs.mkdtempSync(path.join(os.tmpdir(), `ci-${o.valor}-`));
    const idx = String(pregunta.opciones.indexOf(o) + 1);
    const { valores } = await correrAsistente(
      async (_t, id) => ({ PROYECTO: "p", ORG: "o", forma: idx })[id] ?? "",
      {},
      {},
      () => {},
      DERIVADOS,
    );
    instanciar({ raizAndamio: ANDAMIO, destino, valores });
    const ci = fs.readFileSync(path.join(destino, ".github/workflows/ci.yml"), "utf-8");
    const hay = new Set(paquetesDe(destino));

    // Todo `--filter <x>` del pipeline tiene que apuntar a un paquete que exista.
    // Con `--fail-if-no-match`, uno que no existe no es un salteo: es rojo.
    const ejecutables = ci.split("\n").filter((l) => !/^\s*#/.test(l)).join("\n");
    for (const m of ejecutables.matchAll(/--filter\s+([A-Za-z@][\w@/.-]*)/g)) {
      if (!hay.has(m[1])) rotos.push(`${o.valor}: el ci filtra por "${m[1]}" y esta forma no reparte ese paquete`);
    }
    // Y toda EXCEPCION nombra una carpeta que tiene que existir: una excepcion
    // muerta tambien es rojo, por el otro lado.
    for (const m of ci.matchAll(/EXCEPCIONES:\s*"([^"]*)"/g)) {
      for (const par of m[1].trim().split(/\s+/).filter(Boolean)) {
        const carpeta = par.split(":")[0];
        if (!hay.has(carpeta)) rotos.push(`${o.valor}: el ci excluye "${carpeta}" y esta forma no reparte esa carpeta`);
      }
    }
    // Y ningun centinela puede sobrevivir a la instanciacion: si viaja, la
    // persona lee un comentario que habla de un gateo que ya ocurrio.
    for (const rel of ["\u002egithub/workflows/ci.yml", "README.md", "\u002egithub/dependabot.yml"]) {
      const f = path.join(destino, ...rel.split("/"));
      if (fs.existsSync(f) && /# projects:(fin-)?solo-si-hay-/.test(fs.readFileSync(f, "utf-8"))) {
        rotos.push(`${o.valor}: quedo un centinela del marco en ${rel}, que al proyecto no le dice nada`);
      }
    }
  }
  assert.deepEqual(
    rotos,
    [],
    "un pipeline que nombra un paquete que la forma no reparte nace ROJO, y como el despliegue solo corre con el CI " +
      `en verde, ese rojo se lleva tambien la publicacion:\n  ${rotos.join("\n  ")}`,
  );
});

test("MUERDE: sin la poda del pipeline, el sitio vuelve a nacer rojo", () => {
  // Prueba que el caso de arriba no pasa por vacuidad: sobre el ci.yml SIN
  // podar, las dos reglas tienen que encontrar algo. Si no lo encuentran es que
  // el andamio dejo de exigir esos paquetes y el control mide aire.
  const crudo = fs.readFileSync(path.join(ANDAMIO, ".github/workflows/ci.yml"), "utf-8");
  const podado = podarPorForma(crudo, ".github/workflows/ci.yml", "sitio");

  assert.match(crudo, /--filter \{\{PAQUETE_API\}\}/, "el andamio tiene que seguir filtrando por el paquete de API");
  assert.match(crudo, /EXCEPCIONES: "\{\{PAQUETE_E2E\}\}/, "y declarando excepciones del paquete E2E");
  assert.equal(/--filter \{\{PAQUETE_API\}\}/.test(podado), false, "podado, el filtro del API no puede quedar");
  assert.equal(/EXCEPCIONES: "/.test(podado), false, "ni la linea de excepciones");
  assert.equal(podarPorForma(crudo, ".github/workflows/ci.yml", "aplicacion"), crudo, "y una aplicacion no se toca");
});

// ---------------------------------------------------------------------------
// LA PORTADA NO PUEDE DECIR LO CONTRARIO DE LO QUE EL ARBOL TRAE.
//
// EL DEFECTO QUE ESTE BANCO CIERRA, medido en un sitio recien generado: el
// README afirmaba «nada lo publica: no hay un paso que lleve tu codigo a una
// direccion donde otra persona pueda entrar» dentro de un arbol que traia
// `.github/workflows/desplegar.yml` y `sitio/wrangler.jsonc`. Es la PRIMERA
// pantalla que ve cualquiera que entre al repositorio, y negaba el cuarto tramo
// justo para la unica forma donde ese tramo existe.
// ---------------------------------------------------------------------------

test("lo que la portada dice sobre publicar coincide con lo que el arbol trae", async () => {
  const pregunta = PREGUNTAS.find((p) => p.id === "forma");
  const rotos = [];
  for (const o of pregunta.opciones) {
    const destino = fs.mkdtempSync(path.join(os.tmpdir(), `portada-${o.valor}-`));
    const idx = String(pregunta.opciones.indexOf(o) + 1);
    const { valores } = await correrAsistente(
      async (_t, id) => ({ PROYECTO: "p", ORG: "o", forma: idx })[id] ?? "",
      {},
      {},
      () => {},
      DERIVADOS,
    );
    instanciar({ raizAndamio: ANDAMIO, destino, valores });
    const readme = fs.readFileSync(path.join(destino, "README.md"), "utf-8");
    const publica = fs.existsSync(path.join(destino, ".github/workflows/desplegar.yml"));

    const niega = /nada lo publica/i.test(readme);
    const promete = /S(Í|I) se publica/i.test(readme);
    if (publica && niega) rotos.push(`${o.valor}: trae desplegar.yml y la portada dice que nada lo publica`);
    if (publica && !promete) rotos.push(`${o.valor}: trae desplegar.yml y la portada no lo cuenta`);
    if (!publica && promete) rotos.push(`${o.valor}: la portada promete publicacion automatica y no trae desplegar.yml`);
    if (!publica && !niega) rotos.push(`${o.valor}: no publica y la portada no lo advierte`);
    // Y el puntero al paso a paso humano tiene que existir de verdad.
    for (const m of readme.matchAll(/\]\((?!https?:)([^)#]+)\)/g)) {
      const destinoEnlace = path.join(destino, ...m[1].split("/"));
      if (!fs.existsSync(destinoEnlace)) rotos.push(`${o.valor}: la portada enlaza "${m[1]}", que el proyecto no tiene`);
    }
  }
  assert.deepEqual(
    rotos,
    [],
    "la primera pantalla del repositorio nuevo tiene que decir la verdad sobre si eso se publica o no:\n  " +
      rotos.join("\n  "),
  );
});

test("MUERDE: sin la variante por forma, la portada de un sitio vuelve a negarse a si misma", () => {
  const crudo = fs.readFileSync(path.join(ANDAMIO, "README-del-proyecto.md"), "utf-8");
  assert.match(crudo, /nada lo publica/i, "el andamio tiene que seguir trayendo el aviso de que no se publica");
  assert.match(crudo, /projects:solo-si-es-sitio/, "y el bloque de la variante del sitio");

  const paraSitio = podarPorForma(crudo, "README-del-proyecto.md", "sitio");
  const paraApp = podarPorForma(crudo, "README-del-proyecto.md", "aplicacion");
  assert.equal(/nada lo publica/i.test(paraSitio), false, "podado para un sitio, la negacion no puede quedar");
  assert.match(paraApp, /nada lo publica/i, "y para una aplicacion tiene que quedarse");
  assert.equal(/projects:solo-si-es-sitio/.test(paraApp), false, "y la promesa del sitio no puede viajar a una aplicacion");
});
