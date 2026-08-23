# calidad-codigo — Delta

## ADDED Requirements

### Requirement: El scaffold entrega un repositorio que puede ponerse verde

El scaffold del marco SHALL entregar, junto con la mecánica de verificación, el
esqueleto de aplicación mínimo que esa mecánica necesita para tener algo que
verificar: los manifiestos de los paquetes, la configuración de sus herramientas
y el código que hace que el repositorio instale, construya y sirva.

Un repositorio recién nacido del scaffold SHALL poder instalar sus dependencias
de forma reproducible y atravesar en verde las compuertas del pipeline **sin
traer archivos de ningún otro repositorio**. Clonar un repositorio de referencia
aparte NO SHALL ser un paso del bootstrap: un esqueleto que vive fuera del marco
deriva de la mecánica que dice ejemplificar, y su abandono no produce ninguna
señal. Es un modo de falla medido, no una hipótesis.

Las tareas humanas que el scaffold deje pendientes SHALL ser únicamente las que
NO gatean el pipeline —las que exigen credenciales, permisos de organización o
una decisión de gobierno—. Un paso que hay que ejecutar para que la primera
corrida no salga roja SHALL viajar **hecho** en el andamio y no impreso como
instrucción: un requisito de compuerta que se cumple con memoria humana no es una
compuerta.

#### Scenario: Instalación reproducible en el repositorio recién nacido
- **WHEN** se instalan las dependencias con el lockfile congelado en un repositorio recién nacido del scaffold, sin haber copiado archivos de ningún otro repositorio
- **THEN** la instalación termina en cero — el lockfile es parte de lo que el bootstrap deja en el destino, no algo que alguien consiga después

#### Scenario: La primera corrida del pipeline, sin una sola edición
- **WHEN** se ejecuta el pipeline sobre el commit fundacional de un repositorio nacido del scaffold, sin que nadie haya editado un archivo ni pegado un fragmento que la herramienta imprimió
- **THEN** el veredicto es verde

#### Scenario: Un paso humano del camino por default que la primera corrida reclama
- **WHEN** el scaffold deja como instrucción impresa un paso que **todo** repositorio nuevo tiene que ejecutar —el camino por default, no el del proyecto que se aparta del esqueleto— para que su primera corrida no falle
- **THEN** la verificación del marco lo reporta como defecto del andamio, en vez de confiar en que alguien lo ejecute

#### Scenario: Una edición del andamio rompe la capacidad de ponerse verde
- **WHEN** una edición del andamio deja al repositorio nuevo sin poder terminar en verde: un script que desaparece de un manifiesto, un paquete que queda sin su configuración de cobertura, una excepción del pipeline que no corresponde a ningún paquete del workspace
- **THEN** la verificación del marco falla antes del merge nombrando la pieza, y no se descubre en el primer CI del próximo proyecto

#### Scenario: Un proyecto que se aparta del esqueleto por default
- **WHEN** un proyecto **se aparta** del esqueleto por default porque no necesita una de sus piezas —no tiene frontend, o no tiene suite E2E— y por eso retira ese paquete
- **THEN** el esqueleto restante sigue pudiendo ponerse verde: los lugares que nombraban al paquete retirado quedan enumerados en la salida del scaffold y, si alguna de esas declaraciones sobrevive al paquete, la verificación falla por declaración muerta en vez de pasar en silencio

### Requirement: Los scripts que el pipeline invoca nacen declarados con el nombre que el pipeline usa

El esqueleto SHALL declarar, en el manifiesto de cada paquete y en el de la raíz,
exactamente los scripts que la definición de pipeline del marco invoca, con los
nombres con que los invoca. La definición del pipeline y los manifiestos del
esqueleto son dos declaraciones del mismo hecho: su divergencia SHALL ser un
fallo de la verificación del propio marco y no un hallazgo del primer CI del
proyecto adoptante.

Los scripts de alcance de REPOSITORIO —lint y verificación de formato— SHALL
declararse en la raíz y correr una vez sobre todo el árbol, para que los archivos
que viven fuera de los paquetes queden dentro del alcance. Los de alcance de
PAQUETE SHALL declararse en cada paquete.

