import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

// ─────────────────────────────────────────────────────────────────────────────
// EL ANDAMIO NO SE QUEDA ATRAS DE LA VERSION PUBLICADA.
//
// POR QUE EXISTE ESTE BANCO. Desde la 1.4.0 el marco se distribuye por VERSION
// EXACTA y el bump llega a cada consumidor como PR de Dependabot. Ese cambio se
// aplico al consumidor real (un-proyecto-anterior) y NO al andamio: el 2026-08-21,
// con la 1.4.1 ya publicada, `plantilla/` y la skill de adopcion seguian pinando
// `@v1`. Un proyecto nuevo —el piloto de Supply Chain era el siguiente— habria
// nacido con el modelo viejo.
//
// Y el modo de falla es el peor que hay: CALLADO. Dependabot no propone ningun
// bump para `@v1` porque, desde su punto de vista, `v1` ya es la mayor vigente;
// las 1.4.x dentro de `v1` no mueven el ref, asi que no hay nada que bumpear. El
// repo no falla y no avisa: simplemente nunca recibe una version nueva por PR y
// NUNCA APARECE EN EL CENSO DE CONSUMIDORES, que desde la 1.4.0 son precisamente
// esos PRs.
//
// La clase es «se arreglo en el consumidor y no en el andamio», y ya habia pasado
// ese mismo dia con el grupo de Dependabot (PR #35). Dos veces en un dia es una
// clase, no un descuido: por eso se cierra con una asercion en vez de con una
// linea mas en el checklist del release.
//
// ── ALCANCE, Y EL RESIDUO DECLARADO ────────────────────────────────────────
// Esto mira SOLO lineas con `uses:`. Es la parte decidible: un `uses:` es lo que
// GitHub resuelve, y ahi un ref o es exacto o no lo es.
//
// La prosa queda FUERA a proposito, y no por olvido. Un primer intento la
// incluia y se puso rojo con cuatro hallazgos que eran todos correctos: el
// `grep -nE ...@v[0-9]+\.[0-9]+...` de la verificacion de la skill, el `sed -E`
// de projects-validar-consumidor, un `@vX.Y.Z` de documentacion y un marcador
// `@<version exacta>`. Distinguir un ref inventado de un regex citado en prosa no
// es decidible con un escaneo de texto, y un check que se pone rojo cuando la
// documentacion esta BIEN escrita es peor que no tenerlo: ensena a ignorarlo.
//
// Consecuencia honesta: si alguien deja `@v1` en la PROSA del andamio, esto no lo
// caza. Lo caza el review. Lo que no puede volver a pasar en silencio es un
// `uses:` desfasado, que es el que produce el fail-open del censo.
// ─────────────────────────────────────────────────────────────────────────────

const RAIZ = path.resolve(import.meta.dirname, "..", "..");

// Las superficies donde un `uses:` del marco importa:
//  · .github/workflows — los pines VIVOS. marco-ci.yml es el workflow reusable que
//    consumen los proyectos, y adentro invoca a sus propias actions hermanas. Esta
//    superficie faltaba en la primera version de este banco, y era justo donde
//    estaban los dos `uses:` a @v1 que se descubrieron el 2026-08-21.
//  · actions — la documentacion de las actions y el snippet que la action EMITE
//    cuando falla. Lo que el consumidor copia y pega sale de aca.
//  · plantilla — lo que un proyecto nuevo copia.
//  · .claude/skills — el snippet que un agente pega al adoptar.
const SUPERFICIES = [".github/workflows", "actions", "plantilla", ".claude/skills"];

// Los bancos de prueba quedan fuera: sus fixtures usan `@v1` a proposito, porque lo
// que prueban es el PARSEO de un ref cualquiera.
const FUERA = /[\\/]pruebas[\\/]/;

