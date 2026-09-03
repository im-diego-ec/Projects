import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { CAMPOS, CUENTA_DEL_MARCO, respuestasDelFormulario, problemas, escribir } from "../../herramientas/projects-puerta.mjs";
import { validarValores } from "../../herramientas/projects-init.mjs";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
// La puerta ya no vive en el marco: vive DENTRO de cada repositorio plantilla,
// y el marco guarda su original aca. El motivo esta en
// herramientas/projects-plantilla-repos.mjs: una puerta en el marco tendria que
// CREAR los workflows del proyecto, y el GITHUB_TOKEN no puede.
const PUERTA_YML = "herramientas/plantilla-repos/personalizar.yml";

// ---------------------------------------------------------------------------
// LA PUERTA WEB: LA TERCERA ENTRADA, LA QUE NO PIDE TERMINAL.
//
// QUE CIERRA. Las dos entradas que habia exigen terminal: el asistente aborta si
// stdin no lo es, y `--valores` exige escribir un JSON de 25 claves a mano.
// Medido: alguien que no abre una terminal no llegaba ni al Paso 0.
//
// LO QUE ESTE BANCO VIGILA POR ENCIMA DE TODO: que la puerta NO SEA UN SEGUNDO
// MOTOR. Traduce el formulario al mismo objeto `respuestas` del asistente y
// despues llama a las MISMAS `derivar` y `desvios`. Una segunda derivacion
// diverge, y la que se pudre es la que nadie mira.
//
// Y LA COMPROBACION MAS IMPORTANTE DEL ARCHIVO: el paso de reemplazo VACIA LA
// RAIZ del repositorio. Corrido en el repositorio del marco lo borraria entero.
// Por eso hay DOS guardas --el `if` del YAML y el chequeo del codigo-- y por eso
// este banco exige las dos: un `if` de YAML se edita sin que nada lo mire.
// ---------------------------------------------------------------------------

const enTemporal = (fn) => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "puerta-"));
  try { return fn(tmp); } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
};

const formulario = (extra = {}) => ({ forma: "aplicacion", plataforma: "supabase", equipo: "solo", companero: "", dominio: "", ...extra });

test("el formulario tiene campos, y entran en el tope de GitHub", () => {
  assert.ok(CAMPOS.length >= 4, `se declararon ${CAMPOS.length} campos: parece vacio`);
  assert.ok(CAMPOS.length <= 10, `workflow_dispatch admite 10 inputs y se declararon ${CAMPOS.length}`);
});

test("el nombre y la cuenta salen del repositorio, no de una pregunta", () => {
  const r = respuestasDelFormulario(formulario(), "alguien/Mi-Agenda");
  assert.equal(r.PROYECTO, "mi-agenda", "el nombre de repo se normaliza a minusculas, como hace el asistente");
  assert.equal(r.ORG, "alguien");
});

test("un repositorio con forma rara no se adivina: se rechaza nombrandolo", () => {
  assert.throws(() => respuestasDelFormulario(formulario(), "sin-barra"), /se esperaba duenio\/nombre/);
});

test("LA GUARDA QUE MAS IMPORTA: correrlo en un repositorio TEMPLATE se rechaza", () => {
  const antes = process.env.ES_TEMPLATE;
  process.env.ES_TEMPLATE = "true";
  try {
    const p = problemas(formulario(), "cualquiera/lo-que-sea");
    assert.equal(p.length, 1, `se esperaba exactamente un problema y hubo ${p.length}`);
    assert.match(p[0], /borraria el repositorio entero/);
    assert.match(p[0], /Use this template/, "tiene que decir que hacer en su lugar, no solo que no");
  } finally {
    if (antes === undefined) delete process.env.ES_TEMPLATE;
    else process.env.ES_TEMPLATE = antes;
  }
});

