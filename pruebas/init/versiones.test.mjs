import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

import {
  RAIZ_POR_DEFECTO,
  CAMPOS_DE_DEPENDENCIAS,
  CAMPO_GESTOR,
  manifiestosDe,
  leerRango,
  rangoNuevo,
  clasificar,
  desviosDe,
  declaracionesDe,
  leerArbol,
  esPrerelease,
  estableDe,
  analizar,
  propuestas,
  lineasDelInforme,
  aplicarEnTexto,
  seguroDentroDeComillas,
  escribirCambios,
  esQueSi,
  leerAlcance,
  seleccionar,
  decidir,
  hayTerminal,
  lineasDeUso,
} from "../../herramientas/projects-versiones.mjs";

import { consultarEtiquetasDe } from "../../herramientas/registro-npm.mjs";
import { levantarRegistro } from "./registro-falso.mjs";

// ---------------------------------------------------------------------------
// EL BANCO DE `projects versiones`.
//
// POR QUE EXISTE. Hasta este cambio la herramienta tenia 815 lineas y CERO
// aserciones: nadie la importaba en todo el repo y una corrida con cobertura del
// banco completo la reportaba como "nunca se cargo". Sus propios comentarios
// afirmaban lo contrario —"el banco le pasa un Map armado a mano", "el banco le
// pasa una que devuelve respuestas escritas de antemano y ANOTA que se
// pregunto"— sobre bancos que no existian. Este archivo es esos bancos.
//
// TODO CORRE SIN RED. Donde hace falta un registro se levanta el de mentira de
// registro-falso.mjs en 127.0.0.1 y se apunta la herramienta con
// PROJECTS_REGISTRO_NPM, que es la misma variable con la que una organizacion la
// apunta a su espejo interno.
//
// EL CASO QUE MANDA EN ESTE ARCHIVO: lo que contesta el registro es texto de un
// TERCERO y termina pegado dentro de las comillas de un package.json que despues
// alguien instala. La prueba de "el registro hostil" de mas abajo corre la MISMA
// cadena que main() y afirma que ese texto no llega al disco.
// ---------------------------------------------------------------------------

const ESTE_DIRECTORIO = path.dirname(fileURLToPath(import.meta.url));
const HERRAMIENTA = path.join(ESTE_DIRECTORIO, "..", "..", "herramientas", "projects-versiones.mjs");

const SIN_CHMOD = process.platform === "win32" || (typeof process.getuid === "function" && process.getuid() === 0);

function arbolTemporal() {
  return fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), "projects-versiones-"));
}

function escribir(raiz, rel, contenido) {
  const abs = path.join(raiz, ...rel.split("/"));
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, contenido, "utf8");
  return abs;
}

function sha(abs) {
  return crypto.createHash("sha256").update(fs.readFileSync(abs)).digest("hex");
}

/** Un manifiesto con la sangria, el orden y el salto final que tiene uno de
 *  verdad: es lo que la reescritura por texto promete no tocar. */
function manifiestoDeEjemplo() {
  return [
    "{",
    '  "name": "ejemplo",',
    '  "packageManager": "pnpm@11.0.0",',
    '  "dependencies": {',
    '    "express": "^4.18.0",',
    '    "@prisma/client": "^7.9.1"',
    "  },",
    '  "devDependencies": {',
    '    "typescript": "^7.0.0"',
    "  }",
    "}",
    "",
  ].join("\n");
}

// ─────────────────────────── Leer rangos ───────────────────────────

test("leerRango: lo que se acepta es un prefijo simple + x.y.z, y nada mas", () => {
  assert.deepEqual(leerRango("^1.2.3"), { base: "1.2.3", prefijo: "^", motivo: null });
  assert.deepEqual(leerRango("~1.2.3"), { base: "1.2.3", prefijo: "~", motivo: null });
  assert.deepEqual(leerRango(">=1.2.3"), { base: "1.2.3", prefijo: ">=", motivo: null });
  assert.deepEqual(leerRango("1.2.3"), { base: "1.2.3", prefijo: "", motivo: null });
  assert.deepEqual(leerRango("  ^1.2.3  "), { base: "1.2.3", prefijo: "^", motivo: null });
});

test("leerRango: los rangos raros salen NO COMPARABLES con su motivo, no adivinados", () => {
  for (const [rango, motivo] of [
    ["1.x", /prefijo simple/],
    ["^1.2.3 || ^2.0.0", /prefijo simple/],
    ["^1.2", /prefijo simple/],
    ["*", /prefijo simple/],
    ["latest", /prefijo simple/],
    ["workspace:*", /no apunta al registro/],
    ["catalog:default", /no apunta al registro/],
    ["npm:otro@1.0.0", /no apunta al registro/],
    ["github:foo/bar", /no apunta al registro/],
    ["file:../x", /no apunta al registro/],
    ["1.2.3-rc.1", /prerelease/],
    ["", /vacio/],
  ]) {
    const r = leerRango(rango);
    assert.equal(r.base, null, `${JSON.stringify(rango)} se leyo como comparable`);
    assert.match(r.motivo, motivo, `motivo de ${JSON.stringify(rango)}`);
  }
  assert.match(leerRango(7).motivo, /no es texto/);
  assert.match(leerRango(undefined).motivo, /no es texto/);
});

