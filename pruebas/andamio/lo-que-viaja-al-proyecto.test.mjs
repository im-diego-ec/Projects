// LO QUE EL ANDAMIO LE ENTREGA A UN REPOSITORIO NUEVO TIENE QUE SER CIERTO Y
// USABLE *EN ESE* REPOSITORIO.
//
// POR QUE ESTAN LAS TRES JUNTAS. Son la misma clase de defecto, que solo se ve
// cuando uno se para en el repo que RECIBE el andamio y no en el que lo escribe:
//
//   1. Un documento de arranque escrito para un solo sistema operativo. No falla
//      al final: falla en el primer comando que en la otra plataforma no existe,
//      y el mensaje habla del comando, nunca de la plataforma. El lector nuevo
//      concluye que el repo esta roto.
//   2. Un comentario que explica DONDE se aprendio una regla en vez de POR QUE
//      la regla es cierta. En el repo que lo recibe, la mitad del comentario es
//      una referencia a un lugar que ahi no existe, y la otra mitad —la unica
//      que le sirve— no esta escrita.
//   3. Una superficie de riesgo que el marco no acepta para si mismo y si le
//      reparte al proyecto. El cache de dependencias es el ejemplo medido: la
//      unica linea `cache:` de todo el arbol estaba en el andamio y no en el CI
//      del marco, y caia sobre el unico job que instala y ejecuta codigo de
//      terceros.
//
// Las tres MUERDEN: cada comprobacion se corre tambien sobre una copia mutada en
// un directorio temporal —nunca sobre el arbol del repo— y se exige que reporte
// el problema. Una comprobacion que no se vio fallar no es una comprobacion.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const ANDAMIO = path.join(RAIZ, "plantilla");
const ARRANQUE = path.join(ANDAMIO, "comandos-levantar-servicios.txt");
const WORKFLOWS = path.join(ANDAMIO, ".github", "workflows");

// ---------------------------------------------------------------------------
// 1 · EL ARRANQUE LOCAL SE PUEDE SEGUIR ENTERO EN CUALQUIERA DE LAS DOS
//     PLATAFORMAS
//
// La forma que exige: los comandos que difieren van en DOS bloques rotulados y
// consecutivos; los identicos —que son la mayoria— van una sola vez y sin
// rotulo. Un bloque va desde su rotulo hasta la primera linea en blanco.
//
// ── LIMITE DECLARADO, leelo antes de confiar ──────────────────────────────
// Esto es un escaneo de TEXTO y no distingue un cmdlet escrito como comando de
// uno citado dentro de una frase. El archivo esta escrito con esa restriccion a
// la vista (la prosa del encabezado nombra el sintoma, no el cmdlet), y es el
// mismo intercambio que ya hace pinado.test.mjs: preferir una regla decidible
// antes que una heuristica que se pone roja cuando el texto esta BIEN escrito.
//
// Y no cubre el otro lado por simetria: `cp`, `rm`, `ls` y `cd` son alias de
// PowerShell, asi que exigirles un gemelo pondria rojo a un comando que SI
// funciona en las dos. Lo que si es de un solo sistema, y por eso es lo que se
// mira: los cmdlets con forma Verbo-Sustantivo, `$env:`, y el prefijo POSIX
// `VAR=valor comando`, que PowerShell no rechaza como comando desconocido sino
// como error de parseo.
// ---------------------------------------------------------------------------

const ROTULO_POSIX = "[macOS / Linux / Git Bash]";
const ROTULO_WINDOWS = "[Windows PowerShell]";

// Verbo-Sustantivo en PascalCase: la forma de CUALQUIER cmdlet, presente o
// futuro. Es a proposito mas general que una lista de nombres, que envejece.
const CMDLET = /(?:^|\s)[A-Z][a-z]+-[A-Z][A-Za-z]+(?=\s|$)/;
const SOLO_WINDOWS = [CMDLET, /\$env:/];
// Un prefijo de variable de entorno delante del comando, anclado al principio de
// la linea para no confundirlo con una mencion en prosa.
const SOLO_POSIX = [/^[ \t]*[A-Z][A-Z0-9_]*=\S/];

