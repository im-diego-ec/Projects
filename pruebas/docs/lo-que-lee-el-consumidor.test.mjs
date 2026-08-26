import test from "node:test";
import assert from "node:assert/strict";
import { execSync } from "node:child_process";

import { leer, terminosDelGlosario, terminosUsados } from "./lectura.mjs";

// ---------------------------------------------------------------------------
// EL HUECO QUE ESTE BANCO CIERRA.
//
// `estandar-de-lectura.test.mjs` mide las 14 paginas de `docs/` mas el README de
// la raiz, y su regla es "toda palabra del vocabulario del marco va ENLAZADA al
// glosario". Esa regla no se puede aplicar a lo que VIAJA: el glosario vive en
// `docs/` del marco y no se copia al proyecto nuevo —medido: de los 10 .md que
// recibe un proyecto, ninguno es un glosario—, asi que un enlace a
// `02-glosario.md` desde el andamio nace roto el dia uno.
//
// Y sin embargo estos son los documentos que MAS lee una persona que no es
// tecnica: el README del repositorio donde aterriza, la plantilla que abre en
// CADA pull request, y el documento de la proteccion de main cuando le toca
// pedirla. Hasta este banco no tenian ninguna regla de lectura encima.
//
// LA REGLA DE ACA, que es la que corresponde cuando no hay a donde enlazar: si
// una pagina que viaja usa una palabra del vocabulario del marco, esa palabra
// se explica EN LA PROPIA PAGINA, y la explicacion esta declarada abajo con el
// texto exacto que tiene que aparecer. Lo que no se explica en el texto no se
// usa.
//
// LA SEGUNDA CATEGORIA es igual de deliberada. Hay palabras del glosario que en
// estas paginas se usan como castellano corriente y donde una definicion formal
// seria ruido: "el andamio no reparte infraestructura sin verificar" se entiende
// sin que nadie declare que es un andamio. Esas van declaradas tambien, con el
// motivo, para que la exencion sea una decision escrita y no un olvido.
// ---------------------------------------------------------------------------

/** Lo que un proyecto nuevo recibe y una persona abre. La clave es la ruta en el
 *  MARCO; entre parentesis, donde aterriza en el proyecto. */
const PAGINAS = {
  "plantilla/README-del-proyecto.md": "-> README.md del proyecto: la primera pantalla de quien entra al repositorio",
  "plantilla/.github/PULL_REQUEST_TEMPLATE.md": "-> se abre en CADA pull request, para todo el mundo",
  "plantilla/.github/proteccion-main.md": "-> lo abre quien tiene que pedir o aplicar la proteccion de main",
  "plantilla/infra/README.md": "-> lo abre quien monta la infraestructura",
  "plantilla/infra-prod/README.md": "-> idem, para el ambiente de produccion",
  "plantilla/infra/adaptadores.md": "-> lo abre quien elige plataforma",
};

/** Termino -> el texto que TIENE que estar en esa misma pagina explicandolo.
 *  Se busca con los espacios normalizados, porque estos archivos van cortados a
 *  ~95 columnas y la explicacion cruza el corte de linea a menudo. */
const EXPLICADOS = {
  "plantilla/README-del-proyecto.md": {
    "ci-ok": "mira el resultado de todas las demás y las resume en un sí o un no",
    CODEOWNERS: "un archivo que GitHub lee solo para asignar los revisores de cada pull request",
    PO: "que es quien decide qué se construye",
  },
  "plantilla/.github/PULL_REQUEST_TEMPLATE.md": {
    change: "la carpeta donde queda escrito, ANTES de programar, qué se va a cambiar y por qué",
    spec: "el documento que dice cómo tiene que comportarse esto, escrito en ejemplos concretos",
    proposal: "**proposal** (por qué y qué cambia)",
    CODEOWNERS: "el archivo que dice quién aprueba qué",
  },
  "plantilla/.github/proteccion-main.md": {
    ruleset: "el conjunto de reglas de GitHub que protege una rama",
    CODEOWNERS: "el archivo que dice quién aprueba qué",
    "ci-ok": "no hace trabajo propio: mira el resultado de todo lo demás",
  },
  "plantilla/infra/README.md": {
    compuerta: "una comprobación que bloquea el merge",
    change: "la propuesta escrita",
  },
  "plantilla/infra-prod/README.md": {
    compuerta: "una comprobación que bloquea el merge",
    change: "la propuesta escrita",
  },
  "plantilla/infra/adaptadores.md": {
    compuerta: "ninguna comprobación bloquea el merge por esto",
  },
};

