import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";

// ---------------------------------------------------------------------------
// LA GUARDA D5 DEL ARNÉS DEL PILOTO.
//
// D5 dice que el piloto corre «fuera de todo repositorio»: no escribe una línea en
// el marco, ni en `plantilla/`, ni en un consumidor. La guarda del arnés lo hacía
// cumplir ENUMERANDO dos casos prohibidos —que el espacio fuera Projects, o que
// tuviera `plantilla/`— y por eso dejaba pasar el más probable de todos: armar el
// laboratorio dentro de un repo CONSUMIDOR. un-proyecto-anterior no es Projects y no
// tiene `plantilla/`, así que salía exit 0 sobre un espacio que D5 prohíbe.
//
// Medido el 2026-08-22 en las tres direcciones antes de arreglarlo. Es el mismo
// defecto que este marco corrige en todas sus otras superficies: una lista de lo
// prohibido siempre le falta un caso, y el que le falta es el que alguien va a
// hacer. La guarda ahora se DERIVA de la regla: cualquier repositorio es rojo.
//
// ALCANCE, declarado: se prueba el caso que se colaba y que el mensaje nombre el
// arreglo. El camino feliz —un espacio fuera de todo repo— NO se prueba acá:
// pasada la guarda el arnés corre la batería entera (openspec, guardrail, la
// herramienta) y eso tarda minutos y depende de red. Lo que se verificó a mano el
// 2026-08-22 fue que en ese caso la guarda no imprime nada y el arnés sigue.
// ---------------------------------------------------------------------------

const RAIZ = path.resolve(import.meta.dirname, "..", "..");
const ARNES = path.join(RAIZ, "openspec/changes/capa-descubrimiento/piloto/arnes/verificar-brazo.mjs");

function repoTemporal() {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), "arnes-d5-"));
  execFileSync("git", ["init", "-q", "."], { cwd: d });
  execFileSync("git", ["config", "user.email", "t@t"], { cwd: d });
  execFileSync("git", ["config", "user.name", "t"], { cwd: d });
  return d;
}

function correr(espacio) {
  try {
    const salida = execFileSync(process.execPath, [ARNES, espacio, "B"], { encoding: "utf8", stdio: "pipe" });
    return { codigo: 0, salida };
  } catch (e) {
    return { codigo: e.status ?? 1, salida: `${e.stdout ?? ""}${e.stderr ?? ""}` };
  }
}

test("el arnés existe donde el banco lo busca: si no, todo lo de abajo pasa vacuamente", () => {
  assert.ok(fs.existsSync(ARNES), `no encontré el arnés en ${ARNES}`);
});

test("un espacio DENTRO de un repo que no es el marco ni un scaffold es ROJO", () => {
  // El caso que se colaba: un repo cualquiera, sin `plantilla/`, que no es Projects.
  // Es exactamente la forma de un-proyecto-anterior.
  const repo = repoTemporal();
  const espacio = path.join(repo, "espacio");
  fs.mkdirSync(espacio);

  const r = correr(espacio);
  assert.notEqual(r.codigo, 0, "tenía que rechazarlo");
  assert.match(
    r.salida,
    /vive DENTRO de un repositorio de git/,
    "el rechazo tiene que decir que el problema es estar dentro de CUALQUIER repo, no de uno en particular",
  );
});

test("el rechazo trae el arreglo escrito, no solo el diagnóstico", () => {
  const repo = repoTemporal();
  const espacio = path.join(repo, "espacio");
  fs.mkdirSync(espacio);
  const r = correr(espacio);
  // La regla del marco: todo error nombra su arreglo. Un rechazo sin salida deja
  // al builder adivinando dónde poner el laboratorio.
  assert.match(r.salida, /Arreglo: mové el espacio/, r.salida.slice(0, 400));
});

test("la raíz del repo aparece en el mensaje: sin eso no se sabe QUÉ repo es", () => {
  const repo = repoTemporal();
  const espacio = path.join(repo, "espacio");
  fs.mkdirSync(espacio);
  const r = correr(espacio);
  // Un builder puede tener el laboratorio dentro de un repo sin saberlo (un
  // directorio anidado varios niveles). Nombrar la raíz es lo que lo hace
  // diagnosticable en un paso.
  assert.match(r.salida, new RegExp(path.basename(repo).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), r.salida.slice(0, 400));
});

test("el propio repositorio del marco sigue teniendo su mensaje específico", () => {
  // Los dos casos que la guarda ya nombraba dicen MÁS que el general, y por eso se
  // conservaron: si el espacio es el marco, saberlo ahorra el diagnóstico.
  const r = correr(RAIZ);
  assert.notEqual(r.codigo, 0);
  assert.match(r.salida, /repositorio del marco \(Projects\)/, r.salida.slice(0, 400));
});
