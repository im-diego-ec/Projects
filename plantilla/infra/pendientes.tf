# PENDIENTES DE DECISIÓN — ambiente de DESARROLLO de {{PROYECTO}}
#
# ANTES QUE TODO: ESTOS SIETE PENDIENTES SON DEL ADAPTADOR `aws`. El marco ya no
# fija la nube — fija cuatro capacidades (dónde corre la API, dónde vive la base,
# cómo se resuelven los secretos en el arranque de cada tarea, y cómo se despliega
# y se verifica lo desplegado) y deja que el proyecto elija quién se las da. Las
# cinco plataformas admitidas, con su plan gratuito medido, están en
# `adaptadores.md`, al lado de este archivo.
#
# Si la plataforma de este proyecto NO es `aws`, no se resuelve ninguno de estos
# siete: se borra este directorio entero junto con `../infra-prod/`, y lo que hay
# que contestar son los pendientes del adaptador elegido. El CI no exige raíces de
# Terraform que no existan.
#
# Este archivo es solo comentarios: no declara nada y Terraform lo parsea sin
# efecto. Existe para que lo que falta decidir esté escrito donde se decide, y
# para que el agente lo lea en cada sesión. Cuando resolvés un pendiente, borrás
# su sección y escribís lo que decidiste en un archivo propio. Cuando no queda
# ninguno, este archivo se borra entero.
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
# Cada pendiente tiene la misma forma de CUATRO partes, y la segunda es la que
# importa:
#
#   QUÉ FALTA           · qué hay que crear o elegir
#   CÓMO SE DECIDE      · la vara, para que no haga falta haber diseñado la
#                         infraestructura del área para poder resolverlo
#   CUÁNDO SE RESUELVE  · en qué momento del proyecto se contesta: un pendiente
#                         con criterio y sin momento se lee como trabajo futuro
#                         sin dueño, y el trabajo futuro sin dueño no se hace
#   SI NO SE HACE       · qué garantía del marco queda sin cumplir
#
# Lo que NO hay acá son las respuestas de otro proyecto. El consumidor de
# referencia del área resolvió cada uno de estos puntos con sus propias
# restricciones, y varias de sus respuestas están razonadas contra mediciones
# suyas. Copiadas sin su razón se convierten en decisiones que nadie tomó y que
# se leen como si alguien las hubiera tomado. Donde su código sirve de ejemplo,
# está citado como ejemplo.

# ---------------------------------------------------------------------------
# PENDIENTE-INFRA: 1 · El bucket del state
#
# QUÉ FALTA
#   El nombre del bucket de S3 donde vive el state de este root, en el
#   `backend "s3"` de `main.tf`.
#
# CÓMO SE DECIDE
#   Depende de lo que tu organización ya tenga en la cuenta {{CUENTA_DEV}}, y eso
#   se pregunta antes de escribir nada:
#   · Si ya hay un bucket de state que comparten los roots de otras aplicaciones,
#     este root va ahí: la `key` ya está puesta y derivada del nombre del
#     proyecto, así que no pisa a nadie. Pedí el nombre a quien administra la
#     cuenta, o leelo del `main.tf` de otro proyecto que ya esté desplegado.
#   · Si no hay, el bucket es infraestructura base de la cuenta y no de este
#     proyecto: se crea una vez, fuera de este root, y crearla se pregunta antes
#     (frontera ⚠️).
#
#   Ojo: en el primer caso esto se parece más a un DATO de la organización que a
#   una decisión de este proyecto. Si te toca resolverlo a mano, decilo en el
#   registro de la adopción: el arreglo de fondo es que el andamio lo sustituya
#   como valor y este pendiente deje de existir.
#
# CUÁNDO SE RESUELVE
#   Al levantar el ambiente de dev por primera vez, y antes que los demás que se
#   resuelven ese día: sin el bucket no corre `terraform init`, y sin `init` no se
#   puede probar ninguno de los otros. Preguntá apenas se decida levantar dev: si
#   el bucket existe, el dato lo tiene quien administra la cuenta y no quien
#   escribe el Terraform; si no existe, crearlo es la primera tarea de ese día.
#
# SI NO SE HACE
#   `terraform init` falla. No hay riesgo de crear un state en el lugar
#   equivocado, y eso es deliberado: el marcador está DENTRO del valor.
# ---------------------------------------------------------------------------

