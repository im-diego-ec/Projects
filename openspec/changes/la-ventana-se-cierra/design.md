---
artefacto: design
dri: Builder 1
aprueba: revision adversarial (desvio del marco: un solo mantenedor, ver AGENTS.md)
estado: en-ejecucion
---

# Design — la-ventana-se-cierra

## Clasificación de distribución

| Pieza | Forma | Por qué esa y no otra |
|---|---|---|
| `actions/cobertura-diff/medir-cobertura-diff.mjs` | **Referenciado** | Los consumidores la ejecutan por `uses:` a versión exacta. El borrado de la ventana tiene que llegar a todos a la vez y dentro del PR de bump, que es donde se lee el rojo. |
| `.github/workflows/marco-ci.yml` (input `ventana_terraform`, paso «Formato y validez de las raices de Terraform», veredicto `marco-ok`) | **Referenciado** | Es el workflow reusable. El input no se puede quitar dentro de la línea 1 (breaking), así que se deja sin efecto; la gravedad es del marco y por eso vive en el env del paso y no en un input. |
| `plantilla/.github/workflows/ci.yml`, `plantilla/AGENTS.md`, `plantilla/infra/README.md`, `plantilla/infra-prod/README.md`, `plantilla/infra/adaptadores.md` | **Scaffold** | Lo que hereda un proyecto nuevo. Se retira la copia inline del paso de Terraform y se corrige lo que la nombraba. **No viaja** a los repos ya nacidos: el parche manual va en «Para consumidores». No cambia la clasificación de ninguna pieza: la verificación de Terraform ya era referenciada (job `terraform` del reusable, desde la 1.8.0); lo que se va es la copia. |
| `actions/README.md` | Documentación del referenciado | Se lee desde el repo del marco; describe la action que se consume. |
| `openspec/changes/la-ventana-se-cierra/specs/calidad-codigo/spec.md` | **Canónico** (al archivar) | Contrato del marco: `ADDED` dos requirements, `MODIFIED` el de cobertura. |
| `openspec/cobertura-de-requirements.md` | Canónico (censo) | Tres anclas se movieron (la copia retirada corrió las líneas del `ci.yml` del andamio) y la fila del state apunta ahora al job del reusable. |
| `actions/cobertura-diff/pruebas/*`, `pruebas/ci-del-marco/ventanas-con-dueno.test.mjs`, `pruebas/ci-del-marco/fechas-en-codigo.mjs` (nuevo, lector compartido por los dos bancos de fechas), `pruebas/ci-del-marco/sin-exigibilidad-futura.test.mjs` (nuevo), `pruebas/andamio/terraform-en-ci.test.mjs`, `pruebas/init/plataforma.test.mjs`, `pruebas/docs/lo-que-lee-el-consumidor.test.mjs` | Del repositorio del marco, no viajan | Bancos. |
| `herramientas/projects-init.mjs` (un comentario) | Herramienta del marco, no viaja | Su comentario decía que el `[ -d ]` se medía en el `ci.yml` del andamio; ahora se mide en el reusable. |

## D1 — Se borra la ventana de cobertura entera, no la constante

Borrar `VENTANA_DE_GRACIA_HASTA` y su rama deja la mitad del mecanismo viva: la ventana
se propagaba por `ventanaHasta`, `enVentana`, `enGracia`, `diasDeVentana`, el veredicto
`sin-plazo-en-gracia`, sus etiquetas y el resumen `porLaVentana`. Rigel lo midió al
portarlo (53 líneas, no 17, commit `771ba2c`). Se borra todo, y el banco
(`actions/cobertura-diff/pruebas/cobertura-total.test.mjs`, caso «el comparador no tiene
ninguna amnistía con fecha») exige que ninguno de esos nombres vuelva.

**Endurecen tres veredictos**: `sin-plazo`, `no-medida` y `denominador-corto`. El spec
vivo solo decía que la ventana aflojaba los dos primeros; el tercero era una amnistía
que el contrato no nombraba.

**Descartado: esperar al 2026-10-01 para escribir el código**, que era lo que la primera
versión de este change planificaba (tarea 3.1). Esa espera tenía sentido cuando un
endurecimiento se estrenaba en modo aviso; la D1 del PO lo terminó como regla general.
Lo que importa del 30 es otra cosa, y queda como pendiente de integración en `tasks.md`:
si la versión que trae este change se **publica** antes del 2026-10-01, el rojo de
cobertura se adelanta al PR de bump de cada consumidor (D1 lo admite: el rojo aparece
donde se lee); si se publica después, no cambia nada, porque la 1.9.6 ya cerró su ventana
sola.

