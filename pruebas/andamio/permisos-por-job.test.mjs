// GUARDA DE LOS PERMISOS POR JOB DE TODOS LOS WORKFLOWS.
//
// POR QUE EXISTE. Cuando un job no declara `permissions:`, GitHub le da lo que
// diga el default del REPOSITORIO — una perilla de Settings que no vive en el
// arbol, que nadie ve en un diff y que en muchas organizaciones sigue siendo
// read/write sobre todo. O sea que el permiso real de un job no se puede leer
// del archivo que lo define: hay que ir a mirar una pantalla, y esa pantalla
// puede cambiar sin un PR.
//
// El `permissions:` del ENCABEZADO no cierra el hueco, lo tapa: es un default
// para los jobs que no declaran, no un techo. Un job nuevo que se agregue mas
// abajo lo hereda por accidente, y el dia que alguien afloje el encabezado se
// afloja todo junto sin que ningun job lo pida.
//
// LO QUE VERIFICA, sobre los DOS arboles de workflows a la vez —el del marco
// (.github/workflows/) y el que el andamio reparte (plantilla/.github/
// workflows/)—: que TODO job declare su propio bloque `permissions:`, con el
// valor que sea, incluido el vacio `{}`. Un `{}` es una respuesta: dice "se
// audito y da cero". La ausencia no dice nada.
//
// Y UNA SEGUNDA, mas fina, sobre los jobs que llaman a un workflow REUSABLE
// (`uses:` a nivel de job): ahi el bloque no es documentacion sino el TECHO
// efectivo, porque un workflow reusable no recibe nunca mas permisos que los
// que le concede quien lo llama. Es el caso que ya se pago una vez: sin
// pull-requests: read la deteccion del carril de docs no puede listar los
// archivos del PR y cae al fail-open (incidente del 2026-08-05).
//
// LO QUE ESTA GUARDA NO PUEDE. No evalua permisos: eso solo lo hace GitHub, con
// red y con un token. Verifica lo unico decidible desde el arbol —que la
// decision este ESCRITA en el job y no delegada a una pantalla— que es
// exactamente la propiedad que se revierte sin dejar rastro si nadie la mira.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

// Los dos arboles, con su rotulo. Se recorren enteros: agregar un workflow lo
// mete en el alcance solo, sin tocar este archivo.
const ARBOLES = [
  { rotulo: "marco", dir: path.join(RAIZ, ".github", "workflows") },
  { rotulo: "andamio", dir: path.join(RAIZ, "plantilla", ".github", "workflows") },
];

/**
 * Los jobs de un workflow, leidos POR SANGRIA y no con un parser de YAML.
 *
 * Es a proposito: los workflows del andamio traen marcadores de doble llave
 * (`{{ORG}}`) que un parser de YAML lee como un mapa en flujo y rechaza. Un
 * banco que tiene que sustituir el arbol antes de poder leerlo prueba el arbol
 * sustituido, no el que se commitea. La forma de estos archivos es fija —dos
 * espacios para el job, cuatro para sus claves— y esa es toda la gramatica que
 * hace falta.
 *
 * Devuelve, por job: su nombre, la linea donde arranca (1-indexada), si declara
 * `permissions:` y si es una llamada a un workflow reusable.
 */
