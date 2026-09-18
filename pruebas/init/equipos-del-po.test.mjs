// EN UNA ORGANIZACION, EL PO QUE CODEOWNERS NOMBRA SE COMPRUEBA CONTRA SUS EQUIPOS.
//
// QUE DEFECTO CIERRA. En una organizacion, el CODEOWNERS del andamio pone al
// equipo `EQUIPO_PO` como unico dueño de proposal y specs, y al equipo
// `EQUIPO_BUILDERS` como dueño de todo lo demas. Ese cableado falla EN SILENCIO de
// cuatro formas, y ninguna produce un error en GitHub:
//
//   · el equipo del PO esta vacio: GitHub no le pide el review a nadie;
//   · todos sus miembros son tambien builders: un builder satisface el gate del
//     PO desde el otro rol, que es lo que el propio CODEOWNERS dice que no puede
//     pasar;
//   · tiene mas de una persona fuera de builders: no hay UN PO, hay varios, y el
//     valor `PO` del proyecto —el que nombran el README y las reglas— no dice cual;
//   · la unica persona fuera de builders no es la que el proyecto declara como PO.
//
// Hasta este cambio `projects init` escribia ese CODEOWNERS sin preguntarle nada
// a GitHub, y la guia tecnica lo advertia en prosa, con un conteo escrito a mano
// que ya habia envejecido (`--jq 'length'   # hoy: 0`).
//
// ORIGEN: Rigel 1.14.0, change archivado `2026-09-01-arranque-ejecutable`, commit
// b8836af (2026-09-01): `derivarPO` toma los miembros de `po` que no estan en
// `builders` y se planta si no es exactamente uno, en vez de elegir el primero.
// Aca se porta la PROPIEDAD y no la derivacion: Projects no deriva el PO, lo
// declara en el archivo de valores, asi que lo que se comprueba es que lo
// declarado y lo que GitHub tiene coincidan.
//
// POR QUE ES AVISO Y NO ROJO: el arreglo vive fuera del arbol del proyecto —es la
// configuracion de los equipos de la organizacion, un acto de quien la administra—
// y la decision D1 del marco manda que eso vaya en aviso. Lo que NUNCA hace es
// callarse: "no pude mirar" se dice con su motivo y con el comando para mirarlo a
// mano.
import test from "node:test";
import assert from "node:assert/strict";

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { revisarEquipos } from "../../herramientas/projects-doctor.mjs";
import {
  clasificarEquiposDelPO,
  clasificarSondaDeEquipo,
  comprobarEquiposDelPO,
  lineasDeEquiposDelPO,
} from "../../herramientas/projects-init.mjs";

const BASE = {
  TIPO_CUENTA: "organizacion",
  ORG: "una-org",
  EQUIPO_PO: "po",
  EQUIPO_BUILDERS: "builders",
  PO: "la-po",
};

/** Un `gh` de mentira: devuelve los miembros de cada equipo como los devuelve
 *  `gh api ... --jq '.[].login'` —un login por linea— y registra que le pidieron. */
function ghFalso(equipos) {
  const pedidos = [];
  const correr = ({ org, equipo }) => {
    pedidos.push(`${org}/${equipo}`);
    const miembros = equipos[equipo];
    if (miembros === undefined) {
      return {
        presente: true,
        codigo: 1,
        stdout: '{"message":"Not Found","status":"404"}',
        stderr: "gh: Not Found (HTTP 404)",
        error: null,
      };
    }
    return { presente: true, codigo: 0, stdout: miembros.map((m) => `${m}\n`).join(""), stderr: "", error: null };
  };
  return { correr, pedidos };
}

test("clasificar: exactamente uno fuera de builders, y es el PO declarado -> bien", () => {
  const r = clasificarEquiposDelPO({ po: "la-po", miembrosPo: ["la-po"], miembrosBuilders: ["b1", "b2"] });
  assert.equal(r.estado, "bien");
});

test("clasificar: el handle se compara sin mayusculas, como lo compara GitHub", () => {
  const r = clasificarEquiposDelPO({ po: "La-PO", miembrosPo: ["la-po", "B1"], miembrosBuilders: ["b1"] });
  assert.equal(r.estado, "bien", JSON.stringify(r));
});

test("clasificar: equipo del PO vacio -> vacio", () => {
  assert.equal(clasificarEquiposDelPO({ po: "la-po", miembrosPo: [], miembrosBuilders: ["b1"] }).estado, "vacio");
});

