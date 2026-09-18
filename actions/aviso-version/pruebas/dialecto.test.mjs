// Banco del DIALECTO del aviso de versión: markdown (el default) o mrkdwn (Slack).
//
//   node --test actions/aviso-version/pruebas/dialecto.test.mjs
//
// EL DEFECTO QUE ABRE ESTO ESTÁ EN PROJECTS HOY, no es una hipótesis heredada.
// `construirMensaje` escribía su propio encuadre en mrkdwn —`*Qué tiene que hacer un
// consumidor:*`, un asterisco, negrita de Slack— y pegaba debajo el cuerpo del
// CHANGELOG en markdown —`**...**`, negrita de Teams y Discord—. Ningún destino
// renderizaba el mensaje entero bien: en Slack el cuerpo mostraba los asteriscos
// dobles a la vista, y en un destino markdown el encuadre salía en itálica.
//
// Rigel —el marco del que Projects se bifurcó el 2026-08-24— lo pagó sobre su canal
// real, en cinco vueltas (sus commits 8b073e0, 04070a4, b6c689b, a94ad84 y 683343a):
//
//   1. 2026-09-02, 1.15.0: Slack mostraba `**` literales, 12 líneas. El arreglo
//      obvio —`**` a `*` siempre— rompe a Teams y Discord, así que el dialecto es un
//      PARÁMETRO, con markdown de default.
//   2. 2026-09-02: la preferencia se cargó como SECRET y no como VARIABLE; `vars.*` no
//      ve secretos, el workflow cayó al default sin decir nada, y hubo que llegar con
//      una captura del canal. El aviso dice SIEMPRE con qué dialecto armó.
//   3. 2026-09-02: Slack no renderiza negrita que cruce un salto de línea, y el
//      CHANGELOG está cortado a ~80 columnas: 3 de 11 negritas cruzaban.
//   4. 2026-09-02: mrkdwn no tiene tablas; llegaban barras y guiones a la vista.
//   5. 2026-09-09 (su issue #358): una negrita que ENVUELVE código salía cruzada con la
//      vecina, porque la conversión partía el texto por los spans de código. Salió así
//      a sus tres consumidores dos veces. Un comentario afirmaba que el caso «hoy no
//      aparece en el CHANGELOG», y era falso.
//
// Se porta con el quinto arreglo ya puesto: traer la conversión sin él sería portar un
// defecto medido. Y con una mejora sobre el segundo que Rigel no pudo hacer: acá el
// input `formato` NO tiene default en `action.yml` (un valor, un lugar, igual que
// `limite`), así que el script distingue «nadie lo declaró» de «se declaró markdown» y
// lo dice.
//
// Los casos nuevos importan las funciones por el namespace y no por nombre, A
// PROPÓSITO: contra el script anterior, un `import { aMrkdwn }` tumba el archivo entero
// con un único error de carga, y un rojo así no dice qué propiedad faltaba. Por
// namespace, cada caso cae por su propia razón.

import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import * as aviso from "../aviso-version.mjs";

const RAIZ = join(import.meta.dirname, "..", "..", "..");
const CHANGELOG_REAL = join(RAIZ, "CHANGELOG.md");
const ACTION_YML = join(import.meta.dirname, "..", "action.yml");
const WORKFLOW = join(RAIZ, ".github", "workflows", "aviso-version.yml");

/** Un mensaje armado sobre un cuerpo de «Para consumidores», en el dialecto pedido. */
const conCuerpo = (cuerpo, formato = "mrkdwn") =>
  aviso.construirMensaje({
    version: "9.9.9",
    seccion: { encontrada: true, encabezado: "[9.9.9]", cuerpo: `### Para consumidores\n\n${cuerpo}` },
    urlRelease: "https://r",
    urlChangelog: "https://c",
    formato,
  }).mensaje;

/** Tapa el código —cercado y en línea— para afirmar sobre el FORMATO. Un `**` DENTRO
 *  de código es contenido legítimo y tiene que sobrevivir.
 *
 *  SE SUSTITUYE, NO SE BORRA. En Rigel la primera versión de este helper borraba, y
 *  borrar FABRICA el defecto que se busca: `*`mi-repo`*` —una negrita bien convertida
 *  alrededor de un span— se vuelve `**` en cuanto el span desaparece. Medido allá con el
 *  arreglo puesto: borrando, el barrido acusaba 5 entradas; sustituyendo, 2. */
