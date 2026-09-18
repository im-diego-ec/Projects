# Protección de `main` en {{PROYECTO}} — estado real y cómo aplicarla

La protección de la rama de integración es un **acto humano deliberado**: nunca
se aplica desde el pipeline (un workflow con permiso para editar su propia
protección puede quitarla). Este documento es su **estado real** — el marco
exige que exista y que se actualice en el mismo cambio que modifique la
configuración.

> 🕳️ **Al crear el repo**: aplicá las cuatro reglas del primer bloque, pasá esos
> 🔴 a 🟢 con la fecha, escribí el motivo de las diferidas, y borrá este recuadro.
>
> **Y no antes de que el CI haya corrido una vez:** la comprobación `ci-ok` no aparece
> en la lista que ofrece el _ruleset_ —el conjunto de reglas de GitHub que protege una
> rama— hasta que exista una corrida que la
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

| Regla                                               | Estado      | Por qué no todavía                                                                                                                                                                        | **Condición que la reactiva**                                                                                                 |
| --------------------------------------------------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| **1 aprobación requerida** — enciéndela **primera** | 🔴 diferida | Con una sola persona programando, exigir la aprobación de otra y no dejar a nadie en la lista de excepciones **bloquea todo merge sin salida**                                            | El repo tiene **2 personas con permiso de escritura**                                                                         |
| Review de code owner requerido                      | 🔴 diferida | Es lo que convierte `CODEOWNERS` —el archivo que dice quién aprueba qué— en una condición real de merge; sin la fila de arriba no agrega nada, y con el equipo vacío no asignaría a nadie | La fila de arriba está encendida **y** quien `CODEOWNERS` nombra para aprobar las propuestas existe y no es quien las escribe |
| Rama al día antes del merge                         | 🔴 diferida | Útil con varios PRs en vuelo; con uno solo agrega una vuelta de CI por merge                                                                                                              | Hay **más de un PR en vuelo** de forma habitual                                                                               |
| Commits firmados                                    | 🔴 diferida | Exige que cada quien tenga su clave configurada; se enciende cuando todos la tengan, no antes                                                                                             | **Todos** los que pueden escribir tienen su clave configurada                                                                 |

⚠️ **La columna de la derecha no es decorativa: es lo que hace que esto se vuelva a
mirar.** Una postergación con motivo pero sin condición comprobable no se reevalúa
nunca — «cuando haya una segunda persona» no dice cómo se comprueba; «el repo tiene 2
personas con permiso de escritura» sí, y lo contesta un comando (en un shell POSIX, por
lo que se explica en «Contrastar lo escrito», más abajo):

```bash
gh api "repos/{{ORG}}/{{PROYECTO}}/collaborators" --jq '[.[] | select(.permissions.push)] | length'
```

⚠️ **Y la primera fila protege una aprobación del método, no sólo el flujo de git.**
`CODEOWNERS` le asigna a una persona distinta de quien programa las propuestas y los
acuerdos escritos de `openspec/`, y GitHub le pide el review sola. Pero con
**aprobaciones requeridas = 0** el autor puede integrar sin que esa persona haya mirado:
el archivo está bien escrito y esta opción lo desactiva en silencio. Por eso es la
primera que se enciende en cuanto haya con quién.

⚠️ **Encender las diferidas antes de tiempo es la forma más fácil de auto-encerrarse.**
Se probó: aprobación requerida + code owner + bypass vacía, con un equipo de una
persona, deja el repo sin ninguna vía de integrar. Aplicar este documento «pasando
los 🔴 a 🟢» sin leer esta nota es exactamente ese error.

Lo que el equipo decida **no** activar se declara acá como diferido, con su
motivo y el issue que lo rastrea. Nunca se omite ni se presenta como activo.

## El check requerido es `ci-ok`, y no es un detalle

`ci-ok` no hace trabajo propio: mira el resultado de todo lo demás que corre en
`.github/workflows/ci.yml` y lo resume en un sí o un no. Corre con `if: always()`
y **responde en los dos casos**, el cambio de código y el de solo documentación.

Exigir un trabajo que solo responde en uno de los dos —`build-test`, que en un pull
request de solo documentación queda salteado— deja ese caso bloqueado para siempre esperando
una señal que nunca llega. Un check `skipped` **no reporta**. Es el error más
caro y más silencioso de la configuración inicial.

## Aplicarla desde cero

1. **Settings → Rules → Rulesets → New ruleset → New branch ruleset**.
2. Nombre: `main-protegida`. Enforcement status: **Active**.
3. Target branches: **Include default branch**.
4. Reglas a marcar — **solo estas cuatro**, que son las de la primera tabla:
   - Restrict deletions
   - Block force pushes
   - Require a pull request before merging → **Required approvals: `0`**
   - Require status checks to pass → agregar el check **`ci-ok`** (aparece en la
     lista recién después de la primera corrida de CI: si no está, abrí un PR
     cualquiera primero)
5. **Reglas que NO se marcan todavía**, y son exactamente las de la segunda
   tabla: `Require signed commits`, `Required approvals: 1`,
   `Require review from Code Owners` y `Require branches to be up to date before
merging`. Marcarlas ahora es el auto-encierro que advierte la nota ⚠️ de más
   arriba — no es una omisión de esta lista, es su punto.
6. **Bypass list: vacía.**
7. Actualizar la tabla de estado real en el mismo PR.

## Contrastar lo escrito contra la configuración real

Los comandos de abajo **encadenan el `id` solos**: el segundo y el tercero lo necesitan,
y copiarlo a mano del primero es de donde salían los errores. Buscan el conjunto de
reglas por el nombre que le da el paso 2 de arriba, `main-protegida`:

```bash
gh api repos/{{ORG}}/{{PROYECTO}}/rulesets --jq '.[] | "\(.id)  \(.name)  \(.enforcement)"'

ID=$(gh api repos/{{ORG}}/{{PROYECTO}}/rulesets --jq '.[] | select(.name == "main-protegida") | .id')
gh api "repos/{{ORG}}/{{PROYECTO}}/rulesets/${ID:?no hay un ruleset llamado main-protegida}" --jq '.rules[].type'
gh api "repos/{{ORG}}/{{PROYECTO}}/rulesets/${ID}" --jq '.bypass_actors'
```

⚠️ **Corrélos en un shell POSIX**: bash o zsh; en Windows, Git Bash o WSL. PowerShell
les saca las comillas simples a los `--jq` y `gh` vuelve a partir el argumento por los
espacios —`accepts 1 arg(s), received 3`—, y `ID=$(...)` tampoco es suyo.

Si la salida no coincide con la tabla, manda la salida: el documento está
desactualizado y se corrige en el acto.
