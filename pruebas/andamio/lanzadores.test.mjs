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
// ---------------------------------------------------------------------------

const LANZADORES = [
  { archivo: "arrancar.command", sistema: "macOS", comentario: "#" },
  { archivo: "arrancar.cmd", sistema: "Windows", comentario: "REM" },
];

test("los dos lanzadores existen: un cero aca es este banco roto", () => {
  for (const l of LANZADORES) {
    assert.ok(fs.existsSync(path.join(RAIZ, l.archivo)), `falta ${l.archivo}, el lanzador de ${l.sistema}`);
  }
});

test("el de macOS es ejecutable: sin el bit, el doble clic abre un editor de texto", () => {
  const modo = fs.statSync(path.join(RAIZ, "arrancar.command")).mode;
  assert.ok(modo & 0o111, "arrancar.command no tiene permiso de ejecucion");
});

test("el de macOS parsea: bash -n caza los errores de sintaxis de verdad", () => {
  execFileSync("bash", ["-n", path.join(RAIZ, "arrancar.command")], { stdio: "pipe" });
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
test("MUERDE: bash -n NO caza el // , asi que apoyarse solo en el no protege", () => {
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

test("los dos corren el comprobador ANTES del asistente: preguntar sin Node instalado no lleva a ningun lado", () => {
  for (const l of LANZADORES) {
    // SIN LOS COMENTARIOS, y no es un detalle: la cabecera de `arrancar.command`
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

test("los dos dicen de donde se baja Node si falta: es lo unico que no pueden comprobar por su cuenta", () => {
  for (const l of LANZADORES) {
    const texto = fs.readFileSync(path.join(RAIZ, l.archivo), "utf8");
    assert.match(texto, /nodejs\.org/, `${l.archivo} detecta que falta Node y no dice de donde se saca`);
  }
});

test("los dos dejan la ventana abierta al final: si se cierra sola, el mensaje no se lee", () => {
  const mac = fs.readFileSync(path.join(RAIZ, "arrancar.command"), "utf8");
  assert.match(mac, /read -r -p/, "arrancar.command se cierra sin que nadie alcance a leer el motivo");
  const win = fs.readFileSync(path.join(RAIZ, "arrancar.cmd"), "utf8");
  assert.match(win, /\bpause\b/, "arrancar.cmd se cierra sin que nadie alcance a leer el motivo");
});
