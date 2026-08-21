---
name: projects-validar-consumidor
description: Probar un cambio del marco Projects contra un repo consumidor real ANTES de mover el tag movil v1 — rama temporal con el uses pineado al SHA, PR en borrador NO MERGEAR, evidencia de los jobs y cierre con --delete-branch. Usar antes de cualquier release del marco o cuando haya que verificar que un workflow o action nueva funciona en un repo de verdad.
allowed-tools: Bash(git:*), Bash(gh:*), Bash(grep:*), Bash(sed:*), Read, Edit
metadata:
  author: Transformación Digital y Data
  version: "1.0"
---

# Validar un cambio del marco contra un consumidor real

**Publicar un cambio del marco que no se probo contra un consumidor real es una
frontera 🛑 de `AGENTS.md`.** El CI del propio Projects no alcanza: el marco se
dogfoodea, pero no tiene manifiestos de paquete propios, ni un deploy, ni el
arbol de un producto — asi que hay checks que **sobre este repo no verifican
nada**. La validacion contra un consumidor se hizo dos veces y **las dos veces
encontro un defecto que el CI del marco no veia**.

Esta skill se corre **antes** de la skill `projects-release`, y su salida (un id de
corrida verde sobre un SHA concreto) es la evidencia que el release exige.

---

## Antes de empezar: PARA y pedi el OK

Este procedimiento **escribe en el repo de un consumidor**: crea una rama, la
pushea y abre un PR. `AGENTS.md` prohibe 🛑 escribir en el repo de un proyecto
consumidor desde una sesion de Projects.

**La skill se detiene aca y pide OK humano explicito**, nombrando: que repo
consumidor, que SHA del marco se va a probar y que la rama y el PR se borran al
terminar. Sin ese OK en esta sesion, no se pushea nada.

Lo que **nunca** hace falta pedir permiso para hacer, porque no escribe nada:
leer el repo consumidor, mirar sus workflows y sus corridas.

---

## Paso 1 — El SHA que se va a probar

Desde el repo del marco, con la rama del cambio ya pusheada:

```bash
git rev-parse HEAD
git log -1 --oneline
git status --short
```

**El pin va al SHA completo de 40 caracteres, no a la rama.** Un pin a rama es
un pin movil: lo que corre del otro lado cambia sin que el archivo cambie, que es
justo lo contrario de lo que se quiere para juntar evidencia. La evidencia tiene
que corresponder a un arbol inmutable.

`git status --short` tiene que estar limpio: si tenes cambios sin commitear, el
SHA no representa lo que vas a probar.

---

## Paso 2 — Rama temporal en el consumidor

En el repo consumidor (`proyecto-origen`, `intranet`, el que sea):

```bash
git checkout main && git pull --ff-only && git checkout -b chore/validar-projects-<sha-corto>
```

Reemplazar el `@v1` por el SHA en las invocaciones del marco. Primero mira
cuantas hay y donde:

```bash
grep -rn "projects/.github/workflows\|projects/actions" .github/workflows/
```

Despues sustitui (en Git Bash; en PowerShell usa el editor o `Edit`):

```bash
sed -i "s|\(im-diego-ec/Projects/[^@]*\)@v1|\1@<SHA-COMPLETO>|g" .github/workflows/*.yml
```

**Verificacion del paso 2** — no puede quedar ni un `@v1` sin pinear, ni una sola
linea pineada a otra cosa:

```bash
grep -rn "projects/.*@" .github/workflows/
```

Todas las lineas del marco tienen que terminar en el mismo SHA. Una sola que se
quede en `@v1` invalida la prueba entera: esa pieza corre la version publicada,
no la que estas probando, y el verde no significa lo que creerias.

---

## Paso 3 — PR en BORRADOR, titulado NO MERGEAR

```bash
git add .github/workflows/
git commit -m "chore(ci): pin temporal a projects@<sha-corto> para validar el marco — NO MERGEAR"
git push -u origin chore/validar-projects-<sha-corto>
gh pr create --draft \
  --title "NO MERGEAR — validacion de projects@<sha-corto>" \
  --body "Pin TEMPORAL de los workflows del marco al SHA <SHA-COMPLETO> para validar un cambio de Projects antes de mover el tag v1. Este PR NO se mergea: se cierra con --delete-branch cuando la evidencia este recogida. Ver <enlace al PR del marco>."
```

**Borrador y titulo explicito no son cortesia:** el PR va a estar verde, y un PR
verde sin una senal ruidosa es un PR que alguien mergea de buena fe. Si se
mergeara, el consumidor quedaria pineado a un SHA para siempre — un pin
"temporal" que se queda es lo que `AGENTS.md` prohibe.

**Verificacion del paso 3:**

```bash
gh pr view <numero> --json isDraft,title,headRefName
```

`isDraft` tiene que ser `true`.

---

## Trampa 1 — sin PR no corre NADA

El CI de un consumidor dispara en `pull_request` y en `push` a `main`. Una rama
pusheada **sin PR abierto no dispara ninguna corrida**.

**Sintoma exacto:** pusheaste, esperaste, y

```bash
gh run list --branch chore/validar-projects-<sha-corto>
```

no devuelve **ninguna** fila. No es que la corrida tarde: no existe. Y es facil
leerlo como "todavia no arranco" y seguir esperando.

Por eso el paso 3 es obligatorio y no una formalidad de proceso: **el PR es el
disparador**.

---

## Paso 4 — Recoger la evidencia

