// QUE PASOS DE marco-ci.yml NO TIENEN BANCO — derivado del arbol, no contado a
// mano.
//
// POR QUE EXISTE. El encabezado del extractor dice que los pasos inline "eran
// los unicos del marco SIN banco de pruebas" y que la salida fue levantar el
// banco alrededor del texto que corre de verdad. Fue cierto para una parte: el
// banco se levanto sobre unos pocos pasos y el resto quedo afuera, y el hueco
// solo se descubria contandolo A MANO, una auditoria por vez. Un hueco que hay
// que acordarse de medir vuelve a abrirse solo.
//
// QUE HACE. Deriva del YAML los pasos con `run:` propio, deriva de los bancos
// cuales estan citados, y compara contra la lista DECLARADA de los que todavia
// no tienen banco. Tres formas de ponerse rojo, y ninguna es "el numero subio":
//
//   1. Un paso con `run:` que nadie cubre y que NO esta declarado -> rojo. Es la
//      unica compuerta: un guardrail nuevo no entra sin banco ni sin decir, en
//      una linea, por que todavia no lo tiene.
//   2. Un paso declarado que YA tiene banco -> rojo. La deuda que se pago se
//      borra de la lista en el mismo PR, si no la lista deja de significar algo.
//   3. Un paso declarado que ya no existe en el YAML -> rojo, por lo mismo.
//
// Los que siguen declarados salen por ::warning:: en cada corrida: es deuda
// visible, no un silencio.
//
// LOS PASOS SIN `- name:` TAMBIEN CUENTAN. Un paso puede traer `run:` y no
// tener nombre —le alcanza con un `id:`—, y un recorrido que arranque en los
// `- name:` no lo ve: ni para exigirle banco ni para declararlo. Ese es el mismo
// punto ciego de clase que dejaba pasar guardrails enteros, esta vez dentro del
// check que existe para cerrarlo. Se recorre desde el `run:` hacia arriba, y un
// paso sin nombre entra a la cuenta como no-citado por construccion: el
// extractor busca por nombre, asi que ningun banco pudo haberlo corrido.
//
// LO QUE ESTE CASO NO MIDE, declarado, y son DOS limites y no uno.
//
// PRIMERO: "citado" se decide por SUBSTRING, no por ejecucion. Un paso cuenta
// como citado cuando su `name:` aparece en el texto de cualquier `.test.mjs`,
// COMENTARIOS INCLUIDOS. Comprobado pegando el nombre de un paso declarado
// —el que lee `uname`— como comentario suelto en otro `.test.mjs`: ese paso
// paso a "citado" y su entrada en la lista de abajo salto por pagada, sin que
// ningun caso lo hubiera corrido. O sea que un paso de nombre corto y comun se
// puede dar por cubierto de gratis. Los que hoy cuentan como citados se
// revisaron uno por uno y son extracciones de verdad, pero eso es una medicion
// de hoy y no una garantia del mecanismo. Lo que el mecanismo SI garantiza es
// la otra direccion, que es la que arma la compuerta: un paso que ningun
// archivo de pruebas nombra no lo corrio nadie, y ese es exactamente el que se
// exige declarar.
//
// SEGUNDO: "citado" tampoco es "cubierto". Que un banco extraiga un paso y lo
// corra no dice cuantas de sus ramas ejercito. Medir eso exige cobertura sobre
// el marco, y el marco no tiene manifiesto de paquete ni cobertura-diff cableada
// sobre si mismo. Lo que este caso cierra es el hueco groseramente mas grande:
// el paso que no ejecuto NADIE, nunca.
import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { RAIZ, RUTA_WORKFLOW } from "./extraer.mjs";

/**
 * Los pasos con `run:` propio del workflow y el largo de su bloque, derivados
 * del texto.
 *
 * SE RECORRE DESDE EL `run:`, NO DESDE EL `- name:`, y esa vuelta importa. La
 * version anterior arrancaba en cada `- name:` y buscaba su `run:` hacia abajo:
 * un paso SIN nombre quedaba invisible, y su bloque `run:` se le colgaba al
 * `- name:` anterior o directamente no se contaba. Asi es como el paso `detectar`
 * del job de cambios —el que decide el carril de docs— no aparecia ni para
 * exigirle banco ni para declararlo. Arrancando por el `run:` y subiendo a la
 * linea `- ` de su paso, ninguno se puede esconder por no tener nombre.
 *
 * Cada paso sale con:
 *   nombre    -> el valor de `name:`, o null si el paso no tiene
 *   clave     -> con que se lo nombra en la deuda declarada y en los mensajes
 *   extraible -> si `scriptDelPaso()` lo puede sacar del YAML, que es por nombre
 */
