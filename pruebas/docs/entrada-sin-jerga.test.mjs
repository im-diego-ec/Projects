// BANCO DE docs/01-introduccion.md: LA PUERTA DE ENTRADA DE QUIEN NO ES
// TECNICO.
//
// QUE CIERRA. El marco tenia dos documentos para el rol de PO —06-para-el-po.md y el
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
import { INDICE, leer, terminosDelGlosario, terminosUsados } from "./lectura.mjs";

const PAGINA = "docs/01-introduccion.md";
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
    leer("README.md").includes("docs/01-introduccion.md"),
    "README.md no enlaza la puerta de entrada de quien no es tecnico. Sin ese enlace, el unico camino sigue " +
      "siendo el README, que abre hablando de guardrails de CI/CD: exactamente el problema que esta pagina vino " +
      "a cerrar.",
  );
  const indice = leer("docs/README.md");
  assert.ok(
    indice.includes("01-introduccion.md"),
    "docs/README.md no menciona 01-introduccion.md, y ese indice se vende como el mapa de la " +
      "documentacion: un documento que no aparece ahi es un documento que nadie encuentra.",
  );
  const desde = indice.indexOf("## Por dónde empezar");
  assert.ok(desde !== -1, "no encontre la seccion '## Por dónde empezar' en docs/README.md: actualiza este ancla");
  assert.ok(
    indice.slice(desde).includes("01-introduccion.md"),
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
    TEXTO.includes("04-arrancar-acompanado.md"),
    `${PAGINA} no enlaza la guia paso a paso. Esta pagina explica QUE ES; el lector que ya decidio necesita el ` +
      "HAZLO CONMIGO, y sin el enlace su unico camino es 05-arrancar-tecnico.md, que es un runbook tecnico.",
  );
});

// ---------------------------------------------------------------------------
// LA TABLA DEL CAMINO: QUE LAS NOMBRE A TODAS, Y QUE EL NUMERO SEA EL DEL
// ARCHIVO QUE ENLAZA.
//
// EL DEFECTO QUE ESTO CIERRA, y estaba vivo el dia que se escribio este banco.
// Cuando entro 10-publicar.md, las paginas 10..15 pasaron a 11..16 y el indice
// de docs/ se actualizo. La tabla de esta pagina no: se quedo sin la fila de
// 10-publicar.md —o sea que la pagina que ABRE el camino no nombraba el cuarto
// tramo— y su ultima fila decia **10** mientras enlazaba 11-reglas-no-escritas.md.
// Un numero que no es el del archivo al que manda es peor que ninguno: el lector
// que cuenta filas para saber donde esta cuenta mal.
//
// POR QUE NO ALCANZABA CON LO QUE YA HABIA. El caso «toda pagina de docs/ esta
// enumerada en el indice» de pruebas/docs/estandar-de-lectura.test.mjs mira
// docs/README.md, no esta tabla; y el de enlaces solo pide que el destino EXISTA
// —11-reglas-no-escritas.md existia, y la fila mentia igual—. Las dos reglas
// estaban verdes con el defecto puesto.
//
// DE DONDE SALE LA LISTA CORRECTA: de la seccion «El camino, en orden» del
// indice, que es quien decide que paginas son el camino. No hay lista escrita a
// mano aca; el dia que una pagina entre o salga del camino, esta tabla se pone
// roja sola.
// ---------------------------------------------------------------------------

const TABLA_DEL_CAMINO = "## El camino, y dónde estás";
const SECCION_DEL_INDICE = "## El camino, en orden";

/** La fila de esta misma pagina no enlaza a ningun lado: dice «estás acá», que
 *  es justamente lo que tiene que decir. Se marca asi para poder compararla. */
const ESTAS_ACA = "← estás acá";

/** El texto de una seccion `##`, de su encabezado hasta el siguiente. */
function seccion(texto, encabezado) {
  const desde = texto.indexOf(encabezado);
  if (desde === -1) return "";
  const resto = texto.slice(desde + encabezado.length);
  const hasta = resto.search(/^## /m);
  return hasta === -1 ? resto : resto.slice(0, hasta);
}

/** Las filas de una tabla markdown, ya partidas en celdas. La linea de guiones
 *  y el encabezado caen solos despues, porque ninguno trae lo que se busca. */
function celdasDeLasFilas(texto) {
  return texto
    .split("\n")
    .filter((l) => l.trimStart().startsWith("|"))
    .map((l) => l.trim().split("|").slice(1, -1).map((c) => c.trim()));
}

/** Las paginas numeradas que el INDICE pone en el camino, en su orden. */
export function caminoSegunElIndice(indice = leer(INDICE)) {
  return celdasDeLasFilas(seccion(indice, SECCION_DEL_INDICE))
    .map((celdas) => celdas[0]?.match(/^\[((\d\d)-[^\]]+\.md)\]/))
    .filter(Boolean)
    .map((m) => ({ numero: m[2], archivo: m[1] }));
}

/** Lo que la tabla de esta pagina ESCRIBE: el numero de cada fila y el archivo
 *  al que manda, o null si la fila no enlaza a ningun lado. */
