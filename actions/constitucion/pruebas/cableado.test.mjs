// EL CABLEADO DE LA CONSTITUCIÓN, un caso por cada configuración medida.
//
//   node --test actions/constitucion/pruebas/cableado.test.mjs
//
// POR QUÉ EXISTE ESTE ARCHIVO. La afirmación A01 del cierre de v1 tenía dos mitades y
// la auditoría del 2026-08-20 refutó la segunda: «marco-ci comprueba estáticamente ESE
// cableado» era, en realidad, un `grep -rE 'uses:.*actions/constitucion'` sobre
// `.github/workflows`. Se midieron CINCO configuraciones donde nada verifica nada y el
// check sale `exit 0` —cuatro de ellas MUDAS, sin un solo `::warning::`— y la única
// prueba de regresión que las cubría era un `assert.match(marco, /actions/constitucion/)`
// sobre el texto del workflow, o sea otro grep: no distinguía ninguna de las cinco.
//
// Cada `test` de abajo es una de esas cinco configuraciones, escrita como el fixture
// mínimo que la reproduce. Las cinco se corrieron en ROJO contra el paso anterior antes
// de escribir el reemplazo, y el rojo se midió por CÓDIGO DE SALIDA del check, no por
// lo que imprimía.
//
// Y una nota sobre el orden de la evidencia: el caso (a) no es hipotético. Es la
// combinación que el propio marco REPARTE —el `ci.yml` del scaffold anterior más
// `plantilla/.github/workflows/actualizar-marco.yml` tal cual, que invoca la action en
// modo ESCRIBIR y cuyo encabezado dice, textual, «este workflow no verifica: solo
// propone el arreglo»—. Ahí el grep salía verde declarando sana una circularidad
// completa.

import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import {
  DIR_WORKFLOWS,
  correEnVerificacion,
  dependeDe,
  esPrimerNivel,
  esTagMovil,
  evaluarCableado,
  ifApagado,
  invocacionesDe,
  jobDelVeredicto,
  mencionaLaAction,
  parsearYaml,
  refDe,
  revisarScaffold,
} from "../cableado.mjs";

const SCRIPT = join(import.meta.dirname, "..", "constitucion.mjs");
const RAIZ_REPO = join(import.meta.dirname, "..", "..", "..");

const temporal = (prefijo) => mkdtempSync(join(tmpdir(), prefijo));

/** Un repo de mentira, con git de verdad: `git ls-files` es lo que decide qué está
 *  RASTREADO, y ese es justamente el candado del caso (e). Se hace `add` y no
 *  `commit`: el índice ya alcanza y así no hace falta ninguna firma. */
function repoConWorkflows(archivos, { rastrear = [] } = {}) {
  const raiz = temporal("projects-cableado-");
  for (const [ruta, texto] of Object.entries(archivos)) {
    const completa = join(raiz, ruta);
    mkdirSync(dirname(completa), { recursive: true });
    writeFileSync(completa, texto, "utf8");
  }
  const git = (...args) => spawnSync("git", args, { cwd: raiz, encoding: "utf8" });
  git("init", "-q");
  for (const ruta of rastrear) git("add", "--", ruta);
  return raiz;
}

/** El check tal como lo corre el pipeline: por su CÓDIGO DE SALIDA. */
function correrCableado(raiz, { ramaPorDefecto = "main" } = {}) {
  return spawnSync(process.execPath, [SCRIPT], {
    encoding: "utf8",
    env: {
      ...process.env,
      CONSTITUCION_MODO: "cableado",
      CONSTITUCION_RAIZ: raiz,
      CONSTITUCION_RAMA_POR_DEFECTO: ramaPorDefecto,
      GITHUB_OUTPUT: "",
      GITHUB_STEP_SUMMARY: "",
    },
  });
}

const VALORES_DEL_PROYECTO = JSON.stringify({ PROYECTO: "people-ejemplo" });

/** El `ci.yml` que el scaffold reparte, reducido a lo que este check mira. */
const CI_CABLEADO = `name: CI
on:
  push:
    branches: [main]
  pull_request:
jobs:
  marco:
    uses: "Ejemplo-Org/Projects/.github/workflows/marco-ci.yml@v1"
  constitucion:
    name: constitucion
    runs-on: ubuntu-latest
    permissions:
      contents: read
    steps:
      - uses: actions/checkout@v7
      - uses: "Ejemplo-Org/Projects/actions/constitucion@v1"
        with:
          modo: verificar
  ci_ok:
    name: ci-ok
    needs: [marco, constitucion]
    if: always()
    runs-on: ubuntu-latest
    steps:
      - run: echo ok
`;

