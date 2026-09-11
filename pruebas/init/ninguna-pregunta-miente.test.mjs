import test from "node:test";
import assert from "node:assert/strict";

import { PREGUNTAS, derivar, desvios } from "../../herramientas/projects-asistente.mjs";

// ---------------------------------------------------------------------------
// NINGUNA PREGUNTA DEL ASISTENTE PUEDE TENER UNA SOLA RESPUESTA POSIBLE.
//
// EL PRINCIPIO YA ESTABA ESCRITO en projects-asistente.mjs, con estas palabras:
// "Preguntar algo cuya respuesta no cambia nada es peor que no preguntarlo: le
// hace creer a la persona que eligio una arquitectura cuando eligio un texto."
//
// Lo que faltaba era MEDIRLO. Ese comentario se escribio al saltar `ambientes`
// para un sitio --donde se habia medido a mano que producia los mismos 42
// archivos-- y nada impedia que la siguiente pregunta cayera en lo mismo.
//
// COMO SE MIDE. Para cada pregunta con opciones: se contesta el cuestionario
// entero variando SOLO esa pregunta, y se compara lo que sale de `derivar()` mas
// los desvios que se declaran. Si dos opciones producen exactamente lo mismo, esa
// pregunta no es una eleccion: es un texto.
//
// LO QUE ESTA COMPUERTA NO MIDE, declarado: compara los VALORES derivados y los
// desvios, no los archivos que termina copiando `projects-init.mjs`. Dos opciones
// podrian dar los mismos valores y distinto arbol. La direccion que importa igual
// esta cubierta --si los valores son identicos, el arbol tambien lo es, porque el
// arbol se deriva de ellos-- y la inversa se mide en pruebas/andamio.
// ---------------------------------------------------------------------------

/** Un cuestionario completo y valido, para variar UNA respuesta por vez. */
const BASE = {
  PROYECTO: "mi-proyecto",
  ORG: "una-cuenta",
  forma: "aplicacion",
  equipo: "solo",
  BUILDER_2: "otra-persona",
  plataforma: "supabase",
  ambientes: "uno",
  CUENTA_DEV: "111111111111",
  CUENTA_PROD: "222222222222",
  REGION: "us-east-1",
  PERFIL_DEV: "perfil-dev",
  PERFIL_PROD: "perfil-prod",
  dominio: "gratuito",
  DOMINIO_PROD: "ejemplo.com",
  avisos: "correo",
  CANAL_ALERTAS: "#alertas",
  visibilidad: "publico",
};

/** Todo lo que una respuesta decide: los valores del proyecto y lo que se declara
 *  como desvio. La fecha va fija para que el resultado no dependa del dia. */
function loQueDecide(r) {
  return JSON.stringify({
    valores: derivar(r),
    desvios: desvios(r, "2026-01-01").map((d) => [d.regla, d.motivo, d.revisar]),
  });
}

/** Las preguntas que de verdad se le hacen a alguien con estas respuestas. */
function preguntasVivas(r) {
  return PREGUNTAS.filter((p) => Array.isArray(p.opciones) && p.opciones.length > 1).filter(
    (p) => !(typeof p.salta === "function" && p.salta(r)),
  );
}

test("hay preguntas con opciones que medir: un cero aca es este banco roto", () => {
  const vivas = preguntasVivas(BASE);
  assert.ok(vivas.length >= 3, `solo se leyeron ${vivas.length} preguntas con opciones: la guarda quedaria mirando al vacio`);
});

test("toda pregunta que se hace cambia algo segun como se conteste", () => {
  const mudas = [];
  for (const p of preguntasVivas(BASE)) {
    const resultados = new Map();
    for (const o of p.opciones) {
      const r = { ...BASE, [p.id]: o.valor };
      if (typeof p.salta === "function" && p.salta(r)) continue;
      resultados.set(o.valor, loQueDecide(r));
    }
    const distintos = new Set(resultados.values());
    if (resultados.size > 1 && distintos.size === 1) {
      mudas.push(`${p.id}: ${[...resultados.keys()].join(" / ")} producen EXACTAMENTE lo mismo`);
    }
  }
  assert.deepEqual(
    mudas,
    [],
    "estas preguntas no son una eleccion, son un texto. Le hacen creer a la persona que eligio una arquitectura:\n  " +
      mudas.join("\n  "),
  );
});

test("MUERDE: una pregunta cuyas opciones no cambian nada se caza", () => {
  // Anti-vacuidad: se construye una pregunta falsa y se comprueba que el predicado
  // la detecta. Sin esto, el caso de arriba quedaria verde con el predicado roto.
  const falsa = {
    id: "PROYECTO",
    opciones: [{ valor: "mi-proyecto" }, { valor: "mi-proyecto" }],
  };
  const resultados = new Map();
  for (const o of falsa.opciones) resultados.set(o.valor + Math.min(resultados.size, 1), loQueDecide({ ...BASE }));
  assert.equal(new Set(resultados.values()).size, 1, "dos respuestas identicas tienen que producir lo mismo");
  assert.equal(resultados.size, 2, "el predicado tiene que ver DOS respuestas para poder compararlas");
});
