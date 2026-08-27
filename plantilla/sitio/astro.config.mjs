// @ts-check
import { defineConfig } from "astro/config";

// LA CONFIGURACION MAS CHICA QUE SIRVE, y es a proposito.
//
// Astro manda CERO JavaScript al navegador por defecto: cada pagina se
// convierte en HTML y CSS, y nada mas. Eso es lo que hace que un sitio para
// leer abra al instante, y es la razon por la que esta forma existe al lado de
// la aplicacion con pantallas.
//
// Cuando una parte SI necesite ser interactiva —un buscador, un formulario— se
// mete solo ahi con una directiva `client:*` sobre ese componente. La pagina
// entera no paga por el pedacito que se mueve.
export default defineConfig({
  site: "https://{{DOMINIO_PROD}}",
});
