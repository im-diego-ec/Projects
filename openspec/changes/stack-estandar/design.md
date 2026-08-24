---
artefacto: design
dri: Builder 1
aprueba: Builder 2 (builder par)
informado: PO
estado: pendiente-de-revision
---

# stack-estandar — Design

## Context

Este change cierra una decisión que otros dos changes ya están usando como
premisa sin que exista.

`entrega-referenciada` la deja anotada como pendiente ajeno: «dónde queda escrita
la infraestructura fijada (¿spec canónico nuevo de Projects, o política del área que
Projects implementa?) y la reescritura de `README.md:265-270` («No impone stack»)
son decisiones **del change de contrato**. Este design las **flaguea, no las
cierra**» (`entrega-referenciada/design.md:350-354`). Sus actions nuevas
codifican ECS Express y base relacional administrada
(`entrega-referenciada/design.md:259-265`), o sea que el carril referenciado —el
que llega a todos los consumidores sin que nadie lo revise— va a llevar una
topología escrita adentro.

`reglas-al-dia` ya bajó el texto al canónico: la infraestructura base fijada
como primera opción (`actions/constitucion/canonico/60-infra-aws-secretos.md:5-11`)
y la frontera ⚠️ de apartarse preguntando antes
(`actions/constitucion/canonico/40-fronteras.md:93-97`). Ese texto llega a los
agentes y su contenido se compara byte a byte contra lo publicado — pero **nada
gobierna qué dice**. Verificado hoy: los ocho specs vivos de `openspec/specs/`
nombran cero tecnologías concretas (la única coincidencia de «ECS» en un grep es
la subcadena de «specs»). Sin requirement, la base es prosa: el próximo PR de
este repo la reescribe sin proposal, y un consumidor que quiera apartarse no
tiene propiedad a la que apuntar.

Y el estado del repo hoy sostiene las dos frases contradictorias a la vez.
`README.md:265-270` declara «No impone stack». `plantilla/AGENTS.md:75-77`
declara que Infra, CI/CD y Package manager «llegan llenas porque no son elección
del proyecto». Las dos están escritas, las dos son del marco, y la primera es
falsa desde antes de este change.

Tres hechos que ordenan el diseño:

**1. La base ya es el estado de hecho, 2 de 2, tipeada a mano dos veces.**
El `AGENTS.md:28-37` del consumidor viejo e `intranet/AGENTS.md:18-28` (rama
`projects/adopcion-marco`) coinciden capa por capa: React + Vite + TypeScript, Node
+ Express, PostgreSQL vía Prisma, Clerk, Zod, AWS + Terraform, GitHub Actions,
pnpm con workspaces, Vitest. Y coinciden en topología: `infra/ecs.tf` en los dos,
base relacional administrada en los dos
(en el consumidor viejo, `infra-prod/database.tf`; en `intranet`, el cluster
Aurora compartido). La deriva ya empezó y está en los detalles: uno pina «React 18», el
otro no; uno dice «Aurora Serverless v2», el otro «Aurora PostgreSQL (una sola
base)».

**2. El scaffold delega exactamente lo que ya está decidido.**
`plantilla/AGENTS.md:57-73` entrega 🕳️ en Frontend, Backend, Datos, Auth,
Validación de input y Tests, con «COMPLETAR AL CREAR EL PROYECTO» y el motivo
escrito: «una plantilla que trae el stack de otro proyecto miente desde el día 1»
(`:29-30`). Con la base fijada, ese motivo se invierte: no es el stack de otro
proyecto, es el del área. El proyecto tres va a volver a tipear la misma tabla y
lo que escriba mal no lo caza nada — es el mismo modo de falla que
`reglas-al-dia` documentó para la copia lossy de `intranet`, aplicado a la tabla
de stack.

**3. La forma que pidió Builder 1 es la fuerte, y la distinción no es de estilo.** No
alcanza «excepción registrada»: la base es primera opción **siempre**, y apartarse
se **pregunta antes de implementar**. La forma débil —documentá el desvío
después— tiene un modo de falla con nombre, y el propio canónico ya lo escribió:
«Descubrir en el review que el servicio ya está desplegado convierte la decisión
en un hecho consumado» (`canonico/40-fronteras.md:96-97`). Un review sobre algo
ya desplegado no evalúa una decisión: la ratifica.

