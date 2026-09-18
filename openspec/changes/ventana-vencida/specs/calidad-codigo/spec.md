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

La versión exigible SHALL ser la publicada, sin excepción: la fecha desde la que una
versión del canónico es exigible SHALL ser la de su publicación, y el marco SHALL
rechazar, antes de publicarla, una versión que declare otra, o que declare una fecha que
todavía no llegó. El marco se distribuye por
versión exacta, así que el aviso previo ya lo da el pull request de bump, que es donde el
cambio se lee antes de entrar; y el arreglo —regenerar el artefacto— está dentro del árbol
del propio repositorio. NO SHALL existir ninguna vía por la que un repositorio atrasado
termine en cero.

La porción del marco que cargan los agentes SHALL decir que un artefacto atrasado es un
fallo, y NO SHALL prometer un aviso previo: un agente que lee que el atraso avisa primero
trata el rojo del pull request de bump como algo que puede esperar.

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
- **WHEN** la porción del marco de un repositorio declara una versión anterior a la del canónico pinado
- **THEN** la verificación termina con código distinto de cero desde el día en que esa versión se publica, nombra las dos versiones y dice cómo regenerarla — no hay ninguna ventana de tiempo durante la cual el mismo estado pase

#### Scenario: El artefacto falta por completo
- **WHEN** un repositorio que consume el marco no tiene la porción de la constitución en su árbol
- **THEN** la verificación termina con código distinto de cero — no existe una rama de «este repositorio no aplica», porque el repositorio que no la tiene es precisamente el que hay que avisar

#### Scenario: Alguien editó el artefacto a mano
- **WHEN** la porción del marco difiere del resultado de regenerarla **y declara la misma versión** que el canónico pinado
- **THEN** la verificación lo reporta como edición a mano, nombrando el archivo, y termina con código distinto de cero — el mensaje NO manda a regenerar, porque regenerar borraría lo que esa persona quiso decir sin que nadie lo lea

#### Scenario: El artefacto no declara de qué versión salió
- **WHEN** la porción del marco de un repositorio no declara la versión del canónico que la generó
- **THEN** la verificación termina con código distinto de cero pidiendo regenerarla, porque sin ese dato no se puede distinguir un atraso de una edición a mano

#### Scenario: Un repositorio recién creado desde el andamio
- **WHEN** se verifica un repositorio cuya porción del marco se generó con la misma versión que tiene pinada, porque acaba de crearse
- **THEN** la verificación termina en cero y ningún hallazgo nombra una fecha de vencimiento — no hay nada pendiente que pueda vencer

#### Scenario: Una versión del canónico declara una fecha de exigibilidad distinta de su publicación
- **WHEN** el canónico que el marco se prepara a publicar declara, para alguna de sus versiones, una fecha de exigibilidad distinta de la de su publicación
- **THEN** la verificación del propio marco falla antes de publicar, nombrando la versión y las dos fechas, con el arreglo —igualarlas— escrito en el mensaje, porque una segunda fecha es una ventana de gracia reintroducida como dato

#### Scenario: Una versión del canónico declara una publicación futura
- **WHEN** el canónico que el marco se prepara a publicar declara, para alguna de sus versiones, una fecha posterior al día en curso, aunque la de exigibilidad sea igual a la de publicación
- **THEN** la verificación del propio marco falla antes de publicar, nombrando la versión y sus fechas, porque hasta esa fecha un repositorio atrasado terminaría en cero

#### Scenario: Un repositorio se crea desde un clon del marco que va adelante de su release
- **WHEN** la herramienta de arranque crea un repositorio desde un clon del marco cuyo canónico es más nuevo que la versión que el andamio le pina
- **THEN** la porción del marco del repositorio nuevo se genera con la versión pinada, la misma con la que su pipeline la verifica
- **AND** si el clon no trae esa versión, el repositorio se crea igual y la herramienta lo avisa nombrando la versión pinada, la del clon y el fallo que viene, con el comando que lo evita

#### Scenario: La porción del marco vuelve a prometer un aviso previo
- **WHEN** la regla de la porción del marco que habla del artefacto atrasado deja de decir que es un fallo, o vuelve a prometer un aviso antes del fallo
- **THEN** la verificación del propio marco falla antes de publicar, nombrando el archivo, porque esa regla es lo que el agente de cada proyecto lee en cada sesión
