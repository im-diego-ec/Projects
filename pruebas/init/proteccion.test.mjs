import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  RUTA_PROTECCION,
  TIMEOUT_DE_LA_SONDA,
  ESTADOS_DE_PROTECCION,
  ESTADOS_SIN_MEDICION,
  seMidio,
  clasificarSondaDeRulesets,
  sondarProteccion,
  bloqueDeProteccion,
  avisoDeProteccion,
  insertarProteccionMedida,
  escribirProteccionMedida,
} from "../../herramientas/projects-init.mjs";

// ---------------------------------------------------------------------------
// EL BANCO DEL DIAGNOSTICO DE LA PROTECCION DE MAIN.
//
// EL DEFECTO QUE VIGILA. `projects init` repartia `.github/proteccion-main.md`
// tal cual y no medía nada, y ese documento se presenta como "el estado real"
// del repositorio y manda aplicar cuatro reglas. Medido contra la cuenta que hoy
// hospeda el marco, `gh api repos/<org>/<repo>/rulesets` contesta 403 «Upgrade to
// GitHub Pro or make this repository public»: esas cuatro reglas no existen y no
// pueden existir. Un documento que afirma un estado que el repositorio desmiente
// es un fail-open con forma de prosa.
//
// LA DISTINCION QUE ESTE ARCHIVO NO DEJA COLAPSAR, y es la unica que de verdad
// importa: "no puede tener compuertas" (403 MEDIDO) no es lo mismo que "no pude
// mirar" (sin gh / sin auth / sin red / 404). Los dos casos dan exit 1 en `gh`,
// asi que la unica forma de distinguirlos es leer el cuerpo — y los casos de
// abajo lo afirman con las salidas TEXTUALES que se midieron contra la API.
//
// TODO CORRE SIN RED Y SIN CUENTA DE GITHUB: la sonda entra por el parametro
// `correr`, y la clasificacion es pura sobre lo que dejo el proceso.
// ---------------------------------------------------------------------------

const ESTE_DIRECTORIO = path.dirname(fileURLToPath(import.meta.url));
const DOC_DEL_ANDAMIO = path.join(ESTE_DIRECTORIO, "..", "..", "plantilla", ...RUTA_PROTECCION.split("/"));

// Las cinco salidas de `gh`, TEXTUALES, medidas contra api.github.com el dia que
// se escribio esto. Si alguna cambia de forma, el rojo tiene que aparecer aca y
// no en la maquina de quien crea un proyecto.
const SALIDAS_MEDIDAS = {
  puede: {
    codigo: 0,
    stdout: '[{"id":4898070,"name":"Copilot Code Review","target":"branch","enforcement":"active"}]',
    stderr: "",
  },
  sinCompuertas: {
    codigo: 1,
    stdout:
      '{"message":"Upgrade to GitHub Pro or make this repository public to enable this feature.","documentation_url":"https://docs.github.com/rest/repos/rules#get-all-repository-rulesets","status":"403"}',
    stderr: "gh: Upgrade to GitHub Pro or make this repository public to enable this feature. (HTTP 403)",
  },
  sinRepo: {
    codigo: 1,
    stdout: '{"message":"Not Found","documentation_url":"https://docs.github.com/rest/repos/rules#get-all-repository-rulesets","status":"404"}',
    stderr: "gh: Not Found (HTTP 404)",
  },
  sinRed: {
    codigo: 1,
    stdout: "",
    stderr: 'Get "https://api.github.com/repos/o/p/rulesets": proxyconnect tcp: dial tcp 127.0.0.1:9: connect: connection refused',
  },
  sinAuth: {
    codigo: 4,
    stdout: "",
    stderr: "To get started with GitHub CLI, please run:  gh auth login\nAlternatively, populate the GH_TOKEN environment variable with a GitHub API authentication token.",
  },
};

test("los estados declarados y los que no midieron nada son UNA sola lista coherente", () => {
  for (const estado of ESTADOS_SIN_MEDICION) {
    assert.ok(estado in ESTADOS_DE_PROTECCION, `${estado} esta en la lista de "no se midio" y no esta declarado`);
    assert.equal(seMidio(estado), false);
  }
  assert.equal(seMidio("puede"), true);
  assert.equal(seMidio("sin-compuertas"), true);
  // Los dos que SI son mediciones no pueden estar del otro lado.
  assert.equal(ESTADOS_SIN_MEDICION.has("puede"), false);
  assert.equal(ESTADOS_SIN_MEDICION.has("sin-compuertas"), false);
  assert.equal(Object.keys(ESTADOS_DE_PROTECCION).length, ESTADOS_SIN_MEDICION.size + 2);
});

