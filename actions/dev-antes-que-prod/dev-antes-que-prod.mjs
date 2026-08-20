#!/usr/bin/env node
// dev-antes-que-prod: el invariante que vuelve verificable el dogfooding del marco.
//
// La propiedad, en una línea:
//
//   Ninguna pieza referenciada del marco que ejecute un job de producción puede
//   faltar en el tramo de dev de la MISMA promoción, en la misma versión.
//
// Por qué existe. Projects no despliega nada, así que no puede ejercitar por sí
// mismo la mecánica de entrega que publica; y la mitad de producción de una
// promoción no corre en ningún ensayo previo, porque por spec un disparo manual
// sobre una rama de trabajo deja los jobs de producción sin ejecutar (capability
// `despliegue-ci`, escenario "Disparo manual sobre una rama de trabajo"). El
// hueco no se cierra con un canario ni con un reusable completo: se cierra
// bajando la unidad de distribución a la compuerta, y entonces la misma pieza,
// en la misma versión, corrió en el tramo de dev del mismo run minutos antes.
// Este check es lo que convierte ese argumento en propiedad, en vez de confiar
// en que alguien lo recuerde.
//
// ESTE CHECK NACE ANTES QUE LA PRIMERA PIEZA, Y NO ES UN DETALLE DE ORDEN. Si
// naciera después, su primera corrida verde no probaría nada: no habría nada que
// verificar, y el verde sería indistinguible de un check roto. El mismo criterio
// de secuencia que funcionó en `marco-se-cumple-solo`: primero el banco de
// pruebas, después la pieza, después el consumidor, y el tag al final.
//
// -------------------------------------------------------------------------
// EL PROBLEMA DE DISEÑO, ESCRITO ANTES DE LA PRIMERA LÍNEA DE CÓDIGO
//
// El invariante es ESTÁTICO (esto lee YAML, no logs) y sus tres agujeros son
// DINÁMICOS (son caminos de ejecución). Un lector de YAML no puede saber cuál
// `if:` disparó en un run concreto: en el consumidor real la diferencia entre
// "pieza solo en prod" (rojo) y "dispatch de emergencia" (verde por excepción)
// no vive en la lista de `uses:`, vive en las expresiones `if:` y en un output
// calculado en runtime.
//
// De ahí la decisión central: este check NO clasifica caminos por observación.
// Exige que la topología DECLARE sus vías sin tramo de dev, con un vocabulario
// CERRADO de nombres que el verificador conoce. Si se implementara por
// heurística sobre las expresiones `if:`, la primera reescritura de una
// condición en el consumidor lo volvería fail-open silencioso, que es
// exactamente lo que el marco prohíbe y lo que ya pasó con el 403 de
// `actions: read` (fail-open que tapó una función del pipeline una semana).
//
// Regla dura del marco que gobierna cada rama de este script: el fail-open en
// silencio está prohibido. Lo que no se puede verificar es ROJO, nunca éxito
// mudo. Y el verde vacuo se DICE, para que no se confunda con un check apagado.
//
// -------------------------------------------------------------------------
// Uso:  node dev-antes-que-prod.mjs
// Variables de entorno (opcionales):
//   DAP_RAIZ        raíz del repo a verificar (default: toplevel de git, o cwd)
//   DAP_WORKFLOWS   directorio de definiciones (default: .github/workflows)
//   DAP_MARCO       identidad <org>/<repo> del marco (default: la de Projects)
// Sale 1 si el invariante no se cumple, si una vía no está declarada, o si un
// archivo no se pudo leer con confianza. Los avisos no cambian el exit code.