/** Los bloques rotulados del documento, en orden de aparicion. */
function bloquesDe(texto) {
  const lineas = texto.split(/\r?\n/);
  const bloques = [];
  for (let i = 0; i < lineas.length; i += 1) {
    const rotulo = lineas[i].trim();
    if (rotulo !== ROTULO_POSIX && rotulo !== ROTULO_WINDOWS) continue;
    const cuerpo = [];
    for (let j = i + 1; j < lineas.length; j += 1) {
      if (lineas[j].trim() === "") break;
      if (lineas[j].trim() === ROTULO_POSIX || lineas[j].trim() === ROTULO_WINDOWS) break;
      cuerpo.push({ numero: j + 1, texto: lineas[j] });
    }
    bloques.push({ sistema: rotulo === ROTULO_POSIX ? "posix" : "windows", numero: i + 1, cuerpo });
  }
  return bloques;
}

/** Los problemas de multiplataforma del documento. Lista vacia = documento sano. */
function problemasDeArranque(texto) {
  const lineas = texto.split(/\r?\n/);
  const bloques = bloquesDe(texto);
  const problemas = [];

  // En que bloque cae cada linea del archivo (null = fuera de todo bloque).
  const sistemaDe = new Map();
  for (const b of bloques) for (const l of b.cuerpo) sistemaDe.set(l.numero, b.sistema);

  lineas.forEach((linea, i) => {
    const numero = i + 1;
    const dentro = sistemaDe.get(numero) ?? null;
    if (SOLO_WINDOWS.some((r) => r.test(linea)) && dentro !== "windows") {
      problemas.push(
        `linea ${numero}: comando de PowerShell fuera de un bloque "${ROTULO_WINDOWS}" -> ${linea.trim()}`,
      );
    }
    if (SOLO_POSIX.some((r) => r.test(linea)) && dentro !== "posix") {
      problemas.push(
        `linea ${numero}: comando de shell POSIX fuera de un bloque "${ROTULO_POSIX}" -> ${linea.trim()}`,
      );
    }
  });

  // Los rotulos van de a pares y en orden: primero el de POSIX, despues el de
  // Windows. Un bloque solo es exactamente el defecto que esto existe para cazar.
  if (bloques.length === 0) {
    problemas.push("no hay ningun bloque rotulado: o el documento perdio sus comandos, o los rotulos cambiaron de forma");
  }
  if (bloques.length % 2 !== 0) {
    problemas.push(`hay ${bloques.length} bloques rotulados, un numero impar: alguno se quedo sin su gemelo`);
  }
  for (let i = 0; i + 1 < bloques.length; i += 2) {
    const [a, b] = [bloques[i], bloques[i + 1]];
    if (a.sistema !== "posix" || b.sistema !== "windows") {
      problemas.push(
        `los bloques de las lineas ${a.numero} y ${b.numero} no forman un par "${ROTULO_POSIX}" + "${ROTULO_WINDOWS}"`,
      );
    }
  }
  for (const b of bloques) {
    if (b.cuerpo.length === 0) problemas.push(`el bloque de la linea ${b.numero} quedo vacio: rotula un comando que no esta`);
  }
  return problemas;
}

test("arranque local · ningun comando de un solo sistema se queda sin su gemelo", () => {
  const texto = fs.readFileSync(ARRANQUE, "utf8");
  assert.deepEqual(
    problemasDeArranque(texto),
    [],
    "plantilla/comandos-levantar-servicios.txt tiene comandos que una de las dos plataformas no puede ejecutar. " +
      `Arreglo: poner los que difieren en dos bloques consecutivos, "${ROTULO_POSIX}" y "${ROTULO_WINDOWS}", ` +
      "cada uno hasta la primera linea en blanco. Los identicos van una sola vez y sin rotulo",
  );
  // Sin al menos un par, todo lo de arriba pasaria sobre un archivo vacio.
  const pares = bloquesDe(texto).length / 2;
  assert.ok(pares >= 3, `solo ${pares} pares de bloques: se esperaban al menos los tres que difieren (copia de los .env, ubicarse en el clon, y el E2E con su variable de entorno)`);
});

