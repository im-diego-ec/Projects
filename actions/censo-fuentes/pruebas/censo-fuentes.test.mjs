// Banco de pruebas del censo de fuentes. Corre con `node --test`, el runner
// que trae Node 22: cero dependencias, igual que el resto del marco.
//
//   node --test actions/censo-fuentes/pruebas/
//
// Por qué existe y por qué NO es opcional: el marco no puede dogfoodear este
// check —no tiene manifiestos de paquete propios, así que el censo no verifica
// nada acá— y es la primera pieza de Projects con código no trivial. La única
// evidencia disponible son estos casos sintéticos más la corrida contra el
// consumidor real; las dos son obligatorias (design, "Riesgos y límites").
//
// Las sondas (git, el analizador, el compilador) se inyectan: los fixtures del
// disco aportan los manifiestos y los tsconfig REALES —que es lo que se quiere
// ejercitar de verdad— y las listas de "quién vio qué" se pasan a mano, porque
// instalar eslint y typescript en este repo para las pruebas sería exactamente
// la dependencia que el marco no admite.

import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  aPosix,
  declaraEntradas,
  derivarAlcance,
  globARegExp,
  leerPaquetes,
  limpiarJsonc,
  paqueteDe,
  relativoA,
  resolverTsc,
  salidasPara,
  sondarAnalizador,
  EXTENSIONES_FUENTE,
} from "../censo-fuentes.mjs";

const FIXTURES = aPosix(join(import.meta.dirname, "fixtures"));
const MONOREPO = join(FIXTURES, "monorepo");

// El universo que el fixture "monorepo" representa, tal como lo devolvería
// `git ls-files` en un repo con esa forma.
const RASTREADOS = [
  "package.json",
  "tsconfig.base.json",
  "paquete-a/package.json",
  "paquete-a/tsconfig.json",
  "paquete-a/herramienta.mjs",
  "paquete-a/src/visto-por-todos.ts",
  "paquete-a/src/solo-compilador.ts",
  "paquete-a/src/solo-analizador.ts",
  "paquete-a/src/nadie-lo-mira.ts",
  "paquete-a/src/cliente.gen.ts",
  "paquete-b/package.json",
  "paquete-b/src/algo.ts",
  "paquete-c/package.json",
  "paquete-c/src/sin-motivo.ts",
  "README.md",
];

/** Corre el núcleo del censo contra el fixture, con las sondas que se le pasen. */
function censar({ vistoAnalizador, programas, rastreados = RASTREADOS }) {
  const paquetes = leerPaquetes(MONOREPO, rastreados);
  return derivarAlcance({
    rastreados,
    analizador: { disponible: true, archivos: vistoAnalizador },
    tipos: { tsconfigs: ["tsconfig.base.json", "paquete-a/tsconfig.json"], declarantes: ["paquete-a/tsconfig.json"], programas },
    paquetes,
  });
}

// Lo que ven las herramientas en el caso "todo bien salvo lo que se quiere probar".
const VE_ANALIZADOR = [
  "paquete-a/herramienta.mjs",
  "paquete-a/src/visto-por-todos.ts",
  "paquete-a/src/solo-analizador.ts",
  "paquete-b/src/algo.ts",
  "paquete-c/src/sin-motivo.ts",
];
const VE_COMPILADOR = [
  {
    tsconfig: "paquete-a/tsconfig.json",
    archivos: [
      "paquete-a/src/visto-por-todos.ts",
      "paquete-a/src/solo-compilador.ts",
      "paquete-a/src/cliente.gen.ts",
      "paquete-b/src/algo.ts",
      "paquete-c/src/sin-motivo.ts",
    ],
    error: "",
  },
];

const huecoDe = (informe, archivo) => informe.huecos.find((h) => h.archivo === archivo);

// ---------------------------------------------------------------------------
// La resta: los casos que el change enumera como obligatorios
// ---------------------------------------------------------------------------