/** Termino -> por que NO necesita definicion en esa pagina. */
const CASTELLANO_CORRIENTE = {
  "plantilla/infra/README.md": {
    andamio: 'se usa como sustantivo comun y el contexto lo dice entero: "el andamio no reparte infraestructura sin verificar"',
    marcador: 'lo explica la frase que lo usa: "el marcador está dentro del nombre del bucket"',
    "modo aviso": 'la propia linea dice que significa: "estrenan en modo aviso hasta el <fecha> y después se ponen rojas solas"',
  },
  "plantilla/infra-prod/README.md": {
    andamio: "igual que en infra/README.md: sustantivo comun",
    marcador: "igual que en infra/README.md",
    "modo aviso": "igual que en infra/README.md",
  },
  "plantilla/infra/adaptadores.md": {
    andamio: "sustantivo comun: \"la única que el andamio reparte ya escrita\"",
    constitución: 'la frase la ubica sin definirla: "reglas que la constitución enuncia"',
  },
};

const TERMINOS = terminosDelGlosario();
// Se sacan los `>` de cita ANTES de juntar los espacios: la explicacion de
// `ruleset` vive dentro de un bloque citado y sus marcadores de linea quedaban
// en medio de la frase ("...protege una > rama"), asi que la busqueda fallaba
// por la forma del bloque y no por lo que dice el texto.
const norm = (t) =>
  t
    .split("\n")
    .map((l) => l.replace(/^\s*>\s?/, ""))
    .join(" ")
    .replace(/\s+/g, " ");

test("el glosario tiene terminos: sin eso, todo lo de abajo pasaria vacio", () => {
  assert.ok(TERMINOS.length >= 30, `el glosario tiene que traer los terminos del marco; trajo ${TERMINOS.length}`);
});

test("cada pagina que viaja declara TODO el vocabulario del marco que usa", () => {
  const sinDeclarar = [];
  for (const pagina of Object.keys(PAGINAS)) {
    const usados = terminosUsados(leer(pagina), TERMINOS);
    const declarados = new Set([...Object.keys(EXPLICADOS[pagina] ?? {}), ...Object.keys(CASTELLANO_CORRIENTE[pagina] ?? {})]);
    for (const t of usados) if (!declarados.has(t)) sinDeclarar.push(`${pagina}: "${t}"`);
  }
  assert.deepEqual(
    sinDeclarar,
    [],
    "estas paginas viajan al proyecto del consumidor, donde NO hay glosario al que enlazar. Cada palabra del " +
      "vocabulario del marco que usen tiene que estar declarada en este archivo: o con la frase que la explica en " +
      "la propia pagina (EXPLICADOS), o con el motivo por el que no la necesita (CASTELLANO_CORRIENTE). Sin " +
      `declarar quedaron:\n  ${sinDeclarar.join("\n  ")}`,
  );
});

test("cada explicacion declarada esta DE VERDAD en la pagina, con esas palabras", () => {
  const rotas = [];
  for (const [pagina, mapa] of Object.entries(EXPLICADOS)) {
    const texto = norm(leer(pagina));
    for (const [termino, frase] of Object.entries(mapa)) {
      if (!texto.includes(norm(frase))) rotas.push(`${pagina}: "${termino}" declara una explicacion que la pagina NO contiene -> "${frase}"`);
    }
  }
  assert.deepEqual(
    rotas,
    [],
    "una explicacion declarada aca y ausente del documento es peor que no declararla: este banco quedaria en " +
      `verde afirmando que la palabra esta explicada cuando el lector no la va a encontrar.\n  ${rotas.join("\n  ")}`,
  );
});

