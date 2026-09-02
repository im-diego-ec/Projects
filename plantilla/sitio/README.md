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

---

## Publicarlo: lo único que este repositorio no puede hacer solo

El proyecto ya trae todo lo necesario para publicarse en **Cloudflare Workers**:
la configuración (`wrangler.jsonc`) y el paso automático
(`.github/workflows/desplegar.yml`), que corre **solo cuando las verificaciones
terminan en verde** sobre la rama principal.

Lo que falta son **tres actos humanos** —abrir la cuenta, registrar el subdominio
y crear la credencial—, y por eso están
acá y no automatizadas: abrir una cuenta y crear una credencial. Se hacen **una
sola vez**.

> **Mientras no las hagas, nada se pone en rojo.** El paso de publicación sale
> con un aviso amarillo diciendo qué falta. Un rojo permanente por algo que
> todavía no configuraste enseña a ignorar los rojos, que es peor que no tener
> la compuerta.

### 1 · La cuenta · *3 minutos*

Entrá a [`dash.cloudflare.com/sign-up`](https://dash.cloudflare.com/sign-up) y
creá la cuenta. El plan gratuito alcanza de sobra para un sitio: los archivos de
tu sitio **no tienen límite de visitas** en ese plan.

Después copiá tu **Account ID**: está en el panel, en la barra lateral derecha
de la sección Workers, y es una tira de letras y números.

**Y aprovechá para registrar el subdominio ahora**, en **Workers & Pages →
Subdomain**: es el nombre que va en el medio de tu dirección
(`{{PROYECTO}}.<tu-subdominio>.workers.dev`), se elige una vez y no se puede
cambiar después.

> **Cloudflare no te lo va a pedir hasta la primera publicación**, así que si lo
> salteás acá, el paso 4 va a fallar con
> `you need to register a workers.dev subdomain` cuando ya creías haber terminado
> con lo humano. Es el tercero de los tres actos humanos de esta página, y el
> único que llega tarde.

### 2 · La credencial · *2 minutos*

En [`dash.cloudflare.com/profile/api-tokens`](https://dash.cloudflare.com/profile/api-tokens):

1. **Create Token**.
2. Elegí la plantilla **«Edit Cloudflare Workers»**. No armes uno a medida: esa
   plantilla ya tiene el permiso justo y nada más.
3. Creálo y **copiá el valor ahora**: Cloudflare no lo vuelve a mostrar.

> ⚠️ **Ojo con el token equivocado, que es el error más común.** Cloudflare
> ofrece varios tipos y el de **R2** —su almacenamiento de archivos— se parece
> bastante. Si la pantalla donde lo creaste te muestra además una *Access Key ID*
> y una *Secret Access Key*, ése es de R2 y **no sirve para publicar**: el
> despliegue va a fallar por permisos, con un error que no dice cuál era el
> correcto.

### 3 · Guardar las dos cosas en GitHub · *2 minutos*

En tu repositorio, **Settings → Secrets and variables → Actions → New repository
secret**, dos veces:

| Nombre | Valor |
| --- | --- |
| `CLOUDFLARE_API_TOKEN` | el que acabás de copiar |
| `CLOUDFLARE_ACCOUNT_ID` | el identificador de tu cuenta |

**No los pegues en ningún archivo del repositorio.** Un secreto en el código es
un secreto público: cualquiera que clone el proyecto se lo lleva, y cambiarlo
después no borra el que ya se vio.

### 4 · Publicar por primera vez · *1 minuto*

En la pestaña **Actions** de tu repositorio, elegí el workflow **desplegar** y
apretá **Run workflow**. La primera vez conviene a mano; de ahí en adelante corre
solo cada vez que las verificaciones quedan en verde sobre la rama principal.

**Cómo sabés que salió bien.** El paso de publicación imprime la dirección, y la
primera vez tiene la forma `https://{{PROYECTO}}.<tu-subdominio>.workers.dev`.
Abrila: tiene que verse tu sitio.

### 5 · Si sale rojo: los tres errores que vas a ver

Vienen de Cloudflare tal cual, sin traducir, y ninguno dice qué hacer. Esto sí:

| Lo que dice | Qué pasó | Cómo se arregla |
| --- | --- | --- |
| `Authentication failed (status: 400) [code: 9106]` | el token no vale: mal pegado, vencido, o revocado | creá otro con la plantilla «Edit Cloudflare Workers» y volvé a guardarlo en Secrets |
| `Invalid format for Authorization header [code: 6111]` | al pegarlo entró un espacio, un salto de línea o comillas | pegalo de nuevo, sin nada alrededor |
| `you need to register a workers.dev subdomain` | tu cuenta todavía no tiene subdominio | elegí uno en el panel, en **Workers & Pages → Subdomain**. Es una vez y es gratis |

Los dos primeros son del **token**; el tercero es de la **cuenta** y no tiene nada
que ver con este repositorio.

> **El tercero le pasa a quien salteó el subdominio en el paso 1.** Se arregla
> ahí mismo y se vuelve a publicar: no hay que rehacer nada.

### Antes de todo eso, podés ensayar sin publicar nada

```bash
pnpm -C {{PAQUETE_SITIO}} run build
pnpm -C {{PAQUETE_SITIO}} run desplegar:prueba
```

El segundo comando hace todo **menos subir**: lee la configuración, encuentra los
archivos y te dice cuánto pesaría la subida. No necesita cuenta ni credencial, y
sirve para saber que la configuración está bien antes de tener nada creado.
