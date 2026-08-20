#!/usr/bin/env node
// Censo de fuentes: deriva el ALCANCE REAL de la verificación de calidad y falla
// si algún archivo fuente versionado queda fuera de él.
//
// Implementa el requirement "Ningún archivo fuente fuera del alcance de la
// verificación" (capability calidad-codigo) con la decisión D1 del design de
// `calidad-fail-closed`: el alcance NO se declara, se DERIVA.
//
//   universo (git)  −  lo que ve el analizador  −  lo que ve el compilador
//                   −  las exclusiones declaradas   =   los agujeros
//
// Por qué así y no "¿este paquete tiene lint configurado?": los agujeros que
// motivaron el change viven DENTRO de paquetes correctamente configurados —un
// componente de dominio tragado por un ignore pensado para generados, unos
// scripts fuera de todo programa de tipos—, así que toda propiedad enunciada
// por PAQUETE los declara sanos. La unidad de la propiedad es el ARCHIVO.
//
// Regla dura del marco que gobierna cada rama de este script: el fail-open en
// silencio está prohibido. Si algo no se puede verificar es rojo, o es un
// ::warning:: ruidoso. "No hay datos" jamás se reporta como éxito.
//
// Uso:  node censo-fuentes.mjs
// Variables de entorno (opcionales):
//   CENSO_RAIZ  raíz del repo a censar (default: el toplevel de git, o el cwd)
// Sale 1 si hay archivos fuera del alcance, exclusiones muertas o inválidas, o
// si alguna herramienta no se pudo interrogar.

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, appendFileSync, realpathSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, basename, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

// ---------------------------------------------------------------------------
// LÍMITE DECLARADO DEL DISEÑO
//
// Esta es la ÚNICA lista mantenida a mano de todo el censo, y es a propósito:
// vive en el marco, así que se arregla una vez para todos los consumidores en
// vez de una vez por repo. Es la regla de "propiedades, no listas" mordiéndose
// la cola — no hay forma de preguntarle a git qué es "código fuente".
//
// Consecuencia honesta: un proyecto con otro lenguaje (o con un lenguaje de
// plantillas propio) tiene archivos invisibles para el censo mismo. Ampliar
// esta lista es un change del marco, no una config del proyecto.
// ---------------------------------------------------------------------------
export const EXTENSIONES_FUENTE = [".ts", ".tsx", ".mts", ".cts", ".js", ".jsx", ".mjs", ".cjs"];

// Extensiones cuyo lenguaje TIENE verificación de tipos. El requirement exige
// programa de tipos solo "cuando el lenguaje tenga verificación de tipos": un
// .mjs alcanza con que lo mire el analizador estático.
export const EXTENSIONES_CON_TIPOS = [".ts", ".tsx", ".mts", ".cts"];

const esFuente = (ruta) => EXTENSIONES_FUENTE.some((e) => ruta.endsWith(e));
const necesitaTipos = (ruta) => EXTENSIONES_CON_TIPOS.some((e) => ruta.endsWith(e));

// ---------------------------------------------------------------------------
// Utilidades de rutas. Todo el censo habla en rutas POSIX relativas a la raíz.
// ---------------------------------------------------------------------------
const BARRA_INVERTIDA = String.fromCharCode(92);
export const aPosix = (p) => p.split(BARRA_INVERTIDA).join("/");

/**
 * Quita el prefijo de la raíz de una ruta absoluta. En Windows el compilador y
 * el analizador devuelven la misma raíz con distinta capitalización de unidad
 * ("C:/" vs "c:/") que git: sin comparar sin distinguir mayúsculas, TODO archivo
 * aparecería como no visto y el censo daría un rojo masivo y falso.
 */
export function relativoA(raizPosix, absolutoPosix) {
  const prefijo = raizPosix.endsWith("/") ? raizPosix : raizPosix + "/";
  const insensible = process.platform === "win32";
  const a = insensible ? absolutoPosix.toLowerCase() : absolutoPosix;
  const b = insensible ? prefijo.toLowerCase() : prefijo;
  if (!a.startsWith(b)) return null;
  return absolutoPosix.slice(prefijo.length);
}

/**
 * Traduce un glob a expresión regular. Sin dependencias, a propósito: el marco
 * corre con Node pelado y no instala nada en el pipeline del consumidor.
 * Soporta `**` (cruza barras), `*` y `?` (no cruzan barras).
 */
export function globARegExp(patron) {
  let re = "";
  for (let i = 0; i < patron.length; i++) {
    const c = patron[i];
    if (c === "*") {
      if (patron[i + 1] === "*") {
        const alInicioDeSegmento = i === 0 || patron[i - 1] === "/";
        if (alInicioDeSegmento && patron[i + 2] === "/") {
          // `**/` matchea cero o más directorios: `**/*.ts` cubre `a.ts` y `x/a.ts`.
          re += "(?:.*/)?";
          i += 2;
        } else {
          re += ".*";
          i += 1;
        }
      } else {
        re += "[^/]*";
      }
    } else if (c === "?") {
      re += "[^/]";
    } else if ("^$+.()|[]{}".includes(c) || c === BARRA_INVERTIDA) {
      re += BARRA_INVERTIDA + c;
    } else {
      re += c;
    }
  }
  return new RegExp("^" + re + "$");
}

