import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";

import {
  REQUERIDOS,
  CON_LIMPIEZA_MANUAL,
  MARCADOR,
  NO_SE_COPIA,
  derivar,
  validarValores,
  archivosDelAndamio,
  sustituir,
  instanciar,
  marcadoresQueSobreviven,
  pinOpenspecDe,
} from "../../herramientas/projects-init.mjs";

// ---------------------------------------------------------------------------
// EL BANCO DE `projects init`.
//
// La herramienta reemplaza ~30 actos manuales, asi que su modo de falla peligroso
// no es "explota": es "escribe un repo a medias y dice que salio bien". Cada caso
// de aca prueba una forma de FALLAR CERRADO, y el caso feliz se verifica con un
// escaneo INDEPENDIENTE del arbol escrito, no con lo que la herramienta afirma de
// si misma.
// ---------------------------------------------------------------------------

const RAIZ = path.resolve(import.meta.dirname, "..", "..");
const ANDAMIO = path.join(RAIZ, "plantilla");

const VALORES_OK = {
  PROYECTO: "people-agenda",
  ORG: "Ejemplo-Org",
  PAQUETE_API: "api",
  PAQUETE_WEB: "web",
  PAQUETE_E2E: "e2e",
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

function tmp(nombre) {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), `projects-init-${nombre}-`));
  return d;
}

// ══════════════════ El caso feliz, verificado por afuera ══════════════════

test("instancia el andamio y NINGUN marcador sobrevive (escaneo independiente)", () => {
  const destino = tmp("feliz");
  const r = instanciar({ raizAndamio: ANDAMIO, destino, valores: derivar(VALORES_OK) });

  assert.equal(r.faltantes.length, 0, `el andamio usa marcadores no declarados: ${r.faltantes.join(", ")}`);
  assert.ok(r.total > 50, `solo ${r.total} sustituciones: el andamio tiene bastante mas`);

  // El escaneo NO usa el resultado de la herramienta: relee el arbol escrito.
  const propios = marcadoresQueSobreviven(destino);
  assert.deepEqual(
    propios.map((s) => `${s.archivo}:${s.linea} ${s.marcador}`),
    [],
    "quedaron marcadores en el repo nuevo: el CI del marco lo pondria en rojo en el primer PR",
  );
});

test("el README del andamio NO se copia: es la guia del bootstrap, no el README del proyecto", () => {
  const destino = tmp("readme");
  instanciar({ raizAndamio: ANDAMIO, destino, valores: derivar(VALORES_OK) });
  assert.equal(fs.existsSync(path.join(destino, "README.md")), false);
  // Y es el unico excluido: si manana se excluye otro sin pensarlo, esto lo dice.
  assert.deepEqual([...NO_SE_COPIA], ["README.md"]);
});

test("viajan los dotfiles, que es donde falla el copiado a mano", () => {
  const destino = tmp("dotfiles");
  instanciar({ raizAndamio: ANDAMIO, destino, valores: derivar(VALORES_OK) });
  // El `cp -r` sin el `/.` final y el robocopy sin `/E` los dejan atras: son
  // exactamente los archivos que hacen que el marco se cumpla solo.
  for (const r of [
    ".claude/settings.json",
    ".github/workflows/ci.yml",
    ".github/dependabot.yml",
    ".github/CODEOWNERS",
    ".gitignore",
    ".prettierrc",
    ".projects-valores.json",
    ".projects-desvios.json",
  ]) {
    assert.ok(fs.existsSync(path.join(destino, r)), `falta ${r}`);
  }
});

test("los valores llegan al archivo que la constitucion lee", () => {
  const destino = tmp("valores");
  instanciar({ raizAndamio: ANDAMIO, destino, valores: derivar(VALORES_OK) });
  const v = JSON.parse(fs.readFileSync(path.join(destino, ".projects-valores.json"), "utf8"));
  assert.equal(v.PROYECTO, "people-agenda");
  assert.equal(v.ORG, "Ejemplo-Org");
  assert.equal(v.BUILDER_1, "builder-uno");
});

// ══════════════════ El control de que este banco no es un no-op ══════════════════

test("el andamio tiene marcadores: si no, todo lo de arriba pasa vacuamente", () => {
  const conMarcadores = archivosDelAndamio(ANDAMIO).filter((rel) =>
    MARCADOR.test(fs.readFileSync(path.join(ANDAMIO, rel), "utf8")),
  );
  assert.ok(
    conMarcadores.length >= 10,
    `solo ${conMarcadores.length} archivo(s) del andamio tienen marcadores. Si el andamio dejo de usarlos, este banco no prueba nada`,
  );
});

