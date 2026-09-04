import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  NOMBRE_BITACORA,
  abrirBitacora,
  baseDeBitacora,
  encabezadoDeBitacora,
  escribirBitacora,
} from "../../herramientas/projects-init.mjs";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const HERRAMIENTA = path.join(RAIZ, "herramientas/projects-init.mjs");

// ---------------------------------------------------------------------------
// CUANDO ALGO MUERE EN EL MINUTO OCHO, NO QUEDABA NADA.
//
// El arranque tarda minutos y escribe cientos de lineas. Si algo fallaba tarde, lo
// que la persona tenia era una terminal con el rojo perdido cuatro pantallas
// arriba; si cerraba la ventana, nada. Pedir ayuda entonces es escribir "me dio un
// error", que es la peor forma de pedir ayuda y era la unica disponible.
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

/** Corre la herramienta de verdad y devuelve lo que salio y lo que quedo escrito. */
function corrida(valores) {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), "bitacora-"));
  const destino = path.join(base, "proyecto");
  fs.mkdirSync(destino);
  const ruta = path.join(base, "valores.json");
  fs.writeFileSync(ruta, JSON.stringify(valores));
  // `spawnSync` y no `execFileSync`: la version que tira devuelve SOLO stdout
  // cuando sale bien, y el aviso de la bitacora va por stderr a proposito. Con
  // execFileSync este banco no veia el aviso del camino exitoso.
  const r = spawnSync(
    process.execPath,
    [HERRAMIENTA, "--sin-arranque", "--sin-herramientas", "--valores", ruta, "--destino", destino],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
  );
  const codigo = r.status ?? -1;
  const salida = `${r.stdout ?? ""}${r.stderr ?? ""}`;
  const soloStdout = r.stdout ?? "";
  const soloStderr = r.stderr ?? "";
  // La ruta sale de lo que la herramienta IMPRIMIO, no de donde el banco supone
  // que la dejo: es lo unico que comprueba que la persona la va a encontrar.
  const m = new RegExp(`^\\s*(\\S*${NOMBRE_BITACORA})$`, "m").exec(salida);
  const archivo = m ? m[1] : null;
  return {
    salida,
    soloStdout,
    soloStderr,
    codigo,
    base,
    destino,
    archivo,
    existe: Boolean(archivo) && fs.existsSync(archivo),
    texto: archivo && fs.existsSync(archivo) ? fs.readFileSync(archivo, "utf8") : "",
  };
}

test("cuando la corrida FALLA, queda el archivo y la pantalla dice donde", () => {
  // Es el caso que la bitacora existe para cubrir.
  const r = corrida({ PROYECTO: "x" });
  assert.notEqual(r.codigo, 0, "esta corrida tendria que fallar");
  assert.ok(r.existe, "fallo y no quedo la bitacora: la persona se queda otra vez sin nada que mandar");
  assert.match(r.salida, /quedo copiado en un archivo/, "no dice que el archivo existe");
  assert.ok(path.isAbsolute(r.archivo), `no dice la ruta completa, dijo "${r.archivo}"`);
  // Y NO EN EL DESTINO: un fallo tiene que dejar el destino intacto, y ademas ese
  // archivo trabaria el reintento contra el guard del destino ocupado.
  assert.ok(
    !fs.existsSync(path.join(r.destino, NOMBRE_BITACORA)),
    "la bitacora del fallo quedo en el destino: rompe la garantia de no dejar nada y traba el reintento",
  );
  assert.deepEqual(fs.readdirSync(r.destino), [], "el destino no quedo intacto despues de un fallo");
  // Y trae el rojo, no solo el encabezado.
  assert.match(r.texto, /falta/i, "la bitacora no contiene el diagnostico que salio por pantalla");
  fs.rmSync(r.base, { recursive: true, force: true });
});

test("cuando la corrida SALE BIEN tambien queda, y por eso se sabe que existe", () => {
  // Un archivo que solo aparece cuando algo falla es uno que nadie sabe que
  // existe hasta que lo necesita, y entonces no sabe buscarlo.
  const r = corrida(VALORES);
  assert.equal(r.codigo, 0, `esta corrida tendria que pasar:\n${r.salida.slice(-800)}`);
  assert.ok(r.existe, "salio bien y no quedo la bitacora");
  assert.match(r.salida, /quedo copiado en:/);
  // Cuando salio bien SI va en el proyecto: es la carpeta que la persona sabe abrir.
  assert.equal(r.archivo, path.join(r.destino, NOMBRE_BITACORA), `quedo en ${r.archivo} y no en el proyecto`);
  fs.rmSync(r.base, { recursive: true, force: true });
});

