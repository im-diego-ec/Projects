---
artefacto: pre-registro
dri: Builder 1
aprueba: Builder 2 (builder par)
informado: PO
estado: pendiente-de-completar
experimental: true
veredicto_antes_de: 2026-09-21
---

# capa-descubrimiento — Pre-registro del piloto

Este archivo existe por una sola razón, y la razón es la fecha del commit. Los
umbrales del piloto ya estaban escritos en prosa dentro de `design.md`, y un
design se lee: se puede matizar, se puede releer con el resultado en la mano y se
puede entender distinto sin que nadie mienta. Un pre-registro es otra cosa. Es la
misma tabla con un sello de tiempo de git delante del primer dato, y ese sello es
la única evidencia de que los números no se acomodaron después de ver la salida.
La tarea 0.7 lo pide commiteado **antes** de la primera sesión, y la comprobación
es aritmética: la fecha de este commit tiene que ser anterior a la fecha de la
primera fila de `horas.csv`.

## Por qué este archivo se reescribió el 2026-08-21, y por qué sigue siendo un pre-registro

La versión anterior medía dos brazos que **hacían** el descubrimiento: uno con la
herramienta y otro sin ella. El 2026-08-21 Builder 1 aclaró que el descubrimiento **ya
está hecho**. Según lo que Builder 1 informó el 2026-08-21, PO produjo el corpus del proyecto: documentos de varios
tipos, procesos, casos borde y un prototipo HTML que ya recibió feedback de
usuario. Ese corpus vive fuera del repositorio y entra como primer insumo al
arrancar el lunes.

Con eso, el instrumento anterior quedó midiendo una pregunta que el lunes no se
puede hacer. Ninguno de sus dos brazos podía correrse tal como estaba escrito: los
dos empezaban por elicitar, y no hay nada que elicitar. Un gate que mide lo que no
va a pasar no es un gate estricto: es un gate que va a devolver «no medido» en las
siete celdas, o peor, uno que alguien va a reinterpretar el lunes a la mañana para
que encaje. Eso último es exactamente lo que un pre-registro existe para impedir,
así que el arreglo correcto es reescribirlo **antes**, no reinterpretarlo después.

**Y esto sigue siendo un pre-registro, no una corrección con fecha posterior. La
diferencia es verificable y no depende de que se me crea:** `horas.csv` tiene el
encabezado y **cero filas de datos**, o sea que ninguna sesión de ningún brazo
corrió todavía. La regla que este mismo archivo se puso —«un cambio después de la
primera sesión ya no es pre-registro»— se cumple porque esa primera sesión no
existe. Cualquiera lo comprueba con `tail -n +2 horas.csv | wc -l`, que da cero, y
después con la fecha de este commit contra la de la primera fila que aparezca.

**Lo que la reescritura conservó, y se dice para que no haya que diffear:** la
regla de parada con su techo de sesiones, el sesgo de orden declarado a favor del
brazo B, la colisión de roles del scorer con su elección hecha y su conflicto
residual escrito, la restricción de forma de este directorio, la planilla de horas
con sus columnas, la regla de veredicto (verde exige los siete), la regla de que un
criterio no medido cuenta en contra, y la tabla de decisiones humanas con nombre de
quien decide cada una. Lo que se rearmó son los dos brazos, el conjunto de salidas,
y los criterios G3, G4 y G6. Lo que se resolvió es la decisión 1.2.

**Y hay una segunda tanda de correcciones, del mismo 2026-08-21 y también anterior a
la primera sesión.** Una crítica al instrumento encontró diez defectos, y los que se
pudieron reproducir se arreglaron acá antes de correr nada. En orden de lo que
costaría el lunes: había **dos pre-registros vigentes que se contradecían** (este y
la tabla de D6, que ahora es historia declarada); **G0 medía la mitad** de la
herramienta y dejaba pasar en verde el fork más probable; la **elicitación nueva
estaba permitida y era inutilizable**; la **comparativa de G2 no podía pasar** si el
control era bueno, y se **regalaba** si era descuidado; había **tres estados sin
veredicto escrito** —control detenido por techo, brazo B con salidas parciales, y la
vara del PO sin gate—; **ninguna celda medía cuánto se convirtió**; el **inventario no
tenía domicilio**; la lista de G3 mostraba lo encontrado y no lo barrido; y dos
menores con mordida, el camino honesto del prototipo y el marcado del PO comiéndose el
techo de G4. Cada arreglo está escrito donde vive el criterio, con su motivo.
Ninguno movió un umbral a favor del brazo B: los dos que se tocaron —la comparativa
de G2 y las horas de PO de G4— se tocaron porque tal como estaban **no se podían
evaluar**, y eso está demostrado en su sección, no afirmado.

**Cómo se llena lo que falta.** Los huecos dicen `PENDIENTE (decide: X)` con
nombre y con la tarea que lo resuelve. Un hueco se cierra editando este archivo y
commiteándolo, siempre **antes** de la primera sesión del brazo que ese hueco
afecta. Después de esa sesión, un cambio a este archivo ya no es un
pre-registro: es una corrección con fecha posterior, y se escribe como tal, con
el motivo y sin borrar lo anterior.

**Va junto con `convencion-de-procedencia.md`.** Sin la convención de
identificadores y sin la rúbrica de clasificación, tres de los siete criterios no
tienen vara con qué medirse. Los dos archivos son pre-registro; están separados
porque uno se lee entero antes de arrancar y el otro se consulta ítem por ítem
mientras se puntúa. Lo que los ata no es viajar en el mismo commit: es que los dos
estén commiteados **antes de la primera sesión**, que es lo único que el sello de
tiempo puede demostrar.

**Restricción de forma de todo este directorio.** Ningún archivo de `piloto/`
lleva encabezados de bloque de delta (ADDED, MODIFIED, REMOVED) ni encabezados de
escenario de OpenSpec. Se verificó que hoy **nada lo impide**: un archivo bajo
`openspec/changes/<change>/piloto/` con esa forma pasa el guardrail de deltas y
pasa `validate --all --strict`, los dos en código de salida cero, porque ninguno
de los dos mira ahí. O sea que la regla de D2 se cumple acá por disciplina, sin
red. Eso no es una nota al pie: es evidencia para G6, y está escrita antes de
correr el piloto para que no se lea como descubrimiento posterior.

---

## 0. La pregunta que este piloto responde

> **Dado un corpus de descubrimiento ya producido por el PO —documentos, procesos,
> casos borde, un prototipo con feedback de usuario—, ¿la capa ayuda a convertirlo
> en artefactos de OpenSpec mejor que hacerlo sin ella?**

Los artefactos de OpenSpec son los del flujo del marco: `proposal.md`, los deltas
de specs con sus escenarios en lenguaje de negocio, `design.md` y `tasks.md`.

### Qué es «mejor», dicho antes de medir

«Mejor» no es una impresión, son las siete celdas de la sección 4. Y de esas
siete, tres apuntan a la propiedad que la capa promete y que ninguna otra pieza
del marco puede dar: que lo que llegó al contrato se pueda rastrear hasta el
corpus (G1), que lo que el corpus decía no se haya caído en el camino (G2), y que
lo que llegó al contrato **no diga más de lo que el corpus dice** (G3, contado por
el scorer contra las anclas y por el PO contra el negocio). Las otras cuatro son el
costo (G4), la adopción acotada (G0), la deuda de disciplina (G5) y la confusión
insumo-contrato (G6).

Y hay una cosa que las siete celdas **no** dicen y el veredicto reporta igual, sin
umbral: **cuánto se convirtió**, o sea la distribución de los ítems de regla de
negocio entre cubierto, fuera de alcance y pregunta abierta, por brazo. Sin ese
número, un delta casi vacío puede pasar los siete gates y el verde queda ilegible
(sección 4).

### La pregunta que este piloto YA NO responde, y por qué eso no se puede tapar

No responde si la herramienta es buena para **elicitar**, que es aquello para lo
que está diseñada. El corpus ya existe: la fase 1, que es brainstorming e
investigación, se va a correr sobre material terminado. Eso es usarla a contramano
de su diseño, y hay que decirlo entero: **un veredicto rojo no significa que la
herramienta sea mala para descubrir. Significa que no ayuda a convertir un corpus
que ya existe.** Cualquiera que lea el veredicto como lo primero va a estar
leyendo más de lo que se midió.

Se acepta a propósito, porque la pregunta útil es la que el lunes se puede
responder, y porque el caso «el descubrimiento ya está hecho» no es la excepción:
Builder 1 lo enunció como **la** forma en que el área trabaja. Medir la excepción y no
la regla habría sido el error más caro de los dos.

### Los tres cambios que esto fuerza, y el que NO fuerza

1. **El insumo de los dos brazos es el corpus**, no una grabación. La convención de
   procedencia creció para nombrar sus piezas.
2. **La invención cambió de forma**, y con ella G3. Antes era un escenario que no
   apuntaba a nada. Ahora es un escenario que apunta a un ancla real y afirma algo
   que esa ancla no dice. Se mide con el campo `origen` de la convención.
3. **El costo cambió de dueño**, y con él G4. Las horas de descubrimiento del PO ya
   se gastaron y son las mismas para los dos brazos, así que salen de la
   comparación. Lo que varía es el trabajo de **convertir**.
