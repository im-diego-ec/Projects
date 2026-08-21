// LAS REFUTACIONES DE LA RONDA 4, cada una como el fixture mínimo que la reproduce.
//
//   node --test actions/constitucion/pruebas/refutaciones-ronda-4.test.mjs
//
// POR QUÉ HAY UNA CUARTA RONDA, Y QUÉ CAMBIA RESPECTO DE LAS TRES ANTERIORES. Las tres
// primeras cerraron CASOS y declararon la CLASE cerrada; la tercera midió que la
// condición 5 —«un rojo de este job impide que el veredicto agregado salga verde»—
// seguía teniendo un error que no era de cobertura sino ESTRUCTURAL: lo prometido es una
// propiedad de un CAMINO (del job de la compuerta, por cada eslabón intermedio de
// `needs`, hasta el check run cuyo NOMBRE exige el ruleset) y lo verificado era un
// patrón sintáctico sobre UN nodo. Un parche de doce líneas cerró diez de trece casos y
// el banco entero de 159 pruebas siguió VERDE con el parche puesto: nada del banco
// defendía el hueco.
//
// Así que este archivo no prueba trece fixtures: prueba que CADA NODO del camino tenga
// el mismo juego de neutralizadores, enumerado de la referencia de `jobs.<id>` de GitHub
// (`continue-on-error`, `if`, `strategy.matrix`, `name`) y no de una lista de fixtures.
// Los dieciséis casos medidos están abajo como evidencia de que el hueco existía.
//
// TODOS los casos se corrieron primero contra el código de la ronda 3. El exit de antes
// y de después de cada uno está en el cuerpo del commit.

import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import {
  DIR_WORKFLOWS,
  casiElVeredicto,
  correEnVerificacion,
  declaraDisparo,
  invocacionesDe,
  jobDelVeredicto,
  nombreDelCheck,
  parsearYaml,
  textosVivosDe,
  transportaElRojo,
  vigilaElResultado,
} from "../cableado.mjs";
import { cubreItemDelPiso, leerCanonico, llevaLaPropiedadSinDesplazarla, revisarPiso } from "../constitucion.mjs";

const SCRIPT = join(import.meta.dirname, "..", "constitucion.mjs");
const CANONICO_REAL = join(import.meta.dirname, "..", "canonico");
const ACTION_YML = join(import.meta.dirname, "..", "action.yml");

const temporales = [];
function temporal(prefijo) {
  const dir = mkdtempSync(join(tmpdir(), prefijo));
  temporales.push(dir);
  return dir;
}
test.after(() => {
  for (const dir of temporales) rmSync(dir, { recursive: true, force: true });
});

/** Un repo de mentira con git de verdad, que RASTREA todo lo que escribe. */
function repo(archivos, { sinRastrear = [] } = {}) {
  const raiz = temporal("projects-ronda4-");
  for (const [ruta, texto] of Object.entries(archivos)) {
    const completa = join(raiz, ruta);
    mkdirSync(dirname(completa), { recursive: true });
    writeFileSync(completa, texto, "utf8");
  }
  const git = (...args) => spawnSync("git", args, { cwd: raiz, encoding: "utf8" });
  git("init", "-q");
  for (const ruta of Object.keys(archivos)) if (!sinRastrear.includes(ruta)) git("add", "--", ruta);
  return raiz;
}

const correr = (raiz, modo, extra = {}) =>
  spawnSync(process.execPath, [SCRIPT], {
    encoding: "utf8",
    env: {
      ...process.env,
      CONSTITUCION_MODO: modo,
      CONSTITUCION_RAIZ: raiz,
      CONSTITUCION_RAMA_POR_DEFECTO: "main",
      GITHUB_OUTPUT: "",
      GITHUB_STEP_SUMMARY: "",
      ...extra,
    },
  });

// ---------------------------------------------------------------------------
// (A) EL CAMINO DEL ROJO. Un solo helper arma el workflow y `cuenta()` responde la
// única pregunta que importa: ¿este cableado cuenta como verificación?
// ---------------------------------------------------------------------------

