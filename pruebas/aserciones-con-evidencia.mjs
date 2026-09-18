#!/usr/bin/env node
// ---------------------------------------------------------------------------
// LAS ASERCIONES QUE TAPAN SU EVIDENCIA.
//
// QUE BUSCA. `assert.match` y `assert.doesNotMatch` con un tercer argumento que es una cadena
// SIN interpolar. Node, con mensaje, imprime SOLO el mensaje: el input —que sin mensaje habria
// impreso completo— se pierde. El detalle de por que esto es al reves de lo intuitivo vive en
// `pruebas/porque.mjs`, que es el arreglo.
//
// POR QUE ES UN CHEQUEO DEL DIFF Y NO DEL ARBOL, que es la decision de diseño de esta pieza.
// El arbol ya tiene cientos de aserciones asi (el numero exacto lo imprime esta herramienta en
// cada corrida; no se escribe aca porque envejeceria sin que nada lo mida). Un banco repo-wide
// que lo exigiera NACERIA ROJO sobre todas, y un banco que no se puede poner en verde se
// destraba escribiendo con apuro, que es peor que la ausencia. Mirando el DIFF, la puerta se
// cierra sin pedir la barrida: el banco que un pull request toca sale limpio, y la deuda se paga
// por area, cuando alguien ya esta ahi. El total se publica en cada corrida para que se vea bajar
// en vez de quedar en un issue que nadie relee.
//
// POR QUE VIVE EN pruebas/ Y NO EN herramientas/. En Rigel —de donde viene, commit d71c40c— vive
// en `herramientas/`. Aca `herramientas/` es una superficie que VIAJA (el job
// `changelog-en-el-pr` de ci.yml la cuenta entre las que llegan a un consumidor) y esto es
// disciplina del banco del propio marco: no le llega a nadie. Tampoco lleva el sufijo `.test.mjs`
// a proposito: el CI junta los bancos por `pruebas/**/*.test.mjs`, y este archivo es la
// herramienta, no una suite. Su banco es `pruebas/banco/aserciones-con-evidencia.test.mjs`.
//
// LO QUE NO VERIFICA, declarado: que el motivo sea BUENO, ni que la evidencia elegida sea la
// util. Eso es comprension de lectura. Lo que sostiene es que la evidencia ESTE.
// ---------------------------------------------------------------------------

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/**
 * EL CODIGO, SIN EL CONTENIDO DE SUS CADENAS NI DE SUS COMENTARIOS.
 *
 * POR QUE HACE FALTA. La primera version de esta herramienta —en Rigel— escaneaba el fuente
 * crudo y contaba como asercion CIEGA todo `assert.match(...)` que apareciera dentro de una
 * cadena, y un banco de un lector de codigo esta LLENO de fixtures que son exactamente eso.
 * Medido alla: sobre su propio banco dio nueve hallazgos y ocho eran fixtures. Un escaneo de
 * texto no distingue lo que el programa HACE de lo que el programa MENCIONA.
 *
 * Se reemplaza el contenido por espacios y NO se borra, para que los numeros de linea y los
 * offsets sigan siendo los del archivo: un hallazgo con la linea corrida manda a mirar el lugar
 * equivocado, y `argumentos` necesita que los offsets coincidan.
 *
 * LOS LITERALES DE REGEX TAMBIEN SE BLANQUEAN, y es el defecto que el porte encontro al medir
 * esta herramienta contra el AST de un parser de verdad sobre el arbol de Projects. La version de
 * Rigel no los reconocia: una regex con una comilla adentro —`/"foo/`, `/\["api", "user"\]/`—
 * abria una CADENA FALSA que se comia el codigo hasta la comilla siguiente, y con el las
 * aserciones de verdad que venian despues. Medido el 2026-09-17: la herramienta tal cual contaba
 * 246 aserciones ciegas y el AST 285. Las 39 que faltaban eran reales (por ejemplo
 * `assert.match(linea, /crear \.projects-valores\.json/, "el rojo tiene que decir...")`), o sea un
 * FALSO NEGATIVO del 14%, la direccion peligrosa: el chequeo del diff las dejaba pasar. Y blanquear
 * el CONTENIDO de la regex —no solo saltarla— arregla ademas la otra mitad: `/a,b/` o `/[(]/`
 * partian los argumentos o descuadraban los parentesis.
 *
 * Una `/` abre una regex, y no una division, cuando lo anterior significativo NO puede terminar
 * una expresion: nada, un operador, una apertura, una coma, o una palabra clave como `return`.
 * Es la regla con la que cualquier lexer de JavaScript resuelve la ambiguedad. El limite
 * declarado: un template con otro template anidado dentro de `${}` no se sigue; sobre el arbol
 * de hoy no hay ninguno que cambie el conteo (el banco lo compara contra el AST, ver
 * `pruebas/banco/aserciones-con-evidencia.test.mjs`).
 */
