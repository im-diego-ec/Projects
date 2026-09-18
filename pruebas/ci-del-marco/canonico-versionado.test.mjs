// BANCO DEL PASO QUE NO DEJA REESCRIBIR UNA VERSION PUBLICADA DEL CANONICO.
//
// EL HUECO QUE CIERRA. Projects ya ata el texto del canonico a su numero de version con
// una HUELLA: `actions/constitucion/pruebas/huella-del-canonico.test.mjs` exige que la
// ultima entrada de `versiones[]` del manifiesto lleve el sha256 de los .md que publica.
// Eso caza «cambio el texto y nadie movio la version», incluso un renombrado. Lo que no
// caza es el atajo que su propio mensaje pide no tomar: PEGAR la huella nueva sobre la
// entrada de una version que ya salio. El banco de la huella queda verde, y dos textos
// distintos se llaman igual, que es el defecto original: un consumidor al dia con esa
// version recibe el texto nuevo bajo el numero viejo y su job `constitucion` falla con
// «difiere del texto que el marco publica para la version X.Y.Z», en un repositorio que
// no hizo nada.
//
// DE DONDE VIENE. Rigel 1.14.0 (commit 08f3b2e, job `canonico-versionado`) resolvio la
// misma clase sin huella: si cambia el cuerpo, `versiones[]` tiene que crecer. Aca se
// conserva la huella —ve renombrados y no depende de la base del PR— y se le agrega la
// mitad que le faltaba, adaptada: una version que el CHANGELOG de la base ya publico no
// se reescribe ni desaparece. La unica forma de mover el canonico despues de publicar es
// agregar una entrada, o sea que `versiones[]` crece.
//
// POR QUE «PUBLICADA» Y NO «LA ULTIMA». La entrada de la version que todavia no salio se
// escribe antes del release con un numero previsto, y el release la corrige en su mismo
// PR (lo dice la `nota` del manifiesto). Con la regla literal de Rigel, dos PRs que tocan
// el canonico en el mismo ciclo exigirian dos versiones, y el release tendria que
// fundirlas. Una version pendiente todavia no la recibio nadie: reescribirla no le cambia
// el texto a ningun consumidor.
//
// El banco no COPIA el script —una copia se desincroniza y miente—: lo extrae del YAML con
// el mismo extractor que usan sus hermanos, y lo corre sobre repositorios de juguete con
// dos commits.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { RAIZ, scriptDelPaso } from "../marco-ci/extraer.mjs";
import { repoDeJuguete, escribir, commit, git, correrBash, limpiarTodo } from "../marco-ci/util.mjs";

const CI = path.join(RAIZ, ".github", "workflows", "ci.yml");
const PASO = "Una version publicada del canonico no se reescribe";
const MANIFIESTO = "actions/constitucion/canonico/manifiesto.json";
const PIEZA = "actions/constitucion/canonico/40-fronteras.md";

const script = scriptDelPaso(PASO, CI);

test.after(limpiarTodo);

const H0 = "a".repeat(64);
const H1 = "b".repeat(64);
const H2 = "c".repeat(64);

/** Un manifiesto con las versiones que se le pasen: [version, huella|null]. */
const manifiesto = (versiones) =>
  JSON.stringify(
    {
      presupuesto_lineas: 700,
      versiones: versiones.map(([version, huella]) => ({
        version,
        publicada: "2026-08-21",
        exigible_desde: "2026-08-21",
        ...(huella ? { huella_canonico: huella } : {}),
      })),
    },
    null,
    2,
  ) + "\n";

/** Un CHANGELOG con la seccion en vuelo y las versiones que se le pasen como publicadas. */
const changelog = (publicadas) =>
  ["# Changelog", "", "## [No publicado]", "", ...publicadas.flatMap((v) => [`## [${v}] — 2026-09-03`, ""])].join("\n");

const PUBLICADAS = ["1.9.6", "1.7.0", "1.6.0"];
const BASE_SANA = {
  [MANIFIESTO]: manifiesto([
    ["1.6.0", null],
    ["1.7.0", H0],
  ]),
  [PIEZA]: "# fronteras\n\nuna regla\n",
  "CHANGELOG.md": changelog(PUBLICADAS),
  "README.md": "x\n",
};

/** Un repositorio con dos commits: la base y la cabeza, que pisa lo que redefina. */
function repoConDiff(base, cabeza) {
  const dir = repoDeJuguete("canonico-versionado-");
  for (const [rel, contenido] of Object.entries(base)) escribir(dir, rel, contenido);
  const sha0 = commit(dir, "base");
  for (const [rel, contenido] of Object.entries(cabeza)) {
    if (contenido === null) fs.rmSync(path.join(dir, rel));
    else escribir(dir, rel, contenido);
  }
  const sha1 = commit(dir, "cabeza");
  return { dir, base: sha0, cabeza: sha1 };
}