# ---------------------------------------------------------------------------
# PENDIENTE-INFRA: 2 · El identificador del cluster de base de datos
#
# QUÉ FALTA
#   El `cluster_identifier` del `data "aws_rds_cluster" "compartido"` de
#   `main.tf`.
#
# CÓMO SE DECIDE
#   Este root LEE un cluster (`data`), no lo crea: cada aplicación vive como una
#   base dentro de un cluster, y un cluster por aplicación multiplica el costo
#   fijo. Cuál, depende de lo que tu organización ya tenga:
#   · Si ya hay un cluster en la cuenta, pedí su identificador; el nombre de la
#     base de este proyecto derivalo de {{PROYECTO}}.
#   · Si no hay, el cluster es infraestructura base: se decide y se pregunta antes
#     (frontera ⚠️), se crea fuera de este root, y este root lo lee igual.
#
#   Vale la misma nota que el pendiente 1: si el cluster ya existe, es un dato de
#   la organización y no una decisión de este proyecto.
#
# CUÁNDO SE RESUELVE
#   Junto con el 1. Y el mismo día conviene pedir las dos tareas HUMANAS que
#   arrastra y que ningún Terraform de este root hace: crear la base de este
#   proyecto y su usuario dentro del cluster, y autorizar el grupo de seguridad de
#   las tareas en el puerto del motor. Sin esas dos, el servicio levanta y no
#   conecta, y el fallo aparece recién en runtime.
#
# SI NO SE HACE
#   `plan` falla al no encontrar el cluster. Y si alguien lo "resuelve" creando
#   un cluster dentro de este root, mete infraestructura base en un proyecto sin
#   haberlo preguntado.
# ---------------------------------------------------------------------------

# ---------------------------------------------------------------------------
# PENDIENTE-INFRA: 3 · En qué subredes corre el servicio
#
# QUÉ FALTA
#   Decidir la topología de red del servicio y declararla: qué subredes usan las
#   tareas, y si el balanceador mira a internet o no.
#
# CÓMO SE DECIDE
#   Empezá por la respuesta conservadora —subredes privadas con salida por NAT—,
#   y VERIFICÁ que funcione para tu caso antes de darla por buena. No la asumas
#   en ninguna de las dos direcciones: un consumidor del área terminó en
#   subredes PÚBLICAS y lo dejó escrito con su medición
#   («con subnets privadas, `ingress_paths` queda vacío — probado»), porque su
#   servicio necesita un balanceador accesible desde internet. Puede que a este
#   proyecto le pase lo mismo y puede que no; lo que no se puede es heredar la
#   conclusión sin la prueba.
#
#   Su `infra-prod/network.tf` sirve de EJEMPLO de cómo se documenta una decisión
#   así. No sirve de plantilla.
#
# CUÁNDO SE RESUELVE
#   Junto con el 1 y el 2. Se responde MIRANDO la cuenta, no eligiendo: si no hay
#   salida a internet para subredes sin IP pública, la respuesta conservadora no
#   está disponible, y hay que decirlo en vez de descubrirlo con el servicio caído.
#
# SI NO SE HACE
#   El servicio no tiene dónde correr. Y resuelto sin verificar, el modo de falla
#   típico es un balanceador que responde en local y no desde afuera, o al revés
#   un servicio expuesto que no hacía falta exponer.
# ---------------------------------------------------------------------------

