// ---------------------------------------------------------------------------
// UNA EXCEPCION QUE NO VENCE ES UN AGUJERO PERMANENTE.
//
// QUE ES ESTO. El lector UNICO de «que version declara este arbol como publicada» y el
// predicado UNICO de «esta declaracion ya vencio». Lo usan tres bancos que hasta hoy no se
// hablaban, y los tres tienen listas que existen por una VENTANA y no para siempre:
//
//   · `pruebas/andamio/pinado.test.mjs`, cuya excepcion de `@v1` sobrevive hasta que el marco
//     decida retirar el tag (lo leia con su propia copia del regex del CHANGELOG);
//   · `pruebas/andamio/actions-alcanzables.test.mjs`, cuyas excepciones son actions publicadas
//     que ningun `uses:` invoca;
//   · `pruebas/docs/cobertura-de-requirements.test.mjs`, cuyas filas «sin destino» son
//     requirements verificables que nadie tiene anotados como trabajo.
//
// DE DONDE VIENE. Del porte de Rigel (2.5.0, change `el-ambiente-se-exige`, commits fa84c09 y
// 69f512a): las excepciones de su banco de actions alcanzables declaran `vigenteEn`, y el dia
// que el CHANGELOG corta otra version el banco se pone rojo. Antes, su caso solo cobraba si el
// release cableaba la pieza y se olvidaba de sacar la excepcion; si no la cableaba, la
// excepcion vivia para siempre. En el release 2.5.0 las dos excepciones vencieron y el banco
// las cobro.
//
// POR QUE UN SOLO LECTOR. Alla el mismo lector estaba copiado en dos bancos con un comentario
// que decia «es el mismo a proposito». Aca rige el requirement de `los-bancos-dicen-por-que`:
// un predicado que vive en dos lugares se ata por comportamiento, o no se copia. Dos lectores
// podrian vencer una excepcion en un momento y otra en otro sobre el MISMO CHANGELOG.
//
// LO QUE ESTO NO DECIDE, escrito para que nadie lo lea de mas: si la excepcion sigue siendo
// correcta. Eso lo decide quien corta la version, con dos salidas y ninguna es el olvido —cerrar
// lo que la excepcion tapaba y borrarla, o mover `vigenteEn` a mano, que es una decision que
// alguien firma—.
// ---------------------------------------------------------------------------

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** La forma de una version en una declaracion de vigencia: `1.9.6`, sin la `v`. */
export const FORMA_DE_VERSION = /^\d+\.\d+\.\d+$/;

/** La version que este arbol declara publicada: el primer `## [X.Y.Z]` del CHANGELOG, sin `v`.
 *
 *  `## [No publicado]` no matchea a proposito: lo que vence una excepcion es CORTAR una
 *  version, no juntar cambios para la siguiente. Un CHANGELOG sin ninguna entrada numerada es
 *  un error y no «nada vencido»: sin version no hay con que comparar, y devolver algo por
 *  defecto seria el fail-open que el marco persigue. */
export function versionPublicada(raiz = RAIZ) {
  const texto = fs.readFileSync(path.join(raiz, "CHANGELOG.md"), "utf8");
  const m = texto.match(/^## \[(\d+\.\d+\.\d+)\]/m);
  if (!m) {
    throw new Error(
      "CHANGELOG.md no tiene ninguna entrada `## [X.Y.Z]`: sin una version publicada no hay contra que vencer " +
        "una excepcion, y leer eso como «nada vencido» seria un verde que no midio nada",
    );
  }
  return m[1];
}

/** Si una declaracion de vigencia ya no vale para la version del arbol.
 *
 *  Una vigencia AUSENTE o MAL ESCRITA cuenta como vencida, y no es un detalle: una excepcion
 *  sin fecha de salida es justo la que este modulo existe para cobrar. */
export function vencida(vigenteEn, version) {
  const v = String(vigenteEn ?? "");
  return !FORMA_DE_VERSION.test(v) || v !== version;
}
