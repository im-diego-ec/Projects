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
 */
function repoConTotal({ lineas, manifiesto = { name: "web" }, funciones, ramas, extras = {} }) {
  const dir = repoNuevo();
  escribir(dir, "package.json", JSON.stringify({ name: "raiz", private: true }) + "\n");
  escribir(dir, "web/package.json", JSON.stringify(manifiesto, null, 2) + "\n");
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