const sinCodigo = (t) => String(t).replace(/```[\s\S]*?```|`[^`\n]*`/g, "CODIGO");

/** Ejecuta main() sin ensuciar la salida del banco. */
async function correr(env) {
  const log = console.log;
  const error = console.error;
  const dicho = [];
  console.log = (...a) => dicho.push(a.join(" "));
  console.error = (...a) => dicho.push(a.join(" "));
  try {
    const codigo = await aviso.main(env);
    return { codigo, dicho: dicho.join("\n") };
  } finally {
    console.log = log;
    console.error = error;
  }
}

async function conTemporal(fn) {
  const dir = mkdtempSync(join(tmpdir(), "aviso-dialecto-"));
  try {
    return await fn(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const CHANGELOG_CHICO = [
  "# Changelog",
  "",
  "## [1.2.0] — 2026-08-19",
  "",
  "### Para consumidores",
  "",
  "**Cablear el paso nuevo.** Va después del install.",
  "",
].join("\n");

// ---------------------------------------------------------------------------
// El dialecto es un parámetro con un conjunto cerrado de valores
// ---------------------------------------------------------------------------

test("los dialectos son dos, y el default es markdown", () => {
  assert.deepEqual([...(aviso.FORMATOS ?? [])], ["markdown", "mrkdwn"]);
  assert.equal(aviso.FORMATO_POR_DEFECTO, "markdown");
  assert.equal(aviso.validarFormato?.(undefined), "markdown", "sin valor cae en el default");
  assert.equal(aviso.validarFormato?.(""), "markdown", "un input vacío es «no declarado», no un dialecto");
  assert.equal(aviso.validarFormato?.("  mrkdwn  "), "mrkdwn", "el espaciado de un YAML no es un typo");
});

test("un dialecto desconocido es ROJO nombrando los que existen y dónde se declara", () => {
  // Un typo en la variable no puede degradar el aviso en silencio: saldría con el
  // dialecto equivocado y nadie sabría por qué.
  assert.equal(typeof aviso.validarFormato, "function", "falta validarFormato");
  assert.throws(() => aviso.validarFormato("mrkdown"), /markdown.*mrkdwn/s);
  assert.throws(() => aviso.validarFormato("slack"), /AVISO_VERSION_FORMATO/);
  assert.throws(() => conCuerpo("algo", "html"), /formato|dialecto/i, "construirMensaje tampoco arma medio mensaje");
});

test("main con un dialecto desconocido es ROJO con el arreglo, y no escribe payload", async () =>
  conTemporal(async (dir) => {
    const changelog = join(dir, "CHANGELOG.md");
    const salida = join(dir, "payload.json");
    writeFileSync(changelog, CHANGELOG_CHICO);
    const { codigo, dicho } = await correr({
      AVISO_VERSION: "1.2.0",
      AVISO_CHANGELOG: changelog,
      AVISO_SALIDA: salida,
      AVISO_FORMATO: "mrkdown",
    });
    assert.equal(codigo, 1, "un typo en el dialecto es configuracion rota, no un default");
    const error = dicho.split("\n").find((l) => l.startsWith("::error::")) ?? "";
    assert.match(error, /"mrkdown"/, `nombra el valor recibido:\n${dicho}`);
    assert.match(error, /markdown.*mrkdwn/, "y los que existen");
    assert.match(error, /Arreglo:/, "y el arreglo, no solo el diagnostico");
    assert.equal(existsSync(salida), false, "no hay payload: un mensaje en el dialecto equivocado no se arma");
  }));

// ---------------------------------------------------------------------------
// mrkdwn traduce; markdown no toca nada
// ---------------------------------------------------------------------------

const CUERPO_CON_FORMATO = "**Hay algo que hacer.** Corre `pnpm install` y lee la [guia](https://ejemplo/g).\n\nLo ~~viejo~~ ya no aplica.";

test("mrkdwn: la negrita llega con UN asterisco y no queda ningún ** a la vista", () => {
  const m = conCuerpo(CUERPO_CON_FORMATO);
  assert.match(m, /\*Hay algo que hacer\.\*/);
  assert.ok(!m.includes("**"), `no queda un solo ** en el mensaje:\n${m}`);
});

test("mrkdwn: los enlaces y el tachado toman la forma de Slack", () => {
  const m = conCuerpo(CUERPO_CON_FORMATO);
  assert.match(m, /<https:\/\/ejemplo\/g\|guia>/);
  assert.ok(!m.includes("[guia]("), "no queda la forma de markdown");
  assert.match(m, /~viejo~/);
  assert.ok(!m.includes("~~"), "no queda el tachado de markdown");
});

test("mrkdwn: un encabezado se lee como título y no como almohadillas sueltas", () => {
  // mrkdwn no tiene encabezados. Una entrada SIN «Para consumidores» viaja con su cuerpo
  // entero, y ahí van los `### Añadido` / `### Corregido` del CHANGELOG.
  assert.equal(typeof aviso.aMrkdwn, "function", "falta aMrkdwn");
  assert.equal(aviso.aMrkdwn("### Añadido\n\n- algo"), "*Añadido*\n\n- algo");
  assert.equal(aviso.aMrkdwn("`### no es un encabezado`"), "`### no es un encabezado`", "ni dentro de código");
});

