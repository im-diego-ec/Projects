# Protección de `main` en Projects — estado real y cómo aplicarla

La capability `gobierno-contribucion` exige que la protección de la rama de
integración sea un **acto humano deliberado** (nunca aplicada desde el pipeline)
y que su **estado real** viva escrito en el repo. Este es ese documento para
Projects. El equivalente para los proyectos se copia del scaffold
([`plantilla/.github/proteccion-main.md`](../plantilla/.github/proteccion-main.md)).

## Estado real: **`main` no tiene ninguna protección activa, y hoy no puede tenerla**

> **La causa no es que nadie la haya aplicado: es el plan de la cuenta.** Medido el
> 2026-08-25 intentando aplicarla por las dos vías, con `gh` autenticado y con permiso
> de administrador sobre el repositorio:
>
> ```bash
> gh api -X POST repos/im-diego-ec/Projects/rulesets --input ruleset-main.json
> # -> 403 Upgrade to GitHub Pro or make this repository public to enable this feature
>
> gh api -X PUT repos/im-diego-ec/Projects/branches/main/protection --input -
> # -> 403 el mismo mensaje
> ```
>
> GitHub no ofrece protección de rama en repositorios **privados** del plan gratuito.
> Este repositorio es privado a propósito, así que la compuerta no existe y **no
> depende de que alguien se acuerde de encenderla**. Las tres salidas, escritas para
> que la decisión sea explícita y no un olvido:
>
> | Salida | Qué desbloquea | Qué cuesta |
> |---|---|---|
> | GitHub Pro en la cuenta personal | Rulesets sobre repos privados | Una suscripción mensual |
> | Mover el repositorio a una organización con plan Team | Lo mismo, más equipos reales en `CODEOWNERS` | Una suscripción por asiento |
> | Hacer el repositorio público | Lo mismo, gratis | Publica el contenido |
>
> Mientras ninguna se tome, lo único que separa a `main` de un push equivocado es el
> hook `pre-push` de [`herramientas/hooks/`](../herramientas/hooks/), que es
> **client-side y se salta con `--no-verify`**. Eso no es una compuerta: es un cinturón
> que uno mismo se abrocha, y este documento lo dice para que nadie lo confunda con la
> protección que describe el resto de la página.
>
> El ruleset ya está escrito y probado como JSON válido: cuando alguna de las tres
> salidas se tome, se aplica en un comando. Está más abajo, en «Cómo aplicarla».


Medido el 2026-08-24, con los dos endpoints que cubren las dos formas en que
GitHub puede proteger una rama —el moderno (rulesets) y el heredado (branch
protection)—:

```bash
gh api repos/im-diego-ec/Projects/rulesets              # -> []
gh api repos/im-diego-ec/Projects/branches/main/protection  # -> 404
```

`[]` significa que no hay ningún ruleset, ni activo ni en `evaluate`. El `404`
del segundo no es un error de permisos ni una ruta mal escrita: es lo que
devuelve la API cuando la rama existe y **no tiene protección heredada**. Las
dos puertas, cerradas por el mismo motivo: no hay nada configurado.

| Regla | Estado | Nota |
|---|---|---|
| Requiere pull request para integrar | 🔴 no configurada | Hoy un push directo a `main` entra |
| Check requerido: **`ci-ok`** | 🔴 no configurada | El check corre y reporta; nadie lo exige. Ver abajo por qué, cuando se exija, no puede ser otro |
| Rama al día antes del merge | 🔴 no configurada | `strict_required_status_checks_policy` |
| Prohibido force-push y borrado de `main` | 🔴 no configurada | Reglas `non_fast_forward` y `deletion` |
| Sin bypass para nadie (admins incluidos) | 🔴 no aplica | Sin ruleset no hay `bypass_actors` que vaciar |
| 1 aprobación requerida | 🔴 diferida | Con un solo colaborador operativo bloquearía todo merge |
| Review de code owner requerido | 🔴 diferida | Ver [`CODEOWNERS`](CODEOWNERS): con un único owner que además escribe los PRs, GitHub no le pide review a nadie —solicita a los owners **excepto** al autor— y activar esta regla bloquearía todo merge en vez de endurecer nada |
| Commits firmados | 🔴 no configurada | Requiere GPG operativo en todas las máquinas |

