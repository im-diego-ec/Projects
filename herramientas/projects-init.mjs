#!/usr/bin/env node
// ---------------------------------------------------------------------------
// projects init — instancia el andamio en un repo nuevo.
//
// POR QUE EXISTE. Adoptar Projects eran ~30 actos manuales: copiar 76 archivos con
// robocopy o cp (y acordarse del `/.` final, o los dotfiles no viajan; y de
// renombrar el README del proyecto, que viaja con otro nombre), sustituir
// 192 ocurrencias de 21 marcadores en 39 archivos, inicializar OpenSpec y
// renderizar la constitucion. Nada de eso es una decision: es transcripcion. Y la
// transcripcion a mano falla de la peor manera —un marcador mal sustituido es
// sintacticamente valido, asi que el check de marcadores lo deja pasar: "se
// verifica la AUSENCIA de marcadores, no la correccion de los valores que los
// reemplazaron" (marco-ci.yml)—.
//
// ESOS CUATRO NUMEROS SE MIDEN, no se recuerdan: crecen con cada archivo que
// entra a plantilla/ y las versiones anteriores de este parrafo decian 23/122/22/15
// y 75/169/21/38, que fueron ciertas alguna vez. Desde la raiz del clon del marco:
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
// Y son ERROR desde este lote, cada uno con su medicion al lado:
//  · Un valor con un caracter de control o con la forma equivocada. Miraba 2 de
//    los 21; con EQUIPO_BUILDERS = "builders\n      - run: echo INYECTADO" la
//    corrida salia 0 y la linea aterrizaba en `.github/CODEOWNERS:19`, debajo de
//    la regla `*  @<org>/builders`. Ver FORMATOS.
//  · `openspec init` o el render de la constitucion que salen 0 sin escribir
//    nada. Los dos se daban por buenos con "no lanzo excepcion", y este repo
//    tiene MEDIDO que ese CLI miente en Windows. Ahora cada uno se comprueba
//    con lo que SI se puede afirmar de el, que no es lo mismo en los dos:
//     · `openspec init` no declara nada, asi que se le fotografia openspec/
//       antes y despues. Rojo si al final no hay openspec/ con contenido; y si
//       el directorio YA tenia archivos y la corrida no agrego ninguno, la
//       corrida no puede distinguir "el CLI mintio" de "el CLI no tenia nada
//       que hacer sobre un openspec/ ya inicializado": eso es `::warning::`,
//       porque un rojo que no sabe cual de los dos casos esta viendo rompe al
//       reintento con `--forzar`, que es el camino de recuperacion que esta
//       misma herramienta recomienda.
//     · El render SI declara lo que escribio: `artefactos` es un output de
//       actions/constitucion (action.yml). Se le da un GITHUB_OUTPUT propio, se
//       leen esas rutas y se comprueban EN DISCO. Compararlas antes/despues no
//       servia: el render es idempotente —reescribe siempre las mismas rutas—,
//       asi que la segunda corrida sobre un destino ya instanciado no deja
//       ninguna ruta nueva y el control salia rojo con todo bien.
//
// Y NO DEJA EL DESTINO A MEDIAS. Un fallo a mitad de escritura —EPERM por
// antivirus, un archivo abierto, OneDrive sobre Documents— revierte lo que esta
// corrida creo y dice que quedo. Antes salia como un volcado de `node:fs` con N
// archivos escritos, y el reintento chocaba con el guard del destino ocupado:
// el unico camino ofrecido era `--forzar`, la bandera que apaga la proteccion
// contra pisar trabajo.
//
// USO:
//   node herramientas/projects-init.mjs --valores <ruta.json> --destino <ruta>
//                                    [--sin-herramientas] [--forzar]
//                                    [--version-openspec <x.y.z>]
//   node herramientas/projects-init.mjs --ejemplo > valores.json
//   node herramientas/projects-init.mjs --help
//
// `--version-openspec` es el escape hatch para cuando el pin no se puede leer
// del default de `version_openspec` en marco-ci.yml. Espera una version EXACTA
// (0.9.4), no un rango: el valor se concatena en la linea de comandos de npx.
// ---------------------------------------------------------------------------

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

/** ESTE archivo y su directorio, resueltos con `fileURLToPath(import.meta.url)`
 *  y NO con `import.meta.dirname`.
 *
 *  No es estilo: `import.meta.dirname` e `import.meta.filename` llegaron en Node
 *  20.11 (backport de 21.2), o sea DESPUES del piso que NODE_MINIMO declara
 *  soportado. En 18.17 valen `undefined`, y lo que hacia con ellos este archivo
 *  era `path.resolve(undefined, "..")`, que tira `TypeError [ERR_INVALID_ARG_TYPE]`
 *  antes de leer una sola linea de la plantilla. O sea: el piso documentado y el
 *  piso real no eran el mismo numero, y la unica forma de haberlo visto era
 *  correr el banco en un Node de esa franja — que es exactamente la matriz de
 *  VERSIONES que este banco todavia no tiene (la de SO ya esta en ci.yml).
 *  `fileURLToPath` existe desde Node 10, asi que con esto el piso vuelve a ser
 *  el que dice el numero. */
const ESTE_ARCHIVO = fileURLToPath(import.meta.url);
const ESTE_DIRECTORIO = path.dirname(ESTE_ARCHIVO);

// ─────────────────────────── El piso de Node ───────────────────────────

/** ESTA es la unica pieza del marco que corre en la maquina de una persona y no
 *  en un runner. El runner esta pinado en la LTS vigente (hoy Node 24, la misma
 *  que fija el `node-version` del ci.yml del andamio y el FROM de su
 *  api/Dockerfile); la laptop de quien adopta el marco no la pina nadie, y en
 *  Windows lo habitual es un Node instalado hace tiempo con el MSI. Por eso el
 *  piso se verifica en vez de suponerse.
 *
 *  Y SON DOS PISOS DISTINTOS, que conviene no confundir. El de aca es el que
 *  necesita ESTA herramienta para copiar el andamio sin perder archivos, y por
 *  eso es bajo a proposito. El que necesita el REPO QUE SALE de la copia es mas
 *  alto y no lo decide este archivo: lo declaran las dependencias del andamio
 *  (hoy la mas exigente es jsdom, que pide `^22.22.2 || ^24.15.0 || >=26.0.0`),
 *  y quien se quede corto se entera en su `pnpm install`, no aca. Copiar
 *  archivos y poder instalarlos son dos cosas distintas: mezclarlas haria que
 *  esta herramienta se niegue a escribir en maquinas donde escribir funciona.
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

/** Los archivos que viajan CON OTRO NOMBRE: clave = como se llama en el andamio,
 *  valor = como se llama en el repo nuevo.
 *
 *  POR QUE HACE FALTA UN RENOMBRE Y NO ALCANZA CON COPIAR TAL CUAL. En la raiz
 *  del andamio conviven dos documentos que en el repo nuevo se llamarian igual:
 *  la guia del bootstrap (README.md, que NO viaja) y el README del PROYECTO. Dos
 *  archivos no pueden tener el mismo nombre en el mismo directorio, asi que el
 *  segundo vive como README-del-proyecto.md y se renombra al aterrizar.
 *
 *  Y por que el repo nuevo NECESITA un README: es el unico archivo que GitHub
 *  renderiza en la portada del repositorio, o sea lo primero —y muchas veces lo
 *  unico— que lee alguien que llega. Sin el, un repo recien nacido se presenta
 *  con una lista de directorios: nadie puede decir que hace el proyecto, como se
 *  levanta ni a quien preguntarle, y nada se pone rojo por eso. La ausencia no
 *  emite ninguna senal, que es exactamente la clase de hueco que este arranque
 *  existe para cerrar.
 *
 *  El renombre es de la RUTA, no del contenido: la sustitucion de marcadores
 *  corre igual sobre el archivo, y el escaneo de marcadores sobrevivientes lo
 *  relee por su nombre de DESTINO. */
export const RENOMBRES = new Map([["README-del-proyecto.md", "README.md"]]);

/** Como se llama `rel` en el repo nuevo. Identidad para casi todo. */
export function destinoDe(rel) {
  return RENOMBRES.get(rel) ?? rel;
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

/** LA FORMA QUE CADA VALOR PUEDE TENER, uno por uno.
 *
 *  POR QUE ESTO EXISTE, y esta medido. Hasta este cambio la validacion miraba 2
 *  de los 21: los doce digitos de las dos cuentas de AWS, mas el em dash de
 *  PREFIJO_RECURSOS y PROYECTO. Los otros 19 pasaban por "no esta vacio, es
 *  texto y no trae llaves" y despues se insertaban TAL CUAL. Corrido en vivo con
 *  EQUIPO_BUILDERS = "builders\n      - run: echo INYECTADO": exit 0, y la linea
 *  aterrizo en `.github/CODEOWNERS` justo debajo de la regla `*  @<org>/builders`.
 *
 *  El vector realista no es un atacante: es un archivo de valores armado
 *  copiando de un chat, de la salida de un agente o de una celda de planilla que
 *  arrastro un salto de linea. Y los destinos son los tres lugares donde un
 *  caracter de mas no se ve: CODEOWNERS —que GitHub NO rechaza cuando esta
 *  malformado, simplemente ignora la linea y no asigna a nadie—, el `run:` de
 *  ci.yml, y la allowlist de .claude/settings.json, donde una entrada mal
 *  cerrada amplia permisos sin ruido.
 *
 *  LA REGLA DE FONDO, que aplica a los 21 y no depende de esta tabla: ningun
 *  valor puede traer caracteres de control (`\n`, `\r`, `\t`, y el resto del
 *  rango C0 mas DEL). Eso solo cierra la inyeccion. Lo que agrega la tabla es el
 *  diagnostico: decir CUAL valor y QUE forma se esperaba, en vez de dejar que el
 *  repo nuevo nazca con un CODEOWNERS que no asigna a nadie.
 *
 *  `patron: null` NO es un olvido: GENERAR_CLIENTE_DATOS es una linea de comando
 *  (`prisma generate`), o sea texto libre con espacios por definicion. Lo unico
 *  que se le puede exigir es que sea UNA linea y que no venga con espacios al
 *  borde, y eso se exige aparte. */
export const FORMATOS = {
  // Nombre de repo de GitHub, en la forma que documenta plantilla/README.md.
  PROYECTO: { patron: /^[a-z0-9][a-z0-9._-]*$/, que: "un nombre de repo en kebab-case (minusculas, digitos, `.`, `_`, `-`)" },
  // Handle de organizacion o de persona: la regla de GitHub (alfanumerico, guiones
  // simples, ni al principio ni al final, hasta 39).
  ORG: { patron: /^[A-Za-z0-9](?:-?[A-Za-z0-9]){0,38}$/, que: "un handle de organizacion de GitHub" },
  BUILDER_1: { patron: /^[A-Za-z0-9](?:-?[A-Za-z0-9]){0,38}$/, que: "un handle de GitHub (sin la arroba: el andamio la pone donde va)" },
  BUILDER_2: { patron: /^[A-Za-z0-9](?:-?[A-Za-z0-9]){0,38}$/, que: "un handle de GitHub (sin la arroba: el andamio la pone donde va)" },
  PO: { patron: /^[A-Za-z0-9](?:-?[A-Za-z0-9]){0,38}$/, que: "un handle de GitHub (sin la arroba: el andamio la pone donde va)" },
  // Slug de equipo: lo que GitHub genera para la URL del equipo, siempre en
  // minusculas. Viaja a CODEOWNERS como `@{{ORG}}/{{EQUIPO_BUILDERS}}`.
  EQUIPO_BUILDERS: { patron: /^[a-z0-9](?:[-_]?[a-z0-9]){0,38}$/, que: "el slug del equipo en GitHub, en minusculas (el de la URL del equipo, no su nombre para mostrar)" },
  EQUIPO_PO: { patron: /^[a-z0-9](?:[-_]?[a-z0-9]){0,38}$/, que: "el slug del equipo en GitHub, en minusculas (el de la URL del equipo, no su nombre para mostrar)" },
  // Los tres paquetes son NOMBRES DE CARPETA. problemasDePaquetes ademas los ata
  // a las carpetas que el andamio reparte de verdad; esto es la forma.
  PAQUETE_API: { patron: /^[a-z0-9][a-z0-9._-]*$/, que: "un nombre de carpeta (minusculas, sin barras ni espacios)" },
  PAQUETE_WEB: { patron: /^[a-z0-9][a-z0-9._-]*$/, que: "un nombre de carpeta (minusculas, sin barras ni espacios)" },
  PAQUETE_E2E: { patron: /^[a-z0-9][a-z0-9._-]*$/, que: "un nombre de carpeta (minusculas, sin barras ni espacios)" },
  // Un comando. Ver el parrafo de arriba: aca no hay forma que exigir.
  GENERAR_CLIENTE_DATOS: { patron: null, que: "un comando de UNA sola linea, tal como se invoca dentro del paquete de backend" },
  CUENTA_DEV: { patron: /^\d{12}$/, que: "un id de cuenta AWS: 12 digitos" },
  CUENTA_PROD: { patron: /^\d{12}$/, que: "un id de cuenta AWS: 12 digitos" },
  REGION: { patron: /^[a-z]{2}(?:-[a-z]+)+-\d$/, que: "una region de AWS (us-east-1, eu-west-3, us-gov-west-1)" },
  // El perfil de la CLI viaja a la allowlist de .claude/settings.json dentro de
  // `Bash(AWS_PROFILE={{PERFIL_DEV}} terraform plan *)`. Un espacio ahi no rompe
  // el JSON: rompe el patron, y una entrada de allowlist que no matchea nada es
  // exactamente el fallo que nadie ve.
  PERFIL_DEV: { patron: /^[A-Za-z0-9._-]+$/, que: "un nombre de perfil de la CLI de AWS, sin espacios (viaja dentro de un patron de la allowlist de .claude/settings.json)" },
  PERFIL_PROD: { patron: /^[A-Za-z0-9._-]+$/, que: "un nombre de perfil de la CLI de AWS, sin espacios (viaja dentro de un patron de la allowlist de .claude/settings.json)" },
  // Prefijo de recursos AWS y raiz de las rutas de SSM: /<prefijo>/<env>/<NOMBRE>.
  PREFIJO_RECURSOS: { patron: /^[a-z0-9][a-z0-9-]*$/, que: "un prefijo de recursos AWS: minusculas, digitos y guiones (es tambien la raiz de las rutas de SSM)" },
  DOMINIO_DEV: { patron: /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/, que: "un host sin esquema ni barra final (agenda-dev.ejemplo.com, no https://agenda-dev.ejemplo.com/)" },
  DOMINIO_PROD: { patron: /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/, que: "un host sin esquema ni barra final (agenda.ejemplo.com, no https://agenda.ejemplo.com/)" },
  CANAL_ALERTAS: { patron: /^#[a-z0-9][a-z0-9._-]*$/, que: "un canal con su almohadilla adelante, en minusculas (#alertas-prod)" },
  // Viaja al MEDIO de los nombres de tool del MCP: `mcp__{{ID_MCP_SLACK}}__slack_read_channel`.
  // Un guion bajo ahi corre el separador `__` y la entrada deja de matchear.
  ID_MCP_SLACK: { patron: /^[A-Za-z0-9-]+$/, que: "el id del servidor MCP: alfanumerico y guiones, SIN guiones bajos (va entre los dos `__` del nombre de la tool)" },
};

/** Caracteres de control: el rango C0 completo mas DEL. Es la regla que aplica a
 *  los 21 sin excepcion, incluido el valor de texto libre. */
const CONTROL = /[\u0000-\u001f\u007f]/;

/** Como se nombra un caracter de control en un mensaje de error. Imprimirlo
 *  crudo seria escribir el salto de linea EN el diagnostico, que es justamente lo
 *  que hace que el defecto sea invisible. */
function nombrarControl(v) {
  const i = v.search(CONTROL);
  const c = v.charCodeAt(i);
  const nombre = { 10: "\\n (salto de linea)", 13: "\\r (retorno de carro)", 9: "\\t (tabulacion)" }[c];
  return `${nombre ?? `\\x${c.toString(16).padStart(2, "0")}`} en la posicion ${i}`;
}

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
    if (/\{\{|\}\}/.test(v)) {
      problemas.push(`${k} sigue siendo un marcador sin llenar: ${v}`);
      continue;
    }
    // Primero la regla de fondo. Se corta aca: un valor con un salto de linea
    // adentro tambien va a fallar el patron, y dos problemas para el mismo valor
    // hacen que el importante —el que explica que el archivo trae basura
    // invisible— se lea como ruido.
    if (CONTROL.test(v)) {
      problemas.push(
        `${k} trae un caracter de control: ${nombrarControl(v)}. Los valores viajan LITERALES a CODEOWNERS, ` +
          `a ci.yml y a la allowlist de .claude/settings.json, y en los tres un salto de linea no es un typo: ` +
          `es una linea nueva en un archivo que despues nadie relee`,
      );
      continue;
    }
    if (v !== v.trim()) {
      problemas.push(`${k} = ${JSON.stringify(v)} empieza o termina con espacios. Sacaselos: en CODEOWNERS un handle con espacio al final no asigna a nadie y GitHub no lo reporta`);
      continue;
    }
    const formato = FORMATOS[k];
    if (formato?.patron && !formato.patron.test(v)) {
      problemas.push(`${k} = ${JSON.stringify(v)} no tiene la forma que corresponde: se espera ${formato.que}`);
    }
  }
  // La regla del area: sin em dashes en nada que viaje a AWS. Sobrevive a los
  // patrones de arriba —que ya rechazarian un em dash— porque el mensaje es lo
  // que ensena la regla, y "no tiene la forma que corresponde" no la ensena.
  for (const k of ["PREFIJO_RECURSOS", "PROYECTO"]) {
    if (typeof crudos[k] === "string" && /—|–/.test(crudos[k])) {
      problemas.push(`${k} tiene un em dash o en dash: los nombres que viajan a AWS usan guiones normales`);
    }
  }
  if (problemas.length) return { problemas, valores: null };
  return { problemas: [], valores: derivar(crudos) };
}

