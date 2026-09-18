// Banco del paso "Estado experimental con fecha de veredicto" de marco-ci.yml.
//
// POR QUE EXISTE. Un change activo y sin archivar ES el estado experimental nativo del
// marco, y tiene un modo de falla obvio: el ZOMBI. Un change que nadie archiva ni descarta
// se queda ahi, envejece, y al anio siguiente nadie sabe si es una promesa o basura. Este
// paso le pone fecha a esa promesa.
//
// EL SUJETO REAL que lo trajo es `capa-descubrimiento`: declaraba `experimental: true` con
// `veredicto_antes_de: 2026-09-21` y ningun workflow leia la fecha, asi que iba a vencer en
// silencio (docs/16-auditoria-cierre-v1.md lo anoto el dia que se escribio). El paso viene
// de Rigel 1.14.0 (commit 08f3b2e) y se adapto a este repo en el change
// `el-experimental-caduca`.
//
// LO QUE SE ADAPTO Y POR QUE, cada cosa con su caso abajo:
//   - Los frontmatter de este repo llevan COMENTARIOS de YAML (`experimental: true  # ver
//     ...`). El lector de Rigel tomaba el valor crudo, asi que `true  # ver ...` no era
//     `true` y el change pasaba por no-experimental: un verde mudo. Aca el comentario se
//     descarta.
//   - Un `experimental:` que no es booleano (`si`, `yes`) es rojo, no un salteo.
//   - Una fecha con forma AAAA-MM-DD pero que no existe en el calendario (2026-13-01) es
//     roja: la comparacion de cadenas la aceptaria y venceria en una fecha que no existe.
//
// EL SCRIPT SE EXTRAE DEL YAML, no se copia: un banco que repite el script prueba su propia
// copia y se queda verde el dia que el paso cambie.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

import { RAIZ, scriptDelPaso } from "./extraer.mjs";
import { repoDeJuguete, escribir, correrBash, limpiarTodo } from "./util.mjs";

const PASO = "Estado experimental con fecha de veredicto";

/** Un .md con el frontmatter que se le pase. El cuerpo no se mira: el estado se declara. */
function artefacto(campos) {
  const lineas = Object.entries(campos).map(([k, v]) => `${k}: ${v}`);
  return ["---", ...lineas, "---", "", "# un artefacto cualquiera", ""].join("\n");
}

function repo(nombre, archivos) {
  const raiz = repoDeJuguete(`caducidad-${nombre}-`);
  for (const [ruta, contenido] of Object.entries(archivos)) escribir(raiz, ruta, contenido);
  return raiz;
}

// HOY se inyecta para que el banco sea DETERMINISTA. Un banco de caducidad que dependa del
// calendario real se pone rojo solo, un martes cualquiera, por un motivo que no es el suyo.
// El paso lee `HOY_ISO` solo si esta, y el workflow no la setea: en una corrida real es el
// dia de hoy, en UTC, que es el reloj del runner.
const HOY = "2026-09-17";
const correr = (raiz, env = {}) => correrBash(scriptDelPaso(PASO), { cwd: raiz, env: { HOY_ISO: HOY, ...env } });

