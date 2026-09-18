// Banco de «Qué es BREAKING»: una lista, un lugar, y ninguna superficie que la contradiga.
//
//   node --test pruebas/ci-del-marco/que-es-breaking.test.mjs
//
// QUE CIERRA. La definicion de incompatible vive en `AGENTS.md` y se REPITE en otros
// lugares que alguien lee en el momento de decidir: la plantilla de PR (donde se marca
// el caso), la skill del release (donde se elige el numero), el glosario (la fila
// «estreno») y el preambulo del CHANGELOG (lo que un consumidor lee primero). Cuando la
// regla cambia, cambia en uno y las copias quedan diciendo la vieja.
//
// No es teorico. Rigel —el marco del que Projects se bifurco— reescribio esta misma
// regla el 2026-09-04 (change `linea-v2`, commit fa4343a) y su skill de release siguio
// diciendo la contraria hasta el 2026-09-06, cuando la encontro alguien leyendo antes de
// cortar la 2.0.0 (commit 9dfba86: «LA DEFINICION DE BREAKING contradecia a AGENTS.md
// desde el 2026-09-04»). Nada era rojo. Y en este repo, el 2026-09-17, la regla vieja
// estaba escrita en cinco superficies a la vez: AGENTS.md, la plantilla de PR, la skill,
// el glosario y el preambulo del CHANGELOG.
//
// COMO LO MIDE, en dos mitades:
//
//  1. DERIVADO, no escrito aca: la lista cerrada se LEE de AGENTS.md —cada caso abre con
//     su frase en negrita— y la plantilla de PR tiene que ofrecer EXACTAMENTE esos casos,
//     con la misma frase. Agregar un caso en un lado y no en el otro es rojo, sin que este
//     banco sepa cuales son.
//  2. LAS FRASES DE LA REGLA VIEJA no vuelven a ninguna superficie que dicte la regla. Es
//     una lista escrita a mano —el mismo patron que `FALSAS` en pinado.test.mjs— y tiene
//     el limite de toda lista: caza la frase exacta, no el sinonimo. Por eso la mitad 1
//     existe y es la que pesa.
//
// LO QUE ESTE BANCO NO PUEDE DECIR: si un cambio concreto esta bien clasificado. Eso es
// un juicio de quien escribe el PR, y lo pregunta la plantilla.

import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { evolucionSegunElIndice } from "../docs/lectura.mjs";
import { pendienteDelPorte } from "./carril-del-porte.mjs";

const RAIZ = join(import.meta.dirname, "..", "..");
const leer = (rel) => readFileSync(join(RAIZ, rel), "utf8");

const AGENTS = "AGENTS.md";
const PLANTILLA_PR = ".github/PULL_REQUEST_TEMPLATE.md";
const SKILL_RELEASE = ".claude/skills/projects-release/SKILL.md";
const GLOSARIO = "docs/02-glosario.md";
const CHANGELOG = "CHANGELOG.md";

/** El encabezado que las superficies citan. Si cambia, las citas quedan colgando: por
 *  eso hay un caso que exige que exista tal cual. */
const TITULO_BREAKING = "### Qué es BREAKING";

