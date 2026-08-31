import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

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

const listar = (...args) =>
  execFileSync("git", ["ls-files", ...args], { cwd: RAIZ, encoding: "utf-8" })
    .trim()
    .split("\n")
    .filter(Boolean);

const docs = () => listar("docs/*.md", "*.md").filter((f) => f !== "CHANGELOG.md");

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

/** Cifras que la documentacion afirma sobre si misma, con como se miden.
 *
 *  Cada entrada es un patron que caza la afirmacion y una funcion que devuelve
 *  el numero de verdad. Si el patron no aparece en ningun lado, no pasa nada: la
 *  pagina dejo de afirmarlo, que es justamente lo que se prefiere. */
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
];

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

test("ninguna cifra que la documentacion afirma sobre si misma esta vieja", async () => {
  const mal = [];
  for (const f of textosQueAfirman()) {
    const texto = fs.readFileSync(path.join(RAIZ, f), "utf-8");
    for (const cifra of CIFRAS_SOBRE_SI_MISMA) {
      for (const m of texto.matchAll(cifra.patron)) {
        // Una cifra sola o un par —«entre 9 y 17»—: las dos se comparan igual,
        // y un par mal por una punta es tan viejo como uno mal por las dos.
        const grupos = Array.isArray(cifra.grupo) ? cifra.grupo : [cifra.grupo];
        const dice = grupos.map((g) => Number(m[g]));
        const real = [await cifra.medir()].flat();
        if (dice.join("-") !== real.join("-")) {
          mal.push(`${f} → dice ${dice.join(" y ")} y son ${real.join(" y ")} (${cifra.nombre})`);
        }
      }
    }
  }
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
    const vistas = [...cebo.matchAll(cifra.patron)].map((m) => grupos.map((g) => Number(m[g])));
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
  for (const f of docs()) {
    // docs/11 es la pagina del UPGRADE: su tema es cambiar el pin, asi que
    // escribe `X.Y.Z` a proposito. Exigirle una version concreta la volveria
    // una receta para la version vieja, que es lo contrario de lo que hace.
    if (f === "docs/12-upgrade-openspec.md") continue;
    for (const bloque of bloquesBash(fs.readFileSync(path.join(RAIZ, f), "utf-8"))) {
      for (const linea of bloque.split("\n")) {
        const t = linea.trim();
        if (!/(^|[|&;(]\s*)openspec\s/.test(` ${t}`)) continue;
        if (t.includes(`@fission-ai/openspec@${pin}`)) continue;
        malas.push(`${f} → ${t}`);
      }
    }
  }
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
    if (f === "docs/12-upgrade-openspec.md") continue;
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
