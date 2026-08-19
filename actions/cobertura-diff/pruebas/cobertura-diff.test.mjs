// Pruebas del comparador de cobertura sobre el diff (bloque 1.2 del change
// calidad-fail-closed). El marco NO puede dogfoodear este check —no tiene
// paquetes ni pruebas propias que medir— asi que este banco es la unica
// verificacion automatica que el codigo tiene antes de llegar a todos los
// consumidores. Por eso corre casos borde, y no un camino feliz.
//
//   node --test actions/cobertura-diff/pruebas/
import test, { after } from "node:test";
import assert from "node:assert/strict";
import { commit, copiarFixture, correr, escribir, fixture, git, limpiar, repoConBase, repoNuevo } from "./ayuda.mjs";
import {
  esArchivoDePrueba,
  globARegExp,
  normalizarRuta,
  parsearDiff,
  parsearLcov,
} from "../medir-cobertura-diff.mjs";

after(limpiar);

// El archivo de fixtures suma-v2.ts agrega las lineas 4 a 7 sobre suma-v1.ts,
// y de esas las ejecutables (las que el reporte declara con DA:) son la 5 y
// la 6. Todas las cuentas de abajo salen de ahi.

// ── Camino feliz, y la normalizacion de rutas que lo hace posible ───────────

test("cambio cubierto pasa, con el lcov emitido en Windows (barras invertidas)", () => {
  const { dir, base } = repoConBase();
  escribir(dir, "web/src/suma.ts", fixture("suma-v2.ts"));
  commit(dir, "agrega resta");
  copiarFixture(dir, "lcov-cubierto-windows.info", "web/coverage/lcov.info");

  const r = correr(dir, { COBERTURA_BASE: base });

  assert.equal(r.codigo, 0, r.todo);
  assert.equal(r.salidas.porcentaje, "100.00");
  assert.equal(r.salidas.lineas_medidas, "2");
  assert.equal(r.salidas.lineas_sin_cubrir, "0");
  assert.match(r.resumen, /Pasa/);
});

test("cambio con lineas nuevas sin cubrir es rojo y anota archivo y linea", () => {
  const { dir, base } = repoConBase();
  escribir(dir, "web/src/suma.ts", fixture("suma-v2.ts"));
  commit(dir, "agrega resta sin pruebas");
  copiarFixture(dir, "lcov-sin-cubrir.info", "web/coverage/lcov.info");

  const r = correr(dir, { COBERTURA_BASE: base });

  assert.equal(r.codigo, 1, r.todo);
  assert.equal(r.salidas.porcentaje, "0.00");
  assert.equal(r.salidas.lineas_sin_cubrir, "2");
  // El mensaje trae el ARREGLO, no solo el diagnostico.
  assert.match(r.stderr, /Arreglo: agrega pruebas que ejecuten/);
  assert.match(r.stderr, /::error file=web\/src\/suma\.ts,line=5::/);
  assert.match(r.stderr, /::error file=web\/src\/suma\.ts,line=6::/);
  assert.match(r.resumen, /web\/src\/suma\.ts.*5, 6/s);
});

test("el minimo decide: 50% de cobertura es rojo con minimo 80 y verde con minimo 50", () => {
  const { dir, base } = repoConBase();
  escribir(dir, "web/src/suma.ts", fixture("suma-v2.ts"));
  commit(dir, "agrega resta a medio probar");
  copiarFixture(dir, "lcov-parcial.info", "web/coverage/lcov.info");

  const estricto = correr(dir, { COBERTURA_BASE: base, COBERTURA_MINIMO: "80" });
  assert.equal(estricto.codigo, 1, estricto.todo);
  assert.equal(estricto.salidas.porcentaje, "50.00");

  const laxo = correr(dir, { COBERTURA_BASE: base, COBERTURA_MINIMO: "50" });
  assert.equal(laxo.codigo, 0, laxo.todo);
  assert.equal(laxo.salidas.porcentaje, "50.00");
});

// ── Caso borde 1: el cambio no agrega lineas ────────────────────────────────

