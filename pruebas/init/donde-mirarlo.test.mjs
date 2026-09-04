import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { lineasParaVerlo, puertoDeclarado } from "../../herramientas/projects-init.mjs";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const ANDAMIO = path.join(RAIZ, "plantilla");

// ---------------------------------------------------------------------------
// EL PROYECTO NACIA EN VERDE Y NADIE DECIA DONDE MIRARLO.
//
// El arranque terminaba con "ARRANCADO Y EN VERDE: instalado, datos, formateado,
// verificado" y pasaba directo a seis tareas de GitHub. Ni como se enciende, ni
// en que direccion se ve. Quien no es tecnico no tiene por que saber que
// `pnpm dev` existe, y quien lo sabe igual no sabe el puerto de ESTE proyecto.
//
// Y EN UNA APLICACION EL PRIMER PASO NO ES `pnpm dev`: es levantar la base. Sin
// eso la portada abre diciendo "Base de datos: no responde", que es un rojo
// correcto y un pesimo primer minuto.
// ---------------------------------------------------------------------------

test("una aplicacion: la base va PRIMERO, y despues el navegador", () => {
  const t = lineasParaVerlo(ANDAMIO, "aplicacion", { PAQUETE_WEB: "web", PAQUETE_API: "api" }).join("\n");
  assert.match(t, /docker compose up -d/, "no dice como levantar la base");
  assert.ok(
    t.indexOf("docker compose up -d") < t.indexOf("pnpm dev"),
    "manda a correr `pnpm dev` antes que la base: la portada abriria en rojo",
  );
  assert.match(t, /http:\/\/localhost:5173/, "no dice en que direccion se ve");
  assert.match(t, /http:\/\/localhost:3000/, "no dice donde queda el API");
});

test("un sitio: sin base, porque no tiene", () => {
  const t = lineasParaVerlo(ANDAMIO, "sitio", { PAQUETE_SITIO: "sitio" }).join("\n");
  assert.ok(!/docker/.test(t), "manda a levantar una base que este proyecto no tiene");
  assert.match(t, /http:\/\/localhost:4321/, "no dice en que direccion se ve el sitio");
});

test("EL PUERTO SE LEE DEL PROYECTO, no esta escrito en la herramienta", () => {
  // Un numero repetido en la herramienta es correcto hasta el dia que alguien
  // cambia el del andamio, y ese dia manda a la persona a una direccion vacia sin
  // que nada se ponga rojo. Se comprueba cambiandolo: el texto tiene que seguirlo.
  const copia = fs.mkdtempSync(path.join(os.tmpdir(), "puertos-"));
  fs.mkdirSync(path.join(copia, "web"), { recursive: true });
  fs.writeFileSync(path.join(copia, "web", "vite.config.ts"), "export default { server: { port: 9999 } };\n");
  const t = lineasParaVerlo(copia, "aplicacion", { PAQUETE_WEB: "web" }).join("\n");
  assert.match(t, /http:\/\/localhost:9999/, "no siguio al puerto del proyecto: el numero esta cableado en la herramienta");
  fs.rmSync(copia, { recursive: true, force: true });
});

test("si NO se puede leer el puerto, no se inventa una direccion", () => {
  // Decir "abri localhost:5173" sin saberlo es peor que no decirlo: lo que se ve
  // al fallar es una pagina en blanco, sin motivo.
  const t = lineasParaVerlo("/ruta/que/no/existe", "aplicacion", {}).join("\n");
  assert.ok(!/localhost:\d/.test(t), "afirma una direccion que no midio");
  assert.match(t, /la direccion que imprima `pnpm dev`/, "y tampoco deja a la persona sin saber que hacer");
  assert.equal(puertoDeclarado("/ruta/que/no/existe", "web/vite.config.ts", /port:\s*(\d+)/), null);
});

test("el andamio DECLARA los dos puertos, asi que hay de donde leerlos", () => {
  // Es la otra mitad de la regla de arriba: leer del proyecto solo sirve si el
  // proyecto lo dice. Astro elige 4321 solo, y el andamio lo escribe igual para
  // que el numero tenga UNA casa y no dos.
  assert.equal(puertoDeclarado(ANDAMIO, "web/vite.config.ts", /server:\s*\{\s*port:\s*(\d+)/), 5173);
  assert.equal(puertoDeclarado(ANDAMIO, "sitio/astro.config.mjs", /server:\s*\{\s*port:\s*(\d+)/), 4321);
  assert.equal(puertoDeclarado(ANDAMIO, "api/src/server.ts", /PUERTO_POR_DEFECTO = (\d+)/), 3000);
});

test("la portada y este texto nombran el MISMO arreglo para la base caida", () => {
  // Si divergen, la pantalla dice una cosa y la terminal otra sobre el mismo
  // problema, y la persona no sabe a cual creerle.
  const portada = fs.readFileSync(path.join(ANDAMIO, "web", "src", "App.tsx"), "utf8");
  const t = lineasParaVerlo(ANDAMIO, "aplicacion", {}).join("\n");
  assert.ok(portada.includes("docker compose up -d"), "la portada no nombra el arreglo");
  assert.ok(t.includes("docker compose up -d"), "la terminal no nombra el arreglo");
});
