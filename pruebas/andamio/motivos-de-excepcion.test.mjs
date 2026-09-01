// EL MOTIVO DE UNA EXCEPCION DEL CI NO PUEDE NOMBRAR UNA PIEZA QUE NO EXISTE.
//
// EL DEFECTO QUE ESTE BANCO CIERRA, medido el 2026-08-31 generando las dos
// formas con `herramientas/projects-init.mjs`. El paso «Todo paquete declara los
// scripts de verificacion» de `plantilla/.github/workflows/ci.yml` saca al
// paquete E2E de `test` y de `build`, y el motivo escrito al lado decia que la
// suite corria en «el workflow de promocion, no el CI del PR». Ese archivo NO
// EXISTE: la forma "aplicacion" —la unica que recibe el paquete E2E— se lleva
// `actualizar-marco.yml`, `ci.yml` y `claude.yml`, y ninguno publica nada; la
// unica forma que recibe `desplegar.yml` es "sitio", que a su vez no recibe el
// paquete E2E. O sea que la suite viaja a todo proyecto con forma de aplicacion
// y NO LA CORRE NADIE, NUNCA, y el motivo que lo tapaba se lee razonable.
//
// POR QUE UNA EXCEPCION SIN MOTIVO COMPROBABLE NO SE CAE SOLA. El propio paso ya
// se defiende de las dos equivocaciones que puede tener la LISTA: si falta una
// excepcion el CI pide el script, y si sobra falla por excepcion muerta. Lo que
// nada miraba es el MOTIVO, que es justamente lo unico que decide si la
// excepcion sigue estando bien. Un motivo que apunta a una pieza inexistente
// sobrevive a cualquier revision porque suena bien y nadie abre la carpeta.
//
// LA REGLA, y por que esta forma y no otra. Toda pieza que el motivo nombre
// tiene que ser un archivo que el andamio REPARTE a la forma que recibe el
// paquete exceptuado. Se cierra por los dos lados:
//   (a) todo `<algo>.yml` que el motivo nombre tiene que viajar a esa forma
//       —nombrar `desplegar.yml` seria igual de falso, porque ese archivo va a
//       la unica forma que no recibe el paquete—;
//   (b) si el motivo usa la palabra "workflow" tiene que nombrar al menos un
//       archivo, porque una referencia sin archivo no se puede comprobar y es
//       exactamente la forma en que «el de promocion» sobrevivio.
//
// QUE VIAJA A CADA FORMA NO SE ESCRIBE ACA: se le pregunta a `noViajanPorForma`
// y a `paquetesDelAndamio`, que son las MISMAS funciones que usa el copiador. Un
// banco que reimplementara el filtro estaria comprobando su propia copia.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { FORMAS, noViajanPorForma, paquetesDelAndamio, seExcluyeDelCopiado } from "../../herramientas/projects-init.mjs";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const ANDAMIO = path.join(RAIZ, "plantilla");
const CI = path.join(ANDAMIO, ".github", "workflows", "ci.yml");
const DIR_WORKFLOWS = path.join(ANDAMIO, ".github", "workflows");

const ci = () => fs.readFileSync(CI, "utf8");

/** Las excepciones del paso, cada una con su motivo pegado en una sola cadena.
 *
 *  Se lee por sangria de comentario y no con un parser de YAML por la misma
 *  razon que `pruebas/andamio/workflows.mjs`: el archivo trae marcadores de
 *  doble llave que un parser lee como un mapa en flujo y rechaza. Ademas el
 *  motivo VIVE EN LOS COMENTARIOS, que es justo lo que un parser tira.
 *
 *  La entrada abre con `#   {{MARCADOR}}:script ->` (tres espacios detras del
 *  numeral) y sigue en las lineas de cinco espacios. Cualquier otra linea la
 *  cierra. */
