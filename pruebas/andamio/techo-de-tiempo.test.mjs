// GUARDA DE LOS TECHOS DE UN WORKFLOW: cuanto puede durar un job, y cuantas
// corridas puede haber vivas a la vez.
//
// POR QUE EXISTEN LAS DOS JUNTAS. Son la misma pregunta —que pasa cuando algo no
// termina— vista desde los dos ejes, y las dos fallan del mismo modo: hacia
// arriba, en silencio, sin un rojo que las denuncie.
//
//   · SIN `timeout-minutes` el default de GitHub son 360 MINUTOS por job. Un
//     paso que se queda esperando a la red no falla: se cuelga seis horas,
//     ocupando un runner y manteniendo su GITHUB_TOKEN valido todo ese rato. El
//     sintoma no se parece a un fallo —es un check que no vuelve— asi que nadie
//     lo diagnostica como un timeout que falta.
//   · SIN `concurrency` cada evento levanta su propia corrida. En un workflow que
//     dispara un push eso cuesta poco. En uno que dispara un COMENTARIO cuesta
//     una corrida por comentario, cada una con checkout y con el secret cargado,
//     y sin techo: el disparador no depende de escribir codigo, solo de poder
//     comentar.
//
// LO QUE VERIFICA, sobre los DOS arboles de workflows a la vez —el del marco
// (.github/workflows/) y el que el andamio reparte (plantilla/.github/workflows/)—:
//
//   1. todo job que corre pasos declara `timeout-minutes:`, con el numero que sea;
//   2. todo job que LLAMA a un workflow reusable NO lo declara;
//   3. todo workflow que se dispara por comentario declara `concurrency:` con su
//      `cancel-in-progress:` escrito.
//
// LA 2 NO ES SIMETRIA DECORATIVA. Un job con `uses:` a nivel de job admite un
// juego CERRADO de claves —name, uses, with, secrets, needs, if, permissions,
// strategy, concurrency— y `timeout-minutes` no esta entre ellas: escribirlo ahi
// no acota nada, hace que el workflow no valide. O sea que la regla 1 aplicada
// sin excepcion produciria un arreglo que rompe el archivo. La excepcion no es un
// agujero porque se verifica en la direccion contraria: no basta con que se le
// permita faltar, se exige que falte.
//
// LA 3 NO EXIGE UN VALOR de cancel-in-progress, solo que este ESCRITO, y es a
// proposito: `true` es lo correcto para un bot que contesta (una mencion nueva en
// el mismo hilo reemplaza a la anterior) y `false` lo es para un workflow que
// envia algo (cancelar a la mitad deja el envio hecho a medias). Cual de los dos
// es depende de que hace el workflow, y eso no se decide desde un escaneo de
// texto. Lo decidible —y lo que se revierte sin dejar rastro— es si alguien lo
// penso.
//
// LO QUE ESTA GUARDA NO PUEDE. No sabe si el numero es el correcto: un
// `timeout-minutes: 350` pasa igual que un 10. Verifica que la decision este
// tomada y escrita, que es la propiedad que desaparece sola cuando se agrega un
// job copiando otro y se le borra lo que "no hacia falta".
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { ARBOLES, jobsDelWorkflow, workflows } from "./workflows.mjs";

/** El default de GitHub cuando el job no dice nada. Se nombra en los mensajes
 *  porque es el numero que vuelve todo esto no-obvio: nadie supone que la
 *  ausencia de una linea signifique seis horas. */
const DEFAULT_DE_GITHUB = 360;

