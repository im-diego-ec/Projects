# Protección de `main` en {{PROYECTO}} — estado real y cómo aplicarla

La protección de la rama de integración es un **acto humano deliberado**: nunca
se aplica desde el pipeline (un workflow con permiso para editar su propia
protección puede quitarla). Este documento es su **estado real** — el marco
exige que exista y que se actualice en el mismo cambio que modifique la
configuración.

> 🕳️ **Al crear el repo**: aplicá la protección (pasos abajo), pasá los 🔴 a 🟢
> con la fecha, y borrá este recuadro.

## Estado real

| Regla | Estado | Nota |
|---|---|---|
| Requiere pull request para integrar | 🔴 pendiente | |
| 1 aprobación requerida | 🔴 pendiente | |
| Review de code owner requerido | 🔴 pendiente | Es lo que convierte `CODEOWNERS` en gate: sin esto solo sugiere reviewers |
| Check requerido: **`ci-ok`** | 🔴 pendiente | Nombre exacto. Ver abajo por qué no puede ser otro |
| Rama al día antes del merge | 🔴 pendiente | |
| Commits firmados | 🔴 pendiente | |
| Prohibido force-push y borrado de `main` | 🔴 pendiente | |
| Sin bypass para nadie (admins incluidos) | 🔴 pendiente | Toda excepción concedida se escribe acá con su motivo |

Lo que el equipo decida **no** activar se declara acá como diferido, con su
motivo y el issue que lo rastrea. Nunca se omite ni se presenta como activo.

## El check requerido es `ci-ok`, y no es un detalle

`ci-ok` es el veredicto agregado de `.github/workflows/ci.yml`: corre con
`if: always()` y **reporta en los dos carriles**, el de código y el de docs.

Exigir un job que solo reporta en un carril —`build-test`, que en un PR de solo
documentación queda `skipped`— deja ese carril bloqueado para siempre esperando
una señal que nunca llega. Un check `skipped` **no reporta**. Es el error más
caro y más silencioso de la configuración inicial.

## Aplicarla desde cero

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
5. **Bypass list: vacía.**
6. Actualizar la tabla de estado real en el mismo PR.

## Contrastar lo escrito contra la configuración real

```bash
gh api repos/{{ORG}}/{{PROYECTO}}/rulesets --jq '.[] | "\(.id)  \(.name)  \(.enforcement)"'
gh api repos/{{ORG}}/{{PROYECTO}}/rulesets/<id> --jq '.rules[] | .type'
gh api repos/{{ORG}}/{{PROYECTO}}/rulesets/<id> --jq '.bypass_actors'
```

Si la salida no coincide con la tabla, manda la salida: el documento está
desactualizado y se corrige en el acto.
