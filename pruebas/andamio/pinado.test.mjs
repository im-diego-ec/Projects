import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { versionPublicada as versionDelChangelog } from "../vigencia.mjs";

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
// La `i` no es cosmetica: el repo se llama `Projects` con mayuscula y este regex
// nacio en minuscula. MEDIDO instrumentando `pinesDeUses()` sobre estas mismas
// superficies: con la `i` el escaneo encuentra 25 pines, sin ella encuentra 1.
// El 15 que aparece mas abajo NO es una medicion: es el UMBRAL de la asercion
// «un cero aca es el banco roto», y con 1 pin esa asercion se cae — que es
// exactamente para lo que esta puesta.
const PIN = /projects(\/[^\s"'`]*)?@([^\s"'`,)\]]+)/i;

const VERSION_EXACTA = /^v\d+\.\d+\.\d+$/;
const MAYOR_MOVIL = /^v\d+$/;

// CERO EXCEPCIONES, y la que habia se fue por una razon que conviene saber.
//
// Hasta el change `guardrail-deltas-por-version-exacta` este banco eximia, por lista
// exacta de archivo, ref y action, UNA invocacion: `marco-ci.yml` ->
// `actions/guardrail-deltas@v1`. El motivo escrito era cierto mientras esa action fue
// un PASO del job `openspec`: GitHub resuelve las actions de un job en «Set up job»,
// antes de evaluar el `if` de cualquier paso, asi que en el CI del propio marco la ref
// se resolvia siempre, y pinar la version que se estaba cortando ponia en rojo al PR
// que la cortaba (medido el 2026-08-22: "Unable to resolve action ...@v1.4.2").
//
// Desde la 1.8.0 esa action vive en su propio job `deltas`, salteado en el repo que
// distribuye el marco por la misma sonda que `constitucion_cableada`. Un job salteado
// no descarga nada, asi que la circularidad desaparecio y la excepcion quedo sin
// motivo: era reducible. Se mato pinando la linea a la version exacta, y lo que la
// hace posible —que toda referencia remota propia viva en un job particionado— ya no
// depende de que alguien se acuerde: lo cobra `pruebas/andamio/refs-propias.test.mjs`.
//
// Si manana hace falta otra, el camino NO es volver a abrir una lista: es partir la
// pieza en un job con la particion. Una excepcion que se puede reducir y no se reduce
// es el pin exacto del consumidor convertido otra vez en una media verdad.
// Marcadores legitimos DENTRO de un `uses:`: el `{{ORG}}` del andamio lo
// sustituye la adopcion, `<SHA-COMPLETO>` es el hueco que rellena el ensayo
// contra un consumidor real, y `vX.Y.Z` es como la documentacion escribe «una
// version» cuando cita un `uses:` sin comprometerse con un numero.
const MARCADOR = /^(<|\{\{|vX\.Y\.Z$)/;

// La primera entrada con numero del CHANGELOG (`## [1.4.1] — 2026-08-21`), con la `v`
// delante. El lector es el UNICO del marco (`pruebas/vigencia.mjs`): el mismo que vence las
// excepciones de `actions-alcanzables.test.mjs` (este archivo no tiene ninguna desde el change
// `guardrail-deltas-por-version-exacta`). Una copia aca podria vencer una excepcion con un
// CHANGELOG y comparar los pines con otro.
function versionPublicada() {
  return `v${versionDelChangelog(RAIZ)}`;
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
// `patron` es parametro y no una constante capturada para que el caso de mas
// abajo pueda correr el MISMO escaneo con el regex sensible a mayusculas y medir
// la diferencia, en vez de dejarla escrita en un comentario que nadie recalcula.
function pinesDeUses(patron = PIN) {
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
        const m = lineas[i].match(patron);
        if (!m) continue;
        // m[1] es la ruta dentro del repo del marco ("/actions/guardrail-deltas" o
        // "/.github/workflows/marco-ci.yml"), sin la barra inicial. Hoy ningun caso la
        // lee: la usaba la lista de excepciones, que ya no existe.
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
      "actualizar-marco.yml, asi que menos de quince significa que este banco dejo de mirar " +
      "donde deberia: revisá SUPERFICIES y el regex PIN antes de creerle al verde",
  );
});

test("la `i` del regex de pines no es cosmetica: sin ella este banco no ve casi nada", () => {
  // El comentario de PIN afirmaba una cifra que nadie recalculaba, y llego a
  // decir «1 en vez de 15» mezclando la medicion con el umbral de la asercion de
  // arriba. Aca la diferencia se MIDE en cada corrida con el mismo escaneo: el
  // repo se llama `Projects` con mayuscula, asi que un regex sensible a
  // mayusculas deja de ver los `uses:` del marco y este banco entero pasa
  // vacuamente sobre una lista de uno.
  const conI = pinesDeUses(PIN).length;
  const sinI = pinesDeUses(new RegExp(PIN.source)).length;
  assert.ok(PIN.flags.includes("i"), "PIN perdio la `i`: el escaneo dejo de ver `Projects` con mayuscula");
  assert.ok(
    sinI < conI,
    `sin la \`i\` el escaneo encuentra ${sinI} y con ella ${conI}: si los dos numeros son iguales, o el ` +
      "repo dejo de escribirse `Projects` con mayuscula o este control dejo de medir lo que cree",
  );
  // Y la consecuencia concreta: sin la `i` la asercion del no-op de arriba se
  // cae, que es lo que la vuelve la red y no un adorno.
  assert.ok(
    sinI < 15,
    `sin la \`i\` el escaneo todavia encuentra ${sinI} pines, o sea que el umbral de 15 ya no seria la red ` +
      "que caza un regex desfasado",
  );
});

test("ningun `uses:` del marco apunta a un tag mayor movil (@v1), sin excepciones", () => {
  const moviles = pinesDeUses().filter((p) => MAYOR_MOVIL.test(p.ref));
  assert.deepEqual(
    moviles.map((p) => `${p.archivo}:${p.linea} → @${p.ref}`),
    [],
    "hay `uses:` al tag mayor movil. Dependabot no propone bump para `@v1` (para el ya es la " +
      "mayor vigente), asi que ese repo no recibe versiones nuevas por PR y no aparece en el " +
      "censo de consumidores del marco. Pinar la version exacta `vX.Y.Z`. Si la linea es una " +
      "invocacion interna de un workflow del marco, su job va particionado por " +
      "`needs.cambios.outputs.es_distribuidor` (ver pruebas/andamio/refs-propias.test.mjs) y " +
      "entonces el pin exacto es posible: no hay lista de excepciones que la exima",
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
  const raros = pinesDeUses().filter((p) => !VERSION_EXACTA.test(p.ref) && !MARCADOR.test(p.ref));
  assert.deepEqual(
    raros.map((p) => `${p.archivo}:${p.linea} → @${p.ref}`),
    [],
    "un ref que no es `vX.Y.Z` ni un marcador (`{{...}}`, `<...>`) no lo resuelve GitHub: el " +
      "`uses:` muere con un error que parece un typo en la ruta del repo",
  );
});

// ---------------------------------------------------------------------------
// LA CLASE «v1 SE RETIRO», y por que esta guarda vive aca.
//
// El tag movil `v1` dejo de ser el CANAL de distribucion el 2026-08-21 pero NO se
// puede borrar, y el motivo cambio con el tiempo. Hasta la 1.9.6, `marco-ci.yml`
// invocaba a una action hermana (guardrail-deltas) por @v1; desde el change
// `guardrail-deltas-por-version-exacta` el arbol ya no lo resuelve en ninguna linea,
// pero las versiones PUBLICADAS hasta la 1.9.6 si: su `marco-ci.yml` lo lleva adentro,
// y un consumidor pinado a una de ellas resuelve `v1` en cada corrida de su job
// `deltas-openspec`. Borrar el tag le rompe ese job con "Unable to resolve action".
//
// La afirmacion FALSA de que el tag «se retiro» aparecio CINCO veces en archivos
// distintos: se arreglaba en uno y sobrevivia en otro (la skill del release,
// AGENTS.md, README, claude.yml y —cazada por la auditoria adversarial del release
// 1.6.0— actions/aviso-version/aviso-version.mjs, donde ademas era una REGRESION:
// un commit reemplazo un texto correcto por uno falso). Y la afirmacion contraria —que
// el marco lo sigue usando en una linea— paso a ser falsa el dia que esa linea se pino,
// en seis superficies a la vez.
//
// Las aserciones de abajo convierten esa disciplina en un check. La primera es
// completamente decidible; las dos de prosa declaran su limite.
// ---------------------------------------------------------------------------

const SUPERFICIES_DE_PROSA = [
  ".github/workflows",
  "actions",
  "plantilla",
  ".claude/skills",
  "docs",
  "herramientas",
  "openspec/changes",
  "openspec/specs",
];

// El archive queda fuera: ahi el texto viejo es historia inmutable. El CHANGELOG
// tampoco se escanea (no esta en las superficies) y con razon: sus entradas CITAN
// estas frases justamente para explicar que se arreglaron.
const EXENTOS = [path.sep + "archive" + path.sep];

function candidatosDeProsa() {
  const candidatos = [
    ...SUPERFICIES_DE_PROSA.flatMap(archivosDe),
    path.join(RAIZ, "AGENTS.md"),
    path.join(RAIZ, "README.md"),
  ];
  // Cero candidatos seria un banco roto, no un arbol limpio.
  assert.ok(candidatos.length > 50, `solo ${candidatos.length} archivos escaneados: el recorrido se rompio`);
  return candidatos.filter((abs) => fs.existsSync(abs) && !EXENTOS.some((e) => abs.includes(e)));
}

test("marco-ci.yml no invoca ninguna pieza propia por un tag mayor movil", () => {
  // Esto afirmaba lo contrario —«EXACTAMENTE una invocacion por @v1»— hasta el change
  // `guardrail-deltas-por-version-exacta`. Aquella asercion protegia que el paso 5 del
  // release no quedara moviendo un tag que nadie usa; la de hoy protege la propiedad
  // que ese paso encubria: un consumidor pinado a `marco-ci.yml@vX.Y.Z` recibia ESE
  // workflow y la action hermana de donde apuntara el tag en ese momento, sin PR.
  //
  // Cualquier mayor movil y no `v1` literal: una regla escrita contra la linea vigente
  // deja de proteger en la siguiente, que es justo cuando vuelve a hacer falta. Y
  // acotado a las piezas del MARCO: `actions/checkout` y sus hermanas son de terceros y
  // las gobierna el censo de pines ajenos del ci.yml del marco.
  const lineas = fs.readFileSync(path.join(RAIZ, ".github/workflows/marco-ci.yml"), "utf8").split(/\r?\n/);
  // Solo `uses:` de verdad: un comentario que cuenta la historia de `@v1` tiene que
  // poder escribirlo, y un `echo "uses: ..."` dentro de un run no resuelve nada.
  const propias = lineas
    .map((texto, i) => ({ texto: texto.trim(), linea: i + 1 }))
    .filter((l) => /^(?:-\s+)?uses:\s*["']?[^\s"'/]+\/Projects\//i.test(l.texto));
  // «No encontre ninguna» no es verde: es el banco mirando otra cosa.
  assert.ok(
    propias.length >= 1,
    "no encontre ninguna invocacion de una pieza propia en marco-ci.yml: o el workflow dejo de " +
      "invocar actions del marco, o el patron de este caso dejo de matchear. Revisalo antes de creerle al verde",
  );
  const porMovil = propias.filter((l) => /@v\d+["']?(?:\s+#.*)?$/.test(l.texto));
  assert.deepEqual(
    porMovil.map((l) => `.github/workflows/marco-ci.yml:${l.linea} → ${l.texto}`),
    [],
    "el workflow reusable invoca una pieza propia por un tag mayor movil. Un consumidor pinado a " +
      "`marco-ci.yml@vX.Y.Z` recibiria ESE workflow y esta pieza de donde apunte el tag hoy, sin PR: su " +
      "pin exacto seria una media verdad y el no tiene forma de arreglarlo, porque la linea no vive en su " +
      "arbol. Arreglo: pinar la version exacta (la mas alta del CHANGELOG) y, si el job corre en el repo " +
      "del marco, particionarlo por `needs.cambios.outputs.es_distribuidor` como los jobs `deltas` y " +
      "`constitucion_cableada`. No se agrega a ninguna lista de excepciones",
  );
});

test("ningun archivo del marco afirma que v1 se retiro", () => {
  // LIMITE DECLARADO, leelo antes de confiar: esta es una lista de las formas EXACTAS
  // que ya aparecieron, no un detector de la idea. Una redaccion nueva que diga lo
  // mismo con otras palabras se escapa. Es a proposito: decidir si una frase afirma o
  // niega algo no se resuelve con un escaneo de texto, y un check que se pone rojo
  // cuando la documentacion esta BIEN escrita ensena a ignorarlo — el mismo
  // razonamiento por el que este banco no mira la prosa de los pines. Lo que SI
  // garantiza: que la frase que ya se colo cinco veces no se cuele una sexta copiada.
  const FALSAS = [
    "el tag movil `v1` se retiro",
    "el tag movil v1 se retiro",
    "el tag `v1` se retiro",
    "v1 se retiro: no existe",
    "el retiro de `v1`",
    "el tag mayor se retira",
    "se retiró del todo cuando",
  ];
  const encontradas = [];
  for (const abs of candidatosDeProsa()) {
    const texto = fs.readFileSync(abs, "utf8");
    for (const f of FALSAS) {
      if (texto.includes(f)) {
        encontradas.push(`${path.relative(RAIZ, abs).replace(/\\/g, "/")}: "${f}"`);
      }
    }
  }
  assert.deepEqual(
    encontradas,
    [],
    "v1 NO se retiro: las versiones publicadas hasta la 1.9.6 lo resuelven dentro de su " +
      "marco-ci.yml, y un consumidor pinado a una de ellas depende de que el tag exista. Lo " +
      "correcto es decir que dejo de ser el CANAL de distribucion",
  );
});

test("ningun archivo del marco afirma que marco-ci.yml sigue invocando una pieza propia por v1", () => {
  // LA MISMA CLASE, DEL OTRO LADO. Mientras `marco-ci.yml` invocaba guardrail-deltas por
  // `@v1`, seis superficies lo decian con estas palabras. El dia que esa linea se pino a
  // la version exacta, las seis pasaron a afirmar algo falso a la vez, y una sola que
  // sobreviva le dice a quien corta un release que mueva `v1` «porque el marco lo usa».
  //
  // LIMITE DECLARADO, el mismo del caso de arriba: son las formas EXACTAS que existieron,
  // no un detector de la idea. Se compara sobre el texto NORMALIZADO —los saltos de
  // linea con su marca de cita o de comentario (`>`, `#`, `//`, `*`) se aplanan a un
  // espacio— porque tres de las seis estaban partidas en dos lineas, y un `includes`
  // literal no las habria visto nunca.
  const FALSAS_DEL_ROL_INTERNO = [
    "sobrevive en **una** línea",
    "sobrevive en **una sola linea**",
    "lo consume **una sola linea del marco**",
    "referencia a una de sus propias actions hermanas (guardrail-deltas) por @v1",
    "referencia a una de sus propias actions hermanas por `@v1`",
    "El tag existe, pero solo para una línea interna del marco",
    "ULTIMO `@v1` vivo del marco",
    "por una razon estructural, y el paso 5 lo mueve",
    // Hallazgo RV-H6 de la revision adversarial del porte: la action de la
    // constitucion decia que su texto llegaba en la resolucion de `@v1` que ya
    // ocurria. Desde guardrail-deltas-por-version-exacta no ocurre ninguna.
    "en la misma resolucion de @v1 que ya ocurre",
  ];
  const aplanar = (t) => t.replace(/\r?\n[ \t]*(?:>|#|\/\/|\*)?[ \t]*/g, " ").replace(/[ \t]+/g, " ");

  // El control de que la normalizacion no es un no-op: una frase partida en dos lineas
  // de cita tiene que aparecer entera despues de aplanar.
  assert.ok(
    aplanar("> El tag existe, pero solo para una línea\n> interna del marco").includes(FALSAS_DEL_ROL_INTERNO[5]),
    "la normalizacion dejo de unir las lineas partidas: este caso volvio a ser un `includes` literal",
  );

  const encontradas = [];
  for (const abs of candidatosDeProsa()) {
    const texto = aplanar(fs.readFileSync(abs, "utf8"));
    for (const f of FALSAS_DEL_ROL_INTERNO) {
      if (texto.includes(f)) encontradas.push(`${path.relative(RAIZ, abs).replace(/\\/g, "/")}: "${f}"`);
    }
  }
  assert.deepEqual(
    encontradas,
    [],
    "marco-ci.yml ya no invoca ninguna pieza propia por `@v1`: guardrail-deltas va por version exacta " +
      "desde el change `guardrail-deltas-por-version-exacta`. Lo que sigue resolviendo `v1` son las " +
      "versiones PUBLICADAS hasta la 1.9.6, y si el paso 5 del release lo mueve es una decision pendiente " +
      "(ver ese paso). Reescribi la frase con eso",
  );
});

test("ningun archivo del marco afirma que `@v1` es el canal, ni que un arreglo llega sin PR", () => {
  // LA TERCERA CARA DE LA MISMA CLASE, y la peor ubicada. actions/README.md es la
  // superficie donde un consumidor decide COMO pinar, y su seccion Versionado seguia
  // diciendo que `@v1` apunta al ultimo commit compatible de la 1.x y que un arreglo
  // llega a todos en el proximo run, sin PR. Es falso desde el 2026-08-21: el canal es
  // la version exacta mas el PR de Dependabot, y `v1` no avanza con cada release. Al
  // consumidor lo dejaba pinado a un arbol que no se mueve, creyendo que recibia los
  // arreglos. El upstream de este marco lo encontro como la octava copia vencida del
  // mismo hecho (Rigel 2.4.0, commit 3ce8fde); aca estaba igual, y tambien en el
  // encabezado del ci.yml del andamio y en el de marco-ci.yml.
  //
  // LIMITE DECLARADO, el de los dos casos de arriba: formas EXACTAS, sobre texto
  // aplanado. Una redaccion nueva de la misma idea no la ve; la ve el review.
  const FALSAS_DEL_CANAL = [
    "`@v1` es un tag móvil: apunta al último commit compatible",
    "Antes de mover `v1`, la action nueva se prueba",
    "La ventana existe porque `v1` es un tag móvil",
    "Con `v1` móvil, un consumidor recibe comportamiento nuevo",
    "Un arreglo acá llega a todos los repos en su próximo run, sin PR en cada uno",
    "asi un arreglo alla llega a este repo sin abrir un PR aca",
    "Un arreglo aca arregla el CI de todos los repos a la vez",
    "por eso una subida del pin llega sola",
    // Hallazgo RV-H6 de la revision adversarial del porte: un traspaso entre lotes
    // se perdio y estas sobrevivieron en un workflow del marco y en el mensaje de un
    // paso de su CI. Las de los bancos las cobra el caso de abajo.
    "necesita enterarse de lo que le llega por @v1",
    "llega a todos los consumidores de @v1",
  ];
  const aplanar = (t) => t.replace(/\r?\n[ \t]*(?:>|#|\/\/|\*)?[ \t]*/g, " ").replace(/[ \t]+/g, " ");
  assert.ok(
    aplanar("# se consume por referencia desde Projects, asi un arreglo alla llega a este repo\n# sin abrir un PR aca.").includes(FALSAS_DEL_CANAL[5]),
    "la normalizacion dejo de unir las lineas partidas: este caso volvio a ser un `includes` literal",
  );

  const encontradas = [];
  for (const abs of candidatosDeProsa()) {
    const texto = aplanar(fs.readFileSync(abs, "utf8"));
    for (const f of FALSAS_DEL_CANAL) {
      if (texto.includes(f)) encontradas.push(`${path.relative(RAIZ, abs).replace(/\\/g, "/")}: "${f}"`);
    }
  }
  assert.deepEqual(
    encontradas,
    [],
    "el canal de distribucion es la version exacta mas el PR de bump de Dependabot: un arreglo del marco llega a " +
      "cada consumidor como un PR que alguien lee y mergea, y `v1` no avanza con cada release. Reescribi la " +
      "frase con eso; si citas la forma vieja para explicar que se corrigio, parafraseala",
  );
});

test("ningun banco del marco afirma en su prosa que su arreglo viaja por `@v1`", () => {
  // LA MISMA CLASE, DENTRO DE LOS BANCOS. Los casos de arriba no leen `pruebas/`: sus
  // fixtures usan `@v1` a proposito, porque lo que prueban es el parseo de un ref. Pero
  // un MENSAJE de asercion es prosa que alguien lee cuando el banco se pone rojo, y el
  // de actions/constitucion/pruebas/regresiones-auditoria.test.mjs decia que el
  // guardrail de deltas le llegaba a todos los consumidores por el tag movil: falso
  // desde que el canal es la version exacta, y un traspaso entre lotes lo dejo vivo
  // (hallazgo RV-H6 de la revision adversarial del porte). Son frases, no refs: ningun
  // fixture las contiene. LIMITE, el de los casos de arriba: formas exactas.
  const FALSAS_EN_BANCOS = [
    "viaja por @v1 a todos los consumidores",
    "viaja por `@v1` a todos los consumidores",
    "llega a todos los consumidores por `@v1`",
  ];
  const aplanar = (t) => t.replace(/\r?\n[ \t]*(?:>|#|\/\/|\*)?[ \t]*/g, " ").replace(/[ \t]+/g, " ");
  const bancos = [];
  const recorrer = (dir) => {
    if (!fs.existsSync(dir)) return;
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (e.name !== "node_modules") recorrer(p);
      } else if (/\.test\.mjs$/.test(e.name) && p !== import.meta.filename) bancos.push(p);
    }
  };
  recorrer(path.join(RAIZ, "actions"));
  recorrer(path.join(RAIZ, "pruebas"));
  assert.ok(bancos.length > 40, `solo ${bancos.length} bancos leidos: el recorrido se rompio`);
  const encontradas = [];
  for (const abs of bancos) {
    const texto = aplanar(fs.readFileSync(abs, "utf8"));
    for (const f of FALSAS_EN_BANCOS) {
      if (texto.includes(f)) encontradas.push(`${path.relative(RAIZ, abs).replace(/\\/g, "/")}: "${f}"`);
    }
  }
  assert.deepEqual(
    encontradas,
    [],
    "un banco dice que lo que protege le llega a los consumidores por `@v1`. El canal es la version exacta mas el " +
      "PR de bump: reescribi el mensaje con eso",
  );
});
