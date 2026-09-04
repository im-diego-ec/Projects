import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  NOMBRE_BITACORA,
  PASOS_DEL_ARRANQUE,
  archivosDelAndamio,
  formaDe,
  lineasDeVistaPrevia,
  manifiestoPodado,
  pasosSegunElManifiesto,
  plataformaDe,
} from "../../herramientas/projects-init.mjs";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const ANDAMIO = path.join(RAIZ, "plantilla");
const HERRAMIENTA = path.join(RAIZ, "herramientas/projects-init.mjs");

// ---------------------------------------------------------------------------
// NO SE PODIA VER QUE IBA A PASAR ANTES DE QUE PASARA.
//
// El asistente termina con "¿Escribo esto?" y muestra las RESPUESTAS. Despues
// imprime un comando, y ese comando --el que de verdad escribe el proyecto-- no
// preguntaba ni mostraba nada: se le daba Enter y aparecian ochenta archivos en
// una carpeta. "Supabase + Cloudflare" en un resumen de respuestas no le dice a
// nadie que eso iba a pasar.
// ---------------------------------------------------------------------------

const VALORES = {
  PROYECTO: "people-agenda",
  ORG: "Ejemplo-Org",
  PAQUETE_API: "api",
  PAQUETE_WEB: "web",
  PAQUETE_E2E: "e2e",
  PAQUETE_SITIO: "sitio",
  ORG_MARCO: "im-diego-ec",
  GENERAR_CLIENTE_DATOS: "prisma generate",
  EQUIPO_BUILDERS: "builders",
  EQUIPO_PO: "po",
  BUILDER_1: "builder-uno",
  BUILDER_2: "builder-dos",
  PO: "el-po",
  CUENTA_DEV: "111111111111",
  CUENTA_PROD: "222222222222",
  REGION: "us-east-1",
  PERFIL_DEV: "perfil-dev",
  PERFIL_PROD: "perfil-prod",
  PREFIJO_RECURSOS: "agenda",
  DOMINIO_DEV: "agenda-dev.ejemplo.com",
  DOMINIO_PROD: "agenda.ejemplo.com",
  CANAL_ALERTAS: "#alertas-prod",
  ID_MCP_SLACK: "id-de-slack",
};

function corridaDeVistaPrevia(valores, prepararDestino = () => {}) {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), "vista-previa-"));
  const destino = path.join(base, "proyecto");
  fs.mkdirSync(destino);
  prepararDestino(destino);
  const ruta = path.join(base, "valores.json");
  fs.writeFileSync(ruta, JSON.stringify(valores));
  const r = spawnSync(process.execPath, [HERRAMIENTA, "--vista-previa", "--valores", ruta, "--destino", destino], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  return { base, destino, codigo: r.status, salida: `${r.stdout ?? ""}${r.stderr ?? ""}`, quedo: fs.readdirSync(destino) };
}

test("LA PROMESA CENTRAL: mira y no escribe NADA, ni siquiera su bitacora", () => {
  // Una vista previa que deja un archivo se contradice en la linea siguiente. Y
  // el guard del destino ocupado mira si hay archivos, asi que ese archivo
  // TRABARIA la corrida de verdad: mirar antes de decidir saldria mas caro que no
  // mirar.
  const r = corridaDeVistaPrevia(VALORES);
  assert.equal(r.codigo, 0, `la vista previa tendria que salir 0:\n${r.salida}`);
  assert.deepEqual(r.quedo, [], `la vista previa escribio ${r.quedo.join(", ")} en el destino`);
  assert.ok(!r.salida.includes(NOMBRE_BITACORA), "anuncio una bitacora que ademas trabaria la corrida real");
  assert.match(r.salida, /NO se escribió nada/);
  fs.rmSync(r.base, { recursive: true, force: true });
});

test("dice CUANTOS archivos y CUANTOS datos, y los numeros son los de verdad", () => {
  // Una vista previa con numeros propios es la vista previa de otra corrida:
  // peor que no tenerla, porque se confirma una cosa y pasa otra. Se comprueba
  // contra la misma funcion que despues copia.
  const r = corridaDeVistaPrevia(VALORES);
  // La plataforma se DERIVA de los valores, igual que en la herramienta: un
  // archivo sin la clave `plataforma` no es "supabase", y suponerlo aca haria que
  // este caso compare contra una corrida distinta de la que se hizo.
  const reales = archivosDelAndamio(ANDAMIO, plataformaDe(VALORES), formaDe(VALORES)).length;
  assert.ok(reales > 40, `el andamio devolvio ${reales} archivos: la comprobacion quedaria mirando al vacio`);
  assert.match(r.salida, new RegExp(`Cuántos archivos\\s+${reales}\\b`), `no dice ${reales} archivos:\n${r.salida}`);
  fs.rmSync(r.base, { recursive: true, force: true });
});

