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
