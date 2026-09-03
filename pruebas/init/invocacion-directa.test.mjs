import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { invocadoDirecto } from "../../herramientas/projects-init.mjs";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

// ---------------------------------------------------------------------------
// «ME INVOCARON A MI?», Y EL DEFECTO QUE YA MORDIO DOS VECES.
//
// EL IDIOMA INGENUO --`import.meta.url === \`file://${process.argv[1]}\``--
// falla en dos situaciones y en las dos de la PEOR forma posible: el proceso
// sale 0 SIN IMPRIMIR NADA. Un exito silencioso, en herramientas cuyo encabezado
// declara que nunca omiten en silencio.
//
//   - EN macOS, con enlaces simbolicos: `import.meta.url` viene resuelto y
//     `argv[1]` no. `/tmp` es un enlace a `/private/tmp`.
//   - EN WINDOWS, SIEMPRE: `argv[1]` es `D:\a\x.mjs` y `import.meta.url` es
//     `file:///D:/a/x.mjs`. La concatenacion nunca calza.
//
// LA SEGUNDA VEZ FUE POR COPIAR EL IDIOMA a dos herramientas nuevas
// --projects-doctor y projects-puerta-- y lo cazo el job de windows-latest del
// CI, no una revision. Este banco existe para que no haya una tercera.
//
// Y VIVE EN `pruebas/init/` A PROPOSITO: ese es el unico directorio que el CI
// corre en la matriz de tres sistemas. Nacio en `pruebas/andamio/`, que solo
// corre en Linux --o sea, el banco que vigila un defecto de WINDOWS no corria en
// Windows--. La ironia la encontro medir la cobertura, no leerla.
// ---------------------------------------------------------------------------

/** Los .mjs de herramientas/ que se pueden correr como comando. */
function herramientasEjecutables() {
  return fs
    .readdirSync(path.join(RAIZ, "herramientas"))
    .filter((f) => f.endsWith(".mjs"))
    .map((f) => path.join("herramientas", f));
}

test("hay herramientas que revisar: un cero aca es este banco roto", () => {
  assert.ok(herramientasEjecutables().length >= 4, "se encontraron menos de cuatro herramientas");
});

test("ninguna herramienta usa el idioma ingenuo, que sale 0 en silencio en Windows", () => {
  const malas = [];
  for (const rel of herramientasEjecutables()) {
    fs.readFileSync(path.join(RAIZ, rel), "utf8")
      .split("\n")
      .forEach((linea, i) => {
        if (/import\.meta\.url\s*===\s*`file:\/\/\$\{/.test(linea)) malas.push(`${rel}:${i + 1}`);
      });
  }
  assert.deepEqual(
    malas,
    [],
    "Estas lineas comparan `import.meta.url` con `argv[1]` concatenando.\n" +
      "En Windows eso NUNCA calza y la herramienta sale 0 sin imprimir nada.\n" +
      "Se usa `invocadoDirecto(import.meta.url)`, que resuelve por realpath en los dos lados.\n\n  " +
      malas.join("\n  "),
  );
});

test("invocadoDirecto distingue el modulo invocado de cualquier otro", () => {
  // OJO CON LA PREMISA, que la primera version de este caso tuvo mal: cuando
  // `node --test` corre UN SOLO archivo, `argv[1]` ES ese archivo, asi que
  // `invocadoDirecto(import.meta.url)` da true desde aca. No se puede usar este
  // banco como el caso negativo. Se usa OTRO archivo, que nunca es argv[1].
  const otro = pathToFileURL(path.join(RAIZ, "herramientas/projects-doctor.mjs")).href;
  assert.equal(invocadoDirecto(otro), false, "un modulo que NO es el invocado tiene que dar false");
  assert.equal(invocadoDirecto("file:///no/existe/x.mjs"), false, "una ruta inexistente no puede reventar");
});

test("MUERDE: el detector caza el idioma ingenuo", () => {
  const linea = "if (import.meta.url === `file://${process.argv[1]}`) process.exit(main());";
  assert.ok(/import\.meta\.url\s*===\s*`file:\/\/\$\{/.test(linea), "el detector no caza el idioma que dice cazar");
});

test("una herramienta nueva CORRE de verdad cuando se la invoca", () => {
  // Sin esto, el banco de arriba pasaria sobre una herramienta que no imprime
  // nada por otro motivo. Se corre y se exige salida.
  //
  // SE LEE LA SALIDA PASE LO QUE PASE CON EL CODIGO, y no es indulgencia: en un
  // runner de CI no hay sesion de GitHub, asi que el comprobador sale 1 --que es
  // exactamente lo que tiene que hacer--. Lo que este caso mide es que main()
  // CORRIO, no que el veredicto sea verde. Confundir las dos cosas hacia fallar
  // este banco sobre una herramienta que funcionaba bien.
  let salida = "";
  try {
    salida = execFileSync("node", [path.join(RAIZ, "herramientas/projects-doctor.mjs")], {
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (e) {
    salida = `${e.stdout ?? ""}${e.stderr ?? ""}`;
  }
  assert.match(salida, /necesita el marco/, "projects-doctor no imprimio su informe: no corrio main()");
});
