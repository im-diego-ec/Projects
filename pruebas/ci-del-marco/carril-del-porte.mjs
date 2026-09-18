// La guarda del carril del porte: el unico interruptor con el que un caso de banco puede
// quedar aplazado mientras el porte de Rigel no se integra, y la regla de que ese
// aplazamiento no llega a main. El porque, en carril-del-porte.test.mjs.
import { existsSync } from "node:fs";
import { join } from "node:path";

/** La carpeta de los carriles del porte: parches y fragmentos de CHANGELOG que la
 *  integracion funde y borra. */
export const CARPETA_DEL_PORTE = ".porte";

/** ¿La corrida mira un arbol que va a main, o que ya esta en main? Lo dicen las
 *  variables que GitHub Actions pone en todo paso: la base de un pull request y la rama
 *  de un push. Corrido a mano no hay ninguna, y la respuesta es no. */
export function destinoEsMain(env = process.env) {
  return env.GITHUB_BASE_REF === "main" || env.GITHUB_REF === "refs/heads/main";
}

/** ¿Un caso sigue aplazado por el porte? Solo si el archivo que lo aplaza existe Y la
 *  corrida no va a main. Camino a main nada se aplaza: si el archivo sigue ahi, el caso
 *  corre y dice si lo que aplazaba se hizo. */
export function pendienteDelPorte(raiz, rutaRelativa, env = process.env) {
  return existsSync(join(raiz, rutaRelativa)) && !destinoEsMain(env);
}

/** El hallazgo de `.porte/` en un arbol que va a main, o `null`. */
export function porteQueLlegaAMain(existe, env = process.env) {
  if (!existe || !destinoEsMain(env)) return null;
  return (
    `la carpeta ${CARPETA_DEL_PORTE}/ esta en un arbol que va a main. Es maquinaria de los carriles del porte ` +
    "(parches y fragmentos de CHANGELOG), y mientras exista hay casos de banco aplazados que nadie mira. " +
    `Arreglo: aplicar sus parches al CHANGELOG.md, fundir sus fragmentos en [No publicado] y borrar ${CARPETA_DEL_PORTE}/ ` +
    "en el mismo PR de integracion"
  );
}
