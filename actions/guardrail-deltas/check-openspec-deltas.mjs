#!/usr/bin/env node
// Guardrail de OpenSpec: un bloque "## MODIFIED Requirements" REEMPLAZA al
// requirement completo en el spec principal al archivar. Si el delta omite
// un escenario que el spec vigente sí tiene, ese escenario se PIERDE.
//
// Origen: el 2026-07-31 el archive de un change abortó por esto (la
// herramienta lo atrapó a tiempo, pero solo en el último paso del change, con
// el trabajo ya hecho). Este script lo detecta en CI, en cada PR — el error no
// vuelve a depender de que alguien se acuerde de revisarlo.
//
// EL SEGUNDO PLANO, y hasta hoy el que no existía: EL ARCHIVE CONTRA EL SPEC
// VIVO. Lo de arriba mira hacia adelante (qué se perdería al archivar) y no
// mira nunca hacia atrás (qué se perdió). Los dos hacen falta, porque el modo
// de falla de atrás está documentado y es silencioso: `openspec archive` en
// Windows imprime "Specs updated successfully" y hace rollback sin aplicar
// nada. Cuando eso pasa el change queda movido a `changes/archive/` —historia
// inmutable— y el spec vivo queda sin tocar, así que el contrato archivado
// promete algo que ningún spec vigente dice y nada lo delata.
//
// LA MEDICIÓN QUE LO ORIGINÓ. En la rama que agregó la compuerta del total de
// cobertura, el único cambio de spec vivía DENTRO de `changes/archive/`. Este
// script salía EXIT 0 diciendo "ningún MODIFIED perdería requirements ni
// escenarios" habiendo comparado CERO deltas, porque su recorrido excluía la
// carpeta archive y en esa rama no quedaba ningún change activo. La coherencia
// entre el delta archivado y el spec vivo se sostenía en un md5 que alguien
// corrió a mano una vez.
//
// POR QUE ESTE CHEQUEO NO SE HABIA ESCRITO, y cómo se evita el falso positivo
// que lo hacía inviable: el archive es HISTORIA, y un change posterior puede
// legítimamente dar de baja o retitular lo que un change anterior agregó. Sin
// resolver esas dos salidas el chequeo quedaría en rojo permanente sobre
// historia correcta. Se resuelven leyendo las secciones REMOVED y RENAMED de
// TODOS los deltas archivados: un requirement nombrado ahí está superado, y no
// se le exige estar en el spec vivo.
//
// Y EL VERDE NO PUEDE SER MUDO. Toda corrida imprime cuántos deltas y cuántos
// requirements comparó; un árbol sin deltas lo dice con esas palabras en vez de
// afirmar que nada se perdería. Un verde que no midió nada es indistinguible de
// un verde que midió todo, y esa confusión ya costó una ronda.
//
// Uso: node check-openspec-deltas.mjs
// Variables de entorno (opcionales, con los mismos valores por defecto que el
// layout estándar de OpenSpec):
//   OPENSPEC_CHANGES  carpeta de changes  (default: openspec/changes)
//   OPENSPEC_SPECS    carpeta de specs    (default: openspec/specs)
// Sale 1 si algún delta MODIFIED perdería requirements o escenarios, o si algún
// delta ya ARCHIVADO promete algo que el spec vivo no dice.
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
let noAplicados = 0;
let deltasActivos = 0;
let deltasArchivados = 0;
let requirementsComparados = 0;
const carpetas = existsSync(CHANGES)
  ? readdirSync(CHANGES, { withFileTypes: true }).filter((d) => d.isDirectory() && d.name !== "archive")
  : [];

