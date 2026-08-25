#!/usr/bin/env node
// ---------------------------------------------------------------------------
// projects versiones — que tiene el stack declarado vs que hay publicado hoy, y
// la actualizacion, si la persona la pide.
//
// POR QUE EXISTE. El andamio declara sus dependencias con un rango (`^10.9.1`),
// y un rango no se mueve solo: el lockfile lo congela y el repo se queda con lo
// que habia el dia que nacio. La pregunta "estoy atrasado?" hasta hoy se
// contestaba abriendo cuatro package.json y buscando cada paquete a mano en el
// registro — cuarenta y pico de busquedas, que nadie hace, y por eso la
// respuesta era siempre "no se". Eso no es un problema de disciplina: es un
// dato derivable que se estaba pidiendo a mano, que es la misma clase de defecto
// que `projects init` cierra del otro lado.
//
// LAS DOS PREGUNTAS SON DEL DUENO, y en este orden:
//   1. hay algo mas nuevo — actualizo?
//   2. lo aplico a TODO el stack, o solo a lo que elijas?
//
// INTERACTIVO SOLO SI HAY TTY, y esto no es un detalle de implementacion: es la
// diferencia entre una herramienta y un pipeline colgado. En CI no hay nadie a
// quien preguntarle, asi que `process.stdin.isTTY` decide: con TTY pregunta, sin
// TTY imprime el informe y SALE 0. Un prompt que espera una tecla en un runner
// no falla: se queda ahi hasta que el job muere por timeout, veinte minutos
// despues, y el log no dice por que.
//
// LO QUE NUNCA HACE, y esta declarado a proposito:
//  · No bloquea por falta de red. Sin registro alcanzable AVISA y sale 0. Una
//    herramienta de consulta que se pone roja en un avion convierte "no pude
//    mirar" en "algo esta mal", que es la senal falsa mas cara que hay.
//  · No decide. Sin TTY no escribe una sola linea de ningun archivo, y con TTY
//    solo escribe lo que se le contesto que si.
//  · No toca el lockfile. Escribe los package.json y lo dice: bajar los paquetes
//    y mover el lockfile es del install, y hacerlo aca seria escribir un lockfile
//    que no corresponde a ninguna instalacion real.
//  · No propone romper un desvio DECLARADO. Cuando un manifiesto explica por
//    escrito por que un paquete esta fijado abajo de la ultima estable
//    (`projects.stack.desvios`), esta herramienta lo respeta y lo dice. El
//    andamio hoy no declara ninguno —ver `desviosDe`—, pero los arboles a los
//    que apunta `--raiz` si pueden.
//  · No escribe lo que el registro conteste sin mirarlo. `latest` se valida
//    contra la forma de una version antes de proponerlo, y el valor se vuelve a
//    validar antes de pegarlo en el manifiesto. Un registro que contesta texto
//    arbitrario no puede escribir JSON en un package.json que despues se
//    instala.
//
// EL BANCO DE ESTE ARCHIVO vive en pruebas/init/versiones.test.mjs y corre SIN
// RED: donde hace falta un registro se levanta el de mentira de
// pruebas/init/registro-falso.mjs y se apunta esta herramienta con
// PROJECTS_REGISTRO_NPM. Cada guarda de aca se puede ver fallar: el banco las
// mide una por una, incluida la cadena entera contra un registro hostil.
//
// USO:
//   node herramientas/projects-versiones.mjs
//   node herramientas/projects-versiones.mjs --raiz <ruta>   (un proyecto ya instanciado)
//   node herramientas/projects-versiones.mjs --solo-informe  (nunca pregunta)
//   node herramientas/projects-versiones.mjs --help
// ---------------------------------------------------------------------------

import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { fileURLToPath } from "node:url";

// El comparador NO se reescribe aca: es el mismo de `projects init`, que ya
// decide con el si un Node alcanza el piso. Dos comparadores de versiones en el
// mismo arbol son dos reglas que pueden divergir, y la que divergiria es esta.
import { compararVersiones } from "./projects-init.mjs";
import { registroDe, consultarEtiquetasDe, esVersionPublicable, TIMEOUT_POR_DEFECTO } from "./registro-npm.mjs";

const ESTE_ARCHIVO = fileURLToPath(import.meta.url);
const ESTE_DIRECTORIO = path.dirname(ESTE_ARCHIVO);

/** El arbol que se mira cuando nadie pasa `--raiz`: el andamio del marco. Es el
 *  que declara el stack que va a heredar cada proyecto nuevo, o sea donde una
 *  version vieja se multiplica por cada repo que nazca. */
export const RAIZ_POR_DEFECTO = path.join(ESTE_DIRECTORIO, "..", "plantilla");

/** Los dos campos de un package.json donde vive un rango de dependencia. Los que
 *  NO estan son deliberados: `peerDependencies` declara con que convive el
 *  paquete —subirlo no es actualizar, es cambiar a quien se le puede instalar— y
 *  `optionalDependencies` no aparece en ningun manifiesto del andamio, asi que
 *  soportarlo seria codigo que nadie puede ver correr. */
export const CAMPOS_DE_DEPENDENCIAS = ["dependencies", "devDependencies"];

/** El campo que fija el gestor de paquetes: `"packageManager": "pnpm@11.23.0"`.
 *  Es un paquete publicado como cualquier otro y se queda atras igual, pero su
 *  forma es distinta —nombre y version en UNA cadena, y version EXACTA— asi que
 *  se lee y se escribe aparte. */
export const CAMPO_GESTOR = "packageManager";

/** Los directorios que el recorrido poda. `node_modules` es el que importa:
 *  sobre un proyecto ya instalado hay decenas de miles de package.json ahi
 *  adentro, y ninguno lo declara ESTE repo. Se poda por SEGMENTO, no por
 *  prefijo: `api/node_modules/...` no empieza con "node_modules/". */
const NO_SE_RECORRE = new Set(["node_modules", ".git", "dist", "build", "coverage", ".next", ".turbo"]);

