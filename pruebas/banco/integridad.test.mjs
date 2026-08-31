import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

// ---------------------------------------------------------------------------
// EL BANCO SE VIGILA A SI MISMO, y hasta ahora no lo hacia nadie.
//
// LOS DOS AGUJEROS, medidos:
//
//   1. UN CASO SALTEADO PASA COMO VERDE. Con `test.skip` sobre cuatro bancos
//      enteros, `node --test` sale 0 diciendo «tests 1037 / pass 1001 / fail 0 /
//      skipped 36». Los guardias del ci.yml solo miran `-eq 0`, o sea «no quedo
//      NINGUNO»: 36 casos apagados pasan sin una linea de aviso. Apagar un caso
//      es una decision legitima y a veces necesaria; hacerlo en silencio no.
//
//   2. UN BANCO BORRADO NO DEJA RASTRO. Con `git rm` de los tres bancos mas
//      citados quedan 1007 casos, todos en verde, y nada avisa. El repositorio
//      confia en su banco para todo, asi que el banco encogiendose sin ruido es
//      la forma mas barata que hay de aflojar cada regla a la vez.
//
// LO QUE ESTE ARCHIVO SOSTIENE: que ningun caso este apagado sin declararlo, y
// que ningun banco quede fuera de los patrones con los que el CI los junta —un
// banco que existe y que ningun glob matchea es exactamente igual a no tenerlo—.
// ---------------------------------------------------------------------------

/** Los bancos que git rastrea. Es la lista que ve el CI: un archivo sin rastrear
 *  no llega al runner, asi que probarlo solo en local no prueba nada. */
function bancosRastreados() {
  return execFileSync("git", ["ls-files", "*.test.mjs"], { cwd: RAIZ, encoding: "utf-8" })
    .trim()
    .split("\n")
    .filter(Boolean)
    .sort();
}

const BANCOS = bancosRastreados();

test("hay bancos que revisar: un cero aca es este control roto", () => {
  assert.ok(BANCOS.length >= 20, `git rastrea ${BANCOS.length} bancos: si cayo de golpe, mirá si se movieron antes de mirar si se borraron`);
});

test("ningun caso esta apagado sin decir por que", () => {
  // `skip` y `todo` son legitimos —a veces un caso espera a que algo exista—
  // pero tienen que dejar rastro. Sin esta regla, apagar un banco entero se ve
  // igual que no tocarlo: el runner sale 0 y el resumen dice «fail 0».
  const APAGADOS = /\b(?:test|it|describe)\.(?:skip|todo)\b|\{\s*(?:skip|todo)\s*:\s*true\s*\}/;
  const apagados = [];
  for (const b of BANCOS) {
    // ESTE ARCHIVO QUEDA FUERA, y con el mismo motivo que ya se declaro para el
    // registro de cifras: guarda contraejemplos A PROPOSITO —las formas de
    // apagar un caso, escritas para probar que el detector las ve—. Mirarse a si
    // mismo lo pondria rojo por hacer bien su trabajo. Lo cazo su propia regla,
    // dos minutos despues de escribirla.
    if (b === "pruebas/banco/integridad.test.mjs") continue;
    const texto = fs.readFileSync(path.join(RAIZ, b), "utf-8");
    texto.split("\n").forEach((linea, i) => {
      // Una linea de comentario que NOMBRA la forma no la usa: este mismo
      // archivo la nombra para explicarla, y un control que se caza a si mismo
      // no sirve para nada.
      if (/^\s*(?:\/\/|\*|\/\*)/.test(linea)) return;
      if (!APAGADOS.test(linea)) return;
      // Un apagado DECLARADO lleva el motivo en la linea de arriba, con la
      // marca. Es la misma disciplina que el resto del repositorio: apartarse
      // se puede, apartarse en silencio no.
      const arriba = texto.split("\n").slice(Math.max(0, i - 3), i).join("\n");
      if (!/APAGADO A PROPOSITO:/.test(arriba)) apagados.push(`${b}:${i + 1}  ${linea.trim().slice(0, 80)}`);
    });
  }
  // ANTI-VACUIDAD DE LA EXCEPCION: si este archivo dejara de tener sus
  // contraejemplos, la exencion sobraria y conviene saberlo.
  assert.match(
    fs.readFileSync(path.join(RAIZ, "pruebas/banco/integridad.test.mjs"), "utf-8"),
    /test\.skip\("no corre"/,
    "este archivo tiene que seguir trayendo el contraejemplo que justifica su propia exencion",
  );
  assert.deepEqual(
    apagados,
    [],
    "un caso apagado sale como verde: el runner cuenta «skipped» y el resumen dice «fail 0». Si de verdad hay que " +
      `apagarlo, escribí «APAGADO A PROPOSITO: <motivo>» en las lineas de arriba:\n  ${apagados.join("\n  ")}`,
  );
});

test("todo banco cae bajo alguno de los patrones con los que el CI los junta", () => {
  // EL DEFECTO QUE ESTE CASO VIGILA: un banco nuevo en una carpeta que ningun
  // glob del ci.yml matchea existe, pasa en local, y NO CORRE EN CI. Nada lo
  // dice, porque los guardias de aquellos pasos solo comprueban que su propia
  // lista no este vacia.
  const ci = fs.readFileSync(path.join(RAIZ, ".github/workflows/ci.yml"), "utf-8");
  const globs = [...ci.matchAll(/^\s*(?:TODAS|PRUEBAS|INIT)=\(([^)]*\*\.test\.mjs)\)/gm)].map((m) => m[1].trim());
  assert.ok(globs.length >= 2, `se leyeron ${globs.length} patrones del ci.yml: si cambio la forma, este control dejo de mirar lo que cree`);

  // `pruebas/**/x` y `actions/**/pruebas/x` en una expresion decidible.
  const cubre = (glob, ruta) => {
    const re = new RegExp(
      "^" +
        glob
          .replace(/[.+^${}()|[\]\\]/g, "\\$&")
          .replace(/\*\*\//g, "(?:[^/]+/)*")
          .replace(/\*/g, "[^/]*") +
        "$",
    );
    return re.test(ruta);
  };

  const huerfanos = BANCOS.filter((b) => !globs.some((g) => cubre(g, b)));
  assert.deepEqual(
    huerfanos,
    [],
    `estos bancos existen y ningun patron del ci.yml los junta, asi que NO CORREN EN CI:\n  ${huerfanos.join("\n  ")}`,
  );
});

test("MUERDE: un caso apagado y un banco huerfano se cazan", () => {
  // El caso que prueba que los dos de arriba no pasan por vacuidad.
  const APAGADOS = /\b(?:test|it|describe)\.(?:skip|todo)\b|\{\s*(?:skip|todo)\s*:\s*true\s*\}/;
  assert.equal(APAGADOS.test('test.skip("no corre", () => {});'), true, "el detector tiene que ver un test.skip");
  assert.equal(APAGADOS.test('test("si corre", { skip: true }, () => {});'), true, "y tambien la forma con opciones");
  assert.equal(APAGADOS.test('test("normal", () => { const skip = 1; });'), false, "y no confundirse con una variable");

  const cubre = (glob, ruta) => {
    const re = new RegExp(
      "^" + glob.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*\*\//g, "(?:[^/]+/)*").replace(/\*/g, "[^/]*") + "$",
    );
    return re.test(ruta);
  };
  assert.equal(cubre("pruebas/**/*.test.mjs", "pruebas/banco/integridad.test.mjs"), true);
  assert.equal(cubre("pruebas/**/*.test.mjs", "otro/lugar/x.test.mjs"), false, "un banco fuera de los patrones no puede pasar");
});
