// GUARDA DE LAS REGLAS DE MARCA DEL ANDAMIO.
//
// QUE VERIFICA Y QUE NO. Leelo antes de confiar en el verde.
//
// El repo del marco no tiene package.json ni node_modules —todo corre con
// `node --test` y builtins, y eso es una propiedad, no un descuido— asi que
// esta prueba NO puede invocar ESLint. Lo que si puede, y hace:
//   - que el bloque exista, con alcance PROPIO y en severidad "error";
//   - que cada regex embebido en un selector COMPILE (uno roto hace tirar a
//     ESLint en cada corrida de cada consumidor);
//   - que cada regex acepte su caso violatorio y rechace sus casos legitimos;
//   - un control no-op: clases de trabajo honesto que ningun regex debe morder;
//   - que toda regla de marca de la constitucion tenga decidido su estado
//     frente al linter;
//   - y —lo que hace que todo lo de arriba signifique algo— que cada una de
//     esas comprobaciones MUERDA: se mutan copias del andamio y se exige que la
//     comprobacion correspondiente reporte el problema. Una guarda que nunca
//     falla no verifica nada.
//
// Lo que NO puede verificar es la otra mitad de cada selector: que "Literal",
// "TemplateElement", "JSXText" o "JSXOpeningElement" seleccionen los nodos que
// creemos. Eso exige un parser y un ESLint de verdad, y esta en
// pruebas/marca/banco-eslint.mjs, que se corre a mano contra un repo que los
// tenga instalados. La evidencia de esa corrida va en el PR que toca el bloque.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { leerBloqueDeMarca, regexDelSelector } from "./extraer.mjs";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const ANDAMIO = path.join(RAIZ, "plantilla/eslint.config.mjs");
const CANONICO = path.join(RAIZ, "actions/constitucion/canonico/90-marca.md");

// Un caso violatorio y sus casos legitimos por selector, en el mismo orden en
// que el andamio los declara. El valor de cada caso es lo que el ATRIBUTO del
// selector va a contener: la clase de un className, la parte fija de una
// plantilla, el nombre de un metodo, el texto de un boton.
const CASOS = [
  {
    nombre: "blanco sobre el acento (Literal)",
    rojo: "bg-la organización-orange text-white hover:bg-orange-600",
    verdes: ["bg-la organización-orange text-slate-900", "bg-slate-800 text-white"],
  },
  {
    nombre: "blanco sobre el acento (parte fija de una plantilla)",
    rojo: "bg-orange-500 text-white ",
    verdes: ["bg-orange-500 text-slate-900 "],
  },
  {
    nombre: "hex crudo (Literal)",
    rojo: "#F97316",
    verdes: ["var(--color-acento)", "#app"],
  },
  {
    nombre: "hex crudo (parte fija de una plantilla)",
    rojo: "color: #F97316; ",
    verdes: ["color: var(--color-acento); "],
  },
  {
    nombre: "valor arbitrario fuera de la escala",
    rojo: "z-[9999] w-[13px]",
    verdes: ["z-50 w-full", "grid-cols-[1fr_auto]", "data-[state=checked]:bg-acento"],
  },
  {
    nombre: "outline-none sin foco de reemplazo",
    rojo: "outline-none px-2",
    verdes: ["outline-none focus-visible:ring-2", "focus-visible:ring-2 outline-none"],
  },
  {
    nombre: "focus: donde va focus-visible:",
    rojo: "focus:ring-2",
    verdes: ["focus-visible:ring-2", "group-focus:ring-2"],
  },
  {
    nombre: "fecha u hora sin locale",
    rojo: "toLocaleDateString",
    verdes: ["format", "toLocaleString", "toISOString"],
  },
  {
    nombre: "rotulo que no dice que va a pasar",
    rojo: "Aceptar",
    verdes: ["Guardar cambios", "Aceptar terminos", "Crear cuenta"],
  },
  {
    // Este selector no lleva regex: elige el elemento por nombre exacto. Su
    // caso rojo y su caso verde solo los puede decidir el banco con ESLint.
    nombre: "SVG dibujado en el JSX",
    sinRegex: true,
  },
];

