import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { arregloConcretoDe, lineasDelResumen, PASOS_DEL_ARRANQUE } from "../../herramientas/projects-init.mjs";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

// ---------------------------------------------------------------------------
// EL HUECO QUE ESTABA DECLARADO Y VACIO.
//
// `lineasDelResumen` lee `fallo.arregloConcreto ?? fallo.paso.arreglo` desde
// siempre. Un grep sobre TODO el repositorio devolvia UNA SOLA linea: la
// lectura. Nadie lo asignaba nunca, asi que el 100% de los fallos del arranque
// imprimia el consejo generico del paso.
//
// Y EL CONSEJO GENERICO NO PUEDE MIRAR QUE FALLO. Dice lo mismo si falto la red,
// si falto un permiso o si el ejecutable no existe. Las tres causas tienen
// arreglos distintos, y una de ellas --que falte el ejecutable-- hacia que el
// consejo mandara a correr algo que tampoco iba a existir.
// ---------------------------------------------------------------------------

test("cuando falta el ejecutable, el consejo NO manda a correrlo otra vez", () => {
  for (const fallo of [{ codigo: "ENOENT" }, { estado: 127 }]) {
    const a = arregloConcretoDe(fallo, { comando: "corepack" });
    assert.ok(a, `${JSON.stringify(fallo)} tendria que tener un arreglo propio`);
    assert.match(a, /falta el programa/, "tiene que decir que el problema no es del proyecto");
    assert.match(a, /nodejs\.org/, "y de donde se baja");
  }
});

test("permisos y red tienen su propio arreglo, y no el del paso", () => {
  const permisos = arregloConcretoDe({ codigo: "EACCES" }, {});
  assert.match(permisos, /permiso/, "el de permisos tiene que hablar de permisos");
  assert.match(permisos, /carpeta tuya/, "y decir que hacer, no solo que paso");

  const red = arregloConcretoDe({ codigo: "ETIMEDOUT" }, {});
  assert.match(red, /internet/, "el de red tiene que nombrar la red");
  assert.match(red, /no hay que empezar de nuevo/, "y tranquilizar sobre lo ya escrito, que es lo que la persona teme");
});

test("cuando NO sabe devuelve null, y el generico sigue sirviendo", () => {
  // Inventar una causa es peor que dar el consejo generico: manda a la persona a
  // arreglar algo que no esta roto.
  assert.equal(arregloConcretoDe({ estado: 1 }, {}), null);
  assert.equal(arregloConcretoDe({}, {}), null);
  assert.equal(arregloConcretoDe(null, {}), null, "un fallo sin forma no puede reventar");
});

test("el resumen USA el arreglo concreto cuando lo hay, y el del paso cuando no", () => {
  const paso = PASOS_DEL_ARRANQUE[0];
  const conConcreto = lineasDelResumen([{ paso, ok: false, error: "x", arregloConcreto: "HACE ESTO" }], "/tmp/x").join("\n");
  assert.match(conConcreto, /Como se arregla: HACE ESTO/);

  const sinConcreto = lineasDelResumen([{ paso, ok: false, error: "x", arregloConcreto: null }], "/tmp/x").join("\n");
  assert.match(sinConcreto, /Como se arregla: /, "sin concreto tiene que caer al del paso");
  assert.ok(!/HACE ESTO/.test(sinConcreto));
});

test("NINGUN consejo de paso manda a correr el comando que acaba de fallar", () => {
  // Era el caso de `verificado`: fallaba `pnpm verificar` y el consejo decia
  // "corre `pnpm verificar` en el destino". La persona lo corre otra vez, falla
  // otra vez, y no aprendio nada.
  const circulares = [];
  for (const p of PASOS_DEL_ARRANQUE) {
    const comando = `pnpm ${p.args.includes("run") ? p.args[p.args.length - 1] : p.args[0]}`;
    if (new RegExp(`corre \`${comando.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\``).test(p.arreglo)) {
      circulares.push(`${p.clave}: su consejo dice "corre ${comando}", que es lo que acaba de fallar`);
    }
  }
  assert.deepEqual(circulares, [], `${circulares.join(" | ")}`);
});

