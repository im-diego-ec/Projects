// BANCO DEL ESTANDAR DE LECTURA: TODAS LAS PAGINAS, NO UNA.
//
// QUE CIERRA. El estandar —"ninguna palabra tecnica aparece sin explicarse aca
// mismo o sin enlazar al glosario"— existia declarado dentro de UNA pagina y
// medido por UN banco, el de docs/01-introduccion.md. Todas las demas
// paginas de docs/ y el README de la raiz vivian fuera de la regla: la que mas
// gente abre —el indice— usaba "pipeline", "check" y "deploy" sin definirlos, y
// ninguna pagina decia para quien era. Este banco extiende el estandar a todo el
// alcance.
//
// LOS DOS CARRILES, Y POR QUE NO SON UNO SOLO. Hay paginas inevitablemente
// tecnicas —08-upgrade-openspec.md, 11-forkear-el-marco.md, 05-arrancar-tecnico.md—.
// Convertirlas en folleto las arruinaria: un runbook se corre, no se hojea. Para
// esas el estandar no es "sin jerga" sino NAVEGABLE: una frase al principio que
// diga para quien es, y todo el vocabulario del marco enlazado al glosario. El
// carril duro —ademas, prohibido usar jerga de oficio que el glosario no
// define— es el de las paginas que abre alguien que no es tecnico.
//
// LO QUE ESTE BANCO NO PUEDE DECIR. Si una pagina se entiende. Que cada palabra
// del marco este enlazada no la vuelve clara — eso lo dice quien la lee sin
// contexto, y por eso el registro de friccion de docs/plantillas/ sigue siendo
// la otra mitad. Lo que si impide es la degradacion silenciosa: cada edicion
// posterior la escribe alguien que ya se sabe el vocabulario, y para el la
// pagina se lee perfecta.
import test from "node:test";
import assert from "node:assert/strict";
import {
  ABERTURAS,
  CARRIL_SIN_JERGA,
  EXENTAS_DE_ENLACE,
  INDICE,
  LINEAS_DE_APERTURA,
  SIN_TRADUCCION,
  SUBCARPETAS_FUERA,
  TOPE_DE_JERGA_ENTRE_BACKTICKS,
  evolucionSegunElIndice,
  fraseDeAudiencia,
  jergaDeOficio,
  jergaEntreBackticks,
  jergaPorForma,
  jergaSinEnlazar,
  leer,
  paginasDelAlcance,
  sinIndexar,
  subcarpetasDeDocs,
  terminosDelGlosario,
  terminosUsados,
} from "./lectura.mjs";

const TERMINOS = terminosDelGlosario();
const ALCANCE = paginasDelAlcance();
const EVOLUCION = evolucionSegunElIndice();

/** Las paginas que el indice declara HISTORICAS: fotos fechadas que el propio
 *  docs/README.md dice que no se actualizan. Reescribirlas para que cumplan un
 *  estandar de hoy seria falsificar la foto. La exencion no la decide este banco
 *  —la decide el indice—, asi que el dia que una deje de ser historica entra al
 *  estandar sola. */
function esHistorica(pagina) {
  return EVOLUCION.get(pagina.slice("docs/".length)) === "Histórico";
}

function exentaDeEnlace(pagina) {
  return pagina in EXENTAS_DE_ENLACE || esHistorica(pagina);
}

// ---------------------------------------------------------------------------
// LAS GUARDAS DEL PROPIO BANCO: sin esto, todo lo de abajo puede pasar vacio.
// ---------------------------------------------------------------------------

test("estandar · el glosario se leyo: cero terminos aca es el parseo roto, no un glosario vacio", () => {
  assert.ok(
    TERMINOS.length >= 20,
    `lei ${TERMINOS.length} termino(s) del glosario y se esperaban al menos 20. Sin terminos, la regla del ` +
      "enlace pasaria vacuamente en TODAS las paginas: no habria nada que buscar.",
  );
});

