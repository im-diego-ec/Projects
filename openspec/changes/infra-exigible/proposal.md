---
artefacto: proposal
dri: Builder 1
aprueba: Builder 2 (builder par) # NO el PO: en este repo su gate está acotado a
                             # `gobierno-contribucion` (.github/CODEOWNERS,
                             # últimas dos líneas). Este delta toca
                             # `operacion-infra`.
informado: PO (PO)
estado: pendiente-de-revision
---

# infra-exigible — Proposal

## Why

**La regla ya existe y llega a todas las sesiones. Lo que no existe es el lugar
donde apunta.** El canónico dice, textual
(`actions/constitucion/canonico/60-infra-aws-secretos.md:15`):

> **IaC = Terraform, sin excepción**: `infra/` (dev, cuenta `{{CUENTA_DEV}}`),
> `infra-prod/` (prod, cuenta `{{CUENTA_PROD}}`), región `{{REGION}}`. En los repos del
> área NO se genera CDK ni CloudFormation, ni siquiera como borrador o comparación.

Ese texto se renderiza en el `.projects/AGENTS-marco.md` de cada consumidor con sus cuentas
sustituidas, así que **el agente lo carga en cada sesión**. Y el andamio **no crea ninguno
de los dos directorios que la regla nombra**. Medido el 2026-08-23:

```
find . -name "*.tf"                              → 0 archivos en todo el marco
ls plantilla/infra plantilla/infra-prod          → no existen
ls plantilla/.github/workflows | grep deploy     → (vacío)
```

**Un repositorio nacido del andamio llega a `ci-ok` verde sin tener despliegue, y eso no
es rojo en ningún lado.** El agente, en ese mismo repo, lee una regla que le dice que la
infraestructura vive en `infra/` y encuentra que `infra/` no está. Una regla que apunta a
un directorio vacío es peor que una regla ausente: invita a improvisar exactamente donde
el marco no quiere improvisación.

**El tamaño de lo que hoy cada proyecto reinventaría**, medido contra el un consumidor (solo archivos versionados; el `state` y los `.tfvars` están correctamente
ignorados en los dos ambientes):

| | dev (`infra/`) | prod (`infra-prod/`) |
|---|---|---|
| Archivos `.tf` | 9 · **884 líneas** | 12 · **1226 líneas** |
| Base de datos | dentro de `main.tf` / `ecs.tf` | en su propio `database.tf` |
| Alarmas | **ninguna, a propósito** | **6** en `alertas.tf` |
| EventBridge | no | sí |

**Y por qué esto importa más que otros huecos: por quién usa el marco.** Los builders
traen experiencia de negocio, no técnica: su aporte es verificar que la sesión entendió
el requerimiento. El propósito declarado del marco es que el criterio técnico se
distribuya —cableado o escrito— para que el builder **no tenga que pensarlo**. Bajo esa
vara, «escrito» son dos cosas distintas y solo una sirve:

| | Qué hace el builder |
|---|---|
| **Cableado** — el check falla solo, o el andamio lo entrega andando | nada |
| **Escrito para el agente** — vive en la constitución que el agente carga en cada sesión | nada |
| **Escrito para la persona** — un spec, un ADR, un doc | todo, y sin expertise técnico **no puede** |

Las garantías operativas del marco —smoke, verificación de producción, alarmas, rollback,
errores del navegador en nuestros logs— son hoy **19 requirements escritos para una
persona con criterio técnico**. Este change no las implementa: mueve la primera de ellas
del tercer nivel al segundo, que es donde el criterio se transfiere sin que nadie lo
recuerde.

## What Changes

- **El andamio crea `infra/` y `infra-prod/`**, que son los directorios que la regla ya
  nombra. Deja de haber una regla apuntando a la nada.
- **Adentro van huecos de decisión, no código.** Uno por cosa que tiene que existir —red,
  cómputo, base, dominios, identidad federada del pipeline, alarmas—, y cada hueco lleva
  **tres cosas**: qué falta, **cómo se decide**, y qué pasa si no se hace.
- **El mecanismo no es nuevo y eso es deliberado.** `calidad-codigo` ya exige que «un
  repositorio nacido del scaffold no conserva marcadores sin resolver», y su texto
  incluye explícitamente los **huecos de decisión**, no solo las sustituciones. El paso
  del pipeline que los caza ya existe y ya los busca por codepoint. Este change **usa esa
  compuerta**; no inventa otra.
