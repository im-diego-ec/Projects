import test from "node:test";
import assert from "node:assert/strict";

import {
  REGISTRO_POR_DEFECTO,
  TIMEOUT_POR_DEFECTO,
  MAX_EN_PARALELO,
  VARIABLE_DE_REGISTRO,
  LARGO_MAXIMO_DE_VERSION,
  registroDe,
  urlDeEtiquetas,
  esVersionPublicable,
  nombreDePaqueteValido,
  consultarEtiquetas,
  consultarEtiquetasDe,
  alcanzaElRegistro,
} from "../../herramientas/registro-npm.mjs";

import { levantarRegistro } from "./registro-falso.mjs";

// ---------------------------------------------------------------------------
// EL BANCO DE LA PUERTA AL REGISTRO DE NPM.
//
// POR QUE EXISTE ESTE ARCHIVO. Hasta este cambio no existia, y el modulo que
// cubre —igual que projects-versiones.mjs, que lo usa— NO LO IMPORTABA NADIE en
// todo el repo: medido con cobertura real, los dos salian "nunca se cargo" en la
// corrida completa del banco. O sea que sus ramas de error eran exactamente lo
// que su propio encabezado declara inaceptable: codigo que nadie ejecuto jamas.
// Y el arnes para probarlas (pruebas/init/registro-falso.mjs) tambien estaba
// escrito y tambien era huerfano.
//
// TODO CORRE SIN RED. El registro de mentira levanta en 127.0.0.1 con puerto
// efimero y la herramienta se apunta ahi por la MISMA variable de entorno con la
// que una organizacion la apunta a su espejo interno. Un banco que sale a
// internet se pone rojo cuando falla la red de otro.
//
// LO QUE ESTE ARCHIVO VIGILA POR ENCIMA DE TODO: que lo que contesta el otro
// lado no llegue crudo a ningun lado. El registro es un TERCERO, y su respuesta
// termina —dos funciones mas alla— pegada dentro de las comillas de un
// package.json que alguien instala.
// ---------------------------------------------------------------------------

test("registroDe: el default, y las tres formas de decir 'no la configure'", () => {
  assert.equal(registroDe({}), REGISTRO_POR_DEFECTO);
  assert.equal(registroDe({ [VARIABLE_DE_REGISTRO]: "" }), REGISTRO_POR_DEFECTO);
  assert.equal(registroDe({ [VARIABLE_DE_REGISTRO]: "   " }), REGISTRO_POR_DEFECTO);
  assert.equal(registroDe({ [VARIABLE_DE_REGISTRO]: 7 }), REGISTRO_POR_DEFECTO);
  // Y la barra final se saca, para que las URLs no queden con `//`.
  assert.equal(registroDe({ [VARIABLE_DE_REGISTRO]: "http://espejo.interno/npm//" }), "http://espejo.interno/npm");
});

test("urlDeEtiquetas: la barra del scope se codifica y la arroba NO", () => {
  assert.equal(urlDeEtiquetas("typescript", "http://r"), "http://r/-/package/typescript/dist-tags");
  assert.equal(urlDeEtiquetas("@eslint/js", "http://r"), "http://r/-/package/@eslint%2Fjs/dist-tags");
});

// LA SEGUNDA CAPA, medida sobre la funcion suelta: la codificacion por segmento.
// Cierra la query, el fragmento y la barra de mas — que eran tres de los cuatro
// casos medidos.
test("urlDeEtiquetas: ni query, ni fragmento, ni una barra de mas sobreviven a la codificacion", () => {
  for (const [clave, esperado] of [
    ["a?x=1", "http://r/-/package/a%3Fx%3D1/dist-tags"],
    ["a#f", "http://r/-/package/a%23f/dist-tags"],
    ["@a/b/c", "http://r/-/package/@a%2Fb%2Fc/dist-tags"],
  ]) {
    const url = urlDeEtiquetas(clave, "http://r");
    assert.equal(url, esperado, `clave ${JSON.stringify(clave)}`);
    const u = new URL(url);
    assert.equal(u.search, "", `la clave ${JSON.stringify(clave)} metio query string`);
    assert.equal(u.hash, "", `la clave ${JSON.stringify(clave)} metio fragmento`);
    assert.match(u.pathname, /^\/-\/package\/[^/]+\/dist-tags$/, `la clave ${JSON.stringify(clave)} salio del endpoint`);
  }
});

