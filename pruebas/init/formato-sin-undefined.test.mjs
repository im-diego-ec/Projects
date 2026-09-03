import test from "node:test";
import assert from "node:assert/strict";
import { FORMATOS } from "../../herramientas/projects-init.mjs";

// ---------------------------------------------------------------------------
// EL ASISTENTE LE DECIA «undefined» A LA PERSONA EN SU PEOR MOMENTO.
//
// EL DEFECTO, medido. El asistente imprimia el rechazo asi:
//
//     decir(`  ✗ "${valor}" no tiene la forma que corresponde: ${formato.espera}`)
//
// y de los catorce formatos SOLO DOS definen `espera`. Los otros doce salian:
//
//     ✗ "diego@ejemplo.com" no tiene la forma que corresponde: undefined
//
// POR QUE ESTE ERROR Y NO OTRO. Le pegaba al equivoco MAS PROBABLE del recorrido
// --escribir el correo donde va el usuario de GitHub-- y le mostraba la palabra
// `undefined` justo cuando necesitaba que le dijeran QUE PONER. El asistente
// existe para que esa persona no vea nunca una palabra asi.
//
// LO QUE ESTE BANCO VIGILA no es la linea arreglada: es que un formato NUEVO
// pueda nacer sin descripcion y reintroducir el agujero sin que nadie lo note.
// El arreglo usa `espera ?? que`, asi que basta con que `que` exista siempre.
// ---------------------------------------------------------------------------

test("hay formatos que revisar: un cero aca es este banco roto", () => {
  assert.ok(
    Object.keys(FORMATOS).length >= 10,
    `se encontraron ${Object.keys(FORMATOS).length} formatos: si cayo de golpe, mira si se movieron`,
  );
});

test("todo formato sabe decir que espera: sin eso el asistente imprime «undefined»", () => {
  const mudos = Object.entries(FORMATOS)
    .filter(([, f]) => {
      const texto = f.espera ?? f.que;
      return typeof texto !== "string" || texto.trim() === "";
    })
    .map(([k]) => k);

  assert.deepEqual(
    mudos,
    [],
    "Estos formatos no saben decir que esperan, asi que el asistente le va a mostrar\n" +
      "«no tiene la forma que corresponde: undefined» a alguien que no sabe que es una API.\n" +
      "Agregales `que` (o `espera`) en FORMATOS:\n\n" +
      mudos.join("\n"),
  );
});

test("MUERDE: un formato sin descripcion se caza", () => {
  const roto = { ...FORMATOS, INVENTADO: { patron: /^x$/ } };
  const mudos = Object.entries(roto)
    .filter(([, f]) => {
      const texto = f.espera ?? f.que;
      return typeof texto !== "string" || texto.trim() === "";
    })
    .map(([k]) => k);
  assert.deepEqual(mudos, ["INVENTADO"], "el detector no caza un formato sin descripcion: no protege nada");
});
