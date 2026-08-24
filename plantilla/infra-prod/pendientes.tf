# PENDIENTES DE DECISIÓN — ambiente de PRODUCCIÓN de {{PROYECTO}}
#
# Solo comentarios: no declara nada. Existe para que lo que falta decidir esté
# escrito donde se decide. Resuelto un pendiente, se borra su sección y lo
# decidido se escribe en un archivo propio. Sin pendientes, este archivo se borra.
#
# TODAVIA NO HAY COMPUERTA, y decirlo es parte del pendiente. El paso de
# marcadores del pipeline NO ve este token: la compuerta llega con el change del
# despliegue, que es cuando «este repositorio se despliega» se vuelve verificable.
# Hasta entonces esto es disciplina declarada, y se revisa a mano:
#
#     grep -rn PENDIENTE-INFRA infra infra-prod
#
# El motivo de no gatearlo ya: el requirement de este change exige que la
# verificacion sea INERTE para un repositorio que no se despliega, y un token que
# cuenta desde el dia uno no cumple eso — pondria rojo a un repo recien nacido por
# decisiones de infraestructura que todavia no puede tomar.
#
# Misma forma de tres partes que en dev, y la del medio es la que importa:
# QUÉ FALTA · CÓMO SE DECIDE · SI NO SE HACE.
#
# 🛑 Nada de acá se aplica sin el OK explícito de @{{BUILDER_1}} en la sesión.

# ---------------------------------------------------------------------------
# PENDIENTE-INFRA: 1 · El bucket del state de producción
#
# QUÉ FALTA   El nombre del bucket en el `backend "s3"` de `main.tf`.
#
# CÓMO SE DECIDE
#   No se crea: el área tiene un bucket por cuenta compartido por los roots de
#   sus aplicaciones, con `key` por proyecto —ya derivada—. Pedí el de la cuenta
#   {{CUENTA_PROD}}. Tiene que ser DISTINTO del de dev.
#   Igual que en dev: esto se parece más a un dato del área que a una decisión de
#   este proyecto; si lo resolvés a mano, anotalo.
#
# SI NO SE HACE   `terraform init` falla, y no hay riesgo de escribir el state en
#   el bucket de dev — que sería el modo de falla peligroso.
# ---------------------------------------------------------------------------

# ---------------------------------------------------------------------------
# PENDIENTE-INFRA: 2 · El identificador del cluster de base de datos
#
# QUÉ FALTA   El `cluster_identifier` del `data` de `main.tf`.
#
# CÓMO SE DECIDE
#   Un cluster por cuenta, una base por aplicación. Este proyecto no crea
#   cluster: hacerlo sale de la infraestructura base fijada, que es frontera ⚠️.
#   El nombre de la base derivalo de {{PROYECTO}}.
#   La conexión va con IAM, no con contraseña: el marco no guarda credenciales
#   rotativas de base, y una capturada como variable de entorno del deploy ya
#   tiró una aplicación del área.
#
# SI NO SE HACE   `plan` falla. Y "resolverlo" creando un cluster propio es
#   apartarse de la base fijada sin preguntar.
# ---------------------------------------------------------------------------

# ---------------------------------------------------------------------------
# PENDIENTE-INFRA: 3 · En qué subredes corre el servicio
#
# QUÉ FALTA   La topología de red del servicio, y si el balanceador mira a
#   internet.
#
# CÓMO SE DECIDE
#   Empezá por subredes privadas con salida por NAT y VERIFICÁ que funcione para
#   tu caso. No heredes la conclusión de otro proyecto en ninguna de las dos
#   direcciones: el consumidor de referencia terminó en subredes PÚBLICAS y lo
#   dejó escrito con su medición («con subnets privadas, `ingress_paths` queda
#   vacío — probado»), porque su servicio necesita un balanceador accesible desde
#   internet. Su `network.tf` es un buen EJEMPLO de cómo documentar una decisión
#   así, y no es una plantilla.
#
# SI NO SE HACE   El servicio no tiene dónde correr; y resuelto sin verificar, el
#   modo de falla es un servicio expuesto que no hacía falta exponer.
# ---------------------------------------------------------------------------