/** Las lineas de una seccion `###` hasta el siguiente encabezado del mismo nivel o mayor. */
export function seccion(texto, titulo) {
  const lineas = String(texto).split(/\r?\n/);
  const desde = lineas.findIndex((l) => l.trim() === titulo);
  if (desde === -1) return null;
  const nivel = titulo.match(/^#+/)[0].length;
  let hasta = lineas.length;
  for (let i = desde + 1; i < lineas.length; i += 1) {
    const m = lineas[i].match(/^(#+)\s/);
    if (m && m[1].length <= nivel) {
      hasta = i;
      break;
    }
  }
  return lineas.slice(desde + 1, hasta).join("\n");
}

/** La frase en negrita con que abre cada caso, normalizada: espacios colapsados y sin el
 *  punto final, para que el corte de linea o un punto no separen dos copias iguales. */
const normalizarCaso = (s) => s.replace(/\s+/g, " ").trim().replace(/[.:]$/, "");

/** Los casos de la lista cerrada: los items NUMERADOS de «Qué es BREAKING», cada uno por
 *  la negrita con que abre. La frase puede cruzar el corte de linea, asi que se junta el
 *  item entero antes de buscarla. */
export function listaCerrada(agents) {
  const cuerpo = seccion(agents, TITULO_BREAKING);
  if (cuerpo === null) return [];
  const items = [];
  let actual = null;
  for (const linea of cuerpo.split("\n")) {
    const abre = linea.match(/^\d+\.\s+(.*)$/);
    if (abre) {
      if (actual !== null) items.push(actual);
      actual = abre[1];
    } else if (actual !== null && /^\s+\S/.test(linea)) {
      actual += ` ${linea.trim()}`;
    } else if (actual !== null) {
      items.push(actual);
      actual = null;
    }
  }
  if (actual !== null) items.push(actual);
  return items
    .map((item) => item.match(/^\*\*(.+?)\*\*/))
    .filter(Boolean)
    .map((m) => normalizarCaso(m[1]));
}

/** Los casos que la plantilla de PR ofrece para marcar: las casillas que siguen a «Si es
 *  breaking, marcá cuál aplica», por la negrita con que abren. */
export function casosDeLaPlantilla(plantilla) {
  const lineas = String(plantilla).split(/\r?\n/);
  const desde = lineas.findIndex((l) => /^Si es breaking, marc/i.test(l));
  if (desde === -1) return [];
  const casos = [];
  for (let i = desde + 1; i < lineas.length; i += 1) {
    const l = lineas[i];
    if (/^#{1,6}\s/.test(l)) break;
    const casilla = l.match(/^- \[[ xX]\]\s+\*\*(.+?)\*\*/);
    if (casilla) casos.push(normalizarCaso(casilla[1]));
  }
  return casos;
}

// ---------------------------------------------------------------------------
// LA REGLA VIEJA, frase por frase. Cada una esta citada de donde vivia el 2026-09-17.
// ---------------------------------------------------------------------------

/** Frases de la regla que la decision D1 del PO (2026-09-17) retiro. Se comparan contra
 *  el texto normalizado (minusculas, sin marcas de Markdown, espacios y cortes de linea
 *  colapsados), asi que la forma envuelta a 88 columnas se caza igual. */
export const REGLA_VIEJA = [
  // AGENTS.md:143 — la definicion de MINOR que dejaba afuera a toda compuerta nueva.
  "un check adicional que no rompe lo verde de nadie",
  // .claude/skills/projects-release/SKILL.md:107 — la misma, en la skill.
  "un check adicional que no pone en rojo a nadie que hoy pasa",
  // AGENTS.md:163-165 — el caso que salio de la lista, y su salida escrita.
  "endurecer un check de modo que un repo que hoy pasa mañana falle",
  "endurecer un check de modo que un repo que hoy pasa manana falle",
  "el endurecimiento va en el major siguiente",
  // docs/02-glosario.md:51 — la fila «estreno».
  "el endurecimiento espera a la versión mayor siguiente",
  "nadie se entera de una regla nueva por un pull request en rojo",
  // .github/PULL_REQUEST_TEMPLATE.md:64 — la casilla del caso retirado.
  "un check se endureció",
  // .github/PULL_REQUEST_TEMPLATE.md:50 y CHANGELOG.md:22 — la pregunta atada a una
  // linea mayor que ya no es el canal.
  "breaking para @v1",
  // openspec/specs/calidad-codigo/spec.md:268 — la PREMISA de la regla: «el marco se
  // consume por un tag movil, asi que una verificacion nueva aparece en el pipeline de
  // cada proyecto sin que nadie la haya leido: por eso se estrena en modo aviso». Dejo
  // de ser cierta el 2026-08-21 (revision adversarial del porte, RV-L4-05).
  "se consume por un tag móvil",
  "se consume por un tag movil",
];

export function normalizarProsa(texto) {
  return String(texto)
    .split(/\r?\n/)
    .map((l) => l.replace(/^\s*>\s?/, "").replace(/^\s*<!--\s?|\s?-->\s*$/g, ""))
    .join(" ")
    .replace(/[*`_]/g, "")
    .replace(/\s+/g, " ")
    .toLowerCase();
}

export function frasesViejas(texto) {
  const prosa = normalizarProsa(texto);
  return REGLA_VIEJA.filter((f) => prosa.includes(f));
}

/**
 * Frases viejas que SIGUEN escritas en una superficie porque su correccion tiene DUENO:
 * un change activo que la va a reescribir. La exencion vale mientras ese change este en
 * `openspec/changes/` —activo—, y vence sola el dia que se archiva o se descarta: si para
 * entonces la frase sigue ahi, el caso de abajo es rojo sin que nadie se acuerde.
 *
 * Un residuo sin fecha de vencimiento no es un residuo declarado, es una exencion
 * permanente con otro nombre. Por eso cada entrada nombra a su dueno, y otro caso exige
 * que ese dueno lo tenga anotado como tarea ABIERTA.
 */
export const PREMISAS_CON_DUENO = [
  {
    // La premisa de la ventana de gracia de la COBERTURA. El change que se hace cargo de
    // esa ventana —la cierra el 2026-09-30, decision D9 del PO— es el que reescribe su
    // justificacion; `ventana-vencida` ya lo declaro asi (su design, D6). Corregirla aca
    // exigia un MODIFIED de un requirement de ~230 lineas que ese change tambien va a
    // tocar: dos deltas sobre el mismo requirement en carriles distintos es el conflicto
    // de archive que el marco no sabe resolver solo.
    superficie: "openspec/specs/calidad-codigo/spec.md",
    frases: ["se consume por un tag móvil", "se consume por un tag movil"],
    dueno: "openspec/changes/la-ventana-se-cierra",
  },
];

/** Las frases viejas de una superficie que ninguna premisa con dueno ACTIVO exime.
 *  `duenoActivo(ruta)` dice si el change dueno sigue en `openspec/changes/`. */
export function frasesSinDueno(rel, frases, duenoActivo, premisas = PREMISAS_CON_DUENO) {
  return frases.filter(
    (f) => !premisas.some((p) => p.superficie === rel && p.frases.includes(f) && duenoActivo(p.dueno)),
  );
}

/** Lo que el CHANGELOG dice ANTES de su primera entrada: el preambulo. Las entradas son
 *  historia y citan la regla vieja con fecha, a proposito; el preambulo es regla vigente. */
export function preambulo(changelog) {
  const lineas = String(changelog).split(/\r?\n/);
  const primera = lineas.findIndex((l) => /^## \[/.test(l));
  return lineas.slice(0, primera === -1 ? lineas.length : primera).join("\n");
}

/** Las superficies que DICTAN la regla (no las que la historian): la constitucion del
 *  marco, la plantilla de PR, las skills del marco, las paginas de docs/ que no son
 *  historicas, el README y la porcion canonica que reciben los consumidores. El
 *  CHANGELOG entra solo por su preambulo, en su propio caso.
 *
 *  FUERA A PROPOSITO: `openspec/changes/` (cada change razona con la regla de su dia, y
 *  reescribirlo seria falsificar el porque de una decision) y las paginas que
 *  `docs/README.md` declara «Histórico» (una foto fechada no se actualiza; la exencion la
 *  decide el indice, no este banco). */
function superficies() {
  const docsHistoricas = new Set(
    [...evolucionSegunElIndice().entries()].filter(([, e]) => e === "Histórico").map(([p]) => `docs/${p}`),
  );
  const docs = readdirSync(join(RAIZ, "docs"))
    .filter((f) => f.endsWith(".md"))
    .map((f) => `docs/${f}`)
    .filter((p) => !docsHistoricas.has(p));
  const skills = readdirSync(join(RAIZ, ".claude", "skills"), { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => `.claude/skills/${d.name}/SKILL.md`)
    .filter((p) => existsSync(join(RAIZ, p)));
  const canonico = readdirSync(join(RAIZ, "actions", "constitucion", "canonico"))
    .filter((f) => f.endsWith(".md"))
    .map((f) => `actions/constitucion/canonico/${f}`);
  // LOS SPECS VIVOS DICTAN: son el contrato vigente del marco, no su historia (esa esta
  // en `openspec/changes/archive/`). No entraban, y ahi seguia escrita la premisa de la
  // regla vieja sin que nada la viera (RV-L4-05).
  const specsVivos = readdirSync(join(RAIZ, "openspec", "specs"), { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => `openspec/specs/${d.name}/spec.md`);
  return [AGENTS, PLANTILLA_PR, "README.md", "plantilla/AGENTS.md", ...skills, ...docs, ...canonico, ...specsVivos].filter((p) =>
    existsSync(join(RAIZ, p)),
  );
}

// ---------------------------------------------------------------------------
// Las guardas del propio banco: sin esto, todo lo de abajo puede pasar vacio.
// ---------------------------------------------------------------------------

test("la lista cerrada se lee de AGENTS.md: cero casos es el parseo roto, no una lista vacia", () => {
  const casos = listaCerrada(leer(AGENTS));
  assert.ok(
    casos.length >= 4,
    `lei ${casos.length} caso(s) en «${TITULO_BREAKING}» de AGENTS.md. La lista cerrada se escribe como items ` +
      "NUMERADOS (1., 2., ...) que abren con su frase en negrita; sin eso, la comparacion con la plantilla de PR " +
      "pasaria vacia. Arreglo: devolverle esa forma a la lista",
  );
});

test("MUERDE: el parseo ve los casos numerados y la plantilla ve sus casillas", () => {
  const agents = [
    "## Versionado",
    TITULO_BREAKING,
    "",
    "Texto.",
    "",
    "1. **Primer caso,",
    "   envuelto.** Explicacion.",
    "2. **Segundo caso.**",
    "",
    "- **Una viñeta en negrita no es un caso.**",
    "",
    "### Otra seccion",
    "3. **Esto ya no es de la lista.**",
  ].join("\n");
  assert.deepEqual(listaCerrada(agents), ["Primer caso, envuelto", "Segundo caso"]);

  const plantilla = [
    "## ¿Es BREAKING?",
    "- [ ] **No**",
    "Si es breaking, marcá cuál aplica:",
    "",
    "- [ ] **Primer caso, envuelto.** (detalle)",
    "- [x] **Segundo caso.**",
    "",
    "## Evidencia",
    "- [ ] **Esto ya no es de la lista.**",
  ].join("\n");
  assert.deepEqual(casosDeLaPlantilla(plantilla), ["Primer caso, envuelto", "Segundo caso"]);
});

test("MUERDE: las frases de la regla vieja se cazan envueltas, en cita y con marcas", () => {
  const envuelta = "> Si el\n> endurecimiento es el objetivo, se estrena en modo aviso y **el endurecimiento\n> va en el major siguiente**.";
  assert.deepEqual(frasesViejas(envuelta), ["el endurecimiento va en el major siguiente"]);
  assert.deepEqual(frasesViejas("## ¿Es BREAKING para `@v1`?"), ["breaking para @v1"]);
  assert.deepEqual(frasesViejas("Una compuerta nueva sale en rojo el día que sale."), []);
});

// ---------------------------------------------------------------------------
// La regla
// ---------------------------------------------------------------------------

test("la lista cerrada nombra el caso del arreglo que queda FUERA del repositorio del consumidor", () => {
  // Es la excepcion de la decision D1 del PO, y la que la lista de Rigel no tenia: una
  // compuerta cuyo arreglo es configuracion de GitHub o un acto de administrador no se
  // puede poner verde dentro del PR de bump. Sin este caso en la lista, la regla nueva
  // la clasificaria como MINOR y la estrenaria en rojo.
  const casos = listaCerrada(leer(AGENTS));
  assert.ok(
    casos.some((c) => /fuera del repositorio|fuera del árbol/i.test(c)),
    `ningun caso de la lista cerrada nombra el arreglo que queda fuera del repositorio del consumidor:\n  ${casos.join("\n  ")}\n` +
      "Arreglo: la lista de «Qué es BREAKING» de AGENTS.md lleva ese caso, con sus dos salidas (modo aviso o linea mayor)",
  );
});

test("la plantilla de PR ofrece EXACTAMENTE los casos de la lista cerrada, con la misma frase", () => {
  const deAgents = listaCerrada(leer(AGENTS));
  const deLaPlantilla = casosDeLaPlantilla(leer(PLANTILLA_PR));
  // Dos listas vacias son iguales: sin esto, este caso sale verde con el parseo roto en
  // los dos lados a la vez (medido: asi salia contra el arbol del 2026-09-17).
  assert.ok(deAgents.length > 0 && deLaPlantilla.length > 0, "una de las dos listas salio vacia: no hay nada que comparar");
  const faltan = deAgents.filter((c) => !deLaPlantilla.includes(c));
  const sobran = deLaPlantilla.filter((c) => !deAgents.includes(c));
  assert.deepEqual(
    { faltan, sobran },
    { faltan: [], sobran: [] },
    `${PLANTILLA_PR} y la lista cerrada de ${AGENTS} dicen cosas distintas.\n` +
      `  faltan en la plantilla: ${JSON.stringify(faltan)}\n  sobran en la plantilla: ${JSON.stringify(sobran)}\n` +
      "Quien marca el caso en el PR decide con la plantilla, no con AGENTS.md: una casilla de mas es un caso que la " +
      "regla ya no reconoce, y una de menos es un breaking que nadie puede marcar. Arreglo: que cada casilla bajo " +
      "«Si es breaking, marcá cuál aplica» abra con la MISMA frase en negrita que el caso de AGENTS.md",
  );
});

test("la pregunta de la plantilla no esta atada a una linea mayor", () => {
  // «¿Es BREAKING para `@v1`?» preguntaba por el tag movil, que dejo de ser el canal el
  // 2026-08-21. La pregunta es si el cambio es incompatible, en cualquier linea.
  const encabezados = leer(PLANTILLA_PR)
    .split(/\r?\n/)
    .filter((l) => /^#{1,6}\s/.test(l) && /breaking/i.test(l));
  assert.ok(encabezados.length > 0, `${PLANTILLA_PR} ya no pregunta si el cambio es BREAKING`);
  const atados = encabezados.filter((l) => /@v\d/.test(l));
  assert.deepEqual(atados, [], `la pregunta nombra una linea mayor concreta: ${atados.join(" | ")}`);
});

test("las superficies que citan «Qué es BREAKING» citan un encabezado que existe", () => {
  assert.ok(
    leer(AGENTS).split(/\r?\n/).some((l) => l.trim() === TITULO_BREAKING),
    `${AGENTS} ya no tiene el encabezado «${TITULO_BREAKING}», y la plantilla de PR, la skill del release y el ` +
      "glosario lo citan por ese nombre",
  );
  const quienesCitan = [PLANTILLA_PR, SKILL_RELEASE, GLOSARIO].filter((p) => /qu[eé] es breaking/i.test(leer(p)));
  assert.deepEqual(
    quienesCitan,
    [PLANTILLA_PR, SKILL_RELEASE, GLOSARIO],
    "estas superficies repiten la clasificacion y tienen que remitir a la fuente por su nombre, para que quien lea " +
      "la copia sepa donde esta la regla que manda",
  );
});

test("ninguna superficie que dicta la regla vuelve a decir la regla vieja", () => {
  const candidatas = superficies();
  // Cero candidatas seria un recorrido roto, no un arbol limpio.
  assert.ok(candidatas.length > 20, `solo ${candidatas.length} superficies: el recorrido se rompio`);
  assert.ok(candidatas.includes(SKILL_RELEASE) && candidatas.includes(GLOSARIO), "el recorrido perdio la skill o el glosario");

  const duenoActivo = (ruta) => existsSync(join(RAIZ, ruta));
  const encontradas = [];
  for (const rel of candidatas) {
    for (const f of frasesSinDueno(rel, frasesViejas(leer(rel)), duenoActivo)) encontradas.push(`${rel}: "${f}"`);
  }
  assert.deepEqual(
    encontradas,
    [],
    "estas superficies siguen diciendo que endurecer una compuerta es incompatible por si mismo, o atan la pregunta " +
      "a @v1. La regla cambio el 2026-09-17 (decision D1 del PO): una compuerta cuyo arreglo cabe en el repositorio " +
      "del consumidor sale exigible el dia que sale, con el arreglo en «Para consumidores»; solo la que se arregla " +
      `fuera de su repositorio es breaking o se estrena en modo aviso. Arreglo: reescribirlas contra «${TITULO_BREAKING}» ` +
      "de AGENTS.md, que es la fuente",
  );
});

test("MUERDE: una premisa con dueno se exime solo mientras el dueno este activo", () => {
  const premisas = [{ superficie: "s.md", frases: ["frase vieja"], dueno: "openspec/changes/dueno" }];
  assert.deepEqual(frasesSinDueno("s.md", ["frase vieja"], () => true, premisas), [], "con el dueno activo, exenta");
  assert.deepEqual(frasesSinDueno("s.md", ["frase vieja"], () => false, premisas), ["frase vieja"], "archivado el dueno, roja");
  assert.deepEqual(frasesSinDueno("otra.md", ["frase vieja"], () => true, premisas), ["frase vieja"], "la exencion es de UNA superficie");
});

test("toda premisa con dueno esta anotada como tarea ABIERTA en su change", () => {
  // Sin esto la exencion dura lo que el change dueno tarde en archivarse, y el dueno
  // puede no saber que la tiene: la vencida lo haria rojo en el PR de su archive, que
  // es tarde para descubrir un trabajo.
  for (const p of PREMISAS_CON_DUENO) {
    const tareas = join(RAIZ, p.dueno, "tasks.md");
    if (!existsSync(tareas)) continue; // archivado o descartado: el caso de las superficies ya es exigible
    // Cada tarea con sus lineas de continuacion: la ruta puede caer en la segunda.
    const abiertas = readFileSync(tareas, "utf8")
      .split(/\r?\n(?=\s*- \[)/)
      .filter((t) => /^\s*- \[ \]/.test(t));
    assert.ok(
      abiertas.some((t) => t.includes(p.superficie)),
      `${p.dueno}/tasks.md no tiene ninguna tarea abierta que nombre ${p.superficie}, y este banco le exime ahi ` +
        `${JSON.stringify(p.frases)}. Arreglo: anotarle la tarea al dueno, o corregir la frase y sacar la exencion`,
    );
  }
});

// El preambulo del CHANGELOG no se puede reescribir en la rama del porte (los carriles
// no editan CHANGELOG.md y la reescritura viaja como .porte/10-que-es-breaking.patch).
// Mientras ese parche exista, EN EL CARRIL el caso queda `todo`: se ve en cada corrida y
// no pone rojo el banco. Camino a main deja de estar aplazado aunque el archivo siga
// ahi —lo decide `pendienteDelPorte`, y un PR a main con `.porte/` es rojo en
// carril-del-porte.test.mjs—, asi que el aplazamiento no puede sobrevivir a la
// integracion (revision adversarial del porte, FO-H3).
const PARCHE_PENDIENTE = ".porte/10-que-es-breaking.patch";
test(
  "el preambulo del CHANGELOG dice la misma regla",
  { todo: pendienteDelPorte(RAIZ, PARCHE_PENDIENTE) && `pendiente de aplicar ${PARCHE_PENDIENTE} al integrar` },
  () => {
    const texto = preambulo(leer(CHANGELOG));
    assert.deepEqual(
      frasesViejas(texto),
      [],
      "el preambulo del CHANGELOG —lo primero que lee un consumidor en su PR de bump— sigue con la regla vieja. " +
        `Arreglo: aplicar ${PARCHE_PENDIENTE} o reescribirlo contra «${TITULO_BREAKING}» de AGENTS.md`,
    );
    assert.match(texto, /AGENTS\.md/, "el preambulo tiene que remitir a la lista cerrada de AGENTS.md, no copiarla");
  },
);