test("estandar · el alcance tiene paginas: un alcance vacio deja el estandar sin medir", () => {
  assert.ok(
    ALCANCE.length >= 10,
    `el alcance quedo en ${ALCANCE.length} pagina(s). docs/ tiene mas de diez .md en su raiz, asi que un numero ` +
      "chico significa que el barrido dejo de encontrarlas y este banco entero pasa sin mirar nada.",
  );
  assert.ok(ALCANCE.includes("README.md"), "el README de la raiz tiene que estar en el alcance: es la puerta de todos");
  assert.ok(ALCANCE.includes(INDICE), `${INDICE} tiene que estar en el alcance: es el mapa de la carpeta`);
});

test("estandar · el indice se parseo: si no se lee la columna de evolucion, la exencion historica es un agujero", () => {
  const etiquetas = [...new Set(EVOLUCION.values())].sort();
  assert.ok(
    EVOLUCION.size >= 10,
    `lei ${EVOLUCION.size} fila(s) de ${INDICE} y se esperaban al menos 10. Si el parseo devuelve poco, ` +
      "esHistorica() contesta que no para todo y una pagina historica entraria al estandar por accidente.",
  );
  assert.ok(
    etiquetas.includes("Histórico"),
    `${INDICE} ya no declara ninguna pagina como **Histórico** (etiquetas leidas: ${etiquetas.join(", ")}). ` +
      "O el indice cambio de vocabulario y hay que actualizar este banco, o la exencion dejo de tener sentido " +
      "y sobra: en los dos casos se decide, no se deja pasar.",
  );
});

test("estandar · las paginas del carril sin jerga existen", () => {
  // Una lista que apunta a un archivo que no esta es una lista que no vigila
  // nada, y el carril duro se quedaria sin nadie adentro sin que se note.
  const faltantes = CARRIL_SIN_JERGA.filter((p) => !ALCANCE.includes(p));
  assert.deepEqual(
    faltantes,
    [],
    `el carril sin jerga nombra paginas que no estan en el alcance: ${faltantes.join(", ")}. Si una se renombro, ` +
      "actualiza CARRIL_SIN_JERGA en pruebas/docs/lectura.mjs en el mismo cambio.",
  );
});

test("estandar · las subcarpetas de docs/ son exactamente las declaradas fuera del alcance", () => {
  // El alcance son las .md de la RAIZ de docs/. Las subcarpetas quedan fuera con
  // su motivo escrito; una subcarpeta nueva no puede quedar fuera en silencio,
  // porque nadie se enteraria de que sus paginas no cumplen nada.
  assert.deepEqual(
    subcarpetasDeDocs(),
    Object.keys(SUBCARPETAS_FUERA).sort(),
    "las subcarpetas de docs/ ya no son las que SUBCARPETAS_FUERA declara. Si entro una carpeta nueva, hay que " +
      "decidir si sus paginas entran al estandar o quedan fuera con su motivo — y escribirlo. Lo que no vale es " +
      "que quede fuera porque nadie la miro.",
  );
});

// ---------------------------------------------------------------------------
// REGLA 0 — EL INDICE ENUMERA TODO
// ---------------------------------------------------------------------------

test("indice · toda pagina de docs/ esta enumerada en el indice", () => {
  // docs/README.md se vende como el mapa de la documentacion y lo dice de si
  // mismo: "Este indice tiene que enumerar TODO". Hasta hoy eso era un comando
  // que alguien tenia que acordarse de correr, o sea nada.
  const faltantes = sinIndexar(ALCANCE);
  assert.deepEqual(
    faltantes,
    [],
    `${INDICE} no enlaza estas paginas: ${faltantes.join(", ")}. Un indice que se queda corto es peor que no ` +
      "tener indice, porque hace creer que se vio todo. Arreglo: una fila en la tabla, con que es y como evoluciona.",
  );
});

// ---------------------------------------------------------------------------
// REGLA 1 — PARA QUIEN ES ESTA PAGINA
// ---------------------------------------------------------------------------

