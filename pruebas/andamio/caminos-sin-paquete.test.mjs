// LOS CAMINOS «SIN FRONTEND» Y «SIN E2E» SE PUEDEN SEGUIR AL PIE DE LA LETRA.
//
// QUE DEFECTO CIERRA. La guia del andamio decia, para un proyecto sin frontend,
// «borrar los bloques [FRONT] de eslint.config.mjs y sus imports», y la salida de
// `projects init` lo mismo. Pero:
//   · los bloques [FRONT] marcaban solo su APERTURA, y no tienen todos la misma
//     forma —uno es un objeto, otro un spread con `.map()` seguido de un objeto
//     que usa ese plugin—, asi que deducir donde termina cada uno rompia el
//     archivo (lo pago Rigel el 2026-08-31, change `2026-08-31-andamio-con-
//     aplicacion`, commit 1bd6dc0: eslint salia 2, error de configuracion);
//   · el camino toca SEIS lugares y la guia nombraba uno. Lo mismo el de E2E, que
//     nombraba dos y encima omitia el `pnpm format` que el formateador exige
//     despues (medido el 2026-09-17: sin el, `pnpm verificar` sale 1).
//
// Las dos listas se recorrieron hasta verde sobre un repo recien instanciado y
// quedaron escritas en plantilla/README.md. Este banco sostiene tres cosas que
// se pudren en silencio: que cada bloque [FRONT] tenga su cierre y que borrarlos
// deje un archivo que parsea y no nombra los plugins; que la guia y la salida de
// la herramienta (CON_LIMPIEZA_MANUAL) nombren los MISMOS lugares; y que las
// cantidades que la guia afirma («las cuatro entradas», «los tres import») sean
// las que el andamio trae.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { CON_LIMPIEZA_MANUAL } from "../../herramientas/projects-init.mjs";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const ANDAMIO = path.join(RAIZ, "plantilla");
const leer = (rel) => fs.readFileSync(path.join(ANDAMIO, rel), "utf8");

// ── [FRONT] … [/FRONT] ───────────────────────────────────────────────────────

/** Lo que quedaria de eslint.config.mjs despues de seguir el paso 2 del camino
 *  «sin frontend» mecanicamente, o los problemas que lo impiden. */
export function sinFrontend(texto) {
  const problemas = [];
  const salida = [];
  let abierto = null;
  const lineas = texto.split("\n");
  lineas.forEach((l, i) => {
    if (/^\s*\/\/ \[FRONT\]/.test(l)) {
      if (abierto !== null) problemas.push(`linea ${i + 1}: un [FRONT] se abre sin que se haya cerrado el de la linea ${abierto + 1}`);
      abierto = i;
      return;
    }
    if (/^\s*\/\/ \[\/FRONT\]\s*$/.test(l)) {
      if (abierto === null) problemas.push(`linea ${i + 1}: un [/FRONT] que no cierra nada`);
      abierto = null;
      return;
    }
    if (abierto !== null) return;
    if (/^import .*\/\/ \[FRONT\]/.test(l)) return;
    salida.push(l);
  });
  if (abierto !== null) {
    problemas.push(
      `linea ${abierto + 1}: el bloque [FRONT] no tiene su // [/FRONT]. Sin el cierre, quien borra los bloques tiene que ` +
        "deducir donde termina cada uno, y los bloques no tienen todos la misma forma: la deduccion rompe el archivo",
    );
  }
  return { problemas, texto: salida.join("\n") };
}