La pregunta de diseño, entonces, no es *cuál* es la base —eso está decidido—. Es
**dónde se escribe, quién la puede cambiar, y cómo se codifica en el carril
referenciado sin dejar sin salida al proyecto que legítimamente no cabe.**

## Decisions

### D1 — Capability nueva `base-tecnologica`, no un requirement colgado de otra

Las ocho capabilities vivas describen **el carril** por el que viaja cualquier
proyecto, y ninguna describe con qué está construido: por eso ninguna nombra una
tecnología. Este change agrega una dimensión que no existía, y meterla en una
capability existente la parte en dos mitades mal archivadas.

**Alternativa descartada: `operacion-infra`.** Es el candidato más cercano —la
topología base es infraestructura— y falla en la mitad de arriba: la capa de
frontend, de backend, de identidad y de pruebas no son garantías operativas. Sus
cinco requirements son propiedades operativas agnósticas (state remoto, alarmas,
presupuesto, backups, retención); meter «el backend corre sobre contenedores»
ahí contamina una capability cuya virtud actual es no depender de ninguna
tecnología, y deja la mitad del stack sin domicilio.

**Alternativa descartada: `gobierno-contribucion`.** Atrae por el gate («quién
aprueba qué» es gobernanza) y falla por dos lados. Archiva mal la mitad de
infraestructura, y —más caro— arrastra el gate del PO sobre una decisión de
maquinaria: `.github/CODEOWNERS:54-55` pone al PO como owner de esa capability
justamente para acotar su gate a la gobernanza del trabajo, y `AGENTS.md:60-73`
explica por qué. Fijar el stack es decisión de builders; hacerla pasar por el PO
porque el archivo quedó en esa carpeta es un efecto lateral de archivar mal.

**Alternativa descartada: partir el delta entre dos capabilities.** Fragmenta una
sola propiedad en dos, y duplica la superficie del hueco conocido del guardrail
de deltas —un `MODIFIED` cuyo título de requirement no existe en el spec vigente
**no avisa** (`AGENTS.md:78-84`)—. Una propiedad, un delta, una capability.

**Gotcha del CLI, y es tarea, no nota al pie:** una capability que nace por
`openspec archive` nace con `Purpose: TBD` y hay que completarlo **en el mismo
PR del archive** (`canonico/10-openspec.md:52`, que es la regla que el propio
marco publica). El texto queda escrito en `tasks.md` para que el archive lo
copie y no lo redacte de nuevo.

### D2 — El spec enuncia la propiedad; los nombres concretos se publican en el canónico, con fuente única

El requirement dice que existe una base, capa por capa, publicada en un solo
lugar, que es primera opción y que solo cambia por un cambio del marco. **No dice
«ECS».** La lista concreta —React + Vite + TypeScript, Node + Express, PostgreSQL
vía Prisma, Clerk, Zod, Express sobre ECS, base relacional administrada, AWS +
Terraform, GitHub Actions, pnpm con workspaces, Vitest + Playwright— vive en el
canónico que los agentes cargan, en la tabla que el scaffold entrega, y en este
change, que al archivarse es historia inmutable.

**Alternativa descartada: nombrar las piezas dentro del requirement.** Se
descarta por dos razones concretas. (i) Rompe la simetría con los ocho specs
vivos, que no nombran una sola tecnología (verificado), y esa simetría no es
estética: es lo que hace que un spec siga siendo válido cuando el proveedor
renombra un servicio. Un cambio de nombre comercial exigiría un change de spec
sin un solo cambio de comportamiento. (ii) Convierte el spec en la tabla, y
entonces hay dos tablas —la del spec y la del canónico— que pueden divergir; el
change hermano ya pagó ese precio en los `AGENTS.md` de los consumidores.

**La contra-objeción, dicha de frente:** enunciar la propiedad sin nombrar la
base puede leerse como esquivar la decisión del Builder 1. No la esquiva, y la
diferencia es verificable: la base concreta queda escrita capa por capa en el
canónico —el archivo que **todo agente de todo repo carga en cada sesión**—, en
la tabla que el scaffold entrega llena, y en este change archivado. Lo que el
spec fija es lo que un check puede vigilar y un consumidor puede invocar: que la
base exista, que sea primera opción, que solo cambie por change, y que apartarse
se pregunte antes. El nombre del servicio es **dato**; que haya un solo dato y
que nadie lo cambie por su cuenta es la **propiedad**.

