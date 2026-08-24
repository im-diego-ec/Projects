---
artefacto: proposal
dri: Builder 1
aprueba: Builder 2 (builder par)  # change técnico de la maquinaria; el gate del PO
                              # en este repo está acotado a gobierno-contribucion
informado: PO / Builder 2
estado: pendiente-de-revision
---

# entrega-referenciada — Proposal

## Why

El design previo del pipeline de entrega resolvió **scaffold parametrizado +
verificador estático**, y lo resolvió bien para la premisa que tenía: el marco
declara que «lo que sí es del proyecto» es **su deploy con la topología de su
infraestructura** (`AGENTS.md:181-183`, `README.md:148-150`).

Esa premisa cambió: **el DRI fijó el stack y la infraestructura base del área**.
Con la infraestructura fija, la topología del deploy deja de ser del proyecto y
pasa a ser del área — y entonces mantener N copias de una mecánica **idéntica por
decreto** es exactamente el anti-patrón que Projects existe para matar
(`AGENTS.md:169-175`: «en el momento en que existen dos copias, la divergencia es
cuestión de tiempo y la corrección de un incidente deja de propagarse»).

La evidencia está en el único consumidor con historia. Sobre su
`.github/workflows/deploy.yml` (685 líneas al abrir este change), verificado
hoy:

- El patrón de one-off en Fargate —`run-task` + `wait tasks-stopped` + check del
  exit code— aparece **cuatro veces**: `:121` (migraciones de dev), `:206`
  (smoke de API), `:324` (limpieza del E2E), `:480` (migraciones de producción).
  Es el bloque más duplicado del archivo.
- `deploy-api` (`:51`) y `deploy-api-prod` (`:419`) comparten login al registro,
  validación fail-fast del tag de rollback, build+push con tag de SHA inmutable,
  migración one-off y update del servicio. Difieren en gates, en `environment` y
  en secrets: casi todo lo demás es **repetición**.
- Las tres lecciones del 2026-08-19 —contenedor de Playwright (`:248`), el
  `shell: bash` a nivel de job porque dentro de un contenedor los pasos corren
  en `sh` (`:256`), la limpieza en job aparte para que corra aunque la suite
  falle (`:302`)— y el `actions: read` que el detector necesitaba (`:366`, con
  su comentario de «TERCERA aparición de la lección») **no llegan solas** a
  `intranet` ni a Supply Chain bajo scaffold+verificador. El verificador
  comprueba propiedades; no propaga arreglos.
- Y hay valores de runtime hardcodeados que cualquier scaffold tendría que cazar
  uno por uno: dominio de la API (`:548-549`, `:588`), log group (`:608`,
  `:610`), repositorio del registro y tópico de notificaciones (`:623`).

La pregunta, entonces, no es *si* la mecánica del deploy sube al marco: es **cuál
es la unidad de distribución**. El workflow completo no puede ser, porque su
mitad de producción jamás corre antes de publicarse —por spec, un dispatch de
rama deja producción sin ejecutar—, y Projects publicaría a N repos código que no
corrió en ninguna parte. La compuerta sí puede.

## What Changes

- **La unidad de distribución baja del workflow a la compuerta.** La mecánica de
  cada compuerta sube al marco como **composite action `@v1`**, extraída de a
  una por change, en orden de repetición y densidad de incidentes: primero el
  patrón de one-off (el que aparece cuatro veces), después el gate de
  migraciones, después build+push con el fail-fast del rollback, después el
  update del servicio.
- **La topología queda copiada, como esqueleto delgado.** Jobs, dependencias,
  condiciones, el ambiente que resguarda los secretos de producción, la
  serialización de despliegues y los permisos siguen siendo del proyecto: de
  ~685 líneas de mecánica+topología a ~200 de **solo orquestación**.
- **Un invariante nuevo, verificado por un check que falla solo:** ninguna pieza
  referenciada del marco que ejecute un job de producción puede faltar en el
  tramo de dev de **la misma promoción**. Eso es lo que resuelve el dogfooding
  sin construir nada: la misma action, en la misma versión, corrió en dev
  minutos antes, en el mismo run. En el consumidor real es casi gratis —tres de
  las cuatro apariciones del one-off están en el tramo de dev—.
- **Las tres vías que esquivan ese invariante quedan declaradas de antemano**,
  cada una con su control compensatorio: el rollback a un artefacto que ya estuvo
  en producción, el disparo manual de emergencia, y el reuso de una verificación
  de dev por contenido idéntico. Una vía nueva se declara **antes de existir**.
