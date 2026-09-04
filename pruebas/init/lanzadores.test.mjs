import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

// ---------------------------------------------------------------------------
// LOS DOS LANZADORES DE DOBLE CLIC.
//
// QUE CIERRAN. La invocacion documentada es
// `node <ruta-al-clon>/herramientas/projects-init.mjs`, y ese HUECO que la
// persona rellena a mano produce el peor error de todo el recorrido: una ruta
// mal escrita da un volcado de Node en ingles que NINGUNA guarda de la
// herramienta puede atajar, porque la herramienta ni llego a arrancar.
//
// POR QUE UN BANCO Y NO CONFIANZA. Estos dos archivos no los ejecuta ningun
// otro banco --uno es de macOS y el otro de Windows-- asi que un error de
// sintaxis en ellos viaja sin que nada avise. Y ya paso: la primera version del
// `.command` tenia un comentario abierto con `//` en vez de `#`, que en bash es
// un comando inexistente y aborta el archivo en la linea 6.
//
// LA REGLA QUE VIGILAN: no pueden llevar una ruta absoluta escrita a mano. Todo
// el sentido del lanzador es derivar la raiz de DONDE ESTA EL PROPIO ARCHIVO; una
// ruta fija funciona en la maquina de quien lo escribio y en ninguna otra.
//
// Y VIVE EN `pruebas/init/` A PROPOSITO: es el unico directorio que el CI corre
// en la matriz de tres sistemas. Un banco sobre lanzadores de TRES sistemas que
// solo se ejercita en uno no comprueba lo que dice comprobar. Los casos que
// necesitan `bash` se saltean solos donde no lo hay --Windows-- y los demas
// corren igual.
// ---------------------------------------------------------------------------

const LANZADORES = [
  { archivo: "arrancar.sh", sistema: "Linux", comentario: "#", tieneLogica: true },
  { archivo: "arrancar.command", sistema: "macOS", comentario: "#", tieneLogica: false },
  { archivo: "arrancar.cmd", sistema: "Windows", comentario: "REM", tieneLogica: true },
];

/** Los que llevan la logica adentro. El de macOS no: llama al de Linux. */
const CON_LOGICA = LANZADORES.filter((l) => l.tieneLogica);

test("los TRES lanzadores existen: uno por sistema, y un cero aca es este banco roto", () => {
  for (const l of LANZADORES) {
    assert.ok(fs.existsSync(path.join(RAIZ, l.archivo)), `falta ${l.archivo}, el lanzador de ${l.sistema}`);
  }
  assert.equal(LANZADORES.length, 3, "son tres sistemas: Linux, macOS y Windows. Si se agrega uno, agregalo aca");
});

test("el de macOS NO copia la logica: la llama", () => {
  // DOS COPIAS DE LO MISMO DIVERGEN, y la que se pudre es la que nadie corre.
  // Finder solo abre `.command` con doble clic, asi que ese archivo existe por la
  // extension y nada mas. Su trabajo es una linea.
  const texto = fs.readFileSync(path.join(RAIZ, "arrancar.command"), "utf8");
  const ejecutables = texto.split("\n").filter((l) => l.trim() && !l.trimStart().startsWith("#"));
  assert.ok(
    ejecutables.length <= 3,
    `arrancar.command tiene ${ejecutables.length} lineas ejecutables: parece una copia de la logica en vez de un llamador`,
  );
  assert.match(texto, /arrancar\.sh/, "arrancar.command no llama a arrancar.sh: si copiaron la logica, van a divergir");
});

test("los de shell son ejecutables: sin el bit, el doble clic abre un editor de texto", () => {
  // SE LE PREGUNTA A GIT Y NO AL SISTEMA DE ARCHIVOS, y no es un rodeo: en
  // Windows no existe el bit de ejecucion de POSIX, asi que `statSync().mode`
  // devuelve algo que no lo tiene NUNCA y este caso salia rojo en el runner de
  // Windows por una propiedad que esa maquina no puede tener.
  //
  // Y ademas es la pregunta correcta en las tres. Lo que decide si el archivo
  // llega ejecutable a la maquina de otra persona no es el permiso que tiene en
  // ESTA copia: es el modo que git guarda en el indice, 100755 o 100644, que es
  // lo unico que viaja en el clon. Un archivo con el bit puesto localmente y
  // 100644 en git llega sin permiso a todos los demas, y aca salia verde.
  const modos = Object.fromEntries(
    execFileSync("git", ["ls-files", "-s", "arrancar.sh", "arrancar.command", "arrancar.cmd"], {
      cwd: RAIZ,
      encoding: "utf-8",
    })
      .trim()
      .split("\n")
      .map((l) => {
        const m = /^(\d{6})\s+\S+\s+\d+\s+(.+)$/.exec(l);
        return m ? [m[2], m[1]] : null;
      })
      .filter(Boolean),
  );
  assert.equal(Object.keys(modos).length, 3, `git no reporto los tres lanzadores: ${JSON.stringify(modos)}`);
  for (const nombre of ["arrancar.sh", "arrancar.command"]) {
    assert.equal(modos[nombre], "100755", `${nombre} viaja en git como ${modos[nombre]}: llega sin permiso de ejecucion`);
  }
  // El de Windows NO lleva el bit, y es correcto: alla lo decide la extension, y
  // ponerselo seria ruido en el diff de cualquiera que trabaje en Unix.
  assert.equal(modos["arrancar.cmd"], "100644", "el lanzador de Windows no necesita el bit: alla manda la extension");
});

