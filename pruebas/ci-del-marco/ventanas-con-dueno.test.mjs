import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { fechasEnCodigo, lenguajeDe } from "./fechas-en-codigo.mjs";

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
// ver— sino sobre un sujeto sintetico con las formas que una ventana tomo o
// puede tomar. Sin eso, "toda fecha viva tiene dueno" pasaria en vacio para
// siempre y nadie sabria si es porque no hay fechas o porque el patron se rompio.
//
// Y NO SE FIA DEL NOMBRE (hallazgo FO-H1 de la revision adversarial del porte).
// La primera version solo veia constantes en MAYUSCULAS que dijeran VENTANA,
// GRACIA, HASTA o EXIGIBLE, en .mjs/.js/.yml: un camelCase, un nombre sin esas
// palabras, un .ts del andamio o una fecha escrita directo en un `run:` pasaban
// sin que nada se enterara. Ahora cuenta TODA fecha AAAA-MM-DD escrita en una
// linea de codigo (no en un comentario) de produccion, se llame como se llame lo
// que la guarda (`fechas-en-codigo.mjs`). Las pocas que son citas —"medido el
// ...", "desde el ..." dentro de un mensaje— se exceptuan una por una, por linea y
// con su motivo, en CITAS_QUE_NO_SON_PLAZOS; y una excepcion que ya no encuentra
// su linea es roja, asi que la lista no envejece en silencio.
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

// La prueba de un PAQUETE del andamio (`*.test.ts`, `*.spec.tsx`) es de la misma
// clase que un fixture: sus fechas son datos de su suite, no plazos de nadie.
const DE_PRUEBA = /\.(?:test|spec)\.[A-Za-z]+$/;

/** Los archivos de produccion bajo las raices, con su texto y su lenguaje. Entran
 *  los de JavaScript y TypeScript (tambien los .ts y .tsx del andamio), los YAML,
 *  los .sh y los ejecutables sin extension que declaran su interprete (un hook de
 *  git es exactamente eso). */
function archivosDeProduccion(raiz) {
  const out = [];
  const recorrer = (dir) => {
    if (!fs.existsSync(dir)) return;
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (e.name === "pruebas" || e.name === "fixtures" || e.name === "node_modules") continue;
        recorrer(p);
        continue;
      }
      if (!e.isFile() || DE_PRUEBA.test(e.name)) continue;
      const conExtension = /\.[A-Za-z0-9]+$/.test(e.name);
      if (conExtension && !lenguajeDe(e.name)) continue;
      const texto = fs.readFileSync(p, "utf8");
      const lenguaje = lenguajeDe(e.name, texto);
      if (!lenguaje) continue;
      out.push({ abs: p, archivo: path.relative(raiz, p).split(path.sep).join("/"), texto, lenguaje });
    }
  };
  for (const r of RAICES) recorrer(path.join(raiz, r));
  return out;
}

// LAS FECHAS DE CODIGO QUE SON CITAS, NO PLAZOS. Cada una se exceptua por su
// LINEA —el `fragmento` tiene que aparecer en ella, con la fecha adentro— y no por
// su archivo ni por su fecha: una ventana nueva escrita en el mismo archivo, con
// la misma fecha, se sigue viendo. Una entrada que ya no encuentra su linea es
// ROJA (caso de abajo): la lista no puede quedar exceptuando aire.
//
// Agregar una entrada es decidir, por escrito y bajo review, que esa fecha no
// afloja nada. Si afloja, lo que corresponde es el marcador de dueno, no esta lista.
export const CITAS_QUE_NO_SON_PLAZOS = [
  {
    archivo: "actions/constitucion/action.yml",
    fragmento: "2026-08-21 (residuo A01)",
    motivo: "description de un input: fecha de la decision que declaro el residuo A01, no un plazo",
  },
  {
    archivo: "actions/constitucion/action.yml",
    fragmento: "2026-08-20: GitHub evalua las expresiones",
    motivo: "description de un input: fecha en que se midio como GitHub evalua las descriptions",
  },
  {
    archivo: "actions/constitucion/action.yml",
    fragmento: "hasta el 2026-08-20 el paso de permisos",
    motivo: "description de un input: historia de un paso que ya no existe",
  },
  {
    archivo: "actions/constitucion/cableado.mjs",
    fragmento: "modo aviso desde el 2026-08-21",
    motivo: "mensaje del residuo A01: fecha en que empezo el aviso, sin fin fechado; el aviso no depende del reloj",
  },
  {
    archivo: "herramientas/projects-asistente.mjs",
    fragmento: "La promocion existe para esta forma desde el 2026-09-10",
    motivo: "texto que el asistente le muestra a la persona: desde cuando existe la promocion",
  },
  {
    archivo: "herramientas/projects-asistente.mjs",
    fragmento: "recibe la promocion desde el 2026-09-10",
    motivo: "texto que el asistente le muestra a la persona: desde cuando existe la promocion",
  },
  {
    archivo: "herramientas/projects-init.mjs",
    fragmento: "(medido el 2026-09-10 en su documentación",
    motivo: "texto que la herramienta escribe en un documento: fecha de una medicion",
  },
  {
    archivo: ".github/workflows/marco-ci.yml",
    fragmento: "default 2026-09-30. La gravedad de ese job dejo de depender del reloj",
    motivo: "description del input ventana_terraform: cuenta el default que tuvo en la 1.9.6, que ya no tiene",
  },
  {
    archivo: ".github/workflows/marco-ci.yml",
    fragmento: "(incidente 2026-08-05)",
    motivo: "mensaje de ::warning:: que nombra el incidente que lo origino",
  },
  {
    archivo: ".github/workflows/marco-ci.yml",
    fragmento: "RESIDUO DECLARADO (A16, modo aviso desde el 2026-08-21)",
    motivo: "mensaje del residuo A16: fecha en que empezo el aviso, sin fin fechado; el aviso no depende del reloj",
  },
];

