// Banco de las dos guardas de "no pude mirar" del job higiene de marco-ci.yml.
//
// POR QUE EXISTE, y por que llega despues del arreglo. Dos pasos de higiene
// —"Artefactos regenerados al dia" y "Sin marcadores del scaffold sin resolver"—
// afirmaban una AUSENCIA (no hay artefactos desactualizados / no quedan marcadores)
// sobre una lista de archivos que podia estar vacia por no haberse podido leer. El
// disparo no es teorico: `git ls-files` sale 128 fuera de un arbol git, y un checkout
// parcial, un submodulo o un runner propio con el workspace fuera del arbol dan
// exactamente eso. El paso salia exit 0 diciendo "nada que verificar" y "sin
// marcadores del scaffold pendientes" sin haber leido un solo archivo: un verde
// AFIRMATIVO sobre cero lecturas, que es la clase que este marco existe para no ser.
//
// Las guardas se escribieron y quedaron SIN BANCO —`grep -rn 'ls-files|rc=128' pruebas/`
// daba cero lineas—, o sea que la regresion que se acababa de cerrar no tenia nada que
// la vigilara. Eso es lo que cierra este archivo, y por eso cada caso viene con su
// MUTACION: se rompe la guarda sobre una copia del script y se comprueba que el verde
// mudo vuelve. Sin la mutacion, un caso verde no distingue "la guarda actua" de "el
// caso no la ejercita".
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { scriptDelPaso } from "./extraer.mjs";
import { repoDeJuguete, escribir, commit, correrBash, limpiarTodo } from "./util.mjs";

const ARTEFACTOS = "Artefactos regenerados al dia";
const MARCADORES = "Sin marcadores del scaffold sin resolver";

const scriptArtefactos = scriptDelPaso(ARTEFACTOS);
const scriptMarcadores = scriptDelPaso(MARCADORES);

// FUERA DE UN ARBOL GIT. Es la forma mas barata y deterministica de reproducir el
// rc=128 de `git ls-files` sin depender de permisos, que en Windows no se comportan
// igual. El directorio se crea con mkdtemp directamente en el tmpdir del sistema: si
// se creara dentro del repo, estaria adentro de un arbol git y el caso no existiria.
function fueraDeGit() {
  return mkdtempSync(join(tmpdir(), "fuera-de-git-"));
}

test.after(limpiarTodo);

// ── "Artefactos regenerados al dia" ────────────────────────────────────────
test("artefactos · fuera de un arbol git es ROJO, no 'nada que verificar'", () => {
  const { exit, salida } = correrBash(scriptArtefactos, {
    cwd: fueraDeGit(),
    env: { PIN: "1.9.0" },
  });
  assert.equal(
    exit,
    1,
    `sin poder listar los archivos el paso no puede declarar que los artefactos esten al dia:\n${salida}`,
  );
  // El mensaje se mira aca a proposito y se dice por que: el codigo de salida solo
  // dice "rojo", y este paso tiene DOS rojos posibles con arreglos distintos
  // (artefactos divergentes vs. no pude mirar). Si el rojo llegara con el mensaje del
  // otro, mandaria a regenerar artefactos a alguien que tiene roto el checkout.
  assert.match(salida, /git ls-files rc=128/, `el rojo no nombra su causa:\n${salida}`);
});

test("artefactos · MUTACION · sin la guarda del rc vuelve el verde afirmativo sobre cero archivos", () => {
  // Se rompe la condicion en una COPIA del script, exactamente donde vive la guarda:
  // el codigo de salida de `git ls-files` se fuerza a 0. Es la forma que tenia el paso
  // antes del arreglo, cuando la asignacion terminaba en `|| true`.
  // El script llega DEDENTADO, tal cual lo recibe el runner: el ancla no lleva la
  // sangria del YAML.
  const ancla = "RC=$?\nset -e\nif [ \"${RC}\" -ne 0 ]; then";
  assert.ok(scriptArtefactos.includes(ancla), "el ancla de la mutacion ya no esta en el paso");
  const mutado = scriptArtefactos.replace(
    ancla,
    "RC=0\nset -e\nif [ \"${RC}\" -ne 0 ]; then",
  );
  assert.notEqual(mutado, scriptArtefactos, "la mutacion no cambio nada");

  const { exit, salida } = correrBash(mutado, { cwd: fueraDeGit(), env: { PIN: "1.9.0" } });
  assert.equal(
    exit,
    0,
    "con la guarda rota el paso tendria que volver a salir VERDE sobre cero archivos leidos: " +
      `si no lo hace, no era la guarda lo que producia el rojo de arriba.\n${salida}`,
  );
  assert.match(
    salida,
    /nada que verificar/,
    `la mutacion tiene que reproducir el verde afirmativo exacto:\n${salida}`,
  );
});

