// TODO CAMINO DE NACIMIENTO DEJA EL LOCKFILE QUE EL PRIMER CI EXIGE.
//
// QUE DEFECTO CIERRA. El `ci.yml` que reparte el andamio instala con
// `pnpm install --frozen-lockfile` en sus dos jobs, y el andamio NO trae
// lockfile: lo escribe el primer `pnpm install` del proyecto. El arranque de
// `projects init` lo corre, pero la via sin programas —`personalizar.yml`, la
// puerta de quien no abre una terminal— llama a la herramienta con
// `--sin-arranque`, vacia el repositorio, copia el proyecto recien armado y lo
// guarda. Medido el 2026-09-17 sobre una aplicacion instanciada asi: sin
// `pnpm-lock.yaml`, y `pnpm install --frozen-lockfile` sale 1 con
// ERR_PNPM_NO_LOCKFILE. O sea que el primer push de cada proyecto nacido por
// esa via moria en el primer paso que instala, por algo que la persona no
// escribio y no tiene como arreglar sin una terminal.
//
// POR QUE NO SE VERSIONA UN LOCKFILE EN EL ANDAMIO, que es lo que hizo Rigel
// (2.6.0, change `2026-09-13-el-andamio-pasa-su-propia-cadena`, commit 4d0bd19).
// El andamio de Projects se PODA por forma y plataforma: una aplicacion y un
// sitio no instalan los mismos paquetes, y `--frozen-lockfile` falla cuando los
// importers del lock no coinciden con el workspace. Lo que se porta es la
// PROPIEDAD —ningun camino guarda un repo sin lockfile—, no el archivo.
//
// LO QUE ESTE BANCO EXIGE, evaluando el paso y no buscando texto:
//   1. el paso existe en `personalizar.yml` y esta entre el que ARMA el proyecto
//      y el que lo COPIA al repositorio (antes del guardado);
//   2. corrido con un `corepack` falso: resuelve sin ejecutar codigo de
//      dependencias (`--lockfile-only --ignore-scripts`, en un job cuyo token
//      puede escribir) y sale verde solo si el lockfile quedo escrito; si pnpm
//      falla, o sale 0 sin dejar el archivo, o lo deja vacio, sale ROJO con el
//      arreglo escrito;
//   3. el paso que copia el proyecto lleva el lockfile al repositorio, y el
//      `.gitignore` del andamio deja que el guardado lo incluya;
//   4. el otro camino —el arranque de la herramienta— empieza por un install
//      completo, que es el que escribe el lockfile.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync, execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { scriptDelPaso } from "../marco-ci/extraer.mjs";
import { PASOS_DEL_ARRANQUE } from "../../herramientas/projects-init.mjs";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const PUERTA = path.join(RAIZ, "herramientas", "plantilla-repos", "personalizar.yml");
const PASO = "Dejar el lockfile que el primer CI exige";
const ARMA = "Armar el proyecto con tus valores";
const COPIA = "Poner tus valores, sin tocar los workflows";
const GUARDA = "Guardarlo";

/** La linea (0-indexada) donde arranca un paso, o -1. */
function lineaDelPaso(texto, nombre) {
  return texto.split(/\r?\n/).findIndex((l) => l.trim() === `- name: ${nombre}`);
}

