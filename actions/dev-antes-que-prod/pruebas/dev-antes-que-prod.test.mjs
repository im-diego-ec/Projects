// Banco de pruebas del invariante dev-antes-que-prod. Corre con `node --test`,
// el runner que trae Node 22: cero dependencias, igual que el resto del marco.
//
//   node --test actions/dev-antes-que-prod/pruebas/dev-antes-que-prod.test.mjs
//
// POR QUE ESTE BANCO ES OBLIGATORIO Y NO OPCIONAL, y acá con más razón que en
// las piezas hermanas: este check NACE ANTES que la primera compuerta. O sea que
// en el momento de escribirlo no existe todavía ningún repositorio donde el
// invariante tenga algo real que verificar, y su corrida verde en el CI de Projects
// es verde VACUA (Projects no tiene un solo job con `environment:`, así que no tiene
// tramo de producción). Sin estos fixtures, el check llegaría a todos los
// consumidores de `@v1` sin haberse ejecutado nunca sobre un caso donde el
// veredicto pudiera ser rojo, y un verde vacuo es indistinguible de un check
// roto.
//
// Los siete casos que `tasks.md` enumera están todos acá, cada uno con su
// veredicto esperado, y después los bordes que el diseño toca: la versión
// distinta, el vocabulario cerrado, la 'ninguna' desmentida por el grafo, el
// aviso de mecánica copiada y el archivo ilegible.
//
// El registro de mecánicas copiadas se INYECTA. En el marco nace vacío (todavía
// no hay ninguna compuerta de entrega publicada que nombrar), y una prueba que
// afirmara sobre el registro real no ejercitaría nada: lo que hay que probar es
// el MECANISMO, para que el change que publique la primera compuerta agregue una
// línea y no un mecanismo.

import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  MARCO_POR_DEFECTO,
  MECANICAS_COPIADAS,
  VIAS,
  definiciones,
  dependenciasDe,
  escapar,
  evaluar,
  indentacion,
  leerWorkflow,
  piezaDelMarco,
} from "../dev-antes-que-prod.mjs";

const FIXTURES = join(import.meta.dirname, "fixtures");
const SCRIPT_DIR = join(import.meta.dirname, "..");
const RAIZ_REPO = join(import.meta.dirname, "..", "..", "..");

/** Lee un fixture y devuelve el veredicto completo, sin imprimir nada: las
 *  aserciones son sobre los DATOS y no sobre un log, que es lo que ya produjo un
 *  falso verde en este proyecto (contar líneas de salida no es medir). */
function veredicto(nombre, { mecanicas = MECANICAS_COPIADAS } = {}) {
  const archivo = `${nombre}.yml`;
  const texto = readFileSync(join(FIXTURES, archivo), "utf8");
  const leido = leerWorkflow(texto, { archivo });
  return { ...evaluar({ ...leido, archivo, mecanicas }), jobs: leido.jobs, esWorkflow: leido.esWorkflow };
}

const tipos = (hallazgos) => hallazgos.map((h) => h.tipo);
const unido = (hallazgos) => hallazgos.map((h) => h.mensaje).join("\n");

// ---------------------------------------------------------------------------
// LOS SIETE CASOS DE tasks.md, cada uno con su veredicto esperado
// ---------------------------------------------------------------------------

test("CASO 1: pieza en dev y en prod, misma versión: VERDE", () => {
  const v = veredicto("pieza-en-dev-y-en-prod");
  assert.deepEqual(v.rojos, [], `salió rojo y no debía:\n${unido(v.rojos)}`);
  assert.deepEqual(v.avisos, []);
  assert.deepEqual(v.piezasProd, ["compuerta-de-ejemplo@v1"]);
  assert.deepEqual(v.piezasDev, ["compuerta-de-ejemplo@v1"]);
  // La vía 'ninguna' se dice igual: el verde no es mudo.
  assert.equal(v.notas.length, 1);
  assert.match(v.notas[0].mensaje, /vía 'ninguna'/);
});

test("CASO 2: la pieza corre SOLO en un job de producción: ROJO, nombrando la pieza y el tramo que falta", () => {
  const v = veredicto("pieza-solo-en-prod");
  assert.deepEqual(tipos(v.rojos), ["sin-tramo-de-dev"]);
  const m = v.rojos[0].mensaje;
  assert.match(m, /compuerta-de-ejemplo@v1/, "el rojo tiene que NOMBRAR la pieza");
  assert.match(m, /deploy-prod/, "el rojo tiene que NOMBRAR el job de producción");
  assert.match(m, /ningún job del tramo de dev/, "el rojo tiene que NOMBRAR el tramo que falta");
});

