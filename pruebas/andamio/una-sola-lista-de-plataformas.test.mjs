import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { PLATAFORMAS, PLATAFORMAS_PENDIENTES, PLATAFORMAS_DECLARADAS } from "../../herramientas/projects-init.mjs";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

// ---------------------------------------------------------------------------
// LA LISTA DE PLATAFORMAS VIVE EN CUATRO LUGARES Y TIENE QUE DECIR LO MISMO.
//
// QUE DEFECTO CIERRA. Tres de las cuatro copias decian CINCO platformas y la
// unica que decide de verdad que archivos viajan decia TRES. Un proyecto nacia
// con una constitucion --`plantilla/AGENTS.md`, que VIAJA-- admitiendole
// `cloudflare`, y la misma herramienta que se la entrego rechazaba ese valor con
// EXIT 1 y "no es una opcion", culpando a quien leyo la constitucion y le hizo
// caso.
//
// La ironia queda escrita en el propio archivo: el comentario encima de
// `PLATAFORMAS` advierte que "una segunda lista al lado de la primera es como
// empiezan las divergencias, y este archivo ya pago esa cuenta". La divergencia
// existia igual, cruzando el borde del archivo, que es donde ese comentario no
// miraba.
//
// COMO SE RESUELVE. No recortando la constitucion: la herramienta es la que esta
// atrasada. `PLATAFORMAS_PENDIENTES` declara el hueco con su destino, y
// `PLATAFORMAS_DECLARADAS` se DERIVA. Este banco exige que las cuatro coincidan.
// ---------------------------------------------------------------------------

/** Los identificadores entre comillas invertidas de la frase que enumera las
 *  plataformas admitidas. */
function listaDeLaProsa(rel, ancla) {
  const texto = fs.readFileSync(path.join(RAIZ, rel), "utf8");
  const i = texto.indexOf(ancla);
  assert.notEqual(i, -1, `${rel} ya no contiene "${ancla}": esta guarda quedaria mirando al vacio`);
  // Desde el ancla hasta el final de la oracion.
  const tramo = texto.slice(i, i + 400).split(/\.\s/)[0];
  return new Set([...tramo.matchAll(/`([a-z]+)`/g)].map((m) => m[1]));
}

/** La copia que un banco vecino se escribio para si mismo. */
function listaDelBancoVecino() {
  const texto = fs.readFileSync(path.join(RAIZ, "pruebas", "andamio", "terraform-en-ci.test.mjs"), "utf8");
  const m = /const PLATAFORMAS = \[([^\]]+)\]/.exec(texto);
  assert.ok(m, "terraform-en-ci.test.mjs ya no declara su propia lista: si la borro, este caso sobra");
  return new Set([...m[1].matchAll(/"([a-z]+)"/g)].map((x) => x[1]));
}

const ESPERADA = new Set(PLATAFORMAS_DECLARADAS);

test("las declaradas son las implementadas mas las pendientes, y no una lista aparte", () => {
  assert.deepEqual(
    [...ESPERADA].sort(),
    [...new Set([...PLATAFORMAS, ...PLATAFORMAS_PENDIENTES])].sort(),
    "PLATAFORMAS_DECLARADAS dejo de derivarse: es una tercera lista escrita aparte",
  );
});

test("la constitucion que VIAJA al proyecto dice las mismas cinco", () => {
  const enLaConstitucion = listaDeLaProsa("plantilla/AGENTS.md", "Los valores admitidos son");
  assert.deepEqual(
    [...enLaConstitucion].sort(),
    [...ESPERADA].sort(),
    "la constitucion que recibe cada proyecto nuevo admite un conjunto distinto del que la herramienta reconoce",
  );
});

test("el canonico versionado dice las mismas cinco", () => {
  const enElCanonico = listaDeLaProsa("actions/constitucion/canonico/60-infra-plataforma-secretos.md", "admitidos");
  assert.deepEqual(
    [...enElCanonico].sort(),
    [...ESPERADA].sort(),
    "el artefacto canonico --que los consumidores regeneran-- enumera un conjunto distinto",
  );
});

test("el banco vecino que se escribio su propia copia dice las mismas cinco", () => {
  assert.deepEqual(
    [...listaDelBancoVecino()].sort(),
    [...ESPERADA].sort(),
    "pruebas/andamio/terraform-en-ci.test.mjs tiene una cuarta copia que ya no coincide",
  );
});

test("una pendiente NO es una implementada: el hueco se declara, no se tapa", () => {
  // Sin este caso, alguien podria "arreglar" una divergencia futura metiendo la
  // plataforma en PLATAFORMAS sin que exista el adaptador, y los cuatro casos de
  // arriba pasarian en verde sobre un proyecto que nace roto.
  for (const p of PLATAFORMAS_PENDIENTES) {
    assert.ok(
      !PLATAFORMAS.includes(p),
      `${p} figura como implementada y como pendiente a la vez: o tiene adaptador o no lo tiene`,
    );
  }
  assert.ok(PLATAFORMAS_PENDIENTES.length > 0, "sin pendientes, este caso sobra y hay que borrarlo");
});
