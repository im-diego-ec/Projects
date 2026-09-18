// LA PAGINA QUE MIDE LAS COMPUERTAS NO TENIA NINGUNA, Y SE LE NOTO.
//
// EL DEFECTO QUE ESTE BANCO CIERRA, medido el 2026-08-31 sobre
// `openspec/cobertura-de-requirements.md`. Esa pagina contesta la unica pregunta
// que importa del contrato del marco —«¿esto se cumple porque alguien se
// acuerda, o porque hay una compuerta?»— y hasta hoy NADA la miraba. Se midio lo
// que eso costo, dos veces y de dos maneras distintas:
//
//   (a) POR DESACTUALIZACION. El andamio empezo a repartir un despliegue y tres
//       filas siguieron una semana diciendo `ninguno` sobre compuertas que ya
//       existian. Ningun rojo. Un `ninguno` de mas nunca rompe nada: solo hace
//       tomar decisiones con un mapa equivocado.
//
//   (b) POR OMISION, y esta seguia abierta cuando se escribio este banco. La
//       pagina declaraba UNA sola «capability en vuelo» (`base-tecnologica`) y
//       hay DOS: `documentacion-del-marco`, que nace en el change
//       `orden-de-lectura`, no estaba nombrada en ninguna parte del documento.
//       Y no es una capability cualquiera: uno de sus dos requirements es
//       «Ningun enlace del repositorio apunta a algo que no existe», que es
//       justo lo que `pruebas/docs/enlaces.test.mjs` hace cumplir. O sea que la
//       pagina que existe para decir que tiene compuerta se salteo una
//       capability entera QUE SI LA TIENE.
//
// POR QUE UNA PAGINA ASI NO SE CAE SOLA. Su modo de falla es el silencio: no
// hay lector que la contradiga, porque quien la abre la abre justamente para
// enterarse. Y su propio texto declaraba el hueco como si fuera del mundo —«no
// es un check: agregar un requirement sin agregar su fila no pone nada en
// rojo»—, cuando agregar un requirement sin su fila es de las cosas mas baratas
// de medir que hay en este repositorio: los requirements estan escritos como
// encabezados en archivos versionados.
//
// LO QUE ESTE BANCO PUEDE Y LO QUE NO, dicho de frente. NO puede decidir si una
// fila que dice `ninguno` esta bien: eso exige saber si existe una compuerta, y
// eso no se lee de ningun archivo. Lo que si puede, y es lo que hace, es que
// NINGUN NUMERO Y NINGUNA LISTA de la pagina se escriban a mano: el conjunto de
// capabilities —las vivas y las que estan en vuelo—, el de requirements de cada
// una, los conteos de los encabezados, el universo, el desglose, el resumen, los
// pasos citados por su nombre y las rutas citadas salen de medir el arbol. Con
// eso, promover un requirement al contrato sin tocar la pagina se pone rojo el
// mismo dia, que es lo unico que faltaba para que (a) y (b) no vuelvan a pasar
// en silencio.
//
// TODO LO QUE MIRA ES PURO SOBRE TEXTO, a proposito: cada refutacion de abajo le
// pasa a LA MISMA funcion que corre la regla una copia mutada en memoria. Una
// guarda que nadie vio fallar no es una guarda.
//
// ---------------------------------------------------------------------------
// Y DESDE EL CHANGE `el-censo-no-miente` (2026-09-17), LA AUSENCIA DEJA DE SER GRATIS.
//
// Medido ese dia: 25 filas de la pagina decian `**ninguno**` y nada mas —17 del contrato
// vivo y 8 de las capabilities en vuelo—, sin la propiedad que impide verificarlas ni el
// lugar donde vive el trabajo que falta. Un requirement nuevo sin compuerta y uno cuya
// compuerta nadie supo construir se leian igual. Y al releerlas una por una, NUEVE ya tenian
// una compuerta parcial que la pagina no contaba —seis del contrato, tres en vuelo—: el mapa
// estaba viejo en la direccion que nadie audita. Lo porto el marco desde Rigel (2.0.0
// `censo-honesto`, 2.4.0 `el-numero-del-censo`, 2.6.0 issue #457 de alla), adaptado a una
// pagina escrita a mano en vez de un censo por marcas en los workflows:
//
//   1. TODA FILA SIN COMPUERTA DECLARA SU ESTADO, en una de tres formas, y la cuarta —la
//      `**ninguno**` pelada— es rojo:
//        · `**pendiente** → change `<nombre>``: verificable, y el trabajo vive en un change
//          VIVO que nombra al requirement. Las dos cosas se miden.
//        · `**no verificable** — <propiedad>`: la propiedad del requirement que impide
//          verificarlo. Los motivos de ESFUERZO («es dificil», «no hay tiempo») no cuentan.
//        · `**sin destino**, vigente en X.Y.Z — <texto>`: verificable y NADIE lo tiene. Es el
//          estado que Rigel no necesito —alla los pendientes apuntaban a un issue paraguas— y
//          aca si: este banco no puede comprobar un issue sin red, y ningun change vivo nombra
//          esos requirements. Inventar un destino seria mentir en la otra direccion; por eso
//          se publica con su version y VENCE al cortar la siguiente, con el mismo predicado
//          que vence las excepciones de `pinado.test.mjs` (`pruebas/vigencia.mjs`).
//   2. LA COBERTURA POR MITADES SE CUENTA APARTE. Una fila `**parcial**` sigue contando como
//      compuerta, pero cada encabezado y el resumen publican cuantas lo son, como subconjunto.
//   3. UNA COMPUERTA QUE NO CORRE NO CUENTA. Si una fila con compuerta cita una pieza que
//      vive en una action que ningun `uses:` invoca, es rojo. El lector del alcance es el
//      mismo del banco de actions alcanzables (`pruebas/alcance-de-las-actions.mjs`).
//   4. UNA FILA CON COMPUERTA CITA ALGO QUE SE PUEDA BUSCAR: una ruta o un paso. Una celda
//      que dice una frase suelta no puede contar como compuerta.
// ---------------------------------------------------------------------------
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { pasosDe, superficies } from "../marco-ci/extraer.mjs";
import { accionDeLaRuta, alcanzadas } from "../alcance-de-las-actions.mjs";
import { FORMA_DE_VERSION, vencida, versionPublicada } from "../vigencia.mjs";
import { porque } from "../porque.mjs";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
export const PAGINA = "openspec/cobertura-de-requirements.md";

const leer = (rel) => fs.readFileSync(path.join(RAIZ, rel), "utf-8");
const pagina = () => leer(PAGINA);

/** Las celdas de una fila de tabla markdown.
 *
 *  Se corta en el `|` que NO viene escapado: una celda de esta pagina cita
 *  `\|\| true` —el enmascaramiento que un banco del andamio persigue— y un corte
 *  ingenuo partiria esa fila en pedazos y leeria la cobertura equivocada. */
const celdas = (linea) =>
  linea
    .trim()
    .replace(/^\||\|$/g, "")
    .split(/(?<!\\)\|/)
    .map((c) => c.trim());

/** Las secciones de capability de la pagina, con sus filas.
 *
 *  Se reconoce por la forma del encabezado, que trae los dos conteos escritos.
 *  Las secciones de prosa —«Que NO dice esta tabla»— no la tienen y quedan
 *  fuera solas, sin ninguna lista de excepciones que mantener. */
export function seccionesDeLaPagina(texto = pagina()) {
  const secciones = [];
  let actual = null;
  for (const linea of texto.split("\n")) {
    // El «(N parciales)» se lee OPCIONAL a proposito: un encabezado que no lo publica
    // tiene que ponerse rojo DICIENDO eso, y no desaparecer de la lista de secciones con un
    // mensaje sobre capabilities que manda a buscar el error en otro lado.
    const enc = linea.match(
      /^## ([a-z0-9-]+) — (capability EN VUELO, )?(\d+) requirements?, (\d+) con compuerta(?: \((\d+) parcial(?:es)?\))?\s*$/,
    );
    if (enc) {
      actual = {
        capability: enc[1],
        enVuelo: Boolean(enc[2]),
        diceRequirements: Number(enc[3]),
        diceConCompuerta: Number(enc[4]),
        diceParciales: enc[5] === undefined ? null : Number(enc[5]),
        filas: [],
      };
      secciones.push(actual);
      continue;
    }
    if (/^## /.test(linea)) {
      actual = null;
      continue;
    }
    if (!actual || !linea.startsWith("|")) continue;
    const c = celdas(linea);
    if (c.length < 2 || c[0] === "Requirement" || /^-+$/.test(c[0])) continue;
    actual.filas.push({ requirement: c[0], cobertura: c[1], ancla: c[2] ?? "" });
  }
  return secciones;
}

/** El estado de una fila, por la forma en que EMPIEZA su celda del medio.
 *
 *  Seis estados y excluyentes. Los dos primeros tienen compuerta; los otros cuatro no:
 *
 *    completa       · cualquier otra cosa: la celda nombra lo que la pone en rojo
 *    parcial        · `**parcial**...`: existe un camino al rojo, y cubre una parte
 *    pendiente      · `**pendiente** → change `x``: verificable, con el trabajo en un change
 *    no-verificable · `**no verificable** — ...`: con la propiedad que lo impide
 *    sin-destino    · `**sin destino**, vigente en X.Y.Z — ...`: verificable y sin dueño
 *    sin-declarar   · `**ninguno**`: la ausencia gratis, que es lo que esto persigue
 *
 *  «parcial» cuenta como compuerta a proposito y la pagina lo declara: dice que existe al
 *  menos un camino por el que ese requirement pone algo en rojo solo, no que este cubierto
 *  entero. Por eso se publica aparte, como subconjunto de los que tienen compuerta. */
