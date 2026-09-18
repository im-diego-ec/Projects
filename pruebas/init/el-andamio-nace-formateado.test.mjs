import test, { after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

import * as init from "../../herramientas/projects-init.mjs";
import { escribir as escribirLaPuerta } from "../../herramientas/projects-puerta.mjs";

// ---------------------------------------------------------------------------
// LO QUE `projects init` ESCRIBE ENCIMA DEL ANDAMIO NO PUEDE DESFORMATEARLO.
//
// QUE DEFECTO CIERRA. Con `--sin-arranque` —la via que usa `personalizar.yml`,
// o sea la puerta de quien no programa— el repositorio nacia con `format:check`
// en ROJO. Medido el 2026-09-17 con prettier 3.9.6 sobre las 24 combinaciones de
// forma, plataforma, tipo de cuenta y largo de nombres: 24 de 24 en rojo. Una
// parte era el andamio sin formatear (15 archivos); la otra, y es la que mide
// este banco, la escribia LA HERRAMIENTA:
//
//   1. `.projects-valores.json` reserializado con `JSON.stringify(x, null, 2)`,
//      que parte en cuatro lineas `"superficies": ["claude-code", "cursor"]`.
//      Prettier lo quiere en una. Lo reescribian tres podas distintas.
//   2. Las COSTURAS de las podas: sacar un bloque `projects:solo-si-...` o solo
//      su linea de centinela dejaba dos lineas en blanco seguidas, o una en
//      blanco al final del archivo (`AGENTS.md`, `README.md`, `dependabot.yml`).
//   3. La pagina de la proteccion de `main` de un sitio: el bloque de la
//      compuerta de produccion se pegaba con una linea en blanco de mas.
//
// El arranque lo tapaba con `pnpm format`, y ese es el problema: tapaba. Con
// `--sin-arranque`, o si el arranque moria antes de ese paso, el primer CI del
// proyecto salia rojo por un archivo que le escribio el marco.
//
// POR QUE ESTE BANCO NO CORRE PRETTIER. Descargarlo haria que una prueba dependa
// de la red. La corrida real de `prettier --check .` sobre cada destino la hace
// el paso «El andamio y lo que el init escribe pasan el formateador» del
// ci.yml del marco. Lo que aca se afirma, sin red, son las propiedades que el
// formateador exige y que la herramienta rompia: la forma del JSON y la ausencia
// de costuras. El contraste del serializador contra prettier real quedo medido
// en el change `el-andamio-nace-formateado` y los casos de abajo son su salida.
// ---------------------------------------------------------------------------

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const HERRAMIENTA = path.join(RAIZ, "herramientas", "projects-init.mjs");
const ANDAMIO = path.join(RAIZ, "plantilla");

const temporales = [];
after(() => {
  for (const d of temporales) fs.rmSync(d, { recursive: true, force: true });
});

/** Instancia el andamio en un temporal SIN arranque y SIN herramientas: es la
 *  via de `personalizar.yml`, y la unica en la que nadie formatea despues. */
function instanciar(extra) {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), "nace-formateado-"));
  temporales.push(base);
  const destino = path.join(base, "destino");
  fs.mkdirSync(destino);
  const valores = { ...JSON.parse(execFileSync(process.execPath, [HERRAMIENTA, "--ejemplo"], { encoding: "utf8" })), ...extra };
  const ruta = path.join(base, "valores.json");
  fs.writeFileSync(ruta, JSON.stringify(valores, null, 2));
  execFileSync(process.execPath, [HERRAMIENTA, "--valores", ruta, "--destino", destino, "--sin-arranque", "--sin-herramientas"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  return destino;
}

/** Las combinaciones que ejercitan las cuatro podas: las dos formas, las dos
 *  ramas de la de plataforma (AWS trae infra/, las otras no) y los dos tipos de
 *  cuenta. No son las 24: la corrida completa, con prettier, es la del CI. */
const COMBINACIONES = [
  { forma: "aplicacion", plataforma: "aws", TIPO_CUENTA: "organizacion" },
  { forma: "aplicacion", plataforma: "supabase", TIPO_CUENTA: "usuario" },
  { forma: "sitio", plataforma: "ninguna", TIPO_CUENTA: "organizacion" },
  { forma: "sitio", plataforma: "aws", TIPO_CUENTA: "usuario" },
];
const destinos = COMBINACIONES.map((c) => ({ combinacion: c, destino: instanciar(c) }));

/** Lo que el formateador corregiria en una COSTURA, dicho sin correr el
 *  formateador: dos lineas en blanco seguidas (fuera de un bloque de codigo de
 *  markdown), un archivo que no termina en exactamente un salto de linea, y una
 *  cita de markdown que empieza, termina o se parte con una linea `>` vacia. */
export function costuras(texto, rel) {
  const problemas = [];
  if (!texto.endsWith("\n")) problemas.push("no termina en salto de linea");
  if (/\n[ \t]*\n$/.test(texto)) problemas.push("termina con una linea en blanco de mas");
  if (/^[ \t]*\n/.test(texto)) problemas.push("empieza con una linea en blanco");
  const esMd = rel.endsWith(".md");
  const lineas = texto.split("\n");
  let enCodigo = false;
  let blancas = 0;
  for (let i = 0; i < lineas.length - 1; i++) {
    const l = lineas[i];
    if (esMd && /^\s*(```|~~~)/.test(l)) enCodigo = !enCodigo;
    if (enCodigo) {
      blancas = 0;
      continue;
    }
    if (l.trim() === "") {
      blancas += 1;
      if (blancas === 2) problemas.push(`linea ${i + 1}: dos lineas en blanco seguidas`);
    } else blancas = 0;
    if (esMd && /^>\s*$/.test(l)) {
      const antes = lineas[i - 1] ?? "";
      const despues = lineas[i + 1] ?? "";
      if (!/^>/.test(antes) || !/^>/.test(despues) || /^>\s*$/.test(despues)) {
        problemas.push(`linea ${i + 1}: una cita que empieza, termina o se parte en una linea \`>\` vacia`);
      }
    }
  }
  return problemas;
}

