#!/usr/bin/env node
// Cobertura de pruebas en LOS DOS PLANOS que el requirement de calidad-codigo
// exige, porque cada uno tapa un hueco que el otro deja abierto:
//
//   1. LAS LINEAS DEL CAMBIO, sin holgura. Cruza los reportes lcov con las
//      lineas que el diff agrega o modifica y falla si la proporcion cubierta
//      queda por debajo del minimo. Sin este plano, un paquete con margen
//      admite codigo sin pruebas hasta agotarlo.
//
//   2. EL TOTAL DE CADA PAQUETE. Falla cuando el total queda por debajo del
//      minimo del marco sin una deuda declarada con motivo y FECHA, cuando esa
//      fecha vence sin que el paquete haya llegado, o cuando la cobertura ya
//      conseguida retrocede por debajo de su piso declarado. Sin este plano, el
//      codigo que ya existe sin pruebas se queda asi indefinidamente, porque
//      nada obliga a nadie mientras nadie lo toque.
//
// POR QUE EL PLANO 2 SE AGREGO DESPUES, y con que medicion. Durante toda la v1
// el spec prometia rojo y no habia nada que lo produjera: el consumidor real
// estaba a 70,69% de funciones —9,4 puntos por debajo del minimo declarado de
// 80— con EXIT 0. Un paquete sintetico al 33,3% (lcov LF:6 LH:2), sin motivo ni
// fecha declarados, tambien salia EXIT 0, y bajar los umbrales del consumidor a
// 40 no cambiaba nada porque nadie los estaba leyendo. Hoy el minimo del marco
// es piso DURO del total: el umbral local solo puede subirlo.
//
// POR QUE ESTA ESCRITO ACA Y NO SE ADOPTA UNA HERRAMIENTA EXTERNA
// (decision D5 del change calidad-fail-closed). La candidata FALLA EN VERDE:
// si las rutas de su entrada no coinciden con las del diff, no encuentra
// lineas que medir, reporta cobertura total y sale con exito. O sea que
// cablearla mal deja el gate abierto — exactamente lo que la constitucion del
// marco prohibe. Este comparador trata "no hay datos" como ROJO RUIDOSO, y
// nunca como exito silencioso.
//
// SIN DEPENDENCIAS: Node 22 pelado, sin red, sin npm install.
//
// Uso:  node medir-cobertura-diff.mjs
//
// Variables de entorno (las cablea action.yml desde sus inputs):
//   COBERTURA_LCOV     patrones glob de los reportes, uno por linea
//                      (default: **/coverage/lcov.info)
//   COBERTURA_BASE     commit base del rango. Vacio = el plano del CAMBIO no
//                      aplica; el del TOTAL mide igual, porque no depende de
//                      ningun rango.
//   COBERTURA_CABEZA   commit final del rango (default: HEAD, que es lo que
//                      esta realmente en el checkout y lo que midieron las
//                      pruebas).
//   COBERTURA_MINIMO   porcentaje minimo exigido sobre las lineas del cambio.
//                      Sobre el total solo puede SUBIR el minimo del marco
//                      (default: 80).
//   COBERTURA_MAX_ANOTACIONES  tope de anotaciones ::error file=...:: (20).
//   COBERTURA_HOY      fecha AAAA-MM-DD contra la que se comparan los plazos de
//                      las deudas. Existe para las pruebas y NO es un input de
//                      la action: es la unica palanca capaz de aflojar una
//                      compuerta, asi que cuando esta puesta la corrida lo grita.
//
// Declaracion por paquete, en su propio package.json, al lado de las
// exclusiones (la lee `leerPaquetes` de la action hermana):
//   projects.cobertura.excluidos  [{ patron, motivo }]
//   projects.cobertura.piso       { lineas, funciones, ramas } — el piso que ya
//                              consiguio, y del que no puede bajar
//   projects.cobertura.deuda      { motivo, fecha } — por que todavia no llega al
//                              minimo y el dia en que llega
//
// VENTANA DE ESTRENO: hasta la fecha de VENTANA_DE_GRACIA_HASTA, un paquete por
// debajo del minimo SIN declaracion avisa en vez de detener, gritando el dia en
// que sera rojo. Se cierra sola. Ver el comentario de esa constante.
//
// Salidas (GITHUB_OUTPUT): porcentaje, lineas_medidas, lineas_sin_cubrir,
// lineas_fuera_de_medicion, paquetes_medidos, paquetes_bajo_minimo,
// paquetes_en_rojo.
// Codigo de salida: 0 pasa o no aplica; 1 falla CUALQUIERA de los dos planos.
import { readFileSync, readdirSync, appendFileSync, realpathSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
// La lista de extensiones de fuente y la lectura de exclusiones se TOMAN de la
// action hermana, no se copian: son el mismo contrato ("que es codigo fuente",
// "que se puede dejar fuera y con que motivo") y dos copias divergen. Las dos
// actions viajan juntas en el mismo repositorio del marco, asi que el import
// relativo existe siempre; si no existiera, este script no arranca y el paso
// es rojo, nunca un verde sin medir.
import {
  EXTENSIONES_FUENTE,
  METRICAS_DE_COBERTURA,
  globARegExp as globDelCenso,
  esFechaIso,
  leerPaquetes,
  paqueteDe,
} from "../censo-fuentes/censo-fuentes.mjs";

const SHA_CERO = /^0{7,40}$/;

// El numero del marco (decision D5 de calidad-fail-closed). Sobre las lineas
// del CAMBIO un consumidor puede exigir mas, y puede exigir menos — pero no en
// silencio. Sobre el TOTAL DEL PAQUETE es un piso duro: el umbral local solo
// puede subirlo (ver `compuertaDelTotal`).
const MINIMO_DEL_MARCO = 80;

// Comparaciones de porcentajes: 79.999999999 no es "por debajo de 80".
const EPSILON = 1e-9;

// VENTANA DE GRACIA DEL ESTRENO DEL PLANO DEL TOTAL.
//
// La constitucion del marco manda estrenar en modo aviso todo check que
// endurezca, y este endurece: `v1` es un tag MOVIL, asi que el dia en que esto
// se publica la compuerta aparece en el pipeline de cada consumidor sin que
// nadie la haya leido. Ya paso el 2026-08-19, al mover `v1` la primera vez.
//
// Medido, y es la razon por la que la ventana existe en vez de ser un parrafo:
// contra un espejo del consumidor real (un-proyecto-anterior en main, con sus dos
// reportes lcov del 2026-08-20) el plano del total da ROJO — `web` esta en
// 70,70% de funciones, 9,30 puntos por debajo del minimo. Su arreglo existe y
// esta medido, pero vive en una rama sin mergear (`feat/cobertura-web-funciones-80`,
// con umbrales de 93,6 en funciones), asi que el orden importa: si la compuerta
// aterriza antes que esa rama, el consumidor amanece rojo por un cambio del
// marco y no por un defecto propio.
//
// QUE AFLOJA, y solo eso: un paquete por debajo del minimo que NO declara
// deuda sale AMARILLO en vez de rojo, gritando la fecha en que pasa a rojo. NO
// afloja una deuda declarada y vencida (el paquete hizo una promesa y la
// rompio), ni un retroceso por debajo del piso, ni una declaracion invalida:
// esos tres exigen que alguien haya escrito algo, y lo escrito se sostiene.
//
// SE CIERRA SOLA. Pasada la fecha, la comparacion es roja sin que nadie toque
// una linea: una ventana que hay que acordarse de cerrar no se cierra nunca.
// Cuando pase, esta constante y su rama en `veredictoDePaquete` se borran en un
// PR de limpieza, no porque el comportamiento cambie.
const VENTANA_DE_GRACIA_HASTA = "2026-09-30";

// ---------------------------------------------------------------- resumen ---

const resumen = [];
const R = (linea = "") => resumen.push(linea);

// El resumen del plano del TOTAL se acumula aparte y se vuelca DESPUES: el
// plano del total se evalua primero (no depende del rango del diff) pero se lee
// mejor debajo, y son dos secciones con titulo propio a proposito. Un unico
// bloque mezclado hacia imposible saber cual de las dos compuertas hablo.
const resumenTotal = [];
const RT = (linea = "") => resumenTotal.push(linea);

// El plano del total puede ENROJECER una corrida que el plano del diff aprueba,
// y jamas al reves: la salida final es el maximo de las dos. Asi ningun
// `terminar(0)` de los que ya existian puede tapar un total en falta.
let salidaMinima = 0;

function volcarResumen() {
  const destino = process.env.GITHUB_STEP_SUMMARY;
  const lineas = [...resumen, ...resumenTotal];
  if (!destino || !lineas.length) return;
  try {
    appendFileSync(destino, lineas.join("\n") + "\n");
  } catch (e) {
    console.error(`::warning::no se pudo escribir el resumen de la corrida: ${e.message}`);
  }
}

// `fuera` NO es decorativo: un porcentaje publicado sin decir cuantas lineas
// fuente quedaron fuera del denominador miente por omision. Una linea cubierta
// y cincuenta sin dato dan "100.00" sobre una cobertura real del 2%.
function publicar(porcentaje, medidas, sinCubrir, fuera = 0) {
  const pares = [
    `porcentaje=${porcentaje}`,
    `lineas_medidas=${medidas}`,
    `lineas_sin_cubrir=${sinCubrir}`,
    `lineas_fuera_de_medicion=${fuera}`,
  ];
  console.log(`salidas: ${pares.join(" ")}`);
  const destino = process.env.GITHUB_OUTPUT;
  if (!destino) return;
  try {
    appendFileSync(destino, pares.join("\n") + "\n");
  } catch (e) {
    console.error(`::warning::no se pudieron publicar las salidas: ${e.message}`);
  }
}

/**
 * Cierra el paso: vuelca el resumen SIEMPRE, tambien cuando falla, y jamas sale
 * en verde si el plano del total quedo en rojo (`salidaMinima`).
 */
function terminar(codigo) {
  volcarResumen();
  process.exit(Math.max(codigo, salidaMinima));
}

// ----------------------------------------------------------------- rutas ---

// Un lcov generado en Windows trae "SF:web\src\App.tsx" y uno generado en
// Linux "SF:web/src/App.tsx". git SIEMPRE habla con barras normales. Sin esta
// normalizacion el cruce da cero coincidencias y el gate pasa en verde por la
// razon equivocada, que es justo el modo de falla que este script vino a
// evitar.
const aBarras = (p) => p.replace(/\\/g, "/").replace(/\/{2,}/g, "/");

export function normalizarRuta(p) {
  let r = aBarras(String(p).trim());
  while (r.startsWith("./")) r = r.slice(2);
  return r;
}

const esAbsoluta = (r) => /^(?:[A-Za-z]:)?\//.test(r);
const nombreDeArchivo = (r) => r.slice(r.lastIndexOf("/") + 1);
// Hasta donde llega un reporte, en palabras. null es el caso degenerado: el
// registro SF: existe pero no declara una sola linea.
const hastaDonde = (u) =>
  u === null
    ? "el reporte no declara una sola linea de este archivo"
    : `el reporte conoce este archivo hasta la linea ${u}`;

const escaparRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Los archivos de prueba APORTAN cobertura, no la reciben: todo proyecto los
// excluye de la medicion, asi que no reclamarlos es lo normal y avisar por
// ellos convertiria el aviso en ruido de cada pull request. Es una convencion
// de nombres, no una lista de archivos que alguien tenga que mantener.
export const esArchivoDePrueba = (r) =>
  /(?:^|\/)__tests__\//.test(r) || /\.(?:test|spec)\.[cm]?[jt]sx?$/.test(r);

// Que archivos son CODIGO FUENTE sale de la lista del censo, no de las
// extensiones que casualmente traen los reportes presentes. Derivarlo de los
// reportes era circular: un repositorio que mide .ts no decia una palabra sobre
// un .tsx nuevo sin pruebas, porque .tsx no estaba entre lo medido.
export const esFuente = (r) => EXTENSIONES_FUENTE.some((e) => r.endsWith(e));

/**
 * Si una linea del cambio PUEDE generar codigo. Una linea en blanco, un
 * comentario, una llave de cierre o una declaracion de tipos nunca reciben una
 * entrada `DA:` de ningun reporter, asi que su ausencia no prueba nada: sin
 * este filtro, agregar un comentario al final de un archivo cubierto seria un
 * rojo que ninguna prueba puede apagar. Es deliberadamente conservador — ante
 * la duda, la linea CUENTA como contenido.
 */
export function pareceEjecutable(texto) {
  const t = String(texto ?? "").trim();
  if (!t) return false;
  if (/^(?:\/\/|\/\*|\*\/|\*|#)/.test(t)) return false; // comentarios
  if (/^[)\]}>;,]+$/.test(t)) return false; // cierres sueltos
  if (/^(?:export\s+)?(?:declare\s+)?(?:type|interface)\b/.test(t)) return false;
  if (/^import\s+type\b/.test(t)) return false;
  return true;
}

