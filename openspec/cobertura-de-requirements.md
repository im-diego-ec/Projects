# Cobertura de los requirements canónicos

Una fila **por requirement**, con el paso o el test que lo hace **fallar solo** o, si no
lo tiene, **en qué estado está esa ausencia**: pendiente en un change vivo, no verificable
por una propiedad del requirement, o sin destino hasta la próxima versión. Vive acá, al
lado de `specs/`, porque el dato que responde es el de esta carpeta: *de todo lo que el
marco declara como contrato, ¿qué parte tiene compuerta?*

## Por qué se construye desde el requirement y no desde el nombre de la capability

Un intento anterior midió al revés: buscó el **nombre** de cada capability
(`pipeline-entrega`, `gobierno-contribucion`, …) por `actions/`, `.github/workflows/`,
`plantilla/`, `pruebas/` y `herramientas/`, y contó como «sin enforcement» a las que
daban cero coincidencias. Eso mide **si el string aparece**, no si el requirement tiene
compuerta, y se cae con un contraejemplo de este mismo árbol: el requirement
«Los artefactos regenerados no divergen de la versión pinada» de `pipeline-entrega`
está enforzado por el paso «Artefactos regenerados al dia» de `marco-ci.yml`, que
además tiene banco propio (`pruebas/marco-ci/artefactos.test.mjs`) — y ese paso no
contiene en ningún lado la cadena `pipeline-entrega`, así que el método lo contaba
como cero. Un check no se llama como el spec que cumple, y no tiene por qué.

La dirección correcta es la de esta tabla: **del requirement hacia el check.**

## Cómo se declara una fila sin compuerta

**Desde el 2026-09-17 la ausencia de compuerta no es gratis.** Una celda que dice
`**ninguno**` y nada más pone rojo el banco de esta página: un requirement nuevo que nadie
miró y uno cuya compuerta nadie supo construir se leían igual. Toda fila sin compuerta
declara uno de tres estados, y el banco mide lo que cada uno afirma:

| Estado | Cómo empieza la celda | Qué mide el banco |
|---|---|---|
| **Pendiente** | ``**pendiente** → change `<nombre>` `` | que el change exista vivo en `openspec/changes/` y que alguno de sus documentos nombre al requirement con su título exacto |
| **No verificable** | ``**no verificable** — <la propiedad que lo impide>`` | que la propiedad esté escrita y no sea un motivo de esfuerzo («es difícil», «no hay tiempo»): eso describe a quien escribe, no a la regla |
| **Sin destino** | ``**sin destino**, vigente en X.Y.Z — <por qué es verificable y qué falta>`` | que la versión sea la que publica el `CHANGELOG.md`: al cortar la siguiente, la declaración **vence** y el pull request del release tiene que decidirla de nuevo |

**El tercer estado es de este marco y no de Rigel**, de donde viene el resto. Allá los
pendientes apuntaban a un issue paraguas; acá el destino tiene que poder comprobarse sin
red, y para la mayoría del contrato no hay ningún change vivo que tenga ese trabajo.
Forzarlos a «pendiente» sería inventar un destino, y forzarlos a «no verificable» sería
escribir una afirmación falsa sobre reglas que sí se pueden verificar —Rigel clasificó sus
45 requirements sin compuerta uno por uno y 44 lo eran—. «Sin destino» dice la verdad
—verificable y sin dueño— y, para no ser la ausencia gratis con otro nombre, vence.

**Las parciales se cuentan aparte.** Una fila `**parcial**` sigue contando como compuerta
—dice que hay al menos un camino al rojo—, pero cada encabezado y el resumen publican
cuántas lo son, como subconjunto de las que tienen compuerta y no como una bolsa aparte.

**Y una compuerta que no corre no cuenta.** Una fila con compuerta que cita un archivo de
`actions/<x>/`, o un paso que solo vive ahí, pone rojo el banco si ningún `uses:` del marco
ni del andamio invoca esa action. El caso existe hoy: `actions/carril-docs` no la invoca
ningún workflow del árbol —está declarada, con su motivo y su versión, en
`pruebas/andamio/actions-alcanzables.test.mjs`— y ninguna fila la cita. Las dos
compuertas leen el alcance con el mismo lector, `pruebas/alcance-de-las-actions.mjs`.

## Cómo se relee esta tabla sin creerle

Las cifras y los números de línea son una **medición con fecha**, no una afirmación
permanente: los archivos que se citan se editan, y una línea escrita a mano envejece
sin que nada se ponga rojo. Por eso cada fila lleva el **nombre** del paso o del test
—que es lo estable— y la línea solo donde todavía ayuda, y acá quedan los comandos que
rederivan todo:

```bash
# El universo: cuántos requirements vivos hay, y dónde empieza cada uno.
grep -c '^### Requirement' openspec/specs/*/spec.md
grep -n  '^### Requirement' openspec/specs/*/spec.md

# La línea de un paso citado, por su nombre (el nombre es el ancla, no la línea).
grep -n '^      - name: <nombre exacto del paso>' .github/workflows/marco-ci.yml
grep -n '^      - name: <nombre exacto del paso>' plantilla/.github/workflows/ci.yml
grep -n '^    - name: <nombre exacto del paso>'   actions/*/action.yml
```

**`.github/workflows/marco-ci.yml` se cita SOLO por nombre de paso, sin línea, y la
razón es una medición y no una preferencia.** Sus siete pasos citados acá se midieron
tres veces en el mismo día y dieron tres números distintos: la primera medición los
dejó en 1079/1209/1255/1368/1620/2427/2486, la segunda los encontró +8 líneas más
abajo, y la tercera —la de este documento— +36 más. Ese archivo es el workflow
reusable del marco y crece por arriba en cada entrega, así que un número de línea
escrito acá nace viejo: queda equivocado antes de que nadie lo lea, y equivocado en
silencio, que es peor que ausente. El nombre del paso no se movió ni una vez en las
tres mediciones, y el `grep` de arriba lo convierte en línea en un segundo.

**Y como el nombre es el dato, es el nombre lo que se verifica.** Desde el 2026-08-31,
[`pruebas/docs/cobertura-de-requirements.test.mjs`](../pruebas/docs/cobertura-de-requirements.test.mjs)
exige que **todo paso citado entre comillas angulares siga existiendo con ese nombre**
en algún workflow o action del repositorio: renombrar un paso deja esta página mandando
a buscar una compuerta que ya no se llama así, y la celda se sigue leyendo perfecta.
Ese control es exacto.

