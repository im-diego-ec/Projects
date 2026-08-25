// LO QUE EL ANDAMIO LE ENTREGA A UN REPOSITORIO NUEVO TIENE QUE SER CIERTO Y
// USABLE *EN ESE* REPOSITORIO.
//
// POR QUE ESTAN LAS SEIS JUNTAS. Son la misma clase de defecto, que solo se ve
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
//   4. El nombre del repositorio del marco escrito en minuscula. GitHub resuelve
//      el `uses:` igual, asi que no hay rojo; lo que se rompe son los escaneos
//      del marco que buscan esas referencias por texto para comprobar que esten
//      pinadas, y una guarda que no encuentra la linea que audita sale verde.
//   5. El residuo de una pasada de reemplazo: «el un consumidor», donde el
//      articulo viejo quedo pegado al nombre nuevo. Ningun linter mira un
//      comentario, asi que viaja intacto a cada repo que nazca del andamio.
//   6. Una AUTORIA declarada en el frontmatter de un archivo que se copia. El
//      andamio se copia UNA vez y desde ahi cada archivo es del proyecto que lo
//      recibio: un `author:` que sobrevive le atribuye a otro un archivo que ya
//      no es suyo, y nadie lo relee porque el frontmatter se lee una sola vez.
//
// Las seis MUERDEN: cada comprobacion se corre tambien sobre una copia mutada en
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
  // EL ANCLA ES `node-version` CON CUALQUIER MAYOR, no una en particular, y esa
  // generalidad se pago: escrita como `"22"` fija, el dia que el andamio subio a
  // la LTS 24 la mutacion dejo de aplicar en ci.yml y cayo en el unico workflow
  // que no instala nada, asi que esta prueba se puso roja anunciando "el ancla se
  // movio" cuando lo unico que habia cambiado era el numero. La compuerta que
  // demuestra no depende de que mayor de Node use el andamio.
  const mutados = archivos.map((a) => ({
    nombre: a.nombre,
    texto: a.texto.replace(/(^\s*)(node-version: "\d+")/m, "$1$2\n$1cache: pnpm"),
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
// «consumidor de referencia» SIGUE EN LA LISTA, y el UNICO archivo del andamio
// que hoy la usa —infra/pendientes.tf— esta en EXCEPCIONES con su motivo. La
// diferencia con sacarla de la lista no es de estilo: ahi el andamio no dice
// donde aprendio una regla, cita la decision de otro proyecto COMO EJEMPLO, con
// su medicion al lado y con la advertencia de no copiarla sin repetir la prueba
// (el encabezado de ese mismo archivo lo explica). Prohibirlo obligaria a borrar
// el ejemplo, que es lo unico que vuelve decidible el pendiente. Pero el permiso
// es de ESE ARCHIVO, no de la frase: en cualquier otro se sigue reportando —el
// segundo uso que habia, en eslint.config.mjs, contaba DONDE habia pasado algo y
// se reescribio en vez de eximirlo— y cuando ese encabezado se reescriba la
// excepcion queda muerta y este banco pide que se borre. Hasta el 2026-08-24
// esto estaba escrito como si la frase estuviera fuera de la lista, y no lo
// estaba: el arbol pasaba por el fail-open de abajo, no por ninguna excepcion.
//
// ── EL FAIL-OPEN QUE ESTA GUARDA TENIA, y por que la busqueda normaliza ─────
// La comparacion era `texto.includes(frase)` sobre el archivo CRUDO. Un
// comentario largo se parte en varias lineas, asi que «consumidor de referencia»
// escrito en eslint.config.mjs quedaba como "consumidor de\n        // referencia"
// y la guarda no lo veia: la frase estaba en su propia lista, en el arbol, y el
// banco daba verde. Es el patron que este marco persigue —una compuerta que no
// tapa su propio caso— dentro de la compuerta misma. Por eso ahora se busca
// sobre el texto NORMALIZADO: los saltos de linea y el prefijo de comentario que
// abre la linea siguiente colapsan a un solo espacio, asi que una frase partida
// por el wrap se lee igual que una frase entera. Envolver un comentario deja de
// ser una forma de esconder una procedencia.
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
  // Las dos formas que se escaparon de la lista mientras la busqueda no
  // normalizaba: el andamio las tenia escritas y esta guarda no las nombraba.
  // «el piloto» estaba en un ejemplo de config de cobertura ("heredado del
  // piloto") y «un proyecto consumidor» en dos comentarios del API. Los dos
  // archivos ya estan limpios; las frases quedan aca para que no vuelvan.
  "el piloto",
  "un proyecto consumidor",
  // Y la forma mas escurridiza de todas, porque no parece una procedencia: el
  // ARTICULO DETERMINADO delante de "consumidor". «un consumidor» describe una
  // CLASE —cualquier repo que consuma el marco— y es legitimo en cualquier
  // repositorio; «el consumidor» senala a UNO en particular, que en el repo que
  // recibe el andamio no existe. La diferencia es de una letra y decide si el
  // comentario ensena una regla o cita un caso que el lector no puede consultar.
  // Estaba viva en la config de cobertura del andamio, contando a que paquete le
  // habia pasado en vez de por que el mecanismo es cierto.
  //
  // UNA SOLA ENTRADA, y «del consumidor» NO esta: la busqueda es por texto y
  // "del consumidor" CONTIENE "el consumidor", asi que la segunda entrada no
  // podria reportar nada que la primera no reporte ya. Escrita igual, cada
  // mencion salia dos veces en la lista de problemas y una entrada que no puede
  // ser la unica que muerde es una entrada muerta.
  "el consumidor",
];

// EXCEPCIONES VIGENTES, con su motivo y su condicion de muerte. Cada una tiene
// que SEGUIR matcheando: cuando el archivo se limpia, la excepcion queda muerta
// y esta prueba se pone roja pidiendo que se borre. Asi la lista no sobrevive a
// lo que la justificaba, que es como una excepcion se convierte en un agujero.
// Las dos excepciones que vivian aca murieron cuando los archivos se limpiaron, y
// el banco lo dijo solo: ese es el mecanismo. Una excepcion sin su archivo detras es
// un agujero esperando a que alguien vuelva a caer por el, asi que la lista solo
// lleva casos reales, y cada uno tiene que SEGUIR matcheando.
const EXCEPCIONES = [
  {
    archivo: "infra/pendientes.tf",
    // Las dos formas de la MISMA mencion: la frase entera y el articulo
    // determinado que la abre. Se listan las dos porque la busqueda es por
    // texto y "el consumidor" matchea dentro de "el consumidor de referencia";
    // sin la segunda entrada, la excepcion tapaba una frase y dejaba la otra en
    // rojo sobre el mismo renglon.
    frases: ["consumidor de referencia", "el consumidor"],
    motivo:
      "Es el unico lugar del andamio donde la frase no explica DONDE se aprendio una regla: " +
      "el encabezado de los pendientes dice que aca NO estan las respuestas de otro proyecto, " +
      "y nombra al consumidor de referencia para advertir que sus respuestas estan razonadas " +
      "contra mediciones suyas y que copiarlas sin su razon las convierte en decisiones que " +
      "nadie tomo. Borrar la frase borraria la advertencia, que es lo que vuelve decidible el " +
      "pendiente. Condicion de muerte: si el encabezado se reescribe sin nombrarlo, esta " +
      "entrada queda muerta y el banco pide borrarla.",
  },
];

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

/**
 * El texto de un archivo aplanado para buscar frases en el.
 *
 * QUE COLAPSA Y POR QUE. Un salto de linea seguido de la sangria y del prefijo
 * que abre el comentario siguiente (`//`, `#`, `*` de un bloque JSDoc, `--`, `;`)
 * pasa a ser UN espacio, y las corridas de espacios y tabs pasan a ser uno. Con
 * eso, «consumidor de\n        // referencia» y «consumidor de referencia» son el
 * mismo texto para la busqueda. Sin eso, envolver un comentario alcanzaba para
 * esconder una frase de la lista: era el fail-open de esta guarda.
 *
 * Colapsar de mas es la direccion SEGURA del error: puede juntar el final de una
 * linea con el principio de la siguiente y reportar una frase que nadie escribio
 * de corrido, y eso se resuelve leyendo el archivo. Colapsar de menos deja pasar
 * la frase, y eso no se resuelve nunca porque nadie se entera.
 */
function normalizado(texto) {
  return texto
    .toLowerCase()
    .replace(/[\r\n]+[ \t]*(?:\/\/+|#+|\*+|--+|;+)?[ \t]*/g, " ")
    .replace(/[ \t]+/g, " ");
}

/** Los problemas de procedencia de un arbol de andamio. */
function problemasDeProcedencia(raizAndamio, excepciones = EXCEPCIONES) {
  const problemas = [];
  const exentos = new Set(excepciones.map((e) => e.archivo));
  const vistas = new Map(excepciones.map((e) => [e.archivo, new Set()]));

  for (const abs of archivosDelAndamio(raizAndamio)) {
    const rel = path.relative(raizAndamio, abs).split(path.sep).join("/");
    const texto = normalizado(fs.readFileSync(abs, "utf8"));
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
  fs.writeFileSync(gitattributes, fs.readFileSync(gitattributes, "utf8").replace("\n# La leccion venia del repo de origen.\n", ""));

  // (a bis) EL ARTICULO DETERMINADO, que es la forma que se colaba sin parecer
  // una procedencia. Se prueban las dos ortografias, y al lado la version con
  // articulo INDETERMINADO —que describe una clase y es legitima en cualquier
  // repositorio— para que quede probado que la guarda muerde por el determinante
  // y no por la palabra "consumidor".
  for (const frase of ["# el consumidor tenia el umbral en 70.6", "# el reporte del consumidor lo media asi"]) {
    fs.appendFileSync(gitattributes, `\n${frase}\n`);
    const problemas = problemasDeProcedencia(copia);
    assert.equal(problemas.length, 1, `"${frase}" no se detecto: ${JSON.stringify(problemas)}`);
    assert.match(problemas[0], /^\.gitattributes: nombra la procedencia/);
    fs.writeFileSync(gitattributes, fs.readFileSync(gitattributes, "utf8").replace(`\n${frase}\n`, ""));
  }
  fs.appendFileSync(gitattributes, "\n# un consumidor del marco puede recortar esta lista\n");
  assert.deepEqual(
    problemasDeProcedencia(copia),
    [],
    "«un consumidor» describe una clase y es legitimo en cualquier repositorio: la guarda esta mordiendo por la palabra y no por el determinante",
  );
  fs.writeFileSync(gitattributes, fs.readFileSync(gitattributes, "utf8").replace("\n# un consumidor del marco puede recortar esta lista\n", ""));

  // (b) una excepcion que sobrevive a lo que la justificaba. EXCEPCIONES esta vacia
  // —el andamio quedo limpio y las dos que habia murieron— asi que la mitad muerta
  // del mecanismo se prueba con una excepcion FABRICADA para este caso: si se
  // probara con una entrada real, esta prueba se caeria sola la proxima vez que
  // alguien limpie el archivo que la justificaba, que es justo lo que hay que
  // celebrar y no lo que hay que reparar.
  assert.deepEqual(problemasDeProcedencia(copia), [], "la copia limpia no volvio al estado del arbol real");
  const inventada = [{ archivo: ".gitattributes", frases: ["repo de origen"], motivo: "fabricada por el banco" }];
  const muertas = problemasDeProcedencia(copia, inventada).filter((p) => p.startsWith("excepcion muerta:"));
  assert.equal(muertas.length, 1, "una excepcion cuyo archivo ya no tiene la frase tiene que pedirse borrar");

  // (c) EL FAIL-OPEN DEL WRAP, que es por lo que esta guarda existia sin morder.
  // La MISMA frase escrita partida por el salto de linea de un comentario tiene
  // que reportarse igual que escrita de corrido. Se prueba con las tres
  // ortografias de comentario que el andamio usa —`//`, `#` y el `*` de un
  // bloque JSDoc— porque el prefijo de la linea siguiente es justamente lo que
  // se colaba entre las dos mitades de la frase.
  const partidas = [
    ["wrap-doble-barra.mjs", "// una regla que venia del repo de\n// origen y nadie volvio a mirar\n"],
    ["wrap-numeral.yml", "# una regla que venia del repositorio de\n#   origen y nadie volvio a mirar\n"],
    ["wrap-jsdoc.ts", "/**\n * una regla que venia del material de\n * origen y nadie volvio a mirar\n */\n"],
  ];
  for (const [nombre, contenido] of partidas) {
    const suelto = path.join(copia, nombre);
    fs.writeFileSync(suelto, contenido);
    const problemas = problemasDeProcedencia(copia);
    assert.equal(
      problemas.length,
      1,
      `la procedencia de ${nombre} esta partida por el wrap del comentario y no se detecto: ${JSON.stringify(problemas)}`,
    );
    assert.match(problemas[0], new RegExp(`^${nombre}: nombra la procedencia`));
    fs.rmSync(suelto);
  }
  assert.deepEqual(problemasDeProcedencia(copia), [], "la copia no volvio limpia despues de los casos partidos");

  fs.rmSync(tmp, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// 4 · EL NOMBRE DEL REPOSITORIO DEL MARCO SE ESCRIBE `Projects`, CON MAYUSCULA
//
// POR QUE ES UNA GUARDA Y NO UNA PREFERENCIA DE ESTILO. GitHub resuelve el slug
// de un `uses:` sin distinguir mayusculas, asi que un `<org>/projects/...` FUNCIONA
// y no hay ningun rojo que lo denuncie. Lo que no funciona son las cosas que el
// marco construye ALREDEDOR de ese slug: los escaneos que buscan las referencias
// al marco para comprobar que esten pinadas van por texto, y ya se rompieron dos
// veces contra una ortografia en minuscula — una guarda que no encuentra la linea
// que viene a auditar sale verde por construccion, que es el fail-open mas barato
// que hay. El costo de escribirlo bien es cero; el de escribirlo mal no se ve.
//
// LA REGLA, DECIDIBLE: detras de un prefijo de CUENTA —el marcador que sustituye
// el andamio, el `<org>` de la prosa o la cuenta literal— el segmento siguiente
// es el nombre del repositorio, y tiene que ser exactamente `Projects`. Una ruta
// del sistema de archivos (`/tmp/projects`) no lleva prefijo de cuenta y por eso
// queda fuera sin necesidad de una excepcion.
// ---------------------------------------------------------------------------
const CUENTA = String.raw`(?:\{\{ORG\}\}|<org>|im-diego-ec)`;
const SLUG = new RegExp(`${CUENTA}/([A-Za-z][A-Za-z0-9_.-]*)(?=[/@\`'"\\s)])`, "g");

/** Las referencias al repositorio del marco mal escritas, con su ubicacion. */
function slugsMalEscritos(raizAndamio) {
  const problemas = [];
  for (const abs of archivosDelAndamio(raizAndamio)) {
    const rel = path.relative(raizAndamio, abs).split(path.sep).join("/");
    const lineas = fs.readFileSync(abs, "utf8").split(/\r?\n/);
    lineas.forEach((linea, i) => {
      for (const m of linea.matchAll(SLUG)) {
        if (m[1] === "Projects") continue;
        problemas.push(
          `${rel}:${i + 1}: el repositorio del marco se llama "Projects" con mayuscula y aca dice "${m[0]}". Arreglo: escribilo Projects; los escaneos de pinado del marco buscan por texto y no lo encuentran asi`,
        );
      }
    });
  }
  return problemas;
}

test("andamio · toda referencia al repositorio del marco lo escribe `Projects`", () => {
  // Cero referencias encontradas seria la guarda mirando al vacio: el andamio
  // consume el marco por `uses:` en varios archivos y tiene que verlas.
  let vistas = 0;
  for (const abs of archivosDelAndamio()) {
    vistas += [...fs.readFileSync(abs, "utf8").matchAll(SLUG)].length;
  }
  assert.ok(vistas >= 6, `solo ${vistas} referencias al marco encontradas: el patron dejo de matchear`);
  assert.deepEqual(slugsMalEscritos(ANDAMIO), []);
});

test("andamio · la comprobacion del nombre del repositorio MUERDE", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "projects-slug-"));
  const copia = path.join(tmp, "plantilla");
  fs.cpSync(ANDAMIO, copia, { recursive: true });
  assert.deepEqual(slugsMalEscritos(copia), [], "la copia no arranco limpia");

  // Las tres ortografias de cuenta, cada una con el repo en minuscula. Y una
  // ruta del sistema de archivos al lado, que NO se reporta: si se reportara, la
  // guarda tendria que llevar una excepcion y una excepcion es un agujero.
  const suelto = path.join(copia, "slug-de-prueba.md");
  fs.writeFileSync(
    suelto,
    ["uses: {{ORG}}/projects/actions/x@v1", "ver <org>/projects/.github", "uses: im-diego-ec/projects@v1", "cp -r /tmp/projects/plantilla/. .", ""].join("\n"),
  );
  const problemas = slugsMalEscritos(copia);
  assert.equal(problemas.length, 3, `las tres ortografias tenian que reportarse y la ruta local no: ${JSON.stringify(problemas)}`);
  assert.ok(problemas.every((p) => p.startsWith("slug-de-prueba.md:")));
  assert.deepEqual(
    problemas.map((p) => p.split(":")[1]),
    ["1", "2", "3"],
    "la linea que reporta cada problema no es la del hallazgo",
  );

  fs.rmSync(suelto);
  assert.deepEqual(slugsMalEscritos(copia), [], "la copia no volvio limpia");
  fs.rmSync(tmp, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// 5 · NINGUNA PASADA DE REEMPLAZO DEJA EL ARTICULO VIEJO PEGADO AL NUEVO
//
// POR QUE ES UNA GUARDA Y NO UNA CORRECCION DE ESTILO. Los reemplazos masivos de
// nombres son la forma en que este arbol se anonimiza y se renombra, y siempre
// sustituyen el SUSTANTIVO sin mirar el determinante que lo precedia: «el
// <nombre>» se convierte en «el un consumidor», «del <nombre>» en «del un
// consumidor». El texto sigue leyendose casi bien, ningun linter lo mira —son
// comentarios y prosa— y viaja a cada repositorio que nazca del andamio, incluido
// el comentario del middleware de autenticacion que un ingeniero SI abre. Cuando
// esta guarda se escribio el 2026-08-24 el andamio traia casos vivos en cuatro
// archivos, todos de la misma pasada; el numero exacto no se anota aca porque lo
// mide la comprobacion de abajo cada vez que corre.
//
// LA REGLA, DECIDIBLE: en castellano un articulo determinado no precede a uno
// indeterminado. «el un», «del un» y «al un» seguidos de palabra son siempre el
// residuo de un reemplazo, nunca una frase que alguien escribio a proposito.
// ---------------------------------------------------------------------------
const ARTICULO_PEGADO = /\b(?:el|del|al)\s+un\s+[a-záéíóúñ]/i;

/** Los residuos de reemplazo del andamio, con archivo y linea. */
function articulosPegados(raizAndamio) {
  const problemas = [];
  for (const abs of archivosDelAndamio(raizAndamio)) {
    const rel = path.relative(raizAndamio, abs).split(path.sep).join("/");
    fs.readFileSync(abs, "utf8")
      .split(/\r?\n/)
      .forEach((linea, i) => {
        const m = linea.match(ARTICULO_PEGADO);
        if (!m) return;
        problemas.push(
          `${rel}:${i + 1}: "${m[0].trim()}" — un articulo determinado delante de uno indeterminado es el residuo de una pasada de reemplazo que sustituyo el nombre y dejo el determinante viejo. Arreglo: borra el determinante que sobra`,
        );
      });
  }
  return problemas;
}

test("andamio · ninguna linea arrastra el articulo viejo de un reemplazo", () => {
  assert.deepEqual(articulosPegados(ANDAMIO), []);
});

test("andamio · la comprobacion del articulo pegado MUERDE", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "projects-articulo-"));
  const copia = path.join(tmp, "plantilla");
  fs.cpSync(ANDAMIO, copia, { recursive: true });
  assert.deepEqual(articulosPegados(copia), [], "la copia no arranco limpia");

  // Las tres formas, y debajo dos que NO se reportan: «el unico» (una palabra
  // sola que empieza igual) y «un consumidor» ya sano. Sin esos dos controles la
  // guarda podria estar mordiendo por el prefijo y no por la construccion.
  const suelto = path.join(copia, "residuo-de-prueba.md");
  fs.writeFileSync(
    suelto,
    ["Le paso en el un proyecto vecino.", "fue el bug del un servicio.", "medido al un consumidor.", "es el unico lugar legitimo.", "lo midio un consumidor.", ""].join("\n"),
  );
  const problemas = articulosPegados(copia);
  assert.equal(problemas.length, 3, `las tres formas tenian que reportarse y las dos sanas no: ${JSON.stringify(problemas)}`);
  assert.deepEqual(
    problemas.map((p) => p.split(":")[1]),
    ["1", "2", "3"],
    "la linea que reporta cada residuo no es la del hallazgo",
  );

  fs.rmSync(suelto);
  assert.deepEqual(articulosPegados(copia), [], "la copia no volvio limpia");
  fs.rmSync(tmp, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// 6 · NADA DEL ANDAMIO DECLARA UNA AUTORIA
//
// POR QUE ES UNA GUARDA Y NO UNA PREFERENCIA. El contrato del andamio esta
// escrito en la primera linea de su propia guia: se copia UNA vez, y desde la
// copia cada archivo es DEL PROYECTO —si el proyecto necesita cambiarlo, lo
// cambia y no le debe nada a nadie—. Un `author:` en el frontmatter contradice
// ese contrato en el unico lugar donde nadie vuelve a mirar: el frontmatter se
// lee una vez, al crear el archivo, y despues es invisible. El resultado es un
// archivo que la gente del proyecto edita todos los dias mientras sigue
// declarando que lo escribio otro.
//
// Y EL CASO CONCRETO que lo hizo aparecer: el valor no era el nombre de una
// persona sino el de una ORGANIZACION, o sea un dato de procedencia con otra
// forma. Un repositorio nuevo que hereda el andamio puede ser de otra
// organizacion; ahi la linea no es imprecisa, es falsa.
//
// LA REGLA, DECIDIBLE: ninguna linea de ningun archivo del andamio abre con
// `author:`. La forma sin comillas es la de YAML —el frontmatter de las skills y
// de los agentes, y los propios workflows—, que es donde el dato se declara y
// donde deja de leerse.
//
// ── LIMITE DECLARADO ───────────────────────────────────────────────────────
// Es un escaneo de TEXTO y mira la forma, no el significado: un `author:` dentro
// de un objeto de JavaScript se reportaria igual. Es rojo por exceso de celo,
// que es el lado correcto para equivocarse, y hoy no produce ningun falso
// positivo. La forma con comillas (`"author":` de un package.json) queda fuera a
// proposito: ahi el campo es parte del manifiesto del paquete del proyecto, que
// el proyecto llena con lo suyo, no un dato que el andamio le imponga.
// ---------------------------------------------------------------------------
const AUTORIA = /^[ \t-]*author:[ \t]*\S/;

/** Las autorias declaradas en el andamio, con archivo y linea. */
function autoriasDeclaradas(raizAndamio) {
  const problemas = [];
  for (const abs of archivosDelAndamio(raizAndamio)) {
    const rel = path.relative(raizAndamio, abs).split(path.sep).join("/");
    fs.readFileSync(abs, "utf8")
      .split(/\r?\n/)
      .forEach((linea, i) => {
        if (!AUTORIA.test(linea)) return;
        problemas.push(
          `${rel}:${i + 1}: "${linea.trim()}" — el andamio se copia UNA vez y desde ahi el archivo es del proyecto que lo recibio, asi que una autoria declarada le atribuye a otro un archivo que ya no es suyo. Y el frontmatter se lee una sola vez: nadie va a volver a mirarla. Arreglo: borra la linea`,
        );
      });
  }
  return problemas;
}

test("andamio · ningun archivo declara una autoria", () => {
  assert.deepEqual(autoriasDeclaradas(ANDAMIO), []);
});

test("andamio · la comprobacion de la autoria MUERDE", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "projects-autoria-"));
  const copia = path.join(tmp, "plantilla");
  fs.cpSync(ANDAMIO, copia, { recursive: true });
  assert.deepEqual(autoriasDeclaradas(copia), [], "la copia no arranco limpia");

  // Las dos formas en que el dato entra —suelta y anidada bajo `metadata:`, que
  // es como estaba— y debajo las que NO se reportan: el campo de un manifiesto,
  // que es del proyecto, y la palabra dentro de una frase.
  const suelto = path.join(copia, "autoria-de-prueba.md");
  fs.writeFileSync(
    suelto,
    ["author: Una Organizacion", "metadata:", "  author: Una Organizacion", '  "author": "del manifiesto"', "el author del cambio queda en el CHANGELOG", ""].join("\n"),
  );
  const problemas = autoriasDeclaradas(copia);
  assert.equal(problemas.length, 2, `las dos formas de declararla tenian que reportarse y las otras dos no: ${JSON.stringify(problemas)}`);
  assert.deepEqual(
    problemas.map((p) => p.split(":")[1]),
    ["1", "3"],
    "la linea que reporta cada problema no es la del hallazgo",
  );
  assert.ok(problemas.every((p) => p.startsWith("autoria-de-prueba.md:")));

  fs.rmSync(suelto);
  assert.deepEqual(autoriasDeclaradas(copia), [], "la copia no volvio limpia");
  fs.rmSync(tmp, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// 7 · EL REPO NUEVO NACE CON PORTADA, Y LA PORTADA PIDE LO QUE LE FALTA
//
// POR QUE ES UNA GUARDA. `README.md` es el unico archivo que GitHub renderiza al
// entrar a un repositorio: es lo primero —y muchas veces lo unico— que lee quien
// llega. Su ausencia no rompe nada y no emite ninguna senal; simplemente el repo
// se presenta con una lista de directorios y nadie puede decir que hace.
//
// El andamio lo entrega, pero no puede escribirlo entero: que hace el proyecto,
// que dispara cada despliegue y que hacer cuando suena una alarma son respuestas
// que ninguna herramienta tiene. Lo que si puede es dejar el hueco MARCADO, para
// que la falta se vea con un grep en vez de leerse como una respuesta.
//
// De ahi que sean dos cosas y no una:
//   a) el archivo existe y viaja (con su renombre, porque en la raiz del andamio
//      convive con la guia del bootstrap y las dos se llamarian igual);
//   b) trae sus rotulos. Un README plantillado al que alguien le "termina" los
//      huecos borrandolos es peor que no tenerlo: se lee como completo.
//
// EL PISO ES UN MINIMO, NO EL NUMERO EXACTO. Contar los rotulos aca fijaria una
// cifra que envejece con la primera seccion que se agregue o se borre —y el
// propio documento no la anota, dice el grep que los cuenta—. Lo que esta guarda
// exige es que no se vacie.
// ---------------------------------------------------------------------------
const ROTULO_A_RELLENAR = /\bRELLENAR\b/;

test("andamio · el proyecto nace con un README propio, y aterriza como README.md", async () => {
  const { RENOMBRES, seExcluyeDelCopiado } = await import("../../herramientas/projects-init.mjs");
  const origen = "README-del-proyecto.md";

  assert.ok(
    fs.existsSync(path.join(ANDAMIO, origen)),
    `el andamio no trae ${origen}: el repo que nazca de el no tiene portada, y la ausencia de un README no pone nada en rojo`,
  );
  assert.equal(
    RENOMBRES.get(origen),
    "README.md",
    `${origen} tiene que aterrizar como README.md: con su nombre del andamio no es la portada de nada`,
  );
  assert.equal(
    seExcluyeDelCopiado(origen),
    false,
    `${origen} quedo excluido del copiado: el que NO viaja es la guia del bootstrap (README.md), no este`,
  );
  // Y el que no viaja sigue sin viajar: si los dos viajaran, dos archivos
  // pelearian por el mismo nombre en el destino.
  assert.equal(seExcluyeDelCopiado("README.md"), true);
});

/** La comprobacion, sobre la raiz de andamio que se le pase. Tira si el README
 *  del proyecto se quedo sin huecos. La corren las DOS pruebas de abajo: la del
 *  arbol real y la mordida, que es la unica forma de ver esta misma asercion en
 *  rojo en vez de una copia de su aritmetica. */
function exigirRotulos(raizAndamio) {
  const texto = fs.readFileSync(path.join(raizAndamio, "README-del-proyecto.md"), "utf8");
  const rotulos = texto.split(/\r?\n/).filter((l) => ROTULO_A_RELLENAR.test(l)).length;
  assert.ok(
    rotulos >= 4,
    `solo ${rotulos} linea(s) con RELLENAR en el README del proyecto. Los huecos son lo que vuelve VISIBLE lo ` +
      `que el andamio no puede responder: sin ellos el documento se lee como completo y nadie escribe lo que ` +
      `falta`,
  );
}

test("andamio · el README del proyecto conserva sus rotulos RELLENAR", () => {
  exigirRotulos(ANDAMIO);
});

test("andamio · la comprobacion de los rotulos MUERDE", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "projects-portada-"));
  const copia = path.join(tmp, "plantilla");
  try {
    fs.cpSync(ANDAMIO, copia, { recursive: true });
    const archivo = path.join(copia, "README-del-proyecto.md");
    const original = fs.readFileSync(archivo, "utf8");
    exigirRotulos(copia); // la copia arranca verde, con la comprobacion de verdad

    // El modo de falla real: alguien "termina" el README borrando los rotulos en
    // vez de contestarlos. El documento queda mas prolijo y deja de pedir nada.
    const sinRotulos = original.replaceAll("RELLENAR", "");
    assert.notEqual(sinRotulos, original, "la mutacion no cambio nada: el rotulo cambio de forma");
    fs.writeFileSync(archivo, sinRotulos);
    assert.throws(
      () => exigirRotulos(copia),
      /solo 0 linea\(s\) con RELLENAR/,
      "un README sin un solo rotulo tenia que poner la comprobacion en rojo",
    );

    fs.writeFileSync(archivo, original);
    exigirRotulos(copia); // y vuelve a verde: lo que muerde es la mutacion
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});
