// EL MARCO DECLARA EL DESVIO DE LA REVISION QUE NO PUEDE CUMPLIR, Y LO SOSTIENE.
//
// EL DEFECTO QUE ESTE BANCO CIERRA, medido el 2026-09-17. `AGENTS.md` pide, en
// los puntos 1, 2, 3 y 5 de su flujo, que cada artefacto «lo escribe un builder;
// lo revisa el otro» y que cada PR tenga «review cruzado entre builders». Y en
// este repositorio hay UNA sola identidad con permiso de escritura:
//
//   gh api "repos/{owner}/{repo}/collaborators" --jq '.[] | "\(.login): \(.role_name)"'
//   ->  un solo login, con rol admin
//
// y `.github/CODEOWNERS` termina en un unico handle. O sea que la revision
// cruzada no estaba debilitada: no existia. Lo que si existia era su rastro
// falso — 58 lineas `aprueba: Builder 2 (builder par)` o `revisa: ...` en 58
// artefactos de 22 changes activos, nombrando como aprobador a alguien que no
// esta —, y el efecto medible de esa ficcion: once changes con todas sus
// casillas tildadas esperando en `pendiente-de-revision` una revision que no
// tenia de donde salir.
//
// El origen es Rigel (1.10.0, commit e48860d): declaro el mismo desvio en su
// AGENTS.md y corrigio el campo `aprueba` de 29 artefactos. Aca se porta con una
// diferencia que es el motivo de este archivo: en Rigel el desvio quedo escrito
// y nada lo sostiene; aca un banco lo hace cumplir en cinco direcciones.
//
// LAS CINCO REGLAS, y cada una se pone roja sola:
//
//   1. Con UN solo dueno en `.github/CODEOWNERS`, `AGENTS.md` tiene que traer el
//      recuadro del desvio, completo: quien lo aprobo y cuando, que revision lo
//      reemplaza y donde queda registrada, la condicion de retiro con el
//      comando que la mide, y lo que NO cambia (la aprobacion del PO sobre
//      `gobierno-contribucion`).
//   2. Con DOS o mas duenos, el recuadro tiene que haberse retirado: un desvio
//      que sobrevive a su condicion de retiro deja de ser una excepcion
//      declarada y pasa a ser la regla por la puerta de atras.
//   3. Mientras el desvio rija, ningun artefacto de un change ACTIVO nombra como
//      aprobador o revisor al builder par que el desvio declara inexistente.
//   4. Todo change archivado desde la fecha del desvio lleva su revision
//      adversarial registrada adentro (`revision-adversarial.md`), con al menos
//      dos lentes y un veredicto. «La revision cruzada se reemplaza por una
//      revision adversarial registrada en el change» sin esta regla seria una
//      promesa, y este marco no cuenta las promesas como guardrail.
//   5. El desvio NO alcanza al PO: todo change activo con un delta de
//      `gobierno-contribucion` lo nombra en el VALOR del `aprueba:` de su
//      proposal. Medido al escribir esta regla: `reglas-al-dia` lo decia solo en
//      un comentario al costado, que ningun lector de frontmatter ve.
//
// POR QUE EL DESVIO VIVE EN AGENTS.md Y NO EN `.projects-desvios.json`, medido y
// no supuesto. La sonda `es_distribuidor` de `marco-ci.yml` NO lee ese archivo
// —mira `plantilla/.github/workflows/ci.yml`, `actions/constitucion/action.yml`
// y `.projects-valores.json`—, asi que agregarlo no la altera. Pero la ruta de la
// raiz esta TOMADA: `.gitignore` la ignora a proposito, porque los tres
// lanzadores corren el asistente parados en el clon y el asistente escribe ahi
// el `.projects-desvios.json` DEL PROYECTO que se esta armando. Un archivo del
// marco en esa ruta lo pisaria el primer doble clic. Y el marco no renderiza su
// propia porcion de la constitucion, asi que el agente de esta sesion carga
// AGENTS.md directo: es el unico lugar donde el desvio le llega sin buscarlo.
//
// LO QUE ESTE BANCO NO PUEDE, dicho de frente: la condicion de retiro de verdad
// es «un segundo handle con permiso de ESCRITURA», y el permiso vive en la API
// de GitHub, que este banco no consulta (corre sin red). Lee el proxy que si
// esta en el arbol —los duenos de CODEOWNERS—, que es justo lo que alguien edita
// el dia que entra un segundo builder, porque es lo que hace que GitHub le pida
// la revision. El recuadro deja escrito el comando que mide el permiso real.
//
// TODO LO QUE JUZGA ES PURO SOBRE TEXTO: cada refutacion de abajo le pasa a LA
// MISMA funcion que corre la regla una copia mutada en memoria.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const leer = (rel) => fs.readFileSync(path.join(RAIZ, rel), "utf8");

