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

import { pasosDe, superficies } from "./marco-ci/extraer.mjs";

export const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** Donde GitHub EJECUTA un workflow: el `.github/workflows/` de la raiz. Y el del andamio, que
 *  es el que queda en la raiz de cada proyecto nacido de el.
 *
 *  POR QUE DOS LUGARES FIJOS Y NO «cualquier `.github/workflows/`». Un workflow bajo
 *  `docs/ejemplo/.github/workflows/` no lo corre nadie: GitHub solo mira el de la raiz. Contarlo
 *  hacia «alcanzada» a una action que no corre en ningun repositorio (lo midio la revision
 *  adversarial del porte, 2026-09-18). La direccion segura es la de ahora: un workflow que
 *  aparezca en otro lugar no alcanza nada, y la action que solo invoque ese sale huerfana, que
 *  es un rojo que pide decidir.
 *
 *  Los `action.yml` NO cuentan como origen de un `uses:`. Una action que solo invocara otra
 *  composite action saldria huerfana: es la direccion segura (un rojo que pide declararla),
 *  y hoy no hay ninguna. */
const ORIGENES = /^(?:plantilla\/)?\.github\/workflows\/[^/]+\.ya?ml$/;

/** Los workflows que corren: los de ORIGENES, sacados del MISMO recorrido del arbol que usa el
 *  censo de pasos (`superficies()` del extractor). Ese recorrido ya saltea `pruebas/`, donde los
 *  fixtures escriben `uses:` a proposito, y todo repositorio anidado —un worktree dentro del
 *  checkout, como los que deja una sesion de agente—, cuyo `uses:` haria «alcanzada» a una
 *  action que el arbol medido no invoca. Rigel midio ese ruido (commit b372d9c de alla). Un
 *  solo recorrido, para que los dos lectores no puedan discrepar sobre que arbol miran. */
export function workflowsDelArbol(raiz = RAIZ) {
  return superficies(raiz).filter((rel) => ORIGENES.test(rel));
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
 *  SE COMPARAN CONTRA EL VALOR DE LA CLAVE `uses:` DE UN PASO, el que lee `pasosDe`, y no contra
 *  una linea del archivo. La version anterior anclaba `uses:` al principio de la linea y contaba
 *  tres cosas que no invocan nada: una linea de un heredoc dentro de un `run:`, el texto de un
 *  `description: |` y (con el recorrido de antes) un workflow que GitHub no ejecuta. La i vale
 *  para el dueno y el repo (GitHub no distingue mayusculas ahi); el nombre de la action se
 *  compara despues contra la carpeta, byte por byte, porque la ruta dentro del repo SI las
 *  distingue. */
export const FORMAS = [
  { nombre: "publicada", patron: /^im-diego-ec\/Projects\/actions\/([A-Za-z0-9_-]+)@/i },
  { nombre: "andamio", patron: /^\{\{ORG_MARCO\}\}\/Projects\/actions\/([A-Za-z0-9_-]+)@/i },
  { nombre: "local", patron: /^\.\/actions\/([A-Za-z0-9_-]+)\/?$/ },
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

/** Toda action nombrada por la clave `uses:` de un PASO de algun workflow que corre:
 *  nombre -> [{archivo, linea, forma}].
 *
 *  Un `uses:` comentado no cuenta (es la forma mas facil de «cablear» algo sin cablearlo), ni uno
 *  impreso por un `echo` o un heredoc, ni el texto de un escalar de bloque: `pasosDe` solo
 *  devuelve la clave de un paso dentro de `steps:`. */
export function alcanzadas(raiz = RAIZ) {
  const encontradas = new Map();
  for (const archivo of workflowsDelArbol(raiz)) {
    for (const paso of pasosDe(path.join(raiz, archivo))) {
      if (paso.uses === null) continue;
      for (const forma of FORMAS) {
        const m = paso.uses.match(forma.patron);
        if (!m) continue;
        if (!encontradas.has(m[1])) encontradas.set(m[1], []);
        encontradas.get(m[1]).push({ archivo, linea: paso.lineaUses ?? paso.linea, forma: forma.nombre });
      }
    }
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
