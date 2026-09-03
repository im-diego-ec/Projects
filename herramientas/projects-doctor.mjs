#!/usr/bin/env node
// ---------------------------------------------------------------------------
// EL PASO 0 ENTERO, EN UN SOLO COMANDO.
//
// QUE DEFECTO CIERRA, medido en una auditoria de seis tramos. El Paso 0 de la
// guia acompaniada pide tipear CUATRO comandos --`git --version`,
// `node --version`, `gh auth status`, `corepack --version`-- y despues COMPARAR
// A OJO lo que salio contra un ejemplo. Tres cosas fallaban ahi:
//
//   1. Comparar a ojo no es una comprobacion. Nadie sabe si `v18.16.0` alcanza,
//      porque el piso vive en el codigo y no en la pantalla.
//   2. DOCKER NO ESTABA EN LA LISTA. Es el unico requisito que el marco no
//      comprobaba en ningun lado, y es el que da el peor error: la terminal
//      contesta `command not found: docker` y nada mas. El grep de
//      instrucciones de instalacion sobre todo el clon volvia VACIO.
//   3. Un `command not found` no dice que instalar ni de donde bajarlo.
//
// LA REGLA QUE SIGUE ESTE ARCHIVO: nunca decir que algo falta sin decir en la
// misma linea de donde se saca. Un diagnostico que no trae la salida es un
// diagnostico que obliga a buscar afuera, y buscar afuera es donde la persona
// se pierde.
//
// LO QUE ESTE COMANDO NO ES: un instalador. No baja nada, no toca nada, no pide
// permisos. Lee versiones y contesta. Es a proposito: una herramienta que
// arregla la maquina de otro es una herramienta en la que hay que confiar mucho
// mas que en una que solo mira.
// ---------------------------------------------------------------------------

import { execFileSync } from "node:child_process";
import process from "node:process";
import { NODE_MINIMO, NODE_RECOMENDADO, compararVersiones, invocadoDirecto } from "./projects-init.mjs";

/** Si la salida va a una persona o a un log de CI. Con TTY se escribe para leer;
 *  sin TTY se agregan las anotaciones que GitHub Actions sabe subrayar. */
const HAY_TERMINAL = Boolean(process.stdout.isTTY);
const PROBLEMA = HAY_TERMINAL ? "PROBLEMA:" : "::error::";
const AVISO = HAY_TERMINAL ? "AVISO:" : "::warning::";

/** Corre `<cmd> --version` (o lo que se le pida) y devuelve la salida o null.
 *
 *  `shell` en Windows porque ahi los ejecutables de npm son `.cmd` y
 *  `execFileSync` sin shell no los encuentra: es el mismo criterio que ya usa
 *  `projects-init` para comprobar que un ejecutor existe. */
export function preguntarVersion(cmd, args = ["--version"]) {
  try {
    return execFileSync(cmd, args, {
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "ignore"],
      shell: process.platform === "win32",
      timeout: 10_000,
    }).trim();
  } catch {
    return null;
  }
}

/** El primer numero con forma de version que aparezca en un texto. `git version
 *  2.50.1`, `v24.19.0` y `0.35.0` salen los tres de aca. */
export function versionDe(texto) {
  const m = /(\d+)\.(\d+)(?:\.(\d+))?/.exec(texto ?? "");
  return m ? `${m[1]}.${m[2]}.${m[3] ?? "0"}` : null;
}

/** Los programas que el marco necesita, con DE DONDE SE BAJA CADA UNO.
 *
 *  `minimo: null` significa "cualquier version sirve": no se inventa un piso que
 *  nadie midio. `soloSi` marca los que dependen de que se vaya a construir.  */
export const PROGRAMAS = [
  {
    id: "node",
    nombre: "Node",
    para: "es el intérprete con el que corre todo lo del marco",
    minimo: NODE_MINIMO,
    recomendado: NODE_RECOMENDADO,
    donde: "https://nodejs.org — elegí la versión que dice LTS",
    version: () => versionDe(preguntarVersion(process.execPath, ["--version"])),
  },
  {
    id: "git",
    nombre: "Git",
    para: "guarda y envía los cambios",
    minimo: null,
    donde: "https://git-scm.com/downloads",
    version: () => versionDe(preguntarVersion("git")),
  },
  {
    id: "corepack",
    nombre: "corepack",
    para: "trae el instalador de las piezas del proyecto (pnpm) sin instalarlo aparte",
    minimo: null,
    donde: "viene con Node: si falta, actualizá Node desde https://nodejs.org",
    version: () => versionDe(preguntarVersion("corepack")),
  },
  {
    id: "gh",
    nombre: "gh",
    para: "habla con GitHub desde la computadora",
    minimo: null,
    donde: "https://cli.github.com",
    version: () => versionDe(preguntarVersion("gh")),
  },
  {
    id: "docker",
    nombre: "Docker Desktop",
    para: "levanta la base de datos en tu máquina",
    minimo: null,
    soloSi: "sólo si vas a construir una APLICACIÓN. Para un sitio no hace falta",
    donde: "https://www.docker.com/products/docker-desktop/ — gratis para uso personal",
    version: () => versionDe(preguntarVersion("docker")),
  },
];

