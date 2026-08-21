---
name: projects-adoptar
description: Adoptar el marco Projects en un repo que YA existe (no nacido del scaffold) — llamar al workflow reusable conservando el nombre del check requerido, declarar permissions pull-requests read, cablear el censo de fuentes y la cobertura por diff, regenerar los artefactos del CLI al pin vigente y cerrar los archivos que el censo deja fuera de alcance. Usar cuando un proyecto existente tenga que empezar a consumir el marco.
allowed-tools: Bash(git:*), Bash(gh:*), Bash(node:*), Bash(npx:*), Bash(grep:*), Bash(awk:*), Bash(pnpm:*), Read, Edit, Write
metadata:
  author: Transformación Digital y Data
  version: "1.0"
---

# Adoptar el marco en un repo que ya existe

Un proyecto nuevo nace dentro del marco: el scaffold se copia antes del primer
commit. Un proyecto **que ya existe** se adopta **por partes, y sin big bang**,
empezando por lo referenciado: el `ci.yml` deja de contener la mecanica del
marco y pasa a llamarla.

Esto ya se hizo a mano una vez (la intranet) y se va a repetir en cada proyecto
que se sume. Todos los comandos se corren **desde la raiz del repo consumidor**,
salvo los que digan lo contrario.

---

## Antes de empezar

1. **Rama desde `main` actualizado**, atomica:

   ```bash
   git checkout main && git pull --ff-only && git checkout -b chore/adoptar-projects
   ```

2. **Acceso de Actions del marco.** Para que un repo **privado** pueda hacer
   `uses:` del marco, Projects necesita **Settings → Actions → General → Access =
   "Accessible from repositories in the organization"**.

   **Sintoma exacto si falta:** el consumidor falla con un error de
   **repositorio no encontrado** que parece un typo en la ruta del `uses:`. Se
   pierde media hora revisando la ruta, que esta bien.

   Eso se cambia en la configuracion del repo del **marco**, no del consumidor:
   es un ⚠️ que **requiere OK humano**. Si no esta puesto, **para** y pedilo.

3. **Este repo no edita el marco.** Si al consumidor le falta algo, o es un
   `input` que se agrega en Projects, o es un change de OpenSpec en Projects. Copiar
   un workflow del marco para editarlo aca es una frontera 🛑.

---

## Paso 1 — Reconocimiento: cual es el nombre del check requerido HOY

**Es el paso mas importante y el que produce el error mas caro de la migracion.**

```bash
gh api repos/<ORG>/<REPO>/rulesets --jq '.[] | "\(.id)  \(.name)  \(.enforcement)"'
gh api repos/<ORG>/<REPO>/rulesets/<id> --jq '.rules[] | select(.type=="required_status_checks") | .parameters.required_status_checks'
```

Anota el **nombre exacto** del check agregado que exige el ruleset (en los repos
del area es `ci-ok`). Y mira el `ci.yml` actual:

```bash
grep -n "name:\|jobs:\|needs:\|if:" .github/workflows/ci.yml
```

**El nombre del check agregado se CONSERVA tal cual.** Renombrar el job que
publica ese check le bloquea **todos** los PRs al repo, con un error que no
menciona a Projects por ningun lado: el ruleset espera para siempre una senal que
nadie va a emitir. Es el breaking mas caro del marco y el mas facil de cometer
sin darse cuenta.

Si el ruleset exige un check que **solo reporta en un carril** —`build-test`,
por ejemplo, que en un PR de solo docs queda `skipped`—, ese carril esta
bloqueado desde antes de esta migracion. Un check `skipped` **no reporta nunca**.
Ya paso: el ruleset de otro repo vivio una semana entera pidiendo el check
equivocado (2026-07-29 → 2026-08-05). Arreglarlo es parte de esta adopcion, y va
al final (paso 7), cuando el check nuevo ya haya corrido al menos una vez.

---

## Paso 2 — Reemplazar los jobs de marco por la llamada al reusable

Sale del `ci.yml` del consumidor **toda la mecanica del marco**: deteccion del
carril de docs, guardrail de deltas de OpenSpec, validacion estricta. Entra una
llamada:

```yaml
jobs:
  # Lo que hereda del marco, por VERSION EXACTA. El bump a la version siguiente
  # lo propone Dependabot como PR: el rojo de un check nuevo se lee ahi, no en
  # main. Nunca @v1 —un tag movil no produce PR y este repo no entraria al censo.
  marco:
    uses: im-diego-ec/Projects/.github/workflows/marco-ci.yml@v1.4.1
    permissions:
      contents: read
      pull-requests: read

  # Lo del PRODUCTO. Se omite cuando el cambio no altera lo que se sirve.
  build_test:
    name: build-test
    needs: marco
    if: needs.marco.outputs.solo_docs == 'false'
    runs-on: ubuntu-latest
    steps:
      # Los pasos que este repo YA tenia, tal cual, mas el censo y la cobertura
      # que se cablean en el paso 4. NO dejes esta lista vacia: `steps: []` es
      # un error de sintaxis —actionlint dice `"steps" section should not be
      # empty` y GitHub rechaza el workflow—, asi que el repo quedaria en rojo
      # justo por el archivo que viniste a arreglar.
      - uses: actions/checkout@v7
        with:
          fetch-depth: 0

  # EL CHECK REQUERIDO. El nombre sale del paso 1 y NO se cambia.
  ci_ok:
    name: ci-ok
    needs: [marco, build_test]
    if: always()
    runs-on: ubuntu-latest
    steps:
      - name: Veredicto
        shell: bash
        run: |
          [ "${{ needs.marco.result }}" = "success" ] || { echo "::error::el CI de marco fallo"; exit 1; }
          if [ "${{ needs.build_test.result }}" = "success" ]; then exit 0; fi
          if [ "${{ needs.build_test.result }}" = "skipped" ] && [ "${{ needs.marco.outputs.solo_docs }}" = "true" ]; then
            echo "solo docs: build-test omitido a proposito"; exit 0
          fi
          echo "::error::build-test termino en '${{ needs.build_test.result }}'"; exit 1
```

La referencia armada y comentada esta en
[`plantilla/.github/workflows/ci.yml`](../../../plantilla/.github/workflows/ci.yml)
del marco; el catalogo de `inputs`/`outputs` del reusable, en el encabezado de
`.github/workflows/marco-ci.yml`.

**Lo especifico del proyecto se queda donde esta**: el deploy con su topologia de
infraestructura, las migraciones, las sondas. Eso no es marco.

**Verificacion del paso 2** — la definicion parsea y los jobs viejos ya no estan:

```bash
grep -nE "projects/\.github/workflows/marco-ci\.yml@v[0-9]+\.[0-9]+\.[0-9]+" .github/workflows/ci.yml
grep -rn "openspec validate\|check-openspec-deltas" .github/workflows/
```

El segundo grep tiene que quedar **vacio**: si sigue habiendo mecanica copiada,
hay dos copias del mismo check y la divergencia es cuestion de tiempo.

---

## Paso 3 — `permissions` en el workflow LLAMADOR

```yaml
permissions:
  contents: read
  pull-requests: read