/**
 * Una rama ATRASADA: sale de la base comun, y mientras tanto main avanza. `base` es la
 * punta de main (lo que GitHub manda como base del PR) y `cabeza` la punta de la rama.
 */
function repoConRamas(comun, enMain, enRama) {
  const dir = repoDeJuguete("canonico-ramas-");
  for (const [rel, contenido] of Object.entries(comun)) escribir(dir, rel, contenido);
  commit(dir, "comun");
  git(dir, "branch", "rama");
  for (const [rel, contenido] of Object.entries(enMain)) escribir(dir, rel, contenido);
  const base = commit(dir, "main avanza");
  git(dir, "checkout", "--quiet", "rama");
  for (const [rel, contenido] of Object.entries(enRama)) escribir(dir, rel, contenido);
  const cabeza = commit(dir, "la rama");
  return { dir, base, cabeza };
}

function correr({ dir, base, cabeza }) {
  return correrBash(script, { cwd: dir, env: { BASE: base, CABEZA: cabeza } });
}

const con = (base, cabeza) => correr(repoConDiff(base, cabeza));

test("el extractor encontro el paso, y el script no salio vacio", () => {
  assert.ok(script.length > 400, `el script salio de ${script.length} caracteres: el extractor fallo`);
  assert.match(script, /manifiesto\.json/, "el script tiene que mirar el manifiesto");
  assert.match(script, /CHANGELOG\.md/, "y el CHANGELOG de la base, que es el que dice que se publico");
});

test("ROJO: la huella nueva PEGADA sobre la entrada de una version publicada", () => {
  // EL CASO QUE MOTIVA EL PASO. El banco de la huella da verde —la ultima entrada lleva la
  // huella del texto de hoy— y la 1.7.0 pasa a nombrar dos textos distintos.
  const r = con(BASE_SANA, {
    [PIEZA]: "# fronteras\n\nuna regla\n\notra regla NUEVA\n",
    [MANIFIESTO]: manifiesto([
      ["1.6.0", null],
      ["1.7.0", H1],
    ]),
  });
  assert.equal(r.exit, 1, r.salida);
  assert.match(r.salida, /::error/);
  assert.match(r.salida, /1\.7\.0/, "el rojo tiene que nombrar la version reescrita");
  assert.match(r.salida, /difiere del texto que el marco publica/, "y tiene que decir QUIEN paga el error");
  assert.match(r.salida, /versiones\[\]/, "y donde va el arreglo");
});

test("VERDE: el canonico cambia y el manifiesto gana una entrada al final", () => {
  const r = con(BASE_SANA, {
    [PIEZA]: "# fronteras\n\notra\n",
    [MANIFIESTO]: manifiesto([
      ["1.6.0", null],
      ["1.7.0", H0],
      ["1.10.0", H1],
    ]),
  });
  assert.equal(r.exit, 0, r.salida);
  assert.match(r.salida, /2 -> 3/, "el verde tiene que decir cuanto se movio, no solo que esta OK");
});

test("VERDE e inerte: el PR no toca el manifiesto", () => {
  // Si toca el cuerpo sin tocar el manifiesto, el que lo cobra es el banco de la huella, y
  // el mensaje lo dice: dos checks no dicen dos veces lo mismo.
  const r = con(BASE_SANA, { "README.md": "otra cosa\n" });
  assert.equal(r.exit, 0, r.salida);
  assert.match(r.salida, /no toca/);
  assert.match(r.salida, /huella-del-canonico/);
});

test("VERDE: la entrada PENDIENTE (numero mayor que el ultimo publicado) se actualiza en el lugar", () => {
  // La adaptacion respecto de Rigel. La 1.10.0 todavia no salio: la recibio nadie, y dos
  // PRs del mismo ciclo que tocan el canonico no tienen por que inventar dos versiones.
  const base = {
    ...BASE_SANA,
    [MANIFIESTO]: manifiesto([
      ["1.7.0", H0],
      ["1.10.0", H1],
    ]),
  };
  const r = con(base, {
    [PIEZA]: "# fronteras\n\nun segundo cambio del mismo ciclo\n",
    [MANIFIESTO]: manifiesto([
      ["1.7.0", H0],
      ["1.10.0", H2],
    ]),
  });
  assert.equal(r.exit, 0, r.salida);
  assert.match(r.salida, /1\.10\.0/);
  assert.match(r.salida, /pendiente/);
});