/** Los jobs que corren pasos y no declaran su techo de tiempo. */
export function jobsSinTecho(dir, rotulo = dir) {
  const problemas = [];
  for (const ruta of workflows(dir)) {
    for (const j of jobsDelWorkflow(ruta)) {
      // Un job que llama a un reusable no puede declararlo: ver la regla 2.
      if (j.reusable || j.techoDeTiempo) continue;
      problemas.push(
        `${rotulo}/${path.basename(ruta)}:${j.linea} · el job "${j.job}" no declara timeout-minutes, asi que ` +
          `corre con el default de GitHub: ${DEFAULT_DE_GITHUB} minutos. Un paso que se queda esperando no ` +
          `falla, se cuelga —y mantiene su GITHUB_TOKEN valido todo ese rato—, y el sintoma es un check que no ` +
          `vuelve, no un rojo. Arreglo: pone timeout-minutes con mas o menos el doble de lo que el job tarda ` +
          `cuando anda bien`,
      );
    }
  }
  return problemas;
}

/** Los jobs que llaman a un reusable Y declaran un techo que ahi no existe. */
export function reusablesConTecho(dir, rotulo = dir) {
  const problemas = [];
  for (const ruta of workflows(dir)) {
    for (const j of jobsDelWorkflow(ruta)) {
      if (!j.reusable || !j.techoDeTiempo) continue;
      problemas.push(
        `${rotulo}/${path.basename(ruta)}:${j.linea} · el job "${j.job}" llama a un workflow reusable y declara ` +
          `timeout-minutes, que no es una de las claves que ese tipo de job admite: no acota nada y hace que el ` +
          `workflow no valide. El techo de esa llamada lo ponen los jobs del reusable. Arreglo: borralo, y deja ` +
          `escrito al lado por que falta`,
      );
    }
  }
  return problemas;
}

/** Un workflow al que puede disparar cualquiera que sepa comentar. */
function seDisparaPorComentario(texto) {
  return /^ {2}issue_comment:/m.test(texto) || /^ {2}pull_request_review_comment:/m.test(texto);
}

/** Los workflows disparados por comentario que no declararon su concurrency. */
export function comentadosSinConcurrency(dir, rotulo = dir) {
  const problemas = [];
  for (const ruta of workflows(dir)) {
    const texto = fs.readFileSync(ruta, "utf8");
    if (!seDisparaPorComentario(texto)) continue;
    const donde = `${rotulo}/${path.basename(ruta)}`;
    if (!/^concurrency:/m.test(texto)) {
      problemas.push(
        `${donde} · se dispara por comentario y no declara concurrency: cada mencion levanta una corrida propia, ` +
          `con checkout y con el secret cargado, y sin techo. El disparador no depende de escribir codigo, solo ` +
          `de poder comentar. Arreglo: agrega un bloque concurrency: agrupando por hilo`,
      );
      continue;
    }
    if (!/^ {2}cancel-in-progress:/m.test(texto)) {
      problemas.push(
        `${donde} · declara concurrency y no dice cancel-in-progress. Sin esa linea las corridas hacen COLA en ` +
          `vez de reemplazarse, que para un bot que contesta es lo contrario de lo que se quiere. Arreglo: ` +
          `escribi el valor que corresponda —true si una mencion nueva reemplaza a la anterior, false si lo que ` +
          `hace el workflow no se puede cortar a la mitad— con su motivo al lado`,
      );
    }
  }
  return problemas;
}

// ---------------------------------------------------------------------------
// LAS COMPROBACIONES
// ---------------------------------------------------------------------------

test("workflows · el recorrido ve jobs de sobra en los dos arboles", () => {
  // Cero jobs recorridos seria un banco roto, no un arbol sano: sin este piso,
  // un glob que deje de matchear pondria verde a este archivo entero. Y ademas
  // se exige ver los dos casos que las reglas 1 y 2 separan, porque si el arbol
  // tuviera solo uno de los dos, la mitad de este banco no probaria nada.
  let conPasos = 0;
  let llamadores = 0;
  for (const { rotulo, dir } of ARBOLES) {
    assert.ok(fs.existsSync(dir), `no existe el arbol de workflows "${rotulo}" (${dir})`);
    for (const ruta of workflows(dir)) {
      for (const j of jobsDelWorkflow(ruta)) (j.reusable ? llamadores++ : conPasos++);
    }
  }
  assert.ok(conPasos >= 15, `solo ${conPasos} jobs con pasos entre los dos arboles: el lector se rompio`);
  assert.ok(llamadores >= 2, `solo ${llamadores} jobs que llaman a un reusable: el lector se rompio`);
});