export function sinCadenas(texto) {
  const salida = texto.split("");
  // Lo ultimo significativo que hubo en el CODIGO: decide si una `/` es regex o division.
  let previo = "";
  const blanquear = (j) => {
    if (texto[j] !== "\n") salida[j] = " ";
  };
  let i = 0;
  while (i < texto.length) {
    const c = texto[i];
    if (c === '"' || c === "'" || c === "`") {
      const cierre = c;
      let j = i + 1;
      while (j < texto.length) {
        if (texto[j] === "\\") {
          blanquear(j);
          if (j + 1 < texto.length) blanquear(j + 1);
          j += 2;
          continue;
        }
        if (texto[j] === cierre) break;
        blanquear(j);
        j++;
      }
      i = j + 1;
      previo = c;
      continue;
    }
    // Un comentario de linea tampoco se mira: un ejemplo en prosa no es una asercion.
    if (c === "/" && texto[i + 1] === "/") {
      let j = i;
      while (j < texto.length && texto[j] !== "\n") {
        salida[j] = " ";
        j++;
      }
      i = j;
      continue;
    }
    if (c === "/" && texto[i + 1] === "*") {
      let j = i;
      while (j < texto.length && !(texto[j] === "*" && texto[j + 1] === "/")) {
        if (texto[j] !== "\n") salida[j] = " ";
        j++;
      }
      if (j < texto.length) {
        salida[j] = " ";
        salida[j + 1] = " ";
      }
      i = j + 2;
      continue;
    }
    if (c === "/" && abreRegex(texto, i, previo)) {
      let j = i + 1;
      let enClase = false;
      while (j < texto.length && texto[j] !== "\n") {
        if (texto[j] === "\\") {
          blanquear(j);
          if (j + 1 < texto.length) blanquear(j + 1);
          j += 2;
          continue;
        }
        if (texto[j] === "[") enClase = true;
        else if (texto[j] === "]") enClase = false;
        else if (texto[j] === "/" && !enClase) break;
        blanquear(j);
        j++;
      }
      i = j + 1;
      previo = "/";
      continue;
    }
    if (!/\s/.test(c)) previo = c;
    i++;
  }
  return salida.join("");
}

/** Lo que puede venir antes de una regex y nunca antes de una division. */
const ANTES_DE_REGEX = "(,=:[!&|?{};+-*%<>~^";
const PALABRAS_ANTES_DE_REGEX = /(?:^|[^\w$])(?:return|typeof|instanceof|in|of|new|delete|void|throw|case|do|else|yield|await)$/;

function abreRegex(texto, i, previo) {
  if (previo === "" || ANTES_DE_REGEX.includes(previo)) return true;
  if (!/[\w$]/.test(previo)) return false;
  // Una palabra: es regex solo si es una palabra clave que espera una expresion.
  return PALABRAS_ANTES_DE_REGEX.test(texto.slice(Math.max(0, i - 12), i).trimEnd());
}

