# Cobertura de los requirements canónicos

Una fila **por requirement**, con el paso o el test que lo hace **fallar solo**, o
`ninguno`. Vive acá, al lado de `specs/`, porque el dato que responde es el de esta
carpeta: *de todo lo que el marco declara como contrato, ¿qué parte tiene compuerta?*

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
equivocado. El re-conteo del 2026-08-31 es el que sigue.

**Medido el 2026-08-31: 41 requirements vivos en 8 capabilities**
(12 `calidad-codigo` + 4 `despliegue-ci` + 2 `gestion-secretos` +
3 `gobierno-contribucion` + 5 `observabilidad` + 6 `operacion-infra` +
4 `pipeline-entrega` + 5 `verificacion-desplegada`). Hay además **4 capabilities en
vuelo** —`base-tecnologica`, que nace en el change `stack-estandar`,
`documentacion-del-marco`, que nace en `orden-de-lectura`, y
`promocion-por-ambientes`, que nace en el change del mismo nombre, y `capa-descubrimiento`,
que nace en `menu-que-no-miente`—: ninguna existe todavía en
`openspec/specs/`, y sus secciones van al final, porque una capability que nace en un
change y no en los specs vivos es la asimetría que hay que ver antes de que se
consolide, no después.

**Esa cuenta decía «una» hasta el 2026-08-31, y no es una errata: es el mismo defecto
otra vez.** `documentacion-del-marco` llevaba semanas en vuelo y esta página no la
nombraba en ninguna parte — y es la capability cuyo requirement «Ningún enlace del
repositorio apunta a algo que no existe» hace cumplir `pruebas/docs/enlaces.test.mjs`,
o sea que la página que existe para decir qué tiene compuerta se salteó una capability
entera **que sí la tiene**. Desde hoy no se escribe a mano: la lista sale de mirar
`openspec/changes/*/specs/` contra `openspec/specs/`, y lo mide
[`pruebas/docs/cobertura-de-requirements.test.mjs`](../pruebas/docs/cobertura-de-requirements.test.mjs).

**Resumen de la medición: 24 de 41 requirements tienen al menos una compuerta que
falla sola; 17 no la tienen.** Los 17 siguen concentrados donde el marco reparte poco
o nada de la pieza que los ejecutaría: `verificacion-desplegada` (4 de 5),
`observabilidad` (4 de 5) y `despliegue-ci` (2 de 4). El andamio ya reparte un
despliegue —`plantilla/.github/workflows/desplegar.yml`, con su banco en
`pruebas/andamio/desplegar.test.mjs`— pero publica **un solo destino**: mientras no
haya ambiente de desarrollo ni promoción de dev a producción, todo lo que se
especifica *sobre esa secuencia* sigue sin tener dónde fallar.

---

## calidad-codigo — 12 requirements, 11 con compuerta

