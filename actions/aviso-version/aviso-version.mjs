#!/usr/bin/env node
// Aviso de versión a consumidores: ARMA el mensaje que reciben los proyectos
// cuando el marco publica una versión. **No lo envía**, y no conoce el destino.
//
// Por qué existe (fila 14 del backlog de `docs/11-reglas-no-escritas.md`): el
// CHANGELOG y el release son superficie de CONSULTA, no de NOTIFICACIÓN. Con un
// bump del PR de Dependabot (o, hasta la 1.3.0, por el tag móvil), un consumidor
// recibe comportamiento nuevo —incluido un check que lo
// pone en rojo— sin haber leído nada. Pasó el 2026-08-19: al mover `v1`, el
// segundo consumidor quedó a un push de un rojo que nadie le anunció.
//
// LA DECISIÓN CENTRAL: el contenido sale del `CHANGELOG.md`, que YA se escribe
// por versión diciendo qué tiene que hacer un consumidor (sección
// «Para consumidores», obligatoria por convención del propio archivo). No hay un
// formato paralelo que alguien tenga que mantener sincronizado: si el aviso dice
// algo distinto del CHANGELOG, es porque el CHANGELOG cambió, y esa es la única
// fuente que se edita.
//
// LA SEGUNDA DECISIÓN: esta pieza es PURA y no toca el secreto. Lee un archivo,
// devuelve texto y escribe un payload JSON en disco. El envío —lo único que
// necesita el destino— vive en el workflow, en cinco líneas de bash. Esa
// separación es lo que hace el aviso verificable sin credenciales: cualquiera
// puede correr esto en su máquina y ver EXACTAMENTE qué se enviaría.
//
//   node actions/aviso-version/aviso-version.mjs      (con AVISO_VERSION=1.2.0)
//
// Fail-open ruidoso (regla 3): si la entrada existe pero le falta la sección
// «Para consumidores», el aviso NO se calla — ARMA el mensaje con el cuerpo
// completo de la versión y emite un `::warning::` con el motivo. La rama de duda
// va al camino caro (mandar de más) y lo dice. «Arma» y no «manda»: ese cuerpo
// pasa por el mismo límite que cualquier mensaje, así que si no entra llega
// recortado, y los dos avisos dicen a cuánto y qué hacer (escribir la sección,
// no acortarla). En el marco esa ausencia ya es ROJO antes, en el PR que escribe
// la entrada: la mide `herramientas/aviso-entra-en-el-mensaje.mjs` en el CI propio.
//
// Rojo (no hay degradación posible): si el CHANGELOG no tiene entrada para la
// versión publicada, no hay mensaje que armar. Se sale 1 con el arreglo escrito.
//
// Variables de entorno:
//   AVISO_VERSION     (obligatoria) versión o tag: "1.2.0" o "v1.2.0"
//   AVISO_CHANGELOG   ruta del changelog        (default: CHANGELOG.md)
//   AVISO_LIMITE      largo máximo del mensaje  (default: LIMITE_POR_DEFECTO, abajo)
//   AVISO_CAMPO       campo de texto del payload JSON (default: text)
//   AVISO_FORMATO     dialecto del destino: markdown | mrkdwn (default: FORMATO_POR_DEFECTO)
//   AVISO_SALIDA      ruta del payload a escribir (default: $RUNNER_TEMP o cwd)
//   GITHUB_SERVER_URL / GITHUB_REPOSITORY   para armar los enlaces

import { appendFileSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** Largo por defecto del mensaje, y el ÚNICO lugar donde vive el número.
 *
 *  Slack corta los bloques en 3000 y Google Chat en 4096: 3500 entra en el mensaje
 *  de casi cualquier destino sin recortar la sección que importa. Se puede cambiar
 *  por el input `limite`, pero el default es ESTE.
 *
 *  UN NÚMERO, UN LUGAR. `action.yml` no declara default para `limite`: un vacío cae
 *  acá. En Rigel —el marco del que Projects se bifurcó— el action.yml repetía el
 *  número como `default: "3500"`, que viaja como AVISO_LIMITE y GANA sobre esta
 *  constante; el día que la constante subió, la compuerta del PR midió contra el
 *  número nuevo y el envío siguió recortando en el viejo, en silencio. Lo sostiene
 *  `pruebas/ci-del-marco/aviso-entra-en-el-mensaje.test.mjs`.
 *
 *  POR QUÉ NO SE SUBE TODAVÍA. Rigel lo llevó a 7000 midiendo SU destino (Slack con
 *  el campo `text`, donde 3000 es el tope de un bloque y no del campo). El destino de
 *  Projects no está medido —ni siquiera configurado: el secret AVISO_VERSION_DESTINO
 *  no existe (docs/16-auditoria-cierre-v1.md, hallazgo 12)— y el campo es
 *  configurable por `vars.AVISO_VERSION_CAMPO`. Subirlo sin medir es apostar el único
 *  mensaje que los consumidores leen. */
export const LIMITE_POR_DEFECTO = 3500;

/**
 * Los dialectos de destino, y por qué esto es un PARÁMETRO y no una conversión
 * incondicional.
 *
 * El mensaje MEZCLABA LOS DOS. Su encuadre —«Qué tiene que hacer un consumidor:»— iba
 * con un asterisco, que es negrita en Slack, y el cuerpo que sale del CHANGELOG iba con
 * dos, que es negrita en Teams y Discord. Ningún destino lo renderizaba entero bien: en
 * Slack el cuerpo mostraba los `**` a la vista, y en un destino markdown el encuadre
 * salía en itálica. A Rigel —el marco del que Projects se bifurcó— se lo mostró su
 * canal real el 2026-09-02 (su 1.15.0, 12 líneas; commit 8b073e0).
 *
 * El arreglo obvio —`**` a `*` siempre— habría ROTO a Teams y a Discord. El destino de
 * este aviso no está cableado a propósito, así que el dialecto tampoco:
 *
 * - `markdown` es el DEFAULT y no traduce nada del CHANGELOG. Lo único que cambia para
 *   quien no declara nada es el encuadre, que deja de hablar el dialecto de Slack.
 * - `mrkdwn` es el de Slack: un asterisco para negrita, una tilde para tachado,
 *   `<url|texto>` para enlaces, y ni tablas ni encabezados (ver `aMrkdwn`).
 *
 * UN VALOR, UN LUGAR, como `LIMITE_POR_DEFECTO`: `action.yml` no le pone default al
 * input `formato`. Además de lo que ya enseñó el límite, acá hay una razón propia: sin
 * default en el YAML, un input vacío le dice al script que NADIE declaró el dialecto, y
 * eso se puede anunciar (ver `main`). En Rigel el YAML decía `default: markdown` y el
 * workflow `|| 'markdown'`, así que el script no podía distinguir «se eligió markdown»
 * de «la preferencia quedó en el lugar equivocado» — que es lo que les pasó.
 */
export const FORMATOS = Object.freeze(["markdown", "mrkdwn"]);
export const FORMATO_POR_DEFECTO = "markdown";

/** El release publica el tag inmutable `vX.Y.Z`; el CHANGELOG titula `[X.Y.Z]`.
 *  Se aceptan las dos formas para que nadie tenga que acordarse de cuál va. */
export function normalizarVersion(tag) {
  return String(tag ?? "")
    .trim()
    .replace(/^v/i, "");
}

/** Semver, que es lo que AGENTS.md fija para los tags de release. La guarda vive
 *  en la entrada de `main`, no en el extractor: el extractor es genérico y sabe
 *  encontrar cualquier encabezado del changelog. */
export function esVersionSemver(version) {
  return /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)*$/.test(String(version));
}

/**
 * Cuerpo de una versión del CHANGELOG: desde su encabezado `## [X.Y.Z]` hasta
 * el siguiente encabezado de nivel 2 (o el final del archivo).
 *
 * Se compara el contenido de los corchetes, no la línea entera, porque el
 * encabezado lleva fecha (`## [1.2.0] — 2026-08-19`) y la fecha del release no
 * tiene por qué coincidir con la del archivo.
 */
