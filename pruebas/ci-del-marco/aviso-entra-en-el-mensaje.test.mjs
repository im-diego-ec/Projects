// Banco de herramientas/aviso-entra-en-el-mensaje.mjs
//
//   node --test pruebas/ci-del-marco/aviso-entra-en-el-mensaje.test.mjs
//
// La compuerta se prueba en LAS DOS DIRECCIONES, y hay tres casos que la justifican:
//
//  · «LA ENTRADA ENORME SIN RESUMEN» — la forma exacta del [No publicado] de este
//    repo el 2026-09-17: 40488 caracteres de cuerpo, sin `### Para consumidores`,
//    que el aviso armaba en 41091 y entregaba recortado a 3451 — el principio de la
//    entrada y un enlace. Si esa forma saliera verde, la compuerta no sirve para lo
//    que se porto.
//  · «EL PR DE RELEASE» — el hueco que Rigel (el marco del que Projects se bifurco)
//    midio el 2026-09-03 cortando su 1.17.2: la compuerta leia siempre
//    `[No publicado]`, que en ese PR acaba de vaciarse, asi que media el sobre vacio
//    y salia verde en el unico PR donde el texto ya es final. Por eso se porta en su
//    forma corregida y no en la original.
//  · «EL CONSEJO AL REVES» — el `::error::` no puede mandar a acortar una seccion que
//    no existe. Van los dos colores del mismo predicado —ausente y presente— porque
//    sin el segundo no se distingue arreglar el consejo de romper la deteccion.
//
// Y el caso de EXACTITUD, que es el que sostiene la promesa del archivo: el largo que
// reporta la compuerta tiene que ser el MISMO que el del payload que la action escribe
// de verdad, con el limite que la action usa de verdad. Sin esa asercion, «usa el
// pipeline real» es una frase.
//
// CADA DIALECTO QUE LA ACTION ACEPTA. Hasta el lote 36 del porte el aviso mandaba
// Markdown tal cual y cada seccion se media una vez. Desde que aprende mrkdwn (el de
// Slack), la conversion cambia el largo —una tabla se vuelve lista etiquetada y crece,
// una negrita pierde dos asteriscos y achica—, asi que pasar en markdown no prueba nada
// sobre un destino que declaro mrkdwn. Los casos que antes contaban UN hallazgo de
// recorte ahora cuentan uno por dialecto, y los largos se leen por dialecto: el cambio
// de esas aserciones es el cambio de la compuerta, no una tolerancia nueva.

import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import * as laAction from "../../actions/aviso-version/aviso-version.mjs";
import { SIN_TRADUCCION, TOPE_DE_JERGA_ENTRE_BACKTICKS } from "../docs/lectura.mjs";
import { scriptDelPaso } from "../marco-ci/extraer.mjs";
import {
  ENTRADA_SIN_PUBLICAR,
  PLACEHOLDER_SIN_CAMBIOS,
  esPlaceholderConCambios,
  main,
  medir,
  versionMasAlta,
} from "../../herramientas/aviso-entra-en-el-mensaje.mjs";

const { LIMITE_POR_DEFECTO, main: mainDelAviso } = laAction;
/** Los dialectos que la action acepta. Si la action no los exporta todavia, el banco
 *  mide contra el unico que existia, y los casos nuevos caen por su propia razon. */
const FORMATOS = laAction.FORMATOS ?? ["markdown"];

const RAIZ = join(import.meta.dirname, "..", "..");
const CHANGELOG_REAL = join(RAIZ, "CHANGELOG.md");

const changelogCon = (seccion) =>
  ["# Changelog", "", `## [${ENTRADA_SIN_PUBLICAR}]`, "", "### Para consumidores", "", seccion, "", "### Añadido", "", "- algo", ""].join("\n");

/** El changelog tal como queda DESPUES del paso 1 del release: `[No publicado]` en su
 *  placeholder y la seccion que se va a mandar ya bajo su version.
 *
 *  El `[No publicado]` LLEVA su «Para consumidores» con el texto de fabrica, que es lo
 *  que el paso 1 de `.claude/skills/projects-release/SKILL.md` manda escribir. El texto
 *  sale de `PLACEHOLDER_SIN_CAMBIOS` y no de una copia a mano, para que este fixture no
 *  pueda quedar describiendo un paso 1 que ya no existe. Quien ata la constante con lo
 *  que la skill manda escribir es `pruebas/ci-del-marco/placeholder-del-release.test.mjs`. */
const changelogRecienCortado = (version, seccion) =>
  [
    "# Changelog",
    "",
    `## [${ENTRADA_SIN_PUBLICAR}]`,
    "",
    "### Para consumidores",
    "",
    PLACEHOLDER_SIN_CAMBIOS,
    "",
    "---",
    "",
    `## [${version}] — 2026-09-17`,
    "",
    "### Para consumidores",
    "",
    seccion,
    "",
    "### Añadido",
    "",
    "- algo",
    "",
  ].join("\n");

/** Un relleno que pasa el limite que se le de, con holgura. Derivado y no afinado a mano:
 *  un `.repeat(80)` dice «4800 caracteres» y deja de significar «se pasa» el dia que el
 *  limite se mueve. En Rigel, subir el limite puso rojos seis casos afinados al literal. */
function rellenoQuePasa(limite) {
  const linea = "Esta linea existe para inflar la seccion y forzar el recorte. ";
  return linea.repeat(Math.ceil((limite * 1.4) / linea.length));
}

/** Ejecuta main() sin ensuciar la salida del banco. */
function correr(argv, env = {}) {
  const log = console.log;
  const dicho = [];
  console.log = (...a) => dicho.push(a.join(" "));
  try {
    return { codigo: main(argv, env), dicho: dicho.join("\n") };
  } finally {
    console.log = log;
  }
}

/** Solo las lineas `::error::`, y no el `dicho` entero: las aserciones sobre el CONSEJO
 *  tienen que caer sobre el consejo. La linea de candidatos ya imprime el largo, asi que
 *  buscar un numero en la salida completa daria verde aunque el ::error:: no lo trajera. */
const errores = (dicho) => dicho.split("\n").filter((l) => l.startsWith("::error"));