| Requirement | Lo que lo hace fallar solo | Ruta y ancla (2026-08-31) |
|---|---|---|
| Lint y formato configurados para todos los paquetes | `pnpm lint` desde la raíz sobre todo el árbol, y el paso que exige que cada paquete DECLARE los scripts que el CI corre | `plantilla/.github/workflows/ci.yml:205`; paso «Todo paquete declara los scripts de verificacion», `plantilla/.github/workflows/ci.yml:354` |
| Prohibir `any` sin justificación | La regla `@typescript-eslint/no-explicit-any` que trae `tseslint.configs.recommended`, ejecutada por `pnpm lint` | `plantilla/eslint.config.mjs:58` + `plantilla/.github/workflows/ci.yml:205` |
| Prohibir promesas flotantes | `no-floating-promises` de `recommendedTypeChecked`, más el ajuste de `no-misused-promises` del front | `plantilla/eslint.config.mjs:65` y `:155` + `plantilla/.github/workflows/ci.yml:205` |
| Scripts de verificación sin enmascaramiento de fallo | Paso «Scripts de verificacion sin enmascaramiento» de `marco-ci.yml`, con banco propio en el andamio | `.github/workflows/marco-ci.yml`, paso «Scripts de verificacion sin enmascaramiento»; `pruebas/andamio/manifiestos.test.mjs` (mutación «vuelve un `\|\| true` al script lint de un paquete», `:360`) |
| Test de regresión obligatorio por defecto conocido | **ninguno** | — |
| Las definiciones de pipeline se validan como código | Paso «Definiciones de pipeline validas» (actionlint pinado, corre también en el carril de docs) | `.github/workflows/marco-ci.yml`, paso «Definiciones de pipeline validas» |
| Un repositorio nacido del scaffold no conserva marcadores sin resolver | Paso «Sin marcadores del scaffold sin resolver», con banco que lo hace morder | `.github/workflows/marco-ci.yml`, paso «Sin marcadores del scaffold sin resolver»; `pruebas/marco-ci/higiene-sin-arbol.test.mjs:139` |
| Ningún archivo fuente fuera del alcance de la verificación | La composite action del censo, y el paso que verifica que el consumidor la tenga CABLEADA (un guardrail que se puede sacar en silencio no es un guardrail) | `actions/censo-fuentes/action.yml:62`; paso «Censo de fuentes cableado» de `.github/workflows/marco-ci.yml` |
| El formato acordado se verifica en cada integración | `pnpm format:check` desde la raíz | `plantilla/.github/workflows/ci.yml:206` |
| La cobertura de pruebas alcanza el mínimo acordado y no retrocede | La composite action de cobertura, en sus dos planos (líneas del cambio y total del paquete), más el paso del marco que verifica que el andamio reparta el umbral | `actions/cobertura-diff/action.yml:151`; paso «El andamio reparte el umbral del total del marco» de `.github/workflows/marco-ci.yml` |
| Las reglas de identidad visual del área viajan como reglas de lint verificadas | El banco de las reglas de identidad del andamio: exige el bloque con alcance propio y severidad de error, que cada expresión compile, que acepte su violación y rechace el trabajo honesto, y que cada regla de la constitución tenga estado decidido — y muta copias del andamio para probar que cada comprobación MUERDE | `pruebas/marca/reglas-marca.test.mjs` (mutaciones desde `:261`); el bloque verificado vive en `plantilla/eslint.config.mjs` |
| El esqueleto que entrega el andamio encaja consigo mismo | El banco de acoples del andamio, seis comprobaciones con su mutación al lado | `pruebas/andamio/acoples-del-andamio.test.mjs:134` (.env), `:207` (nombre de la base), `:305` (no-root), `:388` (arquitectura), `:542` (contrato), `:669` (organización a mano) |

**El que no tiene compuerta, y por qué.** «Test de regresión obligatorio por defecto
conocido» es indecidible con un escaneo: distinguir un test que REPRODUCE el defecto de
uno que solo lo acompaña exige entender qué defecto se corrigió. Queda como disciplina
del review y así hay que contarlo, no como cobertura.

---

## despliegue-ci — 4 requirements, 2 con compuerta

| Requirement | Lo que lo hace fallar solo | Ruta y ancla (2026-08-31) |
|---|---|---|
| La rama determina el ambiente de destino | **parcial**: el caso «NO publica si las verificaciones no terminaron en verde» exige `branches: [main]` en el disparo, y el de la corrida a mano exige que el disparo manual tampoco publique sin `ci-ok`. Lo que ningún caso mira es la correspondencia rama→ambiente, porque hay **un solo** ambiente | `pruebas/andamio/desplegar.test.mjs:35` y `:208`; el disparo verificado vive en `plantilla/.github/workflows/desplegar.yml` |
| El Environment de producción solo acepta deployments desde la rama de integración | **ninguno** | — |
| La trust policy OIDC valida el claim que el proveedor de CI realmente emite | **ninguno** | — |
| Los despliegues a un ambiente compartido se serializan | El caso «dos publicaciones a la vez HACEN COLA: ninguna cancela a la otra», que mira las líneas EJECUTABLES del workflow —no el comentario de al lado— y exige `cancel-in-progress: false` | `pruebas/andamio/desplegar.test.mjs:129` |

**Qué cambió desde la medición anterior, que decía «los cuatro vacíos».** El andamio ya
reparte un despliegue: `plantilla/.github/workflows/desplegar.yml`, con quince casos en
`pruebas/andamio/desplegar.test.mjs`. La afirmación de que «el andamio trae `ci.yml`,
`actualizar-marco.yml` y `claude.yml`, y ninguno despliega» era cierta cuando se
escribió y hoy no lo es — y `ls plantilla/.github/workflows/`, que era el comando que la
respaldaba, es el que la refuta.

