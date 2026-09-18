import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const ACCION = path.resolve(AQUI, "..");
const CANONICO = path.join(ACCION, "canonico");
const RAIZ = path.resolve(ACCION, "../..");
const MANIFIESTO = path.join(CANONICO, "manifiesto.json");

// ---------------------------------------------------------------------------
// LA VENTANA DE GRACIA DE LA CONSTITUCION SE RETIRO, Y ESTE BANCO IMPIDE QUE VUELVA
// POR LOS DOS CAMINOS POR LOS QUE YA VOLVIO (change ventana-vencida).
//
// EL DEFECTO. El 2026-08-22 (1.6.0) se retiro el piso de 28 dias entre `publicada`
// y `exigible_desde`: con distribucion por version exacta, el aviso previo ES el PR
// de bump, y la ventana solo producia un repo atrasado y verde durante un mes. El
// codigo quedo bien. La PROSA no: el 2026-09-17 seguian prometiendo la ventana,
// en presente, siete textos —el canonico que cada proyecto carga en cada sesion
// («un artefacto atrasado avisa primero y falla desde la fecha que el propio aviso
// imprime»), el encabezado de action.yml («la ventana de gracia es para reglas
// nuevas»), cuatro comentarios de constitucion.mjs, el encabezado de
// actualizar-marco.yml del andamio— y el README de las actions y la skill del
// release ofrecian todavia el estreno con aviso como opcion de quien publica.
//
// EL ORIGEN. Rigel archivo el mismo change (794bbaf, 2026-08-29) despues de que su
// auditoria de cierre encontrara la frase de action.yml una semana tarde: «contar
// menciones no distingue la nota historica del texto que sigue prometiendo. Lo
// encontro la auditoria de cierre, no un check». Despues corrigio el canonico
// (2c9e5e5) y retiro la segunda fecha en su 2.0.0 (b8359ed). Aca el retiro del
// output va en v2; lo que se trae YA es la propiedad y este banco.
//
// LA POLITICA QUE ESTE BANCO SOSTIENE es la decision D1 del PO (2026-09-17): una
// compuerta se exige en rojo el dia que sale, salvo que su arreglo quede FUERA del
// arbol del consumidor. Regenerar la porcion del marco queda DENTRO de su arbol, asi
// que no hay excepcion: la version exigible es la publicada.
//
// LAS DOS REGLAS, y cada una se pone roja sola:
//
//   1. El manifiesto que viaja con la action declara UNA sola fecha por version:
//      `exigible_desde` igual a `publicada`. El mecanismo de la fecha futura sigue en
//      el codigo (hallazgoPorFecha) hasta que v2 retire el campo y el output, y esta
//      regla es lo que lo vuelve inalcanzable por datos. Vive en el banco y no en
//      validarManifiesto() a proposito: el manifiesto lo escribe el marco, asi que el
//      rojo tiene que caer en el PR del marco y no en el pipeline de un consumidor.
//   2. Ninguna superficie que le describe el veredicto a quien la lee promete un
//      aviso previo al rojo. Y en positivo: la regla del canonico que habla del
//      artefacto atrasado dice que es ROJO.
//
// LIMITE DECLARADO de la regla 2: es una lista cerrada de redacciones que YA
// estuvieron escritas, cada una con su origen. Caza que vuelvan esas, no una
// redaccion nueva de la misma promesa — decidir si una frase promete un aviso no es
// decidible con un patron. Lo que cubre el resto es la revision adversarial del
// change, que es donde esta clase aparecio las dos veces.
// ---------------------------------------------------------------------------

/** Las versiones del manifiesto cuya fecha exigible no es su publicacion. */
export function segundasFechas(manifiesto) {
  const versiones = Array.isArray(manifiesto?.versiones) ? manifiesto.versiones : [];
  return versiones.filter((v) => v?.exigible_desde !== v?.publicada);
}