test("archivo que no mira NINGUNA herramienta: es hueco por las dos razones", () => {
  const informe = censar({ vistoAnalizador: VE_ANALIZADOR, programas: VE_COMPILADOR });
  const h = huecoDe(informe, "paquete-a/src/nadie-lo-mira.ts");
  assert.ok(h, "el archivo que nadie mira tiene que aparecer como hueco");
  assert.equal(h.faltaAnalizador, true);
  assert.equal(h.faltaTipos, true);
});

test("archivo visto SOLO por el analizador: sigue siendo hueco por falta de tipos", () => {
  // Este es el agujero real de los scripts del consumidor: eslint los lintea,
  // así que "el paquete tiene lint" es cierto y aun así nadie les verifica tipos.
  const informe = censar({ vistoAnalizador: VE_ANALIZADOR, programas: VE_COMPILADOR });
  const h = huecoDe(informe, "paquete-a/src/solo-analizador.ts");
  assert.ok(h, "ver un .ts solo con el analizador no alcanza");
  assert.equal(h.faltaAnalizador, false);
  assert.equal(h.faltaTipos, true);
});

test("archivo visto SOLO por el compilador: sigue siendo hueco por falta de analizador", () => {
  // Este es el agujero del componente de dominio tragado por un ignore pensado
  // para generados: el tsconfig lo compila, pero ninguna regla lo mira.
  const informe = censar({ vistoAnalizador: VE_ANALIZADOR, programas: VE_COMPILADOR });
  const h = huecoDe(informe, "paquete-a/src/solo-compilador.ts");
  assert.ok(h, "compilar un archivo no equivale a analizarlo");
  assert.equal(h.faltaAnalizador, true);
  assert.equal(h.faltaTipos, false);
});

test("archivo visto por las dos herramientas: no es hueco", () => {
  const informe = censar({ vistoAnalizador: VE_ANALIZADOR, programas: VE_COMPILADOR });
  assert.equal(huecoDe(informe, "paquete-a/src/visto-por-todos.ts"), undefined);
});

test("un .mjs visto por el analizador NO exige programa de tipos", () => {
  // "cuando el lenguaje tenga verificación de tipos" es parte del requirement,
  // no una concesión: exigirle un tsconfig a un .mjs sería un falso positivo.
  const informe = censar({ vistoAnalizador: VE_ANALIZADOR, programas: VE_COMPILADOR });
  assert.equal(huecoDe(informe, "paquete-a/herramienta.mjs"), undefined);
});

// ---------------------------------------------------------------------------
// Exclusiones
// ---------------------------------------------------------------------------

test("exclusión válida: saca el archivo del censo y queda registrada con su motivo", () => {
  // cliente.gen.ts no lo ve el analizador, y aun así el censo pasa por él:
  // paquete-a lo declara excluido con motivo escrito.
  const informe = censar({ vistoAnalizador: VE_ANALIZADOR, programas: VE_COMPILADOR });
  assert.equal(huecoDe(informe, "paquete-a/src/cliente.gen.ts"), undefined);

  const viva = informe.exclusionesVivas.find((e) => e.manifiesto === "paquete-a/package.json");
  assert.ok(viva, "la exclusión válida tiene que quedar registrada");
  assert.deepEqual(viva.archivos, ["paquete-a/src/cliente.gen.ts"]);
  assert.match(viva.motivo, /codegen/);
  assert.equal(viva.patron, "src/*.gen.ts");
});

test("exclusión muerta: patrón que ya no corresponde a ningún archivo rastreado es ROJO", () => {
  const informe = censar({ vistoAnalizador: VE_ANALIZADOR, programas: VE_COMPILADOR });
  assert.equal(informe.exclusionesMuertas.length, 1);
  assert.equal(informe.exclusionesMuertas[0].manifiesto, "paquete-b/package.json");
  assert.equal(informe.exclusionesMuertas[0].patron, "src/borrado-hace-meses.ts");
});

