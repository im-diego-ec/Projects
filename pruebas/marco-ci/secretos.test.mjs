// Banco del paso "Sin secretos en el repo (arbol y historia del cambio)".
//
// QUE CAPABILITY ENFORZA. `gestion-secretos`, requirement "Los secretos de
// runtime se inyectan por referencia, nunca horneados": el paso es lo unico del
// marco que lo vuelve exigible en vez de prosa, y este banco es lo unico que
// ejercita el paso. Se escribe el nombre de la capability aca a proposito —el
// censo de "que requirement tiene un check que falla solo" se hace buscando el
// nombre en los archivos ejecutables, y una capability que ningun ejecutable
// nombra figura como no enforzada aunque lo este.
//
// LIMITE DECLARADO Y NO NEGOCIADO: gitleaks no esta en esta maquina ni se baja en
// el banco, asi que aca NO corre el detector. Lo que el banco prueba son las tres
// piezas del paso que no son la herramienta, y las prueba por codigo de salida:
//
//   1. El CRUCE con las declaraciones de falso positivo. Es el programa de
//      `node -e` del propio paso, alimentado con reportes JSON sinteticos con la
//      forma que el detector emite. Ahi vive el agujero que salia en VERDE.
//   2. El rojo por PRESENCIA de los archivos de excepcion de la herramienta, que
//      ocurre ANTES de bajar el binario. Se afirma con un stub de curl que deja
//      una sena en disco: si el paso llego a la descarga, la sena esta; si corto
//      antes, no. Es existencia de archivo, no texto de log.
//   3. Que las banderas que el paso le pasa a `git log` destapen el diff de un
//      merge. Se corre git de verdad sobre un fixture con la resolucion del
//      merge; no prueba que el detector lo marque, prueba que el texto llega.
//   4. La FORMA de las dos cosas que dependen del binario y por eso quedaron
//      declaradas sin medir: el valor de --log-opts y la config
//      `[extend] useDefault = true`. La forma se puede cerrar sin la
//      herramienta, y es donde vive el modo de fallar barato —se rompe en
//      silencio, el detector arranca igual y mira menos de lo que dice—. Esos
//      dos tests miden el binario si esta en el PATH y anuncian con
//      t.diagnostic cuando no esta, en vez de saltar callados.
//
// Ninguna de las cuatro reemplaza una corrida real con el binario, y eso se dice
// aca en vez de dejarlo sobreentendido.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { execFileSync, spawnSync } from "node:child_process";
import { join } from "node:path";

import { scriptDelPaso, programaNode, logOptsDelPaso } from "./extraer.mjs";
import {
  repoDeJuguete,
  escribir,
  git,
  commit,
  correrBash,
  correrNode,
  carpetaTemporal,
  stubCurlQueFalla,
  limpiarTodo,
} from "./util.mjs";

const PASO = "Sin secretos en el repo (arbol y historia del cambio)";
const script = scriptDelPaso(PASO);
const programa = programaNode(script, PASO);

const DECLARACIONES = ".projects-falsos-positivos.json";

// El detector se pina por version en los inputs del workflow; el banco no la
// necesita salvo para armar la URL que el stub de curl intercepta.
const VERSION = "8.30.1";

test.after(limpiarTodo);

// ---------------------------------------------------------------------------
// 1. El cruce con las declaraciones
// ---------------------------------------------------------------------------

function hallazgo(archivo, regla, linea, commitSha) {
  return {
    File: archivo,
    RuleID: regla,
    StartLine: linea,
    Commit: commitSha ?? "",
    Description: "clave con forma conocida",
    // El paso NO lee estos campos a proposito. Van en el fixture igual, para
    // que el dia que alguien los empiece a leer el banco lo tenga a mano.
    Secret: "REDACTED",
    Match: "REDACTED",
  };
}

