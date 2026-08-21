#!/usr/bin/env node
// Arnés del piloto de `capa-descubrimiento`: cierra G4 y G0 por CÓDIGO DE
// SALIDA, no por lo que imprime una herramienta.
//
// Por qué existe. El gate del piloto pide, para el brazo B, que su salida pase
// «los mismos gates: validate --strict y guardrail de deltas verdes POR CÓDIGO
// DE SALIDA» (design.md, D6/G4), y que las ediciones al directorio de
// instalación de la herramienta sean cero (G0). Sin un arnés, eso lo corre una
// persona a mano, mira tres salidas y anota una conclusión: exactamente la forma
// en que este proyecto produjo un falso verde. Acá cada verificación imprime su
// comando y su código de salida, y este script devuelve distinto de cero si
// alguna falló.
//
// Lo que este script NO hace, dicho antes de que alguien lo suponga: no puntúa
// G1, G2, G3, G5 ni G6. Esos son lectura humana contra el inventario y así están
// declarados en el pre-registro. Un arnés que fingiera puntuarlos sería peor que
// no tenerlo.
//
// Uso:
//   node verificar-brazo.mjs <ruta-del-espacio-desechable> <A|B>
//
// Variables de entorno (opcionales):
//   RUTA_GUARDRAIL  script del guardrail de deltas del marco. Por defecto se
//                   resuelve desde la ubicación de ESTE archivo, cinco niveles
//                   arriba, en actions/guardrail-deltas/. No se copia el script:
//                   se corre el del marco, para que el piloto mida contra el
//                   guardrail real y no contra una copia que ya envejeció.
//
// ---------------------------------------------------------------------------
// LA RECETA DEL ESPACIO DESECHABLE
//
// Esto no estaba escrito en ninguna parte y sin eso el piloto arranca inventando
// el laboratorio el lunes a la mañana. El espacio se arma UNA VEZ POR BRAZO, y
// los dos se arman igual salvo el paso 3, que es el único que distingue los
// brazos.
//
//   1. Crear un directorio nuevo, vacío, fuera de todo repositorio (ver la nota
//      sobre D5, abajo). Un directorio por brazo: nada se comparte entre A y B
//      salvo el material de entrada.
//
//   2. `git init` DENTRO del espacio. Sí, git.
//
//   3. Solo el brazo B: instalar la herramienta con su versión exacta (la del
//      pre-registro, sección 6) y, ACTO SEGUIDO, commitear LOS DOS directorios
//      que la instalación escribe:
//
//        git add --all --force -- _bmad .claude/skills
//        git commit -m "instalacion limpia de la herramienta"
//
//      Ese commit es el patrón de comparación de G0 y no hay otro. Si se
//      instala, se trabaja un rato y después se commitea, el commit ya incluye
//      las ediciones y G0 mide cero para siempre: verde perfecto, medición
//      nula. El `--force` está porque la herramienta puede traer su propio
//      .gitignore que ignore su directorio de instalación (en el repo de un
//      consumidor eso es lo correcto, D9; acá lo queremos versionado).
//
//      SON DOS DIRECTORIOS Y NO UNO, y esto se corrigió el 2026-08-21 porque la
//      versión anterior medía la mitad. La instalación escribe `_bmad/` **y 49
//      skills** en `.claude/skills/` (medido el 2026-08-20; pre-registro,
//      sección 6). La edición más probable de todo el piloto —tocar el prompt de
//      una skill para que la fase 1 ingiera un corpus en vez de elicitar— ocurre
//      en el directorio que G0 no estaba mirando, así que el fork pasaba el
//      criterio en VERDE. Reproducido antes de arreglarlo: con `_bmad` intacto y
//      una sola skill reescrita de «elicita al usuario» a «ingiere el corpus»,
//      el arnés devolvía código de salida 0.
//
//   4. Copiar `config-espacio-de-trabajo.yaml` (está al lado de este archivo) a
//      `openspec/config.yaml` del espacio. IDÉNTICO EN LOS DOS BRAZOS: es lo que
//      vuelve comparable la medición. Un brazo que redacta con las reglas del
//      marco cargadas y otro que no da una diferencia que después se lee como
//      mérito del método.
//
//   5. Crear `openspec/specs/` (con un `.gitkeep`, porque git no versiona
//      directorios vacíos) y `openspec/changes/<rebanada>/` con el `proposal.md`
//      del brazo y sus deltas en `specs/<capability>/spec.md`.
//
//   6. Commitear. Desde acá en adelante, cada sesión cierra con su fila en
//      `horas.csv` y con un commit del espacio: los commits son lo que hace
//      falsable el orden de los eventos.
//
// QUÉ SIGNIFICA «FUERA DE TODO REPOSITORIO» (D5), porque la lectura literal
// rompe G0. Significa fuera de Projects, fuera de `plantilla/` y fuera de los
// repositorios consumidores: el piloto no escribe una línea en ninguno de los
// tres. NO significa «sin git». La evidencia de G0 es un diff de git contra el
// commit de instalación; sin git, G0 no tiene con qué medirse y el criterio se
// registraría como no medido, que por la regla de veredicto cuenta en contra.
// Un `git init` en un directorio temporal no es un repositorio del área: es el
// instrumento de medición.
//
// DOS LÍMITES DECLARADOS DE ESTA MEDICIÓN, para que no se descubran después:
//
//   · `openspec/specs/` arranca vacío, así que todas las capabilities de los
//     deltas de la rebanada son nuevas y el guardrail de deltas no tiene ningún
//     bloque MODIFIED que comparar. Lo que verifica acá es que el delta esté
//     bien formado, no que no pierda escenarios vigentes: en una rebanada
//     greenfield no hay escenarios vigentes que perder.
//
//   · El directorio de salidas de la herramienta (`_bmad-output/`) NO es parte de
//     la instalación, así que G0 no lo mira. Eso es correcto: esas salidas son
//     el producto del brazo B, y tocarlas es usar la herramienta, no forkearla.
//
//   · G0 mira los dos directorios que la instalación escribe, y solo esos. Una
//     edición que la herramienta necesitara en OTRO lugar del espacio —un
//     archivo de configuración propio, por ejemplo— no la vería. El criterio
//     está definido sobre «el directorio de instalación de la herramienta», y lo
//     que se corrigió acá es que ese directorio son dos. Si el lunes aparece un
//     tercero, se agrega a `DIRS_HERRAMIENTA` y se dice en la bitácora de G5.
// ---------------------------------------------------------------------------

