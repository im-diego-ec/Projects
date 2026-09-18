# calidad-codigo — deltas de el-andamio-nace-formateado

## ADDED Requirements

### Requirement: Un repositorio recién nacido del andamio pasa su propio formateador sin correrlo

El repositorio que el marco produce a partir del andamio SHALL pasar la
verificación de formato que el propio repositorio se exige, en cada combinación de
forma, plataforma y tipo de cuenta que la herramienta de arranque reparte, sin que
ningún paso lo formatee después de escribirlo. La propiedad SHALL sostenerse tanto
con valores más cortos que los marcadores que sustituyen como con valores largos
hasta un largo máximo que el marco declara y mide; por encima de ese largo, la
herramienta SHALL avisarlo con el comando que lo resuelve en vez de callarlo.

Lo que la herramienta de arranque escribe encima del andamio —el registro de los
valores del proyecto, sus desvíos, lo que queda al sacar un bloque que no
corresponde a la forma o a la plataforma elegidas— SHALL tener la forma que el
formateador le exige. Un paso posterior que formatee el repositorio puede
existir como red, pero ninguna garantía SHALL depender de él.

La versión del formateador con la que el marco mide el andamio SHALL ser
exactamente la que el repositorio nacido instala: el andamio SHALL declararla
exacta, y la medición SHALL derivarla de esa declaración en vez de escribirla por
separado.

#### Scenario: Un repositorio nacido por la vía que no formatea

- **WHEN** la herramienta de arranque arma un repositorio sin su paso de formateo, en cualquier forma, plataforma y tipo de cuenta
- **THEN** la verificación de formato del repositorio nacido termina en verde sin que nadie lo haya formateado

#### Scenario: Un valor que cambia el ancho de una línea

- **WHEN** el nombre del proyecto u otro valor sustituido tiene un largo distinto del marcador, hasta el largo máximo declarado
- **THEN** ninguna tabla ni línea de código del repositorio nacido queda con una forma que el formateador corregiría

#### Scenario: Un nombre de proyecto más largo que el medido

- **WHEN** el nombre del proyecto excede el largo máximo declarado y el repositorio se arma sin el paso de formateo
- **THEN** la herramienta avisa que la verificación de formato va a fallar y da el comando que lo resuelve

#### Scenario: El andamio declara un rango de versiones del formateador

- **WHEN** el andamio declara el formateador con un rango en vez de una versión exacta
- **THEN** la verificación del marco falla nombrando la declaración, porque cada repositorio nacido instalaría una versión que nadie midió

#### Scenario: La herramienta reescribe un archivo del proyecto

- **WHEN** la herramienta registra en el repositorio nacido los valores elegidos o los desvíos declarados
- **THEN** el archivo queda con la forma que el formateador del repositorio le exige

## MODIFIED Requirements

### Requirement: El formato acordado se verifica en cada integración

El formato de código acordado del repositorio SHALL verificarse en cada
integración, y una divergencia SHALL detener la integración.

La verificación SHALL correr también en las integraciones que solo cambian
documentación: el formato abarca la documentación del repositorio, y un cambio que
la desalinea y entra sin verificarse detiene después la integración de otra
persona, con una causa que no nombra al cambio que la introdujo. Que la
verificación se omita en alguna integración SHALL ser un fallo, no un verde.

La verificación SHALL excluir los archivos que otra herramienta genera y
regenera: un archivo generado obedece a la herramienta que lo produce y no al
formateador, de modo que exigirle el formato del repositorio produce un fallo
permanente sobre un archivo que ninguna persona escribió ni puede corregir.

#### Scenario: Un cambio con el formato divergente
- **WHEN** un cambio introduce código que no respeta el formato acordado del repositorio
- **THEN** la integración falla indicando el comando que lo corrige

#### Scenario: Un archivo generado por otra herramienta
- **WHEN** el repositorio versiona archivos que una herramienta genera y regenera
- **THEN** la verificación de formato no los evalúa

#### Scenario: Un cambio de solo documentación con el formato divergente
- **WHEN** un cambio que solo toca documentación introduce una tabla o un texto que no respeta el formato acordado
- **THEN** la integración falla igual que con un cambio de código, en vez de dejarlo entrar por el carril rápido

#### Scenario: La verificación de formato queda omitida
- **WHEN** la verificación de formato no corre en una integración, por una condición o una dependencia que la omite
- **THEN** el veredicto de la integración es un fallo que lo dice, no un verde
