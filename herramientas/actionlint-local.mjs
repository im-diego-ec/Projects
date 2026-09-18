#!/usr/bin/env node
// ---------------------------------------------------------------------------
// ACTIONLINT, LA MISMA VERSION QUE EL CI, CORRIDO ACA.
//
// QUE DEFECTO CIERRA. El paso «Definiciones de pipeline validas» de marco-ci.yml
// rechaza con «Reproducilo local instalando actionlint X», y en este repositorio no
// habia nada que lo permitiera: ni el binario, ni la version a mano, ni la forma de
// bajarlo. El hook `pre-push` corria el `actionlint` que hubiera en el PATH —en
// cualquier version— y sin mirar si habia shellcheck.
//
// Y ESO ULTIMO ES LO QUE MAS IMPORTA, medido el 2026-09-18 en la maquina del
// builder con actionlint 1.7.12: un workflow con `run: echo '$HOME no se expande'`
// da el SC2016 cuando shellcheck esta, y SALE 0 SIN DECIR NADA cuando no esta
// (`-shellcheck=` o un PATH sin el). actionlint delega los bloques `run:` en
// shellcheck y, si no lo encuentra, apaga esa revision en silencio. O sea que el
// verde local era mas debil que el del CI justo en los scripts, que es donde vive
// casi todo el marco.
//
// ORIGEN: Rigel 2.7.0, commit 218e5f6 (issue #439, 2026-09-13): dos viajes de CI
// en una sesion, el segundo por un SC2016 de una linea.
//
// LO QUE ESTE ARCHIVO HACE DISTINTO DE RIGEL, y por que:
//
//   · NO BAJA SHELLCHECK. Rigel lo baja de su release sin verificar nada: ese
//     release no publica checksums (medido el 2026-09-18: los 13 assets de la
//     v0.11.0 son tarballs y un zip, ningun archivo de sumas), y ejecutar un
//     binario sin comprobar es exactamente lo que el paso del CI se niega a
//     hacer con actionlint. Ademas
//     seria una dependencia nueva del marco, que AGENTS.md no deja agregar sin OK
//     humano. Aca se usa el shellcheck del PATH —el CI tambien usa el que trae el
//     runner— y si no esta, el veredicto lo DICE en vez de llamarse valido.
//   · EN WINDOWS SE APAGA EXPLICITO. Rigel no intentaba shellcheck en Windows
//     porque la integracion se cuelga (medido alla: exit 124 a los 90s sobre un
//     archivo de 130 lineas, por bandera y por PATH), pero tampoco lo apagaba: con
//     shellcheck en el PATH, actionlint lo encuentra solo y se cuelga igual. Aca va
//     `-shellcheck=` explicito, y `--con-shellcheck` lo fuerza.
//   · UN TECHO DE TIEMPO. Un comando que se cuelga es peor que uno que no existe:
//     el hook quedaria esperando para siempre. A los TECHO_MS se corta y sale 2.
//   · CORRE DONDE ESTAS PARADO, no en el clon del marco. Asi sirve tambien para un
//     repositorio que consume el marco: `node <clon-de-Projects>/herramientas/
//     actionlint-local.mjs` desde la raiz de ese repo. La version sale siempre del
//     marco-ci.yml de ESTE clon —el de la version que tengas del marco—.
//
// LOS TRES CODIGOS, porque el hook necesita distinguirlos: 0 sin hallazgos, 1
// actionlint encontro hallazgos (el hook bloquea), 2 no se pudo correr —sin red,
// plataforma sin asset, checksum que no coincide, colgado— (el hook avisa y deja
// empujar: el CI lo corre igual, y un defecto de esta herramienta no puede
// bloquear el trabajo de nadie).
//
// USO:
//   node herramientas/actionlint-local.mjs            # el repo donde estas parado
//   node herramientas/actionlint-local.mjs <ruta...>  # archivos sueltos
//   node herramientas/actionlint-local.mjs --con-shellcheck   # en Windows, forzarlo
// ---------------------------------------------------------------------------

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { invocadoDirecto } from "./projects-init.mjs";

export const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const WORKFLOW = path.join(RAIZ, ".github", "workflows", "marco-ci.yml");

/** Los tres codigos de salida, con nombre: el hook los lee. */
export const SALIDA = { verde: 0, hallazgos: 1, noSeCorrio: 2 };

