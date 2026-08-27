/** Las entradas de un listado, ordenadas de la mas nueva a la mas vieja.
 *
 *  Es el ejemplo minimo de lo que SI se prueba en un sitio de contenido: las
 *  paginas `.astro` se verifican compilando, y lo que necesita pruebas es el
 *  codigo propio que decide que se muestra y en que orden.
 */
export interface Entrada {
  titulo: string;
  fecha: string;
}

export function masNuevasPrimero(entradas: Entrada[]): Entrada[] {
  return [...entradas].sort((a, b) => b.fecha.localeCompare(a.fecha));
}
