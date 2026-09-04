import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PLANTILLAS } from "../../herramientas/projects-plantilla-repos.mjs";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const GUIA = fs.readFileSync(path.join(RAIZ, "docs/04-arrancar-acompanado.md"), "utf8");
const PUERTA = fs.readFileSync(path.join(RAIZ, "herramientas/plantilla-repos/personalizar.yml"), "utf8");

/** La seccion del camino de tres clics, aislada. */
function seccion() {
  const i = GUIA.indexOf("## Antes del Paso 0 — el camino sin instalar nada");
  assert.notEqual(i, -1, "desaparecio la seccion del camino sin instalar nada");
  const j = GUIA.indexOf("## Paso 0", i);
  assert.ok(j > i, "no se pudo aislar la seccion");
  return GUIA.slice(i, j);
}

// ---------------------------------------------------------------------------
// LA PUERTA DE ENTRADA DE LA PERSONA MAS NO TECNICA DE TODAS MANDABA A TRES
// LUGARES QUE NO EXISTEN.
//
// Es el camino de quien decidio no instalar nada. La guia le decia tres cosas y
// las tres eran falsas contra el arbol:
//
//   1. «Use this template» en el repositorio DEL MARCO. Eso entrega una copia de
//      las herramientas, no un proyecto.
//   2. En Actions, elegir «Armar mi proyecto». Ese nombre no existe en ningun
//      workflow: el real se llama «Personalizar mi proyecto».
//   3. La seniial de exito era «Tu proyecto está armado». El resumen que el
//      workflow escribe dice «Tu proyecto esta listo».
//
// Los tres se DERIVAN ahora del arbol, no se repiten: el nombre del workflow sale
// de su propio `name:`, la seniial de su GITHUB_STEP_SUMMARY, y los repositorios
// de la lista que el marco usa para regenerarlos.
// ---------------------------------------------------------------------------

test("los repositorios que nombra son los que el marco de verdad publica", () => {
  const t = seccion();
  const nombres = PLANTILLAS.map((p) => p.repo ?? p.nombre ?? p);
  assert.ok(nombres.length >= 2, `el marco declara ${nombres.length} repositorios plantilla: la guarda mediria poco`);
  for (const n of nombres) {
    assert.ok(t.includes(n), `la seccion no manda a ${n}, que es uno de los repositorios plantilla que el marco publica`);
  }
  // Y NO al repositorio del marco: ese entrega una copia de las herramientas.
  assert.ok(
    !/Use this template[\s\S]{0,200}im-diego-ec\/Projects\b/.test(t),
    "vuelve a mandar «Use this template» sobre el repositorio del marco: eso da las herramientas, no un proyecto",
  );
});

test("el workflow que manda a elegir se llama asi DE VERDAD", () => {
  const nombre = /^name:\s*(.+)$/m.exec(PUERTA)?.[1]?.trim();
  assert.ok(nombre, "no se pudo leer el `name:` del workflow de la puerta");
  assert.ok(
    seccion().includes(nombre),
    `la guia manda a elegir un workflow y el real se llama «${nombre}»: en la lista de Actions no va a aparecer el que dice la guia`,
  );
});

test("la seniial de exito es la que el workflow ESCRIBE", () => {
  // Si no coincide, la persona termina bien y no sabe que termino bien.
  const m = /echo "## (Tu proyecto[^"]*)"/.exec(PUERTA);
  assert.ok(m, "el workflow dejo de escribir un titulo de resumen que empiece con «Tu proyecto»");
  assert.ok(seccion().includes(m[1]), `la guia anuncia otra frase de exito; el workflow escribe «${m[1]}»`);
});

test("dice CUAL de los dos elegir, porque de ahi sale la forma", () => {
  // Los dos repositorios no son intercambiables: uno da un sitio y el otro una
  // aplicacion. Mandar a «uno de estos» deja la decision mas cara al azar.
  const t = seccion();
  assert.match(t, /sitio para leer/, "no explica que da el repositorio del sitio");
  assert.match(t, /aplicaci(ó|o)n/, "no explica que da el repositorio de la aplicacion");
});

test("MUERDE: los tres detectores ven la version vieja de la guia", () => {
  const vieja =
    "En [el repositorio del marco](https://github.com/im-diego-ec/Projects), apretá **«Use this template»**. " +
    "Elegí **«Armar mi proyecto»**. Dice **«Tu proyecto está armado»**.";
  assert.ok(!vieja.includes("plantilla-sitio"), "el detector de repositorios no ve la version vieja");
  assert.ok(!vieja.includes("Personalizar mi proyecto"), "el detector del workflow no ve la version vieja");
  assert.ok(!vieja.includes("Tu proyecto esta listo"), "el detector de la seniial no ve la version vieja");
  assert.ok(
    /Use this template[\s\S]{0,200}im-diego-ec\/Projects\b/.test(vieja) === false,
    "el orden del texto viejo pone el enlace antes del boton, asi que el patron mira los 200 caracteres siguientes",
  );
});
