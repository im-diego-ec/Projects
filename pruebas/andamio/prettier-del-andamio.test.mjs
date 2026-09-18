// EL FORMATEADOR CON EL QUE EL MARCO MIDE AL ANDAMIO TIENE QUE SER EL QUE EL
// PROYECTO INSTALA. Si no, el paso del CI del marco certifica en verde un andamio
// que nace rojo.
//
// EL DEFECTO, medido el 2026-09-17: `plantilla/package.json` declaraba
// `"prettier": "^3.9.6"`, un RANGO, y el andamio no trae lockfile: el primer
// `pnpm install` de cada proyecto resuelve la que haya salido ese dia. Ese mismo
// dia se publicaron 3.9.7 (el 16) y 3.9.8 (el 17), y un destino instalado con
// pnpm 11.23.0 resolvio 3.9.7 —no la ultima: pnpm espera un dia antes de
// instalar una version recien publicada—. O sea que el formateador de un
// proyecto dependia de la FECHA en que nacio, y ninguna medicion del marco podia
// afirmar nada sobre el.
//
// El mismo defecto ya lo pago Rigel (1.13.0, change
// `2026-08-31-andamio-con-aplicacion`, commit 40a7bce): media con 3.6.2 escrito a
// mano mientras el consumidor resolvia 3.9.6, y las dos no formatean igual. Su
// arreglo son las dos mitades de abajo, y se portan las dos:
//   1. el andamio pina prettier EXACTO;
//   2. el paso del CI DERIVA la version de ese manifiesto (lo vigila
//      pruebas/ci-del-marco/formato-del-andamio.test.mjs).
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const MANIFIESTO = path.join(RAIZ, "plantilla", "package.json");

/** Una version exacta de semver: sin `^`, `~`, `>=`, `*`, `x` ni rangos compuestos. */
const EXACTA = /^\d+\.\d+\.\d+$/;

test("el andamio pina prettier EXACTO, no un rango", () => {
  const declarada = JSON.parse(fs.readFileSync(MANIFIESTO, "utf8")).devDependencies?.prettier;
  assert.ok(declarada, "plantilla/package.json no declara prettier en devDependencies");
  assert.match(
    declarada,
    EXACTA,
    `el andamio declara prettier como "${declarada}". Un rango deja que el primer "pnpm install" del proyecto ` +
      "nuevo resuelva una version que el CI del marco nunca probo, y dos versiones de prettier no formatean " +
      "igual. El andamio no trae lockfile: el pin exacto es lo unico que fija la version que el proyecto va a correr. " +
      'Arreglo: "prettier": "<x.y.z>" sin ^ ni ~.',
  );
});

test("los scripts de formato del andamio son los que el paso del CI del marco reproduce", () => {
  // El paso corre `prettier --check .` parado en plantilla/ y en cada destino. Si
  // el andamio cambiara su `format:check` (por ejemplo a `prettier --check src/`),
  // el paso seguiria midiendo el arbol entero: otra cosa con el mismo nombre.
  const scripts = JSON.parse(fs.readFileSync(MANIFIESTO, "utf8")).scripts ?? {};
  assert.equal(scripts["format:check"], "prettier --check .", "cambio format:check: hay que actualizar el paso del CI del marco en el mismo PR");
  assert.equal(scripts.format, "prettier --write .", "cambio format: el paso `formateado` del arranque lo invoca");
});
