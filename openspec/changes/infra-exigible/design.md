---
artefacto: design
dri: Builder 1
aprueba: revision adversarial (desvio del marco: un solo mantenedor, ver AGENTS.md)
informado: PO
estado: en-ejecucion
---

# infra-exigible — Design

> **Cómo se lee este design.** D1 a D8 son las decisiones de los bloques 1 a 3 (2026-08-23 y
> 2026-08-24) y quedan como estaban, con una nota donde una decisión posterior las supera. D9
> a D15 son las del cierre (2026-09-17, lote 12 del porte de Rigel). Ojo con un nombre
> repetido: **D6 de este design** es la asimetría dev↔prod; **la decisión D6 del PO** es otra
> —«no desplegar sigue siendo un estado legítimo»— y se cita siempre con «del PO».

## Context

El proposal establece el hueco: la regla «IaC = Terraform en `infra/` y `infra-prod/`» llega
a cada sesión del agente y el andamio no crea ninguno de los dos directorios.

Lo que la medición del 2026-08-23 sobre un consumidor real **cambió respecto de la
intuición inicial** es el tamaño del problema. La suposición era «hay que repartir 2110
líneas de Terraform». La realidad es que **el área comparte sus cimientos**, y por lo tanto
la mayor parte de esas líneas no se decide: se **deriva**.

| Cimiento | Cómo lo usa el consumidor | Consecuencia |
|---|---|---|
| State | `backend "s3"` en un bucket **por cuenta, compartido** por los roots del área, con `key` por proyecto | Se deriva de la cuenta, el proyecto y la región |
| Base de datos | `data "aws_rds_cluster" "shared"` — **no crea cluster**, referencia el del área | Se deriva; el nombre de la base sale del proyecto |
| Red | `data "aws_vpc"` y `data "aws_subnets"` — **no crea VPC** | Se deriva, con un matiz (ver D4) |
| Identidad del pipeline | `github_repo` con la forma `org/repo` | Se deriva |
| Región, prefijo de recursos, dominios | ya son valores del andamio | Se derivan |

De los 21 valores que `projects init` ya sustituye, **doce alimentan directamente** la
infraestructura —medido sobre la implementación del bloque 1: proyecto, organización, las
dos cuentas, región, los dos perfiles, prefijo de recursos, los dos dominios, el canal de
alertas y el handle del builder que aprueba producción.

Eso invierte la forma esperada de este change: no es «repartir mucho y dejar poco», es
**entregar funcionando todo lo que se deriva y dejar pocos huecos, con criterio**.

## Decisions

### D1 — Los huecos usan el mecanismo que ya existe, no uno nuevo

> **Superada por D8** (2026-08-24): usar el marcador gateado del andamio dejaba a un
> repositorio recién nacido sin poder llegar a verde. Se conserva como historia.

`calidad-codigo` ya exige que «un repositorio nacido del scaffold no conserva marcadores sin
resolver», y su texto incluye explícitamente los **huecos de decisión**, no solo las
sustituciones de valores. El paso del pipeline que los caza ya existe, ya viaja a todos los
consumidores y ya los busca por codepoint para no depender del locale.

**Alternativa descartada: una clase nueva de marcador con su propio check.** Habría dado un
mensaje de error más específico, y a cambio: un segundo lugar donde se define qué es un
pendiente, dos pasos que pueden divergir, y la posibilidad de que un repo pase uno y falle
el otro. El marco ya tiene escrito el defecto de «dos lugares interpretando el mismo sello».

**Consecuencia asumida**: el mensaje de error es el genérico del paso de marcadores. Se
compensa poniendo el criterio **dentro del hueco**, que es donde el lector lo va a leer.

### D2 — Archivos reales con valores sustituidos, no un módulo del marco

