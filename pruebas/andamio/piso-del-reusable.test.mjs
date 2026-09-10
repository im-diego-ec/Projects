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

/** Los alcances que un archivo declara como piso, leidos de su bloque
 *  `permissions:` de encabezado (indentacion de dos). */
function alcancesDeclarados(rel) {
  const texto = fs.readFileSync(path.join(RAIZ, rel), "utf8");
  const alcances = new Set();
  for (const m of texto.matchAll(/^#?\s{0,3}  ([a-z-]+):\s*(read|write)\s*$/gm)) {
    alcances.add(`${m[1]}: ${m[2]}`);
  }
  return alcances;
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
