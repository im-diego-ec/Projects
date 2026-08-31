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

/** Las paginas .md rastreadas Y las que todavia no se comprometieron.
 *
 *  `--others --exclude-standard` no es un adorno: sin eso este banco solo ve lo
 *  que ya esta en el indice de git, y un archivo recien escrito queda INVISIBLE
 *  hasta el commit. Medido el 2026-08-26, y es el propio banco el que se lo
 *  hizo: en local dio 418 enlaces y verde, y en CI dio 419 y rojo, porque el
 *  archivo con el enlace malo se habia escrito despues de la ultima corrida y
 *  antes del `git add`. Un banco que solo ve lo comprometido avisa DESPUES de
 *  que el defecto ya viajo, que es justo cuando ya no sirve. */
function paginas() {
  const listar = (args) =>
    execFileSync("git", args, { cwd: RAIZ, encoding: "utf-8" }).trim().split("\n").filter(Boolean);
  const todas = new Set([...listar(["ls-files", "*.md"]), ...listar(["ls-files", "--others", "--exclude-standard", "*.md"])]);
  return [...todas].filter((f) => !FUERA.has(f)).sort();
}

/** El texto sin bloques cercados NI codigo en linea.
 *
 *  Los bloques cercados quedan fuera porque adentro vive el comando, y una ruta
 *  ahi no es un enlace que alguien vaya a clickear.
 *
 *  EL CODIGO EN LINEA QUEDA FUERA POR LA MISMA RAZON, y este banco aprendio la
 *  leccion en su primer viaje: markdown NO renderiza un enlace adentro de
 *  comillas invertidas. Un documento de este repositorio escribe
 *  `[compuerta](…)` entre backticks para ILUSTRAR como se ve un enlace al
 *  glosario, y la version anterior de este archivo lo leyo como un enlace de
 *  verdad y se puso roja por una ruta que ningun lector puede clickear. Medir
 *  como enlace algo que el lector ve como texto es reportar un defecto que no
 *  existe, y eso gasta la confianza que un banco necesita para que le crean el
 *  dia que tiene razon. */
const prosa = (t) => t.replace(/```[\s\S]*?```/g, "").replace(/`[^`\n]*`/g, "");

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

/** Un enlace con marcador no es una ruta TODAVIA.
 *
 *  `{{PAQUETE_SITIO}}/README.md` no existe en el arbol del marco y no tiene por
 *  que: se vuelve una ruta recien cuando `projects init` sustituye el marcador.
 *  Comprobarlo aca daria un rojo permanente por un enlace correcto.
 *
 *  DONDE SI SE COMPRUEBA, para que esta excepcion no sea un agujero: el caso
 *  «lo que la portada dice sobre publicar coincide con lo que el arbol trae» de
 *  pruebas/init/formas.test.mjs genera el proyecto de cada forma y exige que
 *  todo enlace de su README apunte a algo que ESE proyecto tiene. O sea que el
 *  enlace se verifica ya sustituido, que es la unica forma de verificarlo. */
const tieneMarcador = (ruta) => /\{\{[A-Z_]+\}\}/.test(ruta);

/** Lo que el andamio enlaza y NO existe en el andamio, porque lo escribe la
 *  herramienta al generar el proyecto.
 *
 *  `.projects/` es la porcion del marco: la RENDERIZA `projects init` en un paso
 *  posterior al copiado, asi que en el arbol del marco no esta y en el proyecto
 *  si. Comprobarlo aca daria un rojo permanente por un enlace correcto.
 *
 *  DONDE SI SE COMPRUEBA, para que esto no sea un agujero: el caso «todo enlace
 *  de un archivo que viaja al proyecto resuelve DENTRO del proyecto» de
 *  pruebas/init/formas.test.mjs genera el proyecto y los resuelve ahi. */
const loEscribeLaHerramienta = (pagina, ruta) =>
  pagina.startsWith("plantilla/") && /(^|\/)\.projects\//.test(path.posix.normalize(path.posix.join(path.posix.dirname(pagina), ruta)));

test("todo enlace apunta a un archivo o carpeta que EXISTE", () => {
  const rotos = [];
  let conMarcador = 0;
  for (const { pagina, destinos } of censo) {
    for (const d of destinos) {
      if (tieneMarcador(d.ruta) || loEscribeLaHerramienta(pagina, d.ruta)) {
        conMarcador++;
        continue;
      }
      const absoluta = path.resolve(RAIZ, path.dirname(pagina), d.ruta);
      if (!fs.existsSync(absoluta)) rotos.push(`${pagina} -> ${d.crudo}`);
    }
  }
  // ANTI-VACUIDAD DE LA EXCEPCION: si un dia no queda ningun enlace con
  // marcador, la excepcion sobra y conviene saberlo; si quedan demasiados, es
  // que alguien la esta usando para esquivar el control.
  assert.ok(conMarcador <= 8, `${conMarcador} enlaces exceptuados es demasiado para una excepcion: revisala`);
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