### D3 — El gate fuerte, y exactamente hasta dónde se mecaniza

«Preguntar antes» no es verificable por un check: ningún archivo registra el
orden en que ocurrieron una conversación y un commit. Lo que sí se mecaniza es la
consecuencia:

- El desvío exige **un aprobador humano nombrado y una fecha**. Sin eso, el repo
  está rojo.
- Entonces el código que implementa la alternativa **no se puede integrar** antes
  de que la pregunta esté contestada por escrito, en un diff, bajo CODEOWNERS.
- Y el desvío no lo puede otorgar quien implementa: el campo del aprobador
  existe para que ese nombre sea de otro.

**El límite exacto, y hay que decirlo:** el check no distingue «preguntó y
después implementó» de «implementó y después consiguió el sí». Lo que cierra ese
hueco no es un check, es el orden del review — y el marco ya sabe que eso no es
enforcement. Lo que este diseño garantiza es más chico y verificable: **una
alternativa no llega a `main` sin una aprobación escrita**, y ninguna llega en
silencio.

**Alternativa descartada: la forma débil («excepción registrada» después).** Es
la que Builder 1 rechazó explícitamente hoy, y su modo de falla ya está escrito en el
canónico: el hecho consumado (`canonico/40-fronteras.md:96-97`).

**Alternativa descartada: exigir que el desvío exista antes del primer commit del
código.** Se puede verificar (el desvío en un commit anterior al del código), y se
descarta porque premia partir el PR en dos y no agrega información: un desvío
declarado en el mismo PR que la implementación, aprobado por un humano que no la
escribió, es exactamente la decisión que se quería. El orden intra-PR es ruido.

### D4 — La base se codifica en las piezas de entrega; el contrato queda satisfacible sin ellas

Esta es la cláusula anti-quemado, y es la que `entrega-referenciada` necesita
para poder escribir ECS adentro de sus actions:

- El marco **puede** asumir la topología fija en sus workflows y actions, sin
  parámetros de topología especulativos.
- Las propiedades que esas piezas hacen cumplir **quedan enunciadas de forma
  independiente de ellas**: ninguna propiedad del marco se enuncia de modo que
  solo la implementación de referencia pueda satisfacerla.
- El proyecto con desvío aprobado de cómputo o persistencia **conserva los specs
  como propiedades** —promoción con dev antes que producción, compuertas de CI,
  serialización sobre el ambiente compartido, verificación de lo desplegado,
  observabilidad, secretos— y es **dueño de su deploy**: deja de consumir las
  piezas de entrega y no deja de cumplir el contrato.

Es la resolución que el hermano ya escribió como salida limpia
(`entrega-referenciada/design.md:259-265`), elevada acá a requirement para que no
dependa de que alguien recuerde el párrafo.

**Alternativa descartada: prohibirle al marco codificar la topología.** Obliga a
parametrización especulativa —inputs de topología para casos que no existen—, que
es justamente el costo que fijar la base elimina; y una promoción que sabe
desplegar «cualquier cosa» no sabe desplegar nada, con el 100% de los proyectos
pagando la generalidad que usa ninguno.

**Alternativa descartada: base sin salida.** La rigidez sin salida legal no
produce cumplimiento: produce que el proyecto copie el workflow del marco a su
repo o forkee Projects, las dos 🛑 de `AGENTS.md:169-179`. La salida existe, está
acotada y es visible.

### D5 — El desvío es por capa, y un pendiente no es un desvío

Dos acotaciones, las dos necesarias para que el canal no se vacíe de significado:

1. **Acotado a la capa que nombra.** Apartarse del cómputo no relaja la
   promoción, ni las compuertas, ni la verificación de lo desplegado. Sin esto,
   el primer desvío se convierte en la llave maestra.
2. **Una capa que el proyecto todavía no implementó no es un desvío.** El caso
   es real y está hoy en el repo del segundo consumidor: `intranet` no tiene
   `infra-prod/` («producción aún no está aprovisionada») ni suite E2E
   automatizada (`intranet/AGENTS.md:25,28`). Eso no es «usa otra herramienta»,
   es «todavía no la tiene»: lo exigen las capabilities que lo especifican, no
   este canal. Si la deuda técnica entra por el canal de desvíos, el check pierde
   su significado y el ledger de desvíos deja de ser la señal que la revisión
   trimestral necesita contar.

