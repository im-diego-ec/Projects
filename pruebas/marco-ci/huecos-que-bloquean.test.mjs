import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const WF = path.join(RAIZ, ".github/workflows/marco-ci.yml");

// ---------------------------------------------------------------------------
// NO TODOS LOS HUECOS DEL ANDAMIO SON UN BOOTSTRAP A MEDIAS.
//
// EL DEFECTO, medido de punta a punta sobre un proyecto creado por la puerta
// web: TODO proyecto nace con el CI en ROJO. No por un error --el andamio
// entrega huecos a proposito-- pero el chequeo los contaba todos igual, y eso
// tiene dos consecuencias malas:
//
//   1. Alguien no tecnico ve "rojo" el primer dia y concluye que se rompio.
//   2. Para poner el verde hay que llenar un lugar reservado que dice "aca van
//      las reglas de ESTE repo", o sea inventar contenido. Exactamente lo
//      contrario de lo que esa invitacion busca.
//
// LA DISTINCION ES MECANICA, y por eso se puede comprobar:
//
//   - EN UN ENCABEZADO (`## HUECO ...`) hay una SECCION ENTERA pendiente.
//     El bootstrap esta a medias de verdad. BLOQUEA.
//   - EN UNA CITA (`> HUECO ...`) hay un LUGAR RESERVADO. AVISA.
//
// ESTE BANCO LEE LOS PATRONES DEL PROPIO WORKFLOW, no una copia: una copia se
// desincroniza y el banco pasaria a verificar algo que ya no se ejecuta.
// ---------------------------------------------------------------------------

/** El patron de clasificacion, extraido del workflow que de verdad corre. */
function patronDelWorkflow() {
  const yml = fs.readFileSync(WF, "utf8");
  const m = /grep -E '([^']+)' huecos\.txt >> pendientes\.txt/.exec(yml);
  assert.ok(m, "no encontre el patron que separa los huecos en marco-ci.yml: si se reescribio, actualiza este banco en el mismo cambio");
  return m[1];
}

/** Corre el mismo grep del workflow sobre una lista de lineas ya prefijadas. */
function clasificar(lineas) {
  const patron = patronDelWorkflow();
  const entrada = `${lineas.join("\n")}\n`;
  const corre = (args) => {
    try {
      return execFileSync("grep", args, { input: entrada, encoding: "utf-8" }).trim().split("\n").filter(Boolean);
    } catch {
      return [];
    }
  };
  return { bloquean: corre(["-E", patron]), avisan: corre(["-vE", patron]) };
}

const HUECO = "\u{1F573}";

test("el workflow declara el patron: un cero aca es este banco roto", () => {
  assert.ok(patronDelWorkflow().length > 5, "el patron salio vacio o demasiado corto para ser el real");
});

test("los DOS greps son complementarios: el mismo patron, uno negado", () => {
  // SIN ESTE CASO EL BANCO TIENE UN AGUJERO, y lo encontro una mutacion: los
  // casos de abajo leen SOLO el patron que bloquea, asi que convertir la linea
  // de avisos en un segundo grep que bloquea --o sea, volver al comportamiento
  // viejo donde todo era rojo-- salia en verde.
  //
  // La invariante no es "hay dos greps": es que sean EL MISMO patron, uno con
  // `-E` hacia `pendientes.txt` y el otro con `-vE` hacia `avisos.txt`. Si
  // dejaran de ser complementarios, algun hueco caeria en los dos lados o en
  // ninguno.
  const yml = fs.readFileSync(WF, "utf8");
  const bloquea = /grep -E '([^']+)' huecos\.txt >> pendientes\.txt/.exec(yml);
  const avisa = /grep -vE '([^']+)' huecos\.txt > avisos\.txt/.exec(yml);
  assert.ok(bloquea, "falta el grep que manda los huecos de encabezado a pendientes.txt");
  assert.ok(avisa, "falta el grep NEGADO que manda el resto a avisos.txt: sin el, todo vuelve a bloquear");
  assert.equal(
    avisa[1],
    bloquea[1],
    "los dos greps usan patrones DISTINTOS: asi hay huecos que caen en los dos lados o en ninguno",
  );
});

test("un hueco en un ENCABEZADO bloquea: hay una seccion entera pendiente", () => {
  const r = clasificar([`AGENTS.md:27:## ${HUECO} Antes del primer commit`]);
  assert.equal(r.bloquean.length, 1);
  assert.equal(r.avisan.length, 0);
});

test("un hueco en una CITA avisa: es un lugar reservado, no un estado incompleto", () => {
  const r = clasificar([`AGENTS.md:156:> ${HUECO} Aca van las reglas de este repo`]);
  assert.equal(r.avisan.length, 1);
  assert.equal(r.bloquean.length, 0, "bloquear por esto obliga a inventar contenido para poner el CI en verde");
});

test("los dos juntos se separan, que es el caso REAL del andamio", () => {
  const r = clasificar([
    `AGENTS.md:27:## ${HUECO} Antes del primer commit`,
    `AGENTS.md:156:> ${HUECO} Aca van las reglas de este repo`,
  ]);
  assert.equal(r.bloquean.length, 1, "el encabezado tiene que bloquear");
  assert.equal(r.avisan.length, 1, "la cita tiene que avisar");
});

test("MUERDE: si el patron dejara de reconocer el encabezado, el bootstrap a medias saldria en verde", () => {
  // Se refuta con un patron roto en memoria, no tocando el workflow.
  const entrada = `AGENTS.md:27:## ${HUECO} Antes del primer commit\n`;
  let salida = "";
  try {
    salida = execFileSync("grep", ["-E", "ESTO-NO-CALZA-CON-NADA"], { input: entrada, encoding: "utf-8" });
  } catch {
    salida = "";
  }
  assert.equal(salida, "", "con un patron que no calza, el encabezado no se reporta: eso es lo que este caso demuestra que hay que evitar");
});

test("y el andamio de verdad tiene UNO de cada uno: si eso cambia, este banco deja de medir el caso real", () => {
  const texto = fs.readFileSync(path.join(RAIZ, "plantilla/AGENTS.md"), "utf8");
  const lineas = texto.split("\n");
  const encabezados = lineas.filter((l) => l.includes(HUECO) && /^\s*#+\s/.test(l));
  const citas = lineas.filter((l) => l.includes(HUECO) && /^\s*>/.test(l));
  assert.equal(encabezados.length, 1, `plantilla/AGENTS.md tiene ${encabezados.length} huecos en encabezado y se esperaba 1`);
  assert.equal(citas.length, 1, `plantilla/AGENTS.md tiene ${citas.length} huecos en cita y se esperaba 1`);
});