/**
 * JSONC -> JSON. Los tsconfig llevan comentarios y comas colgantes, y no hay
 * parser en la librería estándar. Respeta las cadenas para no comerse un "//"
 * que viva dentro de una ruta o de un patrón.
 */
export function limpiarJsonc(texto) {
  let salida = "";
  let i = 0;
  let enCadena = false;
  while (i < texto.length) {
    const c = texto[i];
    if (enCadena) {
      salida += c;
      if (c === BARRA_INVERTIDA) {
        salida += texto[i + 1] ?? "";
        i += 2;
        continue;
      }
      if (c === '"') enCadena = false;
      i++;
      continue;
    }
    if (c === '"') {
      enCadena = true;
      salida += c;
      i++;
      continue;
    }
    if (c === "/" && texto[i + 1] === "/") {
      while (i < texto.length && texto[i] !== "\n") i++;
      continue;
    }
    if (c === "/" && texto[i + 1] === "*") {
      i += 2;
      while (i < texto.length && !(texto[i] === "*" && texto[i + 1] === "/")) i++;
      i += 2;
      continue;
    }
    salida += c;
    i++;
  }
  return salida.replace(/,(\s*[}\]])/g, "$1");
}

const leerJsonc = (ruta) => JSON.parse(limpiarJsonc(readFileSync(ruta, "utf8")));

// ---------------------------------------------------------------------------
// SONDA 1 — el universo: los archivos que el control de versiones rastrea.
// ---------------------------------------------------------------------------
export function sondarRastreados(raiz) {
  const r = spawnSync("git", ["ls-files", "-z"], { cwd: raiz, encoding: "utf8", maxBuffer: 1 << 28 });
  if (r.status !== 0) {
    throw new Error(`git ls-files falló en ${raiz}: ${(r.stderr || "").trim() || r.error?.message || "sin detalle"}`);
  }
  return r.stdout.split("\0").filter(Boolean).map(aPosix);
}

export function raizDelRepo() {
  if (process.env.CENSO_RAIZ) return aPosix(process.env.CENSO_RAIZ).replace(/\/$/, "");
  const r = spawnSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" });
  if (r.status === 0 && r.stdout.trim()) return aPosix(r.stdout.trim());
  return aPosix(process.cwd());
}

// ---------------------------------------------------------------------------
// SONDA 2 — lo que ve el ANALIZADOR ESTÁTICO.
//
// Se enumera por la API de ESLint del CONSUMIDOR, resuelta con createRequire
// desde su raíz: el marco no trae su propio analizador ni instala nada; le
// pregunta al que el repo ya tiene, que es el único cuya respuesta significa
// algo. Truco de rendimiento: se corre con TODAS las reglas desactivadas
// (`ruleFilter`, ESLint >= 9.11). La SELECCIÓN de archivos ocurre antes de
// aplicar reglas, así que la enumeración sigue siendo exacta.
//
// Verificado contra el consumidor real: la lista de resultados trae UNA entrada
// por archivo procesado aunque no tenga ni un mensaje (141 archivos -> 141
// entradas, todas con `messages: []`), que es justo lo que el censo necesita.
// Los archivos que un `ignores` traga NO producen entrada: ese silencio es la
// señal que buscamos.
// ---------------------------------------------------------------------------
export async function sondarAnalizador(raiz) {
  let ESLint;
  try {
    const requerir = createRequire(join(raiz, "__censo-fuentes__.js"));
    const mod = await import(pathToFileURL(requerir.resolve("eslint")).href);
    ESLint = mod.ESLint ?? mod.default?.ESLint;
    if (!ESLint) throw new Error("el módulo eslint no exporta la clase ESLint");
  } catch (e) {
    // Una sola línea: el mensaje viaja dentro de una anotación de GitHub, y el
    // "Require stack" que Node adjunta la partiría en varias.
    const detalle = String(e.message).split(/\r?\n/)[0];
    return { disponible: false, archivos: [], motivo: `no se pudo resolver eslint desde ${raiz}: ${detalle}` };
  }

  const construir = (opciones) => new ESLint(opciones);
  const base = { cwd: raiz, errorOnUnmatchedPattern: false };
  let eslint;
  try {
    // ruleFilter existe desde ESLint 9.11. En versiones anteriores el
    // constructor rechaza la opción desconocida: se reintenta sin ella (más
    // lento, mismo resultado) en vez de degradar a "no disponible".
    eslint = construir({ ...base, ruleFilter: () => false });
  } catch {
    eslint = construir(base);
  }

  try {
    const resultados = await eslint.lintFiles(["."]);
    const archivos = [];
    for (const r of resultados) {
      const rel = relativoA(raiz, aPosix(r.filePath));
      if (rel) archivos.push(rel);
    }
    return { disponible: true, archivos, motivo: "" };
  } catch (e) {
    // Config rota, plugin faltante, dependencias sin instalar. NO es "no
    // disponible" (eso sería fail-open sobre un repo que sí tiene analizador):
    // es "no se pudo verificar", y eso es rojo.
    const detalle = String(e.message).split(/\r?\n/).slice(0, 3).join(" | ");
    return { disponible: true, archivos: null, motivo: `eslint no pudo enumerar: ${detalle}` };
  }
}