/** Toda fecha AAAA-MM-DD en una linea de codigo de produccion, exceptuada o no. */
export function fechasDeCodigoVivas(raiz = RAIZ) {
  const salida = [];
  for (const a of archivosDeProduccion(raiz)) {
    for (const f of fechasEnCodigo(a.texto, a.lenguaje)) salida.push({ archivo: a.archivo, ...f });
  }
  return salida;
}

const esCita = (citas) => (f) => citas.some((c) => c.archivo === f.archivo && f.texto.includes(c.fragmento));

/** Las fechas de gracia vivas bajo `raiz`, con el archivo donde estan: las que el
 *  NOMBRE delata (tambien comentadas, que es lo que un consumidor copia de un
 *  ejemplo) y toda fecha de una linea de codigo que no sea una cita exceptuada. */
export function ventanasVivas(raiz = RAIZ, citas = CITAS_QUE_NO_SON_PLAZOS) {
  const encontradas = [];
  const vistas = new Set();
  const anotar = (fecha, archivo) => {
    const clave = `${archivo}\0${fecha}`;
    if (vistas.has(clave)) return;
    vistas.add(clave);
    encontradas.push({ fecha, archivo });
  };
  for (const a of archivosDeProduccion(raiz)) {
    for (const m of a.texto.matchAll(PATRON_JS)) anotar(m[1], a.archivo);
    if (a.lenguaje === "yaml") {
      for (const fecha of ventanasDeYaml(a.texto)) anotar(fecha, a.archivo);
    }
    for (const f of fechasEnCodigo(a.texto, a.lenguaje)) {
      if (!esCita(citas)({ archivo: a.archivo, ...f })) anotar(f.fecha, a.archivo);
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

  // LAS CUATRO FORMAS QUE EL NOMBRE NO DELATA (hallazgo FO-H1 de la revision
  // adversarial del porte). Con la deteccion por nombre de variable, las cuatro
  // daban `ventanasVivas() -> []` y el caso del dueno pasaba sobre una lista vacia.
  // 4. camelCase: la forma que el comparador de cobertura uso por dentro (`ventanaHasta`).
  escribir(
    "actions/otra-action/medir.mjs",
    'const ventanaDeGracia = "2031-05-05";\nexport function veredicto(hoy) { return hoy <= ventanaDeGracia ? "warning" : "error"; }\n',
  );
  // 5. Un nombre que no dice ventana, ni gracia, ni hasta, ni exigible.
  escribir("herramientas/plazo.mjs", 'const PLAZO_DE_ESTRENO = "2031-06-06";\n');
  // 6. Un .ts del andamio: plantilla/api/src es TypeScript, y el escaneo solo miraba .mjs/.js/.yml.
  escribir("plantilla/api/src/compuerta.ts", 'export const limite: string = "2031-07-07";\n');
  // 7. La comparacion escrita directo en el `run:` de un workflow, sin variable.
  escribir(
    ".github/workflows/directo.yml",
    ["jobs:", "  x:", "    steps:", "      - run: |", '          if [ "$(date -u +%F)" \\> "2031-08-08" ]; then exit 1; fi', ""].join("\n"),
  );
  // Y lo que NO cuenta, del mismo lado: una fecha en un comentario del codigo de
  // produccion (es historia: "medido el ...") y una en la prueba de un paquete del
  // andamio (fixture de su suite, no plazo de nadie).
  escribir("actions/una-action/otra.mjs", "// medido el 2031-09-09 contra el consumidor\nexport const x = 1;\n");
  escribir("plantilla/api/src/compuerta.test.ts", 'const fecha = "2031-10-10";\n');
  return dir;
}

test("el escaneo VE las siete formas, en el marco y en el andamio, sobre un sujeto sintetico", () => {
  // ANTI-VACUIDAD. El arbol real ya no tiene ninguna fecha de gracia, asi que "el
  // escaneo encuentra algo" no se puede medir ahi: se mide aca, con una forma por
  // cada una que una ventana ya tomo en este repo o que el nombre no delata.
  const dir = sujetoSintetico();
  try {
    const vistas = ventanasVivas(dir).sort((a, b) => a.fecha.localeCompare(b.fecha));
    assert.deepEqual(
      vistas,
      [
        { fecha: "2031-01-01", archivo: "actions/una-action/medir.mjs" },
        { fecha: "2031-02-02", archivo: ".github/workflows/reusable.yml" },
        { fecha: "2031-03-03", archivo: "plantilla/.github/workflows/ci.yml" },
        { fecha: "2031-05-05", archivo: "actions/otra-action/medir.mjs" },
        { fecha: "2031-06-06", archivo: "herramientas/plazo.mjs" },
        { fecha: "2031-07-07", archivo: "plantilla/api/src/compuerta.ts" },
        { fecha: "2031-08-08", archivo: ".github/workflows/directo.yml" },
      ],
      "el escaneo no vio alguna de las siete formas de ventana (constante JS, default de input, asignacion YAML del " +
        "andamio, camelCase, nombre sin la palabra ventana, .ts del andamio, fecha en un run:), o conto un fixture, " +
        "un comentario o la prueba de un paquete",
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

test("cada cita exceptuada existe en el arbol real, trae su fecha y su motivo", () => {
  // DOS COSAS A LA VEZ. Una: la lista no exceptua aire —una entrada cuya linea se
  // borro o cambio es roja, y se borra—. La otra es la anti-vacuidad del escaneo
  // literal SOBRE EL ARBOL REAL: si `fechasEnCodigo` dejara de ver, las diez citas
  // quedarian sin su linea y este caso se pondria rojo, aunque "toda fecha viva
  // tiene dueno" siguiera verde sobre una lista vacia.
  const vivas = fechasDeCodigoVivas();
  const huerfanas = [];
  for (const c of CITAS_QUE_NO_SON_PLAZOS) {
    assert.match(c.fragmento, /\b20\d{2}-\d{2}-\d{2}\b/, `la cita de ${c.archivo} no trae la fecha en su fragmento: "${c.fragmento}"`);
    assert.ok(c.motivo && c.motivo.length >= 20, `la cita "${c.fragmento}" de ${c.archivo} no dice por que no es un plazo`);
    if (!vivas.some((f) => f.archivo === c.archivo && f.texto.includes(c.fragmento))) {
      huerfanas.push(`${c.archivo}: "${c.fragmento}"`);
    }
  }
  assert.deepEqual(
    huerfanas,
    [],
    "estas citas exceptuadas ya no encuentran su linea de codigo en el arbol: borralas de CITAS_QUE_NO_SON_PLAZOS " +
      "(o, si el escaneo dejo de ver fechas que siguen ahi, arregla fechas-en-codigo.mjs):\n  " +
      huerfanas.join("\n  "),
  );
});

test("MUERDE: la excepcion es de la LINEA, no del archivo ni de la fecha", () => {
  // Si la excepcion fuera por archivo o por fecha, una ventana nueva escrita en el
  // mismo archivo que una cita, con la misma fecha, quedaria tapada.
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "projects-citas-"));
  try {
    const cita = CITAS_QUE_NO_SON_PLAZOS.find((c) => c.archivo.endsWith(".mjs"));
    assert.ok(cita, "no hay ninguna cita en un .mjs para armar el caso");
    const fecha = cita.fragmento.match(/20\d{2}-\d{2}-\d{2}/)[0];
    const abs = path.join(dir, ...cita.archivo.split("/"));
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, `const aviso = "${cita.fragmento}";\n`);
    assert.deepEqual(ventanasVivas(dir), [], "la cita exceptuada, sola, no puede contar como plazo");
    fs.writeFileSync(abs, `const aviso = "${cita.fragmento}";\nconst limite = "${fecha}";\n`);
    assert.deepEqual(
      ventanasVivas(dir),
      [{ fecha, archivo: cita.archivo }],
      "una fecha nueva en el mismo archivo y con la misma fecha que una cita quedo tapada por la excepcion",
    );
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("MUERDE: una fecha en un comentario no cuenta; la misma fecha en codigo si, en cada lenguaje", () => {
  assert.deepEqual(fechasEnCodigo("// medido el 2031-01-01\nconst x = 1;", "js"), []);
  assert.deepEqual(fechasEnCodigo(" * medido el 2031-01-01", "js"), []);
  assert.deepEqual(
    fechasEnCodigo('const x = 1; // vence "2031-01-01"', "js").map((f) => f.fecha),
    ["2031-01-01"],
    "un comentario AL FINAL de una linea de codigo no se descarta: es el lado conservador",
  );
  // En JavaScript el # no es comentario: es un campo privado de una clase.
  assert.deepEqual(fechasEnCodigo('  #limite = "2031-01-01";', "js").map((f) => f.fecha), ["2031-01-01"]);
  assert.deepEqual(fechasEnCodigo("# medido el 2031-01-01", "yaml"), []);
  assert.deepEqual(fechasEnCodigo("            // dentro de un node -e: 2031-01-01", "yaml"), []);
  assert.deepEqual(fechasEnCodigo('          HASTA="2031-01-01"', "shell").map((f) => f.fecha), ["2031-01-01"]);
  assert.equal(lenguajeDe("pre-push", "#!/usr/bin/env bash\n"), "shell", "un hook sin extension se lee por su interprete");
  assert.equal(lenguajeDe("gate.ts"), "js");
  assert.equal(lenguajeDe("notas.md"), null, "la prosa no entra: las fechas de un .md son historia o datos");
});

test("ninguna pagina del marco describe como vigente la ventana de estreno de cobertura que se retiro", () => {
  // Hallazgo RV-H1 de la revision adversarial del porte. La-ventana-se-cierra borro la
  // ventana del comparador y corrigio un parrafo de actions/README.md, pero la tabla
  // de casos de la misma pagina —la que un consumidor lee para saber que color va a
  // ver— seguia diciendo que un paquete sin declaracion «pasa en amarillo», y la
  // seccion del banco seguia describiendo «sus dos pruebas propias», ya borradas.
  // Ningun banco miraba prosa: este caso ata esas frases.
  //
  // LIMITE DECLARADO, el mismo de los casos de prosa de pinado.test.mjs: son las
  // formas EXACTAS que ya aparecieron, no un detector de la idea. Una redaccion nueva
  // la ve el review. Quedan fuera el archive y el CHANGELOG (historia que las cita) y
  // openspec/specs, que cambia recien al archivar (tarea 7.4 de la-ventana-se-cierra).
  const FALSAS = [
    "dentro de la ventana de estreno",
    "corre con la ventana de estreno",
    "la ventana tiene sus dos pruebas propias",
  ];
  const aplanar = (t) => t.replace(/\r?\n[ \t]*(?:>|#|\/\/|\*)?[ \t]*/g, " ").replace(/[ \t]+/g, " ");
  assert.ok(
    aplanar("El banco del total corre con la ventana de estreno\n**cerrada**").includes(FALSAS[1]),
    "la normalizacion dejo de unir las lineas partidas",
  );
  const paginas = [path.join(RAIZ, "README.md"), path.join(RAIZ, "AGENTS.md")];
  const recorrer = (dir) => {
    if (!fs.existsSync(dir)) return;
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (e.name !== "node_modules") recorrer(p);
      } else if (e.name.endsWith(".md")) paginas.push(p);
    }
  };
  for (const d of ["actions", "docs", "plantilla", ".claude"]) recorrer(path.join(RAIZ, d));
  assert.ok(paginas.length > 30, `solo ${paginas.length} paginas leidas: el recorrido se rompio`);
  const encontradas = [];
  for (const p of paginas) {
    const texto = aplanar(fs.readFileSync(p, "utf8"));
    for (const f of FALSAS) {
      if (texto.includes(f)) encontradas.push(`${path.relative(RAIZ, p).split(path.sep).join("/")}: "${f}"`);
    }
  }
  assert.deepEqual(
    encontradas,
    [],
    "estas paginas describen como vigente la ventana de estreno de cobertura, que se retiro con la-ventana-se-cierra: " +
      "un paquete por debajo del minimo sin declaracion es rojo cualquier dia. Reescribi la frase con eso",
  );
});