/** El id de la regla del canonico que el desvio anula. Es el mismo id que el
 *  asistente usa para el desvio de un proyecto de una sola persona, a proposito:
 *  es la misma regla y el mismo motivo. */
export const REGLA = "github-review-cruzado-automatizado";

/** El valor que toma `aprueba:` / `revisa:` mientras rige el desvio. */
export const VALOR_APRUEBA = "revision adversarial (desvio del marco: un solo mantenedor, ver AGENTS.md)";

/** Donde queda registrada la revision que reemplaza a la cruzada. */
export const ARCHIVO_REVISION = "revision-adversarial.md";

/** Un aprobador que, mientras rige el desvio, no existe. */
const APROBADOR_QUE_NO_EXISTE = /builder\s+par|builder\s*2\b|builder que no lo escribi/i;

// ---------------------------------------------------------------------------
// LOS LECTORES
// ---------------------------------------------------------------------------

/** Los duenos distintos que nombra un CODEOWNERS: todo lo que sigue al patron en
 *  una regla, sin comentarios. Se normaliza a minusculas porque GitHub resuelve
 *  los handles sin distinguir mayusculas: `@Ana` y `@ana` son una persona. */
export function duenosDe(texto) {
  const duenos = new Set();
  for (const cruda of texto.split(/\r?\n/)) {
    const limpia = cruda.replace(/\s+#.*$/, "").trim();
    if (!limpia || limpia.startsWith("#")) continue;
    for (const d of limpia.split(/\s+/).slice(1)) duenos.add(d.toLowerCase());
  }
  return duenos;
}

/** El recuadro del desvio en AGENTS.md: la linea de cita que lo abre y las que
 *  le siguen mientras sigan siendo cita. `null` si no esta. */
export function bloqueDelDesvio(texto) {
  const lineas = texto.split(/\r?\n/);
  const i = lineas.findIndex((l) => /^>/.test(l) && /DESV[IÍ]O DECLARADO/.test(l) && l.includes(`\`${REGLA}\``));
  if (i < 0) return null;
  const cuerpo = [];
  for (let j = i; j < lineas.length && /^>/.test(lineas[j]); j++) cuerpo.push(lineas[j].replace(/^>\s?/, ""));
  return { linea: i + 1, texto: cuerpo.join("\n") };
}

/** Una fecha AAAA-MM-DD que ademas existe (no solo con la forma). */
const esFecha = (s) =>
  /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s)) && new Date(s).toISOString().slice(0, 10) === s;

/** La fecha desde la que rige el desvio, leida del propio recuadro. */
export function fechaDelDesvio(bloque) {
  const m = bloque?.texto.match(/\b(\d{4}-\d{2}-\d{2})\b/);
  return m && esFecha(m[1]) ? m[1] : null;
}

/** Lo que el recuadro tiene que decir, cada pieza con el motivo que se imprime
 *  si falta. Un desvio sin una de estas cinco cosas es una excepcion a medias:
 *  sin aprobador ni fecha no se sabe quien la decidio; sin reemplazo, el
 *  desvio apaga la revision y no pone nada en su lugar; sin condicion de retiro
 *  medible es permanente por defecto; y sin «lo que no cambia», el desvio se
 *  lee como si tambien apagara la aprobacion del PO. */
