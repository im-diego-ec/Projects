import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const CANONICO = path.join(RAIZ, "plantilla", "sitio", "README.md");

// ---------------------------------------------------------------------------
// EL NUMERO DE ACTOS HUMANOS SE CUENTA, NO SE RECUERDA.
//
// Tres paginas del marco prometen cuantas cosas tiene que hacer una persona a
// mano para publicar un sitio, y el numero estaba escrito a mano en las tres.
// Decia "tres" y eran cuatro: guardar la credencial en GitHub se contaba junto
// con crearla, siendo que pasa en otro sitio, con otra pantalla, y falla distinto
// --un secreto mal pegado no da error al pegarlo, da error recien al publicar--.
//
// Y el README canonico, que es la fuente, ademas arrastraba una frase de una
// version anterior que enumeraba DOS. O sea: tres numeros distintos en el mismo
// archivo.
//
// Contar de menos es el peor error posible en esta pagina: deja a alguien
// creyendo que termino cuando le falta un paso, que es exactamente la sorpresa
// que la propia pagina dice existir para evitar.
// ---------------------------------------------------------------------------

const NUMEROS = { dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7 };

/** Las paginas que prometen un numero, y donde lo prometen. */
const PAGINAS = [
  "plantilla/sitio/README.md",
  "docs/10-publicar.md",
  "docs/04-arrancar-acompanado.md",
  "plantilla/README-del-proyecto.md",
];

/** Cuantos actos de PREPARACION tiene el README canonico: los pasos numerados
 *  que vienen ANTES del de publicar. Publicar no es preparacion, es la cosa. */
function actosDePreparacion() {
  const titulos = [...fs.readFileSync(CANONICO, "utf8").matchAll(/^### (\d+) · (.+)$/gm)];
  const publicar = titulos.findIndex((t) => /Publicar por primera vez/.test(t[2]));
  assert.notEqual(publicar, -1, "el README canonico no tiene el paso de publicar: la cuenta quedaria mirando al vacio");
  return { cuantos: publicar, titulos: titulos.map((t) => t[2]) };
}

test("los pasos del README canonico estan numerados sin saltos ni repetidos", () => {
  // Sin esto, la cuenta de arriba podria dar el numero correcto sobre una lista
  // rota: dos pasos "3" o un salto del 2 al 4.
  const n = [...fs.readFileSync(CANONICO, "utf8").matchAll(/^### (\d+) · /gm)].map((m) => Number(m[1]));
  assert.ok(n.length >= 4, `solo se leyeron ${n.length} pasos numerados: la guarda quedaria mirando al vacio`);
  assert.deepEqual(
    n,
    n.map((_, i) => i + 1),
    `los pasos del README canonico van ${n.join(", ")}: alguien inserto o borro uno sin renumerar`,
  );
});

test("las cuatro paginas prometen el MISMO numero, y es el que el README tiene", () => {
  const { cuantos, titulos } = actosDePreparacion();
  for (const rel of PAGINAS) {
    const texto = fs.readFileSync(path.join(RAIZ, rel), "utf8");
    const dichos = [...texto.matchAll(/\*{0,2}(\w+) actos humanos/g)].map((m) => m[1].toLowerCase());
    assert.ok(dichos.length, `${rel} dejo de prometer un numero de actos humanos: la guarda no vigila nada`);
    for (const d of dichos) {
      assert.ok(d in NUMEROS, `${rel} dice "${d} actos humanos", que no es un numero que esta guarda sepa leer`);
      assert.equal(
        NUMEROS[d],
        cuantos,
        `${rel} promete ${d} (${NUMEROS[d]}) y el README canonico tiene ${cuantos} pasos de preparacion: ${titulos.slice(0, cuantos).join(" | ")}`,
      );
    }
  }
});

test("guardar la credencial en GitHub es UN paso propio, y no una nota del anterior", () => {
  // Es el que se contaba de menos. Que tenga titulo propio es lo que hace que la
  // cuenta de arriba lo vea: mientras vivio adentro del paso de la credencial, la
  // guarda habria confirmado el numero equivocado.
  const { titulos } = actosDePreparacion();
  assert.ok(
    titulos.some((t) => /GitHub/.test(t)),
    `ningun paso del README nombra GitHub: ${titulos.join(" | ")}`,
  );
  assert.ok(
    titulos.some((t) => /subdominio/i.test(t)),
    "el subdominio volvio a ser una nota al pie: es el que llega tarde, y el que mas se saltea",
  );
});

test("MUERDE: un numero cambiado en cualquiera de las cuatro se caza", () => {
  const { cuantos } = actosDePreparacion();
  const nombreDe = Object.entries(NUMEROS).find(([, v]) => v === cuantos)?.[0];
  assert.ok(nombreDe, `no hay palabra para ${cuantos}: la tabla de numeros se quedo corta`);
  for (const rel of PAGINAS) {
    const texto = fs.readFileSync(path.join(RAIZ, rel), "utf8");
    const mutado = texto.replace(/(\w+) actos humanos/, "siete actos humanos");
    assert.notEqual(mutado, texto, `${rel} no tiene la frase: la mutacion no probaria nada`);
    const dichos = [...mutado.matchAll(/\*{0,2}(\w+) actos humanos/g)].map((m) => NUMEROS[m[1].toLowerCase()]);
    assert.ok(dichos.includes(7), `la lectura no vio el numero mutado en ${rel}: la guarda no lee lo que dice leer`);
  }
});