**Alternativa descartada: un módulo de Terraform publicado por el marco.** Es la opción
elegante y es la peor para esta audiencia. Cuando `terraform plan` falla dentro de un
módulo, el error apunta a código que **no está en el repositorio del proyecto**, y un
builder cuyo aporte es de negocio no tiene con qué depurarlo: ni el código, ni el contexto,
ni la forma de probar un arreglo. Archivos reales en su propio árbol los lee él y los edita
su agente.

**Costo asumido**: cada proyecto queda con su copia, y una mejora del marco no llega sola a
los repos ya creados. Es el costo conocido del carril *scaffold*, y es el mismo que el marco
ya paga por `ci.yml` y por `CODEOWNERS`.

### D3 — Lo que se deriva se entrega funcionando; solo lo que se decide queda como hueco

Es la decisión que hace útil al change, y sale de la tabla del Context. Un hueco por algo
derivable es trabajo que el marco le pasa al proyecto sin motivo.

**Se entrega funcionando** (sin huecos): la `key` del state derivada del proyecto, la
referencia a la VPC, el proveedor con su región y sus etiquetas por defecto, el prefijo de
recursos, la identidad del repositorio y los dominios. La **forma** del backend y del `data`
del cluster también llega escrita; lo único que les falta es un nombre, y por eso son los dos
huecos de D7 y no piezas por escribir.

**Queda como hueco, porque no es derivable de ningún valor**:

| Hueco | Por qué no se deriva |
|---|---|
| El dimensionamiento del cómputo y los límites de autoescalado | Depende de la carga esperada, que es del negocio |
| El certificado y la zona DNS | Puede existir o no para ese dominio; verificarlo exige credenciales |
| Si hace falta un programador de tareas | Depende de si el negocio tiene procesos periódicos |
| **Las alarmas** | Ver D5 |
| La topología de subredes del servicio | Ver D4 |

Cinco decisiones del proyecto. **La implementación encontró dos más, y son de otra
naturaleza** (ver D7): el nombre del bucket del state y el identificador del cluster
compartido. Total: **seis huecos en dev y siete en producción** —el séptimo es el de
alarmas, que por D6 existe solo ahí—.

El número importa igual: una lista larga de pendientes se lee como «esto está sin hacer» y
se saltea; siete con criterio se resuelven.

### D4 — Los huecos NO encodean las respuestas de un consumidor

La tentación es copiar el `infra/` de un consumidor que ya corre y sustituirle los valores.
**No.** Y el mejor argumento está en su propio código: su `network.tf` documenta que el servicio corre en
subredes **públicas** aunque la VPC tenga NAT y subredes privadas, y lo justifica con una
medición propia — *«con subnets privadas, `ingress_paths` queda vacío (probado)»*.

Esa elección **es correcta para ese proyecto y está razonada**. Copiada a otro proyecto sin
su razón, se convierte en una decisión que nadie tomó y que se ve como si alguien la hubiera
tomado. Es exactamente el modo de falla que el marco ya tiene escrito para el logo
redibujado: algo que «se parece» y es otra cosa.

**Entonces el hueco lleva el criterio, no la respuesta**: *«decidí en qué subredes corre el
servicio; si necesitás un balanceador accesible desde internet, verificá qué exige antes de
elegir privadas»*. Con el enlace al `network.tf` de ese consumidor como
**ejemplo**, nunca como plantilla.

**Alternativa descartada: copiar y marcar con comentarios lo que hay que revisar.** Un
comentario no es compuerta, y lo copiado ya está ahí funcionando: nadie revisa lo que ya
pasa el `plan`.

### D5 — Las alarmas se exigen como propiedad, jamás como lista

> **Acotada por D11** (2026-09-17): «jamás como lista» vale para lo que mira la verificación
> de los pendientes, no para lo que tiene que vigilar producción, que tiene un mínimo en otro
> requirement de la misma capability. Leída sin acotar, contradecía ese requirement.

Decisión de @builder-uno, 2026-08-23: *«las alarmas no siempre son iguales, cada proyecto
puede diferir; lo clave es que existan en el sentido de que validen lo clave del negocio»*.