4. **Lo que NO cambia es qué fases de la herramienta se adoptan.** Siguen siendo la
   1 y la 2, y las 3 y 4 siguen fuera (D1). El `design.md` y el `tasks.md` los
   escriben **los dos brazos igual**, con los artefactos del marco y sin la fase 3.
   Meterla acá para «medir el flujo completo» habría cambiado la pregunta a otra
   —si conviene adoptar la herramienta entera— y esa ya está contestada y
   descartada en D1.

---

## 1. La rebanada

Un proceso end-to-end que aparezca en el corpus, elegido por el PO y un builder
antes de arrancar. Los dos brazos trabajan sobre **exactamente** el mismo
material: si los insumos difieren, la comparación mide dos cosas distintas y no
hay corrección posible después.

| Qué se declara | Valor |
|---|---|
| Piezas del corpus incluidas, por identificador | PENDIENTE (decide: PO (PO) con un builder, tarea 0.1) |
| Proceso end-to-end elegido | PENDIENTE (decide: PO (PO), tarea 0.1) |
| Dónde corta, dicho por el extremo que queda afuera | PENDIENTE (decide: PO (PO), tarea 0.1) |
| Por qué es representativa del corpus de Supply Chain | PENDIENTE (decide: PO (PO), tarea 0.1) |
| Si el prototipo cubre esta rebanada, y en qué parte | PENDIENTE (decide: PO (PO), tarea 0.1) |

Las piezas se nombran con los identificadores de `convencion-de-procedencia.md`,
nunca con el nombre del archivo ni de quien habló. La tabla que traduce
identificador a pieza concreta vive con el corpus, fuera del repositorio (D3).

**La fila del prototipo es nueva y no es un detalle.** Un prototipo que ya recibió
feedback de usuario es la pieza del corpus con más autoridad de facto y la que peor
tratan las reglas del marco (ver G6). Si cubre la rebanada, hay que saberlo antes;
y si no la cubre, la rebanada pierde la pieza más filosa, que también hay que
saberlo antes porque cambia lo que el piloto puede concluir.

**Por qué se declara dónde corta y no solo qué entra.** Un proceso sin borde
declarado se puede ensanchar mientras se trabaja, y ensancharlo a mitad de camino
convierte un ítem no cubierto en «eso quedaba afuera». Es la forma más limpia de
que G2 dé cero sin haber cubierto nada.

---

## 2. Los brazos, el protocolo y la regla de parada

### Quién corre qué

| Rol | Quién | Estado |
|---|---|---|
| Brazo A (control) y brazo B | Builder 2 | propuesto; lo confirma la tarea 1.3 |
| Scorer | Builder 1 | propuesto; ver la colisión de roles en la sección 3 |
| Firma de fidelidad al negocio | PO (PO) | propuesto; lo confirma la tarea 1.3 |
| Firma del veredicto | Builder 1 | regla del área, no se negocia acá |

**Qué firma exactamente el PO, porque «firma de fidelidad» sin vara no es un gate.**
Hasta esta corrección, «Firma de fidelidad al negocio» aparecía **una sola vez** en
todo el change —en la tabla de roles— y no había en ninguna parte un criterio contra
el cual firmar. Un gate que se aprueba leyendo y asintiendo es exactamente el gate
que este pre-registro dice no querer.

La vara es **por escenario** y no por artefacto. Para cada escenario del delta, el PO
marca una de tres:

- **Describe** lo que el negocio hace hoy, o lo que decidió que haga.
- **No describe**: dice algo que el negocio no hace, o lo dice al revés.
- **No puedo saberlo** con lo que el escenario dice.

Umbral: **100% «describe»** en los escenarios que la rúbrica clasificó como regla de
negocio. Y **«no puedo saberlo» cuenta como no firmado**, no como duda neutra: un
escenario que el dueño del *qué* no puede evaluar es un escenario que no está escrito
en lenguaje de negocio, y eso es la mitad del punto de la capa.

Las tres marcas van en la tabla de trazabilidad, en una columna nueva, y se anotan
**antes** de ver el veredicto de los otros criterios: si el PO firma después de saber
que el brazo B ganó, la firma mide su expectativa y no los escenarios.

**Y esta vara tiene su gate, que hasta el 2026-08-21 no tenía: es G3b, y es
eliminatoria para el brazo B.** Escrita sin asignar, la única lectura posible la
colgaba de la cláusula de aceptación de G4, o sea que un delta con escenarios que el
negocio dice **falsos** producía apenas amarillo. Está en la sección 4, con el
razonamiento entero.

**El trabajo de marcado del PO no se le cobra al brazo en G4.** Marcar escenario por
escenario son horas suyas, y con la vara puesta un brazo **más prolijo** —más
escenarios, mejor separados— le come más techo por puro marcado y no por
re-elicitar, que es justo lo que G4 quiere detectar. Por eso `horas.csv` lleva una
columna `categoria` y las filas `marcado` **quedan afuera** de la comparación de
horas de PO de G4. Se registran igual, y se reportan: son el costo de tener la vara,
y esconderlo sería medir la vara como si fuera gratis.

**Los dos brazos los corre la misma persona, y eso es a propósito.** Repartirlos
entre dos builders cambiaría la variable medida: dejaría de ser «el método» y
pasaría a ser «el método más quién lo usa», con n=1 en cada celda. El costo de
que sea la misma persona es el sesgo de orden, que se declara abajo.

### Los dos brazos, rearmados contra la pregunta de la sección 0

Los dos arrancan del **mismo corpus** y entregan el **mismo conjunto de salidas**.
La única diferencia es el tramo del medio.

| | Brazo A (control) | Brazo B |
|---|---|---|
| Insumo | el corpus de la rebanada, leído directo | el corpus de la rebanada, leído directo |
| Tramo del medio | ninguno: se lee y se escribe | fases 1 y 2 de la herramienta **sobre el corpus** → informe de descubrimiento, brief y PRD |
| Salidas | proposal, deltas, tabla de trazabilidad, design, tasks | las mismas cinco |
| Asistencia de agente | la configuración por defecto del área | la misma |
| Reglas cargadas | el `openspec/config.yaml` del espacio de trabajo | el mismo |

**El brazo A ya no es «el camino de hoy sin nada»: es el camino de hoy con el
corpus en la mano**, que es exactamente lo que va a pasar el lunes si el veredicto
es rojo. Sin esa corrección el control habría sido un hombre de paja, y cualquier
victoria del brazo B no habría significado nada.

### El riesgo del brazo B, declarado antes de correrlo

La fase 1 de la herramienta es elicitación: está hecha para sacarle información a
una persona, no para ingerir un corpus terminado. Hay cuatro desenlaces posibles y
los cuatro llevan su lectura escrita **antes**, para que ninguno se pueda contar
como otro:

| Lo que pase | Cómo se registra |
|---|---|
| La herramienta ingiere el corpus y produce brief y PRD sin que haya que tocarla | el caso esperado. G0 en cero y el piloto sigue |
| Hay que **editar la herramienta** para que acepte un corpus en vez de elicitar | G0 distinto de cero, o sea **rojo**. No es un accidente del piloto: es la definición de «adopción no acotada» que G0 existe para medir |
| La herramienta no ingiere y no se toca, y el brazo B **no produce nada** | «detenido por techo» con el motivo escrito. G4 falla, y G1, G2 y G3 se registran como **no medidos**: no hay salida sobre la que puntuar |
| La herramienta no ingiere del todo y el brazo B llega al techo con las cinco salidas **a medias** | «detenido por techo» con el motivo escrito. G4 falla igual, y G1, G2 y G3 se puntúan **sobre lo entregado**, con el inventario completo como denominador: lo que falta cuenta como caído |

El tercer caso no es una escapatoria: un criterio no medido cuenta en contra, así
que un brazo B que no arranca no puede producir un verde. Y el cuarto se agregó el
2026-08-21 porque era el estado más probable de los dos y el único sin lectura
escrita: «no medido» y «cero cubierto» son veredictos opuestos, y elegir entre ellos
el lunes con la salida en la mano es exactamente lo que este archivo existe para
impedir.

### La elicitación nueva, y la única forma de que no rompa la comparación

Es el riesgo más fácil de no ver y rompería el instrumento en silencio. Si la
herramienta, en el brazo B, le pregunta al PO algo que el corpus no contesta, el
brazo B recibe **información que el brazo A nunca tuvo**, y los dos brazos dejan de
trabajar sobre el mismo material. La regla, simétrica para los dos brazos porque si
no es un sesgo:

- **El inventario de G2 y G3 se congela en el commit del scorer**, y ese inventario
  sale **solo del corpus**. Nada de lo que se elicite después entra a esos
  denominadores, en ninguno de los dos brazos.
- **Lo que se elicite nuevo se anota aparte**, con su brazo, su fecha y la pregunta
  que lo produjo. Es una lista de observación, no un criterio. Cada entrada lleva
  identificador `L0xx` y vive en `lista-de-observacion.md` del espacio de ese brazo
  (`convencion-de-procedencia.md`, parte 1).
