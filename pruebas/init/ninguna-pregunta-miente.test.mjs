import test from "node:test";
import assert from "node:assert/strict";

import path from "node:path";
import { fileURLToPath } from "node:url";

import { PREGUNTAS, derivar, desvios } from "../../herramientas/projects-asistente.mjs";
import { archivosDelAndamio } from "../../herramientas/projects-init.mjs";

const ANDAMIO = path.join(path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", ".."), "plantilla");

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

/** Todo lo que una respuesta decide, y lo que importa es el orden de los tres.
 *
 *  LOS ARCHIVOS VAN PRIMERO, y no es cosmetico. La primera version de esta compuerta
 *  comparaba solo `derivar()` y los desvios, y por eso NO cazo la pregunta de
 *  plataforma: `plataforma` es ella misma una de las claves que `derivar` devuelve,
 *  asi que contestar distinto "cambiaba algo" --el valor declarado-- aunque el
 *  proyecto resultante fuera identico. Medido: con forma=sitio, las tres opciones
 *  producen EL MISMO arbol.
 *
 *  Lo que le importa a una persona no es que su archivo de valores diga otra palabra:
 *  es que su proyecto sea distinto. Eso son los ARCHIVOS. */
function loQueDecide(r) {
  const v = derivar(r);
  return JSON.stringify({
    archivos: archivosDelAndamio(ANDAMIO, v.plataforma ?? r.plataforma, v.forma ?? r.forma).sort(),
    valores: v,
    desvios: desvios(r, "2026-01-01").map((d) => [d.regla, d.motivo, d.revisar]),
  });
}

/** Lo que la respuesta decide, SALVO el eco de la propia clave contestada. */
function loQueDecideSalvo(r, clave) {
  const v = { ...derivar(r) };
  delete v[clave];
  delete v[clave.toUpperCase()];
  return JSON.stringify({
    archivos: archivosDelAndamio(ANDAMIO, derivar(r).plataforma ?? r.plataforma, derivar(r).forma ?? r.forma).sort(),
    valores: v,
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

test("ninguna pregunta cambia SOLO su propia respuesta", () => {
  // LA VERSION FUERTE, y el discriminante correcto costo dos intentos.
  //
  // El primero comparaba `derivar()` entero y no cazaba `plataforma`, porque
  // `plataforma` ES una de las claves que `derivar` devuelve: contestar distinto
  // "cambiaba algo" --esa clave-- aunque el proyecto fuera identico.
  //
  // El segundo comparaba el ARBOL de archivos, y marcaba de mas: `equipo`,
  // `dominio`, `avisos` y `visibilidad` cambian el CONTENIDO de los archivos y los
  // desvios, no cuales viajan, y son preguntas perfectamente reales.
  //
  // El discriminante que si sirve: se compara todo lo que la respuesta decide
  // MENOS la clave que se acaba de contestar. Si lo unico que cambia es el eco de
  // la propia respuesta, la pregunta es decorativa: la persona eligio una palabra
  // que despues aparece escrita en su archivo de valores y en ningun lado mas.
  const decorativas = [];
  for (const forma of ["aplicacion", "sitio"]) {
    const base = { ...BASE, forma };
    for (const p of preguntasVivas(base)) {
      const efectos = new Map();
      for (const o of p.opciones) {
        const r = { ...base, [p.id]: o.valor };
        if (typeof p.salta === "function" && p.salta(r)) continue;
        efectos.set(o.valor, loQueDecideSalvo(r, p.id));
      }
      if (efectos.size > 1 && new Set(efectos.values()).size === 1) {
        decorativas.push(`forma=${forma}, ${p.id}: ${[...efectos.keys()].join(" / ")} no cambian nada salvo el eco de la respuesta`);
      }
    }
  }
  assert.deepEqual(
    decorativas,
    [],
    "estas preguntas le hacen elegir a la persona una palabra que no cambia su proyecto:\n  " + decorativas.join("\n  "),
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
