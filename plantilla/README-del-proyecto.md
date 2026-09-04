# {{PROYECTO}}

> **Este archivo lo genera la herramienta que creó el repositorio: llega con la estructura
> puesta y los valores del proyecto ya sustituidos, pero con varios huecos marcados
> `RELLENAR`.** Son las respuestas que ninguna
> herramienta puede inventar, y cuántos son lo dice el comando, no esta línea:
>
> ```bash
> grep -n RELLENAR README.md
> ```
>
> Llenalos **antes del primer push**. Este es el único archivo que GitHub renderiza en la
> portada del repositorio: es lo primero —y muchas veces lo único— que lee alguien que
> llega. Un README que todavía dice `RELLENAR` no pone nada en rojo; simplemente se lee
> como si el proyecto no tuviera la respuesta. Cuando termines, borrá esta cita.

**RELLENAR — una frase.** Qué hace este proyecto y para quién, en una línea que se entienda
sin contexto previo.

---

## Qué es y qué no es

**RELLENAR — el alcance.** Tres o cuatro viñetas de lo que este repositorio resuelve, y
—más importante— una o dos de lo que **no** resuelve y a dónde va esa necesidad. El alcance
escrito es lo que evita que la próxima funcionalidad entre acá "porque es el repo que ya
existe".

Lo que se decide de verdad no vive en este archivo: las propuestas y los contratos están en
`openspec/`, y las reglas con las que trabajan las personas y los agentes están en
`AGENTS.md`. Este README es el mapa, no la fuente.

## Estructura

| Directorio              | Qué hay                                                                                                                                          |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
<!-- projects:solo-si-es-sitio -->
| `{{PAQUETE_SITIO}}/`    | El sitio. Las páginas viven en `src/pages/` y cada archivo es una dirección; el código propio va en `src/lib/`, que es donde van las pruebas.     |
<!-- projects:fin-solo-si-es-sitio -->
<!-- projects:solo-si-no-es-sitio -->
| `{{PAQUETE_API}}/`      | Backend. Expone la API y es la autoridad de autorización: la identidad sale siempre de los claims firmados, nunca del cuerpo de la petición.     |
| `{{PAQUETE_WEB}}/`      | Frontend. Consume la API del backend; no habla con la base de datos ni con la nube.                                                              |
| `{{PAQUETE_E2E}}/`      | Suite end-to-end, que ejercita el sistema entero contra un ambiente levantado.                                                                   |
<!-- projects:fin-solo-si-no-es-sitio -->
<!-- projects:solo-si-hay-infra -->
| `infra/`, `infra-prod/` | Infraestructura como código, un root por ambiente. Los pendientes de decisión que quedan abiertos están escritos en `pendientes.tf` de cada uno. |
<!-- projects:fin-solo-si-hay-infra -->
| `openspec/`             | Propuestas y contratos: lo que se va a construir y qué garantiza.                                                                                |
| `docs/`                 | Lo que este proyecto deja escrito: decisiones estructurales, post-mortems, runbooks y las plantillas para empezar cada uno.                      |
| `.github/workflows/`    | El pipeline. Lo común llega por referencia al marco; lo del proyecto vive acá.                                                                   |

## Levantarlo en tu máquina

<!-- projects:solo-si-es-sitio -->
Un solo comando, y no hace falta configurar nada antes:

```bash
corepack pnpm dev
```

Abrilo en la dirección que imprime. La verificación completa —la misma secuencia que corre
el pipeline— es:
<!-- projects:fin-solo-si-es-sitio -->
<!-- projects:solo-si-no-es-sitio -->
Los comandos exactos, con sus dos variantes por sistema operativo, están en
**`comandos-levantar-servicios.txt`**. No se repiten acá a propósito: una segunda copia de
una lista de comandos se desactualiza, y la que se pudre es siempre la que nadie corre.

El resumen, para saber qué esperar: `corepack pnpm install` una vez, copiar los dos
`.env.example` a `.env` y llenarlos, y `corepack pnpm dev`. La verificación completa —la misma secuencia que corre el
pipeline— es un solo comando:
<!-- projects:fin-solo-si-no-es-sitio -->

```bash
corepack pnpm verificar
```

> **`corepack pnpm` y no `pnpm` a secas.** La versión de pnpm de este repositorio
> está fijada en `packageManager`, y `corepack` es lo que la trae; viene con Node
> y no hay que instalar nada. `pnpm` pelado contesta `command not found` si nunca
> lo instalaste por tu cuenta.

Correlo antes de abrir un PR. Falla en tu máquina por lo mismo que fallaría en el
pipeline, y el diagnóstico local es varios minutos más barato.

## Ambientes

> # projects:solo-si-es-sitio
> ✅ **Este proyecto SÍ se publica, y se publica solo.** Cada vez que las
> verificaciones terminan en verde sobre `main`, el sitio sale a
> `{{DOMINIO_PROD}}`. No hay que apretar nada.
>
> **Faltan cuatro actos humanos: la cuenta de Cloudflare, el subdominio de tu
> cuenta, la credencial y guardarla en GitHub.**
> Mientras no existan, la publicación **no se pone en rojo**: sale con un aviso
> amarillo diciendo qué falta. El paso a paso —tres minutos— está
> en [`{{PAQUETE_SITIO}}/README.md`]({{PAQUETE_SITIO}}/README.md).
>
> La primera vez, Cloudflare imprime la dirección completa. Si no tenés dominio
> propio, esa dirección lleva **el subdominio de tu cuenta en el medio**
> (`{{PROYECTO}}.<tu-subdominio>.workers.dev`), que acá todavía no se puede
> saber: cuando la veas, cambiala arriba y en `{{PAQUETE_SITIO}}/astro.config.mjs`.
>
> Mientras tanto, se levanta en tu máquina con `pnpm dev`.
> # projects:fin-solo-si-es-sitio

