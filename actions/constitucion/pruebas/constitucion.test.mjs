// Banco de pruebas de la porción del marco. Corre con `node --test`, el runner que
// trae Node 22: cero dependencias, igual que el resto del marco.
//
//   node --test actions/constitucion/pruebas/constitucion.test.mjs
//
// POR QUÉ ESTE BANCO ES OBLIGATORIO Y NO OPCIONAL. Projects **no puede comerse esta
// medicina**: su `AGENTS.md` es la constitución del marco, no la de un proyecto, así
// que no tiene ni debe tener el bloque de un consumidor. Sin dogfooding, lo único que
// ejercita este mecanismo antes de que llegue a los repos de otros son estos casos
// sintéticos, que sí corren en el CI de Projects (job `pruebas-actions`, que los descubre
// por el glob `actions/**/pruebas/*.test.mjs`).
//
// Los siete casos que el design nombra están todos acá, y el último grupo es el más
// importante: el canónico REAL, renderizado con un juego completo de valores. Un
// placeholder nuevo sin documentar, una regla con id duplicado, una ventana de gracia
// corta o un canónico que se pasa del presupuesto de líneas ponen rojo ese grupo.

import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import {
  SUPERFICIES,
  SUPERFICIES_POR_DEFECTO,
  artefactoDe,
  bloqueDesvio,
  cabecera,
  clasificarDesvios,
  compararSemver,
  despojarCodigo,
  idsDeReglas,
  importa,
  insertarDesvios,
  leerCabecera,
  leerCanonico,
  main,
  normalizar,
  renderizar,
  sustituir,
  validarManifiesto,
  verificar,
  versionPendienteMasVieja,
} from "../constitucion.mjs";

const SCRIPT = join(import.meta.dirname, "..", "constitucion.mjs");
const CANONICO_REAL = join(import.meta.dirname, "..", "canonico");

/** Valores INVENTADOS a propósito: en el marco no se escriben handles, cuentas ni
 *  dominios reales de ningún proyecto (frontera 🛑 de AGENTS.md). */
