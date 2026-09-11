import test from "node:test";
import assert from "node:assert/strict";
import { bloqueDeProteccion, bloqueDeLaCompuertaDeProd, insertarProteccionMedida } from "../../herramientas/projects-init.mjs";

// ---------------------------------------------------------------------------
// LA COMPUERTA DE PRODUCCION QUE EL PROYECTO DE VERDAD TIENE, ESCRITA MIDIENDO.
//
// EL DEFECTO QUE ESTO CIERRA es de una familia que este repositorio persigue:
// describirle a alguien una compuerta que su repositorio no puede tener. El
// documento de proteccion ya mide si hay rulesets; la promocion a produccion
// choca contra EL MISMO MURO --medido el 2026-09-10 en la documentacion de
// GitHub: «Users with GitHub Free plans can only configure environments for
// public repositories»-- y no se decia en ningun lado.
//
// LA PROPIEDAD MAS IMPORTANTE DE ESTE BANCO no es que el texto este: es que NO
// este donde no corresponde. Una aplicacion no recibe `desplegar.yml`, asi que
// escribirle como promover a produccion seria documentarle maquinaria que no
// tiene — que es textualmente lo que prohibe el requirement «El proyecto declara
// que puede publicar y que no».
// ---------------------------------------------------------------------------

const CONTEXTO = { detalle: "detalle medido", org: "una-org", proyecto: "un-proyecto", fecha: "2026-09-10" };
const texto = (estado, forma) => bloqueDeLaCompuertaDeProd({ estado, forma, fecha: "2026-09-10" }).join("\n");

test("a una APLICACION no se le escribe una sola linea sobre promover", () => {
  for (const estado of ["puede", "sin-compuertas", "sin-red", "sin-auth", "no-se-sabe"]) {
    assert.equal(
      bloqueDeLaCompuertaDeProd({ estado, forma: "aplicacion" }).length,
      0,
      `con estado "${estado}" se le escribio a una aplicacion como promover a produccion, y una aplicacion no recibe desplegar.yml: es documentacion de maquinaria que ese proyecto no tiene`,
    );
  }
});

test("a un SITIO se le dice el piso, y el piso no es el environment", () => {
  // La distincion que sostiene todo el diseno: el environment es un SEGUNDO
  // candado, no el primero. Si alguien lee que su compuerta es el environment y
  // resulta que su plan no lo admite, la lectura es "no tengo compuerta" — y es
  // falsa: la promocion sigue exigiendo que una persona apriete el boton.
  for (const estado of ["puede", "sin-compuertas", "sin-red"]) {
    const t = texto(estado, "sitio");
    assert.match(t, /Producción no se publica sola/, `con estado "${estado}" no se dice que produccion no sale sola`);
    assert.match(t, /Run workflow/, `con estado "${estado}" no se dice como se promueve`);
  }
});

test("cuando SI se puede: el segundo candado, donde se enciende, y que caduca", () => {
  const t = texto("puede", "sitio");
  assert.match(t, /Required reviewers/, "no dice donde se enciende la aprobacion de terceros");
  assert.match(t, /quién aprobó/, "no dice que es lo que ese candado agrega al rastro");

  // LOS DOS NUMEROS MEDIDOS, y el segundo es el que sorprende: la corrida que
  // expira queda CANCELADA, no roja. Prometer que "deja rojo visible" seria
  // mandar a alguien a esperar una senal que no va a llegar.
  assert.match(t, /30 días/, "no dice que la aprobacion caduca");
  assert.match(t, /35/, "no dice a los cuantos dias se cancela la corrida entera");
  assert.match(t, /cancelada, no roja/, "promete un rojo que GitHub no da: una corrida que expira queda cancelada");
});

test("cuando NO se puede: se declara el desvio, y se dice QUE es lo que falta", () => {
  const t = texto("sin-compuertas", "sitio");
  assert.match(t, /DESVÍO DECLARADO/, "no se declara el desvio: la doctrina del repo es que apartarse no puede ser silencioso");
  assert.match(t, /mismo muro/, "no conecta con la medicion de arriba, que es de donde sale");

  // Lo que falta, dicho con precision: no es que no haya compuerta — es que no
  // hay TERCERO. Escribir "no hay compuerta" seria mas alarmante y menos cierto.
  assert.match(t, /sin que nadie más lo\s+mire/, "no dice que es exactamente lo que se pierde");
  assert.match(t, /nunca\s+«está pendiente»/, "no aplica la regla del repo: pendiente es lo que se puede hacer y no se hizo");
});

test("cuando no se pudo medir, NO se afirma nada en ninguna direccion", () => {
  const t = texto("sin-red", "sitio");
  assert.match(t, /no afirma nada/, "un 'no pude mirar' se escribio como si fuera un veredicto");
  assert.ok(!/DESVÍO DECLARADO/.test(t), "declaro un desvio sin haber medido que lo haya");
  assert.ok(!/Required reviewers/.test(t), "mando a encender algo sin saber si este repositorio lo admite");
});

test("el bloque llega al documento del proyecto, y despues del bloque medido", () => {
  const original = ["# Proteccion de main", "", "> 🕳️ aplica las cuatro reglas", "", "**Se encienden ahora.** ...", ""].join("\n");
  const { texto: doc } = insertarProteccionMedida(original, bloqueDeProteccion({ estado: "puede", ...CONTEXTO, forma: "sitio" }));
  assert.match(doc, /## La compuerta de PRODUCCION/, "el bloque no llego al documento");
  assert.ok(
    doc.indexOf("sí puede** tener protección de rama") < doc.indexOf("## La compuerta de PRODUCCION"),
    "la compuerta de prod quedo ANTES de la medicion de la que se deriva: se lee un veredicto sin haber leido de donde sale",
  );
});

test("y a una aplicacion el documento le llega sin esa seccion", () => {
  const original = ["# Proteccion de main", "", "> 🕳️ aplica las cuatro reglas", "", "**Se encienden ahora.** ...", ""].join("\n");
  const { texto: doc } = insertarProteccionMedida(original, bloqueDeProteccion({ estado: "puede", ...CONTEXTO, forma: "aplicacion" }));
  assert.ok(!/La compuerta de PRODUCCION/.test(doc), "a una aplicacion se le documento una promocion que su proyecto no recibe");
  assert.match(doc, /sí puede\*\* tener protección de rama/, "y la medicion de siempre tiene que seguir llegando igual");
});

test("MUERDE: sin `forma`, no se le escribe a nadie — el defecto se ve, no se adivina", () => {
  // Si un dia alguien llama a esto sin pasar la forma, la respuesta correcta es
  // NO escribir: escribirle a todos "por las dudas" es como nacio el defecto que
  // este change cierra. Se comprueba que el defecto por omision sea el callado.
  assert.equal(bloqueDeLaCompuertaDeProd({ estado: "puede" }).length, 0, "sin saber la forma se escribio igual");
  assert.equal(bloqueDeProteccion({ estado: "puede", ...CONTEXTO }).compuertaDeProd.length, 0, "sin forma, el bloque se cuela por el otro camino");
});
