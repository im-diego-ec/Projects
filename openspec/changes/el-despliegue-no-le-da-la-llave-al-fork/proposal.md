---
artefacto: proposal
dri: Builder 1
aprueba: revision adversarial (desvio del marco: un solo mantenedor, ver AGENTS.md)
informado: PO / Builder 2
estado: en-ejecucion
---

# El despliegue no le da la llave al fork

## Por qué

**Un pull request desde un fork podía ejecutar su propio código con la credencial
que publica el sitio en producción.** Hallazgo C1 de la auditoría del porte, del
2026-09-17, y el primero de la lista por ser de seguridad. No es un porte de
Rigel: es un defecto propio de Projects. Rigel tiene el mismo hueco en su
`plantilla/.github/workflows/deploy.yml` (en `main` a `8e6487d`, líneas 130-133,
336-338 y 431-433: `conclusion == 'success' && head_branch == 'main'`, sin mirar
el evento ni el repositorio del commit), y queda anotado acá como dato para quien
mantenga Rigel: esta sesión no escribe en ese repositorio.

La cadena, medida sobre `plantilla/.github/workflows/desplegar.yml` en `fde8f4e`,
el commit sobre el que arranca este change (los números de línea son de esa
versión):

1. El workflow se dispara por `workflow_run` cuando termina el CI, con
   `branches: [main]` como único filtro de origen (`:34-41`). Ese filtro compara
   el `head_branch` del CI que terminó, y en un pull request desde un fork **ese
   nombre lo elige quien lo abre**: basta llamar `main` a la rama del fork.
2. El CI de ese pull request termina en verde: el workflow de CI de un pull
   request lo escribe el propio pull request.
3. El `if` del job `dev` solo miraba `conclusion == 'success'` (`:116-119`).
4. El job traía el árbol de `head_sha` —el commit del fork— (`:173`), corría
   `pnpm install` de ese código (`:202`) y ejecutaba `pnpm exec wrangler` con
   `CLOUDFLARE_API_TOKEN` en el entorno (`:224`, `:244`).
5. Ese token es **de toda la cuenta de Cloudflare** —el permiso de Workers no se
   puede acotar a un solo Worker, medido en la documentación de permisos de
   Cloudflare el 2026-09-17— y es el mismo que el job `produccion` usa para
   promover (`:482`, `:512`, `:531`). Solo `produccion` tenía environment
   (`:388`), sin exigir `main`, y `plantilla/sitio/README.md` mandaba a crear el
   secreto con **«New repository secret»**, o sea al alcance de cualquier job.

**En la versión publicada es peor.** De la 1.8.0 a la 1.9.6 el andamio reparte un
`desplegar.yml` de un solo job cuyo `if` es
`github.event_name == 'workflow_dispatch' || github.event.workflow_run.conclusion == 'success'`
y que hace `wrangler deploy` **directo a producción** con ese mismo disparador.

**Contradice el contrato que el marco ya tenía escrito.**
`openspec/specs/despliegue-ci/spec.md:40-50` pide que el Environment que resguarda
las credenciales de producción las haga inalcanzables desde cualquier otra rama.
El andamio las dejaba alcanzables desde cualquier fork.

**Y dos huecos más, del mismo tipo, que salieron cerrando el primero:**

- **OPS-04, un commit por paso.** Bajo `workflow_run`, `GITHUB_SHA` es la punta de
  `main` en el momento de la corrida, no lo que el CI midió. El job `dev` traía el
  árbol de `head_sha` y rotulaba la versión con `GITHUB_SHA` (`:245-247`), y el
  resumen mandaba a promover `GITHUB_SHA` (`:315`): si entraba otro merge mientras
  el CI corría, la versión quedaba con el nombre de un commit y el código de otro.
- **La casilla `version` de la promoción.** El job `produccion` traía el árbol de
  lo que una persona escribiera en esa casilla y corría su `pnpm install` al lado
  de la credencial. La política de rama de un environment mira la rama del
  **disparo** —que es `main`— y no el commit que se trae, así que una rama
  cualquiera llegaba a la credencial por la casilla con `sin_pasar_por_dev`
  marcada.

## Qué cambia

1. **El job `dev` exige, bajo `workflow_run`**, CI en verde, que lo haya disparado
   un `push`, a `main`, con el commit en **este** repositorio
   (`head_repository.full_name == github.repository`). **A mano**, que el disparo
   sea desde `main`.
