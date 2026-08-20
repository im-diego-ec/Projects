// Banco del paso "Ejecutores de paquetes pinados" de marco-ci.yml.
//
// Corre el script COMPLETO del paso —prefiltro de git grep incluido— sobre un
// repo de juguete, y afirma por codigo de salida. El prefiltro entra en el banco
// a proposito: los ejecutores que la auditoria del 2026-08-20 midio en exit 0
// (npm x, bun x, pnpm --silent dlx) se le escapaban al prefiltro Y al lector, y
// un banco que solo probara el lector habria dado verde sobre el mismo agujero.
//
// EL BANCO TIENE DOS MITADES Y HACEN COSAS DISTINTAS:
//
//   · Los casos de casos/ejecutores.md son la REGRESION: entradas concretas,
//     cada una con su origen y su motivo escrito, corridas por la tuberia
//     completa. Sirven para que un arreglo no rompa lo que ya se sostenia.
//   · El corpus GENERADO (generar.mjs) es el que puede encontrar algo nuevo. La
//     version anterior de este archivo afirmaba el invariante del prefiltro
//     iterando la lista escrita a mano, y por eso no podia, por construccion,
//     cazar un miembro nuevo de la clase: solo recorria los casos que alguien ya
//     habia pensado. Es la razon por la que dos rondas cerraron los casos
//     citados y la clase siguio abierta una ortografia mas adentro.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  scriptDelPaso,
  programaNode,
  patronDelPrefiltro,
  alfabetoDelPaso,
  RAIZ,
} from "./extraer.mjs";
import { corpus } from "./generar.mjs";
import {
  repoDeJuguete,
  carpetaTemporal,
  escribir,
  git,
  correrBash,
  correrNode,
  limpiarTodo,
} from "./util.mjs";

const PASO = "Ejecutores de paquetes pinados";
const script = scriptDelPaso(PASO);
const programa = programaNode(script, PASO);
const patron = patronDelPrefiltro(script, PASO);
const alfabeto = alfabetoDelPaso(programa, PASO);
const CORPUS = corpus(alfabeto);

function casos() {
  const md = readFileSync(join(RAIZ, "pruebas", "marco-ci", "casos", "ejecutores.md"), "utf8");
  const bloque = md.match(/```json\n([\s\S]*?)\n```/);
  assert.ok(bloque, "casos/ejecutores.md tiene que traer un bloque ```json con los casos");
  const lista = JSON.parse(bloque[1]);
  assert.ok(lista.length > 0, "la lista de casos no puede quedar vacia");
  return lista;
}

/** La tuberia completa (git grep + lector) sobre un repo con estas entradas. */
function correrPaso(entradas) {
  const raiz = repoDeJuguete("ejecutores-");
  for (const entrada of entradas) escribir(raiz, entrada.archivo, `${entrada.linea}\n`);
  git(raiz, "add", "-A");
  return correrBash(script, { cwd: raiz });
}

/**
 * Solo el LECTOR, sin git: se le pasa la lista de rutas NUL-separada, igual que
 * el paso. Es la unica forma de recorrer un corpus de miles de entradas sin
 * pagar un repo de juguete por entrada, y sigue siendo el texto que corre de
 * verdad (se extrae del YAML, no se copia).
 */
function correrLector(entradas) {
  const raiz = carpetaTemporal("lector-");
  const rutas = [];
  for (const entrada of entradas) {
    escribir(raiz, entrada.archivo, `${entrada.linea}\n`);
    rutas.push(entrada.archivo);
  }
  escribir(raiz, "lista.bin", `${rutas.join("\0")}\0`);
  return correrNode(programa, { args: ["lista.bin"], cwd: raiz });
}

test.after(limpiarTodo);

// ---------------------------------------------------------------- regresion
for (const caso of casos()) {
  test(`ejecutores · ${caso.origen} · ${caso.id}`, () => {
    const { exit, salida } = correrPaso([caso]);
    assert.equal(
      exit,
      caso.exit,
      `${caso.id}: se esperaba exit ${caso.exit} y salio ${exit} (${caso.por_que}).\n${salida}`,
    );
  });
}

// ------------------------------------------------------------ corpus generado
const ROJAS = CORPUS.filter((entrada) => entrada.rojo);
const VERDES = CORPUS.filter((entrada) => !entrada.rojo);

test("corpus generado · cruza todos los ejes contra el alfabeto del paso", () => {
  assert.ok(alfabeto.length >= 5, `el alfabeto leido del paso quedo corto: ${alfabeto.length}`);
  assert.ok(ROJAS.length > 500, `el corpus rojo quedo corto: ${ROJAS.length}`);
  assert.ok(VERDES.length > 300, `el corpus verde quedo corto: ${VERDES.length}`);
});

