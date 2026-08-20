---
artefacto: proposal
dri: Builder 1
aprueba: Builder 2 (builder par)  # change técnico del estándar de trabajo; el gate
                              # del PO en este repo está acotado a la
                              # capability de gobernanza (.github/CODEOWNERS,
                              # últimas líneas)
informado: PO / Builder 2
estado: pendiente-de-revision
---

# stack-estandar — Proposal

## Why

El marco ya fija parte del stack y a la vez declara que no lo fija. Las dos
frases están escritas y las dos son del repo: `README.md:265-270` dice **«No
impone stack»**, y `plantilla/AGENTS.md:75-77` dice, de las filas Infra, CI/CD y
Package manager de la tabla de stack, que **«llegan llenas porque no son
elección del proyecto: Terraform como IaC, GitHub Actions como pipeline y pnpm
con workspaces los fija el marco»**. Una declaración falsa en prosa no se puede
razonar: no dice qué está fijado, no dice quién lo cambia y no da ninguna salida
al proyecto que necesita otra cosa.

**Los dos proyectos del área llegaron por su cuenta a la misma base, y cada uno
la volvió a tipear.** `proyecto-origen/AGENTS.md:28-37` e
`intranet/AGENTS.md:18-28` (rama `projects/adopcion-marco`) coinciden capa por
capa: React + Vite + TypeScript, Node + Express, PostgreSQL vía Prisma, Clerk,
Zod, AWS + Terraform, GitHub Actions, pnpm con workspaces, Vitest. Y coinciden
en la topología: los dos tienen `infra/ecs.tf`, los dos corren el backend como
contenedor de Express sobre ECS y los datos en una base relacional administrada
(`proyecto-origen/infra-prod/database.tf`; en `intranet`, el cluster Aurora
compartido). La base no es una aspiración de escritorio: es el estado de hecho
**2 de 2**, escrito a mano dos veces, con la deriva previsible en los detalles
—uno pina «React 18» y el otro no, uno dice «Aurora Serverless v2» y el otro
«Aurora PostgreSQL (una sola base)»—.

**Y donde el scaffold delega, delega justo lo que ya está decidido.**
`plantilla/AGENTS.md:57-73` entrega la tabla con 🕳️ en Frontend, Backend, Datos,
Auth, Validación de input y Tests, bajo la instrucción «COMPLETAR AL CREAR EL
PROYECTO», y el motivo escrito es que «una plantilla que trae el stack de otro
proyecto miente desde el día 1» (`:29-30`). Con la decisión de hoy ese motivo se
invierte: no es el stack «de otro proyecto», es el del área. El resultado actual
es el peor de los dos: el proyecto número tres va a volver a tipear la misma
tabla, y lo que escriba mal no lo caza nada.

**La decisión del 2026-08-18 agrega la infraestructura y le pone la forma
fuerte.** La base incluye la **infraestructura base: Express sobre ECS y una
base relacional administrada**, y la forma es **primera opción siempre**:
apartarse se **pregunta ANTES de implementar**. Es la misma forma que la tabla
de stack ya usa para las dependencias («toda dependencia nueva se pregunta
primero»), no la forma débil de «documentá tu desvío después». El texto ya bajó
al canónico en la rama del change hermano `reglas-al-dia`
(`actions/constitucion/canonico/60-infra-aws-secretos.md:5-11` y
`actions/constitucion/canonico/40-fronteras.md:93-97`) —pero **solo como prosa
distribuida**: ningún spec del marco dice que exista una base. Verificado hoy:
los ocho specs vivos de `openspec/specs/` nombran **cero** tecnologías concretas
(la única coincidencia de «ECS» en un grep es la subcadena dentro de «specs»).
Sin requirement, la base no tiene contrato: el próximo PR de este repo puede
reescribirla sin proposal, y un consumidor que declare un desvío no tiene
ninguna propiedad a la que apuntar.

**Y hay un change esperando esta decisión.** `entrega-referenciada` flaguea
explícitamente, sin cerrarlo: «dónde queda escrita la infraestructura fijada
(¿spec canónico nuevo de Projects, o política del área que Projects implementa?) y la
reescritura de `README.md:265-270` («No impone stack») son decisiones **del
change de contrato**» (`design.md:350-354`), porque sus actions nuevas codifican
ECS Express y base relacional administrada. Sin este change eso queda
**quemado**: una topología escrita en el carril referenciado —el que llega a
todos los consumidores sin que lo revisen— sin ningún contrato que diga qué hace
un proyecto que legítimamente no cabe en ella.

## What Changes

- **Capability nueva `base-tecnologica`, con tres requirements.** (1) El marco
  publica una base única, capa por capa, que llega **ya escrita** al proyecto y
  se corrige una vez para todos; cambiarla exige un cambio del marco con su
  decisión, no una edición de texto. (2) Apartarse de una capa exige aprobación
  humana **antes** de que exista el código que implementa la alternativa; el
  pipeline del consumidor rechaza la divergencia sin desvío, y también la
  ausencia de declaración. (3) La base es primera opción, **no una jaula**: las
  piezas de entrega del marco pueden codificarla, y las propiedades quedan
  enunciadas de forma independiente de ellas.
