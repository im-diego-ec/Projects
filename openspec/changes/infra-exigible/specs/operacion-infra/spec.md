# operacion-infra — Delta

## RENAMED Requirements

- FROM: `### Requirement: El andamio entrega los huecos de decisión de infraestructura con su criterio`
- TO: `### Requirement: La infraestructura de un repositorio desplegable vive en su árbol, entregada por el andamio`

## MODIFIED Requirements

### Requirement: Las caídas se detectan por alarma, no por reporte humano

El ambiente de producción SHALL tener alarmas que cubran como mínimo tres **capacidades de
detección**, sea cual sea la plataforma: que el servicio público **deje de responder o
responda con errores del servidor** de forma sostenida; que el proceso que atiende las
peticiones **se caiga y se reinicie —o se reemplace— en bucle**; y que el log de la
aplicación **registre ocurrencias de los niveles de alerta**. Las alarmas SHALL notificar
por push a un canal que el equipo lee.

Cómo se implementa cada capacidad es del adaptador de la plataforma y NO SHALL fijarse en
este requirement. Una redacción anterior nombraba el mecanismo —reinicios «de las
instancias de cómputo», alertas del log «vía filtro de métrica»— y en un marco que no fija
la nube eso se leía como una exigencia de un solo proveedor: lo que se exige es lo que la
alarma detecta, no con qué producto se arma.

Esta lista es un **mínimo** y no una lista cerrada. Por encima de ella, qué vigilar es del
negocio de cada proyecto, y lo gobierna el criterio que el andamio reparte en el pendiente
de las alarmas, no este requirement. Un proyecto que no despliega no tiene ambiente de
producción, y este requirement no le exige alarmas: no desplegar es un estado legítimo
(decisión del PO del 2026-09-17).

#### Scenario: Ciclo de reinicios del servicio
- **WHEN** el proceso del servicio entra en un ciclo de caída y reinicio —o sus instancias, en un ciclo de caída y reemplazo—
- **THEN** llega una notificación al canal del equipo dentro de los minutos siguientes, sin que ningún usuario haya reportado nada

#### Scenario: Errores de aplicación sin caída
- **WHEN** el log del servicio registra una condición fatal o una tasa anómala de errores que no mata el proceso
- **THEN** la alarma derivada del log dispara y avisa al canal, con el mecanismo que la plataforma dé para derivar una alarma de sus logs

#### Scenario: El mínimo en una plataforma que no fija el mecanismo
- **WHEN** un proyecto despliega en una plataforma distinta de la que el andamio reparte escrita
- **THEN** el mínimo es el mismo —servicio que no responde o responde con errores sostenidos, proceso en bucle de reinicios, niveles de alerta en el log— y se cumple con los mecanismos de esa plataforma, porque lo que se exige es la detección y no el producto

### Requirement: La infraestructura de un repositorio desplegable vive en su árbol, entregada por el andamio

Un repositorio que se despliega SHALL tener su infraestructura como código en su propio
árbol, en la forma que la constitución fija para su plataforma —las raíces de Terraform por
defecto, o lo que declare su adaptador—, y NO SHALL depender de que alguien recuerde
crearlas. El andamio SHALL entregar las raíces de la plataforma que reparte escrita, y NO
SHALL dejar que existan por acuerdo verbal: un repositorio que nace del andamio las recibe.

Cada pieza que todavía no se puede decidir SHALL llegar como un **pendiente de decisión de
infraestructura** —en las raíces de la plataforma escrita— o como un **pendiente de
plataforma** —en el catálogo de adaptadores—, y cada uno SHALL declarar **cuatro** cosas:
qué falta, **con qué criterio se decide**, **cuándo se resuelve**, y qué queda sin garantía
si no se resuelve. Un pendiente que solo dice qué falta lo puede resolver únicamente quien
ya sabía la respuesta; uno con criterio y sin momento se lee como trabajo futuro sin dueño,
y el trabajo futuro sin dueño no se hace. Se llaman pendientes y no «huecos de decisión»
porque ese término ya lo usa `calidad-codigo` para los marcadores del andamio con la
propiedad contraria —CI falla mientras alguno sobreviva—; los títulos de los escenarios de
abajo conservan la palabra «hueco» porque el título es su identidad.

La retención y la clase del grupo de logs del servicio SHALL llegar como pendiente en
**todos** los ambientes que la plataforma escrita reparte, y no solo en uno: la retención
es contrato en cualquier ambiente, y la clase no se puede cambiar después de crear el
grupo, así que el ambiente que no avisa es el que se equivoca sin vuelta atrás.

La verificación SHALL fallar cuando un pendiente pierda cualquiera de sus cuatro partes,
cuando su numeración deje de ser correlativa, cuando un puntero de la raíz apunte a una
sección que ya no existe, cuando un pendiente de un ambiente aparezca en la raíz de otro, o
cuando el pendiente de los logs falte en alguna raíz.

La verificación SHALL ser inerte para un repositorio que no se despliega: la exigencia nace
del despliegue, no de la existencia del repositorio. **No desplegar es un estado legítimo**
—decisión del PO del 2026-09-17—, y un repositorio que declara que no despliega —la
plataforma `ninguna` del catálogo de adaptadores— no recibe ninguna señal sobre
infraestructura que no tiene.

