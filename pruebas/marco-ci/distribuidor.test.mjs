// Banco del paso "Este repo es el que distribuye el marco" de marco-ci.yml.
//
// POR QUE EXISTE. Ese paso contesta la unica pregunta de la que cuelgan las dos
// compuertas que el marco no puede correr sobre si mismo (constitucion-cableada y
// deltas-openspec), y las tres respuestas que tuvo esa pregunta fallaron de formas
// distintas:
//   1. `github.repository != '<cuenta>/Projects'` — el slug literal. Una copia del
//      arbol a otra cuenta dejaba de reconocerse, el job ARRANCABA, y "Set up job"
//      descargaba y ejecutaba la composite action de la cuenta ORIGINAL en cada PR de
//      cada consumidor de esa copia.
//   2. `github.repository != format('{0}/Projects', github.repository_owner)` — la
//      cuenta derivada. Arreglo la copia y abrio uno mas ancho: CUALQUIER consumidor
//      con un repo llamado <su-cuenta>/Projects se salteaba la compuerta, y el
//      veredicto agregado le aceptaba el salteo en silencio porque usaba la MISMA
//      derivacion. Las dos puntas mentian igual, que es la unica forma de que un
//      fail-open no se note. Y nada lo miraba: `git grep -rn 'github.repository'
//      pruebas/ actions/*/pruebas/` daba cero lineas.
//   3. La de hoy: una sonda por ARCHIVOS RASTREADOS, que es lo que este banco mide.
//
// LA REGLA DEL BANCO, la misma que la del resto: una afirmacion vale por su codigo de
// salida y, aca, por el valor que el paso escribe en GITHUB_OUTPUT. El texto del log
// se mira solo donde se dice por que, y nunca es lo unico que sostiene el caso.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { scriptDelPaso, RUTA_WORKFLOW } from "./extraer.mjs";
import {
  repoDeJuguete,
  escribir,
  git,
  commit,
  correrBash,
  carpetaTemporal,
  limpiarTodo,
} from "./util.mjs";

const PASO = "Este repo es el que distribuye el marco";
const script = scriptDelPaso(PASO);

// Los tres archivos de los que depende la decision. Ninguno es un nombre de cuenta ni
// de repositorio: ese es exactamente el punto del cambio.
const REPARTE = "plantilla/.github/workflows/ci.yml";
const ACTION = "actions/constitucion/action.yml";
const ADOPTADO = ".projects-valores.json";

function repoCon(rutas, prefijo = "distribuidor-") {
  const raiz = repoDeJuguete(prefijo);
  escribir(raiz, "README.md", "un repo\n");
  for (const r of rutas) escribir(raiz, r, "contenido\n");
  commit(raiz, "estado inicial");
  return raiz;
}

/**
 * Corre el paso y devuelve exit MAS el valor que dejo en GITHUB_OUTPUT, que es lo que
 * consumen los `if` de los dos jobs y el veredicto de marco-ok. Sin leer ese archivo
 * el banco estaria midiendo que el paso no explota, no que decide bien.
 */
function correr(cwd, { guion = script, repositorio = "una-cuenta/un-repo" } = {}) {
  const salidaGH = join(carpetaTemporal("gh-output-"), "output.txt");
  writeFileSync(salidaGH, "");
  const r = correrBash(guion, {
    cwd,
    env: { GITHUB_OUTPUT: salidaGH, GITHUB_REPOSITORY: repositorio },
  });
  const crudo = readFileSync(salidaGH, "utf8");
  const m = crudo.match(/^es_distribuidor=(\S*)$/m);
  return { ...r, output: m ? m[1] : null, crudo };
}

test.after(limpiarTodo);

// ── El caso sano: el repo que de verdad reparte el marco ────────────────────
test("distribuidor · el repo que reparte el scaffold Y contiene las actions dice true", () => {
  const raiz = repoCon([REPARTE, ACTION]);
  const { exit, output, salida } = correr(raiz);
  assert.equal(exit, 0, `la sonda no puede fallar, solo responder:\n${salida}`);
  assert.equal(output, "true", `output inesperado (${output}):\n${salida}`);
});

// ── LA REGRESION QUE ESTE BANCO EXISTE PARA VIGILAR ─────────────────────────
// Es el fail-open que abrio la respuesta 2: un consumidor cuyo repositorio se llama
// <su-cuenta>/Projects. Con la derivacion coincidia, se salteaba la compuerta de la
// constitucion y marco-ok le imprimia "salteado a proposito". Con la sonda por
// archivos no coincide, porque un consumidor no reparte el scaffold ni contiene las
// composite actions del marco.
test("distribuidor · refutacion · un consumidor LLAMADO <cuenta>/Projects NO es el distribuidor", () => {
  const raiz = repoCon(["src/index.mjs", "openspec/project.md"]);
  const { exit, output, salida } = correr(raiz, { repositorio: "otra-cuenta/Projects" });
  assert.equal(exit, 0, salida);
  assert.equal(
    output,
    "false",
    "un repositorio llamado <cuenta>/Projects que no reparte el marco tiene que recibir la " +
      `compuerta, no el salteo. Output: ${output}\n${salida}`,
  );
});

