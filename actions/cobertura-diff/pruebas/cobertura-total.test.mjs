// Banco del PLANO DEL TOTAL: la compuerta que compara la cobertura total de
// cada paquete contra el minimo del marco, con el piso como transicion y la
// deuda declarada con fecha como unico permiso para estar debajo.
//
// Por que un archivo aparte del banco del diff: son dos compuertas con reglas
// distintas dentro del mismo script, y mezclarlas hacia imposible leer cual de
// las dos habia enrojecido. Cada caso de aca fue medido primero contra el
// codigo ANTERIOR —donde la compuerta no existia y todos daban EXIT 0— y
// despues contra el codigo nuevo mutado.
//
// LA MEDICION QUE ORIGINO ESTE ARCHIVO. Un paquete sintetico con total 33,3%
// (lcov LF:6 LH:2), sin motivo ni fecha declarados y con las lineas del diff
// bien cubiertas, salia EXIT 0 con COBERTURA_MINIMO=80 y sin un solo
// ::warning:: sobre el total. El spec de calidad-codigo prometia rojo desde el
// dia en que se escribio.
import test from "node:test";
import assert from "node:assert/strict";
import { after } from "node:test";
import { readFileSync } from "node:fs";

import { commit, correr, escribir, limpiar, repoNuevo } from "./ayuda.mjs";
import {
  agregarPorPaquete,
  diasEntre,
  parsearLcovDetallado,
  veredictoDePaquete,
} from "../medir-cobertura-diff.mjs";

after(limpiar);

// El dia con el que se comparan los plazos. La compuerta del total se estrena
// con una VENTANA DE GRACIA (ver VENTANA_DE_GRACIA_HASTA en el comparador):
// mientras dura, un paquete sin deuda declarada avisa en vez de detener. Los
// casos de regimen —los que exigen ROJO por falta de declaracion— se corren con
// la ventana YA CERRADA, porque es el estado permanente lo que hay que fijar;
// los de la ventana en si tienen sus dos pruebas propias, una a cada lado.
const HOY = "2026-08-20";
const CERRADA = "2026-10-01";

// ---------------------------------------------------------------------------
// Armado de los casos
// ---------------------------------------------------------------------------

/**
 * Texto lcov de un archivo. `lineas` es un arreglo de hits, uno por linea
 * (indice 0 = linea 1). `funciones` y `ramas` son arreglos de hits.
 */
function lcov(archivo, { lineas = [], funciones = [], ramas = [] }) {
  const salida = ["TN:", `SF:${archivo}`];
  funciones.forEach((hits, i) => {
    salida.push(`FN:${i + 1},fn${i}`);
    salida.push(`FNDA:${hits},fn${i}`);
  });
  salida.push(`FNF:${funciones.length}`, `FNH:${funciones.filter((h) => h > 0).length}`);
  ramas.forEach((hits, i) => salida.push(`BRDA:1,0,${i},${hits === 0 ? "-" : hits}`));
  salida.push(`BRF:${ramas.length}`, `BRH:${ramas.filter((h) => h > 0).length}`);
  lineas.forEach((hits, i) => salida.push(`DA:${i + 1},${hits}`));
  salida.push(`LF:${lineas.length}`, `LH:${lineas.filter((h) => h > 0).length}`);
  salida.push("end_of_record");
  return salida.join("\n") + "\n";
}

/**
 * Un repo con el paquete `web`, cuyo unico modulo tiene `lineas.length` lineas
 * y un lcov que declara exactamente esos hits.
 *
 * LA ULTIMA LINEA es la que el cambio agrega, y va siempre CUBIERTA a
 * proposito: asi el plano del diff pasa y el codigo de salida de la corrida
 * habla unicamente del plano del total. Sin esa separacion, un rojo no diria
 * cual de las dos compuertas lo produjo.
 *
 * `enLaBase` escribe archivos ANTES del commit base, asi que el plano del diff
 * no los ve. Es la unica forma de agregar un SEGUNDO paquete sin que sus lineas
 * cuenten como agregadas: la primera version de estas pruebas lo escribio
 * DESPUES del base y su `EXIT 1` venia del plano del diff, no del total —o sea
 * que la prueba pasaba sin medir lo que decia medir, que es la falla que un
 * control negativo existe para encontrar.
 */
function repoConTotal({
  lineas,
  manifiesto = { name: "web" },
  funciones,
  ramas,
  extras = {},
  enLaBase = {},
}) {
  const dir = repoNuevo();
  escribir(dir, "package.json", JSON.stringify({ name: "raiz", private: true }) + "\n");
  escribir(dir, "web/package.json", JSON.stringify(manifiesto, null, 2) + "\n");
  for (const [archivo, contenido] of Object.entries(enLaBase)) escribir(dir, archivo, contenido);
  const cuerpoBase = lineas
    .slice(0, -1)
    .map((_, i) => `export const f${i} = (x) => x + ${i};`)
    .join("\n");
  escribir(dir, "web/src/mod.js", cuerpoBase + "\n");
  const base = commit(dir, "base");

  const cuerpo = lineas.map((_, i) => `export const f${i} = (x) => x + ${i};`).join("\n");
  escribir(dir, "web/src/mod.js", cuerpo + "\n");
  escribir(
    dir,
    "web/coverage/lcov.info",
    lcov("web/src/mod.js", { lineas, funciones, ramas }) +
      Object.entries(extras)
        .map(([archivo, spec]) => lcov(archivo, spec))
        .join("")
  );
  for (const [archivo, contenido] of Object.entries(extras)) {
    if (contenido.fuente) escribir(dir, archivo, contenido.fuente);
  }
  commit(dir, "cambio");
  return { dir, base };
}

/** El caso de la auditoria: 6 lineas, 2 cubiertas, la del cambio entre ellas. */
const LINEAS_33 = [0, 0, 0, 0, 1, 1];

// Por defecto los casos corren con la ventana de estreno YA CERRADA: lo que hay
// que fijar es el regimen permanente. La ventana tiene sus propias pruebas.
const correrTotal = (dir, base, env = {}) =>
  correr(dir, { COBERTURA_BASE: base, COBERTURA_MINIMO: "80", COBERTURA_HOY: CERRADA, ...env });

// ---------------------------------------------------------------------------
// La regla, como funcion pura. Los bordes que un repo temporal esconde.
// ---------------------------------------------------------------------------

const metricas = (encontradas, cubiertas) => ({ lineas: { encontradas, cubiertas } });

test("por debajo del minimo y sin deuda declarada: ROJO, y no es un retroceso", () => {
  const v = veredictoDePaquete({ metricas: metricas(6, 2), minimo: 80, hoy: CERRADA });
  assert.equal(v.estado, "rojo");
  assert.equal(v.filas[0].veredicto, "sin-plazo");
  assert.ok(Math.abs(v.filas[0].falta - (80 - 100 / 3)) < 1e-9);
});

