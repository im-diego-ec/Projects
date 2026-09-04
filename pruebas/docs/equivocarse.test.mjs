import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { LO_QUE_ESCRIBE_EL_ASISTENTE } from "../../herramientas/projects-init.mjs";
import { esVolver } from "../../herramientas/projects-asistente.mjs";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const GUIA = fs.readFileSync(path.join(RAIZ, "docs/04-arrancar-acompanado.md"), "utf8");
const INIT = fs.readFileSync(path.join(RAIZ, "herramientas/projects-init.mjs"), "utf8");

// ---------------------------------------------------------------------------
// EQUIVOCARSE EN UNA RESPUESTA NO ESTABA ESCRITO EN NINGUN LADO.
//
// El asistente RETOMA las respuestas anteriores desde que existe: guarda
// `.projects-respuestas.json` al lado del archivo de valores y, al volver a
// correrlo, ofrece cada una como valor por defecto. Funciona, esta medido, y un
// grep de "me equivoque" sobre docs/ devolvia VACIO.
//
// Una capacidad que existe y que nadie sabe que existe no existe. Y el hueco
// caia justo en el momento de mas ansiedad: alguien que acaba de contestar nueve
// preguntas y se dio cuenta de que una esta mal.
// ---------------------------------------------------------------------------

test("la guia lo cuenta, y para los DOS momentos en que uno se da cuenta", () => {
  assert.match(GUIA, /Si te equivocaste en una respuesta/, "la guia no tiene la seccion");
  assert.match(GUIA, /Antes de armar el proyecto/, "no cubre el caso de antes de armarlo");
  assert.match(GUIA, /Después de armar el proyecto/, "no cubre el caso de despues, que es el dificil");
});

test("lo que la guia promete es lo que la herramienta IMPRIME, palabra por palabra", () => {
  // Si divergen, la persona busca en pantalla una frase que no esta y concluye
  // que el mecanismo no existe.
  const enLaHerramienta = /Retomando lo que contestaste antes/;
  assert.match(INIT, enLaHerramienta, "la herramienta dejo de anunciar que retoma las respuestas");
  assert.match(GUIA, enLaHerramienta, "la guia no cita la frase que la persona va a ver en pantalla");
  assert.match(INIT, /Enter mantiene cada respuesta/, "la herramienta dejo de decir que Enter mantiene");
  assert.match(GUIA, /Enter mantiene cada respuesta/, "la guia no lo cita");
});

test("la palabra para retroceder que la guia enseña es una de las que el asistente acepta", () => {
  // Enseniar una palabra que el asistente no reconoce es peor que no enseniar
  // ninguna: la persona la escribe, se toma como respuesta, y encima queda mal.
  const enseniada = /escribir `(\w+)` para retroceder/.exec(GUIA)?.[1];
  assert.ok(enseniada, "la guia no enseña ninguna palabra para retroceder");
  // Se le pregunta AL ASISTENTE con su propia funcion, no a una lista copiada
  // aca: una copia se queda vieja el dia que la palabra cambie.
  assert.ok(esVolver(enseniada), `la guia enseña "${enseniada}" y el asistente no lo reconoce: se tomaria como respuesta`);
  assert.ok(!esVolver("cualquier-cosa"), "esVolver acepta cualquier cosa: la comprobacion de arriba no prueba nada");
});

test("el archivo que la guia manda a abrir es uno que la herramienta escribe", () => {
  const nombrados = [...GUIA.matchAll(/`(\.projects-[\w-]+\.json)`/g)].map((m) => m[1]);
  assert.ok(nombrados.length >= 2, `la guia nombra ${nombrados.length} archivos del asistente: la guarda mediria poco`);
  for (const n of new Set(nombrados)) {
    assert.ok(LO_QUE_ESCRIBE_EL_ASISTENTE.has(n), `la guia manda a abrir ${n}, que la herramienta no escribe`);
  }
});

test("avisa del riesgo de reemplazar un valor corto", () => {
  // Es el unico consejo de esta seccion que puede romper un proyecto si se sigue
  // a ciegas: un nombre de usuario de tres letras aparece en cualquier lado.
  assert.match(GUIA, /valores muy cortos/i, "no avisa del riesgo de la busqueda y reemplazo");
  assert.match(GUIA, /una por una/, "no dice que hay que mirar cada coincidencia");
});

test("nombra los tres lanzadores, porque la persona abrio uno de los tres", () => {
  const i = GUIA.indexOf("Si te equivocaste en una respuesta");
  const seccion = GUIA.slice(i, GUIA.indexOf("## Paso 5 —", i));
  for (const l of ["arrancar.sh", "arrancar.cmd", "arrancar.command"]) {
    assert.ok(seccion.includes(l), `la seccion no nombra ${l}: quien usa ese sistema no sabe que archivo abrir`);
  }
});