/** Las capabilities con delta de una carpeta de change, o [] si no tiene. */
const capsDe = (dirDelChange) => {
  const specsDir = join(dirDelChange, "specs");
  if (!existsSync(specsDir)) return [];
  return readdirSync(specsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .filter((nombre) => existsSync(join(specsDir, nombre, "spec.md")));
};

for (const carpeta of carpetas) {
  const specsDir = join(CHANGES, carpeta.name, "specs");
  if (!existsSync(specsDir)) continue;
  if (capsDe(join(CHANGES, carpeta.name)).length) deltasActivos++;
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
      requirementsComparados++;
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

// ---------------------------------------------------------------------------
// SEGUNDO PLANO: los deltas YA ARCHIVADOS contra el spec vivo.
// ---------------------------------------------------------------------------

const ARCHIVE = join(CHANGES, "archive");
const archivados = existsSync(ARCHIVE)
  ? readdirSync(ARCHIVE, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
      .sort()
  : [];

// Lo que un change POSTERIOR dio de baja o retituló. Se lee de TODOS los deltas
// archivados y no solo de los que vienen después: ordenar el archive por su
// nombre de carpeta funciona hoy porque el CLI los nombra con la fecha adelante,
// pero apoyar una compuerta en una convención de nombres es apoyarla en nada.
// La consecuencia de leerlos todos es que el chequeo es un poco más permisivo
// (una baja declarada perdona también al change que la agregó después, caso que
// no debería existir), y es la dirección correcta para equivocarse: un falso
// negativo acá deja pasar historia rara, y un falso positivo pondría en rojo
// permanente a un repositorio sin defecto.
// capability -> Map<titulo, Set<change que lo supero>>. Se guarda QUIEN y no solo
// que alguien lo hizo, por el motivo del comentario de abajo.
const superados = new Map();
// Superado POR OTRO change. Excluir al que pregunta es lo que mantiene vivo el
// plano: un change no puede superarse a si mismo, porque si pudiera cada delta
// MODIFIED se eximiria solo y esto no verificaria nada.
const superadoPorOtro = (cap, req, yo) => {
  const quienes = superados.get(cap)?.get(req);
  if (!quienes) return false;
  for (const quien of quienes) if (quien !== yo) return true;
  return false;
};
for (const nombre of archivados) {
  for (const cap of capsDe(join(ARCHIVE, nombre))) {
    const texto = leer(join(ARCHIVE, nombre, "specs", cap, "spec.md"));
    if (!superados.has(cap)) superados.set(cap, new Map());
    const anotar = (req) => {
      const m = superados.get(cap);
      if (!m.has(req)) m.set(req, new Set());
      m.get(req).add(nombre);
    };
    for (const req of titulos(seccionDe(texto, "REMOVED"), "### Requirement:")) anotar(req);
    for (const [, viejo] of renombres(texto)) anotar(viejo);
    // Y un MODIFIED de OTRO change tambien supera: reescribe el requirement, asi
    // que el delta anterior describe un contrato que ya no rige. Sin esto, el delta
    // mas viejo de una capability que evoluciono pierde SIEMPRE contra el spec vivo,
    // y eso es el falso positivo que este archivo declara querer evitar.
    // Medido sobre un historial real: la estrategia de ramas se agrego en
    // 2026-07-23-add-git-branch-strategy y DOS changes posteriores la reescribieron
    // con MODIFIED; el ADDED original quedaba rojo para siempre y sin ninguna via de
    // declaracion, que es el peor tipo de rojo que este marco puede emitir.
    for (const req of titulos(seccionDe(texto, "MODIFIED"), "### Requirement:")) anotar(req);
  }
}

for (const nombre of archivados) {
  const caps = capsDe(join(ARCHIVE, nombre));
  if (caps.length) deltasArchivados++;
  for (const cap of caps) {
    const texto = leer(join(ARCHIVE, nombre, "specs", cap, "spec.md"));
    const vigentePath = join(SPECS, cap, "spec.md");

    // Un requirement que este change dio de baja o retituló no tiene por qué
    // seguir vivo; si TODO lo que el delta declara está superado, tampoco hace
    // falta que la capability exista.
    const declarados = ["ADDED", "MODIFIED"].flatMap((seccion) => {
      const bloque = seccionDe(texto, seccion);
      return bloque ? titulos(bloque, "### Requirement:").map((req) => ({ seccion, req, bloque })) : [];
    });
    const vigentes = declarados.filter(({ req }) => !superadoPorOtro(cap, req, nombre));
    if (!vigentes.length) continue;

    if (!existsSync(vigentePath)) {
      noAplicados++;
      console.error(
        `✗ archive/${nombre} — el spec vigente de la capability "${cap}" no existe, y el delta archivado declara ${vigentes.length} requirement(s):`
      );
      for (const { req } of vigentes) console.error(`    · ${req}`);
      console.error("    · un archive que no dejó spec vivo NO se aplicó: revisá si el CLI hizo rollback");
      continue;
    }
    const vigente = leer(vigentePath);

    for (const { seccion, req, bloque } of vigentes) {
      requirementsComparados++;
      const enVigente = bloqueDe(vigente, req);
      if (!enVigente) {
        noAplicados++;
        console.error(
          `✗ archive/${nombre} / ${cap} — el ${seccion} de "${req}" no llegó al spec vigente:`
        );
        console.error("    · el archive dice que este requirement es contrato vigente y el spec vivo no lo tiene");
        console.error("    · si se dio de baja después, declaralo en un REMOVED; si se retituló, en un RENAMED");
        console.error("    · si el archive hizo rollback (pasa en Windows, y dice 'Specs updated successfully'), aplicalo de nuevo");
        continue;
      }
      const faltan = titulos(bloque ? bloqueDe(bloque, req) : "", "#### Scenario:").filter(
        (s) => !titulos(enVigente, "#### Scenario:").includes(s)
      );
      if (faltan.length) {
        noAplicados++;
        console.error(
          `✗ archive/${nombre} / ${cap} — "${req}" tiene ${faltan.length} escenario(s) que el spec vigente NO dice:`
        );
        for (const f of faltan) console.error(`    · ${f}`);
        console.error("    · el contrato archivado y el vigente tienen que decir lo mismo, o el archive quedó a medias");
      }
    }
  }
}

if (perdidas || huerfanos || noAplicados) {
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
  if (noAplicados) {
    console.error(
      `${noAplicados} requirement(s) de deltas YA ARCHIVADOS no están en el spec vigente.\n` +
        "El archive es el merge del contrato: si el delta archivado dice algo que el spec vivo no dice, el archive no se aplicó."
    );
  }
  process.exit(1);
}

// EL VERDE NO ES MUDO. Sin este párrafo, la corrida afirmaba que ningún
// MODIFIED perdería nada habiendo comparado cero deltas.
if (!requirementsComparados) {
  console.log(
    `✓ Deltas de OpenSpec: no hay ningún delta que comparar ` +
      `(${deltasActivos} activo(s), ${deltasArchivados} archivado(s) con specs)`
  );
} else {
  console.log(
    `✓ Deltas de OpenSpec: ${requirementsComparados} requirement(s) comparados en ` +
      `${deltasActivos} delta(s) activo(s) y ${deltasArchivados} delta(s) archivado(s); ` +
      `ningún MODIFIED perdería escenarios y todo lo archivado está en el spec vigente`
  );
}
