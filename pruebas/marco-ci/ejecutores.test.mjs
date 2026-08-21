// Banco del paso "Ejecutores de paquetes pinados" de marco-ci.yml.
//
// Corre el script COMPLETO del paso —prefiltro de git grep incluido— sobre un
// repo de juguete, y afirma por codigo de salida. El prefiltro entra en el banco
// a proposito: los ejecutores que la auditoria del 2026-08-20 midio en exit 0
// (npm x, bun x, pnpm --silent dlx) se le escapaban al prefiltro Y al lector, y
// un banco que solo probara el lector habria dado verde sobre el mismo agujero.
//
// EL BANCO TIENE DOS MITADES Y HACEN COSAS DISTINTAS:
//
//   · Los casos de casos/ejecutores.md son la REGRESION: entradas concretas,
//     cada una con su origen y su motivo escrito, corridas por la tuberia
//     completa. Sirven para que un arreglo no rompa lo que ya se sostenia.
//   · El corpus GENERADO (generar.mjs) es el que puede encontrar algo nuevo. La
//     version anterior de este archivo afirmaba el invariante del prefiltro
//     iterando la lista escrita a mano, y por eso no podia, por construccion,
//     cazar un miembro nuevo de la clase: solo recorria los casos que alguien ya
//     habia pensado. Es la razon por la que dos rondas cerraron los casos
//     citados y la clase siguio abierta una ortografia mas adentro.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  scriptDelPaso,
  programaNode,
  patronDelPrefiltro,
  alfabetoDelPaso,
  RAIZ,
} from "./extraer.mjs";
import { corpus, alfabetoPropio } from "./generar.mjs";
import {
  repoDeJuguete,
  carpetaTemporal,
  escribir,
  git,
  correrBash,
  correrNode,
  limpiarTodo,
} from "./util.mjs";

const PASO = "Ejecutores de paquetes pinados";
const script = scriptDelPaso(PASO);
const programa = programaNode(script, PASO);
const patron = patronDelPrefiltro(script, PASO);
// DOS ALFABETOS, a proposito y no por duplicacion. El del PASO se lee del YAML;
// el del BANCO sale de casos/ortografias.md, escrito desde la documentacion de
// cada gestor. Compartir uno era la tautologia de la ronda anterior: un corpus
// derivado del alfabeto que la regla usa solo puede preguntar por los miembros que
// la regla ya conoce. Con dos, el banco afirma la RELACION entre ellos y el corpus
// puede traer una forma que el paso todavia no ve.
const alfabetoDelYaml = alfabetoDelPaso(programa, PASO);
const alfabetoDelBanco = alfabetoPropio();
const CORPUS = corpus(alfabetoDelBanco);

function casos() {
  const md = readFileSync(join(RAIZ, "pruebas", "marco-ci", "casos", "ejecutores.md"), "utf8");
  const bloque = md.match(/```json\n([\s\S]*?)\n```/);
  assert.ok(bloque, "casos/ejecutores.md tiene que traer un bloque ```json con los casos");
  const lista = JSON.parse(bloque[1]);
  assert.ok(lista.length > 0, "la lista de casos no puede quedar vacia");
  return lista;
}

/** La tuberia completa (git grep + lector) sobre un repo con estas entradas. */
function correrPaso(entradas) {
  const raiz = repoDeJuguete("ejecutores-");
  for (const entrada of entradas) escribir(raiz, entrada.archivo, `${entrada.linea}\n`);
  git(raiz, "add", "-A");
  return correrBash(script, { cwd: raiz });
}

/**
 * Solo el LECTOR, sin git: se le pasa la lista de rutas NUL-separada, igual que
 * el paso. Es la unica forma de recorrer un corpus de miles de entradas sin
 * pagar un repo de juguete por entrada, y sigue siendo el texto que corre de
 * verdad (se extrae del YAML, no se copia).
 */
function correrLector(entradas) {
  const raiz = carpetaTemporal("lector-");
  const rutas = [];
  for (const entrada of entradas) {
    escribir(raiz, entrada.archivo, `${entrada.linea}\n`);
    rutas.push(entrada.archivo);
  }
  escribir(raiz, "lista.bin", `${rutas.join("\0")}\0`);
  return correrNode(programa, { args: ["lista.bin"], cwd: raiz });
}