/** Los 21 tienen una forma declarada. Sin esto, agregar una clave a REQUERIDOS y
 *  olvidarse de su fila en FORMATOS la devuelve al regimen viejo —no-vacio y
 *  nada mas— en silencio, que es exactamente el defecto que esta tabla cierra.
 *  main() lo corre antes de leer el archivo de valores, asi que el desfase sale
 *  en la primera corrida y no en el repo nuevo. */
export function marcadoresSinFormato() {
  return REQUERIDOS.filter((k) => !Object.hasOwn(FORMATOS, k));
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

/** `mkdir -p` que ANOTA que directorios creo. `mkdirSync(recursive: true)` no lo
 *  dice —devuelve solo el primero, y solo a veces—, y sin esa lista el rollback
 *  de una copia a medias no puede distinguir un directorio que trajo esta
 *  corrida de uno que ya estaba en el repo destino. */
function crearDirectorios(dir, creados) {
  if (fs.existsSync(dir)) return;
  const padre = path.dirname(dir);
  if (padre !== dir) crearDirectorios(padre, creados);
  fs.mkdirSync(dir);
  creados.push(dir);
}

export function instanciar({ raizAndamio, destino, valores }) {
  const rels = archivosDelAndamio(raizAndamio);
  if (rels.length === 0) throw new Error(`el andamio esta vacio: ${raizAndamio}`);

  let total = 0;
  const faltantes = new Set();
  const escritos = [];
  // Lo que hace falta para poder DESHACER: los rels que esta corrida creo de
  // cero, los que piso (que ya existian, y por eso no se borran), y los
  // directorios que trajo. Se acumula sobre la marcha porque el caso que
  // importa es el que interrumpe el bucle a la mitad.
  const nuevos = [];
  const sobreescritos = [];
  const directoriosCreados = [];
  // `escritos` habla en nombres del ANDAMIO —es lo que se compara contra la
  // segunda medicion del arbol de origen— y `escritosEnDestino` en nombres del
  // REPO NUEVO, que es por donde hay que releer los archivos. Para todo lo que
  // no se renombra son la misma lista; la diferencia existe por RENOMBRES.
  const escritosEnDestino = [];
  const estado = () => ({ escritos, escritosEnDestino, nuevos, sobreescritos, directoriosCreados });
  for (const rel of rels) {
    const relDestino = destinoDe(rel);
    const origen = path.join(raizAndamio, rel);
    const salida = path.join(destino, ...relDestino.split("/"));
    try {
      const texto = fs.readFileSync(origen, "utf8");
      const r = sustituir(texto, valores);
      total += r.cuenta;
      for (const f of r.faltantes) faltantes.add(f);
      crearDirectorios(path.dirname(salida), directoriosCreados);
      const yaEstaba = fs.existsSync(salida);
      fs.writeFileSync(salida, r.salida, "utf8");
      // El rollback y los mensajes de "esto se piso" hablan del DESTINO: borrar
      // por el nombre del andamio dejaria el archivo renombrado en el repo.
      (yaEstaba ? sobreescritos : nuevos).push(relDestino);
      escritos.push(rel);
      escritosEnDestino.push(relDestino);
    } catch (e) {
      // El error se enriquece en vez de envolverse: quien lo atrape necesita el
      // `code` de fs (EACCES, EPERM, ENOSPC) para explicar la causa, y ademas
      // saber QUE quedo escrito. Envolverlo en un Error nuevo perdia lo primero.
      e.relQueFallo = rel;
      Object.assign(e, estado());
      throw e;
    }
  }
  return { total, faltantes: [...faltantes].sort(), ...estado() };
}

/** Deshace una copia que quedo a medias. Borra SOLO lo que esta corrida creo:
 *  los archivos que no existian antes y los directorios que trajo, de mas hondo
 *  a mas somero. Lo que ya estaba y se piso —solo posible con `--forzar`— NO se
 *  restaura, porque esta herramienta nunca tuvo el contenido viejo en memoria;
 *  se devuelve nombrado para que el mensaje lo diga en vez de insinuar que el
 *  destino quedo como estaba.
 *
 *  Devuelve `{ borrados, sobreescritos, noSePudo }`. `noSePudo` no vuelve a
 *  tirar: se esta atendiendo una falla, y hacer fallar el rollback dejaria a la
 *  persona con dos problemas y ningun mensaje. */
export function revertir(destino, { nuevos = [], sobreescritos = [], directoriosCreados = [] }) {
  const borrados = [];
  const noSePudo = [];
  for (const rel of nuevos) {
    const abs = path.join(destino, ...rel.split("/"));
    try {
      fs.rmSync(abs, { force: true });
      borrados.push(rel);
    } catch (e) {
      noSePudo.push(`${rel}: ${e.message}`);
    }
  }
  // De mas larga a mas corta: un directorio se borra despues que sus hijos.
  for (const dir of [...directoriosCreados].sort((a, b) => b.length - a.length)) {
    try {
      fs.rmdirSync(dir);
    } catch {
      // Queda algo adentro que no es nuestro (o ya no esta). Se deja: borrar un
      // directorio con contenido ajeno es peor que dejar uno vacio de mas.
    }
  }
  return { borrados, sobreescritos, noSePudo };
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

/** El nombre del archivo que le queda al proyecto como registro de sus valores.
 *  Lo lee actions/constitucion para renderizar la porcion del marco. */
export const REGISTRO_DE_VALORES = ".projects-valores.json";

/** Que valores de REQUERIDOS el ANDAMIO no declara en su propio registro.
 *
 *  QUE ES EL DESFASE. plantilla/.projects-valores.json llega al repo nuevo con
 *  una clave por valor apuntando a su propio marcador, asi que la instanciacion
 *  lo llena sola — pero SOLO las claves que estan escritas. Una clave ausente no
 *  deja rastro: el valor viaja a los archivos que lo usan y despues no hay donde
 *  preguntarle "que equipo es el de builders en este repo", ni de donde lo lea
 *  actions/constitucion para renderizar la porcion del marco.
 *
 *  QUIEN LA CORRE, y no es main(). Es un invariante del ANDAMIO —de un archivo
 *  del marco, no de nada que traiga quien corre la herramienta— asi que lo
 *  comprueba el banco del marco (pruebas/andamio/tabla-de-valores.test.mjs), que
 *  es donde el desfase se arregla. En main() seria peor que inutil: un andamio
 *  MINIMO, con dos archivos y sin registro, es un caso legitimo —los bancos de
 *  esta herramienta arman varios— y romperle la corrida cambiaria un desfase del
 *  marco por un rojo sobre alguien que no hizo nada mal.
 *
 *  Lo que SI mira main() es el otro lado: avisosDelRegistroDeValores relee el
 *  archivo del DESTINO ya escrito, y ahi avisa en vez de romper porque el defecto
 *  puede ser de un archivo que esta herramienta no controla. */
export function clavesQueElRegistroNoDeclara(raizAndamio) {
  const abs = path.join(raizAndamio, REGISTRO_DE_VALORES);
  let guardados;
  try {
    guardados = JSON.parse(fs.readFileSync(abs, "utf8"));
  } catch (e) {
    return { error: `no pude leer ${REGISTRO_DE_VALORES} del andamio: ${e.message}`, faltan: [] };
  }
  return { error: null, faltan: REQUERIDOS.filter((k) => !Object.hasOwn(guardados, k)) };
}

/** Que valores de REQUERIDOS NO quedan guardados en el registro del proyecto.
 *
 *  El andamio trae ese archivo con una clave por valor apuntando a su propio
 *  marcador, asi que la instanciacion lo llena sola — pero SOLO las claves que
 *  estan. Una clave que el andamio no declara no deja rastro en el repo nuevo:
 *  el valor viajo a los archivos que lo usan y despues no hay donde preguntarle
 *  "que equipo es el de builders en este repo".
 *
 *  Devuelve LINEAS de aviso, no tira ni decide: quien llama decide si son
 *  `::warning::` o rojo. Hoy son aviso, y el porque esta donde se invoca. */
export function avisosDelRegistroDeValores(destino) {
  const abs = path.join(destino, REGISTRO_DE_VALORES);
  if (!fs.existsSync(abs)) {
    return [
      `::warning::el destino no tiene ${REGISTRO_DE_VALORES}. Es el archivo del que actions/constitucion lee ` +
        `los valores de este repo para renderizar la porcion del marco: sin el, ese render no tiene entrada.`,
    ];
  }
  let guardados;
  try {
    guardados = JSON.parse(fs.readFileSync(abs, "utf8"));
  } catch (e) {
    return [`::warning::${REGISTRO_DE_VALORES} quedo escrito y no es JSON valido: ${e.message}`];
  }
  const faltan = REQUERIDOS.filter((k) => !Object.hasOwn(guardados, k));
  if (faltan.length === 0) return [];
  return [
    `::warning::${REGISTRO_DE_VALORES} guarda ${REQUERIDOS.length - faltan.length} de los ${REQUERIDOS.length} ` +
      `valores: no queda registro de ${faltan.join(", ")}. Los valores SI viajaron a los archivos que los usan, ` +
      `asi que el repo nuevo funciona; lo que falta es la fuente unica que responda de donde salio cada uno ` +
      `cuando haya que auditar el review cruzado o renombrar un equipo. Se arregla en el andamio, agregando ` +
      `esas claves a plantilla/${REGISTRO_DE_VALORES} con la misma convencion que el resto del archivo ` +
      `("${faltan[0]}": "{{${faltan[0]}}}").`,
  ];
}

// ─────────────────────────── El arranque del proyecto ───────────────────────────
//
// POR QUE ESTO ES PARTE DE LA HERRAMIENTA Y NO UNA LISTA IMPRESA. Hasta este
// cambio `projects init` dejaba el repo ESCRITO y le imprimia a la persona
// cuatro comandos para que los corriera: install, format, datos, verificar.
// Ninguno de los cuatro es una decision —no hay nada que elegir, no hay nada que
// mirar, la respuesta correcta es siempre la misma— asi que eran exactamente lo
// mismo que la copia de 76 archivos que esta herramienta ya reemplazo:
// transcripcion. Y la transcripcion a mano falla igual de mal aca: quien se
// saltea el install empuja el commit fundacional SIN lockfile y el CI muere en
// `--frozen-lockfile`; quien se saltea el format empuja un README desalineado y
// el CI muere en `format:check`. En los dos casos el rojo aparece media hora
// despues, en un pipeline, y no en la maquina donde se podia arreglar en un
// segundo.
//
// LO QUE SIGUE SIENDO HUMANO Y POR QUE. Crear el repo en GitHub, decidir los
// valores, y los ajustes de la cuenta y de la organizacion (proteccion de main,
// Dependabot, equipos, secrets, labels). Ninguno se puede hacer desde aca sin
// credenciales que esta herramienta no pide y no deberia tener.

/** Los cuatro pasos, en el UNICO orden en que salen verdes.
 *
 *  EL ORDEN NO ES ESTETICO Y ESTA MEDIDO. `datos` va antes que cualquier cosa
 *  que lea tipos: genera el cliente de la capa de datos, y sin el `lint` y
 *  `typecheck` salen rojos por un import que no resuelve — un rojo que no es de
 *  quien corre la herramienta y que manda a diagnosticar el lugar equivocado. Y
 *  `format` va antes que `verificar` porque al sustituir los marcadores cambian
 *  los anchos del texto y el formateador alinea las tablas de markdown por
 *  ancho: sin esa pasada, `format:check` —que esta DENTRO de verificar— sale
 *  rojo sobre un README que nadie escribio mal.
 *
 *  `verificar` vuelve a correr `datos` por su cuenta (es el primer eslabon de su
 *  cadena) y esa repeticion se deja a proposito: correrlo aparte es lo que hace
 *  que un fallo del generador se lea como "el paso datos fallo" en vez de como
 *  un rojo adentro de una cadena de seis. */
export const PASOS_DEL_ARRANQUE = [
  {
    clave: "instalado",
    titulo: "instalar las dependencias",
    args: ["install"],
    necesitaRed: true,
    porQue:
      "el andamio trae los manifiestos con sus rangos pero NO el lockfile (un lockfile no convive con marcadores). " +
      "El CI corre con --frozen-lockfile: sin este install, el primer push muere ahi",
    arreglo:
      "corre `pnpm install` en el destino y lee el error. Causa habitual: un Node por debajo del que exigen las " +
      "dependencias del andamio — copiar el andamio y poder instalarlo son dos pisos distintos, y este es el alto",
  },
  {
    clave: "datos",
    titulo: "generar el cliente de la capa de datos",
    args: ["run", "datos"],
    necesitaRed: false,
    porQue: "lint y typecheck leen los tipos que genera este paso: sin el salen rojos por un import que no resuelve",
    arreglo:
      "corre `pnpm datos` en el destino. Si el proyecto NO genera cliente de datos, el valor GENERAR_CLIENTE_DATOS " +
      "no corresponde y hay que borrar ese script y su paso del ci.yml (esta en la lista de limpiezas manuales de abajo)",
  },
  {
    clave: "formateado",
    titulo: "formatear el arbol",
    args: ["run", "format"],
    necesitaRed: false,
    porQue:
      "al sustituir los marcadores cambian los anchos del texto y el formateador alinea las tablas de markdown por " +
      "ancho: sin esta pasada el repo nace desalineado y `format:check` sale rojo por una razon que no es de nadie",
    arreglo: "corre `pnpm format` en el destino",
  },
  {
    clave: "verificado",
    titulo: "verificar el proyecto entero",
    args: ["run", "verificar"],
    necesitaRed: false,
    porQue: "es la misma cadena que corre el CI: datos, lint, format:check, typecheck, test y build",
    arreglo:
      "corre `pnpm verificar` en el destino: encadena seis comprobaciones y el primer rojo corta, asi que la salida " +
      "dice cual fue. Es el MISMO rojo que daria el CI en el primer push, con la diferencia de que aca se arregla antes",
  },
];

/** Con que se corren los scripts del proyecto.
 *
 *  `corepack` primero y `pnpm` despues, y no al reves: corepack VIENE CON NODE, y
 *  usa la version de pnpm que el propio proyecto declara en `packageManager`. Un
 *  `pnpm` suelto del PATH es el que tenga instalado esa maquina, que puede ser de
 *  otra mayor — y desde la mayor 11 de pnpm la lista de scripts de instalacion
 *  permitidos SOLO se lee de pnpm-workspace.yaml, asi que un pnpm 9 sobre este
 *  andamio no falla claro: falla con ERR_PNPM_IGNORED_BUILDS y de paso escribe
 *  relleno en ese archivo.
 *
 *  Devuelve `null` cuando no hay ninguno, que NO es un error de esta herramienta:
 *  es una maquina sin gestor de paquetes, y lo que corresponde es decirlo y
 *  seguir. */
export function ejecutorDeScripts(existe = comandoDisponible) {
  if (existe("corepack")) return { comando: "corepack", prefijo: ["pnpm"], nombre: "corepack pnpm" };
  if (existe("pnpm")) return { comando: "pnpm", prefijo: [], nombre: "pnpm" };
  return null;
}

/** El entorno de los procesos hijos del arranque.
 *
 *  `COREPACK_ENABLE_DOWNLOAD_PROMPT=0` no es un capricho: la primera vez que
 *  corepack tiene que bajar la version de pnpm que el proyecto declara, PREGUNTA
 *  por la terminal. En una corrida sin nadie mirando —o con la salida
 *  redirigida— esa pregunta no la contesta nadie y el arranque se cuelga, que es
 *  el mismo modo de falla que esta herramienta cierra en todos lados. Con la
 *  variable en 0 baja sin preguntar. */
export function entornoDelArranque(env = process.env, dirDeShims = null) {
  const base = { ...env, COREPACK_ENABLE_DOWNLOAD_PROMPT: "0" };
  if (!dirDeShims) return base;
  // La clave se busca sin mirar mayusculas y se REUSA la que ya estaba. En
  // Windows la variable se llama "Path", y agregar una segunda clave "PATH" al
  // objeto no la reemplaza: deja dos, y cual gana en el hijo no esta definido.
  const clave = Object.keys(base).find((k) => k.toUpperCase() === "PATH") ?? "PATH";
  const actual = base[clave] ?? "";
  base[clave] = actual ? `${dirDeShims}${path.delimiter}${actual}` : dirDeShims;
  return base;
}

/** Si hace falta materializar el shim de `pnpm` antes de arrancar.
 *
 *  EL DEFECTO QUE ESTO CIERRA, medido el 2026-08-25 en un runner limpio de CI:
 *
 *    $ pnpm --filter api --fail-if-no-match exec prisma generate
 *    sh: 1: pnpm: not found
 *
 *  El paso 1 del arranque —`corepack pnpm install`— pasaba, y el 2 se cortaba.
 *  La razon es que los scripts del andamio se llaman entre si con `pnpm` PELADO
 *  (`pnpm -C api run typecheck`, `pnpm datos && pnpm lint && ...`), que es la
 *  forma idiomatica de un workspace de pnpm y no se va a cambiar: escribir
 *  "corepack pnpm" dentro de cada script del proyecto del consumidor seria
 *  filtrarle a su package.json un detalle de COMO lo arrancamos nosotros.
 *
 *  Lo que hace que esto no se vea en la maquina de quien lo escribe: si hay un
 *  `pnpm` global en el PATH, los scripts anidados lo encuentran y todo pasa. O
 *  sea que el unico lugar donde el defecto aparece es exactamente el que este
 *  andamio promete cubrir —una maquina limpia, sin instalar nada global, que es
 *  para lo que existe corepack— y por eso paso desapercibido hasta que lo corrio
 *  un runner de CI.
 *
 *  `corepack enable --install-directory <dir> pnpm` escribe los shims en un
 *  directorio propio en vez de en el prefijo global de Node. No toca la maquina:
 *  el directorio es temporal y lo unico que lo usa es el PATH de los procesos
 *  hijos de este arranque. */
export function necesitaShimDePnpm(ejecutor, existe = comandoDisponible) {
  return Boolean(ejecutor) && ejecutor.comando === "corepack" && !existe("pnpm");
}

/** Escribe los shims y devuelve el directorio, o `null` si no se pudo.
 *
 *  `null` NO se trata como error fatal a proposito: si el shim no se pudo
 *  materializar, el arranque igual se intenta y quien falla es el script anidado
 *  con SU mensaje —el `pnpm: not found` de arriba, que es preciso—. Convertirlo
 *  aca en un corte anticipado cambiaria un diagnostico exacto por uno inventado
 *  por esta herramienta. */
export function materializarShimDePnpm(dir, correr = corepackEnable) {
  try {
    fs.mkdirSync(dir, { recursive: true });
    correr(dir);
    // Que el comando salga 0 no alcanza: lo que importa es que el archivo este.
    // En Windows el shim es `pnpm.cmd` y en el resto `pnpm`, y un cero aca es
    // este paso roto, no un shim escrito.
    const hay = fs.readdirSync(dir).some((f) => f === "pnpm" || f.toLowerCase() === "pnpm.cmd");
    return hay ? dir : null;
  } catch {
    return null;
  }
}

function corepackEnable(dir) {
  // EL DIRECTORIO VA POR `cwd` Y EL ARGUMENTO ES UN PUNTO LITERAL, no la ruta.
  // En Windows esta invocacion pasa por cmd.exe —corepack ahi es un `.cmd` y no
  // se puede ejecutar sin shell— y los argumentos se concatenan SIN escapar. La
  // ruta viene de `os.tmpdir()`, que en Windows es del estilo
  // `C:\Users\Ana Maria\AppData\Local\Temp`: un espacio en el nombre de la
  // persona partia el argumento en dos y corepack escribia los shims en
  // cualquier parte. `cwd` es una opcion de spawn y no toca la linea de
  // comandos, asi que el vector queda de literales de este archivo y la
  // superficie desaparece en vez de quedar declarada como aceptable.
  execFileSync("corepack", ["enable", "--install-directory", ".", "pnpm"], {
    cwd: dir,
    stdio: "ignore",
    env: entornoDelArranque(),
    shell: process.platform === "win32",
  });
}

function comandoDisponible(cmd) {
  try {
    execFileSync(cmd, ["--version"], { stdio: "ignore", shell: process.platform === "win32" });
    return true;
  } catch {
    return false;
  }
}

/** Corre UN paso del arranque en el destino.
 *
 *  `stdio: "inherit"` a proposito: lo que este paso hace tarda minutos y quien lo
 *  mira tiene que ver la salida REAL del gestor de paquetes mientras pasa, no un
 *  spinner y un resumen al final. Es tambien lo que hace que el diagnostico de un
 *  fallo sea el del programa que fallo y no una parafrasis de esta herramienta.
 *
 *  Sobre el `shell` en Windows: los argumentos de estos pasos son TODOS literales
 *  de este archivo ("install", "run", "datos"...). No hay un solo valor de la
 *  persona en ese vector, que es lo que hace que la concatenacion sin escapar de
 *  cmd.exe —la que obliga a acotar el pin de OpenSpec unos bloques mas arriba— no
 *  tenga aca ninguna superficie. */
export function correrPaso(ejecutor, paso, destino, env = process.env, dirDeShims = null) {
  try {
    execFileSync(ejecutor.comando, [...ejecutor.prefijo, ...paso.args], {
      cwd: destino,
      stdio: "inherit",
      env: entornoDelArranque(env, dirDeShims),
      shell: process.platform === "win32",
    });
    return { ok: true, error: null };
  } catch (e) {
    return { ok: false, error: `${e?.status !== undefined && e?.status !== null ? `salio ${e.status}` : e?.code ?? "fallo"}` };
  }
}

/** El modulo que sabe hablarle al registro de npm, cargado SOLO cuando el
 *  arranque lo va a usar y por `import()` y no por `import` de arriba.
 *
 *  POR QUE NO ES UN IMPORT NORMAL, y es una propiedad que este archivo tenia y
 *  casi se pierde en el mismo cambio que trajo el arranque. Un `import` estatico
 *  de un archivo hermano se resuelve al CARGAR el modulo, o sea antes de la
 *  primera linea de main(): si esta herramienta esta copiada sin su hermano al
 *  lado —el caso que el guard de marco-ci.yml ya contempla, un clon parcial o el
 *  archivo copiado fuera de su arbol— el proceso muere con un
 *  ERR_MODULE_NOT_FOUND del cargador de ESM, con traza del runtime, sin escribir
 *  nada y sin una sola linea de esta herramienta. Es exactamente el modo de
 *  falla que el encabezado declara cerrado, reintroducido por una linea de
 *  import. Medido: el caso del banco que copia SOLO este archivo a un directorio
 *  temporal salia asi.
 *
 *  Cargado aca abajo y con guarda, la ausencia del hermano cuesta lo que de
 *  verdad cuesta: la comprobacion previa de red, que es una comodidad de
 *  diagnostico. El arranque se intenta igual. */
async function moduloDelRegistro() {
  try {
    return await import("./registro-npm.mjs");
  } catch {
    return null;
  }
}

/** El resumen del arranque, en las palabras del encargo: instalado, formateado,
 *  verificado — o exactamente que fallo y como se arregla. Puro sobre lo que
 *  paso, para que el banco lo pueda afirmar sin correr un install. */
export function lineasDelResumen(hechos, destino) {
  const hechas = hechos.filter((h) => h.ok).map((h) => h.paso.clave);
  const fallo = hechos.find((h) => !h.ok);
  const l = [];
  if (!fallo) {
    l.push(`ARRANCADO Y EN VERDE: ${hechas.join(", ")}. El proyecto de ${destino} instala, formatea y verifica.`);
    return l;
  }
  l.push(
    hechas.length
      ? `::error::el arranque llego hasta "${hechas.join(", ")}" y se corto en el paso "${fallo.paso.titulo}" (${fallo.error}).`
      : `::error::el arranque se corto en su primer paso, "${fallo.paso.titulo}" (${fallo.error}).`,
  );
  l.push(`  Por que ese paso: ${fallo.paso.porQue}.`);
  l.push(`  Como se arregla: ${fallo.arregloConcreto ?? fallo.paso.arreglo}.`);
  l.push(`  La salida del programa que fallo esta arriba, tal cual: este arranque no la parafrasea.`);
  l.push(
    `  Los ${PASOS_DEL_ARRANQUE.length - hechas.length - 1} paso(s) que venian despues NO se corrieron, para que ` +
      `el rojo que se lee sea el primero y no una cascada.`,
  );
  l.push(`  El repo YA quedo escrito en ${destino}: esto no hay que volver a instanciarlo, solo destrabar ese paso.`);
  return l;
}

// ───────────── El diagnostico de la proteccion de main ─────────────
//
// EL DEFECTO QUE ESTE BLOQUE CIERRA, y es el que este marco existe para
// prohibir. Hasta este cambio `projects init` copiaba `.github/proteccion-main.md`
// TAL CUAL y no medía nada. Ese documento se presenta como "el estado real" del
// repositorio y manda, en un recuadro, aplicar las cuatro reglas del primer
// bloque. Medido contra la cuenta que hoy hospeda el marco:
//
//   gh api repos/<org>/<repo>/rulesets
//   -> 403 {"message":"Upgrade to GitHub Pro or make this repository public to
//           enable this feature.","status":"403"}
//
// O sea que las cuatro reglas que el andamio manda aplicar NO EXISTEN y NO
// PUEDEN existir: GitHub no ofrece proteccion de rama en repositorios privados
// del plan gratuito. La persona que sigue el paso a paso se choca con un error
// que el documento no contempla —solo contempla "si la salida no coincide con la
// tabla"— y se queda sin salida escrita. Repartir un documento que afirma un
// estado que el repositorio desmiente es la definicion de fallar ABIERTO: no hay
// compuerta y ningun texto lo dice.
//
// LA REGLA DE ESTE BLOQUE, y es una sola: se MIDE, no se pregunta. Preguntarle
// al arrancar "tenes GitHub Pro?" falla de tres formas —la persona no lo sabe,
// lo sabe mal, o el plan cambia despues y nadie vuelve a preguntar— y las tres
// terminan escribiendo una afirmacion que nadie comprobo.
//
// Y HAY UN TERCER ESTADO que no se puede colapsar con los otros dos: "no pude
// mirar". Sin `gh`, sin autenticacion o sin red, esta herramienta no sabe nada
// del repositorio, y "no pude mirar" NO es "no hay problema". Confundirlos es
// exactamente el fail-open de arriba con otro disfraz, asi que cada uno de esos
// caminos escribe que NO se midio y no afirma nada.
//
// LO QUE ESTE BLOQUE NO HACE: aplicar el ruleset. La sonda es de SOLO LECTURA —un
// GET alcanza para saberlo, no hace falta intentar escribir—. Cambiar un ajuste
// de seguridad de un repositorio no se hace en silencio, y un programa con
// permiso para editar la proteccion de main es un programa con permiso para
// quitarla; es la razon por la que el propio documento declara que aplicarla es
// un acto humano deliberado. Lo que esta herramienta deja escrito es el comando.

/** El documento del proyecto nuevo donde se escribe el estado medido. */
export const RUTA_PROTECCION = ".github/proteccion-main.md";

/** Cuanto se espera a la sonda antes de darla por no contestada. Es una consulta
 *  de un objeto chico; quince segundos es holgado y es corto frente a lo que
 *  cuesta la alternativa, que es dejar colgado un `projects init` sobre un repo
 *  ya escrito. Al vencer se cae en "no pude mirar", que es lo correcto. */
export const TIMEOUT_DE_LA_SONDA = 15000;

/** Los estados que la sonda puede dejar, y por que son siete y no dos.
 *
 *  Los dos primeros son MEDICIONES —el repositorio contesto— y los cinco
 *  ultimos son AUSENCIA de medicion. La linea que separa esos dos grupos es la
 *  unica que de verdad importa en este archivo. */
export const ESTADOS_DE_PROTECCION = {
  puede: "el repositorio SI admite rulesets: la sonda contesto 200",
  "sin-compuertas": "el repositorio NO admite rulesets con su plan y visibilidad de hoy: 403 de upgrade",
  "sin-gh": "no se pudo mirar: no hay `gh` en el PATH",
  "sin-auth": "no se pudo mirar: `gh` no esta autenticado",
  "sin-red": "no se pudo mirar: no se llego a la API de GitHub",
  "sin-repo": "no se pudo mirar: GitHub contesto 404 sobre ese repositorio",
  "no-se-sabe": "no se pudo mirar: la sonda contesto algo que esta herramienta no sabe leer",
};

/** Los estados en los que esta herramienta NO midio nada y por lo tanto no
 *  afirma nada. Es UNA lista, para que agregar un estado nuevo no pueda dejarlo
 *  del lado equivocado por olvido. */
export const ESTADOS_SIN_MEDICION = new Set(["sin-gh", "sin-auth", "sin-red", "sin-repo", "no-se-sabe"]);

export function seMidio(estado) {
  return !ESTADOS_SIN_MEDICION.has(estado);
}

/** Que dijo la sonda, leido de lo que el proceso dejo.
 *
 *  NO SE CLASIFICA POR CODIGO DE SALIDA, y esto esta medido: `gh` sale 1 tanto
 *  con el 403 del plan gratuito como cuando no hay red, asi que un `switch` sobre
 *  el codigo mete "no puede tener compuertas" y "no pude mirar" en el mismo
 *  cajon — que es justamente la confusion que este bloque existe para no
 *  cometer. Lo que SI distingue es el cuerpo: el 403 trae un JSON con `status` y
 *  un `message`, y el corte de red no trae cuerpo ninguno.
 *
 *  Las cinco salidas reales, medidas contra la API el dia que se escribio esto:
 *    · 200  -> exit 0, stdout con el array JSON de rulesets, stderr vacio
 *    · 403  -> exit 1, stdout {"message":"Upgrade to GitHub Pro or make this
 *              repository public to enable this feature.","status":"403"}
 *    · 404  -> exit 1, stdout {"message":"Not Found","status":"404"}
 *    · red  -> exit 1, stdout VACIO, stderr con el error de transporte
 *    · auth -> exit 4, stdout vacio, stderr "please run:  gh auth login"
 *
 *  Recibe lo que dejo el proceso y no lo corre: asi el banco puede ver las siete
 *  ramas sin red, sin cuenta de GitHub y sin `gh` instalado. */
export function clasificarSondaDeRulesets({ presente = true, codigo = null, stdout = "", stderr = "", error = null } = {}) {
  if (!presente) return { estado: "sin-gh", detalle: "no encontre el ejecutable `gh` en el PATH", rulesets: [] };
  const salida = String(stdout ?? "");
  const err = String(stderr ?? "");
  const todo = `${salida}\n${err}`;

  // El estado HTTP, leido del cuerpo primero (que es la fuente) y del mensaje de
  // `gh` despues (que es una parafrasis, pero sirve cuando el cuerpo no vino).
  let http = null;
  const delCuerpo = /"status"\s*:\s*"?(\d{3})"?/.exec(salida);
  if (delCuerpo) http = Number.parseInt(delCuerpo[1], 10);
  else {
    const delMensaje = /\(HTTP (\d{3})\)/.exec(todo);
    if (delMensaje) http = Number.parseInt(delMensaje[1], 10);
  }

  const m = /"message"\s*:\s*"((?:[^"\\]|\\.)*)"/.exec(salida);
  let mensaje = "";
  if (m) {
    try {
      mensaje = JSON.parse(`"${m[1]}"`);
    } catch {
      mensaje = m[1];
    }
  } else {
    mensaje = err.trim().split("\n")[0] ?? "";
  }

  if (http === 403) {
    // El 403 de plan/visibilidad y el 403 de "no sos admin de este repo" son
    // cosas distintas: el primero es una MEDICION ("no puede") y el segundo es
    // una ausencia de medicion ("no pude mirar"). Colapsarlos afirmaria sobre un
    // repositorio que esta herramienta no llego a ver.
    if (/Upgrade to GitHub Pro|make this repository public/i.test(todo)) {
      return { estado: "sin-compuertas", detalle: mensaje || "Upgrade to GitHub Pro or make this repository public to enable this feature.", rulesets: [] };
    }
    return { estado: "no-se-sabe", detalle: `403, y no es el del plan gratuito: ${mensaje || "sin mensaje"}`, rulesets: [] };
  }
  if (http === 404) return { estado: "sin-repo", detalle: mensaje || "Not Found", rulesets: [] };
  if (http === 401) return { estado: "sin-auth", detalle: mensaje || "401", rulesets: [] };
  if (/gh auth login|GH_TOKEN environment variable|authentication token/i.test(todo)) {
    return { estado: "sin-auth", detalle: err.trim().split("\n")[0] || "gh no esta autenticado", rulesets: [] };
  }
  if (codigo === 0) {
    try {
      const cuerpo = JSON.parse(salida);
      if (Array.isArray(cuerpo)) {
        return {
          estado: "puede",
          detalle: `200, ${cuerpo.length} ruleset(s) hoy`,
          rulesets: cuerpo.map((r) => (r && typeof r.name === "string" ? r.name : "(sin nombre)")),
        };
      }
    } catch {
      // Salio 0 y lo que contesto no es la lista que documenta la API. No se
      // declara "puede" sobre eso: cae abajo, en "no se sabe".
    }
    return { estado: "no-se-sabe", detalle: "la sonda salio 0 y lo que contesto no es la lista de rulesets que documenta la API", rulesets: [] };
  }
  if (error || salida.trim() === "") {
    return { estado: "sin-red", detalle: error || err.trim().split("\n")[0] || `la sonda salio ${codigo} sin cuerpo`, rulesets: [] };
  }
  return { estado: "no-se-sabe", detalle: `la sonda salio ${codigo}: ${mensaje || err.trim() || salida.trim()}`, rulesets: [] };
}

