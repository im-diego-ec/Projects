# base-tecnologica — Delta

## ADDED Requirements

### Requirement: El marco publica una base tecnológica única y es la primera opción

El marco SHALL publicar la base tecnológica del área —capa por capa: cómputo,
persistencia, frontend, backend, identidad, validación de input externo,
infraestructura como código, pipeline, gestor de paquetes y pruebas— en un
único lugar que los proyectos consumen sin copiar, y esa base SHALL ser la
primera opción de todo proyecto del marco.

La base SHALL llegar al repositorio **ya escrita**, no como huecos que quien
arranca el proyecto rellena a criterio propio, y su corrección SHALL propagarse
a los repositorios consumidores por el mismo carril que el resto de las reglas
del marco: una capa se corrige una vez para todos, no repositorio por
repositorio.

Introducir en un proyecto una pieza de una capa que la base ya fija SHALL ser
una decisión y no una implementación. Cambiar la base publicada SHALL exigir un
cambio del marco con su alternativa descartada escrita y su impacto en los
consumidores evaluado; NO SHALL bastar editar el texto que la publica.

La base SHALL nombrar la pieza de cada capa, no su versión: qué versión mayor
corre cada repositorio lo gobierna la política de dependencias del marco, y
esta capability no lo fija.

#### Scenario: Nace un proyecto nuevo
- **WHEN** se crea un repositorio del marco a partir del scaffold
- **THEN** su base llega escrita capa por capa, y ninguna capa que el marco fija queda a criterio de quien arranca el repositorio
- **AND** lo que ese proyecto agrega sobre la base queda en un lugar propio, separado de lo que el marco fija, de modo que ninguna de las dos partes se pise al actualizarse la otra

#### Scenario: El marco corrige una capa de la base
- **WHEN** el marco cambia o corrige la pieza de una capa de la base
- **THEN** el cambio llega a cada repositorio consumidor por el mismo carril que el resto de las reglas del marco, sin que ningún proyecto vuelva a escribir la tabla a mano

#### Scenario: Alguien reescribe la base sin decidirlo
- **WHEN** un cambio del marco modifica la base publicada sin la decisión que la sostiene —sin alternativa descartada y sin impacto en consumidores evaluado—
- **THEN** ese cambio no es admisible como corrección de texto: la base es contrato, y su edición sin decisión deja a los proyectos consumiendo una base que nadie eligió

### Requirement: Apartarse de la base se pregunta antes de implementar

Apartarse de cualquier capa de la base SHALL requerir aprobación humana ANTES
de que exista el código o la infraestructura que implementa la alternativa.
Declarar el desvío después de implementarlo NO SHALL considerarse cumplimiento:
el review que descubre el servicio ya desplegado no evalúa una decisión, ratifica
un hecho consumado.

El desvío SHALL nombrar la capa de la base que reemplaza, quién lo aprobó,
cuándo y por qué. El pipeline del repositorio SHALL rechazar el repositorio
cuando su base declarada difiera de la base publicada por el marco sin ese
desvío, y SHALL rechazarlo también cuando el repositorio no declare su base en
absoluto: la ausencia de declaración no es conformidad, es una comprobación que
no se pudo hacer. El ciclo de vida del desvío —el motivo escrito, su reimpresión
en cada corrida y su caducidad cuando la regla que anulaba deja de existir— lo
especifica la capability `gobierno-contribucion`.

Un desvío SHALL estar acotado a la capa que nombra: apartarse de una capa NO
SHALL relajar ninguna otra propiedad exigida por el marco.

Una capa de la base que el proyecto todavía no implementó NO SHALL declararse
como desvío: un pendiente no es una alternativa. Lo que falta lo exigen las
capabilities que lo especifican; el desvío existe para reemplazar una pieza por
otra distinta.

#### Scenario: La alternativa llega implementada y sin preguntar
- **WHEN** un cambio de un repositorio introduce una pieza de una capa que la base fija y no existe un desvío aprobado para esa capa
- **THEN** el pipeline del repositorio falla nombrando la capa y el desvío ausente
- **AND** el desvío no lo puede otorgar quien implementa: exige la aprobación de un humano nombrada por escrito, así que el cambio no se integra antes de que la pregunta esté contestada

#### Scenario: El proyecto se aparta de una capa, con razón y aprobación
- **WHEN** un proyecto declara el desvío de una capa nombrando la pieza que usa en su lugar, quién lo aprobó, cuándo y por qué
- **THEN** el pipeline pasa, y el desvío queda impreso junto a la regla de la base que anula dentro del artefacto que los agentes del repositorio cargan

#### Scenario: Un desvío que se estira a otra capa
- **WHEN** un proyecto invoca el desvío de una capa para relajar una propiedad que el marco exige en otra —su promoción, sus compuertas de CI, su verificación de lo desplegado, su manejo de secretos—
- **THEN** el marco no lo reconoce: el desvío vale únicamente para la capa que nombra, y todas las demás propiedades siguen exigidas

#### Scenario: Una capa que el proyecto todavía no implementó
- **WHEN** un repositorio no tiene todavía la pieza de una capa de la base —porque ese ambiente no está aprovisionado o esa suite no existe aún—
- **THEN** eso no se declara como desvío de la base, y sigue siendo un pendiente que exigen las capabilities correspondientes

### Requirement: La base es la primera opción, no una jaula

Las piezas de entrega del marco SHALL poder codificar la base —sus workflows y
sus actions pueden asumir la topología fija, sin parámetros de topología
especulativos—, y las propiedades que esas piezas hacen cumplir SHALL quedar
enunciadas de forma independiente de ellas. Ninguna propiedad del marco SHALL
enunciarse de modo que solo la implementación de referencia pueda satisfacerla.

Un proyecto con un desvío aprobado de la capa de cómputo o de persistencia SHALL
seguir obligado por todas las propiedades del marco —la promoción con dev antes
que producción, las compuertas de CI, la serialización de los despliegues sobre
un ambiente compartido, la verificación de lo desplegado, la observabilidad y el
manejo de secretos— y SHALL ser dueño de su despliegue: deja de consumir la
implementación de referencia sin dejar de cumplir el contrato.

#### Scenario: Un proyecto no cabe en la topología fija
- **WHEN** un proyecto declara, con aprobación humana previa, un desvío de la capa de cómputo o de persistencia
- **THEN** deja de consumir las piezas de entrega del marco y despliega con las suyas
- **AND** su pipeline sigue obligado a las mismas propiedades: dev verificado antes que producción, despliegues serializados sobre el ambiente compartido, verificación de lo desplegado, y rollback a una versión anterior sin build nuevo

#### Scenario: El marco extrae una pieza de entrega nueva
- **WHEN** el marco convierte en pieza referenciada un tramo del despliegue que asume la topología de la base
- **THEN** puede hacerlo sin parámetros de topología, y la propiedad que esa pieza hace cumplir queda enunciada sin nombrarla, de modo que un proyecto con desvío aprobado pueda satisfacerla con su propio despliegue

#### Scenario: Un proyecto de la base no mantiene despliegue propio
- **WHEN** un proyecto usa la base sin desvíos
- **THEN** obtiene el despliegue por el carril referenciado del marco, y las correcciones de ese carril le llegan sin que toque una línea