/** Los package.json del arbol, relativos a la raiz, ordenados.
 *
 *  A CUALQUIER PROFUNDIDAD y no solo un nivel. Hoy el andamio tiene exactamente
 *  cuatro (la raiz y los tres paquetes) y un recorrido de un nivel alcanzaria —
 *  pero esta herramienta tambien apunta a proyectos YA instanciados con `--raiz`,
 *  donde nada impide un `packages/algo/package.json`. Y el modo de falla de
 *  quedarse corto es el mudo: el manifiesto no aparece en el informe y su
 *  version vieja se lee como "no existe" en vez de como "esta atrasada".
 *
 *  UN DIRECTORIO QUE NO SE PUEDE LISTAR NO MATA LA CORRIDA, y esto se agrego
 *  despues de medirlo: el `readdirSync` iba pelado, asi que un solo subdirectorio
 *  sin permiso —un volumen montado, el cache de otro usuario, un EPERM de
 *  Windows— tiraba una excepcion que ningun control atrapaba, con stdout VACIO y
 *  exit 1. Sobre el andamio del marco eso no pasa nunca; sobre un proyecto ya
 *  instanciado, que es el uso que esta herramienta promociona con `--raiz`, pasa.
 *  Y perder el informe entero por un directorio que no tenia ningun package.json
 *  es exactamente lo contrario de lo que promete `leerArbol` un poco mas abajo.
 *  Ahora el directorio ilegible entra como PROBLEMA —que se imprime— y el resto
 *  del arbol se sigue recorriendo.
 *
 *  Devuelve `{ rutas, problemas }` y no una lista pelada: una lista sola obliga a
 *  quien llama a no enterarse de lo que no se pudo mirar, que es la forma de que
 *  "no lo mire" se lea como "no habia nada". */
export function manifiestosDe(raiz) {
  const rutas = [];
  const problemas = [];
  const pendientes = [""];
  while (pendientes.length) {
    const dirRel = pendientes.pop();
    const abs = dirRel ? path.join(raiz, ...dirRel.split("/")) : raiz;
    let entradas;
    try {
      entradas = fs.readdirSync(abs, { withFileTypes: true });
    } catch (e) {
      problemas.push(
        `${dirRel || "."}: no pude listar ese directorio (${e.code ? `${e.code} — ` : ""}${e.message}). ` +
          `Si hay package.json ahi adentro, NO estan en este informe`,
      );
      continue;
    }
    for (const e of entradas) {
      if (NO_SE_RECORRE.has(e.name)) continue;
      const rel = dirRel ? `${dirRel}/${e.name}` : e.name;
      if (e.isDirectory()) pendientes.push(rel);
      else if (e.isFile() && e.name === "package.json") rutas.push(rel);
    }
  }
  return { rutas: rutas.sort(), problemas };
}

/** Lo que un rango declara, cuando se puede leer.
 *
 *  SE ACEPTA POCO A PROPOSITO: un prefijo simple (`^`, `~`, `>=`, `>`, o nada) y
 *  una version EXACTA x.y.z detras. Todo lo demas —`workspace:*`, `catalog:`,
 *  `npm:otro@1`, una URL de git, `*`, `latest`, `^1.2`, `1.x`, un `||` con dos
 *  ramas, una prerelease— sale como NO COMPARABLE, con el motivo.
 *
 *  Y "no comparable" se REPORTA, no se descarta en silencio: es la unica forma
 *  de que quien lee el informe sepa que esos paquetes no los miro nadie. Un
 *  parser que adivina el numero adentro de un rango que no entiende termina
 *  reescribiendo `npm:otro-paquete@^1.0.0` como `^2.0.0`, que no es una
 *  actualizacion sino un cambio de paquete. */
export function leerRango(rango) {
  if (typeof rango !== "string") return { base: null, prefijo: null, motivo: `no es texto (${typeof rango})` };
  const limpio = rango.trim();
  if (limpio === "") return { base: null, prefijo: null, motivo: "esta vacio" };
  const m = /^(\^|~|>=|>)?(\d+\.\d+\.\d+)$/.exec(limpio);
  if (!m) {
    if (/^(workspace|catalog|npm|file|link|git|github|http|https):/.test(limpio)) {
      return { base: null, prefijo: null, motivo: `no apunta al registro (${limpio})` };
    }
    if (/-/.test(limpio)) return { base: null, prefijo: null, motivo: `es una prerelease (${limpio})` };
    return { base: null, prefijo: null, motivo: `no es un prefijo simple + x.y.z (${limpio})` };
  }
  return { base: m[2], prefijo: m[1] ?? "", motivo: null };
}

/** El rango que corresponde escribir para una version nueva: el MISMO prefijo
 *  que ya estaba. Un `~` no se convierte en `^` de paso, y una version exacta no
 *  se afloja a rango: quien escribio ese prefijo decidio cuanto movimiento
 *  acepta, y esta herramienta actualiza el numero, no la politica. */
export function rangoNuevo(prefijo, version) {
  return `${prefijo}${version}`;
}

/** La mayor de una version. Lo que separa un salto que puede romper el build de
 *  uno que no deberia. */
function mayorDe(v) {
  return Number.parseInt(String(v).split(".")[0], 10) || 0;
}

/** Como se compara lo declarado con lo publicado. Cuatro respuestas, y las
 *  cuatro son distintas para quien decide:
 *   · "al-dia"      — el numero declarado ES la ultima estable.
 *   · "menor"       — hay algo mas nuevo dentro de la misma mayor.
 *   · "mayor"       — hay una linea principal nueva. Otro riesgo, otra decision.
 *   · "adelantado"  — lo declarado es MAS nuevo que `latest`. No es un error de
 *                     esta herramienta: pasa cuando el publicador retrocede el
 *                     tag `latest`, y proponer "actualizar" ahi seria proponer
 *                     BAJAR de version sin decirlo. */
export function clasificar(base, ultima) {
  const cmp = compararVersiones(base, ultima);
  if (cmp === 0) return "al-dia";
  if (cmp > 0) return "adelantado";
  return mayorDe(base) === mayorDe(ultima) ? "menor" : "mayor";
}