function pasosConRun(ruta) {
  const lineas = readFileSync(ruta, "utf8").split(/\r?\n/);
  const pasos = [];
  for (let j = 0; j < lineas.length; j += 1) {
    const marcaRun = lineas[j].match(/^(\s*)run: \|\s*$/);
    if (!marcaRun) continue;
    const sangria = marcaRun[1].length;
    // El paso empieza en la linea "- " mas cercana hacia arriba con dos espacios
    // menos de sangria: `run:` es una clave del paso, asi que va indentada dos
    // adentro del guion que lo abre.
    let inicio = -1;
    for (let i = j - 1; i >= 0; i -= 1) {
      const marcaPaso = lineas[i].match(/^(\s*)- /);
      if (marcaPaso && marcaPaso[1].length === sangria - 2) {
        inicio = i;
        break;
      }
    }
    if (inicio === -1) {
      throw new Error(`el bloque "run:" de ${ruta}:${j + 1} no cuelga de ningun paso: el recorrido esta leyendo mal el YAML`);
    }

    const cabecera = lineas.slice(inicio, j);
    const nombre = cabecera.map((l) => l.match(/^\s*(?:- )?name: (.+)$/)).find(Boolean)?.[1].trim() ?? null;
    const id = cabecera.map((l) => l.match(/^\s*(?:- )?id: (.+)$/)).find(Boolean)?.[1].trim() ?? null;

    let largo = 0;
    for (let k = j + 1; k < lineas.length; k += 1) {
      if (lineas[k].trim() === "") continue;
      const propia = lineas[k].length - lineas[k].replace(/^\s+/, "").length;
      if (propia <= sangria) break;
      largo += 1;
    }

    pasos.push({
      nombre,
      clave: nombre ?? `(sin name, id: ${id ?? "?"})`,
      extraible: nombre !== null,
      linea: inicio + 1,
      largo,
    });
  }
  return pasos;
}

/**
 * El texto de todos los bancos, que es donde se busca la cita del paso.
 *
 * ESTE ARCHIVO SE EXCLUYE, Y NO ES UN DETALLE: la lista de deuda de abajo
 * NOMBRA a los pasos que faltan, asi que leyendose a si mismo este caso
 * encontraba citados a los seis y salia diciendo que no falta ninguno. Un check
 * que se apaga solo por mencionar lo que vigila es el falso verde que el marco
 * existe para no tener, y aca aparecio en la primera corrida.
 */
function textoDeLosBancos() {
  const partes = [];
  for (const carpeta of readdirSync(join(RAIZ, "pruebas"), { withFileTypes: true })) {
    if (!carpeta.isDirectory()) continue;
    const dir = join(RAIZ, "pruebas", carpeta.name);
    for (const archivo of readdirSync(dir)) {
      if (!archivo.endsWith(".test.mjs")) continue;
      const ruta = join(dir, archivo);
      if (ruta === import.meta.filename) continue;
      partes.push(readFileSync(ruta, "utf8"));
    }
  }
  return partes.join("\n");
}

// ── LA DEUDA DECLARADA ─────────────────────────────────────────────────────
//
// Cada entrada es un paso con `run:` que todavia no tiene banco, con el motivo
// por el que no lo tiene. No es una lista de excepciones permanentes: es lo que
// falta, escrito donde se ve, y cada linea que se borra es un banco que se
// escribio.
//
// NINGUN MOTIVO REPITE EL LARGO DEL PASO, y eso es deliberado. El ::warning::
// ya imprime el largo DERIVADO del YAML justo antes del motivo, asi que una
// cifra escrita a mano aca no agrega nada y si se pudre: marco-ci.yml se edita
// seguido, y la version anterior de esta lista decia "sesenta y nueve lineas"
// de un paso que para entonces ya tenia setenta. Un numero que hay que acordarse
// de actualizar es la clase de dato que este banco existe para no tener.
const SIN_BANCO_TODAVIA = new Map([
  [
    "Exigir OpenSpec en el repo",
    "no tiene ni una rama: comprueba que exista un directorio y falla si no. El caso valdria menos que el ruido de escribirlo",
  ],
  [
    "Validacion estricta de changes y specs",
    "instala e invoca el CLI de OpenSpec: lo que decide es el CLI, y probarlo exige la red que este banco no tiene. Su pin si esta cubierto, por el banco del registry",
  ],
  [
    "El runner es Linux x86-64",
    "lee uname: el caso exige correr en la plataforma que se quiere refutar, o sea una matriz de sistemas operativos y no un banco",
  ],
  [
    "Definiciones de pipeline validas",
    "descarga e invoca actionlint: sin red no se puede ejercitar, y sin ejercitarlo el banco solo repetiria el texto del paso",
  ],
  [
    "Censo de fuentes cableado",
    "detecta cableado sobre el arbol del consumidor. Es el hueco mas grande de los que SI se pueden escribir sin red, y es el proximo banco",
  ],
  [
    "El andamio reparte el umbral del total del marco",
    "compara el umbral del andamio contra el del marco; su mitad de datos ya la cubre el banco del andamio",
  ],
  [
    "(sin name, id: detectar)",
    "decide el carril de docs del consumidor. NO TIENE BANCO PORQUE NO TIENE NOMBRE: el extractor ubica los pasos por su linea '- name:', asi que scriptDelPaso() no lo puede sacar del YAML y ningun banco puede correr el texto que corre de verdad. El arreglo empieza FUERA de este banco: agregarle un 'name:' al paso '- id: detectar' de marco-ci.yml, y recien despues escribirle el caso",
  ],
]);

