#!/usr/bin/env node
// EL CABLEADO DE LA VERIFICACIÓN DE LA CONSTITUCIÓN, leído como YAML y no como texto.
//
// POR QUÉ EXISTE ESTE ARCHIVO. Hasta el 2026-08-20 el marco afirmaba que
// «marco-ci comprueba estáticamente que el consumidor cablee la action». Lo que el
// paso hacía era un `grep -rE 'uses:.*actions/constitucion' .github/workflows`, y una
// auditoría midió CINCO configuraciones donde nada verifica nada y el check sale
// `exit 0` diciendo «la verificación de la constitución está cableada»:
//
//   (a) EL CASO QUE EL PROPIO MARCO REPARTE. Un consumidor con el `ci.yml` del
//       scaffold anterior (sin el job) más `actualizar-marco.yml` tal cual, que
//       invoca la action en modo ESCRIBIR y cuyo encabezado dice, textual, «este
//       workflow no verifica: solo propone el arreglo». Resultado medido: exit 0,
//       cero errores, cero avisos. Circularidad completa declarada sana.
//   (b) un job con `if: false` cableando la action -> exit 0 mudo.
//   (c) la única invocación en un workflow `on: workflow_dispatch`, en modo escribir
//       -> exit 0 mudo. Nadie lo corre en un PR, así que no es una compuerta.
//   (d) la action cableada sólo en `.github/workflows/archivo/viejo.yml`. GitHub
//       Actions NO ejecuta subdirectorios de `.github/workflows` —el runner
//       responde «workflows must be defined at the top level of the
//       .github/workflows/ directory» y la doc de reusables lo dice igual:
//       «subdirectories of the workflows directory are not supported»— pero
//       `grep -r` entra igual -> exit 0 mudo.
//   (e) LA PERILLA: un `plantilla/.github/workflows/ci.yml` vacío y SIN RASTREAR
//       apagaba el check entero en un repo adoptado, porque el skip por «este repo
//       distribuye el marco» se decidía con `test -f`.
//
// Un `grep` de una línea `uses:` no puede distinguir ninguno de los cinco, porque
// los cinco tienen la línea. Lo que separa un cableado de su apariencia es la
// ESTRUCTURA: en qué archivo está, con qué evento corre, con qué modo se invoca, si
// el job está apagado y si el veredicto agregado lo espera. Eso hay que parsearlo.
//
// QUÉ CUENTA COMO CABLEADO, y las cinco condiciones son conjuntas:
//   1. el archivo está en el PRIMER NIVEL de `.github/workflows` (ver (d));
//   2. el workflow corre en `pull_request`, o en `push` a la rama por defecto: una
//      compuerta que no se dispara en el camino del cambio no es una compuerta;
//   3. la invocación está en modo VERIFICAR (el default de la action es
//      `verificar`, así que omitirlo cuenta; `escribir` no, ver (a));
//   4. ni el job ni el paso están apagados por un `if` constante falso (ver (b)),
//      ni tapados con `continue-on-error: true`, que es lo mismo con otro nombre:
//      su rojo no detiene nada;
//   5. el job cuelga del veredicto agregado `ci-ok` por `needs`, directa o
//      transitivamente. Un job verde que nadie espera no bloquea ningún merge, y el
//      marco ya se comió una vez el error simétrico (un ruleset pidiendo un check
//      que en un carril quedaba `skipped` y nunca reportaba).
//
// Y CUANDO NINGUNA INVOCACIÓN CUENTA, cada candidata sale con el motivo exacto por
// el que no cuenta. Eso es lo contrario del verde mudo: antes el caso (a) no
// imprimía una línea, y ahora imprime «la invoca en modo escribir, en un workflow
// que declara no verificar».
//
// EL SKIP DEL DISTRIBUIDOR, ahora como PROPIEDAD POSITIVA y no como ausencia. El
// marco reparte el scaffold y no es consumidor de su propia porción, así que su
// `AGENTS.md` es la constitución DEL MARCO y no hay artefacto que verificar. Pero el
// skip no puede ser «existe un archivo con este nombre»: eso es un botón. Ahora pide
// las tres cosas a la vez —el `plantilla/.github/workflows/ci.yml` está RASTREADO,
// el repo NO está adoptado (no versiona `.projects-valores.json`), y el scaffold que
// reparte CABLEA la verificación con las cinco condiciones de arriba—. Un repo
// adoptado no se apaga agregando un archivo, y un distribuidor que reparte un
// scaffold sin el cableado es rojo en vez de silencio.
//
// LÍMITES DECLARADOS del lector de YAML (está abajo, sin dependencias, porque el
// marco corre con Node pelado y no instala nada en el pipeline de nadie):
//   · Lee el subconjunto que un workflow usa de verdad: mapas y secuencias por
//     sangría, secuencias en flujo (`[a, b]`), mapas en flujo (`{a: b}`), escalares
//     entrecomillados y escalares de bloque (`|`, `>`). No hay anclas, alias,
//     etiquetas ni claves compuestas: si un workflow del área los usara, este
//     lector lo diría en vez de adivinar.
//   · `on` se conserva como la CADENA "on". YAML 1.1 la leería como el booleano
//     `true` (y `yes`/`no` también), que es la razón por la que tantos parsers
//     imprimen `true:` en un workflow. Acá no se convierte a propósito.
//   · El contenido de un escalar de bloque (`run: |`) no se interpreta: es texto
//     opaco. Este check no lee lo que un script hace, y decirlo es mejor que
//     insinuar que sí.
//   · Un cableado que llegue por un workflow reusable de TERCEROS (un `uses:` a
//     nivel de job que adentro invoque la action) no se ve desde acá: haría falta
//     leer otro repositorio. Se declara, no se supone.

