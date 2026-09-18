// EL FORMATO TIENE QUE CORRER EN LOS DOS CARRILES, Y ESO SE PUEDE APAGAR CON UNA LINEA.
//
// El `ci.yml` del andamio tiene dos carriles: el completo y el de docs, que omite
// `build_test` cuando el PR solo toca documentacion. Hasta este change el
// formateador vivia DENTRO de `build_test`, asi que un PR de solo docs nunca lo
// corria, y el `.prettierignore` del andamio SI formatea markdown.
//
// El costo, medido en Rigel (el marco hermano del que viene este arreglo, change
// `2026-08-31-andamio-con-aplicacion`, commit d1c6380): una tabla mal formateada
// entro a `main` con el PR en verde —era de solo docs— y detono en el PR de OTRA
// persona, con una causa que no menciona al PR que la introdujo. Es el peor reparto
// posible de un rojo: lo paga quien no lo produjo, y el que lo produjo ni se entera.
//
// POR QUE UN BANCO Y NO SOLO EL COMENTARIO DEL WORKFLOW. La regresion es de UNA
// LINEA: agregarle `if: needs.marco.outputs.solo_docs == 'false'` al job devuelve el
// agujero entero, y el sintoma no aparece en el PR que lo introduce —aparece semanas
// despues, en el PR de otro—. Un comentario no frena eso; un rojo si.
//
// POR QUE EL LINT NO SE MUDA CON EL FORMATO. Medido el 2026-09-17 en un destino
// recien instanciado con `pnpm install --frozen-lockfile --ignore-scripts`:
// `pnpm format:check` sale 0 y `pnpm lint` sale 1 (ocho errores de tipos sin
// resolver: el linter necesita el cliente de datos generado; el formateador solo
// lee archivos).
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const CI = path.join(RAIZ, "plantilla", ".github", "workflows", "ci.yml");

/** El bloque de texto de un job, desde su clave hasta la del job siguiente. */
export function bloqueDelJob(texto, nombre) {
  const lineas = texto.split("\n");
  const i = lineas.findIndex((l) => l === `  ${nombre}:`);
  if (i < 0) return null;
  let j = i + 1;
  while (j < lineas.length && !/^ {2}[a-z_]+:\s*$/.test(lineas[j])) j += 1;
  return lineas.slice(i, j).join("\n");
}

/** Las lineas de un bloque que no son comentario: un comentario que explica por
 *  que el formato NO esta en build_test tiene que poder nombrar `format:check`. */
const codigo = (bloque) =>
  bloque
    .split("\n")
    .filter((l) => !/^\s*#/.test(l))
    .join("\n");

/** Lo que el banco exige, como funcion pura para poder mutarla abajo. */
export function problemasDelFormato(ci) {
  const problemas = [];
  const formato = bloqueDelJob(ci, "formato");
  if (!formato) {
    return [
      "el andamio dejo de tener un job `formato`. Si volvio adentro de `build_test`, el carril de docs quedo otra vez " +
        "sin mirar el formato, y el rojo lo va a pagar quien no lo produjo",
    ];
  }
  if (!/^\s*- run: pnpm format:check\s*$/m.test(codigo(formato))) problemas.push("el job `formato` no corre `pnpm format:check`");
  const condicion = formato.split("\n").filter((l) => /^ {4}if:/.test(l));
  if (condicion.length) {
    problemas.push(
      `el job \`formato\` tiene una condicion (${condicion.join(" | ").trim()}). Con cualquier \`if\` que dependa del ` +
        "carril, un PR de solo docs vuelve a entrar sin que nada mire el formato",
    );
  }
  if (/^ {4}needs:/m.test(formato)) {
    problemas.push("el job `formato` depende de otro job: si ese se omite en el carril de docs, `formato` se omite con el");
  }
  const buildTest = bloqueDelJob(ci, "build_test");
  if (!buildTest) problemas.push("no encontre el job build_test");
  else if (/pnpm format:check/.test(codigo(buildTest))) {
    problemas.push("`format:check` volvio a `build_test`, que el carril de docs omite. Tiene que vivir en el job `formato`");
  }
  const ciOk = bloqueDelJob(ci, "ci_ok");
  if (!ciOk) problemas.push("no encontre el job ci_ok");
  else {
    if (!/needs:.*\bformato\b/.test(ciOk)) problemas.push("`ci-ok` no declara `formato` en sus `needs`: el job correria sin bloquear el merge");
    // El `skipped` es el caso peligroso: un job omitido no reporta, y aceptar
    // cualquier cosa distinta de `failure` lo dejaria pasar.
    if (!/\[ "\$\{\{ needs\.formato\.result \}\}" = "success" \]/.test(ciOk)) {
      problemas.push(
        "`ci-ok` tiene que exigir que `formato` sea exactamente `success`: un `skipped` significa que alguien le puso " +
          "una condicion al job, y ese es el agujero que este banco cierra",
      );
    }
  }
  return problemas;
}

test("el formato corre en los dos carriles y ci-ok lo exige", () => {
  assert.deepEqual(problemasDelFormato(fs.readFileSync(CI, "utf8")), []);
});

test("el banco MUERDE: cada forma de devolver el agujero se caza", () => {
  const ci = fs.readFileSync(CI, "utf8");
  const mutaciones = [
    {
      nombre: "el job formato gana una condicion de carril",
      mutar: (t) => t.replace(/^( {2}formato:\n)/m, "$1    if: needs.marco.outputs.solo_docs == 'false'\n"),
    },
    {
      nombre: "format:check vuelve a build_test",
      mutar: (t) => t.replace(/^( {6}- run: pnpm lint\n)/m, "$1      - run: pnpm format:check\n"),
    },
    {
      nombre: "ci-ok deja de mirar el resultado del formato",
      mutar: (t) => t.replace(/^.*needs\.formato\.result.*\n/m, ""),
    },
    {
      nombre: "ci-ok deja de esperar al formato",
      mutar: (t) => t.replace(/needs: \[marco, constitucion, formato, build_test\]/, "needs: [marco, constitucion, build_test]"),
    },
  ];
  for (const m of mutaciones) {
    const mutado = m.mutar(ci);
    assert.notEqual(mutado, ci, `la mutacion "${m.nombre}" no cambio nada: su ancla se movio y el banco pasaria en vacio`);
    assert.notDeepEqual(problemasDelFormato(mutado), [], `la mutacion "${m.nombre}" no fue detectada`);
  }
});
