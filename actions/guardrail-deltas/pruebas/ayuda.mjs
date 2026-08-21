// Fabrica de arboles de OpenSpec de juguete para el banco del guardrail. El
// script lee dos carpetas y las toma de OPENSPEC_CHANGES / OPENSPEC_SPECS, asi
// que no hace falta ningun repositorio git: alcanza con escribir los .md.
//
// Este archivo NO es una prueba (no termina en .test.mjs).
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

export const AQUI = dirname(fileURLToPath(import.meta.url));
export const SCRIPT = join(AQUI, "..", "check-openspec-deltas.mjs");

const creados = [];

export function limpiar() {
  while (creados.length) {
    const dir = creados.pop();
    try {
      rmSync(dir, { recursive: true, force: true, maxRetries: 5 });
    } catch {
      // basura en el temporal del sistema, no un fallo de la prueba
    }
  }
}

function escribir(raiz, ruta, contenido) {
  const destino = join(raiz, ruta);
  mkdirSync(dirname(destino), { recursive: true });
  writeFileSync(destino, contenido);
}

/**
 * Arma un arbol y devuelve su raiz.
 *
 *   specs:    { capability: "<markdown del spec vivo>" }
 *   activos:  { nombre: { capability: "<markdown del delta>" } }
 *   archivados: idem, pero debajo de changes/archive
 */
export function arbol({ specs = {}, activos = {}, archivados = {} } = {}) {
  const raiz = mkdtempSync(join(tmpdir(), "projects-guardrail-"));
  creados.push(raiz);
  for (const [cap, texto] of Object.entries(specs)) {
    escribir(raiz, join("specs", cap, "spec.md"), texto);
  }
  for (const [nombre, caps] of Object.entries(activos)) {
    for (const [cap, texto] of Object.entries(caps)) {
      escribir(raiz, join("changes", nombre, "specs", cap, "spec.md"), texto);
    }
  }
  for (const [nombre, caps] of Object.entries(archivados)) {
    for (const [cap, texto] of Object.entries(caps)) {
      escribir(raiz, join("changes", "archive", nombre, "specs", cap, "spec.md"), texto);
    }
  }
  // La carpeta de changes existe siempre, tambien vacia: es el caso "no hay
  // nada que comparar", que tiene que decirlo en vez de mentir un verde.
  mkdirSync(join(raiz, "changes"), { recursive: true });
  return raiz;
}

export function correr(raiz, env = {}) {
  const r = spawnSync(process.execPath, [SCRIPT], {
    encoding: "utf8",
    env: {
      ...process.env,
      OPENSPEC_CHANGES: join(raiz, "changes"),
      OPENSPEC_SPECS: join(raiz, "specs"),
      ...env,
    },
  });
  const stdout = r.stdout ?? "";
  const stderr = r.stderr ?? "";
  return { codigo: r.status, stdout, stderr, todo: `${stdout}\n${stderr}` };
}

/** Un requirement con sus escenarios, en el formato que OpenSpec espera. */
export function requirement(titulo, escenarios, cuerpo = "El requirement dice algo.") {
  return [
    `### Requirement: ${titulo}`,
    "",
    cuerpo,
    "",
    ...escenarios.flatMap((s) => [
      `#### Scenario: ${s}`,
      `- **WHEN** pasa ${s}`,
      `- **THEN** el sistema hace lo que promete`,
      "",
    ]),
  ].join("\n");
}

export const specVivo = (...reqs) => `# Spec de juguete\n\n${reqs.join("\n")}`;
export const delta = (seccion, ...reqs) =>
  `# Delta de juguete\n\n## ${seccion} Requirements\n\n${reqs.join("\n")}`;