- **Y un escenario nacido de una elicitación cita su entrada `L0xx`, con `origen:
  elicitado`.** Esto se corrigió el 2026-08-21, antes de la primera sesión, porque
  la versión anterior permitía la elicitación y la volvía **inutilizable**: G1 exige
  100% de escenarios con ítem asociado, el inventario se congela solo del corpus, y
  `origen` admitía solo `corpus` y `derivado` —y `derivado` exige el ancla de lo que
  sí dice el corpus—. Un escenario nacido de una respuesta fresca del PO no tenía
  ancla posible: rompía G1, o se forzaba sobre un ancla vecina y se convertía en
  hallazgo de G3, o quedaba como pregunta abierta aunque el PO ya la hubiera
  contestado. El tercer valor cierra eso con una frontera nítida: **`elicitado`
  satisface la asociación de G1 y queda FUERA de los denominadores de G2 y de G3.**
  Una respuesta que el corpus nunca tuvo no se pudo caer del corpus (G2), y no está
  presentada como dicha por el corpus (G3).
- **El residuo, y cómo se cierra:** `elicitado` sería la puerta de servicio de la
  invención si nadie mirara la lista. La mira el PO al firmar la fidelidad al
  negocio, y **una entrada que no reconozca es un hallazgo de G3**, no una
  diferencia de memoria.
- **Esa lista no cambia el veredicto, y no se le pone umbral.** Un umbral inventado
  hoy sobre algo que nadie vio todavía es exactamente el número que inventa un
  éxito, y este mismo archivo prohíbe eso dos secciones más abajo. Queda como el
  candidato más fuerte a medición propia de **la segunda rebanada**, que es lo que
  un verde habilita (más abajo, en esta misma sección).

Vale decir por qué se registra en vez de prohibirse: si la herramienta le saca al
PO algo que el corpus no tenía, eso es **exactamente el valor que su fase 1
promete**, y prohibirlo sería medirla amputada. Lo que no puede hacer es contaminar
los denominadores.

### El orden, la decisión del Builder 1, y qué significa el verde por causa de ella

**Primero A, después B, sobre el mismo material, tal como está. No se invierte.**
Lo decidió Builder 1 el 2026-08-21, con el orden ya sobre la mesa como objeción al
instrumento, y acá se transcribe: un pre-registro no interpreta una decisión, la
escribe.

Quien escriba A ya va a haber pensado el problema cuando llegue a B, así que **el
sesgo del orden favorece al brazo B**. Con un corpus preexistente el sesgo es
**más fuerte** que antes, y hay que decirlo: la parte más cara del trabajo es leer
y entender el corpus, y eso se hace una sola vez, en el brazo A. El brazo B
arranca con el corpus ya digerido.

**Y de ahí sale el cambio de significado, que es la mitad de la decisión: el verde
deja de significar «la herramienta ayuda» y pasa a significar «NO SE REFUTÓ QUE
AYUDE».** El motivo, con las palabras que son el argumento: con la misma persona
corriendo A y después B, la persona llega a B con el corpus ya digerido, y el
propio documento dice que leerlo es la parte más cara. Un verde mide entonces **la
herramienta MÁS la memoria de haber hecho ya la tarea**, y eso no se puede separar
con n=1.

La lectura del resultado no cambia de dirección, se endurece: una victoria de B
está inflada, y un empate o una derrota de B son una señal fortísima. Por eso los
dos criterios que justifican la existencia de la capa (G2 y G3) piden **cero
absoluto** y no «mejor que el control».

### Qué habilita el verde, y qué no: la segunda rebanada con el orden invertido

Esta es la parte que hace que la decisión no sea «no hacer nada». Hasta hoy, D8 le
colgaba al verde el archive del change, el estreno de los checks y el pin de la
dependencia en el carril de todos los consumidores. **Eso cambia.**

> **El verde del lunes habilita UNA SEGUNDA REBANADA CON EL ORDEN INVERTIDO (B
> primero). No habilita el bloque 5.**

**Por qué una segunda rebanada, y por qué invertida.** Dos corridas con el sesgo de
orden en direcciones **opuestas** acotan el efecto real: una lo infla y la otra lo
deprime, y el verdadero queda en el medio. El sesgo pasa de ser un defecto a ser el
instrumento. Y eso **no se puede hacer si se quema el control limpio en la primera
corrida**: por eso la primera va A → B y no al revés. Invertir hoy compraría una
corrida sin sesgo a favor de B a cambio de perder para siempre la única corrida en
que el control se escribe sin haber visto nada.

**Lo que el verde de la primera rebanada NO habilita**, dicho por su nombre para
que el lunes nadie lo lea como un trámite pendiente:

- el **archive** de este change, o sea fundir los dos requirements en los specs
  vivos;
- el **estreno de los checks** de D2 y D4 (bloque 5, tareas 5.1 a 5.3), incluido el
  estreno en rojo que G6 pueda obligar;
- el **pin de la dependencia** en el carril de los consumidores, que además es un
  OK aparte y explícito de la decisión 1.1.

Los tres esperan la segunda rebanada. El único ítem que sigue corriendo con
independencia de todo esto es el bloque 4, la caducidad del estado experimental,
que ya estaba declarado como independiente del veredicto (D7).

**El desenlace de la segunda rebanada se escribe ahora, no después.** No es una
decisión nueva: es la regla que este archivo ya tiene —«un delta que el piloto
refutó no se funde», «un criterio no medido cuenta en contra»— aplicada al caso que
la segunda corrida abre.

| Primera rebanada (A → B) | Segunda rebanada (B → A) | Qué pasa |
|---|---|---|
| verde | verde | recién ahí corre el bloque 5: checks, scaffold, pin y archive |
| verde | no verde | el efecto que midió la primera era el orden y no la herramienta. Desenlace de no-verde de D8, con las mediciones de **las dos** corridas en el ADR |
| no verde | no se corre | desenlace de D8 tal como está: amarillo o rojo, con su ADR |

**Lo que la segunda rebanada no arregla, para que no se lea como que sí.** Sigue
siendo n=1 por rebanada y la misma persona en los dos brazos. Dos corridas acotan
el efecto del **orden**; no convierten el piloto en evidencia de que la capa sirve
en general. La asimetría de la sección 8 se mantiene entera.

### El conjunto de salidas, idéntico para los dos brazos

Cada brazo entrega, sin excepción, las mismas cinco cosas:

1. `proposal.md` de la rebanada;
2. los deltas de specs de la rebanada;
3. la tabla de trazabilidad con el formato de `convencion-de-procedencia.md`;
4. `design.md` de la rebanada;
5. `tasks.md` de la rebanada.

El brazo B produce además el informe de descubrimiento, el brief y el PRD, que
son insumos suyos y no entran en la comparación de salidas: lo que se compara es
lo que llega al contrato, no lo que se usó para llegar.

**Las salidas 4 y 5 entran al conjunto y NO entran a la procedencia.** El design y
las tasks se comparan solo por G4, o sea: existen y pasan los mismos gates. G1, G2
y G3 se puntúan **únicamente sobre el proposal y los deltas**, y el motivo es que
son los dos únicos artefactos cuyas afirmaciones son sobre el negocio: un design
afirma sobre técnica y un tasks afirma sobre trabajo, y rastrear ninguna de esas
dos cosas a un corpus de entrevistas volvería la trazabilidad un trámite. Están en
el conjunto igual, porque sin ellas «convertir el corpus en artefactos de OpenSpec»
queda a mitad de camino y porque escribirlas cuesta horas que a G4 le corresponde
contar.

Si un brazo entrega tres de las cinco, no entregó. Un brazo sin tabla de
trazabilidad hace que G1 y G2 no se puedan puntuar sobre él, y eso se registra
como criterio no medido, jamás como cero.

### La regla de parada, idéntica para los dos brazos

Sin regla de parada, las horas de G4 miden una cantidad indefinida y gana el brazo
que se detiene cuando le parece suficiente. Un brazo termina cuando se cumplen
las dos condiciones, y solo entonces:

**(a) Condición mecánica.** `node verificar-brazo.mjs <espacio> <brazo>` devuelve
código de salida cero. Eso significa: guardrail de deltas en cero, `validate --all
--strict` en cero y, para el brazo B, G0 en cero. Se lee por código de salida, no
por lo que imprime.

**(b) Condición declarada.** Quien corre el brazo escribe, con fecha, que cada
paso del proceso declarado en la sección 1 tiene en la tabla de trazabilidad al
menos una fila: cubierto por un escenario, fuera de alcance declarado, o pregunta
abierta. No «me parece que está completo»: la frase nombra los pasos.

**Techo, idéntico para los dos brazos: 5 sesiones.** Si al cabo de la quinta
sesión un brazo no cumple (a) y (b), se detiene donde está y se registra como
«detenido por techo». El número 5 es arbitrario y está acá justamente por
eso: un techo arbitrario escrito antes es falsable, y un techo razonable decidido
después no mide nada. Si a alguien le parece el número equivocado, se cambia en
este archivo **antes** de la primera sesión, y el commit lo demuestra.

**Qué pasa cuando el techo se alcanza, escrito para los dos brazos y no solo para
uno.** La versión anterior solo decía qué pasaba si el que se detenía era B, y con
eso un control incompleto le regalaba a B las dos comparativas: B podía ganar por
walkover.

| Quién se detiene por techo | Consecuencia pre-registrada |
|---|---|
| **el brazo B** | G4 **falla**, porque G4 exige que su salida pase los mismos gates. Y G1, G2 y G3 se puntúan **sobre lo entregado**, con el inventario completo como denominador: lo que falta cuenta como caído, no como no medido |
| **el control** | las **comparativas** de G2 (el total) y de G4 (los dos cocientes) quedan **NO MEDIDAS**, cuentan en contra y el techo del veredicto es **amarillo**. Los umbrales absolutos del brazo B —G2 cero en reglas de negocio, G3a cero, G3b 100%— se puntúan igual, porque no dependen del control |
| **los dos** | las dos filas de arriba a la vez. Es un dato sobre el costo de convertir, no una falla del piloto |

