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

/** Un glob de bash con `globstar`, traducido a una expresion regular.
 *
 *  SE TRADUCE DE UNA PASADA, recorriendo el patron. La version anterior
 *  encadenaba dos `.replace` —`**\/` primero y `*` despues— y la segunda se
 *  comia el cuantificador `*` que la primera acababa de escribir: el resultado
 *  exigia EXACTAMENTE un directorio intermedio. Nadie lo noto porque hoy todos
 *  los bancos estan a un nivel, pero el dia que uno este a dos —o a ninguno— se
 *  habria reportado como huerfano sin serlo. */
function globDeBash(glob, ruta) {
  let re = "^";
  for (let i = 0; i < glob.length; i++) {
    if (glob.startsWith("**/", i)) {
      re += "(?:[^/]+/)*"; // cero o mas directorios
      i += 2;
      continue;
    }
    const c = glob[i];
    if (c === "*") re += "[^/]*";
    else if (c === "?") re += "[^/]";
    else re += c.replace(/[.+^${}()|[\]\\]/, "\\$&");
  }
  return new RegExp(`${re}$`).test(ruta);
}

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
  // EL DETECTOR TENIA DOS ESCAPES, los dos medidos:
  //   · `t.skip()` DENTRO del cuerpo de un caso —la forma que da el propio
  //     runner de Node por el contexto que recibe cada test—: apaga el caso en
  //     tiempo de ejecucion y el resumen dice «skipped 1 / fail 0».
  //   · `{ skip: "un motivo" }`, con cadena en vez de `true`. Node la acepta
  //     igual, y esta forma es la mas probable de todas porque es la que alguien
  //     escribe cuando quiere dejar dicho por que.
  // Las opciones `skip`/`todo` solo cuentan si estan en la llamada a un caso: un
  // objeto cualquiera con una propiedad que se llama `todo` no apaga nada, y
  // exigir la vecindad de `test(`/`it(`/`describe(` en la misma linea es lo que
  // separa las dos cosas sin heuristica.
  const OPCION = /\b(?:test|it|describe)\s*\([^)]*\{[^}]*\b(?:skip|todo)\s*:\s*(?:true|["'`])/;
  const APAGADOS = new RegExp(`\\b(?:test|it|describe)\\.(?:skip|todo)\\b|${OPCION.source}`);
  const EN_EL_CUERPO = /\b[a-zA-Z_$][\w$]*\.(?:skip|todo)\s*\(/;
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
      if (!APAGADOS.test(linea) && !EN_EL_CUERPO.test(linea)) return;
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

  const cubre = globDeBash;

  const huerfanos = BANCOS.filter((b) => !globs.some((g) => cubre(g, b)));
  assert.deepEqual(
    huerfanos,
    [],
    `estos bancos existen y ningun patron del ci.yml los junta, asi que NO CORREN EN CI:\n  ${huerfanos.join("\n  ")}`,
  );
});

test("MUERDE: un caso apagado y un banco huerfano se cazan", () => {
  // El caso que prueba que los dos de arriba no pasan por vacuidad.
  const OPCION = /\b(?:test|it|describe)\s*\([^)]*\{[^}]*\b(?:skip|todo)\s*:\s*(?:true|["'`])/;
  const APAGADOS = new RegExp(`\\b(?:test|it|describe)\\.(?:skip|todo)\\b|${OPCION.source}`);
  const EN_EL_CUERPO = /\b[a-zA-Z_$][\w$]*\.(?:skip|todo)\s*\(/;
  const ve = (l) => APAGADOS.test(l) || EN_EL_CUERPO.test(l);
  assert.equal(ve('test.skip("no corre", () => {});'), true, "el detector tiene que ver un test.skip");
  assert.equal(ve('test("si corre", { skip: true }, () => {});'), true, "y tambien la forma con opciones");
  // LOS DOS ESCAPES QUE TENIA, y que este caso existe para que no vuelvan.
  assert.equal(ve('  t.skip("apagado desde adentro"); return;'), true, "y `t.skip()` en el cuerpo, que es la que da Node");
  assert.equal(ve('test("x", { skip: "un motivo" }, () => {});'), true, "y `skip` con una cadena, que es la mas probable");
  assert.equal(ve('test("normal", () => { const skip = 1; });'), false, "y no confundirse con una variable");
  assert.equal(ve('const x = obj.skipped;'), false, "ni con una propiedad que se le parece");
  // Y el falso positivo que la primera version de este detector si produjo: un
  // objeto cualquiera con una propiedad llamada `todo`. Lo encontro el propio
  // banco, sobre una linea real de actions/censo-fuentes.
  assert.equal(ve('return { codigo: r.status, todo: `${r.stdout}` };'), false, "un objeto con una propiedad `todo` no apaga nada");

  // EL DEFECTO QUE ESTOS ASERTOS CIERRAN: la primera version de `globDeBash`
  // hacia dos sustituciones encadenadas —`**/` a `(?:[^/]+/)*` y despues `*` a
  // `[^/]*`— y la segunda se comia el cuantificador de la primera, dejando
  // EXACTAMENTE un directorio intermedio obligatorio. O sea que un banco en
  // `pruebas/x.test.mjs` o en `pruebas/a/b/x.test.mjs` se reportaba como
  // huerfano aunque el glob real de bash si lo junta. Pasaba desapercibido
  // porque hoy todos los bancos estan a exactamente un nivel.
  assert.equal(globDeBash("pruebas/**/*.test.mjs", "pruebas/banco/integridad.test.mjs"), true, "un nivel");
  assert.equal(globDeBash("pruebas/**/*.test.mjs", "pruebas/x.test.mjs"), true, "CERO niveles: globstar tambien lo junta");
  assert.equal(globDeBash("pruebas/**/*.test.mjs", "pruebas/a/b/x.test.mjs"), true, "y dos niveles");
  assert.equal(globDeBash("pruebas/**/*.test.mjs", "otro/lugar/x.test.mjs"), false, "un banco fuera de los patrones no puede pasar");
  assert.equal(globDeBash("actions/**/pruebas/*.test.mjs", "actions/censo-fuentes/pruebas/x.test.mjs"), true);
  assert.equal(globDeBash("actions/**/pruebas/*.test.mjs", "actions/censo-fuentes/x.test.mjs"), false, "tiene que estar en pruebas/");
});