/** La llamada que nos interesa. */
export const LLAMADA = /assert\.(?:match|doesNotMatch)\s*\(/g;

/**
 * Un mensaje CIEGO: una cadena literal sin interpolacion ni concatenacion.
 *
 * Un template con `${...}` o una concatenacion SI traen evidencia, asi que no son el defecto —
 * y contarlos seria el sobreconteo que esta herramienta existe para no cometer.
 */
export const CIEGO = /^(?:"[^"]*"|'[^']*'|`[^`$]*`)$/s;

/**
 * Los argumentos de una llamada, partidos por comas de nivel cero.
 *
 * LA ESTRUCTURA SE LEE DEL TEXTO BLANQUEADO Y EL CONTENIDO DEL FUENTE, y esa separacion es el
 * arreglo de un FALSO NEGATIVO —peor que el falso positivo que `sinCadenas` resuelve—. La
 * primera version, en Rigel, partia por comas mirando solo los parentesis, asi que un mensaje
 * ciego con una coma adentro se partia en dos: el tercer argumento quedaba `"recorto el final`
 * y `CIEGO` lo rechazaba por no cerrar comillas. Toda asercion ciega cuyo mensaje tuviera una
 * coma se escapaba, y la deuda publicada salia MAS BAJA que la real.
 *
 * Con el texto blanqueado el problema desaparece solo: adentro de una cadena no hay comas,
 * porque no hay nada. Los offsets coinciden, asi que las piezas se recortan del original.
 */
export function argumentos(blanqueado, fuente, desde) {
  let i = desde;
  let prof = 0;
  for (; i < blanqueado.length; i++) {
    if (blanqueado[i] === "(") prof++;
    else if (blanqueado[i] === ")") {
      prof--;
      if (prof === 0) break;
    }
  }
  const cuerpo = blanqueado.slice(desde + 1, i);
  const cortes = [];
  let nivel = 0;
  let ultimo = 0;
  for (let j = 0; j < cuerpo.length; j++) {
    const c = cuerpo[j];
    if ("([{".includes(c)) nivel++;
    else if (")]}".includes(c)) nivel--;
    else if (c === "," && nivel === 0) {
      cortes.push([ultimo, j]);
      ultimo = j + 1;
    }
  }
  cortes.push([ultimo, cuerpo.length]);
  const base = desde + 1;
  return cortes.map(([a, b]) => fuente.slice(base + a, base + b).trim());
}

/** Las aserciones ciegas de UN archivo, con su numero de linea. */
export function ciegasEn(fuente) {
  // EL CODIGO PRIMERO, LAS CADENAS DESPUES. `sinCadenas` deja los mismos offsets, asi que la
  // llamada se ENCUENTRA sobre el codigo y los ARGUMENTOS se leen del fuente original — que es
  // donde el mensaje conserva sus comillas y se puede juzgar si es ciego.
  const texto = sinCadenas(fuente);
  const halladas = [];
  const llamada = new RegExp(LLAMADA.source, "g");
  let m;
  while ((m = llamada.exec(texto)) !== null) {
    const abre = m.index + m[0].length - 1;
    const args = argumentos(texto, fuente, abre);
    if (args.length < 3) continue;
    if (!CIEGO.test(args[2])) continue;
    halladas.push({ linea: texto.slice(0, m.index).split("\n").length, mensaje: args[2] });
  }
  return halladas;
}

/** Todo banco del arbol: los mismos dos universos que junta el CI (`pruebas/` y `actions/`). */
export function bancos(raiz = RAIZ) {
  const encontrados = [];
  const recorrer = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (e.name === "node_modules" || e.name === ".git") continue;
      const p = path.join(dir, e.name);
      if (e.isDirectory()) recorrer(p);
      else if (e.name.endsWith(".test.mjs")) encontrados.push(path.relative(raiz, p).split(path.sep).join("/"));
    }
  };
  for (const sub of ["pruebas", "actions"]) {
    const d = path.join(raiz, sub);
    if (fs.existsSync(d)) recorrer(d);
  }
  return encontrados.sort();
}

