// Banco del MODO AVISO de la condicion 5 del modo "cableado" (residuo A01).
//
// POR QUE EXISTE ESTE ARCHIVO. La condicion 5 promete una propiedad sobre un
// CAMINO —del job de la compuerta, por cada eslabon de needs, hasta el check run
// cuyo nombre exige el ruleset— y lo que verifica es un patron sintactico sobre un
// nodo. La cuarta ronda lo midio con un oraculo semantico independiente: 70 falsos
// verdes sobre 2928 casos generados, UNA sola clase. Su representante mas corto es
// el fixture de abajo: un paso de "ci-ok" cuyo `if` NOMBRA
// needs.<job>.result satisface el patron SALTEANDOSE — cuando la constitucion
// falla, ese paso se saltea, el job concluye success y el rojo no llega al check
// requerido.
//
// La decision del Builder 1 del 2026-08-21, con el change rojo-primero ya en main: A01
// no se intenta cerrar. Se DECLARA en modo aviso. Una regla sin compuerta sigue
// siendo valida, pero deja de presentarse como enforzada. Este banco fija las dos
// mitades de esa decision, y las dos importan:
//
//   · lo que la condicion 5 NO puede decidir (que el rojo se cobre de verdad) sale
//     por ::warning:: con el residuo NOMBRADO, y nunca mas por ::error::;
//   · lo que SI se decide sintacticamente —que exista el check run del veredicto,
//     que dependa del job por needs, que declare if: always(), y las condiciones 1
//     a 4— sigue siendo ROJO. Aflojar eso seria cambiar de tema.
//
// El rojo previo, medido el 2026-08-21 sobre fc7628a con este mismo archivo: el
// caso del `if` que se saltea daba estado "al-dia" y CERO hallazgos de nivel
// warning (el residuo no estaba nombrado en ninguna parte de la salida), y el caso
// sin consulta daba estado "rojo" con ::error:: sobre la parte que el check no
// puede decidir.
import { test } from "node:test";
import assert from "node:assert/strict";

import { evaluarCableado, invocacionesDe, DIR_WORKFLOWS } from "../cableado.mjs";

const JOB_COMPUERTA = `  constitucion:
    name: constitucion
    runs-on: ubuntu-latest
    steps:
      - uses: ./actions/constitucion
        with:
          modo: verificar
`;

const ci = (veredicto) => `name: CI
on:
  pull_request:
jobs:
${JOB_COMPUERTA}${veredicto}`;

/** El veredicto que cobra el rojo de verdad: un paso vivo que lo compara y falla. */
const VEREDICTO_QUE_COBRA = `  ci_ok:
    name: ci-ok
    needs: [constitucion]
    if: always()
    runs-on: ubuntu-latest
    steps:
      - run: '[ "\${{ needs.constitucion.result }}" = "success" ] || exit 1'
`;

/**
 * EL FIXTURE DEL RESIDUO A01, y es el representante de la clase medida: el paso
 * consulta needs.<job>.result en su `if`. El patron sintactico queda satisfecho y
 * la propiedad del camino NO: con la compuerta en rojo, el `if` es falso, el paso
 * se saltea y el job sale verde.
 */
const VEREDICTO_QUE_SE_SALTEA = `  ci_ok:
    name: ci-ok
    needs: [constitucion]
    if: always()
    runs-on: ubuntu-latest
    steps:
      - if: \${{ needs.constitucion.result == 'success' }}
        run: echo verde
`;

/** Un veredicto que no consulta nada: corre con always() y sale verde igual. */
const VEREDICTO_MUDO = `  ci_ok:
    name: ci-ok
    needs: [constitucion]
    if: always()
    runs-on: ubuntu-latest
    steps:
      - run: echo verde
`;

/** Sin if: always(): cuando la compuerta falla el veredicto queda SALTEADO, y un
 *  job salteado reporta Success. Es sintactico y decidible, asi que sigue rojo. */
