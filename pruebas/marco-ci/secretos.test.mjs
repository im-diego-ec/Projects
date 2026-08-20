// Banco del paso "Sin secretos en el repo (arbol y historia del cambio)".
//
// LIMITE DECLARADO Y NO NEGOCIADO: gitleaks no esta en esta maquina ni se baja en
// el banco, asi que aca NO corre el detector. Lo que el banco prueba son las tres
// piezas del paso que no son la herramienta, y las prueba por codigo de salida:
//
//   1. El CRUCE con las declaraciones de falso positivo. Es el programa de
//      `node -e` del propio paso, alimentado con reportes JSON sinteticos con la
//      forma que el detector emite. Ahi vive el agujero que salia en VERDE.
//   2. El rojo por PRESENCIA de los archivos de excepcion de la herramienta, que
//      ocurre ANTES de bajar el binario. Se afirma con un stub de curl que deja
//      una sena en disco: si el paso llego a la descarga, la sena esta; si corto
//      antes, no. Es existencia de archivo, no texto de log.
//   3. Que las banderas que el paso le pasa a `git log` destapen el diff de un
//      merge. Se corre git de verdad sobre un fixture con la resolucion del
//      merge; no prueba que el detector lo marque, prueba que el texto llega.
//
// Ninguna de las tres reemplaza una corrida real con el binario, y eso se dice
// aca en vez de dejarlo sobreentendido.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { execFileSync, spawnSync } from "node:child_process";
import { join } from "node:path";

import { scriptDelPaso, programaNode, logOptsDelPaso } from "./extraer.mjs";
import {
  repoDeJuguete,
  escribir,
  git,
  commit,
  correrBash,
  correrNode,
  carpetaTemporal,
  stubCurlQueFalla,
  limpiarTodo,
} from "./util.mjs";

const PASO = "Sin secretos en el repo (arbol y historia del cambio)";
const script = scriptDelPaso(PASO);
const programa = programaNode(script, PASO);

const DECLARACIONES = ".projects-falsos-positivos.json";

// El detector se pina por version en los inputs del workflow; el banco no la
// necesita salvo para armar la URL que el stub de curl intercepta.
const VERSION = "8.30.1";

test.after(limpiarTodo);

// ---------------------------------------------------------------------------
// 1. El cruce con las declaraciones
// ---------------------------------------------------------------------------

function hallazgo(archivo, regla, linea, commitSha) {
  return {
    File: archivo,
    RuleID: regla,
    StartLine: linea,
    Commit: commitSha ?? "",
    Description: "clave con forma conocida",
    // El paso NO lee estos campos a proposito. Van en el fixture igual, para
    // que el dia que alguien los empiece a leer el banco lo tenga a mano.
    Secret: "REDACTED",
    Match: "REDACTED",
  };
}

function cruzar({ arbol = [], historia = null, declaraciones = null }) {
  const raiz = carpetaTemporal("cruce-");
  const rutaArbol = join(raiz, "arbol.json");
  escribir(raiz, "arbol.json", JSON.stringify(arbol));
  let rutaHistoria = "";
  if (historia !== null) {
    escribir(raiz, "historia.json", JSON.stringify(historia));
    rutaHistoria = join(raiz, "historia.json");
  }
  if (declaraciones !== null) {
    escribir(raiz, DECLARACIONES, JSON.stringify({ secretos: declaraciones }, null, 2));
  }
  return correrNode(programa, {
    cwd: raiz,
    env: {
      ARCHIVO_DECLARACIONES: DECLARACIONES,
      REPORTE_ARBOL: rutaArbol,
      REPORTE_HISTORIA: rutaHistoria,
      HISTORIA_CORRIO: historia === null ? "false" : "true",
      GITHUB_STEP_SUMMARY: "",
    },
  });
}

const CLAVES = "api/src/pruebas/claves-de-ejemplo.ts";
const REGLA = "generic-api-key";
const DOS_FALSOS = [
  { archivo: CLAVES, regla: REGLA, motivo: "claves de ejemplo del banco de la API", hallazgos: 2 },
];