test("clasificar: todos los del equipo del PO son builders -> solo-builders", () => {
  const r = clasificarEquiposDelPO({ po: "b1", miembrosPo: ["b1"], miembrosBuilders: ["b1", "b2"] });
  assert.equal(r.estado, "solo-builders");
});

test("clasificar: dos personas fuera de builders -> varios, y NO elige la primera", () => {
  const r = clasificarEquiposDelPO({ po: "la-po", miembrosPo: ["la-po", "otra"], miembrosBuilders: ["b1"] });
  assert.equal(r.estado, "varios");
  assert.deepEqual(r.soloPo, ["la-po", "otra"]);
});

test("clasificar: la unica fuera de builders no es el PO declarado -> otro", () => {
  const r = clasificarEquiposDelPO({ po: "la-po", miembrosPo: ["la-po", "otra"], miembrosBuilders: ["la-po"] });
  assert.equal(r.estado, "otro");
  assert.deepEqual(r.soloPo, ["otra"]);
  assert.equal(r.poEnBuilders, true, "el detalle tiene que poder decir que el PO declarado esta en builders");
});

test("sonda: 0 con logins -> la lista; 404 -> sin-equipo; sin gh -> sin-gh; sin sesion -> sin-auth; sin cuerpo -> sin-red", () => {
  assert.deepEqual(clasificarSondaDeEquipo({ presente: true, codigo: 0, stdout: "a\nb\n" }), { estado: "medido", miembros: ["a", "b"], detalle: "2 miembro(s)" });
  assert.equal(clasificarSondaDeEquipo({ presente: true, codigo: 1, stdout: '{"message":"Not Found","status":"404"}', stderr: "gh: Not Found (HTTP 404)" }).estado, "sin-equipo");
  assert.equal(clasificarSondaDeEquipo({ presente: false }).estado, "sin-gh");
  assert.equal(clasificarSondaDeEquipo({ presente: true, codigo: 4, stdout: "", stderr: "To get started with GitHub CLI, please run:  gh auth login" }).estado, "sin-auth");
  assert.equal(clasificarSondaDeEquipo({ presente: true, codigo: 1, stdout: "", stderr: "", error: "timeout" }).estado, "sin-red");
  // Salio 0 con algo que no son logins: no se declara medido sobre eso.
  assert.equal(clasificarSondaDeEquipo({ presente: true, codigo: 0, stdout: "<html>proxy</html>\n" }).estado, "no-se-sabe");
});

test("comprobar: en una cuenta de USUARIO no consulta equipos, porque ahi no existen", () => {
  const gh = ghFalso({});
  const r = comprobarEquiposDelPO({ ...BASE, TIPO_CUENTA: "usuario" }, gh.correr);
  assert.equal(r.estado, "no-aplica");
  assert.deepEqual(gh.pedidos, [], "le pregunto a GitHub por equipos de una cuenta que no puede tenerlos");
});

test("comprobar: organizacion bien armada -> bien, preguntando por los DOS equipos", () => {
  const gh = ghFalso({ po: ["la-po"], builders: ["b1", "b2"] });
  const r = comprobarEquiposDelPO(BASE, gh.correr);
  assert.equal(r.estado, "bien", JSON.stringify(r));
  assert.deepEqual(gh.pedidos.sort(), ["una-org/builders", "una-org/po"]);
});

test("comprobar: el equipo del PO no existe -> no afirma nada, y no pregunta el segundo", () => {
  const gh = ghFalso({ builders: ["b1"] });
  const r = comprobarEquiposDelPO(BASE, gh.correr);
  assert.equal(r.estado, "sin-equipo");
  assert.equal(r.equipo, "po");
  assert.deepEqual(gh.pedidos, ["una-org/po"]);
});

test("comprobar: un slug o una org con forma de inyeccion NO llega a gh", () => {
  const gh = ghFalso({ po: ["la-po"], builders: ["b1"] });
  const r = comprobarEquiposDelPO({ ...BASE, EQUIPO_PO: "po;rm -rf" }, gh.correr);
  assert.equal(r.estado, "no-se-sabe");
  assert.deepEqual(gh.pedidos, [], "un valor que no tiene forma de slug viajo a la linea de comandos");
});

