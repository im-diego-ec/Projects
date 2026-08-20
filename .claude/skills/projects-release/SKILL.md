---
name: projects-release
description: Cortar y publicar una version del marco Projects — CHANGELOG, PR de release, tag inmutable vX.Y.Z, tag movil vX y notas del release en GitHub. Usar cuando haya que publicar una version del marco, mover el tag v1, o cuando alguien pregunte como se saca una version de Projects.
allowed-tools: Bash(git:*), Bash(gh:*), Bash(grep:*), Bash(sed:*), Bash(awk:*), Bash(mktemp:*), Bash(node:*), Bash(head:*), Bash(wc:*), Read, Edit
metadata:
  author: Transformación Digital y Data
  version: "1.0"
---

# Cortar una version del marco

Publicar una version de Projects son **seis pasos con orden obligatorio**. No es un
`git tag` con ceremonia: `v1` es un tag **movil** y cada consumidor que hace
`uses: im-diego-ec/Projects/...@v1` recibe el cambio **sin tocar una sola
linea de su repo**. Un release a medias no deja un repo a medias: deja pipelines
ajenos corriendo codigo que nadie les anuncio.

Todos los comandos se corren **desde la raiz del repo del marco**
(`im-diego-ec/Projects`), sobre `main` actualizado, y **en Git Bash** (usan
`awk`, `sed` y `$(mktemp -d)`; en PowerShell no corren tal cual).

---

## Antes de empezar: tres precondiciones. Si falta una, PARA

1. **OK humano explicito para mover `v1`.** Mover el tag mayor es una frontera
   ⚠️ de `AGENTS.md`. La skill llega hasta el paso 4 y **se detiene** a pedirlo.
   No lo asumas por el hecho de que te hayan pedido "sacar la version".
2. **El cambio ya se probo contra un consumidor real.** Publicar sin eso es una
   frontera 🛑 de `AGENTS.md`. El procedimiento esta en la skill
   `projects-validar-consumidor`; la evidencia es un id de corrida verde sobre el
   SHA que se va a taguear. Si no existe esa evidencia, para y consegui la.
3. **El `CHANGELOG.md` ya tiene las entradas.** El changelog se escribe en el PR
   que introduce cada cambio, no en el release. Si `## [No publicado]` dice
   "Nada todavia", **no hay version que cortar**: lo que hay es un cambio que se
   mergeo sin su entrada, y eso se arregla antes.

Verificacion de la 3, antes de nada:

```bash
sed -n "/^## \[No publicado\]/,/^## \[/p" CHANGELOG.md
```

---

## Elegir el numero: X.Y.Z

- **PATCH** — correccion de comportamiento dentro del contrato ya publicado.
- **MINOR** — capacidad nueva compatible: un `input` opcional, un workflow o una
  action nueva, un check adicional que no pone en rojo a nadie que hoy pasa.
- **MAJOR** — cambio incompatible. **`v1` no se mueve**: se abre la linea `v2` y
  los consumidores migran deliberadamente. Si dudas entre MINOR y MAJOR, **es
  MAJOR**: mover `v1` sobre un cambio breaking rompe repos ajenos en silencio.

Es breaking, entre otros: quitar o renombrar un `input`/`secret`/`output`,
volver requerido uno opcional, cambiar un default de forma que cambie el
comportamiento, **renombrar un job cuyo nombre publica un check** (le bloquea
todos los PRs a quien lo tenga como check requerido, con un error que no
menciona a Projects), exigir un permiso nuevo del token, o endurecer un check de
modo que un repo que hoy pasa manana falle.

---

## Paso 1 — Cortar el CHANGELOG

Rama desde `main` actualizado, atomica:

```bash
git checkout main && git pull --ff-only && git checkout -b release/vX.Y.Z
```

En `CHANGELOG.md`:

1. Renombrar el encabezado `## [No publicado]` a `## [X.Y.Z] — YYYY-MM-DD` con
   la fecha de hoy (raya larga y espacios, igual que las versiones anteriores).
