#!/usr/bin/env node
// Guardrail de OpenSpec: un bloque "## MODIFIED Requirements" REEMPLAZA al
// requirement completo en el spec principal al archivar. Si el delta omite
// un escenario que el spec vigente sí tiene, ese escenario se PIERDE.
//
// Origen: el 2026-07-31, en el repo donde nació este marco, el archive de un
// change abortó por esto (la herramienta lo atrapó a tiempo, pero solo en el
// último paso del change, con el trabajo ya hecho). Este script lo detecta en
// CI, en cada PR — el error no vuelve a depender de que alguien se acuerde de
// revisarlo.
//
// Uso: node check-openspec-deltas.mjs
// Variables de entorno (opcionales, con los mismos valores por defecto que el
// layout estándar de OpenSpec):
//   OPENSPEC_CHANGES  carpeta de changes  (default: openspec/changes)
//   OPENSPEC_SPECS    carpeta de specs    (default: openspec/specs)
// Sale 1 si algún delta MODIFIED perdería requirements o escenarios.
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const CHANGES = process.env.OPENSPEC_CHANGES || "openspec/changes";
const SPECS = process.env.OPENSPEC_SPECS || "openspec/specs";

// Normalizamos CRLF: los anclajes `$` de las expresiones regulares no cruzan
// un `\r`, y los builders editan estos archivos desde Windows. Sin esto el
// guardrail pasaría en verde en local sin haber comparado nada.
const leer = (ruta) => readFileSync(ruta, "utf8").replace(/\r\n/g, "\n");

const escapar = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const titulos = (texto, marca) =>
  [...texto.matchAll(new RegExp(`^${marca} (.+)$`, "gm"))].map((m) => m[1].trim());

