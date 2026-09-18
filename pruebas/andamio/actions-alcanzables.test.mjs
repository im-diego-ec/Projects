// TODA ACTION PUBLICADA ESTA ALCANZADA POR ALGUN `uses:`, O DECLARADA CON SU MOTIVO Y SU VIGENCIA.
//
// POR QUE ESTE BANCO EXISTE. `openspec/cobertura-de-requirements.md` publica que parte del
// contrato tiene compuerta, y puede citar como compuerta cualquier cosa de `actions/`. Nada
// preguntaba si esa action la ejecuta alguien: una carpeta de `actions/` podia sostener un
// requirement en la pagina sin correr en ningun repositorio. Rigel lo encontro con dos
// requirements publicados como sostenidos por una compuerta que no corria (issue #375 de alla,
// 2026-09-07) y cerro la clase con este banco (Rigel 2.2.0, commits dd73280, 1ad69e7, 1826f67).
//
// Y ACA EL CASO YA EXISTIA. Medido el 2026-09-17: `actions/carril-docs` no la invoca ningun
// `uses:` del marco ni del andamio. No es la compuerta de ningun requirement —nunca pone nada en
// rojo, es fail-open por diseño— y por eso no mentia en la pagina; pero era una pieza publicada
// sin nadie que la corra, y nada lo decia.
//
// LA DECISION SOBRE carril-docs, tomada en el change `el-censo-no-miente`: se DECLARA, no se
// cablea. Cablearla en `marco-ci.yml` cambia el workflow que consumen los proyectos (contrato),
// y en el andamio agregaria a cada proyecto nuevo una segunda deteccion del carril de docs cuando
// `marco-ci.yml` ya trae la suya en el job `cambios`. Retirarla es breaking para quien la use por
// `uses:`. Lo que no se decide aca, y queda escrito: el marco tiene DOS detecciones del mismo
// carril —la de esta action y la inline de `marco-ci.yml`, con los mismos patrones por
// defecto—, o sea el mismo predicado en dos lugares sin atar por comportamiento. Unificarlas
// toca el contrato del reusable, y es trabajo de la linea v2.
//
// LO QUE ESTE BANCO NO VERIFICA: que la action haga algo util, ni que un repositorio ADOPTADO la
// tenga cableada. Cierra un hueco mas chico y concreto: que la pieza sea ALCANZABLE.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { actionsPublicadas, alcanzadas, FORMAS } from "../alcance-de-las-actions.mjs";
import { FORMA_DE_VERSION, vencida, versionPublicada } from "../vigencia.mjs";

/** Las actions que legitimamente NO estan alcanzadas por ningun `uses:`.
 *
 *  Una por una, CON SU MOTIVO y LA VERSION EN QUE LA EXCEPCION VALE (`vigenteEn`). Por nombre y
 *  no por patron: un patron admite el caso siguiente sin que nadie lo decida, que es la doctrina
 *  que ya fijo la lista de excepciones de `pinado.test.mjs`. VACIA es el estado saludable. */
export const EXCEPCIONES = new Map([
  [
    "carril-docs",
    {
      vigenteEn: "1.9.6",
      motivo:
        "La publica el marco para que el consumidor la cablee en SU propio workflow: actions/README.md documenta sus " +
        "tres modos (pull request, push y workflow_run). El marco no la invoca porque marco-ci.yml trae su propia " +
        "deteccion del carril en el job `cambios`, con los mismos patrones por defecto, y el despliegue que reparte el " +
        "andamio no la usa. Nunca pone nada en rojo (fail-open ruidoso), asi que no es la compuerta de ningun " +
        "requirement. Pendiente para la linea v2: o marco-ci.yml la usa en vez de su copia inline, o se retira " +
        "(retirarla es breaking para quien la invoque por uses:).",
    },
  ],
]);

/** Las que ningun `uses:` alcanza y nadie declaro. */
export const huerfanas = (publicadas, alcance, excepciones = EXCEPCIONES) =>
  publicadas.filter((a) => !alcance.has(a) && !excepciones.has(a));

test("toda action publicada esta alcanzada por algun `uses:`, o declarada", () => {
  const publicadas = actionsPublicadas();
  assert.ok(
    publicadas.length >= 5,
    `se encontraron ${publicadas.length} actions en actions/: el lector esta roto y este banco no puede verificar nada, y eso es rojo, no verde`,
  );
  const sueltas = huerfanas(publicadas, alcanzadas());
  assert.deepEqual(
    sueltas,
    [],
    sueltas
      .map(
        (a) =>
          `'actions/${a}' no la invoca ningun workflow del marco ni del andamio, asi que no corre en ninguna parte y ` +
          "cualquier cosa que la pagina de cobertura cite de ella publicaria un requirement como sostenido por algo que no corre. " +
          "Tres salidas validas: cablearla con su 'uses:' (si es nueva, en el PR de release, porque su version todavia no existe); " +
          "borrarla si ya no sirve; o declararla en EXCEPCIONES de este banco con un motivo de al menos 80 caracteres y 'vigenteEn' " +
          "con la version publicada que dice el CHANGELOG",
      )
      .join("\n\n"),
  );
});

