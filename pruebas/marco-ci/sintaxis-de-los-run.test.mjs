import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

// ---------------------------------------------------------------------------
// TODO BLOQUE `run:` TIENE QUE SER SHELL VALIDO, Y ESO SE PUEDE SABER SIN CI.
//
// EL DEFECTO QUE ESTE BANCO CIERRA, y lo cometi yo: dentro de un `echo "…"` de
// un paso del ci.yml escribi el nombre de un bucle entre backticks —`for FORMA
// in ...`— para citarlo en el mensaje de error. Dentro de comillas DOBLES los
// backticks son sustitucion de comando, asi que el shell intento ejecutar
// `for FORMA in ...` y el paso entero dejo de parsear. shellcheck lo canto con
// SC1073 «Couldn't parse this for loop».
//
// LO CARO NO FUE EL ERROR, FUE EL CICLO: nada en el repositorio comprobaba los
// `run:` en local, asi que la primera vez que se supo fue en un runner de
// GitHub, despues de subir.
//
// Y UNA CORRECCION QUE ESTE ARCHIVO SE HACE A SI MISMO: la primera version de
// este banco usaba SOLO `bash -n`, y `bash -n` NO CAZA ESTE ERROR — medido
// sobre la linea real: exit 0. El shell difiere lo que hay dentro de una
// sustitucion de comando, asi que el `for` mal formado no se ve hasta que se
// ejecuta. Quien lo cazo fue shellcheck, en el runner.
//
// Asi que hay DOS controles y hacen cosas distintas: uno mira que el bloque
// PARSEE (barato, y caza comillas sin cerrar y demas), y el otro busca el patron
// exacto que se cometio —backticks dentro de una cadena entre comillas dobles—,
// que es lo que `bash -n` deja pasar.
//
// LO QUE ESTE BANCO NO PUEDE AFIRMAR, dicho primero: no reemplaza a actionlint
// ni a shellcheck. No mira expresiones de GitHub, ni permisos, ni las decenas de
// reglas de shellcheck. Lo que sostiene son las dos cosas de arriba.
// ---------------------------------------------------------------------------

/** Los bloques `run:` de un workflow, con su linea de inicio.
 *
 *  Se saca por indentacion, que es lo unico que separa un bloque de lo que le
 *  sigue en YAML. Las expresiones `${{ … }}` se reemplazan por un literal: en el
 *  runner las sustituye GitHub antes de que el shell vea el texto, asi que
 *  dejarlas haria fallar el parseo por una razon que no es la del autor. */
function bloquesRun(texto) {
  const lineas = texto.split("\n");
  const bloques = [];
  for (let i = 0; i < lineas.length; i++) {
    const m = lineas[i].match(/^(\s*)-?\s*run:\s*\|\s*$/);
    if (!m) continue;
    const sangria = m[1].length;
    const cuerpo = [];
    let j = i + 1;
    for (; j < lineas.length; j++) {
      const l = lineas[j];
      if (l.trim() === "") {
        cuerpo.push("");
        continue;
      }
      const s = l.match(/^(\s*)/)[1].length;
      if (s <= sangria) break;
      cuerpo.push(l);
    }
    if (cuerpo.length) {
      const menor = Math.min(...cuerpo.filter((l) => l.trim()).map((l) => l.match(/^(\s*)/)[1].length));
      bloques.push({ linea: i + 1, cuerpo: cuerpo.map((l) => l.slice(menor)).join("\n") });
    }
    i = j - 1;
  }
  return bloques;
}

const sinExpresiones = (s) => s.replace(/\$\{\{[^}]*\}\}/g, "EXPRESION_DE_GITHUB");

function workflows() {
  return execFileSync("git", ["ls-files", "*.yml"], { cwd: RAIZ, encoding: "utf-8" })
    .trim()
    .split("\n")
    .filter((f) => f.includes(".github/workflows/") || f.includes("actions/"));
}

test("hay bloques `run:` que revisar: un cero aca es este banco roto", () => {
  const total = workflows().reduce((n, f) => n + bloquesRun(fs.readFileSync(path.join(RAIZ, f), "utf-8")).length, 0);
  assert.ok(total >= 20, `se encontraron ${total} bloques run:. Si cayo de golpe, mira si cambio la forma del YAML`);
});

test("todo bloque `run:` de todo workflow es shell que PARSEA", () => {
  const rotos = [];
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "run-"));
  for (const f of workflows()) {
    for (const b of bloquesRun(fs.readFileSync(path.join(RAIZ, f), "utf-8"))) {
      const guion = path.join(tmp, "p.sh");
      fs.writeFileSync(guion, sinExpresiones(b.cuerpo));
      const r = spawnSync("bash", ["-n", guion], { encoding: "utf-8" });
      if (r.status !== 0) rotos.push(`${f}:${b.linea}  ${(r.stderr || "").trim().split("\n")[0]}`);
    }
  }
  fs.rmSync(tmp, { recursive: true, force: true });
  assert.deepEqual(
    rotos,
    [],
    "un bloque `run:` que no parsea muere en el runner y no antes. La causa mas facil de cometer: backticks dentro " +
      `de un \`echo "…"\`, que el shell lee como sustitucion de comando:\n  ${rotos.join("\n  ")}`,
  );
});

