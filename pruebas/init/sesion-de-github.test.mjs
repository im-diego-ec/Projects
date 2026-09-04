import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { PATRON_DE_SESION, sesionDeGitHub } from "../../herramientas/projects-doctor.mjs";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

// ---------------------------------------------------------------------------
// EL PASO 0 LE DECIA "NO ENTRASTE" A QUIEN SI HABIA ENTRADO.
//
// `sesionDeGitHub` leia `gh auth status` SOLO por stdout y exigia la palabra
// literal «account». Las dos cosas son propiedades de las versiones NUEVAS de
// gh: durante anios ese comando escribio por STDERR y decia «Logged in to
// github.com as usuario», sin «account».
//
// O sea que en una maquina con un gh de hace un tiempo --justo las que no se
// actualizan solas, que son las de la gente a la que esta guia apunta-- el
// comprobador daba un rojo, y el arreglo que ofrecia era `gh auth login`, que no
// arregla nada porque no habia nada roto. Un falso rojo en la PRIMERA pantalla
// del recorrido es el peor de todos: quien lo ve concluye que la herramienta no
// funciona y se va.
//
// EL BANCO ANTERIOR NO PODIA VERLO: inyectaba `{adentro: true}` a mano, asi que
// el unico pedazo falible --el parseo de la salida de gh-- corria sin nadie
// mirando.
// ---------------------------------------------------------------------------

test("las DOS redacciones de gh se reconocen, la vieja y la nueva", () => {
  const nueva = "github.com\n  ✓ Logged in to github.com account im-diego-ec (keyring)\n";
  const vieja = "github.com\n  ✓ Logged in to github.com as im-diego-ec (oauth_token)\n";
  for (const [como, texto] of [
    ["la nueva", nueva],
    ["la vieja", vieja],
  ]) {
    const m = PATRON_DE_SESION.exec(texto);
    assert.ok(m, `no reconoce ${como} redaccion de gh auth status`);
    assert.equal(m[1], "im-diego-ec", `${como} redaccion: leyo "${m[1]}" en vez de la cuenta`);
  }
});

test("no da por buena una salida que NO dice que hay sesion", () => {
  // Sin esto el patron de arriba podria estar aceptando cualquier cosa.
  for (const t of ["", "You are not logged into any GitHub hosts", "gh: command not found"]) {
    assert.equal(PATRON_DE_SESION.exec(t), null, `dio por buena la salida "${t}"`);
  }
});

/** Un `gh` de mentira que contesta lo que se le diga, por el canal que se le diga. */
function conGhFalso(guion, fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "gh-falso-"));
  const bin = path.join(dir, process.platform === "win32" ? "gh.cmd" : "gh");
  fs.writeFileSync(bin, guion, { mode: 0o755 });
  const antes = process.env.PATH;
  process.env.PATH = `${dir}${path.delimiter}${antes}`;
  try {
    return fn();
  } finally {
    process.env.PATH = antes;
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

const SOLO_UNIX = process.platform === "win32" ? { skip: "el guion de mentira es de shell" } : {};

test("MEDIDO: un gh viejo que escribe por STDERR se reconoce igual", SOLO_UNIX, () => {
  // Es el caso exacto que daba el falso rojo. `gh api` falla (como en un gh viejo
  // sin esa via o sin red) y el respaldo tiene que leer stderr.
  const r = conGhFalso(
    '#!/bin/sh\nif [ "$1" = "api" ]; then exit 1; fi\n' +
      'echo "github.com" >&2\necho "  ✓ Logged in to github.com as im-diego-ec (oauth_token)" >&2\nexit 0\n',
    () => sesionDeGitHub(),
  );
  assert.deepEqual(r, { adentro: true, cuenta: "im-diego-ec" }, "un gh que contesta por stderr salio como 'no entraste'");
});

test("MEDIDO: `gh api user` alcanza sin mirar una sola frase en ingles", SOLO_UNIX, () => {
  // Es la via preferida: un dato de una linea, por stdout, igual en toda version.
  // Colgar el Paso 0 de una frase que sus autores pueden reescribir es colgarlo de nada.
  const r = conGhFalso('#!/bin/sh\nif [ "$1" = "api" ]; then echo "im-diego-ec"; exit 0; fi\nexit 1\n', () => sesionDeGitHub());
  assert.deepEqual(r, { adentro: true, cuenta: "im-diego-ec" });
});

test("MEDIDO: sin sesion sigue diciendo que no hay sesion", SOLO_UNIX, () => {
  // La mitad que importa del otro lado: si esto diera 'adentro' siempre, el Paso 0
  // dejaria pasar a alguien que despues choca en el primer push.
  const r = conGhFalso('#!/bin/sh\necho "You are not logged into any GitHub hosts" >&2\nexit 1\n', () => sesionDeGitHub());
  assert.deepEqual(r, { adentro: false, cuenta: null });
});

test("MEDIDO: una respuesta con forma rara de `gh api` no se toma como cuenta", SOLO_UNIX, () => {
  // `gh api` puede contestar un JSON de error, o HTML de un proxy. Nada de eso es
  // un nombre de cuenta, y tomarlo como tal diria "entraste como {message:...}".
  const r = conGhFalso(
    '#!/bin/sh\nif [ "$1" = "api" ]; then echo \'{"message":"Bad credentials"}\'; exit 0; fi\n' +
      'echo "You are not logged into any GitHub hosts" >&2\nexit 1\n',
    () => sesionDeGitHub(),
  );
  assert.deepEqual(r, { adentro: false, cuenta: null }, "tomo una respuesta de error como nombre de cuenta");
});

test("el comprobador ya no descarta stderr", () => {
  const s = fs.readFileSync(path.join(RAIZ, "herramientas/projects-doctor.mjs"), "utf8");
  assert.match(s, /if \(juntarStderr\) \{\n    const r = spawnSync/, "dejo de leer los dos canales cuando se lo piden");
  assert.match(s, /\$\{r\.stdout \?\? ""\}\$\{r\.stderr \?\? ""\}/, "volvio a descartar stderr");
  assert.match(s, /\["api", "user", "--jq", "\.login"\], true/, "dejo de preguntar por la via que no depende del texto");
});
