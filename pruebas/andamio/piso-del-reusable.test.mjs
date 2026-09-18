import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const REUSABLE = path.join(RAIZ, ".github", "workflows", "marco-ci.yml");

// Los tres archivos que declaran el piso de permisos que hay que concederle al
// reusable. El de `plantilla/` es el que VIAJA a cada proyecto nuevo.
const DECLARAN = [
  ".github/workflows/marco-ci.yml",
  "plantilla/.github/workflows/ci.yml",
  ".github/workflows/ci.yml",
];

// ---------------------------------------------------------------------------
// EL PISO DE PERMISOS QUE SE DECLARA TIENE QUE SER EL QUE EL REUSABLE EXIGE.
//
// QUE DEFECTO PREVIENE. Un workflow reusable nunca recibe mas permisos que los
// que le concede quien lo llama, asi que el marco documenta en TRES lugares que
// hay que concederle `contents: read` y `pull-requests: read`. Ese texto se
// escribio cuando el reusable pedia esos dos.
//
// El dia que un job del reusable gane un permiso nuevo --y no es hipotetico: el
// upstream de este marco agrego `issues: read` y `actions: read` en su linea
// mayor 2-- los tres bloques quedan diciendo un piso que ya no alcanza, y el
// consumidor que los copie se queda corto. `permisos-por-job.test.mjs` verifica
// que cada job DECLARE su bloque, pero nunca lee estos comentarios: la prosa y
// el mecanismo podian divergir sin que nada lo notara.
//
// LO QUE ESTA COMPUERTA NO HACE. No PROVOCA la consecuencia que esos bloques
// describen: eso depende del comportamiento de GitHub ante un reusable que pide
// de mas, y no se puede medir desde este banco. Se midio afuera (upstream de este
// marco, corrida 33971175258: startup_failure), y lo que el ultimo caso de este
// archivo fija es que la PROSA diga eso y no el fail-open que decia antes.
// ---------------------------------------------------------------------------

/** Los alcances que los jobs del reusable declaran de verdad. */
function alcancesQueExigeElReusable() {
  const texto = fs.readFileSync(REUSABLE, "utf8");
  const alcances = new Set();
  let dentroDeJobs = false;
  for (const linea of texto.split("\n")) {
    if (/^jobs:\s*$/.test(linea)) dentroDeJobs = true;
    if (!dentroDeJobs) continue;
    // Solo los bloques `permissions:` de jobs (indentacion de seis), no los del
    // encabezado ni los que viajan dentro de un comentario de ejemplo.
    const m = /^      ([a-z-]+):\s*(read|write)\s*$/.exec(linea);
    if (m) alcances.add(`${m[1]}: ${m[2]}`);
  }
  return alcances;
}

/** Los alcances que un archivo concede DE VERDAD: lineas vivas, no comentadas.
 *
 *  LA PRIMERA VERSION ACEPTABA COMENTARIOS. Su patron llevaba `#?` al principio,
 *  asi que un `#  pull-requests: read` contaba como concedido. Medido: comentando
 *  el permiso REAL de `plantilla/.github/workflows/ci.yml` --el archivo que VIAJA a
 *  cada proyecto nuevo-- la compuerta seguia en VERDE. O sea que no habria cazado
 *  un andamio repartiendo un piso corto, que es exactamente lo unico que existe
 *  para cazar. */
function alcancesReales(rel) {
  const lineas = fs.readFileSync(path.join(RAIZ, rel), "utf8").split("\n");
  // SOLO EL BLOQUE DE ENCABEZADO: `permissions:` en la columna 0, y sus hijos.
  // Barrer el archivo entero era el segundo defecto de esta compuerta: recogia
  // tambien los `permissions:` de cada JOB --indentados-- asi que comentar el del
  // encabezado no cambiaba nada, porque un bloque de job satisfacia la cuenta. Y el
  // que le importa al reusable es justo el del encabezado: es el techo que el
  // llamador le concede.
  const i = lineas.findIndex((l) => /^permissions:\s*$/.test(l));
  const alcances = new Set();
  if (i === -1) return alcances;
  for (const l of lineas.slice(i + 1)) {
    if (!/^\s/.test(l) || !l.trim()) break; // se acabo el bloque
    const m = /^ {2}([a-z-]+):\s*(read|write)\s*$/.exec(l);
    if (m) alcances.add(`${m[1]}: ${m[2]}`);
  }
  return alcances;
}

/** Los alcances del EJEMPLO COMENTADO que `marco-ci.yml` lleva escrito para que un
 *  consumidor lo copie. Ahi el bloque es comentario A PROPOSITO --es una muestra,
 *  no la configuracion de este archivo-- asi que se lee distinto, y el banco tiene
 *  que decir cual de las dos formas espera en cada archivo en vez de aceptar las dos
 *  en todos. */