test("exclusión sin motivo: inválida, y NO excluye nada", () => {
  const informe = censar({ vistoAnalizador: VE_ANALIZADOR, programas: VE_COMPILADOR });
  const invalida = informe.exclusionesInvalidas.find((e) => e.manifiesto === "paquete-c/package.json");
  assert.ok(invalida, "una exclusión sin motivo tiene que reportarse");
  assert.match(invalida.problema, /motivo/);

  // Y el archivo que nombraba sigue sujeto al censo: si no lo viera nadie, sería hueco.
  const informeCiego = censar({
    vistoAnalizador: VE_ANALIZADOR.filter((a) => a !== "paquete-c/src/sin-motivo.ts"),
    programas: [{ ...VE_COMPILADOR[0], archivos: VE_COMPILADOR[0].archivos.filter((a) => a !== "paquete-c/src/sin-motivo.ts") }],
  });
  assert.ok(huecoDe(informeCiego, "paquete-c/src/sin-motivo.ts"), "una exclusión inválida no puede tapar un archivo");
});

test("la exclusión de un paquete no alcanza a los archivos de otro", () => {
  // El patrón de paquete-a es "src/*.gen.ts", relativo a paquete-a. Si se
  // interpretara contra la raíz, taparía archivos de paquetes vecinos.
  const rastreados = [...RASTREADOS, "paquete-b/src/otro.gen.ts"];
  const informe = censar({ vistoAnalizador: VE_ANALIZADOR, programas: VE_COMPILADOR, rastreados });
  assert.ok(huecoDe(informe, "paquete-b/src/otro.gen.ts"), "el .gen.ts de paquete-b no está excluido por paquete-a");
});

// ---------------------------------------------------------------------------
// Listado vacío: la frontera entre "no hay datos" y "todo cubierto"
// ---------------------------------------------------------------------------

test("listado vacío habiendo fuentes bajo ese tsconfig: ROJO, nunca fail-open mudo", () => {
  const informe = censar({
    vistoAnalizador: VE_ANALIZADOR,
    programas: [{ tsconfig: "paquete-a/tsconfig.json", archivos: [], error: "tsc no listó ningún archivo" }],
  });
  assert.equal(informe.programasVacios.length, 1);
  assert.equal(informe.programasVacios[0].tsconfig, "paquete-a/tsconfig.json");
});

test("listado vacío SIN fuentes bajo ese tsconfig: no se inventa un rojo", () => {
  const rastreados = ["package.json", "vacio/tsconfig.json", "vacio/LEEME.md"];
  const informe = censar({
    vistoAnalizador: [],
    programas: [{ tsconfig: "vacio/tsconfig.json", archivos: [], error: "" }],
    rastreados,
  });
  assert.equal(informe.programasVacios.length, 0);
});

// ---------------------------------------------------------------------------
// Los tsconfig: qué cuenta como "programa de tipos"
// ---------------------------------------------------------------------------

test("un tsconfig con solo compilerOptions NO declara entradas", () => {
  // Si contara, sería catastrófico en silencio: sin `files` ni `include`,
  // TypeScript asume todo el subárbol y ese archivo "cubriría" el repo entero
  // sin que ningún script lo ejecute jamás.
  assert.equal(declaraEntradas(join(MONOREPO, "tsconfig.base.json")), false);
});

test("un tsconfig con include declara entradas", () => {
  assert.equal(declaraEntradas(join(MONOREPO, "paquete-a/tsconfig.json")), true);
});

test("un tsconfig que hereda las entradas de su padre declara entradas", () => {
  assert.equal(declaraEntradas(join(FIXTURES, "hereda/tsconfig.json")), true);
});

test("un tsconfig ilegible se trata como declarante (fail-closed)", () => {
  assert.equal(declaraEntradas(join(FIXTURES, "no-existe/tsconfig.json")), true);
});