### D6 — El consumidor declara su base en su archivo de valores, y el check compara declaraciones

La declaración va en el archivo de valores que `reglas-al-dia` ya introdujo del
lado del consumidor (`.projects-valores.json`), como un bloque capa → pieza. El
check —paso nuevo del job `higiene` de `marco-ci.yml`, o sea carril referenciado,
o sea llega solo a todo consumidor de `@v1`— compara ese bloque contra la base
publicada por la versión vigente del canónico: una capa que difiere sin desvío es
roja, y **la ausencia del bloque también** (misma doctrina que el hermano fijó en
su D7: la ausencia no es «no aplica», es una comprobación que no se pudo hacer).

**Alternativa descartada: parsear la tabla markdown del `AGENTS.md` del
proyecto.** Frágil por tres lados a la vez: el formateador reflowea, los
sinónimos son infinitos («PostgreSQL» / «Postgres» / «Aurora PostgreSQL») y las
versiones ensucian la comparación («React 18» vs «React»). Un campo declarado
compara bien; una tabla de prosa, no.

**Alternativa descartada: inferir la base del IaC y de los manifests.** Suena más
honesto —mira la realidad, no la declaración— y produce falsos rojos que valen
más caro que el hueco que cierran: una función serverless de glue no es «la
topología del backend», y distinguirlo exige una lista de tipos de recurso
prohibidos que alguien tendría que mantener. Es el patrón que el hermano ya
rechazó para los permisos del agente: la propiedad va sobre lo declarado, no
sobre una lista negra.

**El segundo orden, dicho:** el check compara **declaraciones**, no
infraestructura desplegada. Lo que hace que declarar mentira no pague no es otro
check: es que **el carril de entrega solo sabe desplegar la base**. Un proyecto
que se aparta sin declararlo no se queda con un check verde y un problema oculto
— se queda sin deploy en la primera corrida.

### D7 — La reconciliación de los dos textos, escrita acá para que no se redacte de nuevo

Son dos, y las dos las asignó a este change su hermano
(`entrega-referenciada/tasks.md:44-51`): `README.md:265-270` («No impone stack»)
y `AGENTS.md:181-183` («el deploy con la topología de su infraestructura es del
proyecto»). Las dos contradicen a las actions de entrega que ese change va a
publicar, y publicar una pieza que contradice el documento que la explica es
enseñar a no leer los documentos.

**Primero, el README.** `README.md:265-270` («No impone stack») se reemplaza. Era falsa en dos de sus
tres afirmaciones ya antes de este change: el scaffold **sí** fija Terraform,
GitHub Actions y pnpm con workspaces (`plantilla/AGENTS.md:75-77`), y el CI del
marco ejecuta pnpm directamente y depende de una propiedad concreta del workspace
—un único lockfile en la raíz— (`plantilla/AGENTS.md:79-85`). Lo que sí era
verdad es la promesa de fondo, y esa se conserva: un proyecto que se aparta sigue
obteniendo el flujo de specs, la gobernanza, los guardrails, el veredicto único
de CI y la promoción por ambientes. La diferencia es que ahora eso es un
requirement, no una promesa de prosa.

Texto propuesto para el bullet (el implementador lo ajusta de forma, no de
fondo):

> - **Trae una base, y la salida está declarada.** El área fija su base
>   tecnológica —cómputo, persistencia, frontend, backend, identidad, validación
>   de input externo, IaC, pipeline, gestor de paquetes y pruebas— y Projects la
>   publica y la entrega ya
>   escrita: es la **primera opción** de todo proyecto, y apartarse de cualquier
>   capa se **pregunta antes de implementar**. Un proyecto con una necesidad
>   legítimamente distinta no queda afuera: declara el desvío de esa capa con su
>   aprobador y su motivo, **conserva las propiedades del marco** —promoción,
>   compuertas de CI, serialización, verificación de lo desplegado— y es dueño de
>   su despliegue, sin consumir las piezas de entrega de referencia. Lo que Projects
>   no hace es adivinar: la base se publica en un solo lugar y solo cambia por un
>   change de este repo. La capability `base-tecnologica` lo especifica.

