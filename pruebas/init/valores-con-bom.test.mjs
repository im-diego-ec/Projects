// EL ARCHIVO DE VALORES SE LEE AUNQUE EL SHELL LE HAYA PUESTO UNA BOM.
//
// QUE DEFECTO CIERRA, medido el 2026-09-18 sobre esta misma herramienta: el
// esqueleto que imprime `--ejemplo`, con los tres bytes EF BB BF adelante —lo que
// deja `>` o `Out-File -Encoding utf8` en Windows PowerShell—, hacia salir a
// `projects init` con 1 y
//
//     ::error::no pude leer valores.json: Unexpected token '﻿', "﻿{ ... is not valid JSON
//
// El archivo se ve perfecto en cualquier editor, el comando que lo escribio no dio
// ningun error, y el mensaje se lee como si la persona lo hubiera llenado mal. Con
// UTF-16 LE —lo que escribe `>` en Windows PowerShell 5.1— pasaba lo mismo.
//
// ORIGEN: Rigel 1.14.0, change archivado `2026-09-01-arranque-ejecutable`, commit
// d7e5e63 (el T1 de su adopcion del 2026-08-24). Lo que Rigel aprendio en su
// tercera vuelta, y por eso este banco NO comprueba "UTF-16": su primer arreglo fue
// pedirle a la guia un `file valores.json` que "tiene que decir UTF-8", y el mismo
// `>` produjo UTF-8 CON BOM, `file` dijo UTF-8 y la herramienta igual salio 1.
// Verificaba el valor que se habia visto una vez en vez de la PROPIEDAD. La
// propiedad es esta: las tres BOM que un shell de Windows puede poner se leen, y un
// JSON realmente roto sigue fallando con su error.
//
// Corre en la matriz de pruebas-init (ubuntu, windows y macos): nada de este banco
// depende del shell, solo de bytes y de `process.execPath`.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { leerValores } from "../../herramientas/projects-init.mjs";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const HERRAMIENTA = path.join(RAIZ, "herramientas", "projects-init.mjs");

const OBJETO = { PROYECTO: "un-proyecto", ORG: "una-cuenta" };
const JSON_TEXTO = JSON.stringify(OBJETO, null, 2);

function conBytes(prefijo, cuerpo) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "projects-bom-"));
  const ruta = path.join(dir, "valores.json");
  fs.writeFileSync(ruta, Buffer.concat([prefijo, cuerpo]));
  return ruta;
}

const limpiar = (ruta) => fs.rmSync(path.dirname(ruta), { recursive: true, force: true });

const CASOS = [
  {
    nombre: "UTF-8 pelado — lo que escribe un shell POSIX y `Set-Content -Encoding utf8` en pwsh 7",
    prefijo: Buffer.from([]),
    cuerpo: Buffer.from(JSON_TEXTO, "utf8"),
  },
  {
    nombre: "UTF-8 con BOM — lo que deja `Out-File -Encoding utf8` en Windows PowerShell",
    prefijo: Buffer.from([0xef, 0xbb, 0xbf]),
    cuerpo: Buffer.from(JSON_TEXTO, "utf8"),
  },
  {
    nombre: "UTF-16 LE con BOM — lo que escribe `>` en Windows PowerShell 5.1",
    prefijo: Buffer.from([0xff, 0xfe]),
    cuerpo: Buffer.from(JSON_TEXTO, "utf16le"),
  },
  {
    nombre: "UTF-16 BE con BOM — la que todavia no aparecio, y por eso se cubre ahora",
    prefijo: Buffer.from([0xfe, 0xff]),
    cuerpo: Buffer.from(JSON_TEXTO, "utf16le").swap16(),
  },
];

for (const c of CASOS) {
  test(`leerValores lee: ${c.nombre}`, () => {
    const ruta = conBytes(c.prefijo, c.cuerpo);
    try {
      assert.deepEqual(leerValores(ruta), OBJETO);
    } finally {
      limpiar(ruta);
    }
  });
}

test("un JSON REALMENTE roto sigue fallando, y con el error de sintaxis original", () => {
  // El control que hace creible a lo de arriba: si la tolerancia se hubiera escrito
  // como "sacale los bytes raros del principio y segui", la herramienta se volveria
  // silenciosa justo donde su unico trabajo es fallar cerrado.
  const ruta = conBytes(Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from('{ "PROYECTO": ', "utf8"));
  try {
    assert.throws(() => leerValores(ruta), SyntaxError);
  } finally {
    limpiar(ruta);
  }
});

test("la BOM se SACA, no se decodifica y se deja pegada a la primera clave", () => {
  // El modo sutil de arreglarlo mal: decodificar y dejar el U+FEFF adentro del
  // texto. Si el parser lo tolerara, la primera clave quedaria llamandose
  // "﻿PROYECTO", que no calza con ningun REQUERIDO: la herramienta diria
  // `falta PROYECTO` con PROYECTO ahi escrito.
  const ruta = conBytes(Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from(JSON_TEXTO, "utf8"));
  try {
    const claves = Object.keys(leerValores(ruta));
    assert.ok(claves.includes("PROYECTO"), `las claves quedaron: ${claves.join(", ")}`);
    assert.ok(!claves.some((k) => k.charCodeAt(0) === 0xfeff), "una clave empieza con U+FEFF: la BOM se decodifico en vez de sacarse");
  } finally {
    limpiar(ruta);
  }
});

// DE PUNTA A PUNTA, con el esqueleto real y la herramienta real. `--vista-previa`
// lee y valida el archivo exactamente como la corrida que escribe —es el mismo
// camino de main()— y sale 0 sin tocar el destino, asi que alcanza para ver el rojo
// de antes sin instanciar el andamio entero.
//
// ROJO MEDIDO antes del arreglo, con estos mismos tres archivos: el pelado salia 0,
// el de BOM UTF-8 salia 1 y el de UTF-16 LE salia 1, los dos con
// `::error::no pude leer ...: Unexpected token`.
test("projects init acepta el esqueleto de --ejemplo escrito con BOM, de punta a punta", () => {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), "projects-bom-cli-"));
  try {
    const ejemplo = spawnSync(process.execPath, [HERRAMIENTA, "--ejemplo"], { encoding: "utf8" });
    assert.equal(ejemplo.status, 0, ejemplo.stderr);
    const destino = path.join(base, "destino");
    fs.mkdirSync(destino);
    const variantes = {
      "utf8-con-bom": Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from(ejemplo.stdout, "utf8")]),
      "utf16le-con-bom": Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from(ejemplo.stdout, "utf16le")]),
    };
    for (const [nombre, bytes] of Object.entries(variantes)) {
      const ruta = path.join(base, `${nombre}.json`);
      fs.writeFileSync(ruta, bytes);
      const r = spawnSync(process.execPath, [HERRAMIENTA, "--valores", ruta, "--destino", destino, "--vista-previa"], { encoding: "utf8" });
      const salida = `${r.stdout ?? ""}${r.stderr ?? ""}`;
      assert.equal(r.status, 0, `${nombre}: salio ${r.status}\n${salida.slice(-600)}`);
      assert.doesNotMatch(salida, /no pude leer/, `${nombre}: la herramienta sigue sin poder leer el archivo`);
    }
    assert.deepEqual(fs.readdirSync(destino), [], "la vista previa escribio en el destino");
  } finally {
    fs.rmSync(base, { recursive: true, force: true });
  }
});
