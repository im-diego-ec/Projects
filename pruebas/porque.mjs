// ---------------------------------------------------------------------------
// EL MOTIVO **Y** LA EVIDENCIA, para `assert.match` y `assert.doesNotMatch`.
//
// LA PROPIEDAD DE NODE QUE HACE FALTA CONOCER, y es contraintuitiva. Esos dos asserts, SIN
// mensaje, imprimen el regex Y EL INPUT COMPLETO:
//
//     The input did not match the regular expression /no-esta/. Input:
//     'linea 1\nlinea 2 con el detalle\nlinea 3'
//
// CON mensaje imprimen SOLO el mensaje, y el input se pierde:
//
//     el paso tenia que decir X
//
// O sea que agregar un mensaje —el reflejo correcto en casi cualquier otro assert— EMPEORA el
// diagnostico de estos dos: se gana el POR QUE y se pierde el QUE PASO.
//
// DONDE SE PAGA. No al escribir la asercion: el dia que cae en CI, cuando el log dice el motivo
// y se calla la evidencia, y hay que re-correr o reproducir en local para saber que ocurrio.
// Investigar una intermitencia sin el input es investigar a ciegas, y una intermitencia es
// justo lo que no se puede re-correr a voluntad.
//
// DE DONDE VIENE. Lo trajo el porte de Rigel (2.8.x, commit d71c40c, issue #491 de alla): un
// banco intermitente cayo en CI con un rastro que decia `not ok 373 ... AssertionError` y nada
// mas, sin decir cual de sus cuatro aserciones cayo ni con que valores. Aca no hubo todavia un
// rojo asi, pero la clase esta: `pruebas/aserciones-con-evidencia.mjs` la mide en el arbol y la
// publica en cada corrida del job `aserciones-con-evidencia` de ci.yml.
//
// UNA SOLA COPIA, COMPARTIDA. En Rigel esto nacio dentro de un banco y despues se saco para que
// fuera de todos: una copia por banco es la divergencia que el marco prohibe en todo lo demas.
// ---------------------------------------------------------------------------

import { inspect } from "node:util";

/** Cuanto de la evidencia entra en el mensaje antes de recortarse. */
export const TOPE = 4000;

/**
 * Compone `motivo` + la evidencia, recortando por el FINAL.
 *
 * SE RECORTA CONSERVANDO EL FINAL a proposito: la salida de un paso es larga, un mensaje que no
 * entra en el log del runner no sirve de nada, y el veredicto de un paso esta al final. Recortar
 * por el principio tiraria justo lo que se busca.
 *
 * Y el recorte SE DICE, con el largo original: un texto cortado en silencio se lee como el texto
 * completo, y quien investiga concluye que algo «no aparece» cuando lo que pasa es que no se
 * imprimio.
 *
 * Lo que no es cadena se serializa, y como depende de QUE es:
 *
 *   · un objeto plano o un arreglo, como JSON indentado —un objeto impreso con `String()` dice
 *     `[object Object]`, que no es evidencia de nada—;
 *   · todo lo demas, con `util.inspect`. Un `Error` por JSON sale `{}` —el mensaje y el stack
 *     no son propiedades enumerables— y un `Map` o un `Set` tambien. Y lo que JSON no puede
 *     serializar SE ROMPE: un objeto circular o un BigInt hacen que `JSON.stringify` lance, y
 *     la asercion terminaba en un TypeError en vez de en su motivo. Por eso el JSON va con red:
 *     si lanza, tambien cae a `inspect`.
 */
function serializar(evidencia) {
  if (typeof evidencia === "string") return evidencia;
  const plano =
    evidencia !== null &&
    typeof evidencia === "object" &&
    (Array.isArray(evidencia) || [Object.prototype, null].includes(Object.getPrototypeOf(evidencia)));
  if (plano || typeof evidencia === "number" || typeof evidencia === "boolean" || evidencia === null) {
    try {
      const json = JSON.stringify(evidencia, null, 2);
      if (json !== undefined) return json;
    } catch {
      // Circular, o un BigInt adentro: lo dice inspect, que no lanza.
    }
  }
  return inspect(evidencia, { depth: 6, breakLength: 100 });
}

export function porque(motivo, evidencia) {
  const texto = serializar(evidencia);
  const recortada = texto.length > TOPE ? `[...recortado, ${texto.length} caracteres]\n${texto.slice(-TOPE)}` : texto;
  return `${motivo}\n\n--- la evidencia ---\n${recortada}`;
}
