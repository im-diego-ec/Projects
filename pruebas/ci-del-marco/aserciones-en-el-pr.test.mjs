// BANCO DEL PASO «Las aserciones que este PR toca no tapan su evidencia» (job
// `aserciones-con-evidencia` de .github/workflows/ci.yml).
//
// La herramienta que el paso invoca tiene su banco propio
// (pruebas/banco/aserciones-con-evidencia.test.mjs). Esto prueba lo que la herramienta no ve:
// QUE LISTA LE PASA EL PASO. Un paso que le pasara la lista equivocada —vacia por un diff que
// fallo, o con bancos que el PR no toco— daria un verde o un rojo que no son del PR, y la
// herramienta no tendria como saberlo.
//
// El script se EXTRAE del YAML con el extractor de siempre y se corre sobre repositorios de
// juguete con historia de verdad (base, rama, main que avanza), igual que el banco del
// CHANGELOG. La herramienta se copia al repo de juguete porque el paso la invoca por ruta
// relativa, como en el runner.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { scriptDelPaso, RAIZ } from "../marco-ci/extraer.mjs";
import { repoDeJuguete, escribir, git, commit, correrBash, limpiarTodo } from "../marco-ci/util.mjs";
import { porque } from "../porque.mjs";

const CI = path.join(RAIZ, ".github", "workflows", "ci.yml");
const PASO = "Las aserciones que este PR toca no tapan su evidencia";
const script = scriptDelPaso(PASO, CI);

const HERRAMIENTA = "pruebas/aserciones-con-evidencia.mjs";
const CIEGA = 'import assert from "node:assert/strict";\nassert.match("a", /a/, "ciega");\n';
const LIMPIA = 'import assert from "node:assert/strict";\nassert.match("a", /a/);\n';

test.after(limpiarTodo);

/** Un repo con la herramienta en su lugar y un commit base en main. */
function repoBase(archivos = {}) {
  const raiz = repoDeJuguete("aserciones-pr-");
  escribir(raiz, HERRAMIENTA, fs.readFileSync(path.join(RAIZ, HERRAMIENTA), "utf8"));
  escribir(raiz, "README.md", "base\n");
  for (const [rel, contenido] of Object.entries(archivos)) escribir(raiz, rel, contenido);
  const base = commit(raiz, "base");
  return { raiz, base };
}

/** Una rama del PR que sale de `desde` y escribe `archivos`. Devuelve su cabeza. */
function ramaDelPr(raiz, desde, archivos, borrar = []) {
  git(raiz, "checkout", "--quiet", "-b", "pr", desde);
  for (const [rel, contenido] of Object.entries(archivos)) escribir(raiz, rel, contenido);
  for (const rel of borrar) fs.rmSync(path.join(raiz, rel));
  return commit(raiz, "cambio del PR");
}

const correr = (raiz, base, cabeza, guion = script) =>
  correrBash(guion, { cwd: raiz, env: { BASE: base, CABEZA: cabeza } });

test("el extractor encontro el paso, y el paso invoca la herramienta", () => {
  assert.ok(script.length > 300, `el script salio de ${script.length} caracteres: el extractor fallo`);
  assert.ok(script.includes(HERRAMIENTA), porque("el paso no invoca la herramienta por su ruta", script));
});

test("un PR que agrega una asercion ciega en un banco es ROJO, con archivo y linea", () => {
  const { raiz, base } = repoBase();
  const cabeza = ramaDelPr(raiz, base, { "pruebas/x/nuevo.test.mjs": CIEGA });
  const { exit, salida } = correr(raiz, base, cabeza);
  assert.equal(exit, 1, porque("una asercion ciega nueva paso", salida));
  assert.match(salida, /::error file=pruebas\/x\/nuevo\.test\.mjs,line=2::/, salida);
});

test("un PR que toca un banco LIMPIO es verde, aunque el arbol tenga deuda en otro", () => {
  const { raiz, base } = repoBase({ "pruebas/x/viejo.test.mjs": CIEGA });
  const cabeza = ramaDelPr(raiz, base, { "pruebas/x/nuevo.test.mjs": LIMPIA });
  const { exit, salida } = correr(raiz, base, cabeza);
  assert.equal(exit, 0, porque("la deuda de un banco NO tocado puso rojo", salida));
});

