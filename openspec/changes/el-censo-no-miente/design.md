# Diseño — el censo no miente

## Clasificación de distribución de cada pieza

| Pieza | Forma | Por qué esa y no otra |
|---|---|---|
| `pruebas/docs/cobertura-de-requirements.test.mjs` (los tres estados, las parciales, la compuerta que no corre, la cita obligatoria) | **no viaja** (banco del marco) | Vigila la página de cobertura del marco. Un consumidor no tiene página que vigilar. |
| `pruebas/andamio/actions-alcanzables.test.mjs` (nuevo) | **no viaja** | Mira las actions que el marco publica y los `uses:` del marco y del andamio. La pregunta es del marco: ¿publico algo que nadie corre? |
| `pruebas/alcance-de-las-actions.mjs` (nuevo, el lector único del alcance) | **no viaja** | Lo importan dos bancos. Ver D2 sobre por qué vive en `pruebas/` y no en `herramientas/`. |
| `pruebas/vigencia.mjs` (nuevo, el lector único de la versión publicada y el predicado de vencimiento) | **no viaja** | Lo importan tres bancos. Mismo criterio que el anterior. |
| `pruebas/andamio/pinado.test.mjs` (la excepción de `@v1` declara `vigenteEn`) | **no viaja** | Banco del marco. |
| `openspec/cobertura-de-requirements.md` | **no viaja**; no es canónica | Es una medición fechada del marco sobre su propio contrato (`docs/README.md` la clasifica así). No la copia nadie ni manda sobre nada. |
| Los cuatro requirements de `calidad-codigo` | **canónico** | Son contrato del marco, y hablan de la superficie que publica la cobertura **del marco**: un consumidor no tiene nada que cumplir con ellos. |
| `openspec/config.yaml` (la línea del contexto que describe la página) y `docs/README.md` (su fila en el mapa) | **no viaja** | Describen la página; se corrigen en el mismo cambio para no afirmar la forma vieja. |

**Nada es referenciado ni scaffold**: ningún workflow reusable, ninguna action y ningún
archivo de `plantilla/` cambian. Por eso el contrato es **sin contrato** y ningún
consumidor recibe nada.

## D1. La ausencia tiene tres estados, y el tercero es de este marco

**Decisión: tres formas de celda** —``**pendiente** → change `<nombre>` ``,
`**no verificable** — <propiedad>` y `**sin destino**, vigente en X.Y.Z — <texto>`—, y
`**ninguno**` pelado es rojo.

Rigel tiene dos (`rigel:compuerta-pendiente <destino>` y `rigel:sin-compuerta
<propiedad>`), y su destino admitía «issue, change o documento»: sus 36 pendientes
apuntaban a un issue paraguas. Acá el destino tiene que ser algo que el banco compruebe
**sin red** —el banco del marco corre sin red y sin dependencias—, y lo único así es un
change vivo que nombra al requirement con su título exacto. Medido el 2026-09-17: de los
11 requirements del contrato sin compuerta, **ninguno** aparece en un change vivo
(`grep -rlF '<título>' openspec/changes`, fuera de `archive/`, da cero para los once).

Con dos estados habría que elegir entre inventar un destino o afirmar «no verificable»
sobre once reglas que sí se pueden verificar. Rigel midió qué pasa con la segunda: su
primer delta de `censo-honesto` obligaba a mentir, y lo corrigió antes de implementar
(commit 7ce8037 de allá: «bajo ese texto habría que escribir 44 afirmaciones falsas, con
un rojo del propio marco empujando a escribirlas»). **«Sin destino» dice la verdad
—verificable y sin dueño— y, para no ser la ausencia gratis con otro nombre, vence**: lleva
la versión publicada en que se decidió y se pone rojo al cortar la siguiente.

**Alternativa descartada: aceptar `#N` (un issue) como destino.** El banco no puede
comprobar sin red que el issue exista ni que siga abierto: un issue cerrado seguiría
leyéndose como destino, que es el fail-open que el marco persigue.

**Alternativa descartada: una sola vigencia para toda la página** (una línea «las filas
sin destino se decidieron en la X.Y.Z»). Es más barata en el release, pero una fila
declarada después heredaría una decisión que no se tomó sobre ella. Por fila, cada una
lleva la suya.

**Alternativa descartada: vencer por fecha.** Las otras excepciones del marco con ventana
ya vencen por versión (la de `@v1` desde este change, y las de Rigel desde la 2.5.0), y el
PR del release es el único momento en que alguien mira todo el marco de una vez. Una fecha
vencería en un PR cualquiera, de alguien que no tiene nada que ver.

