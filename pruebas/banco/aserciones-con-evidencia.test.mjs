// Banco de `pruebas/aserciones-con-evidencia.mjs` y de `pruebas/porque.mjs`.
//
// DE DONDE VIENE. Es el banco de Rigel (commit d71c40c, issue #491 de alla) portado, con un
// grupo mas —el 6— que el porte tuvo que agregar: medida contra el AST de un parser de verdad
// sobre el arbol de Projects, la herramienta tal cual contaba 246 aserciones ciegas donde hay 285.
// Las 39 que no veia venian despues de una regex con una comilla adentro.
//
// LO QUE CUIDA, y por que cada grupo existe:
//
//   1. QUE CACE EL DEFECTO REAL: un mensaje que es cadena literal tapa el input.
//   2. QUE NO SOBRECUENTE. Un mensaje INTERPOLADO trae la evidencia, asi que no es el defecto — y
//      contarlo inflaria la deuda publicada.
//   3. QUE EL PARSEO AGUANTE, porque el tercer argumento se encuentra partiendo por comas y un
//      regex o un objeto traen comas adentro.
//   4. EL ARBOL REAL y el compositor.
//   5. LOS DOS DEFECTOS QUE LA HERRAMIENTA TUVO EN RIGEL, cada uno con su caso.
//   6. EL QUE TUVO EN EL PORTE: las regex con comillas.
//   7. LA HERRAMIENTA COMO LA CORRE EL CI: modo diff, codigo de salida y la linea anotada.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  ciegasEn,
  argumentos,
  CIEGO,
  censar,
  bancos,
  sinCadenas,
  ejecutar,
} from "../aserciones-con-evidencia.mjs";
import { porque, TOPE } from "../porque.mjs";

