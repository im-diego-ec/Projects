import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  COMO_SE_DESTRABA,
  ESTADOS_SIN_MEDICION,
  TITULO_SIN_MEDICION,
  bloqueDeProteccion,
} from "../../herramientas/projects-init.mjs";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const HERRAMIENTA = path.join(RAIZ, "herramientas/projects-init.mjs");

// ---------------------------------------------------------------------------
// "EL DOCUMENTO DICE COMO DESTRABAR LA SONDA" NO ES DECIR COMO DESTRABARLA.
//
// La sonda de proteccion de main tiene cinco formas de NO poder mirar, y cada una
// tiene un arreglo distinto: instalar un programa, entrar a una cuenta, mirar la
// red, esperar al primer push, o reportar. Los cinco arreglos estaban escritos
// --dentro de la funcion que escribe el documento-- y ninguno llegaba a la
// pantalla: la terminal imprimia el identificador crudo entre parentesis
// ("NO SE PUDO MEDIR (sin-auth)") y mandaba a abrir un archivo.
//
// Un consejo que esta en el proceso y se manda a buscar a otro lado es un consejo
// que no se dio.
// ---------------------------------------------------------------------------

test("los cinco estados sin medicion tienen titulo y arreglo, sin huecos", () => {
  for (const estado of ESTADOS_SIN_MEDICION) {
    assert.ok(TITULO_SIN_MEDICION[estado], `${estado} no tiene una frase en castellano: saldria el identificador crudo`);
    const pasos = COMO_SE_DESTRABA[estado];
    assert.ok(Array.isArray(pasos) && pasos.length, `${estado} no dice como se destraba`);
    assert.ok(pasos.join(" ").trim().length > 20, `el arreglo de ${estado} es demasiado corto para ser uno`);
  }
});

test("ningun arreglo se limita a mandar a leer el documento", () => {
  for (const [estado, pasos] of Object.entries(COMO_SE_DESTRABA)) {
    const t = pasos.join(" ");
    assert.ok(
      /corré|Corré|Instalá|Reintentá|Volvé|Copiá/.test(t),
      `el arreglo de ${estado} no nombra una accion concreta: "${t}"`,
    );
  }
});

test("los mapas los usan LOS DOS: el documento y la terminal", () => {
  // Mientras vivieron dentro del que escribe el documento, la terminal no podia
  // verlos. Que el documento los siga usando es la mitad que ya funcionaba; que
  // la terminal los lea es la que faltaba.
  for (const estado of ESTADOS_SIN_MEDICION) {
    const { lineas } = bloqueDeProteccion({ estado, detalle: "d", org: "o", proyecto: "p", fecha: new Date(0) });
    const texto = lineas.join("\n");
    assert.ok(texto.includes(COMO_SE_DESTRABA[estado][0]), `el documento perdio el arreglo de ${estado}`);
  }
  const fuente = fs.readFileSync(HERRAMIENTA, "utf8");
  assert.ok(
    /for \(const linea of COMO_SE_DESTRABA\[proteccion\.estado\]/.test(fuente),
    "la terminal no recorre COMO_SE_DESTRABA: vuelve a mandar a abrir el documento",
  );
});

test("MEDIDO de punta a punta: sin `gh` en el PATH, la pantalla dice que hacer", () => {
  // No se simula el estado: se le saca `gh` del PATH a una corrida de verdad y se
  // lee lo que salio por pantalla. Es el unico modo de comprobar que el texto
  // atraviesa las tres capas --sonda, clasificador, impresion-- y no se pierde en
  // ninguna.
  const base = fs.mkdtempSync(path.join(os.tmpdir(), "destrabar-"));
  // El destino tiene que EXISTIR: la herramienta se niega a escribir en una ruta
  // que no esta, porque el repo se crea antes que el andamio.
  const destino = path.join(base, "proyecto");
  fs.mkdirSync(destino, { recursive: true });
  const valores = path.join(base, "valores.json");
  fs.writeFileSync(
    valores,
    JSON.stringify({
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
    }),
  );

  // Un PATH vacio es lo que convierte la sonda en `sin-gh`. `node` no lo necesita
  // --se invoca por ruta absoluta-- y `--sin-arranque` evita que haga falta pnpm.
  const vacio = fs.mkdtempSync(path.join(os.tmpdir(), "path-vacio-"));
  let salida = "";
  try {
    salida = execFileSync(
      process.execPath,
      [HERRAMIENTA, "--sin-arranque", "--valores", valores, "--destino", destino, "--sin-herramientas"],
      { encoding: "utf8", stdio: "pipe", env: { ...process.env, PATH: vacio, Path: vacio } },
    );
  } catch (e) {
    salida = `${e.stdout ?? ""}${e.stderr ?? ""}`;
  }

  assert.match(salida, /NO SE PUDO MEDIR/, `la corrida no llego al bloque de proteccion:\n${salida.slice(-1500)}`);
  assert.match(salida, /no encontr. .gh. en el PATH/, "no dice en castellano que fue lo que paso");
  assert.match(salida, /cli\.github\.com/, "no dice de donde se baja gh: el arreglo no llego a la pantalla");
  assert.match(salida, /gh auth login/, "no dice el segundo paso");
  assert.ok(
    !/NO SE PUDO MEDIR \(sin-gh\)/.test(salida),
    "sigue imprimiendo el identificador crudo entre parentesis, que es una clave de un objeto y no una frase",
  );
  fs.rmSync(base, { recursive: true, force: true });
  fs.rmSync(vacio, { recursive: true, force: true });
});