# ---------------------------------------------------------------------------
# PENDIENTE-INFRA: 4 · Dimensionamiento del cómputo y límites de autoescalado
#
# QUÉ FALTA   CPU y memoria de la tarea, cuántas en estado normal, y el mínimo y
#   el máximo del autoescalado.
#
# CÓMO SE DECIDE
#   La pregunta es de negocio: cuánta carga se espera y qué pasa si no alcanza.
#   Arrancá por el escalón más chico que la aplicación tolere y subí con
#   evidencia; al revés no se puede, porque una tarea sobredimensionada nunca da
#   señal de estarlo.
#   El límite MÁXIMO no es opcional: sin techo, un pico —o un bucle— escala hasta
#   donde aguante la tarjeta y el presupuesto se entera después.
#
# SI NO SE HACE   No hay servicio, y sin techo queda sin cumplir la garantía del
#   marco de que el gasto tiene presupuesto con aviso.
# ---------------------------------------------------------------------------

# ---------------------------------------------------------------------------
# PENDIENTE-INFRA: 5 · Certificado y zona de DNS
#
# QUÉ FALTA   El certificado de {{DOMINIO_PROD}} y el registro que lo apunta.
#
# CÓMO SE DECIDE
#   Averiguá primero si la zona y el certificado YA existen: si el área
#   administra el dominio padre, lo que falta es un registro y no una zona. Crear
#   una zona para un dominio cuya zona ya existe rompe la resolución de todo lo
#   que había — es el error más caro de esta lista, porque el daño es inmediato y
#   le pasa a otros proyectos, no a este.
#
# SI NO SE HACE   El servicio corre y no se llega por su nombre; sin certificado
#   no se cumple la garantía de TLS.
# ---------------------------------------------------------------------------

# ---------------------------------------------------------------------------
# PENDIENTE-INFRA: 6 · Si hace falta un programador de tareas
#
# QUÉ FALTA   Decidir si hay procesos periódicos, y declararlos si los hay.
#
# CÓMO SE DECIDE
#   ¿Hay algo que tenga que pasar sin que nadie lo dispare? Si no, **borrá esta
#   sección**: un programador sin tareas es una pieza que hay que mantener y que
#   no hace nada. Si sí, recordá que la entrega es AL MENOS UNA VEZ: el proceso
#   tiene que tolerar que se lo invoque dos veces con el mismo efecto, porque va a
#   pasar.
#
# SI NO SE HACE   Nada si el proyecto no los necesita — de ahí que borrar la
#   sección sea una salida legítima. Dejarla sin contestar, no.
# ---------------------------------------------------------------------------

# ---------------------------------------------------------------------------
# PENDIENTE-INFRA: 7 · LAS ALARMAS
#
# QUÉ FALTA
#   Las alarmas de este proyecto, cableadas al canal {{CANAL_ALERTAS}}.
#
# CÓMO SE DECIDE — y esta es la parte que no se puede copiar de nadie
#   El marco exige que EXISTAN y que avisen. **No exige cuáles ni cuántas**, y es
#   deliberado: un proyecto con tres alarmas bien elegidas cumple y uno con seis
#   copiadas de otro negocio no. Repartir una lista sería una cantidad esperada
#   disfrazada de ayuda, y el marco ya tiene escrito por qué un invariante con
#   número aborta trabajo sano.
#
#   La vara para elegirlas, en dos preguntas:
#     1. ¿QUÉ SE ROMPE QUE ALGUIEN TENGA QUE IR A ARREGLAR? Eso es una alarma.
#        Lo que se degrada y se recupera solo, no.
#     2. ¿DE QUÉ SE ENTERARÍA EL NEGOCIO ANTES QUE NOSOTROS? Esa es la alarma que
#        falta, y es la que duele: significa que el cliente es el monitoreo.
#
#   Dos que casi siempre califican, para arrancar pensando y no para copiar: que
#   el servicio no responda, y que los errores del servidor suban por encima de
#   su ruido normal. Lo específico del negocio de {{PROYECTO}} sale de la
#   pregunta 2 y lo contesta quien conoce el negocio, no quien escribe el
#   Terraform.
#
#   Y el contrato de niveles de log es parte de esto: `error` alerta, lo rutinario
#   —una autenticación fallida, un servicio externo caído— es `warn`. Subir un
#   rutinario a `error` no es prolijidad: es ruido que apaga la alarma real.
#
# SI NO SE HACE
#   Queda sin cumplir la garantía del marco de que **las caídas se detectan por
#   alarma y no por reporte humano**. En la práctica: la primera caída de
#   producción la descubre un usuario.
# ---------------------------------------------------------------------------