# ---------------------------------------------------------------------------
# PENDIENTE-INFRA: 4 · El dimensionamiento del cómputo y los límites de autoescalado
#
# QUÉ FALTA
#   CPU y memoria de la tarea, cuántas corren en estado normal, los límites
#   mínimo y máximo del autoescalado, y la ARQUITECTURA del cómputo
#   (`runtime_platform.cpu_architecture`: X86_64 o ARM64).
#
# LA ARQUITECTURA SE DECIDE EN DOS ARCHIVOS A LA VEZ
#   ARQUITECTURA DE HOY: linux/amd64 (X86_64) — la fija api/Dockerfile.
#
#   Esa línea de arriba tiene forma fija porque se compara con máquina: es la
#   única declaración del lado de infra que el banco puede leer, y la prosa que
#   sigue nombra las DOS arquitecturas —tiene que hacerlo, porque explica cuándo
#   se cambia—, así que «el archivo menciona ARM64» no distinguiría nada.
#
#   La imagen del API se construye con `FROM --platform=linux/amd64` fijo
#   en api/Dockerfile, y esa línea existe justamente para que la
#   imagen no herede la arquitectura de la máquina de quien construye. Si acá se
#   declara ARM64 —es más barato por hora en Fargate, y es la razón por la que
#   alguien va a querer cambiarlo— el `--platform` de api/Dockerfile pasa a
#   linux/arm64 EN EL MISMO COMMIT. Los dos valores son uno solo escrito dos
#   veces: si divergen, la tarea muere al arrancar con "exec format error", un
#   mensaje que no nombra la arquitectura y que se termina buscando en el código
#   de la aplicación. El acople lo vigila
#   pruebas/andamio/acoples-del-andamio.test.mjs, que exige que este pendiente
#   siga nombrando la arquitectura y que la nombre igual que el Dockerfile.
#
# CÓMO SE DECIDE
#   Es decisión de NEGOCIO disfrazada de decisión técnica: la pregunta es cuánta
#   carga se espera y qué pasa si no alcanza. Arrancá por el escalón más chico
#   que la aplicación tolere y subí con evidencia; al revés no se puede, porque
#   una tarea sobredimensionada nunca da señal de estarlo.
#
#   El límite MÁXIMO no es opcional y no es una formalidad: sin techo, un pico
#   —o un bucle— escala hasta donde la tarjeta aguante, y el presupuesto se
#   entera después. En dev el techo es especialmente bajo a propósito.
#
#   OJO CON EL CÓMPUTO ADMINISTRADO. Si la forma de cómputo elegida trae CPU y
#   memoria por defecto, es tentador concluir que «dejaron de ser una palanca».
#   Es falso: se siguen pudiendo fijar. Dejarlos en el default es una respuesta
#   legítima, y hay que ESCRIBIRLA como decisión —con el motivo— en vez de borrar
#   este pendiente por imposible.
#
# CUÁNDO SE RESUELVE
#   Al levantar dev, y es el último de los que se deciden solos: ningún otro
#   depende de él. Conviene resolverlo cuando ya se sabe qué va a correr ahí.
#
# SI NO SE HACE
#   No hay servicio. Y sin límite máximo queda sin cumplir la garantía del marco
#   de que el gasto tiene presupuesto con aviso.
# ---------------------------------------------------------------------------

# ---------------------------------------------------------------------------
# PENDIENTE-INFRA: 5 · El certificado y la zona de DNS
#
# QUÉ FALTA
#   El certificado de {{DOMINIO_DEV}} y el registro que lo apunta al servicio.
#
# CÓMO SE DECIDE
#   Primero averiguá si la zona y el certificado YA existen para ese dominio: si
#   el área ya administra el dominio padre, lo que falta es un registro y no una
#   zona nueva. Crear una zona para un dominio cuya zona ya existe rompe la
#   resolución de todo lo que había, y es el error más caro de esta lista porque
#   el daño es inmediato y ajeno a este proyecto.
#
# CUÁNDO SE RESUELVE
#   Se EMPIEZA PRIMERO —antes incluso que el 1— aunque se cierre último. Si la
#   zona del dominio vive fuera de la nube, hace falta que una persona cargue
#   registros a mano en el panel de su proveedor, y eso tiene un tiempo de
#   respuesta ajeno. Pedilo el primer día aunque el certificado se emita después.
#
# SI NO SE HACE
#   El servicio corre y no se puede llegar por su nombre. Sin certificado, el
#   marco no cumple su garantía de TLS verificado.
# ---------------------------------------------------------------------------

