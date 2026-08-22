// Las regresiones de la auditoría de cierre de v1 (corrida del 2026-08-20).
//
//   node --test actions/constitucion/pruebas/regresiones-auditoria.test.mjs
//
// POR QUÉ ESTÁN EN SU PROPIO ARCHIVO. `constitucion.test.mjs` fija el
// COMPORTAMIENTO que el design pidió; esto fija las propiedades que una auditoría
// midió **refutadas** contra el código que ya estaba escrito, y cada bloque nombra
// la refutación que lo motiva. Separarlas mantiene legible la diferencia entre «esto
// es lo que el mecanismo hace» y «esto es lo que se rompió y no puede volver a
// romperse». El CI las descubre por el mismo glob (`actions/**/pruebas/*.test.mjs`).
//
// Ninguna de estas pruebas pasa contra el código anterior: se corrieron en rojo
// primero, que es la única evidencia que vale.
//
// EL HILO COMÚN de cinco de las siete refutaciones es UNA causa estructural, no
// cinco bugs: la misma propiedad estaba verificada en DOS lugares —esta action y un
// paso inline del workflow reusable— y las dos verdades ya discrepaban en esquema
// (objetos contra nombres sueltos), en severidad (atraso con ventana contra error
// seco) y en formato de sello (64 hex del cuerpo contra 12 hex del canónico). En una
// doble contabilidad la declaración siempre pierde contra el check, así que el
// arreglo no fue conciliar las copias: fue dejar una, la que compara contra el
// RE-RENDER y no contra el sello que trae el propio artefacto. Las cuatro pruebas
// del grupo «las copias que ya no existen» son las que impiden que la segunda
// contabilidad vuelva.

import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import {
  artefactoDe,
  clasificarDesvios,
  leerCanonico,
  renderizar,
  revisarPiso,
  sustituir,
  validarManifiesto,
  verificar,
} from "../constitucion.mjs";
import { invocacionesDe, parsearYaml } from "../cableado.mjs";

const SCRIPT = join(import.meta.dirname, "..", "constitucion.mjs");
const CANONICO_REAL = join(import.meta.dirname, "..", "canonico");
const RAIZ_REPO = join(import.meta.dirname, "..", "..", "..");
const leerDelRepo = (ruta) => readFileSync(join(RAIZ_REPO, ruta), "utf8");

/** Los dos workflows que el marco DISTRIBUYE: el reusable que heredan todos los
 *  consumidores y el llamador que el scaffold copia. Si una segunda contabilidad
 *  vuelve, vuelve en uno de estos dos. */
const WORKFLOWS_DEL_MARCO = [".github/workflows/marco-ci.yml", "plantilla/.github/workflows/ci.yml"];

const VERSIONES_UNA_EN_VENTANA = [{ version: "1.3.0", publicada: "2026-08-19", exigible_desde: "2026-09-16" }];
const DENTRO_DE_LA_VENTANA = new Date("2026-09-01T00:00:00Z");
const PASADO_EL_PLAZO = new Date("2026-10-01T00:00:00Z");

const SECCION = `# Reglas de ejemplo

<!-- projects:regla id=regla-uno -->

- La primera regla, en {{PROYECTO}}.

<!-- projects:regla id=regla-dos -->

- La segunda regla.
`;

const VALORES = { PROYECTO: "people-ejemplo" };

/** El juego COMPLETO que el canónico real necesita. Valores inventados a propósito:
 *  en el marco no se escriben handles, cuentas ni dominios reales de ningún proyecto
 *  (frontera 🛑 de `AGENTS.md`). */
const VALORES_COMPLETOS = {
  ORG: "Ejemplo-Org",
  PROYECTO: "people-ejemplo",
  BUILDER_1: "@builder-uno",
  BUILDER_2: "@builder-dos",
  PO: "@po-del-area",
  PAQUETE_API: "api",
  CANAL_ALERTAS: "#alertas-prod",
  REGION: "us-east-1",
  CUENTA_DEV: "111111111111",
  CUENTA_PROD: "222222222222",
  PERFIL_DEV: "perfil-dev",
  PERFIL_PROD: "perfil-prod",
  DOMINIO_DEV: "ejemplo-dev.ejemplo.com",
  DOMINIO_PROD: "ejemplo.ejemplo.com",
  PREFIJO_RECURSOS: "ejemplo",
};
const CADENA_SANA = {
  "CLAUDE.md": "# CLAUDE.md\n\n@AGENTS.md\n",
  "AGENTS.md": "# AGENTS.md\n\n@.projects/AGENTS-marco.md\n",
};
const DESVIO = {
  regla: "regla-dos",
  motivo: "este proyecto no tiene la herramienta que la regla presupone",
  aprobado_por: "@quien-la-aprobo",
  fecha: "2026-08-20",
};

const temporales = [];
function temporal(prefijo) {
  const dir = mkdtempSync(join(tmpdir(), prefijo));
  temporales.push(dir);
  return dir;
}
test.after(() => {
  for (const dir of temporales) rmSync(dir, { recursive: true, force: true });
});

function canonicoTemporal({ versiones = VERSIONES_UNA_EN_VENTANA, piso } = {}) {
  const dir = temporal("projects-canonico-reg-");
  const manifiesto = { presupuesto_lineas: 500, versiones };
  if (piso !== undefined) manifiesto.piso_permisos = piso;
  writeFileSync(join(dir, "manifiesto.json"), JSON.stringify(manifiesto), "utf8");
  writeFileSync(join(dir, "10-reglas.md"), SECCION, "utf8");
  return leerCanonico(dir);
}