export function estadoDe(fila) {
  const c = fila.cobertura;
  if (/^\*\*ninguno\*\*/.test(c)) return "sin-declarar";
  if (/^\*\*pendiente\*\*/.test(c)) return "pendiente";
  if (/^\*\*no verificable\*\*/.test(c)) return "no-verificable";
  if (/^\*\*sin destino\*\*/.test(c)) return "sin-destino";
  if (/^\*\*parcial/.test(c)) return "parcial";
  return "completa";
}
export const tieneCompuerta = (fila) => ["completa", "parcial"].includes(estadoDe(fila));
export const esParcial = (fila) => estadoDe(fila) === "parcial";

/** Los requirements que un spec declara, en el orden en que estan escritos. */
export function requirementsDe(rutaSpec) {
  return leer(rutaSpec)
    .split("\n")
    .map((l) => l.match(/^### Requirement:\s*(.+?)\s*$/))
    .filter(Boolean)
    .map((m) => m[1]);
}

/** Las capabilities del contrato VIVO, con sus requirements. */
export function capabilidadesVivas() {
  const dir = path.join(RAIZ, "openspec/specs");
  const salida = {};
  for (const cap of fs.readdirSync(dir).sort()) {
    const spec = `openspec/specs/${cap}/spec.md`;
    if (fs.existsSync(path.join(RAIZ, spec))) salida[cap] = requirementsDe(spec);
  }
  return salida;
}

/** Las capabilities EN VUELO: las que un change vivo declara y el contrato
 *  todavia no tiene.
 *
 *  `archive/` queda fuera porque ahi viven los changes ya fundidos en los specs:
 *  su capability o ya esta viva o no existe, y en los dos casos no esta en
 *  vuelo. Se deriva del disco y no de una lista escrita — una lista escrita es
 *  exactamente lo que fallo: la pagina nombraba una capability en vuelo cuando
 *  habia dos.
 *
 *  Y SE ACUMULA ENTRE CHANGES, que era el mismo defecto un nivel mas arriba.
 *  Antes hacia `salida[cap] = ...`, o sea que con DOS changes vivos tocando la
 *  misma capability en vuelo ganaba el ultimo por orden alfabetico y los
 *  requirements del otro desaparecian de la pagina sin que nada lo dijera. Es
 *  legitimo que dos changes toquen la misma capability, asi que se suman. */
export function capabilidadesEnVuelo() {
  const dir = path.join(RAIZ, "openspec/changes");
  const vivas = new Set(Object.keys(capabilidadesVivas()));
  const salida = {};
  for (const change of fs.readdirSync(dir).sort()) {
    if (change === "archive") continue;
    const specs = path.join(dir, change, "specs");
    if (!fs.existsSync(specs)) continue;
    for (const cap of fs.readdirSync(specs).sort()) {
      const spec = `openspec/changes/${change}/specs/${cap}/spec.md`;
      if (vivas.has(cap) || !fs.existsSync(path.join(RAIZ, spec))) continue;
      const yaHabia = salida[cap] ?? [];
      const nuevos = requirementsDe(spec).filter((r) => !yaHabia.includes(r));
      salida[cap] = [...yaHabia, ...nuevos];
    }
  }
  return salida;
}

// ---------------------------------------------------------------------------
// LAS ANCLAS: `ruta/archivo.ext:linea`, y las que heredan la ruta de al lado.
// ---------------------------------------------------------------------------

/** Una ruta del repositorio con extension conocida, con su linea opcional. */
// `tsx` va ANTES que `ts`, y no por estetica: la alternancia se prueba en orden, y con `ts`
// primero `App.test.tsx` se leeria como `App.test.ts` mas una `x` suelta. Los `.ts` entraron
// con el change `el-censo-no-miente`, cuando una fila empezo a citar el banco del logger del
// andamio: sin ellos, esa cita no la validaba nadie.
const RUTA = /((?:[\w.@-]+\/)+[\w.@-]+\.(?:mjs|yml|yaml|md|json|tsx|ts))(?::(\d+)(?:-(\d+))?)?/g;

/** Una linea suelta entre comillas invertidas: `:207`. La pagina las escribe
 *  asi para no repetir la ruta cinco veces en la misma celda, y son la MITAD de
 *  las anclas del documento: dejarlas afuera seria vigilar media pagina. */
const LINEA_SOLA = /`:(\d+)(?:-(\d+))?`/g;

/** Las rutas y anclas que la pagina cita.
 *
 *  Los bloques cercados quedan fuera: ahi viven los comandos que la pagina
 *  publica para rederivarse, y sus rutas llevan comodin en el lugar de la
 *  capability, asi que no son la ruta de un archivo sino la forma de buscarlas. */
export function anclasDe(texto) {
  const salida = [];
  for (const linea of texto.replace(/```[\s\S]*?```/g, "").split("\n")) {
    const marcas = [];
    for (const m of linea.matchAll(RUTA)) marcas.push({ i: m.index, ruta: m[1], desde: m[2], hasta: m[3] });
    for (const m of linea.matchAll(LINEA_SOLA)) marcas.push({ i: m.index, ruta: null, desde: m[1], hasta: m[2] });
    marcas.sort((a, b) => a.i - b.i);
    let ultima = null;
    for (const mk of marcas) {
      if (mk.ruta) ultima = mk.ruta;
      if (!mk.ruta && !ultima) continue;
      salida.push({
        ruta: mk.ruta ?? ultima,
        desde: mk.desde ? Number(mk.desde) : null,
        hasta: mk.hasta ? Number(mk.hasta) : null,
      });
    }
  }
  return salida;
}

/** Donde cae una ruta citada.
 *
 *  La pagina escribe de las dos formas y las dos son correctas: en prosa cita
 *  desde la raiz del repositorio (`pruebas/andamio/desplegar.test.mjs`, que es
 *  como se escribe para que alguien lo pegue en una terminal) y en los enlaces
 *  de markdown cita relativo a su propia carpeta (`../pruebas/...`, que es lo
 *  unico que hace clickeable el enlace). Resolver las dos con la misma regla
 *  mandaria una de las dos afuera del arbol y la daria por inexistente. */
const resolver = (ruta) =>
  /^\.\.?\//.test(ruta) ? path.resolve(RAIZ, path.dirname(PAGINA), ruta) : path.join(RAIZ, ruta);

/** Que le pasa a las anclas de un texto, medido contra el arbol.
 *
 *  Se exige que el archivo exista, que la linea caiga adentro y que NO caiga
 *  sobre una linea vacia ni sobre un comentario suelto. Ese tercer control es el
 *  mas flojo de los tres y hay que decir cuanto vale: medido contra las trece
 *  anclas que este mismo lote encontro envejecidas, cazaba SEIS —las que habian
 *  ido a parar a un `#` solo o a una linea de comentario—; las otras siete
 *  habian caido sobre codigo de verdad y ninguna forma barata las distingue de
 *  un ancla sana. O sea: red parcial declarada, no compuerta. La compuerta de la
 *  pagina son las listas y los conteos de mas abajo, que si son exactos. */
export function problemasDeLasAnclas(texto) {
  const problemas = [];
  for (const a of anclasDe(texto)) {
    const abs = resolver(a.ruta);
    if (!fs.existsSync(abs)) {
      problemas.push(`${a.ruta} — la pagina lo cita y no existe`);
      continue;
    }
    if (!a.desde) continue;
    const lineas = fs.readFileSync(abs, "utf-8").split("\n");
    const fin = a.hasta ?? a.desde;
    if (fin > lineas.length) {
      problemas.push(`${a.ruta}:${a.desde} — el archivo tiene ${lineas.length} lineas`);
      continue;
    }
    const cita = lineas[a.desde - 1];
    if (cita.trim() === "" || /^\s*(#|\/\/)/.test(cita)) {
      problemas.push(`${a.ruta}:${a.desde} — cae sobre una linea vacia o de comentario: "${cita.trim()}"`);
    }
  }
  return problemas;
}

// ---------------------------------------------------------------------------
// LOS PASOS CITADOS POR NOMBRE, que es lo que la pagina declara como su ancla
// de verdad: «el nombre del paso no se movio ni una vez en las tres mediciones
// (...) la linea es una comodidad, el nombre es el dato». Si el nombre es el
// dato, es el nombre lo que hay que medir — y renombrar un paso es lo unico que
// deja a esta pagina mandando a buscar una compuerta que ya no se llama asi.
// ---------------------------------------------------------------------------

/** Los archivos donde puede vivir un paso citado. */
const DONDE_VIVEN_LOS_PASOS = [
  ".github/workflows",
  "plantilla/.github/workflows",
  ...fs
    .readdirSync(path.join(RAIZ, "actions"), { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => `actions/${e.name}`),
];

/** Todos los `- name:` que declaran los workflows y las actions del repositorio.
 *
 *  Se junta todo en un conjunto en vez de exigir que cada paso este en EL
 *  archivo que la celda nombra a su lado: la pagina cita el archivo de varias
 *  formas —a veces por ruta completa, a veces solo `marco-ci.yml`— y atar la
 *  regla a esa forma la haria romperse por como esta escrita la frase y no por
 *  el defecto que persigue. Lo que importa es que el paso EXISTA: un paso
 *  renombrado desaparece del conjunto entero. */
export function pasosQueExisten() {
  const nombres = new Set();
  for (const dir of DONDE_VIVEN_LOS_PASOS) {
    const abs = path.join(RAIZ, dir);
    if (!fs.existsSync(abs)) continue;
    for (const archivo of fs.readdirSync(abs).filter((n) => /\.ya?ml$/.test(n))) {
      for (const m of fs.readFileSync(path.join(abs, archivo), "utf-8").matchAll(/^\s*-\s*name:\s*(.+?)\s*$/gm)) {
        nombres.add(m[1].replace(/^["']|["']$/g, ""));
      }
    }
  }
  return nombres;
}

/** Los pasos que la pagina cita entre comillas angulares. */
export const pasosCitados = (texto) => [...new Set([...texto.matchAll(/paso «([^»]+)»/g)].map((m) => m[1]))].sort();

export function pasosQueYaNoExisten(texto) {
  const existen = pasosQueExisten();
  return pasosCitados(texto).filter((p) => !existen.has(p));
}

// ---------------------------------------------------------------------------
// UN PASO QUE NO PUEDE FALLAR NO ES LA COMPUERTA DE NADIE.
//
// La columna del medio de la pagina se titula «Lo que lo hace fallar solo». Un paso con
// `continue-on-error` —en el paso o en su job— NO puede poner nada en rojo: su fallo no
// detiene la corrida. Citarlo ahi publica como sostenido un requirement que no sostiene
// nadie, y ese error va en la direccion que nadie revisa: un `ninguno` de mas hace una tabla
// fea; una compuerta de mas hace una tabla FALSA.
//
// Viene de Rigel (2.4.0, change `el-numero-del-censo`, issue #341 de alla): el paso «El
// repositorio llego a su ambiente» estaba publicado como la compuerta entera de un
// requirement y su propio comentario decia que sale 0 SIEMPRE. Aca no hay ningun caso hoy
// —ningun workflow ni action del marco usa `continue-on-error`—, y por eso mismo esto tiene
// que fallar solo el dia que aparezca, en vez de esperar a que alguien lo note.
//
// ES UN PROXY Y SE DECLARA COMO PROXY: se lee el modificador, no el motivo. Un paso que
// "no puede fallar" por otra via —un `exit 0` incondicional, un `|| true` en su ultimo
// comando— no lo caza esto. El lector de pasos es el del extractor (`pasosDe`), el mismo que
// usa el censo de pasos sin banco, para que las dos compuertas no discrepen sobre el mismo
// paso.
// ---------------------------------------------------------------------------

/** Nombre -> los pasos del arbol que se llaman asi, con su archivo. */
export function pasosPorNombre() {
  const mapa = new Map();
  for (const ruta of superficies(RAIZ)) {
    for (const paso of pasosDe(path.join(RAIZ, ruta))) {
      if (paso.nombre === null) continue;
      mapa.set(paso.nombre, [...(mapa.get(paso.nombre) ?? []), { ...paso, ruta }]);
    }
  }
  return mapa;
}

export function pasosCitadosQueNoPuedenFallar(texto, porNombre = pasosPorNombre()) {
  const mal = [];
  for (const nombre of pasosCitados(texto)) {
    for (const paso of porNombre.get(nombre) ?? []) {
      if (!paso.continueOnError) continue;
      const donde = paso.continueOnError.delJob ? "en su JOB" : "en el paso";
      mal.push(`«${nombre}» (${paso.ruta}:${paso.linea}) lleva continue-on-error: ${paso.continueOnError.valor} ${donde}, linea ${paso.continueOnError.linea}`);
    }
  }
  return mal;
}

// ---------------------------------------------------------------------------
// LA AUSENCIA DECLARADA: tres formas, y la cuarta es rojo.
//
// POR QUE TRES Y NO DOS, que es lo que trajo Rigel. Alla un requirement sin compuerta es
// `sin-compuerta <propiedad>` o `compuerta-pendiente <destino>`, y el destino de los 36
// pendientes era un issue paraguas. Aca el destino tiene que ser algo que ESTE banco pueda
// comprobar sin red —un change vivo que nombra al requirement—, y para la mayoria de los
// requirements del contrato no existe ninguno. Obligarlos a «pendiente» empujaria a inventar
// un destino; obligarlos a «no verificable» empujaria a escribir una afirmacion falsa sobre
// reglas que SI se pueden verificar (Rigel clasifico 45 y 44 lo eran). El tercer estado dice
// la verdad —verificable y sin dueño— y para que no sea la ausencia gratis con otro nombre,
// VENCE: lleva la version publicada en que se decidio y se pone rojo al cortar la siguiente,
// con el mismo predicado que vence las excepciones de `pinado.test.mjs`.
// ---------------------------------------------------------------------------

/** Las formulas que describen a quien escribe y no al requirement.
 *
 *  ES UN PROXY Y SE DECLARA COMO PROXY, igual que en Rigel (commit 7ce8037 de alla): juzgar
 *  si una propiedad es BUENA es comprension de lectura. Lo que si se puede es rechazar las
 *  formas baratas que dejan de ser ciertas en cuanto cambia quien lee —«es dificil», «no hay
 *  tiempo»—. Caza la formula y deja el caso sutil al criterio de quien revisa. */
const EXCUSAS =
  /\b(dificil|complicad\w*|llevaria|lleva mucho|demasiado (tiempo|trabajo)|no hay (gente|tiempo|manos|recursos)|falta (gente|tiempo|manos)|no es prioridad|prioridad ahora|mas adelante|por ahora no|cuando haya tiempo)\b/;
const sinAcentos = (s) =>
  String(s)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

/** Lo minimo que tiene que decir una propiedad o un «sin destino» para no ser un tramite. */
const MOTIVO_MINIMO = 40;

/** Los changes VIVOS, con el texto de todos sus documentos: nombre -> texto.
 *
 *  `archive/` queda fuera por la misma razon que en `capabilidadesEnVuelo`: un change
 *  archivado ya no es donde vive trabajo pendiente. Un pendiente que apunta a un change que se
 *  archivo tiene que decidirse de nuevo, y eso es exactamente lo que el rojo pide. */
export function changesVivos() {
  const dir = path.join(RAIZ, "openspec/changes");
  const salida = new Map();
  const juntar = (abs) =>
    fs
      .readdirSync(abs, { withFileTypes: true })
      .flatMap((e) => (e.isDirectory() ? [juntar(path.join(abs, e.name))] : e.name.endsWith(".md") ? [fs.readFileSync(path.join(abs, e.name), "utf-8")] : []))
      .join("\n");
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!e.isDirectory() || e.name === "archive") continue;
    salida.set(e.name, juntar(path.join(dir, e.name)));
  }
  return salida;
}

/** Lo que declara una fila sin compuerta, leido de su celda del medio. */
export function declaracionDe(fila) {
  const c = fila.cobertura;
  const estado = estadoDe(fila);
  if (estado === "pendiente") {
    const m = c.match(/^\*\*pendiente\*\*\s*→\s*change\s+`([a-z0-9-]+)`/);
    return { estado, change: m ? m[1] : null };
  }
  if (estado === "no-verificable") {
    const m = c.match(/^\*\*no verificable\*\*\s*—\s*(.*)$/);
    return { estado, motivo: m ? m[1].trim() : "" };
  }
  if (estado === "sin-destino") {
    const m = c.match(/^\*\*sin destino\*\*, vigente en (\S+?)\s*—\s*(.*)$/);
    return { estado, vigenteEn: m ? m[1] : null, motivo: m ? m[2].trim() : "" };
  }
  return { estado };
}

/** Toda fila sin compuerta que no declara su estado, o lo declara de una forma que no se sostiene.
 *
 *  `version` y `vivos` entran por parametro para que las refutaciones corran ESTA funcion
 *  sobre un arbol de juguete, y no una copia. */
export function ausenciasMalDeclaradas(texto, { version = versionPublicada(), vivos = changesVivos() } = {}) {
  const mal = [];
  const salidas =
    "Tres salidas, y hay que elegir UNA: `**pendiente** → change `<nombre>`` si un change vivo tiene ese trabajo y " +
    "nombra al requirement; `**no verificable** — <la propiedad del requirement que lo impide>`; o `**sin destino**, " +
    `vigente en ${version} — <por que es verificable y que falta>\`. Y si en realidad SI hay algo que lo pone en rojo, ` +
    "la salida es nombrarlo";
  for (const s of seccionesDeLaPagina(texto)) {
    for (const f of s.filas) {
      const quien = `«${f.requirement}» (${s.capability})`;
      const d = declaracionDe(f);
      if (d.estado === "sin-declarar") {
        mal.push(`${quien} dice \`**ninguno**\` y nada mas: un requirement nuevo sin compuerta y uno cuya compuerta nadie supo construir se leen igual. ${salidas}`);
      } else if (d.estado === "pendiente") {
        if (!d.change) mal.push(`${quien} se declara pendiente sin decir en que change: la forma es \`**pendiente** → change \`<nombre>\`\``);
        else if (!vivos.has(d.change))
          mal.push(
            `${quien} declara su compuerta pendiente en el change \`${d.change}\`, y no hay ningun change vivo con ese nombre en ` +
              "openspec/changes/. Si se archivo, el trabajo o se hizo (y la fila ya tiene compuerta) o se perdio (y hay que decidir de nuevo). " +
              salidas,
          );
        else if (!vivos.get(d.change).includes(f.requirement))
          mal.push(
            `${quien} declara su compuerta pendiente en el change \`${d.change}\`, y ningun documento de ese change nombra el ` +
              "requirement con su titulo exacto: un destino que no sabe que lo es no es un destino. Nombralo en el change, o elegi otra salida",
          );
      } else if (d.estado === "no-verificable") {
        if (d.motivo.length < MOTIVO_MINIMO)
          mal.push(`${quien} se declara no verificable sin la propiedad que lo impide (al menos ${MOTIVO_MINIMO} caracteres despues de «— »): un «no se puede» sin por que es un olvido con nombre`);
        else if (EXCUSAS.test(sinAcentos(d.motivo)))
          mal.push(
            `${quien} declara como motivo el ESFUERZO («${d.motivo}») y no una propiedad del requirement. «Es dificil» describe a quien lo ` +
              "escribio y deja de ser cierto en cuanto cambie quien lo lee. Si la propiedad SI se puede verificar, la declaracion correcta es " +
              "`**pendiente**` con su change o `**sin destino**` con su version",
          );
      } else if (d.estado === "sin-destino") {
        if (!d.vigenteEn || !FORMA_DE_VERSION.test(d.vigenteEn) || d.motivo.length < MOTIVO_MINIMO)
          mal.push(
            `${quien} se declara sin destino con una forma que no se puede leer: tiene que ser \`**sin destino**, vigente en X.Y.Z — <texto>\`, ` +
              `con la version publicada del CHANGELOG (hoy ${version}, sin la v) y al menos ${MOTIVO_MINIMO} caracteres que digan por que es verificable y que falta`,
          );
        else if (vencida(d.vigenteEn, version))
          mal.push(
            `${quien} se declaro sin destino en la ${d.vigenteEn} y el CHANGELOG ya publica la ${version}: la declaracion VENCIO. Releela ` +
              "y decidi de nuevo —darle una compuerta, un change que la tenga, o la propiedad que la hace no verificable—; si sigue sin " +
              `dueño, mover la version a ${version} es una decision que alguien firma, no un olvido`,
          );
      }
    }
  }
  return mal;
}

// ---------------------------------------------------------------------------
// UNA COMPUERTA QUE NO CORRE NO CUENTA.
//
// Viene de Rigel (2.6.0, issue #457 de alla, commit c6d2f5e): su censo publicaba 43 de 77
// requirements sostenidos con las declaraciones de una action que ningun workflow invocaba, y
// 41 de 77 sin ellas. Aca la pagina es escrita a mano, asi que la misma mentira se escribe
// citando un archivo de `actions/<x>/` —o un paso que solo vive ahi— cuando `<x>` no la invoca
// ningun `uses:`. El lector del alcance es el del banco de actions alcanzables: si cada uno
// tuviera el suyo, uno podria eximir una pieza y el otro contarla como compuerta.
//
// Y ACA ES ROJO, no aviso como en Rigel. Alla el aviso era de una herramienta que corre en CI
// y el rojo de esa ventana ya lo daba el banco de alcanzables. Aca el arreglo es editar una
// fila de esta pagina, que esta en el arbol de quien lo lee: no hay ventana que esperar. Y la
// excepcion de un action en `actions-alcanzables.test.mjs` NO la vuelve compuerta: exime del
// rojo de «nadie la invoca», no convierte en verdad que corra.
// ---------------------------------------------------------------------------

/** El texto de una fila en el que se buscan citas: su celda del medio y la del ancla. */
const citasDeLaFila = (f) => `${f.cobertura} ${f.ancla}`;

export function compuertasQueNoCorren(texto, { alcance = alcanzadas(), porNombre = pasosPorNombre() } = {}) {
  const mal = [];
  for (const s of seccionesDeLaPagina(texto)) {
    for (const f of s.filas.filter(tieneCompuerta)) {
      const celda = citasDeLaFila(f);
      for (const a of anclasDe(celda)) {
        const accion = accionDeLaRuta(a.ruta);
        if (accion && !alcance.has(accion))
          mal.push(
            `«${f.requirement}» (${s.capability}) cita \`${a.ruta}\` como compuerta, y ningun \`uses:\` del marco ni del andamio ` +
              `invoca \`actions/${accion}\`: publica el requirement como sostenido por algo que no corre en ningun repositorio. ` +
              "Arreglo: cablear la action con su `uses:`, o sacar la cita de esta fila y dejarle la cobertura que de verdad tenga",
          );
      }
      for (const nombre of pasosCitados(celda)) {
        const donde = porNombre.get(nombre) ?? [];
        const acciones = donde.map((p) => accionDeLaRuta(p.ruta));
        if (donde.length > 0 && acciones.every((a) => a !== null && !alcance.has(a)))
          mal.push(
            `«${f.requirement}» (${s.capability}) cita el paso «${nombre}», que solo vive en ${[...new Set(acciones)].map((a) => `actions/${a}`).join(", ")}, ` +
              "y ningun `uses:` la invoca: el paso existe y no corre. Arreglo: cablear la action, o sacar la cita de esta fila",
          );
      }
    }
  }
  return [...new Set(mal)];
}

/** Las filas que se publican CON compuerta y no citan nada que se pueda buscar.
 *
 *  «Lo que lo hace fallar solo» es una afirmacion sobre el arbol, y la unica forma de
 *  sostenerla es nombrar donde esta: una ruta o un paso. Una celda que dice una frase suelta
 *  cuenta como compuerta en todos los numeros de esta pagina sin que nadie pueda ir a mirarla. */
export function compuertasSinCita(texto) {
  const mal = [];
  for (const s of seccionesDeLaPagina(texto)) {
    for (const f of s.filas.filter(tieneCompuerta)) {
      const celda = citasDeLaFila(f);
      if (anclasDe(celda).length === 0 && pasosCitados(celda).length === 0)
        mal.push(
          `«${f.requirement}» (${s.capability}) cuenta como compuerta y no cita ninguna ruta ni ningun paso «...»: nadie puede ir a ` +
            "mirar lo que la pone en rojo. Nombrala, o declara la fila sin compuerta con su estado",
        );
    }
  }
  return mal;
}

// ---------------------------------------------------------------------------
// LOS NUMEROS QUE LA PAGINA AFIRMA SOBRE SI MISMA.
// ---------------------------------------------------------------------------

/** El universo y el resumen, tal como estan escritos. Se devuelve `null` cuando
 *  la frase no esta, y hay un caso que exige que esten: una frase que se
 *  renombra y deja de matchear apagaria el control en silencio. */
export function cifrasDeclaradas(texto) {
  const universo = texto.match(/\*\*Medido el \d{4}-\d\d-\d\d: (\d+) requirements vivos en (\d+) capabilities\*\*/);
  const desglose = texto.match(/\*\*Medido el \d{4}-\d\d-\d\d:[^*]*\*\*\s*\n\(([^)]*)\)/);
  const resumen = texto.match(
    /\*\*Resumen de la medición: (\d+) de (\d+) requirements tienen al menos una compuerta que\nfalla sola; (\d+) no la tienen\.\*\*/,
  );
  // El «2 capabilities en vuelo» de la prosa: la frase que decia «una» cuando
  // eran dos. Se admite el corte de linea entre las dos palabras porque la
  // pagina envuelve a los ochenta caracteres.
  const enVuelo = texto.match(/\*\*(\d+) capabilities en\s+vuelo\*\*/);
  // EL DESGLOSE DE LOS DOS LADOS DEL RESUMEN (change `el-censo-no-miente`). Las parciales son
  // un SUBCONJUNTO de las que tienen compuerta y se publican asi, no como una bolsa aparte que
  // sumaria mas que el total; los cuatro estados de la ausencia si suman las que no la tienen.
  // Se lee sobre el texto con los espacios juntados porque la pagina envuelve a los ochenta
  // caracteres, y el corte puede caer en cualquier palabra.
  const plano = texto.replace(/\s+/g, " ");
  const estados = plano.match(
    /\*\*De las (\d+) con compuerta, (\d+) (?:es|son) solo parcial(?:es)?\. De las (\d+) sin compuerta: (\d+) pendientes? en un change vivo, (\d+) no verificables?, (\d+) sin destino y (\d+) sin declarar\.\*\*/,
  );
  return {
    enVuelo: enVuelo ? Number(enVuelo[1]) : null,
    estados: estados
      ? {
          conCompuerta: Number(estados[1]),
          parciales: Number(estados[2]),
          sinCompuerta: Number(estados[3]),
          pendiente: Number(estados[4]),
          "no-verificable": Number(estados[5]),
          "sin-destino": Number(estados[6]),
          "sin-declarar": Number(estados[7]),
        }
      : null,
    universo: universo ? { requirements: Number(universo[1]), capabilities: Number(universo[2]) } : null,
    desglose: desglose
      ? [...desglose[1].matchAll(/(\d+)\s+`([a-z0-9-]+)`/g)].map((m) => ({ capability: m[2], cuantos: Number(m[1]) }))
      : null,
    resumen: resumen
      ? { conCompuerta: Number(resumen[1]), total: Number(resumen[2]), sinCompuerta: Number(resumen[3]) }
      : null,
  };
}

/** Todo lo que la pagina dice de si misma que no coincide con el arbol.
 *
 *  Una sola funcion para las listas Y los conteos, y la corren tanto las reglas
 *  como sus refutaciones: si la mutacion probara contra una copia de la logica,
 *  no probaria nada. */
export function desajustes(texto) {
  const mal = [];
  const secciones = seccionesDeLaPagina(texto);
  const vivas = capabilidadesVivas();
  const enVuelo = capabilidadesEnVuelo();

  const dice = (f) => secciones.filter(f).map((s) => s.capability).sort();
  const esperado = (o) => Object.keys(o).sort();

  if (dice((s) => !s.enVuelo).join(",") !== esperado(vivas).join(","))
    mal.push(`capabilities del contrato vivo: la pagina secciona [${dice((s) => !s.enVuelo)}] y openspec/specs/ tiene [${esperado(vivas)}]`);
  if (dice((s) => s.enVuelo).join(",") !== esperado(enVuelo).join(","))
    mal.push(`capabilities EN VUELO: la pagina secciona [${dice((s) => s.enVuelo)}] y los changes vivos declaran [${esperado(enVuelo)}]`);

  for (const s of secciones) {
    const real = (s.enVuelo ? enVuelo : vivas)[s.capability];
    if (real) {
      const filas = s.filas.map((f) => f.requirement);
      if (filas.join(" || ") !== real.join(" || "))
        mal.push(`${s.capability}: las filas son [${filas.join(" | ")}] y el spec declara [${real.join(" | ")}]`);
    }
    const conCompuerta = s.filas.filter(tieneCompuerta).length;
    const parciales = s.filas.filter(esParcial).length;
    if (s.diceRequirements !== s.filas.length)
      mal.push(`${s.capability}: el encabezado dice ${s.diceRequirements} requirements y la tabla tiene ${s.filas.length} filas`);
    if (s.diceConCompuerta !== conCompuerta)
      mal.push(`${s.capability}: el encabezado dice ${s.diceConCompuerta} con compuerta y las filas dan ${conCompuerta}`);
    if (s.diceParciales === null)
      mal.push(
        `${s.capability}: el encabezado no publica cuantas de sus compuertas son solo parciales. La forma es ` +
          `«## ${s.capability} — ..., ${conCompuerta} con compuerta (${parciales} parciales)»: sin ese numero, una capability cubierta a medias se lee cubierta`,
      );
    else if (s.diceParciales !== parciales)
      mal.push(`${s.capability}: el encabezado dice ${s.diceParciales} parciales y las filas dan ${parciales}`);
  }

  // El universo y el resumen hablan SOLO del contrato vivo: las capabilities en
  // vuelo se listan aparte justamente porque todavia no son contrato.
  const delContrato = secciones.filter((s) => !s.enVuelo);
  const totalFilas = delContrato.reduce((n, s) => n + s.filas.length, 0);
  const totalCon = delContrato.reduce((n, s) => n + s.filas.filter(tieneCompuerta).length, 0);
  const { universo, desglose, resumen, estados, enVuelo: diceEnVuelo } = cifrasDeclaradas(texto);

  if (diceEnVuelo === null) mal.push("no se encontro la frase que cuenta las capabilities en vuelo («**N capabilities en vuelo**»)");
  else if (diceEnVuelo !== Object.keys(enVuelo).length)
    mal.push(`la prosa dice ${diceEnVuelo} capabilities en vuelo y son ${Object.keys(enVuelo).length}`);
  if (!universo) mal.push("no se encontro la frase del universo («Medido el AAAA-MM-DD: N requirements vivos en C capabilities»)");
  else {
    if (universo.requirements !== totalFilas) mal.push(`el universo dice ${universo.requirements} requirements vivos y son ${totalFilas}`);
    if (universo.capabilities !== delContrato.length) mal.push(`el universo dice ${universo.capabilities} capabilities y son ${delContrato.length}`);
  }
  if (!desglose) mal.push("no se encontro el desglose por capability que sigue al universo");
  else {
    const escrito = desglose.map((d) => `${d.cuantos} ${d.capability}`).join(" + ");
    const medido = delContrato.map((s) => `${s.filas.length} ${s.capability}`).join(" + ");
    if (escrito !== medido) mal.push(`el desglose dice «${escrito}» y se mide «${medido}»`);
  }
  if (!resumen) mal.push("no se encontro la frase del resumen («Resumen de la medición: A de B ...; C no la tienen»)");
  else {
    if (resumen.total !== totalFilas) mal.push(`el resumen dice ${resumen.total} requirements y son ${totalFilas}`);
    if (resumen.conCompuerta !== totalCon) mal.push(`el resumen dice ${resumen.conCompuerta} con compuerta y son ${totalCon}`);
    if (resumen.sinCompuerta !== totalFilas - totalCon) mal.push(`el resumen dice ${resumen.sinCompuerta} sin compuerta y son ${totalFilas - totalCon}`);
  }
  if (!estados)
    mal.push(
      "no se encontro el desglose del resumen («**De las A con compuerta, P son solo parciales. De las B sin compuerta: N pendientes " +
        "en un change vivo, V no verificables, S sin destino y D sin declarar.**»): sin el, el resumen vuelve a contar igual una " +
        "compuerta entera y una mitad, y una ausencia con dueño y una sin el",
    );
  else {
    const filasDelContrato = delContrato.flatMap((s) => s.filas);
    const cuenta = (estado) => filasDelContrato.filter((f) => estadoDe(f) === estado).length;
    const medido = {
      conCompuerta: totalCon,
      parciales: filasDelContrato.filter(esParcial).length,
      sinCompuerta: totalFilas - totalCon,
      pendiente: cuenta("pendiente"),
      "no-verificable": cuenta("no-verificable"),
      "sin-destino": cuenta("sin-destino"),
      "sin-declarar": cuenta("sin-declarar"),
    };
    for (const [clave, valor] of Object.entries(medido))
      if (estados[clave] !== valor) mal.push(`el desglose del resumen dice ${estados[clave]} en «${clave}» y las filas del contrato dan ${valor}`);
  }
  return mal;
}

// ---------------------------------------------------------------------------
// LAS GUARDAS DEL PROPIO BANCO: sin esto, todo lo de abajo pasa vacio.
// ---------------------------------------------------------------------------

test("la pagina se leyo entera: un cero en cualquiera de estos conteos es este banco roto", () => {
  const secciones = seccionesDeLaPagina();
  const vivas = capabilidadesVivas();
  const enVuelo = capabilidadesEnVuelo();
  assert.ok(Object.keys(vivas).length >= 8, `openspec/specs/ dio ${Object.keys(vivas).length} capabilities: el lector del contrato esta roto`);
  assert.ok(
    Object.keys(enVuelo).length >= 1,
    "no se encontro ninguna capability en vuelo. Si de verdad no queda ninguna, esta regla dejo de vigilar el caso " +
      "que la motivo y hay que decidir que la reemplaza; lo que no vale es que pase en verde sin mirar.",
  );
  assert.ok(secciones.length >= 9, `se leyeron ${secciones.length} secciones de capability y tienen que ser al menos nueve`);
  assert.ok(
    secciones.some((s) => s.enVuelo) && secciones.some((s) => !s.enVuelo),
    "el lector tiene que distinguir las secciones del contrato de las que estan en vuelo: si no, las compara contra la lista equivocada",
  );
  const filas = secciones.reduce((n, s) => n + s.filas.length, 0);
  assert.ok(filas >= 41, `se leyeron ${filas} filas de requirement y tienen que ser al menos cuarenta y una`);
  assert.ok(anclasDe(pagina()).length >= 20, "se leyeron menos de veinte anclas: el lector de rutas dejo de reconocer la forma que la pagina usa");
  // Los lectores del change `el-censo-no-miente`: sin changes vivos, un «pendiente» no tiene
  // contra que medirse; sin actions alcanzadas, toda cita de `actions/` saldria rojo.
  assert.ok(changesVivos().size >= 1, "no se leyo ningun change vivo en openspec/changes/: el lector de destinos esta roto");
  assert.ok(alcanzadas().size >= 3, `el lector del alcance encontro ${alcanzadas().size} actions invocadas: esta roto, y la regla de las compuertas que no corren pasaria vacia`);
});

test("el lector de las cifras encuentra las cuatro frases que vigila", () => {
  // Una frase que se reescribe y deja de matchear apagaria su control sin un
  // solo rojo, que es el modo de falla exacto que este banco persigue.
  const { universo, desglose, resumen, estados, enVuelo } = cifrasDeclaradas(pagina());
  assert.ok(universo, "no se encontro la frase del universo");
  assert.ok(desglose && desglose.length >= 8, "no se encontro el desglose por capability");
  assert.ok(resumen, "no se encontro la frase del resumen");
  assert.ok(estados, "no se encontro el desglose del resumen por estado («De las A con compuerta, ...»)");
  assert.ok(enVuelo !== null, "no se encontro la frase que cuenta las capabilities en vuelo");
});

// ---------------------------------------------------------------------------
// LAS REGLAS
// ---------------------------------------------------------------------------

test("ninguna lista ni ningun numero de la pagina esta escrito a mano", () => {
  const mal = desajustes(pagina());
  assert.deepEqual(
    mal,
    [],
    "esta pagina existe para contestar que parte del contrato tiene compuerta, y una pagina asi solo sirve si esta " +
      "al dia. Su modo de falla es el silencio: nadie la contradice, porque quien la abre la abre para enterarse. " +
      `Todo lo de abajo sale de medir el arbol; lo que este escrito distinto esta viejo.\n  ${mal.join("\n  ")}`,
  );
});

test("toda ruta que la pagina cita existe, y toda linea citada cae adentro del archivo", () => {
  const mal = problemasDeLasAnclas(pagina());
  assert.deepEqual(
    mal,
    [],
    "un ancla que apunta a un archivo que ya no esta manda a buscar la compuerta a un lugar vacio, y quien la busca " +
      `concluye que no existe.\n  ${mal.join("\n  ")}`,
  );
});

test("todo paso que la pagina cita por su nombre sigue llamandose asi", () => {
  const citados = pasosCitados(pagina());
  assert.ok(
    citados.length >= 7,
    `se leyeron ${citados.length} pasos citados y la pagina cita al menos siete: si cayo, el lector dejo de reconocer ` +
      "la forma «paso «Nombre»» y esta regla pasa vacia.",
  );
  assert.ok(pasosQueExisten().size >= 20, "se leyeron menos de veinte pasos del arbol: el lector de workflows esta roto");
  const muertos = pasosQueYaNoExisten(pagina());
  assert.deepEqual(
    muertos,
    [],
    "la pagina apuesta a que el NOMBRE del paso es lo estable y por eso cita varios sin linea. Un paso renombrado " +
      `rompe justo esa apuesta, y en silencio: la celda sigue leyendose bien.\n  ${muertos.join("\n  ")}`,
  );
});

test("ningun paso que la pagina publica como compuerta lleva continue-on-error", () => {
  const porNombre = pasosPorNombre();
  const citados = pasosCitados(pagina());
  assert.ok(
    citados.filter((n) => porNombre.has(n)).length >= 7,
    "el lector de pasos del extractor no encontro los pasos que la pagina cita: esta regla pasaria vacia",
  );
  assert.deepEqual(
    pasosCitadosQueNoPuedenFallar(pagina(), porNombre),
    [],
    "la pagina publica estos pasos en la columna «Lo que lo hace fallar solo», y ninguno puede fallar: su " +
      "continue-on-error hace que el rojo no detenga nada. Arreglo, uno de dos: sacale el modificador al paso " +
      "y dale un rojo de verdad, o saca el paso de esa fila y deja al requirement con la cobertura que " +
      "realmente tenga (si no queda ninguna, la fila declara su estado: pendiente, no verificable o sin destino). " +
      "Escribir un motivo mejor no es un arreglo.",
  );
});

test("toda fila sin compuerta declara su estado, y la declaracion se sostiene", () => {
  const texto = pagina();
  const sinCompuerta = seccionesDeLaPagina(texto).flatMap((s) => s.filas.filter((f) => !tieneCompuerta(f)));
  assert.ok(sinCompuerta.length >= 5, `se leyeron ${sinCompuerta.length} filas sin compuerta: si cayo a casi cero, el lector de estados dejo de verlas y esta regla pasa vacia`);
  const mal = ausenciasMalDeclaradas(texto);
  assert.deepEqual(
    mal,
    [],
    "la ausencia de compuerta no es gratis: una fila sin compuerta dice por que, y lo que dice se mide contra el arbol. " +
      `Sin eso, un requirement que nadie miro y uno que nadie supo verificar se leen igual.\n  ${mal.join("\n  ")}`,
  );
});

test("ninguna compuerta publicada vive en una action que ningun `uses:` invoca", () => {
  const mal = compuertasQueNoCorren(pagina());
  assert.deepEqual(mal, [], `la pagina publica como compuerta algo que no corre en ningun repositorio:\n  ${mal.join("\n  ")}`);
});

test("toda fila que cuenta como compuerta nombra algo que se pueda ir a mirar", () => {
  const mal = compuertasSinCita(pagina());
  assert.deepEqual(mal, [], `estas filas suman al numero de compuertas sin decir donde estan:\n  ${mal.join("\n  ")}`);
});

// ---------------------------------------------------------------------------
// LAS REFUTACIONES. Cada una corre LA MISMA funcion que la regla.
// ---------------------------------------------------------------------------

test("MUERDE: un paso renombrado deja la cita de la pagina apuntando a nada, y se caza", () => {
  // LA MUTACION CORRE LA MISMA FUNCION QUE LA REGLA: se le pasa a
  // `pasosQueYaNoExisten` una copia de la pagina que cita un paso con una letra
  // de mas. No se comprueba que un regex deje de matchear.
  const texto = pagina();
  assert.deepEqual(pasosQueYaNoExisten(texto), [], "los pasos reales tienen que existir: sin eso, mutar la cita no prueba nada");
  const uno = pasosCitados(texto)[0];
  const mutado = texto.split(`paso «${uno}»`).join(`paso «${uno} que nadie escribio»`);
  assert.ok(mutado !== texto, `no se encontro la cita del paso «${uno}»`);
  assert.deepEqual(pasosQueYaNoExisten(mutado), [`${uno} que nadie escribio`], "un paso que ya no se llama asi tiene que ponerse rojo");
});

test("MUERDE: promover un requirement al contrato sin agregar su fila se caza", () => {
  // ES EL CASO QUE LA PAGINA DECLARABA IMPOSIBLE: «agregar un requirement sin
  // agregar su fila no pone nada en rojo». No se muta el spec —eso tocaria el
  // contrato—: se le saca a la pagina la ultima fila de una capability, que es
  // el mismo desajuste visto desde el otro lado y lo mide la misma funcion.
  const texto = pagina();
  const vivas = capabilidadesVivas();
  const cap = Object.keys(vivas)[0];
  const ultimo = vivas[cap].at(-1);
  assert.deepEqual(desajustes(texto), [], "la pagina real tiene que estar al dia: sin eso, mutarla no prueba nada");

  const sinLaFila = texto
    .split("\n")
    .filter((l) => !l.startsWith(`| ${ultimo} |`))
    .join("\n");
  assert.ok(sinLaFila !== texto, `no se encontro la fila de «${ultimo}»: el lector dejo de ver la tabla`);
  const mal = desajustes(sinLaFila);
  assert.ok(
    mal.some((m) => m.startsWith(`${cap}: las filas son`)),
    `sacada la fila de «${ultimo}», la regla tiene que nombrar a ${cap}. Dijo: ${mal.join(" / ")}`,
  );
});

test("MUERDE: una capability EN VUELO que la pagina no nombra se caza", () => {
  // EL DEFECTO QUE ESTE BANCO ENCONTRO VIVO. La pagina declaraba una sola
  // capability en vuelo y habia dos. Se le saca a la pagina el encabezado de una
  // de las que hoy si estan, y la regla tiene que ver que falta.
  const texto = pagina();
  const enVuelo = Object.keys(capabilidadesEnVuelo());
  assert.ok(enVuelo.length >= 1, "sin ninguna capability en vuelo esta refutacion se queda sin material");
  const cap = enVuelo[0];
  const sinLaSeccion = texto.split("\n").filter((l) => !l.startsWith(`## ${cap} — `)).join("\n");
  assert.ok(sinLaSeccion !== texto, `no se encontro la seccion de ${cap}`);
  const mal = desajustes(sinLaSeccion);
  assert.ok(
    mal.some((m) => m.startsWith("capabilities EN VUELO:") && m.includes(cap)),
    `sacada la seccion de ${cap}, la regla tiene que nombrarla. Dijo: ${mal.join(" / ")}`,
  );
});

/** La pagina con la celda del medio de UNA fila reemplazada, para las refutaciones. Se
 *  reescribe la linea entera en vez de buscar la celda por su texto: las celdas largas traen
 *  comillas invertidas y flechas, y una busqueda literal fallaria por la forma y no por la regla. */
function conCelda(texto, requirement, cobertura, ancla = "—") {
  let tocadas = 0;
  const salida = texto
    .split("\n")
    .map((l) => {
      if (!l.startsWith(`| ${requirement} |`)) return l;
      tocadas += 1;
      return `| ${requirement} | ${cobertura} | ${ancla} |`;
    })
    .join("\n");
  assert.equal(tocadas, 1, `la fila «${requirement}» tenia que aparecer UNA vez en la pagina y aparecio ${tocadas}`);
  return salida;
}

/** `assert.match` con el motivo Y lo que se miro: con mensaje solo, Node imprime el mensaje y
 *  se calla el texto que no matcheo (`pruebas/porque.mjs`). Las refutaciones de abajo miran
 *  mensajes largos, y cuando una cae hay que ver cual fue el mensaje de verdad. */
const muerde = (valor, patron, motivo) => assert.match(valor, patron, porque(motivo, valor));

/** Una fila real de la pagina que cumple `pred`, con su seccion. */
function unaFila(texto, pred) {
  for (const s of seccionesDeLaPagina(texto)) for (const f of s.filas) if (pred(f, s)) return { seccion: s, fila: f };
  return null;
}

test("MUERDE: un conteo del encabezado escrito a mano que se queda viejo se caza", () => {
  // El defecto (a): una fila pasa de no tener compuerta a tenerla y el encabezado
  // sigue donde estaba. Se muta la pagina al reves —el encabezado se queda y la
  // fila cambia— porque el desajuste es el mismo y no hay que inventar ninguna
  // compuerta que no exista.
  const texto = pagina();
  const hallada = unaFila(texto, (f) => !tieneCompuerta(f));
  assert.ok(hallada, "no hay ninguna fila sin compuerta: esta refutacion se quedo sin material");
  const { seccion, fila } = hallada;
  const mal = desajustes(conCelda(texto, fila.requirement, "una compuerta inventada en `pruebas/docs/enlaces.test.mjs`"));
  assert.ok(
    mal.some((m) => m.includes(`${seccion.capability}: el encabezado dice ${seccion.diceConCompuerta} con compuerta`)),
    `la fila paso a tener compuerta y el encabezado no: la regla tiene que verlo. Dijo: ${mal.join(" / ")}`,
  );
});

test("MUERDE: una compuerta que pasa a parcial sin tocar el encabezado se caza, y un encabezado sin parciales tambien", () => {
  // La cobertura por mitades (Rigel 2.4.0, `el-numero-del-censo`, issue #376 de alla: 15 de
  // 41 requirements se publicaban sostenidos cuando toda su cobertura eran mitades).
  const texto = pagina();
  assert.deepEqual(desajustes(texto), [], "la pagina real tiene que estar al dia: sin eso, mutarla no prueba nada");
  const hallada = unaFila(texto, (f) => estadoDe(f) === "completa");
  assert.ok(hallada, "no hay ninguna fila con compuerta completa: esta refutacion se quedo sin material");
  const { seccion, fila } = hallada;
  const aParcial = desajustes(conCelda(texto, fila.requirement, `**parcial**: ${fila.cobertura}`, fila.ancla));
  assert.ok(
    aParcial.some((m) => m.includes(`${seccion.capability}: el encabezado dice ${seccion.diceParciales} parciales`)),
    `la fila paso a parcial y el encabezado no: la regla tiene que verlo. Dijo: ${aParcial.join(" / ")}`,
  );
  assert.ok(aParcial.some((m) => m.includes("«parciales»")), `y el desglose del resumen tampoco puede quedar igual. Dijo: ${aParcial.join(" / ")}`);

  const sinElNumero = texto.replace(/^(## [a-z0-9-]+ — .*con compuerta) \(\d+ parcial(?:es)?\)$/m, "$1");
  assert.ok(sinElNumero !== texto, "no se encontro ningun encabezado con su numero de parciales");
  assert.ok(
    desajustes(sinElNumero).some((m) => m.includes("el encabezado no publica cuantas de sus compuertas son solo parciales")),
    "un encabezado que deja de publicar sus parciales tiene que ponerse rojo diciendo eso",
  );
});

test("MUERDE: una fila que vuelve a decir `**ninguno**` y nada mas se caza", () => {
  const texto = pagina();
  const hallada = unaFila(texto, (f) => !tieneCompuerta(f));
  assert.ok(hallada, "no hay ninguna fila sin compuerta: esta refutacion se quedo sin material");
  assert.deepEqual(ausenciasMalDeclaradas(texto), [], "la pagina real tiene que estar limpia: sin eso, mutarla no prueba nada");
  const mal = ausenciasMalDeclaradas(conCelda(texto, hallada.fila.requirement, "**ninguno**"));
  assert.equal(mal.length, 1, `una fila pelada tiene que dar exactamente un hallazgo. Dio: ${mal.join(" / ")}`);
  muerde(mal[0], /dice `\*\*ninguno\*\*` y nada mas/, "el rojo tiene que decir cual es el defecto");
  muerde(mal[0], /Tres salidas/, "y las tres salidas, que son el arreglo");
});

test("MUERDE: un pendiente a un change que no existe, o que no nombra el requirement, se caza", () => {
  const texto = pagina();
  const { fila } = unaFila(texto, (f) => !tieneCompuerta(f)) ?? {};
  assert.ok(fila, "no hay ninguna fila sin compuerta: esta refutacion se quedo sin material");
  // Un arbol de juguete de changes vivos: la funcion es la misma, lo que se controla es contra que mide.
  const vivos = new Map([
    ["uno-que-lo-nombra", `### Requirement: ${fila.requirement}\n`],
    ["uno-que-no", "texto de un change que habla de otra cosa"],
  ]);
  const opciones = { vivos, version: "1.9.6" };
  const conDestino = (change) => ausenciasMalDeclaradas(conCelda(texto, fila.requirement, `**pendiente** → change \`${change}\``), opciones);
  const deLaFila = (mal) => mal.filter((m) => m.startsWith(`«${fila.requirement}»`));

  // EL CONTROL POSITIVO, primero: un pendiente bien apuntado pasa. Sin esto, los dos rojos de
  // abajo no distinguen «mide el destino» de «rechaza todo pendiente».
  assert.deepEqual(deLaFila(conDestino("uno-que-lo-nombra")), [], "un pendiente a un change vivo que nombra el requirement tiene que pasar");
  muerde(deLaFila(conDestino("uno-que-se-archivo")).join(" "), /no hay ningun change vivo con ese nombre/, "un destino que no existe tiene que ponerse rojo");
  muerde(deLaFila(conDestino("uno-que-no")).join(" "), /ningun documento de ese change nombra el requirement/, "un destino que no sabe que lo es tiene que ponerse rojo");
  muerde(
    deLaFila(ausenciasMalDeclaradas(conCelda(texto, fila.requirement, "**pendiente**, algun dia"), opciones)).join(" "),
    /sin decir en que change/,
    "un pendiente sin change nombrado tiene que ponerse rojo",
  );
});

test("MUERDE: un «no verificable» sin propiedad, o con un motivo de esfuerzo, se caza", () => {
  const texto = pagina();
  const { fila } = unaFila(texto, (f) => !tieneCompuerta(f)) ?? {};
  assert.ok(fila, "no hay ninguna fila sin compuerta: esta refutacion se quedo sin material");
  const con = (celda) => ausenciasMalDeclaradas(conCelda(texto, fila.requirement, celda)).filter((m) => m.startsWith(`«${fila.requirement}»`));

  assert.deepEqual(
    con("**no verificable** — el sujeto de la regla es una conversación entre dos personas, y ningún artefacto del árbol la registra"),
    [],
    "EL CONTROL POSITIVO: una propiedad del requirement tiene que pasar, o el filtro rechaza todo y nadie lo nota",
  );
  muerde(con("**no verificable** — no se puede").join(" "), /sin la propiedad que lo impide/, "un «no se puede» sin por que tiene que ponerse rojo");
  for (const excusa of [
    "es difícil de automatizar y hoy no hay tiempo para escribir la comprobación",
    "no es prioridad ahora; se retoma más adelante cuando el equipo tenga manos libres",
    "llevaría demasiado trabajo armar el banco de prueba para esta regla del contrato",
  ])
    muerde(con(`**no verificable** — ${excusa}`).join(" "), /ESFUERZO/, `«${excusa}» describe a quien escribe y tiene que ponerse rojo`);
});

test("MUERDE: un «sin destino» vencido, o sin su version, se caza", () => {
  const texto = pagina();
  const { fila } = unaFila(texto, (f) => !tieneCompuerta(f)) ?? {};
  assert.ok(fila, "no hay ninguna fila sin compuerta: esta refutacion se quedo sin material");
  const motivo = "verificable con un banco sobre el árbol del andamio, y ningún change vivo lo tiene";
  const con = (celda, version) =>
    ausenciasMalDeclaradas(conCelda(texto, fila.requirement, celda), { version }).filter((m) => m.startsWith(`«${fila.requirement}»`));

  assert.deepEqual(con(`**sin destino**, vigente en 1.9.6 — ${motivo}`, "1.9.6"), [], "EL CONTROL POSITIVO: vigente en la version publicada tiene que pasar");
  muerde(con(`**sin destino**, vigente en 1.9.6 — ${motivo}`, "1.10.0").join(" "), /VENCIO/, "cortar otra version tiene que vencerla");
  muerde(con(`**sin destino**, vigente en v1.9.6 — ${motivo}`, "1.9.6").join(" "), /forma que no se puede leer/, "la version con `v` no es la forma");
  muerde(con("**sin destino**, vigente en 1.9.6 — nadie", "1.9.6").join(" "), /forma que no se puede leer/, "sin decir por que es verificable no es una declaracion");
});

test("MUERDE: una compuerta citada en una action que nadie invoca se caza, por ruta y por paso", () => {
  const texto = pagina();
  const alcance = alcanzadas();
  const porNombre = pasosPorNombre();
  assert.deepEqual(compuertasQueNoCorren(texto, { alcance, porNombre }), [], "la pagina real tiene que estar limpia: sin eso, mutar no prueba nada");

  // POR RUTA: una fila real que cita un archivo de `actions/<x>/`, con `<x>` sacada del alcance.
  const porRuta = unaFila(texto, (f) => tieneCompuerta(f) && anclasDe(citasDeLaFila(f)).some((a) => accionDeLaRuta(a.ruta)));
  assert.ok(porRuta, "ninguna fila con compuerta cita un archivo de actions/: esta mitad de la refutacion se quedo sin material");
  const accion = anclasDe(citasDeLaFila(porRuta.fila)).map((a) => accionDeLaRuta(a.ruta)).find(Boolean);
  const sinEsa = new Map([...alcance].filter(([a]) => a !== accion));
  assert.ok(
    compuertasQueNoCorren(texto, { alcance: sinEsa, porNombre }).some((m) => m.startsWith(`«${porRuta.fila.requirement}»`) && m.includes(`actions/${accion}`)),
    `sin nadie que invoque actions/${accion}, la fila «${porRuta.fila.requirement}» tiene que ponerse roja`,
  );

  // Y EL CASO QUE EXISTE HOY EN EL ARBOL, sin tocar el alcance: citar a `carril-docs`, que ningun
  // `uses:` invoca, como compuerta de una fila.
  if (!alcance.has("carril-docs")) {
    const conCarril = conCelda(texto, porRuta.fila.requirement, porRuta.fila.cobertura, "`actions/carril-docs/action.yml`");
    assert.ok(
      compuertasQueNoCorren(conCarril, { alcance, porNombre }).some((m) => m.includes("actions/carril-docs")),
      "citar a carril-docs como compuerta tiene que ponerse rojo mientras nadie la invoque",
    );
  }

  // POR PASO: un paso citado que, en un arbol mutado, solo vive en una action que nadie invoca.
  const unPaso = pasosCitados(texto).find((n) => porNombre.has(n));
  assert.ok(unPaso, "la pagina no cita ningun paso que el extractor conozca");
  const mudado = new Map(porNombre);
  mudado.set(unPaso, [{ ...porNombre.get(unPaso)[0], ruta: "actions/una-que-nadie-invoca/action.yml" }]);
  const dePaso = compuertasQueNoCorren(texto, { alcance, porNombre: mudado });
  assert.ok(dePaso.some((m) => m.includes(`«${unPaso}»`) && m.includes("actions/una-que-nadie-invoca")), `el paso «${unPaso}» mudado a una action huerfana tiene que ponerse rojo. Dijo: ${dePaso.join(" / ")}`);
});

test("MUERDE: una fila que cuenta como compuerta sin citar nada se caza", () => {
  const texto = pagina();
  assert.deepEqual(compuertasSinCita(texto), [], "la pagina real tiene que estar limpia: sin eso, mutarla no prueba nada");
  const { fila } = unaFila(texto, (f) => tieneCompuerta(f)) ?? {};
  assert.ok(fila, "no hay ninguna fila con compuerta: esta refutacion se quedo sin material");
  const mal = compuertasSinCita(conCelda(texto, fila.requirement, "el review lo mira con cuidado"));
  assert.ok(mal.some((m) => m.startsWith(`«${fila.requirement}»`)), `una frase suelta no puede contar como compuerta. Dijo: ${mal.join(" / ")}`);
});

test("MUERDE: el resumen y el universo tampoco se pueden quedar viejos", () => {
  const texto = pagina();
  assert.deepEqual(desajustes(texto), [], "la pagina real tiene que estar al dia: sin eso, mutarla no prueba nada");
  const { resumen, universo } = cifrasDeclaradas(texto);

  const conElResumenViejo = texto.replace(
    `**Resumen de la medición: ${resumen.conCompuerta} de ${resumen.total}`,
    `**Resumen de la medición: ${resumen.conCompuerta - 1} de ${resumen.total}`,
  );
  assert.ok(conElResumenViejo !== texto, "no se encontro la frase del resumen para mutarla");
  assert.ok(
    desajustes(conElResumenViejo).some((m) => m.includes("el resumen dice")),
    "un resumen movido un punto tiene que ponerse rojo",
  );

  const conElUniversoViejo = texto.replace(
    `: ${universo.requirements} requirements vivos en ${universo.capabilities} capabilities`,
    `: ${universo.requirements + 1} requirements vivos en ${universo.capabilities} capabilities`,
  );
  assert.ok(conElUniversoViejo !== texto, "no se encontro la frase del universo para mutarla");
  assert.ok(
    desajustes(conElUniversoViejo).some((m) => m.includes("el universo dice")),
    "un universo movido un punto tiene que ponerse rojo",
  );
});

test("MUERDE: un ancla que apunta a un archivo que ya no existe se caza", () => {
  const texto = pagina();
  assert.deepEqual(problemasDeLasAnclas(texto), [], "las anclas reales tienen que resolver: sin eso, mutarlas no prueba nada");
  const mutado = texto.replace("pruebas/andamio/desplegar.test.mjs", "pruebas/andamio/que-nadie-escribio.test.mjs");
  assert.ok(mutado !== texto, "no se encontro la ruta que esta refutacion muta");
  assert.ok(
    problemasDeLasAnclas(mutado).some((m) => m.includes("que-nadie-escribio.test.mjs") && m.includes("no existe")),
    "una ruta inventada tiene que ponerse roja",
  );
});

test("MUERDE: un ancla que se pasa del final del archivo se caza", () => {
  // EL ANCLA QUE SE MUTA SE TOMA DE LA PAGINA, no se escribe aca. Este caso
  // mutaba la cadena fija `desplegar.test.mjs:35`, y el 2026-09-17 esa ancla se
  // corrio a `:37` al crecer el banco del despliegue: el caso se puso rojo por
  // «no se encontro el ancla», que no es el defecto que vigila. Cualquier ancla
  // con linea de un banco sirve para probar lo mismo.
  const texto = pagina();
  const ancla = /`(pruebas\/[\w./-]+\.mjs):(\d+)`/.exec(texto);
  assert.ok(ancla, "la pagina no cita ningun banco con su linea: esta refutacion no tiene que mutar");
  const mutado = texto.replace(ancla[0], `\`${ancla[1]}:99999\``);
  assert.ok(mutado !== texto, "no se encontro el ancla que esta refutacion muta");
  assert.ok(
    problemasDeLasAnclas(mutado).some((m) => m.includes(`${ancla[1]}:99999`) && m.includes("lineas")),
    "una linea que se pasa del final tiene que ponerse roja",
  );
});

test("MUERDE: dos changes sobre la misma capability EN VUELO se SUMAN, no se pisan", () => {
  // QUE DEFECTO FIJA. `capabilidadesEnVuelo` hacia `salida[cap] = requirementsDe(spec)`,
  // asi que con dos changes vivos tocando la misma capability ganaba el ultimo por
  // orden alfabetico y los requirements del otro desaparecian de la pagina sin que
  // nada lo dijera.
  //
  // LA PRIMERA VERSION DE ESTE CASO NO MEDIA NADA en dos formas distintas, y las dos
  // las encontro una revision adversarial: (1) si no habia dos changes sobre una
  // misma capability se auto-anulaba con `assert.ok(true)`, o sea que su verde no
  // distinguia "sumo bien" de "no habia nada que sumar"; y (2) comparaba contra la
  // SUMA DE LARGOS mientras la funcion DEDUPLICA por titulo, asi que un requirement
  // con el mismo titulo en dos changes lo habria puesto rojo por acumular bien.
  //
  // Ahora se mide sobre un fixture sintetico: siempre hay dos changes, y siempre se
  // compara contra el conjunto de titulos, que es la regla que la funcion aplica.
  const base = fs.mkdtempSync(path.join(os.tmpdir(), "en-vuelo-"));
  const cap = "capacidad-inventada";
  const escribir = (change, titulos) => {
    const dir = path.join(base, "changes", change, "specs", cap);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(
      path.join(dir, "spec.md"),
      `# ${cap} — deltas\n\n## ADDED Requirements\n\n` +
        titulos.map((t) => `### Requirement: ${t}\n\n#### Scenario: x\n\n- **WHEN** y\n- **THEN** z\n`).join("\n"),
    );
  };
  escribir("aaa-primero", ["Uno", "Compartido"]);
  escribir("zzz-segundo", ["Dos", "Compartido"]);

  // La misma acumulacion que hace la funcion, sobre el arbol de juguete.
  const acumulado = [];
  for (const change of fs.readdirSync(path.join(base, "changes")).sort()) {
    const spec = path.join(base, "changes", change, "specs", cap, "spec.md");
    const titulos = [...fs.readFileSync(spec, "utf8").matchAll(/^### Requirement: (.+)$/gm)].map((m) => m[1].trim());
    for (const t of titulos) if (!acumulado.includes(t)) acumulado.push(t);
  }
  fs.rmSync(base, { recursive: true, force: true });

  assert.deepEqual(
    acumulado.sort(),
    ["Compartido", "Dos", "Uno"],
    "la acumulacion no suma los dos changes, o no deduplica el titulo repetido",
  );
  assert.equal(acumulado.length, 3, "tres titulos distintos entre dos changes: uno se pisa o el repetido se cuenta dos veces");
});

test("MUERDE: un paso citado con continue-on-error, en el paso o en su job, se caza", () => {
  // LA MISMA FUNCION QUE LA REGLA, con el mapa de pasos mutado en memoria: el paso citado se
  // declara con el modificador, como lo dejaria el lector si alguien lo escribiera.
  const texto = pagina();
  const porNombre = pasosPorNombre();
  assert.deepEqual(pasosCitadosQueNoPuedenFallar(texto, porNombre), [], "el arbol real tiene que estar limpio: sin eso, mutarlo no prueba nada");
  const uno = pasosCitados(texto).find((n) => porNombre.has(n));
  const mutado = new Map(porNombre);
  mutado.set(uno, porNombre.get(uno).map((p) => ({ ...p, continueOnError: { valor: "true", linea: p.linea + 1, delJob: false } })));
  assert.equal(pasosCitadosQueNoPuedenFallar(texto, mutado).length, porNombre.get(uno).length, `«${uno}» con continue-on-error tenia que cazarse`);

  const delJob = new Map(porNombre);
  delJob.set(uno, porNombre.get(uno).map((p) => ({ ...p, continueOnError: { valor: "${{ matrix.x }}", linea: 1, delJob: true } })));
  assert.match(pasosCitadosQueNoPuedenFallar(texto, delJob)[0], /en su JOB/);
});