const VEREDICTO_SANO = `  ci_ok:
    name: ci-ok
    needs: [constitucion]
    if: always()
    runs-on: ubuntu-latest
    steps:
      - run: '[ "\${{ needs.constitucion.result }}" = "success" ] || exit 1'
`;

const workflow = ({ on = "  pull_request:\n", intermedios = "", veredicto = VEREDICTO_SANO } = {}) => `name: CI
on:
${on}jobs:
  constitucion:
    name: constitucion
    runs-on: ubuntu-latest
    steps:
      - uses: ./actions/constitucion
        with:
          modo: verificar
${intermedios}${veredicto}`;

const invocaciones = (texto) =>
  invocacionesDe([{ ruta: `${DIR_WORKFLOWS}/ci.yml`, texto, rastreado: true }], "main");

/** ¿El cableado de este workflow cuenta? Con el motivo, para que el fallo se lea. */
function cuenta(texto) {
  const halladas = invocaciones(texto);
  assert.equal(halladas.length, 1, `el fixture tiene que traer UNA invocacion: ${JSON.stringify(halladas)}`);
  return { cuenta: halladas[0].cuenta, motivos: halladas[0].motivos.join(" | ") };
}

test("(A0) control positivo: el cableado sano cuenta, y sin esto nada de abajo mide", () => {
  const veredicto = cuenta(workflow());
  assert.equal(veredicto.cuenta, true, veredicto.motivos);
});

// --- A1-A4, I2, I3: el continue-on-error del VEREDICTO, en sus seis ortografías -------
//
// Las seis salen de dos filas de la referencia: el campo acepta «boolean or expression»
// y el casteo a booleano trata como TRUE todo lo que no sea falsy. La cadena `"true"`
// entra por no estar vacía; `${{ vars.X }}` entra porque no se puede demostrar falsa.
for (const forma of ["true", "${{ true }}", '"true"', "${{ vars.X }}", "yes", "1"]) {
  test(`(A) continue-on-error: ${forma} en el veredicto agregado no deja pasar el cableado`, () => {
    const veredicto = cuenta(
      workflow({
        veredicto: VEREDICTO_SANO.replace("    if: always()\n", `    if: always()\n    continue-on-error: ${forma}\n`),
      }),
    );
    assert.equal(veredicto.cuenta, false, `${forma} paso: ${veredicto.motivos}`);
    assert.match(veredicto.motivos, /concluye en SUCCESS/);
  });
}

// --- B1, E1: el PASO del veredicto neutralizado --------------------------------------
test("(B1) un continue-on-error en el PASO del veredicto: el paso que compara no cobra nada", () => {
  const veredicto = cuenta(
    workflow({ veredicto: VEREDICTO_SANO.replace("      - run:", "      - continue-on-error: true\n        run:") }),
  );
  assert.equal(veredicto.cuenta, false, veredicto.motivos);
  assert.match(veredicto.motivos, /NINGUN paso vivo/);
});

test("(E1) un if: false en el PASO del veredicto: consultar en un paso que no corre es no consultar", () => {
  const veredicto = cuenta(
    workflow({ veredicto: VEREDICTO_SANO.replace("      - run:", "      - if: false\n        run:") }),
  );
  assert.equal(veredicto.cuenta, false, veredicto.motivos);
  assert.match(veredicto.motivos, /NINGUN paso vivo/);
});

// --- C1, C2, D1: la referencia que no decide nada -----------------------------------
//
// La propiedad: solo cuenta el `run` y el `if` de un paso vivo. Un rótulo de UI, un
// `env` que nadie lee y una línea comentada del `run` son texto, no comportamiento.
const REFERENCIAS_MUDAS = [
  ["C1 solo en un name", "      - name: 'mira needs.constitucion.result (miente)'\n        run: echo ok\n"],
  ["C2 solo en un env sin usar", "      - env:\n          X: '${{ needs.constitucion.result }}'\n        run: echo ok\n"],
  [
    "D1 comentada dentro del run",
    '      - run: |\n          # [ "${{ needs.constitucion.result }}" = "success" ] || exit 1\n          echo ok\n',
  ],
];
for (const [nombre, pasos] of REFERENCIAS_MUDAS) {
  test(`(${nombre}) la referencia esta en el archivo y no la lee nadie: no cuenta`, () => {
    const veredicto = cuenta(
      workflow({
        veredicto: `  ci_ok:\n    name: ci-ok\n    needs: [constitucion]\n    if: always()\n    runs-on: ubuntu-latest\n    steps:\n${pasos}`,
      }),
    );
    assert.equal(veredicto.cuenta, false, veredicto.motivos);
    assert.match(veredicto.motivos, /NINGUN paso vivo/);
  });
}