export const PIEZAS_DEL_DESVIO = [
  { que: "quien lo aprobo", re: /aprobado por (el PO|@[\w-]+)/i },
  { que: "la fecha en que rige (AAAA-MM-DD)", prueba: (t) => fechaDelDesvio({ texto: t }) !== null },
  { que: "la revision que reemplaza a la cruzada", re: /revisi[oó]n adversarial/i },
  { que: `donde queda registrada esa revision (\`${ARCHIVO_REVISION}\`)`, re: new RegExp(ARCHIVO_REVISION.replace(".", "\\.")) },
  { que: "la condicion de retiro", re: /se retira/i },
  { que: "el comando que mide la condicion de retiro", re: /gh api [^\n]*collaborators/ },
  { que: "lo que NO cambia, con la aprobacion del PO sobre `gobierno-contribucion`", re: /no\*{0,2} cambia[\s\S]*gobierno-contribucion/i },
];

/** Lo que le falta a un recuadro. */
export function faltasDelDesvio(bloque) {
  return PIEZAS_DEL_DESVIO.filter((p) => (p.re ? !p.re.test(bloque.texto) : !p.prueba(bloque.texto))).map((p) => p.que);
}

/** Las reglas 1 y 2: el desvio existe cuando tiene que existir, completo, y se
 *  retira cuando se cumple su condicion. */
export function problemasDelDesvio({ codeowners, agents }) {
  const duenos = duenosDe(codeowners);
  const bloque = bloqueDelDesvio(agents);
  const problemas = [];
  if (duenos.size < 2 && !bloque) {
    problemas.push(
      `.github/CODEOWNERS nombra ${duenos.size} dueno(s) [${[...duenos].join(", ")}] y AGENTS.md exige revision cruzada ` +
        `sin declarar el desvio. Con un solo dueno GitHub no le pide la revision a nadie (pide a los duenos EXCEPTO al autor), ` +
        `asi que la regla esta escrita y no ocurre. Arreglo: agrega en AGENTS.md, pegado al flujo, el recuadro ` +
        `«> ⚠️ **DESVÍO DECLARADO — \`${REGLA}\`**» con quien lo aprobo y cuando, la revision adversarial que lo ` +
        `reemplaza y donde se registra (\`${ARCHIVO_REVISION}\`), la condicion de retiro con su comando, y lo que NO cambia`,
    );
  }
  if (duenos.size >= 2 && bloque) {
    problemas.push(
      `.github/CODEOWNERS ya nombra ${duenos.size} duenos distintos [${[...duenos].join(", ")}] y AGENTS.md:${bloque.linea} ` +
        `sigue declarando el desvio de \`${REGLA}\`. Esa es su condicion de retiro: con un segundo dueno GitHub vuelve a ` +
        `pedir la revision cruzada, y un desvio que sobrevive a su condicion es la regla apagada por la puerta de atras. ` +
        `Arreglo: confirma que el segundo handle tiene permiso de escritura (gh api "repos/{owner}/{repo}/collaborators"), ` +
        `borra el recuadro de AGENTS.md y devuelve el \`aprueba:\` de los changes activos a «Builder 2 (builder par)»`,
    );
  }
  if (bloque) {
    const faltas = faltasDelDesvio(bloque);
    if (faltas.length) {
      problemas.push(
        `el recuadro del desvio en AGENTS.md:${bloque.linea} no dice: ${faltas.join("; ")}. Un desvio a medias es una ` +
          `excepcion que nadie puede auditar. Arreglo: completalo en el mismo recuadro`,
      );
    }
  }
  return problemas;
}

/** Las lineas de frontmatter de un markdown, con su numero de linea real. */
export function frontmatter(texto) {
  const lineas = texto.split(/\r?\n/);
  if (lineas[0]?.trim() !== "---") return null;
  const fin = lineas.findIndex((l, k) => k > 0 && l.trim() === "---");
  if (fin < 0) return null;
  return lineas.slice(1, fin).map((l, k) => ({ linea: k + 2, texto: l }));
}