/** Corre la sonda de verdad. Un GET y nada mas: SOLO LECTURA.
 *
 *  `shell: false` a proposito. En Windows `gh` se instala como `gh.exe`, que Node
 *  resuelve sin shell; y sin shell los dos valores que entran a la linea de
 *  comandos no pasan nunca por cmd.exe, que es donde Node concatena sin escapar
 *  (DEP0190). Ademas los dos se validan aca: main() ya los valido, pero esta
 *  funcion se exporta y no puede dar por hecho quien la llama.
 *
 *  Y SE VALIDAN CONTRA LA FORMA DE GITHUB, no contra FORMATOS.PROYECTO. No es un
 *  descuido: FORMATOS.PROYECTO exige kebab-case en minusculas, que es la
 *  CONVENCION del marco para un proyecto nuevo, mientras que lo que esta funcion
 *  necesita es que el valor sea seguro como segmento de una ruta. La diferencia
 *  no es teorica —el propio repositorio del marco se llama `Projects`, con
 *  mayuscula— y con el patron del marco esta sonda contestaria "no se sabe"
 *  sobre repositorios que existen. Un guard que se equivoca sobre el caso real
 *  no es un guard: es ruido que ensena a ignorarlo. */
const FORMA_DE_REPO_EN_GITHUB = /^(?!\.{1,2}$)[A-Za-z0-9._-]{1,100}$/;

