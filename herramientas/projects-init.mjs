#!/usr/bin/env node
// ---------------------------------------------------------------------------
// projects init — instancia el andamio en un repo nuevo.
//
// POR QUE EXISTE. Adoptar Projects eran ~30 actos manuales: copiar 75 archivos con
// robocopy o cp (y acordarse del `/.` final, o los dotfiles no viajan), sustituir
// 157 ocurrencias de 21 marcadores en 37 archivos, inicializar OpenSpec y
// renderizar la constitucion. Nada de eso es una decision: es transcripcion. Y la
// transcripcion a mano falla de la peor manera —un marcador mal sustituido es
// sintacticamente valido, asi que el check de marcadores lo deja pasar: "se
// verifica la AUSENCIA de marcadores, no la correccion de los valores que los
// reemplazaron" (marco-ci.yml)—.
//
// ESOS CUATRO NUMEROS SE MIDEN, no se recuerdan: crecen con cada archivo que
// entra a plantilla/ y la version anterior de este parrafo decia 23/122/22/15,
// que fue cierto alguna vez. Desde la raiz del clon del marco:
//
//   node --input-type=module -e '
//   import { archivosDelAndamio, MARCADOR } from "./herramientas/projects-init.mjs";
//   import fs from "node:fs";
//   const rels = archivosDelAndamio("plantilla"), marcadores = new Set();
//   let ocurrencias = 0, conMarcador = 0;
//   for (const rel of rels) {
//     const hits = [...fs.readFileSync(`plantilla/${rel}`, "utf8").matchAll(MARCADOR)];
//     if (hits.length) conMarcador++;
//     ocurrencias += hits.length;
//     for (const h of hits) marcadores.add(h[1]);
//   }
//   console.log(`${rels.length} archivos, ${ocurrencias} ocurrencias de ${marcadores.size} marcadores en ${conMarcador} archivos`);
//   '
//
// Usa las MISMAS piezas que la herramienta (archivosDelAndamio y MARCADOR), asi
// que mide lo que la corrida hace, no una aproximacion con grep.
//
// QUE NO HACE, y esta declarado a proposito:
//  · No decide nada. Todos los valores vienen de un archivo que un humano llena.
//  · No borra bloques. Tres marcadores tienen un camino "si no existe" que exige
//    borrar bloques de eslint.config.mjs o entradas de ci.yml (ver la tabla de
//    plantilla/README.md). Automatizar un borrado condicional sobre archivos que
//    despues nadie relee es mas riesgoso que pedir los tres valores: si un
//    proyecto no tiene front o E2E, esta version EXIGE el valor igual y el borrado
//    queda como paso humano, nombrado en la salida.
//  · No toca GitHub. La proteccion de main, los accesos de Dependabot y los
//    secrets siguen siendo actos humanos deliberados.
//
// FALLA CERRADO en todo: un valor que falta, un marcador que sobrevive, un destino
// que ya tiene andamio o una sustitucion que no cambio nada son ERROR, no aviso.
// La ultima importa mas de lo que parece: si el patron dejara de matchear, "cero
// sustituciones" saldria en verde y el repo nuevo nace lleno de marcadores.
// Tambien son ERROR, y por el mismo motivo: un Node por debajo del piso (abajo
// esta medido lo que pasa sin ese control), una copia que escribio menos archivos
// de los que el andamio tiene, un PAQUETE_* que no es una de las carpetas que el
// andamio reparte, un pin de OpenSpec que no es una version exacta, y una bandera
// que lleva valor y llega SIN el (`--version-openspec` al final del argv daba
// undefined, y undefined se colaba entero por las dos revisiones del pin).
//
// USO:
//   node herramientas/projects-init.mjs --valores <ruta.json> --destino <ruta>
//                                    [--sin-herramientas] [--forzar]
//                                    [--version-openspec <x.y.z>]
//   node herramientas/projects-init.mjs --ejemplo > valores.json
//
// `--version-openspec` es el escape hatch para cuando el pin no se puede leer
// del default de `version_openspec` en marco-ci.yml. Espera una version EXACTA
// (0.9.4), no un rango: el valor se concatena en la linea de comandos de npx.
// ---------------------------------------------------------------------------

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

// ─────────────────────────── El piso de Node ───────────────────────────

/** ESTA es la unica pieza del marco que corre en la maquina de una persona y no
 *  en un runner. El runner esta pinado en Node 22; la laptop de quien adopta el
 *  marco no la pina nadie, y en Windows lo habitual es un Node instalado hace
 *  tiempo con el MSI. Por eso el piso se verifica en vez de suponerse.
 *
 *  POR QUE 18.17.0 ES EL PISO DURO. Las dos funciones que recorren arboles usan
 *  `readdirSync(..., { recursive: true })`, y esa opcion llego en 18.17. En un
 *  Node anterior NO era un error: era una clave desconocida del objeto de
 *  opciones y se ignoraba EN SILENCIO. Lo medido en esa version: 16 de los 75
 *  archivos escritos, los cinco controles de main() en verde —porque todos miran
 *  "cantidad > 0" y el control final relee el arbol con la MISMA API rota—, exit
 *  0 y "cero marcadores sobrevivientes" en pantalla, con el repo nuevo sin
 *  ci.yml, sin CODEOWNERS y sin .claude/settings.json. O sea: el modo de falla
 *  exacto que el encabezado de este archivo declara imposible.
 *
 *  POR QUE NO SE SUBE A 20.12. Ahi es donde existe `dirent.parentPath` nativo y
 *  donde arranca la linea de soporte viva (18 esta EOL desde abril de 2025),
 *  pero las dos llamadas conservan el `?? e.path` de la API vieja, asi que en
 *  18.17 la herramienta funciona de verdad. Bloquear ahi seria estrenarle un
 *  rojo a alguien a quien hoy le anda, y la regla del marco es que un rojo nuevo
 *  entra avisando: 20.12 es `::warning::`, no error. Cuando 18.17 deje de
 *  aparecer en las maquinas, el aviso se asciende a piso y se borra el `?? e.path`
 *  de archivosDelAndamio y marcadoresQueSobreviven en el mismo cambio. */
