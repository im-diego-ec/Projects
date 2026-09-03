import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const GUIA = "docs/04-arrancar-acompanado.md";

// ---------------------------------------------------------------------------
// LA PRIMERA PANTALLA NO PUEDE SER UN EJERCICIO DE COMANDOS.
//
// LA CONDICION DEL 10 para este tramo, escrita en la investigacion: «el texto
// literal del primer paso no contiene `$`, ni un bloque ```bash, ni la palabra
// terminal».
//
// POR QUE ESA Y NO OTRA. El Paso 0 es donde se decide si la persona sigue o
// cierra la pestania. Alguien que abre una guia y lo primero que ve son cuatro
// comandos concluye, correctamente, que esto no es para el. No importa que los
// pasos siguientes sean amables: no llega.
//
// LO QUE ESTO NO PROHIBE: que el comando exista. Existe, se nombra en linea
// dentro de una nota al margen, y `arrancar` no hace mas que llamarlo. Lo que se
// prohibe es que sea LO PRIMERO Y LO PRINCIPAL.
// ---------------------------------------------------------------------------

function pasoCero() {
  const s = fs.readFileSync(path.join(RAIZ, GUIA), "utf8");
  const i = s.indexOf("## Paso 0");
  assert.ok(i > -1, `no encontre el Paso 0 en ${GUIA}: si se renombro, actualiza este banco en el mismo cambio`);
  const j = s.indexOf("## Paso 1", i);
  assert.ok(j > i, "no encontre el Paso 1: sin el, este banco mediria la guia entera y pasaria por vacuidad");
  return s.slice(i, j);
}

test("el Paso 0 existe y tiene cuerpo: un cero aca es este banco roto", () => {
  const p = pasoCero();
  assert.ok(p.length > 400, `el Paso 0 mide ${p.length} caracteres: parece vacio o mal recortado`);
});

test("el Paso 0 no arranca con un ejercicio de comandos", () => {
  const p = pasoCero();
  const rotas = [];
  if (p.includes("$")) rotas.push("tiene un `$`, que es el prompt de una consola");
  if (p.includes("```bash")) rotas.push("tiene un bloque ```bash");
  if (/\bterminal/i.test(p)) rotas.push("usa la palabra «terminal»");
  assert.deepEqual(
    rotas,
    [],
    "El Paso 0 es donde se decide si la persona sigue o cierra la pestaña.\n" +
      "Alguien que abre la guía y lo primero que ve son comandos concluye que esto no es para él.\n\n  - " +
      rotas.join("\n  - "),
  );
});

test("y en cambio manda a abrir el lanzador, que es lo que lo reemplaza", () => {
  const p = pasoCero();
  assert.match(p, /doble clic/i, "el Paso 0 no dice que hacer doble clic: sin eso no hay camino sin comandos");
  assert.match(p, /arrancar\.command/, "no nombra el lanzador de macOS");
  assert.match(p, /arrancar\.cmd/, "no nombra el lanzador de Windows");
});

test("MUERDE: los tres detectores cazan lo que dicen cazar", () => {
  const casos = [
    ["$ node algo", (t) => t.includes("$")],
    ["```bash\nnode algo\n```", (t) => t.includes("```bash")],
    ["abri la Terminal", (t) => /\bterminal/i.test(t)],
  ];
  for (const [texto, detector] of casos) {
    assert.ok(detector(texto), `el detector no caza «${texto}»: no protege nada`);
  }
});