/** Cuanto se espera a actionlint antes de darlo por colgado. Sobre este repo,
 *  que es el mas grande que lo corre, tarda segundos. */
export const TECHO_MS = 180_000;

/** La version pinada, leida del `default:` del input del reusable.
 *
 *  FALLA CERRADO: si no la encuentra no cae a una version «razonable». Una version
 *  distinta de la del CI convierte este comando en un segundo juez que puede
 *  discrepar, y su verde se usa para decidir que no hace falta esperar la corrida. */
export function versionPinada(texto) {
  const lineas = String(texto ?? "").split(/\r?\n/);
  const i = lineas.findIndex((l) => /^\s{6}version_actionlint:\s*$/.test(l));
  if (i === -1) {
    throw new Error(
      `no encontre el input \`version_actionlint\` en ${path.relative(RAIZ, WORKFLOW)}. ` +
        "Sin el no se cual version corre el CI, y correr otra seria un segundo juez",
    );
  }
  for (let j = i + 1; j < Math.min(i + 16, lineas.length); j++) {
    const m = /^\s*default:\s*"?(\d+\.\d+\.\d+)"?\s*$/.exec(lineas[j]);
    if (m) return m[1];
    if (/^\s{6}\S/.test(lineas[j])) break; // empezo el input siguiente
  }
  throw new Error(
    "el input `version_actionlint` no declara un `default:` con una version X.Y.Z. " +
      "El CI toma esa misma linea, asi que sin ella tampoco sabe que bajar",
  );
}

/** El asset del release que corresponde a esta maquina. No adivina. */
export function assetDe(version, plataforma = process.platform, arquitectura = process.arch) {
  const arco = { x64: "amd64", arm64: "arm64" }[arquitectura];
  const so = { win32: "windows", linux: "linux", darwin: "darwin" }[plataforma];
  if (!arco || !so) {
    throw new Error(
      `no se que asset de actionlint corresponde a ${plataforma}/${arquitectura}. El release publica ` +
        "windows, linux y darwin en amd64 y arm64; si tu maquina no esta ahi, lo corre el CI",
    );
  }
  return {
    nombre: `actionlint_${version}_${so}_${arco}.${so === "windows" ? "zip" : "tar.gz"}`,
    binario: so === "windows" ? "actionlint.exe" : "actionlint",
  };
}

/** El sha256 de un archivo, en hexadecimal. */
export function sha256(ruta) {
  return crypto.createHash("sha256").update(fs.readFileSync(ruta)).digest("hex");
}

/** El sha esperado para un asset, leido del checksums.txt del MISMO release. Un
 *  asset que no figura es rojo, no un verde por omision: el `--ignore-missing` del
 *  CI ignora las entradas que no bajo, no la suya. */
export function shaEsperado(checksums, nombre) {
  for (const linea of String(checksums ?? "").split(/\r?\n/)) {
    const m = /^([0-9a-f]{64})\s+\*?(\S+)\s*$/.exec(linea.trim());
    if (m && m[2] === nombre) return m[1];
  }
  throw new Error(
    `el asset ${nombre} no figura en el checksums.txt del release. No se verifica lo que no se puede ` +
      "comparar, asi que esto para en vez de correr un binario sin comprobar",
  );
}

/** Donde esta un ejecutable en el PATH, o null. No corre nada: mira el disco. */
export function buscarEnPath(nombre, entorno = process.env, plataforma = process.platform) {
  const clave = Object.keys(entorno).find((k) => k.toUpperCase() === "PATH");
  const dirs = String((clave && entorno[clave]) ?? "").split(path.delimiter).filter(Boolean);
  const extensiones = plataforma === "win32" ? [".exe", ".cmd", ".bat", ""] : [""];
  for (const d of dirs) {
    for (const ext of extensiones) {
      const ruta = path.join(d, nombre + ext);
      try {
        if (fs.statSync(ruta).isFile()) return ruta;
      } catch {
        // no esta en este directorio
      }
    }
  }
  return null;
}

/** Que se le pasa a actionlint sobre shellcheck, y que hay que avisar.
 *
 *  SIEMPRE EXPLICITO: con la ruta cuando se usa, con `-shellcheck=` cuando no. Si
 *  se deja que actionlint lo resuelva solo, el mismo comando significa cosas
 *  distintas segun el PATH de quien lo corre —y en Windows, con shellcheck en el
 *  PATH, se cuelga—. */