test("MUERDE: el detector de circularidad caza un consejo circular", () => {
  const falso = {
    clave: "x",
    args: ["run", "verificar"],
    arreglo: "corre `pnpm verificar` en el destino",
  };
  const comando = `pnpm ${falso.args[falso.args.length - 1]}`;
  assert.ok(
    new RegExp(`corre \`${comando}\``).test(falso.arreglo),
    "el detector no caza el consejo circular que dice cazar: no protege nada",
  );
});

test("arregloConcreto se ASIGNA de verdad, no solo se lee", () => {
  // Es el defecto original: la lectura existia y la asignacion no. Un grep sobre
  // la herramienta tiene que encontrar las dos.
  const s = fs.readFileSync(path.join(RAIZ, "herramientas/projects-init.mjs"), "utf8");
  // `assert.ok` y no `assert.match`: con match, el fallo vuelca las 178.000
  // letras del archivo en el mensaje y tapa el rojo que uno vino a leer.
  assert.ok(
    /arregloConcreto: r\.ok \? null : arregloConcretoDe/.test(s),
    "nadie asigna arregloConcreto: vuelve el hueco vacio",
  );
});

test("correrPaso devuelve la CAUSA CRUDA, no solo una frase ya armada", async () => {
  // Sin esto, `arregloConcretoDe` no tiene con que clasificar: recibiria el texto
  // "fallo" y no el ENOENT que lo explica. Es el eslabon que une las dos mitades,
  // y el unico que no se puede comprobar llamando a la clasificadora sola.
  const { correrPaso } = await import("../../herramientas/projects-init.mjs");
  const r = correrPaso(
    { comando: "no-existe-este-programa-jamas", prefijo: [], nombre: "x" },
    { clave: "x", titulo: "x", args: ["--version"], porQue: "", arreglo: "" },
    process.cwd(),
  );
  assert.equal(r.ok, false);
  assert.ok(r.codigo !== undefined && r.estado !== undefined, `no devolvio la causa cruda: ${JSON.stringify(r)}`);
  // NO SE EXIGE UN CODIGO EN PARTICULAR, y eso lo enseño el runner de Windows.
  // En Unix esto llega como ENOENT; en Windows el paso corre con shell y cmd.exe
  // contesta 1, el MISMO 1 de un install que fallo de verdad. Exigir ENOENT o 127
  // aca era exigirle a Windows algo que Windows no dice.
  assert.ok(
    r.codigo === "ENOENT" || typeof r.estado === "number",
    `esperaba una causa cruda utilizable y vino ${JSON.stringify(r)}`,
  );
  // Lo que SI tiene que valer en los tres: con el programa ausente, sale el
  // arreglo del programa ausente. Se le pasa un "existe" que dice que no, que es
  // lo que `comandoDisponible` va a contestar de verdad para este comando.
  const a = arregloConcretoDe(r, { comando: "no-existe-este-programa-jamas" });
  assert.ok(a && /falta el programa/.test(a), `con el programa ausente esperaba su arreglo y vino ${a}`);
});

test('"falta el programa" se PREGUNTA, y por eso funciona igual en Windows', () => {
  // En Windows un ejecutable ausente llega como estado 1, indistinguible de un
  // install que fallo de verdad. Deducirlo del codigo dejaba a ese sistema sin
  // clasificacion ninguna, que es donde mas falta hace: es donde mas gente tiene
  // un Node viejo sin corepack.
  const comoWindows = { codigo: null, estado: 1 };
  assert.match(
    arregloConcretoDe(comoWindows, { comando: "pnpm" }, () => false),
    /falta el programa/,
    "con el programa ausente y estado 1 (Windows) no lo detecto",
  );
  // Y al reves: el MISMO estado 1 con el programa presente NO es "falta el
  // programa". Si lo fuera, cualquier fallo real mandaria a instalar algo que ya
  // esta, que es el consejo mas confuso posible.
  assert.equal(
    arregloConcretoDe(comoWindows, { comando: "pnpm" }, () => true),
    null,
    "con el programa presente, un estado 1 se dio por 'falta el programa'",
  );
});
