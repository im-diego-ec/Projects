// ---------------------------------------------------------------------------
// LOS DOS LECTORES DE UN DESVIO DE PERMISO DICEN LO MISMO, Y ESTO LO ATA POR COMPORTAMIENTO
//
// LOS DOS LECTORES. Una entrada `{ permiso, motivo, aprobado_por, fecha }` de
// `.projects-desvios.json` la juzgan dos piezas:
//
//   · `clasificarDesvios` en `actions/constitucion/constitucion.mjs`, que la da por valida o
//     emite un ::error:: con su codigo;
//   · el programa inline del paso «Permisos del agente sin escritura» de marco-ci.yml, que la
//     usa para absorber un hallazgo del allowlist y AVISA —diciendo que la action ya lo da por
//     error— cuando la entrada esta a medias.
//
// POR QUE LA COPIA NO SE PUEDE MATAR, y por eso esto es un ancla y no un refactor. El segundo
// lector vive dentro del YAML de un workflow REUSABLE y corre en el arbol del CONSUMIDOR, que no
// tiene el codigo del marco a mano: no hay modulo que los dos puedan importar. El change
// `un-solo-predicado-del-desvio` los alineo a mano y dejo escrito que un cruce mecanico no se
// podia hacer; se puede, corriendo el paso REAL, y es lo que hace este banco.
//
// LA TECNICA VIENE DE RIGEL (2.6.0, commit ac55ddc de alla, issue #368): cuando el mismo
// predicado vive dos veces y no se puede compartir, se ata comparando COMPORTAMIENTO sobre una
// tabla de entradas, y no texto —exigir la misma cadena daria rojo por un espacio o un nombre de
// variable, sobre dos lectores que coinciden—. Alla era la normalizacion de una capa; aca es la
// validez de un desvio de permiso.
//
// Y CAZO DOS DIVERGENCIAS EL DIA QUE SE ESCRIBIO (2026-09-17), las dos en el arbol publicado:
//
//   · FECHA. El paso exigia que la fecha EXISTIERA (ida y vuelta por toISOString) creyendo que
//     asi validaba «como la action»; la action usa `esFecha`, que solo exige que Date.parse no
//     de NaN, y Date.parse acepta el 30 de febrero. Resultado: con "2026-02-30" el paso avisaba
//     «la action ya lo da por ERROR» y la action no daba nada. Un aviso que miente.
//   · REGLA Y PERMISO A LA VEZ. La action la rechaza (`desvio-ambiguo`); el paso la absorbia en
//     silencio, que es el fail-open que el change del predicado vino a cerrar.
//
// LO QUE NO ATA, declarado: los valores que no son cadena. La action los pasa por String() y el
// paso los descarta, asi que `"aprobado_por": 123` vale para una y no para el otro. Nadie los
// escribe a mano y la tabla es de lo que una persona escribe; queda anotado como pendiente del
// change `los-bancos-dicen-por-que`.
// ---------------------------------------------------------------------------

import test from "node:test";
import assert from "node:assert/strict";

import { scriptDelPaso } from "./extraer.mjs";
import { repoDeJuguete, escribir, commit, correrBash, limpiarTodo } from "./util.mjs";
import { clasificarDesvios } from "../../actions/constitucion/constitucion.mjs";
import { porque } from "../porque.mjs";

const PASO = "Permisos del agente sin escritura";
const script = scriptDelPaso(PASO);

// Las mismas tres claves que el paso declara en su bloque `env:`.
const ENV = {
  RUTA_ALLOWLIST: ".claude/settings.json",
  RUTA_VALORES: ".projects-valores.json",
  RUTA_DESVIOS: ".projects-desvios.json",
};

// Un permiso que el paso SIEMPRE denuncia desde el archivo de ajustes —que es compuerta en
// cualquier repo—, asi que lo unico que puede decidir el veredicto es el desvio de la tabla.
const PERMISO = "Bash(gh:*)";

const COMPLETO = {
  permiso: PERMISO,
  motivo: "la skill del release publica el release",
  aprobado_por: "quien-sea",
  fecha: "2026-09-10",
};
const sin = (clave) => {
  const copia = { ...COMPLETO };
  delete copia[clave];
  return copia;
};

