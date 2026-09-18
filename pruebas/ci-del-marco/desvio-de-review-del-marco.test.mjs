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
// y nada lo sostiene; aca un banco lo hace cumplir en seis direcciones.
//
// LAS SEIS REGLAS, y cada una se pone roja sola:
//
//   1. Con UN solo dueno en `.github/CODEOWNERS`, `AGENTS.md` tiene que traer el
//      recuadro del desvio, completo: quien lo aprobo y cuando, que revision lo
//      reemplaza y donde queda registrada, la condicion de retiro con el
//      comando que la mide, y lo que NO cambia (la aprobacion del PO sobre
//      `gobierno-contribucion`).
//   2. Con DOS o mas duenos, el recuadro tiene que haberse retirado: un desvio
//      que sobrevive a su condicion de retiro deja de ser una excepcion
//      declarada y pasa a ser la regla por la puerta de atras.
//   3. Mientras el desvio rija, el `aprueba:` / `revisa:` de un change ACTIVO
//      toma uno de los valores de una LISTA CERRADA (VALORES_DEL_DESVIO). Y al
//      reves: retirado el desvio, ninguno sigue nombrandolo. Hasta el
//      2026-09-18 esta regla buscaba nombres PROHIBIDOS con una regex, y la
//      revision adversarial del carril le paso por al lado con cinco formas de
//      escribir lo mismo (`builder-2`, «el otro builder», un valor YAML en
//      bloque, la clave con mayuscula, una linea en blanco antes del `---`).
//      Una lista de lo que vale no tiene esas grietas: todo lo demas es rojo.
//   4. Todo change archivado desde la fecha del desvio lleva su revision
//      adversarial registrada adentro (`revision-adversarial.md`), con al menos
//      dos lentes que dicen que miran y que encontraron, al menos dos de ellas
//      con evidencia verificable (una ruta, un comando o un sha), y un veredicto
//      escrito. Hasta el 2026-09-18 contaba ENCABEZADOS: tres lineas vacias
//      `## Lente` / `## Lente` / `## Veredicto` pasaban, y el propio mensaje de
//      error las dictaba. Una carpeta del archive sin fecha es rojo: sin fecha
//      la regla no sabe si se archivo bajo el desvio, y saltearla en silencio
//      era un fail-open.
//   5. El desvio NO alcanza al PO: todo change activo con un delta de
//      `gobierno-contribucion` lo nombra en el VALOR del `aprueba:` de su
//      proposal, y el valor EMPIEZA con el rol («PO», «PO (...)», «PO y ...»):
//      una mencion negada —«revision adversarial (no el PO)»— no es el PO.
//   6. Y la aprobacion, no solo su declaracion: todo change archivado desde la
//      fecha del desvio que trae un delta de `gobierno-contribucion` lleva en su
//      proposal `aprobado_por_po: AAAA-MM-DD`, una fecha real y no posterior al
//      archive. La regla 5 mira lo que un change ACTIVO dice que va a pasar; sin
//      esta, uno en `pendiente-de-revision` se archivaba igual con el banco y el
//      guardrail de deltas en verde (medido por la revision del carril).
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

/** LA LISTA CERRADA de lo que `aprueba:` / `revisa:` pueden valer mientras rige el
 *  desvio. Todo lo que no este aca es rojo, se escriba como se escriba. «PO (PO)»
 *  es la forma que ya usa `capa-descubrimiento`: el rol con su nombre de rol. */
export const VALORES_DEL_DESVIO = Object.freeze([
  VALOR_APRUEBA,
  "PO",
  "PO (PO)",
  `PO (el delta de gobierno-contribucion) y ${VALOR_APRUEBA}`,
]);

/** Un valor que nombra la revision del desvio: retirado el desvio, es rojo. */
const NOMBRA_EL_DESVIO = /desv[ií]o del marco/i;

