// Banco del paso "Ejecutores de paquetes pinados" de marco-ci.yml.
//
// Corre el script COMPLETO del paso —prefiltro de git grep incluido— sobre un
// repo de juguete con una sola linea, y afirma por codigo de salida. El prefiltro
// entra en el banco a proposito: los tres ejecutores que la auditoria del
// 2026-08-20 midio en exit 0 (npm x, bun x, pnpm --silent dlx) se le escapaban
// al prefiltro Y al lector, y un banco que solo probara el lector habria dado
// verde sobre el mismo agujero.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { scriptDelPaso, RAIZ } from "./extraer.mjs";
import { repoDeJuguete, escribir, git, correrBash, limpiarTodo } from "./util.mjs";

const PASO = "Ejecutores de paquetes pinados";
const script = scriptDelPaso(PASO);

function casos() {
  const md = readFileSync(join(RAIZ, "pruebas", "marco-ci", "casos", "ejecutores.md"), "utf8");
  const bloque = md.match(/```json\n([\s\S]*?)\n```/);
  assert.ok(bloque, "casos/ejecutores.md tiene que traer un bloque ```json con los casos");
  const lista = JSON.parse(bloque[1]);
  assert.ok(lista.length > 0, "la lista de casos no puede quedar vacia");
  return lista;
}

function correrSobre(archivo, linea) {
  const raiz = repoDeJuguete("ejecutores-");
  escribir(raiz, archivo, `${linea}\n`);
  git(raiz, "add", "-A");
  return correrBash(script, { cwd: raiz });
}

test.after(limpiarTodo);

for (const caso of casos()) {
  test(`ejecutores · ${caso.origen} · ${caso.id}`, () => {
    const { exit, salida } = correrSobre(caso.archivo, caso.linea);
    assert.equal(
      exit,
      caso.exit,
      `${caso.id}: se esperaba exit ${caso.exit} y salio ${exit} (${caso.por_que}).\n${salida}`,
    );
  });
}

// El paso solo puede afirmar algo sobre lo que su prefiltro le dio de comer. Si
// un ejecutor nuevo entra en el lector y no en el prefiltro, el check sale exit 0
// diciendo "no hay nada que pinar", que es el peor verde posible: uno que afirma
// haber mirado. Este caso lo fija por codigo de salida.
test("ejecutores · el prefiltro no puede ser mas angosto que el lector", () => {
  const invisibles = casos().filter((c) => c.origen === "refutacion" && c.exit === 1);
  assert.ok(invisibles.length >= 5, "los casos de la refutacion no pueden desaparecer del banco");
  for (const caso of invisibles) {
    const { exit, salida } = correrSobre(caso.archivo, caso.linea);
    assert.equal(exit, 1, `${caso.id}: el prefiltro lo dejo pasar en verde\n${salida}`);
    assert.ok(
      !/no hay nada que pinar/.test(salida),
      `${caso.id}: el paso afirmo no tener nada que pinar sobre una linea que si trae un ejecutor`,
    );
  }
});

// El arbol de Projects tiene que quedar en verde con el alfabeto nuevo: el paso se
// aplica a si mismo (su propio bloque NOMBRA los ejecutores para explicarlos) y
// un guardrail que el marco no puede aplicarse a si mismo no le sirve a nadie.
test("ejecutores · el arbol de Projects sigue en verde con el alfabeto nuevo", () => {
  const { exit, salida } = correrBash(script, { cwd: RAIZ });
  assert.equal(exit, 0, `el propio arbol de Projects quedo rojo:\n${salida}`);
});