test.after(limpiarTodo);

/**
 * La anotacion MAS FUERTE que el paso emitio sobre esta corrida, o "nada".
 *
 * Hace falta desde el modo aviso del 2026-08-21: el codigo de salida distingue dos
 * estados y ahora hacen falta tres. Un aviso ruidoso y un silencio salen los dos
 * exit 0, y la diferencia entre los dos es toda la diferencia entre un residuo
 * DECLARADO y un agujero. Se lee del prefijo de linea de Actions y no de la prosa del
 * mensaje: el texto de un mensaje cambia con cada arreglo, el prefijo es el contrato.
 */
function anotacion(salida) {
  if (/^::error\b/m.test(salida)) return "error";
  if (/^::warning\b/m.test(salida)) return "warning";
  return "nada";
}

// ---------------------------------------------------------------- regresion
for (const caso of casos()) {
  test(`ejecutores · ${caso.origen} · ${caso.id}`, () => {
    const { exit, salida } = correrPaso([caso]);
    assert.equal(
      exit,
      caso.exit,
      `${caso.id}: se esperaba exit ${caso.exit} y salio ${exit} (${caso.por_que}).\n${salida}`,
    );
    // El campo es OPCIONAL: donde el caso lo declara, es lo que lo sostiene. Donde no,
    // alcanza el exit y no se afirma nada sobre la anotacion.
    if (caso.anota !== undefined) {
      assert.equal(
        anotacion(salida),
        caso.anota,
        `${caso.id}: se esperaba la anotacion "${caso.anota}" y salio "${anotacion(salida)}" (${caso.por_que}).\n${salida}`,
      );
    }
  });
}

// ------------------------------------------------------------ corpus generado
//
// CUATRO BUCKETS DESDE EL 2026-08-21, y no dos. El modo aviso del residuo A16 rompio
// la particion binaria: hay entradas que TIENEN que anotar sin poner rojo, y hay
// entradas que —esta medido— no anotan nada. Meterlas todas en VERDES las haria pasar
// por la puerta de atras: el test de las verdes solo mira el exit, asi que una entrada
// muda y una que avisa le dan lo mismo, y la diferencia entre las dos es exactamente
// la diferencia entre un residuo declarado y un agujero.
const ROJAS = CORPUS.filter((entrada) => entrada.clase === "rojo");
const AVISOS = CORPUS.filter((entrada) => entrada.clase === "aviso");
const RESIDUOS = CORPUS.filter((entrada) => entrada.clase === "residuo");
const VERDES = CORPUS.filter((entrada) => entrada.clase === "verde");

test("corpus generado · cruza todos los ejes contra el alfabeto del banco", () => {
  assert.ok(
    alfabetoDelBanco.length >= 5,
    `el alfabeto del banco quedo corto: ${alfabetoDelBanco.length}`,
  );
  assert.ok(ROJAS.length > 500, `el corpus rojo quedo corto: ${ROJAS.length}`);
  assert.ok(VERDES.length > 300, `el corpus verde quedo corto: ${VERDES.length}`);
  assert.ok(AVISOS.length > 0, "sin entradas de aviso, la decision del modo aviso no se mide");
  assert.ok(RESIDUOS.length > 0, "sin entradas de residuo, el agujero medido no queda fijado");
  assert.equal(
    ROJAS.length + AVISOS.length + RESIDUOS.length + VERDES.length,
    CORPUS.length,
    "hay entradas del corpus sin clase: una entrada que ningun bucket recorre es una pregunta que el banco no hace",
  );
});

