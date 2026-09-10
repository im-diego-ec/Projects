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
// LO QUE ESTA COMPUERTA NO HACE. No verifica la CONSECUENCIA que esos bloques
// describen --si el token queda corto, si la corrida no arranca, o si la
// deteccion cae al fail-open--. Eso depende del comportamiento de GitHub ante un
// reusable que pide de mas, y no se puede medir desde este banco. Ver el proposal
// del change para el destino de esa parte.
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

test("los tres bloques declaran EXACTAMENTE el piso que el reusable exige", () => {
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
