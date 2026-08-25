// BANCO DE UNA INVARIANTE DE LAS ACTIONS PUBLICADAS: NINGUNA MUERE MUDA POR
// FALTA DE NODE.
//
// QUE CIERRA. Seis composite actions, tres formas distintas de resolver la misma
// dependencia: dos instalaban Node con `actions/setup-node`, una comprobaba que
// estuviera en el PATH con un `::error::` que trae el arreglo, y dos lo
// invocaban a secas. En un runner propio —o en cualquier imagen sin Node— esas
// dos morian con `node: command not found`: un mensaje del SHELL, no del marco,
// que no dice que instalar ni de quien es el job. La invariante que este banco
// vuelve exigible es la que ya estaba escrita en una de las tres: o la action
// instala Node, o comprueba que este y lo dice con el arreglo.
//
// POR QUE VIVE ACA Y NO EN EL BANCO DE CADA ACTION. Es una afirmacion sobre EL
// CONJUNTO —"ninguna de las que publicamos"— y derivarla del arbol es lo unico
// que hace que cubra la action que alguien agregue manana. Repartida en seis
// bancos seria una lista que hay que acordarse de actualizar, que es exactamente
// la clase de check que el marco no escribe.
//
// COMO SE AFIRMA. Dos mitades. La primera lee cada `action.yml` y clasifica: se
// exige que toda action que invoque `node` caiga en una de las dos ramas sanas.
// La segunda EJECUTA el guard con un PATH donde Node no esta, y afirma por
// codigo de salida y por el `::error::` que sale — porque un guard que nadie
// vio fallar no es un guard.
//
// UN setup-node CON `if:` NO INSTALA NADA, y esa es la unica sutileza del
// clasificador. Dos actions traen el paso de setup-node gateado por un input
// (`if: inputs.instalar-node == 'true'`): una con default "false" y otra con
// default "true". Clasificarlas como "instala" por la sola presencia de la linea
// `uses:` dejaba en VERDE justo el caso que la invariante existe para prohibir
// —la que, en su configuracion por defecto documentada, muere con el error del
// shell—. Un paso condicional cuenta como instalacion solo si ademas hay guard;
// si no, es "cruda" y el caso se pone rojo.
import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { scriptDelPaso } from "../marco-ci/extraer.mjs";
import { correrBash, limpiarTodo } from "../marco-ci/util.mjs";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const DIR_ACTIONS = join(RAIZ, "actions");

test.after(limpiarTodo);

/** Las actions publicadas, derivadas del arbol y no de una lista escrita a mano. */
function actionsPublicadas() {
  return readdirSync(DIR_ACTIONS, { withFileTypes: true })
    .filter((entrada) => entrada.isDirectory())
    .map((entrada) => entrada.name)
    .filter((nombre) => {
      try {
        readFileSync(join(DIR_ACTIONS, nombre, "action.yml"), "utf8");
        return true;
      } catch {
        return false;
      }
    })
    .sort();
}

const ACTIONS = actionsPublicadas();

/**
 * Los pasos de un `action.yml`, cada uno como el texto de su bloque.
 *
 * Hace falta partirlo en pasos para poder preguntar por el `if:` DEL PASO de
 * setup-node y no por un `if:` cualquiera del archivo. El corte es por sangria:
 * un paso arranca en una linea `- ` con la sangria del primer paso de `steps:`,
 * y todo lo que sigue con mas sangria le pertenece —incluidas las lineas de sus
 * bloques `run:`, que van indentadas mas adentro que la clave `run:` misma.
 */
function pasosDelYaml(sinComentarios) {
  const lineas = sinComentarios.split(/\r?\n/);
  const desde = lineas.findIndex((linea) => /^\s*steps:\s*$/.test(linea));
  if (desde === -1) return [];
  const cuerpo = lineas.slice(desde + 1);
  const primera = cuerpo.find((linea) => /^\s*-\s/.test(linea));
  if (!primera) return [];
  const sangria = primera.length - primera.replace(/^\s+/, "").length;
  const pasos = [];
  for (const linea of cuerpo) {
    if (linea.trim() === "") {
      if (pasos.length > 0) pasos[pasos.length - 1].push(linea);
      continue;
    }
    const propia = linea.length - linea.replace(/^\s+/, "").length;
    if (propia === sangria && /^\s*-\s/.test(linea)) pasos.push([linea]);
    else if (propia > sangria && pasos.length > 0) pasos[pasos.length - 1].push(linea);
    else break;
  }
  return pasos.map((paso) => paso.join("\n"));
}

/**
 * Como resuelve una action su dependencia de Node:
 *   "instala"  -> trae un paso `uses: actions/setup-node` que corre SIEMPRE
 *   "comprueba"-> trae un `command -v node` con su ::error::
 *   "cruda"    -> invoca node sin ninguna de las dos (la rama prohibida)
 *   "no-usa"   -> no invoca node
 */
