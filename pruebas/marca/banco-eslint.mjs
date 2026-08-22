// BANCO DE LAS REGLAS DE MARCA CON ESLINT DE VERDAD.
//
// POR QUE ESTE ARCHIVO EXISTE Y POR QUE NO CORRE EN CI. El repo del marco no
// tiene package.json ni node_modules: todo corre con `node --test` y builtins.
// Eso es una propiedad, no un descuido —el marco no le impone dependencias a
// nadie, ni se las impone a si mismo— pero deja un hueco: la guarda de CI
// (reglas-marca.test.mjs) puede probar la mitad regex de cada selector y NO
// puede probar la otra mitad, que es si "Literal", "TemplateElement",
// "JSXText" o "JSXOpeningElement" seleccionan los nodos que creemos.
//
// Este banco cierra ese hueco a mano, contra el ESLint de un repo que ya lo
// tenga instalado. No se corre solo: se corre cuando se toca el bloque de
// marca, y su salida va como evidencia al PR.
//
// SE USA ASI, desde la raiz del marco:
//
//   node pruebas/marca/banco-eslint.mjs --repo <ruta-a-un-repo-con-eslint-9>
//   node pruebas/marca/banco-eslint.mjs --repo <ruta> --medir <ruta>/web/src
//
// El primer modo es el banco: 10 casos violatorios, sus casos legitimos y un
// control no-op. El segundo mide un arbol real y dice cuantas violaciones hay
// por regla, que es la unica forma de saber si las reglas encuentran algo o son
// teoria.
//
// Los selectores se LEEN del andamio, nunca se copian aca: si el banco pasa,
// pasa contra el archivo que se distribuye.
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { leerBloqueDeMarca } from "./extraer.mjs";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const ANDAMIO = path.join(RAIZ, "plantilla/eslint.config.mjs");

// --- argumentos, fail-closed ------------------------------------------------
function arg(nombre) {
  const i = process.argv.indexOf(nombre);
  return i > 0 ? process.argv[i + 1] : undefined;
}
const repo = arg("--repo");
const medir = arg("--medir");

if (!repo) {
  console.error(
    [
      "falta --repo: este banco necesita un repo con eslint 9 y",
      "@typescript-eslint/parser instalados (el marco no los tiene, a proposito).",
      "",
      "  node pruebas/marca/banco-eslint.mjs --repo ../proyecto-origen",
    ].join("\n"),
  );
  process.exit(2);
}

let ESLint;
let tsParser;
try {
  const req = createRequire(path.resolve(repo) + "/package.json");
  ESLint = req("eslint").ESLint;
  tsParser = req("@typescript-eslint/parser");
} catch (e) {
  console.error(
    `no pude cargar eslint desde ${repo}: ${e.message}\n` +
      "Hace falta un repo con las dependencias instaladas (pnpm install).",
  );
  process.exit(2);
}

const { selectores, severidad } = leerBloqueDeMarca(ANDAMIO);

const eslint = new ESLint({
  cwd: path.resolve(repo),
  overrideConfigFile: true,
  overrideConfig: [
    {
      files: ["**/*.{ts,tsx}"],
      languageOptions: {
        parser: tsParser,
        parserOptions: { ecmaFeatures: { jsx: true }, sourceType: "module" },
      },
      rules: { "no-restricted-syntax": [severidad, ...selectores] },
    },
  ],
});

