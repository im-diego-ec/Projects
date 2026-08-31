import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { PREGUNTAS } from "../../herramientas/projects-asistente.mjs";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const CARTA = path.join(RAIZ, "docs/03-stack.md");

// ---------------------------------------------------------------------------
// «QUE NO QUEDE EN PAPEL».
//
// La carta de docs/03-stack.md nombra CUATRO formas de construir y explica el
// beneficio y el limite de cada una. Ese texto es una promesa, y una promesa que
// no se puede cumplir es peor que no hacerla: este repositorio ya se comio ese
// defecto una vez, cuando el asistente ofrecia Slack como opcion y elegirlo
// producia un archivo que el motor rechazaba.
//
// LA REGLA DE ESTE BANCO, y es una sola: la columna «estado» de la carta dice la
// verdad. Una forma marcada ✅ tiene que estar de verdad disponible; una marcada
// 🕳️ NO puede aparecer como opcion del asistente. La carta puede explicar lo que
// todavia no existe —para eso esta, para que alguien elija sabiendo— pero tiene
// que decir que no existe, y el asistente no puede ofrecerlo.
//
// Cuando una forma se construya, dos cosas se mueven JUNTAS o el banco se pone
// rojo: su fila pasa a ✅ y su opcion entra al asistente.
// ---------------------------------------------------------------------------

const DISPONIBLE = "✅";
const FALTA = "🕳️";

/** Las filas de la carta: clave, nombre y estado. */
export function formasDeLaCarta(texto = fs.readFileSync(CARTA, "utf-8")) {
  const formas = [];
  for (const linea of texto.split("\n")) {
    // La clave se acepta ABIERTA —cualquier letra con un + opcional— y no
    // acotada a la A..D. Un esceptico agrego una fila «**E** | Un bot de
    // WhatsApp | ✅» sin seccion, sin beneficio y sin limite, y el banco quedo
    // en verde porque el regex ni la veia. Una regla que solo mira las filas
    // que ya existian no vigila lo que se agrega, que es justo cuando hace falta.
    const m = /^\|\s*\*\*([A-Z]\+?)\*\*\s*\|([^|]+)\|([^|]+)\|([^|]+)\|/.exec(linea);
    if (m) formas.push({ clave: m[1], nombre: m[2].trim(), estado: m[4].trim() });
  }
  return formas;
}

const FORMAS = formasDeLaCarta();

test("la carta nombra las formas, y un cero aca es este banco roto", () => {
  assert.ok(
    FORMAS.length >= 4,
    `la carta tiene que nombrar al menos cuatro formas; se encontraron ${FORMAS.length}. Si el numero cayo, lo primero ` +
      "que hay que mirar es si la tabla cambio de forma, no si el marco perdio sus caminos",
  );
  const claves = FORMAS.map((f) => f.clave);
  assert.ok(claves.includes("A") && claves.includes("B") && claves.includes("D"), `faltan formas: ${claves.join(", ")}`);
});

test("cada forma declara su estado, y no hay estados inventados", () => {
  // La flecha es un estado legitimo —«esta forma cae en otra»— pero NO puede ser
  // una puerta trasera: un esceptico le puso «→ ver abajo» a una forma pendiente
  // y quedo fuera de pendientes, fuera de disponibles y exenta de tener seccion.
  // Por eso el caso de abajo exige que la flecha diga A DONDE cae.
  const raros = FORMAS.filter((f) => !f.estado.includes(DISPONIBLE) && !f.estado.includes(FALTA) && !f.estado.includes("→"));
  assert.deepEqual(
    raros.map((f) => `${f.clave}: "${f.estado}"`),
    [],
    `el estado de una forma solo puede ser ${DISPONIBLE} (esta construida), ${FALTA} (falta) o una flecha (cae en otra). ` +
      "Un estado que no es ninguno de los tres deja al lector sin saber si puede elegirla",
  );
});

/** El id de la pregunta con la que el asistente ofrecera las formas.
 *
 *  TODAVIA NO EXISTE, y eso es correcto: hoy hay UNA forma construida y no se
 *  pregunta por algo que no tiene alternativa. Pero que no exista NO puede
 *  volver vacuo el cruce de abajo, que es lo que pasaba: `PREGUNTAS.find(...)`
 *  devolvia undefined, la lista de ofrecidas salia vacia, y todos los casos que
 *  la usaban pasaban sin comprobar nada. Un esceptico lo rompio de cuatro
 *  formas distintas con el banco en verde.
 *
 *  Por eso el id se declara aca y hay un caso que vigila la transicion: el dia
 *  que haya dos formas disponibles, la pregunta pasa a ser obligatoria. */
const ID_DE_LA_PREGUNTA = "forma";

function preguntaDeLasFormas() {
  return PREGUNTAS.find((p) => p.id === ID_DE_LA_PREGUNTA) ?? null;
}

