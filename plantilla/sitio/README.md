# `{{PAQUETE_SITIO}}` — el sitio

Las páginas viven en `src/pages/`. Cada archivo es una página y su nombre es su
dirección: `precios.astro` se abre en `/precios`.

El código propio —lo que ordena, filtra o valida— va en `src/lib/`, en archivos
`.ts`, y **ahí es donde van las pruebas**. Las páginas se verifican compilando.

## Un hueco declarado, y conviene conocerlo

**Los archivos `.astro` no se verifican por tipos hoy.** La herramienta que hace
eso —`astro check`— **no soporta la versión de TypeScript que este marco fija**:
declara `typescript: ^5 || ^6` y el marco corre la 7. Medido el 2026-08-26 contra
`@astrojs/check` 0.9.10, que es la última publicada.

Qué cubre cada cosa hoy, para que nadie suponga de más:

| Comando | Qué cubre |
| --- | --- |
| `pnpm typecheck` (`tsc --noEmit`) | los `.ts` de `src/lib/` |
| `pnpm build` | que las páginas compilen — **pero no sus tipos**: medido, un error de tipos adentro de un `.astro` compila igual y sale con éxito |
| `pnpm test` | el código de `src/lib/` |

O sea: **un error de tipos adentro de una página no lo caza nadie**. Se destraba
solo cuando `astro check` soporte TypeScript 7. Mientras tanto, la lógica que
importe conviene sacarla de la página y ponerla en `src/lib/`, donde sí está
cubierta — y eso además es mejor diseño, así que la restricción empuja en la
dirección correcta.
