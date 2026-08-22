#!/usr/bin/env node
// ---------------------------------------------------------------------------
// projects init — instancia el andamio en un repo nuevo.
//
// POR QUE EXISTE. Adoptar Projects eran ~30 actos manuales: copiar 23 archivos con
// robocopy o cp (y acordarse del `/.` final, o los dotfiles no viajan), sustituir
// 122 ocurrencias de 22 marcadores en 15 archivos, inicializar OpenSpec y
// renderizar la constitucion. Nada de eso es una decision: es transcripcion. Y la
// transcripcion a mano falla de la peor manera —un marcador mal sustituido es
// sintacticamente valido, asi que el check de marcadores lo deja pasar: "se
// verifica la AUSENCIA de marcadores, no la correccion de los valores que los
// reemplazaron" (marco-ci.yml)—.
//
// QUE NO HACE, y esta declarado a proposito:
//  · No decide nada. Todos los valores vienen de un archivo que un humano llena.
//  · No borra bloques. Tres marcadores tienen un camino "si no existe" que exige
//    borrar bloques de eslint.config.mjs o entradas de ci.yml (ver la tabla de
//    plantilla/README.md). Automatizar un borrado condicional sobre archivos que
//    despues nadie relee es mas riesgoso que pedir los tres valores: si un
//    proyecto no tiene front o E2E, esta version EXIGE el valor igual y el borrado
//    queda como paso humano, nombrado en la salida.
//  · No toca GitHub. La proteccion de main, los accesos de Dependabot y los
//    secrets siguen siendo actos humanos deliberados.
//
// FALLA CERRADO en todo: un valor que falta, un marcador que sobrevive, un destino
// que ya tiene andamio o una sustitucion que no cambio nada son ERROR, no aviso.
// La ultima importa mas de lo que parece: si el patron dejara de matchear, "cero
// sustituciones" saldria en verde y el repo nuevo nace lleno de marcadores.
//
// USO:
//   node herramientas/projects-init.mjs --valores <ruta.json> --destino <ruta>
//                                    [--sin-herramientas] [--forzar]
//   node herramientas/projects-init.mjs --ejemplo > valores.json
// ---------------------------------------------------------------------------

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

/** Marcador del andamio: mayusculas obligatorias, para no confundirlo con las
 *  expresiones `${{ ... }}` de GitHub Actions. Es el MISMO patron que el check
 *  de higiene del marco, y por eso no se relaja: si aca fuera mas laxo, el repo
 *  nuevo pasaria este paso y reprobaria el CI. */
export const MARCADOR = /\{\{([A-Z0-9_]+)\}\}/g;

/** El archivo del andamio que NO se copia: es la guia del bootstrap, no el README
 *  del proyecto. Y es el unico que menciona `{{DOBLE_LLAVE}}`, que no es un
 *  marcador sino la convencion citandose a si misma. */
export const NO_SE_COPIA = new Set(["README.md"]);

/** Los 22 valores que un humano tiene que decidir, con su fuente de verdad en
 *  plantilla/README.md seccion 2. `PAQUETES` no esta: se DERIVA de los tres
 *  paquetes, porque una lista que se escribe aparte de sus elementos es una
 *  segunda declaracion que puede divergir. */
export const REQUERIDOS = [
  "PROYECTO", "ORG",
  "PAQUETE_API", "PAQUETE_WEB", "PAQUETE_E2E",
  "GENERAR_CLIENTE_DATOS",
  "EQUIPO_BUILDERS", "EQUIPO_PO", "BUILDER_1", "BUILDER_2", "PO",
  "CUENTA_DEV", "CUENTA_PROD", "REGION", "PERFIL_DEV", "PERFIL_PROD",
  "PREFIJO_RECURSOS",
  "DOMINIO_DEV", "DOMINIO_PROD", "CANAL_ALERTAS", "ID_MCP_SLACK",
];

/** Los que el andamio necesita y NO se piden porque se derivan. */
export function derivar(v) {
  return {
    ...v,
    PAQUETES: v.PAQUETES ?? [v.PAQUETE_WEB, v.PAQUETE_API, v.PAQUETE_E2E].filter(Boolean).join(", "),
  };
}