```bash
gh pr checks <numero> --watch
gh run list --branch chore/validar-projects-<sha-corto> --limit 5
gh run view <run-id>
gh run view <run-id> --log-failed
```

Lo que hay que mirar, y no solo el color:

- El **veredicto agregado** (`ci-ok`) en verde.
- Que el **carril de docs** haya decidido lo que tenia que decidir: si el job de
  deteccion emitio `::warning::`, la deteccion fallo y el pipeline corrio de mas
  por el camino conservador. Verde, pero no es la senal que buscabas.
- Los checks **nuevos** que trae el cambio del marco: que hayan corrido de
  verdad, no que esten `skipped`.

---

## Trampa 2 — el verde puede ser de un SHA VIEJO

**El rollup de checks de GitHub tarda en refrescar.** Despues de un push nuevo,
la pagina del PR y `gh pr checks` pueden seguir mostrando, por un rato, la
conclusion de la corrida **anterior**. **Se mergeo sobre una senal vieja por
esto.**

**Sintoma exacto:** el PR muestra todo verde a los pocos segundos de un push que
todavia no pudo haber terminado de correr.

**La verificacion que no se puede saltar** — que el verde corresponda al SHA
nuevo, comparado a mano:

```bash
git rev-parse HEAD
gh run view <run-id> --json headSha,conclusion,status,createdAt
```

`headSha` tiene que ser **exactamente** el `HEAD` de tu rama, `status` tiene que
ser `completed` y `conclusion` `success`. Si no coincide, la corrida que estas
mirando es de otro arbol.

De un tiron, para las corridas de la rama:

```bash
gh run list --branch chore/validar-projects-<sha-corto> --json databaseId,headSha,status,conclusion,workflowName
```

**La evidencia que se pega en el PR del marco es la terna: id de corrida + SHA
del consumidor + SHA del marco pineado.** Un "salio verde" sin esos tres numeros
no es evidencia de nada.

---

## Paso 5 — Cerrar y no dejar rastro

```bash
gh pr close <numero> --delete-branch
```

**Verificacion del paso 5** — no queda ni la rama ni el pin:

```bash
gh pr view <numero> --json state          # CLOSED
git ls-remote --heads origin chore/validar-projects-<sha-corto>   # sin salida
git checkout main && git pull --ff-only
grep -rn "projects/.*@" .github/workflows/   # todo de vuelta en @v1
```

El pin temporal **se revierte con el mismo PR que lo introdujo**. Cerrar el PR y
borrar la rama es la forma limpia de revertirlo: no queda nada que alguien tenga
que acordarse de deshacer.

---

## Probar el pipeline de DESPLIEGUE: el mecanismo es OTRO

Un PR valida el CI. **No valida el deploy**: el workflow de despliegue no corre
en `pull_request`. Para probarlo, el mecanismo es el **dispatch manual sobre una
RAMA**, que por contrato despliega a **dev** y deja produccion en `skipped`.

**Esto despliega de verdad sobre un ambiente compartido. Anuncialo y confirma
antes de disparar** — dev es staging compartido y los deploys se serializan por
cola; una corrida a medias sobre dev deja el ambiente corrupto (incidente del
2026-08-13).

```bash
gh workflow run deploy.yml --ref chore/validar-projects-<sha-corto>
gh run list --workflow=deploy.yml --limit 3
gh run view <run-id>
```

Lo que hay que ver en la corrida:

- Los jobs de **dev** ejecutados (deploy + smoke + E2E).
- Los jobs de **produccion** en `skipped`. **Eso es el contrato, no una falla.**
  Produccion solo sale de `main` por la promocion, y **jamas** es vehiculo de
  validacion de nada. Si un job de produccion aparece ejecutado, para todo y
  avisa.

Nunca uses `--ref main` para "probar": ahi si arranca la promocion a produccion.

---

## Trampas conocidas, resumidas

| Trampa | Sintoma exacto | Que hacer |
|---|---|---|
| Rama sin PR | `gh run list --branch <rama>` no devuelve ninguna fila | Abrir el PR en borrador: el PR es el disparador |
| Verde de un SHA viejo | El PR se pone verde a los segundos de un push que no pudo haber terminado | Comparar `headSha` de la corrida contra `git rev-parse HEAD` |
| Un `@v1` sin pinear | `grep -rn "projects/.*@"` deja alguna linea en `@v1` | Repinear: esa pieza corrio la version publicada, no la que probas |
| Pin a rama en vez de SHA | El pin sigue apuntando a `@<nombre-de-rama>` | Usar el SHA de 40 caracteres: la evidencia tiene que ser de un arbol inmutable |
| Probar el deploy con un PR | El workflow de deploy no aparece entre las corridas del PR | Dispatch manual sobre la rama, con aviso previo (despliega a dev de verdad) |

## Checklist

- [ ] OK humano explicito para escribir en el repo consumidor
- [ ] SHA completo del marco anotado, con el arbol del marco limpio
- [ ] Rama temporal desde `main` actualizado del consumidor
- [ ] Cero `@v1` sin pinear en `.github/workflows/`
- [ ] PR **en borrador**, titulado **NO MERGEAR**
- [ ] `headSha` de la corrida verde == `HEAD` de la rama (no una senal vieja)
- [ ] Los checks nuevos corrieron de verdad, no `skipped`
- [ ] Evidencia pegada en el PR del marco: id de corrida + SHA consumidor + SHA marco
- [ ] Si se probo el deploy: dev ejecutado, produccion `skipped`
- [ ] PR cerrado con `--delete-branch`; no queda rama ni pin
