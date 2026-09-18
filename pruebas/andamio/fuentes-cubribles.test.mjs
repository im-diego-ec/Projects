// NINGUN ARCHIVO FUENTE DEL ANDAMIO ENROJECE LA COMPUERTA DE COBERTURA.
//
// LA CLASE DE DEFECTO: el andamio manda un archivo con extension de fuente que
// ninguna prueba del proyecto puede apagar. El proyecto lo descubre el dia que
// un PR lo toca —o el primer dia, si la compuerta mira el arbol entero—, y lo
// arregla a mano, que es la forma cara de enterarse. Rigel lo pago dos veces
// (1.12.0 y 1.13.0, change `2026-08-31-andamio-con-aplicacion`, commits f6fc798
// y 8b25cb3) y escribio el control que faltaba.
//
// POR QUE ESTE NO ES EL DE RIGEL. Rigel pide una prueba HERMANA (`x.test.ts`
// al lado de `x.ts`) que importe al sujeto. La compuerta de Projects no mira
// nombres: decide por DATOS —si algun reporte lcov reclama el archivo— y el
// reporte de cada paquete trae TODO su `src/` (el `include` de
// vitest.config.base.mjs), importado o no. Entonces hay tres suertes para un
// archivo fuente del andamio, y el banco pregunta por cada una a quien decide:
//
//   1. EXCLUIDO con motivo en `projects.cobertura.excluidos` de su paquete. Lo
//      decide la lectura de manifiestos del CENSO (`leerPaquetes`, `paqueteDe`),
//      que es la misma que usa la compuerta. Una exclusion que no casa con nada
//      es roja: miente sobre el alcance.
//   2. DENTRO del alcance de cobertura de su paquete: el reporte lo reclama, asi
//      que la pregunta es si alguna prueba lo EJERCE. El banco exige que alguna
//      prueba del paquete lo importe (un `import type` no cuenta, un archivo de
//      prueba vacio tampoco). Sin eso entra al reporte en 0% y baja el total.
//   3. FUERA del alcance y sin exclusion: ningun reporte lo va a reclamar. Aca
//      el veredicto lo da `medir-cobertura-diff.mjs` CORRIENDO DE VERDAD, con el
//      contenido real del archivo como linea agregada: si sale rojo, el primer PR
//      que lo toque sale rojo. Una heuristica propia ya se equivoco en Rigel
//      (declaro huerfanos dos `.d.ts` que la compuerta no cuenta).
//
// Y UN CONTADOR que impide el verde por vacuidad: si ningun archivo llega a la
// compuerta real, o ningun paquete aporta archivos del caso 2, el banco no midio
// nada y lo dice.
import test, { after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  EXTENSIONES_FUENTE,
  globARegExp,
  leerPaquetes,
  paqueteDe,
} from "../../actions/censo-fuentes/censo-fuentes.mjs";
import { esArchivoDePrueba } from "../../actions/cobertura-diff/medir-cobertura-diff.mjs";
import {
  repoConBase,
  escribir,
  correr,
  copiarFixture,
  commit,
  limpiar,
} from "../../actions/cobertura-diff/pruebas/ayuda.mjs";

after(limpiar);

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const ANDAMIO = path.join(RAIZ, "plantilla");
const OMITIR = new Set(["node_modules", "dist", "coverage", ".astro"]);

/** Todos los archivos de un arbol, relativos y con "/". */
function archivosDe(raiz) {
  const salida = [];
  (function caminar(rel) {
    for (const e of fs.readdirSync(path.join(raiz, rel), { withFileTypes: true })) {
      if (OMITIR.has(e.name)) continue;
      const r = rel ? `${rel}/${e.name}` : e.name;
      if (e.isDirectory()) caminar(r);
      else if (e.isFile()) salida.push(r);
    }
  })("");
  return salida.sort();
}

const esFuente = (r) => EXTENSIONES_FUENTE.some((e) => r.endsWith(e));

/** `src/**\/*.{ts,tsx}` -> los globs sin llaves, que es lo que el lector del
 *  censo entiende. Un nivel de llaves alcanza para lo que declara el andamio. */
function expandirLlaves(glob) {
  const m = /\{([^{}]*)\}/.exec(glob);
  if (!m) return [glob];
  return m[1].split(",").flatMap((alt) => expandirLlaves(glob.slice(0, m.index) + alt + glob.slice(m.index + m[0].length)));
}

/** El alcance de cobertura que reparte el andamio, leido de la MISMA funcion
 *  que usan las configs de cada paquete. */
