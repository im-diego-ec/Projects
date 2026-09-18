# calidad-codigo — Delta

## ADDED Requirements

### Requirement: Una versión publicada de las reglas del marco no cambia de texto

Las reglas que el marco publica para que cada proyecto las cumpla llevan un número
de versión, y un proyecto verifica su copia contra el texto que el marco publica
**para ese número**. Una vez publicada una versión, su texto SHALL quedar fijo: el
pipeline del marco SHALL rechazar el cambio que reescriba la huella del texto de
una versión ya publicada, que la saque de la lista de versiones o que le cambie el
número. La única forma de publicar un texto distinto SHALL ser una versión nueva.

**Por qué es del marco y no del consumidor.** Si dos textos distintos llevan el
mismo número, el pipeline del marco sale verde y el rojo aparece en un proyecto al
día con esa versión, que falla porque su copia ya no coincide con lo que el marco
publica, sin haber cambiado nada. Lo paga quien no cometió el error y no lo puede
arreglar.

**Lo que todavía no se publicó no está fijo.** Una versión cuyo número es mayor que
el de la última publicada no la recibió ningún proyecto: su texto y su número SHALL
poder corregirse hasta que el release la publique. «Publicada» SHALL decidirse por
el número y no por la mención, para que una versión que el release olvidó renombrar
no quede reescribible para siempre. Si no se puede determinar qué se publicó, toda
versión SHALL tratarse como publicada, y la verificación SHALL decirlo.

#### Scenario: El texto nuevo pegado sobre una versión publicada
- **WHEN** un cambio actualiza la huella del texto de una versión ya publicada en lugar de agregar una versión nueva
- **THEN** el pipeline del marco falla nombrando la versión y las dos huellas, y el mensaje dice que el arreglo es devolverle su huella y agregar una versión al final

#### Scenario: El canónico cambia con una versión nueva
- **WHEN** un cambio modifica el texto de las reglas y agrega una versión nueva con la huella de ese texto, sin tocar las versiones publicadas
- **THEN** el pipeline del marco pasa y dice cuántas versiones había y cuántas hay

#### Scenario: Una versión publicada desaparece
- **WHEN** un cambio saca de la lista una versión ya publicada, o le cambia el número, aunque agregue otra
- **THEN** el pipeline del marco falla nombrando la versión, porque un proyecto fijado a ella sigue verificando su copia contra ese número

#### Scenario: La versión pendiente se corrige
- **WHEN** un cambio reescribe la huella o el número de una versión que todavía no se publicó
- **THEN** el pipeline del marco pasa y nombra la versión como pendiente, porque ningún proyecto la recibió todavía

#### Scenario: Una rama que salió antes de un release
- **WHEN** la rama de un cambio salió antes de que se publicara una versión, no toca la lista de versiones, y la integración ya tiene la versión nueva
- **THEN** el pipeline del marco no falla por esa versión, porque lo que se juzga es lo que cambia la rama desde el ancestro común y no lo que avanzó la integración

#### Scenario: Una rama que reescribe lo que se publicó mientras tanto
- **WHEN** la rama de un cambio reescribe una versión que era pendiente cuando la rama salió y que la integración publicó después
- **THEN** el pipeline del marco falla, porque qué está publicado se decide con lo más nuevo que se sabe, y el mensaje dice que el arreglo es actualizar la rama con la integración

#### Scenario: No se puede saber qué se publicó
- **WHEN** el registro de versiones publicadas del lado base del cambio no nombra ninguna versión
- **THEN** la verificación trata todas las versiones como publicadas y lo avisa, en vez de declarar que no hay nada que proteger

#### Scenario: Lo que no se puede leer no pasa
- **WHEN** la lista de versiones no se puede leer en alguno de los dos lados del cambio, o el lado base no se puede resolver
- **THEN** el pipeline del marco falla diciendo qué no pudo leer, en vez de declararse verde por no haber podido medir
