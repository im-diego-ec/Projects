// QUE PASOS DEL MARCO NO TIENEN BANCO — derivado del arbol, no contado a mano.
//
// POR QUE EXISTE. El encabezado del extractor dice que los pasos inline "eran
// los unicos del marco SIN banco de pruebas" y que la salida fue levantar el
// banco alrededor del texto que corre de verdad. Fue cierto para una parte: el
// banco se levanto sobre unos pocos pasos y el resto quedo afuera, y el hueco
// solo se descubria contandolo A MANO, una auditoria por vez. Un hueco que hay
// que acordarse de medir vuelve a abrirse solo.
//
// QUE MIRA, desde el change `rojo-primero`. TODOS los pasos de TODAS las
// superficies donde el marco escribe un paso: los workflows de `.github/workflows/`,
// los que el andamio reparte en `plantilla/.github/workflows/` y los `action.yml`
// de las actions publicadas. Hasta ese change miraba solo los `run: |` de
// marco-ci.yml, y la mitad que VIAJA —lo que corre en el pipeline de cada proyecto
// nacido del andamio— no la miraba nadie: un paso del andamio roto no se descubre
// en el marco, se descubre en el repositorio de otro. Las superficies se derivan
// recorriendo el arbol (`superficies()` del extractor), asi que un workflow o una
// action nuevos entran solos.
//
// CADA PASO CAE EN EXACTAMENTE UNO DE ESTOS ESTADOS, y ninguno es "no se sabe":
//
//   con banco     un `run:` cuyo nombre CITA algun banco como cadena literal: ese
//                 banco saca el script del YAML y lo corre.
//   deuda         un `run:` con logica propia de decision —ramas que deciden rojo
//                 o verde— que ningun banco corre todavia. Se declara en
//                 SIN_BANCO_TODAVIA con el motivo, y sale por ::warning:: en cada
//                 corrida. Es trabajo pendiente.
//   sin rojo      un paso al que NO se le escribe banco propio, y no por deuda: o
//                 es plomeria (instala, trae el arbol, publica: accion, no
//                 verificacion), o su rojo es el de la herramienta que invoca sin
//                 logica propia de decision, o avisa por diseño y no puede fallar.
//                 Se declara en SIN_ROJO con su tipo y su motivo. NO es trabajo
//                 pendiente, y por eso no se cuenta junto con la deuda: mezclarlos
//                 hace que "falta un banco" y "no hay banco que escribir" se lean
//                 igual.
//   action del    un `uses:` a una action de este mismo arbol: su rojo lo declara
//   marco         ella, y sus pasos estan en este mismo censo.
//   tercero       un `uses:` a una action ajena: plomeria por construccion. Se
//                 declara UNA VEZ por action en TERCEROS, no una por paso.
//
// LOS ROJOS, y ninguno es "el numero subio":
//
//   1. Un paso que no cae en ningun estado -> rojo. Un guardrail nuevo no entra
//      sin banco ni sin decir, en una linea, por que todavia no lo tiene.
//   2. Una deuda que ya tiene banco -> rojo. La deuda que se pago se borra en el
//      mismo PR, si no la lista deja de significar algo.
//   3. Una declaracion de un paso o de un archivo que ya no existe -> rojo.
//   4. Un paso declarado en las dos listas -> rojo: "falta su banco" y "no hay
//      banco que escribir" no pueden ser verdad a la vez.
//   5. UN PASO QUE NO PUEDE FALLAR NO ES COMPUERTA. Un paso con
//      `continue-on-error` distinto de `false` —en el paso o en su job— tiene que
//      estar en SIN_ROJO, aunque un banco lo corra: su rojo no detiene nada. Viene
//      de Rigel (2.4.0, change `el-numero-del-censo`, issue #341): alla el censo
//      contaba como compuerta entera de un requirement a un paso cuyo propio
//      comentario decia "sale 0 SIEMPRE". Es un proxy mecanico de "nada puede
//      ponerlo rojo" y se declara como proxy.
//   6. Un `uses:` a una action ajena que TERCEROS no nombra, o a una action del
//      marco que no existe en el arbol -> rojo.
//
// LO QUE ESTE CASO NO MIDE, declarado, y son DOS limites y no uno.
//
// PRIMERO: "citado" se decide por TEXTO, no por ejecucion. Un paso cuenta como
// citado cuando su nombre aparece COMO CADENA LITERAL COMPLETA —entre comillas,
// solo o como `- name: <nombre>`— en algun `.test.mjs` de `pruebas/` o de
// `actions/*/pruebas/`. Hasta el change `rojo-primero` alcanzaba con que
// apareciera en cualquier parte, comentarios incluidos, y estaba medido que eso
// daba pasos por cubiertos de gratis: pegando el nombre de un paso declarado como
// comentario suelto en otro banco, su entrada salto por pagada. La cadena literal
// cierra ESE camino, no el de un literal que se nombra sin correrse. Lo que el
// mecanismo SI garantiza es la otra direccion, que es la que arma la compuerta: un
// paso que ningun banco nombra no lo corrio nadie, y ese es el que se exige
// declarar.
//
// UN NOMBRE REPETIDO EN DOS SUPERFICIES no alcanza para citar a ninguna. Si el
// banco lo extrae con `scriptDelPaso(<nombre>, <archivo>)` y los dos argumentos son
// literales o constantes del banco, la llamada dice de que archivo es y manda. Si
// no se puede resolver, el banco tiene que nombrar el archivo en algun lado (su
// ruta, o su nombre si es unico en el arbol), y ese ultimo camino es grueso: un
// banco que nombra los dos archivos cita a los dos homonimos. Sin esta regla,
// extender el censo a varias superficies contaba de MAS, y se midio: el paso de
// Terraform de marco-ci.yml salia "citado" por el banco de su homonimo del
// andamio, y el Veredicto del andamio por el banco del de marco-ci.yml. Ninguno de
// los dos lo corria nadie.
//
// SEGUNDO: "citado" tampoco es "cubierto". Que un banco extraiga un paso y lo
// corra no dice cuantas de sus ramas ejercito. Medir eso exige cobertura sobre
// el marco, y el marco no tiene manifiesto de paquete ni cobertura-diff cableada
// sobre si mismo. Lo que este caso cierra es el hueco groseramente mas grande:
// el paso que no ejecuto NADIE, nunca.
import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { basename, join, posix } from "node:path";

import { RAIZ, pasosDe, superficies } from "./extraer.mjs";
import { carpetaTemporal, escribir, limpiarTodo } from "./util.mjs";
import { porque } from "../porque.mjs";

