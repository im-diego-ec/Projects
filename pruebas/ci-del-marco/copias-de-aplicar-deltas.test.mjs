// LAS DOS COPIAS DEL UNICO PROGRAMA QUE ESCRIBE EL CONTRATO NO PUEDEN DIVERGIR.
//
// QUE PIEZA ES. `aplicar-deltas.mjs` es el unico programa del marco que ESCRIBE
// en `openspec/specs/**`, o sea el contrato vigente, y lo hace REEMPLAZANDO
// requirements completos: lo que el delta no repite, se pierde. Un defecto suyo
// no rompe ningun pipeline — borra contrato en silencio, que es exactamente el
// fallo que la skill existe para evitar.
//
// POR QUE ESTE CASO. Vive versionado DOS VECES: la copia del propio repo y la
// que viaja al consumidor dentro del andamio. Medido hoy, las dos son identicas
// modulo espacios (la del andamio esta pasada por el formateador que el andamio
// configura y el marco no), o sea CERO divergencia de logica. Lo que faltaba era
// algo que lo impidiera manana: el dia que alguien arregle un defecto en una
// copia, la otra —la que llega a todos los consumidores— se queda con el, y nada
// lo dice. Este caso es ese algo.
//
// QUE NO CIERRA, declarado y sin disimulo: la comparacion es de TEXTO. No hay
// banco de casos para el programa —los ocho que su propia SKILL.md enumera
// siguen verificados a mano y esa deuda no es de este archivo—, asi que lo que
// queda acreditado es "las dos copias dicen lo mismo", no "lo que dicen es
// correcto". Es la mitad barata del problema y la que se degrada sola.
//
// Y "modulo espacios" es MAS ANCHO de lo que suena, tambien declarado: la
// normalizacion borra TODO espacio, incluido el que va DENTRO de los literales
// de cadena. Dos copias cuyo unico desvio sea el espaciado interno de un mensaje
// —"no existe  el requirement" contra "no existe el requirement"— pasan en
// verde. Se tolera a proposito porque el formateador reindenta y parte cadenas,
// y distinguir su reescritura de una edicion a mano exigiria parsear el
// programa; lo que NO puede pasar desapercibido, y no pasa, es cualquier
// divergencia que cambie un identificador, un operador o el orden del codigo.
//
// POR QUE VIVE ACA. El archivo comparado no esta en ninguna de las carpetas que
// ya tienen banco: no es una action, no es un paso inline de un workflow y no es
// parte del andamio de codigo. Se puso junto a las otras invariantes derivadas
// del arbol, que es donde un lector busca "que se verifica del repo entero".
import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const NOMBRE = "aplicar-deltas.mjs";

/** Las copias rastreadas del programa, derivadas del arbol y no listadas a mano. */
function copiasRastreadas() {
  return execFileSync("git", ["-C", RAIZ, "ls-files", `*/${NOMBRE}`], { encoding: "utf8" })
    .split("\n")
    .filter(Boolean)
    .sort();
}

/**
 * El texto sin espacios ni saltos: es lo que iguala las dos ortografias del
 * formateador. Borra tambien el espacio INTERNO de los literales de cadena —el
 * limite declarado en el encabezado—, asi que una divergencia que solo mueva
 * espacios dentro de un mensaje no la ve.
 */
const normalizar = (texto) => texto.replace(/\s+/g, "");

const COPIAS = copiasRastreadas();

test("aplicar-deltas · el arbol sigue teniendo las copias que este caso compara", () => {
  // Una sola copia seria una BUENA noticia —el programa se unifico— pero este
  // caso dejaria de comparar nada y se quedaria en verde diciendolo. Asi que
  // cambia de significado en voz alta en vez de apagarse.
  assert.ok(
    COPIAS.length >= 2,
    `se encontraron ${COPIAS.length} copia(s) de ${NOMBRE} (${COPIAS.join(", ") || "ninguna"}). Si el programa se unifico en un solo lugar, este caso ya no tiene nada que comparar y se borra en ese mismo PR; si desaparecio, algo se rompio`,
  );
});

test("aplicar-deltas · todas las copias son el mismo programa modulo espacios", () => {
  const huellas = COPIAS.map((ruta) => ({
    ruta,
    huella: normalizar(readFileSync(join(RAIZ, ruta), "utf8")),
  }));
  const referencia = huellas[0];
  const distintas = huellas.filter((copia) => copia.huella !== referencia.huella).map((copia) => copia.ruta);
  assert.deepEqual(
    distintas,
    [],
    `estas copias de ${NOMBRE} ya no dicen lo mismo que ${referencia.ruta}: ${distintas.join(", ")}. Es el unico programa que escribe openspec/specs/** reemplazando requirements completos, asi que una divergencia entre la copia del marco y la que viaja al consumidor significa que un repo esta archivando con una version y el otro con otra. Arreglo: sincronizalas —la diferencia legitima es SOLO de formato— o, mejor, unifica el programa en un solo lugar y borra este caso`,
    );
});

test("aplicar-deltas · la diferencia entre las copias es SOLO de formato", () => {
  // Si algun dia las dos copias fueran identicas byte a byte, este caso se cae:
  // eso no seria un problema, seria la senal de que la razon por la que se
  // toleran dos copias —que una pasa por el formateador del andamio y la otra
  // no— dejo de existir, y entonces sobra una de las dos.
  const textos = COPIAS.map((ruta) => readFileSync(join(RAIZ, ruta), "utf8"));
  const iguales = textos.every((texto) => texto === textos[0]);
  assert.equal(
    iguales,
    false,
    `las ${COPIAS.length} copias de ${NOMBRE} son identicas byte a byte. La unica justificacion de tener dos era que el andamio las formatea distinto; sin esa diferencia, lo que queda es una copia de mas. Arreglo: dejar una sola`,
  );
});
