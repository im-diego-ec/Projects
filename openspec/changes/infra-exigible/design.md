---
artefacto: design
dri: Builder 1
revisa: Builder 2 (builder par)
estado: pendiente-de-revision
---

# infra-exigible — Design

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

## La propiedad, enunciada

> Un repositorio que se despliega no puede llegar a verde con su infraestructura sin
> decidir, y lo que le falta decidir viene dicho con el criterio para decidirlo.

Las dos mitades importan. La primera es la compuerta; la segunda es lo que la hace resoluble
por alguien que no diseñó la infraestructura del área — que es la audiencia real del marco.

## Cómo se hace cumplir solo

| Regla | Check que falla solo |
|---|---|
| Un repo desplegable tiene sus directorios de infraestructura | El paso de marcadores del pipeline: los huecos viven en esos directorios, así que su ausencia es la ausencia de los huecos |
| Los huecos se resuelven antes de integrar | Ya existe: el paso de marcadores falla mientras sobreviva uno |
| La verificación es inerte para un repo que no se despliega | Ya existe: el paso exenta al repositorio que distribuye el andamio |
| **Que el hueco lleve su criterio** | **Nada, y hay que decirlo**: ningún check puede leer si un texto explica bien. Lo revisa el builder par en el PR de este change, una vez, y después el texto viaja |

La última fila es deuda declarada y no se puede cerrar con un check: distinguir un criterio
útil de una frase que suena bien no es decidible con un escaneo. Lo que sí se puede es que
la revisión ocurra **una vez**, acá, en vez de una vez por proyecto.

## Lo que este diseño NO resuelve

- **Que los huecos se resuelvan bien.** La compuerta acredita que alguien los atendió. Que
  la infraestructura resultante sea correcta lo dicen el `plan`, el review humano y el
  despliegue verificado.
- **El Terraform en sí.** Change posterior, con verificación real en dev antes de prod.
- **El `deploy.yml` y `verificar-prod`.** La otra mitad del issue #66, y con una diferencia
  de carril importante: ahí sí hay una pieza genuinamente genérica que debería viajar por
  **referenciado** y no por scaffold.
- **Las otras garantías operativas del tercer nivel** —smoke, errores del navegador en
  nuestros logs, presupuesto, backups—. Cada una es su propio movimiento, y meterlas acá
  haría un change que nadie puede revisar de una sentada.