// LA INDEPENDENCIA, hecha mecanica y no confiada a la prosa. El generador no
// puede volver a leer el paso: si lo lee, el corpus vuelve a preguntar por lo que
// la regla ya sabe y deja de poder encontrar un miembro nuevo, que es la
// tautologia que esta ronda vino a cortar. Medido sobre el codigo de 61d604c con
// el mismo arnes: el corpus derivado del alfabeto del paso encontraba 0 entradas
// invisibles y el corpus con alfabeto propio encontraba 200. Un comentario
// pidiendo que no se derive no habria sobrevivido a la tercera ronda; esta
// asercion si.
test("corpus generado · el generador no lee el paso que audita", () => {
  const fuente = readFileSync(join(RAIZ, "pruebas", "marco-ci", "generar.mjs"), "utf8");
  assert.ok(
    !/extraer\.mjs|marco-ci\.yml|ALFABETO/.test(fuente),
    "generar.mjs volvio a mirar el paso (extraer.mjs, marco-ci.yml o su ALFABETO): un corpus derivado de la regla que audita no puede encontrar un miembro nuevo de la clase, solo formas nuevas de los miembros que la regla ya conoce",
  );
});

// LA RELACION ENTRE LOS DOS ALFABETOS, que es lo que reemplaza al alfabeto
// compartido. Va en esta direccion y no en la otra a proposito:
//
//   · Todo par que el PASO declara tiene que estar en el alfabeto del BANCO. Si
//     no esta, el banco no lo puede juzgar: el paso tendria una rama que ninguna
//     entrada del corpus recorre, y el banco daria verde sin haber preguntado.
//     Eso es rojo, y el mensaje dice donde se arregla.
//   · Al REVES no se exige nada. El banco puede conocer formas que el paso no ve,
//     y esas no fallan aca — fallan en "el lector no deja pasar ninguna entrada
//     sin pinar", que es donde tienen que fallar: como un agujero del check, con
//     la entrada concreta que lo muestra, no como una diferencia de listas.
test("corpus generado · el banco conoce todo par que el paso declara", () => {
  const delBanco = new Set(alfabetoDelBanco.map((par) => `${par.gestor}=${par.sub}`));
  const huerfanos = alfabetoDelYaml
    .map((par) => `${par.gestor}=${par.sub}`)
    .filter((clave) => !delBanco.has(clave));
  assert.deepEqual(
    huerfanos,
    [],
    'el paso declara estos pares y el alfabeto del banco no los tiene, asi que ninguna entrada generada los recorre y el corpus daria verde sin preguntar. Arreglo: agregalos a pruebas/marco-ci/casos/ortografias.md con sus ortografias y la fuente de donde salen',
  );
});

// Toda entrada sin version exacta tiene que quedar ROJA. Cada entrada vive en su
// PROPIO archivo, asi que la ruta identifica la entrada: el conjunto de rutas
// reportadas se compara contra el esperado, y una entrada que el lector no ve
// aparece como ruta faltante. El codigo de salida solo dice "alguna"; la
// comparacion de conjuntos dice CUAL, y es lo unico que puede cazar un miembro
// nuevo de la clase.
//
// Se cuentan SOLO las lineas ::error, nunca los ::warning. Un ::warning no pone
// rojo ningun job, asi que aceptarlo como cobertura seria aceptar exactamente el
// falso verde que este check existe para no tener. Aflojar esto a
// /::(error|warning)/ hace pasar el test y deja el agujero: la primera corrida de
// este corpus lo mostro con `--registry <url>`, que salia por el carril del
// ::warning.
test("corpus generado · el lector no deja pasar ninguna entrada sin pinar", () => {
  const { exit, salida } = correrLector(ROJAS);
  assert.equal(exit, 1, `el lector salio ${exit} sobre ${ROJAS.length} entradas sin pinar:\n${salida}`);
  const conError = new Set();
  for (const linea of salida.split("\n")) {
    const marca = linea.match(/^::error file=([^,]+),/);
    if (marca) conError.add(marca[1]);
  }
  const invisibles = ROJAS.filter((entrada) => !conError.has(entrada.archivo));
  assert.deepEqual(
    invisibles.map((entrada) => `${entrada.id} (${entrada.nota}): ${entrada.linea}`),
    [],
    "estas entradas sin pinar no dieron ::error: o salieron en silencio, o salieron por el carril del ::warning que no pone rojo nada. Las dos cosas son un miembro nuevo de la clase",
  );
});