test("MUERDE: sobre un arbol de juguete, lo comentado, lo impreso, lo ajeno y lo de otro repo NO alcanzan", () => {
  // Sin esto, el caso de arriba pasaria igual el dia que la deteccion se rompa y empiece a
  // contar TODO como alcanzado. Se arma un arbol minimo con seis actions y una sola invocada de
  // verdad: las otras cinco caen cada una por una trampa distinta. La quinta es un worktree
  // anidado —una carpeta con su propio `.git`, como las que deja una sesion de agente— cuyo
  // workflow SI invoca a su action: es de otro arbol y no cuenta.
  const raiz = fs.mkdtempSync(path.join(os.tmpdir(), "alcanzables-"));
  try {
    const anidado = path.join(raiz, ".claude", "worktrees", "una-rama");
    fs.mkdirSync(path.join(anidado, ".github", "workflows"), { recursive: true });
    fs.writeFileSync(path.join(anidado, ".git"), "gitdir: /en/otro/lado\n");
    fs.writeFileSync(path.join(anidado, ".github", "workflows", "ci.yml"), "jobs:\n  a:\n    steps:\n      - uses: ./actions/anidada\n");
    for (const a of ["invocada", "comentada", "impresa", "ajena", "mayuscula", "anidada"]) {
      fs.mkdirSync(path.join(raiz, "actions", a), { recursive: true });
      fs.writeFileSync(path.join(raiz, "actions", a, "action.yml"), `name: ${a}\n`);
    }
    fs.mkdirSync(path.join(raiz, ".github", "workflows"), { recursive: true });
    fs.writeFileSync(
      path.join(raiz, ".github", "workflows", "ci.yml"),
      [
        "jobs:",
        "  a:",
        "    steps:",
        "      - uses: ./actions/invocada",
        "      # - uses: ./actions/comentada",
        "      - run: |",
        '          echo "        uses: im-diego-ec/Projects/actions/impresa@v1.9.6"',
        "      - uses: otra-cuenta/Projects/actions/ajena@v1.9.6",
        "      - uses: im-diego-ec/Projects/actions/Mayuscula@v1.9.6",
        "",
      ].join("\n"),
    );
    const alcance = alcanzadas(raiz);
    assert.deepEqual([...alcance.keys()].sort(), ["Mayuscula", "invocada"], "el lector encontro otra cosa que la unica invocacion de verdad (mas el nombre con otra caja)");
    assert.deepEqual(
      huerfanas(actionsPublicadas(raiz), alcance, new Map()),
      ["ajena", "anidada", "comentada", "impresa", "mayuscula"],
      "las cinco trampas tienen que salir huerfanas: comentada, impresa por un echo, de otra cuenta, con el nombre en otra " +
        "caja, e invocada solo desde un worktree anidado que es otro repositorio",
    );
  } finally {
    fs.rmSync(raiz, { recursive: true, force: true });
  }
});

test("las tres formas de invocar se reconocen, cada una sobre una invocacion REAL del arbol", () => {
  // Si alguna deja de reconocerse, las actions que la usan salen huerfanas y el rojo manda a
  // cablear algo que ya esta cableado. Se exige que CADA forma encuentre al menos una invocacion
  // en el arbol de hoy, sin nombrar cual: asi el caso no se rompe porque un lote mueva un pin,
  // y si se rompe el dia que una forma desaparezca del arbol, que es cuando hay que revisarla.
  const porForma = new Map(FORMAS.map((f) => [f.nombre, []]));
  for (const [accion, usos] of alcanzadas()) for (const u of usos) porForma.get(u.forma).push(`${accion} (${u.archivo}:${u.linea})`);
  const vacias = [...porForma].filter(([, v]) => v.length === 0).map(([k]) => k);
  assert.deepEqual(vacias, [], `estas formas no encontraron ninguna invocacion en el arbol: ${vacias.join(", ")}. Lo que si encontro: ${JSON.stringify(Object.fromEntries(porForma))}`);
});