async function alcanceDeCobertura(raiz) {
  const { coberturaDelMarco } = await import(pathToFileURL(path.join(raiz, "vitest.config.base.mjs")).href);
  const { include, exclude } = coberturaDelMarco().coverage;
  const aRe = (lista) => lista.flatMap(expandirLlaves).map((g) => globARegExp(g));
  return { incluye: aRe(include), excluye: aRe(exclude) };
}

/** Un paquete mide cobertura si su script `test` la emite. */
const mideCobertura = (raiz, dir) => {
  try {
    const m = JSON.parse(fs.readFileSync(path.join(raiz, dir, "package.json"), "utf8"));
    return String(m.scripts?.test ?? "").includes("--coverage");
  } catch {
    return false;
  }
};

/** Los modulos que una prueba importa DE VERDAD, resueltos a archivos del
 *  arbol. `import type` no ejecuta nada y no cuenta. */
export function importadosPor(textoDeLaPrueba, rutaDeLaPrueba, existe) {
  const sinTipos = textoDeLaPrueba.replace(/^\s*import\s+type\b[^;]*;?/gm, "");
  const especificadores = [
    ...[...sinTipos.matchAll(/\bfrom\s+["']([^"']+)["']/g)].map((m) => m[1]),
    ...[...sinTipos.matchAll(/(?<!typeof\s)\bimport\(\s*["']([^"']+)["']\s*\)/g)].map((m) => m[1]),
  ];
  const dir = path.posix.dirname(rutaDeLaPrueba);
  const salida = new Set();
  for (const e of especificadores.filter((x) => x.startsWith("."))) {
    const base = path.posix.normalize(path.posix.join(dir, e)).replace(/\.(?:js|mjs|cjs|jsx)$/, "");
    for (const cand of [
      path.posix.normalize(path.posix.join(dir, e)),
      ...EXTENSIONES_FUENTE.map((x) => base + x),
      ...EXTENSIONES_FUENTE.map((x) => `${base}/index${x}`),
    ]) {
      if (existe(cand)) {
        salida.add(cand);
        break;
      }
    }
  }
  return salida;
}

/** La clasificacion del arbol entero: la suerte de cada fuente y los problemas. */
async function clasificar(raiz) {
  const todos = archivosDe(raiz);
  const existe = new Set(todos);
  const paquetes = leerPaquetes(raiz, todos);
  const { incluye, excluye } = await alcanceDeCobertura(raiz);

  const problemas = [];
  const excluidos = [];
  const importados = [];
  const aLaCompuerta = [];

  for (const p of paquetes) {
    if (p.error) problemas.push(`${p.manifiesto}: ${p.error}`);
    for (const ex of p.excluidos ?? []) {
      const patron = typeof ex?.patron === "string" ? ex.patron.trim() : "";
      const motivo = typeof ex?.motivo === "string" ? ex.motivo.trim() : "";
      if (!patron || !motivo) {
        problemas.push(`${p.manifiesto}: una exclusion sin patron o sin motivo (${JSON.stringify(ex)}). La compuerta la ignora y el archivo queda sin excluir`);
        continue;
      }
      const prefijo = p.dir ? `${p.dir}/` : "";
      const re = globARegExp(patron);
      const alcanza = todos.filter((a) => paqueteDe(paquetes, a) === p && re.test(a.slice(prefijo.length)));
      if (alcanza.length === 0) {
        problemas.push(
          `${p.manifiesto}: la exclusion "${patron}" no casa con ningun archivo del andamio. Una exclusion muerta hace creer ` +
            "que un archivo esta contemplado cuando ya no existe. Arreglo: borrarla, o corregir el patron",
        );
      }
    }
  }

  const exclusionDe = (archivo) => {
    const p = paqueteDe(paquetes, archivo);
    if (!p || p.error) return null;
    const relativa = archivo.slice(p.dir ? p.dir.length + 1 : 0);
    return (p.excluidos ?? []).find((ex) => {
      const patron = typeof ex?.patron === "string" ? ex.patron.trim() : "";
      const motivo = typeof ex?.motivo === "string" ? ex.motivo.trim() : "";
      return patron && motivo && globARegExp(patron).test(relativa);
    });
  };

  const fuentes = todos.filter((a) => esFuente(a) && !esArchivoDePrueba(a));
  for (const f of fuentes) {
    if (exclusionDe(f)) {
      excluidos.push(f);
      continue;
    }
    const p = paqueteDe(paquetes, f);
    const relativa = p?.dir ? f.slice(p.dir.length + 1) : f;
    const enElAlcance =
      p && p.dir && mideCobertura(raiz, p.dir) && incluye.some((re) => re.test(relativa)) && !excluye.some((re) => re.test(relativa));
    if (!enElAlcance) {
      aLaCompuerta.push(f);
      continue;
    }
    const pruebas = todos.filter((a) => esArchivoDePrueba(a) && paqueteDe(paquetes, a) === p);
    const laImporta = pruebas.some((t) => importadosPor(fs.readFileSync(path.join(raiz, t), "utf8"), t, (x) => existe.has(x)).has(f));
    if (laImporta) {
      importados.push(f);
    } else {
      problemas.push(
        `${f}: esta dentro del alcance de cobertura de "${p.dir}" y NINGUNA prueba del paquete lo importa. El reporte lo trae en 0%, ` +
          "baja el total del paquete y el primer PR que lo toque sale rojo en la compuerta. Arreglo: el andamio trae su prueba; si " +
          `nadie puede cubrirlo, se declara en projects.cobertura.excluidos de ${p.manifiesto} con su motivo`,
      );
    }
  }
  return { fuentes, excluidos, importados, aLaCompuerta, problemas, paquetes };
}