test("arranque local · la comprobacion MUERDE", () => {
  const texto = fs.readFileSync(ARRANQUE, "utf8");
  const mutaciones = [
    {
      nombre: "el bloque de POSIX se borra y queda solo el de PowerShell",
      mutar: (t) => t.replace(`   ${ROTULO_POSIX}\ncp api/.env.example api/.env\ncp web/.env.example web/.env\n\n`, ""),
    },
    {
      nombre: "un cmdlet se escribe suelto, fuera de todo bloque",
      mutar: (t) => t.replace("pnpm install\n", "pnpm install\nRemove-Item pnpm-lock.yaml\n"),
    },
    {
      nombre: "el E2E vuelve a tener solo la forma POSIX",
      mutar: (t) =>
        t.replace(`\n   ${ROTULO_WINDOWS}\n$env:E2E_BASE_URL='https://...'; pnpm e2e\n`, "\n"),
    },
  ];
  for (const m of mutaciones) {
    const mutado = m.mutar(texto);
    assert.notEqual(mutado, texto, `la mutacion "${m.nombre}" no cambio nada: el ancla que usa se movio y la prueba estaba pasando en vacio`);
    assert.notDeepEqual(problemasDeArranque(mutado), [], `la mutacion "${m.nombre}" no fue detectada`);
  }
});

// ---------------------------------------------------------------------------
// 2 · EL ANDAMIO NO LE REPARTE AL PROYECTO UN CACHE DE DEPENDENCIAS
//
// El cache de GitHub Actions se ESCRIBE desde cualquier rama del repositorio y
// se restaura en las corridas de la rama por defecto: un PR cualquiera puede
// sembrar el store que despues consume main, y la restauracion por restore-keys
// admite coincidencia parcial de clave. Es el unico canal de ESCRITURA que
// alguien de afuera tiene hacia el runner, y el job que instala dependencias es
// justamente el que ejecuta codigo que nadie leyo.
//
// El marco no lo usa sobre si mismo. Esta prueba existe para que la decision de
// que el andamio tampoco lo use no se revierta sin diff.
//
// LIMITE DECLARADO: la comprobacion es por ARCHIVO y no por job. Si un workflow
// del andamio corre `pnpm install`, ninguno de sus jobs puede declarar `cache:`.
// Es mas estricto que el motivo —el riesgo es del job que instala— y hoy no
// produce ningun falso positivo. Si algun dia un workflow necesita cachear otra
// cosa en un job que no instala nada, esto se pone rojo y hay que afinarlo a
// nivel de job: es rojo por exceso de celo, que es el lado correcto para
// equivocarse.
// ---------------------------------------------------------------------------

function workflowsDelAndamio() {
  return fs
    .readdirSync(WORKFLOWS)
    .filter((f) => f.endsWith(".yml") || f.endsWith(".yaml"))
    .map((f) => ({ nombre: f, texto: fs.readFileSync(path.join(WORKFLOWS, f), "utf8") }));
}

/** Los workflows que instalan dependencias Y declaran un cache. */
function cachesEnJobsQueInstalan(archivos) {
  const hallazgos = [];
  for (const { nombre, texto } of archivos) {
    if (!/^\s*-?\s*run:.*pnpm install/m.test(texto)) continue;
    texto.split(/\r?\n/).forEach((linea, i) => {
      if (/^\s*cache:\s*\S/.test(linea)) hallazgos.push(`${nombre}:${i + 1} -> ${linea.trim()}`);
    });
  }
  return hallazgos;
}

test("andamio · ningun workflow que instale dependencias declara un cache", () => {
  const archivos = workflowsDelAndamio();
  // Sin ningun workflow que instale, la comprobacion pasaria en vacio.
  const queInstalan = archivos.filter((a) => /^\s*-?\s*run:.*pnpm install/m.test(a.texto));
  assert.ok(
    queInstalan.length >= 1,
    "ningun workflow del andamio corre `pnpm install`: o se movio el paso o se renombro el gestor, y esta comprobacion quedo mirando al vacio",
  );
  assert.deepEqual(
    cachesEnJobsQueInstalan(archivos),
    [],
    "un workflow del andamio volvio a declarar un cache de dependencias. Si la decision cambio, cambiala con su motivo medido al lado: clave EXACTA (sin restore-keys) y por que el ahorro compensa un canal de escritura que cualquier rama puede sembrar",
  );
});