```

Va **al nivel del workflow** (ademas del job `marco`, como en el ejemplo del paso
2). **Un workflow reusable nunca recibe mas permisos que los que le concede quien
lo llama**: si aca falta `pull-requests: read`, el marco no lo puede arreglar
desde su lado.

**Que pasa exactamente si falta.** El job que detecta el carril de docs no puede
listar los archivos del PR, la API devuelve **403**, la deteccion cae al
**fail-open** y **todo PR corre el CI completo**. En otro repo eso duro
**una semana entera sin que nadie se enterara** (2026-08-05): el carril rapido
simplemente nunca actuo, y como el resultado era "correr de mas", nada se puso
rojo.

**Sintoma exacto hoy:** en el log del job de deteccion aparece un `::warning::`
nombrando el permiso faltante, y la salida `solo_docs` vale `false` **siempre**,
incluso en un PR que solo toca `*.md`.

**Verificacion del paso 3:**

```bash
grep -n -A3 "^permissions:" .github/workflows/ci.yml
```

Tienen que estar las dos lineas. Y despues del primer PR, la comprobacion real:
un PR de solo documentacion tiene que dejar `build-test` en `skipped` y `ci-ok`
en verde.

---

## Paso 4 — Cablear el censo de fuentes y la cobertura por diff

Las dos actions van **dentro del job del producto**, y el orden no es
preferencia:

```yaml
    steps:
      - uses: actions/checkout@v7
        with:
          # Lo pide cobertura-diff: mide las lineas del PR contra su commit BASE,
          # y con el default (1) ese commit no esta en el clon.
          fetch-depth: 0

      # ... install de dependencias y generacion de clientes ...

      # DESPUES del install: el censo EJECUTA el toolchain del repo para
      # preguntarle que archivos ve. Sin dependencias instaladas emite un
      # ::warning:: ruidoso en vez de pasar en verde.
      - uses: im-diego-ec/Projects/actions/censo-fuentes@v1.4.1

      # ... lint, typecheck, tests ...

      # DESPUES de los tests: consume los lcov que las suites acaban de escribir.
      - uses: im-diego-ec/Projects/actions/cobertura-diff@v1.4.1

      # ... builds ...
```

**El censo no es opcional.** El job `higiene` del reusable comprueba
estaticamente que algun workflow del repo invoque `actions/censo-fuentes`, y si
no lo encuentra **da rojo con el paso listo para pegar**. Es decir: adoptar el
marco sin cablear el censo deja el repo en rojo desde el primer PR. Van en el
mismo cambio.

**Verificacion del paso 4:**

```bash
grep -n "censo-fuentes\|cobertura-diff\|fetch-depth" .github/workflows/ci.yml
```

---

## Paso 5 — Regenerar los artefactos del CLI al pin vigente

El marco pina la **version** del CLI de OpenSpec; cada repo **regenera** sus
skills y comandos con esa version. No se copian del marco: vendorarlas congelaria
para todos la version que las genero.

Averigua el pin **desde un checkout del marco** — no esta escrito en el repo
consumidor: vive en el `default` del input `version_openspec` del workflow
reusable, y el consumidor lo hereda sin repetirlo.

```bash
awk '/^      version_openspec:/{f=1} f && /default:/{print; exit}' .github/workflows/marco-ci.yml
```

**Verificacion:** imprime una linea `default: "X.Y.Z"` con un numero de verdad
(al 2026-08-19, `default: "1.9.0"`). Si imprime vacio, no estas en el checkout
del marco.

No lo busques con `grep -rn "@fission-ai/openspec@" .github/`: en el marco
devuelve lineas donde la version es una variable de shell (`${VERSION_OPENSPEC}`,
`${PIN}`) y **en el consumidor no devuelve nada** — en los dos casos te quedas
sin numero y el `npx` de abajo termina en una adivinanza.

Y en el consumidor, con ese `X.Y.Z`:

```bash
# repo que ya tiene herramientas configuradas
npx --yes @fission-ai/openspec@X.Y.Z update --force

