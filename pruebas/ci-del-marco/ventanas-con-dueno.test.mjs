import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

// ---------------------------------------------------------------------------
// UNA FECHA QUE AFLOJA UNA COMPUERTA TIENE QUE TENER UN CHANGE QUE LA POSEA.
//
// QUE DEFECTO CIERRA. `medir-cobertura-diff.mjs` aflojaba la cobertura hasta el
// 2026-09-30, y el input `ventana_terraform` de marco-ci.yml aflojaba el job
// terraform hasta la misma fecha. Los pendientes que quedaron vivos al archivar
// el change que introdujo la primera no decian donde vivia ese trabajo, y al
// 2026-09-10 faltaban 20 dias sin que ningun change activo nombrara la fecha.
//
// Un plazo sin dueno vence sin que nadie lo decida. Eso no es una compuerta que
// se dispara: es una sorpresa.
//
// LAS DOS SE BORRARON (change la-ventana-se-cierra, decision D9 del PO), y esta
// compuerta se queda para la proxima: con cero fechas vivas, lo que protege es
// que una ventana nueva no nazca huerfana. Por eso el caso que prueba que el
// escaneo VE algo ya no corre sobre el arbol real —que hoy no tiene nada que
// ver— sino sobre un sujeto sintetico con las tres formas que una ventana tomo o
// puede tomar. Sin eso, "toda fecha viva tiene dueno" pasaria en vacio para
// siempre y nadie sabria si es porque no hay fechas o porque el patron se rompio.
// ---------------------------------------------------------------------------

// Solo codigo de PRODUCCION: los fixtures de los bancos usan fechas sinteticas a
// proposito y no son plazos de nadie.
//
// `plantilla` ENTRA, y es la ampliacion que faltaba: el andamio traia su propia
// ventana (`VENTANA_TERRAFORM: "2026-09-30"` en el env de un paso de su ci.yml),
// y esa fecha no la veia nadie. Es la de peor pronostico de todas: el andamio se
// copia UNA vez y despues es del proyecto, asi que una fecha que viaja ahi vence
// en el repo de otro, sin PR de bump que la anuncie.
export const RAICES = ["actions", "herramientas", ".github/workflows", "plantilla"];

