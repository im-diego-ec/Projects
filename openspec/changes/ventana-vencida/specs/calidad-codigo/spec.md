# calidad-codigo — Delta

## ADDED Requirements

### Requirement: La porción del marco está al día o el pipeline lo dice como fallo

Un repositorio que consume el marco SHALL tener la porción de la constitución que le
corresponde **renderizada en su árbol** y coincidente con el canónico de la versión que
tiene pinada.

La verificación SHALL comparar el artefacto presente contra el resultado de **volver a
generarlo** desde ese canónico, y no contra un sello guardado junto al artefacto:
recomputar un sello es un `git commit` y cambiar el canónico no.

Un artefacto **ausente o atrasado** SHALL terminar con código distinto de cero **desde el
día en que la versión del canónico se publica**. El repositorio atrasado es exactamente
aquel al que hay que avisarle, y un aviso que no detiene nada es una regla que el proyecto
puede acumular durante semanas sin que nadie haya decidido acumularla.

La única excepción SHALL ser explícita, por versión y de quien publica: una versión del
canónico PUEDE declarar una fecha de exigibilidad posterior a su publicación, y hasta esa
fecha el atraso avisa en vez de detener. Esa declaración NO SHALL ser el tratamiento por
defecto —el marco se distribuye por versión exacta, así que el aviso previo ya lo da el PR
de bump, que es donde el cambio se lee antes de entrar— y la corrida SHALL nombrar el día
desde el cual el mismo estado es rojo. NO SHALL existir ninguna otra vía por la que un
repositorio atrasado termine en cero.

La verificación SHALL distinguir **atrasado** de **editado a mano** por la versión que el
propio artefacto declara, y SHALL decirlo en el mensaje. Las dos son fallos, pero el
arreglo es distinto: una se regenera, la otra se revierte. Un artefacto que NO declara de
qué versión salió SHALL ser un fallo, porque sin ese dato los dos casos son
indistinguibles.

Todo fallo SHALL traer el arreglo escrito y una forma de aplicarlo que no exija correr
nada a mano: la verificación SHALL dejar disponible el artefacto al día que produjo al
comparar.

#### Scenario: El artefacto coincide con el canónico de la versión pinada
- **WHEN** se verifica un repositorio cuya porción del marco es idéntica al resultado de regenerarla desde la versión que tiene pinada
- **THEN** la verificación termina en cero y nombra la versión y las superficies que comprobó

#### Scenario: El artefacto quedó atrás de la versión pinada
- **WHEN** la porción del marco de un repositorio declara una versión anterior a la del canónico pinado, y ninguna de las versiones que le faltan declara una fecha de exigibilidad futura
- **THEN** la verificación termina con código distinto de cero, nombra las dos versiones y dice cómo regenerarla — no hay ninguna ventana de tiempo durante la cual el mismo estado pase

#### Scenario: El artefacto falta por completo
- **WHEN** un repositorio que consume el marco no tiene la porción de la constitución en su árbol, y ninguna versión del canónico declara una fecha de exigibilidad futura
- **THEN** la verificación termina con código distinto de cero — no existe una rama de «este repositorio no aplica», porque el repositorio que no la tiene es precisamente el que hay que avisar

#### Scenario: Alguien editó el artefacto a mano
- **WHEN** la porción del marco difiere del resultado de regenerarla **y declara la misma versión** que el canónico pinado
- **THEN** la verificación lo reporta como edición a mano, nombrando el archivo, y termina con código distinto de cero — el mensaje NO manda a regenerar, porque regenerar borraría lo que esa persona quiso decir sin que nadie lo lea

#### Scenario: El artefacto no declara de qué versión salió
- **WHEN** la porción del marco de un repositorio no declara la versión del canónico que la generó
- **THEN** la verificación termina con código distinto de cero pidiendo regenerarla, porque sin ese dato no se puede distinguir un atraso de una edición a mano

#### Scenario: Un repositorio recién creado desde el andamio
- **WHEN** se verifica un repositorio cuya porción del marco se generó con la misma versión que tiene pinada, porque acaba de crearse
- **THEN** la verificación termina en cero sin nombrar ninguna fecha — no hay nada pendiente que pueda vencer

#### Scenario: Quien publica quiere estrenar un endurecimiento con aviso
- **WHEN** el artefacto está atrasado o ausente **y** la más antigua de las versiones que le faltan declara una fecha de exigibilidad todavía futura
- **THEN** hasta esa fecha la verificación avisa en vez de detener, la corrida nombra el día desde el cual el mismo estado es rojo, y pasada la fecha falla sin que nadie edite nada