2. **El job `produccion` exige también el disparo desde `main`**, y antes de traer
   nada comprueba que la versión pedida sea un commit completo **de la historia de
   `main`** (`compare/<version>...<punta>` en `ahead` o `identical`). El
   apartamiento `sin_pasar_por_dev` no saltea esta regla.
3. **Un job nuevo, `guardas`**, sin environment, sin permisos y sin traer el árbol:
   pone en **rojo** un disparo a mano desde otra rama —que si no terminaría gris y
   sin una palabra— y **avisa en amarillo** si el token está guardado como secreto
   del repositorio. No corre con el evento de un fork: **ningún job corre ahí**.
4. **La credencial vive en dos environments**, `dev` y `produccion`, cada uno
   limitado a `main`. El job `dev` declara `environment: dev`. Los dos llevan el
   mismo token porque Cloudflare no deja acotarlo más: separar credenciales exigiría
   una segunda cuenta de Cloudflare, que es una decisión de producto que este
   change no toma (queda escrita en el design).
5. **Un solo commit por corrida**: un primer paso `version` lo fija
   (`head_sha || github.sha`) y todo lo demás —el `ci-ok`, el checkout, la
   etiqueta, el resumen— lo lee de ahí.
6. **Ningún checkout deja el token del workflow en `.git/config`**
   (`persist-credentials: false`), porque el paso siguiente corre `pnpm install`
   del árbol traído.
7. **La guía lo dice**: el paso 4 de `plantilla/sitio/README.md` manda a los
   environments, con la excepción del repositorio privado en el plan gratuito
   —ahí no hay environments y el aviso amarillo queda como constancia—, y
   `docs/10-publicar.md` deja de mandar el token a los secretos del repositorio.
8. **Un banco que EVALÚA las condiciones** —`pruebas/andamio/la-llave-del-despliegue.test.mjs`
   con el evaluador `pruebas/andamio/expresiones.mjs`— contra doce eventos
   simulados, con el caso rojo demostrado contra las condiciones reales de la
   1.9.6 y del job `dev` anterior, y una mutación por cláusula.

## Impacto en los consumidores

**Distribución.** Lo que arregla el defecto es **scaffold**
(`plantilla/.github/workflows/desplegar.yml`, `plantilla/sitio/README.md`): se
copia una vez al crear el proyecto y **no viaja** con el bump. El spec
(`despliegue-ci`), la página `docs/10-publicar.md` y los bancos son **canónicos**
del marco. No se toca nada **referenciado** ni **regenerado**.

**Contrato: PATCH, de seguridad.** Ningún `input`, `secret`, `output`, nombre de
job publicado ni permiso de un workflow reusable cambia. Un consumidor que mergea
el PR de bump **no recibe** este arreglo ni ningún rojo nuevo: justamente por eso
el arreglo manual tiene que estar escrito donde ese PR lo muestra.

**Los tres consumidores reales, todos en `@v1.9.6`:**

| Consumidor | ¿Tiene `desplegar.yml`? | Qué le pasa |
|---|---|---|
| `im-diego-ec/plantilla-sitio` (público) | **sí** —según la medición del porte; esta sesión no abrió ese repositorio—, y si nació de la 1.8.0 a la 1.9.6 es la versión de un solo job que publica directo a producción | **Expuesto** mientras tenga el token cargado: es público, así que cualquiera puede abrir un pull request desde un fork. Necesita el parche manual del CHANGELOG |
| `im-diego-ec/custodia-bingo` (privado) | no | nada |
| `im-diego-ec/plantilla-aplicacion` (público) | no | nada |

Esta sesión **no escribe en esos repositorios** (regla de AGENTS.md): el parche
queda escrito en el fragmento de CHANGELOG de este change, con el paso de revisar
en Actions si alguna corrida vino de un fork y rotar el token si la hubo.

**Para un proyecto nuevo generado desde acá:** publica igual que antes desde
`main`, pero el paso 4 de la guía cuesta unos minutos más (dos environments en vez
de dos secretos sueltos), y **un disparo a mano desde otra rama ya no sube a DEV**:
termina en rojo diciendo por qué. El spec vivo admitía subir a DEV desde una rama
de trabajo; el delta `MODIFIED` de `despliegue-ci` acota esa vía a los proyectos
cuya credencial de DEV no puede publicar en producción, que no es el caso del
sitio sobre Cloudflare.

**Lo que este change no resuelve y queda nombrado en el design:** que el marco
detecte el defecto **en los repos que ya lo tienen** —hoy nada del marco mira el
`desplegar.yml` de un consumidor—, y los analizadores de terceros para workflows,
que este lote tiene prohibido agregar.