2. Insertar arriba un `## [No publicado]` nuevo y vacio, con el mismo separador
   que usan las demas secciones:

```markdown
## [No publicado]

Nada todavia.

---
```

**Verificacion del paso 1** — los dos encabezados, en este orden:

```bash
grep -n "^## \[" CHANGELOG.md | head -4
```

Tiene que mostrar `## [No publicado]` primero y `## [X.Y.Z] — YYYY-MM-DD`
inmediatamente despues. Si la version nueva no aparece, o aparece sin fecha, el
paso no esta hecho.

Si el repo ya trae `actions/aviso-version/`, esta es la comprobacion barata de
que la entrada existe y es la que van a recibir los consumidores (arma el
mensaje y **no envia nada**, no necesita credenciales):

```bash
AVISO_VERSION=X.Y.Z node actions/aviso-version/aviso-version.mjs
```

---

## Paso 2 — PR de release

```bash
git add CHANGELOG.md
git commit -m "release: vX.Y.Z — <el efecto en una linea, en indicativo>"
git push -u origin release/vX.Y.Z
gh pr create --title "release: vX.Y.Z" --body "Corta la version que publica <...>. Evidencia contra consumidor real: <enlace a la corrida>."
```

Los commits van **firmados** (convencion del repo). No agregues `--no-verify` ni
`--no-gpg-sign` para destrabar nada.

**Verificacion del paso 2** — antes de pedir merge, mira que la rama traiga
**solo** tu commit (si aparecen commits ajenos, ramificaste mal):

```bash
git log --oneline origin/main..HEAD
gh pr checks <numero-del-pr> --watch
```

`ci-ok` tiene que quedar en `pass`. Es el veredicto agregado y el unico check
requerido.

---

## Paso 3 — Merge

Antes de mergear, dos comprobaciones — la segunda decide si el paso lo das vos o
lo da una persona:

```bash
gh pr view <numero-del-pr> --json mergeStateStatus,reviewDecision,isDraft
```

- **`mergeStateStatus`**: el ruleset de `main` exige la **rama al dia** antes de
  integrar (`strict_required_status_checks_policy`, 🟢 activa). Si `main` avanzo
  mientras corria el CI, esto dice `BEHIND` y el merge se rechaza. Se destraba
  con `gh pr update-branch <numero-del-pr>` — y despues **hay que esperar el CI
  otra vez**, porque el arbol cambio.
- **`reviewDecision`**: `AGENTS.md` exige **review cruzado** en todo PR. Si no
  dice `APPROVED`, **para y pedilo**; no lo mergees por tu cuenta.

  **Y ojo con el motivo por el que esto es una parada explicita y no un check:**
  en Projects las filas "1 aprobacion requerida" y "review de code owner requerido"
  del ruleset estan **diferidas a proposito** (ver `.github/proteccion-main.md`),
  asi que **GitHub te va a dejar mergear tu propio PR de release sin que nadie lo
  aprobe**. El unico que puede cerrar ese hueco hoy sos vos, parando aca.

Con la rama al dia y el review dado:

```bash
gh pr merge <numero-del-pr> --merge --delete-branch
git checkout main && git pull --ff-only
```

**Verificacion del paso 3** — el commit del release ya esta en `main` y el
CHANGELOG local muestra la version cortada:

```bash
git log -1 --oneline
grep -n "^## \[X.Y.Z\]" CHANGELOG.md
git rev-parse main
```

**Anota el SHA que imprime `git rev-parse main`.** Es el mismo para los pasos 4
y 5; abajo aparece como `<SHA>`.

---

## Paso 4 — Tag inmutable `vX.Y.Z`

```bash
git tag vX.Y.Z <SHA>
git push origin vX.Y.Z
```

**Verificacion del paso 4** — las tres salidas, sin excepcion:

```bash
git cat-file -t vX.Y.Z          # tiene que imprimir: commit
git rev-parse vX.Y.Z            # tiene que imprimir: <SHA>
git ls-remote --tags origin vX.Y.Z
```

