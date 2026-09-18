// EL MARKDOWN QUE VIAJA TIENE QUE SEGUIR FORMATEADO DESPUES DE SUSTITUIR Y PODAR.
//
// QUE DEFECTO CIERRA, medido el 2026-09-17 con prettier 3.9.6 sobre repos
// instanciados con `--sin-arranque`. Dos formas de que un markdown del andamio
// pase el formateador y el del repo recien nacido no:
//
//   1. UN MARCADOR ADENTRO DE UNA TABLA. El formateador alinea cada tabla por el
//      ancho de sus celdas, y sustituir `{{DOMINIO_DEV}}` por un dominio de
//      verdad cambia ese ancho: la tabla nace desalineada. Pasaba en la tabla de
//      ambientes y en la de estructura de la portada (README-del-proyecto.md) y
//      en la del stack de AGENTS.md. Ningun ancho fijo sirve: el valor lo elige
//      cada proyecto. Por eso las tablas que viajan no llevan marcadores: una
//      carpeta que es fija se escribe literal, y un valor libre va en una lista.
//
//   2. UN CENTINELA DE PODA ADENTRO DE UNA TABLA O DE UNA CITA. Los
//      `projects:solo-si-...` marcaban filas sueltas de una tabla y parrafos de
//      una cita. El formateador lee un comentario HTML como un bloque propio:
//      sobre el andamio, parte la tabla en pedazos —y el repo nacia con filas de
//      tabla convertidas en parrafos—; y una cita que empieza con un centinela
//      queda con una linea `>` vacia cuando la poda lo saca. Un centinela va
//      solo en su linea, como comentario HTML y con una linea en blanco a cada
//      lado: asi el formateador no lo junta con nada, y la herramienta cose la
//      costura que deja al sacarlo (coserCosturas en herramientas/projects-init.mjs).
//
// La corrida de prettier de verdad sobre cada destino la hace el paso del CI del
// marco «El andamio y lo que el init escribe pasan el formateador». Este banco
// dice, sin red y con el archivo y la linea, cual de las dos reglas se rompio.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { archivosDelAndamio, FORMAS, PLATAFORMAS } from "../../herramientas/projects-init.mjs";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const ANDAMIO = path.join(RAIZ, "plantilla");

/** Los markdown que viajan con alguna forma y alguna plataforma. */
function markdownQueViaja() {
  const todos = new Set();
  for (const forma of FORMAS) for (const p of PLATAFORMAS) for (const r of archivosDelAndamio(ANDAMIO, p, forma)) todos.add(r);
  return [...todos].filter((r) => r.endsWith(".md")).sort();
}

/** Los problemas de UN markdown, con su linea. Pura sobre el texto. */
export function problemasDelMarkdown(texto, rel) {
  const problemas = [];
  const lineas = texto.split("\n");
  let enCodigo = false;
  lineas.forEach((l, i) => {
    if (/^\s*(```|~~~)/.test(l)) enCodigo = !enCodigo;
    if (enCodigo) return;
    if (/^\s*(?:>\s*)?\|/.test(l) && /\{\{[A-Z0-9_]+\}\}/.test(l)) {
      problemas.push(
        `${rel}:${i + 1}: un marcador adentro de una tabla. Al sustituirlo cambia el ancho de la celda y la tabla nace ` +
          "desalineada. Arreglo: si es una carpeta fija, escribila literal; si es un valor libre, sacalo de la tabla (una lista no se alinea)",
      );
    }
    if (/projects:(?:fin-)?solo-si-/.test(l)) {
      const comentario = /^<!-- projects:(?:fin-)?solo-si-[a-z0-9-]+ -->$/.test(l);
      const rodeado = (lineas[i - 1] ?? "").trim() === "" && (lineas[i + 1] ?? "").trim() === "";
      if (!comentario || !rodeado) {
        problemas.push(
          `${rel}:${i + 1}: un centinela de poda que no esta solo. Tiene que ser un comentario HTML en su propia linea, ` +
            "sin sangria ni `>` adelante, con una linea en blanco antes y otra despues: si no, el formateador lo junta con la " +
            "tabla o la cita de al lado y el repo nace con esa estructura rota o con format:check en rojo",
        );
      }
    }
  });
  return problemas;
}

test("hay markdown que viaja: si no, este banco no mide nada", () => {
  const md = markdownQueViaja();
  assert.ok(md.includes("README-del-proyecto.md") && md.includes("AGENTS.md"), `markdown que viaja: ${md.join(", ")}`);
});

test("ningun markdown que viaja tiene marcadores en tablas ni centinelas pegados a otra estructura", () => {
  const problemas = markdownQueViaja().flatMap((rel) => problemasDelMarkdown(fs.readFileSync(path.join(ANDAMIO, rel), "utf8"), rel));
  assert.deepEqual(problemas, []);
});

test("el banco MUERDE: las dos formas del defecto se cazan", () => {
  assert.deepEqual(problemasDelMarkdown("# t\n\n| a | b |\n| - | - |\n| x | y |\n", "x.md"), []);
  assert.notDeepEqual(problemasDelMarkdown("| a | b |\n| - | - |\n| `{{DOMINIO_DEV}}` | y |\n", "x.md"), [], "marcador en tabla");
  assert.notDeepEqual(
    problemasDelMarkdown("| a | b |\n| - | - |\n<!-- projects:solo-si-es-sitio -->\n| x | y |\n", "x.md"),
    [],
    "centinela adentro de una tabla",
  );
  assert.notDeepEqual(problemasDelMarkdown("> # projects:solo-si-es-sitio\n> texto\n", "x.md"), [], "centinela adentro de una cita");
  assert.deepEqual(problemasDelMarkdown("a\n\n<!-- projects:solo-si-es-sitio -->\n\nb\n", "x.md"), [], "centinela bien puesto");
  assert.deepEqual(problemasDelMarkdown("```\n| `{{X}}` |\n```\n", "x.md"), [], "adentro de un bloque de codigo no es una tabla");
});
