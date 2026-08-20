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
//       .github/workflows/ directory» y la doc de reusables lo dice igual—, pero
//       `grep -r` entra igual -> exit 0 mudo.
//   (e) LA PERILLA: un `plantilla/.github/workflows/ci.yml` vacío y SIN RASTREAR
//       apagaba el check entero en un repo adoptado, porque el skip por «este repo
//       distribuye el marco» se decidía con `test -f`.
//
// LA SEGUNDA RONDA, y es la que explica la forma de este archivo. El reemplazo de
// arriba —cinco condiciones, parseando YAML— se declaró «clase cerrada» y el refutador
// encontró la MISMA clase una ortografía más adentro, en minutos. Veinte
// configuraciones más, todas `exit 0` y todas MUDAS:
//
//   1. LOS FILTROS DE DISPARO NO SE MIRABAN. La condición estaba escrita como «la
//      clave `pull_request` aparece en `on:`». Con eso pasaban `paths-ignore: ['**']`
//      (el workflow no corre nunca), `paths-ignore` con exactamente los archivos que
//      este check protege, `paths: [docs/**]`, `branches: [gh-pages]` y
//      `types: [closed]`. Era además una asimetría del propio código: de `push` sí se
//      comparaba `branches` y de `pull_request` no se miraba nada.
//   2. `continue-on-error` se comparaba con identidad estricta contra `true`, así que
//      `${{ true }}` y `"true"` —que el lector de YAML devuelve como CADENA— tapaban
//      el rojo sin que el check dijera nada.
//   3. LA QUINTA CONDICIÓN MEDÍA LA ARISTA DEL `needs`, NO QUE EL ROJO BLOQUEE. Es la
//      refutación más profunda de las siete, porque la propiedad estaba mal elegida.
//   4. la perilla del rastreo seguía enchufada un archivo más allá: `leerWorkflows` y
//      `revisarScaffold` leían el directorio con `readdirSync`, así que un `zz.yml`
//      SIN RASTREAR compraba el cableado (exit 1 -> exit 0) y el notice encima mentía
//      diciendo que el cableado estaba en `ci.yml`.
//
// ASÍ QUE ACÁ NO SE CIERRAN CASOS. Cada condición de abajo se derivó de la referencia
// de GitHub Actions —no de los fixtures— y la referencia está citada donde se usó:
//
// QUÉ CUENTA COMO CABLEADO, y las cinco condiciones son conjuntas:
//   1. el archivo está RASTREADO por git y en el PRIMER NIVEL de `.github/workflows`
//      (ver (d) y (e)): lo que git no ve no existe para nadie más que la máquina donde
//      se escribió, y un subdirectorio no lo ejecuta GitHub;
//   2. el workflow SE DISPARA en el camino del cambio. No es «nombra pull_request»:
//      es que ninguno de los filtros que la referencia de eventos permite
//      —`types`, `branches`, `branches-ignore`, `paths`, `paths-ignore`, `tags`— lo
//      saque de ese camino. Ver `correEnVerificacion`;
//   3. la invocación está en modo VERIFICAR (el default de la action es `verificar`,
//      así que omitirlo cuenta; `escribir` no, ver (a));
//   4. ni el job ni el paso están apagados por un `if` constante falso (ver (b)), ni
//      tapados por un `continue-on-error` que no se pueda demostrar FALSO, ni colgados
//      de un job que nunca corre;
//   5. UN ROJO DE ESE JOB IMPIDE QUE EL VEREDICTO AGREGADO SALGA VERDE. No que exista
//      una arista de `needs`: que el rojo llegue. Ver `vigilaElResultado`.
//
// LA CONDICIÓN 5, Y POR QUÉ LA ANTERIOR ESTABA MAL ELEGIDA. La doc de checks
// requeridos de GitHub dice, sobre un job salteado por un condicional: «the job
// reports Success» y «may not block merging». Consecuencias, las dos contraintuitivas:
//   · `ci-ok` con `needs: [constitucion]` y SIN `if: always()` se SALTEA cuando la
//     constitución falla, y un salteado reporta Success: el check requerido sale verde
//     con la compuerta en rojo. El `needs` solo, entonces, no bloquea NADA.
//   · con `if: always()` el veredicto sí corre, y por eso tiene que MIRAR el
//     resultado: `always()` sin mirar es peor que no tener `always()`, porque produce
//     un verde activo en vez de una ausencia.
// Por eso la condición pide las dos mitades: que el veredicto corra aunque su
// dependencia falle, y que consulte el resultado de la dependencia que lleva a la
// compuerta. Es también la razón por la que un `if` opaco sobre el job de la
// constitución no necesita adivinarse acá: si ese `if` lo saltea, el resultado que el
// veredicto lee es `skipped`, y un veredicto que compara contra `success` lo cobra.
//
// EL RESIDUO IRREDUCIBLE, declarado y no escondido: este check lee que el veredicto
// CONSULTA el resultado, no lo que su script hace con el valor. Un `run:` que lea
// `needs.constitucion.result`, lo imprima y salga 0 pasaría. Cerrarlo exigiría decidir
// el comportamiento de un script de shell arbitrario, que no es decidible; la salida
// estructural sería que el veredicto lo emita el marco (otra action) en vez de cada
// consumidor en su `run:`, y eso es un change, no un parche de este archivo.
//
// EL SKIP DEL DISTRIBUIDOR, como PROPIEDAD POSITIVA y no como ausencia. El marco
// reparte el scaffold y no es consumidor de su propia porción, así que su `AGENTS.md`
// es la constitución DEL MARCO y no hay artefacto que verificar. El skip pide las tres
// cosas a la vez: el `plantilla/.github/workflows/ci.yml` está RASTREADO, el repo NO
// está adoptado (no versiona `.projects-valores.json`), y el scaffold que reparte CABLEA
// la verificación con las cinco condiciones de arriba. Un repo adoptado no se apaga
// agregando un archivo, y un distribuidor que reparte un scaffold sin el cableado es
// rojo en vez de silencio.
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
//   · El contenido de un escalar de bloque (`run: |`) no se interpreta como YAML: es
//     texto opaco. La condición 5 sí BUSCA una referencia dentro de ese texto, que es
//     distinto de interpretarlo.
//   · Un cableado que llegue por un workflow reusable de TERCEROS (un `uses:` a
//     nivel de job que adentro invoque la action) no se ve desde acá: haría falta
//     leer otro repositorio. Se declara, no se supone.
//   · `pull_request_target` NO cuenta como disparo válido: corre contra el código de
//     la rama base, así que verificaría el artefacto de la base y no el del cambio.

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