// EL CASO QUE LA CODIFICACION NO CIERRA, escrito como prueba para que nadie
// vuelva a creer que si. El parser de WHATWG —el que usa `fetch`— decodifica
// `%2E` y despues colapsa el segmento de puntos: escapar los puntos NO defiende.
// Lo que defiende es la validacion del nombre, y eso se prueba mas abajo,
// contando los pedidos que le llegan al registro (cero).
test("urlDeEtiquetas: el recorrido de directorio NO lo cierra la codificacion, y esta medido", () => {
  assert.equal(new URL(urlDeEtiquetas("..", "http://r")).pathname, "/-/dist-tags");
  assert.equal(nombreDePaqueteValido(".."), false, "la unica defensa contra eso es esta, y tiene que decir que no");
});

test("nombreDePaqueteValido: lo que pasa y lo que no", () => {
  for (const bueno of ["typescript", "@eslint/js", "@prisma/adapter-pg", "vite", "A-B", "a.b_c-d", "x0"]) {
    assert.equal(nombreDePaqueteValido(bueno), true, `deberia pasar: ${bueno}`);
  }
  for (const malo of ["", "..", ".", "a?x=1", "a#f", "@a/b/c", "a/b", "@a", "_privado", "-guion", "a b", "@/x", 7, null, undefined]) {
    assert.equal(nombreDePaqueteValido(malo), false, `NO deberia pasar: ${JSON.stringify(malo)}`);
  }
  assert.equal(nombreDePaqueteValido("a".repeat(215)), false);
});

test("esVersionPublicable: la forma de semver, y NADA mas", () => {
  for (const buena of ["7.0.2", "11.23.0", "8.0.0-rc.10", "1.0.0+build.5", "0.0.1-alpha.1+x"]) {
    assert.equal(esVersionPublicable(buena), true, `deberia pasar: ${buena}`);
  }
  // El payload de la inyeccion, textual: es JSON valido pegado dentro de las
  // comillas del manifiesto, y ahi adentro `scripts.preinstall` se ejecuta con
  // el `pnpm install` que la propia herramienta manda a correr despues.
  const payload = '9.9.9"}, "scripts": { "preinstall": "echo TE-EJECUTE" }, "zzz": { "a": "1';
  assert.equal(esVersionPublicable(payload), false);
  // Y las cuatro cadenas que son sintaxis de reemplazo de String.replace.
  for (const mala of ["1.2.3$&", "1.2.3$'", "1.2.3$`", "1.2.3$1", "1.2", "latest", "^1.2.3", "1.2.3\n", "", null]) {
    assert.equal(esVersionPublicable(mala), false, `NO deberia pasar: ${JSON.stringify(mala)}`);
  }
  assert.equal(esVersionPublicable(`1.0.0-${"a".repeat(LARGO_MAXIMO_DE_VERSION)}`), false);
});

test("consultarEtiquetas: el camino feliz devuelve el latest tal cual", async () => {
  const r = await levantarRegistro({ tags: { typescript: "7.0.2" } });
  try {
    const q = await consultarEtiquetas("typescript", { registro: r.url });
    assert.deepEqual(q, { paquete: "typescript", latest: "7.0.2", error: null });
    assert.deepEqual(r.pedidos, ["/-/package/typescript/dist-tags"]);
  } finally {
    await r.cerrar();
  }
});

test("consultarEtiquetas: las tres formas de portarse mal del otro lado caen en error, nunca en latest", async () => {
  const r = await levantarRegistro({ tags: { conocido: "1.0.0", "sin-latest": { beta: "2.0.0" }, "roto": "no-json" } });
  try {
    const noExiste = await consultarEtiquetas("no-existe", { registro: r.url });
    assert.equal(noExiste.latest, null);
    assert.match(noExiste.error, /404/);

    const sinLatest = await consultarEtiquetas("sin-latest", { registro: r.url });
    assert.equal(sinLatest.latest, null);
    assert.match(sinLatest.error, /no trae el tag latest/);

    const roto = await consultarEtiquetas("roto", { registro: r.url });
    assert.equal(roto.latest, null);
    assert.match(roto.error, /no era JSON/);
  } finally {
    await r.cerrar();
  }
});

// EL CASO POR EL QUE ESTE ARCHIVO EXISTE.
test("consultarEtiquetas: un latest que no es una version NO se devuelve como hecho", async () => {
  const payload = '9.9.9"}, "scripts": { "preinstall": "echo TE-EJECUTE" }, "zzz": { "a": "1';
  const r = await levantarRegistro({ tags: { victima: payload } });
  try {
    const q = await consultarEtiquetas("victima", { registro: r.url });
    assert.equal(q.latest, null, "el texto del registro se devolvio como si fuera una version");
    assert.match(q.error, /no tiene forma de version publicable/);
    // El detalle del error no puede ser el vector: se recorta y se serializa.
    assert.ok(q.error.length < 300, "el error repite el payload entero");
  } finally {
    await r.cerrar();
  }
});

