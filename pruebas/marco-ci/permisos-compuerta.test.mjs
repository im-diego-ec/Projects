// Banco de la COMPUERTA del paso "Permisos del agente sin escritura" de marco-ci.yml.
//
// QUE CIERRA. El paso ya leia tres superficies —el archivo de ajustes, el
// `allowed-tools:` del frontmatter de una skill y el `tools:` de un agente— pero la
// segunda y la tercera salian SIEMPRE en amarillo. Medido sobre el arbol real: 30
// entradas que autorizan una escritura (`Bash(gh:*)` habilita gh pr merge, gh release
// create y gh api -X DELETE; `Bash(git:*)` habilita git push --force) y exit 0. Un
// allowlist que se MIRA y no DETIENE no es una compuerta, y la condicion que el
// comentario dejaba escrita para invertirlo —"cuando el paso deje de imprimir avisos
// de frontmatter en el marco"— dependia justo de la mitad del arreglo que no se hizo.
//
// LA PARTICION QUE SE INTRODUJO, y es lo que este banco fija: el frontmatter es
// COMPUERTA en el repo que DISTRIBUYE el marco y sigue siendo aviso en un consumidor.
// La regla del marco sobre endurecimientos protege a los consumidores de un rojo que
// nadie les anuncio; no protege al repo que escribe la linea. Es el mismo argumento
// con el que el check del CHANGELOG y el del slug literal salieron en rojo el primer
// dia.
//
// La sonda del distribuidor es la misma de siempre —archivos rastreados, no nombres—
// y su direccion de error es segura: mentir diciendo "soy el distribuidor" solo compra
// un rojo mas estricto.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { scriptDelPaso, RAIZ } from "./extraer.mjs";
import { repoDeJuguete, escribir, commit, correrBash, limpiarTodo } from "./util.mjs";

const PASO = "Permisos del agente sin escritura";
const script = scriptDelPaso(PASO);

// Las mismas tres claves que el paso declara en su bloque `env:`.
const ENV = {
  RUTA_ALLOWLIST: ".claude/settings.json",
  RUTA_VALORES: ".projects-valores.json",
  RUTA_DESVIOS: ".projects-desvios.json",
};

// Una skill con el permiso que motivo todo esto. `Bash(gh:*)` deja el subcomando en
// comodin, o sea que autoriza `gh pr merge`, `gh release create` y `gh api -X DELETE`.
const SKILL_CON_ESCRITURA = [
  "---",
  "name: una-skill",
  "allowed-tools: Bash(git:*), Bash(gh:*), Read",
  "---",
  "",
  "cuerpo",
  "",
].join("\n");

const SKILL_ACOTADA = [
  "---",
  "name: una-skill",
  "allowed-tools: Bash(git status), Bash(git diff:*), Read",
  "---",
  "",
  "cuerpo",
  "",
].join("\n");

// Los dos archivos que hacen distribuidor a un repo (mas la ausencia del tercero).
function marcasDeDistribuidor(raiz) {
  escribir(raiz, "plantilla/.github/workflows/ci.yml", "name: ci\n");
  escribir(raiz, "actions/constitucion/action.yml", "name: constitucion\n");
}

function repo({ distribuidor, skill = SKILL_CON_ESCRITURA, desvios = null }) {
  const raiz = repoDeJuguete(distribuidor ? "permisos-distribuidor-" : "permisos-consumidor-");
  escribir(raiz, ".claude/skills/una-skill/SKILL.md", skill);
  if (distribuidor) marcasDeDistribuidor(raiz);
  if (desvios) escribir(raiz, ".projects-desvios.json", JSON.stringify(desvios, null, 2));
  commit(raiz, "estado inicial");
  return raiz;
}

const correr = (cwd, guion = script) => correrBash(guion, { cwd, env: ENV });

test.after(limpiarTodo);

// ── LO QUE ESTE BANCO EXISTE PARA FIJAR ────────────────────────────────────
test("permisos · en el DISTRIBUIDOR, Bash(gh:*) en el frontmatter pone el job ROJO", () => {
  const { exit, salida } = correr(repo({ distribuidor: true }));
  assert.equal(
    exit,
    1,
    "en el repo que distribuye el marco un permiso de escritura del frontmatter tiene que " +
      `DETENER, no avisar:\n${salida}`,
  );
  // El titulo se mira porque distingue las dos severidades, que es justo lo que se
  // esta fijando: el mismo hallazgo salia con el titulo del aviso.
  assert.match(salida, /Permiso de escritura sin desvio declarado/, salida);
  assert.doesNotMatch(
    salida,
    /Permiso de escritura declarado en el frontmatter/,
    `en el distribuidor esta clase ya no puede salir en amarillo:\n${salida}`,
  );
});

