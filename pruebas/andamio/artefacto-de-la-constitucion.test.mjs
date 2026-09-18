import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

import { ARBOLES, RAIZ, workflows } from "./workflows.mjs";

// ---------------------------------------------------------------------------
// EL ARTEFACTO `constitucion-al-dia` SE SUBE DE VERDAD.
//
// EL DEFECTO. El job `constitucion` del ci.yml del andamio sube, en TODA corrida,
// el directorio que la action deja con los artefactos al dia: es la salida de
// emergencia del bloqueo circular del bump (ADR 005) —el PR de Dependabot nace
// rojo por el artefacto viejo, y la salida es bajar este artifact y commitearlo
// sobre el PR—. Pero upload-artifact EXCLUYE los archivos ocultos desde su v4.4, y
// TODO lo que la action escribe ahi cuelga de un directorio oculto (`.projects/`,
// `.cursor/`). Con `if-no-files-found: warn`, el resultado era un artifact que no
// se subia y un aviso que nadie lee: la salida de emergencia no existia. Lo midio
// el upstream de este marco el 2026-08-28, en el consumidor de referencia, la
// primera vez que el canonico cambio despues de existir el paso (Rigel 1.9.0,
// commit 06a9c94).
//
// QUE FIJA ESTE BANCO, y por que tiene una mitad que CORRE la action: el
// `if-no-files-found: error` solo es seguro si en una corrida VERDE el directorio
// tampoco queda vacio. Si quedara vacio, el arreglo enrojeceria un verde. Eso no se
// supone leyendo el comentario de constitucion.mjs («se deja en disco SIEMPRE»): se
// corre la action en modo verificar sobre un repo al dia y se mira el disco.
// ---------------------------------------------------------------------------

const SCRIPT = path.join(RAIZ, "actions", "constitucion", "constitucion.mjs");

/** Los pasos de upload-artifact de un workflow, con su bloque `with:` leido por
 *  sangria (los workflows del andamio traen marcadores que un parser de YAML no lee). */
function subidas(ruta) {
  const lineas = fs.readFileSync(ruta, "utf8").split(/\r?\n/);
  const pasos = [];
  for (let i = 0; i < lineas.length; i += 1) {
    const m = /^(\s*)(?:-\s+)?uses:\s*actions\/upload-artifact@/.exec(lineas[i]);
    if (!m) continue;
    const con = {};
    let j = i + 1;
    while (j < lineas.length && !/^\s*with:\s*$/.test(lineas[j]) && !/^\s*-\s/.test(lineas[j])) j += 1;
    if (j < lineas.length && /^\s*with:\s*$/.test(lineas[j])) {
      const sangria = lineas[j].length - lineas[j].trimStart().length;
      for (let k = j + 1; k < lineas.length; k += 1) {
        const l = lineas[k];
        if (!l.trim() || /^\s*#/.test(l)) continue;
        if (l.length - l.trimStart().length <= sangria) break;
        const par = /^\s*([a-z-]+):\s*(.*?)\s*$/.exec(l);
        if (par) con[par[1]] = par[2];
      }
    }
    pasos.push({ archivo: path.relative(RAIZ, ruta).replace(/\\/g, "/"), linea: i + 1, con });
  }
  return pasos;
}

const TODAS = ARBOLES.flatMap(({ dir }) => workflows(dir)).flatMap(subidas);

test("hay subidas de artifact que mirar: un cero aca es el lector roto", () => {
  assert.ok(
    TODAS.some((p) => p.con.name === "constitucion-al-dia"),
    "no encontre el paso que sube constitucion-al-dia en ningun workflow: o se borro, o el lector dejo de verlo",
  );
});

test("toda subida de artifact decide EXPLICITAMENTE si incluye archivos ocultos", () => {
  // El default de upload-artifact desde la v4.4 es excluirlos, y lo hace sin avisar:
  // un directorio de puros ocultos sube vacio. Declararlo obliga a decidirlo.
  const sinDecidir = TODAS.filter((p) => !("include-hidden-files" in p.con)).map((p) => `${p.archivo}:${p.linea}`);
  assert.deepEqual(
    sinDecidir,
    [],
    "estas subidas no declaran include-hidden-files: si lo que suben cuelga de un directorio oculto, el artifact " +
      "sale vacio y nadie se entera. Arreglo: declararlo, true o false, con el motivo al lado",
  );
});

test("constitucion-al-dia sube los ocultos y es ROJO si no sube nada", () => {
  const paso = TODAS.find((p) => p.con.name === "constitucion-al-dia");
  assert.equal(
    paso.con["include-hidden-files"],
    "true",
    `${paso.archivo}:${paso.linea} sube constitucion-al-dia sin include-hidden-files: true. Todo lo que la action ` +
      "deja en ese directorio es oculto (.projects/, .cursor/), asi que el artifact sale vacio y la salida de " +
      "emergencia del bump (ADR 005) no existe",
  );
  assert.equal(
    paso.con["if-no-files-found"],
    "error",
    `${paso.archivo}:${paso.linea} sube constitucion-al-dia con if-no-files-found: ${paso.con["if-no-files-found"]}. ` +
      "Un artifact prometido que no se sube es la salida que el mensaje de fallo promete y no existe: tiene que ser rojo",
  );
});

// El fixture minimo de un repo nacido del andamio: valores y la cadena de carga de
// la superficie de Claude Code. Es el mismo que usa el banco de la action.
const VALORES = {
  ORG: "Ejemplo-Org",
  PROYECTO: "people-ejemplo",
  BUILDER_1: "@builder-uno",
  BUILDER_2: "@builder-dos",
  PO: "@po-del-area",
  PAQUETE_API: "api",
  CANAL_ALERTAS: "#alertas-prod",
  REGION: "us-east-1",
  CUENTA_DEV: "111111111111",
  CUENTA_PROD: "222222222222",
  PERFIL_DEV: "perfil-dev",
  PERFIL_PROD: "perfil-prod",
  DOMINIO_DEV: "ejemplo-dev.ejemplo.com",
  DOMINIO_PROD: "ejemplo.ejemplo.com",
  PREFIJO_RECURSOS: "ejemplo",
};
const CADENA_SANA = {
  "CLAUDE.md": "# CLAUDE.md\n\nLas reglas viven en AGENTS.md.\n\n@AGENTS.md\n",
  "AGENTS.md": "# AGENTS.md\n\nLo propio del proyecto.\n\n@.projects/AGENTS-marco.md\n",
};

function archivosBajo(dir, base = dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const completa = path.join(dir, e.name);
    return e.isDirectory() ? archivosBajo(completa, base) : [path.relative(base, completa).replace(/\\/g, "/")];
  });
}

