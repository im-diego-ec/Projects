// Pruebas del comparador de cobertura sobre el diff (bloque 1.2 del change
// calidad-fail-closed). El marco NO puede dogfoodear este check —no tiene
// paquetes ni pruebas propias que medir— asi que este banco es la unica
// verificacion automatica que el codigo tiene antes de llegar a todos los
// consumidores. Por eso corre casos borde, y no un camino feliz.
//
//   node --test actions/cobertura-diff/pruebas/
import test, { after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { AQUI, commit, copiarFixture, correr, escribir, fixture, git, limpiar, repoConBase, repoNuevo } from "./ayuda.mjs";
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
  // Tambien en el camino ROJO la salida declara cuantas lineas fuente
  // quedaron fuera: publicar 0 mientras el archivo del cambio no se pudo
  // medir es la misma mentira por omision que en el camino verde.
  assert.notEqual(r.salidas.lineas_fuera_de_medicion, "0", r.todo);
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

// ── Un archivo fuente sin datos es ROJO, como promete el spec ───────────────
//
// El scenario vive en la capability calidad-codigo: "un cambio agrega lineas
// ejecutables y la medicion no encuentra datos de cobertura que les
// correspondan -> la integracion FALLA". Esto salia como ::warning:: con exit
// 0, y un ruleset solo mira el codigo de salida: el archivo nuevo sin una sola
// prueba cruzaba la compuerta igual. La valvula de escape no es bajar el
// aviso: es la exclusion declarada con motivo, que el mismo spec contempla.

test("un archivo fuente que ningun reporte reclama es ROJO, no un aviso", () => {
  const { dir, base } = repoConBase();
  escribir(dir, "web/src/suma.ts", fixture("suma-v2.ts"));
  escribir(dir, "web/src/nuevo-sin-medir.ts", "export const x = 1;\n");
  commit(dir, "agrega resta y un archivo que la cobertura no reclama");
  copiarFixture(dir, "lcov-cubierto-windows.info", "web/coverage/lcov.info");

  const r = correr(dir, { COBERTURA_BASE: base });

  assert.equal(r.codigo, 1, r.todo);
  assert.match(r.stderr, /nuevo-sin-medir\.ts/);
  // El mensaje trae las DOS salidas legitimas, no solo el diagnostico. Y la
  // primera nombra la opcion que la herramienta VIGENTE lee: hasta el change
  // el-marco-deja-de-afirmar-lo-que-no-hace este caso exigia `all: true`, o sea
  // fijaba como correcto un consejo que vitest 3 retiro y la 5 ignora sin aviso.
  assert.match(r.stderr, /coverage\.include/);
  assert.doesNotMatch(r.stderr, /revisa 'all: true'/);
  assert.match(r.stderr, /projects\.cobertura\.excluidos/);
});

// REGRESION. El aviso vivia DESPUES de la salida temprana de "no medi nada", asi
// que era inalcanzable justo donde mas importa: un cambio que toca SOLO archivos
// que ningun reporte reclama salia exit 0 y MUDO. Que el aviso dependiera de que
// en el mismo pull request viniera ademas un archivo medido es el fail-open
// silencioso que el marco prohibe. No es hipotetico: los scripts sueltos y los
// .ts de e2e del consumidor son exactamente esos archivos, y basta meterlos en
// un tsconfig —sin una sola prueba— para que el censo se de por satisfecho.
test("un cambio que toca SOLO archivos sin medir nunca sale mudo", () => {
  const { dir, base } = repoConBase();
  escribir(dir, "web/src/nuevo-sin-medir.ts", "export const x = 1;\nexport const y = 2;\n");
  commit(dir, "agrega un archivo que ningun reporte reclama, y NADA mas");
  copiarFixture(dir, "lcov-cubierto-windows.info", "web/coverage/lcov.info");

  const r = correr(dir, { COBERTURA_BASE: base });

  assert.equal(r.codigo, 1, r.todo);
  assert.match(r.stderr, /nuevo-sin-medir\.ts/);
});

// REGRESION DEL ENDURECIMIENTO. Al volver ROJO el archivo fuente sin datos hubo
// que decidir que linea "tiene contenido", y el filtro solo miraba la linea que
// ABRE una declaracion de tipos: el CUERPO de un type o de una interface
// —"id: string;", '| "aprobado"', "buscar(id): Promise<void>;"— contaba como
// codigo. Un tipos.ts, el archivo mas comun del stack fijado, quedaba rojo sin
// prueba posible que lo apagara: ningun reporter emite DA: para una declaracion
// de tipos. Un check que se pone rojo en falso termina desactivado, y vale cero.
test("un archivo de PUROS TIPOS no enrojece: ningun reporter puede medirlo", () => {
  const { dir, base } = repoConBase();
  escribir(
    dir,
    "web/src/tipos.ts",
    "// Los tipos del dominio.\n" +
      "export type Usuario = {\n  id: string;\n  nombre: string;\n};\n\n" +
      'export type Estado =\n  | "pendiente"\n  | "aprobado";\n\n' +
      "export interface RepositorioUsuarios {\n" +
      "  buscar(id: string): Promise<Usuario | null>;\n" +
      "  guardar(u: Usuario): Promise<void>;\n}\n"
  );
  escribir(
    dir,
    "web/src/global.d.ts",
    'declare module "*.svg" {\n  const contenido: string;\n  export default contenido;\n}\n'
  );
  commit(dir, "agrega los tipos del dominio");
  copiarFixture(dir, "lcov-cubierto-windows.info", "web/coverage/lcov.info");

  const r = correr(dir, { COBERTURA_BASE: base });

  assert.equal(r.codigo, 0, r.todo);
  assert.doesNotMatch(r.stderr, /sin ningun dato de cobertura/);
  // Y no se cuelan al denominador por la puerta de atras.
  assert.equal(r.salidas.lineas_fuera_de_medicion, "0", r.todo);
});

// El otro lado de la misma moneda: el filtro de tipos NO puede tragarse codigo
// de verdad que venga despues en el mismo archivo, porque eso seria el
// fail-open que todo este lote vino a cerrar.
test("codigo ejecutable DESPUES de un bloque de tipos sigue enrojeciendo", () => {
  const { dir, base } = repoConBase();
  escribir(
    dir,
    "web/src/mixto.ts",
    "export interface Config {\n  puerto: number;\n}\n\n" +
      "export function crear(c: Config) {\n  return c.puerto + 1;\n}\n"
  );
  commit(dir, "tipos y codigo en el mismo archivo, sin pruebas");
  copiarFixture(dir, "lcov-cubierto-windows.info", "web/coverage/lcov.info");

  const r = correr(dir, { COBERTURA_BASE: base });

  assert.equal(r.codigo, 1, r.todo);
  assert.match(r.stderr, /mixto\.ts/);
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

// ── Fail-open reproducidos por la revision adversarial ──────────────────────
//
// Cada uno de estos casos SALIA EN VERDE (algunos MUDOS) antes del arreglo.
// La regla que violaban es la misma: ningun camino puede terminar en exito
// silencioso cuando la verificacion no se pudo hacer.

// 1. El lcov RANCIO. El archivo esta reclamado por un SF:, asi que esquiva
// todas las defensas de rutas; pero el reporte es ANTERIOR al cambio y no
// tiene una sola entrada DA para las lineas nuevas. Antes del arreglo el
// archivo desaparecia de TODO —ni siquiera caia en noReclamados— y el paso
// salia exit 0 MUDO. Vector real: un cache de CI que restaura coverage/, una
// suite que no se volvio a correr, o el lcov comiteado.
test("lcov rancio: el archivo esta reclamado pero sus lineas nuevas no tienen dato — ROJO", () => {
  const { dir } = repoConBase();
  escribir(dir, "web/src/a.ts", "export const a = 1;\nexport const b = 2;\n");
  escribir(
    dir,
    "web/coverage/lcov.info",
    "TN:\nSF:web/src/a.ts\nDA:1,1\nDA:2,1\nLF:2\nLH:2\nend_of_record\n"
  );
  const base = commit(dir, "a.ts con su cobertura al dia");

  escribir(
    dir,
    "web/src/a.ts",
    [
      "export const a = 1;",
      "export const b = 2;",
      "export const c = 3;",
      "export const d = 4;",
      "export const e = 5;",
      "export const f = 6;",
      "export const g = 7;",
      "",
    ].join("\n")
  );
  commit(dir, "agrega 5 lineas ejecutables y NO regenera la cobertura");

  const r = correr(dir, { COBERTURA_BASE: base });

  assert.equal(r.codigo, 1, r.todo);
  assert.notEqual(r.salidas.porcentaje, "100.00");
  assert.match(r.stderr, /anterior al cambio/);
  assert.match(r.stderr, /web\/src\/a\.ts/);
});

// 1b. El caso degenerado del rancio: un registro SF: SIN una sola entrada
// DA (el reporter emitio el archivo vacio, o lo dejo fuera de all: true).
// Sigue siendo rojo, pero el diagnostico decia "hasta la linea -Infinity":
// un mensaje roto es un mensaje que el consumidor no puede accionar, y la
// regla del marco pide el ORIGEN PRECISO, no solo el color.
test("un registro SF: sin ninguna entrada DA es ROJO y lo dice sin -Infinity", () => {
  const dir = repoNuevo();
  escribir(dir, "web/src/a.ts", "export const a = 1;\n");
  const base = commit(dir, "base");
  escribir(dir, "web/src/a.ts", "export const a = 1;\nexport const b = 2;\n");
  commit(dir, "agrega una linea ejecutable");
  escribir(
    dir,
    "web/coverage/lcov.info",
    "TN:\nSF:web/src/a.ts\nLF:0\nLH:0\nend_of_record\n"
  );

  const r = correr(dir, { COBERTURA_BASE: base });

  assert.equal(r.codigo, 1, r.todo);
  assert.ok(r.stderr.includes("web/src/a.ts"), r.todo);
  assert.ok(!r.todo.includes("-Infinity"), r.todo);
});

// 2. Una extension que NINGUN reporte mide. El aviso se calculaba contra las
// extensiones que casualmente traian los lcov presentes, asi que un repo que
// mide .ts no decia una palabra sobre un .tsx nuevo sin pruebas.
test("una extension que ningun reporte mide no puede salir en silencio", () => {
  const { dir, base } = repoConBase();
  escribir(
    dir,
    "web/src/Boton.tsx",
    [
      "export function Boton(props: { texto: string }) {",
      "  const etiqueta = props.texto.trim();",
      "  if (!etiqueta) {",
      "    return null;",
      "  }",
      "  return etiqueta;",
      "}",
      "",
    ].join("\n")
  );
  commit(dir, "agrega un componente .tsx sin una sola prueba");
  copiarFixture(dir, "lcov-cubierto-windows.info", "web/coverage/lcov.info");

  const r = correr(dir, { COBERTURA_BASE: base });

  assert.equal(r.codigo, 1, r.todo);
  assert.match(r.stderr, /Boton\.tsx/);
});

// 3. La dilucion a 100%: una linea cubierta y cincuenta sin dato publican
// "porcentaje=100.00" sobre una cobertura real de ~2%.
test("el porcentaje jamas se publica sin declarar las lineas fuente fuera del denominador", () => {
  const { dir, base } = repoConBase();
  escribir(dir, "api/src/index.ts", "export const arranca = 1;\n");
  escribir(
    dir,
    "web/src/App.tsx",
    Array.from({ length: 50 }, (_, i) => `export const v${i} = ${i};`).join("\n") + "\n"
  );
  commit(dir, "una linea medida y cincuenta sin dato");
  escribir(
    dir,
    "api/coverage/lcov.info",
    "TN:\nSF:api/src/index.ts\nDA:1,1\nLF:1\nLH:1\nend_of_record\n"
  );

  const r = correr(dir, { COBERTURA_BASE: base });

  assert.notEqual(r.salidas.porcentaje, "100.00", r.todo);
  assert.equal(r.codigo, 1, r.todo);
  assert.match(r.stderr, /50 linea/);
  assert.match(r.stderr, /App\.tsx/);
  assert.equal(r.salidas.lineas_fuera_de_medicion, "50", r.todo);
});

// 4. La exclusion declarada con motivo: el unico camino legitimo para que un
// archivo fuente del cambio quede fuera de la medicion sin enrojecerla.
test("una exclusion declarada con motivo devuelve ese archivo a verde, y queda en el resumen", () => {
  const { dir, base } = repoConBase();
  escribir(
    dir,
    "web/package.json",
    JSON.stringify(
      {
        name: "web",
        projects: {
          cobertura: {
            excluidos: [{ patron: "src/generado.ts", motivo: "lo genera el codegen del cliente" }],
          },
        },
      },
      null,
      2
    ) + "\n"
  );
  escribir(dir, "web/src/generado.ts", "export const generado = 1;\nexport const otro = 2;\n");
  commit(dir, "agrega un archivo generado, excluido con motivo");
  copiarFixture(dir, "lcov-cubierto-windows.info", "web/coverage/lcov.info");

  const r = correr(dir, { COBERTURA_BASE: base });

  assert.equal(r.codigo, 0, r.todo);
  assert.match(r.resumen, /generado\.ts/);
  assert.match(r.resumen, /lo genera el codegen/);
});

// 5. Colision de rutas en un monorepo sin projectRoot: "SF:src/util.ts"
// emitido por el paquete web resuelve contra el src/util.ts de la RAIZ, asi
// que sinResolver queda vacio y el detector de sospechosos —que solo mira
// basenames de rutas NO resueltas— queda ciego. Es el modo de falla del design
// D5 entrando por otra puerta.
test("colision de rutas en monorepo: un SF: relativo que tambien resuelve dentro del paquete es ROJO", () => {
  const dir = repoNuevo();
  escribir(dir, "src/util.ts", "export const raiz = 1;\n");
  escribir(dir, "web/src/util.ts", "export const web = 1;\n");
  const base = commit(dir, "base con dos util.ts");
  escribir(
    dir,
    "web/src/util.ts",
    "export const web = 1;\nexport const a = 2;\nexport const b = 3;\nexport const c = 4;\n"
  );
  commit(dir, "agrega 3 lineas al util del paquete web, sin pruebas");
  escribir(dir, "web/coverage/lcov.info", "TN:\nSF:src/util.ts\nDA:1,5\nLF:1\nLH:1\nend_of_record\n");

  const r = correr(dir, { COBERTURA_BASE: base });

  assert.equal(r.codigo, 1, r.todo);
  assert.match(r.stderr, /projectRoot/);
  // El diagnostico EQUIVOCADO: mandar a revisar el alcance de la cobertura
  // (coverage.include, que en vitest 2.x era all: true) cuando el problema es
  // que la ruta del reporte no dice a que archivo corresponde.
  assert.doesNotMatch(r.stderr, /all: true|coverage\.include/);
});

// 6. El minimo no tiene piso: un consumidor puede pasar minimo: '0' y el gate
// pasa siempre, sin que el marco se entere nunca.
test("un minimo por debajo del minimo del marco avisa fuerte", () => {
  const { dir, base } = repoConBase();
  escribir(dir, "web/src/suma.ts", fixture("suma-v2.ts"));
  commit(dir, "agrega resta sin pruebas");
  copiarFixture(dir, "lcov-sin-cubrir.info", "web/coverage/lcov.info");

  const r = correr(dir, { COBERTURA_BASE: base, COBERTURA_MINIMO: "0" });

  // Sigue pasando —el consumidor manda sobre su propio umbral— pero NO en
  // silencio: el marco dice cual es su minimo.
  assert.equal(r.codigo, 0, r.todo);
  assert.match(r.stderr, /::warning::.*minimo del marco/);
});

// ── `.github/` es configuracion del proveedor de CI, no fuente de aplicacion ──
//
// EL CASO REAL, en el upstream de este marco (Rigel 1.11.0, commits 7f780be y
// ff79b34, 2026-08-31): un consumidor versiono un script de CI en
// `.github/scripts/*.mjs`. Es `.mjs`, asi que `esFuente()` —que mira solo la
// extension— lo declaro fuente; ningun reporte lcov lo reclama, porque ningun
// paquete lo compila ni lo ejecuta; y el plano del diff lo puso ROJO con «sin
// datos no es cubierto». No hay prueba que pueda apagar ese rojo: el archivo corre
// en el runner, no en la suite de ningun paquete. Y el Censo de fuentes del MISMO
// pipeline lo daba verde: dos compuertas del marco discrepaban sobre que es fuente.
//
// EL PAQUETE RAIZ ES LA TRAMPA, y va a proposito en los dos casos. El primer
// arreglo de alla eximia «lo que ningun paquete reclama», y quedo INERTE: los
// consumidores tienen un `package.json` en la raiz, asi que ese archivo siempre
// cae en algun paquete. Paso los bancos y fallo contra el consumidor real, porque
// los bancos no declaraban el paquete raiz. Con el, el caso distingue el arreglo
// bueno (la ruta `.github/`) del roto (el alcance del paquete).
test("un archivo bajo `.github/` no exige cobertura: nadie puede cubrirlo", () => {
  const { dir, base } = repoConBase();
  escribir(dir, "package.json", '{ "name": "raiz", "version": "0.0.0" }\n');
  escribir(dir, "web/package.json", '{ "name": "web", "version": "0.0.0" }\n');
  escribir(
    dir,
    ".github/scripts/armar-algo.mjs",
    "/* global process, console */\n" +
      "// Un script de CI: corre en el runner, no en la suite de ningun paquete.\n" +
      "const [, , entrada] = process.argv;\n" +
      "if (!entrada) {\n  console.error('falta la entrada');\n  process.exit(1);\n}\n" +
      "console.log(`procesando ${entrada}`);\n"
  );
  commit(dir, "agrega un script de CI que ningun paquete compila");
  copiarFixture(dir, "lcov-cubierto-windows.info", "web/coverage/lcov.info");

  const r = correr(dir, { COBERTURA_BASE: base });

  assert.equal(r.codigo, 0, `un script de CI no puede enrojecer la cobertura:\n${r.todo}`);
  assert.doesNotMatch(r.stderr, /sin ningun dato de cobertura/, r.todo);
  // Tampoco entra al denominador por la puerta de atras...
  assert.equal(r.salidas.lineas_fuera_de_medicion, "0", r.todo);
  // ...y no desaparece en silencio: la corrida lo nombra como fuera de la medicion.
  assert.match(r.resumen, /\.github\/scripts\/armar-algo\.mjs/, r.todo);
  assert.match(r.stderr, /::notice::.*\.github\/scripts\/armar-algo\.mjs/, r.todo);
});

test("y un archivo de aplicacion sigue siendo rojo sin datos, con paquete raiz y todo", () => {
  // El control de la regla anterior. Sin este caso, aflojar la compuerta para los
  // archivos de CI podria aflojarla para todos sin que nada lo dijera.
  const { dir, base } = repoConBase();
  escribir(dir, "package.json", '{ "name": "raiz", "version": "0.0.0" }\n');
  escribir(dir, "web/package.json", '{ "name": "web", "version": "0.0.0" }\n');
  escribir(dir, "web/src/sin-pruebas.ts", "export function sumar(a: number, b: number) {\n  return a + b;\n}\n");
  // Un directorio que SE PARECE a `.github/` y no lo es: la exencion es por la
  // ruta exacta del proveedor, no por un prefijo de texto.
  escribir(dir, "web/src/.github-no/copia.ts", "export const copia = () => 1;\n");
  commit(dir, "agrega codigo de aplicacion sin pruebas");
  copiarFixture(dir, "lcov-cubierto-windows.info", "web/coverage/lcov.info");

  const r = correr(dir, { COBERTURA_BASE: base });

  assert.equal(r.codigo, 1, `codigo de aplicacion sin datos tiene que seguir en rojo:\n${r.todo}`);
  assert.match(r.stderr, /web\/src\/sin-pruebas\.ts,line=\d+::archivo fuente del cambio sin ningun dato de cobertura/, r.todo);
  assert.match(r.stderr, /web\/src\/\.github-no\/copia\.ts,line=\d+::archivo fuente del cambio sin ningun dato/, r.todo);
});

// ── Lo que la action le dicta al consumidor existe en la herramienta vigente ──
//
// EL DEFECTO, medido el 2026-09-13 en el upstream (Rigel 2.6.0, commit fabe1e6) y
// presente aca: siete mensajes de arreglo de esta action, la cabecera de su
// action.yml y cuatro pasajes de actions/README.md le decian al consumidor «corre
// con `all: true`». vitest 3 retiro `coverage.all` y la mayor 5 la IGNORA SIN UN
// AVISO; el andamio ya lo habia medido en 4.1.11 (ver el bloque de `include` de
// plantilla/vitest.config.base.mjs). O sea que el rojo mandaba a agregar una linea
// inerte, y el archivo que ninguna prueba importa seguia sin medirse. El scaffold
// y la action se contradecian.
//
// LA REGLA: `all: true` puede aparecer solo como HISTORIA —en la misma unidad de
// texto que dice «vitest 2»—, nunca como el arreglo. La unidad es la LINEA en el
// .mjs (cada mensaje vive en una) y el PARRAFO en el action.yml y el README, que
// parten las frases en varias lineas. LIMITE DECLARADO: esto caza la opcion
// retirada que ya se escribio; no sabe si la proxima mayor de vitest retira otra.
const ALL_TRUE = /\ball:\s*true\b/;
const COMO_HISTORIA = /vitest 2/;

function unidades(texto, porParrafo) {
  const lineas = texto.replace(/\r\n/g, "\n").split("\n");
  if (!porParrafo) return lineas.map((t, i) => ({ texto: t, linea: i + 1 }));
  const salida = [];
  let actual = null;
  lineas.forEach((t, i) => {
    // Una linea en blanco o de puro marcador de comentario corta el parrafo.
    if (/^\s*(#|>|\/\/)?\s*$/.test(t)) {
      actual = null;
      return;
    }
    if (!actual) {
      actual = { texto: "", linea: i + 1 };
      salida.push(actual);
    }
    actual.texto += ` ${t}`;
  });
  return salida;
}

function dictados(rel, porParrafo) {
  const texto = readFileSync(join(AQUI, "..", "..", "..", rel), "utf8");
  return unidades(texto, porParrafo)
    .filter((u) => ALL_TRUE.test(u.texto) && !COMO_HISTORIA.test(u.texto))
    .map((u) => `${rel}:${u.linea}`);
}

test("el detector de consejos vencidos distingue el consejo de la historia", () => {
  // El control: sin el, un regex roto deja el caso de abajo en verde mirando aire.
  const consejo = unidades("Arreglo: corre las pruebas con cobertura (y con 'all: true')", false);
  const historia = unidades("revisa coverage.include; en vitest 2.x era 'all: true'", false);
  assert.equal(consejo.filter((u) => ALL_TRUE.test(u.texto) && !COMO_HISTORIA.test(u.texto)).length, 1);
  assert.equal(historia.filter((u) => ALL_TRUE.test(u.texto) && !COMO_HISTORIA.test(u.texto)).length, 0);
});

test("ningun texto que lee el consumidor le dicta `all: true`, una opcion que vitest ya no lee", () => {
  const encontrados = [
    ...dictados("actions/cobertura-diff/medir-cobertura-diff.mjs", false),
    ...dictados("actions/cobertura-diff/action.yml", true),
    ...dictados("actions/README.md", true),
  ];
  assert.deepEqual(
    encontrados,
    [],
    "estos lugares le indican al consumidor `all: true` como arreglo. vitest 3 retiro coverage.all y la 5 la " +
      "ignora sin aviso: seguir el consejo agrega una linea inerte y deja sin medir el archivo que ninguna " +
      "prueba importa. Arreglo: nombrar coverage.include (el alcance declarado), y si hace falta citar la forma " +
      "vieja, en la misma frase y como historia («en vitest 2.x era all: true»)",
  );
});