test("un cambio que solo BORRA lineas pasa sin ruido", () => {
  const { dir, base } = repoConBase();
  escribir(dir, "web/src/suma.ts", "export function suma(a: number, b: number): number {\n  return a + b;\n}\n".replace("  return a + b;\n", ""));
  const conBorrado = commit(dir, "borra el cuerpo");

  const r = correr(dir, { COBERTURA_BASE: base, COBERTURA_CABEZA: conBorrado });

  assert.equal(r.codigo, 0, r.todo);
  assert.equal(r.salidas.porcentaje, "n/a");
  assert.match(r.resumen, /solo borrados o renombres/);
});

test("un renombre puro pasa sin ruido", () => {
  const { dir, base } = repoConBase();
  git(dir, ["mv", "web/src/suma.ts", "web/src/suma-renombrada.ts"]);
  commit(dir, "renombra");
  copiarFixture(dir, "lcov-cubierto-windows.info", "web/coverage/lcov.info");

  const r = correr(dir, { COBERTURA_BASE: base });

  assert.equal(r.codigo, 0, r.todo);
  assert.equal(r.salidas.porcentaje, "n/a");
  assert.match(r.resumen, /solo borrados o renombres/);
});

// ── Caso borde 2: no hay archivos ejecutables en el cambio ──────────────────

test("un cambio sin archivos ejecutables (solo markdown) pasa: ningun SF: los reclama", () => {
  const { dir, base } = repoConBase();
  escribir(dir, "docs/notas.md", fixture("notas.md"));
  commit(dir, "solo documentacion");
  copiarFixture(dir, "lcov-cubierto-windows.info", "web/coverage/lcov.info");

  const r = correr(dir, { COBERTURA_BASE: base });

  assert.equal(r.codigo, 0, r.todo);
  assert.equal(r.salidas.lineas_medidas, "0");
  assert.equal(r.salidas.porcentaje, "n/a");
  // Pasa CON FUNDAMENTO: el reporte existe y sus rutas resuelven contra el
  // repositorio, o sea que "no lo mide" significa "no es un archivo medible".
  assert.match(r.resumen, /estan bien cableados/);
  assert.match(r.resumen, /docs\/notas\.md/);
});

// ── Caso borde 3: NO HAY DATOS habiendo lineas agregadas (el que decide) ────

test("sin ningun lcov y con lineas agregadas: ROJO ruidoso con el arreglo, jamas 100%", () => {
  const { dir, base } = repoConBase();
  escribir(dir, "web/src/suma.ts", fixture("suma-v2.ts"));
  commit(dir, "agrega resta");
  // No se copia ningun reporte: es exactamente el cableado olvidado.

  const r = correr(dir, { COBERTURA_BASE: base });

  assert.equal(r.codigo, 1, r.todo);
  assert.notEqual(r.salidas.porcentaje, "100.00");
  assert.equal(r.salidas.porcentaje, "n/a");
  assert.match(r.stderr, /NO se encontro ningun reporte de cobertura/);
  assert.match(r.stderr, /Arreglo: corre las pruebas CON cobertura/);
  assert.match(r.resumen, /ningun dato de cobertura que les corresponda/);
});

test("lcov con rutas de otra raiz (ningun SF: resuelve): ROJO, y nombra el projectRoot", () => {
  const { dir, base } = repoConBase();
  escribir(dir, "web/src/suma.ts", fixture("suma-v2.ts"));
  commit(dir, "agrega resta");
  // El reporte mide "src/suma.ts": el mismo archivo, con la raiz equivocada.
  // Es el caso que la herramienta externa reporta como cobertura total.
  copiarFixture(dir, "lcov-otra-raiz.info", "web/coverage/lcov.info");

  const r = correr(dir, { COBERTURA_BASE: base });

  assert.equal(r.codigo, 1, r.todo);
  assert.notEqual(r.salidas.porcentaje, "100.00");
  assert.match(r.stderr, /NINGUNA de sus rutas SF: corresponde a un archivo versionado/);
  assert.match(r.stderr, /projectRoot/);
  assert.match(r.stderr, /ruta emitida que no existe en el repositorio: src\\suma\.ts/);
});