/** Los archivos del andamio que la herramienta PODA: los que traen centinelas. */
function conCentinelas() {
  const salida = [];
  const recorrer = (dir) => {
    for (const e of fs.readdirSync(path.join(ANDAMIO, dir), { withFileTypes: true })) {
      const rel = dir ? `${dir}/${e.name}` : e.name;
      if (e.isDirectory()) {
        if (e.name !== "node_modules") recorrer(rel);
      } else if (/projects:(?:fin-)?solo-si-/.test(fs.readFileSync(path.join(ANDAMIO, rel), "utf8"))) salida.push(rel);
    }
  };
  recorrer("");
  return salida;
}

test("el andamio tiene archivos con centinelas: si no, este banco no mide nada", () => {
  assert.ok(conCentinelas().length >= 3, `solo ${conCentinelas().length} archivos con centinelas: el banco perdio su sujeto`);
});

test("las podas no dejan costuras en ningun archivo que tocan", () => {
  const revisados = new Set();
  for (const { combinacion, destino } of destinos) {
    const rels = [...conCentinelas().map((r) => init.destinoDe(r, combinacion.plataforma)), init.RUTA_PROTECCION];
    for (const rel of rels) {
      const abs = path.join(destino, ...rel.split("/"));
      if (!fs.existsSync(abs)) continue;
      revisados.add(rel);
      const p = costuras(fs.readFileSync(abs, "utf8"), rel);
      assert.deepEqual(
        p,
        [],
        `${rel} (${JSON.stringify(combinacion)}) quedo con costuras que el formateador corrige, asi que el repo ` +
          `nace con format:check en ROJO por algo que escribio projects init:\n  ${p.join("\n  ")}`,
      );
    }
  }
  assert.ok(revisados.has("README.md") && revisados.has("AGENTS.md"), "no se revisaron las portadas: el banco no mide lo que dice");
});

test("`.projects-valores.json` sale con la forma del formateador, no la de JSON.stringify", () => {
  for (const { combinacion, destino } of destinos) {
    const texto = fs.readFileSync(path.join(destino, ".projects-valores.json"), "utf8");
    assert.match(
      texto,
      /\n {2}"superficies": \["claude-code", "cursor"\],\n/,
      `projects init partio en varias lineas un arreglo que el formateador quiere en una (${JSON.stringify(combinacion)}). ` +
        "El repo nace con format:check en rojo por un archivo que le escribio el marco. Arreglo: escribir con " +
        "jsonParaElArchivo, no con JSON.stringify(x, null, 2).",
    );
    const j = JSON.parse(texto);
    assert.equal(j.forma, combinacion.forma, "la forma dejo de quedar registrada");
    assert.equal(j.plataforma, combinacion.plataforma, "la plataforma dejo de quedar registrada");
    assert.equal(j.TIPO_CUENTA, combinacion.TIPO_CUENTA, "el tipo de cuenta dejo de quedar registrado");
  }
});

test("la puerta web escribe los desvios con la forma del formateador: personalizar.yml los copia tal cual", () => {
  // `personalizar.yml` copia el `desvios.json` que escribe la puerta como
  // `.projects-desvios.json` del proyecto, y corre con --sin-arranque: nadie lo
  // formatea despues.
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "nace-formateado-puerta-"));
  temporales.push(tmp);
  const r = escribirLaPuerta(tmp, { forma: "aplicacion", plataforma: "supabase", equipo: "solo", companero: "", dominio: "" }, "alguien/x");
  assert.ok(r.desvios.length > 0, "la puerta no declaro ningun desvio: el caso perdio su sujeto");
  for (const [ruta, valor] of [
    [r.rutaDesvios, { desvios: r.desvios }],
    [r.rutaValores, r.valores],
  ]) {
    assert.equal(fs.readFileSync(ruta, "utf8"), init.jsonParaElArchivo(ruta, valor), `${path.basename(ruta)} no tiene la forma del formateador`);
  }
});