test("(D1 bis) y la MISMA linea sin comentar si cuenta: lo que decide es el comentario, no el texto", () => {
  const veredicto = cuenta(
    workflow({
      veredicto:
        '  ci_ok:\n    name: ci-ok\n    needs: [constitucion]\n    if: always()\n    runs-on: ubuntu-latest\n    steps:\n      - run: |\n          [ "${{ needs.constitucion.result }}" = "success" ] || exit 1\n          echo ok\n',
    }),
  );
  assert.equal(veredicto.cuenta, true, veredicto.motivos);
});

// --- F1: .outputs no transporta el fallo --------------------------------------------
test("(F1) leer needs.<job>.outputs y nada mas no cobra el rojo: solo .result lo transporta", () => {
  const veredicto = cuenta(
    workflow({
      veredicto: VEREDICTO_SANO.replace(
        '\'[ "${{ needs.constitucion.result }}" = "success" ] || exit 1\'',
        "'echo \"${{ needs.constitucion.outputs.algo }}\"'",
      ),
    }),
  );
  assert.equal(veredicto.cuenta, false, veredicto.motivos);
  assert.match(veredicto.motivos, /outputs tampoco transporta/);
});

// --- M1: EL ESLABON INTERMEDIO QUE LAVA EL ROJO, la peor ----------------------------
//
// Cada nodo pasaba su chequeo local y el rojo se perdía en el medio. Es la que prueba
// que la propiedad es del CAMINO y no de un nodo.
const INTERMEDIO_QUE_LAVA = `  intermedio:
    needs: [constitucion]
    if: always()
    continue-on-error: true
    runs-on: ubuntu-latest
    steps:
      - run: echo lavado
`;
const VEREDICTO_VIA_INTERMEDIO = `  ci_ok:
    name: ci-ok
    needs: [intermedio]
    if: always()
    runs-on: ubuntu-latest
    steps:
      - run: '[ "\${{ needs.intermedio.result }}" = "success" ] || exit 1'
`;

test("(M1) un eslabon intermedio con always() + continue-on-error LAVA el rojo, y el camino no cuenta", () => {
  const veredicto = cuenta(
    workflow({ intermedios: INTERMEDIO_QUE_LAVA, veredicto: VEREDICTO_VIA_INTERMEDIO }),
  );
  assert.equal(veredicto.cuenta, false, veredicto.motivos);
  assert.match(veredicto.motivos, /LAVA el rojo en el medio del camino/);
});

test("(M1 bis) el MISMO intermedio sin continue-on-error si transporta: queda skipped, y skipped no es success", () => {
  const veredicto = cuenta(
    workflow({
      intermedios: INTERMEDIO_QUE_LAVA.replace("    continue-on-error: true\n", "").replace(
        "    if: always()\n",
        "",
      ),
      veredicto: VEREDICTO_VIA_INTERMEDIO,
    }),
  );
  assert.equal(veredicto.cuenta, true, veredicto.motivos);
});

test("(M1 ter) un intermedio con always() que SI cobra el rojo tambien transporta", () => {
  const veredicto = cuenta(
    workflow({
      intermedios: INTERMEDIO_QUE_LAVA.replace("    continue-on-error: true\n", "").replace(
        "      - run: echo lavado\n",
        '      - run: \'[ "${{ needs.constitucion.result }}" = "success" ] || exit 1\'\n',
      ),
      veredicto: VEREDICTO_VIA_INTERMEDIO,
    }),
  );
  assert.equal(veredicto.cuenta, true, veredicto.motivos);
});

