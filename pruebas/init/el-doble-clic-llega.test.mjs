import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { lineasDelPasoQueSigue } from "../../herramientas/projects-init.mjs";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const HERRAMIENTA = path.join(RAIZ, "herramientas/projects-init.mjs");

// ---------------------------------------------------------------------------
// EL CAMINO DEL DOBLE CLIC TERMINABA EN UN CALLEJON, Y EL UNICO CARTEL APUNTABA
// A UN PRECIPICIO.
//
// Los tres lanzadores hacen `cd` a su propia carpeta --la raiz del clon del
// marco-- y corren ahi el asistente. Al terminar, la herramienta imprimia
// «El paso que sigue, aca mismo: … --valores valores.json --destino .», y el
// lanzador remataba con «El paso que sigue esta impreso arriba».
//
// MEDIDO, corriendo ese comando tal cual desde el clon:
//     ::error::el destino ya tiene 16 archivo(s) del andamio.
//              Se aborta para no sobreescribir trabajo
// No arma nada, NUNCA, en ninguna maquina. Y lo unico que la pantalla ofrecia
// para destrabarlo era `--forzar`, que sobre el clon del marco significa pisar
// el marco con el andamio.
//
// O sea: el recorrido de la persona que NO abre una terminal --el que este marco
// existe para servir-- no llegaba a ningun proyecto. Lo encontro una auditoria
// multi-agente y tres refutadores independientes no pudieron tumbarlo.
// ---------------------------------------------------------------------------

test("con las respuestas en el clon, el paso que sigue NO dice `--destino .`", () => {
  const t = lineasDelPasoQueSigue(path.join(RAIZ, "valores.json"), "people-agenda").join("\n");
  assert.ok(!/--destino \.\s*$/m.test(t), `sigue mandando a armar el proyecto dentro del clon:\n${t}`);
  assert.match(t, /DENTRO del clon del marco/, "no explica por que la carpeta de al lado");
  assert.match(t, /mkdir -p /, "no dice como crear la carpeta que el destino necesita");
});

test("la carpeta que propone es HERMANA del clon y lleva el nombre elegido", () => {
  const t = lineasDelPasoQueSigue(path.join(RAIZ, "valores.json"), "people-agenda").join("\n");
  const esperada = path.join(path.dirname(RAIZ), "people-agenda");
  assert.ok(t.includes(esperada), `esperaba ${esperada} y salio:\n${t}`);
  assert.ok(!t.includes(path.join(RAIZ, "people-agenda")), "propuso una carpeta DENTRO del clon");
});

test("fuera del clon, `--destino .` sigue siendo el correcto", () => {
  // Quien corre el asistente parado en la carpeta de su proyecto no tiene ningun
  // problema, y cambiarle el consejo seria arreglar lo que no estaba roto.
  const t = lineasDelPasoQueSigue("/una/carpeta/cualquiera/valores.json", "x").join("\n");
  assert.match(t, /--destino \./, "le cambio el consejo a quien lo tenia bien");
  assert.ok(!/DENTRO del clon/.test(t));
});