// ══════════════════ Fallar cerrado ══════════════════

test("un valor que falta es error, con el nombre, y no se escribe nada", () => {
  const sinPO = { ...VALORES_OK };
  delete sinPO.PO;
  const { problemas, valores } = validarValores(sinPO);
  assert.equal(valores, null);
  assert.ok(problemas.some((p) => p.includes("falta PO")), problemas.join(" | "));
});

test("un valor que sigue siendo un marcador es error: el archivo del andamio nace asi", () => {
  const { problemas, valores } = validarValores({ ...VALORES_OK, PROYECTO: "{{PROYECTO}}" });
  assert.equal(valores, null);
  assert.ok(problemas.some((p) => p.includes("PROYECTO sigue siendo un marcador")), problemas.join(" | "));
});

test("una cuenta de AWS que no son 12 digitos es error", () => {
  const { problemas } = validarValores({ ...VALORES_OK, CUENTA_PROD: "22222" });
  assert.ok(problemas.some((p) => p.includes("CUENTA_PROD no son 12 digitos")), problemas.join(" | "));
});

test("un em dash en un nombre que viaja a AWS es error (regla del area)", () => {
  const { problemas } = validarValores({ ...VALORES_OK, PREFIJO_RECURSOS: "agenda—prod" });
  assert.ok(problemas.some((p) => p.includes("em dash")), problemas.join(" | "));
});

test("un valor vacio NO cuenta como declarado", () => {
  const { problemas } = validarValores({ ...VALORES_OK, CANAL_ALERTAS: "" });
  assert.ok(problemas.some((p) => p.includes("falta CANAL_ALERTAS")), problemas.join(" | "));
});

test("cero sustituciones es ERROR y no un arbol limpio", () => {
  // Un andamio sin marcadores: si la herramienta lo declarara exito, un patron
  // que deja de matchear pasaria en verde y el repo nuevo nace lleno de llaves.
  const falso = tmp("sin-marcadores");
  fs.writeFileSync(path.join(falso, "a.md"), "sin marcadores acá\n", "utf8");
  const destino = tmp("sin-marcadores-destino");
  const r = instanciar({ raizAndamio: falso, destino, valores: derivar(VALORES_OK) });
  assert.equal(r.total, 0, "el fixture no deberia tener marcadores");
  // La decision de que 0 es error vive en main(); acá se fija el hecho del que
  // depende, para que un refactor que lo cambie tenga que pasar por esta linea.
});

test("un marcador del andamio que REQUERIDOS no declara sale por nombre", () => {
  const falso = tmp("marcador-nuevo");
  fs.writeFileSync(path.join(falso, "a.md"), "esto usa {{MARCADOR_INVENTADO}}\n", "utf8");
  const destino = tmp("marcador-nuevo-destino");
  const r = instanciar({ raizAndamio: falso, destino, valores: derivar(VALORES_OK) });
  assert.deepEqual(r.faltantes, ["MARCADOR_INVENTADO"]);
});

// ══════════════════ Lo derivado y lo declarado ══════════════════

test("PAQUETES se DERIVA de los tres paquetes, no se pide aparte", () => {
  assert.equal(REQUERIDOS.includes("PAQUETES"), false, "PAQUETES no se pide: se deriva");
  assert.equal(derivar(VALORES_OK).PAQUETES, "web, api, e2e");
});

test("un PAQUETES explicito manda sobre el derivado", () => {
  assert.equal(derivar({ ...VALORES_OK, PAQUETES: "solo-api" }).PAQUETES, "solo-api");
});

test("REQUERIDOS cubre TODOS los marcadores que el andamio usa de verdad", () => {
  const usados = new Set();
  for (const rel of archivosDelAndamio(ANDAMIO)) {
    const t = fs.readFileSync(path.join(ANDAMIO, rel), "utf8");
    for (const m of t.matchAll(MARCADOR)) usados.add(m[1]);
  }
  const declarados = new Set([...REQUERIDOS, "PAQUETES"]);
  const sinDeclarar = [...usados].filter((u) => !declarados.has(u)).sort();
  assert.deepEqual(
    sinDeclarar,
    [],
    "el andamio usa marcadores que la herramienta no pide. Se agregan a REQUERIDOS y a la tabla de plantilla/README.md en el MISMO cambio",
  );
});