// Y ninguna entrada correctamente pinada puede ponerse roja. Este es puro codigo
// de salida: un solo falso rojo lo tumba. Importa tanto como el otro, porque un
// check que se pone rojo sobre la forma correcta se apaga en el tercer PR.
test("corpus generado · el lector no se pone rojo sobre ninguna entrada pinada", () => {
  const { exit, salida } = correrLector(VERDES);
  assert.equal(exit, 0, `el lector salio ${exit} sobre ${VERDES.length} entradas pinadas:\n${salida}`);
});

// LAS ENTRADAS DE AVISO: exit 0 —no son compuerta— y ::warning:: en CADA UNA. Las dos
// mitades importan y por motivos opuestos. Sin el exit 0, la decision del modo aviso no
// se aplico. Sin el warning por entrada, la decision se convirtio en "no mirar", que es
// otra cosa: el permiso mas ancho que se puede escribir en un allowlist saldria en
// silencio y nadie lo sabria. Se compara por CONJUNTO de rutas y no por cantidad,
// porque lo unico que caza un miembro nuevo es saber CUAL falta.
test("corpus generado · el lector AVISA sobre cada permiso indeterminado, sin ponerse rojo", () => {
  const { exit, salida } = correrLector(AVISOS);
  assert.equal(exit, 0, `el lector salio ${exit} sobre ${AVISOS.length} entradas de aviso:\n${salida.slice(0, 4000)}`);
  const conAviso = new Set();
  for (const linea of salida.split("\n")) {
    const marca = linea.match(/^::warning file=([^,]+),/);
    if (marca) conAviso.add(marca[1]);
  }
  const mudas = AVISOS.filter((entrada) => !conAviso.has(entrada.archivo));
  assert.deepEqual(
    mudas.map((entrada) => `${entrada.id} (${entrada.nota}): ${entrada.linea}`),
    [],
    "estas entradas autorizan descargar y ejecutar sin pinar y el lector no anoto nada sobre ellas. Un aviso que no sale no es modo aviso: es el agujero de siempre, con permiso",
  );
});

// EL RESIDUO A16, FIJADO COMO CASO. Estas entradas escriben el MISMO permiso que las de
// aviso —el comodin separado sobre un gestor con subcomando autoriza cualquier
// subcomando, el de ejecutar incluido— y esta medido que el lector no las ve: el
// alfabeto compara por igualdad exacta y el token que sigue al gestor no es ninguno de
// sus subcomandos. El caso afirma el AGUJERO a proposito, que es la unica forma de que
// el dia que se cierre se vea en el diff. Si este test se cae, el residuo se cerro:
// mover la clase a AVISOS y bajar la fila del backlog de docs/reglas-no-escritas.md.
test("corpus generado · el residuo A16 sigue MUDO, y queda fijado en vez de olvidado", () => {
  const { exit, salida } = correrLector(RESIDUOS);
  assert.equal(exit, 0, `el residuo no puede poner rojo nada:\n${salida.slice(0, 2000)}`);
  const anotadas = new Set();
  for (const linea of salida.split("\n")) {
    const marca = linea.match(/^::(?:warning|error) file=([^,]+),/);
    if (marca) anotadas.add(marca[1]);
  }
  const vistas = RESIDUOS.filter((entrada) => anotadas.has(entrada.archivo));
  assert.deepEqual(
    vistas.map((entrada) => `${entrada.id} (${entrada.nota}): ${entrada.linea}`),
    [],
    "el check EMPEZO a ver estas entradas, o sea que el residuo A16 se cerro. No es una falla: es la buena noticia. Arreglo: movelas de la clase \"residuo\" a \"aviso\" en generar.mjs y baja su fila del backlog en docs/reglas-no-escritas.md",
  );
});

