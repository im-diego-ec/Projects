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
import { readdirSync, readFileSync } from "node:fs";
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

  // La sangria del guion del paso pedido: es la de TODOS los pasos de su lista.
  const sangriaDelPaso = lineas[inicio].length - lineas[inicio].replace(/^\s+/, "").length;

  let sangria = -1;
  let indiceRun = -1;
  for (let i = inicio + 1; i < lineas.length; i += 1) {
    // EL LIMITE ES CUALQUIER PASO, CON NOMBRE O SIN EL, y la diferencia no es teorica. Cortar
    // solo en `- name: ` se pasaba de largo cuando el paso siguiente arranca con `- id:`,
    // `- uses:`, `- if:` o cualquier otra clave, y entonces este extractor devolvia el `run:` DEL
    // SIGUIENTE como si fuera del paso pedido: el banco que lo pidio media el script de otro y
    // salia verde. Lo midio Rigel el 2026-09-03 (commit c12f831 de alla); aca estaba latente
    // porque ningun paso nombrado sin `run:` queda justo antes de uno sin nombre con `run:`.
    //
    // Y EL FIN DE LA LISTA TAMBIEN ES LIMITE: una linea con MENOS sangria que el guion (el job
    // siguiente, otra clave del job) cierra la lista de pasos. Sin eso, el ultimo paso de un job
    // sin `run:` se llevaba el primero del job de abajo. Los comentarios no cuentan: en YAML no
    // cierran nada, y el encabezado de un job puede tener comentarios a cualquier sangria.
    //
    // La sangria se toma del propio paso pedido y no se fija en un numero: el mismo extractor
    // lee marco-ci.yml, ci.yml y los workflows del andamio, y no tienen por que coincidir. Lo
    // fija pruebas/marco-ci/extraer.test.mjs.
    const linea = lineas[i];
    if (linea.trim() !== "" && !/^\s*#/.test(linea)) {
      const propia = linea.length - linea.replace(/^\s+/, "").length;
      if (propia < sangriaDelPaso) break;
      if (propia === sangriaDelPaso && /^\s*- /.test(linea)) break;
    }
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

// ---------------------------------------------------------------------------
// LOS PASOS DE UN ARCHIVO, TODOS, Y DONDE VIVEN LOS ARCHIVOS.
//
// POR QUE ESTO VIVE EN EL EXTRACTOR Y NO EN CADA BANCO QUE LO NECESITA. Dos bancos preguntan
// por los pasos de los workflows: `cobertura-de-los-pasos.test.mjs` —cual tiene banco, cual es
// deuda y cual no puede fallar— y `pruebas/docs/cobertura-de-requirements.test.mjs` —si un paso
// que la pagina de cobertura publica como compuerta puede de verdad ponerse rojo—. Con un lector
// en cada uno, el dia que discrepen una compuerta estaria "cubierta" para uno y "sin rojo" para
// el otro. Es la doctrina del marco: el mismo predicado no se copia.
//
// Y POR QUE HACIA FALTA UN LECTOR NUEVO. El recorrido que tenia `cobertura-de-los-pasos` partia
// de `run: |` y solo miraba marco-ci.yml: un paso `uses:`, un `run:` de una linea y cualquier
// archivo que no fuera ese quedaban afuera sin que nada lo dijera (change `rojo-primero`).
// ---------------------------------------------------------------------------

const sangriaDe = (linea) => linea.length - linea.replace(/^\s+/, "").length;
const esRelleno = (linea) => linea.trim() === "" || /^\s*#/.test(linea);
/** Un escalar de YAML sin sus comillas y sin el comentario de cola. */
const escalar = (valor) => {
  const v = valor.trim();
  if (/^".*"$|^'.*'$/.test(v)) return v.slice(1, -1);
  return v.replace(/\s+#.*$/, "");
};

/**
 * `continue-on-error` del JOB que contiene una lista `steps:`: es una clave HERMANA de `steps:`,
 * con su misma sangria y dentro del mismo bloque. Con el modificador en el job, ningun paso del
 * job puede poner la corrida en rojo, aunque ninguno lo declare.
 */
function continueOnErrorDelJob(lineas, indiceSteps, sangriaSteps) {
  const buscar = (desde, paso) => {
    for (let i = desde; i >= 0 && i < lineas.length; i += paso) {
      if (esRelleno(lineas[i])) continue;
      const propia = sangriaDe(lineas[i]);
      if (propia < sangriaSteps) return null;
      if (propia > sangriaSteps) continue;
      const m = lineas[i].match(/^\s*continue-on-error:\s*(.+?)\s*$/);
      if (m) return escalar(m[1]) === "false" ? null : { valor: escalar(m[1]), linea: i + 1, delJob: true };
    }
    return null;
  };
  return buscar(indiceSteps - 1, -1) ?? buscar(indiceSteps + 1, 1);
}

/**
 * Todos los pasos de un workflow o de un `action.yml`, en el orden del archivo.
 *
 * Cada paso sale con:
 *   linea            -> la linea (desde 1) del guion que lo abre
 *   nombre, id       -> sus claves, o null
 *   condicion        -> su `if:`, o null
 *   run              -> "bloque" (`run: |`, `run: >`...), "linea" (`run: <comando>`) o null
 *   textoRun         -> el comando, si el `run:` es de una linea
 *   largo            -> las lineas no vacias del bloque `run:`
 *   uses             -> la referencia sin comillas ni comentario, o null
 *   continueOnError  -> { valor, linea, delJob } si el paso o su job lo declaran con un valor
 *                       distinto de `false`; null si no. Una expresion `${{ }}` cuenta: puede
 *                       valer true, y "puede no fallar" no es una compuerta
 *   extraible        -> si `scriptDelPaso(nombre, ruta)` devuelve ESTE paso: nombre en la linea
 *                       del guion, bloque `run:` y primera aparicion de ese nombre en el archivo
 *                       (el extractor busca por nombre y se queda con la primera)
 *
 * SE RECORRE CADA LISTA `steps:` POR SANGRIA, no buscando `- name:`: un paso sin nombre —con
 * solo `id:`, `uses:` o `run:`— es un paso igual, y un recorrido que arranca en los nombres no
 * lo ve. Los comentarios no abren ni cierran nada.
 */
export function pasosDe(ruta) {
  const lineas = readFileSync(ruta, "utf8").split(/\r?\n/);
  const pasos = [];
  for (let i = 0; i < lineas.length; i += 1) {
    const marca = lineas[i].match(/^(\s*)steps:\s*(#.*)?$/);
    if (!marca) continue;
    const sangriaSteps = marca[1].length;
    const delJob = continueOnErrorDelJob(lineas, i, sangriaSteps);

    // La sangria del guion la fija el primer item: YAML admite el guion a la misma columna que
    // `steps:` o mas adentro, y los dos estilos existen.
    let sangriaItem = -1;
    let actual = null;
    const cerrar = () => {
      if (actual) pasos.push(actual);
      actual = null;
    };
    for (let j = i + 1; j < lineas.length; j += 1) {
      const linea = lineas[j];
      if (esRelleno(linea)) continue;
      const propia = sangriaDe(linea);
      if (sangriaItem === -1) {
        if (propia < sangriaSteps || !/^\s*- /.test(linea)) break;
        sangriaItem = propia;
      }
      if (propia < sangriaItem) break;
      let clave = null;
      if (propia === sangriaItem) {
        if (!/^\s*- /.test(linea)) break;
        cerrar();
        actual = {
          linea: j + 1,
          nombre: null,
          id: null,
          condicion: null,
          run: null,
          textoRun: null,
          largo: 0,
          uses: null,
          continueOnError: delJob,
          lineaNombre: null,
        };
        clave = linea.slice(sangriaItem + 2).match(/^([A-Za-z_-]+):\s*(.*)$/);
      } else if (propia === sangriaItem + 2) {
        clave = linea.slice(propia).match(/^([A-Za-z_-]+):\s*(.*)$/);
      }
      if (!actual || !clave) continue;
      const [, k, crudo] = clave;
      if (k === "name") {
        actual.nombre = escalar(crudo);
        actual.lineaNombre = j + 1;
      } else if (k === "id") actual.id = escalar(crudo);
      else if (k === "if") actual.condicion = escalar(crudo);
      else if (k === "uses") actual.uses = escalar(crudo);
      else if (k === "continue-on-error") {
        const valor = escalar(crudo);
        actual.continueOnError = valor === "false" ? null : { valor, linea: j + 1, delJob: false };
      } else if (k === "run") {
        const valor = escalar(crudo);
        if (/^[|>][-+0-9]*$/.test(valor)) {
          actual.run = "bloque";
          for (let k2 = j + 1; k2 < lineas.length; k2 += 1) {
            if (lineas[k2].trim() === "") continue;
            if (sangriaDe(lineas[k2]) <= propia) break;
            actual.largo += 1;
          }
        } else {
          actual.run = "linea";
          actual.textoRun = valor;
          actual.largo = 1;
        }
      }
    }
    cerrar();
  }

  // Extraible: exactamente lo que `scriptDelPaso` va a encontrar si se le pide ese nombre.
  for (const paso of pasos) {
    const primera = paso.nombre === null ? -1 : lineas.findIndex((l) => l.trim() === `- name: ${paso.nombre}`);
    paso.extraible = paso.run === "bloque" && primera === paso.linea - 1;
  }
  return pasos;
}

/**
 * Los archivos donde puede vivir un paso: todo workflow bajo un `.github/workflows/` y todo
 * `action.yml` del arbol, con la ruta relativa a la raiz y en `/`.
 *
 * SE DERIVAN RECORRIENDO EL ARBOL, NO DE UNA LISTA. La lista vieja era un solo archivo
 * —marco-ci.yml—, y lo que el marco reparte en `plantilla/` y corre en cada consumidor no lo
 * miraba nadie. Un workflow nuevo, o una action nueva, entran solos.
 *
 * Se saltean `.git`, `node_modules` y toda carpeta `pruebas/`: ahi viven FIXTURES —workflows y
 * actions de juguete que los bancos escriben a proposito rotos— y censarlos seria exigirle banco
 * a un caso de prueba.
 */
export function superficies(raiz = RAIZ) {
  const encontradas = [];
  const recorrer = (relativa) => {
    for (const entrada of readdirSync(join(raiz, relativa), { withFileTypes: true })) {
      const hija = relativa === "" ? entrada.name : `${relativa}/${entrada.name}`;
      if (entrada.isDirectory()) {
        if ([".git", "node_modules", "pruebas"].includes(entrada.name)) continue;
        recorrer(hija);
      } else if (/(^|\/)action\.ya?ml$/.test(hija) || /(^|\/)\.github\/workflows\/[^/]+\.ya?ml$/.test(hija)) {
        encontradas.push(hija);
      }
    }
  };
  recorrer("");
  return encontradas.sort();
}