/**
 * Los tipos de actividad de `pull_request` que la compuerta NECESITA para existir en
 * cada SHA que se va a mergear: `opened` (el PR nace) y `synchronize` (la cabeza se
 * mueve). El default de GitHub es `[opened, synchronize, reopened]`; declarar `types`
 * REEMPLAZA ese default, así que un `types: [closed]` deja la compuerta sin correr
 * nunca antes del merge y un `types: [opened]` la deja sin correr sobre el segundo
 * push. `reopened` no hace falta: los check runs viven pegados al SHA, y reabrir un PR
 * no le cambia la cabeza.
 */
export const TIPOS_NECESARIOS = ["opened", "synchronize"];

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

/**
 * Escalar plano -> valor de JavaScript. Lo entrecomillado es SIEMPRE cadena, y eso NO
 * es cosmético: la referencia de expresiones dice que al castear a booleano «falsy
 * values (false, 0, -0, "", '', null) are coerced to false and truthy (true and other
 * non-falsy values) are coerced to true», así que la cadena `"false"` —no vacía— vale
 * TRUE para GitHub. `tapaElRojo` se apoya en esa distinción. `on` no se convierte a
 * booleano (ver los límites del encabezado).
 */
export function escalar(valor) {
  const t = String(valor ?? "").trim();
  if (t.startsWith('"') || t.startsWith("'")) return desencomillar(t);
  if (t === "" || t === "~" || t === "null") return null;
  if (t === "true") return true;
  if (t === "false") return false;
  if (/^-?\d+$/.test(t)) return Number(t);
  return t;
}

/**
 * Guarda `clave: resto` en un mapa CONSERVANDO si el escalar venía entrecomillado.
 * Es una propiedad no enumerable al lado, así que nada que recorra el mapa la ve, y
 * `tapaElRojo` puede distinguir el booleano `false` de la cadena `"false"` —que para
 * GitHub vale TRUE por no estar vacía—. Lo usan las DOS formas de mapa, por sangría y
 * en flujo: si viviera en una sola, la otra sería el próximo agujero.
 */
