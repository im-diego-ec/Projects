# PENDIENTES DE DECISIÓN — ambiente de DESARROLLO de {{PROYECTO}}
#
# Este archivo es solo comentarios: no declara nada y Terraform lo parsea sin
# efecto. Existe para que lo que falta decidir esté escrito donde se decide, y
# para que el agente lo lea en cada sesión. Cuando resolvés un pendiente, borrás
# su sección y escribís lo que decidiste en un archivo propio. Cuando no queda
# ninguno, este archivo se borra entero.
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
# Cada pendiente tiene la misma forma, y la del medio es la que importa:
#
#   QUÉ FALTA        · qué hay que crear o elegir
#   CÓMO SE DECIDE   · la vara, para que no haga falta haber diseñado la
#                      infraestructura del área para poder resolverlo
#   SI NO SE HACE    · qué garantía del marco queda sin cumplir
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
#   NO se crea uno nuevo: el área tiene un bucket de state POR CUENTA que
#   comparten los roots de todas sus aplicaciones, con una `key` por proyecto —la
#   `key` ya está puesta y derivada del nombre del proyecto—. Pedí el nombre del
#   bucket de la cuenta {{CUENTA_DEV}}, o leelo del `main.tf` de otro proyecto
#   del área que ya esté desplegado.
#
#   Ojo: esto se parece más a un DATO del área que a una decisión de este
#   proyecto. Si te toca resolverlo a mano, decilo en el registro de la adopción:
#   el arreglo de fondo es que el andamio lo sustituya como valor y este pendiente
#   deje de existir.
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
#   Igual que el bucket: el área tiene UN cluster por cuenta y cada aplicación
#   vive como una base dentro de él. Este proyecto NO crea un cluster —crear uno
#   por aplicación multiplica el costo fijo y sale de la infraestructura base
#   fijada, que es frontera ⚠️ y se pregunta antes—. Pedí el identificador, y el
#   nombre de la base de este proyecto derivalo de {{PROYECTO}}.
#
#   Vale la misma nota que el pendiente 1: parece un dato del área y no una
#   decisión de este proyecto.
#
# SI NO SE HACE
#   `plan` falla al no encontrar el cluster. Y si alguien lo "resuelve" creando
#   un cluster propio, se aparta de la infraestructura base sin haberlo
#   preguntado.
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
# SI NO SE HACE
#   Nada, si el proyecto no los necesita — de ahí que la salida legítima sea
#   borrar la sección. Lo que no es legítimo es dejarla sin contestar.
# ---------------------------------------------------------------------------

# En DEV no hay pendiente de ALARMAS, y es una decisión declarada, no un olvido:
# ver el README de este directorio.
