// Banco de tres compuertas de marco-ci.yml que NADIE HABIA VISTO FALLAR:
//
//   · Exigir OpenSpec en el repo
//   · El andamio reparte el umbral del total del marco
//   · Censo de fuentes cableado
//
// Figuraban como deuda declarada en `cobertura-de-los-pasos.test.mjs` —«no tiene ni una
// rama», «detecta cableado sobre el arbol del consumidor», «su mitad de datos ya la cubre
// el banco del andamio»— y el change `rojo-primero` las salda. Viene de Rigel (1.11.0,
// change `rojo-primero`, commits d4b294e y e3bf131 de alla), adaptado a los scripts de
// Projects, que no son los mismos.
//
// Van juntas porque las tres verifican lo mismo —que una pieza estructural del repo ESTE—
// y las tres tienen el mismo modo de fallo: si dejan de poder fallar, un repo sin esa pieza
// pasa en verde y nadie se entera hasta que la pieza hace falta.
//
// LAS TRES TIENEN CAMINOS INERTES, y se prueban tambien. Un camino inerte mal escrito es
// peor que una compuerta ausente: hace que la compuerta parezca correr cuando se saltea.
// Por cada `exit 0` temprano hay una prueba de que se toma SOLO donde debe.
//
// Y EL BANCO ENCONTRO UNA CLAUSULA QUE NO PODIA FALLAR POR EL MOTIVO CORRECTO. El paso del
// umbral exigia el texto `all: true` en la configuracion de cobertura del andamio. La
// configuracion lo saco a proposito cuando vitest lo retiro —la opcion desaparecio en la
// mayor 4 y el alcance lo fija `include`—, y el paso seguia en verde porque el COMENTARIO
// que explica el retiro dice `all: true` dos veces. Ver el caso «un comentario no declara».
import { test } from "node:test";
import assert from "node:assert/strict";

import { scriptDelPaso } from "./extraer.mjs";
import { repoDeJuguete, escribir, commit, correrBash, limpiarTodo } from "./util.mjs";
import { porque } from "../porque.mjs";

test.after(limpiarTodo);

// ---------------------------------------------------------------------------
// Exigir OpenSpec en el repo
// ---------------------------------------------------------------------------

const OPENSPEC = "Exigir OpenSpec en el repo";

test("OpenSpec · ROJO: un repo sin openspec/ no pasa, y el error trae el comando pinado que lo arregla", () => {
  const raiz = repoDeJuguete("openspec-sin-");
  escribir(raiz, "README.md", "# sin specs\n");
  const res = correrBash(scriptDelPaso(OPENSPEC), { cwd: raiz, env: { VERSION_OPENSPEC: "9.9.9" } });
  assert.equal(res.exit, 1, porque("el marco exige que las specs vivan en el repo", res.salida));
  assert.match(res.salida, /::error::/);
  // El arreglo tiene que venir escrito y PINADO: un rojo que manda a correr el CLI sin
  // version ensenaria la invocacion que otro paso de este mismo workflow pone en rojo.
  assert.match(res.salida, /@fission-ai\/openspec@9\.9\.9 init/);
});

test("OpenSpec · VERDE: con el directorio presente pasa", () => {
  const raiz = repoDeJuguete("openspec-con-");
  escribir(raiz, "openspec/specs/x/spec.md", "# x\n");
  const res = correrBash(scriptDelPaso(OPENSPEC), { cwd: raiz, env: { VERSION_OPENSPEC: "9.9.9" } });
  assert.equal(res.exit, 0, porque("con openspec/ presente el paso no puede ser rojo", res.salida));
});

// ---------------------------------------------------------------------------
// El andamio reparte el umbral del total del marco
// ---------------------------------------------------------------------------

const UMBRAL = "El andamio reparte el umbral del total del marco";
const COMPARADOR = "actions/cobertura-diff/medir-cobertura-diff.mjs";
const BASE_VITEST = "plantilla/vitest.config.base.mjs";

/** Una base de vitest con las cuatro metricas, el alcance y el umbral que se le pida. */
const baseVitest = (minimo) =>
  [
    `export const MINIMO_DEL_MARCO = ${minimo};`,
    "export function coberturaDelMarco(minimo = MINIMO_DEL_MARCO) {",
    "  return { coverage: {",
    '    include: ["src/**/*.ts"],',
    "    thresholds: { lines: minimo, functions: minimo, branches: minimo, statements: minimo },",
    "  } };",
    "}",
    "",
  ].join("\n");

