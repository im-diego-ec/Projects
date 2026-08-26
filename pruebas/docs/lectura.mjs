// EL ESTANDAR DE LECTURA DE docs/, EN UN SOLO ARCHIVO.
//
// POR QUE EXISTE. La regla "ninguna palabra tecnica sin explicarse aca mismo o
// sin enlazar al glosario" nacio dentro de UNA pagina —docs/empezar-sin-ser-
// tecnico.md— y su banco vigilaba solo esa. El dueño del repo pidio lo obvio y lo
// caro: que el estandar valga para TODAS las paginas. Este modulo es la mitad
// pura de eso; las dos mitades que lo ejercen son
// pruebas/docs/estandar-de-lectura.test.mjs (todas las paginas) y
// pruebas/docs/entrada-sin-jerga.test.mjs (lo que solo le toca a la puerta de
// entrada).
//
// POR QUE UN MODULO Y NO DOS COPIAS. La lista de jerga prohibida y la forma de
// reconocer un enlace al glosario son la MISMA regla en los dos bancos. Dos
// copias divergen —una se endurece, la otra no— y la pagina que queda del lado
// blando sigue en verde. Una definicion, dos usos.
//
// TODO LO QUE MIRA ES PURO SOBRE TEXTO, a proposito: asi cada banco puede correr
// la comprobacion contra una copia MUTADA en memoria y verla fallar. Una guarda
// que nadie vio fallar no es una guarda.
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

export function leer(rel) {
  return readFileSync(join(RAIZ, rel), "utf8");
}

export const GLOSARIO = "docs/02-glosario.md";
export const INDICE = "docs/README.md";

/** Los terminos que el glosario define: la primera celda de cada fila, que el
 *  archivo escribe entre asteriscos. Es la misma forma que ya usa el banco de
 *  documentacion para contar filas, asi que las comprobaciones se rompen juntas
 *  si alguien cambia el formato de la tabla — y ninguna se queda leyendo cero
 *  filas en silencio. */
export function terminosDelGlosario(texto = leer(GLOSARIO)) {
  return texto
    .split("\n")
    .map((linea) => linea.match(/^\|\s*\*\*(.+?)\*\*/))
    .filter(Boolean)
    .map((marca) => marca[1].trim());
}