test("lcov presente pero sin ningun SF: tambien es ROJO", () => {
  const { dir, base } = repoConBase();
  escribir(dir, "web/src/suma.ts", fixture("suma-v2.ts"));
  commit(dir, "agrega resta");
  copiarFixture(dir, "lcov-sin-sf.info", "web/coverage/lcov.info");

  const r = correr(dir, { COBERTURA_BASE: base });

  assert.equal(r.codigo, 1, r.todo);
  assert.equal(r.salidas.porcentaje, "n/a");
  assert.match(r.stderr, /NINGUNA de sus rutas SF/);
});

test("un archivo del cambio medido con otra raiz es ROJO aunque otros SF: resuelvan", () => {
  const { dir, base } = repoConBase();
  escribir(dir, "web/src/suma.ts", fixture("suma-v2.ts"));
  commit(dir, "agrega resta");
  // web/src/otro.ts resuelve, asi que el reporte "parece" bien cableado; pero
  // la cobertura de suma.ts llego como paquete/src/suma.ts y no corresponde a
  // ningun archivo versionado. Sin este chequeo, el archivo del cambio
  // quedaria "no medido" y el paso pasaria en verde.
  copiarFixture(dir, "lcov-colision.info", "web/coverage/lcov.info");

  const r = correr(dir, { COBERTURA_BASE: base });

  assert.equal(r.codigo, 1, r.todo);
  assert.match(r.stderr, /no estan alineadas/);
  assert.match(r.stderr, /sin medir por rutas desalineadas: web\/src\/suma\.ts/);
});

// ── Caso borde 4: rango degenerado (push a main) ────────────────────────────

test("sin commit base (push a main) el paso NO APLICA, y no simula un 100%", () => {
  const { dir } = repoConBase();
  escribir(dir, "web/src/suma.ts", fixture("suma-v2.ts"));
  commit(dir, "agrega resta");

  const r = correr(dir, { COBERTURA_BASE: "" });

  assert.equal(r.codigo, 0, r.todo);
  assert.equal(r.salidas.porcentaje, "n/a");
  assert.match(r.stdout, /NO APLICABLE/);
  assert.match(r.resumen, /\*\*No aplicable\*\*/);
  assert.doesNotMatch(r.resumen, /100/);
});

test("el sha nulo tambien es NO APLICABLE (push de rama nueva)", () => {
  const { dir } = repoConBase();
  escribir(dir, "web/src/suma.ts", fixture("suma-v2.ts"));
  commit(dir, "agrega resta");

  const r = correr(dir, { COBERTURA_BASE: "0000000000000000000000000000000000000000" });

  assert.equal(r.codigo, 0, r.todo);
  assert.match(r.stdout, /NO APLICABLE/);
});

// ── Lo que no se puede verificar es rojo, nunca verde ───────────────────────

test("una base que no esta en el clon y no se puede traer es ROJA con el arreglo", () => {
  const { dir } = repoConBase();
  escribir(dir, "web/src/suma.ts", fixture("suma-v2.ts"));
  commit(dir, "agrega resta");

  const r = correr(dir, { COBERTURA_BASE: "1234567890abcdef1234567890abcdef12345678" });

  assert.equal(r.codigo, 1, r.todo);
  assert.match(r.stderr, /no esta en el clon/);
  assert.match(r.stderr, /fetch-depth: 0/);
});

test("un minimo que no es un porcentaje es ROJO de configuracion", () => {
  const { dir, base } = repoConBase();
  const r = correr(dir, { COBERTURA_BASE: base, COBERTURA_MINIMO: "muy alto" });

  assert.equal(r.codigo, 1, r.todo);
  assert.match(r.stderr, /no es un porcentaje entre 0 y 100/);
});

