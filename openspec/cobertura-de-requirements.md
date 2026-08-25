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
tres mediciones, y el `grep` de arriba lo convierte en línea en un segundo. Las citas
a los demás archivos sí conservan la línea —resuelven al 2026-08-24, verificadas una
por una— pero envejecen igual: la línea es una comodidad, el nombre es el dato.

**Medido el 2026-08-24, después de promover al contrato tres requirements que el
marco ya hacía cumplir sin tenerlos escritos: 41 requirements vivos en 8 capabilities**
(12 `calidad-codigo` + 4 `despliegue-ci` + 2 `gestion-secretos` +
3 `gobierno-contribucion` + 5 `observabilidad` + 6 `operacion-infra` +
4 `pipeline-entrega` + 5 `verificacion-desplegada`). Hay además una **novena
capability en vuelo** —`base-tecnologica`, que nace en el change `stack-estandar` y
todavía no existe en `openspec/specs/`—: su sección va al final, porque una capability
que nace en un change y no en los specs vivos es la asimetría que hay que ver antes de
que se consolide, no después.

**Resumen de la medición: 21 de 41 requirements tienen al menos una compuerta que
falla sola; 20 no la tienen.** Los 20 se concentran donde el marco todavía no reparte
la pieza que los ejecutaría: `despliegue-ci` (4 de 4 sin compuerta),
`verificacion-desplegada` (4 de 5) y `observabilidad` (4 de 5) dependen del esqueleto
de entrega y del código de aplicación que el andamio recién está incorporando.

---

## calidad-codigo — 12 requirements, 11 con compuerta

| Requirement | Lo que lo hace fallar solo | Ruta y ancla (2026-08-24) |
|---|---|---|
| Lint y formato configurados para todos los paquetes | `pnpm lint` desde la raíz sobre todo el árbol, y el paso que exige que cada paquete DECLARE los scripts que el CI corre | `plantilla/.github/workflows/ci.yml:198`; paso «Todo paquete declara los scripts de verificacion», `plantilla/.github/workflows/ci.yml:344` |
| Prohibir `any` sin justificación | La regla `@typescript-eslint/no-explicit-any` que trae `tseslint.configs.recommended`, ejecutada por `pnpm lint` | `plantilla/eslint.config.mjs:44` + `plantilla/.github/workflows/ci.yml:198` |
| Prohibir promesas flotantes | `no-floating-promises` de `recommendedTypeChecked`, más el ajuste de `no-misused-promises` del front | `plantilla/eslint.config.mjs:51` y `:141` + `plantilla/.github/workflows/ci.yml:198` |
| Scripts de verificación sin enmascaramiento de fallo | Paso «Scripts de verificacion sin enmascaramiento» de `marco-ci.yml`, con banco propio en el andamio | `.github/workflows/marco-ci.yml`, paso «Scripts de verificacion sin enmascaramiento»; `pruebas/andamio/manifiestos.test.mjs` (mutación «vuelve un `\|\| true` al script lint de un paquete», `:348`) |
| Test de regresión obligatorio por defecto conocido | **ninguno** | — |
| Las definiciones de pipeline se validan como código | Paso «Definiciones de pipeline validas» (actionlint pinado, corre también en el carril de docs) | `.github/workflows/marco-ci.yml`, paso «Definiciones de pipeline validas» |
| Un repositorio nacido del scaffold no conserva marcadores sin resolver | Paso «Sin marcadores del scaffold sin resolver», con banco que lo hace morder | `.github/workflows/marco-ci.yml`, paso «Sin marcadores del scaffold sin resolver»; `pruebas/marco-ci/higiene-sin-arbol.test.mjs:141` |
| Ningún archivo fuente fuera del alcance de la verificación | La composite action del censo, y el paso que verifica que el consumidor la tenga CABLEADA (un guardrail que se puede sacar en silencio no es un guardrail) | `actions/censo-fuentes/action.yml:62`; paso «Censo de fuentes cableado» de `.github/workflows/marco-ci.yml` |
| El formato acordado se verifica en cada integración | `pnpm format:check` desde la raíz | `plantilla/.github/workflows/ci.yml:199` |
| La cobertura de pruebas alcanza el mínimo acordado y no retrocede | La composite action de cobertura, en sus dos planos (líneas del cambio y total del paquete), más el paso del marco que verifica que el andamio reparta el umbral | `actions/cobertura-diff/action.yml:151`; paso «El andamio reparte el umbral del total del marco» de `.github/workflows/marco-ci.yml` |
| Las reglas de identidad visual del área viajan como reglas de lint verificadas | El banco de las reglas de identidad del andamio: exige el bloque con alcance propio y severidad de error, que cada expresión compile, que acepte su violación y rechace el trabajo honesto, y que cada regla de la constitución tenga estado decidido — y muta copias del andamio para probar que cada comprobación MUERDE | `pruebas/marca/reglas-marca.test.mjs` (mutaciones desde `:263`); el bloque verificado vive en `plantilla/eslint.config.mjs` |
| El esqueleto que entrega el andamio encaja consigo mismo | El banco de acoples del andamio, seis comprobaciones con su mutación al lado | `pruebas/andamio/acoples-del-andamio.test.mjs:134` (.env), `:207` (nombre de la base), `:305` (no-root), `:388` (arquitectura), `:536` (contrato), `:619` (organización a mano) |