test("cada bloque [FRONT] de eslint.config.mjs tiene su cierre, y borrarlos deja un archivo sano", () => {
  const original = leer("eslint.config.mjs");
  const aperturas = original.split("\n").filter((l) => /^\s*\/\/ \[FRONT\]/.test(l)).length;
  assert.ok(aperturas >= 3, `solo ${aperturas} bloques [FRONT]: el banco perdio su sujeto`);
  const { problemas, texto } = sinFrontend(original);
  assert.deepEqual(problemas, []);
  // Ninguna referencia a lo que se borro: un plugin usado despues de borrar su
  // import deja un eslint que no arranca.
  for (const nombre of ["reactHooks", "reactRefresh", "pluginQuery", "@tanstack/query", "react-hooks/", "react-refresh/"]) {
    const codigo = texto.split("\n").filter((l) => !/^\s*\/\//.test(l)).join("\n");
    assert.ok(!codigo.includes(nombre), `despues de borrar los bloques [FRONT] el archivo sigue nombrando ${nombre}`);
  }
  // Y parsea: se chequea la sintaxis sin resolver los imports.
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "sin-front-"));
  try {
    const archivo = path.join(tmp, "eslint.config.mjs");
    fs.writeFileSync(archivo, texto);
    const r = spawnSync(process.execPath, ["--check", archivo], { encoding: "utf8" });
    assert.equal(r.status, 0, `borrar los bloques [FRONT] deja un archivo que no parsea:\n${r.stderr}`);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test("el control del cierre MUERDE: un [FRONT] sin su [/FRONT] se caza", () => {
  const original = leer("eslint.config.mjs");
  const sinCierres = original.replace(/^\s*\/\/ \[\/FRONT\]\s*\n/m, "");
  assert.notEqual(sinCierres, original, "no habia ningun [/FRONT] que sacar: la mutacion pasaria en vacio");
  assert.notDeepEqual(sinFrontend(sinCierres).problemas, []);
});

// ── La guia y la herramienta nombran los mismos lugares ─────────────────────

const PALABRAS = { dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10 };

/** Los pasos numerados de una subseccion de la guia, y el primer nombre entre
 *  comillas invertidas de cada uno: es el lugar que ese paso toca. */
function lugaresDeLaGuia(titulo) {
  const guia = leer("README.md");
  const i = guia.indexOf(`#### ${titulo}`);
  assert.notEqual(i, -1, `plantilla/README.md perdio la subseccion «${titulo}»`);
  const resto = guia.slice(i + titulo.length + 5);
  const fin = resto.search(/\n#{2,4} /);
  const cuerpo = fin === -1 ? resto : resto.slice(0, fin);
  const pasos = [...cuerpo.matchAll(/^\d+\. (.*)$/gm)].map((m) => m[1]);
  return pasos.map((p) => (p.match(/`([^`]+)`/) ?? [null, null])[1]);
}

for (const [clave, titulo] of [
  ["PAQUETE_WEB", "Si el proyecto NO tiene frontend"],
  ["PAQUETE_E2E", "Si el proyecto NO tiene suite E2E"],
]) {
  test(`«${titulo}»: la guia y la salida de projects init nombran los mismos lugares`, () => {
    const lugares = lugaresDeLaGuia(titulo);
    assert.ok(lugares.length >= 3, `la subseccion tiene ${lugares.length} pasos: el lector se rompio`);
    assert.ok(!lugares.includes(null), "hay un paso que no nombra su lugar entre comillas invertidas");
    const texto = CON_LIMPIEZA_MANUAL[clave];
    for (const lugar of lugares) {
      assert.ok(
        texto.includes(lugar),
        `la guia manda a tocar ${lugar} y la salida de projects init (CON_LIMPIEZA_MANUAL.${clave}) no lo nombra: ` +
          "quien siga la herramienta en vez de la guia deja ese lugar sin tocar y el repo queda en rojo",
      );
    }
    const cuantos = texto.match(/son (\w+) lugares/)?.[1];
    assert.equal(PALABRAS[cuantos], lugares.length, `CON_LIMPIEZA_MANUAL.${clave} dice "${cuantos}" lugares y la guia tiene ${lugares.length}`);
    assert.ok(texto.includes(titulo), `CON_LIMPIEZA_MANUAL.${clave} no remite a la subseccion «${titulo}» de la guia`);
    // Cada lugar que es un archivo o carpeta tiene que existir en el andamio.
    for (const lugar of lugares.filter((l) => /[./]/.test(l) && !l.includes(" "))) {
      const rel = lugar === "README.md" ? "README-del-proyecto.md" : lugar;
      assert.ok(fs.existsSync(path.join(ANDAMIO, rel)), `la guia nombra ${lugar} y el andamio no lo trae`);
    }
  });
}

test("las cantidades que afirma la guia son las que trae el andamio", () => {
  const settings = JSON.parse(leer(".claude/settings.json")).permissions.allow;
  assert.equal(settings.filter((e) => /--filter \{\{PAQUETE_WEB\}\} /.test(e)).length, 4, "«las cuatro entradas pnpm --filter web»");
  assert.equal(leer("comandos-levantar-servicios.txt").split("\n").filter((l) => /web\/\.env\.example/.test(l)).length, 2, "«las dos líneas que copian web/.env.example»");
  assert.equal(leer("eslint.config.mjs").split("\n").filter((l) => /^import .*\/\/ \[FRONT\]/.test(l)).length, 3, "«los tres import marcados»");
  const dev = JSON.parse(leer("package.json")).devDependencies;
  for (const d of ["eslint-plugin-react-hooks", "eslint-plugin-react-refresh", "@tanstack/eslint-plugin-query"]) {
    assert.ok(dev[d], `la guia manda a sacar ${d} de devDependencies y el andamio no lo declara`);
  }
  const excepciones = leer(".github/workflows/ci.yml").match(/EXCEPCIONES: "([^"]*)"/)?.[1] ?? "";
  assert.equal(excepciones.split(/\s+/).filter((e) => e.startsWith("{{PAQUETE_E2E}}:")).length, 2, "«las dos entradas de EXCEPCIONES»");
});

// ── El camino «sin cliente de datos» nombra cada lugar donde viaja el comando ──
//
// EL DEFECTO QUE CIERRA, y lo agrava el `postinstall` que suma el change
// `el-andamio-nace-instalable`: CON_LIMPIEZA_MANUAL.GENERAR_CLIENTE_DATOS
// nombraba UN lugar —el paso del ci.yml— cuando el comando viajaba a tres (el
// script `datos` de la raiz, el `build` del paquete de datos y ese paso), y la
// propia tabla del README del marco decia que borrar el paso «no alcanza». Con
// el postinstall son cuatro, y el mas caro de olvidar es ese: sin comando, el
// `pnpm install` del proyecto sale rojo. La lista de lugares se DERIVA del
// andamio: cada archivo que viaja y lleva el marcador en una linea que no es
// comentario tiene que estar nombrado en la salida de la herramienta.
const FUERA_DEL_CAMINO_DE_DATOS = {
  // El registro de los valores del proyecto: guarda el comando, no lo ejecuta.
  ".projects-valores.json": "registro de valores",
};

/** Los archivos del andamio que viajan con la forma que tiene capa de datos y
 *  ejecutan el comando del marcador (fuera de comentarios). */
function lugaresDelComandoDeDatos() {
  const lugares = [];
  (function caminar(rel) {
    for (const e of fs.readdirSync(path.join(ANDAMIO, rel), { withFileTypes: true })) {
      if (e.name === "node_modules") continue;
      const r = rel ? `${rel}/${e.name}` : e.name;
      if (e.isDirectory()) {
        caminar(r);
        continue;
      }
      if (r === "README.md" || FUERA_DEL_CAMINO_DE_DATOS[r]) continue;
      const vivas = fs
        .readFileSync(path.join(ANDAMIO, r), "utf8")
        .split("\n")
        .filter((l) => l.includes("{{GENERAR_CLIENTE_DATOS}}") && !/^\s*(#|\/\/|\*)/.test(l));
      if (vivas.length) lugares.push(r);
    }
  })("");
  return lugares.sort();
}

test("«sin cliente de datos»: la salida de projects init nombra cada archivo donde viaja el comando", () => {
  const lugares = lugaresDelComandoDeDatos();
  assert.ok(lugares.length >= 3, `solo ${lugares.length} lugares con el comando de datos: el lector se rompio (${lugares.join(", ")})`);
  const texto = CON_LIMPIEZA_MANUAL.GENERAR_CLIENTE_DATOS;
  const faltan = lugares.filter((rel) => !new RegExp(`(^|[^\\w/.-])${rel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(texto));
  assert.deepEqual(
    faltan,
    [],
    "el comando de GENERAR_CLIENTE_DATOS viaja a estos archivos y la salida de projects init " +
      "(CON_LIMPIEZA_MANUAL.GENERAR_CLIENTE_DATOS) no los nombra: quien no genera cliente de datos sigue la salida, " +
      "deja el comando ahi y el repo queda en rojo (el postinstall, en el primer `pnpm install`)",
  );
  assert.match(texto, /postinstall/, "la salida no nombra el postinstall, que es el que rompe el install si queda sin comando");
});
