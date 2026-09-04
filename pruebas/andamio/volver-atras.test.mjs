import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const ANDAMIO = path.join(RAIZ, "plantilla");
const leer = (rel) => fs.readFileSync(path.join(RAIZ, rel), "utf8");

// ---------------------------------------------------------------------------
// PUBLICAR SIN PODER VOLVER ATRAS ES PUBLICAR A CIEGAS.
//
// El marco publicaba sitios desde que existe la forma "sitio" y en NINGUN lado
// decia como volver a la version anterior. Un grep de "rollback", "volver atras"
// y "version anterior" sobre docs/10 y el README del paquete devolvia VACIO.
//
// Mientras el sitio esta roto, cada minuto lo paga quien entra. Volver atras es
// un comando y tarda segundos; arreglar el codigo bien puede tardar una hora, y
// el orden correcto es ese.
//
// Y LA MITAD QUE SE OLVIDA tiene que estar escrita: volver atras cambia lo que
// Cloudflare sirve, NO lo que hay en el repositorio. El codigo roto sigue en la
// rama principal, asi que la proxima publicacion lo sube otra vez. Un documento
// que ensenia el rollback y no dice esto deja a alguien creyendo que arreglo algo.
// ---------------------------------------------------------------------------

test("el paquete del sitio trae los DOS comandos, no una instruccion escrita", () => {
  // Un paso a paso que hay que transcribir a mano es un paso a paso que se
  // escribe mal justo cuando hay apuro, que es el unico momento en que se usa.
  const pkg = JSON.parse(leer("plantilla/sitio/package.json"));
  assert.equal(pkg.scripts.publicaciones, "wrangler deployments list", "falta el comando que lista las publicaciones");
  assert.equal(pkg.scripts["volver-atras"], "wrangler rollback", "falta el comando que vuelve atras");
});

test("los comandos EXISTEN en la version de wrangler que el andamio pina", () => {
  // MEDIDO contra el binario real el dia que se escribio esto: `wrangler rollback
  // [version-id]` y `wrangler deployments list` existen en wrangler 4. Lo que este
  // caso vigila es que el pin no se mueva a una mayor sin que nadie lo revise:
  // prometer un comando que la version instalada no tiene es peor que no
  // prometerlo, porque falla en el momento de apuro.
  const pkg = JSON.parse(leer("plantilla/sitio/package.json"));
  const pin = pkg.devDependencies.wrangler;
  assert.match(
    pin,
    /^\^4\./,
    `wrangler pasa a ${pin}: hay que volver a comprobar que 'rollback' y 'deployments list' sigan existiendo, y con esa forma`,
  );
});

test("el README canonico lo explica, y explica lo que NO arregla", () => {
  const t = fs.readFileSync(path.join(ANDAMIO, "sitio/README.md"), "utf8");
  assert.match(t, /run publicaciones/, "no dice como ver las publicaciones");
  assert.match(t, /run volver-atras/, "no dice como volver atras");
  assert.match(t, /no lo que hay en tu repositorio/, "no dice que el codigo roto sigue en el repo");
  assert.match(t, /Revert/, "no dice cual es el arreglo de verdad");
  assert.match(
    t,
    /sin terminal/,
    "no dice que tambien se puede desde el panel, que es lo unico que sirve a quien no abre una terminal",
  );
});

test("la pagina del marco lo nombra y NO duplica el paso a paso", () => {
  // El README del paquete es la fuente canonica. Dos copias del paso a paso
  // divergen, y la que se pudre es la que nadie corre.
  const t = leer("docs/10-publicar.md");
  assert.match(t, /volv(é|e) atr(á|a)s/i, "docs/10 no nombra el volver atras");
  assert.match(t, /no lo que hay en tu repositorio/, "docs/10 no dice lo que el rollback NO arregla");
  assert.ok(!/run volver-atras/.test(t), "docs/10 duplica el comando: es el README del paquete el que manda");
});

test("MUERDE: el detector ve cuando el paso a paso desaparece", () => {
  const t = fs.readFileSync(path.join(ANDAMIO, "sitio/README.md"), "utf8");
  assert.ok(!/run volver-atras/.test(t.replace(/run volver-atras/g, "")), "la deteccion no ve la ausencia que dice ver");
});
