---
artefacto: proposal
dri: Builder 1
aprueba: revision adversarial (desvio del marco: un solo mantenedor, ver AGENTS.md)
informado: PO / Builder 2
estado: en-ejecucion
---

# guardrail-deltas deja de viajar por el tag móvil `v1`

## Por qué

**El pin exacto del consumidor seguía siendo una media verdad, y el propio marco lo
tenía escrito.** Un consumidor pina `marco-ci.yml@vX.Y.Z` y recibe cada versión nueva
como pull request de Dependabot. Pero adentro de ese workflow, el job `deltas`
(check `deltas-openspec`) invocaba `im-diego-ec/Projects/actions/guardrail-deltas@v1`
(`.github/workflows/marco-ci.yml:990` en `965a1da`, el commit sobre el que arranca
este change). Cada vez que el release movía `v1`, el `guardrail-deltas` nuevo corría
en **todo** consumidor pinado por debajo, sin ningún pull request. `AGENTS.md` lo
llamaba así, «media verdad», y el comentario de esa línea
(`marco-ci.yml:922-936` en `965a1da`) admitía que el pin exacto **ya era técnicamente
posible** y lo dejaba sin hacer «por ser una decisión de distribución».

El motivo original del `@v1` desapareció en la 1.8.0 y nadie cerró la línea. Mientras
`guardrail-deltas` fue un **paso** del job `openspec`, pinar la versión que se estaba
cortando ponía en rojo al propio pull request que la cortaba, porque GitHub resuelve
las actions de un job en «Set up job», antes de evaluar el `if` de cualquier paso, y
el tag se crea después del merge (medido el 2026-08-22 con «Unable to resolve action
...@v1.4.2»). La 1.8.0 lo mudó a un **job propio** salteado en el repositorio que
distribuye el marco (`needs.cambios.outputs.es_distribuidor`), igual que
`constitucion_cableada`. Un job salteado no resuelve nada, así que la circularidad se
fue con él.

**Origen en Rigel.** Rigel cerró lo mismo en su 2.3.0, change archivado
`2026-09-08-un-solo-canal-del-bump`, commits `bf65018` (el guardrail en job propio,
pinado a versión exacta, y el banco del pinado reescrito en dos propiedades) y
`dc1f2c6` (su `AGENTS.md` y el paso del release que movía el tag). Allá mordió: el
guardrail de deltas se endureció en su 1.11.0 (2026-08-31) y el cambio llegó por el
tag móvil a consumidores pinados por debajo, sin pull request. Lo único que evitó el
incidente fue que un consumidor lo vio venir y arregló su árbol una hora antes del
release. Por la regla de oro de `AGENTS.md`, el guardrail sube al marco: Projects
tiene la misma línea y el mismo tag.

**Y la propiedad que vuelve posible el pin exacto no la cobraba nadie.** Rigel lo
descubrió en su 2.4.0 (commit `64fc6f8`): el límite publicado de un banco afirmaba un
chequeo que no existía. En Projects, medido sobre `965a1da`:

- `pruebas/marco-ci/distribuidor.test.mjs:222-227` exige **al menos tres** usos de la
  sonda en todo `marco-ci.yml`, no que cada referencia remota propia viva en un job
  particionado.
- El caso (7) de `actions/constitucion/pruebas/refutaciones-ronda-3.test.mjs` verifica
  que la ref **exista** cuando el job corre, y sin tags en el clon solo avisa.
- Agregado a `marco-ci.yml` un tercer job con
  `uses: im-diego-ec/Projects/actions/censo-fuentes@v1.9.6` y **sin** partición, el
  resto del banco (1470 pruebas, sin `pruebas/init/`) no marcó el job nuevo: sus
  únicas cuatro rojas eran las del pin de este mismo change, que ya estaban rojas sin
  la mutación. Lo mismo con la condición de `deltas` cambiada a
  `always() || <la sonda>`, que contiene el texto de la partición y no saltea nada.

**Hechos medidos el 2026-09-17 que acotan el alcance.** `git ls-remote --tags origin v1`
devuelve `b673ad6`, el commit de la **1.8.0** (2026-09-01): el paso 5 del release, que
decía mover `v1`, no se ejecutó en ninguna de las siete versiones 1.9.x, y nada lo
detectó. `actions/guardrail-deltas` tiene el mismo árbol en la 1.8.0, en la 1.9.6 y en
`965a1da` (salvo su carpeta `pruebas/`), así que ningún consumidor recibió todavía nada
distinto. El próximo cambio al guardrail —el porte de «todo pendiente declara si bloquea
y a dónde va»— es el que lo habría empujado sin pull request: este change es su
prerrequisito.