Lo que se exige es que **existan y estén cableadas al canal de alertas**. Cuáles y con qué
umbrales es del negocio de cada proyecto: un proyecto con tres alarmas bien elegidas cumple
y uno con seis copiadas de otro negocio no.

**Alternativa descartada: repartir el conjunto de alarmas del consumidor medido
(seis) como base.** Sería una cantidad esperada disfrazada de ayuda, y el marco ya tiene la
regla escrita para las migraciones —invariantes de **propiedades**, jamás de cantidades—
porque un invariante con número aborta trabajo sano por un falso fallo.

El hueco lleva la vara con la que se decide: *«qué se rompe que alguien tenga que ir a
arreglar, y qué se enteraría el negocio antes que nosotros»*.

### D6 — dev y prod no son simétricos, y la asimetría se declara

Medido: prod tiene seis alarmas y un programador de tareas; dev no tiene ninguna de las dos.
**Eso es decisión tomada, no deuda**: dev es staging compartido y las alarmas que importan
son las de producción; una alarma de dev que suena por un deploy de prueba entrena a
ignorarla.

Queda escrito en el andamio para que no se lea como un hueco que alguien olvidó. El hueco de
alarmas existe **solo en `infra-prod/`**.

### D7 — Dos de los huecos son datos del área, no decisiones del proyecto, y quedan anotados como tal

La implementación del bloque 1 encontró que **el andamio no tiene ningún valor que describa
la infraestructura compartida del área**. Los 21 valores describen el proyecto —su nombre, sus
cuentas, sus dominios— y ninguno nombra el bucket del state ni el cluster de base de datos,
que son por cuenta y compartidos entre las aplicaciones.

Los dos entran como hueco, y **los dos dicen en su propio texto que probablemente no deberían
serlo**: quien los resuelva a mano tiene la instrucción de anotarlo, porque el arreglo de fondo
es que el andamio los sustituya como valor.

**Alternativa descartada por ahora: agregarlos como valores 22 y 23.** Es la respuesta
correcta y no se toma acá por dos razones. La primera es que el patrón de sus nombres se
infirió de **dos** ejemplos —los del consumidor medido—, y dos puntos alcanzan para ver
una forma pero no para declarar una convención del área: eso lo sabe quien la definió. La
segunda es que «los 21 valores» es un contrato documentado en tres lugares, y moverlo de
pasada dentro de un change sobre infraestructura mete dos cambios en uno.

**Consecuencia asumida y declarada**: en el primer proyecto que use esto, dos de los siete
huecos van a resolverse copiando un dato de otro repositorio. Es fricción real, está anotada, y
su arreglo es un change de dos líneas cuando alguien confirme la convención.

### D8 — La compuerta se difiere, y el change queda declarado como parcialmente implementado

> **Cerrada por D9** (2026-09-17): el requirement deja de pedir la compuerta, así que el
> change deja de estar parcialmente implementado. Se conserva porque la medición de acá abajo
> —3 marcadores a 21, y `ci-ok` inalcanzable el día uno— es el motivo de D9.

**Esto es una corrección de la implementación contra su propio requirement, no un cambio de
alcance.** El delta de este change dice que la verificación «SHALL ser inerte para un
repositorio que no se despliega: la exigencia nace del despliegue, no de la existencia del
repositorio». El bloque 1 no cumplió eso: puso los pendientes con el marcador 🕳️ del
andamio, que el paso del pipeline **sí** cuenta desde el primer día.

Medido: un repositorio nuevo pasaba de **3 marcadores a 21**. Los 3 originales se resuelven
en minutos —editar dos documentos y aplicar el ruleset—; de los 18 nuevos, todos necesitan
el nombre de un bucket, el identificador de un cluster, verificar subredes, dimensionar
cómputo o elegir alarmas. Y el paso es fallo duro (`::error::` más `exit 1`), así que
arrastra `marco / higiene` → `marco_ok` → **`ci-ok`**.