export function extraerSeccionVersion(changelog, version) {
  const objetivo = normalizarVersion(version);
  if (!objetivo) return { encontrada: false, encabezado: "", cuerpo: "" };

  const lineas = String(changelog).split(/\r?\n/);
  const esH2 = (l) => /^##\s+/.test(l);
  const tituloDe = (l) => (l.match(/^##\s+\[([^\]]+)\]/) ?? [])[1];

  let inicio = -1;
  for (let i = 0; i < lineas.length; i += 1) {
    if (!esH2(lineas[i])) continue;
    const titulo = tituloDe(lineas[i]);
    if (titulo && normalizarVersion(titulo) === objetivo) {
      inicio = i;
      break;
    }
  }
  if (inicio === -1) return { encontrada: false, encabezado: "", cuerpo: "" };

  let fin = lineas.length;
  for (let i = inicio + 1; i < lineas.length; i += 1) {
    if (esH2(lineas[i])) {
      fin = i;
      break;
    }
  }

  return {
    encontrada: true,
    encabezado: lineas[inicio].replace(/^##\s+/, "").trim(),
    cuerpo: limpiarBordes(lineas.slice(inicio + 1, fin).join("\n")),
  };
}

/**
 * Valida el dialecto y devuelve el normalizado. Vacío es «no declarado» y cae en el
 * default; cualquier otro valor desconocido es ROJO y no un silencioso caer al default:
 * un typo en la variable haría salir el aviso en el dialecto equivocado, y nadie sabría
 * por qué. Se recorta el espaciado —un YAML lo mete sin querer— pero no se adivina la
 * caja ni la ortografía: el mensaje dice los valores que existen.
 */
export function validarFormato(formato) {
  const f = String(formato ?? "").trim() || FORMATO_POR_DEFECTO;
  if (!FORMATOS.includes(f)) {
    throw new Error(
      `dialecto de destino desconocido: "${f}". Los que existen son ${FORMATOS.join(" y ")}. ` +
        "Arreglo: corregir el input `formato` del aviso —en el workflow del marco, la VARIABLE de repositorio " +
        'AVISO_VERSION_FORMATO—: "markdown" (el default) para Teams y Discord, "mrkdwn" para Slack'
    );
  }
  return f;
}

/** Negrita en el dialecto que corresponda. La usan las líneas que escribe este script:
 *  el encuadre tiene que hablar el mismo dialecto que el cuerpo. */
export function enfasis(texto, formato = FORMATO_POR_DEFECTO) {
  return validarFormato(formato) === "mrkdwn" ? `*${texto}*` : `**${texto}**`;
}

/**
 * Aparta el código —cercado y en línea— dejando un centinela en su lugar, y devuelve
 * la función que lo vuelve a poner.
 *
 * POR QUE UN CENTINELA Y NO UN `split`. Partir el texto por los spans de código y
 * convertir trozo por trozo protege el código, sí, pero **parte también las negritas
 * que lo envuelven**: en `**la salida \`x\` de \`y\`**` la apertura queda en un trozo y
 * el cierre en otro, ninguno tiene par ahí, y el `**` que sobrevive se empareja con el
 * de la negrita VECINA. El síntoma no es un `**` a la vista: es la negrita corrida media
 * frase. Rigel lo tuvo así y lo mandó a sus tres consumidores dos veces (su 2.0.0 y su
 * 2.3.0, issue #358, commit 683343a), con un comentario que afirmaba que el caso «hoy no
 * aparece en el CHANGELOG». Era falso: 18 de sus 30 entradas lo tenían. Acá se trae
 * con el arreglo puesto desde el primer día.
 *
 * Y ES LO QUE CUBRE LOS DOS SENTIDOS, que es la razón de no arreglarlo haciendo que el
 * código «gane la carrera del scan» con una alternativa en el propio regex: eso deja
 * pasar el caso simétrico —una negrita que envuelve un span que TIENE `**` adentro—,
 * porque la de afuera se cierra contra el `**` de adentro y reescribe lo que el
 * consumidor va a copiar y pegar. Apartado, el código no participa de ningún
 * emparejamiento.
 */
export function apartarCodigo(texto) {
  const t = String(texto);
  // Un centinela que el texto NO contenga. NUL no aparece en un Markdown que git trata
  // como texto, pero alargarlo cuesta una comparación y saca la pregunta de la mesa: el
  // índice va entre dos marcas, así que sin una corrida de NUL igual de larga en el
  // texto no hay centinela que se pueda confundir.
  let marca = "\u0000";
  while (t.includes(marca)) marca += "\u0000";

  const guardado = [];
  const conCentinelas = t.replace(/```[\s\S]*?```|`[^`\n]*`/g, (codigo) => {
    guardado.push(codigo);
    return `${marca}${guardado.length - 1}${marca}`;
  });
  const restaurar = (s) =>
    String(s).replace(new RegExp(`${marca}(\\d+)${marca}`, "g"), (_, n) => guardado[Number(n)]);
  return { conCentinelas, restaurar };
}

/**
 * Traduce markdown a mrkdwn **sin tocar el código**.
 *
 * DOS PASADAS CON DOS PROTECCIONES DISTINTAS, y la separación es lo que Rigel aprendió
 * rompiéndose:
 *
 *  1. **De LÍNEA** (tablas y desenvuelto). Aparta sólo los bloques cercados, donde el
 *     salto de línea es contenido, y PARTE el texto por ellos: necesita ver líneas
 *     completas, y un span en línea no le estorba. Su primera versión partía también
 *     por los spans en línea y la conversión de tablas no disparaba nunca: las filas
 *     llevan nombres entre backticks, el split las cortaba y ningún pedazo parecía ya
 *     una fila. Verde por imposibilidad (su commit a94ad84).
 *  2. **De INLINE** (negrita, tachado, enlaces, encabezados). Aparta además los spans
 *     en línea, donde un `**` es algo que el consumidor va a copiar y pegar — pero con
 *     centinela, no partiendo, porque una negrita puede envolverlos (`apartarCodigo`).
 */
export function aMrkdwn(texto) {
  // --- Pasada de LINEA: solo los bloques cercados quedan afuera ---
  const porBloques = String(texto).split(/(```[\s\S]*?```)/);
  const conLineas = porBloques
    .map((trozo, i) => (i % 2 === 1 ? trozo : desenvolverParrafos(tablasALista(trozo))))
    .join("");

  // --- Pasada de INLINE: el codigo se APARTA, no parte el texto ---
  const { conCentinelas, restaurar } = apartarCodigo(conLineas);
  return restaurar(
    conCentinelas
      // No codicioso, para no fundir dos negritas distintas en una. `[\s\S]` y no `.`:
      // si algun corte de linea sobrevive al desenvuelto, la negrita igual se empareja
      // con su par y no con la de la linea siguiente.
      .replace(/\*\*([\s\S]+?)\*\*/g, "*$1*")
      .replace(/~~([\s\S]+?)~~/g, "~$1~")
      .replace(/\[([^\]\n]+)\]\((https?:\/\/[^)\s]+)\)/g, "<$2|$1>")
      // mrkdwn no tiene encabezados: el nivel se pierde igual, asi que al menos que se
      // lea como un titulo y no como almohadillas sueltas.
      .replace(/^#{1,6}\s+(.+)$/gm, "*$1*")
  );
}

/**
 * Convierte una tabla de markdown en una lista, porque **mrkdwn no tiene tablas**: en
 * Slack llegaban las barras y la línea de guiones del separador a la vista (Rigel,
 * 2026-09-02, commit a94ad84). El `CHANGELOG.md` de Projects también escribe tablas.
 *
 * LA FORMA: una viñeta por fila, con la PRIMERA celda como sujeto en negrita y las
 * demás etiquetadas con su encabezado. No se pierde información —cada valor viaja con
 * el nombre de su campo—, solo la alineación en columnas. Se descartó el bloque
 * monoespaciado, que sí alinea: los bloques de código de Slack **no envuelven**, así que
 * una celda de texto largo obliga a scrollear horizontal y en el móvil queda inusable.
 *
 * Se usa `- ` y no `•`: es la viñeta que `desenvolverParrafos` ya reconoce como
 * estructura, así que no hay que enseñarle un símbolo nuevo.
 */
export function tablasALista(texto) {
  const lineas = String(texto).split("\n");
  const esFila = (l) => /^\s*\|.*\|\s*$/.test(l);
  const esSeparador = (l) => /^\s*\|[\s|:-]*\|\s*$/.test(l) && /-/.test(l);
  const celdas = (l) =>
    l
      .trim()
      .replace(/^\|/, "")
      .replace(/\|$/, "")
      .split("|")
      .map((c) => c.trim());

  const salida = [];
  for (let i = 0; i < lineas.length; i += 1) {
    // Una tabla es un encabezado seguido de su separador. Sin el separador no es una
    // tabla: es una linea que empieza con barra, y esa se deja como esta.
    if (!(esFila(lineas[i]) && i + 1 < lineas.length && esSeparador(lineas[i + 1]))) {
      salida.push(lineas[i]);
      continue;
    }
    const encabezados = celdas(lineas[i]);
    i += 2; // saltea el encabezado y el separador
    for (; i < lineas.length && esFila(lineas[i]); i += 1) {
      const valores = celdas(lineas[i]);
      const sujeto = valores[0] ?? "";
      const resto = valores
        .slice(1)
        .map((v, n) => {
          const etiqueta = encabezados[n + 1];
          // Sin encabezado utilizable, el valor va suelto: inventar una etiqueta seria
          // peor que no ponerla.
          return etiqueta ? `${etiqueta}: ${v}` : v;
        })
        .filter((v) => v !== "");
      // EL SUJETO SE EMITE EN MARKDOWN (dos asteriscos), y traducirlo es de la pasada de
      // inline: una sola traduccion, en un solo lugar donde puede volver a fallar. En
      // Rigel esta funcion emitia `*` directo para esquivar el defecto de la negrita que
      // envuelve codigo; con `apartarCodigo` ese rodeo sobra (su commit 683343a).
      //
      // Y NO SE ENVUELVE UN SUJETO QUE YA TRAE NEGRITA: `**` alrededor de un `**` deja
      // `****`, que no se empareja en ningun dialecto. Medido en la 1.9.0 de Rigel, donde
      // envolverla SUMABA un asterisco a la vista en vez de quitarlo.
      const enNegrita = (s) => (s.includes("**") ? s : `**${s}**`);
      salida.push(resto.length ? `- ${enNegrita(sujeto)} — ${resto.join(" · ")}` : `- ${enNegrita(sujeto)}`);
    }
    i -= 1; // el for exterior vuelve a incrementar
  }
  return salida.join("\n");
}

/**
 * Junta en una sola línea lo que el CHANGELOG cortó a ~85 columnas: las líneas de un
 * párrafo, y las de continuación de un ítem de lista.
 *
 * POR QUE EXISTE: **Slack no renderiza negrita a través de un salto de línea**, y el
 * CHANGELOG está cortado para leerse en un editor, así que sus negritas cruzan el
 * corte y llegan con los asteriscos literales. En Rigel, medido sobre el payload real de
 * su 1.15.0: 3 negritas de 11 cruzaban (commit b6c689b). El corte es del archivo; un
 * chat reflowea solo.
 *
 * LA CONTINUACIÓN DEL ÍTEM ES LO QUE RIGEL DEJÓ ABIERTO, y en Projects es el caso
 * común. Su versión juntaba sólo párrafos de prosa y trataba toda línea que siguiera a
 * una viñeta como estructura, así que `- **negrita que sigue` + `  abajo.**` llegaba
 * partida — su propio comentario lo declaraba. El `CHANGELOG.md` de Projects escribe
 * casi todo en viñetas envueltas: el barrido del banco contra el archivo real lo mide.
 * Una línea que sigue a un ítem sin ser estructura es, en CommonMark, parte del párrafo
 * de ese ítem (indentada o «perezosa»), y juntarla no cambia lo que el ítem dice.
 *
 * LO QUE NO SE JUNTA, porque ahí el salto de línea ES estructura: el arranque de cada
 * viñeta o ítem numerado, las filas de tabla, las citas, los encabezados, las reglas
 * horizontales y las líneas en blanco. Juntar una lista la volvería un párrafo; una
 * cita conserva su corte porque cada línea lleva su `>`.
 *
 * Los bloques cercados no llegan acá: `aMrkdwn` los aparta antes.
 */
export function desenvolverParrafos(texto) {
  const esItem = (l) => /^\s*(?:[-*+]\s|\d+[.)]\s)/.test(l);
  const esEstructura = (l) =>
    l.trim() === "" ||
    esItem(l) ||
    /^\s*\|/.test(l) || // fila de tabla
    /^\s*>/.test(l) || // cita
    /^\s*#{1,6}\s/.test(l) || // encabezado
    /^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/.test(l); // regla horizontal

  const salida = [];
  // Si la ultima linea emitida es un item (o un item al que ya se le pego su
  // continuacion). Se lleva aparte porque, una vez pegada, la linea sigue siendo el item.
  let enItem = false;
  for (const linea of String(texto).split("\n")) {
    const anterior = salida[salida.length - 1];
    const seJunta =
      anterior !== undefined && !esEstructura(linea) && (enItem || !esEstructura(anterior));
    if (!seJunta) {
      salida.push(linea);
      enItem = esItem(linea);
      continue;
    }
    salida[salida.length - 1] = `${anterior.trimEnd()} ${linea.trimStart()}`;
  }
  return salida.join("\n");
}

/** Saca líneas vacías y los separadores `---` que el formato deja entre
 *  versiones: son del archivo, no del mensaje. */
export function limpiarBordes(texto) {
  return String(texto)
    .replace(/^(?:\s*\n)+/, "")
    .replace(/(?:\n\s*(?:-{3,}|\*{3,})?\s*)+$/, "")
    .trimEnd();
}

/**
 * La sección accionable: «Para consumidores». El encabezado se busca por
 * PREFIJO (`### Para consumidores — lo que sea`) y sin distinguir mayúsculas,
 * para que una variante de redacción no apague el aviso en silencio.
 */
export function extraerParaConsumidores(cuerpo) {
  const lineas = String(cuerpo).split(/\r?\n/);
  const esEncabezadoBuscado = (l) => /^#{3,}\s+para\s+consumidores\b/i.test(l);
  const esEncabezado = (l) => /^#{2,4}\s+/.test(l);

  const inicio = lineas.findIndex(esEncabezadoBuscado);
  if (inicio === -1) return { encontrada: false, texto: "" };

  let fin = lineas.length;
  for (let i = inicio + 1; i < lineas.length; i += 1) {
    if (esEncabezado(lineas[i])) {
      fin = i;
      break;
    }
  }
  return { encontrada: true, texto: limpiarBordes(lineas.slice(inicio + 1, fin).join("\n")) };
}

/**
 * Las líneas BREAKING, derivadas de la convención que el propio CHANGELOG
 * declara ("se marca en mayúsculas al inicio de la línea"). Es una PROPIEDAD del
 * texto, no una lista que alguien mantenga: si mañana hay un breaking nuevo, el
 * aviso lo destaca sin que nadie toque este archivo.
 */
export function lineasBreaking(cuerpo) {
  // PEGA LAS LINEAS DE CONTINUACION DE LA VIÑETA, y no es un detalle de presentacion.
  //
  // Esto filtraba lineas FISICAS y devolvia solo la que matchea. La unica viñeta
  // BREAKING del `[No publicado]` de este repo viene envuelta en cuatro lineas, asi que
  // el aviso del proximo release iba a publicar «…—hoy, nadie—: `produccion`» y ahi
  // terminaba, sin decir QUE cambia. Medido el 2026-09-17. A Rigel le paso lo mismo en
  // el anuncio de su 2.0.0, con el `**` sin cerrar (su commit 0363a05).
  //
  // Envolver a ~88 columnas es lo que hace prettier y lo que hace cualquiera
  // escribiendo, asi que arreglar solo el CHANGELOG dejaba el defecto esperando la
  // proxima viñeta envuelta.
  //
  // LIMITE DECLARADO: la continuacion termina en la primera linea vacia. Una viñeta
  // BREAKING con un segundo parrafo lleva al aviso solo el primero; el resto sigue en
  // el CHANGELOG, que el mensaje enlaza.
  const lineas = String(cuerpo).split(/\r?\n/);
  const arrancaViñeta = (l) => /^\s*(?:[-*+]\s+)/.test(l);
  const esBreaking = (l) => /^\s*(?:[-*+]\s+)?\**BREAKING\b/.test(l);

  const salida = [];
  for (let i = 0; i < lineas.length; i += 1) {
    if (!esBreaking(lineas[i])) continue;
    const partes = [lineas[i].trim()];
    // Sigue mientras la linea este indentada, no arranque otra viñeta y no sea un
    // encabezado ni una linea vacia: eso es exactamente una continuacion de esta viñeta.
    for (let j = i + 1; j < lineas.length; j += 1) {
      const l = lineas[j];
      if (l.trim() === "" || arrancaViñeta(l) || /^\s*#/.test(l) || !/^\s+\S/.test(l)) break;
      partes.push(l.trim());
      i = j;
    }
    salida.push(partes.join(" "));
  }
  return salida;
}

/** Recorta al límite por el último salto de línea que entre, y DICE que
 *  recortó: un mensaje truncado en silencio es peor que uno largo. */
export function recortar(texto, limite, urlRelease) {
  const t = String(texto);
  if (t.length <= limite) return { texto: t, recortado: false };

  const cola = `\n\n… (recortado acá; el resto, en el release: ${urlRelease})`;
  const disponible = Math.max(0, limite - cola.length);
  const corte = t.lastIndexOf("\n", disponible);
  const cuerpo = t.slice(0, corte > 0 ? corte : disponible).trimEnd();
  return { texto: cuerpo + cola, recortado: true };
}

/**
 * El mensaje completo. Tres bloques: qué se publicó, qué tiene que hacer el consumidor
 * (verbatim del CHANGELOG, en el dialecto del destino) y dónde está todo.
 */
export function construirMensaje({
  version,
  seccion,
  urlRelease,
  urlChangelog,
  limite = LIMITE_POR_DEFECTO,
  formato = FORMATO_POR_DEFECTO,
}) {
  // Se valida ANTES de armar nada: un dialecto invalido no puede producir medio mensaje.
  const dialecto = validarFormato(formato);
  // El CHANGELOG esta escrito en markdown; traducirlo es del dialecto del destino. Y el
  // encuadre que escribe este script pasa por `negrita`, asi que las dos mitades del
  // mensaje hablan siempre el mismo dialecto.
  const traducir = (t) => (dialecto === "mrkdwn" ? aMrkdwn(t) : t);
  const negrita = (t) => enfasis(t, dialecto);

  const breaking = lineasBreaking(seccion.cuerpo);
  const consumidores = extraerParaConsumidores(seccion.cuerpo);

  // EL PUNTERO SE DERIVA DE LA VERSION, no se escribe. Decia `v1` literal: hoy es
  // verdad, y el dia que se abra la linea 2 el anuncio de la 2.0.0 iba a nombrar el
  // puntero de la linea 1. A Rigel le paso exactamente eso (su commit c677ede).
  //
  // EL CANAL ES DEPENDABOT (decision D2 del PO, 2026-09-17), y no queda escrito a ciegas:
  // el banco lo ata a `plantilla/.github/dependabot.yml`. Si el andamio deja de recibir
  // el bump del marco por Dependabot, esta frase se pone roja en vez de quedar vieja.
  //
  // Y NO SE CUENTAN REFERENCIAS: cuantas lineas del marco usan el puntero no es asunto
  // del consumidor, y un numero mantenido a mano en la unica prosa del marco que viaja
  // directo a los consumidores obliga a acordarse.
  const punteroDeLaLinea = `v${String(version).split(".")[0]}`;
  const partes = [
    `Projects ${version} publicado.` +
      " El bump llega a cada repo como PR de Dependabot, sobre la version exacta." +
      ` El tag movil \`${punteroDeLaLinea}\` no es el canal de distribucion: existe solo para` +
      " la referencia interna del marco que no puede pinar una version exacta.",
  ];

  if (breaking.length) {
    partes.push(
      "",
      "BREAKING — un consumidor que mergee este bump se puede romper:",
      ...breaking.map((l) => traducir(l.startsWith("-") ? l : `- ${l}`))
    );
  }

  if (consumidores.encontrada) {
    partes.push("", negrita("Qué tiene que hacer un consumidor:"), "", traducir(consumidores.texto));
  } else {
    // Fail-open ruidoso: se manda de mas, no de menos, y el motivo viaja
    // adentro del mensaje ademas de en el ::warning:: del log.
    partes.push(
      "",
      negrita("La entrada de esta versión no trae la sección «Para consumidores».") +
        " Va el cuerpo completo; lo que aplique a tu repo, sale de acá:",
      "",
      traducir(seccion.cuerpo)
    );
  }

  partes.push("", `Release: ${urlRelease}`, `CHANGELOG: ${urlChangelog}`);

  const { texto, recortado } = recortar(partes.join("\n"), limite, urlRelease);
  return {
    mensaje: texto,
    breaking: breaking.length > 0,
    sinParaConsumidores: !consumidores.encontrada,
    recortado,
    // El dialecto que se USO, no el que se pidio: `validarFormato` normaliza, y quien
    // llama lo tiene que poder decir sin volver a resolverlo.
    dialecto,
  };
}

/** Los dos enlaces del mensaje, en UN solo lugar. Cuentan para el límite, así que
 *  quien quiera medir el mensaje que se manda los tiene que armar igual: la compuerta
 *  del CHANGELOG (`herramientas/aviso-entra-en-el-mensaje.mjs`) llama a esta misma
 *  función en vez de reconstruirlos. En Rigel —el marco del que Projects se bifurcó—
 *  la compuerta los rearmaba con `blob/main/` y medía tres caracteres de menos sin
 *  que nadie lo notara. El default del repo es el único literal de la cuenta en este
 *  archivo, y `docs/15-forkear-el-marco.md` lo lista para quien copie el marco. */
export function enlacesDelRelease(version, env = process.env) {
  const servidor = env.GITHUB_SERVER_URL || "https://github.com";
  const repo = env.GITHUB_REPOSITORY || "im-diego-ec/Projects";
  return {
    urlRelease: `${servidor}/${repo}/releases/tag/v${version}`,
    urlChangelog: `${servidor}/${repo}/blob/v${version}/CHANGELOG.md`,
  };
}

/** El payload que se POSTea. El campo es parametrizable porque el destino no
 *  esta cableado: `text` sirve para Slack, Google Chat y Teams; Discord usa
 *  `content`. Se arma con JSON.stringify — el CHANGELOG es texto arbitrario y
 *  jamas se interpola a mano. */
export function construirPayload(mensaje, campo = "text") {
  return JSON.stringify({ [campo]: mensaje });
}

function escribirSalidas(pares) {
  const destino = process.env.GITHUB_OUTPUT;
  if (!destino) return;
  const lineas = Object.entries(pares).map(([k, v]) => `${k}=${v}`);
  try {
    appendFileSync(destino, lineas.join("\n") + "\n");
  } catch (e) {
    console.log(`::warning::no se pudieron escribir las salidas de la action: ${e.message}`);
  }
}

function resumir(lineas) {
  const destino = process.env.GITHUB_STEP_SUMMARY;
  if (!destino) return;
  try {
    appendFileSync(destino, lineas.join("\n") + "\n");
  } catch (e) {
    console.log(`::warning::no se pudo escribir el resumen de la corrida: ${e.message}`);
  }
}

export async function main(env = process.env) {
  const version = normalizarVersion(env.AVISO_VERSION);
  if (!version) {
    console.error(
      "::error::falta la version a avisar. Arreglo: pasarla en el input `version` del workflow_dispatch, " +
        "o dejar que el evento `release` la tome de `github.event.release.tag_name`"
    );
    return 1;
  }

  // El evento `release` siempre trae un tag real; el boton acepta texto libre.
  // Sin esta guarda, un dispatch con "No publicado" —que ES un encabezado del
  // CHANGELOG— arma un aviso perfectamente formado, con enlaces a un tag
  // inexistente, y lo manda al canal como si fuera una version. Se cazo
  // dogfoodeando el aviso contra este mismo repo.
  if (!esVersionSemver(version)) {
    console.error(
      `::error::"${version}" no es una version semver, asi que no puede haber un release con ese tag. ` +
        "Arreglo: disparar el boton con la version publicada (X.Y.Z, con o sin la v del tag). " +
        'Los encabezados que no son versiones —"No publicado"— existen en el CHANGELOG pero no se avisan'
    );
    return 1;
  }

  // EL DIALECTO SE VALIDA ANTES DE LEER NADA. Un valor desconocido es configuracion
  // rota —un typo en la variable—, y degradarlo al default mandaria el aviso en un
  // dialecto que nadie eligio. Rojo, con el arreglo, y sin payload.
  const formatoDeclarado = String(env.AVISO_FORMATO ?? "").trim();
  let formato;
  try {
    formato = validarFormato(formatoDeclarado);
  } catch (e) {
    console.error(`::error::${e.message}`);
    resumir([`## Aviso de version ${version}: NO ENVIADO`, "", `Dialecto de destino desconocido: \`${formatoDeclarado}\`.`]);
    return 1;
  }

  const rutaChangelog = env.AVISO_CHANGELOG || "CHANGELOG.md";
  let changelog;
  try {
    changelog = readFileSync(rutaChangelog, "utf8");
  } catch (e) {
    console.error(
      `::error::no se pudo leer ${rutaChangelog} (${e.code ?? e.message}). ` +
        "Arreglo: correr un `actions/checkout` antes de este paso, o apuntar `AVISO_CHANGELOG` al archivo real"
    );
    return 1;
  }

  const { urlRelease, urlChangelog } = enlacesDelRelease(version, env);

  const seccion = extraerSeccionVersion(changelog, version);
  if (!seccion.encontrada) {
    // ROJO, y no degradado: sin entrada no hay mensaje. Un aviso vacio o
    // inventado seria justamente el formato paralelo que este diseno evita.
    console.error(
      `::error::${rutaChangelog} no tiene entrada para la version ${version}, asi que no hay nada que avisar. ` +
        `Arreglo: agregar la seccion "## [${version}] — <fecha>" con su "### Para consumidores" en un PR a main, ` +
        "y volver a disparar este workflow con el boton (Actions -> Aviso de version a consumidores -> Run workflow), " +
        `version=${version} y simulacro desmarcado. El release ya publicado no se toca.`
    );
    resumir([`## Aviso de version ${version}: NO ENVIADO`, "", `\`${rutaChangelog}\` no tiene entrada para esta version.`]);
    return 1;
  }

  const limite = Number(env.AVISO_LIMITE || LIMITE_POR_DEFECTO);
  const armado = construirMensaje({ version, seccion, urlRelease, urlChangelog, limite, formato });
  const campo = env.AVISO_CAMPO || "text";
  const payload = construirPayload(armado.mensaje, campo);

  const salida = env.AVISO_SALIDA || join(env.RUNNER_TEMP || process.cwd(), "aviso-version.json");
  writeFileSync(salida, payload + "\n", "utf8");

  // EL DIALECTO SE DICE SIEMPRE, incluido el default. En Rigel, el 2026-09-02, la
  // preferencia se cargo como SECRET en vez de como VARIABLE; `vars.*` no ve secretos,
  // el workflow cayo al default sin decir nada y hubo que llegar con una captura del
  // canal para descubrirlo (su commit 04070a4). Caer a un default en silencio es el
  // fail-open que este marco prohibe.
  //
  // Aca se dice ademas SI ALGUIEN LO DECLARO, que alla no se podia: `action.yml` no le
  // pone default a `formato`, asi que un input vacio es «nadie lo declaro». La pieza
  // sigue sin conocer el destino, pero ya no presenta la caida al default como una
  // eleccion. El workflow del marco agrega lo que el script no puede ver: si hay un
  // SECRET con ese nombre (paso "Revisar donde esta declarado el dialecto").
  const negritaDelDialecto = armado.dialecto === "mrkdwn" ? "*un* asterisco" : "**dos** asteriscos";
  console.log(
    `::notice::mensaje armado con el dialecto '${armado.dialecto}' (negrita con ${negritaDelDialecto}), ` +
      (formatoDeclarado
        ? "declarado en el input `formato`. "
        : "el default: nadie lo declaro, el input `formato` llego vacio. ") +
      "Si el destino es Slack y el canal muestra los asteriscos dobles, falta declararlo: en el workflow del marco " +
      "es la VARIABLE de repositorio AVISO_VERSION_FORMATO=mrkdwn (pestaña Variables, no Secrets: `vars.*` no ve " +
      "secretos y el workflow caeria al default). Teams y Discord usan markdown, que es el default"
  );

  // «ARMADO», NO «COMPLETO». Este aviso decia «el aviso sale igual con el cuerpo
  // completo» incluso cuando ese cuerpo no entraba y se recortaba: medido el 2026-09-17
  // con AVISO_VERSION=1.9.0, las dos frases salian juntas sobre la misma entrada.
  if (armado.sinParaConsumidores) {
    console.log(
      `::warning::la entrada [${version}] del CHANGELOG no trae la seccion "### Para consumidores", ` +
        "que es la que dice que tiene que hacer un consumidor. El aviso sale igual, armado con el cuerpo " +
        "completo de la entrada" +
        (armado.recortado
          ? `, y ese cuerpo NO entra: se recorto a ${armado.mensaje.length} de ${limite} caracteres`
          : "") +
        ". Arreglo: agregar esa seccion a la entrada, aunque diga solo \"Nada que hacer\""
    );
  }
  // EL CONSEJO SE BIFURCA POR LA RAMA QUE `construirMensaje` TOMO DE VERDAD, y no por
  // el largo. Era el mismo texto en las dos ramas —«acortar la seccion Para
  // consumidores»—, asi que sin la seccion mandaba a acortar algo que no existe, y lo
  // que se termina acortando entonces es la entrada: detalle del marco borrado para que
  // entre un mensaje que, con la seccion escrita, nunca lo habria incluido. Rigel lo
  // cerro en su compuerta y lo dejo vivo aca, palabra por palabra (su commit caa6925).
  if (armado.recortado) {
    console.log(
      `::warning::el mensaje supero los ${limite} caracteres y se recorto a ${armado.mensaje.length}: ` +
        "el destino recibe el principio y el enlace al release. Arreglo: " +
        (armado.sinParaConsumidores
          ? `ESCRIBIR la seccion "### Para consumidores" en la entrada [${version}] — sin ella el aviso ` +
            "arma el mensaje con el cuerpo entero de la entrada, y es ese cuerpo el que no entra; con la " +
            "seccion escrita viaja solo el resumen"
          : "acortar la seccion \"Para consumidores\" (es un resumen accionable, no la entrada entera)") +
        ", o subir el input `limite`"
    );
  }
  if (armado.breaking) {
    console.log(
      `::warning::la entrada [${version}] declara cambios BREAKING. El aviso los pone primero. ` +
        "Con el bump por PR el consumidor puede NO mergearlo, asi que un breaking ya no rompe a nadie sin aviso; " +
        "igual se nombra en la seccion \"Para consumidores\" con lo que hay que hacer, porque quedarse en la version " +
        "vieja tampoco es gratis"
    );
  }

  // El mensaje COMPLETO queda en el resumen de la corrida SIEMPRE, se haya
  // enviado o no. Es lo que hace verificable el paso sin credenciales, y es el
  // destino de ultima instancia cuando no hay ninguno configurado.
  resumir([
    `## Aviso de version ${version}`,
    "",
    `- Enlace del release: ${urlRelease}`,
    `- Dialecto: \`${armado.dialecto}\`${formatoDeclarado ? "" : " (el default: nadie lo declaro)"}`,
    `- Seccion «Para consumidores»: ${armado.sinParaConsumidores ? "**ausente** (el mensaje se armo con el cuerpo completo de la entrada)" : "presente"}`,
    `- BREAKING declarado: ${armado.breaking ? "**si**" : "no"}`,
    `- Recortado: ${armado.recortado ? `**si** (limite ${limite})` : "no"}`,
    `- Largo del mensaje: ${armado.mensaje.length} caracteres`,
    "",
    "### Mensaje que se envia (verbatim)",
    "",
    "```text",
    armado.mensaje,
    "```",
  ]);

  console.log(`== mensaje armado para ${version} (${armado.mensaje.length} caracteres) ==`);
  console.log(armado.mensaje);
  console.log(`== payload escrito en ${salida} (campo "${campo}") ==`);

  escribirSalidas({
    version,
    payload: salida,
    breaking: String(armado.breaking),
    recortado: String(armado.recortado),
    sin_para_consumidores: String(armado.sinParaConsumidores),
  });

  return 0;
}

// Solo corre cuando se ejecuta como programa; importado desde las pruebas, no.
// La comparación pasa por realpath y, en Windows, ignora mayúsculas: la misma
// ruta llega con nombres cortos (JSANTA~1) o a través de un enlace de
// directorio, y una comparación literal contestaría "no soy el principal" y el
// proceso terminaría en exit 0 sin armar nada ni decir una palabra. Es el único
// fail-open posible de este script; lo cubre una prueba que lo spawnea.
function mismaRuta(a, b) {
  const real = (p) => {
    try {
      return realpathSync(p);
    } catch {
      return resolve(p);
    }
  };
  const [x, y] = [real(a), real(b)];
  return process.platform === "win32" ? x.toLowerCase() === y.toLowerCase() : x === y;
}

if (process.argv[1] && mismaRuta(process.argv[1], fileURLToPath(import.meta.url))) {
  process.exit(await main());
}
