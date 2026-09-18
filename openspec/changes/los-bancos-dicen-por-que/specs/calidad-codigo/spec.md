# calidad-codigo — deltas de los-bancos-dicen-por-que

## ADDED Requirements

### Requirement: Una aserción que falla muestra lo que miró

Cuando una aserción de un banco del marco falle, su salida SHALL mostrar la evidencia
sobre la que decidió, además del motivo. Un mensaje que REEMPLAZA la evidencia en vez de
acompañarla NO SHALL entrar en un banco que un cambio toca: el pipeline del marco SHALL
ponerse rojo señalando el archivo, la línea y el arreglo.

La exigencia SHALL acotarse a los bancos que el cambio toca, y a esos enteros. La deuda
del resto del árbol SHALL publicarse en cada corrida y NO SHALL bloquear: un rojo sobre
toda la deuda heredada no se puede cerrar, y un rojo que no se puede cerrar se destraba
escribiendo con apuro.

La comprobación SHALL contar solo las aserciones que el programa ejecuta —no las que
aparecen citadas en una cadena o en un comentario— y NO SHALL perder de vista las que
vienen después de una cadena o de una expresión regular. Cuando no pueda leer el
cambio, NO SHALL declararse verde.

#### Scenario: Un cambio deja una aserción que tapa su evidencia

- **WHEN** un pull request deja, en un banco que toca, una aserción cuyo mensaje reemplaza la evidencia
- **THEN** el pipeline falla nombrando el archivo, la línea y el arreglo

#### Scenario: Un cambio toca un banco limpio en un árbol con deuda

- **WHEN** los bancos que el pull request toca no tienen ninguna aserción así, aunque otros bancos del árbol sí
- **THEN** el pipeline no falla por eso, y publica cuántas quedan en el árbol

#### Scenario: Una aserción citada como texto, y la que viene después

- **WHEN** un banco cita una aserción dentro de una cadena o de un comentario, y más abajo tiene una aserción real después de una expresión regular con comillas
- **THEN** la comprobación no cuenta la citada y sí cuenta la real

#### Scenario: El cambio no se pudo leer

- **WHEN** la comprobación no puede resolver la base o la cabeza del pull request
- **THEN** falla diciendo que no pudo medir, en vez de declararse verde

### Requirement: El veredicto de un banco no depende de la máquina que lo corre

Un banco del marco SHALL dar el mismo veredicto sobre el mismo árbol en cualquier
máquina. Los repositorios temporales que un banco arma SHALL declarar en su propia
configuración lo que decide su resultado —la identidad, la firma de commits y la firma
de etiquetas— en vez de heredarlo de la configuración global de quien corre el banco.

#### Scenario: Una máquina que firma las etiquetas

- **WHEN** quien corre el banco tiene activada la firma de etiquetas en su configuración global
- **THEN** el repositorio temporal crea una etiqueta sin pedir mensaje ni clave, y el banco da el mismo veredicto que en CI

#### Scenario: La propiedad, y no solo su efecto

- **WHEN** un banco arma un repositorio temporal
- **THEN** la configuración local de ese repositorio declara apagadas la firma de commits y la de etiquetas

### Requirement: Una intermitencia se mide con un instrumento que distingue su propio entorno

El marco SHALL ofrecer un instrumento que repita un banco la cantidad de veces que se le
pida, en el mismo entorno y en la misma invocación con que lo corre su CI, y que cuente
las fallas. Los patrones con que el instrumento junta los bancos SHALL ser los del CI, y
una divergencia entre los dos SHALL poner rojo el pipeline del marco.

Antes de contar, el instrumento SHALL correr una vuelta de línea de base. Si esa vuelta
ya falla, SHALL declarar que está midiendo su propio entorno y NO SHALL contar ninguna
vuelta como reproducción. Cada vuelta SHALL dejar en el registro el acumulado de fallas,
para que una corrida cortada siga siendo una medición. Un resultado sin fallas SHALL
declararse como cota —no apareció en esa cantidad de vueltas— y no como ausencia.