// Lo que abre una declaracion de nivel de tipos. Es el MISMO patron que usa
// `pareceEjecutable` para la primera linea, mas `declare` suelto (los
// `declare module` / `declare global` de un .d.ts).
const ABRE_TIPOS = /^(?:export\s+)?(?:declare\s+)?(?:type|interface)\b|^declare\b/;

// Cadenas y comentario final fuera antes de contar llaves: sin esto, un
// `type Llave = "{"` dejaba la cuenta abierta y el bloque se comia el codigo
// de abajo, que es la direccion peligrosa de este filtro.
const sinLiterales = (t) =>
  t
    .replace(/\\./g, "")
    .replace(/"[^"]*"|'[^']*'|`[^`]*`/g, "")
    .replace(/\/\/.*$/, "");

/**
 * Los numeros de linea (1-based) que caen DENTRO de una declaracion de tipos.
 *
 * `pareceEjecutable` mira una linea suelta, asi que descarta la que ABRE un
 * `type` o una `interface` pero no su CUERPO: `id: string;` o `| "aprobado"`
 * pasaban por codigo. Ningun reporter emite `DA:` para una declaracion de
 * tipos, de modo que exigirle cobertura a un `tipos.ts` —el archivo mas comun
 * del stack fijado— era un rojo que ninguna prueba podia apagar, y un check
 * que se pone rojo en falso termina desactivado.
 *
 * La declaracion se lee como una sentencia: empieza en la palabra clave y
 * termina cuando las llaves se cerraron y la linea acaba en `}` o en `;`. Si el
 * archivo se acaba sin cerrarla, no se descarta NADA de ella: ante la duda, la
 * linea cuenta como contenido.
 */
export function lineasDeTipos(lineas) {
  const dentro = new Set();
  let activo = false;
  let abiertas = 0;
  let desde = 0;
  for (let i = 0; i < lineas.length; i++) {
    const t = String(lineas[i] ?? "").trim();
    if (!activo) {
      if (!ABRE_TIPOS.test(t)) continue;
      activo = true;
      abiertas = 0;
      desde = i;
    }
    const limpio = sinLiterales(t);
    for (const c of limpio) {
      if (c === "{") abiertas += 1;
      else if (c === "}") abiertas -= 1;
    }
    dentro.add(i + 1);
    if (abiertas <= 0 && (limpio.endsWith("}") || limpio.endsWith(";"))) activo = false;
  }
  if (activo) for (let i = desde; i < lineas.length; i++) dentro.delete(i + 1);
  return dentro;
}

/**
 * Convierte un glob en expresion regular. Soporta lo que hace falta de verdad
 * para encontrar reportes: `**` (cualquier cantidad de segmentos), `*`, `?` y
 * `{a,b}`. Se escribe a mano en vez de usar fs.glob porque en Node 22 esa API
 * es experimental y emite un warning en cada corrida.
 */
export function globARegExp(glob) {
  let re = "";
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === "*" && glob[i + 1] === "*") {
      i++;
      if (glob[i + 1] === "/") {
        i++;
        re += "(?:[^/]+/)*"; // "**/" matchea tambien cero segmentos
      } else {
        re += ".*";
      }
    } else if (c === "*") {
      re += "[^/]*";
    } else if (c === "?") {
      re += "[^/]";
    } else if (c === "{") {
      re += "(?:";
    } else if (c === "}") {
      re += ")";
    } else if (c === ",") {
      re += "|";
    } else {
      re += escaparRegExp(c);
    }
  }
  return new RegExp(`^${re}$`);
}

/** Recorre el arbol desde `raiz` devolviendo rutas relativas con barras. */
function recorrer(raiz, relativa = "", encontrados = []) {
  let entradas;
  try {
    entradas = readdirSync(relativa ? join(raiz, relativa) : raiz, { withFileTypes: true });
  } catch {
    return encontrados;
  }
  for (const e of entradas) {
    if (e.name === "node_modules" || e.name === ".git") continue;
    const hijo = relativa ? `${relativa}/${e.name}` : e.name;
    if (e.isDirectory()) recorrer(raiz, hijo, encontrados);
    else if (e.isFile()) encontrados.push(hijo);
  }
  return encontrados;
}

export function buscarLcov(raiz, patrones) {
  const regexes = patrones
    .split(/\r?\n/)
    .map((p) => p.trim())
    .filter((p) => p && !p.startsWith("#"))
    .map((p) => globARegExp(normalizarRuta(p)));
  if (!regexes.length) return [];
  return recorrer(raiz).filter((r) => regexes.some((re) => re.test(r)));
}

// ------------------------------------------------------------------- git ---