Las citas a los demás archivos sí conservan la línea, y ahí la red es **parcial, y
conviene saber cuánto atrapa**: el mismo banco se pone rojo si la ruta no existe, si la
línea se pasa del final del archivo o si cae sobre una línea vacía o de comentario, pero
medido contra las trece anclas que este lote encontró envejecidas cazaba **seis** —las
que habían ido a parar a un `#` solo o a un comentario—; las otras siete habían caído
sobre código de verdad y ninguna forma barata las distingue de un ancla sana. La
primera que cazó en producción fue una de este mismo lote: al crecer dos líneas un
comentario de `ci.yml`, la cita `:495` quedó apuntando a un comentario y el banco lo
dijo en la corrida siguiente. O sea que la línea sigue siendo una comodidad y el nombre
sigue siendo el dato.

**Lo que este documento ya se hizo a sí mismo, y por eso la advertencia de arriba no
es retórica.** La medición del 2026-08-24 se quedó vieja en menos de una semana: el
andamio empezó a repartir `plantilla/.github/workflows/desplegar.yml`, con su banco de
quince casos, y **tres filas** siguieron diciendo `ninguno` sobre compuertas que ya
existían — más los tres párrafos que afirmaban en prosa que «el andamio trae `ci.yml`,
`actualizar-marco.yml` y `claude.yml`, y ninguno despliega». Ninguna se puso roja: una
tabla que dice que algo *no* está verificado envejece hacia el lado que nadie audita,
porque un `ninguno` de más no rompe nada — solo hace tomar decisiones con un mapa
equivocado. El re-conteo del 2026-08-31 lo corrigió, y la relectura fila por fila del
2026-09-17 encontró **el mismo defecto otra vez**: **nueve** filas —seis del contrato y
tres de capabilities en vuelo— decían `ninguno` sobre compuertas que ya existían: cinco
llegaron con el despliegue de dos ambientes y la promoción, y las otras cuatro eran bancos
que ya existían y nadie había cruzado con esta página. La medición de esa relectura es la
que sigue.

**Medido el 2026-09-17: 49 requirements vivos en 10 capabilities**
(16 `calidad-codigo` + 4 `despliegue-ci` + 2 `gestion-secretos` +
3 `gobierno-contribucion` + 5 `observabilidad` + 6 `operacion-infra` +
4 `pipeline-entrega` + 5 `verificacion-desplegada` + 1 `base-tecnologica` +
3 `documentacion-del-marco`). Hay además **2 capabilities en
vuelo** —`promocion-por-ambientes`, que nace en el change del mismo nombre, y
`capa-descubrimiento`, que nace en `menu-que-no-miente`—: ninguna existe todavía en
`openspec/specs/`, y sus secciones van al final, porque una capability que nace en un
change y no en los specs vivos es la asimetría que hay que ver antes de que se
consolide, no después.

**Qué movió el re-conteo del 2026-09-17.** Ese día se archivaron seis changes
terminados que esperaban una revisión cruzada imposible —el marco tiene un solo
mantenedor, y `AGENTS.md` lo declara como desvío con la revisión adversarial como
reemplazo—. Entraron cuatro requirements a `calidad-codigo`, y
`base-tecnologica` y `documentacion-del-marco` dejaron de estar en vuelo: sus
secciones siguen más abajo, ahora como contrato vivo. Lo que eso esconde, dicho
para que no se lea como que desapareció: los tres requirements que `stack-estandar`
propone para `base-tecnologica` siguen **en vuelo sobre una capability viva**, y
esta página —como con cualquier otro change en vuelo sobre una capability que ya
existe— no les da fila hasta que se archiven.

**Esa cuenta decía «una» hasta el 2026-08-31, y no es una errata: es el mismo defecto
otra vez.** `documentacion-del-marco` llevaba semanas en vuelo y esta página no la
nombraba en ninguna parte — y es la capability cuyo requirement «Ningún enlace del
repositorio apunta a algo que no existe» hace cumplir `pruebas/docs/enlaces.test.mjs`,
o sea que la página que existe para decir qué tiene compuerta se salteó una capability
entera **que sí la tiene**. Desde hoy no se escribe a mano: la lista sale de mirar
`openspec/changes/*/specs/` contra `openspec/specs/`, y lo mide
[`pruebas/docs/cobertura-de-requirements.test.mjs`](../pruebas/docs/cobertura-de-requirements.test.mjs).

**Resumen de la medición: 38 de 49 requirements tienen al menos una compuerta que
falla sola; 11 no la tienen.** **De las 38 con compuerta, 20 son solo parciales. De las
11 sin compuerta: 0 pendientes en un change vivo, 0 no verificables, 11 sin destino y 0
sin declarar.** Las parciales son la mitad de lo cubierto, y por eso se publican: un 38
de 49 que no dijera cuántas son mitades invitaría a no escribir las compuertas que
faltan. Los 11 sin compuerta siguen donde el marco reparte poco o nada de la pieza que
los ejecutaría —`observabilidad` (3 de 5); `despliegue-ci`, `operacion-infra` y
`verificacion-desplegada` (2 cada una); `calidad-codigo` y `gestion-secretos` (1 cada
una)—, y ninguno tiene hoy un change vivo que lo nombre: por eso los once están sin
destino, y vencen con la próxima versión. El despliegue que reparte el andamio
—`plantilla/.github/workflows/desplegar.yml`, con su banco en
`pruebas/andamio/desplegar.test.mjs`— ya tiene DEV, sonda y promoción deliberada, y eso
es lo que movió tres filas del contrato y dos de las capabilities en vuelo; lo que sigue
sin dónde fallar es lo que va después de la sonda mínima: el smoke, el E2E y lo que ellos
crearían.

---

## calidad-codigo — 16 requirements, 15 con compuerta (3 parciales)