test("la guarda NO se apoya en el nombre de la cuenta: un literal deja de coincidir al copiarse", () => {
  // Sin ES_TEMPLATE, ni siquiera el repositorio del marco por su nombre dispara.
  // Es a proposito: la señal es `is_template`, que viaja con el repositorio.
  assert.deepEqual(problemas(formulario(), `${CUENTA_DEL_MARCO}/Projects`), []);
});

test("y en un repositorio normal deja pasar: una guarda que corta siempre rompe la herramienta", () => {
  assert.deepEqual(problemas(formulario(), "alguien/su-proyecto"), []);
});

test("elegir equipo sin nombrar a la otra persona se rechaza antes de escribir nada", () => {
  const p = problemas(formulario({ equipo: "equipo" }), "alguien/x");
  assert.equal(p.length, 1);
  assert.match(p[0], /CODEOWNERS/, "el motivo tiene que decir para que hace falta");
});

test("un dominio mal escrito se rechaza diciendo como se escribe", () => {
  for (const malo of ["https://mi.com", "mi.com/", "sin-punto"]) {
    const p = problemas(formulario({ dominio: malo }), "alguien/x");
    assert.equal(p.length, 1, `"${malo}" tendria que rechazarse`);
    assert.match(p[0], /miproyecto\.com/, "tiene que traer la forma correcta, no solo el rechazo");
  }
  assert.deepEqual(problemas(formulario({ dominio: "mi-proyecto.com" }), "alguien/x"), [], "un dominio valido pasa");
});

test("LO QUE MAS IMPORTA: lo que la puerta escribe pasa el validador de siempre", () => {
  enTemporal((tmp) => {
    for (const forma of ["aplicacion", "sitio"]) {
      for (const plataforma of ["supabase", "ninguna"]) {
        const { valores } = escribir(tmp, formulario({ forma, plataforma }), "alguien/mi-proyecto");
        const problemasDelInit = validarValores(valores).problemas ?? [];
        assert.deepEqual(
          problemasDelInit,
          [],
          `forma=${forma} plataforma=${plataforma} produce un archivo que el init rechaza:\n${problemasDelInit.join("\n")}`,
        );
      }
    }
  });
});

test("ORG_MARCO NO sale del remoto de la copia: sale del repositorio del marco", () => {
  enTemporal((tmp) => {
    const { valores } = escribir(tmp, formulario(), "otra-cuenta/su-proyecto");
    assert.equal(
      valores.ORG_MARCO,
      CUENTA_DEL_MARCO,
      "si ORG_MARCO tomara la cuenta de la persona, su proyecto consumiria workflows de un repositorio inexistente",
    );
    assert.notEqual(valores.ORG_MARCO, "otra-cuenta");
  });
});

test("escribe los desvios, que es lo que el camino de --valores NO hace", () => {
  enTemporal((tmp) => {
    const { desvios } = escribir(tmp, formulario(), "alguien/x");
    assert.ok(desvios.length > 0, "sin desvios, la constitucion del proyecto sale como si no hubiera ningun hueco");
    for (const d of desvios) {
      for (const clave of ["regla", "motivo", "aprobado_por", "fecha"]) {
        assert.ok(d[clave], `un desvio sin "${clave}" no se puede auditar: ${JSON.stringify(d)}`);
      }
    }
  });
});

test("la puerta tiene LAS DOS guardas, no una", () => {
  const yml = fs.readFileSync(path.join(RAIZ, PUERTA_YML), "utf8");
  assert.match(yml, /if:\s*github\.event\.repository\.is_template\s*!=\s*true/, "falta la guarda del `if` del job");
  assert.match(yml, /ES_TEMPLATE:\s*\$\{\{\s*github\.event\.repository\.is_template\s*\}\}/, "el workflow no le pasa is_template al codigo, que es donde vive la segunda guarda");
  assert.match(yml, /projects-puerta\.mjs/, "el workflow no llama al codigo, que es donde vive la segunda guarda");
  assert.match(yml, /permissions:/, "el job tiene que declarar sus permisos");
});

