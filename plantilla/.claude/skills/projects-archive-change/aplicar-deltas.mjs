#!/usr/bin/env node
// ---------------------------------------------------------------------------
// Aplica los deltas de un change de OpenSpec a los specs VIVOS, replicando la
// semantica del `openspec archive` sin usar el CLI.
//
// POR QUE EXISTE. En Windows `openspec archive` falla con EPERM al renombrar la
// carpeta del change y hace ROLLBACK de todo — despues de haber impreso
// "Specs updated successfully". Quien se queda con el mensaje cree que archivo
// y no archivo nada. Este script hace la parte que el CLI no logra hacer en esa
// plataforma: fundir los deltas en los specs vivos. El movimiento de la carpeta
// se hace aparte, con `git mv` (ese si funciona: el lock es sobre el rename del
// DIRECTORIO, no sobre los archivos).
//
// USO, desde la raiz del repo:
//   node .claude/skills/projects-archive-change/aplicar-deltas.mjs <nombre-del-change>
//   node .claude/skills/projects-archive-change/aplicar-deltas.mjs <nombre-del-change> --simulacro
//
// Variables de entorno (mismos defaults que el layout estandar de OpenSpec):
//   OPENSPEC_CHANGES  carpeta de changes  (default: openspec/changes)
//   OPENSPEC_SPECS    carpeta de specs    (default: openspec/specs)
//
// ORDEN DE APLICACION, y no es negociable:
//   1. RENAMED   — primero, porque los bloques MODIFIED del delta vienen con el
//                  titulo NUEVO: si el rename no se aplico antes, el MODIFIED no
//                  encuentra su requirement en el spec vivo.
//   2. MODIFIED  — REEMPLAZA EL REQUIREMENT COMPLETO. No es un merge linea a
//                  linea: lo que el delta no repite, se pierde. Esa es la
//                  semantica real del archive y por eso existe el guardrail de
//                  deltas en CI.
//   3. REMOVED   — borra el bloque entero del requirement.
//   4. ADDED     — al final, para que la insercion no corra los offsets de las
//                  busquedas anteriores.
//
// DOS GUARDAS, las dos deliberadas:
//   · FAIL-CLOSED AL PLANIFICAR: se planifica TODO (todas las capabilities) y
//     recien despues se escribe. Si una sola operacion no cuadra —un MODIFIED
//     cuyo requirement no existe en el spec vivo, un ADDED que ya existe, un
//     encabezado de seccion desconocido— no se escribe NI UN archivo y el
//     script sale 1. Nunca deja los specs a medio aplicar.
//   · CERO OPERACIONES ES ROJO: si el script no aplico ni una sola operacion,
//     REVIENTA. Un archive que no aplica nada y dice "listo" es exactamente el
//     fail-open que el marco combate, y ya paso de verdad.
// ---------------------------------------------------------------------------
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname, posix } from "node:path";

const CHANGES = process.env.OPENSPEC_CHANGES || "openspec/changes";
const SPECS = process.env.OPENSPEC_SPECS || "openspec/specs";
const SECCIONES = ["ADDED", "MODIFIED", "REMOVED", "RENAMED"];

const args = process.argv.slice(2);
const SIMULACRO = args.includes("--simulacro");
const CHANGE = args.find((a) => !a.startsWith("--"));

if (!CHANGE) {
  console.error("uso: node aplicar-deltas.mjs <nombre-del-change> [--simulacro]");
  process.exit(2);
}