function cruzar({ arbol = [], historia = null, declaraciones = null }) {
  const raiz = carpetaTemporal("cruce-");
  const rutaArbol = join(raiz, "arbol.json");
  escribir(raiz, "arbol.json", JSON.stringify(arbol));
  let rutaHistoria = "";
  if (historia !== null) {
    escribir(raiz, "historia.json", JSON.stringify(historia));
    rutaHistoria = join(raiz, "historia.json");
  }
  if (declaraciones !== null) {
    escribir(raiz, DECLARACIONES, JSON.stringify({ secretos: declaraciones }, null, 2));
  }
  return correrNode(programa, {
    cwd: raiz,
    env: {
      ARCHIVO_DECLARACIONES: DECLARACIONES,
      REPORTE_ARBOL: rutaArbol,
      REPORTE_HISTORIA: rutaHistoria,
      HISTORIA_CORRIO: historia === null ? "false" : "true",
      GITHUB_STEP_SUMMARY: "",
    },
  });
}

const CLAVES = "api/src/pruebas/claves-de-ejemplo.ts";
const REGLA = "generic-api-key";
const DOS_FALSOS = [
  { archivo: CLAVES, regla: REGLA, motivo: "claves de ejemplo del banco de la API", hallazgos: 2 },
];

test("secretos · refutacion · una declaracion no absorbe una coincidencia nueva de la historia", () => {
  // El caso medido el 2026-08-20: arbol 2, historia 1, max(2,1) = 2 = declarado,
  // y el paso salia exit 0 diciendo "3 hallazgo(s): 0 sin declarar". La
  // coincidencia de la historia entro y se borro DENTRO del PR, o sea que no
  // esta en ninguna de las dos lineas que la declaracion cubre.
  const { exit, salida } = cruzar({
    arbol: [hallazgo(CLAVES, REGLA, 12), hallazgo(CLAVES, REGLA, 34)],
    historia: [hallazgo(CLAVES, REGLA, 88, "d395cda8ebef")],
    declaraciones: DOS_FALSOS,
  });
  assert.equal(exit, 1, `la coincidencia nueva quedo absorbida:\n${salida}`);
  assert.ok(
    !/0 sin declarar/.test(salida),
    `el resumen afirmo "0 sin declarar" sobre un hallazgo que no cruzo con nada:\n${salida}`,
  );
});

test("secretos · control · el arbol exacto sigue en verde", () => {
  const { exit, salida } = cruzar({
    arbol: [hallazgo(CLAVES, REGLA, 12), hallazgo(CLAVES, REGLA, 34)],
    historia: [],
    declaraciones: DOS_FALSOS,
  });
  assert.equal(exit, 0, salida);
});

test("secretos · control · el falso positivo que el PR vuelve a tocar no enrojece", () => {
  // La misma linea que la declaracion ya cubre en el arbol: es el mismo falso
  // positivo, y obligar a declarar un numero por plano lo habria puesto rojo.
  const { exit, salida } = cruzar({
    arbol: [hallazgo(CLAVES, REGLA, 12), hallazgo(CLAVES, REGLA, 34)],
    historia: [hallazgo(CLAVES, REGLA, 12, "aa11bb22cc33")],
    declaraciones: DOS_FALSOS,
  });
  assert.equal(exit, 0, `un falso positivo ya declarado no puede enrojecer por tocarlo:\n${salida}`);
});

test("secretos · control · el arbol con una coincidencia de mas es rojo", () => {
  const { exit, salida } = cruzar({
    arbol: [hallazgo(CLAVES, REGLA, 12), hallazgo(CLAVES, REGLA, 34)],
    historia: [],
    declaraciones: [{ archivo: CLAVES, regla: REGLA, motivo: "una sola linea revisada" }],
  });
  assert.equal(exit, 1, `el default de un hallazgo dejo pasar dos:\n${salida}`);
});