Consecuencia que lo vuelve inaceptable: **un repositorio recién nacido no podía llegar a
verde**, y la guía de arranque promete en su primera línea llevar a «`ci-ok` verde y el
primer change en marcha». Un andamio que entrega un repo imposible de poner en verde no es
una compuerta: es una trampa.

**Decisión**: los pendientes usan un token propio, `PENDIENTE-INFRA`, que el paso de
marcadores no cuenta. Siguen en el árbol —así que el agente los lee en cada sesión, que es
el nivel donde el criterio técnico se transfiere sin que nadie lo recuerde— y se revisan a
mano hasta que exista la compuerta.

**La compuerta llega con el change del despliegue**, y no es una postergación cómoda: es
cuando «este repositorio se despliega» se vuelve verificable de verdad. Hoy no lo es —el
andamio no reparte pipeline de despliegue—, así que cualquier disparador que se inventara
ahora sería una aproximación.

**Por lo tanto este change queda PARCIALMENTE implementado, y se dice en vez de disimularse**:
el requirement pide compuerta y hoy hay disciplina declarada. El archive espera esa mitad.

**Alternativa descartada: sacar los directorios del andamio hasta que exista la compuerta.**
Deja al agente leyendo una regla que apunta a un directorio vacío, que es el defecto que este
change existe para cerrar. Peor el remedio.

**Alternativa descartada: inventar el disparador ahora** (por ejemplo, «cuenta los pendientes
si existe un workflow de despliegue»). Es adivinar la forma que va a tener una pieza que
todavía no se diseñó, y el marco ya tiene escrito lo que cuesta un disparador elegido antes
de conocer la pieza: un ruleset vivió una semana pidiendo el check equivocado.

## Decisiones del cierre (2026-09-17)

### D9 — El requirement deja de pedir compuerta, y no decide la forma de la señal

**Decisión.** Sale la cláusula «la verificación SHALL fallar mientras sobreviva un hueco sin
resolver» del **cuerpo, del título y del escenario 1**. El requirement dice en su lugar que la
forma de una señal sobre los pendientes —rojo o aviso— la decide el change que mida por
plataforma si un repositorio llegó a su ambiente, y que hasta entonces lo que se acredita es
que los pendientes lleguen **decidibles**.

**Por qué, medido en este árbol y no heredado.** Rigel la retiró porque midió que un rojo
castigaba el camino legítimo (implementar mientras se decide la infraestructura). Projects no
hereda ese argumento tal cual: la decisión D1 del PO dice que una compuerta nueva sale **en
rojo** el día que sale, así que «un rojo es la respuesta equivocada» no es una conclusión que
este marco pueda adoptar de otro. Lo que sí vale acá, y alcanza:

- La compuerta **nunca se construyó** y nada de lo que hay en el árbol la construye: D8 movió
  los pendientes a un token que ningún paso cuenta, a propósito.
- Su disparador —«este repositorio se despliega»— **no es verificable todavía**. Con la
  decisión D6 del PO, «no desplegar» es legítimo y la exigencia de llegar a un ambiente vale
  solo cuando la plataforma declarada no es `ninguna`; medir eso por plataforma es otra pieza
  del porte (la que adapta el aviso `aviso-llego-al-ambiente` de Rigel a los adaptadores).
- El requirement vivo **ya decía lo contrario** que el delta, y los dos iban a quedar en la
  misma capability.

Dejar la forma sin decidir no es neutral y hay que decirlo: cuando esa pieza llegue, la
decisión D1 del PO empuja hacia el rojo y D8 de este design ya midió lo que ese rojo le cuesta
a un repositorio recién nacido (3 marcadores → 21, `ci-ok` inalcanzable el día uno). Esa
tensión es de ese change, y queda escrita acá para que no la descubra.

**Alternativa descartada: dejar la cláusula y seguir sin archivar.** Es lo que había: un change
con 12 de 14 tareas hechas, bloqueado por una compuerta sin dueño ni fecha.