- **Las alarmas se exigen como propiedad, nunca como lista.** Lo que tiene que existir es
  que existan y estén cableadas al canal de alertas; **cuáles y con qué umbrales es del
  negocio de cada proyecto** — un proyecto con tres alarmas bien elegidas cumple y uno con
  seis copiadas de otro negocio no. Un check que esperara una cantidad violaría la regla
  que el marco ya tiene escrita para las migraciones: invariantes de **propiedades**,
  jamás de cantidades esperadas.
- **La asimetría dev↔prod se declara, no se corrige.** dev no lleva alarmas y eso es
  decisión tomada: dev es staging compartido y las alarmas que importan son las de
  producción. Queda escrito para que no se lea como un hueco.

**Lo que este change NO hace, y el motivo de cada cosa:**

- **Ni una línea de Terraform.** Escribirla hoy significa repartirla **sin verificar**:
  `terraform validate` es barato, `plan` contra una cuenta nueva no lo es, y `apply` en
  producción exige el OK explícito de @builder-uno. Un andamio de infraestructura sin
  verificar hace que **todo proyecto futuro herede los errores**, que es lo contrario de
  lo que el marco compra.
- **No un módulo de Terraform del marco.** Descartado por la audiencia: cuando
  `terraform plan` falla dentro de un módulo, el error apunta a código que no está en el
  repo del proyecto, y un builder sin experiencia técnica no tiene con qué depurarlo.
  Archivos reales en su propio árbol los lee él y los edita su agente. Es la opción menos
  elegante y la única usable.
- **No el workflow de despliegue ni `verificar-prod`.** Son la otra mitad del hueco
  (issue #66) y son un change propio: ahí sí hay una pieza genuinamente genérica que
  debería viajar por el carril **referenciado**, y mezclarla acá convierte dos decisiones
  en una.

## Capabilities

### Modified Capabilities

- `operacion-infra`: **un requirement nuevo** — un repositorio desplegable tiene su
  infraestructura como código en el árbol, en los directorios que la constitución nombra,
  y los huecos de decisión que el andamio deja ahí son compuerta hasta que se resuelvan.
  Los cinco requirements vigentes de la capability **no se tocan**, así que el delta es
  solo `ADDED`.

## Impact

**Distribución.** *Scaffold*: los dos directorios nuevos y sus huecos, más su entrada en
`.gitignore` para el `state` y los `.tfvars` —que en el consumidor medido ya están
ignorados y conviene que nazcan así—. *Canónico*: nada; la regla ya está escrita y no
cambia. *Referenciado*: nada; el paso que caza los huecos ya existe y ya viaja.

**Impacto en los consumidores actuales: ninguno, y es verificable.** El consumidor que ya
está andando tiene `infra/` e `infra-prod/` con Terraform real y **cero** huecos de decisión,
así que pasa sin tocar una línea. Es MINOR y no breaking: ningún repositorio que hoy pasa,
mañana falla.

**Impacto en un repositorio nuevo.** Su primer CI sale **rojo** en los huecos de
infraestructura, exactamente igual que en los tres huecos que el andamio ya deja hoy, y
`docs/05-arrancar-tecnico.md` ya documenta ese primer rojo como esperado. La guía suma
esos huecos a su fase 5.1.

**Projects mismo.** No es un repositorio desplegable, así que la verificación tiene que ser
**inerte** para él. El paso de marcadores ya resuelve esta clase de caso exentando al
repositorio que distribuye el andamio, detectado por la presencia de
`plantilla/.github/workflows/ci.yml`.

**Lo que este change NO promete.** Que los huecos se resuelvan **bien**. La compuerta
garantiza que alguien los atendió, no que la infraestructura resultante sea correcta: eso
lo dice `terraform plan`, lo revisa un humano y lo verifica el despliegue. Lo que el
change compra es que **dejar de atenderlos no sea posible en silencio**.

## Fuera de alcance, declarado

- El Terraform en sí, que es un change posterior con verificación real en dev antes de
  producción.
- El `deploy.yml` y `verificar-prod` como pieza referenciada del marco (issue #66).
- Las otras garantías operativas del tercer nivel —smoke, errores del navegador en
  nuestros logs, presupuesto, backups—: cada una es su propio movimiento del tercer nivel
  al segundo, y meterlas acá haría un change que nadie puede revisar de una sentada.