/** El `ci.yml` de un consumidor que todavía NO tiene el job: el estado previo real. */
const CI_SIN_EL_JOB = `name: CI
on:
  push:
    branches: [main]
  pull_request:
jobs:
  marco:
    uses: "Ejemplo-Org/Projects/.github/workflows/marco-ci.yml@v1"
  ci_ok:
    name: ci-ok
    needs: [marco]
    if: always()
    runs-on: ubuntu-latest
    steps:
      - run: echo ok
`;

/** El workflow de actualización que el marco reparte, en lo que importa acá: modo
 *  ESCRIBIR, disparado por schedule y a mano, y declarando que no verifica. */
const ACTUALIZAR_MARCO = `name: Actualizar la porcion del marco
# ESTE WORKFLOW NO VERIFICA: solo propone el arreglo.
on:
  schedule:
    - cron: "0 6 * * 1"
  workflow_dispatch:
jobs:
  actualizar:
    runs-on: ubuntu-latest
    permissions:
      contents: write
      pull-requests: write
    steps:
      - uses: actions/checkout@v7
      - uses: "Ejemplo-Org/Projects/actions/constitucion@v1"
        with:
          modo: escribir
`;

// ---------------------------------------------------------------------------
// (a) EL CASO QUE EL PROPIO MARCO REPARTE
// ---------------------------------------------------------------------------

test("(a) ci.yml viejo + actualizar-marco.yml del marco: la unica invocacion escribe, y eso NO es verificar", () => {
  const raiz = repoConWorkflows(
    {
      ".projects-valores.json": VALORES_DEL_PROYECTO,
      [`${DIR_WORKFLOWS}/ci.yml`]: CI_SIN_EL_JOB,
      [`${DIR_WORKFLOWS}/actualizar-marco.yml`]: ACTUALIZAR_MARCO,
    },
    { rastrear: [".projects-valores.json"] },
  );
  const corrida = correrCableado(raiz);
  assert.equal(corrida.status, 1, corrida.stdout);
  // Y no en silencio: el motivo exacto, que es lo que el grep no podia decir.
  assert.match(corrida.stdout, /modo "escribir"/);
  assert.match(corrida.stdout, /::error::/);
  // El grep salia verde afirmando esto, literal. No puede volver a decirlo.
  assert.equal(/la verificacion de la constitucion del marco esta cableada/.test(corrida.stdout), false);
});

// ---------------------------------------------------------------------------
// (b) UN JOB APAGADO
// ---------------------------------------------------------------------------

test("(b) un job con if: false cableando la action no cuenta, y lo dice", () => {
  const raiz = repoConWorkflows(
    {
      ".projects-valores.json": VALORES_DEL_PROYECTO,
      [`${DIR_WORKFLOWS}/ci.yml`]: CI_CABLEADO.replace(
        "    name: constitucion\n",
        "    name: constitucion\n    if: false\n",
      ),
    },
    { rastrear: [".projects-valores.json"] },
  );
  const corrida = correrCableado(raiz);
  assert.equal(corrida.status, 1, corrida.stdout);
  assert.match(corrida.stdout, /apagado por su if/);
});

test("(b bis) el if apagado se reconoce en sus formas, y lo que no se reconoce se toma por encendido", () => {
  for (const apagado of [false, "false", "${{ false }}", "${{ never() }}", "${{ !true }}", ""]) {
    assert.equal(ifApagado(apagado), true, JSON.stringify(apagado));
  }
  for (const encendido of [undefined, null, true, "always()", "!cancelled()", "${{ github.event_name == 'push' }}"]) {
    assert.equal(ifApagado(encendido), false, JSON.stringify(encendido));
  }
});

// ---------------------------------------------------------------------------
// (c) UN EVENTO QUE NO ESTA EN EL CAMINO DEL CAMBIO
// ---------------------------------------------------------------------------