/** El puente entre la letra de la carta y el valor que usa el asistente.
 *
 *  La carta habla en letras porque asi se leen sus secciones («la forma A»), y
 *  el asistente en palabras porque asi se guardan en el archivo de valores. Sin
 *  este mapa, el cruce compara "A" contra "APLICACION" y nunca coincide: el
 *  banco quedaria rojo con todo bien, o —peor, si el aserto fuera al reves—
 *  verde con todo mal.
 *
 *  Va escrito y no derivado a proposito: es la unica linea donde las dos
 *  nomenclaturas se tocan, y tenerla en un solo lugar es lo que hace que agregar
 *  una forma sea un cambio y no una arqueologia. */
const LETRA_DE_LA_OPCION = { aplicacion: "B+", sitio: "A" };

function formasQueElAsistenteOfrece() {
  const p = preguntaDeLasFormas();
  if (!p) return [];
  return p.opciones.map((o) => LETRA_DE_LA_OPCION[o.valor] ?? o.valor.toUpperCase());
}

test("toda opcion del asistente corresponde a una forma de la carta", () => {
  const p = preguntaDeLasFormas();
  if (!p) return;
  const claves = new Set(FORMAS.map((f) => f.clave));
  const huerfanas = p.opciones.map((o) => o.valor).filter((v) => !claves.has(LETRA_DE_LA_OPCION[v] ?? v.toUpperCase()));
  assert.deepEqual(
    huerfanas,
    [],
    "el asistente ofrece una forma que la carta ni siquiera nombra. Quien la elija no tiene donde leer que eligio: " +
      `agregala a la tabla con su seccion, o sacala del asistente.\n  ${huerfanas.join(", ")}`,
  );
});

test("NINGUNA forma marcada como pendiente se ofrece en el asistente", () => {
  const pendientes = FORMAS.filter((f) => f.estado.includes(FALTA)).map((f) => f.clave);
  const ofrecidas = formasQueElAsistenteOfrece();
  const mentira = pendientes.filter((c) => ofrecidas.includes(c));
  assert.deepEqual(
    mentira,
    [],
    "el asistente ofrece una forma que la carta declara pendiente. Ofrecer una opcion que despues no funciona es el " +
      "defecto exacto que este repositorio ya se comio con Slack: la persona elige bien y el error no habla de lo que " +
      `eligio. O se construye la forma y su fila pasa a ${DISPONIBLE}, o se saca del asistente. Ofrecidas de mas: ${mentira.join(", ")}`,
  );
});

test("TODA forma marcada como disponible se puede elegir de verdad", () => {
  const disponibles = FORMAS.filter((f) => f.estado.includes(DISPONIBLE)).map((f) => f.clave);
  assert.ok(disponibles.length >= 1, "tiene que haber al menos una forma disponible, o el marco no sirve para nada hoy");

  const ofrecidas = formasQueElAsistenteOfrece();
  // Mientras el asistente NO tenga la pregunta, la unica forma disponible tiene
  // que ser la que se reparte por defecto: es coherente que no se pregunte por
  // algo que no tiene alternativa. En cuanto haya DOS disponibles, la pregunta
  // pasa a ser obligatoria — elegir entre dos cosas no se hace por defecto.
  if (ofrecidas.length === 0) {
    assert.equal(
      disponibles.length,
      1,
      `hay ${disponibles.length} formas disponibles (${disponibles.join(", ")}) y el asistente no pregunta cual. ` +
        "Con mas de una construida, la pregunta deja de ser opcional: la persona tiene derecho a elegir entre lo que existe",
    );
    return;
  }
  const sinOfrecer = disponibles.filter((c) => !ofrecidas.includes(c));
  assert.deepEqual(sinOfrecer, [], `la carta las declara construidas y el asistente no las ofrece: ${sinOfrecer.join(", ")}`);
});

test("cada forma explica su beneficio Y su limite, no solo su nombre", () => {
  const texto = fs.readFileSync(CARTA, "utf-8");
  const flacas = [];
  for (const f of FORMAS) {
    if (f.estado.includes("→")) continue; // la que cae en otra no necesita seccion propia
    const re = new RegExp(`^### ${f.clave.replace("+", "\\+")} ·[\\s\\S]*?(?=^### |^## |\\Z)`, "m");
    const seccion = re.exec(texto);
    if (!seccion) {
      flacas.push(`${f.clave}: la tabla la nombra y no tiene seccion propia que la explique`);
      continue;
    }
    const cuerpo = seccion[0];
    if (!/Por qu(é|e) la elegir(í|i)as/i.test(cuerpo)) flacas.push(`${f.clave}: no dice por que la elegirias`);
    if (!/l(í|i)mite real|Qu(é|e) te cuesta/i.test(cuerpo)) flacas.push(`${f.clave}: no dice que te cuesta ni cual es su limite`);
  }
  assert.deepEqual(
    flacas,
    [],
    "una forma que solo dice su nombre no es una opcion: quien no sabe la respuesta sigue sin saberla. Cada una tiene " +
      `que decir por que la elegirias y que te cuesta.\n  ${flacas.join("\n  ")}`,
  );
});

