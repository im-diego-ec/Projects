import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import http from "node:http";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const correrAsync = promisify(execFile);
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const WORKFLOW = path.join(RAIZ, "plantilla/.github/workflows/desplegar.yml");

// ---------------------------------------------------------------------------
// QUE EL DESPLIEGUE HAYA SALIDO 0 NO ES QUE EL SITIO CONTESTE.
//
// El workflow terminaba imprimiendo "publicado. La direccion la imprime el paso
// anterior" sin haber consultado nunca esa direccion. Un verde que no midio nada:
// wrangler puede subir los archivos y el sitio quedar sirviendo un 404 --una ruta
// base mal puesta, un adaptador que no se aplico, un subdominio que todavia no
// existe-- y el pipeline se ponia igual de verde.
//
// ESTE BANCO NO LEE EL YAML Y SE DA POR SATISFECHO. Extrae el script del paso y
// LO CORRE contra un servidor de mentira que contesta lo que se le pida, porque
// lo que hay que probar es el comportamiento y no la presencia de unas lineas.
// ---------------------------------------------------------------------------

/** El `run:` del paso que comprueba, sacado del workflow y desindentado. */
function scriptDeLaComprobacion() {
  const t = fs.readFileSync(WORKFLOW, "utf8");
  const desde = t.indexOf("- name: Comprobar que la direccion contesta de verdad");
  assert.notEqual(
    desde,
    -1,
    "el paso de comprobacion no esta en el workflow: el despliegue volvio a decir 'publicado' sin mirar",
  );
  const bloque = t.slice(desde);
  const run = bloque.slice(bloque.indexOf("run: |") + "run: |".length);
  const lineas = [];
  for (const l of run.split("\n").slice(1)) {
    if (l.trim() && !l.startsWith("          ")) break;
    lineas.push(l.slice(10));
  }
  const s = lineas.join("\n");
  assert.ok(s.includes("curl"), "el script extraido no consulta nada: el corte del bloque quedo mal");
  return s.replace(/\{\{PAQUETE_SITIO\}\}/g, "sitio");
}

/** Levanta un servidor que contesta lo que se le diga, corre `fn` con su
 *  direccion y LO CIERRA PASE LO QUE PASE.
 *
 *  El `finally` no es prolijidad: sin el, cualquier asercion que falle antes del
 *  cierre deja el servidor escuchando, eso mantiene vivo el bucle de eventos, y
 *  `node --test` no termina nunca. Medido: una mutacion del workflow hacia fallar
 *  la primera asercion y el banco entero se colgaba en vez de dar rojo. Un banco
 *  que se cuelga en vez de fallar no sirve para comprobar mutaciones, que es
 *  justo para lo que existe este. */
async function conServidor(codigo, cuerpo, fn) {
  const s = http.createServer((_req, res) => {
    res.writeHead(codigo, { "Content-Type": "text/html" });
    res.end(cuerpo);
  });
  await new Promise((r) => s.listen(0, "127.0.0.1", r));
  try {
    return await fn(`http://127.0.0.1:${s.address().port}/`);
  } finally {
    s.close();
  }
}

/** Corre el script con la URL dada y devuelve {codigo, salida}.
 *
 *  EL SCRIPT CORRE TAL CUAL, byte por byte igual al que corre en el runner. Lo
 *  unico que se falsea es el RELOJ: se pone un `sleep` de mentira delante del
 *  PATH, porque los cuarenta y cinco segundos de espera son correctos en un
 *  despliegue de verdad y absurdos en un banco. Falsear el reloj y no el codigo
 *  es lo que hace que esto pruebe algo: si en vez de esto se le cambiaran los
 *  numeros al script, el banco estaria probando otro script. */
