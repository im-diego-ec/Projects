// Banco del instrumento .github/workflows/reproducir-intermitente.yml.
//
// POR QUE UN INSTRUMENTO NECESITA BANCO. Su trabajo es decir «reprodujo» o «no aparecio en N».
// En Rigel, de donde viene, se equivoco dos veces en su primera semana, y las dos veces en la
// direccion que mas cuesta: dijo «REPRODUJO» 40 de 40 sobre fallas de su propia instalacion
// (de ahi la vuelta cero), y murio por timeout sin decir cuantas vueltas llevaba (de ahi la linea
// por vuelta). Un instrumento que miente manda a arreglar lo que no esta roto.
//
// El paso se EXTRAE del YAML y se corre sobre un arbol de juguete con bancos que pasan, que
// fallan siempre y que fallan una vez si y otra no. Lo que se afirma sale del codigo de salida.
// Donde se mira el texto se dice por que: el log de un instrumento ES su producto —la linea por
// vuelta existe para que una corrida cortada siga siendo una medicion—.
//
// Y ATA LA COPIA QUE TIENE QUE TENER: los patrones con los que junta el grupo son los de ci.yml,
// y el tope de minutos del paso es el timeout-minutes del job. Las dos cosas estan escritas dos
// veces porque no hay forma de que un workflow le pase la suya al otro.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

import { scriptDelPaso, RAIZ } from "../marco-ci/extraer.mjs";
import { carpetaTemporal, escribir, correrBash, limpiarTodo } from "../marco-ci/util.mjs";
import { porque } from "../porque.mjs";

const WORKFLOW = path.join(RAIZ, ".github", "workflows", "reproducir-intermitente.yml");
const CI = path.join(RAIZ, ".github", "workflows", "ci.yml");
const PASO = "Repetir el banco y contar las fallas";
const script = scriptDelPaso(PASO, WORKFLOW);

test.after(limpiarTodo);

// Cada banco de juguete deja una SENA al correr: asi se afirma por existencia de archivo, y no por
// el texto del log, QUE archivos entraron en la invocacion.
const sena = (nombre) =>
  `import { appendFileSync as dejarSena } from "node:fs";\ndejarSena(process.env.SENAS + "/${nombre}", "x\\n");\n`;
const VERDE = (nombre) => `${sena(nombre)}import test from "node:test";\ntest("pasa", () => {});\n`;
const ROJO = (nombre) =>
  `${sena(nombre)}import test from "node:test";\ntest("falla siempre", () => { throw new Error("siempre"); });\n`;
// Pasa en las corridas impares y falla en las pares: la vuelta cero (la 1ra) pasa.
const INTERMITENTE = (nombre) =>
  `${sena(nombre)}import fs from "node:fs";\nimport test from "node:test";\n` +
  `const n = Number(fs.existsSync(process.env.CONTADOR) ? fs.readFileSync(process.env.CONTADOR, "utf8") : 0) + 1;\n` +
  `fs.writeFileSync(process.env.CONTADOR, String(n));\n` +
  `test("una si y otra no", () => { if (n % 2 === 0) throw new Error("par: " + n); });\n`;

function arbol() {
  const raiz = carpetaTemporal("reproducir-");
  escribir(raiz, "pruebas/x/verde.test.mjs", VERDE("pruebas-x-verde"));
  escribir(raiz, "pruebas/x/otro.test.mjs", VERDE("pruebas-x-otro"));
  escribir(raiz, "pruebas/y/intermitente.test.mjs", INTERMITENTE("pruebas-y-intermitente"));
  escribir(raiz, "pruebas/z/rojo.test.mjs", ROJO("pruebas-z-rojo"));
  escribir(raiz, "pruebas/init/uno.test.mjs", VERDE("pruebas-init-uno"));
  escribir(raiz, "pruebas/init/dos.test.mjs", VERDE("pruebas-init-dos"));
  escribir(raiz, "actions/a/pruebas/accion.test.mjs", VERDE("actions-a-accion"));
  escribir(raiz, "pruebas/x/ayuda.mjs", "export const x = 1;\n");
  return raiz;
}

/** Corre el paso sobre el arbol. `sin` saca bancos del arbol antes de correr. */
function correr({ banco, vueltas = "2", forma = "solo", guion = script, sin = [] }) {
  const raiz = arbol();
  for (const rel of sin) fs.rmSync(path.join(raiz, rel));
  const senas = carpetaTemporal("senas-");
  const resumen = path.join(carpetaTemporal("resumen-"), "resumen.md");
  fs.writeFileSync(resumen, "");
  const r = correrBash(guion, {
    cwd: raiz,
    env: {
      BANCO: banco,
      VUELTAS: vueltas,
      FORMA: forma,
      GITHUB_STEP_SUMMARY: resumen,
      SENAS: senas,
      CONTADOR: path.join(senas, "..contador"),
    },
  });
  const corridos = fs.readdirSync(senas).filter((n) => !n.startsWith("."));
  return { ...r, corridos: corridos.sort(), resumen: fs.readFileSync(resumen, "utf8") };
}

