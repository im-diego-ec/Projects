#!/usr/bin/env node
// ¿El aviso que la próxima versión le va a mandar a los consumidores dice qué hacer, y
// entra sin recortarse?
//
//   node herramientas/aviso-entra-en-el-mensaje.mjs [ruta-del-changelog]
//
// POR QUÉ ESTO EXISTE, Y POR QUÉ ACÁ. La action del aviso (`actions/aviso-version`) ya
// avisa cuando el mensaje se pasa del límite o cuando la entrada no trae «Para
// consumidores»: emite un `::warning::`. El problema no es que no avise — es CUÁNDO.
// Ese warning sale en la corrida del `release`, o sea DESPUÉS de que el mensaje ya
// salió. Nadie puede actuar sobre él.
//
// Medido en este repo el 2026-09-17: la sección `[No publicado]` tenía 40488
// caracteres y ningún `### Para consumidores`. El aviso del próximo release la iba a
// armar entera —41091 caracteres— y entregar recortada a 3451: el principio de la
// entrada y un enlace, sin decirle a ningún consumidor qué tiene que hacer. La 1.9.0
// ya se había armado así (10547 armados, 3472 entregados), y no le llegó a nadie sólo
// porque el destino del aviso nunca se configuró. Rigel —el marco del que
// Projects se bifurcó— lo midió primero en su 1.16.0 y construyó esta compuerta (su
// commit e0bed6a); acá se porta en su forma CORREGIDA, con los tres arreglos que su
// uso le enseñó y que están explicados abajo.
//
// USA EL PIPELINE REAL —`extraerSeccionVersion`, `construirMensaje` y
// `enlacesDelRelease` de la propia action— y no una estimación del encuadre. Una
// compuerta que reimplementa lo que vigila mide otra cosa el día que la vigilada
// cambia, y no lo dice. Y mide contra `LIMITE_POR_DEFECTO`, que es el ÚNICO lugar
// donde vive el número: `action.yml` no declara default para `limite` a propósito, y
// el banco lo exige.
//
// SE MIDE CADA DIALECTO QUE LA ACTION ACEPTA (`FORMATOS`, importado de ella y no
// copiado). La conversión a mrkdwn cambia el largo —una tabla se vuelve lista
// etiquetada y crece, una negrita pierde dos asteriscos y achica—, así que pasar en
// markdown no prueba nada sobre un destino que declaró mrkdwn. Y no se mide solo el
// dialecto que este repo tenga configurado: la compuerta corre en el PR, que no ve las
// variables del workflow del aviso, y un verde que dependa de adivinar el destino es
// un verde a medias.
//
// ── SE MIDEN DOS SECCIONES, Y LA SEGUNDA ES LA QUE A RIGEL LE FALTABA ─────────────
//
// Su primera versión leía SIEMPRE `## [No publicado]`, y así se le escapaba el único PR
// donde el texto ya es final: el de release. El corte renombra `[No publicado]` a
// `## [X.Y.Z] — fecha` e inserta un `[No publicado]` nuevo con el texto de fábrica, así
// que la compuerta medía la sección recién vaciada y salía VERDE (medido cortando su
// 1.17.2: la compuerta dijo 478 y el mensaje enviado tenía 2177).
//
// Así que se miden las DOS secciones que el aviso puede mandar sin que nadie escriba
// una línea más:
//
//   1. `[No publicado]` — la que se está escribiendo. Su versión todavía no existe, así
//      que se estima (ver VERSION_ESTIMADA).
//   2. La versión MÁS ALTA del changelog — la que se acaba de cortar en el PR de release
//      y la que el `release` va a mandar apenas se publique el tag. El workflow del
//      aviso tiene botón, y reenviar una versión ya publicada es una operación soportada.
//
// SE MIDEN LAS DOS, NO UNA U OTRA: caer a la versión más alta sólo cuando
// `[No publicado]` «está vacía» obliga a decidir qué es estar vacía, y una heurística
// errada salta la sección que sí tenía contenido sin decir nada.
//
// RESIDUO DECLARADO: las versiones que NO son la más alta no se miden. Su mensaje ya
// salió (o no salió nunca), y el botón que las puede reenviar es un acto deliberado de
// alguien que está leyendo esa entrada. Ponerlas en rojo sería re-litigar historia
// dentro de PRs que no la escribieron.
//
// Y NINGUNA de las dos es ROJO, no un aviso: no haber podido medir nada no es haber
// medido bien.
//
// ── Y SE MIDEN CUATRO COSAS, Y SÓLO UNA ES UN LARGO ──────────────────────────────
//
// 1. QUE FALTE `### Para consumidores` ES ROJO, aunque el cuerpo entre en el límite.
//    Rigel lo decidió el 2026-09-09 (su issue #369) y Projects lo adopta por la política
//    D1 de su PO: una compuerta nueva sale en rojo el día que sale. Las dos ramas de
//    `construirMensaje` mandan cosas distintas: con la sección, el aviso manda ESE
//    resumen; sin ella cae al fail-open y ARMA el mensaje con el CUERPO ENTERO de la
//    entrada, con los motivos internos del marco y la prosa que no le toca a nadie.
//    «Arma» y no «manda»: `construirMensaje` termina SIEMPRE en `recortar`, así que un
//    cuerpo que no entra llega cortado. El `::error::` dice CUÁNTO llega, calculado con
//    la misma función que recorta en producción — en Rigel afirmaba «manda el CUERPO
//    ENTERO» y era falso justo cuando el cuerpo se pasaba.
//
// 2. EL CONSEJO VA SEGÚN LA RAMA, no según el largo. Sin la sección, el arreglo es
//    ESCRIBIRLA; con la sección y sobre el límite, es ACORTARLA. Dar el mismo consejo en
//    las dos manda a acortar algo que no existe, y lo que se acorta entonces es el
//    detalle del marco.
//
// 3. EL CENTINELA DEL TEXTO DE FÁBRICA (ver `esPlaceholderConCambios`).
//
// 4. QUE LA SECCIÓN SE ENTIENDA SIN SER TÉCNICO (ver `jergaEnParaConsumidores`). Es la
//    otra mitad de la política D1 del PO (2026-09-17): una compuerta nueva cuyo arreglo
//    cabe en el repositorio del consumidor sale en ROJO el día que sale (`AGENTS.md`,
//    «Qué es BREAKING»), y eso sólo es justo si el arreglo llega escrito en palabras que
//    quien recibe el PR de bump entiende. Esa persona puede no saber leer un `::error::`.
//    Rigel hizo el mismo cambio de política en su 2.0.0 sin esta mitad; acá se cobra con
//    la MISMA regla que las páginas para quien no es técnico (`docs/01-introduccion.md`):
//    la lista y la forma viven en `pruebas/docs/lectura.mjs` y se importan, no se copian.
//    Lo que va entre backticks queda afuera, como en esas páginas: un archivo o un
//    comando se escriben como son. LÍMITE DECLARADO: mide palabras, no si la sección se
//    entiende, ni si el arreglo ESTÁ escrito — eso lo pregunta la plantilla de PR.