- **Entradas y secretos nombrados, jamás herencia indiscriminada del almacén de
  secretos** — las composite actions lo cumplen por construcción.
- **El verificador estático cambia de trabajo y se endurece**: vigila el
  esqueleto de topología que sigue copiado (las migraciones gatean el update, los
  despliegues no se cancelan entre sí, los jobs de producción llevan su
  ambiente) y el invariante nuevo.

Lo que este change **no** hace, y está escrito para que no se descubra después:
no extrae las sondas de producción (no tienen gemelo de dev: violarían el
invariante que este change crea), no construye el canario descartado, y no cierra
dónde queda escrita la infraestructura fijada ni la reescritura de «No impone
stack» — eso es el **change de contrato**, del que este depende: la mitad de
«dónde queda escrita» la está resolviendo el change hermano `stack-estandar`
(capability `base-tecnologica`), y la reconciliación de `AGENTS.md:181-183` con
las actions de entrega queda flagueada y rastreada en `tasks.md`.

Los detalles, las alternativas descartadas con su argumento y los límites
declarados están en `design.md`; el orden de extracción y el ritmo honesto de la
serie, en `tasks.md`.

## Capabilities

### Modified Capabilities

- `pipeline-entrega`: **dos requirements nuevos** — (1) la mecánica de las
  compuertas de entrega se consume por referencia y la topología es del proyecto,
  con la excepción registrada para el proyecto que no quepa en la infraestructura
  fija; (2) ninguna pieza del marco alcanza producción sin haber corrido en dev
  en la misma promoción, con sus tres excepciones declaradas. Los cuatro
  requirements vigentes de la capability **no se tocan**.

## Impact

**Distribución.** Cambian tres de las cuatro formas. **Referenciado**: nacen las
actions de compuerta, y el check del invariante viaja dentro del workflow
reusable, así que llega solo a todo consumidor de `@v1`. **Scaffold**: el deploy
de la plantilla se convierte en el esqueleto de topología. **Canónico**: los dos
requirements. *Regenerado* no se toca.

**Hay acción del consumidor, y es por compuerta.** Cada repositorio adoptante,
en un PR propio y por compuerta: reemplaza los pasos mecánicos por el `uses:`
correspondiente (**pinado a SHA** para el debut, `AGENTS.md:177-179`), carga las
variables y secretos que la pieza declara, y verifica una promoción real antes de
que `v1` se mueva.

**¿Rompe a los adoptantes existentes?** No, si se respeta el orden. El check del
invariante es **vacuamente verdadero** para un repositorio que todavía no adoptó
ninguna compuerta —no usa ninguna pieza del marco en un job de producción—, así
que entra en **MINOR** sin poner rojo a nadie que no haya tocado una línea. El
aviso de «mecánica copiada que ya existe como pieza referenciada» es **aviso, no
rojo**, a propósito. Y el endurecimiento del verificador de topología —el que sí
podría poner rojo a un repo que hoy pasa— **se estrena en modo aviso**, con el
rojo en la línea mayor siguiente, que es lo que `AGENTS.md:143-145` exige.

**Efecto neto para un proyecto nuevo** (el caso Supply Chain): copia ~200 líneas
de topología en vez de ~685 de mecánica, y hereda puestas las lecciones pagadas
—el patrón one-off completo, el fail-fast del rollback, el tag de SHA inmutable,
los permisos auditados acción por acción—. Cuando la CLI del servicio de cómputo
cambie un flag, o aparezca la cuarta lección de one-offs, le llega como **PATCH
de `v1` sin tocar nada**; hoy le llegaría como un diff que alguien tiene que
acordarse de portarle.

**Lo que este change NO promete.** El marco puede garantizar que la **mecánica**
sea una sola y que se haya ejercitado en dev antes de producción; no puede
garantizar que la **topología** copiada —que es donde vivieron los incidentes más
sutiles: los `!cancelled()`, el arrastre de `skipped`, la cola de concurrency del
2026-08-13— se mantenga correcta sola. Ahí sigue el verificador como ratchet y la
revisión trimestral, que por su propio texto **no es enforcement**. Y el residuo
estructural queda escrito: un fix a una action se propaga a las promociones de
producción de todos cuando `v1` se mueve, acotado por el debut pinado, por
actions fail-red y por el rollback, que no depende de ninguna action nueva.