| Requirement | Lo que lo hace fallar solo | Ruta y ancla (2026-08-31) |
|---|---|---|
| Lint y formato configurados para todos los paquetes | `pnpm lint` desde la raíz sobre todo el árbol, y el paso que exige que cada paquete DECLARE los scripts que el CI corre | `plantilla/.github/workflows/ci.yml:319`; paso «Todo paquete declara los scripts de verificacion», `plantilla/.github/workflows/ci.yml:369`, con banco en `pruebas/andamio/compuertas-del-andamio.test.mjs` |
| Prohibir `any` sin justificación | La regla `@typescript-eslint/no-explicit-any` que trae `tseslint.configs.recommended`, ejecutada por `pnpm lint` | `plantilla/eslint.config.mjs:67` + `plantilla/.github/workflows/ci.yml:319` |
| Prohibir promesas flotantes | `no-floating-promises` de `recommendedTypeChecked`, más el ajuste de `no-misused-promises` del front | `plantilla/eslint.config.mjs:74` y `:166` + `plantilla/.github/workflows/ci.yml:319` |
| Scripts de verificación sin enmascaramiento de fallo | Paso «Scripts de verificacion sin enmascaramiento» de `marco-ci.yml`, con banco propio en el andamio | `.github/workflows/marco-ci.yml`, paso «Scripts de verificacion sin enmascaramiento»; `pruebas/andamio/manifiestos.test.mjs` (mutación «vuelve un `\|\| true` al script lint de un paquete», `:360`) |
| Test de regresión obligatorio por defecto conocido | **sin destino**, vigente en 1.9.6 — verificable por la mitad que se puede correr: que el test que trae un PR de corrección falle contra el commit base y pase con el fix. Qué PR corrige un defecto conocido, y si el test está al nivel más bajo suficiente, sigue siendo juicio del review, que es donde el propio requirement pone el rechazo. Ningún change vivo lo tiene | — |
| Las definiciones de pipeline se validan como código | Paso «Definiciones de pipeline validas» (actionlint pinado, corre también en el carril de docs), con banco que lo ve fallar sin red: sin workflows, con la descarga caída, con un asset que no coincide con su sha256 y con un hallazgo | `.github/workflows/marco-ci.yml`, paso «Definiciones de pipeline validas»; `pruebas/marco-ci/definiciones-pipeline.test.mjs` |
| Un repositorio nacido del scaffold no conserva marcadores sin resolver | Paso «Sin marcadores del scaffold sin resolver», con banco que lo hace morder | `.github/workflows/marco-ci.yml`, paso «Sin marcadores del scaffold sin resolver»; `pruebas/marco-ci/higiene-sin-arbol.test.mjs:139` |
| Ningún archivo fuente fuera del alcance de la verificación | La composite action del censo, y el paso que verifica que el consumidor la tenga CABLEADA (un guardrail que se puede sacar en silencio no es un guardrail) | `actions/censo-fuentes/action.yml:62`; paso «Censo de fuentes cableado» de `.github/workflows/marco-ci.yml`, con banco en `pruebas/marco-ci/compuertas-de-estructura.test.mjs` |
| El formato acordado se verifica en cada integración | `pnpm format:check` desde la raíz en el job `formato` del andamio, que corre en los dos carriles y `ci-ok` exige sin aceptarle `skipped`; y el paso del CI del marco que corre el formateador sobre el andamio y sobre cada destino que instancia | `plantilla/.github/workflows/ci.yml:184`; `pruebas/andamio/formato-en-los-dos-carriles.test.mjs`; paso «El andamio y lo que el init escribe pasan el formateador» de `.github/workflows/ci.yml` |
| La cobertura de pruebas alcanza el mínimo acordado y no retrocede | La composite action de cobertura, en sus dos planos (líneas del cambio y total del paquete), más el paso del marco que verifica que el andamio reparta el umbral | `actions/cobertura-diff/action.yml:152`; paso «El andamio reparte el umbral del total del marco» de `.github/workflows/marco-ci.yml`, con banco en `pruebas/marco-ci/compuertas-de-estructura.test.mjs` |
| Las reglas de identidad visual del área viajan como reglas de lint verificadas | El banco de las reglas de identidad del andamio: exige el bloque con alcance propio y severidad de error, que cada expresión compile, que acepte su violación y rechace el trabajo honesto, y que cada regla de la constitución tenga estado decidido — y muta copias del andamio para probar que cada comprobación MUERDE | `pruebas/marca/reglas-marca.test.mjs` (mutaciones desde `:261`); el bloque verificado vive en `plantilla/eslint.config.mjs` |
| El esqueleto que entrega el andamio encaja consigo mismo | El banco de acoples del andamio, seis comprobaciones con su mutación al lado | `pruebas/andamio/acoples-del-andamio.test.mjs:134` (.env), `:207` (nombre de la base), `:516` (no-root), `:599` (arquitectura), `:753` (contrato), `:880` (organización a mano) |
| Un comando que la herramienta manda a ejecutar tiene que poder ejecutarse | **parcial**: el banco extrae los comandos que la herramienta imprime, comprueba que cada ruta vuelva como UN argumento y ejecuta el de punta a punta con el clon en una ruta con espacio. Los dos comandos que imprime `main()` —el del esqueleto de ejemplo y el de `projects-versiones`— usan la misma función pero ningún caso los mide | `pruebas/init/comando-pegable.test.mjs:92` y `:146`; `pruebas/init/el-doble-clic-llega.test.mjs:56` |
| Una ruta del sistema de archivos no se deriva de la parte de una URL | **parcial**: el banco del guardrail de deltas se pone rojo si su ruta viaja codificada, pero SOLO corrido desde un clon con un espacio en la ruta —medido el 2026-09-17: 13 de 13 rojos ahí, cero en un clon sin espacio, que es el caso del CI—. Nada recorre el código buscando `.pathname` | `actions/guardrail-deltas/pruebas/guardrail-deltas.test.mjs:188` |
| El piso de permisos que se documenta es el que el reusable exige | Lee los `permissions:` que declaran los jobs del reusable y exige que las tres copias del piso —incluida la del andamio— concedan al menos eso, con un permiso comentado contando como ausente | `pruebas/andamio/piso-del-reusable.test.mjs:125`, con las mutaciones en `:141` y `:150` |
| La evidencia que cita un change vive donde el change dice | **parcial**: toda cita al canónico desde un change activo tiene que apuntar a un archivo que exista. Que el texto citado siga diciendo lo mismo —la tercera cláusula— no lo mira ningún caso | `pruebas/ci-del-marco/changes-citan-lo-que-existe.test.mjs:71`, con la mutación en `:81` |

**El que no tiene compuerta, y por qué no es «no verificable».** «Test de regresión
obligatorio por defecto conocido» se contaba acá como indecidible con un escaneo, y la
mitad lo es: saber qué pull request corrige un defecto conocido, y si el test está al
nivel más bajo suficiente, exige entender el defecto. La otra mitad no: que el test que
trae una corrección falle contra el commit base y pase con el fix se puede correr.
Declararlo no verificable cerraría la pregunta con una afirmación a medias verdadera, así
que queda sin destino, con su versión.