test("(M1 quater) un intermedio apagado por su if no transporta: un job que nunca corre no lleva nada", () => {
  const camino = transportaElRojo(
    { constitucion: {}, intermedio: { needs: ["constitucion"], if: false } },
    "intermedio",
    "constitucion",
  );
  assert.equal(camino.transporta, false);
  assert.match(camino.porque, /apagado por su if/);
});

// --- L1, L2: EL NOMBRE DEL CHECK RUN ------------------------------------------------
//
// El ruleset exige un nombre EXACTO. El nombre del check run es el `name` del job si
// está y la clave si no, y `strategy.matrix` lo sufija con la combinación.
test("(L1) la clave ci_ok con un name distinto publica OTRO check: el ruleset espera una senal que no llega", () => {
  const veredicto = cuenta(
    workflow({ veredicto: VEREDICTO_SANO.replace("    name: ci-ok\n", "    name: veredicto-final\n") }),
  );
  assert.equal(veredicto.cuenta, false, veredicto.motivos);
  assert.match(veredicto.motivos, /se llama "veredicto-final", no "ci-ok"/);
});

test("(L2) name: ci-ok con strategy.matrix publica 'ci-ok (a)' y 'ci-ok (b)', y ninguno se llama ci-ok", () => {
  const veredicto = cuenta(
    workflow({
      veredicto: VEREDICTO_SANO.replace(
        "    runs-on: ubuntu-latest\n",
        "    runs-on: ubuntu-latest\n    strategy:\n      matrix:\n        v: [a, b]\n",
      ),
    }),
  );
  assert.equal(veredicto.cuenta, false, veredicto.motivos);
  assert.match(veredicto.motivos, /strategy\.matrix/);
});

test("(L) el nombre del check se DERIVA de la gramatica de GitHub: name si esta, clave si no, matriz que sufija", () => {
  assert.deepEqual(nombreDelCheck("ci_ok", { name: "ci-ok" }), { nombre: "ci-ok", conMatriz: false });
  assert.deepEqual(nombreDelCheck("ci-ok", {}), { nombre: "ci-ok", conMatriz: false });
  // La clave con guion BAJO publica un check con guion bajo: no es el que el ruleset nombra.
  assert.deepEqual(nombreDelCheck("ci_ok", {}), { nombre: "ci_ok", conMatriz: false });
  assert.equal(jobDelVeredicto({ ci_ok: {} }), null);
  assert.equal(jobDelVeredicto({ ci_ok: { name: "ci-ok" } }), "ci_ok");
  assert.match(casiElVeredicto({ ci_ok: {} }).join(" "), /el ruleset exige el nombre exacto/);
});

// ---------------------------------------------------------------------------
// (H1) UN PUSH A main NO ES UNA COMPUERTA DEL PR: corre DESPUÉS del merge, así que
// mientras el PR está abierto no hay ningún check run que el ruleset pueda exigir.
// ---------------------------------------------------------------------------

test("(H1) push a la rama por defecto como UNICO disparo no cuenta como compuerta", () => {
  const veredicto = cuenta(workflow({ on: "  push:\n    branches: [main]\n" }));
  assert.equal(veredicto.cuenta, false, veredicto.motivos);
  assert.match(veredicto.motivos, /DESPUES del merge/);
});

test("(H1 bis) y con pull_request presente el push es un extra sano: es la forma que reparte el scaffold", () => {
  const veredicto = cuenta(workflow({ on: "  push:\n    branches: [main]\n  pull_request:\n" }));
  assert.equal(veredicto.cuenta, true, veredicto.motivos);
});

test("(H1 ter) `declaraDisparo` es una pregunta DISTINTA de la de la compuerta, y las dos hacen falta", () => {
  // Un ESCRITOR corre por schedule o dispatch y es legítimo; una COMPUERTA no.
  const soloDispatch = parsearYaml("on:\n  workflow_dispatch:\n");
  assert.equal(declaraDisparo(soloDispatch), true);
  assert.equal(correEnVerificacion(soloDispatch, "main").corre, false);
  assert.equal(declaraDisparo(parsearYaml("name: x\n")), false);
  assert.equal(declaraDisparo(parsearYaml("on: {}\n")), false);
});