/** Los desvios DECLARADOS de un manifiesto: `projects.stack.desvios`.
 *
 *  Es el bloque con el que el andamio explica, por escrito y con la medicion al
 *  lado, por que un paquete esta fijado abajo de la ultima estable. Leerlo no es
 *  cortesia: sin esto, una corrida sobre un arbol con desvios propone deshacer
 *  la decision de versiones que ese arbol tomo a conciencia, y con un `s`
 *  distraido la deshace.
 *
 *  HOY EL ANDAMIO NO DECLARA NINGUNO. Medido: `plantilla/package.json` trae
 *  `"desvios": []` y typescript quedo en ^7.0.2 en los tres paquetes — el desvio
 *  que motivo este codigo (typescript fijado en la mayor 6 mientras la 7 no
 *  exponia la API de compilador) se levanto y su nota se movio a
 *  `projects.stack.notas`. O sea que sobre el arbol por defecto esta rama y las
 *  dos secciones del informe que dependen de ella (`congelados` y
 *  `desviosARevisar`) NO se recorren nunca. Se sostienen igual porque `--raiz`
 *  apunta a proyectos ajenos, que si pueden declararlos; y para que no sean
 *  codigo que nadie ejecuto jamas, el banco las ejercita con manifiestos armados
 *  a mano (pruebas/init/versiones.test.mjs).
 *
 *  Se lee de TODOS los manifiestos y se aplica por NOMBRE DE PAQUETE en todo el
 *  arbol: el desvio de typescript se declara una vez, en la raiz, y typescript
 *  esta declarado ademas en los tres paquetes. Un desvio que solo valiera en el
 *  manifiesto donde esta escrito dejaria las otras tres declaraciones libres, que
 *  es exactamente el caso que hay hoy. */
export function desviosDe(manifiesto) {
  const crudos = manifiesto?.projects?.stack?.desvios;
  if (!Array.isArray(crudos)) return [];
  return crudos
    .filter((d) => d && typeof d.paquete === "string" && d.paquete !== "")
    .map((d) => ({
      paquete: d.paquete,
      fijado_en: typeof d.fijado_en === "string" ? d.fijado_en : null,
      ultima_estable_al_fijarlo: typeof d.ultima_estable_al_fijarlo === "string" ? d.ultima_estable_al_fijarlo : null,
      motivo: typeof d.motivo === "string" ? d.motivo : "",
    }));
}

/** Todo lo que un manifiesto DECLARA, en una lista plana.
 *
 *  Una entrada por (manifiesto, campo, paquete): el mismo paquete declarado en
 *  tres manifiestos son tres decisiones distintas de tres archivos distintos, y
 *  colapsarlas haria imposible actualizar uno solo. La consulta al registro SI
 *  se deduplica, que es donde la duplicacion cuesta. */
export function declaracionesDe(manifiesto, ruta) {
  const salida = [];
  for (const campo of CAMPOS_DE_DEPENDENCIAS) {
    const bloque = manifiesto?.[campo];
    if (bloque === null || typeof bloque !== "object" || Array.isArray(bloque)) continue;
    for (const [paquete, rango] of Object.entries(bloque)) {
      salida.push({ ruta, campo, paquete, rango });
    }
  }
  const gestor = manifiesto?.[CAMPO_GESTOR];
  if (typeof gestor === "string") {
    // `pnpm@11.23.0`. La arroba que separa puede aparecer tambien al principio
    // (un gestor con scope), asi que se corta por la ULTIMA.
    const corte = gestor.lastIndexOf("@");
    if (corte > 0) {
      salida.push({ ruta, campo: CAMPO_GESTOR, paquete: gestor.slice(0, corte), rango: gestor.slice(corte + 1) });
    }
  }
  return salida;
}

/** Lee el arbol entero: los manifiestos, lo que declaran y sus desvios.
 *  Un package.json que no parsea NO mata la corrida: entra como problema y el
 *  resto del arbol se sigue mirando. Un solo archivo roto no puede dejar sin
 *  informe a los otros tres. Lo mismo vale para un package.json que no se puede
 *  LEER y para un directorio que no se puede LISTAR (ver `manifiestosDe`): los
 *  tres casos salen por `problemas`, que main() imprime como ::warning::, y
 *  ninguno de los tres corta el recorrido. */
export function leerArbol(raiz) {
  const { rutas: manifiestos, problemas: problemasDelRecorrido } = manifiestosDe(raiz);
  const problemas = [...problemasDelRecorrido];
  const declaraciones = [];
  const desvios = new Map();
  for (const rel of manifiestos) {
    const abs = path.join(raiz, ...rel.split("/"));
    let texto;
    try {
      texto = fs.readFileSync(abs, "utf8");
    } catch (e) {
      problemas.push(`${rel}: no pude leerlo (${e.code ? `${e.code} — ` : ""}${e.message})`);
      continue;
    }
    let manifiesto;
    try {
      manifiesto = JSON.parse(texto);
    } catch (e) {
      problemas.push(`${rel}: no es JSON valido (${e.message})`);
      continue;
    }
    declaraciones.push(...declaracionesDe(manifiesto, rel));
    for (const d of desviosDe(manifiesto)) desvios.set(d.paquete, { ...d, declaradoEn: rel });
  }
  return { manifiestos, declaraciones, desvios, problemas };
}

/** Una version con sufijo de prerelease (`8.0.0-rc.10`, `6.0.0-beta`). En semver
 *  todo lo que sigue al primer guion despues del parche es la prerelease. */
export function esPrerelease(v) {
  return typeof v === "string" && /^\d+\.\d+\.\d+-/.test(v.trim());
}

/** La version ESTABLE que corresponde proponer para un paquete, a partir de lo
 *  que el registro contesto.
 *
 *  EL CASO QUE ESTO EXISTE PARA NO ERRAR, y esta MEDIDO contra el registro
 *  publico el dia que se escribio: el tag `latest` de `prisma` apuntaba a
 *  `8.0.0-rc.10`, o sea a una CANDIDATA. Leer `latest` y llamarlo "la version
 *  estable actual" habria hecho que esta herramienta propusiera —y con un `s`
 *  distraido, escribiera— `^8.0.0-rc.10` como dependencia del andamio, o sea el
 *  repo nuevo naciendo sobre una release candidate de su capa de datos. El
 *  encargo dice "la version estable actual"; una prerelease no lo es, aunque el
 *  publicador la haya puesto en `latest`.
 *
 *  Y NO SE ADIVINA CUAL SERIA LA ESTABLE. La respuesta correcta —la publicacion
 *  no-prerelease mas alta— hay que ir a buscarla al documento completo del
 *  paquete, que para ese mismo `prisma` pesa 23 MB (medido). Bajarlo cambiaria
 *  una consulta de 300 bytes por una de decenas de megas para un caso raro. Asi
 *  que esta herramienta dice la verdad y no toca: "el publicador no declara una
 *  estable hoy, miralo vos". */
