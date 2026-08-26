// LECTOR DE LAS VERSIONES QUE EL REPO DECLARA, Y PARSER DE LA PAGINA QUE LAS
// SENALA.
//
// POR QUE EXISTE. docs/03-stack.md dice que pieza usa el marco, por que, y en que
// archivo se declara la version de cada una — pero NO escribe ningun numero. Una
// tabla de versiones copiada a mano envejece en una semana: es exactamente la
// clase de dato que este repo existe para no mantener a mano (el mismo argumento
// que el README ya hace con las cifras del andamio y el glosario con su conteo de
// filas).
//
// Este modulo es las dos mitades de esa decision:
//   1. DERIVA. `node pruebas/docs/versiones.mjs` imprime la tabla con los numeros
//      de HOY, leidos de los archivos que los declaran. Es el comando que la
//      pagina publica en vez de una tabla escrita.
//   2. VERIFICA. pruebas/docs/stack.test.mjs lo importa para poner en rojo la
//      divergencia: una fila que apunta a un archivo que ya no existe, a una
//      clave que ya nadie declara, o una version escrita a mano en la prosa.
//
// TODO LO QUE MIRA ES PURO SOBRE TEXTO a proposito: asi el banco puede correr
// cada comprobacion contra una copia MUTADA y verla fallar. Una guarda que nadie
// vio fallar no es una guarda.
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

/** La pagina que declara el stack. Ruta relativa a la raiz del repo. */
export const PAGINA = "docs/03-stack.md";

/** El README es el que declara las formas de distribucion del marco y DONDE VIVE
 *  cada una (tabla "Principio de distribucion"). Esta constante es su ancla: si
 *  la tabla se renombra, el parseo devuelve cero formas y el banco lo dice en vez
 *  de pasar vacuamente. */
export const README = "README.md";
export const ANCLA_DISTRIBUCION = "| Forma | Qué es |";

/** La etiqueta para un archivo que NO llega al proyecto de ninguna manera, y que
 *  por eso no es ninguna de las formas del README.
 *
 *  POR QUE HACE FALTA. `herramientas/projects-init.mjs` no se referencia (no se
 *  consume por `uses:`) ni se copia (no vive en plantilla/): se corre UNA vez,
 *  desde el clon del marco, para crear el repositorio. Llamarlo "Referenciado"
 *  —como decia esta tabla— le prometia al proyecto una correccion que nunca va a
 *  recibir, porque de su lado no hay nada que corregir. */
export const FORMA_QUE_NO_VIAJA = "No viaja";

/** Las formas de distribucion del README, con los prefijos de ruta donde el
 *  propio README dice que vive cada una (los backticks de la columna "Donde vive
 *  en Projects" que contienen una barra: `plantilla/`, `.github/workflows/`, ...).
 *
 *  ESTO ES LO QUE EVITA LA TAUTOLOGIA. La comprobacion de la forma solia derivar
 *  la respuesta de la MISMA ruta que estaba comprobando (`ruta.startsWith(
 *  "plantilla/") ? "Scaffold" : "Referenciado"`), asi que solo podia cazar un
 *  tipeo en la celda y nunca una fila clasificada mal — y habia una. Ahora la
 *  respuesta sale de OTRO archivo, el README, que es donde el marco declara sus
 *  formas. */
export function formasDelReadme(texto) {
  const desde = texto.indexOf(ANCLA_DISTRIBUCION);
  if (desde === -1) return [];
  const formas = [];
  let dentro = false;
  for (const linea of texto.slice(desde).split("\n")) {
    if (!linea.startsWith("|")) {
      if (dentro) break;
      continue;
    }
    dentro = true;
    const celdas = linea
      .split("|")
      .slice(1, -1)
      .map((c) => c.trim());
    if (celdas.length < 3) continue;
    const forma = celdas[0].replace(/\*\*/g, "");
    if (!forma || forma === "Forma" || /^-+$/.test(forma)) continue;
    const prefijos = [...celdas[2].matchAll(/`([^`]*\/[^`]*)`/g)].map((m) => m[1]);
    formas.push({ forma, prefijos });
  }
  return formas;
}

/** Todas las etiquetas que la tabla de la pagina puede usar: las del README mas
 *  la del archivo que no viaja. */
export function formasValidas(formas) {
  return [...formas.map((f) => f.forma), FORMA_QUE_NO_VIAJA];
}

/** La forma que le corresponde a un archivo por donde vive, segun el README.
 *  Gana el prefijo mas largo: `actions/constitucion/canonico/` (Regenerado) es
 *  mas especifico que `actions/` (Referenciado), y sin esa regla el resultado
 *  dependeria del orden de las filas. Si ningun prefijo del README lo cubre, el
 *  archivo no viaja al proyecto. */