// `await fn(dir)` y no `return fn(dir)`: sin el await, el finally borra el directorio
// ANTES de que el caso asincrono lo use, y el caso falla por una razon que no es la suya.
async function conTemporal(fn) {
  const dir = mkdtempSync(join(tmpdir(), "compuerta-aviso-"));
  try {
    return await fn(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

/** Lo que la action escribe de verdad para una version, con el limite y el dialecto que
 *  se le pasen. `formato` vacio es «no declarado», igual que un input sin valor. */
async function payloadDelAviso(dir, changelog, version, limite, formato = "") {
  const salida = join(dir, `payload-${version}-${formato || "default"}.json`);
  const log = console.log;
  console.log = () => {};
  let codigo;
  try {
    codigo = await mainDelAviso({
      AVISO_VERSION: version,
      AVISO_CHANGELOG: changelog,
      AVISO_SALIDA: salida,
      AVISO_LIMITE: limite === null ? "" : String(limite),
      AVISO_FORMATO: formato,
    });
  } finally {
    console.log = log;
  }
  assert.equal(codigo, 0, `la action no armo el aviso de ${version}`);
  return JSON.parse(readFileSync(salida, "utf8")).text;
}

// ---------------------------------------------------------------------------
// La seccion que se esta escribiendo: `[No publicado]`
// ---------------------------------------------------------------------------

test("una seccion corta entra, y la compuerta ve el encabezado", () => {
  const r = medir(changelogCon("Nada que hacer: es un banco del marco."), LIMITE_POR_DEFECTO, {});
  assert.deepEqual(r.hallazgos, []);
  const [c] = r.candidatos;
  assert.equal(c.etiqueta, ENTRADA_SIN_PUBLICAR);
  for (const f of FORMATOS) assert.ok(c.largos?.[f] > 0, `reporta el largo en ${f}`);
  assert.equal(c.sinParaConsumidores, false, "el fixture trae el encabezado, y la compuerta lo ve");
});

test("una seccion que se pasa del limite es ROJO en cada dialecto, con el largo REAL", () => {
  // Un hallazgo POR DIALECTO: la prosa del relleno no cambia con la conversion, asi que
  // se pasa en los dos, y cada uno trae su largo.
  const r = medir(changelogCon(rellenoQuePasa(LIMITE_POR_DEFECTO)), LIMITE_POR_DEFECTO, {});
  assert.deepEqual(r.hallazgos.map((h) => h.formato), FORMATOS);
  for (const h of r.hallazgos) {
    assert.equal(h.etiqueta, ENTRADA_SIN_PUBLICAR, "el hallazgo nombra la seccion que lo produjo");
    assert.equal(h.motivo, "recorte");
    assert.ok(
      h.largo > LIMITE_POR_DEFECTO,
      `el largo reportado en ${h.formato} (${h.largo}) tiene que ser el REAL, no el del mensaje ya recortado: ` +
        "reportar un numero menor al limite convierte el diagnostico en un acertijo",
    );
  }
});

test("una entrada SIN seccion «Para consumidores» es ROJA aunque el largo entre", () => {
  // Decision del PO de Rigel del 2026-09-09 (su issue #369), adoptada aca con la
  // politica D1 del PO de Projects: una compuerta nueva sale en rojo. Un aviso se ignora
  // version tras version; el rojo obliga a escribir el resumen accionable en cada una,
  // aunque sea para decir «nada que hacer hoy». Sin la seccion, el aviso manda el
  // cuerpo entero de la entrada —con la prosa interna del marco— y no un resumen.
  const changelog = ["# Changelog", "", `## [${ENTRADA_SIN_PUBLICAR}]`, "", "### Corregido", "", "- algo chico", ""].join("\n");
  const r = medir(changelog, LIMITE_POR_DEFECTO, {});
  const [c] = r.candidatos;
  assert.equal(c.sinParaConsumidores, true);
  for (const f of FORMATOS) {
    assert.ok(c.largos[f] < LIMITE_POR_DEFECTO, `el cuerpo entra en ${f} (${c.largos[f]} de ${LIMITE_POR_DEFECTO}): el rojo no es por el largo`);
  }
  assert.deepEqual(
    r.hallazgos.map((h) => [h.etiqueta, h.motivo]),
    [[ENTRADA_SIN_PUBLICAR, "sin-para-consumidores"]],
  );
});

test("LA ENTRADA ENORME SIN RESUMEN: el consejo es ESCRIBIRLA, no acortarla, y dice cuanto llega", () =>
  conTemporal(async (dir) => {
    // La forma del [No publicado] de este repo el 2026-09-17 (40488 caracteres de cuerpo
    // sin la seccion; armado 41091, entregado 3451). El consejo de «acortar la seccion
    // Para consumidores» sobre un cuerpo que no la tiene es el consejo al reves: lo que
    // se termina acortando es el detalle del marco.
    const changelog = join(dir, "CHANGELOG.md");
    writeFileSync(
      changelog,
      ["# Changelog", "", "## [3.1.0] — 2026-09-17", "", "### Añadido", "", rellenoQuePasa(LIMITE_POR_DEFECTO * 3), ""].join("\n"),
    );

    const { codigo, dicho } = correr([changelog]);
    assert.equal(codigo, 1);
    const err = errores(dicho);
    assert.equal(err.length, 1, "una sola causa, un solo ::error::");
    assert.doesNotMatch(err[0], /acorta/i, "mandar a acortar una seccion que no existe es el consejo al reves");
    assert.match(err[0], /ESCRIBIRLA/, "el arreglo correcto en esta rama es escribir la seccion");

    // Y el numero que dice que LLEGA sale de la misma funcion que recorta en produccion:
    // se compara contra el payload que la action escribe de verdad, en cada dialecto.
    assert.match(err[0], /Y no llega ni siquiera entero:/, `el error tiene que decir cuanto llega de verdad:\n${err[0]}`);
    for (const f of FORMATOS) {
      const m = new RegExp(`${f} se recorta a (\\d+)`).exec(err[0]);
      assert.ok(m, `el error no dice cuanto llega en ${f}:\n${err[0]}`);
      assert.equal(Number(m[1]), (await payloadDelAviso(dir, changelog, "3.1.0", null, f)).length, `en ${f}`);
    }
    assert.doesNotMatch(err[0], /Eso es lo que llega al destino, entero\./, "no puede afirmar que llega entero");
  }));

test("sin la seccion y dentro del limite, el error dice que llega entero y no inventa un recorte", () =>
  conTemporal((dir) => {
    const changelog = join(dir, "CHANGELOG.md");
    writeFileSync(changelog, ["# Changelog", "", "## [3.1.0] — 2026-09-17", "", "### Añadido", "", "- un cambio chico", ""].join("\n"));
    const { codigo, dicho } = correr([changelog]);
    assert.equal(codigo, 1, "falta la seccion igual: sigue siendo rojo");
    const e = errores(dicho).join("\n");
    assert.match(e, /Eso es lo que llega al destino, entero\./);
    assert.doesNotMatch(e, /se recorta a/);
  }));

test("CONTROL POSITIVO: con la seccion presente y sobre el limite, sigue mandando a acortarla", () =>
  conTemporal((dir) => {
    const changelog = join(dir, "CHANGELOG.md");
    writeFileSync(changelog, changelogCon(rellenoQuePasa(LIMITE_POR_DEFECTO)));
    const { codigo, dicho } = correr([changelog]);
    assert.equal(codigo, 1);
    const err = errores(dicho);
    assert.equal(err.length, FORMATOS.length, "un ::error:: de recorte por dialecto");
    for (const [i, f] of FORMATOS.entries()) {
      assert.match(err[i], /acortar la seccion «Para consumidores»/);
      assert.match(err[i], new RegExp(`en dialecto '${f}' se recortaria`));
    }
  }));

test("el limite se puede subir, y entonces la misma seccion entra", () => {
  const relleno = rellenoQuePasa(LIMITE_POR_DEFECTO);
  assert.equal(medir(changelogCon(relleno), LIMITE_POR_DEFECTO, {}).hallazgos.length, FORMATOS.length, "con el limite normal, rojo en cada dialecto");
  assert.deepEqual(medir(changelogCon(relleno), 100000, {}).hallazgos, [], "subir el input `limite` es una salida legitima");
});

// ---------------------------------------------------------------------------
// La seccion recien cortada: el PR de release
// ---------------------------------------------------------------------------

test("EL PR DE RELEASE: mide la version recien cortada, no solo el [No publicado] vacio", () => {
  const r = medir(changelogRecienCortado("1.10.0", rellenoQuePasa(LIMITE_POR_DEFECTO)), LIMITE_POR_DEFECTO, {});
  const recortes = r.hallazgos.filter((h) => h.motivo === "recorte");
  assert.equal(recortes.length, FORMATOS.length, "la seccion cortada se pasa en cada dialecto, y el PR de release tiene que verlo");
  for (const h of recortes) {
    assert.equal(h.etiqueta, "1.10.0", "el hallazgo sale de la version recien cortada, que es la que el `release` va a mandar");
    assert.ok(h.largo > LIMITE_POR_DEFECTO);
  }
});

test("el [No publicado] recien vaciado no tapa a la version cortada, ni suma hallazgos propios", () => {
  const r = medir(changelogRecienCortado("1.10.0", rellenoQuePasa(LIMITE_POR_DEFECTO)), LIMITE_POR_DEFECTO, {});
  const sinPublicar = r.candidatos.find((c) => c.etiqueta === ENTRADA_SIN_PUBLICAR);
  assert.ok(sinPublicar, "se mide igual: es la seccion que escribe el PR siguiente");
  for (const f of FORMATOS) {
    assert.ok(sinPublicar.largos[f] < LIMITE_POR_DEFECTO, `el [No publicado] vaciado entra en ${f}: ese verde es el que tapaba el problema`);
  }
  assert.deepEqual(
    r.hallazgos.filter((h) => h.etiqueta === ENTRADA_SIN_PUBLICAR),
    [],
    "el placeholder que dicta la skill trae su «Para consumidores», asi que no suma hallazgos",
  );
});

test("ninguna de las dos secciones se puede saltear", () => {
  // La alternativa descartada era medir UNA: `[No publicado]` si «tiene contenido» y si
  // no la version mas alta. Decidir que es «tener contenido» es una heuristica que,
  // errada, se salta la seccion larga sin decir nada.
  const r = medir(changelogRecienCortado("1.10.0", "Una seccion corta."), LIMITE_POR_DEFECTO, {});
  assert.deepEqual(r.candidatos.map((c) => c.etiqueta), [ENTRADA_SIN_PUBLICAR, "1.10.0"]);
});

test("una [No publicado] larga es roja aunque la version cortada entre", () => {
  const changelog = [
    "# Changelog",
    "",
    `## [${ENTRADA_SIN_PUBLICAR}]`,
    "",
    "### Para consumidores",
    "",
    rellenoQuePasa(LIMITE_POR_DEFECTO),
    "",
    "---",
    "",
    "## [1.9.6] — 2026-09-03",
    "",
    "### Para consumidores",
    "",
    "Nada que hacer.",
    "",
  ].join("\n");
  const r = medir(changelog, LIMITE_POR_DEFECTO, {});
  assert.deepEqual(
    r.hallazgos.map((h) => [h.etiqueta, h.motivo, h.formato]),
    FORMATOS.map((f) => [ENTRADA_SIN_PUBLICAR, "recorte", f]),
  );
});

// ---------------------------------------------------------------------------
// Cual es «la version mas alta», y que pasa cuando no hay ninguna
// ---------------------------------------------------------------------------

test("versionMasAlta compara numeros, no posiciones en el archivo", () => {
  const changelog = ["# Changelog", "", "## [1.9.0] — 2026-08-28", "", "nada", "", "## [1.10.0] — 2026-08-30", "", "nada", ""].join("\n");
  assert.equal(versionMasAlta(changelog), "1.10.0", "creerle a la posicion o al orden alfabetico mide la entrada equivocada");
});

test("versionMasAlta ignora [No publicado] y cualquier encabezado que no sea semver", () => {
  assert.equal(versionMasAlta(`## [${ENTRADA_SIN_PUBLICAR}]\n\nnada\n`), null);
  assert.equal(versionMasAlta("## [latest]\n\nnada\n"), null);
  assert.equal(versionMasAlta("## [1.2.0] — 2026-01-01\n\nnada\n"), "1.2.0");
});

test("sin [No publicado] Y sin ninguna version, es ROJO y no un verde mudo", () =>
  conTemporal((dir) => {
    // No haber podido medir NO es haber medido bien.
    const changelog = join(dir, "CHANGELOG.md");
    writeFileSync(changelog, "# Changelog\n\nProsa suelta, ningun encabezado de version.\n");
    assert.equal(medir(readFileSync(changelog, "utf8"), LIMITE_POR_DEFECTO, {}).sinCandidatos, true);
    const { codigo, dicho } = correr([changelog]);
    assert.equal(codigo, 1, "verde por imposibilidad es el fail-open que esta compuerta cierra");
    assert.match(dicho, /::error/);
    assert.match(dicho, /no haber podido medir/);
  }));

test("un changelog que no se puede leer es ROJO con el arreglo, no una excepcion suelta", () => {
  const { codigo, dicho } = correr(["no-existe-este-changelog.md"]);
  assert.equal(codigo, 1);
  assert.match(dicho, /::error/);
  assert.match(dicho, /Arreglo:/);
});

test("sin [No publicado] pero con versiones, mide la version y lo dice", () =>
  conTemporal((dir) => {
    const changelog = join(dir, "CHANGELOG.md");
    writeFileSync(changelog, "# Changelog\n\n## [1.9.6] — 2026-09-03\n\n### Para consumidores\n\nNada que hacer.\n");
    const r = medir(readFileSync(changelog, "utf8"), LIMITE_POR_DEFECTO, {});
    assert.equal(r.sinCandidatos, false);
    assert.equal(r.faltaSinPublicar, true);
    assert.deepEqual(r.candidatos.map((c) => c.etiqueta), ["1.9.6"]);
    const { codigo, dicho } = correr([changelog]);
    assert.equal(codigo, 0, "medir una sola de las dos secciones es una medicion, no una omision");
    assert.match(dicho, /::warning/, "y la ausencia de [No publicado] no se calla");
  }));

// ---------------------------------------------------------------------------
// Exactitud: el numero de la compuerta es el numero que se manda
// ---------------------------------------------------------------------------

/** El `default` literal del input `limite` de `action.yml`, o `null` si no declara
 *  ninguno. Se parsea el YAML crudo a proposito: lo que importa es el valor que GitHub
 *  le va a pasar al script como `AVISO_LIMITE`, y eso sale de este archivo. */
function defaultDeActionYml() {
  const yml = readFileSync(join(RAIZ, "actions", "aviso-version", "action.yml"), "utf8");
  const desde = yml.indexOf("\n  limite:");
  assert.notEqual(desde, -1, "action.yml declara el input `limite`: si se renombro, este lector quedo mirando al vacio");
  const resto = yml.slice(desde + 1);
  const hasta = resto.slice(3).search(/\n {2}\S+:/);
  const bloque = hasta === -1 ? resto : resto.slice(0, hasta + 4);
  const m = bloque.match(/^\s{4}default:\s*"?([^"\n]*)"?\s*$/m);
  return m ? m[1] : null;
}

test("ROJO PRIMERO: el limite del aviso vive en UN lugar, y action.yml no lo repite", () => {
  // EL HUECO, medido en Rigel el 2026-09-09: `LIMITE_POR_DEFECTO` subio de 3500 a 7000 y
  // `action.yml` se quedo con `default: "3500"`. Ese default viaja como `AVISO_LIMITE` y
  // GANA sobre la constante (`Number(env.AVISO_LIMITE || LIMITE_POR_DEFECTO)`), y el
  // unico invocador no pasa `limite`. Resultado: la compuerta declaraba verde hasta 7000
  // y el envio recortaba en 3500 (su aviso de la 2.4.0: 3550 caracteres, verde, llego
  // recortado). En Projects los dos numeros HOY coinciden, y eso es justamente lo que no
  // alcanza: coinciden hasta que alguien mueva uno.
  //
  // La propiedad es «un numero, un lugar»: sin default, el vacio cae en la constante.
  const declarado = defaultDeActionYml();
  assert.equal(
    declarado,
    null,
    `action.yml declara default "${declarado}" para \`limite\`, que viaja como AVISO_LIMITE y le gana a ` +
      `LIMITE_POR_DEFECTO (${LIMITE_POR_DEFECTO}). Con el numero en dos lugares, mover uno deja a esta compuerta ` +
      "midiendo contra un limite y al envio recortando en otro, en silencio. Arreglo: quitar el `default` del input " +
      "`limite` en actions/aviso-version/action.yml (el script cae en la constante)",
  );
});

test("el largo que reporta la compuerta es el del payload que la action escribe", () =>
  conTemporal(async (dir) => {
    // La promesa del archivo es «usa el pipeline real». Lo que la puede romper en
    // silencio no es el pipeline —se importa— sino el ENCUADRE: la version que se asume y
    // los dos enlaces, que cuentan para el limite. Por eso se compara contra el payload
    // REAL de la action, sobre el CHANGELOG REAL de este repo, con el limite que la
    // action recibe de action.yml y no con la constante: comparar la constante contra si
    // misma es exactamente como Rigel dejo de ver sus dos numeros separados.
    //
    // Y POR DIALECTO: la compuerta arma cada uno con `formato` y la action lo recibe como
    // AVISO_FORMATO. Si una de las dos dejara de pasarlo, este caso compara un mensaje
    // traducido contra uno sin traducir y se pone rojo.
    const declarado = defaultDeActionYml();
    const limite = declarado === null ? LIMITE_POR_DEFECTO : Number(declarado);
    const cortada = medir(readFileSync(CHANGELOG_REAL, "utf8"), limite, {}).candidatos.find((c) => !c.estimada);
    assert.ok(cortada, "el CHANGELOG de este repo tiene al menos una version publicada");

    for (const f of FORMATOS) {
      const enviado = await payloadDelAviso(dir, CHANGELOG_REAL, cortada.version, declarado, f);
      const armadoSinTecho = await payloadDelAviso(dir, CHANGELOG_REAL, cortada.version, Number.MAX_SAFE_INTEGER, f);
      assert.equal(
        cortada.largos?.[f],
        armadoSinTecho.length,
        `en ${f} la compuerta mide ${cortada.largos?.[f]} y la action arma ${armadoSinTecho.length}: una compuerta que ` +
          "mide otro mensaje que el que se envia no vigila nada",
      );
      assert.equal(cortada.llegan?.[f], enviado.length, `en ${f} la compuerta dice que llegan ${cortada.llegan?.[f]} y la action manda ${enviado.length}`);
    }
  }));

// ---------------------------------------------------------------------------
// Cada dialecto, porque la conversion cambia el largo
// ---------------------------------------------------------------------------

/** Una tabla en «Para consumidores» con encabezados largos y celdas cortas: en markdown
 *  cada fila son unas barras; en mrkdwn cada fila es una viñeta con TODAS las etiquetas
 *  repetidas. Es la forma realista en que un mensaje entra en un dialecto y no en el otro. */
const changelogConTabla = (filas) =>
  changelogCon(
    [
      "| Consumidor | Resultado de la medicion | Que tiene que hacer |",
      "| --- | --- | --- |",
      ...Array.from({ length: filas }, (_, i) => `| c${i} | verde | nada |`),
    ].join("\n"),
  );

test("ROJO PRIMERO: la compuerta mide CADA dialecto que la action acepta, no uno", () => {
  const r = medir(changelogCon("Nada que hacer."), LIMITE_POR_DEFECTO, {});
  assert.deepEqual(Object.keys(r.candidatos[0].largos ?? {}), [...(laAction.FORMATOS ?? [])], "un largo por dialecto de la action");
  assert.ok(FORMATOS.includes("mrkdwn"), "la action acepta mrkdwn, y la compuerta lo tiene que medir");
});

test("ROJO PRIMERO: un mensaje que entra en markdown y NO en mrkdwn es rojo, nombrando el dialecto", () => {
  // El limite se DERIVA de lo que mide la propia compuerta sin techo: justo el largo en
  // markdown, que entra, mientras mrkdwn —con las etiquetas repetidas en cada fila— se
  // pasa. Afinarlo a mano dejaria de significar «entra en uno y no en el otro» el dia
  // que cambie el encuadre.
  const changelog = changelogConTabla(30);
  const { largos } = medir(changelog, Number.MAX_SAFE_INTEGER, {}).candidatos[0];
  assert.ok(largos?.mrkdwn > largos?.markdown, `la tabla tiene que crecer en mrkdwn: ${JSON.stringify(largos)}`);

  const r = medir(changelog, largos.markdown, {});
  assert.deepEqual(
    r.hallazgos.map((h) => [h.motivo, h.formato]),
    [["recorte", "mrkdwn"]],
    "markdown entra justo en el limite y mrkdwn no: un solo hallazgo, y del dialecto que se pasa",
  );
});

test("el ::error:: del recorte nombra el dialecto que no entra", () =>
  conTemporal((dir) => {
    // Con el limite REAL de la action: se agregan filas hasta que mrkdwn se pasa, y en ese
    // punto markdown todavia entra (cada fila crece mucho mas en mrkdwn).
    let filas = 1;
    while (medir(changelogConTabla(filas), Number.MAX_SAFE_INTEGER, {}).candidatos[0].largos?.mrkdwn <= LIMITE_POR_DEFECTO) filas += 1;
    const texto = changelogConTabla(filas);
    assert.ok(medir(texto, Number.MAX_SAFE_INTEGER, {}).candidatos[0].largos.markdown <= LIMITE_POR_DEFECTO, "markdown todavia entra");

    const ruta = join(dir, "CHANGELOG.md");
    writeFileSync(ruta, texto);
    const { codigo, dicho } = correr([ruta]);
    assert.equal(codigo, 1);
    const err = errores(dicho);
    assert.equal(err.length, 1, `un solo dialecto se pasa:\n${err.join("\n")}`);
    assert.match(err[0], /en dialecto 'mrkdwn' se recortaria/);
  }));

// ---------------------------------------------------------------------------
// El centinela: el texto de fabrica no puede quedar encima de cambios reales
// ---------------------------------------------------------------------------

const sinPublicarCon = (anuncio, subsecciones) =>
  [
    "# Changelog",
    "",
    `## [${ENTRADA_SIN_PUBLICAR}]`,
    "",
    "### Para consumidores",
    "",
    anuncio,
    ...subsecciones,
    "",
    "---",
    "",
    "## [1.9.6] — 2026-09-03",
    "",
    "### Para consumidores",
    "",
    "Nada que hacer: el cambio es interno.",
    "",
  ].join("\n");

test("el texto de fabrica encima de cambios reales es ROJO, y nombra las subsecciones", () => {
  // POR QUE EXISTE EL CENTINELA: lo abre el propio arreglo del placeholder. Con la
  // seccion puesta de fabrica en el paso 1 del release, alguien agrega `### Añadido` con
  // un cambio de verdad y deja el anuncio intacto: la compuerta saldria VERDE y el aviso
  // le diria a los consumidores que no tienen nada que hacer, sobre una version que si
  // los toca. Cambiar un rojo molesto por un verde mudo es la peor operacion que se le
  // puede hacer a una compuerta.
  const r = medir(sinPublicarCon(PLACEHOLDER_SIN_CAMBIOS, ["", "### Añadido", "", "- una compuerta nueva"]), LIMITE_POR_DEFECTO, {});
  const propios = r.hallazgos.filter((h) => h.etiqueta === ENTRADA_SIN_PUBLICAR);
  assert.deepEqual(propios.map((h) => h.motivo), ["placeholder-con-cambios"]);
  assert.deepEqual(propios[0].subsecciones, ["Añadido"], "y nombra la subseccion, que es lo que hace el error accionable");

  const { dicho } = conTexto(sinPublicarCon(PLACEHOLDER_SIN_CAMBIOS, ["", "### Añadido", "", "- una compuerta nueva"]));
  assert.match(errores(dicho).join("\n"), /Arreglo: reemplazar ese texto/);
});

/** main() sobre un texto, via un archivo temporal que se borra al volver. */
function conTexto(texto) {
  const dir = mkdtempSync(join(tmpdir(), "compuerta-aviso-"));
  try {
    const ruta = join(dir, "CHANGELOG.md");
    writeFileSync(ruta, texto);
    return correr([ruta]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test("CONTROL POSITIVO: el texto de fabrica SIN cambios es legitimo y sale verde", () => {
  // Sin esta mitad el centinela seria un rojo permanente: entre release y release el
  // `[No publicado]` vive exactamente asi.
  const r = medir(sinPublicarCon(PLACEHOLDER_SIN_CAMBIOS, []), LIMITE_POR_DEFECTO, {});
  assert.deepEqual(r.hallazgos.filter((h) => h.etiqueta === ENTRADA_SIN_PUBLICAR), []);
});

test("CONTROL POSITIVO: cambios con un resumen escrito de verdad salen verde", () => {
  const r = medir(
    sinPublicarCon("Nada que hacer: la compuerta nueva corre en el CI del marco.", ["", "### Añadido", "", "- una compuerta nueva"]),
    LIMITE_POR_DEFECTO,
    {},
  );
  assert.deepEqual(r.hallazgos.filter((h) => h.etiqueta === ENTRADA_SIN_PUBLICAR), [], "mide que el texto de fabrica no sobreviva, no que el resumen sea bueno");
});

test("el centinela no se apaga con espaciado ni con la caja distintos", () => {
  const raro = `  ${PLACEHOLDER_SIN_CAMBIOS.toUpperCase().replace(/ /g, "   ")}  `;
  const r = medir(sinPublicarCon(raro, ["", "### Corregido", "", "- algo"]), LIMITE_POR_DEFECTO, {});
  assert.deepEqual(r.hallazgos.filter((h) => h.etiqueta === ENTRADA_SIN_PUBLICAR).map((h) => h.motivo), ["placeholder-con-cambios"]);
});

test("el centinela va ANTES del recorte, y el predicado puro lo dice solo", () => {
  // Mientras el anuncio sea el de fabrica, el largo medido no es el del mensaje que va a
  // salir: un ::error:: de recorte ahi daria un numero que nadie va a ver.
  const r = medir(
    sinPublicarCon(PLACEHOLDER_SIN_CAMBIOS, ["", "### Añadido", "", rellenoQuePasa(LIMITE_POR_DEFECTO)]),
    LIMITE_POR_DEFECTO,
    {},
  );
  assert.deepEqual(r.hallazgos.filter((h) => h.etiqueta === ENTRADA_SIN_PUBLICAR).map((h) => h.motivo), ["placeholder-con-cambios"]);

  assert.deepEqual(
    esPlaceholderConCambios(["### Para consumidores", "", PLACEHOLDER_SIN_CAMBIOS, "", "### Añadido", "", "- x"].join("\n")),
    ["Añadido"],
  );
  assert.equal(esPlaceholderConCambios(["### Para consumidores", "", PLACEHOLDER_SIN_CAMBIOS].join("\n")), null, "sin subsecciones no hay nada que denunciar");
  assert.equal(esPlaceholderConCambios(["### Añadido", "", "- x"].join("\n")), null, "sin la seccion el hallazgo es el otro: no se acumulan");
});

// ---------------------------------------------------------------------------
// La seccion se entiende: «Para consumidores» sin jerga de oficio (lote 10 del porte)
// ---------------------------------------------------------------------------
//
// POR QUE. Desde la decision D1 del PO (2026-09-17), una compuerta nueva cuyo arreglo
// cabe en el repositorio del consumidor sale en ROJO el dia que sale (AGENTS.md, «Qué es
// BREAKING»). Eso solo es justo si el arreglo llega escrito, y llega en ESTA seccion: es
// lo que el aviso manda y lo que el PR de bump pone adelante. Quien lo recibe puede no
// saber leer un `::error::`, asi que la seccion se escribe con la regla de las paginas
// para quien no es tecnico: sin la jerga de oficio que `pruebas/docs/lectura.mjs` les
// prohibe. Si esa mitad faltara, la regla nueva se degrada en un PR rojo que nadie
// mergea.
//
// Los casos usan solo `medir` y `main`, que ya existian: contra la compuerta vieja cada
// uno cae por su propia razon (no hay hallazgo de jerga), y no el archivo entero por un
// import faltante.

const jergaDe = (r, etiqueta = ENTRADA_SIN_PUBLICAR) =>
  r.hallazgos.filter((h) => h.etiqueta === etiqueta && h.motivo === "jerga-en-para-consumidores");

test("ROJO PRIMERO: un «Para consumidores» escrito en jerga de oficio es ROJO, y nombra las palabras", () => {
  const r = medir(changelogCon("Nada cambia en tu pipeline hasta que hagas merge del PR de bump."), LIMITE_POR_DEFECTO, {});
  const hallazgos = jergaDe(r);
  assert.equal(hallazgos.length, 1, "UN hallazgo por seccion, no uno por palabra ni por dialecto: la jerga no depende del dialecto");
  assert.deepEqual(hallazgos[0].palabras, ["pipeline", "merge"], "y nombra las palabras, que es lo que vuelve accionable el rojo");
});

test("ROJO PRIMERO: la lista es LA de las paginas para quien no es tecnico, no una copia", () => {
  // Una definicion, tres usos: el banco del estandar de lectura, el de la puerta de
  // entrada y esta compuerta. Si la compuerta copiara la lista, la primera palabra que se
  // agregue en docs quedaria permitida aca sin que nadie lo note.
  const escapadas = SIN_TRADUCCION.filter((palabra) => {
    const r = medir(changelogCon(`Revisá el ${palabra} de tu repositorio.`), LIMITE_POR_DEFECTO, {});
    return jergaDe(r).length !== 1;
  });
  assert.ok(SIN_TRADUCCION.length > 20, "la lista de lectura.mjs salio vacia: el caso pasaria sin medir nada");
  assert.deepEqual(escapadas, [], "estas palabras estan prohibidas en las paginas para quien no es tecnico y la compuerta las deja pasar");
});

test("ROJO PRIMERO: el gerundio ingles cae por la forma, aunque ninguna lista lo tenga", () => {
  const r = medir(changelogCon("Revisá el bumping de tu repositorio antes de aceptar."), LIMITE_POR_DEFECTO, {});
  assert.deepEqual(jergaDe(r)[0]?.palabras, ["bumping"]);
});

test("CONTROL POSITIVO: lo que va entre backticks es un nombre que se copia, no prosa", () => {
  // Es la misma escotilla que tienen las paginas: un archivo o un comando se escriben
  // como son. Sin ella, decir «copiá `desplegar.yml`» o nombrar el workflow que hay que
  // editar seria rojo, y la seccion tendria que mentir sobre el nombre.
  const r = medir(
    changelogCon("Copiá `desplegar.yml` del andamio nuevo y corré `pnpm build`; el archivo `.github/workflows/ci.yml` no cambia."),
    LIMITE_POR_DEFECTO,
    {},
  );
  assert.deepEqual(jergaDe(r), []);
});

test("la jerga FUERA de «Para consumidores» no se cobra: el detalle de abajo es para quien lo quiera leer", () => {
  const r = medir(
    sinPublicarCon("Nada que hacer: la compuerta nueva corre en el CI del marco.", ["", "### Añadido", "", "- un workflow y un check nuevos en el pipeline"]),
    LIMITE_POR_DEFECTO,
    {},
  );
  assert.deepEqual(r.hallazgos.filter((h) => h.etiqueta === ENTRADA_SIN_PUBLICAR), []);
});

test("la jerga no se acumula con la falta de la seccion ni con el texto de fabrica", () => {
  // Excluyentes por seccion, como los otros dos: sin la seccion el arreglo es escribirla,
  // y con el texto de fabrica el arreglo es reemplazarlo. Un tercer rojo encima no agrega
  // un dato.
  const sinSeccion = ["# Changelog", "", `## [${ENTRADA_SIN_PUBLICAR}]`, "", "### Corregido", "", "- el pipeline y el merge", ""].join("\n");
  assert.deepEqual(medir(sinSeccion, LIMITE_POR_DEFECTO, {}).hallazgos.map((h) => h.motivo), ["sin-para-consumidores"]);

  const deFabrica = sinPublicarCon(PLACEHOLDER_SIN_CAMBIOS, ["", "### Añadido", "", "- un check en el pipeline"]);
  assert.deepEqual(
    medir(deFabrica, LIMITE_POR_DEFECTO, {}).hallazgos.filter((h) => h.etiqueta === ENTRADA_SIN_PUBLICAR).map((h) => h.motivo),
    ["placeholder-con-cambios"],
  );
});

test("jerga y recorte se cobran JUNTOS: son dos arreglos distintos", () => {
  const r = medir(changelogCon(`Mirá el pipeline. ${rellenoQuePasa(LIMITE_POR_DEFECTO)}`), LIMITE_POR_DEFECTO, {});
  const motivos = r.hallazgos.filter((h) => h.etiqueta === ENTRADA_SIN_PUBLICAR).map((h) => h.motivo);
  assert.deepEqual(motivos, ["jerga-en-para-consumidores", ...FORMATOS.map(() => "recorte")]);
});

test("EL PR DE RELEASE: la version recien cortada tambien se lee, no solo el [No publicado]", () => {
  const r = medir(changelogRecienCortado("1.10.0", "Actualizá el workflow de tu repositorio."), LIMITE_POR_DEFECTO, {});
  assert.deepEqual(jergaDe(r, "1.10.0")[0]?.palabras, ["workflow"]);
  assert.deepEqual(jergaDe(r), [], "el placeholder de la skill no tiene jerga");
});

test("el ::error:: de la jerga nombra la seccion, las palabras y el arreglo, y sale 1", () => {
  const { codigo, dicho } = conTexto(changelogCon("Nada cambia en tu pipeline."));
  assert.equal(codigo, 1);
  const error = errores(dicho).join("\n");
  assert.match(error, /\[No publicado\]/);
  assert.match(error, /pipeline/);
  assert.match(error, /Arreglo:/);
  assert.match(error, /backticks/, "y dice la salida legitima para un nombre que hay que copiar tal cual");
});

// ===========================================================================
// REVISION ADVERSARIAL DEL PORTE (2026-09-17): los huecos que la compuerta dejaba
// verdes. Cada bloque cita el hallazgo que lo motivo y trae su contrapeso: lo que
// tiene que SEGUIR verde, porque un endurecimiento que no lo dice no se distingue de
// una compuerta que se volvio loca.
// ===========================================================================

// ---------------------------------------------------------------------------
// FO-H1 / RV-L4-01 — un «Para consumidores» que existe pero esta VACIO
// ---------------------------------------------------------------------------
//
// `extraerParaConsumidores` lo daba por encontrado con texto "", y ninguna de las
// cuatro causas lo miraba: el aviso salia con «Que tiene que hacer un consumidor:» y
// nada debajo, y la compuerta imprimia que el aviso «manda su seccion». Es el caso
// que esta compuerta existe para impedir —cambios reales y nadie dice que hacer—,
// entrando por la puerta de al lado.

const vaciaDe = (r, etiqueta = ENTRADA_SIN_PUBLICAR) =>
  r.hallazgos.filter((h) => h.etiqueta === etiqueta && h.motivo === "para-consumidores-vacia");

test("ROJO PRIMERO: un «Para consumidores» VACIO, seguido de otro encabezado, es ROJO", () => {
  const r = medir(changelogCon(""), LIMITE_POR_DEFECTO, {});
  assert.deepEqual(
    r.hallazgos.filter((h) => h.etiqueta === ENTRADA_SIN_PUBLICAR).map((h) => h.motivo),
    ["para-consumidores-vacia"],
    "la seccion existe y no dice nada: el aviso manda un encabezado sin nada debajo",
  );
});

test("ROJO PRIMERO: un «Para consumidores» hecho solo de espacios o de un comentario tambien esta vacio", () => {
  assert.equal(vaciaDe(medir(changelogCon("   \n\t\n"), LIMITE_POR_DEFECTO, {})).length, 1, "solo espacios");
  assert.equal(vaciaDe(medir(changelogCon("<!-- completar antes del release -->"), LIMITE_POR_DEFECTO, {})).length, 1, "solo un comentario");
});

test("ROJO PRIMERO: la reproduccion de la revision sale 1 con un ::error:: que manda a ESCRIBIRLA", () => {
  const texto = [
    "# Changelog",
    "",
    "## [No publicado]",
    "",
    "### Para consumidores",
    "",
    "### Añadido",
    "",
    "- Una compuerta nueva que pone rojo tu CI.",
    "",
    "## [1.9.6] — 2026-09-01",
    "",
    "### Para consumidores",
    "",
    "Nada que hacer.",
    "",
  ].join("\n");
  const { codigo, dicho } = conTexto(texto);
  assert.equal(codigo, 1, `la compuerta salio verde con la seccion vacia:\n${dicho}`);
  const err = errores(dicho);
  assert.equal(err.length, 1, `una causa, un ::error::\n${err.join("\n")}`);
  assert.match(err[0], /\[No publicado\]/);
  assert.match(err[0], /VACIA/);
  assert.match(err[0], /Arreglo: ESCRIBIRLA/);
  assert.doesNotMatch(dicho, /✓/, "y no imprime que el aviso manda su seccion");
});

test("CONTRAPESO: «Nada que hacer.» y el texto de fabrica solo siguen verdes", () => {
  assert.deepEqual(vaciaDe(medir(changelogCon("Nada que hacer."), LIMITE_POR_DEFECTO, {})), [], "un texto corto no es un texto vacio");
  assert.deepEqual(medir(sinPublicarCon(PLACEHOLDER_SIN_CAMBIOS, []), LIMITE_POR_DEFECTO, {}).hallazgos, []);
});

// ---------------------------------------------------------------------------
// FO-H2 — la version que el PR corta POR DEBAJO de la mas alta
// ---------------------------------------------------------------------------
//
// La compuerta media `[No publicado]` y la version mas alta, y declaraba residuo al
// resto porque «su mensaje ya salio (o no salio nunca)». Es falso para un backport:
// cortar la 1.9.7 cuando ya existe la 2.0.0 deja un texto final que el `release` va a
// mandar apenas se publique el tag, y no se media. Es la misma forma que el defecto
// de Rigel que el propio archivo cuenta: medir otra seccion en el PR de release.
//
// El arreglo mide ademas toda version cuyo aviso CAMBIA contra la base del PR. El
// contrapeso: la historia que el PR no toca —o que toca sin cambiar lo que su aviso
// mandaria— no se pone roja, porque ese PR no la escribio.

const lineaDos = (...entradas) =>
  [
    "# Changelog",
    "",
    `## [${ENTRADA_SIN_PUBLICAR}]`,
    "",
    "### Para consumidores",
    "",
    PLACEHOLDER_SIN_CAMBIOS,
    "",
    "---",
    "",
    "## [2.0.0] — 2026-09-10",
    "",
    "### Para consumidores",
    "",
    "Nada que hacer.",
    "",
    "---",
    "",
    ...entradas.flatMap((e) => [e, "", "---", ""]),
    "## [1.9.6] — 2026-09-01",
    "",
    "### Para consumidores",
    "",
    "Nada que hacer.",
    "",
  ].join("\n");

const BASE_SIN_BACKPORT = lineaDos();
const backport = (cuerpo) => lineaDos(`## [1.9.7] — 2026-09-17\n\n${cuerpo}`);

test("ROJO PRIMERO: con la base del PR, la 1.9.7 recien cortada bajo la 2.0.0 se mide, y sin resumen es ROJA", () => {
  const r = medir(backport("### Añadido\n\n- Cosa larga sin resumen."), LIMITE_POR_DEFECTO, {}, BASE_SIN_BACKPORT);
  assert.ok(r.candidatos.some((c) => c.etiqueta === "1.9.7"), `no se midio la version que este PR corta: ${r.candidatos.map((c) => c.etiqueta)}`);
  assert.deepEqual(
    r.hallazgos.map((h) => [h.etiqueta, h.motivo]),
    [["1.9.7", "sin-para-consumidores"]],
  );
});

test("CONTROL POSITIVO: la 1.9.7 cortada con su resumen sale verde, y sigue midiendose", () => {
  const r = medir(backport("### Para consumidores\n\nNada que hacer.\n\n### Corregido\n\n- algo"), LIMITE_POR_DEFECTO, {}, BASE_SIN_BACKPORT);
  assert.deepEqual(r.hallazgos, []);
  assert.deepEqual(r.candidatos.map((c) => c.etiqueta), [ENTRADA_SIN_PUBLICAR, "2.0.0", "1.9.7"]);
});

test("CONTRAPESO: la historia que el PR no toca no se mide, aunque no pasaria la compuerta", () => {
  // La 1.5.0 no trae resumen ni en la base ni en la cabeza: el PR no la escribio.
  const vieja = "## [1.5.0] — 2026-08-20\n\n### Añadido\n\n- algo viejo sin resumen";
  const r = medir(lineaDos(vieja), LIMITE_POR_DEFECTO, {}, lineaDos(vieja));
  assert.ok(!r.candidatos.some((c) => c.etiqueta === "1.5.0"), "se midio historia que este PR no toco");
  assert.deepEqual(r.hallazgos, []);
});

test("CONTRAPESO: tocar el detalle de una version vieja sin cambiar lo que su aviso manda no la mide; cambiar el resumen, si", () => {
  const vieja = (detalle, resumen) => `## [1.5.0] — 2026-08-20\n\n### Para consumidores\n\n${resumen}\n\n### Añadido\n\n- ${detalle}`;
  const base = lineaDos(vieja("una errata", "Revisá el pipeline de tu repositorio."));

  const errata = medir(lineaDos(vieja("una errata corregida", "Revisá el pipeline de tu repositorio.")), LIMITE_POR_DEFECTO, {}, base);
  assert.ok(!errata.candidatos.some((c) => c.etiqueta === "1.5.0"), "una errata en el detalle no cambia el aviso: no es escribirlo");

  const resumen = medir(lineaDos(vieja("una errata", "Revisá el pipeline y el workflow de tu repositorio.")), LIMITE_POR_DEFECTO, {}, base);
  assert.deepEqual(
    resumen.hallazgos.map((h) => [h.etiqueta, h.motivo]),
    [["1.5.0", "jerga-en-para-consumidores"]],
    "cambiar el resumen es escribir el aviso de esa version: se mide entero",
  );
});

test("sin la base del PR, lo que no se midio se DICE, y el verde no afirma haber medido todo", () =>
  conTemporal((dir) => {
    const ruta = join(dir, "CHANGELOG.md");
    writeFileSync(ruta, backport("### Añadido\n\n- Cosa larga sin resumen."));
    const { codigo, dicho } = correr([ruta]);
    assert.equal(codigo, 0, "sin base no hay como saber que version corta este PR: se mide lo de siempre");
    assert.match(dicho, /^::notice::.*base/m, `falta el ::notice:: que nombra el limite:\n${dicho}`);
    assert.doesNotMatch(dicho, /todavia se pueden mandar/, "afirma haber medido todas las secciones que el aviso puede mandar");
  }));

test("con la base del PR por argumento, main pone ROJA la version cortada por debajo de la mas alta", () =>
  conTemporal((dir) => {
    const ruta = join(dir, "CHANGELOG.md");
    const base = join(dir, "changelog-de-la-base.md");
    writeFileSync(ruta, backport("### Añadido\n\n- Cosa larga sin resumen."));
    writeFileSync(base, BASE_SIN_BACKPORT);
    const { codigo, dicho } = correr([ruta, base]);
    assert.equal(codigo, 1, dicho);
    assert.match(errores(dicho).join("\n"), /\[1\.9\.7\]/);
  }));

test("una base que no se puede leer es ROJO con el arreglo, no una medicion a medias en verde", () =>
  conTemporal((dir) => {
    const ruta = join(dir, "CHANGELOG.md");
    writeFileSync(ruta, BASE_SIN_BACKPORT);
    const { codigo, dicho } = correr([ruta, join(dir, "no-existe.md")]);
    assert.equal(codigo, 1);
    assert.match(errores(dicho).join("\n"), /Arreglo:/);
  }));

// ---------------------------------------------------------------------------
// FO-H4 — el texto de fabrica, tocado apenas, apagaba el centinela
// ---------------------------------------------------------------------------
//
// La igualdad toleraba espacios y caja y nada mas: sacarle el punto final al
// placeholder alcanzaba para que el aviso dijera «no hay ningun cambio sin publicar»
// sobre una version con cambios. Ahora tolera puntuacion, acentos y marcas de enfasis
// SOLO contra el texto de fabrica, que es comparar palabras y no buscar «nada».

const deFabricaCon = (anuncio) =>
  medir(sinPublicarCon(anuncio, ["", "### Añadido", "", "- Una compuerta nueva que pone rojo tu CI."]), LIMITE_POR_DEFECTO, {})
    .hallazgos.filter((h) => h.etiqueta === ENTRADA_SIN_PUBLICAR)
    .map((h) => h.motivo);

test("ROJO PRIMERO: el texto de fabrica sin el punto final, con cambios, sigue siendo ROJO", () => {
  assert.deepEqual(deFabricaCon(PLACEHOLDER_SIN_CAMBIOS.replace(/\.$/, "")), ["placeholder-con-cambios"]);
});

test("ROJO PRIMERO: el texto de fabrica sin acentos o con negrita, con cambios, sigue siendo ROJO", () => {
  const sinAcentos = PLACEHOLDER_SIN_CAMBIOS.normalize("NFD").replace(/[̀-ͯ]/g, "");
  assert.notEqual(sinAcentos, PLACEHOLDER_SIN_CAMBIOS, "el fixture tiene que diferir de verdad");
  assert.deepEqual(deFabricaCon(sinAcentos), ["placeholder-con-cambios"]);
  assert.deepEqual(deFabricaCon(`**${PLACEHOLDER_SIN_CAMBIOS.replace(":", "**:")}`), ["placeholder-con-cambios"]);
});

test("CONTRAPESO: «Nada que hacer hoy.» escrito por una persona junto a cambios sigue verde", () => {
  assert.deepEqual(deFabricaCon("Nada que hacer hoy."), [], "alguien lo penso: no es el texto de fabrica");
});

// ---------------------------------------------------------------------------
// RV-L4-03 — cambios que no estan bajo un encabezado `###`
// ---------------------------------------------------------------------------
//
// El centinela solo contaba como «compania» a los `###`. Viñetas escritas directo
// bajo `## [No publicado]`, o bajo un pseudo-titulo en negrita, dejaban el texto de
// fabrica anunciando «ningun cambio» sobre una version con cambios. El escenario del
// spec dice «la seccion sin publicar declara cambios», no «tiene subsecciones».

const sueltaCon = (suelto) =>
  [
    "# Changelog",
    "",
    `## [${ENTRADA_SIN_PUBLICAR}]`,
    "",
    ...suelto,
    "",
    "### Para consumidores",
    "",
    PLACEHOLDER_SIN_CAMBIOS,
    "",
    "---",
    "",
    "## [1.9.6] — 2026-09-10",
    "",
    "### Para consumidores",
    "",
    "Nada que hacer.",
    "",
  ].join("\n");

const propiosDe = (texto) => medir(texto, LIMITE_POR_DEFECTO, {}).hallazgos.filter((h) => h.etiqueta === ENTRADA_SIN_PUBLICAR);

test("ROJO PRIMERO: viñetas directo bajo [No publicado] con el texto de fabrica son ROJO", () => {
  const propios = propiosDe(sueltaCon(["- **Compuerta nueva** que pone rojo tu PR si falta X."]));
  assert.deepEqual(propios.map((h) => h.motivo), ["placeholder-con-cambios"]);
  assert.match(propios[0].subsecciones.join(" "), /Compuerta nueva/, "y nombra lo que encontro, para que el error sea accionable");
});

test("ROJO PRIMERO: un pseudo-titulo en negrita con viñetas tambien es compania", () => {
  assert.deepEqual(propiosDe(sueltaCon(["**Añadido**", "", "- algo"])).map((h) => h.motivo), ["placeholder-con-cambios"]);
});

test("CONTRAPESO: separadores y comentarios no son cambios, y el texto de fabrica solo sigue verde", () => {
  assert.deepEqual(propiosDe(sueltaCon(["---", "", "<!-- el paso 1 del release deja esto asi -->"])), []);
});

// ---------------------------------------------------------------------------
// RV-L4-02 — que el paso del CI corra la compuerta, y que la compuerta corra
// ---------------------------------------------------------------------------
//
// Dos verdes mudos que ningun caso cazaba. (a) El paso del ci.yml se podia borrar o
// cambiar por `echo omitido` y toda la suite quedaba verde; el paso vecino ya tenia
// banco por nombre (changelog-en-el-pr.test.mjs). (b) La guarda de «programa
// principal» se podia romper —`if (false)`— y la herramienta salia 0 sin medir nada:
// el propio archivo dice que eso «en un paso de CI es un verde mudo», y no habia un
// solo caso que la lanzara como proceso. Los dos se cierran corriendo el texto que
// corre de verdad.

const CI = join(RAIZ, ".github", "workflows", "ci.yml");
const PASO_DEL_AVISO = "El aviso de la proxima version dice que hacer, sin jerga, y entra sin recortarse";

/** Un repositorio de prueba con la base y la cabeza del PR, cada una con su CHANGELOG. */
function repoDelPr(dir, changelogBase, changelogCabeza) {
  const git = (...args) =>
    execFileSync("git", ["-c", "user.name=banco", "-c", "user.email=banco@local", "-c", "commit.gpgsign=false", ...args], {
      cwd: dir,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  git("init", "--quiet", "--initial-branch=main");
  writeFileSync(join(dir, "CHANGELOG.md"), changelogBase);
  git("add", "-A");
  git("commit", "--quiet", "-m", "base");
  const base = git("rev-parse", "HEAD").trim();
  writeFileSync(join(dir, "CHANGELOG.md"), changelogCabeza);
  git("commit", "--quiet", "-am", "cabeza");
  // La herramienta se enlaza DESPUES de los commits: no es parte del PR simulado. Sus
  // imports se resuelven por su ruta real, asi que llegan a la action de este arbol.
  symlinkSync(join(RAIZ, "herramientas"), join(dir, "herramientas"), "junction");
  return base;
}

function correrElPaso(changelogBase, changelogCabeza) {
  const script = scriptDelPaso(PASO_DEL_AVISO, CI);
  const dir = mkdtempSync(join(tmpdir(), "paso-aviso-"));
  try {
    const base = repoDelPr(dir, changelogBase, changelogCabeza);
    const r = spawnSync("bash", ["-c", script], {
      cwd: dir,
      encoding: "utf8",
      env: { ...process.env, BASE: base, RUNNER_TEMP: dir },
    });
    return { script, codigo: r.status, salida: `${r.stdout ?? ""}${r.stderr ?? ""}` };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test("ROJO PRIMERO: el paso del CI, corrido de verdad sobre un PR que corta una version vieja sin resumen, sale 1", () => {
  const { script, codigo, salida } = correrElPaso(BASE_SIN_BACKPORT, backport("### Añadido\n\n- Cosa larga sin resumen."));
  assert.match(script, /node herramientas\/aviso-entra-en-el-mensaje\.mjs CHANGELOG\.md/, "el paso tiene que invocar la compuerta");
  assert.equal(codigo, 1, `el paso salio ${codigo} sobre un PR rojo:\n${salida}`);
  assert.match(salida, /::error[^\n]*\[1\.9\.7\]/, "y el rojo nombra la version que este PR corta");
});

test("CONTROL POSITIVO: el mismo paso sobre un PR con el resumen escrito sale 0", () => {
  const { codigo, salida } = correrElPaso(BASE_SIN_BACKPORT, backport("### Para consumidores\n\nNada que hacer.\n\n### Corregido\n\n- algo"));
  assert.equal(codigo, 0, salida);
});

test("ROJO PRIMERO: lanzada como programa por una ruta con «..», la compuerta mide y sale 1 sobre un changelog rojo", () =>
  conTemporal((dir) => {
    const rojo = join(dir, "CHANGELOG.md");
    writeFileSync(rojo, ["# Changelog", "", `## [${ENTRADA_SIN_PUBLICAR}]`, "", "### Corregido", "", "- algo", ""].join("\n"));
    const r = spawnSync(process.execPath, [join(RAIZ, "pruebas", "..", "herramientas", "aviso-entra-en-el-mensaje.mjs"), rojo], {
      encoding: "utf8",
    });
    assert.equal(r.status, 1, `salio ${r.status}: la guarda de «programa principal» contesto que no y no midio nada\n${r.stdout}${r.stderr}`);
    assert.match(r.stdout, /::error/);
  }));

// ---------------------------------------------------------------------------
// RV-L4-06 — la jerga entre backticks, con el MISMO tope que las paginas
// ---------------------------------------------------------------------------
//
// La compuerta decia cobrar la jerga «con la MISMA regla que las paginas para quien no
// es tecnico», y dejaba afuera todo lo que va entre backticks, «como en esas paginas».
// Pero esas paginas tienen ademas un techo para esa escotilla
// (`TOPE_DE_JERGA_ENTRE_BACKTICKS`, en pruebas/docs/lectura.mjs): una seccion escrita
// entera en jerga entrecomillada salia verde aca y roja alla. Ahora el techo es el mismo,
// importado y no copiado.

test("ROJO PRIMERO: un «Para consumidores» escrito en jerga entre backticks, por encima del tope de las paginas, es ROJO", () => {
  // La reproduccion de la revision: doce fragmentos con jerga, contra un tope de diez.
  const r = medir(
    changelogCon(
      "Actualizá el `workflow`, el `check`, el `token`, el `pipeline`, el `deploy`, el `merge`, el `branch`, " +
        "el `runner`, el `release`, el `tag` y el `payload` en tu `stack`.",
    ),
    LIMITE_POR_DEFECTO,
    {},
  );
  const hallazgos = jergaDe(r);
  assert.equal(hallazgos.length, 1, `la seccion entera en jerga entrecomillada salio verde:\n${JSON.stringify(r.hallazgos)}`);
  assert.equal(hallazgos[0].entreBackticks?.length, 12, "y nombra los fragmentos, que es lo que se reescribe");
});

test("el tope es EL de las paginas, importado: en el tope, verde; uno mas, rojo", () => {
  const conFragmentos = (n) => changelogCon(`Copiá ${SIN_TRADUCCION.slice(0, n).map((p) => `\`${p}\``).join(", ")} tal cual.`);
  assert.deepEqual(jergaDe(medir(conFragmentos(TOPE_DE_JERGA_ENTRE_BACKTICKS), LIMITE_POR_DEFECTO, {})), [], "en el tope");
  assert.equal(jergaDe(medir(conFragmentos(TOPE_DE_JERGA_ENTRE_BACKTICKS + 1), LIMITE_POR_DEFECTO, {})).length, 1, "uno mas");
});

test("el ::error:: de la jerga entre backticks dice cuantos fragmentos y cual es el tope", () => {
  const { codigo, dicho } = conTexto(
    changelogCon(`Copiá ${SIN_TRADUCCION.slice(0, TOPE_DE_JERGA_ENTRE_BACKTICKS + 2).map((p) => `\`${p}\``).join(", ")}.`),
  );
  assert.equal(codigo, 1);
  const error = errores(dicho).join("\n");
  assert.match(error, new RegExp(`${TOPE_DE_JERGA_ENTRE_BACKTICKS + 2} fragmentos entre backticks`));
  assert.match(error, new RegExp(`tope de ${TOPE_DE_JERGA_ENTRE_BACKTICKS}`));
});
