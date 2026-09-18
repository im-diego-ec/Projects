// Banco del paso "El andamio reparte el umbral del total del marco" de
// marco-ci.yml, en la mitad que lee la CONFIGURACION de cobertura del andamio.
//
// EL DEFECTO QUE CIERRA, medido y no supuesto. El paso exigia que
// plantilla/vitest.config.base.mjs contuviera la cadena literal "all: true", con un
// `grep -qF` sobre el archivo entero. La opcion `coverage.all` la retiro vitest 3
// (la 5 la ignora sin aviso) y el andamio la saco de su config, medido en 4.1.11;
// desde entonces la cadena aparecia SOLO en el comentario que explica que la opcion
// ya no existe. O sea: el paso daba VERDE leyendo un comentario. Borrar el
// comentario lo ponia rojo sin que nada se hubiera roto, y borrar el `include:`
// —lo que de verdad sostiene el total— lo dejaba verde. El mismo hueco lo tiene el
// upstream (Rigel, marco-ci.yml:2333).
//
// QUE FIJA ESTE BANCO. Lo que se exige se lee en lineas de CODIGO, no en
// comentarios, y lo que se exige es el `include:` —el alcance declarado— y no la
// opcion retirada. El caso rojo que lo prueba es el arbol REAL con la linea de
// `include:` comentada: con el paso viejo salia verde.
//
// Y LO QUE EL PASO SIGUIENTE CERRO (hallazgo FO-H2 de la revision adversarial del
// porte): el filtro era por linea, asi que un `include: []` vacio, la cadena dentro de
// un template string o una metrica en medio de un comentario de bloque sin asteriscos
// salian verdes. Ahora el paso recorre el archivo como JavaScript —sin importarlo:
// importarlo ejecutaria codigo del arbol— y exige un include con al menos un patron.
// Los casos del final lo fijan, con el contracaso del include partido en lineas.
//
// LO QUE NO MIDE, declarado. La otra mitad del paso —que el MINIMO_DEL_MARCO del
// comparador y el del andamio coincidan— no se ejercita aca: este banco copia los
// dos archivos reales y solo muta la configuracion de cobertura. Y el lector del paso
// no entiende expresiones regulares literales: una que contenga una comilla o un `//`
// desalinea la lectura. El andamio no escribe ninguna en ese archivo.
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { RAIZ, scriptDelPaso } from "./extraer.mjs";
import { carpetaTemporal, correrBash, escribir, limpiarTodo } from "./util.mjs";

after(limpiarTodo);

const PASO = "El andamio reparte el umbral del total del marco";
const script = scriptDelPaso(PASO);

const COMPARADOR = "actions/cobertura-diff/medir-cobertura-diff.mjs";
const BASE_VITEST = "plantilla/vitest.config.base.mjs";
const REAL = readFileSync(join(RAIZ, BASE_VITEST), "utf8");

/** Un arbol con los archivos REALES del comparador y del andamio, y la config de
 *  cobertura que el caso decida. El ci.yml del andamio solo tiene que existir. */
function arbolCon(configDeCobertura) {
  const raiz = carpetaTemporal("umbral-");
  escribir(raiz, COMPARADOR, readFileSync(join(RAIZ, COMPARADOR), "utf8"));
  escribir(raiz, "plantilla/.github/workflows/ci.yml", "name: CI\n");
  escribir(raiz, BASE_VITEST, configDeCobertura);
  return raiz;
}

function correr(configDeCobertura) {
  return correrBash(script, { cwd: arbolCon(configDeCobertura) });
}

