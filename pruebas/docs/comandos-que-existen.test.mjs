import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { evolucionSegunElIndice } from "./lectura.mjs";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

// ---------------------------------------------------------------------------
// EL DEFECTO QUE ESTE BANCO CIERRA: la documentacion mandaba correr un comando
// que NO EXISTE, y era el PRIMERO del tramo de construir.
//
// `docs/09` decia «el directorio lo crea el comando» y daba `/opsx:new`. Medido
// contra el CLI que el marco pinea y contra lo que `openspec init` deja en un
// proyecto recien creado: los comandos que llegan son SEIS y `new` no es
// ninguno. Peor: la misma pagina PROHIBIA `/opsx:propose`, que es el unico que
// crea, asi que la persona quedaba entre un comando que no existe y otro que le
// dijeron que no use. Con eso, el tramo de construir no arrancaba.
//
// Un comando escrito en una guia es una promesa ejecutable. Este banco la mide.
// ---------------------------------------------------------------------------

/** Los seis comandos que `openspec init` deja en un proyecto.
 *
 *  MEDIDO EL 2026-08-26 sobre un proyecto recien generado con el pin del marco
 *  (`@fission-ai/openspec@1.9.0`), listando `.claude/commands/opsx/`. Se escribe
 *  a mano y no se deriva, por una razon: derivarlo exigiria correr `openspec
 *  init` —que baja un paquete de la red— en cada corrida del banco, y este
 *  repositorio corre sus pruebas sin red. La lista escrita es el precio de esa
 *  independencia, y el comentario de arriba dice como reproducirla. */
export const COMANDOS_DEL_PROYECTO = ["apply", "archive", "explore", "propose", "sync", "update"];

/** Las skills que deja `openspec init`. SEIS, y ese numero es el correcto para la
 *  documentacion: la septima que aparece en un proyecto —`projects-archive-change`—
 *  la pone ESTE MARCO, no OpenSpec. Decir «siete skills de openspec» es contar una
 *  que no es suya, y fue el error que reemplazo al «doce» anterior. */
export const CUANTAS_SKILLS = 6;

/** Los subcomandos que los archivos de `openspec init` mandan correr al agente.
 *
 *  MEDIDO EL 2026-08-31 sobre un proyecto recien generado, contando las
 *  invocaciones de `.claude/commands/opsx/` y `.claude/skills/openspec-*`. Se
 *  escribe a mano por el mismo motivo que COMANDOS_DEL_PROYECTO: derivarlo
 *  exigiria correr `openspec init` —que baja un paquete de la red— en cada
 *  corrida, y este repositorio corre sus pruebas sin red.
 *
 *  EL DEFECTO QUE ESTA LISTA CIERRA: esos archivos invocan `openspec` A SECAS, y
 *  ese programa no existe en la maquina de la persona —medido: no esta en el
 *  sistema, ni en node_modules/.bin, ni en las dependencias del proyecto—. Y
 *  aunque se use la forma con `npx`, CUATRO de estos subcomandos no estaban en
 *  el allowlist del proyecto, asi que la sesion del agente pedia permiso o se
 *  trababa justo en el tramo de construir. */
export const SUBCOMANDOS_QUE_USA_OPSX = [
  "archive",
  "context",
  "instructions",
  "list",
  "new change",
  "schemas",
  "status",
  "store",
  "validate",
];

/** Los que NO van al allowlist, con el motivo de cada uno.
 *
 *  `archive` no es una omision: cerrar un change usa la skill del marco, que
 *  ademas deja el rastro de que se aprobo y cuando. El CLI no lo hace. */
export const FUERA_DEL_ALLOWLIST = { archive: "lo reemplaza la skill projects-archive-change del marco" };

const listar = (...args) =>
  execFileSync("git", ["ls-files", ...args], { cwd: RAIZ, encoding: "utf-8" })
    .trim()
    .split("\n")
    .filter(Boolean);

const docs = () => listar("docs/*.md", "*.md").filter((f) => f !== "CHANGELOG.md");

/** Una pagina que EL INDICE declara historica: una foto fechada de una corrida,
 *  que el propio docs/README.md dice que «no se edita después». Corregirle una
 *  cifra es reescribir lo que se midio ese dia, que es el mismo motivo por el
 *  que quedan afuera los changes de openspec.
 *
 *  NO ES UNA LISTA A MANO, y ese es el punto: lo decide la tercera columna del
 *  indice, leida con la misma funcion que usa el estandar de lectura. El dia que
 *  una pagina deje de ser historica entra a este control sola. Y si el indice
 *  dejara de parsearse, esta funcion contesta que no para todo: el control se
 *  vuelve MAS exigente y se pone rojo, que es el lado seguro para fallar. */
const EVOLUCION_DE_DOCS = evolucionSegunElIndice();
const esHistorica = (f) => {
  if (!f.startsWith("docs/")) return false;
  const rel = f.slice("docs/".length);
  // El indice clasifica `adopciones/` como CARPETA —una fila para todos sus
  // archivos—, asi que preguntar solo por el nombre del archivo no la encuentra.
  return EVOLUCION_DE_DOCS.get(rel) === "Histórico" || EVOLUCION_DE_DOCS.get(rel.replace(/\/.*/, "/")) === "Histórico";
};