test("MEDIDO de punta a punta: el comando propuesto ARMA el proyecto de verdad", () => {
  // No se lee el texto: se extrae el comando que la herramienta imprime y SE LO
  // CORRE. Es la unica forma de saber que el callejon se cerro; la version
  // anterior tambien "decia" un paso que sigue, y ese paso no armaba nada.
  const base = fs.mkdtempSync(path.join(os.tmpdir(), "doble-clic-"));
  const clon = path.join(base, "Projects");
  fs.mkdirSync(clon);
  fs.cpSync(path.join(RAIZ, "herramientas"), path.join(clon, "herramientas"), { recursive: true });
  fs.cpSync(path.join(RAIZ, "plantilla"), path.join(clon, "plantilla"), { recursive: true });
  fs.cpSync(path.join(RAIZ, ".github"), path.join(clon, ".github"), { recursive: true });
  const valores = {
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
  fs.writeFileSync(path.join(clon, "valores.json"), JSON.stringify(valores));

  const texto = lineasDelPasoQueSigue(path.join(clon, "valores.json"), "people-agenda", clon).join("\n");
  const mkdir = /mkdir -p (\S+)/.exec(texto);
  const cmd = /node (\S+) --valores (\S+) --destino (\S+)/.exec(texto);
  assert.ok(mkdir && cmd, `no se pudo extraer el comando propuesto:\n${texto}`);

  fs.mkdirSync(mkdir[1], { recursive: true });
  const r = spawnSync(
    process.execPath,
    [
      path.join(clon, "herramientas/projects-init.mjs"),
      "--sin-arranque",
      "--sin-herramientas",
      "--valores",
      cmd[2],
      "--destino",
      cmd[3],
    ],
    {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  const salida = `${r.stdout ?? ""}${r.stderr ?? ""}`;
  assert.equal(r.status, 0, `el comando que la herramienta propone NO arma el proyecto:\n${salida.slice(-900)}`);
  assert.ok(fs.existsSync(path.join(cmd[3], "package.json")), "salio 0 y no dejo un proyecto");
  // Y el clon del marco quedo intacto: nada del andamio se escribio adentro.
  assert.ok(!fs.existsSync(path.join(clon, "docker-compose.yml")), "el andamio se escribio DENTRO del clon del marco");
  fs.rmSync(base, { recursive: true, force: true });
});

test("MEDIDO: el comando VIEJO fallaba, asi que el caso de arriba mide algo", () => {
  // Anti-vacuidad: si `--destino .` sobre el clon tambien pasara, cerrar el
  // callejon no habria sido un arreglo. Se corre el comando viejo tal cual.
  const base = fs.mkdtempSync(path.join(os.tmpdir(), "callejon-"));
  const clon = path.join(base, "Projects");
  fs.mkdirSync(clon);
  fs.cpSync(path.join(RAIZ, "herramientas"), path.join(clon, "herramientas"), { recursive: true });
  fs.cpSync(path.join(RAIZ, "plantilla"), path.join(clon, "plantilla"), { recursive: true });
  fs.cpSync(path.join(RAIZ, ".github"), path.join(clon, ".github"), { recursive: true });
  fs.writeFileSync(path.join(clon, "valores.json"), fs.readFileSync(path.join(RAIZ, "plantilla/package.json")));
  const r = spawnSync(
    process.execPath,
    [path.join(clon, "herramientas/projects-init.mjs"), "--sin-arranque", "--valores", "valores.json", "--destino", "."],
    {
      cwd: clon,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  assert.notEqual(r.status, 0, "`--destino .` sobre el clon del marco pasa: el callejon no era un callejon");
  fs.rmSync(base, { recursive: true, force: true });
});

test("LOS DOS LANZADORES arman el proyecto, no lo dejan como tarea", () => {
  // Un lanzador que termina diciendo "el paso que sigue esta impreso arriba" le
  // deja a la persona que NO abre una terminal el trabajo de copiar un comando de
  // ochenta caracteres. Ahora lo hace el.
  for (const [archivo, patrones] of [
    [
      "arrancar.sh",
      [/Paso 2 — armando tu proyecto/, /mkdir -p "\$DESTINO"/, /--valores "\$AQUI\/valores\.json" --destino "\$DESTINO"/],
    ],
    [
      "arrancar.cmd",
      [/Paso 2 - armando tu proyecto/, /mkdir "%DESTINO%"/, /--valores "%~dp0valores\.json" --destino "%DESTINO%"/],
    ],
  ]) {
    const t = fs.readFileSync(path.join(RAIZ, archivo), "utf8");
    for (const p of patrones) assert.match(t, p, `${archivo} no llega a armar el proyecto: falta ${p}`);
    assert.ok(!/El paso que sigue esta impreso arriba/.test(t), `${archivo} sigue delegando el paso 2 a la persona`);
  }
});

test("la carpeta del proyecto se crea AL LADO del clon, en los dos lanzadores", () => {
  // Adentro del clon es el error que este lote cierra; y el nombre no se vuelve a
  // preguntar, se lee de lo que la persona ya contesto.
  const sh = fs.readFileSync(path.join(RAIZ, "arrancar.sh"), "utf8");
  assert.match(sh, /cd "\$AQUI\/\.\." && pwd/, "arrancar.sh no arma el destino al lado del clon");
  assert.match(sh, /\.PROYECTO/, "arrancar.sh no lee el nombre elegido: lo estaria preguntando de nuevo");
  const cmd = fs.readFileSync(path.join(RAIZ, "arrancar.cmd"), "utf8");
  assert.match(cmd, /%~dp0\.\./, "arrancar.cmd no arma el destino al lado del clon");
  assert.match(cmd, /\.PROYECTO/, "arrancar.cmd no lee el nombre elegido");
});

test("el clon no queda sucio: lo que el asistente deja ahi esta ignorado", () => {
  const ig = fs.readFileSync(path.join(RAIZ, ".gitignore"), "utf8");
  for (const f of ["valores.json", ".projects-respuestas.json", ".projects-desvios.json"]) {
    assert.ok(new RegExp(`^${f.replace(/\./g, "\\.")}$`, "m").test(ig), `el .gitignore del marco no ignora ${f}`);
  }
});
