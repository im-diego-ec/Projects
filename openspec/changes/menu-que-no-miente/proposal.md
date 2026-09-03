# Un menú que no ofrece lo que no puede dar

## El problema

El asistente le pregunta a una persona **no técnica** dónde va a vivir su
proyecto, y le ofrece tres caminos. **Dos de los tres no la llevan a ningún
lado.**

No es una opinión: se midió contra lo que el andamio sabe generar.

| ¿El andamio sabe generar…? | Medido en `plantilla/` |
| --- | --- |
| un proyecto que corre **sin cuenta en ninguna nube** | **sí** — Postgres en Docker Compose |
| **Worker + D1 + migraciones** (la rama «todo en Cloudflare») | **no** — cero referencias a D1 en el árbol |
| **Supabase con auth cableado** | **sí** — `web/src/auth.ts`, `api/src/middleware/auth.ts`, con pruebas |

Y la tercera opción del menú, **AWS**, se cae por tres hechos verificados, cada
uno suficiente por sí solo:

- **La cuenta gratuita se cierra sola.** A los 6 meses o al agotarse los créditos,
  lo que pase primero. Después AWS retiene los datos 90 días y los borra.
  <https://aws.amazon.com/free/free-tier-faqs/>
- **Pide tarjeta desde el alta**, que es la barrera más dura para quien recién
  arranca — y el marco apunta exactamente a esa persona.
- **Su única ventaja declarada está fuera del alcance de quien la elige.** El
  detalle dice «acá Terraform SÍ vale la pena, y es lo único que el andamio trae
  preparado hoy». Terraform es una herramienta de terminal. La persona que
  contesta esta pregunta no tiene terminal: por eso existe el asistente.

Ese último punto es el que decide. **No es que AWS sea malo — es que el asistente
se lo ofrece a la única persona que no puede usarlo.**

## Lo que este cambio propone

**Sacar `aws` del menú del asistente.** Nada más, y a propósito nada más.

El Terraform **no se toca**. `projects-init.mjs` mantiene su propio predicado y
sigue repartiendo `infra/` e `infra-prod/` a quien escriba
`"plataforma": "aws"` en el archivo de valores a mano. Los dos caminos del marco
—el del PO por el asistente, el del builder por el JSON— dejan de ofrecer lo
mismo, y eso es correcto: **son dos personas distintas con dos terminales
distintas, y una de las dos no tiene ninguna.**

## Lo que este cambio NO hace, y por qué

- **No saca Terraform del marco.** Eso toca ~40 archivos, tres claves de la
  constitución canónica —que tiene guard de huella— y un job de CI reutilizable
  que otros repos consumen. Es otro cambio, con su propio proposal.
- **No agrega la rama «todo en Cloudflare».** No se puede ofrecer lo que el
  andamio no sabe generar; es la misma regla que saca a AWS. Y hay un hueco que
  más ingeniería no cierra: **Cloudflare no tiene producto de cuentas de usuario
  final** — Access es zero-trust para tu equipo, no registro de clientes.
- **No saca la opción «Todavía no sé».** La investigación sugería sacarla
  (Krosnick et al. 2002 mide que una salida así se lleva desproporcionadamente a
  los que menos saben). Pero acá describe un estado real y verificado: el
  proyecto **arranca y corre con cero cuentas**. Sacarla obligaría a declarar un
  proveedor a alguien que legítimamente todavía no lo necesita.

## Lo que se descubrió al intentar implementarlo

Se implementó para medir el costo, y apareció algo que este proposal no había
previsto. Queda escrito porque **cambia la forma de la decisión**.

**Sacar `aws` del menú deja código muerto.** Las cinco preguntas de AWS
—`CUENTA_DEV`, `CUENTA_PROD`, `REGION`, `PERFIL_DEV`, `PERFIL_PROD`— están
gobernadas por el predicado `usaAws`. Si `aws` no se puede elegir, `usaAws` es
siempre falso y esas cinco preguntas **no se alcanzan nunca**. Medido: 11 casos
del banco caen, 6 de ellos sobre esa rama.

Y borrarlas tiene un costo propio: **una de esas pruebas documenta un defecto
real**. La combinación `sitio + aws` llegó a escribir cinco `undefined` porque el
asistente y `derivar` decidían distinto; el asistente imprimía «Cuenta de AWS
undefined», **salía 0**, y el paso siguiente abortaba. Esa prueba es el único
lugar donde ese defecto está registrado.

Hay además una debilidad en el argumento original que conviene admitir: **AWS no
es el caso de GCP.** GCP se sacó porque *no tenía adaptador* — quien lo elegía
recibía un proyecto sin infraestructura. AWS sí tiene adaptador, el Terraform se
reparte y hay un job de CI que lo valida. Lo que falla no es que no funcione: es
que **no es apto para quien contesta**. Es un motivo más débil, y merece decidirse
a propósito y no por analogía.

## Qué se hizo mientras tanto, sin esperar esta decisión

La parte que **no** era una decisión de diseño ya está aplicada: el detalle de AWS
prometía como ventaja que «acá Terraform SÍ vale la pena», siendo que Terraform
exige una terminal que quien lee no tiene, y **omitía que la cuenta gratuita se
cierra sola a los 6 meses**. Eso no es una opción discutible: es una afirmación
que induce a error en la decisión más cara del recorrido. Se corrigió.

**La opción sigue en el menú. Dejó de prometer lo que no puede dar.**

## Lo que hay que decidir

**Una sola cosa, y es tuya:** ¿sale AWS del menú del asistente?

Si la respuesta es **sí**, viene atada: hay que sacar también las cinco preguntas
de AWS y el predicado `usaAws`, y **decidir qué pasa con la prueba que documenta
el defecto de `sitio + aws`** — la opción sana es moverla a una prueba de
regresión sobre `projects-init`, que es donde esa combinación sigue siendo
alcanzable por el archivo de valores.

Si la respuesta es **no**, este change se archiva y lo que queda en pie es la
corrección de copia, que ya está aplicada.

**No la tomo por vos**, y no por formalidad: el argumento es más débil que el de
GCP —AWS sí tiene adaptador— y el costo incluye borrar el único registro de un
defecto que ya nos mordió una vez.

La investigación con sus fuentes está en
`../promocion-por-ambientes/la-pregunta-de-plataforma.md`.