/** DONDE PUEDE VIVIR UNA CIFRA QUE HABLA DEL PROPIO REPOSITORIO, y por que el
 *  alcance es mas ancho que `docs/`.
 *
 *  La cuarta repeticion del defecto —«los 21 valores» cuando ya eran 23— no
 *  estaba solo en las guias: estaba en el README del andamio, en los
 *  comentarios de la herramienta y en los nombres de los casos de este mismo
 *  banco. Un comentario que miente le cuesta a quien lo lee exactamente lo
 *  mismo que una guia que miente, y el que se escribe al lado del codigo
 *  envejece mas rapido porque nadie lo relee. `CHANGELOG.md` queda fuera a
 *  proposito: registra lo que cada version PUBLICADA dijo, y corregirlo seria
 *  reescribir el pasado. */
const textosQueAfirman = () =>
  [...docs(), ...listar("plantilla/**/*.md"), ...listar("herramientas/*.mjs"), ...listar("pruebas/**/*.mjs")].filter(
    (f) =>
      // Un change registra lo que se MIDIO el dia que se hizo. «Un repositorio
      // nuevo pasaba de 3 marcadores a 21» era cierto entonces y corregirlo
      // seria reescribir la medicion, que es justo lo contrario de medir.
      !f.startsWith("openspec/changes/") &&
      // Y por el mismo motivo, las paginas que el indice declara historicas:
      // `docs/adopciones/` guarda un archivo por adopcion con lo que se midio
      // ese dia. Medido: sin esta linea, el registro sale rojo pidiendo corregir
      // «tres recuadros 🕳️» en el acta del 2026-08-24, o sea pidiendo falsear un
      // acta. `git ls-files docs/*.md` las trae porque el `*` de git cruza `/`.
      !esHistorica(f) &&
      // Y este archivo guarda contraejemplos a proposito —«999 paginas», y la
      // cita de «los 21 valores» que explica el defecto—. Mirarse a si mismo lo
      // haria rojo por hacer bien su trabajo.
      f !== "pruebas/docs/comandos-que-existen.test.mjs",
  );

test("hay comandos declarados: un cero aca es este banco roto", () => {
  assert.equal(COMANDOS_DEL_PROYECTO.length, 6, "se midieron seis; si cambia, hay que volver a medirlo contra un proyecto real");
});

test("toda la documentacion nombra SOLO comandos /opsx que existen", () => {
  const inventados = [];
  for (const f of docs()) {
    const texto = fs.readFileSync(path.join(RAIZ, f), "utf-8");
    for (const m of texto.matchAll(/\/opsx:([a-z-]+)/g)) {
      if (!COMANDOS_DEL_PROYECTO.includes(m[1])) inventados.push(`${f} → /opsx:${m[1]}`);
    }
  }
  assert.deepEqual(
    inventados,
    [],
    "un comando escrito en una guia es una promesa ejecutable: quien lo copia y lo pega no tiene como saber que no " +
      `existe. Los que existen son: ${COMANDOS_DEL_PROYECTO.map((c) => "/opsx:" + c).join(", ")}.\n  ` +
      inventados.join("\n  "),
  );
});

test("los conteos que la documentacion afirma coinciden con lo medido", () => {
  const mal = [];
  for (const f of docs()) {
    const texto = fs.readFileSync(path.join(RAIZ, f), "utf-8");
    for (const m of texto.matchAll(/(\d+) comandos `\/opsx/g)) {
      if (Number(m[1]) !== COMANDOS_DEL_PROYECTO.length) mal.push(`${f} → dice ${m[1]} comandos y son ${COMANDOS_DEL_PROYECTO.length}`);
    }
    for (const m of texto.matchAll(/(\d+) skills `openspec/g)) {
      if (Number(m[1]) !== CUANTAS_SKILLS) mal.push(`${f} → dice ${m[1]} skills y son ${CUANTAS_SKILLS}`);
    }
  }
  assert.deepEqual(
    mal,
    [],
    "un numero escrito a mano al lado de algo que otra herramienta decide envejece sin que nada lo mida. Tres " +
      `paginas decian 12 y 12 cuando eran ${COMANDOS_DEL_PROYECTO.length} y ${CUANTAS_SKILLS}.\n  ` + mal.join("\n  "),
  );
});

test("MUERDE: un comando inventado se caza", () => {
  const texto = "Corré `/opsx:inventado-abc` y listo.";
  const encontrados = [...texto.matchAll(/\/opsx:([a-z-]+)/g)].map((m) => m[1]);
  assert.deepEqual(encontrados, ["inventado-abc"], "el detector tiene que ver el comando");
  assert.equal(COMANDOS_DEL_PROYECTO.includes("inventado-abc"), false, "y no puede estar en la lista de los que existen");
});