test("VERDE: el PR del release corrige el numero de la entrada pendiente", () => {
  // Lo que la nota del manifiesto manda hacer: si el release sale con otro numero, la
  // entrada se corrige en el MISMO PR. Con la regla literal de Rigel este PR tambien pasa;
  // se fija para que ninguna version futura de esta regla lo rompa.
  const base = {
    ...BASE_SANA,
    [MANIFIESTO]: manifiesto([
      ["1.7.0", H0],
      ["1.10.0", H1],
    ]),
  };
  const r = con(base, {
    [MANIFIESTO]: manifiesto([
      ["1.7.0", H0],
      ["1.11.0", H1],
    ]),
    "CHANGELOG.md": changelog(["1.11.0", ...PUBLICADAS]),
  });
  assert.equal(r.exit, 0, r.salida);
});

test("ROJO: una version publicada DESAPARECE del manifiesto mientras se agrega otra", () => {
  // Con `versiones[]` contando entradas, borrar una y agregar otra deja el mismo largo; con
  // `!=` en vez de `>` hasta pasaria. Aca se mira cada version publicada por su nombre.
  const r = con(BASE_SANA, {
    [MANIFIESTO]: manifiesto([
      ["1.6.0", null],
      ["1.10.0", H1],
    ]),
  });
  assert.equal(r.exit, 1, r.salida);
  assert.match(r.salida, /1\.7\.0/);
  assert.match(r.salida, /saca del manifiesto/);
});

test("ROJO: una version publicada SIN huella no gana una despues", () => {
  // La 1.6.0 salio sin `huella_canonico`. Agregarsela hoy la ataria al texto de HOY, que no
  // es el que publico: una afirmacion falsa sobre el pasado.
  const r = con(BASE_SANA, {
    [MANIFIESTO]: manifiesto([
      ["1.6.0", H1],
      ["1.7.0", H0],
    ]),
  });
  assert.equal(r.exit, 1, r.salida);
  assert.match(r.salida, /1\.6\.0/);
});

test("ROJO: una entrada que el CHANGELOG no nombra pero que queda por debajo del ultimo publicado", () => {
  // «Publicada» es «no mayor que la version mas alta del CHANGELOG de la base», y no «el
  // CHANGELOG la nombra». Si el release olvida corregir el numero previsto de la entrada
  // (quedo 1.9.9 y salio 1.10.0), con la regla «la nombra» esa entrada quedaria
  // reescribible para siempre.
  const base = {
    ...BASE_SANA,
    [MANIFIESTO]: manifiesto([
      ["1.7.0", H0],
      ["1.9.9", H1],
    ]),
    "CHANGELOG.md": changelog(["1.10.0", ...PUBLICADAS]),
  };
  const r = con(base, {
    [MANIFIESTO]: manifiesto([
      ["1.7.0", H0],
      ["1.9.9", H2],
    ]),
  });
  assert.equal(r.exit, 1, r.salida);
  assert.match(r.salida, /1\.9\.9/);
});

test("sin CHANGELOG legible en la base, todas las versiones cuentan como publicadas, y lo avisa", () => {
  // El camino conservador cuando no se puede saber que salio: todo congelado. Y ruidoso,
  // porque es un fail-open en la direccion segura pero sigue siendo una deteccion caida.
  const base = { ...BASE_SANA, "CHANGELOG.md": "# sin versiones\n" };
  const cabeza = {
    [MANIFIESTO]: manifiesto([
      ["1.6.0", null],
      ["1.7.0", H1],
    ]),
  };
  const r = con(base, cabeza);
  assert.equal(r.exit, 1, r.salida);
  assert.match(r.salida, /::warning/);
});

test("una rama ATRASADA no es roja por la version que main publico despues", () => {
  // GitHub manda como base la punta de main. Si la rama salio antes de un release, esa
  // punta trae una version que la rama no tiene, y comparar contra ella culparia al PR
  // de «sacarla». Lo que cambia el PR se mide desde el ancestro comun.
  const r = correr(
    repoConRamas(
      BASE_SANA,
      {
        [PIEZA]: "# fronteras\n\nlo que publico el release\n",
        [MANIFIESTO]: manifiesto([
          ["1.6.0", null],
          ["1.7.0", H0],
          ["1.10.0", H1],
        ]),
        "CHANGELOG.md": changelog(["1.10.0", ...PUBLICADAS]),
      },
      { "README.md": "un PR que no toca el canonico\n" },
    ),
  );
  assert.equal(r.exit, 0, r.salida);
  assert.match(r.salida, /no toca/);
});

test("ROJO: una rama atrasada que reescribe la entrada que main publico mientras tanto", () => {
  // La otra cara del caso de arriba, y por eso el CHANGELOG se lee de la PUNTA de main y
  // no del ancestro comun: cuando la rama salio, la 1.10.0 era pendiente y reescribirla
  // era legitimo; ahora ya salio, y al mergear le cambiaria el texto a quien la pino.
  const comun = {
    ...BASE_SANA,
    [MANIFIESTO]: manifiesto([
      ["1.7.0", H0],
      ["1.10.0", H1],
    ]),
  };
  const r = correr(
    repoConRamas(
      comun,
      { "CHANGELOG.md": changelog(["1.10.0", ...PUBLICADAS]) },
      {
        [PIEZA]: "# fronteras\n\nun cambio que llego tarde\n",
        [MANIFIESTO]: manifiesto([
          ["1.7.0", H0],
          ["1.10.0", H2],
        ]),
      },
    ),
  );
  assert.equal(r.exit, 1, r.salida);
  assert.match(r.salida, /1\.10\.0/);
  assert.match(r.salida, /actualizala con main/, "el mensaje tiene que decir que el arreglo es actualizar la rama");
});