export function sondarProteccion({ org, proyecto, correr = correrGh } = {}) {
  if (!FORMATOS.ORG.patron.test(String(org ?? "")) || !FORMA_DE_REPO_EN_GITHUB.test(String(proyecto ?? ""))) {
    return {
      estado: "no-se-sabe",
      detalle: `no se sondeo: ${JSON.stringify(`${org}/${proyecto}`)} no tiene la forma de un <org>/<repo> de GitHub`,
      rulesets: [],
    };
  }
  return clasificarSondaDeRulesets(correr({ org, proyecto }));
}

/** El GET, y nada mas que el GET.
 *
 *  El vector va ESCRITO ACA, entero y a la vista, y no armado en otro lado y
 *  pasado como variable: el banco de esta herramienta audita los argumentos de
 *  cada `execFileSync` contra una lista de residuos declarados, y un vector que
 *  llega como identificador se le escapa a esa auditoria sin poner nada en rojo.
 *  El unico residuo de este es la ruta del repositorio, cuyas dos piezas
 *  `sondarProteccion` acaba de validar contra formas que no admiten ni un
 *  metacaracter de shell — y que ademas no pasan por ninguno, porque esta
 *  invocacion va con `shell: false`. */
function correrGh({ org, proyecto }) {
  try {
    const stdout = execFileSync("gh", ["api", `repos/${org}/${proyecto}/rulesets`], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: TIMEOUT_DE_LA_SONDA,
      shell: false,
    });
    return { presente: true, codigo: 0, stdout, stderr: "", error: null };
  } catch (e) {
    if (e?.code === "ENOENT") return { presente: false, codigo: null, stdout: "", stderr: "", error: "ENOENT" };
    const vencio = e?.killed === true;
    return {
      presente: true,
      codigo: typeof e?.status === "number" ? e.status : null,
      stdout: String(e?.stdout ?? ""),
      stderr: String(e?.stderr ?? ""),
      error: vencio ? `la sonda no contesto en ${TIMEOUT_DE_LA_SONDA} ms` : typeof e?.status === "number" ? null : (e?.message ?? "fallo"),
    };
  }
}

/** El Markdown que se escribe en el documento del proyecto nuevo.
 *
 *  Puro sobre `{ estado, detalle, rulesets, org, proyecto, fecha }`: no mide, no
 *  lee disco y no imprime, asi que el banco puede afirmar el texto de las siete
 *  ramas sin red. Markdown CON acentos, que es la convencion de la documentacion
 *  del marco (los comentarios de YAML son los que van sin).
 *
 *  Devuelve DOS cosas porque hay dos cirugias: `lineas` es el bloque medido que
 *  reemplaza al recuadro 🕳️, y `frase` es la que reemplaza a la afirmacion
 *  "Se encienden ahora. Son las cuatro que el repo de referencia tiene
 *  funcionando" — que es falsa cuando el repositorio no puede tenerlas. */