La tabla de las cuatro formas de distribución (`README.md:61-66`) no cambia; sí
hay que revisar la fila **Scaffold** en la prosa, porque la tabla de stack deja de
ser scaffold y pasa a llegar por el artefacto del marco.

**Segundo, `AGENTS.md:181-183`.** Hoy dice que el deploy con la topología de su
infraestructura es del proyecto, y eso deja de ser cierto para el proyecto que
corre sobre la base: su mecánica de deploy va a llegar por el carril referenciado.
Sigue siendo cierto —y es lo que hay que conservar— para el proyecto con desvío
aprobado. Texto propuesto:

> Lo que **sí** es del proyecto: sus migraciones, sus sondas, sus specs de
> dominio y todo lo que el scaffold le entregó el día uno. Su **deploy** lo es en
> la medida en que la base lo deja: un proyecto que corre sobre la base
> tecnológica del área consume las piezas de entrega del marco y es dueño de la
> **configuración** de sus ambientes, no de la mecánica; un proyecto con un
> desvío aprobado de la capa de cómputo o de persistencia es dueño de su deploy
> **entero** y no consume esas piezas — conserva las propiedades que fija
> `base-tecnologica`, no la implementación de referencia.

Con eso queda escrita la **figura de la excepción registrada** que el hermano
declara sin dueño: no es un párrafo de cortesía, son los requirements 2 y 3 del
delta de acá, y estos dos textos son su cara visible en la documentación.

### D8 — Estreno con ventana de gracia, aunque el check nazca verde

Los dos consumidores actuales coinciden con la base, así que el check nace verde
para ambos. Eso **no** habilita saltar la ventana de gracia: la regla del marco
es que un endurecimiento se estrena en modo aviso (`AGENTS.md:143-145`), y acá
además hay una razón propia: un check que nace verde en los dos repos que existen
está poco probado, y el modo aviso es la única corrida real que va a tener antes
de bloquear a alguien. El paso entra en MINOR con la ventana activa del ledger
que ya administra `reglas-al-dia`, y `v1` se mueve después de validar contra un
consumidor real (`AGENTS.md:150-156`).

## La propiedad, enunciada

> **El marco publica una base tecnológica única y es la primera opción.** Capa
> por capa, en un único lugar que los proyectos consumen sin copiar; llega ya
> escrita, se corrige una vez para todos, y cambiarla exige un cambio del marco
> con su decisión — no una edición del texto que la publica.
>
> **Apartarse de la base se pregunta antes de implementar.** Con aprobación
> humana previa, por capa, con motivo escrito; el pipeline del consumidor rechaza
> la divergencia sin desvío y también la ausencia de declaración. Un desvío no
> relaja ninguna otra propiedad, y una capa que el proyecto todavía no implementó
> no es un desvío.
>
> **La base es la primera opción, no una jaula.** Las piezas de entrega del marco
> pueden codificarla; las propiedades quedan enunciadas de forma independiente de
> ellas, y el proyecto con desvío aprobado conserva todas esas propiedades siendo
> dueño de su despliegue.

Nada en el enunciado nombra un servicio ni un framework: los nombres son dato
publicado, y el spec fija que exista uno solo, quién lo puede cambiar y qué pasa
cuando un proyecto necesita otro. Los scenarios completos están en
`specs/base-tecnologica/spec.md`.

## Cómo se hace cumplir solo

| Requirement | Check | Falla cuando |
|---|---|---|
| El repositorio declara su base | paso `Base tecnologica declarada` (job `higiene` de `marco-ci.yml`, nuevo) | el archivo de valores del consumidor no trae el bloque de base — ausencia es rojo, nunca `exit 0` mudo |
| La base declarada es la base publicada | ídem | una capa difiere de la base publicada por la versión vigente del canónico y no hay desvío para esa capa |
| El desvío nombra aprobador, fecha y motivo | ídem, y el ciclo de vida lo aporta `gobierno-contribucion` | falta el aprobador o el motivo; el desvío huérfano y su reimpresión los cubre el check de constitución |
| Hay una sola base publicada | check en el CI de **Projects** | la tabla que entrega el scaffold y la base del canónico divergen: se renderizan de la misma fuente y el check compara |
| Cambiar la base exige decisión | **— sin check** | no hay forma mecánica de distinguir «corrección de redacción» de «cambio de base». Lo acota que la base viva en un archivo bajo CODEOWNERS y que el PR de Projects exija declarar impacto en consumidores |
| Se preguntó ANTES de implementar | **— parcial, por construcción** | el check exige la aprobación escrita para integrar, no puede fechar la conversación. Ver D3 |
| Lo declarado es lo desplegado | **— sin check, y a propósito** | el check compara declaraciones. El segundo orden lo cierra la estructura: el carril de entrega solo sabe desplegar la base (D6) |
| Los desvíos repetidos reabren la base | **— sin check** | Projects no lee los repos de los consumidores; el conteo agregado sigue siendo la revisión trimestral, que su propio texto declara que no es enforcement |