/** Mira cada programa y devuelve su estado. No imprime: eso lo hace el que llama.
 *
 *  Los tres estados son distintos a proposito: `falta` es que no esta,
 *  `viejo` es que esta pero no alcanza el piso, y `flojo` es que alcanza el piso
 *  duro pero no el recomendado. Juntarlos en un booleano perderia justo la
 *  diferencia que decide si la persona puede seguir o no. */
export function revisar(programas = PROGRAMAS) {
  return programas.map((p) => {
    const version = p.version();
    if (!version) return { ...p, version: null, estado: "falta" };
    if (p.minimo && compararVersiones(version, p.minimo) < 0) return { ...p, version, estado: "viejo" };
    if (p.recomendado && compararVersiones(version, p.recomendado) < 0) return { ...p, version, estado: "flojo" };
    return { ...p, version, estado: "bien" };
  });
}

/** Si `gh` esta autenticado. Se pregunta aparte de la version porque son dos
 *  cosas distintas: `gh` instalado y sin sesion es el caso mas comun de todos, y
 *  el mensaje que corresponde no es "instalalo" sino "entrá". */
export function sesionDeGitHub() {
  const salida = preguntarVersion("gh", ["auth", "status"]);
  if (salida === null) return { adentro: false, cuenta: null };
  const m = /Logged in to \S+ account (\S+)/.exec(salida);
  return { adentro: Boolean(m), cuenta: m ? m[1] : null };
}

/** El informe completo, linea por linea, listo para imprimir. Se devuelve como
 *  lista y no se imprime aca para que el banco lo pueda leer sin capturar stdout. */
export function lineasDelInforme(estados, sesion) {
  const l = [];
  const marca = { bien: "OK  ", flojo: "OK  ", viejo: "VIEJO", falta: "FALTA" };
  l.push("Esto es lo que necesita el marco para funcionar en esta computadora.");
  l.push("");
  for (const e of estados) {
    const opcional = e.soloSi ? "  (opcional)" : "";
    l.push(`  [${marca[e.estado]}] ${e.nombre}${opcional}${e.version ? `  ${e.version}` : ""}`);
    if (e.estado === "falta") {
      l.push(`           ${e.para}`);
      if (e.soloSi) l.push(`           ${e.soloSi}`);
      l.push(`           Se baja de: ${e.donde}`);
    } else if (e.estado === "viejo") {
      l.push(`           tenés ${e.version} y hace falta ${e.minimo} o más nuevo`);
      l.push(`           Se actualiza desde: ${e.donde}`);
    } else if (e.estado === "flojo") {
      l.push(`           alcanza, pero lo recomendado es ${e.recomendado} o más nuevo`);
    }
  }
  l.push("");
  if (sesion.adentro) {
    l.push(`  [OK  ] Sesión de GitHub  ${sesion.cuenta}`);
  } else {
    const gh = estados.find((e) => e.id === "gh");
    if (gh?.estado === "falta") {
      l.push("  [    ] Sesión de GitHub: no se pudo comprobar porque falta gh");
    } else {
      l.push("  [FALTA] Sesión de GitHub");
      l.push("           gh está instalado pero no entraste a tu cuenta.");
      l.push("           Se arregla con: gh auth login");
    }
  }
  return l;
}

/** Que hacer con el resultado. Devuelve el codigo de salida y el cierre. */
export function veredicto(estados, sesion) {
  const bloquean = estados.filter((e) => !e.soloSi && (e.estado === "falta" || e.estado === "viejo"));
  const sinSesion = !sesion.adentro && estados.find((e) => e.id === "gh")?.estado !== "falta";
  const opcionales = estados.filter((e) => e.soloSi && e.estado === "falta");

  const l = [];
  if (bloquean.length || sinSesion) {
    const nombres = [...bloquean.map((e) => e.nombre), ...(sinSesion ? ["la sesión de GitHub"] : [])];
    l.push(
      nombres.length === 1
        ? `${PROBLEMA} falta una cosa: ${nombres[0]}.`
        : `${PROBLEMA} faltan ${nombres.length} cosas: ${nombres.join(", ")}.`,
    );
    l.push("Cada uno tiene arriba de dónde se baja. Cuando estén, volvé a correr este mismo comando.");
    return { codigo: 1, lineas: l };
  }
  if (opcionales.length) {
    l.push(`${AVISO} falta ${opcionales.map((e) => e.nombre).join(", ")}, y es opcional.`);
    l.push("Si vas a construir un sitio para leer, podés seguir sin eso.");
    l.push("Si vas a construir una aplicación, hace falta — y conviene bajarlo ahora: la descarga es grande.");
    l.push("");
  }
  l.push("Todo lo que hace falta está. Ya podés seguir con el paso 1.");
  return { codigo: 0, lineas: l };
}

export function main() {
  const estados = revisar();
  const sesion = sesionDeGitHub();
  for (const linea of lineasDelInforme(estados, sesion)) process.stdout.write(`${linea}\n`);
  process.stdout.write("\n");
  const v = veredicto(estados, sesion);
  const escribir = v.codigo === 0 ? process.stdout : process.stderr;
  for (const linea of v.lineas) escribir.write(`${linea}\n`);
  return v.codigo;
}

// `invocadoDirecto` y no la comparacion ingenua con `argv[1]`: esa falla
// siempre en Windows y en macOS cuando la ruta pasa por un enlace simbolico, y
// falla saliendo 0 sin imprimir nada. Ver su comentario en projects-init.
if (invocadoDirecto(import.meta.url)) process.exit(main());