test("andamio · la comprobacion del cache MUERDE", () => {
  const archivos = workflowsDelAndamio();
  const mutados = archivos.map((a) => ({
    nombre: a.nombre,
    texto: a.texto.replace(/(^\s*)node-version: "22"/m, '$1node-version: "22"\n$1cache: pnpm'),
  }));
  assert.notDeepEqual(
    mutados.map((m) => m.texto),
    archivos.map((a) => a.texto),
    "la mutacion no cambio ningun archivo: el ancla `node-version` se movio",
  );
  assert.notDeepEqual(cachesEnJobsQueInstalan(mutados), [], "un `cache:` reintroducido no fue detectado");
});

// ---------------------------------------------------------------------------
// 3 · EN plantilla/ UN COMENTARIO DICE POR QUE, NUNCA DONDE SE APRENDIO
//
// La regla, decidible: el material que se copia a un repo nuevo no nombra el
// repositorio ni el proyecto donde se aprendio la leccion. «El bypass no puede
// depender de una variable de entorno porque una variable puede faltar en
// produccion» es cierto y util en cualquier repo; «fue el bug critico de tal
// proyecto» solo lo es para quien conoce ese proyecto. La procedencia no se
// pierde: vive en el CHANGELOG y en el archivo hermano del marco, que no se
// copia.
//
// ── LIMITE DECLARADO ───────────────────────────────────────────────────────
// Es una lista de las formas EXACTAS que ya aparecieron, no un detector de la
// idea: una redaccion nueva que diga lo mismo con otras palabras se escapa. Es
// el mismo alcance acotado que pinado.test.mjs usa para la frase de v1, y por el
// mismo motivo: decidir si una frase atribuye o explica no se resuelve con un
// escaneo de texto.
//
// Queda FUERA a proposito «consumidor de referencia». Ahi el andamio no dice
// donde aprendio una regla: cita la decision de otro proyecto COMO EJEMPLO, con
// su medicion al lado y con la advertencia de no copiarla sin repetir la prueba
// (el encabezado de infra/pendientes.tf lo explica). Prohibirlo obligaria a
// borrar el ejemplo, que es lo unico que vuelve decidible el pendiente.
// ---------------------------------------------------------------------------

// Lo que se vigila son FRASES DE PROCEDENCIA, no nombres propios. La diferencia
// importa: un nombre concreto se puede renombrar y la guarda queda mirando algo
// que ya no existe, mientras que «lo aprendimos en X» es la forma que vuelve sola
// cada vez que alguien documenta una regla contando de donde salio. En plantilla/
// un comentario dice POR QUE la regla es cierta en cualquier repo, nunca DONDE se
// aprendio: el proyecto que hereda el andamio no tiene por que conocer la historia
// interna del marco.
const PROCEDENCIAS = [
  "un-proyecto-anterior",
  "repo de origen",
  "repositorio de origen",
  "proyecto de referencia",
  "consumidor de referencia",
  "material de origen",
  "el marco existe para",
];

// EXCEPCIONES VIGENTES, con su motivo y su condicion de muerte. Cada una tiene
// que SEGUIR matcheando: cuando el archivo se limpia, la excepcion queda muerta
// y esta prueba se pone roja pidiendo que se borre. Asi la lista no sobrevive a
// lo que la justificaba, que es como una excepcion se convierte en un agujero.
// Las dos excepciones que vivian aca murieron cuando los archivos se limpiaron, y
// el banco lo dijo solo: ese es el mecanismo. Una excepcion sin su archivo detras es
// un agujero esperando a que alguien vuelva a caer por el, asi que la lista se queda
// vacia hasta que haya un caso real que justificar.
const EXCEPCIONES = [];