test("la puerta NO toca los workflows, porque el GITHUB_TOKEN no puede", () => {
  const yml = fs.readFileSync(path.join(RAIZ, PUERTA_YML), "utf8");
  assert.match(
    yml,
    /rm -rf "\$\{RUNNER_TEMP\}\/proyecto\/\.github\/workflows"/,
    "la puerta tiene que sacarle los workflows al proyecto recien armado ANTES de copiar: si los copiara, " +
      "el push se rechaza con «refusing to allow a GitHub App to create or update workflow»",
  );
  assert.match(yml, /-not -name '\.github'/, "el vaciado de la raiz tiene que salvar .github");
});

test("la puerta se borra a si misma, que es lo unico que SI puede hacer con un workflow", () => {
  const yml = fs.readFileSync(path.join(RAIZ, PUERTA_YML), "utf8");
  assert.match(yml, /rm -f \.github\/workflows\/personalizar\.yml/, "sin esto, se puede volver a correr sobre un proyecto ya personalizado");
});

test("la puerta trae el marco en la version que el proyecto declara, no en main", () => {
  const yml = fs.readFileSync(path.join(RAIZ, PUERTA_YML), "utf8");
  assert.ok(!/ref:\s*main/.test(yml), "con `main` el proyecto nace con un artefacto de la version en desarrollo y su CI lo rechaza");
  // El patron del propio workflow lleva el punto escapado para grep, asi que se
  // busca la parte estable y no la expresion literal.
  assert.match(yml, /marco-ci/, "la version se lee del propio ci.yml del proyecto");
  assert.match(yml, /GITHUB_OUTPUT/, "la version leida tiene que salir como output del paso");
});

test("el paso que vacia la raiz salva .git: sin el no queda repositorio", () => {
  const yml = fs.readFileSync(path.join(RAIZ, PUERTA_YML), "utf8");
  const borrado = yml.split("\n").find((l) => l.includes("find .") && l.includes("rm -rf") && l.includes("-maxdepth"));
  assert.ok(borrado, "no encontre el paso de reemplazo: si se reescribio, actualiza este banco en el mismo cambio");
  assert.match(borrado, /-not -name '\.git'/, "el borrado no salva .git");
  assert.match(borrado, /-mindepth 1/, "sin -mindepth 1, find intenta borrar el propio directorio");
});

test("corrido de verdad sobre un template, sale distinto de cero y no escribe nada", () => {
  enTemporal((tmp) => {
    let codigo = 0;
    try {
      execFileSync("node", [path.join(RAIZ, "herramientas/projects-puerta.mjs"), tmp], {
        env: {
          ...process.env,
          GITHUB_REPOSITORY: "alguien/su-copia",
          ES_TEMPLATE: "true",
          ENTRADA_FORMA: "sitio",
          ENTRADA_PLATAFORMA: "ninguna",
          ENTRADA_EQUIPO: "solo",
        },
        stdio: "pipe",
      });
    } catch (e) {
      codigo = e.status;
    }
    assert.notEqual(codigo, 0, "tiene que salir distinto de cero");
    assert.deepEqual(fs.readdirSync(tmp), [], "no puede haber escrito un solo archivo");
  });
});

test("y corrido de verdad en un repositorio normal, escribe y sale 0", () => {
  enTemporal((tmp) => {
    execFileSync("node", [path.join(RAIZ, "herramientas/projects-puerta.mjs"), tmp], {
      env: {
        ...process.env,
        GITHUB_REPOSITORY: "alguien/su-proyecto",
        ES_TEMPLATE: "false",
        ENTRADA_FORMA: "sitio",
        ENTRADA_PLATAFORMA: "ninguna",
        ENTRADA_EQUIPO: "solo",
      },
      stdio: "pipe",
    });
    assert.deepEqual(fs.readdirSync(tmp).sort(), ["desvios.json", "valores.json"]);
  });
});