function repoConUmbral(nombre, { marco = 80, andamio = 80, comparador = true, base = true, plantilla = true } = {}) {
  const raiz = repoDeJuguete(`umbral-${nombre}-`);
  if (comparador) escribir(raiz, COMPARADOR, `const MINIMO_DEL_MARCO = ${marco};\n`);
  if (plantilla) escribir(raiz, "plantilla/.github/workflows/ci.yml", "jobs:\n  a:\n    steps:\n      - run: echo\n");
  if (base) escribir(raiz, BASE_VITEST, baseVitest(andamio));
  return raiz;
}

const correrUmbral = (raiz) => correrBash(scriptDelPaso(UMBRAL), { cwd: raiz });

test("umbral · ROJO: el andamio reparte un numero distinto al del comparador, y el error nombra los dos", () => {
  // El caso que la compuerta existe para cazar: dos declaraciones del mismo umbral que se
  // separaron. Un proyecto nuevo naceria con su suite local pidiendo un numero y la
  // integracion pidiendo otro.
  const res = correrUmbral(repoConUmbral("distinto", { marco: 80, andamio: 70 }));
  assert.equal(res.exit, 1, porque("dos umbrales distintos tienen que ser rojo", res.salida));
  assert.match(res.salida, /::error file=plantilla\/vitest\.config\.base\.mjs::.*70%.*80%/);
});

test("umbral · ROJO: falta una de las cuatro metricas, y el error la nombra", () => {
  const raiz = repoConUmbral("sin-branches");
  escribir(raiz, BASE_VITEST, baseVitest(80).replace("branches: minimo, ", ""));
  const res = correrUmbral(raiz);
  assert.equal(res.exit, 1, porque("sin branches el umbral no mide lo que promete", res.salida));
  assert.match(res.salida, /le falta: branches: minimo/);
});

test("umbral · ROJO: la configuracion no fija el alcance (include), y el error dice que es lo que falta", () => {
  const raiz = repoConUmbral("sin-include");
  escribir(raiz, BASE_VITEST, baseVitest(80).replace('    include: ["src/**/*.ts"],\n', ""));
  const res = correrUmbral(raiz);
  assert.equal(res.exit, 1, porque("sin alcance el reporte trae solo lo que alguna prueba importo", res.salida));
  assert.match(res.salida, /le falta: include:/);
});

test("umbral · ROJO: un comentario no declara nada — ni el alcance ni una metrica", () => {
  // EL DEFECTO QUE ESTE BANCO ENCONTRO, reproducido. La configuracion real del andamio
  // explica en un COMENTARIO por que ya no usa `all: true`, y el paso —que grepeaba el
  // texto entero— daba la clausula por cumplida con ese comentario. Aca el alcance y una
  // metrica viven SOLO en comentarios: antes del arreglo este caso salia 0.
  const raiz = repoConUmbral("comentado");
  const comentada = baseVitest(80)
    .replace('    include: ["src/**/*.ts"],\n', '    // include: ["src/**/*.ts"], all: true — ya no se usa\n')
    .replace("branches: minimo, ", "")
    .replace("  return {", "  // branches: minimo, lo dejamos para despues\n  return {");
  escribir(raiz, BASE_VITEST, comentada);
  const res = correrUmbral(raiz);
  assert.equal(res.exit, 1, porque("lo que solo aparece en un comentario no esta declarado", res.salida));
  assert.match(res.salida, /le falta: branches: minimo include:/);
});

test("umbral · ROJO: el andamio no reparte ninguna configuracion de cobertura", () => {
  const res = correrUmbral(repoConUmbral("sin-base", { base: false }));
  assert.equal(res.exit, 1, porque("sin base cada proyecto inventa su umbral", res.salida));
  assert.match(res.salida, /falta plantilla\/vitest\.config\.base\.mjs/);
});

test("umbral · ROJO: la constante del comparador dejo de ser legible", () => {
  // "No se pudo medir" tratado como rojo: si la constante se renombra, la compuerta no
  // puede comparar nada, y declararse conforme ahi seria leer el silencio como exito.
  const raiz = repoConUmbral("ilegible");
  escribir(raiz, COMPARADOR, "const OTRO_NOMBRE = 80;\n");
  const res = correrUmbral(raiz);
  assert.equal(res.exit, 1, porque("una constante que no se puede leer no puede coincidir con nada", res.salida));
  assert.match(res.salida, /no se pudo leer MINIMO_DEL_MARCO/);
});