/** El dia siguiente a una fecha AAAA-MM-DD, en UTC. */
function diaSiguiente(fecha) {
  const d = new Date(`${fecha}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

test.after(limpiarTodo);

test("un change que NO se declara experimental no ve nada: el paso es inerte", () => {
  // La propiedad que hace a este paso MINOR y no breaking. Si esto se rompiera, todos los
  // repos que hoy pasan fallarian maniana por una linea que no pidieron.
  const raiz = repo("normal", {
    "openspec/changes/un-change/proposal.md": artefacto({ artefacto: "proposal", dri: "alguien" }),
    "openspec/changes/un-change/tasks.md": artefacto({ artefacto: "tasks" }),
  });
  const r = correr(raiz);
  assert.equal(r.exit, 0, r.salida);
  assert.match(r.salida, /inerte/);
});

test("experimental: false sin fecha tambien es inerte: declararse NO experimental no pide fecha", () => {
  const raiz = repo("falso", {
    "openspec/changes/un-change/design.md": artefacto({ artefacto: "design", experimental: "false" }),
  });
  const r = correr(raiz);
  assert.equal(r.exit, 0, r.salida);
  assert.match(r.salida, /inerte/);
});

test("ROJO: se declara experimental y NINGUN artefacto pone fecha", () => {
  // La puerta de escape que este caso cierra: si declararse experimental sin fecha pasara,
  // el arreglo obvio para no vencer nunca seria omitir la fecha.
  const raiz = repo("sin-fecha", {
    "openspec/changes/experimento/design.md": artefacto({ artefacto: "design", experimental: "true" }),
  });
  const r = correr(raiz);
  assert.equal(r.exit, 1, r.salida);
  assert.match(r.salida, /veredicto_antes_de/);
  assert.match(r.salida, /zombi/i, "el mensaje tiene que decir por que importa, no solo que falta un campo");
  assert.match(r.salida, /Arreglo/, "y tiene que traer el arreglo escrito");
});

test("ROJO: la fecha paso y no hay veredicto escrito", () => {
  const raiz = repo("vencido", {
    "openspec/changes/experimento/design.md": artefacto({
      artefacto: "design",
      experimental: "true",
      veredicto_antes_de: "2026-08-01",
    }),
  });
  const r = correr(raiz);
  assert.equal(r.exit, 1, r.salida);
  assert.match(r.salida, /experimento/, "tiene que nombrar el change");
  assert.match(r.salida, /2026-08-01/, "y su fecha");
  // Las tres salidas legitimas van en el mensaje: descartar el change tambien es un final.
  assert.match(r.salida, /descartar/);
  assert.match(r.salida, /correr la fecha/);
});

test("el dia declarado todavia vale; el siguiente ya es rojo", () => {
  // La frontera, fijada: `veredicto_antes_de: D` vence al TERMINAR el dia D. Sin este caso
  // un `<` cambiado por `<=` (o al reves) movia el vencimiento un dia sin que nadie lo viera.
  const archivos = {
    "openspec/changes/experimento/design.md": artefacto({
      artefacto: "design",
      experimental: "true",
      veredicto_antes_de: "2026-10-15",
    }),
  };
  const elDia = correr(repo("frontera-dia", archivos), { HOY_ISO: "2026-10-15" });
  assert.equal(elDia.exit, 0, elDia.salida);
  const despues = correr(repo("frontera-despues", archivos), { HOY_ISO: "2026-10-16" });
  assert.equal(despues.exit, 1, despues.salida);
});

test("VERDE: la fecha paso PERO el veredicto esta escrito", () => {
  // El caso que separa «vencio» de «vencio sin conclusion», y es el que vuelve util al
  // paso: si vencer fuera rojo aunque el veredicto exista, el arreglo seria correr la
  // fecha para siempre, y el check pasaria a medir prolijidad en vez de conclusiones.
  const raiz = repo("vencido-con-veredicto", {
    "openspec/changes/experimento/design.md": artefacto({
      artefacto: "design",
      experimental: "true",
      veredicto_antes_de: "2026-08-01",
    }),
    "openspec/changes/experimento/piloto/veredicto.md": artefacto({
      artefacto: "veredicto",
      estado: "cerrado",
    }),
  });
  const r = correr(raiz);
  assert.equal(r.exit, 0, r.salida);
  assert.match(r.salida, /experimento \(veredicto escrito\)/, "el verde tiene que decir que el motivo es el veredicto, no la fecha");
});

test("VERDE: experimental con la fecha todavia vigente, y lo dice con su fecha", () => {
  const raiz = repo("vigente", {
    "openspec/changes/experimento/design.md": artefacto({
      artefacto: "design",
      experimental: "true",
      veredicto_antes_de: "2026-12-31",
    }),
  });
  const r = correr(raiz);
  assert.equal(r.exit, 0, r.salida);
  assert.match(r.salida, /1 change/);
  assert.match(r.salida, /experimento.*2026-12-31/, "el verde tiene que nombrar al sujeto y su fecha, no solo contar");
});

test("ROJO: una fecha que no se puede comparar es rojo, no un salteo", () => {
  // Lo no verificable es rojo y nunca exito mudo. Si una fecha ilegible se ignorara,
  // escribir `veredicto_antes_de: pronto` seria la forma de no vencer nunca.
  const raiz = repo("fecha-mala", {
    "openspec/changes/experimento/design.md": artefacto({
      artefacto: "design",
      experimental: "true",
      veredicto_antes_de: "pronto",
    }),
  });
  const r = correr(raiz);
  assert.equal(r.exit, 1, r.salida);
  assert.match(r.salida, /no es una fecha/);
});

test("ROJO: una fecha con la forma correcta que no existe en el calendario", () => {
  // Adaptacion de Projects. «2026-13-01» pasa la expresion AAAA-MM-DD y compara bien como
  // cadena contra cualquier dia de 2026, asi que un lector que solo mira la forma lo
  // aceptaria y lo haria vencer en una fecha que no existe.
  const raiz = repo("fecha-imposible", {
    "openspec/changes/experimento/design.md": artefacto({
      artefacto: "design",
      experimental: "true",
      veredicto_antes_de: "2026-13-01",
    }),
  });
  const r = correr(raiz);
  assert.equal(r.exit, 1, r.salida);
  assert.match(r.salida, /no es una fecha/);
});

test("con dos fechas distintas manda la MAS TEMPRANA", () => {
  // Si mandara la mas lejana, agregar un archivo nuevo con otra fecha correria el
  // vencimiento sin que nadie lo hubiera decidido: la caducidad se posterga sola.
  const raiz = repo("dos-fechas", {
    "openspec/changes/experimento/design.md": artefacto({
      artefacto: "design",
      experimental: "true",
      veredicto_antes_de: "2026-08-01",
    }),
    "openspec/changes/experimento/piloto/nota.md": artefacto({
      artefacto: "nota",
      veredicto_antes_de: "2026-12-31",
    }),
  });
  const r = correr(raiz);
  assert.equal(r.exit, 1, r.salida);
  assert.match(r.salida, /2026-08-01/, "la fecha vencida tiene que ganarle a la vigente");
});

test("los COMENTARIOS de YAML del frontmatter no apagan la declaracion", () => {
  // Adaptacion de Projects, y el caso que el lector de Rigel dejaba pasar en verde: en este
  // repo los frontmatter llevan comentarios al final del valor y lineas de comentario
  // sueltas (el proposal de capa-descubrimiento, por ejemplo). Tomando el valor crudo,
  // `true  # ver ...` no es `true`, el change no se declara experimental y el paso sale 0
  // sin haberlo mirado.
  const texto = [
    "---",
    "artefacto: proposal",
    "aprueba: PO (PO)          # un comentario: con dos puntos adentro",
    "                             # y una linea de comentario suelta: tambien con dos puntos",
    "experimental: true           # ver el final",
    "veredicto_antes_de: '2026-08-01'   # entre comillas y con comentario",
    "---",
    "",
    "# un proposal",
    "",
  ].join("\n");
  const raiz = repo("comentarios", { "openspec/changes/experimento/proposal.md": texto });
  const r = correr(raiz);
  assert.equal(r.exit, 1, r.salida);
  assert.match(r.salida, /2026-08-01/, "la fecha entre comillas y con comentario se tiene que leer");
});

