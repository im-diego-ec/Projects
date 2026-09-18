// ---------------------------------------------------------------------------
// QUE ACTIONS DEL MARCO ALCANZA ALGUN `uses:`. UN SOLO LECTOR, PARA DOS COMPUERTAS.
//
// POR QUE EXISTE. La pregunta «¿algun workflow invoca esta action?» la necesitan dos piezas:
//
//   · `pruebas/andamio/actions-alcanzables.test.mjs` la usa para poner ROJO a una action
//     publicada que nadie invoca, y
//   · `pruebas/docs/cobertura-de-requirements.test.mjs` la usa para que la pagina de cobertura
//     no publique como compuerta de un requirement una pieza que no corre en ninguna parte.
//
// Si cada una tuviera su lector, podrian discrepar sobre la misma pieza: una la exime y la otra
// la cuenta como sosteniendo un requirement. Es lo que midio Rigel el 2026-09-10 (issue #457
// de alla): su censo publicaba 43 de 77 requirements sostenidos con las declaraciones de una
// action que ningun workflow invocaba, y 41 de 77 sin ellas. De ahi viene este modulo (Rigel
// 2.6.0, commit c6d2f5e), adaptado a Projects.
//
// Y ESTE ARBOL YA TENIA EL CASO. Medido el 2026-09-17: `actions/carril-docs` no la invoca
// ningun `uses:` de `.github/workflows/` ni de `plantilla/.github/workflows/`. Solo aparece en
// los ejemplos de `actions/README.md`, que es documentacion y no un workflow.
//
// POR QUE VIVE EN pruebas/ Y NO EN herramientas/, al reves que en Rigel. Alla lo importa una
// herramienta que corre en CI (`censo-compuertas.mjs`); aca los dos que lo importan son bancos.
// Y `herramientas/` es una superficie que VIAJA —el job `changelog-en-el-pr` de ci.yml la
// cuenta entre las que llegan a un consumidor—, mientras que esto no le llega a nadie. Es el
// mismo criterio que ya siguio `pruebas/aserciones-con-evidencia.mjs`.
//
// LO QUE ESTO NO VERIFICA, escrito en vez de prometido: que la action haga algo util, ni que un
// consumidor ADOPTADO (que no nacio del andamio) la tenga cableada. Que el andamio la invoque
// dice que un proyecto NACIDO de el la corre; los adoptados son otra pregunta.
// ---------------------------------------------------------------------------

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** Los directorios que no son del marco y no se recorren: dependencias, historia y bancos.
 *  `pruebas/` queda fuera porque sus fixtures escriben `uses:` a proposito. */
const NO_SE_RECORREN = new Set([".git", "node_modules", "pruebas"]);

/** Si una carpeta de adentro es OTRO repositorio: trae su propio `.git` (directorio en un
 *  clon, archivo en un worktree).
 *
 *  No es teoria. Las sesiones de agente pueden dejar worktrees DENTRO del checkout (por
 *  ejemplo `.claude/worktrees/<rama>/`), cada uno con una copia entera de
 *  `.github/workflows/`, y Rigel lo midio: un `grep -rn .` sobre su arbol devolvia 36 lineas
 *  de ruido de los worktrees en vuelo (commit b372d9c de alla). Aca el ruido
 *  seria peor que ruido: el `uses:` de una rama en vuelo haria «alcanzada» a una action que
 *  el arbol que se esta midiendo no invoca, y el banco daria verde por un archivo que no es
 *  suyo. Es la direccion insegura, asi que se corta. */
const esOtroRepositorio = (abs) => fs.existsSync(path.join(abs, ".git"));

/** Los workflows del arbol: todo `.github/workflows/*.yml` en cualquier profundidad.
 *
 *  SE DERIVAN Y NO SE LISTAN, que es la doctrina del censo de pasos de `rojo-primero`: una
 *  superficie nueva entra sola. Hoy son dos directorios —los del marco y los que reparte el
 *  andamio—, y `plantilla/` no es un detalle: `censo-fuentes` y `cobertura-diff` NO las invoca
 *  `marco-ci.yml`, las invoca el andamio. Dejarlo afuera pondria rojo a dos actions que corren
 *  en cada proyecto nacido de el.
 *
 *  Los `action.yml` NO cuentan como origen de un `uses:`. Una action que solo invocara otra
 *  composite action saldria huerfana: es la direccion segura (un rojo que pide declararla),
 *  y hoy no hay ninguna. */