**Descartado: extender la ventana.** Aflojaría un mínimo sin medición nueva, y la D9 del
PO la cierra.

## D2 — `ventana_terraform` queda sin efecto, con default vacío y un aviso

**Descartado: quitarlo.** Quitar un input es breaking (`AGENTS.md`, «Qué es BREAKING»):
un consumidor que lo pasa en su `with:` rompe la corrida entera. Va en v2.

**Lo que sí es: un cambio de contrato dentro de la línea 1, autorizado por la D9.**
Dejar el input sin efecto y bajarle el default de `"2026-09-30"` a `""` cambia el
comportamiento por un default, y `AGENTS.md` («Qué es BREAKING») lo cuenta como breaking:
desde el 2026-10-01, un consumidor con hallazgos de Terraform pasa de rojo con la 1.9.6 a
verde con aviso con esta versión —el «seguir en verde haciendo algo distinto» que esa
sección nombra—, y quien pasaba una fecha ya vencida para endurecer antes también
afloja. La D9 del PO elige esto a sabiendas («`ventana_terraform` queda como no-op hasta
v2»), así que va en la línea 1; lo que no se puede es llamarlo patch. Se nombra como
cambio de contrato en el proposal y en «Para consumidores» del fragmento 07.

**Descartado: dejar el default en `"2026-09-30"`.** Con un default no vacío el paso no
puede distinguir «el consumidor lo pasó» de «llegó el default», así que no puede avisar a
quien tiene que sacarlo; y la fecha seguiría viva para la compuerta de fechas con dueño.
Con default vacío, cualquier valor es del consumidor: el paso lo dice con un
`::notice::`, antes de mirar raíces, para que también se entere un repo sin
infraestructura.

**Descartado: que un valor inválido siga siendo `::error::`.** Validar un input que no
tiene efecto sólo puede romper a alguien. La validación que protegía la comparación de
fechas se va con la comparación.

## D3 — La gravedad de Terraform sale de la línea mayor, y un banco la ata al CHANGELOG

El env `GRAVEDAD_TERRAFORM` del paso vale `warning` en la línea 1 y `error` desde v2. Se
valida antes de usarse: un valor desconocido es `::error::` con el mensaje de que el
defecto es del marco.

**Qué lo hace cumplir solo.** `pruebas/andamio/terraform-en-ci.test.mjs`, caso «la
gravedad del paso y el input ventana_terraform siguen a la LINEA MAYOR del CHANGELOG»,
lee el mayor de la primera `## [X.Y.Z]` del CHANGELOG y exige, en las dos direcciones:

- con mayor ≥ 2: `GRAVEDAD_TERRAFORM: error` y el input `ventana_terraform` ausente. El
  PR que publique la 2.0.0 se pone rojo si falta cualquiera de las dos;
- con mayor 1: `GRAVEDAD_TERRAFORM: warning` y el input presente. Endurecer antes, o
  quitar el input, rompería a un consumidor que mergea el bump sin leerlo.

Su caso «MUERDE» prueba las cuatro separaciones posibles y los dos estados coherentes.

**Descartado: endurecerlo ahora.** Uno de los tres hallazgos —el binario ausente— se
arregla con un `hashicorp/setup-terraform` pinado que es del marco, no del árbol del
consumidor: la D1 manda aviso o breaking, y la D9 eligió v2. Agregar esa action de
terceros requiere OK humano y no entra en este change.

**Descartado: una fecha nueva.** Es lo que este change retira.

**Descartado: un input de gravedad.** Le daría al consumidor la llave de un aviso
perpetuo; la gravedad es de la versión que pina.

**Descartado: que el reusable detecte su propia versión en tiempo de ejecución.** Un
workflow reusable no conoce el ref con el que lo llamaron de forma confiable (el
`github.workflow_ref` es el del llamador), la misma limitación que `AGENTS.md` cita para
que un reusable no pueda referenciar su propio ref en un `uses:`.

## D4 — El andamio deja de traer su propia copia del paso de Terraform

La copia inline vivía en el job `build_test` del `ci.yml` del andamio, con
`VENTANA_TERRAFORM: "2026-09-30"`. Había tres salidas y las tres primeras eran malas:

- **Dejarle la fecha**: una ventana que vence en el repo de otro sin PR que la anuncie.
- **Dejarla en aviso sin fecha**: un aviso perpetuo, porque el andamio se copia una vez y
  ninguna línea mayor la endurece después. Es el «verde perpetuo» que el propio
  encabezado del paso prohibía.