import { readFileSync, realpathSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

// La regla de lectura de las páginas para quien no es técnico. Vive en `pruebas/docs/`
// porque nació para medir docs/; se importa y no se copia para que haya UNA lista: si se
// agrega una palabra allá, esta compuerta la cobra sin que nadie toque este archivo (lo
// exige un caso del banco, palabra por palabra).
import { SIN_TRADUCCION, jergaDeOficio, jergaPorForma } from "../pruebas/docs/lectura.mjs";
import {
  FORMATOS,
  LIMITE_POR_DEFECTO,
  construirMensaje,
  enlacesDelRelease,
  esVersionSemver,
  extraerParaConsumidores,
  extraerSeccionVersion,
  normalizarVersion,
} from "../actions/aviso-version/aviso-version.mjs";

export const ENTRADA_SIN_PUBLICAR = "No publicado";

/** La versión de `[No publicado]` todavía no existe —nadie eligió aún entre patch,
 *  minor y major— así que se estima con una que no sea más CORTA que ninguna realista:
 *  «9.99.99» tiene 7 caracteres, y la versión aparece tres veces en el mensaje (el
 *  saludo y los dos enlaces). Estimar de más es el lado seguro: nunca declara que entra
 *  algo que no entra. */
const VERSION_ESTIMADA = "9.99.99";

/**
 * La versión más alta que declara el changelog, o `null` si no declara ninguna.
 *
 * Se compara el NÚMERO, no la posición: el formato pone la más nueva arriba, pero
 * apoyarse en eso haría que una entrada fuera de orden desviara la medición sin decir
 * una palabra. Un empate en el trío numérico —una pre-release y su definitiva— lo gana
 * la primera del archivo, que es la de más arriba.
 */
export function versionMasAlta(changelog) {
  const trio = (v) => v.split(/[-+]/)[0].split(".").map(Number);
  const mayor = (a, b) => {
    const [x, y] = [trio(a), trio(b)];
    for (let i = 0; i < 3; i += 1) {
      if (x[i] !== y[i]) return x[i] > y[i];
    }
    return false;
  };

  let mejor = null;
  for (const linea of String(changelog).split(/\r?\n/)) {
    const titulo = (linea.match(/^##\s+\[([^\]]+)\]/) ?? [])[1];
    if (!titulo) continue;
    const version = normalizarVersion(titulo);
    if (!esVersionSemver(version)) continue; // `[No publicado]` cae acá, a propósito
    if (mejor === null || mayor(version, mejor)) mejor = version;
  }
  return mejor;
}

/** El cuerpo que el paso 1 del release escribe bajo `### Para consumidores` cuando
 *  todavía no hay nada que anunciar. Vive acá y no en la skill porque
 *  `pruebas/ci-del-marco/placeholder-del-release.test.mjs` exige que el bloque de
 *  `.claude/skills/projects-release/SKILL.md` lo diga LITERAL: si fueran dos copias
 *  sueltas, cambiar una apagaría el centinela de abajo sin que nadie lo notara. */
export const PLACEHOLDER_SIN_CAMBIOS = "Nada todavía: no hay ningún cambio sin publicar.";

/** Igualdad tolerante al espaciado y a la caja, y NADA más. No normaliza acentos ni
 *  puntuación a propósito: el texto es una constante de este archivo, no algo que
 *  alguien redacte, así que una diferencia real es una copia que se separó. */
const mismoTexto = (a, b) =>
  String(a).trim().replace(/\s+/g, " ").toLowerCase() === String(b).trim().replace(/\s+/g, " ").toLowerCase();

/**
 * EL CENTINELA. Devuelve los títulos de las subsecciones que delatan el problema, o
 * `null` si no lo hay.
 *
 * El defecto que cierra lo abre el propio placeholder del paso 1 del release, que desde
 * esta compuerta trae `### Para consumidores` de fábrica —si no, el PR de release nace
 * rojo—. Ponerle la sección de fábrica arregla ese rojo y abre uno peor: alguien agrega
 * `### Añadido` con un cambio de verdad y deja el «nada todavía» intacto. La compuerta
 * saldría VERDE y el aviso le diría a los consumidores que no tienen nada que hacer,
 * sobre una versión que sí los toca.
 *
 * Eso sería cambiar un rojo molesto por un verde mudo, que es la peor operación que se
 * puede hacer sobre una compuerta. El centinela lo impide: el texto de fábrica sólo es
 * legítimo mientras la sección NO tenga compañía. NO mide «que el resumen sea bueno»
 * —eso no es verificable— sino la única propiedad que sí lo es.
 */
export function esPlaceholderConCambios(cuerpo) {
  const { encontrada, texto } = extraerParaConsumidores(cuerpo);
  // Sin la sección hay un hallazgo distinto y con otro arreglo; no se acumulan.
  if (!encontrada) return null;
  if (!mismoTexto(texto, PLACEHOLDER_SIN_CAMBIOS)) return null;

  const otras = String(cuerpo)
    .split(/\r?\n/)
    .filter((l) => /^#{3,}\s+/.test(l) && !/^#{3,}\s+para\s+consumidores\b/i.test(l))
    .map((l) => l.replace(/^#{3,}\s+/, "").trim());

  return otras.length > 0 ? otras : null;
}

/**
 * Las palabras de oficio que usa la PROSA de `### Para consumidores`, o `[]` si no usa
 * ninguna (o si la sección no existe: ese es otro hallazgo, con otro arreglo). Primero
 * las de la lista, en su orden, y después las que caen por la forma (el gerundio
 * inglés), sin repetir.
 */
export function jergaEnParaConsumidores(cuerpo) {
  const { encontrada, texto } = extraerParaConsumidores(cuerpo);
  if (!encontrada) return [];
  const porLista = jergaDeOficio(texto, SIN_TRADUCCION).map((p) => p.toLowerCase());
  return [...new Set([...porLista, ...jergaPorForma(texto)])];
}

/**
 * Mide cada sección que el aviso todavía puede mandar y devuelve un hallazgo por cada
 * defecto encontrado. Cada hallazgo trae su `motivo`, porque los tres piden arreglos
 * distintos:
 *
 *  · `"sin-para-consumidores"` — la sección no tiene `### Para consumidores`. UNO por
 *    sección, no por dialecto: la ausencia no depende del dialecto, y dos `::error::`
 *    idénticos no agregan un dato. Trae, por dialecto, `largos` (el armado SIN techo,
 *    lo que se mandaría si entrara) y `llegan` (lo que de verdad sale, ya pasado por
 *    `recortar`), y `recortadoEnAlgunDialecto`.
 *  · `"placeholder-con-cambios"` — la sección sigue con el texto de fábrica y la
 *    entrada YA tiene otras subsecciones. Trae sus títulos.
 *  · `"jerga-en-para-consumidores"` — la sección está y su prosa usa jerga de oficio que
 *    las páginas para quien no es técnico tienen prohibida. UNO por sección (la jerga no
 *    depende del dialecto). Trae `palabras`.
 *  · `"recorte"` — la sección está y el mensaje no entra. UNO por (sección, dialecto),
 *    porque puede entrar en uno y no en el otro. Trae `formato` y `largo`.
 *
 * Los dos primeros son EXCLUYENTES por sección, a propósito: cuando falta el encabezado
 * no se emite también el recorte, porque el arreglo es el mismo y ya se dice; y el
 * centinela va antes del recorte porque, mientras el anuncio sea el de fábrica, el largo
 * medido no es el del mensaje que va a salir. La jerga y el recorte, en cambio, se cobran
 * JUNTOS: son dos arreglos distintos sobre el mismo texto.
 *
 * Lista de hallazgos vacía = está todo. `sinCandidatos` = no había nada que medir, y
 * eso `main` lo trata como ROJO. Devuelve también el `limite` que USÓ, no el default:
 * los mensajes reportan ese, para que la compuerta nunca diga un número distinto del
 * que midió.
 */
export function medir(changelog, limite = LIMITE_POR_DEFECTO, env = process.env) {
  const porMedir = [];

  const sinPublicar = extraerSeccionVersion(changelog, ENTRADA_SIN_PUBLICAR);
  if (sinPublicar.encontrada) {
    porMedir.push({ etiqueta: ENTRADA_SIN_PUBLICAR, version: VERSION_ESTIMADA, estimada: true, seccion: sinPublicar });
  }

  const alta = versionMasAlta(changelog);
  if (alta) {
    const seccion = extraerSeccionVersion(changelog, alta);
    if (seccion.encontrada) porMedir.push({ etiqueta: alta, version: alta, estimada: false, seccion });
  }

  if (porMedir.length === 0) {
    return { sinCandidatos: true, faltaSinPublicar: true, candidatos: [], hallazgos: [], limite };
  }

  const hallazgos = [];
  const candidatos = [];
  for (const c of porMedir) {
    const params = { version: c.version, seccion: c.seccion, ...enlacesDelRelease(c.version, env) };
    const largos = {};
    const llegan = {};
    const recortes = [];
    let sinParaConsumidores = false;

    for (const formato of FORMATOS) {
      // DOS ARMADOS POR DIALECTO, y los dos hacen falta. Sin techo para saber el largo
      // DE VERDAD: `construirMensaje` devuelve el mensaje ya recortado, así que su largo
      // nunca excede el límite y reportarlo diría «3451 contra un límite de 3500», que no
      // es un diagnóstico, es un acertijo. Y con el límite real para que el veredicto lo
      // dé la misma función que recorta en producción, y no una comparación propia.
      const completo = construirMensaje({ ...params, formato, limite: Number.MAX_SAFE_INTEGER });
      const conTecho = construirMensaje({ ...params, formato, limite });
      largos[formato] = completo.mensaje.length;
      llegan[formato] = conTecho.mensaje.length;
      // Sale de `extraerParaConsumidores` sobre el cuerpo del changelog, que es el mismo
      // en todos los dialectos: los armados coinciden y se lee el último.
      sinParaConsumidores = completo.sinParaConsumidores;
      if (conTecho.recortado) recortes.push({ formato, largo: completo.mensaje.length });
    }
    const anuncioVacioConCambios = esPlaceholderConCambios(c.seccion.cuerpo);

    if (sinParaConsumidores) {
      hallazgos.push({
        etiqueta: c.etiqueta,
        motivo: "sin-para-consumidores",
        largos,
        llegan,
        recortadoEnAlgunDialecto: recortes.length > 0,
      });
    } else if (anuncioVacioConCambios) {
      hallazgos.push({ etiqueta: c.etiqueta, motivo: "placeholder-con-cambios", subsecciones: anuncioVacioConCambios });
    } else {
      const palabras = jergaEnParaConsumidores(c.seccion.cuerpo);
      if (palabras.length > 0) hallazgos.push({ etiqueta: c.etiqueta, motivo: "jerga-en-para-consumidores", palabras });
      for (const r of recortes) hallazgos.push({ etiqueta: c.etiqueta, motivo: "recorte", ...r });
    }

    candidatos.push({ etiqueta: c.etiqueta, version: c.version, estimada: c.estimada, largos, llegan, sinParaConsumidores });
  }

  return { sinCandidatos: false, faltaSinPublicar: !sinPublicar.encontrada, candidatos, hallazgos, limite };
}

export function main(argv = process.argv.slice(2), env = process.env) {
  const ruta = argv[0] || "CHANGELOG.md";
  let changelog;
  try {
    changelog = readFileSync(ruta, "utf8");
  } catch (e) {
    console.log(
      `::error::no se pudo leer ${ruta} (${e.code ?? e.message}), asi que no hay aviso que medir. Esto NO se declara ` +
        "verde por no haber podido medir. Arreglo: correr este paso despues del checkout y pasarle la ruta real del " +
        "changelog como primer argumento"
    );
    return 1;
  }

  const { sinCandidatos, faltaSinPublicar, candidatos, hallazgos, limite } = medir(changelog, LIMITE_POR_DEFECTO, env);

  if (sinCandidatos) {
    console.log(
      `::error file=${ruta}::no hay ninguna seccion que medir: ${ruta} no tiene entrada ` +
        `"## [${ENTRADA_SIN_PUBLICAR}]" ni ninguna "## [X.Y.Z]". Esto NO se declara verde por ` +
        "no haber podido medir: el aviso que reciben los consumidores sale de este archivo, y " +
        "sin una de las dos secciones nadie comprobo el texto que se manda. Arreglo: revisar que " +
        `la ruta apunte al changelog y que conserve sus encabezados "## [...]"`
    );
    return 1;
  }

  if (faltaSinPublicar) {
    console.log(
      `::warning file=${ruta}::no hay entrada "## [${ENTRADA_SIN_PUBLICAR}]", que es donde se ` +
        "escribe el cambio de este PR. Se midio solo la version ya cortada"
    );
  }

  const porDialecto = (valores) => FORMATOS.map((f) => `${f}=${valores[f] ?? "?"}`).join(" ");
  for (const c of candidatos) {
    const nota = c.estimada ? ` (version estimada ${c.version})` : "";
    const seccion = c.sinParaConsumidores ? " — SIN «Para consumidores»" : "";
    console.log(
      `[${c.etiqueta}]${nota}: armados ${porDialecto(c.largos)}; llegan ${porDialecto(c.llegan)} — limite ${limite}${seccion}`
    );
  }

  if (hallazgos.length === 0) {
    console.log(
      `✓ el aviso manda su seccion «Para consumidores», sin jerga de oficio, y entra sin recortarse en ${FORMATOS.join(" y ")}, para las ` +
        "secciones que todavia se pueden mandar: " +
        candidatos.map((c) => `[${c.etiqueta}]`).join(" y ")
    );
    return 0;
  }

  for (const h of hallazgos) {
    if (h.motivo === "placeholder-con-cambios") {
      console.log(
        `::error file=${ruta}::la seccion [${h.etiqueta}] tiene ${h.subsecciones.length} ` +
          `subseccion(es) con cambios —${h.subsecciones.join(", ")}— y su ` +
          `"### Para consumidores" sigue diciendo el texto de fabrica del paso 1 del release ` +
          `("${PLACEHOLDER_SIN_CAMBIOS}"). O sea que hay cambios y el aviso anuncia que no hay ` +
          "ninguno, que es peor que no mandar nada: el consumidor lee «nada que hacer» sobre una " +
          "version que si lo toca. Arreglo: reemplazar ese texto por lo que un consumidor tiene " +
          "que hacer con estos cambios; si de verdad no tiene que hacer nada, decirlo con otras " +
          "palabras y no con el texto de fabrica, para que se vea que alguien lo penso"
      );
      continue;
    }

    if (h.motivo === "jerga-en-para-consumidores") {
      console.log(
        `::error file=${ruta}::la seccion [${h.etiqueta}] dice su "### Para consumidores" con jerga de oficio: ` +
          `${h.palabras.join(", ")}. Esa seccion es lo que el aviso manda y lo que el PR de actualizacion de cada ` +
          "consumidor pone adelante, y quien lo recibe puede no ser tecnico. Desde la decision D1 del PO una " +
          "compuerta nueva sale en rojo el dia que sale (AGENTS.md, «Qué es BREAKING»), y eso solo es justo si el " +
          "arreglo se entiende. Arreglo: decirlo con palabras corrientes, con la misma regla que docs/01-introduccion.md " +
          "(la lista vive en pruebas/docs/lectura.mjs); si la palabra es un nombre que hay que copiar tal cual —un " +
          "archivo, un comando—, ponerla entre backticks"
      );
      continue;
    }

    if (h.motivo === "sin-para-consumidores") {
      const queLlega = h.recortadoEnAlgunDialecto
        ? "Y no llega ni siquiera entero: " +
          FORMATOS.map((f) => `${f} se recorta a ${h.llegan[f] ?? "?"}`).join(" y ") +
          ", asi que el destino recibe el principio de la entrada mas un enlace al release: ni resumen ni entrada."
        : "Eso es lo que llega al destino, entero.";
      console.log(
        `::error file=${ruta}::la seccion [${h.etiqueta}] no tiene "### Para consumidores", asi ` +
          "que el aviso NO manda un resumen: cae al fail-open y ARMA el mensaje con el CUERPO " +
          `ENTERO de la entrada (${porDialecto(h.largos)}, contra un limite de ${limite}) — con los ` +
          `motivos internos del marco y la prosa que no le toca a nadie adentro. ${queLlega} ` +
          "Arreglo: ESCRIBIRLA. Un `### Para consumidores` con el resumen accionable, aunque sea " +
          "para decir «nada que hacer hoy»; el aviso pasa a mandar solo esa seccion y el detalle se " +
          "queda en el changelog, que es donde se lee entero. Es ROJO aunque el cuerpo entre en el " +
          "limite: un aviso se ignora version tras version"
      );
      continue;
    }

    const esVersionCortada = h.etiqueta !== ENTRADA_SIN_PUBLICAR;
    console.log(
      `::error file=${ruta}::la seccion [${h.etiqueta}] en dialecto '${h.formato}' se recortaria ` +
        `(${h.largo} caracteres contra un limite de ${limite}). ` +
        (esVersionCortada
          ? "Es la version mas alta del changelog: si este PR la esta cortando, ese es EXACTAMENTE " +
            "el mensaje que sale al canal en cuanto se publique el tag, y el ::warning:: de la " +
            "action llega DESPUES de mandarlo. "
          : "El destino recibiria el principio y un enlace, y el aviso de la action llega " +
            "DESPUES de mandarlo. ") +
        "Arreglo: acortar la seccion «Para consumidores» — es un resumen accionable, no la entrada " +
        "entera, y el detalle ya vive en las secciones de abajo. Si de verdad no se puede acortar, " +
        "subir LIMITE_POR_DEFECTO en actions/aviso-version/aviso-version.mjs, que es el unico lugar " +
        "del numero, despues de medir que el destino lo acepta"
    );
  }
  return 1;
}

// Solo corre cuando se ejecuta como programa; importado desde el banco, no. Por realpath
// y no por `endsWith`: una comparacion literal que contesta «no soy el principal» termina
// en exit 0 sin medir nada, que en un paso de CI es un verde mudo. Mismo criterio que
// `actions/aviso-version/aviso-version.mjs`.
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
  process.exit(main());
}