test("un PR que TOCA un banco con deuda vieja lo tiene que dejar limpio ENTERO", () => {
  // Es la mitad de la decision que mas facil se discute, y por eso tiene caso: el banco que se
  // toca se paga completo, no solo en las lineas nuevas. Asi la deuda baja por area.
  const { raiz, base } = repoBase({ "pruebas/x/viejo.test.mjs": CIEGA });
  const cabeza = ramaDelPr(raiz, base, { "pruebas/x/viejo.test.mjs": `${CIEGA}// un cambio cualquiera\n` });
  const { exit, salida } = correr(raiz, base, cabeza);
  assert.equal(exit, 1, porque("tocar un banco con deuda no la exigio", salida));
});

test("un PR que no toca ningun banco es verde y lo DICE", () => {
  const { raiz, base } = repoBase({ "pruebas/x/viejo.test.mjs": CIEGA });
  const cabeza = ramaDelPr(raiz, base, { "docs/algo.md": "prosa\n" });
  const { exit, salida } = correr(raiz, base, cabeza);
  assert.equal(exit, 0, porque("un PR sin bancos puso rojo", salida));
  assert.match(salida, /::notice::este PR no toca ningun banco/, salida);
});

test("un PR que BORRA un banco con deuda es verde: lo borrado no se juzga", () => {
  const { raiz, base } = repoBase({ "pruebas/x/viejo.test.mjs": CIEGA });
  const cabeza = ramaDelPr(raiz, base, {}, ["pruebas/x/viejo.test.mjs"]);
  const { exit, salida } = correr(raiz, base, cabeza);
  assert.equal(exit, 0, porque("un banco borrado se juzgo igual", salida));
});

test("un banco que cambio en main DESPUES de abrir el PR no es del PR (tres puntos)", () => {
  // `pull_request.base.sha` es la punta de main cuando el PR se actualizo, no la base comun. Si
  // main cambio un banco despues de que el PR se abrio, un diff de DOS puntos lo cuenta como
  // tocado por este PR aunque el PR no lo haya abierto nunca.
  //
  // El arbol de trabajo se arma como lo arma el runner en un `pull_request`: el commit de MERGE
  // del PR sobre main (refs/pull/N/merge), que tiene las dos historias. La herramienta lee los
  // bancos de ahi.
  const { raiz, base } = repoBase({ "pruebas/x/de-main.test.mjs": LIMPIA });
  const cabeza = ramaDelPr(raiz, base, { "pruebas/x/del-pr.test.mjs": LIMPIA });
  git(raiz, "checkout", "--quiet", "main");
  escribir(raiz, "pruebas/x/de-main.test.mjs", CIEGA);
  const mainNuevo = commit(raiz, "main avanza y ensucia un banco que el PR no toca");
  git(raiz, "checkout", "--quiet", "--detach", cabeza);
  git(raiz, "merge", "--quiet", "--no-edit", "--no-gpg-sign", mainNuevo);

  const { exit, salida } = correr(raiz, mainNuevo, cabeza);
  assert.equal(exit, 0, porque("el rojo cayo sobre un banco que el PR no toco", salida));

  // MUERDE: con dos puntos, el mismo caso se pone rojo por deuda ajena.
  assert.ok(script.includes('"${BASE}...${CABEZA}"'), porque("el ancla de la mutacion ya no esta", script));
  const mutado = script.replace('"${BASE}...${CABEZA}"', '"${BASE}" "${CABEZA}"');
  const conDosPuntos = correr(raiz, mainNuevo, cabeza, mutado);
  assert.equal(conDosPuntos.exit, 1, porque("con dos puntos tenia que contar el banco de main", conDosPuntos.salida));
});

test("sin la base en el clon es ROJO y manda a fetch-depth, no un verde sin medir", () => {
  const { raiz, base } = repoBase();
  const cabeza = ramaDelPr(raiz, base, { "pruebas/x/nuevo.test.mjs": LIMPIA });
  const { exit, salida } = correr(raiz, "0".repeat(40), cabeza);
  assert.equal(exit, 1, porque("una base inexistente se declaro verde", salida));
  assert.match(salida, /fetch-depth: 0/, salida);
});
