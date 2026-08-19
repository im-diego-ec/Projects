// Banco de pruebas del comparador de cobertura: arma repositorios git de
// verdad en un directorio temporal y corre el script como lo corre la action
// (proceso aparte, mismas variables de entorno). Nada de simulacros: el script
// vive de `git diff` y de rutas reales, y un doble de prueba solo probaria el
// doble.
//
// Este archivo NO es una prueba (no termina en .test.mjs): `node --test` no lo
// levanta como suite.
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

export const AQUI = dirname(fileURLToPath(import.meta.url));
export const SCRIPT = join(AQUI, "..", "medir-cobertura-diff.mjs");
export const FIXTURES = join(AQUI, "fixtures");

// Configuracion explicita en cada invocacion: la maquina de quien corre las
// pruebas puede tener firma de commits obligatoria, otro nombre de rama por
// defecto o autocrlf encendido, y ninguna de esas cosas puede decidir si la
// suite pasa.
const CONFIG = [
  "-c",
  "user.name=Pruebas Projects",
  "-c",
  "user.email=pruebas@example.invalid",
  "-c",
  "commit.gpgsign=false",
  "-c",
  "core.autocrlf=false",
  "-c",
  "init.defaultBranch=principal",
  "-c",
  "gc.auto=0",
];

const creados = [];

export function git(dir, args) {
  return execFileSync("git", [...CONFIG, ...args], {
    cwd: dir,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

export function repoNuevo() {
  const dir = mkdtempSync(join(tmpdir(), "projects-cobertura-"));
  creados.push(dir);
  git(dir, ["init", "--quiet"]);
  return dir;
}

export function limpiar() {
  while (creados.length) {
    const dir = creados.pop();
    try {
      rmSync(dir, { recursive: true, force: true, maxRetries: 5 });
    } catch {
      // En Windows un handle abierto puede impedir el borrado: es basura en
      // el temporal del sistema, no un fallo de la prueba.
    }
  }
}

export function escribir(dir, ruta, contenido) {
  const destino = join(dir, ruta);
  mkdirSync(dirname(destino), { recursive: true });
  writeFileSync(destino, contenido);
}

export function fixture(nombre) {
  return readFileSync(join(FIXTURES, nombre), "utf8");
}

export function copiarFixture(dir, nombre, ruta) {
  escribir(dir, ruta, fixture(nombre));
}

export function commit(dir, mensaje) {
  git(dir, ["add", "-A"]);
  git(dir, ["commit", "--quiet", "-m", mensaje]);
  return git(dir, ["rev-parse", "HEAD"]).trim();
}

/**
 * Corre el comparador contra `dir` y devuelve todo lo observable: codigo de
 * salida, stdout, stderr, el resumen de la corrida y las salidas publicadas.
 * Los dos archivos de GitHub se escriben dentro de .git/ para que no aparezcan
 * como archivos del repositorio ni ensucien un diff posterior.
 */
export function correr(dir, env = {}) {
  const resumen = join(dir, ".git", "resumen-de-la-prueba.md");
  const salidas = join(dir, ".git", "salidas-de-la-prueba.txt");
  writeFileSync(resumen, "");
  writeFileSync(salidas, "");

  const entorno = { ...process.env };
  for (const clave of Object.keys(entorno)) {
    if (clave.startsWith("COBERTURA_")) delete entorno[clave];
  }

  const r = spawnSync(process.execPath, [SCRIPT], {
    cwd: dir,
    encoding: "utf8",
    env: {
      ...entorno,
      GITHUB_STEP_SUMMARY: resumen,
      GITHUB_OUTPUT: salidas,
      ...env,
    },
  });

  const publicadas = {};
  for (const linea of readFileSync(salidas, "utf8").split(/\r?\n/)) {
    const i = linea.indexOf("=");
    if (i > 0) publicadas[linea.slice(0, i)] = linea.slice(i + 1);
  }

  const stdout = r.stdout ?? "";
  const stderr = r.stderr ?? "";
  return {
    codigo: r.status,
    stdout,
    stderr,
    todo: `${stdout}\n${stderr}`,
    resumen: readFileSync(resumen, "utf8"),
    salidas: publicadas,
  };
}

/**
 * Repositorio base de casi todas las pruebas: un paquete `web` con un archivo
 * fuente ya versionado. Devuelve el sha de ese primer commit, que es la BASE
 * del rango que se mide.
 */
export function repoConBase() {
  const dir = repoNuevo();
  escribir(dir, "web/src/suma.ts", fixture("suma-v1.ts"));
  escribir(dir, "web/src/otro.ts", "export const otro = 1;\n");
  escribir(dir, "README.md", "# Proyecto de prueba\n");
  const base = commit(dir, "base");
  return { dir, base };
}