// ---------------------------------------------------------------------------
// Skip honesto: la precondición, comprobada contra un directorio sin toolchain
// ---------------------------------------------------------------------------

test("repo de otro stack: ni analizador ni compilador resolubles (skip honesto)", async () => {
  const raiz = join(FIXTURES, "sin-toolchain");
  const analizador = await sondarAnalizador(raiz);
  assert.equal(analizador.disponible, false, "no hay eslint instalado en el fixture");
  assert.match(analizador.motivo, /no se pudo resolver eslint/);
  assert.equal(resolverTsc(raiz), null, "no hay typescript instalado en el fixture");
  // Con las dos sondas en falso, main() emite ::warning:: y sale 0: ni rojo
  // sobre un repo sano de otro stack, ni un verde mudo que diga "verificado".
});

// ---------------------------------------------------------------------------
// El guardia de módulo principal: la única rama que este banco NO puede
// ejercitar importando el módulo, porque importar es justamente lo que el
// guardia tiene que distinguir de ejecutar.
//
// Estas dos pruebas SPAWNEAN el script como lo spawnea la action. La segunda es
// la que importa: invoca el mismo archivo por una ruta que NO es su ruta
// canónica (un enlace de directorio: junction en Windows, symlink en POSIX),
// que es como llega argv[1] cuando el checkout, el runner o el propio
// desarrollador pasan por un enlace, un nombre corto de Windows (JSANTA~1) o
// una unidad mapeada. Node resuelve el enlace para `import.meta.url` pero NO
// para `process.argv[1]`, así que un guardia por comparación literal decide
// "no soy el principal" y el proceso termina en exit 0 sin haber censado nada
// ni haber dicho una palabra: el fail-open exacto que la constitución prohíbe.
// ---------------------------------------------------------------------------

const SCRIPT_DIR = join(import.meta.dirname, "..");
const SIN_TOOLCHAIN = join(FIXTURES, "sin-toolchain");

/** Corre el script como proceso aparte y devuelve todo lo observable. */
function spawnear(rutaDelScript) {
  const r = spawnSync(process.execPath, [rutaDelScript], {
    encoding: "utf8",
    // Fixture sin analizador ni compilador: el censo toma la rama del skip
    // honesto, que es barata y ruidosa. Alcanza para probar que CORRIÓ.
    // GITHUB_STEP_SUMMARY vacío aísla la prueba del resumen real del runner.
    env: { ...process.env, CENSO_RAIZ: SIN_TOOLCHAIN, GITHUB_STEP_SUMMARY: "" },
  });
  return { codigo: r.status, todo: `${r.stdout ?? ""}\n${r.stderr ?? ""}` };
}

test("spawneado por su ruta canónica, el censo corre y se hace oír", () => {
  const r = spawnear(join(SCRIPT_DIR, "censo-fuentes.mjs"));
  assert.equal(r.codigo, 0);
  assert.match(r.todo, /::warning::censo de fuentes OMITIDO/, "el control del banco: por la ruta canónica el script sí corre");
});

test("spawneado por una ruta NO canónica, el censo TAMBIÉN corre (el guardia no puede ser un exit 0 mudo)", () => {
  const temporal = mkdtempSync(join(tmpdir(), "projects-censo-guardia-"));
  try {
    const enlace = join(temporal, "accion");
    try {
      // "junction" es el único tipo de enlace de directorio que Windows crea
      // sin privilegios de administrador; en POSIX el tipo se ignora.
      symlinkSync(SCRIPT_DIR, enlace, "junction");
    } catch (e) {
      // Sin enlace no hay prueba, y una prueba que no pudo verificar nada no se
      // reporta como verde: el guardia quedaría sin cubrir y en silencio.
      assert.fail(`no se pudo crear el enlace de directorio, el guardia quedó SIN cubrir: ${e.message}`);
    }

    const r = spawnear(join(enlace, "censo-fuentes.mjs"));
    assert.match(
      r.todo,
      /::warning::censo de fuentes OMITIDO/,
      "invocado por una ruta no canónica el script no dijo NADA: el guardia lo desactivó y el paso terminó en verde sin censar"
    );
    assert.equal(r.codigo, 0);
  } finally {
    try {
      rmSync(temporal, { recursive: true, force: true, maxRetries: 5 });
    } catch {
      // Basura en el temporal del sistema, no un fallo de la prueba.
    }
  }
});