export function jobsDelWorkflow(ruta) {
  const lineas = fs.readFileSync(ruta, "utf8").split(/\r?\n/);
  const inicioJobs = lineas.findIndex((l) => /^jobs:\s*$/.test(l));
  if (inicioJobs === -1) throw new Error(`${ruta} no tiene bloque "jobs:"`);

  const jobs = [];
  let actual = null;
  for (let i = inicioJobs + 1; i < lineas.length; i += 1) {
    const linea = lineas[i];
    if (linea.trim() === "" || /^\s*#/.test(linea)) continue;
    // Una clave a nivel raiz cierra el bloque de jobs.
    if (/^\S/.test(linea)) break;

    const abre = linea.match(/^ {2}([A-Za-z_][A-Za-z0-9_-]*):\s*$/);
    if (abre) {
      actual = { job: abre[1], linea: i + 1, permisos: false, reusable: false };
      jobs.push(actual);
      continue;
    }
    if (!actual) continue;
    // Claves del job: exactamente cuatro espacios. Mas adentro ya son pasos.
    if (/^ {4}permissions:/.test(linea)) actual.permisos = true;
    if (/^ {4}uses:/.test(linea)) actual.reusable = true;
  }
  if (jobs.length === 0) throw new Error(`${ruta} no declaro ningun job`);
  return jobs;
}

/** Todos los workflows de un directorio, ordenados. */
function workflows(dir) {
  return fs
    .readdirSync(dir)
    .filter((n) => /\.ya?ml$/.test(n))
    .sort()
    .map((n) => path.join(dir, n));
}

/** Los jobs sin `permissions:` de un arbol de workflows, con su ubicacion. */
export function jobsSinPermisos(dir, rotulo = dir) {
  const problemas = [];
  for (const ruta of workflows(dir)) {
    for (const j of jobsDelWorkflow(ruta)) {
      if (j.permisos) continue;
      const donde = `${rotulo}/${path.basename(ruta)}:${j.linea}`;
      problemas.push(
        j.reusable
          ? `${donde} · el job "${j.job}" llama a un workflow reusable y NO declara permissions. Ese bloque no es documentacion: es el TECHO que recibe el reusable, y sin el hereda el default del repositorio. Arreglo: escribi el minimo real debajo del uses:`
          : `${donde} · el job "${j.job}" no declara permissions y por lo tanto corre con el default del repositorio, que no vive en este arbol. Arreglo: agrega un bloque permissions: con el minimo real, o permissions: {} si de verdad no necesita nada`,
      );
    }
  }
  return problemas;
}

// ---------------------------------------------------------------------------
// LAS COMPROBACIONES
// ---------------------------------------------------------------------------

test("workflows · el recorrido encuentra los dos arboles y sus jobs", () => {
  let total = 0;
  for (const { rotulo, dir } of ARBOLES) {
    assert.ok(fs.existsSync(dir), `no existe el arbol de workflows "${rotulo}" (${dir})`);
    const archivos = workflows(dir);
    assert.ok(archivos.length >= 3, `${rotulo}: solo ${archivos.length} workflows: el recorrido se rompio`);
    for (const ruta of archivos) total += jobsDelWorkflow(ruta).length;
  }
  // Cero jobs recorridos seria un banco roto, no un arbol limpio: sin este piso
  // un glob que deje de matchear pondria verde a este archivo entero.
  assert.ok(total >= 15, `solo ${total} jobs recorridos entre los dos arboles: el lector se rompio`);
});

test("workflows · TODO job declara sus propios permissions, en los dos arboles", () => {
  const problemas = ARBOLES.flatMap(({ rotulo, dir }) => jobsSinPermisos(dir, rotulo));
  assert.deepEqual(problemas, []);
});

test("workflows · la comprobacion de permisos MUERDE", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "projects-permisos-"));
  const copia = path.join(tmp, "workflows");
  fs.cpSync(ARBOLES[1].dir, copia, { recursive: true });
  assert.deepEqual(jobsSinPermisos(copia, "copia"), [], "la copia no arranco limpia");

  // (a) el bloque de un job normal, borrado. El caso barato: alguien "simplifica"
  // apoyandose en el permissions: del encabezado. Se corta por el job para que
  // la mutacion caiga donde se dice y no en el primer bloque que se le parezca.
  const ci = path.join(copia, "ci.yml");
  const original = fs.readFileSync(ci, "utf8");
  const deBuildTest = original.indexOf("  build_test:");
  assert.ok(deBuildTest > 0, "el job build_test se renombro: esta mutacion apunta a nada");
  const mutado =
    original.slice(0, deBuildTest) +
    original.slice(deBuildTest).replace("    permissions:\n      contents: read\n", "");
  assert.notEqual(mutado, original, "la mutacion no cambio nada");
  fs.writeFileSync(ci, mutado);
  const sinUno = jobsSinPermisos(copia, "copia");
  assert.equal(sinUno.length, 1, `borrar un bloque tenia que dejar exactamente un job sin permisos: ${JSON.stringify(sinUno)}`);
  assert.match(sinUno[0], /build_test/);

  // (b) el bloque VACIO, borrado. `permissions: {}` es una declaracion y su
  // ausencia tiene que doler igual: si el lector solo mirara los bloques con
  // valores, el job mas restringido del archivo seria el unico que puede
  // aflojarse sin diff rojo.
  fs.writeFileSync(ci, original.replace("    permissions: {}\n", ""));
  const sinVacio = jobsSinPermisos(copia, "copia");
  assert.equal(sinVacio.length, 1, `borrar el bloque vacio tenia que reportarse: ${JSON.stringify(sinVacio)}`);
  assert.match(sinVacio[0], /ci_ok/);

  // (c) el bloque del job que llama al reusable, borrado. Su mensaje es OTRO
  // porque el arreglo es otro: ahi el bloque es el techo efectivo del reusable.
  fs.writeFileSync(ci, original.replace("    permissions:\n      contents: read\n      pull-requests: read\n", ""));
  const sinTecho = jobsSinPermisos(copia, "copia");
  assert.equal(sinTecho.length, 1, `borrar el techo del reusable tenia que reportarse: ${JSON.stringify(sinTecho)}`);
  assert.match(sinTecho[0], /llama a un workflow reusable/);

  fs.writeFileSync(ci, original);
  assert.deepEqual(jobsSinPermisos(copia, "copia"), [], "la copia no volvio limpia");
  fs.rmSync(tmp, { recursive: true, force: true });
});

test("workflows · el job que llama a un reusable NO se apoya en el encabezado", () => {
  // Esta es la mitad delicada y por eso se afirma aparte: en un `uses:` de job el
  // bloque decide de verdad, no documenta. Se exige ademas que el techo del
  // llamador incluya pull-requests: read, que es el permiso cuya falta ya causo
  // un fail-open del carril de docs.
  const llamadores = [];
  for (const { rotulo, dir } of ARBOLES) {
    for (const ruta of workflows(dir)) {
      for (const j of jobsDelWorkflow(ruta)) {
        if (j.reusable) llamadores.push({ rotulo, ruta, ...j });
      }
    }
  }
  assert.ok(llamadores.length >= 2, `solo ${llamadores.length} jobs con uses: a nivel de job: el lector se rompio`);
  for (const l of llamadores) {
    const donde = `${l.rotulo}/${path.basename(l.ruta)}:${l.linea} (job "${l.job}")`;
    assert.ok(l.permisos, `${donde} llama a un workflow reusable sin declarar permissions`);
    const texto = fs.readFileSync(l.ruta, "utf8");
    const bloque = texto.split(/\r?\n/).slice(l.linea, l.linea + 40).join("\n");
    assert.match(
      bloque,
      /^ {4}permissions:\n(?: {6}[a-z-]+: \w+\n)* {6}pull-requests: read$/m,
      `${donde}: el techo que le concede al reusable no incluye pull-requests: read, y sin ese permiso la deteccion del carril de docs cae al fail-open`,
    );
  }
});