test("ROJO: un `experimental:` que no es booleano no se toma por falso en silencio", () => {
  // Adaptacion de Projects. `experimental: si` es alguien declarando el estado con otra
  // palabra; tomarlo por falso dejaria al change sin fecha y sin rojo.
  const raiz = repo("no-booleano", {
    "openspec/changes/experimento/design.md": artefacto({ artefacto: "design", experimental: "si" }),
  });
  const r = correr(raiz);
  assert.equal(r.exit, 1, r.salida);
  assert.match(r.salida, /no es un booleano/);
});

test("el archive NO se mira: la historia inmutable no caduca", () => {
  // Un change archivado que se declaro experimental no se puede arreglar: es historia.
  // Si el paso lo mirara, todo repo con un experimento cerrado quedaria rojo para siempre.
  const raiz = repo("archive", {
    "openspec/changes/archive/2026-01-01-viejo/design.md": artefacto({
      artefacto: "design",
      experimental: "true",
      veredicto_antes_de: "2026-01-15",
    }),
  });
  const r = correr(raiz);
  assert.equal(r.exit, 0, r.salida);
  assert.match(r.salida, /inerte/);
});

test("un repo sin openspec/changes no se rompe: sale 0 y lo dice", () => {
  // Otro paso de este mismo job ya cobra la ausencia de `openspec/`. Duplicarlo aca serian
  // dos rojos por un solo defecto, y el segundo no agrega informacion.
  const raiz = repo("sin-changes", { "README.md": "# nada" });
  const r = correr(raiz);
  assert.equal(r.exit, 0, r.salida);
  assert.match(r.salida, /nada que caducar/);
});