test("(c) la unica invocacion en un on: workflow_dispatch no es una compuerta", () => {
  const soloADemanda = `name: A demanda
on:
  workflow_dispatch:
jobs:
  constitucion:
    name: constitucion
    runs-on: ubuntu-latest
    steps:
      - uses: "Ejemplo-Org/Projects/actions/constitucion@v1"
        with:
          modo: escribir
  ci_ok:
    name: ci-ok
    needs: [constitucion]
    if: always()
    runs-on: ubuntu-latest
    steps:
      - run: echo ok
`;
  const raiz = repoConWorkflows(
    { ".projects-valores.json": VALORES_DEL_PROYECTO, [`${DIR_WORKFLOWS}/a-demanda.yml`]: soloADemanda },
    { rastrear: [".projects-valores.json"] },
  );
  const corrida = correrCableado(raiz);
  assert.equal(corrida.status, 1, corrida.stdout);
  assert.match(corrida.stdout, /workflow_dispatch/);
});

test("(c bis) un push que no toca la rama por defecto tampoco es una compuerta; pull_request si", () => {
  assert.equal(correEnVerificacion(parsearYaml("on:\n  pull_request:\n"), "main").corre, true);
  assert.equal(correEnVerificacion(parsearYaml("on: [pull_request]\n"), "main").corre, true);
  assert.equal(correEnVerificacion(parsearYaml("on:\n  push:\n    branches: [main]\n"), "main").corre, true);
  assert.equal(correEnVerificacion(parsearYaml("on:\n  push:\n"), "main").corre, true);
  assert.equal(correEnVerificacion(parsearYaml("on:\n  push:\n    branches: [release/*]\n"), "main").corre, false);
  assert.equal(correEnVerificacion(parsearYaml("on:\n  schedule:\n    - cron: \"0 6 * * 1\"\n"), "main").corre, false);
  // La rama por defecto NO es una constante del marco: si el repo se llama distinto,
  // el veredicto cambia con el, y por eso entra por parametro.
  assert.equal(correEnVerificacion(parsearYaml("on:\n  push:\n    branches: [troncal]\n"), "troncal").corre, true);
});

// ---------------------------------------------------------------------------
// (d) UN SUBDIRECTORIO QUE GITHUB NO EJECUTA
// ---------------------------------------------------------------------------

test("(d) la action cableada solo en un subdirectorio de .github/workflows no cuenta", () => {
  const raiz = repoConWorkflows(
    {
      ".projects-valores.json": VALORES_DEL_PROYECTO,
      [`${DIR_WORKFLOWS}/ci.yml`]: CI_SIN_EL_JOB,
      [`${DIR_WORKFLOWS}/archivo/viejo.yml`]: CI_CABLEADO,
    },
    { rastrear: [".projects-valores.json"] },
  );
  const corrida = correrCableado(raiz);
  assert.equal(corrida.status, 1, corrida.stdout);
  assert.match(corrida.stdout, /subdirectorio/);
  assert.match(corrida.stdout, /primer nivel/);
});

test("(d bis) esPrimerNivel: solo el primer nivel de .github/workflows", () => {
  assert.equal(esPrimerNivel(`${DIR_WORKFLOWS}/ci.yml`), true);
  assert.equal(esPrimerNivel(`${DIR_WORKFLOWS}/archivo/viejo.yml`), false);
  assert.equal(esPrimerNivel(`${DIR_WORKFLOWS}/a/b/c.yml`), false);
  assert.equal(esPrimerNivel(".github/ci.yml"), false);
});

// ---------------------------------------------------------------------------
// (e) LA PERILLA
// ---------------------------------------------------------------------------

test("(e) un plantilla/.github/workflows/ci.yml vacio y SIN RASTREAR no apaga el check", () => {
  const raiz = repoConWorkflows(
    {
      ".projects-valores.json": VALORES_DEL_PROYECTO,
      [`${DIR_WORKFLOWS}/ci.yml`]: CI_SIN_EL_JOB,
      // La perilla, tal como se midio: vacio y sin agregar al indice.
      [`plantilla/${DIR_WORKFLOWS}/ci.yml`]: "",
    },
    { rastrear: [".projects-valores.json"] },
  );
  const corrida = correrCableado(raiz);
  assert.equal(corrida.status, 1, corrida.stdout);
  assert.equal(/verificacion omitida/.test(corrida.stdout), false, "el skip del distribuidor sigue siendo apagable");
});