// El otro lado de la misma moneda: el distribuidor sigue siendo el distribuidor
// aunque su repositorio se llame de cualquier otra forma (una copia a otra cuenta, un
// fork con otro nombre). El nombre no participa.
test("distribuidor · una copia del marco con otro nombre de repositorio sigue diciendo true", () => {
  const raiz = repoCon([REPARTE, ACTION]);
  const { exit, output, salida } = correr(raiz, { repositorio: "tercera-cuenta/marco-copiado" });
  assert.equal(exit, 0, salida);
  assert.equal(output, "true", `output inesperado (${output}):\n${salida}`);
});

// ── Los tres candados, uno por uno ──────────────────────────────────────────
test("distribuidor · reparte el scaffold pero no contiene las actions: false", () => {
  const { exit, output, salida } = correr(repoCon([REPARTE]));
  assert.equal(exit, 0, salida);
  assert.equal(output, "false", salida);
  assert.match(salida, /actions\/constitucion\/action\.yml/, "el motivo tiene que nombrar lo que falta");
});

test("distribuidor · contiene las actions pero no reparte el scaffold: false", () => {
  const { exit, output, salida } = correr(repoCon([ACTION]));
  assert.equal(exit, 0, salida);
  assert.equal(output, "false", salida);
  assert.match(salida, /plantilla\/\.github\/workflows\/ci\.yml/, "el motivo tiene que nombrar lo que falta");
});

test("distribuidor · un repo ADOPTADO no se apaga la compuerta agregando los dos archivos", () => {
  const { exit, output, salida } = correr(repoCon([REPARTE, ACTION, ADOPTADO]));
  assert.equal(exit, 0, salida);
  assert.equal(
    output,
    "false",
    ".projects-valores.json es la marca de un repo adoptado: con el presente, agregar los otros " +
      `dos archivos no puede comprar el salteo. Output: ${output}\n${salida}`,
  );
});

// Solo lo RASTREADO cuenta. Un archivo sin versionar no pasa por la revision cruzada,
// asi que no puede comprar el salteo de una compuerta.
test("distribuidor · los dos archivos SIN RASTREAR no alcanzan: false", () => {
  const raiz = repoDeJuguete("distribuidor-sin-rastrear-");
  escribir(raiz, "README.md", "un repo\n");
  commit(raiz, "estado inicial");
  escribir(raiz, REPARTE, "sin rastrear\n");
  escribir(raiz, ACTION, "sin rastrear\n");
  const { exit, output, salida } = correr(raiz);
  assert.equal(exit, 0, salida);
  assert.equal(output, "false", `un archivo no versionado no compra el salteo:\n${salida}`);
});

// ── Fail-closed: no poder medir responde "false", que es el lado que CORRE ──
test("distribuidor · fuera de un arbol git responde false y avisa", () => {
  const fuera = mkdtempSync(join(tmpdir(), "fuera-de-git-"));
  const { exit, output, salida } = correr(fuera);
  assert.equal(exit, 0, `la sonda no se pone roja: su fallo seguro es responder false\n${salida}`);
  assert.equal(output, "false", `sin arbol git la respuesta segura es false:\n${salida}`);
  assert.match(
    salida,
    /::warning::/,
    "no poder medir no puede ser mudo: si el distribuidor pierde su arbol, el salteo desaparece " +
      "y hace falta saber por que",
  );
});

// ── MUTACION: se rompe la condicion en una COPIA del workflow y se comprueba
// que el banco se pone rojo. Sin esto, todo lo de arriba podria estar pasando
// por una razon que no es la que se cree.
test("distribuidor · mutacion · si se afloja el candado del scaffold, el consumidor se cuela", () => {
  const copia = join(carpetaTemporal("mutante-"), "mut.yml");
  const texto = readFileSync(RUTA_WORKFLOW, "utf8");
  const original = 'rastrea "plantilla/.github/workflows/ci.yml" && REPARTE=0';
  assert.ok(texto.includes(original), "el ancla de la mutacion ya no esta en el workflow");
  writeFileSync(copia, texto.replace(original, "REPARTE=0"));

  const mutado = scriptDelPaso(PASO, copia);
  assert.notEqual(mutado, script, "la mutacion no llego al script extraido");

  // El MISMO repo consumidor del caso de arriba, contra el paso mutado.
  const raiz = repoCon(["src/index.mjs", ACTION]);
  const sano = correr(raiz, { repositorio: "otra-cuenta/Projects" });
  const roto = correr(raiz, { guion: mutado, repositorio: "otra-cuenta/Projects" });

  assert.equal(sano.output, "false", `el paso sano tiene que negar el salteo:\n${sano.salida}`);
  assert.equal(
    roto.output,
    "true",
    "con el candado del scaffold aflojado, un repo que NO reparte el marco tendria que colarse: " +
      `si esto no pasa, el candado no era lo que decidia.\n${roto.salida}`,
  );
});

