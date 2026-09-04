import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { esNo } from "../../herramientas/projects-asistente.mjs";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const INIT = path.join(RAIZ, "herramientas/projects-init.mjs");

// ---------------------------------------------------------------------------
// EL RESUMEN QUE NO SE PODIA RECHAZAR.
//
// EL DEFECTO, y estaba escrito en el propio codigo: el comentario de
// `lineasDeResumen` dice, con todas las letras, que el resumen existe «para que
// la persona pueda arrepentirse» — y las TRES LINEAS SIGUIENTES eran
// `writeFileSync`. Mostraba lo elegido y escribia igual.
//
// Un resumen que no se puede rechazar no es un resumen: es un aviso. Y peor,
// promete algo que no da.
//
// LO QUE ESTE BANCO MIDE ES EL ORDEN, que es donde vivia el defecto: la pregunta
// tiene que estar ANTES de la primera escritura. Comprobar que la pregunta
// "existe" no alcanza: existia el resumen y escribia igual.
// ---------------------------------------------------------------------------

const fuente = () => fs.readFileSync(INIT, "utf8");

test("el default es que SI: quien llego hasta aca ya contesto todo", () => {
  for (const si of ["", "  ", "si", "sí", "dale", "s"]) {
    assert.ok(!esNo(si), `"${si}" no puede leerse como un no: Enter tiene que escribir`);
  }
});

test("y el NO existe en las formas que alguien escribiria", () => {
  for (const no of ["no", "n", "NO", "  no  ", "cancelar", "salir"]) {
    assert.ok(esNo(no), `"${no}" tendria que cancelar`);
  }
});

test("LA PREGUNTA VA ANTES DE LA PRIMERA ESCRITURA: ahi vivia el defecto", () => {
  const s = fuente();
  const pregunta = s.indexOf("¿Escribo esto?");
  assert.ok(pregunta > -1, "no encontre la confirmacion: si se reescribio, actualiza este banco en el mismo cambio");

  // La primera escritura del archivo de valores, despues del asistente.
  const escritura = s.indexOf("fs.writeFileSync(salida,", pregunta - 6000 > 0 ? pregunta - 6000 : 0);
  assert.ok(escritura > -1, "no encontre la escritura del archivo de valores");
  assert.ok(
    pregunta < escritura,
    "la confirmacion quedo DESPUES de escribir: el resumen vuelve a ser un aviso y no una decision",
  );
});

test("y decir que no NO escribe nada, ni sale con error", () => {
  const s = fuente();
  const i = s.indexOf("esNo(confirmacion)");
  assert.ok(i > -1, "no encontre el uso de esNo en el flujo del asistente");
  const bloque = s.slice(i, i + 400);
  assert.match(bloque, /no se tocó ningún archivo/i, "tiene que decir que no se toco nada: es lo que la persona necesita saber");
  assert.match(bloque, /return 0;/, "arrepentirse NO es un error: tiene que salir cero");
  assert.ok(!/writeFileSync/.test(bloque), "el camino del no no puede escribir nada");
});

test("MUERDE: el detector de orden caza la version vieja", () => {
  // La version vieja: resumen, y despues escribir sin preguntar.
  const vieja = 'lineasDeResumen(...)\nfs.writeFileSync(salida, x);\n';
  assert.equal(vieja.indexOf("¿Escribo esto?"), -1, "en la version vieja no hay pregunta: el detector la marca por ausencia");
});
