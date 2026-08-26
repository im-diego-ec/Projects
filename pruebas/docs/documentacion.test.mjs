// Banco de la documentacion de entrada.
//
// POR QUE EXISTE. docs/06-para-el-po.md y docs/02-glosario.md nacieron para cerrar el
// hueco de que el rol con mas poder de veto del marco —el PO, dueño exclusivo de
// rutas en CODEOWNERS— no tenia ningun documento dirigido a el. Pero un documento
// que explica rutas se desincroniza en cuanto alguien toca CODEOWNERS, y una cifra
// escrita a mano en un encabezado se desincroniza en cuanto alguien agrega una fila.
// Sin banco, las dos reglas son disciplina declarada, y la doctrina del marco es
// explicita: lo que depende de que alguien se acuerde no cuenta.
//
// Estas comprobaciones vivian como scripts sueltos fuera del repo mientras se
// escribian los documentos. Aqui adentro corren en cada PR por el glob
// `pruebas/**/*.test.mjs` de .github/workflows/ci.yml.

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

const RAIZ = path.resolve(import.meta.dirname, "..", "..");
const leer = (rel) => readFileSync(path.join(RAIZ, rel), "utf8");

const CODEOWNERS = [".github/CODEOWNERS", "plantilla/.github/CODEOWNERS"];
const PARA_EL_PO = "docs/06-para-el-po.md";
const GLOSARIO = "docs/02-glosario.md";

/** Las rutas que CODEOWNERS SACA del catch-all, en este repo y en el andamio.
 *  Una linea de CODEOWNERS es `<ruta> <owner>...`; nos quedamos con las que
 *  declaran un patron propio, o sea todas menos la regla `*`.
 *
 *  ANTES SE IDENTIFICABAN POR EL OWNER —las que terminaban en el equipo del PO,
 *  `/po` aqui y `/{{EQUIPO_PO}}` alla— y esa senal dejo de existir de este lado:
 *  el CODEOWNERS del marco vive en una cuenta personal, donde no hay equipos,
 *  asi que sus reglas nombran todas al mismo owner y el rol ya no se lee en el
 *  archivo. La senal que sobrevive es la carve-out: una ruta que alguien saco a
 *  mano del `*` es una ruta que se le pide aprobar a alguien en particular, y
 *  esa es exactamente la que el documento del PO tiene que explicar. Ademas no
 *  depende de como se escriba el owner, que es lo que se acaba de pudrir. */
function rutasConDuenioPropio() {
  const rutas = new Set();
  for (const archivo of CODEOWNERS) {
    for (const linea of leer(archivo).split("\n")) {
      const limpia = linea.trim();
      if (!limpia || limpia.startsWith("#")) continue;
      const campos = limpia.split(/\s+/);
      if (campos.length < 2) continue;
      if (campos[0] === "*") continue;
      rutas.add(campos[0]);
    }
  }
  return [...rutas].sort();
}

test("el escaneo encuentra rutas con dueño propio: un cero aca es el banco roto, no un CODEOWNERS limpio", () => {
  const rutas = rutasConDuenioPropio();
  assert.ok(
    rutas.length >= 5,
    `solo encontre ${rutas.length} ruta(s) fuera del catch-all en ${CODEOWNERS.join(" y ")}. ` +
      "Este repo saca dos y el andamio tres, asi que menos de cinco significa que el " +
      "parseo dejo de reconocer el formato de CODEOWNERS: revisá el parseo antes " +
      "de creerle al verde.",
  );
});

test("cada ruta que CODEOWNERS saca del catch-all esta explicada en 06-para-el-po.md", () => {
  const doc = leer(PARA_EL_PO);
  const sinExplicar = [];
  for (const ruta of rutasConDuenioPropio()) {
    // Se busca la ruta ENTRE BACKTICKS, no como subcadena suelta, y el motivo es
    // un falso verde medido: `/openspec/specs/` es subcadena de
    // `/openspec/specs/gobierno-contribucion/`, asi que una busqueda de subcadena
    // daba por explicada una ruta gracias a la mencion de OTRA. Con los backticks
    // —que es como el documento las escribe— cada una responde por si misma.
    if (!doc.includes(`\`${ruta}\``)) sinExplicar.push(ruta);
  }
  assert.deepEqual(
    sinExplicar,
    [],
    `CODEOWNERS le pone dueño propio a estas rutas y ${PARA_EL_PO} no las nombra entre backticks: ` +
      `${sinExplicar.join(", ")}. El PO tiene que poder leer que se le pide aprobar.`,
  );
});

test("la cifra del encabezado del glosario es la cantidad real de filas", () => {
  const doc = leer(GLOSARIO);
  const filas = doc.split("\n").filter((l) => l.startsWith("| **")).length;

  assert.ok(filas >= 20, `el glosario tiene ${filas} filas: o se vacio, o el formato de la tabla cambio`);

  // El encabezado escribe la cifra en palabras. Se comprueba la unica forma que
  // el documento usa hoy, y si alguien cambia la redaccion este banco lo dice.
  const decenas = { 2: "veinte", 3: "treinta", 4: "cuarenta", 5: "cincuenta" };
  const unidades = ["", "uno", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve"];
  const d = Math.floor(filas / 10);
  const u = filas % 10;
  const enPalabras = u === 0 ? decenas[d] : d === 2 ? `veinti${unidades[u]}` : `${decenas[d]} y ${unidades[u]}`;

  assert.ok(
    doc.includes(enPalabras),
    `la tabla del glosario tiene ${filas} filas y el encabezado no dice "${enPalabras}". ` +
      "Una cifra escrita a mano al lado de una tabla que crece es la clase de dato que este " +
      "repo existe para no mantener a mano.",
  );
});

test("el glosario no define un termino dos veces", () => {
  const doc = leer(GLOSARIO);
  const terminos = doc
    .split("\n")
    .filter((l) => l.startsWith("| **"))
    .map((l) => l.split("|")[1].trim().toLowerCase());
  const repetidos = terminos.filter((t, i) => terminos.indexOf(t) !== i);
  assert.deepEqual(repetidos, [], `terminos definidos mas de una vez: ${repetidos.join(", ")}`);
});

test("los documentos nuevos estan enlazados desde el indice de docs/", () => {
  const indice = leer("docs/README.md");
  for (const doc of ["06-para-el-po.md", "02-glosario.md"]) {
    assert.ok(
      indice.includes(doc),
      `docs/README.md no menciona ${doc}. El indice se vende como el mapa de la documentacion: ` +
        "un documento que no aparece ahi es un documento que nadie encuentra.",
    );
  }
});