## Qué cambia

1. **`marco-ci.yml` invoca `guardrail-deltas` por versión exacta**, la más alta del
   CHANGELOG (hoy `@v1.9.6`). El paso 1 del release la mueve con los demás pines,
   porque `pruebas/andamio/pinado.test.mjs` ya compara todo pin exacto contra el
   CHANGELOG. Se conservan el job `deltas`, su `name: deltas-openspec`, su salteo por
   `es_distribuidor` y su cobro en `marco-ok`.
2. **`pruebas/andamio/pinado.test.mjs` pierde su lista de excepciones.** Desaparece la
   exención de `marco-ci.yml` → `guardrail-deltas@v1`; la aserción que exigía
   «exactamente una invocación por `@v1`» se reemplaza por la contraria (ninguna pieza
   propia por un tag mayor móvil), y se agrega una lista de las formas exactas en que
   la prosa afirmaba ese rol interno.
3. **Banco nuevo `pruebas/andamio/refs-propias.test.mjs`.** Toda referencia remota a
   una pieza propia en `.github/workflows` tiene que vivir en un job cuya condición,
   **evaluada** con el evaluador de `pruebas/andamio/expresiones.mjs`, lo saltee cuando
   la sonda dice que es el distribuidor y lo deje correr en un consumidor; y cada pieza
   salteada tiene que correr por ruta local en algún workflow del marco.
4. **`pruebas/andamio/expresiones.mjs` modela las funciones de estado** (`cancelled()`,
   `always()`, `success()`, `failure()`), solo cuando el banco las declara. Sin esa
   declaración, cualquier función sigue lanzando, como antes.
5. **El paso 5 del release deja de mover `v1` por defecto.** Con el árbol limpio, el
   único efecto de moverlo es empujar código sin pull request a quien pine una versión
   publicada hasta la 1.9.6. `AGENTS.md` ya lo tenía entre lo que pide OK humano; la
   skill decía lo contrario («no exige un OK aparte»). Si se congela formalmente o se
   vuelve a mover con OK queda como **decisión pendiente**, con su dato escrito.
6. **La prosa que afirmaba el rol interno de `v1`**, en seis superficies: `AGENTS.md`,
   `README.md`, `docs/15-forkear-el-marco.md`, el prompt de `.github/workflows/claude.yml`,
   la skill `projects-release` y el comentario del job en `marco-ci.yml`; más el
   comentario de `actions/constitucion/cableado.mjs` que llamaba al tag «interno del
   marco».

**Lo que NO se trae de Rigel, y por qué:**

- **Su job `guardrail_deltas`.** Publica el check `guardrail-deltas`; en Projects el
  check se llama `deltas-openspec`, y renombrarlo es el breaking más caro de
  `AGENTS.md`. Además su `if` compara `github.repository` con un literal, que el paso
  «El marco no se auto-identifica por un literal de su cuenta» de
  `.github/workflows/ci.yml` pone en rojo.
- **La partición buscada como texto.** Rigel busca la cadena dentro del `if:`; acá la
  condición se evalúa, porque un `always() || <partición>` tiene el texto y no
  particiona nada.
- **El requirement del lado del consumidor** («El bump del marco llega por un solo
  canal»): depende de su actualizador propio, y la decisión D2 del PO mantiene
  Dependabot.

## Clasificación y contrato

**Referenciado** lo único que viaja: `marco-ci.yml`, que cada consumidor recibe en su
pull request de bump. El resto es del repositorio del marco y no viaja (bancos,
evaluador, `AGENTS.md`, la skill del release, `claude.yml`) o es documentación.
**Contrato: patch.** No cambia ningún `input`, `secret`, `output`, nombre de job ni
permiso; corrige que el comportamiento del reusable dependiera de un tag que se mueve.

## Impacto en los consumidores

Hay tres consumidores reales, todos en `@v1.9.6`.

- **Mientras sigan en la 1.9.6**, su `marco-ci.yml` resuelve `v1`, que apunta a la 1.8.0
  y tiene el mismo `guardrail-deltas`. Con el paso 5 sin mover el tag, **nada cambia bajo
  sus pies sin un pull request**, que es el efecto que busca este change.
- **Cuando mergeen el bump** a la versión que lleve este change, su job
  `deltas-openspec` corre `guardrail-deltas` de exactamente esa versión. El nombre del
  check, sus permisos y su resultado sobre el mismo árbol no cambian.
- **Qué tienen que hacer: nada.**
- **Un fork del marco** necesita el tag de la versión exacta; `v1` solo si alguno de sus
  consumidores pina una versión hasta la 1.9.6 (`docs/15-forkear-el-marco.md`).