**Alternativa descartada: portar el censo por marcas de Rigel** (`censo-compuertas.mjs` y
las marcas `rigel:sin-compuerta` / `rigel:compuerta-pendiente` dentro de cada spec). Ya la
descartó el change `rojo-primero` (su D2): tendría este marco dos respuestas a «¿qué
requirement tiene compuerta?», y en una doble contabilidad la declaración pierde contra el
código. Lo que se trae es la regla, aplicada a la única superficie que hay.

**El motivo de esfuerzo es un proxy y se declara como proxy**, igual que en Rigel: una
lista cerrada de fórmulas baratas («es difícil», «no hay tiempo», «no es prioridad»,
«más adelante»…), con el caso sutil dejado al review. Tiene su control positivo en el
banco: una propiedad de verdad pasa.

## D2. Los lectores únicos viven en `pruebas/`, no en `herramientas/`

**El plan del porte decía `herramientas/alcance-de-las-actions.mjs`, como en Rigel. Manda
el árbol:** en este marco `herramientas/` es una superficie que **viaja** —el job
`changelog-en-el-pr` de `.github/workflows/ci.yml` la lista entre las que llegan a un
consumidor (`SUPERFICIES="actions .github/workflows/marco-ci.yml plantilla herramientas"`)—,
y estos dos lectores no le llegan a nadie. En Rigel lo importa una herramienta que corre
en CI (`censo-compuertas.mjs`); acá lo importan solo bancos. Es el mismo criterio que ya
siguieron `pruebas/aserciones-con-evidencia.mjs` y `pruebas/porque.mjs`.

**Por qué un solo lector y no dos copias.** Es el requirement de
`los-bancos-dicen-por-que` («un predicado que vive en dos lugares se ata por
comportamiento, o no se copia»), y acá la discrepancia sería peor que teórica: con dos
lectores del alcance, el banco de alcanzables podría eximir una pieza que la página cuenta
como compuerta. Con dos lectores del CHANGELOG, una excepción vencería con una versión y
los pines se compararían con otra. `pinado.test.mjs` tenía su propia copia del lector; se
reemplazó por el único.

**El lector del alcance no recorre repositorios anidados.** Una carpeta con su propio
`.git` —un worktree de una sesión de agente dentro del checkout— trae una copia entera de
`.github/workflows/`, y su `uses:` haría «alcanzada» a una action que el árbol medido no
invoca. Es la dirección insegura. El banco lo muerde con un worktree de juguete.

## D3. Rojo, y no aviso como en Rigel

En Rigel, que el censo contara una action sin invocar era un `::warning::` y no un rojo,
porque el rojo de esa ventana ya lo daba el banco de alcanzables y el aviso era de una
herramienta que corre en CI. Acá el arreglo es **editar una fila de la página**, que está
en el árbol de quien la lee: no hay ventana que esperar ni nada fuera del árbol. Y todo
esto corre solo en el CI del marco, así que la regla de estrenar en aviso —que protege a
los consumidores de un rojo que nadie les anunció— no aplica: no hay consumidor.

