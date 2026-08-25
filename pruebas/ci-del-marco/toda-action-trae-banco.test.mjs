// TODA ACTION PUBLICADA TRAE BANCO — incluida la que no tiene .mjs.
//
// EL PUNTO CIEGO QUE CIERRA. El paso del CI que denuncia actions sin banco
// recorre `actions/*/`, junta sus `*.mjs` y hace `continue` si no hay ninguno.
// La consecuencia era que la unica action cuya logica vive INLINE en el `run:`
// del action.yml —133 lineas de bash con once ramas de fail-open, que deciden si
// un consumidor puede saltarse su build y su despliegue— salia por ese
// `continue` y nunca se contaba. O sea que el check que mide cobertura de
// actions tenia su punto ciego exactamente sobre la action con la peor relacion
// entre consecuencia y cobertura.
//
// LA REGLA QUE ESTE CASO EXIGE es la misma sin la excepcion: toda carpeta con
// `action.yml` trae su banco al lado, tenga script propio o no. Donde vive la
// logica —en un `.mjs` o dentro del YAML— es una decision de implementacion y no
// puede decidir si la pieza se prueba.
//
// POR QUE ES ROJO Y NO AVISO. No hay consumidor al que estrenarle un rojo: esto
// corre en el banco del propio marco, sobre su propio arbol, y hoy pasa en verde
// con las seis actions cubiertas. Un aviso aca solo serviria para tolerar la
// septima sin banco, que es justo lo que se acaba de cerrar.
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const DIR_ACTIONS = join(RAIZ, "actions");

/** Las carpetas con action.yml, derivadas del arbol. */
function actionsPublicadas() {
  return readdirSync(DIR_ACTIONS, { withFileTypes: true })
    .filter((entrada) => entrada.isDirectory())
    .map((entrada) => entrada.name)
    .filter((nombre) => existsSync(join(DIR_ACTIONS, nombre, "action.yml")))
    .sort();
}

/** Los .test.mjs que la action trae en su carpeta pruebas/. */
function bancoDe(nombre) {
  const dir = join(DIR_ACTIONS, nombre, "pruebas");
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((archivo) => archivo.endsWith(".test.mjs"));
}

const ACTIONS = actionsPublicadas();

test("actions · hay actions que mirar", () => {
  // Cero actions JAMAS es un exito: un renombrado de carpeta dejaria el caso de
  // abajo en verde sin haber mirado ninguna.
  assert.ok(
    ACTIONS.length >= 6,
    `se encontraron ${ACTIONS.length} carpetas con action.yml y se esperaban al menos 6`,
  );
});

test("actions · ninguna action publicada se queda sin un solo caso", () => {
  const sinBanco = ACTIONS.filter((nombre) => bancoDe(nombre).length === 0);
  assert.deepEqual(
    sinBanco,
    [],
    `estas actions estan publicadas bajo @v1 y no traen ningun caso: ${sinBanco.join(", ")}. Da igual si su logica vive en un .mjs o inline en el action.yml: llega a todos los consumidores sin haberse ejecutado nunca sobre un caso controlado. Arreglo: agregar actions/<nombre>/pruebas/<nombre>.test.mjs. Si la logica es inline, se extrae el bloque del YAML con scriptDelPaso() y se corre — no se copia`,
  );
});