import { existsSync, readFileSync, readdirSync, realpathSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

/** El directorio que GitHub Actions ejecuta. Su PRIMER NIVEL, nada más. */
export const DIR_WORKFLOWS = ".github/workflows";

/** El segmento de ruta de la action que verifica la constitución. Se busca el
 *  SEGMENTO y no `@v1` porque la validación contra un consumidor real apunta a la
 *  rama del change antes de que el tag móvil se mueva. */
export const SEGMENTO_ACTION = "actions/constitucion";

/** El nombre del veredicto agregado que el ruleset de `main` exige. Está escrito una
 *  sola vez y acá: es el mismo nombre que el `AGENTS.md` del marco declara como
 *  «único check requerido». */
export const VEREDICTO_AGREGADO = "ci-ok";

/** El scaffold que identifica a un DISTRIBUIDOR del marco. */
export const CI_DEL_SCAFFOLD = "plantilla/.github/workflows/ci.yml";

/** El archivo cuya presencia RASTREADA significa «este repo adoptó la constitución». */
export const VALORES = ".projects-valores.json";

const escaparRegex = (texto) => String(texto).replace(/[.*+?^${}()|[\]\\]/g, (c) => `\\${c}`);

// ---------------------------------------------------------------------------
// Un lector de YAML del subconjunto que usa un workflow
// ---------------------------------------------------------------------------

const ESCALAR_DE_BLOQUE = /^[|>][+-]?\d*$/;

const sangriaDe = (linea) => (String(linea).match(/^ */) ?? [""])[0].length;
const esVacia = (linea) => String(linea).trim() === "";
const esComentario = (linea) => /^ *#/.test(String(linea));

/** Corta el comentario de final de línea sin tocar un `#` que viva dentro de
 *  comillas (un `group: ci-#${{...}}` no es un comentario). */
export function sinComentario(texto) {
  const t = String(texto ?? "");
  let dentro = null;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (dentro === '"') {
      if (c === "\\") i++;
      else if (c === '"') dentro = null;
      continue;
    }
    if (dentro === "'") {
      if (c === "'") dentro = null;
      continue;
    }
    if (c === '"' || c === "'") {
      dentro = c;
      continue;
    }
    if (c === "#" && (i === 0 || /\s/.test(t[i - 1]))) return t.slice(0, i);
  }
  return t;
}

/** Parte `clave: resto` en el primer `:` que NO está entrecomillado y que va seguido
 *  de espacio o de fin de línea. Devuelve null si la línea no es una entrada de mapa:
 *  así un valor con dos puntos (`uses: org/repo@v1`, una URL) no se confunde con una
 *  clave. */
export function partirClave(texto) {
  const t = String(texto ?? "");
  let dentro = null;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (dentro === '"') {
      if (c === "\\") i++;
      else if (c === '"') dentro = null;
      continue;
    }
    if (dentro === "'") {
      if (c === "'") dentro = null;
      continue;
    }
    if (c === '"' || c === "'") {
      dentro = c;
      continue;
    }
    if (c === ":" && (i + 1 >= t.length || /\s/.test(t[i + 1]))) {
      return { clave: t.slice(0, i).trim(), resto: t.slice(i + 1).trim() };
    }
  }
  return null;
}

function desencomillar(valor) {
  const t = String(valor ?? "").trim();
  if (t.length >= 2 && t.startsWith('"') && t.endsWith('"')) {
    return t.slice(1, -1).replace(/\\(.)/g, "$1");
  }
  if (t.length >= 2 && t.startsWith("'") && t.endsWith("'")) {
    return t.slice(1, -1).replace(/''/g, "'");
  }
  return t;
}