/** La regla 3 sobre UN archivo: los `aprueba:` / `revisa:` que nombran al builder
 *  par. `informado:` queda fuera a proposito: estar informado no es una
 *  compuerta, y que el rol exista como destinatario no es una afirmacion falsa. */
export function aprobadoresQueNoExisten(ruta, texto) {
  const salida = [];
  for (const { linea, texto: l } of frontmatter(texto) ?? []) {
    const m = l.match(/^(aprueba|revisa):\s*(.*)$/);
    if (!m) continue;
    const valor = m[2].replace(/\s+#.*$/, "").trim();
    if (APROBADOR_QUE_NO_EXISTE.test(valor)) salida.push({ ruta, linea, campo: m[1], valor });
  }
  return salida;
}

/** Los markdown de los changes ACTIVOS, a cualquier profundidad. El archive
 *  queda fuera: es el registro de lo que se aprobo en su momento, y reescribirlo
 *  seria falsificar la historia. */
export function artefactosActivos() {
  const base = path.join(RAIZ, "openspec/changes");
  const salida = [];
  const recorrer = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const abs = path.join(dir, e.name);
      if (e.isDirectory()) recorrer(abs);
      else if (e.name.endsWith(".md")) salida.push(path.relative(RAIZ, abs).split(path.sep).join("/"));
    }
  };
  for (const e of fs.readdirSync(base, { withFileTypes: true })) {
    if (e.isDirectory() && e.name !== "archive") recorrer(path.join(base, e.name));
  }
  return salida.sort();
}

/** La regla 4 sobre una lista de archives: los que se archivaron bajo el desvio
 *  y no traen su revision registrada, o la traen sin lentes o sin veredicto. */