#### Scenario: Un script que el pipeline invoca y el esqueleto no declara
- **WHEN** la definición de pipeline del marco invoca un script que ningún manifiesto del esqueleto declara, o que el esqueleto declara con otro nombre
- **THEN** la verificación del marco falla nombrando el script, el manifiesto y el nombre esperado, antes de publicar la versión

#### Scenario: Los scripts de alcance de repositorio
- **WHEN** el pipeline invoca el lint o la verificación de formato desde la raíz del repositorio
- **THEN** el manifiesto de la raíz los declara y cada uno corre una vez sobre todo el árbol, incluidos los archivos que no pertenecen a ningún paquete

#### Scenario: Un paquete del esqueleto exento de un script, con su motivo
- **WHEN** un paquete del esqueleto legítimamente no puede declarar uno de los scripts que el pipeline exige —una suite E2E no corre en la verificación del cambio ni produce artefacto que servir—
- **THEN** la exención viaja declarada en la definición del pipeline con su motivo escrito, y una exención que no corresponde a ningún paquete del workspace es un fallo

### Requirement: La compuerta de cobertura llega cableada y el esqueleto no hereda deuda

Cada paquete del esqueleto que ejecute pruebas SHALL emitir su reporte de
cobertura en el formato que la compuerta del marco lee, y SHALL obtener sus
umbrales **extendiendo** la configuración de cobertura que el marco reparte en la
raíz, en vez de escribir los números por su cuenta. Un paquete que declara sus
propios umbrales termina fijando el número que la medición dio ese día, que es un
umbral que no exige nada.

El esqueleto NO SHALL nacer con deuda de cobertura declarada. La deuda es el
mecanismo de transición de un repositorio con historia, y un esqueleto no tiene
historia: transportarla en el andamio la vuelve la línea de partida de todo
proyecto futuro y le entrega un plazo que nadie de ese proyecto acordó. Lo que el
esqueleto no pueda cubrir con pruebas SHALL viajar como exclusión declarada con
su motivo escrito, o SHALL cubrirse.

Los archivos que el propio marco reparte y que ninguna prueba puede cubrir SHALL
traer su exclusión —con motivo— ya declarada en el manifiesto del repositorio
nuevo. El marco reclamando cobertura sobre archivos que él mismo puso, por un
paso que el humano tenía que recordar, es exactamente el modo de falla que este
requirement cierra.

#### Scenario: Las pruebas emiten el reporte que la compuerta lee
- **WHEN** se ejecuta el script de pruebas de un paquete del esqueleto
- **THEN** el reporte de cobertura queda emitido y la compuerta del total lo encuentra, en vez de fallar por ausencia de reporte

#### Scenario: Un paquete del esqueleto que no extiende la configuración del marco
- **WHEN** un paquete del esqueleto declara sus umbrales de cobertura por su cuenta en vez de extender la configuración que el marco reparte en la raíz
- **THEN** la verificación del marco lo reporta como fallo nombrando el paquete

#### Scenario: El esqueleto no nace endeudado
- **WHEN** se examinan los manifiestos de un repositorio recién nacido del scaffold
- **THEN** ninguno declara deuda de cobertura: cada paquete verificable alcanza el mínimo del marco, y lo que quedó fuera está declarado como exclusión con su motivo escrito

#### Scenario: Los archivos de configuración que el marco reparte
- **WHEN** el repositorio nace con los archivos de configuración que el propio marco reparte y que ninguna prueba puede cubrir
- **THEN** su exclusión ya está declarada, con su motivo, en el manifiesto del repositorio nuevo, y la primera corrida no la reclama

#### Scenario: La suite del esqueleto no depende de servicios externos
- **WHEN** se ejecuta la suite del esqueleto en una máquina sin base de datos ni ningún otro servicio externo levantado
- **THEN** termina en cero: el código que habla con servicios externos se prueba con dobles, o queda excluido con su motivo

## MODIFIED Requirements

### Requirement: Scripts de verificación sin enmascaramiento de fallo

Los scripts de verificación declarados en los manifiestos de los paquetes
SHALL propagar el código de salida real, sin sufijos ni envoltorios que
conviertan un fallo en éxito.

