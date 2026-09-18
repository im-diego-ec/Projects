# pipeline-entrega — Delta

## ADDED Requirements

### Requirement: Lo incompatible es una lista cerrada, y una compuerta cuyo arreglo cabe en el consumidor se exige el día que sale

La clasificación de un cambio del marco como incompatible —el que obliga a abrir una
línea mayor— SHALL salir de una lista cerrada, escrita en un solo lugar del marco. La
lista SHALL contener el contrato publicado de una pieza referenciada (quitar o renombrar
una entrada, un secreto o una salida, o volver requerida una opcional; cambiar un valor
por defecto de forma que cambie el comportamiento; renombrar un job cuyo nombre publica
un check; exigir un permiso nuevo del token, o un runtime o una herramienta de versión
mayor) y la compuerta nueva o endurecida cuyo arreglo queda fuera del repositorio del
consumidor. Lo que no está en la lista SHALL NOT clasificarse como incompatible.

Una compuerta nueva o endurecida cuyo arreglo cabe en el repositorio del consumidor
SHALL publicarse exigible en una versión menor, y su arreglo SHALL quedar escrito en la
sección para consumidores de esa versión. Una compuerta cuyo arreglo queda fuera del
repositorio del consumidor SHALL estrenarse en modo aviso ruidoso, con el arreglo
escrito, o SHALL publicarse en la línea mayor siguiente. Un cambio que solo toca el
andamio SHALL NOT clasificarse como incompatible, porque no llega a ningún consumidor
existente por su actualización.

La sección para consumidores de las versiones que el aviso todavía puede mandar SHALL
estar escrita sin la jerga de oficio que tienen prohibida las páginas para quien no es
técnico, y el pull request que la escribe SHALL ponerse en rojo si no lo está. Toda
superficie del marco que repita la lista SHALL repetirla completa y sin casos de más, y
ninguna superficie que dicte la regla SHALL volver a clasificar un endurecimiento como
incompatible por sí mismo; si una lo hace, el CI del marco SHALL ponerse en rojo.

#### Scenario: Una compuerta nueva que el consumidor arregla en su repositorio
- **WHEN** una versión agrega una compuerta que un consumidor no cumple y cuyo arreglo es un cambio en su propio repositorio
- **THEN** la versión es menor, el pull request de actualización de ese consumidor nace en rojo y la sección para consumidores de esa versión dice qué cambiar

#### Scenario: Una compuerta cuyo arreglo vive en la configuración del proveedor
- **WHEN** una versión agrega una compuerta cuyo único arreglo es una configuración del proveedor de CI o un acto de quien administra el repositorio consumidor
- **THEN** la compuerta se estrena en modo aviso, con el arreglo escrito en el aviso y en la sección para consumidores, o se publica en la línea mayor siguiente como incompatible; nunca en rojo en una versión menor

#### Scenario: Un cambio del contrato publicado
- **WHEN** un cambio renombra el job que publica un check, o quita una entrada de una pieza referenciada
- **THEN** se clasifica como incompatible aunque el consumidor pudiera ajustar su propio archivo, porque es el contrato publicado de la pieza

#### Scenario: Un cambio que solo toca el andamio
- **WHEN** un cambio modifica solamente archivos del andamio
- **THEN** no se clasifica como incompatible, y la sección para consumidores dice qué copiar a mano para quien lo quiera

#### Scenario: La sección para consumidores escrita en jerga
- **WHEN** la sección para consumidores de la versión en curso o de la más alta usa, fuera de las marcas de código, una palabra de oficio prohibida en las páginas para quien no es técnico
- **THEN** el CI del pull request que la escribe se pone en rojo nombrando las palabras y el arreglo

#### Scenario: Un nombre que hay que copiar tal cual
- **WHEN** la sección para consumidores nombra un archivo o un comando entre marcas de código
- **THEN** esa mención no cuenta como jerga

#### Scenario: Una copia de la lista que se separa de la fuente
- **WHEN** la plantilla de pull request del marco ofrece un caso de incompatibilidad que la lista cerrada no tiene, u omite uno que tiene
- **THEN** el CI del marco se pone en rojo nombrando los casos que sobran y los que faltan

#### Scenario: Una superficie que vuelve a la regla retirada
- **WHEN** una superficie que dicta la regla —la constitución del marco, su plantilla de pull request, sus procedimientos o su documentación vigente— vuelve a decir que endurecer una compuerta es incompatible por sí mismo
- **THEN** el CI del marco se pone en rojo nombrando el archivo y la frase