export function formaEsperada(ruta, formas) {
  let mejor = null;
  for (const { forma, prefijos } of formas) {
    for (const prefijo of prefijos) {
      if (ruta.startsWith(prefijo) && (mejor === null || prefijo.length > mejor.prefijo.length)) {
        mejor = { forma, prefijo };
      }
    }
  }
  return mejor === null ? FORMA_QUE_NO_VIAJA : mejor.forma;
}

/** La constitucion que el proyecto HEREDA, y que congela la tabla del stack del
 *  andamio. Cuando ella y la pagina digan cosas distintas, manda ella: es la que
 *  viaja. */
export const CONSTITUCION = "plantilla/AGENTS.md";
export const ANCLA_STACK_FIJADO = "## Stack fijado";

/** La unica capa de esa tabla que el proyecto SI elige. Se excluye por nombre y
 *  no por posicion: su celda no nombra una herramienta sino quien decide. */
export const CAPA_DEL_PROYECTO = "Plataforma";

/** Las herramientas que plantilla/AGENTS.md congela: los nombres en negrita de
 *  la columna "Herramienta" de su tabla "Stack fijado", separados por `+` cuando
 *  una celda lista varias. */
export function herramientasCongeladas(texto) {
  const desde = texto.indexOf(ANCLA_STACK_FIJADO);
  if (desde === -1) return [];
  const nombres = [];
  let dentro = false;
  for (const linea of texto.slice(desde).split("\n")) {
    if (!linea.startsWith("|")) {
      if (dentro) break;
      continue;
    }
    dentro = true;
    const celdas = linea
      .split("|")
      .slice(1, -1)
      .map((c) => c.trim());
    if (celdas.length < 2) continue;
    const capa = celdas[0];
    if (!capa || capa === "Capa" || /^-+$/.test(capa) || capa === CAPA_DEL_PROYECTO) continue;
    for (const marca of celdas[1].matchAll(/\*\*([^*]+)\*\*/g)) {
      for (const pieza of marca[1].split("+")) {
        const nombre = pieza.trim();
        if (nombre) nombres.push(nombre);
      }
    }
  }
  return [...new Set(nombres)];
}

/** Las herramientas congeladas que un texto NO nombra. Puro sobre el texto: el
 *  banco le pasa copias mutadas y exige verlas faltar. */
export function congeladasAusentes(texto, herramientas) {
  return herramientas.filter((h) => !texto.includes(h));
}

/** El ancla de la frase de plantilla/AGENTS.md que enumera las plataformas
 *  admitidas. */
export const ANCLA_PLATAFORMAS = "Los valores admitidos son";

/** Los nombres de plataforma que el andamio admite, leidos de su constitucion.
 *
 *  POR QUE DERIVARLOS Y NO ESCRIBIRLOS. Son los nombres con mas chance de volver
 *  a colarse en un spec o en el README (un proyecto los tiene en la cabeza porque
 *  eligio uno). Escribirlos a mano en el banco dejaria fuera el que se agregue
 *  manana, que es justamente el que nadie estaria vigilando. `ninguna` no es una
 *  plataforma: es la respuesta de un proyecto que todavia no despliega. */
export function plataformasAdmitidas(texto) {
  const desde = texto.indexOf(ANCLA_PLATAFORMAS);
  if (desde === -1) return [];
  const fin = texto.indexOf(";", desde);
  const frase = texto.slice(desde, fin === -1 ? undefined : fin);
  return [...frase.matchAll(/`([a-z]+)`/g)].map((m) => m[1]).filter((v) => v !== "ninguna");
}

/** El cuerpo de una seccion `## Titulo`, hasta el proximo encabezado del mismo
 *  nivel. Devuelve null si el titulo no esta: el banco distingue "la seccion no
 *  nombra nada" de "la seccion se renombro y dejamos de mirar". */
export function seccion(texto, titulo) {
  const desde = texto.indexOf(titulo);
  if (desde === -1) return null;
  const resto = texto.slice(desde + titulo.length);
  const hasta = resto.indexOf("\n## ");
  return hasta === -1 ? resto : resto.slice(0, hasta);
}

export function leer(rel) {
  return readFileSync(join(RAIZ, rel), "utf8");
}

/** Las filas de la tabla "Donde se declara cada version" de la pagina.
 *
 *  FORMATO QUE SE EXIGE, y por que asi: la celda del medio es
 *  `<ruta>` -> `<clave>`, o sea las dos cosas entre backticks separadas por una
 *  flecha. Los backticks no son cosmetica — son lo que hace que la celda se
 *  pueda leer sin ambiguedad y lo que evita el falso verde de buscar una ruta
 *  como subcadena suelta (el mismo tropiezo que ya se midio en el banco de
 *  06-para-el-po.md con /openspec/specs/). */