export const NODE_MINIMO = "18.17.0";
export const NODE_RECOMENDADO = "20.12.0";

/** Compara dos versiones x.y.z: -1, 0 o 1. Lo que venga despues del parche se
 *  ignora (`22.0.0-nightly` cuenta como 22.0.0), porque lo unico que se decide
 *  con esto es si una API existe. */
export function compararVersiones(a, b) {
  const partes = (s) => {
    const t = String(s).split(".");
    return [0, 1, 2].map((i) => Number.parseInt(t[i], 10) || 0);
  };
  const x = partes(a);
  const y = partes(b);
  for (let i = 0; i < 3; i++) {
    if (x[i] !== y[i]) return x[i] < y[i] ? -1 : 1;
  }
  return 0;
}

/** El chequeo del piso, separado de main() para que el banco pueda ejercerlo con
 *  una version simulada: correr la CLI no lo prueba, porque el banco corre en el
 *  Node que ya pasa. */
export function revisarNodo(version = process.versions.node) {
  if (compararVersiones(version, NODE_MINIMO) < 0) {
    return {
      ok: false,
      aviso: null,
      error:
        `::error::esta herramienta necesita Node ${NODE_MINIMO} o mas nuevo, y este Node es ${version}. ` +
        `No se escribio nada. En un Node anterior el recorrido del andamio se ignora en silencio: la corrida ` +
        `escribe una fraccion de los archivos (medido: 16 de 75, sin ci.yml ni CODEOWNERS), los controles pasan ` +
        `igual y la herramienta declara exito. Actualiza Node y volve a correr (nvm install 20, ` +
        `winget install OpenJS.NodeJS.LTS, brew install node).`,
    };
  }
  if (compararVersiones(version, NODE_RECOMENDADO) < 0) {
    return {
      ok: true,
      error: null,
      aviso:
        `::warning::Node ${version} alcanza el piso duro (${NODE_MINIMO}) y la corrida sigue, pero el piso ` +
        `recomendado es ${NODE_RECOMENDADO}: es donde \`dirent.parentPath\` existe nativo y donde arranca la ` +
        `linea de soporte viva. Node 18 esta EOL desde abril de 2025 y no recibe parches de seguridad.`,
    };
  }
  return { ok: true, error: null, aviso: null };
}

/** Marcador del andamio: mayusculas obligatorias, para no confundirlo con las
 *  expresiones `${{ ... }}` de GitHub Actions. Es el MISMO patron que el check
 *  de higiene del marco, y por eso no se relaja: si aca fuera mas laxo, el repo
 *  nuevo pasaria este paso y reprobaria el CI. */
export const MARCADOR = /\{\{([A-Z0-9_]+)\}\}/g;

/** El archivo del andamio que NO se copia: es la guia del bootstrap, no el README
 *  del proyecto. Y es el unico que menciona `{{DOBLE_LLAVE}}`, que no es un
 *  marcador sino la convencion citandose a si misma. */
export const NO_SE_COPIA = new Set(["README.md"]);

/** La pregunta "se copia?" NO se hace comparando cadenas exactas, y es un caso
 *  de plataforma, no de gusto: en macOS (APFS por defecto) y en Windows el
 *  sistema de archivos no distingue mayusculas, asi que un clon donde la guia se
 *  llame `Readme.md` —o un editor que la renombre— deja de coincidir con la
 *  lista y la guia del bootstrap viaja al repo nuevo. No falla en silencio, pero
 *  falla lejos: la guia es el UNICO archivo que menciona `{{DOBLE_LLAVE}}`, que
 *  no es un marcador sino la convencion citandose, asi que la corrida aborta con
 *  "el andamio usa marcadores que el archivo de valores no declara:
 *  DOBLE_LLAVE", que manda a agregar a REQUERIDOS algo que no existe. Se deriva
 *  de NO_SE_COPIA para que la lista siga siendo una sola declaracion. */
export function seExcluyeDelCopiado(rel) {
  const bajo = rel.toLowerCase();
  for (const n of NO_SE_COPIA) if (n.toLowerCase() === bajo) return true;
  return false;
}

/** Los 21 valores que un humano tiene que decidir —hoy, uno por cada marcador
 *  que plantilla/ usa—, con su fuente de verdad en
 *  plantilla/README.md seccion 2. `PAQUETES` no esta: se DERIVA de los tres
 *  paquetes, porque una lista que se escribe aparte de sus elementos es una
 *  segunda declaracion que puede divergir. */
