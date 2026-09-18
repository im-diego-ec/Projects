// Banco de la guarda del carril del porte: lo que el porte apaga no llega apagado a main.
//
//   node --test pruebas/ci-del-marco/carril-del-porte.test.mjs
//
// QUE CIERRA (revision adversarial del porte, FO-H3, 2026-09-17). El caso «el preambulo
// del CHANGELOG dice la misma regla» de que-es-breaking.test.mjs se marcaba `todo`
// mientras existiera `.porte/10-que-es-breaking.patch`, y un `todo` que falla no cambia
// el codigo de salida de `node --test`. El interruptor era la PRESENCIA de un archivo,
// no que el parche se hubiera aplicado, y nada impedia que `.porte/` llegara a main: la
// integracion podia aplicar 08 y no 10, dejar la carpeta, y el check quedaba apagado para
// siempre con un «⚠ todo» en el log. El comentario decia «la integracion lo borra»: un
// guardrail que dependia de que alguien se acordara.
//
// LAS DOS MITADES, y cada una se pone roja sola:
//
//  1. `.porte/` NO LLEGA A MAIN. Un PR cuya base es main, o un push a main, con la
//     carpeta en el arbol es rojo aca. La carpeta es maquinaria de los carriles del
//     porte —parches y fragmentos que la integracion funde— y en main no tiene dueno.
//  2. LO QUE EL PORTE APLAZA SE ENCIENDE SOLO CAMINO A MAIN. `pendienteDelPorte` es el
//     unico interruptor que un caso puede usar para quedar `todo`, y contesta «no» en
//     cuanto la corrida va a main, exista o no el archivo que lo aplaza.
//
// COMO SABE A DONDE VA LA CORRIDA: por las variables que GitHub Actions pone en todo
// paso — `GITHUB_BASE_REF` (la base de un pull request) y `GITHUB_REF` (la rama de un
// push). Corrido a mano no hay ninguna, y el carril se comporta como carril: es lo que
// permite que la rama del porte, donde el CHANGELOG no se edita, siga verde.

import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join } from "node:path";

import { CARPETA_DEL_PORTE, destinoEsMain, pendienteDelPorte, porteQueLlegaAMain } from "./carril-del-porte.mjs";

const RAIZ = join(import.meta.dirname, "..", "..");

test("ROJO PRIMERO: .porte/ en un PR a main, o en un push a main, es un hallazgo con el arreglo", () => {
  for (const env of [{ GITHUB_BASE_REF: "main" }, { GITHUB_REF: "refs/heads/main" }]) {
    const hallazgo = porteQueLlegaAMain(true, env);
    assert.ok(hallazgo, `con ${JSON.stringify(env)} la carpeta del porte tiene que ser roja`);
    assert.match(hallazgo, /Arreglo:/);
  }
});

test("CONTRAPESO: en la rama del porte, en un PR entre carriles o corrido a mano, .porte/ es legitimo", () => {
  for (const env of [{}, { GITHUB_BASE_REF: "feat/porte-rigel-2-8" }, { GITHUB_REF: "refs/heads/porte/w1-L4-aviso" }]) {
    assert.equal(porteQueLlegaAMain(true, env), null, JSON.stringify(env));
  }
  assert.equal(porteQueLlegaAMain(false, { GITHUB_BASE_REF: "main" }), null, "sin la carpeta no hay nada que decir");
});

test("ROJO PRIMERO: un caso aplazado por el porte deja de estar aplazado camino a main, aunque el archivo siga", () => {
  // Se usa un archivo que EXISTE en cualquier arbol del marco, para que el caso no
  // dependa de que `.porte/` este o no: lo que se prueba es el interruptor.
  assert.equal(pendienteDelPorte(RAIZ, "AGENTS.md", {}), true, "en el carril, un archivo que aplaza aplaza");
  assert.equal(pendienteDelPorte(RAIZ, "AGENTS.md", { GITHUB_BASE_REF: "main" }), false, "en un PR a main no aplaza nada");
  assert.equal(pendienteDelPorte(RAIZ, "AGENTS.md", { GITHUB_REF: "refs/heads/main" }), false, "en main no aplaza nada");
  assert.equal(pendienteDelPorte(RAIZ, "no-existe-este-archivo.patch", {}), false, "sin el archivo no hay nada pendiente");
});

test("destinoEsMain lee la base del PR y la rama del push, y nada mas", () => {
  assert.equal(destinoEsMain({ GITHUB_BASE_REF: "main" }), true);
  assert.equal(destinoEsMain({ GITHUB_REF: "refs/heads/main" }), true);
  assert.equal(destinoEsMain({ GITHUB_BASE_REF: "", GITHUB_REF: "refs/pull/12/merge" }), false);
  assert.equal(destinoEsMain({ GITHUB_REF: "refs/heads/mainline" }), false, "una rama que empieza con main no es main");
});

test("la maquinaria del porte no esta en un arbol que va a main", () => {
  const hallazgo = porteQueLlegaAMain(existsSync(join(RAIZ, CARPETA_DEL_PORTE)), process.env);
  assert.equal(hallazgo, null, hallazgo ?? "");
});