test("consultarEtiquetas: un nombre hostil no llega a salir a la red", async () => {
  const r = await levantarRegistro({ tags: {} });
  try {
    for (const clave of ["..", "../../-/ping", "a?x=1", "a#f", "@a/b/c"]) {
      const q = await consultarEtiquetas(clave, { registro: r.url });
      assert.equal(q.latest, null, `${clave} devolvio una version`);
      assert.match(q.error, /no tiene la forma que documenta npm/);
    }
    assert.deepEqual(r.pedidos, [], "se le pidio algo al registro con un nombre que no se valido");
  } finally {
    await r.cerrar();
  }
});

test("consultarEtiquetas: un registro que acepta y se calla vence por el techo de tiempo", async () => {
  const r = await levantarRegistro({ mudo: true });
  try {
    const q = await consultarEtiquetas("typescript", { registro: r.url, timeout: 250 });
    assert.equal(q.latest, null);
    assert.match(q.error, /no contesto en 250 ms/);
  } finally {
    await r.cerrar();
  }
});

test("consultarEtiquetasDe: deduplica, y devuelve una entrada por nombre unico incluidas las que fallaron", async () => {
  const r = await levantarRegistro({ tags: { typescript: "7.0.2" } });
  try {
    const m = await consultarEtiquetasDe(["typescript", "typescript", "typescript", "fantasma"], { registro: r.url });
    assert.equal(m.size, 2);
    assert.equal(m.get("typescript").latest, "7.0.2");
    assert.equal(m.get("fantasma").latest, null);
    assert.match(m.get("fantasma").error, /404/);
    // Tres declaraciones del mismo paquete son UNA consulta.
    assert.equal(r.pedidos.filter((p) => p.includes("typescript")).length, 1);
  } finally {
    await r.cerrar();
  }
});

test("consultarEtiquetasDe: nunca hay mas de MAX_EN_PARALELO consultas en vuelo", async () => {
  let enVuelo = 0;
  let pico = 0;
  const nombres = Array.from({ length: 120 }, (_, i) => `paquete-${i}`);
  const buscar = async () => {
    enVuelo++;
    pico = Math.max(pico, enVuelo);
    await new Promise((listo) => setTimeout(listo, 1));
    enVuelo--;
    return { ok: true, json: async () => ({ latest: "1.0.0" }) };
  };
  const m = await consultarEtiquetasDe(nombres, { buscar, registro: "http://no-se-usa" });
  assert.equal(m.size, 120, "se perdieron nombres por el camino");
  assert.equal([...m.values()].every((r) => r.latest === "1.0.0"), true);
  assert.ok(pico <= MAX_EN_PARALELO, `hubo ${pico} consultas en vuelo a la vez, con techo ${MAX_EN_PARALELO}`);
  assert.ok(pico > 1, "el techo no puede ser tan bajo que las serialice");
});

test("consultarEtiquetasDe: con la lista vacia no explota y no consulta nada", async () => {
  const m = await consultarEtiquetasDe([], { buscar: () => assert.fail("no habia nada que consultar") });
  assert.equal(m.size, 0);
});

test("alcanzaElRegistro: si, no, y el que no contesta", async () => {
  const bien = await levantarRegistro({ ping: 200 });
  try {
    assert.deepEqual(await alcanzaElRegistro({ registro: bien.url }), { ok: true, registro: bien.url, error: null });
    assert.deepEqual(bien.pedidos, ["/-/ping"]);
  } finally {
    await bien.cerrar();
  }

  const roto = await levantarRegistro({ ping: 502 });
  try {
    const q = await alcanzaElRegistro({ registro: roto.url });
    assert.equal(q.ok, false);
    assert.match(q.error, /contesto 502/);
  } finally {
    await roto.cerrar();
  }

  const callado = await levantarRegistro({ ping: 0 });
  try {
    const q = await alcanzaElRegistro({ registro: callado.url, timeout: 250 });
    assert.equal(q.ok, false);
    assert.match(q.error, /no contesto en 250 ms/);
  } finally {
    await callado.cerrar();
  }
});

test("el techo de tiempo por defecto sigue siendo un numero util", () => {
  assert.ok(Number.isInteger(TIMEOUT_POR_DEFECTO) && TIMEOUT_POR_DEFECTO >= 1000 && TIMEOUT_POR_DEFECTO <= 30000);
  assert.ok(Number.isInteger(MAX_EN_PARALELO) && MAX_EN_PARALELO >= 2);
});
