#!/usr/bin/env node
// Aviso de versión a consumidores: ARMA el mensaje que reciben los proyectos
// cuando el marco publica una versión. **No lo envía**, y no conoce el destino.
//
// Por qué existe (fila 14 del backlog de `docs/08-reglas-no-escritas.md`): el
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
// «Para consumidores», el aviso NO se calla — manda el cuerpo completo de la
// versión y emite un `::warning::` con el motivo. La rama de duda va al camino
// caro (mandar de más) y lo dice.
//
// Rojo (no hay degradación posible): si el CHANGELOG no tiene entrada para la
// versión publicada, no hay mensaje que armar. Se sale 1 con el arreglo escrito.
//
// Variables de entorno:
//   AVISO_VERSION     (obligatoria) versión o tag: "1.2.0" o "v1.2.0"
//   AVISO_CHANGELOG   ruta del changelog        (default: CHANGELOG.md)
//   AVISO_LIMITE      largo máximo del mensaje  (default: 3500)
//   AVISO_CAMPO       campo de texto del payload JSON (default: text)
//   AVISO_SALIDA      ruta del payload a escribir (default: $RUNNER_TEMP o cwd)
//   GITHUB_SERVER_URL / GITHUB_REPOSITORY   para armar los enlaces

import { appendFileSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** Largo por defecto del mensaje. Slack corta los bloques en 3000 y Google Chat
 *  en 4096: 3500 entra en el mensaje de casi cualquier destino sin recortar la
 *  sección que importa. Es un input, no una constante escondida. */
export const LIMITE_POR_DEFECTO = 3500;

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
  return String(cuerpo)
    .split(/\r?\n/)
    .filter((l) => /^\s*(?:[-*+]\s+)?\**BREAKING\b/.test(l))
    .map((l) => l.trim());
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
 * El mensaje completo. Un solo formato, tres bloques: qué se publicó, qué tiene
 * que hacer el consumidor (verbatim del CHANGELOG) y dónde está todo.
 */
export function construirMensaje({ version, seccion, urlRelease, urlChangelog, limite = LIMITE_POR_DEFECTO }) {
  const breaking = lineasBreaking(seccion.cuerpo);
  const consumidores = extraerParaConsumidores(seccion.cuerpo);

  const partes = [
    `Projects ${version} publicado.` +
      " El bump llega a cada repo como PR de Dependabot, sobre la version exacta." +
      " El tag movil \`v1\` sigue existiendo y ya no es el canal de distribucion.",
  ];

  if (breaking.length) {
    partes.push(
      "",
      "BREAKING — un consumidor que mergee este bump se puede romper:",
      ...breaking.map((l) => (l.startsWith("-") ? l : `- ${l}`))
    );
  }

  if (consumidores.encontrada) {
    partes.push("", "*Qué tiene que hacer un consumidor:*", "", consumidores.texto);
  } else {
    // Fail-open ruidoso: se manda de mas, no de menos, y el motivo viaja
    // adentro del mensaje ademas de en el ::warning:: del log.
    partes.push(
      "",
      "*La entrada de esta versión no trae la sección «Para consumidores».* Va el cuerpo completo; lo que aplique a tu repo, sale de acá:",
      "",
      seccion.cuerpo
    );
  }

  partes.push("", `Release: ${urlRelease}`, `CHANGELOG: ${urlChangelog}`);

  const { texto, recortado } = recortar(partes.join("\n"), limite, urlRelease);
  return {
    mensaje: texto,
    breaking: breaking.length > 0,
    sinParaConsumidores: !consumidores.encontrada,
    recortado,
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

  const servidor = env.GITHUB_SERVER_URL || "https://github.com";
  const repo = env.GITHUB_REPOSITORY || "im-diego-ec/Projects";
  const urlRelease = `${servidor}/${repo}/releases/tag/v${version}`;
  const urlChangelog = `${servidor}/${repo}/blob/v${version}/CHANGELOG.md`;

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
  const armado = construirMensaje({ version, seccion, urlRelease, urlChangelog, limite });
  const campo = env.AVISO_CAMPO || "text";
  const payload = construirPayload(armado.mensaje, campo);

  const salida = env.AVISO_SALIDA || join(env.RUNNER_TEMP || process.cwd(), "aviso-version.json");
  writeFileSync(salida, payload + "\n", "utf8");

  if (armado.sinParaConsumidores) {
    console.log(
      `::warning::la entrada [${version}] del CHANGELOG no trae la seccion "### Para consumidores", ` +
        "que es la que dice que tiene que hacer un consumidor. El aviso sale igual con el cuerpo completo. " +
        "Arreglo: agregar esa seccion a la entrada, aunque diga solo \"Nada que hacer\""
    );
  }
  if (armado.recortado) {
    console.log(
      `::warning::el mensaje supero los ${limite} caracteres y se recorto: el destino recibe el principio y el enlace al release. ` +
        "Arreglo: acortar la seccion \"Para consumidores\" (es un resumen accionable, no la entrada entera) o subir el input `limite`"
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
    `- Seccion «Para consumidores»: ${armado.sinParaConsumidores ? "**ausente** (va el cuerpo completo)" : "presente"}`,
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