**Qué sigue sin compuerta, y no es lo mismo que estar olvidado.** El Environment de
producción y la trust policy OIDC se cumplen en la configuración del proveedor, que vive
fuera del árbol: no hay archivo que un banco pueda leer. Y la correspondencia
rama→ambiente solo es medible cuando haya **más de un** ambiente: el despliegue de hoy
publica un destino único, así que el tramo de dev y la promoción que el spec describe no
tienen todavía dónde fallar. La pieza que los volvería verificables es el esqueleto de
entrega, que ya tiene design decidido en el change `entrega-referenciada`.

---

## gestion-secretos — 2 requirements, 1 con compuerta

| Requirement | Lo que lo hace fallar solo | Ruta y ancla (2026-08-31) |
|---|---|---|
| Los secretos de runtime se inyectan por referencia, nunca horneados | **parcial**: el paso «Sin secretos en el repo (arbol y historia del cambio)» detecta el secreto EN TEXTO PLANO en el árbol y en la historia del cambio | `.github/workflows/marco-ci.yml`, paso «Sin secretos en el repo (arbol y historia del cambio)»; `pruebas/marco-ci/secretos.test.mjs` |
| Una rotación de credenciales no interrumpe el servicio | **ninguno** | — |

**El alcance de ese «parcial», dicho para que no se lea como cobertura completa.** El
detector encuentra un valor sensible versionado; no puede decir que la definición de
tarea use una REFERENCIA al gestor de secretos, porque esa definición vive en el state
del proveedor y no en el repositorio. El requirement de rotación es observable solo
contra un ambiente vivo: pertenece a la familia que cierra la verificación desplegada.

---

## gobierno-contribucion — 3 requirements, 1 con compuerta

| Requirement | Lo que lo hace fallar solo | Ruta y ancla (2026-08-31) |
|---|---|---|
| Plantilla de pull request | **ninguno** — la plantilla se copia con el scaffold y ningún check verifica que siga existiendo ni que pida lo que el requirement exige | — |
| Definición de propietarios de código | **parcial**: el paso de marcadores pone rojo un `CODEOWNERS` con la sustitución del scaffold sin resolver (que es el modo de falla silencioso: no asigna a nadie y no da error). Que el archivo EXISTA y que asigne por rol no lo verifica nadie | `.github/workflows/marco-ci.yml`, paso «Sin marcadores del scaffold sin resolver»; `pruebas/marco-ci/higiene-sin-arbol.test.mjs:139-150` |
| Branch protection documentada como paso manual | **ninguno** | — |

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

## observabilidad — 5 requirements, 1 con compuerta

| Requirement | Lo que lo hace fallar solo | Ruta y ancla (2026-08-31) |
|---|---|---|
| El servicio registra en JSON estructurado | **ninguno** | — |
| La verificación post-deploy entiende el formato del log | **ninguno** | — |
| Los errores del navegador dejan evidencia en nuestros logs | **ninguno** | — |
| Los errores son correlacionables entre capas | **parcial**: el banco de acoples exige que el front, el API y el banco del front hablen del MISMO contrato, que es la mitad estática de la correlación | `pruebas/andamio/acoples-del-andamio.test.mjs:542` |
| Un aumento de errores del cliente avisa, no espera lectura | **ninguno** | — |

**Por qué esta capability es la que peor se deja verificar estáticamente.** Sus cinco
requirements son propiedades del servicio CORRIENDO: qué forma tiene una línea de log,
qué reconoce el filtro post-deploy, si un reporte del navegador llega. Lo único que un
check estático puede afirmar es que las piezas que las producen existan y encajen entre
sí, y eso es exactamente lo que hace la única fila con compuerta.

---

## operacion-infra — 6 requirements, 4 con compuerta