### Por qué este documento decía otra cosa

Hasta este cambio esta sección declaraba un ruleset `main-protegida` con id
`20876718` y `enforcement: active` desde el 2026-08-14, y cinco filas en 🟢. La
medición de arriba lo desmiente entera. **Con lo que se puede leer desde acá no
se reconstruye qué pasó** —si el ruleset se creó y se borró, o si nunca llegó a
existir y el documento se escribió por adelantado—, y esa parte se deja sin
respuesta en vez de rellenarla.

Lo que sí queda dicho, porque es el punto: un repo que **afirma** una compuerta
que no existe está peor que uno que no afirma ninguna. El que la lee deja de
buscar, y el `ci-ok` que se ve verde en cada PR se lee como si algo lo estuviera
exigiendo. El spec `gobierno-contribucion` pide que el estado real viva escrito
en el repo; el estado real es el de la tabla de arriba, y se remide con los dos
comandos de arriba antes de creerle a esta página.

Las filas diferidas lo están **a propósito** y con su motivo escrito, que es lo
que el spec exige de lo que no se activa. Cada cambio posterior de la
configuración se refleja acá en el mismo PR que lo introduce.

## El check requerido es `ci-ok`, y no es un detalle

`ci-ok` es el veredicto agregado de [`workflows/ci.yml`](workflows/ci.yml):
corre con `if: always()` y **reporta en los dos carriles**, el de código y el de
docs.

Exigir un job que solo reporta en un carril —`build-test`, por ejemplo, que en
un PR de solo documentación queda `skipped`— deja ese carril bloqueado para
siempre esperando una señal que nunca llega. Ya pasó: un carril quedó bloqueado una
semana entera (2026-07-29 → 2026-08-05). Un check `skipped` **no reporta**.

## Aplicarla desde cero

**Esto es lo pendiente, no un apéndice histórico**: la tabla de arriba está
entera en 🔴, así que estos pasos son los que quedan por dar. Por UI, que es
donde el acto queda con autor y fecha:

1. **Settings → Rules → Rulesets → New ruleset → New branch ruleset**.
2. Nombre: `main-protegida`. Enforcement status: **Active**.
3. Target branches: **Include default branch**.
4. Reglas a marcar:
   - Restrict deletions
   - Block force pushes
   - Require a pull request before merging, con **0 aprobaciones requeridas** y
     el review de code owners **apagado**. Las dos se suben cuando haya más de
     una persona con escritura: hoy activarlas no endurece nada, bloquea todo
     merge, porque GitHub pide review a los owners excepto al autor y el único
     owner es quien escribe los PRs (ver [`CODEOWNERS`](CODEOWNERS))
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

Los dos que deciden si hay algo o no hay nada, y que son los que produjeron la
tabla de arriba:

```bash
gh api repos/im-diego-ec/Projects/rulesets
gh api repos/im-diego-ec/Projects/branches/main/protection
```

**Los dos, no uno.** Un ruleset vacío no descarta una protección heredada, y una
protección heredada ausente no descarta un ruleset: preguntar por una sola de
las dos puertas es cómo se escribe un «no hay nada» que puede ser falso.

Y una vez que exista un ruleset, el desglose de lo que trae:

```bash
gh api repos/im-diego-ec/Projects/rulesets --jq '.[] | "\(.id)  \(.name)  \(.enforcement)"'
gh api repos/im-diego-ec/Projects/rulesets/<id> --jq '.rules[] | .type'
gh api repos/im-diego-ec/Projects/rulesets/<id> --jq '.bypass_actors'
```

Si la salida no coincide con la tabla de estado real, **manda la salida**: el
documento está desactualizado y se corrige en el acto. Ya pasó una vez, y en la
dirección cara —el archivo declaraba cinco reglas activas sobre un repo sin
ninguna—, así que la regla acá no es «actualizarlo cuando cambie la
configuración» sino **remedirlo antes de citarlo**.

## Nada de esto se automatiza desde el pipeline

Un workflow que se otorgue permiso para editar su propia protección de rama
puede quitarla. La protección se aplica a mano, se documenta acá, y el CI solo
la ejerce.
