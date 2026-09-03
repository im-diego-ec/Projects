import test from "node:test";
import assert from "node:assert/strict";
import { podarPorForma, podarPorPlataforma, sacarCentinelas, noViajanPorPlataforma } from "../../herramientas/projects-init.mjs";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

// ---------------------------------------------------------------------------
// AGENTS.md APUNTABA A UN ARCHIVO QUE EL PROYECTO NO RECIBE.
//
// EL DEFECTO, medido sobre un proyecto generado por el camino recomendado
// (aplicacion + Supabase): `noViajanPorPlataforma` poda `infra/` entero, y aun
// asi `AGENTS.md` citaba DOS VECES `infra/adaptadores.md` y prescribia cuatro
// pasos manuales para borrar carpetas que nunca llegaron. Peor: su prosa decia
// «hoy ninguna herramienta reparte el andamio segun esta clave», que era cierto
// antes de que esa poda existiera.
//
// POR QUE ESTE ARCHIVO Y NO OTRO. `AGENTS.md` es lo que los agentes leen como
// fuente de verdad del repositorio. Un puntero colgado ahi no manda a la persona
// a un archivo vacio: manda a un AGENTE a razonar sobre un documento que no
// existe, y el agente completa el hueco inventando.
//
// LA TRAMPA QUE ESTE BANCO CIERRA DE VERDAD, y es la que casi se escapa: la poda
// se escribio primero en `podarPorForma`, que NO mira la plataforma. Con eso el
// proyecto de AWS recibia `infra/` SIN la seccion que la explica --el defecto
// simetrico, y del mismo tamano--. Por eso los dos casos de abajo son dos y no
// uno: hay que probar que se va cuando la carpeta no viaja Y que se queda cuando
// viaja.
// ---------------------------------------------------------------------------

/** El AGENTS.md del andamio, tal como sale despues de las dos podas. */
function agentsGenerado(plataforma, forma = "aplicacion") {
  const crudo = fs.readFileSync(path.join(RAIZ, "plantilla/AGENTS.md"), "utf8");
  return sacarCentinelas(podarPorPlataforma(podarPorForma(crudo, "AGENTS.md", forma), "AGENTS.md", plataforma, forma));
}

test("el andamio trae el puntero que hay que vigilar: un cero aca es este banco roto", () => {
  const crudo = fs.readFileSync(path.join(RAIZ, "plantilla/AGENTS.md"), "utf8");
  assert.ok(
    crudo.includes("infra/adaptadores.md"),
    "plantilla/AGENTS.md ya no cita infra/adaptadores.md: si se saco a proposito, sacá también este banco; si no, algo se perdió",
  );
});

test("cuando infra/ NO viaja, AGENTS.md no lo menciona: un puntero colgado hace que un agente razone sobre un archivo inexistente", () => {
  for (const plataforma of ["supabase", "ninguna"]) {
    assert.ok(
      noViajanPorPlataforma(plataforma, "aplicacion").includes("infra"),
      `preparacion: con "${plataforma}" se esperaba que infra/ NO viaje`,
    );
    const texto = agentsGenerado(plataforma);
    assert.ok(
      !texto.includes("infra/adaptadores.md"),
      `con plataforma "${plataforma}" el proyecto NO recibe infra/, y su AGENTS.md sigue citando infra/adaptadores.md`,
    );
  }
});

test("cuando infra/ SI viaja, AGENTS.md conserva la seccion que la explica: podar de mas es el defecto simetrico", () => {
  assert.deepEqual(
    noViajanPorPlataforma("aws", "aplicacion"),
    [],
    "preparacion: con aws + aplicacion se esperaba que infra/ SI viaje",
  );
  const texto = agentsGenerado("aws");
  assert.ok(
    texto.includes("infra/adaptadores.md"),
    "con aws el proyecto SI recibe infra/, y su AGENTS.md se quedo sin la seccion que la explica",
  );
});

test("un sitio con AWS tampoco recibe infra/, y su AGENTS.md tampoco la nombra", () => {
  assert.ok(noViajanPorPlataforma("aws", "sitio").includes("infra"), "preparacion: un sitio no despliega servidor propio");
  assert.ok(
    !agentsGenerado("aws", "sitio").includes("infra/adaptadores.md"),
    "un sitio no recibe infra/ aunque la plataforma sea AWS, y su AGENTS.md la seguia citando",
  );
});

test("no quedan centinelas a la vista en ningun camino", () => {
  for (const [plataforma, forma] of [["supabase", "aplicacion"], ["aws", "aplicacion"], ["aws", "sitio"], ["ninguna", "sitio"]]) {
    const texto = agentsGenerado(plataforma, forma);
    assert.ok(
      !/projects:(?:fin-)?solo-si-/.test(texto),
      `quedaron centinelas visibles en el AGENTS.md de ${plataforma}/${forma}: la persona los lee como ruido del andamio`,
    );
  }
});
