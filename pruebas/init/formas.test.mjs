import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { noViajanPorForma, formaDe, podarPorForma, seExcluyeDelCopiado, archivosDelAndamio, instanciar, TODAS } from "../../herramientas/projects-init.mjs";
import { PREGUNTAS, correrAsistente } from "../../herramientas/projects-asistente.mjs";

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
  const { valores } = await correrAsistente(async (_t, id) => ({ PROYECTO: "mi-proyecto", ORG: "alguien", forma: opcion })[id] ?? "");
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
    const { valores, respuestas } = await correrAsistente(async (_t, id) => ({ PROYECTO: "p", ORG: "o", forma: idx })[id] ?? "");
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