export function excepcionesConMotivo(texto = ci()) {
  const entradas = [];
  let actual = null;
  for (const linea of texto.split("\n")) {
    const abre = linea.match(/^\s*#\s{3}\{\{([A-Z0-9_]+)\}\}:(\S+)\s*->\s*(.*)$/);
    if (abre) {
      actual = { marcador: abre[1], script: abre[2], partes: [abre[3]] };
      entradas.push(actual);
      continue;
    }
    const sigue = linea.match(/^\s*#\s{5}(\S.*)$/);
    if (actual && sigue) {
      actual.partes.push(sigue[1]);
      continue;
    }
    actual = null;
  }
  return entradas.map(({ marcador, script, partes }) => ({ marcador, script, motivo: partes.join(" ") }));
}

/** Los workflows que el andamio le reparte a una forma. Se pregunta con
 *  `seExcluyeDelCopiado`, que es la funcion que decide la copia de verdad. */
export function workflowsQueViajan(forma) {
  return fs
    .readdirSync(DIR_WORKFLOWS)
    .filter((n) => /\.ya?ml$/.test(n))
    .filter((n) => !seExcluyeDelCopiado(`.github/workflows/${n}`, "aws", forma))
    .sort();
}

/** Las formas que reciben la carpeta de un paquete del andamio. */
export function formasQueReciben(carpeta) {
  return FORMAS.filter((f) => !noViajanPorForma(f).includes(carpeta));
}

/** Los problemas del motivo de una excepcion, dados los workflows admitidos.
 *
 *  Se devuelve una lista y no un booleano para que el mensaje diga QUE pieza
 *  esta mal nombrada: un rojo que no nombra la pieza obliga a repetir la
 *  medicion a mano. */
export function problemasDelMotivo(motivo, admitidos) {
  const problemas = [];
  const nombrados = [...motivo.matchAll(/\b([A-Za-z0-9][A-Za-z0-9._-]*\.ya?ml)\b/g)].map((m) => m[1]);
  for (const archivo of nombrados) {
    if (!admitidos.includes(archivo)) {
      problemas.push(`nombra "${archivo}", que el andamio no le reparte a esa forma (le reparte: ${admitidos.join(", ")})`);
    }
  }
  if (/\bworkflows?\b/i.test(motivo) && nombrados.length === 0) {
    problemas.push('habla de un "workflow" y no nombra ningun archivo: una pieza sin archivo no se puede comprobar');
  }
  // (c) EL TERCER LADO, y es el unico que envejece hacia el verde. Un motivo
  // que ENUMERA lo que la forma recibe —«recibe actualizar-marco.yml, ci.yml y
  // claude.yml, y ninguno publica nada»— apoya la excepcion en que la lista este
  // COMPLETA: el dia que el andamio le reparta un cuarto workflow a esa forma,
  // cada nombre escrito sigue siendo cierto uno por uno y la conclusion pasa a
  // ser falsa. Es exactamente la forma del defecto que este banco cierra —una
  // justificacion que sobrevive a lo que la justificaba—, solo que por omision
  // en vez de por invencion, asi que se cierra igual y en la misma funcion.
  const faltan = admitidos.filter((a) => !nombrados.includes(a));
  if (nombrados.length >= 2 && faltan.length > 0) {
    problemas.push(`enumera los workflows de esa forma y se saltea ${faltan.join(", ")}: una lista incompleta concluye de mas`);
  }
  return problemas;
}

// ---------------------------------------------------------------------------
// LAS GUARDAS DEL PROPIO BANCO: sin esto, todo lo de abajo pasa vacio.
// ---------------------------------------------------------------------------

test("hay excepciones con motivo que revisar: un cero aca es este banco roto", () => {
  const encontradas = excepcionesConMotivo();
  assert.ok(
    encontradas.length >= 2,
    `se leyeron ${encontradas.length} excepciones con motivo en ${path.relative(RAIZ, CI)} y el paso declara al menos dos. ` +
      "Si el bloque cambio de forma, este banco dejo de mirar el motivo y hay que reajustar el lector, no bajar el piso.",
  );
  for (const e of encontradas) {
    assert.ok(e.motivo.trim().length > 0, `la excepcion ${e.marcador}:${e.script} quedo sin motivo escrito`);
  }
});

test("cada excepcion apunta a un paquete que el andamio reparte, y a alguna forma", () => {
  // Si el marcador no correspondiera a ningun paquete del andamio, «la forma que
  // recibe el paquete» seria el conjunto vacio y la regla de abajo no admitiria
  // ningun workflow: pasaria roja por el motivo equivocado.
  const paquetes = paquetesDelAndamio(ANDAMIO);
  assert.ok(Object.keys(paquetes).length > 0, "paquetesDelAndamio no encontro ningun paquete: el lector esta roto");
  for (const e of excepcionesConMotivo()) {
    const carpeta = paquetes[e.marcador];
    assert.ok(carpeta, `la excepcion nombra {{${e.marcador}}} y el andamio no reparte ningun paquete con ese marcador`);
    assert.ok(
      formasQueReciben(carpeta).length > 0,
      `ninguna forma recibe "${carpeta}/": una excepcion sobre un paquete que nadie recibe es una excepcion muerta`,
    );
  }
});

test("los workflows que viajan a cada forma se leyeron, y no son los mismos", () => {
  // El contraste ES el hallazgo: si las dos formas recibieran lo mismo, la regla
  // de abajo no distinguiria nada y pasaria verde sin mirar.
  const porForma = Object.fromEntries(FORMAS.map((f) => [f, workflowsQueViajan(f)]));
  for (const [forma, lista] of Object.entries(porForma)) {
    assert.ok(lista.length > 0, `la forma "${forma}" no recibe ningun workflow: el lector del andamio esta roto`);
  }
  assert.notDeepEqual(
    porForma.aplicacion,
    porForma.sitio,
    "las dos formas reciben exactamente los mismos workflows. O el andamio dejo de repartir distinto —y entonces " +
      "esta regla ya no distingue nada— o `seExcluyeDelCopiado` dejo de filtrar por forma.",
  );
});

// ---------------------------------------------------------------------------
// LA REGLA
// ---------------------------------------------------------------------------

test("ningun motivo de excepcion nombra una pieza que el andamio no le reparte a esa forma", () => {
  const paquetes = paquetesDelAndamio(ANDAMIO);
  const mal = [];
  for (const e of excepcionesConMotivo()) {
    const admitidos = [...new Set(formasQueReciben(paquetes[e.marcador]).flatMap(workflowsQueViajan))].sort();
    for (const problema of problemasDelMotivo(e.motivo, admitidos)) {
      mal.push(`${e.marcador}:${e.script} — ${problema}`);
    }
  }
  assert.deepEqual(
    mal,
    [],
    "el motivo escrito al lado de una excepcion es lo unico que impide que la excepcion sobreviva a lo que la " +
      "justificaba. Si nombra una pieza que el proyecto no recibe, la excepcion queda tapando un agujero que ya " +
      `nadie ve — que es como la suite E2E viajo sin correrse nunca.\n  ${mal.join("\n  ")}`,
  );
});

test("MUERDE: el motivo viejo, el que mandaba la suite a una corrida de promocion, se caza", () => {
  // LA MUTACION CORRE LA MISMA FUNCION QUE LA REGLA. No se comprueba que un
  // regex deje de matchear: se le pasa a `problemasDelMotivo` el texto EXACTO
  // que el archivo traia antes de este arreglo, con los mismos admitidos que la
  // regla calcula hoy, y se exige que devuelva un problema.
  const paquetes = paquetesDelAndamio(ANDAMIO);
  const carpeta = paquetes.PAQUETE_E2E;
  assert.ok(carpeta, "el andamio dejo de repartir un paquete {{PAQUETE_E2E}}: sin el, esta mutacion no mide nada");
  const admitidos = [...new Set(formasQueReciben(carpeta).flatMap(workflowsQueViajan))].sort();
  assert.ok(admitidos.length > 0, "sin workflows admitidos la mutacion daria rojo por el motivo equivocado");

  const MOTIVO_VIEJO = "la suite E2E corre con navegadores contra un ambiente ya desplegado; su workflow es el de promocion, no el CI del PR.";
  assert.deepEqual(problemasDelMotivo(MOTIVO_VIEJO, admitidos), [
    'habla de un "workflow" y no nombra ningun archivo: una pieza sin archivo no se puede comprobar',
  ]);

  // Y el motivo que HOY tiene el archivo pasa: sin este control la mutacion de
  // arriba podria estar cazando cualquier cosa.
  const vigente = excepcionesConMotivo().find((e) => e.marcador === "PAQUETE_E2E" && e.script === "test");
  assert.ok(vigente, "no se encontro la excepcion {{PAQUETE_E2E}}:test: el lector dejo de ver el bloque");
  assert.deepEqual(problemasDelMotivo(vigente.motivo, admitidos), []);
});

test("MUERDE: una enumeracion a la que le falta un workflow de esa forma tambien se caza", () => {
  // El tercer lado de la regla. El motivo vigente enumera lo que la forma
  // "aplicacion" recibe para concluir que ninguno publica nada; si esa lista
  // queda corta, cada nombre sigue siendo cierto y la conclusion no. Se le saca
  // uno a la enumeracion y se le pasa a `problemasDelMotivo` —la MISMA funcion
  // que corre la regla— con los admitidos que la regla calcula hoy.
  const paquetes = paquetesDelAndamio(ANDAMIO);
  const admitidos = [...new Set(formasQueReciben(paquetes.PAQUETE_E2E).flatMap(workflowsQueViajan))].sort();
  assert.ok(admitidos.length >= 2, "con menos de dos workflows admitidos esta mutacion se quedaria sin material");

  const vigente = excepcionesConMotivo().find((e) => e.marcador === "PAQUETE_E2E" && e.script === "test");
  const nombrados = admitidos.filter((a) => vigente.motivo.includes(a));
  assert.ok(
    nombrados.length === admitidos.length,
    `el motivo vigente tiene que enumerar los ${admitidos.length} workflows de esa forma para que esta mutacion mida algo; ` +
      `enumera ${nombrados.length}`,
  );

  for (const sacado of admitidos) {
    const corto = vigente.motivo.split(sacado).join("otra-cosa.txt");
    const problemas = problemasDelMotivo(corto, admitidos);
    assert.ok(
      problemas.some((p) => p.includes("se saltea") && p.includes(sacado)),
      `sacar ${sacado} de la enumeracion tendria que ser rojo. Dijo: ${problemas.join(" / ")}`,
    );
  }
});

test("MUERDE: nombrar el workflow de despliegue, que va a la OTRA forma, tambien se caza", () => {
  // El segundo lado de la regla, y el que un arreglo apurado podria haber
  // escrito: decir que la suite corre en `desplegar.yml`. Ese archivo existe,
  // asi que un control que solo mirara "el archivo existe" pasaria verde — y
  // seria igual de falso, porque viaja a la unica forma que NO recibe la suite.
  const paquetes = paquetesDelAndamio(ANDAMIO);
  const admitidos = [...new Set(formasQueReciben(paquetes.PAQUETE_E2E).flatMap(workflowsQueViajan))].sort();

  const deLaOtraForma = FORMAS.flatMap(workflowsQueViajan).filter((w) => !admitidos.includes(w));
  assert.ok(
    deLaOtraForma.length > 0,
    "no hay ningun workflow que viaje a una forma y no a la del paquete E2E: esta mutacion se quedo sin material",
  );
  for (const workflow of deLaOtraForma) {
    assert.equal(
      problemasDelMotivo(`la suite corre en el workflow ${workflow}, no en el CI del PR.`, admitidos).length,
      1,
      `nombrar ${workflow} tendria que ser rojo: no viaja a la forma que recibe el paquete E2E`,
    );
  }
});