// Control no-op. Clases y nombres de trabajo legitimo, del estilo que el
// andamio espera de un proyecto que usa tokens. Si alguno sale en rojo, las
// reglas muerden trabajo honesto y con --max-warnings=0 eso deja el repo del
// consumidor en rojo desde el primer commit.
const CONTROL = [
  "bg-surface-1 text-fg-1 rounded-lg p-4 shadow-sm",
  "bg-acento text-acento-fg rounded-md px-3 py-2 focus-visible:ring-2 focus-visible:ring-offset-2",
  "border-border-1 text-fg-1 rounded-md border px-3 py-2",
  "grid grid-cols-[1fr_auto] items-center gap-2",
  "text-lg font-semibold",
  "h-6 w-6",
  "mt-4 flex gap-2",
  "var(--color-acento)",
  "Guardar cambios",
  "Descartar",
  "Intl",
  "DateTimeFormat",
];

// ---------------------------------------------------------------------------
// Las comprobaciones, en funciones, para que las corran DOS clientes: el
// andamio de verdad (donde tienen que salir sin problema) y las copias mutadas
// (donde tienen que salir CON problema). Una comprobacion escrita dos veces se
// desincroniza y la mitad de mutacion deja de significar algo.
//
// Cada una devuelve null si esta bien, o el texto del problema.
// ---------------------------------------------------------------------------
const COMPROBACIONES = {
  "el bloque existe y se puede leer": (b) => (b.error ? b.error : null),

  "el bloque tiene alcance propio": (b) =>
    b.tieneAlcancePropio
      ? null
      : "el bloque no declara su propio `files`: apoyarse en la lista global de " +
        "`ignores` es fragil, porque un repo puede haberla recortado (el consumidor de " +
        "referencia borro **/*.config.js) y entonces las reglas morderian la " +
        "configuracion de estilos, que es el unico lugar legitimo donde los valores " +
        "de marca se escriben",

  // Con --max-warnings=0 un "warn" ES un rojo, solo peor explicado: el
  // consumidor veria un fallo sin la palabra que lo nombra.
  "la severidad es error y no aviso": (b) =>
    b.severidad === "error" ? null : `severidad ${JSON.stringify(b.severidad)}`,

  "hay un caso declarado por cada selector": (b) =>
    b.selectores.length === CASOS.length
      ? null
      : `el andamio declara ${b.selectores.length} selectores y esta prueba cubre ` +
        `${CASOS.length}: agregar un selector sin su caso lo dejaria sin probar`,

  "todo selector trae un mensaje que dice que hacer": (b) => {
    const malos = b.selectores
      .map((s, i) => [i, s])
      .filter(([, s]) => !s.selector || typeof s.message !== "string" || s.message.length < 40)
      .map(([i]) => i);
    return malos.length
      ? `selectores sin mensaje util (${malos.join(", ")}): un "no hagas eso" sin el ` +
          "que si deja al consumidor adivinando"
      : null;
  },

  "cada regex del andamio compila": (b) => {
    const rotos = [];
    for (const [i, s] of b.selectores.entries()) {
      const re = regexDelSelector(s.selector);
      if (re === null) continue;
      try {
        new RegExp(re);
      } catch (e) {
        rotos.push(`${i}: ${e.message}`);
      }
    }
    return rotos.length
      ? `regex que no compilan (${rotos.join(" | ")}): ESLint tira en CADA corrida de ` +
          "CADA consumidor"
      : null;
  },

  "cada regex acepta su caso violatorio y rechaza los legitimos": (b) => {
    const problemas = [];
    for (const [i, caso] of CASOS.entries()) {
      const s = b.selectores[i];
      if (!s) continue;
      const re = regexDelSelector(s.selector);
      if (caso.sinRegex) {
        if (re !== null) problemas.push(`(${i}) ${caso.nombre}: el selector gano un regex sin caso`);
        continue;
      }
      if (re === null) {
        problemas.push(`(${i}) ${caso.nombre}: el selector perdio su regex`);
        continue;
      }
      let rx;
      try {
        rx = new RegExp(re);
      } catch {
        continue; // ya lo reporta la comprobacion de compilacion
      }
      if (!rx.test(caso.rojo)) {
        problemas.push(`(${i}) ${caso.nombre}: NO detecta ${JSON.stringify(caso.rojo)}`);
      }
      for (const verde of caso.verdes) {
        if (rx.test(verde)) {
          problemas.push(`(${i}) ${caso.nombre}: falso positivo sobre ${JSON.stringify(verde)}`);
        }
      }
    }
    return problemas.length ? problemas.join("\n  ") : null;
  },

  "control no-op: ningun regex muerde trabajo legitimo": (b) => {
    const mordidas = [];
    for (const [i, s] of b.selectores.entries()) {
      const re = regexDelSelector(s.selector);
      if (re === null) continue;
      let rx;
      try {
        rx = new RegExp(re);
      } catch {
        continue;
      }
      for (const v of CONTROL) if (rx.test(v)) mordidas.push(`selector ${i} <- ${JSON.stringify(v)}`);
    }
    return mordidas.length ? mordidas.join("\n  ") : null;
  },

  "toda regla de marca del canonico tiene decidido su estado frente al linter": (b) => {
    const canonico = fs.readFileSync(CANONICO, "utf8");
    const ids = [...canonico.matchAll(/<!--\s*projects:regla id=([\w-]+)\s*-->/g)].map((m) => m[1]);
    if (ids.length === 0) return "el canonico de marca no declara ninguna regla con id";
    const sinDecidir = ids.filter((id) => !b.comentario.includes(id));
    return sinDecidir.length
      ? `reglas del canonico que no aparecen en el mapa de cobertura del andamio: ` +
          `${sinDecidir.join(", ")}. Alguien agrego una regla de marca sin decidir si un ` +
          'arbol de sintaxis puede verla. Decidirlo puede ser "NO", y esta bien; lo que ' +
          "no vale es dejarlo sin decir"
      : null;
  },
};

