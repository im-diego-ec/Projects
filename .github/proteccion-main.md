# Protección de `main` en Projects — estado real y cómo aplicarla

La capability `gobierno-contribucion` exige que la protección de la rama de
integración sea un **acto humano deliberado** (nunca aplicada desde el pipeline)
y que su **estado real** viva escrito en el repo. Este es ese documento para
Projects. El equivalente para los proyectos se copia del scaffold
([`plantilla/.github/proteccion-main.md`](../plantilla/.github/proteccion-main.md)).

## Estado real

| Regla | Estado | Nota |
|---|---|---|
| Requiere pull request para integrar | 🔴 pendiente | Se activa al publicar el repo en la organización |
| 1 aprobación requerida | 🔴 pendiente | |
| Review de code owner requerido | 🔴 pendiente | Es lo que convierte [`CODEOWNERS`](CODEOWNERS) en gate: sin esto solo sugiere reviewers |
| Check requerido: **`ci-ok`** | 🔴 pendiente | Nombre exacto. Ver abajo por qué no puede ser otro |
| Rama al día antes del merge | 🔴 pendiente | |
| Commits firmados | 🔴 pendiente | |
| Prohibido force-push y borrado de `main` | 🔴 pendiente | |
| Sin bypass para nadie (admins incluidos) | 🔴 pendiente | Cualquier excepción que se conceda se escribe acá con su motivo |

**Por qué todo está pendiente:** el repo todavía no tiene commits ni existe en la
organización; la Fase 1 lo crea. Este documento se actualiza en el **mismo PR**
que aplique la protección, y cada cambio posterior de la configuración se
refleja acá en el cambio que lo introduce.

## El check requerido es `ci-ok`, y no es un detalle

`ci-ok` es el veredicto agregado de [`workflows/ci.yml`](workflows/ci.yml):
corre con `if: always()` y **reporta en los dos carriles**, el de código y el de
docs.

Exigir un job que solo reporta en un carril —`build-test`, por ejemplo, que en
un PR de solo documentación queda `skipped`— deja ese carril bloqueado para
siempre esperando una señal que nunca llega. Ya pasó una semana entera en el
repo de origen (2026-07-29 → 2026-08-05). Un check `skipped` **no reporta**.

## Aplicarla desde cero

Por UI, que es donde el acto queda con autor y fecha:

1. **Settings → Rules → Rulesets → New ruleset → New branch ruleset**.
2. Nombre: `main-protegida`. Enforcement status: **Active**.
3. Target branches: **Include default branch**.
4. Reglas a marcar:
   - Restrict deletions
   - Block force pushes
   - Require signed commits
   - Require a pull request before merging → Required approvals: **1** →
     Require review from Code Owners
   - Require status checks to pass → Require branches to be up to date before
     merging → agregar el check **`ci-ok`** (aparece en la lista recién después
     de la primera corrida de CI: si no está, abrí un PR cualquiera primero)
5. **Bypass list: vacía.** Ninguna identidad —admins, apps, automatizaciones—
   se salta las reglas. Si alguna vez se concede una, se escribe en la tabla de
   arriba con su motivo.
6. Volver acá y pasar los 🔴 a 🟢 en el mismo PR.

## Contrastar lo escrito contra la configuración real

```bash
gh api repos/im-diego-ec/Projects/rulesets --jq '.[] | "\(.id)  \(.name)  \(.enforcement)"'
gh api repos/im-diego-ec/Projects/rulesets/<id> --jq '.rules[] | .type'
gh api repos/im-diego-ec/Projects/rulesets/<id> --jq '.bypass_actors'
```

Si la salida no coincide con la tabla de estado real, **manda la salida**: el
documento está desactualizado y se corrige en el acto.

## Nada de esto se automatiza desde el pipeline

Un workflow que se otorgue permiso para editar su propia protección de rama
puede quitarla. La protección se aplica a mano, se documenta acá, y el CI solo
la ejerce.
