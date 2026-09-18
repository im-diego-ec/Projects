// Banco de pruebas del aviso de versión. Corre con `node --test`, el runner que
// trae Node 22: cero dependencias, igual que el resto del marco.
//
//   node --test actions/aviso-version/pruebas/aviso-version.test.mjs
//
// Por qué existe. El aviso no se puede probar disparándolo: eso exige un
// secreto, un canal real y publicar un release. Toda la estrategia de
// verificación consiste en que la pieza que ARMA el mensaje sea pura —lee un
// archivo, devuelve texto— y por lo tanto ejercitable acá y a mano. Lo que queda
// sin cubrir es el envío, que son cinco líneas de bash sin lógica de formato, y
// eso está declarado en el design en vez de disimulado.
//
// El caso más importante de todos es el último: `main` corriendo contra el
// CHANGELOG REAL de este repo. Un cambio de formato del changelog —que es un
// archivo que se edita a mano en cada PR— rompe el aviso en silencio, y esta
// prueba es lo único que lo convierte en rojo.

import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  construirMensaje,
  construirPayload,
  esVersionSemver,
  extraerParaConsumidores,
  extraerSeccionVersion,
  limpiarBordes,
  lineasBreaking,
  main,
  normalizarVersion,
  recortar,
  LIMITE_POR_DEFECTO,
} from "../aviso-version.mjs";

const SCRIPT = join(import.meta.dirname, "..", "aviso-version.mjs");
const CHANGELOG_REAL = join(import.meta.dirname, "..", "..", "..", "CHANGELOG.md");
/** La configuracion con la que el andamio recibe el bump del marco. Es la fuente del
 *  canal que el preambulo nombra: ver «el preambulo nombra el canal» mas abajo. */
const DEPENDABOT_DEL_ANDAMIO = join(import.meta.dirname, "..", "..", "..", "plantilla", ".github", "dependabot.yml");

/** Un changelog sintético con la forma exacta del real: encabezado de archivo,
 *  "No publicado", dos versiones y separadores `---` entre ellas. */
const CHANGELOG = `# Changelog

Prosa del encabezado que no es de ninguna versión.

---

## [No publicado]

Nada todavía.

---

## [1.2.0] — 2026-08-19

Resumen de la versión.

### Añadido

- Una cosa nueva.

### Para consumidores

**Cablear el paso nuevo.** Va después del install:

\`\`\`yaml
- uses: {{ORG}}/Projects/actions/censo-fuentes@v1
\`\`\`

Nada más.

### Antes de mover \`v1\`

Esto es del builder, no del consumidor.

---

## [1.1.0] — 2026-08-18

### Añadido

- BREAKING: se renombró un job y el check requerido cambia de nombre.

### Para consumidores

Actualizar el nombre del check en el ruleset.
`;

/** Ejecuta main() sin ensuciar la salida del banco. */
async function correr(env) {
  const log = console.log;
  const error = console.error;
  const dicho = [];
  console.log = (...a) => dicho.push(a.join(" "));
  console.error = (...a) => dicho.push(a.join(" "));
  try {
    const codigo = await main(env);
    return { codigo, dicho: dicho.join("\n") };
  } finally {
    console.log = log;
    console.error = error;
  }
}