// ── Control de que el banco mide el archivo real y no una copia vieja ───────
test("distribuidor · los dos jobs que se saltean consumen ESTA sonda y no un nombre", () => {
  const texto = readFileSync(RUTA_WORKFLOW, "utf8");

  // Las lineas de COMENTARIO quedan fuera, y no por comodidad: el bloque que explica
  // POR QUE esas dos formas fallaron tiene que poder escribirlas. Es el mismo limite
  // que ya declara el paso del slug literal del ci.yml del marco. Sin esta exclusion,
  // este banco se pondria rojo por la documentacion de su propio motivo.
  const codigo = texto
    .split(/\r?\n/)
    .filter((l) => !/^\s*(#|\/\/)/.test(l))
    .join("\n");

  // Lo que no puede volver: ninguna de las dos formas que fallaron.
  assert.equal(
    codigo.includes("format('{0}/Projects', github.repository_owner)"),
    false,
    "volvio la derivacion por nombre de repositorio en un `if`: coincide con cualquier " +
      "consumidor llamado <su-cuenta>/Projects",
  );
  assert.equal(
    /EL_REPO_DEL_MARCO=/.test(codigo),
    false,
    "volvio la derivacion del slug en el veredicto de marco-ok",
  );

  // Control de que la exclusion de comentarios no vacio el archivo.
  assert.ok(codigo.length > 10000, "el filtro de comentarios se llevo casi todo el workflow");

  // Lo que si tiene que estar, en las tres puntas.
  const usos = texto.match(/needs\.cambios\.outputs\.es_distribuidor/g) ?? [];
  assert.ok(
    usos.length >= 3,
    "la sonda tiene que decidir el `if` de constitucion-cableada, el de deltas-openspec y el " +
      `veredicto de marco-ok: encontre ${usos.length} uso(s)`,
  );
});

// ── EL VEREDICTO COBRA EL SALTEO, y esto se mide corriendo su bash ──────────
//
// El paso "Veredicto" de marco-ok es la otra punta: si un job se saltea sin que la
// sonda lo autorice, tiene que ser ROJO. Su bloque `run:` esta lleno de expresiones
// ${{ }} que solo resuelve el runner, asi que el banco las sustituye por valores —es
// exactamente lo que hace GitHub antes de escribir el script— y corre el bash real.
// La alternativa era no medir la mitad que decide, que es como llego el fail-open
// anterior: las dos puntas compartian la derivacion y NADA las ejercitaba.
function veredicto({ distribuidor, constitucion, deltas }) {
  const valores = {
    "needs.cambios.result": "success",
    "needs.openspec.result": "success",
    "needs.higiene.result": "success",
    "needs.cambios.outputs.es_distribuidor": distribuidor,
    "needs.constitucion_cableada.result": constitucion,
    "needs.deltas.result": deltas,
    "needs.cambios.outputs.solo_docs": "false",
    "needs.cambios.outputs.confiable": "true",
    "github.repository": "una-cuenta/un-repo",
  };
  let guion = scriptDelPaso("Veredicto");
  guion = guion.replace(/\$\{\{\s*([^}\s]+)\s*\}\}/g, (todo, clave) => {
    assert.ok(clave in valores, `expresion sin valor en el banco: ${clave}`);
    return valores[clave];
  });
  return correrBash(guion, { cwd: carpetaTemporal("veredicto-") });
}

test("veredicto · el distribuidor puede saltear los dos jobs y el veredicto lo acepta", () => {
  const { exit, salida } = veredicto({
    distribuidor: "true",
    constitucion: "skipped",
    deltas: "skipped",
  });
  assert.equal(exit, 0, salida);
  assert.match(salida, /constitucion-cableada: salteado a proposito/, salida);
  assert.match(salida, /deltas-openspec: salteado a proposito/, salida);
});

test("veredicto · refutacion · un salteo SIN la sonda es ROJO, no un 'salteado a proposito'", () => {
  for (const [constitucion, deltas] of [
    ["skipped", "success"],
    ["success", "skipped"],
  ]) {
    const { exit, salida } = veredicto({ distribuidor: "false", constitucion, deltas });
    assert.equal(
      exit,
      1,
      `un salteo que la sonda no autoriza es un fail-open y tiene que ser rojo (${constitucion}/${deltas}):\n${salida}`,
    );
    assert.doesNotMatch(salida, /salteado a proposito/, salida);
  }
});

test("veredicto · un salteo con la sonda VACIA tambien es rojo", () => {
  // La sonda vacia es lo que llega si el job cambios no dejo output. No poder saber no
  // puede comprar el salteo.
  const { exit, salida } = veredicto({ distribuidor: "", constitucion: "skipped", deltas: "success" });
  assert.equal(exit, 1, salida);
  assert.match(salida, /<vacio>/, `el rojo tiene que decir que la sonda no dijo nada:\n${salida}`);
});

test("veredicto · con los dos jobs en success no hace falta ninguna sonda", () => {
  const { exit, salida } = veredicto({ distribuidor: "false", constitucion: "success", deltas: "success" });
  assert.equal(exit, 0, salida);
});