// Toda entrada sin version exacta tiene que quedar ROJA. Cada entrada vive en su
// PROPIO archivo, asi que la ruta identifica la entrada: el conjunto de rutas
// reportadas se compara contra el esperado, y una entrada que el lector no ve
// aparece como ruta faltante. El codigo de salida solo dice "alguna"; la
// comparacion de conjuntos dice CUAL, y es lo unico que puede cazar un miembro
// nuevo de la clase.
//
// Se cuentan SOLO las lineas ::error, nunca los ::warning. Un ::warning no pone
// rojo ningun job, asi que aceptarlo como cobertura seria aceptar exactamente el
// falso verde que este check existe para no tener. Aflojar esto a
// /::(error|warning)/ hace pasar el test y deja el agujero: la primera corrida de
// este corpus lo mostro con `--registry <url>`, que salia por el carril del
// ::warning.
test("corpus generado · el lector no deja pasar ninguna entrada sin pinar", () => {
  const { exit, salida } = correrLector(ROJAS);
  assert.equal(exit, 1, `el lector salio ${exit} sobre ${ROJAS.length} entradas sin pinar:\n${salida}`);
  const conError = new Set();
  for (const linea of salida.split("\n")) {
    const marca = linea.match(/^::error file=([^,]+),/);
    if (marca) conError.add(marca[1]);
  }
  const invisibles = ROJAS.filter((entrada) => !conError.has(entrada.archivo));
  assert.deepEqual(
    invisibles.map((entrada) => `${entrada.id} (${entrada.nota}): ${entrada.linea}`),
    [],
    "estas entradas sin pinar no dieron ::error: o salieron en silencio, o salieron por el carril del ::warning que no pone rojo nada. Las dos cosas son un miembro nuevo de la clase",
  );
});

// Y ninguna entrada correctamente pinada puede ponerse roja. Este es puro codigo
// de salida: un solo falso rojo lo tumba. Importa tanto como el otro, porque un
// check que se pone rojo sobre la forma correcta se apaga en el tercer PR.
test("corpus generado · el lector no se pone rojo sobre ninguna entrada pinada", () => {
  const { exit, salida } = correrLector(VERDES);
  assert.equal(exit, 0, `el lector salio ${exit} sobre ${VERDES.length} entradas pinadas:\n${salida}`);
});

// EL INVARIANTE DEL PREFILTRO, ahora derivado y no enumerado.
//
// El prefiltro decide que ARCHIVOS mira el lector. Si fuera mas angosto que el
// lector, el paso saldria exit 0 diciendo "no hay nada que pinar" sobre una linea
// que si trae un ejecutor: el peor verde posible, uno que afirma haber mirado. El
// patron se lee del YAML y se corre contra TODO el corpus, asi que la afirmacion
// vale sobre el patron que corre de verdad y sobre entradas que nadie escribio.
test("corpus generado · el prefiltro alcanza a toda entrada que el lector marca", () => {
  const prefiltro = new RegExp(patron);
  const perdidas = CORPUS.filter((entrada) => !prefiltro.test(entrada.linea));
  assert.deepEqual(
    perdidas.map((entrada) => `${entrada.id} (${entrada.nota}): ${entrada.linea}`),
    [],
    `el prefiltro /${patron}/ no selecciona estas entradas, asi que el lector nunca las ve`,
  );
});

// La tuberia completa tiene que coincidir con el lector: aca el prefiltro corre
// de verdad (git grep, pathspec de .md, -z) y no una imitacion en proceso.
test("corpus generado · la tuberia completa coincide con el lector", () => {
  const rojo = correrPaso(ROJAS);
  assert.equal(rojo.exit, 1, `la tuberia salio ${rojo.exit} sobre el corpus rojo:\n${rojo.salida.slice(0, 4000)}`);
  assert.ok(
    !/no hay nada que pinar/.test(rojo.salida),
    "la tuberia afirmo no tener nada que pinar sobre un corpus que si trae ejecutores",
  );
  const verde = correrPaso(VERDES);
  assert.equal(
    verde.exit,
    0,
    `la tuberia salio ${verde.exit} sobre el corpus verde:\n${verde.salida.slice(0, 4000)}`,
  );
});

// El arbol de Projects tiene que quedar en verde: el paso se aplica a si mismo (su
// propio bloque NOMBRA los ejecutores para explicarlos) y un guardrail que el
// marco no puede aplicarse a si mismo no le sirve a nadie. Con el prefiltro por
// ARCHIVO este caso pesa mas que antes: ahora el lector recorre completo todo
// archivo rastreado que mencione un gestor, incluidos los del propio banco.
test("ejecutores · el arbol de Projects sigue en verde", () => {
  const { exit, salida } = correrBash(script, { cwd: RAIZ });
  assert.equal(exit, 0, `el propio arbol de Projects quedo rojo:\n${salida}`);
});
