#!/usr/bin/env node
// Cobertura de las LINEAS DEL CAMBIO: cruza los reportes lcov del repositorio
// con las lineas que el diff agrega o modifica, y falla si la proporcion
// cubierta queda por debajo del minimo del marco.
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
//   COBERTURA_BASE     commit base del rango. Vacio = el paso NO APLICA.
//   COBERTURA_CABEZA   commit final del rango (default: HEAD, que es lo que
//                      esta realmente en el checkout y lo que midieron las
//                      pruebas).
//   COBERTURA_MINIMO   porcentaje minimo exigido sobre las lineas del cambio
//                      (default: 80).
//   COBERTURA_MAX_ANOTACIONES  tope de anotaciones ::error file=...:: (20).
//
// Salidas (GITHUB_OUTPUT): porcentaje, lineas_medidas, lineas_sin_cubrir.
// Codigo de salida: 0 pasa o no aplica; 1 falla.
import { readFileSync, readdirSync, appendFileSync, realpathSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SHA_CERO = /^0{7,40}$/;

// ---------------------------------------------------------------- resumen ---

const resumen = [];
const R = (linea = "") => resumen.push(linea);

function volcarResumen() {
  const destino = process.env.GITHUB_STEP_SUMMARY;
  if (!destino || !resumen.length) return;
  try {
    appendFileSync(destino, resumen.join("\n") + "\n");
  } catch (e) {
    console.error(`::warning::no se pudo escribir el resumen de la corrida: ${e.message}`);
  }
}

function publicar(porcentaje, medidas, sinCubrir) {
  const pares = [
    `porcentaje=${porcentaje}`,
    `lineas_medidas=${medidas}`,
    `lineas_sin_cubrir=${sinCubrir}`,
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

/** Cierra el paso: vuelca el resumen SIEMPRE, tambien cuando falla. */
function terminar(codigo) {
  volcarResumen();
  process.exit(codigo);
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
const extensionDe = (r) => {
  const n = nombreDeArchivo(r);
  const i = n.lastIndexOf(".");
  return i <= 0 ? "" : n.slice(i);
};
const escaparRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Los archivos de prueba APORTAN cobertura, no la reciben: todo proyecto los
// excluye de la medicion, asi que no reclamarlos es lo normal y avisar por
// ellos convertiria el aviso en ruido de cada pull request. Es una convencion
// de nombres, no una lista de archivos que alguien tenga que mantener.
export const esArchivoDePrueba = (r) =>
  /(?:^|\/)__tests__\//.test(r) || /\.(?:test|spec)\.[cm]?[jt]sx?$/.test(r);

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

/**
 * Parsea un lcov quedandose con lo unico que este comparador necesita:
 * `SF:<ruta>` y `DA:<linea>,<hits>`. Devuelve Map<rutaCruda, Map<linea, hits>>.
 * Si la misma ruta aparece en varios reportes se queda con el MAXIMO de hits:
 * una linea cubierta por alguna suite esta cubierta.
 */
export function parsearLcov(texto, acumulado = new Map()) {
  let actual = null;
  for (const linea of texto.split(/\r?\n/)) {
    const l = linea.trim();
    if (l.startsWith("SF:")) {
      const ruta = l.slice(3).trim();
      actual = acumulado.get(ruta);
      if (!actual) acumulado.set(ruta, (actual = new Map()));
    } else if (l.startsWith("DA:") && actual) {
      const partes = l.slice(3).split(",");
      const numero = Number(partes[0]);
      const hits = Number(partes[1]);
      if (!Number.isFinite(numero) || !Number.isFinite(hits)) continue;
      actual.set(numero, Math.max(actual.get(numero) ?? 0, hits));
    } else if (l === "end_of_record") {
      actual = null;
    }
  }
  return acumulado;
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
    R("Este paso mide las lineas que un pull request agrega respecto de su base.");
    R("Fuera de ese contexto no hay rango que medir y no se reporta ningun");
    R("porcentaje: el total del paquete es otra compuerta, con su propio piso.");
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

  // 4) Los reportes de cobertura.
  const rutasLcov = buscarLcov(raiz, GLOB_LCOV);
  const datos = new Map();
  for (const ruta of rutasLcov) {
    try {
      parsearLcov(readFileSync(join(raiz, ruta), "utf8"), datos);
    } catch (e) {
      console.error(`::warning::no se pudo leer el reporte ${ruta}: ${e.message}`);
    }
  }

  // 5) Las rutas del lcov contra las del control de versiones. Este cruce ES
  //    el check: si ninguna resuelve, el reporte esta cableado contra otro
  //    arbol y "medir" daria cero lineas encontradas, o sea un falso verde.
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

  const cobertura = new Map(); // ruta versionada -> Map<linea, hits>
  const sinResolver = [];
  for (const [rutaSF, lineas] of datos) {
    const resuelta = resolverContraElRepo(rutaSF);
    if (!resuelta) {
      sinResolver.push(rutaSF);
      continue;
    }
    const previo = cobertura.get(resuelta);
    if (!previo) cobertura.set(resuelta, lineas);
    else for (const [l, h] of lineas) previo.set(l, Math.max(previo.get(l) ?? 0, h));
  }

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

  // 7) El cruce.
  let medidas = 0;
  let cubiertas = 0;
  const detallePorArchivo = [];
  const descubiertas = [];
  const noReclamados = [];
  const sospechosos = [];

  for (const [archivo, lineas] of [...agregadas].sort(([a], [b]) => a.localeCompare(b))) {
    const datosArchivo = cobertura.get(archivo);
    if (!datosArchivo) {
      // Un archivo del cambio que ningun SF: reclama. Puede ser legitimo
      // (markdown, YAML, JSON) o el sintoma de rutas desalineadas.
      if (nombresSinResolver.has(nombreDeArchivo(archivo))) sospechosos.push(archivo);
      else noReclamados.push(archivo);
      continue;
    }
    let m = 0;
    let c = 0;
    const sinCubrirAqui = [];
    for (const linea of [...lineas].sort((a, b) => a - b)) {
      const hits = datosArchivo.get(linea);
      if (hits === undefined) continue; // no ejecutable: blanco, comentario, tipo
      m++;
      if (hits > 0) c++;
      else sinCubrirAqui.push(linea);
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
    publicar("n/a", medidas, descubiertas.length);
    terminar(1);
  }

  // El aviso de fail-open se calcula ACA, antes de cualquier salida temprana.
  // Estuvo mas abajo y era inalcanzable justo en el caso que mas importa: un
  // cambio que toca SOLO archivos que ningun reporte reclama salia exit 0 y
  // MUDO. Que el aviso dependiera de que en el mismo pull request viniera
  // ademas un archivo medido es exactamente el fail-open silencioso que la
  // regla del marco prohibe.
  const extensionesMedidas = new Set([...cobertura.keys()].map(extensionDe));
  const rarosPorExtension = noReclamados.filter(
    (a) => extensionesMedidas.has(extensionDe(a)) && !esArchivoDePrueba(a)
  );
  const avisarRaros = () => {
    if (!rarosPorExtension.length) return;
    // Ruidoso a proposito, no rojo: la exclusion legitima (archivos de prueba,
    // configuracion, generados) tiene exactamente esta forma, y un rojo aca
    // seria un falso positivo en cada pull request que toca un test.
    console.error(
      `::warning::${rarosPorExtension.length} archivo(s) del cambio comparten extension con lo que la cobertura mide y sin embargo ningun reporte los reclama. Si no son exclusiones deliberadas, revisa 'all: true' en la configuracion de cobertura del paquete: ${rarosPorExtension.slice(0, 5).join(", ")}`
    );
  };

  // 9) Ningun archivo medible en el cambio (solo markdown, YAML, JSON...).
  //    Pasa, y pasa CON FUNDAMENTO: el punto 6 ya probo que los reportes estan
  //    bien cableados. Sin esa prueba previa esto seria un falso verde.
  if (medidas === 0) {
    console.log(
      `OK  el cambio no toca ningun archivo que la cobertura mida (${noReclamados.length} archivo(s) fuera de la medicion): nada que medir`
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
    avisarRaros();
    publicar("n/a", 0, 0);
    terminar(0);
  }

  avisarRaros();

  const porcentaje = (cubiertas / medidas) * 100;
  const porcentajeTexto = porcentaje.toFixed(2);
  publicar(porcentajeTexto, medidas, descubiertas.length);

  R("| | |");
  R("|---|---|");
  R(`| Lineas medidas del cambio | **${medidas}** |`);
  R(`| Cubiertas | **${cubiertas}** |`);
  R(`| Sin cubrir | **${descubiertas.length}** |`);
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
    `OK  cobertura de las lineas del cambio: ${porcentajeTexto}% (${cubiertas}/${medidas}), minimo ${minimo}%`
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