/** Las grafias que una persona escribe a mano en un desvio de permiso. */
const CASOS = [
  ["completo", COMPLETO],
  ["fecha con espacios alrededor", { ...COMPLETO, fecha: "  2026-09-10  " }],
  ["aprobador con espacios alrededor", { ...COMPLETO, aprobado_por: "  quien-sea  " }],
  ["permiso con espacios alrededor", { ...COMPLETO, permiso: `  ${PERMISO}  ` }],
  ["sin aprobador", sin("aprobado_por")],
  ["aprobador en blanco", { ...COMPLETO, aprobado_por: "   " }],
  ["sin fecha", sin("fecha")],
  ["fecha vacia", { ...COMPLETO, fecha: "" }],
  ["mes 13", { ...COMPLETO, fecha: "2026-13-45" }],
  ["dia 32", { ...COMPLETO, fecha: "2026-01-32" }],
  ["30 de febrero", { ...COMPLETO, fecha: "2026-02-30" }],
  ["29 de febrero de un anio comun", { ...COMPLETO, fecha: "2026-02-29" }],
  ["29 de febrero de un bisiesto", { ...COMPLETO, fecha: "2024-02-29" }],
  ["31 de abril", { ...COMPLETO, fecha: "2026-04-31" }],
  ["fecha sin ceros", { ...COMPLETO, fecha: "2026-9-10" }],
  ["fecha con hora", { ...COMPLETO, fecha: "2026-09-10T00:00:00Z" }],
  ["fecha en formato local", { ...COMPLETO, fecha: "10/09/2026" }],
  ["sin motivo", sin("motivo")],
  ["motivo en blanco", { ...COMPLETO, motivo: "   " }],
  ["nombra tambien una regla", { ...COMPLETO, regla: "alguna-regla-del-canonico" }],
];

/** Lo que dice la action: valida si pasa a la lista de permisos sin ningun problema. */
function veredictoDeLaAction(entrada) {
  const { permisos, problemas } = clasificarDesvios([entrada], []);
  return { acepta: permisos.length === 1 && problemas.length === 0, detalle: problemas.map((p) => p.codigo) };
}

/**
 * Lo que dice el paso REAL: la acepta si el hallazgo del allowlist queda absorbido, el job sale
 * 0 y no hay NINGUN aviso sobre el archivo de desvios.
 *
 * EL AVISO SE LEE DEL TEXTO, y se dice por que: el paso estrena en modo aviso, asi que una
 * entrada a medias sale con exit 0 igual que una completa. La anotacion `::warning
 * file=.projects-desvios.json` es la UNICA diferencia observable entre las dos, y es la que el
 * consumidor ve en su PR. El rojo, en cambio, se lee del codigo de salida.
 */
function veredictoDelPaso(entrada, guion = script) {
  const raiz = repoDeJuguete("desvio-una-norma-");
  escribir(raiz, ".claude/settings.json", JSON.stringify({ permissions: { allow: [PERMISO] } }));
  escribir(raiz, ".projects-desvios.json", JSON.stringify({ desvios: [entrada] }, null, 2));
  commit(raiz, "caso");
  const { exit, salida } = correrBash(guion, { cwd: raiz, env: ENV });
  const avisa = /::warning file=\.projects-desvios\.json/.test(salida);
  const absorbe = /Permiso de escritura con desvio declarado/.test(salida);
  return { acepta: exit === 0 && absorbe && !avisa, detalle: `exit ${exit}, absorbe=${absorbe}, avisa=${avisa}`, salida };
}

function discrepancias(guion = script) {
  const malas = [];
  for (const [nombre, entrada] of CASOS) {
    const action = veredictoDeLaAction(entrada);
    const paso = veredictoDelPaso(entrada, guion);
    if (action.acepta !== paso.acepta) {
      malas.push(
        `${nombre} ${JSON.stringify(entrada)}: la action ${action.acepta ? "la ACEPTA" : `la rechaza (${action.detalle})`} ` +
          `y el paso ${paso.acepta ? "la ACEPTA en silencio" : `la objeta (${paso.detalle})`}`,
      );
    }
  }
  return malas;
}

test.after(limpiarTodo);

test("el extractor encontro el paso, y el paso lee los desvios", () => {
  // Un ancla que no encuentra su sujeto no es un ancla: pasaria vacia sobre cualquier cosa.
  assert.ok(script.length > 2000, `el script del paso "${PASO}" salio de ${script.length} caracteres`);
  assert.ok(script.includes("RUTA_DESVIOS"), porque("el paso ya no lee el archivo de desvios", script.slice(0, 400)));
});