/** Si hay un `bash` que pueda parsear. En Windows normalmente no, y ese caso NO
 *  es un fallo: lo que se salta es la comprobacion de sintaxis del script de
 *  macOS, que en Windows no se ejecuta nunca. Los otros casos si corren. */
function hayBash() {
  try {
    execFileSync("bash", ["--version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

test(
  "los de shell parsean: bash -n caza los errores de sintaxis de verdad",
  { skip: hayBash() ? false : "no hay bash en esta maquina" },
  () => {
    for (const nombre of ["arrancar.sh", "arrancar.command"]) {
      execFileSync("bash", ["-n", path.join(RAIZ, nombre)], { stdio: "pipe" });
    }
  },
);

// LO QUE `bash -n` NO CAZA, y por eso hay un detector aparte abajo.
//
// MEDIDO, no supuesto: un archivo con `// esto no es comentario` pasa
// `bash -n` con EXIT=0. Para el parser, `//` es el NOMBRE de un comando y el
// resto son sus argumentos: sintaxis perfectamente valida. El error aparece
// recien al EJECUTAR, con «command not found», y para entonces el archivo ya
// corrio a medias.
//
// Es exactamente el defecto que tuvo la primera version de `arrancar.command`, y
// un banco que se apoyara solo en `bash -n` habria salido verde sobre el.
test(
  "MUERDE: bash -n NO caza el // , asi que apoyarse solo en el no protege",
  { skip: hayBash() ? false : "no hay bash en esta maquina" },
  () => {
    const roto = path.join(RAIZ, "pruebas/.lanzador-roto-temporal.sh");
    fs.writeFileSync(roto, "#!/usr/bin/env bash\n// esto no es un comentario en bash\necho ok\n");
    try {
      execFileSync("bash", ["-n", roto], { stdio: "pipe" });
    } catch {
      assert.fail("bash -n empezo a cazar el // : si es asi, este detector aparte ya no hace falta y hay que sacarlo");
    } finally {
      fs.rmSync(roto, { force: true });
    }
  },
);

test("ninguna linea de un script de shell abre un comentario con // : bash lo lee como un comando", () => {
  const malas = [];
  for (const l of LANZADORES.filter((x) => x.comentario === "#")) {
    fs.readFileSync(path.join(RAIZ, l.archivo), "utf8")
      .split("\n")
      .forEach((linea, i) => {
        if (/^\s*\/\//.test(linea)) malas.push(`${l.archivo}:${i + 1}  ${linea.trim()}`);
      });
  }
  assert.deepEqual(
    malas,
    [],
    "En bash el comentario es `#`. Una linea que abre con `//` es un comando inexistente:\n" +
      "pasa `bash -n` sin una queja y revienta al ejecutarse.\n\n" +
      malas.join("\n"),
  );
});

test("ninguno lleva una ruta absoluta escrita a mano: eso funciona en una sola maquina", () => {
  for (const l of LANZADORES) {
    const texto = fs.readFileSync(path.join(RAIZ, l.archivo), "utf8");
    const absolutas = texto
      .split("\n")
      .filter((linea) => !linea.trimStart().startsWith(l.comentario))
      .filter((linea) => /(^|[\s"'])\/(Users|home)\//.test(linea) || /[A-Z]:\\\\/.test(linea));
    assert.deepEqual(absolutas, [], `${l.archivo} lleva una ruta absoluta:\n${absolutas.join("\n")}`);
  }
});

test("los que llevan logica corren el comprobador ANTES del asistente: preguntar sin Node instalado no lleva a ningun lado", () => {
  for (const l of CON_LOGICA) {
    // SIN LOS COMENTARIOS, y no es un detalle: la cabecera de `arrancar.sh`
    // NOMBRA `projects-init.mjs` para explicar que defecto cierra. Comparar
    // posiciones sobre el texto crudo hacia que esta prueba fallara sobre un
    // archivo correcto --y la primera version fallo exactamente asi--.
    const ejecutable = fs
      .readFileSync(path.join(RAIZ, l.archivo), "utf8")
      .split("\n")
      .filter((linea) => !linea.trimStart().startsWith(l.comentario))
      .join("\n");
    const doctor = ejecutable.indexOf("projects-doctor.mjs");
    const init = ejecutable.indexOf("projects-init.mjs");
    assert.ok(doctor > -1, `${l.archivo} no corre el comprobador`);
    assert.ok(init > -1, `${l.archivo} no corre el asistente`);
    assert.ok(doctor < init, `${l.archivo} corre el asistente antes que el comprobador`);
  }
});

test("los que llevan logica dicen de donde se baja Node si falta: es lo unico que no pueden comprobar por su cuenta", () => {
  for (const l of CON_LOGICA) {
    const texto = fs.readFileSync(path.join(RAIZ, l.archivo), "utf8");
    assert.match(texto, /nodejs\.org/, `${l.archivo} detecta que falta Node y no dice de donde se saca`);
  }
});

test("los que llevan logica dejan la ventana abierta al final: si se cierra sola, el mensaje no se lee", () => {
  const sh = fs.readFileSync(path.join(RAIZ, "arrancar.sh"), "utf8");
  assert.match(sh, /read -r -p/, "arrancar.sh se cierra sin que nadie alcance a leer el motivo");
  const win = fs.readFileSync(path.join(RAIZ, "arrancar.cmd"), "utf8");
  assert.match(win, /\bpause\b/, "arrancar.cmd se cierra sin que nadie alcance a leer el motivo");
});

// ---------------------------------------------------------------------------
// Y AHORA SE CORREN DE VERDAD.
//
// Todo lo de arriba LEE los lanzadores. Leerlos caza un `//` en un archivo de
// bash, que es el defecto que ya paso, pero no caza nada de lo que solo se ve
// ejecutando: un `%~dp0` mal cerrado, un `if errorlevel` que compara al reves,
// un parentesis sin escapar en un `echo` de cmd. El lanzador de Windows en
// particular NUNCA se habia ejecutado en Windows --ni una vez, ni en el CI ni a
// mano-- y es el archivo que mas gente va a abrir con doble clic.
//
// CADA SISTEMA CORRE EL SUYO, y este archivo vive en `pruebas/init/`, que es el
// unico directorio que el CI corre en la matriz de los tres. Asi
// `arrancar.cmd` se ejecuta en windows-latest, `arrancar.command` en
// macos-latest y `arrancar.sh` en ubuntu-latest, cada uno en el sistema para el
// que existe.
//
// SE CORRE SOBRE UNA COPIA, no sobre el clon. El lanzador hace `cd` a su propia
// carpeta y el asistente escribe `valores.json` ahi: correrlo sobre el clon real
// seria un banco que ensucia el arbol que esta probando. La copia lleva los
// lanzadores y `herramientas/`, que es todo lo que estos dos pasos tocan.
//
// LA ENTRADA SE CIERRA. Los dos lanzadores tienen pausas ("Apreta Enter") y el
// asistente EXIGE una terminal. Con la entrada cerrada, las pausas pasan de
// largo y el asistente aborta con su mensaje: eso no es una limitacion del
// banco, es el camino que hay que comprobar --que el lanzador propague ese
// corte en vez de colgarse o mentir--.
// ---------------------------------------------------------------------------

/** Una copia del clon con lo justo para que el lanzador corra. */
function clonDeMentira() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "lanzador-"));
  for (const l of LANZADORES) {
    const destino = path.join(dir, l.archivo);
    fs.copyFileSync(path.join(RAIZ, l.archivo), destino);
    fs.chmodSync(destino, 0o755);
  }
  fs.cpSync(path.join(RAIZ, "herramientas"), path.join(dir, "herramientas"), { recursive: true });
  return dir;
}

/** El lanzador que le toca a ESTE sistema. Es el punto del banco: cada pata de
 *  la matriz ejercita el archivo que su gente va a abrir. */
const MIO = process.platform === "win32" ? "arrancar.cmd" : process.platform === "darwin" ? "arrancar.command" : "arrancar.sh";

test(`el lanzador de este sistema (${MIO}) CORRE, y no solo se lee`, () => {
  const dir = clonDeMentira();
  const ruta = path.join(dir, MIO);
  let salida = "";
  let codigo = 0;
  try {
    salida = execFileSync(process.platform === "win32" ? "cmd" : "bash", process.platform === "win32" ? ["/c", ruta] : [ruta], {
      encoding: "utf8",
      // La entrada cerrada es parte del caso: ver el comentario de arriba.
      stdio: ["ignore", "pipe", "pipe"],
      // Si se cuelga esperando una tecla, el banco tiene que fallar y no quedarse.
      timeout: 120_000,
      // SE LO CORRE DESDE OTRO LADO A PROPOSITO, y esto lo enseño una mutacion.
      // Con `cwd` puesto en la carpeta del lanzador, un lanzador que derive su
      // raiz de `pwd` en vez de derivarla DE SI MISMO pasa igual, porque los dos
      // valores coinciden. Y esa es la unica cosa que el lanzador existe para
      // hacer: Finder abre la terminal en el HOME, no en la carpeta del archivo,
      // y el Explorador de Windows hace lo mismo. Correrlo desde su propia
      // carpeta es probarlo en la unica condicion que nunca se da.
      cwd: os.tmpdir(),
    });
  } catch (e) {
    codigo = e.status ?? -1;
    salida = `${e.stdout ?? ""}${e.stderr ?? ""}`;
    assert.notEqual(e.signal, "SIGTERM", `${MIO} se colgo esperando una tecla con la entrada cerrada`);
  }

  // Lo que tiene que haber pasado, en orden. Si el archivo tuviera un error de
  // sintaxis, ninguna de estas lineas estaria: es lo que hace que este caso
  // valga por los tres.
  assert.match(salida, /Marco de proyectos/, `${MIO} no llego a imprimir su encabezado:\n${salida}`);
  assert.match(salida, /Paso 0/, `${MIO} no llego al comprobador de requisitos:\n${salida}`);
  assert.match(salida, /Esto es lo que necesita el marco/, `${MIO} no ejecuto el comprobador:\n${salida}`);

  // Y de ahi se abre en dos, las dos correctas. En una maquina con todo puesto y
  // la sesion de GitHub abierta llega al Paso 1; en un runner sin sesion, el
  // comprobador corta y el lanzador tiene que DECIRLO en vez de seguir de largo.
  const llegoAlPaso1 = /Paso 1/.test(salida);
  const cortoEnPaso0 = /Arriba dice exactamente que falta/.test(salida);
  assert.ok(llegoAlPaso1 || cortoEnPaso0, `${MIO} ni llego al paso 1 ni dijo por que se corto en el paso 0:\n${salida}`);

  // EL CODIGO Y EL MENSAJE TIENEN QUE DECIR LO MISMO, y esa es la comprobacion,
  // no el numero. Una version anterior de este caso exigia que el codigo fuera 0
  // o 1, y salio rojo con un lanzador que funcionaba PERFECTO: el asistente sin
  // terminal sale 2 --su codigo de uso-- y el lanzador lo propaga tal cual, que
  // es justamente lo que tiene que hacer. Fijar la lista de codigos aca la
  // duplicaba, y la copia de aca se pudria sola.
  //
  // Lo que si vale en los tres sistemas y con cualquier codigo: el lanzador NUNCA
  // termina en silencio, y lo que dice concuerda con como salio. Un archivo con
  // la sintaxis rota tampoco sale 0, pero no imprime ninguno de estos cierres.
  if (llegoAlPaso1) {
    assert.match(
      salida,
      codigo === 0 ? /Listo el paso 1/ : /Se corto en el paso 1/,
      `${MIO} salio con ${codigo} y su mensaje de cierre no concuerda:\n${salida}`,
    );
  }
  assert.notEqual(codigo, null, `${MIO} no devolvio codigo de salida`);

  // Y no escribio nada que no le corresponda: el asistente aborta sin terminal,
  // asi que valores.json NO tiene que existir. Si existiera, este banco habria
  // estado escribiendo en el clon real todo este tiempo.
  assert.ok(!fs.existsSync(path.join(dir, "valores.json")), "el asistente escribio valores.json sin una terminal");
  fs.rmSync(dir, { recursive: true, force: true });
});

test("MUERDE: un lanzador con la sintaxis rota se caza al correrlo", () => {
  // Sin este caso, el de arriba podria estar pasando por una coincidencia de
  // textos. Se rompe el archivo a proposito y se exige que el encabezado NO
  // aparezca: es lo que separa "corri el lanzador" de "lei un archivo".
  const dir = clonDeMentira();
  const ruta = path.join(dir, MIO);
  const roto =
    process.platform === "win32"
      ? "@echo off\r\nif errorlevel ( echo nunca\r\n" // parentesis sin cerrar
      : "set -e\nif [ 1 ; then echo nunca; fi\n"; // corchete sin cerrar
  fs.writeFileSync(ruta, roto);
  let salida = "";
  try {
    salida = execFileSync(process.platform === "win32" ? "cmd" : "bash", process.platform === "win32" ? ["/c", ruta] : [ruta], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 30_000,
      cwd: os.tmpdir(),
    });
  } catch (e) {
    salida = `${e.stdout ?? ""}${e.stderr ?? ""}`;
  }
  assert.ok(
    !/Marco de proyectos/.test(salida),
    "un lanzador roto igual imprimio el encabezado: el caso de arriba no lo esta ejecutando",
  );
  fs.rmSync(dir, { recursive: true, force: true });
});
