# calidad-codigo — deltas de el-andamio-nace-instalable

## ADDED Requirements

### Requirement: Todo camino de nacimiento deja el lockfile que la integración del repositorio exige

Cada camino por el que el marco produce un repositorio a partir del andamio SHALL dejar,
antes de su primer guardado, el archivo que fija las versiones exactas de sus
dependencias, resuelto para la forma y la plataforma elegidas. La integración que el
andamio reparte instala con ese archivo congelado, así que un repositorio guardado sin él
nace con su primera integración en rojo por algo que quien lo recibe no escribió.

Un camino que no puede producir ese archivo SHALL fallar sin guardar el repositorio y
SHALL decir la causa y cómo se arregla. Un camino que resuelve ese archivo con una
credencial capaz de escribir en el repositorio NO SHALL ejecutar código de las
dependencias para hacerlo.

La propiedad SHALL sostenerse para cualquier forma y plataforma que el andamio reparte,
aunque cada una instale un conjunto distinto de dependencias.

#### Scenario: El repositorio que nace por la vía sin programas

- **WHEN** una persona arma su proyecto desde un repositorio plantilla, sin programas instalados
- **THEN** el primer guardado del proyecto incluye el archivo de versiones de sus dependencias, y la primera integración instala con ese archivo congelado sin fallar por su ausencia

#### Scenario: La resolución de versiones falla o no deja el archivo

- **WHEN** el paso que resuelve las versiones termina con error, o termina sin error y sin dejar el archivo, o lo deja vacío
- **THEN** el camino falla antes de guardar nada, y su mensaje dice qué pasó y cómo se arregla

#### Scenario: La resolución corre con una credencial que puede escribir

- **WHEN** el camino resuelve las versiones dentro de un proceso cuya credencial puede escribir en el repositorio
- **THEN** la resolución no descarga el árbol de dependencias ni ejecuta ninguno de sus scripts de instalación

#### Scenario: El arranque de la herramienta no corre

- **WHEN** la herramienta de arranque escribe el repositorio sin instalar sus dependencias, porque se le pidió o porque no tiene con qué
- **THEN** lo avisa diciendo que falta el archivo de versiones y con qué comando se produce, y no guarda el repositorio como si estuviera listo

### Requirement: El cliente de datos generado existe en cuanto se instalan las dependencias

Un repositorio nacido del andamio con capa de datos SHALL generar el cliente de esa capa
como parte de instalar sus dependencias, con el mismo comando que usa su verificación,
de modo que cualquier comprobación que lea los tipos de ese cliente funcione después de
instalar sin un paso que haya que recordar. Un repositorio cuya forma no tiene capa de
datos NO SHALL recibir ese paso.

El alcance es el del andamio, que un repositorio recibe una sola vez, al nacer:
SHALL cumplirlo todo repositorio que nace de un andamio que ya lo trae. Uno nacido
antes no lo recibe sin copiarlo, el marco NO SHALL afirmar que lo cumple, y la nota
de la versión que lo introduce SHALL decirle qué copiar para adoptarlo.

Cuando el proyecto no genera cliente de datos, la herramienta de arranque SHALL nombrar
en su salida cada lugar del repositorio donde viaja ese comando, y la verificación del
marco SHALL fallar si el andamio lleva el comando a un lugar que esa salida no nombra.

#### Scenario: Instalar y verificar sin generar a mano

- **WHEN** alguien clona un repositorio con capa de datos, instala sus dependencias y corre el análisis estático o la verificación de tipos
- **THEN** ninguna de las dos falla por un cliente de datos sin generar

#### Scenario: El paso de instalación y el de verificación divergen

- **WHEN** el andamio genera el cliente al instalar con un comando distinto del que usa su verificación, o deja de generarlo al instalar
- **THEN** la verificación del marco falla nombrando el paquete y el comando esperado

#### Scenario: Una forma sin capa de datos

- **WHEN** el repositorio nace con una forma que no tiene capa de datos
- **THEN** ni su instalación ni su integración intentan generar un cliente de datos

#### Scenario: Un proyecto que no genera cliente de datos

- **WHEN** el andamio lleva el comando de generación a un archivo que la salida de la herramienta no nombra en el camino «sin cliente de datos»
- **THEN** la verificación del marco falla nombrando ese archivo

#### Scenario: Un repositorio con capa de datos nacido antes

- **WHEN** un repositorio con capa de datos nació de un andamio que no generaba el cliente al instalar
- **THEN** la nota de la versión que lo introduce le dice qué línea agregar para adoptarlo, y el marco no afirma que ese repositorio lo cumple

### Requirement: La integración ofrece el motor de datos real y una sola base lo nombra

Un repositorio nacido del andamio con capa de datos SHALL disponer, durante la ejecución
de su suite en la integración, de una instancia real del motor de datos, de la misma
versión que la que el andamio levanta para el desarrollo local, y SHALL exponer a las
pruebas la conexión a esa instancia a nivel de todo el trabajo que las corre, no de un
paso. Una prueba que pasa contra otro motor traslada el defecto en vez de cazarlo.

La instancia SHALL declarar un chequeo de salud, y la suite NO SHALL comenzar antes de
que ese chequeo pase.

