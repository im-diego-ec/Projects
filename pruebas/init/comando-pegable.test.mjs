import test, { after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { citarRuta, lineasDelPasoQueSigue } from "../../herramientas/projects-init.mjs";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const HERRAMIENTA = path.join(RAIZ, "herramientas", "projects-init.mjs");

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

/** Parte una linea de comando en argumentos, respetando las comillas dobles.
 *
 *  POR QUE NO ALCANZA UNA REGEX SOBRE LA LINEA ENTERA. La primera version de este
 *  banco cruzaba un patron contra toda la linea y estaba INVERTIDO: daba rojo sobre
 *  una linea correcta sin espacios --la de CI, /home/runner/work/...-- y verde sobre
 *  el defecto real --una ruta de Windows con espacio y sin comillas--. Pasaba solo
 *  porque el clon de esta maquina vive en "No Coders": al vaciar las comillas no
 *  quedaba ninguna barra que matchear. En CI habria puesto rojo las tres patas.
 *
 *  Lo correcto es decidir POR ARGUMENTO: si el valor lleva un espacio, tuvo que
 *  viajar entrecomillado. Eso no depende de como sea el resto de la linea.
 *
 *  LO QUE ESTE BANCO NO MIDE, declarado: cubre los TRES sitios que emite
 *  `lineasDelPasoQueSigue`. Los otros DOS de `citarRuta` viven en `main()` --el
 *  comando `--ejemplo` y el de `projects-versiones`-- y ninguna prueba los ejercita:
 *  mutados a ruta desnuda, este archivo sigue en verde. Esta escrito en el tasks.md
 *  del change con su destino, para que el numero "cinco" no se lea como "cinco
 *  medidos". */
export function argumentosDe(linea) {
  const args = [];
  const re = /"((?:[^"\\]|\\.)*)"|(\S+)/g;
  for (const m of linea.trim().matchAll(re)) {
    if (m[1] !== undefined) args.push({ valor: m[1].replace(/\\"/g, '"'), entrecomillado: true });
    else args.push({ valor: m[2], entrecomillado: false });
  }
  return args;
}

test("MEDIDO: con el clon en una ruta con espacio, ningun argumento viaja desnudo", () => {
  // El clon de juguete lleva un espacio A PROPOSITO, y la funcion deriva de el la
  // ruta a la herramienta. Antes esa ruta salia de `import.meta.url`, o sea de la
  // maquina de quien corre el banco: en CI --sin espacios-- este caso no ejercitaba
  // nada, y aca pasaba de casualidad.
  const base = carpeta("con espacio-");
  const clon = path.join(base, "Projects");
  fs.mkdirSync(clon);
  const valores = path.join(clon, "valores.json");
  fs.writeFileSync(valores, "{}");

  const texto = lineasDelPasoQueSigue(valores, "mi-proyecto", clon).join("\n");
  assert.match(texto, /mkdir -p /, "la salida no trae el comando esperado: la guarda quedaria mirando al vacio");

  // IDA Y VUELTA: las rutas que la funcion recibio tienen que volver como UN
  // argumento cada una. Es la unica forma de cazar el defecto: sin comillas, una
  // ruta con espacio no produce un token con espacio, produce DOS tokens.
  const esperadas = [clon, valores, path.join(path.dirname(clon), "mi-proyecto")];
  const perdidas = [];
  for (const linea of texto.split("\n")) {
    if (!/^\s*(node|mkdir)\s/.test(linea)) continue;
    const args = argumentosDe(linea).map((a) => a.valor);
    for (const ruta of esperadas) {
      if (!linea.includes(ruta)) continue; // esa linea no la nombra
      if (!args.some((a) => a === ruta || a === path.join(ruta, "herramientas", "projects-init.mjs"))) {
        perdidas.push(`${linea.trim()}  ->  se partio: ${ruta}`);
      }
    }
  }
  assert.deepEqual(perdidas, [], "estas rutas viajan sin comillas y la shell las parte en dos, asi que el comando no se puede pegar:\n  " + perdidas.join("\n  "));
});

test("MUERDE: una ruta con espacio SIN comillas se parte en dos, y el ida y vuelta lo ve", () => {
  // POR QUE NO ALCANZA CON "ningun token tiene espacios". Una ruta con espacio y sin
  // comillas NO produce un token con espacio: produce DOS tokens. Es indistinguible
  // de dos argumentos, y ese es exactamente el fondo del bug --la shell tampoco los
  // distingue--. Por eso la comprobacion es de IDA Y VUELTA: cada ruta que entro
  // tiene que salir como UN SOLO argumento.
  const conEspacio = String.raw`C:\Users\Mis Documentos\v.json`;

  const bien = `node x.mjs --valores ${citarRuta(conEspacio)}`;
  assert.ok(
    argumentosDe(bien).some((a) => a.valor === conEspacio),
    "la ruta entrecomillada tiene que volver entera",
  );

  const mal = `node x.mjs --valores ${conEspacio}`;
  assert.ok(
    !argumentosDe(mal).some((a) => a.valor === conEspacio),
    "una ruta con espacio SIN comillas no puede volver entera: si vuelve, el predicado no distingue nada",
  );
  assert.equal(argumentosDe(mal).length, argumentosDe(bien).length + 1, "sin comillas la ruta tiene que partirse en dos argumentos");
});

test("MUERDE de punta a punta: el comando que imprime se EJECUTA y arma el proyecto", () => {
  // El caso anterior media `mkdir -p`, y era vacuo: `mkdir -p a b` sin comillas crea
  // DOS carpetas y sale 0, asi que la mutacion no lo ponia rojo. El unico comando de
  // la lista que de verdad falla sin comillas es el `node ... --valores ... --destino`,
  // porque node recibe una ruta cortada en el primer espacio.
  const base = carpeta("pegable real-");
  const clon = path.join(base, "Projects");
  fs.mkdirSync(clon);
  fs.cpSync(path.join(RAIZ, "herramientas"), path.join(clon, "herramientas"), { recursive: true });
  fs.cpSync(path.join(RAIZ, "plantilla"), path.join(clon, "plantilla"), { recursive: true });
  fs.cpSync(path.join(RAIZ, ".github"), path.join(clon, ".github"), { recursive: true });
  const valores = path.join(clon, "valores.json");
  fs.writeFileSync(valores, execFileSync(process.execPath, [HERRAMIENTA, "--ejemplo"], { encoding: "utf8" }));

  const texto = lineasDelPasoQueSigue(valores, "mi-proyecto", clon).join("\n");
  const lineaNode = texto.split("\n").find((l) => /^\s*node\s/.test(l));
  assert.ok(lineaNode, "no se encontro la linea del node");

  const args = argumentosDe(lineaNode).map((a) => a.valor);
  const destino = args[args.indexOf("--destino") + 1];
  fs.mkdirSync(destino, { recursive: true });

  const r = spawnSync(process.execPath, [...args.slice(1), "--sin-arranque", "--sin-herramientas"], { encoding: "utf8" });
  assert.equal(r.status, 0, `el comando que la herramienta imprime no arma el proyecto:\n  ${lineaNode.trim()}\n${(r.stderr ?? "").slice(-600)}`);
  assert.ok(fs.existsSync(path.join(destino, "package.json")), "salio 0 y no dejo un proyecto");
});

test("citarRuta · las rutas que la blocklist dejaba pasar ahora se entrecomillan", () => {
  // La primera version enumeraba caracteres peligrosos y se le escapaban seis. Una
  // lista de peligros siempre esta incompleta, y una incompleta es PEOR que ninguna
  // porque parece que cubre. Estas son las que salian desnudas.
  for (const ruta of [
    String.raw`/Users/d/Proyectos (2026)/p`,
    String.raw`/Users/d/notas #1/p`,
    String.raw`/Users/d/a{b}/p`,
    String.raw`/Users/d/a,b/p`,
    String.raw`/Users/d/100%/p`,
    String.raw`/Users/d/hola!/p`,
  ]) {
    assert.equal(citarRuta(ruta), `"${ruta}"`, `esta ruta sale desnuda y rompe el comando: ${ruta}`);
  }
});

test("citarRuta · una ruta normal de las tres plataformas sigue viajando sin comillas", () => {
  // La allowlist no puede ser tan estrecha que entrecomille todo: eso haria ruidosa
  // la salida en el caso comun y cambiaria cada ejemplo de la documentacion.
  for (const ruta of ["/home/runner/work/Projects/Projects", String.raw`C:\Users\dev\p`, "./relativa/x.mjs", "/a-b_c.1/d"]) {
    assert.equal(citarRuta(ruta), ruta, `esta ruta no necesita comillas y se entrecomillo: ${ruta}`);
  }
});