La verificación de integración SHALL detectar el enmascaramiento por sí misma:
un script que convierte un rojo en verde es, por construcción, invisible para
todo lo que dependa de su código de salida —incluido el pipeline—, así que la
única forma de atraparlo es examinar el script, no ejecutarlo.

El enmascaramiento SHALL detectarse también en los manifiestos que el MARCO
DISTRIBUYE, antes de que exista repositorio consumidor alguno. Un manifiesto del
andamio no lo mira ninguna integración —no hay pipeline que corra sobre el
andamio—, así que un script enmascarado ahí viaja a todo repositorio nuevo y se
descubre, si se descubre, cuando ya está en el árbol de cada uno. Y la forma del
enmascaramiento no se limita al sufijo que ignora el fallo: un modo de pruebas que
pasa sin haber ejecutado ninguna es el mismo fail-open con otra ropa, y queda
comprendido en esta garantía.

#### Scenario: Un fallo de lint se propaga al invocador
- **WHEN** el lint encuentra una violación al ejecutarse vía el script declarado del paquete
- **THEN** el proceso invocador (incluido CI) recibe un código de salida distinto de 0

#### Scenario: Un script de verificación que enmascara su fallo
- **WHEN** un script de verificación declarado en un manifiesto **de un repositorio ya instanciado** convierte un fallo en éxito mediante un sufijo o un envoltorio
- **THEN** la verificación de integración falla señalando el manifiesto, el script y el arreglo concreto

#### Scenario: Un manifiesto que el marco distribuye trae el enmascaramiento
- **WHEN** un manifiesto **del andamio** —que ninguna integración examina, porque el marco no tiene pipeline que corra sobre él— declara un script que convierte un fallo en éxito, o un modo de pruebas que pasa sin haber ejecutado ninguna
- **THEN** la verificación del propio marco lo reporta como fallo antes de publicar la versión, nombrando el manifiesto y el script

### Requirement: Un repositorio nacido del scaffold no conserva marcadores sin resolver

Un repositorio que adoptó el scaffold del marco SHALL quedar libre de los
marcadores que el scaffold emite para señalar lo que hay que completar
—sustituciones pendientes y huecos de decisión—, y CI SHALL fallar mientras
alguno sobreviva.

La verificación SHALL comprobar la ausencia de esos marcadores, no la corrección
de los valores que los reemplazaron: validar que un identificador exista o que
corresponda al proyecto exige credenciales y contexto que CI no tiene, y su falso
positivo bloquearía integraciones legítimas.

Este requirement existe porque el modo de falla es silencioso: un marcador sin
sustituir en el archivo de propietarios de código no produce error alguno —
simplemente no asigna revisores, y el review cruzado que el marco promete
desaparece sin ruido desde el primer día del proyecto.

El andamio NO SHALL usar marcadores en RUTAS —nombres de archivo o de
directorio—, y la verificación del propio marco SHALL reportarlo como fallo del
andamio si aparece uno. La instanciación sustituye el CONTENIDO de los archivos y
copia las rutas tal cual, y el control de marcadores sobrevivientes lee ese mismo
contenido: un marcador en un nombre de directorio sobrevive intacto **y la
herramienta declara «cero marcadores sobrevivientes»**. Es el peor de los dos
mundos —el repositorio nace roto y el control firma que está bien— y se vuelve
alcanzable recién ahora, cuando el andamio empieza a traer paquetes que viven en
directorios.

#### Scenario: El bootstrap quedó a medias
- **WHEN** un repositorio conserva un marcador del scaffold sin resolver
- **THEN** el pipeline falla indicando el archivo y el marcador pendiente

#### Scenario: Sintaxis parecida que no es un marcador
- **WHEN** el repositorio usa legítimamente una sintaxis similar que el proveedor de CI resuelve en cada corrida
- **THEN** la verificación no la confunde con un marcador pendiente

#### Scenario: Un marcador en el nombre de un archivo o de un directorio
- **WHEN** el andamio usa un marcador en una RUTA —nombre de archivo o de directorio— en vez de dentro del contenido de un archivo
- **THEN** la verificación del propio marco lo reporta como fallo del andamio, y no espera al repositorio nuevo, donde ese marcador sobreviviría en el nombre y el control de marcadores pasaría en verde