export const REQUERIDOS = [
  "PROYECTO", "ORG",
  "PAQUETE_API", "PAQUETE_WEB", "PAQUETE_E2E",
  "GENERAR_CLIENTE_DATOS",
  "EQUIPO_BUILDERS", "EQUIPO_PO", "BUILDER_1", "BUILDER_2", "PO",
  "CUENTA_DEV", "CUENTA_PROD", "REGION", "PERFIL_DEV", "PERFIL_PROD",
  "PREFIJO_RECURSOS",
  "DOMINIO_DEV", "DOMINIO_PROD", "CANAL_ALERTAS", "ID_MCP_SLACK",
];

/** Los que el andamio necesita y NO se piden porque se derivan. */
export function derivar(v) {
  return {
    ...v,
    PAQUETES: v.PAQUETES ?? [v.PAQUETE_WEB, v.PAQUETE_API, v.PAQUETE_E2E].filter(Boolean).join(", "),
  };
}

/** Los tres marcadores cuyo camino "si no existe" exige borrar bloques a mano. */
export const CON_LIMPIEZA_MANUAL = {
  PAQUETE_WEB: "si el proyecto no tiene frontend: borrar los bloques [FRONT] de eslint.config.mjs y sus imports",
  PAQUETE_E2E: "si el proyecto no tiene suite E2E: borrar esa entrada del glob de Node Y las dos entradas EXCEPCIONES de ci.yml (una excepcion que no corresponde a ningun paquete es roja, a proposito)",
  GENERAR_CLIENTE_DATOS: "si el proyecto no genera cliente de datos: borrar el paso \"Generar el cliente de la capa de datos\" de .github/workflows/ci.yml",
};

export function validarValores(crudos) {
  const problemas = [];
  if (crudos === null || typeof crudos !== "object" || Array.isArray(crudos)) {
    return { problemas: ["el archivo de valores no es un objeto JSON"], valores: null };
  }
  for (const k of REQUERIDOS) {
    const v = crudos[k];
    if (v === undefined || v === null || v === "") {
      problemas.push(`falta ${k}`);
      continue;
    }
    if (typeof v !== "string") {
      problemas.push(`${k} tiene que ser texto y es ${typeof v}`);
      continue;
    }
    // Un valor que todavia trae llaves es el ejemplo sin llenar. Pasa: el
    // archivo del andamio nace con cada clave apuntando a su propio marcador.
    if (/\{\{|\}\}/.test(v)) problemas.push(`${k} sigue siendo un marcador sin llenar: ${v}`);
  }
  if (typeof crudos.CUENTA_DEV === "string" && !/^\d{12}$/.test(crudos.CUENTA_DEV)) {
    problemas.push("CUENTA_DEV no son 12 digitos (es un id de cuenta AWS)");
  }
  if (typeof crudos.CUENTA_PROD === "string" && !/^\d{12}$/.test(crudos.CUENTA_PROD)) {
    problemas.push("CUENTA_PROD no son 12 digitos (es un id de cuenta AWS)");
  }
  // La regla del area: sin em dashes en nada que viaje a AWS.
  for (const k of ["PREFIJO_RECURSOS", "PROYECTO"]) {
    if (typeof crudos[k] === "string" && /—|–/.test(crudos[k])) {
      problemas.push(`${k} tiene un em dash o en dash: los nombres que viajan a AWS usan guiones normales`);
    }
  }
  if (problemas.length) return { problemas, valores: null };
  return { problemas: [], valores: derivar(crudos) };
}

/** Los archivos del andamio, relativos a plantilla/, sin el que no se copia. */
export function archivosDelAndamio(raizAndamio) {
  const salida = [];
  for (const e of fs.readdirSync(raizAndamio, { withFileTypes: true, recursive: true })) {
    if (!e.isFile()) continue;
    const abs = path.join(e.parentPath ?? e.path, e.name);
    const rel = path.relative(raizAndamio, abs).split(path.sep).join("/");
    if (seExcluyeDelCopiado(rel)) continue;
    salida.push(rel);
  }
  return salida.sort();
}

/** Recorrido explicito con pila. No usa `recursive: true` ni `parentPath`: solo
 *  `readdirSync(dir, { withFileTypes: true })`, que existe desde Node 10. Las
 *  rutas salen siempre con "/" —nunca con la barra invertida de Windows— porque
 *  un `rel` es una clave, no una ruta del disco: se compara con las de
 *  archivosDelAndamio y se imprime en los mensajes.
 *  `omitir` poda por SEGMENTO, no por prefijo: `api/node_modules/...` no empieza
 *  con "node_modules/" y por eso un filtro por prefijo lo dejaba pasar. */
function recorrer(raiz, omitir = new Set()) {
  const salida = [];
  const pendientes = [""];
  while (pendientes.length) {
    const dirRel = pendientes.pop();
    const abs = dirRel ? path.join(raiz, ...dirRel.split("/")) : raiz;
    for (const e of fs.readdirSync(abs, { withFileTypes: true })) {
      if (omitir.has(e.name)) continue;
      const rel = dirRel ? `${dirRel}/${e.name}` : e.name;
      if (e.isDirectory()) pendientes.push(rel);
      else if (e.isFile()) salida.push(rel);
    }
  }
  return salida.sort();
}