**Qué forma toma una señal sobre los pendientes sin resolver —rojo o aviso— NO lo decide
este requirement.** Una versión anterior del delta que lo introdujo decía que la
verificación SHALL fallar mientras sobreviviera un pendiente sin resolver. Se retiró antes
de archivar, y no por prolijidad: la compuerta que esa cláusula exigía **nunca se
construyó** —el propio change la declaró diferida— y su disparador, «este repositorio se
despliega», no es verificable hasta que el marco mida por plataforma si un repositorio
llegó a su ambiente. Ese es el change que decide la forma de la señal. Hasta entonces, lo
que se acredita es que los pendientes lleguen escritos de forma que alguien pueda
resolverlos, no que estén resueltos.

Lo que **esta verificación** exige de las alarmas SHALL ser que su pendiente viva en la
raíz del ambiente que las necesita, con su criterio, y NO SHALL ser cuáles ni cuántas: es
la verificación de los pendientes, y juzgar la lista de alarmas de un proyecto no es lo que
un pendiente bien escrito acredita.

**Esto NO SHALL leerse como que el marco no exige ninguna alarma en particular.** La
redacción anterior —«lo que se exige de las alarmas»— no acotaba a quién, y contradecía en
su propia capability al requirement «Las caídas se detectan por alarma, no por reporte
humano», que fija un mínimo. Ese requirement sigue gobernando **qué** tiene que vigilar el
ambiente de producción; éste gobierna qué mira **la verificación de los pendientes**. Son
dos preguntas distintas, y la ambigüedad estaba en la segunda.

La verificación NO SHALL juzgar si la infraestructura resultante es correcta. Eso lo dicen
el plan de la herramienta de infraestructura, el review humano y el despliegue verificado.
Esta verificación acredita que los pendientes llegan decidibles, no que la respuesta sea
buena, y declararlo evita que su verde se lea como una garantía que no da.

#### Scenario: Un hueco de decisión sin su criterio
- **WHEN** un pendiente de decisión de la infraestructura del andamio declara qué falta pero no con qué criterio se decide
- **THEN** la verificación falla nombrando el pendiente y la parte que le falta

#### Scenario: Un pendiente sin momento declarado
- **WHEN** un pendiente de decisión de infraestructura, o uno de plataforma del catálogo de adaptadores, dice qué falta y con qué criterio se decide, pero no cuándo se resuelve
- **THEN** la verificación falla nombrando el pendiente y la parte que le falta, porque un pendiente sin momento no tiene quién lo reclame y se descubre cuando ya cuesta

#### Scenario: El pendiente de los logs falta en producción
- **WHEN** la raíz de producción no trae el pendiente de la retención y la clase del grupo de logs del servicio, aunque la de desarrollo sí lo traiga
- **THEN** la verificación falla nombrando la raíz, porque la clase no se puede cambiar después de crear el grupo y producción es el ambiente que no se puede rehacer

#### Scenario: El hueco de las alarmas en el ambiente equivocado
- **WHEN** el pendiente de las alarmas aparece en la raíz del ambiente de desarrollo
- **THEN** la verificación falla, porque las alarmas se exigen donde la caída le cuesta al negocio

#### Scenario: Un puntero que quedó huérfano
- **WHEN** se borra una sección de la infraestructura y un puntero de la raíz sigue nombrándola
- **THEN** la verificación falla señalando el puntero, para que la documentación de la raíz no sobreviva a lo que describía

#### Scenario: Un repositorio con todos sus huecos abiertos
- **WHEN** un repositorio recién nacido del andamio corre su integración con todos sus pendientes de decisión sin resolver, pero cada uno escrito con sus cuatro partes
- **THEN** la verificación pasa, porque lo que acredita es que los pendientes lleguen decidibles, no que estén decididos — y qué forma tome una señal sobre ellos no lo decide este requirement

#### Scenario: Un repositorio que no se despliega
- **WHEN** el repositorio declara que no despliega y no tiene raíces de infraestructura
- **THEN** ninguna verificación de este requirement emite señal sobre su infraestructura, porque no desplegar es un estado legítimo y la exigencia nace del despliegue

#### Scenario: Un proyecto que eligió sus propias alarmas
- **WHEN** un repositorio declara, ADEMÁS del mínimo que el ambiente de producción tiene que vigilar, otras alarmas cableadas al canal que vigilan lo que su negocio no puede dejar de saber, en una cantidad distinta a la de cualquier otro proyecto
- **THEN** ninguna verificación de este requirement lo pone en rojo por eso, porque lo que ella mira es que el pendiente de las alarmas exista donde corresponde y lleve su criterio, nunca cuáles ni cuántas — y el mínimo lo gobierna otro requirement, no éste

#### Scenario: Los pendientes resueltos con infraestructura equivocada
- **WHEN** los pendientes de decisión de infraestructura se resuelven pero la infraestructura declarada es incorrecta
- **THEN** esta verificación no lo detecta y el defecto lo caza el plan de la herramienta o el review humano, porque esta verificación acredita que los pendientes llegan decidibles y no que la respuesta sea correcta