export function argumentosDeShellcheck({ plataforma = process.platform, rutaShellcheck = null, forzado = false } = {}) {
  if (plataforma === "win32" && !forzado) {
    return {
      args: ["-shellcheck="],
      conShellcheck: false,
      aviso:
        "::warning::en Windows la integracion de actionlint con shellcheck SE CUELGA (medido en Rigel: exit 124 a " +
        "los 90s sobre un solo archivo, por bandera y por PATH), asi que este comando la apaga explicito. Lo que " +
        "sigue revisa la FORMA de los workflows; los bloques `run:` los revisa el CI, que corre en Linux. Con " +
        "--con-shellcheck se intenta igual.",
    };
  }
  if (!rutaShellcheck) {
    return {
      args: ["-shellcheck="],
      conShellcheck: false,
      aviso:
        "::warning::SIN SHELLCHECK, y eso cambia lo que significa el verde de abajo. actionlint delega los bloques " +
        "`run:` en shellcheck y apaga esa revision EN SILENCIO cuando no lo encuentra, asi que lo que sigue revisa " +
        "la FORMA de los workflows y no sus scripts —el CI si los revisa—. Un hallazgo como SC2016 no aparece aca y " +
        "si alla. Se arregla instalando shellcheck (https://github.com/koalaman/shellcheck#installing) y volviendo " +
        "a correr esto.",
    };
  }
  return { args: [`-shellcheck=${rutaShellcheck}`], conShellcheck: true, aviso: null };
}

/** El veredicto, a partir de lo que devolvio actionlint. Nunca llama «validas» a
 *  un verde sin shellcheck. actionlint sale 1 con hallazgos, 2 con un argumento
 *  invalido y 3 con un error fatal: solo el 1 es un problema de los workflows. */
export function veredicto({ status, error = null, conShellcheck, version }) {
  if (error || status === null || status === undefined) {
    return {
      codigo: SALIDA.noSeCorrio,
      linea: `::error::actionlint ${version} no termino (${error ?? "sin codigo de salida"}): no hay veredicto local. El CI lo corre igual.`,
    };
  }
  if (status === 0 && conShellcheck) {
    return { codigo: SALIDA.verde, linea: `definiciones de pipeline validas (actionlint ${version} —el pin del CI— con shellcheck)` };
  }
  if (status === 0) {
    return {
      codigo: SALIDA.verde,
      linea: `actionlint ${version} no encontro hallazgos de FORMA. NO es el veredicto del CI: sin shellcheck, los bloques \`run:\` no se revisaron.`,
    };
  }
  if (status === 1) {
    return { codigo: SALIDA.hallazgos, linea: `actionlint ${version} —la MISMA version que corre el CI— encontro hallazgos. Arriba estan con su archivo y su linea.` };
  }
  return { codigo: SALIDA.noSeCorrio, linea: `::error::actionlint ${version} salio ${status}, que no es un hallazgo sino un error suyo (argumento invalido o fatal): mira la salida de arriba.` };
}

// Con techo, igual que el `curl --max-time 60` del paso del CI: una descarga que se
// queda esperando dejaria el hook colgado.
async function bajar(url, destino) {
  const r = await fetch(url, { signal: AbortSignal.timeout(60_000) });
  if (!r.ok) throw new Error(`no pude bajar ${url} (HTTP ${r.status})`);
  fs.writeFileSync(destino, Buffer.from(await r.arrayBuffer()));
}

// ---------------------------------------------------------------------------
// LA CACHE SE VERIFICA EN CADA CORRIDA, NO SOLO AL BAJAR.
//
// QUE DEFECTO CIERRA (revision adversarial del porte, FO-S7/H1 y RV-H2, medido el
// 2026-09-18). La cache vivia en os.tmpdir() —en Linux, /tmp, que comparten todos
// los usuarios— y un acierto era `existsSync(binario)`: el sha256 contra el
// checksums.txt del release se comparaba solo en la primera descarga. Un archivo
// cualquiera en `<tmp>/projects-actionlint-<version>/actionlint` —plantado por otro
// usuario, o truncado— se ejecutaba, y la salida decia «definiciones de pipeline
// validas (actionlint X —el pin del CI— con shellcheck)» con rc 0: el hook
// pre-push quedaba en OK sin haber linteado nada.
//
// AHORA: la cache es del USUARIO (no el temporal compartido); en POSIX, el
// directorio y su padre tienen que ser de quien corre esto, no enlaces y sin
// escritura para otros —si no, no se usa y se dice por que—; y al terminar una
// descarga verificada se guarda el sha256 del binario extraido, que se vuelve a
// calcular en cada acierto. Si falta o no coincide, la cache entera se descarta y
// se baja y verifica de nuevo. Sin red en el camino feliz: re-hashear un binario
// de pocos MB es lo unico que cuesta.
// ---------------------------------------------------------------------------

