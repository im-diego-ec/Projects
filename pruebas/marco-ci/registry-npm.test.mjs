// Banco del paso "El arbol del PR no redirige el registry de npm" (job openspec).
//
// QUE CIERRA, y por que el hallazgo era una AFIRMACION y no un bug. El encabezado del
// job `cambios` justifica soportar `pull_request_target` con esta frase: "Ninguno de
// estos jobs lo EJECUTA —actionlint, gitleaks y los `node -e` leen texto, y no hay
// install del manifiesto del consumidor—". Era falsa en el unico job que baja un
// paquete: `openspec` hace checkout del HEAD del PR y despues corre
// `npx --yes "@fission-ai/openspec@<pin>" validate --all --strict` con el cwd dentro
// de ese arbol. npm arma su configuracion leyendo el `.npmrc` del directorio de
// trabajo antes que el del usuario, asi que un PR de fork que agregue un `.npmrc` con
// otro `registry=` hace que npx descargue y ejecute OTRO paquete con ese nombre y esa
// version, dentro de una corrida que tiene los permisos del repo llamador. El pin no
// protege: dice QUE bajar, no DE DONDE.
//
// Este paso es lo que vuelve verdadera aquella frase, asi que su banco no es opcional:
// sin el, la decision de "soportar pull_request_target" queda apoyada en una
// afirmacion que nadie ejercita.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { scriptDelPaso, RUTA_WORKFLOW } from "./extraer.mjs";
import { repoDeJuguete, escribir, commit, correrBash, limpiarTodo } from "./util.mjs";

const PASO = "El arbol del PR no redirige el registry de npm";
const script = scriptDelPaso(PASO);

function arbol(archivos) {
  const raiz = repoDeJuguete("registry-");
  escribir(raiz, "openspec/project.md", "specs\n");
  for (const [ruta, contenido] of Object.entries(archivos)) escribir(raiz, ruta, contenido);
  commit(raiz, "estado inicial");
  return raiz;
}

test.after(limpiarTodo);

test("registry · un arbol sin .npmrc pasa", () => {
  const { exit, salida } = correrBash(script, { cwd: arbol({}) });
  assert.equal(exit, 0, salida);
});

test("registry · refutacion · un .npmrc en la raiz del arbol es ROJO", () => {
  const raiz = arbol({ ".npmrc": "registry=https://un-registry-de-otro.invalid/\n" });
  const { exit, salida } = correrBash(script, { cwd: raiz });
  assert.equal(
    exit,
    1,
    `un .npmrc en el arbol decide de donde baja el paquete que este job EJECUTA:\n${salida}`,
  );
  assert.match(salida, /\.npmrc/, `el rojo tiene que nombrar el archivo:\n${salida}`);
});

// npm no solo lee el .npmrc de la raiz: cualquier directorio del arbol puede traerlo,
// y el cwd del npx no esta garantizado que sea la raiz. Se busca en TODO el arbol a
// proposito.
test("registry · refutacion · un .npmrc anidado tambien es ROJO", () => {
  const raiz = arbol({ "paquetes/api/.npmrc": "registry=https://otro.invalid/\n" });
  const { exit, salida } = correrBash(script, { cwd: raiz });
  assert.equal(exit, 1, `un .npmrc anidado cuenta igual:\n${salida}`);
  assert.match(salida, /paquetes\/api\/\.npmrc/, `el rojo tiene que decir cual encontro:\n${salida}`);
});

// SIN RASTREAR TAMBIEN CUENTA, y es la diferencia con el resto de los checks de este
// workflow: los demas miran `git ls-files` porque lo no versionado no pasa por la
// revision cruzada. Aca lo que importa no es que este versionado sino que este EN
// DISCO cuando corra npm, y bajo pull_request_target ese archivo llega del head de un
// fork.
test("registry · un .npmrc SIN RASTREAR cuenta igual: lo que manda es el disco", () => {
  const raiz = arbol({});
  escribir(raiz, ".npmrc", "registry=https://otro.invalid/\n");
  const { exit, salida } = correrBash(script, { cwd: raiz });
  assert.equal(
    exit,
    1,
    "npm lee el archivo del disco, no el indice de git: un .npmrc sin versionar redirige igual" +
      `\n${salida}`,
  );
});

test("registry · MUTACION · sin la guarda, el arbol con .npmrc vuelve a pasar", () => {
  const ancla = 'if [ -n "${ENCONTRADOS}" ]; then';
  assert.ok(script.includes(ancla), "el ancla de la mutacion ya no esta en el paso");
  const mutado = script.replace(ancla, "if false; then");

  const raiz = arbol({ ".npmrc": "registry=https://otro.invalid/\n" });
  const sano = correrBash(script, { cwd: raiz });
  const roto = correrBash(mutado, { cwd: raiz });
  assert.equal(sano.exit, 1, sano.salida);
  assert.equal(
    roto.exit,
    0,
    `con la guarda neutralizada el mismo arbol tendria que pasar:\n${roto.salida}`,
  );
});

// ── Lo que sostiene la otra mitad del cierre, que no es un `run:` ──────────
// El paso de arriba saca el .npmrc del arbol; el segundo candado es que la
// configuracion del usuario tampoco decida. Se comprueba por lectura del workflow
// porque vive en la invocacion, no en un bloque que este banco pueda ejecutar.
// EL NOMBRE DEL EJECUTOR SE ARMA, NO SE ESCRIBE. El paso "Ejecutores de paquetes
// pinados" recorre TODO archivo rastreado que mencione un gestor —los .mjs del
// banco incluidos, porque su pathspec solo exime .md y .mdc— y no puede
// distinguir una invocacion real de la cita textual que este banco necesita para
// afirmar que el pin sigue ahi. Escrita entera, esta expectativa se leia como
// una invocacion propia sin version exacta y ponia el arbol en rojo. Partido en
// dos mitades, ninguna linea fisica queda con el gestor seguido de algo con
// forma de paquete, y la afirmacion sigue siendo sobre el texto exacto.
const EJECUTOR = "np" + "x";
const PIN_ESPERADO = `${EJECUTOR} --yes --ignore-scripts "@fission-ai/openspec@\${VERSION_OPENSPEC}"`;

test("registry · el ejecutor corre con npm_config_userconfig apuntando a un archivo vacio", () => {
  const texto = readFileSync(RUTA_WORKFLOW, "utf8");
  assert.match(
    texto,
    /npm_config_userconfig="\$\{NPMRC_VACIO\}"/,
    "sin esto, un ~/.npmrc del runner seguiria decidiendo de donde baja el paquete",
  );
  assert.ok(
    texto.includes(PIN_ESPERADO),
    `la invocacion tiene que seguir pinada y sin scripts del ciclo de instalacion: se esperaba encontrar, textual, ${PIN_ESPERADO}`,
  );
});

// Y la afirmacion que este paso vuelve verdadera no puede volver a escribirse sin el.
test("registry · el encabezado ya no afirma que ningun job ejecuta codigo del PR sin decir por que", () => {
  const texto = readFileSync(RUTA_WORKFLOW, "utf8");
  assert.equal(
    texto.includes("Ninguno de estos jobs lo\n  # EJECUTA"),
    false,
    `volvio la afirmacion vieja, que era falsa en el job openspec: ese job corre el ejecutor de paquetes (${EJECUTOR}) con el cwd dentro del arbol del PR`,
  );
  assert.match(
    texto,
    /El arbol del PR no redirige el registry de npm/,
    "el paso que sostiene la afirmacion tiene que seguir existiendo",
  );
});