test.after(limpiarTodo);

// ── LA DEUDA DECLARADA ─────────────────────────────────────────────────────
//
// Cada entrada es un paso con logica propia que todavia no tiene banco, con el
// motivo por el que no lo tiene. No es una lista de excepciones permanentes: es
// lo que falta, escrito donde se ve, y cada linea que se borra es un banco que
// se escribio.
//
// NINGUN MOTIVO REPITE EL LARGO DEL PASO, y eso es deliberado. El ::warning::
// ya imprime el largo DERIVADO del YAML justo antes del motivo, asi que una
// cifra escrita a mano aca no agrega nada y si se pudre.
//
// La clave de un paso es su nombre; si no tiene, `(sin name, id: <id>)` o
// `(sin name, run: <comando>)`; y si el nombre se repite en el mismo archivo, la
// segunda aparicion es `<nombre> (#2)`: el extractor busca por nombre y se queda
// con la primera, asi que la segunda no la puede correr ningun banco.
const SIN_BANCO_TODAVIA = {
  ".github/workflows/marco-ci.yml": new Map([
    [
      "El runner es Linux x86-64",
      "lee uname: el caso exige correr en la plataforma que se quiere refutar, o sea una matriz de sistemas operativos y no un banco",
    ],
    [
      "Formato y validez de las raices de Terraform",
      "es HOMONIMO del paso del andamio, y el banco del andamio (terraform-en-ci.test.mjs) corre el de plantilla/.github/workflows/ci.yml, no este: este trae guardas propias —la fecha de ventana_terraform y la lista de raices vacia— que no corre nadie. Hasta el change rojo-primero salia 'citado' por el nombre ajeno. La ventana se retira en el lote la-ventana-se-cierra del porte, y el banco conviene escribirlo sobre el paso que quede",
    ],
  ]),
  ".github/workflows/ci.yml": new Map([
    [
      "Casos sinteticos de las composite actions",
      "corre los bancos de las actions y su rojo es el de ellos, pero la guarda de 'no encontre ningun banco' es logica propia que ningun caso pone en rojo",
    ],
    [
      "Casos sinteticos de los pasos inline de marco-ci",
      "corre los bancos de pruebas/ y su rojo es el de ellos, pero las guardas de 'no encontre bancos' y de la exclusion de pruebas/init/ son logica propia que ningun caso pone en rojo",
    ],
    [
      "Banco de la herramienta de init",
      "corre el banco de init, pero decide el modo de la pata de la matriz (rojo o aviso) y rechaza un modo desconocido: esas ramas no las corre ningun caso",
    ],
    [
      "Pines de actions de terceros por SHA",
      "consulta la API de GitHub con gh para resolver los tags: el banco necesita un gh simulado. Pasa a compuerta en el lote el-pr-del-marco-se-cobra del porte, que es donde conviene escribirlo",
    ],
    [
      "El pipeline que reparte el andamio tambien pasa actionlint",
      "descarga actionlint como 'Definiciones de pipeline validas' de marco-ci.yml; sus rojos sin red (descarga caida, andamio sin workflows) se pueden escribir con el mismo stub de curl, y no se escribieron todavia",
    ],
    [
      "El marco no se auto-identifica por un literal de su cuenta",
      "barre el arbol buscando el slug literal de la cuenta; se puede escribir con un arbol de juguete y no se escribio todavia",
    ],
    [
      "Veredicto",
      "es el veredicto del CI PROPIO del marco (ci-ok), HOMONIMO del de marco-ci.yml, que si tiene banco (distribuidor.test.mjs). Este usa `${{ needs.* }}`, y el banco tiene que sustituirlas antes de correr, como hace el del veredicto de marco-ci.yml",
    ],
  ]),
  ".github/workflows/aviso-version.yml": new Map([
    [
      "Enviar el aviso al destino configurado",
      "envia por red a un destino externo configurado por el repo: el banco necesita un curl simulado. Lo reescriben los lotes del aviso de version del porte (el-aviso-de-version-dice-lo-que-manda), que es donde conviene escribirlo",
    ],
  ]),
  "plantilla/.github/workflows/desplegar.yml": new Map([
    [
      "Comprobar que este commit paso las verificaciones",
      "consulta los check-runs del commit con gh: el banco necesita un gh simulado. El workflow entero lo reescribe el lote el-despliegue-no-le-da-la-llave-al-fork del porte, que trae el banco que evalua sus condiciones",
    ],
    [
      "Compilar el sitio",
      "tiene una guarda propia —un dist/ vacio es rojo— que ningun caso corre; el resto es el build del proyecto",
    ],
    [
      "Comprobar que produccion contesta de verdad",
      "es el gemelo del paso de DEV, que si tiene banco (post-despliegue.test.mjs); este consulta la direccion de produccion y ningun caso lo corre",
    ],
  ]),
};

// ── LOS PASOS QUE NO SE PONEN ROJOS POR SU CUENTA, Y NO ES DEUDA ─────────────
//
// Tres tipos, cerrados:
//   plomeria    instala, trae el arbol, genera, publica, abre un PR: accion, no
//               verificacion. No hay propiedad que un caso pueda refutar.
//   rojo-ajeno  el paso ES la invocacion de una herramienta, sin logica propia de
//               decision: su rojo es el de la herramienta, y lo que la gobierna
//               (la configuracion, las reglas) se prueba donde vive.
//   aviso       avisa por diseño y sale 0 siempre. Se declara para que nadie lo
//               lea como compuerta.
const TIPOS_SIN_ROJO = new Set(["plomeria", "rojo-ajeno", "aviso"]);

