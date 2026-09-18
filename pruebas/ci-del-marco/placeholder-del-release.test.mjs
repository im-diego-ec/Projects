// El placeholder que la skill del release manda escribir pasa la compuerta del aviso.
//
//   node --test pruebas/ci-del-marco/placeholder-del-release.test.mjs
//
// POR QUE EXISTE. El paso 1 de `.claude/skills/projects-release/SKILL.md` manda insertar
// un `## [No publicado]` nuevo al cortar una version, y el bloque que lo dictaba nacia
// SIN `### Para consumidores` («Nada todavia.» y nada mas). Desde que la compuerta
// `herramientas/aviso-entra-en-el-mensaje.mjs` pone rojo esa ausencia, el documento que
// explica como se corta una version mandaba escribir un CHANGELOG que la compuerta del
// propio marco rechaza — y el rojo caia en el PR de release, el unico donde el texto ya
// es final. A Rigel —el marco del que Projects se bifurco— le paso exactamente eso con
// su 2.3.0, y lo cerro con este banco (commit caa6925).
//
// Arreglar la prosa no cierra la leccion: mañana alguien la reescribe y el defecto
// vuelve en el peor momento posible. Esto es el check que se pone rojo sin que nadie se
// acuerde.
//
// NO REIMPLEMENTA LA REGLA. El veredicto lo da `medir`, la misma funcion exportada que
// corre la compuerta en CI. Si la compuerta cambia de opinion sobre que exige de una
// seccion, este banco cambia con ella sin que nadie lo toque.
//
// A QUE SE AGARRA EL EXTRACTOR, y que pasa si el bloque se mueve:
//   · Barre TODAS las cercas de codigo del archivo (``` y ~~~, con o sin lenguaje) y se
//     queda con las que abren con un `## [<ENTRADA_SIN_PUBLICAR>]`. El ancla es la
//     constante que EXPORTA la compuerta, no una linea de prosa ni un numero de linea.
//   · Si el bloque se mueve dentro del archivo, o la cerca cambia de lenguaje: se
//     encuentra igual.
//   · Si el encabezado del placeholder se renombra, o alguien borra el bloque: se
//     encuentran CERO y el banco es ROJO. Un extractor que se pone verde por no haber
//     encontrado nada es el fail-open que este archivo existe para cerrar.
//
// RESIDUO DECLARADO: se miden TODOS los bloques que parecen el placeholder, no «el
// primero». Si algun dia la skill documenta a proposito un contraejemplo —«asi NO»— el
// banco lo va a poner rojo y habra que decidir. Es el lado correcto del error.

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { LIMITE_POR_DEFECTO, extraerParaConsumidores } from "../../actions/aviso-version/aviso-version.mjs";
import { ENTRADA_SIN_PUBLICAR, PLACEHOLDER_SIN_CAMBIOS, medir } from "../../herramientas/aviso-entra-en-el-mensaje.mjs";

const RAIZ = join(import.meta.dirname, "..", "..");
const SKILL_DEL_RELEASE = join(".claude", "skills", "projects-release", "SKILL.md");

/**
 * Todas las cercas de codigo de un texto markdown, con su linea de apertura.
 *
 * Cierra con una cerca del MISMO caracter y al menos tan larga como la que abrio
 * (CommonMark), asi que un ``` dentro de un bloque ```` no lo corta por la mitad. Se
 * tolera y se descuenta la sangria de hasta tres espacios que permite CommonMark.
 */
