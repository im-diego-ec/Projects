<!-- Plantilla de PR de PROJECTS. Acá lo que cambia es el MARCO: lo que se
     mergea a main termina corriendo en el pipeline de repos ajenos cuando cada
     uno mergea su PR de bump. Por eso esta plantilla pregunta cosas que la de un
     proyecto no pregunta: a quién impacta y si es incompatible.
     La plantilla que reciben los proyectos vive en plantilla/, no es esta. -->

## Change de OpenSpec

<!-- Ruta al change que respalda este PR, p.ej. openspec/changes/<nombre>.
     Recordá: en Projects el change es el DEFAULT, no la excepción. Si va sin
     change, justificalo abajo (solo redacción/ejemplos/tooling interno: nada
     que un consumidor pueda notar). -->

openspec/changes/

## Qué resuelve

<!-- 1-2 frases: el problema. Si nace de un incidente, enlazá el post-mortem
     con su fecha y su repo — el post-mortem ES el proposal (AGENTS.md). -->

<!-- Si cierra un issue: "Closes #N" (se cierra solo al mergear). -->

## Distribución

<!-- Marcá qué formas toca este PR y por qué esa y no otra. -->

- [ ] **Referenciado** — workflow reusable / composite action (`.github/workflows/`, `actions/`)
- [ ] **Scaffold** — `plantilla/` (se copia una vez; NO llega solo a los proyectos ya creados)
- [ ] **Canónico** — specs del marco (`openspec/specs/`)
- [ ] **Regenerado** — pin de una herramienta que cada repo regenera
- [ ] Solo documentación (`docs/`, README)

## Cambios

<!-- Bullets de lo que cambió. -->

-

## Impacto en los proyectos consumidores

<!-- OBLIGATORIO. Escribí qué le pasa a un repo que pina la versión exacta y
     mergea su PR de bump sin modificar una sola línea. "Ninguno" es una
     respuesta válida, pero hay que escribirla. Si el cambio es de scaffold: decí
     qué proyectos quedan divergentes y si hay que abrirles un issue. -->

**Consumidores conocidos afectados:**

**Qué tienen que hacer:**

## ¿Es BREAKING?

<!-- La lista cerrada vive en AGENTS.md («Qué es BREAKING») y la de abajo es
     la MISMA, frase por frase: pruebas/ci-del-marco/que-es-breaking.test.mjs
     las compara. La pregunta que decide una compuerta nueva o endurecida:
     ¿puede el consumidor volver a verde con cambios SUYOS dentro de su PR de
     bump? Si puede, NO es breaking aunque ese PR nazca rojo: sale en un MINOR,
     con el arreglo escrito en «Para consumidores». Si el arreglo queda fuera de
     su repositorio (configuración de GitHub, un acto de administrador), es el
     caso 5. Un cambio de andamio no es breaking: no viaja por el PR de bump.
     Ante la duda, es breaking. -->

- [ ] **No** — un consumidor se pone verde dentro de su PR de bump (o no tiene nada que arreglar), con lo que tenga que hacer escrito en «Para consumidores»
- [ ] **SÍ, BREAKING** — va en la línea mayor siguiente, con nota de migración en `docs/`

Si es breaking, marcá cuál aplica (la lista es cerrada: si no está acá, no es breaking):

- [ ] **Quitar o renombrar un `input`, `secret` u `output` de un workflow reusable, o volver requerido uno que era opcional.**
- [ ] **Cambiar un valor por defecto de forma que cambie el comportamiento.**
- [ ] **Renombrar un job cuyo nombre publica un check.** (rompe los rulesets de los consumidores sin mencionar a Projects en el error)
- [ ] **Exigir un permiso nuevo del token, o un runtime/herramienta de versión mayor.**
- [ ] **Exigir algo que solo se arregla fuera del repositorio del consumidor.** (y no se estrena en modo aviso)

## Evidencia

<!--
Obligatorio, y con una forma: TODA afirmación sobre una propiedad verificable viaja con
el COMANDO que la comprueba y el CÓDIGO DE SALIDA que devolvió. Por ejemplo:

    find actions pruebas -name '*.test.mjs' -print0 | xargs -0 node --test   → exit 0, <n> pass / 0 fail

NO acredita nada contar líneas de salida ni buscar un texto en ella: una herramienta que
no pudo arrancar imprime lo mismo que una que no encontró nada. Es el defecto que midió la
auditoría de cierre de la v1 de este marco (docs/16-auditoria-cierre-v1.md): 13 de 20
afirmaciones de PRs refutadas, cada una con un comando y su exit. Por eso esta sección pide
el exit code y no una descripción.

Y si algo NO se pudo comprobar, va en «No medido» con el motivo. Una propiedad afirmada
sin comprobación es un defecto del pull request, no un detalle de redacción.
-->

**CI de este repo:**

**Comandos y su exit code:**

**Probado contra un consumidor real** (repo, rama y corrida donde se apuntó al SHA/tag de este PR):

**No medido** (lo que este PR afirma y no pudo comprobar, con el motivo):

## Checklist

- [ ] El change de OpenSpec está enlazado arriba (o justificada su ausencia)
- [ ] **Si toca `openspec/`**: `openspec validate --strict` verde + coherencia releída entre proposal ↔ specs ↔ design ↔ tasks
- [ ] **Si toca `openspec/`**: los `MODIFIED` reproducen TODOS los escenarios vigentes del requirement, y el título del requirement existe tal cual en el spec vivo (hueco conocido del guardrail: si no existe, no avisa)
- [ ] `CHANGELOG.md` actualizado en ESTE PR, con la sección correcta y lo breaking marcado
- [ ] **Si agrega o endurece una compuerta que alcanza a un consumidor**: el arreglo está escrito en «Para consumidores», en palabras de quien no es técnico (la compuerta del aviso cobra la jerga; que el arreglo esté, no lo mide nadie)
- [ ] **Si agrega un job o cambia permisos**: `permissions` explícitos y mínimos, auditados acción por acción antes del estreno
- [ ] **Si hay fail-open**: falla ruidosamente (`::warning::` como mínimo) — un fail-open silencioso es indistinguible de que la función no exista
- [ ] **Si toca `plantilla/`**: los valores de proyecto son placeholders `{{...}}` documentados en el README, los handles van por ROL y nada de runtime quedó hardcodeado (eso va por `vars`/`secrets`)
- [ ] El guardrail que agrega este PR **falla solo** (si depende de que alguien se acuerde, es documentación, no guardrail)
- [ ] Sin secrets, ARNs, cuentas, dominios ni valores de un proyecto concreto en el diff
- [ ] **Toda afirmación verificable de este PR trae su comando y su exit code**, y lo que no se pudo comprobar está en «No medido»
- [ ] Review cruzado del builder par solicitado (CODEOWNERS)