test("clasificar: 200 con la lista de rulesets es la unica forma de decir PUEDE", () => {
  const r = clasificarSondaDeRulesets(SALIDAS_MEDIDAS.puede);
  assert.equal(r.estado, "puede");
  assert.match(r.detalle, /1 ruleset\(s\) hoy/);
  assert.deepEqual(r.rulesets, ["Copilot Code Review"]);

  const vacio = clasificarSondaDeRulesets({ codigo: 0, stdout: "[]" });
  assert.equal(vacio.estado, "puede");
  assert.deepEqual(vacio.rulesets, []);
});

test("clasificar: el 403 del plan gratuito es una MEDICION, no una ausencia de medicion", () => {
  const r = clasificarSondaDeRulesets(SALIDAS_MEDIDAS.sinCompuertas);
  assert.equal(r.estado, "sin-compuertas");
  assert.equal(seMidio(r.estado), true);
  assert.equal(r.detalle, "Upgrade to GitHub Pro or make this repository public to enable this feature.");
});

test("clasificar: un 403 que NO es el del plan no se lee como 'no puede', se lee como 'no se sabe'", () => {
  const r = clasificarSondaDeRulesets({
    codigo: 1,
    stdout: '{"message":"Must have admin rights to Repository.","status":"403"}',
    stderr: "gh: Must have admin rights to Repository. (HTTP 403)",
  });
  assert.equal(r.estado, "no-se-sabe");
  assert.equal(seMidio(r.estado), false, "un 403 de permisos afirmaria sobre un repo que no se llego a ver");
  assert.match(r.detalle, /no es el del plan gratuito/);
});

test("clasificar: los cuatro caminos de 'no pude mirar' se distinguen entre si", () => {
  assert.equal(clasificarSondaDeRulesets({ presente: false }).estado, "sin-gh");
  assert.equal(clasificarSondaDeRulesets(SALIDAS_MEDIDAS.sinAuth).estado, "sin-auth");
  assert.equal(clasificarSondaDeRulesets(SALIDAS_MEDIDAS.sinRed).estado, "sin-red");
  assert.equal(clasificarSondaDeRulesets(SALIDAS_MEDIDAS.sinRepo).estado, "sin-repo");
  for (const s of [{ presente: false }, SALIDAS_MEDIDAS.sinAuth, SALIDAS_MEDIDAS.sinRed, SALIDAS_MEDIDAS.sinRepo]) {
    assert.equal(seMidio(clasificarSondaDeRulesets(s).estado), false);
  }
});

// EL CASO QUE JUSTIFICA NO CLASIFICAR POR CODIGO DE SALIDA.
test("clasificar: 403 y corte de red comparten exit 1 y NO comparten estado", () => {
  assert.equal(SALIDAS_MEDIDAS.sinCompuertas.codigo, 1);
  assert.equal(SALIDAS_MEDIDAS.sinRed.codigo, 1);
  assert.notEqual(
    clasificarSondaDeRulesets(SALIDAS_MEDIDAS.sinCompuertas).estado,
    clasificarSondaDeRulesets(SALIDAS_MEDIDAS.sinRed).estado,
    "el mismo codigo de salida colapso las dos ramas que este bloque existe para separar",
  );
});

test("clasificar: salio 0 pero no contesto la lista que documenta la API -> no se sabe", () => {
  assert.equal(clasificarSondaDeRulesets({ codigo: 0, stdout: "esto no es json" }).estado, "no-se-sabe");
  assert.equal(clasificarSondaDeRulesets({ codigo: 0, stdout: '{"no":"es un array"}' }).estado, "no-se-sabe");
  assert.equal(clasificarSondaDeRulesets({ codigo: 0, stdout: "" }).estado, "no-se-sabe");
});

test("clasificar: un timeout de la propia sonda es 'no pude mirar'", () => {
  const r = clasificarSondaDeRulesets({ codigo: null, stdout: "", stderr: "", error: `la sonda no contesto en ${TIMEOUT_DE_LA_SONDA} ms` });
  assert.equal(r.estado, "sin-red");
  assert.match(r.detalle, /no contesto en/);
});