**El techo se mantiene en 5 aunque el conjunto de salidas creció de tres piezas a
cinco.** Subirlo ahora sería acomodar el instrumento para que la herramienta
alcance, y el techo existe para lo contrario. Si 5 resulta apretado, el resultado
es «detenido por techo» en los dos brazos, que es un dato sobre el costo de
convertir y no una falla del piloto.

**Lo que la regla de parada NO hace.** No garantiza que los dos brazos hayan
trabajado igual de bien: garantiza que se detuvieron por la misma condición. Es
todo lo que una regla de parada puede dar, y es lo que hoy falta.

### Protocolo del brazo A, escrito para que sea un control

D6 define el control como «el camino de hoy, con la asistencia de agente que se
usa habitualmente». Tal cual, eso no es un control: es lo que cada uno haga. Se
concreta así, y las cuatro líneas son parte del pre-registro:

- **Insumo**: el corpus de la rebanada, entero, sin ningún artefacto intermedio
  producido por la herramienta. Si aparece un brief o un PRD, el brazo A dejó de
  ser el control y hay que anotarlo. Y hay un matiz que la pregunta nueva
  introduce: el corpus **es** material intermedio, porque PO lo produjo a partir
  de entrevistas, y eso está bien y es justamente el punto. Lo prohibido es
  material intermedio producido **dentro del piloto**.
- **Asistencia**: el agente de codificación con la configuración por defecto del
  área (modelo y effort del default barato, sin escalada). Escalar el modelo en
  un brazo y no en el otro invalida G4, y además exige OK humano previo.
- **Reglas cargadas**: las mismas que el brazo B, o sea el
  `openspec/config.yaml` del espacio de trabajo (ver
  `arnes/config-espacio-de-trabajo.yaml`). Un brazo que redacta con las reglas del
  marco cargadas y otro que no vuelve la comparación injusta por construcción, y
  la diferencia se leería como mérito del método.
- **Prohibido**: mirar cualquier salida del brazo B, que todavía no existe, y
  mirar el inventario del scorer, que sí existe y está commiteado antes.

---

## 3. El scorer, y la colisión de roles

**Quién puntúa.** El builder que no corrió ninguno de los dos brazos. Con el
reparto propuesto en la sección 2, es Builder 1.

**Qué hace antes de ver cualquier salida.** Arma el inventario de materia prima
**desde el corpus**, le asigna a cada ítem su identificador, su clase y su
`origen` según `convencion-de-procedencia.md`, y **commitea ese inventario**. El
orden es lo único mecánico que tiene esta parte: el commit del inventario tiene
que ser anterior al commit de las salidas de los brazos, y eso se lee con
`git log`. No prueba que el scorer no haya espiado; prueba que la lista contra la
que se puntúa no se escribió después de conocer el resultado.

### Dónde vive el inventario, porque hasta el 2026-08-21 no tenía domicilio

Medio gate depende de un archivo que no existía en ninguna parte. Este pre-registro
exigía el inventario commiteado **antes** de las salidas y ofrecía como evidencia un
`git log` sobre un marcador literal; `design.md` dice que `mediciones.md` **no** se
crea antes de arrancar —y con razón: un archivo vacío con el título puesto invita a
llenarlo de memoria—; y la convención exige **cita textual** de cada ítem del corpus
con la decisión 1.5, la de despersonalización, todavía **PENDIENTE y bloqueante**.
Sumado: el lunes podía no haber ningún lugar legal donde commitear el archivo del que
cuelgan G1 y G2.

**Queda declarado así, y es un solo lugar:**

| Qué | Dónde |
|---|---|
| El inventario | `inventario.md` en el **espacio de trabajo propio del scorer**: un directorio nuevo, fuera de todo repositorio del área, con su `git init`, igual que los espacios de los brazos (D5) |
| Su commit | el **primer** commit de ese espacio, y anterior a los commits de salidas de los dos brazos. Evidencia: `git log --format='%cI %h %s' -- inventario.md` ahí, y los `git log` de los espacios de los brazos |
| Qué de eso entra a Projects | **nada del inventario tal cual.** Entra después, en `piloto/mediciones.md`, ya despersonalizado y con las listas del scorer |

**Y el motivo de que no viva en `piloto/`, que es la parte que importa:** el
inventario lleva la **cita textual** de cada ítem del corpus. Commitearlo en Projects es
meter el material del corpus al repositorio, que es exactamente lo que D3 prohíbe y
lo que la decisión 1.5 —bloqueante, y del PO con Builder 1— todavía no autorizó. Un
espacio de git propio da lo único que el instrumento necesita del inventario, que es
el **sello de tiempo**, sin mover una coma de la frontera de privacidad. La
despersonalización se hace al escribir `mediciones.md`, que es lo que sí viaja.

Consecuencia práctica para el lunes: **el espacio del scorer se arma antes que los
espacios de los brazos**, y su primer commit es el inventario. Si el corpus no está
disponible todavía porque 1.5 sigue abierta, lo que se atrasa es el piloto entero, no
solo el inventario: sin inventario no hay G1 ni G2, y sin esos dos no hay veredicto
que no sea «no medido» en las celdas que justifican la capa.

**Un corpus escrito hace este trabajo más auditable, no menos.** Es la única cosa
que la pregunta nueva mejora sin contrapartida: un inventario hecho desde
documentos se puede reproducir, porque otra persona abre las mismas piezas y llega
a una lista parecida, mientras que uno hecho desde audio depende de dónde cada uno
corta el pasaje. El ancla `D04-3.2` la verifica cualquiera; `E03-011240` había que
creerla.

**Lo que empeora, y hay que decirlo:** el corpus es más grande que una rebanada de
transcripciones, así que el inventario es más caro y la tentación de resumir es
mayor. Un inventario que agrupa «los casos borde del punto 3» en un solo ítem hace
que G2 no pueda ver los caídos de adentro. La convención ya lo prohíbe explícito
—un caso borde por ítem— y acá queda anotado como el punto donde este piloto es
más fácil de arruinar sin mala fe.

**Y por eso se propone la única segunda mirada disponible: PO.** Antes de la
primera sesión, el PO —que produjo el corpus y no corre ningún brazo— hace un
**spot-check de granularidad** del inventario: no revisa clasificaciones, que las
gobierna la rúbrica, sino que una lista de doce casos borde no haya quedado
comprimida en un ítem. Es la revisión más barata del piloto y la única que puede
cazar el error que ningún umbral ve. Es una **propuesta** y no un hecho: la confirma
la decisión 1.3, junto con el resto de las reservas de tiempo.

### La colisión de roles, declarada con su elección hecha

D6 pide dos cosas que con tres personas no entran juntas: que el scorer sea el
builder que no corrió ningún brazo, y que Builder 1 firme el veredicto. Las dos
combinaciones posibles tienen conflicto:

- **Builder 2 corre los brazos, Builder 1 puntúa y firma.** El que firma el veredicto
  produjo la medición, pero **no** produjo las salidas que se miden. Su esfuerzo
  no está invertido en ninguno de los dos brazos.
- **Builder 1 corre los brazos, Builder 2 puntúa, Builder 1 firma.** El que firma el veredicto
  tiene trabajo propio invertido en el brazo B y firma el veredicto sobre su
  propia salida.

**Se elige la primera**, porque el conflicto que deja es más chico y es de otro
tipo: sesgo metodológico sin esfuerzo hundido. La segunda pone al firmante a
juzgar su propio trabajo, que es exactamente lo que un gate existe para evitar.

**El conflicto residual, dicho sin adornos: el scorer y el firmante del veredicto
son la misma persona, y nadie audita la clasificación del scorer.** Lo que lo
acota no es la buena voluntad, son tres cosas escritas antes: la rúbrica de
clasificación está pre-registrada, el inventario se commitea antes de las salidas,
y G2 y G3 piden cero absoluto en vez de una comparación que se pueda inclinar. El
PO firma la fidelidad al negocio por separado, que es la única mirada
independiente que el equipo puede poner hoy.

**Y el ciego sigue siendo imperfecto**, como ya declara `design.md`: las dos
salidas se distinguen a ojo, así que el scorer sabe cuál es cuál mientras puntúa.
Con tres personas no tiene arreglo. Queda como sesgo residual, sumado al del
orden.

---

## 4. Los siete criterios, con el comando que produce su evidencia

Siguen siendo **siete**: la regla de veredicto no se toca, y ninguno de los siete se
partió en ocho —G3 tiene dos mitades y falla como uno—. La tercera columna dice qué
se corre para producir la evidencia, y qué parte de cada criterio **no** tiene
comando y depende de lectura humana: un criterio sin comando no es menos válido, es
menos verificable, y eso hay que saberlo antes y no después.

**Esta tabla es el gate.** La de `design.md` D6 quedó como historia del diseño viejo,
de cuando el insumo eran transcripciones y las salidas eran tres; donde las dos
difieran, manda esta.

**Qué se movió, y cuándo, para que nadie tenga que reconstruirlo:**

