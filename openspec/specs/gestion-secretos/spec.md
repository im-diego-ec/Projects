# gestion-secretos

## Purpose

Cómo viajan los secretos de runtime de un servicio del marco: nunca horneados
en la definición del servicio ni en el state de la infraestructura, siempre
inyectados por referencia a un gestor de secretos que el runtime resuelve al
arrancar cada tarea; y qué pasa cuando esas credenciales rotan — el servicio
vuelve a operar solo, sin intervención humana y sin quedar "sano" mientras
falla todo lo que depende de la credencial vieja.

## Requirements

### Requirement: Los secretos de runtime se inyectan por referencia, nunca horneados

Ningún secreto de runtime del servicio (credenciales de la base de datos,
claves privadas del proveedor de identidad, tokens de integraciones externas)
SHALL aparecer en texto plano en la definición de la tarea/servicio ni en el
state de la infraestructura como código, en ningún ambiente. Los secretos SHALL
declararse como referencias al gestor de secretos, que el runtime resuelve al
arrancar cada tarea, con el rol de ejecución autorizado a leerlas y
descifrarlas. Los valores públicos o no sensibles (claves públicas del
proveedor de identidad, origen web permitido, modo de ejecución) quedan como
variables de entorno normales.

#### Scenario: Definición de tarea sin secretos
- **WHEN** se inspecciona la definición de tarea activa del servicio en cualquier ambiente
- **THEN** los valores sensibles no son legibles: solo aparecen referencias al gestor de secretos

#### Scenario: State de infraestructura sin secretos
- **WHEN** se inspecciona el state de infraestructura de cualquier ambiente
- **THEN** no contiene los valores de esos secretos, solo sus referencias

#### Scenario: Arranque de tarea resuelve el secreto vigente
- **WHEN** una tarea nueva del servicio arranca (deploy, autoescalado o reemplazo por salud)
- **THEN** recibe el valor VIGENTE de cada secreto, sin requerir un apply de infraestructura ni edición manual

### Requirement: Una rotación de credenciales no interrumpe el servicio

Cuando el secreto administrado de la base de datos rota, el servicio SHALL
volver a operar con la credencial nueva sin intervención humana. El mecanismo
(reciclaje de tareas al evento de rotación, health check que detecta la
credencial inválida, o reconexión con re-lectura del secreto) se define en el
design de cada proyecto; el resultado observable es el mismo.

#### Scenario: Rotación de la credencial administrada de la base
- **WHEN** el proveedor rota la credencial administrada de la base de datos
- **THEN** dentro de una ventana breve y acotada (definida en design) todas las tareas del servicio operan con la credencial nueva, sin errores de autenticación sostenidos y sin intervención manual

#### Scenario: Tarea con conexiones inválidas no queda sirviendo indefinidamente
- **WHEN** una tarea queda incapaz de abrir conexiones nuevas a la base por credencial inválida
- **THEN** el sistema la detecta y la reemplaza — no permanece "sana" ante el health check mientras falla toda operación que toca la base