const temporales = [];
function arbolDeJuguete(archivos) {
  const raiz = fs.mkdtempSync(path.join(os.tmpdir(), "aserciones-"));
  temporales.push(raiz);
  for (const [rel, contenido] of Object.entries(archivos)) {
    const destino = path.join(raiz, rel);
    fs.mkdirSync(path.dirname(destino), { recursive: true });
    fs.writeFileSync(destino, contenido);
  }
  return raiz;
}
test.after(() => {
  for (const t of temporales) fs.rmSync(t, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// 1. EL DEFECTO
// ---------------------------------------------------------------------------

test("caza un mensaje que es cadena literal", () => {
  const h = ciegasEn(`assert.match(salida, /x/, "el paso tenia que decir X");`);
  assert.equal(h.length, 1, porque("no vio la asercion ciega", JSON.stringify(h)));
  assert.equal(h[0].linea, 1);
});

test("caza las dos formas, `match` y `doesNotMatch`", () => {
  assert.equal(ciegasEn(`assert.doesNotMatch(s, /x/, 'no tenia que estar');`).length, 1);
});

test("las comillas invertidas SIN interpolar tambien tapan", () => {
  assert.equal(ciegasEn("assert.match(s, /x/, `un mensaje sin nada adentro`);").length, 1);
});

// ---------------------------------------------------------------------------
// 2. LO QUE NO ES EL DEFECTO — el grupo que impide el sobreconteo
// ---------------------------------------------------------------------------

test("un mensaje INTERPOLADO no es el defecto: trae la evidencia", () => {
  assert.deepEqual(ciegasEn("assert.match(s, /x/, `no aparecio: ${JSON.stringify(s)}`);"), []);
});

test("una concatenacion tampoco", () => {
  assert.deepEqual(ciegasEn(`assert.match(s, /x/, "no aparecio: " + s);`), []);
});

test("envuelto en `porque(...)` tampoco — es el arreglo", () => {
  assert.deepEqual(ciegasEn(`assert.match(s, /x/, porque("el motivo", s));`), []);
});

test("un identificador como mensaje tampoco: es la evidencia misma", () => {
  // La forma mas comun del arbol: `assert.match(salida, /x/, salida)`. Imprime el input entero.
  assert.deepEqual(ciegasEn(`assert.match(salida, /x/, salida);`), []);
});

test("SIN tercer argumento no es el defecto: Node ya imprime el input", () => {
  assert.deepEqual(ciegasEn(`assert.match(salida, /x/);`), []);
});

test("otros asserts no se miran: solo `match` y `doesNotMatch` pierden el input", () => {
  // `assert.equal` y `assert.ok` imprimen sus valores con o sin mensaje, asi que un mensaje
  // ahi NO tapa nada. Contarlos seria exigir un arreglo donde no hay defecto.
  assert.deepEqual(ciegasEn(`assert.equal(a, b, "distintos"); assert.ok(x, "falso");`), []);
});

// ---------------------------------------------------------------------------
// 3. EL PARSEO
// ---------------------------------------------------------------------------

test("una coma DENTRO del regex no parte los argumentos", () => {
  const fuente = `assert.match(s, /a{2,4}/, "con llaves y coma adentro");`;
  assert.equal(ciegasEn(fuente).length, 1, porque("la coma del cuantificador partio el argumento", fuente));
});

test("una coma dentro de un objeto o una llamada tampoco", () => {
  assert.equal(ciegasEn(`assert.match(f(a, b), /x/, "con llamada adentro");`).length, 1);
  assert.equal(ciegasEn(`assert.match(s, new RegExp(a, "i"), "con RegExp de dos args");`).length, 1);
});

test("`argumentos` devuelve las piezas de nivel cero, sin recortar de mas", () => {
  // Recibe el blanqueado —de donde saca la ESTRUCTURA— y el fuente —de donde saca el
  // CONTENIDO—. Los dos, porque partir por comas sobre el fuente parte los mensajes.
  const t = `assert.match(f(a, b), /x/, "m");`;
  assert.deepEqual(argumentos(sinCadenas(t), t, t.indexOf("(")), ["f(a, b)", "/x/", '"m"']);
});

test("varias aserciones en el mismo archivo se cuentan todas, con su linea", () => {
  const h = ciegasEn(['assert.match(a, /x/, "uno");', "", 'assert.doesNotMatch(b, /y/, "dos");'].join("\n"));
  assert.deepEqual(
    h.map((x) => x.linea),
    [1, 3],
  );
});

test("una asercion partida en varias lineas se cuenta en la linea donde empieza", () => {
  const fuente = ["test(\"x\", () => {", "  assert.match(", "    salida,", "    /x/,", '    "ciego",', "  );", "});"].join(
    "\n",
  );
  assert.deepEqual(
    ciegasEn(fuente).map((x) => x.linea),
    [2],
    porque("la linea del hallazgo no es la de la llamada", fuente),
  );
});

test("CIEGO no confunde una cadena con `${` adentro", () => {
  assert.equal(CIEGO.test("`hay ${algo} adentro`"), false);
  assert.equal(CIEGO.test("`sin nada`"), true);
});

test("un escape dentro de una cadena no deja estructura a la vista", () => {
  // `\(` es un escape inutil pero valido, y la version de Rigel dejaba el par a la vista en el
  // blanqueado: un parentesis suelto descuadraba la profundidad y la llamada no cerraba donde
  // cerraba de verdad.
  const fuente = 'assert.match(s, /x/, "abre \\( y no cierra");';
  assert.equal(ciegasEn(fuente).length, 1, porque("el escape dejo un parentesis en la estructura", fuente));
});

// ---------------------------------------------------------------------------
// 4. EL ARBOL REAL, y el compositor
// ---------------------------------------------------------------------------

test("el arbol real: hay bancos que mirar — un cero aca seria el lector roto", () => {
  const n = bancos().length;
  assert.ok(n > 50, `solo encontre ${n} bancos`);
});

test("la deuda del arbol se puede medir, y es el numero que se publica", () => {
  const c = censar();
  assert.ok(c.total > 0, "la deuda dio cero: o se pago entera, o el lector dejo de ver");
  assert.ok(c.porArchivo.size > 0);
});

test("`porque` devuelve el motivo Y la evidencia", () => {
  const m = porque("el motivo", "la salida del paso");
  assert.match(m, /el motivo/);
  assert.match(m, /la salida del paso/);
});

test("`porque` recorta por el FINAL y lo DICE", () => {
  // El veredicto de un paso esta al final: recortar por el principio tiraria justo lo que se
  // busca. Y un texto cortado en silencio se lee como el texto completo.
  const largo = "a".repeat(TOPE + 500) + "EL-VEREDICTO";
  const m = porque("x", largo);
  assert.match(m, /EL-VEREDICTO/, porque("recorto el final, que es donde esta el veredicto", m));
  assert.match(m, /recortado, \d+ caracteres/, porque("recorto en silencio", m.slice(0, 200)));
});

test("`porque` acepta algo que no es cadena sin romperse", () => {
  assert.match(porque("x", { a: 1 }), /"a": 1/);
  assert.match(porque("x", undefined), /undefined/);
});

// ---------------------------------------------------------------------------
// 5. LOS DOS DEFECTOS QUE LA HERRAMIENTA TUVO EN RIGEL, cada uno con su caso.
// ---------------------------------------------------------------------------

test("FALSO POSITIVO: una asercion escrita DENTRO de una cadena no es una asercion", () => {
  // La primera version escaneaba el fuente crudo. Sobre su propio banco —lleno de fixtures que
  // SON aserciones escritas como texto— dio nueve hallazgos y ocho eran fixtures.
  const fuente = [
    'const fixture = `assert.match(a, /b/, "soy texto");`;',
    "const x = \"assert.match(c, /d/, 'yo tambien');\";",
  ].join("\n");
  assert.deepEqual(ciegasEn(fuente), [], porque("conto fixtures como aserciones", fuente));
});

test("y un comentario que muestra el defecto tampoco cuenta", () => {
  const fuente = '// mal: assert.match(s, /x/, "un mensaje ciego")\nassert.match(s, /x/, porque("bien", s));';
  assert.deepEqual(ciegasEn(fuente), [], porque("conto el ejemplo del comentario", fuente));
});

test("FALSO NEGATIVO: un mensaje ciego CON UNA COMA adentro se escapaba", () => {
  // `argumentos` partia por comas sin mirar comillas, asi que el tercer argumento quedaba
  // `"el motivo` —sin cerrar— y `CIEGO` lo rechazaba.
  const fuente = 'assert.match(m, /X/, "el motivo, con una coma adentro");';
  const h = ciegasEn(fuente);
  assert.equal(h.length, 1, porque("se escapo por la coma del mensaje", fuente));
  assert.equal(h[0].mensaje, '"el motivo, con una coma adentro"', porque("el mensaje quedo partido", JSON.stringify(h)));
});

test("la estructura se lee del blanqueado y el contenido del fuente", () => {
  // La propiedad que hace posible lo de arriba: los offsets de `sinCadenas` coinciden con los
  // del original, asi que se puede partir por uno y recortar del otro.
  const fuente = 'assert.match(a, /x/, "uno, dos");\nconst r = /"/;\nassert.match(b, /y/, "tres");';
  assert.equal(sinCadenas(fuente).length, fuente.length, porque("el blanqueado corrio los offsets", fuente));
  assert.equal(
    sinCadenas(fuente).split("\n").length,
    fuente.split("\n").length,
    porque("el blanqueado se comio saltos de linea", fuente),
  );
});

// ---------------------------------------------------------------------------
// 6. EL DEFECTO QUE ENCONTRO EL PORTE: una regex con comillas abria una cadena falsa.
//
// Medido el 2026-09-17 contra el AST de acorn sobre los 106 bancos de Projects: la herramienta
// de Rigel contaba 246 y el AST 285. Las 39 que faltaban venian despues de una regex como
// `/\["api", "user"\]/` o `/EXCEPCIONES: "/`, cuya comilla el blanqueado tomaba por el
// principio de una cadena que se comia el codigo hasta la comilla siguiente. Con los literales de
// regex reconocidos, las dos cuentas coinciden linea por linea.
// ---------------------------------------------------------------------------

test("FALSO NEGATIVO: una regex con una comilla no se come la asercion que sigue", () => {
  const fuente = [
    'assert.match(crudo, /EXCEPCIONES: "\\{\\{X\\}\\}/, "y declarando excepciones");',
    'assert.match(podado, /otra/, "la que la version de Rigel no veia");',
  ].join("\n");
  assert.deepEqual(
    ciegasEn(fuente).map((h) => h.linea),
    [1, 2],
    porque("una comilla dentro de una regex abrio una cadena falsa", sinCadenas(fuente)),
  );
});

test("una regex con una comilla SIMPLE o una comilla invertida tampoco", () => {
  const fuente = ["const r = /it's/;", "const q = /`x`/;", 'assert.match(s, /x/, "ciega");'].join("\n");
  assert.equal(ciegasEn(fuente).length, 1, porque("la regex abrio una cadena falsa", sinCadenas(fuente)));
});

test("una coma o un parentesis DENTRO de la regex no mueven los argumentos", () => {
  // Blanquear el contenido de la regex, y no solo saltarla, es lo que arregla esto: `/a,b/` dejaba
  // una coma de nivel cero y el mensaje pasaba a ser el CUARTO argumento.
  assert.equal(ciegasEn('assert.match(s, /a,b/, "coma suelta en la regex");').length, 1);
  assert.equal(ciegasEn('assert.match(s, /[(]/, "parentesis en una clase");').length, 1);
  assert.equal(ciegasEn('assert.match(s, /\\)/, "parentesis escapado");').length, 1);
});

test("una division NO es una regex: no se blanquea lo que sigue", () => {
  // La otra direccion del mismo lexer. Si `a / b` abriera una regex, se blanquearia hasta la
  // siguiente barra y la asercion de esa linea desapareceria.
  const fuente = ['const n = total / partes; const m = (a + b) / 2;', 'assert.match(s, /x/, "ciega");'].join("\n");
  assert.equal(ciegasEn(fuente).length, 1, porque("tomo una division por una regex", sinCadenas(fuente)));
});

test("una regex despues de `return` o de un operador se reconoce", () => {
  const fuente = [
    'function f(s) { return /"/.test(s); }',
    'const ok = x && /"/.test(y);',
    'assert.match(s, /x/, "ciega");',
  ].join("\n");
  assert.equal(ciegasEn(fuente).length, 1, porque("no reconocio la regex por su contexto", sinCadenas(fuente)));
});

// ---------------------------------------------------------------------------
// 7. LA HERRAMIENTA COMO LA CORRE EL CI (job `aserciones-con-evidencia` de ci.yml)
// ---------------------------------------------------------------------------

test("modo diff: un banco tocado con una asercion ciega sale 1 y anota archivo y linea", () => {
  const raiz = arbolDeJuguete({
    "pruebas/a/malo.test.mjs": '\n\nassert.match(s, /x/, "ciega");\n',
    "pruebas/a/bueno.test.mjs": 'assert.match(s, /x/, porque("bien", s));\n',
  });
  const r = ejecutar(["pruebas/a/malo.test.mjs"], raiz);
  assert.equal(r.codigo, 1, porque("el banco tocado con una ciega no puso rojo", r));
  assert.ok(
    r.errores.some((l) => l.startsWith("::error file=pruebas/a/malo.test.mjs,line=3::")),
    porque("el rojo no anota el archivo y la linea", r.errores),
  );
  assert.ok(
    r.errores.some((l) => l.includes("pruebas/porque.mjs")),
    porque("el rojo no trae el arreglo escrito", r.errores),
  );
});

test("modo diff: un banco tocado y limpio sale 0, aunque el arbol tenga deuda", () => {
  // Es la decision de la pieza: la deuda del arbol se publica y NO pone rojo.
  const raiz = arbolDeJuguete({
    "pruebas/a/malo.test.mjs": 'assert.match(s, /x/, "ciega");\n',
    "pruebas/a/bueno.test.mjs": 'assert.match(s, /x/, porque("bien", s));\n',
  });
  const r = ejecutar(["pruebas/a/bueno.test.mjs"], raiz);
  assert.equal(r.codigo, 0, porque("la deuda de un archivo NO tocado puso rojo", r));
  assert.ok(
    r.salida.some((l) => /deuda del arbol: 1 /.test(l)),
    porque("la deuda del arbol no se publico", r.salida),
  );
});

test("modo diff: un banco BORRADO por el PR y un archivo que no es banco se saltean", () => {
  // Los dos llegan en la lista del `git diff`: el borrado ya no existe, y el diff trae cualquier
  // archivo. Ninguno de los dos puede tirar la herramienta ni contarse.
  const raiz = arbolDeJuguete({ "pruebas/a/bueno.test.mjs": "assert.ok(true);\n", "pruebas/a/ayuda.mjs": 'assert.match(s, /x/, "no es banco");\n' });
  const r = ejecutar(["pruebas/a/borrado.test.mjs", "pruebas/a/ayuda.mjs", "pruebas/a/bueno.test.mjs"], raiz);
  assert.equal(r.codigo, 0, porque("un borrado o un no-banco rompio la herramienta", r));
});

test("sin argumentos se censa el arbol y sale 0: la deuda es informacion, no un rojo", () => {
  const raiz = arbolDeJuguete({ "pruebas/a/malo.test.mjs": 'assert.match(s, /x/, "ciega");\n' });
  const r = ejecutar([], raiz);
  assert.equal(r.codigo, 0, porque("el censo del arbol puso rojo", r));
  assert.ok(
    r.salida.some((l) => l.includes("pruebas/a/malo.test.mjs")),
    porque("el censo no lista donde esta la deuda", r.salida),
  );
});
