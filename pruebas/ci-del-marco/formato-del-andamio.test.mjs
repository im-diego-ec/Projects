// BANCO DEL PASO «El andamio y lo que el init escribe pasan el formateador».
//
// QUE CIERRA. El CI del marco no corria el formateador sobre `plantilla/` en
// ninguna parte, y el andamio pinaba un RANGO (`^3.9.6`). Medido el 2026-09-17
// con prettier 3.9.6: 15 archivos de `plantilla/` no pasaban `prettier --check`,
// y un repo instanciado con `--sin-arranque` —la via de `personalizar.yml`—
// nacia con `format:check` en rojo en las 24 combinaciones de forma, plataforma,
// tipo de cuenta y largo de nombres. El paso `formateado` del arranque lo tapaba
// en la otra via, y ese era el problema: tapaba, y el primer commit de cada
// proyecto traia reformateados archivos que publica el marco.
//
// ORIGEN: Rigel 1.13.0 (change `2026-08-31-andamio-con-aplicacion`, commits
// 7ceb40e y 40a7bce) corre el formateador sobre su andamio con la version
// DERIVADA de su manifiesto, pinada exacta. Projects agrega lo que Rigel no
// necesitaba: el sujeto no es solo `plantilla/` sino lo que `projects init`
// escribe encima, forma por forma, porque aca las podas y las sustituciones
// cambian el texto (commit c8b4fff de Rigel, "el control mide el destino").
//
// El banco no COPIA el script —una copia se desincroniza y miente—: lo extrae del
// YAML y lo corre contra un repositorio de juguete con un `npm` y un `prettier`
// falsos. Lo que se prueba es la ORQUESTACION: que la version se derive y sea
// exacta, que se instale la que se pidio, que se midan el andamio y cada destino,
// y que ningun camino termine en verde sin haber medido. Que el formato de
// verdad pase lo prueba la corrida real del paso en el CI del marco.
import test, { after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { scriptDelPaso } from "../marco-ci/extraer.mjs";
import { carpetaTemporal, correrBash, escribir, limpiarTodo } from "../marco-ci/util.mjs";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const CI = path.join(RAIZ, ".github", "workflows", "ci.yml");
const PASO = "El andamio y lo que el init escribe pasan el formateador";

after(limpiarTodo);

const script = scriptDelPaso(PASO, CI);

/** Una herramienta de init FALSA: exporta las listas que el paso deriva y, como
 *  programa, escribe en el destino un rastro de lo que recibio. Si la forma es
 *  la que se le indica por env, sale 1; si el nombre es largo y se le pide,
 *  deja un archivo `sucio` que el prettier falso rechaza. */
const INIT_FALSO = `
import fs from "node:fs";
import path from "node:path";
export const FORMAS = ["aplicacion", "sitio"];
export const PLATAFORMAS = ["aws", "ninguna"];
export const TIPOS_DE_CUENTA = ["usuario", "organizacion"];
export const LARGO_DE_NOMBRE_MEDIDO = 12;
const argv = process.argv.slice(2);
if (process.argv[1] && process.argv[1].endsWith("projects-init.mjs")) {
  if (argv.includes("--ejemplo")) {
    console.log(JSON.stringify({ forma: "aplicacion", PROYECTO: "corto", ORG: "Org" }, null, 2));
    process.exit(0);
  }
  const valores = JSON.parse(fs.readFileSync(argv[argv.indexOf("--valores") + 1], "utf8"));
  const destino = argv[argv.indexOf("--destino") + 1];
  if (process.env.INIT_FALLA_EN === valores.forma) { console.error("init falso: fallo"); process.exit(1); }
  fs.writeFileSync(path.join(destino, "valores-recibidos.json"), JSON.stringify(valores));
  fs.writeFileSync(path.join(destino, "argv.json"), JSON.stringify(argv));
  if (process.env.SUCIO_CON_LARGOS && valores.PROYECTO.length >= 12) fs.writeFileSync(path.join(destino, "sucio"), "x");
}
`;

/** Un `npm` falso: anota sus argumentos y deja un prettier falso en el prefijo,
 *  que dice la version que se le pidio (o la de VERSION_REAL, para simular que
 *  npm resolvio otra) y rechaza cualquier directorio con un archivo `sucio`. */
function binarios(dir) {
  const bin = path.join(dir, "bin");
  fs.mkdirSync(bin, { recursive: true });
  const npm = path.join(bin, "npm");
  fs.writeFileSync(
    npm,
    `#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");
const args = process.argv.slice(2);
fs.appendFileSync(process.env.RASTRO_NPM, JSON.stringify({ args, cwd: process.cwd() }) + "\\n");
const pedido = args.find((a) => a.startsWith("prettier@"));
const prefijo = args[args.indexOf("--prefix") + 1];
const binDir = path.join(prefijo, "node_modules", ".bin");
fs.mkdirSync(binDir, { recursive: true });
const version = process.env.VERSION_REAL || pedido.slice("prettier@".length);
const p = path.join(binDir, "prettier");
fs.writeFileSync(p, "#!/usr/bin/env node\\n" +
  "const fs = require('node:fs');\\n" +
  "if (process.argv.includes('--version')) { console.log(" + JSON.stringify(version) + "); process.exit(0); }\\n" +
  "fs.appendFileSync(process.env.RASTRO_PRETTIER, process.cwd() + '\\\\n');\\n" +
  "if (fs.existsSync('sucio')) { console.log('[warn] sucio'); console.log('[warn] Code style issues found in the above file.'); process.exit(1); }\\n" +
  "console.log('All matched files use Prettier code style!');\\n");
fs.chmodSync(p, 0o755);
`,
  );
  fs.chmodSync(npm, 0o755);
  return bin;
}

function repo({ prettier = "3.9.6", sucioElAndamio = false } = {}) {
  const raiz = carpetaTemporal("formato-del-andamio-");
  const devDependencies = prettier === null ? {} : { prettier };
  escribir(raiz, "plantilla/package.json", JSON.stringify({ name: "x", devDependencies }, null, 2));
  if (sucioElAndamio) escribir(raiz, "plantilla/sucio", "x");
  escribir(raiz, "herramientas/projects-init.mjs", INIT_FALSO);
  return raiz;
}

function correr(raiz, env = {}) {
  const trabajo = carpetaTemporal("formato-rastros-");
  const rastroNpm = path.join(trabajo, "npm.log");
  const rastroPrettier = path.join(trabajo, "prettier.log");
  fs.writeFileSync(rastroNpm, "");
  fs.writeFileSync(rastroPrettier, "");
  const bin = binarios(trabajo);
  const r = correrBash(script, {
    cwd: raiz,
    env: { PATH: `${bin}${path.delimiter}${process.env.PATH}`, RASTRO_NPM: rastroNpm, RASTRO_PRETTIER: rastroPrettier, ...env },
  });
  const npm = fs.readFileSync(rastroNpm, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
  const medidos = fs.readFileSync(rastroPrettier, "utf8").split("\n").filter(Boolean);
  return { ...r, npm, medidos };
}

test("el extractor encontro el paso", () => {
  assert.match(script, /prettier/, "el script del paso no menciona prettier: el extractor tomo otro bloque");
});

test("verde: mide el andamio y CADA combinacion, con la version exacta que declara el andamio", () => {
  const raiz = repo();
  const r = correr(raiz);
  assert.equal(r.exit, 0, r.salida);
  assert.equal(r.npm.length, 1, `npm tiene que correr una sola vez:\n${r.salida}`);
  const args = r.npm[0].args;
  assert.ok(args.includes("prettier@3.9.6"), `se instalo otra cosa que la version del andamio: ${args.join(" ")}`);
  assert.ok(args.includes("--ignore-scripts"), "la instalacion del formateador tiene que ir sin scripts");
  assert.ok(args.includes("--registry=https://registry.npmjs.org/"), "el registro tiene que ir explicito: un .npmrc del arbol no puede decidir de donde baja");
  assert.ok(!fs.realpathSync(r.npm[0].cwd).startsWith(fs.realpathSync(raiz)), "npm no puede correr parado en el arbol, donde un .npmrc decide su configuracion");
  const enElAndamio = r.medidos.filter((d) => fs.realpathSync(d) === fs.realpathSync(path.join(raiz, "plantilla")));
  assert.equal(enElAndamio.length, 1, `el andamio tiene que medirse una vez:\n${r.medidos.join("\n")}`);
  // 2 formas x 2 plataformas x 2 cuentas x 2 largos de nombres.
  assert.equal(r.medidos.length - 1, 16, `se esperaban 16 destinos medidos:\n${r.medidos.join("\n")}\n${r.salida}`);
});

test("los nombres largos llegan al init con el largo medido, y los cortos son los del ejemplo", () => {
  const raiz = repo();
  const r = correr(raiz);
  assert.equal(r.exit, 0, r.salida);
  const destinos = r.medidos.filter((d) => fs.existsSync(path.join(d, "valores-recibidos.json")));
  const nombres = destinos.map((d) => JSON.parse(fs.readFileSync(path.join(d, "valores-recibidos.json"), "utf8")).PROYECTO);
  assert.ok(nombres.includes("corto"), "ningun destino uso los valores del ejemplo");
  const largos = nombres.filter((n) => n !== "corto");
  assert.ok(largos.length > 0 && largos.every((n) => n.length === 12), `los largos tienen que medir LARGO_DE_NOMBRE_MEDIDO: ${largos.join(", ")}`);
  const argv = JSON.parse(fs.readFileSync(path.join(destinos[0], "argv.json"), "utf8"));
  assert.ok(argv.includes("--sin-arranque"), "sin --sin-arranque el arranque formatea y el paso mediria el formateador, no el andamio");
});

test("ROJO: el andamio declara un rango, y no se instala nada", () => {
  for (const rango of ["^3.9.6", "~3.9.6", ">=3.9.0", "3.9.x", "3.9.6 || 4.0.0", "latest"]) {
    const r = correr(repo({ prettier: rango }));
    assert.equal(r.exit, 1, `con "${rango}" el paso tenia que salir rojo:\n${r.salida}`);
    assert.match(r.salida, /no es una version exacta/, r.salida);
    assert.equal(r.npm.length, 0, "con un rango no se instala nada: mediria con una version que el proyecto no necesariamente instala");
  }
});

test("ROJO: el andamio no declara prettier", () => {
  const r = correr(repo({ prettier: null }));
  assert.equal(r.exit, 1, r.salida);
  assert.match(r.salida, /no declara prettier/, r.salida);
});

test("ROJO: npm instalo otra version que la pedida", () => {
  const r = correr(repo(), { VERSION_REAL: "3.9.7" });
  assert.equal(r.exit, 1, r.salida);
  assert.match(r.salida, /3\.9\.7/, r.salida);
  assert.equal(r.medidos.length, 0, "con otra version no se mide nada: el verde no valdria");
});

test("ROJO: el andamio mismo no pasa el formateador", () => {
  const r = correr(repo({ sucioElAndamio: true }));
  assert.equal(r.exit, 1, r.salida);
  assert.match(r.salida, /::error::el ANDAMIO no pasa el formateador/, r.salida);
});

test("ROJO: un destino con nombres largos no pasa, y el mensaje dice cual y que hacer", () => {
  const r = correr(repo(), { SUCIO_CON_LARGOS: "1" });
  assert.equal(r.exit, 1, r.salida);
  assert.match(r.salida, /::error::.*largos/, `el rojo tiene que nombrar la combinacion:\n${r.salida}`);
  assert.match(r.salida, /Arreglo/, "el mensaje de error tiene que traer el arreglo escrito");
});

test("ROJO: si el init falla en una forma, el paso no se declara verde", () => {
  const r = correr(repo(), { INIT_FALLA_EN: "sitio" });
  assert.equal(r.exit, 1, r.salida);
  assert.match(r.salida, /projects init fallo/, r.salida);
});

test("el paso DERIVA la version del manifiesto y no la escribe", () => {
  // Los comentarios se sacan antes de buscar: el propio paso explica el defecto
  // citando lo que YA NO hace, y un banco que se muerde el comentario mide la
  // explicacion y no el codigo.
  const codigo = script
    .split("\n")
    .filter((l) => !/^\s*#/.test(l))
    .join("\n");
  assert.match(codigo, /plantilla\/package\.json/, "el paso no lee plantilla/package.json");
  assert.doesNotMatch(codigo, /prettier@\d+\.\d+\.\d+/, "el paso volvio a fijar una version de prettier a mano");
  assert.doesNotMatch(codigo, /VERSION_PRETTIER\s*[:=]\s*["']?\d/, "el paso volvio a fijar una version de prettier a mano");
});
