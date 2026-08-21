// Banco del guardrail de deltas de OpenSpec.
//
// POR QUE ESTE ARCHIVO NO EXISTIA Y AHORA SI. El guardrail es el unico control
// automatico que protege el CONTRATO del marco —los specs vivos— de perderse en
// un archive, y llego a la version 1 sin una sola prueba. La auditoria de cierre
// de v1 dejo el hallazgo abierto con la frase exacta: "no existe ningun check
// que compare el delta ARCHIVADO contra el spec vivo".
//
// LA MEDICION QUE ORIGINO EL ARCHIVO. En la rama fix/spec-cobertura-coherente,
// donde el unico cambio de spec vive DENTRO de `changes/archive/`, el guardrail
// salia EXIT 0 imprimiendo "ningun MODIFIED perderia requirements ni
// escenarios" — habiendo comparado CERO deltas, porque su recorrido excluye la
// carpeta archive y en esa rama no queda ningun change activo. Un verde que no
// midio nada es indistinguible de un verde que midio todo, y la coherencia
// entre el delta archivado y el spec vivo quedaba sostenida por un md5 que
// alguien corrio a mano una vez.
//
// Los dos huecos que este banco fija, y son distintos:
//   1. el ARCHIVE no se comparaba con nada;
//   2. el verde no decia cuanto habia comparado.
//
//   node --test actions/guardrail-deltas/pruebas/
import test, { after } from "node:test";
import assert from "node:assert/strict";
import { arbol, correr, delta, limpiar, requirement, specVivo } from "./ayuda.mjs";

after(limpiar);

const REQ = "El sistema promete algo verificable";
const OTRO = "El sistema promete otra cosa";

// ── Lo que ya hacia: los deltas ACTIVOS ────────────────────────────────────

test("un MODIFIED activo que pierde un escenario del spec vivo es ROJO", () => {
  const raiz = arbol({
    specs: { cap: specVivo(requirement(REQ, ["el caso A", "el caso B"])) },
    activos: { ahora: { cap: delta("MODIFIED", requirement(REQ, ["el caso A"])) } },
  });
  const r = correr(raiz);
  assert.equal(r.codigo, 1, r.todo);
  assert.match(r.stderr, /perdería 1 escenario/);
  assert.match(r.stderr, /el caso B/);
});

test("un MODIFIED activo cuyo requirement no existe en el vivo es ROJO (huerfano)", () => {
  const raiz = arbol({
    specs: { cap: specVivo(requirement(REQ, ["el caso A"])) },
    activos: { ahora: { cap: delta("MODIFIED", requirement(OTRO, ["el caso A"])) } },
  });
  const r = correr(raiz);
  assert.equal(r.codigo, 1, r.todo);
  assert.match(r.stderr, /no existe en el spec vigente/);
});

test("un MODIFIED activo que reproduce todos los escenarios pasa", () => {
  const raiz = arbol({
    specs: { cap: specVivo(requirement(REQ, ["el caso A", "el caso B"])) },
    activos: {
      ahora: { cap: delta("MODIFIED", requirement(REQ, ["el caso A", "el caso B", "el caso C"])) },
    },
  });
  assert.equal(correr(raiz).codigo, 0);
});

// ── EL HUECO 1: el delta ARCHIVADO contra el spec vivo ─────────────────────
//
// El modo de falla real no es teorico. `openspec archive` en Windows dice
// "Specs updated successfully" y hace rollback sin aplicar nada (esta anotado
// como gotcha del CLI): el change queda movido al archive y el spec vivo, sin
// tocar. Nada lo detectaba, y el delta archivado es historia inmutable, asi que
// el contrato quedaba prometiendo algo que ningun spec vivo dice.

test("un requirement ADDED por un change ARCHIVADO que no llego al spec vivo es ROJO", () => {
  const raiz = arbol({
    specs: { cap: specVivo(requirement(REQ, ["el caso A"])) },
    archivados: { "2026-01-01-viejo": { cap: delta("ADDED", requirement(OTRO, ["el caso Z"])) } },
  });
  const r = correr(raiz);
  assert.equal(r.codigo, 1, r.todo);
  assert.match(r.stderr, /2026-01-01-viejo/);
  assert.match(r.stderr, /no llegó al spec vigente/);
  assert.match(r.stderr, new RegExp(OTRO));
});

test("un escenario de un change ARCHIVADO que no esta en el spec vivo es ROJO", () => {
  const raiz = arbol({
    specs: { cap: specVivo(requirement(REQ, ["el caso A"])) },
    archivados: {
      "2026-01-01-viejo": { cap: delta("MODIFIED", requirement(REQ, ["el caso A", "el caso B"])) },
    },
  });
  const r = correr(raiz);
  assert.equal(r.codigo, 1, r.todo);
  assert.match(r.stderr, /el caso B/);
});