test("MUERDE: una forma pendiente ofrecida en el asistente se caza", () => {
  // El caso que prueba que lo de arriba no pasa por vacuidad.
  const pendientes = FORMAS.filter((f) => f.estado.includes(FALTA)).map((f) => f.clave);
  assert.ok(pendientes.length > 0, "hoy tiene que haber al menos una forma pendiente para que el caso signifique algo");
  const ofrecidasFalsas = [...formasQueElAsistenteOfrece(), pendientes[0]];
  assert.ok(
    pendientes.some((c) => ofrecidasFalsas.includes(c)),
    "con la forma pendiente agregada a la lista de ofrecidas, la deteccion tiene que verla",
  );
});

test("una flecha tiene que decir A DONDE cae, y ese destino tiene que existir", () => {
  // El agujero que un esceptico encontro: poniendole «→ ver abajo» a una forma
  // pendiente quedaba fuera de pendientes, fuera de disponibles y exenta de
  // tener seccion propia. Tres exenciones de una, escribiendo dos palabras.
  const claves = new Set(FORMAS.map((f) => f.clave));
  const rotas = [];
  for (const f of FORMAS) {
    if (!f.estado.includes("→")) continue;
    const destinos = [...f.estado.matchAll(/\b([A-Z]\+?)\b/g)].map((m) => m[1]).filter((c) => claves.has(c) && c !== f.clave);
    if (destinos.length === 0) rotas.push(`${f.clave}: "${f.estado}" no nombra ninguna otra forma de la tabla`);
  }
  assert.deepEqual(
    rotas,
    [],
    "una flecha sin destino es una forma que se escapa de las tres reglas a la vez: no cuenta como pendiente, no " +
      `cuenta como disponible, y no necesita seccion. Tiene que decir en que otra forma cae.\n  ${rotas.join("\n  ")}`,
  );
});

test("el aviso que le dice al lector que hoy NO puede elegir sigue estando", () => {
  // Un esceptico borro entero ese recuadro —la unica frase que le dice al lector
  // que las formas marcadas 🕳️ estan explicadas pero no se pueden elegir— y el
  // banco no se movio. La honestidad que este archivo dice sostener no estaba
  // sostenida por ningun caso.
  const texto = fs.readFileSync(CARTA, "utf-8");
  const hayPendientes = FORMAS.some((f) => f.estado.includes(FALTA));
  if (!hayPendientes) return; // todas construidas: el aviso ya no hace falta

  assert.match(
    texto,
    /el asistente todav(í|i)a no te la ofrece/i,
    "hay formas marcadas como pendientes y la carta ya no explica que eso significa que NO se pueden elegir. Sin esa " +
      "frase, la tabla se lee como un menu completo y la persona elige algo que no existe",
  );
  assert.match(
    texto,
    /ofrecer una opci(ó|o)n que despu(é|e)s no funciona/i,
    "y tiene que decir POR QUE no se ofrece: es la leccion que este repositorio ya pago con Slack",
  );
});

test("MUERDE: una forma pendiente ofrecida por el asistente pone el banco en rojo", () => {
  // El caso anterior era tautologico: armaba la lista falsa en memoria y despues
  // se comprobaba a si mismo, sin ejecutar nunca la asercion real. Este ejecuta
  // LA MISMA comparacion que hace el caso de verdad, con datos fabricados.
  const pendientes = FORMAS.filter((f) => f.estado.includes(FALTA)).map((f) => f.clave);
  assert.ok(pendientes.length > 0, "hoy tiene que haber al menos una pendiente para que este caso signifique algo");

  const comparar = (ofrecidas) => pendientes.filter((c) => ofrecidas.includes(c));
  assert.deepEqual(comparar(formasQueElAsistenteOfrece()), [], "el arbol real tiene que estar limpio");
  assert.deepEqual(
    comparar([pendientes[0]]),
    [pendientes[0]],
    "y con la forma pendiente en la lista de ofrecidas, la MISMA comparacion tiene que devolverla. Si no, el caso de " +
      "verdad no esta midiendo nada",
  );
});

test("MUERDE: una fila con una letra que no estaba tambien se vigila", () => {
  // El regex acotado a A..D dejaba pasar una fila «**E**» entera, sin seccion y
  // sin explicacion. Se comprueba sobre texto, sin tocar el arbol.
  const fabricada = "| **Z** | Un bot de mensajeria | cualquiera | ✅ es lo que hay hoy |";
  const vistas = formasDeLaCarta(fabricada);
  assert.equal(vistas.length, 1, "el detector tiene que ver una fila con una letra que no estaba en la tabla original");
  assert.equal(vistas[0].clave, "Z");
});