const SIN_ROJO = {
  ".github/workflows/ci.yml": new Map([
    [
      "Que actions quedan sin banco de pruebas",
      {
        tipo: "aviso",
        motivo: "avisa por diseño y nunca es rojo; la misma propiedad la pone en rojo pruebas/ci-del-marco/toda-action-trae-banco.test.mjs",
      },
    ],
  ]),
  "plantilla/.github/workflows/actualizar-marco.yml": new Map([
    [
      "Avisar si el PR va a nacer sin checks",
      { tipo: "aviso", motivo: "falta de un token propio es friccion, no rotura: el paso solo imprime un ::warning::" },
    ],
    [
      "Abrir o actualizar el PR",
      { tipo: "plomeria", motivo: "empuja la rama y abre el PR con gh: es la accion del workflow, no una verificacion" },
    ],
  ]),
  "plantilla/.github/workflows/ci.yml": new Map([
    ["(sin name, run: corepack enable)", { tipo: "plomeria", motivo: "habilita el gestor de paquetes que declara el manifiesto" }],
    [
      "(sin name, run: pnpm install --frozen-lockfile)",
      { tipo: "rojo-ajeno", motivo: "el rojo de un lockfile desalineado es el de pnpm con --frozen-lockfile" },
    ],
    [
      "Generar el cliente de la capa de datos",
      {
        tipo: "plomeria",
        motivo: "genera el cliente tipado de la capa de datos antes del typecheck; el --fail-if-no-match es el rojo de pnpm si el paquete no existe",
      },
    ],
    [
      "(sin name, run: pnpm lint)",
      {
        tipo: "rojo-ajeno",
        motivo: "invoca el lint del proyecto; las reglas que lo vuelven rojo se prueban donde viven (pruebas/marca/reglas-marca.test.mjs, pruebas/andamio/)",
      },
    ],
    [
      "(sin name, run: pnpm format:check)",
      { tipo: "rojo-ajeno", motivo: "invoca el chequeo de formato del proyecto: su rojo es el de prettier" },
    ],
  ]),
  "plantilla/.github/workflows/desplegar.yml": new Map([
    [
      "Comprobar que la credencial existe, y NO fallar si no",
      {
        tipo: "aviso",
        motivo: "sin la credencial avisa en amarillo y apaga los pasos siguientes: una tarea humana pendiente no es un rojo del proyecto",
      },
    ],
    ["Comprobar que la credencial existe, y NO fallar si no (#2)", { tipo: "aviso", motivo: "el mismo aviso, en el job de produccion" }],
    ["Instalar", { tipo: "rojo-ajeno", motivo: "corepack y pnpm install --frozen-lockfile: el rojo es el de pnpm" }],
    ["Instalar (#2)", { tipo: "rojo-ajeno", motivo: "el mismo paso, en el job de produccion" }],
    [
      "Subir la version a DEV",
      { tipo: "plomeria", motivo: "sube la version con wrangler: es la publicacion, y la comprobacion es el paso siguiente, que tiene banco" },
    ],
    [
      "Promover a produccion la version que se miro en DEV",
      { tipo: "plomeria", motivo: "promueve con wrangler la version etiquetada: es la publicacion, y la comprobacion es el paso siguiente" },
    ],
  ]),
};

// ── LAS ACTIONS AJENAS, UNA VEZ CADA UNA ──────────────────────────────────────
//
// Su rojo es de un tercero y el marco no lo prueba: lo que el marco SI controla
// es que esten pinadas por SHA, y eso lo mira el paso "Pines de actions de
// terceros por SHA" de ci.yml. Se declaran por action y no por paso: un checkout
// es un checkout en los veinte lugares donde aparece.
const TERCEROS = new Map([
  ["actions/checkout", "trae el arbol: plomeria"],
  ["actions/setup-node", "instala Node: plomeria"],
  ["actions/upload-artifact", "guarda archivos de la corrida: plomeria"],
  [
    "anthropics/claude-code-action",
    "corre el agente que responde las menciones: es el servicio del workflow, no una verificacion",
  ],
]);

// ─────────────────────────────────────────────────────────────────────────────

/** Los bancos, con su archivo: donde se busca la cita de cada paso. */
function bancos(raiz = RAIZ) {
  const salida = [];
  const leerCarpeta = (relativa) => {
    const abs = join(raiz, relativa);
    if (!existsSync(abs)) return;
    for (const archivo of readdirSync(abs)) {
      if (!archivo.endsWith(".test.mjs")) continue;
      const ruta = join(abs, archivo);
      // ESTE ARCHIVO SE EXCLUYE, Y NO ES UN DETALLE: las listas de arriba NOMBRAN a
      // los pasos que faltan, asi que leyendose a si mismo este caso los encontraba
      // citados y salia diciendo que no falta ninguno. Paso en la primera corrida.
      if (ruta === import.meta.filename) continue;
      salida.push({ archivo: `${relativa}/${archivo}`, texto: readFileSync(ruta, "utf8") });
    }
  };
  for (const carpeta of readdirSync(join(raiz, "pruebas"), { withFileTypes: true })) {
    if (carpeta.isDirectory()) leerCarpeta(`pruebas/${carpeta.name}`);
  }
  for (const accion of readdirSync(join(raiz, "actions"), { withFileTypes: true })) {
    if (accion.isDirectory()) leerCarpeta(`actions/${accion.name}/pruebas`);
  }
  return salida;
}

const escaparRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * El nombre como cadena literal COMPLETA: entre comillas del mismo tipo, sola o
 * precedida por `- name: ` —que es como la busca un banco que ubica el paso por
 * su linea del YAML, por ejemplo `la-compuerta-de-prod.test.mjs`—.
 */
const citaLiteral = (texto, nombre) =>
  new RegExp(`(["'\`])(?:-\\s+)?(?:name:\\s+)?${escaparRe(nombre)}\\1`).test(texto);

/**
 * Si el texto de un banco nombra un archivo: por su ruta relativa, o por su nombre
 * si ese nombre es unico entre las superficies. Un `path.join("a", "b")` cuenta
 * como la ruta "a/b". Y `RUTA_WORKFLOW`, la constante del extractor, nombra a
 * marco-ci.yml: es el archivo que `scriptDelPaso` lee cuando no se le pasa otro.
 */
