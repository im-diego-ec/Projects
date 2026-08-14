<!-- Plantilla de PR de PROJECTS. Acá lo que cambia es el MARCO: lo que se
     mergea a main termina corriendo en el pipeline de repos ajenos cuando el
     tag v1 se mueva. Por eso esta plantilla pregunta cosas que la de un
     proyecto no pregunta: a quién impacta y si rompe @v1.
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

<!-- OBLIGATORIO. Escribí qué le pasa a un repo que hoy hace uses: ...@v1 y no
     modifica una sola línea. "Ninguno" es una respuesta válida, pero hay que
     escribirla. Si el cambio es de scaffold: decí qué proyectos quedan
     divergentes y si hay que abrirles un issue. -->

**Consumidores conocidos afectados:**

**Qué tienen que hacer:**

## ¿Es BREAKING para `@v1`?

<!-- Ante la duda, es breaking (AGENTS.md). Mover v1 sobre un cambio
     incompatible rompe repos ajenos en silencio. -->

- [ ] **No** — `v1` puede moverse sobre este cambio sin romper a nadie
- [ ] **SÍ, BREAKING** — requiere línea mayor nueva + nota de migración en `docs/`

Si es breaking, marcá cuál aplica:

- [ ] Se quitó/renombró un `input`, `secret` u `output`, o uno opcional pasó a requerido
- [ ] Cambió un valor por defecto de forma que cambia el comportamiento
- [ ] Se renombró un job cuyo nombre publica un check (**rompe los rulesets de los consumidores sin mencionar a Projects en el error**)
- [ ] Se exige un permiso nuevo del token, o un runtime/herramienta de versión mayor
- [ ] Un check se endureció: un repo que hoy pasa, mañana falla

## Evidencia

<!-- Obligatorio. Si algo no pudo verificarse, decilo explícitamente y por qué. -->

**CI de este repo:**

**Probado contra un consumidor real** (repo, rama y corrida donde se apuntó al SHA/tag de este PR):

## Checklist

- [ ] El change de OpenSpec está enlazado arriba (o justificada su ausencia)
- [ ] **Si toca `openspec/`**: `openspec validate --strict` verde + coherencia releída entre proposal ↔ specs ↔ design ↔ tasks
- [ ] **Si toca `openspec/`**: los `MODIFIED` reproducen TODOS los escenarios vigentes del requirement, y el título del requirement existe tal cual en el spec vivo (hueco conocido del guardrail: si no existe, no avisa)
- [ ] `CHANGELOG.md` actualizado en ESTE PR, con la sección correcta y lo breaking marcado
- [ ] **Si agrega un job o cambia permisos**: `permissions` explícitos y mínimos, auditados acción por acción antes del estreno
- [ ] **Si hay fail-open**: falla ruidosamente (`::warning::` como mínimo) — un fail-open silencioso es indistinguible de que la función no exista
- [ ] **Si toca `plantilla/`**: los valores de proyecto son placeholders `{{...}}` documentados en el README, los handles van por ROL y nada de runtime quedó hardcodeado (eso va por `vars`/`secrets`)
- [ ] El guardrail que agrega este PR **falla solo** (si depende de que alguien se acuerde, es documentación, no guardrail)
- [ ] Sin secrets, ARNs, cuentas, dominios ni valores de un proyecto concreto en el diff
- [ ] Review cruzado del builder par solicitado (CODEOWNERS)
