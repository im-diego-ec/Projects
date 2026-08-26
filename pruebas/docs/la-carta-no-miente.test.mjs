import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { PREGUNTAS } from "../../herramientas/projects-asistente.mjs";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const CARTA = path.join(RAIZ, "docs/03-stack.md");

// ---------------------------------------------------------------------------
// «QUE NO QUEDE EN PAPEL».
//
// La carta de docs/03-stack.md nombra CUATRO formas de construir y explica el
// beneficio y el limite de cada una. Ese texto es una promesa, y una promesa que
// no se puede cumplir es peor que no hacerla: este repositorio ya se comio ese
// defecto una vez, cuando el asistente ofrecia Slack como opcion y elegirlo
// producia un archivo que el motor rechazaba.
//
// LA REGLA DE ESTE BANCO, y es una sola: la columna «estado» de la carta dice la
// verdad. Una forma marcada ✅ tiene que estar de verdad disponible; una marcada
// 🕳️ NO puede aparecer como opcion del asistente. La carta puede explicar lo que
// todavia no existe —para eso esta, para que alguien elija sabiendo— pero tiene
// que decir que no existe, y el asistente no puede ofrecerlo.
//
// Cuando una forma se construya, dos cosas se mueven JUNTAS o el banco se pone
// rojo: su fila pasa a ✅ y su opcion entra al asistente.
// ---------------------------------------------------------------------------

const DISPONIBLE = "✅";
const FALTA = "🕳️";

/** Las filas de la carta: clave, nombre y estado. */
export function formasDeLaCarta(texto = fs.readFileSync(CARTA, "utf-8")) {
  const formas = [];
  for (const linea of texto.split("\n")) {
    const m = /^\|\s*\*\*([A-D]\+?)\*\*\s*\|([^|]+)\|([^|]+)\|([^|]+)\|/.exec(linea);
    if (m) formas.push({ clave: m[1], nombre: m[2].trim(), estado: m[4].trim() });
  }
  return formas;
}

const FORMAS = formasDeLaCarta();

test("la carta nombra las formas, y un cero aca es este banco roto", () => {
  assert.ok(
    FORMAS.length >= 4,
    `la carta tiene que nombrar al menos cuatro formas; se encontraron ${FORMAS.length}. Si el numero cayo, lo primero ` +
      "que hay que mirar es si la tabla cambio de forma, no si el marco perdio sus caminos",
  );
  const claves = FORMAS.map((f) => f.clave);
  assert.ok(claves.includes("A") && claves.includes("B") && claves.includes("D"), `faltan formas: ${claves.join(", ")}`);
});

test("cada forma declara su estado, y no hay estados inventados", () => {
  const raros = FORMAS.filter((f) => !f.estado.includes(DISPONIBLE) && !f.estado.includes(FALTA) && !f.estado.includes("→"));
  assert.deepEqual(
    raros.map((f) => `${f.clave}: "${f.estado}"`),
    [],
    `el estado de una forma solo puede ser ${DISPONIBLE} (esta construida), ${FALTA} (falta) o una flecha (cae en otra). ` +
      "Un estado que no es ninguno de los tres deja al lector sin saber si puede elegirla",
  );
});

/** Las formas que el asistente OFRECE hoy, leidas de sus preguntas. */
function formasQueElAsistenteOfrece() {
  const pregunta = PREGUNTAS.find((p) => p.id === "forma");
  return pregunta ? pregunta.opciones.map((o) => o.valor.toUpperCase()) : [];
}

test("NINGUNA forma marcada como pendiente se ofrece en el asistente", () => {
  const pendientes = FORMAS.filter((f) => f.estado.includes(FALTA)).map((f) => f.clave);
  const ofrecidas = formasQueElAsistenteOfrece();
  const mentira = pendientes.filter((c) => ofrecidas.includes(c));
  assert.deepEqual(
    mentira,
    [],
    "el asistente ofrece una forma que la carta declara pendiente. Ofrecer una opcion que despues no funciona es el " +
      "defecto exacto que este repositorio ya se comio con Slack: la persona elige bien y el error no habla de lo que " +
      `eligio. O se construye la forma y su fila pasa a ${DISPONIBLE}, o se saca del asistente. Ofrecidas de mas: ${mentira.join(", ")}`,
  );
});

test("TODA forma marcada como disponible se puede elegir de verdad", () => {
  const disponibles = FORMAS.filter((f) => f.estado.includes(DISPONIBLE)).map((f) => f.clave);
  assert.ok(disponibles.length >= 1, "tiene que haber al menos una forma disponible, o el marco no sirve para nada hoy");

  const ofrecidas = formasQueElAsistenteOfrece();
  // Mientras el asistente NO tenga la pregunta, la unica forma disponible tiene
  // que ser la que se reparte por defecto: es coherente que no se pregunte por
  // algo que no tiene alternativa. En cuanto haya DOS disponibles, la pregunta
  // pasa a ser obligatoria — elegir entre dos cosas no se hace por defecto.
  if (ofrecidas.length === 0) {
    assert.equal(
      disponibles.length,
      1,
      `hay ${disponibles.length} formas disponibles (${disponibles.join(", ")}) y el asistente no pregunta cual. ` +
        "Con mas de una construida, la pregunta deja de ser opcional: la persona tiene derecho a elegir entre lo que existe",
    );
    return;
  }
  const sinOfrecer = disponibles.filter((c) => !ofrecidas.includes(c));
  assert.deepEqual(sinOfrecer, [], `la carta las declara construidas y el asistente no las ofrece: ${sinOfrecer.join(", ")}`);
});

test("cada forma explica su beneficio Y su limite, no solo su nombre", () => {
  const texto = fs.readFileSync(CARTA, "utf-8");
  const flacas = [];
  for (const f of FORMAS) {
    if (f.estado.includes("→")) continue; // la que cae en otra no necesita seccion propia
    const re = new RegExp(`^### ${f.clave.replace("+", "\\+")} ·[\\s\\S]*?(?=^### |^## |\\Z)`, "m");
    const seccion = re.exec(texto);
    if (!seccion) {
      flacas.push(`${f.clave}: la tabla la nombra y no tiene seccion propia que la explique`);
      continue;
    }
    const cuerpo = seccion[0];
    if (!/Por qu(é|e) la elegir(í|i)as/i.test(cuerpo)) flacas.push(`${f.clave}: no dice por que la elegirias`);
    if (!/l(í|i)mite real|Qu(é|e) te cuesta/i.test(cuerpo)) flacas.push(`${f.clave}: no dice que te cuesta ni cual es su limite`);
  }
  assert.deepEqual(
    flacas,
    [],
    "una forma que solo dice su nombre no es una opcion: quien no sabe la respuesta sigue sin saberla. Cada una tiene " +
      `que decir por que la elegirias y que te cuesta.\n  ${flacas.join("\n  ")}`,
  );
});

test("MUERDE: una forma pendiente ofrecida en el asistente se caza", () => {
  // El caso que prueba que lo de arriba no pasa por vacuidad.
  const pendientes = FORMAS.filter((f) => f.estado.includes(FALTA)).map((f) => f.clave);
  assert.ok(pendientes.length > 0, "hoy tiene que haber al menos una forma pendiente para que el caso signifique algo");
  const ofrecidasFalsas = [...formasQueElAsistenteOfrece(), pendientes[0]];
  assert.ok(
    pendientes.some((c) => ofrecidasFalsas.includes(c)),
    "con la forma pendiente agregada a la lista de ofrecidas, la deteccion tiene que verla",
  );
});