test("markdown: el default NO convierte nada — Teams y Discord lo necesitan tal cual", () => {
  const m = conCuerpo(CUERPO_CON_FORMATO, "markdown");
  assert.match(m, /\*\*Hay algo que hacer\.\*\*/);
  assert.match(m, /\[guia\]\(https:\/\/ejemplo\/g\)/);
  assert.match(m, /~~viejo~~/);
});

test("ROJO PRIMERO: el encuadre habla el MISMO dialecto que el cuerpo", () => {
  // El defecto que Projects tiene hoy: el encuadre en mrkdwn y el cuerpo en markdown.
  // Se mira en las dos ramas de `construirMensaje`, con y sin «Para consumidores».
  assert.match(conCuerpo("x", "mrkdwn"), /^\*Qué tiene que hacer un consumidor:\*$/m);
  assert.match(conCuerpo("x", "markdown"), /^\*\*Qué tiene que hacer un consumidor:\*\*$/m);

  const sinSeccion = (formato) =>
    aviso.construirMensaje({
      version: "9.9.9",
      seccion: { encontrada: true, encabezado: "[9.9.9]", cuerpo: "### Añadido\n\n- algo" },
      urlRelease: "https://r",
      urlChangelog: "https://c",
      formato,
    }).mensaje;
  assert.match(sinSeccion("markdown"), /\*\*La entrada de esta versión no trae la sección «Para consumidores»\.\*\*/);
  assert.match(sinSeccion("mrkdwn"), /(?<!\*)\*La entrada de esta versión no trae la sección «Para consumidores»\.\*(?!\*)/);
});

test("el código entre backticks NO se toca, aunque tenga un par de ** adentro", () => {
  // El span lleva un PAR completo a propósito: con un solo `**` adentro el caso pasaba
  // igual con la protección apagada (medido en Rigel: 35/35 con la guarda rota).
  const SPAN = "`grep -E '**bold**' archivo`";
  const m = conCuerpo(`Corre ${SPAN} y mira **esto**.`);
  assert.ok(m.includes(SPAN), `el span de código queda intacto:\n${m}`);
  assert.ok(m.includes("mira *esto*."), `la negrita de afuera sí se convierte:\n${m}`);
});

test("un bloque cercado tampoco se toca, ni sus saltos de línea", () => {
  const BLOQUE = "```bash\ngrep -rn '**negrita**' .\nsegunda linea\n```";
  const m = conCuerpo(`${BLOQUE}\n\nY **esto** afuera.`);
  assert.ok(m.includes(BLOQUE), `el bloque cercado queda intacto:\n${m}`);
  assert.ok(m.includes("Y *esto* afuera."), "la negrita de afuera sí se convierte");
});

// ---------------------------------------------------------------------------
// El aviso DICE con qué dialecto armó, y si alguien lo declaró
// ---------------------------------------------------------------------------

test("construirMensaje devuelve el dialecto que USÓ, no el que le pidieron", () => {
  const armado = (formato) =>
    aviso.construirMensaje({
      version: "9.9.9",
      seccion: { encontrada: true, encabezado: "[9.9.9]", cuerpo: "### Para consumidores\n\nnada" },
      urlRelease: "https://r",
      urlChangelog: "https://c",
      formato,
    });
  assert.equal(armado("mrkdwn").dialecto, "mrkdwn");
  assert.equal(armado(" markdown ").dialecto, "markdown");
  assert.equal(armado(undefined).dialecto, "markdown", "el default se normaliza y se nombra");
});