test("workflows · TODO job con pasos declara su techo de tiempo, en los dos arboles", () => {
  assert.deepEqual(ARBOLES.flatMap(({ rotulo, dir }) => jobsSinTecho(dir, rotulo)), []);
});

test("workflows · NINGUN job que llame a un reusable declara timeout-minutes", () => {
  assert.deepEqual(ARBOLES.flatMap(({ rotulo, dir }) => reusablesConTecho(dir, rotulo)), []);
});

test("workflows · todo workflow disparado por comentario acota su concurrency", () => {
  // Sin un solo workflow disparado por comentario, las tres comprobaciones de
  // arriba pasarian sobre un conjunto vacio.
  const comentados = ARBOLES.flatMap(({ rotulo, dir }) =>
    workflows(dir)
      .filter((r) => seDisparaPorComentario(fs.readFileSync(r, "utf8")))
      .map((r) => `${rotulo}/${path.basename(r)}`),
  );
  assert.ok(
    comentados.length >= 2,
    `solo ${comentados.length} workflows disparados por comentario: se esperaba al menos el bot del marco y su ` +
      `gemelo del andamio. O se movio el disparador, o esta comprobacion quedo mirando al vacio`,
  );
  assert.deepEqual(ARBOLES.flatMap(({ rotulo, dir }) => comentadosSinConcurrency(dir, rotulo)), []);
});

// ---------------------------------------------------------------------------
// LAS MORDIDAS. Se mutan COPIAS en un directorio temporal: el arbol del repo no
// se toca, asi que un fallo a mitad de camino no puede dejarlo modificado.
// ---------------------------------------------------------------------------

/** Una copia del arbol de workflows del andamio, en un temporal. */
function copiaDelAndamio(prefijo) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), prefijo));
  const copia = path.join(tmp, "workflows");
  fs.cpSync(ARBOLES[1].dir, copia, { recursive: true });
  return { tmp, copia };
}