test("CASO 3: rollback sin tramo de dev: VERDE por excepción declarada, con su nombre y su control", () => {
  const v = veredicto("rollback-sin-tramo-de-dev");
  assert.deepEqual(v.rojos, [], unido(v.rojos));
  assert.deepEqual(tipos(v.notas), ["via"]);
  assert.equal(v.notas[0].via, "rollback-a-artefacto-publicado");
  assert.match(v.notas[0].mensaje, /valida contra el registro ANTES/, "el control compensatorio va en la nota, no sobreentendido");
});

test("CASO 4: dispatch de emergencia: VERDE por excepción declarada", () => {
  const v = veredicto("dispatch-de-emergencia");
  assert.deepEqual(v.rojos, [], unido(v.rojos));
  assert.deepEqual(tipos(v.notas), ["via"]);
  assert.equal(v.notas[0].via, "dispatch-de-emergencia");
  // El `needs:` de este fixture viene en lista de bloque, no en flujo: si el
  // escáner no leyera esa forma, el grafo quedaría vacío y nadie se enteraría.
  const prod = v.jobs.find((j) => j.id === "deploy-prod");
  assert.deepEqual(prod.needs, ["deploy-dev"]);
});

test("CASO 5: reuso de una verificación de dev anterior: VERDE por excepción declarada", () => {
  const v = veredicto("reuso-de-verificacion-de-dev");
  assert.deepEqual(v.rojos, [], unido(v.rojos));
  assert.deepEqual(tipos(v.notas), ["via"]);
  assert.equal(v.notas[0].via, "reuso-de-verificacion-de-dev");
  assert.match(v.notas[0].mensaje, /acto humano deliberado/, "el residuo declarado viaja con la excepción");
});

test("CASO 6: vía que esquiva el invariante sin declararse: ROJO", () => {
  const v = veredicto("via-nueva-sin-declarar");
  assert.deepEqual(tipos(v.rojos), ["sin-declaracion"]);
  assert.match(v.rojos[0].mensaje, /deploy-prod/);
  // El mensaje trae el ARREGLO y el vocabulario completo: obligar a
  // redescubrirlo convierte el check en fricción en vez de en ayuda.
  assert.match(v.rojos[0].mensaje, /projects:sin-tramo-de-dev via=/);
  for (const nombre of Object.keys(VIAS)) assert.match(v.rojos[0].mensaje, new RegExp(nombre));
});

test("CASO 7: ninguna pieza del marco en producción: VERDE VACUO (el consumidor que todavía no adoptó)", () => {
  const v = veredicto("sin-piezas-del-marco-en-prod");
  assert.deepEqual(v.rojos, []);
  assert.deepEqual(v.avisos, []);
  assert.deepEqual(v.notas, []);
  assert.deepEqual(v.piezasProd, [], "es la propiedad que deja entrar este check en MINOR sin romper a nadie");
});

// ---------------------------------------------------------------------------
// LOS BORDES QUE EL DISEÑO TOCA
// ---------------------------------------------------------------------------

test("la MISMA pieza en otra versión no cumple el invariante, y el rojo lo dice así", () => {
  const v = veredicto("version-distinta");
  assert.deepEqual(tipos(v.rojos), ["sin-tramo-de-dev"]);
  assert.match(v.rojos[0].mensaje, /en otra versión/);
  assert.match(v.rojos[0].mensaje, /dev verificaría con un código distinto/);
});

test("el vocabulario de vías es CERRADO: un nombre inventado es rojo por vía no declarada", () => {
  const v = veredicto("via-desconocida");
  assert.deepEqual(tipos(v.rojos), ["via-no-declarada"]);
  assert.match(v.rojos[0].mensaje, /urgencia-del-viernes/);
  assert.match(v.rojos[0].mensaje, /change de OpenSpec en el marco/);
});

test("'ninguna' no se toma como palabra: si el grafo la desmiente, es rojo", () => {
  const v = veredicto("ninguna-contradicha");
  assert.deepEqual(tipos(v.rojos), ["ninguna-contradicha"]);
  assert.match(v.rojos[0].mensaje, /no depende \(ni transitivamente\)/);
});