# repo que todavia no tiene nada
npx --yes @fission-ai/openspec@X.Y.Z init --tools claude
```

Actualiza tambien los patrones del allowlist del agente en
`.claude/settings.json`: el permiso se concede por **coincidencia literal de
texto**, asi que ese es el unico lugar que repite el numero a la fuerza y el
unico que envejece sin que nadie se entere.

**Verificacion del paso 5** — todos los artefactos declarando la misma version:

```bash
grep -rn "generatedBy" .claude/ | sort -u
grep -rn "@fission-ai/openspec@" .claude/settings.json
```

Los archivos regenerados **si se commitean**; lo que no se hace es editarlos a
mano (una edicion manual se pierde en la regeneracion siguiente, sin dejar
rastro).

> **Trampa fina y real: no escribas esa cadena con dos puntos dentro de
> `.claude/`.** El check "Artefactos regenerados al dia" del marco hace
> `grep -r` de la palabra `generatedBy` **seguida de dos puntos** sobre todo
> `.claude/` y pone en **rojo** cualquier linea cuya version no sea la del pin.
> No distingue un artefacto generado de un ejemplo escrito en una skill o en un
> README que viva ahi adentro. Por eso los greps de arriba van **sin** los dos
> puntos: un ejemplo con una version vieja pegado en un documento dentro de
> `.claude/` da rojo en el CI de todos los PRs, y el mensaje habla de artefactos
> desactualizados que no existen.

---

## Paso 6 — Correr el censo y CUBRIR lo que aparezca

Con las dependencias ya instaladas, desde la raiz del consumidor:

```bash
pnpm install --frozen-lockfile
node "<ruta-local-al-repo-del-marco>/actions/censo-fuentes/censo-fuentes.mjs"
```

### La trampa principal: la primera corrida va a dar una LISTA, y eso es normal

Un repo que nunca fue censado **siempre** tiene archivos fuera de alcance: son
los que ninguna herramienta mira —ni el analizador estatico ni ningun programa de
tipos—, asi que hoy no tienen lint ni tipos y sus errores llegan a produccion sin
poner nada en rojo. **La lista no es una falla de la adopcion: es el hallazgo que
la justifica.**

**El principio es CUBRIR antes que EXCLUIR.** En el consumidor de origen se
cerraron **23 archivos cubriendolos**, y de todo el repo quedo **una sola
exclusion declarada** — la configuracion del propio linter, que ninguna suite
puede importar para medirla — con su motivo escrito. Ese es el estandar, no una
aspiracion: la exclusion es el ultimo recurso, no el primero.

Como se ve el estandar, hoy, corriendo el censo en ese repo: 152 archivos fuente
dentro del alcance, `1 exclusión(es) declarada(s) con motivo` y `EXIT=0`.

Para cada archivo que el censo nombre, hay tres salidas, y las dos primeras van
antes que la tercera:

1. **Incluirlo en un programa de tipos** — agregarlo al `include`/`files` del
   `tsconfig` de su paquete, o crear el `tsconfig` que lo declare.
2. **Ampliar el alcance del analizador** — acotar el patron de `ignores` que se
   lo esta tragando. Para ver quien lo ignora:
   `pnpm exec eslint <ruta-del-archivo>`.
3. **Declararlo excluido CON MOTIVO**, en el `package.json` de **su** paquete:

   ```json
   "projects": { "cobertura": { "excluidos": [
     { "patron": "ruta/relativa/al/paquete", "motivo": "por que este archivo no lo mira nadie" }
   ] } }
   ```

Una exclusion no vuelve imposible la evasion: la vuelve **visible**, en un diff,
bajo review. Y una exclusion que deja de corresponder a un archivo rastreado
tambien es rojo ("exclusion muerta"), asi que no se acumulan en silencio.

**Verificacion del paso 6** — el censo en verde, sin agujeros y sin exclusiones
muertas:

```bash
node "<ruta-local-al-repo-del-marco>/actions/censo-fuentes/censo-fuentes.mjs"; echo "EXIT=$?"
```

`EXIT=0`. Y si aparece un `::warning::` diciendo que no encontro a quien
preguntarle, **no es un verde**: falta el install.

---

## Paso 7 — Cerrar: PR, primera corrida, y recien despues el ruleset

```bash
git add -A
git commit -m "chore(ci): adoptar el marco por referencia — la mecanica deja de vivir en este repo"
git push -u origin chore/adoptar-projects
gh pr create --title "chore(ci): adoptar Projects" --body "Closes #<issue>"
```

**Verificacion del paso 7**, en este orden:

```bash
gh pr checks <numero> --watch
gh run view <run-id>
```

- El check agregado (`ci-ok`) en **verde**, con el **mismo nombre** que exige el
  ruleset.
- Un PR de solo docs deja `build-test` en `skipped` y `ci-ok` igual en verde.
- Los pasos del censo y de la cobertura **ejecutados**, no omitidos.

Si el ruleset exigia el check equivocado (paso 1), **ahora** es el momento de
corregirlo, y es un acto humano deliberado por la UI, no desde el pipeline.
Ojo con el orden: **un check no aparece en la lista de GitHub hasta que corrio al
menos una vez**. Si no esta en la lista, no es que este mal escrito: todavia no
existe para GitHub.

---

## Lo que se adopta despues, pieza por pieza

Lo referenciado (pasos 2 a 4) es lo primero porque se actualiza solo. El
scaffold viene despues y a su ritmo: `AGENTS.md`, `CODEOWNERS`, plantilla de PR,
plantillas de docs, sustituyendo los marcadores por los valores que el proyecto
ya usa.

Verificacion de que no quedo ninguno sin sustituir (mayusculas obligatorias, para
no confundirlos con las expresiones de GitHub Actions):

```bash
grep -rnE "\{\{[A-Z0-9_]+\}\}" . --exclude-dir=node_modules --exclude-dir=.git
```

El marco tambien lo verifica solo: el check "Sin marcadores del scaffold sin
resolver" del job `higiene` pone en rojo cualquier marcador que sobreviva.

---

## Trampas conocidas, resumidas

| Trampa | Sintoma exacto | Que hacer |
|---|---|---|
| Renombrar el job del check agregado | Todos los PRs quedan esperando un check que nadie emite; el error no menciona a Projects | Conservar el nombre exacto que exige el ruleset (paso 1) |
| Check requerido que solo reporta en un carril | Un PR de solo docs no se puede mergear nunca: su check queda `skipped` y no reporta | El requerido es el **veredicto agregado**, que corre con `if: always()` |
| Falta `pull-requests: read` en el llamador | 403 al listar los archivos del PR, `::warning::` en el job de deteccion y `solo_docs` siempre `false` | Declararlo a nivel de workflow **y** en el job `marco` |
| Adoptar el marco sin cablear el censo | Rojo del check "Censo de fuentes cableado", con el paso listo para pegar | Cablear censo y cobertura en el mismo cambio |
| Pinar el `uses:` a `@v1` | Dependabot **no propone ningun bump** (para el, `v1` ya es la mayor vigente), asi que el repo no recibe versiones nuevas por PR y **no aparece en el censo de consumidores**. No falla: se queda callado | Pinar la **version exacta** `vX.Y.Z` y dejar el marco en su propio grupo de `dependabot.yml` |
| `fetch-depth` por defecto | La cobertura por diff falla porque el commit base no esta en el clon | `fetch-depth: 0` en el checkout |
| La lista del censo asusta | Decenas de archivos fuera de alcance en la primera corrida | Es lo esperado. **Cubrir antes que excluir**: 23 archivos cerrados cubriendolos y UNA sola exclusion declarada en todo el repo, en el consumidor de origen |
| Repo privado sin acceso de Actions | Error de repositorio no encontrado que parece un typo en la ruta del `uses:` | Habilitar el acceso en el repo del **marco** (requiere OK humano) |
| Ejemplos con la marca de version dentro de `.claude/` | Rojo de "artefactos generados por una version distinta al pin" sobre un archivo que no genero ningun CLI | No escribir esa cadena con dos puntos en documentos que vivan bajo `.claude/` |

## Checklist

- [ ] Acceso de Actions del marco habilitado (repos privados)
- [ ] Nombre exacto del check requerido, leido del ruleset ANTES de tocar el `ci.yml`
- [ ] Mecanica del marco fuera del repo: cero `openspec validate` y cero guardrail copiados
- [ ] `uses: ...@vX.Y.Z` del reusable (**version exacta, nunca `@v1`**), con `needs`/`if` del carril de docs
- [ ] `.github/dependabot.yml` con el marco en **su propio grupo**, separado del `*` de actions
- [ ] `permissions: contents: read` + `pull-requests: read` en el llamador y en el job `marco`
- [ ] `censo-fuentes` despues del install; `cobertura-diff` despues de los tests; `fetch-depth: 0`
- [ ] Artefactos del CLI regenerados al pin vigente + allowlist de `.claude/settings.json` al dia
- [ ] Censo en verde: cada archivo cubierto, y las exclusiones que haya, con motivo escrito
- [ ] PR con `Closes #<issue>` desde la creacion y el check agregado en verde
- [ ] Ruleset apuntando al veredicto agregado (corregido despues de la primera corrida)