| Requirement | Lo que lo hace fallar solo | Ruta y ancla (2026-08-31) |
|---|---|---|
| El state de la infraestructura vive en un backend remoto compartido | **parcial**: el pendiente del bucket del state viaja con sus tres partes obligatorias y el banco lo exige; el paso de Terraform del andamio corre `fmt -check` y `validate` sobre las raíces | `pruebas/andamio/infra-pendientes.test.mjs:164` (`pendientesConSusTresPartes`); paso «Formato y validez de las raices de Terraform», `plantilla/.github/workflows/ci.yml:262`, con banco en `pruebas/andamio/terraform-en-ci.test.mjs` |
| Las caídas se detectan por alarma, no por reporte humano | **parcial**: el banco exige que el pendiente de las alarmas viva SOLO en la raíz de producción, no en la de desarrollo | `pruebas/andamio/infra-pendientes.test.mjs:183` (`alarmasSoloEnProd`) |
| El gasto tiene un presupuesto con alerta | **ninguno** | — |
| Los datos de producción están protegidos contra pérdida | **ninguno** | — |
| Higiene operativa de logs y TLS | **parcial**: el pendiente correspondiente entra en la misma guarda de las tres partes y en la de numeración correlativa | `pruebas/andamio/infra-pendientes.test.mjs:164` y `:240` |
| El andamio entrega los huecos de decisión de infraestructura con su criterio | El banco de huecos de infraestructura: tres partes por hueco, numeración correlativa, punteros que resuelven, alarmas solo en producción — cada una con su mutación que la hace morder | `pruebas/andamio/infra-pendientes.test.mjs:164`, `:183`, `:201`, `:240`, y las mutaciones desde `:284` |

**Qué significa «parcial» acá, y es un límite declarado del propio change
`infra-exigible`.** Lo que hay hoy es que el andamio reparta la raíz de infraestructura
con cada decisión pendiente **escrita con su criterio**, y que un banco lo verifique.
Lo que NO existe es la compuerta que exija que la decisión se haya TOMADO: los
pendientes usan un token propio que el paso de marcadores no cuenta, a propósito —con
el marcador gateado, un repositorio recién nacido pasaba de 3 marcadores a 21 y no
podía llegar a verde el primer día—. Esa compuerta llega cuando «este repositorio se
despliega» sea verificable.

---

## pipeline-entrega — 4 requirements, 3 con compuerta

| Requirement | Lo que lo hace fallar solo | Ruta y ancla (2026-08-31) |
|---|---|---|
| CI verifica todos los paquetes de forma bloqueante | El paso que DERIVA del gestor la lista de paquetes y exige que cada uno declare los scripts, con excepciones que solo pueden equivocarse hacia el rojo, y el paso que los corre parado dentro de cada paquete | `plantilla/.github/workflows/ci.yml:354` y `:497` |
| El deploy está gateado por el éxito de CI | **parcial**: cuatro casos del banco del despliegue, y uno de ellos es una mutación que corre la misma detección que la regla — la condición `workflow_run.conclusion == 'success'`, el `ref: head_sha` (se publica el SHA que CI midió, no la punta de la rama), y la corrida a mano, que consulta `ci-ok` sobre ese commit y deja rastro si alguien se aparta. Lo que no está cubierto es la secuencia dev→producción, que necesita el segundo ambiente | `pruebas/andamio/desplegar.test.mjs:35`, `:192` (la mutación), `:208` y `:223` |
| Cada deploy es reproducible y reversible | **ninguno** | — |
| Los artefactos regenerados no divergen de la versión pinada | Paso «Artefactos regenerados al dia», con banco propio que verifica además que fuera de un árbol git sea ROJO y no «nada que verificar» | `.github/workflows/marco-ci.yml`, paso «Artefactos regenerados al dia»; `pruebas/marco-ci/artefactos.test.mjs` |

**Por qué la compuerta de CI→deploy ya existe y la de reversibilidad no.** La primera
vive entera dentro del árbol: es una condición escrita en un workflow que el andamio
reparte, y un banco puede leerla y mutarla. La segunda no: el requirement pide un tag
inmutable derivado del SHA en un registro de artefactos y un procedimiento de vuelta
atrás **sin reconstruir**, y el despliegue de hoy compila y publica en el momento — no
hay artefacto guardado al que volver, así que no hay nada que un banco pueda mirar. La
fila anterior decía `ninguno` en las dos por el mismo motivo («el marco no reparte
todavía el workflow de despliegue»), y ese motivo ya solo vale para una.

---

## verificacion-desplegada — 5 requirements, 1 con compuerta