test("las lineas: bien -> una linea sin anotacion; cualquier problema -> ::warning:: con el arreglo escrito", () => {
  const valores = BASE;
  const bien = lineasDeEquiposDelPO({ estado: "bien", soloPo: ["la-po"] }, valores);
  assert.equal(bien.aviso, false);
  assert.ok(bien.lineas.every((l) => !l.startsWith("::warning::")), bien.lineas.join("\n"));
  assert.match(bien.lineas.join("\n"), /la-po/);

  for (const estado of ["vacio", "solo-builders", "varios", "otro"]) {
    const r = lineasDeEquiposDelPO({ estado, soloPo: estado === "varios" ? ["la-po", "otra"] : ["otra"], poEnBuilders: estado === "otro" }, valores);
    assert.equal(r.aviso, true, estado);
    const texto = r.lineas.join("\n");
    assert.match(texto, /^::warning::/, `${estado}: sin anotacion, el aviso no se ve en un log de CI`);
    // El arreglo va escrito ADENTRO: que equipo tocar y que valor corregir.
    assert.match(texto, /una-org\/po/, `${estado}: no nombra el equipo a corregir`);
    assert.match(texto, /gh api orgs\/una-org\/teams\/po\/members --jq '\.\[\]\.login'/, `${estado}: no trae el comando para mirarlo a mano`);
  }

  for (const estado of ["sin-gh", "sin-auth", "sin-red", "sin-equipo", "no-se-sabe"]) {
    const r = lineasDeEquiposDelPO({ estado, equipo: "po", detalle: "d" }, valores);
    assert.equal(r.aviso, true, estado);
    const texto = r.lineas.join("\n");
    assert.match(texto, /^::warning::/, estado);
    assert.match(texto, /no se pudo comprobar/i, `${estado}: "no pude mirar" tiene que decirse, no pasar por bien`);
  }

  assert.deepEqual(lineasDeEquiposDelPO({ estado: "no-aplica" }, valores).lineas, [], "en una cuenta personal no hay nada que decir de equipos");
});

// EL MISMO CONTROL, A PEDIDO: `projects-doctor --valores <archivo>`. Existe porque
// los equipos cambian despues de instanciar, y porque la fase 1 de la guia tecnica
// pasa antes de que exista el repo. Es la MISMA funcion —se le inyecta aca para no
// salir a la red— y el codigo de salida sigue la regla del doctor: lo medido que
// esta mal bloquea, lo que no se pudo mirar avisa.
function conValores(bytes) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "doctor-equipos-"));
  const ruta = path.join(dir, "valores.json");
  fs.writeFileSync(ruta, bytes);
  return { ruta, limpiar: () => fs.rmSync(dir, { recursive: true, force: true }) };
}

test("doctor --valores: un problema MEDIDO sale 1; no pude mirar sale 0; bien sale 0; cuenta personal sale 0", () => {
  const { ruta, limpiar } = conValores(JSON.stringify(BASE));
  try {
    const conEstado = (estado, extra = {}) => revisarEquipos(ruta, { comprobar: () => ({ estado, soloPo: ["otra"], ...extra }) });
    for (const estado of ["vacio", "solo-builders", "varios", "otro"]) {
      const r = conEstado(estado);
      assert.equal(r.codigo, 1, `${estado}: un cableado medido que no sostiene el gate del PO tiene que bloquear`);
      assert.match(r.lineas.join("\n"), /PO DE CODEOWNERS/);
    }
    assert.equal(conEstado("sin-auth", { equipo: "po", detalle: "d" }).codigo, 0, "no pude mirar no es un problema medido");
    assert.match(conEstado("sin-auth", { equipo: "po", detalle: "d" }).lineas.join("\n"), /no se pudo comprobar/);
    assert.equal(conEstado("bien", { soloPo: ["la-po"] }).codigo, 0);
    assert.equal(conEstado("no-aplica").codigo, 0);
  } finally {
    limpiar();
  }
});

test("doctor --valores: lee el archivo aunque tenga BOM, y uno ilegible sale 1 diciendo cual", () => {
  const conBom = conValores(Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from(JSON.stringify(BASE))]));
  try {
    let visto = null;
    const r = revisarEquipos(conBom.ruta, { comprobar: (v) => ((visto = v), { estado: "bien", soloPo: ["la-po"] }) });
    assert.equal(r.codigo, 0, r.lineas.join("\n"));
    assert.equal(visto?.PO, "la-po", "el doctor no leyo el archivo con BOM");
  } finally {
    conBom.limpiar();
  }
  const roto = conValores("{ roto");
  try {
    const r = revisarEquipos(roto.ruta);
    assert.equal(r.codigo, 1);
    assert.match(r.lineas.join("\n"), /no pude leer/);
  } finally {
    roto.limpiar();
  }
});
