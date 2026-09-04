import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const ANDAMIO = path.join(RAIZ, "plantilla");
const leer = (rel) => fs.readFileSync(path.join(ANDAMIO, rel), "utf8");

// ---------------------------------------------------------------------------
// EL PRIMER MINUTO DEL PROYECTO NUEVO.
//
// Lo que sigue son tres promesas del arranque que no dependen de que nadie se
// acuerde de nada, y las tres se pueden romper con una linea:
//
//   1. Si una pata de `pnpm dev` se muere, se muere todo. MEDIDO: con el script
//      del API saliendo 1, `pnpm --parallel -r dev` corta, nombra el paquete y
//      sale 1. Lo que lo apagaria es un `--no-bail`, y entonces el front seguiria
//      sirviendo una pagina que no puede hablar con su backend.
//   2. El navegador se abre solo. La direccion tambien se imprime, pero copiar
//      una direccion a mano es donde alguien que recien empieza se pierde.
//   3. El puerto vive en UN solo lugar, que es el que lee `projects init` para
//      decir donde mirar.
// ---------------------------------------------------------------------------

test("andamio · si una pata de `pnpm dev` muere, se muere todo", () => {
  const raiz = JSON.parse(leer("package.json"));
  const dev = raiz.scripts.dev;
  assert.match(dev, /--parallel/, "el dev de la raiz dejo de correr las patas en paralelo");
  // MEDIDO en un proyecto instanciado: con el `dev` del API saliendo 1, esto
  // corta con ERR_PNPM_RECURSIVE_RUN_FIRST_FAIL y sale 1. `--no-bail` es lo unico
  // que lo apagaria, y lo dejaria callado: el front sirviendo, el API muerto.
  assert.ok(!/--no-bail/.test(dev), "`--no-bail` deja el front sirviendo con el API muerto, y sin decirlo");
});

test("andamio · el navegador se abre solo en las dos formas", () => {
  assert.match(leer("web/vite.config.ts"), /open:\s*true/, "la aplicacion no abre el navegador");
  assert.match(leer("sitio/astro.config.mjs"), /open:\s*true/, "el sitio no abre el navegador");
});

test("andamio · cada puerto esta escrito UNA vez", () => {
  // Dos casas para el mismo numero es correcto hasta el dia que alguien cambia
  // una. `projects init` lee estos archivos para decir en que direccion se ve el
  // proyecto: si el numero se repitiera en la herramienta, ese texto mandaria a
  // una direccion vacia sin que nada se pusiera rojo.
  const herramienta = fs.readFileSync(path.join(RAIZ, "herramientas/projects-init.mjs"), "utf8");
  for (const puerto of ["5173", "4321"]) {
    assert.ok(
      !new RegExp(`(?<![\\d:/])${puerto}(?![\\d])`).test(herramienta.replace(/^\s*(\/\/|\*).*$/gm, "")),
      `el puerto ${puerto} esta escrito en projects-init.mjs ademas de en el andamio: dos casas para un numero`,
    );
  }
});