function repoTemporal({ valores = VALORES, desvios = null, archivos = CADENA_SANA } = {}) {
  const raiz = temporal("projects-repo-reg-");
  if (valores !== null) writeFileSync(join(raiz, ".projects-valores.json"), JSON.stringify(valores), "utf8");
  if (desvios) writeFileSync(join(raiz, ".projects-desvios.json"), JSON.stringify({ desvios }), "utf8");
  for (const [ruta, contenido] of Object.entries(archivos)) {
    const completa = join(raiz, ruta);
    mkdirSync(dirname(completa), { recursive: true });
    writeFileSync(completa, contenido, "utf8");
  }
  return raiz;
}

const lector = (archivos) => (ruta) =>
  Object.prototype.hasOwnProperty.call(archivos, ruta) ? archivos[ruta] : null;
const codigos = (resultado) => resultado.hallazgos.map((h) => h.codigo);

// ---------------------------------------------------------------------------
// A04 · «Un placeholder sin valor es rojo: el artefacto nunca sale con dobles
//        llaves sin resolver»
//
// REFUTADA con exit 0 y 27 líneas de marcadores en el artefacto emitido, el título
// incluido. `sustituir()` contaba como faltante `undefined`, `null` y la cadena
// vacía, así que un valor cuyo TEXTO es el propio marcador —lo que
// `plantilla/.projects-valores.json` entrega tal cual, en 15 entradas— pasaba por
// valor bueno. El rojo llegaba igual, pero de OTRO check («Sin marcadores del
// scaffold sin resolver»): la propiedad estaba cubierta por casualidad de vecindad
// y no por el guardrail que la declara.
// ---------------------------------------------------------------------------

test("un valor cuyo TEXTO es el marcador cuenta como faltante, no como valor", () => {
  const { texto, faltantes } = sustituir("hola {{PROYECTO}}", { PROYECTO: "{{PROYECTO}}" });
  assert.deepEqual(faltantes, ["PROYECTO"]);
  assert.equal(texto, "hola {{PROYECTO}}");
});

test("un valor que ARRASTRA un marcador tambien falta: el artefacto no sale a medias", () => {
  const { faltantes } = sustituir("{{ORG}}", { ORG: "org-{{ORG}}-sufijo" });
  assert.deepEqual(faltantes, ["ORG"]);
});