// ---------------------------------------------------------------------------
// (5) EL SELLO. El criterio ya estaba escrito en el comentario del código —«se descartan
// las invocaciones que GitHub NUNCA ejecuta»— y se aplicaba a DOS dimensiones de cinco.
// El señuelo: once líneas que no se ejecutan nunca y no escriben nada, y bajaban el rojo
// de un artefacto amputado a un aviso.
// ---------------------------------------------------------------------------

const VALORES_COMPLETOS = JSON.stringify({
  PROYECTO: "people-ejemplo",
  ORG: "Ejemplo-Org",
  PO: "@po-ejemplo",
  BUILDER_1: "@builder-uno",
  BUILDER_2: "@builder-dos",
  CANAL_ALERTAS: "#alertas-prod",
  CUENTA_DEV: "111111111111",
  CUENTA_PROD: "222222222222",
  DOMINIO_DEV: "ejemplo-dev.test",
  DOMINIO_PROD: "ejemplo.test",
  PAQUETE_API: "api",
  PERFIL_DEV: "perfil-dev",
  PERFIL_PROD: "perfil-prod",
  PREFIJO_RECURSOS: "people-ejemplo",
  REGION: "us-east-1",
});

const ARTEFACTO_AMPUTADO = [
  "<!-- projects:constitucion version=9.9.9 sha=abcabcabcabc superficie=claude-code -->",
  "",
  "# Amputado a mano: le faltan las reglas enteras",
  "",
].join("\n");

const CI_CON_COMPUERTA = `name: CI
on:
  push:
    branches: [main]
  pull_request:
jobs:
  constitucion:
    name: constitucion
    runs-on: ubuntu-latest
    steps:
      - uses: Ejemplo-Org/Projects/actions/constitucion@v1
        with:
          modo: verificar
  ci_ok:
    name: ci-ok
    needs: [constitucion]
    if: always()
    runs-on: ubuntu-latest
    steps:
      - run: '[ "\${{ needs.constitucion.result }}" = "success" ] || exit 1'
`;

const ESCRITOR = (ref) => `name: actualizar
on:
  schedule:
    - cron: "0 6 * * 1"
  workflow_dispatch:
jobs:
  actualizar:
    runs-on: ubuntu-latest
    steps:
      - uses: Ejemplo-Org/Projects/actions/constitucion@${ref}
        with:
          modo: escribir
`;

const REPO_CON_ARTEFACTO_AMPUTADO = {
  "CLAUDE.md": "# CLAUDE.md\n\n@AGENTS.md\n",
  "AGENTS.md": "# AGENTS.md\n\n@.projects/AGENTS-marco.md\n",
  ".projects-valores.json": VALORES_COMPLETOS,
  ".projects/AGENTS-marco.md": ARTEFACTO_AMPUTADO,
  [`${DIR_WORKFLOWS}/ci.yml`]: CI_CON_COMPUERTA,
  [`${DIR_WORKFLOWS}/actualizar-marco.yml`]: ESCRITOR("v1"),
};

// El señuelo textual: rastreado, primer nivel, `on: workflow_dispatch`, job en
// `if: false`, `modo: verificar`, `@v0.0.1`. Nada de esto corre y nada de esto escribe.
const SENUELO = `name: senuelo
on:
  workflow_dispatch:
jobs:
  nunca:
    if: false
    runs-on: ubuntu-latest
    steps:
      - uses: Ejemplo-Org/Projects/actions/constitucion@v0.0.1
        with:
          modo: verificar
`;

const verificar = (archivos) =>
  correr(repo(archivos), "verificar", { CONSTITUCION_SUPERFICIES: "claude-code" });

test("(5) control: el artefacto amputado con el escritor en la ref del verificador es ROJO", () => {
  const corrida = verificar(REPO_CON_ARTEFACTO_AMPUTADO);
  assert.equal(corrida.status, 1, corrida.stdout);
  assert.match(corrida.stdout, /ningun ESCRITOR de este repo pudo haberlo escrito/);
});