test("los DOS lectores dan el mismo veredicto sobre cada grafia de la tabla", () => {
  const malas = discrepancias();
  assert.deepEqual(
    malas,
    [],
    porque(
      "los dos lectores de un desvio de permiso no coinciden, asi que el mismo archivo es rojo por un camino y " +
        "verde —o un aviso que miente— por el otro. Arreglo: alinear el programa del paso con clasificarDesvios " +
        "de actions/constitucion/constitucion.mjs, que es el que valida la forma",
      malas.join("\n"),
    ),
  );
});

test("y la tabla DISTINGUE: acepta algunas y rechaza otras, en los dos lectores", () => {
  // Sin esto, dos lectores que rechazaran todo coincidirian y el caso de arriba pasaria en verde
  // sobre el defecto que existe para cazar.
  const action = CASOS.map(([, e]) => veredictoDeLaAction(e).acepta);
  assert.ok(action.includes(true) && action.includes(false), porque("la tabla no separa nada en la action", action));
  const completo = veredictoDelPaso(COMPLETO);
  assert.equal(completo.acepta, true, porque("el paso no acepta ni el desvio completo", completo.salida));
  const aMedias = veredictoDelPaso(sin("aprobado_por"));
  assert.equal(aMedias.acepta, false, porque("el paso acepta en silencio un desvio sin aprobador", aMedias.salida));
});

test("MUERDE: si el paso vuelve a exigir que la fecha exista, el 30 de febrero lo delata", () => {
  // La divergencia que este banco encontro, reintroducida. Anti-vacuidad del ancla: si la
  // comparacion no la viera, el caso de arriba estaria midiendo otra cosa.
  const ancla = 'const fechaValida = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(fecha) && !Number.isNaN(Date.parse(fecha + "T00:00:00Z"));';
  assert.ok(script.includes(ancla), porque("el ancla de la mutacion ya no esta en el paso", ancla));
  const mutado = script.replace(
    ancla,
    'const fechaValida = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(fecha) && !Number.isNaN(Date.parse(fecha)) && new Date(fecha).toISOString().slice(0, 10) === fecha;',
  );
  const entrada = { ...COMPLETO, fecha: "2026-02-30" };
  assert.equal(veredictoDeLaAction(entrada).acepta, true, "la action acepta el 30 de febrero: es la premisa del caso");
  const r = veredictoDelPaso(entrada, mutado);
  assert.equal(r.acepta, false, porque("el mutado tenia que objetar el 30 de febrero", r.salida));
});

test("un desvio que nombra regla y permiso a la vez NO absorbe: el permiso queda como hallazgo, en rojo", () => {
  // La revision adversarial del porte (2026-09-18) encontro que este arreglo habia nacido en
  // modo aviso —«hoy el desvio absorbe igual; en la linea mayor siguiente deja de absorber»—
  // contra la decision D1 del PO: una compuerta cuyo arreglo cabe en el repositorio del
  // consumidor (aca, partir la entrada en dos) se exige en rojo el dia que sale. Y no le cambia
  // el color a ningun repo que hoy pase: la action de la constitucion ya da esa entrada por
  // ERROR (desvio-ambiguo).
  const entrada = { ...COMPLETO, regla: "alguna-regla-del-canonico" };
  assert.equal(veredictoDeLaAction(entrada).acepta, false, "la premisa: la action rechaza la entrada ambigua");
  const r = veredictoDelPaso(entrada);
  assert.ok(!/Permiso de escritura con desvio declarado/.test(r.salida), porque("el desvio ambiguo absorbio el hallazgo", r.salida));
  assert.ok(r.detalle.startsWith("exit 1"), porque("el permiso sin desvio valido no puso rojo", r.salida));
  assert.ok(
    /::warning file=\.projects-desvios\.json,title=Desvio de permiso ambiguo::.*NO absorbe/.test(r.salida),
    porque("el aviso no dice que el desvio dejo de absorber", r.salida),
  );
  assert.ok(!/linea mayor siguiente/.test(r.salida), porque("el aviso sigue prometiendo un endurecimiento futuro", r.salida));
});