test("estandar · toda pagina dice para quien es, en sus primeras lineas", (t) => {
  const sinFrase = [];
  for (const pagina of ALCANCE) {
    if (esHistorica(pagina)) continue;
    const frase = fraseDeAudiencia(leer(pagina));
    if (frase === null) sinFrase.push(pagina);
    else t.diagnostic(`${pagina} → ${frase}`);
  }
  assert.deepEqual(
    sinFrase,
    [],
    `estas paginas no dicen para quien son en sus primeras ${LINEAS_DE_APERTURA} lineas: ${sinFrase.join(", ")}. ` +
      `Empeza una frase con alguna de estas formas: ${ABERTURAS.map((a) => `"${a}"`).join(", ")}. Es la mitad ` +
      "barata del estandar y la que mas ahorra: quien abre la pagina sabe en dos segundos si es suya, y una " +
      "pagina tecnica que lo declara deja de parecer un folleto mal escrito.",
  );
});

// ---------------------------------------------------------------------------
// REGLA 2 — EL VOCABULARIO DEL MARCO, ENLAZADO
// ---------------------------------------------------------------------------

test("estandar · ninguna pagina usa una palabra del glosario sin enlazarla ahi mismo", (t) => {
  const rotas = [];
  let usadosEnTotal = 0;
  for (const pagina of ALCANCE) {
    if (exentaDeEnlace(pagina)) continue;
    const texto = leer(pagina);
    const usados = terminosUsados(texto, TERMINOS);
    usadosEnTotal += usados.length;
    const sinEnlazar = jergaSinEnlazar(texto, TERMINOS);
    t.diagnostic(`${pagina}: ${usados.length} palabra(s) del marco, ${sinEnlazar.length} sin enlazar`);
    if (sinEnlazar.length > 0) rotas.push(`${pagina} → ${sinEnlazar.join(", ")}`);
  }
  assert.ok(
    usadosEnTotal >= 100,
    `el alcance entero usa ${usadosEnTotal} palabra(s) del glosario y se esperaban mas de cien. Un numero chico ` +
      "significa que el escaneo dejo de reconocer los terminos, y entonces el caso de abajo pasa vacuamente.",
  );
  assert.deepEqual(
    rotas,
    [],
    "estas paginas usan palabras del marco sin enlazarlas al glosario:\n  " +
      rotas.join("\n  ") +
      "\nLa forma es [palabra](02-glosario.md) —desde la raiz, [palabra](docs/02-glosario.md)— y alcanza con UNA vez " +
      "por pagina. No hace falta evitar el vocabulario: una pagina que no puede nombrar las cosas no explica " +
      "nada. Lo que no vale es suponerlo sabido. La forma barata de cumplirlo es el bloque de vocabulario que " +
      "las paginas ya traen arriba: 'Palabras del marco que vas a ver aca', con cada una enlazada.",
  );
});

// ---------------------------------------------------------------------------
// REGLA 3 — EL CARRIL SIN JERGA
// ---------------------------------------------------------------------------

test("estandar · la lista de jerga prohibida no pisa al glosario", () => {
  // Si una palabra estuviera en las dos listas, las paginas del carril duro
  // recibirian dos ordenes opuestas —usala enlazada / no la uses— y la primera
  // persona que las viera apagaria una.
  const pisadas = SIN_TRADUCCION.filter((p) => TERMINOS.some((t) => t.toLowerCase() === p.toLowerCase()));
  assert.deepEqual(
    pisadas,
    [],
    `${pisadas.join(", ")} esta en la lista de jerga prohibida Y en el glosario. Las dos reglas se contradicen ` +
      "sobre esa palabra: o se saca de la lista y se usa enlazada, o se saca del glosario.",
  );
});