| Requirement | Lo que lo hace fallar solo | Ruta y ancla (2026-08-31) |
|---|---|---|
| El deploy a dev se verifica solo, sin pedirle smoke a nadie | **ninguno** | — |
| Producción solo recibe lo que dev ya verificó | **ninguno** | — |
| Las verificaciones limpian lo que crean | **ninguno** | — |
| Credenciales de prueba fuera del repositorio y de los logs | **parcial, en una sola dirección**: el detector de secretos pone rojo la credencial versionada; que no aparezca en los LOGS de una corrida no lo mira nadie | `.github/workflows/marco-ci.yml`, paso «Sin secretos en el repo (arbol y historia del cambio)» |
| La verificación de producción es read-only | **ninguno** | — |

**Es casi la capability entera esperando la misma pieza, y la pieza que falta ya no es
el despliegue.** Sus cinco requirements describen la SECUENCIA que va después de un
deploy —dev se verifica solo, producción recibe únicamente lo que dev aprobó, las
verificaciones limpian lo que crean—, y el despliegue que el andamio reparte publica un
destino único sin tramo de dev: no hay dev que verificar ni promoción que gatear. El
único requirement que tiene algo —las credenciales de prueba— lo tiene solo en la
dirección del repositorio, no en la de los logs, y por eso cuenta como parcial. Que
`gestion-secretos` (1 de 2), `despliegue-ci` (2 de 4), `pipeline-entrega` (3 de 4) y
esta capability compartan el mismo hueco no es cuatro problemas: es uno, y tiene nombre
—el segundo ambiente y la promoción entre los dos—.

---

## base-tecnologica — capability EN VUELO, 3 requirements, 0 con compuerta

No existe en `openspec/specs/`: nace en `openspec/changes/stack-estandar/specs/`
(2 de 24 tareas al 2026-08-31). Se lista acá **antes** de que se consolide, porque una
capability que solo vive en un change es invisible para quien lee los specs vivos de
punta a punta.

| Requirement | Lo que lo hace fallar solo | Ruta y ancla (2026-08-31) |
|---|---|---|
| El marco publica una base tecnológica única y es la primera opción | **ninguno** | — |
| Apartarse de la base se pregunta antes de implementar | **ninguno** | — |
| La base es la primera opción, no una jaula | **ninguno** | — |

---

## documentacion-del-marco — capability EN VUELO, 2 requirements, 2 con compuerta

Tampoco existe en `openspec/specs/`: nace en
`openspec/changes/orden-de-lectura/specs/`. Es la única capability en vuelo que **ya
tiene compuertas corriendo**, y por eso su ausencia de esta página era el peor tipo de
hueco: no faltaba deuda, faltaba cobertura que ya estaba pagada.

| Requirement | Lo que lo hace fallar solo | Ruta y ancla (2026-08-31) |
|---|---|---|
| El orden de lectura de la documentación es visible sin abrir nada | **parcial**: el caso «indice · toda pagina de docs/ esta enumerada en el indice» pone rojo un índice que se queda corto, y su refutación saca una página del índice para probar que muerde. Lo que no mira ningún caso es el prefijo numérico de dos dígitos que el requirement exige, ni que el número signifique orden y no importancia | `pruebas/docs/estandar-de-lectura.test.mjs:133`, con la refutación en `:480` |
| Ningún enlace del repositorio apunta a algo que no existe | El banco de enlaces entero: cada enlace relativo tiene que resolver a un archivo que exista y cada ancla a un encabezado que exista, con el piso declarado que el propio requirement pide —un cero ahí es el detector roto, no un repositorio sin navegación— y con sus dos mutaciones al lado | `pruebas/docs/enlaces.test.mjs:145` (el archivo) y `:170` (el ancla); el piso en `:109`; las mutaciones en `:184` y `:196` |

---

## promocion-por-ambientes — capability EN VUELO, 5 requirements, 2 con compuerta

Tampoco existe en `openspec/specs/`: nace en
`openspec/changes/promocion-por-ambientes/specs/`. Es la capability **con más
requirements sin compuerta de toda esta página**, y eso es correcto y esperable: el
change está en su fase de proposal, o sea que todavía no se construyó nada.

**Las dos filas que sí tienen compuerta no son un adelanto del trabajo**: son bancos que
ya existían por otro motivo y que resultan cubrir parte de estos requirements. Se
declaran como `parcial` para que nadie lea esa cobertura como completa.