---

## despliegue-ci — 4 requirements, 2 con compuerta (1 parcial)

| Requirement | Lo que lo hace fallar solo | Ruta y ancla (2026-08-31) |
|---|---|---|
| La rama determina el ambiente de destino | **parcial**: el banco `la-llave-del-despliegue` **evalúa** la condición de cada job de `desplegar.yml` contra doce eventos simulados —push propio, PR desde un fork con la rama llamada `main`, PR propio, disparo a mano desde otra rama, entre otros— y exige la lista exacta de jobs que corren; el disparo a mano desde otra rama termina en rojo sin traer código. El caso rojo está demostrado contra las condiciones de la 1.9.6 y del job `dev` anterior, y cada cláusula tiene su mutación. En `desplegar.test.mjs` siguen el caso del verde y la mutación por job. Lo que ningún caso mira es la vía del disparo a una rama de trabajo con una credencial de DEV acotada: el andamio no la reparte | `pruebas/andamio/la-llave-del-despliegue.test.mjs:278`, `:290` y `:429`; `pruebas/andamio/desplegar.test.mjs:37` y `:194`; el disparo verificado vive en `plantilla/.github/workflows/desplegar.yml` |
| El Environment de producción solo acepta deployments desde la rama de integración | **sin destino**, vigente en 1.9.6 — la política de ramas vive en la configuración del proveedor, fuera del árbol, pero se lee con una consulta de solo lectura a su API, como ya hace `projects init` con la protección de la rama. Lo que hay hoy es un **aviso**, no un rojo: el job `guardas` de `desplegar.yml` dice en amarillo, en cada corrida, si la credencial está guardada como secreto del repositorio, y el banco `la-llave-del-despliegue` corre ese paso. El job `produccion` declara el environment, y ningún caso exige que lo siga declarando | `pruebas/andamio/la-llave-del-despliegue.test.mjs:310` (el aviso) |
| La trust policy OIDC valida el claim que el proveedor de CI realmente emite | **sin destino**, vigente en 1.9.6 — la trust policy es infraestructura como código que un banco puede leer, pero el andamio no reparte ningún rol de nube: el despliegue que trae publica con un token del proveedor, sin OIDC. Hasta que un adaptador reparta el rol no hay archivo que mirar | — |
| Los despliegues a un ambiente compartido se serializan | El caso «dos publicaciones a la vez HACEN COLA: ninguna cancela a la otra», que mira las líneas EJECUTABLES del workflow —no el comentario de al lado— y exige `cancel-in-progress: false` | `pruebas/andamio/desplegar.test.mjs:131` |

**Qué cambió desde la medición anterior, que decía «los cuatro vacíos».** El andamio ya
reparte un despliegue: `plantilla/.github/workflows/desplegar.yml`, con quince casos en
`pruebas/andamio/desplegar.test.mjs`. La afirmación de que «el andamio trae `ci.yml`,
`actualizar-marco.yml` y `claude.yml`, y ninguno despliega» era cierta cuando se
escribió y hoy no lo es — y `ls plantilla/.github/workflows/`, que era el comando que la
respaldaba, es el que la refuta.

**Qué sigue sin compuerta, y por qué está sin destino y no es «no verificable».** El
Environment de producción y la trust policy OIDC se cumplen en la configuración del
proveedor, fuera del árbol, y esta página los daba por imposibles de leer. No lo son: la
configuración del proveedor se lee con una consulta de solo lectura —`projects init` ya
lo hace con la protección de la rama—, y la trust policy es infraestructura como código
el día que un adaptador reparta el rol. Lo que falta es quién lo escriba. Y la
correspondencia rama→ambiente ya tiene dónde fallar: el despliegue tiene dos ambientes,
y lo que no mira ningún caso es que los separe la rama —hoy los dos salen de `main`, y
los separa la promoción—.

---

## gestion-secretos — 2 requirements, 1 con compuerta (1 parcial)

| Requirement | Lo que lo hace fallar solo | Ruta y ancla (2026-08-31) |
|---|---|---|
| Los secretos de runtime se inyectan por referencia, nunca horneados | **parcial**: el paso «Sin secretos en el repo (arbol y historia del cambio)» detecta el secreto EN TEXTO PLANO en el árbol y en la historia del cambio | `.github/workflows/marco-ci.yml`, paso «Sin secretos en el repo (arbol y historia del cambio)»; `pruebas/marco-ci/secretos.test.mjs` |
| Una rotación de credenciales no interrumpe el servicio | **sin destino**, vigente en 1.9.6 — observable contra un ambiente vivo: rotar la credencial y medir que el servicio vuelva solo. El andamio no reparte ni la base administrada ni el ensayo que la rote | — |

**El alcance de ese «parcial», dicho para que no se lea como cobertura completa.** El
detector encuentra un valor sensible versionado; no puede decir que la definición de
tarea use una REFERENCIA al gestor de secretos, porque esa definición vive en el state
del proveedor y no en el repositorio. El requirement de rotación es observable solo
contra un ambiente vivo: pertenece a la familia que cierra la verificación desplegada.

---

## gobierno-contribucion — 3 requirements, 3 con compuerta (3 parciales)

| Requirement | Lo que lo hace fallar solo | Ruta y ancla (2026-08-31) |
|---|---|---|
| Plantilla de pull request | **parcial**: que la plantilla que reparte el andamio exista y conserve la sección que explica qué es un change —la que pide su ruta— lo exige el banco de lo que lee el consumidor: si el archivo desaparece, el banco no lo puede leer y cae. Que pida la evidencia de tests no lo mira ningún caso, y la plantilla del propio marco no la mira nadie | `pruebas/docs/lo-que-lee-el-consumidor.test.mjs:81` (la entrada de la plantilla) y `:160` (el caso que la lee) |
| Definición de propietarios de código | **parcial**: el paso de marcadores pone rojo un `CODEOWNERS` con la sustitución del scaffold sin resolver (que es el modo de falla silencioso: no asigna a nadie y no da error). Y el banco de CODEOWNERS lee los dos archivos —el del marco y el que reparte el andamio—, así que su ausencia es roja, y exige que cada owner tenga la forma que su cuenta puede resolver y que una regla cubra todo el repositorio. Que el propietario quede asignado de verdad como revisor depende de la API y de sus permisos, y no lo mira nadie | `.github/workflows/marco-ci.yml`, paso «Sin marcadores del scaffold sin resolver»; `pruebas/marco-ci/higiene-sin-arbol.test.mjs:139-150`; `pruebas/docs/codeowners.test.mjs:173` y `:231` |
| Branch protection documentada como paso manual | **parcial**: que el documento de protección que reparte el andamio conserve las anclas donde `projects init` escribe el estado MEDIDO, y que ningún estado medido afirme que las reglas están activas, lo exige el banco del diagnóstico de la protección. Que la documentación siga coincidiendo con la configuración real, y que cada regla diferida tenga disparador y fecha, no lo mira nadie | `pruebas/init/proteccion.test.mjs:200` (ningún estado afirma las reglas activas) y `:268` (las anclas del documento real del andamio) |