test("no sobran declaraciones: una entrada de una palabra que la pagina ya no usa se avisa", () => {
  // Anti-vacuidad por el otro lado. Una entrada vieja no rompe a nadie hoy, pero
  // hace crecer la lista con permisos que nadie necesita, y la proxima persona
  // que la lea no sabe cuales siguen vivos.
  const sobrantes = [];
  for (const pagina of Object.keys(PAGINAS)) {
    const usados = new Set(terminosUsados(leer(pagina), TERMINOS));
    for (const t of [...Object.keys(EXPLICADOS[pagina] ?? {}), ...Object.keys(CASTELLANO_CORRIENTE[pagina] ?? {})]) {
      if (!usados.has(t)) sobrantes.push(`${pagina}: "${t}" esta declarado y la pagina ya no lo usa`);
    }
  }
  assert.deepEqual(sobrantes, [], `sacalos de la lista:\n  ${sobrantes.join("\n  ")}`);
});

test("MUERDE: una palabra del marco metida sin declarar se caza", () => {
  // El caso que prueba que los tres de arriba no pasan por vacuidad. Se simula
  // sobre texto, sin tocar el arbol.
  const pagina = "plantilla/README-del-proyecto.md";
  const declarados = new Set([...Object.keys(EXPLICADOS[pagina]), ...Object.keys(CASTELLANO_CORRIENTE[pagina] ?? {})]);
  const intruso = TERMINOS.find((t) => !declarados.has(t) && !terminosUsados(leer(pagina), [t]).length);
  assert.ok(intruso, "tiene que existir al menos un termino del glosario que esta pagina no use, para poder simular la intrusion");

  const mutada = `${leer(pagina)}\n\nY entonces se revisa el ${intruso} correspondiente.\n`;
  const usados = terminosUsados(mutada, TERMINOS);
  assert.ok(
    usados.includes(intruso) && !declarados.has(intruso),
    `con "${intruso}" agregado al texto, la deteccion tiene que verlo y encontrarlo sin declarar; si no, el caso de arriba pasa vacio`,
  );
});

test("todas las paginas que viajan y las lee una persona estan en la lista", () => {
  // La lista de arriba se escribe a mano, asi que lo que hay que vigilar es que
  // no se quede vieja. Los .md que el andamio reparte y que NO estan aca son los
  // que lee una herramienta, no una persona: los dos de agentes y los de
  // .claude/. Se nombran uno por uno para que agregar un .md nuevo al andamio
  // obligue a decidir en cual de los dos grupos cae.
  const PARA_HERRAMIENTAS = ["plantilla/AGENTS.md", "plantilla/CLAUDE.md", "plantilla/.claude/agents/cazador-fail-open.md", "plantilla/.claude/skills/projects-archive-change/SKILL.md"];
  const CON_NOMBRE_PROPIO = ["plantilla/README.md"]; // el README DEL ANDAMIO, que no viaja: se queda en el marco
  const todos = execSync("git ls-files 'plantilla/**/*.md' 'plantilla/*.md'", { encoding: "utf-8" }).trim().split("\n").filter(Boolean).sort();
  const clasificados = new Set([...Object.keys(PAGINAS), ...PARA_HERRAMIENTAS, ...CON_NOMBRE_PROPIO]);
  const nuevos = todos.filter((f) => !clasificados.has(f));
  assert.deepEqual(
    nuevos,
    [],
    "hay .md nuevos en el andamio sin clasificar. Si los lee una persona, van en PAGINAS y quedan bajo la regla de " +
      `explicar el vocabulario; si los lee una herramienta, van en PARA_HERRAMIENTAS con esa razon:\n  ${nuevos.join("\n  ")}`,
  );
});
