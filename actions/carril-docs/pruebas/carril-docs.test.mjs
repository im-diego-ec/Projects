// Banco de pruebas del carril de docs. Corre con `node --test`, el runner que
// trae Node 22: cero dependencias, igual que el resto del marco.
//
//   node --test actions/carril-docs/pruebas/carril-docs.test.mjs
//
// POR QUE EXISTE, y por que llego ultimo. De las seis composite actions
// publicadas, esta era la unica sin banco, y no por olvido: es la unica cuya
// logica vive INLINE en el `run:` del action.yml en vez de en un `.mjs` al lado,
// asi que el paso del CI que denuncia "actions con script propio y sin pruebas"
// no la podia ver —recorre `actions/*/`, busca `*.mjs`, y sin `.mjs` sale por el
// `continue` sin contarla—. El resultado era el peor cruce posible entre
// consecuencia y cobertura: la pieza que decide si un consumidor puede saltarse
// su build y su despliegue, sin una sola asercion.
//
// COMO SE PRUEBA UN BLOQUE INLINE. No se copia: se extrae. El banco lee el
// action.yml, saca el texto EXACTO del paso y lo corre contra fixtures, igual
// que el banco de los pasos inline del workflow reusable. Una copia del script
// aca se desincronizaria en el primer arreglo y pasaria a afirmar cosas sobre un
// texto que ya no corre — que es la forma exacta en la que un banco empieza a
// mentir en verde. Por eso tambien se reusan el extractor y los helpers de
// `pruebas/marco-ci/` en vez de duplicarlos: son la misma tecnica, y esta
// carpeta no viaja al consumidor (lo que viaja es lo que `uses:` resuelve, o
// sea el action.yml y su script), asi que el import cruzado no le agrega
// dependencias a nadie.
//
// COMO SE AFIRMA, cuando TODO sale con exit 0. La action es fail-open a
// proposito: ante cualquier duda escribe `solo_docs=false` y sale 0. O sea que
// el codigo de salida no distingue un caso de otro, y grepear el log seria
// justamente la clase de asercion que el marco no acepta. El discriminante es
// otro HECHO de disco: el archivo `GITHUB_OUTPUT` que el paso escribe. Se parsea
// como el runner lo parsea —clave=valor por linea— y las aserciones se hacen
// sobre `solo_docs`, `motivo` y `total_archivos`.
//
// LO QUE ESTE BANCO NO CUBRE, declarado: no habla con la API de GitHub. `gh` se
// reemplaza por un stub en el PATH, asi que lo que queda probado es la logica de
// decision del paso —modos, ramas de fail-open, patron de rutas, conteo— y no el
// contrato de la API ni el manejo real de la paginacion. Esa mitad solo se
// puede ejercitar contra un repo real, y su evidencia es la corrida del propio
// CI del marco.
import test from "node:test";
import assert from "node:assert/strict";
import { chmodSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { scriptDelPaso } from "../../../pruebas/marco-ci/extraer.mjs";
import {
  carpetaTemporal,
  commit,
  correrBash,
  escribir,
  git,
  limpiarTodo,
  repoDeJuguete,
} from "../../../pruebas/marco-ci/util.mjs";

const ACTION = join(import.meta.dirname, "..", "action.yml");
const PASO = "Detectar si el cambio toca solo rutas neutras";
const script = scriptDelPaso(PASO, ACTION);

test.after(limpiarTodo);

// ── Lo que el banco lee del YAML en vez de copiarlo ────────────────────────

/**
 * El default de un input con bloque literal (`default: |`), leido del action.yml.
 *
 * Se lee y no se copia por el mismo motivo que el script: el default de
 * `rutas-neutras` ES el filtro que el marco trae de fabrica, asi que los casos
 * que afirman "openspec/ es neutro y src/ no" tienen que correr sobre el texto
 * publicado. Copiado aca, el dia que alguien saque `^infra/` del default el
 * banco seguiria verde sobre una lista que ya no existe.
 */
function defaultLiteralDeInput(nombre) {
  const lineas = readFileSync(ACTION, "utf8").split(/\r?\n/);
  const inicio = lineas.findIndex((l) => l.trim() === `${nombre}:`);
  if (inicio === -1) throw new Error(`el action.yml no declara ningun input "${nombre}"`);
  const marca = lineas
    .slice(inicio + 1)
    .findIndex((l) => /^\s*default: \|\s*$/.test(l) || /^\s*[a-z-]+:\s*$/.test(l));
  if (marca === -1 || !/default: \|/.test(lineas[inicio + 1 + marca])) {
    throw new Error(`el input "${nombre}" ya no declara su default como bloque literal`);
  }
  const indiceDefault = inicio + 1 + marca;
  const sangria = lineas[indiceDefault].length - lineas[indiceDefault].trimStart().length;
  const cuerpo = [];
  for (let i = indiceDefault + 1; i < lineas.length; i += 1) {
    if (lineas[i].trim() === "") break;
    const propia = lineas[i].length - lineas[i].trimStart().length;
    if (propia <= sangria) break;
    cuerpo.push(lineas[i].trim());
  }
  if (cuerpo.length === 0) throw new Error(`el default de "${nombre}" quedo vacio`);
  return `${cuerpo.join("\n")}\n`;
}

const RUTAS_NEUTRAS = defaultLiteralDeInput("rutas-neutras");

/**
 * Los motivos de fail-open que el script declara, en su forma ESTATICA: cada
 * literal cortado en su primera interpolacion. Es lo que permite exigir, al
 * final del archivo, que el banco haya ejercitado todas las ramas — incluida la
 * que alguien agregue manana sin acordarse de este banco.
 */
function motivosDeclarados() {
  const salida = [];
  for (const linea of script.split("\n")) {
    const marca = linea.match(/fail_open "([^"]*)"/);
    if (!marca) continue;
    const estatico = marca[1].split(/\$\{|\$[0-9]/)[0];
    if (estatico.trim() === "") {
      throw new Error(`el fail_open de la linea "${linea.trim()}" arranca con una interpolacion: no tiene prefijo estable que este banco pueda exigir`);
    }
    salida.push(estatico);
  }
  return salida;
}

const DECLARADOS = motivosDeclarados();
const ejercitados = new Set();

// ── El arnes ───────────────────────────────────────────────────────────────

/** Un `gh` de juguete, primero en el PATH. Devuelve la carpeta bin. */
function stubGh(cuerpo) {
  const bin = carpetaTemporal("bin-gh-");
  const ruta = join(bin, "gh");
  writeFileSync(ruta, `#!/bin/sh\n${cuerpo}\n`);
  chmodSync(ruta, 0o755);
  return bin;
}

/** Un `gh` que responde con estas rutas, una por linea, y sale 0. */
function ghQueLista(rutas) {
  const texto = rutas.join("\n");
  return stubGh(`printf '%s' "${texto ? `${texto}\n` : ""}"\nexit 0`);
}

function correrPaso({ env = {}, cwd, bin } = {}) {
  const artefactos = carpetaTemporal("carril-docs-");
  const salidaGithub = join(artefactos, "output.txt");
  const resumen = join(artefactos, "summary.md");
  writeFileSync(salidaGithub, "");
  writeFileSync(resumen, "");
  const resultado = correrBash(script, {
    cwd: cwd ?? artefactos,
    env: {
      PATH: bin ? `${bin}${process.platform === "win32" ? ";" : ":"}${process.env.PATH}` : process.env.PATH,
      GITHUB_OUTPUT: salidaGithub,
      GITHUB_STEP_SUMMARY: resumen,
      GITHUB_REPOSITORY: "una-organizacion/un-repo",
      GITHUB_SHA: "",
      GH_TOKEN: "token-de-juguete",
      RUTAS_NEUTRAS,
      MODO_IN: "auto",
      PR_IN: "",
      SHA_IN: "",
      BASE_IN: "",
      EVENTO: "pull_request",
      PR_EVENTO: "",
      SHA_WORKFLOW_RUN: "",
      ANTES_PUSH: "",
      ...env,
    },
  });
  const outputs = {};
  for (const linea of readFileSync(salidaGithub, "utf8").split(/\r?\n/)) {
    const corte = linea.indexOf("=");
    if (corte === -1) continue;
    outputs[linea.slice(0, corte)] = linea.slice(corte + 1);
  }
  return { ...resultado, outputs, resumen: readFileSync(resumen, "utf8") };
}

/**
 * Afirma un fail-open: exit 0 (nunca rompe el job del consumidor), solo_docs en
 * false (se corre todo), total_archivos en 0 y el motivo que corresponde. El
 * motivo se registra para el caso final, que exige que ninguna rama quede sin
 * ejercitar.
 */
function afirmarFailOpen(resultado, prefijo) {
  ejercitados.add(prefijo);
  assert.equal(resultado.exit, 0, `un fail-open nunca rompe el job:\n${resultado.salida}`);
  assert.equal(resultado.outputs.solo_docs, "false", resultado.salida);
  assert.equal(resultado.outputs.total_archivos, "0", resultado.salida);
  assert.ok(
    resultado.outputs.motivo?.startsWith(`fail-open: ${prefijo}`),
    `el motivo publicado fue "${resultado.outputs.motivo}" y se esperaba uno que empiece con "fail-open: ${prefijo}"`,
  );
}

// ── Las once ramas de fail-open ────────────────────────────────────────────

test("carril-docs · una lista de rutas neutras sin un solo patron util es fail-open", () => {
  const resultado = correrPaso({ env: { RUTAS_NEUTRAS: "# todo comentario\n\n   \n" } });
  afirmarFailOpen(resultado, "la lista de rutas neutras quedo vacia");
});

test("carril-docs · modo auto sobre un evento que no sabe leer es fail-open", () => {
  const resultado = correrPaso({ env: { EVENTO: "schedule" } });
  afirmarFailOpen(resultado, "evento '");
});

test("carril-docs · si la API no lista los archivos del PR, es fail-open y nombra el permiso", () => {
  const resultado = correrPaso({
    env: { MODO_IN: "pr", PR_IN: "7" },
    bin: stubGh("exit 1"),
  });
  afirmarFailOpen(resultado, "no se pudieron listar los archivos del PR #");
  assert.match(
    resultado.outputs.motivo,
    /pull-requests: read/,
    "el motivo tiene que nombrar el permiso: un 403 tapado por el fail-open es exactamente como esta deteccion estuvo muerta semanas sin que nadie lo viera",
  );
});

test("carril-docs · modo pr sin numero de PR es fail-open", () => {
  const resultado = correrPaso({ env: { MODO_IN: "pr", EVENTO: "workflow_dispatch" } });
  afirmarFailOpen(resultado, "modo pr sin numero de PR (evento '");
});

test("carril-docs · modo sha sin ningun commit que inspeccionar es fail-open", () => {
  const resultado = correrPaso({ env: { MODO_IN: "sha" } });
  afirmarFailOpen(resultado, "modo sha sin commit que inspeccionar");
});

test("carril-docs · un commit sin PR asociado es fail-open", () => {
  const resultado = correrPaso({
    env: { MODO_IN: "sha", SHA_IN: "a".repeat(40) },
    bin: stubGh("exit 0"),
  });
  afirmarFailOpen(resultado, "sin PR asociado al commit ");
});

test("carril-docs · un push sin commit anterior es fail-open, con el SHA vacio y con el de ceros", () => {
  for (const antes of ["", "0".repeat(40)]) {
    const resultado = correrPaso({ env: { MODO_IN: "push", ANTES_PUSH: antes } });
    afirmarFailOpen(resultado, "push sin commit anterior (rama nueva o historial reescrito)");
  }
});

test("carril-docs · un commit anterior que no esta en el clon es fail-open y manda a fetch-depth", () => {
  const raiz = repoDeJuguete("carril-push-");
  escribir(raiz, "README.md", "hola\n");
  const cabeza = commit(raiz, "inicial");
  const resultado = correrPaso({
    cwd: raiz,
    env: { MODO_IN: "push", BASE_IN: "b".repeat(40), SHA_IN: cabeza },
  });
  afirmarFailOpen(resultado, "el commit anterior ");
  assert.match(
    resultado.outputs.motivo,
    /fetch-depth: 0/,
    "el motivo tiene que traer el arreglo, que es lo unico que distingue este caso de un bug",
  );
});

test("carril-docs · un git diff que falla es fail-open", () => {
  const raiz = repoDeJuguete("carril-diff-");
  escribir(raiz, "README.md", "hola\n");
  const base = commit(raiz, "inicial");
  const resultado = correrPaso({
    cwd: raiz,
    env: { MODO_IN: "push", BASE_IN: base, SHA_IN: "c".repeat(40) },
  });
  afirmarFailOpen(resultado, "git diff ");
});

test("carril-docs · un modo que no existe es fail-open y enumera los que si", () => {
  const resultado = correrPaso({ env: { MODO_IN: "por-las-dudas" } });
  afirmarFailOpen(resultado, "modo '");
  assert.match(resultado.outputs.motivo, /usa auto, pr, sha o push/);
});

test("carril-docs · un cambio que no lista ningun archivo es fail-open", () => {
  const resultado = correrPaso({
    env: { MODO_IN: "pr", PR_IN: "9" },
    bin: ghQueLista([]),
  });
  afirmarFailOpen(resultado, "el cambio no listo ningun archivo (");
});

// ── El case de MODO, por sus cuatro ramas ──────────────────────────────────

test("carril-docs · modo auto lee pr de un pull_request", () => {
  const resultado = correrPaso({
    env: { EVENTO: "pull_request", PR_EVENTO: "12" },
    bin: ghQueLista(["docs/guia.md"]),
  });
  assert.equal(resultado.exit, 0, resultado.salida);
  assert.equal(resultado.outputs.solo_docs, "true", resultado.salida);
  assert.match(resultado.outputs.motivo, /PR #12/);
});

test("carril-docs · modo auto lee sha de un workflow_run, resolviendo el PR del commit", () => {
  // El primer `gh api` resuelve el PR del commit y el segundo lista sus
  // archivos: el stub responde por la forma de la ruta que le llega.
  const bin = stubGh(
    [
      'case "$*" in',
      "  */files*) printf '%s\\n' openspec/changes/x/proposal.md ;;",
      "  */pulls*) printf '%s\\n' 31 ;;",
      "  *) exit 1 ;;",
      "esac",
    ].join("\n"),
  );
  const resultado = correrPaso({
    env: { EVENTO: "workflow_run", SHA_WORKFLOW_RUN: "d".repeat(40) },
    bin,
  });
  assert.equal(resultado.exit, 0, resultado.salida);
  assert.equal(resultado.outputs.solo_docs, "true", resultado.salida);
  assert.match(resultado.outputs.motivo, /PR #31 \(commit dddddddddddd\)/);
});

test("carril-docs · modo auto lee push de un push, y compara contra el commit anterior", () => {
  const raiz = repoDeJuguete("carril-auto-push-");
  escribir(raiz, "README.md", "hola\n");
  const base = commit(raiz, "inicial");
  escribir(raiz, "docs/nota.md", "una nota\n");
  const cabeza = commit(raiz, "solo docs");
  const resultado = correrPaso({
    cwd: raiz,
    env: { EVENTO: "push", ANTES_PUSH: base, SHA_IN: cabeza },
  });
  assert.equal(resultado.exit, 0, resultado.salida);
  assert.equal(resultado.outputs.solo_docs, "true", resultado.salida);
  assert.equal(resultado.outputs.total_archivos, "1", resultado.salida);
});

test("carril-docs · un numero de PR explicito gana sobre el evento, sea cual sea", () => {
  // La rama `if [ -n "$PR_IN" ]` del modo auto: sin ella, un dispatch con el PR
  // dado a mano caeria en "evento no soportado".
  const resultado = correrPaso({
    env: { EVENTO: "workflow_dispatch", PR_IN: "44" },
    bin: ghQueLista(["src/app.ts"]),
  });
  assert.equal(resultado.exit, 0, resultado.salida);
  assert.equal(resultado.outputs.solo_docs, "false", resultado.salida);
  assert.match(resultado.outputs.motivo, /PR #44/);
});

// ── La decision, sobre el filtro que el marco publica ───────────────────────

test("carril-docs · un solo archivo fuera de las rutas neutras alcanza para que sea codigo", () => {
  const resultado = correrPaso({
    env: { MODO_IN: "pr", PR_IN: "5" },
    bin: ghQueLista(["docs/a.md", "openspec/specs/x/spec.md", "src/servidor.ts"]),
  });
  assert.equal(resultado.exit, 0, resultado.salida);
  assert.equal(resultado.outputs.solo_docs, "false", resultado.salida);
  assert.equal(resultado.outputs.total_archivos, "3", resultado.salida);
  assert.match(resultado.outputs.motivo, /hay archivos fuera de las rutas neutras/);
});

test("carril-docs · el default publicado cubre openspec, md, docs, .github e infra", () => {
  const neutras = [
    "openspec/changes/algo/proposal.md",
    "CHANGELOG.md",
    "docs/adr/001.txt",
    ".github/workflows/ci.yml",
    "infra/main.tf",
    "infra-prod/main.tf",
  ];
  const resultado = correrPaso({
    env: { MODO_IN: "pr", PR_IN: "6" },
    bin: ghQueLista(neutras),
  });
  assert.equal(resultado.outputs.solo_docs, "true", resultado.salida);
  assert.equal(resultado.outputs.total_archivos, String(neutras.length), resultado.salida);
});

test("carril-docs · los comentarios y las lineas en blanco de rutas-neutras no son patrones", () => {
  // Sin el filtro, la linea en blanco se une al patron como alternativa vacia y
  // ese patron calza con TODO: el carril rapido se tomaria siempre, que es el
  // unico modo de falla de esta action que no se ve.
  const resultado = correrPaso({
    env: {
      MODO_IN: "pr",
      PR_IN: "8",
      RUTAS_NEUTRAS: "# un comentario\n\n^docs/\n   \n",
    },
    bin: ghQueLista(["src/app.ts"]),
  });
  assert.equal(resultado.outputs.solo_docs, "false", resultado.salida);
});

test("carril-docs · el ultimo archivo cuenta aunque el listado no termine en salto de linea", () => {
  // El paso usa `grep -c ''` y no `wc -l` justamente por esto. Con wc el total
  // saldria uno menos, y el total es lo que el consumidor ve en el resumen.
  // printf interpreta los escapes de su FORMATO, asi que el listado va ahi:
  // el stub entrega dos rutas y NINGUN salto de linea al final.
  const bin = stubGh("printf 'docs/a.md\\ndocs/b.md'\nexit 0");
  const resultado = correrPaso({ env: { MODO_IN: "pr", PR_IN: "10" }, bin });
  assert.equal(resultado.outputs.total_archivos, "2", resultado.salida);
});

test("carril-docs · el listado queda en disco y el output apunta a el", () => {
  const resultado = correrPaso({
    env: { MODO_IN: "pr", PR_IN: "11" },
    bin: ghQueLista(["docs/a.md", "docs/b.md"]),
  });
  assert.equal(
    readFileSync(resultado.outputs.archivos, "utf8"),
    "docs/a.md\ndocs/b.md\n",
    "el output `archivos` es la unica forma que tiene el consumidor de ver QUE se evaluo",
  );
});

test("carril-docs · el resumen del run dice el veredicto, el motivo y el total", () => {
  const resultado = correrPaso({
    env: { MODO_IN: "pr", PR_IN: "13" },
    bin: ghQueLista(["docs/a.md"]),
  });
  assert.match(resultado.resumen, /### Carril de docs/);
  assert.match(resultado.resumen, /`solo_docs`: \*\*true\*\*/);
  assert.match(resultado.resumen, /Archivos evaluados: 1/);
});

test("carril-docs · un renombre dentro de las rutas neutras sigue siendo carril rapido", () => {
  const raiz = repoDeJuguete("carril-renombre-");
  escribir(raiz, "docs/viejo.md", "texto\n");
  const base = commit(raiz, "inicial");
  git(raiz, "mv", "docs/viejo.md", "docs/nuevo.md");
  const cabeza = commit(raiz, "renombre");
  const resultado = correrPaso({
    cwd: raiz,
    env: { MODO_IN: "push", BASE_IN: base, SHA_IN: cabeza },
  });
  assert.equal(resultado.outputs.solo_docs, "true", resultado.salida);
  // Un renombre detectado como tal es UN archivo para `git diff --name-only`
  // (el destino), no dos. Se afirma el numero medido y no el intuitivo: el
  // total es lo que el consumidor lee en el resumen del run.
  assert.equal(resultado.outputs.total_archivos, "1", resultado.salida);
});

test("carril-docs · un archivo que sale de docs hacia el codigo NO es carril rapido", () => {
  const raiz = repoDeJuguete("carril-renombre-fuera-");
  escribir(raiz, "docs/util.md", "texto\n");
  const base = commit(raiz, "inicial");
  git(raiz, "mv", "docs/util.md", "util.ts");
  const cabeza = commit(raiz, "de docs a codigo");
  const resultado = correrPaso({
    cwd: raiz,
    env: { MODO_IN: "push", BASE_IN: base, SHA_IN: cabeza },
  });
  assert.equal(resultado.outputs.solo_docs, "false", resultado.salida);
});

// ── Lo que evita que todo lo de arriba pase vacuamente ─────────────────────

test("carril-docs · el banco ejercita TODAS las ramas de fail-open que el script declara", () => {
  assert.ok(
    DECLARADOS.length >= 11,
    `el script declara ${DECLARADOS.length} ramas de fail-open y se esperaban al menos 11: si bajaron, alguien saco una rama y hay que decidir si el caso desaparecio o si quedo sin cubrir`,
  );
  const sinCubrir = DECLARADOS.filter((prefijo) => !ejercitados.has(prefijo));
  assert.deepEqual(
    sinCubrir,
    [],
    `estas ramas de fail-open del action.yml no las ejercita ningun caso de este banco: ${sinCubrir.map((p) => JSON.stringify(p)).join(", ")}. Son decisiones de saltear —o no— el build y el despliegue de un consumidor, asi que ninguna puede llegar publicada sin un caso que la corra`,
  );
});