const bashTieneGlobstar = spawnSync("bash", ["-c", "shopt -s globstar"], { encoding: "utf8" }).status === 0;

// ---------------------------------------------------------------------------
// LO QUE EL INSTRUMENTO TIENE QUE DECIR BIEN
// ---------------------------------------------------------------------------

test("un banco que pasa siempre: VERDE, con el numero, y el resumen dice que no es ausencia", () => {
  const r = correr({ banco: "pruebas/x/verde.test.mjs", vueltas: "2" });
  assert.equal(r.exit, 0, porque("un banco estable no puede salir rojo", r.salida));
  assert.match(r.salida, /2 vueltas, 0 falla\(s\)/, r.salida);
  // El texto se mira porque ES la propiedad: un verde que no dice «no es ausencia» se lee como
  // «arreglado».
  assert.match(r.resumen, /NO es «no hay intermitencia»/, porque("el resumen del verde no dice su limite", r.resumen));
});

test("un banco intermitente: ROJO (reprodujo), con una linea por vuelta y el acumulado", () => {
  const r = correr({ banco: "pruebas/y/intermitente.test.mjs", vueltas: "3" });
  assert.equal(r.exit, 1, porque("una intermitencia que aparecio no puso rojo", r.salida));
  // La linea por vuelta ES el arreglo de Rigel 0448928: una corrida cortada tiene que seguir
  // siendo una medicion, y eso solo pasa si cada vuelta deja su cuenta en el log.
  assert.match(r.salida, /vuelta 1\/3: FALLO \(1 falla\(s\) hasta aca\)/, r.salida);
  assert.match(r.salida, /vuelta 2\/3: ok \(1 falla\(s\) hasta aca\)/, r.salida);
  assert.match(r.salida, /vuelta 3\/3: FALLO \(2 falla\(s\) hasta aca\)/, r.salida);
  assert.match(r.salida, /::warning::REPRODUJO en la vuelta 1/, r.salida);
});

test("LA VUELTA CERO: si la linea de base ya esta roja, NO cuenta ninguna vuelta y lo dice", () => {
  // El falso positivo de Rigel: 40 de 40 «reprodujeron» sobre casos que fallaban siempre. Un
  // banco que falla SIEMPRE no es intermitente, y contarlo como «reprodujo» es mentir.
  const r = correr({ banco: "pruebas/z/rojo.test.mjs", vueltas: "3" });
  assert.equal(r.exit, 1, porque("una base roja salio verde", r.salida));
  assert.match(r.salida, /LINEA DE BASE ya esta roja/, r.salida);
  assert.doesNotMatch(r.salida, /vuelta 1\/3/, porque("conto vueltas sobre una base roja", r.salida));
  assert.deepEqual(r.corridos, ["pruebas-z-rojo"], porque("corrio algo mas que la vuelta cero", r.corridos));
});

test("dice ANTES de empezar cuanto va a tardar, y avisa si no entra en el tope", () => {
  const sano = correr({ banco: "pruebas/x/verde.test.mjs", vueltas: "1" });
  assert.match(sano.salida, /::notice::la vuelta de base tardo \d+s/, sano.salida);
  assert.doesNotMatch(sano.salida, /el presupuesto NO alcanza/, porque("aviso de presupuesto con una vuelta", sano.salida));

  // MUERDE: con un tope por debajo de cualquier estimacion, el aviso tiene que aparecer.
  assert.ok(script.includes("TOPE_MINUTOS=180\n"), porque("el ancla de la mutacion ya no esta", script));
  const guion = script.replace("TOPE_MINUTOS=180\n", "TOPE_MINUTOS=-1\n");
  const corto = correr({ banco: "pruebas/x/verde.test.mjs", vueltas: "1", guion });
  assert.match(corto.salida, /::warning::el presupuesto NO alcanza/, corto.salida);
});

// ---------------------------------------------------------------------------
// LO QUE NO PUEDE ACEPTAR, porque saldria verde sin medir
// ---------------------------------------------------------------------------

test("vueltas que no son un entero positivo: ROJO, y no corre nada", () => {
  // Con "0" o "abc" el bucle no correria ninguna vuelta y el job diria «0 fallas»: un «no
  // reprodujo» sobre cero vueltas.
  for (const vueltas of ["0", "abc", "", "-3", "2.5"]) {
    const r = correr({ banco: "pruebas/x/verde.test.mjs", vueltas });
    assert.equal(r.exit, 1, porque(`vueltas=${JSON.stringify(vueltas)} no puso rojo`, r.salida));
    assert.deepEqual(r.corridos, [], porque(`vueltas=${JSON.stringify(vueltas)} corrio algo igual`, r.corridos));
  }
});

