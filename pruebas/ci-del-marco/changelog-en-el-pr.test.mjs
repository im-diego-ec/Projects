// BANCO DEL PASO QUE EXIGE EL CHANGELOG EN EL PR.
//
// El paso vive INLINE en el `run:` de `.github/workflows/ci.yml`, y un paso inline
// sin banco es lo que este marco encontro cuatro defectos atras: codigo que llega
// a decidir un veredicto sin que nada lo haya ejecutado nunca sobre un caso
// controlado.
//
// El banco no COPIA el script —una copia se desincroniza y miente—: lo extrae del
// YAML con el mismo extractor que ya usa el banco de marco-ci.yml, y lo corre
// contra repositorios de prueba armados a mano. Si el paso se renombra o pierde su
// bloque `run:`, el extractor tira y esto se pone rojo en vez de dejar de probar.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { scriptDelPaso } from "../marco-ci/extraer.mjs";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const CI = path.join(RAIZ, ".github", "workflows", "ci.yml");
const PASO = "El PR que cambia el marco toca el CHANGELOG";

const script = scriptDelPaso(PASO, CI);

test("el extractor encontro el paso, y el script no salio vacio", () => {
  assert.ok(script.length > 200, `el script salio de ${script.length} caracteres: el extractor fallo`);
  assert.match(script, /SUPERFICIES=/, "el script tiene que declarar las superficies que vigila");
  assert.match(script, /CHANGELOG/, "el script tiene que mirar el CHANGELOG");
});

/**
 * Un repositorio de prueba con dos commits: la base y la cabeza. Devuelve los dos
 * SHA, que es lo que el paso recibe por env.
 *
 * El commit de fixture va SIN firma a proposito: no es historia del proyecto, es
 * un repositorio desechable dentro de un directorio temporal, y firmarlo obligaria
 * a tener la clave disponible en CI para que el banco corra.
 */
function repoConDiff(archivosDeLaCabeza, { archivosDeLaBase = ["README.md"] } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "projects-changelog-"));
  const git = (...args) =>
    execFileSync(
      "git",
      ["-c", "user.name=banco", "-c", "user.email=banco@local", "-c", "commit.gpgsign=false", ...args],
      { cwd: dir, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
    );

  git("init", "--quiet", "--initial-branch=main");
  for (const rel of archivosDeLaBase) {
    fs.mkdirSync(path.join(dir, path.dirname(rel)), { recursive: true });
    fs.writeFileSync(path.join(dir, rel), "base\n", "utf8");
  }
  git("add", "-A");
  git("commit", "--quiet", "-m", "base");
  const base = git("rev-parse", "HEAD").trim();

  for (const rel of archivosDeLaCabeza) {
    fs.mkdirSync(path.join(dir, path.dirname(rel)), { recursive: true });
    fs.writeFileSync(path.join(dir, rel), "cabeza\n", "utf8");
  }
  git("add", "-A");
  git("commit", "--quiet", "-m", "cabeza");
  const cabeza = git("rev-parse", "HEAD").trim();

  return { dir, base, cabeza };
}

/** Corre el paso extraido sobre un repo de prueba. */
function correr({ dir, base, cabeza }) {
  const r = spawnSync("bash", ["-c", script], {
    cwd: dir,
    encoding: "utf8",
    env: { ...process.env, BASE: base, CABEZA: cabeza },
  });
  return { exit: r.status, salida: (r.stdout ?? "") + (r.stderr ?? "") };
}

function conRepo(archivos, opciones, f) {
  const repo = repoConDiff(archivos, opciones);
  try {
    return f(repo);
  } finally {
    fs.rmSync(repo.dir, { recursive: true, force: true });
  }
}

test("un PR que cambia el marco y NO toca el CHANGELOG es ROJO, y dice cual superficie", () => {
  conRepo(["actions/nueva/action.yml"], {}, (repo) => {
    const { exit, salida } = correr(repo);
    assert.equal(exit, 1, salida);
    assert.match(salida, /::error::/);
    assert.match(salida, /actions/, "el rojo tiene que nombrar la superficie que se toco");
    assert.match(salida, /No publicado/, "y tiene que decir DONDE va la entrada");
  });
});

test("un PR que cambia el marco y SI toca el CHANGELOG es verde", () => {
  conRepo(["actions/nueva/action.yml", "CHANGELOG.md"], {}, (repo) => {
    const { exit, salida } = correr(repo);
    assert.equal(exit, 0, salida);
    assert.match(salida, /OK/);
  });
});

test("las cuatro superficies que viajan al consumidor disparan la exigencia", () => {
  for (const rel of [
    "actions/x/action.yml",
    ".github/workflows/x.yml",
    "plantilla/x.json",
    "herramientas/x.mjs",
  ]) {
    conRepo([rel], {}, (repo) => {
      const { exit, salida } = correr(repo);
      assert.equal(exit, 1, `${rel} tenia que exigir CHANGELOG:\n${salida}`);
    });
  }
});

test("un PR que solo toca docs u openspec NO exige CHANGELOG", () => {
  // La frontera esta puesta a proposito: esas superficies no viajan por el carril
  // referenciado, asi que no le mueven el piso a ningun consumidor.
  for (const rel of ["docs/algo.md", "openspec/changes/x/proposal.md", "pruebas/x.test.mjs"]) {
    conRepo([rel], {}, (repo) => {
      const { exit, salida } = correr(repo);
      assert.equal(exit, 0, `${rel} no tenia que exigir CHANGELOG:\n${salida}`);
      assert.match(salida, /no toca ninguna superficie/);
    });
  }
});

test("un CHANGELOG de otro directorio NO cuenta: el ancla esta al inicio de la ruta", () => {
  // `plantilla/CHANGELOG.md` no es el changelog del marco. Si el grep no estuviera
  // anclado, tocarlo alcanzaria para pasar el check sin haber anotado nada.
  conRepo(["actions/x/action.yml", "plantilla/CHANGELOG.md"], {}, (repo) => {
    const { exit, salida } = correr(repo);
    assert.equal(exit, 1, salida);
  });
});

test("si el commit base no se puede resolver, el paso falla CERRADO", () => {
  conRepo(["actions/x/action.yml"], {}, (repo) => {
    const r = spawnSync("bash", ["-c", script], {
      cwd: repo.dir,
      encoding: "utf8",
      env: { ...process.env, BASE: "0".repeat(40), CABEZA: repo.cabeza },
    });
    const salida = (r.stdout ?? "") + (r.stderr ?? "");
    assert.equal(r.status, 1, salida);
    assert.match(salida, /no pude resolver el commit base/);
    assert.match(salida, /fetch-depth/, "el rojo tiene que traer el arreglo");
  });
});

test("un diff vacio NO se reporta como exito", () => {
  // Base y cabeza en el mismo commit: `git diff` no devuelve nada. Eso no es un PR
  // vacio —no existen— es un diff que no se pudo leer, y se trata como fallo.
  conRepo(["actions/x/action.yml"], {}, (repo) => {
    const r = spawnSync("bash", ["-c", script], {
      cwd: repo.dir,
      encoding: "utf8",
      env: { ...process.env, BASE: repo.cabeza, CABEZA: repo.cabeza },
    });
    const salida = (r.stdout ?? "") + (r.stderr ?? "");
    assert.equal(r.status, 1, salida);
    assert.match(salida, /salio vacio/);
  });
});