// ---------------------------------------------------------------------------
// SONDA 3 — lo que ve el COMPILADOR.
// ---------------------------------------------------------------------------

/**
 * ¿Este tsconfig DECLARA sus entradas? Uno que solo trae `compilerOptions` (el
 * típico `tsconfig.base.json` del que heredan los paquetes) NO cuenta: nadie lo
 * compila. Contarlo sería catastrófico en silencio — sin `files` ni `include`,
 * TypeScript asume `**\/*` y ese archivo "cubriría" el repo entero sin que ningún
 * script lo ejecute jamás.
 */
export function declaraEntradas(rutaAbsoluta, saltos = 0) {
  let cfg;
  try {
    cfg = leerJsonc(rutaAbsoluta);
  } catch {
    // No se pudo leer: fail-closed. Se lo trata como declarante para que la
    // sonda intente correr tsc; si tampoco puede, será rojo con su motivo.
    return true;
  }
  if (Array.isArray(cfg?.files) || cfg?.include !== undefined || Array.isArray(cfg?.references)) return true;
  if (typeof cfg?.extends === "string" && cfg.extends.startsWith(".") && saltos < 10) {
    const padre = join(dirname(rutaAbsoluta), cfg.extends);
    for (const candidato of [padre, padre + ".json"]) {
      if (existsSync(candidato)) return declaraEntradas(candidato, saltos + 1);
    }
    return true; // el extends apunta a algo ilegible: fail-closed
  }
  return false;
}

/** Resuelve el `tsc` del CONSUMIDOR desde el directorio del tsconfig. */
export function resolverTsc(directorio) {
  try {
    const requerir = createRequire(join(directorio, "__censo-fuentes__.js"));
    // Con pnpm, `typescript` es devDependency de CADA paquete y NO resuelve
    // desde la raíz del monorepo (comprobado en el consumidor real: MODULE_NOT_
    // FOUND desde la raíz, resuelto desde api/). De ahí que la resolución sea
    // por directorio de tsconfig y no una sola vez para todo el repo.
    const lib = dirname(requerir.resolve("typescript"));
    const tsc = join(lib, "tsc.js");
    return existsSync(tsc) ? tsc : null;
  } catch {
    return null;
  }
}

// Escalera de formas de listado, de la más inocua a la más invasiva. Los repos
// usan las tres, y no son intercambiables — comprobado con TypeScript 5.9:
//
//   1. `--noEmit -p`      proyecto suelto. No toca el disco. Sirve incluso con
//                         composite:true (TS >= 5.6).
//   2. `-b --noEmit`      OBLIGATORIA para un tsconfig "solución" (`files: []`
//                         + `references`): con `-p` ese proyecto lista CERO
//                         archivos y sale 1, porque sus entradas viven en los
//                         proyectos referenciados. Es la forma del paquete web
//                         del consumidor real.
//   3. `-b`               último recurso, para TS anteriores a 5.6, donde build
//                         mode no admite --noEmit.
//
// `--force` EN BUILD MODE NO ES OPCIONAL, y es la trampa más cara de esta
// pieza. Build mode es incremental: si encuentra un `.tsbuildinfo` al día,
// SALTEA el proyecto, no lista NADA y sale 0. Comprobado con TypeScript 5.9 —
// dos corridas seguidas del mismo comando: la primera lista los 2 archivos, la
// segunda lista cero y devuelve éxito.
//
// Sin `--force`, la segunda corrida de cualquier repo (o la primera con caché
// de CI restaurada) enrojecería por "listado vacío" sin que nadie haya roto
// nada; y en un censo escrito con menos cuidado —uno que leyera el listado
// vacío como "no hay nada fuera de alcance"— sería el fail-open en verde que
// la constitución prohíbe.
//
// Escalera de formas de listado, de la más inocua a la más invasiva. Los repos
// usan las tres y no son intercambiables (comprobado con TypeScript 5.9):
//
//   1. `--noEmit -p`      proyecto suelto. No toca el disco. Sirve incluso con
//                         composite:true (TS >= 5.6).
//   2. `-b --noEmit`      OBLIGATORIA para un tsconfig "solución" (`files: []`
//                         + `references`): con `-p` ese proyecto lista CERO
//                         archivos y sale 1, porque sus entradas viven en los
//                         proyectos referenciados. Es la forma del paquete web
//                         del consumidor real.
//   3. `-b`               último recurso, para TS anteriores a 5.6, donde build
//                         mode no admite --noEmit.
//
// EFECTO DE BORDE DECLARADO: build mode escribe su estado incremental
// (`*.tsbuildinfo`) aunque se le pase `--noEmit`, y la forma 3 además emite el
// build. El scaffold del marco y el consumidor ya ignoran `*.tsbuildinfo`, así
// que no ensucia `git status`; aun así, cuando hace falta bajar a build mode se
// avisa con `::warning::` en vez de dejarlo pasar callado.
const ESCALERA_DE_LISTADO = [
  { args: (cfg) => ["--noEmit", "--listFiles", "-p", cfg], aviso: "" },
  {
    args: (cfg) => ["-b", "--noEmit", "--force", "--listFiles", cfg],
    aviso: "hubo que usar build mode (-b): deja un *.tsbuildinfo (ignorado por el .gitignore del marco)",
  },
  {
    args: (cfg) => ["-b", "--force", "--listFiles", cfg],
    aviso: "hubo que usar build mode SIN --noEmit (TypeScript anterior a 5.6): esta forma EMITE el build",
  },
];