test("(5) control: la causa benigna DE VERDAD sigue siendo aviso (exit 0)", () => {
  const corrida = verificar({ ...REPO_CON_ARTEFACTO_AMPUTADO, [`${DIR_WORKFLOWS}/actualizar-marco.yml`]: ESCRITOR("v2") });
  assert.equal(corrida.status, 0, corrida.stdout);
  assert.match(corrida.stdout, /ESCRIBE el artefacto con una ref que no usa para verificarlo/);
});

// Las tres formas del señuelo. La tercera es la que muestra que `modo` es la dimensión
// decisiva: el archivo CORRE de verdad, y aun así no explica nada.
const SENUELOS = [
  ["apagado por el if del job", SENUELO],
  ["con el job encendido pero solo en workflow_dispatch", SENUELO.replace("    if: false\n", "")],
  [
    "que SI corre en pull_request, en modo verificar",
    SENUELO.replace("  workflow_dispatch:\n", "  pull_request:\n").replace("    if: false\n", ""),
  ],
];
for (const [nombre, texto] of SENUELOS) {
  test(`(5) un senuelo ${nombre} NO compra el aviso: sigue ROJO`, () => {
    const corrida = verificar({ ...REPO_CON_ARTEFACTO_AMPUTADO, [`${DIR_WORKFLOWS}/senuelo.yml`]: texto });
    assert.equal(corrida.status, 1, corrida.stdout);
    assert.match(corrida.stdout, /ningun ESCRITOR de este repo pudo haberlo escrito/);
  });
}

// EL SEÑUELO CARO, que es el que exige las otras dos dimensiones. Si el señuelo se
// declara en modo ESCRIBIR, el filtro por modo ya no lo descarta: hay que descartarlo
// porque GitHub no lo ejecuta. La validación por mutación de este banco lo encontró
// sola —sacar `!apagado && disparable` no ponía nada en rojo—, o sea que el filtro
// estaba puesto sin nada que lo defendiera.
const SENUELOS_ESCRITORES = [
  [
    "apagado por el if del job",
    `name: senuelo
on:
  workflow_dispatch:
jobs:
  nunca:
    if: false
    runs-on: ubuntu-latest
    steps:
      - uses: Ejemplo-Org/Projects/actions/constitucion@v0.0.1
        with:
          modo: escribir
`,
  ],
  [
    "apagado por el if del PASO",
    `name: senuelo
on:
  workflow_dispatch:
jobs:
  nunca:
    runs-on: ubuntu-latest
    steps:
      - if: \${{ false }}
        uses: Ejemplo-Org/Projects/actions/constitucion@v0.0.1
        with:
          modo: escribir
`,
  ],
  [
    "sin ningun on: que lo dispare",
    `name: senuelo
jobs:
  nunca:
    runs-on: ubuntu-latest
    steps:
      - uses: Ejemplo-Org/Projects/actions/constitucion@v0.0.1
        with:
          modo: escribir
`,
  ],
];
for (const [nombre, texto] of SENUELOS_ESCRITORES) {
  test(`(5) un senuelo en modo ESCRIBIR ${nombre} tampoco compra el aviso: GitHub no lo ejecuta`, () => {
    const corrida = verificar({ ...REPO_CON_ARTEFACTO_AMPUTADO, [`${DIR_WORKFLOWS}/senuelo.yml`]: texto });
    assert.equal(corrida.status, 1, corrida.stdout);
    assert.match(corrida.stdout, /ningun ESCRITOR de este repo pudo haberlo escrito/);
  });
}

test("(5) y un repo SIN ningun escritor tampoco: la ausencia de escritor no es un escritor", () => {
  const archivos = { ...REPO_CON_ARTEFACTO_AMPUTADO };
  delete archivos[`${DIR_WORKFLOWS}/actualizar-marco.yml`];
  const corrida = verificar(archivos);
  assert.equal(corrida.status, 1, corrida.stdout);
  assert.match(corrida.stdout, /modo VERIFICAR no escribe nada/);
});

