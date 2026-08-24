// Banco de los checkouts de marco-ci.yml.
//
// POR QUE UN BANCO DE LECTURA Y NO DE EJECUCION. Lo que se fija aca no vive en un
// bloque `run:` sino en el `with:` de una action: el extractor de pasos no lo alcanza
// y no hay runner de Actions donde ejecutarlo. La alternativa era dejar esta mitad sin
// una sola asercion, que es exactamente como llegaron a produccion los dos defectos
// que estas pruebas fijan:
//
//   1. Ningun checkout fijaba `ref:`, y bajo `pull_request_target` el default de
//      actions/checkout NO es el head del PR sino la rama BASE. Los nueve pasos de
//      higiene, la validacion --strict, el guardrail de deltas y el detector de
//      secretos corrian sobre el codigo que ya estaba en main, y marco-ok los sumaba
//      en success: TODOS los checks del marco en verde sobre codigo que jamas se leyo.
//   2. Ninguno declaraba `persist-credentials`, y con el default (true) el checkout
//      escribe el token del repo LLAMADOR como extraheader en el .git/config de un
//      arbol que, bajo ese mismo evento, es codigo de un tercero.
//
// LA ASIMETRIA DEL `ref` ES LA PARTE QUE MAS FACIL SE PIERDE en una edicion futura, y
// por eso tiene su propia asercion: los checkouts que juzgan el CAMBIO apuntan al head
// del PR, y el del job `cambios` apunta a la rama BASE, porque lo que alimenta no es
// un veredicto sino la sonda que decide QUE COMPUERTAS CORREN. Si esa sonda mirara el
// head, un PR de fork se declararia distribuidor agregando dos archivos.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { RUTA_WORKFLOW } from "./extraer.mjs";

const lineas = readFileSync(RUTA_WORKFLOW, "utf8").split(/\r?\n/);

/**
 * Los bloques `uses: actions/checkout@...` con las lineas de su `with:`, sin
 * comentarios. El bloque termina donde aparece otra linea con sangria menor o igual a
 * la del `uses:`, que es como YAML cierra un item de lista.
 */
function checkouts() {
  const salida = [];
  for (let i = 0; i < lineas.length; i += 1) {
    const m = lineas[i].match(/^(\s*)-?\s*uses: actions\/checkout@/);
    if (!m) continue;
    if (/^\s*#/.test(lineas[i])) continue;
    const sangria = lineas[i].match(/^\s*/)[0].length;
    // Donde empieza el ITEM de la lista, que no siempre es donde empieza el `uses:`:
    // en `- uses: actions/checkout@v7` coinciden, y en la forma
    // `- name: ...` / `uses: ...` el item arranca dos columnas antes. Sin esta
    // distincion el bloque se cerraba en el `with:` de la linea siguiente y este banco
    // reportaba como "sin declarar" checkouts que si lo declaran.
    const limite = /^\s*-\s*uses:/.test(lineas[i]) ? sangria : sangria - 2;
    const cuerpo = [];
    for (let j = i + 1; j < lineas.length; j += 1) {
      if (lineas[j].trim() === "") continue;
      const propia = lineas[j].match(/^\s*/)[0].length;
      if (propia <= limite) break;
      if (/^\s*-\s/.test(lineas[j]) && propia === limite + 2) break;
      if (/^\s*#/.test(lineas[j])) continue;
      cuerpo.push(lineas[j].trim());
    }
    salida.push({ linea: i + 1, cuerpo });
  }
  return salida;
}

// Control de que este banco no es un no-op: si el patron deja de matchear, se cae ACA
// y no las aserciones de abajo, que pasarian vacuamente sobre una lista vacia.
test("checkouts · el escaneo los encuentra: un cero aca es el banco roto", () => {
  assert.ok(
    checkouts().length >= 5,
    `solo encontre ${checkouts().length} checkout(s) en marco-ci.yml. Los jobs cambios, ` +
      "openspec, deltas, higiene y constitucion-cableada tienen uno cada uno: menos de cinco " +
      "significa que este banco dejo de mirar donde deberia",
  );
});

test("checkouts · todos declaran persist-credentials: false", () => {
  const sinDeclarar = checkouts()
    .filter((c) => !c.cuerpo.some((l) => l === "persist-credentials: false"))
    .map((c) => `marco-ci.yml:${c.linea}`);
  assert.deepEqual(
    sinDeclarar,
    [],
    "un checkout sin persist-credentials: false deja el token del repo LLAMADOR escrito en el " +
      ".git/config del arbol recien traido. Bajo pull_request_target ese arbol es el head de un " +
      "PR de fork, o sea codigo de un tercero",
  );
});

test("checkouts · todos fijan un ref explicito: ninguno se queda con el default", () => {
  const sinRef = checkouts()
    .filter((c) => !c.cuerpo.some((l) => l.startsWith("ref:")))
    .map((c) => `marco-ci.yml:${c.linea}`);
  assert.deepEqual(
    sinRef,
    [],
    "bajo pull_request_target el default de actions/checkout es la rama BASE, no el head del PR: " +
      "un checkout sin ref explicito vuelve a poner en verde checks que nunca miraron el cambio",
  );
});

test("checkouts · el que alimenta la sonda del distribuidor apunta a la BASE, no al head", () => {
  const conBase = checkouts().filter((c) =>
    c.cuerpo.some((l) => l.includes("github.base_ref")),
  );
  assert.equal(
    conBase.length,
    1,
    "tiene que haber exactamente UNO —el del job cambios— y su motivo esta escrito ahi: si la " +
      "sonda del distribuidor mirara el head, un PR de fork se declararia distribuidor agregando " +
      `dos archivos. Encontre ${conBase.length}`,
  );

  const conHead = checkouts().filter((c) =>
    c.cuerpo.some((l) => l.includes("github.event.pull_request.head.sha")),
  );
  assert.ok(
    conHead.length >= 4,
    "los checkouts que JUZGAN el cambio (openspec, deltas, higiene, constitucion-cableada) tienen " +
      `que apuntar al head del PR bajo pull_request_target: encontre ${conHead.length}`,
  );

  // Y las dos familias son disjuntas: un checkout que mirara las dos cosas no existiria.
  const ambas = checkouts().filter(
    (c) =>
      c.cuerpo.some((l) => l.includes("github.base_ref")) &&
      c.cuerpo.some((l) => l.includes("github.event.pull_request.head.sha")),
  );
  assert.deepEqual(ambas, [], "ningun checkout puede apuntar a la base y al head a la vez");
});