/** Lo que dice la compuerta real de un archivo que ningun reporte reclama: se lo
 *  agrega en un PR sintetico con su contenido de verdad y se corre el script. */
function veredictoDeLaCompuerta(raiz, archivo) {
  const { dir } = repoConBase();
  // Los manifiestos van SIN exclusiones: lo que se pregunta es si el archivo
  // exige cobertura por si mismo. La exclusion ya se miro antes de llegar aca.
  // El de la raiz va porque todo proyecto del andamio lo tiene, y con el
  // `paqueteDe` reclama cualquier archivo: sin el, el caso mediria otra cosa.
  escribir(dir, "package.json", '{ "name": "raiz", "version": "0.0.0" }\n');
  const paqueteDelArchivo = archivo.includes("/") ? archivo.slice(0, archivo.indexOf("/")) : null;
  for (const paq of new Set(["web", paqueteDelArchivo].filter(Boolean))) {
    escribir(dir, `${paq}/package.json`, `{ "name": "${paq}", "version": "0.0.0" }\n`);
  }
  const base = commit(dir, "manifiestos: la base del rango");
  escribir(dir, archivo, fs.readFileSync(path.join(raiz, archivo), "utf8"));
  commit(dir, `trae ${archivo} del andamio`);
  copiarFixture(dir, "lcov-cubierto-windows.info", "web/coverage/lcov.info");
  const r = correr(dir, { COBERTURA_BASE: base });
  return { codigo: r.codigo, salida: r.todo };
}

test("ninguna exclusion del andamio esta muerta ni le falta el motivo", async () => {
  const { problemas } = await clasificar(ANDAMIO);
  const deExclusiones = problemas.filter((p) => /exclusion/.test(p));
  assert.deepEqual(deExclusiones, []);
});

test("cada fuente dentro del alcance de cobertura la importa alguna prueba de su paquete", async () => {
  const { problemas } = await clasificar(ANDAMIO);
  const sinPrueba = problemas.filter((p) => /NINGUNA prueba del paquete lo importa/.test(p));
  assert.deepEqual(sinPrueba, []);
});

test("ningun archivo fuera del alcance y sin exclusion pone roja la compuerta real", async () => {
  const { aLaCompuerta } = await clasificar(ANDAMIO);
  const rojos = [];
  for (const archivo of aLaCompuerta) {
    const v = veredictoDeLaCompuerta(ANDAMIO, archivo);
    if (v.codigo !== 0) rojos.push(`${archivo} (exit ${v.codigo}): ${(v.salida.match(/::error[^\n]*/) ?? ["(sin anotacion)"])[0].slice(0, 200)}`);
  }
  assert.deepEqual(
    rojos,
    [],
    "el andamio manda archivos que ningun reporte de cobertura reclama y que la compuerta pone en rojo el dia que un PR " +
      "los toca. Dos salidas, y la eleccion no es de estilo: si es codigo de aplicacion, llevarlo al `src/` de su paquete " +
      "con su prueba; si nadie puede cubrirlo (configuracion que ejecuta su propia herramienta), declararlo en " +
      "projects.cobertura.excluidos del package.json de su paquete, con el motivo:\n  " +
      rojos.join("\n  "),
  );
});