/** Escalar plano -> valor de JavaScript. Lo entrecomillado es SIEMPRE cadena: eso es
 *  lo que hace que `if: 'false'` y `if: false` se puedan distinguir arriba si alguna
 *  vez hiciera falta. `on` no se convierte a booleano (ver los límites del encabezado). */
export function escalar(valor) {
  const t = String(valor ?? "").trim();
  if (t.startsWith('"') || t.startsWith("'")) return desencomillar(t);
  if (t === "" || t === "~" || t === "null") return null;
  if (t === "true") return true;
  if (t === "false") return false;
  if (/^-?\d+$/.test(t)) return Number(t);
  return t;
}

/** Parte una colección en flujo por las comas de nivel cero. */
function partirFlujo(texto) {
  const partes = [];
  let actual = "";
  let profundidad = 0;
  let dentro = null;
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (dentro) {
      actual += c;
      if (dentro === '"' && c === "\\") {
        actual += texto[++i] ?? "";
        continue;
      }
      if (c === dentro) dentro = null;
      continue;
    }
    if (c === '"' || c === "'") {
      dentro = c;
      actual += c;
      continue;
    }
    if (c === "[" || c === "{") profundidad++;
    if (c === "]" || c === "}") profundidad--;
    if (c === "," && profundidad === 0) {
      partes.push(actual);
      actual = "";
      continue;
    }
    actual += c;
  }
  if (actual.trim() !== "") partes.push(actual);
  return partes;
}

