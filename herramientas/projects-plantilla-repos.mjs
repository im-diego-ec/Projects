#!/usr/bin/env node
// ---------------------------------------------------------------------------
// GENERA EL CONTENIDO DE UN REPOSITORIO PLANTILLA.
//
// QUE ES UN REPOSITORIO PLANTILLA, y por que existe. Es un PROYECTO YA ARMADO,
// publicado como template de GitHub. La persona aprieta "Use this template",
// recibe el proyecto entero, y despues corre un solo workflow que le pone sus
// valores. Dos clics y ningun programa instalado.
//
// POR QUE NO SE ARMA EL PROYECTO EN EL MOMENTO, con un workflow del marco. Se
// intento, y GitHub lo prohibe:
//
//   ! [remote rejected] main -> main (refusing to allow a GitHub App to create
//     or update workflow ... without `workflows` permission)
//
// El GITHUB_TOKEN NO PUEDE crear ni modificar archivos de workflow --y no hay
// forma de darle ese permiso--, asi que un proyecto armado por un runner nunca
// podria escribir su propio `ci.yml`. BORRAR si puede, tambien medido.
//
// La salida es que los workflows lleguen por la COPIA DEL TEMPLATE, que no es un
// push. Y para que eso funcione, los workflows del proyecto derivan el nombre y
// el duenio del contexto de GitHub en vez de llevarlos sustituidos: asi llegan
// correctos a cualquier repositorio sin que nadie los toque, que es lo que hace
// falta cuando nadie PUEDE tocarlos.
//
// UN REPOSITORIO PLANTILLA POR FORMA, y no uno solo: el juego de workflows
// difiere --`desplegar.yml` viaja a un sitio y no a una aplicacion-- y crear el
// que falte esta bloqueado. Borrar el que sobra se podria; crear el que falta no.
// ---------------------------------------------------------------------------

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { invocadoDirecto } from "./projects-init.mjs";

const ESTE_DIRECTORIO = path.dirname(fileURLToPath(import.meta.url));

/** La puerta que viaja dentro de cada repositorio plantilla. */
export const RUTA_PUERTA = path.join(ESTE_DIRECTORIO, "plantilla-repos", "personalizar.yml");

/** El marcador que dice de que forma es esta plantilla. Se sustituye al generar. */
export const MARCADOR_FORMA = "FORMA_DE_ESTA_PLANTILLA";

/** Las formas que tienen repositorio plantilla, con el nombre del repositorio. */
export const PLANTILLAS = [
  { forma: "aplicacion", repo: "plantilla-aplicacion", titulo: "una aplicacion" },
  { forma: "sitio", repo: "plantilla-sitio", titulo: "un sitio para leer" },
];

/** Los valores con los que se genera una plantilla.
 *
 *  SON NEUTROS A PROPOSITO: la puerta los reescribe todos con los de verdad en
 *  cuanto alguien la corre. Lo unico que importa de esta eleccion es que el
 *  repositorio plantilla se lea coherente si alguien lo abre para mirarlo. */
export function valoresDePlantilla(forma, cuenta = "im-diego-ec") {
  return {
    forma,
    plataforma: "supabase",
    PROYECTO: "mi-proyecto",
    ORG: cuenta,
    ORG_MARCO: cuenta,
    PAQUETE_API: "api",
    PAQUETE_WEB: "web",
    PAQUETE_SITIO: "sitio",
    PAQUETE_E2E: "e2e",
    GENERAR_CLIENTE_DATOS: "prisma generate",
    EQUIPO_BUILDERS: "builders",
    EQUIPO_PO: "po",
    BUILDER_1: cuenta,
    BUILDER_2: cuenta,
    PO: cuenta,
    CUENTA_DEV: "000000000000",
    CUENTA_PROD: "000000000000",
    REGION: "us-east-1",
    PERFIL_DEV: "sin-aws",
    PERFIL_PROD: "sin-aws",
    PREFIJO_RECURSOS: "mi-proyecto",
    DOMINIO_DEV: "mi-proyecto.workers.dev",
    DOMINIO_PROD: "mi-proyecto.workers.dev",
    CANAL_ALERTAS: "#sin-slack",
    ID_MCP_SLACK: "00000000-0000-0000-0000-000000000000",
  };
}

/** Escribe la puerta dentro de un proyecto ya generado, con su forma resuelta. */
export function ponerLaPuerta(destino, forma) {
  const plantilla = fs.readFileSync(RUTA_PUERTA, "utf8");
  if (!plantilla.includes(MARCADOR_FORMA)) {
    throw new Error(`${RUTA_PUERTA} no lleva el marcador ${MARCADOR_FORMA}: la puerta no sabria de que forma es`);
  }
  const dir = path.join(destino, ".github", "workflows");
  fs.mkdirSync(dir, { recursive: true });
  const ruta = path.join(dir, "personalizar.yml");
  fs.writeFileSync(ruta, plantilla.replaceAll(MARCADOR_FORMA, forma));
  return ruta;
}

export function main() {
  const forma = process.argv[2];
  const destino = process.argv[3];
  const cual = PLANTILLAS.find((p) => p.forma === forma);
  if (!cual || !destino) {
    console.error(`uso: node ${path.basename(fileURLToPath(import.meta.url))} <${PLANTILLAS.map((p) => p.forma).join("|")}> <destino>`);
    console.error("");
    console.error("Escribe el archivo de valores de una plantilla y le pone la puerta. El proyecto en si");
    console.error("lo arma projects-init con esos valores: esta herramienta no lo duplica.");
    return 2;
  }
  const valores = path.join(destino, "valores-plantilla.json");
  fs.mkdirSync(destino, { recursive: true });
  fs.writeFileSync(valores, `${JSON.stringify(valoresDePlantilla(forma), null, 2)}\n`);
  process.stdout.write(`Escrito: ${valores}\n`);
  process.stdout.write(`El repositorio de esta plantilla es: ${cual.repo}\n`);
  return 0;
}

if (invocadoDirecto(import.meta.url)) process.exit(main());