export function filasDeclaradas(texto) {
  const filas = [];
  const lineas = texto.split("\n");
  for (let i = 0; i < lineas.length; i++) {
    const linea = lineas[i];
    if (!linea.startsWith("|")) continue;
    const celdas = linea
      .split("|")
      .slice(1, -1)
      .map((c) => c.trim());
    if (celdas.length < 3) continue;
    const marca = celdas[1].match(/^`([^`]+)`\s*→\s*`([^`]+)`$/);
    if (!marca) continue;
    filas.push({
      pieza: celdas[0].replace(/\*\*/g, ""),
      ruta: marca[1],
      clave: marca[2],
      forma: celdas[2].replace(/\*\*/g, ""),
      linea: i + 1,
    });
  }
  return filas;
}

/** El default de un input de un workflow reusable.
 *
 *  Se para en la linea del input (seis espacios de sangria, que es donde viven
 *  los inputs de workflow_call en este repo) y busca su `default:` sin pasarse
 *  al input siguiente. La cota importa: `rutas_carril_docs` declara un default
 *  de bloque, asi que una busqueda del primer `default:` posterior le adjudicaria
 *  a un input el valor de otro. */
export function defaultDeInput(texto, clave) {
  const lineas = texto.split("\n");
  const inicio = lineas.findIndex((l) => l === `      ${clave}:`);
  if (inicio === -1) return null;
  for (let i = inicio + 1; i < lineas.length; i++) {
    if (/^ {0,6}\S/.test(lineas[i])) return null;
    const marca = lineas[i].match(/^ {8}default:\s*(.+)$/);
    if (marca) return marca[1].trim().replace(/^"(.*)"$/, "$1");
  }
  return null;
}

/** El valor de una clave dentro de un manifiesto JSON, a cualquier profundidad:
 *  `packageManager` esta en la raiz y `express` cuelga de dependencies. Se
 *  compara la clave ENTERA y no como subcadena, asi que `vite` no matchea
 *  `@vitejs/plugin-react`. */
export function valorEnJson(texto, clave) {
  let hallado = null;
  const buscar = (nodo) => {
    if (hallado !== null || nodo === null || typeof nodo !== "object") return;
    for (const [k, v] of Object.entries(nodo)) {
      if (k === clave && typeof v === "string") {
        hallado = v;
        return;
      }
      if (v !== null && typeof v === "object") buscar(v);
    }
  };
  buscar(JSON.parse(texto));
  return hallado;
}

/** La primera linea NO comentada que declara algo con esa clave, en un archivo
 *  que no es JSON ni YAML: el Dockerfile del API y la herramienta de arranque.
 *  Se saltean los comentarios de shell, de JSDoc y de JavaScript porque los dos
 *  archivos explican en prosa la clave que declaran mas abajo — y el comentario
 *  de arriba no es la declaracion. */
export function lineaQueDeclara(texto, clave) {
  for (const linea of texto.split("\n")) {
    const limpia = linea.trim();
    if (!limpia || limpia.startsWith("#") || limpia.startsWith("//") || limpia.startsWith("*")) continue;
    if (!limpia.includes(clave)) continue;
    if (!/\d/.test(limpia)) continue;
    // De la linea al valor, en tres intentos y de mas preciso a mas crudo: lo
    // que este entre comillas con un digito adentro (`NODE_MINIMO = "18.17.0"`),
    // el token que lleva la clave pegada (`node:24-slim`), o la linea entera.
    // Devolver siempre la linea entera funcionaba pero deja una tabla ilegible,
    // y esta tabla existe para leerse.
    const entreComillas = limpia.match(/"([^"]*\d[^"]*)"/);
    if (entreComillas) return entreComillas[1];
    const pegado = limpia.match(new RegExp(`\\S*${clave.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")}\\S*`));
    if (pegado && /\d/.test(pegado[0])) return pegado[0];
    return limpia;
  }
  return null;
}

/** Lo que un archivo del arbol DECLARA bajo una clave, con el lector que
 *  corresponde a su forma. Puro sobre el texto: el banco le pasa copias mutadas. */
export function declaracionEn(ruta, texto, clave) {
  if (ruta.endsWith(".json")) return valorEnJson(texto, clave);
  if (ruta.endsWith(".yml") || ruta.endsWith(".yaml")) return defaultDeInput(texto, clave);
  return lineaQueDeclara(texto, clave);
}