/** Los tres marcadores cuyo camino "si no existe" exige borrar bloques a mano. */
export const CON_LIMPIEZA_MANUAL = {
  PAQUETE_WEB: "si el proyecto no tiene frontend: borrar los bloques [FRONT] de eslint.config.mjs y sus imports",
  PAQUETE_E2E: "si el proyecto no tiene suite E2E: borrar esa entrada del glob de Node Y las dos entradas EXCEPCIONES de ci.yml (una excepcion que no corresponde a ningun paquete es roja, a proposito)",
  GENERAR_CLIENTE_DATOS: "si el proyecto no genera cliente de datos: borrar el paso \"Generar el cliente de la capa de datos\" de .github/workflows/ci.yml",
};

export function validarValores(crudos) {
  const problemas = [];
  if (crudos === null || typeof crudos !== "object" || Array.isArray(crudos)) {
    return { problemas: ["el archivo de valores no es un objeto JSON"], valores: null };
  }
  for (const k of REQUERIDOS) {
    const v = crudos[k];
    if (v === undefined || v === null || v === "") {
      problemas.push(`falta ${k}`);
      continue;
    }
    if (typeof v !== "string") {
      problemas.push(`${k} tiene que ser texto y es ${typeof v}`);
      continue;
    }
    // Un valor que todavia trae llaves es el ejemplo sin llenar. Pasa: el
    // archivo del andamio nace con cada clave apuntando a su propio marcador.
    if (/\{\{|\}\}/.test(v)) problemas.push(`${k} sigue siendo un marcador sin llenar: ${v}`);
  }
  if (typeof crudos.CUENTA_DEV === "string" && !/^\d{12}$/.test(crudos.CUENTA_DEV)) {
    problemas.push("CUENTA_DEV no son 12 digitos (es un id de cuenta AWS)");
  }
  if (typeof crudos.CUENTA_PROD === "string" && !/^\d{12}$/.test(crudos.CUENTA_PROD)) {
    problemas.push("CUENTA_PROD no son 12 digitos (es un id de cuenta AWS)");
  }
  // La regla del area: sin em dashes en nada que viaje a AWS.
  for (const k of ["PREFIJO_RECURSOS", "PROYECTO"]) {
    if (typeof crudos[k] === "string" && /—|–/.test(crudos[k])) {
      problemas.push(`${k} tiene un em dash o en dash: los nombres que viajan a AWS usan guiones normales`);
    }
  }
  if (problemas.length) return { problemas, valores: null };
  return { problemas: [], valores: derivar(crudos) };
}

/** Los archivos del andamio, relativos a plantilla/, sin el que no se copia. */
export function archivosDelAndamio(raizAndamio) {
  const salida = [];
  for (const e of fs.readdirSync(raizAndamio, { withFileTypes: true, recursive: true })) {
    if (!e.isFile()) continue;
    const abs = path.join(e.parentPath ?? e.path, e.name);
    const rel = path.relative(raizAndamio, abs).split(path.sep).join("/");
    if (NO_SE_COPIA.has(rel)) continue;
    salida.push(rel);
  }
  return salida.sort();
}

export function sustituir(texto, valores) {
  const faltantes = new Set();
  let cuenta = 0;
  const salida = texto.replace(MARCADOR, (todo, nombre) => {
    const v = valores[nombre];
    if (v === undefined) {
      faltantes.add(nombre);
      return todo;
    }
    cuenta++;
    return v;
  });
  return { salida, cuenta, faltantes: [...faltantes] };
}

export function instanciar({ raizAndamio, destino, valores }) {
  const rels = archivosDelAndamio(raizAndamio);
  if (rels.length === 0) throw new Error(`el andamio esta vacio: ${raizAndamio}`);

  let total = 0;
  const faltantes = new Set();
  const escritos = [];
  for (const rel of rels) {
    const origen = path.join(raizAndamio, rel);
    const texto = fs.readFileSync(origen, "utf8");
    const r = sustituir(texto, valores);
    total += r.cuenta;
    for (const f of r.faltantes) faltantes.add(f);
    const salida = path.join(destino, rel);
    fs.mkdirSync(path.dirname(salida), { recursive: true });
    fs.writeFileSync(salida, r.salida, "utf8");
    escritos.push(rel);
  }
  return { escritos, total, faltantes: [...faltantes].sort() };
}

/** Ningun `{{MARCADOR}}` puede sobrevivir. Es el mismo check que el CI del marco
 *  corre sobre el repo nuevo: si aca pasara y alla fallara, la herramienta seria
 *  peor que el camino manual. */