**El que no tiene compuerta, y por qué.** «Test de regresión obligatorio por defecto
conocido» es indecidible con un escaneo: distinguir un test que REPRODUCE el defecto de
uno que solo lo acompaña exige entender qué defecto se corrigió. Queda como disciplina
del review y así hay que contarlo, no como cobertura.

---

## despliegue-ci — 4 requirements, 0 con compuerta

| Requirement | Lo que lo hace fallar solo | Ruta y ancla (2026-08-24) |
|---|---|---|
| La rama determina el ambiente de destino | **ninguno** | — |
| El Environment de producción solo acepta deployments desde la rama de integración | **ninguno** | — |
| La trust policy OIDC valida el claim que el proveedor de CI realmente emite | **ninguno** | — |
| Los despliegues a un ambiente compartido se serializan | **ninguno** | — |

**Por qué los cuatro están vacíos, y no es lo mismo que estar olvidados.** El marco
todavía no reparte el workflow de despliegue: el andamio trae `ci.yml`,
`actualizar-marco.yml` y `claude.yml`, y ninguno despliega
(`ls plantilla/.github/workflows/`). Los tres primeros requirements se cumplen en la
configuración del proveedor —Environments, trust policy del rol— que vive fuera del
árbol, y el cuarto (serialización por cola) se configura en el workflow que no existe.
La pieza que los volvería verificables es el esqueleto de entrega, que ya tiene design
decidido en el change `entrega-referenciada`.

---

## gestion-secretos — 2 requirements, 1 con compuerta

| Requirement | Lo que lo hace fallar solo | Ruta y ancla (2026-08-24) |
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

| Requirement | Lo que lo hace fallar solo | Ruta y ancla (2026-08-24) |
|---|---|---|
| Plantilla de pull request | **ninguno** — la plantilla se copia con el scaffold y ningún check verifica que siga existiendo ni que pida lo que el requirement exige | — |
| Definición de propietarios de código | **parcial**: el paso de marcadores pone rojo un `CODEOWNERS` con la sustitución del scaffold sin resolver (que es el modo de falla silencioso: no asigna a nadie y no da error). Que el archivo EXISTA y que asigne por rol no lo verifica nadie | `.github/workflows/marco-ci.yml`, paso «Sin marcadores del scaffold sin resolver»; `pruebas/marco-ci/higiene-sin-arbol.test.mjs:141-148` |
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

| Requirement | Lo que lo hace fallar solo | Ruta y ancla (2026-08-24) |
|---|---|---|
| El servicio registra en JSON estructurado | **ninguno** | — |
| La verificación post-deploy entiende el formato del log | **ninguno** | — |
| Los errores del navegador dejan evidencia en nuestros logs | **ninguno** | — |
| Los errores son correlacionables entre capas | **parcial**: el banco de acoples exige que el front, el API y el banco del front hablen del MISMO contrato, que es la mitad estática de la correlación | `pruebas/andamio/acoples-del-andamio.test.mjs:536` |
| Un aumento de errores del cliente avisa, no espera lectura | **ninguno** | — |

**Por qué esta capability es la que peor se deja verificar estáticamente.** Sus cinco
requirements son propiedades del servicio CORRIENDO: qué forma tiene una línea de log,
qué reconoce el filtro post-deploy, si un reporte del navegador llega. Lo único que un
check estático puede afirmar es que las piezas que las producen existan y encajen entre
sí, y eso es exactamente lo que hace la única fila con compuerta.

---

## operacion-infra — 6 requirements, 4 con compuerta

| Requirement | Lo que lo hace fallar solo | Ruta y ancla (2026-08-24) |
|---|---|---|
| El state de la infraestructura vive en un backend remoto compartido | **parcial**: el pendiente del bucket del state viaja con sus tres partes obligatorias y el banco lo exige; el paso de Terraform del andamio corre `fmt -check` y `validate` sobre las raíces | `pruebas/andamio/infra-pendientes.test.mjs:164` (`pendientesConSusTresPartes`); paso «Formato y validez de las raices de Terraform», `plantilla/.github/workflows/ci.yml:255`, con banco en `pruebas/andamio/terraform-en-ci.test.mjs` |
| Las caídas se detectan por alarma, no por reporte humano | **parcial**: el banco exige que el pendiente de las alarmas viva SOLO en la raíz de producción, no en la de desarrollo | `pruebas/andamio/infra-pendientes.test.mjs:183` (`alarmasSoloEnProd`) |
| El gasto tiene un presupuesto con alerta | **ninguno** | — |
| Los datos de producción están protegidos contra pérdida | **ninguno** | — |
| Higiene operativa de logs y TLS | **parcial**: el pendiente correspondiente entra en la misma guarda de las tres partes y en la de numeración correlativa | `pruebas/andamio/infra-pendientes.test.mjs:164` y `:262` |
| El andamio entrega los huecos de decisión de infraestructura con su criterio | El banco de huecos de infraestructura: tres partes por hueco, numeración correlativa, punteros que resuelven, alarmas solo en producción — cada una con su mutación que la hace morder | `pruebas/andamio/infra-pendientes.test.mjs:164`, `:183`, `:201`, `:240`, y las mutaciones desde `:292` |