test("ROJO: un manifiesto que no parsea es rojo, no un salteo", () => {
  // Lo no verificable es rojo y nunca exito mudo. Si un JSON roto se ignorara, romperlo
  // seria la forma de reescribir una version sin que nada la mire.
  const r = con(BASE_SANA, { [MANIFIESTO]: "{ esto no es json\n" });
  assert.equal(r.exit, 1, r.salida);
  assert.match(r.salida, /no pude leer/);
});

test("ROJO: un manifiesto borrado es rojo", () => {
  const r = con(BASE_SANA, { [MANIFIESTO]: null });
  assert.equal(r.exit, 1, r.salida);
  assert.match(r.salida, /no pude leer/);
});

test("ROJO: si la base no resuelve, no se declara verde por no haber podido medir", () => {
  const repo = repoConDiff(BASE_SANA, { "README.md": "y\n" });
  const r = correr({ ...repo, base: "0".repeat(40) });
  assert.equal(r.exit, 1, r.salida);
  assert.match(r.salida, /no pude resolver el commit base/);
  assert.match(r.salida, /fetch-depth: 0/, "el mensaje trae el arreglo");
});

test("SOBRE LOS DATOS REALES: la huella pegada sobre la ultima version publicada de hoy es roja", () => {
  // El defecto, reproducido sobre el manifiesto y el CHANGELOG REALES y no sobre un
  // fixture: fija que el lector entiende los dos archivos como son hoy, con todas sus
  // claves. Un cambio de forma de cualquiera de los dos se ve aca, y no el dia que un PR
  // toque el canonico y el paso salga verde por no haber entendido lo que leyo.
  const real = {
    [MANIFIESTO]: fs.readFileSync(path.join(RAIZ, MANIFIESTO), "utf8"),
    "CHANGELOG.md": fs.readFileSync(path.join(RAIZ, "CHANGELOG.md"), "utf8"),
  };
  const conCambio = JSON.parse(real[MANIFIESTO]);
  // La mutacion del defecto sobre los datos reales: la huella de la ultima version YA
  // PUBLICADA, reescrita en el lugar. Se elige por el CHANGELOG real y no por posicion,
  // para que el caso siga valiendo el dia que el manifiesto traiga una entrada pendiente.
  const semver = (v) => v.split(".").map(Number);
  const cmp = (a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2];
  const tope = [...real["CHANGELOG.md"].matchAll(/^## \[(\d+\.\d+\.\d+)\]/gm)].map((m) => semver(m[1])).sort(cmp).at(-1);
  assert.ok(tope, "el CHANGELOG real no nombra ninguna version publicada: el lector de este caso se rompio");
  const ultima = conCambio.versiones.filter((v) => cmp(semver(v.version), tope) <= 0).at(-1);
  assert.ok(ultima, "ninguna entrada del manifiesto real esta publicada segun el CHANGELOG real");
  ultima.huella_canonico = "f".repeat(64);
  const r = con(real, { [MANIFIESTO]: JSON.stringify(conCambio, null, 2) + "\n" });
  assert.equal(r.exit, 1, `pegar una huella sobre la ${ultima.version} real tenia que ser rojo:\n${r.salida}`);
  assert.match(r.salida, new RegExp(ultima.version.replace(/\./g, "\\.")));
});

test("el paso vive en un job que el veredicto agregado espera, con la asimetria del push", () => {
  // Un check que corre y que `ci-ok` no mira no bloquea nada. Y la asimetria importa: el
  // job se saltea a proposito en un push a main, asi que `ci_ok` tiene que aceptar
  // `skipped` SOLO en ese carril.
  const ci = fs.readFileSync(CI, "utf8");
  assert.match(ci, /needs: \[[^\]]*\bcanonico\b/, "ci_ok tiene que esperar al job canonico");
  assert.match(ci, /\n  canonico:\n    name: canonico-versionado\n/, "el job se llama canonico-versionado");
  const bloque = ci.slice(ci.indexOf('"${{ needs.canonico.result }}" = "success"'));
  assert.ok(bloque.length > 0 && ci.includes("needs.canonico.result"), "ci_ok tiene que leer su resultado");
  assert.match(bloque.slice(0, 700), /success \| skipped/, "el salteo del push a main tiene que estar contemplado");
});