#### Scenario: La línea de base ya está roja

- **WHEN** el banco falla en la vuelta de línea de base
- **THEN** el instrumento termina en rojo diciendo que mide su propio entorno, y no cuenta ninguna vuelta

#### Scenario: El banco falla de forma intermitente

- **WHEN** la línea de base pasa y alguna vuelta posterior falla
- **THEN** el instrumento termina en rojo, y el registro muestra por vuelta cuántas fallas lleva

#### Scenario: El banco no falla en ninguna vuelta

- **WHEN** todas las vueltas pasan
- **THEN** el instrumento termina en verde y su resumen dice que eso es una cota y no la ausencia de intermitencia

#### Scenario: Una cantidad de vueltas que no es un entero positivo

- **WHEN** se le pide una cantidad de vueltas que no es un entero positivo
- **THEN** el instrumento falla sin correr nada, en vez de reportar cero fallas sobre cero vueltas

#### Scenario: El CI cambia cómo junta sus bancos

- **WHEN** el CI cambia un patrón con que junta los bancos y el instrumento no
- **THEN** el pipeline del marco falla mostrando los patrones de los dos

### Requirement: Un predicado que vive en dos lugares se ata por comportamiento

A veces el mismo predicado tiene que existir en dos piezas que no pueden compartir
código, porque una de ellas corre en el árbol del consumidor sin el código del marco a
mano. En ese caso, un banco del marco SHALL comparar los veredictos de las dos piezas
sobre una tabla de entradas como las que escribe una persona, y cualquier discrepancia
SHALL poner rojo el pipeline. La comparación SHALL ser de comportamiento y no de texto.
La tabla SHALL contener entradas que las dos piezas aceptan y entradas que las dos
rechazan.

#### Scenario: Las dos piezas discrepan sobre una entrada

- **WHEN** una pieza acepta una entrada de la tabla que la otra rechaza
- **THEN** el pipeline falla nombrando la entrada y el veredicto de cada pieza

#### Scenario: Las dos piezas se escriben distinto y deciden igual

- **WHEN** el texto de las dos definiciones difiere pero su veredicto coincide en toda la tabla
- **THEN** el pipeline no falla

#### Scenario: Un aviso que habla por la otra pieza

- **WHEN** una pieza avisa que la otra da por error una entrada
- **THEN** la otra pieza efectivamente da por error esa entrada

### Requirement: Un banco recibe el script del paso que pidió

El extractor que le entrega a un banco el script de un paso de un workflow SHALL
devolver el script de ese paso o negarse. NO SHALL devolver el de otro paso, cualquiera
sea la clave con que empiece el paso siguiente, ni el de un paso de otro job.

#### Scenario: El paso pedido no tiene script y el siguiente sí

- **WHEN** se pide el script de un paso sin bloque de comandos propio, y lo sigue un paso sin nombre que sí lo tiene
- **THEN** el extractor se niega, en vez de devolver el script del vecino

#### Scenario: El último paso de un job no tiene script

- **WHEN** se pide el script del último paso de un job, y ese paso no tiene bloque de comandos
- **THEN** el extractor se niega, en vez de devolver el del job siguiente

### Requirement: Un comando del pipeline no pierde sus argumentos en silencio

Cuando una línea de un bloque de comandos del pipeline continúa en la siguiente, la
siguiente SHALL ser una línea de comando. Un comentario o una línea vacía entre las dos
SHALL poner rojo el pipeline del marco, aunque el intérprete acepte el bloque como
válido.

#### Scenario: Un comentario entre un comando y sus argumentos

- **WHEN** un bloque de comandos tiene una línea que continúa en la siguiente, y después viene un comentario o una línea vacía
- **THEN** el pipeline del marco falla nombrando el archivo y la línea, aunque la validación de sintaxis pase

#### Scenario: Lo que parece continuación y no lo es

- **WHEN** la barra final pertenece a un comentario o está escapada
- **THEN** el pipeline no falla por eso