test("una EXCEPCION que ya quedo alcanzada se RETIRA, y el banco lo exige", () => {
  // Una excepcion que sobrevive a su cableado es una action MAS que en adelante puede quedar
  // huerfana sin que nada avise: el agujero que este banco existe para cerrar, abierto por la
  // lista que existe para poder cerrarlo.
  const alcance = alcanzadas();
  const yaAlcanzadas = (nombres) => nombres.filter((a) => alcance.has(a));

  // EL CONTROL POSITIVO, primero: sin el, este caso pasa por vacio y su verde no se distingue
  // de «el predicado no mira nada». Se provoca con una action que hoy SI esta alcanzada.
  const unaAlcanzada = [...alcance.keys()][0];
  assert.deepEqual(yaAlcanzadas([unaAlcanzada, "carpeta-que-no-existe"]), [unaAlcanzada], "el predicado tiene que cazar una entrada alcanzada");

  const sobran = yaAlcanzadas([...EXCEPCIONES.keys()]);
  assert.deepEqual(
    sobran,
    [],
    sobran
      .map(
        (a) =>
          `'${a}' esta en EXCEPCIONES Y YA la invoca ${alcance.get(a).map((u) => `${u.archivo}:${u.linea}`).join(", ")}. ` +
          "La excepcion cumplio: BORRA su entrada en este mismo PR, porque mientras siga puesta la action puede volver a quedar sin 'uses:' en silencio",
      )
      .join("\n\n"),
  );
});

test("toda EXCEPCION nombra una action que existe, con motivo escrito y la version en que vale", () => {
  const publicadas = actionsPublicadas();
  const fantasmas = (nombres) => nombres.filter((a) => !publicadas.includes(a));
  const sinMotivo = (entradas) =>
    entradas.filter(([, e]) => typeof e?.motivo !== "string" || e.motivo.trim().length < 80).map(([a]) => a);
  const sinVigencia = (entradas) => entradas.filter(([, e]) => !FORMA_DE_VERSION.test(String(e?.vigenteEn ?? ""))).map(([a]) => a);

  // LOS CONTROLES POSITIVOS contra los predicados REALES, no contra una copia: sin ellos este
  // caso pasa por vacio el dia que la lista este bien escrita.
  assert.deepEqual(fantasmas(["carpeta-que-no-existe"]), ["carpeta-que-no-existe"], "el predicado tiene que cazar una entrada que no nombra ninguna action");
  assert.deepEqual(
    sinMotivo([
      ["vacio", { motivo: "" }],
      ["corto", { motivo: "porque si" }],
      ["no-es-texto", { motivo: 1 }],
      ["sin-la-clave", {}],
      ["escrito", { motivo: "x".repeat(80) }],
    ]),
    ["vacio", "corto", "no-es-texto", "sin-la-clave"],
    "el predicado tiene que cazar las cuatro formas de no traer motivo, y dejar pasar la quinta",
  );
  assert.deepEqual(
    sinVigencia([
      ["sin", {}],
      ["con-v", { vigenteEn: "v1.9.6" }],
      ["corta", { vigenteEn: "1.9" }],
      ["bien", { vigenteEn: "1.9.6" }],
    ]),
    ["sin", "con-v", "corta"],
    "el predicado tiene que cazar la vigencia ausente o mal escrita, y dejar pasar la bien escrita",
  );

  const entradas = [...EXCEPCIONES.entries()];
  assert.deepEqual(fantasmas([...EXCEPCIONES.keys()]), [], "estas EXCEPCIONES no nombran ninguna carpeta de actions/ con action.yml");
  assert.deepEqual(
    sinMotivo(entradas),
    [],
    "estas EXCEPCIONES no traen un motivo de al menos 80 caracteres: una excepcion sin motivo es la que el caso siguiente copia sin que nadie lo decida",
  );
  assert.deepEqual(sinVigencia(entradas), [], "estas EXCEPCIONES no declaran `vigenteEn` como X.Y.Z: sin eso no vencen nunca");
});

test("una EXCEPCION VENCIDA pone rojo: cortar una version obliga a decidir de nuevo", () => {
  // Cada entrada declara la version en cuyo arbol se decidio. El dia que el CHANGELOG corta otra,
  // esto se pone rojo, y el PR de release tiene DOS salidas y ninguna es el olvido: cablear la
  // pieza y borrar la entrada, o mover `vigenteEn` a mano, que es una decision que alguien firma.
  const version = versionPublicada();

  // EL CONTROL POSITIVO, primero: hoy todas las entradas coinciden, asi que su verde no se
  // distingue de «el predicado no compara nada».
  assert.equal(vencida("0.0.1", version), true, "el predicado tiene que cazar una vigencia que no es la del arbol");
  assert.equal(vencida(version, version), false, "y dejar pasar la que si lo es");

  const vencidas = [...EXCEPCIONES.entries()]
    .filter(([, e]) => vencida(e?.vigenteEn, version))
    .map(([a, e]) => `${a} (vigente en ${e?.vigenteEn ?? "-"}, el CHANGELOG publica ${version})`);
  assert.deepEqual(
    vencidas,
    [],
    `estas EXCEPCIONES quedaron VENCIDAS: ${vencidas.join("; ")}. Dos salidas, y ninguna es dejarlas: cablear la ` +
      "action con su 'uses:' y BORRAR su entrada, o mover 'vigenteEn' a la version publicada despues de releer el motivo " +
      "y decidir que sigue valiendo",
  );
});