import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const AQUI = dirname(fileURLToPath(import.meta.url));

// Cinco niveles: arnes -> piloto -> capa-descubrimiento -> changes -> openspec -> raíz.
const RAIZ_MARCO = resolve(AQUI, "..", "..", "..", "..", "..");
const GUARDRAIL =
  process.env.RUTA_GUARDRAIL ||
  join(RAIZ_MARCO, "actions", "guardrail-deltas", "check-openspec-deltas.mjs");

// El CLI va con paquete completo y versión exacta porque este archivo NO es un
// .md: el check «Ejecutores de paquetes pinados» del marco excluye los .md por
// pathspec, así que sobre esta línea sí tiene jurisdicción. Y la razón de fondo
// no es el check: el nombre pelado `openspec` en npm es un placeholder ajeno, y
// un ejecutor que descarga lo bajaría y lo correría sin preguntar.
const CLI_OPENSPEC = "npx --yes @fission-ai/openspec@1.9.0 validate --all --strict";

const uso = () => {
  console.error("uso: node verificar-brazo.mjs <ruta-del-espacio-desechable> <A|B>");
  console.error("");
  console.error("  <ruta-del-espacio>  el directorio armado con la receta del encabezado");
  console.error("  <A|B>               A = control (sin herramienta), B = con la herramienta");
  process.exit(2);
};

const [rutaCruda, brazoCrudo] = process.argv.slice(2);
if (!rutaCruda || !brazoCrudo) uso();

const ESPACIO = resolve(rutaCruda);
const BRAZO = brazoCrudo.toUpperCase();
if (BRAZO !== "A" && BRAZO !== "B") uso();

if (!existsSync(ESPACIO)) {
  console.error(`✗ el espacio de trabajo no existe: ${ESPACIO}`);
  console.error("  no se puede verificar lo que no está, y esto NO se reporta como cero ediciones");
  process.exit(1);
}