test("ROJO: un HOY_ISO mal formado no se toma por hoy", () => {
  const raiz = repo("hoy-malo", {
    "openspec/changes/un-change/proposal.md": artefacto({ artefacto: "proposal" }),
  });
  const r = correr(raiz, { HOY_ISO: "17/09/2026" });
  assert.equal(r.exit, 1, r.salida);
  assert.match(r.salida, /HOY_ISO/);
});

// ── DOGFOODING ─────────────────────────────────────────────────────────────
//
// Lo que distingue a este check del de `reglas-al-dia`, que no puede correr en el repo que
// lo publica: este corre sobre `openspec/changes/` de cualquier repo, incluido este, y el
// CI de Projects lo ejecuta por ruta local en cada PR.
//
// LOS SUJETOS SE DERIVAN DEL ARBOL y no se escriben aca: el dia que `capa-descubrimiento`
// se archive o se descarte, estos casos siguen valiendo sobre lo que quede, en vez de
// romperse por un nombre que ya no existe.

/** Los .md de los changes activos que se declaran experimentales en este repo. */
function experimentalesReales() {
  const raiz = join(RAIZ, "openspec", "changes");
  const salida = new Map();
  const recorrer = (dir, change) => {
    for (const nombre of readdirSync(dir)) {
      const ruta = join(dir, nombre);
      if (statSync(ruta).isDirectory()) recorrer(ruta, change);
      else if (nombre.endsWith(".md")) {
        if (!salida.has(change)) salida.set(change, []);
        salida.get(change).push(ruta);
      }
    }
  };
  for (const change of readdirSync(raiz)) {
    if (change === "archive" || !statSync(join(raiz, change)).isDirectory()) continue;
    recorrer(join(raiz, change), change);
  }
  const experimentales = new Map();
  for (const [change, rutas] of salida) {
    const declara = rutas.some((r) => /^experimental:\s*true\b/m.test(readFileSync(r, "utf8").split(/^---$/m)[1] ?? ""));
    if (declara) experimentales.set(change, rutas);
  }
  return experimentales;
}

test("DOGFOODING: este repositorio pasa su propio paso", () => {
  const r = correrBash(scriptDelPaso(PASO), { cwd: RAIZ, env: { HOY_ISO: HOY } });
  assert.equal(r.exit, 0, r.salida);
});

test("DOGFOODING con control: los artefactos REALES, un dia despues de su fecha y sin veredicto, dan 1", () => {
  // El control que vuelve creible al dogfooding: un verde solo no distingue «el repo esta
  // sano» de «el paso no mira nada». Se copian los artefactos REALES —no un frontmatter
  // inventado— porque lo que se quiere probar es que el paso muerde los datos de este
  // repositorio, con sus comentarios de YAML incluidos. Los veredictos escritos se dejan
  // afuera a proposito: sin ellos, pasar la fecha tiene que ser rojo.
  const reales = experimentalesReales();
  if (reales.size === 0) {
    // Sin sujetos, lo unico verificable sobre el arbol real es que el paso sea inerte.
    const r = correrBash(scriptDelPaso(PASO), { cwd: RAIZ, env: { HOY_ISO: HOY } });
    assert.equal(r.exit, 0, r.salida);
    assert.match(r.salida, /inerte/);
    return;
  }
  const archivos = {};
  let masTemprana = null;
  for (const rutas of reales.values()) {
    for (const ruta of rutas) {
      const texto = readFileSync(ruta, "utf8");
      if (/^artefacto:\s*veredicto\b/m.test(texto)) continue;
      archivos[relative(RAIZ, ruta)] = texto;
      const fecha = texto.match(/^veredicto_antes_de:\s*["']?(\d{4}-\d{2}-\d{2})/m)?.[1];
      if (fecha && (masTemprana === null || fecha < masTemprana)) masTemprana = fecha;
    }
  }
  assert.ok(masTemprana, `los changes experimentales reales (${[...reales.keys()].join(", ")}) no declaran ninguna fecha legible: el paso ya estaria rojo en CI`);
  const r = correr(repo("dogfood-sin-veredicto", archivos), { HOY_ISO: diaSiguiente(masTemprana) });
  assert.equal(r.exit, 1, r.salida);
  assert.match(r.salida, new RegExp(masTemprana), "tiene que nombrar la fecha real que traen los artefactos");
});
