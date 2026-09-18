import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const CANONICO = path.join(RAIZ, "actions/constitucion/canonico");
const ANDAMIO = path.join(RAIZ, "plantilla");

// ---------------------------------------------------------------------------
// EL RENOMBRADO QUE SEPARO ESTE MARCO DE SU ORIGEN NO DEJA RESIDUOS EN LO QUE VIAJA
// (change el-canonico-dice-como-se-trabaja).
//
// EL DEFECTO, medido el 2026-09-17. El marco nacio de otro y el nombre de la
// organizacion de origen se reemplazo mecanicamente por «la organizacion». Donde
// el nombre era parte de un IDENTIFICADOR o iba detras de un articulo, el reemplazo
// dejo texto roto que llega a cada proyecto: el canonico —que cada sesion de cada
// repo carga— decia «la skill **`la organización-design`**» (una skill que no
// existe con ese nombre en ningun lado), «cinco casos en el un consumidor» y «la
// Estrella de la organización»; y el `eslint.config.mjs` del andamio repetia la
// skill inexistente. Ninguna prueba lo veia: el banco de procedencias del andamio
// busca FRASES de procedencia, y estas son otra cosa, las cicatrices de un
// reemplazo.
//
// LO QUE SE VIGILA son las FORMAS que deja un reemplazo mecanico, no una lista de
// nombres propios: el nombre pegado a un guion (`la organización-algo`, que era un
// identificador), el nombre propio de un simbolo de otra marca, y los dos nombres
// de origen en si. Esas tres se miran en el canonico Y en el andamio, porque ningun
// otro banco las mira en ninguno de los dos.
//
// Y DOS MAS SOLO SOBRE EL CANONICO, porque en `plantilla/` ya las cobra
// `lo-que-viaja-al-proyecto.test.mjs` —el articulo pegado (regla 5) y «el
// consumidor» (regla 2)— y repetirlas aca daria cada hallazgo dos veces sin
// agregar un solo caso. El canonico tambien viaja —cada sesion de cada repo lo
// carga— y hasta este banco ninguna de las dos lo miraba: «cinco casos en el un
// consumidor» vivio ahi desde el renombrado. Se usa la MISMA forma del articulo
// que aquel banco (`el|del|al un <palabra>`), para que las dos guardas digan lo
// mismo de la misma construccion.
//
// LIMITE DECLARADO. Es una lista cerrada de formas. Un residuo con otra forma se
// escapa; lo que no se escapa es ninguna de las que ya aparecieron.
// ---------------------------------------------------------------------------

export const FORMAS = [
  { re: /la organizaci[oó]n-[a-z]/i, que: "un nombre pegado a un guion: era un identificador y el reemplazo lo rompio" },
  { re: /Estrella de la organizaci[oó]n/, que: "el nombre propio de un simbolo de otra marca" },
  { re: /\b(ori[oó]n|rigel)\b/i, que: "el nombre de un marco o una organizacion de origen" },
];

// Solo sobre el canonico: en plantilla/ ya las vigila lo-que-viaja-al-proyecto.test.mjs.
export const SOLO_DEL_CANONICO = [
  {
    re: /\b(?:el|del|al)\s+un\s+[a-záéíóúñ]/i,
    que: "articulo doble: era «el <nombre>» y el reemplazo dejo los dos articulos",
  },
  {
    re: /\bel consumidor\b/i,
    que: "«el consumidor» senala a uno que el lector no puede consultar; «un consumidor» describe la clase",
  },
];

function archivos(dir, acumulado = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === "node_modules" || e.name === ".git") continue;
    const abs = path.join(dir, e.name);
    if (e.isDirectory()) archivos(abs, acumulado);
    else if (!/\.(png|jpe?g|gif|ico|pdf|woff2?)$/i.test(e.name)) acumulado.push(abs);
  }
  return acumulado;
}