// ── El serializador, contra la salida de prettier 3.9.6 ─────────────────────
//
// Cada `esperado` es la salida LITERAL de `prettier --config plantilla/.prettierrc`
// sobre el `JSON.stringify(valor, null, 2)` del mismo valor, corrida el 2026-09-17.
// Si prettier cambia su criterio en un pin futuro, el paso del CI del marco que
// corre prettier de verdad sobre los destinos se pone rojo primero.

const CASOS = [
  {
    nombre: "un arreglo corto de cadenas va en una linea",
    valor: { superficies: ["claude-code", "cursor"], plataforma: "aws" },
    esperado: '{\n  "superficies": ["claude-code", "cursor"],\n  "plataforma": "aws"\n}\n',
  },
  {
    nombre: "vacios, nulos, booleanos y numeros quedan como los escribe JSON",
    valor: { a: [], b: {}, c: null, d: true, e: 1.5 },
    esperado: '{\n  "a": [],\n  "b": {},\n  "c": null,\n  "d": true,\n  "e": 1.5\n}\n',
  },
  {
    nombre: "un arreglo con un objeto adentro se abre",
    valor: { desvios: [{ regla: "x", motivo: "y" }] },
    esperado: '{\n  "desvios": [\n    {\n      "regla": "x",\n      "motivo": "y"\n    }\n  ]\n}\n',
  },
  {
    nombre: "un arreglo de arreglos de mas de un elemento se abre",
    valor: { l: [[1, 2], [3, 4]] },
    esperado: '{\n  "l": [\n    [1, 2],\n    [3, 4]\n  ]\n}\n',
  },
  {
    nombre: "el borde: 100 columnas con la coma entra en una linea",
    valor: { k: ["x".repeat(88)], z: 1 },
    esperado: `{\n  "k": ["${"x".repeat(88)}"],\n  "z": 1\n}\n`,
  },
  {
    nombre: "el borde: 101 columnas con la coma ya no entra",
    valor: { k: ["x".repeat(89)], z: 1 },
    esperado: `{\n  "k": [\n    "${"x".repeat(89)}"\n  ],\n  "z": 1\n}\n`,
  },
  {
    nombre: "el ultimo de un objeto no lleva coma, y la coma cuenta",
    valor: { z: 1, k: ["x".repeat(89)] },
    esperado: `{\n  "z": 1,\n  "k": ["${"x".repeat(89)}"]\n}\n`,
  },
];

for (const c of CASOS) {
  test(`jsonParaElArchivo · ${c.nombre}`, () => {
    assert.equal(typeof init.jsonParaElArchivo, "function", "projects-init.mjs no exporta jsonParaElArchivo");
    assert.equal(init.jsonParaElArchivo(".projects-valores.json", c.valor), c.esperado);
  });
}

test("jsonParaElArchivo · package.json se escribe como JSON.stringify, que es como lo formatea prettier", () => {
  // Prettier formatea package.json con el parser `json-stringify`, que abre TODO
  // arreglo no vacio. Escribirlo "como el formateador" para cualquier JSON lo
  // desformatearia justo en el manifiesto.
  const valor = { name: "x", files: ["a", "b"] };
  assert.equal(init.jsonParaElArchivo("package.json", valor), `${JSON.stringify(valor, null, 2)}\n`);
  assert.equal(init.jsonParaElArchivo("api/package.json", valor), `${JSON.stringify(valor, null, 2)}\n`);
});

test("el control de las costuras MUERDE: cada forma de romper se detecta", () => {
  assert.deepEqual(costuras("# a\n\nb\n", "x.md"), []);
  assert.notDeepEqual(costuras("# a\n\n\nb\n", "x.md"), [], "dos lineas en blanco seguidas");
  assert.notDeepEqual(costuras("# a\n\nb\n\n", "x.md"), [], "linea en blanco al final");
  assert.notDeepEqual(costuras("> \n> a\n", "x.md"), [], "cita que empieza en blanco");
  assert.notDeepEqual(costuras("> a\n>\n\nb\n", "x.md"), [], "cita que termina en blanco");
  assert.deepEqual(costuras("```\na\n\n\nb\n```\n", "x.md"), [], "adentro de un bloque de codigo no es costura");
  assert.notDeepEqual(costuras("a: 1\n\n\nb: 2\n", "x.yml"), [], "en YAML tambien");
});