- **Dejarla en rojo sin fecha**: un proyecto de `aws` recién nacido quedaría rojo el día
  uno si el runner no trae el binario, por un defecto del marco (D1).
- **Retirarla — la elegida.** El `ci.yml` del andamio ya llama al reusable, cuyo job
  `terraform` mira `infra` e `infra-prod` por default. La copia, además, ya había
  divergido (sin la guarda de raíces vacías ni el recorte bajo `pull_request_target`) y
  se salteaba justo en los PRs que sólo tocan `infra/`, porque `build_test` no corre en
  el carril de docs y `^infra/` es carril de docs.

**Qué lo hace cumplir solo.** El caso «el andamio NO trae una segunda copia del paso, y
sí llama al reusable que lo corre» del mismo banco: sobre el YAML del andamio sin
comentarios, ni el paso, ni un `terraform fmt`/`terraform validate` inline, ni
`VENTANA_TERRAFORM`/`GRAVEDAD_TERRAFORM`; y exige que el andamio llame a `marco-ci.yml` y
que el default de `raices_terraform` cubra las dos raíces que reparte.

**Lo que costó.** El banco extraía la copia del andamio; ahora extrae el paso del
reusable, que hasta hoy no tenía un solo caso commiteado (el censo de pasos lo daba por
cubierto por colisión de nombre, y el encabezado del job lo declaraba). Gana los casos
de las ramas que sólo el reusable tiene: raíces declaradas vacías, `pull_request_target`,
el input sin efecto, una gravedad inválida y el día de la corrida.

**Cruce con otro carril, declarado.** `pruebas/init/plataforma.test.mjs` leía el
`[ -d "${D}" ]` del `ci.yml` del andamio y pasa a leerlo del reusable (una línea). El
change `rojo-primero`, en curso en otro carril, extiende el censo de pasos a
`plantilla/.github/workflows`: al integrarse, ese censo encuentra un paso menos.

## D5 — La compuerta de fechas con dueño ve el andamio y la asignación de una línea

`pruebas/ci-del-marco/ventanas-con-dueno.test.mjs` suma `plantilla` a sus raíces y
reconoce la asignación YAML de una línea sin `=` (`VENTANA_TERRAFORM: "2026-09-30"`,
también comentada: un `with:` de ejemplo comentado es lo que un consumidor copia).
Medido con la constante de cobertura ya borrada y el resto del árbol como en `fcc9548`:
la versión anterior veía **una** fecha (el default del input); la nueva ve **tres** (el
default, el ejemplo comentado del encabezado de `marco-ci.yml` y el env del andamio).

**La anti-vacuidad pasa a un sujeto sintético.** Con cero fechas vivas, «el escaneo
encuentra algo» sobre el árbol real sería rojo para siempre o habría que dejar una
ventana falsa. El caso nuevo arma un árbol con las tres formas y un fixture de banco que
no tiene que contar.

**Y deja de fiarse del nombre (hallazgo FO-H1 de la revisión adversarial).** Las tres
formas eran tres NOMBRES: una constante en mayúsculas con VENTANA/GRACIA/HASTA/EXIGIBLE,
sólo en `.mjs`/`.js`/`.yml`. La revisión midió cuatro que pasaban por al lado —un
camelCase como el `ventanaHasta` que el comparador usó por dentro, un
`PLAZO_DE_ESTRENO`, un `.ts` del andamio y una fecha escrita directo en un `run:`— y con
cualquiera `ventanasVivas()` devolvía `[]`. Ahora cuenta **toda fecha AAAA-MM-DD en una
línea de código** de producción, se llame como se llame
(`pruebas/ci-del-marco/fechas-en-codigo.mjs`), en JavaScript, TypeScript, YAML, shell y
los ejecutables sin extensión que declaran su intérprete. Las diez fechas de código que
hoy son citas («medido el…», «desde el…» dentro de un mensaje o de una `description`)
se exceptúan **por línea**, con motivo, en `CITAS_QUE_NO_SON_PLAZOS`; una excepción que ya
no encuentra su línea es roja, y eso es también la anti-vacuidad sobre el árbol real.
El caso hermano de `cobertura-total.test.mjs` usa el mismo lector: el comparador no
escribe ninguna fecha en código.

**Descartado: filtrar por «fecha futura».** Una ventana con fecha pasada está cerrada, y
filtrar por el reloj habría dejado el banco sin excepciones. Pero haría depender del
calendario un banco del change que saca el calendario de las compuertas.