/** Los residuos de un conjunto de archivos: [{ ruta, linea, que }]. Puro sobre el texto. */
export function residuos(textos, formas) {
  const salida = [];
  for (const [ruta, texto] of textos) {
    texto.split("\n").forEach((l, i) => {
      for (const f of formas) if (f.re.test(l)) salida.push({ ruta, linea: i + 1, que: f.que });
    });
  }
  return salida;
}

const leerTodos = (lista) => lista.map((abs) => [path.relative(RAIZ, abs).split(path.sep).join("/"), fs.readFileSync(abs, "utf8")]);
const delCanonico = () => leerTodos(fs.readdirSync(CANONICO).filter((n) => n.endsWith(".md")).map((n) => path.join(CANONICO, n)));

test("los lectores leen algo: un cero aca es este banco roto", () => {
  assert.ok(delCanonico().length >= 5, "no se leyo el canonico");
  assert.ok(archivos(ANDAMIO).length >= 50, "no se leyo el andamio");
});

test("el canonico y el andamio no llevan residuos del renombrado", () => {
  const hallados = [
    ...residuos(delCanonico(), [...FORMAS, ...SOLO_DEL_CANONICO]),
    ...residuos(leerTodos(archivos(ANDAMIO)), FORMAS),
  ];
  assert.deepEqual(
    hallados.map((h) => `${h.ruta}:${h.linea} — ${h.que}`),
    [],
    "hay residuos del renombrado en lo que viaja a cada proyecto. Arreglo: reescribir la frase sin el nombre de " +
      "origen —no reemplazar la palabra por otra: fue un reemplazo mecanico lo que dejo esto—.",
  );
});

test("MUERDE: cada forma se caza sobre un texto que la tiene, y lo legitimo pasa", () => {
  const casos = [
    ["es la skill `la organización-design` de la organizacion", FORMAS, 0],
    ["El logo y la Estrella de la organización no se redibujan", FORMAS, 1],
    ["lo aprendimos en Rigel", FORMAS, 2],
    ["cinco casos en el un consumidor al 2026-08-22", SOLO_DEL_CANONICO, 0],
    ["fue el bug del un servicio", SOLO_DEL_CANONICO, 0],
    ["pasó tres veces en el consumidor", SOLO_DEL_CANONICO, 1],
  ];
  for (const [texto, formas, i] of casos) {
    const h = residuos([["x.md", texto]], formas);
    assert.equal(h.length, 1, `«${texto}» tenia que dar exactamente un residuo y dio ${h.length}`);
    assert.equal(h[0].que, formas[i].que);
  }
  // Y lo legitimo pasa: la clase, la organizacion nombrada como tal, y «el unico»,
  // que empieza igual que el articulo pegado y no lo es.
  assert.deepEqual(
    residuos(
      [["x.md", "cinco casos en un consumidor; el manual de la organización; es el unico lugar"]],
      [...FORMAS, ...SOLO_DEL_CANONICO],
    ),
    [],
  );
});

test("MUERDE: sobre una copia del canonico con los residuos de antes del arreglo, el banco los nombra", () => {
  // Las cuatro lineas de `90-marca.md` tal como estaban antes de este change. Se
  // corre sobre el texto, no sobre el disco: el arbol no se toca.
  const antes = [
    "**`la organización-design`** de la organización. Acá viven solo las reglas que un agente tiene",
    "«se ve bien»— y la que más veces se rompió: cinco casos en el un consumidor al 2026-08-22, uno en",
    "- **El logo y la Estrella de la organización no se redibujan.** Se usan los archivos del sistema o",
    "pasó tres veces en el consumidor, con una estrella de líneas rectas donde la oficial",
  ].join("\n");
  const h = residuos([["actions/constitucion/canonico/90-marca.md", antes]], [...FORMAS, ...SOLO_DEL_CANONICO]);
  assert.deepEqual(
    h.map((x) => x.linea),
    [1, 2, 3, 4],
    `las cuatro lineas tenian que salir, una por residuo: ${JSON.stringify(h)}`,
  );
});