test("rangoNuevo: el prefijo que estaba es el prefijo que queda", () => {
  assert.equal(rangoNuevo("^", "2.0.0"), "^2.0.0");
  assert.equal(rangoNuevo("~", "2.0.0"), "~2.0.0");
  assert.equal(rangoNuevo("", "2.0.0"), "2.0.0");
  assert.equal(rangoNuevo(">=", "2.0.0"), ">=2.0.0");
});

test("clasificar: las cuatro respuestas son cuatro decisiones distintas", () => {
  assert.equal(clasificar("1.2.3", "1.2.3"), "al-dia");
  assert.equal(clasificar("1.2.3", "1.4.0"), "menor");
  assert.equal(clasificar("1.2.3", "2.0.0"), "mayor");
  assert.equal(clasificar("2.0.0", "1.9.9"), "adelantado");
});

// ─────────────────────────── Prereleases y estables ───────────────────────────

test("esPrerelease: el guion despues del parche, y solo ese", () => {
  assert.equal(esPrerelease("8.0.0-rc.10"), true);
  assert.equal(esPrerelease("1.0.0-beta"), true);
  assert.equal(esPrerelease("8.0.0"), false);
  assert.equal(esPrerelease("1.0.0+build-5"), false);
  assert.equal(esPrerelease(null), false);
});

test("estableDe: cada forma de no tener una estable tiene su cajon", () => {
  assert.deepEqual(estableDe({ latest: "7.0.2", error: null }), { version: "7.0.2", error: null, prerelease: null });
  assert.deepEqual(estableDe(undefined), { version: null, error: "no se consulto", prerelease: null });
  assert.deepEqual(estableDe({ latest: null, error: "404" }), { version: null, error: "404", prerelease: null });
  assert.deepEqual(estableDe({ latest: "8.0.0-rc.10", error: null }), { version: null, error: null, prerelease: "8.0.0-rc.10" });
  assert.equal(estableDe({ latest: "", error: null }).version, null);
});

// LA SEGUNDA CAPA, dentro del archivo que escribe. registro-npm.mjs ya filtra,
// pero esta funcion recibe Maps de quien la llame.
test("estableDe: un latest que no es una version NO se propone, aunque venga sin error", () => {
  const payload = '9.9.9"}, "scripts": { "preinstall": "echo TE-EJECUTE" }, "zzz": { "a": "1';
  const r = estableDe({ latest: payload, error: null });
  assert.equal(r.version, null);
  assert.match(r.error, /no tiene forma de version publicable/);
  assert.equal(estableDe({ latest: "1.2.3$&", error: null }).version, null);
});

// ─────────────────────────── Leer el arbol ───────────────────────────

test("declaracionesDe: una entrada por (manifiesto, campo, paquete), mas el gestor", () => {
  const m = JSON.parse(manifiestoDeEjemplo());
  const d = declaracionesDe(m, "package.json");
  assert.deepEqual(
    d.map((x) => `${x.campo}:${x.paquete}@${x.rango}`),
    [
      "dependencies:express@^4.18.0",
      "dependencies:@prisma/client@^7.9.1",
      "devDependencies:typescript@^7.0.0",
      "packageManager:pnpm@11.0.0",
    ],
  );
  assert.equal(CAMPOS_DE_DEPENDENCIAS.includes("peerDependencies"), false, "peerDependencies no es una actualizacion");
});

test("declaracionesDe: el gestor con scope se corta por la ULTIMA arroba", () => {
  const d = declaracionesDe({ [CAMPO_GESTOR]: "@acme/pnpm@11.23.0" }, "package.json");
  assert.deepEqual(d, [{ ruta: "package.json", campo: CAMPO_GESTOR, paquete: "@acme/pnpm", rango: "11.23.0" }]);
  // Sin arroba separadora no hay nada que leer, y no se inventa.
  assert.deepEqual(declaracionesDe({ [CAMPO_GESTOR]: "pnpm" }, "p"), []);
});

test("declaracionesDe: un bloque que no es objeto se ignora sin explotar", () => {
  assert.deepEqual(declaracionesDe({ dependencies: ["a"], devDependencies: null }, "p"), []);
  assert.deepEqual(declaracionesDe(null, "p"), []);
});

test("desviosDe: se leen los declarados y se descartan los que no tienen paquete", () => {
  const m = {
    projects: {
      stack: {
        desvios: [
          { paquete: "typescript", fijado_en: "^6.0.3", ultima_estable_al_fijarlo: "7.0.0", motivo: "la API de compilador" },
          { paquete: "", motivo: "sin nombre" },
          { motivo: "sin paquete" },
          "basura",
        ],
      },
    },
  };
  const d = desviosDe(m);
  assert.equal(d.length, 1);
  assert.equal(d[0].paquete, "typescript");
  assert.equal(d[0].fijado_en, "^6.0.3");
  assert.deepEqual(desviosDe({}), []);
  assert.deepEqual(desviosDe({ projects: { stack: { desvios: "no es lista" } } }), []);
});

test("manifiestosDe: a cualquier profundidad, y node_modules se poda por segmento", () => {
  const raiz = arbolTemporal();
  try {
    escribir(raiz, "package.json", "{}");
    escribir(raiz, "api/package.json", "{}");
    escribir(raiz, "packages/hondo/mas/package.json", "{}");
    escribir(raiz, "node_modules/x/package.json", "{}");
    escribir(raiz, "api/node_modules/y/package.json", "{}");
    escribir(raiz, "dist/package.json", "{}");
    const { rutas, problemas } = manifiestosDe(raiz);
    assert.deepEqual(rutas, ["api/package.json", "package.json", "packages/hondo/mas/package.json"]);
    assert.deepEqual(problemas, []);
  } finally {
    fs.rmSync(raiz, { recursive: true, force: true });
  }
});