const PASOS = pasosConRun(RUTA_WORKFLOW);
const BANCOS = textoDeLosBancos();
// Un paso sin `- name:` NO PUEDE estar citado, y no es una convencion: el
// extractor busca por nombre, asi que ningun banco puede haber corrido su
// script. Decidirlo por substring lo daria por cubierto en cuanto su id
// apareciera suelto en cualquier archivo de pruebas.
const citado = (paso) => paso.extraible && BANCOS.includes(paso.nombre);

test("cobertura de los pasos · hay pasos con run: que mirar", () => {
  // Cero pasos JAMAS es un exito: un renombrado del workflow o un extractor roto
  // dejarian todo lo de abajo en verde sin haber mirado nada.
  assert.ok(
    PASOS.length >= 12,
    `se encontraron ${PASOS.length} pasos con bloque run: propio y se esperaban al menos 12: si bajaron, este caso esta leyendo otro archivo`,
  );
});

test("cobertura de los pasos · ningun paso con run: queda sin banco Y sin declarar", () => {
  const huerfanos = PASOS.filter((paso) => !citado(paso) && !SIN_BANCO_TODAVIA.has(paso.clave));
  assert.deepEqual(
    huerfanos.map((paso) => `${paso.clave} (marco-ci.yml:${paso.linea}, ${paso.largo} lineas)`),
    [],
    "estos pasos traen script propio, ningun banco los cita y tampoco figuran en SIN_BANCO_TODAVIA. Un guardrail que ningun caso ejecuto nunca decide veredictos sobre repos ajenos con la unica evidencia de que alguien lo leyo. Arreglo: escribile el banco —el extractor y los helpers ya existen— o agregalo a SIN_BANCO_TODAVIA con el motivo por el que todavia no lo tiene",
  );
});

test("cobertura de los pasos · la deuda declarada esta al dia", () => {
  const porClave = new Map(PASOS.map((paso) => [paso.clave, paso]));
  const pagados = [...SIN_BANCO_TODAVIA.keys()].filter(
    (clave) => porClave.has(clave) && citado(porClave.get(clave)),
  );
  const fantasmas = [...SIN_BANCO_TODAVIA.keys()].filter((clave) => !porClave.has(clave));
  assert.deepEqual(
    pagados,
    [],
    `estos pasos figuran como "sin banco todavia" y YA tienen uno: ${pagados.join(", ")}. Sacalos de SIN_BANCO_TODAVIA en el mismo PR que escribio el banco — una lista de deuda que no se poda deja de significar algo y el proximo lector no sabe cual mitad es cierta`,
  );
  assert.deepEqual(
    fantasmas,
    [],
    `estos pasos figuran como "sin banco todavia" y ya no existen en marco-ci.yml: ${fantasmas.join(", ")}. Se renombraron o se borraron; en los dos casos la entrada sobra`,
  );
});

test("cobertura de los pasos · la deuda que queda sale por ::warning::, no en silencio", () => {
  const pendientes = PASOS.filter((paso) => !citado(paso));
  const lineas = pendientes.reduce((total, paso) => total + paso.largo, 0);
  for (const paso of pendientes) {
    console.log(
      `::warning file=.github/workflows/marco-ci.yml,line=${paso.linea}::el paso "${paso.clave}" trae ${paso.largo} lineas de script y ningun banco lo cita. Motivo declarado: ${SIN_BANCO_TODAVIA.get(paso.clave)}`,
    );
  }
  const cubiertos = PASOS.length - pendientes.length;
  console.log(
    `== resumen == ${cubiertos} de ${PASOS.length} pasos con run: citados por algun banco; quedan ${lineas} linea(s) de script sin ejercitar, todas declaradas`,
  );
  // La afirmacion del caso no es el numero: es que el aviso se emitio por cada
  // pendiente. Un aviso mudo seria el agujero otra vez.
  assert.equal(
    pendientes.length,
    SIN_BANCO_TODAVIA.size,
    `se avisaron ${pendientes.length} pendientes y la lista declara ${SIN_BANCO_TODAVIA.size}: los dos casos de arriba tendrian que haber explicado la diferencia`,
  );
});
