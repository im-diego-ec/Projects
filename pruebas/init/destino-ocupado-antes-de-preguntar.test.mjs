import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const INIT = path.join(RAIZ, "herramientas/projects-init.mjs");

// ---------------------------------------------------------------------------
// EL ASISTENTE CORROMPIA EL PROYECTO Y DESPUES ABORTABA.
//
// EL DEFECTO, leido en el flujo y reproducido: la guarda del destino ocupado
// vivia ~270 lineas DESPUES de las tres escrituras del asistente. Volver a
// correr `--asistente --destino <un proyecto ya armado>` contestaba las catorce
// preguntas, escribia `.projects-valores.json`, `.projects-respuestas.json` y
// `.projects-desvios.json`, y RECIEN AHI abortaba.
//
// POR QUE ES LO PEOR QUE PUEDE PASAR. Los tres archivos que quedan escritos son
// los DECLARATIVOS: de ahi sale la constitucion del proyecto. Quien reabre el
// asistente para cambiar de plataforma se queda con un `.projects-valores.json`
// diciendo `aws` sobre un arbol sin `infra/`, describiendo una infraestructura
// que no existe. La herramienta que se presenta como «no pasa nada si te
// equivocas» rompia el proyecto EN SILENCIO y salia con error a la vez.
//
// LA ASIMETRIA QUE ESTE BANCO VIGILA. No alcanza con probar que ahora corta:
// hay que probar TAMBIEN que sigue dejando trabajar sobre una carpeta vacia. Una
// guarda que corta siempre "arregla" el defecto y rompe la herramienta.
// ---------------------------------------------------------------------------

function enTemporal(fn) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "destino-ocupado-"));
  try {
    return fn(tmp);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

/** Corre el init sin TTY y devuelve { codigo, salida }. */
function correr(args, cwd) {
  try {
    const salida = execFileSync("node", [INIT, ...args], { cwd, encoding: "utf-8", stdio: ["ignore", "pipe", "pipe"] });
    return { codigo: 0, salida };
  } catch (e) {
    return { codigo: e.status ?? -1, salida: `${e.stdout ?? ""}${e.stderr ?? ""}` };
  }
}

test("sobre un destino con proyecto armado, el asistente corta ANTES de preguntar y no escribe nada", () => {
  enTemporal((tmp) => {
    const destino = path.join(tmp, "p");
    fs.mkdirSync(destino);
    // La marca que significa "aca ya se armo un proyecto": viaja en todas las
    // formas y plataformas, y no esta en LO_QUE_ESCRIBE_EL_ASISTENTE.
    fs.writeFileSync(path.join(destino, "AGENTS.md"), "# constitucion previa\n");
    const valores = path.join(destino, ".projects-valores.json");
    fs.writeFileSync(valores, JSON.stringify({ plataforma: "supabase" }, null, 2));
    const antes = fs.readFileSync(valores, "utf-8");

    const r = correr(["--asistente", "--destino", destino], tmp);

    assert.notEqual(r.codigo, 0, "tiene que salir distinto de cero");
    assert.match(r.salida, /ya tiene un proyecto armado/, `el motivo tiene que nombrarlo. Salida:\n${r.salida}`);
    assert.match(r.salida, /no se escribio nada/i, "y tiene que decir que no escribio nada");
    assert.equal(fs.readFileSync(valores, "utf-8"), antes, "el archivo de valores previo NO puede haber cambiado");
    assert.ok(!fs.existsSync(path.join(destino, ".projects-respuestas.json")), "no puede haber escrito respuestas");
  });
});

test("el error nombra las tres salidas: carpeta nueva, ver lo elegido, y --forzar", () => {
  enTemporal((tmp) => {
    const destino = path.join(tmp, "p");
    fs.mkdirSync(destino);
    fs.writeFileSync(path.join(destino, "AGENTS.md"), "x\n");
    const r = correr(["--asistente", "--destino", destino], tmp);
    for (const pista of ["--destino", ".projects-valores.json", "--forzar"]) {
      assert.ok(r.salida.includes(pista), `el error tiene que nombrar «${pista}». Salida:\n${r.salida}`);
    }
  });
});

test("MUERDE en la otra direccion: sobre una carpeta vacia NO corta por esto", () => {
  enTemporal((tmp) => {
    const destino = path.join(tmp, "vacio");
    fs.mkdirSync(destino);
    const r = correr(["--asistente", "--destino", destino], tmp);
    // Sin TTY corta por OTRO motivo --el de siempre-- y eso es lo correcto: lo
    // que este caso prueba es que la guarda nueva no se metio en el medio.
    assert.ok(
      !/ya tiene un proyecto armado/.test(r.salida),
      `una carpeta vacia no puede disparar la guarda de destino ocupado. Salida:\n${r.salida}`,
    );
    assert.match(r.salida, /stdin no es una terminal/, "tiene que llegar hasta el chequeo de terminal de siempre");
  });
});

test("MUERDE: con --forzar la guarda nueva deja pasar", () => {
  enTemporal((tmp) => {
    const destino = path.join(tmp, "p");
    fs.mkdirSync(destino);
    fs.writeFileSync(path.join(destino, "AGENTS.md"), "x\n");
    const r = correr(["--asistente", "--destino", destino, "--forzar"], tmp);
    assert.ok(
      !/ya tiene un proyecto armado/.test(r.salida),
      `--forzar es la salida declarada del propio error: tiene que dejar pasar. Salida:\n${r.salida}`,
    );
  });
});