async function noticeDe(env) {
  return conTemporal(async (dir) => {
    const changelog = join(dir, "CHANGELOG.md");
    writeFileSync(changelog, CHANGELOG_CHICO);
    const { codigo, dicho } = await correr({
      AVISO_VERSION: "1.2.0",
      AVISO_CHANGELOG: changelog,
      AVISO_SALIDA: join(dir, "payload.json"),
      ...env,
    });
    assert.equal(codigo, 0, dicho);
    return dicho.split("\n").filter((l) => l.startsWith("::notice::")).join("\n");
  });
}

test("ROJO PRIMERO: sin dialecto declarado, el aviso lo DICE y nombra dónde se declara", async () => {
  // El incidente de Rigel del 2026-09-02: la preferencia cargada como secret, `vars.*`
  // que no la ve, y un default silencioso. La pieza no conoce el destino, pero SÍ sabe
  // que nadie le pasó el input — acá eso se puede decir porque `action.yml` no le pone
  // default a `formato`.
  const notice = await noticeDe({});
  assert.match(notice, /dialecto 'markdown'/, `nombra el dialecto que usó:\n${notice}`);
  assert.match(notice, /nadie lo declar/i, "dice que cayó al default, no que alguien lo eligió");
  assert.match(notice, /AVISO_VERSION_FORMATO=mrkdwn/, "el nombre exacto de lo que hay que declarar para Slack");
  assert.match(notice, /Variables, no Secrets/, "y la pestaña: el error que ya se cometió una vez");
});

test("con mrkdwn declarado, el aviso nombra ESE dialecto y no finge un default", async () => {
  // La otra dirección: un texto fijo no distinguiría nada, que es el defecto que esto arregla.
  const notice = await noticeDe({ AVISO_FORMATO: "mrkdwn" });
  assert.match(notice, /dialecto 'mrkdwn'/);
  assert.doesNotMatch(notice, /dialecto 'markdown'/);
  assert.doesNotMatch(notice, /nadie lo declar/i, "alguien lo declaró");
});

test("markdown declarado explícitamente no se anuncia como caída al default", async () => {
  const notice = await noticeDe({ AVISO_FORMATO: "markdown" });
  assert.match(notice, /dialecto 'markdown'/);
  assert.doesNotMatch(notice, /nadie lo declar/i);
});

test("el resumen de la corrida lleva el dialecto junto al resto del diagnóstico", async () =>
  conTemporal(async (dir) => {
    const changelog = join(dir, "CHANGELOG.md");
    const resumen = join(dir, "resumen.md");
    writeFileSync(changelog, CHANGELOG_CHICO);
    writeFileSync(resumen, "");
    // `resumir` escribe en el GITHUB_STEP_SUMMARY del PROCESO, no en el `env` que recibe
    // `main`: es el archivo que GitHub le da al paso. Se apunta a uno temporal y se
    // restaura, para no escribir en el resumen de la corrida que ejecuta este banco.
    const previo = process.env.GITHUB_STEP_SUMMARY;
    process.env.GITHUB_STEP_SUMMARY = resumen;
    let codigo;
    try {
      ({ codigo } = await correr({
        AVISO_VERSION: "1.2.0",
        AVISO_CHANGELOG: changelog,
        AVISO_SALIDA: join(dir, "payload.json"),
        AVISO_FORMATO: "mrkdwn",
      }));
    } finally {
      if (previo === undefined) delete process.env.GITHUB_STEP_SUMMARY;
      else process.env.GITHUB_STEP_SUMMARY = previo;
    }
    assert.equal(codigo, 0);
    assert.match(readFileSync(resumen, "utf8"), /- Dialecto: `mrkdwn`/);
  }));

// ---------------------------------------------------------------------------
// El corte de línea del CHANGELOG no viaja al chat
// ---------------------------------------------------------------------------

/** Los spans de negrita de mrkdwn que cruzan un salto de línea: Slack no los renderiza. */
const negritasQueCruzan = (m) => [...sinCodigo(m).matchAll(/(?<!\*)\*([^*\n][^*]*?)\*(?!\*)/g)].filter((s) => s[1].includes("\n"));

