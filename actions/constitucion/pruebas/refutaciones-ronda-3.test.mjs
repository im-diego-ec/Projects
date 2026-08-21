// LAS SIETE REFUTACIONES DE LA RONDA 3 CONTRA A01, cada una como el fixture mínimo que
// la reproduce.
//
//   node --test actions/constitucion/pruebas/refutaciones-ronda-3.test.mjs
//
// POR QUÉ EXISTE ESTE ARCHIVO, Y POR QUÉ ES EL TERCERO. La afirmación A01 —«marco-ci
// comprueba estáticamente que el consumidor tenga la verificación de la constitución
// cableada»— ya se «cerró» dos veces:
//
//   · ronda 1: se pasó de un `grep` de una línea `uses:` a las cinco condiciones;
//   · ronda 2: el refutador midió que el parseo IGNORA los filtros que deciden si el
//     workflow CORRE, que `continue-on-error` se reconocía en una sola de sus tres
//     ortografías, que la condición del `needs` mide la ARISTA y no el bloqueo, que la
//     perilla del rastreo seguía enchufada un archivo más allá, que el sello se evadía
//     con 12 caracteres y que el piso se satisfacía con `Bash(echo lint)`.
//
// Las dos veces se cerraron los CASOS NOMBRADOS y se declaró la CLASE cerrada. Este
// banco NO se escribe contra los casos: cada grupo de abajo prueba la PROPIEDAD, y los
// fixtures que el refutador midió son sólo la evidencia de que el hueco existía. Los
// diez fixtures de disparo, por ejemplo, no son diez ortografías: son el producto de
// las claves de filtro que la referencia de eventos de GitHub Actions permite bajo
// `pull_request` y `push` (`types`, `branches`, `branches-ignore`, `paths`,
// `paths-ignore`, `tags`), que es de donde se derivó la implementación.
//
// TODOS los casos se corrieron primero contra el código de la ronda 2 y salieron
// exit 0 —o sea, verdes sobre configuraciones donde nada verifica nada—. El exit de
// antes y de después de cada uno está en el cuerpo del commit.

import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import {
  DIR_WORKFLOWS,
  admiteRama,
  correEnVerificacion,
  invocacionesDe,
  parsearYaml,
  patronCoincide,
  tapaElRojo,
  vigilaElResultado,
} from "../cableado.mjs";
import { cubreItemDelPiso, leerCanonico, revisarPiso, verificar } from "../constitucion.mjs";

const SCRIPT = join(import.meta.dirname, "..", "constitucion.mjs");
const RAIZ_REPO = join(import.meta.dirname, "..", "..", "..");
const CANONICO_REAL = join(import.meta.dirname, "..", "canonico");

const temporales = [];
function temporal(prefijo) {
  const dir = mkdtempSync(join(tmpdir(), prefijo));
  temporales.push(dir);
  return dir;
}
test.after(() => {
  for (const dir of temporales) rmSync(dir, { recursive: true, force: true });
});

/**
 * Un repo de mentira con git de verdad. Por defecto RASTREA todo lo que escribe: lo
 * rastreado es el universo de este check (hallazgo 4), así que un fixture que quiere
 * medir otra cosa no puede quedar apagado de rebote por un archivo sin `git add`.
 */