function nombraArchivo(texto, ruta, basenamesUnicos) {
  const juntado = texto.replace(/(["'`])\s*,\s*(["'`])/g, "/");
  if (new RegExp(`(^|[^\\w./-])${escaparRe(ruta)}($|[^\\w./-])`).test(juntado)) return true;
  const base = basename(ruta);
  if (basenamesUnicos.has(base) && new RegExp(`(^|[^\\w.-])${escaparRe(base)}($|[^\\w.-])`).test(juntado)) return true;
  return ruta === ".github/workflows/marco-ci.yml" && /\bRUTA_WORKFLOW\b/.test(texto);
}

/**
 * Las extracciones que un banco hace con `scriptDelPaso`, resueltas a (archivo,
 * nombre) cuando sus dos argumentos son literales o constantes del mismo banco.
 *
 * POR QUE HACE FALTA. Con varias superficies, "el banco nombra el archivo" mirado
 * sobre el texto entero cuenta de mas: `distribuidor.test.mjs` corre el Veredicto
 * de marco-ci.yml y, para OTRA cosa, nombra plantilla/.github/workflows/ci.yml, y
 * con eso el Veredicto del andamio salia citado sin que nadie lo corriera. Medido
 * al escribir este lector. Cuando la llamada se puede resolver, la llamada manda.
 *
 * Sin segundo argumento, el archivo es marco-ci.yml: es el que `scriptDelPaso` lee
 * por defecto (y `RUTA_WORKFLOW` lo nombra). Una ruta armada desde
 * `import.meta.dirname` es relativa a la carpeta del banco; cualquier otra se lee
 * desde la raiz. Una llamada que no se puede resolver —una copia temporal, la
 * variable de un bucle— no dice nada y se ignora.
 */
export function extraccionesDe(texto, archivo = "") {
  const constantes = new Map();
  for (const m of texto.matchAll(/\bconst\s+([A-Za-z_$][\w$]*)\s*=\s*([^;\n]+)/g)) constantes.set(m[1], m[2].trim());
  const resolver = (expr) => {
    const limpia = expr.trim();
    return /^[A-Za-z_$][\w$]*$/.test(limpia) && constantes.has(limpia) ? constantes.get(limpia) : limpia;
  };
  const literales = (expr) => [...expr.matchAll(/(["'`])((?:(?!\1).)*)\1/g)].map((m) => m[2]);
  const salida = [];
  for (const m of texto.matchAll(/\bscriptDelPaso\(\s*([^,()]+?)\s*(?:,\s*((?:[^()]|\([^()]*\))+?))?\s*\)/g)) {
    const nombreExpr = resolver(m[1]);
    if (!/^(["'`])((?!\1).)*\1$/.test(nombreExpr) || nombreExpr.includes("${")) continue;
    const nombre = literales(nombreExpr)[0];
    let ruta = ".github/workflows/marco-ci.yml";
    if (m[2] !== undefined) {
      const rutaExpr = resolver(m[2]);
      if (rutaExpr === "RUTA_WORKFLOW") ruta = ".github/workflows/marco-ci.yml";
      else {
        const partes = literales(rutaExpr);
        if (partes.length === 0 || rutaExpr.includes("${")) continue;
        const relativaAlBanco = /import\.meta\.(dirname|url)/.test(rutaExpr);
        ruta = posix.normalize(relativaAlBanco ? `${posix.dirname(archivo)}/${partes.join("/")}` : partes.join("/"));
      }
    }
    salida.push({ nombre, ruta });
  }
  return salida;
}

/** La clave con la que se nombra un paso en las listas y en los mensajes. */
function conClaves(pasos) {
  const vistas = new Map();
  return pasos.map((paso) => {
    let clave;
    if (paso.nombre !== null) {
      const n = (vistas.get(paso.nombre) ?? 0) + 1;
      vistas.set(paso.nombre, n);
      clave = n === 1 ? paso.nombre : `${paso.nombre} (#${n})`;
    } else if (paso.id !== null) clave = `(sin name, id: ${paso.id})`;
    else if (paso.textoRun !== null) clave = `(sin name, run: ${paso.textoRun})`;
    else if (paso.uses !== null) clave = `(sin name, uses: ${paso.uses})`;
    else clave = `(sin name, linea ${paso.linea})`;
    return { ...paso, clave };
  });
}

/** Una referencia `uses:` partida: la action del marco que invoca, o el tercero. */
function queInvoca(uses) {
  const local = uses.match(/^\.\/actions\/([^/@]+)\/?$/);
  if (local) return { delMarco: local[1] };
  const remota = uses.match(/^[^/]+\/Projects\/actions\/([^/@]+)@/);
  if (remota) return { delMarco: remota[1] };
  const tercero = uses.match(/^([^/@\s]+\/[^/@\s]+)/);
  return { tercero: tercero ? tercero[1] : uses };
}

/**
 * EL CENSO, puro: recibe las superficies ya leidas, los bancos y las tres listas,
 * y devuelve el estado de cada paso y los problemas. Las refutaciones de abajo le
 * pasan a ESTA MISMA funcion entradas mutadas.
 */
export function censar({ archivos, textos, sinBanco, sinRojo, terceros, accionesDelMarco }) {
  const pasos = archivos.flatMap(({ ruta, pasos: crudos }) => conClaves(crudos).map((p) => ({ ...p, ruta })));

  // Un nombre extraible que aparece en mas de una superficie: citarlo exige nombrar el archivo.
  const superficiesPorNombre = new Map();
  for (const p of pasos) {
    if (!p.extraible) continue;
    superficiesPorNombre.set(p.nombre, new Set([...(superficiesPorNombre.get(p.nombre) ?? []), p.ruta]));
  }
  const cuentaBase = new Map();
  for (const { ruta } of archivos) cuentaBase.set(basename(ruta), (cuentaBase.get(basename(ruta)) ?? 0) + 1);
  const basenamesUnicos = new Set([...cuentaBase].filter(([, n]) => n === 1).map(([b]) => b));

  const bancosLeidos = textos.map((b) => ({ ...b, extracciones: extraccionesDe(b.texto, b.archivo) }));
  const citadoPor = (p) => {
    if (!p.extraible) return [];
    const homonimo = superficiesPorNombre.get(p.nombre).size > 1;
    return bancosLeidos
      .filter((b) => {
        // Si el banco extrae ESE nombre con una llamada que se puede resolver, la
        // llamada dice de que archivo: no se adivina por el resto del texto.
        const propias = b.extracciones.filter((e) => e.nombre === p.nombre);
        // Igualdad exacta y no `endsWith`: plantilla/.github/workflows/ci.yml TERMINA en
        // .github/workflows/ci.yml, y con `endsWith` el banco del veredicto del andamio
        // daba por citado al del CI propio del marco. Paso al escribir este lector.
        if (propias.length > 0) return propias.some((e) => e.ruta === p.ruta);
        return citaLiteral(b.texto, p.nombre) && (!homonimo || nombraArchivo(b.texto, p.ruta, basenamesUnicos));
      })
      .map((b) => b.archivo);
  };

  const declaradaEn = (lista, p) => lista[p.ruta]?.get(p.clave);
  const problemas = {
    sinEstado: [],
    pagados: [],
    fantasmas: [],
    enLasDos: [],
    noPuedeFallar: [],
    tercerosSinDeclarar: [],
    accionesQueNoExisten: [],
    declaracionesMalEscritas: [],
  };
  const filas = [];

  for (const p of pasos) {
    const deuda = declaradaEn(sinBanco, p);
    const sinRojoDeclarado = declaradaEn(sinRojo, p);
    const donde = `${p.ruta}:${p.linea}`;
    if (deuda !== undefined && sinRojoDeclarado !== undefined) problemas.enLasDos.push(`${p.clave} (${donde})`);

    // (5) UN PASO QUE NO PUEDE FALLAR NO ES COMPUERTA, este quien este corriendolo.
    if (p.continueOnError && sinRojoDeclarado === undefined) {
      problemas.noPuedeFallar.push(
        `${p.clave} (${donde}): continue-on-error: ${p.continueOnError.valor} ${p.continueOnError.delJob ? "en su JOB" : "en el paso"}, linea ${p.continueOnError.linea}`,
      );
    }

    if (p.run === null && p.uses !== null) {
      const invoca = queInvoca(p.uses);
      if (invoca.delMarco !== undefined) {
        if (!accionesDelMarco.has(invoca.delMarco)) problemas.accionesQueNoExisten.push(`${p.clave} (${donde}): uses: ${p.uses}`);
        filas.push({ ...p, estado: sinRojoDeclarado ? "sin-rojo" : "action-del-marco" });
      } else {
        if (!terceros.has(invoca.tercero)) problemas.tercerosSinDeclarar.push(`${invoca.tercero} (${donde}, paso ${p.clave})`);
        filas.push({ ...p, estado: "tercero" });
      }
      continue;
    }

    const citas = citadoPor(p);
    if (sinRojoDeclarado !== undefined) filas.push({ ...p, estado: "sin-rojo", tipo: sinRojoDeclarado.tipo });
    else if (deuda !== undefined) {
      if (citas.length > 0) problemas.pagados.push(`${p.clave} (${donde}), citado por ${citas.join(", ")}`);
      filas.push({ ...p, estado: "deuda", motivo: deuda });
    } else if (citas.length > 0) filas.push({ ...p, estado: "con-banco", citas });
    else {
      const homonimo = p.extraible && superficiesPorNombre.get(p.nombre).size > 1;
      problemas.sinEstado.push(
        `${p.clave} (${donde}, ${p.largo} lineas de script)${homonimo ? ` — el nombre se repite en ${[...superficiesPorNombre.get(p.nombre)].join(" y ")}, asi que el banco que lo corra tiene que nombrar tambien ${p.ruta}` : ""}${!p.extraible && p.run === "bloque" ? " — el extractor no lo puede sacar del YAML (sin name en la linea del guion, o nombre repetido en el archivo)" : ""}`,
      );
      filas.push({ ...p, estado: "sin-estado" });
    }
  }

  // (3) Las declaraciones que ya no apuntan a nada, y (4) las que estan mal escritas.
  const rutas = new Set(archivos.map((a) => a.ruta));
  const claves = new Set(pasos.map((p) => `${p.ruta}::${p.clave}`));
  for (const [nombreLista, lista] of [
    ["SIN_BANCO_TODAVIA", sinBanco],
    ["SIN_ROJO", sinRojo],
  ]) {
    for (const [ruta, mapa] of Object.entries(lista)) {
      if (!rutas.has(ruta)) {
        problemas.fantasmas.push(`${nombreLista}: ${ruta} no es ninguna superficie del arbol (se renombro, se borro, o nunca existio)`);
        continue;
      }
      for (const [clave, valor] of mapa) {
        if (!claves.has(`${ruta}::${clave}`)) problemas.fantasmas.push(`${nombreLista}: «${clave}» ya no existe en ${ruta}`);
        const motivo = nombreLista === "SIN_ROJO" ? valor?.motivo : valor;
        if (typeof motivo !== "string" || motivo.trim().length < 20) {
          problemas.declaracionesMalEscritas.push(`${nombreLista}: «${clave}» (${ruta}) no trae un motivo escrito`);
        }
        if (nombreLista === "SIN_ROJO" && !TIPOS_SIN_ROJO.has(valor?.tipo)) {
          problemas.declaracionesMalEscritas.push(
            `SIN_ROJO: «${clave}» (${ruta}) declara el tipo "${valor?.tipo}", y los unicos son ${[...TIPOS_SIN_ROJO].join(", ")}`,
          );
        }
      }
    }
  }
  return { filas, problemas };
}

/** Las superficies del arbol real, ya leidas. */
const ARCHIVOS = superficies().map((ruta) => ({ ruta, pasos: pasosDe(join(RAIZ, ruta)) }));
const ACCIONES_DEL_MARCO = new Set(
  readdirSync(join(RAIZ, "actions"), { withFileTypes: true })
    .filter((e) => e.isDirectory() && existsSync(join(RAIZ, "actions", e.name, "action.yml")))
    .map((e) => e.name),
);
const REAL = censar({
  archivos: ARCHIVOS,
  textos: bancos(),
  sinBanco: SIN_BANCO_TODAVIA,
  sinRojo: SIN_ROJO,
  terceros: TERCEROS,
  accionesDelMarco: ACCIONES_DEL_MARCO,
});

test("cobertura de los pasos · se miraron las tres familias de superficies, y hay pasos en cada una", () => {
  // Cero pasos JAMAS es un exito: un renombrado de carpeta o un lector roto dejarian
  // todo lo de abajo en verde sin haber mirado nada.
  const familias = {
    "el CI del marco (.github/workflows/)": ARCHIVOS.filter((a) => a.ruta.startsWith(".github/workflows/")),
    "lo que el andamio reparte (plantilla/.github/workflows/)": ARCHIVOS.filter((a) => a.ruta.startsWith("plantilla/.github/workflows/")),
    "las actions publicadas (actions/*/action.yml)": ARCHIVOS.filter((a) => /^actions\/[^/]+\/action\.yml$/.test(a.ruta)),
  };
  const vacias = Object.entries(familias)
    .filter(([, archivos]) => archivos.length === 0 || archivos.every((a) => a.pasos.length === 0))
    .map(([nombre]) => nombre);
  assert.deepEqual(vacias, [], porque("una familia de superficies quedo sin archivos o sin pasos: el censo esta mirando otro arbol", ARCHIVOS.map((a) => `${a.ruta}: ${a.pasos.length}`)));
  const marcoCi = ARCHIVOS.find((a) => a.ruta === ".github/workflows/marco-ci.yml");
  assert.ok(
    marcoCi && marcoCi.pasos.filter((p) => p.run === "bloque").length >= 12,
    porque("marco-ci.yml tiene que aportar al menos 12 pasos con bloque run:; si bajaron, el lector de pasos esta roto", marcoCi?.pasos.length),
  );
});

test("cobertura de los pasos · ningun paso queda sin estado", () => {
  assert.deepEqual(
    REAL.problemas.sinEstado,
    [],
    "estos pasos no tienen banco, no estan declarados como deuda y tampoco como sin rojo. Un guardrail que ningun caso ejecuto nunca decide veredictos —muchas veces sobre repos ajenos— con la unica evidencia de que alguien lo leyo. Arreglo, uno de tres: escribile el banco (el extractor scriptDelPaso y los helpers de pruebas/marco-ci/util.mjs ya existen, y el banco tiene que nombrar el paso como cadena literal); o agregalo a SIN_BANCO_TODAVIA de este archivo con el motivo por el que todavia no lo tiene; o, si no verifica nada que un caso pueda refutar, a SIN_ROJO con su tipo (plomeria, rojo-ajeno o aviso) y su motivo",
  );
});

test("cobertura de los pasos · la deuda declarada esta al dia", () => {
  assert.deepEqual(
    REAL.problemas.pagados,
    [],
    'estos pasos figuran como "sin banco todavia" y YA tienen uno. Sacalos de SIN_BANCO_TODAVIA en el mismo PR que escribio el banco — una lista de deuda que no se poda deja de significar algo y el proximo lector no sabe cual mitad es cierta',
  );
  assert.deepEqual(
    REAL.problemas.fantasmas,
    [],
    "estas declaraciones apuntan a un paso o a un archivo que ya no existe. Se renombraron o se borraron; en los dos casos la entrada sobra, y si el paso se renombro, la entrada va con el nombre nuevo",
  );
});

test("cobertura de los pasos · las declaraciones son coherentes", () => {
  assert.deepEqual(
    REAL.problemas.enLasDos,
    [],
    'estos pasos estan en SIN_BANCO_TODAVIA y en SIN_ROJO a la vez. "Le falta su banco" y "no hay banco que escribirle" no pueden ser verdad juntas: decidi cual es y borra la otra',
  );
  assert.deepEqual(
    REAL.problemas.declaracionesMalEscritas,
    [],
    "una declaracion sin motivo, o con un tipo que no existe, es una excepcion que nadie puede auditar. Arreglo: escribile el motivo, y en SIN_ROJO uno de los tres tipos",
  );
});

test("cobertura de los pasos · un paso que no puede fallar no se cuenta como compuerta", () => {
  assert.deepEqual(
    REAL.problemas.noPuedeFallar,
    [],
    "estos pasos llevan continue-on-error —en el paso o en su job— con un valor distinto de false, asi que su rojo no detiene nada, y no estan en SIN_ROJO. Aunque un banco los corra, no son compuertas: contarlos como tales hace que el censo este mal HACIA ARRIBA, que es la direccion que nadie revisa. Arreglo: o sacale el modificador y dale un rojo de verdad, o declaralo en SIN_ROJO con tipo aviso y el motivo",
  );
});

test("cobertura de los pasos · todo uses: a una action ajena esta declarado, y todo uses: del marco existe", () => {
  assert.deepEqual(
    REAL.problemas.tercerosSinDeclarar,
    [],
    "estas actions ajenas no estan en TERCEROS. Su rojo es de un tercero y el marco no lo prueba: lo que se exige es decir que hacen. Arreglo: agregala a TERCEROS con una linea de motivo (y pinala por SHA: lo mira 'Pines de actions de terceros por SHA' de ci.yml)",
  );
  assert.deepEqual(
    REAL.problemas.accionesQueNoExisten,
    [],
    "estos pasos invocan una action del marco que no existe en actions/ de este arbol. Arreglo: corregi el nombre, o crea la action",
  );
});

test("cobertura de los pasos · la deuda que queda sale por ::warning::, no en silencio", () => {
  const deuda = REAL.filas.filter((f) => f.estado === "deuda");
  for (const f of deuda) {
    console.log(
      `::warning file=${f.ruta},line=${f.linea}::el paso "${f.clave}" trae ${f.largo} lineas de script y ningun banco lo corre. Motivo declarado: ${f.motivo}`,
    );
  }
  const cuenta = (estado) => REAL.filas.filter((f) => f.estado === estado).length;
  const lineasSinBanco = deuda.reduce((total, f) => total + f.largo, 0);
  console.log(
    `== resumen == ${REAL.filas.length} pasos en ${ARCHIVOS.length} superficies: ${cuenta("sin-estado")} sin estado, ${cuenta("con-banco")} con banco, ${deuda.length} deuda declarada (${lineasSinBanco} lineas de script sin ejercitar), ${cuenta("sin-rojo")} sin rojo declarado, ${cuenta("action-del-marco")} uses: a actions del marco, ${cuenta("tercero")} uses: a actions ajenas`,
  );
  // La afirmacion del caso no es el numero: es que el aviso se emitio por cada
  // deuda declarada. Un aviso mudo seria el agujero otra vez.
  const declaradas = Object.values(SIN_BANCO_TODAVIA).reduce((total, mapa) => total + mapa.size, 0);
  assert.equal(
    deuda.length,
    declaradas,
    porque(`se avisaron ${deuda.length} deudas y las listas declaran ${declaradas}: los casos de arriba tendrian que haber explicado la diferencia`, REAL.problemas),
  );
});

test("la deuda LLEGA al runner: toda invocacion de `node --test` de ci.yml usa el reporter que no la tapa", () => {
  // Lo encontro la revision adversarial del porte (2026-09-18). La deuda sale por console.log de
  // ESTE banco, y el job de ci.yml corre `node --test` con Node 22 y sin --test-reporter. Con la
  // salida que no es una terminal —la del runner—, Node 22 usa TAP, que le antepone «# » a todo
  // lo que imprime un banco: el runner solo reconoce un comando que empieza con «::», asi que las
  // 14 deudas quedaban como comentarios perdidos. Con Node 24 el default es spec y no se nota:
  // dependia de la maquina. La hermana en actions/constitucion/pruebas/refutaciones-ronda-3.test.mjs
  // (::notice:: y ::warning:: por console.log) tenia el mismo destino.
  //
  // PRIMERO LA PREMISA, con el Node que corre esto: TAP la tapa y spec no.
  const tmp = carpetaTemporal("reporter-");
  const banco = escribir(tmp, "anota.test.mjs", 'import test from "node:test";\ntest("x", () => { console.log("::warning file=a,line=1::la deuda"); });\n');
  // Sin NODE_TEST_CONTEXT: heredado de este mismo `node --test`, el hijo se comporta como un
  // subproceso del corredor y no como el `node --test` de un paso de CI.
  const entorno = { ...process.env };
  delete entorno.NODE_TEST_CONTEXT;
  const correr = (reporter) =>
    spawnSync(process.execPath, ["--test", `--test-reporter=${reporter}`, banco], { encoding: "utf8", env: entorno }).stdout;
  const enColumnaCero = (salida) => salida.split("\n").some((l) => l.startsWith("::warning file=a,line=1::"));
  assert.equal(enColumnaCero(correr("tap")), false, porque("la premisa: con TAP la anotacion NO queda en la columna 0", correr("tap")));
  assert.equal(enColumnaCero(correr("spec")), true, porque("con spec la anotacion queda en la columna 0", correr("spec")));

  // Y LA PROPIEDAD, sobre el ci.yml real: cada `node --test` fija el reporter, en vez de heredar
  // el que su version de Node elija para una salida que no es una terminal.
  const ci = readFileSync(join(RAIZ, ".github", "workflows", "ci.yml"), "utf8").split("\n");
  // Una invocacion es la linea que EMPIEZA con el comando (sola o como condicion de un if); un
  // echo que la nombra en su texto no corre nada.
  const invocaciones = ci.map((l, i) => ({ l, n: i + 1 })).filter(({ l }) => /^\s*(?:if\s+|!\s*)?node --test\b/.test(l));
  assert.ok(invocaciones.length >= 3, porque("ci.yml corre sus bancos en al menos tres invocaciones; el lector dejo de verlas", invocaciones));
  const sinReporter = invocaciones.filter(({ l }) => !l.includes("--test-reporter=spec")).map(({ l, n }) => `ci.yml:${n}: ${l.trim()}`);
  assert.deepEqual(
    sinReporter,
    [],
    porque("estas invocaciones dejan que Node elija el reporter, y con Node 22 en el runner es TAP: tapa las anotaciones de los bancos. Arreglo: --test-reporter=spec", sinReporter),
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// LAS REFUTACIONES. Cada una le pasa a LA MISMA funcion `censar` un arbol de
// juguete, y comprueba que el rojo que promete aparece. Una guarda que nadie vio
// fallar no es una guarda.
// ─────────────────────────────────────────────────────────────────────────────

const JUGUETE = [
  "jobs:",
  "  uno:",
  "    runs-on: ubuntu-latest",
  "    steps:",
  "      - uses: actions/checkout@0000000000000000000000000000000000000000 # v7",
  "      - name: Compuerta con banco",
  "        run: |",
  "          exit 1",
  "      - name: Compuerta sin banco",
  "        run: |",
  "          exit 1",
  "      - name: Veredicto",
  "        run: |",
  "          exit 1",
  "      - uses: ./actions/de-juguete",
  "",
].join("\n");

/** Un arbol de juguete con dos superficies: la que se pide y un homonimo en otra. */
function juguete(yml = JUGUETE) {
  const raiz = carpetaTemporal("censo-pasos-");
  escribir(raiz, "wf/ci.yml", yml);
  escribir(raiz, "wf/otro.yml", ["jobs:", "  dos:", "    steps:", "      - name: Veredicto", "        run: |", "          exit 1", ""].join("\n"));
  return [
    { ruta: "wf/ci.yml", pasos: pasosDe(join(raiz, "wf/ci.yml")) },
    { ruta: "wf/otro.yml", pasos: pasosDe(join(raiz, "wf/otro.yml")) },
  ];
}

// Dos bancos y no uno, a proposito: el censo decide que un banco "nombra el
// archivo" mirando su texto entero, asi que un banco que nombrara wf/ci.yml para
// otro paso y "Veredicto" para el de wf/otro.yml citaria a los dos homonimos.
// Es un limite declarado del mecanismo (ver el encabezado), no algo que este
// caso pueda refutar.
const BANCO_JUGUETE = [
  { archivo: "pruebas/x/juguete.test.mjs", texto: 'scriptDelPaso("Compuerta con banco", "wf/ci.yml");\n' },
  { archivo: "pruebas/x/veredicto.test.mjs", texto: 'scriptDelPaso("Veredicto", "wf/otro.yml");\n' },
];

const censarJuguete = ({ yml, textos = BANCO_JUGUETE, sinBanco = {}, sinRojo = {}, terceros = new Map([["actions/checkout", "plomeria de juguete"]]) } = {}) =>
  censar({ archivos: juguete(yml), textos, sinBanco, sinRojo, terceros, accionesDelMarco: new Set(["de-juguete"]) });

test("MUERDE: un paso sin banco y sin declarar se caza, y el de control no", () => {
  const { problemas } = censarJuguete({ sinBanco: { "wf/ci.yml": new Map([["Veredicto", "el homonimo de juguete no tiene banco"]]) } });
  assert.deepEqual(
    problemas.sinEstado.map((s) => s.split(" (")[0]),
    ["Compuerta sin banco"],
    porque("el paso sin banco tenia que ser el UNICO sin estado: el que tiene banco es el verde de control", problemas),
  );
});

test("MUERDE: un comentario que nombra el paso NO lo da por citado", () => {
  // Es el agujero medido del mecanismo viejo: el nombre pegado en un comentario
  // suelto daba el paso por cubierto sin que ningun caso lo corriera.
  const textos = [{ archivo: "pruebas/x/otro.test.mjs", texto: "// aca se habla de Compuerta sin banco, de pasada\n" }, ...BANCO_JUGUETE];
  const { problemas } = censarJuguete({ textos, sinBanco: { "wf/ci.yml": new Map([["Veredicto", "el homonimo de juguete no tiene banco"]]) } });
  assert.ok(
    problemas.sinEstado.some((s) => s.startsWith("Compuerta sin banco")),
    porque("un comentario no es una cita: el paso tenia que seguir sin estado", problemas),
  );
});

test("MUERDE: un homonimo NO queda citado por el banco del otro archivo", () => {
  // El banco de juguete corre el Veredicto de wf/otro.yml. El de wf/ci.yml tiene el
  // mismo nombre y NADIE lo corre: con el mecanismo viejo salia citado.
  const { problemas, filas } = censarJuguete();
  assert.ok(
    problemas.sinEstado.some((s) => s.startsWith("Veredicto (wf/ci.yml")),
    porque("el Veredicto de wf/ci.yml no lo corre nadie y tenia que quedar sin estado", problemas),
  );
  assert.equal(
    filas.find((f) => f.ruta === "wf/otro.yml" && f.clave === "Veredicto")?.estado,
    "con-banco",
    porque("y el de wf/otro.yml, que si se nombra con su archivo, tenia que contar como citado", filas),
  );
});

test("MUERDE: la extraccion resuelta manda: un banco que corre un homonimo y nombra el otro archivo para otra cosa no cita a los dos", () => {
  // Es el caso real de distribuidor.test.mjs: corre el Veredicto de marco-ci.yml y nombra
  // plantilla/.github/workflows/ci.yml por otro motivo. Mirando solo el texto, el Veredicto
  // del andamio salia citado.
  const textos = [
    {
      archivo: "pruebas/x/mezclado.test.mjs",
      texto: 'const CI = "wf/ci.yml";\nscriptDelPaso("Compuerta con banco", CI);\nscriptDelPaso("Veredicto", "wf/otro.yml");\n',
    },
  ];
  const { problemas, filas } = censarJuguete({ textos });
  assert.ok(
    problemas.sinEstado.some((s) => s.startsWith("Veredicto (wf/ci.yml")),
    porque("la llamada dice wf/otro.yml: el Veredicto de wf/ci.yml no lo corre nadie", problemas),
  );
  assert.equal(filas.find((f) => f.ruta === "wf/otro.yml" && f.clave === "Veredicto")?.estado, "con-banco", porque("el de wf/otro.yml si", filas));
});

test("MUERDE: una ruta que TERMINA igual no es la misma ruta", () => {
  // plantilla/.github/workflows/ci.yml termina en .github/workflows/ci.yml. Con una
  // comparacion por sufijo, el banco del veredicto del andamio citaba al del CI del marco.
  const raiz = carpetaTemporal("censo-sufijo-");
  const yml = ["jobs:", "  a:", "    steps:", "      - name: Veredicto", "        run: |", "          exit 1", ""].join("\n");
  escribir(raiz, "wf/ci.yml", yml);
  escribir(raiz, "plantilla/wf/ci.yml", yml);
  const { problemas } = censar({
    archivos: ["wf/ci.yml", "plantilla/wf/ci.yml"].map((ruta) => ({ ruta, pasos: pasosDe(join(raiz, ruta)) })),
    textos: [{ archivo: "pruebas/x/v.test.mjs", texto: 'scriptDelPaso("Veredicto", "plantilla/wf/ci.yml");\n' }],
    sinBanco: {},
    sinRojo: {},
    terceros: new Map(),
    accionesDelMarco: new Set(),
  });
  assert.deepEqual(
    problemas.sinEstado.map((s) => s.split(",")[0]),
    ["Veredicto (wf/ci.yml:4"],
    porque("solo el de plantilla/wf/ci.yml esta citado", problemas),
  );
});

test("MUERDE: una deuda que ya tiene banco se caza como pagada", () => {
  const { problemas } = censarJuguete({
    sinBanco: { "wf/ci.yml": new Map([["Compuerta con banco", "motivo de juguete que ya no es cierto"]]) },
  });
  assert.ok(problemas.pagados.some((s) => s.startsWith("Compuerta con banco")), porque("la deuda pagada tenia que aparecer", problemas));
});

test("MUERDE: una declaracion de un paso o de un archivo que no existe se caza", () => {
  const { problemas } = censarJuguete({
    sinBanco: {
      "wf/ci.yml": new Map([["Un paso que nadie escribio", "motivo de juguete de un paso fantasma"]]),
      "wf/borrado.yml": new Map([["X", "motivo de juguete de un archivo fantasma"]]),
    },
  });
  assert.equal(problemas.fantasmas.length, 2, porque("las dos declaraciones fantasma tenian que cazarse", problemas));
});

test("MUERDE: un paso en las dos listas, o una declaracion sin motivo o con un tipo inventado, se caza", () => {
  const { problemas } = censarJuguete({
    sinBanco: { "wf/ci.yml": new Map([["Compuerta sin banco", "motivo de juguete de la deuda"]]) },
    sinRojo: { "wf/ci.yml": new Map([["Compuerta sin banco", { tipo: "inventado", motivo: "" }]]) },
  });
  assert.equal(problemas.enLasDos.length, 1, porque("el paso en las dos listas tenia que cazarse", problemas));
  assert.equal(problemas.declaracionesMalEscritas.length, 2, porque("el motivo vacio y el tipo inventado tenian que cazarse", problemas));
});

test("MUERDE: un paso con continue-on-error se caza aunque un banco lo corra, y tambien si el modificador esta en el job", () => {
  const enElPaso = JUGUETE.replace("      - name: Compuerta con banco\n", "      - name: Compuerta con banco\n        continue-on-error: true\n");
  assert.notEqual(enElPaso, JUGUETE, "la mutacion del paso no se aplico");
  const r1 = censarJuguete({ yml: enElPaso, sinBanco: { "wf/ci.yml": new Map([["Veredicto", "el homonimo de juguete no tiene banco"]]) } });
  assert.ok(r1.problemas.noPuedeFallar.some((s) => s.startsWith("Compuerta con banco")), porque("el continue-on-error del paso tenia que cazarse", r1.problemas));

  const enElJob = JUGUETE.replace("    runs-on: ubuntu-latest\n", "    runs-on: ubuntu-latest\n    continue-on-error: ${{ matrix.experimental }}\n");
  assert.notEqual(enElJob, JUGUETE, "la mutacion del job no se aplico");
  const r2 = censarJuguete({ yml: enElJob });
  assert.ok(
    r2.problemas.noPuedeFallar.some((s) => s.startsWith("Compuerta con banco") && s.includes("en su JOB")),
    porque("el continue-on-error del JOB alcanza a todos sus pasos, y una expresion puede valer true", r2.problemas),
  );

  // El verde de control: el mismo paso declarado en SIN_ROJO deja de ser problema.
  const r3 = censarJuguete({
    yml: enElPaso,
    sinBanco: { "wf/ci.yml": new Map([["Veredicto", "el homonimo de juguete no tiene banco"]]) },
    sinRojo: { "wf/ci.yml": new Map([["Compuerta con banco", { tipo: "aviso", motivo: "avisa por diseño en el juguete" }]]) },
  });
  assert.deepEqual(r3.problemas.noPuedeFallar, [], porque("declarado como sin rojo, el paso ya no se cuenta como compuerta y no es problema", r3.problemas));
});

test("MUERDE: un tercero sin declarar y una action del marco que no existe se cazan", () => {
  const yml = `${JUGUETE}      - uses: alguien/otra-action@0000000000000000000000000000000000000000\n      - uses: ./actions/no-existe\n`;
  const { problemas } = censarJuguete({ yml });
  assert.deepEqual(
    problemas.tercerosSinDeclarar.map((s) => s.split(" (")[0]),
    ["alguien/otra-action"],
    porque("el tercero sin declarar tenia que cazarse, y el checkout declarado no", problemas),
  );
  assert.equal(problemas.accionesQueNoExisten.length, 1, porque("la action del marco inexistente tenia que cazarse", problemas));
});