test("un SITIO no promete el paso que no va a correr", () => {
  // `podarPorForma` le borra el script `datos` al manifiesto de un sitio, asi que
  // ese paso no corre. Anunciarlo igual es prometer algo que no va a pasar, que
  // es la misma clase de mentira que esta vista previa existe para evitar.
  const r = corridaDeVistaPrevia({ ...VALORES, forma: "sitio", plataforma: "ninguna" });
  assert.match(r.salida, /un sitio para leer/);
  assert.ok(!/generar el cliente de la capa de datos/.test(r.salida), "un sitio no genera capa de datos y lo anuncio igual");
  assert.match(r.salida, /instalar las dependencias/, "y los que SI corren tienen que estar");
  // Y son menos archivos que una aplicacion: si fueran los mismos, la poda por
  // forma no estaria pasando por aca.
  const sitio = archivosDelAndamio(ANDAMIO, "ninguna", "sitio").length;
  const app = archivosDelAndamio(ANDAMIO, plataformaDe(VALORES), formaDe(VALORES)).length;
  assert.ok(sitio < app, `un sitio (${sitio}) tendria que traer menos archivos que una aplicacion (${app})`);
  assert.match(r.salida, new RegExp(`Cuántos archivos\\s+${sitio}\\b`));
  fs.rmSync(r.base, { recursive: true, force: true });
});

test("los pasos anunciados salen del MISMO filtro que los que corren", () => {
  // Dos copias de esta regla darian una vista previa que anuncia pasos distintos
  // de los que despues corren, y nadie se enteraria hasta el minuto ocho.
  const deSitio = pasosSegunElManifiesto(manifiestoPodado(ANDAMIO, "sitio")).corren.map((p) => p.clave);
  const deApp = pasosSegunElManifiesto(manifiestoPodado(ANDAMIO, "aplicacion")).corren.map((p) => p.clave);
  assert.ok(deApp.includes("datos"), "el manifiesto de una aplicacion tendria que traer el script de datos");
  assert.ok(!deSitio.includes("datos"), "el manifiesto podado de un sitio no tendria que traerlo");
  assert.ok(deSitio.length > 0 && deSitio.length < PASOS_DEL_ARRANQUE.length, `un sitio corre ${deSitio.length} pasos`);
});

test("si no se puede leer el manifiesto NO se poda: anunciar de menos esconde un paso", () => {
  assert.equal(manifiestoPodado("/no/existe", "aplicacion"), null);
  assert.deepEqual(
    pasosSegunElManifiesto(null).corren.map((p) => p.clave),
    PASOS_DEL_ARRANQUE.map((p) => p.clave),
    "sin manifiesto tendria que anunciar todos: correr de mas da un error honesto, correr de menos esconde un paso",
  );
});

test("AVISA si la carpeta ya tiene cosas, en vez de dejar que choque despues", () => {
  // Es justo cuando mas sirve mirar antes: la corrida real se va a negar, y
  // enterarse aca cuesta cero.
  const r = corridaDeVistaPrevia(VALORES, (d) => fs.writeFileSync(path.join(d, "mi-archivo.txt"), "x"));
  assert.match(r.salida, /YA TIENE 1 archivo/, `no aviso de la carpeta ocupada:\n${r.salida}`);
  assert.match(r.salida, /mi-archivo\.txt/, "no dice cual es el archivo que hay");
  assert.match(r.salida, /se va a negar/, "no dice que va a pasar por eso");
  assert.deepEqual(r.quedo, ["mi-archivo.txt"], "ademas de avisar, escribio algo");
  fs.rmSync(r.base, { recursive: true, force: true });
});

test("dice lo que NO va a pasar, que es la mitad que tranquiliza", () => {
  const t = lineasDeVistaPrevia(ANDAMIO, os.tmpdir(), VALORES).join("\n");
  for (const [que, patron] of [
    ["que no se publica nada", /No se publica nada en internet/],
    ["que no cuesta dinero", /No se gasta un peso/],
    ["que no toca ninguna cuenta", /No se toca ninguna cuenta/],
    ["que no escribe fuera de la carpeta", /Fuera de esa carpeta no se escribe nada/],
  ]) {
    assert.match(t, patron, `la vista previa no dice ${que}, y es lo que mas tranquiliza a quien nunca hizo esto`);
  }
});

test("la ruta va ABSOLUTA: 'proyecto' a secas no dice donde", () => {
  const t = lineasDeVistaPrevia(ANDAMIO, "proyecto", VALORES).join("\n");
  assert.match(t, new RegExp(`Dónde\\s+${path.resolve("proyecto").replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
});

test("`--vista-previa` esta en la lista de banderas, asi que un typo recibe consejo", async () => {
  const { BANDERAS, sugerenciaDeBandera } = await import("../../herramientas/projects-init.mjs");
  assert.ok(BANDERAS.includes("--vista-previa"));
  assert.equal(sugerenciaDeBandera("--vista-previ"), " — ¿quisiste decir --vista-previa?");
});

test("la ayuda la nombra: una bandera que nadie sabe que existe no existe", () => {
  const r = spawnSync(process.execPath, [HERRAMIENTA, "--help"], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  const t = `${r.stdout ?? ""}${r.stderr ?? ""}`;
  assert.match(t, /--vista-previa/, "`--help` no nombra --vista-previa");
  assert.match(t, /NO escribe nada/, "la ayuda no dice lo unico que importa de esa bandera");
});
