// Banco del paso "Scripts de verificacion sin enmascaramiento" del job higiene.
//
// POR QUE ESTE PASO Y NO OTRO. De los pasos con `run:` propio de marco-ci.yml,
// este era el mas grande sin una sola asercion, y es el que decide si un `|| true`
// en el manifiesto de un consumidor pasa. Un defecto suyo no se ve: no rompe un
// pipeline, deja pasar el script que convierte un fallo en un verde — o sea que
// falla exactamente igual que la cosa que existe para cazar.
//
// El banco no COPIA el script: lo extrae del YAML y lo corre, igual que el resto
// del banco de los pasos inline. Y afirma por CODIGO DE SALIDA, no por texto del
// log; donde mira el mensaje es porque el mensaje ES la afirmacion (el paso
// promete entregar el cuerpo ya corregido, listo para pegar), y nunca es lo unico
// que sostiene el caso.
import test from "node:test";
import assert from "node:assert/strict";

import { scriptDelPaso } from "./extraer.mjs";
import { commit, correrBash, escribir, limpiarTodo, repoDeJuguete } from "./util.mjs";

const PASO = "Scripts de verificacion sin enmascaramiento";
const script = scriptDelPaso(PASO);

test.after(limpiarTodo);

/** Un repo de juguete con estos manifiestos ya rastreados. */
function repoCon(manifiestos) {
  const raiz = repoDeJuguete("enmascaramiento-");
  escribir(raiz, "README.md", "banco\n");
  for (const [ruta, contenido] of Object.entries(manifiestos)) {
    escribir(raiz, ruta, typeof contenido === "string" ? contenido : `${JSON.stringify(contenido, null, 2)}\n`);
  }
  commit(raiz, "estado inicial");
  return raiz;
}

/** El paso corrido sobre un repo con un solo manifiesto y estos scripts. */
function correrConScripts(scripts) {
  const raiz = repoCon({ "package.json": { name: "un-paquete", scripts } });
  return correrBash(script, { cwd: raiz });
}

test("enmascaramiento · el extractor encontro el paso y su programa", () => {
  // Si el paso se renombra o pierde su bloque, esto tira antes que cualquier
  // otro caso, en vez de dejar de probar en silencio.
  assert.ok(script.length > 1000, `el script salio de ${script.length} caracteres`);
  assert.match(script, /SIEMPRE_CERO/, "el programa tiene que seguir declarando su alfabeto de comandos que salen 0");
});

test("enmascaramiento · sin manifiestos rastreados lo dice en voz alta y no falla", () => {
  // Es el caso del propio marco: no tiene manifiestos de paquete. "No hay datos"
  // se dice, no se reporta como exito mudo.
  const { exit, salida } = correrBash(script, { cwd: repoCon({}) });
  assert.equal(exit, 0, salida);
  assert.match(salida, /::notice::no hay ningun package\.json rastreado/, salida);
});

test("enmascaramiento · un script sano pasa, y el paso declara que solo leyo la forma", () => {
  const { exit, salida } = correrConScripts({
    test: "vitest run",
    build: "tsc --noEmit && vite build",
    prepare: "true",
    saludo: "echo hola && echo chau",
  });
  assert.equal(exit, 0, salida);
  assert.match(
    salida,
    /NO prueba que el codigo de salida se propague/,
    "el verde tiene que seguir declarando lo que NO probo: es lectura de forma, no ejecucion",
  );
});

// ── Las formas de enmascaramiento que el paso enumera en su encabezado ──────
//
// El encabezado dice que el patron de sufijo anterior dejaba pasar "por lo menos
// cinco formas equivalentes". Cada una es un caso, porque cada una es una forma
// distinta de que un fallo llegue a CI como exito.
const FORMAS = [
  ["|| true", "eslint . || true"],
  ["|| :", "eslint . || :"],
  ["exit 0 al final", "eslint .; exit 0"],
  ["|| echo", 'eslint . || echo "sin problema"'],
  ["; echo", 'eslint .; echo "listo"'],
  ["| tee", "eslint . | tee salida.log"],
  ["comentario final que corre el ancla", "eslint . || true # ojo"],
  ["|| true && echo", 'eslint . || true && echo "ok"'],
];

for (const [forma, cuerpo] of FORMAS) {
  test(`enmascaramiento · "${forma}" es rojo, y el mensaje trae el cuerpo ya corregido`, () => {
    const { exit, salida } = correrConScripts({ verificar: cuerpo });
    assert.equal(exit, 1, `"${cuerpo}" salio ${exit} en vez de rojo:\n${salida}`);
    assert.match(salida, /::error file=package\.json,line=\d+::el script "verificar"/, salida);
    assert.match(
      salida,
      /Arreglo: en package\.json deja el cuerpo en "eslint \."/,
      `el mensaje tiene que traer el ARREGLO —el cuerpo sin la cola— y no solo el diagnostico:\n${salida}`,
    );
  });
}