export function escapar(texto) {
  return texto.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Los terminos del glosario que un texto USA. Los bloques cercados quedan fuera
 *  —ahi va codigo, no prosa dirigida al lector— y el plural se acepta porque
 *  "specs" y "spec" son la misma palabra para quien la lee por primera vez. */
export function terminosUsados(texto, terminos) {
  const prosa = texto.replace(/```[\s\S]*?```/g, "");
  return terminos.filter((t) => new RegExp(`\\b${escapar(t)}(?:s|es)?\\b`, "i").test(prosa));
}

/** Los terminos del glosario que un texto usa SIN enlazarlos al glosario.
 *
 *  El destino se acepta con cualquier prefijo de ruta (`02-glosario.md`,
 *  `./02-glosario.md`, `docs/02-glosario.md`) porque el README de la raiz enlaza desde
 *  un nivel mas arriba y es una pagina del alcance como cualquier otra. Lo que se
 *  exige no es la ruta: es que la palabra este enlazada en la propia pagina. */
export function jergaSinEnlazar(texto, terminos) {
  const prosa = texto.replace(/```[\s\S]*?```/g, "");
  const sinEnlazar = [];
  for (const termino of terminosUsados(texto, terminos)) {
    const enlazado = new RegExp(`\\[[^\\]]*${escapar(termino)}[^\\]]*\\]\\([^)]*glosario\\.md[^)]*\\)`, "i");
    if (!enlazado.test(prosa)) sinEnlazar.push(termino);
  }
  return sinEnlazar;
}

/** Palabras de oficio que una pagina del carril "sin jerga" tiene prohibido
 *  usar. NINGUNA esta en el glosario —hay un caso que lo comprueba—: las del
 *  glosario se pueden usar enlazadas, estas no se usan y punto, porque el
 *  castellano corriente ya las dice (verificacion, entrega, cambio, integrar,
 *  herramienta que revisa...).
 *
 *  ESCRITA Y NO DERIVADA, a proposito: no hay ningun archivo del repo que
 *  enumere "las palabras que un BA no tiene por que saber", y fingir que se
 *  deriva de algo seria un falso verde.
 *
 *  LO QUE UNA LISTA NO PUEDE HACER, dicho de frente. Una lista cerrada se
 *  derrota con sinonimos: un revisor escribio una pagina de jerga pura —runtime,
 *  hoisting, bundler, registry, rollback, digest, provider— y paso el carril
 *  entero limpia, porque ninguna de esas palabras estaba escrita aca. Eso NO se
 *  arregla del todo con una lista mas larga; se arregla midiendo si la pagina se
 *  entiende, y eso lo dice quien la lee sin contexto (el registro de friccion de
 *  docs/plantillas/). Lo que si se hizo, y es lo que esta lista promete y nada
 *  mas: el vocabulario que ya derroto al carril esta adentro, hay una regla que
 *  no depende de la lista (jergaPorForma) y un tope al escape de los backticks.
 *
 *  LA UNICA EXENCION, declarada: `stack` seguido de `.md` es el nombre de un
 *  archivo del repo, no la palabra. Varias paginas enlazan esa pagina y llamarla
 *  de otra forma seria mentir sobre la ruta. */
export const JERGA_DEL_MARCO = [
  "pipeline",
  "check",
  "deploy",
  "commit",
  "merge",
  "mergear",
  "branch",
  "runner",
  "workflow",
  "linter",
  "lockfile",
  "backend",
  "frontend",
  "stack",
  "build",
  "endpoint",
  "framework",
  "ORM",
  "CLI",
  "API",
  "gate",
  "banco de pruebas",
];

/** El segundo grupo, y de donde salio: son EXACTAMENTE las palabras con las que
 *  una revision derroto al carril duro (escribio una pagina ilegible que salio
 *  verde), mas sus vecinas inmediatas del mismo campo. Se escriben aparte y no
 *  mezcladas para que quede visible que la lista crece por refutacion —alguien
 *  paso una pagina que no se entiende y la lista aprendio esas palabras— y no
 *  por inspiracion de quien la edita. */
export const JERGA_DEL_OFICIO = [
  "runtime",
  "hoisting",
  "bundler",
  "registry",
  "tag",
  "OIDC",
  "provider",
  "rollback",
  "digest",
  "telemetría",
  "flag",
  "feature",
  "config",
  "cache",
  "ETag",
  "node_modules",
  "sandbox",
  "wrapper",
  "patch",
  "release",
  "hotfix",
  "rebase",
  "hash",
  "tooling",
  "workspace",
  "snapshot",
  "mock",
  "stub",
  "coverage",
  "seed",
  "schema",
  "query",
  "response",
  "header",
  "payload",
  "timeout",
  "retry",
  "proxy",
  "cluster",
  "container",
  "bucket",
  "queue",
  "webhook",
  "polling",
  "cron",
  "daemon",
  "token",
  "script",
  "log",
  "debug",
  "deployment",
  "staging",
  "dashboard",
  "uptime",
  "latency",
  "boilerplate",
  "refactor",
  "issue",
  "milestone",
  "testing",
  "logging",
  "tracking",
  "monitoring",
  "onboarding",
  "parsing",
  "render",
  "layout",
];

export const SIN_TRADUCCION = [...JERGA_DEL_MARCO, ...JERGA_DEL_OFICIO];

/** La prosa que el lector lee de verdad: sin bloques cercados ni codigo en linea
 *  (ahi va lo que se copia y se pega, no lo que se lee) y sin los destinos de los
 *  enlaces (una ruta no es una frase). */
export function prosaDeLaPagina(texto) {
  return texto
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`[^`]*`/g, "")
    .replace(/\]\([^)]*\)/g, "]");
}

/** Las palabras prohibidas que un texto usa en su PROSA.
 *
 *  EL PLURAL CUENTA, y no contaba: `\bpipeline\b` no encuentra "pipelines", asi
 *  que docs/06-para-el-po.md escribio "los pipelines" durante todo este tiempo con
 *  el carril en verde. Es el mismo `(?:s|es)?` que ya usa terminosUsados() para
 *  el glosario — una sola forma de contar una palabra en los dos lados. */
export function jergaDeOficio(texto, palabras) {
  const prosa = prosaDeLaPagina(texto);
  return palabras.filter((palabra) => new RegExp(`\\b${escapar(palabra)}(?:s|es)?\\b(?!\\.md)`, "i").test(prosa));
}

/** LA REGLA QUE NO DEPENDE DE LA LISTA: el gerundio ingles.
 *
 *  Una lista cerrada se derrota escribiendo otra palabra; esto mira la FORMA y
 *  por eso caza la que se invente manana (hoisting, testing, tracking, caching,
 *  onboarding) sin que nadie la agregue. Es angosta a proposito: el castellano
 *  no termina palabras en "-ing", asi que el falso positivo tendria que ser un
 *  prestamo — y un prestamo en una pagina para quien no es tecnico es
 *  exactamente lo que el carril viene a impedir. Medido sobre las cuatro paginas
 *  del carril el dia que se escribio: cero. */
export function jergaPorForma(texto) {
  const prosa = prosaDeLaPagina(texto);
  return [...new Set([...prosa.matchAll(/\b[a-záéíóúüñ]{3,}ings?\b/gi)].map((m) => m[0].toLowerCase()))];
}

/** LA ESCOTILLA, MEDIDA: prosaDeLaPagina() borra el codigo en linea antes de
 *  buscar, asi que una palabra prohibida entre backticks pasa textual. La
 *  exencion es legitima y hace falta —docs/README.md nombra `pipeline`, `check` y
 *  `deploy` para describir la regla que los prohibe, y la guia copia comandos
 *  reales— pero no tenia tope: una pagina entera escrita en jerga entrecomillada
 *  quedaba verde. Esta funcion devuelve los fragmentos de codigo en linea que
 *  cargan una palabra prohibida, para poder ponerles un techo. */
export function jergaEntreBackticks(texto, palabras) {
  const sinCercados = texto.replace(/```[\s\S]*?```/g, "");
  return [...sinCercados.matchAll(/`([^`]*)`/g)]
    .map((m) => m[1])
    .filter((frag) => palabras.some((p) => new RegExp(`\\b${escapar(p)}(?:s|es)?\\b`, "i").test(frag)));
}