**El hueco que hay que leer entero.** `CODEOWNERS` **no gatea nada hoy**: la protección
de la rama de integración corre con `required_approving_review_count` en `0` y
`require_code_owner_review` en `false` (ver `.github/proteccion-main.md`, tabla de
estado real). Con esa configuración, `CODEOWNERS` **sugiere** revisores y un PR se
mergea con el veredicto agregado de CI en verde y cero aprobaciones. Cualquier
documento que cuente el review cruzado por `CODEOWNERS` entre lo que «ya es
automático» está describiendo una intención, no un mecanismo. Activar el enforcement
es un acto humano en la configuración del proveedor y por eso no puede cerrarse desde
el árbol; lo que sí depende del árbol es no afirmar lo contrario mientras tanto.

---

## observabilidad — 5 requirements, 2 con compuerta (2 parciales)

| Requirement | Lo que lo hace fallar solo | Ruta y ancla (2026-08-31) |
|---|---|---|
| El servicio registra en JSON estructurado | **parcial**: el paso «Verificar cada paquete» corre, en cada proyecto nacido del andamio con API, el banco del logger —una línea de JSON válido con `nivel` y `msg`, el contexto como campos propios— y el del manejador central, que exige que un error no anticipado deje su línea de `nivel` error y no le llegue al cliente. Que TODO log del servicio pase por el logger —un `console.log` suelto no pone nada en rojo— y que la línea lleve el método y la ruta no lo mira ningún caso | `plantilla/api/src/lib/log.test.ts:9` y `plantilla/api/src/middleware/errorHandler.test.ts:22`; paso «Verificar cada paquete» de `plantilla/.github/workflows/ci.yml` |
| La verificación post-deploy entiende el formato del log | **sin destino**, vigente en 1.9.6 — el filtro sería código con banco propio y se prueba con líneas de juguete: un `info` que menciona la palabra error, dos formatos mezclados. El andamio no reparte ninguna verificación que lea logs: la sonda del despliegue mira la dirección, no el log | — |
| Los errores del navegador dejan evidencia en nuestros logs | **sin destino**, vigente en 1.9.6 — verificable en el andamio: un test del front que dispare un error global y compruebe el reporte, y uno del API que compruebe la línea. El front que reparte el andamio no captura errores globales ni los reporta | — |
| Los errores son correlacionables entre capas | **parcial**: el banco de acoples exige que el front, el API y el banco del front hablen del MISMO contrato, que es la mitad estática de la correlación | `pruebas/andamio/acoples-del-andamio.test.mjs:753` |
| Un aumento de errores del cliente avisa, no espera lectura | **sin destino**, vigente en 1.9.6 — la alarma es infraestructura como código que un banco puede leer, como ya lee el pendiente de las alarmas de producción; depende de que antes exista el reporte de errores del navegador, que tampoco existe | — |

**Por qué esta capability es la que peor se deja verificar estáticamente.** Sus cinco
requirements son propiedades del servicio CORRIENDO: qué forma tiene una línea de log,
qué reconoce el filtro post-deploy, si un reporte del navegador llega. Lo único que un
check estático puede afirmar es que las piezas que las producen existan y encajen entre
sí, y eso es lo que hacen sus dos filas con compuerta: el banco del logger del andamio y
el de los acoples entre el front y el API.

---

## operacion-infra — 6 requirements, 4 con compuerta (3 parciales)

| Requirement | Lo que lo hace fallar solo | Ruta y ancla (2026-08-31) |
|---|---|---|
| El state de la infraestructura vive en un backend remoto compartido | **parcial**: el pendiente del bucket del state viaja con sus cuatro partes obligatorias y el banco lo exige; el job `terraform` del workflow reusable corre `fmt -check` y `validate` sobre las raíces que el andamio reparte —avisa en la línea 1 y detiene desde v2— | `pruebas/andamio/infra-pendientes.test.mjs:226` (`pendientesConSusCuatroPartes`); paso «Formato y validez de las raices de Terraform» de `.github/workflows/marco-ci.yml`, con banco en `pruebas/andamio/terraform-en-ci.test.mjs` |
| Las caídas se detectan por alarma, no por reporte humano | **parcial**: el banco exige que el pendiente de las alarmas viva SOLO en la raíz de producción, no en la de desarrollo. Que producción tenga el mínimo que el requirement fija no lo verifica nada: el andamio no reparte alarmas | `pruebas/andamio/infra-pendientes.test.mjs:292` (`alarmasSoloEnProd`) |
| El gasto tiene un presupuesto con alerta | **sin destino**, vigente en 1.9.6 — verificable en la raíz de producción que reparte el andamio, con el mismo banco que ya exige sus pendientes; hoy ningún pendiente pide el presupuesto, así que no hay nada que exigir | — |
| Los datos de producción están protegidos contra pérdida | **sin destino**, vigente en 1.9.6 — la protección contra eliminación, la retención y el cifrado son atributos del recurso de base en la infraestructura como código, legibles por un banco, y el runbook de restore es un documento que un banco puede exigir. El andamio no reparte ni el recurso ni el runbook | — |
| Higiene operativa de logs y TLS | **parcial**: el banco exige que el pendiente de la retención y la clase del grupo de logs exista en las DOS raíces, y ese pendiente y el del certificado entran en la guarda de las cuatro partes y en la de numeración correlativa. Que la retención quede declarada en la IaC y que la conexión valide el certificado no lo verifica nada: el andamio no reparte esos recursos. Esta fila decía «el pendiente correspondiente» hasta el 2026-09-17, cuando el de logs no existía | `pruebas/andamio/infra-pendientes.test.mjs:245` (`retencionDeLogsEnLosDosAmbientes`), `:226` y `:349` |
| El andamio entrega los huecos de decisión de infraestructura con su criterio | El banco de huecos de infraestructura: cuatro partes por pendiente —los de infraestructura y los de plataforma del catálogo de adaptadores—, el pendiente de logs en los dos ambientes, numeración correlativa, punteros que resuelven, alarmas solo en producción — cada una con su mutación que la hace morder | `pruebas/andamio/infra-pendientes.test.mjs:226`, `:245`, `:266`, `:292`, `:310`, `:349`, y las mutaciones desde `:393` |