test("vueltas que desbordan la aritmetica de bash: ROJO, y no corre nada", () => {
  // Lo encontro la revision adversarial del porte (2026-09-18). 9223372036854775808 pasa el
  // "entero positivo", pero en la aritmetica de 64 bits de bash se da vuelta: el bucle no itera,
  // el job sale VERDE con «No aparecio en 9223372036854775808 vueltas» y la estimacion dice «~0
  // minutos». Corria la vuelta cero y nada mas.
  for (const vueltas of ["9223372036854775808", "100000"]) {
    const r = correr({ banco: "pruebas/x/verde.test.mjs", vueltas });
    assert.equal(r.exit, 1, porque(`vueltas=${vueltas} no puso rojo`, r.salida));
    assert.deepEqual(r.corridos, [], porque(`vueltas=${vueltas} corrio algo igual`, r.corridos));
  }
});

test("el contrapeso del tope: 1, 40 (el default) y 1000 vueltas se aceptan", () => {
  // Se corta el paso justo despues de validar, para no correr mil vueltas en el banco.
  const ancla = 'SALIDAS="${RUNNER_TEMP}/salidas"\n';
  assert.ok(script.includes(ancla), porque("el ancla del corte ya no esta", script));
  const guion = script.replace(ancla, `exit 0\n${ancla}`);
  for (const vueltas of ["1", "40", "1000"]) {
    const r = correr({ banco: "pruebas/x/verde.test.mjs", vueltas, guion });
    assert.equal(r.exit, 0, porque(`vueltas=${vueltas} se rechazo`, r.salida));
    assert.ok(r.salida.includes(`${vueltas} vuelta(s)`), porque(`vueltas=${vueltas} no llego a la validacion`, r.salida));
  }
});

test("MUERDE: si el bucle corre menos vueltas que las pedidas, el veredicto no se declara", () => {
  // La segunda mitad del arreglo: aunque la validacion dejara pasar un numero que el bucle no
  // recorre, el paso cuenta las vueltas que CORRIO y las compara con las pedidas antes del
  // veredicto. Se provoca con un bucle que se queda corto.
  const bucle = "for ((i = 1; i <= VUELTAS; i++)); do";
  assert.ok(script.includes(bucle), porque("el ancla del bucle ya no esta", script));
  const guion = script.replace(bucle, "for ((i = 1; i <= VUELTAS - 1; i++)); do");
  const r = correr({ banco: "pruebas/x/verde.test.mjs", vueltas: "2", guion });
  assert.equal(r.exit, 1, porque("un bucle corto salio verde", r.salida));
  assert.ok(r.salida.includes("corrio 1 de 2 vueltas"), porque("el rojo no dice cuantas corrio", r.salida));
  assert.ok(!r.resumen.includes("No aparecio en"), porque("el resumen declaro la cota sobre vueltas que no corrio", r.resumen));
});

test("un banco que no existe, que no es banco o que el CI no corre: ROJO con el motivo", () => {
  for (const banco of ["pruebas/x/no-existe.test.mjs", "pruebas/x/ayuda.mjs", "pruebas/x/../x/verde.test.mjs"]) {
    const r = correr({ banco, forma: "banco" });
    assert.equal(r.exit, 1, porque(`${banco} no puso rojo`, r.salida));
    assert.match(r.salida, /::error::/, r.salida);
  }
});

// ---------------------------------------------------------------------------
// LA FORMA `banco`: el grupo es el de ci.yml
// ---------------------------------------------------------------------------

test("forma banco sobre pruebas/init: corre el grupo de pruebas-init y nada mas", () => {
  const r = correr({ banco: "pruebas/init/uno.test.mjs", vueltas: "1", forma: "banco" });
  assert.equal(r.exit, 0, porque("el grupo de init no corrio verde", r.salida));
  assert.deepEqual(
    r.corridos,
    ["pruebas-init-dos", "pruebas-init-uno"],
    porque("el grupo de pruebas/init no es el de ci.yml", r.corridos),
  );
});