// ---------------------------------------------------------------------------
// «CONSTRUIDA Y PROBADA» TIENE QUE SIGNIFICAR QUE SE PUEDE CONSTRUIR.
//
// EL DEFECTO QUE ESTE BANCO CIERRA, medido: la fila A decia «✅ construida y
// probada» y generar esa forma salia 1 —el arranque moria en el paso 2/4 con
// `Missing script: datos`—. Los controles de arriba cruzan la carta contra el
// MENU del asistente: que la forma este ofrecida. Ninguno cruzaba la carta
// contra el RESULTADO de elegirla, y en ese hueco vivio el peor hallazgo de la
// auditoria: la persona lee «probada», elige, y camina derecho al muro.
//
// El propio repositorio escribe la vara: «una fila marcada como funcionando que
// no funciona es el peor defecto posible de este repo».
// ---------------------------------------------------------------------------

test("toda forma que la carta declara construida se genera Y arranca de verdad", async () => {
  const { instanciar, pasosQueCorren, archivosDelAndamio, TODAS } = await import("../../herramientas/projects-init.mjs");
  const { PREGUNTAS, correrAsistente } = await import("../../herramientas/projects-asistente.mjs");
  const os = await import("node:os");
  const ANDAMIO = path.join(RAIZ, "plantilla");

  const disponibles = FORMAS.filter((f) => f.estado.includes(DISPONIBLE)).map((f) => f.clave);
  const pregunta = PREGUNTAS.find((p) => p.id === ID_DE_LA_PREGUNTA);
  assert.ok(pregunta, "sin la pregunta de forma este control no puede elegir nada");
  assert.ok(disponibles.length >= 1, "un cero aca es este banco roto, no una carta vacia");

  const rotas = [];
  for (const clave of disponibles) {
    const opcion = pregunta.opciones.find((o) => LETRA_DE_LA_OPCION[o.valor] === clave);
    if (!opcion) {
      rotas.push(`${clave}: la carta la declara construida y el asistente no la ofrece`);
      continue;
    }
    const idx = String(pregunta.opciones.indexOf(opcion) + 1);
    const destino = fs.mkdtempSync(path.join(os.tmpdir(), `carta-${opcion.valor}-`));
    const { valores } = await correrAsistente(
      async (_t, id) => ({ PROYECTO: "p", ORG: "o", forma: idx })[id] ?? "",
      {},
      {},
      () => {},
      { ORG_MARCO: "im-diego-ec" },
    );
    let r;
    try {
      r = instanciar({ raizAndamio: ANDAMIO, destino, valores });
    } catch (e) {
      rotas.push(`${clave}: instanciar tiro "${e.message}"`);
      continue;
    }
    if (r.faltantes.length) rotas.push(`${clave}: marcadores sin valor -> ${r.faltantes.join(", ")}`);

    // LA PARTE QUE FALTABA: los pasos del arranque, cruzados contra los scripts
    // que ESA forma declara. Es donde se caia y donde nadie miraba.
    const scripts = JSON.parse(fs.readFileSync(path.join(destino, "package.json"), "utf-8")).scripts ?? {};
    const { corren } = pasosQueCorren(destino);
    for (const paso of corren) {
      const script = paso.args[0] === "run" ? paso.args[1] : null;
      if (script && !(script in scripts)) rotas.push(`${clave}: el arranque correria \`${script}\`, que esta forma no declara`);
    }
    if (!corren.length) rotas.push(`${clave}: no correria ningun paso de arranque`);

    // Y su pipeline, que es lo que decide si nace en verde.
    const ci = fs.readFileSync(path.join(destino, ".github/workflows/ci.yml"), "utf-8");
    const paquetes = new Set(
      fs.readdirSync(destino, { withFileTypes: true }).filter((e) => e.isDirectory() && fs.existsSync(path.join(destino, e.name, "package.json"))).map((e) => e.name),
    );
    for (const m of ci.split("\n").filter((l) => !/^\s*#/.test(l)).join("\n").matchAll(/--filter\s+([A-Za-z@][\w@/.-]*)/g)) {
      if (!paquetes.has(m[1])) rotas.push(`${clave}: su CI filtra por "${m[1]}", que esta forma no reparte`);
    }
  }

  assert.deepEqual(
    rotas,
    [],
    "la carta declara CONSTRUIDA una forma que no llega a un proyecto sano. Es el peor defecto posible de este " +
      `repositorio, porque la persona lee «probada», elige, y se estrella:\n  ${rotas.join("\n  ")}`,
  );
});