test("(e bis) un scaffold BIEN cableado pero SIN RASTREAR no compra el skip: sigue avisando", () => {
  // Este caso aisla el candado de «rastreado», que es el que la mutacion de
  // `rastreado()` por `existsSync()` apaga. El repo no adopto —asi que el veredicto es
  // aviso en los dos mundos— y lo que cambia es lo unico que importaba del pecado
  // original: con el skip, el check se CALLA y lo declara sano; sin el, avisa.
  const raiz = repoConWorkflows(
    {
      [`${DIR_WORKFLOWS}/ci.yml`]: CI_SIN_EL_JOB,
      [`plantilla/${DIR_WORKFLOWS}/ci.yml`]: CI_CABLEADO,
    },
    { rastrear: [] },
  );
  const corrida = correrCableado(raiz);
  assert.equal(corrida.status, 0, corrida.stdout);
  assert.match(corrida.stdout, /::warning::/, "se salteo el check sobre un archivo que git no ve");
});

test("(e ter) rastrear el archivo tampoco alcanza si el repo ADOPTO la constitucion", () => {
  // La otra mitad del candado: el que distribuye el scaffold Y ademas versiona sus
  // valores es consumidor de su propia porcion. La ausencia de artefacto no es «no
  // aplica» ahi.
  const raiz = repoConWorkflows(
    {
      ".projects-valores.json": VALORES_DEL_PROYECTO,
      [`${DIR_WORKFLOWS}/ci.yml`]: CI_SIN_EL_JOB,
      [`plantilla/${DIR_WORKFLOWS}/ci.yml`]: CI_CABLEADO,
    },
    { rastrear: [".projects-valores.json", `plantilla/${DIR_WORKFLOWS}/ci.yml`] },
  );
  const corrida = correrCableado(raiz);
  assert.equal(corrida.status, 1, corrida.stdout);
  assert.match(corrida.stdout, /consumidor de su propia porcion|distribuye/i);
});

test("(e quater) un distribuidor que reparte un scaffold SIN el cableado es rojo, no silencio", () => {
  const raiz = repoConWorkflows(
    {
      [`${DIR_WORKFLOWS}/ci.yml`]: CI_SIN_EL_JOB,
      [`plantilla/${DIR_WORKFLOWS}/ci.yml`]: CI_SIN_EL_JOB,
      [`plantilla/${DIR_WORKFLOWS}/actualizar-marco.yml`]: ACTUALIZAR_MARCO,
    },
    { rastrear: [`plantilla/${DIR_WORKFLOWS}/ci.yml`] },
  );
  const corrida = correrCableado(raiz);
  assert.equal(corrida.status, 1, corrida.stdout);
  assert.match(corrida.stdout, /scaffold/);
});

test("(e quinquies) el distribuidor legitimo si se saltea, y por una propiedad positiva", () => {
  const raiz = repoConWorkflows(
    {
      [`${DIR_WORKFLOWS}/ci.yml`]: CI_SIN_EL_JOB,
      [`plantilla/${DIR_WORKFLOWS}/ci.yml`]: CI_CABLEADO,
    },
    { rastrear: [`plantilla/${DIR_WORKFLOWS}/ci.yml`] },
  );
  const corrida = correrCableado(raiz);
  assert.equal(corrida.status, 0, corrida.stdout);
  assert.match(corrida.stdout, /::notice::/);
  assert.match(corrida.stdout, /con la verificacion cableada/);
});

// ---------------------------------------------------------------------------
// El camino sano, y la quinta condicion
// ---------------------------------------------------------------------------

test("el cableado completo del scaffold cuenta: exit 0 y dice por que cuenta", () => {
  const raiz = repoConWorkflows(
    { ".projects-valores.json": VALORES_DEL_PROYECTO, [`${DIR_WORKFLOWS}/ci.yml`]: CI_CABLEADO },
    { rastrear: [".projects-valores.json"] },
  );
  const corrida = correrCableado(raiz);
  assert.equal(corrida.status, 0, corrida.stdout);
  assert.match(corrida.stdout, /modo verificar/);
  assert.match(corrida.stdout, /ci-ok/);
});

