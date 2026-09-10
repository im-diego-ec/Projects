import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { PLANTILLAS } from "../../herramientas/projects-plantilla-repos.mjs";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const RELEASE = fs.readFileSync(path.join(RAIZ, ".claude", "skills", "projects-release", "SKILL.md"), "utf8");
const GUIA = fs.readFileSync(path.join(RAIZ, "docs", "04-arrancar-acompanado.md"), "utf8");

// ---------------------------------------------------------------------------
// LOS DOS REPOS PLANTILLA SON CONSUMIDORES QUE NADIE ACTUALIZA.
//
// QUE DEFECTO CIERRA. `docs/04` manda al camino mas no-coder que existe: hacer
// "Use this template" sobre im-diego-ec/plantilla-sitio o plantilla-aplicacion y
// correr el workflow "Personalizar mi proyecto". Ese workflow lee el pin del marco
// del ci.yml de la PROPIA plantilla.
//
// Entonces: si las plantillas quedan en la version anterior, cada proyecto que nazca
// por ese camino nace pineado a un marco viejo, sin un solo rojo. Y son el unico
// consumidor que NO recibe PR de Dependabot, porque no son repos que alguien
// mantenga: son moldes que se copian.
//
// Medido al escribir esto (2026-09-10): las dos pinaban v1.9.6, que era la vigente.
// El problema no es el estado de hoy, es que nada lo sostiene manana.
//
// POR QUE ESTE BANCO NO CONSULTA GITHUB. El banco del marco corre sin red y sin
// dependencias, y una compuerta que depende de un tercero es una compuerta que se
// pone roja por motivos ajenos. Lo que SI se puede verificar sin red es que el
// procedimiento del release lo mande a comprobar, con las dos plantillas nombradas.
// La comprobacion contra GitHub es un acto del release, y este banco garantiza que
// ese acto este escrito y no se pierda.
// ---------------------------------------------------------------------------

test("el release manda a comprobar el pin de las plantillas", () => {
  assert.match(
    RELEASE,
    /marco-ci\\?\.yml@v\[0-9\]|marco-ci\.yml@v\[0-9\]/,
    "el procedimiento de release no comprueba con que version quedaron pineadas las plantillas",
  );
  assert.match(
    RELEASE,
    /is_template/,
    "el release no comprueba que las plantillas SIGAN siendo plantillas: si una deja de serlo, se rompe el boton que la guia manda apretar",
  );
});

test("el release nombra las DOS plantillas, y salen de la misma lista que las genera", () => {
  // Si manana aparece una tercera forma, este caso se pone rojo hasta que el
  // release la nombre. La lista no se escribe a mano aca: se deriva de la
  // herramienta que las produce.
  assert.ok(PLANTILLAS.length >= 2, `se leyeron ${PLANTILLAS.length} plantillas: la guarda quedaria mirando al vacio`);
  const faltan = PLANTILLAS.filter((p) => !RELEASE.includes(p.repo)).map((p) => p.repo);
  assert.deepEqual(faltan, [], `el release no nombra estas plantillas: ${faltan.join(", ")}`);
});

test("la guia manda a esas mismas plantillas, y no a otras", () => {
  // El defecto que esto evita es una tercera lista: la guia nombrando un repo que
  // la herramienta no genera, o al reves.
  const faltan = PLANTILLAS.filter((p) => !GUIA.includes(p.repo)).map((p) => p.repo);
  assert.deepEqual(faltan, [], `docs/04 no nombra estas plantillas: ${faltan.join(", ")}`);
});

test("MUERDE: si el release deja de nombrar una plantilla, se caza", () => {
  const sinUna = RELEASE.split(PLANTILLAS[0].repo).join("otro-repo-cualquiera");
  const faltan = PLANTILLAS.filter((p) => !sinUna.includes(p.repo));
  assert.equal(faltan.length, 1, "el predicado no detecta una plantilla que el release dejo de nombrar");
});