function enTemporal(fn) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "projects-lockfile-"));
  try {
    return fn(tmp);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

/** Un `corepack` falso. Anota con que argumentos y desde donde lo llamaron, y
 *  hace lo que el caso pide: escribir el lockfile, fallar, salir 0 sin escribir
 *  nada, o dejarlo vacio. */
function corepackFalso(dir) {
  const bin = path.join(dir, "bin");
  fs.mkdirSync(bin, { recursive: true });
  const ruta = path.join(bin, "corepack");
  fs.writeFileSync(
    ruta,
    [
      "#!/bin/sh",
      'printf "%s\\n" "$*" > "$REGISTRO"',
      'printf "%s\\n" "$PWD" >> "$REGISTRO"',
      'case "$MODO_FALSO" in',
      "  escribe) printf 'lockfileVersion: 9.0\\n' > pnpm-lock.yaml; exit 0 ;;",
      "  falla) echo 'ERR_PNPM_FALSO no hay registro' >&2; exit 1 ;;",
      "  mudo) exit 0 ;;",
      "  vacio) : > pnpm-lock.yaml; exit 0 ;;",
      "esac",
      "exit 3",
      "",
    ].join("\n"),
  );
  fs.chmodSync(ruta, 0o755);
  return bin;
}

/** Corre el paso extraido del YAML con el shell que usa el runner. */
function correrPaso(modo) {
  const script = scriptDelPaso(PASO, PUERTA);
  return enTemporal((tmp) => {
    const proyecto = path.join(tmp, "proyecto");
    fs.mkdirSync(proyecto, { recursive: true });
    fs.writeFileSync(path.join(proyecto, "package.json"), '{ "name": "x", "private": true }\n');
    const archivo = path.join(tmp, "paso.sh");
    fs.writeFileSync(archivo, script);
    const registro = path.join(tmp, "registro.txt");
    const bin = corepackFalso(tmp);
    const r = spawnSync("bash", ["--noprofile", "--norc", "-eo", "pipefail", archivo], {
      cwd: tmp,
      encoding: "utf8",
      env: { PATH: `${bin}:/usr/bin:/bin`, RUNNER_TEMP: tmp, REGISTRO: registro, MODO_FALSO: modo, HOME: tmp },
    });
    const llamada = fs.existsSync(registro) ? fs.readFileSync(registro, "utf8").split("\n") : [];
    const lock = path.join(proyecto, "pnpm-lock.yaml");
    return {
      codigo: r.status,
      salida: `${r.stdout}\n${r.stderr}`,
      args: llamada[0] ?? null,
      desde: llamada[1] ? fs.realpathSync(llamada[1]) : null,
      proyecto: fs.realpathSync(proyecto),
      lockfile: fs.existsSync(lock) ? fs.readFileSync(lock, "utf8") : null,
    };
  });
}

test("personalizar.yml deja el lockfile entre ARMAR el proyecto y COPIARLO al repositorio", () => {
  const yml = fs.readFileSync(PUERTA, "utf8");
  const [arma, paso, copia, guarda] = [ARMA, PASO, COPIA, GUARDA].map((n) => lineaDelPaso(yml, n));
  assert.notEqual(arma, -1, `personalizar.yml perdio el paso «${ARMA}»: este banco quedo sin ancla`);
  assert.notEqual(
    paso,
    -1,
    `personalizar.yml no tiene el paso «${PASO}». Sin el, el proyecto se guarda sin pnpm-lock.yaml y el primer ` +
      "CI muere en `pnpm install --frozen-lockfile` con ERR_PNPM_NO_LOCKFILE. Arreglo: agregar el paso despues de " +
      `«${ARMA}» con \`corepack pnpm install --lockfile-only --ignore-scripts\` en \${RUNNER_TEMP}/proyecto`,
  );
  assert.ok(arma < paso, `«${PASO}» corre antes de que exista el proyecto que tiene que resolver`);
  assert.ok(paso < copia, `«${PASO}» corre despues de la copia: el lockfile no llegaria al repositorio`);
  assert.ok(copia < guarda, `«${GUARDA}» corre antes de la copia: este banco dejo de describir la puerta`);
});

test("con pnpm resolviendo: sale verde, deja el lockfile y no ejecuta codigo de dependencias", () => {
  const r = correrPaso("escribe");
  assert.equal(r.codigo, 0, `el paso tenia que salir 0 con el lockfile escrito:\n${r.salida}`);
  assert.ok(r.lockfile, "el paso salio 0 y el proyecto no tiene pnpm-lock.yaml");
  assert.equal(r.desde, r.proyecto, "el paso resolvio el lockfile fuera del proyecto recien armado");
  // Las dos banderas son el motivo de que este paso pueda correr en un job con
  // `contents: write` y `actions: write`: `--lockfile-only` no baja paquetes y
  // `--ignore-scripts` no ejecuta ninguno de sus scripts de instalacion.
  assert.match(r.args ?? "", /^pnpm install\b/, `corepack no se llamo con pnpm install: ${r.args}`);
  assert.match(r.args ?? "", /--lockfile-only/, "sin --lockfile-only el paso instala el arbol entero en un job que puede escribir en el repositorio");
  assert.match(r.args ?? "", /--ignore-scripts/, "sin --ignore-scripts el paso ejecuta scripts de dependencias con un token que puede escribir");
});

for (const [modo, que] of [
  ["falla", "pnpm sale distinto de cero"],
  ["mudo", "pnpm sale 0 y no escribe el lockfile"],
  ["vacio", "pnpm deja un lockfile vacio"],
]) {
  test(`ROJO cuando ${que}, con el arreglo escrito`, () => {
    const r = correrPaso(modo);
    assert.notEqual(r.codigo, 0, `el paso salio 0 cuando ${que}: el proyecto se guardaria sin lockfile\n${r.salida}`);
    assert.match(r.salida, /::error::/, "el rojo no deja una anotacion ::error:: que se lea en la corrida");
    assert.match(r.salida, /Arreglo:/, "el rojo no dice como se arregla");
  });
}

test("la copia lleva el lockfile al repositorio y el .gitignore del andamio deja guardarlo", () => {
  const copiar = scriptDelPaso(COPIA, PUERTA);
  enTemporal((tmp) => {
    const runner = path.join(tmp, "runner");
    const repo = path.join(tmp, "repo");
    const proyecto = path.join(runner, "proyecto");
    fs.mkdirSync(path.join(proyecto, ".github", "workflows"), { recursive: true });
    fs.mkdirSync(path.join(repo, ".github", "workflows"), { recursive: true });
    fs.mkdirSync(path.join(repo, ".marco"), { recursive: true });
    fs.writeFileSync(path.join(proyecto, "pnpm-lock.yaml"), "lockfileVersion: 9.0\n");
    fs.copyFileSync(path.join(RAIZ, "plantilla", ".gitignore"), path.join(proyecto, ".gitignore"));
    fs.writeFileSync(path.join(runner, "desvios.json"), "{}\n");
    fs.writeFileSync(path.join(repo, ".github", "workflows", "ci.yml"), "name: CI\n");
    execFileSync("git", ["init", "-q", repo]);
    const archivo = path.join(tmp, "copia.sh");
    fs.writeFileSync(archivo, copiar);
    const r = spawnSync("bash", ["--noprofile", "--norc", "-eo", "pipefail", archivo], {
      cwd: repo,
      encoding: "utf8",
      env: { PATH: "/usr/bin:/bin", RUNNER_TEMP: runner, HOME: tmp },
    });
    assert.equal(r.status, 0, `el paso de copia fallo sobre un arbol minimo:\n${r.stdout}\n${r.stderr}`);
    assert.ok(fs.existsSync(path.join(repo, "pnpm-lock.yaml")), "la copia no llevo pnpm-lock.yaml al repositorio");
    const ignorado = spawnSync("git", ["check-ignore", "-q", "pnpm-lock.yaml"], { cwd: repo });
    assert.equal(
      ignorado.status,
      1,
      "el .gitignore del andamio ignora el pnpm-lock.yaml de la raiz: `git add -A` no lo guardaria y el primer CI " +
        "moriria igual. Arreglo: conservar la negacion `!/pnpm-lock.yaml` despues de `**/pnpm-lock.yaml`",
    );
  });
});

test("el arranque de la herramienta empieza por un install completo, que es el que escribe el lockfile", () => {
  const [primero] = PASOS_DEL_ARRANQUE;
  assert.equal(primero?.args?.[0], "install", "el primer paso del arranque dejo de ser `pnpm install`");
  for (const bandera of ["--lockfile-only", "--frozen-lockfile", "--ignore-scripts"]) {
    assert.ok(
      !primero.args.includes(bandera),
      `el install del arranque lleva ${bandera}: o no escribe el lockfile, o no deja el arbol listo para los pasos siguientes`,
    );
  }
});