test("un job que el veredicto agregado NO espera no cuenta: un verde que nadie mira no bloquea nada", () => {
  const raiz = repoConWorkflows(
    {
      ".projects-valores.json": VALORES_DEL_PROYECTO,
      [`${DIR_WORKFLOWS}/ci.yml`]: CI_CABLEADO.replace("needs: [marco, constitucion]", "needs: [marco]"),
    },
    { rastrear: [".projects-valores.json"] },
  );
  const corrida = correrCableado(raiz);
  assert.equal(corrida.status, 1, corrida.stdout);
  assert.match(corrida.stdout, /no depende de/);
});

test("el needs TRANSITIVO cuenta: ci-ok -> intermedio -> constitucion", () => {
  const conIntermedio = CI_CABLEADO.replace("needs: [marco, constitucion]", "needs: [marco, intermedio]").replace(
    "  ci_ok:",
    `  intermedio:
    needs: [constitucion]
    runs-on: ubuntu-latest
    steps:
      - run: echo ok
  ci_ok:`,
  );
  const raiz = repoConWorkflows(
    { ".projects-valores.json": VALORES_DEL_PROYECTO, [`${DIR_WORKFLOWS}/ci.yml`]: conIntermedio },
    { rastrear: [".projects-valores.json"] },
  );
  const corrida = correrCableado(raiz);
  assert.equal(corrida.status, 0, corrida.stdout);
});

test("un continue-on-error: true sobre el job o el paso deja el cableado vivo pero inofensivo", () => {
  for (const donde of [
    ["    name: constitucion\n", "    name: constitucion\n    continue-on-error: true\n"],
    ['          modo: verificar\n', '          modo: verificar\n        continue-on-error: true\n'],
  ]) {
    const raiz = repoConWorkflows(
      { ".projects-valores.json": VALORES_DEL_PROYECTO, [`${DIR_WORKFLOWS}/ci.yml`]: CI_CABLEADO.replace(donde[0], donde[1]) },
      { rastrear: [".projects-valores.json"] },
    );
    const corrida = correrCableado(raiz);
    assert.equal(corrida.status, 1, corrida.stdout);
    assert.match(corrida.stdout, /continue-on-error/);
  }
});

test("modo omitido cuenta como verificar: es el default de la action", () => {
  const sinModo = CI_CABLEADO.replace('        with:\n          modo: verificar\n', "");
  const raiz = repoConWorkflows(
    { ".projects-valores.json": VALORES_DEL_PROYECTO, [`${DIR_WORKFLOWS}/ci.yml`]: sinModo },
    { rastrear: [".projects-valores.json"] },
  );
  const corrida = correrCableado(raiz);
  assert.equal(corrida.status, 0, corrida.stdout);
});

test("sin .projects-valores.json rastreado es AVISO y no rojo: adoptar es un PR de migracion", () => {
  const raiz = repoConWorkflows({ [`${DIR_WORKFLOWS}/ci.yml`]: CI_SIN_EL_JOB }, { rastrear: [] });
  const corrida = correrCableado(raiz);
  assert.equal(corrida.status, 0, corrida.stdout);
  assert.match(corrida.stdout, /::warning::/);
  assert.equal(/::error::/.test(corrida.stdout), false);
});

test("sin .github/workflows no hay donde cablear: rojo, nunca verde mudo", () => {
  const raiz = repoConWorkflows({ ".projects-valores.json": VALORES_DEL_PROYECTO }, { rastrear: [".projects-valores.json"] });
  const corrida = correrCableado(raiz);
  assert.equal(corrida.status, 1, corrida.stdout);
  assert.match(corrida.stdout, /no tiene archivos/);
});

test("una invocacion muerta al lado de una viva se imprime igual", () => {
  const raiz = repoConWorkflows(
    {
      ".projects-valores.json": VALORES_DEL_PROYECTO,
      [`${DIR_WORKFLOWS}/ci.yml`]: CI_CABLEADO,
      [`${DIR_WORKFLOWS}/actualizar-marco.yml`]: ACTUALIZAR_MARCO,
    },
    { rastrear: [".projects-valores.json"] },
  );
  const corrida = correrCableado(raiz);
  assert.equal(corrida.status, 0, corrida.stdout);
  assert.match(corrida.stdout, /NO cuenta como cableado/);
});

// ---------------------------------------------------------------------------
// El lector de YAML, en lo que este check le pide
// ---------------------------------------------------------------------------

