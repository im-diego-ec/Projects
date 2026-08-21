# pipeline-entrega — Delta

## ADDED Requirements

### Requirement: La mecánica de las compuertas de entrega se consume por referencia; la topología es del proyecto

Cuando el área fija la infraestructura de sus proyectos, la mecánica de cada
compuerta del pipeline de entrega —construir y publicar el artefacto, correr una
tarea de una sola vez contra el ambiente, gatear el despliegue con las
migraciones, actualizar el servicio— pasa a ser **idéntica por decreto**. El
marco SHALL publicar esa mecánica como piezas referenciadas que los repositorios
consumen sin copiarlas, y el repositorio consumidor SHALL declarar únicamente la
**topología** de su promoción: qué jobs existen, de qué dependen, bajo qué
condiciones corren, qué ambiente resguarda los secretos de producción y cómo se
serializan los despliegues sobre un ambiente compartido.

Cada pieza referenciada SHALL recibir lo que necesita por **entradas nombradas**,
y NO SHALL exigir del repositorio consumidor un acceso indiscriminado a su
almacén de secretos: la pieza declara qué secreto usa y el llamador decide
pasárselo. Los valores que el pipeline consume en runtime —dominios, ARNs, log
groups, identificadores de registro y de notificaciones— SHALL viajar por
variables y secretos del repositorio consumidor, nunca dentro de la pieza
referenciada.

Cuando un repositorio conserve mecánica copiada de una compuerta que ya existe
como pieza referenciada, el pipeline SHALL avisarlo nombrando la pieza que la
reemplaza. Ese aviso NO SHALL fallar el pipeline: la adopción es trabajo
deliberado por compuerta, y un check que ponga rojo a un repositorio que no
modificó una sola línea rompe repos ajenos en silencio.

Un proyecto que legítimamente no quepa en la infraestructura fija SHALL poder
registrarse como excepción: conserva las propiedades que los specs del marco
exigen, es dueño de su propio despliegue y NO consume las piezas referenciadas
de entrega. Esa excepción SHALL quedar contada, porque un porcentaje de área
cubierta que baja en silencio es una premisa equivocada que nadie mira.

#### Scenario: Una corrección de una compuerta llega a todos los consumidores
- **WHEN** una lección de un incidente corrige la mecánica de una compuerta ya publicada como pieza referenciada
- **THEN** la corrección llega a cada repositorio consumidor en su próxima promoción, sin un pull request por repositorio y sin que nadie tenga que acordarse de portarla

#### Scenario: El repositorio conserva mecánica que el marco ya publica
- **WHEN** el pipeline de un repositorio consumidor ejecuta pasos propios que reproducen una compuerta que ya existe como pieza referenciada
- **THEN** la corrida avisa nombrando la pieza que la reemplaza, y no falla por eso

#### Scenario: Un proyecto que no cabe en la infraestructura fija
- **WHEN** un proyecto queda registrado como excepción a la infraestructura del área
- **THEN** su pipeline no consume las piezas referenciadas de entrega, sigue obligado por las propiedades que los specs del marco exigen, y la excepción queda contada como dato de la revisión periódica

#### Scenario: Un valor de un proyecto dentro de una pieza referenciada
- **WHEN** una pieza referenciada de entrega lleva escrito un dominio, una cuenta, un ARN o un log group de un proyecto concreto
- **THEN** eso es un defecto de la pieza: ese valor va por variables y secretos del repositorio consumidor, que es donde un cambio no exige tocar código y un secreto no se filtra en un diff

### Requirement: Ninguna pieza del marco alcanza producción sin haber corrido en dev en la misma promoción

El marco no despliega nada, así que no puede ejercitar por sí mismo la mecánica
de entrega que publica; y la mitad de producción de una promoción no corre en
ningún ensayo previo, porque un disparo manual sobre una rama de trabajo deja los
jobs de producción sin ejecutar. La propiedad que cierra ese hueco es de la
unidad de distribución: **cuando una promoción incluye tramo de dev y tramo de
producción, toda pieza referenciada del marco que ejecute un job de producción
SHALL haber sido ejecutada por el tramo de dev de esa MISMA promoción**, en la
misma versión. El pipeline SHALL fallar cuando no, nombrando la pieza y el tramo
que falta.

Las únicas excepciones SHALL ser las vías que por diseño no tienen tramo de dev
en ese run, y SHALL estar **declaradas de antemano**, cada una con su control
compensatorio:

- el rollback a un artefacto que ya estuvo en producción, cuya existencia se
  valida contra el registro **antes** de tocar el servicio;
- el disparo manual de emergencia sobre la rama de integración, que hereda el
  riesgo que esa vía siempre tuvo y queda registrado en el historial del
  proveedor de CI;
- el reuso de una verificación de dev anterior sobre contenido idéntico, cuya
  ventana es acotada y cuyo residuo —que esa corrida haya ejercitado una versión
  anterior de la pieza— se acota porque mover el tag mayor es un acto humano
  deliberado.

Una vía nueva que esquive el invariante SHALL declararse **antes de existir**: un
agujero descubierto después es indistinguible de un invariante que nunca se
cumplió.

Una pieza cuya mecánica corre **solo** en producción NO SHALL extraerse al marco
mientras no exista un tramo de dev que la ejerza; SHALL quedar en el proyecto con
la razón escrita, o SHALL diseñarse primero ese tramo de dev. Extraerla antes
crearía la única clase de código de marco que ningún consumidor puede ensayar.

#### Scenario: Una compuerta nueva se estrena en una promoción completa
- **WHEN** un merge a la rama de integración promociona un cambio y un job de producción ejecuta una pieza referenciada del marco
- **THEN** esa misma pieza, en esa misma versión, ya se ejecutó en el tramo de dev de esa promoción minutos antes, y el pipeline lo verifica sin depender de que alguien lo recuerde

#### Scenario: Una pieza del marco solo en el tramo de producción
- **WHEN** el pipeline de un repositorio consumidor usa una pieza referenciada del marco en un job de producción y ningún job del tramo de dev de esa promoción la usa
- **THEN** el pipeline falla nombrando la pieza y el tramo que falta, antes de desplegar a producción

#### Scenario: Un rollback no tiene tramo de dev, y está bien
- **WHEN** se dispara el rollback a un artefacto que ya estuvo en producción, de modo que el tramo de dev no corre en ese run
- **THEN** el invariante no aplica —es una de las excepciones declaradas— y el control compensatorio corre igual: la existencia del artefacto se valida contra el registro antes de que el servicio se toque

#### Scenario: Una vía nueva que esquiva el invariante
- **WHEN** aparece una forma de llegar a producción sin tramo de dev que no está entre las excepciones declaradas
- **THEN** el pipeline la trata como fallo, y habilitarla exige declararla con su control compensatorio, no descubrirla después de usarla

#### Scenario: Una mecánica que solo existe en producción
- **WHEN** se evalúa extraer al marco una mecánica que ningún tramo de dev ejecuta —una verificación que por definición corre contra producción, por ejemplo—
- **THEN** no se extrae mientras no exista un tramo de dev que la ejerza: queda en el proyecto con la razón escrita, o se diseña primero ese tramo
