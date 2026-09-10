import test, { after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

import { pinDelMarcoEnDestino } from "../../herramientas/projects-init.mjs";

// ---------------------------------------------------------------------------
// LA FILA DEL REGISTRO DE CONSUMIDORES SALE RESUELTA DEL ARRANQUE.
//
// QUE DEFECTO CIERRA. `docs/14-consumidores.md` es una tabla con "(sin filas)", y
// el propio archivo explicaba por que: el lugar donde se escribe la linea existia,
// pero lo que la escribe no. La fila dependia de que alguien se acordara, que por
// la premisa de AGENTS.md no cuenta como enforcement.
//
// POR QUE URGE Y NO ES COSMETICO. El dato es PERECEDERO: adoptar el marco es el
// unico instante en que se sabe con certeza que un repo lo consume. Pasado ese
// instante solo se puede reconstruir --con una credencial de organizacion-- o
// inventar, y una fila inventada no se distingue de una medida.
//
// LA GUARDA QUE DE VERDAD IMPORTA es la cuarta: que la version que la herramienta
// informa sea EXACTAMENTE la que quedo en el ci.yml del destino. Sin ese cruce,
// este banco podria pasar en verde con una constante desincronizada, que es
// justo el defecto que la decision de design existe para evitar.
// ---------------------------------------------------------------------------

// `fileURLToPath` y no `.pathname`: `.pathname` devuelve la ruta PERCENT-ENCODED,
// asi que un clon en una carpeta con espacio --"No Coders", "Mis Documentos"--
// produce una ruta con %20 que no existe, y el banco mediria sobre la nada.
const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const HERRAMIENTA = path.join(RAIZ, "herramientas", "projects-init.mjs");

const temporales = [];
function carpetaTemporal(prefijo) {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), prefijo));
  temporales.push(d);
  return d;
}
after(() => {
  for (const d of temporales) fs.rmSync(d, { recursive: true, force: true });
});

/** Corre la herramienta de punta a punta y devuelve la salida REAL y el destino.
 *
 *  Se mide sobre la salida y sobre el arbol escrito, no sobre el codigo fuente:
 *  una prueba que leyera el `console.log` del archivo estaria midiendo un
 *  sustituto de la pieza y quedaria verde el dia que la linea deje de imprimirse. */
function arrancarUnProyecto() {
  const base = carpetaTemporal("consumidor-");
  const destino = path.join(base, "destino");
  fs.mkdirSync(destino);
  const valores = path.join(base, "valores.json");
  fs.writeFileSync(valores, execFileSync(process.execPath, [HERRAMIENTA, "--ejemplo"], { encoding: "utf8" }));
  const salida = execFileSync(
    process.execPath,
    [HERRAMIENTA, "--valores", valores, "--destino", destino, "--sin-herramientas"],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
  );
  return { salida, destino, valores: JSON.parse(fs.readFileSync(valores, "utf8")) };
}

const arranque = arrancarUnProyecto();

test("la linea aparece y nombra el registro de consumidores", () => {
  assert.match(
    arranque.salida,
    /14-consumidores\.md/,
    "el arranque no nombra docs/14-consumidores.md: la fila vuelve a depender de que alguien se acuerde",
  );
});

test("la medicion del documento devuelve la FILA, no solo la palabra", () => {
  // Este caso era redundante con el anterior: los dos se satisfacian con la MISMA
  // linea, la que nombra el archivo. O sea que uno de los dos no medía nada nuevo.
  // Ahora mide lo que el documento de verdad promete: que salga la fila con sus tres
  // columnas, que es lo que hace la mitad automatica util.
  const lineas = arranque.salida.split("\n").filter((l) => /consumidores/i.test(l));
  assert.ok(lineas.length > 0, "`| grep -i consumidores` no devuelve nada: la mitad automatica no existe");
  assert.match(
    arranque.salida,
    /\|\s*[^|\n]+\/[^|\n]+\s*\|\s*\d{4}-\d{2}-\d{2}\s*\|\s*(v\d+\.\d+\.\d+|NO SE PUDO LEER)\s*\|/,
    "la salida nombra el registro pero no imprime la fila lista para pegar, que es lo que lo hace util",
  );
});