test("MUERDE: un conteo equivocado se caza", () => {
  const texto = "Los **12 comandos `/opsx:*`** que llegan.";
  const n = [...texto.matchAll(/(\d+) comandos `\/opsx/g)].map((m) => Number(m[1]));
  assert.deepEqual(n, [12], "el detector tiene que ver el numero");
  assert.notEqual(n[0], COMANDOS_DEL_PROYECTO.length, "y 12 no puede ser el numero real, o este caso no mide nada");
});

// ---------------------------------------------------------------------------
// LA TERCERA VEZ QUE UN NUMERO ESCRITO A MANO ENVEJECE SIN QUE NADA LO MIDA.
//
// Primero fueron «12 comandos y 12 skills» cuando eran 6 y 6. Despues «la
// primera de doce paginas» cuando eran quince, y «el estandar mide 14 paginas»
// cuando mide diecisiete. Las tres veces el defecto es el mismo: una cifra
// escrita al lado de algo que otra cosa decide, sin nada que las compare.
//
// La regla del repositorio ya existe y la aplica la pagina del stack: ahi los
// numeros NO se escriben, se imprimen con un comando. Este banco extiende esa
// regla a las cifras que hablan de la propia documentacion.
// ---------------------------------------------------------------------------

/** Los numeros chicos escritos con letras, que es como los escribe el carril sin
 *  jerga —docs/01, 04, 06 y docs/README—. Llega hasta diez porque son las cifras
 *  que esas paginas escriben con palabras; de ahi para arriba ya usan digitos.
 *
 *  Va ANTES del registro y no despues: el registro arma su patron con estas
 *  claves al construirse, y un `const` declarado mas abajo lo dejaria leyendo
 *  una variable en zona muerta — el archivo entero no cargaria. */
const EN_PALABRAS = { un: 1, uno: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10 };

/** Lee la cifra que cazo un patron, venga en digitos o en letras. */
const enNumero = (s) => (/^\d+$/.test(s) ? Number(s) : EN_PALABRAS[String(s).toLowerCase()]);

/** Cifras que la documentacion afirma sobre si misma, con como se miden.
 *
 *  Cada entrada es un patron que caza la afirmacion y una funcion que devuelve
 *  el numero de verdad. Si el patron no aparece en ningun lado, no pasa nada: la
 *  pagina dejo de afirmarlo, que es justamente lo que se prefiere.
 *
 *  `leer` es opcional y por defecto es `Number`: solo lo declara la entrada cuya
 *  cifra puede venir escrita con letras. */
const CIFRAS_SOBRE_SI_MISMA = [
  {
    nombre: "paginas de la raiz de docs/ mas el README",
    patron: /el est(á|a)ndar mide \*\*(\d+) p(á|a)ginas\*\*/gi,
    grupo: 2,
    medir: async () => (await import("./lectura.mjs")).paginasDelAlcance().length,
  },
  {
    nombre: "paginas numeradas del camino",
    patron: /la primera de (\d+) p(á|a)ginas numeradas/gi,
    grupo: 1,
    medir: () =>
      execFileSync("git", ["ls-files", "docs/*.md"], { cwd: RAIZ, encoding: "utf-8" })
        .trim()
        .split("\n")
        .filter((f) => /\/\d\d-/.test(f)).length,
  },
  {
    // LA CUARTA VEZ, y la que hizo ensanchar el alcance. `REQUERIDOS` paso de 21
    // a 23 al aparecer PAQUETE_SITIO y ORG_MARCO, y el «21» quedo escrito en
    // veinte lugares —guias, el README del andamio, los comentarios de la
    // herramienta y hasta los nombres de los casos de este banco—. Ninguno era
    // falso el dia que se escribio, y ninguno tenia como enterarse.
    nombre: "valores que la herramienta exige (REQUERIDOS)",
    patron: /(?:los|las|de los|\*\*)\s*(\d+)\s+(?:valores|marcadores|claves|casillas)\b/gi,
    grupo: 1,
    medir: async () => (await import("../../herramientas/projects-init.mjs")).REQUERIDOS.length,
  },
  {
    // LA QUINTA, y estaba vieja por la misma razon que la cuarta: el asistente
    // gano preguntas —`forma` y `visibilidad`— y el rango escrito al lado se
    // quedo donde estaba. Se mide recorriendo el arbol de decision entero, no
    // eligiendo un camino a mano: elegir a mano es como se llego al numero viejo.
    nombre: "preguntas que hace el asistente, del camino mas corto al mas largo",
    patron: /(?:entre|de)\s+(\d+)\s+(?:y|a)\s+(\d+)\s+(?:preguntas|respuestas)/gi,
    grupo: [1, 2],
    medir: rangoDePreguntas,
  },
  {
    // LA TABLA DE CONTEOS FIJOS de docs/04, que ninguna forma anterior cazaba:
    // «**9 preguntas**, y solo dos hay que escribirlas». El patron de arriba
    // pide un rango; este mira la cifra suelta. Estaba vieja en tres filas.
    nombre: "preguntas del camino mas corto (la primera fila de la tabla de docs/04)",
    patron: /\*\*(\d+) preguntas\*\*/g,
    grupo: 1,
    medir: async () => (await rangoDePreguntas())[0],
  },
  {
    // Y la que dice cuantas respuestas hicieron falta, en la misma pagina.
    nombre: "respuestas del camino mas corto",
    patron: /derivó de tus (\d+) respuestas/gi,
    grupo: 1,
    medir: async () => (await rangoDePreguntas())[0],
  },
  {
    // LAS DOS FILAS DEL MEDIO de esa misma tabla. No alcanzaba con el rango: el
    // minimo y el maximo estaban guardados y estas dos —los caminos de en
    // medio— no, y las dos estaban viejas. Se anclan al TEXTO DE LA FILA, que es
    // lo unico que las distingue de cualquier otro numero en negrita.
    nombre: "preguntas del camino de AWS con dos copias",
    patron: /\| AWS con dos copias del proyecto \| \*\*(\d+)\*\*/g,
    grupo: 1,
    medir: () => cuantasPregunta({ forma: "1", equipo: "1", plataforma: "2", ambientes: "2", dominio: "1", avisos: "1", visibilidad: "1" }),
  },
  {
    nombre: "preguntas del camino que suma todo",
    patron: /dominio propio y Slack \| \*\*(\d+)\*\*/g,
    grupo: 1,
    medir: () => cuantasPregunta({ forma: "1", equipo: "2", plataforma: "2", ambientes: "2", dominio: "2", avisos: "2", visibilidad: "1" }),
  },
  {
    // LA SEXTA VEZ, y la primera en que la cifra hablaba del ARCHIVO QUE LA
    // ESCRIBE. docs/05 promete un par ` ```powershell ` por cada bloque de bash
    // que no sea portable, y para que esa promesa no encoja publica el
    // inventario: decia 9 gemelos y 29 bloques bash cuando eran 8 y 25. La
    // pagina ademas EXPLICA el comando que los cuenta, asi que el numero viejo
    // venia con instrucciones para desmentirlo — y nadie las corrio.
    nombre: "bloques ```powershell de docs/05 (los gemelos)",
    // TODOS los espacios de estos dos patrones son \s+, y no por prolijidad: la
    // frase vive partida en dos lineas y el salto se mueve con cualquier reflow
    // del parrafo. Un \s+ en UNA sola junta no alcanza — medido: con el salto
    // entre «tiene» y «**8**» (la unica junta que quedaba con espacio literal),
    // la pagina decia 9 gemelos, eran 8, y el banco daba pass 13 / fail 0. Una
    // cifra sin vigilancia con el guard en verde es peor que sin guard, porque
    // el verde se lee como que alguien la esta mirando.
    patron: /tiene\s+\*\*(\d+)\*\*\s+gemelos/g,
    grupo: 1,
    medir: () => bloquesDeDocs05("powershell"),
  },
  {
    nombre: "bloques ```bash de docs/05",
    patron: /gemelos\s+y\s+\*\*(\d+)\*\*\s+bloques/g,
    grupo: 1,
    medir: () => bloquesDeDocs05("bash"),
  },
  {
    // LA SEPTIMA, y la unica que NO se puede contar sobre el andamio tal cual
    // esta: el andamio guarda TRES recuadros 🕳️ y al proyecto le llegan DOS,
    // porque `projects init` reemplaza el de .github/proteccion-main.md por el
    // bloque con el estado medido de la proteccion de rama. docs/05 decia 3
    // —contando uno que el proyecto nunca ve— y encima colgaba de el la razon
    // de por que el primer CI sale rojo. Contar sobre plantilla/ a secas daria
    // otra vez 3: por eso la medicion CORRE la misma cirugia que corre `init`.
    // Y EL PATRON LEE LA CIFRA EN PALABRAS, no solo en digitos, porque el
    // defecto seguia vivo justo ahi: docs/04 —la pagina que le cuenta el mismo
    // paso a quien no es tecnico— decia «los **tres recuadros 🕳️**» y «Los tres
    // recuadros 🕳️ que un humano tiene que resolver». Con el patron solo-digitos
    // eso daba pass 13 / fail 0: el guard nacio ciego del lado donde el numero
    // todavia estaba mal. Las paginas del carril sin jerga escriben los numeros
    // chicos con letras, asi que un patron que solo mira digitos no las vigila.
    nombre: "recuadros 🕳️ que recibe un repo recien generado",
    // El \b de adelante no es adorno: sin el, «todos recuadros» cazaria el «dos»
    // de adentro de «todos» y el registro compararia un 2 que nadie escribio.
    patron: new RegExp(`\\b(\\d+|${Object.keys(EN_PALABRAS).join("|")})\\s+recuadros\\s+🕳`, "gi"),
    grupo: 1,
    leer: enNumero,
    medir: recuadrosDeHueco,
  },
];

/** Cuantas cercas de apertura de un lenguaje tiene docs/05.
 *
 *  TIENE QUE DAR LO MISMO QUE EL COMANDO QUE LA PAGINA PUBLICA, porque la cifra
 *  que vigila es la que el lector va a comprobar con ese comando y no con otro.
 *  `grep -c '^```bash'` cuenta LINEAS QUE EMPIEZAN con la cerca, asi que aca se
 *  usa `startsWith` y no igualdad exacta. La diferencia no es teorica: con
 *  igualdad exacta, agregar un bloque con titulo en la cerca —` ```bash
 *  title="ejemplo" `, la forma normal de ponerle nombre— dejaba el grep de la
 *  pagina en 26 y este conteo en 25. O sea el lector veia rojo justo en el caso
 *  del que habla el parrafo —un bloque de bash nuevo— y el guard seguia verde. */
function bloquesDeDocs05(lenguaje) {
  const texto = fs.readFileSync(path.join(RAIZ, "docs/05-arrancar-tecnico.md"), "utf-8");
  return texto.split("\n").filter((l) => l.startsWith("```" + lenguaje)).length;
}

/** Cuantos recuadros 🕳️ tiene un repo recien salido de `projects init`.
 *
 *  DOS COSAS QUE NO SE PUEDEN SALTEAR, y que son la diferencia entre 3 y 2:
 *
 *   1. `plantilla/README.md` es la guia del bootstrap y NO viaja al proyecto
 *      (`NO_SE_COPIA`), asi que sus menciones al simbolo no son recuadros de
 *      nadie. Se descarta por la MISMA constante que usa la herramienta, no por
 *      una lista escrita a mano aca.
 *   2. `projects init` REEMPLAZA el recuadro de `.github/proteccion-main.md` por
 *      el bloque con el estado medido de la proteccion. Aca se corre
 *      `insertarProteccionMedida` —la misma funcion que corre la herramienta,
 *      no una imitacion— sobre el documento real del andamio. Sin ese paso la
 *      cuenta da 3, que es justo el numero viejo que este registro caza.
 *
 *  El simbolo se arma por codepoint (U+1F573) en vez de pegarse, para que
 *  matchee lleve o no el selector de variacion: es la misma precaucion que toma
 *  el paso «Sin marcadores del scaffold sin resolver» de .github/workflows/marco-ci.yml,
 *  que es el check del que esta cifra habla. */
async function recuadrosDeHueco() {
  const init = await import("../../herramientas/projects-init.mjs");
  const HUECO = "\u{1F573}";
  const contexto = { org: "una-org", proyecto: "un-repo", fecha: "2026-01-01" };
  let n = 0;
  // Los DOS patrones hacen falta: `plantilla/**/*.md` exige un directorio en el
  // medio, asi que por si solo se saltea plantilla/AGENTS.md —que es justo donde
  // viven los dos recuadros que cuentan—. El Set es porque dos patrones que se
  // solapen no pueden contar el mismo archivo dos veces.
  for (const f of new Set(listar("plantilla/*.md", "plantilla/**/*.md"))) {
    const rel = f.slice("plantilla/".length);
    if (init.NO_SE_COPIA.has(rel)) continue;
    let texto = fs.readFileSync(path.join(RAIZ, f), "utf-8");
    if (rel === init.RUTA_PROTECCION) {
      const bloque = init.bloqueDeProteccion({ estado: "sin-compuertas", detalle: "d", ...contexto });
      texto = init.insertarProteccionMedida(texto, bloque).texto;
    }
    n += texto.split("\n").filter((l) => l.includes(HUECO)).length;
  }
  return n;
}

/** Cuantas preguntas hace el asistente para UN camino concreto. */
async function cuantasPregunta(eleccion) {
  const { correrAsistente } = await import("../../herramientas/projects-asistente.mjs");
  const libres = {
    PROYECTO: "p",
    ORG: "o",
    BUILDER_2: "b",
    CUENTA_DEV: "1".repeat(12),
    CUENTA_PROD: "2".repeat(12),
    REGION: "us-east-1",
    PERFIL_DEV: "d",
    PERFIL_PROD: "e",
    DOMINIO_PROD: "x.com",
    CANAL_ALERTAS: "#a",
  };
  let vistas = 0;
  await correrAsistente(
    async (_t, id) => {
      vistas++;
      return eleccion[id] ?? libres[id] ?? "1";
    },
    {},
    {},
    () => {},
    { ORG_MARCO: "im-diego-ec" },
  );
  return vistas;
}

/** CUANTAS PREGUNTAS HACE EL ASISTENTE, del camino mas corto al mas largo.
 *
 *  Se recorre el arbol COMPLETO —el producto de todas las opciones de las
 *  preguntas de eleccion, que hoy son menos de doscientas combinaciones— porque
 *  el rango depende de que otras preguntas se saltan, y eso solo se sabe
 *  contestando. Medir un camino elegido a mano es exactamente como envejecio el
 *  numero anterior. */
async function rangoDePreguntas() {
  const { PREGUNTAS, correrAsistente } = await import("../../herramientas/projects-asistente.mjs");
  const conOpciones = PREGUNTAS.filter((q) => q.opciones);
  const libres = { PROYECTO: "p", ORG: "o", BUILDER_2: "b", CUENTA_DEV: "1".repeat(12), CUENTA_PROD: "2".repeat(12) };
  const combinaciones = conOpciones.reduce((acc, q) => acc * q.opciones.length, 1);
  let min = Infinity;
  let max = 0;
  for (let i = 0; i < combinaciones; i++) {
    let resto = i;
    const eleccion = {};
    for (const q of conOpciones) {
      eleccion[q.id] = String((resto % q.opciones.length) + 1);
      resto = Math.floor(resto / q.opciones.length);
    }
    let vistas = 0;
    await correrAsistente(
      async (_t, id) => {
        vistas++;
        return eleccion[id] ?? libres[id] ?? "x";
      },
      {},
      {},
      () => {},
      { ORG_MARCO: "im-diego-ec" },
    );
    min = Math.min(min, vistas);
    max = Math.max(max, vistas);
  }
  return [min, max];
}

test("ninguna cifra que la documentacion afirma sobre si misma esta vieja", async (t) => {
  const mal = [];
  // ANTI-VACUIDAD. Sin este contador, el dia que todos los patrones dejen de
  // cazar —un reflow, una reescritura, un `textosQueAfirman()` que se queda sin
  // archivos— este caso pasa verde sin haber comparado UNA sola cifra, y el
  // verde se lee como que las cifras estan vigiladas. Un cero aca es este banco
  // roto, no la documentacion limpia. Por entrada suelta el cero SI es legitimo
  // —la pagina dejo de afirmar esa cifra, que es lo que se prefiere—; lo que no
  // puede ser cero es el total.
  let comparadas = 0;
  for (const f of textosQueAfirman()) {
    const texto = fs.readFileSync(path.join(RAIZ, f), "utf-8");
    for (const cifra of CIFRAS_SOBRE_SI_MISMA) {
      for (const m of texto.matchAll(cifra.patron)) {
        comparadas++;
        // Una cifra sola o un par —«entre 9 y 17»—: las dos se comparan igual,
        // y un par mal por una punta es tan viejo como uno mal por las dos.
        const grupos = Array.isArray(cifra.grupo) ? cifra.grupo : [cifra.grupo];
        const leer = cifra.leer ?? Number;
        const dice = grupos.map((g) => leer(m[g]));
        const real = [await cifra.medir()].flat();
        if (dice.join("-") !== real.join("-")) {
          mal.push(`${f} → dice ${dice.join(" y ")} y son ${real.join(" y ")} (${cifra.nombre})`);
        }
      }
    }
  }
  t.diagnostic(`cifras afirmadas que se compararon contra su medicion: ${comparadas}`);
  assert.ok(
    comparadas > 0,
    "este caso no comparo NI UNA cifra, asi que su verde no dice nada. O los patrones dejaron de cazar —un reflow, " +
      "una reescritura de las paginas— o `textosQueAfirman()` se quedo sin archivos. Las dos son este banco roto, " +
      "no la documentacion limpia.",
  );
  assert.deepEqual(
    mal,
    [],
    "es la tercera vez que pasa lo mismo: un numero escrito a mano al lado de algo que otra cosa decide. La salida no " +
      "es corregirlo otra vez, es dejar de escribirlo — la pagina del stack ya lo resuelve publicando el comando que lo " +
      `imprime.\n  ${mal.join("\n  ")}`,
  );
});

/** Una frase que AFIRMA la cifra, con un numero que no puede ser el correcto.
 *
 *  Se escribe una por entrada y el caso de abajo exige que no falte ninguna: sin
 *  eso, agregar una cifra al registro con un patron que no caza nada la deja
 *  verde para siempre, que es la forma exacta en que este banco podria mentir. */
const CEBOS = {
  "paginas de la raiz de docs/ mas el README": "El estándar mide **999 páginas**: el README y las demás.",
  "paginas numeradas del camino": "Ésta es la primera de 999 páginas numeradas del camino.",
  "valores que la herramienta exige (REQUERIDOS)": "`projects init` pide **999 valores** y ni uno más.",
  "preguntas que hace el asistente, del camino mas corto al mas largo": "El asistente hace entre 998 y 999 preguntas.",
  "preguntas del camino mas corto (la primera fila de la tabla de docs/04)": "Son **999 preguntas**, y solo dos hay que escribirlas.",
  "respuestas del camino mas corto": "Las casillas, llenas con lo que derivó de tus 999 respuestas.",
  "preguntas del camino de AWS con dos copias": "| AWS con dos copias del proyecto | **999**, porque ahí los datos existen |",
  "preguntas del camino que suma todo": "| Todo lo que suma: AWS, dos copias, otra persona, dominio propio y Slack | **999**, el máximo |",
  "bloques ```powershell de docs/05 (los gemelos)": "El archivo tiene **999**\ngemelos y ni uno más.",
  "bloques ```bash de docs/05": "El archivo tiene sus gemelos y **999** bloques ` ```bash `, y eso lo dice un grep.",
  "recuadros 🕳️ que recibe un repo recien generado": "El andamio reparte **999 recuadros 🕳️** que un humano tiene que resolver.",
};

test("MUERDE: toda cifra del registro se caza cuando envejece", async () => {
  // No alcanza con probar la primera: el registro crece, y una entrada nueva con
  // un patron que no caza nada pasaria verde sin mirar nada. Se recorren todas.
  const sordas = [];
  for (const cifra of CIFRAS_SOBRE_SI_MISMA) {
    const cebo = CEBOS[cifra.nombre];
    if (!cebo) {
      sordas.push(`${cifra.nombre}: no tiene cebo, asi que nadie comprobo que su patron cace algo`);
      continue;
    }
    const grupos = Array.isArray(cifra.grupo) ? cifra.grupo : [cifra.grupo];
    const leer = cifra.leer ?? Number;
    const vistas = [...cebo.matchAll(cifra.patron)].map((m) => grupos.map((g) => leer(m[g])));
    if (!vistas.length) {
      sordas.push(`${cifra.nombre}: su patron no caza ni su propio cebo`);
      continue;
    }
    const real = [await cifra.medir()].flat();
    if (vistas[0].join("-") === real.join("-")) {
      sordas.push(`${cifra.nombre}: el cebo (${vistas[0].join(", ")}) coincide con lo real, asi que no prueba nada`);
    }
  }
  assert.deepEqual(sordas, [], `una cifra que no se puede cazar es una cifra sin vigilancia:\n  ${sordas.join("\n  ")}`);
});

test("MUERDE: el registro no puede quedarse sin cebos al crecer", () => {
  // La otra mitad: un cebo hulla —de una entrada que ya no existe— es una regla
  // sin fuente, y es como empiezan las divergencias.
  const nombres = CIFRAS_SOBRE_SI_MISMA.map((c) => c.nombre);
  assert.deepEqual(
    Object.keys(CEBOS).filter((n) => !nombres.includes(n)),
    [],
    "hay un cebo que ya no corresponde a ninguna cifra del registro",
  );
});

// ---------------------------------------------------------------------------
// TODO `openspec` DE UN BLOQUE PARA COPIAR TIENE QUE PODER CORRERSE.
//
// EL DEFECTO QUE ESTE BANCO CIERRA, medido en un proyecto recien generado:
// docs/09 entregaba `openspec new change <nombre>` como bloque bash para copiar
// —el PRIMER comando del tramo de construir— y ese programa NO EXISTE en la
// maquina de la persona: `which openspec` no lo encuentra, no esta en
// devDependencies ni en node_modules/.bin. La forma invocable
// (`npx --yes @fission-ai/openspec@<pin> …`) no aparecia una sola vez en la
// pagina; vivia en docs/11, que el indice marca «se abre el dia que hace
// falta», y ahi escrita con `X.Y.Z` de relleno, asi que ni copiarla se podia.
//
// La persona no tecnica copia el bloque como copio los quince anteriores y
// recibe `command not found` sin una linea de recuperacion.
// ---------------------------------------------------------------------------

/** Las paginas que escriben `X.Y.Z` en vez de una version, y por que cada una.
 *
 *  No es una lista para esquivar el control: las dos LEEN el pin del checkout en
 *  el paso inmediatamente anterior y despues lo usan. Exigirles una version
 *  concreta las volveria una receta para la version vieja, que es justo lo
 *  contrario de lo que hacen. */
const ESCRIBEN_EL_PIN_A_PROPOSITO = [
  "docs/12-upgrade-openspec.md", // su tema ES cambiar el pin
  ".claude/skills/projects-adoptar/SKILL.md", // lee el pin del repo que adopta y lo sustituye
  ".claude/skills/projects-archive-change/SKILL.md", // lo mismo: lee el pin del marco-ci.yml del repo y despues lo usa
  "plantilla/.claude/skills/projects-archive-change/SKILL.md", // la copia que viaja: pide el pin por `gh api` al marco
];

/** El pin de OpenSpec, LEIDO del allowlist que viaja al proyecto.
 *
 *  Se deriva y no se escribe: el pin ya vive ahi, y una segunda copia en este
 *  banco seria otra cifra a mano de las que este archivo existe para perseguir. */
function pinDeOpenspec() {
  const settings = fs.readFileSync(path.join(RAIZ, "plantilla/.claude/settings.json"), "utf-8");
  const m = settings.match(/@fission-ai\/openspec@(\d+\.\d+\.\d+)/);
  assert.ok(m, "el allowlist del andamio no declara un pin de openspec: sin eso este banco no sabe contra que medir");
  return m[1];
}

/** Los bloques ```bash de una pagina, ya sin las cercas. */
const bloquesBash = (texto) => [...texto.matchAll(/```(?:bash|sh|shell)\n([\s\S]*?)```/g)].map((m) => m[1]);

test("ningun bloque para copiar invoca `openspec` de una forma que no existe en la maquina", () => {
  const pin = pinDeOpenspec();
  const malas = [];
  // ANTI-VACUIDAD, y es lo que faltaba: la version anterior de este caso tenia un
  // regex que no podia matchear NUNCA, evaluaba 0 de 658 lineas y pasaba verde.
  // Contar lo que se miro es la unica forma de que un cero se lea como el control
  // roto y no como el arbol limpio.
  let vistas = 0;
  for (const f of docs()) {
    if (ESCRIBEN_EL_PIN_A_PROPOSITO.includes(f)) continue;
    for (const bloque of bloquesBash(fs.readFileSync(path.join(RAIZ, f), "utf-8"))) {
      for (const linea of bloque.split("\n")) {
        const t = linea.trim();
        // LA VERSION ANTERIOR DE ESTA LINEA NO MIRABA NADA. Era
        // `/(^|[|&;(]\s*)openspec\s/.test(\` ${t}\`)`: el template literal le
        // antepone un espacio, asi que el ancla `^` cae SIEMPRE sobre ese
        // espacio y esa rama no puede matchear nunca. Medido: sobre 658 lineas
        // de bloque, cero evaluaciones verdaderas — ni siquiera vio la linea
        // que el propio caso decia estar cuidando. Un guard escrito y muerto es
        // peor que ninguno, porque ademas convence de que el area esta cubierta.
        // Se cuenta TODA invocacion de openspec —la buena y la mala—, porque lo
        // que este caso vigila es que no haya de las malas, y un cero solo
        // significa algo si se sabe cuantas se miraron.
        const esInvocacion = /(?:^|[|&;(]\s*)openspec\s/.test(t) || t.includes("/openspec@");
        if (!esInvocacion) continue;
        vistas++;
        if (t.includes(`@fission-ai/openspec@${pin}`)) continue;
        malas.push(`${f} → ${t}`);
      }
    }
  }
  // ANTI-VACUIDAD DE LA EXCEPCION: cada archivo de la lista tiene que existir y
  // traer de verdad un `X.Y.Z`. Una exencion para un archivo que ya no la
  // necesita es una puerta abierta que nadie recuerda haber dejado.
  for (const f of ESCRIBEN_EL_PIN_A_PROPOSITO) {
    assert.ok(fs.existsSync(path.join(RAIZ, f)), `la exencion nombra ${f}, que no existe`);
    assert.match(fs.readFileSync(path.join(RAIZ, f), "utf-8"), /X\.Y\.Z/, `${f} ya no escribe X.Y.Z: su exencion sobra`);
  }
  assert.ok(
    vistas >= 3,
    `este caso solo vio ${vistas} invocacion(es) de openspec en bloques para copiar. La documentacion tiene mas: si ` +
      `el numero cayo, lo primero que hay que mirar es si el detector dejo de reconocer la forma, no si las paginas ` +
      `dejaron de nombrarlas. (Es exactamente como este caso estuvo muerto: su regex evaluaba cero lineas.)`,
  );
  assert.deepEqual(
    malas,
    [],
    "`openspec` no es un programa instalado: escrito asi, la persona recibe `command not found` en el primer " +
      `comando del tramo. La forma invocable es \`npx --yes @fission-ai/openspec@${pin} …\`:\n  ${malas.join("\n  ")}`,
  );
});

test("todo subcomando de openspec que la documentacion manda copiar esta en el allowlist del proyecto", () => {
  // La otra mitad, y es la que traba al agente en vez de a la persona: un
  // comando correcto que el allowlist no cubre para la sesion en cada corrida.
  const pin = pinDeOpenspec();
  const settings = fs.readFileSync(path.join(RAIZ, "plantilla/.claude/settings.json"), "utf-8");
  const permitidos = [...settings.matchAll(new RegExp(`openspec@${pin.replace(/\./g, "\\.")} ([a-z]+(?: [a-z]+)?)`, "g"))].map(
    (m) => m[1],
  );
  assert.ok(permitidos.length >= 4, `el allowlist solo declara ${permitidos.length} comandos: se rompio la lectura`);

  const usados = new Set();
  for (const f of docs()) {
    if (ESCRIBEN_EL_PIN_A_PROPOSITO.includes(f)) continue;
    for (const bloque of bloquesBash(fs.readFileSync(path.join(RAIZ, f), "utf-8"))) {
      for (const m of bloque.matchAll(new RegExp(`@fission-ai/openspec@${pin.replace(/\./g, "\\.")}\\s+([a-z]+)(?:\\s+([a-z]+))?`, "g"))) {
        usados.add(m[1] === "new" && m[2] ? `${m[1]} ${m[2]}` : m[1]);
      }
    }
  }
  assert.ok(usados.size >= 1, "ninguna pagina invoca openspec en un bloque: este control dejo de mirar lo que cree");

  // `init` queda fuera a proposito: lo corre `projects init`, no la persona, y
  // no tiene por que estar en el allowlist de la sesion del proyecto.
  const fuera = [...usados].filter((c) => c !== "init" && !permitidos.some((p) => c === p || c.startsWith(`${p} `)));
  assert.deepEqual(
    fuera,
    [],
    `la documentacion manda correr estos comandos y el allowlist del proyecto no los cubre, asi que la sesion del ` +
      `agente pide permiso —o se traba— en cada corrida: ${fuera.join(", ")}`,
  );
});

test("ningun `/opsx:` viaja dentro de una cerca de terminal", () => {
  // EL DEFECTO QUE ESTE CASO VIGILA: los `/opsx:…` son comandos de la sesion del
  // agente, no del shell. Escritos en un bloque ```bash le dicen a la persona
  // «esto se pega en la terminal», y ahi dan `No such file or directory` con
  // salida 127. La pagina tiene quince bloques bash antes de ese: quien copio
  // los quince no tiene por que sospechar del dieciseis.
  //
  // La cerca sin lenguaje —``` a secas— es la correcta para un comando que no es
  // del shell, y es la que este caso exige.
  const malas = [];
  let vistos = 0;
  for (const f of docs()) {
    for (const bloque of bloquesBash(fs.readFileSync(path.join(RAIZ, f), "utf-8"))) {
      for (const linea of bloque.split("\n")) {
        const t = linea.trim();
        if (!t.startsWith("/opsx:")) continue;
        vistos++;
        malas.push(`${f} → ${t}`);
      }
    }
  }
  // ANTI-VACUIDAD por el otro lado: la documentacion tiene que seguir nombrando
  // comandos `/opsx:`, o este control dejo de tener sujeto.
  const nombrados = docs().reduce((n, f) => n + (fs.readFileSync(path.join(RAIZ, f), "utf-8").match(/\/opsx:/g) ?? []).length, 0);
  assert.ok(nombrados >= 5, `la documentacion nombra ${nombrados} comandos /opsx:: si cayo, este control mide aire`);
  assert.deepEqual(
    malas,
    [],
    `un \`/opsx:\` en una cerca de terminal se pega en la terminal y sale 127. Va en una cerca sin lenguaje, con una ` +
      `linea que diga que es de la sesion del agente:\n  ${malas.join("\n  ")}`,
  );
  assert.equal(vistos, 0);
});

// ---------------------------------------------------------------------------
// LO QUE EL AGENTE NECESITA CORRER, CONTRA LO QUE EL PROYECTO LE PERMITE.
//
// EL DEFECTO QUE ESTE BANCO CIERRA, medido en un proyecto recien generado: los
// seis comandos `/opsx:*` mandan correr `openspec …` A SECAS, y ese programa no
// existe —ni en el sistema, ni en node_modules/.bin, ni en las dependencias—.
// docs/09 manda usar `/opsx:apply` para implementar, asi que el tramo de
// construir se trababa ahi.
//
// Y habia una segunda mitad: aun con la forma correcta, `instructions`,
// `context`, `schemas` y `store` no estaban en el allowlist del proyecto.
// ---------------------------------------------------------------------------

test("el allowlist del proyecto cubre todo lo que los comandos /opsx: mandan correr", () => {
  const pin = pinDeOpenspec();
  const settings = fs.readFileSync(path.join(RAIZ, "plantilla/.claude/settings.json"), "utf-8");

  const faltan = SUBCOMANDOS_QUE_USA_OPSX.filter((c) => {
    if (c in FUERA_DEL_ALLOWLIST) return false;
    const raiz = c.split(" ")[0];
    return !settings.includes(`openspec@${pin} ${raiz}`);
  });
  assert.deepEqual(
    faltan,
    [],
    `los comandos /opsx: mandan correr estos subcomandos y el allowlist del proyecto no los cubre, asi que la sesion ` +
      `del agente pide permiso —o se traba— justo en el tramo de construir: ${faltan.join(", ")}`,
  );

  // Y AL REVES: lo que se excluye a proposito no puede estar. Un `archive`
  // permitido dejaria al agente cerrando changes sin el rastro que el marco pide.
  for (const [c, motivo] of Object.entries(FUERA_DEL_ALLOWLIST)) {
    assert.equal(
      settings.includes(`openspec@${pin} ${c}`),
      false,
      `\`${c}\` esta en el allowlist y tenia que quedar afuera: ${motivo}`,
    );
  }
});

test("el proyecto le DICE al agente que `openspec` pelado no existe", () => {
  // Los archivos de `.claude/commands/opsx/` son de la herramienta y `openspec
  // update` los reescribe: editarlos seria mantener un fork ajeno. La
  // sustitucion se declara en el AGENTS.md del proyecto, que es donde este
  // repositorio habla y lo que el agente lee primero.
  const agents = fs.readFileSync(path.join(RAIZ, "plantilla/AGENTS.md"), "utf-8");
  const pin = pinDeOpenspec();

  assert.match(agents, /openspec` no está instalado|no está instalado en esta máquina/i, "tiene que decirlo con todas las letras");
  assert.ok(
    agents.includes(`@fission-ai/openspec@${pin}`),
    `y dar la forma invocable con el pin ${pin}, que es la misma que usa el pipeline`,
  );
  assert.match(agents, /archive/, "y nombrar la excepcion: cerrar un change usa la skill del marco");
});
