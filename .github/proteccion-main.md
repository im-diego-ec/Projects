# Protección de `main` en Projects — estado real y cómo aplicarla

La capability `gobierno-contribucion` exige que la protección de la rama de
integración sea un **acto humano deliberado** (nunca aplicada desde el pipeline)
y que su **estado real** viva escrito en el repo. Este es ese documento para
Projects. El equivalente para los proyectos se copia del scaffold
([`plantilla/.github/proteccion-main.md`](../plantilla/.github/proteccion-main.md)).

## Estado real

Ruleset **`main-protegida`**, id `20876718`, `enforcement: active` desde el
2026-08-14, aplicado por Builder 1.

| Regla | Estado | Nota |
|---|---|---|
| Requiere pull request para integrar | 🟢 activa | Nada entra a `main` por push directo |
| Check requerido: **`ci-ok`** | 🟢 activa | Nombre exacto. Ver abajo por qué no puede ser otro |
| Rama al día antes del merge | 🟢 activa | `strict_required_status_checks_policy` |
| Prohibido force-push y borrado de `main` | 🟢 activa | Reglas `non_fast_forward` y `deletion` |
| Sin bypass para nadie (admins incluidos) | 🟢 activa | `bypass_actors` vacío. Cualquier excepción que se conceda se escribe acá con su motivo |
| 1 aprobación requerida | 🔴 diferida | Hoy en `0`. Con un solo builder operativo bloquearía los merges del día a día; se activa cuando el equipo esté en el flujo de review |
| Review de code owner requerido | 🔴 diferida | Hoy en `false`. Es lo que convierte [`CODEOWNERS`](CODEOWNERS) en gate real: sin esto solo sugiere reviewers. Va junto con la fila de arriba |
| Commits firmados | 🔴 no configurada | Requiere GPG operativo en todas las máquinas del equipo |

Las tres filas 🔴 están diferidas **a propósito**, no olvidadas: el spec
`gobierno-contribucion` exige justamente que lo que no se activa quede declarado
con su motivo, en vez de omitirse o presentarse como activo. Cada cambio
posterior de la configuración se refleja acá en el mismo cambio que lo
introduce.

## El check requerido es `ci-ok`, y no es un detalle

`ci-ok` es el veredicto agregado de [`workflows/ci.yml`](workflows/ci.yml):
corre con `if: always()` y **reporta en los dos carriles**, el de código y el de
docs.

Exigir un job que solo reporta en un carril —`build-test`, por ejemplo, que en
un PR de solo documentación queda `skipped`— deja ese carril bloqueado para
siempre esperando una señal que nunca llega. Ya pasó: un carril quedó bloqueado una
semana entera (2026-07-29 → 2026-08-05). Un check `skipped` **no reporta**.

## Aplicarla desde cero

Por UI, que es donde el acto queda con autor y fecha:

1. **Settings → Rules → Rulesets → New ruleset → New branch ruleset**.
2. Nombre: `main-protegida`. Enforcement status: **Active**.
3. Target branches: **Include default branch**.
4. Reglas a marcar:
   - Restrict deletions
   - Block force pushes
   - Require a pull request before merging (las aprobaciones requeridas y el
     review de code owners se suben cuando el equipo esté operativo en el flujo;
     activarlas antes bloquea los merges del día a día)
   - Require status checks to pass → Require branches to be up to date before
     merging → agregar el check **`ci-ok`**
   - Require signed commits, cuando todas las máquinas tengan GPG
5. **Bypass list: vacía.** Ninguna identidad —admins, apps, automatizaciones—
   se salta las reglas. Si alguna vez se concede una, se escribe en la tabla de
   arriba con su motivo.
6. Volver acá y actualizar la tabla de estado en el mismo PR.

> **Orden que importa:** el check `ci-ok` **no aparece en la lista de GitHub
> hasta que haya corrido al menos una vez**. En un repo recién creado hay que
> dejar que el CI corra primero (un push a `main` o un PR cualquiera) y recién
> después agregarlo como requerido. Si no está en la lista, no es que esté mal
> escrito: todavía no existe para GitHub.

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