**Qué significa «parcial» acá, y es un límite declarado del propio change
`infra-exigible`.** Lo que hay hoy es que el andamio reparta la raíz de infraestructura
con cada decisión pendiente **escrita con su criterio**, y que un banco lo verifique.
Lo que NO existe es la compuerta que exija que la decisión se haya TOMADO: los
pendientes usan un token propio que el paso de marcadores no cuenta, a propósito —con
el marcador gateado, un repositorio recién nacido pasaba de 3 marcadores a 21 y no
podía llegar a verde el primer día—. Esa compuerta llega cuando «este repositorio se
despliega» sea verificable.

---

## pipeline-entrega — 4 requirements, 2 con compuerta

| Requirement | Lo que lo hace fallar solo | Ruta y ancla (2026-08-24) |
|---|---|---|
| CI verifica todos los paquetes de forma bloqueante | El paso que DERIVA del gestor la lista de paquetes y exige que cada uno declare los scripts, con excepciones que solo pueden equivocarse hacia el rojo, y el paso que los corre parado dentro de cada paquete | `plantilla/.github/workflows/ci.yml:344` y `:470` |
| El deploy está gateado por el éxito de CI | **ninguno** | — |
| Cada deploy es reproducible y reversible | **ninguno** | — |
| Los artefactos regenerados no divergen de la versión pinada | Paso «Artefactos regenerados al dia», con banco propio que verifica además que fuera de un árbol git sea ROJO y no «nada que verificar» | `.github/workflows/marco-ci.yml`, paso «Artefactos regenerados al dia»; `pruebas/marco-ci/artefactos.test.mjs` |

**Los dos vacíos son el mismo vacío que `despliegue-ci`:** el marco no reparte todavía
el workflow de despliegue, así que no hay dónde verificar que el deploy dependa de CI
ni que sea reversible.

---

## verificacion-desplegada — 5 requirements, 1 con compuerta

| Requirement | Lo que lo hace fallar solo | Ruta y ancla (2026-08-24) |
|---|---|---|
| El deploy a dev se verifica solo, sin pedirle smoke a nadie | **ninguno** | — |
| Producción solo recibe lo que dev ya verificó | **ninguno** | — |
| Las verificaciones limpian lo que crean | **ninguno** | — |
| Credenciales de prueba fuera del repositorio y de los logs | **parcial, en una sola dirección**: el detector de secretos pone rojo la credencial versionada; que no aparezca en los LOGS de una corrida no lo mira nadie | `.github/workflows/marco-ci.yml`, paso «Sin secretos en el repo (arbol y historia del cambio)» |
| La verificación de producción es read-only | **ninguno** | — |

**Es casi la capability entera esperando la misma pieza.** Sus cinco requirements
describen lo que pasa DESPUÉS de un deploy, y el marco no reparte el workflow que
despliega; el único que tiene algo —las credenciales de prueba— lo tiene solo en la
dirección del repositorio, no en la de los logs, y por eso cuenta como parcial. Que
`gestion-secretos`, `despliegue-ci`, `pipeline-entrega` (2 de 4) y esta capability
compartan el mismo hueco no es cuatro problemas: es uno, y tiene nombre.

---

## base-tecnologica — capability EN VUELO, 3 requirements, 0 con compuerta

No existe en `openspec/specs/`: nace en `openspec/changes/stack-estandar/specs/`
(2 de 24 tareas al 2026-08-24). Se lista acá **antes** de que se consolide, porque una
capability que solo vive en un change es invisible para quien lee los specs vivos de
punta a punta.

| Requirement | Lo que lo hace fallar solo | Ruta y ancla (2026-08-24) |
|---|---|---|
| El marco publica una base tecnológica única y es la primera opción | **ninguno** | — |
| Apartarse de la base se pregunta antes de implementar | **ninguno** | — |
| La base es la primera opción, no una jaula | **ninguno** | — |

---

## Qué NO dice esta tabla

- **No dice que un requirement con compuerta esté completamente cubierto.** Dice que
  existe al menos un camino por el que ese requirement pone algo en rojo solo. Las
  filas que solo cubren una parte del enunciado están marcadas **parcial** con el
  alcance escrito.
- **No dice que un `ninguno` sea deuda.** Algunos son indecidibles con un escaneo
  («test de regresión obligatorio») y su lugar correcto es el review declarado, no una
  compuerta que se pondría roja cuando el trabajo está bien hecho.
- **No es un check.** Es una medición fechada, y ninguna compuerta la mantiene al día:
  agregar un requirement sin agregar su fila no pone nada en rojo. Los comandos de
  arriba están para rehacerla, que es más barato que confiar en ella.