// EL CASO MEDIDO: antes de esta guarda, un solo directorio sin permiso mataba la
// corrida entera con stdout vacio y exit 1.
test(
  "manifiestosDe: un directorio ilegible entra como problema y NO mata el recorrido",
  { skip: SIN_CHMOD ? "chmod 000 no bloquea en esta plataforma o con este usuario" : false },
  () => {
    const raiz = arbolTemporal();
    const cerrado = path.join(raiz, "cerrado");
    try {
      escribir(raiz, "package.json", "{}");
      escribir(raiz, "api/package.json", "{}");
      fs.mkdirSync(cerrado);
      fs.chmodSync(cerrado, 0o000);
      const { rutas, problemas } = manifiestosDe(raiz);
      assert.deepEqual(rutas, ["api/package.json", "package.json"], "se perdieron los manifiestos que si se podian leer");
      assert.equal(problemas.length, 1);
      assert.match(problemas[0], /^cerrado: no pude listar ese directorio/);
      assert.match(problemas[0], /NO estan en este informe/);
    } finally {
      fs.chmodSync(cerrado, 0o755);
      fs.rmSync(raiz, { recursive: true, force: true });
    }
  },
);

test("leerArbol: un package.json roto entra como problema y los otros se siguen leyendo", () => {
  const raiz = arbolTemporal();
  try {
    escribir(raiz, "package.json", '{"dependencies":{"a":"^1.0.0"}}');
    escribir(raiz, "api/package.json", "{ esto no es json");
    escribir(raiz, "web/package.json", '{"dependencies":{"b":"^2.0.0"}}');
    const r = leerArbol(raiz);
    assert.deepEqual(r.manifiestos, ["api/package.json", "package.json", "web/package.json"]);
    assert.equal(r.problemas.length, 1);
    assert.match(r.problemas[0], /^api\/package\.json: no es JSON valido/);
    assert.deepEqual(r.declaraciones.map((d) => d.paquete).sort(), ["a", "b"]);
  } finally {
    fs.rmSync(raiz, { recursive: true, force: true });
  }
});

test("leerArbol: el andamio del marco se lee y declara algo", () => {
  const r = leerArbol(RAIZ_POR_DEFECTO);
  assert.deepEqual(r.problemas, [], "el andamio del marco tiene un manifiesto ilegible o roto");
  assert.ok(r.manifiestos.length >= 4, `el andamio declara ${r.manifiestos.length} manifiesto(s)`);
  assert.ok(r.declaraciones.length > 10);
  assert.ok(r.declaraciones.some((d) => d.paquete === "typescript"));
});

// ─────────────────────────── Analizar ───────────────────────────

function decl(paquete, rango, campo = "dependencies", ruta = "package.json") {
  return { ruta, campo, paquete, rango };
}

test("analizar: cada declaracion cae en un solo cajon, y ninguna se cuela como al dia", () => {
  const declaraciones = [
    decl("aldia", "^1.0.0"),
    decl("menor", "^1.0.0"),
    decl("mayor", "^1.0.0"),
    decl("adelantado", "^3.0.0"),
    decl("prerelease", "^1.0.0"),
    decl("caido", "^1.0.0"),
    decl("raro", "workspace:*"),
  ];
  const ultimas = new Map([
    ["aldia", { latest: "1.0.0", error: null }],
    ["menor", { latest: "1.4.0", error: null }],
    ["mayor", { latest: "2.0.0", error: null }],
    ["adelantado", { latest: "2.9.9", error: null }],
    ["prerelease", { latest: "2.0.0-rc.1", error: null }],
    ["caido", { latest: null, error: "el registro no conoce ese paquete (404)" }],
  ]);
  const a = analizar({ declaraciones, ultimas });
  assert.deepEqual(a.alDia.map((f) => f.paquete), ["aldia"]);
  assert.deepEqual(a.menores.map((f) => f.paquete), ["menor"]);
  assert.deepEqual(a.mayores.map((f) => f.paquete), ["mayor"]);
  assert.deepEqual(a.adelantados.map((f) => f.paquete), ["adelantado"]);
  assert.deepEqual(a.sinEstable.map((f) => f.paquete), ["prerelease"]);
  assert.deepEqual(a.sinRespuesta.map((f) => f.paquete), ["caido"]);
  assert.deepEqual(a.noComparables.map((f) => f.paquete), ["raro"]);
  // "raro" ni siquiera se consulto, y "caido" fallo: ninguno de los dos es al dia.
  assert.equal(a.alDia.length, 1);
  assert.equal(a.menores[0].nuevo, "^1.4.0");
});

test("analizar: un paquete que no esta en el Map cae en SIN RESPUESTA, no en al dia", () => {
  const a = analizar({ declaraciones: [decl("fantasma", "^1.0.0")], ultimas: new Map() });
  assert.equal(a.alDia.length, 0);
  assert.deepEqual(a.sinRespuesta.map((f) => f.paquete), ["fantasma"]);
  assert.equal(a.sinRespuesta[0].error, "no se consulto");
});