export function workflowsDelArbol(raiz = RAIZ) {
  const encontrados = [];
  const recorrer = (relativa) => {
    for (const e of fs.readdirSync(path.join(raiz, relativa), { withFileTypes: true })) {
      if (NO_SE_RECORREN.has(e.name)) continue;
      const hija = relativa === "" ? e.name : `${relativa}/${e.name}`;
      if (e.isDirectory()) {
        if (!esOtroRepositorio(path.join(raiz, hija))) recorrer(hija);
      }
      else if (/(^|\/)\.github\/workflows\/[^/]+\.ya?ml$/.test(hija)) encontrados.push(hija);
    }
  };
  recorrer("");
  return encontrados.sort();
}

/** LAS TRES FORMAS de invocar una action del marco, y las tres son legitimas:
 *
 *   1. `im-diego-ec/Projects/actions/<x>@<ref>` — la publicada, la que reciben los consumidores
 *      desde `marco-ci.yml`.
 *   2. `{{ORG_MARCO}}/Projects/actions/<x>@<ref>` — la del andamio, con el marcador sin
 *      sustituir.
 *   3. `./actions/<x>` — la ruta local, que usa el propio marco cuando corre una action sobre
 *      si mismo (`aviso-version.yml`, y los jobs de `ci.yml` que no pueden resolver la ref
 *      publicada en el repo que la contiene).
 *
 *  SOLO CUENTA LA CLAVE `uses:` DE VERDAD, anclada al principio de la linea. Un `echo "uses:
 *  ..."` dentro de un `run:` —`marco-ci.yml` imprime asi el snippet que el consumidor tiene que
 *  pegar— no invoca nada. La i vale para el dueno y el repo (GitHub no distingue mayusculas
 *  ahi); el nombre de la action se compara despues contra la carpeta, byte por byte, porque la
 *  ruta dentro del repo SI las distingue. */
export const FORMAS = [
  { nombre: "publicada", patron: /^\s*(?:-\s+)?uses:\s*["']?im-diego-ec\/Projects\/actions\/([A-Za-z0-9_-]+)@/i },
  { nombre: "andamio", patron: /^\s*(?:-\s+)?uses:\s*["']?\{\{ORG_MARCO\}\}\/Projects\/actions\/([A-Za-z0-9_-]+)@/i },
  { nombre: "local", patron: /^\s*(?:-\s+)?uses:\s*["']?\.\/actions\/([A-Za-z0-9_-]+)\/?["']?\s*(?:#.*)?$/ },
];

/** Los directorios de `actions/` que publican una action: los que traen `action.yml`. */
export function actionsPublicadas(raiz = RAIZ) {
  const dir = path.join(raiz, "actions");
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && fs.existsSync(path.join(dir, e.name, "action.yml")))
    .map((e) => e.name)
    .sort();
}

/** Toda action nombrada por un `uses:` de algun workflow del arbol: nombre -> [{archivo, linea, forma}].
 *
 *  Las lineas COMENTADAS no cuentan: un `uses:` comentado es la forma mas facil de «cablear»
 *  algo sin cablearlo, y es exactamente el defecto que esto persigue. */
export function alcanzadas(raiz = RAIZ) {
  const encontradas = new Map();
  for (const archivo of workflowsDelArbol(raiz)) {
    const lineas = fs.readFileSync(path.join(raiz, archivo), "utf8").split(/\r?\n/);
    lineas.forEach((l, i) => {
      if (/^\s*#/.test(l)) return;
      for (const forma of FORMAS) {
        const m = l.match(forma.patron);
        if (!m) continue;
        if (!encontradas.has(m[1])) encontradas.set(m[1], []);
        encontradas.get(m[1]).push({ archivo, linea: i + 1, forma: forma.nombre });
      }
    });
  }
  return encontradas;
}

/** De que action del marco es una ruta citada (`actions/<x>/...`), o `null` si no es de ninguna.
 *
 *  Vale para cualquier archivo de adentro —el `action.yml`, su script, su banco—: todo lo que
 *  vive en la carpeta de una action que nadie invoca describe algo que no corre. Acepta el
 *  separador de Windows porque las rutas a veces salen de `path.join`. */
export function accionDeLaRuta(ruta) {
  const m = /^(?:\.\.\/)?actions[\\/]([A-Za-z0-9_-]+)[\\/]/.exec(String(ruta ?? ""));
  return m ? m[1] : null;
}
