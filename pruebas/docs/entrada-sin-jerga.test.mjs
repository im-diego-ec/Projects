// BANCO DE docs/empezar-sin-ser-tecnico.md: LA PUERTA DE ENTRADA DE QUIEN NO ES
// TECNICO.
//
// QUE CIERRA. El marco tenia dos documentos para el rol de PO —para-el-po.md y el
// glosario— y ninguno para el paso anterior: alguien que no es tecnico y quiere
// entender que es esto, que le da, que le exige y como se empieza. La puerta que
// habia era el README, que abre hablando de guardrails de CI/CD.
//
// POR QUE UN BANCO Y NO CONFIANZA. Una pagina "sin jerga" se degrada sola: cada
// edicion posterior la escribe alguien que ya se sabe el vocabulario y para quien
// "compuerta", "delta" o "carril" son palabras normales. La degradacion es
// invisible desde adentro — quien la introduce no puede verla, porque entiende lo
// que escribio. Lo unico que la vuelve visible es derivarla del glosario, que es
// justamente la lista de las palabras que este repo sabe que no son normales.
//
// LA PRIMERA REGLA: si la pagina usa una palabra del glosario, esa palabra tiene
// que estar ENLAZADA al glosario en la propia pagina. No se exige que evite el
// vocabulario —una pagina que no puede nombrar las cosas no explica nada—: se
// exige que no lo suponga sabido.
//
// LA SEGUNDA REGLA, Y POR QUE HIZO FALTA. La primera se deriva del glosario, asi
// que solo ve las palabras que el repo YA sabe que no son normales. La jerga de
// todos los dias no esta ahi: "pipeline" no es un termino propio del marco, es
// vocabulario de oficio, y por eso la regla del glosario nunca lo miraba. La
// pagina lo usaba dos veces —una de ellas dentro de la lista concreta de lo que
// hay que hacer para arrancar— con el banco entero en verde. La segunda regla es
// una lista ESCRITA de palabras que esta pagina tiene prohibido usar porque todas
// tienen traduccion corriente. Escrita y no derivada a proposito: no hay ningun
// archivo del repo que enumere "las palabras que un BA no tiene por que saber",
// y fingir que se deriva de algo seria el mismo falso verde de nuevo.
import test from "node:test";
import assert from "node:assert/strict";
import { leer } from "./versiones.mjs";

const PAGINA = "docs/empezar-sin-ser-tecnico.md";
const GLOSARIO = "docs/glosario.md";
const TEXTO = leer(PAGINA);

/** Los terminos que el glosario define: la primera celda de cada fila, que el
 *  archivo escribe entre asteriscos. Es la misma forma que ya usa el banco de
 *  documentacion para contar filas, asi que las dos comprobaciones se rompen
 *  juntas si alguien cambia el formato de la tabla — y ninguna se queda leyendo
 *  cero filas en silencio. */
function terminosDelGlosario() {
  return leer(GLOSARIO)
    .split("\n")
    .map((linea) => linea.match(/^\|\s*\*\*(.+?)\*\*/))
    .filter(Boolean)
    .map((marca) => marca[1].trim());
}

const TERMINOS = terminosDelGlosario();