// --- modo medicion ----------------------------------------------------------
if (medir) {
  const res = await eslint.lintFiles([path.resolve(medir) + "/**/*.{ts,tsx}"]);
  const porRegla = new Map();
  for (const r of res) {
    for (const m of r.messages) {
      const i = selectores.findIndex((s) => s.message === m.message);
      if (!porRegla.has(i)) porRegla.set(i, []);
      porRegla.get(i).push(`${path.relative(path.resolve(repo), r.filePath).replace(/\\/g, "/")}:${m.line}`);
    }
  }
  // Los mensajes que NO son de ninguno de nuestros selectores caen en el bucket
  // -1, que el loop de abajo no imprime. Se reportan APARTE en vez de
  // desaparecer: por este camino se iria un error de parseo, y entonces el conteo
  // saldria bajo sin que nada avise.
  const huerfanos = porRegla.get(-1) ?? [];
  console.log(`archivos analizados: ${res.length}`);
  if (huerfanos.length) {
    console.log(
      `AVISO: ${huerfanos.length} mensaje(s) que no son de estas reglas y NO se cuentan ` +
        `(reglas ajenas al override, o errores de parseo). Los primeros: ${huerfanos.slice(0, 3).join(", ")}`,
    );
  }
  let total = 0;
  for (const [i, s] of selectores.entries()) {
    const hits = porRegla.get(i) ?? [];
    total += hits.length;
    console.log(`(${i}) ${String(hits.length).padStart(3)}  ${s.message.slice(0, 62)}`);
    for (const h of hits.slice(0, 5)) console.log(`          ${h}`);
    if (hits.length > 5) console.log(`          ... y ${hits.length - 5} mas`);
  }
  console.log(`\nTOTAL: ${total} hallazgos`);
  process.exit(0);
}

// --- modo banco -------------------------------------------------------------
// Un caso violatorio y sus casos legitimos por selector, EN CODIGO REAL: el
// atributo JSX y la plantilla de texto son las dos formas en que estas clases
// aparecen de verdad, y son nodos distintos del arbol.
const CASOS = [
  {
    nombre: "blanco sobre el acento (Literal, en atributo JSX)",
    rojo: 'export const B = () => <button className="bg-la organización-orange text-white hover:bg-orange-600">Guardar</button>;',
    verdes: [
      'export const B = () => <button className="bg-la organización-orange text-slate-900">Guardar</button>;',
      'export const B = () => <button className="bg-slate-800 text-white">Guardar</button>;',
    ],
  },
  {
    nombre: "blanco sobre el acento (parte fija de una plantilla)",
    rojo: "export const c = (x: string) => `bg-orange-500 text-white ${x}`;",
    verdes: ["export const c = (x: string) => `bg-orange-500 text-slate-900 ${x}`;"],
  },
  {
    nombre: "hex crudo (Literal)",
    rojo: 'export const c = "#F97316";',
    verdes: ['export const c = "var(--color-acento)";', 'export const c = "#app";'],
  },
  {
    nombre: "hex crudo (parte fija de una plantilla)",
    rojo: "export const c = (x: string) => `color: #F97316; ${x}`;",
    verdes: ["export const c = (x: string) => `color: var(--color-acento); ${x}`;"],
  },
  {
    nombre: "valor arbitrario fuera de la escala",
    rojo: 'export const D = () => <div className="z-[9999] w-[13px]" />;',
    verdes: [
      'export const D = () => <div className="z-50 w-full" />;',
      'export const D = () => <div className="grid-cols-[1fr_auto]" />;',
      'export const D = () => <div className="data-[state=open]:bg-acento" />;',
    ],
  },
  {
    nombre: "outline-none sin foco de reemplazo",
    rojo: 'export const I = () => <input className="outline-none px-2" />;',
    verdes: [
      'export const I = () => <input className="outline-none focus-visible:ring-2" />;',
      'export const I = () => <input className="focus-visible:ring-2 outline-none" />;',
    ],
  },
  {
    nombre: "focus: donde va focus-visible:",
    rojo: 'export const I = () => <input className="focus:ring-2" />;',
    verdes: [
      'export const I = () => <input className="focus-visible:ring-2" />;',
      'export const I = () => <input className="group-focus:ring-2" />;',
    ],
  },
  {
    nombre: "fecha sin locale",
    rojo: "export const f = (d: Date) => d.toLocaleDateString();",
    verdes: [
      'export const f = (d: Date) => d.toLocaleDateString("es-EC");',
      'export const f = (d: Date) => new Intl.DateTimeFormat("es-EC").format(d);',
    ],
  },
  {
    nombre: "rotulo que no dice que va a pasar",
    rojo: "export const B = () => <button>Aceptar</button>;",
    verdes: [
      "export const B = () => <button>Guardar cambios</button>;",
      "export const B = () => <button>Aceptar terminos</button>;",
    ],
  },
  {
    nombre: "SVG dibujado en el JSX",
    rojo: 'export const L = () => <svg viewBox="0 0 24 24" />;',
    verdes: ["export const L = () => <EstrellaDeMarca className=\"h-6 w-6\" />;"],
  },
];