**Alternativa descartada: construir la compuerta ahora.** Es inventar el disparador antes de
conocer la pieza —el motivo por el que D8 la difirió— y, con la decisión D6 del PO, un
disparador mal elegido pondría en rojo a un repositorio que legítimamente no despliega.

### D10 — Un solo requirement: el `ADDED` se funde en el vivo por `RENAMED` + `MODIFIED`

**Decisión.** El `ADDED` «La infraestructura de un repositorio desplegable vive en su árbol, y lo
que falta es compuerta» se retira. Su contenido que sigue siendo verdad se funde en el
requirement vivo «El andamio entrega los huecos de decisión de infraestructura con su
criterio», que se renombra a «La infraestructura de un repositorio desplegable vive en su
árbol, entregada por el andamio» —el título final que Rigel archivó— y se reescribe con
`MODIFIED`, reproduciendo sus cuatro escenarios vivos por título.

El escenario 1 del `ADDED` («Un repositorio nuevo antes de resolver su infraestructura») **no
sobrevive como escenario propio**: describía la misma situación que el escenario vivo «Un
repositorio con todos sus huecos abiertos» con el veredicto opuesto, y el verdadero era el
vivo. Se conserva el vivo, con su `THEN` diciendo que la forma de la señal no la decide este
requirement.

| alternativa | por qué se descarta |
|---|---|
| **Que convivan** los dos requirements | Dos requirements que dicen lo mismo con distinta fuerza es como un contrato empieza a mentir: el `tasks.md` de este change ya lo advertía |
| **`MODIFIED` sin renombrar** | Deja «huecos de decisión» en el título, y `calidad-codigo` usa ese término para los marcadores del andamio con la propiedad **contraria** —«CI SHALL fallar mientras alguno sobreviva»—. Es el bloqueante 3 de la revisión adversarial de Rigel (`cb4cb13`) |
| **`REMOVED` del vivo + `ADDED` del nuevo** | Pierde la identidad de los cuatro escenarios, y el guardrail de deltas no puede comparar un requirement que se da de baja con el que lo reemplaza: el control de que ningún escenario se pierda en silencio desaparece justo donde hace falta |

**Por qué `RENAMED` sí funciona.** El guardrail de deltas resuelve el título nuevo al vigente
leyendo la sección `RENAMED` (`actions/guardrail-deltas/check-openspec-deltas.mjs`), y el script
de archive aplica `RENAMED` antes que `MODIFIED`. Medido: el guardrail compara 22 requirements
(eran 20) sin pérdidas, y `aplicar-deltas.mjs infra-exigible --simulacro` planifica tres
operaciones —un `RENAMED` y dos `MODIFIED`— en `operacion-infra`.

**Los títulos de los escenarios conservan «hueco».** El título es la identidad: cambiarlo lo
borra del contrato en el archive, y `RENAMED` es de requirements, no de escenarios. El cuerpo
del requirement lo dice para que no se lea como descuido.

### D11 — Las alarmas: un piso por capacidad, y la cláusula acotada a su verificación

**Decisión.** Dos movimientos, uno por requirement:

1. «Las caídas se detectan por alarma» **conserva su mínimo y lo enuncia por capacidad**: que el
   servicio deje de responder o responda con errores del servidor de forma sostenida, que el
   proceso se caiga y se reinicie en bucle, y que el log registre los niveles de alerta. Cómo se
   arma cada una es del adaptador. Sus dos escenarios se reproducen, y el de los errores sin
   caída deja de nombrar el filtro de métrica.
2. La cláusula «NO SHALL ser cuáles ni cuántas» del otro requirement se acota a **lo que esta
   verificación exige**, y el texto dice que no debe leerse como que el marco no exige ninguna
   alarma en particular — porque esa lectura es la que produjo la contradicción.