**Límite declarado:** una fecha armada en tiempo de ejecución (`new Date(2031, 0, 1)`,
una concatenación) no se ve. Está escrito en el lector y en el comentario del comparador.

**Descartado: prohibir toda ventana en el código.** La D1 terminó el modo aviso como
regla general, no como imposibilidad; la regla del dueño deja la puerta con una decisión
escrita en un change.

## D6 — El banco de la ventana por datos, de Rigel

`pruebas/ci-del-marco/sin-exigibilidad-futura.test.mjs`: ninguna versión del manifiesto
del canónico declara `exigible_desde` posterior a `publicada`. Rigel lo puso en
`pruebas/andamio/`; acá va en `pruebas/ci-del-marco/`, al lado de
`canonico-versionado.test.mjs`, porque mira datos del marco y no del andamio. El
mecanismo sigue vivo en `hallazgoPorFecha` (el change `ventana-vencida` lo dejó como
opción de quien publica); el banco afirma que el marco no lo usa. Su caso rojo muta el
manifiesto real en memoria.

## D7 — El delta del spec

- `MODIFIED` «La cobertura de pruebas alcanza el mínimo acordado y no retrocede»:
  reproduce los **19** escenarios del requirement vivo (verificado a mano contra
  `openspec/specs/calidad-codigo/spec.md`). Los tres de la ventana conservan su título
  —el CLI compara por nombre y no hay `REMOVED` de escenario— y dicen lo que pasa ahora,
  como en Rigel. Salen los dos párrafos de la ventana y el de «la fecha de cierre escrita
  acá»; entran «toda excepción escrita en el contrato, ninguna por fecha» y «la
  verificación no consulta ninguna fecha salvo la que declaró el paquete». La primera
  versión decía «escrita acá, y hoy no hay ninguna», y era falsa: el change
  `el-marco-deja-de-afirmar-lo-que-no-hace` agrega la exención de `.github/` en otro
  requirement de la misma capacidad (hallazgo RV-H4). El texto la nombra y remite a su
  requirement; los dos changes se archivan juntos en la pasada final.
- `ADDED` «Toda fecha que afloja una compuerta tiene un change que la posee»: ya estaba en
  este change; gana el andamio, la forma de una línea, la anti-vacuidad sintética y la
  ventana por datos del calendario del marco.
- `ADDED` «La verificación de la infraestructura como código tiene una sola copia y su
  gravedad sigue a la línea mayor»: la propiedad que D3 y D4 implementan.

Los dos títulos `ADDED` se verificaron a mano: no existen en el spec vivo ni en otro
change activo.

## Por qué se edita un `tasks.md` ya archivado

El archive es historia y no se reescribe **a la ligera**. Acá no se cambia lo que
pasó: se agrega el dato que faltaba —dónde vive el trabajo que quedó vivo—, que
es precisamente lo que convierte un pendiente en algo distinto de un olvido.
Ninguna tarea cambia de estado ni se tilda: se anotan.

La alternativa era dejar el archive intacto y llevar el registro aparte. Se
descarta por lo de siempre: una segunda superficie que alguien tiene que
acordarse de cruzar.

## La compuerta del dueño, y el límite que sí queda

Exige un **marcador explícito** —`DUENO DE LA FECHA: <fecha>`— en el `tasks.md` del
change que se hace cargo, y no una coincidencia de texto: la primera versión cruzaba «la
fecha aparece en algún change activo» y pasaba en verde por el motivo equivocado
(`ventana-vencida` nombra el 2026-09-30 para decir que no la toca).

**El límite:** comprueba que alguien se declaró dueño, no que esté haciendo algo al
respecto. Un marcador en un change abandonado la satisface. Lo que compra es que la
fecha no venza **huérfana**, que era el modo de falla real. Con las dos ventanas
borradas, este change ya no declara el marcador: no queda fecha de la que ser dueño.

## Por qué el 4.5c se declara y no se resuelve

Manda mergear una rama (`feat/cobertura-web-funciones-80`) de un repositorio consumidor
**de Rigel**, el marco del que Projects se bifurcó. Projects tiene tres consumidores
(`custodia-bingo`, `plantilla-sitio`, `plantilla-aplicacion`) y ninguno es ese
repositorio: el sujeto de la tarea no existe acá. Si alguno de los tres tiene un paquete
bajo el mínimo sin deuda, lo que le toca está en «Para consumidores», no en esa rama.

Las tres salidas válidas para un pendiente son tildarlo, darle destino, o declarar que no
bloquea con su razón. Darle destino sería inventar. Se declara.
