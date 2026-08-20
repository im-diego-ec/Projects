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
  DIAS_DE_GRACIA_MINIMOS,
  SUPERFICIES,
  SUPERFICIES_POR_DEFECTO,
  artefactoDe,
  basePublicada,
  bloqueDesvio,
  cabecera,
  clasificarDesvios,
  compararSemver,
  despojarCodigo,
  idDeCapa,
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
  verificarBaseDeclarada,
  versionPendienteMasVieja,
} from "../constitucion.mjs";

const SCRIPT = join(import.meta.dirname, "..", "constitucion.mjs");
const CANONICO_REAL = join(import.meta.dirname, "..", "canonico");

/**
 * La base publicada, escrita a mano ACÁ y no derivada del manifiesto.
 *
 * Es deliberado: derivarla del manifiesto haría que el banco se comparara contra sí mismo
 * y un cambio de base pasaría en verde. Escrita, cualquier edición del manifiesto tiene
 * que pasar también por acá — que es justamente la fricción que el contrato pide, porque
 * cambiar la base exige un cambio del marco con su decisión y no una edición de texto.
 */
const BASE_PUBLICADA = {
  computo: "Express sobre ECS (contenedor)",
  persistencia: "base relacional administrada (RDS, PostgreSQL)",
  frontend: "React + Vite + TypeScript",
  backend: "Node + Express + TypeScript",
  identidad: "Clerk",
  validacion: "Zod",
  iac: "AWS + Terraform",
  pipeline: "GitHub Actions",
  paquetes: "pnpm con workspaces",
  "pruebas-unitarias": "Vitest",
  "pruebas-e2e": "Playwright",
};

/** Valores INVENTADOS a propósito: en el marco no se escriben handles, cuentas ni
 *  dominios reales de ningún proyecto (frontera 🛑 de AGENTS.md). El bloque `base` NO es
 *  inventado —es dato del marco— y va acá porque un consumidor al día lo declara. */
