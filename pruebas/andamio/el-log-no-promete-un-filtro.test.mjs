import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

// ---------------------------------------------------------------------------
// EL LOGGER DEL ANDAMIO NO PROMETE UN FILTRO QUE NADIE CORRE.
//
// EL DEFECTO, en dos capas. El comentario de contrato de plantilla/api/src/lib/log.ts
// —el que lee todo proyecto nuevo y todo agente que toca su logging— decia que «el
// filtro busca la subcadena "nivel":"error"», y su prueba repetia que «el filtro de
// las alarmas» la busca.
//   1. NO HAY TAL FILTRO. Ninguna pieza del marco ni del andamio lee ese campo: la
//      verificacion posterior al despliegue que lo leeria no existe todavia
//      (desplegar.yml solo publica). El upstream de este marco lo midio igual el
//      2026-09-10: un grep del campo solo devolvia comentarios.
//   2. Y EL MECANISMO QUE DESCRIBIA ES EL QUE EL SPEC PROHIBE. El requirement «La
//      verificación post-deploy entiende el formato del log» (observabilidad) exige
//      leer el CAMPO del JSON, sin falsos positivos por subcadena.
// Un contrato que nombra un consumidor inexistente con un mecanismo prohibido hace
// que el proximo que escriba el filtro copie la subcadena.
//
// LIMITE DECLARADO: las frases son las formas EXACTAS que existieron. El dia que
// exista el filtro, el comentario puede nombrarlo; lo que no puede es volver a
// describirlo por subcadena.
// ---------------------------------------------------------------------------

const ARCHIVOS = ["plantilla/api/src/lib/log.ts", "plantilla/api/src/lib/log.test.ts"];
const REQUIREMENT = "La verificación post-deploy entiende el formato del log";
const FALSAS = [/el filtro busca la subcadena/i, /el filtro de las alarmas busca/i];

const aplanar = (t) => t.replace(/\r?\n[ \t]*(?:\/\/|\*)?[ \t]*/g, " ").replace(/[ \t]+/g, " ");

test("el requirement que fija el contrato del filtro sigue vivo: si se va, este banco se relee", () => {
  const spec = fs.readFileSync(path.join(RAIZ, "openspec/specs/observabilidad/spec.md"), "utf8");
  assert.ok(spec.includes(`### Requirement: ${REQUIREMENT}`), `el spec de observabilidad ya no tiene «${REQUIREMENT}»`);
});

test("el logger y su prueba no describen un filtro por subcadena", () => {
  const encontradas = [];
  for (const rel of ARCHIVOS) {
    const plano = aplanar(fs.readFileSync(path.join(RAIZ, rel), "utf8"));
    for (const f of FALSAS) if (f.test(plano)) encontradas.push(`${rel}: ${f}`);
  }
  assert.deepEqual(
    encontradas,
    [],
    "el contrato del log describe un filtro que busca una subcadena. Ninguna pieza del marco lee hoy ese campo, " +
      "y cuando exista tiene que leer el CAMPO del JSON (spec observabilidad), no una subcadena. Reescribi el " +
      "comentario diciendo eso",
  );
});

test("el contrato del logger apunta al requirement, no a un consumidor inventado", () => {
  const plano = aplanar(fs.readFileSync(path.join(RAIZ, ARCHIVOS[0]), "utf8"));
  assert.ok(
    plano.includes(REQUIREMENT),
    `${ARCHIVOS[0]} no nombra el requirement que fija como se lee su campo nivel («${REQUIREMENT}»): sin eso, el ` +
      "que escriba la verificacion posterior al despliegue va a copiar el mecanismo del comentario",
  );
});