test("la bitacora trae los datos que hacen falta para entender un rojo ajeno", () => {
  const r = corrida(VALORES);
  for (const [que, patron] of [
    ["el sistema", /sistema\s+\w+/],
    ["la version de Node", /node\s+v\d+/],
    ["la version del marco", /marco\s+\S+/],
    ["las banderas con las que se la llamo", /invocacion\s+.*--destino/],
    ["cuando fue", /cuando\s+\d{4}-\d{2}-\d{2}/],
  ]) {
    assert.match(r.texto, patron, `la bitacora no dice ${que}, y sin eso el rojo no se puede reproducir`);
  }
  // Y dice lo que NO tiene, que es la mitad honesta: la salida de pnpm se
  // imprime en vivo y no pasa por aca.
  assert.match(r.texto, /Lo que NO esta aca/, "no declara su propio limite: quien la lea va a creer que esta todo");
  fs.rmSync(r.base, { recursive: true, force: true });
});

test("la bitacora es una COPIA: lo que salio por pantalla esta adentro", () => {
  // Sin esto, un archivo con solo el encabezado pasaria los casos de arriba y no
  // serviria para nada.
  const r = corrida(VALORES);
  const cuerpo = r.texto.slice(r.texto.indexOf("─".repeat(72)));
  const deLaPantalla = r.salida.split("\n").filter((l) => l.trim().length > 25 && !l.includes(NOMBRE_BITACORA));
  assert.ok(deLaPantalla.length > 20, `la corrida imprimio solo ${deLaPantalla.length} lineas largas: el caso mediria poco`);
  const faltantes = deLaPantalla.filter((l) => !cuerpo.includes(l.trim()));
  assert.ok(
    faltantes.length <= deLaPantalla.length * 0.1,
    `${faltantes.length} de ${deLaPantalla.length} lineas de la pantalla NO estan en la bitacora, p.ej.: ${faltantes[0]}`,
  );
  fs.rmSync(r.base, { recursive: true, force: true });
});

test("el andamio la ignora: no viaja en el primer commit", () => {
  // Lleva el sistema, la version de Node y las banderas de UNA corrida en UNA
  // maquina. No es del proyecto.
  const ig = fs.readFileSync(path.join(RAIZ, "plantilla/.gitignore"), "utf8");
  assert.ok(ig.includes(NOMBRE_BITACORA), `plantilla/.gitignore no ignora ${NOMBRE_BITACORA}`);
});

test("interviene la consola y la DEVUELVE: un banco no puede quedarse con ella tocada", () => {
  const falsa = { log: () => {}, error: () => {}, warn: () => {} };
  const antes = { ...falsa };
  const b = abrirBitacora(falsa);
  falsa.log("una linea");
  falsa.error("un rojo");
  falsa.warn("un aviso");
  assert.deepEqual(b.lineas, ["una linea", "! un rojo", "! un aviso"], "no copio lo que se imprimio");
  b.cerrar();
  assert.equal(falsa.log, antes.log, "no devolvio console.log");
  assert.equal(falsa.error, antes.error, "no devolvio console.error");
  assert.equal(falsa.warn, antes.warn, "no devolvio console.warn");
});

test("SIGUE IMPRIMIENDO mientras copia: la bitacora no puede robarse la pantalla", () => {
  // Es el modo de falla que convierte una mejora en un desastre: una herramienta
  // que guarda todo y no muestra nada.
  const visto = [];
  const falsa = { log: (...a) => visto.push(a.join(" ")), error: () => {}, warn: () => {} };
  const b = abrirBitacora(falsa);
  falsa.log("tiene que salir igual");
  b.cerrar();
  assert.deepEqual(visto, ["tiene que salir igual"], "la linea no llego a la pantalla");
});

test("si el destino no se puede escribir, cae a la carpeta temporal y NO rompe la corrida", () => {
  // Una bitacora que no se puede escribir no puede convertir un arranque exitoso
  // en un rojo: el archivo es una ayuda, no un requisito.
  const ruta = escribirBitacora(baseDeBitacora("/ruta/que/no/existe/jamas", 0), ["x"], ["cab"]);
  assert.ok(ruta, "no cayo a ningun lado: la corrida se quedaria sin bitacora en silencio");
  assert.ok(ruta.startsWith(os.tmpdir()), `cayo en ${ruta}, que no es la carpeta temporal`);
  assert.match(fs.readFileSync(ruta, "utf8"), /cab\nx/);
  fs.rmSync(ruta, { force: true });
});

test("no la abre al IMPORTARLA: solo cuando se la invoca como comando", () => {
  // Este mismo banco la importa. Si abrirla fuera un efecto del import, la consola
  // de todos los bancos que corren despues quedaria intervenida.
  const fuente = fs.readFileSync(HERRAMIENTA, "utf8");
  const entrada = fuente.slice(fuente.indexOf("if (meInvocaronAMi()) {"));
  assert.match(entrada, /const bitacora = abrirBitacora\(\);/, "la bitacora no se abre en el punto de entrada");
  const antes = fuente.slice(0, fuente.indexOf("if (meInvocaronAMi()) {"));
  assert.ok(
    !/^\s*abrirBitacora\(\)/m.test(antes),
    "se abre la bitacora fuera del punto de entrada: importar el modulo intervendria la consola",
  );
});