export function estableDe(consulta) {
  if (!consulta) return { version: null, error: "no se consulto", prerelease: null };
  if (consulta.error) return { version: null, error: consulta.error, prerelease: null };
  if (esPrerelease(consulta.latest)) return { version: null, error: null, prerelease: consulta.latest };
  if (typeof consulta.latest !== "string" || consulta.latest === "") {
    return { version: null, error: "el registro no devolvio un tag latest", prerelease: null };
  }
  // Y LA FORMA, otra vez y a proposito. `esPrerelease` solo descarta el sufijo
  // de candidata; lo que llega hasta aca sigue siendo texto de un tercero camino
  // al package.json. registro-npm.mjs ya lo filtra, pero esta funcion se exporta
  // y recibe Maps armados por quien la llame: la capa que decide QUE se propone
  // no puede dar por hecho que otra capa filtro.
  if (!esVersionPublicable(consulta.latest)) {
    return {
      version: null,
      error: "el tag latest no tiene forma de version publicable, asi que no se propone nada con el",
      prerelease: null,
    };
  }
  return { version: consulta.latest, error: null, prerelease: null };
}

/** El informe: cada declaracion, en el cajon que le toca.
 *
 *  Recibe `ultimas` ya resuelto (un Map nombre -> { latest, error }, lo que
 *  devuelve el modulo del registro) en vez de salir a la red por su cuenta, y eso
 *  es lo que lo hace verificable: el banco (pruebas/init/versiones.test.mjs) le
 *  pasa un Map armado a mano y puede
 *  afirmar la clasificacion de cada caso borde sin depender de que hay publicado
 *  hoy — que cambia todas las semanas. */
export function analizar({ declaraciones, ultimas, desvios = new Map() }) {
  const a = {
    mayores: [], menores: [], alDia: [], adelantados: [],
    congelados: [], noComparables: [], sinRespuesta: [], sinEstable: [], desviosARevisar: [],
  };
  const revisados = new Set();
  for (const d of declaraciones) {
    const { base, prefijo, motivo } = leerRango(d.rango);
    if (base === null) {
      a.noComparables.push({ ...d, motivo });
      continue;
    }
    const resuelta = estableDe(ultimas.get(d.paquete));
    if (resuelta.prerelease) {
      a.sinEstable.push({ ...d, prerelease: resuelta.prerelease });
      continue;
    }
    if (resuelta.version === null) {
      a.sinRespuesta.push({ ...d, error: resuelta.error ?? "no se consulto" });
      continue;
    }
    const ultima = resuelta.version;
    const desvio = desvios.get(d.paquete);
    if (desvio) {
      a.congelados.push({ ...d, base, ultima, desvio });
      // El desvio se escribio contra una foto del registro. Si esa foto ya no es
      // la de hoy, el motivo se razono sobre otra version y merece una relectura
      // — que no es lo mismo que "hay que actualizar", asi que es su propio
      // cajon y no una propuesta.
      if (
        desvio.ultima_estable_al_fijarlo &&
        compararVersiones(desvio.ultima_estable_al_fijarlo, ultima) !== 0 &&
        !revisados.has(d.paquete)
      ) {
        revisados.add(d.paquete);
        a.desviosARevisar.push({ paquete: d.paquete, desvio, ultima });
      }
      continue;
    }
    const clase = clasificar(base, ultima);
    const fila = { ...d, base, prefijo, ultima, nuevo: rangoNuevo(prefijo, ultima) };
    if (clase === "al-dia") a.alDia.push(fila);
    else if (clase === "adelantado") a.adelantados.push(fila);
    else if (clase === "mayor") a.mayores.push(fila);
    else a.menores.push(fila);
  }
  return a;
}

/** Lo que se puede proponer actualizar, en el orden en que se numera al elegir:
 *  primero los saltos de mayor y despues el resto. Los de mayor van arriba
 *  porque son los que hay que MIRAR, no porque sean los que hay que aplicar. */
export function propuestas(a) {
  return [...a.mayores, ...a.menores];
}

function alinear(texto, ancho) {
  return texto.length >= ancho ? texto : texto + " ".repeat(ancho - texto.length);
}

function filaLegible(f, anchoPaquete, anchoRango) {
  return `${alinear(f.paquete, anchoPaquete)}  ${alinear(f.rango, anchoRango)} -> ${alinear(f.nuevo, anchoRango)}  (${f.ruta}, ${f.campo})`;
}

function anchos(filas) {
  return [
    Math.max(0, ...filas.map((f) => f.paquete.length)),
    Math.max(0, ...filas.map((f) => Math.max(f.rango.length, (f.nuevo ?? "").length))),
  ];
}

/** El informe en lineas de texto. Puro sobre el analisis: no imprime, no
 *  pregunta y no toca disco, asi que el banco lo puede afirmar entero. */