test("la ventana de estreno afloja la falta de declaracion, y solo eso", () => {
  const dentro = { metricas: metricas(6, 2), minimo: 80, hoy: "2026-08-20", ventanaHasta: "2026-09-30" };
  const v = veredictoDePaquete(dentro);
  assert.equal(v.estado, "amarillo");
  assert.equal(v.filas[0].veredicto, "sin-plazo-en-gracia");
  assert.equal(v.diasDeVentana, 41);

  // El ultimo dia de la ventana todavia cuenta; el siguiente ya no.
  assert.equal(
    veredictoDePaquete({ ...dentro, hoy: "2026-09-30" }).filas[0].veredicto,
    "sin-plazo-en-gracia"
  );
  assert.equal(veredictoDePaquete({ ...dentro, hoy: "2026-10-01" }).filas[0].veredicto, "sin-plazo");
  assert.equal(veredictoDePaquete({ ...dentro, hoy: "2026-10-01" }).estado, "rojo");
});

test("la ventana de estreno NO perdona lo que el paquete escribio y rompio", () => {
  const dentro = { minimo: 80, hoy: "2026-08-20", ventanaHasta: "2026-09-30" };
  // Un plazo declarado y vencido es una promesa propia incumplida.
  const vencido = veredictoDePaquete({
    ...dentro,
    metricas: metricas(6, 2),
    deuda: { motivo: "heredada", fecha: "1999-01-01" },
  });
  assert.equal(vencido.estado, "rojo");
  assert.equal(vencido.filas[0].veredicto, "plazo-vencido");

  // Un retroceso por debajo de un piso declarado, tambien.
  const retroceso = veredictoDePaquete({ ...dentro, metricas: metricas(100, 90), piso: { lineas: 93.7 } });
  assert.equal(retroceso.estado, "rojo");
  assert.equal(retroceso.filas[0].veredicto, "retroceso");
});

test("por debajo del minimo con la fecha ya pasada: ROJO por plazo vencido", () => {
  const v = veredictoDePaquete({
    metricas: metricas(6, 2),
    deuda: { motivo: "heredada", fecha: "1999-01-01" },
    minimo: 80,
    hoy: HOY,
  });
  assert.equal(v.estado, "rojo");
  assert.equal(v.filas[0].veredicto, "plazo-vencido");
  assert.equal(v.vencida, true);
});

test("la fecha que vence HOY todavia esta vigente: el plazo se agota al dia siguiente", () => {
  const hoyMismo = veredictoDePaquete({
    metricas: metricas(6, 2),
    deuda: { motivo: "heredada", fecha: HOY },
    minimo: 80,
    hoy: HOY,
  });
  assert.equal(hoyMismo.estado, "amarillo");
  assert.equal(hoyMismo.diasDePlazo, 0);

  const ayer = veredictoDePaquete({
    metricas: metricas(6, 2),
    deuda: { motivo: "heredada", fecha: "2026-08-19" },
    minimo: 80,
    hoy: HOY,
  });
  assert.equal(ayer.estado, "rojo");
  assert.equal(ayer.filas[0].veredicto, "plazo-vencido");
});

test("por debajo del minimo con plazo vigente: AMARILLO, y dice cuanto falta y cuanto queda", () => {
  const v = veredictoDePaquete({
    metricas: metricas(10, 7),
    deuda: { motivo: "heredada", fecha: "2026-12-31" },
    minimo: 80,
    hoy: HOY,
  });
  assert.equal(v.estado, "amarillo");
  assert.equal(v.filas[0].veredicto, "en-plazo");
  assert.ok(Math.abs(v.filas[0].falta - 10) < 1e-9);
  assert.equal(v.diasDePlazo, diasEntre(HOY, "2026-12-31"));
});

test("el piso es ganancia acumulada: caer por debajo es ROJO aunque el total supere el minimo", () => {
  const v = veredictoDePaquete({
    metricas: metricas(100, 90),
    piso: { lineas: 93.7 },
    minimo: 80,
    hoy: HOY,
  });
  assert.equal(v.estado, "rojo");
  assert.equal(v.filas[0].veredicto, "retroceso");
});

test("una deuda vigente NO excusa un retroceso: el piso vale igual", () => {
  const v = veredictoDePaquete({
    metricas: metricas(100, 60),
    piso: { lineas: 70 },
    deuda: { motivo: "heredada", fecha: "2026-12-31" },
    minimo: 80,
    hoy: HOY,
  });
  assert.equal(v.estado, "rojo");
  assert.equal(v.filas[0].veredicto, "retroceso");
});

test("en el minimo justo es VERDE: 80 no esta por debajo de 80", () => {
  const v = veredictoDePaquete({ metricas: metricas(10, 8), minimo: 80, hoy: HOY });
  assert.equal(v.estado, "verde");
  assert.equal(v.filas[0].veredicto, "verde");
});

test("una metrica sin denominador se declara n/a y no se cuenta como verde ni como rojo", () => {
  const v = veredictoDePaquete({ metricas: metricas(10, 10), minimo: 80, hoy: HOY });
  const funciones = v.filas.find((f) => f.clave === "funciones");
  assert.equal(funciones.medible, false);
  assert.equal(v.estado, "verde");
});

// ---------------------------------------------------------------------------
// El parser de las tres metricas
// ---------------------------------------------------------------------------

test("una FN: sin su FNDA: cuenta como funcion declarada con cero ejecuciones", () => {
  const mapa = parsearLcovDetallado("SF:a.js\nFN:3,sola\nend_of_record\n");
  assert.equal(mapa.get("a.js").funciones.get("3,sola"), 0);
  assert.equal(mapa.get("a.js").funcionesDesparejadas, 0);
});

test("dos funciones del MISMO nombre en un archivo son dos funciones, no una", () => {
  // El caso medido en el consumidor real: 48 de sus 215 funciones comparten
  // nombre con otra del mismo archivo. Agrupandolas por nombre, el denominador
  // caia a 167 y el total de funciones se movia 1,84 puntos hacia abajo
  // (70,70% -> 68,86%) sin que nada lo dijera.
  const mapa = parsearLcovDetallado(
    "SF:a.js\nFN:1,cb\nFN:9,cb\nFNDA:3,cb\nFNDA:0,cb\nFNF:2\nFNH:1\nend_of_record\n"
  );
  const fns = mapa.get("a.js").funciones;
  assert.equal(fns.size, 2, "el nombre no es la identidad de una funcion: la linea si");
  assert.equal(fns.get("1,cb"), 3);
  assert.equal(fns.get("9,cb"), 0);
  // Y el resultado coincide con lo que el propio reporte resume (FNF/FNH).
  const cubiertas = [...fns.values()].filter((h) => h > 0).length;
  assert.equal(`${cubiertas}/${fns.size}`, "1/2");
});

test("mas FNDA: que FN: no se publica como exacto: cae a los nombres y lo declara", () => {
  const mapa = parsearLcovDetallado("SF:a.js\nFN:1,uno\nFNDA:2,uno\nFNDA:5,fantasma\nend_of_record\n");
  const registro = mapa.get("a.js");
  assert.equal(registro.funcionesDesparejadas, 1);
  assert.equal(registro.funciones.get("1,uno"), 2);
});