test("(5) las tres dimensiones nuevas viajan en la invocacion, que es lo que faltaba", () => {
  const [senuelo] = invocacionesDe([{ ruta: `${DIR_WORKFLOWS}/senuelo.yml`, texto: SENUELO, rastreado: true }], "main");
  assert.equal(senuelo.modo, "verificar");
  assert.equal(senuelo.apagado, true);
  assert.equal(senuelo.disparable, true);
  const [escritor] = invocacionesDe(
    [{ ruta: `${DIR_WORKFLOWS}/actualizar-marco.yml`, texto: ESCRITOR("v1"), rastreado: true }],
    "main",
  );
  assert.equal(escritor.modo, "escribir");
  assert.equal(escritor.apagado, false);
  assert.equal(escritor.disparable, true);
});

// ---------------------------------------------------------------------------
// (6) EL PISO. Con las tres condiciones de la ronda 3 puestas, el relleno pasaba igual:
// `Bash(pnpm echo lint)` autoriza la misma herramienta, corre el mismo programa y lleva
// la palabra. Lo que corre es `echo`.
// ---------------------------------------------------------------------------

const PISO_REAL = leerCanonico(CANONICO_REAL).piso_permisos;
const sinCubrir = (allowlist) => revisarPiso(PISO_REAL, allowlist).map((i) => i.cubre);

/** El allowlist recomendado, con `extra` insertado justo después del programa. */
const conInterloper = (extra) =>
  PISO_REAL.map((item) => {
    const abre = item.entrada.indexOf("(");
    const herramienta = item.entrada.slice(0, abre);
    const palabras = item.entrada.slice(abre + 1, item.entrada.lastIndexOf(")")).split(" ");
    return `${herramienta}(${palabras[0]} ${extra} ${palabras.slice(1).join(" ")})`;
  });

test("(6) control: el allowlist que el manifiesto recomienda cubre el piso entero", () => {
  assert.deepEqual(sinCubrir(PISO_REAL.map((i) => i.entrada)), []);
});

test("(6) control: la forma legitima del monorepo sigue cubriendo (un filtro de paquete es una opcion)", () => {
  assert.deepEqual(sinCubrir(conInterloper("--filter api")), []);
});

test("(6) `pnpm echo <script>` no cubre NADA: una palabra pelada desplaza al script", () => {
  // El bypass medido, y su costo eran cinco caracteres. Cada ítem tiene que quedar sin
  // cubrir, no «alguno».
  assert.deepEqual(
    sinCubrir(conInterloper("echo")),
    PISO_REAL.map((i) => i.cubre),
  );
});

test("(6) la propiedad, no el caso: cualquier palabra pelada intermedia desplaza al script", () => {
  for (const palabra of ["echo", "true", "cat", "algo-que-nadie-escribio"]) {
    assert.equal(cubreItemDelPiso(`Bash(pnpm ${palabra} lint)`, { entrada: "Bash(pnpm lint)", cubre: "lint" }), false, palabra);
  }
  // Y las formas que SÍ tienen que seguir contando, incluida la del propio manifiesto.
  assert.equal(cubreItemDelPiso("Bash(pnpm lint)", { entrada: "Bash(pnpm lint)", cubre: "lint" }), true);
  assert.equal(cubreItemDelPiso("Bash(pnpm --filter api lint)", { entrada: "Bash(pnpm lint)", cubre: "lint" }), true);
  assert.equal(
    cubreItemDelPiso("Bash(npx --yes @fission-ai/openspec@1.9.0 validate *)", {
      entrada: "Bash(npx --yes @fission-ai/openspec@1.9.0 validate *)",
      cubre: "openspec",
    }),
    true,
  );
});

