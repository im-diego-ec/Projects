import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const DIR = "plantilla/.github/workflows";

// ---------------------------------------------------------------------------
// UN WORKFLOW NO SE PUEDE RETOCAR DESPUES. POR ESO NO PUEDE LLEVAR EL NOMBRE
// DEL PROYECTO SUSTITUIDO.
//
// EL LIMITE, medido contra GitHub y no supuesto. El `GITHUB_TOKEN` de Actions
// NO PUEDE crear ni modificar archivos de workflow:
//
//   ! [remote rejected] main -> main (refusing to allow a GitHub App to create
//     or update workflow `.github/workflows/actualizar-marco.yml` without
//     `workflows` permission)
//
// BORRAR SI PUEDE --tambien medido, con una corrida real-- pero crear y
// modificar no. Y no hay forma de darle ese permiso: no esta entre los que
// `permissions:` admite.
//
// LA CONSECUENCIA, y es la que este banco protege: cuando un workflow llega por
// una copia de template, NADIE LO PUEDE ARREGLAR DESPUES. Si llevara
// `{{PROYECTO}}` sustituido con el nombre del template, quedaria nombrando al
// proyecto equivocado para siempre, en el repositorio de otra persona.
//
// LA REGLA: lo que cambia con CADA repositorio se deriva del contexto de GitHub
// en tiempo de ejecucion. Lo que es igual para todo proyecto de este marco
// --ORG_MARCO, los nombres de paquete-- si se puede sustituir, porque el valor
// es el mismo en todas las copias.
// ---------------------------------------------------------------------------

/** Lo que cambia con cada repositorio, con de donde se saca en su lugar. */
const POR_REPOSITORIO = {
  "{{PROYECTO}}": "${{ github.event.repository.name }}",
  "{{ORG}}": "${{ github.repository_owner }}",
  "{{BUILDER_1}}": "${{ github.repository_owner }}",
  "{{BUILDER_2}}": "no hay contexto que lo de: sacalo del workflow",
  "{{PO}}": "no hay contexto que lo de: sacalo del workflow",
};

const workflows = () =>
  fs.readdirSync(path.join(RAIZ, DIR)).filter((f) => f.endsWith(".yml") || f.endsWith(".yaml"));

test("hay workflows que revisar: un cero aca es este banco roto", () => {
  assert.ok(workflows().length >= 3, `se encontraron ${workflows().length} workflows en ${DIR}`);
});

test("ningun workflow del proyecto lleva un marcador que cambie con cada repositorio", () => {
  const malos = [];
  for (const f of workflows()) {
    const texto = fs.readFileSync(path.join(RAIZ, DIR, f), "utf8");
    texto.split("\n").forEach((linea, i) => {
      for (const [marcador, reemplazo] of Object.entries(POR_REPOSITORIO)) {
        if (linea.includes(marcador)) malos.push(`${DIR}/${f}:${i + 1}  ${marcador}  ->  ${reemplazo}`);
      }
    });
  }
  assert.deepEqual(
    malos,
    [],
    "El GITHUB_TOKEN no puede modificar un workflow, asi que un workflow que llega por copia de\n" +
      "template NO se puede arreglar despues: quedaria nombrando al proyecto equivocado para siempre.\n" +
      "Lo que cambia por repositorio se deriva del contexto:\n\n  " +
      malos.join("\n  "),
  );
});

test("y los que SI son iguales en todo proyecto siguen sustituyendose: la regla no es 'ningun marcador'", () => {
  const texto = workflows()
    .map((f) => fs.readFileSync(path.join(RAIZ, DIR, f), "utf8"))
    .join("\n");
  assert.match(
    texto,
    /\{\{ORG_MARCO\}\}/,
    "ORG_MARCO desaparecio de los workflows. Es el mismo valor en toda copia de este marco, asi que " +
      "sustituirlo es correcto — y cablearlo a mano rompe el banco de higiene. Si se saco a proposito, " +
      "actualiza este caso en el mismo cambio.",
  );
});

test("MUERDE: el detector caza un {{PROYECTO}} nuevo", () => {
  const linea = 'echo "soy {{PROYECTO}}"';
  const cazado = Object.keys(POR_REPOSITORIO).some((m) => linea.includes(m));
  assert.ok(cazado, "el detector no caza el marcador que dice cazar: no protege nada");
});
