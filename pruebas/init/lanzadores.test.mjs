import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
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
  for (const nombre of ["arrancar.sh", "arrancar.command"]) {
    const modo = fs.statSync(path.join(RAIZ, nombre)).mode;
    assert.ok(modo & 0o111, `${nombre} no tiene permiso de ejecucion`);
  }
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

test("los de shell parsean: bash -n caza los errores de sintaxis de verdad", { skip: hayBash() ? false : "no hay bash en esta maquina" }, () => {
  for (const nombre of ["arrancar.sh", "arrancar.command"]) {
    execFileSync("bash", ["-n", path.join(RAIZ, nombre)], { stdio: "pipe" });
  }
});

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
test("MUERDE: bash -n NO caza el // , asi que apoyarse solo en el no protege", { skip: hayBash() ? false : "no hay bash en esta maquina" }, () => {
  const roto = path.join(RAIZ, "pruebas/.lanzador-roto-temporal.sh");
  fs.writeFileSync(roto, "#!/usr/bin/env bash\n// esto no es un comentario en bash\necho ok\n");
  try {
    execFileSync("bash", ["-n", roto], { stdio: "pipe" });
  } catch {
    assert.fail("bash -n empezo a cazar el // : si es asi, este detector aparte ya no hace falta y hay que sacarlo");
  } finally {
    fs.rmSync(roto, { force: true });
  }
});

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