const VALORES = {
  base: BASE_PUBLICADA,
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
    JSON.stringify({ presupuesto_lineas: presupuesto, piso_permisos: ["Bash(pnpm test)"], versiones }),
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

function correr({ canonico, archivos, hoy, desvios = [], superficies = ["claude-code"], valores = VALORES_SINTETICOS }) {
  return verificar({ canonico, valores, desvios, superficies, hoy, leer: lector(archivos) });
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

// HUECO CONOCIDO, fijado por prueba a proposito. Reproducido por codigo de salida el
// 2026-08-19 por el verificador de la tanda: subir a mano la version de la cabecera a
// una que esta copia del marco no conoce hace que el cuerpo NO se compare contra nada.
// O sea: se borra cualquier regla del artefacto y el check queda VERDE para siempre,
// con una linea de diff.
//
// Esta prueba NO bendice el hueco: lo vuelve explicito y hace que cerrarlo sea un
// cambio de prueba deliberado en vez de un descubrimiento. Sigue siendo aviso porque
// la causa benigna existe (un consumidor pinado a un SHA viejo corre una copia del
// marco anterior al artefacto, y ahi «no puedo verificar» no es «alguien violo la
// regla»). El cierre propuesto, que es decision humana: con `GITHUB_ACTION_REF` = el
// tag movil no hay pin que explique un artefacto mas nuevo, asi que ahi va rojo.
test("HUECO: version adelantada a mano deja el cuerpo sin comparar (aviso, no rojo)", () => {
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

  const adelantado = de(resultado, "artefacto-adelantado");
  assert.equal(adelantado.length, 1);
  assert.equal(adelantado[0].nivel, "warning");
  // El mensaje tiene que nombrar la manipulacion, no solo ofrecer la explicacion
  // tranquila del pin: un revisor que lee "¿un pin a un SHA?" cierra la pestaña.
  assert.match(adelantado[0].mensaje, /a mano/);
  // Y acá está el hueco, escrito: el cuerpo editado NO se reporta como divergente.
  assert.equal(de(resultado, "artefacto-divergente").length, 0);
  assert.equal(resultado.rojos, 0);
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
// La ventana de gracia existe de verdad (D6)
// ---------------------------------------------------------------------------

test("una version con menos de 28 dias de gracia es un canonico invalido", () => {
  const problemas = validarManifiesto({
    versiones: [{ version: "1.3.0", publicada: "2026-08-19", exigible_desde: "2026-08-20" }],
  });
  assert.equal(problemas.length, 1);
  assert.match(problemas[0], new RegExp(String(DIAS_DE_GRACIA_MINIMOS)));
});

test("la puerta de atras se llama urgente y no pasa muda", () => {
  const versiones = [{ version: "1.3.0", publicada: "2026-08-19", exigible_desde: "2026-08-20", urgente: true }];
  assert.deepEqual(validarManifiesto({ versiones }), []);

  const canonico = canonicoTemporal({ versiones });
  const resultado = correr({
    canonico,
    archivos: { ...CADENA_SANA, ".projects/AGENTS-marco.md": artefactoAlDia(canonico) },
    hoy: PASADO_EL_PLAZO,
  });
  assert.equal(de(resultado, "version-urgente")[0].nivel, "warning");
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
  for (const prohibido of ["un-proyecto-anterior", "la organización-dev", "la organización-prod", "111111111111", "222222222222", "@builder-uno"]) {
    assert.equal(cuerpo.includes(prohibido), false, `el canonico nombra ${prohibido}, que es de un proyecto`);
  }
});

test("el piso de permisos que publica el canonico real no lleva placeholders", () => {
  const canonico = leerCanonico(CANONICO_REAL);
  assert.ok(canonico.piso_permisos.length > 0);
  for (const entrada of canonico.piso_permisos) assert.equal(/\{\{/.test(entrada), false);
});

// ---------------------------------------------------------------------------
// La base tecnológica: los cinco casos de la tarea 2.2 del change `stack-estandar`
//
// El caso (e) —un desvío que nombra una capa que la base no publica— NO tiene test
// propio acá A PROPÓSITO: el id de la capa ES el id de la regla, así que ese caso cae por
// el camino `desvio-muerto`, que ya está cubierto arriba por «desvio cuya regla ya no
// existe: rojo, con el motivo que tenia escrito». Se agrega abajo la aserción de que ese
// camino sigue alcanzando a una capa inventada, para que la cobertura no dependa de que
// alguien recuerde el razonamiento.
// ---------------------------------------------------------------------------

const CANONICO_CON_BASE = () => leerCanonico(CANONICO_REAL);

function base({ valores, desviosValidos = [], hoy = PASADO_EL_PLAZO }) {
  return verificarBaseDeclarada({ canonico: CANONICO_CON_BASE(), valores, desviosValidos, hoy });
}

test("el canonico real publica las once capas de la base, y cada una tiene su regla", () => {
  const canonico = leerCanonico(CANONICO_REAL);
  assert.deepEqual(basePublicada(canonico), BASE_PUBLICADA);
  for (const capa of Object.keys(BASE_PUBLICADA)) {
    assert.ok(canonico.ids.includes(idDeCapa(capa)), `falta la regla de la capa ${capa}`);
  }
});

test("la base sale del manifiesto: cambiarla mueve el cuerpo y el sello", () => {
  const original = leerCanonico(CANONICO_REAL);
  const dir = temporal("projects-base-");
  const manifiesto = JSON.parse(readFileSync(join(CANONICO_REAL, "manifiesto.json"), "utf8"));
  manifiesto.base.capas = manifiesto.base.capas.map((entrada) =>
    entrada.capa === "computo" ? { ...entrada, pieza: "otra forma de computo" } : entrada,
  );
  writeFileSync(join(dir, "manifiesto.json"), JSON.stringify(manifiesto), "utf8");
  for (const seccion of original.secciones) {
    writeFileSync(join(dir, seccion.archivo), readFileSync(join(CANONICO_REAL, seccion.archivo), "utf8"), "utf8");
  }

  const movido = leerCanonico(dir);
  assert.deepEqual(movido.problemas, []);
  assert.ok(movido.cuerpo.includes("otra forma de computo"), "el cuerpo se renderiza desde el manifiesto");
  assert.notEqual(movido.sha, original.sha, "cambiar la base tiene que mover el sello");
});

test("(a) sin bloque de base: aviso en la ventana, rojo pasada la fecha, nunca verde mudo", () => {
  const enVentana = base({ valores: { ...VALORES, base: undefined }, hoy: DENTRO_DE_LA_VENTANA });
  assert.equal(enVentana.length, 1);
  assert.equal(enVentana[0].codigo, "base-sin-declarar");
  assert.equal(enVentana[0].nivel, "warning");

  const pasado = base({ valores: { ...VALORES, base: undefined } });
  assert.equal(pasado[0].nivel, "error");
});

test("(b) base igual a la publicada: nada que reportar", () => {
  assert.deepEqual(base({ valores: VALORES }), []);
});

test("(c) capa distinta con desvio aprobado: pasa, y el desvio se imprime pegado a esa capa", () => {
  const canonico = leerCanonico(CANONICO_REAL);
  const valores = { ...VALORES, base: { ...BASE_PUBLICADA, persistencia: "DynamoDB" } };
  const desvio = {
    regla: idDeCapa("persistencia"),
    motivo: "El dominio es documental y no hay relaciones que sostener.",
    aprobado_por: "@builder-dos",
    fecha: "2026-08-20",
  };
  assert.deepEqual(base({ valores, desviosValidos: [desvio] }), []);

  const artefacto = artefactoAlDia(canonico, { desvios: [desvio], valores });
  const lineas = artefacto.split("\n");
  const marca = lineas.findIndex((linea) => linea.includes(idDeCapa("persistencia")));
  const cerca = lineas.slice(marca, marca + 6).join("\n");
  assert.match(cerca, /\*\*Persistencia\*\*/);
  assert.match(cerca, /DESVÍO DECLARADO/);
});

test("(d) capa distinta sin desvio: rojo nombrando capa, pieza declarada y pieza de la base", () => {
  const hallazgos = base({ valores: { ...VALORES, base: { ...BASE_PUBLICADA, persistencia: "DynamoDB" } } });
  assert.equal(hallazgos.length, 1);
  assert.equal(hallazgos[0].codigo, "base-capa-divergente");
  assert.equal(hallazgos[0].nivel, "error");
  assert.match(hallazgos[0].mensaje, /`persistencia`/);
  assert.match(hallazgos[0].mensaje, /DynamoDB/);
  assert.match(hallazgos[0].mensaje, /base relacional administrada/);
});

test("(e) un desvio que nombra una capa que la base no publica es un desvio muerto", () => {
  const canonico = leerCanonico(CANONICO_REAL);
  const { problemas, validos } = clasificarDesvios(
    [{ regla: idDeCapa("mensajeria"), motivo: "usamos colas", aprobado_por: "@builder-dos", fecha: "2026-08-20" }],
    canonico.ids,
  );
  assert.deepEqual(validos, []);
  assert.equal(problemas[0].codigo, "desvio-muerto");
  assert.equal(problemas[0].nivel, "error");
  assert.match(problemas[0].mensaje, /usamos colas/);
});

test("dos capas desviadas a la vez no chocan entre si", () => {
  const canonico = leerCanonico(CANONICO_REAL);
  const dos = ["computo", "persistencia"].map((capa) => ({
    regla: idDeCapa(capa),
    motivo: `este proyecto no cabe en la capa ${capa}`,
    aprobado_por: "@builder-dos",
    fecha: "2026-08-20",
  }));
  const { problemas, validos } = clasificarDesvios(dos, canonico.ids);
  assert.deepEqual(problemas, [], "un id por capa es lo que evita el choque de `desvio-duplicado`");
  assert.equal(validos.length, 2);
});

test("el rojo de una capa divergente trae el JSON exacto del desvio a agregar", () => {
  const hallazgos = base({ valores: { ...VALORES, base: { ...BASE_PUBLICADA, computo: "Lambda" } } });
  const { mensaje } = hallazgos[0];
  const json = mensaje.slice(mensaje.indexOf("{"), mensaje.lastIndexOf("}") + 1);
  const propuesto = JSON.parse(json);
  assert.equal(propuesto.regla, idDeCapa("computo"));
  assert.ok(propuesto.motivo && propuesto.aprobado_por && propuesto.fecha);
});

test("una capa declarada que la base no publica es aviso, no rojo", () => {
  const hallazgos = base({ valores: { ...VALORES, base: { ...BASE_PUBLICADA, observabilidad: "Datadog" } } });
  assert.equal(hallazgos.length, 1);
  assert.equal(hallazgos[0].codigo, "base-capa-desconocida");
  assert.equal(hallazgos[0].nivel, "warning");
});

test("una capa publicada sin su regla en el cuerpo es un canonico invalido", () => {
  const dir = temporal("projects-base-sin-regla-");
  writeFileSync(
    join(dir, "manifiesto.json"),
    JSON.stringify({
      presupuesto_lineas: 500,
      versiones: VERSIONES_UNA_EN_VENTANA,
      base: { capas: [{ capa: "computo", titulo: "Computo", pieza: "una pieza" }] },
    }),
    "utf8",
  );
  // La sección NO trae la marca: la base queda publicada y sin imprimir.
  writeFileSync(join(dir, "10-reglas.md"), SECCION, "utf8");
  const canonico = leerCanonico(dir);
  assert.ok(
    canonico.problemas.some((problema) => problema.includes("projects:base:capas")),
    `se esperaba el problema de la marca ausente, y salio: ${JSON.stringify(canonico.problemas)}`,
  );
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

test("sin el archivo de valores no hay render: rojo con el arreglo escrito", () => {
  const raiz = temporal("projects-repo-vacio-");
  const corrida = spawnSync(process.execPath, [SCRIPT], {
    encoding: "utf8",
    env: { ...process.env, CONSTITUCION_RAIZ: raiz },
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
