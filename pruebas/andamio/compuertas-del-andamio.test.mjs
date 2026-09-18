// LAS COMPUERTAS DEL ANDAMIO QUE NINGUN BANCO EJERCITABA.
//
// POR QUE ESTE BANCO EXISTE. Hasta el change `rojo-primero`, el censo de los pasos sin
// banco (`pruebas/marco-ci/cobertura-de-los-pasos.test.mjs`) miraba solo marco-ci.yml. Lo
// que el marco REPARTE en `plantilla/.github/workflows/` no lo miraba nadie, y ahi viven
// compuertas que viajan a cada proyecto nacido del andamio y corren en cada uno de sus
// pipelines. Al abrir el censo a esa superficie aparecieron sin banco las de este archivo.
//
// LO QUE HABRIA PASADO SIN ESTO: cualquiera podia romper el conteo de scripts por paquete,
// o el veredicto que el ruleset de cada proyecto exige, y el proyecto se enteraba en su
// propio pipeline. Un paso del andamio roto no se descubre en el marco: se descubre en el
// repositorio de otro, y ademas no llega solo — el andamio se copia una vez.
//
// Viene de Rigel (2.0.0, change `censo-honesto`, commit 64f6ebd de alla), que banco cinco;
// aca son cuatro de esos —la credencial de la App no existe en este andamio, que sigue con
// Dependabot— mas el veredicto del andamio, que alla ya tenia banco y aca no.
//
// EL PATRON es el de los demas bancos de pasos: se EXTRAE el script del YAML con
// `scriptDelPaso` y se corre de verdad, con el entorno inyectado. Mirar el texto del
// workflow prueba que el YAML dice algo, no que haga algo.
import test from "node:test";
import assert from "node:assert/strict";
import { chmodSync, existsSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { pasosDe, scriptDelPaso } from "../marco-ci/extraer.mjs";
import { carpetaTemporal, commit, correrBash, escribir, limpiarTodo, repoDeJuguete } from "../marco-ci/util.mjs";
import { porque } from "../porque.mjs";

const RAIZ = join(fileURLToPath(new URL(".", import.meta.url)), "..", "..");
const ACTUALIZAR = join(RAIZ, "plantilla", ".github", "workflows", "actualizar-marco.yml");
const CI = join(RAIZ, "plantilla", ".github", "workflows", "ci.yml");
const CLAUDE_ANDAMIO = join(RAIZ, "plantilla", ".github", "workflows", "claude.yml");
const CLAUDE_MARCO = join(RAIZ, ".github", "workflows", "claude.yml");

test.after(limpiarTodo);

function ejecutable(ruta, lineas) {
  writeFileSync(ruta, ["#!/bin/sh", ...lineas, ""].join("\n"));
  chmodSync(ruta, 0o755);
}

// ---------------------------------------------------------------------------
// (1) EL ARBOL ARRANCA LIMPIO — lo que hace legitimo el `git add -A` del bump
// ---------------------------------------------------------------------------

const ARBOL_LIMPIO = "El arbol arranca limpio";

function clonRecien() {
  const raiz = repoDeJuguete("andamio-arbol-");
  escribir(raiz, "a.txt", "commiteado\n");
  commit(raiz, "base");
  return raiz;
}

test("arbol limpio · ROJO: un arbol sucio recien clonado se denuncia, muestra QUE lo ensucia y nombra el fin de linea", () => {
  // Si el arbol sale sucio del clon, el commit del bump se llevaria ruido ajeno sin que
  // nadie lo mire. La causa mas probable es el fin de linea, y el mensaje tiene que decirlo.
  const raiz = clonRecien();
  escribir(raiz, "sin-rastrear.txt", "ruido\n");
  const res = correrBash(scriptDelPaso(ARBOL_LIMPIO, ACTUALIZAR), { cwd: raiz });
  assert.equal(res.exit, 1, porque("un arbol sucio no puede pasar", res.salida));
  assert.match(res.salida, /sin-rastrear\.txt/);
  assert.match(res.salida, /::error::.*fin de linea.*eol=lf/);
});

test("arbol limpio · ROJO: un archivo rastreado y modificado tambien ensucia", () => {
  const raiz = clonRecien();
  escribir(raiz, "a.txt", "commiteado\r\n");
  const res = correrBash(scriptDelPaso(ARBOL_LIMPIO, ACTUALIZAR), { cwd: raiz });
  assert.equal(res.exit, 1, porque("un rastreado modificado es un arbol sucio", res.salida));
  assert.match(res.salida, /a\.txt/);
});

test("arbol limpio · VERDE de control: un arbol limpio pasa sin ruido", () => {
  // Sin este caso la comprobacion podria estar siempre roja y nadie lo notaria.
  const res = correrBash(scriptDelPaso(ARBOL_LIMPIO, ACTUALIZAR), { cwd: clonRecien() });
  assert.equal(res.exit, 0, porque("un arbol limpio no puede salir rojo", res.salida));
  assert.doesNotMatch(res.salida, /::error::/);
});

// ---------------------------------------------------------------------------
// (2) TODO PAQUETE DECLARA LOS SCRIPTS DE VERIFICACION
// ---------------------------------------------------------------------------

const DECLARA = "Todo paquete declara los scripts de verificacion";

/**
 * Un workspace de mentira: los paquetes con sus scripts y un `pnpm` que devuelve la lista
 * como `pnpm list -r --depth -1 --json`, incluida la raiz. Sin ese pnpm el banco mediria la
 * ausencia de pnpm y no la compuerta.
 */
function workspace(paquetes) {
  // La ruta REAL: el paso compara contra process.cwd(), que la devuelve resuelta, y en macOS
  // el temporal cuelga de un enlace (/var -> /private/var). Con la ruta sin resolver, la
  // raiz dejaba de reconocerse como raiz y el banco media su propio andamiaje.
  const raiz = realpathSync(carpetaTemporal("andamio-paquetes-"));
  const lista = [{ name: "raiz", path: raiz }];
  for (const [carpeta, scripts] of Object.entries(paquetes)) {
    escribir(raiz, `${carpeta}/package.json`, JSON.stringify({ name: carpeta, scripts }, null, 2));
    lista.push({ name: carpeta, path: join(raiz, carpeta) });
  }
  const bin = carpetaTemporal("stub-pnpm-");
  ejecutable(join(bin, "pnpm"), ["cat <<'JSON'", JSON.stringify(lista), "JSON"]);
  return { raiz, PATH: `${bin}:${process.env.PATH}` };
}

// `scriptDelPaso` extrae el `run:`, no el `env:` del paso. SCRIPTS y EXCEPCIONES son la
// DEFINICION del pipeline que el paso trae en su env, y se inyectan aca.
function declara(paquetes, { scripts = "typecheck test build", excepciones = "" } = {}) {
  const ws = workspace(paquetes);
  const res = correrBash(scriptDelPaso(DECLARA, CI), {
    cwd: ws.raiz,
    env: { PATH: ws.PATH, SCRIPTS: scripts, EXCEPCIONES: excepciones },
  });
  return { ...res, raiz: ws.raiz };
}

const COMPLETO = { typecheck: "tsc", test: "vitest", build: "tsc -b" };

test("declara · ROJO: un paquete que no declara un script exigido se denuncia con el paquete y el script", () => {
  // Un paquete sin sus scripts pasaria en verde SIN haberse verificado: el pipeline cree
  // que corrio algo y no corrio nada.
  const res = declara({ "paquetes/api": COMPLETO, "paquetes/web": { typecheck: "tsc", build: "vite build" } });
  assert.equal(res.exit, 1, porque("un paquete sin sus scripts no puede pasar", res.salida));
  assert.match(res.salida, /paquetes\/web\/package\.json -> falta el script "test"/);
  assert.match(res.salida, /::error::hay paquetes que no declaran un script/);
});

test("declara · ROJO: una excepcion que no corresponde a ningun paquete es una excepcion muerta", () => {
  const res = declara({ "paquetes/api": COMPLETO }, { excepciones: "paquetes/e2e:test" });
  assert.equal(res.exit, 1, porque("una excepcion muerta tapa un agujero que ya nadie ve", res.salida));
  assert.match(res.salida, /estas excepciones no corresponden a ningun paquete del workspace: paquetes\/e2e:test/);
});

test("declara · ROJO: una excepcion mal escrita se denuncia con el formato", () => {
  const res = declara({ "paquetes/api": COMPLETO }, { excepciones: "paquetes/api" });
  assert.equal(res.exit, 1, porque("una excepcion sin script no se puede aplicar", res.salida));
  assert.match(res.salida, /hay excepciones mal escritas: paquetes\/api/);
});

test("declara · ROJO: un workspace sin paquetes no se verifica en verde", () => {
  const res = declara({});
  assert.equal(res.exit, 1, porque("sin paquetes no se verifico nada", res.salida));
  assert.match(res.salida, /pnpm no reporto ningun paquete ademas de la raiz/);
});

test("declara · ROJO: SCRIPTS vacio no es un pipeline", () => {
  const res = declara({ "paquetes/api": COMPLETO }, { scripts: "" });
  assert.equal(res.exit, 1, porque("sin scripts exigidos no hay nada que verificar", res.salida));
  assert.match(res.salida, /SCRIPTS quedo vacio/);
});

test("declara · VERDE: todos con sus scripts, y una excepcion vigente se respeta y se nombra", () => {
  const res = declara(
    { "paquetes/api": COMPLETO, "paquetes/e2e": { typecheck: "tsc" } },
    { excepciones: "paquetes/e2e:test paquetes/e2e:build" },
  );
  assert.equal(res.exit, 0, porque("un workspace completo no puede salir rojo", res.salida));
  assert.match(res.salida, /excepcion declarada y vigente: paquetes\/e2e:test/);
  assert.match(res.salida, /plan: 4 verificaciones/);
});

// ---------------------------------------------------------------------------
// (3) VERIFICAR CADA PAQUETE — que el fallo de UNO no se pierda
// ---------------------------------------------------------------------------

const VERIFICAR = "Verificar cada paquete";

function verificar({ plan, falla = null }) {
  const raiz = carpetaTemporal("andamio-verificar-");
  for (const par of plan) escribir(raiz, `${par.split(":")[0]}/package.json`, "{}\n");
  const runnerTemp = carpetaTemporal("runner-plan-");
  writeFileSync(join(runnerTemp, "plan-verificacion.txt"), `${plan.join("\n")}\n`);
  // Un `pnpm` que anota en que paquete lo corrieron y falla en el que se le pida.
  const bin = carpetaTemporal("stub-pnpm-verificar-");
  const corridas = join(runnerTemp, "corridas.txt");
  ejecutable(join(bin, "pnpm"), [
    `printf '%s %s\\n' "$(basename "$(pwd)")" "$*" >> "${corridas}"`,
    falla ? `case "$(pwd)" in */${falla}) echo "fallo ${falla}" >&2; exit 1 ;; esac` : ":",
    "exit 0",
  ]);
  const res = correrBash(scriptDelPaso(VERIFICAR, CI), { cwd: raiz, env: { PATH: `${bin}:${process.env.PATH}`, RUNNER_TEMP: runnerTemp } });
  return { ...res, corridas: existsSync(corridas) ? readFileSync(corridas, "utf8") : "" };
}

test("verificar · ROJO: si la verificacion de un paquete falla, el paso falla y dice como reproducirlo", () => {
  // El modo de falla que este caso cierra es el peor de un bucle en bash: devolver el
  // codigo del ULTIMO comando. Un paquete roto en el medio saldria verde.
  const res = verificar({ plan: ["paquetes/api:typecheck", "paquetes/web:typecheck", "paquetes/api:test"], falla: "web" });
  assert.equal(res.exit, 1, porque("el fallo de un paquete tiene que llegar al codigo de salida", res.salida));
  assert.match(res.salida, /::error::fallo 'typecheck' en el paquete 'paquetes\/web'\. Reproducilo local con: cd paquetes\/web && pnpm run typecheck/);
});

test("verificar · VERDE de control: todos los paquetes pasan y el paso tambien", () => {
  const res = verificar({ plan: ["paquetes/api:typecheck", "paquetes/web:typecheck"] });
  assert.equal(res.exit, 0, porque("un plan que pasa entero no puede salir rojo", res.salida));
});

// ---------------------------------------------------------------------------
// (4) EL VEREDICTO DEL ANDAMIO — el check que el ruleset de cada proyecto exige
// ---------------------------------------------------------------------------

/**
 * El script del Veredicto con las expresiones `${{ needs.* }}` sustituidas. GitHub las
 * resuelve antes de correr y bash no puede. Lo que no se nombra queda VACIO: un `needs` que
 * el caso no declara no puede quedar como el texto `${{ ... }}`, porque compararlo contra
 * "success" daria falso por el motivo equivocado.
 */
function veredicto(valores) {
  let script = scriptDelPaso("Veredicto", CI);
  for (const [clave, valor] of Object.entries(valores)) script = script.split(`\${{ ${clave} }}`).join(valor);
  script = script.replace(/\$\{\{[^}]*\}\}/g, "");
  return correrBash(script, { cwd: carpetaTemporal("veredicto-andamio-") });
}

