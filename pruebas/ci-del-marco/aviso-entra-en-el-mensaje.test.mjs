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
// UN SOLO DIALECTO. Rigel mide markdown y mrkdwn porque su aviso traduce; el de
// Projects manda Markdown tal cual (action.yml, «LIMITES DECLARADOS»), asi que cada
// seccion se mide una vez. El dia que el aviso aprenda un segundo dialecto, esta
// compuerta tiene que medir los dos: la conversion cambia el largo.

import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { LIMITE_POR_DEFECTO, main as mainDelAviso } from "../../actions/aviso-version/aviso-version.mjs";
import {
  ENTRADA_SIN_PUBLICAR,
  PLACEHOLDER_SIN_CAMBIOS,
  esPlaceholderConCambios,
  main,
  medir,
  versionMasAlta,
} from "../../herramientas/aviso-entra-en-el-mensaje.mjs";

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

/** Lo que la action escribe de verdad para una version, con el limite que se le pase. */
async function payloadDelAviso(dir, changelog, version, limite) {
  const salida = join(dir, `payload-${version}.json`);
  const log = console.log;
  console.log = () => {};
  let codigo;
  try {
    codigo = await mainDelAviso({
      AVISO_VERSION: version,
      AVISO_CHANGELOG: changelog,
      AVISO_SALIDA: salida,
      AVISO_LIMITE: limite === null ? "" : String(limite),
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
  assert.ok(c.largo > 0, "reporta el largo");
  assert.equal(c.sinParaConsumidores, false, "el fixture trae el encabezado, y la compuerta lo ve");
});

test("una seccion que se pasa del limite es ROJO, con el largo REAL", () => {
  const r = medir(changelogCon(rellenoQuePasa(LIMITE_POR_DEFECTO)), LIMITE_POR_DEFECTO, {});
  assert.equal(r.hallazgos.length, 1);
  const [h] = r.hallazgos;
  assert.equal(h.etiqueta, ENTRADA_SIN_PUBLICAR, "el hallazgo nombra la seccion que lo produjo");
  assert.equal(h.motivo, "recorte");
  assert.ok(
    h.largo > LIMITE_POR_DEFECTO,
    `el largo reportado (${h.largo}) tiene que ser el REAL, no el del mensaje ya recortado: ` +
      "reportar un numero menor al limite convierte el diagnostico en un acertijo",
  );
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
  assert.ok(c.largo < LIMITE_POR_DEFECTO, `el cuerpo entra (${c.largo} de ${LIMITE_POR_DEFECTO}): el rojo no es por el largo`);
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
    // se compara contra el payload que la action escribe de verdad.
    const m = /Y no llega ni siquiera entero: se recorta a (\d+)/.exec(err[0]);
    assert.ok(m, `el error tiene que decir cuanto llega de verdad:\n${err[0]}`);
    assert.equal(Number(m[1]), (await payloadDelAviso(dir, changelog, "3.1.0", null)).length);
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
    assert.equal(err.length, 1);
    assert.match(err[0], /acortar la seccion «Para consumidores»/);
    assert.match(err[0], /se recortaria/);
  }));

test("el limite se puede subir, y entonces la misma seccion entra", () => {
  const relleno = rellenoQuePasa(LIMITE_POR_DEFECTO);
  assert.equal(medir(changelogCon(relleno), LIMITE_POR_DEFECTO, {}).hallazgos.length, 1, "con el limite normal, rojo");
  assert.deepEqual(medir(changelogCon(relleno), 100000, {}).hallazgos, [], "subir el input `limite` es una salida legitima");
});

// ---------------------------------------------------------------------------
// La seccion recien cortada: el PR de release
// ---------------------------------------------------------------------------

test("EL PR DE RELEASE: mide la version recien cortada, no solo el [No publicado] vacio", () => {
  const r = medir(changelogRecienCortado("1.10.0", rellenoQuePasa(LIMITE_POR_DEFECTO)), LIMITE_POR_DEFECTO, {});
  const recortes = r.hallazgos.filter((h) => h.motivo === "recorte");
  assert.equal(recortes.length, 1, "la seccion cortada se pasa, y el PR de release tiene que verlo");
  assert.equal(recortes[0].etiqueta, "1.10.0", "el hallazgo sale de la version recien cortada, que es la que el `release` va a mandar");
  assert.ok(recortes[0].largo > LIMITE_POR_DEFECTO);
});

test("el [No publicado] recien vaciado no tapa a la version cortada, ni suma hallazgos propios", () => {
  const r = medir(changelogRecienCortado("1.10.0", rellenoQuePasa(LIMITE_POR_DEFECTO)), LIMITE_POR_DEFECTO, {});
  const sinPublicar = r.candidatos.find((c) => c.etiqueta === ENTRADA_SIN_PUBLICAR);
  assert.ok(sinPublicar, "se mide igual: es la seccion que escribe el PR siguiente");
  assert.ok(sinPublicar.largo < LIMITE_POR_DEFECTO, "el [No publicado] vaciado entra: ese verde es el que tapaba el problema");
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
  assert.deepEqual(r.hallazgos.map((h) => [h.etiqueta, h.motivo]), [[ENTRADA_SIN_PUBLICAR, "recorte"]]);
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
    const declarado = defaultDeActionYml();
    const limite = declarado === null ? LIMITE_POR_DEFECTO : Number(declarado);
    const cortada = medir(readFileSync(CHANGELOG_REAL, "utf8"), limite, {}).candidatos.find((c) => !c.estimada);
    assert.ok(cortada, "el CHANGELOG de este repo tiene al menos una version publicada");

    const enviado = await payloadDelAviso(dir, CHANGELOG_REAL, cortada.version, declarado);
    const armadoSinTecho = await payloadDelAviso(dir, CHANGELOG_REAL, cortada.version, Number.MAX_SAFE_INTEGER);
    assert.equal(
      cortada.largo,
      armadoSinTecho.length,
      `la compuerta mide ${cortada.largo} y la action arma ${armadoSinTecho.length}: una compuerta que mide otro ` +
        "mensaje que el que se envia no vigila nada",
    );
    assert.equal(cortada.llega, enviado.length, `la compuerta dice que llegan ${cortada.llega} y la action manda ${enviado.length}`);
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