**Qué significa «parcial» acá, y es un límite declarado del propio change
`infra-exigible`.** Lo que hay hoy es que el andamio reparta la raíz de infraestructura
con cada decisión pendiente **escrita con su criterio**, y que un banco lo verifique.
Lo que NO existe es la compuerta que exija que la decisión se haya TOMADO: los
pendientes usan un token propio que el paso de marcadores no cuenta, a propósito —con
el marcador gateado, un repositorio recién nacido pasaba de 3 marcadores a 21 y no
podía llegar a verde el primer día—. Y desde el cierre de ese change (2026-09-17) el
requirement ya no la promete: qué forma tome una señal sobre los pendientes —aviso o
rojo— la decide el change que mida por plataforma si un repositorio llegó a su ambiente.

---

## pipeline-entrega — 4 requirements, 4 con compuerta (2 parciales)

| Requirement | Lo que lo hace fallar solo | Ruta y ancla (2026-08-31) |
|---|---|---|
| CI verifica todos los paquetes de forma bloqueante | El paso que DERIVA del gestor la lista de paquetes y exige que cada uno declare los scripts, con excepciones que solo pueden equivocarse hacia el rojo, y el paso que los corre parado dentro de cada paquete | `plantilla/.github/workflows/ci.yml:369` y `:519`, con banco en `pruebas/andamio/compuertas-del-andamio.test.mjs` |
| El deploy está gateado por el éxito de CI | **parcial**: cinco casos del banco del despliegue, y uno de ellos es una mutación que corre la misma detección que la regla — la condición `workflow_run.conclusion == 'success'`, el commit que se publica (el que el CI midió, `head_sha`, fijado una vez por corrida y no la punta de la rama), la corrida a mano, que consulta `ci-ok` sobre ese commit y deja rastro si alguien se aparta, y el cruce de la etiqueta que puso DEV contra lo que la promoción publica por defecto. **La secuencia dev→producción ya existe**: la mutación exige la condición del verde en DEV y el disparo humano en producción, derivándolo del archivo. Que la condición no deje pasar a un fork ni a un PR propio lo evalúa el banco `la-llave-del-despliegue`. Lo que sigue sin cubrirse es que producción continúe sola con DEV en verde: el andamio la hace un acto deliberado, que es lo que decidió la capability en vuelo `promocion-por-ambientes` | `pruebas/andamio/desplegar.test.mjs:37`, `:194` (la mutación), `:255`, `:287` y `:432` |
| Cada deploy es reproducible y reversible | **parcial**, en el despliegue del sitio: DEV sube la versión con el SHA del commit como etiqueta y producción promueve ESA etiqueta sin compilar de nuevo —el caso lo exige eslabón por eslabón—, y volver atrás son dos comandos del paquete del sitio que el banco exige, con el pin de wrangler vigilado. Lo que no cubre ningún caso: un registro de artefactos para la aplicación, que el andamio todavía no despliega | `pruebas/andamio/desplegar.test.mjs:432`; `pruebas/andamio/volver-atras.test.mjs:28` y `:36` |
| Los artefactos regenerados no divergen de la versión pinada | Paso «Artefactos regenerados al dia», con banco propio que verifica además que fuera de un árbol git sea ROJO y no «nada que verificar» | `.github/workflows/marco-ci.yml`, paso «Artefactos regenerados al dia»; `pruebas/marco-ci/artefactos.test.mjs` |

**La reversibilidad pasó de `ninguno` a parcial sin que nadie tocara su fila**, y es el
defecto de siempre. Esta sección decía que el despliegue «compila y publica en el
momento — no hay artefacto guardado al que volver». Desde que tiene dos ambientes, DEV
sube una versión etiquetada con el SHA del commit, producción promueve esa misma versión
sin compilar de nuevo, y el paquete del sitio trae el comando que vuelve a una anterior.
Lo que sigue sin cubrirse es la mitad de la aplicación: el andamio todavía no la
despliega, así que no hay registro de artefactos que mirar.

---

## verificacion-desplegada — 5 requirements, 3 con compuerta (3 parciales)

| Requirement | Lo que lo hace fallar solo | Ruta y ancla (2026-08-31) |
|---|---|---|
| El deploy a dev se verifica solo, sin pedirle smoke a nadie | **parcial**: después de subir a DEV, el paso «Comprobar que DEV contesta de verdad» pide la dirección publicada y pone rojo un 404, un 200 vacío o una dirección que no se pudo leer; el banco corre el script real contra un servidor de mentira. Es la sonda mínima y no la del requirement: no hay smoke de API contra la base de dev ni E2E con navegador, así que DEV en verde todavía no quiere decir que los flujos core funcionen | `pruebas/andamio/post-despliegue.test.mjs:126` y `:156` |
| Producción solo recibe lo que dev ya verificó | **parcial**: el paso «Comprobar que esta version paso por DEV, y en verde» no deja promover una versión que nunca se subió a DEV, ni una cuyo DEV terminó en rojo, ni una sobre la que no pudo preguntar; el banco corre el script real con un `gh` de mentira. Lo que no cumple: la promoción no es automática —el andamio la hace un acto deliberado, que es lo que pide la capability en vuelo `promocion-por-ambientes`— y lo que DEV verificó es la sonda mínima, no el smoke ni el E2E | `pruebas/andamio/la-compuerta-de-prod.test.mjs:163` y `:175` |
| Las verificaciones limpian lo que crean | **sin destino**, vigente en 1.9.6 — verificable el día que existan el smoke y el E2E que crean datos: una corrida que falla a mitad y deja residuos se puede provocar. El andamio no reparte ninguna verificación que cree datos, así que hoy no hay nada que limpiar | — |
| Credenciales de prueba fuera del repositorio y de los logs | **parcial, en una sola dirección**: el detector de secretos pone rojo la credencial versionada; que no aparezca en los LOGS de una corrida no lo mira nadie | `.github/workflows/marco-ci.yml`, paso «Sin secretos en el repo (arbol y historia del cambio)» |
| La verificación de producción es read-only | **sin destino**, vigente en 1.9.6 — la sonda de producción del despliegue que reparte el andamio solo lee (pide la dirección y mira el código), pero nada impide que una verificación escriba, y ningún banco corre esa sonda: es deuda declarada del censo de pasos. Verificable leyendo el paso | — |

