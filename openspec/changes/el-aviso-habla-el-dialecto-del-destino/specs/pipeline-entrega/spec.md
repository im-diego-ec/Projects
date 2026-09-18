# pipeline-entrega — Delta

## ADDED Requirements

### Requirement: El aviso de versión arma el mensaje entero en el dialecto del destino

La pieza que arma el aviso de versión SHALL aceptar el dialecto de marcado del destino
dentro de un conjunto cerrado de valores, y SHALL armar el mensaje entero —el texto
fijo que ella escribe y el que toma del changelog— en ese único dialecto. Sin dialecto
declarado SHALL usar el del changelog, sin traducir su contenido. Un valor fuera del
conjunto SHALL fallar sin armar el mensaje, nombrando el valor recibido, los válidos y
el arreglo.

Al traducir a un dialecto distinto del del changelog, el código, en línea o en bloque,
NO SHALL alterarse; cada énfasis SHALL quedar con su propio par aunque envuelva
código; lo que el dialecto de destino no soporta SHALL llegar en una forma legible sin
perder información; y el corte de línea con el que el changelog se escribe para leerse
en un editor NO SHALL partir el énfasis de un párrafo ni el de un ítem de lista.

Cada corrida SHALL anunciar el dialecto que usó y si fue declarado o es el valor por
defecto. El repositorio que publica versiones SHALL advertir, con el arreglo, cuando la
preferencia de dialecto quedó cargada como secreto y no donde se lee, sin leer el valor
de ese secreto.

#### Scenario: Nadie declara el dialecto

- **WHEN** el aviso se arma sin dialecto declarado
- **THEN** el mensaje entero, texto fijo incluido, usa el marcado del changelog, y la corrida anuncia que usó el valor por defecto y dónde se declara el otro

#### Scenario: El destino declara un dialecto distinto del del changelog

- **WHEN** el dialecto declarado marca el énfasis de otra forma que el changelog
- **THEN** ningún énfasis del mensaje llega con el marcado del changelog fuera del código, y la corrida nombra el dialecto declarado

#### Scenario: El dialecto declarado no existe

- **WHEN** el valor declarado no pertenece al conjunto
- **THEN** la pieza falla sin escribir el mensaje, nombrando el valor recibido, los válidos y el arreglo

#### Scenario: El código lleva los mismos caracteres que el marcado

- **WHEN** un fragmento de código contiene los caracteres del énfasis, o un énfasis envuelve código
- **THEN** el código llega idéntico y cada énfasis queda emparejado con el suyo

#### Scenario: El changelog trae una tabla y el dialecto no tiene tablas

- **WHEN** la sección que se manda contiene una tabla y el dialecto declarado no las soporta
- **THEN** cada fila llega como un ítem que conserva todos sus valores, cada uno con su encabezado

#### Scenario: Un énfasis cruza el corte de línea del changelog

- **WHEN** un énfasis de un párrafo o de un ítem de lista continúa en la línea siguiente del changelog
- **THEN** en un dialecto que no renderiza énfasis a través de un salto de línea llega en una sola línea, y los ítems, las filas, las citas y los encabezados conservan cada uno la suya

#### Scenario: La preferencia quedó cargada como secreto

- **WHEN** el repositorio que publica versiones tiene la preferencia de dialecto como secreto y no donde se lee
- **THEN** la corrida del aviso lo advierte con el arreglo, sin leer el valor del secreto y sin detener el envío

#### Scenario: El changelog real traducido

- **WHEN** se arma en el dialecto traducido el aviso de cualquier sección del changelog del repositorio
- **THEN** el banco del aviso falla si alguna llega con marcado sin traducir o con un énfasis partido, salvo el residuo que declara por sección

### Requirement: La medición del aviso cubre cada dialecto que la pieza acepta

La medición del aviso en el pull request SHALL armar el mensaje en cada dialecto que la
pieza acepta, porque la traducción cambia su largo, y SHALL fallar cuando alguno no
entre en el límite, nombrando el dialecto que no entra. El conjunto de dialectos que
mide SHALL ser el que la pieza declara, no una copia.

#### Scenario: El mensaje entra en un dialecto y no en el otro

- **WHEN** la sección que se mide entra en el límite en un dialecto y lo supera en otro
- **THEN** el pipeline falla con un hallazgo que nombra el dialecto que no entra, y ninguno por el que entra

#### Scenario: El largo que se mide es el que se envía, en cada dialecto

- **WHEN** se compara lo que mide el pipeline con el mensaje que la pieza escribe para un dialecto
- **THEN** los dos largos coinciden en cada dialecto, o el banco del pipeline falla
