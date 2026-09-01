import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SKILL = path.join(RAIZ, "plantilla/.claude/skills/projects-archive-change");

// ---------------------------------------------------------------------------
// LA SKILL QUE CIERRA EL PRIMER CHANGE DE TODO PROYECTO.
//
// Esta skill la usa CADA proyecto para archivar, asi que sus defectos le pasan a
// todos, y el primer change es el caso peor: `openspec/specs/` empieza vacio, o
// sea que cualquier delta crea una capability nueva.
//
// LOS TRES DEFECTOS QUE ESTE BANCO CIERRA, medidos armando ese escenario:
//
//   1. EL CONTEO DE ESCENARIOS DECIA «SIN DIFERENCIAS» SOBRE UN ARCHIVE REAL.
//      El "despues" se contaba con `git grep` sin `--untracked`, y el spec que el
//      archive acaba de escribir todavia no paso por `git add`. Resultado: cero
//      escenarios contra cero escenarios, "sin diferencias", y la verificacion
//      declaraba correcto un archive del que no habia mirado una sola linea.
//
//   2. VARIOS `git grep` DE LA SKILL MIRABAN SOLO EL INDICE. Sobre archivos
//      recien escritos devuelven vacio, y la skill leia ese vacio como exito. El
//      peor era el conteo de tareas del Paso 0, cuya regla escrita era «sin
//      salida es cero tareas abiertas»: «todavia no lo agregaste» y «no queda
//      ninguna tarea» producian la misma salida.
//
//   3. EL PASO 4 PEDIA «LOS TRES VERDES» EN UN PUNTO DONDE EL ROJO ERA SEGURO.
//      El Paso 2 escribe `Purpose: TBD` —los deltas no transportan `## Purpose`—
//      y `validate --all --strict` lo rechaza; el arreglo esta recien en el Paso
//      5. La persona ve un rojo garantizado sin que nada se lo anticipe.
// ---------------------------------------------------------------------------

const skill = () => fs.readFileSync(path.join(SKILL, "SKILL.md"), "utf-8");
const script = () => fs.readFileSync(path.join(SKILL, "aplicar-deltas.mjs"), "utf-8");

test("la skill esta donde el banco cree: un cero aca es este control roto", () => {
  assert.ok(fs.existsSync(path.join(SKILL, "SKILL.md")), "falta SKILL.md");
  assert.ok(fs.existsSync(path.join(SKILL, "aplicar-deltas.mjs")), "falta aplicar-deltas.mjs");
});

test("el conteo del «despues» mira el arbol, no solo el indice", () => {
  // EL DEFECTO ERA UN FALSO VERDE, asi que lo que se afirma es la bandera que lo
  // corrige y la asimetria que la hace correcta: `--untracked` va en el "despues"
  // y NO en el "antes", que se lee de una revision donde nada puede estar sin
  // rastrear.
  const t = script();
  assert.match(t, /--untracked/, "sin esta bandera, un spec recien escrito no se cuenta y el archive pasa sin mirarse");
  assert.match(
    t,
    /if \(!revision\) argumentos\.push\("--untracked"\);/,
    "tiene que ir solo cuando NO hay revision: en el «antes» no existe lo no rastreado",
  );
  // Y EL ORDEN, que no es un detalle: puesta despues del patron, git la lee como
  // el nombre de una revision y sale 128. Lo cazo el MUERDE de abajo.
  const orden = t.slice(t.indexOf("const contar = (revision)"), t.indexOf("const { rc, salida } = git"));
  assert.ok(
    orden.indexOf("--untracked") < orden.indexOf("PATRON"),
    "`--untracked` tiene que ir ANTES del patron: despues, git la interpreta como una revision y sale 128",
  );
});