test("workflows · la comprobacion del techo de tiempo MUERDE", () => {
  const { tmp, copia } = copiaDelAndamio("projects-techo-");
  try {
    assert.deepEqual(jobsSinTecho(copia, "copia"), [], "la copia no arranco limpia");

    // (a) un job pierde su linea. El caso barato: alguien agrega un job copiando
    // otro y le borra lo que "no hacia falta". Se corta por el job para que la
    // mutacion caiga donde se dice y no en el primer numero que se le parezca.
    const ci = path.join(copia, "ci.yml");
    const original = fs.readFileSync(ci, "utf8");
    const deBuildTest = original.indexOf("  build_test:");
    assert.ok(deBuildTest > 0, "el job build_test se renombro: esta mutacion apunta a nada");
    const sinLinea =
      original.slice(0, deBuildTest) +
      original.slice(deBuildTest).replace("    timeout-minutes: 25\n", "");
    assert.notEqual(sinLinea, original, "la mutacion no cambio nada: el numero de build_test se movio");
    fs.writeFileSync(ci, sinLinea);
    const uno = jobsSinTecho(copia, "copia");
    assert.equal(uno.length, 1, `borrar un techo tenia que dejar exactamente un job sin el: ${JSON.stringify(uno)}`);
    assert.match(uno[0], /build_test/);
    assert.match(uno[0], /360 minutos/);

    // (b) el techo del BOT, que es el otro archivo y el otro modo de perderlo:
    // ahi no hay un job que copiar, hay un archivo entero que alguien poda.
    fs.writeFileSync(ci, original);
    const bot = path.join(copia, "claude.yml");
    const botOriginal = fs.readFileSync(bot, "utf8");
    fs.writeFileSync(bot, botOriginal.replace("    timeout-minutes: 15\n", ""));
    const dos = jobsSinTecho(copia, "copia");
    assert.equal(dos.length, 1, `borrar el techo del bot tenia que reportarse: ${JSON.stringify(dos)}`);
    assert.match(dos[0], /claude\.yml/);

    fs.writeFileSync(bot, botOriginal);
    assert.deepEqual(jobsSinTecho(copia, "copia"), [], "la copia no volvio limpia");
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test("workflows · la comprobacion del reusable con techo MUERDE", () => {
  const { tmp, copia } = copiaDelAndamio("projects-reusable-");
  try {
    assert.deepEqual(reusablesConTecho(copia, "copia"), [], "la copia no arranco limpia");

    // El arreglo INGENUO de la regla 1 aplicado al job que la regla 2 exceptua:
    // ponerle el techo al job que llama al reusable. Se ve bien en el diff y
    // rompe el archivo, que es exactamente por que esta guarda mira las dos
    // direcciones.
    const ci = path.join(copia, "ci.yml");
    const original = fs.readFileSync(ci, "utf8");
    const ancla = "  marco:\n";
    assert.ok(original.includes(ancla), "el job marco se renombro: esta mutacion apunta a nada");
    fs.writeFileSync(ci, original.replace(ancla, `${ancla}    timeout-minutes: 10\n`));
    const problemas = reusablesConTecho(copia, "copia");
    assert.equal(problemas.length, 1, `el techo en el job del reusable tenia que reportarse: ${JSON.stringify(problemas)}`);
    assert.match(problemas[0], /"marco"/);
    // Y el mismo arbol mutado NO gana un problema del otro lado: las dos
    // comprobaciones tienen que estar mirando cosas distintas.
    assert.deepEqual(jobsSinTecho(copia, "copia"), [], "la mutacion de la regla 2 movio tambien a la regla 1");

    fs.writeFileSync(ci, original);
    assert.deepEqual(reusablesConTecho(copia, "copia"), [], "la copia no volvio limpia");
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test("workflows · la comprobacion de concurrency MUERDE", () => {
  const { tmp, copia } = copiaDelAndamio("projects-concurrency-");
  try {
    assert.deepEqual(comentadosSinConcurrency(copia, "copia"), [], "la copia no arranco limpia");
    const bot = path.join(copia, "claude.yml");
    const original = fs.readFileSync(bot, "utf8");

    // (a) el bloque entero, borrado.
    const inicio = original.indexOf("concurrency:\n");
    assert.ok(inicio > 0, "el bloque concurrency del bot se movio: esta mutacion apunta a nada");
    const finBloque = original.indexOf("\njobs:", inicio);
    assert.ok(finBloque > inicio, "no encontre el `jobs:` que cierra el bloque");
    fs.writeFileSync(bot, original.slice(0, inicio) + original.slice(finBloque + 1));
    const sinBloque = comentadosSinConcurrency(copia, "copia");
    assert.equal(sinBloque.length, 1, `borrar el bloque tenia que reportarse: ${JSON.stringify(sinBloque)}`);
    assert.match(sinBloque[0], /no declara concurrency/);

    // (b) el bloque queda, pero pierde la linea que dice si las corridas se
    // reemplazan o hacen cola. Es la mitad silenciosa: el bloque presente se lee
    // como "esto ya esta resuelto" y el default es hacer COLA.
    fs.writeFileSync(bot, original.replace(/^ {2}cancel-in-progress:.*\n/m, ""));
    const sinDecision = comentadosSinConcurrency(copia, "copia");
    assert.equal(sinDecision.length, 1, `borrar cancel-in-progress tenia que reportarse: ${JSON.stringify(sinDecision)}`);
    assert.match(sinDecision[0], /cancel-in-progress/);

    fs.writeFileSync(bot, original);
    assert.deepEqual(comentadosSinConcurrency(copia, "copia"), [], "la copia no volvio limpia");
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});