test("mecánica copiada que el marco ya publica: AVISO nombrando la pieza, y VERDE", () => {
  // El registro se inyecta: en el marco nace vacío porque todavía no hay
  // ninguna compuerta de entrega publicada que nombrar.
  const mecanicas = [
    {
      pieza: "compuerta-de-ejemplo",
      descripcion: "la compuerta completa, con su espera y su lectura de resultado",
      firma: /herramienta-de-ejemplo\s+lanzar-tarea/,
    },
  ];
  const v = veredicto("mecanica-copiada", { mecanicas });
  assert.deepEqual(v.rojos, [], "el aviso NUNCA es rojo: pondría rojo a un repo que no modificó una línea");
  assert.deepEqual(tipos(v.avisos), ["mecanica-copiada"]);
  assert.match(v.avisos[0].mensaje, /compuerta-de-ejemplo/);
  assert.match(v.avisos[0].mensaje, /NO falla el pipeline a propósito/);
});

test("el que YA adoptó la pieza no recibe el aviso de mecánica copiada", () => {
  const mecanicas = [{ pieza: "compuerta-de-ejemplo", descripcion: "la compuerta completa", firma: /uses:/ }];
  const v = veredicto("pieza-en-dev-y-en-prod", { mecanicas });
  // Los dos jobs que usan la pieza quedan fuera del aviso; el que no la usa
  // (smoke-dev) no matchea la firma y tampoco avisa.
  assert.deepEqual(v.avisos, [], "avisarle al que ya adoptó es el aviso que sale siempre y deja de leerse");
});

test("el registro real del marco nace VACIO, y eso es una decisión y no un olvido", () => {
  assert.deepEqual(MECANICAS_COPIADAS, [], "una entrada acá nombra una pieza publicada; hoy no hay ninguna compuerta de entrega en el marco");
});

test("un archivo que no se puede leer con confianza es ROJO, nunca verde mudo", () => {
  const v = veredicto("jobs-en-flujo");
  assert.deepEqual(tipos(v.rojos), ["ilegible"]);
  assert.match(v.rojos[0].mensaje, /estilo flujo/);
  assert.match(v.rojos[0].mensaje, /el invariante no se da por cumplido/);
});

test("un tab en la indentación es ROJO y no una lectura optimista", () => {
  const texto = ["jobs:", "  deploy-prod:", "\tenvironment: production"].join("\n");
  const leido = leerWorkflow(texto, { archivo: "con-tab.yml" });
  assert.equal(leido.problemas.length, 1);
  assert.match(evaluar({ ...leido, archivo: "con-tab.yml" }).rojos[0].mensaje, /tab/);
});

test("un archivo sin 'jobs:' no es una promoción y no produce hallazgos", () => {
  const leido = leerWorkflow("name: solo metadatos\non: push\n", { archivo: "x.yml" });
  assert.equal(leido.esWorkflow, false);
  assert.deepEqual(leido.jobs, []);
});

// ---------------------------------------------------------------------------
// EL DOGFOODING QUE SI SE PUEDE HACER
// ---------------------------------------------------------------------------

test("las definiciones del propio Projects pasan el invariante (verde vacuo: no tiene tramo de producción)", () => {
  const archivos = definiciones(RAIZ_REPO, ".github/workflows");
  assert.ok(archivos.length > 0, "si esto queda en cero, el descubrimiento de definiciones se rompió y el verde no vale nada");
  let piezasEnProd = 0;
  for (const relativa of archivos) {
    const texto = readFileSync(join(RAIZ_REPO, relativa), "utf8");
    const leido = leerWorkflow(texto, { archivo: relativa });
    const v = evaluar({ ...leido, archivo: relativa });
    assert.deepEqual(v.rojos, [], `${relativa} salió rojo:\n${unido(v.rojos)}`);
    piezasEnProd += v.piezasProd.length;
  }
  assert.equal(piezasEnProd, 0, "Projects no declara ningún job con environment: su verde es vacuo, y por eso los fixtures no son opcionales");
});

// ---------------------------------------------------------------------------
// PIEZAS DE APOYO
// ---------------------------------------------------------------------------

test("piezaDelMarco: reconoce la forma estable y descarta lo que no es del marco", () => {
  assert.deepEqual(piezaDelMarco(`${MARCO_POR_DEFECTO}/actions/compuerta@v1`), {
    nombre: "compuerta",
    version: "v1",
    id: "compuerta@v1",
  });
  assert.equal(piezaDelMarco("actions/checkout@v7"), null);
  assert.equal(piezaDelMarco("Otra-Org/projects/actions/compuerta@v1"), null);
  // Un `uses:` a nivel de job apuntando a un workflow reusable del marco NO es
  // una compuerta de entrega: contarlo haría que el propio verificador se
  // contara como pieza de producción de todo consumidor.
  assert.equal(piezaDelMarco(`${MARCO_POR_DEFECTO}/.github/workflows/marco-ci.yml@v1`), null);
  // El pin a SHA del debut tiene que leerse igual que el tag móvil, o el check
  // declararía sin gemelo justo la corrida que prueba el cableado.
  assert.equal(piezaDelMarco(`${MARCO_POR_DEFECTO}/actions/compuerta@abc1234`).version, "abc1234");
});