// Control: el mismo paso, en un repo git sano sin artefactos, SI sale verde. Sin este
// caso, "rojo fuera de git" podria estar pasando porque el paso es rojo siempre.
test("artefactos · control · repo git sano sin artefactos: verde con ::notice::", () => {
  const raiz = repoDeJuguete("artefactos-sano-");
  escribir(raiz, "README.md", "un repo\n");
  commit(raiz, "estado inicial");
  const { exit, salida } = correrBash(scriptArtefactos, { cwd: raiz, env: { PIN: "1.9.0" } });
  assert.equal(exit, 0, salida);
  assert.match(salida, /::notice::/, `el verde tiene que decir que git listo y no habia nada:\n${salida}`);
});

// ── "Sin marcadores del scaffold sin resolver" ─────────────────────────────
test("marcadores · fuera de un arbol git es ROJO, no 'sin marcadores pendientes'", () => {
  const { exit, salida } = correrBash(scriptMarcadores, { cwd: fueraDeGit() });
  assert.equal(
    exit,
    1,
    `sin inspeccionar nada, la AUSENCIA de marcadores no se puede afirmar:\n${salida}`,
  );
  assert.match(salida, /git ls-files rc=128/, `el rojo no nombra su causa:\n${salida}`);
});

test("marcadores · MUTACION · sin la guarda del rc vuelve el 'sin marcadores' sobre cero lecturas", () => {
  // El agujero original era este: el `2>>` capturaba el stderr de GREP, no el de
  // `git ls-files`, y el `|| true` del final desactivaba el pipefail. Con git fallando,
  // xargs no recibia un byte y el paso imprimia el verde. La mutacion lo reconstruye
  // desactivando las dos guardas que se agregaron para cerrarlo.
  let mutado = scriptMarcadores;
  for (const ancla of ['if [ "${RC}" -ne 0 ]; then', 'if [ ! -s "${LISTA}" ]; then']) {
    assert.ok(mutado.includes(ancla), `el ancla "${ancla}" ya no esta en el paso`);
    mutado = mutado.replace(ancla, "if false; then");
  }

  const { exit, salida } = correrBash(mutado, { cwd: fueraDeGit() });
  assert.equal(
    exit,
    0,
    "con las dos guardas neutralizadas el paso tendria que volver a salir VERDE sin haber " +
      `inspeccionado nada: si no, no eran ellas las que producian el rojo.\n${salida}`,
  );
  assert.match(
    salida,
    /sin marcadores del scaffold pendientes/,
    `la mutacion tiene que reproducir el verde afirmativo exacto:\n${salida}`,
  );
});

// Control positivo: el paso SI encuentra un marcador cuando lo hay. Sin esto, el rojo
// de "fuera de git" no distingue una guarda que actua de un paso roto.
test("marcadores · control · un marcador sin resolver en un repo sano es ROJO y se nombra", () => {
  const raiz = repoDeJuguete("marcadores-");
  escribir(raiz, ".github/CODEOWNERS", "*  @{{ORG}}/builders\n");
  escribir(raiz, "README.md", "un repo\n");
  commit(raiz, "estado inicial");
  const { exit, salida } = correrBash(scriptMarcadores, { cwd: raiz });
  assert.equal(exit, 1, salida);
  // El listado tiene que nombrar el archivo Y el marcador: un rojo que no dice donde
  // esta el placeholder deja al lector buscando a mano en todo el arbol.
  assert.match(salida, /CODEOWNERS/, `el rojo tiene que nombrar el archivo:\n${salida}`);
  assert.match(salida, /\{\{ORG\}\}/, `el rojo tiene que nombrar el marcador:\n${salida}`);
});

// Control negativo: repo sano SIN marcadores, y sin el scaffold que dispara el skip.
test("marcadores · control · repo sano sin marcadores: verde", () => {
  const raiz = repoDeJuguete("marcadores-limpio-");
  escribir(raiz, "README.md", "un repo sin marcadores\n");
  commit(raiz, "estado inicial");
  const { exit, salida } = correrBash(scriptMarcadores, { cwd: raiz });
  assert.equal(exit, 0, salida);
  assert.match(salida, /sin marcadores del scaffold pendientes/, salida);
});