Los tags de este repo son **ligeros** (`v1.0.0`, `v1.1.0` y `v1.2.0` lo son:
`git cat-file -t` imprime `commit` en los tres). Manten la convencion.

---

## Paso 5 — Mover el tag movil `vX` · PARA Y PEDI EL OK

**Este paso exige el OK humano explicito de la precondicion 1.** Si no lo
tenes en esta sesion, **detene el procedimiento aca** y pedilo, nombrando la
version y el SHA. No lo ejecutes "porque es obvio que sigue".

Con el OK dado:

```bash
git tag -f v1 <SHA>
git push origin v1 --force
```

**Sin `-m`, y sin `-a`.** Ver la trampa 2.

**Verificacion del paso 5** — las cuatro salidas:

```bash
git cat-file -t v1              # commit   (si dice "tag", esta mal: ver trampa 2)
git rev-parse v1                # <SHA>
git rev-parse v1^{commit}       # el MISMO <SHA> que la linea de arriba
git ls-remote --tags origin v1
```

En `git ls-remote` tiene que aparecer **una sola** linea `refs/tags/v1`. Si
aparece ademas una linea `refs/tags/v1^{}`, el tag quedo anotado y hay que
rehacerlo.

---

## Paso 6 — Publicar las notas del release en GitHub

**Este es el paso que se olvido en la practica.** No lo dejes para despues: es
el ultimo, no produce ningun diff local, y por eso el repo se ve terminado sin
el.

Armar el archivo de notas con la seccion exacta de esta version del CHANGELOG.
**No reescribas el texto a mano y no cuentes lineas**: el recorte sale de los
encabezados, sin aritmetica de tu parte. Reemplaza los tres `X.Y.Z` (los puntos
van escapados, que es lo que hace que `[1.2.0]` no matchee `[1x2x0]`):

```bash
NOTAS="$(mktemp -d)/notas-vX.Y.Z.md"
awk '/^## \[X\.Y\.Z\]/{f=1} f && /^## \[/ && !/^## \[X\.Y\.Z\]/{exit} f' CHANGELOG.md > "$NOTAS"
head -3 "$NOTAS"; echo "..."; wc -l < "$NOTAS"
```

**Verificacion del recorte, antes de publicar nada:** la primera linea tiene que
ser `## [X.Y.Z] — YYYY-MM-DD` y el conteo tiene que ser **mayor que 1**. Un
archivo de una sola linea (o vacio) significa que el patron no matcheo: estas a
punto de publicar un release con las notas en blanco. El archivo vive fuera del
repo a proposito, para que no se cuele en ningun `git add -A`.

Publicar:

```bash
gh release create vX.Y.Z --title "vX.Y.Z — <el mismo titulo del CHANGELOG>" --notes-file "$NOTAS"
```

**Verificacion del paso 6 — es la verificacion final del release entero:**

```bash
gh release list --limit 5
```

**`vX.Y.Z` tiene que aparecer en esa lista.** Si no aparece, el release NO esta
publicado por mucho que los tags existan y el PR este mergeado.

Y que no haya quedado en borrador:

```bash
gh release view vX.Y.Z --json tagName,name,isDraft,publishedAt
```

`isDraft` tiene que ser `false` y `publishedAt` tiene que traer fecha.

Si el repo tiene `.github/workflows/aviso-version.yml`, publicar el release es
ademas **lo que dispara el aviso a los consumidores**. Verificalo:

```bash
gh run list --workflow=aviso-version.yml --limit 3
```

Y la ultima comprobacion, que es la que cierra el circulo con el CHANGELOG: que
las notas publicadas traigan el cuerpo y no un titulo solo.

```bash
gh release view vX.Y.Z --json body --jq '.body | length'
```

Tiene que devolver un numero de varios cientos, no `0`.

El archivo de notas quedo en un temporal fuera del repo: no hay nada que borrar
del arbol de trabajo. Confirmalo con `git status --short`, que tiene que estar
limpio.

---

## Trampas conocidas