const TODO_BIEN = {
  "needs.marco.result": "success",
  "needs.constitucion.result": "success",
  // El job `formato` lo sumo el change el-andamio-nace-formateado: corre en los dos
  // carriles y el Veredicto no le acepta `skipped` (ver el caso ROJO de abajo).
  "needs.formato.result": "success",
  "needs.build_test.result": "success",
  "needs.marco.outputs.solo_docs": "false",
};

test("veredicto del andamio · VERDE: los cuatro jobs en success", () => {
  const res = veredicto(TODO_BIEN);
  assert.equal(res.exit, 0, porque("con todo en verde el veredicto pasa", res.salida));
});

for (const [job, valor, motivo] of [
  ["needs.marco.result", "failure", /el CI de marco fallo/],
  ["needs.marco.result", "skipped", /el CI de marco fallo/],
  ["needs.constitucion.result", "skipped", /la verificacion de la constitucion del marco termino en 'skipped'/],
  ["needs.build_test.result", "failure", /build-test termino en 'failure'/],
  ["needs.formato.result", "skipped", /el formateador termino en 'skipped'/],
  ["needs.formato.result", "failure", /el formateador termino en 'failure'/],
]) {
  test(`veredicto del andamio · ROJO: ${job} en ${valor}`, () => {
    // Un job que no corrio no verifico nada: "skipped" es rojo salvo donde el carril de
    // docs lo justifica, y eso lo fija el caso de abajo.
    const res = veredicto({ ...TODO_BIEN, [job]: valor });
    assert.equal(res.exit, 1, porque(`${job}=${valor} no puede dar un veredicto verde`, res.salida));
    assert.match(res.salida, motivo);
  });
}