export function filasDelCamino(texto) {
  return celdasDeLasFilas(seccion(texto, TABLA_DEL_CAMINO))
    .map((celdas) => {
      const numero = celdas[0]?.match(/\*\*(\d\d)\*\*/);
      if (!numero) return null;
      const destino = celdas.slice(1).join(" ").match(/\]\((\d\d-[^)]+\.md)\)/);
      return { numero: numero[1], archivo: destino ? destino[1] : null };
    })
    .filter(Boolean);
}

/** Las filas cuyo numero NO es el del archivo que enlazan. Es la regla, y es la
 *  funcion que corre la refutacion: si esto devolviera siempre vacio, el caso de
 *  abajo seria decoracion. */
export function numerosQueNoSonDeSuArchivo(filas) {
  return filas
    .filter((f) => f.archivo && f.numero !== f.archivo.slice(0, 2))
    .map((f) => `la fila **${f.numero}** enlaza ${f.archivo}`);
}

/** La tabla, en una linea por fila, lista para comparar contra el indice. */
export function comoLaEscribe(filas) {
  return filas.map((f) => `${f.numero} → ${f.archivo ?? ESTAS_ACA}`);
}

/** Lo que la tabla tendria que decir segun el indice: todas las paginas del
 *  camino, en orden, y la de esta pagina sin enlace porque es donde estás. */
export function comoTendriaQueEscribirla(camino, propia = PAGINA.slice("docs/".length)) {
  return camino.map((p) => `${p.numero} → ${p.archivo === propia ? ESTAS_ACA : p.archivo}`);
}

const CAMINO = caminoSegunElIndice();
const FILAS = filasDelCamino(TEXTO);

test("camino · hay tabla y hay camino que comparar: un cero aca es este control roto", () => {
  // Si cualquiera de los dos parseos devuelve poco, los dos casos de abajo
  // pasan sin mirar nada: un indice que no se leyo no tiene paginas que faltar,
  // y una tabla que no se leyo no tiene numeros que estar mal.
  assert.ok(
    CAMINO.length >= 10,
    `lei ${CAMINO.length} pagina(s) numerada(s) en «${SECCION_DEL_INDICE}» de ${INDICE} y el camino tiene mas de ` +
      "diez. Si el numero cayo de golpe, mira si la seccion se renombro antes de mirar si el camino encogio.",
  );
  assert.ok(
    FILAS.length >= 10,
    `lei ${FILAS.length} fila(s) en «${TABLA_DEL_CAMINO}» de ${PAGINA}. Si la tabla se reescribio con otra forma ` +
      "—el numero en negrita en la primera celda—, este banco dejo de ver lo que cree que ve.",
  );
});

test("camino · el numero de cada fila es el del archivo que enlaza", () => {
  const mienten = numerosQueNoSonDeSuArchivo(FILAS);
  const comparadas = FILAS.filter((f) => f.archivo).length;
  assert.ok(comparadas >= 9, `solo ${comparadas} fila(s) enlazan a algo: sin enlaces no hay numero que comparar`);
  assert.deepEqual(
    mienten,
    [],
    `la tabla del camino de ${PAGINA} le pone a una fila un numero que no es el de su archivo: ${mienten.join(", ")}. ` +
      "Quien lee cuenta filas para saber donde esta parado, asi que un numero corrido lo manda al tramo equivocado. " +
      "Paso de verdad: la ultima fila decia **10** y enlazaba 11-reglas-no-escritas.md.",
  );
});

test("camino · la tabla nombra TODAS las paginas numeradas del camino, en orden", () => {
  assert.deepEqual(
    comoLaEscribe(FILAS),
    comoTendriaQueEscribirla(CAMINO),
    `la tabla del camino de ${PAGINA} y «${SECCION_DEL_INDICE}» de ${INDICE} no dicen lo mismo. La lista de la ` +
      "izquierda es lo que la tabla escribe; la de la derecha, lo que el indice manda. Una pagina que falta acá es " +
      "un tramo del camino que la puerta de entrada no nombra: el lector no se entera de que existe. Paso de " +
      "verdad con 10-publicar.md, que fue el cuarto tramo y no estaba.",
  );
});

test("MUERDE: una pagina que falta y un numero corrido se cazan", () => {
  // Los dos defectos REALES, reintroducidos sobre el texto y pasados por LAS
  // MISMAS funciones que usan los casos de arriba. Sin esto, los dos de arriba
  // podrian estar verdes por no mirar nada.
  const sinPublicar = TEXTO.replace(/^\| \*\*10\*\* \| \[10-publicar\.md\].*\n/m, "");
  assert.notEqual(sinPublicar, TEXTO, "no encontre la fila de 10-publicar.md para sacarla: actualiza esta refutacion");
  assert.notDeepEqual(
    comoLaEscribe(filasDelCamino(sinPublicar)),
    comoTendriaQueEscribirla(CAMINO),
    "le saque a la tabla la fila del cuarto tramo y la comparacion no lo vio",
  );

  const corrida = TEXTO.replace("| **11** | [11-reglas-no-escritas.md]", "| **10** | [11-reglas-no-escritas.md]");
  assert.notEqual(corrida, TEXTO, "no encontre la fila de 11-reglas-no-escritas.md para renumerarla");
  assert.deepEqual(
    numerosQueNoSonDeSuArchivo(filasDelCamino(corrida)),
    ["la fila **10** enlaza 11-reglas-no-escritas.md"],
    "le puse a una fila el numero de otra pagina —el defecto textual que tenia el repositorio— y la regla no lo vio",
  );
});