export function bloqueDeProteccion({ estado, detalle = "", rulesets = [], org, proyecto, fecha }) {
  const dia = fecha ?? new Date().toISOString().slice(0, 10);
  const sonda = `gh api repos/${org}/${proyecto}/rulesets`;
  const l = [];
  const pie = () => {
    l.push("");
    l.push("Esta sección la escribió `projects init` **midiendo**, no copiándola de una plantilla.");
    l.push("Cuando cambie el plan, la visibilidad o el ruleset, volvé a correr la sonda de arriba y");
    l.push("actualizá esto con la fecha: un documento de estado que nadie vuelve a medir es una");
    l.push("afirmación vencida.");
  };

  if (estado === "puede") {
    l.push(`### 🟢 Este repositorio **sí puede** tener protección de rama — medido el ${dia}`);
    l.push("");
    l.push("```");
    l.push(`$ ${sonda}`);
    l.push(`→ ${detalle}`);
    l.push("```");
    l.push("");
    if (rulesets.length === 0) {
      l.push("**Hoy no hay ninguno activo.** Los 🔴 de la tabla de abajo son 🔴 de verdad: hasta que");
      l.push("apliques las cuatro reglas, `main` acepta push directo y ningún check es obligatorio");
      l.push("para integrar.");
    } else {
      l.push(`**Hoy hay ${rulesets.length}**: ${rulesets.map((n) => `\`${n}\``).join(", ")}. Que existan rulesets no dice que sean`);
      l.push("estos: contrastá regla por regla contra la tabla de abajo antes de pasar un 🔴 a 🟢.");
    }
    l.push("");
    l.push("**Aplicarlas es un acto humano y esta herramienta no lo hace por vos**, ni te lo preguntó");
    l.push("al pasar: un programa con permiso para editar la protección de `main` es un programa con");
    l.push("permiso para quitarla. Los pasos por la interfaz están más abajo, en «Aplicarla desde");
    l.push("cero». Para contrastar el resultado desde la terminal:");
    l.push("");
    l.push("```bash");
    l.push(`${sonda} --jq '.[] | "\\(.id)  \\(.name)  \\(.enforcement)"'`);
    l.push("```");
    l.push("");
    l.push("**Y no antes de que el CI haya corrido una vez:** el check `ci-ok` no aparece en la lista");
    l.push("de checks disponibles del ruleset hasta que exista una corrida que lo haya reportado. El");
    l.push("bootstrap entra a `main` por push directo; la protección se aplica después.");
    pie();
    return {
      lineas: l,
      frase: [
        "**Las cuatro que hay que encender.** Este repositorio puede tenerlas —está medido acá",
        "arriba— y alcanzan para que nada entre a `main` sin pasar por un PR verde:",
      ],
    };
  }

  if (estado === "sin-compuertas") {
    l.push(`### 🔴 Este repositorio **no puede** tener protección de rama hoy — medido el ${dia}`);
    l.push("");
    l.push("```");
    l.push(`$ ${sonda}`);
    l.push(`→ 403 ${detalle}`);
    l.push("```");
    l.push("");
    l.push("GitHub **no ofrece protección de rama en repositorios privados del plan gratuito**. No es");
    l.push("un ajuste que falte marcar ni un permiso que falte pedir: con este plan y esta");
    l.push("visibilidad, el endpoint no existe. Las cuatro reglas de la tabla de abajo describen lo");
    l.push("que hay que aplicar **cuando se pueda**, y hasta entonces sus 🔴 son 🔴.");
    l.push("");
    l.push("**Qué significa mientras tanto, escrito sin eufemismos.** `main` acepta push directo y");
    l.push("force-push de cualquiera con permiso de escritura, se puede borrar, y ningún check es");
    l.push("obligatorio para integrar. Lo único que queda es el hook de cliente");
    l.push("(`herramientas/hooks/pre-push`), que cada quien tiene que instalar en su clon y que se");
    l.push("saltea con `--no-verify`. En cualquier informe de estado esto se escribe **«no hay");
    l.push("compuerta»**, nunca «está pendiente»: pendiente es lo que se puede hacer y todavía no se");
    l.push("hizo.");
    l.push("");
    l.push("**Las tres salidas, y hay que elegir una:**");
    l.push("");
    // LA TABLA VA YA ALINEADA, y no es cosmetica: el formateador del andamio
    // alinea las tablas de markdown por ancho, asi que una escrita a ojo deja el
    // documento en rojo para `format:check` — que es el mismo defecto por el que
    // el arranque corre `pnpm format` antes de `verificar`. Estas cinco lineas
    // son la salida literal del formateador sobre este mismo contenido: si
    // alguna celda cambia de texto, hay que volver a pasarle el formateador y
    // copiar el resultado.
    l.push("| Salida                                              | Qué habilita                                                                                                                               | Qué cuesta                                                                                                                            |");
    l.push("| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |");
    l.push("| **GitHub Pro** en la cuenta personal dueña del repo | Rulesets en los repos privados de esa cuenta                                                                                               | Suscripción mensual por usuario. Es la salida más barata si el repo se queda donde está                                               |");
    l.push("| **Mover el repo a una organización** con plan Team  | Rulesets en los repos privados de la organización, y además equipos de verdad — que es lo que `CODEOWNERS` necesita para asignar a alguien | Suscripción por usuario y mes de la organización, más el trabajo de transferir el repo y rehacer secrets, variables y permisos        |");
    l.push("| **Hacer el repo público**                           | Rulesets sin costo, con el plan que ya tenés                                                                                               | El código, los issues y los PRs pasan a ser públicos. Antes hay que revisar el historial completo: lo que se publica no se despublica |");
    l.push("");
    l.push("Los precios los publica GitHub y cambian, así que acá no van copiados: esta tabla dice");
    l.push("**qué** hay que decidir. El número de hoy está en <https://github.com/pricing>.");
    l.push("");
    l.push("Cuando cambies de plan o de visibilidad, volvé a correr la sonda de arriba. En cuanto");
    l.push("conteste `200`, aplicá las cuatro reglas y actualizá esta sección con la fecha.");
    pie();
    return {
      lineas: l,
      frase: [
        "**Las cuatro que habría que encender** — y que este repositorio **no puede** tener hoy",
        "(medido acá arriba, con la respuesta textual de GitHub). Sus 🔴 van a seguir en 🔴 hasta que",
        "cambie el plan o la visibilidad. Alcanzan para que nada entre a `main` sin pasar por un PR",
        "verde:",
      ],
    };
  }

  // Los cinco caminos de "no pude mirar". Comparten forma a proposito: lo que
  // tienen que dejar claro es lo mismo, y es que esta herramienta NO afirma nada
  // sobre este repositorio.
  const titulos = {
    "sin-gh": "no encontré `gh` en el PATH",
    "sin-auth": "`gh` no está autenticado",
    "sin-red": "no se llegó a la API de GitHub",
    "sin-repo": `GitHub no conoce (todavía) a \`${org}/${proyecto}\``,
    "no-se-sabe": "la sonda contestó algo que esta herramienta no sabe leer",
  };
  const comoSeDestraba = {
    "sin-gh": ["Instalá GitHub CLI (<https://cli.github.com>), corré `gh auth login`, y después la sonda de arriba."],
    "sin-auth": ["Corré `gh auth login` y después la sonda de arriba."],
    "sin-red": [
      "Es un problema de red o de proxy, no del repositorio. Reintentá la sonda de arriba desde una",
      "máquina con salida a `api.github.com`.",
    ],
    "sin-repo": [
      "Lo más probable es que el repositorio todavía no exista: `projects init` corre **antes** del",
      "primer push. También puede ser que el nombre no sea ese, o que la cuenta autenticada no lo",
      "vea. Volvé a correr la sonda de arriba después del push fundacional.",
    ],
    "no-se-sabe": [
      "Copiá la salida tal cual al reportarlo: esta herramienta sabe leer 200, 403, 404, la falta de",
      "autenticación y el corte de red, y esto no fue ninguno de los cinco.",
    ],
  };
  l.push(`### ⚪ No se pudo medir: ${titulos[estado] ?? estado} — intentado el ${dia}`);
  l.push("");
  l.push("```");
  l.push(`$ ${sonda}`);
  l.push(`→ ${detalle || "sin detalle"}`);
  l.push("```");
  l.push("");
  l.push("**«No pude mirar» no es «no hay problema».** Esta herramienta no llegó a ver este");
  l.push("repositorio, así que **no afirma nada** sobre su protección de rama: ni que la tenga, ni");
  l.push("que pueda tenerla. Hasta que la sonda conteste, el estado de la protección de `main` acá es");
  l.push("**desconocido**, y así hay que escribirlo en cualquier informe.");
  l.push("");
  for (const linea of comoSeDestraba[estado] ?? []) l.push(linea);
  l.push("");
  l.push("Y hay una respuesta concreta que conviene tener leída de antemano, porque el paso a paso no la");
  l.push("contemplaba. Si la sonda contesta");
  l.push("**403 «Upgrade to GitHub Pro or make this repository public»**, no es que este documento esté");
  l.push("desactualizado: es que GitHub no ofrece protección de rama en repositorios privados del plan");
  l.push("gratuito, y hay que elegir entre GitHub Pro, mover el repo a una organización con plan Team, o");
  l.push("hacerlo público.");
  pie();
  return {
    lineas: l,
    frase: [
      "**Las cuatro que hay que encender** si este repositorio puede tenerlas — y eso **no se pudo",
      "medir** (está acá arriba, con el motivo). Alcanzan para que nada entre a `main` sin pasar por",
      "un PR verde:",
    ],
  };
}

/** El aviso corto para la terminal. Quien corre la herramienta tiene que
 *  enterarse SIN abrir el documento: el 403 medido no es una nota al pie, es la
 *  diferencia entre tener compuerta y no tenerla. */
export function avisoDeProteccion({ estado, detalle, org, proyecto }) {
  if (estado === "puede") {
    return `PROTECCION DE MAIN: medido — ${org}/${proyecto} SI admite rulesets (${detalle}). El estado real quedo escrito en ${RUTA_PROTECCION}; aplicarlas es un acto humano y esta herramienta no lo hace`;
  }
  if (estado === "sin-compuertas") {
    return (
      `::warning::PROTECCION DE MAIN: medido — ${org}/${proyecto} NO puede tener proteccion de rama hoy. ` +
      `La sonda de solo lectura contesto 403: "${detalle}". GitHub no la ofrece en repos privados del plan ` +
      `gratuito, asi que este repo nace SIN compuerta del lado del servidor: nada impide un push directo a ` +
      `main. Las tres salidas —GitHub Pro, una organizacion con plan Team, o hacer el repo publico— quedaron ` +
      `escritas con su costo en ${RUTA_PROTECCION}`
    );
  }
  return (
    `::warning::PROTECCION DE MAIN: NO se pudo medir (${estado}: ${detalle}). "No pude mirar" no es "no hay ` +
    `problema": esta herramienta no afirma nada sobre la proteccion de ${org}/${proyecto}. Quedo escrito asi ` +
    `en ${RUTA_PROTECCION}, con como destrabarlo`
  );
}

/** Mete el bloque medido en el documento del proyecto nuevo.
 *
 *  DOS CIRUGIAS ANCLADAS Y UN AGREGADO, y ninguna reescribe el documento entero:
 *  lo que ese archivo explica bien —por que el check requerido es `ci-ok`, por
 *  que las cuatro diferidas se dejan apagadas, los pasos de la interfaz— vive en
 *  el andamio, y copiarlo aca seria una segunda declaracion que diverge.
 *
 *   1. El recuadro 🕳️ que manda "aplicá las cuatro reglas" se REEMPLAZA por el
 *      bloque medido. Es la instruccion que mandaba de cabeza contra el 403, y
 *      esta justo donde tiene que ir la medicion: arriba de las tablas.
 *   2. La frase que afirma "Se encienden ahora. Son las cuatro que el repo de
 *      referencia tiene funcionando" se reemplaza por la del estado medido. Esa
 *      frase es falsa en el repo de referencia, y lo es en cualquiera que no
 *      pueda tener rulesets.
 *   3. Al final se agrega que hacer cuando la sonda de contraste conteste 403,
 *      que esa seccion no contemplaba: solo contemplaba "si la salida no
 *      coincide con la tabla".
 *
 *  QUE PASA SI UN ANCLA NO ESTA. Se AVISA y el bloque medido se escribe igual,
 *  arriba de todo. El documento puede cambiar de redaccion en el andamio, y la
 *  respuesta correcta a eso no es dejar al proyecto nuevo sin la medicion —seria
 *  cambiar un fail-open por otro—. Lo que no se hace nunca es callarse: cada
 *  ancla que no aparecio sale por `avisos`, para que la divergencia se vea. */
export function insertarProteccionMedida(texto, { lineas: bloque, frase }) {
  const lineas = String(texto).split("\n");
  const avisos = [];

  // 1. El recuadro 🕳️: la corrida contigua de lineas que empiezan con ">" que
  //    contiene el emoji.
  const i = lineas.findIndex((l) => /^>/.test(l) && l.includes("🕳️"));
  if (i === -1) {
    avisos.push(`no encontre el recuadro 🕳️ en ${RUTA_PROTECCION}, asi que el bloque medido va arriba de todo. Si el andamio le cambio la redaccion, hay que reapuntar esta ancla en herramientas/projects-init.mjs`);
    const h1 = lineas.findIndex((l) => l.startsWith("# "));
    lineas.splice(h1 === -1 ? 0 : h1 + 1, 0, "", ...bloque);
  } else {
    let j = i;
    while (j < lineas.length && /^>/.test(lineas[j])) j++;
    lineas.splice(i, j - i, ...bloque);
  }

  // 2. La frase que afirma cuatro reglas funcionando.
  const k = lineas.findIndex((l) => l.startsWith("**Se encienden ahora.**"));
  if (k === -1) {
    avisos.push(`no encontre la frase «Se encienden ahora.» en ${RUTA_PROTECCION}: quedo la que trajera el andamio, y si afirma un estado no medido hay que corregirla ahi`);
  } else {
    let fin = k;
    while (fin < lineas.length && lineas[fin].trim() !== "") fin++;
    lineas.splice(k, fin - k, ...frase);
  }

  // 3. El agregado del final, que no necesita ancla y por eso no puede fallar.
  //
  // Las lineas vacias del final se sacan ANTES de agregar. Sin esto el documento
  // quedaba con un renglon en blanco de mas y —porque el texto original termina
  // en salto— sin salto final: dos cosas que el formateador del andamio corrige,
  // o sea dos formas de que `format:check` salga rojo en el primer CI de un repo
  // recien nacido por algo que escribio esta herramienta.
  while (lineas.length && lineas[lineas.length - 1].trim() === "") lineas.pop();
  lineas.push(
    "",
    "> **Y si esa sonda contesta 403 «Upgrade to GitHub Pro or make this repository public»**, la",
    "> lectura no es «el documento está desactualizado»: es que este repositorio, con su plan y su",
    "> visibilidad de hoy, no puede tener rulesets. Está medido y explicado arriba, en el bloque que",
    "> escribió `projects init`.",
    "",
  );
  return { texto: lineas.join("\n"), avisos };
}