export function archivesSinRevision(archives, desde) {
  const salida = [];
  for (const { carpeta, revision } of archives) {
    const fecha = carpeta.slice(0, 10);
    if (!esFecha(fecha) || fecha < desde) continue;
    if (revision === null) {
      salida.push(
        `${carpeta}: se archivo el ${fecha}, bajo el desvio que rige desde el ${desde}, y no trae ${ARCHIVO_REVISION}. ` +
          `Con un solo mantenedor esa revision es lo unico que reemplaza a la cruzada. Arreglo: escribila en la carpeta ` +
          `del change —al menos dos lentes (\`## Lente ...\`), cada una con su pregunta y su evidencia, y un \`## Veredicto\`—`,
      );
      continue;
    }
    const lentes = (revision.match(/^## Lente\b/gm) ?? []).length;
    if (lentes < 2 || !/^## Veredicto\b/m.test(revision)) {
      salida.push(
        `${carpeta}/${ARCHIVO_REVISION} tiene ${lentes} lente(s) y ${/^## Veredicto\b/m.test(revision) ? "" : "NO "}` +
          `tiene veredicto. Una sola mirada no es una revision adversarial: es una relectura. Arreglo: al menos dos ` +
          `\`## Lente ...\` y un \`## Veredicto\``,
      );
    }
  }
  return salida;
}

/** La regla 5 sobre UN change activo: si trae un delta de
 *  `gobierno-contribucion`, el `aprueba:` de su proposal nombra al PO. Se mira el
 *  VALOR y no el comentario: un «# y el PO el delta» al costado no es una
 *  aprobacion declarada, es una nota que el lector de frontmatter no ve. */
export function gateDelPoAusente(change, tocaGobierno, proposal) {
  if (!tocaGobierno) return null;
  const linea = (frontmatter(proposal ?? "") ?? []).find((l) => /^aprueba:/.test(l.texto));
  const valor = linea ? linea.texto.replace(/^aprueba:\s*/, "").replace(/\s+#.*$/, "").trim() : "";
  if (/\bPO\b/.test(valor)) return null;
  return (
    `openspec/changes/${change}/proposal.md${linea ? `:${linea.linea}` : ""} trae un delta de \`gobierno-contribucion\` ` +
    `y su \`aprueba:\` ${linea ? `dice «${valor}»` : "no existe"}. Esa capability la aprueba el PO, y el desvio de la ` +
    `revision cruzada NO la alcanza: ninguna revision adversarial la da por el. Arreglo: \`aprueba: PO\` en el valor ` +
    `—si el change tiene ademas deltas tecnicos, «PO (el delta de gobierno-contribucion) y ${VALOR_APRUEBA}»—`
  );
}

/** Los changes activos que traen un delta de `gobierno-contribucion`. */
function changesActivos() {
  const base = path.join(RAIZ, "openspec/changes");
  return fs
    .readdirSync(base, { withFileTypes: true })
    .filter((e) => e.isDirectory() && e.name !== "archive")
    .map((e) => {
      const dir = path.join(base, e.name);
      const prop = path.join(dir, "proposal.md");
      return {
        change: e.name,
        tocaGobierno: fs.existsSync(path.join(dir, "specs", "gobierno-contribucion", "spec.md")),
        proposal: fs.existsSync(prop) ? fs.readFileSync(prop, "utf8") : null,
      };
    });
}

/** Los archives del arbol, con su revision si la tienen. */
function archivesDelArbol() {
  const base = path.join(RAIZ, "openspec/changes/archive");
  return fs
    .readdirSync(base, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => {
      const rev = path.join(base, e.name, ARCHIVO_REVISION);
      return { carpeta: e.name, revision: fs.existsSync(rev) ? fs.readFileSync(rev, "utf8") : null };
    });
}

const CODEOWNERS = () => leer(".github/CODEOWNERS");
const AGENTS = () => leer("AGENTS.md");

// ---------------------------------------------------------------------------
// LAS GUARDAS DEL PROPIO BANCO: sin esto, todo lo de abajo pasa vacio.
// ---------------------------------------------------------------------------

test("desvio · los lectores leen algo: un cero aca es este banco roto, no un repo sin reglas", () => {
  assert.ok(duenosDe(CODEOWNERS()).size >= 1, "no se leyo ningun dueno de .github/CODEOWNERS: el lector esta roto");
  const conCampo = artefactosActivos().filter((r) => (frontmatter(leer(r)) ?? []).some((l) => /^(aprueba|revisa):/.test(l.texto)));
  assert.ok(
    conCampo.length >= 1,
    "no se leyo ningun `aprueba:` ni `revisa:` en los changes activos. Si de verdad no queda ningun change activo, esta " +
      "regla dejo de vigilar el caso que la motivo y hay que decidir que la reemplaza; lo que no vale es pasar sin mirar",
  );
});

// ---------------------------------------------------------------------------
// LAS REGLAS
// ---------------------------------------------------------------------------

test("desvio · con un solo dueno el desvio esta declarado y completo; con dos, retirado", () => {
  const problemas = problemasDelDesvio({ codeowners: CODEOWNERS(), agents: AGENTS() });
  assert.deepEqual(problemas, [], problemas.join("\n"));
});

test("desvio · ningun change activo nombra como aprobador al builder par que el desvio declara inexistente", () => {
  if (!bloqueDelDesvio(AGENTS())) return; // retirado: el builder par existe y nombrarlo es correcto
  const hallazgos = artefactosActivos().flatMap((r) => aprobadoresQueNoExisten(r, leer(r)));
  assert.deepEqual(
    hallazgos.map((h) => `${h.ruta}:${h.linea} ${h.campo}: ${h.valor}`),
    [],
    "estas lineas nombran como aprobador a alguien que en este repositorio no existe, y un change que espera una " +
      "revision imposible no se cierra nunca. Arreglo: reemplaza el valor por " +
      `«${VALOR_APRUEBA}», o por «PO» si el artefacto es el proposal o el spec de un change que toca ` +
      "`gobierno-contribucion` (esa aprobacion el desvio no la toca). Los comentarios que acotan el gate del PO se " +
      "conservan",
  );
});

test("desvio · el desvio no alcanza al PO: todo change con delta de gobierno-contribucion lo nombra en `aprueba:`", () => {
  const mal = changesActivos()
    .map((c) => gateDelPoAusente(c.change, c.tocaGobierno, c.proposal))
    .filter(Boolean);
  assert.ok(
    changesActivos().some((c) => c.tocaGobierno),
    "no se encontro ningun change activo con delta de gobierno-contribucion: si de verdad no queda ninguno, esta " +
      "regla dejo de mirar; si queda, el lector de carpetas esta roto",
  );
  assert.deepEqual(mal, [], mal.join("\n"));
});

test("desvio · todo change archivado bajo el desvio trae su revision adversarial registrada", () => {
  const bloque = bloqueDelDesvio(AGENTS());
  if (!bloque) return;
  const desde = fechaDelDesvio(bloque);
  assert.ok(desde, "el recuadro del desvio no tiene fecha legible, y sin ella esta regla no sabe desde cuando mirar");
  const mal = archivesSinRevision(archivesDelArbol(), desde);
  assert.deepEqual(mal, [], mal.join("\n"));
});

// ---------------------------------------------------------------------------
// LAS REFUTACIONES. Cada una corre LA MISMA funcion que la regla.
// ---------------------------------------------------------------------------

const UN_DUENO = "*  @alguien\n/openspec/specs/gobierno-contribucion/  @alguien\n";
const DOS_DUENOS = "*  @alguien @otra\n";
const RECUADRO =
  "> ⚠️ **DESVÍO DECLARADO — `github-review-cruzado-automatizado`.** Rige desde el 2026-09-17,\n" +
  "> aprobado por el PO. Lo reemplaza una revisión adversarial registrada en `revision-adversarial.md`.\n" +
  "> Se retira cuando haya un segundo handle con escritura: gh api \"repos/{owner}/{repo}/collaborators\".\n" +
  "> Lo que **no** cambia: la aprobación del PO sobre `gobierno-contribucion`.\n";

test("MUERDE · un solo dueno y AGENTS.md sin el recuadro se caza", () => {
  const p = problemasDelDesvio({ codeowners: UN_DUENO, agents: "# AGENTS\n\nlo revisa el otro\n" });
  assert.equal(p.length, 1, p.join("\n"));
  assert.match(p[0], /sin declarar el desvio/);
  assert.match(p[0], /Arreglo:/, "el mensaje tiene que traer el arreglo escrito adentro");
});

test("MUERDE · el mismo dueno escrito dos veces sigue siendo UN dueno", () => {
  // Sin la normalizacion, `@Alguien` y `@alguien` contarian como dos y el
  // banco declararia cumplida la condicion de retiro sin que entrara nadie.
  const p = problemasDelDesvio({ codeowners: "* @Alguien\n/docs/ @alguien\n", agents: "sin recuadro\n" });
  assert.equal(p.length, 1, p.join("\n"));
});

test("MUERDE · un segundo dueno con el recuadro todavia puesto se caza: el desvio no sobrevive a su condicion", () => {
  const p = problemasDelDesvio({ codeowners: DOS_DUENOS, agents: RECUADRO });
  assert.equal(p.length, 1, p.join("\n"));
  assert.match(p[0], /condicion de retiro/);
});

test("MUERDE · el recuadro completo con un solo dueno pasa, y a cada pieza que se le saca se caza", () => {
  assert.deepEqual(problemasDelDesvio({ codeowners: UN_DUENO, agents: RECUADRO }), []);
  const mutaciones = {
    "quien lo aprobo": RECUADRO.replace("aprobado por el PO", "decidido"),
    "la fecha en que rige (AAAA-MM-DD)": RECUADRO.replace("2026-09-17", "hoy"),
    "la condicion de retiro": RECUADRO.replace("Se retira", "Termina"),
    "el comando que mide la condicion de retiro": RECUADRO.replace(/gh api [^\n]*collaborators"?/, "mirando GitHub"),
    "lo que NO cambia": RECUADRO.replace("Lo que **no** cambia", "Queda igual"),
  };
  for (const [pieza, texto] of Object.entries(mutaciones)) {
    const p = problemasDelDesvio({ codeowners: UN_DUENO, agents: texto });
    assert.equal(p.length, 1, `sacarle «${pieza}» al recuadro tenia que ponerlo rojo:\n${p.join("\n")}`);
    assert.ok(p[0].includes(pieza.split(" (")[0]), `el mensaje tiene que nombrar la pieza que falta («${pieza}»):\n${p[0]}`);
  }
});

test("MUERDE · el frontmatter que nombra al builder par se caza; `informado:` y el valor del desvio no", () => {
  const texto = [
    "---",
    "artefacto: proposal",
    "dri: Builder 1",
    "aprueba: Builder 2 (builder par)  # NO el PO",
    "informado: PO / Builder 2",
    "estado: pendiente-de-revision",
    "---",
    "",
    "# Cuerpo que dice Builder 2 y no es frontmatter",
  ].join("\n");
  const h = aprobadoresQueNoExisten("x/proposal.md", texto);
  assert.deepEqual(h.map((x) => `${x.linea} ${x.campo}`), ["4 aprueba"]);
  assert.deepEqual(aprobadoresQueNoExisten("x/design.md", "---\nrevisa: el builder que no lo escribió\n---\n").length, 1);
  assert.deepEqual(aprobadoresQueNoExisten("x/tasks.md", `---\naprueba: ${VALOR_APRUEBA}\n---\n`), []);
  assert.deepEqual(aprobadoresQueNoExisten("x/proposal.md", "---\naprueba: PO  # gobierno-contribucion\n---\n"), []);
});

test("MUERDE · un change de gobierno-contribucion sin el PO en el VALOR de `aprueba:` se caza", () => {
  const conComentario = `---\naprueba: ${VALOR_APRUEBA}  # y PO el delta\n---\n`;
  assert.match(gateDelPoAusente("x", true, conComentario) ?? "", /Arreglo:/, "el PO en el comentario no es una aprobacion");
  assert.match(gateDelPoAusente("x", true, "# sin frontmatter\n") ?? "", /no existe/);
  assert.equal(gateDelPoAusente("x", true, "---\naprueba: PO  # gobierno\n---\n"), null);
  assert.equal(gateDelPoAusente("x", true, `---\naprueba: PO (el delta de gobierno-contribucion) y ${VALOR_APRUEBA}\n---\n`), null);
  assert.equal(gateDelPoAusente("x", false, conComentario), null, "sin delta de gobierno la regla no aplica");
  // «POR» o «POLITICA» no son el rol: la palabra se mira entera.
  assert.notEqual(gateDelPoAusente("x", true, "---\naprueba: POLITICA del area\n---\n"), null);
});

test("MUERDE · un archive bajo el desvio sin revision, o con una sola lente, se caza; uno anterior no", () => {
  const buena = "# Revision\n\n## Lente 1 — contrato\n\nx\n\n## Lente 2 — evidencia\n\ny\n\n## Veredicto\n\narchivable\n";
  const mal = archivesSinRevision(
    [
      { carpeta: "2026-08-19-viejo", revision: null },
      { carpeta: "2026-09-17-sin-revision", revision: null },
      { carpeta: "2026-09-18-una-lente", revision: "## Lente 1\n\n## Veredicto\n" },
      { carpeta: "2026-09-18-sin-veredicto", revision: "## Lente 1\n\n## Lente 2\n" },
      { carpeta: "2026-09-20-bien", revision: buena },
    ],
    "2026-09-17",
  );
  assert.equal(mal.length, 3, mal.join("\n"));
  assert.match(mal[0], /^2026-09-17-sin-revision: /);
  assert.match(mal[1], /^2026-09-18-una-lente\//);
  assert.match(mal[2], /^2026-09-18-sin-veredicto\//);
});
