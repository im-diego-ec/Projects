# PENDIENTES DE DECISIÓN — ambiente de PRODUCCIÓN de {{PROYECTO}}
#
# ANTES QUE TODO: ESTOS OCHO PENDIENTES SON DEL ADAPTADOR `aws`. El marco fija
# cuatro capacidades y no una nube; las cinco plataformas admitidas, con su plan
# gratuito medido, están en `../infra/adaptadores.md`. Si la plataforma de este
# proyecto no es `aws`, este directorio se borra entero y lo que hay que contestar
# son los pendientes del adaptador elegido.
#
# Solo comentarios: no declara nada. Existe para que lo que falta decidir esté
# escrito donde se decide. Resuelto un pendiente, se borra su sección y lo
# decidido se escribe en un archivo propio. Sin pendientes, este archivo se borra.
#
# ESTOS PENDIENTES NO TIENEN COMPUERTA, y decirlo es parte del pendiente. El paso
# de marcadores del pipeline NO ve este token, a propósito: un token que contara
# desde el día uno pondría rojo a un repositorio recién nacido por decisiones de
# infraestructura que todavía no puede tomar. Si el marco llega a emitir una señal
# sobre ellos —aviso o rojo, todavía no está decidido— llega con una versión nueva
# y su CHANGELOG lo dice. Hasta entonces esto es disciplina declarada, y se revisa
# a mano:
#
#     grep -rn PENDIENTE-INFRA infra infra-prod
#
# Misma forma de CUATRO partes que en dev, y la segunda es la que importa:
# QUÉ FALTA · CÓMO SE DECIDE · CUÁNDO SE RESUELVE · SI NO SE HACE.
#
# 🛑 Nada de acá se aplica sin el OK explícito de @{{BUILDER_1}} en la sesión.

# ---------------------------------------------------------------------------
# PENDIENTE-INFRA: 1 · El bucket del state de producción
#
# QUÉ FALTA   El nombre del bucket en el `backend "s3"` de `main.tf`.
#
# CÓMO SE DECIDE
#   Igual que en dev, según lo que la organización ya tenga en la cuenta
#   {{CUENTA_PROD}}: un bucket de state que comparten otros roots —la `key` por
#   proyecto ya está derivada— o ninguno, y entonces crearlo es infraestructura
#   base que se pregunta antes. Tiene que ser DISTINTO del de dev.
#   Si ya existe, es un dato de la organización y no una decisión de este
#   proyecto; si lo resolvés a mano, anotalo.
#
# CUÁNDO SE RESUELVE   Al levantar PRODUCCIÓN por primera vez, antes que los demás
#   que se resuelven ese día y por el mismo motivo que en dev: sin él no corre
#   `init`. Verificá que sea DISTINTO del de dev ANTES del primer `init`.
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
#   Igual que en dev: este root lee un cluster y no lo crea. Si la organización
#   ya tiene uno en la cuenta de producción, pedí su identificador; si no, crearlo
#   es infraestructura base (frontera ⚠️) y se pregunta antes. Una base por
#   aplicación: el nombre de la base derivalo de {{PROYECTO}}.
#   La conexión va con IAM, no con contraseña: el marco no guarda credenciales
#   rotativas de base, y una capturada como variable de entorno del deploy ya
#   tiró una aplicación del área.
#
# CUÁNDO SE RESUELVE   Con el 1, y con las mismas dos tareas humanas del pendiente
#   2 de dev —la base y su usuario dentro del cluster, y el grupo de seguridad en
#   el puerto del motor—. En producción, además, cualquier escritura exige el OK
#   explícito de Builder 1.
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
#   direcciones: un consumidor terminó en subredes PÚBLICAS y lo dejó
#   escrito con su medición («con subnets privadas, `ingress_paths` queda
#   vacío — probado»), porque su servicio necesita un balanceador accesible desde
#   internet. Su `network.tf` es un buen EJEMPLO de cómo documentar una decisión
#   así, y no es una plantilla.
#
# CUÁNDO SE RESUELVE   Con el 1. Y la respuesta de dev NO se traslada: si en dev
#   corriste en subredes públicas por falta de salida, acá eso es una decisión
#   distinta y con su propia verificación.
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
#   OJO CON EL CÓMPUTO ADMINISTRADO, igual que en dev: si la plataforma trae CPU y
#   memoria por defecto, siguen siendo una palanca. Dejarlos en el default es una
#   respuesta legítima que se ESCRIBE como decisión, no una razón para borrar
#   este pendiente.
#
# CUÁNDO SE RESUELVE   Con el 1, y con el dato que dev no puede dar: acá el
#   dimensionamiento se decide contra el uso esperado, no contra el de un
#   ambiente sin usuarios.
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
# CUÁNDO SE RESUELVE   Se EMPIEZA PRIMERO, igual que en dev y por el mismo motivo:
#   los registros que carga una persona fuera de la nube tienen un tiempo de
#   respuesta ajeno.
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
# CUÁNDO SE RESUELVE   Con el 6 de dev: es la misma pregunta al PO y se
#   contesta una sola vez, antes de tocar infraestructura.
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
#   Hay un PISO que no se elige. El marco exige que producción vigile, como
#   mínimo, tres cosas —el contrato es `operacion-infra` · «Las caídas se
#   detectan por alarma, no por reporte humano»—, y las exige por lo que
#   detectan, no por el producto que las implementa:
#     a. que el servicio deje de responder, o responda con errores del servidor
#        de forma sostenida;
#     b. que el proceso se caiga y se reinicie —o se reemplace— en bucle;
#     c. que el log registre los niveles de alerta (en este adaptador, un filtro
#        de métrica sobre el grupo de logs del pendiente 8).
#   Las tres avisan al canal. Cómo se arma cada una es de este adaptador; que
#   existan, no.
#
#   Por ENCIMA del piso, el marco **no exige cuáles ni cuántas**, y es
#   deliberado: un proyecto con tres alarmas propias bien elegidas cumple y uno
#   con seis copiadas de otro negocio no. Repartir una lista más larga sería una
#   cantidad esperada disfrazada de ayuda, y el marco ya tiene escrito por qué un
#   invariante con número aborta trabajo sano.
#
#   La vara para elegir las que van por encima del piso, en dos preguntas:
#     1. ¿QUÉ SE ROMPE QUE ALGUIEN TENGA QUE IR A ARREGLAR? Eso es una alarma.
#        Lo que se degrada y se recupera solo, no.
#     2. ¿DE QUÉ SE ENTERARÍA EL NEGOCIO ANTES QUE NOSOTROS? Esa es la alarma que
#        falta, y es la que duele: significa que el cliente es el monitoreo.
#
#   Lo específico del negocio de {{PROYECTO}} sale de la pregunta 2 y lo contesta
#   quien conoce el negocio, no quien escribe el Terraform.
#
#   Y el contrato de niveles de log es parte de esto: `error` alerta, lo rutinario
#   —una autenticación fallida, un servicio externo caído— es `warn`. Subir un
#   rutinario a `error` no es prolijidad: es ruido que apaga la alarma real.
#
# CUÁNDO SE RESUELVE
#   ANTES de la primera promoción a producción, no después: una alarma que se
#   agrega después del primer incidente llega tarde por definición. Y DESPUÉS del
#   pendiente 8, porque la tercera del piso se monta sobre ese grupo de logs.
#
# SI NO SE HACE
#   Queda sin cumplir la garantía del marco de que **las caídas se detectan por
#   alarma y no por reporte humano**. En la práctica: la primera caída de
#   producción la descubre un usuario.
# ---------------------------------------------------------------------------

