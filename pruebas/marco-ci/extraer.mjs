// Extractor del banco de marco-ci.yml.
//
// POR QUE EXISTE ESTE ARCHIVO. Los guardrails de marco-ci.yml van INLINE en el
// YAML y no pueden salir de ahi: marco-ci.yml es un workflow reusable, asi que
// cuando lo llama un consumidor el arbol checkouteado es el DEL CONSUMIDOR y
// ningun archivo de Projects esta presente. Ese es el motivo por el que el codigo
// vive dentro del bloque "run:" y no en un .mjs al lado, y tambien el motivo por
// el que esos pasos eran los unicos del marco SIN banco de pruebas: la auditoria
// del 2026-08-20 lo anoto como hueco ("es el unico de los pasos medidos que no
// tiene banco") justo despues de medir cuatro defectos que salian en VERDE.
//
// La salida es levantar el banco alrededor del texto que corre de verdad: se lee
// marco-ci.yml, se extrae el script EXACTO del paso y se ejecuta contra fixtures.
// No hay copia del codigo en el banco —una copia se desincroniza y miente—, y por
// eso el extractor tambien falla ruidoso: si un paso se renombra o pierde su
// bloque "run:", esto tira y el banco se pone rojo en vez de dejar de probar en
// silencio.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
export const RUTA_WORKFLOW = join(RAIZ, ".github", "workflows", "marco-ci.yml");

/**
 * El script de bash de un paso, dedentado, tal cual lo recibe el runner.
 */
export function scriptDelPaso(nombre, ruta = RUTA_WORKFLOW) {
  const lineas = readFileSync(ruta, "utf8").split(/\r?\n/);
  const inicio = lineas.findIndex((l) => l.trim() === `- name: ${nombre}`);
  if (inicio === -1) {
    throw new Error(`no existe ningun paso llamado "${nombre}" en ${ruta}`);
  }

  let sangria = -1;
  let indiceRun = -1;
  for (let i = inicio + 1; i < lineas.length; i += 1) {
    if (/^\s*- name: /.test(lineas[i])) break;
    const marca = lineas[i].match(/^(\s*)run: \|\s*$/);
    if (marca) {
      sangria = marca[1].length;
      indiceRun = i;
      break;
    }
  }
  if (indiceRun === -1) {
    throw new Error(`el paso "${nombre}" no tiene un bloque "run: |" propio`);
  }

  const cuerpo = [];
  for (let i = indiceRun + 1; i < lineas.length; i += 1) {
    const linea = lineas[i];
    if (linea.trim() === "") {
      cuerpo.push("");
      continue;
    }
    const propia = linea.length - linea.replace(/^\s+/, "").length;
    if (propia <= sangria) break;
    cuerpo.push(linea.slice(sangria + 2));
  }
  while (cuerpo.length > 0 && cuerpo[cuerpo.length - 1] === "") cuerpo.pop();
  if (cuerpo.length === 0) {
    throw new Error(`el bloque "run:" del paso "${nombre}" quedo vacio`);
  }
  return `${cuerpo.join("\n")}\n`;
}

/**
 * El programa que el paso le pasa a `node -e`.
 *
 * Se devuelve TAL CUAL, sin desescapar nada: dentro del bloque viaja entre
 * comillas simples de shell, asi que lo que hay es JavaScript valido donde la
 * comilla simple se escribe \x27 —un escape del propio JavaScript, no del
 * YAML—. Los tests lo corren con `node -e <programa>` y no desde un archivo,
 * porque con -e el primer argumento extra es process.argv[1] y desde un archivo
 * seria argv[2]: correrlo distinto probaria otra cosa.
 */
export function programaNode(script, nombrePaso = "(script)") {
  const lineas = script.split("\n");
  const inicio = lineas.findIndex((l) => /node -e '$/.test(l));
  if (inicio === -1) {
    throw new Error(`el script de "${nombrePaso}" no abre ningun programa con "node -e '"`);
  }
  const cuerpo = [];
  for (let i = inicio + 1; i < lineas.length; i += 1) {
    if (/^\s*'(\s|$)/.test(lineas[i])) {
      return cuerpo.join("\n");
    }
    cuerpo.push(lineas[i]);
  }
  throw new Error(`el programa de "${nombrePaso}" no cierra su comilla simple`);
}

/**
 * El valor de --log-opts que el paso le pasa al detector, con el rango puesto.
 * Se lee del YAML a proposito: si alguien saca la bandera que destapa los
 * merges, el test que la necesita se cae con ella.
 */
export function logOptsDelPaso(script, desde, hasta) {
  const marca = script.match(/--log-opts="([^"]*)"/);
  if (!marca) {
    throw new Error("el paso no pasa ningun --log-opts al detector de secretos");
  }
  return marca[1]
    .split("${DESDE}")
    .join(desde)
    .split("${HASTA}")
    .join(hasta)
    .split(/\s+/)
    .filter(Boolean);
}

/**
 * El ERE del prefiltro de git grep, leido del YAML.
 *
 * Se lee y no se copia porque el banco tiene que poder afirmar la relacion
 * "el prefiltro NO es mas angosto que el lector" sobre el patron que corre de
 * verdad. Una copia del patron en el banco desincroniza en el primer arreglo y
 * la afirmacion pasa a valer sobre un patron que ya no existe, que es la forma
 * exacta en la que un banco empieza a mentir en verde.
 */
export function patronDelPrefiltro(script, nombrePaso = "(script)") {
  const marca = script.match(/git\b[^\n]*\bgrep\b[^\n]*-E '([^']*)'/);
  if (!marca) {
    throw new Error(`el script de "${nombrePaso}" no trae ningun prefiltro "git grep -E"`);
  }
  return marca[1];
}

/**
 * El alfabeto de ejecutores que el lector usa, leido de su propio codigo.
 *
 * Devuelve pares { gestor, sub }, con sub vacio para los ejecutores directos.
 * Es lo que permite GENERAR el corpus del banco en vez de enumerarlo: si manana
 * entra un gestor nuevo al alfabeto, las entradas generadas lo cubren solas. Una
 * lista escrita a mano en el banco solo puede recorrer los casos que alguien ya
 * penso, y por eso no puede encontrar un miembro nuevo de la clase.
 */
export function alfabetoDelPaso(programa, nombrePaso = "(programa)") {
  const marca = programa.match(/const ALFABETO = "([^"]*)"/);
  if (!marca) {
    throw new Error(`el programa de "${nombrePaso}" no declara ningun ALFABETO`);
  }
  const pares = marca[1]
    .split(",")
    .filter(Boolean)
    .map((par) => {
      const corte = par.indexOf("=");
      if (corte === -1) throw new Error(`el par "${par}" del ALFABETO no tiene la forma gestor=subcomando`);
      return { gestor: par.slice(0, corte), sub: par.slice(corte + 1) };
    });
  if (pares.length === 0) throw new Error("el ALFABETO quedo vacio");
  return pares;
}
