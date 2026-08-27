// {{PAQUETE_SITIO}}/vitest.config.ts
import { defineConfig } from "vitest/config";
import { coberturaDelMarco } from "../vitest.config.base.mjs";

/**
 * Igual que los demas paquetes: la cobertura se hereda de la raiz y no se
 * configura aca.
 *
 * QUE SE PRUEBA EN UN SITIO DE CONTENIDO, que no es obvio. Las paginas `.astro`
 * se compilan a HTML y no se prueban con vitest — lo que las verifica es que
 * `astro check` pase y que el sitio compile—. Lo que SI se prueba aca es el
 * codigo propio: lo que ordena las entradas de un blog, lo que arma el mapa del
 * sitio, lo que valida el formulario. Ese codigo vive en `src/lib/` y es el que
 * mide la cobertura.
 */
export default defineConfig({
  test: {
    environment: "node",
    ...coberturaDelMarco(),
  },
});