export function parsearFlujo(texto) {
  const t = String(texto ?? "").trim();
  if (t.startsWith("[")) {
    return partirFlujo(t.slice(1, t.lastIndexOf("]") >= 0 ? t.lastIndexOf("]") : t.length)).map((p) =>
      /^\s*[[{]/.test(p) ? parsearFlujo(p) : escalar(p),
    );
  }
  if (t.startsWith("{")) {
    const mapa = {};
    for (const parte of partirFlujo(t.slice(1, t.lastIndexOf("}") >= 0 ? t.lastIndexOf("}") : t.length))) {
      const kv = partirClave(parte.trim());
      if (kv) mapa[desencomillar(kv.clave)] = /^\s*[[{]/.test(kv.resto) ? parsearFlujo(kv.resto) : escalar(kv.resto);
      else if (parte.trim() !== "") mapa[desencomillar(parte)] = null;
    }
    return mapa;
  }
  return escalar(t);
}

/**
 * Normaliza `- clave: valor` en dos líneas (`-` y la entrada de mapa en la columna
 * que ocupaba), para que ninguna línea sea a la vez ítem de secuencia y entrada de
 * mapa. Es el único truco del lector y ahorra la mitad de sus casos.
 *
 * LÍMITE: una línea así DENTRO de un escalar de bloque también se parte. No cambia
 * la estructura —las dos mitades siguen más sangradas que su clave, así que siguen
 * dentro del bloque— y el contenido de un `run:` no se interpreta en ningún caso.
 */
function normalizarSecuencias(lineas) {
  const salida = [];
  for (const cruda of lineas) {
    const m = String(cruda).match(/^( *)-( +)(\S.*)$/);
    if (m && partirClave(sinComentario(m[3]).trim())) {
      salida.push(`${m[1]}-`);
      salida.push(`${m[1]} ${m[2]}${m[3]}`);
      continue;
    }
    salida.push(cruda);
  }
  return salida;
}

function siguienteUtil(lineas, i) {
  while (i < lineas.length && (esVacia(lineas[i]) || esComentario(lineas[i]))) i++;
  return i;
}

function tomarBloque(lineas, cur, sangriaPadre) {
  const acumulado = [];
  while (cur.i < lineas.length) {
    const linea = lineas[cur.i];
    if (esVacia(linea)) {
      acumulado.push("");
      cur.i++;
      continue;
    }
    if (sangriaDe(linea) <= sangriaPadre) break;
    acumulado.push(linea);
    cur.i++;
  }
  while (acumulado.length > 0 && acumulado[acumulado.length - 1] === "") acumulado.pop();
  const sangrias = acumulado.filter((l) => l.trim() !== "").map(sangriaDe);
  const base = sangrias.length > 0 ? Math.min(...sangrias) : 0;
  return acumulado.map((l) => l.slice(base)).join("\n");
}

function valorDe(lineas, cur, sangriaPadre, resto) {
  if (ESCALAR_DE_BLOQUE.test(resto)) return tomarBloque(lineas, cur, sangriaPadre);
  if (/^[[{]/.test(resto)) {
    // Una colección en flujo puede ocupar varias líneas: se junta hasta equilibrar.
    let texto = resto;
    const equilibrado = (t) => {
      let n = 0;
      let dentro = null;
      for (let i = 0; i < t.length; i++) {
        const c = t[i];
        if (dentro) {
          if (c === dentro) dentro = null;
          continue;
        }
        if (c === '"' || c === "'") dentro = c;
        else if (c === "[" || c === "{") n++;
        else if (c === "]" || c === "}") n--;
      }
      return n <= 0;
    };
    while (!equilibrado(texto) && cur.i < lineas.length) {
      texto += ` ${sinComentario(lineas[cur.i]).trim()}`;
      cur.i++;
    }
    return parsearFlujo(texto);
  }
  if (resto !== "") return escalar(resto);
  const siguiente = siguienteUtil(lineas, cur.i);
  if (siguiente >= lineas.length || sangriaDe(lineas[siguiente]) <= sangriaPadre) return null;
  cur.i = siguiente;
  return parsearNodo(lineas, cur, sangriaPadre + 1);
}

function parsearMapa(lineas, cur, sangria) {
  const mapa = {};
  while (true) {
    cur.i = siguienteUtil(lineas, cur.i);
    if (cur.i >= lineas.length) break;
    const cruda = lineas[cur.i];
    const propia = sangriaDe(cruda);
    if (propia < sangria) break;
    const contenido = sinComentario(cruda).trim();
    if (propia === sangria && /^-( |$)/.test(contenido)) break;
    if (propia > sangria) {
      // Sangría que este lector no esperaba. No se adivina: se salta la línea y el
      // resto del documento se sigue leyendo, que es el lado conservador (una clave
      // de menos hace que el cableado NO cuente, nunca que cuente de más).
      cur.i++;
      continue;
    }
    const kv = partirClave(contenido);
    if (kv === null) {
      cur.i++;
      continue;
    }
    cur.i++;
    mapa[desencomillar(kv.clave)] = valorDe(lineas, cur, sangria, kv.resto);
  }
  return mapa;
}

function parsearSecuencia(lineas, cur, sangria) {
  const lista = [];
  while (true) {
    cur.i = siguienteUtil(lineas, cur.i);
    if (cur.i >= lineas.length) break;
    const cruda = lineas[cur.i];
    if (sangriaDe(cruda) !== sangria) break;
    const contenido = sinComentario(cruda).trim();
    if (!/^-( |$)/.test(contenido)) break;
    const resto = contenido.replace(/^-\s*/, "");
    cur.i++;
    if (resto === "") {
      const siguiente = siguienteUtil(lineas, cur.i);
      if (siguiente < lineas.length && sangriaDe(lineas[siguiente]) > sangria) {
        cur.i = siguiente;
        lista.push(parsearNodo(lineas, cur, sangria + 1));
      } else {
        lista.push(null);
      }
      continue;
    }
    lista.push(/^[[{]/.test(resto) ? parsearFlujo(resto) : escalar(resto));
  }
  return lista;
}

function parsearNodo(lineas, cur, sangria) {
  cur.i = siguienteUtil(lineas, cur.i);
  if (cur.i >= lineas.length) return null;
  const propia = sangriaDe(lineas[cur.i]);
  if (propia < sangria) return null;
  const contenido = sinComentario(lineas[cur.i]).trim();
  if (/^-( |$)/.test(contenido)) return parsearSecuencia(lineas, cur, propia);
  return parsearMapa(lineas, cur, propia);
}

/** Documento -> valor. Nunca tira: un archivo ilegible devuelve `null` y quien lo
 *  llama lo reporta como «no se pudo leer», que es rojo y no verde. */
export function parsearYaml(texto) {
  const lineas = normalizarSecuencias(
    String(texto ?? "")
      .replace(/\r\n?/g, "\n")
      .replace(/\t/g, "  ")
      .split("\n")
      .filter((l) => !/^---\s*$/.test(l) && !/^\.\.\.\s*$/.test(l)),
  );
  try {
    return parsearNodo(lineas, { i: 0 }, 0);
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Las cinco condiciones
// ---------------------------------------------------------------------------

/** ¿La ruta está en el PRIMER NIVEL de `.github/workflows`? Un subdirectorio no
 *  cuenta: GitHub Actions no lo ejecuta («workflows must be defined at the top level
 *  of the .github/workflows/ directory»), y `grep -r` entra igual — que es
 *  exactamente el caso (d) de la auditoría. */
export function esPrimerNivel(ruta) {
  const p = String(ruta ?? "").split("\\").join("/");
  if (!p.startsWith(`${DIR_WORKFLOWS}/`)) return false;
  return !p.slice(DIR_WORKFLOWS.length + 1).includes("/");
}

/** ¿Un `if` que está siempre en falso? `if: false`, `${{ false }}`, `never()`. Lo que
 *  no se reconoce se toma por ENCENDIDO: este check no evalúa expresiones de GitHub,
 *  y equivocarse hacia «está prendido» sólo puede producir un falso verde en el
 *  cableado de alguien que escribió un `if` opaco a propósito. */
export function ifApagado(valor) {
  if (valor === undefined || valor === null) return false;
  if (valor === false) return true;
  let t = String(valor).trim();
  const expr = t.match(/^\$\{\{([\s\S]*)\}\}$/);
  if (expr) t = expr[1].trim();
  t = t.replace(/^['"]|['"]$/g, "").trim();
  return t === "" || /^(false|0|never\(\)|!\s*true)$/i.test(t);
}

const comoLista = (valor) => (valor === null || valor === undefined ? [] : Array.isArray(valor) ? valor : [valor]);

function coincideRama(patron, rama) {
  const p = String(patron ?? "");
  if (p === rama) return true;
  if (!/[*?]/.test(p)) return false;
  const re = new RegExp(`^${p.split("*").map(escaparRegex).join(".*").split("?").join(".")}$`);
  return re.test(rama);
}

/**
 * ¿El workflow corre en el camino del cambio? `pull_request`, o `push` a la rama por
 * defecto. Un `workflow_dispatch` o un `schedule` NO alcanzan: es el caso (c), donde
 * la única invocación vivía en un workflow que nadie dispara en un PR y el check
 * salía verde igual.
 */
export function correEnVerificacion(doc, ramaPorDefecto = "main") {
  const on = doc?.on;
  if (on === null || on === undefined) return { corre: false, porque: "el workflow no declara `on:`" };
  if (typeof on === "string" || Array.isArray(on)) {
    const eventos = comoLista(on).map((e) => String(e));
    if (eventos.includes("pull_request")) return { corre: true, evento: "pull_request" };
    if (eventos.includes("push")) return { corre: true, evento: "push" };
    return { corre: false, porque: `solo corre en ${eventos.join(", ") || "(nada)"}` };
  }
  if (typeof on !== "object") return { corre: false, porque: "el `on:` del workflow no se pudo leer" };
  if ("pull_request" in on) return { corre: true, evento: "pull_request" };
  if ("push" in on) {
    const push = on.push;
    if (push === null || push === undefined) return { corre: true, evento: "push" };
    const ramas = push.branches;
    if (ramas === null || ramas === undefined) return { corre: true, evento: "push" };
    if (comoLista(ramas).some((r) => coincideRama(r, ramaPorDefecto))) return { corre: true, evento: "push" };
    return {
      corre: false,
      porque: `corre en push pero no a la rama por defecto (${ramaPorDefecto}): sus ramas son ${comoLista(ramas).join(", ")}`,
    };
  }
  return { corre: false, porque: `solo corre en ${Object.keys(on).join(", ") || "(nada)"}` };
}

/** La clave del job que es el veredicto agregado. Se acepta por `name` o por la clave
 *  con guiones bajos (el scaffold usa la clave `ci_ok` con `name: ci-ok`). */
export function jobDelVeredicto(jobs) {
  for (const [clave, job] of Object.entries(jobs ?? {})) {
    const nombre = typeof job?.name === "string" ? job.name.trim().toLowerCase() : "";
    if (nombre === VEREDICTO_AGREGADO) return clave;
    if (clave.replace(/_/g, "-").toLowerCase() === VEREDICTO_AGREGADO) return clave;
  }
  return null;
}

/** ¿`desde` depende de `buscado` por `needs`, directa o transitivamente? */
export function dependeDe(jobs, desde, buscado, vistos = new Set()) {
  if (desde === buscado) return true;
  if (vistos.has(desde)) return false;
  vistos.add(desde);
  for (const necesario of comoLista(jobs?.[desde]?.needs)) {
    if (dependeDe(jobs, String(necesario), buscado, vistos)) return true;
  }
  return false;
}

/** ¿Este `uses:` nombra la action de la constitución? Se compara por segmento de
 *  ruta, así que sirve igual con `@v1`, con un SHA o apuntando a la rama de un
 *  change. GitHub PROHÍBE expresiones en `uses`, así que la referencia es literal. */
export function mencionaLaAction(uses) {
  const patron = new RegExp(`(^|[^A-Za-z0-9_-])${escaparRegex(SEGMENTO_ACTION)}([^A-Za-z0-9_-]|$)`);
  return patron.test(String(uses ?? ""));
}

/** La ref con la que se resolvió un `uses:` (lo que va después del último `@`). */
export function refDe(uses) {
  const t = String(uses ?? "");
  const corte = t.lastIndexOf("@");
  return corte >= 0 ? t.slice(corte + 1) : "";
}

/** ¿Es el tag MÓVIL del marco (`v1`)? Con el tag móvil el consumidor corre siempre la
 *  copia más nueva, así que no hay pin que explique un artefacto más nuevo que ella. */
export function esTagMovil(ref) {
  return /^v\d+$/.test(String(ref ?? "").trim());
}

/**
 * Todas las invocaciones de la action que aparecen en los workflows, cada una con su
 * veredicto y —si no cuenta— con el motivo exacto. Se recorren TODOS los archivos,
 * subdirectorios incluidos, justamente para poder decir «esto está donde GitHub no
 * lo mira» en vez de no verlo.
 */
export function invocacionesDe(archivos, ramaPorDefecto = "main") {
  const encontradas = [];
  for (const archivo of archivos ?? []) {
    const doc = parsearYaml(archivo.texto);
    const primerNivel = esPrimerNivel(archivo.ruta);
    const disparo = doc === null ? { corre: false, porque: "el archivo no se pudo leer como YAML" } : correEnVerificacion(doc, ramaPorDefecto);
    const jobs = doc && typeof doc.jobs === "object" && doc.jobs !== null ? doc.jobs : {};
    const veredicto = jobDelVeredicto(jobs);
    for (const [clave, job] of Object.entries(jobs)) {
      const pasos = Array.isArray(job?.steps) ? job.steps : [];
      for (const [indice, paso] of pasos.entries()) {
        if (!mencionaLaAction(paso?.uses)) continue;
        const modo = paso?.with?.modo === undefined || paso?.with?.modo === null ? "verificar" : String(paso.with.modo).trim();
        const motivos = [];
        if (!primerNivel) {
          motivos.push(
            `está en ${archivo.ruta}, que es un subdirectorio de ${DIR_WORKFLOWS}: GitHub Actions sólo ejecuta el primer nivel de ese directorio, así que ese archivo nunca corre`,
          );
        }
        if (!disparo.corre) motivos.push(disparo.porque);
        if (modo !== "verificar") motivos.push(`la invoca en modo "${modo}": escribir el artefacto no es verificarlo`);
        if (ifApagado(job?.if)) motivos.push(`el job "${clave}" esta apagado por su if (${JSON.stringify(job.if)})`);
        if (ifApagado(paso?.if)) motivos.push(`el paso esta apagado por su if (${JSON.stringify(paso.if)})`);
        if (job?.["continue-on-error"] === true) {
          motivos.push(`el job "${clave}" lleva continue-on-error: true, asi que su rojo no detiene nada`);
        }
        if (paso?.["continue-on-error"] === true) {
          motivos.push("el paso lleva continue-on-error: true, asi que su rojo no detiene nada");
        }
        if (veredicto === null) {
          motivos.push(
            `este workflow no tiene el veredicto agregado "${VEREDICTO_AGREGADO}", así que ningún check requerido espera al job "${clave}"`,
          );
        } else if (!dependeDe(jobs, veredicto, clave)) {
          motivos.push(
            `"${VEREDICTO_AGREGADO}" no depende de "${clave}" por needs (ni directa ni transitivamente): un job verde que nadie espera no bloquea ningún merge`,
          );
        }
        encontradas.push({
          ruta: archivo.ruta,
          job: clave,
          paso: indice + 1,
          uses: String(paso.uses),
          ref: refDe(paso.uses),
          modo,
          motivos,
          cuenta: motivos.length === 0,
        });
      }
    }
  }
  return encontradas;
}

// ---------------------------------------------------------------------------
// El veredicto
// ---------------------------------------------------------------------------

/**
 * El veredicto sobre el cableado del consumidor.
 *
 * LA ASIMETRÍA, que reemplaza a la ventana de gracia que este check no puede leer
 * (el calendario vive en el manifiesto del canónico, que viaja con la action):
 *   · repo que NO versiona `.projects-valores.json` -> ::warning::. Todavía no adoptó;
 *     el rojo por no haber adoptado es del PR de migración, no de un check nuevo.
 *   · repo que SÍ lo versiona y no tiene un cableado que cuente -> ::error::. Tiene
 *     la maquinaria y se saltea el check.
 * Y en los dos casos las candidatas que NO cuentan salen con su motivo: el pecado
 * del paso anterior no era el color, era el silencio.
 */
export function evaluarCableado({ archivos, adopto, distribuye, scaffoldCablea, ramaPorDefecto = "main" }) {
  const hallazgos = [];
  const invocaciones = invocacionesDe(archivos, ramaPorDefecto);

  if (distribuye) {
    // EL SKIP DEL DISTRIBUIDOR, como propiedad positiva. Ver el encabezado: son tres
    // condiciones, y `distribuye` ya trae la de «rastreado».
    if (adopto) {
      hallazgos.push({
        nivel: "notice",
        codigo: "distribuye-y-adopto",
        mensaje: `este repo distribuye el scaffold (${CI_DEL_SCAFFOLD} rastreado) y ADEMAS versiona ${VALORES}: es consumidor de su propia porcion, asi que el skip del distribuidor no aplica y el cableado se verifica igual`,
      });
    } else if (!scaffoldCablea.cablea) {
      hallazgos.push({
        nivel: "error",
        codigo: "scaffold-sin-cableado",
        mensaje: `este repo distribuye ${CI_DEL_SCAFFOLD} y ese scaffold NO cablea la verificacion de la constitucion: ${scaffoldCablea.porque}. Reparte a cada adopcion nueva un CI donde nada verifica que las reglas que leen sus agentes sean las que el marco publica, y el skip de este check se apoya justamente en que el scaffold si las cablee`,
      });
      return { hallazgos, estado: "rojo", invocaciones };
    } else {
      hallazgos.push({
        nivel: "notice",
        codigo: "distribuye-el-marco",
        mensaje: `este repo distribuye el marco (${CI_DEL_SCAFFOLD} rastreado, con la verificacion cableada en su job "${scaffoldCablea.job}") y no versiona ${VALORES}: no es consumidor de su propia porcion, asi que no hay artefacto que verificar aca`,
      });
      return { hallazgos, estado: "al-dia", invocaciones };
    }
  }

  if ((archivos ?? []).length === 0) {
    hallazgos.push({
      nivel: "error",
      codigo: "sin-workflows",
      mensaje: `el repo no tiene archivos en ${DIR_WORKFLOWS}: no hay donde cablear la verificacion de la constitucion`,
    });
    return { hallazgos, estado: "rojo", invocaciones };
  }

  const validas = invocaciones.filter((i) => i.cuenta);

  // Las que NO cuentan se imprimen SIEMPRE, también cuando hay una válida: una
  // invocación muerta al lado de una viva es la que va a quedar el día que alguien
  // borre la viva creyendo que la otra cubre.
  for (const invocacion of invocaciones.filter((i) => !i.cuenta)) {
    hallazgos.push({
      nivel: validas.length > 0 ? "notice" : "warning",
      codigo: "invocacion-que-no-cuenta",
      mensaje: `${invocacion.ruta} (job "${invocacion.job}", paso ${invocacion.paso}) nombra ${SEGMENTO_ACTION} y NO cuenta como cableado: ${invocacion.motivos.join("; ")}`,
    });
  }

  if (validas.length > 0) {
    if (!adopto) {
      hallazgos.push({
        nivel: "warning",
        codigo: "cableado-sin-valores",
        mensaje: `este repo cablea la verificacion de la constitucion (${validas[0].ruta}, job "${validas[0].job}") y no versiona ${VALORES}, asi que el job va a decir que falta y no va a poder renderizar nada. Arreglo: declara los valores de este proyecto en ${VALORES}`,
      });
    }
    hallazgos.push({
      nivel: "notice",
      codigo: "cableado-verificado",
      mensaje: `la verificacion de la constitucion corre en ${validas.map((v) => `${v.ruta}#${v.job}`).join(", ")}: modo verificar, en el primer nivel de ${DIR_WORKFLOWS}, disparada en el camino del cambio y esperada por "${VEREDICTO_AGREGADO}"`,
    });
    return { hallazgos, estado: hallazgos.some((h) => h.nivel === "warning") ? "aviso" : "al-dia", invocaciones };
  }

  const comun = `el artefacto puede faltar, estar atrasado, estar editado a mano o no estar cargado por ninguna superficie, y nada lo pondría en rojo. Arreglo: pegá el job que este paso imprime abajo en ${DIR_WORKFLOWS}/ci.yml y agregalo al needs de "${VEREDICTO_AGREGADO}"`;
  if (adopto) {
    hallazgos.push({
      nivel: "error",
      codigo: "sin-cableado",
      mensaje: `este repo versiona ${VALORES} -o sea que ADOPTO la constitucion del marco- y ninguna invocacion de ${SEGMENTO_ACTION} cuenta como verificacion${invocaciones.length > 0 ? " (hay " + invocaciones.length + ", con sus motivos arriba)" : ""}: ${comun}`,
    });
    return { hallazgos, estado: "rojo", invocaciones };
  }
  hallazgos.push({
    nivel: "warning",
    codigo: "sin-cableado",
    mensaje: `este repo no cablea la verificacion de la constitucion del marco en ningun flujo y todavia no versiona ${VALORES}, asi que sus agentes trabajan sin las reglas del area y nada lo delata en la sesion. Es AVISO y no fallo porque adoptar la constitucion es un PR de migracion; lo que no hace es callarse y declararlo sano`,
  });
  return { hallazgos, estado: "aviso", invocaciones };
}

/** El job listo para pegar, que es lo que el mensaje de fallo promete. */
export const JOB_SUGERIDO = [
  "  constitucion:",
  "    name: constitucion",
  "    runs-on: ubuntu-latest",
  "    permissions:",
  "      contents: read",
  "    steps:",
  "      - uses: actions/checkout@v7",
  "      - uses: actions/setup-node@v7",
  '        with: { node-version: "22" }',
  `      - uses: im-diego-ec/Projects/${SEGMENTO_ACTION}@v1`,
  "        with:",
  "          modo: verificar",
  "",
  `  # y en el veredicto agregado:  needs: [..., constitucion]`,
];

// ---------------------------------------------------------------------------
// Entrada/salida
// ---------------------------------------------------------------------------

/** Todos los `.yml`/`.yaml` bajo `.github/workflows`, subdirectorios INCLUIDOS: los
 *  de subdirectorio se leen para poder decir que no cuentan. */
export function leerWorkflows(raiz) {
  const base = join(raiz, ...DIR_WORKFLOWS.split("/"));
  if (!existsSync(base)) return [];
  const archivos = [];
  const recorrer = (dir) => {
    for (const entrada of readdirSync(dir, { withFileTypes: true })) {
      const completa = join(dir, entrada.name);
      if (entrada.isDirectory()) {
        recorrer(completa);
        continue;
      }
      if (!/\.ya?ml$/i.test(entrada.name)) continue;
      archivos.push({
        ruta: relative(raiz, completa).split("\\").join("/"),
        texto: readFileSync(completa, "utf8"),
      });
    }
  };
  recorrer(base);
  return archivos.sort((a, b) => a.ruta.localeCompare(b.ruta));
}

/** ¿Git RASTREA este archivo? Lo rastreado es el universo, igual que en el resto de
 *  los guardrails: un archivo sin versionar no lo ve nadie más que la máquina donde
 *  se escribió, y era exactamente la perilla del caso (e). */
export function rastreado(raiz, ruta) {
  const r = spawnSync("git", ["ls-files", "--error-unmatch", "--", ruta], {
    cwd: raiz,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  return r.status === 0;
}

/** ¿El scaffold que este repo reparte cablea la verificación? Se lee el
 *  `plantilla/.github/workflows/*.yml` como si fuera el `.github/workflows/` de un
 *  consumidor, porque es exactamente lo que va a ser. */
export function revisarScaffold(raiz, ramaPorDefecto = "main") {
  const base = join(raiz, "plantilla", ...DIR_WORKFLOWS.split("/"));
  if (!existsSync(base)) return { cablea: false, porque: `no existe plantilla/${DIR_WORKFLOWS}` };
  const archivos = [];
  for (const entrada of readdirSync(base, { withFileTypes: true })) {
    if (!entrada.isFile() || !/\.ya?ml$/i.test(entrada.name)) continue;
    archivos.push({
      ruta: `${DIR_WORKFLOWS}/${entrada.name}`,
      texto: readFileSync(join(base, entrada.name), "utf8"),
    });
  }
  const invocaciones = invocacionesDe(archivos, ramaPorDefecto);
  const valida = invocaciones.find((i) => i.cuenta);
  if (valida) return { cablea: true, job: valida.job, archivo: valida.ruta };
  if (invocaciones.length === 0) {
    return { cablea: false, porque: `ningun workflow del scaffold invoca ${SEGMENTO_ACTION}` };
  }
  return { cablea: false, porque: invocaciones.map((i) => `${i.ruta}#${i.job}: ${i.motivos.join("; ")}`).join(" | ") };
}

function emitir(hallazgo) {
  console.log(`::${hallazgo.nivel}::${String(hallazgo.mensaje).replace(/\r?\n/g, " · ")}`);
}

/** Punto de entrada del modo `cableado`. Devuelve el código de salida. */
export function main(env = process.env) {
  const raiz = resolve(env.CONSTITUCION_RAIZ || process.cwd());
  const ramaPorDefecto = (env.CONSTITUCION_RAMA_POR_DEFECTO || "main").trim() || "main";

  const adopto = rastreado(raiz, VALORES);
  const distribuye = rastreado(raiz, CI_DEL_SCAFFOLD);
  const scaffoldCablea = distribuye ? revisarScaffold(raiz, ramaPorDefecto) : { cablea: false, porque: "no distribuye" };

  const resultado = evaluarCableado({
    archivos: leerWorkflows(raiz),
    adopto,
    distribuye,
    scaffoldCablea,
    ramaPorDefecto,
  });

  for (const hallazgo of resultado.hallazgos) emitir(hallazgo);

  if (resultado.estado === "rojo") {
    console.log("== job a agregar ==");
    for (const linea of JOB_SUGERIDO) console.log(linea);
    return 1;
  }
  return 0;
}

const esteArchivo = realpathSync(fileURLToPath(import.meta.url));
const invocado = process.argv[1] ? realpathSync(process.argv[1]) : "";
if (esteArchivo === invocado) process.exit(main(process.env));