test("dependenciasDe: el cierre es transitivo y tolera un ciclo sin colgarse", () => {
  const porId = new Map([
    ["a", { needs: [] }],
    ["b", { needs: ["a"] }],
    ["c", { needs: ["b"] }],
    ["x", { needs: ["y"] }],
    ["y", { needs: ["x"] }],
  ]);
  assert.deepEqual([...dependenciasDe("c", porId)].sort(), ["a", "b"]);
  assert.deepEqual([...dependenciasDe("x", porId)].sort(), ["x", "y"]);
});

test("indentacion: cuenta espacios y delata el tab", () => {
  assert.equal(indentacion("    clave:"), 4);
  assert.equal(indentacion("clave:"), 0);
  assert.equal(indentacion("\tclave:"), -1);
});

test("escapar: un mensaje con % o saltos no se mutila al salir como comando de workflow", () => {
  assert.equal(escapar("100% y\nsigue"), "100%25 y%0Asigue");
});

test("un comentario pegado ARRIBA del id del job también declara la vía", () => {
  const texto = [
    "jobs:",
    "  deploy-dev:",
    "    steps:",
    `      - uses: ${MARCO_POR_DEFECTO}/actions/compuerta@v1`,
    "  # projects:sin-tramo-de-dev via=dispatch-de-emergencia",
    "  deploy-prod:",
    "    needs: [deploy-dev]",
    "    environment: production",
    "    steps:",
    `      - uses: ${MARCO_POR_DEFECTO}/actions/compuerta@v1`,
  ].join("\n");
  const leido = leerWorkflow(texto, { archivo: "arriba.yml" });
  const v = evaluar({ ...leido, archivo: "arriba.yml" });
  assert.deepEqual(v.rojos, [], unido(v.rojos));
  assert.deepEqual(tipos(v.notas), ["via"]);
});

test("un `uses:` COMENTADO no cuenta como cableado, ni en dev ni en prod", () => {
  const texto = [
    "jobs:",
    "  deploy-dev:",
    "    steps:",
    `      # - uses: ${MARCO_POR_DEFECTO}/actions/compuerta@v1`,
    "  deploy-prod:",
    "    needs: [deploy-dev]",
    "    environment: production",
    "    # projects:sin-tramo-de-dev via=ninguna",
    "    steps:",
    `      - uses: ${MARCO_POR_DEFECTO}/actions/compuerta@v1`,
  ].join("\n");
  const leido = leerWorkflow(texto, { archivo: "comentado.yml" });
  const v = evaluar({ ...leido, archivo: "comentado.yml" });
  assert.deepEqual(tipos(v.rojos), ["sin-tramo-de-dev"], "comentar el paso es la forma más fácil de cablear algo sin cablearlo");
});

test("'environment' dentro de un `with:` no convierte un job en tramo de producción", () => {
  const texto = [
    "jobs:",
    "  deploy-dev:",
    "    steps:",
    `      - uses: ${MARCO_POR_DEFECTO}/actions/compuerta@v1`,
    "        with:",
    "          environment: dev",
  ].join("\n");
  const leido = leerWorkflow(texto, { archivo: "with.yml" });
  assert.equal(leido.jobs[0].esProduccion, false);
});

test("'ninguna' combinada con otra vía es rojo: o sobra una, o sobra la otra", () => {
  const texto = [
    "jobs:",
    "  deploy-dev:",
    "    steps:",
    `      - uses: ${MARCO_POR_DEFECTO}/actions/compuerta@v1`,
    "  deploy-prod:",
    "    needs: [deploy-dev]",
    "    environment: production",
    "    # projects:sin-tramo-de-dev via=ninguna",
    "    # projects:sin-tramo-de-dev via=dispatch-de-emergencia",
    "    steps:",
    `      - uses: ${MARCO_POR_DEFECTO}/actions/compuerta@v1`,
  ].join("\n");
  const leido = leerWorkflow(texto, { archivo: "mezcla.yml" });
  const v = evaluar({ ...leido, archivo: "mezcla.yml" });
  assert.ok(tipos(v.rojos).includes("ninguna-con-otras"), unido(v.rojos));
});

