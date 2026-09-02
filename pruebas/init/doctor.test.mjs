import test from "node:test";
import assert from "node:assert/strict";
import {
  PROGRAMAS, versionDe, revisar, lineasDelInforme, veredicto,
} from "../../herramientas/projects-doctor.mjs";
import { NODE_MINIMO, NODE_RECOMENDADO } from "../../herramientas/projects-init.mjs";

// ---------------------------------------------------------------------------
// EL PASO 0, QUE ERA CUATRO COMANDOS Y UNA COMPARACION A OJO.
//
// QUE CIERRA. La guia acompaniada pedia tipear cuatro comandos y comparar la
// salida contra un ejemplo. Tres defectos medidos:
//   1. Comparar a ojo no comprueba nada: el piso de Node vive en el codigo.
//   2. DOCKER no estaba en ninguna lista, y es el unico requisito que el marco
//      no comprobaba. Su fallo --`command not found: docker`-- era el peor del
//      recorrido, y el grep de instrucciones de instalacion volvia VACIO.
//   3. Un `command not found` no dice que instalar ni de donde.
//
// LA REGLA QUE ESTE BANCO VIGILA, y es la que da valor a la herramienta: nunca
// decir que algo falta sin decir EN LA MISMA SALIDA de donde se saca. Un
// diagnostico sin la salida obliga a buscar afuera, y afuera es donde la
// persona se pierde.
// ---------------------------------------------------------------------------

test("hay programas que revisar: un cero aca es este banco roto", () => {
  assert.ok(PROGRAMAS.length >= 5, `se declararon ${PROGRAMAS.length} programas y se esperaban al menos cinco`);
});

test("TODO programa dice de donde se baja: sin eso el diagnostico manda a buscar afuera", () => {
  const mudos = PROGRAMAS.filter((p) => !p.donde || !/https?:\/\/|viene con/.test(p.donde)).map((p) => p.nombre);
  assert.deepEqual(mudos, [], `estos no dicen de donde se sacan: ${mudos.join(", ")}`);
});

test("Docker esta en la lista, y declarado opcional: es el requisito que el marco no comprobaba en ningun lado", () => {
  const d = PROGRAMAS.find((p) => p.id === "docker");
  assert.ok(d, "Docker no esta entre los programas: vuelve el peor error del recorrido");
  assert.ok(d.soloSi, "Docker tiene que estar marcado como condicional: un sitio no lo necesita");
  assert.match(d.donde, /docker\.com/, "tiene que traer el enlace de descarga");
});

test("el piso de Node es el MISMO que usa el init: dos pisos distintos divergen y el que se pudre es el que nadie mira", () => {
  const n = PROGRAMAS.find((p) => p.id === "node");
  assert.equal(n.minimo, NODE_MINIMO);
  assert.equal(n.recomendado, NODE_RECOMENDADO);
});

test("versionDe saca el numero de las tres formas que los programas contestan", () => {
  assert.equal(versionDe("git version 2.50.1"), "2.50.1");
  assert.equal(versionDe("v24.19.0"), "24.19.0");
  assert.equal(versionDe("0.35.0"), "0.35.0");
  assert.equal(versionDe("2.7"), "2.7.0", "una version sin parche se completa con cero");
  assert.equal(versionDe("sin numeros"), null);
  assert.equal(versionDe(null), null, "un programa ausente no puede reventar el informe");
});

/** Un programa de mentira, para no depender de lo que haya en la maquina. */
const falso = (id, version, extra = {}) => ({
  id, nombre: id, para: "x", donde: "https://ejemplo.invalid", minimo: null,
  version: () => version, ...extra,
});

test("los cuatro estados se distinguen: falta, viejo, flojo y bien", () => {
  const e = revisar([
    falso("ausente", null),
    falso("viejo", "1.0.0", { minimo: "2.0.0" }),
    falso("flojo", "2.0.0", { minimo: "1.0.0", recomendado: "3.0.0" }),
    falso("bien", "3.0.0", { minimo: "1.0.0", recomendado: "2.0.0" }),
  ]);
  assert.deepEqual(e.map((x) => x.estado), ["falta", "viejo", "flojo", "bien"]);
});

test("lo que falta sale con su enlace en la MISMA salida", () => {
  const e = revisar([falso("ausente", null)]);
  const texto = lineasDelInforme(e, { adentro: true, cuenta: "x" }).join("\n");
  assert.match(texto, /FALTA/);
  assert.match(texto, /https:\/\/ejemplo\.invalid/, "el enlace tiene que estar donde la persona ya esta mirando");
});

test("un programa OBLIGATORIO que falta bloquea; uno OPCIONAL que falta no", () => {
  const sesion = { adentro: true, cuenta: "x" };
  const bloquea = veredicto(revisar([falso("obligatorio", null)]), sesion);
  assert.equal(bloquea.codigo, 1, "sin un obligatorio no se puede seguir");

  const noBloquea = veredicto(revisar([falso("opcional", null, { soloSi: "sólo para aplicaciones" })]), sesion);
  assert.equal(noBloquea.codigo, 0, "un opcional ausente no puede frenar a quien hace un sitio");
  assert.match(noBloquea.lineas.join("\n"), /opcional/, "pero tiene que avisarlo");
});

test("gh instalado y SIN sesion bloquea, y dice el comando exacto: es el caso mas comun de todos", () => {
  const estados = revisar([falso("gh", "2.0.0")]);
  const v = veredicto(estados, { adentro: false, cuenta: null });
  assert.equal(v.codigo, 1);
  const texto = lineasDelInforme(estados, { adentro: false, cuenta: null }).join("\n");
  assert.match(texto, /gh auth login/, "tiene que decir el comando, no solo que falta la sesion");
});

test("gh AUSENTE no se reporta como sesion faltante: seria un segundo error por la misma causa", () => {
  const estados = revisar([falso("gh", null)]);
  const texto = lineasDelInforme(estados, { adentro: false, cuenta: null }).join("\n");
  assert.match(texto, /no se pudo comprobar porque falta gh/);
  assert.ok(!/gh auth login/.test(texto), "mandar a `gh auth login` cuando gh no existe es un consejo imposible");
});

test("MUERDE: un programa sin enlace de descarga se caza", () => {
  const sin = [{ id: "x", nombre: "x", para: "y", donde: "", minimo: null, version: () => null }];
  const mudos = sin.filter((p) => !p.donde || !/https?:\/\/|viene con/.test(p.donde));
  assert.equal(mudos.length, 1, "el detector no caza un programa sin enlace: no protege nada");
});

test("cuando esta todo, sale 0 y lo dice con una accion", () => {
  const v = veredicto(revisar([falso("todo", "1.0.0")]), { adentro: true, cuenta: "x" });
  assert.equal(v.codigo, 0);
  assert.match(v.lineas.join("\n"), /paso 1/, "el cierre tiene que decir que sigue, no solo que esta bien");
});
