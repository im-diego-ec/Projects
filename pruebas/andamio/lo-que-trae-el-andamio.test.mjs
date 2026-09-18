// LA GUIA DEL ANDAMIO DICE LO QUE EL ANDAMIO REPARTE, Y UN BANCO LO MIDE.
//
// QUE DEFECTO CIERRA. La seccion 4 de plantilla/README.md se llamaba «Lo que el
// scaffold NO trae» y listaba como cosas del proyecto `package.json`,
// `pnpm-workspace.yaml`, «el resto de .github/workflows/* (deploy…)», `infra/` e
// `infra-prod/`. Los cinco llegan con el andamio (medido el 2026-09-17), asi que
// la guia mandaba a buscar o escribir a mano cosas que ya estaban; y el snippet
// de `package.json` que seguia pinaba versiones que el andamio ya no usa. Rigel
// tuvo el mismo defecto (2.1.0, change `2026-09-07-el-despliegue-se-hereda`,
// commit 4ac068c) y lo arreglo reescribiendo la tabla; aca se reescribe y ademas
// se ata: una tabla que describe el arbol envejece en silencio en cuanto el arbol
// cambia, y ya envejecio una vez.
//
// LO QUE MIDE. Cada entrada de la raiz de plantilla/ tiene una fila, cada fila
// nombra algo que existe, y la columna «Llega» dice lo que `projects init`
// reparte de verdad: se DERIVA de `archivosDelAndamio` para cada forma y cada
// plataforma, no de una lista escrita aca.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { archivosDelAndamio, FORMAS, PLATAFORMAS } from "../../herramientas/projects-init.mjs";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const ANDAMIO = path.join(RAIZ, "plantilla");
const TITULO = "## 4. Lo que el scaffold trae, y lo que no";

/** Las filas de la primera tabla de la seccion 4: nombres de la primera celda y
 *  la etiqueta de la segunda. */
export function filasDeLaSeccion(guia) {
  const i = guia.indexOf(TITULO);
  if (i === -1) return null;
  const resto = guia.slice(i + TITULO.length);
  const fin = resto.search(/\n## /);
  const seccion = fin === -1 ? resto : resto.slice(0, fin);
  const lineas = seccion.split("\n");
  const inicio = lineas.findIndex((l) => /^\|\s*Qué\s*\|\s*Llega\s*\|/.test(l));
  if (inicio === -1) return null;
  const filas = [];
  for (const l of lineas.slice(inicio + 2)) {
    if (!l.startsWith("|")) break;
    const celdas = l.split("|").slice(1, -1).map((c) => c.trim());
    filas.push({ nombres: [...celdas[0].matchAll(/`([^`]+)`/g)].map((m) => m[1]), llega: celdas[1] });
  }
  return filas;
}

/** Que dice la herramienta de una entrada de la raiz del andamio. */
function categoria(entrada) {
  const combos = [];
  for (const forma of FORMAS) {
    for (const plataforma of PLATAFORMAS) {
      const viaja = archivosDelAndamio(ANDAMIO, plataforma, forma).some((r) => r === entrada || r.startsWith(`${entrada}/`));
      if (viaja) combos.push({ forma, plataforma });
    }
  }
  const total = FORMAS.length * PLATAFORMAS.length;
  if (combos.length === 0) return "no viaja";
  if (combos.length === total) return "siempre";
  const formas = new Set(combos.map((c) => c.forma));
  if (formas.size === 1 && combos.length === PLATAFORMAS.length) return `solo ${[...formas][0] === "aplicacion" ? "aplicación" : [...formas][0]}`;
  return "según plataforma";
}

/** Los desfases entre la tabla y el arbol. Pura sobre el texto de la guia. */
export function desfases(guia) {
  const filas = filasDeLaSeccion(guia);
  if (!filas) return [`plantilla/README.md perdio la seccion «${TITULO.slice(3)}» o su tabla con las columnas Qué y Llega`];
  if (filas.length < 5) return [`la tabla de la seccion 4 tiene ${filas.length} filas: el lector se rompio`];
  const problemas = [];
  const enLaTabla = new Map();
  for (const f of filas) for (const n of f.nombres) enLaTabla.set(n, f.llega);
  const entradas = fs.readdirSync(ANDAMIO).filter((n) => n !== "node_modules");
  for (const e of entradas) {
    if (!enLaTabla.has(e)) {
      problemas.push(`plantilla/${e} no tiene fila en la seccion 4 de la guia: quien la lea no sabe que el andamio lo trae ni cuando`);
      continue;
    }
    const dice = enLaTabla.get(e);
    const es = categoria(e);
    if (dice !== es) problemas.push(`la guia dice que ${e} llega «${dice}» y projects init lo reparte «${es}»`);
  }
  for (const n of enLaTabla.keys()) {
    if (!entradas.includes(n)) problemas.push(`la seccion 4 nombra ${n} y plantilla/ no lo trae`);
  }
  return problemas;
}

test("la seccion 4 de la guia describe lo que el andamio reparte", () => {
  assert.deepEqual(desfases(fs.readFileSync(path.join(ANDAMIO, "README.md"), "utf8")), []);
});

test("el banco MUERDE: una fila que miente o que falta se caza", () => {
  const guia = fs.readFileSync(path.join(ANDAMIO, "README.md"), "utf8");
  const mutaciones = [
    { nombre: "infra vuelve a decir que llega siempre", mutar: (t) => t.replace(/(\| `infra`, `infra-prod` *\| )según plataforma/, "$1siempre         ") },
    { nombre: "el package.json vuelve a decir que no viaja", mutar: (t) => t.replace(/(\| `package\.json`, `pnpm-workspace\.yaml` *\| )siempre/, "$1no viaja") },
    { nombre: "desaparece la fila del sitio", mutar: (t) => t.replace(/^\| `sitio` .*\n/m, "") },
  ];
  for (const m of mutaciones) {
    const mutado = m.mutar(guia);
    assert.notEqual(mutado, guia, `la mutacion "${m.nombre}" no cambio nada: su ancla se movio`);
    assert.notDeepEqual(desfases(mutado), [], `la mutacion "${m.nombre}" no fue detectada`);
  }
});
