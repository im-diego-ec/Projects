// Un `aprueba:` que cita el desvio de review del marco exige que el desvio este declarado.
//
//   node --test pruebas/ci-del-marco/aprueba-cita-lo-que-existe.test.mjs
//
// QUE CIERRA (revision adversarial del porte, RV-L4-09, 2026-09-17). Los changes del
// carril L4 dicen `aprueba: revision adversarial (desvio del marco: un solo mantenedor,
// ver AGENTS.md)`, y en esa rama AGENTS.md NO tiene el recuadro del desvio: lo trae el
// change `el-marco-declara-su-desvio-de-review` del carril L1, junto con la regla de
// `openspec/config.yaml` que lo admite. Integrado L4 sin L1, el frontmatter de tres
// changes remite a una declaracion que no existe y contradice la config vigente, que
// exige que `aprueba` nombre ROLES. Ningun artefacto declaraba ese orden, y el unico
// banco que mira el desvio (el de L1) llega con L1: si L1 no llega, no hay quien mire.
//
// LA REGLA: si un artefacto de un change ACTIVO cita el desvio en su `aprueba:` o su
// `revisa:`, AGENTS.md declara el desvio por su identificador. En el carril del porte el
// caso queda `todo` —ahi la dependencia es conocida y esta escrita en cada proposal—, y
// camino a main se exige (ver `pendienteDelPorte`).
//
// LO QUE NO HACE: juzgar si el recuadro esta completo, si su condicion de retiro se
// cumple o si la revision quedo registrada. Eso es de
// `pruebas/ci-del-marco/desvio-de-review-del-marco.test.mjs`, que llega con L1. Esto es
// solo el otro sentido de la misma flecha: una cita no puede apuntar al vacio.

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { CARPETA_DEL_PORTE, pendienteDelPorte } from "./carril-del-porte.mjs";

const RAIZ = join(import.meta.dirname, "..", "..");
const CHANGES = join(RAIZ, "openspec", "changes");

/** El identificador con que AGENTS.md declara el desvio. Es el que nombra la regla de
 *  `openspec/config.yaml` que admite la cita («Mientras rija el desvio
 *  `github-review-cruzado-automatizado` declarado en `AGENTS.md`»). */
export const DESVIO = "github-review-cruzado-automatizado";

/** ¿Este valor de `aprueba:`/`revisa:` cita el desvio del marco? */
const citaElDesvio = (valor) => /desv[ií]o del marco/i.test(valor);

/** Las lineas `aprueba:`/`revisa:` del frontmatter de un markdown que citan el desvio. */
export function citasDelDesvio(texto) {
  const m = String(texto).match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return [];
  return m[1]
    .split(/\r?\n/)
    .map((l) => l.match(/^(aprueba|revisa):\s*(.*)$/))
    .filter((c) => c && citaElDesvio(c[2]))
    .map((c) => `${c[1]}: ${c[2].trim()}`);
}

/** Las citas que apuntan al vacio: todas, si AGENTS.md no declara el desvio. */
export function citasSinDeclarar(documentos, agents) {
  if (String(agents).includes(DESVIO)) return [];
  return documentos.flatMap(({ ruta, texto }) => citasDelDesvio(texto).map((c) => `${ruta} -> ${c}`));
}

/** Los markdown de los changes ACTIVOS, a cualquier profundidad. El archive es
 *  historia: sus citas eran verdad el dia que se archivo. */
function documentosActivos() {
  const salida = [];
  const recorrer = (dir) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name);
      if (e.isDirectory()) recorrer(p);
      else if (e.name.endsWith(".md")) salida.push({ ruta: p.slice(RAIZ.length + 1), texto: readFileSync(p, "utf8") });
    }
  };
  for (const e of readdirSync(CHANGES, { withFileTypes: true })) {
    if (e.isDirectory() && e.name !== "archive") recorrer(join(CHANGES, e.name));
  }
  return salida;
}

test("MUERDE: una cita del desvio sin la declaracion en AGENTS.md es un hallazgo; con ella, no", () => {
  const docs = [
    { ruta: "openspec/changes/x/proposal.md", texto: "---\ndri: Builder 1\naprueba: revision adversarial (desvio del marco: un solo mantenedor, ver AGENTS.md)\n---\n# x" },
    { ruta: "openspec/changes/y/design.md", texto: "---\naprueba: Builder 2 (builder par)\n---\n# y" },
    { ruta: "openspec/changes/z/notas.md", texto: "# sin frontmatter\naprueba: revision adversarial (desvio del marco)\n" },
  ];
  assert.deepEqual(citasSinDeclarar(docs, "# AGENTS.md sin el recuadro"), [
    "openspec/changes/x/proposal.md -> aprueba: revision adversarial (desvio del marco: un solo mantenedor, ver AGENTS.md)",
  ]);
  assert.deepEqual(citasSinDeclarar(docs, `> **DESVIO DECLARADO — \`${DESVIO}\`.**`), []);
});

test("MUERDE: la cita se reconoce con y sin acento, en aprueba y en revisa", () => {
  assert.equal(citasDelDesvio("---\nrevisa: revisión adversarial (desvío del marco)\n---\n").length, 1);
  assert.equal(citasDelDesvio("---\naprueba: PO\n---\n").length, 0);
});

test(
  "todo aprueba que cita el desvio del marco apunta a una declaracion que existe",
  {
    todo:
      pendienteDelPorte(RAIZ, CARPETA_DEL_PORTE) &&
      "en el carril del porte: el desvio lo declara el change el-marco-declara-su-desvio-de-review (carril L1), que se integra antes",
  },
  () => {
    const sinDeclarar = citasSinDeclarar(documentosActivos(), readFileSync(join(RAIZ, "AGENTS.md"), "utf8"));
    assert.deepEqual(
      sinDeclarar,
      [],
      `estos artefactos citan el desvio de review del marco y AGENTS.md no lo declara (\`${DESVIO}\`):\n  ` +
        `${sinDeclarar.join("\n  ")}\nArreglo: integrar primero el change que declara el desvio ` +
        "(el-marco-declara-su-desvio-de-review), o devolverles a estos artefactos un aprueba que nombre un rol",
    );
  },
);