// LA RAMA QUE HOY NO RECORRE EL ANDAMIO. `plantilla/package.json` declara
// `"desvios": []`, asi que sobre el arbol por defecto esto no se ejecuta nunca;
// se sostiene porque `--raiz` apunta a arboles ajenos que si pueden declararlos.
test("analizar: un desvio declarado congela el paquete en TODO el arbol y no se propone", () => {
  const desvios = new Map([
    ["typescript", { paquete: "typescript", fijado_en: "^6.0.3", ultima_estable_al_fijarlo: "7.0.0", motivo: "la API de compilador", declaradoEn: "package.json" }],
  ]);
  const declaraciones = [
    decl("typescript", "^6.0.3", "devDependencies", "package.json"),
    decl("typescript", "^6.0.3", "devDependencies", "api/package.json"),
    decl("otro", "^1.0.0"),
  ];
  const ultimas = new Map([
    ["typescript", { latest: "7.0.0", error: null }],
    ["otro", { latest: "2.0.0", error: null }],
  ]);
  const a = analizar({ declaraciones, ultimas, desvios });
  assert.equal(a.congelados.length, 2, "el desvio se declara una vez y vale para todo el arbol");
  assert.equal(a.mayores.length, 1);
  assert.equal(a.mayores[0].paquete, "otro");
  assert.equal(propuestas(a).some((p) => p.paquete === "typescript"), false, "se propuso deshacer un desvio declarado");
  // La foto del desvio sigue siendo la de hoy: no hay nada que releer.
  assert.deepEqual(a.desviosARevisar, []);
});

test("analizar: si la foto del desvio ya no es la de hoy, se pide releerlo UNA vez", () => {
  const desvios = new Map([
    ["typescript", { paquete: "typescript", fijado_en: "^6.0.3", ultima_estable_al_fijarlo: "7.0.0", motivo: "x", declaradoEn: "package.json" }],
  ]);
  const declaraciones = [
    decl("typescript", "^6.0.3", "devDependencies", "package.json"),
    decl("typescript", "^6.0.3", "devDependencies", "api/package.json"),
  ];
  const ultimas = new Map([["typescript", { latest: "7.5.0", error: null }]]);
  const a = analizar({ declaraciones, ultimas, desvios });
  assert.equal(a.congelados.length, 2);
  assert.equal(a.desviosARevisar.length, 1, "dos declaraciones del mismo paquete son UNA relectura");
  assert.equal(a.desviosARevisar[0].ultima, "7.5.0");
  // Y sigue sin proponerse: "releer" no es "actualizar".
  assert.deepEqual(propuestas(a), []);
});

test("propuestas: primero los saltos de mayor, que son los que hay que mirar", () => {
  const a = { mayores: [{ paquete: "m1" }, { paquete: "m2" }], menores: [{ paquete: "n1" }] };
  assert.deepEqual(propuestas(a).map((f) => f.paquete), ["m1", "m2", "n1"]);
});

test("lineasDelInforme: cada cajon con algo adentro trae su seccion, y el total cierra", () => {
  const declaraciones = [decl("mayor", "^1.0.0"), decl("menor", "^1.0.0"), decl("aldia", "^1.0.0"), decl("raro", "*")];
  const ultimas = new Map([
    ["mayor", { latest: "2.0.0", error: null }],
    ["menor", { latest: "1.1.0", error: null }],
    ["aldia", { latest: "1.0.0", error: null }],
  ]);
  const a = analizar({ declaraciones, ultimas });
  const texto = lineasDelInforme(a, { manifiestos: ["package.json"], registro: "http://r", numerar: true }).join("\n");
  assert.match(texto, /4 declaracion\(es\) en 1 manifiesto\(s\)/);
  assert.match(texto, /SALTOS DE MAYOR \(1\)/);
  assert.match(texto, /SALTOS MENORES O DE PARCHE \(1\)/);
  assert.match(texto, /NO COMPARABLES \(1\)/);
  assert.match(texto, /AL DIA \(1\)/);
  assert.match(texto, /\[ 1\]/, "con numerar:true las propuestas van numeradas");
  // Las secciones vacias no se imprimen.
  assert.equal(/FIJADOS POR UN DESVIO/.test(texto), false);
  assert.equal(/SIN RESPUESTA DEL REGISTRO/.test(texto), false);
});

// ─────────────────────────── Escribir ───────────────────────────

test("seguroDentroDeComillas: comilla, barra invertida y control quedan afuera", () => {
  assert.equal(seguroDentroDeComillas("^7.0.2"), true);
  assert.equal(seguroDentroDeComillas("pnpm@11.23.0"), true);
  assert.equal(seguroDentroDeComillas('^9.9.9"}, "scripts": {'), false);
  assert.equal(seguroDentroDeComillas("^1.0.0\\u0041"), false);
  assert.equal(seguroDentroDeComillas("^1.0.0\n"), false);
  assert.equal(seguroDentroDeComillas(""), false);
  assert.equal(seguroDentroDeComillas(null), false);
});

test("aplicarEnTexto: el diff es de dos lineas y la sangria, el orden y el salto final quedan", () => {
  const antes = manifiestoDeEjemplo();
  const { texto, aplicados, rechazados } = aplicarEnTexto(antes, [
    { ruta: "package.json", campo: "dependencies", paquete: "@prisma/client", rango: "^7.9.1", nuevo: "^7.10.0" },
    { ruta: "package.json", campo: CAMPO_GESTOR, paquete: "pnpm", rango: "11.0.0", nuevo: "11.23.0" },
  ]);
  assert.equal(aplicados.length, 2);
  assert.deepEqual(rechazados, []);
  JSON.parse(texto);
  assert.match(texto, /^ {4}"@prisma\/client": "\^7\.10\.0"$/m);
  assert.match(texto, /^ {2}"packageManager": "pnpm@11\.23\.0",$/m);
  assert.match(texto, /"express": "\^4\.18\.0"/, "se toco una declaracion que nadie eligio");
  assert.equal(texto.endsWith("}\n"), true, "se perdio el salto final");
  const distintas = antes.split("\n").filter((l, i) => l !== texto.split("\n")[i]).length;
  assert.equal(distintas, 2, `el diff toco ${distintas} lineas`);
});