/** Lee un andamio y devuelve el bloque, o un objeto con `error` si no se pudo. */
function leer(ruta) {
  try {
    return leerBloqueDeMarca(ruta);
  } catch (e) {
    return { error: e.message, selectores: [], comentario: "", severidad: null };
  }
}

// ---------------------------------------------------------------------------
// 1. El andamio de verdad pasa todas las comprobaciones.
// ---------------------------------------------------------------------------
const real = leer(ANDAMIO);
for (const [nombre, comprobar] of Object.entries(COMPROBACIONES)) {
  test(nombre, () => {
    assert.equal(comprobar(real), null);
  });
}

// ---------------------------------------------------------------------------
// 2. Cada comprobacion muerde. Se mutan COPIAS en un directorio temporal: el
//    andamio del repo no se toca, asi que un fallo a mitad de camino no puede
//    dejarlo modificado.
// ---------------------------------------------------------------------------
const BS = String.fromCharCode(92);

const MUTACIONES = [
  {
    nombre: "el bloque entero retirado",
    // La 1.5 del tasks.md, textual: sin esto, borrar el bloque deja el
    // pipeline verde para siempre.
    rompe: "el bloque existe y se puede leer",
    mutar: (s) => {
      const i = s.indexOf("  // [FRONT] IDENTIDAD VISUAL DEL AREA");
      const j = s.indexOf("  // Debe ir al final: apaga reglas de formato");
      return i > 0 && j > i ? s.slice(0, i) + s.slice(j) : s;
    },
  },
  {
    nombre: "el bloque pierde su `files` y hereda el alcance de otro",
    rompe: "el bloque tiene alcance propio",
    mutar: (s) =>
      s.replace(
        '  {\n    files: ["{{PAQUETE_WEB}}/src/**/*.{ts,tsx}"],\n    rules: {\n      "no-restricted-syntax"',
        '  {\n    rules: {\n      "no-restricted-syntax"',
      ),
  },
  {
    nombre: "la severidad baja a aviso",
    rompe: "la severidad es error y no aviso",
    mutar: (s) =>
      s.replace('"no-restricted-syntax": [\n        "error",', '"no-restricted-syntax": [\n        "warn",'),
  },
  {
    nombre: "aparece un selector nuevo sin su caso",
    rompe: "hay un caso declarado por cada selector",
    mutar: (s) =>
      s.replace(
        '        {\n          selector: String.raw`JSXOpeningElement',
        '        { selector: "Literal[value=/loquesea/]", message: "un mensaje largo como para pasar el minimo declarado" },\n        {\n          selector: String.raw`JSXOpeningElement',
      ),
  },
  {
    // OJO: quitar el "]" de una clase de caracteres NO sirve como mutacion,
    // porque el resultado sigue siendo un regex valido. Un parentesis sin
    // cerrar si.
    nombre: "un regex queda roto",
    rompe: "cada regex del andamio compila",
    mutar: (s) =>
      s.replace(
        `(?=[${BS}s${BS}S]*${BS}btext-white${BS}b)`,
        `(?=[${BS}s${BS}S]*${BS}btext-white${BS}b`,
      ),
  },
  {
    nombre: "un regex deja de detectar su propia violacion",
    rompe: "cada regex acepta su caso violatorio y rechaza los legitimos",
    mutar: (s) => s.replace(`${BS}btext-white${BS}b`, `${BS}btext-blanco${BS}b`),
  },
  {
    nombre: "un regex se ensancha y muerde trabajo honesto",
    rompe: "control no-op: ningun regex muerde trabajo legitimo",
    mutar: (s) =>
      s.replace(
        `|z|top|left|right|bottom|inset)-${BS}[`,
        `|z|top|left|right|bottom|inset|grid-cols)-${BS}[`,
      ),
  },
  {
    nombre: "un selector se queda con un mensaje que no dice que hacer",
    rompe: "todo selector trae un mensaje que dice que hacer",
    mutar: (s) =>
      s.replace(
        '            "SVG dibujado en el JSX. El logo y los iconos se usan desde el sistema; una ilustracion propia va en un archivo .svg importado.",',
        '            "No.",',
      ),
  },
  {
    nombre: "una regla del canonico se queda sin decidir",
    rompe: "toda regla de marca del canonico tiene decidido su estado frente al linter",
    mutar: (s) =>
      s.replace("marca-el-logo-no-se-redibuja ....... cubierta (10)", "(la del logo) ..................... cubierta (10)"),
  },
];

test("cada comprobacion muerde: el andamio mutado da rojo donde corresponde", () => {
  const original = fs.readFileSync(ANDAMIO, "utf8");
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "projects-marca-"));

  try {
    for (const m of MUTACIONES) {
      const mutado = m.mutar(original);
      assert.notEqual(
        mutado,
        original,
        `la mutacion "${m.nombre}" no cambio nada: su ancla se movio y desde entonces ` +
          "no esta probando la mordida de nada",
      );

      const ruta = path.join(tmp, "eslint.config.mjs");
      fs.writeFileSync(ruta, mutado, "utf8");
      const b = leer(ruta);
      const problema = COMPROBACIONES[m.rompe](b);
      assert.ok(
        problema !== null,
        `la mutacion "${m.nombre}" NO puso en rojo a "${m.rompe}": esa comprobacion ` +
          "pasa siempre y no esta verificando nada",
      );
    }
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }

  // El andamio del repo no se toco en ningun momento.
  assert.equal(fs.readFileSync(ANDAMIO, "utf8"), original);
});