function alcancesDelEjemplo(rel) {
  // ACOTADO AL BLOQUE `permissions:` DEL EJEMPLO, y no al archivo entero. La version
  // anterior barria todos los `#  clave: read` del archivo, asi que cualquier otro
  // comentario del workflow que mencionara un permiso satisfacia la cuenta. Un
  // archivo de 4000 lineas lleno de comentarios explicativos es el peor lugar
  // posible para hacer un grep suelto.
  const lineas = fs.readFileSync(path.join(RAIZ, rel), "utf8").split("\n");
  const i = lineas.findIndex((l) => /^#\s+permissions:\s*$/.test(l));
  const alcances = new Set();
  if (i === -1) return alcances;
  for (const l of lineas.slice(i + 1)) {
    const m = /^#\s+([a-z-]+):\s*(read|write)\s*$/.exec(l);
    if (!m) break; // el bloque del ejemplo se corto
    alcances.add(`${m[1]}: ${m[2]}`);
  }
  return alcances;
}

/** Que forma se espera en cada archivo. Explicito: aceptar las dos en todos es
 *  como la primera version dejaba pasar un piso corto. */
const COMO_LO_DECLARA = {
  ".github/workflows/marco-ci.yml": alcancesDelEjemplo,
  "plantilla/.github/workflows/ci.yml": alcancesReales,
  ".github/workflows/ci.yml": alcancesReales,
};

function alcancesDeclarados(rel) {
  const lector = COMO_LO_DECLARA[rel];
  assert.ok(lector, `${rel} no dice si declara su piso en un bloque vivo o en un ejemplo comentado`);
  return lector(rel);
}

test("el reusable exige algo: si no, todo lo de abajo pasa vacuamente", () => {
  const exige = alcancesQueExigeElReusable();
  assert.ok(exige.size > 0, "no se leyo ningun permissions: de job en el reusable; la compuerta quedaria mirando al vacio");
});

test("los tres bloques conceden AL MENOS el piso que el reusable exige (de mas no es el fallo que esto ataja)", () => {
  const exige = alcancesQueExigeElReusable();
  const faltantes = [];
  for (const rel of DECLARAN) {
    const declara = alcancesDeclarados(rel);
    for (const a of exige) {
      if (!declara.has(a)) faltantes.push(`${rel} no concede "${a}", que un job del reusable exige`);
    }
  }
  assert.deepEqual(
    faltantes,
    [],
    "el piso documentado quedo corto respecto del que el reusable pide:\n  " + faltantes.join("\n  "),
  );
});

test("MUERDE: si el reusable gana un permiso, los bloques quedan cortos", () => {
  // Se simula el caso real que motivo esto --el upstream agrego issues: read en
  // su mayor 2-- y se comprueba que el predicado lo detecta.
  const exige = new Set([...alcancesQueExigeElReusable(), "issues: read"]);
  const declara = alcancesDeclarados("plantilla/.github/workflows/ci.yml");
  const faltan = [...exige].filter((a) => !declara.has(a));
  assert.deepEqual(faltan, ["issues: read"], "el predicado no detecta un permiso nuevo del reusable");
});

test("MUERDE: un permiso COMENTADO no cuenta como concedido", () => {
  // ESTE CASO EXISTE POR DOS DEFECTOS REALES DE ESTA MISMA COMPUERTA, los dos
  // encontrados por una revision adversarial y no por el banco.
  //
  // (1) El patron llevaba `#?`, asi que un `#  pull-requests: read` contaba como
  //     concedido. (2) Barria el archivo ENTERO, asi que los `permissions:` de los
  //     JOBS satisfacian la cuenta aunque el del encabezado estuviera vacio.
  //
  // Medido con las dos juntas: comentando el permiso real de
  // plantilla/.github/workflows/ci.yml --el archivo que VIAJA a cada proyecto-- la
  // compuerta seguia en VERDE. No habria cazado un andamio repartiendo un piso
  // corto, que es lo unico que existe para cazar.
  const conComentario = ["permissions:", "  contents: read", "#  pull-requests: read", "", "jobs:"].join("\n");
  const leidos = new Set();
  const lineas = conComentario.split("\n");
  const i = lineas.findIndex((l) => /^permissions:\s*$/.test(l));
  for (const l of lineas.slice(i + 1)) {
    if (!/^\s/.test(l) || !l.trim()) break;
    const m = /^ {2}([a-z-]+):\s*(read|write)\s*$/.exec(l);
    if (m) leidos.add(`${m[1]}: ${m[2]}`);
  }
  assert.deepEqual([...leidos], ["contents: read"], "un permiso comentado se leyo como concedido");

  const conJob = ["permissions:", "  contents: read", "", "jobs:", "  x:", "    permissions:", "      pull-requests: read"].join("\n");
  const leidos2 = new Set();
  const l2 = conJob.split("\n");
  const j = l2.findIndex((l) => /^permissions:\s*$/.test(l));
  for (const l of l2.slice(j + 1)) {
    if (!/^\s/.test(l) || !l.trim()) break;
    const m = /^ {2}([a-z-]+):\s*(read|write)\s*$/.exec(l);
    if (m) leidos2.add(`${m[1]}: ${m[2]}`);
  }
  assert.deepEqual([...leidos2], ["contents: read"], "un permissions: de JOB se leyo como piso del encabezado");
});

// ---------------------------------------------------------------------------
// LA CONSECUENCIA QUE ESOS BLOQUES DESCRIBEN, AHORA MEDIDA.
//
// Los tres bloques decian que sin `pull-requests: read` la deteccion del carril
// «cae al fail-open». El change el-piso-del-reusable-se-mide dejo esa frase marcada
// como no verificada y le dio destino propio; el destino es el change
// el-marco-deja-de-afirmar-lo-que-no-hace, y la medicion es del upstream de este
// marco: con el reusable declarando un alcance que el job llamador no concedia, la
// corrida 33971175258 (2026-09-05) salio `startup_failure`, con CERO jobs, CERO
// check-runs y un mensaje que no nombra el permiso. El job `cambios` de este
// reusable DECLARA `pull-requests: read`, asi que un llamador que no lo concede no
// cae en ningun fail-open: se queda sin corrida. Seguir la prosa vieja —«si falta,
// solo pierdo el carril rapido»— deja un repo sin checks.
//
// LIMITE DECLARADO: la lista es de las formas EXACTAS que ya aparecieron, no un
// detector de la idea. Lo que si es general es la otra mitad: cada archivo que
// declara el piso tiene que nombrar `startup_failure`, o sea decir lo que pasa.
// ---------------------------------------------------------------------------

// Varios `#` seguidos tambien: el ejemplo de marco-ci.yml es un YAML comentado dentro
// de un comentario, y sus lineas empiezan con "#   #".
const aplanar = (t) => t.replace(/\r?\n[ \t]*(?:#[ \t]*)*/g, " ").replace(/[ \t]+/g, " ");

const CONSECUENCIA_FALSA = [
  "Sin pull-requests:read el job de deteccion del carril de docs no puede listar los archivos del PR, cae al fail-open",
  'si aca falta pull-requests:read, el job "cambios" no puede listar los archivos del PR, cae al fail-open',
  'Sin pull-requests:read, el job "cambios" no puede listar los archivos del PR, cae al fail-open',
  "sin el, el job que detecta el carril de docs no puede listar los archivos del PR y cae al fail-open",
  'sin el, el job "cambios" de marco-ci.yml no puede listar los archivos del PR, cae al fail-open',
];

test("la normalizacion une un comentario partido en dos lineas", () => {
  // Sin este control, el caso de abajo seria un `includes` literal que no ve una
  // frase partida, que es justo como viven en un YAML.
  const partido = "# Sin pull-requests:read el job de deteccion del carril de docs no puede\n# listar los archivos del PR, cae al fail-open";
  assert.ok(aplanar(partido).includes(CONSECUENCIA_FALSA[0]));
  const anidado = "#   # OBLIGATORIO. si aca falta pull-requests:read, el job\n#   # \"cambios\" no puede listar los archivos del PR, cae al fail-open y el";
  assert.ok(aplanar(anidado).includes(CONSECUENCIA_FALSA[1]));
});

test("ningun bloque del piso dice que sin el permiso se cae al fail-open: la corrida no arranca", () => {
  const encontradas = [];
  const mudos = [];
  for (const rel of DECLARAN) {
    const texto = fs.readFileSync(path.join(RAIZ, rel), "utf8");
    const plano = aplanar(texto);
    for (const f of CONSECUENCIA_FALSA) if (plano.includes(f)) encontradas.push(`${rel}: "${f}"`);
    if (!texto.includes("startup_failure")) mudos.push(rel);
  }
  assert.deepEqual(
    encontradas,
    [],
    "estos archivos siguen diciendo que sin pull-requests: read la deteccion cae al fail-open. Medido: el job " +
      "cambios del reusable DECLARA ese permiso, y cuando el llamador no lo concede la corrida sale " +
      "startup_failure, sin jobs ni checks. Reescribi la frase con esa consecuencia",
  );
  assert.deepEqual(
    mudos,
    [],
    "estos archivos declaran el piso de permisos y no dicen que pasa si falta: nombra startup_failure y que la " +
      "corrida entera no arranca, para que nadie recorte el permiso creyendo que solo pierde el carril rapido",
  );
});