test("sondarProteccion: es UN GET de solo lectura, y uno solo", () => {
  const llamadas = [];
  const r = sondarProteccion({
    org: "una-org",
    proyecto: "un-repo",
    correr: (args) => {
      llamadas.push(args);
      return SALIDAS_MEDIDAS.sinCompuertas;
    },
  });
  assert.equal(llamadas.length, 1);
  assert.deepEqual(llamadas[0], { org: "una-org", proyecto: "un-repo" });
  assert.equal(r.estado, "sin-compuertas");
});

test("sondarProteccion: acepta el nombre real de un repo de GitHub, mayusculas incluidas", () => {
  // El propio repositorio del marco se llama `Projects`. Un guard que lo
  // rechazara contestaria "no se sabe" sobre el caso mas importante que hay.
  const r = sondarProteccion({ org: "una-org", proyecto: "Projects", correr: () => SALIDAS_MEDIDAS.sinCompuertas });
  assert.equal(r.estado, "sin-compuertas");
});

test("sondarProteccion: un org o un repo con forma rara NO sale a la red, y no afirma nada", () => {
  for (const [org, proyecto] of [
    ["una-org", ".."],
    ["una-org", "a/b"],
    ["una-org", "a b"],
    ["una-org", "a;rm -rf /"],
    ["-mala", "un-repo"],
    ["", "un-repo"],
    ["una-org", ""],
  ]) {
    const r = sondarProteccion({ org, proyecto, correr: () => assert.fail(`salio a la red con ${org}/${proyecto}`) });
    assert.equal(r.estado, "no-se-sabe", `${org}/${proyecto}`);
    assert.equal(seMidio(r.estado), false);
    assert.match(r.detalle, /no se sondeo/);
  }
});

// ─────────────────────────── El texto que se escribe ───────────────────────────

const CONTEXTO = { org: "una-org", proyecto: "un-repo", fecha: "2026-01-15" };

function textoDel(estado, extra = {}) {
  return bloqueDeProteccion({ estado, detalle: "detalle medido", ...CONTEXTO, ...extra }).lineas.join("\n");
}

test("bloqueDeProteccion: NINGUN estado afirma que las cuatro reglas esten activas", () => {
  for (const estado of Object.keys(ESTADOS_DE_PROTECCION)) {
    const t = textoDel(estado);
    assert.equal(/tiene funcionando/.test(t), false, `${estado} afirma reglas funcionando`);
    assert.equal(/Se encienden ahora/.test(t), false, `${estado} afirma que se encienden ahora`);
    assert.ok(t.includes(`gh api repos/una-org/un-repo/rulesets`), `${estado} no deja la sonda escrita`);
    assert.ok(t.includes("2026-01-15"), `${estado} no fecha la medicion`);
  }
});

test("bloqueDeProteccion: los cinco 'no pude mirar' dicen que NO afirman nada", () => {
  for (const estado of ESTADOS_SIN_MEDICION) {
    const t = textoDel(estado);
    assert.match(t, /No se pudo medir/, estado);
    assert.match(t, /«No pude mirar» no es «no hay problema»/, estado);
    assert.match(t, /\*\*no afirma nada\*\*/, estado);
    assert.match(t, /\*\*desconocido\*\*/, estado);
    // Y ninguno declara el repositorio incapaz: eso seria afirmar sin medir.
    assert.equal(/\*\*no puede\*\* tener protección/.test(t), false, `${estado} afirma "no puede" sin haber medido`);
    // Los cinco dejan escrito que hacer si mañana la sonda contesta 403.
    assert.match(t, /Upgrade to GitHub Pro or make this repository public/, estado);
  }
});

