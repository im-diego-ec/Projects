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

/** Las skills que deja `openspec init`. SEIS, y ese numero es el correcto para la
 *  documentacion: la septima que aparece en un proyecto —`projects-archive-change`—
 *  la pone ESTE MARCO, no OpenSpec. Decir «siete skills de openspec» es contar una
 *  que no es suya, y fue el error que reemplazo al «doce» anterior. */
export const CUANTAS_SKILLS = 6;

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

// ---------------------------------------------------------------------------
// LA TERCERA VEZ QUE UN NUMERO ESCRITO A MANO ENVEJECE SIN QUE NADA LO MIDA.
//
// Primero fueron «12 comandos y 12 skills» cuando eran 6 y 6. Despues «la
// primera de doce paginas» cuando eran quince, y «el estandar mide 14 paginas»
// cuando mide diecisiete. Las tres veces el defecto es el mismo: una cifra
// escrita al lado de algo que otra cosa decide, sin nada que las compare.
//
// La regla del repositorio ya existe y la aplica la pagina del stack: ahi los
// numeros NO se escriben, se imprimen con un comando. Este banco extiende esa
// regla a las cifras que hablan de la propia documentacion.
// ---------------------------------------------------------------------------

/** Cifras que la documentacion afirma sobre si misma, con como se miden.
 *
 *  Cada entrada es un patron que caza la afirmacion y una funcion que devuelve
 *  el numero de verdad. Si el patron no aparece en ningun lado, no pasa nada: la
 *  pagina dejo de afirmarlo, que es justamente lo que se prefiere. */
const CIFRAS_SOBRE_SI_MISMA = [
  {
    nombre: "paginas de la raiz de docs/ mas el README",
    patron: /el est(á|a)ndar mide \*\*(\d+) p(á|a)ginas\*\*/gi,
    grupo: 2,
    medir: async () => (await import("./lectura.mjs")).paginasDelAlcance().length,
  },
  {
    nombre: "paginas numeradas del camino",
    patron: /la primera de (\d+) p(á|a)ginas numeradas/gi,
    grupo: 1,
    medir: () =>
      execFileSync("git", ["ls-files", "docs/*.md"], { cwd: RAIZ, encoding: "utf-8" })
        .trim()
        .split("\n")
        .filter((f) => /\/\d\d-/.test(f)).length,
  },
];

test("ninguna cifra que la documentacion afirma sobre si misma esta vieja", async () => {
  const mal = [];
  for (const f of docs()) {
    const texto = fs.readFileSync(path.join(RAIZ, f), "utf-8");
    for (const cifra of CIFRAS_SOBRE_SI_MISMA) {
      for (const m of texto.matchAll(cifra.patron)) {
        const dice = Number(m[cifra.grupo]);
        const real = await cifra.medir();
        if (dice !== real) mal.push(`${f} → dice ${dice} y son ${real} (${cifra.nombre})`);
      }
    }
  }
  assert.deepEqual(
    mal,
    [],
    "es la tercera vez que pasa lo mismo: un numero escrito a mano al lado de algo que otra cosa decide. La salida no " +
      "es corregirlo otra vez, es dejar de escribirlo — la pagina del stack ya lo resuelve publicando el comando que lo " +
      `imprime.\n  ${mal.join("\n  ")}`,
  );
});

test("MUERDE: una cifra vieja se caza", async () => {
  const inventado = "El estándar mide **999 páginas**: el README y las demás.";
  const cifra = CIFRAS_SOBRE_SI_MISMA[0];
  const encontradas = [...inventado.matchAll(cifra.patron)].map((m) => Number(m[cifra.grupo]));
  assert.deepEqual(encontradas, [999], "el detector tiene que ver la cifra");
  assert.notEqual(await cifra.medir(), 999, "y 999 no puede ser el numero real, o este caso no mide nada");
});
