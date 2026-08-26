import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

// ---------------------------------------------------------------------------
// EL DEFECTO QUE ESTE BANCO CIERRA: la documentacion mandaba correr un comando
// que NO EXISTE, y era el PRIMERO del tramo de construir.
//
// `docs/09` decia «el directorio lo crea el comando» y daba `/opsx:new`. Medido
// contra el CLI que el marco pinea y contra lo que `openspec init` deja en un
// proyecto recien creado: los comandos que llegan son SEIS y `new` no es
// ninguno. Peor: la misma pagina PROHIBIA `/opsx:propose`, que es el unico que
// crea, asi que la persona quedaba entre un comando que no existe y otro que le
// dijeron que no use. Con eso, el tramo de construir no arrancaba.
//
// Un comando escrito en una guia es una promesa ejecutable. Este banco la mide.
// ---------------------------------------------------------------------------

/** Los seis comandos que `openspec init` deja en un proyecto.
 *
 *  MEDIDO EL 2026-08-26 sobre un proyecto recien generado con el pin del marco
 *  (`@fission-ai/openspec@1.9.0`), listando `.claude/commands/opsx/`. Se escribe
 *  a mano y no se deriva, por una razon: derivarlo exigiria correr `openspec
 *  init` —que baja un paquete de la red— en cada corrida del banco, y este
 *  repositorio corre sus pruebas sin red. La lista escrita es el precio de esa
 *  independencia, y el comentario de arriba dice como reproducirla. */
export const COMANDOS_DEL_PROYECTO = ["apply", "archive", "explore", "propose", "sync", "update"];

/** Y las skills, medidas igual. Siete: las seis de OpenSpec mas la del marco. */
export const CUANTAS_SKILLS = 7;

const docs = () =>
  execFileSync("git", ["ls-files", "docs/*.md", "*.md"], { cwd: RAIZ, encoding: "utf-8" })
    .trim()
    .split("\n")
    .filter((f) => f && f !== "CHANGELOG.md");

test("hay comandos declarados: un cero aca es este banco roto", () => {
  assert.equal(COMANDOS_DEL_PROYECTO.length, 6, "se midieron seis; si cambia, hay que volver a medirlo contra un proyecto real");
});

test("toda la documentacion nombra SOLO comandos /opsx que existen", () => {
  const inventados = [];
  for (const f of docs()) {
    const texto = fs.readFileSync(path.join(RAIZ, f), "utf-8");
    for (const m of texto.matchAll(/\/opsx:([a-z-]+)/g)) {
      if (!COMANDOS_DEL_PROYECTO.includes(m[1])) inventados.push(`${f} → /opsx:${m[1]}`);
    }
  }
  assert.deepEqual(
    inventados,
    [],
    "un comando escrito en una guia es una promesa ejecutable: quien lo copia y lo pega no tiene como saber que no " +
      `existe. Los que existen son: ${COMANDOS_DEL_PROYECTO.map((c) => "/opsx:" + c).join(", ")}.\n  ` +
      inventados.join("\n  "),
  );
});

test("los conteos que la documentacion afirma coinciden con lo medido", () => {
  const mal = [];
  for (const f of docs()) {
    const texto = fs.readFileSync(path.join(RAIZ, f), "utf-8");
    for (const m of texto.matchAll(/(\d+) comandos `\/opsx/g)) {
      if (Number(m[1]) !== COMANDOS_DEL_PROYECTO.length) mal.push(`${f} → dice ${m[1]} comandos y son ${COMANDOS_DEL_PROYECTO.length}`);
    }
    for (const m of texto.matchAll(/(\d+) skills `openspec/g)) {
      if (Number(m[1]) !== CUANTAS_SKILLS) mal.push(`${f} → dice ${m[1]} skills y son ${CUANTAS_SKILLS}`);
    }
  }
  assert.deepEqual(
    mal,
    [],
    "un numero escrito a mano al lado de algo que otra herramienta decide envejece sin que nada lo mida. Tres " +
      `paginas decian 12 y 12 cuando eran ${COMANDOS_DEL_PROYECTO.length} y ${CUANTAS_SKILLS}.\n  ` + mal.join("\n  "),
  );
});

test("MUERDE: un comando inventado se caza", () => {
  const texto = "Corré `/opsx:inventado-abc` y listo.";
  const encontrados = [...texto.matchAll(/\/opsx:([a-z-]+)/g)].map((m) => m[1]);
  assert.deepEqual(encontrados, ["inventado-abc"], "el detector tiene que ver el comando");
  assert.equal(COMANDOS_DEL_PROYECTO.includes("inventado-abc"), false, "y no puede estar en la lista de los que existen");
});

test("MUERDE: un conteo equivocado se caza", () => {
  const texto = "Los **12 comandos `/opsx:*`** que llegan.";
  const n = [...texto.matchAll(/(\d+) comandos `\/opsx/g)].map((m) => Number(m[1]));
  assert.deepEqual(n, [12], "el detector tiene que ver el numero");
  assert.notEqual(n[0], COMANDOS_DEL_PROYECTO.length, "y 12 no puede ser el numero real, o este caso no mide nada");
});
