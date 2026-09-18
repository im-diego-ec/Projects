# gobierno-contribucion — Delta de `el-canonico-dice-como-se-trabaja`

## ADDED Requirements

### Requirement: Una revisión declara su meta, y lo que no la bloquea no se pregunta

Toda revisión de un artefacto SHALL declarar, antes de empezar, **cuál es la meta
que sirve**, y esa meta SHALL ser un artefacto que se pueda cerrar y no un estado
del trabajo. «El change X mergeado» cierra; «la épica sin pendientes» no cierra
nunca, porque siempre hay uno más y nada declara cuándo se dejó de buscar.

Todo hallazgo de esa revisión SHALL clasificarse contra la meta declarada —bloquea
o no bloquea— **antes** de reportarse. Lo que no la bloquea SHALL anotarse en los
pendientes del change en curso y NO SHALL convertirse en una pregunta ahora.
Anotarse no es descartarse: espera al trabajo que sí lo necesite.

Una pregunta dirigida al PO SHALL decir **qué desbloquea**. Una pregunta que no
desbloquea nada de la meta en curso NO SHALL formularse todavía, aunque su
respuesta sea necesaria más adelante. Las horas de quien conoce el negocio son el
recurso más escaso del área y el único que ningún pipeline mide: sin esta regla,
un agente que reporta todo lo que encuentra las gasta sin que nada lo frene.

Estas conductas SHALL viajar en la porción del marco de la constitución, que es
lo único que cada sesión de cada proyecto carga sin que nadie la invoque, y cada
una SHALL tener su **propio identificador**: un desvío anula la regla entera, y
agruparlas obligaría a quien quiera apartarse de una a apartarse de todas. La
regla que nombra al PO SHALL nombrarlo por su rol, de modo que reasignarlo cueste
editar un solo valor del proyecto.

#### Scenario: Una revisión que no dice a qué sirve
- **WHEN** una sesión arranca la revisión de un artefacto sin haber declarado qué meta sirve esa revisión
- **THEN** la revisión no se corre hasta que la meta esté escrita, porque sin meta declarada todo hallazgo pesa igual y no hay contra qué decidir cuál se pregunta

#### Scenario: Una meta que no puede cerrar
- **WHEN** la meta declarada es un estado del trabajo —«sin pendientes», «todo resuelto», «la épica limpia»— en vez de un artefacto que se pueda dar por cerrado
- **THEN** la meta se reescribe como el artefacto concreto que la revisión habilita, porque un estado no tiene condición de cierre y el trabajo que lo persigue no converge

#### Scenario: Un hallazgo que no bloquea la meta
- **WHEN** una revisión encuentra algo real que no impide cerrar la meta declarada
- **THEN** queda anotado en los pendientes del change con lo que bloquea de otra cosa, y no se convierte en una pregunta al PO en esta ronda

#### Scenario: Una pregunta al PO sin efecto declarado
- **WHEN** se prepara un pedido de decisión al PO cuyos ítems no dicen qué desbloquean
- **THEN** el pedido no se envía hasta que cada ítem lo declare, y los que no desbloquean nada de la meta en curso se retiran del pedido y quedan anotados

#### Scenario: Una de estas reglas se cae de la constitución
- **WHEN** un cambio del marco quita del canónico alguna de estas reglas, les cambia el identificador, o escribe el rol del PO a mano en vez de por su marcador
- **THEN** el pipeline del marco falla nombrando la regla y lo que deja de llegar a cada sesión, porque una regla que se cae no rompe nada más: el render simplemente sale más corto

### Requirement: Un change se congela contra una versión de su insumo

Un change en curso SHALL declarar **contra qué versión del insumo** fue escrito, y
el material que el PO entregue después de esa versión NO SHALL reabrir el trabajo
ya hecho: alimenta al change siguiente.

La única excepción SHALL ser el material que **contradiga** lo que este change
especifica, y la distinción es la que separa dos costos distintos: un artefacto
**desactualizado** dice algo viejo y se actualiza cuando toque; uno **contradicho**
describe una conducta descartada, y por lo tanto **respalda construir lo que no
va**. Sólo el segundo justifica volver sobre lo hecho.

Sin esta regla, cada entrega del PO dispara un recálculo completo más una
corrección del change, y el trabajo se rehace tantas veces como documentos
lleguen. El corpus de un PO no es fijo: llega a lo largo de todo el trabajo, y el
método SHALL tratarlo como un flujo y no como un conjunto cerrado.

#### Scenario: Llega material nuevo que no contradice nada
- **WHEN** el PO entrega material después de la versión contra la que el change fue escrito, y ese material agrega o precisa sin contradecir lo que el change especifica
- **THEN** el material queda registrado como insumo del change siguiente y el change en curso no se recalcula, de modo que el trabajo hecho no se rehace por cada entrega

#### Scenario: Llega material que contradice lo especificado
- **WHEN** el material nuevo describe una conducta incompatible con la que el change ya especificó
- **THEN** se reporta qué quedó contradicho —no sólo desactualizado— y esos elementos se corrigen antes de seguir, porque un texto que describe una conducta descartada respalda construir lo que no va

