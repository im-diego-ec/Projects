#!/usr/bin/env node
// La porción del marco de la constitución: se RENDERIZA en el repo consumidor y se
// VERIFICA que lo presente sea lo que el marco publica para la versión que declara.
//
// POR QUÉ EXISTE (design `reglas-al-dia`, D1/D2). El área implementa con agentes, y
// en ese modo **las reglas que el agente lee SON el producto**: una regla que no
// entra al contexto de la sesión no existe, por bien escrita que esté en otro repo.
// La superficie que transporta esas reglas era la única de las cuatro formas de
// distribución sin actualización ni check: scaffold, o sea «se copia una vez y
// después es del proyecto». El resultado medido antes de esta action: una adopción
// nueva perdió 114 de 355 líneas —reglas enteras, no formato—, y en el consumidor
// viejo la divergencia ya corría en las dos direcciones.
//
// LA DECISIÓN CENTRAL (D1). El texto canónico vive en `canonico/`, viaja DENTRO de
// esta composite action —el `GITHUB_TOKEN` de un consumidor no lee otro repositorio,
// así que el transporte es `GITHUB_ACTION_PATH`, igual que `guardrail-deltas`— y se
// renderiza contra los valores del proyecto (`.projects-valores.json`) para producir un
// artefacto por superficie de agente declarada. El `AGENTS.md` del consumidor queda
// con lo suyo y una línea de import.
//
// LO QUE EL SELLO ES Y LO QUE NO. La cabecera de una línea
// (`<!-- projects:constitucion version=... sha=... -->`) es greppable en disco: el check
// lee de ahí la versión sin gastar contexto del agente. El `sha` identifica el
// CANÓNICO de esa versión, no el cuerpo renderizado, y es a propósito: si el sello
// cubriera el cuerpo, el arreglo mecánicamente obvio para un rojo de «editado a mano»
// sería recomputar el hash y volver a estampar. La autoridad sobre el cuerpo es el
// RE-RENDER, que no se puede falsificar sin cambiar el canónico.
//
// ESTA ES LA ÚNICA PIEZA QUE VERIFICA LA CONSTITUCIÓN, desde el 2026-08-20. Había
// además un paso inline en el `marco-ci.yml` que heredan todos los consumidores, y una
// auditoría adversarial midió que las dos verdades ya discrepaban en esquema, en
// severidad y en formato de sello: el paso exigía 64 hex del cuerpo mientras acá se
// emiten 12 hex del canónico, así que rechazaba artefactos recién generados por este
// mismo código con un mensaje que mandaba a correr el escritor que los había generado.
// Sobrevive esta pieza y no la otra por el párrafo de arriba: comparar contra el
// re-render es estrictamente más fuerte que comparar contra el sello, porque recomputar
// un sello es un `git commit` y cambiar el canónico no.
//
// DÓNDE ESTÁ EL ROJO Y DÓNDE EL AVISO
//   · artefacto ausente o atrasado -> ::warning:: hasta el `exigible_desde` de la
//     versión pendiente más vieja, ::error:: desde esa fecha. Nunca verde mudo (D7):
//     el vecino de este check sale por `exit 0` con «nada que verificar» y eso lo
//     dejaría pasando justo donde el problema es peor.
//   · `.projects-valores.json` ausente -> en modo VERIFICAR entra por la misma ventana
//     que el artefacto faltante: es un atraso de adopción, no una manipulación, y un
//     rojo seco el primer día es un endurecimiento estrenado sin modo aviso. En modo
//     ESCRIBIR sigue siendo rojo, porque sin valores no hay con qué renderizar. La
//     asimetría es la propiedad, no una excepción.
//   · marcador del scaffold sin resolver -> ::error::, y en modo escribir no se emite
//     nada. Un valor cuyo TEXTO es el propio marcador no cuenta como valor.
//   · cuerpo distinto del re-render -> ::error:: siempre, con el diff. La ventana de
//     gracia es para reglas NUEVAS, no para ediciones a mano.
//   · cadena de carga rota -> ::error::. Un import que no resuelve no emite ninguna
//     señal por sí mismo: es indistinguible de que la regla nunca haya existido.
//   · desvío sin motivo, o cuya regla ya no existe -> ::error:: (desvío muerto, con
//     el motivo que tenía escrito en el mensaje).
//   · desvío válido -> ::notice:: en CADA corrida, para que un motivo que envejeció
//     mal quede a la vista en vez de fosilizarse.
//   · ítem del piso recomendado de permisos sin cubrir -> ::warning::, JAMÁS rojo. Un
//     permiso de más es riesgo, uno de menos es fricción, y bajo fricción la salida
//     más barata es el `settings.local.json` que el `.gitignore` excluye: un rojo acá
//     empujaría el allowlist fuera de la revisión cruzada.
//   · allowlist ausente -> ::notice::. «No había nada que mirar» no es «está sano»,
//     y callarse sería declararlo sano.
//   · fin de línea, espacios al final de línea y líneas en blanco al final del
//     archivo -> NO son divergencia. Un reflujo de prosa del formateador SÍ lo es:
//     el mecanismo para eso es `.projects/` en el `.prettierignore` del proyecto, el
//     mismo con que ya están fuera los artefactos del CLI de OpenSpec.
//
// Variables de entorno:
//   CONSTITUCION_MODO      verificar (default) | escribir
//   CONSTITUCION_CANONICO  directorio del canónico (default: <este dir>/canonico)
//   CONSTITUCION_RAIZ      raíz del repo consumidor (default: cwd)
//   CONSTITUCION_VALORES   default: .projects-valores.json
//   CONSTITUCION_DESVIOS   default: .projects-desvios.json
//   CONSTITUCION_SUPERFICIES  lista separada por comas; vacío = lo que declaren los
//                             valores y, si el archivo NO declara la clave, el
//                             default del marco. Declararla vacía NO es un default:
//                             es rojo (`sin-superficies`)
//   CONSTITUCION_ALLOWLIST  default: .claude/settings.json. De ahí se mide el piso
//                           recomendado de permisos que declara el manifiesto. Es la
//                           ÚNICA medición de ese piso: el paso de permisos del
//                           workflow reusable tenía su copia y las dos divergieron
//   CONSTITUCION_SALIDA_CORREGIDA  dónde deja el artefacto al día en modo verificar
//
// No hay variable para «hoy». La ventana de gracia se decide con la fecha del
// sistema y `verificar()` la recibe por parámetro: un override por entorno sería un
// botón para posponer el rojo para siempre.

import { createHash } from "node:crypto";
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  realpathSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** Días mínimos entre `publicada` y `exigible_desde`. Es `AGENTS.md` de Projects («un
 *  endurecimiento se estrena en modo aviso») convertido en campo obligatorio: el rojo
 *  lo dispara una fecha, no el release. */
export const DIAS_DE_GRACIA_MINIMOS = 28;

const MS_POR_DIA = 86400000;

/** Marca de regla. Va en comentario HTML para que sea greppable sin ser prosa, y su
 *  id es ESTABLE: un desvío lo nombra, y un desvío cuya regla desapareció es rojo. */
export const MARCA_REGLA = /^<!--\s*projects:regla\s+id=([a-z0-9][a-z0-9-]*)\s*-->\s*$/;

/** Cabecera del artefacto. Una línea, en comentario, al principio del cuerpo. */
export const MARCA_CABECERA = /^<!--\s*projects:constitucion\s+(.*?)\s*-->\s*$/;

/**
 * Superficies de instrucciones que el marco sabe emitir (D2).
 *
 * El artefacto no es «un archivo de Claude Code»: es LA PORCIÓN DEL MARCO, y se emite
 * una vez por cada superficie que el repositorio declara. Un solo generador, N
 * salidas, todas con la misma cabecera y el mismo cuerpo: la divergencia entre
 * superficies queda imposible por construcción, no por disciplina.
 *
 * LÍMITE DECLARADO: el marco cubre las superficies que el repositorio DECLARA. Una
 * herramienta nueva que alguien enchufe sin declararla queda fuera y el marco no
 * puede verla.
 */