export function marcadoresQueSobreviven(destino) {
  const encontrados = [];
  for (const e of fs.readdirSync(destino, { withFileTypes: true, recursive: true })) {
    if (!e.isFile()) continue;
    const abs = path.join(e.parentPath ?? e.path, e.name);
    const rel = path.relative(destino, abs).split(path.sep).join("/");
    if (rel.startsWith(".git/") || rel.startsWith("node_modules/")) continue;
    const lineas = fs.readFileSync(abs, "utf8").split("\n");
    for (let i = 0; i < lineas.length; i++) {
      for (const m of lineas[i].matchAll(MARCADOR)) {
        encontrados.push({ archivo: rel, linea: i + 1, marcador: m[0] });
      }
    }
  }
  return encontrados;
}

// ─────────────────────────── El programa ───────────────────────────

const EJEMPLO = {
  PROYECTO: "people-agenda",
  ORG: "im-diego-ec",
  PAQUETE_API: "api",
  PAQUETE_WEB: "web",
  PAQUETE_E2E: "e2e",
  GENERAR_CLIENTE_DATOS: "prisma generate",
  EQUIPO_BUILDERS: "builders",
  EQUIPO_PO: "po",
  BUILDER_1: "builder-uno",
  BUILDER_2: "builder-dos",
  PO: "po",
  CUENTA_DEV: "111111111111",
  CUENTA_PROD: "222222222222",
  REGION: "us-east-1",
  PERFIL_DEV: "la organización-dev",
  PERFIL_PROD: "la organización-prod",
  PREFIJO_RECURSOS: "agenda",
  DOMINIO_DEV: "agenda-dev.ejemplo.com",
  DOMINIO_PROD: "agenda.ejemplo.com",
  CANAL_ALERTAS: "#alertas-prod",
  ID_MCP_SLACK: "54dff332-0a44-4f19-afcd-344d8cec4404",
};

function argumentos(argv) {
  const o = { herramientas: true, forzar: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--valores") o.valores = argv[++i];
    else if (argv[i] === "--destino") o.destino = argv[++i];
    else if (argv[i] === "--sin-herramientas") o.herramientas = false;
    else if (argv[i] === "--forzar") o.forzar = true;
    else if (argv[i] === "--ejemplo") o.ejemplo = true;
    else if (argv[i] === "--version-openspec") o.versionOpenspec = argv[++i];
    else throw new Error(`argumento desconocido: ${argv[i]}`);
  }
  return o;
}

/** El pin del CLI de OpenSpec sale del `default` del input del reusable: UNA sola
 *  declaracion. Repetirlo aca seria una segunda que puede divergir. */
export function pinOpenspecDe(marcoCi) {
  const m = marcoCi.match(/version_openspec:[\s\S]*?default:\s*"?([0-9]+\.[0-9]+\.[0-9]+)"?/);
  return m ? m[1] : null;
}

