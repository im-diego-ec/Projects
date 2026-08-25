// Banco del paso "Artefactos regenerados al dia" de marco-ci.yml.
//
// QUE CAPABILITY ENFORZA. `pipeline-entrega`, requirement "Los artefactos
// regenerados no divergen de la version pinada": el paso es el unico check del
// marco que lo vuelve exigible, y este banco es lo unico que ejercita el paso.
// El nombre de la capability se escribe aca a proposito — el censo de "que
// requirement tiene un check que falla solo" se hace buscando el nombre en los
// archivos ejecutables, y una capability que ningun ejecutable nombra figura
// como no enforzada aunque lo este.
//
// La auditoria del 2026-08-20 midio que la rama del aviso de este paso era CODIGO
// MUERTO: el paso no podia salir amarillo nunca. `xargs` COLAPSA los codigos de
// salida —sale 123 si cualquier hijo salio entre 1 y 125— asi que "grep no
// encontro nada" (rc=1) y "grep no pudo leer el archivo" (rc>=2) llegaban con el
// mismo numero, y la guarda RC>1 mandaba el primero a la rama del segundo. El
// repo SIN cabeceras, que es la clase mas atrasada y justo la que el check dice
// proteger, recibia un rojo que mentia sobre la causa y ofrecia el arreglo
// equivocado.
//
// El banco fija las DOS direcciones a la vez, y eso es lo importante: el parche
// facil —tapar el 123— habria hecho pasar los casos de "sin cabecera" y
// apagado los de "no se pudo leer", que son los que TIENEN que ser rojos. Los
// casos "ilegible" estan aca para que ese parche no pase.
import { test } from "node:test";
import assert from "node:assert/strict";
import { rmSync } from "node:fs";
import { join } from "node:path";

import { scriptDelPaso } from "./extraer.mjs";
import { repoDeJuguete, escribir, git, correrBash, limpiarTodo } from "./util.mjs";

const PASO = "Artefactos regenerados al dia";
const PIN = "1.9.0";
const script = scriptDelPaso(PASO);

const RUTA_A = ".claude/skills/openspec-proponer/SKILL.md";
const RUTA_B = ".claude/skills/openspec-archivar/SKILL.md";

function conCabecera(version) {
  return `---\nname: openspec\ngeneratedBy: "${version}"\n---\n\ncuerpo\n`;
}

const SIN_CABECERA = "---\nname: openspec\n---\n\ncuerpo de un CLI viejo\n";

function repoCon(artefactos, { borrarDelDisco = [] } = {}) {
  const raiz = repoDeJuguete("artefactos-");
  for (const [ruta, contenido] of Object.entries(artefactos)) {
    escribir(raiz, ruta, contenido);
  }
  git(raiz, "add", "-A");
  // Rastreado en el indice y ausente del disco: es la forma deterministica de
  // provocar el "grep no pudo leer" (rc=2) sin depender de permisos, que en
  // Windows no se comportan igual.
  for (const ruta of borrarDelDisco) rmSync(join(raiz, ruta));
  return raiz;
}

function correr(raiz) {
  return correrBash(script, { cwd: raiz, env: { PIN } });
}

test.after(limpiarTodo);

test("artefactos · refutacion · artefactos sin cabecera: ::warning:: y exit 0", () => {
  const { exit, salida } = correr(repoCon({ [RUTA_A]: SIN_CABECERA }));
  assert.equal(exit, 0, `el repo mas atrasado tiene que salir amarillo, no rojo:\n${salida}`);
  assert.match(salida, /::warning::/, "sin cabeceras el paso no puede salir en verde mudo");
  // El aviso interpolaba ${DIRS[*]}, un array que un cambio anterior habia
  // borrado: el mensaje salia mutilado y sin decir sobre que archivos hablaba.
  assert.ok(
    salida.includes(RUTA_A),
    `el aviso no nombra el artefacto del que habla:\n${salida}`,
  );
});

// Control, y vale explicar por que NO era una refutacion: con xargs los dos
// archivos entraban en la MISMA invocacion de grep, uno matcheaba y el rc era 0.
// El 123 solo aparecia cuando ninguna invocacion encontraba nada, o sea justo en
// el repo que no tiene ni una cabecera. Queda en el banco porque el arreglo pasa
// a un archivo por iteracion y esta es la mezcla que ahi podria romperse.
test("artefactos · control · uno sin cabecera junto a uno al dia: exit 0", () => {
  const { exit, salida } = correr(
    repoCon({ [RUTA_A]: SIN_CABECERA, [RUTA_B]: conCabecera(PIN) }),
  );
  assert.equal(
    exit,
    0,
    `un artefacto sin cabecera al lado de uno al dia no es un fallo de lectura:\n${salida}`,
  );
});

test("artefactos · control · todos al dia: exit 0", () => {
  const { exit, salida } = correr(
    repoCon({ [RUTA_A]: conCabecera(PIN), [RUTA_B]: conCabecera(PIN) }),
  );
  assert.equal(exit, 0, salida);
});

test("artefactos · control · una version divergente: exit 1", () => {
  const { exit, salida } = correr(
    repoCon({ [RUTA_A]: conCabecera(PIN), [RUTA_B]: conCabecera("1.8.0") }),
  );
  assert.equal(exit, 1, `una version distinta al pin tiene que ser roja:\n${salida}`);
});

// LOS DOS CASOS QUE MATAN EL PARCHE FACIL. Si alguien "arregla" el 123
// ignorandolo, estos dos pasan a verde y el paso deja de distinguir "no hay
// cabecera" de "no pude leer el archivo", que es exactamente el fail-open que
// el marco prohibe: lo no verificable es rojo.
test("artefactos · control · un artefacto ilegible: exit 1", () => {
  const { exit, salida } = correr(
    repoCon({ [RUTA_A]: conCabecera(PIN) }, { borrarDelDisco: [RUTA_A] }),
  );
  assert.equal(exit, 1, `un artefacto que no se puede leer no se declara al dia:\n${salida}`);
});

test("artefactos · control · uno ilegible junto a uno al dia: exit 1", () => {
  const { exit, salida } = correr(
    repoCon(
      { [RUTA_A]: conCabecera(PIN), [RUTA_B]: conCabecera(PIN) },
      { borrarDelDisco: [RUTA_B] },
    ),
  );
  assert.equal(
    exit,
    1,
    `con un artefacto ilegible no alcanza que los demas esten al dia:\n${salida}`,
  );
});

test("artefactos · control · repo sin artefactos del CLI: exit 0", () => {
  const { exit, salida } = correr(repoCon({ "README.md": "sin artefactos\n" }));
  assert.equal(exit, 0, salida);
});
