# operacion-infra — Delta

## ADDED Requirements

### Requirement: La infraestructura de un repositorio desplegable vive en su árbol, y lo que falta es compuerta

Un repositorio que se despliega SHALL tener su infraestructura como código en su propio
árbol, en los directorios que la constitución del área nombra, y NO SHALL depender de que
alguien recuerde crearlos. El andamio SHALL entregarlos.

Cada pieza que tiene que existir SHALL llegar como un **hueco de decisión**, y cada hueco
SHALL declarar tres cosas: qué falta, **con qué criterio se decide**, y qué queda sin
garantía si no se hace. El criterio no es cortesía: un hueco que solo dice qué falta lo
puede resolver únicamente quien ya sabía la respuesta, y el marco existe para que el
criterio técnico no dependa de eso.

La verificación SHALL fallar mientras sobreviva un hueco sin resolver, y SHALL ser inerte
para un repositorio que no se despliega: la exigencia nace del despliegue, no de la
existencia del repositorio.

Lo que se exige de las alarmas SHALL ser **que existan y estén cableadas al canal de
alertas**, y NO SHALL ser cuáles ni cuántas. Qué vigilar es del negocio de cada proyecto,
y una cantidad esperada pondría en rojo a un proyecto que eligió bien.

La verificación NO SHALL juzgar si la infraestructura resultante es correcta. Eso lo dicen
el plan de la herramienta de infraestructura, el review humano y el despliegue verificado.
Esta compuerta acredita que los huecos **fueron atendidos**, no que la respuesta sea buena,
y declararlo evita que su verde se lea como una garantía que no da.

#### Scenario: Un repositorio nuevo antes de resolver su infraestructura
- **WHEN** un repositorio nacido del andamio corre su primera integración con huecos de infraestructura sin resolver
- **THEN** el pipeline falla nombrando cada hueco junto con el criterio con el que se decide, de modo que quien lo lea pueda resolverlo sin haber diseñado la infraestructura del área

#### Scenario: Un repositorio que no se despliega
- **WHEN** el repositorio no tiene despliegue
- **THEN** la verificación no emite ninguna señal sobre su infraestructura, porque la exigencia nace del despliegue y ningún repositorio que hoy pasa empieza a fallar por la existencia de esta regla

#### Scenario: Un proyecto que eligió sus propias alarmas
- **WHEN** un repositorio declara alarmas cableadas al canal de alertas que vigilan lo que su negocio no puede dejar de saber, en una cantidad distinta a la de cualquier otro proyecto del área
- **THEN** la verificación pasa, porque lo que se exige es que existan y avisen, nunca cuáles ni cuántas

#### Scenario: Los huecos resueltos con infraestructura equivocada
- **WHEN** los huecos de decisión se resuelven pero la infraestructura declarada es incorrecta
- **THEN** esta verificación pasa y el defecto lo caza el plan de la herramienta o el review humano, porque la compuerta acredita atención y no corrección
