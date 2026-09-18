// UN PROYECTO NUEVO NACE CON LA CONSTITUCION DE LA VERSION QUE SU CI VERIFICA.
//
// EL DEFECTO, medido el 2026-09-18 por la revision adversarial del porte
// (hallazgo RV-L3L11-01). `projects-init` renderizaba la porcion del marco con la
// action DEL CLON —el arbol de main— y el CI del proyecto la verifica con la
// action DEL TAG que pina su `ci.yml`. Mientras el clon lleve un canonico que
// ningun release publico todavia (la 1.10.0 del porte, contra un andamio que pina
// v1.9.6, cuyo canonico termina en la 1.7.0), el proyecto nace con dos
// `::error::` —«declara la version 1.10.0 y esta copia del marco es la 1.7.0 …
// ningun ESCRITOR de este repo pudo haberlo escrito»—, `ci-ok` en rojo y
// `desplegar.yml` sin dispararse nunca. En local salia verde, porque se verificaba
// con la misma action del clon. Es la clase de `dad5566`, por otro camino.
//
// EL PRECEDENTE ya estaba en el marco: `herramientas/plantilla-repos/personalizar.yml`
// trae el marco en la version que el `ci.yml` del proyecto declara, «no `main`»,
// y por el mismo motivo medido.
//
// LO QUE ESTE BANCO FIJA:
//   1. Con el tag del pin en el clon, el render usa la action de ESE tag.
//   2. Sin el tag (una descarga en ZIP, un clon sin tags) y con un canonico en el
//      clon MAS NUEVO que el pin, la corrida sigue —no se le cierra el camino a
//      nadie— pero lo dice con un `::warning::` que nombra el pin y el rojo que
//      viene, y el comando que lo evita.
//   3. Sin el tag y con un canonico que el pin ya publica, no hay aviso: el clon y
//      el tag dicen lo mismo, y un aviso ahi es ruido para quien arranca con doble
//      clic.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync, spawnSync } from "node:child_process";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const ANDAMIO = path.join(RAIZ, "plantilla");
const HERRAMIENTA = path.join(RAIZ, "herramientas/projects-init.mjs");

/** El pin de la constitucion que el andamio real le da a cada proyecto. */
const PIN = /\/actions\/constitucion@(v\d+\.\d+\.\d+)\b/.exec(
  fs.readFileSync(path.join(ANDAMIO, ".github/workflows/ci.yml"), "utf8"),
)?.[1];

const VALORES = {
  PROYECTO: "people-agenda",
  ORG: "Ejemplo-Org",
  PAQUETE_API: "api",
  PAQUETE_WEB: "web",
  PAQUETE_E2E: "e2e",
  PAQUETE_SITIO: "sitio",
  ORG_MARCO: "im-diego-ec",
  GENERAR_CLIENTE_DATOS: "prisma generate",
  EQUIPO_BUILDERS: "builders",
  EQUIPO_PO: "po",
  BUILDER_1: "builder-uno",
  BUILDER_2: "builder-dos",
  PO: "el-po",
  CUENTA_DEV: "111111111111",
  CUENTA_PROD: "222222222222",
  REGION: "us-east-1",
  PERFIL_DEV: "perfil-dev",
  PERFIL_PROD: "perfil-prod",
  PREFIJO_RECURSOS: "agenda",
  DOMINIO_DEV: "agenda-dev.ejemplo.com",
  DOMINIO_PROD: "agenda.ejemplo.com",
  CANAL_ALERTAS: "#alertas-prod",
  ID_MCP_SLACK: "id-de-slack",
};

const tmp = (nombre) => fs.mkdtempSync(path.join(os.tmpdir(), `projects-init-pin-${nombre}-`));

/** Una action de constitucion de mentira que deja escrito DE DONDE salio: hace lo
 *  que hace el modo escribir real (escribe y declara `artefactos`), y nada mas. */
const constitucionQueFirma = (quien) =>
  [
    "import fs from 'node:fs';",
    "fs.mkdirSync('.projects', { recursive: true });",
    `fs.writeFileSync('.projects/AGENTS-marco.md', 'render ${quien}\\n');`,
    "fs.appendFileSync(process.env.GITHUB_OUTPUT, 'artefactos=.projects/AGENTS-marco.md\\n');",
  ].join("\n");

const manifiestoCon = (version) =>
  JSON.stringify({ versiones: [{ version, publicada: "2026-08-31", exigible_desde: "2026-08-31" }] });

/** Un clon del marco con lo minimo que el camino de herramientas necesita. */
function clonDelMarco(nombre, { quien, version }) {
  const raiz = tmp(nombre);
  fs.mkdirSync(path.join(raiz, "herramientas"));
  fs.copyFileSync(HERRAMIENTA, path.join(raiz, "herramientas", "projects-init.mjs"));
  fs.cpSync(ANDAMIO, path.join(raiz, "plantilla"), { recursive: true });
  fs.mkdirSync(path.join(raiz, ".github", "workflows"), { recursive: true });
  fs.copyFileSync(path.join(RAIZ, ".github/workflows/marco-ci.yml"), path.join(raiz, ".github/workflows/marco-ci.yml"));
  escribirAction(raiz, { quien, version });
  return raiz;
}