test("el .projects-valores.json del scaffold TAL CUAL no rinde artefacto: rojo, no exit 0", () => {
  const delScaffold = JSON.parse(leerDelRepo("plantilla/.projects-valores.json"));
  const conMarcadores = Object.entries(delScaffold).filter(([, v]) => typeof v === "string" && /\{\{/.test(v));
  assert.ok(conMarcadores.length > 0, "la plantilla ya no trae marcadores: esta prueba dejaria de medir lo que dice");

  const raiz = repoTemporal({ valores: delScaffold });
  const corrida = spawnSync(process.execPath, [SCRIPT], {
    encoding: "utf8",
    env: { ...process.env, CONSTITUCION_MODO: "escribir", CONSTITUCION_RAIZ: raiz, GITHUB_OUTPUT: "", GITHUB_STEP_SUMMARY: "" },
  });
  assert.equal(corrida.status, 1, corrida.stdout + corrida.stderr);
  assert.match(corrida.stdout, /no tiene valor para/);
  assert.equal(existsSync(join(raiz, ".projects/AGENTS-marco.md")), false, "escribio un artefacto con dobles llaves");
});

test("el render reporta los marcadores que quedaron, no solo los valores que faltaron", () => {
  // Cinturón sobre la contabilidad: aunque alguien vuelva a aflojar la guarda de
  // `sustituir()`, el cuerpo renderizado se mira una vez más antes de sellarse.
  const canonico = canonicoTemporal();
  const render = renderizar({ canonico, valores: {}, desvios: [] });
  assert.ok(render.faltantes.includes("PROYECTO"));
  assert.deepEqual(render.marcadoresSinResolver, ["PROYECTO"]);
});

// ---------------------------------------------------------------------------
// A03 · «Un desvío que nombra una regla que ya no existe en el canónico da rojo,
//        con el motivo que tenía escrito»
//
// REFUTADA con resultado partido: se sostenía en la action (exit 1 con el motivo) y
// se caía en el carril que corre en el CI de todos los consumidores, donde el
// mensaje entraba en `avisos` y no en `hallazgos`, así que salía exit 0 en
// cualquier fecha. El camino rojo existía y era inalcanzable, y además dependía de
// un sello que la action no emite (ver A02).
//
// Al dejar la action como única verdad, el camino rojo pasa a ser el único. Lo que
// faltaba para poder cablearla sin un falso rojo es esto: un `.projects-desvios.json`
// real declara DOS clases de desvío —la que anula una regla del canónico y la que
// anula una entrada del allowlist del agente— y la action solo conocía la primera,
// así que un desvío de PERMISO perfectamente formado salía `desvio-sin-regla`.
// ---------------------------------------------------------------------------

test("un desvio de PERMISO bien formado no es un desvio de regla huerfano", () => {
  const canonico = canonicoTemporal();
  const clasificados = clasificarDesvios(
    [{ permiso: "Bash(terraform apply *)", motivo: "el runbook de rollback lo necesita", aprobado_por: "@quien", fecha: "2026-08-20" }],
    canonico.ids,
  );
  assert.deepEqual(
    clasificados.problemas.filter((p) => p.nivel === "error"),
    [],
  );
  assert.equal(clasificados.permisos.length, 1);
  assert.equal(clasificados.validos.length, 0, "un desvio de permiso no se imprime pegado a ninguna regla");
});

test("un desvio de permiso sin motivo es rojo POR EL MOTIVO, no por no nombrar una regla", () => {
  const canonico = canonicoTemporal();
  const clasificados = clasificarDesvios([{ permiso: "Bash(gh api -X POST *)", aprobado_por: "@quien", fecha: "2026-08-20" }], canonico.ids);
  assert.deepEqual(
    clasificados.problemas.map((p) => p.codigo),
    ["desvio-sin-motivo"],
  );
});

test("un desvio que nombra regla Y permiso a la vez es rojo: el motivo deja de decir de que es", () => {
  const canonico = canonicoTemporal();
  const clasificados = clasificarDesvios(
    [{ regla: "regla-uno", permiso: "Bash(pnpm publish)", motivo: "las dos cosas", aprobado_por: "@quien", fecha: "2026-08-20" }],
    canonico.ids,
  );
  assert.deepEqual(
    clasificados.problemas.map((p) => p.codigo),
    ["desvio-ambiguo"],
  );
});

test("un desvio de permiso conviviendo con uno de regla: el artefacto sale al dia", () => {
  const canonico = canonicoTemporal();
  const desvios = [
    { ...DESVIO },
    { permiso: "Bash(terraform apply *)", motivo: "el runbook de rollback lo necesita", aprobado_por: "@quien", fecha: "2026-08-20" },
  ];
  const render = renderizar({ canonico, valores: VALORES, desvios: [DESVIO] });
  const archivos = {
    ...CADENA_SANA,
    ".projects/AGENTS-marco.md": artefactoDe({
      superficie: "claude-code",
      cuerpo: render.cuerpo,
      version: canonico.version,
      sha: canonico.sha,
    }),
  };
  const resultado = verificar({
    canonico,
    valores: VALORES,
    desvios,
    superficies: ["claude-code"],
    hoy: DENTRO_DE_LA_VENTANA,
    leer: lector(archivos),
  });
  assert.equal(resultado.estado, "al-dia", JSON.stringify(codigos(resultado)));
});

test("el desvio muerto sigue siendo rojo con su motivo, y ahora es el UNICO veredicto", () => {
  const canonico = canonicoTemporal();
  const clasificados = clasificarDesvios([{ ...DESVIO, regla: "regla-que-el-marco-borro" }], canonico.ids);
  const muerto = clasificados.problemas.find((p) => p.codigo === "desvio-muerto");
  assert.ok(muerto, JSON.stringify(clasificados.problemas));
  assert.equal(muerto.nivel, "error");
  assert.match(muerto.mensaje, /El motivo que tenia escrito era: "este proyecto no tiene la herramienta/);
});

// ---------------------------------------------------------------------------
// A01 · «El paso nunca sale verde mudo: un consumidor SIN el artefacto sale
//        amarillo hasta su fecha exigible y rojo después»
//
// REFUTADA con exit 0, cero `::error::` y cero `::warning::` sobre un repo sin
// `.projects/` y sin ningún artefacto, y también con la versión ya exigible. La causa
// era del paso inline (`superficies.length === 0` era lo único que disparaba el
// atraso por ausencia, y con dos nombres sueltos la longitud era 2), así que el
// arreglo lo mata y deja a la action, que sí tiene la ventana.
//
// Pero la action tenía su propio borde duro en la dirección contraria: sin
// `.projects-valores.json` abortaba con exit 1 ANTES de ramificar por modo, o sea que
// el repo que todavía no adoptó recibía un rojo seco el primer día, sin la ventana
// de gracia que el resto del mecanismo respeta. Las dos mitades de la propiedad son
// «nunca verde mudo» y «nunca rojo sin ventana», y hasta ahora ninguna de las dos
// piezas exhibía las dos.
// ---------------------------------------------------------------------------

test("sin el archivo de valores, modo verificar es ROJO y dice como ADOPTAR", () => {
  // ESTA PRUEBA CAMBIO DE SIGNO EL 2026-08-22, y el motivo importa. Antes fijaba
  // «un repo que todavia no adopto no arranca en rojo»: entraba por la ventana de
  // gracia. Con la ventana retirada (change ventana-vencida) el rojo llega el primer
  // dia, y entonces lo que hay que fijar es OTRA cosa —que el rojo sea accionable—,
  // porque un rojo con un arreglo que no funciona es peor que un aviso.
  //
  // El caso concreto: el arreglo generico manda a correr el modo escribir, y para
  // este caso NO PUEDE funcionar (sin valores no hay con que renderizar). Mandaria al
  // consumidor a un segundo error, a un paso de distancia del primero.
  const raiz = repoTemporal({ valores: null, archivos: {} });
  const corrida = spawnSync(process.execPath, [SCRIPT], {
    encoding: "utf8",
    env: { ...process.env, CONSTITUCION_RAIZ: raiz, GITHUB_OUTPUT: "", GITHUB_STEP_SUMMARY: "" },
  });
  assert.notEqual(corrida.status, 0, "un repo que consume el marco sin declarar sus valores es rojo");
  const linea = corrida.stdout.split("\n").find((l) => /^::error::.*\.projects-valores\.json/.test(l));
  assert.ok(linea, corrida.stdout + corrida.stderr);
  assert.match(linea, /crear \.projects-valores\.json/, "el rojo tiene que decir que hay que CREAR el archivo");
  assert.match(linea, /projects init/, "y nombrar la herramienta que lo hace solo en un repo nuevo");
  assert.match(
    linea,
    /ANTES no sirve/,
    "y advertir explicitamente que correr el escritor primero no sirve: es el error al que el arreglo generico mandaba",
  );
});

test("sin el archivo de valores, pasado el plazo es rojo y no se calla", () => {
  const canonico = canonicoTemporal();
  const resultado = verificar({
    canonico,
    valores: {},
    valoresPresentes: false,
    desvios: [],
    superficies: ["claude-code"],
    hoy: PASADO_EL_PLAZO,
    leer: lector({}),
  });
  // El `piso-no-medible` va en la lista a propósito: el allowlist no depende del
  // archivo de valores, así que la rama del repo sin adoptar tampoco puede dejar de
  // decir que esa medición no se hizo.
  assert.deepEqual(codigos(resultado), ["piso-no-medible", "valores-faltantes"]);
  assert.equal(resultado.estado, "rojo");
});

test("sin el archivo de valores, dentro de la ventana avisa y NUNCA sale mudo", () => {
  const canonico = canonicoTemporal();
  const resultado = verificar({
    canonico,
    valores: {},
    valoresPresentes: false,
    desvios: [],
    superficies: ["claude-code"],
    hoy: DENTRO_DE_LA_VENTANA,
    leer: lector({}),
  });
  assert.deepEqual(codigos(resultado), ["piso-no-medible", "valores-faltantes"]);
  assert.equal(resultado.estado, "aviso");
});

test("sin el archivo de valores, el modo escribir sigue siendo rojo: no hay con que renderizar", () => {
  const raiz = repoTemporal({ valores: null, archivos: {} });
  const corrida = spawnSync(process.execPath, [SCRIPT], {
    encoding: "utf8",
    env: { ...process.env, CONSTITUCION_MODO: "escribir", CONSTITUCION_RAIZ: raiz, GITHUB_OUTPUT: "", GITHUB_STEP_SUMMARY: "" },
  });
  assert.equal(corrida.status, 1, corrida.stdout + corrida.stderr);
  assert.match(corrida.stdout, /::error::falta \.projects-valores\.json/);
});

// ---------------------------------------------------------------------------
// A09 · «El piso de permisos no queda escrito dos veces: el paso que revisa el
//        allowlist consume la salida `piso_permisos` que publica el canónico»
//
// REFUTADA con cero derivación: el paso era un `const PISO = [...]` literal y
// `grep -rn 'piso_permisos' .github/` no daba una coincidencia. Las dos
// contabilidades ya habían divergido en las DOS direcciones —el canónico declaraba
// `Bash(pnpm build)` que el paso no miraba, y el paso exigía `openspec` que el
// canónico no declaraba— y mutar el canónico a un piso inventado no movía el
// veredicto del paso ni un milímetro: seguía midiendo su propio arreglo.
// ---------------------------------------------------------------------------

test("el piso del manifiesto se mide contra el allowlist, no contra una copia", () => {
  const canonico = leerCanonico(CANONICO_REAL);
  assert.ok(canonico.piso_permisos.length > 0);
  const cubiertos = canonico.piso_permisos.map((item) => item.entrada);
  assert.deepEqual(revisarPiso(canonico.piso_permisos, cubiertos), []);

  const sinLasPruebas = canonico.piso_permisos.filter((item) => item.cubre !== "test").map((item) => item.entrada);
  assert.deepEqual(
    revisarPiso(canonico.piso_permisos, sinLasPruebas).map((item) => item.cubre),
    ["test"],
  );
});

test("el piso se deriva DE VERDAD: mutar el canonico mueve el veredicto", () => {
  // El control que la auditoría corrió contra el paso viejo y que el paso viejo no
  // pasaba: con el piso mutado y satisfecho al 100%, el veredicto tiene que ser
  // «nada sin cubrir».
  const piso = [{ nombre: "un comando inventado", entrada: "Bash(echo piso-mutado)", cubre: "piso-mutado" }];
  const canonico = canonicoTemporal({ piso });
  assert.deepEqual(revisarPiso(canonico.piso_permisos, ["Bash(echo piso-mutado)"]), []);
  assert.deepEqual(
    revisarPiso(canonico.piso_permisos, ["Bash(pnpm lint)", "Bash(pnpm test)"]).map((item) => item.cubre),
    ["piso-mutado"],
  );
});

test("el piso reconoce la forma que el propio scaffold reparte", () => {
  const canonico = leerCanonico(CANONICO_REAL);
  const allowlist = JSON.parse(leerDelRepo("plantilla/.claude/settings.json")).permissions.allow;
  assert.deepEqual(
    revisarPiso(canonico.piso_permisos, allowlist).map((item) => item.cubre),
    [],
    "el allowlist que el marco reparte no satisface el piso que el marco declara",
  );
});

test("el piso no puede divergir de si mismo: `cubre` tiene que estar dentro de `entrada`", () => {
  const problemas = validarManifiesto({
    versiones: VERSIONES_UNA_EN_VENTANA,
    piso_permisos: [{ nombre: "el linter", entrada: "Bash(pnpm lint)", cubre: "typecheck" }],
  });
  assert.equal(
    problemas.some((p) => /cubre/.test(p)),
    true,
    problemas.join(" · "),
  );
});

test("un piso sin nombre, sin entrada o sin `cubre` es un manifiesto invalido", () => {
  const rotos = [
    { entrada: "Bash(pnpm lint)", cubre: "lint" },
    { nombre: "el linter", cubre: "lint" },
    { nombre: "el linter", entrada: "Bash(pnpm lint)" },
    "Bash(pnpm lint)",
  ];
  for (const roto of rotos) {
    const problemas = validarManifiesto({ versiones: VERSIONES_UNA_EN_VENTANA, piso_permisos: [roto] });
    assert.ok(problemas.length > 0, `${JSON.stringify(roto)} paso como piso valido`);
  }
});

test("el allowlist ausente no se declara sano: el piso lo dice en vez de callarse", () => {
  const raiz = repoTemporal({});
  const corrida = spawnSync(process.execPath, [SCRIPT], {
    encoding: "utf8",
    env: {
      ...process.env,
      CONSTITUCION_RAIZ: raiz,
      CONSTITUCION_SALIDA_CORREGIDA: join(temporal("projects-corregido-reg-"), "salida"),
      GITHUB_OUTPUT: "",
      GITHUB_STEP_SUMMARY: "",
    },
  });
  assert.match(corrida.stdout, /::notice::[^\n]*\.claude\/settings\.json/);
});

test("el piso medido sale como AVISO y jamas como rojo", () => {
  // Con el juego COMPLETO de valores a propósito: la propiedad que se mide es que un
  // piso incompleto no ensucia el veredicto, y con valores a medias el rojo vendría
  // de los placeholders y la prueba diría otra cosa.
  const raiz = repoTemporal({ valores: VALORES_COMPLETOS });
  writeFileSync(join(raiz, ".claude-vacio.json"), JSON.stringify({ permissions: { allow: [] } }), "utf8");
  const corrida = spawnSync(process.execPath, [SCRIPT], {
    encoding: "utf8",
    env: {
      ...process.env,
      CONSTITUCION_MODO: "escribir",
      CONSTITUCION_RAIZ: raiz,
      CONSTITUCION_ALLOWLIST: ".claude-vacio.json",
      GITHUB_OUTPUT: "",
      GITHUB_STEP_SUMMARY: "",
    },
  });
  assert.equal(corrida.status, 0, "un piso incompleto puso rojo el render: la asimetria se rompio");

  const verificacion = spawnSync(process.execPath, [SCRIPT], {
    encoding: "utf8",
    env: {
      ...process.env,
      CONSTITUCION_RAIZ: raiz,
      CONSTITUCION_ALLOWLIST: ".claude-vacio.json",
      CONSTITUCION_SALIDA_CORREGIDA: join(temporal("projects-corregido-reg-"), "salida"),
      GITHUB_OUTPUT: "",
      GITHUB_STEP_SUMMARY: "",
    },
  });
  assert.equal(verificacion.status, 0, verificacion.stdout + verificacion.stderr);
  assert.match(verificacion.stdout, /::warning::el allowlist del agente no autoriza/);
});

// ---------------------------------------------------------------------------
// Las copias que ya no existen
//
// Estas cuatro no ejercitan una función: comprueban que la SEGUNDA contabilidad no
// volvió. Son las que hacen que el arreglo no se pueda deshacer sin que algo se
// ponga rojo, porque el modo de falla de las cinco refutaciones encadenadas no fue
// un bug de lógica sino dos verdades conviviendo.
// ---------------------------------------------------------------------------

test("el sello lo valida UNA sola pieza: ningun workflow del marco lo verifica por su cuenta", () => {
  // A02. El paso inline exigía `sha=<64 hex>` del cuerpo y la action emite 12 hex
  // del canónico. No era una diferencia de contenido sino de FORMATO: medido, sobre
  // un artefacto recién generado por la action el paso respondía «el sello no tiene
  // la forma que el marco emite. Arreglo: corre el escritor del marco», que es
  // literalmente lo que acababa de generarlo, y desde el 2026-09-16 eso mismo era
  // exit 1 para todo consumidor migrado.
  for (const ruta of WORKFLOWS_DEL_MARCO) {
    const texto = leerDelRepo(ruta);
    assert.equal(/sha=\(\[0-9a-f\]/.test(texto), false, `${ruta} valida el sello por su cuenta`);
    assert.equal(/projects:constitucion/.test(texto), false, `${ruta} lee la cabecera del artefacto por su cuenta`);
  }
});

test("el calendario del canonico esta escrito UNA sola vez, en el manifiesto", () => {
  // A08. Había DOS calendarios y solo uno estaba guardado: en el manifiesto la
  // garantía de los 28 días se sostiene (bajarla a 5 da exit 1), y el calendario
  // embebido en el workflow no tenía verificación ninguna — una entrada con CERO
  // días de gracia y `urgente: false` se aceptaba sin una queja y salía roja el
  // mismo día. Al morir el paso inline queda el calendario que SÍ se verifica.
  for (const ruta of WORKFLOWS_DEL_MARCO) {
    const texto = leerDelRepo(ruta);
    assert.equal(/exigible_desde/.test(texto), false, `${ruta} lleva su propia copia del calendario`);
    assert.equal(/CALENDARIO/.test(texto), false, `${ruta} lleva su propia copia del calendario`);
  }
  // El piso de 28 dias se retiro el 2026-08-22 (change ventana-vencida): una
  // entrada con CERO dias de gracia ya NO es un problema, es el default. Lo que
  // esta prueba sigue custodiando es lo suyo —que ningun workflow lleve su propia
  // copia del calendario— y para eso hace falta que el calendario que SI se
  // verifica siga siendo el del manifiesto.
  const sinVentana = validarManifiesto({ versiones: [{ version: "1.3.0", publicada: "2026-08-20", exigible_desde: "2026-08-20" }] });
  assert.deepEqual(sinVentana, [], sinVentana.join(" · "));
});

test("el piso de permisos esta escrito UNA sola vez: ningun workflow lleva su copia", () => {
  for (const ruta of WORKFLOWS_DEL_MARCO) {
    const texto = leerDelRepo(ruta);
    assert.equal(/const PISO/.test(texto), false, `${ruta} escribe su propio piso de permisos`);
    assert.equal(/piso recomendado sin cubrir/.test(texto), false, `${ruta} mide su propia copia del piso`);
  }
});

test("el scaffold cablea la verificacion de la constitucion, con las cinco condiciones", () => {
  // LA MITAD VERDADERA DE A01. La refutación más cara de la tanda no fue un bug: la
  // action no se invocaba en NINGÚN carril de verificación del consumidor. Su única
  // invocación era el workflow de actualización, en modo escribir, cuyo encabezado
  // declara «este workflow no verifica: solo propone el arreglo». Circularidad
  // completa: marco-ci delegaba en la action, la action delegaba en marco-ci.
  //
  // Y acá NO se greguea el texto del workflow: se lo PARSEA con el mismo lector que
  // usa el check, así que lo que se afirma es la propiedad y no la presencia de una
  // subcadena. La versión anterior de esta prueba hacía tres `assert.match` sobre el
  // archivo entero, y por eso no distinguía «el needs nombra a constitucion» de «la
  // palabra constitucion aparece en algún needs de algún job».
  const invocaciones = invocacionesDe(
    [
      {
        ruta: ".github/workflows/ci.yml",
        // El scaffold vive rastreado en ESTE repo y va a vivir rastreado en el
        // consumidor: el `rastreado` se declara porque desde la ronda 3 el que no lo
        // declara no cuenta (un `zz.yml` sin `git add` compraba el cableado).
        rastreado: true,
        texto: leerDelRepo("plantilla/.github/workflows/ci.yml"),
      },
    ],
    "main",
  );
  const validas = invocaciones.filter((i) => i.cuenta);
  assert.equal(validas.length, 1, JSON.stringify(invocaciones, null, 1));
  assert.equal(validas[0].modo, "verificar");
  assert.equal(validas[0].job, "constitucion");
});

// ---------------------------------------------------------------------------
// A01, LA MITAD FALSA · «y marco-ci comprueba estáticamente ESE cableado»
//
// REFUTADA. El check era un `grep -rE 'uses:.*actions/constitucion'` sobre
// `.github/workflows`, y se midieron CINCO configuraciones donde nada verifica nada y
// el paso sale exit 0 —cuatro de ellas MUDAS, cero anotaciones—: el consumidor con el
// ci.yml viejo más el `actualizar-marco.yml` del propio marco (modo ESCRIBIR); un job
// con `if: false`; la única invocación en un `on: workflow_dispatch`; el archivo en un
// subdirectorio de `.github/workflows`, que GitHub Actions no ejecuta; y la perilla,
// un `plantilla/.github/workflows/ci.yml` vacío y SIN RASTREAR.
//
// Los cinco casos, cada uno con su fixture y medido por código de salida, viven en
// `cableado.test.mjs`. Lo que se fija ACÁ es que el marco no vuelva a afirmar la
// propiedad con un grep: el reemplazo tiene que PARSEAR, y el paso del workflow tiene
// que ser una invocación de la pieza que parsea.
// ---------------------------------------------------------------------------

test("el cableado NO se comprueba con un grep: el carril del marco invoca al lector de YAML", () => {
  // Se lee la ESTRUCTURA y no el texto: desde la ronda 3 la comprobación es un JOB del
  // workflow reusable y no un paso de `higiene`, porque GitHub descarga las actions de
  // un job en «Set up job» —antes de mirar el `if` de cualquier paso— y con la action
  // ausente del tag móvil el paso mataba el job entero.
  const doc = parsearYaml(leerDelRepo(".github/workflows/marco-ci.yml"));
  const [clave, job] =
    Object.entries(doc.jobs).find(([, j]) =>
      (Array.isArray(j?.steps) ? j.steps : []).some((p) => /actions\/constitucion/.test(String(p?.uses ?? ""))),
    ) ?? [];
  assert.ok(clave, "el workflow reusable dejó de invocar actions/constitucion en ningún job");
  const paso = job.steps.find((p) => /actions\/constitucion/.test(String(p?.uses ?? "")));
  assert.equal(paso.with.modo, "cableado");
  assert.equal(JSON.stringify(job).includes("grep"), false, "el job volvió a decidir el cableado con un grep");

  // Y el salteo del carril del consumidor no puede ser mudo: el veredicto del reusable
  // tiene que mirar su resultado, o el fail-open es indistinguible de que no exista.
  assert.match(String(doc.jobs.marco_ok.needs.join(",")), new RegExp(clave));
  assert.match(JSON.stringify(doc.jobs.marco_ok.steps), new RegExp(`needs\\.${clave}\\.result`));

  // Y el lector existe con su banco al lado, que es la condición que el propio CI del
  // marco avisa cuando falta.
  assert.ok(existsSync(join(RAIZ_REPO, "actions/constitucion/cableado.mjs")));
  assert.ok(existsSync(join(RAIZ_REPO, "actions/constitucion/pruebas/cableado.test.mjs")));
});

// ---------------------------------------------------------------------------
// RESIDUO 1 · «el artefacto nunca sale con dobles llaves»
//
// REFUTADA de nuevo el 2026-08-20, por el borde que el arreglo anterior dejó: los
// marcadores se medían sobre el texto YA SUSTITUIDO y ANTES de insertar los desvíos,
// con el argumento de que el motivo de un desvío es prosa del proyecto. El argumento
// era cierto y la conclusión estaba al revés: un motivo que dice «{{PO}} lo aprobó
// para {{PROYECTO}}» viajaba al artefacto tal cual, en verde, y el rojo lo cobraba el
// check vecino del propio consumidor sobre un archivo que el marco escribió.
// ---------------------------------------------------------------------------

test("un desvio cuyo motivo lleva marcadores no sale al artefacto: rojo, y nombra el desvio", () => {
  const canonico = canonicoTemporal();
  const conMarcadores = { ...DESVIO, motivo: "{{PO}} lo aprobo para {{PROYECTO}} y no se toca" };
  const render = renderizar({ canonico, valores: VALORES, desvios: [conMarcadores] });

  // La propiedad, primero: el cuerpo que se va a sellar NO lleva dobles llaves — o si
  // las lleva, la medición las ve.
  assert.deepEqual(render.marcadoresSinResolver, ["PO", "PROYECTO"]);
  assert.deepEqual(
    render.marcadoresDeDesvios.map((d) => d.regla),
    ["regla-dos"],
  );

  const resultado = verificar({
    canonico,
    valores: VALORES,
    desvios: [conMarcadores],
    superficies: ["claude-code"],
    hoy: DENTRO_DE_LA_VENTANA,
    leer: lector(CADENA_SANA),
  });
  const propio = resultado.hallazgos.filter((h) => h.codigo === "desvio-con-marcadores");
  assert.equal(propio.length, 1, codigos(resultado).join(", "));
  assert.equal(propio[0].nivel, "error");
  assert.match(propio[0].mensaje, /\.projects-desvios\.json/);
  assert.ok(resultado.rojos > 0);
});

test("y el modo escribir NO emite ese artefacto: un rojo que igual deja el archivo no sirve", () => {
  const raiz = repoTemporal({
    valores: VALORES_COMPLETOS,
    desvios: [{ ...DESVIO, regla: "openspec-validar-tras-editar", motivo: "lo aprobo {{PO}}" }],
  });
  const corrida = spawnSync(process.execPath, [SCRIPT], {
    encoding: "utf8",
    env: {
      ...process.env,
      CONSTITUCION_MODO: "escribir",
      CONSTITUCION_RAIZ: raiz,
      GITHUB_OUTPUT: "",
      GITHUB_STEP_SUMMARY: "",
    },
  });
  assert.equal(corrida.status, 1, corrida.stdout);
  assert.match(corrida.stdout, /::error::/);
  assert.equal(existsSync(join(raiz, ".projects/AGENTS-marco.md")), false, "escribio el artefacto con marcadores adentro");
});

// ---------------------------------------------------------------------------
// RESIDUO 2 · el piso recomendado de permisos, medido contra un allowlist de relleno
//
// REFUTADA el 2026-08-20: `revisarPiso` concatenaba el allowlist entero en un texto y
// buscaba ahí la propiedad, así que un allowlist de PURO RELLENO —seis cadenas que no
// son entrada de permiso de nada— se declaraba 100% cubierto, exit 0 y cero avisos. La
// medición no decía «el agente puede correr el linter sin pedir permiso»: decía «en
// algún lugar del archivo aparece la palabra lint». Y no tenía prueba.
// ---------------------------------------------------------------------------

test("un allowlist de PURO RELLENO no se declara 100% cubierto por el piso", () => {
  const canonico = leerCanonico(CANONICO_REAL);
  const relleno = canonico.piso_permisos.map((item) => item.cubre);
  assert.ok(relleno.length >= 5, "el piso real quedo demasiado corto para que esta prueba mida algo");
  assert.deepEqual(
    revisarPiso(canonico.piso_permisos, relleno).map((item) => item.cubre),
    relleno,
    "seis cadenas que no autorizan ningun comando satisfacen el piso entero",
  );
});

test("una entrada de OTRA herramienta no cubre un item que recomienda Bash", () => {
  const piso = [{ nombre: "el linter", entrada: "Bash(pnpm lint)", cubre: "lint" }];
  assert.deepEqual(revisarPiso(piso, ["mcp__x__lint_project", "WebFetch(domain:lint.example)"]).length, 1);
  assert.deepEqual(revisarPiso(piso, ["Bash(pnpm --filter web lint)"]), []);
  // Y `Bash` a secas no declara comando: no se puede decir que cubra este item.
  assert.deepEqual(revisarPiso(piso, ["Bash"]).length, 1);
});

test("la propiedad se busca dentro de UNA entrada, no en la concatenacion del archivo", () => {
  const piso = [{ nombre: "el chequeo de formato", entrada: "Bash(pnpm format:check)", cubre: "format" }];
  // El borde de palabra ya estaba: `eslint` no pasa por `lint`. Lo nuevo es que la
  // palabra tenga que estar en la MISMA entrada que autoriza el comando.
  assert.deepEqual(revisarPiso(piso, ["Bash(pnpm eslint)"]).length, 1);
  assert.deepEqual(revisarPiso(piso, ["Bash(prettier --check .)", "format"]).length, 1);
  assert.deepEqual(revisarPiso(piso, ["Bash(pnpm format:check)"]), []);
});

// ---------------------------------------------------------------------------
// RESIDUO 3 · el recorte del comodín del allowlist
//
// Medido el 2026-08-20: el paso «Permisos del agente sin escritura» normaliza el
// separador FINAL de una entrada (`cmd sub:*` -> `cmd sub *`) porque el allowlist
// admite las dos formas y las dos significan «y lo que siga». Ese recorte no tenía
// ninguna prueba, y borrándolo el banco quedaba entero en verde mientras se creaba un
// FALSO ROJO: sin normalizar, `Bash(terraform validate:*)` deja el token
// `validate:*` en la posición del subcomando, así que el paso lo denuncia como «deja
// el subcomando en comodín» —o sea como si autorizara `terraform apply`— sobre una
// entrada que autoriza exactamente un subcomando de lectura. Es la entrada que el
// propio scaffold reparte.
//
// El programa de ese paso va inline en el YAML (un heredoc no puede cerrar dentro de
// un bloque indentado), así que la prueba lo EXTRAE del workflow y lo corre. Es la
// única forma de que el código que llega a todos los consumidores por `@v1` pase por
// un caso controlado.
// ---------------------------------------------------------------------------

/** Saca el programa inline del paso de permisos del `marco-ci.yml` y lo deja en un
 *  archivo ejecutable. Se lee del workflow y no de una copia: una copia sería la
 *  segunda contabilidad que este banco existe para impedir. */
function programaDePermisos() {
  const marco = leerDelRepo(".github/workflows/marco-ci.yml");
  const lineas = marco.split("\n");
  const inicio = lineas.findIndex((l) => l.includes("- name: Permisos del agente sin escritura"));
  assert.ok(inicio >= 0, "no se encontro el paso de permisos en marco-ci.yml");
  let i = inicio;
  while (i < lineas.length && !/^\s*node -e '$/.test(lineas[i])) i++;
  assert.ok(i < lineas.length, "el paso de permisos ya no lleva su programa inline: revisa esta prueba");
  const sangria = (lineas[i].match(/^ */) ?? [""])[0].length;
  const cuerpo = [];
  for (let k = i + 1; k < lineas.length; k++) {
    if (lineas[k].trim() === "'" && (lineas[k].match(/^ */) ?? [""])[0].length === sangria) break;
    cuerpo.push(lineas[k].slice(sangria + 2));
  }
  const dir = temporal("projects-permisos-");
  const ruta = join(dir, "permisos.cjs");
  writeFileSync(ruta, `${cuerpo.join("\n")}\n`, "utf8");
  return ruta;
}

function correrPermisos(allow) {
  const programa = programaDePermisos();
  const raiz = temporal("projects-allowlist-");
  mkdirSync(join(raiz, ".claude"), { recursive: true });
  writeFileSync(join(raiz, ".claude/settings.json"), JSON.stringify({ permissions: { allow } }), "utf8");
  writeFileSync(join(raiz, ".projects-valores.json"), JSON.stringify({ PERFIL_PROD: "la organización-prod" }), "utf8");
  return spawnSync(process.execPath, [programa], {
    cwd: raiz,
    encoding: "utf8",
    env: {
      ...process.env,
      RUTA_ALLOWLIST: ".claude/settings.json",
      RUTA_VALORES: ".projects-valores.json",
      RUTA_DESVIOS: ".projects-desvios.json",
    },
  });
}

test("el recorte del comodin: `sub:*` y `sub *` son la misma cosa, y ninguna es un comodin de subcomando", () => {
  // La entrada que el scaffold reparte, en sus dos formas. Las dos autorizan UN
  // subcomando de lectura, asi que ninguna es hallazgo.
  for (const entrada of ["Bash(terraform validate *)", "Bash(terraform validate:*)"]) {
    const corrida = correrPermisos([entrada]);
    assert.equal(corrida.status, 0, `${entrada} salio ${corrida.status}: ${corrida.stdout}`);
    assert.equal(/::error/.test(corrida.stdout), false, `${entrada}: ${corrida.stdout}`);
  }
});

/** Solo las ANOTACIONES de error: la línea de resumen del paso nombra la palabra
 *  «comodines» siempre, así que buscarla en todo el stdout no distingue un hallazgo de
 *  la explicación del propio check. */
const erroresDe = (corrida) => String(corrida.stdout).split("\n").filter((l) => l.startsWith("::error"));

test("el comodin en la posicion DEL SUBCOMANDO si es hallazgo, en las dos formas", () => {
  for (const entrada of ["Bash(terraform *)", "Bash(terraform:*)"]) {
    const corrida = correrPermisos([entrada]);
    assert.equal(corrida.status, 1, `${entrada} salio ${corrida.status}: ${corrida.stdout}`);
    const errores = erroresDe(corrida);
    assert.equal(errores.length, 1, `${entrada}: ${corrida.stdout}`);
    assert.match(errores[0], /comodin/, `${entrada}: ${errores[0]}`);
    // Y con el nombre de la herramienta, no como «cualquier comando de shell»: la
    // entrada SI acota la herramienta, y decir lo contrario es un diagnostico falso.
    assert.match(errores[0], /"terraform"/, `${entrada}: ${errores[0]}`);
  }
});

test("el recorte toca SOLO el separador final: los dos puntos de una ruta no se mueven", () => {
  // Si el recorte fuera global, un `:` de una URL o de una ruta quedaria convertido en
  // separador y el subcomando cambiaria de lugar.
  const corrida = correrPermisos(["Bash(gh api repos/Ejemplo-Org/Projects/actions:read)"]);
  assert.equal(corrida.status, 0, corrida.stdout);
  assert.deepEqual(erroresDe(corrida), [], corrida.stdout);
});

// ---------------------------------------------------------------------------
// A06 · «El guardrail de deltas tiene un hueco conocido: si el título de un
//        requirement del bloque MODIFIED no existe en el spec vivo, NO avisa»
//
// REFUTADA: avisa y sale 1, y el arreglo ya viaja por `@v1` a todos los
// consumidores. Medido de nuevo el 2026-08-20 sobre un fixture propio: el MODIFIED
// huérfano da exit 1 nombrando las dos salidas legítimas (moverlo a ADDED o
// declarar el retitulado en RENAMED), y el MODIFIED que pierde escenarios también
// da exit 1 por el contador `perdidas` del mismo script. O sea que las DOS mitades
// de la advertencia están cubiertas.
//
// Ese texto viaja en el artefacto que TODOS los consumidores cargan en CADA sesión
// y cuesta doble: manda a revisar a mano algo que el CI caza, y enseña que las
// advertencias del canónico pueden estar viejas —que es exactamente el crédito que
// este change existe para construir. Salida elegida: reescribir la afirmación, con
// el límite que SÍ quedó medido (A19) en el lugar que ocupaba el hueco inventado.
// ---------------------------------------------------------------------------

test("el canonico ya no manda a revisar a mano el hueco que el guardrail de deltas cierra", () => {
  const openspec = leerDelRepo("actions/constitucion/canonico/10-openspec.md");
  assert.equal(
    /hueco conocido/.test(openspec),
    false,
    "el canonico sigue anunciando un hueco que actions/guardrail-deltas cierra y que viaja por @v1 a todos los consumidores",
  );
  assert.match(openspec, /guardrail de deltas/, "al borrar el hueco se perdio la mencion del guardrail que si existe");
  assert.match(
    openspec,
    /archive/,
    "el limite que SI quedo medido es el del script de archive: cuenta operaciones DECLARADAS, no cambios efectivos",
  );
});