test("mrkdwn: la negrita cortada en dos líneas de un PÁRRAFO llega en una sola", () => {
  const m = conCuerpo("**Una negrita larga que el CHANGELOG\ncorta en dos lineas.** Y sigue.");
  assert.match(m, /\*Una negrita larga que el CHANGELOG corta en dos lineas\.\*/);
  assert.deepEqual(negritasQueCruzan(m).map((s) => s[0]), []);
});

test("ROJO PRIMERO: mrkdwn: la negrita de una VIÑETA envuelta también llega en una sola línea", () => {
  // LO QUE RIGEL DEJÓ ABIERTO, y en Projects es el caso común. Su `desenvolverParrafos`
  // no junta la continuación de un ítem —su propio comentario lo dice—, así que una
  // negrita que arranca en la viñeta y sigue en la línea indentada de abajo llega a
  // Slack con los asteriscos a la vista. El CHANGELOG de Projects escribe casi todo en
  // viñetas envueltas: ver el barrido contra el archivo real, más abajo.
  const m = conCuerpo(
    ["- **Una viñeta cuya negrita sigue", "  en la línea de abajo.** Y el resto.", "- Otra viñeta."].join("\n"),
  );
  assert.match(m, /^- \*Una viñeta cuya negrita sigue en la línea de abajo\.\* Y el resto\.$/m);
  assert.match(m, /\n- Otra viñeta\./, "la viñeta siguiente sigue en su línea");
  assert.deepEqual(negritasQueCruzan(m).map((s) => s[0]), []);
});