/**
 * Corre un comando y devuelve su código de salida REAL. Un fallo de spawn
 * (binario ausente, permiso) devuelve `null` en `status`: eso no es cero y no se
 * traduce a cero. La regla del marco es explícita: el fail-open silencioso está
 * prohibido, y «no se pudo correr» jamás se reporta como éxito.
 */
function correr(etiqueta, comando, argumentos, opciones = {}) {
  const linea = argumentos.length ? `${comando} ${argumentos.join(" ")}` : comando;
  console.log("");
  console.log(`── ${etiqueta}`);
  console.log(`   $ ${linea}`);
  if (opciones.cwd) console.log(`   (cwd: ${opciones.cwd})`);

  const r = spawnSync(comando, argumentos, { stdio: "inherit", ...opciones });

  if (r.error || r.status === null) {
    const motivo = r.error ? r.error.message : `terminó por señal ${r.signal}`;
    console.log(`   código de salida: NO HUBO (${motivo})`);
    return { codigo: null, motivo };
  }
  console.log(`   código de salida: ${r.status}`);
  return { codigo: r.status, motivo: null };
}

/** Igual que `correr`, pero captura la salida en vez de heredarla. */
function correrCallado(comando, argumentos, opciones = {}) {
  const r = spawnSync(comando, argumentos, { encoding: "utf8", ...opciones });
  if (r.error || r.status === null) return { codigo: null, texto: "" };
  return { codigo: r.status, texto: `${r.stdout || ""}${r.stderr || ""}` };
}

// ---------------------------------------------------------------------------
// GUARDA DE D5: el espacio no puede ser un repositorio del área.
//
// Es la única forma en que este arnés puede protegerse del error que más caro
// saldría: correr el piloto adentro de Projects o de un consumidor. No prueba que
// el espacio sea «desechable» (eso no es una propiedad verificable); prueba lo
// que sí se puede probar, y falla ruidoso en vez de asumir.
// ---------------------------------------------------------------------------
const toplevel = correrCallado("git", ["rev-parse", "--show-toplevel"], { cwd: ESPACIO });
const raizEspacio = toplevel.codigo === 0 ? resolve(toplevel.texto.trim()) : null;

if (raizEspacio && raizEspacio === resolve(RAIZ_MARCO)) {
  console.error("✗ el espacio apunta al repositorio del marco (Projects). D5 lo prohíbe: el piloto");
  console.error("  no escribe una línea en Projects, en plantilla/ ni en los consumidores");
  process.exit(1);
}
if (raizEspacio && existsSync(join(raizEspacio, "plantilla"))) {
  console.error(`✗ el espacio vive en un repositorio que tiene plantilla/ (${raizEspacio}):`);
  console.error("  tiene pinta de ser el marco o un scaffold, y D5 lo prohíbe");
  process.exit(1);
}

console.log(`espacio: ${ESPACIO}`);
console.log(`brazo:   ${BRAZO}`);
console.log(`raíz de git del espacio: ${raizEspacio || "(no es un repositorio de git)"}`);

const resultados = [];

// ---------------------------------------------------------------------------
// (a) Guardrail de deltas del marco, sobre el espacio.
// Se le pasan las dos carpetas en rutas ABSOLUTAS porque el script las lee de
// variables de entorno con default relativo al cwd, y acá el cwd no es el
// espacio.
// ---------------------------------------------------------------------------
if (!existsSync(GUARDRAIL)) {
  console.error(`✗ no se encontró el guardrail de deltas en ${GUARDRAIL}`);
  console.error("  arreglo: pasá RUTA_GUARDRAIL con la ruta al script del marco.");
  console.error("  Sin poder correrlo no se declara verde: se sale distinto de cero.");
  process.exit(1);
}

const guardrail = correr("(a) guardrail de deltas del marco", "node", [GUARDRAIL], {
  env: {
    ...process.env,
    OPENSPEC_CHANGES: join(ESPACIO, "openspec", "changes"),
    OPENSPEC_SPECS: join(ESPACIO, "openspec", "specs"),
  },
});
resultados.push({ nombre: "(a) guardrail de deltas", ...guardrail });