// Normalizamos CRLF: los anclajes `$` de las expresiones regulares no cruzan un
// `\r`, y estos archivos se editan desde Windows. Sin esto el script no
// encontraria un solo encabezado y saldria por la guarda de cero operaciones —
// ruidoso, pero por el motivo equivocado.
const leer = (ruta) => readFileSync(ruta, "utf8").replace(/\r\n/g, "\n");
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Limites del bloque de un requirement: desde su encabezado hasta el siguiente `###` o el fin. */
function bloqueDe(texto, titulo) {
  const re = new RegExp(`^### Requirement: ${esc(titulo)}[ \\t]*$`, "m");
  const ini = texto.search(re);
  if (ini === -1) return null;
  const resto = texto.slice(ini + 1);
  const sig = resto.search(/^### Requirement: /m);
  return { ini, fin: sig === -1 ? texto.length : ini + 1 + sig };
}

/** Texto de una seccion `## <NOMBRE> Requirements` hasta el siguiente `## ` o el fin. */
function seccionDe(texto, nombre) {
  const re = new RegExp(`^## ${nombre} Requirements[ \\t]*$`, "m");
  const ini = texto.search(re);
  if (ini === -1) return "";
  const resto = texto.slice(ini + 1);
  const sig = resto.search(/^## /m);
  return sig === -1 ? texto.slice(ini) : texto.slice(ini, ini + 1 + sig);
}

/** Bloques `### Requirement: ...` de una seccion, con su texto completo. */
function bloquesDe(seccion) {
  const titulos = [...seccion.matchAll(/^### Requirement: (.+?)[ \t]*$/gm)].map((m) => m[1].trim());
  return titulos.map((titulo) => {
    const b = bloqueDe(seccion, titulo);
    return { titulo, texto: seccion.slice(b.ini, b.fin).replace(/\s+$/, "") };
  });
}

/** Pares FROM/TO de `## RENAMED Requirements`. */
function renombresDe(texto) {
  const seccion = seccionDe(texto, "RENAMED");
  if (!seccion) return [];
  const re =
    /^[ \t]*-[ \t]*FROM:[ \t]*`?#{3}[ \t]*Requirement:[ \t]*(.+?)`?[ \t]*$\n[ \t]*-[ \t]*TO:[ \t]*`?#{3}[ \t]*Requirement:[ \t]*(.+?)`?[ \t]*$/gm;
  return [...seccion.matchAll(re)].map((m) => ({ de: m[1].trim(), a: m[2].trim() }));
}

/** Todos los `spec.md` bajo un directorio, con su ruta de capability relativa. */
function deltasDe(raiz, prefijo = "") {
  const salida = [];
  for (const entrada of readdirSync(raiz, { withFileTypes: true })) {
    const ruta = join(raiz, entrada.name);
    const rel = prefijo ? posix.join(prefijo, entrada.name) : entrada.name;
    if (entrada.isDirectory()) salida.push(...deltasDe(ruta, rel));
    else if (entrada.name === "spec.md") salida.push({ capability: prefijo, ruta: raiz });
  }
  return salida;
}

/** Inserta bloques al final de la seccion `## Requirements` del spec vivo. */
function insertarEnRequirements(vivo, bloques) {
  const re = /^## Requirements[ \t]*$/m;
  const ini = vivo.search(re);
  if (ini === -1) return null;
  const resto = vivo.slice(ini + 1);
  const sig = resto.search(/^## /m);
  const fin = sig === -1 ? vivo.length : ini + 1 + sig;
  const nuevo = bloques.map((b) => `${b.texto}\n\n`).join("");
  return `${vivo.slice(0, fin).replace(/\s+$/, "")}\n\n${nuevo}${vivo.slice(fin)}`;
}

// "No pude mirar" y "no habia nada" NO son lo mismo, y confundirlos aca es
// caro: el mensaje de "este change no lleva deltas" invita a archivar con
// `git mv` a secas, o sea a mover el change SIN fundir sus deltas — perdida de
// contrato en silencio, que es exactamente lo que este procedimiento existe
// para evitar. Por eso se distinguen los tres casos antes de concluir nada.
const dirChange = join(CHANGES, CHANGE);
const dirDeltas = join(dirChange, "specs");

if (!existsSync(CHANGES)) {
  console.error(
    `::error::no existe "${CHANGES}" desde este directorio: NO estas en la raiz del repo (o OPENSPEC_CHANGES apunta mal). No se concluyo nada sobre el change "${CHANGE}".`
  );
  console.error("Corre el script desde la raiz del repo (donde vive openspec/), o exporta OPENSPEC_CHANGES.");
  process.exit(2);
}

if (!existsSync(dirChange)) {
  const disponibles = readdirSync(CHANGES, { withFileTypes: true })
    .filter((e) => e.isDirectory() && e.name !== "archive")
    .map((e) => e.name);
  console.error(`::error::no existe el change "${CHANGE}" en ${CHANGES}: revisa el nombre. NO se concluyo que no tenga deltas.`);
  console.error(`changes activos: ${disponibles.length > 0 ? disponibles.join(", ") : "(ninguno)"}`);
  process.exit(2);
}

if (!existsSync(dirDeltas)) {
  console.error(`::error::el change "${CHANGE}" EXISTE pero no tiene carpeta de deltas (${dirDeltas}): no hay NADA que aplicar.`);
  console.error(
    "Si el change de verdad no lleva deltas de spec, archivalo solo con `git mv` y decilo en el PR. Este script no se usa en ese caso."
  );
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Fase 1: planificar TODO. Cero escrituras.
// ---------------------------------------------------------------------------
const plan = [];
const errores = [];
const avisos = [];
let operaciones = 0;

for (const { capability, ruta } of deltasDe(dirDeltas)) {
  const rutaDelta = join(ruta, "spec.md");
  const rutaViva = join(SPECS, ...capability.split("/"), "spec.md");
  const delta = leer(rutaDelta);

  // Fail-closed ante lo desconocido: una seccion que este script no sabe
  // aplicar no se ignora en silencio (seria perder contrato sin avisar).
  for (const m of delta.matchAll(/^## (.+?) Requirements[ \t]*$/gm)) {
    if (!SECCIONES.includes(m[1].trim())) {
      errores.push(`${capability}: seccion desconocida "## ${m[1]} Requirements" — este script no la sabe aplicar`);
    }
  }

  const renames = renombresDe(delta);
  const modificados = bloquesDe(seccionDe(delta, "MODIFIED"));
  const removidos = bloquesDe(seccionDe(delta, "REMOVED"));
  const agregados = bloquesDe(seccionDe(delta, "ADDED"));

  let vivo;
  let creada = false;
  if (existsSync(rutaViva)) {
    vivo = leer(rutaViva);
  } else if (agregados.length > 0 && renames.length + modificados.length + removidos.length === 0) {
    // Capability NUEVA: nace en el archive, con Purpose TBD (limite conocido del
    // formato — los deltas no transportan `## Purpose`).
    vivo = `# ${capability.split("/").pop()}\n\n## Purpose\n\nTBD\n\n## Requirements\n`;
    creada = true;
    avisos.push(
      `${capability}: capability NUEVA, nace con "Purpose: TBD" — completalo en el MISMO PR del archive`
    );
  } else {
    errores.push(`${capability}: no existe el spec vivo ${rutaViva} y el delta trae operaciones que lo necesitan`);
    continue;
  }

  const ops = [];

  for (const { de, a } of renames) {
    if (!bloqueDe(vivo, de)) errores.push(`${capability}: RENAMED FROM "${de}" no existe en el spec vivo`);
    else if (bloqueDe(vivo, a)) errores.push(`${capability}: RENAMED TO "${a}" ya existe en el spec vivo`);
    else {
      vivo = vivo.replace(
        new RegExp(`^### Requirement: ${esc(de)}[ \\t]*$`, "m"),
        `### Requirement: ${a}`
      );
      ops.push(`RENAMED  "${de}" -> "${a}"`);
    }
  }

  for (const { titulo, texto } of modificados) {
    const b = bloqueDe(vivo, titulo);
    if (!b) {
      errores.push(
        `${capability}: MODIFIED "${titulo}" no existe en el spec vivo (si lo retitulaste, declaralo en "## RENAMED Requirements")`
      );
      continue;
    }
    vivo = `${vivo.slice(0, b.ini)}${texto}\n\n${vivo.slice(b.fin)}`;
    ops.push(`MODIFIED "${titulo}" (requirement reemplazado COMPLETO)`);
  }

  for (const { titulo } of removidos) {
    const b = bloqueDe(vivo, titulo);
    if (!b) {
      errores.push(`${capability}: REMOVED "${titulo}" no existe en el spec vivo`);
      continue;
    }
    vivo = `${vivo.slice(0, b.ini)}${vivo.slice(b.fin)}`;
    ops.push(`REMOVED  "${titulo}"`);
  }

  const nuevos = [];
  for (const bloque of agregados) {
    if (bloqueDe(vivo, bloque.titulo)) {
      errores.push(`${capability}: ADDED "${bloque.titulo}" YA existe en el spec vivo`);
      continue;
    }
    nuevos.push(bloque);
    ops.push(`ADDED    "${bloque.titulo}"`);
  }
  if (nuevos.length > 0) {
    const conNuevos = insertarEnRequirements(vivo, nuevos);
    if (conNuevos === null) errores.push(`${capability}: el spec vivo no tiene seccion "## Requirements" donde insertar los ADDED`);
    else vivo = conNuevos;
  }

  if (ops.length === 0) {
    avisos.push(`${capability}: el delta no declara ninguna operacion aplicable`);
    continue;
  }

  // Un borrado o un reemplazo pueden dejar tres saltos seguidos. Los specs no
  // usan lineas en blanco multiples como contenido, asi que normalizar es seguro.
  vivo = `${vivo.replace(/\n{3,}/g, "\n\n").replace(/\s+$/, "")}\n`;

  operaciones += ops.length;
  plan.push({ capability, rutaViva, contenido: vivo, ops, creada });
}

// ---------------------------------------------------------------------------
// Fase 2: guardas y escritura
// ---------------------------------------------------------------------------
for (const a of avisos) console.log(`::warning::${a}`);

if (errores.length > 0) {
  for (const e of errores) console.error(`  ✗ ${e}`);
  console.error(
    `::error::${errores.length} problema(s) al planificar: NO se escribio ni un archivo y NADA quedo aplicado. Arregla el delta y volve a correr.`
  );
  process.exit(1);
}

// LA GUARDA. Un script de archive que no aplica nada y dice "listo" es el
// fail-open que este procedimiento existe para evitar. Paso de verdad.
if (operaciones === 0) {
  console.error(
    `::error::el change "${CHANGE}" tiene carpeta de deltas pero NO se aplico NI UNA operacion. Esto no sale en verde nunca: o los deltas no declaran ADDED/MODIFIED/REMOVED/RENAMED, o los encabezados no tienen el formato que OpenSpec espera. Revisa ${dirDeltas} antes de mover nada.`
  );
  process.exit(1);
}

for (const { capability, rutaViva, ops, creada } of plan) {
  console.log(`\n${capability}${creada ? "  (capability NUEVA)" : ""}  ->  ${rutaViva}`);
  for (const op of ops) console.log(`  ~ ${op}`);
}

if (SIMULACRO) {
  console.log(`\n[simulacro] ${operaciones} operacion(es) planificadas y NO escritas. Corre sin --simulacro para aplicarlas.`);
  process.exit(0);
}

for (const { rutaViva, contenido } of plan) {
  mkdirSync(dirname(rutaViva), { recursive: true });
  writeFileSync(rutaViva, contenido);
}

console.log(`\n✓ ${operaciones} operacion(es) aplicadas en ${plan.length} spec(s) vivo(s)`);
console.log("Falta: mover el change con `git mv`, validar --all --strict, correr el guardrail de deltas y completar los Purpose TBD.");