test("permisos · en un CONSUMIDOR, el mismo frontmatter sigue en AVISO y el job termina verde", () => {
  const { exit, salida } = correr(repo({ distribuidor: false }));
  assert.equal(
    exit,
    0,
    "un consumidor no puede recibir un rojo nuevo sin que nadie se lo anuncie: es la regla del " +
      `marco sobre endurecimientos.\n${salida}`,
  );
  assert.match(salida, /Permiso de escritura declarado en el frontmatter/, salida);
});

// El distribuidor tiene salida, y es la que el propio mensaje ofrece: acotar la
// entrada. Sin este caso, el rojo de arriba podria ser un rojo permanente.
test("permisos · en el DISTRIBUIDOR, acotar las entradas devuelve el verde", () => {
  const { exit, salida } = correr(repo({ distribuidor: true, skill: SKILL_ACOTADA }));
  assert.equal(exit, 0, `un allowlist acotado no puede seguir rojo:\n${salida}`);
});

// La otra salida declarada por el propio mensaje: declarar el desvio con su motivo.
test("permisos · en el DISTRIBUIDOR, un desvio con motivo escrito absorbe el hallazgo", () => {
  const raiz = repo({
    distribuidor: true,
    desvios: {
      desvios: [
        { permiso: "Bash(git:*)", motivo: "la skill del release mueve tags", aprobado_por: "quien-sea" },
        { permiso: "Bash(gh:*)", motivo: "la skill del release publica el release", aprobado_por: "quien-sea" },
      ],
    },
  });
  const { exit, salida } = correr(raiz);
  assert.equal(exit, 0, `un desvio con motivo escrito tiene que absorber el hallazgo:\n${salida}`);
  assert.match(salida, /Permiso de escritura con desvio declarado/, salida);
});

// ── MUTACION: se rompe la particion y se comprueba que el rojo desaparece ───
test("permisos · MUTACION · si el frontmatter vuelve a ser aviso en todas partes, el distribuidor sale verde", () => {
  const ancla = 'const FRONTMATTER_ES_COMPUERTA = process.env.ES_DISTRIBUIDOR === "true";';
  assert.ok(script.includes(ancla), "el ancla de la mutacion ya no esta en el paso");
  const mutado = script.replace(ancla, "const FRONTMATTER_ES_COMPUERTA = false;");

  const raiz = repo({ distribuidor: true });
  const sano = correr(raiz);
  const roto = correr(raiz, mutado);

  assert.equal(sano.exit, 1, `el paso sano tiene que detener:\n${sano.salida}`);
  assert.equal(
    roto.exit,
    0,
    "con la particion rota, el MISMO repo tendria que volver a salir verde con el permiso a la " +
      `vista: si no, no era esa linea la que producia el rojo.\n${roto.salida}`,
  );
  assert.match(roto.salida, /Permiso de escritura declarado en el frontmatter/, roto.salida);
});

// ── Sobre el ARBOL REAL, y la asercion esta escrita para no pudrirse ───────
// No se afirma un numero de hallazgos: ese numero baja en cuanto alguien acote los
// allowed-tools del marco, y un banco que se pone rojo cuando el arbol MEJORA ensena
// a ignorarlo. Lo que se afirma es la propiedad: en este repo —que es el
// distribuidor— esta clase no puede salir en amarillo, y si hay hallazgos el paso
// tiene que estar en rojo.
test("permisos · el arbol real de este repo es el distribuidor: el frontmatter no sale en amarillo", () => {
  const { exit, salida } = correrBash(script, { cwd: RAIZ, env: ENV });
  assert.doesNotMatch(
    salida,
    /Permiso de escritura declarado en el frontmatter/,
    "este repo distribuye el marco, asi que un permiso de escritura de un frontmatter tiene que " +
      `salir como ::error::, no como ::warning::\n${salida}`,
  );
  const hayHallazgos = /Permiso de escritura sin desvio declarado/.test(salida);
  assert.equal(
    exit,
    hayHallazgos ? 1 : 0,
    `el codigo de salida no coincide con lo que el paso reporto:\n${salida}`,
  );
});

// Control de que la particion la decide la sonda y no otra cosa: el workflow tiene que
// calcular ES_DISTRIBUIDOR dentro del propio paso y pasarselo al programa.
test("permisos · la severidad la decide la sonda por archivos, no un nombre", () => {
  const texto = readFileSync(
    new URL("../../.github/workflows/marco-ci.yml", import.meta.url),
    "utf8",
  );
  assert.match(
    texto,
    /ES_DISTRIBUIDOR="\$\{ES_DISTRIBUIDOR\}" \\/,
    "el paso tiene que pasarle la respuesta de la sonda al programa que clasifica los permisos",
  );
  assert.match(
    script,
    /git ls-files --error-unmatch -- plantilla\/\.github\/workflows\/ci\.yml/,
    "la sonda de este paso tiene que mirar archivos rastreados",
  );
});