/**
 * Corre el tsc del consumidor en modo listado.
 *
 * El código de salida NO decide: `--listFiles` imprime el programa completo y
 * DESPUÉS los errores de tipos. Un repo con errores de compilación sigue
 * teniendo un alcance perfectamente enumerable, y tratar el rojo de tsc como
 * "no se pudo enumerar" convertiría este censo en ruido. Lo que decide es si
 * hubo listado.
 */
export function listarProgramaDeTipos(raiz, tsconfigRel) {
  const abs = join(raiz, tsconfigRel);
  const dir = dirname(abs);
  const tsc = resolverTsc(dir);
  if (!tsc) {
    return { tsconfig: tsconfigRel, archivos: [], error: `no se pudo resolver typescript desde ${aPosix(dir)}` };
  }
  let ultimoDetalle = "";
  for (const peldano of ESCALERA_DE_LISTADO) {
    const r = spawnSync(process.execPath, [tsc, ...peldano.args(basename(abs))], {
      cwd: dir,
      encoding: "utf8",
      maxBuffer: 1 << 28,
    });
    const salida = `${r.stdout || ""}\n${r.stderr || ""}`;
    const archivos = [];
    for (const linea of salida.split(/\r?\n/)) {
      const t = linea.trim();
      if (!t || t.includes("/node_modules/") || t.includes("\\node_modules\\")) continue;
      if (!esFuente(t) && !t.endsWith(".d.ts")) continue;
      const rel = relativoA(raiz, aPosix(t));
      if (rel) archivos.push(rel);
    }
    if (archivos.length) {
      if (peldano.aviso) console.log(`::warning::${tsconfigRel}: ${peldano.aviso}`);
      return { tsconfig: tsconfigRel, archivos, error: "" };
    }
    ultimoDetalle = (r.stderr || r.stdout || r.error?.message || "").trim().split(/\r?\n/).slice(0, 6).join(" | ");
  }
  return { tsconfig: tsconfigRel, archivos: [], error: `tsc no listó ningún archivo. Detalle: ${ultimoDetalle || "sin salida"}` };
}

export function sondarTipos(raiz, rastreados) {
  const tsconfigs = rastreados.filter((p) => /(^|\/)tsconfig[^/]*\.json$/.test(p));
  const declarantes = tsconfigs.filter((p) => declaraEntradas(join(raiz, p)));
  return {
    tsconfigs,
    declarantes,
    programas: declarantes.map((p) => listarProgramaDeTipos(raiz, p)),
  };
}

// ---------------------------------------------------------------------------
// Los paquetes: sus exclusiones, su piso y su deuda declarada.
// ---------------------------------------------------------------------------

// Las métricas del total que un lcov permite reconstruir a partir de sus
// registros por ítem (DA, FN/FNDA, BRDA) y no de sus líneas de resumen. La
// distinción tiene consecuencia: los resúmenes (LF/LH, FNF/FNH, BRF/BRH) no se
// pueden fusionar cuando dos suites miden el mismo archivo, y ahí es donde un
// total sale inflado sin que nadie lo note.
//
// Los nombres son los del marco, en castellano, igual que `excluidos`,
// `patron` y `motivo`. Una clave desconocida del piso NO se ignora: un
// `functions: 80` escrito por costumbre de vitest no declararía nada, y el
// paquete quedaría sin piso creyendo tenerlo.
export const METRICAS_DE_COBERTURA = [
  { clave: "lineas", etiqueta: "líneas" },
  { clave: "funciones", etiqueta: "funciones" },
  { clave: "ramas", etiqueta: "ramas" },
];

const CLAVES_DE_METRICA = METRICAS_DE_COBERTURA.map((m) => m.clave);

const esObjetoPlano = (v) => typeof v === "object" && v !== null && !Array.isArray(v);

/**
 * Valida `projects.cobertura.piso`: el piso declarado del total, por métrica.
 * Devuelve `{ piso }` o `{ error }`.
 */
export function validarPiso(declarado) {
  if (!esObjetoPlano(declarado)) {
    return {
      error: `projects.cobertura.piso debe ser un objeto con las claves ${CLAVES_DE_METRICA.join(", ")}`,
    };
  }
  const piso = {};
  for (const [clave, valor] of Object.entries(declarado)) {
    if (!CLAVES_DE_METRICA.includes(clave)) {
      return {
        error: `projects.cobertura.piso tiene la clave desconocida "${clave}": las válidas son ${CLAVES_DE_METRICA.join(", ")}`,
      };
    }
    if (typeof valor !== "number" || !Number.isFinite(valor) || valor < 0 || valor > 100) {
      return { error: `projects.cobertura.piso.${clave} debe ser un porcentaje entre 0 y 100` };
    }
    piso[clave] = valor;
  }
  return { piso };
}

const FECHA_ISO = /^\d{4}-\d{2}-\d{2}$/;