| Criterio | Estado |
|---|---|
| G0 | corregido el 2026-08-21: mide **dos** directorios, no uno |
| G1 | corregido el 2026-08-21: **simétrico** —100% en las dos tablas— y admite `L0xx` |
| G2 | corregido el 2026-08-21: la comparativa pasó de «estrictamente menos» a **«≤»** |
| G3 | rearmado por la pregunta nueva; el 2026-08-21 se le sumó **G3b**, la vara del PO |
| G4 | rearmado por la pregunta nueva; el 2026-08-21 se le excluyó el **marcado** |
| G5 | sin cambios |
| G6 | rearmado por la pregunta nueva: se cuenta en los dos brazos |

Los seis cambios del 2026-08-21 son anteriores a la primera sesión y a la primera
fila de `horas.csv`, que es lo que los deja del lado del pre-registro y no del lado
de la corrección con fecha posterior. La comprobación es la misma de siempre:
`tail -n +2 horas.csv | wc -l` da cero.

| | Qué se mide y con qué umbral | Cómo se produce la evidencia |
|---|---|---|
| **G0** | Ediciones a archivos de **los dos** directorios que la instalación de la herramienta escribe —`_bmad` y `.claude/skills`— durante el piloto. Umbral: **cero**. Si hubo que tocarla para que ingiera el corpus, o para cortar en el PRD, la adopción no es acotada: es mantener un fork de un método ajeno | Por código de salida, dentro del espacio desechable: `git diff-index --cached --quiet HEAD -- _bmad .claude/skills` sobre un índice temporal en el que se acaba de hacer `git add --all --force -- _bmad .claude/skills`. Lo corre `verificar-brazo.mjs`, que además distingue «cero ediciones» de «no se pudo mirar», **directorio por directorio** (si a uno de los dos le falta el commit de instalación o el árbol de trabajo, G0 **no se mide**, no se aprueba). La lista de ediciones, si hubo, sale de `git diff-index --cached --name-status HEAD -- _bmad .claude/skills` |
| **G1** | Escenarios con al menos un ítem asociado —`I0xx` del inventario o `L0xx` de la lista de observación—, **en las dos tablas de trazabilidad**, la de B y la del control. Umbral: **100%**, cero `n/a`. En el brazo B es eliminatorio; en el control es además la condición que hace medibles las comparativas de G2 y G4 (ver abajo) | Sin comando: es lectura de las dos tablas de trazabilidad contra el inventario. Lo mecánico es el formato, que hace la lectura contable: cada fila es un par ítem-escenario y la última columna no puede quedar vacía ni decir `n/a` (`convencion-de-procedencia.md`, parte 2). El orden inventario-antes-que-salidas se lee con `git log --format='%cI %h %s' -- inventario.md` en el espacio del scorer (sección 3) |
| **G2** | Ítems del inventario que no quedaron ni cubiertos, ni fuera de alcance declarado, ni pregunta abierta (**caídos en silencio**). Umbral: brazo B **cero** en los ítems clasificados como regla de negocio, **y B ≤ control en el total** | Sin comando, pero con denominador fijo: son los identificadores del inventario que aparecen en **cero** filas de la tabla de trazabilidad. La clase de cada ítem viene de la rúbrica pre-registrada, y reclasificar un ítem después de leer las salidas hace que G2 no se pueda puntuar (`convencion-de-procedencia.md`, parte 3). El denominador es el inventario **del corpus**, congelado en el commit del scorer: lo elicitado nuevo (`L0xx`) no entra (sección 2) |
| **G3** rearmado | Dos mitades, las dos con umbral y las dos eliminatorias para el brazo B. **G3a, invención:** afirmaciones de regla de negocio cuyo ítem tiene `origen: derivado` y que aun así sostienen un escenario sin marca de supuesto. Umbral: brazo B **cero**. **G3b, fidelidad al negocio:** la vara del PO de la sección 2, **100% «describe»** en los escenarios clasificados como regla de negocio, con «no puedo saberlo» contando como no firmado | Sin comando. G3a: lista del scorer que enumera **todas** las afirmaciones de regla de negocio del delta, una por línea, con su veredicto —y no solo las falladas—, con la **cita textual**, el ancla invocada y la frase que esa ancla dice de verdad al lado. G3b: las tres marcas del PO en la columna de la tabla de trazabilidad, anotadas **antes** de ver el veredicto de los otros criterios |
| **G4** rearmado | **Horas de conversión del builder**, por brazo: brazo B ≤ **2×** las del control. **Y** horas del PO, por brazo: brazo B **no supera en más de 1 hora absoluta** las del control, contando solo las categorías de conversión y **excluyendo el marcado** de G3b. **Y** la salida del brazo B pasa los mismos gates | Las horas salen de `horas.csv`, anotadas por sesión y no al final, con la columna `rol` separando builder de PO y la columna `categoria` separando `conversion` de `marcado`. Los gates salen de `node verificar-brazo.mjs <espacio> <brazo>`, que imprime y devuelve los códigos de salida del guardrail de deltas y de `validate --all --strict` sin enmascarar ninguno. La firma de fidelidad al negocio del PO **ya no cuelga de acá**: es G3b |
| **G5** | Puntos del piloto que dependieron de que alguien se acordara. Umbral: la lista **no puede estar vacía**, y cada ítem lleva destino (check propuesto, o queda fuera y por qué). Si todo queda fuera, el techo del veredicto es **amarillo** | Sin comando, y por eso el insumo existe desde el primer día: `bitacora-g5.md`, que se llena mientras pasa. Una lista vacía significa que nadie miró |
| **G6** rearmado | Veces que **una pieza del corpus** se usó como autoridad de comportamiento sin escenario que lo respalde. Umbral: **cero**, contado en **los dos brazos** y no solo en B. Si aparece aunque sea una, el check de D2 se estrena rojo desde el día uno, sin ventana de gracia | Búsqueda del scorer en los artefactos y en los PRs del piloto. Dos datos ya medidos que cuentan acá: un archivo de `piloto/` con forma de delta pasa hoy el guardrail y `validate --all --strict` en verde; y el prototipo del corpus es invisible para el check de D2 tal como está diseñado (ver abajo) |

### Por qué G1 se volvió simétrico y la comparativa de G2 pasó a «≤»

Las dos correcciones son del 2026-08-21 y son la misma falla vista de los dos lados:
**la mitad comparativa de G2 no podía pasar si el control era bueno, y podía regalarse
si el control era descuidado.**

**El lado que hacía imposible el verde.** El umbral decía «B estrictamente menos que
el control en el total». Si el control cae en cero —y es plausible: la regla de parada
fuerza cobertura por paso, hay cinco sesiones y la tabla es obligatoria—, entonces B
necesitaría **menos que cero** caídos, o sea rojo mecánico con **dos brazos
perfectos**. Un umbral que un resultado perfecto no puede satisfacer no mide nada: se
reinterpreta el lunes. Con `B ≤ control`, control en cero exige B en cero, que es lo
que el criterio siempre quiso decir, y sigue siendo estricto porque el cero absoluto
en las reglas de negocio no se toca.

**El lado que lo regalaba.** G1 estaba escrito **solo sobre el brazo B**, así que la
tabla del control la llenaba el builder sin ningún gate de completitud. Una tabla A
subllenada infla los caídos del control y le regala a B la comparativa: B gana sin
haber cubierto más, solo porque del otro lado nadie escribió las filas. Por eso G1
pasa a exigir **100% de asociación en las dos tablas**.

**Y qué pasa si el control no llega al 100%,** porque un criterio sin veredicto
escrito es el agujero que se tapa con criterio propio: el brazo B se puntúa como
siempre —para B, G1 por debajo de 100% es rojo—, y **las comparativas de G2 y G4
quedan NO MEDIDAS**, con el techo del veredicto en amarillo. No se leen «a favor de
B»: un criterio no medido cuenta en contra. La mitad absoluta de G2 (cero en reglas
de negocio del brazo B) se sigue puntuando igual, porque no depende del control.

### Los estados que no tenían veredicto escrito, y el que tienen ahora

Tres agujeros del mismo tipo, cerrados antes de la primera sesión. Los tres eran
estados alcanzables cuya lectura no estaba escrita, o sea tres invitaciones a
resolverlo el lunes con el resultado ya visto.

**(a) El control detenido por techo.** El techo de 5 sesiones tenía consecuencia
escrita solo para el brazo B. Si el que se detiene es el **control**, un control
incompleto le regala a B las dos comparativas y B puede ganar por walkover. Queda
escrito: **si el control se detiene por techo, las comparativas de G2 y de G4 son NO
MEDIDAS, cuentan en contra, y el techo del veredicto es amarillo.** El brazo B se
sigue puntuando en sus umbrales absolutos —G2 cero en reglas de negocio, G3a cero,
G3b 100%—, que son los que no necesitan control.

**(b) El brazo B detenido por techo con salidas parciales.** G1, G2 y G3 sobre
salidas parciales estaban definidos solo para el desenlace «no ingiere», donde se
registran como no medidos. Un B que llega a la sesión 5 con las cinco salidas a
medias quedaba ambiguo. Queda escrito: **G1, G2 y G3 se puntúan sobre lo entregado**,
con el inventario completo como denominador —o sea que lo que falta cuenta como
caído, no como no medido—, y G4 falla igual por la regla ya escrita. Puntuar sobre el
inventario recortado sería premiar el haberse quedado corto.