/** El techo de fragmentos de codigo en linea con jerga por pagina. MEDIDO, no
 *  elegido: la que mas usa hoy es docs/04-arrancar-acompanado.md con 6
 *  —comandos reales y mensajes que salen en pantalla—, y le sigue docs/README.md
 *  con 4, que son los tres nombres que la propia regla prohibe mas la ruta de un
 *  archivo de pruebas. Diez deja aire para cuatro comandos mas y sigue estando
 *  lejisimos de una pagina escrita en jerga entrecomillada, que es lo unico que
 *  este tope viene a impedir. */
export const TOPE_DE_JERGA_ENTRE_BACKTICKS = 10;

// ---------------------------------------------------------------------------
// REGLA 1 — PARA QUIEN ES ESTA PAGINA
// ---------------------------------------------------------------------------

/** Las tres formas admitidas de decir para quien es una pagina.
 *
 *  POR QUE TRES Y NO UNA SOLA LITERAL. Las dos paginas que ya cumplian el
 *  estandar lo decian con su propia voz ("Esta pagina es para quien ocupa el rol
 *  de PO"). Obligarlas a un rotulo rigido habria empeorado la prosa para que el
 *  banco fuera mas facil de escribir, que es exactamente al reves de para que
 *  esta el banco. Tres formas cortas, todas reconocibles de un vistazo. */
export const ABERTURAS = ["Para quién es esta página", "Esta página es para", "Esta guía es para"];

/** Cuantas lineas del principio cuentan como "el principio".
 *
 *  MEDIDO, no elegido de memoria: la pagina que mas tarda en decirlo hoy es
 *  docs/03-stack.md, en la linea 15. Veinte deja aire para un titulo mas largo y
 *  sigue significando "antes de que el lector tenga que decidir si sigue". */
export const LINEAS_DE_APERTURA = 20;

/** La frase de audiencia de una pagina, o null si no la dice a tiempo. Devuelve
 *  la frase —y no un booleano— para que el mensaje del fallo pueda mostrarla. */
export function fraseDeAudiencia(texto, lineas = LINEAS_DE_APERTURA) {
  const apertura = texto.split("\n").slice(0, lineas).join("\n");
  for (const abertura of ABERTURAS) {
    const desde = apertura.indexOf(abertura);
    if (desde !== -1) return apertura.slice(desde, desde + 90).split("\n")[0];
  }
  return null;
}

// ---------------------------------------------------------------------------
// EL ALCANCE: QUE PAGINAS MIDE EL ESTANDAR
// ---------------------------------------------------------------------------

/** Las subcarpetas de docs/ que quedan fuera del estandar, con su motivo. NO es
 *  una lista para esconder trabajo: un caso del banco exige que las subcarpetas
 *  que existen sean EXACTAMENTE estas, asi que una carpeta nueva se pone roja y
 *  obliga a decidir en vez de escaparse en silencio. */
export const SUBCARPETAS_FUERA = {
  adr: "cada ADR es una decision fechada con formato propio y tiene su propio indice en docs/adr/",
  adopciones: "cada archivo es el registro de una corrida y no se edita despues",
  plantillas: "son moldes que se copian a otro repo, no paginas que alguien lee de corrido",
};

/** Las paginas que el estandar mide: las .md de la raiz de docs/ mas el README
 *  del repositorio, que es la puerta de entrada de todo el mundo.
 *
 *  EL ALCANCE EN NUMEROS, dicho en voz alta porque lo que se pidio fue "todas".
 *  MEDIDO el 2026-08-25: son 14 paginas —README.md mas las 13 .md de la raiz de
 *  docs/—, de las 22 .md que hay bajo docs/ y de las 118 .md del repositorio. Las
 *  8 que quedan fuera son las de las tres subcarpetas de SUBCARPETAS_FUERA: 5 en
 *  adr/, 3 en plantillas/ y 1 en adopciones/. La que mas incomoda es
 *  plantillas/registro-de-friccion.md, que el indice declara **Canonico** y que
 *  este mismo banco nombra como "la otra mitad" del estandar: queda fuera por
 *  vivir en una subcarpeta, no por no importar. Ninguna de las 8 se escapa en
 *  silencio —hay un caso que se pone rojo si aparece una subcarpeta nueva— pero
 *  "todos los docs" es 14 de 22, no 22 de 22. */