/** Mide y escribe, en el destino ya instanciado. Devuelve lo medido para que la
 *  salida de la terminal y el resumen final digan lo MISMO que el documento.
 *
 *  El archivo TIENE que estar: `faltantesDeCopia` ya garantizo que todo el
 *  andamio aterrizo, asi que si no esta es que el andamio dejo de repartirlo — y
 *  entonces esta herramienta no puede cumplir lo que promete. Eso es rojo, no
 *  aviso: seguir seria entregar un repo sin ninguna linea escrita sobre su
 *  proteccion de rama, que es el estado del que nadie se entera. */
export function escribirProteccionMedida(destino, medido) {
  const abs = path.join(destino, ...RUTA_PROTECCION.split("/"));
  let texto;
  try {
    texto = fs.readFileSync(abs, "utf8");
  } catch (e) {
    return { ok: false, error: `no pude leer ${RUTA_PROTECCION} en el destino (${e.code ? `${e.code} — ` : ""}${e.message})`, avisos: [] };
  }
  const r = insertarProteccionMedida(texto, bloqueDeProteccion(medido));
  try {
    fs.writeFileSync(abs, r.texto, "utf8");
  } catch (e) {
    return { ok: false, error: `no pude escribir ${RUTA_PROTECCION} en el destino (${e.code ? `${e.code} — ` : ""}${e.message})`, avisos: r.avisos };
  }
  return { ok: true, error: null, avisos: r.avisos };
}

// ─────────────────────────── El programa ───────────────────────────

const EJEMPLO = {
  PROYECTO: "people-agenda",
  // ORG es la ORG de GitHub, no un equipo dentro de ella: se interpola en
  // `uses: {{ORG}}/Projects/...`, o sea en la coordenada con la que GitHub
  // resuelve el marco. Una pasada automatica de anonimizado dejo aca el slug del
  // equipo del PO —el mismo que `gh api orgs/<org>/teams/<slug>/members` usa—, y
  // con eso el ejemplo apuntaba a un repo que no existe. EQUIPO_PO de mas abajo
  // es el que SI es un slug de equipo, y por eso son dos valores distintos.
  ORG: "Ejemplo-Org",
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
  // Los perfiles del ejemplo llevaban un nombre con ESPACIO. Es exactamente el
  // valor que FORMATOS.PERFIL_DEV rechaza, y por un motivo concreto: viaja dentro
  // del patron `Bash(AWS_PROFILE={{PERFIL_DEV}} terraform plan *)` de la
  // allowlist de .claude/settings.json, donde un espacio de mas no rompe el JSON,
  // rompe el patron — y una entrada de allowlist que no matchea nada no avisa.
  PERFIL_DEV: "ejemplo-dev",
  PERFIL_PROD: "ejemplo-prod",
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
  const o = { herramientas: true, arranque: true, forzar: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--valores") o.valores = valorDeBandera(argv, ++i, "--valores");
    else if (argv[i] === "--destino") o.destino = valorDeBandera(argv, ++i, "--destino");
    else if (argv[i] === "--sin-herramientas") o.herramientas = false;
    else if (argv[i] === "--sin-arranque") o.arranque = false;
    else if (argv[i] === "--forzar") o.forzar = true;
    else if (argv[i] === "--ejemplo") o.ejemplo = true;
    else if (argv[i] === "--version-openspec") o.versionOpenspec = valorDeBandera(argv, ++i, "--version-openspec");
    // `--help` y `-h` son lo PRIMERO que tipea cualquiera frente a una
    // herramienta que no conoce, y hasta este cambio caian en el `throw` de
    // abajo: la respuesta a la pregunta mas basica era un error. Ahora imprimen
    // el mismo texto que el uso y salen 0, porque pedir ayuda no es un fallo.
    else if (argv[i] === "--help" || argv[i] === "-h") o.ayuda = true;
    else throw new Error(`argumento desconocido: ${argv[i]}`);
  }
  return o;
}

/** El uso, en UN solo lugar: lo imprime `--help` (por stdout, que es donde se lo
 *  espera cuando se lo pide) y lo imprime el error de invocacion incompleta (por
 *  stderr, que es donde va un diagnostico). Dos copias del texto divergen, y la
 *  que se pudre es siempre la que nadie mira. */