export const SUPERFICIES = {
  "claude-code": {
    ruta: ".projects/AGENTS-marco.md",
    preambulo: "",
    // La cadena de carga, eslabón por eslabón. Se verifica el IMPORT (`@ruta`), no la
    // mención en prosa: nombrar un archivo no lo carga, y un enlace roto es
    // indistinguible de que la regla no exista.
    cadena: [
      { archivo: "CLAUDE.md", importa: "AGENTS.md" },
      { archivo: "AGENTS.md", importa: ".projects/AGENTS-marco.md" },
    ],
  },
  cursor: {
    ruta: ".cursor/rules/00-marco.mdc",
    // Esta superficie lee markdown plano y no expande imports: por eso el mismo
    // cuerpo viaja completo, con el frontmatter que la hace de carga siempre.
    preambulo: [
      "---",
      "description: Porcion del marco Projects. Reglas de ingenieria del area. Generado: no editar a mano.",
      'globs: "**/*"',
      "alwaysApply: true",
      "---",
      "",
    ].join("\n"),
    cadena: [],
    // La carga la hace el propio frontmatter, que este generador escribe y la
    // comparación de contenido verifica. Que el producto respete `alwaysApply` es
    // comportamiento de un tercero: el marco no puede verificarlo desde CI y lo dice.
    cadena_por_frontmatter: true,
  },
};

/** Las dos superficies que hoy declara el área: los `AGENTS.md` dicen en su primera
 *  línea «agentes de IA (Claude Code, Cursor)». Un repo puede declarar otra lista en
 *  `.projects-valores.json`; lo que no puede es declarar cero. */
export const SUPERFICIES_POR_DEFECTO = ["claude-code", "cursor"];

// ---------------------------------------------------------------------------
// Normalización y comparación
// ---------------------------------------------------------------------------

/**
 * Forma canónica para comparar: fin de línea LF, sin espacios al final de línea y con
 * un único salto final. Es exactamente el scenario «una diferencia que no es
 * divergencia»: lo que aporta el entorno de trabajo no se reporta.
 *
 * Lo que esta función NO absorbe, y hay que decirlo: un reflujo de prosa del
 * formateador del proyecto. Para eso el artefacto va al `.prettierignore`, igual que
 * los artefactos del CLI de OpenSpec.
 */
export function normalizar(texto) {
  const lineas = String(texto ?? "")
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((linea) => linea.replace(/[ \t]+$/, ""));
  return `${lineas.join("\n").replace(/\n+$/, "")}\n`;
}

/** Compara `X.Y.Z`. Devuelve -1, 0 o 1. Un componente no numérico cuenta como 0: el
 *  extractor no adivina, y una versión ilegible se reporta arriba como divergencia. */
export function compararSemver(a, b) {
  const partes = (v) =>
    String(v ?? "")
      .trim()
      .replace(/^v/i, "")
      .split(/[.+-]/)
      .slice(0, 3)
      .map((n) => (/^\d+$/.test(n) ? Number(n) : 0));
  const [x, y] = [partes(a), partes(b)];
  for (let i = 0; i < 3; i++) {
    const izq = x[i] ?? 0;
    const der = y[i] ?? 0;
    if (izq !== der) return izq < der ? -1 : 1;
  }
  return 0;
}

function esFecha(valor) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(valor ?? "")) && !Number.isNaN(Date.parse(`${valor}T00:00:00Z`));
}

function aFecha(valor) {
  return new Date(`${valor}T00:00:00Z`);
}

/** Escapa una ruta para meterla en una expresión regular. */
export function escaparRegex(texto) {
  return String(texto).replace(/[.*+?^${}()|[\]\\]/g, (c) => `\\${c}`);
}

// ---------------------------------------------------------------------------
// El canónico
// ---------------------------------------------------------------------------

/**
 * Lee el canónico completo: manifiesto + secciones + cuerpo + sello.
 *
 * Las secciones se derivan del ÁRBOL (`NN-nombre.md`, en orden) y no de una lista en
 * el manifiesto que alguien tendría que acordarse de actualizar. Un archivo nuevo
 * entra al render por existir; un archivo sin prefijo numérico no entra, y eso es
 * deliberado: el orden de la constitución no puede depender del orden de lectura del
 * sistema de archivos.
 */
export function leerCanonico(dir) {
  const rutaManifiesto = join(dir, "manifiesto.json");
  if (!existsSync(rutaManifiesto)) {
    throw new Error(`no existe el manifiesto del canonico en ${rutaManifiesto}`);
  }
  const manifiesto = JSON.parse(readFileSync(rutaManifiesto, "utf8"));

  const archivos = readdirSync(dir)
    .filter((nombre) => /^\d{2}-.+\.md$/.test(nombre))
    .sort();
  if (archivos.length === 0) {
    throw new Error(`el canonico en ${dir} no tiene ninguna seccion NN-*.md: no hay texto que publicar`);
  }

  const secciones = archivos.map((archivo) => ({
    archivo,
    texto: normalizar(readFileSync(join(dir, archivo), "utf8")),
  }));

  const problemas = validarManifiesto(manifiesto);
  const versiones = Array.isArray(manifiesto.versiones) ? manifiesto.versiones : [];
  const actual = versiones[versiones.length - 1] ?? {};

  const cuerpo = `${secciones.map((s) => s.texto.replace(/\n$/, "")).join("\n\n")}\n`;
  const lineas = cuerpo.split("\n").length - 1;

  // El artefacto no ahorra un token de contexto: partirlo organiza, no reduce. El
  // presupuesto es lo único que contiene el incentivo de que agregar una regla al
  // marco sea barato mientras el costo lo paga cada sesión de cada repo.
  const presupuesto = Number(manifiesto.presupuesto_lineas ?? 0);
  if (presupuesto > 0 && lineas > presupuesto) {
    problemas.push(
      `el canonico tiene ${lineas} lineas y el presupuesto declarado es ${presupuesto}: subir el presupuesto es una decision, no un ajuste`,
    );
  }

  const sello = createHash("sha256");
  sello.update(`${actual.version ?? ""}\n`);
  for (const seccion of secciones) sello.update(`${seccion.archivo}\n${seccion.texto}`);

  return {
    manifiesto,
    versiones,
    version: actual.version ?? "",
    publicada: actual.publicada ?? "",
    exigible_desde: actual.exigible_desde ?? "",
    secciones,
    cuerpo,
    lineas,
    sha: sello.digest("hex").slice(0, 12),
    ids: idsDeReglas(cuerpo),
    piso_permisos: Array.isArray(manifiesto.piso_permisos) ? manifiesto.piso_permisos : [],
    problemas,
  };
}

/**
 * Valida el manifiesto, incluida **la ventana de gracia** (D6): un release que exige
 * una regla nueva el mismo día que la publica pone en rojo a un consumidor que no
 * hizo nada. Esa garantía viaja acá, dentro de la action, y no en un paso de CI
 * aparte: así se verifica sola en cada corrida de cada repo.
 *
 * ESTE ES EL ÚNICO CALENDARIO. Hubo un segundo, embebido en el `marco-ci.yml` que
 * heredan todos los consumidores, y la auditoría del 2026-08-20 midió que no tenía
 * verificación ninguna: una entrada con CERO días de gracia y `urgente: false`
 * —publicada = exigible = hoy— se aceptaba sin una queja y salía roja el mismo día,
 * mientras el comentario de arriba afirmaba «verificada por el CI de Projects». Y
 * `grep -rn 'manifiesto.json' .github/workflows/` no daba una coincidencia: ningún
 * workflow leía este archivo. La copia se borró; queda el calendario que sí se mide.
 *
 * LÍMITE DECLARADO, y quedó medido: la ventana se calcula entre dos campos
 * DECLARADOS, no contra el día real en que `v1` se mueve. Un release que se corre una
 * semana sin refrescar `publicada` deja la ventana efectiva en 21 días y esta función
 * sigue en verde, porque los dos números que compara siguen a 28. Por eso quien mueve
 * el tag refresca las fechas EN EL MISMO PR: no hay check que pueda suplirlo desde
 * acá, y decirlo es mejor que afirmar una garantía que la función no da.
 */
