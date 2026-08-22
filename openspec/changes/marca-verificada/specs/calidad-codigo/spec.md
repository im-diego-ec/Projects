# calidad-codigo — Delta

## ADDED Requirements

### Requirement: La identidad visual del área se verifica, no se recomienda

Un repositorio con interfaz de usuario SHALL tener las reglas de identidad visual
del área **cargadas en su verificación de lint**, de modo que apartarse de ellas
termine en un código de salida distinto de cero y no en un aviso.

El repositorio SHALL obtener esas reglas del marco y no redactarlas: una copia
por proyecto divergiría, y la divergencia entre dos declaraciones de la misma
regla es la clase de defecto que este marco ya midió en otras superficies.

La verificación SHALL cubrir únicamente las propiedades que un análisis
sintáctico puede decidir. Las que exigen una página renderizada —contraste
efectivo tras la cascada, foco visible real, retorno del foco al cerrar un
diálogo— SHALL quedar **fuera** de esta garantía y declaradas como tales: un
check que se presenta como compuerta de una propiedad que no puede decidir es el
falso verde que esta capability existe para no tener.

Un repositorio **sin** interfaz de usuario SHALL quedar cubierto sin acción de su
parte: el alcance de las reglas se deriva de las rutas del repositorio, no de una
perilla que alguien tenga que apagar.

#### Scenario: Texto blanco sobre el color de acento
- **WHEN** un archivo de interfaz declara texto blanco sobre el fondo de acento de la marca, en un atributo o dentro de una plantilla de texto
- **THEN** el lint reporta el archivo y la línea, nombra la relación de contraste insuficiente y termina con código distinto de cero

#### Scenario: Un valor de color escrito a mano donde hay un token
- **WHEN** un archivo fuente de interfaz declara un color literal en vez de referir el token de la marca
- **THEN** el lint lo reporta con su archivo y su línea, y nombra el token que corresponde usar

#### Scenario: El lugar legítimo de los valores de marca
- **WHEN** el archivo de configuración de estilos del proyecto declara los colores de la marca, que es donde el sistema espera que estén
- **THEN** el lint NO lo reporta — la regla acota su alcance por ruta, porque una regla que enrojece el único lugar correcto entrena a ignorarla. Que el VALOR declarado ahí sea el de la marca lo verifica el segundo requirement, no el lint: quedar fuera del linter no es quedar sin verificar

#### Scenario: Un repositorio sin interfaz de usuario
- **WHEN** se ejecuta el lint en un repositorio que no tiene paquete de interfaz
- **THEN** las reglas de identidad visual no reportan nada y el lint termina en cero, sin que nadie las haya desactivado

#### Scenario: Alguien retira el bloque de reglas de la configuración
- **WHEN** la configuración de lint del repositorio deja de cargar las reglas de identidad visual, por borrado o por dejarlas con alcance vacío
- **THEN** la verificación del marco lo reporta como fallo — se comprueba que las reglas estén **cargadas y en severidad de error**, no que el texto figure en un archivo

### Requirement: Los artefactos de identidad visual se regeneran y su desvío se detecta

Los archivos de identidad visual que el proyecto necesita **en su árbol** para
construir —los tokens de diseño y los logotipos— SHALL llegar como artefacto
regenerado desde el marco, y NO como copia que el proyecto mantenga a mano.

La verificación SHALL comparar el artefacto del repositorio contra el resultado
de **volver a generarlo** desde el canónico de la versión que el repositorio
tiene pinada, y no contra un sello guardado junto al artefacto: recomputar un
sello es un commit, y cambiar el canónico no.

El canónico SHALL registrar, para cada archivo que transporta, la huella de la
fuente tal como se tomó y la fecha. Esa huella no detecta que la fuente original
haya cambiado —el sistema de diseño no expone una versión legible por máquina— y
la garantía SHALL declarar ese límite en vez de presentarse como completa.

Cuando el canónico retire un token que antes definía, la verificación SHALL
reportar las referencias que queden sin destino en el repositorio: un token
eliminado deja una referencia que resuelve a nada en tiempo de ejecución, sin
error de construcción y sin aparecer en el diff del archivo regenerado.

#### Scenario: El artefacto del repositorio coincide con su canónico
- **WHEN** se verifica un repositorio cuyos archivos de identidad visual son idénticos al resultado de regenerarlos desde la versión pinada
- **THEN** la verificación termina en cero

#### Scenario: Alguien editó el artefacto a mano
- **WHEN** un archivo de identidad visual difiere del resultado de regenerarlo **y declara la misma versión** que el canónico pinado
- **THEN** la verificación lo reporta nombrando el archivo y la diferencia, y termina con código distinto de cero