**(c) La vara del PO ahora tiene un gate: es G3b.** El «100% describe» de la sección
2 no estaba asignado a ningún criterio, y la única lectura posible lo colgaba de la
cláusula de aceptación dentro de G4. O sea que un delta con escenarios que **el
negocio dice que son falsos** producía nada más que **amarillo**: la infidelidad al
negocio, que es la mitad del punto de la capa, tenía la consecuencia más blanda de la
tabla. Queda como **G3b**, y **es eliminatoria para el brazo B**: un escenario que el
dueño del *qué* marca «no describe» es la misma falla que G3 mide del otro lado —algo
que llegó al contrato y el negocio no dijo—, con la diferencia de que lo detecta la
única mirada independiente que el equipo puede poner hoy. G3 falla → rojo, y eso no
cambia: cambia que ahora esta mitad está adentro.

### Lo que se reporta sin umbral: el rendimiento de conversión, por brazo

Ninguna de las siete celdas mide **cuánto se convirtió**. La regla de parada acepta
«pregunta abierta» como cobertura, G2 la cuenta como no-caído, G3a premia el hedging
—un supuesto marcado nunca es invención— y G1 es asociación y no sustancia. La
consecuencia es concreta y es el resultado natural de un PRD de alto nivel: **un
brazo B que convierte poco y puntúa mucho entrega un delta casi vacío de escenarios
y pasa los siete gates.** En el piloto ni siquiera se paga el costo de una pregunta
abierta, porque los deltas se descartan con el espacio de trabajo.

No se arregla moviendo umbrales —inventar hoy un mínimo de escenarios es exactamente
el número que inventa un éxito—, así que se arregla **haciéndolo visible**. Queda
pre-registrado: **el veredicto reporta, por brazo, la distribución de los ítems de
regla de negocio entre `cubierto` / `fuera de alcance declarado` / `pregunta
abierta`.** Es una medición **sin umbral**: no puede hacer fallar nada por sí sola, y
sin ella un verde con un delta hueco es ilegible. Los tres números van uno al lado del
otro, con el total, para los dos brazos.

### Por qué la lista de G3 enumera todo y no solo lo fallado

El residuo no auditable del scorer no es la **clasificación**, que está gobernada por
una rúbrica pre-registrada: es la **completitud del barrido**. Una lista que muestra
lo que el scorer encontró no dice nada de lo que salteó, y una invención de B que no
está en la lista es invisible —y favorece el veredicto que el mismo scorer firma.

Queda pre-registrado: **las mediciones de G3 listan TODAS las afirmaciones de regla
de negocio del delta, una por línea y con veredicto por afirmación**, no solo las
falladas. Eso no vuelve auditable la honestidad del scorer, que no es auditable con
tres personas; vuelve **contable la omisión**, que es lo que sí se puede: la lista se
puede recorrer contra el delta y una afirmación ausente se ve.

Y se propone una segunda mirada donde más rinde, que además no la puede dar el
scorer: **PO, que produjo el corpus y no corre brazos, hace un spot-check de
granularidad del inventario antes de la primera sesión.** No revisa clasificaciones
—eso lo gobierna la rúbrica—: revisa que una lista de doce casos borde no haya quedado
comprimida en un ítem, que es el punto donde este piloto es más fácil de arruinar sin
mala fe (sección 3). Es una propuesta, no un hecho: la confirma la decisión 1.3.

### Por qué G0 mira dos directorios y no uno, corregido antes de la primera sesión

El criterio se escribió como «ediciones al directorio de instalación de la
herramienta», en singular, y el arnés commiteaba y diffeaba **solo `_bmad`**. La
sección 6 de este mismo archivo dice, medido el 2026-08-20, que la instalación
escribe `_bmad/` **y 49 skills en `.claude/skills/`**. O sea que el criterio miraba
la mitad de la herramienta.

Y no era una mitad cualquiera: **la edición más probable de todo el piloto es el
prompt de una skill.** El riesgo declarado del brazo B es que la fase 1 no ingiera
un corpus terminado, y la forma más directa de forzarla es reescribir el prompt de
la skill que elicita. Eso es exactamente «mantener un fork de un método ajeno», que
es lo que G0 existe para contar, y estaba pasando en verde. Se reprodujo antes de
arreglarlo: con `_bmad` intacto y una sola skill reescrita de «elicita al usuario»
a «ingiere el corpus provisto», el arnés devolvía código de salida **0**. Con la
corrección devuelve **1** y nombra el archivo.

Tres consecuencias que quedan escritas:

- El paso 3 de la receta del espacio commitea `_bmad` **y** `.claude/skills` en el
  commit de instalación. Si uno de los dos falta en ese commit, G0 se registra como
  **no medido** —con el nombre del que falta— y un criterio no medido cuenta en
  contra.
- El mensaje del arnés nombra los dos directorios, en el verde y en el rojo, para
  que «cero ediciones» no se pueda leer como si cubriera uno solo.
- G0 sigue sin mirar `_bmad-output/`, que es la salida y no la instalación, y sigue
  sin ver una edición que la herramienta necesitara en un tercer lugar del espacio.
  Si el lunes aparece un tercero, se agrega a la lista del arnés y va a la bitácora
  de G5.

### Por qué G4 se rearmó, con el número que lo delata

El umbral anterior era «brazo B ≤ 2× **las horas de PO** del control». Bajo la
pregunta nueva ese umbral no se puede evaluar, y no por gusto: **el PO no hace
descubrimiento en ninguno de los dos brazos, porque ya lo hizo.** Sus horas en el
control son las de revisar y aceptar escenarios, y tienden a cero. Dos por una
cantidad que tiende a cero es una cantidad que tiende a cero, así que el brazo B
fallaba por construcción, o el cociente quedaba indefinido si el control marcaba
cero exacto. Un umbral que no se puede evaluar es peor que ninguno: se resuelve el
lunes, a ojo, y con el resultado ya visto.

El arreglo mantiene el **2×** —cambiar el multiplicador ahora sí sería acomodar el
instrumento— y le cambia el ancla a la cantidad que de verdad varía: las horas de
**convertir**, que las pone el builder. Las horas del PO se conservan como segunda
condición porque es exactamente donde aparecería el costo de que la herramienta lo
vuelva a elicitar, y ese costo lo paga él. Pero **no con un múltiplo**, y esta es una
corrección al pre-registro hecha antes de la primera sesión: el párrafo de arriba
demuestra que un `2×` contra una cantidad que tiende a cero no se puede evaluar, y
conservarlo en la segunda condición reproducía **verbatim** el defecto que se acababa
de diagnosticar en la primera. Un múltiplo mide proporciones, y acá la cantidad es
chica: se mide en **absoluto**. Si el brazo B le cuesta al PO más de una hora extra
que el control, eso ya es el costo de re-elicitar y se ve sin dividir nada.

**Las horas se leen con sus decimales, no redondeadas a sesiones.** Con un
denominador chico, redondear a sesiones convierte cualquier cociente en 1 o en
infinito. `horas.csv` ya pide `horas_reloj` decimal, y es para esto.

### Por qué G6 se rearmó, y el agujero que queda abierto

Antes el insumo solo existía en el brazo B: el control no tenía PRD, así que no
podía confundir insumo con contrato. Ahora **los dos brazos leen un corpus**, y la
confusión está disponible para los dos. Contar solo en B habría medido la mitad, y
la mitad equivocada: si el control también usa el corpus como autoridad, entonces
la propiedad que D2 protege vale **con independencia del veredicto del piloto**, y
eso es un hallazgo y no una nota al pie.

**Y el agujero, que se declara ahora porque después va a parecer excusa.** El check
de D2 (tarea 5.1) es un check de **forma**: falla si un artefacto de la ubicación
declarada trae encabezados de delta o `#### Scenario:`. El prototipo HTML no trae
ni una cosa ni la otra, así que **pasaría el check**. Y es la pieza del corpus con
más autoridad de facto: no describe comportamiento, lo **muestra**, y encima ya
recibió feedback de usuario, así que llega con la validación social puesta.

O sea que la protección mecánica más fuerte que este change diseña es ciega
justamente contra su caso más peligroso. Consecuencias, escritas antes:

- G6 se puntúa **con el prototipo adentro**, explícitamente, por lectura humana.
- Si G6 cuenta una sola, el check de D2 se estrena rojo sin ventana de gracia, que
  es la regla que ya estaba escrita.
- Y va a `bitacora-g5.md` como candidato a check propio, con el destino que le
  corresponde: hoy es disciplina declarada y no enforcement.

**Regla de veredicto**, sin cambios respecto de D6 en su mecánica: verde exige los
siete. Rojo si falla G0, G1, G2 o G3, que son la razón de existir de la capa.
Amarillo si falla solo G4, o si G5 queda entero afuera. G6 no cambia el veredicto:
cambia con qué dureza se estrena el check de D2.

**Lo que sí cambió es qué afirma un verde, y qué habilita.** Por la decisión de
Builder 1 del 2026-08-21 (sección 2): un verde de esta primera rebanada significa **«no
se refutó que la herramienta ayude»**, no «ayuda», porque con la misma persona
corriendo A y después B el verde mide la herramienta más la memoria de haber hecho
ya la tarea. Y habilita **la segunda rebanada con el orden invertido**, no el
bloque 5: ni el archive, ni el estreno de los checks de D2 y D4, ni el pin en el
carril de los consumidores.