export function lineasDelInforme(a, { manifiestos = [], registro = "", numerar = false } = {}) {
  const l = [];
  const total = a.mayores.length + a.menores.length + a.alDia.length + a.adelantados.length +
    a.congelados.length + a.noComparables.length + a.sinRespuesta.length + a.sinEstable.length;
  l.push(`== versiones declaradas vs la ultima estable publicada ==`);
  l.push(`registro: ${registro}`);
  l.push(`${total} declaracion(es) en ${manifiestos.length} manifiesto(s): ${manifiestos.join(", ")}`);
  l.push("");

  const numeros = new Map();
  if (numerar) propuestas(a).forEach((f, i) => numeros.set(f, i + 1));
  const conNumero = (f, texto) => (numerar ? `  [${String(numeros.get(f)).padStart(2, " ")}] ${texto}` : `  ${texto}`);

  if (a.mayores.length) {
    const [p, r] = anchos(a.mayores);
    l.push(`SALTOS DE MAYOR (${a.mayores.length}) — cambian de linea principal: pueden romper el build, y hay que leer sus notas de version antes de aplicarlos`);
    for (const f of a.mayores) l.push(conNumero(f, filaLegible(f, p, r)));
    l.push("");
  }
  if (a.menores.length) {
    const [p, r] = anchos(a.menores);
    l.push(`SALTOS MENORES O DE PARCHE (${a.menores.length}) — dentro de la misma mayor: correcciones y agregados, sin cambio de contrato declarado`);
    for (const f of a.menores) l.push(conNumero(f, filaLegible(f, p, r)));
    l.push("");
  }
  if (a.congelados.length) {
    l.push(`FIJADOS POR UN DESVIO DECLARADO (${a.congelados.length}) — no se proponen: el manifiesto explica por escrito por que estan abajo de la ultima`);
    for (const f of a.congelados) {
      l.push(`  ${f.paquete} ${f.rango} (ultima estable: ${f.ultima}) — ${f.ruta}, ${f.campo}; el desvio esta en ${f.desvio.declaradoEn}`);
    }
    l.push("");
  }
  if (a.desviosARevisar.length) {
    l.push(`DESVIOS QUE CONVIENE RELEER (${a.desviosARevisar.length}) — el motivo se escribio contra otra foto del registro`);
    for (const d of a.desviosARevisar) {
      l.push(`  ${d.paquete}: el desvio se razono cuando la ultima estable era ${d.desvio.ultima_estable_al_fijarlo} y hoy es ${d.ultima}. Releelo en ${d.desvio.declaradoEn} (projects.stack.desvios)`);
    }
    l.push("");
  }
  if (a.adelantados.length) {
    l.push(`DECLARADOS POR ENCIMA DE LA ULTIMA ESTABLE (${a.adelantados.length}) — no se proponen: "actualizar" aca seria BAJAR de version`);
    for (const f of a.adelantados) l.push(`  ${f.paquete} ${f.rango} (dist-tags.latest: ${f.ultima}) — ${f.ruta}, ${f.campo}`);
    l.push("");
  }
  if (a.sinEstable.length) {
    l.push(`SIN ESTABLE DECLARADA HOY (${a.sinEstable.length}) — el tag \`latest\` del publicador apunta a una prerelease, asi que no hay estable que proponer y esta herramienta no toca nada`);
    for (const f of a.sinEstable) l.push(`  ${f.paquete} ${f.rango} — el registro tiene latest = ${f.prerelease}, que es una candidata, no una estable (${f.ruta}, ${f.campo})`);
    l.push("");
  }
  if (a.sinRespuesta.length) {
    l.push(`SIN RESPUESTA DEL REGISTRO (${a.sinRespuesta.length}) — de estos NO se sabe nada: no cuentan como al dia`);
    for (const f of a.sinRespuesta) l.push(`  ${f.paquete} ${f.rango} — ${f.error} (${f.ruta}, ${f.campo})`);
    l.push("");
  }
  if (a.noComparables.length) {
    l.push(`NO COMPARABLES (${a.noComparables.length}) — su rango no es un prefijo simple + x.y.z, asi que esta herramienta no lo toca`);
    for (const f of a.noComparables) l.push(`  ${f.paquete}: ${f.motivo} (${f.ruta}, ${f.campo})`);
    l.push("");
  }
  l.push(`AL DIA (${a.alDia.length})`);
  return l;
}

// ─────────────────────── Escribir los manifiestos ───────────────────────

function escaparRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** El patron que ubica UNA declaracion dentro del texto de un package.json.
 *  Ancla el nombre Y el rango viejo: asi el reemplazo no puede caer en otra
 *  clave que se llame igual con otro valor. */
function patronDe({ campo, paquete, rango }) {
  if (campo === CAMPO_GESTOR) {
    return new RegExp(`("${escaparRegex(CAMPO_GESTOR)}"\\s*:\\s*")${escaparRegex(`${paquete}@${rango}`)}(")`, "g");
  }
  return new RegExp(`("${escaparRegex(paquete)}"\\s*:\\s*")${escaparRegex(rango)}(")`, "g");
}

function valorNuevo({ campo, paquete }, nuevo) {
  return campo === CAMPO_GESTOR ? `${paquete}@${nuevo}` : nuevo;
}

/** Reescribe rangos EN EL TEXTO, no reserializando el JSON.
 *
 *  POR QUE NO `JSON.parse` + `JSON.stringify`. Porque reescribiria el archivo
 *  entero: la sangria, el orden que ya tenia, el salto final. El diff de una
 *  actualizacion de dos versiones tiene que ser de dos lineas, o nadie lo
 *  revisa. Y estos manifiestos llevan bloques `projects.*` con parrafos largos
 *  que una reserializacion reacomoda sin que nadie lo haya pedido.
 *
 *  FALLA CERRADO EN LA AMBIGUEDAD. Si el patron no matchea exactamente UNA vez,
 *  ese cambio NO se aplica y se devuelve como rechazado con el conteo. Cero
 *  significa que el archivo cambio abajo de los pies entre la lectura y la
 *  escritura; mas de uno, que el mismo par nombre/rango aparece dos veces en el
 *  archivo (el mismo paquete en `dependencies` y en `devDependencies` con el
 *  mismo rango). En los dos casos, adivinar cual reemplazar es peor que no
 *  tocarlo. */