function git(args, { silencioso = false } = {}) {
  try {
    return execFileSync("git", args, {
      encoding: "utf8",
      maxBuffer: 256 * 1024 * 1024,
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (e) {
    if (silencioso) return null;
    throw e;
  }
}

const existeCommit = (ref) =>
  git(["cat-file", "-e", `${ref}^{commit}`], { silencioso: true }) !== null;

/**
 * Trae la base si el clon no la tiene. actions/checkout usa fetch-depth: 1 por
 * default, asi que en un pull request normal el commit base NO esta en el clon
 * y hay que ir a buscarlo.
 */
function traerBase(ref) {
  if (existeCommit(ref)) return true;
  const remotos = (git(["remote"], { silencioso: true }) ?? "").trim();
  if (!remotos) return false;
  const remoto = remotos.split(/\r?\n/)[0].trim();
  const esSuperficial =
    (git(["rev-parse", "--is-shallow-repository"], { silencioso: true }) ?? "").trim() === "true";
  const args = ["fetch", "--no-tags", "--quiet"];
  // --depth solo si YA es superficial: pedirlo sobre un clon completo lo
  // volveria superficial y romperia cualquier paso posterior que use historia.
  if (esSuperficial) args.push("--depth=1");
  args.push(remoto, ref);
  git(args, { silencioso: true });
  return existeCommit(ref);
}

/**
 * Lineas AGREGADAS o MODIFICADAS por el rango, por archivo.
 *
 * Comparacion de DOS PUNTOS (`git diff A B`), no de tres: `A...B` exige
 * calcular el merge-base y muere en un clon superficial, que es exactamente lo
 * que trae actions/checkout por default. El precio esta declarado en el README
 * de la action (si la base avanzo, se sobrecuenta), y sobrecontar es el lado
 * conservador.
 */
function lineasAgregadas(base, cabeza) {
  const salida = git([
    "-c",
    "core.quotepath=false",
    "diff",
    "--unified=0",
    "--no-color",
    "--no-ext-diff",
    "--find-renames",
    base,
    cabeza,
  ]);
  return parsearDiff(salida ?? "");
}

export function parsearDiff(texto) {
  const porArchivo = new Map();
  let archivo = null;
  let enCabecera = false;
  for (const linea of texto.split(/\r?\n/)) {
    if (linea.startsWith("diff --git ")) {
      archivo = null;
      enCabecera = true;
      continue;
    }
    // El "+++ " solo se lee dentro de la cabecera: una linea de contenido
    // agregada cuyo texto empiece con "++ " se imprime como "+++ " y se
    // confundiria con el encabezado del archivo.
    if (enCabecera && linea.startsWith("+++ ")) {
      const cruda = linea.slice(4).replace(/\t.*$/, "");
      if (cruda === "/dev/null") {
        archivo = null;
      } else if (cruda.startsWith('"')) {
        try {
          archivo = normalizarRuta(JSON.parse(cruda).replace(/^b\//, ""));
        } catch {
          archivo = null;
        }
      } else {
        archivo = normalizarRuta(cruda.replace(/^b\//, ""));
      }
      continue;
    }
    if (linea.startsWith("@@")) {
      enCabecera = false;
      const m = /^@@+ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))?/.exec(linea);
      if (!m || !archivo) continue;
      const desde = Number(m[1]);
      const cuantas = m[2] === undefined ? 1 : Number(m[2]);
      if (!cuantas) continue; // borrado puro: no agrega ninguna linea
      let set = porArchivo.get(archivo);
      if (!set) porArchivo.set(archivo, (set = new Set()));
      for (let l = desde; l < desde + cuantas; l++) set.add(l);
    }
  }
  return porArchivo;
}

// ------------------------------------------------------------------ lcov ---

/** El registro vacio de un archivo: las tres metricas, sin un solo dato. */
export const registroVacio = () => ({
  lineas: new Map(),
  funciones: new Map(),
  ramas: new Map(),
  // Registros en los que FN: y FNDA: no se pudieron emparejar. No es
  // decorativo: sin emparejar, el denominador de funciones deja de ser exacto,
  // y eso hay que decirlo en vez de publicar un numero como si lo fuera.
  funcionesDesparejadas: 0,
});

/**
 * Parsea un lcov quedandose con los registros POR ITEM de las tres metricas:
 *
 *   DA:<linea>,<hits>                        -> lineas,   clave = linea
 *   FN:<linea>,<nombre> + FNDA:<hits>,<nom>  -> funciones, clave = linea,nombre
 *   BRDA:<linea>,<bloque>,<rama>,<taken>     -> ramas,     clave = l,b,r
 *
 * Devuelve Map<rutaCruda, {lineas, funciones, ramas}>, cada uno Map<clave,hits>.
 * Si la misma ruta aparece en varios reportes se queda con el MAXIMO de hits:
 * un item cubierto por alguna suite esta cubierto.
 *
 * POR QUE LOS REGISTROS Y NO LAS LINEAS DE RESUMEN (LF/LH, FNF/FNH, BRF/BRH).
 * Los resumenes no se pueden FUSIONAR: si dos suites del monorepo miden el
 * mismo archivo, sumar sus LF/LH cuenta dos veces el denominador y una linea
 * cubierta por una sola de las dos aparece como media cubierta. Con los
 * registros la fusion es exacta, y es la misma que el plano del diff ya hacia
 * con DA.
 *
 * POR QUE LAS FUNCIONES SE EMPAREJAN POR POSICION Y NO SE AGRUPAN POR NOMBRE.
 * `FNDA:` no trae la linea, asi que la identidad de una funcion solo se
 * reconstruye emparejando cada FNDA con su FN. Agrupar por NOMBRE parece
 * equivalente y no lo es: el nombre NO es unico dentro de un archivo. Medido
 * sobre el reporte real del consumidor: 48 de sus 215 funciones comparten
 * nombre con otra del mismo archivo, y agruparlas movia el total de funciones
 * 1,84 puntos hacia abajo (70,70% -> 68,86%) sin que nada lo dijera. Un sesgo
 * silencioso justo en la metrica que origino el incidente es peor que no medir.
 * Los reporters del stack (v8 e istanbul) emiten TODOS los `FN:` de un registro
 * y despues todos sus `FNDA:`, en el mismo orden; comprobado contra los dos
 * reportes del consumidor (75 registros, cero desparejados, cero intercalados).
 * Si algun reporter no cumpliera, el emparejamiento cae a los nombres y la
 * corrida lo AVISA en vez de publicar el numero torcido.
 *
 * Una `FN:` sin ningun `FNDA:` cuenta como funcion declarada con cero
 * ejecuciones, que es justamente el caso que hundio al consumidor: funciones
 * que existen y ninguna prueba llama.
 */
export function parsearLcovDetallado(texto, acumulado = new Map()) {
  let actual = null;
  let declaradas = []; // claves "linea,nombre" en el orden en que llegaron
  let ejecuciones = []; // [{ nombre, hits }] en el orden en que llegaron
  const maximo = (mapa, clave, hits) => mapa.set(clave, Math.max(mapa.get(clave) ?? 0, hits));

  const cerrarRegistro = () => {
    if (!actual) return;
    for (const clave of declaradas) if (!actual.funciones.has(clave)) actual.funciones.set(clave, 0);
    if (ejecuciones.length <= declaradas.length) {
      // El caso normal: emparejamiento por posicion, denominador exacto.
      ejecuciones.forEach(({ hits }, i) => maximo(actual.funciones, declaradas[i], hits));
    } else {
      // Mas ejecuciones que declaraciones: el reporte no respeta la convencion
      // y no hay con que emparejar. Se cae a los nombres, que es lo unico que
      // queda, y el registro se marca para que la corrida lo diga.
      actual.funcionesDesparejadas++;
      const porNombre = new Map();
      for (const clave of declaradas) {
        const nombre = clave.slice(clave.indexOf(",") + 1);
        if (!porNombre.has(nombre)) porNombre.set(nombre, clave);
      }
      for (const { nombre, hits } of ejecuciones) {
        maximo(actual.funciones, porNombre.get(nombre) ?? `?,${nombre}`, hits);
      }
    }
    declaradas = [];
    ejecuciones = [];
  };

  for (const linea of texto.split(/\r?\n/)) {
    const l = linea.trim();
    if (l.startsWith("SF:")) {
      cerrarRegistro();
      const ruta = l.slice(3).trim();
      actual = acumulado.get(ruta);
      if (!actual) acumulado.set(ruta, (actual = registroVacio()));
      continue;
    }
    if (l === "end_of_record") {
      cerrarRegistro();
      actual = null;
      continue;
    }
    if (!actual) continue;
    if (l.startsWith("DA:")) {
      const partes = l.slice(3).split(",");
      const numero = Number(partes[0]);
      const hits = Number(partes[1]);
      if (!Number.isFinite(numero) || !Number.isFinite(hits)) continue;
      maximo(actual.lineas, numero, hits);
    } else if (l.startsWith("FN:")) {
      const coma = l.indexOf(",");
      if (coma < 0) continue;
      const numero = Number(l.slice("FN:".length, coma));
      const nombre = l.slice(coma + 1).trim();
      if (!nombre || !Number.isFinite(numero)) continue;
      declaradas.push(`${numero},${nombre}`);
    } else if (l.startsWith("FNDA:")) {
      const coma = l.indexOf(",");
      if (coma < 0) continue;
      const hits = Number(l.slice("FNDA:".length, coma));
      const nombre = l.slice(coma + 1).trim();
      if (!nombre || !Number.isFinite(hits)) continue;
      ejecuciones.push({ nombre, hits });
    } else if (l.startsWith("BRDA:")) {
      const partes = l.slice("BRDA:".length).split(",");
      if (partes.length < 4) continue;
      // "-" significa que el bloque nunca se ejecuto, asi que la rama tampoco.
      const bruto = partes[3].trim();
      const tomada = bruto === "-" ? 0 : Number(bruto);
      if (!Number.isFinite(tomada)) continue;
      maximo(actual.ramas, `${partes[0]},${partes[1]},${partes[2]}`, tomada);
    }
  }
  // Un lcov sin el `end_of_record` final no pierde su ultimo registro.
  cerrarRegistro();
  return acumulado;
}

/** Fusiona el registro de `origen` sobre `destino`, quedandose con el maximo. */
export function fusionarRegistro(destino, origen) {
  for (const clave of ["lineas", "funciones", "ramas"]) {
    for (const [k, h] of origen[clave]) {
      destino[clave].set(k, Math.max(destino[clave].get(k) ?? 0, h));
    }
  }
  destino.funcionesDesparejadas += origen.funcionesDesparejadas;
  return destino;
}

/**
 * La vista de LINEAS del parser detallado: Map<rutaCruda, Map<linea, hits>>.
 * Es lo unico que necesita el plano del diff, y conserva la firma que ya tenia.
 */
export function parsearLcov(texto, acumulado = new Map()) {
  for (const [ruta, registro] of parsearLcovDetallado(texto)) {
    let previo = acumulado.get(ruta);
    if (!previo) acumulado.set(ruta, (previo = new Map()));
    for (const [l, h] of registro.lineas) previo.set(l, Math.max(previo.get(l) ?? 0, h));
  }
  return acumulado;
}

// ------------------------------------------- el total, paquete por paquete ---
//
// EL SEGUNDO PLANO DEL REQUIREMENT DE COBERTURA, y hasta hoy el que no existia.
// El plano del diff (todo lo de arriba) protege el codigo NUEVO; sin este, el
// codigo que ya esta sin pruebas se queda asi para siempre porque nadie lo
// toca. Medido en el consumidor real: 70,69% de funciones en `web`, 9,4 puntos
// por debajo del minimo declarado de 80, con EXIT 0 — y el spec prometia rojo.
//
// La regla, por metrica medible de cada paquete:
//
//   1. total < piso declarado          -> ROJO (retroceso: el piso es ganancia
//                                        acumulada y no vuelve atras, este
//                                        arriba o abajo del minimo)
//   2. total >= minimo del marco       -> VERDE
//   3. total < minimo del marco y
//        a. sin deuda declarada        -> ROJO (no esta en transicion: incumple)
//        b. deuda con fecha vencida    -> ROJO (a partir de ese dia se compara
//                                        contra el MINIMO, no contra el piso)
//        c. deuda con fecha vigente    -> AMARILLO, y reporta cuanto falta y
//                                        cuanto plazo queda
//
// El umbral del consumidor NO participa: aca solo puede SUBIR la exigencia
// (ratchet por encima del minimo), nunca bajarla. Bajar `minimo` a 40 volvia
// verde un paquete al 33% — es la tercera medicion que este bloque cierra.

/** Dias enteros entre dos fechas ISO (positivo = `hasta` esta en el futuro). */
export function diasEntre(desde, hasta) {
  const ms = Date.parse(`${hasta}T00:00:00Z`) - Date.parse(`${desde}T00:00:00Z`);
  return Math.round(ms / 86400000);
}

/**
 * El veredicto del total de UN paquete. Funcion pura a proposito: la regla se
 * prueba sin armar un repositorio ni un lcov, y los casos de borde (la fecha
 * que vence HOY, el piso por encima del minimo) quedan escritos como aserciones
 * y no como un repo temporal que nadie relee.
 *
 * `metricas`: { lineas: {encontradas, cubiertas}, funciones: {...}, ramas: {...} }
 */
export function veredictoDePaquete({
  metricas = {},
  piso = {},
  deuda = null,
  minimo,
  hoy,
  ventanaHasta = VENTANA_DE_GRACIA_HASTA,
}) {
  const vencida = deuda ? diasEntre(hoy, deuda.fecha) < 0 : false;
  // La ventana de gracia del estreno: mientras dura, la falta de declaracion
  // avisa en vez de detener. Ver VENTANA_DE_GRACIA_HASTA.
  const enVentana = ventanaHasta ? diasEntre(hoy, ventanaHasta) >= 0 : false;
  const filas = [];
  let rojo = false;
  let amarillo = false;

  for (const { clave, etiqueta } of METRICAS_DE_COBERTURA) {
    const m = metricas[clave];
    // Denominador cero = no hay nada de esa metrica que medir en este paquete
    // (un paquete sin ramas, un reporter que no emite FN). Se declara "n/a" en
    // el resumen en vez de callarse: un salteo mudo es indistinguible de una
    // metrica que nadie mide.
    if (!m || !m.encontradas) {
      filas.push({ clave, etiqueta, medible: false });
      continue;
    }
    const pct = (m.cubiertas / m.encontradas) * 100;
    const pisoDeclarado = typeof piso[clave] === "number" ? piso[clave] : null;
    const fila = {
      clave,
      etiqueta,
      medible: true,
      pct,
      encontradas: m.encontradas,
      cubiertas: m.cubiertas,
      pisoDeclarado,
      veredicto: "verde",
      falta: 0,
    };
    if (pisoDeclarado !== null && pct + EPSILON < pisoDeclarado) {
      fila.veredicto = "retroceso";
      rojo = true;
    } else if (pct + EPSILON < minimo) {
      fila.falta = minimo - pct;
      if (!deuda) {
        if (enVentana) {
          fila.veredicto = "sin-plazo-en-gracia";
          amarillo = true;
        } else {
          fila.veredicto = "sin-plazo";
          rojo = true;
        }
      } else if (vencida) {
        fila.veredicto = "plazo-vencido";
        rojo = true;
      } else {
        fila.veredicto = "en-plazo";
        amarillo = true;
      }
    }
    filas.push(fila);
  }

  return {
    filas,
    vencida,
    enVentana,
    ventanaHasta,
    diasDeVentana: ventanaHasta ? diasEntre(hoy, ventanaHasta) : null,
    diasDePlazo: deuda ? diasEntre(hoy, deuda.fecha) : null,
    estado: rojo ? "rojo" : amarillo ? "amarillo" : "verde",
  };
}

/**
 * Reparte la cobertura resuelta entre los paquetes que la contienen y suma sus
 * metricas. Devuelve `{ porPaquete: Map<paquete, metricas>, excluidos, pruebas }`.
 *
 * Lo que NO cuenta en el total, y por que:
 *  - los archivos de prueba: medir la cobertura de las pruebas infla el total
 *    con el codigo que siempre se ejecuta;
 *  - los excluidos por una exclusion declarada CON MOTIVO, que es la valvula
 *    que el mismo spec contempla ("ese codigo no cuenta en el calculo").
 */
export function agregarPorPaquete({ cobertura, paquetes, exclusionDe }) {
  const porPaquete = new Map();
  const excluidos = [];
  const pruebas = [];
  const sinPaquete = [];

  for (const [archivo, registro] of cobertura) {
    if (esArchivoDePrueba(archivo)) {
      pruebas.push(archivo);
      continue;
    }
    const exclusion = exclusionDe(archivo);
    if (exclusion) {
      excluidos.push({ archivo, ...exclusion });
      continue;
    }
    const paq = paqueteDe(paquetes, archivo);
    if (!paq) {
      sinPaquete.push(archivo);
      continue;
    }
    let acumulado = porPaquete.get(paq);
    if (!acumulado) {
      acumulado = { archivos: 0, desparejados: 0, metricas: {} };
      for (const { clave } of METRICAS_DE_COBERTURA) {
        acumulado.metricas[clave] = { encontradas: 0, cubiertas: 0 };
      }
      porPaquete.set(paq, acumulado);
    }
    acumulado.archivos++;
    acumulado.desparejados += registro.funcionesDesparejadas ?? 0;
    for (const { clave } of METRICAS_DE_COBERTURA) {
      const items = registro[clave];
      acumulado.metricas[clave].encontradas += items.size;
      for (const hits of items.values()) if (hits > 0) acumulado.metricas[clave].cubiertas++;
    }
  }

  return { porPaquete, excluidos, pruebas, sinPaquete };
}

/**
 * Las exclusiones declaradas, leidas con la misma mecanica del censo: el
 * manifiesto del paquete que CONTIENE el archivo, patron + motivo escrito. Una
 * exclusion sin motivo no excusa nada (y el censo la enrojece por su cuenta).
 *
 * Los DOS planos la comparten: si el plano del diff perdonara un archivo que el
 * del total sigue contando, la misma exclusion querria decir dos cosas.
 */
export function crearExclusionDe(paquetes) {
  return (archivo) => {
    const paq = paqueteDe(paquetes, archivo);
    if (!paq || paq.error) return null;
    const prefijo = paq.dir ? `${paq.dir}/` : "";
    const relativa = archivo.slice(prefijo.length);
    for (const ex of paq.excluidos) {
      const patron = typeof ex?.patron === "string" ? ex.patron.trim() : "";
      const motivo = typeof ex?.motivo === "string" ? ex.motivo.trim() : "";
      if (!patron || !motivo) continue;
      if (globDelCenso(patron).test(relativa)) return { patron, motivo, manifiesto: paq.manifiesto };
    }
    return null;
  };
}

/** La fecha con la que se compara el plazo. Ver COBERTURA_HOY mas abajo. */
function fechaDeLaCorrida() {
  const crudo = (process.env.COBERTURA_HOY ?? "").trim();
  if (!crudo) return new Date().toISOString().slice(0, 10);
  // Existe para que las pruebas puedan fijar el dia, y es la unica palanca del
  // script capaz de aflojar una compuerta (una fecha en el pasado revive un
  // plazo vencido). Por eso NUNCA es silenciosa: si se usa, la corrida lo dice.
  if (!esFechaIso(crudo)) {
    console.error(
      `::warning::COBERTURA_HOY="${crudo}" no es una fecha AAAA-MM-DD: se ignora y el plazo se compara contra la fecha real de la corrida`
    );
    return new Date().toISOString().slice(0, 10);
  }
  console.error(
    `::warning::la fecha de la corrida esta forzada a ${crudo} por COBERTURA_HOY: los plazos de las deudas de cobertura se comparan contra ese dia y no contra hoy`
  );
  return crudo;
}

const pct = (n) => `${n.toFixed(2)}%`;

/**
 * Corre la compuerta del total y devuelve su codigo de salida (0 o 1). Escribe
 * su propia seccion del resumen SIEMPRE, tambien en verde: "cada corrida SHALL
 * reportar, por cada paquete que este por debajo del minimo, cuanto le falta y
 * cuanto plazo le queda". Una deuda que no se nombra en cada corrida es una
 * deuda que nadie mira hasta el dia en que vence.
 */
function compuertaDelTotal({ paquetes, exclusionDe, cobertura, minimoLocal, ambiguos }) {
  // El minimo del marco es PISO DURO del total: el umbral del consumidor solo
  // puede subirlo. Si pudiera bajarlo, la compuerta seria una sugerencia.
  const minimo = Math.max(MINIMO_DEL_MARCO, minimoLocal);
  const hoy = fechaDeLaCorrida();

  RT("");
  RT("## Cobertura total por paquete");
  RT("");
  RT(`Minimo del marco: **${MINIMO_DEL_MARCO}%** · exigido en esta corrida: **${minimo}%** · fecha: \`${hoy}\``);
  RT("");

  if (!paquetes.length) {
    console.log("::notice::el repositorio no versiona ningun package.json: no hay paquete cuyo total medir");
    RT("**No aplicable** — el repositorio no versiona ningun manifiesto de paquete.");
    return 0;
  }

  // Un manifiesto con el piso o la deuda mal declarados NO se lee como "sin
  // declaracion": se lee como rojo. Si se leyera como "sin declaracion", una
  // fecha mal escrita seria la forma mas barata de no tener plazo.
  const malDeclarados = paquetes.filter((p) => p.error);

  const ambiguas = new Set(ambiguos.map((a) => a.resuelta));
  const coberturaDelTotal = new Map();
  for (const [archivo, registro] of cobertura) {
    if (!ambiguas.has(archivo)) coberturaDelTotal.set(archivo, registro);
  }
  if (ambiguas.size) {
    console.error(
      `::warning::${ambiguas.size} archivo(s) quedaron FUERA del total porque su ruta SF: corresponde a dos archivos versionados distintos y no se puede saber a que paquete atribuirlos: ${[...ambiguas].slice(0, 5).join(", ")}. Arreglo: configura el projectRoot del reporter lcov en la raiz del repositorio`
    );
  }

  const { porPaquete, excluidos, pruebas, sinPaquete } = agregarPorPaquete({
    cobertura: coberturaDelTotal,
    paquetes,
    exclusionDe,
  });

  // Lo que quedo FUERA del denominador se declara ANTES de cualquier veredicto,
  // incluido el "no medido" de mas abajo: si un repositorio excluye todo lo que
  // sus reportes reclaman, el resumen tiene que decir "esta excluido con su
  // motivo" y no "ningun reporte reclama nada", que es un diagnostico falso.
  const declararFueraDelTotal = () => {
    if (excluidos.length) {
      console.log(
        `::notice::${excluidos.length} archivo(s) quedaron fuera del total por una exclusion declarada con motivo`
      );
      RT("Archivos fuera del total por una exclusion declarada, con su motivo:");
      for (const x of excluidos.slice(0, 20)) {
        RT(`- \`${x.archivo}\` — ${x.motivo} (\`${x.manifiesto}\`, patron \`${x.patron}\`)`);
      }
      if (excluidos.length > 20) RT(`- ...y ${excluidos.length - 20} mas`);
      RT("");
    }
    if (pruebas.length || sinPaquete.length) {
      RT(
        `Fuera del total, ademas: ${pruebas.length} archivo(s) de prueba y ${sinPaquete.length} archivo(s) sin paquete contenedor.`
      );
      RT("");
    }
  };

  if (!porPaquete.size && !malDeclarados.length) {
    declararFueraDelTotal();
    if (excluidos.length) {
      // Caso legitimo: todo lo medible esta excluido con su motivo escrito.
      RT("**Sin total que medir** — todo lo que los reportes reclaman esta excluido del calculo con su motivo declarado.");
      return 0;
    }
    // Sin reportes no hay total que medir. NO es rojo por si mismo: el plano
    // del diff ya enrojece cuando hay lineas agregadas sin datos, y en un push
    // a main sin cobertura emitida no hay nada que verificar. Pero se dice.
    console.error(
      `::warning::ningun reporte de cobertura reclama archivos de un paquete versionado: el total por paquete NO se pudo medir en esta corrida. Arreglo: corre las pruebas con cobertura (y con 'all: true') antes de este paso`
    );
    RT("**No medido** — ningun reporte de cobertura reclama archivos de algun paquete.");
    RT("");
    RT("Arreglo: corre las pruebas **con cobertura** y con `all: true` antes de este paso.");
    return 0;
  }

  const veredictos = [...porPaquete.entries()]
    .map(([paq, agregado]) => ({
      paq,
      agregado,
      veredicto: veredictoDePaquete({
        metricas: agregado.metricas,
        piso: paq.piso,
        deuda: paq.deuda,
        minimo,
        hoy,
      }),
    }))
    .sort((a, b) => (a.paq.dir || ".").localeCompare(b.paq.dir || "."));

  // El denominador de funciones es exacto solo si cada FNDA pudo emparejarse
  // con su FN. Cuando no, el numero sigue saliendo —es lo mejor que hay— pero
  // no se publica como si fuera exacto: un sesgo silencioso en esta metrica es
  // el que dejo al consumidor en verde a 70,69%.
  const desparejados = veredictos.reduce((a, v) => a + (v.agregado.desparejados ?? 0), 0);
  if (desparejados) {
    console.error(
      `::warning::en ${desparejados} registro(s) de cobertura los FNDA: no se pudieron emparejar con sus FN:, asi que el total de FUNCIONES de esos paquetes es aproximado y no exacto. Arreglo: revisa el reporter lcov del paquete — el formato espera todos los FN: de un archivo y despues todos sus FNDA:, en el mismo orden`
    );
    RT(`> ⚠️ El total de funciones es aproximado: ${desparejados} registro(s) con FN:/FNDA: desparejados.`);
    RT("");
  }

  RT("| Paquete | Metrica | Total | Minimo | Piso declarado | Estado |");
  RT("|---|---|---:|---:|---:|---|");
  const etiquetaDeEstado = {
    verde: "OK",
    retroceso: "ROJO · retroceso",
    "sin-plazo": "ROJO · sin plazo",
    "sin-plazo-en-gracia": "AMARILLO · ventana de estreno",
    "plazo-vencido": "ROJO · plazo vencido",
    "en-plazo": "AMARILLO · en plazo",
  };
  for (const { paq, veredicto } of veredictos) {
    for (const fila of veredicto.filas) {
      const nombre = `\`${paq.dir || "."}\``;
      if (!fila.medible) {
        RT(`| ${nombre} | ${fila.etiqueta} | n/a | ${minimo}% | — | sin datos de esa metrica |`);
        continue;
      }
      RT(
        `| ${nombre} | ${fila.etiqueta} | **${pct(fila.pct)}** | ${minimo}% | ${
          fila.pisoDeclarado === null ? "—" : `${fila.pisoDeclarado}%`
        } | ${etiquetaDeEstado[fila.veredicto]} |`
      );
    }
  }
  RT("");

  let codigo = 0;

  // EL DEBER DE REPORTE, y sale en TODA corrida: cuanto falta y cuanto plazo
  // queda, paquete por paquete y metrica por metrica.
  const enFalta = veredictos.filter((v) => v.veredicto.filas.some((f) => f.medible && f.falta > 0));
  if (enFalta.length) {
    RT("### Paquetes por debajo del minimo del marco");
    RT("");
    for (const { paq, veredicto } of enFalta) {
      const faltantes = veredicto.filas.filter((f) => f.medible && f.falta > 0);
      const detalle = faltantes
        .map((f) => `${f.etiqueta} ${pct(f.pct)} (faltan ${f.falta.toFixed(2)} puntos)`)
        .join("; ");
      if (paq.deuda) {
        const dias = veredicto.diasDePlazo;
        const plazo = veredicto.vencida
          ? `plazo VENCIDO hace ${Math.abs(dias)} dia(s) (${paq.deuda.fecha})`
          : `quedan ${dias} dia(s) de plazo (${paq.deuda.fecha})`;
        RT(`- \`${paq.dir || "."}\`: ${detalle} — ${plazo}. Motivo declarado: ${paq.deuda.motivo}`);
      } else if (veredicto.enVentana) {
        RT(
          `- \`${paq.dir || "."}\`: ${detalle} — **sin deuda declarada** en \`${paq.manifiesto}\`. Pasa por la ventana de estreno de esta compuerta, que se cierra el **${veredicto.ventanaHasta}** (quedan ${veredicto.diasDeVentana} dia(s)): desde ese dia esto es rojo.`
        );
      } else {
        RT(`- \`${paq.dir || "."}\`: ${detalle} — **sin deuda declarada** en \`${paq.manifiesto}\``);
      }
    }
    RT("");
  }

  for (const { paq, agregado, veredicto } of veredictos) {
    const nombre = paq.dir || ".";
    const retrocesos = veredicto.filas.filter((f) => f.veredicto === "retroceso");
    const sinPlazo = veredicto.filas.filter((f) => f.veredicto === "sin-plazo");
    const vencidos = veredicto.filas.filter((f) => f.veredicto === "plazo-vencido");
    const enPlazo = veredicto.filas.filter((f) => f.veredicto === "en-plazo");
    const enGracia = veredicto.filas.filter((f) => f.veredicto === "sin-plazo-en-gracia");

    for (const f of retrocesos) {
      console.error(
        `::error file=${paq.manifiesto}::el total de ${f.etiqueta} del paquete "${nombre}" es ${pct(f.pct)} y su piso declarado es ${f.pisoDeclarado}%: la cobertura ya conseguida RETROCEDIO. El piso es ganancia acumulada y no vuelve atras. Arreglo: agrega pruebas hasta recuperar el piso; si el descenso es deliberado, bajar el piso es una linea de diff en ${paq.manifiesto} con su motivo escrito y bajo review`
      );
    }
    for (const f of sinPlazo) {
      console.error(
        `::error file=${paq.manifiesto}::el total de ${f.etiqueta} del paquete "${nombre}" es ${pct(f.pct)} y el minimo del marco es ${minimo}%: faltan ${f.falta.toFixed(2)} puntos y el paquete no declara ni motivo ni fecha. Un paquete por debajo del minimo sin plazo escrito no esta en transicion, esta incumpliendo. Arreglo: agrega pruebas hasta el minimo, o declara la deuda en ${paq.manifiesto} con projects.cobertura.deuda = { "motivo": "<por que>", "fecha": "AAAA-MM-DD" }`
      );
    }
    for (const f of vencidos) {
      console.error(
        `::error file=${paq.manifiesto}::el plazo que el paquete "${nombre}" declaro (${paq.deuda.fecha}) vencio hace ${Math.abs(veredicto.diasDePlazo)} dia(s) y su total de ${f.etiqueta} sigue en ${pct(f.pct)}, ${f.falta.toFixed(2)} puntos por debajo del minimo de ${minimo}%. Desde el dia del vencimiento la comparacion es contra el MINIMO y no contra el piso. Arreglo: agrega pruebas hasta el minimo; correr la fecha se puede, pero es una linea de diff en ${paq.manifiesto} con su motivo y con el avance conseguido desde la fecha anterior, bajo review`
      );
    }
    for (const f of enPlazo) {
      console.error(
        `::warning file=${paq.manifiesto}::el paquete "${nombre}" esta ${f.falta.toFixed(2)} puntos por debajo del minimo de ${minimo}% en ${f.etiqueta} (${pct(f.pct)}) y le quedan ${veredicto.diasDePlazo} dia(s) de plazo (${paq.deuda.fecha}). Motivo declarado: ${paq.deuda.motivo}`
      );
    }
    // La ventana de estreno NO puede ser un verde discreto: si el consumidor no
    // se entera de que esto va a ser rojo, la ventana no le sirvio de nada y el
    // rojo lo cobra el que pasa por ahi el dia que se cierra.
    for (const f of enGracia) {
      console.error(
        `::warning file=${paq.manifiesto}::el total de ${f.etiqueta} del paquete "${nombre}" es ${pct(f.pct)} y el minimo del marco es ${minimo}%: faltan ${f.falta.toFixed(2)} puntos y el paquete no declara ni motivo ni fecha. Esta corrida PASA por la ventana de estreno de esta compuerta, que se cierra el ${veredicto.ventanaHasta} (quedan ${veredicto.diasDeVentana} dia(s)); desde ese dia el mismo estado es ROJO. Arreglo: agrega pruebas hasta el minimo, o declara la deuda en ${paq.manifiesto} con projects.cobertura.deuda = { "motivo": "<por que>", "fecha": "AAAA-MM-DD" }`
      );
    }

    if (veredicto.estado === "rojo") codigo = 1;
    if (veredicto.estado === "verde") {
      const medibles = veredicto.filas.filter((f) => f.medible);
      console.log(
        `OK  total del paquete "${nombre}" (${agregado.archivos} archivo(s)): ${medibles
          .map((f) => `${f.etiqueta} ${pct(f.pct)}`)
          .join(", ")} · minimo ${minimo}%`
      );
    }
  }

  for (const p of malDeclarados) {
    codigo = 1;
    console.error(
      `::error file=${p.manifiesto}::la configuracion de cobertura de "${p.dir || "."}" esta mal declarada y no se puede leer como declaracion valida: ${p.error}. Una declaracion invalida NO cuenta como declarada — si contara, una fecha mal escrita seria la forma mas barata de no tener plazo. Arreglo: corregi ${p.manifiesto}`
    );
    RT(`- \`${p.manifiesto}\`: declaracion de cobertura invalida — ${p.error}`);
  }

  declararFueraDelTotal();

  const publicables = [
    `paquetes_medidos=${porPaquete.size}`,
    `paquetes_bajo_minimo=${enFalta.length}`,
    `paquetes_en_rojo=${veredictos.filter((v) => v.veredicto.estado === "rojo").length + malDeclarados.length}`,
  ];
  console.log(`salidas del total: ${publicables.join(" ")}`);
  const destino = process.env.GITHUB_OUTPUT;
  if (destino) {
    try {
      appendFileSync(destino, publicables.join("\n") + "\n");
    } catch (e) {
      console.error(`::warning::no se pudieron publicar las salidas del total: ${e.message}`);
    }
  }

  const porLaVentana = veredictos.filter((v) =>
    v.veredicto.filas.some((f) => f.veredicto === "sin-plazo-en-gracia")
  );
  RT(
    codigo === 0
      ? porLaVentana.length
        ? `**Pasa por la ventana de estreno** — ${porLaVentana.length} paquete(s) por debajo del minimo sin deuda declarada. La ventana se cierra el **${VENTANA_DE_GRACIA_HASTA}** y desde ese dia esto es rojo.`
        : enFalta.length
          ? `**Pasa con deuda** — ${enFalta.length} paquete(s) por debajo del minimo, todos con plazo declarado y vigente.`
          : `**Pasa** — los ${porPaquete.size} paquete(s) medidos estan en o por encima del minimo del marco.`
      : "**Fallo** — hay paquetes cuyo total incumple el minimo del marco (detalle arriba)."
  );
  return codigo;
}

// -------------------------------------------------------------- programa ---

function principal() {
  const GLOB_LCOV = process.env.COBERTURA_LCOV ?? "**/coverage/lcov.info";
  const BASE = (process.env.COBERTURA_BASE ?? "").trim();
  const CABEZA = (process.env.COBERTURA_CABEZA ?? "").trim() || "HEAD";
  const MINIMO_CRUDO = (process.env.COBERTURA_MINIMO ?? "80").trim() || "80";
  const MAX_ANOTACIONES = Number(process.env.COBERTURA_MAX_ANOTACIONES ?? "20");

  const minimo = Number(MINIMO_CRUDO.replace(",", "."));
  if (!Number.isFinite(minimo) || minimo < 0 || minimo > 100) {
    console.error(
      `::error::el minimo de cobertura "${MINIMO_CRUDO}" no es un porcentaje entre 0 y 100. Arreglo: pone un numero en el input 'minimo' de la action (por ejemplo minimo: "80")`
    );
    R("## Cobertura de las lineas del cambio");
    R("");
    R(`**Fallo** — configuracion invalida: \`minimo\` = \`${MINIMO_CRUDO}\`.`);
    publicar("n/a", 0, 0);
    terminar(1);
  }

  const raiz = (git(["rev-parse", "--show-toplevel"], { silencioso: true }) ?? "").trim();
  if (!raiz) {
    console.error(
      "::error::el directorio de trabajo no es un repositorio git y no hay diff que medir. Arreglo: agrega actions/checkout ANTES de esta action"
    );
    R("## Cobertura de las lineas del cambio");
    R("");
    R("**Fallo** — no hay repositorio git en el directorio de trabajo: falta el `actions/checkout` previo.");
    publicar("n/a", 0, 0);
    terminar(1);
  }
  const raizNormalizada = normalizarRuta(raiz).replace(/\/$/, "");

  R("## Cobertura de las lineas del cambio");
  R("");

  // -----------------------------------------------------------------------
  // 0) LO QUE COMPARTEN LOS DOS PLANOS: los reportes, las rutas del control de
  //    versiones y los manifiestos de los paquetes.
  //
  //    Esta lectura estaba mas abajo, DESPUES de los controles del rango del
  //    diff. Subirla no es cosmetico: el total de un paquete no depende de
  //    ningun rango, asi que en un push a main —donde el plano del diff NO
  //    APLICA y salia 0— el total quedaba sin medir. Y parsear los lcov dos
  //    veces, una por plano, es la receta para que los dos planos midan cosas
  //    distintas con el mismo nombre.
  // -----------------------------------------------------------------------
  const rastreados = new Set(
    (git(["ls-files", "-z"]) ?? "")
      .split("\0")
      .filter(Boolean)
      .map(normalizarRuta)
  );
  const porMinusculas = new Map();
  for (const r of rastreados) {
    const clave = r.toLowerCase();
    const lista = porMinusculas.get(clave);
    if (lista) lista.push(r);
    else porMinusculas.set(clave, [r]);
  }

  const resolverContraElRepo = (rutaSF) => {
    let r = normalizarRuta(rutaSF);
    if (esAbsoluta(r) && r.toLowerCase().startsWith(`${raizNormalizada.toLowerCase()}/`)) {
      r = r.slice(raizNormalizada.length + 1);
    }
    if (rastreados.has(r)) return r;
    // Windows y macOS no distinguen mayusculas: un lcov puede traer otra caja.
    // Si hay mas de un candidato la resolucion es ambigua y se descarta.
    const candidatos = porMinusculas.get(r.toLowerCase());
    if (candidatos && candidatos.length === 1) return candidatos[0];
    return null;
  };

  const rutasLcov = buscarLcov(raiz, GLOB_LCOV);
  // De QUE reporte vino cada SF:. Sin esa procedencia no se puede ver la
  // colision de rutas de un monorepo (el bloque 6b de mas abajo).
  const origenes = new Map();
  const detalle = new Map(); // rutaSF -> {lineas, funciones, ramas}
  for (const ruta of rutasLcov) {
    let parcial;
    try {
      parcial = parsearLcovDetallado(readFileSync(join(raiz, ruta), "utf8"), new Map());
    } catch (e) {
      console.error(`::warning::no se pudo leer el reporte ${ruta}: ${e.message}`);
      continue;
    }
    const dirLcov = ruta.includes("/") ? ruta.slice(0, ruta.lastIndexOf("/")) : "";
    for (const [rutaSF, registro] of parcial) {
      let deDonde = origenes.get(rutaSF);
      if (!deDonde) origenes.set(rutaSF, (deDonde = new Set()));
      deDonde.add(dirLcov);
      const previo = detalle.get(rutaSF);
      if (!previo) detalle.set(rutaSF, registro);
      else fusionarRegistro(previo, registro);
    }
  }

  // Las rutas del lcov contra las del control de versiones. Este cruce ES el
  // check: si ninguna resuelve, el reporte esta cableado contra otro arbol y
  // "medir" daria cero lineas encontradas, o sea un falso verde.
  const coberturaDetallada = new Map(); // ruta versionada -> {lineas, funciones, ramas}
  const cobertura = new Map(); // ruta versionada -> Map<linea, hits>
  const sinResolver = [];
  const resueltaPorSF = new Map();
  for (const [rutaSF, registro] of detalle) {
    const resuelta = resolverContraElRepo(rutaSF);
    if (!resuelta) {
      sinResolver.push(rutaSF);
      continue;
    }
    resueltaPorSF.set(rutaSF, resuelta);
    const previo = coberturaDetallada.get(resuelta);
    if (!previo) coberturaDetallada.set(resuelta, registro);
    else fusionarRegistro(previo, registro);
  }
  for (const [resuelta, registro] of coberturaDetallada) cobertura.set(resuelta, registro.lineas);

  // LA COLISION DE RUTAS DEL MONOREPO. "SF:src/util.ts" emitido por el paquete
  // web/ resuelve contra el src/util.ts de la RAIZ: la ruta RESUELVE, asi que
  // esquiva todas las defensas de arriba, y la cobertura de un archivo termina
  // anotada en otro. El sintoma en el consumidor era un verde con el
  // diagnostico equivocado. Si una ruta del reporte corresponde a DOS archivos
  // versionados —el de la raiz y el que cuelga del directorio del propio
  // reporte— no dice a cual, y no se puede medir.
  const ambiguos = [];
  for (const [rutaSF, deDonde] of origenes) {
    const resuelta = resueltaPorSF.get(rutaSF);
    if (!resuelta) continue;
    const relativa = normalizarRuta(rutaSF);
    if (esAbsoluta(relativa)) continue;
    for (const dirLcov of deDonde) {
      const partes = dirLcov ? dirLcov.split("/") : [];
      for (let i = partes.length; i > 0; i--) {
        const candidato = `${partes.slice(0, i).join("/")}/${relativa}`;
        if (candidato !== resuelta && rastreados.has(candidato)) {
          ambiguos.push({ rutaSF, resuelta, otro: candidato, reporte: dirLcov });
          break;
        }
      }
    }
  }

  const paquetes = leerPaquetes(raiz, [...rastreados]);
  const exclusionDe = crearExclusionDe(paquetes);

  // -----------------------------------------------------------------------
  // PLANO DEL TOTAL. Corre ACA, antes que cualquier control del rango, porque
  // no depende del rango. Su veredicto no cortocircuita nada: se guarda en
  // `salidaMinima` y `terminar()` lo respeta, asi que el plano del diff sigue
  // reportando su propio diagnostico completo.
  // -----------------------------------------------------------------------
  salidaMinima = Math.max(
    salidaMinima,
    compuertaDelTotal({ paquetes, exclusionDe, cobertura: coberturaDetallada, minimoLocal: minimo, ambiguos })
  );

  // 1) Rango degenerado: sin base no hay cambio que medir. NO APLICA, y lo
  //    dice. Jamas se simula un 100%: un push a main no es un pull request con
  //    cobertura total.
  if (!BASE || SHA_CERO.test(BASE)) {
    const motivo = BASE
      ? `la base recibida (\`${BASE}\`) es el commit nulo`
      : "no se recibio commit base (esto no es un pull request)";
    console.log(`::notice::cobertura del cambio NO APLICABLE: ${motivo}`);
    R(`**No aplicable** — ${motivo}.`);
    R("");
    R("Este plano mide las lineas que un pull request agrega respecto de su base.");
    R("Fuera de ese contexto no hay rango que medir y no se reporta ningun");
    R("porcentaje. El plano del TOTAL por paquete no depende del rango y SI se");
    R("midio: su veredicto esta en la seccion de abajo, y manda sobre esta.");
    publicar("n/a", 0, 0);
    terminar(0);
  }

  // 2) La base tiene que estar en el clon. Si no se puede traer es ROJO: no
  //    hay nada que verificar, y "no se pudo verificar" nunca es un exito.
  if (!traerBase(BASE)) {
    console.error(
      `::error::el commit base ${BASE} no esta en el clon y no se pudo traer del remoto, asi que no hay diff que medir. Arreglo: en el paso de checkout pone 'fetch-depth: 0', o pasale a esta action un 'base' que exista en el clon`
    );
    R(`**Fallo** — el commit base \`${BASE}\` no esta en el clon y no se pudo traer.`);
    R("");
    R("Arreglo: `actions/checkout` con `fetch-depth: 0`.");
    publicar("n/a", 0, 0);
    terminar(1);
  }

  if (!existeCommit(CABEZA)) {
    console.error(
      `::error::el commit ${CABEZA} no existe en el clon. Arreglo: revisa el input 'cabeza' de la action (por defecto usa HEAD, que es lo que dejo el checkout)`
    );
    R(`**Fallo** — el commit \`${CABEZA}\` no existe en el clon.`);
    publicar("n/a", 0, 0);
    terminar(1);
  }

  const agregadas = lineasAgregadas(BASE, CABEZA);
  const totalAgregadas = [...agregadas.values()].reduce((a, s) => a + s.size, 0);

  const cabezaCorta =
    CABEZA === "HEAD"
      ? (git(["rev-parse", "--short", "HEAD"], { silencioso: true }) ?? "HEAD").trim()
      : CABEZA.slice(0, 12);
  R(`Rango \`${BASE.slice(0, 12)}\` -> \`${cabezaCorta}\` · minimo exigido: **${minimo}%**`);
  R("");

  // El minimo del consumidor no tiene piso duro (bajarlo es su decision), pero
  // tampoco es invisible: `minimo: '0'` dejaba la compuerta abierta para
  // siempre sin que el marco se enterara nunca.
  if (minimo < MINIMO_DEL_MARCO) {
    console.error(
      `::warning::este paso exige ${minimo}% y el minimo del marco es ${MINIMO_DEL_MARCO}% (decision D5 de calidad-fail-closed): la compuerta esta pidiendo menos de lo acordado. Arreglo: sacale el input 'minimo' a la action para heredar el del marco, o deja escrito en el workflow por que este repositorio exige menos`
    );
    R(
      `> ⚠️ El minimo recibido (**${minimo}%**) es menor que el del marco (**${MINIMO_DEL_MARCO}%**).`
    );
    R("");
  }

  // 3) Nada que medir: el cambio solo borra, o solo renombra. Pasa sin ruido.
  if (totalAgregadas === 0) {
    console.log(
      "OK  el cambio no agrega ni modifica ninguna linea (solo borra o renombra): nada que medir"
    );
    R(
      "**Pasa** — el cambio no agrega ni modifica lineas (solo borrados o renombres), asi que no hay nada que cubrir."
    );
    publicar("n/a", 0, 0);
    terminar(0);
  }

  // 4 y 5) Los reportes y su cruce contra el control de versiones ya se leyeron
  //    en el bloque 0, que los DOS planos comparten. Lo que sigue son los
  //    veredictos del plano del diff sobre esos mismos datos.

  // 6) EL CASO QUE HUNDE A LA HERRAMIENTA EXTERNA. Hay lineas agregadas y no
  //    hay un solo dato de cobertura que pueda corresponderles: rojo ruidoso
  //    con el arreglo, nunca "100%, todo bien".
  if (cobertura.size === 0) {
    const ejemplos = rutasLcov.length ? sinResolver.slice(0, 5) : [];
    if (!rutasLcov.length) {
      console.error(
        `::error::hay ${totalAgregadas} linea(s) agregadas y NO se encontro ningun reporte de cobertura con el patron '${GLOB_LCOV.replace(/\n/g, " | ")}'. Arreglo: corre las pruebas CON cobertura antes de este paso (por ejemplo 'pnpm -r test -- --coverage') y revisa el input 'lcov' de la action`
      );
    } else {
      console.error(
        `::error::se encontraron ${rutasLcov.length} reporte(s) de cobertura pero NINGUNA de sus rutas SF: corresponde a un archivo versionado, asi que no hay con que medir las ${totalAgregadas} linea(s) agregadas. Arreglo: el reporter lcov esta emitiendo rutas relativas a otra raiz — configura su projectRoot en la raiz del repositorio (vitest: reporter: [["lcov", { projectRoot: <raiz del monorepo> }]]) y vuelve a correr las pruebas`
      );
      for (const e of ejemplos) {
        console.error(`::error::  ruta emitida que no existe en el repositorio: ${e}`);
      }
    }
    R("**Fallo** — hay lineas agregadas y ningun dato de cobertura que les corresponda.");
    R("");
    R(`- lineas agregadas o modificadas: **${totalAgregadas}**`);
    R(`- reportes encontrados con \`${GLOB_LCOV.replace(/\n/g, " | ")}\`: **${rutasLcov.length}**`);
    if (ejemplos.length) {
      R("- rutas `SF:` que no corresponden a ningun archivo versionado:");
      for (const e of ejemplos) R(`  - \`${e}\``);
    }
    R("");
    R(
      rutasLcov.length
        ? "Arreglo: el reporter lcov emite rutas relativas a otra raiz. Configura su `projectRoot` en la raiz del repositorio y vuelve a correr las pruebas."
        : "Arreglo: corre las pruebas **con cobertura** antes de este paso y revisa el input `lcov`."
    );
    publicar("n/a", 0, 0);
    terminar(1);
  }

  if (sinResolver.length) {
    console.error(
      `::warning::${sinResolver.length} ruta(s) SF: de los reportes no corresponden a ningun archivo versionado y quedaron fuera de la medicion (por ejemplo: ${sinResolver.slice(0, 3).join(", ")})`
    );
  }
  const nombresSinResolver = new Set(sinResolver.map((r) => nombreDeArchivo(normalizarRuta(r))));

  // 6b) LA COLISION DE RUTAS DEL MONOREPO (calculada en el bloque 0). Cuando
  //     una ruta SF: corresponde a DOS archivos versionados, la cobertura se
  //     anotaria en el archivo equivocado: para el plano del diff eso es rojo.
  if (ambiguos.length) {
    console.error(
      `::error::${ambiguos.length} ruta(s) SF: de los reportes corresponden a DOS archivos versionados distintos —el de la raiz del repositorio y el que cuelga del paquete que emitio el reporte—, asi que la cobertura se anotaria en el archivo equivocado y no hay medicion confiable. Arreglo: configura el projectRoot del reporter lcov en la raiz del repositorio (vitest: reporter: [["lcov", { projectRoot: <raiz del monorepo> }]]) para que cada SF: diga a que archivo corresponde, y vuelve a correr las pruebas`
    );
    for (const a of ambiguos.slice(0, 10)) {
      console.error(
        `::error::  "${a.rutaSF}" (reporte en ${a.reporte || "."}/) puede ser ${a.resuelta} o ${a.otro}`
      );
    }
    R("**Fallo** — las rutas de los reportes no dicen a que archivo corresponden.");
    R("");
    for (const a of ambiguos.slice(0, 10)) {
      R(`- \`${a.rutaSF}\` (reporte en \`${a.reporte || "."}/\`): \`${a.resuelta}\` o \`${a.otro}\``);
    }
    R("");
    R("Arreglo: configura el `projectRoot` del reporter lcov en la raiz del repositorio.");
    publicar("n/a", 0, 0);
    terminar(1);
  }

  // 7) El cruce.
  let medidas = 0;
  let cubiertas = 0;
  const detallePorArchivo = [];
  const descubiertas = [];
  const noReclamados = [];
  const sospechosos = [];
  const sinDato = []; // fuente del cambio que ningun reporte reclama: ROJO
  const rancios = []; // reclamado, pero el reporte es anterior al cambio: ROJO
  const desalineados = []; // lineas nuevas con contenido que el reporte no menciona
  const excluidosDelCambio = [];
  let lineasFueraDelDenominador = 0;

  // El TEXTO de las lineas nuevas, leido del commit que se esta midiendo (no
  // del working tree, que puede no ser la cabeza del rango). Sin el no se puede
  // distinguir "el reporte no tiene dato para esta linea porque es un
  // comentario" de "no lo tiene porque el reporte es viejo".
  const textoPorArchivo = new Map();
  const lineasConContenido = (archivo, numeros) => {
    if (!textoPorArchivo.has(archivo)) {
      const t = git(["show", `${CABEZA}:${archivo}`], { silencioso: true });
      const lineas = t === null ? null : t.split(/\r?\n/);
      textoPorArchivo.set(archivo, lineas === null ? null : { lineas, tipos: lineasDeTipos(lineas) });
    }
    const texto = textoPorArchivo.get(archivo);
    // Si el archivo no se puede leer no se descarta nada: todas cuentan como
    // contenido. Es el lado conservador — no verificar nunca es un verde.
    if (!texto) return [...numeros];
    // Dos filtros, y hacen falta los dos: uno mira la linea sola (blancos,
    // comentarios, cierres) y el otro el BLOQUE de tipos que la contiene.
    return [...numeros].filter((l) => pareceEjecutable(texto.lineas[l - 1]) && !texto.tipos.has(l));
  };

  // Las exclusiones declaradas se leen en el bloque 0 (`exclusionDe`), que los
  // dos planos comparten a proposito: la misma exclusion no puede querer decir
  // una cosa sobre las lineas del cambio y otra sobre el total del paquete.

  for (const [archivo, lineas] of [...agregadas].sort(([a], [b]) => a.localeCompare(b))) {
    const datosArchivo = cobertura.get(archivo);
    if (!datosArchivo) {
      // Un archivo del cambio que ningun SF: reclama. Que sea legitimo o un
      // agujero NO lo decide la extension de lo que los reportes miden —eso
      // era circular—, sino la lista de extensiones de fuente del censo.
      noReclamados.push(archivo);
      if (!esFuente(archivo) || esArchivoDePrueba(archivo)) continue;
      const contenido = lineasConContenido(archivo, lineas);
      lineasFueraDelDenominador += contenido.length;
      const exclusion = exclusionDe(archivo);
      if (exclusion) {
        excluidosDelCambio.push({ archivo, ...exclusion });
        continue;
      }
      // Un archivo de puros comentarios o declaraciones de tipos no tiene nada
      // que cubrir: exigirle cobertura seria un rojo que nadie puede apagar.
      if (!contenido.length) continue;
      if (nombresSinResolver.has(nombreDeArchivo(archivo))) sospechosos.push(archivo);
      else sinDato.push({ archivo, lineas: contenido.length, primera: contenido[0] });
      continue;
    }
    let m = 0;
    let c = 0;
    const sinCubrirAqui = [];
    const sinDatoAqui = [];
    for (const linea of [...lineas].sort((a, b) => a - b)) {
      const hits = datosArchivo.get(linea);
      if (hits === undefined) {
        sinDatoAqui.push(linea); // puede ser no ejecutable... o lcov rancio
        continue;
      }
      m++;
      if (hits > 0) c++;
      else sinCubrirAqui.push(linea);
    }
    // EL LCOV RANCIO. Un reporte anterior al cambio reclama el archivo (asi que
    // esquiva todas las defensas de rutas) y simplemente no tiene entrada para
    // las lineas nuevas. Eso se leia como "no ejecutable" y el archivo
    // desaparecia de la medicion entera, incluido el listado de no reclamados:
    // exit 0 y MUDO. Vector real: un cache de CI que restaura coverage/.
    if (esFuente(archivo) && !esArchivoDePrueba(archivo) && sinDatoAqui.length) {
      const contenidoSinDato = lineasConContenido(archivo, sinDatoAqui);
      lineasFueraDelDenominador += contenidoSinDato.length;
      // Un registro SF: sin una sola entrada DA existe (el reporter emitio el
      // archivo vacio): Math.max de nada da -Infinity y el diagnostico salia
      // ilegible. null = el reporte no conoce ni una linea de este archivo.
      const ultimaConocida = datosArchivo.size ? Math.max(...datosArchivo.keys()) : null;
      const masAlla =
        ultimaConocida === null
          ? contenidoSinDato
          : contenidoSinDato.filter((l) => l > ultimaConocida);
      if (contenidoSinDato.length && m === 0 && masAlla.length) {
        // Prueba dura: el reporte no mide NADA del cambio en este archivo y
        // ademas ni siquiera llega hasta donde el cambio escribio.
        rancios.push({ archivo, ultimaConocida, lineas: masAlla });
      } else if (contenidoSinDato.length) {
        desalineados.push({ archivo, ultimaConocida, lineas: contenidoSinDato });
      }
    }
    if (!m) continue;
    medidas += m;
    cubiertas += c;
    detallePorArchivo.push({ archivo, medidas: m, cubiertas: c, sinCubrir: sinCubrirAqui });
    for (const l of sinCubrirAqui) descubiertas.push({ archivo, linea: l });
  }

  // 8) Un archivo del cambio con el mismo nombre que una ruta SF: que no
  //    resolvio es la firma exacta del cableado torcido. Rojo.
  if (sospechosos.length) {
    console.error(
      `::error::${sospechosos.length} archivo(s) del cambio quedaron sin datos de cobertura, y los reportes traen rutas SF: con ese mismo nombre que no corresponden a ningun archivo versionado: las rutas del reporte y las del repositorio no estan alineadas. Arreglo: configura el projectRoot del reporter lcov en la raiz del repositorio y vuelve a correr las pruebas`
    );
    for (const a of sospechosos.slice(0, 10)) {
      console.error(`::error::  sin medir por rutas desalineadas: ${a}`);
    }
    R("**Fallo** — las rutas de los reportes no estan alineadas con las del repositorio.");
    R("");
    for (const a of sospechosos.slice(0, 10)) {
      R(`- \`${a}\` cambio, pero su cobertura llego con otra raiz`);
    }
    R("");
    R("Arreglo: configura el `projectRoot` del reporter lcov en la raiz del repositorio.");
    publicar("n/a", medidas, descubiertas.length, lineasFueraDelDenominador);
    terminar(1);
  }

  // 8b) EL SPEC PROMETE ROJO, Y ACA SE CUMPLE. "Un cambio agrega lineas
  //     ejecutables y la medicion no encuentra datos que les correspondan ->
  //     la integracion FALLA" (capability calidad-codigo). Esto salia como
  //     ::warning:: con exit 0, y un ruleset solo mira el codigo de salida: el
  //     modulo nuevo que ninguna prueba importa cruzaba la compuerta entero.
  //     La valvula de escape no es bajar el aviso — es la exclusion declarada
  //     con motivo, que el mismo spec contempla y que se consulta arriba.
  if (rancios.length || sinDato.length) {
    if (rancios.length) {
      console.error(
        `::error::el reporte de cobertura parece anterior al cambio: ${rancios.length} archivo(s) estan reclamados por un SF: pero no tienen dato para ninguna de sus lineas nuevas, y esas lineas caen mas alla de la ultima que el reporte conoce. "Sin dato" no es "no ejecutable". Arreglo: volve a correr las pruebas CON cobertura sobre este commit; si el pipeline cachea el directorio coverage/, sacalo del cache`
      );
      for (const x of rancios.slice(0, 10)) {
        console.error(
          `::error file=${x.archivo},line=${x.lineas[0]}::${hastaDonde(x.ultimaConocida)} y el cambio agrega contenido en la(s) ${x.lineas.slice(0, 20).join(", ")}`
        );
      }
    }
    if (sinDato.length) {
      const cuantas = sinDato.reduce((a, x) => a + x.lineas, 0);
      console.error(
        `::error::${sinDato.length} archivo(s) fuente del cambio (${cuantas} linea(s) agregadas) no los reclama ningun reporte de cobertura: no hay con que medirlos, y "sin datos" no es "cubierto". Arreglo: corre las pruebas con cobertura sobre esos archivos —revisa 'all: true' en la configuracion de cobertura del paquete para que el reporte incluya los que ninguna prueba importa— o declara la exclusion con su motivo en projects.cobertura.excluidos del package.json de su paquete`
      );
      for (const x of sinDato.slice(0, MAX_ANOTACIONES)) {
        console.error(
          `::error file=${x.archivo},line=${x.primera}::archivo fuente del cambio sin ningun dato de cobertura (${x.lineas} linea(s) agregadas)`
        );
      }
    }
    R("**Fallo** — hay lineas fuente agregadas sin datos de cobertura que les correspondan.");
    R("");
    for (const x of rancios.slice(0, 20)) {
      R(
        `- \`${x.archivo}\`: ${hastaDonde(x.ultimaConocida)} y el cambio escribio en la(s) ${x.lineas.slice(0, 20).join(", ")} — el lcov es anterior al cambio`
      );
    }
    for (const x of sinDato.slice(0, 20)) {
      R(`- \`${x.archivo}\`: ${x.lineas} linea(s) agregadas y ningun reporte lo reclama`);
    }
    R("");
    R("Arreglo: corre las pruebas **con cobertura** sobre esos archivos, o declara");
    R("la exclusion con su motivo en `projects.cobertura.excluidos` del paquete.");
    publicar("n/a", medidas, descubiertas.length, lineasFueraDelDenominador);
    terminar(1);
  }

  // Ruidoso a proposito, no rojo: aca el reporte SI mide el archivo y solo
  // faltan lineas sueltas. Puede ser un reporte viejo, o codigo que el reporter
  // no considera ejecutable; un rojo con esa ambiguedad seria un falso positivo
  // que nadie puede apagar.
  if (desalineados.length) {
    console.error(
      `::warning::${desalineados.length} archivo(s) del cambio tienen lineas nuevas con contenido que el reporte no menciona (ni cubiertas ni sin cubrir): quedaron FUERA del denominador. Si no son declaraciones de tipos, el reporte puede ser anterior al cambio: ${desalineados
        .slice(0, 5)
        .map((x) => `${x.archivo} (${x.lineas.slice(0, 10).join(", ")})`)
        .join("; ")}`
    );
  }

  const declararExcluidos = () => {
    if (!excluidosDelCambio.length) return;
    console.log(
      `::notice::${excluidosDelCambio.length} archivo(s) del cambio quedaron fuera del calculo por una exclusion declarada con motivo`
    );
    R("");
    R("Archivos del cambio excluidos del calculo, con su motivo declarado:");
    for (const x of excluidosDelCambio.slice(0, 20)) {
      R(`- \`${x.archivo}\` — ${x.motivo} (\`${x.manifiesto}\`, patron \`${x.patron}\`)`);
    }
  };

  // 9) Ningun archivo medible en el cambio (solo markdown, YAML, JSON...).
  //    Pasa, y pasa CON FUNDAMENTO: el punto 6 ya probo que los reportes estan
  //    bien cableados, y el 8b que ningun archivo fuente quedo sin dato.
  if (medidas === 0) {
    console.log(
      `OK  el cambio no toca ningun archivo que la cobertura mida (${noReclamados.length} archivo(s) fuera de la medicion, ${lineasFueraDelDenominador} linea(s) fuente fuera del denominador): nada que medir`
    );
    R("**Pasa** — ningun archivo del cambio esta dentro de lo que mide la cobertura.");
    R("");
    R(
      `Los reportes reclaman ${cobertura.size} archivo(s) versionados, asi que estan bien cableados; simplemente ninguno de los ${agregadas.size} archivo(s) de este cambio es uno de ellos.`
    );
    if (noReclamados.length) {
      R("");
      R("Archivos del cambio fuera de la medicion:");
      for (const a of noReclamados.slice(0, 20)) R(`- \`${a}\``);
      if (noReclamados.length > 20) R(`- ...y ${noReclamados.length - 20} mas`);
    }
    declararExcluidos();
    publicar("n/a", 0, 0, lineasFueraDelDenominador);
    terminar(0);
  }

  declararExcluidos();

  const porcentaje = (cubiertas / medidas) * 100;
  const porcentajeTexto = porcentaje.toFixed(2);
  publicar(porcentajeTexto, medidas, descubiertas.length, lineasFueraDelDenominador);

  R("| | |");
  R("|---|---|");
  R(`| Lineas medidas del cambio | **${medidas}** |`);
  R(`| Cubiertas | **${cubiertas}** |`);
  R(`| Sin cubrir | **${descubiertas.length}** |`);
  R(`| Lineas fuente fuera del denominador | **${lineasFueraDelDenominador}** |`);
  R(`| Cobertura del cambio | **${porcentajeTexto}%** (minimo ${minimo}%) |`);
  R("");
  R("| Archivo | Medidas | Cubiertas | % |");
  R("|---|---:|---:|---:|");
  for (const d of detallePorArchivo) {
    R(
      `| \`${d.archivo}\` | ${d.medidas} | ${d.cubiertas} | ${((d.cubiertas / d.medidas) * 100).toFixed(1)}% |`
    );
  }
  R("");

  if (porcentaje + 1e-9 < minimo) {
    console.error(
      `::error::la cobertura de las lineas del cambio es ${porcentajeTexto}% y el minimo es ${minimo}%: ${descubiertas.length} de ${medidas} lineas nuevas no las ejercita ninguna prueba. Arreglo: agrega pruebas que ejecuten las lineas anotadas abajo, o declara la exclusion con su motivo en la configuracion de cobertura del paquete`
    );
    for (const { archivo, linea } of descubiertas.slice(0, MAX_ANOTACIONES)) {
      console.error(`::error file=${archivo},line=${linea}::linea agregada sin cobertura de pruebas`);
    }
    if (descubiertas.length > MAX_ANOTACIONES) {
      console.error(
        `::error::...y ${descubiertas.length - MAX_ANOTACIONES} linea(s) sin cubrir mas (el listado completo esta en el resumen de la corrida)`
      );
    }
    R(`**Fallo** — ${porcentajeTexto}% < ${minimo}%.`);
    R("");
    R("Lineas agregadas que ninguna prueba ejercita:");
    R("");
    for (const d of detallePorArchivo.filter((x) => x.sinCubrir.length)) {
      R(`- \`${d.archivo}\`: ${d.sinCubrir.join(", ")}`);
    }
    R("");
    R("Arreglo: agrega pruebas que ejecuten esas lineas. Si el codigo no le");
    R("corresponde probar a este paquete, declara la exclusion con su motivo");
    R("escrito en la configuracion de cobertura del paquete.");
    terminar(1);
  }

  console.log(
    `OK  cobertura de las lineas del cambio: ${porcentajeTexto}% (${cubiertas}/${medidas}), minimo ${minimo}% · ${lineasFueraDelDenominador} linea(s) fuente fuera del denominador`
  );
  R(`**Pasa** — ${porcentajeTexto}% >= ${minimo}%.`);
  if (descubiertas.length) {
    R("");
    R("Lineas agregadas sin cubrir (el cambio pasa el umbral igual, pero quedan anotadas):");
    for (const d of detallePorArchivo.filter((x) => x.sinCubrir.length)) {
      R(`- \`${d.archivo}\`: ${d.sinCubrir.join(", ")}`);
    }
  }
  terminar(0);
}

// El programa corre SOLO si el archivo se invoco directamente: asi las pruebas
// pueden importar los parsers sin disparar una medicion ni un process.exit.
//
// La comparacion pasa por realpath y, en Windows, ignora mayusculas: ahi la
// misma ruta llega con nombres cortos (JSANTA~1) o con otra caja segun quien
// invoque, y una comparacion literal daria "no soy el principal" — o sea, un
// exit 0 sin haber medido nada. Es el unico fail-open posible de este script y
// por eso lo cubre una prueba: si el guardia se rompe, TODA la suite se cae.
function mismaRuta(a, b) {
  const real = (p) => {
    try {
      return realpathSync(p);
    } catch {
      return resolve(p);
    }
  };
  const [x, y] = [real(a), real(b)];
  return process.platform === "win32" ? x.toLowerCase() === y.toLowerCase() : x === y;
}

if (process.argv[1] && mismaRuta(process.argv[1], fileURLToPath(import.meta.url))) {
  try {
    principal();
  } catch (e) {
    // Un error inesperado del comparador tambien es rojo: el paso no puede
    // terminar en verde por haberse caido antes de medir.
    console.error(
      `::error::el comparador de cobertura se cayo antes de terminar de medir: ${e.message}. Es un fallo del marco, no del repositorio: abri un issue en projects pegando este log`
    );
    R("**Fallo** — el comparador se cayo antes de terminar de medir.");
    R("");
    R(`\`\`\`\n${e.stack ?? e.message}\n\`\`\``);
    publicar("n/a", 0, 0);
    terminar(1);
  }
}
