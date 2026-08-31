import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

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
  problemasDeEleccion,
  FORMAS,
  PLATAFORMAS,
  noViajanPorPlataforma,
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

/** Las rutas que RENDERIZA la accion de constitucion, leidas de su propia fuente.
 *
 *  Se derivan y no se escriben: la accion ya las declara, y una segunda copia
 *  aca seria otra lista que mantener al lado de la primera. */
const RUTAS_QUE_RENDERIZA_LA_CONSTITUCION = [
  ...new Set(
    [...fs.readFileSync(path.join(RAIZ, "actions/constitucion/constitucion.mjs"), "utf-8").matchAll(/"(\.projects\/[\w.-]+)"/g)].map(
      (m) => m[1],
    ),
  ),
];

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
    // TODO ENLACE DE TODO ARCHIVO QUE VIAJA tiene que resolver DENTRO del
    // proyecto. Es donde se verifican los que el banco de enlaces no puede
    // mirar en el arbol del marco: los que llevan marcador y los que apuntan a
    // `.projects/`, que la herramienta renderiza despues de copiar.
    const md = [];
    const recorrer = (dir) => {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const f = path.join(dir, e.name);
        if (e.isDirectory()) {
          if (!["node_modules", ".git"].includes(e.name)) recorrer(f);
        } else if (e.name.endsWith(".md")) md.push(f);
      }
    };
    recorrer(destino);
    assert.ok(md.length >= 5, `un proyecto ${o.valor} con ${md.length} archivos .md: se rompio el recorrido`);
    for (const f of md) {
      for (const m of fs.readFileSync(f, "utf-8").matchAll(/\]\((?!https?:|mailto:|#)([^)\s#]+)\)/g)) {
        const abs = path.resolve(path.dirname(f), m[1]);
        if (!abs.startsWith(destino)) continue; // sale del proyecto: no opina
        const rel = path.relative(destino, abs).split(path.sep).join("/");
        // `.projects/` lo RENDERIZA un paso posterior de la herramienta, no
        // `instanciar`. Que exista en el proyecto terminado lo sostiene el banco
        // de la accion de constitucion, que declara esa ruta; aca se comprueba
        // que la ruta enlazada sea EXACTAMENTE la que esa accion publica, y no
        // una parecida.
        if (rel.startsWith(".projects/")) {
          if (!RUTAS_QUE_RENDERIZA_LA_CONSTITUCION.includes(rel)) {
            rotos.push(`${o.valor}: ${path.relative(destino, f)} enlaza "${m[1]}", que ningun paso de la herramienta escribe`);
          }
          continue;
        }
        if (!fs.existsSync(abs)) {
          rotos.push(`${o.valor}: ${path.relative(destino, f)} enlaza "${m[1]}", que el proyecto no tiene`);
        }
      }
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

// ---------------------------------------------------------------------------
// TODO COMANDO QUE LA GUIA MANDA CORRER SOBRE EL PROYECTO TIENE QUE CONTESTAR.
//
// EL DEFECTO QUE ESTE BANCO CIERRA, medido: el Paso 14 de docs/04 manda
// `grep '"forma"' .projects-valores.json` para saber si el proyecto se publica
// solo, y ese archivo traia `plataforma` pero NO `forma`. El comando devolvia
// vacio y salia 1. O sea que el proyecto no registraba en ningun lado la
// decision que la carta llama «la que mas cuesta si se toma tarde», y la
// pregunta que abre el cuarto tramo no se podia contestar mirando el proyecto.
//
// La guia daba un comando que no contesta, que es la version ejecutable de una
// pagina que miente.
// ---------------------------------------------------------------------------

test("el proyecto registra su propia forma, que es lo que la guia manda consultar", async () => {
  const pregunta = PREGUNTAS.find((p) => p.id === "forma");
  const rotos = [];
  for (const o of pregunta.opciones) {
    const destino = fs.mkdtempSync(path.join(os.tmpdir(), `registro-${o.valor}-`));
    const idx = String(pregunta.opciones.indexOf(o) + 1);
    const { valores } = await correrAsistente(
      async (_t, id) => ({ PROYECTO: "p", ORG: "o", forma: idx })[id] ?? "",
      {},
      {},
      () => {},
      DERIVADOS,
    );
    instanciar({ raizAndamio: ANDAMIO, destino, valores });
    const registro = JSON.parse(fs.readFileSync(path.join(destino, ".projects-valores.json"), "utf-8"));
    if (registro.forma !== o.valor) rotos.push(`${o.valor}: el proyecto quedo registrado como "${registro.forma}"`);
    if (!registro.plataforma) rotos.push(`${o.valor}: y tampoco registro su plataforma`);
  }
  assert.deepEqual(
    rotos,
    [],
    `el proyecto tiene que poder contestar solo que forma es: es lo que decide si se publica:\n  ${rotos.join("\n  ")}`,
  );
});

// ---------------------------------------------------------------------------
// UN `grep` DE LA GUIA QUE NO ENCUENTRA NADA ES UNA PAGINA QUE MIENTE.
//
// EL DEFECTO QUE ESTE BANCO CIERRA, y se cometio escribiendo el arreglo del
// hallazgo de al lado: el Paso 14 de docs/04 manda
// `grep '"forma"' .projects-valores.json` para que la persona sepa si su
// proyecto se publica solo. El archivo existia, la clave no, y el comando
// devolvia vacio con salida 1. La guia se leia bien y no contestaba nada.
//
// La regla es decidible y no necesita correr un shell: si la guia grepea un
// archivo que un proyecto generado TIENE, el patron tiene que encontrar algo
// ahi. Si el archivo no viaja al proyecto —`valores.json`, que lo escribe la
// persona— el caso no opina.
// ---------------------------------------------------------------------------

test("todo `grep` que la guia manda correr sobre un archivo del proyecto encuentra algo", async () => {
  const proyectos = {};
  for (const forma of ["aplicacion", "sitio"]) {
    const destino = fs.mkdtempSync(path.join(os.tmpdir(), `grep-${forma}-`));
    const idx = String(PREGUNTAS.find((p) => p.id === "forma").opciones.findIndex((o) => o.valor === forma) + 1);
    const { valores } = await correrAsistente(
      async (_t, id) => ({ PROYECTO: "p", ORG: "o", forma: idx })[id] ?? "",
      {},
      {},
      () => {},
      DERIVADOS,
    );
    instanciar({ raizAndamio: ANDAMIO, destino, valores });
    proyectos[forma] = destino;
  }

  const paginas = execFileSync("git", ["ls-files", "docs/*.md", "*.md"], { cwd: RAIZ, encoding: "utf-8" })
    .trim()
    .split("\n")
    .filter(Boolean);

  const mudos = [];
  let mirados = 0;
  for (const pagina of paginas) {
    const texto = fs.readFileSync(path.join(RAIZ, pagina), "utf-8");
    for (const bloque of [...texto.matchAll(/```(?:bash|sh|shell)\n([\s\S]*?)```/g)].map((m) => m[1])) {
      for (const m of bloque.matchAll(/^\s*grep(?:\s+-\w+)*\s+'([^']+)'\s+([\w./-]+)\s*$/gm)) {
        const [, patron, archivo] = m;
        for (const [forma, destino] of Object.entries(proyectos)) {
          const f = path.join(destino, ...archivo.split("/"));
          // Que exista no alcanza: un `grep -r` sobre un directorio tambien
          // "existe", y leerlo como archivo revienta.
          if (!fs.existsSync(f) || !fs.statSync(f).isFile()) continue; // no viaja: el caso no opina
          mirados++;
          if (!new RegExp(patron.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).test(fs.readFileSync(f, "utf-8"))) {
            mudos.push(`${pagina} → grep '${patron}' ${archivo} no encuentra nada en un proyecto "${forma}"`);
          }
        }
      }
    }
  }
  assert.ok(mirados >= 1, "ninguna pagina grepea un archivo que el proyecto tenga: este control dejo de mirar lo que cree");
  assert.deepEqual(
    mudos,
    [],
    `la guia manda correr un comando que no contesta nada. Es la version ejecutable de una pagina que miente:\n  ${mudos.join("\n  ")}`,
  );
});

// ---------------------------------------------------------------------------
// LO QUE LA CONSTITUCION MANDA USAR TIENE QUE EXISTIR EN EL PROYECTO.
//
// EL DEFECTO QUE ESTE BANCO CIERRA, medido en un proyecto recien generado: la
// constitucion que SI viaja (`.projects/AGENTS-marco.md`) manda dejar las
// decisiones estructurales en `docs/adr/`, los incidentes en
// `docs/postmortems/` y lo operativo en `docs/runbooks/`. El proyecto no tenia
// `docs/` en absoluto —`ls docs` daba «No such file or directory»—, asi que la
// primera vez que hacia falta una de las tres habia que inventar donde ponerla.
//
// Y el mismo hueco por el otro lado: `openspec/` llegaba con `specs/` y
// `changes/` VACIOS, o sea que la persona abria la carpeta donde tiene que
// escribir su primer change y no habia ni una plantilla que imitar.
// ---------------------------------------------------------------------------

test("toda carpeta que la constitucion del proyecto manda usar existe en el proyecto", async () => {
  const destino = fs.mkdtempSync(path.join(os.tmpdir(), "constitucion-"));
  const { valores } = await correrAsistente(
    async (_t, id) => ({ PROYECTO: "p", ORG: "o", forma: "1" })[id] ?? "",
    {},
    {},
    () => {},
    DERIVADOS,
  );
  instanciar({ raizAndamio: ANDAMIO, destino, valores });

  // La constitucion se lee de su FUENTE CANONICA y no del destino: `instanciar`
  // copia el andamio, y el render de la constitucion lo hace un paso posterior
  // de la herramienta. La fuente es la misma que ese paso publica.
  const constitucion = fs.readFileSync(path.join(RAIZ, "actions/constitucion/canonico/10-openspec.md"), "utf-8");
  // Las rutas se LEEN de la constitucion, no se escriben aca: una segunda lista
  // al lado de la primera es como empiezan las divergencias.
  const mandadas = [...new Set([...constitucion.matchAll(/`(docs\/[a-z-]+)\/`/g)].map((m) => m[1]))];
  assert.ok(mandadas.length >= 2, `la constitucion nombra ${mandadas.length} carpetas de docs/: se rompio la lectura`);

  const faltan = mandadas.filter((d) => !fs.existsSync(path.join(destino, ...d.split("/"))));
  assert.deepEqual(
    faltan,
    [],
    "la constitucion que viaja al proyecto manda escribir en carpetas que el proyecto no tiene, asi que la primera " +
      `vez que hace falta una hay que inventar donde ponerla: ${faltan.join(", ")}`,
  );

  // Y cada una tiene que decir QUE va adentro: una carpeta vacia con un .gitkeep
  // no es mejor que ninguna carpeta.
  const mudas = mandadas.filter((d) => !fs.existsSync(path.join(destino, ...d.split("/"), "README.md")));
  assert.deepEqual(mudas, [], `estas carpetas existen y no dicen que va adentro: ${mudas.join(", ")}`);
});

test("el proyecto trae un esqueleto de change para imitar el dia uno", async () => {
  const destino = fs.mkdtempSync(path.join(os.tmpdir(), "esqueleto-"));
  const { valores } = await correrAsistente(
    async (_t, id) => ({ PROYECTO: "p", ORG: "o", forma: "1" })[id] ?? "",
    {},
    {},
    () => {},
    DERIVADOS,
  );
  instanciar({ raizAndamio: ANDAMIO, destino, valores });

  const plantilla = path.join(destino, "docs/plantillas/change.md");
  assert.ok(fs.existsSync(plantilla), "sin un esqueleto, la persona abre openspec/changes/ y no tiene nada que imitar");
  const t = fs.readFileSync(plantilla, "utf-8");
  for (const artefacto of ["proposal.md", "spec.md", "design.md", "tasks.md"]) {
    assert.ok(t.includes(artefacto), `el esqueleto tiene que nombrar ${artefacto}: son los cuatro y se escriben en orden`);
  }
  // La trampa que mas cuesta: el validador exige SHALL/MUST en ingles, y una
  // plantilla en castellano que no lo diga manda derecho a un rojo.
  assert.match(t, /SHALL/, "el esqueleto tiene que usar SHALL: es lo que el validador busca literalmente");
  assert.match(t, /no valida|sale 1/i, "y tiene que decir que un requirement en castellano NO valida");
});

// ---------------------------------------------------------------------------
// LAS DOS CLAVES QUE DECIDEN QUE ARCHIVOS VIAJAN, y no se validaban.
//
// EL DEFECTO QUE ESTE BANCO CIERRA, medido: `forma` y `plataforma` eran los DOS
// UNICOS valores sin ninguna comprobacion. Escribir `"sitios"` en vez de
// `"sitio"` en el archivo de valores entregaba, con SALIDA 0 y sin una linea de
// aviso, un proyecto completamente distinto —api/, web/, e2e/, docker-compose—,
// porque el lector cae en su valor por defecto ante cualquier cosa que no
// reconoce. Para una persona no tecnica, sola, es el modo de falla mas caro que
// puede existir en este tramo: pidio una cosa, recibio otra, y nadie le aviso.
// ---------------------------------------------------------------------------

test("una eleccion mal escrita es un error, y el mensaje sugiere la correcta", () => {
  assert.deepEqual(problemasDeEleccion({}), [], "ausente vale el default: protege a un archivo de valores viejo");
  assert.deepEqual(problemasDeEleccion({ forma: "sitio", plataforma: "supabase" }), []);
  assert.deepEqual(problemasDeEleccion({ forma: "  SITIO  " }), [], "la mayuscula y el espacio no son un error");

  const p = problemasDeEleccion({ forma: "sitios" });
  assert.equal(p.length, 1, "un valor que no existe tiene que ser UN problema, nombrado");
  assert.match(p[0], /no es una opcion/);
  assert.match(p[0], /aplicacion, sitio/, "y tiene que listar las que hay");
  assert.match(p[0], /Quisiste decir "sitio"/, "y sugerir la cercana, que es lo que destraba en un segundo");

  assert.equal(problemasDeEleccion({ plataforma: "gcp" }).length, 1, "una plataforma que el andamio no reparte es error");
  assert.equal(problemasDeEleccion({ forma: 7 }).length, 1, "y un tipo que no es texto tambien");
});

test("las opciones declaradas son exactamente las que el asistente ofrece", () => {
  // Dos listas que describen lo mismo se separan. Esta las cruza: si el asistente
  // gana una forma y la validacion no se entera, esa forma se vuelve un error.
  for (const [clave, declaradas] of [
    ["forma", FORMAS],
    ["plataforma", PLATAFORMAS],
  ]) {
    const pregunta = PREGUNTAS.find((q) => q.id === clave);
    assert.ok(pregunta, `el asistente tiene que seguir preguntando por ${clave}`);
    assert.deepEqual(
      pregunta.opciones.map((o) => o.valor).sort(),
      [...declaradas].sort(),
      `las opciones de "${clave}" que ofrece el asistente y las que acepta el validador tienen que ser las mismas`,
    );
  }
});

test("el esqueleto de --ejemplo trae las dos elecciones, o no se pueden tomar por archivo", () => {
  // EL DEFECTO QUE ESTE CASO VIGILA: `--ejemplo > valores.json` y editar es el
  // camino que documentan el README y docs/05. Si el esqueleto no trae `forma`,
  // por ese camino NO SE PUEDE pedir un sitio: hay que adivinar que la clave
  // existe. El arreglo se hizo y quedo SIN GUARDA —borrarla del ejemplo dejaba
  // el banco entero en verde—, asi que por la doctrina del propio repositorio no
  // estaba cerrado.
  const ejemplo = JSON.parse(
    execFileSync("node", [path.join(RAIZ, "herramientas/projects-init.mjs"), "--ejemplo"], { cwd: RAIZ, encoding: "utf-8" }),
  );
  for (const [clave, validas] of [
    ["forma", FORMAS],
    ["plataforma", PLATAFORMAS],
  ]) {
    assert.ok(clave in ejemplo, `--ejemplo no emite "${clave}": por el camino de archivo esa decision no se puede tomar`);
    assert.ok(validas.includes(ejemplo[clave]), `--ejemplo emite ${clave} = ${JSON.stringify(ejemplo[clave])}, que no es una opcion`);
  }
  assert.deepEqual(problemasDeEleccion(ejemplo), [], "el propio ejemplo tiene que pasar la validacion que la herramienta aplica");
});

test("un sitio no recibe infraestructura de nube aunque se elija AWS", () => {
  // EL DEFECTO QUE ESTE CASO VIGILA, y es la mitad que el arreglo anterior dejo
  // abierta: el asistente ya no PREGUNTA por AWS cuando la forma es un sitio, y
  // `derivar` usa el mismo predicado — pero `noViajanPorPlataforma` seguia
  // mirando SOLO la plataforma. Resultado medido: sitio+AWS recibia `infra/` e
  // `infra-prod/` con dos raices de Terraform apuntando a la cuenta del relleno.
  // El rojo se habia ido; el arbol equivocado quedaba, que es peor porque nada
  // lo dice.
  assert.deepEqual(noViajanPorPlataforma("aws", "aplicacion"), [], "una aplicacion en AWS si recibe infraestructura");
  assert.deepEqual(noViajanPorPlataforma("aws", "sitio"), ["infra", "infra-prod"], "un sitio no, aunque se elija AWS");
  assert.deepEqual(noViajanPorPlataforma("supabase", "aplicacion"), ["infra", "infra-prod"]);
  assert.equal(seExcluyeDelCopiado("infra/main.tf", "aws", "sitio"), true);
  assert.equal(seExcluyeDelCopiado("infra/main.tf", "aws", "aplicacion"), false);
});