export function aplicarEnTexto(texto, cambios) {
  let salida = texto;
  const aplicados = [];
  const rechazados = [];
  for (const c of cambios) {
    // LA ULTIMA PUERTA ANTES DEL DISCO, y es a proposito que este repetida:
    // registro-npm.mjs ya valida la forma de lo que contesta el registro, pero
    // esta funcion es la que PEGA el texto adentro de las comillas del JSON y
    // no puede depender de que quien la llama haya filtrado. Se comprueba sobre
    // el valor ya armado (que para `packageManager` incluye el nombre leido del
    // propio manifiesto), y lo que no pasa se RECHAZA con su motivo.
    const valor = valorNuevo(c, c.nuevo);
    if (!seguroDentroDeComillas(valor)) {
      rechazados.push({
        ...c,
        motivo:
          `el valor a escribir (${JSON.stringify(valor.length > 60 ? `${valor.slice(0, 60)}…` : valor)}) trae ` +
          `caracteres que no pueden ir crudos dentro de las comillas de un package.json. NO se escribe`,
      });
      continue;
    }
    const patron = patronDe(c);
    const cuantos = (salida.match(patron) ?? []).length;
    if (cuantos !== 1) {
      rechazados.push({ ...c, motivo: cuantos === 0 ? "el rango declarado ya no esta en el archivo" : `el mismo par nombre/rango aparece ${cuantos} veces en el archivo` });
      continue;
    }
    // El reemplazo va por FUNCION y no por cadena: en una cadena de reemplazo,
    // `$&`, `$'`, `` $` `` y `$1` son sintaxis de `String.replace` y no texto.
    // Medido: con un valor terminado en `$&` el manifiesto quedaba JSON INVALIDO
    // y la herramienta igual reportaba "aplicados: 1". Con la funcion, lo que se
    // escribe es exactamente el valor.
    salida = salida.replace(patronDe(c), (_todo, abre, cierra) => `${abre}${valor}${cierra}`);
    aplicados.push(c);
  }
  return { texto: salida, aplicados, rechazados };
}

/** Puede este texto ir CRUDO adentro de las comillas de un package.json?
 *
 *  Comilla doble y barra invertida cierran o escapan la cadena; los caracteres
 *  de control son ilegales dentro de una cadena JSON sin escapar. Con los tres
 *  fuera, lo que se escribe no puede cambiar la ESTRUCTURA del manifiesto — que
 *  es la propiedad que hace falta aca, y la unica que esta funcion puede
 *  garantizar sin conocer la politica de versiones. */
export function seguroDentroDeComillas(valor) {
  return typeof valor === "string" && valor !== "" && !/["\\]/.test(valor) && !/[\u0000-\u001f\u007f]/.test(valor);
}

/** Escribe los cambios elegidos, agrupados por manifiesto. Un archivo se
 *  reescribe UNA vez con todos sus cambios, y solo si alguno se aplico. */
export function escribirCambios(raiz, cambios) {
  const porRuta = new Map();
  for (const c of cambios) {
    if (!porRuta.has(c.ruta)) porRuta.set(c.ruta, []);
    porRuta.get(c.ruta).push(c);
  }
  const aplicados = [];
  const rechazados = [];
  const archivos = [];
  for (const [rel, delArchivo] of porRuta) {
    const abs = path.join(raiz, ...rel.split("/"));
    let texto;
    try {
      texto = fs.readFileSync(abs, "utf8");
    } catch (e) {
      for (const c of delArchivo) rechazados.push({ ...c, motivo: `no pude leer ${rel}: ${e.message}` });
      continue;
    }
    const r = aplicarEnTexto(texto, delArchivo);
    rechazados.push(...r.rechazados);
    if (r.aplicados.length === 0) continue;
    try {
      fs.writeFileSync(abs, r.texto, "utf8");
    } catch (e) {
      for (const c of r.aplicados) rechazados.push({ ...c, motivo: `no pude escribir ${rel}: ${e.message}` });
      continue;
    }
    archivos.push(rel);
    aplicados.push(...r.aplicados);
  }
  return { archivos, aplicados, rechazados };
}

// ─────────────────────── Las dos preguntas ───────────────────────

/** Si la respuesta a "actualizo?" es que si. El default es NO: la pregunta se
 *  imprime `[s/N]` y un Enter distraido —o un stdin que se cierra— no puede
 *  terminar en una escritura. */
export function esQueSi(respuesta) {
  return /^(s|si|y|yes)$/i.test(String(respuesta).trim());
}

/** La segunda pregunta del dueno: TODO el stack, o solo lo que elijas.
 *  Devuelve "todo", "elegir" o null (respuesta que no es ninguna de las dos).
 *  Enter vale "todo", que es la opcion que la pregunta nombra primero. */
export function leerAlcance(respuesta) {
  const r = String(respuesta).trim().toLowerCase();
  if (r === "" || r === "todo" || r === "todos" || r === "t") return "todo";
  if (r === "elegir" || r === "e" || r === "solo" || r === "algunos") return "elegir";
  return null;
}

/** Que filas elige una respuesta como "1,4 7" o "menores".
 *
 *  Se aceptan las dos palabras porque son la distincion que el informe hace
 *  arriba y la que de verdad se usa: "los menores si, los de mayor los miro
 *  despues" es la respuesta mas frecuente a este informe, y obligar a tipear
 *  ocho numeros para expresarla invita a tipear `todo`.
 *
 *  Los numeros que no corresponden a nada se devuelven en `invalidos` en vez de
 *  ignorarse: quien escribio `12` sobre una lista de 9 tiene que enterarse, no
 *  quedarse pensando que aplico algo. */
export function seleccionar(respuesta, candidatos) {
  const r = String(respuesta).trim().toLowerCase();
  if (r === "") return { elegidos: [], invalidos: [] };
  if (r === "menores") return { elegidos: candidatos.filter((c) => c.clase === "menor"), invalidos: [] };
  if (r === "mayores") return { elegidos: candidatos.filter((c) => c.clase === "mayor"), invalidos: [] };
  if (r === "todo" || r === "todos") return { elegidos: [...candidatos], invalidos: [] };
  const elegidos = [];
  const invalidos = [];
  const vistos = new Set();
  for (const pieza of r.split(/[\s,]+/).filter(Boolean)) {
    const n = /^\d+$/.test(pieza) ? Number.parseInt(pieza, 10) : NaN;
    if (!Number.isInteger(n) || n < 1 || n > candidatos.length) {
      invalidos.push(pieza);
      continue;
    }
    if (vistos.has(n)) continue;
    vistos.add(n);
    elegidos.push(candidatos[n - 1]);
  }
  return { elegidos, invalidos };
}

/** Una pregunta por la terminal. Solo se llama con TTY. */
function preguntar(texto) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(texto, (respuesta) => {
      rl.close();
      resolve(respuesta);
    });
  });
}