test("aplicarEnTexto: falla CERRADO cuando el par nombre/rango aparece dos veces", () => {
  const antes = ['{', '  "dependencies": { "x": "^1.0.0" },', '  "devDependencies": { "x": "^1.0.0" }', "}", ""].join("\n");
  const r = aplicarEnTexto(antes, [
    { ruta: "package.json", campo: "dependencies", paquete: "x", rango: "^1.0.0", nuevo: "^2.0.0" },
    { ruta: "package.json", campo: "devDependencies", paquete: "x", rango: "^1.0.0", nuevo: "^2.0.0" },
  ]);
  assert.deepEqual(r.aplicados, []);
  assert.equal(r.rechazados.length, 2);
  for (const x of r.rechazados) assert.match(x.motivo, /aparece 2 veces en el archivo/);
  assert.equal(r.texto, antes, "se escribio algo pese a la ambiguedad");
});

test("aplicarEnTexto: si el rango declarado ya no esta, no se adivina", () => {
  const antes = manifiestoDeEjemplo();
  const r = aplicarEnTexto(antes, [{ ruta: "package.json", campo: "dependencies", paquete: "express", rango: "^3.0.0", nuevo: "^5.0.0" }]);
  assert.deepEqual(r.aplicados, []);
  assert.match(r.rechazados[0].motivo, /ya no esta en el archivo/);
  assert.equal(r.texto, antes);
});

// EL CASO MEDIDO 1: el payload del registro hostil.
test("aplicarEnTexto: un valor que rompe las comillas del JSON se RECHAZA y no se escribe", () => {
  const antes = manifiestoDeEjemplo();
  const payload = '^9.9.9"}, "scripts": { "preinstall": "echo TE-EJECUTE" }, "zzz": { "a": "1';
  const r = aplicarEnTexto(antes, [{ ruta: "package.json", campo: "dependencies", paquete: "express", rango: "^4.18.0", nuevo: payload }]);
  assert.deepEqual(r.aplicados, [], "se aplico un cambio con un valor que rompe el JSON");
  assert.equal(r.rechazados.length, 1);
  assert.match(r.rechazados[0].motivo, /no pueden ir crudos dentro de las comillas/);
  assert.equal(r.texto, antes);
  assert.equal(JSON.parse(r.texto).scripts, undefined, "aparecio un bloque scripts que nadie declaro");
});

// EL CASO MEDIDO 2: la cadena de reemplazo de String.replace.
test("aplicarEnTexto: `$&` y compania se escriben como texto, no como sintaxis de reemplazo", () => {
  const antes = ['{', '  "dependencies": { "x": "^1.0.0" }', "}", ""].join("\n");
  // Estos valores pasan `seguroDentroDeComillas` (no traen comilla ni barra),
  // asi que la unica defensa es que el reemplazo vaya por funcion.
  for (const nuevo of ["^1.0.0$&", "^1.0.0$'", "^1.0.0$`", "^1.0.0$1"]) {
    const r = aplicarEnTexto(antes, [{ ruta: "package.json", campo: "dependencies", paquete: "x", rango: "^1.0.0", nuevo }]);
    assert.equal(r.aplicados.length, 1, `${nuevo} no se aplico`);
    const m = JSON.parse(r.texto);
    assert.equal(m.dependencies.x, nuevo, `${nuevo} se escribio como sintaxis de reemplazo`);
  }
});

test("escribirCambios: un archivo se reescribe UNA vez con todos sus cambios", () => {
  const raiz = arbolTemporal();
  try {
    escribir(raiz, "package.json", manifiestoDeEjemplo());
    escribir(raiz, "api/package.json", '{\n  "dependencies": { "x": "^1.0.0" }\n}\n');
    const r = escribirCambios(raiz, [
      { ruta: "package.json", campo: "dependencies", paquete: "express", rango: "^4.18.0", nuevo: "^4.19.0" },
      { ruta: "package.json", campo: "devDependencies", paquete: "typescript", rango: "^7.0.0", nuevo: "^7.0.2" },
      { ruta: "api/package.json", campo: "dependencies", paquete: "x", rango: "^1.0.0", nuevo: "^1.1.0" },
    ]);
    assert.deepEqual(r.archivos.sort(), ["api/package.json", "package.json"]);
    assert.equal(r.aplicados.length, 3);
    assert.deepEqual(r.rechazados, []);
    const m = JSON.parse(fs.readFileSync(path.join(raiz, "package.json"), "utf8"));
    assert.equal(m.dependencies.express, "^4.19.0");
    assert.equal(m.devDependencies.typescript, "^7.0.2");
  } finally {
    fs.rmSync(raiz, { recursive: true, force: true });
  }
});

test("escribirCambios: un manifiesto que no se puede leer sale como rechazado, no como excepcion", () => {
  const raiz = arbolTemporal();
  try {
    const r = escribirCambios(raiz, [{ ruta: "no-existe/package.json", campo: "dependencies", paquete: "x", rango: "^1.0.0", nuevo: "^2.0.0" }]);
    assert.deepEqual(r.archivos, []);
    assert.equal(r.rechazados.length, 1);
    assert.match(r.rechazados[0].motivo, /no pude leer/);
  } finally {
    fs.rmSync(raiz, { recursive: true, force: true });
  }
});