// ---------------------------------------------------------------------------
// (b) Validación estricta del CLI de OpenSpec, con el cwd en el espacio.
// Va por shell porque la invocación viaja escrita en una sola línea, con el
// paquete completo y su versión exacta, que es la forma que el marco exige y la
// que su check sabe leer.
// ---------------------------------------------------------------------------
const validacion = correr("(b) validación estricta de OpenSpec", CLI_OPENSPEC, [], {
  cwd: ESPACIO,
  shell: true,
});
resultados.push({ nombre: "(b) validate --all --strict", ...validacion });

// ---------------------------------------------------------------------------
// (c) G0: cero ediciones al directorio de instalación de la herramienta.
//
// Se compara el árbol de trabajo contra el commit de instalación usando un
// ÍNDICE TEMPORAL (GIT_INDEX_FILE): así el estado del espacio no se toca, y
// correr el arnés dos veces no cambia lo que un commit posterior incluiría.
//
// Se usa `git add --all` y no `git diff --quiet` a secas porque `git diff` solo
// ve archivos ya rastreados: un archivo NUEVO adentro del directorio de
// instalación (un workflow propio, una persona editada) es una edición de manual
// y `git diff --quiet` la declararía verde. Con `add --all` entran las
// modificaciones, los agregados y los borrados, y todo sale por un solo código
// de salida.
//
// Y se miran LOS DOS directorios que la instalación escribe, no solo `_bmad`:
// ver la nota del paso 3 de la receta. Medir uno solo dejaba en verde
// justamente el fork más probable del piloto.
// ---------------------------------------------------------------------------

// Los directorios que la instalación de la herramienta escribe en el espacio.
// Medido el 2026-08-20: `_bmad/` (núcleo y módulos) y 49 skills en
// `.claude/skills/`. G0 se mide sobre los dos, y el mensaje los nombra a los dos
// para que «cero ediciones» no se pueda leer como si cubriera uno.
const DIRS_HERRAMIENTA = ["_bmad", ".claude/skills"];
const NOMBRES_DIRS = DIRS_HERRAMIENTA.join(" y ");