test("secretos · control · una declaracion sin hallazgo es muerta y roja", () => {
  const { exit, salida } = cruzar({ arbol: [], historia: [], declaraciones: DOS_FALSOS });
  assert.equal(exit, 1, `una declaracion que no cubre nada reparte permiso sobre la nada:\n${salida}`);
});

test("secretos · control · sin declaraciones, cualquier hallazgo es rojo", () => {
  const { exit, salida } = cruzar({ arbol: [hallazgo(CLAVES, REGLA, 12)], historia: [] });
  assert.equal(exit, 1, salida);
});

test("secretos · control · un hallazgo solo en la historia es rojo", () => {
  const { exit, salida } = cruzar({
    arbol: [],
    historia: [hallazgo("infra/dev.tfvars", "aws-access-token", 4, "0f0f0f0f0f0f")],
  });
  assert.equal(exit, 1, `el secreto que entro y se borro tiene que enrojecer:\n${salida}`);
});

test("secretos · control · una declaracion sin motivo es invalida y roja", () => {
  const { exit, salida } = cruzar({
    arbol: [hallazgo(CLAVES, REGLA, 12)],
    historia: [],
    declaraciones: [{ archivo: CLAVES, regla: REGLA }],
  });
  assert.equal(exit, 1, `una excepcion sin razon escrita no es una excepcion:\n${salida}`);
});

// ---------------------------------------------------------------------------
// 2. El rojo por presencia de los archivos de excepcion de la herramienta
// ---------------------------------------------------------------------------

function correrPasoHasta(archivos, { rastrear }) {
  const raiz = repoDeJuguete("secretos-");
  escribir(raiz, "README.md", "repo de juguete\n");
  commit(raiz, "base");
  for (const [ruta, contenido] of Object.entries(archivos)) {
    escribir(raiz, ruta, contenido);
  }
  if (rastrear) {
    git(raiz, "add", "-A");
    commit(raiz, "agrega los archivos de excepcion");
  }
  const senal = join(carpetaTemporal("senal-"), "curl-fue-invocado.txt");
  const bin = stubCurlQueFalla(senal);
  const corrida = correrBash(script, {
    cwd: raiz,
    env: {
      PATH: `${bin}${process.platform === "win32" ? ";" : ":"}${process.env.PATH}`,
      VERSION_GITLEAKS: VERSION,
      DECLARACIONES,
      BASE_PR: "",
      HEAD_PR: "",
      ANTES: "",
      GITLEAKS_CONFIG: "",
      GITLEAKS_CONFIG_TOML: "",
      GITHUB_EVENT_NAME: "pull_request",
      GITHUB_SHA: git(raiz, "rev-parse", "HEAD").trim(),
    },
  });
  return { ...corrida, intentoDescargar: existsSync(senal) };
}

const TOML_HOSTIL = "[extend]\nuseDefault = false\n";
const IGNORE_HOSTIL = "abc123:api/src/x.ts:generic-api-key:7\n";

test("secretos · control · el stub de curl esta vivo (si no, los casos de abajo pasan vacios)", () => {
  const { exit, intentoDescargar } = correrPasoHasta({}, { rastrear: false });
  assert.equal(exit, 1, "sin detector el paso es rojo a proposito");
  assert.ok(
    intentoDescargar,
    "el paso no llego a la descarga en el caso limpio: la sena no mide nada y los casos de presencia serian vacios",
  );
});

for (const [nombre, archivo, contenido] of [
  ["gitleaks.toml", ".gitleaks.toml", TOML_HOSTIL],
  ["gitleaksignore", ".gitleaksignore", IGNORE_HOSTIL],
]) {
  test(`secretos · refutacion · ${nombre} SIN RASTREAR corta antes de bajar el detector`, () => {
    const { exit, intentoDescargar, salida } = correrPasoHasta(
      { [archivo]: contenido },
      { rastrear: false },
    );
    assert.equal(exit, 1, `${archivo} sin rastrear tiene que ser rojo:\n${salida}`);
    assert.ok(
      !intentoDescargar,
      `el paso siguio hasta la descarga con ${archivo} en el disco: el rojo se decidia por el indice y no por el disco`,
    );
  });

  test(`secretos · control · ${nombre} versionado sigue siendo rojo`, () => {
    const { exit, intentoDescargar, salida } = correrPasoHasta(
      { [archivo]: contenido },
      { rastrear: true },
    );
    assert.equal(exit, 1, `${archivo} versionado tiene que ser rojo:\n${salida}`);
    assert.ok(!intentoDescargar, `${archivo} versionado tiene que cortar antes del binario`);
  });
}

