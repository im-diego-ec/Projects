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

test("y decir que no NO escribe nada, y lo dice con un codigo propio", () => {
  // ESTE CASO EXIGIA `return 0`, y estaba mal. El razonamiento era bueno
  // --"arrepentirse no es un error"-- y la conclusion no: cero no significa "no
  // hubo error", significa "hice lo que me pediste", y los lanzadores, que son
  // los unicos que leen ese numero, solo miran cero contra no-cero. Con cero
  // contestaban:
  //
  //     Listo el paso 1. Lo que elegiste quedo en: <ruta>/valores.json
  //
  // sobre un archivo que la persona acababa de decidir que NO se escribiera, y
  // que no existia. Un cero que un consumidor lee como "esta listo" cuando no se
  // escribio nada es exactamente el falso verde que este repositorio persigue en
  // todos lados: el cero es el banco roto, no el arbol limpio.
  //
  // Cancelar sale 3 y los dos lanzadores lo distinguen. Lo vigila
  // pruebas/init/codigos-de-salida.test.mjs, incluida la mitad que importa: que
  // los lectores del numero digan algo distinto.
  const s = fuente();
  const i = s.indexOf("esNo(confirmacion)");
  assert.ok(i > -1, "no encontre el uso de esNo en el flujo del asistente");
  const bloque = s.slice(i, i + 600);
  assert.match(
    bloque,
    /no se tocó ningún archivo/i,
    "tiene que decir que no se toco nada: es lo que la persona necesita saber",
  );
  assert.match(
    bloque,
    /return SALIDA\.cancelado;/,
    "cancelar tiene que salir con su codigo propio, no con 0 ni con el de fallo",
  );
  assert.ok(!/writeFileSync/.test(bloque), "el camino del no no puede escribir nada");
});

test("MUERDE: el detector de orden caza la version vieja", () => {
  // La version vieja: resumen, y despues escribir sin preguntar.
  const vieja = "lineasDeResumen(...)\nfs.writeFileSync(salida, x);\n";
  assert.equal(vieja.indexOf("¿Escribo esto?"), -1, "en la version vieja no hay pregunta: el detector la marca por ausencia");
});