/** Todos los archivos de texto del andamio, con su ruta relativa a plantilla/. */
function archivosDelAndamio(dir = ANDAMIO, acumulado = []) {
  for (const entrada of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entrada.name);
    if (entrada.isDirectory()) {
      archivosDelAndamio(abs, acumulado);
      continue;
    }
    // Los binarios no tienen comentarios que auditar y ensucian el escaneo.
    if (/\.(png|jpe?g|gif|ico|pdf|woff2?)$/i.test(entrada.name)) continue;
    acumulado.push(abs);
  }
  return acumulado;
}

/** Los problemas de procedencia de un arbol de andamio. */
function problemasDeProcedencia(raizAndamio, excepciones = EXCEPCIONES) {
  const problemas = [];
  const exentos = new Set(excepciones.map((e) => e.archivo));
  const vistas = new Map(excepciones.map((e) => [e.archivo, new Set()]));

  for (const abs of archivosDelAndamio(raizAndamio)) {
    const rel = path.relative(raizAndamio, abs).split(path.sep).join("/");
    const texto = fs.readFileSync(abs, "utf8").toLowerCase();
    for (const frase of PROCEDENCIAS) {
      if (!texto.includes(frase)) continue;
      if (exentos.has(rel) && excepciones.find((e) => e.archivo === rel).frases.includes(frase)) {
        vistas.get(rel).add(frase);
        continue;
      }
      problemas.push(
        `${rel}: nombra la procedencia ("${frase}"). Arreglo: escribi POR QUE la regla es cierta en cualquier repositorio y borra donde se aprendio; la procedencia va al CHANGELOG del marco`,
      );
    }
  }

  for (const e of excepciones) {
    for (const frase of e.frases) {
      if (!vistas.get(e.archivo).has(frase)) {
        problemas.push(
          `excepcion muerta: plantilla/${e.archivo} ya no contiene "${frase}". Arreglo: borra su entrada de excepciones en este banco`,
        );
      }
    }
  }
  return problemas;
}

test("andamio · ningun comentario explica DONDE se aprendio la regla en vez de POR QUE", () => {
  // Cero archivos escaneados seria un banco roto, no un andamio limpio.
  assert.ok(archivosDelAndamio().length > 40, `solo ${archivosDelAndamio().length} archivos escaneados: el recorrido se rompio`);
  assert.deepEqual(problemasDeProcedencia(ANDAMIO), []);
});

test("andamio · la comprobacion de procedencia MUERDE", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "projects-andamio-"));
  const copia = path.join(tmp, "plantilla");
  fs.cpSync(ANDAMIO, copia, { recursive: true });

  // (a) una procedencia nueva en un archivo que hoy esta limpio.
  const gitattributes = path.join(copia, ".gitattributes");
  fs.appendFileSync(gitattributes, "\n# La leccion venia del repo de origen.\n");
  assert.notDeepEqual(problemasDeProcedencia(copia), [], "una procedencia reintroducida no fue detectada");

  // (b) una excepcion que sobrevive a lo que la justificaba. EXCEPCIONES esta vacia
  // —el andamio quedo limpio y las dos que habia murieron— asi que la mitad muerta
  // del mecanismo se prueba con una excepcion FABRICADA para este caso: si se
  // probara con una entrada real, esta prueba se caeria sola la proxima vez que
  // alguien limpie el archivo que la justificaba, que es justo lo que hay que
  // celebrar y no lo que hay que reparar.
  fs.writeFileSync(gitattributes, fs.readFileSync(gitattributes, "utf8").replace("\n# La leccion venia del repo de origen.\n", ""));
  assert.deepEqual(problemasDeProcedencia(copia), [], "la copia limpia no volvio al estado del arbol real");
  const inventada = [{ archivo: ".gitattributes", frases: ["repo de origen"], motivo: "fabricada por el banco" }];
  const muertas = problemasDeProcedencia(copia, inventada).filter((p) => p.startsWith("excepcion muerta:"));
  assert.equal(muertas.length, 1, "una excepcion cuyo archivo ya no tiene la frase tiene que pedirse borrar");

  fs.rmSync(tmp, { recursive: true, force: true });
});