// ─────────────────────────── Las dos preguntas ───────────────────────────

test("esQueSi: el default es NO — Enter pelado y cualquier otra cosa no es un si", () => {
  for (const si of ["s", "S", "si", "SI", "y", "Yes", "  s  "]) assert.equal(esQueSi(si), true, si);
  for (const no of ["", " ", "n", "no", "nope", "sisi", "1", "todo"]) assert.equal(esQueSi(no), false, JSON.stringify(no));
});

test("leerAlcance: todo, elegir, y lo que no es ninguna de las dos", () => {
  for (const t of ["", "todo", "TODOS", " t "]) assert.equal(leerAlcance(t), "todo", JSON.stringify(t));
  for (const e of ["elegir", "E", "solo", "algunos"]) assert.equal(leerAlcance(e), "elegir", e);
  for (const n of ["quiza", "1", "si"]) assert.equal(leerAlcance(n), null, n);
});

test("seleccionar: numeros, las dos palabras, y los que no corresponden a nada", () => {
  const candidatos = [
    { paquete: "a", clase: "mayor" },
    { paquete: "b", clase: "menor" },
    { paquete: "c", clase: "menor" },
  ];
  assert.deepEqual(seleccionar("1,3", candidatos).elegidos.map((c) => c.paquete), ["a", "c"]);
  assert.deepEqual(seleccionar("2 2 2", candidatos).elegidos.map((c) => c.paquete), ["b"], "el repetido se cuenta una vez");
  assert.deepEqual(seleccionar("menores", candidatos).elegidos.map((c) => c.paquete), ["b", "c"]);
  assert.deepEqual(seleccionar("mayores", candidatos).elegidos.map((c) => c.paquete), ["a"]);
  assert.deepEqual(seleccionar("todo", candidatos).elegidos.length, 3);
  const s = seleccionar("1, 12, cero", candidatos);
  assert.deepEqual(s.elegidos.map((c) => c.paquete), ["a"]);
  assert.deepEqual(s.invalidos, ["12", "cero"], "un numero que no existe tiene que enterarse quien lo escribio");
  assert.deepEqual(seleccionar("", candidatos), { elegidos: [], invalidos: [] });
});

/** Un `preguntar` que contesta lo escrito de antemano y ANOTA que se pregunto.
 *  Es lo que permite afirmar que son DOS preguntas y que van en ESE orden, sin
 *  simular un teclado. */
function preguntadorDeMentira(respuestas) {
  const hechas = [];
  return {
    hechas,
    preguntar: async (texto) => {
      hechas.push(texto);
      return respuestas.length ? respuestas.shift() : "";
    },
  };
}

function candidatosDeEjemplo() {
  const a = analizar({
    declaraciones: [decl("mayor", "^1.0.0"), decl("menor", "^2.0.0", "devDependencies")],
    ultimas: new Map([
      ["mayor", { latest: "2.0.0", error: null }],
      ["menor", { latest: "2.5.0", error: null }],
    ]),
  });
  return { a, candidatos: propuestas(a).map((f) => ({ ...f, clase: a.mayores.includes(f) ? "mayor" : "menor" })) };
}

test("decidir: son DOS preguntas, en el orden del encargo", async () => {
  const { a, candidatos } = candidatosDeEjemplo();
  const p = preguntadorDeMentira(["s", "todo"]);
  const r = await decidir({ a, candidatos, preguntar: p.preguntar });
  assert.equal(p.hechas.length, 2, `se hicieron ${p.hechas.length} preguntas`);
  assert.match(p.hechas[0], /^1\/2 /);
  assert.match(p.hechas[0], /Actualizo\? \[s\/N\]/);
  assert.match(p.hechas[1], /^2\/2 /);
  assert.match(p.hechas[1], /TODO el stack.*\[todo\/elegir\]/);
  assert.equal(r.elegidos.length, 2);
});

test("decidir: el default es NO, y un no NO pregunta la segunda", async () => {
  for (const respuesta of ["", "n", "no", "cualquier cosa"]) {
    const { a, candidatos } = candidatosDeEjemplo();
    const p = preguntadorDeMentira([respuesta]);
    const r = await decidir({ a, candidatos, preguntar: p.preguntar });
    assert.deepEqual(r.elegidos, [], `con ${JSON.stringify(respuesta)} se eligio algo`);
    assert.equal(p.hechas.length, 1, "se pregunto la segunda despues de un no");
    assert.match(r.dicho.join("\n"), /No se actualizo nada\. Ningun archivo fue modificado\./);
  }
});

test("decidir: 'elegir' repregunta cuales, y esa NO es una tercera pregunta del encargo", async () => {
  const { a, candidatos } = candidatosDeEjemplo();
  const p = preguntadorDeMentira(["s", "elegir", "2"]);
  const r = await decidir({ a, candidatos, preguntar: p.preguntar });
  assert.equal(p.hechas.length, 3);
  assert.match(p.hechas[2], /^ +Cuales\?/, "la repregunta va sin numerar: es la continuacion de la segunda");
  assert.deepEqual(r.elegidos.map((c) => c.paquete), ["menor"]);
});