### Trampa 1 — el paso que se olvida es el ULTIMO

**Que paso.** El marco se releaseo tres veces (v1.0.0, v1.1.0, v1.2.0) y a la
tercera se publicaron los tags y **no se publicaron las notas del release**.

**Por que se olvida, y por que va a volver a pasar sin esta verificacion.** Los
cinco pasos anteriores dejan rastro local: un diff, un commit, un merge, dos
tags. El sexto ocurre entero del lado de GitHub y **no cambia una sola linea del
arbol de trabajo**. Cuando el paso 5 termina, `git status` esta limpio, `git
log` muestra el release y el repo se ve exactamente igual que si estuviera
terminado. Nada te lo recuerda.

**Sintoma exacto.** `git ls-remote --tags origin` muestra `vX.Y.Z` y `v1`
apuntando al commit correcto, y `gh release list` **no lista la version**. Los
consumidores ya estan recibiendo el codigo nuevo por `@v1` y no hay ninguna
pagina que les diga que cambio.

**Cierre.** El release no esta hecho hasta que `gh release list` muestre la
version. Esa comprobacion es el final del procedimiento, no un adorno.

### Trampa 2 — el tag movil se crea LIGERO, nunca anotado

**Que hacer.** `git tag -f v1 <SHA>` — sin `-m` y sin `-a`.

**Que pasa si le ponen `-m`.** `-m` implica `-a`: git crea un **objeto tag** y
la referencia `refs/tags/v1` pasa a apuntar a ese objeto, no al commit. Paso de
verdad y hubo que rehacer el tag.

**Sintoma exacto.**

```bash
git cat-file -t v1     # imprime "tag" en vez de "commit"
git rev-parse v1       # imprime el SHA del objeto tag
git rev-parse v1^{commit}   # imprime OTRO SHA: el del commit
```

Los dos `rev-parse` devuelven cosas distintas. En el remoto, `git ls-remote
--tags origin v1` muestra dos lineas: `refs/tags/v1` y `refs/tags/v1^{}`.

**Arreglo:**

```bash
git tag -f v1 <SHA>
git push origin v1 --force
git cat-file -t v1     # ahora si: commit
```

### Trampa 3 — el orden importa: `v1` se mueve DESPUES de cortar el CHANGELOG

Si el tag movil se mueve antes de que el CHANGELOG este cortado y mergeado a
`main`, **`v1` queda apuntando a un commit sin version**: en ese arbol la
seccion se sigue llamando `## [No publicado]`.

**Sintoma exacto.** Un consumidor que abre el CHANGELOG en `@v1` no encuentra la
version que le acaba de llegar; y si el repo tiene el aviso de version, el paso
que arma el mensaje se pone **rojo** porque no hay entrada del CHANGELOG para
`X.Y.Z`.

El orden 1 → 6 de esta skill es el orden. No se reordena por comodidad.

---

## Checklist del release

- [ ] Evidencia de validacion contra un consumidor real (id de corrida verde)
- [ ] `X.Y.Z` elegido con el criterio de semver; si es breaking, **no se mueve `v1`**
- [ ] CHANGELOG cortado: `## [X.Y.Z] — YYYY-MM-DD` + `## [No publicado]` nuevo y vacio
- [ ] PR de release con `ci-ok` en verde y solo tu commit en la rama
- [ ] `reviewDecision` en `APPROVED` (el ruleset NO lo exige hoy: la parada es tuya) y `mergeStateStatus` sin `BEHIND`
- [ ] Merge a `main` y `<SHA>` anotado
- [ ] `vX.Y.Z` creado y pusheado — `git cat-file -t` dice `commit`
- [ ] **OK humano explicito** antes de mover `v1`
- [ ] `v1` movido LIGERO — `git cat-file -t v1` dice `commit` y los dos `rev-parse` coinciden
- [ ] `gh release list` **muestra la version**, `isDraft` es `false` y el cuerpo de las notas no esta vacio
- [ ] Si existe el aviso de version: la corrida salio y no quedo en `::warning::`