/** Backticks dentro de una cadena entre comillas dobles.
 *
 *  En un `echo "…"` se leen como SUSTITUCION DE COMANDO: el shell intenta
 *  ejecutar lo que hay adentro. Citar un comando asi en un mensaje de error es
 *  natural al escribirlo y es exactamente el error que se cometio.
 *
 *  UN BACKTICK ESCAPADO NO CUENTA. Dentro de comillas dobles, `\\``  es un backtick
 *  literal y no ejecuta nada: es el idioma que este mismo repositorio ya usaba en
 *  aviso-version.yml, y la primera version de esta deteccion lo marcaba como
 *  defecto. Un control que caza la forma correcta ensena a ignorarlo. */
const BACKTICK_EN_COMILLAS = /"(?:[^"\\\n]|\\.)*?(?<!\\)`/;

test("ningun `run:` cita un comando con backticks dentro de comillas dobles", () => {
  const rotos = [];
  let mirados = 0;
  for (const f of workflows()) {
    for (const b of bloquesRun(fs.readFileSync(path.join(RAIZ, f), "utf-8"))) {
      // SOLO LAS LINEAS QUE SON UN `echo`/`printf` DE SHELL, y el recorte no es
      // pereza: un bloque `run:` de este repositorio trae heredocs con
      // JavaScript adentro, y ahi un backtick es un literal de plantilla —
      // `filas.push("| \`" + d.archivo + ...)` es codigo correcto—. Mirar todo
      // marcaria como defecto lineas que estan bien, y un control que caza lo
      // correcto ensenia a ignorarlo.
      //
      // El defecto vive justo en esas dos formas: citar un comando dentro del
      // mensaje que se le imprime a una persona.
      const ES_MENSAJE_DE_SHELL = /^\s*(?:echo|printf|resumen)\s+"/;
      b.cuerpo.split("\n").forEach((l, i) => {
        if (!ES_MENSAJE_DE_SHELL.test(l)) return;
        mirados++;
        if (BACKTICK_EN_COMILLAS.test(l)) {
          rotos.push(`${f}: linea ${b.linea + 1 + i}  ${l.trim().slice(0, 90)}`);
        }
      });
    }
  }
  assert.ok(mirados >= 40, `solo se miraron ${mirados} mensajes de shell: si cayo de golpe, el reconocedor dejo de verlos`);
  assert.deepEqual(
    rotos,
    [],
    "dentro de comillas dobles los backticks son sustitucion de comando: el shell intenta EJECUTAR lo que se queria " +
      `citar. Para citar un comando en un mensaje, comillas simples:\n  ${rotos.join("\n  ")}`,
  );
});

test("MUERDE: el error que motivo este banco se caza, y `bash -n` NO alcanza", () => {
  // El caso exacto, escrito como lo escribi: un `for` citado entre backticks
  // adentro de comillas dobles.
  const linea = 'echo "arreglo: agregalo al `for FORMA in a b; do` de este paso"';

  // PRIMERO, LA MEDICION QUE CORRIGE LA PREMISA: `bash -n` sale 0 sobre esto.
  // Por eso el control de arriba existe aparte y no como un caso de este mismo.
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "run-muerde-"));
  const guion = path.join(tmp, "malo.sh");
  fs.writeFileSync(guion, `${linea}\n`);
  assert.equal(
    spawnSync("bash", ["-n", guion], { encoding: "utf-8" }).status,
    0,
    "si `bash -n` empezara a cazarlo, este banco tiene un control de mas y conviene saberlo",
  );

  // Y ahora si: el patron lo ve, y no confunde a la version corregida.
  assert.equal(BACKTICK_EN_COMILLAS.test(linea), true, "la deteccion tiene que ver el defecto real");
  assert.equal(
    BACKTICK_EN_COMILLAS.test("echo \"agregalo al bucle 'for FORMA in a b' de este paso\""),
    false,
    "y no cazar la version con comillas simples, que es la correcta",
  );
  // Ni una sustitucion de comando LEGITIMA, fuera de comillas.
  assert.equal(BACKTICK_EN_COMILLAS.test("HOY=`date +%F`"), false, "una sustitucion de verdad, fuera de comillas, no es el defecto");
  // Ni el backtick ESCAPADO, que es la forma correcta de citar dentro de
  // comillas dobles y que este repositorio ya usaba en aviso-version.yml.
  assert.equal(
    BACKTICK_EN_COMILLAS.test('resumen "volver a disparar el boton con \\`simulacro\\` desmarcado."'),
    false,
    "un backtick escapado es un literal: cazarlo enseniaria a ignorar este control",
  );
  fs.rmSync(tmp, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// NINGUNA CONTINUACION DE LINEA QUEDA CORTADA, y es el tercer control, distinto de los dos de
// arriba: lo que caza es shell VALIDO que hace otra cosa.
//
// EL CASO QUE LO TRAJO, de Rigel (1.12.0, commit cffa81f de alla, 2026-08-31). Un arreglo dejo
// comentarios ENTRE `node script.mjs \` y la linea de sus argumentos. Es bash valido —`bash -n`
// no dice nada— y el efecto es que el comando corre SIN sus argumentos: el script recibio
// `undefined` como ruta y murio con ERR_INVALID_ARG_TYPE en el runner de un consumidor.
//
// POR QUE NINGUN CONTROL LO VE. El de sintaxis no, porque parsea. Y un banco que busque que la
// invocacion pase sus argumentos tampoco: la linea de argumentos SIGUE AHI, solo que huerfana. Un
// control de presencia no distingue una linea conectada de una desconectada. Aca no hay ninguna
// hoy (medido el 2026-09-17 sobre los mismos workflows que recorren los dos controles de arriba);
// esto es para que la primera no llegue al runner.
// ---------------------------------------------------------------------------

/** Las continuaciones cortadas de un bloque: una linea que termina en `\` seguida de un
 *  comentario o de una linea vacia.
 *
 *  Dos cosas NO son continuacion, y contarlas enseniaria a ignorar el control: una linea que es
 *  ella misma un COMENTARIO (en bash la barra final de un comentario es texto), y una que
 *  termina en un numero PAR de barras (`\\` es una barra escapada, no una continuacion). */
export function continuacionesCortadas(cuerpo) {
  const l = cuerpo.split("\n");
  const cortadas = [];
  for (let i = 0; i < l.length - 1; i += 1) {
    const actual = l[i].trimEnd();
    if (/^\s*#/.test(actual)) continue;
    const barras = actual.match(/\\+$/);
    if (!barras || barras[0].length % 2 === 0) continue;
    const siguiente = l[i + 1].trim();
    if (siguiente === "" || siguiente.startsWith("#")) cortadas.push({ indice: i, texto: actual.trim() });
  }
  return cortadas;
}

test("ninguna continuacion de linea de un `run:` queda cortada por un comentario o una linea vacia", () => {
  const malos = [];
  let continuaciones = 0;
  for (const f of workflows()) {
    for (const b of bloquesRun(fs.readFileSync(path.join(RAIZ, f), "utf-8"))) {
      continuaciones += b.cuerpo.split("\n").filter((l) => /(^|[^\\])(\\\\)*\\$/.test(l.trimEnd()) && !/^\s*#/.test(l)).length;
      for (const c of continuacionesCortadas(b.cuerpo)) {
        malos.push(`${f}: run: de la linea ${b.linea}, linea ${b.linea + 1 + c.indice}  "${c.texto.slice(0, 60)}"`);
      }
    }
  }
  // Anti-vacuidad: el marco usa continuaciones (el paso de ejecutores del consumidor, las
  // sondas del distribuidor). Si este conteo cae a cero, el recorrido dejo de verlas.
  assert.ok(continuaciones >= 5, `solo se vieron ${continuaciones} continuaciones de linea: el recorrido dejo de verlas`);
  assert.deepEqual(
    malos,
    [],
    "una linea que termina en barra invertida seguida de un comentario o de una linea vacia deja el comando SIN " +
      "los argumentos que venian abajo, y bash no se queja: es sintacticamente valido. Arreglo: sacar el comentario " +
      `de entre las dos lineas (arriba del comando, no en el medio) o borrar la linea vacia:\n  ${malos.join("\n  ")}`,
  );
});

test("MUERDE: la continuacion cortada se caza, `bash -n` NO la ve, y lo correcto no se marca", () => {
  // El caso exacto de Rigel: comentarios entre el comando y sus argumentos.
  const cortada = ["node script.mjs \\", "  # el expectedHeadOid va abajo", '  "${CABEZA}" "${SALIDA}"'].join("\n");
  const conVacia = ["node script.mjs \\", "", '  "${CABEZA}"'].join("\n");

  // PRIMERO LA PREMISA: `bash -n` sale 0 sobre esto. Por eso el control existe aparte.
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "run-continuacion-"));
  const guion = path.join(tmp, "malo.sh");
  fs.writeFileSync(guion, `${cortada}\n`);
  const sintaxis = spawnSync("bash", ["-n", guion], { encoding: "utf-8" });
  fs.rmSync(tmp, { recursive: true, force: true });
  assert.equal(sintaxis.status, 0, "si `bash -n` empezara a cazarlo, este control sobra y conviene saberlo");

  assert.equal(continuacionesCortadas(cortada).length, 1, "tiene que ver el comentario en el medio");
  assert.equal(continuacionesCortadas(conVacia).length, 1, "y la linea vacia en el medio");

  // Lo correcto, que no se puede marcar.
  assert.deepEqual(continuacionesCortadas(["node script.mjs \\", '  "${CABEZA}"'].join("\n")), [], "una continuacion sana");
  assert.deepEqual(
    continuacionesCortadas(["# un comentario que termina en barra \\", "", "echo ok"].join("\n")),
    [],
    "la barra final de un comentario es texto, no continuacion",
  );
  assert.deepEqual(
    continuacionesCortadas(["printf '%s' a\\\\", "", "echo ok"].join("\n")),
    [],
    "dos barras son una barra escapada, no una continuacion",
  );
});
