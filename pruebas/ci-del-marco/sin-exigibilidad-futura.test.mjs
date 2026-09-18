// EL MARCO NO SE CONCEDE VENTANAS DE GRACIA A SI MISMO POR DATOS.
//
// El contrato PERMITE que una version declare `exigible_desde` posterior a
// `publicada`: es una opcion de quien publica, y el change ventana-vencida la
// dejo viva a proposito (`hallazgoPorFecha` conserva sus dos ramas). Este banco no
// toca eso. Afirma algo mas chico y enteramente verificable: que **el marco no la
// usa**.
//
// POR QUE HACE FALTA ESCRIBIRLO. El change la-ventana-se-cierra borro la ultima
// ventana de gracia que el marco tenia en CODIGO (`VENTANA_DE_GRACIA_HASTA` en
// `cobertura-diff`, y la fecha que el input `ventana_terraform` de marco-ci.yml
// traia como default), y la decision D1 del PO dice que una compuerta nueva o
// endurecida se exige el dia que sale. Pero el mecanismo de la ventana de la
// constitucion sigue vivo, y basta una fecha en el manifiesto para reintroducir
// POR DATOS lo que se saco del codigo: sin tocar una linea de codigo, sin que el
// banco de las ventanas con dueno lo vea —mira constantes y workflows, no JSON— y
// sin que nada avise. Eso es un guardrail que depende de que alguien se acuerde,
// y el marco los prohibe.
//
// Viene de Rigel (change 2026-09-05-linea-v2, commit 771ba2c), donde se escribio
// junto con el borrado de la misma ventana de cobertura.
//
// LIMITE DECLARADO: esto mira el manifiesto del CANONICO, que es el unico
// calendario que el marco publica. No puede decir nada sobre lo que declare un
// consumidor en su propio arbol, y no lo pretende.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = resolve(AQUI, "..", "..");
const MANIFIESTO = join(RAIZ, "actions", "constitucion", "canonico", "manifiesto.json");

/**
 * Las entradas cuya exigibilidad se declara DESPUES de su publicacion.
 *
 * Se compara como cadena y no como fecha a proposito: el formato es AAAA-MM-DD,
 * que ordena igual lexicograficamente, y construir fechas mete husos horarios en
 * una comparacion que no los necesita. La forma del campo ya la valida
 * `validarManifiesto` (actions/constitucion/constitucion.mjs); si un dia dejara de
 * hacerlo, el caso rojo de abajo lo dice.
 */
function conExigibilidadFutura(manifiesto) {
  const versiones = Array.isArray(manifiesto?.versiones) ? manifiesto.versiones : [];
  return versiones.filter((v) => String(v?.exigible_desde ?? "") > String(v?.publicada ?? ""));
}

test("ninguna version del marco se declara exigible despues de publicada", () => {
  const manifiesto = JSON.parse(readFileSync(MANIFIESTO, "utf8"));
  const versiones = Array.isArray(manifiesto?.versiones) ? manifiesto.versiones : [];

  // "Cero entradas" jamas se reporta como exito: un manifiesto que no se pudo leer
  // o una clave renombrada dan la misma lista vacia que un manifiesto impecable, y
  // el banco quedaria verde sin haber mirado nada.
  assert.ok(
    versiones.length > 0,
    `el manifiesto ${MANIFIESTO} no declara ninguna version: esto es un archivo que no se pudo leer, no un marco sin versiones`,
  );

  const futuras = conExigibilidadFutura(manifiesto);
  assert.deepEqual(
    futuras,
    [],
    `estas versiones del marco se conceden una ventana de gracia: ${futuras
      .map((v) => `${v.version} (publicada ${v.publicada}, exigible ${v.exigible_desde})`)
      .join("; ")}. Lo que el marco publica se exige el mismo dia (decision D1 del PO; change la-ventana-se-cierra). ` +
      `Arreglo: escribi en esa entrada exigible_desde igual a publicada. El mecanismo sigue existiendo para quien lo ` +
      `necesite, pero el marco no lo usa, y usarlo es una decision que se discute en un change antes de escribirla: ` +
      `si ese change la aprueba, este banco se cambia en el mismo PR, con el motivo escrito`,
  );
});

// EL CASO ROJO DE ESTA COMPUERTA. Sin el, el caso de arriba pasaria igual con la
// comparacion invertida, con el filtro devolviendo siempre vacio, o con la clave
// mal escrita: seria verde sobre cero mediciones.
test("MUERDE: el detector encuentra la ventana cuando existe, y no la inventa cuando no", () => {
  const conVentana = {
    versiones: [
      { version: "1.0.0", publicada: "2026-01-01", exigible_desde: "2026-01-01" },
      { version: "1.1.0", publicada: "2026-09-06", exigible_desde: "2026-10-04" },
    ],
  };
  const encontradas = conExigibilidadFutura(conVentana);
  assert.equal(encontradas.length, 1, "no detecto la unica entrada con ventana");
  assert.equal(encontradas[0].version, "1.1.0");

  // El mismo manifiesto REAL, mutado: la ultima version se da cuatro semanas. Es
  // la forma exacta en que la ventana volveria, y tiene que verse sobre el archivo
  // que el banco lee de verdad, no solo sobre un fixture inventado.
  const real = JSON.parse(readFileSync(MANIFIESTO, "utf8"));
  const ultima = real.versiones[real.versiones.length - 1];
  const mutado = {
    ...real,
    versiones: [...real.versiones.slice(0, -1), { ...ultima, exigible_desde: "2999-12-31" }],
  };
  assert.deepEqual(
    conExigibilidadFutura(mutado).map((v) => v.version),
    [ultima.version],
    "con la ultima version del manifiesto real mutada a una exigibilidad futura, el detector no la vio",
  );

  // Y el simetrico: una fecha ANTERIOR a la publicacion no es una ventana. Es
  // invalida por otro motivo —una version no puede exigirse antes de existir— y de
  // eso ya se ocupa `validarManifiesto`. Contarla aca esconderia el error real
  // detras de un mensaje que habla de otra cosa.
  assert.deepEqual(
    conExigibilidadFutura({
      versiones: [{ version: "1.0.0", publicada: "2026-09-06", exigible_desde: "2026-01-01" }],
    }),
    [],
  );
});
