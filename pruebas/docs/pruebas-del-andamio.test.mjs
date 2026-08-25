// LOS NUMEROS QUE LA GUIA PROMETE SOBRE EL ANDAMIO, ATADOS AL ARBOL.
//
// QUE CIERRA. docs/arrancar-un-proyecto.md le dice a quien arranca un proyecto
// cuantas pruebas trae cada paquete del andamio: es como sabe, al terminar el
// paso 5, que no le falto nada. Ese numero estuvo escrito a mano y envejecio
// exactamente por el trabajo que lo tocaba: la pagina decia "46 pruebas" en el
// API y "8 pruebas" en el frontend mientras el andamio ya traia mas, porque el
// cambio que agrego el login nuevo agrego tambien sus bancos. Nadie lo vio,
// porque para verlo hay que abrir dos arboles el mismo dia.
//
// LA REGLA DE LA CASA, aplicada: la pagina del stack "no escribe un solo numero:
// los deriva de los manifiestos y tiene un banco de pruebas detras". Esto es lo
// mismo para la guia de arranque — el numero se sigue escribiendo en la prosa,
// porque el lector lo necesita ahi, pero deja de ser una afirmacion sin dueno.
//
// LO QUE ESTE BANCO NO DICE. Si las pruebas del andamio son buenas, ni si pasan.
// Eso lo dice `pnpm verificar` dentro de un proyecto instanciado. Lo que dice es
// que la guia y el arbol cuentan lo mismo.
import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { RAIZ, leer } from "./lectura.mjs";

const PAGINA = "docs/arrancar-un-proyecto.md";
const TEXTO = leer(PAGINA);

/** Los paquetes del andamio que la guia cuenta, con la fila donde lo dice. La
 *  clave es el prefijo de la fila —`| \`api/\` |`— porque es como la tabla
 *  identifica al paquete, y asi el caso se rompe si alguien renombra la columna
 *  en vez de quedarse midiendo una fila que ya no existe. */
const PAQUETES = {
  "api/": "plantilla/api/src",
  "web/": "plantilla/web/src",
};

/** El numero que la fila de un paquete promete, leido de la pagina. Devuelve
 *  null si la fila no esta o si dejo de decir un numero: los dos casos son "no
 *  pude medir", y este banco los distingue de "el numero esta mal". */
export function pruebasSegunLaGuia(texto, paquete) {
  for (const linea of texto.split("\n")) {
    if (!linea.startsWith(`| \`${paquete}\` |`)) continue;
    const marca = linea.match(/\*\*(\d+)\s+pruebas\*\*/);
    return marca ? Number(marca[1]) : null;
  }
  return null;
}

function archivosDePrueba(dir) {
  const encontrados = [];
  for (const entrada of readdirSync(join(RAIZ, dir))) {
    const rel = `${dir}/${entrada}`;
    if (statSync(join(RAIZ, rel)).isDirectory()) encontrados.push(...archivosDePrueba(rel));
    else if (/\.test\.tsx?$/.test(entrada)) encontrados.push(rel);
  }
  return encontrados.sort();
}

/** Cuantos casos declara un paquete. Cuenta declaraciones `it(` y `test(` y NO
 *  las variantes con punto —`it.each`, `it.skip`, `test.todo`—, que generan o
 *  saltean casos y harian que este conteo dijera otra cosa que la corrida. El
 *  caso de abajo comprueba que hoy no hay ninguna: si aparece una, este banco se
 *  pone rojo en vez de seguir contando mal en silencio. */
function casosDeclarados(dir) {
  let total = 0;
  for (const archivo of archivosDePrueba(dir)) {
    total += [...leer(archivo).matchAll(/(?:^|[^.\w])(?:it|test)\(/g)].length;
  }
  return total;
}

function variantesConPunto(dir) {
  const encontradas = [];
  for (const archivo of archivosDePrueba(dir)) {
    for (const marca of leer(archivo).matchAll(/\b(?:it|test|describe)\.(each|skip|todo|only|failing)\b/g)) {
      encontradas.push(`${archivo}: ${marca[0]}`);
    }
  }
  return encontradas;
}

test("guia · el conteo de pruebas del andamio no se cuenta de una forma que mienta", () => {
  // Sin esto, un `it.each` metido manana dejaria el conteo de este banco por
  // debajo del real y la pagina quedaria "verde" con un numero equivocado.
  const raras = Object.values(PAQUETES).flatMap((dir) => variantesConPunto(dir));
  assert.deepEqual(
    raras,
    [],
    `el andamio empezo a usar variantes que generan o saltean casos: ${raras.join(", ")}. Contar declaraciones ` +
      "dejo de ser lo mismo que contar casos, asi que o se cuenta corriendo la suite o la pagina deja de prometer " +
      "un numero. Lo que no vale es seguir contando lineas y llamarlo el total.",
  );
});

test("guia · las pruebas que la guia promete por paquete son las que el andamio trae", () => {
  const desajustes = [];
  for (const [paquete, dir] of Object.entries(PAQUETES)) {
    const prometidas = pruebasSegunLaGuia(TEXTO, paquete);
    assert.ok(
      prometidas !== null,
      `${PAGINA} ya no dice cuantas pruebas trae \`${paquete}\` en su tabla de directorios. Este caso NO se ` +
        "declara verde por no haber podido medir: si la tabla cambio de forma, actualiza PAQUETES en el mismo cambio.",
    );
    const reales = casosDeclarados(dir);
    assert.ok(
      reales >= 10,
      `conte ${reales} caso(s) en ${dir} y se esperaban al menos diez: el barrido dejo de encontrar los archivos ` +
        "de prueba y la comparacion de abajo pasaria vacuamente.",
    );
    if (prometidas !== reales) desajustes.push(`\`${paquete}\` → la guia dice ${prometidas} y el arbol trae ${reales}`);
  }
  assert.deepEqual(
    desajustes,
    [],
    `${PAGINA} y el andamio cuentan distinto:\n  ${desajustes.join("\n  ")}\nEs el numero con el que alguien que ` +
      "acaba de instanciar comprueba que no le falto nada, asi que un numero viejo lo manda a buscar un problema " +
      "que no existe. Arreglo: corregir la fila de la tabla en el mismo cambio que agrega o saca pruebas.",
  );
});

test("refutacion · un numero de pruebas envejecido en la guia se ve", () => {
  // Es literalmente lo que paso: la pagina decia 46 y 8 mientras el arbol traia
  // mas, y el banco entero salia verde porque nadie miraba esta relacion.
  const reales = casosDeclarados(PAQUETES["api/"]);
  const mutada = TEXTO.replace(`**${reales} pruebas**`, `**${reales - 2} pruebas**`);
  assert.notEqual(mutada, TEXTO, `no encontre "**${reales} pruebas**" en ${PAGINA}: revisa esta refutacion`);
  assert.equal(
    pruebasSegunLaGuia(mutada, "api/"),
    reales - 2,
    "le cambie el numero a una copia de la pagina y la lectura devolvio el de siempre: entonces este banco no " +
      "esta midiendo la pagina, esta midiendo el arbol dos veces",
  );
});