test("desenvolver NO junta lo que es estructura", () => {
  assert.equal(typeof aviso.desenvolverParrafos, "function", "falta desenvolverParrafos");
  const r = aviso.desenvolverParrafos(
    [
      "- primera vineta",
      "- segunda vineta",
      "  1. un item numerado adentro",
      "",
      "| a | b |",
      "| --- | --- |",
      "| 1 | 2 |",
      "",
      "> una cita",
      "> que sigue",
      "",
      "### Un encabezado",
      "Un parrafo que si",
      "se junta.",
      "---",
    ].join("\n"),
  );
  assert.match(r, /- primera vineta\n- segunda vineta\n {2}1\. un item numerado adentro/, "cada ítem en su línea");
  assert.match(r, /\| --- \| --- \|\n\| 1 \| 2 \|/, "las filas de tabla no se juntan");
  assert.match(r, /> una cita\n> que sigue/, "las citas conservan su corte");
  assert.match(r, /### Un encabezado\nUn parrafo que si se junta\.\n---/, "el párrafo sí, el encabezado y la regla no");
});

test("markdown: el default NO desenvuelve — su corte de línea no molesta a nadie", () => {
  assert.match(conCuerpo("Un parrafo que\nsigue cortado.", "markdown"), /Un parrafo que\nsigue cortado\./);
});

// ---------------------------------------------------------------------------
// Las tablas: mrkdwn no las tiene
// ---------------------------------------------------------------------------

const TABLA = ["| Repo | Resultado | Por qué |", "| --- | --- | --- |", "| alfa | verde | ya cumple |", "| beta | rojo | le falta |"].join("\n");

test("mrkdwn: una tabla se vuelve lista, con el encabezado etiquetando cada valor", () => {
  const m = conCuerpo(TABLA);
  assert.ok(!m.includes("|"), `no queda ni una barra de tabla:\n${m}`);
  assert.ok(!m.includes("---"), "ni la línea del separador");
  assert.match(m, /- \*alfa\* — Resultado: verde · Por qué: ya cumple/);
  assert.match(m, /- \*beta\* — Resultado: rojo · Por qué: le falta/);
});

test("mrkdwn: la fila con código entre backticks no desbalancea los asteriscos", () => {
  const m = conCuerpo(["| Repo | Estado |", "| --- | --- |", "| `mi-repo` | verde **listo** |"].join("\n"));
  assert.ok(!sinCodigo(m).includes("**"), `no queda un solo ** fuera de código:\n${m}`);
  assert.match(m, /- \*`mi-repo`\* — Estado: verde \*listo\*/);
});

test("tablasALista emite el sujeto en MARKDOWN y no envuelve uno que ya trae negrita", () => {
  // La traducción es de la pasada de inline, en un solo lugar. Y `**` alrededor de un
  // `**` deja `****`, que no empareja en ningún dialecto: medido en la 1.9.0 de Rigel.
  assert.equal(typeof aviso.tablasALista, "function", "falta tablasALista");
  const tabla = (celda) => ["| Repo | Estado |", "| --- | --- |", `| ${celda} | verde |`].join("\n");
  assert.match(aviso.tablasALista(tabla("`mi-repo`")), /^- \*\*`mi-repo`\*\* — Estado: verde$/m);
  assert.match(aviso.tablasALista(tabla("**ya en negrita**")), /^- \*\*ya en negrita\*\* — Estado: verde$/m);
});

test("una línea con barras que NO es tabla, y un bloque cercado con barras, quedan como están", () => {
  assert.match(conCuerpo("| esto no es una tabla, no tiene separador |"), /\| esto no es una tabla/);
  const BLOQUE = "```\n| a | b |\n| --- | --- |\n| 1 | 2 |\n```";
  assert.ok(conCuerpo(BLOQUE).includes(BLOQUE), "dentro de un bloque una barra es contenido");
});

test("markdown: el default NO convierte tablas — Teams y Discord las renderizan", () => {
  assert.match(conCuerpo(TABLA, "markdown"), /\| alfa \| verde \| ya cumple \|/);
});

// ---------------------------------------------------------------------------
// La negrita que envuelve código llega emparejada
// ---------------------------------------------------------------------------

test("ROJO PRIMERO: una negrita que ENVUELVE código en línea se convierte entera", () => {
  // La forma exacta de la línea que Rigel mandó con su 2.0.0: dos negritas vecinas, la
  // primera envolviendo dos spans. Partiendo por los spans, el `**` de apertura se
  // emparejaba con el de la vecina: `...versión.* La versión exigible es *la publicada**`.
  const m = conCuerpo("Se retira **la salida `exigible_desde` de `actions/constitucion`** y la exigible es **la publicada**.");
  assert.ok(!sinCodigo(m).includes("**"), `no puede quedar un solo ** fuera de código:\n${m}`);
  assert.match(m, /\*la salida `exigible_desde` de `actions\/constitucion`\* y la exigible es \*la publicada\*\./);
});

test("ROJO PRIMERO: un span con ** adentro no cierra la negrita que lo envuelve", () => {
  // La otra dirección, y la que decide CÓMO se arregla: si el código solo «ganara la
  // carrera del scan», la negrita de afuera se cerraría contra el `**` de adentro.
  const SPAN = "`grep -E '**x**' .`";
  const m = conCuerpo(`Usa **el comando ${SPAN} de una vez** y listo.`);
  assert.ok(m.includes(SPAN), `el span queda intacto:\n${m}`);
  assert.match(m, /\*el comando `grep -E '\*\*x\*\*' \.` de una vez\* y listo\./, `con su par completo:\n${m}`);
});

test("apartarCodigo restaura el texto aunque ya traiga el carácter del centinela", () => {
  assert.equal(typeof aviso.apartarCodigo, "function", "falta apartarCodigo");
  const texto = "a   b `c` d    e ```\nf\n``` g";
  const { conCentinelas, restaurar } = aviso.apartarCodigo(texto);
  assert.ok(!conCentinelas.includes("`c`"), "el código queda apartado");
  assert.equal(restaurar(conCentinelas), texto, "y vuelve exacto");
});

// ---------------------------------------------------------------------------
// EL BARRIDO CONTRA EL CHANGELOG REAL
//
// Ninguna fixture sintética reprodujo en Rigel el defecto de la negrita que envuelve
// código: vivía en la interacción entre la conversión y cómo está escrito el archivo.
// Así que se barre el texto de hoy, TODAS las entradas versionadas —el botón del
// workflow reenvía cualquiera, y es una operación soportada— y `[No publicado]`, que
// es la que se escribe en cada PR y la que hace que esto falle solo el día que alguien
// redacte algo que la conversión no sabe llevar.
// ---------------------------------------------------------------------------

/** El mensaje en mrkdwn de una sección del CHANGELOG real, sin techo de largo. */
function mrkdwnDe(changelog, etiqueta) {
  const seccion = aviso.extraerSeccionVersion(changelog, etiqueta);
  assert.ok(seccion.encontrada, `el CHANGELOG no tiene la sección [${etiqueta}]`);
  return aviso.construirMensaje({
    version: aviso.esVersionSemver(etiqueta) ? etiqueta : "9.99.99",
    seccion,
    urlRelease: "https://r",
    urlChangelog: "https://c",
    limite: Number.MAX_SAFE_INTEGER,
    formato: "mrkdwn",
  }).mensaje;
}

/** Qué ensucia un mensaje mrkdwn: `**` fuera de código y negritas que cruzan un salto. */
function suciedad(m) {
  const dobles = (sinCodigo(m).match(/\*\*/g) ?? []).length;
  const cruzan = negritasQueCruzan(m).length;
  return { dobles, cruzan };
}

/**
 * RESIDUO DECLARADO, por entrada y con lista exacta.
 *
 * Se compara con `deepEqual` y no con un filtro de excepciones: una entrada NUEVA que se
 * ensucie pone rojo, y una de esta lista que se limpie TAMBIÉN pone rojo, pidiendo que
 * se la saque. Una excepción que sobrevive a su causa es cómo se enseña a ignorar un
 * check.
 */
const RESIDUO_HISTORICO = [];

test("ROJO PRIMERO: ninguna entrada versionada del CHANGELOG real llega sucia a Slack", () => {
  const changelog = readFileSync(CHANGELOG_REAL, "utf8");
  const versiones = [...changelog.matchAll(/^##\s+\[([^\]]+)\]/gm)].map((m) => m[1]).filter((v) => aviso.esVersionSemver(v));
  assert.ok(versiones.length > 10, `el barrido tiene que encontrar entradas, encontró ${versiones.length}`);

  const sucias = [];
  for (const version of versiones) {
    const { dobles, cruzan } = suciedad(mrkdwnDe(changelog, version));
    if (dobles || cruzan) sucias.push(`${version} (${dobles} dobles, ${cruzan} cruzan)`);
  }
  assert.deepEqual(
    sucias,
    RESIDUO_HISTORICO,
    `entradas que llegan a Slack con asteriscos a la vista: ${sucias.join(", ") || "ninguna"}. ` +
      `El residuo declarado es [${RESIDUO_HISTORICO.join(", ")}]: si la lista quedó corta hay un defecto nuevo en ` +
      "la conversión de actions/aviso-version/aviso-version.mjs (aMrkdwn); si quedó larga, hay una excepción que sacar",
  );
});

test("ROJO PRIMERO: la sección [No publicado] del CHANGELOG real tampoco llega sucia a Slack", () => {
  const m = mrkdwnDe(readFileSync(CHANGELOG_REAL, "utf8"), "No publicado");
  assert.deepEqual(
    suciedad(m),
    { dobles: 0, cruzan: 0 },
    "la sección que se está escribiendo ya sale con asteriscos a la vista en mrkdwn. Arreglo: si es un caso " +
      "que la conversión no conoce, enseñárselo en aMrkdwn; si es un texto roto (un ** sin cerrar, un span de " +
      "código cortado en dos líneas), arreglar el texto del CHANGELOG",
  );
});

// ---------------------------------------------------------------------------
// El contrato: action.yml y el workflow del marco
// ---------------------------------------------------------------------------

/** El bloque de un input de action.yml, desde su clave hasta la siguiente. */
function bloqueDelInput(yml, nombre) {
  const desde = yml.indexOf(`\n  ${nombre}:`);
  if (desde === -1) return null;
  const resto = yml.slice(desde + 1);
  const hasta = resto.slice(3).search(/\n {2}\S+:|\n\S/);
  return hasta === -1 ? resto : resto.slice(0, hasta + 3);
}

test("ROJO PRIMERO: action.yml declara `formato`, opcional y SIN default, y lo pasa al script", () => {
  // Un valor, un lugar, igual que `limite`: el default vive en FORMATO_POR_DEFECTO. Y hay
  // una razón más, propia de este input: sin default en el YAML, el script distingue
  // «nadie lo declaró» de «se declaró markdown», que es lo que el ::notice:: dice.
  const yml = readFileSync(ACTION_YML, "utf8");
  const bloque = bloqueDelInput(yml, "formato");
  assert.ok(bloque, "action.yml no declara el input `formato`");
  assert.match(bloque, /required:\s*false/, "opcional: un consumidor que no lo pasa no se rompe");
  assert.doesNotMatch(
    bloque,
    /^\s{4}default:/m,
    "el input `formato` declara default: ese valor viaja como AVISO_FORMATO, le gana a FORMATO_POR_DEFECTO y " +
      "apaga la distincion entre declarado y no declarado. Arreglo: quitar el `default` del input en action.yml",
  );
  assert.match(yml, /AVISO_FORMATO:\s*\$\{\{\s*inputs\.formato\s*\}\}/, "el input llega al script como AVISO_FORMATO");
});

test("ROJO PRIMERO: el workflow del marco lee el dialecto de VARIABLES, sin default propio", () => {
  const wf = readFileSync(WORKFLOW, "utf8");
  const linea = wf.split("\n").find((l) => /^\s+formato:/.test(l)) ?? "";
  assert.match(linea, /\$\{\{\s*vars\.AVISO_VERSION_FORMATO\s*\}\}/, `el paso del aviso no pasa el dialecto:\n${linea}`);
  assert.doesNotMatch(linea, /\|\|/, "un `|| 'markdown'` acá vuelve a esconder que nadie lo declaró");
});

/** El `run:` de un paso del workflow, por su nombre. */
function runDelPaso(wf, nombre) {
  const i = wf.indexOf(`- name: ${nombre}`);
  if (i === -1) return null;
  const desdeRun = wf.indexOf("run: |", i);
  const siguientePaso = wf.indexOf("\n      - ", i + 1);
  if (desdeRun === -1 || (siguientePaso !== -1 && desdeRun > siguientePaso)) return null;
  const lineas = wf.slice(desdeRun).split("\n").slice(1);
  const cuerpo = [];
  for (const l of lineas) {
    if (l.trim() !== "" && !/^ {10}/.test(l)) break;
    cuerpo.push(l.slice(10));
  }
  return cuerpo.join("\n");
}

const PASO_DEL_SECRET = "Revisar donde esta declarado el dialecto";

test("ROJO PRIMERO: el dialecto cargado como SECRET se denuncia en la corrida, con el arreglo", () => {
  // El incidente de Rigel, cerrado donde se puede cerrar de verdad: el workflow SÍ puede
  // preguntar si existe un secret con ese nombre —sin leer su valor— y decirlo.
  const wf = readFileSync(WORKFLOW, "utf8");
  const script = runDelPaso(wf, PASO_DEL_SECRET);
  assert.ok(script, `aviso-version.yml no tiene el paso "${PASO_DEL_SECRET}"`);

  const correrPaso = (enSecrets, enVars) =>
    spawnSync("bash", ["-c", script], {
      encoding: "utf8",
      env: { PATH: process.env.PATH, DIALECTO_EN_SECRETS: enSecrets, DIALECTO_EN_VARS: enVars },
    });

  const mal = correrPaso("true", "");
  assert.equal(mal.status, 0, "no detiene el aviso: el release ya salió y el mensaje igual se manda");
  assert.match(mal.stdout, /^::warning::/m, `tiene que advertirlo:\n${mal.stdout}${mal.stderr}`);
  assert.match(mal.stdout, /Variables/, "con el arreglo: la pestaña donde va");
  assert.match(mal.stdout, /no ve secretos/, "y por qué no alcanza con el secret");
  assert.match(mal.stdout, /dialecto 'markdown', el default/, "y con qué dialecto se armó de verdad");

  // Con la variable TAMBIÉN puesta, el secret sobra y el dialecto es el de la variable:
  // la advertencia no puede decir que cayó al default.
  const doble = correrPaso("true", "mrkdwn");
  assert.match(doble.stdout, /dialecto 'mrkdwn', el de la variable/, doble.stdout);
  assert.doesNotMatch(doble.stdout, /el default/, doble.stdout);

  const bien = correrPaso("false", "mrkdwn");
  assert.equal(bien.status, 0);
  assert.doesNotMatch(bien.stdout, /::warning::/, "con el dialecto en Variables no hay nada que advertir");
});

test("el paso que mira el secret nunca lleva su VALOR al entorno, solo si existe", () => {
  const wf = readFileSync(WORKFLOW, "utf8");
  const usos = wf.match(/secrets\.AVISO_VERSION_FORMATO[^}]*\}\}/g) ?? [];
  assert.ok(usos.length > 0, "el workflow no mira el secret");
  for (const u of usos) {
    assert.match(u, /^secrets\.AVISO_VERSION_FORMATO\s*!=\s*''\s*\}\}$/, `el valor del secret no entra al entorno: ${u}`);
  }
});