test("estandar · las paginas del carril sin jerga no usan jerga de oficio", () => {
  const rotas = [];
  for (const pagina of CARRIL_SIN_JERGA) {
    const encontradas = jergaDeOficio(leer(pagina), SIN_TRADUCCION);
    if (encontradas.length > 0) rotas.push(`${pagina} → ${encontradas.join(", ")}`);
  }
  // La misma regla, sin depender de la lista: la FORMA de la palabra.
  for (const pagina of CARRIL_SIN_JERGA) {
    const porForma = jergaPorForma(leer(pagina));
    if (porForma.length > 0) rotas.push(`${pagina} → ${porForma.join(", ")} (gerundio ingles)`);
  }
  assert.deepEqual(
    rotas,
    [],
    "estas paginas son para quien no es tecnico y usan palabras de oficio que el glosario NO define:\n  " +
      rotas.join("\n  ") +
      "\nEl caso de arriba no las mira, porque se deriva del glosario y estas no estan ahi. Arreglo: 'pipeline' " +
      "es 'las verificaciones automaticas', 'check' es 'verificacion', 'deploy' es 'despliegue', 'banco de " +
      "pruebas' es 'una comprobacion automatica'. Si la palabra hace falta textual —el titulo de una seccion de " +
      "otro archivo, el nombre de una herramienta— va entre backticks, que es codigo y no prosa.",
  );
});

test("estandar · el carril duro no se escapa metiendo la jerga entre backticks", () => {
  // prosaDeLaPagina() borra el codigo en linea antes de buscar, y esa exencion
  // es necesaria: docs/README.md tiene que poder nombrar `pipeline`, `check` y
  // `deploy` para describir la regla que los prohibe. Lo que no tenia era tope,
  // asi que una pagina entera escrita en jerga entrecomillada quedaba verde.
  const pasadas = [];
  for (const pagina of CARRIL_SIN_JERGA) {
    const fragmentos = jergaEntreBackticks(leer(pagina), SIN_TRADUCCION);
    if (fragmentos.length > TOPE_DE_JERGA_ENTRE_BACKTICKS) {
      pasadas.push(`${pagina} → ${fragmentos.length} fragmento(s): ${fragmentos.join(" · ")}`);
    }
  }
  assert.deepEqual(
    pasadas,
    [],
    `estas paginas del carril sin jerga pasan de ${TOPE_DE_JERGA_ENTRE_BACKTICKS} fragmentos de codigo en linea ` +
      `con jerga adentro:\n  ${pasadas.join("\n  ")}\nLos backticks estan para el texto literal que alguien ` +
      "copia o ve en pantalla, no para decir en jerga lo que la pagina tiene prohibido decir en castellano.",
  );
});

test("refutacion · una pagina de jerga pura NO pasa el carril duro", () => {
  // ESTE CASO ES LA REFUTACION QUE FALTABA, y no es hipotetica: es textualmente
  // la pagina con la que una revision derroto al carril. Las tres reglas salieron
  // verdes sobre prosa ilegible porque ninguna de esas palabras estaba en la
  // lista. Queda escrita aca para que el dia que alguien acorte la lista, este
  // caso se ponga rojo en vez de que el agujero se reabra en silencio.
  const jergaPura =
    "El runtime de Node resuelve el hoisting del node_modules, y el bundler tira un artefacto que el " +
    "registry publica bajo un tag inmutable. El OIDC federa el trust policy contra el provider, hace " +
    "rollback al digest anterior y revisa la telemetría. Los flags de feature viven en el config y el " +
    "cache invalida por ETag.";
  const encontradas = jergaDeOficio(jergaPura, SIN_TRADUCCION);
  assert.ok(
    encontradas.length >= 10,
    `la pagina de jerga pura solo disparo ${encontradas.length} palabra(s) (${encontradas.join(", ")}) y ` +
      "tendria que disparar al menos diez. Si la lista adelgazo, el carril volvio a dejar pasar una pagina que " +
      "nadie que no sea tecnico puede leer.",
  );
  assert.deepEqual(
    jergaPorForma(jergaPura),
    ["hoisting"],
    "la regla que mira la FORMA de la palabra dejo de ver el gerundio ingles. Es la unica de las tres que no " +
      "depende de que alguien haya escrito la palabra en una lista, o sea la unica que caza la jerga de manana.",
  );
});