/** La config real con UNA linea de codigo convertida en comentario. */
function comentando(texto, patron) {
  const lineas = texto.split("\n");
  const i = lineas.findIndex((l) => patron.test(l) && !/^\s*\/\//.test(l));
  assert.ok(i >= 0, `la config real ya no tiene una linea de codigo que matchee ${patron}: el caso quedo midiendo aire`);
  lineas[i] = lineas[i].replace(/^(\s*)/, "$1// ");
  return lineas.join("\n");
}

test("umbral del andamio · el arbol real pasa", () => {
  const r = correr(REAL);
  assert.equal(r.exit, 0, r.salida);
});

test("umbral del andamio · el alcance (include) solo en un comentario es ROJO", () => {
  // EL caso del defecto: con el paso viejo, este arbol salia VERDE porque la
  // cadena de la opcion retirada seguia en el comentario de arriba del include.
  const sinAlcance = comentando(REAL, /^\s*include:\s*\[/);
  const r = correr(sinAlcance);
  assert.equal(r.exit, 1, r.salida);
  // Se mira el mensaje porque el caso existe para que nombre el arreglo: sin
  // "include" en el texto, el que lo lee vuelve a buscar la opcion vieja.
  assert.match(r.salida, /include/);
});

test("umbral del andamio · una metrica del umbral solo en un comentario es ROJO", () => {
  const sinRamas = comentando(REAL, /^\s*branches:\s*minimo/);
  const r = correr(sinRamas);
  assert.equal(r.exit, 1, r.salida);
  assert.match(r.salida, /branches: minimo/);
});

test("umbral del andamio · no exige la opcion que vitest retiro", () => {
  // La config real no la tiene en ninguna linea de codigo. Si el paso la volviera
  // a exigir, este control lo diria antes que un consumidor.
  const codigo = REAL.split("\n").filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l));
  assert.equal(
    codigo.some((l) => /\ball:\s*true\b/.test(l)),
    false,
    "la config del andamio volvio a declarar all: true en codigo: vitest 3 la retiro y la 5 la ignora, es una linea inerte",
  );
  const sinComentarios = codigo.join("\n");
  const r = correr(sinComentarios);
  assert.equal(r.exit, 0, `sin un solo comentario la config sigue siendo valida y el paso tiene que pasar:\n${r.salida}`);
});

// ---------------------------------------------------------------------------
// LO QUE EL FILTRO POR LINEA DEJABA PASAR (hallazgo FO-H2 de la revision
// adversarial del porte). El paso exigia que alguna linea de codigo matcheara
// `include: [`, y eso lo cumplen tres cosas que no declaran ningun alcance: una
// lista VACIA, la misma cadena dentro de un template string, y cualquier linea en
// medio de un comentario de bloque cuyas lineas no empiecen con `*`. Con las tres el
// paso salia verde imprimiendo que el andamio «reparte el umbral del total».

/** La config real con la linea del `include` reemplazada por `reemplazo`. */
function conInclude(reemplazo) {
  const lineas = REAL.split("\n");
  const i = lineas.findIndex((l) => /^\s*include:\s*\[/.test(l));
  assert.ok(i >= 0, "la config real ya no tiene su linea de include: el caso quedo midiendo aire");
  lineas[i] = reemplazo;
  return lineas.join("\n");
}

test("umbral del andamio · un alcance VACIO (include: []) es ROJO", () => {
  const r = correr(conInclude("      include: [],"));
  assert.equal(r.exit, 1, r.salida);
  assert.match(r.salida, /include/);
});

test("umbral del andamio · el alcance escrito solo dentro de un template string es ROJO", () => {
  const texto = conInclude("      include: [],").replace(
    "export function coberturaDelMarco",
    'const ejemplo = `\n      include: ["src/**"]\n`;\n\nexport function coberturaDelMarco',
  );
  const r = correr(texto);
  assert.equal(r.exit, 1, r.salida);
});

test("umbral del andamio · una metrica dentro de un comentario de bloque sin asteriscos es ROJO", () => {
  const lineas = REAL.split("\n");
  const i = lineas.findIndex((l) => /^\s*branches:\s*minimo/.test(l));
  assert.ok(i >= 0, "la config real ya no tiene la linea de branches");
  lineas.splice(i, 1, "        /*", "        branches: minimo,", "        */");
  const r = correr(lineas.join("\n"));
  assert.equal(r.exit, 1, r.salida);
  assert.match(r.salida, /branches: minimo/);
});

test("umbral del andamio · un alcance partido en varias lineas o con varias entradas sigue VERDE", () => {
  const partido = conInclude('      include: [\n        "src/**/*.ts",\n        "src/**/*.tsx",\n      ],');
  const r = correr(partido);
  assert.equal(r.exit, 0, r.salida);
  const conComillaSimple = conInclude("      include: ['src/**/*.{ts,tsx}'],");
  assert.equal(correr(conComillaSimple).exit, 0, "una comilla simple es tan string como una doble");
});
