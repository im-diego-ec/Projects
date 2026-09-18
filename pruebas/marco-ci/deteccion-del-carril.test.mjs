// Banco del paso "Detectar el carril de docs" de marco-ci.yml (id: detectar).
//
// POR QUE EXISTE. Es el paso que decide, en cada PR de cada consumidor, si su
// build-test corre o se saltea, y hasta este change no tenia banco: no tenia
// `name:`, y el extractor ubica los pasos por nombre (figuraba como deuda en
// cobertura-de-los-pasos.test.mjs). Se le puso nombre y este es su banco.
//
// LO QUE FIJA, y la mitad que deja para despues a proposito. El default de
// `rutas_carril_docs` incluye `^\.github/` ENTERO, asi que un PR que toca SOLO un
// workflow —la definicion del propio pipeline— va por el carril rapido: su
// build-test queda skipped y el check agregado sale verde sin haber ejecutado lo
// que el PR cambio. El upstream de este marco lo midio el 2026-08-28 en sus dos
// consumidores: 9 PRs mergeados con el build salteado, 3 de ellos tocando el
// workflow de despliegue, verdes en 3-5 segundos (Rigel 1.9.0, change
// 2026-08-29-carril-no-exime-al-pipeline).
//
// Cambiar ese default es cambiar un comportamiento que un consumidor no pidio: va
// con la linea v2. Lo compatible, y lo que este banco exige, es que el hueco deje
// de ser MUDO: cuando el carril exime un archivo no-markdown de un subdirectorio de
// `.github/`, la corrida lo dice con un ::warning:: que trae el arreglo que el
// consumidor ya puede aplicar hoy (su propia lista de rutas). El primer caso fija
// tambien que el default NO cambio: el dia que cambie, ese caso se da vuelta y el
// que lo cambie tiene que reescribirlo, con la nota de migracion al lado.
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { RUTA_WORKFLOW, scriptDelPaso } from "./extraer.mjs";
import { carpetaTemporal, commit, correrBash, escribir, limpiarTodo, repoDeJuguete } from "./util.mjs";

after(limpiarTodo);

const PASO = "Detectar el carril de docs";
const script = scriptDelPaso(PASO);

/** El default de `rutas_carril_docs`, LEIDO del YAML: un banco que copia el valor
 *  prueba su copia y se queda verde justo el dia que el default cambia. */
function defaultDelCarril() {
  const lineas = readFileSync(RUTA_WORKFLOW, "utf8").split(/\r?\n/);
  const i = lineas.findIndex((l) => /^ {6}rutas_carril_docs:\s*$/.test(l));
  assert.ok(i >= 0, "no encontre el input rutas_carril_docs en marco-ci.yml");
  const d = lineas.findIndex((l, k) => k > i && /^ {8}default: \|\s*$/.test(l));
  assert.ok(d > i, "rutas_carril_docs dejo de tener un default en bloque: este lector quedo viejo");
  const patrones = [];
  for (let k = d + 1; k < lineas.length && /^ {10}\S/.test(lineas[k]); k += 1) patrones.push(lineas[k].trim());
  assert.ok(patrones.length >= 3, `el default leido tiene ${patrones.length} patrones: el lector se rompio`);
  return patrones.join("\n");
}

/** Un repo con un commit base y otro que toca `archivos`; corre el paso en modo push. */
function correrSobre(archivos) {
  const raiz = repoDeJuguete("carril-");
  escribir(raiz, "README.md", "# repo\n");
  const antes = commit(raiz, "base");
  for (const ruta of archivos) escribir(raiz, ruta, `contenido de ${ruta}\n`);
  const despues = commit(raiz, "el cambio");
  const salida = join(carpetaTemporal("salida-"), "github-output");
  writeFileSync(salida, "");
  const r = correrBash(script, {
    cwd: raiz,
    env: {
      GITHUB_EVENT_NAME: "push",
      ANTES: antes,
      GITHUB_SHA: despues,
      RUTAS_DOCS: defaultDelCarril(),
      GITHUB_OUTPUT: salida,
    },
  });
  const publicadas = Object.fromEntries(
    readFileSync(salida, "utf8")
      .split("\n")
      .filter((l) => l.includes("="))
      .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]),
  );
  return { ...r, publicadas };
}

const AVISO = /::warning::.*carril rapido.*define/;

test("carril · un cambio que toca SOLO un workflow sigue en el carril (el default no cambio) y lo DICE", () => {
  const r = correrSobre([".github/workflows/deploy.yml"]);
  assert.equal(r.exit, 0, r.salida);
  // La mitad que NO cambia en esta version: cambiarla es para la linea v2.
  assert.equal(r.publicadas.solo_docs, "true", r.salida);
  // La mitad que si: el hueco deja de ser mudo, nombra el archivo y trae el arreglo.
  assert.match(r.salida, AVISO, r.salida);
  assert.match(r.salida, /\.github\/workflows\/deploy\.yml/);
  assert.match(r.salida, /rutas_carril_docs/);
  assert.match(r.salida, /\^\\\.github\/\[\^\/\]\*\$/);
});

test("carril · una action propia del repo tambien se nombra", () => {
  const r = correrSobre([".github/actions/propia/action.yml", "docs/notas.md"]);
  assert.equal(r.publicadas.solo_docs, "true", r.salida);
  assert.match(r.salida, AVISO, r.salida);
  assert.match(r.salida, /\.github\/actions\/propia\/action\.yml/);
});

test("carril · la configuracion suelta y la documentacion de .github no avisan", () => {
  // CODEOWNERS y dependabot.yml viven en la raiz de .github/ y no participan de la
  // verificacion; una plantilla de issue en markdown es documentacion. Avisar por
  // ellos seria ruido, y el ruido ensenia a ignorar el aviso que importa.
  const r = correrSobre([".github/CODEOWNERS", ".github/dependabot.yml", ".github/ISSUE_TEMPLATE/bug.md", "docs/x.md"]);
  assert.equal(r.exit, 0, r.salida);
  assert.equal(r.publicadas.solo_docs, "true", r.salida);
  assert.doesNotMatch(r.salida, AVISO, r.salida);
});

test("carril · si el cambio ya corre el build completo, no hay nada que avisar", () => {
  const r = correrSobre([".github/workflows/ci.yml", "src/app.ts"]);
  assert.equal(r.exit, 0, r.salida);
  assert.equal(r.publicadas.solo_docs, "false", r.salida);
  assert.doesNotMatch(r.salida, AVISO, r.salida);
});