/** LAS DOS PREGUNTAS DEL DUENO, en su orden, y nada mas.
 *
 *  POR QUE ES UNA FUNCION Y NO ESTA SUELTA DENTRO DE main(). Porque asi es
 *  ejercitable SIN UNA TERMINAL. `preguntar` entra como parametro: el banco
 *  (pruebas/init/versiones.test.mjs, `preguntadorDeMentira`) le pasa una que
 *  devuelve respuestas escritas de antemano y ANOTA que se
 *  pregunto, asi que puede afirmar las dos cosas que el encargo pide y que de
 *  otro modo no verifica nadie —que son dos preguntas y que van en ESE orden
 *  (primero "actualizo?", despues "todo o algunos?")—. Metido dentro de main(),
 *  la unica forma de ejercerlo seria simular un teclado, que en el banco de esta
 *  carpeta significa un pseudo-terminal y ese camino no existe en los tres
 *  sistemas operativos donde este banco corre.
 *
 *  No imprime: devuelve `dicho` (a stdout) y `avisos` (a stderr) para que quien
 *  llama los emita. Una funcion que decide y ademas escribe en la consola no se
 *  puede afirmar sin capturar la consola.
 *
 *  Y NO ESCRIBE NADA EN DISCO. Devuelve a quien actualizar; escribir es del
 *  paso siguiente. Sale con la lista vacia en cada camino que significa "no":
 *  un "no" a la primera, una segunda respuesta que no es ninguna de las dos
 *  opciones, o una seleccion que quedo vacia. */
export async function decidir({ a, candidatos, preguntar: preg }) {
  const dicho = [];
  const avisos = [];
  const nada = (linea) => {
    dicho.push(linea);
    return { elegidos: [], dicho, avisos };
  };

  // ── Pregunta 1 de 2: actualizo? ──
  const quiere = await preg(
    `1/2  Hay ${candidatos.length} paquete(s) con version mas nueva (${a.mayores.length} de MAYOR, ${a.menores.length} menor/parche). Actualizo? [s/N] `,
  );
  if (!esQueSi(quiere)) return nada("No se actualizo nada. Ningun archivo fue modificado.");

  // ── Pregunta 2 de 2: a TODO el stack, o solo a lo que elijas? ──
  const cuales = await preg(
    `2/2  Lo aplico a TODO el stack (${candidatos.length} declaracion(es) en ${new Set(candidatos.map((c) => c.ruta)).size} manifiesto(s)) o solo a lo que elijas? [todo/elegir] `,
  );
  const alcance = leerAlcance(cuales);
  if (alcance === null) {
    return nada(`No entendi "${String(cuales).trim()}": se esperaba "todo" o "elegir". No se actualizo nada.`);
  }

  let elegidos = candidatos;
  if (alcance === "elegir") {
    // La repregunta de "cuales" NO es una tercera pregunta del encargo: es la
    // continuacion de la segunda, y solo aparece en la rama que la pidio.
    const respuesta = await preg(
      `     Cuales? Numeros separados por coma (los del informe de arriba), o "menores" para los ${a.menores.length} que no son de mayor, o "mayores" para los ${a.mayores.length} que si: `,
    );
    const s = seleccionar(respuesta, candidatos);
    for (const malo of s.invalidos) {
      avisos.push(`::warning::"${malo}" no es ninguno de los numeros del informe (van del 1 al ${candidatos.length}): se ignora`);
    }
    elegidos = s.elegidos;
  }

  if (elegidos.length === 0) return nada("No quedo ninguno seleccionado. No se actualizo nada.");
  return { elegidos, dicho, avisos };
}

// ─────────────────────── El programa ───────────────────────

export function lineasDeUso() {
  return [
    "uso: node herramientas/projects-versiones.mjs [--raiz <ruta>] [--solo-informe]",
    "",
    "  Compara lo que el stack DECLARA contra la ultima estable publicada en el registro",
    "  de npm, y —solo si hay terminal— pregunta si actualizar y si aplicarlo a todo el",
    "  stack o solo a lo que elijas. Escribe package.json y NUNCA el lockfile.",
    "",
    "  --raiz <ruta>     el arbol a mirar. Por defecto, el andamio del marco (plantilla/).",
    "                    Apuntalo a un proyecto ya instanciado para revisar ESE stack",
    "  --solo-informe    imprime y sale, sin preguntar nada, aunque haya terminal",
    "  --help, -h        esto",
    "",
    "  Sin terminal (en CI, o con la salida redirigida) NO pregunta ni escribe: imprime",
    "  el informe y sale 0. Sin red, avisa y sale 0: no tener registro alcanzable no es",
    "  un fallo del proyecto.",
  ];
}

function argumentos(argv) {
  const o = { soloInforme: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--raiz") {
      const v = argv[++i];
      if (v === undefined) throw new Error("--raiz necesita un valor");
      o.raiz = v;
    } else if (argv[i] === "--solo-informe") o.soloInforme = true;
    else if (argv[i] === "--help" || argv[i] === "-h") o.ayuda = true;
    else throw new Error(`argumento desconocido: ${argv[i]}`);
  }
  return o;
}

/** Hay TTY? Se pregunta por `process.stdin.isTTY` y no por `process.stdout`: lo
 *  que hace falta para una pregunta es que haya alguien que pueda CONTESTAR. Con
 *  la salida redirigida a un archivo y el teclado disponible, preguntar sigue
 *  teniendo sentido; al reves —salida a la terminal y stdin cerrado, que es como
 *  corre un paso de CI— la pregunta no la contesta nadie nunca. */
export function hayTerminal(std = process.stdin) {
  return Boolean(std?.isTTY);
}