/**
 * El censo: cuantas y donde.
 *
 * Un archivo que no existe se saltea, y no es un descuido: en modo diff la lista llega del
 * `git diff` del pull request, y un banco BORRADO por el PR sigue en esa lista. Uno que no
 * termina en `.test.mjs` tambien: el diff puede traer cualquier archivo y esto solo juzga bancos.
 */
export function censar(raiz = RAIZ, archivos = null) {
  const lista = (archivos ?? bancos(raiz)).filter((rel) => rel.endsWith(".test.mjs"));
  const porArchivo = new Map();
  let total = 0;
  let mirados = 0;
  for (const rel of lista) {
    const abs = path.join(raiz, rel);
    if (!fs.existsSync(abs)) continue;
    mirados++;
    const halladas = ciegasEn(fs.readFileSync(abs, "utf8"));
    if (halladas.length > 0) {
      porArchivo.set(rel, halladas);
      total += halladas.length;
    }
  }
  return { total, porArchivo, mirados };
}

/**
 * Lo que la herramienta hace cuando se la invoca: devuelve el codigo de salida y las lineas que
 * imprime, sin imprimirlas. Separado del `process.exit` para que el banco lo pueda correr en
 * proceso y afirmar sobre el codigo, que es lo que el CI mira.
 */
export function ejecutar(args, raiz = RAIZ) {
  const salida = [];
  const errores = [];
  const soloDiff = args.length > 0;
  const censo = censar(raiz, soloDiff ? args.map((a) => a.split(path.sep).join("/")) : null);

  // EL TOTAL DEL ARBOL SIEMPRE, tambien en modo diff: es la deuda, y publicarla en cada corrida
  // es lo que la hace bajar. Un numero que solo vive en un issue no lo relee nadie.
  const deuda = soloDiff ? censar(raiz) : censo;
  salida.push(
    `deuda del arbol: ${deuda.total} asercion(es) que tapan su evidencia en ${deuda.porArchivo.size} archivo(s) ` +
      `de ${deuda.mirados} banco(s)`,
  );

  if (!soloDiff) {
    for (const [rel, hs] of [...censo.porArchivo].sort((a, b) => b[1].length - a[1].length).slice(0, 10)) {
      salida.push(`  ${hs.length.toString().padStart(3)}  ${rel}`);
    }
    return { codigo: 0, salida, errores };
  }

  if (censo.total === 0) {
    salida.push(`::notice::los ${censo.mirados} banco(s) que toca este pull request no tapan su evidencia`);
    return { codigo: 0, salida, errores };
  }

  for (const [rel, hs] of censo.porArchivo) {
    for (const h of hs) {
      errores.push(
        `::error file=${rel},line=${h.linea}::esta asercion tapa su evidencia: assert.match con un ` +
          "mensaje imprime SOLO el mensaje, y el input —que sin mensaje se habria impreso completo— se " +
          "pierde. El dia que caiga en CI vas a tener el motivo y no lo que paso. Arreglo: envolve el " +
          "mensaje con porque(<motivo>, <lo que se miro>) de pruebas/porque.mjs",
      );
    }
  }
  errores.push(
    `::error::${censo.total} asercion(es) de los bancos que toca este pull request tapan su evidencia. ` +
      `Esta comprobacion mira SOLO los bancos que el PR toca, y los mira ENTEROS: el arbol tiene ` +
      `${deuda.total} y barrerlas de una naceria rojo, pero el banco que tocas sale limpio. Arreglo: ` +
      "las lineas anotadas arriba, cada una con porque() de pruebas/porque.mjs",
  );
  return { codigo: 1, salida, errores };
}

const invocadoDirecto = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (invocadoDirecto) {
  // Los archivos que el PR toca llegan por argumento; sin argumentos, se censa el arbol.
  const args = process.argv.slice(2).filter((a) => !a.startsWith("-"));
  const { codigo, salida, errores } = ejecutar(args);
  for (const l of salida) console.log(l);
  for (const l of errores) console.error(l);
  process.exit(codigo);
}
