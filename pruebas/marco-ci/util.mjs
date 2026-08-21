// Utilidades del banco: repos git de juguete y corridas por codigo de salida.
//
// Regla del banco, la misma que la de la auditoria que lo motivo: una afirmacion
// vale por su CODIGO DE SALIDA. Nada de contar lineas de la salida ni de grepear
// el log para decidir si un caso paso; los helpers devuelven el exit y las
// aserciones se hacen sobre el. Donde hace falta mirar un mensaje se dice por
// que, y nunca es lo unico que sostiene el caso.
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, chmodSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

const aLimpiar = [];

export function carpetaTemporal(prefijo = "marco-ci-") {
  const ruta = mkdtempSync(join(tmpdir(), prefijo));
  aLimpiar.push(ruta);
  return ruta;
}

export function limpiarTodo() {
  while (aLimpiar.length > 0) {
    const ruta = aLimpiar.pop();
    try {
      rmSync(ruta, { recursive: true, force: true });
    } catch {
      // Un temporal que no se pudo borrar no invalida ninguna medicion.
    }
  }
}

export function escribir(raiz, relativa, contenido) {
  const destino = join(raiz, relativa);
  mkdirSync(dirname(destino), { recursive: true });
  writeFileSync(destino, contenido);
  return destino;
}

export function git(raiz, ...args) {
  return execFileSync("git", ["-C", raiz, ...args], { encoding: "utf8" });
}

/**
 * Repo de juguete: sin firma y sin hooks a proposito (el banco no prueba la
 * politica de commits, prueba los checks) y con identidad propia para no
 * depender de la configuracion global de la maquina.
 */
export function repoDeJuguete(prefijo = "repo-") {
  const raiz = carpetaTemporal(prefijo);
  git(raiz, "init", "--quiet", "--initial-branch=main");
  git(raiz, "config", "user.email", "banco@projects.invalid");
  git(raiz, "config", "user.name", "Banco del marco");
  git(raiz, "config", "commit.gpgsign", "false");
  return raiz;
}

export function commit(raiz, mensaje) {
  git(raiz, "add", "-A");
  git(raiz, "commit", "--quiet", "--no-gpg-sign", "-m", mensaje);
  return git(raiz, "rev-parse", "HEAD").trim();
}

/**
 * Corre un script de bash COMO LO CORRE EL RUNNER: `shell: bash` de Actions
 * escribe el bloque en un archivo temporal y lo invoca
 * `bash --noprofile --norc -e -o pipefail <archivo>`. El banco hace lo mismo, y
 * no por prolijidad: pasar el script como argumento de `bash -c` se rompe en
 * Windows, porque la capa MSYS re-parsea la linea de comandos y se come las
 * comillas simples que envuelven los programas de `node -e`. Por archivo el
 * texto llega intacto en cualquier plataforma Y es la forma real del runner.
 */
export function correrBash(script, { cwd, env = {} } = {}) {
  const runnerTemp = carpetaTemporal("runner-temp-");
  const guion = join(carpetaTemporal("guion-"), "paso.sh");
  writeFileSync(guion, script);
  const resultado = spawnSync(
    "bash",
    ["--noprofile", "--norc", "-e", "-o", "pipefail", guion.split("\\").join("/")],
    {
      cwd,
      encoding: "utf8",
      env: {
        PATH: process.env.PATH,
        HOME: process.env.HOME ?? process.env.USERPROFILE,
        SYSTEMROOT: process.env.SYSTEMROOT,
        RUNNER_TEMP: runnerTemp,
        GITHUB_EVENT_NAME: "pull_request",
        ...env,
      },
    },
  );
  if (resultado.error) throw resultado.error;
  return {
    exit: resultado.status,
    salida: `${resultado.stdout ?? ""}${resultado.stderr ?? ""}`,
    runnerTemp,
  };
}

/**
 * Corre un programa con `node -e`, igual que el paso. Devuelve exit y salida.
 */
export function correrNode(programa, { args = [], cwd, env = {} } = {}) {
  const resultado = spawnSync(process.execPath, ["-e", programa, ...args], {
    cwd,
    encoding: "utf8",
    env: { ...process.env, ...env },
  });
  if (resultado.error) throw resultado.error;
  return { exit: resultado.status, salida: `${resultado.stdout ?? ""}${resultado.stderr ?? ""}` };
}

/**
 * Un PATH con stubs por delante. Lo usa el caso del detector de secretos: el
 * paso descarga un binario, y sin red el paso muere por la descarga. El stub de
 * curl deja una SENA en disco, asi que el banco puede afirmar por existencia de
 * archivo —no por texto del log— si el paso llego a intentar la descarga o si
 * corto antes.
 */
export function stubCurlQueFalla(senal) {
  const bin = carpetaTemporal("stub-bin-");
  const ruta = join(bin, "curl");
  writeFileSync(
    ruta,
    ["#!/bin/sh", `printf '%s\\n' "$@" >> "${senal.split("\\").join("/")}"`, "exit 7", ""].join("\n"),
  );
  chmodSync(ruta, 0o755);
  return bin;
}
