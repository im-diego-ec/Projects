## ADDED Requirements

### Requirement: La herramienta de arranque lee el archivo de valores con la codificación que deje el shell

La herramienta que instancia el andamio SHALL leer el archivo de valores cuando empieza con
cualquiera de las marcas de orden de bytes que un shell de Windows puede poner —UTF-8,
UTF-16 little endian y UTF-16 big endian—, y SHALL decidirlo por los bytes del archivo, no
por el nombre de la codificación que informe otra herramienta. La marca SHALL quitarse antes
de interpretar el contenido, de modo que ninguna clave quede con ella adelante.

La tolerancia SHALL ser de codificación y no de contenido: un archivo cuyo contenido no es
un objeto válido SHALL seguir fallando con el error de sintaxis que lo describe.

#### Scenario: El archivo se escribió con una redirección de Windows PowerShell
- **WHEN** el archivo de valores empieza con la marca de orden de bytes de UTF-8, de UTF-16 little endian o de UTF-16 big endian
- **THEN** la herramienta lo lee y lo valida igual que si estuviera en UTF-8 sin marca, y sus claves son exactamente las escritas

#### Scenario: El contenido está roto de verdad
- **WHEN** el archivo trae la marca y un contenido que no es un objeto válido
- **THEN** la herramienta sale con error y el mensaje es el error de sintaxis del contenido, no una lectura silenciosa

### Requirement: La validación local de las definiciones de pipeline juzga con la versión del CI y declara cuándo su veredicto es más débil

El marco SHALL ofrecer un comando que valide las definiciones de pipeline en la máquina de
quien lo corre con la MISMA versión del validador que usa su CI, leída de la misma
declaración que lee el CI, y verificando la integridad del binario contra el release del
que se baja. Si no puede determinar esa versión, SHALL no correr en vez de elegir otra.

Cuando el validador no puede revisar los scripts que las definiciones ejecutan —porque falta
el revisor de scripts, o porque la plataforma lo cuelga—, el comando SHALL decirlo en su
salida y SHALL no presentar el resultado como el mismo veredicto del CI. SHALL tener un
límite de tiempo, y SHALL distinguir en su código de salida hallazgos de «no se pudo
correr».

El hook local que el marco reparte para antes del envío SHALL usar ese comando: con
hallazgos, SHALL detener el envío; si el comando no pudo correr, SHALL avisarlo y dejar
enviar, porque el CI corre la validación de todos modos.

#### Scenario: La versión del CI no se puede leer
- **WHEN** la declaración de la versión del validador falta o no trae una versión
- **THEN** el comando no corre ningún validador y sale indicando que no se pudo correr

#### Scenario: Falta el revisor de scripts
- **WHEN** el validador corre sin poder revisar los scripts de las definiciones
- **THEN** la salida lo declara y el resultado sin hallazgos no se presenta como definiciones válidas

#### Scenario: El hook con hallazgos y sin veredicto
- **WHEN** el comando encuentra hallazgos, o no puede correr
- **THEN** en el primer caso el hook detiene el envío, y en el segundo lo deja pasar con un aviso que dice que la validación no se corrió

### Requirement: La verificación final del bootstrap corre en cualquier shell y ve lo que todavía no tiene commit

El comando con el que la constitución del andamio manda verificar que no quedan marcadores
sin resolver SHALL correr igual en los shells que el marco ofrece para arrancar —POSIX,
PowerShell y la consola de Windows—, sin opciones propias de uno de ellos. SHALL encontrar
un marcador también en los archivos que todavía no tienen commit, porque se corre antes del
primero, y SHALL ignorar lo que el control de versiones excluye. SHALL no confundir con un
marcador la sintaxis que el proveedor de CI resuelve en cada corrida.

#### Scenario: Un marcador en un archivo sin commit
- **WHEN** se corre la verificación final antes del primer commit y un archivo sin commit conserva un marcador
- **THEN** la verificación lo lista, en vez de salir sin resultados

#### Scenario: Lo excluido y la sintaxis del CI
- **WHEN** un directorio excluido por el control de versiones trae dobles llaves de terceros, o un workflow usa la sintaxis de expresiones del proveedor de CI
- **THEN** la verificación no los lista