# ---------------------------------------------------------------------------
# PENDIENTE-INFRA: 6 · Si hace falta un programador de tareas
#
# QUÉ FALTA
#   Decidir si este proyecto tiene procesos periódicos, y si los tiene,
#   declararlos.
#
# CÓMO SE DECIDE
#   La pregunta es del negocio: ¿hay algo que tenga que pasar sin que nadie lo
#   dispare? Si la respuesta es no, **borrá esta sección** y no agregues nada: un
#   programador sin tareas es una pieza que hay que mantener y que no hace nada.
#
#   Y si la respuesta es sí, hay una regla dura del marco que aplica acá y que
#   costó un incidente: un proceso periódico en DEV no puede contactar usuarios
#   reales. El modo real de las integraciones salientes exige ambiente de
#   producción como guard en el código, no como convención.
#
# CUÁNDO SE RESUELVE
#   ANTES de tocar infraestructura, porque no lo contesta quien escribe Terraform
#   sino el PO: se lee el spec del producto y se busca si algo tiene que pasar
#   sin que nadie lo dispare. Si la respuesta es no, esta sección se borra y listo.
#
# SI NO SE HACE
#   Nada, si el proyecto no los necesita — de ahí que la salida legítima sea
#   borrar la sección. Lo que no es legítimo es dejarla sin contestar.
# ---------------------------------------------------------------------------

# ---------------------------------------------------------------------------
# PENDIENTE-INFRA: 7 · La retención y la clase del grupo de logs del servicio
#
# QUÉ FALTA
#   El `aws_cloudwatch_log_group` del servicio, con DOS atributos declarados a
#   propósito: `retention_in_days` y `log_group_class`.
#
# CÓMO SE DECIDE
#   La retención, por lo acordado para el ambiente. En DEV alcanza una ventana
#   corta; lo que no vale es omitirla, porque el default de CloudWatch es «nunca
#   expira» y eso es costo creciente que nadie ve.
#
#   La clase es la que tiene trampa, y se elige MIRANDO qué va a leer ese grupo.
#   `INFREQUENT_ACCESS` cobra menos por la ingesta y a cambio NO admite filtros
#   de métrica, filtros de suscripción, Live Tail ni las operaciones
#   `GetLogEvents` y `FilterLogEvents`: sólo se consulta con Logs Insights (tabla
#   de clases de la documentación de CloudWatch, medida el 2026-09-17). Así que:
#
#     · si algo va a leer el grupo con esas operaciones —una verificación del
#       pipeline, o `aws logs filter-log-events`, que es como investiga un runbook
#       del área— o va a derivar una métrica de él, la clase es `STANDARD`;
#     · si sólo se va a consultar con Logs Insights, Infrequent Access es una
#       elección legítima y más barata.
#
#   La pregunta no es «cuál es mejor»: es «qué va a leer este grupo». Declarala
#   EXPLÍCITA en los dos casos, aunque `STANDARD` sea el default: un default no
#   dice qué se decidió, y esta decisión no se puede rehacer.
#
# CUÁNDO SE RESUELVE
#   AL CREAR EL GRUPO, y no hay segunda oportunidad: la clase de un grupo de
#   logs no se puede cambiar después de creado («after a log group is created,
#   its log class can't be changed»). Corregirla exige DESTRUIR y recrear el
#   grupo, con la pérdida de todo lo que tenga adentro. Es el único pendiente de
#   este archivo cuya ventana se cierra sola.
#
# SI NO SE HACE
#   Sin retención: el grupo nunca expira y el costo crece sin señal.
#
#   Con la clase equivocada: la lectura que se necesitaba no existe para ese
#   grupo, y el arreglo NO es un permiso ni una configuración: es recrear el
#   grupo.
#
#   Contra el contrato del marco: `operacion-infra` · «Higiene operativa de logs
#   y TLS». El marco no verifica el recurso —el andamio no lo reparte, así que
#   no hay nada que leer— y por eso está escrito acá, que es donde llega antes de
#   que el grupo exista.
# ---------------------------------------------------------------------------

# En DEV no hay pendiente de ALARMAS, y es una decisión declarada, no un olvido:
# ver el README de este directorio.