test("un change ARCHIVADO aplicado de verdad pasa", () => {
  const raiz = arbol({
    specs: { cap: specVivo(requirement(REQ, ["el caso A", "el caso B"])) },
    archivados: {
      "2026-01-01-viejo": { cap: delta("MODIFIED", requirement(REQ, ["el caso A", "el caso B"])) },
    },
  });
  assert.equal(correr(raiz).codigo, 0);
});

test("un spec vivo que ya no existe delata un archive a medio aplicar", () => {
  const raiz = arbol({
    specs: {},
    archivados: { "2026-01-01-viejo": { cap: delta("ADDED", requirement(REQ, ["el caso A"])) } },
  });
  const r = correr(raiz);
  assert.equal(r.codigo, 1, r.todo);
  assert.match(r.stderr, /el spec vigente de la capability/);
});

// ── LOS FALSOS POSITIVOS QUE HARIAN INSERVIBLE AL CHECK ────────────────────
//
// El archive es HISTORIA: un change posterior puede dar de baja o retitular lo
// que un change anterior agrego, y eso es legitimo. Sin resolver esas dos
// salidas, el check enrojeceria para siempre sobre historia correcta — que es
// el rojo permanente que ningun equipo tolera, y la razon por la que este
// chequeo no se habia escrito.

test("un requirement archivado que un change POSTERIOR dio de baja no es rojo", () => {
  const raiz = arbol({
    specs: { cap: specVivo(requirement(REQ, ["el caso A"])) },
    archivados: {
      "2026-01-01-viejo": { cap: delta("ADDED", requirement(OTRO, ["el caso Z"])) },
      "2026-02-01-nuevo": { cap: delta("REMOVED", requirement(OTRO, [])) },
    },
  });
  assert.equal(correr(raiz).codigo, 0, correr(raiz).todo);
});

test("un requirement archivado que un change POSTERIOR retitulo no es rojo", () => {
  const raiz = arbol({
    specs: { cap: specVivo(requirement("El titulo nuevo", ["el caso Z"])) },
    archivados: {
      "2026-01-01-viejo": { cap: delta("ADDED", requirement(OTRO, ["el caso Z"])) },
      "2026-02-01-nuevo": {
        cap:
          "# Delta\n\n## RENAMED Requirements\n\n" +
          `- FROM: \`### Requirement: ${OTRO}\`\n- TO: \`### Requirement: El titulo nuevo\`\n`,
      },
    },
  });
  const r = correr(raiz);
  assert.equal(r.codigo, 0, r.todo);
});

test("un delta archivado sin carpeta specs no rompe el recorrido", () => {
  const raiz = arbol({
    specs: { cap: specVivo(requirement(REQ, ["el caso A"])) },
    archivados: {},
  });
  assert.equal(correr(raiz).codigo, 0);
});

// ── EL HUECO 2: el verde mudo ──────────────────────────────────────────────

test("el verde dice cuantos deltas y cuantos requirements comparo", () => {
  const raiz = arbol({
    specs: { cap: specVivo(requirement(REQ, ["el caso A"])) },
    activos: { ahora: { cap: delta("MODIFIED", requirement(REQ, ["el caso A"])) } },
    archivados: { "2026-01-01-viejo": { cap: delta("ADDED", requirement(REQ, ["el caso A"])) } },
  });
  const r = correr(raiz);
  assert.equal(r.codigo, 0, r.todo);
  assert.match(r.stdout, /1 delta\(s\) activo\(s\)/);
  assert.match(r.stdout, /1 delta\(s\) archivado\(s\)/);
  assert.match(r.stdout, /2 requirement\(s\)/);
});

test("un arbol SIN un solo delta lo dice, en vez de afirmar que nada se perderia", () => {
  const raiz = arbol({ specs: { cap: specVivo(requirement(REQ, ["el caso A"])) } });
  const r = correr(raiz);
  assert.equal(r.codigo, 0, r.todo);
  // El mensaje que habia decia "ningun MODIFIED perderia requirements ni
  // escenarios" habiendo comparado cero. Ahora la corrida no puede hacer pasar
  // por medicion lo que fue una carpeta vacia.
  assert.match(r.stdout, /no hay ningún delta que comparar/i);
});

// ── Y el repositorio de verdad ─────────────────────────────────────────────

test("el propio repositorio del marco pasa, y compara mas de cero", () => {
  const r = correr("", {
    OPENSPEC_CHANGES: new URL("../../../openspec/changes", import.meta.url).pathname.replace(
      /^\/([A-Za-z]:)/,
      "$1"
    ),
    OPENSPEC_SPECS: new URL("../../../openspec/specs", import.meta.url).pathname.replace(
      /^\/([A-Za-z]:)/,
      "$1"
    ),
  });
  assert.equal(r.codigo, 0, r.todo);
  assert.doesNotMatch(r.stdout, /no hay ningún delta que comparar/i);
});