if (BRAZO === "A") {
  console.log("");
  console.log(`── (c) G0: ediciones a los directorios de instalación (${NOMBRES_DIRS})`);
  console.log("   NO APLICA al brazo A: el control no instala la herramienta.");
  console.log("   Esto no es verde, es no-aplica, y así va al veredicto.");
  resultados.push({ nombre: "(c) G0", codigo: 0, motivo: null, noAplica: true });
} else {
  const cabeza = correrCallado("git", ["rev-parse", "--verify", "HEAD"], { cwd: ESPACIO });

  // Un impedimento POR DIRECTORIO, y con el nombre adentro del motivo. Si uno de
  // los dos no se puede mirar, G0 no se mide: medir la mitad y llamarlo cero es
  // exactamente el defecto que este bloque corrige.
  const faltanEnHead =
    cabeza.codigo === 0
      ? DIRS_HERRAMIENTA.filter(
          (d) => correrCallado("git", ["cat-file", "-e", `HEAD:${d}`], { cwd: ESPACIO }).codigo !== 0,
        )
      : [];
  const faltanEnArbol = DIRS_HERRAMIENTA.filter((d) => !existsSync(join(ESPACIO, d)));

  const impedimento =
    raizEspacio === null
      ? "el espacio no es un repositorio de git, así que no hay contra qué comparar"
      : cabeza.codigo !== 0
        ? "el espacio no tiene ningún commit: falta el commit de instalación (paso 3 de la receta)"
        : faltanEnHead.length
          ? `${faltanEnHead.join(" y ")} no está(n) en el commit de instalación: se instaló sin commitear, o se commiteó tarde. G0 se mide sobre ${NOMBRES_DIRS}`
          : faltanEnArbol.length
            ? `${faltanEnArbol.join(" y ")} no existe(n) en el árbol de trabajo: la herramienta no está instalada acá, o está a medias`
            : null;

  if (impedimento) {
    console.log("");
    console.log(`── (c) G0: ediciones a los directorios de instalación (${NOMBRES_DIRS})`);
    console.log(`   NO SE PUDO MEDIR: ${impedimento}`);
    console.log("   «no se pudo medir» NO es «cero ediciones». Va al veredicto como no medido,");
    console.log("   y un criterio no medido cuenta en contra (pre-registro, sección 4).");
    resultados.push({ nombre: "(c) G0", codigo: null, motivo: impedimento });
  } else {
    const indiceTemporal = join(mkdtempSync(join(tmpdir(), "arnes-g0-")), "indice");
    const entorno = { ...process.env, GIT_INDEX_FILE: indiceTemporal };

    const leerArbol = correr("(c.1) G0: índice temporal desde el commit de instalación", "git", ["read-tree", "HEAD"], { cwd: ESPACIO, env: entorno });
    const agregar = correr(`(c.2) G0: estado actual de ${NOMBRES_DIRS} al índice temporal`, "git", ["add", "--all", "--force", "--", ...DIRS_HERRAMIENTA], { cwd: ESPACIO, env: entorno });

    if (leerArbol.codigo !== 0 || agregar.codigo !== 0) {
      const motivo = `no se pudo armar el índice temporal para comparar ${NOMBRES_DIRS}`;
      console.log(`   NO SE PUDO MEDIR: ${motivo}`);
      resultados.push({ nombre: "(c) G0", codigo: null, motivo });
    } else {
      const g0 = correr(`(c.3) G0: ¿difieren ${NOMBRES_DIRS} del commit de instalación?`, "git", ["diff-index", "--cached", "--quiet", "HEAD", "--", ...DIRS_HERRAMIENTA], { cwd: ESPACIO, env: entorno });
      if (g0.codigo !== 0) {
        console.log("");
        console.log("   las ediciones, una por línea (esta lista es la evidencia de G0 en rojo):");
        correr("(c.4) G0: lista de ediciones", "git", ["diff-index", "--cached", "--name-status", "HEAD", "--", ...DIRS_HERRAMIENTA], { cwd: ESPACIO, env: entorno });
      } else {
        console.log("");
        console.log(`   cero ediciones a ${NOMBRES_DIRS} respecto del commit de instalación.`);
        console.log("   Los DOS directorios de la instalación, no solo el núcleo: la edición más");
        console.log("   probable del piloto es el prompt de una skill, y ahí es donde ocurriría.");
        console.log("   Esto SÍ es distinguible de «no se miró»: los impedimentos posibles se");
        console.log("   verificaron antes, directorio por directorio, y ninguno disparó.");
      }
      resultados.push({ nombre: "(c) G0", ...g0 });
    }
  }
}

// ---------------------------------------------------------------------------
// Resumen. No reemplaza el estado: lo repite. Acá no hay `|| true`, no hay un
// echo final que devuelva cero por su cuenta, y ningún código de salida se
// enmascara por el camino. Ese enmascaramiento es la forma exacta en que este
// proyecto ya se compró un falso verde.
// ---------------------------------------------------------------------------
console.log("");
console.log("== resumen ==");
for (const r of resultados) {
  const estado =
    r.noAplica ? "NO APLICA" : r.codigo === 0 ? "0 (verde)" : r.codigo === null ? `NO MEDIDO (${r.motivo})` : `${r.codigo} (rojo)`;
  console.log(`  ${r.nombre}: ${estado}`);
}

const fallaron = resultados.filter((r) => !r.noAplica && r.codigo !== 0);
if (fallaron.length) {
  console.log("");
  console.log(`brazo ${BRAZO}: ${fallaron.length} verificación(es) sin código de salida cero.`);
  console.log("La condición mecánica de la regla de parada (pre-registro, sección 2) NO se cumple.");
  process.exit(1);
}

console.log("");
console.log(`brazo ${BRAZO}: las verificaciones aplicables dieron código de salida cero.`);
console.log("Eso cierra la condición (a) de la regla de parada. La condición (b) es escrita y humana:");
console.log("falta la frase con fecha que nombre los pasos del proceso declarado en la rebanada.");
console.log("Y falta todo G1, G2, G3, G5 y G6, que este arnés no puntúa.");