**Dos de sus filas decían `ninguno` sobre compuertas que ya corrían.** El despliegue
que reparte el andamio tiene tramo de DEV: sube la versión, comprueba que la dirección
conteste, y producción no promueve una versión que DEV no aprobó. Son parciales y así se
cuentan: la sonda de DEV es la mínima —una dirección que contesta con contenido—, no el
smoke de API ni el E2E que el requirement pide, y la promoción es deliberada donde este
requirement la pide automática (la capability en vuelo `promocion-por-ambientes` decidió
lo contrario, y esa diferencia está escrita en la fila). Lo que sigue sin compuerta —que
las verificaciones limpien lo que crean y que la de producción sea de solo lectura—
espera a que existan el smoke y el E2E, que son los que crearían datos.

---

## base-tecnologica — 1 requirement, 1 con compuerta (0 parciales)

Existe en `openspec/specs/` desde el 2026-09-17, cuando se archivó
`una-sola-lista-de-plataformas` (hoy en `openspec/changes/archive/`). Hasta ese día
figuraba en esta página como capability EN VUELO con cuatro requirements: los otros
tres son los que propone `stack-estandar`, que siguen en vuelo sobre una capability
que ya existe —y, por decisión del PO del 2026-09-17, a reescribir: manda el modelo
de capacidades, no la base única que esos tres describen—.

| Requirement | Lo que lo hace fallar solo | Ruta y ancla (2026-09-17) |
|---|---|---|
| Lo que la constitución admite y lo que la herramienta entrega no divergen en silencio | cruza las CUATRO copias de la lista de plataformas y exige que coincidan; y que una pendiente no figure como implementada | `pruebas/andamio/una-sola-lista-de-plataformas.test.mjs` |

---

## documentacion-del-marco — 3 requirements, 3 con compuerta (2 parciales)

Existe en `openspec/specs/` desde el 2026-09-17, cuando se archivaron
`el-andamio-dice-la-verdad` y `orden-de-lectura` (hoy en `openspec/changes/archive/`).
Mientras estuvo en vuelo fue la única capability de esta página que **ya tenía
compuertas corriendo**, y por eso su ausencia de la página, hasta el 2026-08-31, era el
peor tipo de hueco: no faltaba deuda, faltaba cobertura que ya estaba pagada.

| Requirement | Lo que lo hace fallar solo | Ruta y ancla (2026-08-31) |
|---|---|---|
| Lo que el andamio entrega no afirma lo que el árbol contradice | **parcial**: `pruebas/docs/promesas-sin-fuente.test.mjs` cubre la cláusula de las promesas de dinero sobre todo lo que viaja —desde que mira `.yml`— y `pruebas/docs/lo-que-lee-el-consumidor.test.mjs` exige que cada página que viaja esté clasificada y explique su vocabulario. Lo que **no** mira ningún caso es que un documento del andamio describa el comportamiento vigente de una herramienta: eso se sostiene leyendo | `pruebas/docs/promesas-sin-fuente.test.mjs:100` y `pruebas/docs/lo-que-lee-el-consumidor.test.mjs:148` |
| El orden de lectura de la documentación es visible sin abrir nada | **parcial**: el caso «indice · toda pagina de docs/ esta enumerada en el indice» pone rojo un índice que se queda corto, y su refutación saca una página del índice para probar que muerde. Lo que no mira ningún caso es el prefijo numérico de dos dígitos que el requirement exige, ni que el número signifique orden y no importancia | `pruebas/docs/estandar-de-lectura.test.mjs:133`, con la refutación en `:480` |
| Ningún enlace del repositorio apunta a algo que no existe | El banco de enlaces entero: cada enlace relativo tiene que resolver a un archivo que exista y cada ancla a un encabezado que exista, con el piso declarado que el propio requirement pide —un cero ahí es el detector roto, no un repositorio sin navegación— y con sus dos mutaciones al lado | `pruebas/docs/enlaces.test.mjs:145` (el archivo) y `:170` (el ancla); el piso en `:109`; las mutaciones en `:184` y `:196` |

---

## promocion-por-ambientes — capability EN VUELO, 5 requirements, 4 con compuerta (4 parciales)

Tampoco existe en `openspec/specs/`: nace en
`openspec/changes/promocion-por-ambientes/specs/`. **Esta sección decía que el change
estaba en proposal y que no se había construido nada, y ya no era cierto**: al
2026-09-17 lleva 23 de 31 tareas hechas, y dos de sus requirements tienen compuerta desde
que el despliegue del andamio se partió en dos ambientes. Queda uno pendiente, en el
mismo change.

**Las filas «El proyecto declara qué puede publicar y qué no» y «Lo que la persona elige
decide dónde se despliega» no son un adelanto del trabajo**: son bancos que ya existían
por otro motivo y que resultan cubrir parte de estos requirements. Todas se declaran
`parcial` para que nadie lea esa cobertura como completa.

**Lo que esta capability viene a resolver es, justamente, una regla sin compuerta que ya
existía.** `promocion-por-ambientes` está declarada en el canónico de la constitución
desde antes de este change, la reciben todos los proyectos, y hasta este change el
andamio no repartía un solo paso que la cumpliera. Hoy la cumple, en parte, la forma que
recibe despliegue; la que no lo recibe la anota como desvío declarado.