function cercas(texto) {
  const lineas = String(texto).split(/\r?\n/);
  const encontradas = [];
  let abierta = null;

  for (let i = 0; i < lineas.length; i += 1) {
    const m = lineas[i].match(/^(\s{0,3})(`{3,}|~{3,})\s*(\S*)/);
    if (abierta === null) {
      if (!m) continue;
      abierta = { linea: i + 1, sangria: m[1].length, caracter: m[2][0], largo: m[2].length, cuerpo: [] };
      continue;
    }
    const cierra = m && m[2][0] === abierta.caracter && m[2].length >= abierta.largo && !m[3];
    if (cierra) {
      encontradas.push({ ...abierta, contenido: abierta.cuerpo.join("\n") });
      abierta = null;
      continue;
    }
    abierta.cuerpo.push(lineas[i].slice(abierta.sangria));
  }
  // Una cerca sin cerrar es un archivo mal formado, no un bloque: se reporta igual para
  // que el caso de abajo la pueda contar en vez de perderla en silencio.
  if (abierta !== null) encontradas.push({ ...abierta, contenido: abierta.cuerpo.join("\n"), sinCerrar: true });
  return encontradas;
}

/** Las cercas cuyo contenido ABRE con el encabezado del placeholder. */
function bloquesDelPlaceholder(texto, entrada = ENTRADA_SIN_PUBLICAR) {
  const escapada = entrada.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const abre = new RegExp(`^##\\s+\\[${escapada}\\]`, "i");
  return cercas(texto).filter((c) => abre.test(c.contenido.replace(/^\s*\n/, "")));
}

const skill = readFileSync(join(RAIZ, SKILL_DEL_RELEASE), "utf8");

test("la skill del release dicta al menos un placeholder de [No publicado], y bien cerrado", () => {
  const bloques = bloquesDelPlaceholder(skill);
  assert.ok(
    bloques.length >= 1,
    `no se encontro ningun bloque que abra con "## [${ENTRADA_SIN_PUBLICAR}]" en ${SKILL_DEL_RELEASE}. Verde por ` +
      "no haber encontrado nada es el fail-open que este banco cierra: si el placeholder se renombro o se borro, " +
      "este archivo se actualiza; si sigue ahi con otra forma, el extractor esta roto",
  );
  for (const b of bloques) {
    assert.ok(!b.sinCerrar, `la cerca abierta en la linea ${b.linea} de ${SKILL_DEL_RELEASE} no cierra`);
  }
});

test("ROJO PRIMERO: el placeholder que la skill manda escribir pasa la compuerta del aviso", () => {
  const bloques = bloquesDelPlaceholder(skill);
  // Repetido a proposito: sin esto el `for` de abajo pasa VACIO cuando el ancla se rompe,
  // y este caso se pondria verde apoyado en que el otro sale rojo.
  assert.ok(bloques.length >= 1, "no hay ningun placeholder que medir (ver el caso de arriba)");

  for (const b of bloques) {
    // El bloque se mide TAL CUAL: `extraerSeccionVersion` corta la seccion en el `##`
    // siguiente, asi que el cuerpo de `[No publicado]` es el mismo con el resto del
    // archivo debajo o sin nada. Lo que se mide es exactamente lo que el paso 1 deja.
    const r = medir(b.contenido, LIMITE_POR_DEFECTO, {});
    assert.equal(r.sinCandidatos, false, `la compuerta no encontro nada que medir en el bloque de la linea ${b.linea}`);

    const propios = r.hallazgos.filter((h) => h.etiqueta === ENTRADA_SIN_PUBLICAR);
    assert.deepEqual(
      propios,
      [],
      `el bloque de la linea ${b.linea} de ${SKILL_DEL_RELEASE} manda escribir un [${ENTRADA_SIN_PUBLICAR}] que ` +
        `la compuerta del aviso RECHAZA (${propios.map((h) => h.motivo).join(", ")}). El PR de release va a salir ` +
        "rojo justo donde el texto ya es final. Arreglo: que el bloque del placeholder traiga su " +
        "`### Para consumidores` con el texto de PLACEHOLDER_SIN_CAMBIOS",
    );
  }
});

test("ROJO PRIMERO: el texto del placeholder es LITERAL el que reconoce el centinela", () => {
  // ESTE CASO ES EL QUE SOSTIENE AL CENTINELA. `esPlaceholderConCambios` pone rojo una
  // seccion cuyo «Para consumidores» siga siendo el texto de fabrica Y ya tenga
  // subsecciones de cambios. Para reconocerlo compara contra `PLACEHOLDER_SIN_CAMBIOS`.
  // Si la skill manda escribir OTRA frase —una reescritura de estilo alcanza—, el
  // centinela deja de reconocer lo que el paso 1 escribe y se apaga en silencio. Los
  // otros dos casos no lo cazan: una frase distinta pasa la compuerta igual. O sea que
  // este es el unico que ata las dos copias, y por eso la comparacion es literal.
  const bloques = bloquesDelPlaceholder(skill);
  assert.ok(bloques.length >= 1, "no hay ningun placeholder que medir (ver el primer caso)");

  for (const b of bloques) {
    const { encontrada, texto } = extraerParaConsumidores(b.contenido);
    assert.ok(encontrada, `el bloque de la linea ${b.linea} no tiene "### Para consumidores" (ver el caso anterior)`);
    assert.equal(
      texto,
      PLACEHOLDER_SIN_CAMBIOS,
      `el bloque de la linea ${b.linea} de ${SKILL_DEL_RELEASE} escribe un texto que el centinela de la compuerta ` +
        "NO reconoce como el de fabrica, asi que el centinela queda apagado. Arreglo: que el bloque diga " +
        `exactamente PLACEHOLDER_SIN_CAMBIOS ("${PLACEHOLDER_SIN_CAMBIOS}"), o cambiar la constante y este texto A LA VEZ`,
    );
  }
});