- **La base deja de ser hueco del scaffold.** La tabla llega llena por el mismo
  carril que el resto de las reglas del marco (el artefacto de la constitución
  de `reglas-al-dia`), y lo que el proyecto agrega sobre la base queda en su
  archivo, separado.
- **El desvío es el único override, con aprobador nombrado y acotado a la capa.**
  Apartarse del cómputo no relaja la promoción; y una capa que el proyecto
  todavía no implementó **no es** un desvío, es un pendiente.
- **La salida limpia queda escrita**: el proyecto con desvío aprobado conserva
  los specs como propiedades —promoción, compuertas, serialización, verificación
  de lo desplegado— y es **dueño de su deploy**: no consume las piezas de
  entrega del marco. Cumple el contrato sin la implementación de referencia.
- **Un check en el carril referenciado**: la base declarada por el repositorio
  contra la base publicada por el marco. Diferencia sin desvío, rojo; sin
  declaración, rojo.
- **Se reconcilian los dos textos que hoy contradicen todo esto**:
  `README.md:265-270` («No impone stack») pasa a «trae una base y una salida
  declarada», conservando la parte que sí era verdad; y `AGENTS.md:181-183` («el
  deploy con la topología de su infraestructura es del proyecto») pasa a decir la
  verdad nueva: el proyecto de la base es dueño de la configuración de sus
  ambientes, no de la mecánica, y el proyecto con desvío aprobado es dueño de su
  deploy entero. Las dos las asignó a este change su hermano
  (`entrega-referenciada/tasks.md:44-51`), y el texto de reemplazo está escrito en
  `design.md`, no delegado al implementador.

Las alternativas descartadas —incluida la de nombrar ECS y React dentro del
requirement— están en `design.md`; el orden de ejecución y sus dependencias con
los dos changes hermanos, en `tasks.md`.

## Capabilities

### Added Capabilities

- `base-tecnologica`: la base del área existe, está publicada en un solo lugar,
  es la primera opción, apartarse de ella se pregunta antes de implementar, y el
  proyecto que se aparta con aprobación conserva las propiedades del marco
  siendo dueño de su despliegue.

### Modified Capabilities

- Ninguna. Verificado: los ocho specs vivos no nombran una sola tecnología
  concreta, así que ninguno afirma hoy algo que este change contradiga, y
  ninguno necesita delta para seguir siendo satisfacible por un proyecto con
  desvío aprobado. Esa propiedad —que hoy se cumple por casualidad histórica—
  es justamente la que el tercer requirement convierte en obligación.

## Impact

**Distribución.** Cambian tres de las cuatro formas. **Canónico**: los tres
requirements, y la base concreta como texto publicado que los proyectos
consumen sin copiar. **Scaffold**: la tabla de stack deja de ser huecos y el
`AGENTS.md` de la plantilla se queda con «lo que este proyecto agrega sobre la
base». **Referenciado**: el check nuevo viaja dentro del workflow reusable, así
que llega solo a todo consumidor de `@v1`. *Regenerado* no se toca.

**Depende de dos changes hermanos, y el orden importa.** `reglas-al-dia` aporta
la maquinaria que este change usa como dada: el artefacto de constitución que
los agentes cargan, el ledger de versiones con su ventana de gracia, y el canal
de desvíos con aprobador y motivo escrito. Este change **no** duplica nada de
eso: lo consume. Y `entrega-referenciada` depende de este: su cláusula
anti-quemado es el tercer requirement de acá.

**Acción del consumidor.** Cada repositorio declara su base en forma legible por
máquina y declara como desvío las diferencias reales. Verificado hoy: los dos
consumidores actuales **coinciden con la base**, así que el check nace verde
para ambos y ninguna de las diferencias visibles hoy es un desvío —que `intranet`
no tenga `infra-prod/` ni suite E2E es un pendiente de ese proyecto, y lo exigen
otras capabilities—. Un check que nace verde en los dos repos que existen no
prueba mucho: por eso el estreno igual va en MINOR con la ventana de gracia
activa, que es la regla del marco y no una cortesía.

**¿Rompe a los adoptantes existentes?** No, si se respeta el orden: el contrato
primero, la base publicada como fuente única después, el check al final, y `v1`
recién cuando esté validado contra un consumidor real. Nadie que no modifique
una línea queda rojo antes de su fecha de exigibilidad.

**Lo que este change NO promete.** Fijar la base no la vuelve la base correcta:
la evidencia son dos proyectos, y el propio `entrega-referenciada` fija el
umbral —«dos son un dato, tres son una premisa equivocada»—. Y el check compara
**declaraciones**, no infraestructura desplegada: lo que hace que declarar
mentira no pague no es otro check, es que el carril de entrega solo sabe
desplegar la base. El resto de los límites está en `design.md`.
