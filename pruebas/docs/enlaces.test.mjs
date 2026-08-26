import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

// ---------------------------------------------------------------------------
// EL HUECO QUE ESTE BANCO CIERRA, y es el mas grande que tenia el repositorio.
//
// Hasta este archivo, NADA comprobaba que un enlace apuntara a un archivo que
// existe. Medido el 2026-08-25 sobre un clon: apuntando los 217 enlaces del
// glosario a un archivo inexistente, sin renombrar un solo archivo, la suite
// completa daba 948 pass / 3 fail — y los tres rojos NO eran chequeos de
// existencia: eran proxies accidentales de la forma literal `](nombre.md)` que
// exige el indice y de la regla de digitos de la pagina del stack.
//
// O sea: se podia romper el 52% de la navegacion del repositorio y el CI
// quedaba practicamente verde. La regla del glosario (pruebas/docs/lectura.mjs)
// acepta cualquier destino que CONTENGA la cadena "glosario.md", exista o no el
// archivo, porque su trabajo es otro —vigilar que la palabra este enlazada—.
//
// Este banco es de veinte lineas y es la red que faltaba debajo de cualquier
// renombrado, movida de carpeta o borrado.
// ---------------------------------------------------------------------------

/** Enlaces markdown que apuntan a algo del repositorio. Se dejan fuera los
 *  absolutos (http, mailto) —no es trabajo de este banco salir a la red— y los
 *  que son solo ancla (`#seccion`), que se resuelven contra la propia pagina. */