/** El MISMO listado que archivosDelAndamio, medido con otra API. No es
 *  duplicacion por gusto: es la segunda medicion que hace que una copia parcial
 *  sea ROJA aunque el piso de Node no la haya atajado (main() compara los dos
 *  numeros). La gracia esta en que no comparten la llamada que se rompe: si
 *  manana las dos se escriben igual, esta defensa deja de existir. */
export function archivosDelAndamioAMano(raizAndamio) {
  return recorrer(raizAndamio).filter((rel) => !seExcluyeDelCopiado(rel));
}

/** Que archivos del andamio NO llegaron al destino. Se le pasan las dos
 *  mediciones; devuelve la diferencia, que main() convierte en error. */
export function faltantesDeCopia(escritos, esperados) {
  const hechos = new Set(escritos);
  return esperados.filter((rel) => !hechos.has(rel));
}

/** Que CARPETA reparte el andamio para cada marcador de paquete, derivado del
 *  andamio y no escrito aparte: se busca el `"name"` de cada package.json de
 *  primer nivel y, si es un marcador, ese marcador queda atado a su directorio.
 *  Hoy devuelve { PAQUETE_API: "api", PAQUETE_WEB: "web", PAQUETE_E2E: "e2e" }.
 *  Una lista escrita a mano seria una segunda declaracion que puede divergir del
 *  andamio, que es el defecto que este marco ya cazo dos veces. */
export function paquetesDelAndamio(raizAndamio) {
  const mapa = {};
  for (const rel of archivosDelAndamio(raizAndamio)) {
    const m = /^([^/]+)\/package\.json$/.exec(rel);
    if (!m) continue;
    const texto = fs.readFileSync(path.join(raizAndamio, ...rel.split("/")), "utf8");
    let manifiesto;
    try {
      manifiesto = JSON.parse(texto);
    } catch (e) {
      throw new Error(`el andamio trae ${rel} y no es JSON valido: ${e.message}`);
    }
    const marcador = /^\{\{([A-Z0-9_]+)\}\}$/.exec(manifiesto.name ?? "");
    if (marcador) mapa[marcador[1]] = m[1];
  }
  return mapa;
}

/** Los PAQUETE_* no son texto libre, aunque hasta hoy la herramienta los aceptara
 *  como si lo fueran. El andamio reparte las carpetas con nombre FIJO —api/,
 *  web/, e2e/— y esos mismos marcadores viajan a rutas: los globs de
 *  eslint.config.mjs, el `directory: "/{{PAQUETE_API}}"` de dependabot y las dos
 *  EXCEPCIONES de ci.yml. Con un valor distinto la herramienta sale 0 y el rojo
 *  aparece media hora despues, en el primer CI, por "una excepcion que no
 *  corresponde a ningun paquete" —el rojo que pnpm-workspace.yaml declara a
 *  proposito— y sin la palabra PAQUETE_API en ningun lado de ese mensaje.
 *
 *  Este SI es un rojo nuevo y aun asi entra bloqueante, no en modo aviso: no hay
 *  consumidor instalado al que estrenarselo —cada corrida es un repo que todavia
 *  no existe— y la alternativa a este rojo no es un verde, es el mismo rojo mas
 *  tarde y peor ubicado. */
export function problemasDePaquetes(valores, raizAndamio) {
  const problemas = [];
  for (const [marcador, carpeta] of Object.entries(paquetesDelAndamio(raizAndamio))) {
    const v = valores[marcador];
    if (typeof v !== "string" || v === carpeta) continue;
    problemas.push(
      `${marcador} = "${v}", pero el andamio reparte esa carpeta como "${carpeta}/". Los globs de ` +
        `eslint.config.mjs, la entrada de dependabot y las EXCEPCIONES de ci.yml apuntan a esa RUTA: con otro ` +
        `nombre el repo nuevo nace con el CI en rojo. Pone "${carpeta}", o renombra la carpeta del andamio en ` +
        `el mismo cambio.`,
    );
  }
  return problemas;
}

export function sustituir(texto, valores) {
  const faltantes = new Set();
  let cuenta = 0;
  const salida = texto.replace(MARCADOR, (todo, nombre) => {
    const v = valores[nombre];
    if (v === undefined) {
      faltantes.add(nombre);
      return todo;
    }
    cuenta++;
    return v;
  });
  return { salida, cuenta, faltantes: [...faltantes] };
}

export function instanciar({ raizAndamio, destino, valores }) {
  const rels = archivosDelAndamio(raizAndamio);
  if (rels.length === 0) throw new Error(`el andamio esta vacio: ${raizAndamio}`);

  let total = 0;
  const faltantes = new Set();
  const escritos = [];
  for (const rel of rels) {
    const origen = path.join(raizAndamio, rel);
    const texto = fs.readFileSync(origen, "utf8");
    const r = sustituir(texto, valores);
    total += r.cuenta;
    for (const f of r.faltantes) faltantes.add(f);
    const salida = path.join(destino, rel);
    fs.mkdirSync(path.dirname(salida), { recursive: true });
    fs.writeFileSync(salida, r.salida, "utf8");
    escritos.push(rel);
  }
  return { escritos, total, faltantes: [...faltantes].sort() };
}

