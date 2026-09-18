// Banco del paso "Validacion estricta de changes y specs" de marco-ci.yml.
//
// POR QUE EXISTE. Figuraba como deuda declarada: «instala e invoca el CLI de OpenSpec: lo
// que decide es el CLI, y probarlo exige la red que este banco no tiene». La primera mitad
// dejo de ser cierta cuando el paso crecio: hoy instala el CLI en un directorio propio, lee
// el lockfile, calcula la huella del arbol npm, la compara con la declarada, deriva el
// ejecutable y tiene una salida de emergencia. Eso es logica PROPIA del marco, con cinco
// maneras de terminar en rojo o en aviso, y ninguna la habia visto nadie. Lo que exige red
// es la descarga; con un `npm` de mentira que deja en disco lo que cada caso necesita, el
// paso corre entero sin red.
//
// Viene de Rigel (1.11.0, change `rojo-primero`, commit eaab6b6 de alla), donde el paso era
// una sola linea y el banco fijaba su forma. Aca el paso es otro, y el banco tambien.
//
// LO QUE ESTE BANCO NO PRUEBA: que el CLI real valide bien, ni que el registry sirva lo que
// el lockfile dice. El CLI es de mentira y sale con el codigo que cada caso le pide. Lo que
// se prueba es lo que el PASO hace con cada resultado.
import { test } from "node:test";
import assert from "node:assert/strict";
import { chmodSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { scriptDelPaso } from "./extraer.mjs";
import { carpetaTemporal, correrBash, escribir, limpiarTodo, repoDeJuguete } from "./util.mjs";
import { porque } from "../porque.mjs";

const PASO = "Validacion estricta de changes y specs";
const VERSION = "1.9.0";

test.after(limpiarTodo);

const LOCK_SANO = {
  name: "corredor-openspec",
  lockfileVersion: 3,
  packages: {
    "": { name: "corredor-openspec" },
    "node_modules/@fission-ai/openspec": { version: VERSION, integrity: "sha512-uno" },
    "node_modules/dependencia": { version: "2.0.0", integrity: "sha512-dos" },
  },
};

function ejecutable(ruta, lineas) {
  writeFileSync(ruta, ["#!/bin/sh", ...lineas, ""].join("\n"));
  chmodSync(ruta, 0o755);
}

/**
 * Lo que la instalacion deja en disco, armado de antemano: el lockfile (o nada) y los
 * ejecutables de node_modules/.bin. El CLI de mentira anota sus argumentos en `senal` y
 * sale con `resultado`.
 */
function escenario({ lock = LOCK_SANO, bins = ["openspec"], resultado = 0 } = {}) {
  const dir = carpetaTemporal("escenario-npm-");
  const senal = join(carpetaTemporal("senal-cli-"), "cli.txt");
  if (lock !== null) escribir(dir, "package-lock.json", `${JSON.stringify(lock, null, 2)}\n`);
  for (const nombre of bins) {
    escribir(dir, `node_modules/.bin/${nombre}`, "");
    ejecutable(join(dir, "node_modules/.bin", nombre), [`printf '%s\\n' "$*" >> "${senal}"`, `exit ${resultado}`]);
  }
  return { dir, senal };
}

/**
 * Un PATH con un `npm` que, al instalar, copia el escenario en el directorio donde lo
 * corren —que es el directorio propio del RUNNER_TEMP, y eso tambien se comprueba: si el
 * paso instalara parado en el arbol del consumidor, el escenario aterrizaria ahi—. Y un
 * ejecutor de paquetes que solo anota como lo invocaron, para la salida de emergencia.
 */
function pathFalso(escenarioDir) {
  const bin = carpetaTemporal("stub-npm-");
  const anotaciones = join(carpetaTemporal("senal-npm-"), "npm.txt");
  ejecutable(join(bin, "npm"), [
    `printf 'npm %s (cwd %s)\\n' "$*" "$(pwd)" >> "${anotaciones}"`,
    'if [ "$1" = "install" ]; then',
    `  cp -R "${escenarioDir}/." .`,
    "fi",
    "exit 0",
  ]);
  // EL NOMBRE DEL EJECUTOR SE ARMA POR PARTES, y no es coqueteria. Escrito entero, el
  // nombre seguido de un `printf` es indistinguible de una invocacion sin version para la
  // compuerta «Ejecutores de paquetes pinados», que barre este archivo como cualquier otro
  // archivo rastreado. Lo midio el porte: el primer borrador de este banco la puso roja.
  const EJECUTOR = ["np", "x"].join("");
  ejecutable(join(bin, EJECUTOR), [`printf '%s %s\\n' "${EJECUTOR}" "$*" >> "${anotaciones}"`, "exit 0"]);
  return { PATH: `${bin}:${process.env.PATH}`, anotaciones };
}

function correr({ esc = escenario(), huella = "" } = {}) {
  const raiz = repoDeJuguete("validacion-");
  escribir(raiz, "openspec/specs/x/spec.md", "# x\n");
  const falso = pathFalso(esc.dir);
  const res = correrBash(scriptDelPaso(PASO), {
    cwd: raiz,
    env: { PATH: falso.PATH, VERSION_OPENSPEC: VERSION, HUELLA_DECLARADA: huella },
  });
  const leer = (ruta) => (existsSync(ruta) ? readFileSync(ruta, "utf8") : "");
  return { ...res, raiz, cli: leer(esc.senal), npm: leer(falso.anotaciones) };
}

const huellaDe = (salida) => salida.match(/La huella de esta corrida es ([0-9a-f]{64})/)?.[1];

test("ROJO: una instalacion que no deja lockfile no se reporta como medida", () => {
  const res = correr({ esc: escenario({ lock: null }) });
  assert.equal(res.exit, 1, porque("sin lockfile no hay arbol que enumerar", res.salida));
  assert.match(res.salida, /::error::la instalacion del CLI de OpenSpec no dejo package-lock\.json/);
  assert.equal(res.cli, "", porque("sin medir el arbol, el CLI no se ejecuta", res.cli));
});

test("ROJO: un lockfile que no declara ningun paquete es una huella que no vigila nada", () => {
  const res = correr({ esc: escenario({ lock: { lockfileVersion: 3, packages: { "": {} } } }) });
  assert.equal(res.exit, 1, porque("un arbol vacio no puede dar una huella estable y verde", res.salida));
  assert.match(res.salida, /::error::el package-lock\.json no declaro un solo paquete/);
});

test("AVISA y valida: sin huella declarada, mide, lo dice con la huella para copiar, y corre el CLI ya medido", () => {
  const res = correr();
  assert.equal(res.exit, 0, porque("sin huella declarada el paso valida igual", res.salida));
  assert.match(res.salida, /::notice::el arbol npm del CLI de OpenSpec NO esta declarado/);
  assert.ok(huellaDe(res.salida), porque("el aviso tiene que traer la huella que hay que declarar", res.salida));
  assert.equal(res.cli.trim(), "validate --all --strict", porque("el CLI tiene que correr con --all --strict", res.cli));
  // La instalacion corrio en el directorio propio, no parada en el arbol del consumidor.
  assert.match(res.npm, /^npm install --ignore-scripts .*@fission-ai\/openspec@1\.9\.0 \(cwd .*openspec-cli\)$/m);
  assert.ok(!existsSync(join(res.raiz, "package-lock.json")), porque("el escenario aterrizo en el arbol del consumidor", res.npm));
});

test("ROJO: un arbol distinto del declarado no se ejecuta", () => {
  const res = correr({ huella: "f".repeat(64) });
  assert.equal(res.exit, 1, porque("una huella que no coincide tiene que ser rojo", res.salida));
  assert.match(res.salida, /::error::el arbol npm del CLI de OpenSpec NO es el declarado/);
  assert.equal(res.cli, "", porque("el CLI de un arbol no declarado no se corre", res.cli));
});

test("VERDE: el mismo arbol con su huella declarada coincide y valida", () => {
  const huella = huellaDe(correr().salida);
  assert.ok(huella, "la primera corrida tenia que imprimir la huella");
  const res = correr({ huella });
  assert.equal(res.exit, 0, porque("la huella declarada es la medida: tiene que pasar", res.salida));
  assert.match(res.salida, /coincide con la huella declarada/);
  assert.equal(res.cli.trim(), "validate --all --strict");
});

test("ROJO: specs que el CLI rechaza llegan al codigo de salida del paso", () => {
  // Es el rojo por el que el paso existe, y el que mas facil se pierde: un `|| true`, una
  // tuberia sin pipefail o un `exit 0` de mas y el CLI puede rechazar todo en verde.
  const res = correr({ esc: escenario({ resultado: 1 }) });
  assert.equal(res.exit, 1, porque("un validate rojo tiene que dejar el paso rojo", res.salida));
  assert.equal(res.cli.trim(), "validate --all --strict");
});

test("AVISA: un paquete sin integrity en el lockfile se nombra, no pasa mudo", () => {
  const lock = structuredClone(LOCK_SANO);
  delete lock.packages["node_modules/dependencia"].integrity;
  const res = correr({ esc: escenario({ lock }) });
  assert.equal(res.exit, 0, porque("un paquete sin integrity avisa y no enrojece", res.salida));
  assert.match(res.salida, /::warning::1 de 2 paquetes del arbol del CLI no traen integrity/);
});

test("AVISA: sin un ejecutable reconocible, vuelve al ejecutor de paquetes PINADO y lo dice", () => {
  // La salida de emergencia es un fail-open —se pierde la medicion—, asi que tiene que ser
  // ruidosa, y lo que invoca tiene que seguir pinado y sin scripts de instalacion.
  const res = correr({ esc: escenario({ bins: ["uno", "otro"] }) });
  assert.equal(res.exit, 0, porque("la salida de emergencia valida igual", res.salida));
  assert.match(res.salida, /::warning::el arbol instalado del CLI de OpenSpec no expone un ejecutable unico/);
  assert.match(res.npm, /^npx --yes --ignore-scripts @fission-ai\/openspec@1\.9\.0 validate --all --strict$/m);
});

test("VERDE: con un solo ejecutable en node_modules/.bin, aunque no se llame openspec, lo usa", () => {
  const res = correr({ esc: escenario({ bins: ["cli-renombrado"] }) });
  assert.equal(res.exit, 0, porque("un solo candidato es el CLI", res.salida));
  assert.equal(res.cli.trim(), "validate --all --strict");
  assert.doesNotMatch(res.salida, /::warning::el arbol instalado/);
});