test("umbral · ROJO: la constante del andamio dejo de ser legible, y el error trae la linea a escribir", () => {
  const raiz = repoConUmbral("andamio-ilegible");
  escribir(raiz, BASE_VITEST, baseVitest(80).replace("export const MINIMO_DEL_MARCO = 80;", "export const OTRO = 80;"));
  const res = correrUmbral(raiz);
  assert.equal(res.exit, 1, porque("un andamio sin constante legible no se puede comparar", res.salida));
  assert.match(res.salida, /export const MINIMO_DEL_MARCO = 80;/);
});

test("umbral · VERDE: los dos numeros coinciden, estan las cuatro metricas y el alcance", () => {
  const res = correrUmbral(repoConUmbral("coinciden", { marco: 80, andamio: 80 }));
  assert.equal(res.exit, 0, porque("una configuracion completa y alineada no puede ser rojo", res.salida));
  assert.match(res.salida, /coincide con el del comparador/);
});

test("umbral · VERDE: la configuracion REAL del andamio pasa contra el comparador REAL", () => {
  // El caso que ata el banco al arbol: sin el, los fixtures podrian estar bien y el andamio
  // de verdad no pasar (o pasar por un comentario, que es lo que paso).
  const res = correrUmbral(new URL("../..", import.meta.url).pathname);
  assert.equal(res.exit, 0, porque("el andamio real tiene que pasar su propia compuerta", res.salida));
});

test("umbral · INERTE: un repo que no distribuye el comparador no se mide", () => {
  const res = correrUmbral(repoConUmbral("sin-comparador", { comparador: false, base: false, plantilla: false }));
  assert.equal(res.exit, 0, porque("un consumidor no tiene comparador: la compuerta no le aplica", res.salida));
  assert.match(res.salida, /::notice::este repo no distribuye el comparador/);
});

test("umbral · INERTE: un repo con comparador y sin andamio no se mide contra el, y lo dice", () => {
  // Sin esta rama, la compuerta enrojeceria a todo repo que no reparta andamio.
  const res = correrUmbral(repoConUmbral("sin-plantilla", { plantilla: false, base: false }));
  assert.equal(res.exit, 0, porque("sin andamio no hay umbral que comparar", res.salida));
  assert.match(res.salida, /::notice::este repo no distribuye un andamio/);
});

// ---------------------------------------------------------------------------
// Censo de fuentes cableado
// ---------------------------------------------------------------------------

const CENSO = "Censo de fuentes cableado";

function repoConCenso(nombre, { manifiesto = "package.json", workflows = true, uses = "mi-org/Projects/actions/censo-fuentes@v1.9.6", extra = [] } = {}) {
  const raiz = repoDeJuguete(`censo-${nombre}-`);
  if (manifiesto) escribir(raiz, manifiesto, manifiesto.endsWith(".json") ? '{ "name": "x" }\n' : "packages: []\n");
  else escribir(raiz, "README.md", "# sin node\n");
  if (workflows) {
    const pasos = ["jobs:", "  a:", "    steps:", uses === null ? "      - run: echo hola" : `      - uses: ${uses}`, ...extra, ""];
    escribir(raiz, ".github/workflows/ci.yml", pasos.join("\n"));
  }
  commit(raiz, "fixture");
  return raiz;
}

const correrCenso = (raiz) => correrBash(scriptDelPaso(CENSO), { cwd: raiz, env: { PROPIETARIO: "mi-org" } });

test("censo · ROJO: el repo no invoca el censo en ningun flujo, y el error trae el paso a pegar con la cuenta del repo", () => {
  const res = correrCenso(repoConCenso("sin-cablear", { uses: null }));
  assert.equal(res.exit, 1, porque("un censo declarado y no invocado es un guardrail apagado", res.salida));
  assert.match(res.salida, /::error::este repo no invoca el censo de fuentes/);
  assert.match(res.salida, /== paso a agregar ==/);
  assert.match(res.salida, /uses: mi-org\/Projects\/actions\/censo-fuentes@v\d+\.\d+\.\d+/);
});