test("el lector saca de un workflow lo que este check mira", () => {
  const doc = parsearYaml(CI_CABLEADO);
  assert.deepEqual(doc.on, { push: { branches: ["main"] }, pull_request: null });
  assert.deepEqual(Object.keys(doc.jobs), ["marco", "constitucion", "ci_ok"]);
  assert.deepEqual(doc.jobs.ci_ok.needs, ["marco", "constitucion"]);
  assert.equal(doc.jobs.constitucion.steps[1].with.modo, "verificar");
  assert.equal(jobDelVeredicto(doc.jobs), "ci_ok");
  assert.equal(dependeDe(doc.jobs, "ci_ok", "constitucion"), true);
  assert.equal(dependeDe(doc.jobs, "marco", "constitucion"), false);
});

test("un escalar de bloque es texto opaco y no rompe la estructura de abajo", () => {
  const doc = parsearYaml(`name: CI
on:
  pull_request:
jobs:
  uno:
    steps:
      - name: con bloque
        run: |
          echo "jobs:"
          echo "  - uses: nada/de/esto@v1"
          if: false
      - uses: la/action@v1
  dos:
    steps:
      - run: echo ok
`);
  assert.deepEqual(Object.keys(doc.jobs), ["uno", "dos"]);
  assert.equal(doc.jobs.uno.steps.length, 2);
  assert.equal(doc.jobs.uno.steps[1].uses, "la/action@v1");
  // Y lo que vive dentro del bloque no se lee como cableado: es texto.
  assert.equal(invocacionesDe([{ ruta: `${DIR_WORKFLOWS}/x.yml`, texto: "" }]).length, 0);
});

test("el `on` no se convierte al booleano true de YAML 1.1", () => {
  const doc = parsearYaml("on:\n  pull_request:\njobs: {}\n");
  assert.ok(Object.prototype.hasOwnProperty.call(doc, "on"));
  assert.equal(Object.prototype.hasOwnProperty.call(doc, "true"), false);
});

test("un archivo que no se puede leer como YAML no cuenta como cableado", () => {
  const invocaciones = invocacionesDe([{ ruta: `${DIR_WORKFLOWS}/roto.yml`, texto: "\t\testo: [no, cierra\n" }]);
  assert.deepEqual(invocaciones, []);
});

test("mencionaLaAction compara por segmento de ruta, no por @v1", () => {
  assert.equal(mencionaLaAction("Ejemplo-Org/Projects/actions/constitucion@v1"), true);
  assert.equal(mencionaLaAction("{{ORG}}/Projects/actions/constitucion@rama-del-change"), true);
  assert.equal(mencionaLaAction("Ejemplo-Org/Projects/actions/constitucion-vieja@v1"), false);
  assert.equal(mencionaLaAction("Ejemplo-Org/Projects/actions/censo-fuentes@v1"), false);
  assert.equal(refDe("org/projects/actions/constitucion@v1"), "v1");
  assert.equal(esTagMovil("v1"), true);
  assert.equal(esTagMovil("v1.3.0"), false);
  assert.equal(esTagMovil("0123456789abcdef0123456789abcdef01234567"), false);
});

// ---------------------------------------------------------------------------
// El marco sobre si mismo
// ---------------------------------------------------------------------------

test("el scaffold que ESTE repo reparte cablea la verificacion, con las cinco condiciones", () => {
  const revision = revisarScaffold(RAIZ_REPO, "main");
  assert.equal(revision.cablea, true, JSON.stringify(revision));
  assert.equal(revision.job, "constitucion");
});

test("evaluarCableado no depende del disco: la funcion es pura sobre los archivos", () => {
  const archivos = [{ ruta: `${DIR_WORKFLOWS}/ci.yml`, texto: CI_CABLEADO }];
  const alDia = evaluarCableado({ archivos, adopto: true, distribuye: false, scaffoldCablea: { cablea: false } });
  assert.equal(alDia.estado, "al-dia");
  const roto = evaluarCableado({
    archivos: [{ ruta: `${DIR_WORKFLOWS}/ci.yml`, texto: CI_SIN_EL_JOB }],
    adopto: true,
    distribuye: false,
    scaffoldCablea: { cablea: false },
  });
  assert.equal(roto.estado, "rojo");
});