function repo(archivos, { sinRastrear = [] } = {}) {
  const raiz = temporal("projects-ronda3-");
  for (const [ruta, texto] of Object.entries(archivos)) {
    const completa = join(raiz, ruta);
    mkdirSync(dirname(completa), { recursive: true });
    writeFileSync(completa, texto, "utf8");
  }
  const git = (...args) => spawnSync("git", args, { cwd: raiz, encoding: "utf8" });
  git("init", "-q");
  for (const ruta of Object.keys(archivos)) {
    if (!sinRastrear.includes(ruta)) git("add", "--", ruta);
  }
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

/**
 * El cableado SANO, con todo lo que el marco pide: primer nivel, `pull_request`, modo
 * verificar, nada apagado, y un `ci-ok` que corre siempre Y MIRA el resultado. Cada
 * fixture de abajo cambia UNA cosa de acá.
 */
const CI_SANO = `name: CI
on:
  push:
    branches: [main]
  pull_request:
jobs:
  constitucion:
    name: constitucion
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: "Ejemplo-Org/Projects/actions/constitucion@v1"
        with:
          modo: verificar
  ci_ok:
    name: ci-ok
    needs: [constitucion]
    if: always()
    runs-on: ubuntu-latest
    steps:
      - run: |
          [ "\${{ needs.constitucion.result }}" = "success" ] || exit 1
`;

const conValores = (ci) => ({ ".projects-valores.json": VALORES_DEL_PROYECTO, [`${DIR_WORKFLOWS}/ci.yml`]: ci });

/** Reemplazo que FALLA si no aplicó: un fixture que no muta no prueba nada. */
function mutar(texto, de, a) {
  assert.ok(texto.includes(de), `el fixture no contiene ${JSON.stringify(de)}`);
  return texto.replace(de, a);
}

// ---------------------------------------------------------------------------
// (1) LOS FILTROS DE DISPARO. Un workflow que no corre no es una compuerta, y la
// condición estaba implementada como «la clave pull_request aparece en on:».
// ---------------------------------------------------------------------------

const DISPAROS_QUE_NO_CORREN = [
  ["paths-ignore que apaga todo", "  pull_request:\n", "  pull_request:\n    paths-ignore: ['**']\n"],
  [
    "paths-ignore justo sobre los archivos que este check protege",
    "  pull_request:\n",
    "  pull_request:\n    paths-ignore: [AGENTS.md, .projects/**, .projects-valores.json, .projects-desvios.json]\n",
  ],
  ["paths que excluye la constitucion", "  pull_request:\n", "  pull_request:\n    paths: [docs/**]\n"],
  ["branches que no es la rama por defecto", "  pull_request:\n", "  pull_request:\n    branches: [gh-pages]\n"],
  ["types que no incluye la apertura ni el push", "  pull_request:\n", "  pull_request:\n    types: [closed]\n"],
  ["branches-ignore que excluye la rama por defecto", "  pull_request:\n", "  pull_request:\n    branches-ignore: [main]\n"],
  ["types sin synchronize: el segundo push no se verifica", "  pull_request:\n", "  pull_request:\n    types: [opened]\n"],
];

for (const [nombre, de, a] of DISPAROS_QUE_NO_CORREN) {
  test(`(1) ${nombre}: el workflow no corre en el camino del cambio, asi que no cablea nada`, () => {
    // El `push` del fixture sano se saca a proposito: lo que se mide es el
    // `pull_request` filtrado, y un `push: [main]` sano taparia el hallazgo.
    const ci = mutar(mutar(CI_SANO, "  push:\n    branches: [main]\n", ""), de, a);
    const corrida = correrCableado(repo(conValores(ci)));
    assert.equal(corrida.status, 1, corrida.stdout);
    assert.match(corrida.stdout, /::error::/);
  });
}

test("(1) push filtrado por paths tampoco cuenta, y un push solo de tags menos", () => {
  for (const on of [
    "on:\n  push:\n    branches: [main]\n    paths-ignore: ['**']\n",
    "on:\n  push:\n    tags: ['v*']\n",
    "on:\n  push:\n    branches-ignore: [main]\n",
  ]) {
    const ci = mutar(CI_SANO, "on:\n  push:\n    branches: [main]\n  pull_request:\n", on);
    const corrida = correrCableado(repo(conValores(ci)));
    assert.equal(corrida.status, 1, `${on}\n${corrida.stdout}`);
  }
});

test("(1) y el camino sano sigue contando: siempre que haya pull_request", () => {
  for (const on of [
    "on:\n  pull_request:\n",
    "on: [pull_request]\n",
    "on:\n  pull_request:\n    types: [opened, synchronize, reopened, ready_for_review]\n",
    "on:\n  pull_request:\n    branches: [main, 'release/**']\n",
    "on:\n  push:\n    branches: ['**']\n  pull_request:\n",
  ]) {
    const ci = mutar(CI_SANO, "on:\n  push:\n    branches: [main]\n  pull_request:\n", on);
    const corrida = correrCableado(repo(conValores(ci)));
    assert.equal(corrida.status, 0, `${on}\n${corrida.stdout}`);
  }
});

test("(1 bis) H1: un push, aunque su filtro de ramas sea generoso, no es una compuerta del PR", () => {
  // Las dos formas que la ronda 3 midio como VERDES y no deberian: un `push` cuyo
  // filtro de ramas admite todo sigue corriendo despues del merge. La generosidad del
  // filtro no cambia el momento.
  for (const on of ["on:\n  push:\n    branches: ['**']\n", "on:\n  push:\n    branches-ignore: [gh-pages]\n"]) {
    const ci = mutar(CI_SANO, "on:\n  push:\n    branches: [main]\n  pull_request:\n", on);
    const corrida = correrCableado(repo(conValores(ci)));
    assert.equal(corrida.status, 1, `${on}\n${corrida.stdout}`);
    assert.match(corrida.stdout, /DESPUES del merge/);
  }
});

test("(1) la asimetria medida: `pull_request` se mira con el mismo rigor que `push`", () => {
  // El código de la ronda 2 comparaba `push.branches` y de `pull_request` no miraba
  // nada. La propiedad es que las dos ramas del mismo `if` usen el mismo lector.
  const filtrado = { on: { pull_request: { branches: ["gh-pages"] } } };
  assert.equal(correEnVerificacion(filtrado, "main").corre, false);
  assert.equal(correEnVerificacion({ on: { pull_request: { branches: ["main"] } } }, "main").corre, true);
});

test("(1) el matcher de patrones es el de la hoja de referencia, no un `*` casero", () => {
  // DERIVADO de la «filter pattern cheat sheet», fila por fila, y las dos filas que
  // sorprenden son las que un matcher casero siempre se come: `?` y `+` NO son
  // comodines, son CUANTIFICADORES del carácter anterior («matches zero or one of the
  // preceding character», «matches one or more of the preceding character»). Escribir
  // la prueba desde la memoria en vez de desde la hoja daba `v?` == `v1`, que es falso.
  assert.equal(patronCoincide("releases/*", "releases/v1"), true);
  assert.equal(patronCoincide("releases/*", "releases/v1/fix"), false);
  assert.equal(patronCoincide("releases/**", "releases/v1/fix"), true);
  assert.equal(patronCoincide("**", "cualquier/cosa/profunda"), true);
  assert.equal(patronCoincide("ma?in", "main"), true);
  assert.equal(patronCoincide("ma?in", "min"), true);
  assert.equal(patronCoincide("ma?in", "maain"), false);
  assert.equal(patronCoincide("ma+in", "maain"), true);
  assert.equal(patronCoincide("ma+in", "min"), false);
  assert.equal(patronCoincide("v[12]", "v2"), true);
  assert.equal(patronCoincide("v[12]", "v3"), false);
  assert.equal(patronCoincide("Octo*", "Octocat"), true);
  assert.equal(patronCoincide("feature/**", "feature/beta-a/my-branch"), true);
  // El escape de un caracter especial, que la hoja también documenta.
  assert.equal(patronCoincide("v1\\.0", "v1.0"), true);
  assert.equal(patronCoincide("v1\\.0", "v1x0"), false);
  // Y la regla del orden, textual: «a matching negative pattern after a positive
  // match will exclude the path; a matching positive after a negative includes it».
  assert.equal(admiteRama(["**", "!main"], "main"), false);
  assert.equal(admiteRama(["!main", "**"], "main"), true);
  assert.equal(admiteRama(["main"], "main"), true);
  assert.equal(admiteRama(["release/*"], "main"), false);
});

// ---------------------------------------------------------------------------
// (2) CONTINUE-ON-ERROR EN TODAS SUS FORMAS. El valor admite booleano o expresión, y
// la referencia de expresiones dice que toda cadena NO VACÍA se castea a `true`: o sea
// que `"false"` entrecomillado también tapa el rojo.
// ---------------------------------------------------------------------------

const TAPADAS = [
  ["job, expresion", "    name: constitucion\n", "    name: constitucion\n    continue-on-error: ${{ true }}\n"],
  ["job, cadena", "    name: constitucion\n", '    name: constitucion\n    continue-on-error: "true"\n'],
  ["paso, expresion", "          modo: verificar\n", "          modo: verificar\n        continue-on-error: ${{ true }}\n"],
  ["job, booleano", "    name: constitucion\n", "    name: constitucion\n    continue-on-error: true\n"],
  [
    "job, cadena que dice false y GitHub lee true",
    "    name: constitucion\n",
    '    name: constitucion\n    continue-on-error: "false"\n',
  ],
  [
    "job, expresion opaca que no se puede probar falsa",
    "    name: constitucion\n",
    "    name: constitucion\n    continue-on-error: ${{ vars.EXPERIMENTAL }}\n",
  ],
];

for (const [nombre, de, a] of TAPADAS) {
  test(`(2) continue-on-error (${nombre}) deja el cableado vivo pero inofensivo`, () => {
    const corrida = correrCableado(repo(conValores(mutar(CI_SANO, de, a))));
    assert.equal(corrida.status, 1, corrida.stdout);
    assert.match(corrida.stdout, /continue-on-error/);
  });
}

test("(2) y el `false` que GitHub lee como falso de verdad no es un hallazgo", () => {
  for (const valor of ["false", "${{ false }}", "${{ !true }}"]) {
    const ci = mutar(CI_SANO, "    name: constitucion\n", `    name: constitucion\n    continue-on-error: ${valor}\n`);
    const corrida = correrCableado(repo(conValores(ci)));
    assert.equal(corrida.status, 0, `${valor}\n${corrida.stdout}`);
  }
});

test("(2) tapaElRojo: presente y no demostrablemente falso es tapado", () => {
  for (const tapa of [true, "true", '"true"', "${{ true }}", "${{ fromJSON(env.x) }}", "'false'", "1"]) {
    assert.equal(tapaElRojo(tapa), true, JSON.stringify(tapa));
  }
  for (const noTapa of [undefined, null, false, "false", "${{ false }}", "0", ""]) {
    assert.equal(tapaElRojo(noTapa), false, JSON.stringify(noTapa));
  }
});

// ---------------------------------------------------------------------------
// (3) QUE EL ROJO BLOQUEE, no que exista una arista de `needs`.
//
// La doc de GitHub sobre checks requeridos lo dice sin ambigüedad: «when a job is
// skipped by a conditional, the job reports Success» y «may not block merging». Un
// `ci-ok` con `needs: [constitucion]` y sin `if: always()` queda SALTEADO cuando la
// constitución falla, reporta Success y el merge pasa. Por eso el marco exige el
// `always()` — y por eso el `always()` sin mirar el resultado es peor que nada.
// ---------------------------------------------------------------------------

// MODO AVISO DESDE EL 2026-08-21 (residuo A01, decisión del Builder 1). Este caso sigue
// siendo un hallazgo y sigue saliendo con su motivo, pero por ::warning:: y no por
// ::error::. No es que el hallazgo valga menos: es que la regla que lo produce
// —«ningún paso vivo consulta needs.<job>.result»— se decide LEYENDO el texto de los
// pasos, y su lado de ACEPTACIÓN quedó refutado con un oráculo semántico
// independiente: 70 falsos verdes sobre 2928 casos generados, cuya forma más corta es
// un paso con `if: needs.<job>.result == success`, que satisface la compuerta
// SALTEÁNDOSE. Una regla cuyo lado de aceptación es unsound no puede presentar su lado
// de rechazo como compuerta. Lo que sí se decide por estructura —el `always()` que
// falta, el continue-on-error, el eslabón que lava el rojo— sigue siendo ROJO, y los
// casos que siguen lo fijan.
test("(3) ci-ok con always() que NO consulta el resultado: AVISO con el residuo nombrado, ya no rojo", () => {
  const ci = mutar(
    CI_SANO,
    '      - run: |\n          [ "${{ needs.constitucion.result }}" = "success" ] || exit 1\n',
    "      - run: echo ok\n",
  );
  const corrida = correrCableado(repo(conValores(ci)));
  assert.equal(corrida.status, 0, corrida.stdout);
  assert.match(corrida.stdout, /NINGUN paso vivo suyo consulta/);
  assert.doesNotMatch(corrida.stdout, /::error::/, corrida.stdout);
  // El aviso del repo y el residuo del check son dos cosas, y las dos tienen que
  // estar: una dice qué arreglar acá, la otra dice qué NO acredita este paso.
  assert.match(corrida.stdout, /::warning::[^\n]*MODO AVISO/, corrida.stdout);
  assert.match(corrida.stdout, /70 falsos verdes sobre 2928/, corrida.stdout);
});

test("(3) ci-ok sin always(): la constitucion en rojo lo saltea, y un job salteado reporta Success", () => {
  const ci = mutar(CI_SANO, "    needs: [constitucion]\n    if: always()\n", "    needs: [constitucion]\n");
  const corrida = correrCableado(repo(conValores(ci)));
  assert.equal(corrida.status, 1, corrida.stdout);
  assert.match(corrida.stdout, /salteado|always/i);
});

test("(3) un job que depende de otro que NUNCA corre no cuenta: se saltea en toda corrida", () => {
  const ci = mutar(
    CI_SANO,
    "  constitucion:\n    name: constitucion\n",
    `  nunca:
    if: false
    runs-on: ubuntu-latest
    steps:
      - run: echo nada
  constitucion:
    name: constitucion
    needs: [nunca]
`,
  );
  const corrida = correrCableado(repo(conValores(ci)));
  assert.equal(corrida.status, 1, corrida.stdout);
  assert.match(corrida.stdout, /nunca/);
});

test("(3) las formas de mirar el resultado que GitHub ofrece cuentan todas", () => {
  const jobs = { constitucion: {}, ci_ok: { needs: ["constitucion"], if: "always()" } };
  for (const texto of [
    '[ "${{ needs.constitucion.result }}" = "success" ] || exit 1',
    "if [ \"${{ needs['constitucion'].result }}\" != success ]; then exit 1; fi",
    'contains(needs.*.result, "failure") && exit 1',
    "echo '${{ toJSON(needs) }}' | grep -qv failure",
  ]) {
    const conPaso = { ...jobs, ci_ok: { ...jobs.ci_ok, steps: [{ run: texto }] } };
    assert.equal(vigilaElResultado(conPaso, "ci_ok", "constitucion").vigila, true, texto);
  }
  const mudo = { ...jobs, ci_ok: { ...jobs.ci_ok, steps: [{ run: "echo ok" }] } };
  assert.equal(vigilaElResultado(mudo, "ci_ok", "constitucion").vigila, false);
});

test("(3) el needs transitivo cuenta si ci-ok mira el eslabon que lleva a la constitucion", () => {
  const jobs = {
    constitucion: {},
    intermedio: { needs: ["constitucion"] },
    ci_ok: { needs: ["intermedio"], if: "always()", steps: [{ run: '[ "${{ needs.intermedio.result }}" = success ]' }] },
  };
  assert.equal(vigilaElResultado(jobs, "ci_ok", "constitucion").vigila, true);
  // Y mirar un eslabon que NO lleva a la constitucion no alcanza.
  const otro = { ...jobs, build: {}, ci_ok: { ...jobs.ci_ok, needs: ["intermedio", "build"], steps: [{ run: '[ "${{ needs.build.result }}" = success ]' }] } };
  assert.equal(vigilaElResultado(otro, "ci_ok", "constitucion").vigila, false);
});

// ---------------------------------------------------------------------------
// (4) LA PERILLA, UN ARCHIVO MÁS ALLÁ. `git ls-files` es el universo: un workflow sin
// rastrear no lo ejecuta nadie más que la máquina donde se escribió.
// ---------------------------------------------------------------------------

test("(4) un zz.yml SIN RASTREAR no compra el cableado, y el aviso no miente sobre quien cablea", () => {
  const sinElJob = mutar(CI_SANO, /* borra el job entero */ "  constitucion:\n    name: constitucion\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v7\n      - uses: \"Ejemplo-Org/Projects/actions/constitucion@v1\"\n        with:\n          modo: verificar\n", "");
  const raiz = repo(
    {
      ".projects-valores.json": VALORES_DEL_PROYECTO,
      [`${DIR_WORKFLOWS}/ci.yml`]: sinElJob,
      [`${DIR_WORKFLOWS}/zz.yml`]: CI_SANO,
    },
    { sinRastrear: [`${DIR_WORKFLOWS}/zz.yml`] },
  );
  const corrida = correrCableado(raiz);
  assert.equal(corrida.status, 1, corrida.stdout);
  assert.match(corrida.stdout, /zz\.yml/, "el archivo sin rastrear tiene que salir nombrado, no ignorado en silencio");
  assert.match(corrida.stdout, /rastre/i);
});

test("(4) y el mismo zz.yml RASTREADO si cablea: lo que decide es git, no el disco", () => {
  const sinElJob = mutar(CI_SANO, "  constitucion:\n    name: constitucion\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v7\n      - uses: \"Ejemplo-Org/Projects/actions/constitucion@v1\"\n        with:\n          modo: verificar\n", "");
  const raiz = repo({
    ".projects-valores.json": VALORES_DEL_PROYECTO,
    [`${DIR_WORKFLOWS}/ci.yml`]: sinElJob,
    [`${DIR_WORKFLOWS}/zz.yml`]: CI_SANO,
  });
  const corrida = correrCableado(raiz);
  assert.equal(corrida.status, 0, corrida.stdout);
  assert.match(corrida.stdout, /zz\.yml/, "el notice tiene que nombrar el archivo que cablea DE VERDAD");
});

test("(4) el scaffold de un distribuidor tambien se lee por lo rastreado, y el notice nombra el archivo real", () => {
  const raiz = repo(
    {
      [`${DIR_WORKFLOWS}/ci.yml`]: CI_SANO,
      [`plantilla/${DIR_WORKFLOWS}/ci.yml`]: "name: CI\non:\n  pull_request:\njobs: {}\n",
      [`plantilla/${DIR_WORKFLOWS}/zz.yml`]: CI_SANO,
    },
    { sinRastrear: [`plantilla/${DIR_WORKFLOWS}/zz.yml`] },
  );
  const corrida = correrCableado(raiz);
  assert.equal(corrida.status, 1, corrida.stdout);
  assert.match(corrida.stdout, /scaffold/);
});

// ---------------------------------------------------------------------------
// (5) EL SELLO NO SE EVADE CON 12 CARACTERES. La explicación inocente de un artefacto
// más nuevo que esta copia es «el escritor corrió con otra ref que la que verifica».
// Eso se LEE del árbol: si todas las invocaciones usan la MISMA ref, ninguna pudo
// escribir algo más nuevo que lo que corre acá.
// ---------------------------------------------------------------------------

const CANONICO_SINTETICO = () => {
  const dir = temporal("projects-canonico-r3-");
  writeFileSync(
    join(dir, "manifiesto.json"),
    JSON.stringify({
      presupuesto_lineas: 500,
      piso_permisos: [{ nombre: "las pruebas", entrada: "Bash(pnpm test)", cubre: "test" }],
      versiones: [{ version: "1.3.0", publicada: "2026-08-19", exigible_desde: "2026-09-16" }],
    }),
    "utf8",
  );
  writeFileSync(join(dir, "10-reglas.md"), "# Reglas\n\n<!-- projects:regla id=regla-uno -->\n\n- La primera regla.\n", "utf8");
  return leerCanonico(dir);
};

const CADENA_SANA = {
  "CLAUDE.md": "# CLAUDE.md\n\n@AGENTS.md\n",
  "AGENTS.md": "# AGENTS.md\n\n@.projects/AGENTS-marco.md\n",
};

/** El artefacto amputado y con la cabecera subida a mano: el bypass, tal cual. */
function artefactoAdelantado(canonico) {
  const cuerpo = [
    "<!-- projects:constitucion version=9.9.9 sha=abcabcabcabc superficie=claude-code -->",
    "",
    "# Amputado a mano: le falta la regla entera",
    "",
  ].join("\n");
  return cuerpo;
}

const REFS_QUE_NO_EXPLICAN = [
  ["main", "main"],
  ["refs/heads/main", "refs/heads/main"],
  ["un tag de version fija", "v1.3.0"],
  ["un pin a SHA de 40 hex", "0123456789abcdef0123456789abcdef01234567"],
  ["el tag movil", "v1"],
];

for (const [nombre, ref] of REFS_QUE_NO_EXPLICAN) {
  test(`(5) artefacto adelantado con una sola ref (${nombre}): ROJO, porque ninguna invocacion pudo escribirlo`, () => {
    const canonico = CANONICO_SINTETICO();
    const resultado = verificar({
      canonico,
      valores: { PROYECTO: "people-ejemplo" },
      desvios: [],
      superficies: ["claude-code"],
      hoy: new Date("2026-09-01T00:00:00Z"),
      pins: [{ ruta: `${DIR_WORKFLOWS}/ci.yml`, job: "constitucion", ref }],
      leer: (ruta) => ({ ...CADENA_SANA, ".projects/AGENTS-marco.md": artefactoAdelantado(canonico) })[ruta] ?? null,
    });
    const adelantado = resultado.hallazgos.filter((h) => h.codigo === "artefacto-adelantado");
    assert.equal(adelantado.length, 1, JSON.stringify(resultado.hallazgos));
    assert.equal(adelantado[0].nivel, "error", adelantado[0].mensaje);
    assert.equal(resultado.estado, "rojo");
  });
}

test("(5) sin NINGUNA invocacion en el arbol tambien es rojo: la ausencia de pin no es un pin", () => {
  const canonico = CANONICO_SINTETICO();
  const resultado = verificar({
    canonico,
    valores: { PROYECTO: "people-ejemplo" },
    desvios: [],
    superficies: ["claude-code"],
    hoy: new Date("2026-09-01T00:00:00Z"),
    pins: [],
    leer: (ruta) => ({ ...CADENA_SANA, ".projects/AGENTS-marco.md": artefactoAdelantado(canonico) })[ruta] ?? null,
  });
  const adelantado = resultado.hallazgos.filter((h) => h.codigo === "artefacto-adelantado");
  assert.equal(adelantado.length, 1, JSON.stringify(resultado.hallazgos));
  assert.equal(adelantado[0].nivel, "error");
});

test("(5) la causa benigna DE VERDAD sigue siendo aviso: el escritor corre con otra ref que el verificador", () => {
  const canonico = CANONICO_SINTETICO();
  const resultado = verificar({
    canonico,
    valores: { PROYECTO: "people-ejemplo" },
    desvios: [],
    superficies: ["claude-code"],
    hoy: new Date("2026-09-01T00:00:00Z"),
    pins: [
      {
        ruta: `${DIR_WORKFLOWS}/ci.yml`,
        job: "constitucion",
        ref: "0123456789abcdef0123456789abcdef01234567",
        escribe: false,
      },
      { ruta: `${DIR_WORKFLOWS}/actualizar-marco.yml`, job: "actualizar", ref: "v1", escribe: true },
    ],
    leer: (ruta) => ({ ...CADENA_SANA, ".projects/AGENTS-marco.md": artefactoAdelantado(canonico) })[ruta] ?? null,
  });
  const adelantado = resultado.hallazgos.filter((h) => h.codigo === "artefacto-adelantado");
  assert.equal(adelantado.length, 1, JSON.stringify(resultado.hallazgos));
  assert.equal(adelantado[0].nivel, "warning");
  assert.match(adelantado[0].mensaje, /ref/);
});

// ---------------------------------------------------------------------------
// (6) EL PISO NO SE SATISFACE CON RELLENO EJECUTABLE. `Bash(echo lint)` autoriza la
// misma herramienta y lleva la palabra: la ronda 2 lo declaró límite y lo dejó pasar.
// ---------------------------------------------------------------------------

test("(6) un allowlist de `Bash(echo <palabra>)` no cubre NADA del piso", () => {
  const canonico = leerCanonico(CANONICO_REAL);
  const relleno = canonico.piso_permisos.map((item) => `Bash(echo ${item.cubre})`);
  assert.deepEqual(
    revisarPiso(canonico.piso_permisos, relleno).map((item) => item.cubre),
    canonico.piso_permisos.map((item) => item.cubre),
    "seis entradas que no corren ninguna verificacion se declararon 100% cubiertas",
  );
});

test("(6) lo que decide es el PROGRAMA que la entrada autoriza, derivado de la que el marco recomienda", () => {
  const item = { nombre: "el linter", entrada: "Bash(pnpm lint)", cubre: "lint" };
  // Cuenta: mismo programa, la propiedad adentro, con los adornos del proyecto.
  assert.equal(cubreItemDelPiso("Bash(pnpm lint)", item), true);
  assert.equal(cubreItemDelPiso("Bash(pnpm --filter api lint)", item), true);
  assert.equal(cubreItemDelPiso("Bash(pnpm lint:*)", item), true);
  assert.equal(cubreItemDelPiso("Bash(FORCE_COLOR=1 pnpm lint)", item), true);
  // No cuenta: otro programa, aunque lleve la palabra y la misma herramienta.
  assert.equal(cubreItemDelPiso("Bash(echo lint)", item), false);
  assert.equal(cubreItemDelPiso("Bash(true lint)", item), false);
  assert.equal(cubreItemDelPiso("Bash(cat lint)", item), false);
  assert.equal(cubreItemDelPiso("Bash(printf lint)", item), false);
  // El item de openspec recomienda `npx`: la forma real del scaffold sigue contando.
  const openspec = {
    nombre: "la validacion estricta",
    entrada: "Bash(npx --yes @fission-ai/openspec@1.9.0 validate *)",
    cubre: "openspec",
  };
  assert.equal(cubreItemDelPiso("Bash(npx --yes @fission-ai/openspec@1.9.0 validate *)", openspec), true);
  assert.equal(cubreItemDelPiso("Bash(echo openspec)", openspec), false);
});

test("(6) el allowlist que el propio scaffold reparte sigue satisfaciendo el piso", () => {
  const canonico = leerCanonico(CANONICO_REAL);
  const allowlist = JSON.parse(readFileSync(join(RAIZ_REPO, "plantilla/.claude/settings.json"), "utf8")).permissions.allow;
  assert.deepEqual(revisarPiso(canonico.piso_permisos, allowlist).map((i) => i.cubre), []);
});

// ---------------------------------------------------------------------------
// (7) EL BLOQUEANTE ESTRUCTURAL: una action que no existe en la ref con la que se la
// nombra hace caer el job en «Set up job», antes de evaluar nada. La compuerta jamás
// se ejercitó como compuerta.
// ---------------------------------------------------------------------------

const REPO_DEL_MARCO = "im-diego-ec/Projects";

/**
 * Toda referencia a una action de ESTE repo hecha por ref remota, con el job donde vive
 * y si ese job PUEDE correr en este repo. Se parsea con el mismo lector del check —no se
 * grepea— porque lo que decide es de qué job es el paso, y eso es estructura.
 */
function referenciasPropias() {
  const rutas = spawnSync("git", ["ls-files", "--", ".github/workflows"], { cwd: RAIZ_REPO, encoding: "utf8" })
    .stdout.trim()
    .split("\n")
    .filter(Boolean)
    .filter((ruta) => ruta.split("/").length === 3);
  const encontradas = [];
  for (const ruta of rutas) {
    const doc = parsearYaml(readFileSync(join(RAIZ_REPO, ruta), "utf8"));
    for (const [clave, job] of Object.entries(doc?.jobs ?? {})) {
      for (const paso of Array.isArray(job?.steps) ? job.steps : []) {
        const m = String(paso?.uses ?? "").match(new RegExp(`^${REPO_DEL_MARCO}/([^@\\s]+)@(\\S+)`));
        if (!m) continue;
        // La particion del hallazgo 7: el carril del consumidor se apaga en el repo del
        // marco, y ese apagado es lo unico que hace legitima una ref que todavia no
        // tiene la action.
        const apagadoAca = new RegExp(`github\\.repository\\s*!=\\s*['"]${REPO_DEL_MARCO}['"]`).test(
          String(job?.if ?? ""),
        );
        encontradas.push({ ruta, job: clave, camino: m[1], ref: m[2], corre: !apagadoAca });
      }
    }
  }
  return encontradas;
}

const existeEn = (ref, camino) =>
  spawnSync("git", ["cat-file", "-e", `${ref}:${camino}/action.yml`], { cwd: RAIZ_REPO }).status === 0;

/** ¿Este clon TIENE la ref? No es lo mismo que «la ref no trae la action», y confundir
 *  las dos cosas es lo que rompio esta prueba en el CI: `actions/checkout` clona con
 *  `fetch-depth: 1` y SIN tags, asi que ahi `v1` no se resuelve y `cat-file` falla para
 *  TODO. La prueba pasaba local (donde los tags estan) y en el CI daba un rojo falso
 *  sobre `guardrail-deltas@v1`, que si esta publicada en `v1` — mientras que para las
 *  refs que de verdad hay que vigilar no medía nada, porque todas «no existian». */
const refResoluble = (ref) =>
  spawnSync("git", ["rev-parse", "--verify", "--quiet", `${ref}^{commit}`], { cwd: RAIZ_REPO }).status === 0;

test("(7) una action propia nombrada por ref remota en un job que SI corre aca existe en esa ref", () => {
  // El bug exacto: el paso vivia en `higiene`, que corre siempre, apuntando a una ref
  // que no tiene la action. GitHub resuelve y DESCARGA las actions de un job en
  // «Set up job», antes de correr un solo paso y sin mirar el if de ningun paso: eso no
  // da un paso rojo, da el job entero muerto y los otros catorce checks con el.
  const candidatas = referenciasPropias().filter((r) => r.corre);
  assert.ok(candidatas.length > 0, "no quedo ninguna referencia remota que vigilar: se borro lo que esta prueba mide");

  // EL FAIL-OPEN, DECLARADO Y RUIDOSO, como el marco exige: lo que no se puede medir se
  // dice, no se calla ni se convierte en rojo. Con los tags presentes (local, o un CI con
  // fetch-tags) la propiedad se verifica de verdad; sin ellos queda escrito que no se
  // verifico y por que, con el arreglo.
  const medibles = [];
  for (const r of candidatas) {
    if (refResoluble(r.ref)) {
      medibles.push(r);
      continue;
    }
    console.log(
      `::warning::no se pudo verificar ${r.ruta}#${r.job}: la ref "${r.ref}" no se resuelve en este clon, asi que no se puede distinguir «esa ref no trae ${r.camino}» de «este checkout no bajo la ref». NO se verifico que la action exista ahi. Arreglo: que el checkout de este job traiga los tags (fetch-tags), o correrlo en un clon completo`,
    );
  }

  const rotas = medibles.filter((r) => !existeEn(r.ref, r.camino));
  assert.deepEqual(
    rotas.map((r) => `${r.ruta}#${r.job}: ${r.camino}@${r.ref}`),
    [],
  );
});

test("(7) y la que se apaga en este repo tiene que existir en el arbol del PR, o no va a servir nunca", () => {
  // La otra mitad: apagar el job no puede volverse una excusa para dejar una referencia
  // a algo que no existe en ningun lado. Cuando el tag movil se mueva, va a apuntar a un
  // commit que contenga ESTE arbol, asi que la action tiene que estar aca.
  const apagadas = referenciasPropias().filter((r) => !r.corre);
  assert.ok(apagadas.length > 0, "no quedo ningun carril de consumidor: se borro la compuerta que hereda el consumidor");
  for (const r of apagadas) {
    assert.equal(existeEn("HEAD", r.camino), true, `${r.camino} no esta en el arbol de este PR`);
  }
});

test("(7) el CI de ESTE repo ejercita el modo cableado por ruta local, no por una ref publicada", () => {
  const ci = readFileSync(join(RAIZ_REPO, ".github/workflows/ci.yml"), "utf8");
  const invocaciones = invocacionesDe([{ ruta: `${DIR_WORKFLOWS}/ci.yml`, texto: ci, rastreado: true }], "main");
  const local = invocaciones.filter((i) => i.uses.startsWith("./"));
  assert.equal(local.length, 1, `el ci.yml del marco tiene que invocar ./actions/constitucion: ${JSON.stringify(invocaciones)}`);
  assert.equal(local[0].modo, "cableado");
  // Y la ruta que nombra tiene que existir en el arbol, o el paso muere igual.
  assert.equal(
    spawnSync("git", ["cat-file", "-e", `HEAD:${local[0].uses.replace(/^\.\//, "")}/action.yml`], { cwd: RAIZ_REPO }).status,
    0,
  );
});

test("(7) el paso CORRE de verdad: el modo cableado sobre este repo sale al dia y dice por que", () => {
  // No es «el YAML parsea»: es el comando exacto que el paso ejecuta, sobre el arbol
  // real del marco, medido por codigo de salida.
  const corrida = correrCableado(RAIZ_REPO);
  assert.equal(corrida.status, 0, corrida.stdout);
  assert.match(corrida.stdout, /distribuye el marco/);
  assert.match(corrida.stdout, /plantilla/);
});

test("(7) y el carril del consumidor sigue existiendo en el workflow reusable", () => {
  const marco = readFileSync(join(RAIZ_REPO, ".github/workflows/marco-ci.yml"), "utf8");
  assert.match(marco, /im-diego-ec\/projects\/actions\/constitucion@v1/);
  // El job del consumidor no puede correr en el propio marco: la action no esta en la
  // ref publicada todavia, y un job que no corre no descarga nada.
  assert.match(marco, /github\.repository != 'im-diego-ec\/projects'/);
  // Y el salteo no puede ser mudo: el veredicto agregado del reusable lo mira.
  assert.match(marco, /needs\.constitucion_cableada\.result/);
});