export function validarManifiesto(manifiesto) {
  const problemas = [];
  problemas.push(...validarPiso(manifiesto?.piso_permisos));
  const versiones = manifiesto?.versiones;
  if (!Array.isArray(versiones) || versiones.length === 0) {
    problemas.push("el manifiesto no declara ninguna version en `versiones`");
    return problemas;
  }

  let anterior = null;
  for (const entrada of versiones) {
    const etiqueta = entrada?.version ?? "(sin version)";
    if (!/^\d+\.\d+\.\d+$/.test(String(entrada?.version ?? ""))) {
      problemas.push(`la version "${etiqueta}" no es semver X.Y.Z`);
    }
    if (!esFecha(entrada?.publicada)) {
      problemas.push(`la version ${etiqueta} no declara \`publicada\` como AAAA-MM-DD`);
    }
    if (!esFecha(entrada?.exigible_desde)) {
      problemas.push(`la version ${etiqueta} no declara \`exigible_desde\` como AAAA-MM-DD`);
    }
    if (esFecha(entrada?.publicada) && esFecha(entrada?.exigible_desde)) {
      const dias = Math.round((aFecha(entrada.exigible_desde) - aFecha(entrada.publicada)) / MS_POR_DIA);
      if (dias < DIAS_DE_GRACIA_MINIMOS && entrada.urgente !== true) {
        problemas.push(
          `la version ${etiqueta} deja ${dias} dias de gracia y el minimo es ${DIAS_DE_GRACIA_MINIMOS}: el dia que se publica una regla nadie se pone rojo. Si el cambio es urgente de verdad, se declara \`"urgente": true\` y se justifica en la seccion "Para consumidores" del CHANGELOG`,
        );
      }
    }
    if (anterior && compararSemver(entrada?.version, anterior) <= 0) {
      problemas.push(`las versiones del manifiesto no estan en orden creciente: ${anterior} precede a ${etiqueta}`);
    }
    anterior = entrada?.version;
  }
  return problemas;
}

/**
 * Valida el PISO RECOMENDADO de permisos del agente que declara el manifiesto.
 *
 * POR QUÉ EL PISO VIVE ACÁ Y SE MIDE ACÁ. Hasta el 2026-08-20 el marco lo declaraba
 * en este manifiesto y lo VERIFICABA con un `const PISO = [...]` literal, escrito a
 * mano dentro del paso de permisos del workflow reusable. Cero derivación, y las dos
 * contabilidades ya habían divergido en las DOS direcciones: el canónico declaraba
 * `Bash(pnpm build)` que el paso no miraba, y el paso exigía `openspec` que el
 * canónico no declaraba. Medido: mutando este piso a `["Bash(echo piso-mutado)"]` y
 * satisfaciéndolo al 100%, el paso seguía diciendo «5 item(s) del piso recomendado
 * sin cubrir», o sea seguía midiendo su propio arreglo. Es textualmente la doble
 * contabilidad que la propia constitución nombra, y ahí la declaración siempre
 * pierde contra el check: por eso ahora hay una sola fuente y el que la lee es el que
 * la transporta.
 *
 * CADA ÍTEM DECLARA TRES COSAS Y LAS TRES SON OBLIGATORIAS:
 *   · `nombre`  — cómo se lo nombra en el aviso ("el linter").
 *   · `entrada` — la entrada de allowlist que el marco RECOMIENDA, para pegar.
 *   · `cubre`   — la propiedad que se busca en el allowlist del proyecto. Se busca
 *                 la propiedad y no la línea exacta porque el nombre del script es
 *                 del proyecto (un filtro de paquete, un monorepo, otro runner).
 *
 * Y `cubre` tiene que estar DENTRO de `entrada`: es el único invariante que impide
 * que las dos mitades de la misma declaración deriven entre sí, que es la forma
 * chica del mismo problema que este arreglo vino a cerrar.
 */
export function validarPiso(piso) {
  if (piso === undefined) return [];
  if (!Array.isArray(piso)) {
    return ["`piso_permisos` del manifiesto no es una lista"];
  }
  const problemas = [];
  for (const [indice, item] of piso.entries()) {
    const donde = `el item #${indice + 1} de \`piso_permisos\``;
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      problemas.push(
        `${donde} no es un objeto { "nombre", "entrada", "cubre" }. Una lista de cadenas sueltas no dice QUE propiedad buscar en el allowlist del proyecto, y ahi es donde el piso declarado y el piso verificado se separaron`,
      );
      continue;
    }
    for (const campo of ["nombre", "entrada", "cubre"]) {
      if (typeof item[campo] !== "string" || item[campo].trim() === "") {
        problemas.push(`${donde} no declara \`${campo}\``);
      }
    }
    const entrada = String(item.entrada ?? "").toLowerCase();
    const cubre = String(item.cubre ?? "")
      .trim()
      .toLowerCase();
    if (cubre !== "" && entrada !== "" && !entrada.includes(cubre)) {
      problemas.push(
        `${donde} declara \`cubre\` = "${item.cubre}" y recomienda "${item.entrada}", que no lo contiene: el marco estaria recomendando una entrada distinta de la que verifica, que es la misma divergencia que este campo existe para cerrar`,
      );
    }
  }
  return problemas;
}

/**
 * Los ítems del piso que el allowlist del proyecto NO cubre.
 *
 * Se busca la PROPIEDAD (`cubre`) con bordes de palabra y no la línea exacta: el
 * nombre del script es del proyecto, así que `Bash(pnpm --filter api typecheck)`
 * cubre `typecheck` igual que `Bash(pnpm typecheck)`. Los bordes importan —un
 * `includes` pelado tomaría `eslint` por `lint` y devolvería un verde falso.
 *
 * El resultado es SIEMPRE aviso y jamás rojo, y la asimetría está escrita en el
 * propio manifiesto: un permiso de más es riesgo, uno de menos es fricción, y bajo
 * fricción la salida más barata es el `settings.local.json` que todos los repos
 * ignoran — o sea que un rojo acá empujaría el allowlist FUERA de la revisión
 * cruzada, causando la evasión que el mecanismo quiere evitar.
 */
export function revisarPiso(piso, allowlist) {
  const todo = (Array.isArray(allowlist) ? allowlist : [])
    .filter((entrada) => typeof entrada === "string")
    .join("\n")
    .toLowerCase();
  return (Array.isArray(piso) ? piso : []).filter((item) => {
    const cubre = String(item?.cubre ?? "")
      .trim()
      .toLowerCase();
    if (cubre === "") return true;
    return !new RegExp(`(^|[^a-z0-9])${escaparRegex(cubre)}([^a-z0-9]|$)`).test(todo);
  });
}

/** Los ids de regla del cuerpo, en orden de aparición. */
export function idsDeReglas(cuerpo) {
  const ids = [];
  for (const linea of String(cuerpo ?? "").split("\n")) {
    const encontrado = linea.match(MARCA_REGLA);
    if (encontrado) ids.push(encontrado[1]);
  }
  return ids;
}

/**
 * La versión pendiente más vieja: si el consumidor acumuló varios releases sin
 * adoptar, manda la fecha de la MÁS VIEJA, no la del último. Si no hay artefacto,
 * pendiente es todo.
 */
