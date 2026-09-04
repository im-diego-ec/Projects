import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { SALIDA } from "../../herramientas/projects-init.mjs";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const HERRAMIENTA = path.join(RAIZ, "herramientas/projects-init.mjs");

// ---------------------------------------------------------------------------
// CANCELAR SALIA 0, Y EL LANZADOR CONTESTABA "LISTO".
//
// El asistente pregunta "¿Escribo esto?" y respeta el "no": no escribe nada. Pero
// salia con codigo 0, y los lanzadores --que solo miran cero contra no-cero--
// contestaban:
//
//     Listo el paso 1. Lo que elegiste quedo en: <ruta>/valores.json
//     El paso que sigue esta impreso arriba.
//
// Sobre un archivo que la persona acababa de decidir que NO se escribiera, y que
// no existia. Decirle "listo" a alguien que acaba de decir "no" es la forma mas
// directa de que deje de creerle a la herramienta.
//
// Y SON CUATRO CODIGOS Y NO VEINTIOCHO. Esta herramienta tiene 28 `return 1`
// distintos. Darle uno a cada uno seria maquinaria para un lector que no existe:
// los tres consumidores --los lanzadores, el CI y la puerta web-- no pueden hacer
// nada distinto ante "el lockfile no se pudo leer" y "el pin es invalido". Los
// cuatro que hay entraron porque habia alguien esperandolos.
// ---------------------------------------------------------------------------

test("los cuatro codigos son distintos entre si, y 0 es el unico exito", () => {
  const vals = Object.values(SALIDA);
  assert.equal(new Set(vals).size, vals.length, `dos codigos con el mismo numero: ${JSON.stringify(SALIDA)}`);
  assert.equal(SALIDA.ok, 0, "el exito tiene que ser 0: es lo unico que todo el mundo asume");
  for (const [k, v] of Object.entries(SALIDA)) {
    if (k !== "ok") assert.notEqual(v, 0, `${k} vale 0 y no es un exito`);
  }
});

test("CANCELAR no es haber terminado: sale con su propio codigo", () => {
  // Se corre de verdad: se le contesta al asistente y se le dice "no" al final.
  const base = fs.mkdtempSync(path.join(os.tmpdir(), "cancelar-"));
  const r = spawnSync(process.execPath, [HERRAMIENTA, "--asistente", "--solo-valores", path.join(base, "valores.json")], {
    encoding: "utf8",
    input: "mi-proyecto\nmi-cuenta\n\n\n\n\n\n\n\nno\n",
    stdio: ["pipe", "pipe", "pipe"],
  });
  const salida = `${r.stdout ?? ""}${r.stderr ?? ""}`;
  // El asistente exige una terminal, asi que sin ella aborta antes de preguntar.
  // Ese camino tambien tiene que tener un codigo que NO sea 0: no se armo nada.
  assert.notEqual(r.status, 0, `sin terminal el asistente no armo nada y salio 0:\n${salida.slice(-400)}`);
  assert.ok(!fs.existsSync(path.join(base, "valores.json")), "escribio el archivo de valores igual");
  fs.rmSync(base, { recursive: true, force: true });
});

test("el codigo del cancelado esta CABLEADO en el camino que cancela", () => {
  // El caso de arriba no puede llegar al "no" sin una terminal. Lo que si se puede
  // comprobar sin ella es que el camino que respeta el "no" devuelva ESE codigo y
  // no 0, que es el defecto exacto.
  const fuente = fs.readFileSync(HERRAMIENTA, "utf8");
  const i = fuente.indexOf("No se escribió nada. Volvé a correrlo cuando quieras");
  assert.notEqual(i, -1, "el camino que respeta el 'no' desaparecio: la confirmacion no se puede rechazar");
  const despues = fuente.slice(i, i + 600);
  assert.match(despues, /return SALIDA\.cancelado;/, "cancelar volvio a salir con 0, y el lanzador va a contestar 'Listo'");
});

test("LOS DOS LANZADORES lo distinguen, que es para lo que existe el codigo", () => {
  // Un codigo de salida que nadie mira no sirve para nada. Estos dos son sus
  // unicos lectores y tienen que decir cosas distintas.
  for (const [archivo, patron] of [
    ["arrancar.sh", /if \[ "\$CODIGO" -eq 3 \]/],
    ["arrancar.cmd", /if "%CODIGO%"=="3"/],
  ]) {
    const t = fs.readFileSync(path.join(RAIZ, archivo), "utf8");
    assert.match(t, patron, `${archivo} no distingue el cancelado: va a decir "Listo" a quien dijo que no`);
    assert.match(t, /no se escribio nada/i, `${archivo} no dice que no se escribio nada`);
    // Y el camino exitoso tiene que seguir teniendo SU mensaje, distinto de este.
    // Si los dos dijeran lo mismo, distinguir el codigo no habria servido de nada.
    //
    // Ese mensaje cambio cuando el lanzador dejo de delegar el paso 2: antes era
    // "Listo el paso 1, lo que elegiste quedo en valores.json" --que ademas era la
    // mentira que este caso vino a cerrar-- y ahora es el del proyecto ya armado.
    assert.match(t, /LISTO\. Tu proyecto esta en/, `${archivo} perdio el mensaje del camino exitoso`);
    // SOBRE LAS LINEAS EJECUTABLES, no sobre el archivo entero: la frase vieja
    // sigue escrita --dentro del comentario que explica por que se fue-- y una
    // busqueda sobre el texto crudo la encuentra ahi y da un rojo que no existe.
    // Es la misma leccion que el banco del despliegue ya tenia escrita para el
    // `cancel-in-progress`: se miran las lineas que corren, no el comentario de
    // al lado.
    const ejecutables = t
      .split("\n")
      .filter((l) => !/^\s*(#|REM\b|::)/i.test(l))
      .join("\n");
    assert.ok(
      !/Listo el paso 1/.test(ejecutables),
      `${archivo} volvio al mensaje viejo, que anunciaba un paso 1 terminado y dejaba el proyecto sin armar`,
    );
  }
});

test("un uso mal escrito sale con el codigo de uso, no con el de fallo", () => {
  // Son distintos porque no hay nada roto que arreglar: hay que volver a tipear.
  const r = spawnSync(process.execPath, [HERRAMIENTA, "--que-se-yo"], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  assert.equal(r.status, SALIDA.uso, `un argumento desconocido salio ${r.status} y no ${SALIDA.uso}`);
});

test("una corrida que anda sale 0, para que los de arriba midan algo", () => {
  const r = spawnSync(process.execPath, [HERRAMIENTA, "--ejemplo"], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  assert.equal(r.status, SALIDA.ok);
});