/** Extrae el bloque de un requirement (hasta el siguiente ### o fin). */
function bloqueDe(texto, requirement) {
  const re = new RegExp(`^### Requirement: ${escapar(requirement)}$`, "m");
  const ini = texto.search(re);
  if (ini === -1) return "";
  const resto = texto.slice(ini + 1);
  const sig = resto.search(/^### Requirement: /m);
  return sig === -1 ? texto.slice(ini) : texto.slice(ini, ini + 1 + sig);
}

/**
 * Extrae una sección del delta ("## ADDED|MODIFIED|REMOVED|RENAMED
 * Requirements") hasta el siguiente encabezado de nivel 2 o el fin del archivo.
 *
 * Por qué existe: el guardrail solo puede juzgar los requirements que están
 * DENTRO del bloque MODIFIED. Los de ADDED legítimamente no viven todavía en
 * el spec vigente, y confundirlos sería un falso positivo en cada change que
 * agrega y modifica en el mismo delta (el caso normal).
 */
function seccionDe(texto, nombre) {
  const re = new RegExp(`^## ${nombre} Requirements[ \\t]*$`, "m");
  const ini = texto.search(re);
  if (ini === -1) return "";
  const resto = texto.slice(ini + 1);
  const sig = resto.search(/^## /m);
  return sig === -1 ? texto.slice(ini) : texto.slice(ini, ini + 1 + sig);
}

/**
 * Mapa "título nuevo" -> "título vigente" leído de "## RENAMED Requirements".
 * Formato OpenSpec:
 *   - FROM: `### Requirement: título viejo`
 *   - TO: `### Requirement: título nuevo`
 *
 * Un retitulado declarado es legítimo: el MODIFIED usa el título nuevo y hay
 * que comparar contra el bloque viejo del spec vigente. Sin esta resolución,
 * el chequeo de huérfanos (abajo) marcaría en rojo un rename correcto.
 */
function renombres(texto) {
  const mapa = new Map();
  const seccion = seccionDe(texto, "RENAMED");
  if (!seccion) return mapa;
  const re =
    /^[ \t]*-[ \t]*FROM:[ \t]*`?#{3}[ \t]*Requirement:[ \t]*(.+?)`?[ \t]*$\n[ \t]*-[ \t]*TO:[ \t]*`?#{3}[ \t]*Requirement:[ \t]*(.+?)`?[ \t]*$/gm;
  for (const m of seccion.matchAll(re)) mapa.set(m[2].trim(), m[1].trim());
  return mapa;
}

let perdidas = 0;
let huerfanos = 0;
const carpetas = existsSync(CHANGES)
  ? readdirSync(CHANGES, { withFileTypes: true }).filter((d) => d.isDirectory() && d.name !== "archive")
  : [];

for (const carpeta of carpetas) {
  const specsDir = join(CHANGES, carpeta.name, "specs");
  if (!existsSync(specsDir)) continue;
  for (const cap of readdirSync(specsDir, { withFileTypes: true }).filter((d) => d.isDirectory())) {
    const deltaPath = join(specsDir, cap.name, "spec.md");
    const vigentePath = join(SPECS, cap.name, "spec.md");
    if (!existsSync(deltaPath) || !existsSync(vigentePath)) continue; // capability nueva: nada que perder
    const delta = leer(deltaPath);
    const modificado = seccionDe(delta, "MODIFIED");
    if (!modificado) continue;
    const vigente = leer(vigentePath);
    const renames = renombres(delta);

    for (const req of titulos(modificado, "### Requirement:")) {
      const tituloVigente = renames.get(req) || req;
      const enVigente = bloqueDe(vigente, tituloVigente);

      // HUECO DEL SCRIPT ORIGINAL, ARREGLADO ACÁ.
      // Antes esto era un `continue` silencioso ("requirement nuevo dentro del
      // MODIFIED"). Pero un requirement que NO existe en el spec vigente no
      // tiene nada que modificar: al archivar, OpenSpec lo agrega, y si el
      // título era una variante del que ya existía (una coma, un acento, una
      // palabra cambiada) el spec queda con DOS requirements que dicen casi lo
      // mismo — y nadie se entera, porque el guardrail dijo verde. Es el mismo
      // modo de falla que el script vino a evitar (perder contrato en el
      // archive), solo que por duplicación en vez de por omisión.
      // Ahora avisa. Las dos salidas legítimas están en el mensaje: si de
      // verdad es nuevo, va en ADDED; si es un retitulado, se declara en
      // RENAMED y el guardrail lo resuelve solo.
      if (!enVigente) {
        huerfanos++;
        console.error(
          `✗ ${carpeta.name} / ${cap.name} — el MODIFIED de "${req}" no existe en el spec vigente:`
        );
        console.error("    · al archivar se agregaría como requirement nuevo, sin reemplazar nada");
        console.error('    · si es nuevo de verdad, muévelo a "## ADDED Requirements"');
        console.error('    · si le cambiaste el título, decláralo en "## RENAMED Requirements" (FROM/TO)');
        continue;
      }

      const enDelta = bloqueDe(modificado, req);
      const faltan = titulos(enVigente, "#### Scenario:").filter(
        (s) => !titulos(enDelta, "#### Scenario:").includes(s)
      );
      if (faltan.length) {
        perdidas++;
        console.error(
          `✗ ${carpeta.name} / ${cap.name} — el MODIFIED de "${req}" perdería ${faltan.length} escenario(s):`
        );
        for (const f of faltan) console.error(`    · ${f}`);
      }
    }
  }
}

if (perdidas || huerfanos) {
  console.error("");
  if (perdidas) {
    console.error(
      `${perdidas} requirement(s) perderían escenarios al archivar.\n` +
        "Copia los escenarios vigentes al bloque MODIFIED (actualizando su redacción si el comportamiento cambió)."
    );
  }
  if (huerfanos) {
    console.error(
      `${huerfanos} requirement(s) del bloque MODIFIED no existen en el spec vigente.\n` +
        'Muévelos a "## ADDED Requirements" o declara el retitulado en "## RENAMED Requirements".'
    );
  }
  process.exit(1);
}
console.log("✓ Deltas de OpenSpec: ningún MODIFIED perdería requirements ni escenarios");