test("veredicto del andamio · build-test salteado: verde SOLO en el carril de docs", () => {
  const docs = veredicto({ ...TODO_BIEN, "needs.build_test.result": "skipped", "needs.marco.outputs.solo_docs": "true" });
  assert.equal(docs.exit, 0, porque("en el carril de docs el salteo es a proposito", docs.salida));
  assert.match(docs.salida, /solo docs: build-test omitido a proposito/);
  const codigo = veredicto({ ...TODO_BIEN, "needs.build_test.result": "skipped", "needs.marco.outputs.solo_docs": "false" });
  assert.equal(codigo.exit, 1, porque("un build-test salteado fuera del carril de docs es un fail-open", codigo.salida));
});

// ---------------------------------------------------------------------------
// (5) EL BOT CONFIGURADO — en el andamio Y en el CI propio del marco, que es el mismo paso
// ---------------------------------------------------------------------------

const BOT = "Verificar que el bot esta configurado";

for (const [donde, ruta] of [
  ["el andamio", CLAUDE_ANDAMIO],
  ["el marco", CLAUDE_MARCO],
]) {
  test(`bot (${donde}) · ROJO: sin el token, el paso falla y nombra el secret y los dos actos humanos`, () => {
    // Alguien menciono a @claude y no hay con que autenticarse. Salir en verde dejaria la
    // mencion sin respuesta y sin rastro.
    const res = correrBash(scriptDelPaso(BOT, ruta), { cwd: carpetaTemporal("bot-") });
    assert.equal(res.exit, 1, porque("sin token el paso tiene que ser rojo", res.salida));
    assert.match(res.salida, /::error::falta el secret CLAUDE_CODE_OAUTH_TOKEN.*\(1\) instalar la GitHub App.*\(2\) cargar el secret/);
  });

  test(`bot (${donde}) · el rojo corre SOLO cuando el token falta: la condicion es la del secret`, () => {
    // El script sale 1 siempre que corre; lo que decide si corre es su `if:`, y el `if:`
    // lee un booleano que el env del job deriva del secret. Es una lectura del YAML y no una
    // ejecucion —GitHub evalua el `if:`, no bash—, y por eso va separada del caso de arriba.
    const paso = pasosDe(ruta).find((p) => p.nombre === BOT);
    assert.equal(paso?.condicion, "env.TOKEN_CONFIGURADO != 'true'", porque("el if: del paso tiene que ser el del token", paso));
    const texto = readFileSync(ruta, "utf8");
    assert.match(texto, /^\s+TOKEN_CONFIGURADO: \$\{\{ secrets\.CLAUDE_CODE_OAUTH_TOKEN != '' \}\}$/m);
  });
}