function lineasDeUso() {
  return [
    "uso: node herramientas/projects-init.mjs --valores <ruta.json> --destino <ruta>",
    "     node herramientas/projects-init.mjs --ejemplo > valores.json",
    "     node herramientas/projects-init.mjs --help",
    "",
    "  --valores <ruta.json>      los valores del proyecto. `--ejemplo` imprime el esqueleto",
    "  --destino <ruta>           la raiz del repo nuevo, que tiene que existir",
    "  --sin-herramientas         no corre `openspec init` ni el render de la constitucion",
    "  --sin-arranque             no instala, no formatea y no verifica el proyecto nuevo:",
    "                             deja esos cuatro comandos como tarea humana, que es como",
    "                             se hacia antes. Util cuando no hay red o se quiere revisar",
    "                             el arbol escrito antes de bajar una sola dependencia",
    "  --forzar                   sobreescribe un destino que ya tiene archivos del andamio",
    "  --version-openspec <x.y.z> pin del CLI de OpenSpec cuando no se puede leer del default de",
    "                             `version_openspec` en marco-ci.yml. Version EXACTA (0.9.4), no",
    "                             un rango: el valor se concatena en la linea de comandos de npx",
  ];
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

/** Las rutas que el render de la constitucion DICE haber escrito, leidas del
 *  archivo de GITHUB_OUTPUT que esta herramienta le presta.
 *
 *  Por que no se comparan las rutas del destino antes y despues, que es lo
 *  primero que uno escribe: el modo escribir de actions/constitucion es
 *  IDEMPOTENTE —`escribirArchivo` reescribe siempre las mismas rutas, sin mirar
 *  si el contenido cambio—, asi que una segunda corrida no deja ninguna ruta
 *  nueva. Medido: `--forzar` sobre un destino ya instanciado salia 1 con "no
 *  escribio un solo archivo nuevo" y mandaba a revisar las `superficies` de
 *  .projects-valores.json, que no tenian nada que ver. Y el mtime tampoco
 *  sirve: hay sistemas de archivos con resolucion de un segundo, y las dos
 *  fotos se sacan con milisegundos de diferencia.
 *
 *  `artefactos` no es prosa que se parsea: es un output DECLARADO de la action
 *  (actions/constitucion/action.yml, `outputs.artefactos`), o sea la misma
 *  interfaz que consume el workflow. Quien la cambie cambia el contrato de la
 *  action, no un detalle interno. Y las rutas que declara igual se comprueban
 *  en disco: esto dice DONDE mirar, no reemplaza el mirar. */
export function rutasDelRender(textoDeOutputs) {
  const lineas = String(textoDeOutputs).split(/\r?\n/).filter((l) => l.startsWith("artefactos="));
  if (lineas.length === 0) return [];
  return lineas[lineas.length - 1]
    .slice("artefactos=".length)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

async function main(argv) {
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
    // Y el uso a continuacion: el marco tiene escrito que cada error trae su
    // arreglo, y el arreglo de "argumento desconocido" es la lista de los que si
    // se aceptan. Antes esta rama ni siquiera llegaba a imprimirse para `--help`.
    for (const linea of lineasDeUso()) console.error(linea);
    return 2;
  }
  if (o.ayuda) {
    for (const linea of lineasDeUso()) process.stdout.write(`${linea}\n`);
    return 0;
  }
  if (o.ejemplo) {
    process.stdout.write(JSON.stringify(EJEMPLO, null, 2) + "\n");
    return 0;
  }
  if (!o.valores || !o.destino) {
    for (const linea of lineasDeUso()) console.error(linea);
    return 2;
  }

  // Los 21 valores tienen que tener una forma declarada, y se comprueba ANTES de
  // leer el archivo de la persona: un desfase entre REQUERIDOS y FORMATOS es un
  // defecto de esta herramienta, no de quien la corre, y el diagnostico tiene
  // que decir eso.
  const sinFormato = marcadoresSinFormato();
  if (sinFormato.length) {
    console.error(
      `::error::${sinFormato.length} valor(es) de REQUERIDOS no tienen forma declarada en FORMATOS: ` +
        `${sinFormato.join(", ")}. Sin su fila quedan validados solo por "no esta vacio", que es el regimen ` +
        `con el que un salto de linea aterrizaba entero en CODEOWNERS. Agregales la fila (y la de ` +
        `plantilla/README.md seccion 2) en el mismo cambio.`,
    );
    return 1;
  }

  // El pin de la bandera se revisa DOS veces con la misma regla: aca, antes de
  // leer un solo archivo, para que un valor mal formado no cueste el andamio
  // entero escrito y un destino a medias; y otra vez donde se resuelve, que es lo que
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

  const raizMarco = path.resolve(ESTE_DIRECTORIO, "..");
  const raizAndamio = path.join(raizMarco, "plantilla");
  if (!fs.existsSync(raizAndamio)) {
    console.error(`::error::no encontre el andamio en ${raizAndamio}. Corre esto desde un clon del repo del marco`);
    return 1;
  }

  // EL OTRO archivo del marco del que esta corrida depende, comprobado ACA y no
  // donde se usa. Solo se comprobaba `plantilla/`; `marco-ci.yml` —de donde sale
  // el pin de OpenSpec— se leia recien despues de escribir el andamio entero,
  // y sin try/catch: en un clon parcial (sparse checkout, un fork sin
  // .github/workflows/, esta herramienta copiada fuera de su arbol) el destino
  // quedaba ESCRITO ENTERO y el proceso moria con un volcado de node:fs. O sea
  // los dos modos de falla que el encabezado de este archivo declara cerrados
  // —traza del runtime, y destino a medias sin decirlo— reintroducidos por una
  // lectura sin guard. Medido asi: un clon con herramientas/ + plantilla/ +
  // actions/ y SIN .github/workflows/marco-ci.yml.
  //
  // La condicion es la de la necesidad real: el archivo solo hace falta si se
  // van a correr las herramientas Y el pin no vino por bandera.
  const rutaMarcoCi = path.join(raizMarco, ".github/workflows/marco-ci.yml");
  if (o.herramientas && !o.versionOpenspec && !fs.existsSync(rutaMarcoCi)) {
    console.error(
      `::error::no encontre ${rutaMarcoCi}. De ahi sale el pin del CLI de OpenSpec (el \`default\` del input ` +
        `\`version_openspec\`), y sin el este arranque no puede correr \`openspec init\`. NO se escribio nada. ` +
        `Dos salidas: pasa el pin a mano con --version-openspec <x.y.z>, o corre esto desde un clon COMPLETO ` +
        `del repo del marco (un clon parcial o un fork sin .github/workflows/ no trae ese archivo). Si el ` +
        `arranque no necesita las dos herramientas, --sin-herramientas tampoco lo pide.`,
    );
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
  // La pregunta se hace por el nombre de DESTINO: lo que decide si se pisa
  // trabajo ajeno es como se va a llamar el archivo en el repo nuevo, no como
  // se llama en el andamio. Escrita con el nombre de origen, el README del
  // proyecto —que aterriza como README.md— no aparecia en este censo y se
  // pisaba sin --forzar el README que ese repo ya tuviera.
  const yaTiene = archivosDelAndamio(raizAndamio)
    .map(destinoDe)
    .filter((r) => fs.existsSync(path.join(o.destino, ...r.split("/"))));
  if (yaTiene.length && !o.forzar) {
    console.error(`::error::el destino ya tiene ${yaTiene.length} archivo(s) del andamio. Se aborta para no sobreescribir trabajo:`);
    for (const r of yaTiene.slice(0, 8)) console.error(`  - ${r}`);
    if (yaTiene.length > 8) console.error(`  ... y ${yaTiene.length - 8} mas`);
    console.error("Si de verdad queres sobreescribirlos: --forzar");
    return 1;
  }

  // ── Instanciar ──
  //
  // ESTA es la unica rama donde el destino puede quedar a medias, y hasta este
  // cambio era tambien la unica que no lo decia: `instanciar` se llamaba sin
  // try/catch y `main` tambien, asi que un EACCES a mitad de la copia salia
  // como un volcado de `node:fs` con la traza del runtime, stdout vacio y N
  // archivos escritos en un destino que el encabezado de este archivo promete
  // intacto. En Windows no es la rama rara: EPERM por antivirus o por archivo
  // abierto, y OneDrive sincronizando Documents. Y el reintento chocaba con el
  // guard del destino ocupado, cuyo unico camino ofrecido es `--forzar`: la
  // bandera que apaga la proteccion contra pisar trabajo.
  //
  // Ahora se revierte lo que ESTA corrida creo y se dice exactamente que quedo.
  let r;
  try {
    r = instanciar({ raizAndamio, destino: o.destino, valores });
  } catch (e) {
    const vuelta = revertir(o.destino, e);
    console.error(
      e.relQueFallo
        ? `::error::la copia se corto en ${e.relQueFallo}: ${e.code ? `${e.code} — ` : ""}${e.message}`
        : `::error::la copia no llego a empezar: ${e.code ? `${e.code} — ` : ""}${e.message}`,
    );
    // El estado del destino se DICE, y se dice distinto segun lo que quedo: si
    // sobrevive algo de esta corrida, prometer "reintenta sin --forzar" seria
    // mandar a chocar de nuevo con el guard del destino ocupado.
    const destinoLimpio = vuelta.sobreescritos.length === 0 && vuelta.noSePudo.length === 0;
    console.error(
      destinoLimpio
        ? `Se revirtieron los ${vuelta.borrados.length} archivo(s) que esta corrida habia creado, asi que el ` +
            `destino no queda a medias y NO hace falta --forzar para reintentar.`
        : `Se revirtieron los ${vuelta.borrados.length} archivo(s) que esta corrida habia creado, pero el ` +
            `destino NO queda como estaba: mira lo que sigue antes de reintentar.`,
    );
    if (vuelta.sobreescritos.length) {
      console.error(
        `Lo que NO se pudo deshacer, porque ya existia antes y esta corrida lo piso con --forzar ` +
          `(su contenido viejo no lo tuvo nunca esta herramienta): ${vuelta.sobreescritos.length} archivo(s).`,
      );
      for (const rel of vuelta.sobreescritos.slice(0, 8)) console.error(`  - ${rel}`);
      if (vuelta.sobreescritos.length > 8) console.error(`  ... y ${vuelta.sobreescritos.length - 8} mas`);
      console.error("Esos los recuperas con `git checkout --` si el destino es un repo con esos archivos commiteados.");
    }
    if (vuelta.noSePudo.length) {
      console.error(`Y esto no se pudo borrar; hay que sacarlo a mano antes de reintentar:`);
      for (const linea of vuelta.noSePudo.slice(0, 8)) console.error(`  - ${linea}`);
    }
    if (e.code === "EPERM" || e.code === "EACCES" || e.code === "EBUSY") {
      console.error(
        "Causa habitual en Windows: el antivirus o un editor con el archivo abierto, o el destino dentro de " +
          "una carpeta que OneDrive esta sincronizando. Cerra el editor, pausa la sincronizacion y reintenta.",
      );
    }
    return 1;
  }
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
  const sobreviven = marcadoresQueSobreviven(o.destino, r.escritosEnDestino);
  if (sobreviven.length) {
    console.error(`::error::quedaron ${sobreviven.length} marcador(es) sin sustituir:`);
    for (const s of sobreviven.slice(0, 10)) console.error(`  - ${s.archivo}:${s.linea} ${s.marcador}`);
    return 1;
  }
  console.log("cero marcadores sobrevivientes");

  // ── El registro de valores que le queda al proyecto ──
  //
  // El desfase que este aviso nacio para reportar —el ANDAMIO sin declarar una
  // de las claves— hoy no esta: plantilla/.projects-valores.json declara las de
  // REQUERIDOS. Pero eso NO lo sostiene main(): ningun camino de esta funcion
  // lee el registro del andamio. Lo sostiene el banco del marco
  // (pruebas/andamio/tabla-de-valores.test.mjs, via clavesQueElRegistroNoDeclara),
  // y el porque esta en el JSDoc de esa funcion: un andamio minimo sin registro
  // es un caso legitimo y romperle la corrida a quien no hizo nada mal seria
  // peor que el desfase.
  // Lo que si mira main() es el otro lado, que aquel banco no puede ver: el
  // archivo del DESTINO, releido del disco. Ahi el defecto puede no ser del
  // andamio —un destino preexistente con su propio archivo, una escritura a
  // medias, un JSON que otro dejo roto— y por eso es AVISO: el repo nuevo
  // funciona igual (los valores SI viajaron a los archivos que los usan) y
  // romper una corrida ya escrita por algo que esta herramienta no controla
  // mandaria a la persona a un callejon.
  for (const linea of avisosDelRegistroDeValores(o.destino)) console.error(linea);

  // ── El diagnostico de la proteccion de main: se MIDE y se escribe ──
  //
  // Va aca y no al final por dos motivos. Uno: el documento del proyecto nuevo
  // ya esta escrito y todavia no lo leyo nadie, asi que corregirlo ahora es
  // corregirlo antes de que exista una copia con la afirmacion falsa. Dos: si el
  // arranque sale rojo, main() vuelve con 1 y no imprime las tareas humanas —
  // pero el documento ya quedo con el estado REAL, que es justo lo que hay que
  // leer despues de un rojo. Ver el bloque de arriba para el defecto que cierra.
  const proteccion = sondarProteccion({ org: valores.ORG, proyecto: valores.PROYECTO });
  const escrituraDeProteccion = escribirProteccionMedida(o.destino, { ...proteccion, org: valores.ORG, proyecto: valores.PROYECTO });
  if (!escrituraDeProteccion.ok) {
    console.error(
      `::error::${escrituraDeProteccion.error}. Esta herramienta promete escribir en ${RUTA_PROTECCION} el estado ` +
        `REAL de la proteccion de rama de este repositorio, medido; sin ese archivo no puede, y entregar el repo ` +
        `callada dejaria el unico documento de estado de la compuerta sin escribir. El andamio YA quedo escrito ` +
        `en ${o.destino}: revisa que plantilla/${RUTA_PROTECCION} exista y volve a correr con --forzar.`,
    );
    return 1;
  }
  for (const aviso of escrituraDeProteccion.avisos) console.error(`::warning::${aviso}`);
  {
    const linea = avisoDeProteccion({ ...proteccion, org: valores.ORG, proyecto: valores.PROYECTO });
    if (linea.startsWith("::warning::")) console.error(linea);
    else console.log(linea);
  }

  // ── Las dos herramientas que el andamio no puede traer ──
  if (o.herramientas) {
    // El guard de mas arriba ya exigio que el archivo EXISTA antes de escribir
    // nada; esto cubre lo que existsSync no cubre —permisos, un directorio con
    // ese nombre, un enlace roto— para que la lectura no vuelva a ser el unico
    // punto de este bloque que sale por volcado del runtime. Y no se lee cuando
    // el pin vino por bandera: ahi el archivo no hace falta.
    let pin = o.versionOpenspec;
    if (!pin) {
      let marcoCi;
      try {
        marcoCi = fs.readFileSync(rutaMarcoCi, "utf8");
      } catch (e) {
        console.error(
          `::error::no pude leer ${rutaMarcoCi}, de donde sale el pin de OpenSpec: ` +
            `${e.code ? `${e.code} — ` : ""}${e.message}. El andamio YA quedo escrito en ${o.destino}; ` +
            `volve a correr con --forzar y --version-openspec <x.y.z>.`,
        );
        return 1;
      }
      pin = pinOpenspecDe(marcoCi);
    }
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
    // La foto de openspec/ ANTES, que es lo que faltaba: preguntar despues "hay
    // algo en openspec/?" falla ABIERTO justo donde importa. El destino no
    // siempre nace vacio —un reintento con --forzar, o la skill de adopcion
    // apuntada a un repo que ya usaba OpenSpec— y ahi el CLI que miente pasaba
    // sin ruido, porque el contenido que la pregunta encontraba ya estaba antes
    // de correrlo. `null` significa "no habia directorio", que no es lo mismo
    // que "habia uno vacio" para lo que se decide mas abajo.
    const dirOpenspec = path.join(o.destino, "openspec");
    const openspecAntes = fs.existsSync(dirOpenspec) ? new Set(recorrer(dirOpenspec)) : null;
    try {
      execFileSync("npx", ["--yes", `@fission-ai/openspec@${pin}`, "init", "--tools", "claude"], {
        cwd: o.destino, stdio: "inherit", shell: process.platform === "win32",
      });
    } catch (e) {
      console.error(`::error::openspec init fallo: ${e.message}. El marco EXIGE openspec/ ([ -d openspec ] || exit 1), asi que el primer PR saldria rojo. Correlo a mano y volve`);
      return 1;
    }
    // Y ahora se RELEE el arbol, que es lo que faltaba: hasta este cambio el
    // paso se daba por bueno con "no lanzo excepcion", que es exactamente el
    // fail-open que este mismo repo tiene MEDIDO para ese CLI en Windows —
    // plantilla/.claude/skills/projects-archive-change/SKILL.md: "en Windows el
    // CLI MIENTE", imprime exito y hace rollback—. El sintoma de no mirar es el
    // peor posible: la herramienta imprime LISTO y las tareas humanas, el
    // builder hace el push fundacional, y el primer CI muere en el paso que
    // exige openspec/, con la herramienta ya cerrada y el diagnostico apuntando
    // al pipeline en vez de al arranque. Se comprueba lo mismo que comprueba el
    // marco (`[ -d openspec ]`), mas que no este vacio.
    const openspecAhora = fs.existsSync(dirOpenspec) ? recorrer(dirOpenspec) : [];
    if (openspecAhora.length === 0) {
      console.error(
        `::error::openspec init salio 0 pero no dejo un openspec/ con contenido en ${o.destino}. Es el sintoma ` +
          `medido de ese CLI en Windows: imprime exito y revierte lo que escribio (esta documentado en ` +
          `plantilla/.claude/skills/projects-archive-change/SKILL.md). El marco EXIGE openspec/ ` +
          `([ -d openspec ] || exit 1), asi que el primer PR saldria rojo. Corre a mano ` +
          `\`npx --yes @fission-ai/openspec@${pin} init --tools claude\` dentro del destino y despues volve a ` +
          `correr esto con --forzar --sin-herramientas.`,
      );
      return 1;
    }
    // Hay contenido, pero NINGUNO lo trajo esta corrida y el directorio ya
    // estaba poblado antes de invocar el CLI. Las dos lecturas son igual de
    // plausibles —el CLI mintio, o no tenia nada que hacer sobre un openspec/ ya
    // inicializado— y esta herramienta no puede distinguirlas sin repetir aca lo
    // que ese CLI considera "inicializado". Por eso AVISA en vez de romper: el
    // escenario en que aparece es el reintento con `--forzar`, o sea el camino
    // de recuperacion que la propia herramienta recomienda, y estrenarle un rojo
    // seria mandar a esa persona a un callejon. Lo que el rojo de arriba SI
    // cubre es el caso del repo nuevo, donde openspec/ no existia.
    const nuevosDeOpenspec = openspecAntes ? openspecAhora.filter((rel) => !openspecAntes.has(rel)) : openspecAhora;
    if (nuevosDeOpenspec.length === 0) {
      console.error(
        `::warning::openspec init salio 0 y openspec/ quedo con los mismos ${openspecAhora.length} archivo(s) que ` +
          `ya tenia antes de correrlo. Puede ser que el CLI no tuviera nada que hacer sobre un openspec/ ya ` +
          `inicializado, o el sintoma medido de ese CLI en Windows: imprime exito y revierte lo que escribio ` +
          `(plantilla/.claude/skills/projects-archive-change/SKILL.md). Abri openspec/ y confirma que es el de ` +
          `este proyecto antes del push fundacional.`,
      );
    }

    // El render de la constitucion no tiene un "[ -d ... ]" que copiar: las
    // rutas que escribe dependen de las `superficies` que declare el proyecto, y
    // repetirlas aca seria una segunda declaracion de algo que vive en
    // actions/constitucion/constitucion.mjs. Pero no hace falta adivinarlas: la
    // action DECLARA lo que escribio en su output `artefactos` (action.yml), asi
    // que se le presta un GITHUB_OUTPUT propio, se leen esas rutas y se
    // comprueban en disco. Ver rutasDelRender para por que la foto antes/despues
    // que habia aca daba rojo sobre un destino ya instanciado.
    const bandeja = fs.mkdtempSync(path.join(os.tmpdir(), "projects-init-render-"));
    const salidaDelRender = path.join(bandeja, "outputs.txt");
    fs.writeFileSync(salidaDelRender, "", "utf8");
    let artefactos;
    try {
      console.log("render de la porcion del marco de la constitucion");
      try {
        execFileSync(process.execPath, [path.join(raizMarco, "actions/constitucion/constitucion.mjs")], {
          cwd: o.destino,
          stdio: "inherit",
          env: { ...process.env, CONSTITUCION_MODO: "escribir", GITHUB_OUTPUT: salidaDelRender },
        });
      } catch (e) {
        console.error(`::error::el render de la constitucion fallo: ${e.message}`);
        return 1;
      }
      artefactos = rutasDelRender(fs.readFileSync(salidaDelRender, "utf8"));
    } finally {
      fs.rmSync(bandeja, { recursive: true, force: true });
    }
    if (artefactos.length === 0) {
      console.error(
        `::error::el render de la constitucion salio 0 y no declaro un solo artefacto escrito en ${o.destino}. ` +
          `Sin la porcion del marco, los agentes de este repo trabajan sin las reglas del area y ningun check ` +
          `del repo nuevo lo dice. Las rutas que le tocan salen de las \`superficies\` declaradas en ` +
          `.projects-valores.json: revisa que ese archivo las declare y corre a mano ` +
          `\`CONSTITUCION_MODO=escribir node <clon-del-marco>/actions/constitucion/constitucion.mjs\` dentro ` +
          `del destino.`,
      );
      return 1;
    }
    // Lo que declaro, comprobado en el disco: el output dice DONDE mirar, no
    // reemplaza el mirar. Es el mismo principio que el escaneo de marcadores,
    // que tampoco le cree a lo que sustituir() dice de si misma.
    const noEstan = artefactos.filter((rel) => {
      const abs = path.join(o.destino, ...rel.split("/"));
      return !fs.existsSync(abs) || fs.statSync(abs).size === 0;
    });
    if (noEstan.length) {
      console.error(
        `::error::el render de la constitucion declaro ${artefactos.length} artefacto(s) y ${noEstan.length} no ` +
          `quedaron escritos en ${o.destino}: ${noEstan.join(", ")}. Salio 0 y no dejo el archivo, que es el ` +
          `modo de falla que este repo tiene medido para los CLI en Windows: exito impreso y rollback. Corre a ` +
          `mano \`CONSTITUCION_MODO=escribir node <clon-del-marco>/actions/constitucion/constitucion.mjs\` ` +
          `dentro del destino y mira que dice.`,
      );
      return 1;
    }
    console.log(`la constitucion dejo ${artefactos.length} archivo(s): ${artefactos.join(", ")}`);
  }

  // ── El arranque: instalado, formateado, verificado ──
  //
  // Este bloque NUNCA se salta por su cuenta y NUNCA se cuelga esperando a
  // nadie. Tiene tres salidas y las tres estan dichas en pantalla:
  //   · no se pidio (--sin-arranque) o no hay con que correrlo (ninguna maquina
  //     esta obligada a tener corepack ni pnpm) o no hay red -> AVISO, se
  //     imprimen los comandos exactos y la corrida sigue hasta el final;
  //   · corrio y salio verde -> "instalado, formateado, verificado";
  //   · corrio y salio rojo -> ::error::, que paso fallo, por que existe ese
  //     paso, como se arregla, y exit 1. Un rojo aca es un rojo REAL: es el
  //     mismo que daria el CI en el primer push, adelantado a la maquina donde
  //     se arregla en un minuto.
  let arranque = null;
  if (!o.arranque) {
    console.error("");
    console.error("::warning::se pidio --sin-arranque: el repo quedo ESCRITO pero sin instalar, sin formatear y sin verificar.");
    console.error("Antes del primer push hay que correr, en la raiz del destino:");
    for (const paso of PASOS_DEL_ARRANQUE) console.error(`  pnpm ${paso.args.join(" ")}`);
    console.error("Sin el install no hay lockfile, y el CI corre con --frozen-lockfile: el primer push moriria ahi.");
  } else {
    const ejecutor = ejecutorDeScripts();
    // La comprobacion previa de red es una COMODIDAD, no un requisito: si el
    // modulo que la hace no esta al lado, se sigue igual y el arranque se
    // intenta. Lo que se pierde es el buen diagnostico de "no hay red", no la
    // funcion.
    const npm = ejecutor ? await moduloDelRegistro() : null;
    if (ejecutor && !npm) {
      console.error("::warning::no encontre herramientas/registro-npm.mjs al lado de esta herramienta, asi que el arranque no puede comprobar la red antes de instalar. Se intenta igual: si no hay registro alcanzable, el fallo va a salir del gestor de paquetes y no de aca");
    }
    const red = ejecutor && npm ? await npm.alcanzaElRegistro({ registro: npm.registroDe() }) : { ok: true, error: null };
    if (!ejecutor) {
      console.error("");
      console.error("::warning::no encontre ni `corepack` (que viene con Node) ni `pnpm` en el PATH, asi que el arranque");
      console.error("no se pudo intentar. El repo quedo ESCRITO y completo; lo que falta son cuatro comandos en su raiz:");
      for (const paso of PASOS_DEL_ARRANQUE) console.error(`  pnpm ${paso.args.join(" ")}`);
      console.error("Corepack se habilita con `corepack enable`; pnpm tambien se instala suelto (npm i -g pnpm).");
    } else if (!red.ok) {
      // Preguntar primero cuesta medio segundo y evita el peor diagnostico que
      // hay: sin red el install no falla rapido ni claro, tarda decenas de
      // segundos en agotar reintentos y muere con un volcado del gestor que no
      // dice "no hay red" en ninguna parte — encima de un repo recien escrito.
      console.error("");
      console.error(`::warning::no llego a ${red.registro} (${red.error}), asi que el arranque no se intenta: sin registro`);
      console.error("alcanzable el install no falla rapido, falla tarde y con un mensaje que no habla de la red.");
      console.error("El repo quedo ESCRITO y completo. Cuando tengas red, en su raiz:");
      for (const paso of PASOS_DEL_ARRANQUE) console.error(`  pnpm ${paso.args.join(" ")}`);
    } else {
      console.log("");
      console.log(`ARRANQUE con ${ejecutor.nombre} en ${o.destino} — ${PASOS_DEL_ARRANQUE.length} pasos, la salida de cada uno tal cual sale:`);
      // Los scripts del andamio se llaman entre si con `pnpm` pelado. Sin un
      // pnpm global —la maquina limpia que corepack existe para cubrir— el paso
      // 1 pasa y el 2 muere con "pnpm: not found". Ver necesitaShimDePnpm.
      let dirDeShims = null;
      if (necesitaShimDePnpm(ejecutor)) {
        dirDeShims = materializarShimDePnpm(path.join(fs.mkdtempSync(path.join(os.tmpdir(), "projects-shims-")), "bin"));
        if (dirDeShims) console.log(`(sin pnpm en el PATH: shim de corepack en ${dirDeShims}, solo para estos pasos)`);
        else console.error("::warning::no se pudo materializar el shim de pnpm. Si un paso muere con \"pnpm: not found\", es esto: corre `corepack enable` una vez y volve a intentar");
      }
      const hechos = [];
      for (const paso of PASOS_DEL_ARRANQUE) {
        console.log("");
        console.log(`── ${hechos.length + 1}/${PASOS_DEL_ARRANQUE.length}  ${paso.titulo}  (${ejecutor.nombre} ${paso.args.join(" ")})`);
        const r = correrPaso(ejecutor, paso, o.destino, process.env, dirDeShims);
        hechos.push({ paso, ...r });
        // Se corta en el primero que falla: los que vienen despues dependen de
        // el, y dejarlos correr convierte un rojo legible en una cascada donde
        // el primero —el unico que importa— queda cuatro pantallas arriba.
        if (!r.ok) break;
      }
      arranque = hechos;
      console.log("");
      const resumen = lineasDelResumen(hechos, o.destino);
      const rojo = hechos.some((h) => !h.ok);
      for (const linea of resumen) {
        if (rojo) console.error(linea);
        else console.log(linea);
      }
      if (rojo) {
        console.error("");
        console.error("Lo que sigue —las tareas humanas— NO se imprime: primero hay que dejar el proyecto en verde.");
        return 1;
      }
    }
  }

  // ── Lo que queda, y es humano ──
  console.log("");
  console.log(
    arranque
      ? "LISTO, y el proyecto quedo arrancado y en verde. Lo que sigue NO lo puede hacer esta herramienta:"
      : "LISTO. Lo que sigue NO lo puede hacer esta herramienta:",
  );
  console.log("");
  console.log("  EL ORDEN IMPORTA. Lo medido: el bootstrap va a main por PUSH DIRECTO y la");
  console.log("  proteccion se aplica DESPUES. El plano del cambio de la compuerta de cobertura");
  console.log("  mide las lineas que un PR agrega sin pruebas, y el commit fundacional agrega");
  console.log("  el esqueleto entero: por PR sale rojo, por push a main sale `NO APLICABLE`.");
  console.log("  Ademas `ci-ok` no aparece en la lista de checks del ruleset hasta que el CI");
  console.log("  haya corrido una vez. Push -> CI verde -> recien ahi el ruleset -> y desde");
  console.log("  ese momento todo por PR.");
  console.log("");
  console.log("  1. ANTES DEL PRIMER PUSH — llenar `README.md`:");
  console.log("     El andamio deja un README con la estructura puesta y los valores ya");
  console.log("     sustituidos, y con huecos marcados RELLENAR donde van las respuestas");
  console.log("     que ninguna herramienta puede inventar: que hace el proyecto, su");
  console.log("     alcance, que dispara cada despliegue, y el runbook de sus alarmas.");
  console.log("     Es lo unico que GitHub renderiza en la portada del repo, o sea lo");
  console.log("     primero que lee quien llega — y un README que quedo con los rotulos");
  console.log("     del andamio no pone nada en rojo: se lee como si el proyecto no");
  console.log("     tuviera la respuesta. Cuantos quedan lo dice el grep, no esta lista:");
  console.log("          grep -n RELLENAR README.md");
  console.log("");
  // Esta linea decia "las 4 reglas probadas, no las 8" sobre CUALQUIER repo, sin
  // haber mirado ninguno. En la cuenta que hospeda el marco esas cuatro no
  // existen ni pueden existir, asi que era una tarea humana imposible impresa
  // como si fuera un tramite. Ahora dice lo que se MIDIO, y cuando no se pudo
  // medir lo dice tambien.
  if (proteccion.estado === "puede") {
    console.log(`  2. Proteccion de main: las 4 reglas probadas, no las 8 (${RUTA_PROTECCION}).`);
    console.log(`     MEDIDO: ${valores.ORG}/${valores.PROYECTO} admite rulesets (${proteccion.detalle}).`);
    console.log("     Aplicarlas es tuyo: esta herramienta no toca ajustes de seguridad de un repo.");
  } else if (proteccion.estado === "sin-compuertas") {
    console.log(`  2. Proteccion de main: NO SE PUEDE HOY, y esta medido (${RUTA_PROTECCION}).`);
    console.log(`     gh api repos/${valores.ORG}/${valores.PROYECTO}/rulesets -> 403 "${proteccion.detalle}"`);
    console.log("     GitHub no ofrece proteccion de rama en repos privados del plan gratuito. Este");
    console.log("     repo nace SIN compuerta: nada impide un push directo a main. Hay que elegir");
    console.log("     entre GitHub Pro, una organizacion con plan Team, o hacer el repo publico —");
    console.log("     las tres estan con su costo en ese documento. NO lo anotes como \"pendiente\".");
  } else {
    console.log(`  2. Proteccion de main: NO SE PUDO MEDIR (${proteccion.estado}), y eso NO es "esta bien".`);
    console.log(`     ${proteccion.detalle}`);
    console.log(`     El documento (${RUTA_PROTECCION}) dice como destrabar la sonda. Correla antes de`);
    console.log("     declarar en ningun informe que este repo tiene compuerta.");
  }
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

  // LA OTRA HERRAMIENTA, nombrada ACA y no solo en la documentacion. Es el unico
  // momento garantizado en que alguien esta mirando esta salida, y la pregunta
  // que contesta —"lo que acabo de instalar, sigue siendo lo ultimo estable?"—
  // aparece justo despues, no antes. Sin esta linea la herramienta existe y no
  // la encuentra nadie, que para el caso es lo mismo que no existir.
  console.log("");
  console.log("Y UNA MAS, PARA DESPUES. El stack que acaba de nacer envejece: los rangos de los");
  console.log("manifiestos se quedan donde estan y el lockfile los congela. Para comparar lo que");
  console.log("este proyecto DECLARA contra la ultima estable publicada de cada paquete —y decidir,");
  console.log("con dos preguntas, si actualizar todo el stack o solo una parte—:");
  console.log(`     node <clon-del-marco>/herramientas/projects-versiones.mjs --raiz ${o.destino}`);
  console.log("Sin terminal (en CI) solo imprime el informe y sale 0: nunca pregunta ni escribe.");
  return 0;
}

/** "Me invocaron a MI?", resuelto por realpath en los dos lados.
 *
 *  `import.meta.url` viene con los enlaces simbolicos ya resueltos y `argv[1]`
 *  NO: son la misma ruta escrita distinto. En macOS eso pasa siempre que el
 *  destino cuelga de `/tmp` —que es un enlace a `/private/tmp`—, y el resultado
 *  era el peor de los posibles: la comparacion daba falso, `main` no corria, y
 *  el proceso salia 0 SIN IMPRIMIR NADA. Un exito silencioso que no escribio un
 *  archivo, en la herramienta cuyo encabezado declara que nunca omite en
 *  silencio. Se caza asi: correr la herramienta por una ruta con un enlace
 *  simbolico en el medio. Es el mismo patron que usa
 *  actions/constitucion/constitucion.mjs, y por el mismo motivo.
 *
 *  El `try` es por el caso en que `argv[1]` no exista en disco (`node --eval`,
 *  un REPL): ahi no nos invocaron a nosotros y no corre nada, que es lo correcto. */
function meInvocaronAMi() {
  try {
    return fs.realpathSync(ESTE_ARCHIVO) === fs.realpathSync(process.argv[1] ?? "");
  } catch {
    return false;
  }
}

/** LA RED DE ULTIMA INSTANCIA, y por que la llamada no puede ir pelada.
 *
 *  `main()` se invocaba sin try/catch. La envoltura que este archivo ya tenia
 *  cubre `argumentos()` —un uso mal escrito— y la copia —un EPERM a mitad de
 *  escritura—, pero NO el resto de main(): cualquier excepcion fuera de esas dos
 *  ramas salia como volcado del runtime, con `at ModuleJob.run (node:internal/
 *  modules/esm/module_job:...)` en pantalla, un codigo de salida que no elige
 *  esta herramienta y ni una linea sobre que quedo en el destino. Habia al menos
 *  una alcanzable y medida: un `plantilla` que existe pero no es un directorio
 *  hace que el primer recorrido tire ENOTDIR.
 *
 *  Esto no adivina la causa —si supiera cual es, seria un control con su propio
 *  mensaje mas arriba— pero si hace tres cosas que el volcado no hacia: lo marca
 *  como `::error::` igual que el resto, dice que el destino puede haber quedado
 *  a medias, y fija el codigo en 1. La traza va DEBAJO y anunciada, porque para
 *  reportar el defecto hace falta; lo que no puede pasar es que sea la respuesta
 *  entera. */
//  Y POR QUE AHORA ES UN `catch` DE PROMESA. `main` paso a ser async cuando el
//  arranque empezo a preguntarle al registro de npm si hay red antes de intentar
//  el install. Con una funcion async, un `throw` de adentro NO llega al try/catch
//  sincronico que habia aca: sale como rechazo, y un rechazo sin manejar termina
//  en `ERR_UNHANDLED_REJECTION` — o sea el mismo volcado del runtime que este
//  bloque existe para no tener, reintroducido por un `async` en la linea de al
//  lado. Las dos formas se cubren: el `try` por si `main` tira antes del primer
//  await, y el `.catch` por lo demas.
if (meInvocaronAMi()) {
  const morir = (e) => {
    console.error(
      `::error::la corrida murio con una excepcion que ningun control de esta herramienta atrapo: ` +
        `${e?.code ? `${e.code} — ` : ""}${e?.message ?? e}`,
    );
    console.error(
      "Eso es un defecto de esta herramienta, no de como la corriste. El destino PUEDE haber quedado a medias: " +
        "revisalo antes de reintentar y, si tiene archivos del andamio, borralos o reintenta con --forzar. " +
        "Lo que sigue es la traza, para reportarlo:",
    );
    console.error(e?.stack ?? String(e));
    process.exit(1);
  };
  try {
    main(process.argv.slice(2))
      .then((codigo) => process.exit(codigo))
      .catch(morir);
  } catch (e) {
    morir(e);
  }
}