# ---------------------------------------------------------------------------
# PENDIENTE-INFRA: 8 · La retención y la clase del grupo de logs del servicio
#
# QUÉ FALTA   El `aws_cloudwatch_log_group` del servicio de producción, con
#   `retention_in_days` y `log_group_class` declarados a propósito.
#
# CÓMO SE DECIDE
#   La retención, por lo acordado para el ambiente — y en PRODUCCIÓN la ventana
#   la fija el tiempo que tarda en aparecer un problema que haya que
#   reconstruir, no el gusto. Omitirla no vale: el default es «nunca expira», y
#   eso es costo creciente que nadie ve.
#
#   La clase, en producción, casi no se elige: es `STANDARD`. Dos cosas que este
#   ambiente necesita NO existen en `INFREQUENT_ACCESS` (tabla de clases de la
#   documentación de CloudWatch, medida el 2026-09-17):
#     · los FILTROS DE MÉTRICA, que es como este adaptador arma la alarma de los
#       niveles de alerta del log — parte del piso del pendiente 7;
#     · `GetLogEvents` y `FilterLogEvents`, que es como se investiga un
#       incidente con `aws logs filter-log-events`.
#   Declarala EXPLÍCITA igual, aunque `STANDARD` sea el default: un default no
#   dice qué se decidió, y esta decisión no se puede rehacer.
#
# CUÁNDO SE RESUELVE   AL CREAR EL GRUPO, y antes que las alarmas del pendiente
#   7 que dependen de él: la clase no se puede cambiar después de creado el
#   grupo, y corregirla exige destruirlo — en producción, perder la historia con
#   la que se investiga un incidente.
#
# SI NO SE HACE   Sin retención, el grupo nunca expira y el costo crece sin
#   señal. Con la clase equivocada, la alarma de los niveles de alerta no se
#   puede montar sobre ese grupo y el primer incidente se investiga sin
#   `filter-log-events`: el arreglo no es un permiso, es recrear el grupo.
#   Contra el contrato del marco: `operacion-infra` · «Higiene operativa de logs
#   y TLS».
# ---------------------------------------------------------------------------