/** Ningun `{{MARCADOR}}` puede sobrevivir. Es el mismo check que el CI del marco
 *  corre sobre el repo nuevo: si aca pasara y alla fallara, la herramienta seria
 *  peor que el camino manual.
 *
 *  `rels` acota el escaneo a lo que ESTA corrida acaba de escribir, y main() lo
 *  pasa siempre. El destino no es necesariamente un directorio vacio: la skill de
 *  adopcion apunta esta herramienta a un repo que ya existe, y `--forzar` la
 *  vuelve a correr sobre uno que ya tiene dependencias instaladas. Escaneando
 *  TODO el destino, un `{{ALGO}}` que escribio otro —en un archivo que esta
 *  herramienta no toco— aborta la corrida por un motivo ajeno, y decodificar
 *  decenas de miles de archivos de node_modules como utf8 va de lento a
 *  ERR_STRING_TOO_LONG. Sigue siendo un escaneo INDEPENDIENTE: relee los bytes
 *  del disco, no le cree a lo que sustituir() dijo de si misma.
 *  Sin `rels` recorre el destino entero, podando .git y node_modules por
 *  SEGMENTO: `api/node_modules/...` no empieza con "node_modules/". */
export function marcadoresQueSobreviven(destino, rels) {
  const encontrados = [];
  const objetivo = rels ?? recorrer(destino, new Set([".git", "node_modules"]));
  for (const rel of objetivo) {
    const abs = path.join(destino, ...rel.split("/"));
    const lineas = fs.readFileSync(abs, "utf8").split("\n");
    for (let i = 0; i < lineas.length; i++) {
      for (const m of lineas[i].matchAll(MARCADOR)) {
        encontrados.push({ archivo: rel, linea: i + 1, marcador: m[0] });
      }
    }
  }
  return encontrados;
}

// ─────────────────────────── El programa ───────────────────────────

const EJEMPLO = {
  PROYECTO: "people-agenda",
  ORG: "po",
  PAQUETE_API: "api",
  PAQUETE_WEB: "web",
  PAQUETE_E2E: "e2e",
  GENERAR_CLIENTE_DATOS: "prisma generate",
  EQUIPO_BUILDERS: "builders",
  EQUIPO_PO: "po",
  BUILDER_1: "handle-del-builder-1",
  BUILDER_2: "handle-del-builder-2",
  PO: "handle-del-po",
  CUENTA_DEV: "111111111111",
  CUENTA_PROD: "222222222222",
  REGION: "us-east-1",
  PERFIL_DEV: "la organización-dev",
  PERFIL_PROD: "la organización-prod",
  PREFIJO_RECURSOS: "agenda",
  DOMINIO_DEV: "agenda-dev.ejemplo.com",
  DOMINIO_PROD: "agenda.ejemplo.com",
  CANAL_ALERTAS: "#alertas-prod",
  ID_MCP_SLACK: "00000000-0000-0000-0000-000000000000",
};

/** Las tres banderas que llevan valor lo toman con `argv[++i]`, y esa forma
 *  devuelve `undefined` cuando la bandera es el ULTIMO elemento del argv —que es
 *  exactamente como queda una linea a la que se le corto el final al copiarla, o
 *  un `--version-openspec "$PIN"` con la variable vacia en un shell que la borra.
 *  Undefined no es "el valor que la persona quiso": es la bandera sin valor, y
 *  tiene que ser un ERROR PROPIO, distinto de la bandera AUSENTE. La diferencia
 *  importa sobre todo en `--version-openspec`, donde ausente significa "usa el
 *  default del YAML" y presente-sin-valor significaba, hasta este arreglo,
 *  descartar en silencio el pin que alguien quiso fijar y salir 0. */
function valorDeBandera(argv, i, bandera) {
  const v = argv[i];
  if (v === undefined) throw new Error(`${bandera} necesita un valor`);
  return v;
}

function argumentos(argv) {
  const o = { herramientas: true, forzar: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--valores") o.valores = valorDeBandera(argv, ++i, "--valores");
    else if (argv[i] === "--destino") o.destino = valorDeBandera(argv, ++i, "--destino");
    else if (argv[i] === "--sin-herramientas") o.herramientas = false;
    else if (argv[i] === "--forzar") o.forzar = true;
    else if (argv[i] === "--ejemplo") o.ejemplo = true;
    else if (argv[i] === "--version-openspec") o.versionOpenspec = valorDeBandera(argv, ++i, "--version-openspec");
    else throw new Error(`argumento desconocido: ${argv[i]}`);
  }
  return o;
}

/** El pin del CLI de OpenSpec sale del `default` del input del reusable: UNA sola
 *  declaracion. Repetirlo aca seria una segunda que puede divergir. */
export function pinOpenspecDe(marcoCi) {
  const m = marcoCi.match(/version_openspec:[\s\S]*?default:\s*"?([0-9]+\.[0-9]+\.[0-9]+)"?/);
  return m ? m[1] : null;
}