test("fuera de un repositorio git el paso es ROJO, no un exito silencioso", () => {
  const dir = repoNuevo();
  // Se le saca el .git: queda un directorio comun, como cuando falta checkout.
  git(dir, ["init", "--quiet"]);
  const r = correr(dir, { COBERTURA_BASE: "HEAD~1" });
  assert.notEqual(r.codigo, 0, r.todo);
});

// ── Ruido util, no rojo ─────────────────────────────────────────────────────

test("un archivo con la misma extension que lo medido, sin reclamar, avisa fuerte", () => {
  const { dir, base } = repoConBase();
  escribir(dir, "web/src/suma.ts", fixture("suma-v2.ts"));
  escribir(dir, "web/src/nuevo-sin-medir.ts", "export const x = 1;\n");
  commit(dir, "agrega resta y un archivo que la cobertura no reclama");
  copiarFixture(dir, "lcov-cubierto-windows.info", "web/coverage/lcov.info");

  const r = correr(dir, { COBERTURA_BASE: base });

  // Pasa (lo medido esta cubierto) pero deja el aviso: podria ser all:false.
  assert.equal(r.codigo, 0, r.todo);
  assert.match(r.stderr, /::warning::.*comparten extension con lo que la cobertura mide/);
  assert.match(r.stderr, /all: true/);
});

// REGRESION. El aviso vivia DESPUES de la salida temprana de "no medi nada", asi
// que era inalcanzable justo donde mas importa: un cambio que toca SOLO archivos
// que ningun reporte reclama salia exit 0 y MUDO. Que el aviso dependiera de que
// en el mismo pull request viniera ademas un archivo medido es el fail-open
// silencioso que el marco prohibe. No es hipotetico: los scripts sueltos y los
// .ts de e2e del consumidor son exactamente esos archivos, y basta meterlos en
// un tsconfig —sin una sola prueba— para que el censo se de por satisfecho.
test("un cambio que toca SOLO archivos sin medir avisa igual: nunca sale mudo", () => {
  const { dir, base } = repoConBase();
  escribir(dir, "web/src/nuevo-sin-medir.ts", "export const x = 1;\nexport const y = 2;\n");
  commit(dir, "agrega un archivo que ningun reporte reclama, y NADA mas");
  copiarFixture(dir, "lcov-cubierto-windows.info", "web/coverage/lcov.info");

  const r = correr(dir, { COBERTURA_BASE: base });

  // Pasa —no hay nada medido que juzgar— pero NO en silencio.
  assert.equal(r.codigo, 0, r.todo);
  assert.match(r.stderr, /::warning::.*comparten extension con lo que la cobertura mide/);
  assert.match(r.stderr, /nuevo-sin-medir\.ts/);
});

test("los archivos de prueba no disparan ese aviso: no reclamarlos es lo normal", () => {
  const { dir, base } = repoConBase();
  escribir(dir, "web/src/suma.ts", fixture("suma-v2.ts"));
  escribir(dir, "web/src/suma.test.ts", "import { suma } from './suma';\nsuma(1, 2);\n");
  escribir(dir, "web/src/__tests__/otro.ts", "// ayudante de pruebas\n");
  commit(dir, "agrega resta con su prueba");
  copiarFixture(dir, "lcov-cubierto-windows.info", "web/coverage/lcov.info");

  const r = correr(dir, { COBERTURA_BASE: base });

  assert.equal(r.codigo, 0, r.todo);
  // Sin este filtro el aviso saldria en CADA pull request que agrega una
  // prueba, y un aviso que sale siempre deja de leerse.
  assert.doesNotMatch(r.stderr, /comparten extension con lo que la cobertura mide/);
});