function escribirAction(raiz, { quien, version }) {
  const dir = path.join(raiz, "actions", "constitucion");
  fs.mkdirSync(path.join(dir, "canonico"), { recursive: true });
  fs.writeFileSync(path.join(dir, "constitucion.mjs"), constitucionQueFirma(quien), "utf8");
  fs.writeFileSync(path.join(dir, "canonico", "manifiesto.json"), manifiestoCon(version), "utf8");
}

const git = (cwd, ...args) =>
  execFileSync("git", ["-c", "user.name=banco", "-c", "user.email=banco@ejemplo", "-c", "commit.gpgsign=false", "-c", "tag.gpgsign=false", ...args], {
    cwd,
    stdio: "pipe",
  });

/** El ejecutor de paquetes de mentira, con el mismo nombre que el real: el que la
 *  herramienta invoca para `openspec init` (pruebas/init/projects-init.test.mjs
 *  hace lo mismo, y por lo mismo). */
const EJECUTOR = "npx";

/** Deja un openspec/ con contenido, para que el paso de openspec no sea lo que
 *  decida el caso. */
function ejecutorQueEscribe() {
  const bin = tmp("bin");
  fs.writeFileSync(path.join(bin, EJECUTOR), "#!/bin/sh\nmkdir -p openspec && printf 'x\\n' > openspec/project.md\nexit 0\n", "utf8");
  fs.chmodSync(path.join(bin, EJECUTOR), 0o755);
  fs.writeFileSync(path.join(bin, `${EJECUTOR}.cmd`), "@echo off\r\nmkdir openspec\r\necho x> openspec\\project.md\r\nexit /b 0\r\n", "utf8");
  return bin;
}

function armar(marco) {
  const destino = tmp("destino");
  const valores = path.join(destino, "..", `vals-${path.basename(destino)}.json`);
  fs.writeFileSync(valores, JSON.stringify(VALORES), "utf8");
  const r = spawnSync(
    process.execPath,
    [path.join(marco, "herramientas", "projects-init.mjs"), "--sin-arranque", "--valores", valores, "--destino", destino],
    { encoding: "utf8", env: { ...process.env, PATH: `${ejecutorQueEscribe()}${path.delimiter}${process.env.PATH}` } },
  );
  const artefacto = path.join(destino, ".projects", "AGENTS-marco.md");
  return {
    codigo: r.status ?? -1,
    salida: `${r.stdout ?? ""}${r.stderr ?? ""}`,
    render: fs.existsSync(artefacto) ? fs.readFileSync(artefacto, "utf8").trim() : null,
  };
}

test("pin · el andamio pina la constitucion por version exacta (sin esto, este banco no mide nada)", () => {
  assert.ok(PIN, "plantilla/.github/workflows/ci.yml no pina actions/constitucion@vX.Y.Z: el lector de este banco esta roto");
});

test("pin · con el tag en el clon, la constitucion se renderiza con la action de ESE tag y no con la del arbol", () => {
  const marco = clonDelMarco("con-tag", { quien: "del-tag", version: "1.7.0" });
  git(marco, "init", "-q", "-b", "main");
  git(marco, "add", "-A");
  git(marco, "commit", "-q", "-m", "release");
  git(marco, "tag", PIN);
  // Despues del release, main avanza con un canonico que el tag todavia no publica.
  escribirAction(marco, { quien: "del-arbol", version: "99.0.0" });
  git(marco, "commit", "-q", "-am", "canonico nuevo, sin release");

  const r = armar(marco);
  assert.equal(r.codigo, 0, r.salida);
  assert.equal(
    r.render,
    "render del-tag",
    `el proyecto nace con la porcion del marco renderizada por la action del arbol y su CI la verifica con la de ${PIN}: ` +
      `rojo el primer dia. Salida:\n${r.salida}`,
  );
  assert.match(r.salida, new RegExp(`constitucion.*${PIN.replaceAll(".", "\\.")}`), "la corrida tiene que decir con que version renderizo");
});

test("pin · sin el tag y con un canonico mas nuevo que el pin, sigue, pero avisa el rojo que viene y como evitarlo", () => {
  const marco = clonDelMarco("sin-tag-adelantado", { quien: "del-arbol", version: "99.0.0" });
  const r = armar(marco);
  assert.equal(r.codigo, 0, r.salida);
  assert.equal(r.render, "render del-arbol");
  const aviso = r.salida.split("\n").find((l) => l.startsWith("::warning::") && l.includes(PIN));
  assert.ok(aviso, `sin el tag ${PIN} y con el canonico 99.0.0 en el clon, el proyecto nace rojo: eso no puede pasar callado.\n${r.salida}`);
  assert.match(aviso, /99\.0\.0/, "el aviso nombra la version del canonico del clon");
  assert.match(aviso, /rojo/i, "el aviso dice la consecuencia");
  assert.match(aviso, /fetch --tags/, "el aviso trae el arreglo");
});

test("pin · CONTRAPESO: sin el tag y con un canonico que el pin ya publica, no hay aviso", () => {
  const marco = clonDelMarco("sin-tag-al-dia", { quien: "del-arbol", version: "1.7.0" });
  const r = armar(marco);
  assert.equal(r.codigo, 0, r.salida);
  assert.equal(r.render, "render del-arbol");
  assert.equal(
    r.salida.split("\n").some((l) => l.startsWith("::warning::") && l.includes("constitucion") && l.includes(PIN)),
    false,
    `un clon cuyo canonico ya publica ${PIN} no tiene nada que avisar:\n${r.salida}`,
  );
});