const VEREDICTO_SIN_ALWAYS = `  ci_ok:
    name: ci-ok
    needs: [constitucion]
    runs-on: ubuntu-latest
    steps:
      - run: '[ "\${{ needs.constitucion.result }}" = "success" ] || exit 1'
`;

/** Sin ningun check run llamado ci-ok: decidible, sigue rojo. */
const SIN_VEREDICTO = `  otro:
    name: cualquier-cosa
    needs: [constitucion]
    if: always()
    runs-on: ubuntu-latest
    steps:
      - run: '[ "\${{ needs.constitucion.result }}" = "success" ] || exit 1'
`;

/** El veredicto existe y no cuelga de la compuerta: decidible, sigue rojo. */
const VEREDICTO_SIN_NEEDS = `  ci_ok:
    name: ci-ok
    if: always()
    runs-on: ubuntu-latest
    steps:
      - run: echo verde
`;

function veredictoDe(texto, { adopto = true } = {}) {
  return evaluarCableado({
    archivos: [{ ruta: `${DIR_WORKFLOWS}/ci.yml`, rastreado: true, texto }],
    adopto,
    distribuye: false,
    scaffoldCablea: { cablea: false },
  });
}

const niveles = (resultado, nivel) => resultado.hallazgos.filter((h) => h.nivel === nivel);
const codigos = (resultado) => resultado.hallazgos.map((h) => h.codigo);
const texto = (resultado) => resultado.hallazgos.map((h) => `::${h.nivel}:: ${h.mensaje}`).join("\n");

// ---------------------------------------------------------------------------
// CONTROL POSITIVO del arnes. Sin esto, todo lo de abajo puede estar midiendo un
// fixture que el lector ni ve: la ronda pasada se perdio entera por un control
// roto que nadie miro.
// ---------------------------------------------------------------------------

test("control positivo · el arnes ve UNA invocacion en cada fixture", () => {
  for (const veredicto of [
    VEREDICTO_QUE_COBRA,
    VEREDICTO_QUE_SE_SALTEA,
    VEREDICTO_MUDO,
    VEREDICTO_SIN_ALWAYS,
    SIN_VEREDICTO,
    VEREDICTO_SIN_NEEDS,
  ]) {
    const halladas = invocacionesDe([{ ruta: `${DIR_WORKFLOWS}/ci.yml`, texto: ci(veredicto), rastreado: true }], "main");
    assert.equal(halladas.length, 1, `el fixture no produjo una sola invocacion: ${JSON.stringify(halladas)}`);
  }
});

test("control positivo · el cableado que cobra el rojo sigue contando", () => {
  const resultado = veredictoDe(ci(VEREDICTO_QUE_COBRA));
  assert.equal(niveles(resultado, "error").length, 0, texto(resultado));
});

// ---------------------------------------------------------------------------
// EL RESIDUO, NOMBRADO EN LA SALIDA. Es la mitad que Builder 1 pidio explicita: el
// residuo no vale escrito en un comentario del codigo, tiene que salir por donde
// alguien lo lea.
// ---------------------------------------------------------------------------

test("A01 · el residuo del camino se nombra en la salida del propio paso", () => {
  const resultado = veredictoDe(ci(VEREDICTO_QUE_COBRA));
  const residuo = resultado.hallazgos.find((h) => h.codigo === "residuo-camino");
  assert.ok(residuo, `ningun hallazgo nombra el residuo del camino:\n${texto(resultado)}`);
  assert.equal(residuo.nivel, "warning", texto(resultado));
  assert.match(residuo.mensaje, /70/, "el residuo tiene que citar la medicion, no describirla en general");
  assert.match(residuo.mensaje, /2928/, "el residuo tiene que citar el denominador de la medicion");
});