// Control no-op: un componente legitimo completo, del estilo que el andamio
// espera. Si esto sale en rojo, las reglas muerden trabajo honesto y el verde
// de arriba no significa nada.
const CONTROL = `
import { useState } from "react";
import { Boton, Tarjeta, EstrellaDeMarca } from "@/componentes";

export function Panel({ creado }: { creado: Date }) {
  const [abierto, setAbierto] = useState(false);
  const fecha = new Intl.DateTimeFormat("es-EC", { dateStyle: "long" }).format(creado);
  return (
    <Tarjeta className="bg-surface-1 text-fg-1 rounded-lg p-4 shadow-sm">
      <EstrellaDeMarca className="h-6 w-6" />
      <h2 className="text-lg font-semibold">Resumen del turno</h2>
      <p className="text-fg-2 text-sm">Creado el {fecha}</p>
      <div className={\`mt-4 flex gap-2 \${abierto ? "flex-col" : "flex-row"}\`}>
        <Boton
          className="bg-acento text-acento-fg rounded-md px-3 py-2 focus-visible:ring-2 focus-visible:ring-offset-2"
          onClick={() => setAbierto(!abierto)}
        >
          Guardar cambios
        </Boton>
        <Boton className="border-border-1 text-fg-1 rounded-md border px-3 py-2">
          Descartar
        </Boton>
      </div>
    </Tarjeta>
  );
}
`;

async function avisos(codigo) {
  const [r] = await eslint.lintText(codigo, { filePath: "banco-de-marca.tsx" });
  return r.messages.map((m) => m.message);
}

let fallas = 0;
const linea = (ok, txt) => {
  console.log(`${ok ? "  OK  " : "FALLA "} ${txt}`);
  if (!ok) fallas++;
};

console.log(`selectores leidos del andamio: ${selectores.length} (severidad: ${severidad})\n`);

// "El banco cubre menos casos que los que hay" jamas se reporta como exito.
if (selectores.length !== CASOS.length) {
  linea(false, `el andamio declara ${selectores.length} selectores y el banco cubre ${CASOS.length}`);
}

for (const [i, c] of CASOS.entries()) {
  const esperado = selectores[i]?.message;
  if (!esperado) {
    linea(false, `(${i}) no existe el selector ${i} en el andamio`);
    continue;
  }
  const ms = await avisos(c.rojo);
  const propios = ms.filter((m) => m === esperado).length;
  const otros = ms.filter((m) => m !== esperado);
  linea(
    propios === 1 && otros.length === 0,
    `(${i}) ROJO  ${c.nombre}` +
      (propios !== 1 ? ` [disparos propios: ${propios}]` : "") +
      (otros.length ? ` [contaminacion: ${otros.map((o) => o.slice(0, 34)).join(" | ")}]` : ""),
  );
  for (const v of c.verdes) {
    const mv = await avisos(v);
    linea(
      mv.length === 0,
      `(${i}) VERDE ${v.slice(0, 74)}` + (mv.length ? ` -> ${mv.map((m) => m.slice(0, 44)).join(" | ")}` : ""),
    );
  }
}

const mc = await avisos(CONTROL);
linea(
  mc.length === 0,
  "CONTROL no-op: componente legitimo completo" +
    (mc.length ? ` -> ${mc.map((m) => m.slice(0, 56)).join(" | ")}` : ""),
);

console.log(`\n${fallas === 0 ? "BANCO VERDE" : `BANCO ROJO: ${fallas} falla(s)`}`);
process.exit(fallas === 0 ? 0 : 1);
