# gobierno-contribucion — Delta

## ADDED Requirements

### Requirement: Las reglas del marco llegan íntegras a los agentes de cada proyecto

El marco SHALL mantener su porción de la constitución como un artefacto generado
desde una fuente única y entregarlo a cada repositorio consumidor.

El pipeline del repositorio consumidor SHALL rechazar el repositorio cuando ese
artefacto falte, esté atrasado respecto de la versión exigible del marco, difiera
del texto que el marco publica para esa versión, o no esté cargado por alguna de
las superficies de instrucciones que el repositorio declara para sus agentes.

Una versión nueva de la porción del marco SHALL llegar al repositorio dentro del
pull request que propone subir su pin a esa versión, abierto sin intervención
humana por el canal de dependencias del propio repositorio, de modo que el camino
normal no dependa de que alguien recuerde ejecutar nada. Mientras ese pull request
no se integre, el repositorio SHALL seguir verificándose contra la versión que
tiene pinada: nada de la porción del marco cambia bajo sus pies sin un pull request
que alguien pueda leer. El atraso SHALL ser un fallo desde el día en que la versión
se publica, y por eso aparece dentro de ese pull request y antes de llegar a la
rama de integración. La versión exigible SHALL ser la publicada, sin excepción:
ninguna versión SHALL declarar una fecha de exigibilidad posterior a su
publicación, porque el arreglo —regenerar el artefacto— está dentro del árbol del
propio repositorio y el aviso previo ya lo da ese pull request.

Un proyecto SHALL poder apartarse de una regla declarando el desvío con la regla
que anula y su motivo escrito; el desvío SHALL quedar impreso junto a esa regla
dentro del mismo artefacto que los agentes cargan, y SHALL caducar —volviéndose
un fallo— cuando la regla que anulaba deje de existir. Una excepción que el
agente no lee es peor que la ausencia de la regla: deja al agente cumpliendo a
rajatabla algo que el proyecto ya anuló, o leyendo una prohibición y una
autorización sin saber cuál manda.

La comparación SHALL ser sobre el contenido y no sobre su presentación: las
diferencias que introducen el formateador del repositorio o el fin de línea del
entorno de trabajo NO SHALL contar como divergencia, y el artefacto SHALL quedar
fuera del alcance del formateador del proyecto, igual que el resto de lo que una
herramienta genera y regenera.

Lo que el repositorio escribe fuera de ese artefacto es del proyecto, y el marco
NO SHALL modificarlo.

#### Scenario: Una regla nueva llega sin que el proyecto la escriba
- **WHEN** el marco publica una versión con una regla nueva y un repositorio consumidor no modifica una sola línea
- **THEN** en el repositorio se abre solo un pull request que sube el pin a esa versión, y dentro de ese pull request el pipeline falla nombrando la versión que declara el artefacto y la que publica el marco, con el arreglo escrito en el mensaje
- **AND** mientras ese pull request no se integre, el pipeline de la rama de integración sigue verificando contra la versión pinada y no cambia de veredicto por la publicación

#### Scenario: El artefacto existe y ningún agente lo carga
- **WHEN** el artefacto está en el repositorio pero la superficie de instrucciones que el proyecto declara no lo referencia —o lo referencia dentro de un ejemplo de código, donde la referencia no se resuelve—
- **THEN** el pipeline falla nombrando el eslabón roto, porque un enlace de carga roto no emite ninguna señal por sí mismo y es indistinguible de que la regla nunca haya existido

#### Scenario: Alguien edita a mano la porción del marco
- **WHEN** el contenido del artefacto difiere del texto que el marco publica para la versión que el propio artefacto declara
- **THEN** el pipeline falla imprimiendo la diferencia, e indica que lo propio del proyecto va en su propio archivo y que una diferencia legítima se declara como desvío con su motivo

#### Scenario: El proyecto se aparta de una regla, con razón
- **WHEN** el proyecto declara un desvío nombrando la regla que anula, quién lo aprobó y su motivo escrito
- **THEN** el pipeline pasa, el desvío queda impreso junto a esa regla dentro del artefacto que los agentes cargan, y su motivo se reimprime en el resumen de cada corrida
- **AND** cuando una versión posterior del marco elimina esa regla, el pipeline falla por desvío muerto, con el motivo que tenía escrito en el mensaje

#### Scenario: Una diferencia que no es divergencia
- **WHEN** la única diferencia entre el artefacto y el texto publicado proviene del formateador del repositorio o del fin de línea del entorno de trabajo
- **THEN** el pipeline no la reporta como divergencia
- **AND** el artefacto queda fuera del alcance del formateador del proyecto, por la misma razón y con el mismo mecanismo con que ya lo están los artefactos que regenera el CLI de OpenSpec