function main(argv) {
  const o = argumentos(argv);
  if (o.ejemplo) {
    process.stdout.write(JSON.stringify(EJEMPLO, null, 2) + "\n");
    return 0;
  }
  if (!o.valores || !o.destino) {
    console.error("uso: node herramientas/projects-init.mjs --valores <ruta.json> --destino <ruta>");
    console.error("     node herramientas/projects-init.mjs --ejemplo > valores.json");
    return 2;
  }

  const raizMarco = path.resolve(import.meta.dirname, "..");
  const raizAndamio = path.join(raizMarco, "plantilla");
  if (!fs.existsSync(raizAndamio)) {
    console.error(`::error::no encontre el andamio en ${raizAndamio}. Corre esto desde un clon del repo del marco`);
    return 1;
  }

  // ── Valores ──
  let crudos;
  try {
    crudos = JSON.parse(fs.readFileSync(o.valores, "utf8"));
  } catch (e) {
    console.error(`::error::no pude leer ${o.valores}: ${e.message}`);
    return 1;
  }
  const { problemas, valores } = validarValores(crudos);
  if (problemas.length) {
    console.error(`::error::el archivo de valores tiene ${problemas.length} problema(s). No se escribio nada:`);
    for (const p of problemas) console.error(`  - ${p}`);
    console.error("");
    console.error("Que poner en cada uno esta en plantilla/README.md seccion 2, con ejemplo y caso borde.");
    console.error("Un esqueleto con todas las claves: node herramientas/projects-init.mjs --ejemplo");
    return 1;
  }

  // ── Destino ──
  if (!fs.existsSync(o.destino)) {
    console.error(`::error::el destino no existe: ${o.destino}. Crea el repo primero y corre esto en su raiz`);
    return 1;
  }
  const yaTiene = archivosDelAndamio(raizAndamio).filter((r) => fs.existsSync(path.join(o.destino, r)));
  if (yaTiene.length && !o.forzar) {
    console.error(`::error::el destino ya tiene ${yaTiene.length} archivo(s) del andamio. Se aborta para no sobreescribir trabajo:`);
    for (const r of yaTiene.slice(0, 8)) console.error(`  - ${r}`);
    if (yaTiene.length > 8) console.error(`  ... y ${yaTiene.length - 8} mas`);
    console.error("Si de verdad queres sobreescribirlos: --forzar");
    return 1;
  }

  // ── Instanciar ──
  const r = instanciar({ raizAndamio, destino: o.destino, valores });
  console.log(`escritos ${r.escritos.length} archivos, ${r.total} ocurrencias sustituidas`);
  if (r.total === 0) {
    console.error("::error::cero sustituciones sobre un andamio que tiene marcadores: el patron dejo de matchear. NO se declara exito");
    return 1;
  }
  if (r.faltantes.length) {
    console.error(`::error::el andamio usa marcadores que el archivo de valores no declara: ${r.faltantes.join(", ")}`);
    console.error("Agregalos a REQUERIDOS de esta herramienta y a la tabla de plantilla/README.md, en el mismo cambio");
    return 1;
  }

  // ── El control que hace verificable el paso ──
  const sobreviven = marcadoresQueSobreviven(o.destino);
  if (sobreviven.length) {
    console.error(`::error::quedaron ${sobreviven.length} marcador(es) sin sustituir:`);
    for (const s of sobreviven.slice(0, 10)) console.error(`  - ${s.archivo}:${s.linea} ${s.marcador}`);
    return 1;
  }
  console.log("cero marcadores sobrevivientes");

  // ── Las dos herramientas que el andamio no puede traer ──
  if (o.herramientas) {
    const marcoCi = fs.readFileSync(path.join(raizMarco, ".github/workflows/marco-ci.yml"), "utf8");
    const pin = o.versionOpenspec ?? pinOpenspecDe(marcoCi);
    if (!pin) {
      console.error("::error::no pude leer el pin de OpenSpec del default de `version_openspec` en marco-ci.yml. Pasalo con --version-openspec");
      return 1;
    }
    console.log(`openspec init con el pin del marco (${pin})`);
    try {
      execFileSync("npx", ["--yes", `@fission-ai/openspec@${pin}`, "init", "--tools", "claude"], {
        cwd: o.destino, stdio: "inherit", shell: process.platform === "win32",
      });
    } catch (e) {
      console.error(`::error::openspec init fallo: ${e.message}. El marco EXIGE openspec/ ([ -d openspec ] || exit 1), asi que el primer PR saldria rojo. Correlo a mano y volve`);
      return 1;
    }
    console.log("render de la porcion del marco de la constitucion");
    try {
      execFileSync(process.execPath, [path.join(raizMarco, "actions/constitucion/constitucion.mjs")], {
        cwd: o.destino, stdio: "inherit", env: { ...process.env, CONSTITUCION_MODO: "escribir" },
      });
    } catch (e) {
      console.error(`::error::el render de la constitucion fallo: ${e.message}`);
      return 1;
    }
  }

  // ── Lo que queda, y es humano ──
  console.log("");
  console.log("LISTO. Lo que sigue NO lo puede hacer esta herramienta:");
  console.log("  1. Proteccion de main con `ci-ok` como unico check requerido (.github/proteccion-main.md)");
  console.log("  2. Acceso de Dependabot al repo privado del marco, en el repo DEL MARCO");
  console.log("  3. `vars` y `secrets` del repo en Actions");
  console.log("  4. Los tres handles de CODEOWNERS existen en la org y tienen escritura");
  console.log("     (un handle mal escrito NO falla: GitHub deja de asignar revisores, en silencio)");
  for (const [k, texto] of Object.entries(CON_LIMPIEZA_MANUAL)) {
    console.log(`  · ${k} = "${valores[k]}" — ${texto}`);
  }
  return 0;
}

if (path.resolve(process.argv[1] ?? "") === path.resolve(import.meta.filename)) {
  process.exit(main(process.argv.slice(2)));
}