function escapar(texto) {
  return texto.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Los terminos del glosario que un texto USA sin enlazarlos al glosario.
 *
 *  Puro sobre el texto a proposito: la refutacion de mas abajo le pasa una copia
 *  mutada y exige que los vea. Los bloques cercados quedan fuera —ahi va codigo,
 *  no prosa dirigida al lector— y el plural se acepta porque "specs" y "spec"
 *  son la misma palabra para quien la lee por primera vez. */
export function terminosUsados(texto, terminos) {
  const prosa = texto.replace(/```[\s\S]*?```/g, "");
  return terminos.filter((t) => new RegExp(`\\b${escapar(t)}(?:s|es)?\\b`, "i").test(prosa));
}

export function jergaSinEnlazar(texto, terminos) {
  const prosa = texto.replace(/```[\s\S]*?```/g, "");
  const sinEnlazar = [];
  for (const termino of terminosUsados(texto, terminos)) {
    const enlazado = new RegExp(`\\[[^\\]]*${escapar(termino)}[^\\]]*\\]\\((?:\\./)?glosario\\.md\\)`, "i");
    if (!enlazado.test(prosa)) sinEnlazar.push(termino);
  }
  return sinEnlazar;
}

/** Palabras de oficio que esta pagina tiene prohibido usar. NINGUNA esta en el
 *  glosario —hay un caso abajo que lo comprueba—: las del glosario se pueden usar
 *  enlazadas, estas no se usan y punto, porque el castellano corriente ya las
 *  dice (verificacion, entrega, cambio, integrar, herramienta que revisa...).
 *
 *  LA UNICA EXENCION, declarada: `stack` seguido de `.md` es el nombre de un
 *  archivo del repo, no la palabra. La pagina enlaza esa pagina dos veces y
 *  llamarla de otra forma seria mentir sobre la ruta. */
const SIN_TRADUCCION = [
  "pipeline",
  "check",
  "deploy",
  "commit",
  "merge",
  "mergear",
  "branch",
  "runner",
  "workflow",
  "linter",
  "lockfile",
  "backend",
  "frontend",
  "stack",
  "build",
  "endpoint",
  "framework",
  "ORM",
  "CLI",
  "API",
  "banco de pruebas",
];

/** La prosa que el lector lee de verdad: sin bloques cercados ni codigo en linea
 *  (ahi va lo que se copia y se pega, no lo que se lee) y sin los destinos de los
 *  enlaces (una ruta no es una frase). */
export function prosaDeLaPagina(texto) {
  return texto
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`[^`]*`/g, "")
    .replace(/\]\([^)]*\)/g, "]");
}

export function jergaDeOficio(texto, palabras) {
  const prosa = prosaDeLaPagina(texto);
  return palabras.filter((palabra) => new RegExp(`\\b${escapar(palabra)}\\b(?!\\.md)`, "i").test(prosa));
}

test("entrada · el glosario se leyo: cero terminos aca es el parseo roto, no un glosario vacio", () => {
  assert.ok(
    TERMINOS.length >= 20,
    `lei ${TERMINOS.length} termino(s) de ${GLOSARIO} y se esperaban al menos 20. Sin terminos, el caso de la ` +
      "jerga pasaria vacuamente: no habria nada que buscar en la pagina.",
  );
});

test("entrada · la pagina existe y dice algo", () => {
  assert.ok(
    TEXTO.length >= 3000,
    `${PAGINA} tiene ${TEXTO.length} caracteres. Una puerta de entrada que cabe en una pantalla no contesta las ` +
      "preguntas que trae quien llega sin contexto.",
  );
});

test("entrada · ninguna palabra del glosario se usa sin enlazarla ahi mismo", (t) => {
  // La pagina TIENE que usar vocabulario del marco: es una puerta de entrada al
  // marco, no un folleto. Si no usara ninguno, el caso de abajo pasaria vacuamente
  // y este banco estaria certificando una pagina que no nombra nada.
  const usados = terminosUsados(TEXTO, TERMINOS);
  t.diagnostic(`palabras del glosario que la pagina usa y enlaza: ${usados.join(", ")}`);
  assert.ok(
    usados.length >= 4,
    `${PAGINA} usa ${usados.length} palabra(s) del glosario. Menos de cuatro significa una de dos: o la pagina ` +
      "esquiva el vocabulario en vez de explicarlo —y entonces no sirve de puerta de entrada—, o el escaneo dejo " +
      "de reconocer los terminos y todo lo de abajo pasa vacuamente.",
  );
  assert.deepEqual(
    jergaSinEnlazar(TEXTO, TERMINOS),
    [],
    `${PAGINA} usa estas palabras del marco sin enlazarlas al glosario. La pagina es para quien NO es tecnico: ` +
      "cada palabra propia del marco que aparezca tiene que llevar su enlace la primera vez, con la forma " +
      "[palabra](glosario.md). No hace falta evitar el vocabulario —una pagina que no puede nombrar las cosas no " +
      "explica nada—; hace falta no suponerlo sabido.",
  );
});

test("entrada · la lista de jerga prohibida no pisa al glosario", () => {
  // Si una palabra estuviera en las dos listas, la pagina recibiria dos ordenes
  // opuestas —usala enlazada / no la uses— y la primera persona que las viera
  // apagaria una. El dia que una de estas entre al glosario, este caso lo dice y
  // hay que elegir una de las dos reglas para ella.
  const pisadas = SIN_TRADUCCION.filter((p) => TERMINOS.some((t) => t.toLowerCase() === p.toLowerCase()));
  assert.deepEqual(
    pisadas,
    [],
    `${pisadas.join(", ")} esta en la lista de jerga prohibida Y en ${GLOSARIO}. Las dos reglas se contradicen ` +
      "sobre esa palabra: o se saca de la lista y se usa enlazada, o se saca del glosario.",
  );
});

test("entrada · la pagina no usa jerga de oficio que el glosario no define", () => {
  const encontradas = jergaDeOficio(TEXTO, SIN_TRADUCCION);
  assert.deepEqual(
    encontradas,
    [],
    `${PAGINA} usa ${encontradas.join(", ")}. Son palabras de oficio que el glosario NO define, asi que el caso ` +
      "de arriba —que se deriva del glosario— no las mira: esta pagina es para quien no es tecnico y todas " +
      "tienen traduccion corriente. Arreglo: 'pipeline' es 'las verificaciones automaticas', 'check' es " +
      "'verificacion', 'banco de pruebas' es 'una comprobacion automatica'. Si una hace falta de verdad, " +
      "explicala en la propia pagina y sacala de esta lista en el mismo cambio.",
  );
});

// LAS CUATRO PREGUNTAS QUE ESTA PAGINA EXISTE PARA CONTESTAR. No son decoracion
// de indice: son las que trae de verdad quien evalua adoptar esto, y son
// exactamente las que ningun otro documento del repo contestaba. Si una
// desaparece en una reescritura, la pagina deja de servir para lo que se
// escribio y nadie se entera hasta que alguien pregunte.
const PREGUNTAS = [
  "### ¿Cuánto cuesta?",
  "### ¿Cuánto tarda arrancar un proyecto?",
  "### ¿Qué decisiones voy a tener que tomar yo?",
  "### ¿Y si el equipo es una sola persona?",
];

test("entrada · las cuatro preguntas siguen contestadas", () => {
  const faltantes = PREGUNTAS.filter((p) => !TEXTO.includes(p));
  assert.deepEqual(
    faltantes,
    [],
    `${PAGINA} ya no contesta: ${faltantes.join(" | ")}. Son las preguntas que trae quien evalua adoptar el ` +
      "marco y las que ningun otro documento del repositorio contesta. Si una se reformula, actualiza este " +
      "banco en el mismo cambio; si se borra, la pagina perdio su motivo.",
  );
});

test("entrada · la pagina esta enlazada desde el README y desde el indice de docs/", () => {
  assert.ok(
    leer("README.md").includes("docs/empezar-sin-ser-tecnico.md"),
    "README.md no enlaza la puerta de entrada de quien no es tecnico. Sin ese enlace, el unico camino sigue " +
      "siendo el README, que abre hablando de guardrails de CI/CD: exactamente el problema que esta pagina vino " +
      "a cerrar.",
  );
  const indice = leer("docs/README.md");
  assert.ok(
    indice.includes("empezar-sin-ser-tecnico.md"),
    "docs/README.md no menciona empezar-sin-ser-tecnico.md, y ese indice se vende como el mapa de la " +
      "documentacion: un documento que no aparece ahi es un documento que nadie encuentra.",
  );
  const desde = indice.indexOf("## Por dónde empezar");
  assert.ok(desde !== -1, "no encontre la seccion '## Por dónde empezar' en docs/README.md: actualiza este ancla");
  assert.ok(
    indice.slice(desde).includes("empezar-sin-ser-tecnico.md"),
    "'Por dónde empezar' de docs/README.md no ofrece la puerta de entrada de quien no es tecnico. Esa seccion es " +
      "la que se lee cuando alguien no sabe por donde arrancar, que es literalmente el caso de este lector.",
  );
});

// ---------------------------------------------------------------------------
// REFUTACIONES: la comprobacion de la jerga, sobre copias mutadas en memoria.
// ---------------------------------------------------------------------------

test("refutacion · una palabra del glosario metida sin enlace se ve", () => {
  const termino = TERMINOS.find((t) => !new RegExp(`\\b${escapar(t)}(?:s|es)?\\b`, "i").test(TEXTO));
  assert.ok(termino, "todas las palabras del glosario ya aparecen en la pagina: no queda ninguna con que mutar");
  const mutada = `${TEXTO}\n\nY entonces el equipo revisa el ${termino} antes de integrar.\n`;
  assert.deepEqual(
    jergaSinEnlazar(mutada, TERMINOS),
    [termino],
    `le meti "${termino}" a la pagina sin enlace y la comprobacion no lo vio: entonces su verde no significa nada`,
  );
});

test("refutacion · una palabra de oficio metida en la prosa se ve", () => {
  const mutada = `${TEXTO}\n\nY despues se revisa que el pipeline haya quedado verde.\n`;
  assert.ok(
    jergaDeOficio(mutada, SIN_TRADUCCION).includes("pipeline"),
    "le meti 'pipeline' a la prosa y la lista de jerga no lo vio: entonces su verde no significa nada. Es " +
      "textualmente la frase que estuvo en la pagina con el banco entero en verde.",
  );
});

test("refutacion · control · la misma palabra dentro de codigo, y el nombre del archivo stack.md, no se marcan", () => {
  const mutada = `${TEXTO}\n\nEl input se llama \`pipeline\` y la pagina del stack.md lo cuenta.\n`;
  // Contra lo que la pagina ya da hoy, no contra la lista vacia: si la pagina
  // estuviera sucia, este control tiene que seguir diciendo que el codigo en
  // linea no agrega nada, no volverse rojo de rebote.
  assert.deepEqual(
    jergaDeOficio(mutada, SIN_TRADUCCION),
    jergaDeOficio(TEXTO, SIN_TRADUCCION),
    "la lista mordio codigo en linea o el nombre de un archivo del repo. Si muerde ahi, la pagina no puede " +
      "nombrar ni una ruta y la proxima persona apaga la regla en vez de arreglarla",
  );
});

test("refutacion · control · la misma palabra CON su enlace no se marca", () => {
  const termino = TERMINOS.find((t) => !new RegExp(`\\b${escapar(t)}(?:s|es)?\\b`, "i").test(TEXTO));
  const mutada = `${TEXTO}\n\nY entonces el equipo revisa el [${termino}](glosario.md) antes de integrar.\n`;
  assert.deepEqual(
    jergaSinEnlazar(mutada, TERMINOS),
    [],
    "la comprobacion marca una palabra que SI esta enlazada: asi la regla seria imposible de cumplir y la " +
      "proxima persona la apagaria en vez de arreglarla",
  );
});
