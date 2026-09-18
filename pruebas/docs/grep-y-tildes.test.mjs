// UN CERO DE `grep` SOBRE PROSA CON TILDES NO ES UNA VERIFICACION.
//
// La regla vive en docs/11-reglas-no-escritas.md (regla 11) y NO tiene compuerta:
// es una practica de medicion, y distinguir a maquina un `grep` bien escrito de
// uno que no puede matchear exige adivinar la intencion de quien lo escribio.
// Lo que este banco SI hace es que la regla no pueda envejecer mintiendo: mide,
// con el `git` de la maquina, el comportamiento que la pagina afirma, y exige que
// la pagina lo siga diciendo.
//
// ORIGEN: Rigel 2.5.0, change archivado `2026-09-10-pendientes-con-destino`,
// commit 89e89c7 (hallazgo H3, 2026-09-10): un design apoyaba una conclusion en
// `git grep -in 'revisi.n trimestral'`, que daba 0; con dos puntos daba 22.
//
// LO QUE LA MEDICION DE PROJECTS CORRIGE DE ESA LECCION (2026-09-18, git 2.54 en
// macOS): no es que `git grep` "compare bytes" siempre. Depende del locale del
// proceso. Con `LC_ALL=C` —o POSIX— el `.` ve bytes y la «ó», que son dos, no
// matchea nunca: cero falso. Con un locale UTF-8 —el del runner de GitHub y el de
// la mayoria de las terminales— el mismo `.` SI la matchea. O sea: el mismo
// comando da 0 en una maquina y 3 en otra, y ninguna de las dos avisa. Por eso el
// banco fija solo lo que no depende de la maquina: lo que pasa en `LC_ALL=C`, que
// todo sistema tiene, y las dos formas que funcionan en cualquier locale.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const REGLAS = path.join(RAIZ, "docs", "11-reglas-no-escritas.md");

function repoCon(texto) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "grep-tildes-"));
  execFileSync("git", ["-C", dir, "init", "-q"]);
  fs.writeFileSync(path.join(dir, "prosa.md"), texto, "utf8");
  execFileSync("git", ["-C", dir, "add", "prosa.md"]);
  return dir;
}

/** Cuantas lineas matchean, con el locale forzado. `git grep -c` sale 1 y no
 *  imprime nada cuando no hay coincidencias: eso es un cero, no un error. */
function contar(dir, locale, ...args) {
  const r = spawnSync("git", ["-C", dir, "grep", "-c", ...args, "--", "prosa.md"], {
    encoding: "utf8",
    env: { ...process.env, LC_ALL: locale, LANG: locale },
  });
  if (r.status === 1 && r.stdout === "") return 0;
  assert.equal(r.status, 0, `git grep salio ${r.status}: ${r.stderr}`);
  return Number(r.stdout.trim().split(":").pop());
}

test("en LC_ALL=C, un `.` sobre una letra con tilde da un cero FALSO; el literal y la alternancia no", () => {
  const dir = repoCon("La revisión trimestral se hace cada trimestre.\nOtra revisión trimestral.\n");
  try {
    // El control: la palabra esta, dos veces.
    assert.equal(contar(dir, "C", "-F", "revisión trimestral"), 2, "el literal no encontro lo que esta escrito: el control no sirve");
    // El cero falso que la regla existe para evitar.
    assert.equal(contar(dir, "C", "revisi.n trimestral"), 0, "en LC_ALL=C el `.` matcheo la «ó»: la regla 11 de docs/11 afirma algo que esta maquina desmiente");
    // Las dos formas que la regla recomienda, y que valen en cualquier locale.
    assert.equal(contar(dir, "C", "-E", "revisi(ó|o)n trimestral"), 2);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("docs/11 trae la regla, con el cero falso y las dos formas que funcionan", () => {
  const texto = fs.readFileSync(REGLAS, "utf8");
  assert.match(texto, /^## 11\. .*tilde/im, "docs/11 no tiene la regla del cero falso de grep sobre prosa con tildes");
  assert.match(texto, /LC_ALL=C/, "la regla no dice de que depende el cero falso");
  assert.match(texto, /git grep -F/, "la regla no da la forma literal");
  assert.match(texto, /\(ó\|o\)/, "la regla no da la forma con alternancia");
});