/** El archivo, junto al binario, con el sha256 que tenia al salir de un tarball
 *  verificado contra el release. */
export const ARCHIVO_DEL_SHA = "actionlint.sha256";

/** La base de la cache de ESTE usuario. En Windows, %LOCALAPPDATA% (el temporal de
 *  Windows ya es por usuario, y es el respaldo); en macOS, ~/Library/Caches; en el
 *  resto, $XDG_CACHE_HOME o ~/.cache. Nunca el /tmp compartido. */
export function baseDeCache({ plataforma = process.platform, entorno = process.env, home = os.homedir() } = {}) {
  if (plataforma === "win32") return entorno.LOCALAPPDATA || os.tmpdir();
  if (plataforma === "darwin") return path.join(home, "Library", "Caches");
  return entorno.XDG_CACHE_HOME || path.join(home, ".cache");
}

/** El directorio de la cache para una version. Va por VERSION: subir el pin baja
 *  el binario nuevo solo. */
export function directorioDeCache(base, version) {
  return path.join(base, "projects", `actionlint-${version}`);
}

/** Por que no se puede confiar en una ruta de la cache, o null si se puede.
 *
 *  En POSIX tiene que ser de quien corre esto, no un enlace simbolico, y nadie mas
 *  puede escribirla. En Windows no se mira: la cache vive en %LOCALAPPDATA%, que ya
 *  es del usuario, y los bits de modo de Node no dicen nada ahi. */
export function desconfianza(ruta, { plataforma = process.platform, uid = typeof process.getuid === "function" ? process.getuid() : null } = {}) {
  if (plataforma === "win32" || uid === null) return null;
  const st = fs.lstatSync(ruta);
  if (st.isSymbolicLink()) return `${ruta} es un enlace simbolico`;
  if (st.uid !== uid) return `${ruta} es de otro usuario (uid ${st.uid}, no ${uid})`;
  if (st.mode & 0o022) return `${ruta} lo pueden escribir otros usuarios (modo ${(st.mode & 0o777).toString(8)})`;
  return null;
}

/** El binario de la cache si sigue siendo el que se verifico; null si hay que
 *  bajarlo de nuevo. TIRA si la cache no es de confianza: no se borra ni se
 *  ejecuta lo que puede no ser de uno. */
export function binarioEnCache(cache, asset, confianza = {}) {
  for (const ruta of [path.dirname(cache), cache]) {
    if (!fs.existsSync(ruta)) continue;
    const motivo = desconfianza(ruta, confianza);
    if (motivo) {
      throw new Error(
        `no confio en la cache de actionlint: ${motivo}. Alguien mas pudo dejar ahi un binario, y esta herramienta no ` +
          `lo corre. Arreglo: borra ${cache} (o corregi su dueno y sus permisos) y volve a correr esto`,
      );
    }
  }
  const binario = path.join(cache, asset.binario);
  if (!fs.existsSync(binario) || desconfianza(binario, confianza)) return null;
  let guardado;
  try {
    guardado = fs.readFileSync(path.join(cache, ARCHIVO_DEL_SHA), "utf8").trim().split(/\s+/)[0];
  } catch {
    return null; // un binario sin su sha no se verifico nunca: se baja de nuevo
  }
  return /^[0-9a-f]{64}$/.test(guardado) && sha256(binario) === guardado ? binario : null;
}

/** Deja el binario de actionlint de esa version en la cache, VERIFICADO, y devuelve
 *  su ruta. Tira con un mensaje que dice que paso; quien llama lo convierte en exit 2.
 *  Las opciones existen para el banco: una base propia y una descarga sin red. */
