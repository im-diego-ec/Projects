// ---------------------------------------------------------------------------
// EL CAMINO QUE NO ENVÍA TIENE QUE DECIRLO DONDE SE VE
//
// QUÉ PROTEGE. `.github/workflows/aviso-version.yml` existe para **enviar** el
// aviso de una versión al canal de los consumidores. Su input `simulacro` tiene
// `default: true` —y eso está bien: protege de mandarle un mensaje a todos por un
// dispatch descuidado— pero produce una corrida que sale **verde sin enviar nada**,
// con un `::notice::` como única señal. Un notice no cambia ningún color: la lista
// de corridas dice `success` y la diferencia entre «envié» y «no envié» queda sólo
// en el cuerpo del log.
//
// EL CASO, medido en Rigel —el marco del que Projects se bifurcó— el 2026-09-12,
// reenviando el aviso de su 2.5.0: se disparó sin desmarcar `simulacro`, la corrida
// salió `success` sin enviar nada, y quien la miró leyó el color antes que el
// mensaje que el workflow ya había escrito (commit a2bac69). Projects tenía el mismo
// workflow con el mismo defecto: `::notice::` en la rama del simulacro y ningún
// `run-name`.
//
// Las dos señales que este banco fija:
//
//   · el camino del simulacro emite `::warning::` y no `::notice::`;
//   · el `run-name` lo dice, que es lo único visible en la lista de corridas sin
//     abrir ninguna.
//
// LO QUE ESTE BANCO NO PUEDE HACER, y va declarado en vez de descubrirse: correr
// el workflow. Lo que verifica es que esas dos señales **estén escritas**, no que
// GitHub las renderice. Extraer la lógica del `run:` a un módulo propio la haría
// verificable de verdad, y es más trabajo que el que este arreglo justifica —
// queda dicho, no supuesto.
// ---------------------------------------------------------------------------

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const WORKFLOW = fileURLToPath(new URL("../../.github/workflows/aviso-version.yml", import.meta.url));
const texto = readFileSync(WORKFLOW, "utf8");

/** El bloque del `if [ "${SIMULACRO}" = "true" ]`, hasta su `exit 0`. */
function ramaDelSimulacro(t) {
  const i = t.indexOf('if [ "${SIMULACRO}" = "true" ]; then');
  if (i === -1) return null;
  const j = t.indexOf("exit 0", i);
  return j === -1 ? null : t.slice(i, j);
}

test("la rama del simulacro existe: sin ella este banco no mide nada", () => {
  // Un banco que no encuentra su sujeto y pasa igual es peor que no tenerlo.
  assert.ok(ramaDelSimulacro(texto), "no encontré el bloque del simulacro en aviso-version.yml");
});

test("el camino que NO envía emite ::warning::, no ::notice::", () => {
  const rama = ramaDelSimulacro(texto);
  assert.match(
    rama,
    /^\s*echo\s+"::warning::/m,
    "un `::notice::` no cambia ningún color: la corrida sale success y la diferencia entre «envié» " +
      "y «no envié» queda sólo en el cuerpo del log. AGENTS.md pide hacer ruidoso todo camino que " +
      "termine en verde sin haber hecho el trabajo. Arreglo: cambiar el echo de la rama del simulacro " +
      "a ::warning::",
  );
  assert.doesNotMatch(
    rama,
    /::notice::simulacro/,
    "y el notice viejo no puede seguir ahí: dos señales del mismo hecho con distinto volumen se " +
      "leen como que la más baja es la verdadera",
  );
});

test("el aviso del simulacro DICE cómo enviarlo de verdad", () => {
  // Un aviso sin su arreglo escrito obliga a ir a buscar el procedimiento, y es la
  // diferencia entre una señal y un reproche.
  const rama = ramaDelSimulacro(texto);
  // El `echo`, no el comentario que explica por que es un warning: los dos nombran
  // `::warning::` y solo uno llega a la corrida.
  const aviso = rama.split("\n").find((l) => /^\s*echo\s+"::warning::/.test(l)) ?? "";
  assert.match(aviso, /simulacro.{0,40}DESMARCADO/i, "tiene que nombrar el input y qué hacer con él");
});

test("el `run-name` distingue la corrida que NO envía", () => {
  // Es lo único visible en la lista de corridas sin abrir ninguna.
  const m = /^run-name:[\s\S]*?\n\n/m.exec(texto);
  assert.ok(m, "el workflow no declara `run-name`. Arreglo: declararlo arriba de `on:`, con la rama del simulacro");
  assert.match(m[0], /SIMULACRO/, "el nombre de la corrida tiene que decir que no envía");
  assert.match(m[0], /inputs\.simulacro/, "y decidirlo por el input, no por otra cosa");
});

test("el default de `simulacro` sigue siendo `true`, y eso NO es el defecto", () => {
  // Se fija a propósito: el arreglo es sobre la SEÑAL, no sobre el default. Bajarlo
  // a `false` haría que un dispatch descuidado le mande un mensaje al canal de todos
  // los consumidores — que es mucho peor que un verde que no envió.
  const bloque = /\n {6}simulacro:[\s\S]{0,320}/.exec(texto);
  assert.ok(bloque, "no encontré el input `simulacro`");
  assert.match(bloque[0], /default:\s*true/, "el default protege de un envío accidental y se conserva");
});
