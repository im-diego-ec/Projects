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

/** Los pasos de un job, cada uno desde su `- ` (seis espacios) hasta el
 *  siguiente, sin comentarios. Un paso se lee ENTERO porque su `if:` o su
 *  `continue-on-error` pueden ir antes o despues del `run:`. */
export function pasosDelJob(bloque) {
  const pasos = [];
  let actual = null;
  for (const l of codigo(bloque).split("\n")) {
    if (/^ {6}- /.test(l)) {
      actual = [l];
      pasos.push(actual);
    } else if (actual && /^ {8}/.test(l)) actual.push(l);
    else if (/^ {0,6}\S/.test(l)) actual = null;
  }
  return pasos.map((p) => p.join("\n"));
}

/** `continue-on-error` con cualquier valor distinto del literal `false` (que es
 *  el default y no cambia nada). */
const tragaElFallo = (texto, sangria) =>
  new RegExp(`^${sangria}continue-on-error:(?!\\s*false\\s*$)`, "m").test(texto);

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
  // El paso se reconoce por su `run:`, con el valor EXACTO: un `|| true` detras
  // es un formateador que no puede fallar. Un `name:` o un `timeout-minutes:`
  // agregados al paso no cambian nada y no enrojecen.
  const pasoDelFormato = pasosDelJob(formato).filter((p) => /^ {6}- run: pnpm format:check\s*$|^ {8}run: pnpm format:check\s*$/m.test(p));
  if (!pasoDelFormato.length) problemas.push("el job `formato` no corre `pnpm format:check` (exacto, sin nada detras que se trague su fallo)");
  for (const paso of pasoDelFormato) {
    // Un `if:` en el PASO lo omite sin que el job se entere: el job termina en
    // `success` y ci-ok lo acepta. Un paso de diagnostico con su propio `if:`
    // (otro paso) no toca al formateador y no se mira.
    if (/^ {6}- if:|^ {8}if:/m.test(paso)) {
      problemas.push("el paso que corre `pnpm format:check` tiene un `if:`: omitido, el job termina en `success` sin haber mirado el formato");
    }
  }
  // `continue-on-error` en el job o en cualquiera de sus pasos: con el del job,
  // `needs.formato.result` vale `success` aunque prettier falle, asi que ci-ok
  // —que exige exactamente `success`— tambien queda verde.
  if (tragaElFallo(formato, " {4}")) {
    problemas.push("el job `formato` tiene `continue-on-error`: su resultado es `success` aunque el formateador falle, y ci-ok lo deja pasar");
  }
  if (pasosDelJob(formato).some((p) => tragaElFallo(p, "(?: {6}- | {8})"))) {
    problemas.push("un paso del job `formato` tiene `continue-on-error`: un fallo del formateador deja de detener la integracion");
  }
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
    // Las tres que siguen las cazo la revision adversarial del porte (FO-S11/H2,
    // RV-H6): el banco miraba solo el `if:` del JOB, y estas apagan el
    // formateador sin tocarlo. La del medio es la peor: con `continue-on-error`
    // en el job, `needs.formato.result` vale `success` aunque prettier falle, asi
    // que ci-ok tambien queda verde.
    {
      nombre: "el PASO de format:check gana un if",
      mutar: (t) => t.replace(/^( {6}- run: pnpm format:check\n)/m, "$1        if: false\n"),
    },
    {
      nombre: "el JOB formato gana continue-on-error",
      mutar: (t) => t.replace(/^( {2}formato:\n)/m, "$1    continue-on-error: true\n"),
    },
    {
      nombre: "el PASO de format:check gana continue-on-error",
      mutar: (t) => t.replace(/^( {6}- run: pnpm format:check\n)/m, "$1        continue-on-error: true\n"),
    },
    {
      nombre: "el paso con nombre propio gana un if",
      mutar: (t) => t.replace(/^ {6}- run: pnpm format:check\n/m, "      - name: Formato\n        if: false\n        run: pnpm format:check\n"),
    },
    {
      nombre: "el formateador se traga su propio fallo",
      mutar: (t) => t.replace(/^( {6}- run: pnpm format:check)\n/m, "$1 || true\n"),
    },
  ];
  for (const m of mutaciones) {
    const mutado = m.mutar(ci);
    assert.notEqual(mutado, ci, `la mutacion "${m.nombre}" no cambio nada: su ancla se movio y el banco pasaria en vacio`);
    assert.notDeepEqual(problemasDelFormato(mutado), [], `la mutacion "${m.nombre}" no fue detectada`);
  }
});

test("el banco NO muerde de mas: lo que no apaga al formateador no enrojece", () => {
  const ci = fs.readFileSync(CI, "utf8");
  const inocuas = [
    { nombre: "un name: debajo del run", mutar: (t) => t.replace(/^( {6}- run: pnpm format:check\n)/m, "$1        name: Formato\n") },
    {
      nombre: "un name: antes del run",
      mutar: (t) => t.replace(/^ {6}- run: pnpm format:check\n/m, "      - name: Formato\n        run: pnpm format:check\n"),
    },
    { nombre: "un timeout-minutes en el paso", mutar: (t) => t.replace(/^( {6}- run: pnpm format:check\n)/m, "$1        timeout-minutes: 5\n") },
    {
      nombre: "un paso previo de diagnostico con su propio if",
      mutar: (t) => t.replace(/^( {6}- run: pnpm format:check\n)/m, "      - run: echo diagnostico\n        if: failure()\n$1"),
    },
    { nombre: "continue-on-error: false (el default)", mutar: (t) => t.replace(/^( {6}- run: pnpm format:check\n)/m, "$1        continue-on-error: false\n") },
  ];
  for (const m of inocuas) {
    const mutado = m.mutar(ci);
    assert.notEqual(mutado, ci, `la variante "${m.nombre}" no cambio nada: su ancla se movio`);
    assert.deepEqual(problemasDelFormato(mutado), [], `la variante "${m.nombre}" enrojecio y no apaga nada`);
  }
});
