import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

// ---------------------------------------------------------------------------
// UNA FECHA QUE AFLOJA UNA COMPUERTA TIENE QUE TENER UN CHANGE QUE LA POSEA.
//
// QUE DEFECTO CIERRA. `medir-cobertura-diff.mjs` afloja la cobertura hasta el
// 2026-09-30: pasada esa fecha, un paquete bajo el minimo sin deuda declarada
// nace ROJO, solo, sin que nadie toque una linea. El diseno es correcto. Lo que
// faltaba era el DUENO: los pendientes que quedaron vivos al archivar el change
// que la introdujo no decian donde vivia ese trabajo, y al 2026-09-10 faltaban
// 20 dias sin que ningun change activo nombrara la fecha.
//
// Un plazo sin dueno vence sin que nadie lo decida. Eso no es una compuerta que
// se dispara: es una sorpresa.
//
// POR QUE SE PONE AHORA QUE HAY UNA SOLA. Estrenarla con N=1 es gratis. Ponerla
// cuando el problema ya es grande obliga a arreglar N casos antes de encenderla,
// que es como las compuertas se posponen para siempre.
// ---------------------------------------------------------------------------

// Solo codigo de PRODUCCION: los fixtures de los bancos usan fechas sinteticas a
// proposito y no son plazos de nadie.
const RAICES = ["actions", "herramientas", ".github/workflows"];
// UNA CONSTANTE DE JAVASCRIPT: `NOMBRE_CON_VENTANA = "2026-09-30"`.
const PATRON_JS = /\b[A-Z][A-Z_]*(?:VENTANA|GRACIA|HASTA|EXIGIBLE)[A-Z_]*\s*=\s*"(20\d{2}-\d{2}-\d{2})"/g;

// UN INPUT DE WORKFLOW, que es la forma que esta compuerta NO VEIA y que mas
// importa: `ventana_terraform:` con su `default: "2026-09-30"` unas lineas abajo.
// La clave y la fecha viven en LINEAS DISTINTAS, asi que ninguna regex de una sola
// linea las une --por eso la primera version afirmaba cubrir los .yml y no cazaba
// ninguno--. Y es la forma con MAS alcance: un input del reusable llega a TODO
// consumidor, no solo a este repo.
const CLAVE_YAML = /^\s*([a-z_]*(?:ventana|gracia|exigible)[a-z_]*)\s*:\s*$/;
const DEFAULT_YAML = /^\s*default:\s*"(20\d{2}-\d{2}-\d{2})"/;

/** Las fechas declaradas como default de un input cuyo nombre habla de ventana. */
export function ventanasDeYaml(texto) {
  const lineas = texto.split("\n");
  const out = [];
  for (let i = 0; i < lineas.length; i++) {
    const k = CLAVE_YAML.exec(lineas[i]);
    if (!k) continue;
    // El default puede estar varias lineas abajo, despues de description y type.
    for (let j = i + 1; j < Math.min(i + 25, lineas.length); j++) {
      if (CLAVE_YAML.test(lineas[j])) break; // empezo otro input
      const d = DEFAULT_YAML.exec(lineas[j]);
      if (d) { out.push(d[1]); break; }
    }
  }
  return out;
}

function archivosDeProduccion() {
  const out = [];
  const recorrer = (dir) => {
    if (!fs.existsSync(dir)) return;
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (e.name === "pruebas" || e.name === "fixtures" || e.name === "node_modules") continue;
        recorrer(p);
      } else if (/\.(mjs|js|yml)$/.test(e.name)) {
        out.push(p);
      }
    }
  };
  for (const r of RAICES) recorrer(path.join(RAIZ, r));
  return out;
}

/** Las fechas de gracia vivas, con el archivo donde estan. */
export function ventanasVivas() {
  const encontradas = [];
  for (const f of archivosDeProduccion()) {
    const texto = fs.readFileSync(f, "utf8");
    for (const m of texto.matchAll(PATRON_JS)) {
      encontradas.push({ fecha: m[1], archivo: path.relative(RAIZ, f) });
    }
    if (f.endsWith(".yml") || f.endsWith(".yaml")) {
      for (const fecha of ventanasDeYaml(texto)) {
        encontradas.push({ fecha, archivo: path.relative(RAIZ, f) });
      }
    }
  }
  return encontradas;
}

/** El texto de todos los changes ACTIVOS (sin archive). */
function textoDeChangesActivos() {
  const base = path.join(RAIZ, "openspec", "changes");
  let todo = "";
  for (const e of fs.readdirSync(base, { withFileTypes: true })) {
    if (!e.isDirectory() || e.name === "archive") continue;
    const recorrer = (dir) => {
      for (const x of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, x.name);
        if (x.isDirectory()) recorrer(p);
        else if (x.name.endsWith(".md")) todo += fs.readFileSync(p, "utf8");
      }
    };
    recorrer(path.join(base, e.name));
  }
  return todo;
}