export function paginasDelAlcance() {
  const enDocs = readdirSync(join(RAIZ, "docs"))
    .filter((f) => f.endsWith(".md"))
    .sort()
    .map((f) => `docs/${f}`);
  return ["README.md", ...enDocs];
}

export function subcarpetasDeDocs() {
  return readdirSync(join(RAIZ, "docs"), { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();
}

// ---------------------------------------------------------------------------
// LOS DOS CARRILES, Y DE DONDE SALE LA EXENCION
// ---------------------------------------------------------------------------

/** Las paginas del carril SIN JERGA: las que abre alguien que no es tecnico.
 *  Ademas de enlazar el vocabulario del marco, tienen prohibida la jerga de
 *  oficio de SIN_TRADUCCION. El resto de las paginas es tecnico a proposito y su
 *  estandar es otro —jerga DEFINIDA y una frase que diga para quien es—: un
 *  runbook convertido en folleto no sirve para correr el runbook. */
export const CARRIL_SIN_JERGA = [
  "docs/01-introduccion.md",
  "docs/04-arrancar-acompanado.md",
  "docs/06-para-el-po.md",
  "docs/README.md",
];

/** La unica pagina exenta de la regla del enlace, y el motivo: el glosario ES el
 *  glosario. Exigirle que se enlace a si misma treinta y siete veces no ayuda a
 *  nadie a leer nada. */
export const EXENTAS_DE_ENLACE = {
  "docs/02-glosario.md": "es el glosario: cada termino esta definido en la propia pagina",
};

/** Como evoluciona cada documento, leido del indice: la tercera columna de la
 *  tabla de docs/README.md, en negrita ("**Canonico**", "**Historico**",
 *  "**Scaffold**"). La clave es el nombre de archivo tal como el indice lo
 *  enlaza.
 *
 *  ESTO ES LO QUE EVITA UNA LISTA ESCRITA A MANO. La exencion de las paginas
 *  historicas —una foto fechada que el propio indice declara que NO se
 *  actualiza— no la decide este banco: la decide el indice. Si mañana una pagina
 *  deja de ser historica, entra al estandar sola. */
export function evolucionSegunElIndice(texto = leer(INDICE)) {
  const mapa = new Map();
  for (const linea of texto.split("\n")) {
    if (!linea.startsWith("|")) continue;
    const celdas = linea
      .split("|")
      .slice(1, -1)
      .map((c) => c.trim());
    if (celdas.length < 3) continue;
    const documento = celdas[0].match(/^\[([^\]]+)\]\(/);
    const evolucion = celdas[2].match(/^\*\*([^*]+)\*\*/);
    if (!documento || !evolucion) continue;
    mapa.set(documento[1], evolucion[1].trim());
  }
  return mapa;
}

/** Las paginas de docs/ que el indice NO enumera. El propio docs/README.md dice
 *  que tiene que enumerarlas todas y que eso "no lo hace cumplir un check"; esta
 *  funcion es la mitad que faltaba.
 *
 *  SE BUSCA EL DESTINO DE UN ENLACE, `](nombre.md)`, y no el nombre suelto.
 *
 *  EL MOTIVO ORIGINAL YA NO SE PUEDE MEDIR, y se deja escrito porque la regla
 *  sigue siendo la correcta. Hasta que las paginas se numeraron, `consumidores.md`
 *  era subcadena de `censo-de-consumidores.md`: una busqueda de subcadena daba por
 *  indexada una pagina gracias a la mencion de OTRA, y este repositorio ya se
 *  habia comido ese falso verde una vez. Con los numeros adelante la colision
 *  murio sola —`"12-censo-de-consumidores.md".includes("13-consumidores.md")` es
 *  `false`—, pero buscar el destino del enlace y no el nombre suelto no depende
 *  de los nombres de hoy: el mismo tropiezo esta medido con /openspec/specs/ en
 *  el banco de 06-para-el-po.md, y el proximo par de nombres que colisione va a
 *  llegar sin avisar. */
export function sinIndexar(paginas, indice = leer(INDICE)) {
  return paginas
    .filter((p) => p.startsWith("docs/") && p !== INDICE)
    .filter((p) => !new RegExp(`\\]\\(${escapar(p.slice("docs/".length))}\\)`).test(indice));
}