test("censo · ROJO: un uses: comentado no cablea nada", () => {
  // La forma mas facil de "cablear" sin cablear: el ancla del patron descarta la linea.
  const res = correrCenso(repoConCenso("comentado", { uses: null, extra: ["      # - uses: mi-org/Projects/actions/censo-fuentes@v1.9.6"] }));
  assert.equal(res.exit, 1, porque("un comentario no invoca el censo", res.salida));
  assert.match(res.salida, /no invoca el censo de fuentes/);
});

test("censo · ROJO: el snippet pegado en un README de la carpeta de workflows no cuenta", () => {
  // El mismo snippet que el rojo imprime, pegado en documentacion: el --include del grep
  // acota a lo que GitHub ejecuta, asi que el mensaje de error no ensena a evadirlo.
  const raiz = repoConCenso("readme", { uses: null });
  escribir(raiz, ".github/workflows/README.md", "      - uses: mi-org/Projects/actions/censo-fuentes@v1.9.6\n");
  commit(raiz, "readme");
  const res = correrCenso(raiz);
  assert.equal(res.exit, 1, porque("un README no es un flujo", res.salida));
});

test("censo · ROJO: sin .github/workflows no hay donde cablearlo", () => {
  const res = correrCenso(repoConCenso("sin-workflows", { workflows: false }));
  assert.equal(res.exit, 1, porque("sin workflows no hay censo cableado", res.salida));
  assert.match(res.salida, /no hay donde cablear el censo de fuentes/);
});

test("censo · ROJO: un monorepo que solo versiona pnpm-workspace.yaml tambien es un repo de Node", () => {
  const res = correrCenso(repoConCenso("workspace", { manifiesto: "pnpm-workspace.yaml", uses: null }));
  assert.equal(res.exit, 1, porque("el workspace sin manifiesto de raiz sigue siendo un repo de Node", res.salida));
});

test("censo · VERDE: cableado en un flujo, pasa e imprime donde", () => {
  const res = correrCenso(repoConCenso("cableado"));
  assert.equal(res.exit, 0, porque("un censo cableado no puede ser rojo", res.salida));
  assert.match(res.salida, /el censo de fuentes esta cableado/);
  assert.match(res.salida, /\.github\/workflows\/ci\.yml/);
});

test("censo · VERDE: cableado por ruta local, que es como lo prueba el marco antes de mover un tag", () => {
  const res = correrCenso(repoConCenso("local", { uses: "./actions/censo-fuentes" }));
  assert.equal(res.exit, 0, porque("el segmento de ruta de la action es lo que identifica el cableado, no la referencia", res.salida));
});

test("censo · AVISA, no falla, si el flujo que lo cablea usa continue-on-error", () => {
  // El censo esta cableado, asi que la compuerta se cumple. Lo que se avisa es que un
  // modificador podria estar tapandolo — y un aviso que fuera rojo entrenaria a quitar el
  // aviso en vez de a mirarlo.
  const res = correrCenso(repoConCenso("con-coe", { extra: ["        continue-on-error: true"] }));
  assert.equal(res.exit, 0, porque("el continue-on-error se avisa, no enrojece", res.salida));
  assert.match(res.salida, /::warning file=\.github\/workflows\/ci\.yml::.*continue-on-error/);
});

test("censo · INERTE: un repo sin manifiesto de Node no tiene toolchain que censar, y lo dice", () => {
  const res = correrCenso(repoConCenso("sin-node", { manifiesto: null }));
  assert.equal(res.exit, 0, porque("sin manifiesto no hay toolchain", res.salida));
  assert.match(res.salida, /::notice::este repo no versiona un manifiesto de Node/);
});

test("censo · INERTE solo con el manifiesto SIN VERSIONAR: un package.json sin rastrear no enciende el check", () => {
  // La deteccion lee `git ls-files`, a proposito: un archivo de prueba suelto no hace de un
  // repo un proyecto de Node. Este caso fija esa eleccion.
  const raiz = repoConCenso("sin-rastrear", { manifiesto: null, uses: null });
  escribir(raiz, "package.json", '{ "name": "suelto" }\n');
  const res = correrCenso(raiz);
  assert.equal(res.exit, 0, porque("un manifiesto sin versionar no es el del repo", res.salida));
  assert.match(res.salida, /::notice::/);
});