test("varios lcov del monorepo se suman en una sola medicion", () => {
  const { dir, base } = repoConBase();
  escribir(dir, "web/src/suma.ts", fixture("suma-v2.ts"));
  escribir(dir, "api/src/suma.ts", fixture("suma-v2.ts"));
  commit(dir, "agrega resta en los dos paquetes");
  copiarFixture(dir, "lcov-cubierto-windows.info", "web/coverage/lcov.info");
  escribir(
    dir,
    "api/coverage/lcov.info",
    "TN:\nSF:api/src/suma.ts\nDA:1,1\nDA:2,3\nDA:5,1\nDA:6,0\nend_of_record\n"
  );

  const r = correr(dir, { COBERTURA_BASE: base, COBERTURA_MINIMO: "70" });

  // web modifica un archivo existente: solo sus 2 lineas nuevas se miden, y
  // las dos estan cubiertas. api es un archivo NUEVO, asi que se miden sus 4
  // lineas ejecutables (1, 2, 5 y 6), de las que la 6 quedo sin cubrir.
  assert.equal(r.salidas.lineas_medidas, "6");
  assert.equal(r.salidas.lineas_sin_cubrir, "1");
  assert.equal(r.salidas.porcentaje, "83.33");
  assert.equal(r.codigo, 0, r.todo);
});

// ── Piezas sueltas ──────────────────────────────────────────────────────────

test("parsearDiff toma las lineas agregadas y descarta los borrados puros", () => {
  const diff = [
    "diff --git a/web/src/a.ts b/web/src/a.ts",
    "--- a/web/src/a.ts",
    "+++ b/web/src/a.ts",
    "@@ -3,0 +4,2 @@",
    "+const a = 1;",
    "+const b = 2;",
    "@@ -10,2 +11,0 @@",
    "-const viejo = 1;",
    "-const viejo2 = 2;",
    "diff --git a/borrado.ts b/borrado.ts",
    "--- a/borrado.ts",
    "+++ /dev/null",
    "@@ -1,3 +0,0 @@",
    "-uno",
    "",
  ].join("\n");

  const r = parsearDiff(diff);
  assert.deepEqual([...r.keys()], ["web/src/a.ts"]);
  assert.deepEqual([...r.get("web/src/a.ts")].sort((x, y) => x - y), [4, 5]);
});

test("parsearDiff no confunde una linea de contenido que empieza con +++", () => {
  const diff = [
    "diff --git a/x.md b/x.md",
    "--- a/x.md",
    "+++ b/x.md",
    "@@ -0,0 +1,1 @@",
    "+++ esto es contenido, no una cabecera",
    "",
  ].join("\n");

  const r = parsearDiff(diff);
  assert.deepEqual([...r.keys()], ["x.md"]);
  assert.deepEqual([...r.get("x.md")], [1]);
});

test("parsearLcov se queda con el maximo de hits cuando la ruta aparece dos veces", () => {
  const datos = parsearLcov("SF:a.ts\nDA:1,0\nDA:2,5\nend_of_record\nSF:a.ts\nDA:1,3\nend_of_record\n");
  assert.equal(datos.get("a.ts").get(1), 3);
  assert.equal(datos.get("a.ts").get(2), 5);
});

test("normalizarRuta deja las rutas de Windows comparables contra git", () => {
  assert.equal(normalizarRuta("web\\src\\App.tsx"), "web/src/App.tsx");
  assert.equal(normalizarRuta("./web//src/App.tsx"), "web/src/App.tsx");
});

test("la convencion de nombres de pruebas cubre lo que usan los proyectos", () => {
  for (const r of [
    "web/src/a.test.ts",
    "web/src/a.test.tsx",
    "api/src/a.spec.ts",
    "e2e/flujos.spec.ts",
    "web/src/__tests__/ayuda.ts",
  ]) {
    assert.ok(esArchivoDePrueba(r), r);
  }
  for (const r of ["web/src/a.ts", "web/src/testigo.ts", "api/src/spec-viewer.ts"]) {
    assert.ok(!esArchivoDePrueba(r), r);
  }
});

test("el glob por defecto encuentra el lcov en la raiz y en cualquier paquete", () => {
  const re = globARegExp("**/coverage/lcov.info");
  assert.ok(re.test("coverage/lcov.info"));
  assert.ok(re.test("web/coverage/lcov.info"));
  assert.ok(re.test("paquetes/api/coverage/lcov.info"));
  assert.ok(!re.test("web/coverage/lcov-report/index.html"));
});
