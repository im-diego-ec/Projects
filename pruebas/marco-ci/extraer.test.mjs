// Banco del EXTRACTOR que usan los demas bancos: `scriptDelPaso` de ./extraer.mjs.
//
// POR QUE UN EXTRACTOR NECESITA SU PROPIO BANCO. Todo banco de un paso inline confia en que el
// script que recibe es el DEL PASO que pidio. Si el extractor devuelve el de otro, el banco mide
// el script equivocado y sale VERDE, que es la peor forma de equivocarse: nadie mira un verde.
//
// EL DEFECTO QUE ESTO CIERRA, y viene de Rigel (1.17.5, commit c12f831, change
// andamio-no-nace-rojo de alla). El extractor cortaba la busqueda del `run:` solo en `- name:`,
// asi que si el paso pedido no tenia `run:` propio y el siguiente arrancaba con `- id:` o
// `- uses:`, devolvia el `run:` DEL SIGUIENTE como si fuera suyo. Alla se midio el 2026-09-03:
// «Checkout (solo para el diff de push)» devolvia el bloque de `- id: detectar`. Aca estaba
// LATENTE: marco-ci.yml tiene siete pasos sin nombre, pero ningun paso nombrado SIN `run:` queda
// justo antes de uno de ellos CON `run:`. Aparece en cuanto alguien pida el script de todos los
// pasos, que es lo que hacen las compuertas que ejecutan scripts extraidos del YAML.
//
// LO QUE FIJA: (1) el caso exacto, sobre un YAML de juguete; (2) una propiedad sobre los
// workflows REALES del marco, calculada por otro camino: cada `run: |` pertenece al item de
// lista que lo precede mas de cerca, y el extractor tiene que coincidir con eso para cada paso
// nombrado.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { scriptDelPaso, RAIZ } from "./extraer.mjs";
import { carpetaTemporal, escribir, limpiarTodo } from "./util.mjs";
import { porque } from "../porque.mjs";

test.after(limpiarTodo);

const JUGUETE = [
  "jobs:",
  "  uno:",
  "    runs-on: ubuntu-latest",
  "    steps:",
  "      - name: Checkout sin run propio",
  "        uses: actions/checkout@v7",
  "      - id: detectar",
  "        run: |",
  "          echo 'soy del paso sin nombre'",
  "      - name: Otro sin run",
  "        with: { x: 1 }",
  "      - uses: actions/setup-node@v7",
  "      - if: always()",
  "        run: |",
  "          echo 'soy de un paso sin nombre, dos pasos mas abajo'",
  "      - name: Con run propio",
  "        run: |",
  "          echo 'soy el propio'",
  "      - name: Ultimo sin run",
  "        uses: actions/checkout@v7",
  "  dos:",
  "    runs-on: ubuntu-latest",
  "    steps:",
  "      - shell: bash",
  "        run: |",
  "          echo 'soy de OTRO job'",
  "",
].join("\n");

function juguete() {
  return escribir(carpetaTemporal("extraer-"), "wf.yml", JUGUETE);
}

/** El script que el extractor devuelve, o el error con el que se niega. */
function pedir(nombre, ruta) {
  try {
    return { script: scriptDelPaso(nombre, ruta), error: null };
  } catch (error) {
    return { script: null, error: error.message };
  }
}

const SIN_RUN = /no tiene un bloque "run: \|" propio/;

test("un paso sin `run:` seguido de un `- id:` con run NO se queda con el script del vecino", () => {
  const r = pedir("Checkout sin run propio", juguete());
  assert.match(String(r.error), SIN_RUN, porque("el extractor le atribuyo al paso el run: del siguiente", r));
});

test("tampoco cuando el siguiente arranca con `- uses:` y el run esta un paso mas abajo", () => {
  const r = pedir("Otro sin run", juguete());
  assert.match(String(r.error), SIN_RUN, porque("el extractor salto el `- uses:` y siguio de largo", r));
});

test("el ultimo paso de un job sin `run:` no se lleva el del job siguiente", () => {
  // El otro borde del mismo defecto: sin un paso nombrado despues, la busqueda seguia hasta el
  // primer `run:` que encontrara, aunque fuera de otro job.
  const r = pedir("Ultimo sin run", juguete());
  assert.match(String(r.error), SIN_RUN, porque("el extractor cruzo al job siguiente", r));
});

test("y un paso CON run sigue devolviendo el suyo", () => {
  const s = scriptDelPaso("Con run propio", juguete());
  assert.equal(s, "echo 'soy el propio'\n", porque("el extractor dejo de devolver el script propio", s));
});

/**
 * Por OTRO CAMINO que el extractor: de cada `run: |` hacia ATRAS, hasta el item de lista que lo
 * contiene. El extractor va del nombre hacia ADELANTE; si los dos coinciden en cada paso, el
 * limite esta bien puesto.
 */
function duenosDeCadaRun(lineas) {
  const duenos = new Map(); // nombre del paso -> indice de la linea `run: |`
  for (let i = 0; i < lineas.length; i += 1) {
    const run = lineas[i].match(/^(\s*)(?:- )?run: \|\s*$/);
    if (!run) continue;
    const sangriaClave = run[1].length;
    for (let j = i; j >= 0; j -= 1) {
      const item = lineas[j].match(/^(\s*)- (.*)$/);
      if (!item) continue;
      // El item que CONTIENE la clave: el guion va dos columnas antes que las claves del item,
      // o en la misma linea que el `run:`.
      if (j !== i && item[1].length !== sangriaClave - 2) continue;
      const nombre = item[2].match(/^name: (.+)$/);
      if (nombre) duenos.set(nombre[1].trim(), i);
      break;
    }
  }
  return duenos;
}

test("sobre los workflows reales, cada paso nombrado recibe el `run:` que le pertenece", () => {
  const archivos = [
    ".github/workflows/marco-ci.yml",
    ".github/workflows/ci.yml",
    ".github/workflows/aviso-version.yml",
    ".github/workflows/claude.yml",
    ".github/workflows/reproducir-intermitente.yml",
  ].filter((rel) => fs.existsSync(path.join(RAIZ, rel)));
  let comparados = 0;
  const malos = [];
  for (const rel of archivos) {
    const ruta = path.join(RAIZ, rel);
    const lineas = fs.readFileSync(ruta, "utf8").split(/\r?\n/);
    const duenos = duenosDeCadaRun(lineas);
    const nombres = lineas.map((l) => l.match(/^\s*- name: (.+)$/)).filter(Boolean).map((m) => m[1].trim());
    // Un nombre repetido se saltea: el extractor devuelve el PRIMERO por diseño, y comparar el
    // segundo mediria esa eleccion y no el limite.
    const repetidos = new Set(nombres.filter((n, i) => nombres.indexOf(n) !== i));
    for (const nombre of new Set(nombres)) {
      if (repetidos.has(nombre)) continue;
      comparados += 1;
      let obtenido;
      try {
        obtenido = scriptDelPaso(nombre, ruta);
      } catch (error) {
        if (/no tiene un bloque/.test(error.message)) obtenido = null;
        else throw error;
      }
      const esperado = duenos.has(nombre);
      if (esperado !== (obtenido !== null)) {
        malos.push(`${rel}: «${nombre}» ${esperado ? "tiene run: y el extractor no lo encontro" : "NO tiene run: y el extractor devolvio uno ajeno"}`);
      }
    }
  }
  assert.ok(comparados >= 30, `solo se compararon ${comparados} pasos: el recorrido dejo de verlos`);
  assert.deepEqual(malos, [], porque("el extractor y el dueno de cada run: no coinciden", malos));
});