test("secretos · el paso escribe su propia config y la pasa a los DOS planos", () => {
  // La precedencia documentada de la herramienta es
  //   --config > GITLEAKS_CONFIG > GITLEAKS_CONFIG_TOML > <destino>/.gitleaks.toml
  // asi que sin --config el archivo del destino seguia decidiendo las reglas.
  // La existencia y el contenido de la config se afirman corriendo el paso; que
  // las DOS invocaciones la reciban es una asercion sobre el texto del paso, y
  // se declara como tal: sin el binario no hay forma de medirlo por exit code.
  const { runnerTemp } = correrPasoHasta({}, { rastrear: false });
  const config = join(runnerTemp, "gitleaks-marco.toml");
  assert.ok(existsSync(config), "el paso no escribio su config antes de usar el detector");
  assert.match(readFileSync(config, "utf8"), /useDefault = true/);
  const invocaciones = script.match(/--config "\$\{CONFIG\}"/g) ?? [];
  assert.equal(
    invocaciones.length,
    2,
    "los dos planos tienen que recibir la config del marco: si uno no la recibe, ahi vuelve a decidir el .gitleaks.toml del destino",
  );
});

// ---------------------------------------------------------------------------
// 3. Las banderas de git log y el diff de un merge
// ---------------------------------------------------------------------------

/**
 * Fixture del flujo diario del marco: traer main a la rama de trabajo, meter el
 * secreto EN LA RESOLUCION del merge y borrarlo en el commit siguiente.
 *
 * La marca se arma por concatenacion a proposito: escrita entera, este archivo
 * quedaria con una clave con forma de credencial y el propio detector del marco
 * lo marcaria. El banco no puede pedir una excepcion para existir.
 */
function repoConSecretoEnUnMerge() {
  const marca = `${"AKIA"}${"IOSFODNN7EXAMPLE"}`;
  const raiz = repoDeJuguete("merge-");
  escribir(raiz, "config/app.env", "PLACEHOLDER=1\n");
  const base = commit(raiz, "base");

  git(raiz, "checkout", "--quiet", "-b", "trabajo");
  escribir(raiz, "config/app.env", "PLACEHOLDER=2\n");
  commit(raiz, "trabajo cambia el archivo");

  git(raiz, "checkout", "--quiet", "main");
  escribir(raiz, "config/app.env", "PLACEHOLDER=3\n");
  commit(raiz, "main cambia el mismo archivo");

  git(raiz, "checkout", "--quiet", "trabajo");
  // Choca a proposito: sin conflicto no hay resolucion, y sin resolucion no hay
  // contenido que viva SOLO en el commit de merge.
  spawnSync("git", ["-C", raiz, "merge", "--no-edit", "main"], { encoding: "utf8" });
  escribir(raiz, "config/app.env", `PLACEHOLDER=3\nAWS_ACCESS_KEY_ID=${marca}\n`);
  commit(raiz, "resuelve el merge");

  escribir(raiz, "config/app.env", "PLACEHOLDER=3\n");
  const cabeza = commit(raiz, "saca la credencial");

  return { raiz, base, cabeza, marca };
}

/**
 * Cuantas veces la marca aparece como linea AGREGADA. Solo las agregadas: el
 * detector lee lo que un commit INTRODUCE, asi que contar la linea de borrado
 * (el "-" del commit que saca la credencial) daria un verde falso — y de hecho
 * lo dio la primera vez que se escribio este banco.
 */
