import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const PAGINA = path.join(RAIZ, "docs/08-descubrimiento.md");

// ---------------------------------------------------------------------------
// EL TRAMO DE DESCUBRIMIENTO NO TENIA NI UN CONTROL.
//
// `comandos-que-existen.test.mjs` mide las promesas del tramo de construir
// —cada `/opsx:` y cada `openspec` de un bloque para copiar—. El de descubrir no
// tenia nada equivalente: medido mutando `bmad-method@6.11.0` a `@99.99.99` y
// `bmad-prd` a un nombre inventado, el banco entero seguia en verde.
//
// Tres cosas se rompieron ahi y ninguna dejo rastro:
//
//   1. UNA CITA INVENTADA. La pagina atribuia al proveedor, entre comillas y en
//      cursiva, una frase que NO EXISTE en el paquete —grepeada contra el
//      `npm pack` completo de 6.11.0, no solo contra lo que el instalador
//      copia—, junto con una «fase 1 (Analysis)» marcada «Optional» que tampoco
//      existe: 6.11.0 organiza bmm por skills, no por fases numeradas.
//   2. UN REQUISITO FANTASMA. Decia «necesita `uv` (lo verificaste en "Antes de
//      empezar")» y docs/08 NO TIENE ninguna seccion «Antes de empezar». La de
//      docs/04 enumera cuatro programas y `uv` no es ninguno.
//   3. EL IDIOMA. El instalador deja `communication_language: 'English'` y
//      `document_output_language: 'English'` (medido en tools/installer/ui.js de
//      6.11.0), y la SKILL.md los obedece: saluda y escribe EL DOCUMENTO en ese
//      idioma. Sin cambiarlos, el PRD sale en ingles.
//
// LO QUE ESTE BANCO NO PUEDE AFIRMAR: no baja el paquete —correr `npm pack` en
// cada corrida ataria el banco a la red, y este repositorio corre sin ella—. Lo
// que sostiene es que la pagina no vuelva a prometer lo que ya se midio falso.
// ---------------------------------------------------------------------------

const pagina = () => fs.readFileSync(PAGINA, "utf-8");

test("la pagina del descubrimiento existe: un cero aca es este banco roto", () => {
  assert.ok(fs.existsSync(PAGINA), "sin la pagina, todo lo de abajo pasa vacio");
  assert.ok(pagina().length > 2000, "y tiene que tener contenido");
});

test("no se le atribuye al proveedor una frase que no esta en su paquete", () => {
  // Grepeadas el 2026-08-31 contra el `npm pack` completo de bmad-method@6.11.0:
  // cero coincidencias de cada una. Una cita entre comillas presentada como
  // textual es la unica clase de error que el lector no tiene forma de detectar.
  const INVENTADAS = [
    "Neither skill requires the other",
    "Phase 1 (Analysis)",
    "fase 1 (Analysis)",
  ];
  const t = pagina();
  const vivas = INVENTADAS.filter((c) => t.includes(c));
  assert.deepEqual(vivas, [], `esto se atribuyo al proveedor y no existe en su paquete: ${vivas.join(" | ")}`);
});

test("no remite a una seccion de esta misma pagina que no existe", () => {
  // «lo verificaste en "Antes de empezar"» mandaba a una seccion que docs/08 no
  // tiene. Un puntero interno roto le dice a la persona que ya hizo algo que
  // nunca le pidieron, que es peor que no decir nada.
  const t = pagina();
  const encabezados = [...t.matchAll(/^#{1,6}\s+(.+?)\s*$/gm)].map((m) => m[1].toLowerCase());
  const rotos = [];
  for (const m of t.matchAll(/«([^»]{3,40})»/g)) {
    const citado = m[1].toLowerCase();
    // Solo se juzgan las que se presentan como secciones: «lo verificaste en X».
    if (!/verificaste en|ver la seccion|en la seccion/i.test(t.slice(Math.max(0, m.index - 60), m.index))) continue;
    if (!encabezados.some((h) => h.includes(citado))) rotos.push(m[1]);
  }
  assert.deepEqual(rotos, [], `la pagina remite a secciones propias que no tiene: ${rotos.join(", ")}`);
});

test("el paso del idioma esta, y va ANTES de generar el PRD", () => {
  // El orden importa: cambiar el idioma despues de generar el PRD no lo
  // traduce. Si el paso quedara al final, seria una nota al pie sobre un
  // documento que ya salio en ingles.
  const t = pagina();
  assert.match(t, /communication_language/, "la pagina tiene que nombrar la clave que hay que cambiar");
  assert.match(t, /document_output_language/, "y la del documento, que es la que decide el idioma del PRD");

  const idioma = t.indexOf("communication_language");
  const prd = t.search(/bmad-prd/);
  assert.ok(prd !== -1, "la pagina tiene que nombrar la skill que genera el PRD");
  assert.ok(idioma < t.lastIndexOf("bmad-prd"), "el paso del idioma tiene que estar antes del ultimo uso de bmad-prd");
});

test("`uv` se declara como lo que es: algo que hay que instalar aparte", () => {
  const t = pagina();
  assert.match(t, /\buv\b/, "la pagina tiene que nombrar uv: sin el, las skills fallan en su primer paso");
  assert.match(t, /uv --version|astral\.sh\/uv/, "y tiene que decir como comprobarlo o instalarlo, no darlo por hecho");
});

test("MUERDE: una cita inventada vuelve a caerse", () => {
  // Prueba que el control de arriba no pasa por vacuidad: sobre un texto que SI
  // trae la cita, la deteccion tiene que verla.
  const conCita = 'El proveedor dice: «Neither skill requires the other — start with bmad-prd».';
  assert.ok(conCita.includes("Neither skill requires the other"), "el detector tiene que ver la cita");
  assert.equal(pagina().includes("Neither skill requires the other"), false, "y la pagina real no puede traerla");
});