**Un criterio no medido no es un criterio aprobado.** Si algo no se pudo medir, se
escribe «no medido» con el motivo, y el veredicto se calcula con esa celda en
contra. Es la única lectura que no premia la falta de datos.

---

## 5. La planilla de horas

Vive en `horas.csv`, al lado de este archivo, con el encabezado ya escrito y cero
filas. Está en csv y no en una tabla de markdown porque se agrega una fila por
sesión sin reformatear nada, y porque es la fuente directa del número de G4.

La planilla ya separaba `rol` en `po` y `builder`, que es justo lo que el G4
rearmado necesita. **Lo que se le agregó el 2026-08-21, antes de la primera fila de
datos, es la columna `categoria`**, y el motivo está abajo de la tabla.

| Columna | Qué va | Valores |
|---|---|---|
| `fecha` | día de la sesión | `AAAA-MM-DD` |
| `rol` | quién puso las horas | `po` o `builder` |
| `brazo` | a qué brazo se le imputan | `A` o `B` |
| `sesion` | número de sesión de ese brazo | entero, arranca en 1, tope 5 (sección 2) |
| `categoria` | qué clase de trabajo fue | `conversion`, `marcado` o `elicitacion` |
| `horas_reloj` | horas de reloj de esa sesión | decimal con punto, por ejemplo `1.5` |
| `nota` | qué se hizo, en una línea | texto libre sin comas |

**Para qué está `categoria`, que no es contabilidad de gusto: separa una hora que
mide del brazo de una hora que mide del instrumento.**

- `conversion` — leer, escribir, revisar y corregir las cinco salidas. **Es lo que
  G4 compara**, en las dos condiciones: el cociente de horas de builder y el
  absoluto de una hora de PO.
- `marcado` — el PO poniendo «describe / no describe / no puedo saberlo» escenario
  por escenario, o sea la vara de G3b. **Queda afuera de la comparación de G4.** Sin
  esta separación, un brazo más prolijo —más escenarios, mejor separados— le comería
  al PO el techo de una hora por puro marcado y no por re-elicitar, que es
  exactamente lo contrario de lo que G4 busca. Se anota y se reporta igual: es el
  costo de tener la vara, y no medirlo sería tratarla como gratis.
- `elicitacion` — el PO contestando preguntas que el corpus no tenía. **Entra a la
  comparación de G4**, y a propósito: ahí es donde aparece el costo de que la
  herramienta lo vuelva a elicitar, que es lo único que G4 puede ver de la
  elicitación nueva (sección 8, la asimetría declarada).

Una hora se imputa a **una** categoría. Si una sesión mezcló, se anota en dos filas:
partir una fila es barato y estimar un porcentaje después no es auditable.

**Se anota al cerrar cada sesión, no al final del piloto.** La memoria de cuatro
semanas siempre favorece a lo nuevo, y G4 es el único criterio que se puede
falsear sin mentir: alcanza con reconstruir de memoria. La primera fila con datos
tiene que llevar fecha **posterior** a la del commit de este archivo. Esa
comparación es la comprobación de la tarea 0.7, y hoy es además la prueba de que
esta reescritura es pre-registro: el archivo tiene cero filas de datos.

**Las horas de descubrimiento del PO NO van a esta planilla.** Se gastaron antes
del piloto y son las mismas para los dos brazos, así que sumarlas movería los dos
platos de la balanza por igual y solo serviría para hacer parecer chica la
diferencia. Si alguien quiere el costo total del camino, es otra cuenta y no es
esta.

---

## 6. La herramienta: versión, instalación y lo que pidió de verdad

| Qué | Valor |
|---|---|
| Paquete y versión pinada | `bmad-method@6.11.0` (investigado el 2026-08-19 contra el repositorio y el registro de paquetes, según `design.md`) |
| Licencia | MIT, con reserva de marcas de un tercero. Se la nombra por su nombre y no se la presenta como propia |
| Comando de instalación, copiado verbatim del ensayo | `npx --yes bmad-method@6.11.0 install --yes --modules bmm --tools claude-code --directory .` |
| Código de salida de la instalación | **0**. Ensayado el 2026-08-20 en la máquina de @builder-uno, en un directorio desechable |
| Qué pidió de verdad la instalación | **`uv`, la cadena de Python.** Ver el detalle abajo |
| Si la fase 1 ingiere un corpus terminado en vez de elicitar | PENDIENTE (decide: quien corra el brazo B, tarea 1.4). Es el riesgo de la sección 2 |

**La fila nueva es la que puede tumbar el brazo B, y no se cierra leyendo el
README.** El ensayo del 2026-08-20 midió que la herramienta se **instala** (exit
0). No midió que acepte un corpus terminado como entrada de su fase 1, porque
cuando se corrió ese ensayo la pregunta del piloto todavía era la otra. Cerrarla
exige correr la fase 1 contra una pieza del corpus, antes del lunes, y anotar qué
pasó. Si no se alcanza a cerrar, se arranca igual y el resultado se registra por la
tabla de tres desenlaces de la sección 2. Lo que no se puede hacer es descubrirlo
el lunes y llamarlo «un problema de setup».

**Lo que el ensayo midió, el 2026-08-20.** La tarea 1.1 la aprobó @builder-uno ese
día; sin ese OK este ensayo no se podía correr, porque instalar la herramienta ES usar
la dependencia de terceros.

- **La herramienta necesita un intérprete.** El instalador imprime `🐍 REQUIRED: uv`
  y explica que `uv` corre los scripts de Python de los que dependen sus skills
  (`uv run <script>`) y provisiona el intérprete él mismo. El alcance está acotado y
  es lo que hace que esto NO tumbe el piloto: sin `uv`, lo que se cae son
  `bmad-build` y `bmad-build-auto` **al activarse**, no la instalación ni las skills
  de elicitación. El paquete trae **31 scripts `.py`**, de los que **27** aterrizan
  bajo `*/scripts/*`.
- **Esa máquina ya tenía `uv 0.12.0`**, así que el chequeo del instalador pasó
  (`✅ Python UV check pass`). **Lo que NO se midió es el comportamiento sin `uv`**, porque
  no se desinstaló nada para averiguarlo. Ese es el hueco que queda y por eso la tarea 1.4
  sigue exigiendo el ensayo **en la máquina que va a correr el brazo B**: si esa máquina no
  es esa, el resultado de arriba no la representa.
- **Lo que se descartó, comprobándolo:** los archivos `.pyc` que aparecen tras la
  instalación **vienen en el paquete** (9, incluidos los de pytest), así que NO son prueba
  de que Python haya corrido durante la instalación. La prueba de la dependencia es el
  chequeo del instalador, no el caché.
- **La instalación escribe 49 skills** en `.claude/skills/`, más `_bmad/` y
  `_bmad-output/`. Unos 2,9 MB.
- **Aviso de seguridad en cada corrida:** `npm warn deprecated glob@11.1.0: Old versions of
  glob are not supported, and contain widely publicized security vulnerabilities`. Es una
  dependencia transitiva de la herramienta, no del marco, y no se puede arreglar desde acá.

**Dos colisiones con las compuertas del marco, medidas, que hay que resolver antes de que
un repo commitee lo que la herramienta instala.** Ninguna tumba el piloto, porque el piloto
corre en un espacio desechable; las dos muerden el día que Supply Chain sea un repo.

1. **El paso «Sin marcadores del scaffold sin resolver» daría ROJO.** Se reprodujo el check
   tal como corre (`git ls-files -z | xargs -0 grep -nIE '(^|[^$])\{\{[A-Z0-9_]+\}\}'`)
   sobre 265 archivos rastreados: **2 archivos** de la herramienta traen marcadores
   —`{{BODY}}`, `{{CHIPS}}`, `{{GOALBAR}}`, `{{M}}`, `{{N}}`, `{{TOTAL}}`— en
   `.claude/skills/bmad-brainstorming/scripts/brain.py` y en
   `.claude/skills/bmad-create-epics-and-stories/templates/epics-template.md`. Es la misma
   forma del problema que el marco ya tiene escrita para el formateador: un rojo permanente
   sobre archivos que ninguna persona escribió ni puede arreglar.
2. **`git add` falla con `Filename too long`** en los `__pycache__` de la herramienta a una
   profundidad de ruta normal en Windows. Se resuelve con `__pycache__/` y `*.pyc` en el
   `.gitignore`, y con eso el índice se armó sin problemas (265 archivos).

**Y una que salió bien, que vale anotar porque fue por diseño:** la herramienta escribe 49
skills y **ninguna** con el prefijo `openspec-`, así que el check de artefactos regenerados
—acotado a `.claude/skills/openspec-*/SKILL.md`, por nombre del generador y no por
directorio— no las mira. Si ese check se hubiera acotado por carpeta, hoy estaría en rojo.

**La forma del comando no es opcional.** Cualquier invocación que corra por un
ejecutor que descarga se escribe con el paquete completo y su versión exacta. El
nombre pelado de un paquete en npm lo puede tener otro, y el marco ya tiene el
caso escrito: `openspec` a secas es un placeholder ajeno. El check «Ejecutores de
paquetes pinados» excluye los `.md`, así que este archivo no lo dispara: la regla
vale igual, y quien la incumpla acá no se va a enterar por un rojo.

**El estado de la cadena de Python en la máquina donde se escribió este
pre-registro**, medido por código de salida:

| Comando | Salida | Código |
|---|---|---|
| `node --version` | `v26.5.0` | 0 |
| `pnpm --version` | `11.18.0` | 0 |
| `uv --version` | `uv 0.12.0` | 0 |
| `python --version` | «Python was not found», el alias de la tienda | **49** |
| `python3 --version` | «Python was not found», el alias de la tienda | **49** |
| `py --version` | no está en el PATH | **127** |

Node cumple el `engines >= 20.12.0` que `design.md` declara, y `uv` está. Python
**no**: lo que responde es el alias de la Microsoft Store, que no es un
intérprete. Como `uv` provisiona el intérprete él mismo, eso alcanza; lo que sigue
sin medirse es el caso sin `uv`.

---

## 7. Las decisiones humanas del bloque 1

Ninguna se resuelve por defecto y ninguna la toma un agente. De las seis, **una
sigue siendo bloqueante dura** para el lunes.

| | Decisión | Quién | Cuándo | Estado |
|---|---|---|---|---|
| 1.1 | Usar una dependencia de terceros en el piloto, con su versión y su alcance de módulos. El OK para que el pin entre al carril de todos los consumidores es **otro** OK, y solo si las **dos** rebanadas dan verde (sección 2) | Builder 1 | antes de la primera sesión | **RESUELTA: la tomó @builder-uno el 2026-08-20.** Alcance: `bmad-method@6.11.0`, módulo `bmm`, herramienta `claude-code`, en espacio desechable. El OK para que el pin entre al carril de los consumidores sigue PENDIENTE y es otro |
| 1.2 | Dónde vive el corpus de descubrimiento y si puede pasar por un modelo. El repositorio no es su custodio (D3) | Builder 1, con el PO | antes de abrir el material | **RESUELTA: la contestó Builder 1 el 2026-08-21.** Ver abajo |
| 1.3 | Correr el piloto: reserva de tiempo del PO y de dos builders, y confirmación del reparto de roles de la sección 2 | Builder 1, PO (PO), Builder 2 | antes de la primera sesión | PENDIENTE |
| 1.4 | Cadena de herramientas: instalación ensayada en la máquina del brazo B, **y** si la fase 1 ingiere un corpus terminado | quien corra el brazo B | antes de la primera sesión | **PARCIAL**: instalación ensayada el 2026-08-20 (exit 0, pide `uv`; sección 6). Sigue PENDIENTE si el brazo B corre en otra máquina, PENDIENTE el caso sin `uv`, y PENDIENTE la ingesta del corpus |
| 1.5 | Si las piezas del corpus que entran a la sesión están **despersonalizadas**, o si traen nombres de empleados y juicios sobre su propio trabajo | PO (PO), con Builder 1 | antes de abrir el material | PENDIENTE. **Bloqueante**: es el residuo que la respuesta de 1.2 no cubre, y depende de ver el corpus |
| 1.6 | El inventario de piezas del corpus con su identificador y su letra de tipo (`E`/`D`/`P`/`F`), que es lo que la sección 1 va a citar | PO (PO), al entregar el corpus | antes de la primera sesión | PENDIENTE |

### 1.2, resuelta: lo que contestó Builder 1 el 2026-08-21

La respuesta llegó como **regla general del área** y no como excepción de este
proyecto, y por eso se escribe entera:

> El discovery se produce **fuera del repositorio** y entra como insumo **al inicio
> de la sesión**: de un proyecto nuevo, de un deploy nuevo, o de un agregado a un
> proyecto existente. **El repositorio no es su custodio.**

Las dos mitades que la decisión 1.2 preguntaba quedan contestadas, y una de las dos
por implicación, que se dice en vez de disimularse:

- **Dónde vive: fuera del repositorio.** Contestado directo, y coincide con D3, que
  ya lo había decidido por la vía del material crudo. Lo que agrega la respuesta de
  Builder 1 es que vale para **todo el corpus** —los documentos derivados incluidos, no
  solo las transcripciones— y que vale como práctica permanente, no como cuidado
  particular de este piloto.
- **Si puede pasar por un modelo: sí.** Esto es implicación y no cita: «entra como
  insumo al inicio de la sesión» **es** pasar por un modelo, porque la sesión es el
  contexto de un agente. No hay lectura en la que el corpus sea el primer input de
  la sesión y a la vez no entre al modelo.
- **Lo que la respuesta NO cubre**, y por eso nace la decisión 1.5: si lo que entra
  está despersonalizado. Que el corpus no viva en el repositorio no dice nada sobre
  si sus documentos traen nombres. Son dos fronteras distintas, custodia y
  contenido, y la respuesta cierra la primera.

**Y esta regla no se queda en el piloto.** Builder 1 la enunció como la forma en que el
área trabaja, no como un cuidado de este proyecto, así que se propuso donde vale
para todos: como **requirement del delta de `gobierno-contribucion`**, en un PR
aparte del que trae este pre-registro. Va aparte a propósito, y el motivo es el
gate y no la prolijidad: el delta de esa capability lo gatea el PO por CODEOWNERS,
y este archivo no. Mezclarlos en un PR haría que la corrección del instrumento
—que el piloto necesita el lunes— quedara esperando una aprobación que no le
corresponde.

Ese PR lleva la decisión **D11** de `design.md`, con tres cosas que acá no entran:
en qué superficie quedó la regla y por qué esa, la medición que descartó escribirla
hoy en el canónico transportado, y la versión del canónico que haría falta y que
**no se cortó**.

Cuando una decisión se resuelve, se escribe acá **quién la tomó y en qué fecha**.
Una decisión sin autor es una decisión que nadie va a poder discutir en seis meses.

---

## 8. Lo que este piloto NO mide

Está acá para que no se lea como olvido, y para que un veredicto verde no se
compre más autoridad de la que tiene.

- **No mide si la herramienta sirve para descubrir.** Va primero porque es lo que
  más fácil se va a malinterpretar. El corpus ya existe: la herramienta se va a
  usar a contramano de su diseño, sobre material terminado. Un rojo dice «no ayuda
  a convertir un corpus que ya existe», y no dice nada sobre elicitar desde cero.
- **No mide la calidad del corpus.** Si PO levantó mal un proceso, los dos
  brazos van a convertir fielmente el error y las siete celdas van a salir igual
  que si estuviera bien. La capa cierra la invención silenciosa, no el error del
  negocio ni el del descubrimiento.
- **No mide si la capa sirve en general.** n=1: una rebanada, un proyecto, un PO,
  una persona corriendo los dos brazos. El gate está diseñado para poder decir
  no; no puede decir sí más allá de este caso. La asimetría es deliberada.
- **No mide la herramienta separada del orden en que se corrió.** Con la misma
  persona en los dos brazos, el brazo B recibe el corpus ya digerido por el brazo
  A, y eso no se puede descontar con n=1. Por eso un verde de esta rebanada dice
  «no se refutó que ayude» y habilita la segunda rebanada invertida (sección 2), en
  vez de habilitar el archive. Las dos corridas juntas **acotan** el efecto del
  orden; ninguna de las dos lo elimina.
- **No mide la calidad de la procedencia.** Que un escenario tenga origen no dice
  nada sobre si el origen era una buena idea. La trazabilidad va a rastrear con
  fidelidad perfecta hasta una mala decisión del negocio. Lo que se cierra es la
  invención silenciosa.
- **No mide nada de lo que pasa dentro de la herramienta.** Es conversacional de
  punta a punta: nada adentro falla solo. Todo lo que se gatea es su salida.
- **No mide las fases 3 y 4 de la herramienta**, que no se adoptan (D1). El
  `design.md` y el `tasks.md` que los dos brazos entregan se escriben con los
  artefactos del marco, no con la fase 3. Un veredicto verde no dice nada sobre
  Solutioning ni sobre Implementation, y usarlo para justificarlas después sería
  estirar la medición más allá de lo que se midió.
- **No mide cuánto aporta la elicitación nueva, y la asimetría se declara: el costo
  de elicitar se mide, el valor se excluye.** Si la herramienta le saca al PO algo
  que el corpus no tenía, las horas que eso le cuesta al PO **entran** a G4 —es
  exactamente donde G4 busca el costo de re-elicitar— y lo que produce **no entra**
  a ninguna celda: un ítem `elicitado` satisface la asociación de G1 y queda afuera
  de los denominadores de G2 y G3, y la lista de observación no tiene umbral. La
  asimetría es a propósito y es **contra** el brazo B: un umbral inventado antes de
  ver un solo caso es un número que inventa un éxito, y preferimos cobrarle el costo
  y no acreditarle el valor antes que lo contrario. Es el candidato más fuerte a
  medición propia de la segunda rebanada.
- **No mide el costo para los consumidores.** El pin entra al carril de repos que
  no participaron de esta decisión, y ese costo no aparece en ninguna de las
  siete celdas. Es la razón por la que agregar una dependencia es frontera con OK
  humano y no una consecuencia del veredicto.
- **No mide el envejecimiento del insumo.** El corpus y el PRD quedan congelados y
  fechados, el spec vivo es la autoridad, y ningún check compara los dos. Un
  documento que en seis meses miente no pone nada en rojo, y el piloto dura cuatro
  semanas: no puede ver ese modo de falla.
- **No mide la dirección inversa.** Lo que el piloto aprenda sobre el método y
  quiera devolverle a la herramienta de terceros no tiene canal, y este piloto no
  lo abre.