/** El PO en el VALOR, y no de costado: el valor EMPIEZA con el rol. */
const EMPIEZA_CON_EL_PO = /^PO(?:$| \(| y )/;

/** Una evidencia que se puede ir a mirar: una ruta o un archivo (con o sin
 *  `:linea`), un comando, o un sha. Entre backticks, que es como la escriben las
 *  revisiones reales; el sha, suelto y con al menos un digito. Un comando que
 *  corre un paquete de npm trae su `@scope/paquete`, y esa barra ya lo hace ruta:
 *  por eso el ejecutor no esta en la lista (y el check de ejecutores del marco lo
 *  leeria como una invocacion sin version). */
const COMANDOS = ["node", "git", "grep", "gh", "sed", "find", "pnpm", "bash", "openspec"];
const EVIDENCIA = new RegExp(
  "`(?:[^`\\n]*(?:/|\\.(?:mjs|js|ts|md|ya?ml|json|tf|sh|cmd)\\b|:\\d+)[^`\\n]*|(?:" +
    COMANDOS.join("|") +
    ")\\b[^`\\n]*)`|\\b(?=[0-9a-f]*\\d)(?=[0-9a-f]*[a-f])[0-9a-f]{7,40}\\b",
);

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

/** La regla 3 sobre UN archivo: los `aprueba:` / `revisa:` que no valen.
 *
 *  Con el desvio vigente (`rige`), vale solo un valor de VALORES_DEL_DESVIO; el
 *  comentario al costado se descarta, como lo descarta cualquier lector de YAML.
 *  Retirado, lo que no vale es seguir nombrando el desvio. Y en los dos casos es
 *  rojo el frontmatter que un lector no ve: una clave con mayuscula o indentada
 *  (`Aprueba:` no es `aprueba:` para nadie que lo parsee) y un `---` que no esta
 *  en la primera linea. Un .md SIN frontmatter no es rojo: los deltas de spec no
 *  lo llevan, y no declarar aprobador no es nombrar a uno que no existe.
 *  `informado:` queda fuera a proposito: estar informado no es una compuerta. */
export function aprobadoresFueraDeRegla(ruta, texto, rige = true) {
  const lineas = texto.replace(/^\uFEFF/, "").split(/\r?\n/);
  const primera = lineas.findIndex((l) => l.trim() !== "");
  if (primera > 0 && lineas[primera].trim() === "---") {
    return [{ ruta, linea: primera + 1, campo: "frontmatter", valor: `empieza en la linea ${primera + 1} y no en la 1, asi que nadie lo lee` }];
  }
  const salida = [];
  for (const { linea, texto: l } of frontmatter(texto) ?? []) {
    const m = l.match(/^(\s*)(aprueba|revisa)\s*:\s*(.*)$/i);
    if (!m) continue;
    const campo = m[2];
    const valor = m[3].replace(/\s+#.*$/, "").trim();
    if (m[1] || campo !== campo.toLowerCase()) {
      salida.push({ ruta, linea, campo, valor: `clave escrita «${m[1]}${campo}:», que un lector de frontmatter no reconoce` });
    } else if (rige ? !VALORES_DEL_DESVIO.includes(valor) : NOMBRA_EL_DESVIO.test(valor)) {
      salida.push({ ruta, linea, campo, valor });
    }
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

/** Las secciones `## ...` de un markdown: encabezado y cuerpo. */
function secciones(texto) {
  return texto
    .split(/^(?=## )/m)
    .filter((s) => s.startsWith("## "))
    .map((s) => {
      const [encabezado, ...cuerpo] = s.split(/\r?\n/);
      return { encabezado, cuerpo: cuerpo.join("\n") };
    });
}

/** Lo que le falta a UNA revision adversarial para serlo. [] si esta bien.
 *
 *  LIMITE DECLARADO: esto decide que hay contenido y que hay evidencia que se
 *  puede ir a mirar, no que la evidencia pruebe lo que la lente dice. Eso no se
 *  decide con un patron, y por eso la exigencia de evidencia es «al menos dos
 *  lentes» y no «cada una»: una lente de contrato puede argumentar en prosa
 *  (medido sobre las seis revisiones reales del 2026-09-17, que tienen entre dos y
 *  cuatro lentes con evidencia cada una). */
export function faltasDeLaRevision(revision) {
  const faltas = [];
  const todas = secciones(revision);
  const lentes = todas.filter((s) => /^## Lente\b/.test(s.encabezado));
  if (lentes.length < 2) faltas.push(`tiene ${lentes.length} lente(s), y una sola mirada es una relectura`);
  for (const [i, lente] of lentes.entries()) {
    const nombre = lente.encabezado.replace(/^## Lente\s*\d*\s*[—:.-]*\s*/, "");
    if (!/\p{L}/u.test(nombre)) faltas.push(`la lente ${i + 1} no dice que mira (su encabezado es «${lente.encabezado.trim()}»)`);
    if (!lente.cuerpo.trim()) faltas.push(`la lente ${i + 1} no dice que encontro: esta vacia`);
  }
  const conEvidencia = lentes.filter((l) => EVIDENCIA.test(l.cuerpo)).length;
  if (lentes.length >= 2 && conEvidencia < 2) {
    faltas.push(`${conEvidencia} lente(s) citan algo que se pueda ir a mirar (una ruta, un comando o un sha), y hacen falta dos`);
  }
  const veredicto = todas.find((s) => /^## Veredicto\b/.test(s.encabezado));
  if (!veredicto) faltas.push("no tiene veredicto");
  else if (!veredicto.cuerpo.trim()) faltas.push("el veredicto esta vacio");
  return faltas;
}

/** La regla 4 sobre una lista de archives: los que se archivaron bajo el desvio
 *  y no traen su revision registrada, o la traen sin contenido. Una carpeta sin
 *  fecha es rojo, no se saltea. */
export function archivesSinRevision(archives, desde) {
  const salida = [];
  for (const { carpeta, revision } of archives) {
    const fecha = carpeta.slice(0, 10);
    if (!esFecha(fecha)) {
      salida.push(
        `${carpeta}: la carpeta del archive no empieza con una fecha AAAA-MM-DD, asi que esta regla no puede saber si se ` +
          `archivo bajo el desvio. Arreglo: renombrarla con la fecha del archive (\`git mv\`), como las demas`,
      );
      continue;
    }
    if (fecha < desde) continue;
    if (revision === null) {
      salida.push(
        `${carpeta}: se archivo el ${fecha}, bajo el desvio que rige desde el ${desde}, y no trae ${ARCHIVO_REVISION}. ` +
          `Con un solo mantenedor esa revision es lo unico que reemplaza a la cruzada. Arreglo: correrla y registrarla ` +
          `en la carpeta del change, con el formato de las del 2026-09-17 (openspec/changes/archive/2026-09-17-*)`,
      );
      continue;
    }
    const faltas = faltasDeLaRevision(revision);
    if (faltas.length) {
      salida.push(
        `${carpeta}/${ARCHIVO_REVISION} no es una revision todavia: ${faltas.join("; ")}. Cada lente es una pregunta ` +
          `distinta hecha al change, con lo que se encontro al hacerla; el veredicto dice si se archiva y por que. ` +
          `Arreglo: correr la revision, no completar el formato`,
      );
    }
  }
  return salida;
}

/** La regla 6 sobre una lista de archives: los que tocan `gobierno-contribucion`,
 *  se archivaron bajo el desvio y no traen la constancia de la aprobacion del PO
 *  en su proposal. La fecha no puede ser posterior al archive: se aprueba antes
 *  de fundir, no despues. */
export function archivesSinAprobacionDelPo(archives, desde) {
  const salida = [];
  for (const { carpeta, tocaGobierno, proposal } of archives) {
    const fecha = carpeta.slice(0, 10);
    if (!tocaGobierno || !esFecha(fecha) || fecha < desde) continue;
    const linea = (frontmatter(proposal ?? "") ?? []).find((l) => /^aprobado_por_po:/.test(l.texto));
    const valor = linea ? linea.texto.replace(/^aprobado_por_po:\s*/, "").replace(/\s+#.*$/, "").trim() : "";
    let problema = null;
    if (!linea) problema = "no trae `aprobado_por_po:` en el frontmatter de su proposal";
    else if (!esFecha(valor)) problema = `su \`aprobado_por_po:\` dice «${valor}», que no es una fecha AAAA-MM-DD`;
    else if (valor > fecha) problema = `su \`aprobado_por_po:\` es del ${valor}, posterior al archive`;
    if (problema) {
      salida.push(
        `${carpeta}: trae un delta de \`gobierno-contribucion\`, se archivo el ${fecha} bajo el desvio y ${problema}. ` +
          `Esa capability la aprueba el PO y el desvio no lo reemplaza: sin la constancia, un change que seguia en ` +
          `\`pendiente-de-revision\` se funde igual. Arreglo: si el PO lo aprobo, que lo deje escrito en el proposal ` +
          `con la fecha en que lo hizo; si no, devolver el change a openspec/changes/ hasta que lo apruebe`,
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
  if (EMPIEZA_CON_EL_PO.test(valor)) return null;
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

/** Los archives del arbol, con su revision si la tienen, si tocan
 *  `gobierno-contribucion` y su proposal. */
function archivesDelArbol() {
  const base = path.join(RAIZ, "openspec/changes/archive");
  const leerSiExiste = (abs) => (fs.existsSync(abs) ? fs.readFileSync(abs, "utf8") : null);
  return fs
    .readdirSync(base, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => ({
      carpeta: e.name,
      revision: leerSiExiste(path.join(base, e.name, ARCHIVO_REVISION)),
      tocaGobierno: fs.existsSync(path.join(base, e.name, "specs", "gobierno-contribucion")),
      proposal: leerSiExiste(path.join(base, e.name, "proposal.md")),
    }));
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

test("desvio · el `aprueba:` de cada change activo vale lo que el desvio admite, y retirado, deja de nombrarlo", () => {
  const rige = bloqueDelDesvio(AGENTS()) !== null;
  const hallazgos = artefactosActivos().flatMap((r) => aprobadoresFueraDeRegla(r, leer(r), rige));
  assert.deepEqual(
    hallazgos.map((h) => `${h.ruta}:${h.linea} ${h.campo}: ${h.valor}`),
    [],
    rige
      ? "mientras rige el desvio, estas lineas nombran como aprobador algo que no es un valor de la lista cerrada, o " +
          "estan escritas donde ningun lector de frontmatter las ve. Un aprobador que no existe deja un change " +
          "esperando una revision imposible. Arreglo: la clave en minuscula y al margen, dentro de un frontmatter que " +
          "empieza en la linea 1, y el valor uno de estos —los comentarios que acotan el gate del PO se conservan " +
          `al costado—: ${VALORES_DEL_DESVIO.map((v) => `«${v}»`).join(", ")}`
      : "el recuadro del desvio se retiro de AGENTS.md y estas lineas siguen nombrando la revision del desvio como " +
          "aprobador: ya hay un segundo builder, y el change dice que no hace falta. Arreglo: devolverlas al rol que " +
          "aprueba ese artefacto (el builder par, o el PO en lo que toca `gobierno-contribucion`)",
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

test("desvio · todo change de gobierno-contribucion archivado bajo el desvio trae la constancia del PO", () => {
  const bloque = bloqueDelDesvio(AGENTS());
  if (!bloque) return;
  const mal = archivesSinAprobacionDelPo(archivesDelArbol(), fechaDelDesvio(bloque));
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
  const h = aprobadoresFueraDeRegla("x/proposal.md", texto);
  assert.deepEqual(h.map((x) => `${x.linea} ${x.campo}`), ["4 aprueba"]);
  assert.deepEqual(aprobadoresFueraDeRegla("x/design.md", "---\nrevisa: el builder que no lo escribió\n---\n").length, 1);
  assert.deepEqual(aprobadoresFueraDeRegla("x/tasks.md", `---\naprueba: ${VALOR_APRUEBA}\n---\n`), []);
  assert.deepEqual(aprobadoresFueraDeRegla("x/proposal.md", "---\naprueba: PO  # gobierno-contribucion\n---\n"), []);
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
  const buena =
    "# Revision\n\n## Lente 1 — contrato\n\nel ADDED no existe en `openspec/specs/x/spec.md`\n\n" +
    "## Lente 2 — mordida\n\n`node --test pruebas/x.test.mjs` → 1 rojo al mutar\n\n## Veredicto\n\narchivable\n";
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

// ---------------------------------------------------------------------------
// LAS EVASIONES QUE ENCONTRO LA REVISION ADVERSARIAL DEL CARRIL (2026-09-18).
// ---------------------------------------------------------------------------

test("MUERDE · un aprobador fuera de la lista cerrada se caza en cualquiera de sus formas", () => {
  const evasiones = {
    "valor YAML en bloque": "---\naprueba: >-\n  Builder 2 (builder par)\n---\n",
    "el rol con guion": "---\naprueba: builder-2\n---\n",
    "el otro builder": "---\nrevisa: el otro builder\n---\n",
    "la clave con mayuscula": "---\nAprueba: Builder 2 (builder par)\n---\n",
    "la clave indentada": "---\n  aprueba: Builder 2 (builder par)\n---\n",
    "una linea en blanco antes del ---": "\n---\naprueba: Builder 2 (builder par)\n---\n",
  };
  for (const [forma, texto] of Object.entries(evasiones)) {
    assert.equal(aprobadoresFueraDeRegla("x/proposal.md", texto, true).length, 1, `«${forma}» tenia que cazarse`);
  }
  // CONTRAPESO: los valores reales, con su comentario al costado y sus lineas de
  // comentario de continuacion, e `informado:`, NO se cazan.
  const validos = [
    `---\naprueba: ${VALOR_APRUEBA}  # NO el \`dri\`: hasta el 2026-08-24\n---\n`,
    "---\naprueba: PO  # toca `gobierno-contribucion` (quien aprueba que),\n             # que es el gate del PO\ninformado: PO / Builder 2\n---\n",
    "---\naprueba: PO (PO)          # es su modelo operativo\n---\n",
    `---\naprueba: PO (el delta de gobierno-contribucion) y ${VALOR_APRUEBA}\n---\n`,
    `---\nrevisa: ${VALOR_APRUEBA}\n---\n`,
    "# sin frontmatter: un delta de spec no lo lleva\n\nBuilder 2 en el cuerpo\n",
  ];
  for (const texto of validos) assert.deepEqual(aprobadoresFueraDeRegla("x/proposal.md", texto, true), [], texto);
});

test("MUERDE · retirado el desvio, un `aprueba:` que sigue nombrandolo se caza; el builder par no", () => {
  assert.equal(aprobadoresFueraDeRegla("x/tasks.md", `---\naprueba: ${VALOR_APRUEBA}\n---\n`, false).length, 1);
  assert.deepEqual(aprobadoresFueraDeRegla("x/tasks.md", "---\naprueba: Builder 2 (builder par)\n---\n", false), []);
});

test("MUERDE · el PO nombrado de costado, o negado, no es el PO en el valor", () => {
  for (const valor of ["revision adversarial (no el PO)", "Builder 1 (PO: no aplica)", "sin PO"]) {
    assert.notEqual(gateDelPoAusente("x", true, `---\naprueba: ${valor}\n---\n`), null, `«${valor}» tenia que cazarse`);
  }
  for (const valor of ["PO", "PO (PO)", "PO  # comentario", `PO (el delta de gobierno-contribucion) y ${VALOR_APRUEBA}`]) {
    assert.equal(gateDelPoAusente("x", true, `---\naprueba: ${valor}\n---\n`), null, `«${valor}» no tenia que cazarse`);
  }
});

test("MUERDE · una revision con los encabezados y sin contenido se caza, y la carpeta sin fecha tambien", () => {
  const cascaras = {
    "solo encabezados": "## Lente\n## Lente\n## Veredicto\n",
    "lentes sin cuerpo": "## Lente 1 — contrato\n\n## Lente 2 — evidencia\n\n## Veredicto\n\narchivable\n",
    "lentes sin evidencia": "## Lente 1 — contrato\n\nbien\n\n## Lente 2 — evidencia\n\nbien\n\n## Veredicto\n\narchivable\n",
    "veredicto vacio":
      "## Lente 1 — contrato\n\n`openspec/specs/x/spec.md:3`\n\n## Lente 2 — mordida\n\n`node --test x.test.mjs` → rojo\n\n## Veredicto\n",
  };
  for (const [caso, revision] of Object.entries(cascaras)) {
    assert.equal(archivesSinRevision([{ carpeta: "2026-09-20-x", revision }], "2026-09-17").length, 1, `«${caso}» tenia que cazarse`);
  }
  assert.equal(archivesSinRevision([{ carpeta: "sin-fecha-x", revision: null }], "2026-09-17").length, 1, "la carpeta sin fecha no se saltea");
});

test("MUERDE · un change de gobierno-contribucion archivado sin la constancia del PO se caza", () => {
  const conFecha = (f) => `---\nartefacto: proposal\naprueba: PO\naprobado_por_po: ${f}\n---\n`;
  const mal = archivesSinAprobacionDelPo(
    [
      { carpeta: "2026-09-18-sin-constancia", tocaGobierno: true, proposal: "---\naprueba: PO\n---\n" },
      { carpeta: "2026-09-18-fecha-rota", tocaGobierno: true, proposal: conFecha("pronto") },
      { carpeta: "2026-09-18-aprobado-despues", tocaGobierno: true, proposal: conFecha("2026-09-19") },
      { carpeta: "2026-09-18-bien", tocaGobierno: true, proposal: conFecha("2026-09-18") },
      { carpeta: "2026-09-18-tecnico", tocaGobierno: false, proposal: "---\naprueba: x\n---\n" },
      { carpeta: "2026-08-19-anterior", tocaGobierno: true, proposal: null },
    ],
    "2026-09-17",
  );
  assert.equal(mal.length, 3, mal.join("\n"));
  assert.match(mal[0], /^2026-09-18-sin-constancia/);
  assert.match(mal[1], /^2026-09-18-fecha-rota/);
  assert.match(mal[2], /^2026-09-18-aprobado-despues/);
});
