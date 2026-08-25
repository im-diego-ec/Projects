// QUE SIGNIFICA `export` EN ESTE REPO, Y QUE LO SOSTIENE.
//
// EL CRITERIO, en una linea: en los scripts de las actions, `export` significa
// «un banco de pruebas lo importa». Nada mas. No hay un paquete publicado, no
// hay un consumidor que haga `import` de estos archivos —lo que se consume es la
// action entera por `uses:`, y lo que corre es su `main()`— asi que la unica
// razon legitima para exportar un identificador es que otro archivo .mjs del
// arbol lo nombre.
//
// POR QUE HACE FALTA ESCRIBIRLO. Se busco codigo muerto y NO hay: cada
// identificador se usa dentro de su archivo. Lo que si habia eran 35
// exportaciones que ningun otro archivo importaba, catorce de ellas en el modulo
// que implementa la compuerta de cableado. Eso no es un bug, es una senal falsa:
// le dice al lector que existe una superficie probada —"esto lo importa un
// banco"— que no existe, y le cobra el costo de averiguar cual de las 40 es de
// verdad. La salida no fue borrar codigo sino quitarles el `export`: siguen
// siendo const y function del modulo, se siguen usando igual, y el `export` que
// queda vuelve a querer decir algo.
//
// COMO NO SE VUELVE A ABRIR. Este caso lo deriva del arbol: exportacion sin un
// solo archivo .mjs que la nombre es roja. Si alguna tiene que quedar exportada
// sin importador —porque el banco que la va a usar viene en el PR siguiente—, va
// en EXPORTADAS_A_PROPOSITO con el motivo, que es lo mismo que se le pide a
// cualquier otra deuda del marco: declarada, no supuesta.
//
// LO QUE NO AFIRMA: que lo exportado este PROBADO. Que un banco importe un
// identificador dice que lo nombra, no cuantos casos le escribio. Eso lo mide
// cobertura, y el marco no tiene cobertura sobre si mismo.
import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

/** Los .mjs rastreados y su texto. Rastreados: lo que no esta versionado no es contrato. */
function mjsRastreados() {
  const rutas = execFileSync("git", ["-C", RAIZ, "ls-files", "*.mjs"], { encoding: "utf8" })
    .split("\n")
    .filter(Boolean);
  return new Map(rutas.map((ruta) => [ruta, readFileSync(join(RAIZ, ruta), "utf8")]));
}

const ARBOL = mjsRastreados();

/** Los scripts de las actions: lo que viaja publicado bajo `uses:`. */
const SCRIPTS_DE_ACTIONS = [...ARBOL.keys()].filter(
  (ruta) => /^actions\/[^/]+\/[^/]+\.mjs$/.test(ruta),
);

function exportacionesDe(texto) {
  return [...texto.matchAll(/^export\s+(?:async\s+)?(?:const|let|function|class)\s+([A-Za-z0-9_$]+)/gm)].map(
    (marca) => marca[1],
  );
}

function tieneImportador(nombre, propio) {
  const patron = new RegExp(`\\b${nombre}\\b`);
  for (const [ruta, texto] of ARBOL) {
    if (ruta === propio) continue;
    if (patron.test(texto)) return true;
  }
  return false;
}

// Exportaciones que se dejan exportadas SIN importador, con su motivo. Vacio hoy:
// las 35 que estaban asi pasaron a ser const y function del modulo.
const EXPORTADAS_A_PROPOSITO = new Map();

test("superficie · hay scripts de actions que mirar", () => {
  // Cero archivos JAMAS es un exito: un renombrado de carpeta dejaria este caso
  // en verde sin haber leido nada.
  assert.ok(
    SCRIPTS_DE_ACTIONS.length >= 5,
    `se encontraron ${SCRIPTS_DE_ACTIONS.length} scripts de action rastreados y se esperaban al menos 5`,
  );
  const total = SCRIPTS_DE_ACTIONS.reduce((suma, ruta) => suma + exportacionesDe(ARBOL.get(ruta)).length, 0);
  assert.ok(total >= 50, `se leyeron ${total} exportaciones en total y se esperaban al menos 50`);
});

test("superficie · ninguna exportacion de una action queda sin un solo importador", () => {
  const huerfanas = [];
  for (const ruta of SCRIPTS_DE_ACTIONS) {
    for (const nombre of exportacionesDe(ARBOL.get(ruta))) {
      if (tieneImportador(nombre, ruta)) continue;
      if (EXPORTADAS_A_PROPOSITO.has(`${ruta}#${nombre}`)) continue;
      huerfanas.push(`${ruta}#${nombre}`);
    }
  }
  assert.deepEqual(
    huerfanas,
    [],
    `estas exportaciones no las nombra ningun otro .mjs del arbol: ${huerfanas.join(", ")}. En este repo "export" significa "un banco lo importa", asi que exportar sin importador anuncia una superficie probada que no existe. Arreglo, una de dos: quitale el "export" (sigue siendo const o function del modulo y se usa igual), o escribile el caso que la importa. Si tiene que quedar exportada sin importador, agregala a EXPORTADAS_A_PROPOSITO con el motivo`,
  );
});

test("superficie · la lista de excepciones esta al dia", () => {
  const vencidas = [];
  for (const clave of EXPORTADAS_A_PROPOSITO.keys()) {
    const [ruta, nombre] = clave.split("#");
    const texto = ARBOL.get(ruta);
    if (!texto || !exportacionesDe(texto).includes(nombre)) {
      vencidas.push(`${clave} (ya no se exporta)`);
      continue;
    }
    if (tieneImportador(nombre, ruta)) vencidas.push(`${clave} (ya tiene importador)`);
  }
  assert.deepEqual(
    vencidas,
    [],
    `estas entradas de EXPORTADAS_A_PROPOSITO ya no describen nada: ${vencidas.join(", ")}. Una lista de excepciones que no se poda deja de significar algo, y el proximo lector no sabe cual mitad es cierta`,
  );
});
