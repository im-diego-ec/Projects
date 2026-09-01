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
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

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
    const enc = linea.match(/^## ([a-z0-9-]+) — (capability EN VUELO, )?(\d+) requirements?, (\d+) con compuerta\s*$/);
    if (enc) {
      actual = {
        capability: enc[1],
        enVuelo: Boolean(enc[2]),
        diceRequirements: Number(enc[3]),
        diceConCompuerta: Number(enc[4]),
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
    actual.filas.push({ requirement: c[0], cobertura: c[1] });
  }
  return secciones;
}

/** Una fila cuenta como CON compuerta salvo que diga `ninguno` y nada mas.
 *
 *  «parcial» cuenta como compuerta a proposito y la pagina lo declara: dice que
 *  existe al menos un camino por el que ese requirement pone algo en rojo solo,
 *  no que este cubierto entero. */
export const tieneCompuerta = (fila) => !/^\*\*ninguno\*\*/.test(fila.cobertura);

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
 *  habia dos. */
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
      salida[cap] = requirementsDe(spec);
    }
  }
  return salida;
}

// ---------------------------------------------------------------------------
// LAS ANCLAS: `ruta/archivo.ext:linea`, y las que heredan la ruta de al lado.
// ---------------------------------------------------------------------------

/** Una ruta del repositorio con extension conocida, con su linea opcional. */
const RUTA = /((?:[\w.@-]+\/)+[\w.@-]+\.(?:mjs|yml|yaml|md|json))(?::(\d+)(?:-(\d+))?)?/g;

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
  return {
    enVuelo: enVuelo ? Number(enVuelo[1]) : null,
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
    if (s.diceRequirements !== s.filas.length)
      mal.push(`${s.capability}: el encabezado dice ${s.diceRequirements} requirements y la tabla tiene ${s.filas.length} filas`);
    if (s.diceConCompuerta !== conCompuerta)
      mal.push(`${s.capability}: el encabezado dice ${s.diceConCompuerta} con compuerta y las filas dan ${conCompuerta}`);
  }

  // El universo y el resumen hablan SOLO del contrato vivo: las capabilities en
  // vuelo se listan aparte justamente porque todavia no son contrato.
  const delContrato = secciones.filter((s) => !s.enVuelo);
  const totalFilas = delContrato.reduce((n, s) => n + s.filas.length, 0);
  const totalCon = delContrato.reduce((n, s) => n + s.filas.filter(tieneCompuerta).length, 0);
  const { universo, desglose, resumen, enVuelo: diceEnVuelo } = cifrasDeclaradas(texto);

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
});

test("el lector de las cifras encuentra las tres frases que vigila", () => {
  // Una frase que se reescribe y deja de matchear apagaria su control sin un
  // solo rojo, que es el modo de falla exacto que este banco persigue.
  const { universo, desglose, resumen, enVuelo } = cifrasDeclaradas(pagina());
  assert.ok(universo, "no se encontro la frase del universo");
  assert.ok(desglose && desglose.length >= 8, "no se encontro el desglose por capability");
  assert.ok(resumen, "no se encontro la frase del resumen");
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

test("MUERDE: un conteo del encabezado escrito a mano que se queda viejo se caza", () => {
  // El defecto (a): una fila pasa de `ninguno` a tener compuerta y el encabezado
  // sigue donde estaba. Se muta la pagina al reves —el encabezado se queda y la
  // fila cambia— porque el desajuste es el mismo y no hay que inventar ninguna
  // compuerta que no exista.
  const texto = pagina();
  const seccion = seccionesDeLaPagina(texto).find((s) => s.filas.some((f) => !tieneCompuerta(f)));
  assert.ok(seccion, "no hay ninguna fila que diga `ninguno`: esta refutacion se quedo sin material");
  const fila = seccion.filas.find((f) => !tieneCompuerta(f));
  const mutado = texto.replace(`| ${fila.requirement} | **ninguno** |`, `| ${fila.requirement} | una compuerta inventada |`);
  assert.ok(mutado !== texto, `no se encontro la fila «${fila.requirement}» con su \`ninguno\``);
  const mal = desajustes(mutado);
  assert.ok(
    mal.some((m) => m.includes(`${seccion.capability}: el encabezado dice ${seccion.diceConCompuerta} con compuerta`)),
    `la fila paso a tener compuerta y el encabezado no: la regla tiene que verlo. Dijo: ${mal.join(" / ")}`,
  );
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
  const texto = pagina();
  const mutado = texto.replace("`pruebas/andamio/desplegar.test.mjs:35`", "`pruebas/andamio/desplegar.test.mjs:99999`");
  assert.ok(mutado !== texto, "no se encontro el ancla que esta refutacion muta");
  assert.ok(
    problemasDeLasAnclas(mutado).some((m) => m.includes("desplegar.test.mjs:99999") && m.includes("lineas")),
    "una linea que se pasa del final tiene que ponerse roja",
  );
});
