import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { BANDERAS, distancia, sugerenciaDeBandera } from "../../herramientas/projects-init.mjs";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

// ---------------------------------------------------------------------------
// UNA LETRA DE MAS NO TENDRIA QUE COSTAR DIEZ LINEAS DE LECTURA.
//
// `--destinno` contestaba "argumento desconocido: --destinno" y la lista entera
// de banderas. La lista es correcta y es lo que hay que leer cuando de verdad no
// se sabe cual era; cuando la diferencia es UNA letra, encontrar en esa lista la
// que uno ya estaba tipeando es trabajo que la herramienta puede ahorrar.
//
// Y LA MITAD QUE MAS IMPORTA ES LA QUE NO SUGIERE. Sugerir siempre el mas
// parecido convierte cualquier disparate en un consejo con cara de certeza.
// ---------------------------------------------------------------------------

test("un error de tipeo se nombra", () => {
  for (const [malo, bueno] of [
    ["--destinno", "--destino"],
    ["--valore", "--valores"],
    ["--forzarr", "--forzar"],
    ["--ejmplo", "--ejemplo"],
    ["--sin-arranqu", "--sin-arranque"],
  ]) {
    assert.equal(sugerenciaDeBandera(malo), ` — ¿quisiste decir ${bueno}?`, `${malo} tendria que sugerir ${bueno}`);
  }
});

test("lo que no se parece a nada NO se sugiere", () => {
  // Contestar "quisiste decir --ejemplo?" ante `--xyz` manda a probar algo que no
  // tiene nada que ver, y con cara de saber.
  for (const disparate of ["--xyz", "--publicar", "-x", "--aws", "--que-se-yo"]) {
    assert.equal(sugerenciaDeBandera(disparate), "", `${disparate} no se parece a ninguna bandera y sin embargo sugirio algo`);
  }
});

test("una ruta o un valor suelto no recibe consejo de bandera", () => {
  // No hay filtro de "empieza con guion", y es a proposito: el umbral solo ya
  // rechaza esto, y un filtro asi apagaba el caso de abajo. Lo que sostiene esta
  // promesa es la distancia, asi que se comprueba con las entradas reales.
  for (const v of ["valores.json", "/tmp/destino", "~/Documentos/mi-proyecto", "", null, undefined]) {
    assert.equal(sugerenciaDeBandera(v), "", `${JSON.stringify(v)} recibio un consejo de bandera que no venia al caso`);
  }
});

test("una bandera escrita SIN los guiones tambien recibe el consejo", () => {
  // Es el caso que un filtro de "empieza con guion" apagaba: quien escribe
  // `sin-herramientas` pelado queria esa bandera, y esta a dos letras de ella.
  assert.equal(sugerenciaDeBandera("sin-herramientas"), " — ¿quisiste decir --sin-herramientas?");
  assert.equal(sugerenciaDeBandera("version-openspec"), " — ¿quisiste decir --version-openspec?");
});

test("LA LISTA ES UNA SOLA: el parser y el que sugiere leen lo mismo", () => {
  // Dos listas divergen, y la que se pudre es la que nadie mira: una bandera
  // nueva que el parser acepte y esta lista no tenga haria que escribirla mal
  // devuelva "no se parece a nada".
  const fuente = fs.readFileSync(path.join(RAIZ, "herramientas/projects-init.mjs"), "utf8");
  // El corte arranca en la primera rama y termina en el `throw`, no en la
  // primera aparicion del texto "argumento desconocido": ese texto tambien vive
  // en el comentario de sugerenciaDeBandera, que esta ANTES en el archivo, y
  // cortar ahi dejaba el trozo vacio y la guarda mirando al aire.
  const desde = fuente.indexOf('if (argv[i] === "--valores")');
  const hasta = fuente.indexOf("else throw new Error(`argumento desconocido", desde);
  assert.ok(desde !== -1 && hasta > desde, "no se pudo aislar el parser de argumentos: cambio de forma");
  const parser = fuente.slice(desde, hasta);
  const enElParser = new Set([...parser.matchAll(/argv\[i\] === "(--?[\w-]+)"/g)].map((m) => m[1]));
  assert.ok(enElParser.size >= 9, `solo se leyeron ${enElParser.size} banderas del parser: la guarda quedo mirando al vacio`);
  for (const b of enElParser) {
    if (b === "-h") continue; // el alias corto de --help, que ya esta en la lista
    assert.ok(BANDERAS.includes(b), `el parser acepta ${b} y BANDERAS no lo tiene: escribirlo mal no daria consejo`);
  }
  for (const b of BANDERAS) {
    assert.ok(enElParser.has(b), `BANDERAS declara ${b} y el parser no lo acepta: se sugeriria algo que no existe`);
  }
});

test("la distancia es la que dice ser", () => {
  // Si esto midiera otra cosa, los dos casos de arriba seguirian pasando por
  // casualidad y el umbral no significaria nada.
  assert.equal(distancia("", ""), 0);
  assert.equal(distancia("abc", "abc"), 0);
  assert.equal(distancia("abc", "abd"), 1);
  assert.equal(distancia("abc", "ab"), 1);
  assert.equal(distancia("", "abc"), 3);
  assert.equal(distancia("kitten", "sitting"), 3);
});