**La excepción de una action en alcanzables no la vuelve compuerta.** Es lo que Rigel
cerró en la 2.6.0 (issue #457 de allá): la excepción apaga el rojo de «nadie la invoca»
durante una ventana legítima, pero la página no puede publicar esa pieza como sosteniendo
un requirement. El banco de la página lee el alcance real, no la lista de excepciones.

## D4. `carril-docs` se declara, no se cablea

El lote pedía decidir. **Se declara** en `EXCEPCIONES` de
`pruebas/andamio/actions-alcanzables.test.mjs`, con su motivo y `vigenteEn: "1.9.6"`.

**Alternativa descartada: cablearla en `marco-ci.yml`.** Cambia el workflow que consumen
los proyectos —es contrato— para reemplazar algo que ya funciona: el job `cambios` de
`marco-ci.yml` trae su propia detección del carril de docs. **Alternativa descartada:
cablearla en el andamio.** Cada proyecto nuevo recibiría una segunda detección del mismo
carril, al lado de la que ya le da `marco-ci.yml`. **Alternativa descartada: retirarla.**
Es breaking para quien la invoque por `uses:` —el marco la documenta en
`actions/README.md` en sus tres modos—, y no se sabe si alguien lo hace.

**Lo que esta decisión deja escrito y no resuelve:** el marco tiene **dos detecciones del
mismo carril**, la de la action y la inline de `marco-ci.yml`, con los mismos patrones por
defecto. Es un predicado en dos lugares sin atar por comportamiento. Unificarlas toca el
contrato del reusable: es trabajo de la línea v2, y queda como pendiente del change.

## D5. La relectura de las 25 filas, y cómo se decidió cada una

Cada fila `**ninguno**` se releyó contra el árbol buscando **tres cosas en este orden**:
(1) si ya había algo que la pone en rojo —un banco, un paso—; (2) si un change vivo
nombra al requirement; (3) si una propiedad del requirement impide verificarlo. Resultado:

| Resultado | Filas | Cuáles |
|---|---|---|
| Ya tenían compuerta parcial | 9 | Contrato: plantilla de PR, protección de la rama, log en JSON, deploy reproducible y reversible, deploy a dev que se verifica, producción que solo recibe lo verificado. En vuelo: el cambio que pasa por un ambiente de prueba, la promoción deliberada, el asistente que solo ofrece lo que sabe producir |
| Pendiente en un change vivo | 5 | Las tres de `base-tecnologica` (change `stack-estandar`), el costo de publicar (`promocion-por-ambientes`) y la herramienta fuera de alcance (`menu-que-no-miente`): los tres changes nacen con esos requirements |
| Sin destino | 11 | Todas las del contrato que quedaron: verificables, y sin change vivo que las nombre |
| No verificable | 0 | Ninguna resistió la pregunta. La más cercana —el test de regresión por defecto conocido— es verificable por la mitad que se puede correr, y declararla no verificable cerraría esa mitad con una afirmación falsa |

**Dos filas parciales se corrigieron sin cambiar de estado**, porque el árbol las
contradecía: «Definición de propietarios de código» decía «Que el archivo EXISTA y que
asigne por rol no lo verifica nadie», y `pruebas/docs/codeowners.test.mjs` lee los dos
archivos y exige la forma de cada owner; «El deploy está gateado por el éxito de CI»
decía que ningún caso cruzaba la etiqueta de DEV con la promoción, y el caso de
`pruebas/andamio/desplegar.test.mjs:413` lo hace.

**Límite honesto de esta relectura:** decidir si algo pone un requirement en rojo exige
entender el requirement, y eso lo hizo una persona (un agente), no el banco. El banco
verifica la **forma** y lo que se puede medir de cada declaración; no que la clasificación
sea correcta. El vencimiento de las filas sin destino obliga a releerlas en cada versión,
pero no las relee.

## D6. Qué hace cumplir cada cosa sola

| Lo que el change afirma | La compuerta que lo pone en rojo | Visto fallar |
|---|---|---|
| Una fila sin compuerta sin estado | `cobertura-de-requirements.test.mjs` · «toda fila sin compuerta declara su estado, y la declaracion se sostiene» | contra la página anterior al change: 25 hallazgos |
| Un pendiente a un change que no existe o no lo nombra; un motivo de esfuerzo; un sin destino vencido | el mismo caso, con sus refutaciones sobre un árbol de juguete | tasks 2.3 |
| Parciales no publicadas o viejas | «ninguna lista ni ningun numero de la pagina esta escrito a mano» | contra la página anterior: 12 encabezados sin parciales y el desglose ausente |
| Una compuerta que no corre | «ninguna compuerta publicada vive en una action que ningun `uses:` invoca» | refutación con `carril-docs` y con el alcance mutado |
| Una fila con compuerta que no cita nada | «toda fila que cuenta como compuerta nombra algo que se pueda ir a mirar» | refutación |
| Una action publicada sin invocar | `actions-alcanzables.test.mjs` · «toda action publicada esta alcanzada por algun `uses:`, o declarada» | sin la excepción de `carril-docs` |
| Una excepción vencida o sin versión | `actions-alcanzables.test.mjs` y `pinado.test.mjs`, casos de vencimiento | con `vigenteEn` en 1.9.5 y sin él |

**Lo que depende de alguien:** que la clasificación de cada fila sea correcta (D5), y que
quien corta el release relea las filas vencidas en vez de mover la versión de todas a la
vez. Lo segundo queda a la vista en el diff del PR del release, que es donde se revisa.

## Lo que este change NO cierra

- **El alcance por consumidor —nacidos contra adoptados—.** Que el andamio invoque una
  action dice que un proyecto nacido de él la corre; no que la corra un repositorio
  adoptado. Es el item `la-compuerta-llega-o-se-declara` del porte, en otro lote.
- **Las dos detecciones del carril de docs** (D4), para la línea v2.
- **La relectura de las filas que ya tenían compuerta.** Este change releyó las 25 que
  decían `ninguno`; las parciales y completas se tocaron solo donde el árbol las
  contradecía a la vista.
