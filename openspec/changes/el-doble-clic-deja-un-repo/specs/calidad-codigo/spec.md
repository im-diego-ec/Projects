# calidad-codigo — deltas de el-doble-clic-deja-un-repo

## ADDED Requirements

### Requirement: El arranque de doble clic entrega un repositorio, no una carpeta

Cuando una persona arranca un proyecto con el lanzador de doble clic del marco,
el destino SHALL quedar como un repositorio propio —no el de una carpeta de
arriba— en la rama principal de integración.

El primer guardado SHALL hacerse solo cuando se cumplan las dos condiciones:
la identidad de quien guarda está configurada explícitamente, y el proyecto quedó
completo y con su verificación local en verde. El marco NO SHALL guardar con una
identidad que la herramienta de control de versiones deduzca por su cuenta: ese
guardado, una vez publicado, no queda a nombre de nadie.

Cuando una de las dos condiciones falta, la herramienta SHALL decirlo como aviso,
con el motivo y los comandos exactos para completar el paso después. Un destino
que ya era un repositorio con historia NO SHALL recibir guardados ni publicarse
por esta vía: esa historia no la armó el arranque.

#### Scenario: El doble clic termina con todo en orden

- **WHEN** el lanzador termina de armar un proyecto en verde en una máquina con la identidad configurada
- **THEN** el destino tiene su propio repositorio, en la rama principal, con un primer guardado a nombre de esa identidad

#### Scenario: La máquina no tiene identidad configurada

- **WHEN** el lanzador termina de armar el proyecto y la identidad no está configurada
- **THEN** el destino queda como repositorio sin guardados, y la salida avisa el motivo y los comandos para configurarla y guardar

#### Scenario: El proyecto no quedó en verde

- **WHEN** la verificación local no corrió o no terminó en verde
- **THEN** no hay primer guardado, y el aviso dice por qué publicarlo así estrenaría el repositorio en rojo

#### Scenario: El destino ya tenía historia

- **WHEN** el destino ya era un repositorio con guardados previos
- **THEN** la herramienta no agrega guardados ni lo publica

#### Scenario: La invocación de antes queda detectada

- **WHEN** el banco ejecuta el arranque sin pedir el repositorio
- **THEN** comprueba que el destino queda sin repositorio, de modo que el caso rojo del defecto sigue demostrado

### Requirement: Crear el repositorio remoto exige la confirmación explícita de la persona

Crear el repositorio del proyecto en el proveedor de código es la única acción del
arranque visible desde afuera, y SHALL ocurrir solo si la persona la confirma
escribiendo una respuesta afirmativa. Una respuesta vacía, cualquier otra
respuesta o la falta de una terminal donde preguntar NO SHALL crear nada, y la
salida SHALL dejar el comando exacto para hacerlo después.

La visibilidad del repositorio SHALL ser la que la persona ya eligió; si no la
eligió, SHALL preguntarse antes de confirmar. SHALL existir un modo que deja el
repositorio solo en la máquina sin consultar al proveedor.

La herramienta NO SHALL crear ni publicar sobre un nombre que ya existe, y NO SHALL
dar el repositorio por publicado a partir del código de salida del programa que lo
crea: SHALL comprobar en el disco que el remoto existe y que la rama principal
remota apunta al mismo guardado que la local. Cuando falte el programa que habla
con el proveedor o su sesión, SHALL decirlo como aviso con el arreglo escrito.

#### Scenario: La persona confirma

- **WHEN** hay sesión con el proveedor, el nombre está libre y la persona escribe una respuesta afirmativa
- **THEN** se crea el repositorio con la visibilidad elegida, la rama principal queda publicada y la salida lo afirma después de comprobarlo en el disco

#### Scenario: La persona aprieta Enter o dice que no

- **WHEN** la respuesta a la confirmación no es afirmativa
- **THEN** no se crea nada afuera y la salida deja el comando exacto para hacerlo cuando quiera

#### Scenario: No hay terminal donde preguntar

- **WHEN** la corrida no tiene una terminal interactiva
- **THEN** no se crea nada afuera, aunque haya sesión, y la salida lo avisa

#### Scenario: Falta el programa o la sesión

- **WHEN** no está el programa que habla con el proveedor o no tiene una sesión abierta
- **THEN** no se crea nada, y el aviso dice cómo instalarlo o abrir la sesión y qué comando correr después

#### Scenario: El nombre ya existe

- **WHEN** el repositorio con ese nombre ya existe en el proveedor
- **THEN** no se crea ni se publica encima, y la salida explica cómo conectarlo si está vacío

#### Scenario: El programa dice que salió bien y no hizo nada

- **WHEN** el programa que crea el repositorio sale con éxito pero no quedó remoto o la rama no quedó publicada
- **THEN** la herramienta no lo da por publicado y lo avisa

#### Scenario: El modo solo local

- **WHEN** la persona pide el repositorio solo en su máquina
- **THEN** el programa que habla con el proveedor no se invoca y la salida deja el comando para publicarlo después

### Requirement: Lo que la herramienta de arranque dice del primer envío sale de medir el destino

La lista de lo que sigue que imprime la herramienta de arranque SHALL describir el
estado del destino que midió —carpeta sin repositorio, repositorio sin remoto,
repositorio publicado por esa misma corrida, o repositorio con remoto cuyo primer
envío queda a cargo de la persona— y SHALL dar, para cada caso, los comandos que
faltan. NO SHALL afirmar un envío directo a la rama principal sobre un destino que
no tiene repositorio ni remoto, ni SHALL dar por enviado un contenido que esa
corrida no guardó ni publicó.

#### Scenario: El destino no es un repositorio

- **WHEN** el arranque termina sobre una carpeta sin repositorio
- **THEN** la lista lo dice y trae los comandos para crearlo, guardarlo y publicarlo

#### Scenario: La corrida ya publicó

- **WHEN** esa misma corrida creó y publicó el repositorio
- **THEN** la lista no pide un primer envío y dice cómo enviar lo que falta completar

#### Scenario: Un checkout del proveedor con el andamio sin guardar

- **WHEN** el destino es un repositorio clonado cuya rama local coincide con la remota y el andamio recién escrito no se guardó
- **THEN** la lista no afirma que el primer envío ya está hecho

### Requirement: La guía acompañada separa el camino del doble clic del camino a mano

La guía para quien arranca sin ser técnico SHALL distinguir el camino del
lanzador de doble clic del camino a mano, y SHALL decirle a quien usó el lanzador
qué pasos ya hizo el lanzador y dónde retomar. La guía NO SHALL remitir a
instrucciones que ningún paso da, NO SHALL afirmar sin condición algo que uno de
los dos caminos contradice, y SHALL citar tal cual las frases que la herramienta
imprime para la confirmación y para el éxito de la publicación.

#### Scenario: Quien usó el doble clic llega al paso de crear el repositorio

- **WHEN** alguien que usó el lanzador lee el paso que crea el repositorio a mano
- **THEN** la guía le dice que el lanzador ya lo hizo y en qué paso seguir

#### Scenario: La herramienta cambia la frase que la guía cita

- **WHEN** la frase de confirmación o la de éxito que imprime la herramienta deja de coincidir con la que cita la guía
- **THEN** el banco de la guía falla
