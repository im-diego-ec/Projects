import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

// ---------------------------------------------------------------------------
// UNA REGLA DE AGENTS.md QUE NO VIGILABA NADIE.
//
// `AGENTS.md` dice, con todas las letras: «Sin acentos en los comentarios de
// YAML de los workflows. La prosa de Markdown si lleva acentos». Medido: ningun
// banco del repositorio la miraba, y el archivo que mas la rompia —veinte lineas
// en `plantilla/.github/workflows/desplegar.yml`— lo escribio quien agrego esta
// prueba, sin que nada avisara.
//
// POR QUE LA REGLA EXISTE, y no es estetica: estos archivos viajan al proyecto de
// otra persona y se editan desde sistemas y terminales que el marco no elige. Un
// acento en un comentario sobrevive intacto casi siempre, y el «casi» es el
// problema: cuando no sobrevive, lo que queda es un archivo con bytes rotos en un
// lugar donde nadie mira, en el repositorio de alguien mas.
//
// LA DOCTRINA QUE ESTO CIERRA es la del propio repositorio: «si una regla depende
// de que alguien se acuerde, no cuenta». Estaba escrita y dependia de eso.
// ---------------------------------------------------------------------------

/** Vocales acentuadas, enie, dieresis y los signos de apertura. */
const ACENTUADO = /[áéíóúÁÉÍÓÚñÑüÜ¿¡]/;

function workflows() {
  return execFileSync("git", ["ls-files", "*.yml"], { cwd: RAIZ, encoding: "utf-8" })
    .trim()
    .split("\n")
    .filter((f) => f.includes(".github/workflows/"));
}

test("hay workflows que revisar: un cero aca es este banco roto", () => {
  const todos = workflows();
  assert.ok(todos.length >= 4, `se encontraron ${todos.length} workflows: si cayo de golpe, mira si se movieron`);
});

test("ningun comentario de un workflow lleva acentos, como manda AGENTS.md", () => {
  const malos = [];
  let mirados = 0;
  for (const f of workflows()) {
    fs.readFileSync(path.join(RAIZ, f), "utf-8")
      .split("\n")
      .forEach((l, i) => {
        // SOLO LOS COMENTARIOS. El valor de un `echo` o de una `description:` es
        // prosa que una persona lee, y ahi los acentos SI corresponden: la regla
        // de AGENTS.md habla de los comentarios, no del contenido.
        if (!/^\s*#/.test(l)) return;
        mirados++;
        if (ACENTUADO.test(l)) malos.push(`${f}:${i + 1}  ${l.trim().slice(0, 78)}`);
      });
  }
  assert.ok(mirados >= 200, `solo se miraron ${mirados} lineas de comentario: si cayo, el reconocedor dejo de verlas`);
  assert.deepEqual(
    malos,
    [],
    "AGENTS.md dice «Sin acentos en los comentarios de YAML de los workflows», y estos los llevan. Estos archivos " +
      `viajan al repositorio de otra persona:\n  ${malos.join("\n  ")}`,
  );
});

test("la regla que este banco vigila sigue escrita en AGENTS.md", () => {
  // ANCLA: si la regla se borrara, este control quedaria exigiendo algo que ya
  // nadie declara — y eso es una regla sin fuente, que es como empiezan las
  // divergencias.
  const agents = fs.readFileSync(path.join(RAIZ, "AGENTS.md"), "utf-8");
  assert.match(
    agents,
    /Sin acentos en los comentarios de YAML/i,
    "AGENTS.md dejo de declarar la regla: si fue a proposito, este banco sobra y hay que sacarlo",
  );
});

test("MUERDE: un acento en un comentario se caza, y uno en un `echo` no", () => {
  assert.equal(ACENTUADO.test("# QUÉ NECESITA PARA FUNCIONAR"), true, "la deteccion tiene que ver el acento");
  assert.equal(ACENTUADO.test("# QUE NECESITA PARA FUNCIONAR"), false, "y no cazar la version correcta");

  // Y la otra mitad: una linea que NO es comentario queda fuera, aunque lleve
  // acentos. Es prosa que una persona lee y ahi corresponden.
  const esComentario = (l) => /^\s*#/.test(l);
  assert.equal(esComentario('          echo "::error::faltó el secreto"'), false, "un echo no es un comentario");
  assert.equal(esComentario("  # un comentario"), true);
  assert.equal(esComentario("        description: >-"), false, "ni una descripcion, que la lee una persona en la interfaz");
});