const ENLACE = /\[[^\]]*\]\((?!https?:\/\/|mailto:|#)([^)\s]+)(?:\s+"[^"]*")?\)/g;

/** El CHANGELOG queda fuera, y el motivo no es comodidad.
 *
 *  Ese archivo es el registro de lo que cada version PUBLICADA dijo. Las rutas
 *  que nombra eran ciertas el dia que se escribieron; reescribirlas cuando un
 *  archivo se renombra falsifica lo que el consumidor leyo en su momento, que
 *  es exactamente lo contrario de para que existe un changelog. Un enlace viejo
 *  ahi es historia correcta, no un defecto. */
const FUERA = new Set(["CHANGELOG.md"]);

function paginas() {
  return execFileSync("git", ["ls-files", "*.md"], { cwd: RAIZ, encoding: "utf-8" })
    .trim()
    .split("\n")
    .filter((f) => f && !FUERA.has(f));
}

/** El texto sin los bloques cercados. Adentro de un bloque hay comandos y
 *  ejemplos: una ruta ahi no es un enlace que alguien vaya a clickear. */
const prosa = (t) => t.replace(/```[\s\S]*?```/g, "");

/** Los destinos de una pagina, ya separados en ruta y ancla. */
export function destinosDe(texto) {
  const salida = [];
  for (const m of prosa(texto).matchAll(ENLACE)) {
    const [ruta, ancla] = m[1].split("#");
    if (ruta) salida.push({ ruta: decodeURIComponent(ruta), ancla: ancla ? decodeURIComponent(ancla) : null, crudo: m[1] });
  }
  return salida;
}

/** El ancla que GitHub genera para un encabezado: minusculas, sin signos, los
 *  espacios a guion. Los acentos SE CONSERVAN —`#backlog-de-automatización` es
 *  un ancla viva de este repositorio— asi que no se normaliza el unicode. */
export function anclaDe(encabezado) {
  return encabezado
    .trim()
    .toLowerCase()
    .replace(/[`*_~[\]()]/g, "")
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .trim()
    .replace(/\s+/g, "-");
}

function anclasDe(texto) {
  const a = new Set();
  for (const m of prosa(texto).matchAll(/^#{1,6}\s+(.+?)\s*$/gm)) a.add(anclaDe(m[1]));
  for (const m of texto.matchAll(/<a\s+(?:id|name)="([^"]+)"/g)) a.add(m[1]);
  return a;
}

const TODAS = paginas();
const censo = TODAS.map((p) => ({ pagina: p, destinos: destinosDe(fs.readFileSync(path.join(RAIZ, p), "utf-8")) }));
const CUANTOS = censo.reduce((n, c) => n + c.destinos.length, 0);

test("hay enlaces que revisar: un cero aca es este banco roto, no un repositorio sin enlaces", () => {
  assert.ok(TODAS.length >= 50, `se esperaban al menos 50 paginas .md rastreadas; se encontraron ${TODAS.length}`);
  assert.ok(
    CUANTOS >= 300,
    `se esperaban al menos 300 enlaces relativos —medidos 418 el 2026-08-25—; se encontraron ${CUANTOS}. ` +
      "Si el numero cayo de golpe, lo primero que hay que mirar es si el regex dejo de reconocer la forma de los enlaces, " +
      "no si el repositorio perdio la mitad de su navegacion.",
  );
});

test("todo enlace apunta a un archivo o carpeta que EXISTE", () => {
  const rotos = [];
  for (const { pagina, destinos } of censo) {
    for (const d of destinos) {
      const absoluta = path.resolve(RAIZ, path.dirname(pagina), d.ruta);
      if (!fs.existsSync(absoluta)) rotos.push(`${pagina} -> ${d.crudo}`);
    }
  }
  assert.deepEqual(
    rotos,
    [],
    `${rotos.length} de ${CUANTOS} enlaces apuntan a algo que no esta. Cada linea es "donde esta escrito -> a donde apunta":\n  ` +
      rotos.join("\n  "),
  );
});

test("toda ancla apunta a un encabezado que EXISTE en la pagina de destino", () => {
  const rotas = [];
  for (const { pagina, destinos } of censo) {
    for (const d of destinos) {
      if (!d.ancla) continue;
      const absoluta = path.resolve(RAIZ, path.dirname(pagina), d.ruta);
      if (!fs.existsSync(absoluta) || !absoluta.endsWith(".md")) continue;
      const anclas = anclasDe(fs.readFileSync(absoluta, "utf-8"));
      if (!anclas.has(d.ancla)) rotas.push(`${pagina} -> ${d.crudo}  (la pagina destino no tiene ese encabezado)`);
    }
  }
  assert.deepEqual(rotas, [], `anclas que no llevan a ninguna seccion:\n  ${rotas.join("\n  ")}`);
});

test("MUERDE: un enlace a un archivo inexistente se caza", () => {
  // El caso que prueba que los de arriba no pasan por vacuidad. Se simula sobre
  // texto: si esto no cazara, el banco entero seria decorativo.
  const inventado = destinosDe("Ver [esto](docs/no-existe-este-archivo-abc123.md).");
  assert.equal(inventado.length, 1, "el detector tiene que ver el enlace");
  assert.equal(
    fs.existsSync(path.resolve(RAIZ, inventado[0].ruta)),
    false,
    "el archivo inventado NO puede existir; si existe, cambia el nombre del caso",
  );
});

test("MUERDE: un ancla inventada sobre una pagina real se caza", () => {
  const real = TODAS.find((p) => p.startsWith("docs/"));
  const anclas = anclasDe(fs.readFileSync(path.join(RAIZ, real), "utf-8"));
  assert.ok(anclas.size > 0, `${real} tiene que tener encabezados para que este caso signifique algo`);
  assert.equal(anclas.has("ancla-que-nadie-escribio-abc123"), false, "el ancla inventada no puede existir en la pagina real");
});

test("el ancla se calcula como la calcula GitHub, acentos incluidos", () => {
  // Medido contra un ancla VIVA del repositorio: `#backlog-de-automatización`,
  // que aparece en seis lugares. Si esta traduccion se rompiera, el caso de
  // arriba empezaria a reportar rotas las anclas que si funcionan.
  assert.equal(anclaDe("## Backlog de automatización"), "backlog-de-automatización");
  assert.equal(anclaDe("Backlog de automatización"), "backlog-de-automatización");
  assert.equal(anclaDe("### ¿Cuánto cuesta?"), "cuánto-cuesta");
  assert.equal(anclaDe("## `codigo` y *enfasis*"), "codigo-y-enfasis");
});