/** La forma que el pin de OpenSpec puede tener: una version EXACTA, la misma que
 *  acota el regex de pinOpenspecDe. La rama que lee el YAML ya estaba acotada; la
 *  que escribe una persona (`--version-openspec`) no lo estaba, y es la unica
 *  entrada de esta herramienta que termina dentro de un proceso hijo:
 *
 *    execFileSync("npx", ["--yes", `@fission-ai/openspec@${pin}`, ...],
 *                 { shell: process.platform === "win32" })
 *
 *  En Windows eso va por cmd.exe y Node concatena los argumentos SIN ESCAPAR —lo
 *  dice el propio runtime con DEP0190—, asi que un `&` o un espacio en el pin no
 *  es un typo: es un comando mas, corriendo con las credenciales de la persona y
 *  no en un runner efimero. Medido con la misma forma de llamada, un pin
 *  "1.0.0 & echo X" ejecuta el `echo`. Y sin adversario tampoco es inocuo: un pin
 *  raro rompe la invocacion de una forma que el catch reporta como "openspec init
 *  fallo", mandando a diagnosticar el lugar equivocado.
 *
 *  Sacar el `shell: true` NO es la salida: en Windows el ejecutable es `npx.cmd`,
 *  y desde la correccion de CVE-2024-27980 (18.20.2 / 20.12.2) spawnear un .cmd
 *  sin shell falla con EINVAL. La defensa es acotar el argumento. */
export function pinValido(pin) {
  return typeof pin === "string" && /^\d+\.\d+\.\d+$/.test(pin);
}