test("secretos · refutacion · una declaracion no absorbe una coincidencia nueva de la historia", () => {
  // El caso medido el 2026-08-20: arbol 2, historia 1, max(2,1) = 2 = declarado,
  // y el paso salia exit 0 diciendo "3 hallazgo(s): 0 sin declarar". La
  // coincidencia de la historia entro y se borro DENTRO del PR, o sea que no
  // esta en ninguna de las dos lineas que la declaracion cubre.
  const { exit, salida } = cruzar({
    arbol: [hallazgo(CLAVES, REGLA, 12), hallazgo(CLAVES, REGLA, 34)],
    historia: [hallazgo(CLAVES, REGLA, 88, "d395cda8ebef")],
    declaraciones: DOS_FALSOS,
  });
  assert.equal(exit, 1, `la coincidencia nueva quedo absorbida:\n${salida}`);
  assert.ok(
    !/0 sin declarar/.test(salida),
    `el resumen afirmo "0 sin declarar" sobre un hallazgo que no cruzo con nada:\n${salida}`,
  );
});

test("secretos · control · el arbol exacto sigue en verde", () => {
  const { exit, salida } = cruzar({
    arbol: [hallazgo(CLAVES, REGLA, 12), hallazgo(CLAVES, REGLA, 34)],
    historia: [],
    declaraciones: DOS_FALSOS,
  });
  assert.equal(exit, 0, salida);
});

test("secretos · control · el falso positivo que el PR vuelve a tocar no enrojece", () => {
  // La misma linea que la declaracion ya cubre en el arbol: es el mismo falso
  // positivo, y obligar a declarar un numero por plano lo habria puesto rojo.
  const { exit, salida } = cruzar({
    arbol: [hallazgo(CLAVES, REGLA, 12), hallazgo(CLAVES, REGLA, 34)],
    historia: [hallazgo(CLAVES, REGLA, 12, "aa11bb22cc33")],
    declaraciones: DOS_FALSOS,
  });
  assert.equal(exit, 0, `un falso positivo ya declarado no puede enrojecer por tocarlo:\n${salida}`);
});

test("secretos · control · el arbol con una coincidencia de mas es rojo", () => {
  const { exit, salida } = cruzar({
    arbol: [hallazgo(CLAVES, REGLA, 12), hallazgo(CLAVES, REGLA, 34)],
    historia: [],
    declaraciones: [{ archivo: CLAVES, regla: REGLA, motivo: "una sola linea revisada" }],
  });
  assert.equal(exit, 1, `el default de un hallazgo dejo pasar dos:\n${salida}`);
});

test("secretos · control · una declaracion sin hallazgo es muerta y roja", () => {
  const { exit, salida } = cruzar({ arbol: [], historia: [], declaraciones: DOS_FALSOS });
  assert.equal(exit, 1, `una declaracion que no cubre nada reparte permiso sobre la nada:\n${salida}`);
});

test("secretos · control · sin declaraciones, cualquier hallazgo es rojo", () => {
  const { exit, salida } = cruzar({ arbol: [hallazgo(CLAVES, REGLA, 12)], historia: [] });
  assert.equal(exit, 1, salida);
});

test("secretos · control · un hallazgo solo en la historia es rojo", () => {
  const { exit, salida } = cruzar({
    arbol: [],
    historia: [hallazgo("infra/dev.tfvars", "aws-access-token", 4, "0f0f0f0f0f0f")],
  });
  assert.equal(exit, 1, `el secreto que entro y se borro tiene que enrojecer:\n${salida}`);
});

test("secretos · control · una declaracion sin motivo es invalida y roja", () => {
  const { exit, salida } = cruzar({
    arbol: [hallazgo(CLAVES, REGLA, 12)],
    historia: [],
    declaraciones: [{ archivo: CLAVES, regla: REGLA }],
  });
  assert.equal(exit, 1, `una excepcion sin razon escrita no es una excepcion:\n${salida}`);
});

// ---------------------------------------------------------------------------
// 2. El rojo por presencia de los archivos de excepcion de la herramienta
// ---------------------------------------------------------------------------

function correrPasoHasta(archivos, { rastrear }) {
  const raiz = repoDeJuguete("secretos-");
  escribir(raiz, "README.md", "repo de juguete\n");
  commit(raiz, "base");
  for (const [ruta, contenido] of Object.entries(archivos)) {
    escribir(raiz, ruta, contenido);
  }
  if (rastrear) {
    git(raiz, "add", "-A");
    commit(raiz, "agrega los archivos de excepcion");
  }
  const senal = join(carpetaTemporal("senal-"), "curl-fue-invocado.txt");
  const bin = stubCurlQueFalla(senal);
  const corrida = correrBash(script, {
    cwd: raiz,
    env: {
      PATH: `${bin}${process.platform === "win32" ? ";" : ":"}${process.env.PATH}`,
      VERSION_GITLEAKS: VERSION,
      DECLARACIONES,
      BASE_PR: "",
      HEAD_PR: "",
      ANTES: "",
      GITLEAKS_CONFIG: "",
      GITLEAKS_CONFIG_TOML: "",
      GITHUB_EVENT_NAME: "pull_request",
      GITHUB_SHA: git(raiz, "rev-parse", "HEAD").trim(),
    },
  });
  return { ...corrida, intentoDescargar: existsSync(senal) };
}