// ---------------------------------------------------------------------------
// Piezas de apoyo
// ---------------------------------------------------------------------------

test("globARegExp: ** cruza directorios, * no", () => {
  assert.equal(globARegExp("src/**/*.ts").test("src/a/b/c.ts"), true);
  assert.equal(globARegExp("src/**/*.ts").test("src/c.ts"), true);
  assert.equal(globARegExp("src/*.ts").test("src/a/b.ts"), false);
  assert.equal(globARegExp("src/*.ts").test("src/b.ts"), true);
  assert.equal(globARegExp("dist/**").test("dist/x/y.js"), true);
  assert.equal(globARegExp("a.ts").test("ab.ts"), false);
  // El punto es literal, no "cualquier carácter".
  assert.equal(globARegExp("src/a.ts").test("src/axts"), false);
});

test("limpiarJsonc: comentarios y comas colgantes fuera, cadenas intactas", () => {
  const crudo = '{\n  // linea\n  "a": "http://ejemplo/x", /* bloque */\n  "b": [1, 2,],\n}';
  assert.deepEqual(JSON.parse(limpiarJsonc(crudo)), { a: "http://ejemplo/x", b: [1, 2] });
});

test("relativoA: tolera la capitalización de unidad de Windows", () => {
  // El compilador y git devuelven la misma raíz con distinta capitalización.
  // Sin esto, en Windows TODO archivo aparecería como no visto.
  const raiz = "C:/repo";
  const esperado = process.platform === "win32" ? "src/a.ts" : null;
  assert.equal(relativoA(raiz, "c:/repo/src/a.ts"), esperado);
  assert.equal(relativoA(raiz, "C:/repo/src/a.ts"), "src/a.ts");
  assert.equal(relativoA(raiz, "D:/otro/src/a.ts"), null);
});

test("paqueteDe: gana el manifiesto más cercano hacia arriba", () => {
  const paquetes = leerPaquetes(MONOREPO, RASTREADOS);
  assert.equal(paqueteDe(paquetes, "paquete-a/src/visto-por-todos.ts").dir, "paquete-a");
  assert.equal(paqueteDe(paquetes, "README.md").dir, "");
});

test("el mensaje de fallo nombra el archivo, da las TRES salidas y el comando local", () => {
  const paquetes = leerPaquetes(MONOREPO, RASTREADOS);
  const hueco = { archivo: "paquete-a/src/nadie-lo-mira.ts", faltaAnalizador: true, faltaTipos: true };
  const texto = salidasPara(hueco, paquetes, ["paquete-a/tsconfig.json"], "node censo-fuentes.mjs").join("\n");

  assert.match(texto, /paquete-a\/src\/nadie-lo-mira\.ts/);
  assert.match(texto, /1\).*programa de tipos/s);
  assert.match(texto, /2\).*alcance del analizador/s);
  assert.match(texto, /3\).*excluido CON MOTIVO/s);
  // El arreglo, no el diagnóstico: el manifiesto exacto y la forma exacta.
  assert.match(texto, /paquete-a\/package\.json/);
  assert.match(texto, /"patron": "src\/nadie-lo-mira\.ts"/);
  assert.match(texto, /Reproducilo local/);
  assert.match(texto, /node censo-fuentes\.mjs/);
});

test("la lista de extensiones cubre las dos familias del stack fijado", () => {
  for (const e of [".ts", ".tsx", ".mjs", ".js"]) assert.ok(EXTENSIONES_FUENTE.includes(e), `falta ${e}`);
});