test("el banco mide algo: llegan archivos a la compuerta real y cada paquete con pruebas aporta fuentes", async () => {
  // EL CONTROL ANTI-FAIL-OPEN, con la magnitud que decide y no con el total del
  // caminador: Rigel lo aprendio midiendo que un prefiltro que se come todo deja
  // «ningun archivo enrojece» cierto por vacuidad. El piso es 1 a proposito: el
  // conjunto se achica legitimamente cuando el andamio declara exclusiones.
  const { fuentes, aLaCompuerta, importados, paquetes } = await clasificar(ANDAMIO);
  assert.ok(fuentes.length >= 10, `el andamio tiene ${fuentes.length} fuentes: o el caminador se rompio o el andamio se vacio`);
  assert.ok(aLaCompuerta.length >= 1, "cero archivos llegan a la compuerta real: «ninguno la enrojece» seria cierto por vacuidad");
  const conPruebas = paquetes.filter((p) => p.dir && mideCobertura(ANDAMIO, p.dir)).map((p) => p.dir);
  assert.ok(conPruebas.length >= 2, `solo ${conPruebas.length} paquetes miden cobertura: la lectura de manifiestos se rompio`);
  for (const dir of conPruebas) {
    assert.ok(
      importados.some((f) => f.startsWith(`${dir}/`)),
      `el paquete ${dir} mide cobertura y ninguna de sus fuentes quedo clasificada como importada por una prueba: el lector de imports se rompio`,
    );
  }
});

test("MUERDE: una prueba vacia no cubre, un import type tampoco, y una exclusion muerta se caza", async () => {
  // Lo que se interroga es la MISMA funcion que decide, sobre textos fabricados.
  const existe = (x) => ["api/src/sujeto.ts", "api/src/tipos.ts"].includes(x);
  assert.equal(importadosPor("// vacia a proposito\n", "api/src/sujeto.test.ts", existe).size, 0, "una prueba vacia no importa nada");
  assert.ok(importadosPor('import { cosa } from "./sujeto.js";\n', "api/src/sujeto.test.ts", existe).has("api/src/sujeto.ts"));
  assert.ok(importadosPor('const m = await import("./sujeto.js");\n', "api/src/x.test.ts", existe).has("api/src/sujeto.ts"));
  assert.equal(importadosPor('import type { T } from "./tipos";\n', "api/src/x.test.ts", existe).size, 0, "un import type no ejecuta el modulo");

  // Y sobre una COPIA del andamio: CADA prueba que importa log.ts reemplazada por
  // un archivo vacio lo deja sin nadie que lo ejerza; una exclusion que ya no
  // casa con nada sale como muerta. Se vacian todas las que lo importan, y no
  // una con nombre, porque log.ts lo importan varias (su hermana y la de
  // requestId): vaciar una sola probaria que el banco sabe contar, no que muerde.
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "projects-cubribles-"));
  try {
    const copia = path.join(tmp, "plantilla");
    fs.cpSync(ANDAMIO, copia, { recursive: true, filter: (s) => !s.split(path.sep).includes("node_modules") });
    const todos = archivosDe(copia);
    const conLog = todos.filter(
      (t) =>
        t.startsWith("api/") &&
        esArchivoDePrueba(t) &&
        importadosPor(fs.readFileSync(path.join(copia, t), "utf8"), t, (x) => todos.includes(x)).has("api/src/lib/log.ts"),
    );
    assert.ok(conLog.length >= 1, "ninguna prueba importa api/src/lib/log.ts: la mutacion pasaria en vacio");
    for (const t of conLog) fs.writeFileSync(path.join(copia, t), "// vacia\n");
    const api = JSON.parse(fs.readFileSync(path.join(copia, "api/package.json"), "utf8"));
    api.projects.cobertura.excluidos.push({ patron: "no-existe.config.ts", motivo: "muerta a proposito" });
    fs.writeFileSync(path.join(copia, "api/package.json"), JSON.stringify(api, null, 2));
    const { problemas } = await clasificar(copia);
    assert.ok(problemas.some((p) => p.startsWith("api/src/lib/log.ts")), `log.ts con su prueba vacia no salio en rojo:\n${problemas.join("\n")}`);
    assert.ok(problemas.some((p) => p.includes('"no-existe.config.ts"')), "la exclusion muerta no salio en rojo");
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test("MUERDE: un archivo de configuracion ejecutable sin exclusion pone roja la compuerta real", () => {
  // El caso que la compuerta tiene que ver: codigo ejecutable que ningun reporte
  // reclama. Se usa un archivo fabricado, no uno del andamio, para que el caso
  // siga mordiendo el dia que el andamio declare todas sus exclusiones.
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "projects-cubribles-"));
  try {
    fs.mkdirSync(path.join(tmp, "sitio"), { recursive: true });
    fs.writeFileSync(path.join(tmp, "sitio", "herramienta.config.mjs"), 'export default { puerto: Number("4321") };\n');
    const v = veredictoDeLaCompuerta(tmp, "sitio/herramienta.config.mjs");
    assert.notEqual(v.codigo, 0, `la compuerta dejo pasar un archivo ejecutable sin ningun dato de cobertura:\n${v.salida}`);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});
