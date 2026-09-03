import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { tipoDeCuentaDe, podarPorTipoDeCuenta, sacarCentinelas } from "../../herramientas/projects-init.mjs";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const INIT = path.join(RAIZ, "herramientas/projects-init.mjs");

// ---------------------------------------------------------------------------
// EL CODEOWNERS QUE NO ASIGNABA A NADIE, Y NO LO DECIA.
//
// EL DEFECTO, medido sobre un proyecto real creado bajo `im-diego-ec`: el
// andamio repartia SIEMPRE un CODEOWNERS con equipos, `@cuenta/builders`. Y
// `gh api users/im-diego-ec` contesta `"type": "User"`.
//
// LOS EQUIPOS DE GITHUB NO EXISTEN FUERA DE UNA ORGANIZACION. Asi que ese
// archivo no asignaba a nadie, NUNCA, y GitHub no dice una palabra: el review
// cruzado quedaba apagado en silencio. Que es, textualmente, el modo de falla
// que el encabezado del propio CODEOWNERS declara querer evitar.
//
// LA ASIMETRIA QUE DECIDE EL DEFAULT, y es lo que este banco fija:
//
//   - Un handle personal (@ana) es un code owner valido EN LOS DOS LADOS.
//   - Un equipo (@org/equipo) SOLO vale en una organizacion.
//
// Equivocarse hacia `usuario` deja un CODEOWNERS que funciona igual;
// equivocarse hacia `organizacion` lo deja mudo. Por eso el default es el lado
// que no rompe en silencio, y no el que el andamio venia repartiendo.
// ---------------------------------------------------------------------------

const enTemporal = (fn) => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "tipo-cuenta-"));
  try { return fn(tmp); } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
};

test("ante la duda se elige el lado que no rompe en silencio", () => {
  assert.equal(tipoDeCuentaDe({}), "usuario", "sin la clave, un equipo inexistente dejaria el review cruzado mudo");
  assert.equal(tipoDeCuentaDe({ TIPO_CUENTA: "???" }), "usuario", "un valor que no se entiende cae al lado seguro");
  assert.equal(tipoDeCuentaDe({ TIPO_CUENTA: "  ORGANIZACION " }), "organizacion", "se normaliza el espacio y las mayusculas");
  assert.equal(tipoDeCuentaDe({ TIPO_CUENTA: "usuario" }), "usuario");
});

test("la poda deja UNA de las dos formas, nunca las dos ni ninguna", () => {
  const dos = "# projects:solo-si-organizacion\nEQUIPOS\n# projects:fin-solo-si-organizacion\n# projects:solo-si-usuario\nHANDLES\n# projects:fin-solo-si-usuario\n";
  const org = sacarCentinelas(podarPorTipoDeCuenta(dos, "organizacion")).trim();
  const usr = sacarCentinelas(podarPorTipoDeCuenta(dos, "usuario")).trim();
  assert.equal(org, "EQUIPOS");
  assert.equal(usr, "HANDLES");
});

test("el CODEOWNERS del andamio trae las DOS formas: si falta una, media configuracion no existe", () => {
  const texto = fs.readFileSync(path.join(RAIZ, "plantilla/.github/CODEOWNERS"), "utf8");
  for (const centinela of ["solo-si-organizacion", "fin-solo-si-organizacion", "solo-si-usuario", "fin-solo-si-usuario"]) {
    assert.ok(texto.includes(`# projects:${centinela}`), `al CODEOWNERS del andamio le falta el centinela ${centinela}`);
  }
  assert.match(texto, /@\{\{ORG\}\}\/\{\{EQUIPO_BUILDERS\}\}/, "falta la forma de organizacion");
  assert.match(texto, /@\{\{BUILDER_1\}\} @\{\{BUILDER_2\}\}/, "falta la forma de cuenta de usuario");
});

/** Genera un proyecto con el tipo de cuenta pedido y devuelve su CODEOWNERS. */
function codeownersDe(tipo, tmp) {
  const destino = path.join(tmp, tipo);
  fs.mkdirSync(destino, { recursive: true });
  const base = JSON.parse(execFileSync("node", [INIT, "--ejemplo"], { encoding: "utf-8" }));
  const valores = {
    ...base, TIPO_CUENTA: tipo, forma: "aplicacion", plataforma: "supabase",
    PROYECTO: "mi-proyecto", ORG: "mi-cuenta", BUILDER_1: "ana", BUILDER_2: "beto", PO: "carla",
  };
  const ruta = path.join(tmp, `v-${tipo}.json`);
  fs.writeFileSync(ruta, JSON.stringify(valores));
  execFileSync("node", [INIT, "--valores", ruta, "--destino", destino, "--sin-arranque"], { stdio: "pipe" });
  return fs.readFileSync(path.join(destino, ".github/CODEOWNERS"), "utf8");
}

test("EN UNA ORGANIZACION el proyecto nace con equipos", () => {
  enTemporal((tmp) => {
    const c = codeownersDe("organizacion", tmp);
    assert.match(c, /^\*\s+@mi-cuenta\/builders$/m);
    assert.match(c, /@mi-cuenta\/po/);
    assert.ok(!/@ana/.test(c), "no puede traer handles personales tambien: seria las dos formas a la vez");
  });
});

test("EN UNA CUENTA DE USUARIO el proyecto nace con handles, no con equipos que no existen", () => {
  enTemporal((tmp) => {
    const c = codeownersDe("usuario", tmp);
    assert.match(c, /^\*\s+@ana @beto$/m);
    assert.match(c, /@carla/);
    assert.ok(!/@mi-cuenta\//.test(c), "un equipo en una cuenta personal no asigna a nadie y no lo dice");
  });
});

test("en las dos formas no queda un solo centinela a la vista", () => {
  enTemporal((tmp) => {
    for (const tipo of ["organizacion", "usuario"]) {
      assert.ok(!/projects:(?:fin-)?solo-si-/.test(codeownersDe(tipo, tmp)), `quedaron centinelas con ${tipo}`);
    }
  });
});

test("MUERDE: si la poda dejara las dos formas, el CODEOWNERS asignaria dos veces y se caza", () => {
  const dos = "# projects:solo-si-organizacion\nEQUIPOS\n# projects:fin-solo-si-organizacion\n# projects:solo-si-usuario\nHANDLES\n# projects:fin-solo-si-usuario\n";
  const sinPodar = sacarCentinelas(dos).trim();
  assert.ok(
    sinPodar.includes("EQUIPOS") && sinPodar.includes("HANDLES"),
    "sin podar tienen que quedar las dos: si no, este MUERDE no esta midiendo la poda",
  );
});
