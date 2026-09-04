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

function paso(n) {
  const s = fs.readFileSync(path.join(RAIZ, GUIA), "utf8");
  const i = s.indexOf(`## Paso ${n}`);
  assert.ok(i > -1, `no encontre el Paso ${n} en ${GUIA}: si se renombro, actualiza este banco en el mismo cambio`);
  const j = s.indexOf(`## Paso ${n + 1}`, i);
  assert.ok(j > i, `no encontre el Paso ${n + 1}: sin el, este banco mediria la guia entera y pasaria por vacuidad`);
  return s.slice(i, j);
}

const pasoCero = () => paso(0);

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
  // EL LANZADOR SE ABRE EN EL PASO 1, NO EN EL 0, y ese cambio arreglo un bloqueo
  // real que encontro una auditoria: el Paso 0 mandaba a hacerle doble clic a un
  // archivo que llegaba recien en el Paso 1, sesenta lineas mas abajo. La primera
  // instruccion ejecutable de todo el recorrido no tecnico era imposible de
  // cumplir, y quien no es tecnico no tiene como saber que el orden esta al reves:
  // abre la guia, busca un archivo que no esta en ningun lado, y ahi se termina.
  //
  // Ahora el Paso 0 baja la carpeta y el Paso 1 abre el lanzador. Lo que este caso
  // sigue exigiendo es lo mismo de siempre: que el camino sin comandos exista y
  // este nombrado para los tres sistemas. Solo cambio en que paso vive.
  const cero = pasoCero();
  assert.match(cero, /Download ZIP/, "el Paso 0 no dice como bajar la carpeta sin instalar nada");
  assert.match(cero, /arrancar/, "el Paso 0 no anticipa el archivo que se abre en el paso siguiente");

  const uno = paso(1);
  assert.match(uno, /doble clic/i, "el Paso 1 no dice que hacer doble clic: sin eso no hay camino sin comandos");
  assert.match(uno, /arrancar\.command/, "no nombra el lanzador de macOS");
  assert.match(uno, /arrancar\.cmd/, "no nombra el lanzador de Windows");
  assert.match(uno, /arrancar\.sh/, "no nombra el lanzador de Linux");
});

test("EL ORDEN: no se puede mandar a abrir un archivo que todavia no se bajo", () => {
  // Es la clase entera del bloqueo, no el caso particular. Cualquier paso que
  // mande a abrir `arrancar` tiene que venir DESPUES del que baja la carpeta.
  const s = fs.readFileSync(path.join(RAIZ, GUIA), "utf8");
  const encabezados = [...s.matchAll(/^## Paso (\d+) —.*$/gm)];
  assert.ok(encabezados.length >= 10, `solo se leyeron ${encabezados.length} pasos: la guarda quedaria mirando al vacio`);
  const cuerpo = (m, i) => s.slice(m.index, i + 1 < encabezados.length ? encabezados[i + 1].index : s.length);
  const baja = encabezados.findIndex((m, i) => /Download ZIP|repo clone/.test(cuerpo(m, i)));
  // "doble clic" a secas NO alcanza como detector: el paso que baja la carpeta
  // tambien manda a hacerle doble clic AL ZIP, y con ese patron los dos indices
  // caian en el mismo paso y la comparacion se volvia absurda. Lo que identifica
  // al paso que abre el lanzador es que nombre el archivo de cada sistema.
  const abre = encabezados.findIndex((m, i) => /arrancar\.(command|cmd|sh)/.test(cuerpo(m, i)));
  assert.notEqual(baja, -1, "ningun paso baja la carpeta del marco");
  assert.notEqual(abre, -1, "ningun paso manda a abrir el lanzador");
  assert.ok(
    baja < abre,
    `el paso que manda a abrir \`arrancar\` (${encabezados[abre][0].trim()}) viene ANTES del que baja la carpeta ` +
      `(${encabezados[baja][0].trim()}): el archivo no existe todavia cuando se lo pide`,
  );
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