> # projects:solo-si-no-es-sitio
> ⚠️ **Todavía no hay despliegue automático, y conviene decirlo antes que nada.**
> Este repositorio se verifica solo, pero **nada lo publica**: no hay un paso que lleve
> tu código a una dirección donde otra persona pueda entrar. Mientras tanto, se levanta
> en tu máquina con `pnpm dev`.

> # projects:solo-si-hay-infra
> Las direcciones de abajo son donde va a vivir cuando ese paso exista, no dónde vive hoy.

| Ambiente   | Dirección prevista | Cuándo se despliega                                             |
| ---------- | ------------------ | --------------------------------------------------------------- |
| Desarrollo | `{{DOMINIO_DEV}}`  | **RELLENAR** — qué lo dispara (¿cada merge a `main`?, ¿a mano?) |
| Producción | `{{DOMINIO_PROD}}` | **RELLENAR** — qué lo dispara y quién lo autoriza               |

Los recursos de nube de este proyecto llevan el prefijo `{{PREFIJO_RECURSOS}}` y viven en
la región `{{REGION}}`. La configuración por ambiente **no** se escribe en el repositorio:
va por `vars` y `secrets`, y los valores sensibles por el almacén de parámetros bajo
`/{{PREFIJO_RECURSOS}}/<ambiente>/<NOMBRE>`.
> # projects:fin-solo-si-hay-infra
> # projects:fin-solo-si-no-es-sitio

## Cuando algo se rompe en producción

Las alarmas de producción caen en `{{CANAL_ALERTAS}}`.

**RELLENAR — el runbook mínimo.** Para cada alarma que este proyecto emite: qué significa,
dónde se mira (log group, panel, sonda) y cuál es el primer paso. Con tres filas alcanza
para que la persona de guardia no empiece de cero a las tres de la mañana; sin ninguna, la
alarma es un aviso de que algo pasa y nada más.

Toda escritura en producción necesita el OK explícito de **@{{BUILDER_1}}**, que sostiene
la llave de ese ambiente. No es una formalidad del proceso: es el único punto donde un
cambio a producción tiene un responsable con nombre.

## Quién revisa qué

Quién tiene que aprobar cada archivo está escrito en `.github/CODEOWNERS` —un archivo que
GitHub lee solo para asignar los revisores de cada pull request—, así que el reparto no
depende de que nadie se acuerde:

- Todo el código lo revisa quien no lo escribió (**@{{BUILDER_1}}**, **@{{BUILDER_2}}**,
  las personas que programan en este proyecto).
- Las propuestas y los acuerdos escritos de `openspec/` los aprueba **@{{PO}}**, que es
  quien decide qué se construye. Es una aprobación aparte: por más que las dos personas
  que programan aprueben el cambio, sin esta el pull request no se puede mergear.

Si un PR no se auto-asigna a nadie, el problema no es del PR: es que el equipo no tiene
permiso de escritura sobre el repositorio, y GitHub no lo reporta. Se comprueba así:

```bash
gh api repos/{{ORG}}/{{PROYECTO}}/teams --jq '.[] | "\(.slug): \(.permission)"'
```

## Cómo se verifica un cambio

La única comprobación obligatoria para mergear a `main` se llama **`ci-ok`**. No hace
trabajo propio: mira el resultado de todas las demás y las resume en un sí o un no.

Eso es deliberado. En un cambio que solo toca documentación, compilar y correr las pruebas
no tiene sentido y esos pasos se saltean; pero un paso salteado **nunca informa un
resultado**, así que si la regla exigiera ese paso, el pull request se quedaría esperando
para siempre una respuesta que no va a llegar. `ci-ok` sí responde en los dos casos —el
cambio de código y el de solo documentación—, y por eso es el único que se exige.

Parte del pipeline llega por referencia al marco de ingeniería
(`{{ORG_MARCO}}/Projects`), pinado por versión exacta: una versión nueva entra como PR y se
revisa, nunca empujada. Las reglas comunes que leen los agentes se regeneran desde ahí, así
que no se editan a mano en este repositorio; lo propio del proyecto sí vive acá y es tuyo.

## Contribuir

**RELLENAR — lo propio de este proyecto**, si hay algo: convenciones de dominio, un flujo de
datos que hay que entender antes de tocar el backend, un paso manual que todavía no se
automatizó. Si no hay nada particular, borrá esta sección: una sección vacía enseña a
saltear las secciones.

Lo que **no** va acá porque ya está escrito: el proceso de trabajo y las reglas de agentes
están en `AGENTS.md`, el checklist de un PR en `.github/PULL_REQUEST_TEMPLATE.md`, y las
reglas de protección de `main` en `.github/proteccion-main.md`.
