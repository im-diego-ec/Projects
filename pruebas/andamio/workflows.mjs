// LECTOR DE WORKFLOWS COMPARTIDO POR LOS BANCOS QUE LOS AUDITAN.
//
// POR QUE VIVE APARTE Y NO DENTRO DE UN .test.mjs. Dos bancos distintos miran los
// mismos archivos —los permisos por job y el techo de tiempo por job— y necesitan
// el mismo recorrido: los dos arboles de workflows, sus archivos, y los jobs de
// cada archivo con la linea donde arrancan. Escrito dos veces, el segundo se
// desincroniza del primero y la guarda que se queda vieja sale VERDE, porque un
// lector que no encuentra el job que audita no reporta nada. Una sola
// declaracion, importada por los dos.
//
// Y NO ES UN .test.mjs a proposito: el patron con el que corre el banco es
// `pruebas/**/*.test.mjs`, asi que este archivo no se ejecuta como suite. Si
// llevara ese sufijo, cada banco que lo importe correria sus pruebas otra vez
// dentro de su propio proceso y el conteo del banco dejaria de significar algo.
//
// POR QUE SE LEE POR SANGRIA Y NO CON UN PARSER DE YAML. Los workflows del
// andamio traen marcadores de doble llave (`{{ORG}}`) que un parser de YAML lee
// como un mapa en flujo y rechaza. Un banco que tiene que sustituir el arbol
// antes de poder leerlo prueba el arbol sustituido, no el que se commitea. La
// forma de estos archivos es fija —dos espacios para el job, cuatro para sus
// claves— y esa es toda la gramatica que hace falta.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

// Los dos arboles, con su rotulo. Se recorren enteros: agregar un workflow lo
// mete en el alcance solo, sin tocar ningun banco.
export const ARBOLES = [
  { rotulo: "marco", dir: path.join(RAIZ, ".github", "workflows") },
  { rotulo: "andamio", dir: path.join(RAIZ, "plantilla", ".github", "workflows") },
];

/** Todos los workflows de un directorio, ordenados. */
export function workflows(dir) {
  return fs
    .readdirSync(dir)
    .filter((n) => /\.ya?ml$/.test(n))
    .sort()
    .map((n) => path.join(dir, n));
}

/**
 * Los jobs de un workflow.
 *
 * Devuelve, por job: su nombre, la linea donde arranca (1-indexada), y que
 * claves de nivel de job declara — `permissions:`, `timeout-minutes:`, y si es
 * una llamada a un workflow reusable (`uses:` a nivel de JOB, no de paso).
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
      actual = { job: abre[1], linea: i + 1, permisos: false, techoDeTiempo: false, reusable: false };
      jobs.push(actual);
      continue;
    }
    if (!actual) continue;
    // Claves del job: exactamente cuatro espacios. Mas adentro ya son pasos.
    if (/^ {4}permissions:/.test(linea)) actual.permisos = true;
    if (/^ {4}timeout-minutes:/.test(linea)) actual.techoDeTiempo = true;
    if (/^ {4}uses:/.test(linea)) actual.reusable = true;
  }
  if (jobs.length === 0) throw new Error(`${ruta} no declaro ningun job`);
  return jobs;
}
