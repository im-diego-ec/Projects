import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

// ---------------------------------------------------------------------------
// UNA PROMESA QUE EL MARCO HACIA SEIS VECES Y NADIE PODIA SOSTENER.
//
// EL DEFECTO, medido el 2026-09-01. El marco afirmaba «sin tarjeta» en seis
// lugares --el asistente, dos README, dos guias y el documento de adaptadores--
// y ninguno tenia fuente vigente:
//
//   - De SUPABASE, la unica cita rastreable es un post de marzo de 2021 sobre el
//     pricing de la BETA, un esquema que ya no existe. Su pagina de precios de
//     hoy no lleva la frase.
//   - De CLOUDFLARE no la dice NINGUNA pagina: ni /plans, ni la de precios de
//     Workers, ni la guia de get-started. Se reviso una por una.
//
// POR QUE ESTA PROMESA EN PARTICULAR MERECE UN GUARD, y no es celo general: es
// la primera columna que mira alguien que no tiene tarjeta. Si es falsa, la
// persona no descubre el error leyendo --lo descubre despues de decidir, en el
// formulario de alta, con el proyecto ya armado--. Es el peor momento posible
// para enterarse, y el marco existe justamente para esa persona.
//
// LO QUE ESTE GUARD NO DICE: que la promesa sea falsa. Probablemente sea cierta
// en la practica. Dice que HOY NO SE PUEDE SOSTENER, y por eso no se afirma.
//
// COMO SE LEVANTA. Alguien da de alta una cuenta real de Cloudflare y otra de
// Supabase sin cargar tarjeta, anota la fecha, y agrega la constancia a
// VERIFICADAS con esa fecha. Media hora de trabajo, y la frase vuelve a todos
// lados. La lista esta abajo y esta vacia a proposito.
//
// LA DOCTRINA QUE CIERRA es la del propio repositorio: «que no quede en papel».
// Una promesa sin fuente es exactamente eso.
// ---------------------------------------------------------------------------

/** Las promesas de dinero que exigen constancia para poder escribirse. */
const PROMESAS = [
  /sin tarjeta/i,
  /no (?:te )?pide tarjeta/i,
  /sin (?:necesidad de |ingresar )?(?:una )?tarjeta/i,
  /no (?:hace falta|necesitas|necesitás) tarjeta/i,
];

/** Constancias de verificacion. Vacia a proposito: nadie dio de alta las cuentas
 *  todavia. Cada entrada seria { proveedor, fecha, quien } y habilita la frase. */
const VERIFICADAS = [];

/** Donde SI puede aparecer la frase, y por que.
 *  - el comentario del asistente y este mismo banco EXPLICAN por que salio;
 *  - el CHANGELOG es historia y no se reescribe;
 *  - openspec/ y entregables/ son investigacion citada, no copia que alguien lea
 *    para decidir. */
const EXENTOS = [
  "herramientas/projects-asistente.mjs",
  "pruebas/docs/promesas-sin-fuente.test.mjs",
  "CHANGELOG.md",
];
const PREFIJOS_EXENTOS = ["openspec/", "entregables/"];

function textosQueLeeAlguien() {
  return execFileSync("git", ["ls-files", "*.md", "*.mjs", "*.json", "*.astro"], {
    cwd: RAIZ,
    encoding: "utf-8",
  })
    .trim()
    .split("\n")
    .filter(Boolean)
    .filter((f) => !EXENTOS.includes(f))
    .filter((f) => !PREFIJOS_EXENTOS.some((p) => f.startsWith(p)));
}

test("hay textos que revisar: un cero aca es este banco roto, no el arbol limpio", () => {
  const todos = textosQueLeeAlguien();
  assert.ok(
    todos.length >= 50,
    `se encontraron ${todos.length} textos: si cayo de golpe, mira si se movieron o si git ls-files fallo`,
  );
});

test("las cuatro formas de la promesa se reconocen: un patron que no caza nada no protege nada", () => {
  const ejemplos = [
    "gratis, sin tarjeta",
    "no te pide tarjeta para empezar",
    "sin necesidad de tarjeta",
    "no hace falta tarjeta",
  ];
  for (const frase of ejemplos) {
    assert.ok(
      PROMESAS.some((p) => p.test(frase)),
      `ningun patron caza «${frase}»: el guard tiene un agujero por donde vuelve la promesa`,
    );
  }
});

test("ningun texto promete «sin tarjeta» mientras no haya constancia de que alguien lo comprobo", () => {
  if (VERIFICADAS.length > 0) return; // alguien la verifico: la frase esta habilitada

  const malos = [];
  for (const rel of textosQueLeeAlguien()) {
    const texto = fs.readFileSync(path.join(RAIZ, rel), "utf-8");
    texto.split("\n").forEach((linea, i) => {
      if (PROMESAS.some((p) => p.test(linea))) malos.push(`${rel}:${i + 1}  ${linea.trim()}`);
    });
  }

  assert.deepEqual(
    malos,
    [],
    "Estos textos prometen «sin tarjeta» y nadie lo verifico contra la fuente.\n" +
      "Es la primera columna que mira quien no tiene tarjeta, y se entera en el formulario de alta.\n" +
      "Para levantarlo: da de alta una cuenta real de cada proveedor sin cargar tarjeta y agrega\n" +
      "la constancia a VERIFICADAS en pruebas/docs/promesas-sin-fuente.test.mjs.\n\n" +
      malos.join("\n"),
  );
});
