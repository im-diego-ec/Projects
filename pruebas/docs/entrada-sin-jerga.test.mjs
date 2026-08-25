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
// que escribio.
//
// DONDE VIVE AHORA CADA REGLA, y por que este archivo encogio. Las dos reglas de
// vocabulario que nacieron aca —cada palabra del glosario, enlazada; nada de
// jerga de oficio que el glosario no define— dejaron de ser de esta pagina: son
// EL ESTANDAR DE docs/, valen para todas las paginas y se miden en
// pruebas/docs/estandar-de-lectura.test.mjs, que ademas les corre las
// refutaciones. Su definicion unica esta en pruebas/docs/lectura.mjs, y esta
// pagina entra ahi por CARRIL_SIN_JERGA. Dejar una segunda copia aca solo servia
// para que una de las dos se endureciera y la otra no.
//
// LO QUE SE QUEDA ACA es lo que solo le toca a esta pagina: que conteste las
// cuatro preguntas para las que se escribio, que use vocabulario del marco en vez
// de esquivarlo, y que se llegue a ella desde las dos puertas.
import test from "node:test";
import assert from "node:assert/strict";
import { leer, terminosDelGlosario, terminosUsados } from "./lectura.mjs";

const PAGINA = "docs/empezar-sin-ser-tecnico.md";
const TEXTO = leer(PAGINA);
const TERMINOS = terminosDelGlosario();

test("entrada · la pagina existe y dice algo", () => {
  assert.ok(
    TEXTO.length >= 3000,
    `${PAGINA} tiene ${TEXTO.length} caracteres. Una puerta de entrada que cabe en una pantalla no contesta las ` +
      "preguntas que trae quien llega sin contexto.",
  );
});

test("entrada · la pagina NOMBRA el vocabulario del marco en vez de esquivarlo", (t) => {
  // El estandar exige que lo que use este enlazado; este caso exige que use
  // algo. Sin el, la forma mas facil de estar en verde seria no nombrar nada — y
  // una puerta de entrada que no nombra las cosas no explica nada. Es tambien la
  // guarda de que el escaneo sigue reconociendo terminos: si dejara de hacerlo,
  // la regla del enlace pasaria vacuamente sobre esta pagina.
  const usados = terminosUsados(TEXTO, TERMINOS);
  t.diagnostic(`palabras del glosario que la pagina usa y enlaza: ${usados.join(", ")}`);
  assert.ok(
    usados.length >= 4,
    `${PAGINA} usa ${usados.length} palabra(s) del glosario. Menos de cuatro significa una de dos: o la pagina ` +
      "esquiva el vocabulario en vez de explicarlo —y entonces no sirve de puerta de entrada—, o el escaneo dejo " +
      "de reconocer los terminos y la regla del enlace pasa vacuamente sobre ella.",
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

test("entrada · la pagina manda al lector a la guia que se hace CON el", () => {
  // La division de trabajo entre las dos paginas es a proposito: esta contesta
  // "que es y por que", y la de al lado contesta "que corro y que voy a ver".
  // Quien llega aca decidido a arrancarlo tiene que encontrar la puerta; si no,
  // termina en el runbook tecnico, que no esta escrito para el.
  assert.ok(
    TEXTO.includes("paso-a-paso-sin-ser-tecnico.md"),
    `${PAGINA} no enlaza la guia paso a paso. Esta pagina explica QUE ES; el lector que ya decidio necesita el ` +
      "HAZLO CONMIGO, y sin el enlace su unico camino es arrancar-un-proyecto.md, que es un runbook tecnico.",
  );
});