// ---------------------------------------------------------------------------
// El guardia de módulo principal: la única rama que este banco NO puede
// ejercitar importando el módulo, porque importar es justamente lo que el
// guardia tiene que distinguir de ejecutar.
//
// La segunda prueba es la que importa: invoca el mismo archivo por una ruta que
// NO es su ruta canónica (junction en Windows, symlink en POSIX), que es como
// llega argv[1] cuando el checkout, el runner o el propio desarrollador pasan
// por un enlace, un nombre corto de Windows (JSANTA~1) o una unidad mapeada.
// Node resuelve el enlace para `import.meta.url` pero NO para
// `process.argv[1]`, así que un guardia por comparación literal decide "no soy
// el principal" y el proceso termina en exit 0 sin verificar nada ni decir una
// palabra: el fail-open exacto que la constitución prohíbe.
// ---------------------------------------------------------------------------

/** Corre el script como proceso aparte, contra un repo de mentira con UNA sola
 *  definición, y devuelve todo lo observable. */
function spawnear(rutaDelScript) {
  const temporal = mkdtempSync(join(tmpdir(), "projects-dap-"));
  try {
    const wf = join(temporal, ".github", "workflows");
    mkdirSync(wf, { recursive: true });
    copyFileSync(join(FIXTURES, "sin-piezas-del-marco-en-prod.yml"), join(wf, "deploy.yml"));
    const r = spawnSync(process.execPath, [rutaDelScript], {
      encoding: "utf8",
      // GITHUB_STEP_SUMMARY vacío aísla la prueba del resumen real del runner.
      env: { ...process.env, DAP_RAIZ: temporal, GITHUB_STEP_SUMMARY: "" },
    });
    return { codigo: r.status, todo: `${r.stdout ?? ""}\n${r.stderr ?? ""}` };
  } finally {
    try {
      rmSync(temporal, { recursive: true, force: true, maxRetries: 5 });
    } catch {
      // Basura en el temporal del sistema, no un fallo de la prueba.
    }
  }
}

test("spawneado por su ruta canónica, el check corre y se hace oír", () => {
  const r = spawnear(join(SCRIPT_DIR, "dev-antes-que-prod.mjs"));
  assert.equal(r.codigo, 0);
  assert.match(r.todo, /::notice::verde vacuo/, "el control del banco: por la ruta canónica el script sí corre");
});

test("spawneado por una ruta NO canónica, el check TAMBIEN corre (el guardia no puede ser un exit 0 mudo)", () => {
  const temporal = mkdtempSync(join(tmpdir(), "projects-dap-guardia-"));
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
    const r = spawnear(join(enlace, "dev-antes-que-prod.mjs"));
    assert.match(
      r.todo,
      /::notice::verde vacuo/,
      "invocado por una ruta no canónica el script no dijo NADA: el guardia lo desactivó y el paso terminó en verde sin verificar"
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

test("sin definiciones de pipeline el check sale verde, pero LO DICE", () => {
  const temporal = mkdtempSync(join(tmpdir(), "projects-dap-vacio-"));
  try {
    const r = spawnSync(process.execPath, [join(SCRIPT_DIR, "dev-antes-que-prod.mjs")], {
      encoding: "utf8",
      env: { ...process.env, DAP_RAIZ: temporal, GITHUB_STEP_SUMMARY: "" },
    });
    assert.equal(r.status, 0);
    assert.match(`${r.stdout}`, /::notice::no hay definiciones de pipeline/);
  } finally {
    try {
      rmSync(temporal, { recursive: true, force: true, maxRetries: 5 });
    } catch {
      // Basura en el temporal del sistema, no un fallo de la prueba.
    }
  }
});

test("un rojo real termina en exit 1, no en un aviso que nadie mira", () => {
  const temporal = mkdtempSync(join(tmpdir(), "projects-dap-rojo-"));
  try {
    const wf = join(temporal, ".github", "workflows");
    mkdirSync(wf, { recursive: true });
    copyFileSync(join(FIXTURES, "pieza-solo-en-prod.yml"), join(wf, "deploy.yml"));
    const r = spawnSync(process.execPath, [join(SCRIPT_DIR, "dev-antes-que-prod.mjs")], {
      encoding: "utf8",
      env: { ...process.env, DAP_RAIZ: temporal, GITHUB_STEP_SUMMARY: "" },
    });
    assert.equal(r.status, 1, "un veredicto que no cambia el exit code no es una compuerta");
    assert.match(`${r.stdout}`, /::error::/);
  } finally {
    try {
      rmSync(temporal, { recursive: true, force: true, maxRetries: 5 });
    } catch {
      // Basura en el temporal del sistema, no un fallo de la prueba.
    }
  }
});