El servicio que levanta la integración y la conexión con la que corren las pruebas SHALL
nombrar la misma base, derivada de la identidad del repositorio y no de un literal; el
entorno de desarrollo local y el ejemplo de configuración que el andamio reparte SHALL
nombrar la misma base, derivada del nombre del proyecto. Todo lugar del andamio que
nombre una base de datos SHALL estar declarado como uno de esos lugares comparados o
con el motivo por el que no nombra la base del proyecto, y la verificación del marco
SHALL fallar cuando alguno diverja o aparezca sin declarar.

La unicidad se verifica porque su incumplimiento no da error: un cliente de datos que
encuentra ausente la base nombrada la crea vacía y sigue, de modo que las pruebas
correrían contra una base distinta de la que el proyecto usa, sin una sola señal.

El alcance es el del andamio, que un repositorio recibe una sola vez, al nacer:
SHALL cumplirlo todo repositorio que nace de un andamio que ya lo trae. Uno nacido
antes no lo recibe sin copiarlo, el marco NO SHALL afirmar que lo cumple, y la nota
de la versión que lo introduce SHALL decirle qué copiar para adoptarlo.

#### Scenario: La suite dispone de una instancia real del motor de datos

- **WHEN** la integración de un repositorio con capa de datos ejecuta su suite
- **THEN** existe una instancia del motor de datos alcanzable por las pruebas, de la misma versión que la del desarrollo local, y la conexión a esa instancia está disponible para todo el trabajo que corre las pruebas

#### Scenario: La suite espera a que el motor esté listo

- **WHEN** la corrida arranca y el motor todavía no acepta conexiones
- **THEN** la suite no comienza hasta que el chequeo de salud del motor pasa

#### Scenario: El servicio y la conexión nombran bases distintas

- **WHEN** el servicio de la integración y la conexión de las pruebas nombran bases distintas, o la base del servicio deja de derivarse de la identidad del repositorio
- **THEN** la verificación del marco falla, y su mensaje dice que el desajuste produciría una base creada en silencio y pruebas corriendo contra algo distinto de lo que el servicio levantó

#### Scenario: Un lugar nuevo nombra una base sin estar declarado

- **WHEN** un archivo del andamio nombra una base de datos y no está declarado como lugar comparado ni con su motivo
- **THEN** la verificación del marco falla nombrando el archivo

#### Scenario: Una forma sin capa de datos

- **WHEN** el repositorio nace con una forma que no tiene capa de datos
- **THEN** su integración no levanta ningún motor de datos ni declara una conexión a uno

#### Scenario: Una integración con capa de datos nacida antes

- **WHEN** un repositorio con capa de datos nació de un andamio cuya integración no levantaba el motor de datos
- **THEN** la nota de la versión que lo introduce le dice qué bloque copiar para adoptarlo, y el marco no afirma que ese repositorio lo cumple

### Requirement: El corredor de pruebas y su proveedor de cobertura se declaran como un par

Cada paquete del andamio que declara el corredor de pruebas SHALL declarar también su
proveedor de cobertura, con exactamente el mismo rango de versiones, y todos los paquetes
del andamio SHALL declarar el mismo rango. El corredor exige su proveedor en su misma
versión exacta: dos rangos distintos resuelven versiones distintas el día que sale una,
y una configuración de cobertura compartida corre en versiones que nadie midió juntas.

#### Scenario: El proveedor de un paquete se desalinea del corredor

- **WHEN** un paquete del andamio declara el proveedor de cobertura con un rango distinto del corredor, o no lo declara
- **THEN** la verificación del marco falla nombrando el paquete y cómo se arregla

#### Scenario: Dos paquetes declaran rangos distintos del corredor

- **WHEN** dos paquetes del andamio declaran el corredor de pruebas con rangos distintos
- **THEN** la verificación del marco falla nombrando los paquetes y sus rangos

### Requirement: Ningún archivo fuente del andamio enrojece la compuerta de cobertura

Cada archivo fuente que el andamio reparte SHALL estar en una de tres situaciones:
excluido con motivo por el paquete que lo contiene; dentro del alcance de cobertura de su
paquete y ejecutado por alguna prueba de ese paquete que lo importe; o fuera de ese
alcance y juzgado por la compuerta de cobertura real, corriendo sobre su contenido, como
algo que no exige cobertura. Una exclusión que no corresponde a ningún archivo del
andamio SHALL ser un fallo. La verificación SHALL fallar también cuando no alcanzó a
juzgar ningún archivo con la compuerta real, porque «ninguno enrojece» sería cierto por
vacuidad.

#### Scenario: Un fuente dentro del alcance sin prueba que lo ejerza

- **WHEN** un archivo fuente del andamio cae dentro del alcance de cobertura de su paquete y ninguna prueba del paquete lo importa
- **THEN** la verificación del marco falla nombrando el archivo, porque nacería en cero y bajaría el total del paquete

#### Scenario: Una prueba vacía o una importación solo de tipos

- **WHEN** la única prueba que nombra a un archivo está vacía, o lo importa solo por sus tipos
- **THEN** ese archivo no cuenta como ejercido

#### Scenario: Un archivo ejecutable fuera del alcance y sin exclusión

- **WHEN** el andamio reparte un archivo fuente ejecutable que ningún reporte de cobertura reclama y que no está excluido con motivo
- **THEN** la verificación del marco falla con el veredicto de la compuerta real, porque el primer cambio que lo toque saldría en rojo

#### Scenario: Una exclusión muerta

- **WHEN** una exclusión declarada por un paquete del andamio no corresponde a ningún archivo
- **THEN** la verificación del marco falla nombrando el manifiesto y el patrón