test("un lcov sin el end_of_record final no pierde su ultimo registro", () => {
  const mapa = parsearLcovDetallado("SF:a.js\nFN:1,uno\nFNDA:4,uno\n");
  assert.equal(mapa.get("a.js").funciones.get("1,uno"), 4);
});

test("BRDA con '-' es rama no ejecutada, no dato ausente", () => {
  const mapa = parsearLcovDetallado("SF:a.js\nBRDA:1,0,0,-\nBRDA:1,0,1,4\nend_of_record\n");
  const ramas = mapa.get("a.js").ramas;
  assert.equal(ramas.size, 2);
  assert.equal(ramas.get("1,0,0"), 0);
  assert.equal(ramas.get("1,0,1"), 4);
});

test("dos suites que miden el mismo archivo fusionan por item, no por resumen", () => {
  // El mismo archivo con LF:2 en cada reporte. Sumando resumenes darian 4
  // lineas encontradas: el denominador quedaria inflado al doble.
  const uno = "SF:a.js\nDA:1,1\nDA:2,0\nLF:2\nLH:1\nend_of_record\n";
  const dos = "SF:a.js\nDA:1,0\nDA:2,3\nLF:2\nLH:1\nend_of_record\n";
  const mapa = parsearLcovDetallado(dos, parsearLcovDetallado(uno));
  const lineas = mapa.get("a.js").lineas;
  assert.equal(lineas.size, 2);
  assert.equal(lineas.get(1), 1);
  assert.equal(lineas.get(2), 3);
});

test("agregarPorPaquete atribuye cada archivo a su manifiesto mas cercano", () => {
  const paquetes = [
    { dir: "", manifiesto: "package.json", excluidos: [], piso: {}, deuda: null, error: "" },
    { dir: "web", manifiesto: "web/package.json", excluidos: [], piso: {}, deuda: null, error: "" },
  ];
  const cobertura = parsearLcovDetallado(
    "SF:web/src/a.js\nDA:1,1\nend_of_record\nSF:scripts/b.js\nDA:1,0\nend_of_record\n"
  );
  const { porPaquete } = agregarPorPaquete({
    cobertura,
    paquetes,
    exclusionDe: () => null,
  });
  const web = porPaquete.get(paquetes[1]);
  const raiz = porPaquete.get(paquetes[0]);
  assert.equal(web.metricas.lineas.cubiertas, 1);
  assert.equal(raiz.metricas.lineas.cubiertas, 0);
});

// ---------------------------------------------------------------------------
// La compuerta corriendo de verdad, sobre repositorios git reales
// ---------------------------------------------------------------------------