export async function binarioDeActionlint(
  version,
  { base = baseDeCache(), bajar: bajarArchivo = bajar, plataforma = process.platform, arquitectura = process.arch, uid } = {},
) {
  const asset = assetDe(version, plataforma, arquitectura);
  const cache = directorioDeCache(base, version);
  const confianza = uid === undefined ? { plataforma } : { plataforma, uid };
  const verificado = binarioEnCache(cache, asset, confianza);
  if (verificado) return verificado;

  // Lo que haya quedado —un binario sin su sha, un sha que no coincide, una
  // descarga a medias— se descarta entero y se vuelve a bajar y a verificar.
  fs.rmSync(cache, { recursive: true, force: true });
  fs.mkdirSync(cache, { recursive: true, mode: 0o700 });
  const binario = path.join(cache, asset.binario);
  const url = `https://github.com/rhysd/actionlint/releases/download/v${version}`;
  console.log(`bajando actionlint ${version} (${asset.nombre})`);
  try {
    await bajarArchivo(`${url}/${asset.nombre}`, path.join(cache, asset.nombre));
    await bajarArchivo(`${url}/actionlint_${version}_checksums.txt`, path.join(cache, "checksums.txt"));
    const esperado = shaEsperado(fs.readFileSync(path.join(cache, "checksums.txt"), "utf8"), asset.nombre);
    const real = sha256(path.join(cache, asset.nombre));
    if (real !== esperado) {
      throw new Error(
        `el checksum de ${asset.nombre} no coincide (esperado ${esperado}, obtenido ${real}). Cubre descarga ` +
          "corrupta o asset cambiado; NO cubre un release comprometido de raiz, que es el limite que el CI tambien declara",
      );
    }
    // EL DESCOMPRESOR ES EL DE CADA SISTEMA, medido en Rigel el 2026-09-13: en Git
    // Bash el `tar` del PATH es GNU tar, lee `C:\...` como un host remoto y no abre
    // zip. Por eso Windows descomprime con PowerShell y el resto con tar, y los dos
    // con `cwd` y nombres relativos.
    const x =
      plataforma === "win32"
        ? spawnSync("powershell", ["-NoProfile", "-Command", `Expand-Archive -Path ${asset.nombre} -DestinationPath . -Force`], { cwd: cache, encoding: "utf8" })
        : spawnSync("tar", ["-xzf", asset.nombre, asset.binario], { cwd: cache, encoding: "utf8" });
    if (x.status !== 0 || !fs.existsSync(binario)) {
      throw new Error(`no pude extraer ${asset.nombre}: ${`${x.stderr ?? ""}${x.error?.message ?? ""}`.trim() || "el binario no aparecio"}`);
    }
    // El sha del binario RECIEN salido de un tarball verificado: es lo que cada
    // acierto de cache vuelve a comparar.
    fs.writeFileSync(path.join(cache, ARCHIVO_DEL_SHA), `${sha256(binario)}  ${asset.binario}\n`);
    return binario;
  } catch (e) {
    fs.rmSync(cache, { recursive: true, force: true });
    throw e;
  }
}

export async function main(argv = process.argv.slice(2), opciones = {}) {
  let version;
  let binario;
  try {
    version = versionPinada(fs.readFileSync(WORKFLOW, "utf8"));
    binario = await binarioDeActionlint(version, opciones);
  } catch (e) {
    console.error(`::error::no pude preparar actionlint: ${e.message}. No hay veredicto local; el CI lo corre igual.`);
    return SALIDA.noSeCorrio;
  }

  const sc = argumentosDeShellcheck({ rutaShellcheck: buscarEnPath("shellcheck"), forzado: argv.includes("--con-shellcheck") });
  if (sc.aviso) console.error(sc.aviso);

  const rutas = argv.filter((a) => !a.startsWith("-"));
  const r = spawnSync(binario, ["-color", ...sc.args, ...rutas], { stdio: "inherit", timeout: TECHO_MS });
  const v = veredicto({
    status: r.status,
    error: r.error ? (r.error.code === "ETIMEDOUT" ? `colgado: sin respuesta en ${TECHO_MS / 1000}s` : r.error.message) : null,
    conShellcheck: sc.conShellcheck,
    version,
  });
  (v.codigo === SALIDA.verde ? console.log : console.error)(v.linea);
  return v.codigo;
}

if (invocadoDirecto(import.meta.url)) process.exit(await main());