const VALORES = {
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

/** El canónico sintético solo usa `{{PROYECTO}}`: pasarle el juego completo dispararía
 *  —con razón— el aviso de valores que sobran. */
const VALORES_SINTETICOS = { PROYECTO: VALORES.PROYECTO };

const SECCION = `# Reglas de ejemplo

<!-- projects:regla id=regla-uno -->

- La primera regla, en {{PROYECTO}}. Tiene dos lineas para que el bloque no sea
  trivial.

<!-- projects:regla id=dev-no-contacta-usuarios -->

- **Contactar usuarios reales desde dev**: la instancia dev es separada.

<!-- projects:regla id=regla-tres -->

- La tercera regla.
`;

const temporales = [];
function temporal(prefijo) {
  const dir = mkdtempSync(join(tmpdir(), prefijo));
  temporales.push(dir);
  return dir;
}
test.after(() => {
  for (const dir of temporales) rmSync(dir, { recursive: true, force: true });
});

/** Un canónico sintético en disco: se pasa por `leerCanonico` para ejercitar el
 *  camino real (derivar secciones del árbol, sellar, validar el manifiesto). */
function canonicoTemporal({ versiones, seccion = SECCION, presupuesto = 500 }) {
  const dir = temporal("projects-canonico-");
  writeFileSync(
    join(dir, "manifiesto.json"),
    // El piso va en la forma que el manifiesto declara desde el 2026-08-20: cada
    // ítem con `nombre`, la `entrada` que el marco recomienda y la propiedad que
    // `cubre` en el allowlist. La forma vieja (cadenas sueltas) no decía QUÉ buscar,
    // y ese vacío es donde el piso declarado y el piso verificado se separaron.
    JSON.stringify({
      presupuesto_lineas: presupuesto,
      piso_permisos: [{ nombre: "las pruebas", entrada: "Bash(pnpm test)", cubre: "test" }],
      versiones,
    }),
    "utf8",
  );
  writeFileSync(join(dir, "10-reglas.md"), seccion, "utf8");
  return leerCanonico(dir);
}

const lector = (archivos) => (ruta) =>
  Object.prototype.hasOwnProperty.call(archivos, ruta) ? archivos[ruta] : null;

/** La cadena de carga completa de la superficie de Claude Code, sana. */
const CADENA_SANA = {
  "CLAUDE.md": "# CLAUDE.md\n\nLas reglas viven en AGENTS.md.\n\n@AGENTS.md\n",
  "AGENTS.md": "# AGENTS.md\n\nLo propio del proyecto.\n\n@.projects/AGENTS-marco.md\n",
};

const VERSIONES_UNA_EN_VENTANA = [
  { version: "1.3.0", publicada: "2026-08-19", exigible_desde: "2026-09-16" },
];
const VERSIONES_DOS = [
  { version: "1.3.0", publicada: "2026-06-01", exigible_desde: "2026-06-29" },
  { version: "1.4.0", publicada: "2026-08-19", exigible_desde: "2026-09-16" },
];
const DENTRO_DE_LA_VENTANA = new Date("2026-09-01T00:00:00Z");
const PASADO_EL_PLAZO = new Date("2026-10-01T00:00:00Z");

function correr({
  canonico,
  archivos,
  hoy,
  desvios = [],
  superficies = ["claude-code"],
  valores = VALORES_SINTETICOS,
  pins = [],
}) {
  return verificar({ canonico, valores, desvios, superficies, hoy, pins, leer: lector(archivos) });
}

function artefactoAlDia(canonico, { desvios = [], superficie = "claude-code", valores = VALORES_SINTETICOS } = {}) {
  const render = renderizar({ canonico, valores, desvios });
  return artefactoDe({ superficie, cuerpo: render.cuerpo, version: canonico.version, sha: canonico.sha });
}

const codigos = (resultado) => resultado.hallazgos.map((h) => h.codigo);
const de = (resultado, codigo) => resultado.hallazgos.filter((h) => h.codigo === codigo);

// ---------------------------------------------------------------------------
// Caso 1 — artefacto ausente: nunca verde mudo
// ---------------------------------------------------------------------------

test("artefacto ausente dentro de la ventana: aviso con la fecha en que pasa a fallar", () => {
  const canonico = canonicoTemporal({ versiones: VERSIONES_UNA_EN_VENTANA });
  const resultado = correr({ canonico, archivos: CADENA_SANA, hoy: DENTRO_DE_LA_VENTANA });

  const faltante = de(resultado, "artefacto-faltante");
  assert.equal(faltante.length, 1);
  assert.equal(faltante[0].nivel, "warning");
  assert.match(faltante[0].mensaje, /2026-09-16/);
  assert.equal(resultado.estado, "aviso");
});

test("artefacto ausente pasado el plazo: rojo, sin rama silenciosa de 'no aplica'", () => {
  const canonico = canonicoTemporal({ versiones: VERSIONES_UNA_EN_VENTANA });
  const resultado = correr({ canonico, archivos: CADENA_SANA, hoy: PASADO_EL_PLAZO });

  assert.equal(de(resultado, "artefacto-faltante")[0].nivel, "error");
  assert.equal(resultado.estado, "rojo");
  assert.equal(resultado.rojos, 1);
});

// ---------------------------------------------------------------------------
// Caso 2 — atrasado, y manda la versión pendiente MÁS VIEJA
// ---------------------------------------------------------------------------

test("atrasado por una version en ventana: aviso", () => {
  const canonico = canonicoTemporal({ versiones: VERSIONES_DOS });
  const viejo = artefactoAlDia(canonico).replace(
    cabecera({ version: "1.4.0", sha: canonico.sha, superficie: "claude-code" }),
    cabecera({ version: "1.3.0", sha: "viejo1234567", superficie: "claude-code" }),
  );
  const resultado = correr({
    canonico,
    archivos: { ...CADENA_SANA, ".projects/AGENTS-marco.md": viejo },
    hoy: DENTRO_DE_LA_VENTANA,
  });

  const atrasado = de(resultado, "artefacto-atrasado");
  assert.equal(atrasado.length, 1);
  assert.equal(atrasado[0].nivel, "warning");
  assert.match(atrasado[0].mensaje, /2026-09-16/);
  // Atrasado no se reporta ADEMAS como divergente: no se puede comparar el cuerpo
  // contra un canonico que esta copia del marco ya no tiene.
  assert.equal(de(resultado, "artefacto-divergente").length, 0);
});

// EL HUECO QUE ESTABA FIJADO ACA COMO HUECO, ahora cerrado. Esta prueba decia, con
// todas las letras, que subir a mano la version de la cabecera dejaba el cuerpo sin
// comparar y salia AVISO: se podia borrar cualquier regla del artefacto y el check
// quedaba verde. Reproducido por codigo de salida el 2026-08-19 y de nuevo el
// 2026-08-20 (cuerpo amputado + version 9.9.9 -> exit 0 con 2 avisos). Con la action
// convertida en el UNICO verificador del contenido, ese era el ultimo bypass, y el
// cierre no es una decision pendiente: es aritmetica del sello.
//
// El sello cubre `version + secciones`, asi que el sha de la 1.3.0 no puede ser el sha
// de ninguna otra version. Una cabecera que declara 9.9.9 y trae el sha que ESTA copia
// calcula para su 1.3.0 se contradice sola: no hay marco mas nuevo en el medio.
test("version adelantada a mano con el sello de esta copia: ROJO, no aviso", () => {
  const canonico = canonicoTemporal({ versiones: VERSIONES_UNA_EN_VENTANA });
  const alDia = artefactoAlDia(canonico);
  const manipulado = alDia
    .replace(cabecera({ version: "1.3.0", sha: canonico.sha, superficie: "claude-code" }), cabecera({ version: "9.9.9", sha: canonico.sha, superficie: "claude-code" }))
    .replace("La primera regla", "BORRE LA PRIMERA REGLA");
  assert.notEqual(manipulado, alDia, "la manipulacion no aplico: la prueba no probaria nada");

  const resultado = correr({
    canonico,
    archivos: { ...CADENA_SANA, ".projects/AGENTS-marco.md": manipulado },
    hoy: DENTRO_DE_LA_VENTANA,
  });

  const incoherente = de(resultado, "artefacto-sello-incoherente");
  assert.equal(incoherente.length, 1, JSON.stringify(resultado.hallazgos));
  assert.equal(incoherente[0].nivel, "error");
  // El mensaje tiene que explicar POR QUE es rojo y no ofrecer la explicacion
  // tranquila del pin: un revisor que lee "¿un pin a un SHA?" cierra la pestaña.
  assert.match(incoherente[0].mensaje, /a mano/);
  assert.match(incoherente[0].mensaje, /sha/);
  assert.ok(resultado.rojos > 0);
  assert.equal(resultado.estado, "rojo");
});

// LA CAUSA BENIGNA SIGUE SIENDO AVISO, que es la otra mitad de la propiedad. Pero la
// causa benigna NO es «hay un pin fijo»: es que el ESCRITOR corra una copia del marco
// distinta de la del VERIFICADOR, y eso pasa solo cuando las invocaciones del arbol
// estan pinadas a refs DISTINTAS. Este fixture llevaba un unico pin a SHA hasta la
// ronda 3, y ahi estaba el bypass que el refutador cobro con doce caracteres: con un
// solo pin —cualquiera, `@main`, `@v1.3.0` o un SHA— alcanzaba para bajar el rojo a
// aviso y borrar cualquier regla del artefacto.
test("artefacto mas nuevo con DOS refs distintas que lo explican: aviso, y dice que no comparo", () => {
  const canonico = canonicoTemporal({ versiones: VERSIONES_UNA_EN_VENTANA });
  const deOtroMarco = artefactoAlDia(canonico).replace(
    cabecera({ version: "1.3.0", sha: canonico.sha, superficie: "claude-code" }),
    cabecera({ version: "9.9.9", sha: "abcabcabcabc", superficie: "claude-code" }),
  );
  const resultado = correr({
    canonico,
    archivos: { ...CADENA_SANA, ".projects/AGENTS-marco.md": deOtroMarco },
    hoy: DENTRO_DE_LA_VENTANA,
    pins: [
      // el verificador, pinado viejo...
      {
        ruta: ".github/workflows/ci.yml",
        job: "constitucion",
        ref: "0123456789abcdef0123456789abcdef01234567",
        escribe: false,
      },
      // ...y el ESCRITOR, en el tag movil: por ahi entra un artefacto mas nuevo. Que
      // cual de los dos escribe sea un dato del pin es la correccion de la ronda 4: el
      // veredicto compara la ref del escritor contra las del verificador, y hasta hoy
      // comparaba todas las refs entre si — por eso un verificador viejo suelto, o un
      // senuelo que no corre, alcanzaba para comprar este aviso.
      { ruta: ".github/workflows/actualizar-marco.yml", job: "actualizar", ref: "v1", escribe: true },
    ],
  });
  const adelantado = de(resultado, "artefacto-adelantado");
  assert.equal(adelantado.length, 1, JSON.stringify(resultado.hallazgos));
  assert.equal(adelantado[0].nivel, "warning");
  assert.match(adelantado[0].mensaje, /ESCRIBE el artefacto con una ref que no usa para verificarlo/);
  assert.match(adelantado[0].mensaje, /actualizar-marco\.yml#actualizar -> v1/);
  assert.equal(de(resultado, "artefacto-sello-incoherente").length, 0);
});

// Y CON EL ESCRITOR EN LA MISMA REF QUE EL VERIFICADOR, ROJO, sea la que sea. Si el modo
// escribir corre el MISMO codigo que este verificador, no puede haber emitido una version
// mas nueva que la suya. La ortografia de la ref no entra en la cuenta, que es
// exactamente lo que la volvia evadible en la ronda 2.
test("artefacto mas nuevo con el escritor en la ref del verificador: ROJO, y da igual como se escriba", () => {
  for (const ref of ["v1", "main", "refs/heads/main", "v1.3.0", "0123456789abcdef0123456789abcdef01234567"]) {
    const canonico = canonicoTemporal({ versiones: VERSIONES_UNA_EN_VENTANA });
    const deOtroMarco = artefactoAlDia(canonico).replace(
      cabecera({ version: "1.3.0", sha: canonico.sha, superficie: "claude-code" }),
      cabecera({ version: "9.9.9", sha: "abcabcabcabc", superficie: "claude-code" }),
    );
    const resultado = correr({
      canonico,
      archivos: { ...CADENA_SANA, ".projects/AGENTS-marco.md": deOtroMarco },
      hoy: DENTRO_DE_LA_VENTANA,
      pins: [
        { ruta: ".github/workflows/ci.yml", job: "constitucion", ref, escribe: false },
        { ruta: ".github/workflows/actualizar-marco.yml", job: "actualizar", ref, escribe: true },
      ],
    });
    const adelantado = de(resultado, "artefacto-adelantado");
    assert.equal(adelantado.length, 1, `${ref}: ${JSON.stringify(resultado.hallazgos)}`);
    assert.equal(adelantado[0].nivel, "error", ref);
    assert.match(adelantado[0].mensaje, /ref que este repo tambien usa para VERIFICAR/);
    assert.equal(resultado.estado, "rojo", ref);
  }
});

// Y EL CASO QUE EL SEÑUELO EXPLOTABA: un VERIFICADOR pinado distinto no explica nada,
// porque el modo verificar no emite ningun artefacto. Antes de la ronda 4 esta era la
// forma de bajar el rojo a aviso con un archivo de once lineas.
test("un verificador pinado a otra ref no compra el aviso: verificar no escribe nada", () => {
  const canonico = canonicoTemporal({ versiones: VERSIONES_UNA_EN_VENTANA });
  const deOtroMarco = artefactoAlDia(canonico).replace(
    cabecera({ version: "1.3.0", sha: canonico.sha, superficie: "claude-code" }),
    cabecera({ version: "9.9.9", sha: "abcabcabcabc", superficie: "claude-code" }),
  );
  const resultado = correr({
    canonico,
    archivos: { ...CADENA_SANA, ".projects/AGENTS-marco.md": deOtroMarco },
    hoy: DENTRO_DE_LA_VENTANA,
    pins: [
      { ruta: ".github/workflows/ci.yml", job: "constitucion", ref: "v1", escribe: false },
      { ruta: ".github/workflows/actualizar-marco.yml", job: "actualizar", ref: "v1", escribe: true },
      // el señuelo: otra ref, pero solo VERIFICA
      { ruta: ".github/workflows/senuelo.yml", job: "nunca", ref: "v0.0.1", escribe: false },
    ],
  });
  const adelantado = de(resultado, "artefacto-adelantado");
  assert.equal(adelantado.length, 1, JSON.stringify(resultado.hallazgos));
  assert.equal(adelantado[0].nivel, "error");
  assert.equal(resultado.estado, "rojo");
});

test("resellar la cabecera NO tapa una edicion del cuerpo", () => {
  const canonico = canonicoTemporal({ versiones: VERSIONES_UNA_EN_VENTANA });
  const editado = artefactoAlDia(canonico).replace("La primera regla", "BORRE LA PRIMERA REGLA");
  // El sello cubre el CANONICO, no el cuerpo: recomputarlo no compra nada, porque la
  // autoridad sobre el cuerpo es el re-render. Es la razon por la que D1 descarto los
  // bloques sellados por hash, y hay que poder demostrarla.
  const resellado = editado.replace(/sha=[0-9a-f]+/, "sha=" + "f".repeat(12));
  const resultado = correr({
    canonico,
    archivos: { ...CADENA_SANA, ".projects/AGENTS-marco.md": resellado },
    hoy: DENTRO_DE_LA_VENTANA,
  });
  assert.equal(de(resultado, "artefacto-divergente").length, 1);
  assert.equal(resultado.estado, "rojo");
});

test("dos versiones sin adoptar: manda la fecha de la mas vieja pendiente", () => {
  const canonico = canonicoTemporal({ versiones: VERSIONES_DOS });
  const muyViejo = artefactoAlDia(canonico).replace(
    cabecera({ version: "1.4.0", sha: canonico.sha, superficie: "claude-code" }),
    cabecera({ version: "1.2.0", sha: "viejo1234567", superficie: "claude-code" }),
  );
  const resultado = correr({
    canonico,
    archivos: { ...CADENA_SANA, ".projects/AGENTS-marco.md": muyViejo },
    hoy: DENTRO_DE_LA_VENTANA,
  });

  const atrasado = de(resultado, "artefacto-atrasado")[0];
  assert.equal(atrasado.nivel, "error", "1.3.0 ya era exigible: la mas vieja pendiente manda");
  assert.match(atrasado.mensaje, /2026-06-29/);
});

test("versionPendienteMasVieja devuelve la primera no adoptada, y todas si no hay artefacto", () => {
  assert.equal(versionPendienteMasVieja(VERSIONES_DOS, "1.3.0").version, "1.4.0");
  assert.equal(versionPendienteMasVieja(VERSIONES_DOS, null).version, "1.3.0");
  assert.equal(versionPendienteMasVieja(VERSIONES_DOS, "1.4.0"), null);
});

// ---------------------------------------------------------------------------
// Caso 3 — editado a mano
// ---------------------------------------------------------------------------

test("editado a mano: rojo con el diff, aunque la version declarada sea la vigente", () => {
  const canonico = canonicoTemporal({ versiones: VERSIONES_UNA_EN_VENTANA });
  const editado = artefactoAlDia(canonico).replace("La tercera regla.", "La tercera regla, pero a mi manera.");
  const resultado = correr({
    canonico,
    archivos: { ...CADENA_SANA, ".projects/AGENTS-marco.md": editado },
    hoy: DENTRO_DE_LA_VENTANA,
  });

  const divergente = de(resultado, "artefacto-divergente");
  assert.equal(divergente.length, 1);
  assert.equal(divergente[0].nivel, "error", "una edicion a mano es roja siempre: la ventana es para reglas nuevas");
  assert.ok(divergente[0].detalle.some((linea) => linea.includes("a mi manera")));
  assert.match(divergente[0].mensaje, /desvio/i);
});

test("recomputar el sello no tapa una edicion: el sha no cubre el cuerpo", () => {
  const canonico = canonicoTemporal({ versiones: VERSIONES_UNA_EN_VENTANA });
  const editado = artefactoAlDia(canonico).replace("La tercera regla.", "Borrada.");
  const resultado = correr({
    canonico,
    archivos: { ...CADENA_SANA, ".projects/AGENTS-marco.md": editado },
    hoy: DENTRO_DE_LA_VENTANA,
  });
  assert.equal(de(resultado, "artefacto-divergente").length, 1);
  assert.equal(leerCabecera(editado).sha, canonico.sha, "el sello sigue siendo el del canonico y aun asi es rojo");
});

test("artefacto sin cabecera: rojo, porque no se sabe contra que compararlo", () => {
  const canonico = canonicoTemporal({ versiones: VERSIONES_UNA_EN_VENTANA });
  const resultado = correr({
    canonico,
    archivos: { ...CADENA_SANA, ".projects/AGENTS-marco.md": "# Reglas mias\n\n- Lo que se me ocurrio.\n" },
    hoy: DENTRO_DE_LA_VENTANA,
  });
  assert.deepEqual(de(resultado, "artefacto-sin-cabecera").map((h) => h.nivel), ["error"]);
});

// ---------------------------------------------------------------------------
// Caso 4 — cadena de carga rota
// ---------------------------------------------------------------------------

test("el artefacto existe y el AGENTS.md no lo importa: rojo nombrando el eslabon", () => {
  const canonico = canonicoTemporal({ versiones: VERSIONES_UNA_EN_VENTANA });
  const resultado = correr({
    canonico,
    archivos: {
      "CLAUDE.md": "@AGENTS.md\n",
      "AGENTS.md": "# AGENTS.md\n\nLo propio del proyecto, y nada mas.\n",
      ".projects/AGENTS-marco.md": artefactoAlDia(canonico),
    },
    hoy: DENTRO_DE_LA_VENTANA,
  });

  const roto = de(resultado, "cadena-rota");
  assert.equal(roto.length, 1);
  assert.equal(roto[0].nivel, "error");
  assert.match(roto[0].mensaje, /AGENTS\.md no importa @\.projects\/AGENTS-marco\.md/);
});

test("la referencia dentro de un bloque de codigo no cuenta como cadena", () => {
  const canonico = canonicoTemporal({ versiones: VERSIONES_UNA_EN_VENTANA });
  const enEjemplo = ["# AGENTS.md", "", "Para cargarlo se escribe asi:", "", "```md", "@.projects/AGENTS-marco.md", "```", ""].join("\n");
  const resultado = correr({
    canonico,
    archivos: { "CLAUDE.md": "@AGENTS.md\n", "AGENTS.md": enEjemplo, ".projects/AGENTS-marco.md": artefactoAlDia(canonico) },
    hoy: DENTRO_DE_LA_VENTANA,
  });
  assert.equal(de(resultado, "cadena-rota").length, 1);
});

test("el eslabon que falta por completo tambien es cadena rota", () => {
  const canonico = canonicoTemporal({ versiones: VERSIONES_UNA_EN_VENTANA });
  const resultado = correr({
    canonico,
    archivos: { "AGENTS.md": "@.projects/AGENTS-marco.md\n", ".projects/AGENTS-marco.md": artefactoAlDia(canonico) },
    hoy: DENTRO_DE_LA_VENTANA,
  });
  assert.match(de(resultado, "cadena-rota")[0].mensaje, /CLAUDE\.md/);
});

test("importa() distingue el import de la mencion en prosa", () => {
  assert.equal(importa("@AGENTS.md\n", "AGENTS.md"), true);
  assert.equal(importa("Las reglas estan en AGENTS.md.\n", "AGENTS.md"), false);
  assert.equal(importa("- ver @.projects/AGENTS-marco.md, que trae el marco\n", ".projects/AGENTS-marco.md"), true);
  assert.equal(importa("`@AGENTS.md`\n", "AGENTS.md"), false);
  assert.equal(despojarCodigo("antes\n```\n@AGENTS.md\n```\ndespues\n").includes("@AGENTS.md"), false);
});

test("cadena sana en las dos superficies del area: al dia", () => {
  const canonico = canonicoTemporal({ versiones: VERSIONES_UNA_EN_VENTANA });
  const resultado = correr({
    canonico,
    superficies: SUPERFICIES_POR_DEFECTO,
    archivos: {
      ...CADENA_SANA,
      ".projects/AGENTS-marco.md": artefactoAlDia(canonico),
      ".cursor/rules/00-marco.mdc": artefactoAlDia(canonico, { superficie: "cursor" }),
    },
    hoy: DENTRO_DE_LA_VENTANA,
  });
  assert.equal(resultado.estado, "al-dia", JSON.stringify(resultado.hallazgos, null, 2));
});

test("las dos superficies llevan el MISMO cuerpo y la misma cabecera de version", () => {
  const canonico = canonicoTemporal({ versiones: VERSIONES_UNA_EN_VENTANA });
  const claude = artefactoAlDia(canonico);
  const cursor = artefactoAlDia(canonico, { superficie: "cursor" });
  const cuerpoDe = (texto) => texto.slice(texto.indexOf("-->") + 4);

  assert.equal(cuerpoDe(claude), cuerpoDe(cursor));
  assert.equal(leerCabecera(claude).version, leerCabecera(cursor).version);
  assert.ok(cursor.startsWith("---\n"), "la superficie que no expande imports necesita su frontmatter");
  assert.match(cursor, /alwaysApply: true/);
});

// ---------------------------------------------------------------------------
// Caso 5 — desvío con motivo
// ---------------------------------------------------------------------------

const DESVIO = {
  regla: "dev-no-contacta-usuarios",
  fecha: "2026-08-19",
  aprobado_por: "@builder-uno",
  motivo: "la instancia de identidad de dev es compartida hasta que se aprovisione la propia",
};

test("desvio con motivo: pasa, y queda impreso PEGADO a la regla que anula", () => {
  const canonico = canonicoTemporal({ versiones: VERSIONES_UNA_EN_VENTANA });
  const artefacto = artefactoAlDia(canonico, { desvios: [DESVIO] });
  const resultado = correr({
    canonico,
    archivos: { ...CADENA_SANA, ".projects/AGENTS-marco.md": artefacto },
    desvios: [DESVIO],
    hoy: DENTRO_DE_LA_VENTANA,
  });

  assert.equal(resultado.estado, "al-dia", JSON.stringify(resultado.hallazgos, null, 2));

  const lineas = artefacto.split("\n");
  const marca = lineas.findIndex((l) => l.includes("id=dev-no-contacta-usuarios"));
  const desvio = lineas.findIndex((l) => l.includes("DESVÍO DECLARADO"));
  const siguienteRegla = lineas.findIndex((l) => l.includes("id=regla-tres"));
  assert.ok(marca >= 0 && desvio > marca, "el desvio va despues de su regla");
  assert.ok(desvio < siguienteRegla, "y antes de la regla siguiente: no sesenta lineas mas abajo");
  assert.ok(lineas[desvio].startsWith("  > "), "anidado dentro de la vinieta de la regla");
  assert.ok(artefacto.includes(DESVIO.motivo), "el motivo viaja en el artefacto que los agentes cargan");
  assert.ok(artefacto.includes("@builder-uno"), "y tambien quien lo aprobo");
});

test("el motivo se reimprime como notice en CADA corrida", () => {
  const canonico = canonicoTemporal({ versiones: VERSIONES_UNA_EN_VENTANA });
  const resultado = correr({
    canonico,
    archivos: { ...CADENA_SANA, ".projects/AGENTS-marco.md": artefactoAlDia(canonico, { desvios: [DESVIO] }) },
    desvios: [DESVIO],
    hoy: DENTRO_DE_LA_VENTANA,
  });
  const notas = de(resultado, "desvio-declarado");
  assert.equal(notas.length, 1);
  assert.equal(notas[0].nivel, "notice");
  assert.match(notas[0].mensaje, /instancia de identidad/);
});

test("un desvio sin motivo escrito es rojo", () => {
  const canonico = canonicoTemporal({ versiones: VERSIONES_UNA_EN_VENTANA });
  const { validos, problemas } = clasificarDesvios([{ ...DESVIO, motivo: "   " }], canonico.ids);
  assert.equal(validos.length, 0);
  assert.deepEqual(problemas.map((p) => [p.nivel, p.codigo]), [["error", "desvio-sin-motivo"]]);
});

test("un desvio sin aprobador y otro sin fecha tambien son rojos", () => {
  const canonico = canonicoTemporal({ versiones: VERSIONES_UNA_EN_VENTANA });
  assert.equal(clasificarDesvios([{ ...DESVIO, aprobado_por: "" }], canonico.ids).problemas[0].codigo, "desvio-sin-aprobador");
  assert.equal(clasificarDesvios([{ ...DESVIO, fecha: "ayer" }], canonico.ids).problemas[0].codigo, "desvio-sin-fecha");
});

test("insertarDesvios no toca los bloques de las demas reglas", () => {
  const conDesvio = insertarDesvios(SECCION, [DESVIO]);
  assert.equal((conDesvio.match(/DESVÍO DECLARADO/g) ?? []).length, 1);
  assert.ok(conDesvio.includes("- La tercera regla."));
  assert.ok(conDesvio.includes("<!-- projects:regla id=regla-tres -->"));
  assert.deepEqual(idsDeReglas(conDesvio), idsDeReglas(SECCION), "los ids sobreviven a la insercion");
});

test("el bloque de un desvio es una cita de markdown, con motivo multilinea", () => {
  const lineas = bloqueDesvio({ ...DESVIO, motivo: "primera linea\nsegunda linea" }, "  ");
  assert.ok(lineas.every((l) => l.startsWith("  > ")));
  assert.ok(lineas.some((l) => l.includes("**Motivo:** primera linea")));
  assert.ok(lineas.some((l) => l.endsWith("segunda linea")));
});

// ---------------------------------------------------------------------------
// Caso 6 — desvío muerto
// ---------------------------------------------------------------------------

test("desvio cuya regla ya no existe: rojo, con el motivo que tenia escrito", () => {
  const canonico = canonicoTemporal({ versiones: VERSIONES_UNA_EN_VENTANA });
  const muerto = { ...DESVIO, regla: "regla-que-el-marco-borro" };
  const resultado = correr({
    canonico,
    archivos: { ...CADENA_SANA, ".projects/AGENTS-marco.md": artefactoAlDia(canonico) },
    desvios: [muerto],
    hoy: DENTRO_DE_LA_VENTANA,
  });

  const hallazgo = de(resultado, "desvio-muerto");
  assert.equal(hallazgo.length, 1);
  assert.equal(hallazgo[0].nivel, "error");
  assert.match(hallazgo[0].mensaje, /regla-que-el-marco-borro/);
  assert.match(hallazgo[0].mensaje, /instancia de identidad/, "el motivo viejo va en el mensaje, no se pierde");
  assert.equal(resultado.estado, "rojo");
});

test("un desvio muerto no se imprime en el artefacto", () => {
  const canonico = canonicoTemporal({ versiones: VERSIONES_UNA_EN_VENTANA });
  const { validos } = clasificarDesvios([{ ...DESVIO, regla: "no-existe" }], canonico.ids);
  assert.deepEqual(validos, []);
  assert.ok(!renderizar({ canonico, valores: VALORES_SINTETICOS, desvios: validos }).cuerpo.includes("DESVÍO"));
});

// ---------------------------------------------------------------------------
// Caso 7 — una diferencia que no es divergencia
// ---------------------------------------------------------------------------

test("fin de linea CRLF: no es divergencia", () => {
  const canonico = canonicoTemporal({ versiones: VERSIONES_UNA_EN_VENTANA });
  const conCrlf = artefactoAlDia(canonico).replace(/\n/g, "\r\n");
  const resultado = correr({
    canonico,
    archivos: { ...CADENA_SANA, ".projects/AGENTS-marco.md": conCrlf },
    hoy: DENTRO_DE_LA_VENTANA,
  });
  assert.equal(de(resultado, "artefacto-divergente").length, 0);
  assert.equal(resultado.estado, "al-dia");
});

test("espacios al final de linea y saltos de sobra al final del archivo: tampoco", () => {
  const canonico = canonicoTemporal({ versiones: VERSIONES_UNA_EN_VENTANA });
  const sucio = `${artefactoAlDia(canonico).replace(/\n/g, "   \n")}\n\n\n`;
  const resultado = correr({
    canonico,
    archivos: { ...CADENA_SANA, ".projects/AGENTS-marco.md": sucio },
    hoy: DENTRO_DE_LA_VENTANA,
  });
  assert.equal(de(resultado, "artefacto-divergente").length, 0);
});

test("normalizar deja LF, sin espacios finales y con un solo salto al final", () => {
  assert.equal(normalizar("a  \r\nb\r\n\r\n\r\n"), "a\nb\n");
  assert.equal(normalizar("sin salto"), "sin salto\n");
});

// ---------------------------------------------------------------------------
// Entradas del proyecto: valores y superficies
// ---------------------------------------------------------------------------

test("un placeholder sin valor es rojo: el artefacto no sale con dobles llaves", () => {
  const canonico = canonicoTemporal({ versiones: VERSIONES_UNA_EN_VENTANA });
  const resultado = correr({
    canonico,
    valores: {},
    archivos: { ...CADENA_SANA, ".projects/AGENTS-marco.md": artefactoAlDia(canonico) },
    hoy: DENTRO_DE_LA_VENTANA,
  });
  const hallazgo = de(resultado, "placeholder-sin-valor")[0];
  assert.equal(hallazgo.nivel, "error");
  assert.match(hallazgo.mensaje, /PROYECTO/);
});

test("un valor declarado que el canonico ya no usa es aviso, no rojo", () => {
  const canonico = canonicoTemporal({ versiones: VERSIONES_UNA_EN_VENTANA });
  const resultado = correr({
    canonico,
    valores: { ...VALORES_SINTETICOS, PLACEHOLDER_QUE_SOBRA: "algo" },
    archivos: { ...CADENA_SANA, ".projects/AGENTS-marco.md": artefactoAlDia(canonico) },
    hoy: DENTRO_DE_LA_VENTANA,
  });
  const hallazgo = de(resultado, "valor-sin-usar")[0];
  assert.equal(hallazgo.nivel, "warning");
  assert.match(hallazgo.mensaje, /PLACEHOLDER_QUE_SOBRA/);
});

test("sustituir reporta faltantes y sobrantes sin inventar valores", () => {
  const r = sustituir("{{UNO}} y {{DOS}}", { UNO: "a", TRES: "c" });
  assert.equal(r.texto, "a y {{DOS}}");
  assert.deepEqual(r.faltantes, ["DOS"]);
  assert.deepEqual(r.sinUsar, ["TRES"]);
});

test("una superficie que el marco no sabe emitir es roja, no un silencio", () => {
  const canonico = canonicoTemporal({ versiones: VERSIONES_UNA_EN_VENTANA });
  const resultado = correr({ canonico, superficies: ["editor-nuevo"], archivos: CADENA_SANA, hoy: DENTRO_DE_LA_VENTANA });
  assert.equal(de(resultado, "superficie-desconocida")[0].nivel, "error");
  assert.equal(de(resultado, "sin-superficies").length, 1, "y ademas queda sin ninguna superficie servida");
});

// ---------------------------------------------------------------------------
// LA VENTANA DE GRACIA ES OPT-IN, NO OBLIGATORIA (change ventana-vencida).
//
// Hasta el 2026-08-22 habia un piso de 28 dias y una puerta `urgente` para
// saltarselo. Se retiro la POLITICA y quedo el MECANISMO: una version que quiera
// estrenarse con aviso declara un `exigible_desde` futuro, y eso lo fijan las
// pruebas de mas arriba (VERSIONES_UNA_EN_VENTANA + DENTRO_DE_LA_VENTANA), que
// siguen siendo la propiedad correcta. Lo que estas tres fijan es el default
// nuevo y sus dos bordes.
// ---------------------------------------------------------------------------

test("cero dias de gracia es lo NORMAL: exigible el dia que se publica", () => {
  assert.deepEqual(
    validarManifiesto({
      versiones: [{ version: "1.3.0", publicada: "2026-08-19", exigible_desde: "2026-08-19" }],
    }),
    [],
  );
});

test("un exigible_desde ANTERIOR a la publicacion sigue siendo invalido", () => {
  // El piso se fue; el sinsentido no. Una version no puede ser exigible antes de
  // existir, y sin esta asercion la validacion aceptaria cualquier fecha.
  const problemas = validarManifiesto({
    versiones: [{ version: "1.3.0", publicada: "2026-08-19", exigible_desde: "2026-08-18" }],
  });
  assert.equal(problemas.length, 1);
  assert.match(problemas[0], /ANTERIOR a/);
});

test("el campo urgente ya no cambia nada: ni valida distinto ni avisa", () => {
  // Era la puerta de atras del piso de 28 dias. Sin piso no hay puerta, y un
  // aviso que nombra una puerta inexistente ensena a ignorar avisos.
  const versiones = [{ version: "1.3.0", publicada: "2026-08-19", exigible_desde: "2026-08-19", urgente: true }];
  assert.deepEqual(validarManifiesto({ versiones }), []);

  const canonico = canonicoTemporal({ versiones });
  const resultado = correr({
    canonico,
    archivos: { ...CADENA_SANA, ".projects/AGENTS-marco.md": artefactoAlDia(canonico) },
    hoy: PASADO_EL_PLAZO,
  });
  assert.deepEqual(de(resultado, "version-urgente"), []);
});

test("un artefacto atrasado es ROJO el mismo dia, sin ventana que lo tape", () => {
  // El corazon del change: antes esto era warning durante 28 dias.
  const versiones = [
    { version: "1.3.0", publicada: "2026-08-19", exigible_desde: "2026-08-19" },
    { version: "1.4.0", publicada: "2026-08-20", exigible_desde: "2026-08-20" },
  ];
  const canonico = canonicoTemporal({ versiones });
  const viejo = artefactoAlDia(canonico).replace(/version=1\.4\.0/, "version=1.3.0");
  const resultado = correr({
    canonico,
    archivos: { ...CADENA_SANA, ".projects/AGENTS-marco.md": viejo },
    hoy: new Date("2026-08-20T00:00:00Z"),
  });
  const atrasado = resultado.hallazgos.filter((h) => h.nivel === "error");
  assert.ok(atrasado.length >= 1, JSON.stringify(resultado.hallazgos));
});

test("un manifiesto sin versiones, con fechas mal o desordenado, es invalido", () => {
  assert.match(validarManifiesto({}).join(" "), /no declara ninguna version/);
  assert.match(
    validarManifiesto({ versiones: [{ version: "1.3", publicada: "ayer", exigible_desde: "2026-09-16" }] }).join(" "),
    /semver/,
  );
  assert.match(
    validarManifiesto({
      versiones: [
        { version: "1.4.0", publicada: "2026-06-01", exigible_desde: "2026-06-29" },
        { version: "1.3.0", publicada: "2026-08-19", exigible_desde: "2026-09-16" },
      ],
    }).join(" "),
    /orden creciente/,
  );
});

test("compararSemver ordena por componente, no por texto", () => {
  assert.equal(compararSemver("1.10.0", "1.9.0"), 1);
  assert.equal(compararSemver("v1.2.3", "1.2.3"), 0);
  assert.equal(compararSemver("1.2.3", "1.2.4"), -1);
});

test("un canonico que se pasa del presupuesto de lineas es invalido", () => {
  const canonico = canonicoTemporal({ versiones: VERSIONES_UNA_EN_VENTANA, presupuesto: 3 });
  assert.match(canonico.problemas.join(" "), /presupuesto/);
  const resultado = correr({ canonico, archivos: CADENA_SANA, hoy: DENTRO_DE_LA_VENTANA });
  assert.equal(de(resultado, "canonico-invalido")[0].nivel, "error");
});

// ---------------------------------------------------------------------------
// El canónico REAL: lo único que Projects puede dogfoodear de este mecanismo
// ---------------------------------------------------------------------------

test("el canonico real es valido: manifiesto, ventana y presupuesto", () => {
  const canonico = leerCanonico(CANONICO_REAL);
  assert.deepEqual(canonico.problemas, []);
  assert.ok(canonico.secciones.length >= 2, "el canonico se arma de varias secciones");
  assert.match(canonico.version, /^\d+\.\d+\.\d+$/);
  assert.match(canonico.sha, /^[0-9a-f]{12}$/);
});

test("el canonico real renderiza sin dejar una sola doble llave", () => {
  const canonico = leerCanonico(CANONICO_REAL);
  const render = renderizar({ canonico, valores: VALORES, desvios: [] });
  assert.deepEqual(
    render.faltantes,
    [],
    "hay un placeholder nuevo en el canonico sin valor en este banco: documentalo y agregalo aca",
  );
  assert.deepEqual(render.sinUsar, [], "sobra un valor en el banco: el canonico ya no lo usa");
  assert.equal(/\{\{[A-Z0-9_]+\}\}/.test(render.cuerpo), false);
});

test("cada regla del canonico real tiene un id estable y unico", () => {
  const canonico = leerCanonico(CANONICO_REAL);
  assert.ok(canonico.ids.length >= 40, `el canonico declara ${canonico.ids.length} reglas con id`);
  assert.equal(new Set(canonico.ids).size, canonico.ids.length, "hay ids repetidos: un desvio no sabria a cual apunta");
  for (const id of canonico.ids) assert.match(id, /^[a-z0-9][a-z0-9-]*$/);
});

test("las tres reglas fijadas esta semana estan en el canonico real", () => {
  const canonico = leerCanonico(CANONICO_REAL);
  for (const id of [
    "escalar-modelo-exige-ok-previo",
    "config-de-repo-u-organizacion-exige-ok-previo",
    "apartarse-de-la-infra-base-exige-preguntar-antes",
    "infra-base-fijada",
  ]) {
    assert.ok(canonico.ids.includes(id), `falta la regla ${id}`);
  }
});

test("el canonico real ya NO dice que la escalada de modelo se decida sola", () => {
  const canonico = leerCanonico(CANONICO_REAL);
  assert.equal(
    /[Ee]scala por sesi[oó]n/.test(canonico.cuerpo),
    false,
    "el texto vigente autorizaba escalar sin compuerta: se reemplaza, no se le agrega una excepcion al lado",
  );
  assert.match(canonico.cuerpo, /OK humano PREVIO/);
});

test("el canonico real trae las reglas que la copia lossy habia perdido", () => {
  // Se compara con los espacios colapsados: lo que estas aserciones cuidan es que la
  // REGLA esté, no cómo quedó cortada la línea.
  const cuerpo = leerCanonico(CANONICO_REAL).cuerpo.replace(/\s+/g, " ");
  for (const fragmento of [
    "**cola, nunca cancelación**",
    "`ci-ok`",
    "APP_ENV=prod",
    "no-console",
    "origen preciso",
    "sistemas de terceros",
    "Well-Architected",
    "invariantes de **PROPIEDADES**",
    "$10/$50 vs $3/$15",
    "text=auto eol=lf",
  ]) {
    assert.ok(cuerpo.includes(fragmento), `el canonico deberia decir: ${fragmento}`);
  }
});

test("el canonico real no filtra valores de ningun proyecto concreto", () => {
  const { cuerpo } = leerCanonico(CANONICO_REAL);
  // Los valores de abajo son los que el render inyecta desde `.projects-valores.json`:
  // si alguno aparece en el canonico, el canonico dejo de ser del marco.
  // La lista cubre UNA ranura de `.projects-valores.json` por clase de dato, y
    // `{{PROYECTO}}` es la mas propensa a filtrarse porque aparece en prosa y no solo
    // en configuracion: sin ella, el nombre de un proyecto concreto podria entrar al
    // canonico sin que nadie lo viera.
    for (const prohibido of ["un-proyecto-anterior", "la organización-dev", "la organización-prod", "802589444524", "635352382411", "@builder-uno"]) {
    assert.equal(cuerpo.includes(prohibido), false, `el canonico nombra ${prohibido}, que es de un proyecto`);
  }
});

test("el piso de permisos que publica el canonico real no lleva placeholders", () => {
  const canonico = leerCanonico(CANONICO_REAL);
  assert.ok(canonico.piso_permisos.length > 0);
  // El piso NO pasa por el render: es una recomendación del marco, igual para todos
  // los proyectos, así que un placeholder ahí quedaría literal en el aviso.
  for (const item of canonico.piso_permisos) {
    assert.equal(/\{\{/.test(item.entrada), false, `la entrada de "${item.nombre}" lleva un marcador sin resolver`);
    assert.equal(/\{\{/.test(item.cubre), false, `la propiedad que cubre "${item.nombre}" lleva un marcador sin resolver`);
  }
});

// ---------------------------------------------------------------------------
// Los dos modos, de punta a punta
// ---------------------------------------------------------------------------

function repoTemporal({ valores = VALORES, desvios = null, archivos = CADENA_SANA }) {
  const raiz = temporal("projects-repo-");
  writeFileSync(join(raiz, ".projects-valores.json"), JSON.stringify(valores), "utf8");
  if (desvios) writeFileSync(join(raiz, ".projects-desvios.json"), JSON.stringify({ desvios }), "utf8");
  for (const [ruta, contenido] of Object.entries(archivos)) {
    const completa = join(raiz, ruta);
    mkdirSync(dirname(completa), { recursive: true });
    writeFileSync(completa, contenido, "utf8");
  }
  return raiz;
}

test("modo escribir: emite las dos superficies y despues verificar sale al dia", () => {
  const raiz = repoTemporal({});
  const escritura = spawnSync(process.execPath, [SCRIPT], {
    encoding: "utf8",
    env: { ...process.env, CONSTITUCION_MODO: "escribir", CONSTITUCION_RAIZ: raiz, GITHUB_OUTPUT: "", GITHUB_STEP_SUMMARY: "" },
  });
  assert.equal(escritura.status, 0, escritura.stdout + escritura.stderr);
  assert.match(escritura.stdout, /escrito \.projects\/AGENTS-marco\.md/);
  assert.match(escritura.stdout, /escrito \.cursor\/rules\/00-marco\.mdc/);

  const emitido = readFileSync(join(raiz, ".projects/AGENTS-marco.md"), "utf8");
  assert.match(emitido, /^<!-- projects:constitucion version=/);
  assert.equal(/\{\{[A-Z0-9_]+\}\}/.test(emitido), false);

  const verificacion = spawnSync(process.execPath, [SCRIPT], {
    encoding: "utf8",
    env: { ...process.env, CONSTITUCION_RAIZ: raiz, CONSTITUCION_SALIDA_CORREGIDA: join(temporal("projects-corregido-"), "salida") },
  });
  assert.equal(verificacion.status, 0, verificacion.stdout + verificacion.stderr);
  assert.match(verificacion.stdout, /al dia/);
});

test("modo verificar sin artefacto: falla o avisa, pero deja el artefacto al dia en disco", () => {
  const raiz = repoTemporal({});
  const corregidos = join(temporal("projects-corregido-"), "salida");
  const corrida = spawnSync(process.execPath, [SCRIPT], {
    encoding: "utf8",
    env: { ...process.env, CONSTITUCION_RAIZ: raiz, CONSTITUCION_SALIDA_CORREGIDA: corregidos },
  });
  assert.match(corrida.stdout, /::(warning|error)::falta \.projects\/AGENTS-marco\.md/);
  const alDia = readFileSync(join(corregidos, ".projects/AGENTS-marco.md"), "utf8");
  assert.match(alDia, /projects:constitucion/);
});

test("modo escribir con un desvio muerto no escribe nada", () => {
  const raiz = repoTemporal({ desvios: [{ ...DESVIO, regla: "regla-inexistente" }] });
  const corrida = spawnSync(process.execPath, [SCRIPT], {
    encoding: "utf8",
    env: { ...process.env, CONSTITUCION_MODO: "escribir", CONSTITUCION_RAIZ: raiz },
  });
  assert.equal(corrida.status, 1);
  assert.match(corrida.stdout, /desvio muerto/);
  assert.match(corrida.stdout, /no se escribio nada/);
});

// La versión anterior de esta prueba exigía exit 1 en modo VERIFICAR y así fijaba un
// rojo seco el primer día para el repo que todavía no adoptó: un endurecimiento
// estrenado sin modo aviso, que es la regla que el propio `AGENTS.md` de Projects
// impone. La propiedad correcta es asimétrica y las dos mitades están en
// `pruebas/regresiones-auditoria.test.mjs`: en verificar la ausencia entra por la
// ventana de gracia (aviso, después rojo) y en escribir sigue siendo rojo porque no
// hay con qué renderizar. Acá queda la mitad de escribir, que es la que este archivo
// venía cubriendo.
test("sin el archivo de valores no hay render: el modo escribir es rojo con el arreglo escrito", () => {
  const raiz = temporal("projects-repo-vacio-");
  const corrida = spawnSync(process.execPath, [SCRIPT], {
    encoding: "utf8",
    env: { ...process.env, CONSTITUCION_MODO: "escribir", CONSTITUCION_RAIZ: raiz },
  });
  assert.equal(corrida.status, 1);
  assert.match(corrida.stdout, /::error::falta \.projects-valores\.json/);
});

test("un modo inventado no hace nada en silencio", () => {
  const corrida = spawnSync(process.execPath, [SCRIPT], {
    encoding: "utf8",
    env: { ...process.env, CONSTITUCION_MODO: "renderizar-a-medias" },
  });
  assert.equal(corrida.status, 1);
  assert.match(corrida.stdout, /modo desconocido/);
});

// Regresion cazada por el verificador de la tanda del 2026-08-19: el hallazgo
// `sin-superficies` estaba probado SOLO contra `verificar()` y era inalcanzable desde
// la action, porque `main()` trataba la clave declarada vacia igual que la clave
// ausente y caia al default del marco. O sea: la propiedad que el action.yml
// prometia ("declarar cero superficies es rojo") no la exhibia el camino que se
// despacha. Estas dos pruebas fijan la distincion en el nivel donde se rompio.
test("declarar la lista de superficies VACIA es rojo, no un default", () => {
  const raiz = repoTemporal({ valores: { ...VALORES, superficies: [] } });
  const corrida = spawnSync(process.execPath, [SCRIPT], {
    encoding: "utf8",
    env: { ...process.env, CONSTITUCION_RAIZ: raiz, GITHUB_OUTPUT: "", GITHUB_STEP_SUMMARY: "" },
  });
  assert.equal(corrida.status, 1, corrida.stdout + corrida.stderr);
  assert.match(corrida.stdout, /no declara ninguna superficie/);
});

test("NO declarar la clave de superficies cae al default del marco, sin rojo por eso", () => {
  const { superficies, ...sinLaClave } = VALORES;
  assert.equal(superficies, undefined, "VALORES no deberia traer la clave; si la trae, esta prueba miente");
  const raiz = repoTemporal({ valores: sinLaClave });
  const corrida = spawnSync(process.execPath, [SCRIPT], {
    encoding: "utf8",
    env: { ...process.env, CONSTITUCION_MODO: "escribir", CONSTITUCION_RAIZ: raiz, GITHUB_OUTPUT: "", GITHUB_STEP_SUMMARY: "" },
  });
  assert.equal(corrida.status, 0, corrida.stdout + corrida.stderr);
  for (const nombre of SUPERFICIES_POR_DEFECTO) {
    assert.ok(existsSync(join(raiz, SUPERFICIES[nombre].ruta)), `no se emitio la superficie por defecto ${nombre}`);
  }
});

test("el catalogo de superficies y el default no divergen", () => {
  for (const nombre of SUPERFICIES_POR_DEFECTO) assert.ok(SUPERFICIES[nombre], `${nombre} no esta en el catalogo`);
  for (const [nombre, definicion] of Object.entries(SUPERFICIES)) {
    assert.match(definicion.ruta, /^[.\w/-]+$/, `${nombre} tiene una ruta rara`);
    assert.ok(Array.isArray(definicion.cadena));
  }
});