async function correr(script, url) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "post-desp-"));
  const sh = path.join(dir, "paso.sh");
  fs.writeFileSync(sh, script);
  const relojFalso = path.join(dir, "bin");
  fs.mkdirSync(relojFalso);
  fs.writeFileSync(path.join(relojFalso, "sleep"), "#!/bin/sh\nexit 0\n", { mode: 0o755 });
  try {
    // `execFile` y no `execFileSync`: la version sincronica BLOQUEA el bucle de
    // eventos de este proceso, y el servidor de mentira vive aca adentro. Con
    // ella, curl se quedaba esperando una respuesta que nadie podia dar y el
    // banco medía un timeout propio en vez del comportamiento del script.
    const { stdout: salida } = await correrAsync("bash", [sh], {
      encoding: "utf8",
      env: {
        ...process.env,
        PATH: `${relojFalso}${path.delimiter}${process.env.PATH}`,
        URL: url,
        GITHUB_STEP_SUMMARY: path.join(dir, "resumen.md"),
      },
    });
    return { codigo: 0, salida, resumen: fs.readFileSync(path.join(dir, "resumen.md"), "utf8") };
  } catch (e) {
    return { codigo: e.code ?? -1, salida: `${e.stdout ?? ""}${e.stderr ?? ""}`, resumen: "" };
  }
}

test("una direccion que contesta 200 con contenido pasa, y queda dicha", async () => {
  const script = scriptDeLaComprobacion();
  await conServidor(200, "<html><body>hola</body></html>", async (url) => {
    const r = await correr(script, url);
    assert.equal(r.codigo, 0, `tendria que pasar y salio ${r.codigo}:\n${r.salida}`);
    assert.match(r.salida, /::notice title=Tu sitio esta en linea::/, "no dice la direccion donde se ve");
    assert.match(r.resumen, /Tu sitio esta publicado/, "no queda en el resumen del job, que es lo primero que se mira");
    assert.ok(r.resumen.includes(url), "el resumen no trae la direccion");
  });
});

test("una direccion que contesta 404 es ROJO, y dice la causa mas comun", async () => {
  const script = scriptDeLaComprobacion();
  await conServidor(404, "no encontrado", async (url) => {
    const r = await correr(script, url);
    assert.notEqual(r.codigo, 0, "un sitio que devuelve 404 se dio por bueno");
    assert.match(r.salida, /::error::/);
    assert.match(r.salida, /subdominio/i, "no nombra la causa mas comun de la primera vez");
  });
});

test("un 200 VACIO tambien es rojo: publicar la nada no es publicar", async () => {
  const script = scriptDeLaComprobacion();
  await conServidor(200, "", async (url) => {
    const r = await correr(script, url);
    assert.notEqual(r.codigo, 0, "un cuerpo vacio con 200 se dio por bueno");
  });
});

test("si no se pudo leer la direccion, NO se afirma que el sitio ande", async () => {
  const r = await correr(scriptDeLaComprobacion(), "");
  assert.notEqual(r.codigo, 0, "sin direccion, el paso salio verde igual");
  assert.match(r.salida, /no se comprob/i, "tiene que decir que NO comprobo, no inventar un estado");
});

test("el paso de publicar guarda la direccion, y no la deja solo en el log", () => {
  const t = fs.readFileSync(WORKFLOW, "utf8");
  assert.match(t, /id: publicar/, "el paso de publicar no tiene id: nadie puede leer su salida");
  assert.match(t, /echo "url=\$URL" >> "\$GITHUB_OUTPUT"/, "la direccion no sale del paso");
  assert.match(t, /workers\\?\.dev/, "no busca la direccion de workers.dev en la salida de wrangler");
  assert.ok(
    !/publicado\. La direccion la imprime el paso anterior/.test(t),
    'volvio el "publicado" que no consultaba nada: es el defecto que este banco cierra',
  );
});

test("MUERDE: el reloj falso no tapa un paso que no reintenta", async () => {
  // Si el script hiciera un solo intento, los casos de arriba pasarian igual y
  // este banco estaria certificando un reintento que no existe. Se comprueba
  // contando los intentos que IMPRIME contra un servidor que nunca contesta.
  const s = scriptDeLaComprobacion();
  const r = await correr(s, "http://127.0.0.1:9/");
  assert.notEqual(r.codigo, 0);
  const intentos = [...r.salida.matchAll(/^intento (\d+):/gm)].map((m) => Number(m[1]));
  assert.deepEqual(intentos, [1, 2, 3, 4], `esperaba cuatro esperas antes del quinto intento y hubo ${intentos.join(", ")}`);
});