test("en una corrida VERDE el directorio que se sube no queda vacio, y todo lo que trae es oculto", () => {
  const raiz = fs.mkdtempSync(path.join(os.tmpdir(), "projects-al-dia-"));
  const salida = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "projects-al-dia-salida-")), "salida");
  try {
    fs.writeFileSync(path.join(raiz, ".projects-valores.json"), JSON.stringify(VALORES), "utf8");
    for (const [ruta, contenido] of Object.entries(CADENA_SANA)) fs.writeFileSync(path.join(raiz, ruta), contenido, "utf8");
    const entorno = { ...process.env, CONSTITUCION_RAIZ: raiz, GITHUB_OUTPUT: "", GITHUB_STEP_SUMMARY: "" };

    const escritura = spawnSync(process.execPath, [SCRIPT], { encoding: "utf8", env: { ...entorno, CONSTITUCION_MODO: "escribir" } });
    assert.equal(escritura.status, 0, escritura.stdout + escritura.stderr);

    const verificacion = spawnSync(process.execPath, [SCRIPT], {
      encoding: "utf8",
      env: { ...entorno, CONSTITUCION_SALIDA_CORREGIDA: salida },
    });
    assert.equal(verificacion.status, 0, `el repo recien escrito tenia que verificar en verde:\n${verificacion.stdout}${verificacion.stderr}`);

    const subidos = archivosBajo(salida);
    assert.ok(
      subidos.length > 0,
      "en una corrida verde la action no dejo nada en el directorio que se sube: con if-no-files-found: error, " +
        "ese verde se volveria rojo. O la action cambio y ya no escribe siempre, o el paso tiene que volver a warn",
    );
    const visibles = subidos.filter((r) => !r.split("/").some((parte) => parte.startsWith(".")));
    assert.deepEqual(
      visibles,
      [],
      "hay artefactos que NO cuelgan de un directorio oculto: la premisa de include-hidden-files cambio y conviene releer el paso",
    );
  } finally {
    fs.rmSync(raiz, { recursive: true, force: true });
    fs.rmSync(path.dirname(salida), { recursive: true, force: true });
  }
});
