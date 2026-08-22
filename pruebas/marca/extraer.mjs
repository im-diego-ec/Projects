// Lector del bloque de reglas de marca del andamio de ESLint.
//
// POR QUE SE LEE EN VEZ DE COPIARSE. Una copia de los selectores dentro de la
// prueba se desincroniza del andamio y a partir de ese momento la prueba pasa
// contra un archivo que ya no es el que se distribuye. Es el mismo motivo por el
// que pruebas/marco-ci/extraer.mjs lee marco-ci.yml en vez de duplicar sus
// pasos.
import fs from "node:fs";

/**
 * Recorta el texto de un array de JS empezando en su "[" y devuelve el indice
 * de su "]" de cierre. Salta strings, plantillas y comentarios de linea: los
 * propios selectores llevan corchetes (atributos de esquery, clases de
 * caracteres del regex) y contarlos en crudo da un cierre equivocado.
 */
function cierreDelArray(texto, abre) {
  let nivel = 0;
  let k = abre;
  while (k < texto.length) {
    const c = texto[k];
    if (c === "/" && texto[k + 1] === "/") {
      k = texto.indexOf("\n", k);
      if (k < 0) return -1;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") {
      const cierre = c;
      k++;
      while (k < texto.length && texto[k] !== cierre) {
        if (texto[k] === "\\") k++;
        k++;
      }
      k++;
      continue;
    }
    if (c === "[") nivel++;
    else if (c === "]" && --nivel === 0) return k;
    k++;
  }
  return -1;
}

/**
 * Devuelve { severidad, selectores, files, comentario } del bloque de marca del
 * andamio. Tira si el bloque no esta o si perdio su forma: "no encontre el
 * bloque" no puede reportarse como exito.
 */
export function leerBloqueDeMarca(ruta) {
  const texto = fs.readFileSync(ruta, "utf8");

  const glob = '"{{PAQUETE_WEB}}/src/**/*.{ts,tsx}"';
  const marca = '"no-restricted-syntax": [';
  const i = texto.indexOf(marca);
  if (i < 0) {
    throw new Error(
      `${ruta} no declara "no-restricted-syntax": el bloque de marca no esta o se renombro`,
    );
  }
  const abre = i + marca.length - 1;
  const fin = cierreDelArray(texto, abre);
  if (fin < 0) throw new Error(`${ruta}: el array de selectores no cierra`);

  // eval sobre nuestro propio archivo, con el proposito exacto de probar los
  // selectores TAL CUAL se distribuyen.
  const arr = eval(texto.slice(abre, fin + 1));
  if (!Array.isArray(arr) || arr.length < 2) {
    throw new Error(`${ruta}: el array de selectores quedo vacio`);
  }
  const [severidad, ...selectores] = arr;

  // El comentario que precede al bloque: ahi vive el mapa de cobertura contra
  // las reglas de la constitucion. Se toma desde el marcador [FRONT] IDENTIDAD
  // hasta el "files:" del bloque.
  //
  // El glob se busca DESPUES del comentario a proposito: el mismo glob aparece
  // dos veces mas arriba en el archivo (el bloque type-checked y el de
  // promesas del front), y tomar la primera aparicion daria por bueno un
  // bloque de marca SIN alcance propio, que es justo lo que hay que verificar.
  const iCom = texto.indexOf("// [FRONT] IDENTIDAD VISUAL DEL AREA");
  const iGlob = iCom >= 0 ? texto.indexOf(glob, iCom) : -1;
  const comentario = iCom >= 0 && iGlob > iCom ? texto.slice(iCom, iGlob) : "";

  return {
    severidad,
    selectores,
    tieneAlcancePropio: iGlob > 0 && iGlob < i,
    comentario,
  };
}

/**
 * Saca el regex embebido en un selector de esquery (la forma [attr=/RE/]).
 * Devuelve null cuando el selector no lleva regex, que es un caso legitimo
 * (p.ej. seleccionar un elemento JSX por nombre exacto).
 */
export function regexDelSelector(selector) {
  const i = selector.indexOf("=/");
  if (i < 0) return null;
  const j = selector.lastIndexOf("/]");
  if (j <= i) return null;
  return selector.slice(i + 2, j);
}