test("un paquete al 33% sin deuda declarada es ROJO, aunque el diff este 100% cubierto", () => {
  const { dir, base } = repoConTotal({ lineas: LINEAS_33 });
  const r = correrTotal(dir, base);
  // El plano del diff aprueba: son las dos lineas nuevas, las dos cubiertas.
  assert.match(r.stdout, /cobertura de las lineas del cambio: 100\.00%/);
  // Y aun asi la corrida es roja, por el total.
  assert.equal(r.codigo, 1);
  assert.match(r.todo, /el total de líneas del paquete "web" es 33\.33%/);
  assert.match(r.todo, /no declara ni motivo ni fecha/);
  assert.match(r.todo, /file=web\/package\.json/);
  assert.match(r.resumen, /## Cobertura total por paquete/);
});

test("la deuda declarada con la fecha vencida es ROJA y nombra el vencimiento", () => {
  const { dir, base } = repoConTotal({
    lineas: LINEAS_33,
    manifiesto: {
      name: "web",
      projects: { cobertura: { deuda: { motivo: "heredada del piloto", fecha: "1999-01-01" } } },
    },
  });
  const r = correrTotal(dir, base);
  assert.equal(r.codigo, 1);
  assert.match(r.todo, /el plazo que el paquete "web" declaro \(1999-01-01\) vencio/);
  assert.match(r.todo, /la comparacion es contra el MINIMO y no contra el piso/);
});

test("la deuda declarada y vigente pasa en AMARILLO, y el resumen dice cuanto falta y cuanto plazo queda", () => {
  const { dir, base } = repoConTotal({
    lineas: LINEAS_33,
    manifiesto: {
      name: "web",
      projects: {
        cobertura: { deuda: { motivo: "heredada del piloto, plan en el issue 88", fecha: "2026-12-31" } },
      },
    },
  });
  const r = correrTotal(dir, base, { COBERTURA_HOY: HOY });
  assert.equal(r.codigo, 0);
  assert.match(r.stderr, /::warning file=web\/package\.json::/);
  assert.match(r.stderr, /46\.67 puntos por debajo del minimo/);
  assert.match(r.stderr, /quedan 133 dia\(s\) de plazo/);
  // El deber de reporte POR CORRIDA: la deuda se nombra en el resumen, no solo
  // el dia en que vence.
  assert.match(r.resumen, /### Paquetes por debajo del minimo del marco/);
  assert.match(r.resumen, /faltan 46\.67 puntos/);
  assert.match(r.resumen, /quedan 133 dia\(s\) de plazo \(2026-12-31\)/);
  assert.match(r.resumen, /heredada del piloto, plan en el issue 88/);
  assert.match(r.resumen, /\*\*Pasa con deuda\*\*/);
});

test("bajar el umbral del consumidor NO vuelve verde un paquete por debajo del minimo del marco", () => {
  const { dir, base } = repoConTotal({ lineas: LINEAS_33 });
  // 40 es lo que la auditoria bajo en el consumidor para ver si la compuerta
  // existia. El minimo del marco es piso duro: el umbral local solo sube.
  const r = correrTotal(dir, base, { COBERTURA_MINIMO: "40" });
  assert.equal(r.codigo, 1);
  assert.match(r.todo, /el minimo del marco es 80%/);
  assert.match(r.resumen, /exigido en esta corrida: \*\*80%\*\*/);
});

test("el umbral del consumidor SI puede subir la exigencia del total", () => {
  // 8 de 10 lineas: verde contra 80, rojo contra 90.
  const lineas = [1, 1, 1, 1, 1, 1, 1, 0, 0, 1];
  const conOchenta = repoConTotal({ lineas });
  assert.equal(correrTotal(conOchenta.dir, conOchenta.base).codigo, 0);

  const conNoventa = repoConTotal({ lineas });
  const r = correrTotal(conNoventa.dir, conNoventa.base, { COBERTURA_MINIMO: "90" });
  assert.equal(r.codigo, 1);
  assert.match(r.todo, /el minimo del marco es 90%/);
});

test("el retroceso por debajo del piso declarado es ROJO aunque el total supere el minimo", () => {
  // 9 de 10 lineas = 90%, por encima del minimo, por debajo del piso de 93.7.
  const { dir, base } = repoConTotal({
    lineas: [1, 1, 1, 1, 1, 1, 1, 1, 0, 1],
    manifiesto: { name: "web", projects: { cobertura: { piso: { lineas: 93.7 } } } },
  });
  const r = correrTotal(dir, base);
  assert.equal(r.codigo, 1);
  assert.match(r.todo, /RETROCEDIO/);
  assert.match(r.todo, /su piso declarado es 93\.7%/);
});

test("las FUNCIONES enrojecen solas: es el caso medido en el consumidor real", () => {
  // Lineas al 100% y funciones al 50%: el paquete queda rojo por funciones,
  // que es exactamente como el consumidor estaba en verde a 70,69%.
  const { dir, base } = repoConTotal({
    lineas: [1, 1, 1, 1],
    funciones: [1, 1, 0, 0],
  });
  const r = correrTotal(dir, base);
  assert.equal(r.codigo, 1);
  assert.match(r.todo, /el total de funciones del paquete "web" es 50\.00%/);
  assert.match(r.resumen, /\| `web` \| líneas \| \*\*100\.00%\*\*/);
});

test("un paquete por encima del minimo pasa, y la seccion del total sale igual en el resumen", () => {
  const { dir, base } = repoConTotal({
    lineas: [1, 1, 1, 1, 0, 1],
    funciones: [1, 1, 1, 1, 1, 0],
    ramas: [1, 1, 1, 1, 1, 0],
  });
  const r = correrTotal(dir, base);
  assert.equal(r.codigo, 0);
  assert.match(r.resumen, /## Cobertura total por paquete/);
  assert.match(r.resumen, /\*\*Pasa\*\* — los 1 paquete\(s\) medidos/);
  assert.match(r.stdout, /OK  total del paquete "web"/);
  assert.doesNotMatch(r.resumen, /### Paquetes por debajo del minimo/);
});

test("sin commit base el plano del diff NO APLICA y el del total mide igual: un push a main no es una amnistia", () => {
  const { dir } = repoConTotal({ lineas: LINEAS_33 });
  const r = correr(dir, { COBERTURA_MINIMO: "80", COBERTURA_HOY: CERRADA });
  assert.match(r.resumen, /\*\*No aplicable\*\*/);
  assert.equal(r.codigo, 1);
  assert.match(r.todo, /el total de líneas del paquete "web" es 33\.33%/);
});

test("una exclusion declarada con motivo saca el archivo del total", () => {
  const { dir, base } = repoConTotal({
    lineas: LINEAS_33,
    manifiesto: {
      name: "web",
      projects: {
        cobertura: {
          excluidos: [{ patron: "src/mod.js", motivo: "generado por el cliente de datos" }],
        },
      },
    },
  });
  const r = correrTotal(dir, base);
  assert.equal(r.codigo, 0);
  assert.match(r.resumen, /generado por el cliente de datos/);
  assert.doesNotMatch(r.todo, /el total de líneas del paquete "web"/);
});

test("una deuda con fecha inexistente NO cuenta como declarada: es ROJO de configuracion", () => {
  const { dir, base } = repoConTotal({
    lineas: LINEAS_33,
    manifiesto: {
      name: "web",
      projects: { cobertura: { deuda: { motivo: "heredada", fecha: "2026-02-31" } } },
    },
  });
  const r = correrTotal(dir, base);
  assert.equal(r.codigo, 1);
  assert.match(r.todo, /"fecha" debe ser una fecha real/);
  assert.match(r.resumen, /declaracion de cobertura invalida/);
});

test("una deuda sin motivo tampoco cuenta: la fecha sola no es una deuda declarada", () => {
  const { dir, base } = repoConTotal({
    lineas: LINEAS_33,
    manifiesto: { name: "web", projects: { cobertura: { deuda: { fecha: "2026-12-31" } } } },
  });
  const r = correrTotal(dir, base);
  assert.equal(r.codigo, 1);
  assert.match(r.todo, /falta "motivo"/);
});

test("un piso escrito con la clave de vitest es ROJO, no un piso que no declara nada", () => {
  const { dir, base } = repoConTotal({
    lineas: [1, 1, 1, 1, 0, 1],
    manifiesto: { name: "web", projects: { cobertura: { piso: { functions: 80 } } } },
  });
  const r = correrTotal(dir, base);
  assert.equal(r.codigo, 1);
  assert.match(r.todo, /clave desconocida "functions"/);
  assert.match(r.todo, /las v.lidas son lineas, funciones, ramas/);
});

test("los archivos de prueba no cuentan en el total: medirlos lo infla con codigo que siempre corre", () => {
  const { dir, base } = repoConTotal({
    lineas: LINEAS_33,
    extras: {
      "web/src/mod.test.js": {
        lineas: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
        fuente: "import { f0 } from './mod.js';\n",
      },
    },
  });
  const r = correrTotal(dir, base);
  // Si las pruebas contaran, el total del paquete seria 12/16 = 75% y el
  // diagnostico diria otro numero. Sigue siendo 33,33%.
  assert.equal(r.codigo, 1);
  assert.match(r.todo, /el total de líneas del paquete "web" es 33\.33%/);
});

test("dentro de la ventana de estreno la corrida pasa, y grita el dia en que sera roja", () => {
  const { dir, base } = repoConTotal({ lineas: LINEAS_33 });
  const r = correrTotal(dir, base, { COBERTURA_HOY: "2026-08-20" });
  assert.equal(r.codigo, 0, "el estreno no puede enrojecer a un consumidor que no toco una linea");
  assert.match(r.stderr, /PASA por la ventana de estreno/);
  assert.match(r.stderr, /se cierra el 2026-09-30/);
  assert.match(r.stderr, /desde ese dia el mismo estado es ROJO/);
  assert.match(r.resumen, /\*\*Pasa por la ventana de estreno\*\*/);
  assert.match(r.resumen, /AMARILLO · ventana de estreno/);
  // Y el mismo repositorio, con la ventana cerrada, es rojo. Si esta asercion
  // se cayera, la ventana no seria una ventana: seria la compuerta apagada.
  assert.equal(correrTotal(dir, base).codigo, 1);
});

test("COBERTURA_HOY no puede correr un plazo en silencio", () => {
  const { dir, base } = repoConTotal({
    lineas: LINEAS_33,
    manifiesto: {
      name: "web",
      projects: { cobertura: { deuda: { motivo: "heredada", fecha: "2026-01-01" } } },
    },
  });
  // Forzar la fecha al pasado revive un plazo vencido: es la unica palanca del
  // script capaz de aflojar una compuerta, asi que grita cuando se usa.
  const r = correrTotal(dir, base, { COBERTURA_HOY: "2025-06-01" });
  assert.equal(r.codigo, 0);
  assert.match(r.stderr, /la fecha de la corrida esta forzada a 2025-06-01 por COBERTURA_HOY/);
});

// ---------------------------------------------------------------------------
// UNA DECLARACION QUE NO SE PUEDE COMPARAR CON NINGUN DATO
//
// El hueco que la verificacion adversarial de esta rama encontro, y es de la
// misma clase que todo lo de arriba: no un caso mas, sino la forma en que la
// compuerta DESAPARECE sin que nada lo diga.
//
// Medido: un paquete que declara `piso: { funciones: 90 }` y cuyo reporte deja
// de emitir `FN:` salia EXIT 0, con la metrica impresa como `n/a` y sin un solo
// ::warning::. El piso es un ratchet, y un ratchet que dejo de comparar contra
// algo no protege nada: bastaba con que alguien cambiara el reporter, apagara
// `all: true` o subiera de mayor de vitest para que la ganancia acumulada
// quedara sin custodia, en verde. Es fail-open, y la constitucion del marco
// pide que todo fail-open sea RUIDOSO.
//
// La regla que lo cierra, derivada de ese principio y no de este ejemplo:
//   · piso declarado + esa metrica SIN DATOS  -> ROJO (el arreglo es una linea
//     de diff: borrar el piso con su motivo, o arreglar el reporter)
//   · deuda declarada + el paquete no aporto NINGUNA metrica medible ->
//     AMARILLO ruidoso (la deuda no tapa nada, pero sobra y hay que borrarla)
//
// El caso "no hay NINGUN reporte en la corrida" NO cambia: sigue siendo el
// aviso que ya era. Ahi no desaparecio una compuerta, no se emitio cobertura,
// y enrojecerlo pondria en rojo permanente cualquier carril que no corra
// pruebas.
// ---------------------------------------------------------------------------

test("un piso declarado cuya metrica se queda SIN DATOS es ROJO, no un n/a en verde", () => {
  const { dir, base } = repoConTotal({
    lineas: [1, 1, 1, 1, 1, 1], // 100% de lineas: nada mas puede enrojecer
    funciones: [], //             el reporte dejo de emitir FN:
    manifiesto: { name: "web", projects: { cobertura: { piso: { funciones: 90 } } } },
  });
  const r = correrTotal(dir, base);
  assert.equal(r.codigo, 1, r.todo);
  assert.match(r.stderr, /::error file=web\/package\.json::/);
  assert.match(r.stderr, /declara un piso de funciones de 90%/);
  assert.match(r.stderr, /sin un solo dato de esa metrica/);
  assert.match(r.resumen, /ROJO · piso sin datos/);
});

test("el piso de una metrica que SI tiene datos sigue comparandose como siempre", () => {
  // El control del caso de arriba: la rama nueva no puede enrojecer a un
  // paquete cuyo piso se puede comparar y se cumple.
  const { dir, base } = repoConTotal({
    lineas: [1, 1, 1, 1, 1, 1],
    funciones: [1, 1, 1, 1],
    manifiesto: { name: "web", projects: { cobertura: { piso: { funciones: 90 } } } },
  });
  assert.equal(correrTotal(dir, base).codigo, 0);
});

test("una metrica con denominador CERO se declara n/a: no es 0% ni 100%", () => {
  // Este caso no fallaba antes del arreglo, y se agrega igual porque el control
  // negativo lo pedia: mutar `!m || !m.encontradas` a `!m` SOBREVIVIA al banco
  // entero. La unica prueba de n/a que habia pasaba la metrica AUSENTE (la
  // clave no estaba en el objeto), nunca una presente con encontradas = 0, que
  // es la que un lcov real produce.
  const v = veredictoDePaquete({
    metricas: { lineas: { encontradas: 10, cubiertas: 10 }, ramas: { encontradas: 0, cubiertas: 0 } },
    minimo: 80,
    hoy: HOY,
  });
  const ramas = v.filas.find((f) => f.clave === "ramas");
  assert.equal(ramas.medible, false);
  assert.equal(ramas.pct, undefined);
  assert.equal(v.estado, "verde");
});

test("un paquete SIN ramas no inventa un 100% en el resumen", () => {
  const { dir, base } = repoConTotal({
    lineas: [1, 1, 1, 1, 1, 1],
    funciones: [1, 1],
    ramas: [], // el paquete no tiene ni una rama
  });
  const r = correrTotal(dir, base);
  assert.equal(r.codigo, 0, r.todo);
  assert.match(r.resumen, /ramas \| n\/a/);
  assert.doesNotMatch(r.resumen, /ramas \| \*\*100\.00%\*\*/);
});

/** El segundo paquete, entero en el commit BASE para que el diff no lo vea. */
const segundoPaquete = (declaracion) => ({
  "otro/package.json": JSON.stringify({ name: "otro", projects: { cobertura: declaracion } }, null, 2) + "\n",
  "otro/src/x.js": "export const x = 1;\n",
});

test("una deuda declarada en un paquete sin nada que medir se nombra, no se calla", () => {
  // Un segundo paquete que declara deuda y al que ningun reporte reclama: la
  // deuda no excusa nada porque no hay nada medido, y callarla la deja
  // envejeciendo en el manifiesto para siempre.
  const { dir, base } = repoConTotal({
    lineas: [1, 1, 1, 1, 1, 1],
    enLaBase: segundoPaquete({ deuda: { motivo: "vieja", fecha: "2027-01-01" } }),
  });
  const r = correrTotal(dir, base);
  assert.equal(r.codigo, 0, r.todo);
  assert.match(r.stderr, /::warning file=otro\/package\.json::/);
  assert.match(r.stderr, /no aporto ninguna metrica medible/);
});

test("un PISO declarado en un paquete que NINGUN reporte reclama es ROJO", () => {
  // El mismo agujero que el piso huerfano de arriba, con el reporte del paquete
  // ENTERO perdido en vez de una sola metrica: apagar el ratchet de un paquete
  // no puede costar menos que dejar de emitir su lcov. Y la corrida SI midio
  // otro paquete, asi que esto no es "no se midio cobertura": es un reporte que
  // se perdio, y son dos diagnosticos distintos.
  const { dir, base } = repoConTotal({
    lineas: [1, 1, 1, 1, 1, 1],
    enLaBase: segundoPaquete({ piso: { lineas: 70 } }),
  });
  const r = correrTotal(dir, base);
  assert.equal(r.codigo, 1, r.todo);
  assert.match(r.stderr, /::error file=otro\/package\.json::/);
  assert.match(r.stderr, /declara un piso de cobertura \(lineas\)/);
  assert.match(r.stderr, /la corrida SI midio otros paquetes/);
});

test("el piso huerfano se nombra UNA vez: por metrica o por paquete, nunca las dos", () => {
  // Control de ruido, y el unico caso donde las dos ramas compiten: un paquete
  // que SI esta en el reporte pero cuyo registro llega sin un solo item de
  // ninguna metrica. Ahi habla `veredictoDePaquete` (mensaje por metrica) y la
  // compuerta tiene que callarse. Dos lineas que dicen lo mismo convierten un
  // diagnostico en ruido, y el que las lee deja de leerlas.
  const { dir, base } = repoConTotal({
    lineas: [1, 1, 1, 1, 1, 1],
    enLaBase: segundoPaquete({ piso: { lineas: 70 } }),
    // El registro existe (el reporte lo reclama) y no trae ni una linea.
    extras: { "otro/src/x.js": { lineas: [] } },
  });
  const r = correrTotal(dir, base);
  assert.equal(r.codigo, 1, r.todo);
  const porMetrica = (r.stderr.match(/declara un piso de líneas/g) ?? []).length;
  const porPaquete = (r.stderr.match(/declara un piso de cobertura/g) ?? []).length;
  assert.equal(porMetrica, 1, r.stderr);
  assert.equal(porPaquete, 0, r.stderr);
});

test("sin NINGUN reporte, un piso declarado NO enrojece el total: ahi no desaparecio nada", () => {
  // La frontera que decide si la regla es usable: un carril que no corre
  // pruebas no puede quedar en rojo permanente por una declaracion correcta.
  // La diferencia medible es si la corrida midio ALGUN paquete.
  const dir = repoNuevo();
  escribir(dir, "package.json", JSON.stringify({ name: "raiz", private: true }) + "\n");
  escribir(
    dir,
    "web/package.json",
    JSON.stringify({ name: "web", projects: { cobertura: { piso: { lineas: 70 } } } }, null, 2) + "\n"
  );
  escribir(dir, "web/src/mod.js", "export const f = (x) => x;\n");
  commit(dir, "base");

  // SIN commit base a proposito: el plano del diff queda NO APLICABLE, asi que
  // el codigo de salida habla unicamente del total. Con un rango el diff
  // enrojeceria por su cuenta ("hay lineas agregadas y ningun reporte") y el
  // 1 no diria nada sobre la regla que esta prueba mide.
  const r = correr(dir, { COBERTURA_MINIMO: "80", COBERTURA_HOY: CERRADA });
  assert.equal(r.codigo, 0, r.todo);
  assert.match(r.resumen, /\*\*No medido\*\*/);
  assert.doesNotMatch(r.stderr, /declara un piso de cobertura/);
});

// ---------------------------------------------------------------------------
// LA VENTANA DE ESTRENO TIENE QUE ESTAR EN EL CONTRATO, NO SOLO EN EL CODIGO
//
// Es la leccion de la afirmacion A07 aplicada a esta misma rama. A07 decia
// "la integracion FALLA cuando un paquete queda por debajo del minimo" y la
// compuerta no existia. Esta rama la construyo, y la estreno con una ventana de
// gracia que NADIE habia escrito en el spec: medido contra el espejo del
// consumidor real, el caso central del requirement —un paquete a 70,70% de
// funciones sin deuda declarada— salia EXIT 0. El scenario del spec vivo decia
// "la integracion falla". El comentario del codigo explicaba la ventana; el
// contrato, no.
//
// Un comentario no es el contrato. Esta prueba ata la constante al texto del
// spec, asi que mover la fecha sin actualizar el spec es rojo — que es la unica
// forma de que la coherencia no dependa de que alguien se acuerde.
// ---------------------------------------------------------------------------

test("la fecha de la ventana de estreno esta escrita en el spec vivo", () => {
  const raiz = new URL("../../../", import.meta.url);
  const comparador = readFileSync(new URL("../medir-cobertura-diff.mjs", import.meta.url), "utf8");
  const m = comparador.match(/const VENTANA_DE_GRACIA_HASTA = "(\d{4}-\d{2}-\d{2})"/);
  assert.ok(m, "no se encontro la constante VENTANA_DE_GRACIA_HASTA en el comparador");

  for (const ruta of [
    "openspec/specs/calidad-codigo/spec.md",
    "openspec/changes/archive/2026-08-19-calidad-fail-closed/specs/calidad-codigo/spec.md",
  ]) {
    const spec = readFileSync(new URL(ruta, raiz), "utf8");
    assert.match(
      spec,
      new RegExp(m[1]),
      `${ruta} no menciona la fecha ${m[1]} en la que la ventana de estreno se cierra`
    );
  }
});

// ---------------------------------------------------------------------------
// EL DENOMINADOR, que es el dato que la regla LEE y que hasta hoy nadie
// verificaba.
//
// LA MEDICION QUE ORIGINO ESTE BLOQUE, hecha sobre el reporte REAL del
// consumidor (un-proyecto-anterior en main, web al 70,70% de funciones, el numero
// del incidente). Tres transformaciones del lcov, las tres al alcance de la
// configuracion del reporter, y las tres convertian ese ROJO en EXIT 0:
//
//   1. sacar FN/FNDA/FNF/FNH        -> "funciones n/a", EXIT 0, y MUDO
//      (es lo que hace lcov_function_coverage=0, una opcion documentada)
//   2. renombrar FN/FNDA a FNL/FNA  -> "funciones n/a", EXIT 0, y MUDO
//      (es el formato de funciones de lcov 2.x: no hace falta mala fe, alcanza
//      con actualizar la herramienta)
//   3. borrar las FN/FNDA sin cubrir dejando FNF: intacto -> publicaba
//      **95,83%** y la fila decia OK, con el propio reporte declarando 215
//      funciones de las que solo llegaron 120.
//
// Las dos rondas anteriores endurecieron la REGLA (que la compuerta exista, que
// el umbral local no pueda bajar el piso, que un piso sin datos sea rojo).
// Ninguna endurecio la ENTRADA: el porcentaje es cubiertas/encontradas y
// `encontradas` se reconstruye item por item de los registros que el reporter
// decide emitir. La fabrica de fixtures de esta misma rama escribe SIEMPRE los
// contadores de resumen, asi que ninguna prueba del banco podia llegar al
// estado en que faltan.
//
// EL DISCRIMINADOR NO ES UNA LISTA DE ORTOGRAFIAS: es la gramatica del formato.
// Un tracefile lcov declara su propio denominador por registro y por metrica
// (LF/LH, FNF/FNH, BRF/BRH). Entonces:
//   . contador PRESENTE con valor 0   -> el reporter midio y no habia nada: n/a
//     legitimo (11 registros del consumidor real declaran FNF:0 y 3 BRF:0);
//   . contador AUSENTE con cero items -> el reporter NO midio: eso es "no
//     medido", y el spec ya exige distinguirlo de "cubierto";
//   . items MENOS que el contador     -> el denominador llego corto y el
//     porcentaje publicado esta inflado.
// Comprobado sobre los 75 registros de los dos reportes reales: los items
// contados coinciden EXACTO con LF/FNF/BRF en los 75, cero desajustes. La
// comparacion es un invariante del formato, no una coincidencia.
// ---------------------------------------------------------------------------

/** Un repo con el paquete `web` y un lcov ESCRITO A MANO (contadores incluidos). */
function repoConLcovCrudo(texto, { manifiesto = { name: "web" }, archivos = {} } = {}) {
  const dir = repoNuevo();
  escribir(dir, "package.json", JSON.stringify({ name: "raiz", private: true }) + "\n");
  escribir(dir, "web/package.json", JSON.stringify(manifiesto, null, 2) + "\n");
  escribir(dir, "web/src/mod.js", "export const f0 = (x) => x + 0;\n");
  for (const [ruta, contenido] of Object.entries(archivos)) escribir(dir, ruta, contenido);
  const base = commit(dir, "base");
  escribir(dir, "web/coverage/lcov.info", texto);
  commit(dir, "cambio");
  return { dir, base };
}

// Las lineas SIEMPRE al 100% y con sus contadores: asi el rojo (o el verde) de
// cada caso habla unicamente de la metrica que el caso maltrata.
const LINEAS_OK = `${Array.from({ length: 10 }, (_, i) => `DA:${i + 1},1`).join("\n")}\nLF:10\nLH:10`;
const RAMAS_OK = `${Array.from({ length: 10 }, (_, i) => `BRDA:1,0,${i},1`).join("\n")}\nBRF:10\nBRH:10`;

test("una metrica sin un solo dato Y SIN su contador de resumen es NO MEDIDA, no n/a", () => {
  // Esquive 1 medido sobre el consumidor real: sin FN/FNDA/FNF/FNH, el 70,70%
  // de funciones que enrojecia desaparecia y la corrida salia 0 sin decir nada.
  const { dir, base } = repoConLcovCrudo(
    `TN:\nSF:web/src/mod.js\n${LINEAS_OK}\n${RAMAS_OK}\nend_of_record\n`
  );
  const r = correrTotal(dir, base);
  assert.equal(r.codigo, 1, r.todo);
  assert.match(r.todo, /::error[^\n]*funciones/);
  assert.match(r.todo, /no la midio|no fue medida|sin medir/i);
});

test("el MISMO caso con el contador declarado en cero es n/a legitimo y pasa", () => {
  // El discriminador tiene que cortar por el medio de la clase: FNF:0 es el
  // reporter diciendo "medi funciones y no habia", y eso no es un esquive.
  // 11 de los 38 registros del consumidor real declaran exactamente eso.
  const { dir, base } = repoConLcovCrudo(
    `TN:\nSF:web/src/mod.js\nFNF:0\nFNH:0\n${LINEAS_OK}\n${RAMAS_OK}\nend_of_record\n`
  );
  const r = correrTotal(dir, base);
  assert.equal(r.codigo, 0, r.todo);
  assert.match(r.resumen, /funciones \| n\/a/);
});

test("el reporte declara mas items de los que llegaron: el denominador vino CORTO", () => {
  // Esquive 3 medido sobre el consumidor real: borrando las FN/FNDA sin cubrir
  // y dejando FNF: intacto, la compuerta publicaba 95,83% con la fila en OK
  // mientras el reporte declaraba 215 funciones y solo llegaban 120.
  const { dir, base } = repoConLcovCrudo(
    `TN:\nSF:web/src/mod.js\nFN:1,a\nFNDA:1,a\nFN:2,b\nFNDA:1,b\nFN:3,c\nFNDA:1,c\nFNF:10\nFNH:3\n${LINEAS_OK}\n${RAMAS_OK}\nend_of_record\n`
  );
  const r = correrTotal(dir, base);
  assert.equal(r.codigo, 1, r.todo);
  assert.match(r.todo, /declara 10 .*y llegaron 3|denominador/i);
  // Y sobre todo: NO publica el 100% que saldria de dividir 3 sobre 3.
  assert.doesNotMatch(r.resumen, /funciones \| \*\*100\.00%\*\* \| 80% \| . \| OK/);
});

test("el formato de funciones de lcov 2.x (FNL/FNA) no borra la metrica en silencio", () => {
  // Esquive 2, y el mas barato de todos porque no necesita mala fe: alcanza con
  // que el reporter se actualice. FNL:/FNA: reemplazan a FN:/FNDA: en lcov 2.x;
  // este parser no los conoce, y no conocerlos no puede significar "cero
  // funciones encontradas, metrica n/a, verde".
  const { dir, base } = repoConLcovCrudo(
    `TN:\nSF:web/src/mod.js\nFNL:0,1,4\nFNA:0,1,a\nFNL:1,6,9\nFNA:1,0,b\nFNF:2\nFNH:1\n${LINEAS_OK}\n${RAMAS_OK}\nend_of_record\n`
  );
  const r = correrTotal(dir, base);
  assert.equal(r.codigo, 1, r.todo);
});

test("las tres metricas se defienden igual: tambien ramas y lineas", () => {
  // La clase no es "funciones": es cualquier metrica cuyo denominador se pueda
  // apagar. Sin contador de ramas y sin un solo BRDA, `ramas` desaparecia.
  const sinRamas = repoConLcovCrudo(
    `TN:\nSF:web/src/mod.js\n${LINEAS_OK}\nFNF:0\nFNH:0\nend_of_record\n`
  );
  assert.equal(correrTotal(sinRamas.dir, sinRamas.base).codigo, 1);
  const sinLineas = repoConLcovCrudo(
    `TN:\nSF:web/src/mod.js\nFNF:0\nFNH:0\n${RAMAS_OK}\nend_of_record\n`
  );
  assert.equal(correrTotal(sinLineas.dir, sinLineas.base).codigo, 1);
});

test("dos suites que miden el mismo archivo NO son un denominador corto", () => {
  // El falso positivo que hay que no cometer. Cada reporte declara SU
  // denominador; la fusion por item puede superar el de un registro suelto y
  // eso es correcto, no un dato perdido. Por eso la comparacion es por
  // REGISTRO, y el denominador del paquete se queda con el maximo declarado.
  const dir = repoNuevo();
  escribir(dir, "package.json", JSON.stringify({ name: "raiz", private: true }) + "\n");
  escribir(dir, "web/package.json", JSON.stringify({ name: "web" }, null, 2) + "\n");
  escribir(dir, "web/src/mod.js", "export const f0 = (x) => x + 0;\n");
  const base = commit(dir, "base");
  const registro = (hits) =>
    `TN:\nSF:web/src/mod.js\nFN:1,a\nFNDA:${hits[0]},a\nFN:2,b\nFNDA:${hits[1]},b\nFNF:2\nFNH:${
      hits.filter((h) => h > 0).length
    }\nDA:1,${hits[0]}\nDA:2,${hits[1]}\nLF:2\nLH:${
      hits.filter((h) => h > 0).length
    }\nBRF:0\nBRH:0\nend_of_record\n`;
  escribir(dir, "web/coverage/lcov.info", registro([1, 0]));
  escribir(dir, "api/coverage/lcov.info", registro([0, 1]));
  commit(dir, "cambio");
  const r = correrTotal(dir, base);
  assert.equal(r.codigo, 0, r.todo);
  assert.match(r.resumen, /funciones \| \*\*100\.00%\*\*/);
});

test("dentro de la ventana de estreno el denominador apagado avisa, y dice el dia", () => {
  // Un rojo nuevo del marco no puede aterrizar sin ventana: `v1` es un tag
  // movil y el 2026-08-19 ya se cobro esa leccion una vez. Lo que SI cambia hoy
  // es que deja de ser MUDO.
  const { dir, base } = repoConLcovCrudo(
    `TN:\nSF:web/src/mod.js\n${LINEAS_OK}\n${RAMAS_OK}\nend_of_record\n`
  );
  const r = correrTotal(dir, base, { COBERTURA_HOY: HOY });
  assert.equal(r.codigo, 0, r.todo);
  assert.match(r.todo, /::warning[^\n]*funciones/);
  assert.match(r.todo, /2026-09-30/);
});

test("el parser guarda el denominador que el reporte declara, no solo los items", () => {
  const mapa = parsearLcovDetallado(
    "SF:a.js\nFN:1,uno\nFNDA:2,uno\nFNF:5\nFNH:1\nDA:1,1\nLF:1\nLH:1\nend_of_record\n"
  );
  const r = mapa.get("a.js");
  assert.equal(r.declarado.funciones, 5, "FNF: es el denominador que el reporter declara");
  assert.equal(r.cortos.funciones, 1, "llego 1 item de los 5 declarados");
  assert.equal(r.cortos.lineas, 0);
  assert.equal(r.sinContador.ramas, 1, "el registro no declaro BRF: en ninguna forma");
});

test("un SF: que no resuelve se nombra tambien en un push a main", () => {
  // El plano del diff ya avisaba de las rutas sin resolver, pero su aviso vive
  // DESPUES del retorno temprano de "no hay commit base": en un push a main el
  // reporte podia nombrar archivos que el repositorio no tiene y la corrida no
  // decia una palabra. Un archivo que se cae del denominador tiene que dejar
  // rastro, sea cual sea el evento.
  const { dir } = repoConLcovCrudo(
    `TN:\nSF:web/src/no-existe.js\nFNF:0\nFNH:0\n${LINEAS_OK}\nBRF:0\nBRH:0\nend_of_record\n`
  );
  const r = correr(dir, { COBERTURA_MINIMO: "80", COBERTURA_HOY: CERRADA });
  assert.match(r.todo, /no-existe\.js/);
});

test("los dos diagnosticos de 'no medida' no se confunden: uno manda al marco y el otro al proyecto", () => {
  // Un rojo con el diagnostico cruzado manda a arreglar el lado que esta bien.
  // Lo cometi al escribir esto: el primer mensaje decia «ninguno de sus 0
  // registros declaro el contador» sobre un reporte que declaraba 215. Si el
  // reporte DECLARA denominador y no llego un item, el reporter midio y esta
  // action no supo leer el formato: el defecto es del MARCO. Si no declara
  // nada, el reporter no midio: el defecto es del PROYECTO.
  const delMarco = repoConLcovCrudo(
    `TN:\nSF:web/src/mod.js\nFNL:0,1,4\nFNA:0,1,a\nFNF:2\nFNH:1\n${LINEAS_OK}\n${RAMAS_OK}\nend_of_record\n`
  );
  const a = correrTotal(delMarco.dir, delMarco.base);
  assert.equal(a.codigo, 1, a.todo);
  assert.match(a.todo, /DECLARAN 2 item\(s\) de funciones/);
  assert.match(a.todo, /se corrige en el marco/);

  const delProyecto = repoConLcovCrudo(
    `TN:\nSF:web/src/mod.js\n${LINEAS_OK}\n${RAMAS_OK}\nend_of_record\n`
  );
  const b = correrTotal(delProyecto.dir, delProyecto.base);
  assert.equal(b.codigo, 1, b.todo);
  assert.match(b.todo, /ninguno de sus 1 registro\(s\) declaro el contador FNF/);
  assert.doesNotMatch(b.todo, /se corrige en el marco/);
});

test("un contador declarado que los items SUPERAN no es un denominador corto", () => {
  // El otro lado de la comparacion. Mas items que el contador desinfla el
  // porcentaje, o sea que empuja hacia el rojo, y no puede fabricar un pase:
  // por eso no es rojo. Hacerlo rojo habria sido enrojecer por prolijidad.
  const { dir, base } = repoConLcovCrudo(
    `TN:\nSF:web/src/mod.js\nFN:1,a\nFNDA:1,a\nFN:2,b\nFNDA:1,b\nFNF:1\nFNH:1\n${LINEAS_OK}\n${RAMAS_OK}\nend_of_record\n`
  );
  const r = correrTotal(dir, base);
  assert.equal(r.codigo, 0, r.todo);
});

test("el contrato del denominador esta escrito en el spec vivo, no solo en el codigo", () => {
  // Un veredicto rojo que el contrato no nombra es indistinguible de un bug del
  // marco: es la misma leccion que dejo la ventana de estreno cuando vivia en
  // un comentario. Los tres escenarios nuevos tienen que estar en el spec vivo,
  // y los contadores del formato tienen que ser los que el codigo lee.
  const raiz = new URL("../../../", import.meta.url);
  const spec = readFileSync(new URL("openspec/specs/calidad-codigo/spec.md", raiz), "utf8");
  for (const titulo of [
    "#### Scenario: Una métrica que el reporte no midió",
    "#### Scenario: Una métrica que el reporte declara en cero",
    "#### Scenario: El denominador llega más corto que el que el reporte declara",
  ]) {
    assert.ok(spec.includes(titulo), `el spec vivo no declara el escenario: ${titulo}`);
  }
  const censo = readFileSync(new URL("actions/censo-fuentes/censo-fuentes.mjs", raiz), "utf8");
  for (const contador of ["LF", "FNF", "BRF"]) {
    assert.match(
      censo,
      new RegExp(`contador: "${contador}"`),
      `la tabla de metricas perdio el contador ${contador}, que es con lo que el reporte declara su denominador`
    );
  }
});

test("un denominador cruzado solo a medias se dice, y no enrojece", () => {
  // El caso intermedio: la metrica SI se midio (llegaron items), pero parte de
  // los archivos no declararon su contador, asi que esa parte no se puede
  // cruzar. No es rojo —la metrica existe y su numero sale— y callarlo si seria
  // el fail-open mudo de siempre: la constitucion pide que todo fail-open grite.
  const dir = repoNuevo();
  escribir(dir, "package.json", JSON.stringify({ name: "raiz", private: true }) + "\n");
  escribir(dir, "web/package.json", JSON.stringify({ name: "web" }, null, 2) + "\n");
  escribir(dir, "web/src/mod.js", "export const f0 = (x) => x + 0;\n");
  escribir(dir, "web/src/otro.js", "export const f1 = (x) => x + 1;\n");
  const base = commit(dir, "base");
  const reg = (sf, conContador) =>
    `TN:\nSF:${sf}\nFN:1,f\nFNDA:1,f\n${conContador ? "FNF:1\nFNH:1\n" : ""}DA:1,1\nLF:1\nLH:1\nBRF:0\nBRH:0\nend_of_record\n`;
  escribir(dir, "web/coverage/lcov.info", reg("web/src/mod.js", true) + reg("web/src/otro.js", false));
  commit(dir, "cambio");
  const r = correrTotal(dir, base);
  assert.equal(r.codigo, 0, r.todo);
  assert.match(r.todo, /::warning[^\n]*1 de sus registros de cobertura no declaran FNF/);
});
