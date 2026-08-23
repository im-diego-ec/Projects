# Protección de `main` en {{PROYECTO}} — estado real y cómo aplicarla

La protección de la rama de integración es un **acto humano deliberado**: nunca
se aplica desde el pipeline (un workflow con permiso para editar su propia
protección puede quitarla). Este documento es su **estado real** — el marco
exige que exista y que se actualice en el mismo cambio que modifique la
configuración.

> 🕳️ **Al crear el repo**: aplicá las cuatro reglas del primer bloque, pasá esos
> 🔴 a 🟢 con la fecha, escribí el motivo de las diferidas, y borrá este recuadro.
>
> **Y no antes de que el CI haya corrido una vez:** el check `ci-ok` no aparece en
> la lista de checks disponibles del ruleset hasta que exista una corrida que lo
> haya reportado. El bootstrap entra a `main` por push directo; la protección se
> aplica después.

## Estado real

**Se encienden ahora.** Son las cuatro que el repo de referencia tiene funcionando,
y alcanzan para que nada entre a `main` sin pasar por un PR verde:

| Regla                                    | Estado       | Nota                                                  |
| ---------------------------------------- | ------------ | ----------------------------------------------------- |
| Requiere pull request para integrar      | 🔴 pendiente | Con **aprobaciones requeridas = 0** (ver abajo)       |
| Check requerido: **`ci-ok`**             | 🔴 pendiente | Nombre exacto. Ver abajo por qué no puede ser otro    |
| Prohibido borrar `main`                  | 🔴 pendiente |                                                       |
| Prohibido force-push                     | 🔴 pendiente |                                                       |
| Sin bypass para nadie (admins incluidos) | 🔴 pendiente | Toda excepción concedida se escribe acá con su motivo |

**Se dejan apagadas a propósito, y el motivo va escrito acá el día que se aplica la
protección** — no en un TODO aparte:

| Regla                          | Estado      | Por qué no todavía                                                                                                                                                       |
| ------------------------------ | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1 aprobación requerida         | 🔴 diferida | Con un solo builder efectivo, exigir una aprobación y dejar la bypass list vacía **bloquea todo merge sin salida**. Se enciende cuando el segundo builder esté operativo |
| Review de code owner requerido | 🔴 diferida | Es lo que convierte `CODEOWNERS` en gate; sin la fila de arriba no agrega nada, y con el equipo del PO vacío tampoco asignaría a nadie                                   |
| Rama al día antes del merge    | 🔴 diferida | Útil con varios PRs en vuelo; con uno solo agrega una vuelta de CI por merge                                                                                             |
| Commits firmados               | 🔴 diferida | Exige que cada quien tenga su clave configurada; se enciende cuando todos la tengan, no antes                                                                            |

⚠️ **Encender las diferidas antes de tiempo es la forma más fácil de auto-encerrarse.**
Se probó: aprobación requerida + code owner + bypass vacía, con un equipo de una
persona, deja el repo sin ninguna vía de integrar. Aplicar este documento «pasando
los 🔴 a 🟢» sin leer esta nota es exactamente ese error.

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