#### Scenario: El artefacto quedó atrás de la versión pinada
- **WHEN** un archivo de identidad visual difiere del resultado de regenerarlo **y declara una versión anterior** a la del canónico pinado
- **THEN** la verificación avisa con la fecha desde la cual será un fallo, y pasa a fallar a partir de esa fecha

#### Scenario: El artefacto no declara de qué versión salió
- **WHEN** un archivo de identidad visual del repositorio no declara la versión del canónico que lo generó
- **THEN** la verificación lo reporta como fallo — sin ese dato los dos casos anteriores son indistinguibles, y tratar «atrasado» como «editado a mano» pondría en rojo a quien no hizo nada

#### Scenario: Una referencia a un token que el canónico ya no define
- **WHEN** el repositorio refiere un token de diseño que la versión pinada del canónico no define
- **THEN** la verificación lo reporta con su archivo y su línea — no se deja que resuelva a nada en tiempo de ejecución

#### Scenario: Un valor de marca declarado en el lugar correcto pero equivocado
- **WHEN** el archivo de configuración de estilos del proyecto declara un color de marca cuyo valor NO coincide con el token equivalente del canónico pinado
- **THEN** la verificación lo reporta nombrando el archivo, el valor declarado y el del canónico — el lugar es legítimo, el valor no

#### Scenario: La huella de la fuente no está registrada
- **WHEN** el canónico transporta un archivo de identidad visual sin registrar la huella de la fuente de la que se tomó
- **THEN** la verificación del propio marco lo reporta como inválido: sin esa huella no se puede contestar de qué versión del sistema de diseño proviene el archivo

### Requirement: Una sustitución declarada no se transporta como estándar

Cuando el sistema de diseño de origen declare que una de sus piezas es una
**sustitución** —un valor elegido por quien armó el sistema porque la marca no
entregó el original— el marco NO SHALL transportar esa pieza como parte del
canónico verificado.

El marco SHALL declarar el hueco de forma visible en cada corrida, nombrando qué
pieza falta y quién la tiene que entregar, y SHALL abstenerse de poner en rojo a
un proyecto por apartarse de una sustitución.

El motivo es directo: transportar una sustitución con el sello del marco la
convierte en la norma del área y pone en falta a quien la corrija con el valor
verdadero. Es estrictamente peor que dejar el hueco a la vista.

#### Scenario: El canónico incluye una pieza declarada como sustitución
- **WHEN** se verifica el canónico y contiene una pieza que el sistema de diseño de origen marca como sustitución
- **THEN** la verificación del marco lo reporta como inválido

#### Scenario: Un proyecto se aparta de una pieza que falta
- **WHEN** un repositorio declara su propio valor para una pieza que el marco NO transporta porque es una sustitución
- **THEN** la verificación no lo reporta como fallo, y sí imprime el aviso del hueco con quién tiene que cerrarlo

## MODIFIED Requirements

### Requirement: Lint y formato configurados para todos los paquetes

El repositorio SHALL tener linter y formateador configurados y ejecutables en
CADA paquete del monorepo, con reglas alineadas a la constitución de
ingeniería (`AGENTS.md`: TypeScript strict, `any` solo con justificación, sin
promesas flotantes).

Ningún paquete SHALL quedar fuera del alcance del lint: incorporar un paquete
nuevo sin su configuración SHALL ser un fallo, no un punto ciego silencioso.

Esta garantía es por PAQUETE y se conserva. Aparte se enuncia otra, más fuerte y
por ARCHIVO, porque la de paquete no alcanza: los dos agujeros que motivaron el
cambio vivían DENTRO de paquetes correctamente configurados, y ninguna propiedad
enunciada por paquete puede describirlos.

Y desde el estreno de las reglas de identidad visual, el lint es además la
compuerta de esas reglas. No se agrega una verificación nueva al pipeline: se
carga sobre la que ya corre en cada PR y en la máquina del builder antes del
push, que es el lugar donde un aviso cuesta menos.

#### Scenario: Ejecutar lint en un paquete limpio
- **WHEN** se ejecuta el script `lint` de cualquier paquete del monorepo sin violaciones presentes
- **THEN** el comando termina con código de salida 0 y no reporta errores

#### Scenario: Ejecutar lint con una violación presente
- **WHEN** existe una violación de regla (por ejemplo un `any` sin comentario justificativo) y se ejecuta el script `lint`
- **THEN** el comando reporta el error con archivo y línea y termina con código de salida distinto de 0

#### Scenario: Paquete nuevo sin configuración de lint
- **WHEN** se incorpora al monorepo un paquete que no queda cubierto por la configuración de lint
- **THEN** la verificación de CI lo señala como fallo — un paquete sin lint no pasa por verificado
