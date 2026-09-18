import test, { after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { arbol, correr, delta, limpiar, requirement, specVivo } from "../../actions/guardrail-deltas/pruebas/ayuda.mjs";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

after(limpiar);

// ---------------------------------------------------------------------------
// LO QUE LA PROSA DICE DEL GUARDRAIL DE DELTAS SE DERIVA DE CORRERLO.
//
// EL DEFECTO. AGENTS.md —la constitucion que se carga en cada sesion de este
// repo— y la skill de archivado decian que el guardrail tiene un hueco: si el
// titulo de un requirement MODIFIED no existe en el spec vivo, «no avisa», y
// mandaban a verificarlo a mano. Era falso: check-openspec-deltas.mjs lo caza
// (el MODIFIED huerfano) y sale 1, con banco propio. Y el hueco que SI existe, el
// simetrico —un ADDED cuyo titulo YA existe en el spec vivo—, no lo nombraba nadie.
// O sea: se mandaba a revisar a mano lo cubierto y se callaba lo descubierto. El
// upstream de este marco lo corrigio en su AGENTS.md y en su skill (Rigel 2.3.0,
// commit dc1f2c6, y 2.4.0, commit 8966753); el canonico de Projects ya lo habia
// corregido, y la constitucion propia no.
//
// POR QUE CORRE EL GUARDRAIL EN VEZ DE LEER SU CODIGO. La prosa tiene que decir lo
// que el guardrail HACE, y eso se sabe corriendolo. Si algun dia el guardrail
// cierra el hueco del ADDED, el segundo caso se da vuelta solo y exige que la
// prosa deje de anunciarlo: una frase que describe un hueco cerrado es la misma
// mentira que este banco vino a sacar, del otro lado.
//
// LIMITE DECLARADO. Las frases falsas son las formas EXACTAS que existieron. Lo que
// es general es la otra mitad: cada superficie tiene que NOMBRAR el hueco vigente.
// ---------------------------------------------------------------------------

const SUPERFICIES = [
  "AGENTS.md",
  ".claude/skills/projects-archive-change/SKILL.md",
  "plantilla/.claude/skills/projects-archive-change/SKILL.md",
  "actions/README.md",
];

const aplanar = (t) =>
  t
    .replace(/\r?\n[ \t]*(?:>|#|\/\/|\*)?[ \t]*/g, " ")
    .replace(/\*\*/g, "")
    .replace(/[ \t]+/g, " ");

const MODIFIED_HUERFANO_NO_SE_CAZA = [
  "si el título de un requirement del delta no existe en el spec vigente, no avisa",
  "si el titulo del requirement del delta no existe en el spec vivo, no avisa",
  "El guardrail no avisa cuando el titulo del delta no existe en el spec vivo",
];
const NOMBRA_EL_HUECO_DEL_ADDED = /ADDED`? cuyo t[ií]tulo ya existe/i;

const REQ = "El sistema promete algo verificable";
const OTRO = "El sistema promete otra cosa";

function guardrailCazaElModifiedHuerfano() {
  const raiz = arbol({
    specs: { cap: specVivo(requirement(REQ, ["el caso A"])) },
    activos: { ahora: { cap: delta("MODIFIED", requirement(OTRO, ["el caso A"])) } },
  });
  return correr(raiz).codigo === 1;
}

function guardrailCazaElAddedDuplicado() {
  const raiz = arbol({
    specs: { cap: specVivo(requirement(REQ, ["el caso A"])) },
    activos: { ahora: { cap: delta("ADDED", requirement(REQ, ["el caso nuevo"])) } },
  });
  return correr(raiz).codigo === 1;
}

const textos = () => SUPERFICIES.map((rel) => ({ rel, plano: aplanar(fs.readFileSync(path.join(RAIZ, rel), "utf8")) }));

test("la normalizacion ve una frase partida en dos lineas y con negritas", () => {
  const partido = "tiene un hueco conocido: **si el titulo del\nrequirement del delta no existe en el spec vivo, no avisa**.";
  assert.ok(aplanar(partido).includes(MODIFIED_HUERFANO_NO_SE_CAZA[1]));
});

test("si el guardrail caza el MODIFIED huerfano, ninguna superficie dice que no avisa", () => {
  const caza = guardrailCazaElModifiedHuerfano();
  assert.equal(caza, true, "el guardrail dejo de cazar el MODIFIED huerfano: eso es una regresion de su banco, no de la prosa");
  const encontradas = [];
  for (const { rel, plano } of textos()) {
    for (const f of MODIFIED_HUERFANO_NO_SE_CAZA) if (plano.includes(f)) encontradas.push(`${rel}: "${f}"`);
  }
  assert.deepEqual(
    encontradas,
    [],
    "estas superficies dicen que el guardrail no avisa un MODIFIED cuyo titulo no existe en el spec vivo, y lo " +
      "caza: check-openspec-deltas.mjs lo reporta como huerfano y sale 1. Mandar a verificarlo a mano es trabajo " +
      "tirado; el hueco real es el ADDED cuyo titulo ya existe. Reescribi la frase con eso",
  );
});

test("el hueco del ADDED duplicado se nombra mientras exista, y deja de nombrarse cuando se cierre", () => {
  const caza = guardrailCazaElAddedDuplicado();
  for (const { rel, plano } of textos()) {
    if (caza) {
      assert.doesNotMatch(
        plano,
        NOMBRA_EL_HUECO_DEL_ADDED,
        `${rel} sigue anunciando que un ADDED cuyo titulo ya existe no se caza, y el guardrail ya lo caza: saca la frase`,
      );
    } else {
      assert.match(
        plano,
        NOMBRA_EL_HUECO_DEL_ADDED,
        `${rel} no nombra el hueco vigente del guardrail de deltas: un ADDED cuyo titulo ya existe en el spec vivo ` +
          "pasa el guardrail y validate --strict en verde, y recien lo frena el archive. Nombralo, con el grep a " +
          "correr antes de escribir un ADDED",
      );
    }
  }
});
