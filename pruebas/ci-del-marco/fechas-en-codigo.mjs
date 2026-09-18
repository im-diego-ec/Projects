// LA FECHA LITERAL EN UNA LINEA DE CODIGO, SIN MIRAR COMO SE LLAMA LA VARIABLE.
//
// POR QUE EXISTE. Las dos defensas que impiden que vuelva una ventana de gracia
// (`ventanas-con-dueno.test.mjs` y el caso «el comparador no tiene ninguna amnistia
// con fecha» de `actions/cobertura-diff/pruebas/cobertura-total.test.mjs`) la
// buscaban por el NOMBRE: una constante en MAYUSCULAS que dijera VENTANA, GRACIA,
// HASTA o EXIGIBLE. La revision adversarial del porte (hallazgo FO-H1) midio cuatro
// formas reales que ese patron no ve —un camelCase como el `ventanaHasta` que el
// comparador uso por dentro, un nombre sin esas palabras, un .ts del andamio y una
// comparacion escrita directo en un `run:`— y con cualquiera de ellas la compuerta
// pasaba sobre una lista vacia. El nombre lo elige quien escribe la ventana; la
// fecha no la puede esconder.
//
// QUE ES "LINEA DE CODIGO". Toda linea que no EMPIEZA con la marca de comentario de
// su lenguaje. Un comentario al final de una linea de codigo NO se descarta: una
// fecha ahi se ve, y si es una cita se exceptua con su motivo. Es el lado
// conservador; lo contrario dejaria esconder un plazo detras de un `#`.
//
// LIMITES DECLARADOS, no olvidos:
//   - Solo la forma AAAA-MM-DD. Una fecha armada en tiempo de ejecucion
//     (`new Date(2031, 0, 1)`, una concatenacion) no se ve.
//   - Una linea que empieza con la marca de comentario se descarta entera, aunque
//     sea, por ejemplo, la continuacion de una multiplicacion que empieza con `*`.

/** AAAA-MM-DD, con limite de palabra para no morder un numero mas largo. */
export const FECHA_LITERAL = /\b20\d{2}-\d{2}-\d{2}\b/g;

/** Donde empieza un comentario de linea, por lenguaje. En los YAML entran tambien
 *  las marcas de JavaScript: los `run:` del marco llevan programas de node inline, y
 *  sus comentarios son `//`. En JavaScript el `#` NO es comentario (es un campo
 *  privado de una clase), salvo el `#!` del interprete. */
const COMENTARIO = {
  js: /^\s*(?:\/\/|\/\*|\*(?:\s|\/|$)|#!|<!--)/,
  yaml: /^\s*(?:#|\/\/|\/\*|\*(?:\s|\/|$))/,
  shell: /^\s*#/,
};

/** El lenguaje de un archivo por su nombre y, sin extension, por su interprete. */
export function lenguajeDe(ruta, texto = "") {
  if (/\.ya?ml$/i.test(ruta)) return "yaml";
  if (/\.sh$/i.test(ruta)) return "shell";
  if (/\.(?:mjs|cjs|js|jsx|ts|tsx|mts|cts|astro)$/i.test(ruta)) return "js";
  const primera = texto.split(/\r?\n/, 1)[0] ?? "";
  if (/^#!.*\b(?:node|deno|bun)\b/.test(primera)) return "js";
  if (/^#!/.test(primera)) return "shell";
  return null;
}

/** Las fechas AAAA-MM-DD de las lineas de CODIGO de un texto, con su linea. */
export function fechasEnCodigo(texto, lenguaje) {
  const comentario = COMENTARIO[lenguaje];
  if (!comentario) throw new Error(`lenguaje desconocido: ${lenguaje}`);
  const salida = [];
  texto.split(/\r?\n/).forEach((linea, i) => {
    if (comentario.test(linea)) return;
    for (const m of linea.matchAll(FECHA_LITERAL)) {
      salida.push({ fecha: m[0], linea: i + 1, texto: linea.trim() });
    }
  });
  return salida;
}