/** Un change es DUENO de una fecha solo si lo declara con el marcador.
 *
 *  POR QUE NO ALCANZA CON QUE LA NOMBRE. La primera version de esta compuerta
 *  cruzaba "la fecha aparece en algun change activo" y pasaba en verde por el
 *  motivo equivocado: `ventana-vencida` nombra 2026-09-30 para decir que NO la
 *  toca. "La menciona" y "se hace cargo" son cosas distintas, y una compuerta que
 *  no las distingue afirma mas de lo que verifica. */
export function esDuenoDeclarado(texto, fecha) {
  return new RegExp(`DUENO DE LA FECHA:\\s*${fecha.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(texto);
}

test("el escaneo encuentra algo: si no, todo lo de abajo pasa vacuamente", () => {
  const v = ventanasVivas();
  assert.ok(
    v.length > 0,
    "no se encontro ninguna fecha de gracia en el codigo de produccion. Si se borraron todas, esta guarda sobra; si el patron dejo de matchear, esta compuerta quedo mirando al vacio",
  );
});

test("toda fecha de gracia viva tiene un change activo que se declara su DUENO", () => {
  const activos = textoDeChangesActivos();
  const huerfanas = ventanasVivas().filter((v) => !esDuenoDeclarado(activos, v.fecha));
  assert.deepEqual(
    huerfanas,
    [],
    `estas fechas aflojan una compuerta y ningun change activo se declara su dueno, asi que van a vencer sin que nadie lo decida. ` +
      `Se adopta una fecha escribiendo "DUENO DE LA FECHA: <fecha>" en el tasks.md del change que se hace cargo:\n` +
      huerfanas.map((h) => `  ${h.archivo} -> ${h.fecha}`).join("\n"),
  );
});

test("MUERDE: MENCIONAR la fecha no alcanza; hay que declararse su dueno", () => {
  // ESTE CASO EXISTE POR UN DEFECTO REAL DE ESTA MISMA COMPUERTA. La primera
  // version cruzaba "la fecha aparece en algun change activo", y pasaba en verde
  // por el motivo equivocado: `ventana-vencida` nombra 2026-09-30 justamente para
  // declarar que NO la toca. Una compuerta que no distingue "es dueno" de "la
  // menciona al pasar" afirma mas de lo que verifica.
  const soloMenciona = "El change tal nombra la fecha 2026-09-30 para decir que no la toca.";
  assert.equal(esDuenoDeclarado(soloMenciona, "2026-09-30"), false, "mencionar la fecha no puede contar como poseerla");

  const declara = "DUENO DE LA FECHA: 2026-09-30";
  assert.equal(esDuenoDeclarado(declara, "2026-09-30"), true, "el marcador explicito tiene que contar");

  assert.equal(esDuenoDeclarado(textoDeChangesActivos(), "2099-12-31"), false, "una fecha sin dueno no puede pasar");
});

test("MEDIDO: la compuerta VE el input de workflow, que era el que se le escapaba", () => {
  // Anti-vacuidad de la ampliacion. La primera version afirmaba cubrir los .yml
  // --RAICES incluye .github/workflows y el filtro toma .yml-- y no cazaba ninguno,
  // porque exigia la forma `NOMBRE = "fecha"` de JavaScript. La forma que importa es
  // otra: un input con su `default:` unas lineas abajo. Y es la de MAYOR alcance,
  // porque un input del reusable llega a TODO consumidor.
  const enYaml = ventanasVivas().filter((v) => v.archivo.endsWith(".yml") || v.archivo.endsWith(".yaml"));
  assert.ok(
    enYaml.length > 0,
    "la compuerta no ve ninguna ventana en YAML. Si de verdad no queda ninguna, este caso sobra; si el patron dejo de matchear, la compuerta volvio a afirmar que cubre algo que no mira",
  );
});

test("MUERDE: un input de ventana sin default fechado no se inventa una fecha", () => {
  // El predicado no puede alucinar: un input que se llama "ventana" pero cuyo
  // default no es una fecha no produce hallazgo.
  const sinFecha = [
    "      ventana_cualquiera:",
    "        description: algo",
    "        type: string",
    '        default: ""',
  ].join("\n");
  assert.deepEqual(ventanasDeYaml(sinFecha), [], "invento una fecha donde no hay ninguna");

  const conFecha = [
    "      ventana_terraform:",
    "        description: algo",
    "        type: string",
    '        default: "2026-09-30"',
  ].join("\n");
  assert.deepEqual(ventanasDeYaml(conFecha), ["2026-09-30"], "no ve el default fechado de un input de ventana");
});