// UNA CONSTANTE DE JAVASCRIPT: `NOMBRE_CON_VENTANA = "2026-09-30"`.
const PATRON_JS = /\b[A-Z][A-Z_]*(?:VENTANA|GRACIA|HASTA|EXIGIBLE)[A-Z_]*\s*=\s*["'](20\d{2}-\d{2}-\d{2})["']/g;

// UNA ASIGNACION DE YAML, SIN `=`: `VENTANA_TERRAFORM: "2026-09-30"` en el `env:`
// de un paso, o `ventana_terraform: "2026-09-30"` en el `with:` de un uses:. Es la
// forma que tenia la ventana del andamio y la que esta compuerta NO VEIA: exigia el
// `=` de JavaScript. La clave puede ir en mayusculas o minusculas, y la linea
// puede estar comentada —un `with:` de ejemplo comentado es exactamente lo que un
// consumidor copia y pega—.
const PATRON_YAML_EN_LINEA =
  /^[ \t]*(?:#[ \t]*)*(?:-[ \t]+)?["']?([A-Za-z_]*(?:VENTANA|GRACIA|HASTA|EXIGIBLE|ventana|gracia|hasta|exigible)[A-Za-z_]*)["']?[ \t]*:[ \t]*["']?(20\d{2}-\d{2}-\d{2})\b/;

// UN INPUT DE WORKFLOW: `ventana_terraform:` con su `default: "2026-09-30"` unas
// lineas abajo. La clave y la fecha viven en LINEAS DISTINTAS, asi que ninguna
// regex de una sola linea las une --por eso la primera version afirmaba cubrir los
// .yml y no cazaba ninguno--. Y es la forma con MAS alcance: un input del
// reusable llega a TODO consumidor, no solo a este repo.
const CLAVE_YAML = /^\s*([a-z_]*(?:ventana|gracia|exigible)[a-z_]*)\s*:\s*$/;
const DEFAULT_YAML = /^\s*default:\s*["']?(20\d{2}-\d{2}-\d{2})/;

/** Las fechas de gracia de un texto YAML: asignaciones en una linea y defaults de
 *  inputs cuyo nombre habla de ventana. */
export function ventanasDeYaml(texto) {
  const lineas = texto.split("\n");
  const out = [];
  for (let i = 0; i < lineas.length; i++) {
    const enLinea = PATRON_YAML_EN_LINEA.exec(lineas[i]);
    if (enLinea) {
      out.push(enLinea[2]);
      continue;
    }
    const k = CLAVE_YAML.exec(lineas[i]);
    if (!k) continue;
    // El default puede estar varias lineas abajo, despues de description y type.
    for (let j = i + 1; j < Math.min(i + 25, lineas.length); j++) {
      if (CLAVE_YAML.test(lineas[j])) break; // empezo otro input
      const d = DEFAULT_YAML.exec(lineas[j]);
      if (d) {
        out.push(d[1]);
        break;
      }
    }
  }
  return out;
}

function archivosDeProduccion(raiz) {
  const out = [];
  const recorrer = (dir) => {
    if (!fs.existsSync(dir)) return;
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (e.name === "pruebas" || e.name === "fixtures" || e.name === "node_modules") continue;
        recorrer(p);
      } else if (/\.(mjs|js|yml|yaml)$/.test(e.name)) {
        out.push(p);
      }
    }
  };
  for (const r of RAICES) recorrer(path.join(raiz, r));
  return out;
}

/** Las fechas de gracia vivas bajo `raiz`, con el archivo donde estan. */
export function ventanasVivas(raiz = RAIZ) {
  const encontradas = [];
  for (const f of archivosDeProduccion(raiz)) {
    const texto = fs.readFileSync(f, "utf8");
    const archivo = path.relative(raiz, f).split(path.sep).join("/");
    for (const m of texto.matchAll(PATRON_JS)) {
      encontradas.push({ fecha: m[1], archivo });
    }
    if (f.endsWith(".yml") || f.endsWith(".yaml")) {
      for (const fecha of ventanasDeYaml(texto)) {
        encontradas.push({ fecha, archivo });
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

/** Un arbol sintetico con las tres formas de ventana, y un fixture que NO cuenta. */
function sujetoSintetico() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "projects-ventanas-"));
  const escribir = (rel, contenido) => {
    const abs = path.join(dir, ...rel.split("/"));
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, contenido);
  };
  // 1. La constante de JavaScript, como la de cobertura-diff.
  escribir("actions/una-action/medir.mjs", 'const VENTANA_DE_GRACIA_HASTA = "2031-01-01";\n');
  // 2. El input del reusable con su default unas lineas abajo, como ventana_terraform.
  escribir(
    ".github/workflows/reusable.yml",
    [
      "on:",
      "  workflow_call:",
      "    inputs:",
      "      ventana_algo:",
      "        description: algo",
      "        type: string",
      '        default: "2031-02-02"',
      "",
    ].join("\n"),
  );
  // 3. La asignacion YAML sin `=`, en el andamio, como el env del paso de Terraform.
  escribir(
    "plantilla/.github/workflows/ci.yml",
    ["jobs:", "  x:", "    steps:", "      - name: algo", "        env:", '          VENTANA_ALGO: "2031-03-03"', ""].join("\n"),
  );
  // Y un fixture de banco: una fecha sintetica que NO es un plazo de nadie.
  escribir("actions/una-action/pruebas/fixtures/caso.yml", 'VENTANA_FALSA: "2031-04-04"\n');
  return dir;
}

test("el escaneo VE las tres formas, en el marco y en el andamio, sobre un sujeto sintetico", () => {
  // ANTI-VACUIDAD. El arbol real ya no tiene ninguna fecha de gracia, asi que "el
  // escaneo encuentra algo" no se puede medir ahi: se mide aca, con una forma por
  // cada una que una ventana ya tomo en este repo.
  const dir = sujetoSintetico();
  try {
    const vistas = ventanasVivas(dir).sort((a, b) => a.fecha.localeCompare(b.fecha));
    assert.deepEqual(
      vistas,
      [
        { fecha: "2031-01-01", archivo: "actions/una-action/medir.mjs" },
        { fecha: "2031-02-02", archivo: ".github/workflows/reusable.yml" },
        { fecha: "2031-03-03", archivo: "plantilla/.github/workflows/ci.yml" },
      ],
      "el escaneo no vio las tres formas de ventana (constante JS, default de input, asignacion YAML del andamio), o conto un fixture de banco",
    );
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("toda fecha de gracia viva tiene un change activo que se declara su DUENO", () => {
  const activos = textoDeChangesActivos();
  const huerfanas = ventanasVivas().filter((v) => !esDuenoDeclarado(activos, v.fecha));
  assert.deepEqual(
    huerfanas,
    [],
    `estas fechas aflojan una compuerta y ningun change activo se declara su dueno, asi que van a vencer sin que nadie lo decida. ` +
      `Arreglo: escribi "DUENO DE LA FECHA: <fecha>" en el tasks.md del change que se hace cargo, o borra la ventana ` +
      `(la decision D1 del PO termino con el modo aviso como regla general):\n` +
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

test("MUERDE: la asignacion YAML sin `=` se ve, y la que no trae fecha no se inventa", () => {
  // LA FORMA QUE SE LE ESCAPABA. El env del paso de Terraform del andamio decia
  // `VENTANA_TERRAFORM: "2026-09-30"`: sin `=`, sin input, en una sola linea. La
  // compuerta solo conocia la constante de JavaScript y el default de un input.
  assert.deepEqual(ventanasDeYaml('          VENTANA_TERRAFORM: "2026-09-30"'), ["2026-09-30"]);
  assert.deepEqual(ventanasDeYaml("          VENTANA_TERRAFORM: 2026-09-30"), ["2026-09-30"], "sin comillas tambien");
  assert.deepEqual(
    ventanasDeYaml('#       #   ventana_terraform: "2026-09-30"'),
    ["2026-09-30"],
    "un with: de ejemplo comentado es lo que un consumidor copia: cuenta",
  );
  // El predicado no puede alucinar: la misma clave leyendo un input no es una fecha.
  assert.deepEqual(ventanasDeYaml("          VENTANA_TERRAFORM: ${{ inputs.ventana_terraform }}"), []);
  assert.deepEqual(ventanasDeYaml("          RAICES_DECLARADAS: infra infra-prod"), []);
  // Y una fecha cualquiera en YAML, con una clave que no habla de ventana, tampoco.
  assert.deepEqual(ventanasDeYaml('          publicada: "2026-09-30"'), []);
});

test("MUERDE: un input de ventana sin default fechado no se inventa una fecha", () => {
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