test("bloqueDeProteccion: el 403 medido dice la causa textual y las TRES salidas con su costo", () => {
  const t = textoDel("sin-compuertas", { detalle: "Upgrade to GitHub Pro or make this repository public to enable this feature." });
  assert.match(t, /no puede\*\* tener protección de rama hoy/);
  assert.match(t, /→ 403 Upgrade to GitHub Pro or make this repository public to enable this feature\./);
  assert.match(t, /no ofrece protección de rama en repositorios privados del plan gratuito/);
  // Las tres salidas, cada una con lo que habilita y lo que cuesta.
  assert.match(t, /\*\*GitHub Pro\*\*/);
  assert.match(t, /organización\*\* con plan Team/);
  assert.match(t, /\*\*Hacer el repo público\*\*/);
  assert.match(t, /Qué cuesta/);
  // Y NO inventa un precio: los numeros los publica GitHub y cambian.
  assert.equal(/\$\s?\d/.test(t), false, "hay un precio inventado en el documento");
  assert.match(t, /https:\/\/github\.com\/pricing/);
  // Lo que significa mientras tanto, sin eufemismos.
  assert.match(t, /«no hay\ncompuerta»/);
  assert.match(t, /--no-verify/);
});

test("bloqueDeProteccion: cuando SI puede, lo dice, deja el comando, y no lo aplica solo", () => {
  const t = textoDel("puede", { detalle: "200, 0 ruleset(s) hoy", rulesets: [] });
  assert.match(t, /sí puede\*\* tener protección de rama/);
  assert.match(t, /Hoy no hay ninguno activo/);
  assert.match(t, /esta herramienta no lo hace por vos/);
  assert.match(t, /gh api repos\/una-org\/un-repo\/rulesets --jq/);
  assert.match(t, /`ci-ok` no aparece en la lista/);

  const conRulesets = textoDel("puede", { detalle: "200, 2 ruleset(s) hoy", rulesets: ["main-protegida", "otro"] });
  assert.match(conRulesets, /\*\*Hoy hay 2\*\*: `main-protegida`, `otro`/);
  assert.match(conRulesets, /Que existan rulesets no dice que sean/);
});