**Lo que esta capability viene a resolver es, justamente, una regla sin compuerta que ya
existe.** `promocion-por-ambientes` está declarada en el canónico de la constitución
desde antes de este change, la reciben todos los proyectos, y el andamio no reparte un
solo paso que la cumpla. Hasta que exista, cada proyecto la anota como desvío declarado.

| Requirement | Lo que lo hace fallar solo | Ruta y ancla (2026-09-01) |
|---|---|---|
| Un cambio llega a producción pasando por un ambiente de prueba | **ninguno** — el change está en proposal | — |
| La promoción a producción es un acto deliberado con rastro | **ninguno** — el change está en proposal | — |
| El proyecto declara qué puede publicar y qué no | **parcial**: el desvío declarado y la portada por forma ya tienen banco | `pruebas/init/asistente.test.mjs`, `pruebas/init/formas.test.mjs` |
| Lo que la persona elige decide dónde se despliega | **parcial**: que una opción ofrecida se pueda armar ya tiene banco | `pruebas/docs/la-carta-no-miente.test.mjs` |
| El costo de publicar está dicho antes de elegir | **ninguno** — el change está en proposal | — |

## Qué NO dice esta tabla

- **No dice que un requirement con compuerta esté completamente cubierto.** Dice que
  existe al menos un camino por el que ese requirement pone algo en rojo solo. Las
  filas que solo cubren una parte del enunciado están marcadas **parcial** con el
  alcance escrito.
- **No dice que un `ninguno` sea deuda.** Algunos son indecidibles con un escaneo
  («test de regresión obligatorio») y su lugar correcto es el review declarado, no una
  compuerta que se pondría roja cuando el trabajo está bien hecho.
- **No dice que la columna del medio esté al día.** Que una fila diga `ninguno` cuando
  ya existe una compuerta es indecidible para una máquina: saber si algo pone un
  requirement en rojo exige entender el requirement. Eso sigue dependiendo de que
  alguien releía, y ya se midió lo que cuesta —tres filas quedaron diciendo `ninguno`
  durante una semana sobre compuertas que existían—. Los comandos de arriba están para
  rehacer esa columna, que es más barato que confiar en ella.
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
  mismo día** — que era, hasta ayer, lo que esta misma sección declaraba imposible.
- **Y esta página no se puede volver a perder.** Estuvo huérfana: cero enlaces desde
  todo el repositorio, así que la única forma de encontrarla era saber que existía.
  Desde el 2026-08-31 está enumerada en `docs/README.md`, que es el mapa de la
  documentación, y `pruebas/docs/enlaces.test.mjs` se pone rojo si ese enlace
  desaparece o si aparece otro documento en la raíz de `openspec/` que el mapa no
  nombre. Un documento sin enlaces no está guardado: está perdido con copia de
  seguridad.

---

## capa-descubrimiento — capability EN VUELO, 2 requirements, 0 con compuerta

No existe en `openspec/specs/`: nace en
`openspec/changes/menu-que-no-miente/specs/`. Es la capability **más chica de esta
página**, y a propósito: los dos requirements dicen una sola cosa —que el menú del
asistente no ofrezca lo que el andamio no puede entregar— desde dos ángulos.

**Los dos están sin compuerta porque el change está en proposal, y ese proposal
todavía no se decidió.** Lo que sí se aplicó sin esperar la decisión es la
corrección de copia: el detalle de AWS prometía como ventaja un Terraform que
exige una terminal que quien lee no tiene, y omitía que la cuenta gratuita de AWS
se cierra sola a los 6 meses. Eso no era una opción discutible sino una afirmación
que induce a error, y se corrigió.

**La compuerta que sí existe hoy es la de al lado.**
`pruebas/docs/promesas-sin-fuente.test.mjs` no cubre estos requirements —cubre otra
cosa: que ninguna copia prometa «sin tarjeta» sin constancia— pero nació del mismo
hallazgo y en el mismo acto. Se nombra acá para que quien lea esta sección no
concluya que del asunto no quedó nada verificándose.

| Requirement | Lo que lo hace fallar solo | Ruta y ancla (2026-09-02) |
|---|---|---|
| El asistente sólo ofrece opciones que el andamio sabe producir | **ninguno** — el change está en proposal | — |
| Una opción no se ofrece si su ventaja exige una herramienta que quien elige no tiene | **ninguno** — el change está en proposal | — |