const TOML_HOSTIL = "[extend]\nuseDefault = false\n";
const IGNORE_HOSTIL = "abc123:api/src/x.ts:generic-api-key:7\n";

test("secretos · control · el stub de curl esta vivo (si no, los casos de abajo pasan vacios)", () => {
  const { exit, intentoDescargar } = correrPasoHasta({}, { rastrear: false });
  assert.equal(exit, 1, "sin detector el paso es rojo a proposito");
  assert.ok(
    intentoDescargar,
    "el paso no llego a la descarga en el caso limpio: la sena no mide nada y los casos de presencia serian vacios",
  );
});

for (const [nombre, archivo, contenido] of [
  ["gitleaks.toml", ".gitleaks.toml", TOML_HOSTIL],
  ["gitleaksignore", ".gitleaksignore", IGNORE_HOSTIL],
]) {
  test(`secretos · refutacion · ${nombre} SIN RASTREAR corta antes de bajar el detector`, () => {
    const { exit, intentoDescargar, salida } = correrPasoHasta(
      { [archivo]: contenido },
      { rastrear: false },
    );
    assert.equal(exit, 1, `${archivo} sin rastrear tiene que ser rojo:\n${salida}`);
    assert.ok(
      !intentoDescargar,
      `el paso siguio hasta la descarga con ${archivo} en el disco: el rojo se decidia por el indice y no por el disco`,
    );
  });

  test(`secretos · control · ${nombre} versionado sigue siendo rojo`, () => {
    const { exit, intentoDescargar, salida } = correrPasoHasta(
      { [archivo]: contenido },
      { rastrear: true },
    );
    assert.equal(exit, 1, `${archivo} versionado tiene que ser rojo:\n${salida}`);
    assert.ok(!intentoDescargar, `${archivo} versionado tiene que cortar antes del binario`);
  });
}

test("secretos · el paso escribe su propia config y la pasa a los DOS planos", () => {
  // La precedencia documentada de la herramienta es
  //   --config > GITLEAKS_CONFIG > GITLEAKS_CONFIG_TOML > <destino>/.gitleaks.toml
  // asi que sin --config el archivo del destino seguia decidiendo las reglas.
  // La existencia y el contenido de la config se afirman corriendo el paso; que
  // las DOS invocaciones la reciban es una asercion sobre el texto del paso, y
  // se declara como tal: sin el binario no hay forma de medirlo por exit code.
  const { runnerTemp } = correrPasoHasta({}, { rastrear: false });
  const config = join(runnerTemp, "gitleaks-marco.toml");
  assert.ok(existsSync(config), "el paso no escribio su config antes de usar el detector");
  assert.match(readFileSync(config, "utf8"), /useDefault = true/);
  const invocaciones = script.match(/--config "\$\{CONFIG\}"/g) ?? [];
  assert.equal(
    invocaciones.length,
    2,
    "los dos planos tienen que recibir la config del marco: si uno no la recibe, ahi vuelve a decidir el .gitleaks.toml del destino",
  );
});

// ---------------------------------------------------------------------------
// 3. Las banderas de git log y el diff de un merge
// ---------------------------------------------------------------------------

/**
 * Fixture del flujo diario del marco: traer main a la rama de trabajo, meter el
 * secreto EN LA RESOLUCION del merge y borrarlo en el commit siguiente.
 *
 * La marca se arma por concatenacion a proposito: escrita entera, este archivo
 * quedaria con una clave con forma de credencial y el propio detector del marco
 * lo marcaria. El banco no puede pedir una excepcion para existir.
 */