#### Scenario: Un change sin versión de insumo declarada
- **WHEN** un change llega a revisión sin decir contra qué versión del insumo fue escrito
- **THEN** no se puede distinguir qué material es posterior y por lo tanto no hay forma de decidir qué reabre el trabajo, así que la versión se declara antes de continuar

### Requirement: El pull request final de un change lleva el enlace a su issue macro desde que se crea

El marco SHALL enunciar el enlace entre el pull request final de un change y el
issue macro como una propiedad del **cuerpo del pull request en el instante de su
creación**, y NO como un hecho posterior al merge. Una obligación enunciada como
consecuencia del merge —«el PR final cierra el issue macro»— no se puede atestiguar
en el pull request que la cumple: obliga a que el registro del change quede
diciendo que no terminó, o a un pull request posterior cuyo contenido íntegro es
marcar una casilla.

El pull request final SHALL llevar la referencia que crea el enlace con el issue
macro con la misma forma y la misma exigencia que un pull request de bloque con su
sub-issue: en el cuerpo, desde la creación. El cierre del change NO SHALL ser una
excepción a la regla del enlace, porque esa excepción es la que impediría que la
regla tenga alguna vez una compuerta previa al merge.

#### Scenario: La tarea del cierre se marca en el pull request que la cumple
- **WHEN** el pull request final de un change lleva en su cuerpo, desde la creación, la referencia al issue macro
- **THEN** la tarea que lo atestigua se verifica y se marca **antes** del merge, y el registro del change queda completo en ese mismo pull request
- **AND** no hace falta ningún pull request posterior cuyo único contenido sea marcar la casilla

#### Scenario: La constitución vuelve a enunciar el cierre como consecuencia del merge
- **WHEN** un cambio del marco hace que la porción del marco de la constitución diga que el pull request final «cierra» el issue macro, o deje de decir que lo lleva en su cuerpo desde que se crea
- **THEN** el pipeline del marco falla nombrando la regla y la redacción que la reemplaza

### Requirement: Un bloque implementado que no pudo desplegarse se declara terminado en local y no cerrado

La definición de terminado del área exige que el trabajo esté desplegado por la
promoción y verificado. Un repositorio que todavía no tiene ambiente —o que declaró
que no despliega, que es una respuesta legítima— no puede cumplir esa última
cláusula, y ese estado SHALL tener nombre en vez de quedar como un incumplimiento
silencioso o como una casilla marcada que miente: **terminado en local y no
cerrado**.

Lo que queda abierto SHALL ser el **bloque**, no sus tareas: las tareas de
implementación que se hicieron SHALL seguir marcadas como hechas. El bloque SHALL
declararse en el `tasks.md` de su change con lo que le falta escrito, y un bloque
que lleve casilla propia SHALL marcarse con una marca intermedia distinta de
hecho y de pendiente.

Tener ambiente NO SHALL cerrar los bloques que quedaron atrás: pasan a hechos
cuando se despliegan y se verifican. Un change NO SHALL archivarse contando como
hechos bloques que no se desplegaron.

La regla SHALL viajar en la porción del marco de la constitución **pegada a la
definición de terminado**: sola no significa nada, y la definición sin ella al
lado vuelve a decir que un bloque verde en local sin desplegar no está hecho, sin
ofrecer la salida.

#### Scenario: Un bloque terminado en local sobre un repositorio sin ambiente
- **WHEN** un bloque tiene su código escrito, sus pruebas verdes en local y su PR revisado, y el repositorio todavía no tiene un ambiente donde desplegarlo
- **THEN** el bloque se declara terminado en local y no cerrado, con lo que falta escrito, en vez de contarse como hecho o como incumplimiento

#### Scenario: Un repositorio que declaró que no despliega
- **WHEN** el proyecto declaró que no tiene plataforma de despliegue
- **THEN** sus bloques quedan terminados en local y no cerrados, y ese estado es legítimo y no vence

#### Scenario: Las tareas del bloque están hechas
- **WHEN** un bloque sin desplegar tiene todas sus tareas de implementación hechas
- **THEN** las tareas siguen marcadas como hechas y lo que se declara abierto es el bloque, porque marcarlas pendientes mentiría al revés e invitaría a rehacer lo hecho

#### Scenario: El repositorio consigue un ambiente
- **WHEN** un repositorio con bloques terminados en local y no cerrados obtiene un ambiente
- **THEN** esos bloques siguen abiertos hasta que se despliegan y se verifican, y ningún archive los cuenta como hechos mientras tanto

#### Scenario: La regla se separa de la definición de terminado
- **WHEN** un cambio del marco quita la regla del canónico, la aleja de la definición de terminado, o le quita la marca intermedia, la salida para quien no despliega o la distinción entre bloque y tarea
- **THEN** el pipeline del marco falla nombrando lo que dejó de decir