test("refutacion · una pagina escrita en jerga entrecomillada revienta el tope", () => {
  const entrecomillada = SIN_TRADUCCION.slice(0, TOPE_DE_JERGA_ENTRE_BACKTICKS + 3)
    .map((p) => `Y despues mira el \`${p}\`.`)
    .join("\n");
  assert.ok(
    jergaDeOficio(entrecomillada, SIN_TRADUCCION).length === 0,
    "control: entre backticks la regla de prosa NO ve nada, que es exactamente la escotilla que el tope tapa",
  );
  assert.ok(
    jergaEntreBackticks(entrecomillada, SIN_TRADUCCION).length > TOPE_DE_JERGA_ENTRE_BACKTICKS,
    "escribi una pagina que dice en jerga entrecomillada lo que tiene prohibido decir en prosa y el tope no lo " +
      "vio: entonces el verde del carril duro no significa nada",
  );
});

// ---------------------------------------------------------------------------
// LA GUIA PASO A PASO: LO QUE LA HACE UTIL, Y NO SOLO CORRECTA
// ---------------------------------------------------------------------------

const GUIA = "docs/04-arrancar-acompanado.md";

/** Las cuatro cosas que cada paso de la guia promete, y la tercera es la que
 *  casi nunca se escribe: que vas a VER. Una guia que dice que copiar pero no
 *  que esperar en pantalla deja al lector sin forma de saber si funciono, que es
 *  exactamente el momento en que alguien que no es tecnico se traba. */
const PROMESAS_DE_LA_GUIA = ["**Qué vas a hacer.**", "**Qué copiar", "**Qué vas a ver", "**Cómo sabés que salió bien.**"];

/** Cuantos pasos tiene la guia hoy. MEDIDO el 2026-08-25 sobre el archivo, no
 *  recordado. Es un piso y no una igualdad porque agregar un paso es una mejora;
 *  bajarlo es una edicion que alguien tiene que justificar en el mismo cambio. */
const PASOS_DE_LA_GUIA = 13;

/** Los pasos de la guia, cada uno con su cuerpo. Por SECCION y no por conteo
 *  global: el conteo global tenia holgura de la mala —al borrar un paso entero se
 *  iban tambien sus cuatro promesas, el total caia parejo y la comparacion
 *  "veces >= pasos" seguia siendo cierta—, asi que la guia podia encogerse cinco
 *  pasos con el banco en verde. Midiendo adentro de cada paso, un paso al que le
 *  falta una promesa se nombra por su titulo. */
