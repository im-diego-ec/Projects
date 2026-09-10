import test, { after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

import { citarRuta, lineasDelPasoQueSigue } from "../../herramientas/projects-init.mjs";

// ---------------------------------------------------------------------------
// EL COMANDO QUE LA HERRAMIENTA MANDA A PEGAR TIENE QUE PODER PEGARSE.
//
// QUE DEFECTO CIERRA. La herramienta existe para que quien no programa no
// transcriba nada: cuando no puede terminar sola, imprime el comando exacto. Ese
// comando se armaba interpolando rutas SIN comillas, asi que en cuanto una ruta
// tenia un espacio, el comando entregado NO CORRIA. La shell leia
// `node /Users/.../Personal/No` y fallaba con un mensaje que no menciona espacios
// ni comillas por ningun lado.
//
// Y ES EL CASO NORMAL. Las carpetas donde una persona no tecnica guarda sus cosas
// se llaman "Mis Documentos", "My Documents", "Google Drive", "No Coders". El
// propio clon de este marco vive en una ruta con espacio.
//
// POR QUE EL CI NO LO VEIA. GitHub hace checkout en /home/runner/work/..., sin
// espacios. El defecto solo se manifiesta en la maquina de un usuario, que es
// exactamente donde esta herramienta corre y donde nadie mira un pipeline.
// ---------------------------------------------------------------------------

const temporales = [];
after(() => {
  for (const d of temporales) fs.rmSync(d, { recursive: true, force: true });
});
function carpeta(prefijo) {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), prefijo));
  temporales.push(d);
  return d;
}

test("una ruta sin nada especial viaja tal cual", () => {
  // Envolver SIEMPRE haria ruidosa la salida en el caso normal, y cambiaria cada
  // linea de la documentacion que muestra un comando.
  assert.equal(citarRuta("/Users/x/Projects"), "/Users/x/Projects");
  assert.equal(citarRuta(String.raw`C:\Users\dev\p`), String.raw`C:\Users\dev\p`);
});

test("una ruta con espacio viaja entrecomillada", () => {
  assert.equal(citarRuta("/Users/x/No Coders/Projects"), '"/Users/x/No Coders/Projects"');
});

test("los backslashes de una ruta de Windows NO se tocan", () => {
  // Comillas DOBLES y no simples justamente por Windows: cmd no entiende las
  // simples. Y dentro de dobles, el backslash queda literal en cmd y en bash.
  assert.equal(citarRuta(String.raw`C:\Users\Mis Documentos\p`), String.raw`"C:\Users\Mis Documentos\p"`);
});

test("una comilla doble dentro de la ruta se escapa, en vez de romper la sintaxis", () => {
  assert.equal(citarRuta('/tmp/a"b'), '"/tmp/a\\"b"');
});

test("MEDIDO: con el clon en una ruta con espacio, ninguna ruta del comando viaja desnuda", () => {
  // Se mide sobre las lineas que la herramienta produce de verdad, no sobre el
  // texto del codigo: una prueba que leyera el `l.push` quedaria verde el dia que
  // alguien agregue un sexto sitio sin comillas.
  const base = carpeta("con espacio-");
  const clon = path.join(base, "Projects");
  fs.mkdirSync(clon);
  const valores = path.join(clon, "valores.json");
  fs.writeFileSync(valores, "{}");

  const texto = lineasDelPasoQueSigue(valores, "mi-proyecto", clon).join("\n");
  assert.match(texto, /mkdir -p /, "la salida no trae el comando esperado: la guarda quedaria mirando al vacio");

  // Toda linea que sea un comando: sus argumentos de ruta o no tienen espacios, o
  // estan entrecomillados. Un espacio desnudo es exactamente el defecto.
  for (const linea of texto.split("\n")) {
    if (!/^\s*(node|mkdir)\s/.test(linea)) continue;
    const sinCitas = linea.replace(/"[^"]*"/g, '""');
    assert.doesNotMatch(
      sinCitas,
      /\s\S*\s\S*\/|\/\S*\s/,
      `esta linea lleva una ruta con espacio sin entrecomillar, y no se puede pegar:\n  ${linea}`,
    );
  }
});

test("MUERDE: el comando extraido de esa salida se ejecuta de verdad", () => {
  // Anti-vacuidad de la de arriba: que las comillas esten no prueba que el
  // comando corra. Se extrae y se corre `mkdir -p` tal cual, en una shell.
  const base = carpeta("pegable real-");
  const clon = path.join(base, "Projects");
  fs.mkdirSync(clon);
  const valores = path.join(clon, "valores.json");
  fs.writeFileSync(valores, "{}");

  const texto = lineasDelPasoQueSigue(valores, "mi-proyecto", clon).join("\n");
  const linea = texto.split("\n").find((l) => /^\s*mkdir -p /.test(l));
  assert.ok(linea, "no se encontro la linea del mkdir");

  const r = spawnSync("/bin/sh", ["-c", linea.trim()], { encoding: "utf8" });
  assert.equal(r.status, 0, `el comando que la herramienta imprime no corre:\n  ${linea.trim()}\n  ${r.stderr}`);
});