| alternativa | por qué se descarta |
|---|---|
| **La salida de Rigel tal cual** (acotar la cláusula, dejar la lista con su vocabulario) | La lista decía «instancias de cómputo» y «vía filtro de métrica», que es un solo proveedor. Con la decisión D4/D5 del PO el marco fija capacidades y no productos, y un mínimo escrito en productos se lee como exigencia del adaptador `aws`. Y el motivo de Rigel para conservarla —su action `ambiente-de-produccion` ya exigía alarmas concretas— no existe acá |
| **Retirar el mínimo** y dejar solo «alarmas cableadas» | Acá sí sería posible sin contradecir código publicado, y aun así se descarta: el pendiente de alarmas del andamio ya recomendaba dos de las tres («que el servicio no responda, y que los errores del servidor suban»), así que el marco ya pensaba que había un piso. Retirarlo dejaría «las caídas se detectan por alarma» sin nada verificable adentro |
| **Ampliar el mínimo** | Nadie lo midió, y una lista más larga es una cantidad esperada disfrazada de ayuda: la regla que D5 cita sigue valiendo por encima del piso |

**El CHANGELOG de la 1.7.0 no se reescribe.** Es historia publicada; la entrada de este lote lo
corrige en «Corregido», diciendo qué quedó acotado y desde cuándo.

**En el andamio**, el pendiente de alarmas de producción separa el **piso** —tres, por lo que
detectan, citando el requirement— de lo que se elige **por encima**, que sigue siendo del
negocio con las mismas dos preguntas. Y la tercera del piso se ata al pendiente de logs (D13).

### D12 — La cuarta parte, sin el bucket como marcador

**Decisión.** Los trece pendientes que había —seis en dev, siete en producción— suman «CUÁNDO SE
RESUELVE» con texto propio, no con una fórmula: el certificado **se empieza primero** aunque se
cierre último (los registros que carga una persona fuera de la nube tienen tiempo de respuesta
ajeno); el programador de tareas se contesta **antes de tocar infraestructura**, porque lo
contesta `{{PO}}` leyendo el spec del producto; el dimensionamiento de producción se decide
contra el uso esperado, no contra el de un ambiente sin usuarios. El dimensionamiento gana
además el párrafo de Rigel sobre el cómputo administrado, sin su procedencia (en el andamio un
comentario dice por qué, nunca dónde se aprendió: `pruebas/andamio/lo-que-viaja-al-proyecto.test.mjs`).

**Lo que NO se porta del mismo commit (`78c693c`):** el bucket del state como
`{{BUCKET_STATE_DEV}}`/`{{BUCKET_STATE_PROD}}`. En Rigel era un dato de su área —un bucket por
cuenta compartido por todos los roots, con keys de tres proyectos—; en un marco para cualquier
organización es un pendiente legítimo, y un marcador nuevo sería un valor que `projects init`
tendría que preguntar a cada proyecto. El pendiente 1 se queda y gana su momento: se resuelve
primero, porque sin él no corre `init`.

**Alternativa descartada: un solo «CUÁNDO» genérico para todos** («en la fase de
infraestructura»). Es la fórmula que no dice nada: el valor de la cuarta parte está en el orden
entre pendientes, y ese orden es distinto para cada uno.

### D13 — El pendiente de los logs, en los dos ambientes y con la clase como criterio

**Decisión.** `PENDIENTE-INFRA: 7` en `infra/` y `PENDIENTE-INFRA: 8` en `infra-prod/`, los dos
titulados «La retención y la clase del grupo de logs del servicio», con las cuatro partes.

**Medido contra la documentación del proveedor el 2026-09-17** (tabla «Supported features» de
«Log classes» de CloudWatch Logs): `INFREQUENT_ACCESS` no admite filtros de métrica, filtros de
suscripción, Live Tail ni `GetLogEvents`/`FilterLogEvents`; y «after a log group is created, its
log class can't be changed». Con eso el criterio sale distinto por ambiente, y por eso no es un
texto copiado dos veces:

- **dev**: la clase se elige mirando qué va a leer el grupo. Si algo lo lee con esas
  operaciones —una verificación del pipeline, o `aws logs filter-log-events`, que es como
  investiga un runbook— o deriva una métrica, `STANDARD`; si solo se consulta con Logs
  Insights, Infrequent Access es legítimo y más barato. Es el criterio condicional de Rigel,
  **sin su anclaje**: allá lo decidía un paso `humo-dev` que Projects no reparte.
- **producción**: casi no se elige. La tercera alarma del piso (D11) es, en este adaptador, un
  filtro de métrica sobre ese grupo, y la plantilla de runbook del marco
  (`docs/plantillas/runbook.md`, §2) investiga con `filter-log-events`. Las dos cosas no existen
  en la clase barata.

**Por qué en los dos y no solo en dev**, que es donde Rigel lo puso primero: el contrato pide
retención en cualquier ambiente, y la clase no tiene vuelta atrás. Rigel tardó un release en ver
que producción —el ambiente que no se puede rehacer— no lo tenía (`6b91fef`). El banco lo exige
en las dos raíces para que eso no se repita acá.

**Alternativa descartada: fijar `STANDARD` en los dos sin criterio.** Es más simple y le quita
a dev una elección legítima y más barata; el pendiente existe para dar la vara, no el valor.

**Alternativa descartada: un pendiente de plataforma para los demás adaptadores ahora.** Cada
proveedor tiene su retención y su forma de fijarla, y el marco no escribe un límite de
plataforma sin medirlo con fecha. Queda como tarea abierta.

### D14 — Los pendientes de plataforma con la misma forma, y una sola lista en el banco

**Decisión.** Los ocho `PENDIENTE-PLATAFORMA` de `infra/adaptadores.md` suman «CUÁNDO SE
RESUELVE»; «el marco» suma además «CÓMO SE DECIDE», que no tenía. El banco declara **una sola
lista de partes** (`PARTES`) y la aplica a los dos tokens.

**Por qué una sola lista.** El catálogo decía «la misma forma de tres partes que usa
`pendientes.tf`». Con dos listas, pasar a cuatro en una deja a la otra mintiendo en verde, que es
exactamente lo que habría pasado. Con una, la frase del catálogo y la del banco no pueden
divergir sin que el banco se ponga rojo.

**Alternativa descartada: exceptuar a «el marco» y «la mudanza»**, que son pendientes del marco
y no del proyecto. Una excepción por lista es un agujero con nombre; darles las cuatro partes
cuesta dos párrafos y los deja decidibles para quien los lea.

### D15 — La tarea 2.3 no es ejecutable, y se declara así

La 2.3 era verificar en un repositorio consumidor, con una rama temporal y un PR en borrador,
que la compuerta mordía. Tres motivos la vuelven no ejecutable, y cualquiera alcanza:

1. **Su objeto no existe.** Lo que tenía que morder era la compuerta de pendientes sin resolver,
   y D9 la retira del requirement.
2. **Nada de este change corre en un consumidor.** Toca scaffold (se copia una vez), un spec
   canónico y un banco que corre en el CI del marco. Ningún workflow, action ni `input` cambia,
   así que el PR de actualización de versión de un consumidor no ejecuta nada distinto.
3. **Abrir una rama en un consumidor desde una sesión de Projects** está en las 🛑 de
   `AGENTS.md`; lo que el marco prevé para eso es la validación previa al release
   (`projects-validar-consumidor`), que prueba la versión y no un change.