| Requirement | Lo que lo hace fallar solo | Ruta y ancla (2026-09-01) |
|---|---|---|
| Un cambio llega a producción pasando por un ambiente de prueba | **parcial**: el banco del despliegue exige que ningún job publique sobre un CI rojo —y su mutación lo ve fallar—, y el de la compuerta de producción que una versión que nunca se subió a DEV no se promueva, nombrándola. Lo que no cubre: solo el sitio recibe despliegue; la aplicación todavía no (tarea 4.3 del change) | `pruebas/andamio/desplegar.test.mjs:37` y `:194`; `pruebas/andamio/la-compuerta-de-prod.test.mjs:175` |
| La promoción a producción es un acto deliberado con rastro | **parcial**: el caso de la guarda exige que el job `produccion` no mire `workflow_run` y pida el disparo a mano con la casilla marcada —y muta el archivo para verlo fallar—, y el apartamiento de la compuerta tiene nombre y deja escrito quién lo pidió. Que la promoción normal registre quién la pidió lo sostienen la corrida de GitHub y el mensaje de la promoción, y ningún caso lo mira | `pruebas/andamio/desplegar.test.mjs:194`; `pruebas/andamio/la-compuerta-de-prod.test.mjs:227` |
| El proyecto declara qué puede publicar y qué no | **parcial**: el desvío declarado y la portada por forma ya tienen banco | `pruebas/init/asistente.test.mjs`, `pruebas/init/formas.test.mjs` |
| Lo que la persona elige decide dónde se despliega | **parcial**: que una opción ofrecida se pueda armar ya tiene banco | `pruebas/docs/la-carta-no-miente.test.mjs` |
| El costo de publicar está dicho antes de elegir | **pendiente** → change `promocion-por-ambientes` — lo más cerca que hay es que el número de actos humanos del sitio sea el mismo en todas las páginas que lo prometen (`pruebas/docs/actos-humanos.test.mjs`), y eso no dice el costo de cada camino ni que se diga antes de elegir | — |

## Qué NO dice esta tabla

- **No dice que un requirement con compuerta esté completamente cubierto.** Dice que
  existe al menos un camino por el que ese requirement pone algo en rojo solo. Las
  filas que solo cubren una parte del enunciado están marcadas **parcial** con el
  alcance escrito.
- **No dice que toda fila sin compuerta sea deuda, y cada fila dice cuál es.** Una
  pendiente es trabajo con dueño; una no verificable no espera trabajo de nadie, y su
  lugar correcto es el review declarado; una sin destino es trabajo sin dueño, y vence
  con la versión para que no se quede así por olvido.
- **No dice que la columna del medio esté al día.** Que una fila se declare sin
  compuerta cuando ya existe una es indecidible para una máquina: saber si algo pone un
  requirement en rojo exige entender el requirement. Eso sigue dependiendo de que
  alguien relea, y ya se midió lo que cuesta, dos veces: tres filas durante una semana
  en agosto, y nueve en la relectura del 2026-09-17. El vencimiento de las filas sin
  destino obliga a esa relectura en cada versión, pero no la hace. Los comandos de
  arriba están para rehacer esa columna, que es más barato que confiar en ella.
- **Lo que sí tiene compuerta, desde el 2026-08-31, es todo lo demás de esta página**, y
  lo mide
  [`pruebas/docs/cobertura-de-requirements.test.mjs`](../pruebas/docs/cobertura-de-requirements.test.mjs):
  ninguna lista y ningún número de acá se escriben a mano. Las capabilities de las
  secciones tienen que ser exactamente las de `openspec/specs/`; las que se listan como
  EN VUELO, exactamente las que los changes vivos declaran y el contrato todavía no
  tiene; las filas de cada tabla, exactamente los `### Requirement` de su spec y en el
  mismo orden; los dos conteos de cada encabezado, el universo, el desglose y el
  resumen, exactamente lo que dan las filas; todo paso citado por su nombre tiene que
  seguir llamándose así; y toda ruta citada tiene que existir con su línea adentro del
  archivo. **Promover un requirement al contrato sin agregar su fila se pone rojo el
  mismo día** — que era, hasta ayer, lo que esta misma sección declaraba imposible. Y
  desde el 2026-09-17, también: que toda fila sin compuerta declare su estado y que ese
  estado se sostenga (el change vivo existe y la nombra, la propiedad no es un motivo de
  esfuerzo, la versión no venció); que cada encabezado y el resumen publiquen cuántas
  compuertas son parciales; que toda fila con compuerta cite algo que se pueda ir a
  mirar; y que ninguna cite como compuerta una pieza que no corre.
- **Y esta página no se puede volver a perder.** Estuvo huérfana: cero enlaces desde
  todo el repositorio, así que la única forma de encontrarla era saber que existía.
  Desde el 2026-08-31 está enumerada en `docs/README.md`, que es el mapa de la
  documentación, y `pruebas/docs/enlaces.test.mjs` se pone rojo si ese enlace
  desaparece o si aparece otro documento en la raíz de `openspec/` que el mapa no
  nombre. Un documento sin enlaces no está guardado: está perdido con copia de
  seguridad.

---

## capa-descubrimiento — capability EN VUELO, 2 requirements, 1 con compuerta (1 parcial)

No existe en `openspec/specs/`: nace en
`openspec/changes/menu-que-no-miente/specs/`. Es la capability **más chica de esta
página**, y a propósito: los dos requirements dicen una sola cosa —que el menú del
asistente no ofrezca lo que el andamio no puede entregar— desde dos ángulos.

**Uno de los dos ya tiene compuerta, y no porque el change avanzara**: el banco de la
plataforma, que nació cuando el marco sacó GCP de las opciones, pone rojo que el
asistente ofrezca una plataforma que el marco no sostiene. El otro sigue pendiente en el
change, que está en proposal y no se decidió. Lo que sí se aplicó sin esperar la
decisión es la corrección de copia: el detalle de AWS prometía como ventaja un Terraform que
exige una terminal que quien lee no tiene, y omitía que la cuenta gratuita de AWS
se cierra sola a los 6 meses. Eso no era una opción discutible sino una afirmación
que induce a error, y se corrigió.

**Y hay otra al lado.**
`pruebas/docs/promesas-sin-fuente.test.mjs` no cubre estos requirements —cubre otra
cosa: que ninguna copia prometa «sin tarjeta» sin constancia— pero nació del mismo
hallazgo y en el mismo acto. Se nombra acá para que quien lea esta sección no
concluya que del asunto no quedó nada verificándose.

| Requirement | Lo que lo hace fallar solo | Ruta y ancla (2026-09-02) |
|---|---|---|
| El asistente sólo ofrece opciones que el andamio sabe producir | **parcial**: el banco de la plataforma pone rojo que el asistente ofrezca una plataforma que el marco declara sin sostén, y que esconda una que sí lo tiene, con la mutación que devuelve GCP a las opciones. La lista de lo que el marco sostiene está escrita a mano con su motivo; que cada opción produzca un proyecto entero lo miden los casos de punta a punta solo para AWS y para «sin AWS» | `pruebas/init/plataforma.test.mjs:291` y `:307` |
| Una opción no se ofrece si su ventaja exige una herramienta que quien elige no tiene | **pendiente** → change `menu-que-no-miente` — el change está en proposal y todavía no decidió cómo se mide «fuera de alcance» | — |