// `projects/<algo>@<ref>`, cortando el ref en el primer caracter que no puede ser
// parte de un ref de git.
const PIN = /projects(\/[^\s"'`]*)?@([^\s"'`,)\]]+)/;

const VERSION_EXACTA = /^v\d+\.\d+\.\d+$/;
const MAYOR_MOVIL = /^v\d+$/;

// LA UNICA EXCEPCION, por lista y no por regla. `marco-ci.yml` es un workflow
// reusable y GitHub no le permite referenciar su propio ref (`uses:` no admite
// expresiones), asi que una linea que pine la version que se esta cortando pone en
// rojo al PR que la corta: medido el 2026-08-22 con "Unable to resolve action
// ...@v1.4.2". El motivo largo esta en el comentario de esa linea.
//
// Va por lista exacta a proposito: si manana aparece una segunda invocacion interna
// con @v1, esto se pone ROJO en vez de dejarla heredar la excepcion. Es la
// diferencia entre una excepcion declarada y un agujero.
const EXCEPCIONES = [
  { archivo: ".github/workflows/marco-ci.yml", ref: "v1", accion: "actions/guardrail-deltas" },
];
function esExcepcion(p) {
  // Se compara TAMBIEN la action. Un primer intento comparaba solo archivo y ref, y
  // el control lo refuto en el acto: una segunda invocacion interna con @v1 en el
  // MISMO archivo quedaba exenta sin declararse. Una excepcion que no nombra que
  // exime no es una excepcion, es un agujero con comentario.
  return EXCEPCIONES.some((e) => e.archivo === p.archivo && e.ref === p.ref && e.accion === p.accion);
}
// Marcadores legitimos DENTRO de un `uses:`: el `{{ORG}}` del andamio lo
// sustituye la adopcion, `<SHA-COMPLETO>` es el hueco que rellena el ensayo
// contra un consumidor real, y `vX.Y.Z` es como la documentacion escribe «una
// version» cuando cita un `uses:` sin comprometerse con un numero.
const MARCADOR = /^(<|\{\{|vX\.Y\.Z$)/;

function versionPublicada() {
  const ch = fs.readFileSync(path.join(RAIZ, "CHANGELOG.md"), "utf8");
  // La primera entrada con numero: `## [1.4.1] — 2026-08-21`. `[No publicado]`
  // no matchea a proposito.
  const m = ch.match(/^## \[(\d+\.\d+\.\d+)\]/m);
  assert.ok(m, "CHANGELOG.md no tiene ninguna entrada `## [X.Y.Z]`: sin eso no hay con que comparar");
  return `v${m[1]}`;
}

function archivosDe(dir) {
  const abs = path.join(RAIZ, dir);
  if (!fs.existsSync(abs)) return [];
  const salida = [];
  for (const e of fs.readdirSync(abs, { withFileTypes: true, recursive: true })) {
    if (!e.isFile()) continue;
    const p = path.join(e.parentPath ?? e.path, e.name);
    if (/\.(png|jpg|jpeg|gif|ico|woff2?|zip|gz)$/i.test(p)) continue;
    if (FUERA.test(p)) continue;
    salida.push(p);
  }
  return salida;
}

// Solo lineas con `uses:` — ver el alcance declarado arriba.
function pinesDeUses() {
  const pines = [];
  for (const dir of SUPERFICIES) {
    for (const abs of archivosDe(dir)) {
      const rel = path.relative(RAIZ, abs).split(path.sep).join("/");
      const lineas = fs.readFileSync(abs, "utf8").split("\n");
      for (let i = 0; i < lineas.length; i++) {
        if (!lineas[i].includes("uses:")) continue;
        // Las lineas de COMENTARIO quedan fuera: un comentario que explica por que no
        // se usa `@v1` tiene que poder escribir `@v1`. Es el mismo limite que la
        // prosa, declarado arriba.
        if (/^\s*(#|\/\/|\*|\/\*)/.test(lineas[i])) continue;
        const m = lineas[i].match(PIN);
        if (!m) continue;
        // m[1] es la ruta dentro del repo del marco ("/actions/guardrail-deltas" o
        // "/.github/workflows/marco-ci.yml"), sin la barra inicial. La necesita la
        // lista de excepciones para nombrar QUE exime.
        pines.push({ archivo: rel, linea: i + 1, ref: m[2], accion: (m[1] ?? "").slice(1) });
      }
    }
  }
  return pines;
}

// ── El control de que este banco no es un no-op ─────────────────────────────
// Un escaneo que no encuentra nada NO es verde. Si `plantilla/` se renombra, si
// el regex deja de matchear o si un checkout parcial no trajo el andamio, se cae
// ESTA asercion — y no las de abajo, que pasarian vacuamente sobre una lista
// vacia. Es la disciplina que el ci.yml ya aplica al descubrir los bancos, y la
// leccion del 2026-08-21: `node --test` con un glob que no matchea da exit 0,
// asi que un cero nunca vale solo.
test("el escaneo encuentra pines: un cero aca es el banco roto, no el arbol limpio", () => {
  const pines = pinesDeUses();
  assert.ok(
    pines.length >= 15,
    `solo encontre ${pines.length} pin(es) del marco en lineas \`uses:\` de ${SUPERFICIES.join(", ")}. ` +
      "El andamio referencia el marco en ci.yml (el reusable + tres actions) y en " +
      "actualizar-marco.yml, asi que menos de cinco significa que este banco dejo de mirar " +
      "donde deberia: revisá SUPERFICIES y el regex PIN antes de creerle al verde",
  );
});

test("ningun `uses:` del marco apunta al tag mayor movil (@v1), salvo la excepcion declarada", () => {
  const moviles = pinesDeUses().filter((p) => MAYOR_MOVIL.test(p.ref) && !esExcepcion(p));
  assert.deepEqual(
    moviles.map((p) => `${p.archivo}:${p.linea} → @${p.ref}`),
    [],
    "hay `uses:` al tag mayor movil. Dependabot no propone bump para `@v1` (para el ya es la " +
      "mayor vigente), asi que ese repo no recibe versiones nuevas por PR y no aparece en el " +
      "censo de consumidores del marco. Pinar la version exacta `vX.Y.Z`",
  );
});

test("todo `uses:` con version exacta apunta a la version publicada mas alta", () => {
  const esperada = versionPublicada();
  const desfasados = pinesDeUses().filter(
    (p) => VERSION_EXACTA.test(p.ref) && p.ref !== esperada,
  );
  assert.deepEqual(
    desfasados.map((p) => `${p.archivo}:${p.linea} → @${p.ref} (deberia ser @${esperada})`),
    [],
    `el andamio quedo atras de ${esperada}. Un proyecto creado hoy nace pinado a una version ` +
      "vieja, sin el arreglo que se acaba de publicar. Cortar una version incluye mover estos " +
      "pines, y por eso esto es una asercion y no una linea del checklist",
  );
});

test("todo ref de un `uses:` del marco es una version exacta o un marcador", () => {
  const raros = pinesDeUses().filter(
    (p) => !VERSION_EXACTA.test(p.ref) && !MARCADOR.test(p.ref) && !esExcepcion(p),
  );
  assert.deepEqual(
    raros.map((p) => `${p.archivo}:${p.linea} → @${p.ref}`),
    [],
    "un ref que no es `vX.Y.Z` ni un marcador (`{{...}}`, `<...>`) no lo resuelve GitHub: el " +
      "`uses:` muere con un error que parece un typo en la ruta del repo",
  );
});