test("decidir: una segunda respuesta que no es ninguna de las dos no escribe nada", async () => {
  const { a, candidatos } = candidatosDeEjemplo();
  const p = preguntadorDeMentira(["s", "quiza"]);
  const r = await decidir({ a, candidatos, preguntar: p.preguntar });
  assert.deepEqual(r.elegidos, []);
  assert.match(r.dicho.join("\n"), /No entendi "quiza"/);
});

test("decidir: una seleccion vacia no escribe nada, y los numeros invalidos se avisan", async () => {
  const { a, candidatos } = candidatosDeEjemplo();
  const p = preguntadorDeMentira(["s", "elegir", "99"]);
  const r = await decidir({ a, candidatos, preguntar: p.preguntar });
  assert.deepEqual(r.elegidos, []);
  assert.match(r.avisos.join("\n"), /"99" no es ninguno de los numeros del informe/);
  assert.match(r.dicho.join("\n"), /No quedo ninguno seleccionado/);
});

test("hayTerminal: sin isTTY no hay a quien preguntarle", () => {
  assert.equal(hayTerminal({ isTTY: true }), true);
  assert.equal(hayTerminal({ isTTY: false }), false);
  assert.equal(hayTerminal({}), false);
  assert.equal(hayTerminal(null), false);
});

test("lineasDeUso: nombra las tres banderas y las dos promesas de no bloquear", () => {
  const t = lineasDeUso().join("\n");
  for (const trozo of ["--raiz", "--solo-informe", "--help", "Sin terminal", "Sin red"]) {
    assert.ok(t.includes(trozo), `el uso no menciona ${trozo}`);
  }
});

// ───────────────── La cadena entera contra un registro hostil ─────────────────
//
// ESTA ES LA PRUEBA POR LA QUE EXISTE EL RESTO DEL ARCHIVO. Corre lo mismo que
// main(): leer el arbol, consultar el registro, analizar, decidir que SI a las
// dos preguntas, y escribir. El registro contesta un `latest` que es un trozo de
// JSON. Antes de la validacion, el manifiesto quedaba como JSON VALIDO con un
// `scripts.preinstall` de primer nivel —que ejecuta el `pnpm install` que la
// propia herramienta manda a correr en la linea siguiente— y la herramienta
// reportaba "aplicados: 1".
test("cadena completa: un registro hostil NO consigue escribir JSON en el manifiesto", async () => {
  const payload = '9.9.9"}, "scripts": { "preinstall": "echo TE-EJECUTE" }, "zzz": { "a": "1';
  const r = await levantarRegistro({ tags: { express: payload, typescript: "7.0.2" } });
  const raiz = arbolTemporal();
  try {
    const abs = escribir(raiz, "package.json", manifiestoDeEjemplo());
    const antes = fs.readFileSync(abs, "utf8");

    const { declaraciones, desvios } = leerArbol(raiz);
    const ultimas = await consultarEtiquetasDe(declaraciones.map((d) => d.paquete), { registro: r.url });
    const a = analizar({ declaraciones, ultimas, desvios });

    // express no puede estar propuesto: su `latest` no es una version.
    assert.equal(propuestas(a).some((f) => f.paquete === "express"), false, "el payload del registro llego a proponerse");
    assert.equal(a.sinRespuesta.some((f) => f.paquete === "express"), true, "express tendria que estar en 'no se sabe nada'");
    assert.equal(a.alDia.some((f) => f.paquete === "express"), false, "express se conto como al dia sin haberse sabido nada");

    const candidatos = propuestas(a).map((f) => ({ ...f, clase: a.mayores.includes(f) ? "mayor" : "menor" }));
    const p = preguntadorDeMentira(["s", "todo"]);
    const { elegidos } = await decidir({ a, candidatos, preguntar: p.preguntar });
    const escrito = escribirCambios(raiz, elegidos);

    const despues = fs.readFileSync(abs, "utf8");
    const m = JSON.parse(despues); // sigue siendo JSON valido
    assert.equal(m.scripts, undefined, "el registro consiguio escribir un bloque scripts en el manifiesto");
    assert.equal(m.zzz, undefined);
    assert.equal(m.dependencies.express, "^4.18.0", "express se toco pese a no tener una version publicable");
    assert.equal(escrito.aplicados.some((c) => c.paquete === "express"), false);
    assert.equal(despues.includes("TE-EJECUTE"), false, "el payload aterrizo en el manifiesto");
    // typescript si tenia una version de verdad, asi que ese si se movio.
    assert.equal(m.devDependencies.typescript, "^7.0.2");
    assert.notEqual(antes, despues);
  } finally {
    fs.rmSync(raiz, { recursive: true, force: true });
    await r.cerrar();
  }
});

// ─────────────────────────── La herramienta, corrida ───────────────────────────

/** La herramienta, corrida de verdad y SIN bloquear este proceso.
 *
 *  `spawnSync` no sirve aca y esto está medido: el registro de mentira vive en
 *  ESTE proceso, y un spawn sincrono bloquea el bucle de eventos que tendria que
 *  atenderlo — o sea que el hijo se come el techo de 8 segundos por paquete y
 *  vuelve sin informe. Con `spawn` los dos corren a la vez, que es lo que la
 *  prueba necesita medir. `stdin` se cierra en el acto: es lo que hace que el
 *  hijo NO tenga TTY, que es la mitad de lo que estas pruebas afirman. */