El número de issue que la tarea citaba (#73) es de la historia de origen de este change, no de
este repositorio.

## Clasificación de distribución

| Pieza | Forma | Por qué esa y no otra |
|---|---|---|
| Delta de `operacion-infra` | **canónico** | Es el contrato del marco: vive solo acá y los proyectos lo cumplen, no lo copian |
| `plantilla/infra/pendientes.tf`, `plantilla/infra-prod/pendientes.tf` | **scaffold** (solo con plataforma `aws`) | Son del proyecto el día uno: se editan al resolver cada pendiente y se borran al terminar. Referenciarlos no tiene sentido —no hay nada que ejecutar—, y no viajan con otra plataforma (`noViajanPorPlataforma()`) |
| `plantilla/infra/README.md`, `plantilla/infra-prod/README.md` | **scaffold** (solo con `aws`) | Documentan esas raíces para quien las abre en su repositorio |
| `plantilla/infra/adaptadores.md` | **scaffold** | Es la declaración del proyecto de qué plataforma eligió; con `ninguna` se mueve a la raíz y sobrevive |
| `pruebas/andamio/infra-pendientes.test.mjs` | **del marco, no se distribuye** | Verifica el andamio antes de que se copie; un consumidor no tiene andamio que verificar |
| `docs/05`, `docs/11`, `openspec/cobertura-de-requirements.md` | **del marco, no se distribuye** | Documentación del marco |

Ninguna pieza cambia de clasificación.

## La propiedad, enunciada

> Un repositorio que se despliega recibe su infraestructura en el árbol, con lo que falta
> decidir escrito con su criterio y su momento. Que llegue a verde sin haberlo decidido es,
> hoy, legítimo: qué señal recibe por eso lo decide el change que mida la llegada al ambiente.

La primera mitad es la que este change garantiza y hace cumplir. La segunda es la que retira de
su delta, dicha para que el verde no se lea como una garantía que no da.

## Cómo se hace cumplir solo

| Regla | Check que falla solo |
|---|---|
| Un repositorio del adaptador `aws` recibe sus dos raíces | `pruebas/andamio/infra-pendientes.test.mjs` · `estructura`, y `pruebas/andamio/terraform-en-ci.test.mjs` para la coherencia entre la plataforma declarada y lo repartido |
| Cada pendiente trae sus **cuatro** partes | `pendientesConSusCuatroPartes`, con dos mutaciones (sin «CÓMO SE DECIDE» en dev, sin «CUÁNDO SE RESUELVE» en producción) |
| Los `PENDIENTE-PLATAFORMA` tienen la misma forma | `pendientesDePlataformaConSusCuatroPartes`, con su mutación y su guarda de vacuidad (cero encabezados es rojo, no verde) |
| El pendiente de los logs existe en los dos ambientes | `retencionDeLogsEnLosDosAmbientes`, con la mutación que lo borra de producción |
| Alarmas solo en producción, punteros que resuelven, numeración correlativa, ningún marcador gateado, ningún recurso | Las comprobaciones que ya existían, cada una con su mutación |
| Que una mutación **muerda** de verdad | El banco ahora exige más hallazgos que sobre el árbol real, no solo «alguno»: con el árbol en rojo, «alguno» pasaba sin que la mutación hiciera nada |
| Que ningún escenario vivo se pierda en el archive | El guardrail de deltas, que resuelve el `RENAMED` y compara los cuatro escenarios del requirement renombrado y los dos de «Las caídas» |
| **Que el criterio y el momento sean buenos** | **Nada, y se dice**: ningún escaneo distingue un momento útil de una frase que suena bien. Se revisa una vez, en la revisión adversarial de este change |
| **Que producción tenga el mínimo de alarmas** | **Nada**: el andamio no reparte alarmas, así que no hay qué leer. La fila de `cobertura-de-requirements.md` lo dice |

## Lo que este diseño NO resuelve

- **La señal sobre los pendientes sin resolver**, ni la medición por plataforma de la llegada al
  ambiente (D9).
- **Que los pendientes se resuelvan bien.** El banco acredita que llegan decidibles.
- **La retención de logs de las plataformas que no son `aws`** (D13).
- **La compuerta del mínimo de alarmas** (D11).
- **El Terraform en sí, el despliegue de una aplicación y `verificar-prod`.**