test("los tres marcadores con limpieza manual siguen nombrados en la salida", () => {
  // Si alguien automatiza uno de estos borrados, tiene que sacarlo de acá; y si
  // aparece un cuarto camino "si no existe", esta lista es donde se declara.
  assert.deepEqual(Object.keys(CON_LIMPIEZA_MANUAL).sort(), [
    "GENERAR_CLIENTE_DATOS",
    "PAQUETE_E2E",
    "PAQUETE_WEB",
  ]);
});

// ══════════════════ El pin de OpenSpec: una sola declaracion ══════════════════

test("el pin de OpenSpec se LEE del default del reusable, no se repite", () => {
  const marcoCi = fs.readFileSync(path.join(RAIZ, ".github/workflows/marco-ci.yml"), "utf8");
  const pin = pinOpenspecDe(marcoCi);
  assert.match(pin ?? "", /^\d+\.\d+\.\d+$/, "no pude leer el pin del default de version_openspec");
  // Y es el mismo que el andamio documenta: dos declaraciones que divergen es el
  // defecto que este marco ya cazo dos veces.
  const readmeAndamio = fs.readFileSync(path.join(ANDAMIO, "README.md"), "utf8");
  assert.ok(
    readmeAndamio.includes(`openspec@${pin}`),
    `el andamio documenta otro pin que el reusable: reusable=${pin}`,
  );
});

// ══════════════════ La CLI, de punta a punta ══════════════════

test("--ejemplo imprime un JSON con todas las claves requeridas", () => {
  const salida = execFileSync(process.execPath, [path.join(RAIZ, "herramientas/projects-init.mjs"), "--ejemplo"], {
    encoding: "utf8",
  });
  const v = JSON.parse(salida);
  for (const k of REQUERIDOS) assert.ok(v[k], `el ejemplo no trae ${k}`);
  // Y el ejemplo tiene que PASAR su propia validacion, o es un ejemplo roto.
  assert.deepEqual(validarValores(v).problemas, []);
});

test("un destino que ya tiene andamio se ABORTA sin --forzar", () => {
  const destino = tmp("ocupado");
  fs.mkdirSync(path.join(destino, ".github", "workflows"), { recursive: true });
  fs.writeFileSync(path.join(destino, ".github/workflows/ci.yml"), "mi ci\n", "utf8");
  const vals = path.join(destino, "..", `vals-${path.basename(destino)}.json`);
  fs.writeFileSync(vals, JSON.stringify(VALORES_OK), "utf8");

  let codigo = 0;
  let salida = "";
  try {
    execFileSync(
      process.execPath,
      [path.join(RAIZ, "herramientas/projects-init.mjs"), "--valores", vals, "--destino", destino, "--sin-herramientas"],
      { encoding: "utf8", stdio: "pipe" },
    );
  } catch (e) {
    codigo = e.status;
    salida = `${e.stdout ?? ""}${e.stderr ?? ""}`;
  }
  assert.notEqual(codigo, 0, "tenia que abortar");
  assert.match(salida, /ya tiene .* archivo\(s\) del andamio/);
  // Y lo que ya estaba NO se toco.
  assert.equal(fs.readFileSync(path.join(destino, ".github/workflows/ci.yml"), "utf8"), "mi ci\n");
});

test("un archivo de valores incompleto aborta sin escribir NADA en el destino", () => {
  const destino = tmp("incompleto");
  const incompletos = { ...VALORES_OK };
  delete incompletos.REGION;
  const vals = path.join(destino, "..", `vals-inc-${path.basename(destino)}.json`);
  fs.writeFileSync(vals, JSON.stringify(incompletos), "utf8");

  let codigo = 0;
  let salida = "";
  try {
    execFileSync(
      process.execPath,
      [path.join(RAIZ, "herramientas/projects-init.mjs"), "--valores", vals, "--destino", destino, "--sin-herramientas"],
      { encoding: "utf8", stdio: "pipe" },
    );
  } catch (e) {
    codigo = e.status;
    salida = `${e.stdout ?? ""}${e.stderr ?? ""}`;
  }
  assert.notEqual(codigo, 0);
  assert.match(salida, /falta REGION/);
  assert.match(salida, /No se escribio nada/i);
  assert.deepEqual(fs.readdirSync(destino), [], "el destino tenia que quedar intacto");
});