// EL INVARIANTE DEL PREFILTRO, ahora derivado y no enumerado.
//
// El prefiltro decide que ARCHIVOS mira el lector. Si fuera mas angosto que el
// lector, el paso saldria exit 0 diciendo "no hay nada que pinar" sobre una linea
// que si trae un ejecutor: el peor verde posible, uno que afirma haber mirado. El
// patron se lee del YAML y se corre contra TODO el corpus, asi que la afirmacion
// vale sobre el patron que corre de verdad y sobre entradas que nadie escribio.
test("corpus generado · el prefiltro alcanza a toda entrada que el lector marca", () => {
  const prefiltro = new RegExp(patron);
  const perdidas = CORPUS.filter((entrada) => !prefiltro.test(entrada.linea));
  assert.deepEqual(
    perdidas.map((entrada) => `${entrada.id} (${entrada.nota}): ${entrada.linea}`),
    [],
    `el prefiltro /${patron}/ no selecciona estas entradas, asi que el lector nunca las ve`,
  );
});

// EL REPORTE TIENE QUE LLEGAR ENTERO, y esto se afirma sobre el TEXTO del paso
// porque en esta maquina no se puede afirmar sobre la conducta. Node no espera a
// que se vacie el stdout cuando process.exit() corta y la salida es un pipe, que
// es lo que pone Actions; en Windows el stdout de Node es sincronico y no se
// pierde nada, asi que un test de conducta daria verde aca con el codigo roto —
// exactamente lo que paso: el banco de esta maquina daba 58/58 mientras la
// corrida 32412180384 (ubuntu) perdia 1162 de 1252 anotaciones, con el corte
// medido en 90 x 739 = 66510 bytes, o sea los 64 KiB del buffer del pipe.
//
// Lo que si es conducta y si corre en las dos plataformas es el corpus rojo de
// mas abajo: sobre Linux vuelve a cazar esto solo. Este test existe para que la
// causa quede nombrada en el lugar donde alguien la volveria a introducir.
test("ejecutores · el paso reporta con process.exitCode y no con process.exit", () => {
  // Se sacan los comentarios de linea antes de mirar: el propio bloque EXPLICA
  // por que no usa process.exit(), y una asercion sobre el texto crudo se
  // dispararia con su propia explicacion.
  const codigo = programa
    .split("\n")
    .filter((linea) => !/^\s*\/\//.test(linea))
    .join("\n");
  assert.ok(
    /process\.exitCode = 1/.test(codigo),
    "el paso tiene que marcar el rojo con process.exitCode para que Node vacie el stdout antes de salir",
  );
  assert.ok(
    !/process\.exit\(/.test(codigo),
    "el paso volvio a cortar con process.exit(): con la salida en un pipe eso descarta las anotaciones que pasen el buffer, y el reporte que dice QUE arreglar se pierde",
  );
});

// La tuberia completa tiene que coincidir con el lector: aca el prefiltro corre
// de verdad (git grep, pathspec de .md, -z) y no una imitacion en proceso.
test("corpus generado · la tuberia completa coincide con el lector", () => {
  const rojo = correrPaso(ROJAS);
  assert.equal(rojo.exit, 1, `la tuberia salio ${rojo.exit} sobre el corpus rojo:\n${rojo.salida.slice(0, 4000)}`);
  assert.ok(
    !/no hay nada que pinar/.test(rojo.salida),
    "la tuberia afirmo no tener nada que pinar sobre un corpus que si trae ejecutores",
  );
  const verde = correrPaso(VERDES);
  assert.equal(
    verde.exit,
    0,
    `la tuberia salio ${verde.exit} sobre el corpus verde:\n${verde.salida.slice(0, 4000)}`,
  );
});

// El arbol de Projects tiene que quedar en verde: el paso se aplica a si mismo (su
// propio bloque NOMBRA los ejecutores para explicarlos) y un guardrail que el
// marco no puede aplicarse a si mismo no le sirve a nadie. Con el prefiltro por
// ARCHIVO este caso pesa mas que antes: ahora el lector recorre completo todo
// archivo rastreado que mencione un gestor, incluidos los del propio banco.
test("ejecutores · el arbol de Projects sigue en verde", () => {
  const { exit, salida } = correrBash(script, { cwd: RAIZ });
  assert.equal(exit, 0, `el propio arbol de Projects quedo rojo:\n${salida}`);
});