test("MUERDE: el escenario del primer change se cuenta distinto con y sin la bandera", () => {
  // Se arma el caso exacto —un spec escrito y sin `git add`— y se le pregunta a
  // git las dos cosas. Si las dos respuestas fueran iguales, la bandera no estaria
  // arreglando nada y este banco mediria aire.
  const d = fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), "archive-"));
  const correr = (...a) => spawnSync("git", a, { cwd: d, encoding: "utf-8" });
  correr("init", "-q", "-b", "main");
  correr("config", "user.email", "b@ejemplo.invalid");
  correr("config", "user.name", "Builder");
  fs.writeFileSync(path.join(d, "semilla.txt"), "x\n");
  correr("add", "-A");
  correr("commit", "-qm", "semilla");

  // El estado del primer change: una capability nueva, escrita y sin agregar.
  fs.mkdirSync(path.join(d, "openspec/specs/recepcion"), { recursive: true });
  fs.writeFileSync(
    path.join(d, "openspec/specs/recepcion/spec.md"),
    "## Purpose\n\nTBD\n\n### Requirement: x\n\n#### Scenario: uno\n\n#### Scenario: dos\n",
  );

  const sinBandera = correr("grep", "-c", "-E", "^#### Scenario:", "--", "openspec/specs");
  const conBandera = correr("grep", "--untracked", "-c", "-E", "^#### Scenario:", "--", "openspec/specs");
  // Y LA MISMA BANDERA MAL PUESTA, que es el error que se cometio al arreglarlo:
  // despues del patron git la toma por una revision.
  const malPuesta = correr("grep", "-c", "-E", "^#### Scenario:", "--untracked", "--", "openspec/specs");

  assert.equal(sinBandera.stdout.trim(), "", "sin --untracked, git no ve el spec recien escrito: ESE era el falso verde");
  assert.match(conBandera.stdout, /openspec\/specs\/recepcion\/spec\.md:2/, "con la bandera, cuenta los dos escenarios");
  assert.equal(malPuesta.status, 128, "y puesta despues del patron sale 128: por eso el orden esta escrito en el codigo");
  fs.rmSync(d, { recursive: true, force: true });
});

test("ningun comando de la skill cuenta sobre el indice lo que acaba de escribir", () => {
  // Los `git grep` que quedan son legitimos —hablan DE `git grep`, o miran
  // revisiones— pero ninguno puede volver a contar archivos del arbol.
  const t = skill();
  const bloques = [...t.matchAll(/```(?:bash|sh)\n([\s\S]*?)```/g)].map((m) => m[1]);
  assert.ok(bloques.length >= 5, `se leyeron ${bloques.length} bloques: se rompio la lectura de la skill`);

  const malos = [];
  for (const b of bloques) {
    for (const l of b.split("\n")) {
      const s = l.trim();
      if (!/^git grep\b/.test(s)) continue;
      // Mirar una revision es correcto: ahi no hay nada sin rastrear.
      if (/\bHEAD\b|\b[0-9a-f]{7,}\b/.test(s)) continue;
      if (s.includes("--untracked")) continue;
      malos.push(s.slice(0, 90));
    }
  }
  assert.deepEqual(
    malos,
    [],
    "estos comandos cuentan sobre el indice archivos que la propia skill acaba de escribir, asi que devuelven vacio " +
      `y ese vacio se lee como exito:\n  ${malos.join("\n  ")}`,
  );

  // Y el allowlist tiene que permitir lo que la skill ahora usa.
  assert.match(t, /Bash\(grep:\*\)/, "la skill usa `grep` y su allowed-tools tiene que declararlo");
});

test("el paso que pide «los tres verdes» avisa del rojo que el paso anterior garantiza", () => {
  const t = skill();
  const p4 = t.indexOf("## Paso 4");
  const p5 = t.indexOf("## Paso 5");
  assert.ok(p4 !== -1 && p5 > p4, "la skill tiene que seguir teniendo los pasos 4 y 5 en ese orden");

  const cuerpo = t.slice(p4, p5);
  assert.match(cuerpo, /capability NUEVA|capability nueva/i, "el paso 4 tiene que nombrar el caso que lo pone rojo");
  assert.match(cuerpo, /Purpose: TBD/, "y decir cual es la causa concreta");
  assert.match(cuerpo, /Paso 5/, "y mandar al paso que lo arregla, en vez de dejar a la persona con un rojo sin salida");
  assert.match(cuerpo, /PRIMER change|primer change/i, "y decir que le pasa al primer change de todo proyecto, no a un caso raro");
});