// `await fn(dir)` y no `return fn(dir)`: sin el await, el finally borraría el
// directorio ANTES de que el caso asíncrono lo use, y los casos que dependen del
// payload en disco fallarían por una razón que no es la suya.
async function conTemporal(fn) {
  const dir = mkdtempSync(join(tmpdir(), "aviso-"));
  try {
    return await fn(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

// ---------------------------------------------------------------------------
// Localizar la versión en el changelog
// ---------------------------------------------------------------------------

test("el tag del release y el título del changelog son la misma versión", () => {
  assert.equal(normalizarVersion("v1.2.0"), "1.2.0");
  assert.equal(normalizarVersion("1.2.0"), "1.2.0");
  assert.equal(normalizarVersion(" v1.2.0 "), "1.2.0");
  assert.equal(normalizarVersion(undefined), "");
});

test("extrae el cuerpo de la versión pedida y no el de la de al lado", () => {
  const s = extraerSeccionVersion(CHANGELOG, "1.2.0");
  assert.equal(s.encontrada, true);
  assert.match(s.encabezado, /^\[1\.2\.0\]/);
  assert.match(s.cuerpo, /Una cosa nueva/);
  // El corte es en el siguiente encabezado de nivel 2: nada de 1.1.0 se filtra.
  assert.doesNotMatch(s.cuerpo, /1\.1\.0|Actualizar el nombre del check/);
  // Y el separador `---` que el formato deja entre versiones no viaja.
  assert.doesNotMatch(s.cuerpo, /-{3,}\s*$/);
});

test("acepta el tag con v, que es como lo publica el release", () => {
  assert.equal(extraerSeccionVersion(CHANGELOG, "v1.2.0").cuerpo, extraerSeccionVersion(CHANGELOG, "1.2.0").cuerpo);
});

test("«No publicado» no es una versión: no se confunde con ninguna", () => {
  assert.equal(extraerSeccionVersion(CHANGELOG, "No publicado").encontrada, true);
  assert.equal(extraerSeccionVersion(CHANGELOG, "1.3.0").encontrada, false);
  assert.equal(extraerSeccionVersion(CHANGELOG, "").encontrada, false);
});

test("una versión que no existe NO devuelve el cuerpo de otra", () => {
  // El modo de fallo caro: avisar de 1.3.0 con el texto de 1.2.0. Que no haya
  // entrada es rojo (lo verifica la prueba de main), nunca un mensaje ajeno.
  const s = extraerSeccionVersion(CHANGELOG, "9.9.9");
  assert.equal(s.encontrada, false);
  assert.equal(s.cuerpo, "");
});

// ---------------------------------------------------------------------------
// La sección accionable
// ---------------------------------------------------------------------------

test("«Para consumidores» sale verbatim y termina en el encabezado siguiente", () => {
  const { cuerpo } = extraerSeccionVersion(CHANGELOG, "1.2.0");
  const p = extraerParaConsumidores(cuerpo);
  assert.equal(p.encontrada, true);
  assert.match(p.texto, /Cablear el paso nuevo/);
  assert.match(p.texto, /censo-fuentes@v1/); // el bloque de código entero viaja
  assert.match(p.texto, /Nada más\.$/);
  // No se lleva la sección siguiente, que es del builder y no del consumidor.
  assert.doesNotMatch(p.texto, /Antes de mover|del builder/);
});

test("una variante de redacción del encabezado no apaga el aviso", () => {
  const p = extraerParaConsumidores("### para CONSUMIDORES — lo imprescindible\n\ntexto\n");
  assert.equal(p.encontrada, true);
  assert.equal(p.texto, "texto");
});

test("sin la sección, lo dice: no devuelve texto vacío como si estuviera", () => {
  const p = extraerParaConsumidores("### Añadido\n\n- algo\n");
  assert.equal(p.encontrada, false);
  assert.equal(p.texto, "");
});

// ---------------------------------------------------------------------------
// BREAKING: propiedad del texto, no lista mantenida a mano
// ---------------------------------------------------------------------------

test("detecta BREAKING al inicio de línea, con y sin viñeta o negrita", () => {
  const encontradas = lineasBreaking(
    ["- BREAKING: cambia el nombre del check", "**BREAKING** se quita un input", "  - **BREAKING:** otra", "texto normal"].join("\n")
  );
  assert.equal(encontradas.length, 3);
});

test("ROJO PRIMERO: una viñeta BREAKING ENVUELTA llega entera, no cortada a mitad de frase", () => {
  // EL CASO QUE FALTABA. Esta funcion filtraba lineas FISICAS y devolvia solo la que
  // matchea. La unica viñeta BREAKING del `[No publicado]` de este repo —CHANGELOG.md,
  // «BREAKING para quien ya tuviera un sitio generado»— viene envuelta en cuatro
  // lineas, y el aviso del proximo release iba a publicar solo la primera: «…—hoy,
  // nadie—: `produccion`» y ahi terminaba, sin decir QUE cambia. Medido el 2026-09-17.
  //
  // El banco pasaba en verde con el defecto puesto: sus viñetas eran todas de una
  // linea. Lo mismo le paso a Rigel —el marco del que Projects se bifurco— con el
  // anuncio de su 2.0.0 (commit 0363a05): un banco que no distingue el arreglo del
  // defecto no acredita nada. Envolver a ~88 columnas es lo que hace cualquiera que
  // escribe, y lo que hace prettier.
  const [linea] = lineasBreaking(
    [
      "- **BREAKING · se retira la salida `exigible_desde`, y con ella la",
      "  segunda fecha de cada versión.** La versión exigible es **la publicada**.",
      "",
      "- Otra viñeta que no es breaking.",
    ].join("\n"),
  );
  assert.match(linea, /segunda fecha de cada versión/, "se perdio el sujeto: QUE se retira");
  assert.match(linea, /La versión exigible es \*\*la publicada\*\*/, "se perdio la consecuencia");
  assert.equal((linea.match(/\*\*/g) ?? []).length % 2, 0, "quedo un `**` sin cerrar: el canal muestra los asteriscos");
  assert.doesNotMatch(linea, /Otra viñeta/, "se comio la viñeta siguiente: la continuacion termina donde arranca otra");
});

test("ROJO PRIMERO: el mensaje lleva la viñeta BREAKING envuelta completa, con su consecuencia", () => {
  // La misma propiedad vista desde lo que llega al canal y no desde la funcion: el
  // bloque BREAKING del mensaje es lo PRIMERO que lee un consumidor.
  const seccion = {
    encontrada: true,
    encabezado: "[2.0.0]",
    cuerpo: [
      "### Cambiado",
      "",
      "- **BREAKING para quien ya tuviera un sitio generado** —hoy, nadie—: `produccion`",
      "  ya no se dispara por `workflow_run`. Un merge que antes publicaba, ahora sube a DEV",
      "  y espera.",
      "",
      "### Para consumidores",
      "",
      "Promover a mano con el boton.",
    ].join("\n"),
  };
  const { mensaje } = construirMensaje({ version: "2.0.0", seccion, urlRelease: "https://ejemplo/r", urlChangelog: "https://ejemplo/c" });
  const bloque = mensaje.slice(mensaje.indexOf("BREAKING —"), mensaje.indexOf("Qué tiene que hacer"));
  assert.match(bloque, /ya no se dispara por `workflow_run`/, `el bloque BREAKING perdio que cambia:\n${bloque}`);
  assert.match(bloque, /ahora sube a DEV y espera\./, `el bloque BREAKING perdio la consecuencia:\n${bloque}`);
});

test("una viñeta BREAKING envuelta no se pega con lo que viene despues", () => {
  // La otra direccion del mismo arreglo: pegar de mas es tan malo como cortar. Un
  // encabezado, una linea vacia o una viñeta nueva cierran la continuacion.
  const encontradas = lineasBreaking(
    ["- **BREAKING** algo", "  su continuacion", "", "### Otra seccion", "- BREAKING dos", "  y su cola", "  - una sub-viñeta"].join("\n"),
  );
  assert.equal(encontradas.length, 2);
  assert.equal(encontradas[0], "- **BREAKING** algo su continuacion");
  assert.doesNotMatch(encontradas[0], /Otra seccion/);
  assert.equal(encontradas[1], "- BREAKING dos y su cola", "una sub-viñeta es otra viñeta, no la continuacion de esta");
});

test("no marca BREAKING mencionado en medio de una frase", () => {
  // La convención del CHANGELOG es "en mayúsculas al INICIO de la línea". Una
  // prosa que explica qué es breaking no debe encabezar el aviso.
  assert.deepEqual(lineasBreaking("Un cambio es BREAKING si un repo consumidor queda roto."), []);
});

test("la versión con BREAKING lo pone primero en el mensaje", () => {
  const seccion = extraerSeccionVersion(CHANGELOG, "1.1.0");
  const { mensaje, breaking } = construirMensaje({
    version: "1.1.0",
    seccion,
    urlRelease: "https://ejemplo/r",
    urlChangelog: "https://ejemplo/c",
  });
  assert.equal(breaking, true);
  const posBreaking = mensaje.indexOf("BREAKING");
  const posConsumidores = mensaje.indexOf("Qué tiene que hacer");
  assert.ok(posBreaking > 0 && posBreaking < posConsumidores, "el bloque BREAKING va antes de la sección accionable");
});

// ---------------------------------------------------------------------------
// Recorte
// ---------------------------------------------------------------------------

test("bajo el límite el mensaje queda intacto", () => {
  const { texto, recortado } = recortar("corto", LIMITE_POR_DEFECTO, "https://ejemplo/r");
  assert.equal(recortado, false);
  assert.equal(texto, "corto");
});

test("sobre el límite recorta, lo dice y deja el enlace al release", () => {
  const largo = Array.from({ length: 200 }, (_, i) => `linea ${i}`).join("\n");
  const { texto, recortado } = recortar(largo, 300, "https://ejemplo/r");
  assert.equal(recortado, true);
  assert.ok(texto.length <= 300, `el recorte respeta el límite (${texto.length})`);
  assert.match(texto, /recortado acá/);
  assert.match(texto, /https:\/\/ejemplo\/r/);
});

// ---------------------------------------------------------------------------
// Payload
// ---------------------------------------------------------------------------

test("el payload es JSON válido aunque el changelog traiga comillas y saltos", () => {
  const raro = 'Texto con "comillas", \\barras\\ y\nsaltos\ty tabs — ¿y acentos?';
  const payload = construirPayload(raro);
  const vuelta = JSON.parse(payload);
  assert.equal(vuelta.text, raro, "el mensaje sobrevive el ida y vuelta sin escaparse a mano");
});

test("el campo del payload es parametrizable: el destino no está cableado", () => {
  assert.equal(JSON.parse(construirPayload("hola", "content")).content, "hola");
  assert.equal(JSON.parse(construirPayload("hola")).text, "hola");
});

test("limpiarBordes saca los separadores del formato, no el contenido", () => {
  assert.equal(limpiarBordes("\n\ncuerpo\n\n---\n\n"), "cuerpo");
  assert.equal(limpiarBordes("cuerpo con --- adentro\n"), "cuerpo con --- adentro");
});

// ---------------------------------------------------------------------------
// El mensaje completo
// ---------------------------------------------------------------------------

test("el mensaje trae la versión, la sección accionable y los dos enlaces", () => {
  const seccion = extraerSeccionVersion(CHANGELOG, "1.2.0");
  const { mensaje, sinParaConsumidores } = construirMensaje({
    version: "1.2.0",
    seccion,
    urlRelease: "https://ejemplo/releases/tag/v1.2.0",
    urlChangelog: "https://ejemplo/blob/v1.2.0/CHANGELOG.md",
  });
  assert.equal(sinParaConsumidores, false);
  assert.match(mensaje, /Projects 1\.2\.0 publicado/);
  assert.match(mensaje, /Cablear el paso nuevo/);
  assert.match(mensaje, /Release: https:\/\/ejemplo\/releases\/tag\/v1\.2\.0/);
  assert.match(mensaje, /CHANGELOG: https:\/\/ejemplo\/blob/);
});

test("sin «Para consumidores» manda el cuerpo completo y dice por qué", () => {
  // Fail-open ruidoso: la rama de duda va al camino caro (mandar de más) y lo
  // declara adentro del propio mensaje, no solo en el log de la corrida.
  const seccion = { encontrada: true, encabezado: "[2.0.0]", cuerpo: "### Añadido\n\n- algo que nadie tradujo a acciones" };
  const { mensaje, sinParaConsumidores } = construirMensaje({
    version: "2.0.0",
    seccion,
    urlRelease: "https://ejemplo/r",
    urlChangelog: "https://ejemplo/c",
  });
  assert.equal(sinParaConsumidores, true);
  assert.match(mensaje, /no trae la sección «Para consumidores»/);
  assert.match(mensaje, /algo que nadie tradujo a acciones/);
});

// ---------------------------------------------------------------------------
// main(): las salidas que decide el workflow
// ---------------------------------------------------------------------------

test("sin versión, main es rojo y nombra el arreglo", async () => {
  const { codigo, dicho } = await correr({});
  assert.equal(codigo, 1);
  assert.match(dicho, /::error::/);
  assert.match(dicho, /workflow_dispatch|release/);
});

test("«No publicado» es un encabezado del changelog, pero NO se avisa", async () =>
  conTemporal(async (dir) => {
    // El agujero real, cazado dogfoodeando el aviso contra este repo: "No
    // publicado" ES un encabezado válido, así que el extractor lo encuentra y el
    // mensaje sale perfectamente formado — con enlaces a un tag que no existe y
    // rumbo al canal como si fuera una versión. La guarda está en la entrada.
    const changelog = join(dir, "CHANGELOG.md");
    writeFileSync(changelog, CHANGELOG);
    const { codigo, dicho } = await correr({
      AVISO_VERSION: "No publicado",
      AVISO_CHANGELOG: changelog,
      AVISO_SALIDA: join(dir, "payload.json"),
    });
    assert.equal(codigo, 1);
    assert.match(dicho, /::error::/);
    assert.match(dicho, /semver/);
  }));

test("esVersionSemver acepta lo que el marco publica y nada más", () => {
  assert.equal(esVersionSemver("1.2.0"), true);
  assert.equal(esVersionSemver("10.0.3-rc.1"), true);
  assert.equal(esVersionSemver("No publicado"), false);
  assert.equal(esVersionSemver("1.2"), false);
  assert.equal(esVersionSemver("latest"), false);
});

test("changelog ilegible es rojo, no un aviso vacío", async () => {
  const { codigo, dicho } = await correr({ AVISO_VERSION: "1.2.0", AVISO_CHANGELOG: "no-existe-este-archivo.md" });
  assert.equal(codigo, 1);
  assert.match(dicho, /::error::/);
  assert.match(dicho, /checkout/);
});

test("versión publicada sin entrada en el changelog es ROJO con el arreglo", async () =>
  conTemporal(async (dir) => {
    const changelog = join(dir, "CHANGELOG.md");
    writeFileSync(changelog, CHANGELOG);
    const { codigo, dicho } = await correr({
      AVISO_VERSION: "v9.9.9",
      AVISO_CHANGELOG: changelog,
      AVISO_SALIDA: join(dir, "payload.json"),
    });
    assert.equal(codigo, 1);
    assert.match(dicho, /::error::/);
    // El mensaje trae el ARREGLO, no el diagnóstico.
    assert.match(dicho, /## \[9\.9\.9\]/);
    assert.match(dicho, /Run workflow|boton|botón/i);
  }));

test("el aviso de una versión real escribe un payload posteable", async () =>
  conTemporal(async (dir) => {
    const salida = join(dir, "payload.json");
    const { codigo } = await correr({
      AVISO_VERSION: "v1.2.0",
      AVISO_CHANGELOG: CHANGELOG_REAL,
      AVISO_SALIDA: salida,
      GITHUB_SERVER_URL: "https://github.com",
      GITHUB_REPOSITORY: "im-diego-ec/Projects",
    });
    assert.equal(codigo, 0);
    const payload = JSON.parse(readFileSync(salida, "utf8"));
    assert.equal(typeof payload.text, "string");
    assert.ok(payload.text.length > 200, "el mensaje no es un cascarón");
    assert.match(payload.text, /Projects 1\.2\.0 publicado/);
    assert.match(payload.text, /releases\/tag\/v1\.2\.0/);
  }));

// ESTA es la prueba que protege el acoplamiento real del diseño: el contenido
// del aviso sale de un archivo que se edita a mano en cada PR. Si alguien cambia
// el formato de los encabezados del CHANGELOG, o publica una versión sin su
// sección accionable, el aviso se degrada — y tiene que ser acá, no en el canal.
test("el CHANGELOG real de este repo produce un aviso completo, sin degradar", async () =>
  conTemporal(async (dir) => {
    const { codigo, dicho } = await correr({
      AVISO_VERSION: "1.2.0",
      AVISO_CHANGELOG: CHANGELOG_REAL,
      AVISO_SALIDA: join(dir, "payload.json"),
    });
    assert.equal(codigo, 0);
    assert.doesNotMatch(dicho, /no trae la seccion|no trae la sección/);
  }));

// ---------------------------------------------------------------------------
// El único fail-open posible del script
// ---------------------------------------------------------------------------

test("invocado como programa por una ruta no canónica, igual arma el mensaje", async () =>
  conTemporal((dir) => {
    // Si la guarda de "soy el principal" comparara rutas literales, en Windows
    // (nombres cortos, enlaces de directorio) contestaría "no soy el principal"
    // y el proceso saldría 0 sin armar nada ni decir una palabra: un aviso que
    // nunca se manda y un workflow verde. Se spawnea por una ruta con `..`.
    const rutaTorcida = join(import.meta.dirname, "..", "pruebas", "..", "aviso-version.mjs");
    const r = spawnSync(process.execPath, [rutaTorcida], {
      encoding: "utf8",
      env: {
        ...process.env,
        AVISO_VERSION: "1.2.0",
        AVISO_CHANGELOG: CHANGELOG_REAL,
        AVISO_SALIDA: join(dir, "payload.json"),
        GITHUB_OUTPUT: "",
        GITHUB_STEP_SUMMARY: "",
      },
    });
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /mensaje armado para 1\.2\.0/);
    assert.ok(JSON.parse(readFileSync(join(dir, "payload.json"), "utf8")).text.length > 200);
  }));

test("el script existe donde la action lo invoca", () => {
  // GITHUB_ACTION_PATH + /aviso-version.mjs es literal en action.yml: un
  // renombrado que no toque el YAML rompe el aviso recién en la corrida real.
  assert.ok(readFileSync(SCRIPT, "utf8").includes("export async function main"));
  const yml = readFileSync(join(import.meta.dirname, "..", "action.yml"), "utf8");
  assert.match(yml, /aviso-version\.mjs/);
});

// ---------------------------------------------------------------------------
// EL PREAMBULO, que es la unica prosa del marco que viaja DIRECTO a los
// consumidores y que hasta hoy no tenia un solo caso.
//
// En Rigel —el marco del que Projects se bifurco— quedo viejo DOS veces, y las dos
// se encontro leyendo el mensaje a ojo, no por un rojo: al cortar su 2.0.0 nombraba
// el puntero de la linea 1 en el anuncio de la linea 2 (c677ede), y al cortar su
// 2.3.0 nombraba un canal que habia dejado de serlo en esa misma version (0120ec4).
// Aca el texto HOY es verdad —el canal es Dependabot, decision D2 del PO del
// 2026-09-17—, y justamente por eso hace falta el banco: lo que lo va a volver falso
// es un cambio en OTRO archivo, y ese cambio tiene que poner rojo a este.
// ---------------------------------------------------------------------------

const preambuloDe = (version) =>
  construirMensaje({
    version,
    seccion: extraerSeccionVersion(CHANGELOG, "1.2.0"),
    urlRelease: "https://ejemplo/r",
    urlChangelog: "https://ejemplo/c",
  }).mensaje.split("\n")[0];

/** ¿El andamio recibe el bump del marco por Dependabot? Se lee de la configuracion
 *  que el andamio reparte, no de una frase: una entrada `github-actions` con un
 *  grupo cuyo patron es el marco, y sin un `ignore` que lo saque. */
function dependabotTraeElMarco(yml) {
  const entrada = String(yml)
    .split(/\n(?= {2}- package-ecosystem:)/)
    .find((b) => /package-ecosystem:\s*"github-actions"/.test(b));
  if (!entrada) return false;
  const agrupa = /^\s+patterns:\s*\[\s*"\{\{ORG_MARCO\}\}\/Projects\*"\s*\]/m.test(entrada);
  const ignora = /ignore:[\s\S]*?dependency-name:\s*"\{\{ORG_MARCO\}\}\/Projects/.test(entrada);
  return agrupa && !ignora;
}

/** Lo que el preambulo afirma sobre el canal, contra lo que el andamio configura. */
function problemasDelCanal(preambulo, yml) {
  const dice = /Dependabot/.test(preambulo);
  const es = dependabotTraeElMarco(yml);
  if (es && !dice) {
    return [
      "el andamio recibe el bump del marco por Dependabot (plantilla/.github/dependabot.yml, grupo `marco`) y el " +
        "preambulo no lo nombra: el consumidor no sabe donde le va a llegar la version. Arreglo: nombrarlo en " +
        "`construirMensaje` de actions/aviso-version/aviso-version.mjs",
    ];
  }
  if (!es && dice) {
    return [
      "el preambulo dice que el bump llega como PR de Dependabot y el andamio YA NO configura Dependabot para el " +
        "marco. Esa es la unica prosa del marco que viaja directo a los consumidores, y quedaria afirmando un canal " +
        "que no existe. Arreglo: reescribir el preambulo en `construirMensaje` nombrando el canal nuevo, en el mismo " +
        "PR que cambio el dependabot.yml del andamio",
    ];
  }
  return [];
}

test("el preambulo nombra el canal del bump que el andamio configura de verdad", () => {
  const yml = readFileSync(DEPENDABOT_DEL_ANDAMIO, "utf8");
  assert.equal(
    dependabotTraeElMarco(yml),
    true,
    "el lector del dependabot.yml del andamio no encontro el grupo del marco. O el andamio dejo de usar Dependabot " +
      "para el marco —y entonces el preambulo tiene que cambiar, ver el caso siguiente— o el archivo cambio de forma " +
      "y este lector quedo mirando al vacio",
  );
  assert.deepEqual(problemasDelCanal(preambuloDe("1.10.0"), yml), []);
});

test("MUERDE: si el andamio deja de usar Dependabot para el marco, el preambulo actual se pone rojo", () => {
  // La razon de ser del caso anterior. Sin esta refutacion, «el preambulo nombra el
  // canal» seria una asercion que nunca vio fallar.
  const yml = readFileSync(DEPENDABOT_DEL_ANDAMIO, "utf8");
  const sinGrupo = yml.replace(/\n\s+marco:\n\s+patterns:[^\n]*/, "");
  assert.notEqual(sinGrupo, yml, "la mutacion no toco nada: el grupo `marco` cambio de forma y esta refutacion no muerde");
  assert.equal(problemasDelCanal(preambuloDe("1.10.0"), sinGrupo).length, 1);
  // Y en la otra direccion: un preambulo que no nombra el canal, con el andamio intacto.
  assert.equal(problemasDelCanal("Projects 1.10.0 publicado.", yml).length, 1);
});

for (const [version, puntero, ajeno] of [
  ["1.10.0", "v1", "v2"],
  ["2.0.0", "v2", "v1"],
  ["3.4.1", "v3", "v2"],
]) {
  test(`ROJO PRIMERO: el puntero del preambulo se DERIVA de la version: ${version} -> ${puntero}`, () => {
    // Decia `v1` escrito a mano. Hoy es verdad y el dia que se abra la linea 2 —la
    // decision D1 del PO la prepara— el anuncio de la 2.0.0 iba a nombrar el puntero
    // de la linea 1. Se prueba sobre TRES lineas y no sobre la vigente: una regla
    // escrita contra la linea de hoy deja de proteger en la siguiente.
    const p = preambuloDe(version);
    assert.match(p, new RegExp("`" + puntero + "`"), `tiene que nombrar ${puntero}:\n${p}`);
    assert.doesNotMatch(p, new RegExp("`" + ajeno + "`"), `y NO puede nombrar ${ajeno}, que es de otra linea:\n${p}`);
  });
}

test("el preambulo NO cuenta las referencias internas del marco", () => {
  // En Rigel decia «las dos referencias internas» y quedaron en una en la misma version
  // que lo decia. Un numero mantenido a mano en la prosa que viaja a los consumidores
  // obliga a acordarse, y cuantas hay no es asunto del consumidor.
  const p = preambuloDe("1.10.0");
  assert.doesNotMatch(p, /\b(dos|tres|cuatro|cinco|\d+)\s+referencias\b/i, `el preambulo lleva un conteo:\n${p}`);
});

// ---------------------------------------------------------------------------
// EL CONSEJO DEL EMISOR SEGUN LA RAMA QUE TOMO DE VERDAD
//
// `main` emitia el mismo consejo de recorte en las dos ramas de `construirMensaje`:
// «acortar la seccion Para consumidores». Cuando la entrada NO tiene esa seccion eso
// manda a acortar algo que no existe, y lo que se termina acortando es la entrada —
// detalle del marco borrado para que entre un mensaje que, con la seccion escrita,
// nunca lo habria incluido—. Y el aviso de seccion ausente afirmaba «sale igual con el
// cuerpo completo» justo cuando ese cuerpo se recortaba. Medido el 2026-09-17 con
// `AVISO_VERSION=1.9.0 node actions/aviso-version/aviso-version.mjs`: las dos frases
// salen juntas, sobre una entrada sin la seccion, en cada release de la 1.9.x.
// ---------------------------------------------------------------------------

/** Un changelog con UNA entrada, la 3.1.0, con el cuerpo que se le pase. */
const conEntrada = (cuerpo) => ["# Changelog", "", "## [3.1.0] — 2026-09-17", "", cuerpo, ""].join("\n");
/** Un cuerpo que pasa el limite vigente con holgura, derivado de el y no afinado a mano. */
const relleno = () =>
  Array.from({ length: Math.ceil((LIMITE_POR_DEFECTO * 1.5) / 30) }, (_, i) => `- linea de relleno ${i} con prosa`).join("\n");
const avisosDe = (dicho) => dicho.split("\n").filter((l) => l.startsWith("::warning::"));
/** El aviso de RECORTE se reconoce por el limite que nombra, no por «se recorto»: el de
 *  seccion ausente tambien dice cuanto se recorto, a proposito, y buscar esa frase
 *  confundiria los dos avisos. */
const esElDeRecorte = (l) => /supero los \d+ caracteres/.test(l);

async function emitir(dir, cuerpo) {
  const changelog = join(dir, "CHANGELOG.md");
  const salida = join(dir, "payload.json");
  writeFileSync(changelog, conEntrada(cuerpo));
  const r = await correr({ AVISO_VERSION: "3.1.0", AVISO_CHANGELOG: changelog, AVISO_SALIDA: salida });
  return { ...r, avisos: avisosDe(r.dicho), enviado: JSON.parse(readFileSync(salida, "utf8")).text };
}

test("ROJO PRIMERO: sin «Para consumidores» y sobre el limite, el recorte manda a ESCRIBIRLA y no a acortarla", async () =>
  conTemporal(async (dir) => {
    const { codigo, avisos } = await emitir(dir, `### Añadido\n\n${relleno()}`);
    assert.equal(codigo, 0, "el emisor no es rojo por esto: el release ya salio");
    const recorte = avisos.find(esElDeRecorte);
    assert.ok(recorte, `falta el aviso de recorte:\n${avisos.join("\n")}`);
    assert.doesNotMatch(recorte, /acorta/i, "mandar a acortar una seccion que no existe es el consejo al reves");
    assert.match(recorte, /ESCRIBIR la seccion "### Para consumidores"/, "el arreglo de esta rama es escribirla");
  }));

test("ROJO PRIMERO: el aviso de recorte dice a cuanto se recorto, y es lo que quedo en el payload", async () =>
  conTemporal(async (dir) => {
    const { avisos, enviado } = await emitir(dir, `### Añadido\n\n${relleno()}`);
    const recorte = avisos.find(esElDeRecorte);
    const m = /se recorto a (\d+)/.exec(recorte ?? "");
    assert.ok(m, `el aviso no dice a cuanto se recorto:\n${recorte}`);
    assert.equal(Number(m[1]), enviado.length, "el numero tiene que ser el largo del payload escrito, no uno supuesto");
    assert.match(recorte, new RegExp(`supero los ${LIMITE_POR_DEFECTO} caracteres`), "y nombra el limite que de verdad aplico");
  }));

test("ROJO PRIMERO: la seccion ausente no se anuncia como «cuerpo completo» cuando ese cuerpo se recorta", async () =>
  conTemporal(async (dir) => {
    const { avisos, enviado } = await emitir(dir, `### Añadido\n\n${relleno()}`);
    const ausente = avisos.find((l) => /no trae la seccion/.test(l));
    assert.ok(ausente, `falta el aviso de seccion ausente:\n${avisos.join("\n")}`);
    assert.doesNotMatch(ausente, /sale igual con el cuerpo completo\./, "afirma que llega entero y se recorta");
    assert.match(ausente, new RegExp(`se recorto a ${enviado.length}\\b`), "tiene que decir cuanto llega de verdad");
  }));

test("sin «Para consumidores» y dentro del limite, no se inventa un recorte", async () =>
  conTemporal(async (dir) => {
    const { avisos } = await emitir(dir, "### Añadido\n\n- un cambio chico");
    const ausente = avisos.find((l) => /no trae la seccion/.test(l));
    assert.ok(ausente, "la ausencia se avisa igual");
    assert.doesNotMatch(avisos.join("\n"), /se recorto/, "no hubo recorte y no se puede decir que lo hubo");
  }));

test("CONTROL POSITIVO: con la seccion presente y sobre el limite, sigue mandando a acortarla", async () =>
  conTemporal(async (dir) => {
    // Sin este caso no se distingue «arregle el consejo» de «rompi la deteccion».
    const { avisos } = await emitir(dir, `### Para consumidores\n\n${relleno()}\n\n### Añadido\n\n- algo`);
    const recorte = avisos.find(esElDeRecorte);
    assert.ok(recorte, "la seccion se paso del limite y tiene que avisarse");
    assert.match(recorte, /acortar la seccion "Para consumidores"/);
    assert.equal(avisos.filter((l) => /no trae la seccion/.test(l)).length, 0, "la seccion esta: no hay aviso de ausencia");
  }));