function agregadasConLaMarca(raiz, opts, marca) {
  const salida = execFileSync("git", ["-C", raiz, "log", "-p", ...opts], {
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
  });
  return salida.split(/\r?\n/).filter((l) => l.startsWith("+") && l.includes(marca)).length;
}

test("secretos · el fixture del merge de verdad esconde el secreto de git log -p", () => {
  // Control indispensable: si el fixture no reprodujera la supresion, el caso de
  // abajo pasaria sin probar nada.
  const { raiz, base, cabeza, marca } = repoConSecretoEnUnMerge();
  assert.equal(
    agregadasConLaMarca(raiz, [`${base}..${cabeza}`], marca),
    0,
    "el fixture no reproduce la supresion de los diffs de merge: el caso de abajo no probaria nada",
  );
});

test("secretos · refutacion · las banderas del paso destapan el diff del merge", () => {
  const { raiz, base, cabeza, marca } = repoConSecretoEnUnMerge();
  const opts = logOptsDelPaso(script, base, cabeza);
  assert.ok(
    agregadasConLaMarca(raiz, opts, marca) > 0,
    `con las banderas del paso (${opts.join(" ")}) el secreto de la resolucion del merge sigue invisible: el plano de la historia imprimiria "(arbol + historia del cambio)" sin haber mirado ahi`,
  );
});

test("secretos · control · las banderas del paso no esconden una rama lateral", () => {
  // El arreglo del caso del merge se puede escribir mal de una forma concreta y
  // silenciosa: --first-parent (en vez de --diff-merges=first-parent) recorta la
  // TRAVESIA y deja fuera los commits que entraron por una rama lateral. Ese
  // cambio destaparia el merge y taparia el caso que ya funcionaba. Este control
  // lo fija por codigo de salida.
  const marca = `${"AKIA"}${"IOSFODNN7EXAMPLE"}`;
  const raiz = repoDeJuguete("lateral-");
  escribir(raiz, "config/app.env", "PLACEHOLDER=1\n");
  const base = commit(raiz, "base");

  git(raiz, "checkout", "--quiet", "-b", "lateral");
  escribir(raiz, "config/app.env", `PLACEHOLDER=1\nAWS_ACCESS_KEY_ID=${marca}\n`);
  commit(raiz, "la credencial entra en una rama lateral");
  escribir(raiz, "config/app.env", "PLACEHOLDER=1\n");
  commit(raiz, "y se borra en el commit siguiente");

  git(raiz, "checkout", "--quiet", "main");
  git(raiz, "merge", "--no-edit", "--no-ff", "--no-gpg-sign", "lateral");
  const cabeza = git(raiz, "rev-parse", "HEAD").trim();

  const opts = logOptsDelPaso(script, base, cabeza);
  assert.ok(
    agregadasConLaMarca(raiz, opts, marca) > 0,
    `con las banderas del paso (${opts.join(" ")}) el secreto que entro por una rama lateral y se borro despues quedo invisible`,
  );
});

// ---------------------------------------------------------------------------
// 4. Lo que quedo NO MEDIDO por falta del binario, fijado por su FORMA
// ---------------------------------------------------------------------------
//
// La ronda anterior declaro dos cosas sin medir, y las dos dependen de que el
// binario del detector acepte lo que el paso le pasa:
//
//   · que gitleaks acepte --log-opts y le reenvie a git el
//     --diff-merges=first-parent (lo medido fue que GIT lo respeta);
//   · que gitleaks acepte "[extend] useDefault = true" y con eso cargue sus
//     reglas por defecto (la mitad de A12).
//
// gitleaks no esta en esta maquina y el banco no baja binarios, asi que las dos
// SIGUEN sin medir contra la herramienta y el nombre de cada test lo dice. Lo que
// si se puede cerrar sin el binario es la FORMA del argumento, que es donde vive
// el modo de fallar barato: la forma se rompe en silencio (el detector arranca,
// no protesta y mira menos de lo que dice) y el rojo aparece meses despues, si
// aparece. Estos tests la fijan por codigo de salida donde se puede medir con
// git, y por comparacion byte a byte donde el archivo lo escribe el propio paso.
//
// Y si el dia que alguien corra el banco en una maquina CON gitleaks, los dos
// tests dejan de conformarse con la forma y miden el binario. La ausencia se
// anuncia con t.diagnostic: un salto silencioso seria el fail-open del 2026-08-05
// otra vez, y este banco existe para no repetirlo.