test("el encabezado no inventa la version cuando no hay git", () => {
  const e = encabezadoDeBitacora(["--destino", "/x"], "2020-01-01T00:00:00.000Z").join("\n");
  assert.match(e, /marco\s+\S+/, "no dice la version del marco");
  assert.ok(!/marco\s*$/m.test(e), "dejo el campo vacio en vez de decir que no la sabe");
});

test("un fallo NO la deja en el destino, y eso protege el reintento", () => {
  // El guard del destino ocupado mira si hay archivos. Una bitacora ahi convertiria
  // el arreglo de un rojo en "primero borra este archivo que te acabo de dejar".
  assert.deepEqual(baseDeBitacora("/proyecto", 1, "/tmp"), ["/tmp"], "un fallo la mandaria al destino");
  assert.deepEqual(baseDeBitacora("/proyecto", 2, "/tmp"), ["/tmp"]);
  assert.deepEqual(baseDeBitacora("/proyecto", 0, "/tmp"), ["/proyecto", "/tmp"], "al salir bien tiene que ir al proyecto");
  assert.deepEqual(baseDeBitacora(null, 0, "/tmp"), ["/tmp"], "sin destino solo queda la carpeta temporal");
});

test("el aviso NUNCA toca stdout, ni siquiera con destino y saliendo bien", () => {
  // stdout es de la herramienta: cualquier cosa que se le agregue puede estar
  // entrando a un archivo del otro lado de una tuberia. Se comprueba separando
  // los dos canales, que es lo unico que distingue este defecto.
  const r = corrida(VALORES);
  assert.equal(r.codigo, 0);
  assert.ok(!r.soloStdout.includes(NOMBRE_BITACORA), `el aviso de la bitacora se colo en stdout:\n${r.soloStdout.slice(-300)}`);
  assert.ok(r.soloStderr.includes(NOMBRE_BITACORA), "el aviso no salio por stderr: la persona no sabe que el archivo existe");
  fs.rmSync(r.base, { recursive: true, force: true });
});

test("sin destino no hay bitacora NI aviso: --ejemplo no arma nada", () => {
  // `--ejemplo` y `--help` no arman ningun proyecto, asi que no hay corrida que
  // diagnosticar. Dejar un archivo y anunciarlo es ruido sobre un comando que
  // normalmente se redirige a un archivo.
  const r = spawnSync(process.execPath, [HERRAMIENTA, "--ejemplo"], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  assert.equal(r.status, 0);
  assert.ok(!`${r.stdout}${r.stderr}`.includes(NOMBRE_BITACORA), "--ejemplo dejo o anuncio una bitacora que nadie pidio");
});

test("el aviso sale por STDERR, tambien cuando la corrida sale bien", () => {
  // Es el defecto que este archivo ya tenia documentado para el aviso de version
  // de Node y que la primera version de la bitacora reintrodujo: `--ejemplo`
  // escribe el JSON de valores en stdout, y dos lineas de texto pegadas al final
  // lo rompen. Se comprueba con la salida REAL, no leyendo el codigo.
  const json = execFileSync(process.execPath, [HERRAMIENTA, "--ejemplo"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  const leido = JSON.parse(json);
  assert.ok(leido.PROYECTO !== undefined, "el esqueleto salio sin claves");
  assert.ok(!json.includes(NOMBRE_BITACORA), "el aviso de la bitacora se colo en el stdout de --ejemplo y rompe el JSON");
});

test("la guia lo cuenta, y cuenta lo mismo que la herramienta hace", () => {
  // "Que no quede en papel" vale en las dos direcciones: una guia que promete un
  // archivo que no existe es tan mala como un archivo que nadie sabe que existe.
  const guia = fs.readFileSync(path.join(RAIZ, "docs/04-arrancar-acompanado.md"), "utf8");
  assert.ok(guia.includes(NOMBRE_BITACORA), `docs/04 no nombra ${NOMBRE_BITACORA}: el archivo existe y nadie lo sabe`);
  for (const [que, patron] of [
    ["que un fallo NO la deja en el proyecto", /fall(ó|o)\*\*, queda en la carpeta temporal/],
    ["que no lleva secretos", /No lleva secretos/],
    ["que la salida de pnpm no esta adentro", /NO trae\*\* es la salida de `pnpm`/],
  ]) {
    assert.match(guia, patron, `docs/04 no dice ${que}, que es donde la promesa se rompe si diverge`);
  }
});