async function main(argv) {
  let o;
  try {
    o = argumentos(argv);
  } catch (e) {
    console.error(`::error::${e.message}`);
    for (const linea of lineasDeUso()) console.error(linea);
    return 2;
  }
  if (o.ayuda) {
    for (const linea of lineasDeUso()) process.stdout.write(`${linea}\n`);
    return 0;
  }

  const raiz = path.resolve(o.raiz ?? RAIZ_POR_DEFECTO);
  if (!fs.existsSync(raiz)) {
    console.error(`::error::no encontre el arbol a mirar: ${raiz}. Con --raiz <ruta> se apunta a otro (por ejemplo, un proyecto ya instanciado)`);
    return 1;
  }

  const { manifiestos, declaraciones, desvios, problemas } = leerArbol(raiz);
  for (const p of problemas) console.error(`::warning::${p}`);
  if (manifiestos.length === 0) {
    console.error(`::error::no hay ningun package.json en ${raiz}, asi que no hay ninguna version declarada que comparar. Si apuntaste --raiz a la raiz del clon del marco, lo que declara el stack es plantilla/ (que es el default de esta herramienta)`);
    return 1;
  }
  if (declaraciones.length === 0) {
    console.error(`::error::los ${manifiestos.length} manifiesto(s) de ${raiz} no declaran una sola dependencia. NO se declara "todo al dia" sobre cero mediciones`);
    return 1;
  }

  const registro = registroDe();
  console.log(`consultando ${new Set(declaraciones.map((d) => d.paquete)).size} paquete(s) en ${registro} (una sola pasada, en paralelo, ${TIMEOUT_POR_DEFECTO} ms de techo por paquete)`);
  const ultimas = await consultarEtiquetasDe(declaraciones.map((d) => d.paquete), { registro });

  // SIN RED NO ES UN FALLO. Si NINGUNA consulta volvio, lo que hay es un
  // problema de conectividad y no un stack atrasado: se avisa, se dice como
  // reintentar y se sale 0. Distinguirlo de "algunas fallaron" importa, porque
  // una sola caida es ruido del registro y todas juntas son la red.
  const conRespuesta = [...ultimas.values()].filter((r) => r.latest !== null).length;
  if (conRespuesta === 0) {
    const primero = [...ultimas.values()][0];
    console.error(
      `::warning::no se pudo consultar NINGUNO de los ${ultimas.size} paquetes en ${registro} (el primero fallo con: ` +
        `${primero?.error ?? "sin detalle"}). Eso es falta de red o un registro inalcanzable, no un stack atrasado: ` +
        `no se compara nada y no se escribe nada. Reintenta cuando tengas red, o apunta la variable ` +
        `PROJECTS_REGISTRO_NPM al espejo interno que si alcances.`,
    );
    return 0;
  }

  const a = analizar({ declaraciones, ultimas, desvios });
  const candidatos = propuestas(a).map((f) => ({ ...f, clase: a.mayores.includes(f) ? "mayor" : "menor" }));
  const interactivo = hayTerminal() && !o.soloInforme;

  for (const linea of lineasDelInforme(a, { manifiestos, registro, numerar: interactivo && candidatos.length > 0 })) {
    console.log(linea);
  }
  console.log("");

  if (candidatos.length === 0) {
    console.log("No hay nada que actualizar: ninguna dependencia comparable esta atras de su ultima estable.");
    return 0;
  }

  if (!interactivo) {
    console.log(
      o.soloInforme
        ? `Hay ${candidatos.length} paquete(s) atras de su ultima estable (${a.mayores.length} de MAYOR). Se pidio --solo-informe: no se pregunta ni se escribe nada.`
        : `Hay ${candidatos.length} paquete(s) atras de su ultima estable (${a.mayores.length} de MAYOR). NO hay terminal (stdin no es un TTY), asi que no hay a quien preguntarle: no se escribe nada y esto sale 0. Corre este mismo comando desde una terminal para decidir la actualizacion.`,
    );
    return 0;
  }

  const { elegidos, dicho, avisos } = await decidir({ a, candidatos, preguntar });
  for (const linea of avisos) console.error(linea);
  for (const linea of dicho) console.log(linea);
  if (elegidos.length === 0) return 0;

  const r = escribirCambios(raiz, elegidos);
  for (const rechazado of r.rechazados) {
    console.error(`::warning::${rechazado.paquete} en ${rechazado.ruta} NO se actualizo: ${rechazado.motivo}`);
  }
  if (r.aplicados.length === 0) {
    console.error("::error::no se pudo aplicar ni un solo cambio. Los motivos estan arriba, uno por paquete. Ningun archivo quedo a medias: cada manifiesto se reescribe entero o no se toca");
    return 1;
  }
  console.log("");
  console.log(`escritos ${r.archivos.length} manifiesto(s), ${r.aplicados.length} rango(s) actualizado(s):`);
  for (const c of r.aplicados) console.log(`  ${c.ruta}  ${c.paquete}  ${c.rango} -> ${c.nuevo}`);
  console.log("");
  console.log("EL LOCKFILE NO SE TOCO: mover versiones declaradas y bajar paquetes son dos cosas, y la segunda");
  console.log("es del install. Lo que sigue, en la raiz del arbol que acabas de cambiar:");
  console.log("  pnpm install        baja las versiones nuevas y actualiza el lockfile");
  console.log("  pnpm verificar      dice si el stack sigue en verde con ellas");
  if (elegidos.some((c) => c.clase === "mayor")) {
    console.log("");
    console.log("Y aplicaste al menos un salto de MAYOR: esos cambian de linea principal, asi que un rojo de");
    console.log("`pnpm verificar` despues de esto es esperable y es el momento de leer sus notas de version.");
    console.log("Volver atras es revertir estos package.json — el lockfile no se movio.");
  }
  return 0;
}

function meInvocaronAMi() {
  try {
    return fs.realpathSync(ESTE_ARCHIVO) === fs.realpathSync(process.argv[1] ?? "");
  } catch {
    return false;
  }
}

// La misma red de ultima instancia que projects-init.mjs, y por el mismo motivo:
// una excepcion que ningun control atrapa tiene que salir como ::error:: con su
// codigo elegido, no como volcado del runtime. Aca ademas se dice lo unico que
// hace falta saber despues de un fallo: si quedo algo escrito o no.
if (meInvocaronAMi()) {
  main(process.argv.slice(2))
    .then((codigo) => process.exit(codigo))
    .catch((e) => {
      console.error(
        `::error::la corrida murio con una excepcion que ningun control de esta herramienta atrapo: ` +
          `${e?.code ? `${e.code} — ` : ""}${e?.message ?? e}`,
      );
      console.error(
        "Eso es un defecto de esta herramienta, no de como la corriste. Los manifiestos se reescriben de a uno " +
          "y enteros, asi que ninguno queda a medias; lo que puede haber pasado es que algunos ya se hayan " +
          "escrito y otros no. Revisa el diff antes de reintentar. Lo que sigue es la traza, para reportarlo:",
      );
      console.error(e?.stack ?? String(e));
      process.exit(1);
    });
}