/** Las redacciones que prometian la ventana, cada una con el lugar donde estuvo. */
export const PROMESAS_VENCIDAS = [
  {
    patron: /avisa primero/i,
    origen: "canonico/20-marco-version.md, regla marco-artefacto-al-dia: «un artefacto atrasado avisa primero y falla desde la fecha que el propio aviso imprime»",
    ejemplo: "acuerde. Un artefacto atrasado avisa primero y falla desde la fecha que el propio",
  },
  {
    patron: /ventana de gracia (es|sirve) para/i,
    origen: "action.yml y constitucion.mjs: «La ventana de gracia es para reglas nuevas, no para ediciones a mano»",
    ejemplo: "#     diff. La ventana de gracia es para reglas nuevas, no para ediciones a mano.",
  },
  {
    patron: /::warning:: hasta (el )?`?exigible_desde/i,
    origen: "constitucion.mjs, cabecera: «artefacto ausente o atrasado -> ::warning:: hasta el `exigible_desde`»",
    ejemplo: "//   · artefacto ausente o atrasado -> ::warning:: hasta el `exigible_desde` de la",
  },
  {
    patron: /entra por la (misma )?ventana/i,
    origen: "constitucion.mjs: «en modo VERIFICAR entra por la misma ventana que el artefacto faltante»",
    ejemplo: "//   · `.projects-valores.json` ausente -> en modo VERIFICAR entra por la misma ventana",
  },
  {
    patron: /de aviso a rojo/i,
    origen: "plantilla/.github/workflows/actualizar-marco.yml: «hasta que el check pase de aviso a rojo»",
    ejemplo: "# esperando que alguien regenere a mano hasta que el check pase de aviso a rojo.",
  },
  {
    patron: /(estreno con aviso|exigible_desde`? futuro)\W+(\*\*)?sigue siendo posible/i,
    origen: "actions/README.md y la skill del release: el estreno con aviso ofrecido como opcion de quien publica",
    ejemplo: "`exigible_desde` futuro sigue siendo posible y es una decision deliberada de estrenar",
  },
];

/** Donde se le describe a alguien cuando la constitucion pone rojo. Los .md del
 *  canonico se derivan del arbol: un archivo nuevo entra solo. */
export function superficiesQueDescriben(raiz = RAIZ) {
  const canonico = fs
    .readdirSync(path.join(raiz, "actions/constitucion/canonico"))
    .filter((f) => f.endsWith(".md"))
    .sort()
    .map((f) => `actions/constitucion/canonico/${f}`);
  return [
    ...canonico,
    "actions/constitucion/action.yml",
    "actions/constitucion/constitucion.mjs",
    "actions/constitucion/cableado.mjs",
    "actions/README.md",
    ".claude/skills/projects-release/SKILL.md",
    "plantilla/.github/workflows/actualizar-marco.yml",
  ];
}

/** Las lineas de un texto que repiten una promesa vencida. Linea por linea y con la
 *  siguiente pegada, porque la prosa se corta donde quiere el ancho de columna. */
