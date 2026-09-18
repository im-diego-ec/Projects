import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { leerCanonico } from "../constitucion.mjs";

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const CANONICO = path.resolve(AQUI, "../canonico");
const MANIFIESTO = path.join(CANONICO, "manifiesto.json");

// ---------------------------------------------------------------------------
// EL PRESUPUESTO DE LINEAS DEL CANONICO DICE COMO SE MIDE, Y SU SUBIDA QUEDA ESCRITA
// (change el-canonico-dice-como-se-trabaja).
//
// EL DEFECTO, medido el 2026-09-17 sobre este arbol. El manifiesto declaraba
// `presupuesto_lineas: 700` sin una palabra de como se cuenta. La forma obvia de
// medirlo —`cat canonico/[0-9]*.md | wc -l`— daba 687, o sea trece lineas de
// margen. El check cobraba 696: `leerCanonico()` arma UN cuerpo pegando las
// secciones con una linea en blanco entre cada par, asi que mide la suma de los
// archivos MAS (secciones - 1). El margen real era cuatro.
//
// EL ORIGEN. Rigel cayo en el mismo hueco y lo midio: su nota declaraba 710
// lineas usadas cuando el check contaba 720, y el margen que se creia de diez el
// 2026-09-04 era CERO (2c9e5e5). Su arreglo fue que la nota nombre la funcion que
// cobra el check en vez de llevar un numero contado a mano. Aca se porta eso y se
// le agrega lo que alla quedo escrito sin sosten: que un banco lo haga cumplir.
//
// LAS TRES REGLAS, y cada una se pone roja sola:
//   1. El manifiesto que declara presupuesto declara tambien `presupuesto_nota`, y
//      la nota nombra `leerCanonico()` y advierte contra `wc -l`.
//   2. La nota nombra el presupuesto VIGENTE. Subirlo sin reescribir la nota da
//      rojo: «subir el presupuesto es una decision, no un ajuste» es lo que dice el
//      mensaje del check desde el primer dia, y hasta hoy nada impedia hacerlo
//      como ajuste —cambiar un numero y seguir—.
//   3. La aritmetica que la nota describe es la que cobra el check: las lineas de
//      `leerCanonico()` son la suma de las secciones mas una por cada par. Si
//      alguien cambia como se arma el cuerpo, la nota queda mintiendo y esto lo
//      dice.
//
// LIMITE DECLARADO. La regla 2 exige que el numero APAREZCA, no que la razon
// escrita sea buena: eso no se decide con un escaneo de texto. Lo que si garantiza
// es que nadie sube el presupuesto sin abrir la nota.
// ---------------------------------------------------------------------------

const manifiesto = () => JSON.parse(fs.readFileSync(MANIFIESTO, "utf8"));

/** Los problemas de la declaracion del presupuesto. [] si esta bien. Pura sobre sus
 *  argumentos, para que la corran el manifiesto real y las copias mutadas. */
export function problemasDelPresupuesto(m) {
  const problemas = [];
  const presupuesto = Number(m?.presupuesto_lineas ?? 0);
  if (!(presupuesto > 0)) return problemas; // sin presupuesto no hay nada que declarar
  const nota = typeof m.presupuesto_nota === "string" ? m.presupuesto_nota : "";
  if (!nota.trim()) {
    problemas.push(
      `el manifiesto declara \`presupuesto_lineas: ${presupuesto}\` y no trae \`presupuesto_nota\`. Sin ella, quien ` +
        "mida el margen con `wc -l` cree que tiene mas lugar del que tiene. Arreglo: agregar `presupuesto_nota` que " +
        "diga que el numero que vale es el campo `lineas` de `leerCanonico()`, y por que el presupuesto es este.",
    );
    return problemas;
  }
  if (!nota.includes("leerCanonico()")) {
    problemas.push(
      "`presupuesto_nota` no nombra `leerCanonico()`, que es la funcion que cobra el check. Un numero contado a mano " +
        "en la nota es lo que en Rigel dejo un margen de CERO creyendo que era de diez. Arreglo: nombrarla.",
    );
  }
  if (!/wc -l/.test(nota)) {
    problemas.push(
      "`presupuesto_nota` no advierte que `wc -l` sobre las secciones NO es la medida: da (secciones - 1) lineas " +
        "de menos. Arreglo: decirlo en la nota.",
    );
  }
  if (!new RegExp(`(^|[^0-9])${presupuesto}([^0-9]|$)`).test(nota)) {
    problemas.push(
      `el presupuesto es ${presupuesto} y \`presupuesto_nota\` no lo nombra: se cambio el numero sin escribir la ` +
        "decision. Subir el presupuesto es una decision, no un ajuste, y cada linea la carga cada sesion de cada " +
        `repo. Arreglo: reescribir la nota con el ${presupuesto}, la fecha, las lineas medidas con \`leerCanonico()\` ` +
        "y por que no se podia recortar otra cosa.",
    );
  }
  return problemas;
}

test("el presupuesto del canonico declara como se mide y nombra el numero vigente", () => {
  assert.deepEqual(problemasDelPresupuesto(manifiesto()), []);
});

test("la aritmetica que la nota describe es la que cobra el check", () => {
  const c = leerCanonico(CANONICO);
  const suma = c.secciones.reduce((n, s) => n + (s.texto.split("\n").length - 1), 0);
  assert.equal(
    c.lineas,
    suma + (c.secciones.length - 1),
    `leerCanonico() cuenta ${c.lineas} lineas y las ${c.secciones.length} secciones suman ${suma}: la nota del ` +
      "presupuesto dice que la diferencia es UNA linea en blanco por cada par de secciones. Si cambiaste como se arma " +
      "el cuerpo, reescribi la nota en el mismo PR: el numero que alguien mide a mano tiene que poder reconciliarse.",
  );
  assert.ok(
    c.lineas <= Number(manifiesto().presupuesto_lineas),
    `el canonico usa ${c.lineas} lineas y el presupuesto es ${manifiesto().presupuesto_lineas}`,
  );
});

test("MUERDE: subir el presupuesto sin reescribir la nota, o sacarle la medida, da rojo", () => {
  const real = manifiesto();
  assert.deepEqual(problemasDelPresupuesto(real), [], "el manifiesto real tiene que pasar antes de mutarlo");

  const subido = { ...real, presupuesto_lineas: Number(real.presupuesto_lineas) + 40 };
  assert.match(problemasDelPresupuesto(subido).join("\n"), /no lo nombra/, "subir el numero sin la nota tiene que dar rojo");

  const sinNota = { ...real };
  delete sinNota.presupuesto_nota;
  assert.match(problemasDelPresupuesto(sinNota).join("\n"), /no trae `presupuesto_nota`/);

  const sinFuncion = { ...real, presupuesto_nota: real.presupuesto_nota.replaceAll("leerCanonico()", "el script") };
  assert.match(problemasDelPresupuesto(sinFuncion).join("\n"), /no nombra `leerCanonico\(\)`/);

  const sinAdvertencia = { ...real, presupuesto_nota: real.presupuesto_nota.replaceAll("wc -l", "contar") };
  assert.match(problemasDelPresupuesto(sinAdvertencia).join("\n"), /wc -l/);

  // Sin presupuesto no hay nada que declarar: un canonico sintetico de las pruebas
  // no tiene por que traer la nota.
  assert.deepEqual(problemasDelPresupuesto({ presupuesto_lineas: 0 }), []);
});
