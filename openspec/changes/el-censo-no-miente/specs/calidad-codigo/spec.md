# calidad-codigo — deltas de el-censo-no-miente

## ADDED Requirements

### Requirement: La ausencia de compuerta declara su estado

Todo requirement de los specs vivos del marco que no tenga una compuerta automática
SHALL declarar, en la superficie que publica la cobertura del marco, en cuál de tres
estados está esa ausencia, y los tres NO SHALL confundirse:

- **Pendiente**: la propiedad es verificable y el trabajo vive en un change vivo, que
  SHALL nombrar al requirement.
- **No verificable**: una propiedad del propio requirement impide verificarlo, y la
  declaración SHALL nombrarla. Un motivo de esfuerzo —la dificultad, el tiempo, la
  prioridad— NO SHALL contar como esa propiedad: describe a quien escribe y no a la regla.
- **Sin destino**: la propiedad es verificable y ningún change la tiene. La declaración
  SHALL llevar la versión publicada del marco en que se decidió, y SHALL vencer cuando se
  publique otra: una ausencia sin dueño que no vence es un olvido con nombre.

Una ausencia sin estado declarado SHALL poner el pipeline en rojo, y el pipeline SHALL
medir lo que cada estado afirma: que el change del pendiente exista vivo y nombre al
requirement, que la propiedad del no verificable no sea un motivo de esfuerzo, y que la
versión del sin destino sea la publicada. El resumen de la cobertura SHALL publicar
cuántos requirements hay en cada estado.

#### Scenario: Una ausencia sin declarar

- **WHEN** un requirement sin compuerta figura en la declaración sin ninguno de los tres estados
- **THEN** el pipeline falla nombrando el requirement y las tres salidas

#### Scenario: Un pendiente cuyo destino no existe

- **WHEN** la declaración dice que la compuerta de un requirement está pendiente en un change que no está vivo, o en uno que no nombra al requirement
- **THEN** el pipeline falla, porque un destino que no existe o que no sabe que lo es no es un destino

#### Scenario: Un no verificable que describe el esfuerzo

- **WHEN** la propiedad declarada para un requirement no verificable es un motivo de esfuerzo
- **THEN** el pipeline falla y dice que, si la propiedad se puede verificar, el estado correcto es pendiente o sin destino

#### Scenario: Una ausencia sin destino cuando se publica otra versión

- **WHEN** se publica una versión del marco distinta de la que declara una ausencia sin destino
- **THEN** el pipeline falla sobre esa ausencia hasta que alguien la decida de nuevo: darle una compuerta, un change que la tenga, la propiedad que la hace no verificable, o la versión nueva

#### Scenario: Una ausencia bien declarada

- **WHEN** un requirement sin compuerta declara su estado y lo que el estado afirma se sostiene
- **THEN** el pipeline pasa, y el resumen lo cuenta en su estado y no como cubierto

### Requirement: Lo que está cubierto a medias se publica como tal

La superficie que publica la cobertura del marco SHALL distinguir el requirement cuya
compuerta cubre lo que exige del que tiene compuertas que solo cubren una parte, y SHALL
publicar, por capability y en el resumen, cuántos de los requirements con compuerta lo
son solo en parte. Esa cuenta SHALL publicarse como subconjunto de los que tienen
compuerta, y NO SHALL sumarse aparte: sumada, contaría dos veces al mismo requirement.

El pipeline SHALL fallar cuando la cuenta publicada no coincida con lo que declaran los
requirements, y cuando una capability o el resumen no la publiquen.

#### Scenario: Una compuerta que pasa a cubrir solo una parte

- **WHEN** un requirement pasa a declararse cubierto solo en parte y la cuenta publicada de su capability no cambia
- **THEN** el pipeline falla nombrando la capability y las dos cuentas

#### Scenario: Una capability que no publica sus parciales

- **WHEN** una capability, o el resumen, publica cuántos requirements tienen compuerta y no cuántos de ellos solo en parte
- **THEN** el pipeline falla diciendo qué falta publicar

### Requirement: Una compuerta que no corre no se publica como compuerta

La declaración de cobertura del marco NO SHALL citar como la compuerta de un requirement
una pieza que no corre en ningún repositorio: una acción que el marco publica y que
ninguna definición de pipeline —del marco ni de las que reparte el andamio— invoca. El
pipeline SHALL fallar cuando la declaración la cite, ya sea por uno de sus archivos o por
un paso que solo vive en ella.

Toda acción que el marco publica SHALL estar invocada por alguna definición de pipeline
del marco o del andamio, o declarada como excepción con su motivo. Que una acción esté
declarada como excepción NO SHALL volverla compuerta: exime del rojo de no estar
invocada, no convierte en cierto que corra. Decidir qué acciones están invocadas SHALL
hacerlo un solo lector para las dos comprobaciones: con dos lectores, una podría eximir
una pieza y la otra contarla como compuerta.

Toda fila que la declaración cuente como compuerta SHALL nombrar algo que se pueda ir a
mirar: una ruta del repositorio o un paso por su nombre.

#### Scenario: Una acción publicada que nadie invoca

- **WHEN** el marco publica una acción que ninguna definición de pipeline del marco ni del andamio invoca, y no está declarada como excepción
- **THEN** el pipeline falla nombrando la acción y las tres salidas: invocarla, retirarla, o declararla con su motivo y la versión en que vale

#### Scenario: Una invocación que no invoca nada

- **WHEN** la única mención de una acción en las definiciones de pipeline está comentada, o dentro de un texto que el pipeline imprime, o en un repositorio anidado que no es el que se mide
- **THEN** la acción cuenta como no invocada

#### Scenario: La declaración cita una pieza que no corre

- **WHEN** la declaración de cobertura cita como la compuerta de un requirement un archivo o un paso de una acción que nadie invoca
- **THEN** el pipeline falla nombrando el requirement y la acción, aunque la acción esté declarada como excepción

#### Scenario: Una compuerta que no se puede ir a mirar

- **WHEN** la declaración cuenta un requirement como cubierto y su fila no nombra ninguna ruta ni ningún paso
- **THEN** el pipeline falla, porque esa cobertura suma a los números sin que nadie pueda comprobarla

### Requirement: Una excepción de una compuerta vence al publicarse otra versión

Una excepción que apaga una compuerta mientras dura una ventana —una acción publicada
que todavía nadie invoca, una referencia interna al tag mayor móvil— SHALL declarar la
versión publicada del marco en que se decidió mantenerla, y el pipeline SHALL fallar
cuando se publique otra. Una excepción sin versión declarada SHALL contar como vencida.

La salida de una excepción vencida SHALL ser una decisión escrita: cerrar lo que la
excepción tapaba y borrarla, o mover la versión, que es una decisión que alguien firma.
Una excepción que ya no tapa nada SHALL borrarse, y el pipeline SHALL fallar mientras
siga declarada. La versión publicada SHALL leerla un solo lector para todas las
excepciones que vencen.

#### Scenario: Se publica una versión con una excepción de la anterior

- **WHEN** se publica una versión del marco y una excepción declara la versión anterior
- **THEN** el pipeline falla nombrando la excepción y las dos salidas

#### Scenario: Una excepción sin versión

- **WHEN** una excepción no declara la versión en que vale
- **THEN** cuenta como vencida, porque es justo la que nunca saldría sola

#### Scenario: Una excepción que ya no tapa nada

- **WHEN** la acción que una excepción declaraba sin invocar ya está invocada
- **THEN** el pipeline falla pidiendo borrar la excepción, porque mientras siga declarada la acción puede volver a quedar sin invocar en silencio