/** La ruta del binario si esta en el PATH, o null. Sin bajar nada. */
function gitleaksDisponible() {
  const cual = spawnSync(process.platform === "win32" ? "where" : "which", ["gitleaks"], {
    encoding: "utf8",
  });
  if (cual.status !== 0) return null;
  const ruta = String(cual.stdout ?? "").split(/\r?\n/).find(Boolean);
  return ruta ? ruta.trim() : null;
}

test("secretos · forma del --log-opts (que el BINARIO lo acepte no se midio: gitleaks ausente)", (t) => {
  // gitleaks recibe --log-opts como UN solo argv y adentro lo parte por
  // espacios para armarle la linea a git. De ahi salen las dos formas de
  // romperlo sin que nada proteste:
  //
  //   · sin comillas en el paso, el shell parte primero y el detector recibe
  //     solo "--diff-merges=first-parent": el rango A..H se le va como
  //     argumento posicional y el barrido cambia de alcance sin avisar;
  //   · con dos espacios seguidos, el split naive del detector produce un
  //     token vacio, y un argumento vacio para git log no es lo mismo que
  //     ninguno.
  //
  // Las dos se fijan sobre el TEXTO del paso, que es donde se escriben. Se
  // mira solo lo EJECUTABLE del paso: este workflow comenta mucho a proposito,
  // y contar las menciones en prosa haria que agregar un comentario que nombra
  // la bandera pusiera rojo un test que no habla de eso.
  const ejecutable = script
    .split("\n")
    .filter((linea) => !/^[ \t]*#/.test(linea))
    .join("\n");
  const ocurrencias = ejecutable.match(/--log-opts/g) ?? [];
  assert.equal(ocurrencias.length, 1, "el paso tiene que pasar --log-opts exactamente una vez");
  assert.match(
    ejecutable,
    /--log-opts="[^"]+"/,
    "el valor de --log-opts tiene que viajar como UN solo argumento (entre comillas dobles): sin comillas el shell lo parte antes que el detector y el rango se le va como posicional",
  );

  const crudo = ejecutable.match(/--log-opts="([^"]+)"/)[1];
  assert.ok(!/\t/.test(crudo), "un tabulador dentro del valor no lo parte el split por espacios del detector");
  assert.ok(!/ {2}/.test(crudo), "dos espacios seguidos le dan al detector un token vacio");
  assert.ok(!/['\x60]/.test(crudo), "el valor no puede traer comillas: el detector no las desarma, se las pasa a git como parte del token");
  assert.deepEqual(
    crudo.split(" ").filter((t) => t.startsWith("--")),
    ["--diff-merges=first-parent"],
    "la unica bandera del valor tiene que ser --diff-merges=first-parent, escrita con = y en un token propio: partida en dos tokens el split del detector le da a git una bandera sin su valor",
  );

  // Y que la lista de tokens sea una linea de git log VALIDA se mide con git,
  // que si esta. Es la mitad que ya estaba medida, aca con exit code y sobre el
  // mismo fixture del merge.
  const { raiz, base, cabeza } = repoConSecretoEnUnMerge();
  const opts = logOptsDelPaso(script, base, cabeza);
  const corrida = spawnSync("git", ["-C", raiz, "log", "-p", ...opts], { encoding: "utf8" });
  assert.equal(
    corrida.status,
    0,
    `git rechazo la linea que el paso le manda al detector (${opts.join(" ")}):\n${corrida.stderr}`,
  );

  const binario = gitleaksDisponible();
  if (!binario) {
    t.diagnostic(
      "NO MEDIDO: gitleaks no esta en el PATH de esta maquina, asi que que la herramienta ACEPTE --log-opts y le reenvie el --diff-merges=first-parent a git sigue sin medir. Lo medido aca es la forma del argumento y que git la acepta.",
    );
    return;
  }
  // Con el binario presente esto deja de ser forma y pasa a ser medicion: el
  // detector tiene que salir 0 (limpio) o 2 (hallazgos), nunca un error de
  // parseo de la bandera.
  const conBinario = spawnSync(
    binario,
    ["git", ".", `--log-opts=${opts.join(" ")}`, "--no-banner", "--no-color", "--exit-code", "2"],
    { cwd: raiz, encoding: "utf8" },
  );
  assert.ok(
    conBinario.status === 0 || conBinario.status === 2,
    `el detector no acepto --log-opts="${opts.join(" ")}" (rc=${conBinario.status}):\n${conBinario.stdout}${conBinario.stderr}`,
  );
});

test("secretos · forma de la config [extend] (que el BINARIO la acepte no se midio: gitleaks ausente)", (t) => {
  // El archivo lo escribe el paso, asi que se compara byte a byte con la unica
  // forma que documenta la herramienta. La clave es camelCase y el valor es un
  // booleano DESNUDO: "usedefault", "use_default" o "true" entre comillas no
  // son la misma cosa, y el modo de fallar es el barato de todos —el detector
  // arranca igual, sin las reglas por defecto, y un barrido sin reglas sale
  // exit 0 sobre cualquier repo—. Ese verde es indistinguible de un repo
  // limpio, que es exactamente la clase de fail-open que este paso existe para
  // no tener.
  const { runnerTemp } = correrPasoHasta({}, { rastrear: false });
  const config = join(runnerTemp, "gitleaks-marco.toml");
  assert.ok(existsSync(config), "el paso no escribio su config antes de usar el detector");
  assert.deepEqual(
    readFileSync(config, "utf8").split(/\r?\n/).filter(Boolean),
    ["[extend]", "useDefault = true"],
    "la config del marco tiene que ser exactamente la tabla [extend] con useDefault = true, sin nada mas: cualquier otra grafia la ignora el detector en silencio y se queda sin reglas por defecto",
  );

  const binario = gitleaksDisponible();
  if (!binario) {
    t.diagnostic(
      "NO MEDIDO: gitleaks no esta en el PATH de esta maquina, asi que que la herramienta ACEPTE [extend] useDefault = true y cargue con eso sus reglas por defecto sigue sin medir. Lo medido aca es la forma del archivo que el paso escribe.",
    );
    return;
  }
  // Con el binario presente se mide lo unico que importa de useDefault = true:
  // que las reglas por defecto QUEDEN cargadas. Se le da un secreto de ejemplo
  // y se exige el 2: si la config no cargara reglas, el barrido saldria 0 y
  // este assert lo cazaria.
  const marca = `${"AKIA"}${"IOSFODNN7EXAMPLE"}`;
  const suelo = carpetaTemporal("config-real-");
  writeFileSync(join(suelo, "app.env"), `AWS_ACCESS_KEY_ID=${marca}\n`);
  const corrida = spawnSync(
    binario,
    ["dir", ".", "--config", config, "--no-banner", "--no-color", "--redact", "--exit-code", "2"],
    { cwd: suelo, encoding: "utf8" },
  );
  assert.equal(
    corrida.status,
    2,
    `con la config del marco el detector no marco un secreto de ejemplo (rc=${corrida.status}): useDefault = true no dejo cargadas las reglas por defecto\n${corrida.stdout}${corrida.stderr}`,
  );
});