test("avisoDeProteccion: todo lo que no es 'puede' sale como ::warning::", () => {
  for (const estado of Object.keys(ESTADOS_DE_PROTECCION)) {
    const linea = avisoDeProteccion({ estado, detalle: "d", ...CONTEXTO });
    if (estado === "puede") assert.equal(linea.startsWith("::warning::"), false);
    else assert.ok(linea.startsWith("::warning::"), `${estado} no avisa`);
    assert.ok(linea.includes(RUTA_PROTECCION), `${estado} no dice donde quedo escrito`);
  }
  assert.match(avisoDeProteccion({ estado: "sin-compuertas", detalle: "d", ...CONTEXTO }), /nace SIN compuerta/);
  assert.match(avisoDeProteccion({ estado: "sin-red", detalle: "d", ...CONTEXTO }), /"No pude mirar" no es "no hay/);
});

// ─────────────────────────── La cirugia sobre el documento ───────────────────────────

test("insertarProteccionMedida: sobre el documento REAL del andamio, las dos anclas estan", () => {
  const original = fs.readFileSync(DOC_DEL_ANDAMIO, "utf8");
  // Las dos anclas existen hoy: si el andamio las pierde, este caso es el que se
  // pone rojo, y no el proyecto de alguien.
  assert.ok(/^>.*🕳️/m.test(original), "el andamio ya no trae el recuadro 🕳️ en proteccion-main.md");
  assert.ok(/^\*\*Se encienden ahora\.\*\*/m.test(original), "el andamio ya no trae la frase «Se encienden ahora.»");

  const bloque = bloqueDeProteccion({ estado: "sin-compuertas", detalle: "Upgrade to GitHub Pro or make this repository public to enable this feature.", ...CONTEXTO });
  const r = insertarProteccionMedida(original, bloque);
  assert.deepEqual(r.avisos, [], "una de las dos anclas no se encontro");
  assert.equal(r.texto.includes("🕳️"), false, "quedo el recuadro que manda aplicar cuatro reglas que no se pueden aplicar");
  assert.equal(r.texto.includes("Se encienden ahora."), false, "quedo la frase que afirma cuatro reglas funcionando");
  assert.match(r.texto, /no puede\*\* tener protección de rama hoy/);
  assert.match(r.texto, /Las cuatro que habría que encender/);
  // Lo que el andamio explica bien sigue estando: esto no reescribe el documento.
  assert.match(r.texto, /El check requerido es `ci-ok`/);
  assert.match(r.texto, /Aplicarla desde cero/);
  assert.match(r.texto, /Se dejan apagadas a propósito/);
  // Y el agregado del final, que no necesita ancla.
  assert.match(r.texto, /Y si esa sonda contesta 403/);
  // El bloque medido va ARRIBA de las tablas: quien lee de arriba abajo lee
  // primero lo que se midio.
  assert.ok(r.texto.indexOf("no puede** tener protección") < r.texto.indexOf("| Regla"), "la medicion quedo debajo de las tablas");
});

test("insertarProteccionMedida: si un ancla no esta, AVISA y el bloque medido se escribe igual", () => {
  const sinAnclas = ["# Titulo", "", "Un parrafo cualquiera.", "", "## Estado real", "", "Otra cosa.", ""].join("\n");
  const bloque = bloqueDeProteccion({ estado: "sin-compuertas", detalle: "d", ...CONTEXTO });
  const r = insertarProteccionMedida(sinAnclas, bloque);
  assert.equal(r.avisos.length, 2, "las dos anclas faltaban y no se avisaron las dos");
  assert.match(r.avisos.join("\n"), /recuadro 🕳️/);
  assert.match(r.avisos.join("\n"), /Se encienden ahora/);
  assert.match(r.texto, /no puede\*\* tener protección de rama hoy/, "se perdio la medicion por no encontrar un ancla");
  // Y va despues del H1, no antes.
  assert.ok(r.texto.startsWith("# Titulo"));
});

// EL DOCUMENTO QUE ESTA HERRAMIENTA ESCRIBE TIENE QUE PASAR EL FORMATEADOR DEL
// PROPIO ANDAMIO, y esto se medio: sin la limpieza del final, el texto quedaba
// con un renglon en blanco de mas y SIN salto final, y `prettier --check` —que
// esta adentro de `pnpm verificar`, que esta adentro del CI— salia rojo en el
// primer pull request de un repo recien nacido, por un archivo que escribio esta
// herramienta y que nadie habia tocado. Prettier no se puede invocar desde este
// banco (pruebas/init/ corre sin una sola dependencia, en tres sistemas
// operativos y en dos versiones de Node), asi que lo que se afirma aca es la
// FORMA que aquel rojo violaba. Las cinco lineas de la tabla del caso 403 son,
// ademas, la salida literal del formateador sobre ese contenido.
test("el documento escrito tiene la forma que el formateador del andamio exige", () => {
  const original = fs.readFileSync(DOC_DEL_ANDAMIO, "utf8");
  for (const estado of Object.keys(ESTADOS_DE_PROTECCION)) {
    const { texto } = insertarProteccionMedida(original, bloqueDeProteccion({ estado, detalle: "d", rulesets: ["x"], ...CONTEXTO }));
    assert.ok(texto.endsWith("\n"), `${estado}: el documento quedo sin salto final`);
    assert.equal(texto.endsWith("\n\n"), false, `${estado}: el documento quedo con mas de un salto final`);
    assert.equal(texto.includes("\n\n\n"), false, `${estado}: quedo un renglon en blanco de mas`);
    assert.equal(/[ \t]+\n/.test(texto), false, `${estado}: quedo espacio al final de una linea`);
  }
});

test("escribirProteccionMedida: escribe en el destino, y sin el archivo NO dice que si", () => {
  const destino = fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), "proteccion-"));
  try {
    // Sin el archivo: falla CERRADO. Es lo que hace que main() salga 1 en vez de
    // entregar un repo sin una linea escrita sobre su compuerta.
    const sinArchivo = escribirProteccionMedida(destino, { estado: "sin-compuertas", detalle: "d", ...CONTEXTO });
    assert.equal(sinArchivo.ok, false);
    assert.match(sinArchivo.error, /no pude leer/);

    fs.mkdirSync(path.join(destino, ".github"), { recursive: true });
    const abs = path.join(destino, ...RUTA_PROTECCION.split("/"));
    fs.copyFileSync(DOC_DEL_ANDAMIO, abs);
    const r = escribirProteccionMedida(destino, { estado: "sin-compuertas", detalle: "d", ...CONTEXTO });
    assert.equal(r.ok, true, r.error);
    assert.deepEqual(r.avisos, []);
    const escrito = fs.readFileSync(abs, "utf8");
    assert.match(escrito, /no puede\*\* tener protección de rama hoy/);
    assert.equal(escrito.includes("🕳️"), false);
  } finally {
    fs.rmSync(destino, { recursive: true, force: true });
  }
});