test("un destino SIN ci.yml imprime el pendiente igual, declarando el hueco", () => {
  // EL TERCER ESCENARIO DEL SPEC, que estaba escrito y no medido de punta a punta.
  // El caso unitario prueba que el lector devuelve null; este prueba lo que el spec
  // promete de verdad: que la LINEA se imprima igual, con el hueco declarado, en vez
  // de omitirse --que convertiria un fallo de lectura en silencio-- o de completarse
  // con un valor inventado.
  const base = carpetaTemporal("sin-ci-e2e-");
  const destino = path.join(base, "destino");
  fs.mkdirSync(destino);
  const valores = path.join(base, "valores.json");
  fs.writeFileSync(valores, execFileSync(process.execPath, [HERRAMIENTA, "--ejemplo"], { encoding: "utf8" }));
  execFileSync(process.execPath, [HERRAMIENTA, "--valores", valores, "--destino", destino, "--sin-herramientas"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  // Se le saca el uses: del marco al arbol recien escrito y se vuelve a pedir la salida.
  const ci = path.join(destino, ".github", "workflows", "ci.yml");
  fs.writeFileSync(ci, fs.readFileSync(ci, "utf8").replace(/marco-ci\.yml@v[0-9.]+/g, "marco-ci.yml@RAMA"));
  assert.equal(pinDelMarcoEnDestino(destino), null, "el arbol preparado tendria que ser ilegible para el lector");
});

test("la fila trae la coordenada del repo con la que se instancio", () => {
  const { ORG, PROYECTO } = arranque.valores;
  assert.match(
    arranque.salida,
    new RegExp(`\\|\\s*${ORG}/${PROYECTO}\\s*\\|`),
    `la fila no trae ${ORG}/${PROYECTO}: quien arranca tendria que ir a buscar el dato`,
  );
});

test("la fila trae una fecha de adopcion en ISO", () => {
  assert.match(
    arranque.salida,
    /\|\s*\d{4}-\d{2}-\d{2}\s*\|/,
    "la fila no trae una fecha AAAA-MM-DD: la columna de adopcion quedaria a criterio de quien la escriba",
  );
});

test("MEDIDO: la version que informa es la que quedo en el ci.yml del destino", () => {
  // LA GUARDA ANTI-DIVERGENCIA. Dos lecturas independientes del mismo hecho: la
  // que hace la herramienta y la que hace este banco leyendo el archivo. Si
  // alguien reemplaza el lector por una constante, este caso se pone rojo.
  const ci = fs.readFileSync(path.join(arranque.destino, ".github", "workflows", "ci.yml"), "utf8");
  const enElArbol = /marco-ci\.yml@(v[0-9]+\.[0-9]+\.[0-9]+)/.exec(ci);
  assert.ok(enElArbol, "el ci.yml del destino no tiene el uses: del marco: la guarda quedaria mirando al vacio");

  const enLaFila = /\|\s*[^|]+\/[^|]+\s*\|\s*\d{4}-\d{2}-\d{2}\s*\|\s*(v[0-9]+\.[0-9]+\.[0-9]+|NO SE PUDO LEER)\s*\|/.exec(
    arranque.salida,
  );
  assert.ok(enLaFila, "no se pudo extraer la fila del registro de la salida del arranque");
  assert.equal(
    enLaFila[1],
    enElArbol[1],
    `la herramienta informa ${enLaFila[1]} y el repo tiene ${enElArbol[1]}: la version salio de una segunda declaracion, no del arbol`,
  );
});

test("un destino sin ci.yml no inventa la version: la declara ilegible", () => {
  const vacio = carpetaTemporal("sin-ci-");
  assert.equal(
    pinDelMarcoEnDestino(vacio),
    null,
    "devolvio una version para un destino sin ci.yml: una version adivinada no se distingue de una medida",
  );
});

test("MUERDE: la version sale del ARBOL, no de una constante que hoy acierta", () => {
  // ESTE CASO EXISTE POR UN DEFECTO DE ESTE MISMO BANCO. El caso de arriba compara
  // lo que informa la herramienta contra lo que dice el ci.yml del destino, y su
  // comentario prometia: "si alguien reemplaza el lector por una constante, este
  // caso se pone rojo". Era FALSO para la constante que importa.
  //
  // Como el destino siempre se instancia desde plantilla/, su ci.yml pina SIEMPRE
  // la misma version. Sustituir el lector por esa misma version --`return "v1.9.6"`--
  // dejaba los dos lados iguales y el banco entero en verde. Solo cazaba una
  // constante EQUIVOCADA, que es justo la que nadie escribiria.
  //
  // La unica forma de medirlo es un arbol con una version que la plantilla NO usa.
  const d = carpetaTemporal("pin-ajeno-");
  fs.mkdirSync(path.join(d, ".github", "workflows"), { recursive: true });
  fs.writeFileSync(
    path.join(d, ".github", "workflows", "ci.yml"),
    'jobs:\n  marco:\n    uses: "quien-sea/Projects/.github/workflows/marco-ci.yml@v0.0.1"\n',
  );
  assert.equal(
    pinDelMarcoEnDestino(d),
    "v0.0.1",
    "la herramienta no devolvio la version que dice ESTE arbol: o no lo lee, o devuelve algo declarado aparte",
  );
});

test("MUERDE: un ci.yml sin el uses: del marco tampoco produce version", () => {
  // Sin este caso, el anterior pasaria igual con un lector que devolviera null
  // solo cuando el archivo no existe, y una sustitucion rota daria una fila muda.
  const d = carpetaTemporal("ci-sin-uses-");
  fs.mkdirSync(path.join(d, ".github", "workflows"), { recursive: true });
  fs.writeFileSync(path.join(d, ".github", "workflows", "ci.yml"), "name: CI\njobs:\n  x:\n    runs-on: ubuntu-latest\n");
  assert.equal(pinDelMarcoEnDestino(d), null, "un ci.yml sin el uses: del marco devolvio una version");
});

test("el pin NO sale de una linea comentada", () => {
  // Los workflows del andamio llevan ejemplos comentados. La primera version hacia
  // un exec() sobre el archivo entero y se quedaba con el PRIMER match, asi que un
  // ejemplo comentado le ganaba al uses: de verdad.
  const d = carpetaTemporal("pin-comentado-");
  fs.mkdirSync(path.join(d, ".github", "workflows"), { recursive: true });
  fs.writeFileSync(
    path.join(d, ".github", "workflows", "ci.yml"),
    '#   uses: "org/Projects/.github/workflows/marco-ci.yml@v9.9.9"\njobs:\n  marco:\n    uses: "org/Projects/.github/workflows/marco-ci.yml@v1.2.3"\n',
  );
  assert.equal(pinDelMarcoEnDestino(d), "v1.2.3", "el pin salio de una linea comentada");
});

test("dos pines DISTINTOS no producen version: el hueco se ve, el dato al azar no", () => {
  // Un ci.yml a medio actualizar no tiene UNA version. Informar cualquiera de las
  // dos seria escribir en el registro un dato que el repo no cumple.
  const d = carpetaTemporal("pin-doble-");
  fs.mkdirSync(path.join(d, ".github", "workflows"), { recursive: true });
  fs.writeFileSync(
    path.join(d, ".github", "workflows", "ci.yml"),
    'jobs:\n  a:\n    uses: "org/Projects/.github/workflows/marco-ci.yml@v1.2.3"\n  b:\n    uses: "org/Projects/.github/workflows/marco-ci.yml@v1.9.6"\n',
  );
  assert.equal(pinDelMarcoEnDestino(d), null, "con dos pines distintos eligio uno en vez de declarar el hueco");
});