test("forma banco sobre pruebas/**: el grupo SIN pruebas/init, como el paso de ci.yml", () => {
  // Se sacan del arbol los que fallan: aca se mide QUE entra en la invocacion, y un rojo de la
  // vuelta cero cortaria antes de verlo.
  const r = correr({
    banco: "pruebas/x/verde.test.mjs",
    vueltas: "1",
    forma: "banco",
    sin: ["pruebas/z/rojo.test.mjs", "pruebas/y/intermitente.test.mjs"],
  });
  if (!bashTieneGlobstar) {
    // El bash 3.2 de macOS no tiene globstar. El paso lo tiene que DECIR, no juntar otra cosa.
    // En el runner del workflow (ubuntu-latest) y en el CI de este banco siempre hay globstar,
    // asi que la otra rama se ejerce en cada corrida de CI.
    assert.equal(r.exit, 1, porque("sin globstar tenia que negarse", r.salida));
    assert.match(r.salida, /globstar/, r.salida);
    return;
  }
  assert.equal(r.exit, 0, porque("el grupo de pruebas/** no corrio verde", r.salida));
  assert.deepEqual(
    r.corridos,
    ["pruebas-x-otro", "pruebas-x-verde"],
    porque("el grupo de pruebas/** no es el de ci.yml (sin init, sin actions)", r.corridos),
  );
});

test("forma banco sobre actions/**: el grupo de las actions y nada mas", () => {
  const r = correr({ banco: "actions/a/pruebas/accion.test.mjs", vueltas: "1", forma: "banco" });
  if (!bashTieneGlobstar) {
    assert.equal(r.exit, 1, porque("sin globstar tenia que negarse", r.salida));
    assert.match(r.salida, /globstar/, r.salida);
    return;
  }
  assert.equal(r.exit, 0, porque("el grupo de actions no corrio verde", r.salida));
  assert.deepEqual(r.corridos, ["actions-a-accion"], porque("el grupo de actions no es el de ci.yml", r.corridos));
});

// ---------------------------------------------------------------------------
// LAS COPIAS QUE TIENE QUE TENER, atadas
// ---------------------------------------------------------------------------

/** Los patrones de bancos de un texto: todo `NOMBRE=(<glob>*.test.mjs)` con un glob LITERAL.
 *  Los que arman la ruta con una variable (`"${ACCION}pruebas/"*.test.mjs`, del paso que busca
 *  actions sin banco) no juntan un grupo que se corra, y quedan fuera. */
const patrones = (texto) =>
  [...new Set([...texto.matchAll(/^\s*[A-Z_]+=\(([a-z][^)"$\s]*\*\.test\.mjs)\)/gm)].map((m) => m[1]))].sort();

test("los patrones del grupo son los de ci.yml, letra por letra", () => {
  const delCi = patrones(fs.readFileSync(CI, "utf8"));
  const delInstrumento = patrones(script);
  assert.ok(delCi.length >= 3, porque("se leyeron muy pocos patrones de ci.yml: cambio la forma", delCi));
  assert.deepEqual(
    delInstrumento,
    delCi,
    porque(
      "el instrumento junta los bancos con patrones distintos de los de ci.yml, asi que su forma 'banco' ya no " +
        "reproduce la invocacion del CI. Arreglo: copiar el patron nuevo de ci.yml al paso del instrumento",
      { ci: delCi, instrumento: delInstrumento },
    ),
  );
});

test("el techo por archivo de pruebas/init es el de ci.yml", () => {
  const techo = (t) => [...t.matchAll(/--test-timeout=(\d+)/g)].map((m) => m[1]);
  const ci = [...new Set(techo(fs.readFileSync(CI, "utf8")))];
  const instrumento = [...new Set(techo(script))];
  assert.deepEqual(instrumento, ci, porque("el techo por archivo difiere del de ci.yml", { ci, instrumento }));
});

test("el Node del instrumento es el del job pruebas-actions de ci.yml", () => {
  const ci = fs.readFileSync(CI, "utf8");
  const job = ci.slice(ci.indexOf("\n  pruebas_actions:"), ci.indexOf("\n  pruebas_init:"));
  const version = (t) => (t.match(/node-version: "([^"]+)"/) ?? [])[1];
  const wf = fs.readFileSync(WORKFLOW, "utf8");
  assert.ok(version(job), porque("no encontre el node-version de pruebas-actions en ci.yml", job.slice(0, 600)));
  assert.equal(version(wf), version(job), porque("el Node del instrumento no es el del CI", { ci: version(job), instrumento: version(wf) }));
});

test("TOPE_MINUTOS del paso es el timeout-minutes del job", () => {
  const wf = fs.readFileSync(WORKFLOW, "utf8");
  const job = (wf.match(/^ {4}timeout-minutes: (\d+)\s*$/m) ?? [])[1];
  const tope = (script.match(/^TOPE_MINUTOS=(\d+)$/m) ?? [])[1];
  assert.ok(job && tope, porque("no encontre alguna de las dos cifras", { job, tope }));
  assert.equal(
    tope,
    job,
    porque("el tope que el paso usa para estimar no es el techo real del job: el aviso de presupuesto mentiria", { job, tope }),
  );
});