export function versionPendienteMasVieja(versiones, versionDeclarada) {
  const pendientes = versiones.filter(
    (entrada) => !versionDeclarada || compararSemver(entrada.version, versionDeclarada) > 0,
  );
  return pendientes[0] ?? null;
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

/** Un marcador del scaffold sin resolver, en cualquier parte de un texto. */
export const MARCADOR_SIN_RESOLVER = /\{\{([A-Z0-9_]+)\}\}/;

/**
 * ¿El valor declarado FALTA de verdad?
 *
 * Vacío, nulo, cadena en blanco... y el caso que se comió esta guarda durante toda
 * su primera versión: **un valor cuyo texto es el propio marcador**. Es exactamente
 * lo que `plantilla/.projects-valores.json` entrega tal cual, en 15 entradas
 * (`"PROYECTO": "{{PROYECTO}}"`), o sea el estado normal de un proyecto recién
 * scaffoldeado. Medido el 2026-08-20 antes de este arreglo: copiando ese archivo sin
 * tocarlo, el modo escribir salía **exit 0** y el artefacto quedaba con 27 líneas de
 * dobles llaves, el título incluido, y el modo verificar afirmaba «está al día en 2
 * superficie(s)». El rojo llegaba igual, pero de OTRO check («Sin marcadores del
 * scaffold sin resolver»): la propiedad estaba cubierta por casualidad de vecindad y
 * no por el guardrail que la declara, y la evidencia que el `tasks.md` pide
 * (`grep -cE '\{\{[A-Z0-9_]+\}\}'` → 0) daba 27.
 *
 * Se rechaza el marcador en CUALQUIER posición del valor y no solo cuando el valor es
 * el marcador entero: `"org-{{ORG}}-sufijo"` deja el artefacto igual de a medias.
 */
export function valorFaltante(valor) {
  if (valor === undefined || valor === null) return true;
  const texto = String(valor).trim();
  return texto === "" || MARCADOR_SIN_RESOLVER.test(texto);
}

/**
 * Sustituye `{{PLACEHOLDER}}` por su valor. El render es obligatorio, no cosmético:
 * sin él el artefacto llevaría dobles llaves y pondría rojo el check «Sin marcadores
 * del scaffold sin resolver» del propio consumidor.
 *
 * Devuelve además los faltantes (rojo: el artefacto quedaría con marcadores) y los
 * valores declarados que el canónico ya no usa (aviso: la misma doctrina de la
 * exclusión muerta, en chico).
 */
export function sustituir(texto, valores) {
  const usados = new Set();
  const faltantes = new Set();
  const salida = String(texto ?? "").replace(/\{\{([A-Z0-9_]+)\}\}/g, (marca, nombre) => {
    const valor = valores?.[nombre];
    if (valorFaltante(valor)) {
      faltantes.add(nombre);
      return marca;
    }
    usados.add(nombre);
    return String(valor);
  });
  const sinUsar = Object.keys(valores ?? {}).filter((nombre) => /^[A-Z0-9_]+$/.test(nombre) && !usados.has(nombre));
  return { texto: salida, faltantes: [...faltantes].sort(), sinUsar: sinUsar.sort() };
}

/** Los marcadores que quedaron sin resolver en un texto ya renderizado, ordenados y
 *  sin repetir. Es el CINTURÓN de la guarda de arriba: la contabilidad de faltantes
 *  puede aflojarse con un cambio de una línea, y esto vuelve a mirar el cuerpo que
 *  está a punto de sellarse. La propiedad prometida es «el artefacto nunca sale con
 *  dobles llaves», no «la contabilidad dio bien». */
export function marcadoresDe(texto) {
  const encontrados = new Set();
  for (const [, nombre] of String(texto ?? "").matchAll(/\{\{([A-Z0-9_]+)\}\}/g)) encontrados.add(nombre);
  return [...encontrados].sort();
}

/** Sangría con la que se imprime el desvío: pegado a la regla, y anidado dentro de la
 *  viñeta si la regla es una viñeta. */
function sangriaDe(linea) {
  const bruta = String(linea ?? "");
  const espacios = (bruta.match(/^[ \t]*/) ?? [""])[0];
  if (/^[ \t]*([-*+]|\d+\.)\s/.test(bruta)) return `${espacios}  `;
  return espacios;
}

/** El bloque de texto de un desvío, tal como se imprime en el artefacto. */
export function bloqueDesvio(desvio, sangria = "") {
  const lineas = [
    `⛔ **DESVÍO DECLARADO** — la regla \`${desvio.regla}\` NO rige en este repositorio.`,
    `Aprobado por ${desvio.aprobado_por} el ${desvio.fecha}.`,
    ...String(desvio.motivo).split(/\r?\n/).map((linea, i) => (i === 0 ? `**Motivo:** ${linea}` : linea)),
  ];
  return lineas.map((linea) => `${sangria}> ${linea}`.replace(/[ \t]+$/, ""));
}

/**
 * Imprime cada desvío DENTRO del artefacto que los agentes cargan, en el lugar de la
 * regla que anula (D4). No en un JSON al costado y no sesenta líneas más abajo: la
 * premisa del problema es que una regla que el agente no lee no existe, y una
 * excepción que el agente no lee produce algo peor —un agente cumpliendo a rajatabla
 * una regla que el proyecto ya anuló, o leyendo prohibición y autorización sin saber
 * cuál manda.
 *
 * El bloque de una regla va desde su marca hasta la marca siguiente, el próximo
 * encabezado o el próximo separador; el desvío entra después de su última línea con
 * contenido.
 */
export function insertarDesvios(cuerpo, desvios) {
  const porRegla = new Map();
  for (const desvio of desvios ?? []) {
    if (!porRegla.has(desvio.regla)) porRegla.set(desvio.regla, []);
    porRegla.get(desvio.regla).push(desvio);
  }
  if (porRegla.size === 0) return String(cuerpo);

  const lineas = String(cuerpo).split("\n");
  const salida = [];
  for (let i = 0; i < lineas.length; i++) {
    salida.push(lineas[i]);
    const marca = lineas[i].match(MARCA_REGLA);
    if (!marca || !porRegla.has(marca[1])) continue;

    let fin = i;
    let primeraConContenido = "";
    for (let j = i + 1; j < lineas.length; j++) {
      const linea = lineas[j];
      if (MARCA_REGLA.test(linea)) break;
      if (/^#{1,6}\s/.test(linea)) break;
      if (/^(-{3,}|\*{3,}|_{3,})\s*$/.test(linea)) break;
      if (linea.trim() !== "") {
        fin = j;
        if (!primeraConContenido) primeraConContenido = linea;
      }
    }
    for (let k = i + 1; k <= fin; k++) salida.push(lineas[k]);
    salida.push("");
    for (const desvio of porRegla.get(marca[1])) {
      salida.push(...bloqueDesvio(desvio, sangriaDe(primeraConContenido)));
    }
    i = fin;
  }
  return salida.join("\n");
}

/** Cabecera de una línea. Greppable en disco para el check, y descartada por el
 *  lector antes de que el sello gaste tokens del agente. */
export function cabecera({ version, sha, superficie }) {
  return `<!-- projects:constitucion version=${version} sha=${sha} superficie=${superficie} -->`;
}

/** Lee la cabecera de un artefacto en disco. Devuelve null si no la tiene. */
export function leerCabecera(texto) {
  for (const linea of String(texto ?? "").split("\n")) {
    const encontrado = linea.match(MARCA_CABECERA);
    if (!encontrado) continue;
    const atributos = {};
    for (const par of encontrado[1].split(/\s+/)) {
      const [clave, ...resto] = par.split("=");
      if (clave && resto.length > 0) atributos[clave] = resto.join("=");
    }
    return atributos;
  }
  return null;
}

/** El artefacto completo de una superficie: preámbulo (si lo tiene), cabecera, cuerpo. */
export function artefactoDe({ superficie, cuerpo, version, sha }) {
  const definicion = SUPERFICIES[superficie];
  const sello = cabecera({ version, sha, superficie });
  return normalizar(`${definicion.preambulo}${sello}\n\n${cuerpo}`);
}

/** Render completo: sustituye valores y después imprime los desvíos. Ese orden
 *  importa: el texto de un desvío es del proyecto y no se toca.
 *
 *  `marcadoresSinResolver` se mide sobre el texto YA SUSTITUIDO y antes de insertar
 *  los desvíos, a propósito: el motivo de un desvío es prosa del proyecto y si
 *  alguien escribe dobles llaves ahí no es asunto del marco. */
export function renderizar({ canonico, valores, desvios }) {
  const sustituido = sustituir(canonico.cuerpo, valores);
  const cuerpo = normalizar(insertarDesvios(sustituido.texto, desvios));
  return {
    cuerpo,
    faltantes: sustituido.faltantes,
    sinUsar: sustituido.sinUsar,
    marcadoresSinResolver: marcadoresDe(sustituido.texto),
  };
}

// ---------------------------------------------------------------------------
// Cadena de carga
// ---------------------------------------------------------------------------

/** Quita bloques cercados y código en línea: una referencia dentro de un ejemplo de
 *  código no se resuelve, así que no cuenta como cadena de carga. */
export function despojarCodigo(texto) {
  return String(texto ?? "")
    .replace(/^[ \t]*(```+|~~~+)[\s\S]*?^[ \t]*\1[ \t]*$/gm, "")
    .replace(/`[^`\n]*`/g, "");
}

/** ¿El archivo IMPORTA la ruta? Se busca la forma `@ruta`, no la mención en prosa:
 *  nombrar un archivo no lo carga. */
export function importa(texto, ruta) {
  const patron = new RegExp(`(^|[\\s(])@${escaparRegex(ruta)}(?=$|[\\s.,;:)\\]])`, "m");
  return patron.test(despojarCodigo(texto));
}

// ---------------------------------------------------------------------------
// Desvíos
// ---------------------------------------------------------------------------

/**
 * Clasifica los desvíos declarados. Un desvío es legal —la rigidez sin salida no
 * produce cumplimiento, produce evasión— pero tiene que nombrar QUÉ anula, su
 * aprobador, su fecha y su motivo escrito. Y **un desvío cuya regla ya no existe es
 * rojo**: es la doctrina de la excepción muerta del marco, aplicada acá.
 *
 * DOS CLASES, Y RECONOCERLAS ES LO QUE PERMITIÓ CABLEAR ESTA ACTION. Un
 * `.projects-desvios.json` real declara desvíos de `regla` (un id del canónico) y de
 * `permiso` (una entrada exacta del allowlist del agente). Esta función solo conocía
 * la primera clase, así que un desvío de permiso perfectamente formado salía
 * `desvio-sin-regla`: enchufar la action a un carril del consumidor la habría puesto
 * roja sobre un archivo correcto, y ese falso rojo era el último obstáculo para que
 * el camino rojo del desvío muerto —que acá SÍ funciona, medido— fuera alcanzable en
 * el CI de alguien.
 *
 * EL REPARTO CON EL PASO DEL ALLOWLIST, y es una frontera y no un solapamiento: acá
 * se valida la FORMA de las dos clases (que nombre una sola cosa, con motivo,
 * aprobador y fecha) y el VENCIMIENTO de las de regla, porque el canónico está acá.
 * Que un desvío de permiso absorba un hallazgo de verdad —y el rojo si no absorbe
 * nada— lo decide el paso «Permisos del agente sin escritura», que es el único que
 * ve el allowlist y sus hallazgos. La forma se valida en UN solo lado a propósito.
 */
export function clasificarDesvios(declarados, idsDelCanonico) {
  const validos = [];
  const permisos = [];
  const problemas = [];
  const vistos = new Set();
  const conocidos = new Set(idsDelCanonico);

  for (const [indice, bruto] of (declarados ?? []).entries()) {
    const desvio = {
      regla: String(bruto?.regla ?? "").trim(),
      permiso: String(bruto?.permiso ?? "").trim(),
      fecha: String(bruto?.fecha ?? "").trim(),
      aprobado_por: String(bruto?.aprobado_por ?? "").trim(),
      motivo: String(bruto?.motivo ?? "").trim(),
    };
    const donde = desvio.regla
      ? `el desvio de \`${desvio.regla}\``
      : desvio.permiso
        ? `el desvio del permiso \`${desvio.permiso}\``
        : `el desvio #${indice + 1}`;

    if (!desvio.regla && !desvio.permiso) {
      problemas.push({
        nivel: "error",
        codigo: "desvio-sin-objeto",
        mensaje: `${donde} no nombra que anula. Cada entrada nombra UNA cosa: \`regla\` (un id del canonico del marco) o \`permiso\` (una entrada exacta del allowlist del agente)`,
      });
      continue;
    }
    if (desvio.regla && desvio.permiso) {
      problemas.push({
        nivel: "error",
        codigo: "desvio-ambiguo",
        mensaje: `${donde} nombra tambien un permiso: una entrada anula UNA cosa, si no el motivo escrito deja de decir de que es. Arreglo: partilo en dos entradas`,
      });
      continue;
    }

    // Los de PERMISO se validan en su forma y se pasan al paso del allowlist. No van
    // al artefacto: anulan una entrada de configuración, no una regla que un agente
    // lea, así que imprimirlos pegados a una regla no tendría dónde.
    if (desvio.permiso) {
      const faltante = !desvio.motivo
        ? { codigo: "desvio-sin-motivo", que: "no tiene motivo escrito. Un desvio sin motivo es un permiso ancho sin razon escrita" }
        : !desvio.aprobado_por
          ? { codigo: "desvio-sin-aprobador", que: "no dice quien lo aprobo" }
          : !esFecha(desvio.fecha)
            ? { codigo: "desvio-sin-fecha", que: "no tiene fecha AAAA-MM-DD" }
            : null;
      if (faltante) {
        problemas.push({ nivel: "error", codigo: faltante.codigo, mensaje: `${donde} ${faltante.que}` });
        continue;
      }
      permisos.push(desvio);
      continue;
    }

    if (!conocidos.has(desvio.regla)) {
      problemas.push({
        nivel: "error",
        codigo: "desvio-muerto",
        mensaje: `desvio muerto: la regla \`${desvio.regla}\` ya no existe en el canonico del marco. El motivo que tenia escrito era: "${desvio.motivo || "(vacio)"}". Arreglo: borrar el desvio de .projects-desvios.json, o —si la necesidad sigue viva— nombrar la regla vigente que lo reemplaza`,
      });
      continue;
    }
    if (!desvio.motivo) {
      problemas.push({
        nivel: "error",
        codigo: "desvio-sin-motivo",
        mensaje: `${donde} no tiene motivo escrito. Un desvio sin motivo es una regla borrada sin dejar rastro`,
      });
      continue;
    }
    if (!desvio.aprobado_por) {
      problemas.push({
        nivel: "error",
        codigo: "desvio-sin-aprobador",
        mensaje: `${donde} no dice quien lo aprobo`,
      });
      continue;
    }
    if (!esFecha(desvio.fecha)) {
      problemas.push({
        nivel: "error",
        codigo: "desvio-sin-fecha",
        mensaje: `${donde} no tiene fecha AAAA-MM-DD`,
      });
      continue;
    }
    if (vistos.has(desvio.regla)) {
      problemas.push({
        nivel: "warning",
        codigo: "desvio-duplicado",
        mensaje: `hay mas de un desvio para la regla \`${desvio.regla}\`: los dos se imprimen, y dos excepciones sobre la misma regla se leen peor que una`,
      });
    }
    vistos.add(desvio.regla);
    validos.push(desvio);
  }
  return { validos, permisos, problemas };
}

// ---------------------------------------------------------------------------
// Verificación
// ---------------------------------------------------------------------------

/** Primeras diferencias entre dos textos ya normalizados, con número de línea. */
export function diffLineas(esperado, actual, tope = 12) {
  const a = String(esperado).split("\n");
  const b = String(actual).split("\n");
  const salida = [];
  for (let i = 0; i < Math.max(a.length, b.length) && salida.length < tope; i++) {
    if (a[i] === b[i]) continue;
    salida.push(`linea ${i + 1}: marco   | ${a[i] ?? "(no existe)"}`);
    salida.push(`linea ${i + 1}: en repo | ${b[i] ?? "(no existe)"}`);
  }
  return salida;
}

/**
 * Verifica el repositorio consumidor contra el canónico. Función pura sobre un lector
 * inyectable: el banco de pruebas la ejercita sin tocar el disco del repo y `hoy`
 * entra por parámetro (nunca por entorno).
 *
 * `valoresPresentes: false` es el caso del repo QUE TODAVÍA NO ADOPTÓ, y tiene su
 * propia rama porque las dos formas de equivocarse son simétricas y las dos ya
 * pasaron. Sin el archivo de valores no hay render posible, así que la verificación
 * completa no se puede hacer; pero devolver un rojo seco el primer día es el mismo
 * error que el verde mudo, con el signo cambiado: estrena un endurecimiento sin la
 * ventana de aviso que el propio marco exige. Acá la ausencia entra por la MISMA
 * puerta que el artefacto faltante: aviso hasta el `exigible_desde` de la versión
 * pendiente más vieja, rojo desde esa fecha, y nunca silencio.
 */
export function verificar({ canonico, valores, desvios, superficies, hoy, leer, valoresPresentes = true, allowlist = null }) {
  const hallazgos = [];
  const artefactos = [];

  for (const problema of canonico.problemas) {
    hallazgos.push({ nivel: "error", codigo: "canonico-invalido", mensaje: problema });
  }
  for (const entrada of canonico.versiones) {
    if (entrada.urgente === true) {
      hallazgos.push({
        nivel: "warning",
        codigo: "version-urgente",
        mensaje: `la version ${entrada.version} del canonico acorto la ventana de gracia con "urgente": true (exigible desde ${entrada.exigible_desde}). La puerta de atras existe y se nombra: su justificacion esta en la seccion "Para consumidores" del CHANGELOG de Projects`,
      });
    }
  }

  // EL PISO RECOMENDADO DE PERMISOS DEL AGENTE, medido acá porque acá está su única
  // declaración (el manifiesto del canónico, que viaja con esta action). El paso del
  // workflow reusable tenía su propia copia literal y las dos ya habían divergido en
  // las dos direcciones; ahora el que declara es el que mide.
  //
  // Va ANTES de cualquier salida temprana a propósito: el allowlist del agente no
  // depende de que el proyecto haya llenado su archivo de valores, así que saltearlo
  // en la rama del repo sin adoptar sería otra medición que no se hace y no se dice.
  //
  // El allowlist ausente no se declara sano: sale ::notice:: en vez de callarse. El
  // aviso por «este repo no versiona el allowlist de su agente» es del paso «Permisos
  // del agente sin escritura», que es el único que puede preguntarle a git si el
  // archivo está rastreado.
  let pisoSinCubrir = [];
  if (allowlist === null) {
    hallazgos.push({
      nivel: "notice",
      codigo: "piso-no-medible",
      mensaje:
        "no se pudo leer .claude/settings.json, asi que el piso recomendado de permisos del agente no se midio en esta corrida. No es un veredicto sobre el allowlist: es que no habia allowlist para mirar",
    });
  } else {
    pisoSinCubrir = revisarPiso(canonico.piso_permisos, allowlist);
    for (const item of pisoSinCubrir) {
      hallazgos.push({
        nivel: "warning",
        codigo: "piso-sin-cubrir",
        mensaje: `el allowlist del agente no autoriza ${item.nombre}: es uno de los comandos que las propias reglas del marco exigen correr ANTES de cada push, asi que el agente los va a pedir de a uno en cada sesion. Es AVISO y nunca fallo, a proposito: un permiso de mas es riesgo, uno de menos es friccion, y bajo friccion la salida mas barata es el settings.local.json que el .gitignore excluye — un rojo aca empujaria el allowlist FUERA de la revision cruzada. Arreglo: agrega la entrada del comando que este repo usa, p. ej. "${item.entrada}"`,
      });
    }
  }

  const veredicto = () => {
    const rojos = hallazgos.filter((h) => h.nivel === "error");
    const avisos = hallazgos.filter((h) => h.nivel === "warning");
    return {
      hallazgos,
      artefactos,
      pisoSinCubrir,
      rojos: rojos.length,
      avisos: avisos.length,
      estado: rojos.length > 0 ? "rojo" : avisos.length > 0 ? "aviso" : "al-dia",
    };
  };

  // EL REPO QUE TODAVÍA NO ADOPTÓ. Se sale acá y no más abajo porque sin valores todo
  // placeholder faltaría y el resultado sería una lluvia de rojos secos que dicen lo
  // mismo una vez por marcador, tapando el único hallazgo que importa y sin la ventana
  // que le corresponde.
  if (!valoresPresentes) {
    hallazgos.push(
      hallazgoPorFecha({
        codigo: "valores-faltantes",
        ruta: ".projects-valores.json",
        pendiente: versionPendienteMasVieja(canonico.versiones, null),
        hoy,
        mensaje:
          "falta .projects-valores.json: sin los valores de este proyecto el marco no puede renderizar su porcion de la constitucion, asi que los agentes de este repo estan trabajando sin las reglas del area. Es un archivo de ESTE repo y vive fuera de .projects/ a proposito (.projects/ es desechable y el modo escribir lo reemplaza entero)",
      }),
    );
    return veredicto();
  }

  const declaradas = superficies.filter((nombre) => {
    if (SUPERFICIES[nombre]) return true;
    hallazgos.push({
      nivel: "error",
      codigo: "superficie-desconocida",
      mensaje: `este repo declara la superficie de agente "${nombre}" y el marco no sabe emitirla. Las que sabe: ${Object.keys(SUPERFICIES).join(", ")}. Una superficie nueva es un change de Projects, no una config`,
    });
    return false;
  });
  if (declaradas.length === 0) {
    hallazgos.push({
      nivel: "error",
      codigo: "sin-superficies",
      mensaje:
        "este repo no declara ninguna superficie de instrucciones para sus agentes: no hay a donde entregar las reglas del marco. Se declaran en `superficies` de .projects-valores.json",
    });
  }

  const clasificados = clasificarDesvios(desvios, canonico.ids);
  hallazgos.push(...clasificados.problemas);
  for (const desvio of clasificados.validos) {
    // El motivo se reimprime en CADA corrida a propósito: un motivo que envejeció mal
    // tiene que quedar a la vista en vez de fosilizarse en un JSON que nadie abre.
    hallazgos.push({
      nivel: "notice",
      codigo: "desvio-declarado",
      mensaje: `desvio vigente sobre \`${desvio.regla}\` (aprobado por ${desvio.aprobado_por} el ${desvio.fecha}): ${desvio.motivo}`,
    });
  }
  for (const desvio of clasificados.permisos) {
    hallazgos.push({
      nivel: "notice",
      codigo: "desvio-de-permiso",
      mensaje: `desvio vigente sobre el permiso \`${desvio.permiso}\` (aprobado por ${desvio.aprobado_por} el ${desvio.fecha}): ${desvio.motivo}. Su forma se valida aca; que absorba un hallazgo de verdad —y el rojo si no absorbe ninguno— lo decide el paso "Permisos del agente sin escritura", que es el que ve el allowlist`,
    });
  }

  const render = renderizar({ canonico, valores, desvios: clasificados.validos });
  if (render.faltantes.length > 0) {
    hallazgos.push({
      nivel: "error",
      codigo: "placeholder-sin-valor",
      mensaje: `.projects-valores.json no tiene valor para: ${render.faltantes.join(", ")}. Sin eso el artefacto sale con dobles llaves. Un valor cuyo TEXTO es el propio marcador —lo que el scaffold entrega tal cual— NO cuenta como valor: hay que reemplazarlo por el del proyecto`,
    });
  }
  // CINTURÓN, no redundancia: la contabilidad de faltantes se aflojó una vez con un
  // cambio de una línea y el artefacto salió con 27 marcadores en verde. Esto vuelve a
  // mirar el cuerpo que está a punto de sellarse, así que la propiedad prometida («el
  // artefacto nunca sale con dobles llaves») se sostiene incluso si la contabilidad
  // miente.
  if (render.marcadoresSinResolver.length > 0) {
    hallazgos.push({
      nivel: "error",
      codigo: "artefacto-con-marcadores",
      mensaje: `el cuerpo renderizado todavia lleva marcadores del scaffold sin resolver: ${render.marcadoresSinResolver.map((n) => `{{${n}}}`).join(", ")}. El artefacto no se emite asi: un artefacto a medias pone rojo el check "Sin marcadores del scaffold sin resolver" del propio consumidor y entrega reglas con agujeros a sus agentes`,
    });
  }
  if (render.sinUsar.length > 0) {
    hallazgos.push({
      nivel: "warning",
      codigo: "valor-sin-usar",
      mensaje: `.projects-valores.json declara valores que el canonico ya no usa: ${render.sinUsar.join(", ")}. Sobra, igual que una exclusion muerta`,
    });
  }

  for (const nombre of declaradas) {
    const definicion = SUPERFICIES[nombre];
    const esperado = artefactoDe({
      superficie: nombre,
      cuerpo: render.cuerpo,
      version: canonico.version,
      sha: canonico.sha,
    });
    artefactos.push({ superficie: nombre, ruta: definicion.ruta, esperado });

    const presente = leer(definicion.ruta);
    if (presente === null) {
      const pendiente = versionPendienteMasVieja(canonico.versiones, null);
      hallazgos.push(hallazgoPorFecha({
        codigo: "artefacto-faltante",
        ruta: definicion.ruta,
        pendiente,
        hoy,
        mensaje: `falta ${definicion.ruta}: la superficie "${nombre}" que este repo declara no recibe ninguna regla del marco`,
      }));
      continue;
    }

    const cab = leerCabecera(presente);
    if (!cab || !cab.version) {
      hallazgos.push({
        nivel: "error",
        codigo: "artefacto-sin-cabecera",
        mensaje: `${definicion.ruta} existe y no declara version del marco (falta la cabecera "projects:constitucion"). O no lo genero el marco, o se le borro la primera linea: en los dos casos no se puede decir contra que version compararlo`,
      });
      continue;
    }

    const comparacion = compararSemver(cab.version, canonico.version);
    if (comparacion < 0) {
      const pendiente = versionPendienteMasVieja(canonico.versiones, cab.version);
      hallazgos.push(hallazgoPorFecha({
        codigo: "artefacto-atrasado",
        ruta: definicion.ruta,
        pendiente,
        hoy,
        mensaje: `${definicion.ruta} declara la version ${cab.version} y el marco publica la ${canonico.version}: le faltan reglas`,
      }));
      continue;
    }
    // ESTA RAMA ES LA EVASION CONOCIDA, y el mensaje tiene que decirlo. Subir a mano
    // la version de la cabecera a una que esta copia del marco no conoce hace que el
    // cuerpo NO se compare contra nada: se puede borrar cualquier regla del artefacto
    // y el check queda verde para siempre. Reproducido por codigo de salida el
    // 2026-08-19 (cuerpo editado + `version=9.9.9` -> exit 0).
    //
    // Sigue siendo AVISO y no rojo porque la causa benigna existe de verdad: un
    // consumidor pinado a un SHA viejo corre una copia del marco anterior al
    // artefacto, y ahi «no puedo verificar» no es «alguien violo la regla».
    //
    // COMO SE CIERRA, y es decision humana pendiente (no la tomo yo): `GITHUB_ACTION_REF`
    // dice con que ref se resolvio ESTA action. Si se resolvio con el tag movil (`v1`)
    // no hay pin que explique un artefacto mas nuevo, asi que ahi el caso es rojo; con
    // un SHA o un tag viejo, sigue siendo aviso. Es una linea de env en el action.yml
    // mas una rama aca. Hasta entonces, el mensaje NO ofrece la explicacion tranquila
    // como si fuera la unica.
    if (comparacion > 0) {
      hallazgos.push({
        nivel: "warning",
        codigo: "artefacto-adelantado",
        mensaje: `${definicion.ruta} declara la version ${cab.version} y esta copia del marco es la ${canonico.version}: no se puede verificar el contenido contra un canonico que no se tiene, asi que el cuerpo NO se comparo. Dos causas posibles y hay que distinguirlas a ojo: el pipeline corre una copia del marco mas vieja que el artefacto (un pin a un SHA o a un tag viejo), o alguien subio la version de la cabecera a mano para que el cuerpo dejara de compararse. Arreglo: revisa el pin del uses: de este job y, si esta en el tag movil, regenera el artefacto con el modo escribir`,
      });
      continue;
    }

    if (normalizar(presente) !== esperado) {
      hallazgos.push({
        nivel: "error",
        codigo: "artefacto-divergente",
        mensaje: `${definicion.ruta} difiere del texto que el marco publica para la version ${canonico.version}. Lo propio de este proyecto va en su propio AGENTS.md; una diferencia legitima se declara como desvio con su motivo en .projects-desvios.json`,
        detalle: diffLineas(esperado, normalizar(presente)),
      });
    }

    for (const eslabon of definicion.cadena) {
      const contenido = leer(eslabon.archivo);
      if (contenido === null) {
        hallazgos.push({
          nivel: "error",
          codigo: "cadena-rota",
          mensaje: `la superficie "${nombre}" carga sus reglas por ${eslabon.archivo} y ese archivo no existe: la cadena hasta ${definicion.ruta} esta cortada`,
        });
        continue;
      }
      if (!importa(contenido, eslabon.importa)) {
        hallazgos.push({
          nivel: "error",
          codigo: "cadena-rota",
          mensaje: `${eslabon.archivo} no importa @${eslabon.importa} (una mencion en prosa o dentro de un bloque de codigo no carga nada). Sin ese eslabon el artefacto existe y ningun agente lo lee, que es indistinguible de que la regla nunca haya existido`,
        });
      }
    }
    if (definicion.cadena_por_frontmatter) {
      hallazgos.push({
        nivel: "notice",
        codigo: "cadena-por-frontmatter",
        mensaje: `la superficie "${nombre}" carga por el frontmatter de ${definicion.ruta}, que el marco escribe y esta comparacion verifica. Que la herramienta respete ese frontmatter es comportamiento de un tercero y el marco no puede verificarlo desde CI`,
      });
    }
  }

  return veredicto();
}

/**
 * El rojo lo dispara una FECHA, no el release (D6). Entre `publicada` y
 * `exigible_desde` un artefacto ausente o atrasado sale `::warning::` con el arreglo;
 * desde `exigible_desde`, `::error::`. Nunca verde: el ausente no tiene rama
 * silenciosa de «no aplica».
 */
export function hallazgoPorFecha({ codigo, ruta, pendiente, hoy, mensaje }) {
  const fecha = pendiente?.exigible_desde;
  const exigible = esFecha(fecha) ? aFecha(fecha) <= hoy : true;
  const cola = esFecha(fecha)
    ? exigible
      ? `Es exigible desde ${fecha}, asi que ya es un fallo`
      : `Hasta el ${fecha} esto es un aviso; desde esa fecha el pipeline falla`
    : "No se pudo leer la fecha exigible del marco, asi que se toma el lado estricto";
  return {
    nivel: exigible ? "error" : "warning",
    codigo,
    mensaje: `${mensaje}. ${cola}. Arreglo: correr el modo escribir de esta action (el PR semanal de actualizacion lo hace solo) o bajar el artefacto corregido que este job sube`,
  };
}

// ---------------------------------------------------------------------------
// Entrada/salida y reporte
// ---------------------------------------------------------------------------

function leerJson(ruta, etiqueta) {
  if (!existsSync(ruta)) return { presente: false, datos: null, error: null };
  try {
    return { presente: true, datos: JSON.parse(readFileSync(ruta, "utf8")), error: null };
  } catch (error) {
    return { presente: true, datos: null, error: `${etiqueta} no es JSON valido: ${error.message}` };
  }
}

function escribirArchivo(ruta, contenido) {
  mkdirSync(dirname(ruta), { recursive: true });
  writeFileSync(ruta, contenido, "utf8");
}

function emitir(hallazgo) {
  for (const linea of hallazgo.detalle ?? []) console.log(`    ${linea}`);
  const unaLinea = String(hallazgo.mensaje).replace(/\r?\n/g, " · ");
  console.log(`::${hallazgo.nivel}::${unaLinea}`);
}

function salida(clave, valor) {
  const destino = process.env.GITHUB_OUTPUT;
  if (!destino) return;
  appendFileSync(destino, `${clave}=${String(valor).replace(/\r?\n/g, " ")}\n`);
}

function resumen(lineas) {
  const destino = process.env.GITHUB_STEP_SUMMARY;
  if (!destino) return;
  appendFileSync(destino, `${lineas.join("\n")}\n`);
}

/**
 * Punto de entrada. Devuelve el código de salida en vez de llamar a `process.exit`
 * para que el banco de pruebas lo ejercite en proceso.
 */
export function main(env = process.env) {
  const aqui = dirname(fileURLToPath(import.meta.url));
  const modo = (env.CONSTITUCION_MODO || "verificar").trim();
  const dirCanonico = resolve(env.CONSTITUCION_CANONICO || join(aqui, "canonico"));
  const raiz = resolve(env.CONSTITUCION_RAIZ || process.cwd());
  const rutaValores = resolve(raiz, env.CONSTITUCION_VALORES || ".projects-valores.json");
  const rutaDesvios = resolve(raiz, env.CONSTITUCION_DESVIOS || ".projects-desvios.json");
  const rutaAllowlist = resolve(raiz, env.CONSTITUCION_ALLOWLIST || ".claude/settings.json");

  if (modo !== "verificar" && modo !== "escribir") {
    console.log(`::error::modo desconocido "${modo}": los modos son "verificar" y "escribir"`);
    return 1;
  }

  let canonico;
  try {
    canonico = leerCanonico(dirCanonico);
  } catch (error) {
    console.log(`::error::no se pudo leer el canonico del marco: ${error.message}`);
    return 1;
  }

  const valoresLeidos = leerJson(rutaValores, "el archivo de valores");
  const desviosLeidos = leerJson(rutaDesvios, "el archivo de desvios");
  for (const problema of [valoresLeidos.error, desviosLeidos.error]) {
    if (problema) {
      console.log(`::error::${problema}`);
      return 1;
    }
  }
  // ASIMÉTRICO, y la asimetría es la propiedad. En modo ESCRIBIR la ausencia del
  // archivo de valores es un rojo seco y tiene que serlo: no hay con qué renderizar, y
  // un artefacto con dobles llaves sin resolver es peor que ninguno. En modo
  // VERIFICAR la ausencia es un ATRASO DE ADOPCIÓN y entra por la ventana de gracia,
  // igual que el artefacto faltante: hasta el 2026-08-20 esta rama abortaba con exit 1
  // ANTES de ramificar por modo, así que el repo que todavía no adoptó recibía un rojo
  // seco el primer día —un endurecimiento estrenado sin modo aviso, contra la regla
  // del propio marco— y, en el otro extremo, el escritor que debería depositar el
  // artefacto por primera vez también fallaba.
  if (!valoresLeidos.presente && modo === "escribir") {
    console.log(
      `::error::falta ${relative(raiz, rutaValores) || rutaValores}: sin los valores del proyecto no hay render posible, y un artefacto con dobles llaves sin resolver es peor que ninguno. Es un archivo de ESTE repo y vive fuera de .projects/ a proposito: .projects/ es desechable y el modo escribir lo reemplaza entero`,
    );
    return 1;
  }

  const valores = valoresLeidos.datos ?? {};
  const desvios = Array.isArray(desviosLeidos.datos?.desvios) ? desviosLeidos.datos.desvios : [];
  // La clave AUSENTE y la clave DECLARADA VACÍA no son lo mismo, y confundirlas
  // volvía inalcanzable desde la action el hallazgo `sin-superficies`: un repo que
  // escribía `"superficies": []` caía al default del marco, así que el opt-out
  // explícito quedaba indistinguible de «todavía no llené el archivo». Ausente =
  // default del marco (el repo no dijo nada todavía). Declarada vacía = lo que el
  // repo dijo, y lo dicho es rojo: cero superficies es declarar que las reglas del
  // marco no llegan a ninguna parte.
  const superficies = (
    env.CONSTITUCION_SUPERFICIES
      ? env.CONSTITUCION_SUPERFICIES.split(",")
      : Array.isArray(valores.superficies)
        ? valores.superficies
        : SUPERFICIES_POR_DEFECTO
  )
    .map((nombre) => String(nombre).trim())
    .filter(Boolean);

  salida("version", canonico.version);
  salida("exigible_desde", canonico.exigible_desde);
  salida("piso_permisos", JSON.stringify(canonico.piso_permisos));
  salida("superficies", superficies.join(","));

  // El allowlist del agente. `null` significa «no había nada que mirar» y NO «está
  // sano»: `verificar()` lo dice con un ::notice:: en vez de callarse.
  const allowlistLeido = leerJson(rutaAllowlist, "el allowlist del agente");
  let allowlist = null;
  if (allowlistLeido.error) {
    console.log(
      `::warning::${allowlistLeido.error}. El rojo por el JSON roto lo da el paso "Permisos del agente sin escritura"; aca solo se pierde la medicion del piso recomendado`,
    );
  } else if (allowlistLeido.presente) {
    const permitidos = allowlistLeido.datos?.permissions?.allow;
    allowlist = Array.isArray(permitidos) ? permitidos.filter((x) => typeof x === "string") : [];
  }

  const resultado = verificar({
    canonico,
    valores,
    valoresPresentes: valoresLeidos.presente,
    desvios,
    superficies,
    allowlist,
    hoy: new Date(),
    leer: (ruta) => {
      const completa = join(raiz, ruta);
      return existsSync(completa) && statSync(completa).isFile() ? readFileSync(completa, "utf8") : null;
    },
  });

  if (modo === "escribir") {
    // Modo escribir: emite los artefactos y nada más. NO toca el `AGENTS.md` ni el
    // `CLAUDE.md` del proyecto —esos son del proyecto— y no borra `.projects/`: el
    // directorio es desechable por contrato, pero borrar de verdad convierte un
    // render en una operación destructiva. Lo que sobra se avisa.
    // `artefacto-con-marcadores` está en la lista y es el cinturón que faltaba: la
    // razón por la que el modo escribir emitía artefactos con 27 dobles llaves en
    // verde era que ningún hallazgo lo bloqueaba.
    const bloqueantes = resultado.hallazgos.filter(
      (h) =>
        h.nivel === "error" &&
        [
          "canonico-invalido",
          "placeholder-sin-valor",
          "artefacto-con-marcadores",
          "desvio-muerto",
          "desvio-sin-motivo",
          "desvio-sin-objeto",
          "desvio-ambiguo",
          "desvio-sin-aprobador",
          "desvio-sin-fecha",
          "superficie-desconocida",
          "sin-superficies",
        ].includes(h.codigo),
    );
    for (const hallazgo of bloqueantes) emitir(hallazgo);
    if (bloqueantes.length > 0) {
      console.log("::error::no se escribio nada: los datos de entrada no permiten un render correcto (arriba, uno por linea)");
      return 1;
    }

    const escritos = [];
    for (const artefacto of resultado.artefactos) {
      escribirArchivo(join(raiz, artefacto.ruta), artefacto.esperado);
      escritos.push(artefacto.ruta);
      console.log(`escrito ${artefacto.ruta} (version ${canonico.version}, sha ${canonico.sha})`);
    }
    const conocidas = new Set(resultado.artefactos.map((a) => a.ruta));
    for (const sobrante of extrasEnProjects(raiz, conocidas)) {
      console.log(
        `::warning::${sobrante} esta dentro de .projects/ y no lo emite el marco. Ese directorio es desechable: lo que este repo necesite conservar va afuera`,
      );
    }
    salida("estado", "escrito");
    salida("artefactos", escritos.join(","));
    resumen([
      `### Constitucion del marco — escrita (version ${canonico.version})`,
      "",
      ...escritos.map((ruta) => `- \`${ruta}\``),
    ]);
    return 0;
  }

  for (const hallazgo of resultado.hallazgos) emitir(hallazgo);

  // El artefacto al día se deja en disco SIEMPRE, no solo cuando hay rojo: el
  // workflow lo sube como artifact y un repo sin el escritor puede aplicarlo a mano.
  const dirCorregido = resolve(
    env.CONSTITUCION_SALIDA_CORREGIDA || join(env.RUNNER_TEMP || raiz, ".projects-al-dia"),
  );
  for (const artefacto of resultado.artefactos) {
    escribirArchivo(join(dirCorregido, artefacto.ruta), artefacto.esperado);
  }

  salida("estado", resultado.estado);
  salida("rojos", resultado.rojos);
  salida("avisos", resultado.avisos);
  salida("corregidos", dirCorregido);
  salida("artefactos", resultado.artefactos.map((a) => a.ruta).join(","));

  const filas = resultado.hallazgos
    .filter((h) => h.nivel !== "notice")
    .map((h) => `| ${h.nivel} | \`${h.codigo}\` | ${h.mensaje.replace(/\|/g, "/")} |`);
  const motivos = resultado.hallazgos
    .filter((h) => h.codigo === "desvio-declarado")
    .map((h) => `- ${h.mensaje}`);
  resumen([
    `### Constitucion del marco — version ${canonico.version} (exigible desde ${canonico.exigible_desde})`,
    "",
    `Estado: **${resultado.estado}** · superficies: ${superficies.join(", ") || "(ninguna)"} · canonico: ${canonico.lineas} lineas, ${canonico.ids.length} reglas`,
    "",
    ...(filas.length > 0 ? ["| nivel | codigo | detalle |", "| --- | --- | --- |", ...filas, ""] : []),
    ...(motivos.length > 0 ? ["**Desvios declarados** (se reimprimen en cada corrida):", "", ...motivos, ""] : []),
    `Artefacto al dia disponible en \`${dirCorregido}\`.`,
  ]);

  if (resultado.estado === "al-dia") {
    console.log(
      `la porcion del marco esta al dia en ${resultado.artefactos.length} superficie(s): version ${canonico.version}, sha ${canonico.sha}`,
    );
  }
  return resultado.rojos > 0 ? 1 : 0;
}

/** Archivos dentro de `.projects/` que el marco no emite. */
function extrasEnProjects(raiz, conocidas) {
  const base = join(raiz, ".projects");
  if (!existsSync(base)) return [];
  const sobrantes = [];
  const recorrer = (dir) => {
    for (const entrada of readdirSync(dir, { withFileTypes: true })) {
      const completa = join(dir, entrada.name);
      if (entrada.isDirectory()) {
        recorrer(completa);
        continue;
      }
      const relativa = relative(raiz, completa).split("\\").join("/");
      if (!conocidas.has(relativa)) sobrantes.push(relativa);
    }
  };
  recorrer(base);
  return sobrantes;
}

const esteArchivo = realpathSync(fileURLToPath(import.meta.url));
const invocado = process.argv[1] ? realpathSync(process.argv[1]) : "";
if (esteArchivo === invocado) process.exit(main(process.env));