function correr(args, env = {}) {
  return new Promise((listo) => {
    const hijo = spawn(process.execPath, [HERRAMIENTA, ...args], {
      env: { ...process.env, ...env },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    hijo.stdout.setEncoding("utf8");
    hijo.stderr.setEncoding("utf8");
    hijo.stdout.on("data", (d) => (stdout += d));
    hijo.stderr.on("data", (d) => (stderr += d));
    hijo.on("close", (status) => listo({ status, stdout, stderr }));
  });
}

test("banderas y errores de arranque, medidos sobre el proceso", async () => {
  const ayuda = await correr(["--help"]);
  assert.equal(ayuda.status, 0);
  assert.match(ayuda.stdout, /uso: node herramientas\/projects-versiones\.mjs/);
  const desconocida = await correr(["--nada"]);
  assert.equal(desconocida.status, 2);
  assert.match(desconocida.stderr, /argumento desconocido: --nada/);
  const sinValor = await correr(["--raiz"]);
  assert.equal(sinValor.status, 2);
  assert.match(sinValor.stderr, /--raiz necesita un valor/);
  const noExiste = await correr(["--raiz", path.join(os.tmpdir(), "no-existe-jamas-projects-versiones")]);
  assert.equal(noExiste.status, 1);
  assert.match(noExiste.stderr, /no encontre el arbol a mirar/);
});

test("sin package.json en el arbol: rojo, y el mensaje apunta a plantilla/", async () => {
  const raiz = arbolTemporal();
  try {
    const r = await correr(["--raiz", raiz]);
    assert.equal(r.status, 1);
    assert.match(r.stderr, /no hay ningun package\.json/);
    assert.match(r.stderr, /plantilla\//);
  } finally {
    fs.rmSync(raiz, { recursive: true, force: true });
  }
});

test("sin TTY: imprime el informe, avisa que no hay a quien preguntarle y NO toca un solo byte", async () => {
  const reg = await levantarRegistro({ tags: { express: "5.0.0", "@prisma/client": "7.10.0", typescript: "7.0.2", pnpm: "11.23.0" } });
  const raiz = arbolTemporal();
  try {
    const abs = escribir(raiz, "package.json", manifiestoDeEjemplo());
    const antes = sha(abs);
    const r = await correr(["--raiz", raiz], { PROJECTS_REGISTRO_NPM: reg.url });
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /== versiones declaradas vs la ultima estable publicada ==/);
    assert.match(r.stdout, /NO hay terminal \(stdin no es un TTY\)/);
    assert.equal(sha(abs), antes, "se escribio el manifiesto sin que nadie contestara nada");
  } finally {
    fs.rmSync(raiz, { recursive: true, force: true });
    await reg.cerrar();
  }
});

test("--solo-informe: nunca pregunta, aunque hubiera terminal", async () => {
  const reg = await levantarRegistro({ tags: { express: "5.0.0", "@prisma/client": "7.10.0", typescript: "7.0.2", pnpm: "11.23.0" } });
  const raiz = arbolTemporal();
  try {
    const abs = escribir(raiz, "package.json", manifiestoDeEjemplo());
    const antes = sha(abs);
    const r = await correr(["--raiz", raiz, "--solo-informe"], { PROJECTS_REGISTRO_NPM: reg.url });
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /Se pidio --solo-informe: no se pregunta ni se escribe nada/);
    assert.equal(sha(abs), antes);
  } finally {
    fs.rmSync(raiz, { recursive: true, force: true });
    await reg.cerrar();
  }
});

test("sin red: avisa que es la red y NO se pone rojo", async () => {
  const raiz = arbolTemporal();
  try {
    const abs = escribir(raiz, "package.json", manifiestoDeEjemplo());
    const antes = sha(abs);
    // Puerto 9 (discard): acepta o rechaza, pero nunca contesta un dist-tags.
    const r = await correr(["--raiz", raiz], { PROJECTS_REGISTRO_NPM: "http://127.0.0.1:9" });
    assert.equal(r.status, 0, "una herramienta de consulta que se pone roja sin red es una senal falsa");
    assert.match(r.stderr, /no se pudo consultar NINGUNO/);
    assert.match(r.stderr, /falta de red o un registro inalcanzable, no un stack atrasado/);
    assert.equal(sha(abs), antes);
  } finally {
    fs.rmSync(raiz, { recursive: true, force: true });
  }
});

test("un directorio ilegible NO deja sin informe al resto del arbol", { skip: SIN_CHMOD ? "chmod 000 no bloquea en esta plataforma o con este usuario" : false }, async () => {
  const reg = await levantarRegistro({ tags: { express: "4.18.0", "@prisma/client": "7.9.1", typescript: "7.0.0", pnpm: "11.0.0" } });
  const raiz = arbolTemporal();
  const cerrado = path.join(raiz, "cerrado");
  try {
    escribir(raiz, "package.json", manifiestoDeEjemplo());
    fs.mkdirSync(cerrado);
    fs.chmodSync(cerrado, 0o000);
    const r = await correr(["--raiz", raiz], { PROJECTS_REGISTRO_NPM: reg.url });
    assert.equal(r.status, 0, `salio ${r.status}; stderr: ${r.stderr}`);
    assert.match(r.stdout, /== versiones declaradas vs la ultima estable publicada ==/, "se perdio el informe entero");
    assert.match(r.stderr, /::warning::cerrado: no pude listar ese directorio/);
    assert.equal(/ningun control de esta herramienta atrapo/.test(r.stderr), false, "murio por una excepcion");
  } finally {
    fs.chmodSync(cerrado, 0o755);
    fs.rmSync(raiz, { recursive: true, force: true });
    await reg.cerrar();
  }
});