export function promesasVencidas(texto) {
  const lineas = texto.split("\n");
  const hallazgos = [];
  for (let i = 0; i < lineas.length; i++) {
    const siguiente = (lineas[i + 1] ?? "").replace(/^[\s#/*]+/, "");
    const par = `${lineas[i]} ${siguiente}`;
    for (const { patron, origen } of PROMESAS_VENCIDAS) {
      if (!patron.test(par)) continue;
      // Si la frase entera esta en la linea siguiente, la reporta esa linea: sin esto
      // cada hallazgo saldria dos veces.
      if (!patron.test(lineas[i]) && patron.test(siguiente)) continue;
      hallazgos.push({ linea: i + 1, origen });
    }
  }
  return hallazgos;
}

/** El bloque de una regla del canonico, por su id estable. */
export function bloqueDeRegla(texto, id) {
  const inicio = texto.indexOf(`<!-- projects:regla id=${id} -->`);
  if (inicio < 0) return null;
  const resto = texto.slice(inicio + 1);
  const fin = resto.search(/<!-- projects:regla id=|\n---\s*$/m);
  return fin < 0 ? resto : resto.slice(0, fin);
}

const leer = (relativa) => fs.readFileSync(path.join(RAIZ, relativa), "utf8");

test("la-ventana · los lectores leen algo: un cero aca es este banco roto, no un repo sano", () => {
  const manifiesto = JSON.parse(fs.readFileSync(MANIFIESTO, "utf8"));
  assert.ok(manifiesto.versiones.length >= 1, "el manifiesto no declara ninguna version");
  const superficies = superficiesQueDescriben();
  assert.ok(superficies.filter((s) => s.includes("/canonico/")).length >= 5, "canonico/ sin .md: se movio?");
  for (const ruta of superficies) {
    assert.ok(fs.existsSync(path.join(RAIZ, ruta)), `${ruta} no existe: si se movio, actualiza superficiesQueDescriben()`);
  }
});

test("la-ventana · el manifiesto que viaja con la action declara UNA sola fecha por version", () => {
  const manifiesto = JSON.parse(fs.readFileSync(MANIFIESTO, "utf8"));
  const dobles = segundasFechas(manifiesto);
  assert.deepEqual(
    dobles.map((v) => `${v.version}: publicada ${v.publicada}, exigible_desde ${v.exigible_desde}`),
    [],
    "estas versiones del canonico declaran una fecha exigible distinta de su publicacion, o sea una ventana de gracia " +
      "reintroducida por datos: un repo atrasado quedaria en amarillo hasta esa fecha. La version exigible es la " +
      "publicada (change ventana-vencida; decision D1 del PO del 2026-09-17: una compuerta cuyo arreglo esta en el " +
      "arbol del consumidor se exige en rojo el dia que sale). Arreglo: igualar `exigible_desde` a `publicada` en " +
      "actions/constitucion/canonico/manifiesto.json. Si de verdad hace falta estrenar con aviso, eso contradice la " +
      "politica y se propone como change, no como dato.",
  );
});

test("la-ventana · ninguna superficie que describe el veredicto promete un aviso previo al rojo", () => {
  const encontradas = [];
  for (const ruta of superficiesQueDescriben()) {
    for (const h of promesasVencidas(leer(ruta))) encontradas.push(`${ruta}:${h.linea} — repite ${h.origen}`);
  }
  assert.deepEqual(
    encontradas,
    [],
    "estas lineas vuelven a prometer la ventana de gracia de la constitucion, retirada el 2026-08-22: con pin exacto un " +
      "artefacto atrasado es rojo dentro del PR de bump, sin aviso previo. Arreglo: reescribir la linea diciendo que el " +
      "atraso es rojo desde el dia en que la version se publica. Si la linea es una nota HISTORICA, que lo diga en pasado " +
      "y con la fecha («hasta el 2026-08-22 hubo…»): esas no coinciden con ningun patron de aca.",
  );
});

test("la-ventana · la regla del canonico sobre el artefacto atrasado dice que es ROJO", () => {
  // La mitad positiva. Sin ella, borrar la frase entera dejaria la regla 2 en verde y
  // al agente de cada proyecto sin saber que un atraso lo frena.
  const bloque = bloqueDeRegla(leer("actions/constitucion/canonico/20-marco-version.md"), "marco-artefacto-al-dia");
  assert.ok(bloque, "no encuentro la regla marco-artefacto-al-dia en 20-marco-version.md: su id es estable y un desvio puede nombrarla");
  assert.match(
    bloque,
    /\brojo\b/i,
    "la regla marco-artefacto-al-dia no dice que un artefacto atrasado es rojo. Es lo que el agente de cada proyecto " +
      "lee para saber que un PR de bump con el artefacto viejo no se mergea. Arreglo: decirlo en la regla.",
  );
  assert.doesNotMatch(bloque, /\bavis[ao]\b/i, "la regla marco-artefacto-al-dia vuelve a mencionar un aviso: el atraso no avisa, falla");
});

test("MUERDE · una segunda fecha se caza, y la fecha unica no", () => {
  const sano = { versiones: [{ version: "1.3.0", publicada: "2026-08-21", exigible_desde: "2026-08-21" }] };
  assert.deepEqual(segundasFechas(sano), []);
  const futura = { versiones: [...sano.versiones, { version: "1.4.0", publicada: "2026-09-01", exigible_desde: "2026-09-29" }] };
  assert.deepEqual(segundasFechas(futura).map((v) => v.version), ["1.4.0"]);
  const sinFecha = { versiones: [{ version: "1.5.0", publicada: "2026-09-02" }] };
  assert.deepEqual(segundasFechas(sinFecha).map((v) => v.version), ["1.5.0"], "sin la fecha exigible tambien son dos verdades");
});

test("MUERDE · cada promesa vencida se caza con su redaccion original, y la corregida no", () => {
  for (const { ejemplo, origen } of PROMESAS_VENCIDAS) {
    assert.equal(promesasVencidas(ejemplo).length, 1, `el patron de «${origen}» no caza su propio ejemplo`);
  }
  // Cortada por el ancho de columna, que es como estaba en actualizar-marco.yml.
  assert.equal(promesasVencidas("# hasta que el check pase de aviso a\n# rojo.").length, 1);
  const corregidas = [
    "  acuerde. Un artefacto atrasado es **rojo** desde el PR de bump que lo deja atrás.",
    "Hubo hasta el 2026-08-22 una ventana de gracia obligatoria de 28 días, con",
    "//   · artefacto ausente o atrasado -> ::error:: desde el dia que la version se publica",
  ];
  for (const linea of corregidas) assert.deepEqual(promesasVencidas(linea), [], `falso positivo sobre: ${linea}`);
});

test("MUERDE · la regla del canonico con la promesa vieja se caza por las dos puntas", () => {
  const vieja = [
    "<!-- projects:regla id=marco-artefacto-al-dia -->",
    "",
    "- **La porción del marco se regenera.** Un artefacto atrasado avisa primero y falla desde la fecha",
    "  que el propio aviso imprime.",
    "",
    "---",
  ].join("\n");
  const bloque = bloqueDeRegla(vieja, "marco-artefacto-al-dia");
  assert.doesNotMatch(bloque, /\brojo\b/i);
  assert.match(bloque, /\bavis[ao]\b/i);
  assert.equal(bloqueDeRegla(vieja, "otra-regla"), null);
});
