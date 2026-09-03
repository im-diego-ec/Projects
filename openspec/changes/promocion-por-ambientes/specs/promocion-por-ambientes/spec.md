## ADDED Requirements

### Requirement: Un cambio llega a producción pasando por un ambiente de prueba

The system SHALL publish every change to a test environment before production, and
SHALL NOT allow a change to reach production without having been published to the
test environment first.

El motivo es el que este marco repite en todos lados: **mirar antes es más barato
que arreglar después**. Un ambiente de prueba desplegado no es una copia
decorativa — es el único lugar donde se puede ver el sistema entero funcionando
sobre algo que no es la máquina de quien lo escribió.

#### Scenario: El camino completo, en verde
- **WHEN** un cambio entra a la rama principal y las verificaciones terminan en verde
- **THEN** el sistema publica en el ambiente de prueba, sin que nadie apriete nada

#### Scenario: Las verificaciones en rojo
- **WHEN** las verificaciones no terminan en verde
- **THEN** no se publica en ningún ambiente, y el motivo dice cuál verificación falló

#### Scenario: Producción sin haber pasado por prueba
- **WHEN** se intenta promover a producción una versión que no está publicada en el ambiente de prueba
- **THEN** la promoción se rechaza nombrando esa versión, y no se publica nada

### Requirement: La promoción a producción es un acto deliberado con rastro

The system SHALL require an explicit human decision to promote from the test
environment to production, and SHALL record who decided it and when.

Automatizar el pase a producción convierte cada merge en una publicación, y eso
saca de la mano de la persona la única decisión que de verdad es suya. El rastro
existe porque **una decisión sin autor no se puede revisar después**.

#### Scenario: La promoción se pide
- **WHEN** alguien promueve a producción una versión publicada en el ambiente de prueba
- **THEN** la publicación ocurre y queda registrado quién la pidió y en qué momento

#### Scenario: Apartarse de la compuerta
- **WHEN** alguien necesita publicar en producción sin pasar por el ambiente de prueba
- **THEN** el sistema lo permite sólo con un apartamiento explícito y nombrado, y lo deja escrito en la corrida

### Requirement: El proyecto declara qué puede publicar y qué no

The system SHALL state, in the generated project, which of its environments exist
and which do not, and SHALL NOT describe machinery that the project did not
receive.

Es el defecto que motivó este change: la constitución declaraba una promoción que
no existía. La regla vale también hacia adelante — cualquier forma o plataforma
que no reciba despliegue tiene que decirlo donde la persona lo lee.

#### Scenario: Una forma sin despliegue
- **WHEN** se genera un proyecto cuya forma no recibe un paso de publicación
- **THEN** su portada y su constitución lo dicen, y queda anotado como desvío declarado

#### Scenario: Una forma con despliegue completo
- **WHEN** se genera un proyecto que sí recibe ambiente de prueba y promoción
- **THEN** no queda ningún desvío sobre la promoción por ambientes, porque la regla se cumple

### Requirement: Lo que la persona elige decide dónde se despliega

The system SHALL make the deployment target a consequence of what the person
chose, and SHALL NOT offer a choice that has no effect on where the project runs.

Hoy la pregunta de plataforma no afecta el despliegue: un sitio publica en
Cloudflare elija lo que elija. Preguntar algo cuya respuesta no cambia nada le
hace creer a la persona que eligió una arquitectura cuando eligió un texto.

#### Scenario: Una elección que no cambia nada
- **WHEN** el asistente ofrece una opción cuya respuesta no cambia ningún archivo ni ningún destino
- **THEN** esa opción no se ofrece, o su texto dice exactamente qué decide y qué no

#### Scenario: Una combinación sin destino
- **WHEN** una combinación de forma y plataforma no tiene un destino de despliegue construido
- **THEN** el asistente no la ofrece, o la carta la marca como pendiente con su estado

### Requirement: El costo de publicar está dicho antes de elegir

The system SHALL state the monetary cost and the number of one-time human steps of
each deployment path before the person chooses it.

Una persona que elige sin saber que una opción cuesta dinero se entera con la
factura. El marco ya cuenta los actos humanos del sitio —son tres— y esa cuenta
tiene que existir para cada camino.

#### Scenario: Un camino que cuesta dinero
- **WHEN** un camino de despliegue exige un plan pago o puede generar cargos
- **THEN** el asistente lo dice en el momento de elegirlo, no después

#### Scenario: Un camino gratuito con límites
- **WHEN** un camino es gratuito pero tiene límites que se pueden alcanzar
- **THEN** los límites están dichos con su número, y qué pasa cuando se llega a ellos