/** Una fecha ISO que además EXISTE en el calendario (2026-02-31 no existe). */
export function esFechaIso(texto) {
  if (typeof texto !== "string" || !FECHA_ISO.test(texto)) return false;
  const d = new Date(`${texto}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === texto;
}

/**
 * Valida `projects.cobertura.deuda`: el motivo escrito y la FECHA en la que el
 * paquete alcanza el mínimo del marco. Devuelve `{ deuda }` o `{ error }`.
 *
 * Una deuda a medio declarar no es una deuda declarada: sin motivo no hay nada
 * que revisar, y sin fecha el piso termina siendo el mínimo de hecho, que es
 * exactamente el agujero que este campo existe para cerrar.
 */
export function validarDeuda(declarado) {
  if (!esObjetoPlano(declarado)) {
    return { error: 'projects.cobertura.deuda debe ser un objeto con "motivo" y "fecha"' };
  }
  const motivo = typeof declarado.motivo === "string" ? declarado.motivo.trim() : "";
  if (!motivo) return { error: 'projects.cobertura.deuda: falta "motivo" (cadena no vacía)' };
  if (!esFechaIso(declarado.fecha)) {
    return {
      error: `projects.cobertura.deuda: "fecha" debe ser una fecha real en formato AAAA-MM-DD (llegó ${JSON.stringify(declarado.fecha)})`,
    };
  }
  return { deuda: { motivo, fecha: declarado.fecha } };
}

export function leerPaquetes(raiz, rastreados) {
  const manifiestos = rastreados.filter((p) => p === "package.json" || p.endsWith("/package.json"));
  return manifiestos.map((manifiesto) => {
    const dir = manifiesto === "package.json" ? "" : manifiesto.slice(0, -"/package.json".length);
    let excluidos = [];
    let piso = {};
    let deuda = null;
    let error = "";
    try {
      const json = leerJsonc(join(raiz, manifiesto));
      const cobertura = json?.projects?.cobertura;
      const declarado = cobertura?.excluidos;
      if (declarado !== undefined) {
        if (!Array.isArray(declarado)) error = "projects.cobertura.excluidos debe ser un arreglo";
        else excluidos = declarado;
      }
      // El piso y la deuda del TOTAL viven acá, al lado de las exclusiones,
      // porque es donde el spec de calidad-codigo los pone: en el manifiesto
      // del propio paquete, dentro de un diff y bajo review.
      const problemas = [];
      if (cobertura?.piso !== undefined) {
        const r = validarPiso(cobertura.piso);
        if (r.error) problemas.push(r.error);
        else piso = r.piso;
      }
      if (cobertura?.deuda !== undefined) {
        const r = validarDeuda(cobertura.deuda);
        if (r.error) problemas.push(r.error);
        else deuda = r.deuda;
      }
      if (problemas.length) error = [error, ...problemas].filter(Boolean).join("; ");
    } catch (e) {
      error = `no se pudo leer el manifiesto: ${e.message}`;
    }
    return { dir, manifiesto, excluidos, piso, deuda, error };
  });
}

/** El paquete que CONTIENE un archivo: el manifiesto más cercano hacia arriba. */
export function paqueteDe(paquetes, archivo) {
  let mejor = null;
  for (const p of paquetes) {
    if (p.dir === "" || archivo.startsWith(p.dir + "/")) {
      if (!mejor || p.dir.length > mejor.dir.length) mejor = p;
    }
  }
  return mejor;
}

// ---------------------------------------------------------------------------
// EL NÚCLEO: la resta. Puro, sin git ni procesos: es lo que el banco de pruebas
// sintéticas ejercita.
// ---------------------------------------------------------------------------
export function derivarAlcance({ rastreados, analizador, tipos, paquetes }) {
  const fuentes = rastreados.filter(esFuente);
  const vistoAnalizador = new Set(analizador.archivos ?? []);
  const vistoTipos = new Set();
  for (const prog of tipos.programas) for (const a of prog.archivos) vistoTipos.add(a);

  // --- Exclusiones -------------------------------------------------------
  const exclusionesVivas = [];
  const exclusionesMuertas = [];
  const exclusionesInvalidas = [];
  const excluidos = new Set();

  // Un solo recorrido para repartir los archivos en su paquete contenedor: el
  // filtro por paquete dentro del bucle era cuadrático sobre repos grandes.
  const porPaquete = new Map(paquetes.map((p) => [p, []]));
  for (const a of rastreados) {
    const p = paqueteDe(paquetes, a);
    if (p) porPaquete.get(p).push(a);
  }

  for (const paq of paquetes) {
    if (paq.error) {
      exclusionesInvalidas.push({ manifiesto: paq.manifiesto, patron: "(manifiesto)", problema: paq.error });
      continue;
    }
    const delPaquete = porPaquete.get(paq) ?? [];
    for (const ex of paq.excluidos) {
      const patron = typeof ex?.patron === "string" ? ex.patron.trim() : "";
      const motivo = typeof ex?.motivo === "string" ? ex.motivo.trim() : "";
      if (!patron) {
        exclusionesInvalidas.push({ manifiesto: paq.manifiesto, patron: "(vacío)", problema: 'falta "patron" (cadena no vacía)' });
        continue;
      }
      if (!motivo) {
        exclusionesInvalidas.push({ manifiesto: paq.manifiesto, patron, problema: 'falta "motivo" (cadena no vacía)' });
        continue;
      }
      const re = globARegExp(patron);
      const prefijo = paq.dir ? paq.dir + "/" : "";
      const alcanzados = delPaquete.filter((a) => re.test(a.slice(prefijo.length)));
      if (alcanzados.length === 0) {
        // Exclusión muerta: sobrevivió al problema que la justificaba. Roja, para
        // que una excepción no se quede repartiendo permiso sobre la nada.
        exclusionesMuertas.push({ manifiesto: paq.manifiesto, patron, motivo });
        continue;
      }
      const fuentesAlcanzadas = alcanzados.filter(esFuente);
      for (const a of fuentesAlcanzadas) excluidos.add(a);
      exclusionesVivas.push({ manifiesto: paq.manifiesto, patron, motivo, archivos: fuentesAlcanzadas, alcanzados: alcanzados.length });
    }
  }

  // --- Listados vacíos: nunca fail-open mudo -----------------------------
  const programasVacios = tipos.programas.filter((prog) => {
    if (prog.archivos.length > 0) return false;
    const dir = dirname(prog.tsconfig) === "." ? "" : dirname(prog.tsconfig) + "/";
    return fuentes.some((f) => f.startsWith(dir));
  });

  // --- La resta ----------------------------------------------------------
  const huecos = [];
  for (const f of fuentes) {
    if (excluidos.has(f)) continue;
    const faltaAnalizador = !vistoAnalizador.has(f);
    const faltaTipos = necesitaTipos(f) && !vistoTipos.has(f);
    if (faltaAnalizador || faltaTipos) huecos.push({ archivo: f, faltaAnalizador, faltaTipos });
  }

  return { fuentes, huecos, exclusionesVivas, exclusionesMuertas, exclusionesInvalidas, programasVacios };
}

// ---------------------------------------------------------------------------
// Reporte
// ---------------------------------------------------------------------------
const escaparAnotacion = (s) =>
  String(s).replace(/%/g, "%25").replace(/\r/g, "%0D").replace(/\n/g, "%0A");
const escaparCelda = (s) => String(s).replace(/\|/g, String.fromCharCode(92) + "|").replace(/\r?\n/g, " ");

function resumir(lineas) {
  const destino = process.env.GITHUB_STEP_SUMMARY;
  if (!destino) return;
  try {
    appendFileSync(destino, lineas.join("\n") + "\n");
  } catch (e) {
    console.log(`::warning::no se pudo escribir el resumen de la corrida: ${e.message}`);
  }
}

/** El mensaje trae el ARREGLO, no el diagnóstico: las tres salidas, siempre. */
export function salidasPara(hueco, paquetes, tsconfigsDelPaquete, comandoLocal) {
  const paq = paqueteDe(paquetes, hueco.archivo);
  const dirPaq = paq?.dir ?? "";
  const relAlPaquete = dirPaq ? hueco.archivo.slice(dirPaq.length + 1) : hueco.archivo;
  const manifiesto = paq?.manifiesto ?? "package.json";
  const destinoTs = tsconfigsDelPaquete[0] ?? `${dirPaq ? dirPaq + "/" : ""}tsconfig.json`;

  const marca = (falta) => (falta ? " " : " (ya cumple) ");
  const lineas = [];
  const que = [];
  if (hueco.faltaAnalizador) que.push("el analizador estático no lo examina");
  if (hueco.faltaTipos) que.push("ningún programa de tipos lo incluye");
  lineas.push(`✗ ${hueco.archivo} — ${que.join(" y ")}`);
  lineas.push("  Tres salidas, elegí una:");
  lineas.push(
    `   1)${marca(hueco.faltaTipos)}Incluirlo en un programa de tipos: agregalo al "include"/"files" de ${destinoTs},`,
    `      o creá un tsconfig en ${dirPaq || "la raíz"} que lo declare.`
  );
  lineas.push(
    `   2)${marca(hueco.faltaAnalizador)}Ampliar el alcance del analizador: acotá el patrón de "ignores" que lo traga`,
    "      (o agregá su ruta a los \"files\" de alguna config de eslint).",
    `      Para ver quién lo ignora:  pnpm exec eslint ${hueco.archivo}`
  );
  lineas.push(
    `   3) Declararlo excluido CON MOTIVO, en ${manifiesto}:`,
    '        "projects": { "cobertura": { "excluidos": [',
    `          { "patron": "${relAlPaquete}", "motivo": "por qué este archivo no lo mira nadie" }`,
    "        ] } }"
  );
  lineas.push(`  Reproducilo local, desde la raíz del repo:  ${comandoLocal}`);
  return lineas;
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------
export async function main() {
  const raiz = raizDelRepo();
  const comandoLocal = `node "${aPosix(join(import.meta.dirname, "censo-fuentes.mjs"))}"`;

  const rastreados = sondarRastreados(raiz);
  const paquetes = leerPaquetes(raiz, rastreados);
  const fuentesTotales = rastreados.filter(esFuente);

  const analizador = await sondarAnalizador(raiz);
  const tipos = sondarTipos(raiz, rastreados);
  const hayCompilador = tipos.declarantes.length > 0 && tipos.programas.some((p) => p.archivos.length > 0);

  // SKIP HONESTO. Un repo de otro stack no tiene por qué enrojecer por un censo
  // que no lo sabe leer; y tampoco puede salir en verde en silencio, porque
  // "verde" significaría "verificado" y acá no se verificó nada.
  if (!analizador.disponible && !hayCompilador) {
    console.log(
      `::warning::censo de fuentes OMITIDO: no se encontró analizador estático ni compilador resolubles en ${raiz}. ` +
        `Motivo del analizador: ${escaparAnotacion(analizador.motivo || "sin detalle")}. ` +
        `${fuentesTotales.length} archivo(s) con extensión de fuente quedaron SIN VERIFICAR. ` +
        "Si este repo sí tiene toolchain, el job debe instalar las dependencias ANTES de este paso."
    );
    resumir([
      "## Censo de fuentes: omitido",
      "",
      `No hay analizador ni compilador resolubles en \`${raiz}\`. ${fuentesTotales.length} archivo(s) sin verificar.`,
    ]);
    return 0;
  }

  // El analizador está instalado pero no pudo enumerar (config rota, plugin
  // faltante). Un solo rojo claro en vez de marcar los N archivos: el problema
  // es uno, no N.
  if (analizador.disponible && analizador.archivos === null) {
    console.log(
      `::error title=Censo de fuentes::el analizador estático está instalado pero no pudo enumerar los archivos, así que el alcance no se puede derivar. ${escaparAnotacion(analizador.motivo)}`
    );
    console.error(`✗ ${analizador.motivo}`);
    console.error(`  Arreglo: dejá la config del analizador cargable (probá "pnpm exec eslint ." en la raíz) y volvé a correr.`);
    console.error(`  Reproducilo local:  ${comandoLocal}`);
    return 1;
  }

  if (!analizador.disponible) {
    console.log(
      `::error title=Censo de fuentes::hay compilador pero no analizador estático resoluble: ${escaparAnotacion(analizador.motivo)}`
    );
    console.error(`✗ ${analizador.motivo}`);
    console.error("  Arreglo: instalá el analizador del repo (y corré su install ANTES de este paso).");
    console.error(`  Reproducilo local:  ${comandoLocal}`);
    return 1;
  }

  const informe = derivarAlcance({ rastreados, analizador, tipos, paquetes });

  // --- Exclusiones: ::notice:: y fila del resumen ------------------------
  const filasResumen = [];
  for (const ex of informe.exclusionesVivas) {
    for (const a of ex.archivos) {
      console.log(`::notice file=${a},title=Exclusión declarada::${escaparAnotacion(ex.motivo)} (patrón "${ex.patron}" en ${ex.manifiesto})`);
      filasResumen.push(`| \`${escaparCelda(a)}\` | \`${escaparCelda(ex.patron)}\` | \`${escaparCelda(ex.manifiesto)}\` | ${escaparCelda(ex.motivo)} |`);
    }
    if (ex.archivos.length === 0) {
      console.log(`::notice title=Exclusión declarada::"${ex.patron}" en ${ex.manifiesto} — ${escaparAnotacion(ex.motivo)}`);
      filasResumen.push(`| _(sin fuentes alcanzadas)_ | \`${escaparCelda(ex.patron)}\` | \`${escaparCelda(ex.manifiesto)}\` | ${escaparCelda(ex.motivo)} |`);
    }
  }

  // --- Reporte por consola ----------------------------------------------
  console.log(`Raíz censada:            ${raiz}`);
  console.log(`Archivos rastreados:     ${rastreados.length}`);
  console.log(`Con extensión de fuente: ${informe.fuentes.length}`);
  console.log(`Vistos por el analizador:${String(analizador.archivos.length).padStart(6)}`);
  console.log(`Programas de tipos:      ${tipos.programas.length} de ${tipos.tsconfigs.length} tsconfig rastreado(s)`);
  for (const p of tipos.programas) {
    console.log(`  · ${p.tsconfig}: ${p.archivos.length} archivo(s)${p.error ? ` — ${p.error}` : ""}`);
  }
  for (const t of tipos.tsconfigs.filter((t) => !tipos.declarantes.includes(t))) {
    console.log(`  · ${t}: no declara entradas (solo compilerOptions) — no cuenta como programa`);
  }
  console.log("");

  let salida = 0;

  if (informe.programasVacios.length) {
    salida = 1;
    console.error("== programas de tipos que no listaron nada habiendo fuentes ==");
    for (const p of informe.programasVacios) {
      console.log(
        `::error file=${p.tsconfig},title=Censo de fuentes::el programa de tipos no listó ningún archivo habiendo fuentes bajo su directorio. ${escaparAnotacion(p.error)}`
      );
      console.error(`✗ ${p.tsconfig} — listado vacío habiendo fuentes bajo ${dirname(p.tsconfig)}`);
      if (p.error) console.error(`    · ${p.error}`);
      console.error(`    · Arreglo: corré  pnpm exec tsc -p ${p.tsconfig} --noEmit --listFiles  y mirá por qué no lista nada`);
      console.error("    · Un listado vacío NO se toma como \"todo cubierto\": sin datos no hay verificación");
    }
    console.error("");
  }

  if (informe.exclusionesInvalidas.length) {
    salida = 1;
    console.error("== exclusiones mal declaradas ==");
    for (const ex of informe.exclusionesInvalidas) {
      console.log(`::error file=${ex.manifiesto},title=Exclusión inválida::"${escaparAnotacion(ex.patron)}" — ${escaparAnotacion(ex.problema)}`);
      console.error(`✗ ${ex.manifiesto} — "${ex.patron}": ${ex.problema}`);
      console.error('    · Forma esperada: { "patron": "<glob relativo al paquete>", "motivo": "<por qué>" }');
    }
    console.error("");
  }

  if (informe.exclusionesMuertas.length) {
    salida = 1;
    console.error("== exclusiones muertas (no corresponden a ningún archivo rastreado) ==");
    for (const ex of informe.exclusionesMuertas) {
      console.log(
        `::error file=${ex.manifiesto},title=Exclusión muerta::el patrón "${escaparAnotacion(ex.patron)}" ya no corresponde a ningún archivo rastreado. Borralo de projects.cobertura.excluidos.`
      );
      console.error(`✗ ${ex.manifiesto} — "${ex.patron}" no alcanza ningún archivo rastreado`);
      console.error(`    · motivo declarado: ${ex.motivo}`);
      console.error("    · Arreglo: borrá la exclusión (el problema que la justificaba ya no existe), o corregí el patrón");
    }
    console.error("");
  }

  if (informe.huecos.length) {
    salida = 1;
    console.error("== archivos fuera del alcance de la verificación ==");
    for (const h of informe.huecos) {
      const paq = paqueteDe(paquetes, h.archivo);
      const dirPaq = paq?.dir ?? "";
      const tsDelPaquete = tipos.declarantes.filter((t) => dirname(t) === (dirPaq || "."));
      const lineas = salidasPara(h, paquetes, tsDelPaquete, comandoLocal);
      console.log(
        `::error file=${h.archivo},title=Fuera del alcance de la verificación::${escaparAnotacion(lineas.slice(1).join("\n"))}`
      );
      for (const l of lineas) console.error(l);
      console.error("");
    }
  }

  // --- Resumen de la corrida --------------------------------------------
  const encabezado = salida === 0 ? "## Censo de fuentes: en verde" : "## Censo de fuentes: ROJO";
  const resumen = [
    encabezado,
    "",
    `- Archivos con extensión de fuente: **${informe.fuentes.length}**`,
    `- Fuera del alcance: **${informe.huecos.length}**`,
    `- Exclusiones declaradas: **${informe.exclusionesVivas.length}** (muertas: ${informe.exclusionesMuertas.length}, inválidas: ${informe.exclusionesInvalidas.length})`,
    `- Programas de tipos interrogados: **${tipos.programas.length}**`,
    "",
  ];
  if (informe.huecos.length) {
    resumen.push("### Fuera del alcance", "", "| Archivo | Analizador | Programa de tipos |", "| --- | --- | --- |");
    for (const h of informe.huecos) {
      resumen.push(`| \`${escaparCelda(h.archivo)}\` | ${h.faltaAnalizador ? "❌ no lo ve" : "✅"} | ${h.faltaTipos ? "❌ no lo incluye" : "✅"} |`);
    }
    resumen.push("");
  }
  if (filasResumen.length) {
    resumen.push("### Exclusiones declaradas", "", "| Archivo | Patrón | Manifiesto | Motivo |", "| --- | --- | --- | --- |", ...filasResumen, "");
  }
  if (informe.exclusionesMuertas.length) {
    resumen.push("### Exclusiones muertas", "", "| Patrón | Manifiesto | Motivo declarado |", "| --- | --- | --- |");
    for (const ex of informe.exclusionesMuertas) {
      resumen.push(`| \`${escaparCelda(ex.patron)}\` | \`${escaparCelda(ex.manifiesto)}\` | ${escaparCelda(ex.motivo)} |`);
    }
    resumen.push("");
  }
  resumir(resumen);

  if (salida === 0) {
    console.log(
      `✓ Censo de fuentes: los ${informe.fuentes.length} archivos fuente están dentro del alcance ` +
        `(${informe.exclusionesVivas.length} exclusión(es) declarada(s) con motivo)`
    );
  } else {
    console.error(
      `${informe.huecos.length} archivo(s) fuera del alcance, ` +
        `${informe.exclusionesMuertas.length} exclusión(es) muerta(s), ` +
        `${informe.exclusionesInvalidas.length} exclusión(es) inválida(s), ` +
        `${informe.programasVacios.length} programa(s) de tipos sin listado.`
    );
    console.error(`Reproducilo local, desde la raíz del repo:  ${comandoLocal}`);
  }
  return salida;
}

// Solo corre cuando se ejecuta como programa; importado desde las pruebas, no.
//
// La comparación pasa por realpath y, en Windows, ignora mayúsculas: la misma
// ruta llega con nombres cortos (JSANTA~1), a través de un enlace de directorio
// o con otra caja según quién invoque, y Node resuelve el enlace para
// `import.meta.url` pero NO para `process.argv[1]`. Una comparación literal
// contestaría "no soy el principal" y el proceso terminaría en exit 0 sin
// censar nada ni decir una palabra: es el único fail-open posible de este
// script, y por eso lo cubre una prueba que lo SPAWNEA por una ruta no
// canónica. Copiada de medir-cobertura-diff.mjs, que cerró el mismo agujero.
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