function comoResuelveNode(nombre) {
  const texto = readFileSync(join(DIR_ACTIONS, nombre, "action.yml"), "utf8");
  const sinComentarios = texto
    .split(/\r?\n/)
    .filter((linea) => !/^\s*#/.test(linea))
    .join("\n");
  if (!/(^|\s)node\s+"/.test(sinComentarios)) return "no-usa";
  // El `uses:` tiene que estar al principio de su linea: los mensajes de los
  // guards NOMBRAN actions/setup-node como arreglo, y buscarlo suelto los
  // clasificaba como si lo instalaran — o sea, el check se apagaba solo justo
  // sobre las actions que existe para vigilar.
  //
  // Y el paso tiene que correr SIEMPRE: con un `if:` encima, la instalacion
  // depende de un input, asi que no garantiza nada y la action cae a las otras
  // dos ramas. Esto no es teorico: las dos actions con setup-node del marco lo
  // traen gateado por `instalar-node`, y una de ellas tiene ese input en "false"
  // por defecto.
  const pasoSetup = pasosDelYaml(sinComentarios).find((paso) =>
    /^\s*(-\s*)?uses:\s*actions\/setup-node/m.test(paso),
  );
  if (pasoSetup && !/^\s*(-\s*)?if:\s/m.test(pasoSetup)) return "instala";
  if (/command -v node/.test(sinComentarios)) return "comprueba";
  return "cruda";
}

test("actions · hay actions publicadas que mirar", () => {
  // Cero actions encontradas JAMAS es un exito: un renombrado de carpeta dejaria
  // todo lo de abajo en verde sin haber mirado un solo archivo.
  assert.ok(
    ACTIONS.length >= 6,
    `se encontraron ${ACTIONS.length} actions con action.yml y se esperaban al menos 6: si bajaron, el banco esta mirando otro arbol`,
  );
});

test("actions · ninguna invoca node sin instalarlo ni comprobar que exista", () => {
  const crudas = ACTIONS.filter((nombre) => comoResuelveNode(nombre) === "cruda");
  assert.deepEqual(
    crudas,
    [],
    `estas actions invocan node sin instalarlo ni comprobarlo: ${crudas.join(", ")}. En un runner sin Node mueren con "node: command not found", que es un mensaje del shell y no dice que instalar. Arreglo: o un paso 'uses: actions/setup-node@v7' antes, o el guard 'if ! command -v node' con un ::error:: que traiga el arreglo`,
  );
});

test("actions · el mensaje de cada guard nombra el paso que instala Node", () => {
  // Un guard que solo dice "no hay node" no es mejor que el error del shell: lo
  // que lo convierte en util es que traiga el arreglo escrito.
  const conGuard = ACTIONS.filter((nombre) => comoResuelveNode(nombre) === "comprueba");
  assert.ok(conGuard.length > 0, "ninguna action comprueba node: el caso de abajo quedaria vacuo");
  for (const nombre of conGuard) {
    const texto = readFileSync(join(DIR_ACTIONS, nombre, "action.yml"), "utf8");
    const mensaje = texto.match(/::error::no hay 'node'[^"]*/);
    assert.ok(mensaje, `${nombre}: el guard de node no emite ningun ::error:: reconocible`);
    assert.match(
      mensaje[0],
      /actions\/setup-node/,
      `${nombre}: el mensaje del guard no nombra el paso que lo arregla`,
    );
  }
});

/**
 * Un PATH donde Node no esta. Solo lleva bash, que es lo que el runner necesita
 * para arrancar el bloque: todo lo que el guard usa —command, echo, exit— son
 * builtins, asi que el guard tiene que poder decidir sin ninguna herramienta
 * externa. Si manana necesitara una, este caso se cae y esa es la senal.
 */
function pathSinNode() {
  const bin = mkdtempSync(join(tmpdir(), "sin-node-"));
  const bash = execFileSync("bash", ["-c", "command -v bash"], { encoding: "utf8" }).trim();
  symlinkSync(bash, join(bin, "bash"));
  return bin;
}

test("actions · el guard de node se pone rojo de verdad cuando node no esta", () => {
  const bin = pathSinNode();
  const conGuard = ACTIONS.filter((nombre) => comoResuelveNode(nombre) === "comprueba");
  for (const nombre of conGuard) {
    const ruta = join(DIR_ACTIONS, nombre, "action.yml");
    const texto = readFileSync(ruta, "utf8");
    // El paso que trae el guard, ubicado por su propio nombre en el YAML.
    const paso = texto
      .split(/\r?\n/)
      .slice(0, texto.split(/\r?\n/).findIndex((l) => /command -v node/.test(l)))
      .reverse()
      .find((l) => /^\s*- name: /.test(l))
      ?.replace(/^\s*- name: /, "");
    assert.ok(paso, `${nombre}: el paso que trae el guard no tiene name:, asi que no se puede extraer`);
    const script = scriptDelPaso(paso, ruta);
    const { exit, salida } = correrBash(script, {
      env: { PATH: bin, GITHUB_ACTION_PATH: join(DIR_ACTIONS, nombre) },
    });
    assert.equal(exit, 1, `${nombre}: sin node en el PATH el paso salio ${exit} en vez de rojo:\n${salida}`);
    assert.match(
      salida,
      /::error::no hay 'node' en el PATH/,
      `${nombre}: sin node en el PATH el paso no dijo por que:\n${salida}`,
    );
    assert.ok(
      !/command not found/.test(salida),
      `${nombre}: el paso llego a invocar node y murio con el error del shell, que es justamente lo que el guard existe para evitar:\n${salida}`,
    );
  }
});
