# operacion-infra

## Purpose

Las garantías operativas de la infraestructura de un proyecto del marco: el
state de la infraestructura como código vive en un backend remoto compartido
con versionado y lock; las caídas se detectan por alarma y no por reporte
humano; el gasto tiene presupuesto con aviso; los datos de producción están
protegidos contra pérdida y tienen un runbook de restore verificado; y la
higiene operativa —retención explícita de logs y TLS verificado hacia la
base— no queda al criterio de quien creó el recurso.

## Requirements

### Requirement: El state de la infraestructura vive en un backend remoto compartido

Todos los roots de infraestructura como código SHALL usar un backend remoto con
versionado, cifrado y lock, de modo que cualquier operador autorizado pueda
planear y aplicar sin depender de archivos locales de otra persona. El acceso
al backend del state SHALL estar restringido por IAM.

#### Scenario: Apply desde una máquina nueva
- **WHEN** un operador autorizado clona el repositorio en una máquina limpia e inicializa y planea cualquier root de infraestructura
- **THEN** obtiene el state actual desde el backend remoto y el plan refleja la infra real, sin re-creaciones fantasma

#### Scenario: Applies concurrentes
- **WHEN** dos operadores intentan aplicar a la vez sobre el mismo root
- **THEN** el lock del backend bloquea al segundo hasta que el primero termina

### Requirement: Las caídas se detectan por alarma, no por reporte humano

El ambiente de producción SHALL tener alarmas que cubran como mínimo: errores
5xx sostenidos del endpoint público del servicio, reinicios o reemplazos
anómalos de las instancias de cómputo, y ocurrencias de los niveles de alerta
en el log de la aplicación (vía filtro de métrica). Las alarmas SHALL notificar
por push a un canal que el equipo lee.

#### Scenario: Ciclo de reinicios del servicio
- **WHEN** las instancias del servicio entran en un ciclo de caída y reemplazo
- **THEN** llega una notificación al canal del equipo dentro de los minutos siguientes, sin que ningún usuario haya reportado nada

#### Scenario: Errores de aplicación sin caída
- **WHEN** el log del servicio registra una condición fatal o una tasa anómala de errores que no mata el proceso
- **THEN** el filtro de métrica dispara la alarma correspondiente

### Requirement: El gasto tiene un presupuesto con alerta

La cuenta de producción SHALL tener un presupuesto mensual con notificación al
superar sus umbrales (gasto real y proyectado), coherente con la justificación
de costo de la arquitectura.

#### Scenario: Desviación de costo
- **WHEN** el gasto real o proyectado del mes supera el umbral configurado
- **THEN** el equipo recibe la notificación del presupuesto

### Requirement: Los datos de producción están protegidos contra pérdida

La base de datos de producción SHALL tener protección contra eliminación
activa, retención de backups automáticos mayor a un día, cifrado en reposo, y
un runbook de restore documentado y verificado —incluyendo el caso de
restaurar una sola base cuando el cluster es compartido con otros proyectos.

#### Scenario: Eliminación accidental
- **WHEN** alguien intenta eliminar la base de producción (consola, CLI o destroy de infraestructura)
- **THEN** la operación es rechazada mientras la protección contra eliminación esté activa

#### Scenario: Recuperación ante corrupción de datos
- **WHEN** se necesita restaurar la base a un punto anterior
- **THEN** existe un backup dentro del período de retención configurado y un runbook con los pasos verificados para hacerlo

### Requirement: Higiene operativa de logs y TLS

Los grupos de logs del servicio SHALL tener retención explícita —declarada en
la infraestructura como código, nunca "sin expiración" por omisión— y la
política de retención SHALL ser la acordada para cada ambiente. La conexión del
servicio a la base de datos SHALL validar el certificado del servidor contra la
cadena de autoridad del proveedor, sin modos que omitan esa verificación.

#### Scenario: Retención de logs configurada
- **WHEN** se inspeccionan los grupos de logs del servicio en cualquier ambiente
- **THEN** tienen una retención explícita, declarada en la infraestructura como código y acorde a lo acordado para ese ambiente

#### Scenario: Conexión TLS verificada
- **WHEN** el servicio abre una conexión a la base de datos en producción
- **THEN** la conexión valida la cadena de certificados del servidor y falla si no puede verificarla

### Requirement: El andamio entrega los huecos de decisión de infraestructura con su criterio

El andamio SHALL entregar las raíces de infraestructura como código del
repositorio, y NO SHALL dejar que existan por acuerdo verbal: un repositorio que
nace del andamio las recibe.

Cada pieza que todavía no se puede decidir SHALL llegar como un **hueco de
decisión** que declara tres cosas: qué falta, **con qué criterio se decide**, y
qué queda sin garantía si no se resuelve. Un hueco que solo dice qué falta lo
puede resolver únicamente quien ya sabía la respuesta.

Lo que se exige de las alarmas SHALL ser que su hueco viva en la raíz del
ambiente que las necesita y NO SHALL ser cuáles ni cuántas: qué vigilar es del
negocio de cada proyecto, y una cantidad esperada pondría en rojo a un proyecto
que eligió bien.

La verificación SHALL fallar cuando un hueco pierda cualquiera de sus tres
partes, cuando su numeración deje de ser correlativa, cuando un puntero de la
raíz apunte a una sección que ya no existe, o cuando un hueco de un ambiente
aparezca en la raíz de otro.

**Lo que este requirement NO exige todavía, dicho para que su verde no se lea
como lo que no es:** que el hueco esté RESUELTO. Esa compuerta necesita que
«este repositorio se despliega» sea verificable, y hasta que exista, un
repositorio recién nacido pasa con todos sus huecos abiertos — lo que se acredita
es que lleguen escritos de forma que alguien pueda resolverlos.

#### Scenario: Un hueco de decisión sin su criterio
- **WHEN** un hueco de decisión de la infraestructura del andamio declara qué falta pero no con qué criterio se decide
- **THEN** la verificación falla nombrando el hueco y la parte que le falta

#### Scenario: El hueco de las alarmas en el ambiente equivocado
- **WHEN** el hueco de las alarmas aparece en la raíz del ambiente de desarrollo
- **THEN** la verificación falla, porque las alarmas se exigen donde la caída le cuesta al negocio

#### Scenario: Un puntero que quedó huérfano
- **WHEN** se borra una sección de la infraestructura y un puntero de la raíz sigue nombrándola
- **THEN** la verificación falla señalando el puntero, para que la documentación de la raíz no sobreviva a lo que describía

#### Scenario: Un repositorio con todos sus huecos abiertos
- **WHEN** un repositorio recién nacido del andamio corre su integración con todos sus huecos de decisión sin resolver, pero cada uno escrito con sus tres partes
- **THEN** la verificación pasa, porque lo que acredita hoy es que los huecos lleguen decidibles, no que estén decididos