/** Igual que declaracionEn, pero leyendo el arbol. Devuelve null tambien cuando
 *  el archivo no existe: para el banco las dos cosas son la misma divergencia
 *  —la pagina afirma algo que el arbol no sostiene— con arreglos distintos, y el
 *  mensaje las separa. */
export function declaracionDe(fila) {
  if (!existsSync(join(RAIZ, fila.ruta))) return null;
  return declaracionEn(fila.ruta, leer(fila.ruta), fila.clave);
}

/** Las lineas de la pagina que escriben un digito fuera de un bloque de comando.
 *
 *  ESTA ES LA GUARDA QUE HACE QUE LA PAGINA NO ENVEJEZCA. La pagina promete no
 *  escribir ni una version a mano; comprobar "no hay versiones" exigiria decidir
 *  que forma tiene una version (¿`9.15.0`? ¿`v7`? ¿`22`?) y cada forma que se
 *  olvide es un agujero por donde entra la que envejece. Comprobar "no hay
 *  digitos" no tiene agujeros y se explica en una linea.
 *
 *  CUATRO EXENCIONES, todas declaradas y ninguna de ellas una version:
 *   - los bloques cercados, porque ahi vive el comando que IMPRIME los numeros,
 *     que es justamente el reemplazo de la tabla escrita a mano;
 *   - el marcador de una lista numerada al principio de la linea;
 *   - el nombre del paquete `e2e`, que lleva un digito por nombre y no por
 *     version — aparece en la ruta de su manifiesto y en la del workspace;
 *   - el numero de orden de una pagina de `docs/`, desde que las paginas se
 *     llaman `01-introduccion.md`, `02-glosario.md` y asi. Esta pagina enlaza a
 *     otras veinte veces y ese `02` no es un numero de version escrito a mano:
 *     es parte del nombre de un archivo, no envejece solo, y si el archivo se
 *     renombra lo caza el verificador de enlaces (pruebas/docs/enlaces.test.mjs),
 *     que es justo la clase de medicion cuya ausencia esta regla compensa.
 *     La exencion es ANGOSTA a proposito: solo dos digitos, un guion, y un
 *     nombre que termina en `.md`. Un `Node 22` en prosa sigue saliendo rojo. */
export function digitosFueraDeBloques(texto) {
  const hallazgos = [];
  let dentro = false;
  texto.split("\n").forEach((linea, i) => {
    if (/^\s*```/.test(linea)) {
      dentro = !dentro;
      return;
    }
    if (dentro) return;
    const limpia = linea
      .replace(/^(\s*)\d+\.\s/, "$1")
      .replace(/e2e/g, "")
      // El numero de orden de una pagina de docs/, tanto en el destino del
      // enlace como en el texto visible: `[01-introduccion.md](01-introduccion.md)`.
      .replace(/\b\d{2}-(?=[a-z0-9-]+\.md\b)/g, "");
    if (/\d/.test(limpia)) hallazgos.push({ linea: i + 1, texto: linea.trim() });
  });
  return hallazgos;
}

/** Los paquetes del monorepo, derivados de la unica declaracion que existe. Se
 *  lee a mano y no con un parser de YAML porque el marco corre sin dependencias:
 *  el archivo es una lista de escalares citados y nada mas. */
export function paquetesDelWorkspace(texto) {
  return [...texto.matchAll(/^\s*-\s*"([^"]+)"\s*$/gm)].map((m) => m[1]);
}

function imprimir() {
  const filas = filasDeclaradas(leer(PAGINA));
  if (filas.length === 0) {
    console.error(`no encontre ninguna fila de declaracion en ${PAGINA}. Sin filas no hay nada que leer.`);
    process.exit(1);
  }
  const anchoPieza = Math.max(...filas.map((f) => f.pieza.length));
  const anchoOrigen = Math.max(...filas.map((f) => `${f.ruta} → ${f.clave}`.length));
  let sinResolver = 0;
  console.log(`Versiones declaradas por el arbol, leidas de ${PAGINA} (${filas.length} filas)\n`);
  for (const fila of filas) {
    const valor = declaracionDe(fila);
    if (valor === null) sinResolver++;
    console.log(
      `${fila.pieza.padEnd(anchoPieza)}  ${`${fila.ruta} → ${fila.clave}`.padEnd(anchoOrigen)}  ${
        valor === null ? "SIN RESOLVER" : valor
      }`,
    );
  }
  if (sinResolver > 0) {
    console.error(
      `\n${sinResolver} fila(s) de ${PAGINA} no resuelven contra el arbol: o el archivo se movio, o la clave ` +
        "dejo de declararse. La pagina quedo afirmando algo que el repo ya no sostiene.",
    );
    process.exit(1);
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) imprimir();