function pasosDeLaGuia(texto) {
  const encabezados = [...texto.matchAll(/^## Paso \d+ —.*$/gm)];
  return encabezados.map((m, i) => ({
    titulo: m[0].trim(),
    cuerpo: texto.slice(m.index, i + 1 < encabezados.length ? encabezados[i + 1].index : texto.length),
  }));
}

/** Los pasos a los que les falta alguna de las cuatro promesas, con cual. Puro
 *  sobre el texto para que la refutacion de abajo pueda mutarlo en memoria. */
function pasosIncompletos(texto) {
  const rotos = [];
  for (const paso of pasosDeLaGuia(texto)) {
    const faltan = PROMESAS_DE_LA_GUIA.filter((promesa) => !paso.cuerpo.includes(promesa));
    if (faltan.length > 0) rotos.push(`${paso.titulo} → le falta ${faltan.join(", ")}`);
  }
  return rotos;
}

test("guia · cada promesa de la guia paso a paso sigue cumpliendose, y en todos los pasos", () => {
  const texto = leer(GUIA);
  const pasos = pasosDeLaGuia(texto).length;
  assert.ok(
    pasos >= PASOS_DE_LA_GUIA,
    `${GUIA} tiene ${pasos} paso(s) y tenia ${PASOS_DE_LA_GUIA}. Acortar la guia puede estar bien, pero se ` +
      "decide: baja PASOS_DE_LA_GUIA en el mismo cambio y deja escrito por que sobraban.",
  );
  assert.deepEqual(
    pasosIncompletos(texto),
    [],
    "estos pasos rompen la promesa de la guia:\n  " +
      pasosIncompletos(texto).join("\n  ") +
      '\nLa guia se vende como "cada paso dice que vas a hacer, que copiar, que vas a ver y como saber que ' +
      'salio bien": un paso que se saltea una de las cuatro deja sin salida justo a quien no tiene forma de ' +
      "deducirla.",
  );
});

test("refutacion · a un paso al que le falta una promesa se lo nombra por su titulo", () => {
  // La version anterior de este caso contaba ocurrencias en TODO el archivo, asi
  // que quitar una promesa de un paso y agregarla en otro pasaba desapercibido, y
  // borrar cinco pasos enteros tambien. Estas dos mutaciones son las que ese
  // conteo no veia.
  const texto = leer(GUIA);
  const pasos = pasosDeLaGuia(texto);
  assert.ok(pasos.length >= 2, "la guia tiene menos de dos pasos: esta refutacion no tiene con que mutar");

  const sinPromesa = texto.replace(pasos[1].cuerpo, pasos[1].cuerpo.replace(PROMESAS_DE_LA_GUIA[2], "**Y despues.**"));
  assert.notEqual(sinPromesa, texto, `no pude quitarle ${PROMESAS_DE_LA_GUIA[2]} al segundo paso: revisa el ancla`);
  assert.deepEqual(
    pasosIncompletos(sinPromesa),
    [`${pasos[1].titulo} → le falta ${PROMESAS_DE_LA_GUIA[2]}`],
    `le saque ${PROMESAS_DE_LA_GUIA[2]} a un paso y la comprobacion no lo vio. Es la promesa que casi nunca se ` +
      "escribe —que vas a VER en pantalla— y sin ella el lector no tiene forma de saber si funciono",
  );

  const recortada = texto.replace(pasos[1].cuerpo, "");
  assert.ok(
    pasosDeLaGuia(recortada).length === pasos.length - 1,
    "borre un paso entero de una copia y el conteo no bajo: entonces el piso de PASOS_DE_LA_GUIA no mide nada",
  );
});

test("guia · la guia sigue enlazada desde el README, el indice y la puerta de entrada", () => {
  const desde = {
    "README.md": "docs/04-arrancar-acompanado.md",
    "docs/README.md": "04-arrancar-acompanado.md",
    "docs/01-introduccion.md": "04-arrancar-acompanado.md",
  };
  for (const [archivo, ruta] of Object.entries(desde)) {
    assert.ok(
      leer(archivo).includes(ruta),
      `${archivo} no enlaza la guia paso a paso. Es la pagina de quien tiene que arrancar el proyecto sin ser ` +
        "tecnico: si no esta enlazada desde los tres lugares por los que esa persona entra, no existe.",
    );
  }
  const indice = leer(INDICE);
  const desdeAhi = indice.indexOf("## Por dónde empezar");
  assert.ok(desdeAhi !== -1, `no encontre '## Por dónde empezar' en ${INDICE}: actualiza este ancla`);
  assert.ok(
    indice.slice(desdeAhi).includes("04-arrancar-acompanado.md"),
    `'Por dónde empezar' de ${INDICE} no ofrece la guia paso a paso, y esa seccion es la que se lee cuando ` +
      "alguien no sabe por donde arrancar.",
  );
});

// ---------------------------------------------------------------------------
// REFUTACIONES: cada regla, rota a proposito sobre una copia en memoria.
// ---------------------------------------------------------------------------

test("refutacion · una pagina sin frase de audiencia se ve", () => {
  const texto = leer("docs/03-stack.md");
  assert.ok(fraseDeAudiencia(texto) !== null, "docs/03-stack.md perdio su frase de audiencia: arregla la pagina");
  const mutada = texto.replace("**Para quién es esta página.**", "**De qué habla esta página.**");
  assert.equal(
    fraseDeAudiencia(mutada),
    null,
    "le saque la frase de audiencia a una copia y la comprobacion no lo vio: entonces su verde no significa nada",
  );
});

test("refutacion · una frase de audiencia que llega tarde no cuenta", () => {
  // Decirlo en la linea cien es no decirlo: el lector ya decidio si sigue.
  const texto = leer("docs/06-para-el-po.md");
  const lineas = texto.split("\n");
  const tarde = [...lineas.slice(0, 2), ...Array(LINEAS_DE_APERTURA + 5).fill(""), ...lineas.slice(2)].join("\n");
  assert.equal(
    fraseDeAudiencia(tarde),
    null,
    `empuje la frase mas alla de la linea ${LINEAS_DE_APERTURA} y la comprobacion la siguio dando por buena`,
  );
});

test("refutacion · una palabra del glosario metida sin enlace se ve, en cualquier pagina", () => {
  const texto = leer("docs/08-upgrade-openspec.md");
  const termino = TERMINOS.find((t) => !terminosUsados(texto, TERMINOS).includes(t));
  assert.ok(termino, "esa pagina ya usa todas las palabras del glosario: no queda ninguna con que mutar");
  const mutada = `${texto}\n\nY entonces el equipo revisa el ${termino} antes de integrar.\n`;
  assert.deepEqual(
    jergaSinEnlazar(mutada, TERMINOS),
    [termino],
    `le meti "${termino}" a la pagina sin enlace y la comprobacion no lo vio: su verde no significa nada`,
  );
});

test("refutacion · control · la misma palabra CON su enlace no se marca, y da igual el prefijo de la ruta", () => {
  const texto = leer("README.md");
  const termino = TERMINOS.find((t) => !terminosUsados(texto, TERMINOS).includes(t));
  assert.ok(termino, "el README ya usa todas las palabras del glosario: no queda ninguna con que mutar");
  const mutada = `${texto}\n\nY entonces se revisa el [${termino}](docs/02-glosario.md) antes de integrar.\n`;
  assert.deepEqual(
    jergaSinEnlazar(mutada, TERMINOS),
    [],
    "la comprobacion marca una palabra que SI esta enlazada, solo porque el enlace va con prefijo de carpeta. " +
      "Asi la regla seria imposible de cumplir desde la raiz y la proxima persona la apagaria en vez de arreglarla",
  );
});

test("refutacion · una palabra de oficio metida en una pagina del carril duro se ve", () => {
  const mutada = `${leer("docs/README.md")}\n\nY despues se revisa que el pipeline haya quedado verde.\n`;
  assert.ok(
    jergaDeOficio(mutada, SIN_TRADUCCION).includes("pipeline"),
    "le meti 'pipeline' a la prosa del indice y la lista no lo vio. Es textualmente la palabra que estuvo en esa " +
      "pagina —tres veces, con 'check' y 'deploy'— mientras el banco entero salia verde",
  );
});

test("refutacion · una pagina de docs/ que el indice no enumera se ve", () => {
  const indice = leer(INDICE);
  const mutado = indice.replace("](10-consumidores.md)", "](otra-cosa.md)");
  assert.notEqual(mutado, indice, "el indice ya no enlaza 10-consumidores.md con esa forma: actualiza esta refutacion");
  assert.deepEqual(
    sinIndexar(ALCANCE, mutado),
    ["docs/10-consumidores.md"],
    "saque una pagina del indice y la comprobacion no lo vio. Este caso cubria ademas el falso verde de la " +
      "subcadena, que los numeros mataron: hasta el renombrado 'consumidores.md' vivia dentro de " +
      "'censo-de-consumidores.md' y una busqueda floja daba la pagina por indexada gracias a la mencion de otra. " +
      "Hoy no colisionan, asi que lo que este caso vigila es lo que siempre importo: que sacar una pagina del " +
      "indice se vea",
  );
});

test("refutacion · control · una pagina historica no arrastra al estandar a las demas", () => {
  // La exencion sale del indice, no de una lista escrita aca. Si el indice deja
  // de declararla historica, la pagina entra al estandar — y este control es el
  // que avisa de que la exencion hoy esta puesta y de quien depende.
  assert.ok(
    esHistorica("docs/12-auditoria-cierre-v1.md"),
    `${INDICE} dejo de declarar 12-auditoria-cierre-v1.md como **Histórico**. Entonces esa pagina entra al ` +
      "estandar: o se le agrega la frase de audiencia y el vocabulario enlazado, o se le devuelve la etiqueta.",
  );
  assert.ok(
    !esHistorica("docs/03-stack.md"),
    "el lector del indice esta clasificando como historica una pagina canonica: la exencion se volvio un agujero",
  );
});