function main(argv) {
  // ── El piso de Node, antes de tocar NADA ──
  // El aviso sale por stderr a proposito: `--ejemplo` escribe el JSON en stdout y
  // normalmente se redirige a un archivo. Una linea de aviso ahi lo corrompe.
  const nodo = revisarNodo();
  if (!nodo.ok) {
    console.error(nodo.error);
    return 1;
  }
  if (nodo.aviso) console.error(nodo.aviso);

  // argumentos() tira cuando una bandera llega sin valor o no se reconoce. Se
  // atrapa aca para que salga como ::error:: y codigo 2 —el mismo que el uso—,
  // y no como un stack trace: un uso mal escrito no es un bug del programa.
  let o;
  try {
    o = argumentos(argv);
  } catch (e) {
    console.error(`::error::${e.message}`);
    return 2;
  }
  if (o.ejemplo) {
    process.stdout.write(JSON.stringify(EJEMPLO, null, 2) + "\n");
    return 0;
  }
  if (!o.valores || !o.destino) {
    console.error("uso: node herramientas/projects-init.mjs --valores <ruta.json> --destino <ruta>");
    console.error("     node herramientas/projects-init.mjs --ejemplo > valores.json");
    console.error("     opcionales: --sin-herramientas | --forzar | --version-openspec <x.y.z>");
    return 2;
  }

  // El pin de la bandera se revisa DOS veces con la misma regla: aca, antes de
  // leer un solo archivo, para que un valor mal formado no cueste 75 archivos
  // escritos y un destino a medias; y otra vez donde se resuelve, que es lo que
  // cubre tambien la rama que lo lee del YAML.
  // La condicion pregunta si la CLAVE existe, no si su valor no es `undefined`.
  // Escrita como `o.versionOpenspec !== undefined` este guard fallaba ABIERTO
  // justo en el caso peor —bandera presente, valor undefined— porque ese valor
  // se saltaba las dos revisiones y despues el `??` lo reemplazaba por el default
  // del YAML. argumentos() ya no deja pasar ese caso; esto lo cierra tambien si
  // manana alguien vuelve a poblar `o` de otra forma.
  if (Object.hasOwn(o, "versionOpenspec") && !pinValido(o.versionOpenspec)) {
    console.error(
      `::error::--version-openspec = ${JSON.stringify(o.versionOpenspec)} no es una version exacta x.y.z ` +
        `(se espera algo como 0.9.4, sin rangos ni "latest"). No se escribio nada. Ese valor se concatena en la ` +
        `linea de comandos del ejecutor de paquetes: en Windows esa invocacion va por cmd.exe sin escapar los ` +
        `argumentos.`,
    );
    return 1;
  }

  const raizMarco = path.resolve(import.meta.dirname, "..");
  const raizAndamio = path.join(raizMarco, "plantilla");
  if (!fs.existsSync(raizAndamio)) {
    console.error(`::error::no encontre el andamio en ${raizAndamio}. Corre esto desde un clon del repo del marco`);
    return 1;
  }

  // ── Valores ──
  let crudos;
  try {
    crudos = JSON.parse(fs.readFileSync(o.valores, "utf8"));
  } catch (e) {
    console.error(`::error::no pude leer ${o.valores}: ${e.message}`);
    return 1;
  }
  const { problemas, valores } = validarValores(crudos);
  if (problemas.length) {
    console.error(`::error::el archivo de valores tiene ${problemas.length} problema(s). No se escribio nada:`);
    for (const p of problemas) console.error(`  - ${p}`);
    console.error("");
    console.error("Que poner en cada uno esta en plantilla/README.md seccion 2, con ejemplo y caso borde.");
    console.error("Un esqueleto con todas las claves: node herramientas/projects-init.mjs --ejemplo");
    return 1;
  }

  // ── Los tres paquetes tienen que llamarse como las carpetas que el andamio trae ──
  const paquetesMal = problemasDePaquetes(valores, raizAndamio);
  if (paquetesMal.length) {
    console.error(`::error::${paquetesMal.length} valor(es) de paquete no corresponden al andamio. No se escribio nada:`);
    for (const p of paquetesMal) console.error(`  - ${p}`);
    return 1;
  }

  // ── Destino ──
  if (!fs.existsSync(o.destino)) {
    console.error(`::error::el destino no existe: ${o.destino}. Crea el repo primero y corre esto en su raiz`);
    return 1;
  }
  const yaTiene = archivosDelAndamio(raizAndamio).filter((r) => fs.existsSync(path.join(o.destino, r)));
  if (yaTiene.length && !o.forzar) {
    console.error(`::error::el destino ya tiene ${yaTiene.length} archivo(s) del andamio. Se aborta para no sobreescribir trabajo:`);
    for (const r of yaTiene.slice(0, 8)) console.error(`  - ${r}`);
    if (yaTiene.length > 8) console.error(`  ... y ${yaTiene.length - 8} mas`);
    console.error("Si de verdad queres sobreescribirlos: --forzar");
    return 1;
  }

  // ── Instanciar ──
  const r = instanciar({ raizAndamio, destino: o.destino, valores });
  console.log(`escritos ${r.escritos.length} archivos, ${r.total} ocurrencias sustituidas`);

  // La copia esta COMPLETA, medida con la otra API. Es la defensa de fondo del
  // piso de Node: si el recorrido con `recursive: true` se ignorara —o si un dia
  // vuelve a fallar por otro motivo— aca los dos numeros no coinciden y la
  // corrida es roja, en vez de declarar exito sobre 16 de 75 archivos.
  const esperados = archivosDelAndamioAMano(raizAndamio);
  const faltanEnDestino = faltantesDeCopia(r.escritos, esperados);
  if (faltanEnDestino.length) {
    console.error(
      `::error::la copia quedo incompleta: se escribieron ${r.escritos.length} de los ${esperados.length} ` +
        `archivos del andamio. Faltan ${faltanEnDestino.length}:`,
    );
    for (const rel of faltanEnDestino.slice(0, 8)) console.error(`  - ${rel}`);
    if (faltanEnDestino.length > 8) console.error(`  ... y ${faltanEnDestino.length - 8} mas`);
    console.error(
      `El destino quedo a medias y NO se ejecuto nada de lo que sigue. Borralo y volve a correr sobre uno ` +
        `limpio. Si los dos conteos difieren en un Node viejo, ese es el motivo: el piso es ${NODE_MINIMO}.`,
    );
    return 1;
  }

  if (r.total === 0) {
    console.error("::error::cero sustituciones sobre un andamio que tiene marcadores: el patron dejo de matchear. NO se declara exito");
    return 1;
  }
  if (r.faltantes.length) {
    console.error(`::error::el andamio usa marcadores que el archivo de valores no declara: ${r.faltantes.join(", ")}`);
    console.error("Agregalos a REQUERIDOS de esta herramienta y a la tabla de plantilla/README.md, en el mismo cambio");
    return 1;
  }

  // ── El control que hace verificable el paso ──
  const sobreviven = marcadoresQueSobreviven(o.destino, r.escritos);
  if (sobreviven.length) {
    console.error(`::error::quedaron ${sobreviven.length} marcador(es) sin sustituir:`);
    for (const s of sobreviven.slice(0, 10)) console.error(`  - ${s.archivo}:${s.linea} ${s.marcador}`);
    return 1;
  }
  console.log("cero marcadores sobrevivientes");

  // ── Las dos herramientas que el andamio no puede traer ──
  if (o.herramientas) {
    const marcoCi = fs.readFileSync(path.join(raizMarco, ".github/workflows/marco-ci.yml"), "utf8");
    const pin = o.versionOpenspec ?? pinOpenspecDe(marcoCi);
    if (!pin) {
      console.error("::error::no pude leer el pin de OpenSpec del default de `version_openspec` en marco-ci.yml. Pasalo con --version-openspec <x.y.z>");
      return 1;
    }
    // La misma regla que arriba, sobre el valor YA resuelto: cubre las dos ramas
    // —la bandera y el default del YAML— en el punto por el que las dos pasan.
    if (!pinValido(pin)) {
      console.error(
        `::error::el pin de OpenSpec resuelto es ${JSON.stringify(pin)} y no es una version exacta x.y.z. ` +
          `No se corre el ejecutor de paquetes con eso: el valor se concatena en la linea de comandos y en ` +
          `Windows esa invocacion va por cmd.exe sin escapar los argumentos. El andamio ya quedo escrito; ` +
          `volve a correr con --forzar y --version-openspec <x.y.z>.`,
      );
      return 1;
    }
    console.log(`openspec init con el pin del marco (${pin})`);
    try {
      execFileSync("npx", ["--yes", `@fission-ai/openspec@${pin}`, "init", "--tools", "claude"], {
        cwd: o.destino, stdio: "inherit", shell: process.platform === "win32",
      });
    } catch (e) {
      console.error(`::error::openspec init fallo: ${e.message}. El marco EXIGE openspec/ ([ -d openspec ] || exit 1), asi que el primer PR saldria rojo. Correlo a mano y volve`);
      return 1;
    }
    console.log("render de la porcion del marco de la constitucion");
    try {
      execFileSync(process.execPath, [path.join(raizMarco, "actions/constitucion/constitucion.mjs")], {
        cwd: o.destino, stdio: "inherit", env: { ...process.env, CONSTITUCION_MODO: "escribir" },
      });
    } catch (e) {
      console.error(`::error::el render de la constitucion fallo: ${e.message}`);
      return 1;
    }
  }

  // ── Lo que queda, y es humano ──
  console.log("");
  console.log("LISTO. Lo que sigue NO lo puede hacer esta herramienta:");
  console.log("");
  console.log("  EL ORDEN IMPORTA. Lo medido: el bootstrap va a main por PUSH DIRECTO y la");
  console.log("  proteccion se aplica DESPUES. El plano del cambio de la compuerta de cobertura");
  console.log("  mide las lineas que un PR agrega sin pruebas, y el commit fundacional agrega");
  console.log("  el esqueleto entero: por PR sale rojo, por push a main sale `NO APLICABLE`.");
  console.log("  Ademas `ci-ok` no aparece en la lista de checks del ruleset hasta que el CI");
  console.log("  haya corrido una vez. Push -> CI verde -> recien ahi el ruleset -> y desde");
  console.log("  ese momento todo por PR.");
  console.log("");
  console.log("  1. ANTES DEL PRIMER PUSH — `pnpm install`, y es el unico paso que falta:");
  console.log("     El andamio trae los manifiestos con sus rangos, pero NO el lockfile: un");
  console.log("     lockfile no convive con marcadores. El CI corre con --frozen-lockfile, asi");
  console.log("     que sin ese install el primer push muere en el cuarto paso. Corriendolo,");
  console.log("     el lockfile entra al commit fundacional y queda versionado.");
  console.log("     Lo que YA viene hecho y antes habia que pegar a mano: los excluidos de");
  console.log("     cobertura del andamio, el cableado de vitest.config.base.mjs en cada");
  console.log("     paquete, el proveedor de cobertura, y los scripts que el CI invoca.");
  console.log("");
  console.log("  2. Proteccion de main: las 4 reglas probadas, no las 8 (.github/proteccion-main.md)");
  console.log("");
  console.log("  3. Dependabot, y son DOS cosas en DOS lugares distintos:");
  console.log("     a) En ESTE repo: Settings -> Advanced Security -> Dependency graph y");
  console.log("        Dependabot security updates. NO se encienden solos en un repo nuevo.");
  console.log("        Sin eso el repo no recibe versiones nuevas del marco NI aparece en su censo.");
  console.log("     b) El acceso de Dependabot al repo PRIVADO del marco: es un ajuste de la");
  console.log("        ORGANIZACION (Settings -> Code security -> Dependabot -> repository");
  console.log("        access), no del repo del marco. Verificar antes de tocar nada:");
  console.log("          gh api orgs/<ORG>/dependabot/repository-access");
  console.log("");
  console.log("  4. Los handles de CODEOWNERS existen en la org, ESTAN EN SU EQUIPO y tienen escritura");
  console.log("     Tres formas de que el review cruzado no exista y ningun check lo diga:");
  console.log("     un handle mal escrito, un equipo VACIO, y un equipo sin permiso de escritura");
  console.log("     (GitHub simplemente no asigna a nadie, sin aviso). Y el permiso se le");
  console.log("     pregunta al REPO, no a la org: el endpoint de la org informa el default.");
  console.log("          gh api repos/<ORG>/<REPO>/teams --jq '.[] | \"\\(.slug): \\(.permission)\"'");
  console.log("");
  console.log("  5. El issue macro en el Project del area, y las SEIS labels `area:*`, que no");
  console.log("     se heredan de ningun molde — un repo nuevo nace sin ninguna:");
  console.log('          gh label create "area:backend"   --color 0052CC --description "Area: backend"');
  console.log('          gh label create "area:ci-cd"     --color 006B75 --description "Area: ci-cd"');
  console.log('          gh label create "area:datos"     --color FBCA04 --description "Area: datos"');
  console.log('          gh label create "area:frontend"  --color 1D76DB --description "Area: frontend"');
  console.log('          gh label create "area:infra"     --color 5319E7 --description "Area: infra"');
  console.log('          gh label create "area:seguridad" --color B60205 --description "Area: seguridad"');
  console.log("");
  console.log("  6. Los secrets, que son DOS y ninguno gatea el pipeline:");
  console.log("     CLAUDE_CODE_OAUTH_TOKEN (para que el bot conteste; `claude setup-token`)");
  console.log("     TOKEN_ACTUALIZAR_MARCO   (OPCIONAL: sin el, el PR semanal del marco nace");
  console.log("                               sin checks y el propio workflow lo avisa)");
  for (const [k, texto] of Object.entries(CON_LIMPIEZA_MANUAL)) {
    console.log(`  · ${k} = "${valores[k]}" — ${texto}`);
  }
  return 0;
}

if (path.resolve(process.argv[1] ?? "") === path.resolve(import.meta.filename)) {
  process.exit(main(process.argv.slice(2)));
}