function repoConSecretoEnUnMerge() {
  const marca = `${"AKIA"}${"IOSFODNN7EXAMPLE"}`;
  const raiz = repoDeJuguete("merge-");
  escribir(raiz, "config/app.env", "PLACEHOLDER=1\n");
  const base = commit(raiz, "base");

  git(raiz, "checkout", "--quiet", "-b", "trabajo");
  escribir(raiz, "config/app.env", "PLACEHOLDER=2\n");
  commit(raiz, "trabajo cambia el archivo");

  git(raiz, "checkout", "--quiet", "main");
  escribir(raiz, "config/app.env", "PLACEHOLDER=3\n");
  commit(raiz, "main cambia el mismo archivo");

  git(raiz, "checkout", "--quiet", "trabajo");
  // Choca a proposito: sin conflicto no hay resolucion, y sin resolucion no hay
  // contenido que viva SOLO en el commit de merge.
  spawnSync("git", ["-C", raiz, "merge", "--no-edit", "main"], { encoding: "utf8" });
  escribir(raiz, "config/app.env", `PLACEHOLDER=3\nAWS_ACCESS_KEY_ID=${marca}\n`);
  commit(raiz, "resuelve el merge");

  escribir(raiz, "config/app.env", "PLACEHOLDER=3\n");
  const cabeza = commit(raiz, "saca la credencial");

  return { raiz, base, cabeza, marca };
}

/**
 * Cuantas veces la marca aparece como linea AGREGADA. Solo las agregadas: el
 * detector lee lo que un commit INTRODUCE, asi que contar la linea de borrado
 * (el "-" del commit que saca la credencial) daria un verde falso — y de hecho
 * lo dio la primera vez que se escribio este banco.
 */
function agregadasConLaMarca(raiz, opts, marca) {
  const salida = execFileSync("git", ["-C", raiz, "log", "-p", ...opts], {
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
  });
  return salida.split(/\r?\n/).filter((l) => l.startsWith("+") && l.includes(marca)).length;
}

test("secretos · el fixture del merge de verdad esconde el secreto de git log -p", () => {
  // Control indispensable: si el fixture no reprodujera la supresion, el caso de
  // abajo pasaria sin probar nada.
  const { raiz, base, cabeza, marca } = repoConSecretoEnUnMerge();
  assert.equal(
    agregadasConLaMarca(raiz, [`${base}..${cabeza}`], marca),
    0,
    "el fixture no reproduce la supresion de los diffs de merge: el caso de abajo no probaria nada",
  );
});

test("secretos · refutacion · las banderas del paso destapan el diff del merge", () => {
  const { raiz, base, cabeza, marca } = repoConSecretoEnUnMerge();
  const opts = logOptsDelPaso(script, base, cabeza);
  assert.ok(
    agregadasConLaMarca(raiz, opts, marca) > 0,
    `con las banderas del paso (${opts.join(" ")}) el secreto de la resolucion del merge sigue invisible: el plano de la historia imprimiria "(arbol + historia del cambio)" sin haber mirado ahi`,
  );
});

test("secretos · control · las banderas del paso no esconden una rama lateral", () => {
  // El arreglo del caso del merge se puede escribir mal de una forma concreta y
  // silenciosa: --first-parent (en vez de --diff-merges=first-parent) recorta la
  // TRAVESIA y deja fuera los commits que entraron por una rama lateral. Ese
  // cambio destaparia el merge y taparia el caso que ya funcionaba. Este control
  // lo fija por codigo de salida.
  const marca = `${"AKIA"}${"IOSFODNN7EXAMPLE"}`;
  const raiz = repoDeJuguete("lateral-");
  escribir(raiz, "config/app.env", "PLACEHOLDER=1\n");
  const base = commit(raiz, "base");

  git(raiz, "checkout", "--quiet", "-b", "lateral");
  escribir(raiz, "config/app.env", `PLACEHOLDER=1\nAWS_ACCESS_KEY_ID=${marca}\n`);
  commit(raiz, "la credencial entra en una rama lateral");
  escribir(raiz, "config/app.env", "PLACEHOLDER=1\n");
  commit(raiz, "y se borra en el commit siguiente");

  git(raiz, "checkout", "--quiet", "main");
  git(raiz, "merge", "--no-edit", "--no-ff", "--no-gpg-sign", "lateral");
  const cabeza = git(raiz, "rev-parse", "HEAD").trim();

  const opts = logOptsDelPaso(script, base, cabeza);
  assert.ok(
    agregadasConLaMarca(raiz, opts, marca) > 0,
    `con las banderas del paso (${opts.join(" ")}) el secreto que entro por una rama lateral y se borro despues quedo invisible`,
  );
});