## Migración

**Orden, y el primer bloque es bloqueante.** `reglas-al-dia` aporta el artefacto,
el ledger de versiones y el canal de desvíos; este change los consume. Si la base
se publica antes de que ese mecanismo exista, la tabla de stack queda otra vez
como texto que cada repo copia a mano — el problema que este change existe para
cerrar.

1. **Contrato primero** (este change): delta, `validate --strict`, guardrail.
2. **Base publicada como fuente única**: el bloque de base en el manifiesto del
   canónico, la sección del canónico que la imprime, y la tabla del scaffold
   renderizada de la misma fuente. Acá desaparecen los 🕳️ de
   `plantilla/AGENTS.md:57-73` y la sección «Antes del primer commit» pierde su
   paso 1.
3. **El check**, con fixtures dentro de la action (los cuatro casos: sin bloque,
   base igual, capa distinta con desvío, capa distinta sin desvío).
4. **README y ADR**: el bullet de D7, y un ADR nuevo en `docs/adr/` — fijar la
   base y reescribir «no impone stack» es exactamente la clase de decisión
   estructural que esa carpeta guarda.
5. **Los dos consumidores** declaran su base. Verificado: los dos coinciden, así
   que el PR de cada uno es el bloque de valores y nada más. Ninguna de las
   diferencias visibles hoy es desvío (D5).
6. **CHANGELOG, MINOR, ventana de gracia, y `v1` al final** (D8).

## Lo que este diseño NO resuelve

- **Fijar la base no la vuelve la base correcta.** La evidencia son dos
  proyectos que coincidieron. El propio `entrega-referenciada` fija el umbral de
  refutación —«dos son un dato, tres son una premisa equivocada y se reabre este
  design» (`design.md:361-365`)— y este change no aporta el mecanismo para
  contarlos: Projects no lee los repos de los consumidores, así que el conteo sigue
  siendo el ritual trimestral. Es deuda declarada, no resuelta.
- **«Preguntó antes» no es verificable**, solo «está contestado por escrito antes
  de integrarse» (D3). Un proyecto decidido a implementar primero y pedir después
  puede hacerlo; lo que no puede es que pase inadvertido.
- **El check compara declaraciones, no infraestructura.** La contención es
  estructural, no un check (D6), y por lo tanto se debilita el día que exista una
  segunda forma de desplegar dentro del carril del marco.
- **La base fija la pieza, no su versión mayor.** «React» no dice React 18 o 19
  —hoy `intranet` pina 18 y el otro consumidor no—, y el check no va a cazar
  esa divergencia. Las versiones las gobierna la política de dependencias; si
  algún día importa que dos repos corran la misma mayor, es otro change.
- **Nada limita cuántos desvíos declara un proyecto.** Se hereda del canal de
  desvíos: un repo puede quedar verde con la base entera desviada. Lo único que
  lo contiene es que cada desvío sea un diff con aprobador nombrado bajo
  CODEOWNERS, y que su motivo se reimprima en cada corrida.
- **El proyecto que se aparta paga más caro que antes.** Pierde el carril de
  entrega y mantiene su propio despliegue. Eso es deliberado —es el precio de que
  el 100% de los demás no pague la generalidad— pero conviene decirlo sin
  adornos: para ese proyecto, adoptar Projects vale menos que para los otros.
- **Este change no fija la estructura de carpetas ni la forma del monorepo**, que
  el canónico ya menciona («respetar el stack y la estructura de carpetas
  fijados») sin que ninguna capability la especifique. Es un hueco vecino,
  visible desde acá, y queda afuera a propósito para no mezclar dos decisiones en
  un change.