function guardar(mapa, clave, resto, valor) {
  mapa[clave] = valor;
  if (/^["']/.test(String(resto ?? "").trim())) {
    Object.defineProperty(mapa, `${clave} entrecomillado`, { value: true, enumerable: false });
  }
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
      if (kv) {
        guardar(
          mapa,
          desencomillar(kv.clave),
          kv.resto,
          /^\s*[[{]/.test(kv.resto) ? parsearFlujo(kv.resto) : escalar(kv.resto),
        );
      } else if (parte.trim() !== "") mapa[desencomillar(parte)] = null;
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
    // `guardar` y no una asignacion pelada: `continue-on-error: "false"` y
    // `continue-on-error: false` son cosas DISTINTAS para GitHub.
    guardar(mapa, desencomillar(kv.clave), kv.resto, valorDe(lineas, cur, sangria, kv.resto));
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

/** ¿La clave venía con su escalar ENTRECOMILLADO? (ver `parsearMapa`). */
const vinoEntrecomillado = (mapa, clave) =>
  mapa !== null && typeof mapa === "object" && `${clave} entrecomillado` in mapa;

// ---------------------------------------------------------------------------
// Los patrones de filtro, como los define la hoja de referencia de GitHub
// ---------------------------------------------------------------------------

/**
 * Un patrón de filtro de GitHub Actions -> expresión regular anclada.
 *
 * DERIVADO de la «filter pattern cheat sheet», fila por fila, y no de los ejemplos que
 * trajo la refutación. Las dos filas que sorprenden son las que un matcher casero
 * siempre se come:
 *   · `*`  «matches zero or more characters, but does not match the / character»;
 *   · `**` «matches zero or more of any character»;
 *   · `?`  «matches zero or one of the PRECEDING character» — no es un comodín de un
 *          carácter, es un CUANTIFICADOR: `ma?in` matchea `main` y `min`;
 *   · `+`  «matches one or more of the preceding character»;
 *   · `[]` «matches one alphanumeric character listed in the brackets or included in
 *          ranges»;
 *   · `\`  escapa el carácter especial que sigue, para un match literal.
 * `!` no se trata acá: es de la LISTA, no del patrón, y lo resuelve `admiteRama`.
 */
export function patronARegex(patron) {
  const t = String(patron ?? "");
  const atomos = [];
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (c === "\\") {
      atomos.push(escaparRegex(t[++i] ?? "\\"));
      continue;
    }
    if (c === "*") {
      if (t[i + 1] === "*") {
        i++;
        atomos.push("[\\s\\S]*");
      } else {
        atomos.push("[^/]*");
      }
      continue;
    }
    if (c === "?" || c === "+") {
      // Cuantifica el átomo ANTERIOR. Sin átomo previo no hay nada que cuantificar y
      // se toma literal, que es el lado conservador.
      if (atomos.length === 0) {
        atomos.push(escaparRegex(c));
        continue;
      }
      atomos.push(`{${c === "?" ? "0,1" : "1,"}}`);
      const cuantificador = atomos.pop();
      const previo = atomos.pop();
      atomos.push(`(?:${previo})${cuantificador}`);
      continue;
    }
    if (c === "[") {
      const cierre = t.indexOf("]", i + 1);
      if (cierre > i) {
        atomos.push(`[${t.slice(i + 1, cierre)}]`);
        i = cierre;
        continue;
      }
      atomos.push("\\[");
      continue;
    }
    atomos.push(escaparRegex(c));
  }
  return new RegExp(`^${atomos.join("")}$`);
}

/** ¿Este patrón matchea este valor (nombre de rama, de tag o ruta de archivo)? */
export function patronCoincide(patron, valor) {
  try {
    return patronARegex(patron).test(String(valor ?? ""));
  } catch {
    // Un patrón que no compila no se declara coincidente: quien llama lo reporta.
    return false;
  }
}

const comoLista = (valor) => (valor === null || valor === undefined ? [] : Array.isArray(valor) ? valor : [valor]);

/**
 * ¿La lista de patrones ADMITE este valor? Implementa la regla de orden tal como está
 * escrita: «a matching negative pattern (prefixed with !) after a positive match will
 * exclude the path. A matching positive pattern after a negative match will include
 * the path again».
 *
 * Y el caso que la regla no nombra: una lista de PUROS negativos no tiene ninguna
 * coincidencia positiva que excluir, así que se comporta como una lista de exclusión
 * (admite todo lo que no matchee). Es la misma función que sirve para `branches` y
 * para `branches-ignore`: la segunda se pregunta al revés.
 */
export function admiteRama(patrones, valor) {
  const lista = comoLista(patrones).map((p) => String(p));
  if (lista.length === 0) return true;
  let admitido = lista.some((p) => !p.startsWith("!")) ? false : true;
  for (const p of lista) {
    const negativo = p.startsWith("!");
    if (patronCoincide(negativo ? p.slice(1) : p, valor)) admitido = !negativo;
  }
  return admitido;
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
 *  no se reconoce se toma por ENCENDIDO, y eso NO es un fail-open: si un `if` opaco
 *  saltea el job, el resultado que el veredicto agregado lee es `skipped`, y la
 *  condición 5 exige que el veredicto lo mire. La indecidibilidad estática de una
 *  expresión de GitHub la cobra el runtime. */
export function ifApagado(valor) {
  if (valor === undefined || valor === null) return false;
  if (valor === false) return true;
  let t = String(valor).trim();
  const expr = t.match(/^\$\{\{([\s\S]*)\}\}$/);
  if (expr) t = expr[1].trim();
  t = t.replace(/^['"]|['"]$/g, "").trim();
  return t === "" || /^(false|0|never\(\)|!\s*true)$/i.test(t);
}

/**
 * ¿Este `continue-on-error` TAPA el rojo? La pregunta se hace al revés que en la ronda
 * anterior, y ahí está el arreglo: no es «¿vale exactamente `true`?» sino «¿se puede
 * DEMOSTRAR que vale falso?». Todo lo demás tapa.
 *
 * Deriva de dos filas de la referencia: el campo acepta «boolean or expression», y al
 * castear a booleano «falsy values (false, 0, -0, "", '', null) are coerced to false y
 * truthy (true and other non-falsy values) are coerced to true». O sea que la CADENA
 * `"false"`, por no estar vacía, vale TRUE — y por eso el veredicto necesita saber si
 * el escalar venía entrecomillado. Una expresión que este check no puede evaluar
 * (`${{ vars.X }}`, `${{ fromJSON(env.y) }}`) tapa por definición: no se puede
 * demostrar falsa, y un fail-open silencioso acá es indistinguible de que la compuerta
 * no exista.
 */
export function tapaElRojo(valor, { entrecomillado = false } = {}) {
  if (valor === undefined || valor === null) return false;
  if (valor === false) return false;
  if (valor === true) return true;
  if (typeof valor === "number") return valor !== 0;
  let t = String(valor).trim();
  if (entrecomillado) return t !== "";
  const expr = t.match(/^\$\{\{([\s\S]*)\}\}$/);
  if (expr) t = expr[1].trim();
  const desnudo = t.replace(/^['"]|['"]$/g, "").trim();
  // Entrecomillado DENTRO de la expresión: sigue siendo una cadena para GitHub.
  if (/^['"]/.test(t)) return desnudo !== "";
  if (desnudo === "") return false;
  if (/^(false|0|!\s*true|never\(\))$/i.test(desnudo)) return false;
  return true;
}

/** El `continue-on-error` de un mapa (job o paso), respetando el entrecomillado. */
function tapaElRojoEn(mapa) {
  if (mapa === null || typeof mapa !== "object") return false;
  return tapaElRojo(mapa["continue-on-error"], {
    entrecomillado: vinoEntrecomillado(mapa, "continue-on-error"),
  });
}

/**
 * ¿El workflow SE DISPARA en el camino del cambio?
 *
 * Se evalúa evento por evento y con TODOS los filtros que la referencia de eventos
 * permite para cada uno, porque la refutación de la ronda 2 fue exactamente esto: la
 * condición decía «la clave `pull_request` aparece en `on:`» y con eso pasaban cinco
 * configuraciones que no corren nunca. La tabla de la referencia:
 *   · `pull_request`: `types`, `branches`/`branches-ignore` (filtran la rama BASE),
 *     `paths`/`paths-ignore`. NO acepta `tags`.
 *   · `push`: `branches`/`branches-ignore`, `tags`/`tags-ignore`,
 *     `paths`/`paths-ignore`.
 * Y la referencia agrega que `branches` y `branches-ignore` no se pueden usar juntos
 * para el mismo evento (idem `paths`/`paths-ignore`): una config así no se adivina.
 *
 * POR QUÉ CUALQUIER FILTRO DE `paths` DESCALIFICA, y es más estricto que preguntar si
 * los archivos protegidos matchean. Esta compuerta no se dispara solo cuando alguien
 * EDITA el artefacto: el artefacto vence por FECHA (`exigible_desde`), así que un PR
 * que no toca ningún archivo de la constitución es exactamente uno donde el rojo tiene
 * que aparecer igual. Y hay una segunda razón, que es una regla del propio marco: el
 * check requerido es el veredicto agregado, y un workflow filtrado por `paths` no
 * reporta en los PRs que saltea — que es el error que ya costó una semana de ruleset
 * esperando una señal que no llegaba. Ningún filtro de rutas puede demostrarse seguro
 * acá, así que ninguno cuenta.
 */
export function correEnVerificacion(doc, ramaPorDefecto = "main") {
  const on = doc?.on;
  if (on === null || on === undefined) return { corre: false, porque: "el workflow no declara `on:`" };

  if (typeof on === "string" || Array.isArray(on)) {
    // La forma de lista o de cadena no admite filtros: si el evento está, corre.
    const eventos = comoLista(on).map((e) => String(e));
    if (eventos.includes("pull_request")) return { corre: true, evento: "pull_request" };
    if (eventos.includes("push")) return { corre: true, evento: "push" };
    return { corre: false, porque: `solo corre en ${eventos.join(", ") || "(nada)"}` };
  }
  if (typeof on !== "object") return { corre: false, porque: "el `on:` del workflow no se pudo leer" };

  const motivos = [];
  if ("pull_request" in on) {
    const veredicto = evaluarPullRequest(on.pull_request, ramaPorDefecto);
    if (veredicto.corre) return { corre: true, evento: "pull_request" };
    motivos.push(`en pull_request ${veredicto.porque}`);
  }
  if ("push" in on) {
    const veredicto = evaluarPush(on.push, ramaPorDefecto);
    if (veredicto.corre) return { corre: true, evento: "push" };
    motivos.push(`en push ${veredicto.porque}`);
  }
  if (motivos.length > 0) return { corre: false, porque: motivos.join("; y ") };
  return { corre: false, porque: `solo corre en ${Object.keys(on).join(", ") || "(nada)"}` };
}

function filtroDeRutas(cfg) {
  for (const clave of ["paths", "paths-ignore"]) {
    if (clave in cfg) {
      return `declara ${clave}: ${JSON.stringify(comoLista(cfg[clave]))}, y un filtro de rutas saca a la compuerta de los PRs que no tocan esos archivos — pero el artefacto de la constitucion vence por FECHA, no por edicion, y encima un workflow filtrado no reporta el check requerido en los PRs que saltea`;
    }
  }
  return null;
}

function filtroDeRamas(cfg, ramaPorDefecto, evento) {
  if ("branches" in cfg && "branches-ignore" in cfg) {
    return `declara branches y branches-ignore a la vez para ${evento}, que la referencia no permite: no se adivina cual gana`;
  }
  if ("branches" in cfg && !admiteRama(cfg.branches, ramaPorDefecto)) {
    return `branches ${JSON.stringify(comoLista(cfg.branches))} no admite la rama por defecto (${ramaPorDefecto})`;
  }
  if ("branches-ignore" in cfg && admiteRama(cfg["branches-ignore"], ramaPorDefecto)) {
    return `branches-ignore ${JSON.stringify(comoLista(cfg["branches-ignore"]))} excluye la rama por defecto (${ramaPorDefecto})`;
  }
  return null;
}

function evaluarPullRequest(cfg, ramaPorDefecto) {
  if (cfg === null || cfg === undefined) return { corre: true };
  if (typeof cfg !== "object" || Array.isArray(cfg)) {
    return { corre: false, porque: "los filtros de pull_request no se pudieron leer" };
  }
  const rutas = filtroDeRutas(cfg);
  if (rutas) return { corre: false, porque: rutas };
  const ramas = filtroDeRamas(cfg, ramaPorDefecto, "pull_request");
  if (ramas) return { corre: false, porque: ramas };
  if ("types" in cfg) {
    const tipos = comoLista(cfg.types).map((t) => String(t));
    const faltan = TIPOS_NECESARIOS.filter((t) => !tipos.includes(t));
    if (faltan.length > 0) {
      return {
        corre: false,
        porque: `types es ${JSON.stringify(tipos)} y le faltan ${faltan.join(", ")}: declarar types REEMPLAZA el default [opened, synchronize, reopened], asi que la compuerta no corre ${faltan.includes("opened") ? "cuando el PR nace" : "cuando la cabeza del PR se mueve"} y no queda un check sobre el SHA que se mergea`,
      };
    }
  }
  return { corre: true };
}

function evaluarPush(cfg, ramaPorDefecto) {
  if (cfg === null || cfg === undefined) return { corre: true };
  if (typeof cfg !== "object" || Array.isArray(cfg)) {
    return { corre: false, porque: "los filtros de push no se pudieron leer" };
  }
  const rutas = filtroDeRutas(cfg);
  if (rutas) return { corre: false, porque: rutas };
  const soloTags = !("branches" in cfg) && !("branches-ignore" in cfg) && ("tags" in cfg || "tags-ignore" in cfg);
  if (soloTags) {
    return {
      corre: false,
      porque: "solo filtra tags y no declara branches, asi que el push a la rama por defecto no lo dispara",
    };
  }
  const ramas = filtroDeRamas(cfg, ramaPorDefecto, "push");
  if (ramas) return { corre: false, porque: ramas };
  return { corre: true };
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

/**
 * ¿Algún job de los que ESTE job necesita nunca corre? Un job cuelga de sus `needs`:
 * si uno de ellos está apagado por un `if` constante falso, el que cuelga se saltea en
 * toda corrida, y un salteado reporta Success. Es el segundo fixture de la clase 3 de
 * la refutación (`needs: [nunca]`, con `nunca` en `if: false`).
 */
export function cadenaApagada(jobs, clave, vistos = new Set()) {
  if (vistos.has(clave)) return null;
  vistos.add(clave);
  for (const necesario of comoLista(jobs?.[clave]?.needs).map((n) => String(n))) {
    const job = jobs?.[necesario];
    if (job === undefined) {
      return `necesita el job "${necesario}", que este workflow no define: GitHub rechaza el workflow y ninguna corrida verifica nada`;
    }
    if (ifApagado(job?.if)) {
      return `necesita el job "${necesario}", que esta apagado por su if (${JSON.stringify(job.if)}): un job que cuelga de otro que nunca corre se saltea en toda corrida, y un salteado reporta Success`;
    }
    const masAdentro = cadenaApagada(jobs, necesario, vistos);
    if (masAdentro) return masAdentro;
  }
  return null;
}

/**
 * ¿El veredicto agregado CORRE cuando su dependencia falla? Sin esto, `needs` no
 * bloquea nada: la doc de checks requeridos dice que un job salteado por un
 * condicional «reports Success» y «may not block merging», y un job cuyo `needs` falló
 * queda salteado. Las dos formas que corren igual son `always()` y `!cancelled()`.
 */
export function correAunConFallo(job) {
  const valor = job?.if;
  if (valor === undefined || valor === null) return false;
  let t = String(valor).trim();
  const expr = t.match(/^\$\{\{([\s\S]*)\}\}$/);
  if (expr) t = expr[1].trim();
  t = t.replace(/^['"]|['"]$/g, "").trim();
  return /^(always\(\)|!\s*cancelled\(\)|success\(\)\s*\|\|\s*failure\(\)|failure\(\)\s*\|\|\s*success\(\))$/i.test(t);
}

/** Todo el texto que vive dentro de un valor de YAML, aplanado. Es donde puede estar
 *  la referencia al resultado: en un `run:`, en un `if:`, en un `env:` o en un `with:`. */
function textosDe(valor, acumulado = []) {
  if (typeof valor === "string") acumulado.push(valor);
  else if (Array.isArray(valor)) for (const v of valor) textosDe(v, acumulado);
  else if (valor && typeof valor === "object") for (const v of Object.values(valor)) textosDe(v, acumulado);
  return acumulado;
}

/**
 * ¿El veredicto agregado MIRA el resultado del job de la compuerta?
 *
 * La condición vieja preguntaba si existía una arista de `needs` y con eso declaraba
 * «el rojo bloquea». No bloquea: con `if: always()` —que el marco EXIGE para que el
 * check reporte en los dos carriles— el veredicto corre igual y sale verde si su
 * script no mira nada. Medido: `ci-ok` con `needs: [constitucion]`, `if: always()` y un
 * único paso `run: echo ok` daba exit 0 y en la práctica dejaba pasar el merge con la
 * constitución en rojo.
 *
 * Lo que se busca es una referencia al contexto `needs` del ESLABÓN por el que el rojo
 * viaja: el `needs` directo del veredicto que lleva hasta la compuerta (si el veredicto
 * mira `needs.intermedio.result` y `intermedio` cuelga de la constitución, un rojo de la
 * constitución saltea a `intermedio` y el veredicto lo cobra). Las formas son las que
 * ofrece la referencia de expresiones —`needs.<job>.result`, `needs['<job>'].result`,
 * `needs.*.result`, `toJSON(needs)`—, no una lista de ortografías de shell.
 */
export function vigilaElResultado(jobs, veredicto, compuerta) {
  const job = jobs?.[veredicto];
  const eslabones = comoLista(job?.needs)
    .map((n) => String(n))
    .filter((n) => dependeDe(jobs, n, compuerta));
  if (eslabones.length === 0) {
    return { vigila: false, porque: `"${veredicto}" no tiene ningun needs que lleve a "${compuerta}"` };
  }
  const texto = textosDe(job).join("\n");
  const comodin = /needs\s*\.\s*\*\s*\.\s*result|to_?json\s*\(\s*needs\s*\)/i.test(texto);
  if (comodin) return { vigila: true, como: "el comodin sobre todos los needs" };
  for (const eslabon of eslabones) {
    const nombre = escaparRegex(eslabon);
    const patron = new RegExp(`needs\\s*(?:\\.\\s*${nombre}|\\[\\s*['"]${nombre}['"]\\s*\\])\\s*\\.\\s*(result|outputs)`, "i");
    if (patron.test(texto)) return { vigila: true, como: `mira needs.${eslabon}.result` };
  }
  return {
    vigila: false,
    porque: `"${veredicto}" cuelga de "${eslabones.join(", ")}" y no consulta su resultado (needs.<job>.result) en ningun paso: con if: always() el veredicto corre igual y sale VERDE, y la doc de checks requeridos dice que un job salteado reporta Success — asi que sin esa consulta el rojo de "${compuerta}" no llega al check requerido`,
  };
}

/** ¿Este `uses:` nombra la action de la constitución? Se compara por segmento de
 *  ruta, así que sirve igual con `@v1`, con un SHA, por ruta local (`./actions/...`) o
 *  apuntando a la rama de un change. GitHub PROHÍBE expresiones en `uses`, así que la
 *  referencia es literal. */
export function mencionaLaAction(uses) {
  const patron = new RegExp(`(^|[^A-Za-z0-9_-])${escaparRegex(SEGMENTO_ACTION)}([^A-Za-z0-9_-]|$)`);
  return patron.test(String(uses ?? ""));
}

/** La ref con la que se resolvió un `uses:` (lo que va después del último `@`). Una
 *  invocación por ruta local no tiene ref: corre el árbol del repo que la llama. */
export function refDe(uses) {
  const t = String(uses ?? "");
  const corte = t.lastIndexOf("@");
  return corte >= 0 ? t.slice(corte + 1) : "";
}

/**
 * Todas las invocaciones de la action que aparecen en los workflows, cada una con su
 * veredicto y —si no cuenta— con el motivo exacto. Se recorren TODOS los archivos,
 * subdirectorios y no rastreados incluidos, justamente para poder decir «esto está
 * donde GitHub no lo mira» en vez de no verlo.
 */
export function invocacionesDe(archivos, ramaPorDefecto = "main") {
  const encontradas = [];
  for (const archivo of archivos ?? []) {
    const doc = parsearYaml(archivo.texto);
    const primerNivel = esPrimerNivel(archivo.ruta);
    const disparo =
      doc === null
        ? { corre: false, porque: "el archivo no se pudo leer como YAML" }
        : correEnVerificacion(doc, ramaPorDefecto);
    const jobs = doc && typeof doc.jobs === "object" && doc.jobs !== null ? doc.jobs : {};
    const veredicto = jobDelVeredicto(jobs);
    for (const [clave, job] of Object.entries(jobs)) {
      const pasos = Array.isArray(job?.steps) ? job.steps : [];
      for (const [indice, paso] of pasos.entries()) {
        if (!mencionaLaAction(paso?.uses)) continue;
        const modo =
          paso?.with?.modo === undefined || paso?.with?.modo === null ? "verificar" : String(paso.with.modo).trim();
        const motivos = [];
        if (archivo.rastreado === false) {
          motivos.push(
            `git no rastrea ${archivo.origen ?? archivo.ruta} (no aparece en git ls-files), asi que ese archivo existe solo en la maquina donde se escribio: GitHub Actions corre lo que esta versionado`,
          );
        } else if (archivo.rastreado === null || archivo.rastreado === undefined) {
          motivos.push(
            `no se pudo determinar si git rastrea ${archivo.origen ?? archivo.ruta}, y este check no cuenta como cableado lo que no puede verificar`,
          );
        }
        if (!primerNivel) {
          motivos.push(
            `está en ${archivo.origen ?? archivo.ruta}, que es un subdirectorio de ${DIR_WORKFLOWS}: GitHub Actions sólo ejecuta el primer nivel de ese directorio, así que ese archivo nunca corre`,
          );
        }
        if (!disparo.corre) motivos.push(disparo.porque);
        if (modo !== "verificar") motivos.push(`la invoca en modo "${modo}": escribir el artefacto no es verificarlo`);
        if (ifApagado(job?.if)) motivos.push(`el job "${clave}" esta apagado por su if (${JSON.stringify(job.if)})`);
        if (ifApagado(paso?.if)) motivos.push(`el paso esta apagado por su if (${JSON.stringify(paso.if)})`);
        if (tapaElRojoEn(job)) {
          motivos.push(
            `el job "${clave}" lleva continue-on-error: ${JSON.stringify(job["continue-on-error"])}, que no se puede demostrar falso, asi que su rojo no detiene nada`,
          );
        }
        if (tapaElRojoEn(paso)) {
          motivos.push(
            `el paso lleva continue-on-error: ${JSON.stringify(paso["continue-on-error"])}, que no se puede demostrar falso, asi que su rojo no detiene nada`,
          );
        }
        const cadena = cadenaApagada(jobs, clave);
        if (cadena) motivos.push(`el job "${clave}" ${cadena}`);
        if (veredicto === null) {
          motivos.push(
            `este workflow no tiene el veredicto agregado "${VEREDICTO_AGREGADO}", así que ningún check requerido espera al job "${clave}"`,
          );
        } else if (!dependeDe(jobs, veredicto, clave)) {
          motivos.push(
            `"${VEREDICTO_AGREGADO}" no depende de "${clave}" por needs (ni directa ni transitivamente): un job verde que nadie espera no bloquea ningún merge`,
          );
        } else {
          if (!correAunConFallo(jobs[veredicto])) {
            motivos.push(
              `"${VEREDICTO_AGREGADO}" cuelga de "${clave}" y no declara if: always(), asi que cuando "${clave}" falla el veredicto queda SALTEADO — y la doc de GitHub dice que un job salteado por un condicional reporta Success y no bloquea el merge: el rojo no llega al check requerido`,
            );
          }
          const vigilancia = vigilaElResultado(jobs, veredicto, clave);
          if (!vigilancia.vigila) motivos.push(vigilancia.porque);
        }
        encontradas.push({
          ruta: archivo.origen ?? archivo.ruta,
          primerNivel,
          rastreado: archivo.rastreado ?? null,
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
        mensaje: `este repo distribuye el marco (${CI_DEL_SCAFFOLD} rastreado, con la verificacion cableada en ${scaffoldCablea.archivo}, job "${scaffoldCablea.job}") y no versiona ${VALORES}: no es consumidor de su propia porcion, asi que no hay artefacto que verificar aca`,
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
      mensaje: `la verificacion de la constitucion corre en ${validas.map((v) => `${v.ruta}#${v.job}`).join(", ")}: modo verificar, rastreada por git, en el primer nivel de ${DIR_WORKFLOWS}, disparada en el camino del cambio sin filtros que la saquen, y con un rojo que "${VEREDICTO_AGREGADO}" mira y cobra`,
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

/** El job listo para pegar, que es lo que el mensaje de fallo promete. Lleva las dos
 *  mitades de la condición 5, porque el `needs` solo no bloquea nada. */
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
  `  # y en el veredicto agregado "${VEREDICTO_AGREGADO}", las DOS cosas:`,
  "  #   needs: [..., constitucion]",
  "  #   if: always()          <- sin esto el veredicto se saltea, y un salteado reporta Success",
  "  #   y en su run:, la consulta que hace que el rojo llegue:",
  '  #   [ "${{ needs.constitucion.result }}" = "success" ] || { echo "::error::la constitucion fallo"; exit 1; }',
];

// ---------------------------------------------------------------------------
// Entrada/salida
// ---------------------------------------------------------------------------

/**
 * Los archivos que git RASTREA bajo un directorio, como conjunto de rutas relativas a
 * la raíz. `null` cuando no se pudo preguntar (no es un repo, no hay git en el PATH):
 * ese caso no se confunde con «no rastrea nada», porque uno vuelve el check estricto y
 * el otro lo apagaría.
 */
export function rastreadosEn(raiz, directorio) {
  const r = spawnSync("git", ["ls-files", "-z", "--", directorio], {
    cwd: raiz,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (r.status !== 0 || typeof r.stdout !== "string") return null;
  return new Set(
    r.stdout
      .split("\0")
      .filter(Boolean)
      .map((ruta) => ruta.split("\\").join("/")),
  );
}

/**
 * Todos los `.yml`/`.yaml` bajo `.github/workflows`, subdirectorios INCLUIDOS y sin
 * rastrear INCLUIDOS: se leen para poder decir por qué no cuentan. Cada uno viene con
 * su bandera `rastreado`, que es la que decide.
 *
 * POR QUÉ IMPORTA. La ronda 2 dejó `rastreado()` para `.projects-valores.json` y para el
 * scaffold, pero los archivos que aportan el CABLEADO se leían con `readdirSync`: un
 * `zz.yml` sin `git add` movía el veredicto de exit 1 a exit 0. La perilla no estaba
 * cerrada, estaba un archivo más allá.
 */
export function leerWorkflows(raiz) {
  const base = join(raiz, ...DIR_WORKFLOWS.split("/"));
  if (!existsSync(base)) return [];
  const seguidos = rastreadosEn(raiz, DIR_WORKFLOWS);
  const archivos = [];
  const recorrer = (dir) => {
    for (const entrada of readdirSync(dir, { withFileTypes: true })) {
      const completa = join(dir, entrada.name);
      if (entrada.isDirectory()) {
        recorrer(completa);
        continue;
      }
      if (!/\.ya?ml$/i.test(entrada.name)) continue;
      const ruta = relative(raiz, completa).split("\\").join("/");
      archivos.push({
        ruta,
        rastreado: seguidos === null ? null : seguidos.has(ruta),
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

/**
 * ¿El scaffold que este repo reparte cablea la verificación? Se lee el
 * `plantilla/.github/workflows/*.yml` RASTREADO como si fuera el `.github/workflows/`
 * de un consumidor, porque es exactamente lo que va a ser. Los dos campos de cada
 * archivo son distintos a propósito: `ruta` es la que va a tener en el consumidor (y
 * decide el primer nivel), `origen` es la real de este repo (y es la que se imprime,
 * porque el notice de la ronda 2 decía «ci.yml» mientras el cableado lo aportaba otro
 * archivo).
 */
export function revisarScaffold(raiz, ramaPorDefecto = "main") {
  const dirScaffold = `plantilla/${DIR_WORKFLOWS}`;
  const base = join(raiz, ...dirScaffold.split("/"));
  if (!existsSync(base)) return { cablea: false, porque: `no existe ${dirScaffold}` };
  const seguidos = rastreadosEn(raiz, dirScaffold);
  const archivos = [];
  for (const entrada of readdirSync(base, { withFileTypes: true })) {
    if (!entrada.isFile() || !/\.ya?ml$/i.test(entrada.name)) continue;
    const origen = `${dirScaffold}/${entrada.name}`;
    archivos.push({
      ruta: `${DIR_WORKFLOWS}/${entrada.name}`,
      origen,
      rastreado: seguidos === null ? null : seguidos.has(origen),
      texto: readFileSync(join(base, entrada.name), "utf8"),
    });
  }
  const invocaciones = invocacionesDe(archivos, ramaPorDefecto);
  const valida = invocaciones.find((i) => i.cuenta);
  if (valida) return { cablea: true, job: valida.job, archivo: valida.ruta };
  if (invocaciones.length === 0) {
    return { cablea: false, porque: `ningun workflow rastreado del scaffold invoca ${SEGMENTO_ACTION}` };
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