test("enmascaramiento · un pipeline a un pass-through solo enmascara cuando RECIBE el pipe", () => {
  // "cat archivo" suelto puede fallar; "eslint . | cat" no. La distincion vive
  // en el programa y es la que evita marcar mitad de los scripts del mundo.
  const rojo = correrConScripts({ verificar: "eslint . | cat" });
  assert.equal(rojo.exit, 1, rojo.salida);
  const verde = correrConScripts({ leer: "cat CHANGELOG.md && eslint ." });
  assert.equal(verde.exit, 0, verde.salida);
});

test("enmascaramiento · un cuerpo sin ningun comando que pueda fallar no enmascara nada", () => {
  // "no hay nada que tapar" no es lo mismo que "esta tapado": marcar esto seria
  // el falso rojo que vuelve inutil al guardrail.
  const { exit, salida } = correrConScripts({ nota: 'echo uno; echo dos || true' });
  assert.equal(exit, 0, salida);
});

test("enmascaramiento · un && no enmascara: exige que los DOS salgan 0", () => {
  const { exit, salida } = correrConScripts({ verificar: "eslint . && echo listo" });
  assert.equal(exit, 0, salida);
});

test("enmascaramiento · LIMITE DECLARADO: un pipe final a un comando que no es pass-through no se marca", () => {
  // Esta a proposito y esta escrito en el encabezado del paso: decidir si "jq"
  // o "grep" pueden fallar exige conocerlos. El caso existe para que el limite
  // sea EXIGIBLE — el dia que alguien lo cierre, este caso se cae y se ve en el
  // diff, en vez de que el limite quede documentado y nadie sepa si sigue.
  const { exit, salida } = correrConScripts({ verificar: "eslint . | grep -c error" });
  assert.equal(exit, 0, `el limite declarado dejo de valer y hay que actualizar el encabezado del paso:\n${salida}`);
});

test("enmascaramiento · un manifiesto ilegible es rojo, nunca un verde mudo", () => {
  const raiz = repoCon({ "package.json": "{ esto no es json\n" });
  const { exit, salida } = correrBash(script, { cwd: raiz });
  assert.equal(exit, 1, salida);
  assert.match(salida, /no se pudo leer el manifiesto/, salida);
  assert.match(salida, /hasta que parsee/, "el mensaje tiene que traer el arreglo");
});

test("enmascaramiento · mira TODOS los manifiestos rastreados, no solo el de la raiz", () => {
  const raiz = repoCon({
    "package.json": { name: "raiz", private: true },
    "paquetes/web/package.json": { name: "web", scripts: { test: "vitest run" } },
    "paquetes/api/package.json": { name: "api", scripts: { test: "vitest run || true" } },
  });
  const { exit, salida } = correrBash(script, { cwd: raiz });
  assert.equal(exit, 1, salida);
  assert.match(salida, /::error file=paquetes\/api\/package\.json/, salida);
  assert.ok(
    !/::error file=paquetes\/web\/package\.json/.test(salida),
    `el paquete sano no puede salir marcado:\n${salida}`,
  );
});

test("enmascaramiento · un package.json NO rastreado no es contrato de nadie y no se mira", () => {
  // node_modules queda afuera por construccion y no por una exclusion que
  // alguien tenga que mantener: es la razon por la que se listan los archivos
  // con git ls-files en vez de recorrer el disco.
  const raiz = repoCon({ "package.json": { name: "raiz", scripts: { test: "vitest run" } } });
  escribir(raiz, "node_modules/algo/package.json", '{ "scripts": { "test": "x || true" } }\n');
  const { exit, salida } = correrBash(script, { cwd: raiz });
  assert.equal(exit, 0, salida);
});

test("enmascaramiento · la anotacion apunta a la linea de la declaracion", () => {
  const manifiesto = [
    "{",
    '  "name": "un-paquete",',
    '  "scripts": {',
    '    "build": "vite build",',
    '    "verificar": "eslint . || true"',
    "  }",
    "}",
    "",
  ].join("\n");
  const raiz = repoCon({ "package.json": manifiesto });
  const { salida } = correrBash(script, { cwd: raiz });
  assert.match(
    salida,
    /::error file=package\.json,line=5::/,
    `la anotacion tiene que caer sobre la linea de "verificar", que es la 5:\n${salida}`,
  );
});

test("enmascaramiento · el resumen dice cuantos hallazgos sobre cuantos manifiestos", () => {
  const { salida } = correrConScripts({ verificar: "eslint . || true" });
  assert.match(salida, /== resumen == 1 script\(s\) enmascarando su fallo y 0 manifiesto\(s\) ilegible\(s\), sobre 1 manifiesto\(s\)/, salida);
});
