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

import { pasosDe, scriptDelPaso, superficies, RAIZ } from "./extraer.mjs";
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

// ---------------------------------------------------------------------------
// `pasosDe` y `superficies`: el lector que comparten el censo de pasos sin banco y el banco de
// la pagina de cobertura (change `rojo-primero`). Si se equivoca, los dos se equivocan juntos,
// y por eso tiene sus propios casos.
// ---------------------------------------------------------------------------

const JUGUETE_PASOS = [
  "jobs:",
  "  uno:",
  "    runs-on: ubuntu-latest",
  "    continue-on-error: false",
  "    steps:",
  "      - uses: actions/checkout@v7 # v7",
  "      - name: Con nombre",
  "        if: always()",
  "        run: |",
  "          echo uno",
  "          echo dos",
  "      - id: sin-nombre",
  "        run: echo tres",
  "      - run: pnpm lint",
  "      - name: Repetido",
  "        run: |",
  "          echo a",
  "      - name: Repetido",
  "        continue-on-error: true",
  "        run: |",
  "          echo b",
  "  dos:",
  "    continue-on-error: ${{ matrix.experimental }}",
  "    steps:",
  "    - name: Guion a la altura de steps",
  "      run: |",
  "        echo c",
  "    # un comentario entre pasos no cierra la lista",
  "    - name: \"Entre comillas\"",
  "      uses: alguien/algo@v1",
  "",
].join("\n");

test("pasosDe · ve TODOS los pasos, con y sin nombre, run de bloque y de una linea, y uses", () => {
  const pasos = pasosDe(escribir(carpetaTemporal("pasos-"), "wf.yml", JUGUETE_PASOS));
  const resumen = pasos.map((p) => [p.nombre ?? p.id ?? p.textoRun ?? p.uses, p.run, p.extraible]);
  assert.deepEqual(
    resumen,
    [
      ["actions/checkout@v7", null, false],
      ["Con nombre", "bloque", true],
      ["sin-nombre", "linea", false],
      ["pnpm lint", "linea", false],
      ["Repetido", "bloque", true],
      ["Repetido", "bloque", false],
      ["Guion a la altura de steps", "bloque", true],
      ["Entre comillas", null, false],
    ],
    porque("el lector de pasos no devolvio lo que el YAML de juguete tiene", pasos),
  );
  const conNombre = pasos.find((p) => p.nombre === "Con nombre");
  assert.equal(conNombre.largo, 2, porque("el largo del bloque run: son sus lineas no vacias", conNombre));
  assert.equal(conNombre.condicion, "always()", porque("el if: del paso se lee", conNombre));
});

test("pasosDe · continue-on-error: el del paso, el del job, y `false` no cuenta", () => {
  const pasos = pasosDe(escribir(carpetaTemporal("pasos-coe-"), "wf.yml", JUGUETE_PASOS));
  const coe = (nombre, n = 0) => pasos.filter((p) => (p.nombre ?? p.id ?? p.textoRun ?? p.uses) === nombre)[n].continueOnError;
  assert.equal(coe("Con nombre"), null, porque("continue-on-error: false en el job no desactiva nada", pasos));
  assert.equal(coe("Repetido", 0), null);
  assert.deepEqual(coe("Repetido", 1), { valor: "true", linea: 19, delJob: false });
  // Una expresion puede valer true: "puede no fallar" no es una compuerta.
  assert.deepEqual(coe("Guion a la altura de steps"), { valor: "${{ matrix.experimental }}", linea: 23, delJob: true });
});

test("pasosDe · coincide con scriptDelPaso en los workflows y actions REALES", () => {
  // Por construccion, `extraible` promete que scriptDelPaso devuelve el script de ESE paso.
  // Se comprueba sobre el arbol: cada paso extraible se extrae sin error y su script tiene
  // el largo que el lector midio.
  let medidos = 0;
  const malos = [];
  for (const rel of superficies()) {
    for (const paso of pasosDe(path.join(RAIZ, rel))) {
      if (!paso.extraible) continue;
      medidos += 1;
      const script = scriptDelPaso(paso.nombre, path.join(RAIZ, rel));
      const noVacias = script.split("\n").filter((l) => l.trim() !== "").length;
      if (noVacias !== paso.largo) malos.push(`${rel}: «${paso.nombre}» mide ${paso.largo} y el extractor devolvio ${noVacias}`);
    }
  }
  assert.ok(medidos >= 40, `solo se compararon ${medidos} pasos extraibles: el lector dejo de verlos`);
  assert.deepEqual(malos, [], porque("pasosDe y scriptDelPaso no coinciden", malos));
});

test("superficies · recorre el arbol: el CI del marco, el andamio y las actions, y ningun fixture", () => {
  const todas = superficies();
  assert.ok(todas.includes(".github/workflows/marco-ci.yml"), porque("falta marco-ci.yml", todas));
  assert.ok(todas.some((r) => r.startsWith("plantilla/.github/workflows/")), porque("faltan los workflows del andamio", todas));
  assert.ok(todas.some((r) => /^actions\/[^/]+\/action\.yml$/.test(r)), porque("faltan las actions", todas));
  assert.deepEqual(todas.filter((r) => r.split("/").includes("pruebas")), [], porque("un fixture de un banco no es una superficie", todas));

  // Y un workflow nuevo entra solo, sin tocar ninguna lista.
  const raiz = carpetaTemporal("superficies-");
  escribir(raiz, "otra/.github/workflows/nuevo.yml", "jobs: {}\n");
  escribir(raiz, "actions/x/action.yml", "runs: {}\n");
  escribir(raiz, "actions/x/pruebas/fixtures/.github/workflows/juguete.yml", "jobs: {}\n");
  assert.deepEqual(superficies(raiz), ["actions/x/action.yml", "otra/.github/workflows/nuevo.yml"]);
});
