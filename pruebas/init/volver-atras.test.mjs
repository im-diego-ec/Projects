import test from "node:test";
import assert from "node:assert/strict";
import { correrAsistente, esVolver, PREGUNTAS } from "../../herramientas/projects-asistente.mjs";
import { FORMATOS } from "../../herramientas/projects-init.mjs";

// ---------------------------------------------------------------------------
// VOLVER A LA PREGUNTA ANTERIOR. Antes no se podia.
//
// EL DEFECTO, medido por la auditoria: la persona contestaba nueve preguntas y
// si en la septima se daba cuenta de que la tercera estaba mal, la UNICA salida
// era Ctrl+C --que ademas borraba todo lo contestado--. Se probaron cinco formas
// de decir "atras" y las cinco se rechazaron.
//
// Y NO ERA QUE FALTARA LA PALABRA: el bucle era un `for...of` SIN INDICE, o sea
// que no habia a donde volver. Pasa a ser indexado.
//
// DOS COLISIONES QUE ESTE BANCO FIJA, y las dos se descubrieron rompiendo cosas:
//
//   - `0` parecia natural en una pregunta de opciones numeradas. Un guion que
//     contesta "0" esperando el viejo rechazo pasaba a RETROCEDER, y retroceder
//     no agota el techo de reintentos: bucle infinito hasta que V8 se quedo sin
//     memoria.
//   - `b` es un handle de GitHub VALIDO --de una sola letra-- y el propio banco
//     del marco ya usaba `BUILDER_2: "b"`.
//
// Una colision aca no da un error: da un retroceso que la persona no pidio.
// ---------------------------------------------------------------------------

/** Un preguntador de guion: contesta lo que le toca, en orden. */
function guion(respuestas) {
  let i = 0;
  const vistas = [];
  // Los PROMPTS se guardan aparte de las lineas impresas: el "[Enter mantiene: x]"
  // viaja en el prompt --lo que se le pasa a `preguntar`-- y no por `decir`.
  // Buscarlo en lo impreso da un falso rojo sobre un comportamiento correcto.
  const prompts = [];
  return {
    vistas,
    prompts,
    preguntar: async (texto, id) => {
      vistas.push(id);
      prompts.push(texto);
      const r = respuestas[i] ?? "";
      i += 1;
      return typeof r === "function" ? r(id) : r;
    },
  };
}

test("las cuatro palabras se reconocen, y ninguna respuesta legitima lo hace", () => {
  for (const p of ["atras", "atrás", "volver", "<", "  ATRAS  ", "Volver"]) {
    assert.ok(esVolver(p), `"${p}" tendria que significar volver`);
  }
  // Las que salieron, y por que: colisionan con respuestas de verdad.
  for (const p of ["0", "b", "1", "mi-proyecto", "im-diego-ec", "x.com", ""]) {
    assert.ok(!esVolver(p), `"${p}" es una respuesta legitima y NO puede significar volver`);
  }
});

test("volver desde la pregunta 2 lleva a la 1, y lo que se conteste ahi reemplaza", async () => {
  const g = guion(["primero", "volver", "corregido", "mi-org", ...Array(30).fill("1")]);
  const r = await correrAsistente(g.preguntar, {}, FORMATOS, () => {}, { ORG_MARCO: "im-diego-ec" });
  assert.equal(g.vistas[0], PREGUNTAS[0].id, "la primera pregunta tiene que ser la primera");
  assert.equal(g.vistas[1], PREGUNTAS[1].id, "la segunda, la segunda");
  assert.equal(g.vistas[2], PREGUNTAS[0].id, "y despues de volver, otra vez la PRIMERA");
  assert.equal(r.respuestas[PREGUNTAS[0].id], "corregido", "tiene que quedar la respuesta NUEVA, no la vieja");
});

test("al avanzar de nuevo, lo ya contestado se ofrece: no hay que reescribirlo", async () => {
  // ES EL RECORRIDO TIPICO de volver: "me equivoque en la tercera". Se vuelve, se
  // corrige, y de ahi en adelante se avanza con Enter. Si volver borrara lo
  // contestado, habria que reescribir todo lo que ya estaba bien --y la primera
  // version de esto lo borraba--.
  // SE RETROCEDE DOS VECES a proposito. "Volver" se escribe EN LUGAR de contestar,
  // asi que la pregunta donde se escribe nunca queda contestada en esa pasada: la
  // conservacion se ve en las que quedaron DETRAS de la que se corrige.
  //
  //   Q1<-"primero"  Q2<-"segundo"  Q3<-volver(->Q2)  Q2<-volver(->Q1)
  //   Q1<-"corregido"  Q2<-Enter  => Q2 tiene que seguir siendo "segundo"
  const dicho = [];
  const g = guion(["primero", "segundo", "volver", "volver", "corregido", "", ...Array(30).fill("1")]);
  const r = await correrAsistente(g.preguntar, {}, FORMATOS, (l) => dicho.push(l), { ORG_MARCO: "im-diego-ec" });
  assert.equal(r.respuestas[PREGUNTAS[0].id], "corregido", "la primera quedo corregida");
  assert.equal(
    r.respuestas[PREGUNTAS[1].id],
    "segundo",
    "la segunda tiene que conservar lo que ya se habia contestado: el Enter la mantiene",
  );
  assert.match(
    g.prompts.join("\n"),
    /Enter mantiene: segundo/,
    "y tiene que OFRECERLA en el prompt, no solo guardarla: si no se ve, la persona la reescribe igual",
  );
});

test("en la PRIMERA pregunta, volver avisa en vez de romper", async () => {
  const dicho = [];
  const g = guion(["volver", "mi-proyecto", ...Array(30).fill("1")]);
  await correrAsistente(g.preguntar, {}, FORMATOS, (l) => dicho.push(l), { ORG_MARCO: "im-diego-ec" });
  assert.match(
    dicho.join("\n"),
    /no hay ninguna anterior/,
    "volver en la primera tiene que decir por que no se puede, no ignorarse",
  );
});

test("volver para siempre no cuelga: hay techo", async () => {
  // Es el modo de falla que colgo el banco entero. Retroceder sale del bucle
  // interno sin tocar su contador, asi que necesita un techo propio.
  const g = guion(Array(500).fill((id) => (id === PREGUNTAS[0].id ? "x" : "volver")));
  await assert.rejects(
    () => correrAsistente(g.preguntar, {}, FORMATOS, () => {}, { ORG_MARCO: "im-diego-ec" }),
    /se volvio atras 200 veces/,
    "sin techo, una fuente que conteste volver para siempre va y vuelve sin fin",
  );
});

test("MUERDE: sin la palabra, el guion de arriba habria contestado 'volver' como si fuera un nombre", () => {
  // Si `esVolver` dejara de reconocerla, "volver" pasaria a ser una respuesta mas
  // y este banco lo notaria por el resultado, no por una excepcion.
  assert.ok(esVolver("volver"), "el detector no reconoce su propia palabra: no protege nada");
});