import { spawnSync } from "node:child_process";
import { appendFileSync, readFileSync, readdirSync, realpathSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** Identidad del MARCO, no de un proyecto: es el repositorio que publica las
 *  piezas. Es input para que un fork siga funcionando sin editar el script. */
export const MARCO_POR_DEFECTO = "im-diego-ec/Projects";

// ---------------------------------------------------------------------------
// EL VOCABULARIO CERRADO DE VÍAS SIN TRAMO DE DEV
//
// Las tres excepciones del spec, más `ninguna`. Cerrado a propósito: una vía
// nueva se declara ANTES de existir, porque un agujero descubierto después es
// indistinguible de un invariante que nunca se cumplió. Agregar una entrada acá
// es un change de OpenSpec en Projects, no una línea que alguien suma en un repo.
//
// Cada vía viaja con su CONTROL COMPENSATORIO escrito, y el verificador lo
// imprime en cada corrida. Una excepción que se aplica en silencio es un
// fail-open silencioso: el nombre tiene que salir en el log, siempre.
// ---------------------------------------------------------------------------
export const VIAS = {
  "rollback-a-artefacto-publicado": {
    descripcion: "rollback a un artefacto que ya estuvo en producción, sin tramo de dev en ese run",
    control: "la existencia del artefacto se valida contra el registro ANTES de que el servicio se toque",
  },
  "dispatch-de-emergencia": {
    descripcion: "disparo manual de emergencia sobre la rama de integración, que salta dev por diseño",
    control: "hereda el riesgo que esa vía siempre tuvo y queda registrado en el historial del proveedor de CI",
  },
  "reuso-de-verificacion-de-dev": {
    descripcion: "reuso de una verificación de dev anterior sobre contenido idéntico",
    control: "la ventana es acotada, y el residuo se acota porque mover el tag mayor es un acto humano deliberado",
  },
  ninguna: {
    descripcion: "no hay vía que alcance producción sin el tramo de dev de la misma promoción",
    control: "se comprueba contra el grafo de dependencias del archivo, no se toma como palabra",
  },
};

/** La marca que un consumidor escribe DENTRO del job de producción.
 *
 *  Por qué un comentario y no una clave de YAML: GitHub rechaza claves
 *  desconocidas en un job ("Unexpected value"), y actionlint también. Un
 *  comentario es el único lugar donde metadata del marco puede viajar adentro
 *  de un job sin que la definición deje de ser válida. Es la misma convención
 *  de marca que ya usa la constitución (`projects:regla id=...`), sin dialecto
 *  nuevo. */
export const MARCA_VIA = /projects:sin-tramo-de-dev[ \t]+via=([A-Za-z0-9._-]+)/g;

// ---------------------------------------------------------------------------
// REGISTRO DE MECÁNICAS COPIADAS  (el aviso, que NUNCA es rojo)
//
// Mapea una pieza YA PUBLICADA a la firma de la mecánica que reemplaza, para
// avisarle a un repositorio que conserva la copia. Es el ítem "adopción de lo
// referenciado" de la revisión trimestral convertido en señal automática.
//
// POR QUÉ NACE VACÍO, y es la respuesta honesta y no una omisión: hoy el marco
// no publica todavía ninguna compuerta de ENTREGA, así que no hay pieza que
// nombrar. Un aviso que nombra una pieza inexistente es peor que no avisar, y un
// aviso que sale en cada corrida deja de leerse (ya pasó en este repo: acotar
// por directorio hacía avisar al propio Projects en cada run). La primera entrada
// la agrega el change que publique la primera compuerta, y es UNA LÍNEA porque
// el mecanismo ya está acá y probado.
//
// El aviso NO falla el pipeline a propósito: la adopción es trabajo deliberado
// por compuerta, y un check que ponga rojo a un repositorio que no modificó una
// sola línea rompe repos ajenos en silencio.
// ---------------------------------------------------------------------------
export const MECANICAS_COPIADAS = [];

/** Un comando de workflow termina en el salto de línea y trata "%" como escape:
 *  sin normalizar, un mensaje con "%" se mutila solo. */
export function escapar(valor) {
  return String(valor).replace(/%/g, "%25").replace(/\r/g, "%0D").replace(/\n/g, "%0A");
}

/** Indentación en ESPACIOS de una línea, o -1 si la línea trae un tab en la
 *  zona de indentación. YAML prohíbe tabs para indentar, así que un tab acá no
 *  es un estilo distinto: es un archivo que no se puede leer con confianza, y
 *  eso es rojo en vez de una lectura optimista. */
export function indentacion(linea) {
  const m = /^([ \t]*)/.exec(linea)[1];
  return m.includes("\t") ? -1 : m.length;
}

const esVacia = (linea) => /^\s*$/.test(linea);
const esComentario = (linea) => /^\s*#/.test(linea);

/** Lee la lista de nombres de `needs:`, en cualquiera de sus tres formas:
 *  `needs: a`, `needs: [a, b]` y la lista en bloque. Devuelve null cuando la
 *  forma es en bloque y hay que seguir leyendo las líneas siguientes. */
function needsEnLinea(valor) {
  const bruto = valor.trim();
  if (bruto === "") return null;
  const flow = /^\[(.*)\]$/.exec(bruto);
  const cuerpo = flow ? flow[1] : bruto;
  return cuerpo
    .split(",")
    .map((n) => n.trim().replace(/^["']|["']$/g, ""))
    .filter((n) => n !== "");
}

/**
 * Escáner de definiciones de pipeline, orientado a líneas y a indentación
 * relativa.
 *
 * POR QUÉ NO SE PARSEA EL YAML DE VERDAD. El marco no tiene dependencias: sus
 * guardrails corren con el Node del runner y nada más. Traer un parser de YAML
 * para este check sería la única dependencia del repo, y el precedente en
 * contra ya está escrito en el paso hermano del verificador: GitHub PROHÍBE
 * expresiones en el campo `uses:`, así que la referencia a una pieza es siempre
 * literal, y un ancla exacta alcanza para leerla.
 *
 * LÍMITES DECLARADOS, y todos caen del lado ROJO (nunca verde mudo):
 *   - `jobs:` tiene que estar en estilo bloque. `jobs: {a: {...}}` no se lee.
 *   - Tabs en la indentación no se leen.
 *   - Anclas y alias de YAML (`&x`, `*x`) no se resuelven: un job armado por
 *     alias se reporta como no legible.
 *   - Una promoción PARTIDA EN DOS ARCHIVOS (dev en uno, producción en otro,
 *     encadenados por `workflow_run`) se evalúa por archivo, así que la pieza
 *     de producción se lee como "sin tramo de dev" y sale ROJO. Es el lado
 *     conservador a propósito: si hiciera falta habilitar esa forma, es una vía
 *     nueva y se declara ANTES de existir, no se descubre después.
 */
export function leerWorkflow(texto, { archivo = "(sin nombre)" } = {}) {
  const lineas = texto.split(/\r?\n/);
  const problemas = [];
  const jobs = [];

  let iJobs = -1;
  for (let i = 0; i < lineas.length; i += 1) {
    const linea = lineas[i];
    if (esVacia(linea) || esComentario(linea)) continue;
    const m = /^(\s*)jobs:(.*)$/.exec(linea);
    if (!m) continue;
    if (indentacion(linea) !== 0) continue;
    if (m[2].trim() !== "" && !m[2].trim().startsWith("#")) {
      problemas.push(`${archivo}:${i + 1}: 'jobs:' viene en estilo flujo y este verificador solo lee estilo bloque`);
      return { jobs, problemas, esWorkflow: true };
    }
    iJobs = i;
    break;
  }

  // Un archivo sin `jobs:` no es una promoción: no es un problema, no es un
  // workflow que este check tenga algo que decir sobre él.
  if (iJobs === -1) return { jobs, problemas, esWorkflow: false };

  let indentJob = -1;
  let actual = null;
  let pendientes = [];

  const cerrar = () => {
    if (actual) jobs.push(actual);
    actual = null;
  };

  for (let i = iJobs + 1; i < lineas.length; i += 1) {
    const linea = lineas[i];
    const numero = i + 1;

    if (esVacia(linea)) continue;

    if (esComentario(linea)) {
      // Se bufferean: un comentario pegado ARRIBA del id de un job es la forma
      // natural de anotarlo, y también vale escrito adentro del bloque. Las dos
      // se aceptan para que la declaración no dependa de recordar cuál era.
      pendientes.push({ numero, texto: linea });
      continue;
    }

    const ind = indentacion(linea);
    if (ind === -1) {
      problemas.push(`${archivo}:${numero}: la indentación trae un tab y el YAML no se puede leer con confianza`);
      return { jobs, problemas, esWorkflow: true };
    }

    if (ind === 0) {
      // Volvimos al nivel raíz: el mapa de jobs terminó.
      cerrar();
      break;
    }

    if (indentJob === -1) indentJob = ind;

    if (ind === indentJob) {
      const m = /^\s*([A-Za-z_][A-Za-z0-9_.-]*):\s*(#.*)?$/.exec(linea);
      if (m) {
        cerrar();
        actual = {
          id: m[1],
          archivo,
          numero,
          indentJob: ind,
          indentClave: -1,
          esProduccion: false,
          needs: [],
          usos: [],
          vias: [],
          lineas: [],
          leyendoNeeds: false,
        };
        // El buffer de comentarios que venía justo arriba pasa a ser de ESTE job.
        for (const c of pendientes) actual.lineas.push(c);
        pendientes = [];
        continue;
      }
      if (/^\s*[-*&]/.test(linea)) {
        problemas.push(`${archivo}:${numero}: el mapa de jobs trae una forma que este verificador no lee (lista, ancla o alias)`);
        return { jobs, problemas, esWorkflow: true };
      }
    }

    if (!actual) continue;

    // Los comentarios bufferados que estaban dentro del bloque son de este job.
    for (const c of pendientes) actual.lineas.push(c);
    pendientes = [];
    actual.lineas.push({ numero, texto: linea });

    if (actual.indentClave === -1 || ind < actual.indentClave) actual.indentClave = ind;
    const esClaveDelJob = ind === actual.indentClave;

    // `needs:` en bloque: las líneas `- nombre` que siguen a la clave.
    if (actual.leyendoNeeds) {
      const item = /^\s*-\s*(.+?)\s*$/.exec(linea);
      if (item && ind > actual.indentClave) {
        actual.needs.push(item[1].replace(/^["']|["']$/g, ""));
        continue;
      }
      actual.leyendoNeeds = false;
    }

    if (esClaveDelJob) {
      const mNeeds = /^\s*needs:(.*)$/.exec(linea);
      if (mNeeds) {
        const lista = needsEnLinea(mNeeds[1]);
        if (lista === null) actual.leyendoNeeds = true;
        else actual.needs.push(...lista);
        continue;
      }
      // `environment:` como clave DIRECTA del job es lo que marca el tramo de
      // producción. Se exige que sea clave directa y no cualquier aparición
      // para no confundirla con un input llamado igual dentro de un `with:`.
      if (/^\s*environment:/.test(linea)) {
        actual.esProduccion = true;
        continue;
      }
    }

    // El ancla del `uses:` es la misma del paso hermano del verificador, y por
    // el mismo motivo: descarta las líneas comentadas, que son la forma más
    // fácil de "cablear" algo sin cablearlo.
    const mUses = /^\s*(-\s+)?uses:\s*(\S+)/.exec(linea);
    if (mUses) actual.usos.push({ numero, ref: mUses[2].replace(/^["']|["']$/g, "") });
  }

  cerrar();

  for (const job of jobs) {
    for (const { numero, texto } of job.lineas) {
      MARCA_VIA.lastIndex = 0;
      let m;
      while ((m = MARCA_VIA.exec(texto)) !== null) job.vias.push({ numero, via: m[1] });
    }
    job.texto = job.lineas.map((l) => l.texto).join("\n");
  }

  return { jobs, problemas, esWorkflow: true };
}

/** De un `uses:` saca la pieza del marco, o null si no lo es.
 *  Forma estable: <org>/<repo>/actions/<nombre>@<ref>
 *
 *  Se lee SOLO `actions/`: un `uses:` a nivel de job apuntando a un workflow
 *  reusable del marco no es una compuerta de entrega, y meterlo acá haría que
 *  el propio verificador se contara como pieza de producción. */
export function piezaDelMarco(ref, marco = MARCO_POR_DEFECTO) {
  const escapado = marco.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const m = new RegExp(`^${escapado}/actions/([A-Za-z0-9_-]+)@(.+)$`).exec(ref);
  return m ? { nombre: m[1], version: m[2], id: `${m[1]}@${m[2]}` } : null;
}

/** Cierre transitivo de `needs:` de un job. */
export function dependenciasDe(idJob, porId) {
  const vistos = new Set();
  const pila = [...(porId.get(idJob)?.needs ?? [])];
  while (pila.length) {
    const id = pila.pop();
    if (vistos.has(id)) continue;
    vistos.add(id);
    pila.push(...(porId.get(id)?.needs ?? []));
  }
  return vistos;
}

/**
 * El veredicto de un archivo. Devuelve rojos, avisos y notas, sin imprimir
 * nada: así el banco de pruebas afirma sobre los datos y no sobre un log.
 */
export function evaluar({ jobs, problemas = [], archivo = "(sin nombre)", marco = MARCO_POR_DEFECTO, mecanicas = MECANICAS_COPIADAS }) {
  const rojos = [];
  const avisos = [];
  const notas = [];

  for (const p of problemas) {
    rojos.push({ tipo: "ilegible", mensaje: `no se pudo leer la definición con confianza: ${p}. Sin poder leerla, el invariante no se da por cumplido` });
  }
  if (rojos.length) return { rojos, avisos, notas, piezasProd: [], piezasDev: [] };

  const porId = new Map(jobs.map((j) => [j.id, j]));
  const prod = jobs.filter((j) => j.esProduccion);
  const dev = jobs.filter((j) => !j.esProduccion);

  const piezasDe = (job) => job.usos.map((u) => ({ ...u, pieza: piezaDelMarco(u.ref, marco) })).filter((u) => u.pieza);

  // Índice del tramo de dev: id completo (nombre@version) y nombre suelto. El
  // segundo existe para poder decir "está, pero en otra versión", que es un
  // error distinto y muchísimo más probable que el de olvidarse la pieza.
  const devPorId = new Map();
  const devPorNombre = new Map();
  for (const job of dev) {
    for (const { pieza } of piezasDe(job)) {
      if (!devPorId.has(pieza.id)) devPorId.set(pieza.id, []);
      devPorId.get(pieza.id).push(job.id);
      if (!devPorNombre.has(pieza.nombre)) devPorNombre.set(pieza.nombre, new Map());
      const versiones = devPorNombre.get(pieza.nombre);
      if (!versiones.has(pieza.version)) versiones.set(pieza.version, []);
      versiones.get(pieza.version).push(job.id);
    }
  }

  const piezasProd = [];
  const piezasDev = [...devPorId.keys()];

  for (const job of prod) {
    const usadas = piezasDe(job);
    if (usadas.length === 0) continue;
    for (const { pieza } of usadas) piezasProd.push(pieza.id);

    // ---- Regla A: el cableado. Es la única parte del invariante que se puede
    // afirmar leyendo el archivo, y es la que se pone roja.
    for (const { numero, pieza } of usadas) {
      if (devPorId.has(pieza.id)) continue;
      const otras = [...(devPorNombre.get(pieza.nombre)?.keys() ?? [])];
      const detalle = otras.length
        ? `el tramo de dev la ejecuta pero en otra versión (${otras.join(", ")}), y "la misma pieza" incluye la versión: dev verificaría con un código distinto del que producción ejecuta`
        : "ningún job del tramo de dev de este archivo la ejecuta";
      rojos.push({
        tipo: "sin-tramo-de-dev",
        pieza: pieza.id,
        job: job.id,
        numero,
        mensaje:
          `${archivo}:${numero}: el job de producción '${job.id}' ejecuta la pieza '${pieza.id}' del marco y ${detalle}. ` +
          `Arreglo: que un job del tramo de dev de esta misma promoción ejecute '${pieza.id}' antes, o que la pieza no corra en producción`,
      });
    }

    // ---- Regla B: la declaración de vías, con vocabulario CERRADO.
    const declaradas = job.vias.map((v) => v.via);
    if (declaradas.length === 0) {
      rojos.push({
        tipo: "sin-declaracion",
        job: job.id,
        numero: job.numero,
        mensaje:
          `${archivo}:${job.numero}: el job de producción '${job.id}' ejecuta piezas del marco y no declara por qué vías puede alcanzar producción sin el tramo de dev de la misma promoción. ` +
          `Una vía que no está declarada es indistinguible de un invariante que nunca se cumplió. Arreglo: escribí dentro del job una línea por vía, ` +
          `'# projects:sin-tramo-de-dev via=<nombre>', con alguno de estos nombres: ${Object.keys(VIAS).join(", ")}`,
      });
      continue;
    }

    for (const { numero, via } of job.vias) {
      if (!VIAS[via]) {
        rojos.push({
          tipo: "via-no-declarada",
          job: job.id,
          via,
          numero,
          mensaje:
            `${archivo}:${numero}: el job '${job.id}' declara la vía '${via}', que el marco no reconoce. ` +
            `El vocabulario es CERRADO (${Object.keys(VIAS).join(", ")}): una vía nueva se declara ANTES de existir, con su control compensatorio, ` +
            `y eso es un change de OpenSpec en el marco, no una línea nueva en este repo`,
        });
        continue;
      }
      // Una excepción aplicada en silencio es un fail-open silencioso: el
      // nombre y su control compensatorio salen en el log en cada corrida.
      notas.push({
        tipo: "via",
        job: job.id,
        via,
        mensaje: `${archivo}:${numero}: '${job.id}' declara la vía '${via}' (${VIAS[via].descripcion}). Control compensatorio: ${VIAS[via].control}`,
      });
    }

    // ---- Regla C: coherencia de `ninguna` contra el grafo de dependencias.
    // Es la mitad que NO se toma como palabra: si el job dice que no hay vía
    // sin tramo de dev, entonces tiene que depender de los jobs de dev que le
    // dan las piezas. Sin esta comprobación, `ninguna` sería una declaración
    // que se firma sola.
    if (declaradas.includes("ninguna")) {
      const otras = declaradas.filter((v) => v !== "ninguna");
      if (otras.length) {
        rojos.push({
          tipo: "ninguna-con-otras",
          job: job.id,
          numero: job.numero,
          mensaje: `${archivo}:${job.numero}: '${job.id}' declara 'ninguna' y además ${otras.join(", ")}. 'ninguna' significa que no hay ninguna otra vía: o sobra una, o sobra la otra`,
        });
      }
      const alcanzables = dependenciasDe(job.id, porId);
      for (const { pieza } of usadas) {
        const proveedores = devPorId.get(pieza.id) ?? [];
        if (proveedores.length === 0) continue; // ya salió rojo por la regla A
        if (proveedores.some((id) => alcanzables.has(id))) continue;
        rojos.push({
          tipo: "ninguna-contradicha",
          job: job.id,
          pieza: pieza.id,
          numero: job.numero,
          mensaje:
            `${archivo}:${job.numero}: '${job.id}' declara la vía 'ninguna' para la pieza '${pieza.id}', pero no depende (ni transitivamente) de ningún job del tramo de dev que la ejecute (${proveedores.join(", ")}). ` +
            `O sea que existe un run donde producción corre y dev no corrió: esa vía existe y no está declarada`,
        });
      }
    }
  }

  // ---- Regla D: el aviso, que nunca es rojo.
  for (const job of jobs) {
    for (const mecanica of mecanicas) {
      if (!mecanica.firma.test(job.texto)) continue;
      const yaUsa = piezasDe(job).some((u) => u.pieza.nombre === mecanica.pieza);
      if (yaUsa) continue;
      avisos.push({
        tipo: "mecanica-copiada",
        job: job.id,
        pieza: mecanica.pieza,
        numero: job.numero,
        mensaje:
          `${archivo}:${job.numero}: el job '${job.id}' conserva mecánica copiada que el marco ya publica como pieza referenciada: '${mecanica.pieza}' (${mecanica.descripcion}). ` +
          `Esto NO falla el pipeline a propósito: la adopción es trabajo deliberado por compuerta`,
      });
    }
  }

  return { rojos, avisos, notas, piezasProd: [...new Set(piezasProd)], piezasDev };
}

/** Las definiciones de pipeline del directorio, en orden estable.
 *
 *  Se lee el DIRECTORIO y no `git ls-files`, al revés que el resto de los
 *  guardrails del marco, y la razón es que acá las dos listas coinciden por
 *  construcción: el proveedor de CI solo ejecuta definiciones versionadas, así
 *  que un archivo sin rastrear no puede ser parte de ninguna promoción. Donde
 *  esa equivalencia no vale (un manifiesto de paquete, un artefacto generado) el
 *  universo sí tiene que salir de git, y ahí los guardrails hermanos lo hacen. */
export function definiciones(raiz, directorio) {
  const dir = join(raiz, directorio);
  let entradas;
  try {
    if (!statSync(dir).isDirectory()) return [];
    entradas = readdirSync(dir);
  } catch {
    return [];
  }
  return entradas.filter((n) => /\.ya?ml$/i.test(n)).sort().map((n) => join(directorio, n));
}

function raizDeGit() {
  const r = spawnSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" });
  return r.status === 0 ? r.stdout.trim() : process.cwd();
}

function resumir(lineas) {
  const destino = process.env.GITHUB_STEP_SUMMARY;
  if (!destino || lineas.length === 0) return;
  try {
    appendFileSync(destino, `${lineas.join("\n")}\n`);
  } catch {
    // El resumen es cortesía; su ausencia no cambia ningún veredicto.
  }
}

export async function main() {
  const raiz = resolve(process.env.DAP_RAIZ || raizDeGit());
  const directorio = process.env.DAP_WORKFLOWS || ".github/workflows";
  const marco = process.env.DAP_MARCO || MARCO_POR_DEFECTO;

  const archivos = definiciones(raiz, directorio);
  if (archivos.length === 0) {
    // Verde, y DICHO. Un repo sin definiciones de pipeline no tiene promoción
    // que verificar; callarse acá haría indistinguible este caso de un check
    // que se rompió y no miró nada.
    console.log(`::notice::no hay definiciones de pipeline en ${directorio}: no hay promoción que verificar, el invariante dev-antes-que-prod es vacuamente verdadero`);
    return 0;
  }

  const rojos = [];
  const avisos = [];
  const notas = [];
  let conProd = 0;
  let piezasEnProd = 0;

  for (const relativa of archivos) {
    let texto;
    try {
      texto = readFileSync(join(raiz, relativa), "utf8");
    } catch (e) {
      rojos.push({ mensaje: `${relativa}: no se pudo leer (${e.code ?? e.message}). Sin poder leerla, el invariante no se da por cumplido` });
      continue;
    }
    const leido = leerWorkflow(texto, { archivo: relativa });
    if (!leido.esWorkflow) continue;
    const informe = evaluar({ ...leido, archivo: relativa, marco });
    rojos.push(...informe.rojos);
    avisos.push(...informe.avisos);
    notas.push(...informe.notas);
    if (leido.jobs.some((j) => j.esProduccion)) conProd += 1;
    piezasEnProd += informe.piezasProd.length;
  }

  for (const n of notas) console.log(`::notice::${escapar(n.mensaje)}`);
  for (const a of avisos) console.log(`::warning::${escapar(a.mensaje)}`);
  for (const r of rojos) console.log(`::error::${escapar(r.mensaje)}`);

  const resumen = ["### Invariante dev-antes-que-prod", ""];
  if (rojos.length) {
    resumen.push(`${rojos.length} hallazgo(s) que fallan el job:`, "");
    for (const r of rojos) resumen.push(`- ${r.mensaje}`);
  } else if (piezasEnProd === 0) {
    resumen.push("Verde vacuo: ningún job de producción ejecuta piezas referenciadas del marco.");
  } else {
    resumen.push(`Verde: las ${piezasEnProd} pieza(s) del marco que corren en producción se ejecutan antes en el tramo de dev de la misma promoción.`);
  }
  resumir(resumen);

  if (rojos.length) {
    console.error(`${rojos.length} hallazgo(s): el invariante dev-antes-que-prod no se cumple.`);
    console.error("Reproducilo local, desde la raíz del repo:  node <ruta-a-la-action>/dev-antes-que-prod.mjs");
    return 1;
  }

  if (piezasEnProd === 0) {
    // El caso de TODO consumidor que todavía no adoptó ninguna compuerta, y la
    // razón por la que este check entra en MINOR sin poner rojo a nadie: para
    // ese repo el invariante es vacuamente verdadero. Se dice, no se calla.
    console.log(
      `::notice::verde vacuo: ${conProd} archivo(s) con tramo de producción y ninguna pieza referenciada del marco en él. ` +
        "El invariante es vacuamente verdadero acá, y lo será hasta que este repo adopte su primera compuerta"
    );
  } else {
    console.log(`✓ las ${piezasEnProd} pieza(s) del marco que corren en producción se ejecutan antes en el tramo de dev de la misma promoción`);
  }
  return 0;
}

// Solo corre cuando se ejecuta como programa; importado desde las pruebas, no.
//
// La comparación pasa por realpath y, en Windows, ignora mayúsculas: la misma
// ruta llega con nombres cortos (JSANTA~1), a través de un enlace de directorio
// o con otra caja según quién invoque, y Node resuelve el enlace para
// `import.meta.url` pero NO para `process.argv[1]`. Una comparación literal
// contestaría "no soy el principal" y el proceso terminaría en exit 0 sin
// verificar nada ni decir una palabra: es el único fail-open posible de este
// script, y por eso lo cubre una prueba que lo SPAWNEA por una ruta no
// canónica. Copiada de censo-fuentes.mjs, que cerró el mismo agujero.
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
  process.exit(await main());
}