test("(6) EL RESIDUO DEL PISO, escrito como prueba y no como promesa: la aridad de una opcion no se deriva", () => {
  // `--silent` y `--help` son indistinguibles para un lector estático: los dos son
  // opciones, y saber que uno neutraliza el programa y el otro no exigiría una lista de
  // flags por herramienta escrita en el código, que es justo lo que este archivo evita.
  // Queda documentado acá, midiendo, en vez de declarado en un comentario: si algún día
  // se cierra, esta prueba se cae y hay que venir a borrarla.
  assert.equal(llevaLaPropiedadSinDesplazarla("pnpm --help lint", "lint"), true);
  assert.equal(llevaLaPropiedadSinDesplazarla("pnpm -x lint", "lint"), true);
  // La contracara del mismo límite, del lado de la fricción y no del agujero:
  // `pnpm run lint` corre el linter y sale como «sin cubrir». Es ::warning:: con la
  // entrada recomendada escrita, jamás un rojo.
  assert.equal(llevaLaPropiedadSinDesplazarla("pnpm run lint", "lint"), false);
});

// ---------------------------------------------------------------------------
// (X) EL BUG QUE MATÓ LA ACTION ENTERA. GitHub evalúa las expresiones también dentro de
// las `description` de los inputs, y el contexto `github` no existe en la metadata de
// una composite action: la action no cargaba y se caían los quince checks del PR.
// ---------------------------------------------------------------------------

test("(X) ninguna description de la action ni de sus inputs lleva una expresion de dobles llaves", () => {
  const texto = readFileSync(ACTION_YML, "utf8");
  // El alcance es la METADATA DESCRIPTIVA: el `name`/`description` de la action y todo
  // el bloque `inputs:`. Queda afuera a propósito lo que SÍ se evalúa con contexto en
  // una composite action —los `value:` de `outputs:` y los `env:`/`with:` de los pasos
  // de `runs:`—, que es donde las dobles llaves son correctas y necesarias.
  const corte = ["\noutputs:", "\nruns:"]
    .map((marca) => texto.indexOf(marca))
    .filter((i) => i >= 0)
    .sort((a, b) => a - b)[0];
  assert.ok(corte > 0, "no se encontro donde termina la metadata descriptiva de la action");
  const ofensivas = texto
    .slice(0, corte)
    .split("\n")
    .map((linea, i) => [i + 1, linea])
    .filter(([, linea]) => /\$\{\{/.test(linea))
    .map(([n, l]) => `${n}: ${l.trim()}`);
  assert.deepEqual(
    ofensivas,
    [],
    "una expresion dentro de un description tira la action ENTERA en «Set up job» (TemplateValidationException: Unrecognized named-value), antes de correr un solo paso y sin dar un paso rojo: se cae el job y con el todos los checks del PR",
  );
});

test("(X bis) y el input sigue documentando de donde sale la rama, sin la sintaxis que la mata", () => {
  const texto = readFileSync(ACTION_YML, "utf8");
  assert.match(texto, /github\.event\.repository\.default_branch/);
  assert.match(texto, /rama_por_defecto:/);
});

// ---------------------------------------------------------------------------
// (R) EL RESIDUO DE LA CONDICIÓN 5, reubicado donde de verdad está.
// ---------------------------------------------------------------------------

test("(R) el residuo: se verifica que el shell LEA el valor, no lo que compara contra el", () => {
  // Lo irreducible es estrictamente más chico que «no miramos qué hace el run»: que el
  // paso esté vivo, que su rojo no esté amortiguado y que la lectura sea de `.result` SÍ
  // se verifican. Lo que queda afuera es la comparación misma.
  const contraUnValorImposible = workflow({
    veredicto: VEREDICTO_SANO.replace('= "success"', '= "banana"'),
  });
  const veredicto = cuenta(contraUnValorImposible);
  assert.equal(veredicto.cuenta, true, veredicto.motivos);
  // Y la mitad que sí se cierra, en el mismo test para que no se lean por separado:
  assert.equal(textosVivosDe({ steps: [{ if: false, run: "needs.constitucion.result" }] }), "");
  assert.equal(textosVivosDe({ steps: [{ name: "needs.constitucion.result", run: "echo" }] }).trim(), "echo");
  assert.match(vigilaElResultado({ constitucion: {}, ci_ok: { needs: ["constitucion"], if: "always()" } }, "ci_ok", "constitucion").porque, /NINGUN paso vivo/);
});