test("A01 · el residuo tambien se nombra cuando el patron da POR BUENO el camino", () => {
  // Este es el falso verde medido: el `if` del paso satisface el patron
  // salteandose. El check no lo puede distinguir, y justamente por eso el residuo
  // tiene que estar en la salida de la corrida que sale verde.
  const resultado = veredictoDe(ci(VEREDICTO_QUE_SE_SALTEA));
  assert.equal(niveles(resultado, "error").length, 0, texto(resultado));
  assert.ok(
    resultado.hallazgos.some((h) => h.codigo === "residuo-camino" && h.nivel === "warning"),
    `la corrida verde no nombro el residuo:\n${texto(resultado)}`,
  );
});

test("A01 · el residuo no ensucia el estado del REPO: es un limite del check", () => {
  // `estado` describe al repositorio ("al-dia", "aviso", "rojo"), no la honestidad
  // del check. Si el residuo lo moviera, todo repo sano quedaria en "aviso" para
  // siempre y el aviso dejaria de significar "aca hay algo que arreglar".
  const resultado = veredictoDe(ci(VEREDICTO_QUE_COBRA));
  assert.equal(resultado.estado, "al-dia", texto(resultado));
});

// ---------------------------------------------------------------------------
// LO QUE DEJA DE SER ROJO, con su residuo en el mensaje.
// ---------------------------------------------------------------------------

test("A01 · un veredicto que no consulta el resultado es AVISO, no rojo", () => {
  const resultado = veredictoDe(ci(VEREDICTO_MUDO));
  assert.equal(resultado.estado, "aviso", texto(resultado));
  assert.equal(niveles(resultado, "error").length, 0, texto(resultado));
  const hallazgo = resultado.hallazgos.find((h) => h.codigo === "camino-sin-cobrar");
  assert.ok(hallazgo, `falta el hallazgo del camino sin cobrar:\n${texto(resultado)}`);
  assert.equal(hallazgo.nivel, "warning", texto(resultado));
  assert.match(
    hallazgo.mensaje,
    /modo aviso/i,
    "el mensaje tiene que decir que esto es modo aviso y no una compuerta",
  );
});

// ---------------------------------------------------------------------------
// LO QUE NO SE AFLOJA. Tres condiciones decidibles sintacticamente: siguen rojas.
// ---------------------------------------------------------------------------

for (const [nombre, veredicto] of [
  ["sin if: always() en el veredicto", VEREDICTO_SIN_ALWAYS],
  ["sin ningun check run del veredicto", SIN_VEREDICTO],
  ["el veredicto no cuelga de la compuerta", VEREDICTO_SIN_NEEDS],
]) {
  test(`A01 · lo decidible sigue ROJO: ${nombre}`, () => {
    const resultado = veredictoDe(ci(veredicto));
    assert.equal(resultado.estado, "rojo", texto(resultado));
    assert.ok(niveles(resultado, "error").length > 0, texto(resultado));
  });
}

test("A01 · las condiciones 1 a 4 siguen rojas: un archivo sin rastrear no cuenta", () => {
  const resultado = evaluarCableado({
    archivos: [{ ruta: `${DIR_WORKFLOWS}/ci.yml`, rastreado: false, texto: ci(VEREDICTO_QUE_COBRA) }],
    adopto: true,
    distribuye: false,
    scaffoldCablea: { cablea: false },
  });
  assert.equal(resultado.estado, "rojo", texto(resultado));
});

test("A01 · las condiciones 1 a 4 siguen rojas: el modo escribir no es verificar", () => {
  const resultado = veredictoDe(ci(VEREDICTO_QUE_COBRA).replace("modo: verificar", "modo: escribir"));
  assert.equal(resultado.estado, "rojo", texto(resultado));
});

test("A01 · un repo que todavia no adopto sigue en aviso y no en rojo", () => {
  const resultado = veredictoDe(ci(VEREDICTO_MUDO), { adopto: false });
  assert.equal(resultado.estado, "aviso", texto(resultado));
  assert.ok(codigos(resultado).length > 0);
});
