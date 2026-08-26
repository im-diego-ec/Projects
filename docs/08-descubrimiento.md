# Descubrimiento: de la idea a saber qué construir

Esta página es para el **[PO](02-glosario.md)**, y es la primera del par: acá se
decide **qué** hay que construir y por qué. Lo de **cómo** se construye está en la
siguiente, [09-construir-con-openspec.md](09-construir-con-openspec.md).

Ese corte no es una convención de esta documentación: es el reparto de roles que
el marco hace cumplir con `CODEOWNERS`. Lo que sale de acá —la propuesta y los
escenarios— lo **aprueba el PO**; lo que sale de la página siguiente lo aprueba
el otro [builder](02-glosario.md).

**Si trabajás solo, las dos páginas son tuyas.** Lo que cambia no es qué hay que
hacer sino quién lo hace, y saber en cuál de los dos roles estás parado es
justamente lo que evita saltarse el descubrimiento porque «ya sé lo que quiero».

> **Qué NO te da esta página.** No te da los specs. El descubrimiento llega hasta
> el **PRD** —un documento en prosa que dice qué tiene que hacer el sistema— y de
> ahí en adelante empieza la página 09. No hay ningún comando que convierta lo
> uno en lo otro, y creer que lo hay es el malentendido más caro de este tramo.

**Palabras del marco que vas a ver acá**, cada una definida en una línea en el
[glosario](02-glosario.md): [ADR](02-glosario.md), [capability](02-glosario.md), [change](02-glosario.md), [CODEOWNERS](02-glosario.md), [constitución](02-glosario.md), [delta](02-glosario.md), [guardrail](02-glosario.md), [marcador](02-glosario.md), [PRD](02-glosario.md), [proposal](02-glosario.md), [requirement](02-glosario.md), [scaffold](02-glosario.md), [spec](02-glosario.md).

---

## Las palabras de este tramo

El repo ya está verde. Lo que sigue es el trabajo.

`openspec/specs` y `openspec/changes` nacen **vacíos**, y ⚠️ **git no versiona
directorios vacíos**: quien clone el repo no los va a tener hasta que exista el
primer change. `validate --all --strict` sobre el árbol recién instanciado sale
verde, pero es un verde **vacuo** — no hay nada que validar.

⚠️ **El momento peligroso:** `openspec new change` deja el CI **rojo** hasta que el
change tenga su delta. Así que el change se crea y se completa en la misma sesión, o
se trabaja en una rama sin PR abierto todavía.

Los seis pasos y quién aprueba cada uno están en **`.projects/AGENTS-marco.md` de tu
repo** —la porción del marco de la constitución, que `projects init` te dejó
renderizada; su fuente vive en
[`actions/constitucion/canonico/10-openspec.md`](../actions/constitucion/canonico/10-openspec.md)—:
proposal y specs los aprueba el **PO**; design y tasks los revisa **el otro builder**.

⚠️ **No lo busques en el [`AGENTS.md`](../AGENTS.md) de este repo, que dice lo
contrario a propósito.** Acá el PO **no** aprueba proposals ni specs, porque en el
marco no hay producto: todo change es técnico y ese reparto convertiría al PO en
revisor obligatorio de cada guardrail de ingeniería. En **tu** proyecto sí los
aprueba, porque ahí proposal y spec son el qué y el por qué del negocio. Son dos
constituciones distintas y la que te gobierna es la tuya.

Los **6 comandos `/opsx:*`** y las 6 skills
`openspec-*` cubren el ciclo: los deja `openspec init`, que `projects init` corre en su último
paso — si ese paso falló, no están, y hay que correrlo a mano.


Esta sección es para el caso más común: **el PO ya hizo el trabajo de negocio** —entrevistó
gente, levantó los procesos, escribió los casos raros, hizo un prototipo— y hay que
convertir eso en specs de OpenSpec.

Antes de los pasos, tres palabras que se usan abajo:

| Palabra | Qué es |
|---|---|
| **BMAD** | La herramienta de descubrimiento. Se instala dentro de Claude Code como un montón de *skills*: le hablás y te va escribiendo documentos. Nadie del equipo la usó todavía |
| **PRD** | *Product Requirements Document.* Un documento en prosa que dice qué tiene que hacer el sistema. **Lo escribe BMAD** leyendo los documentos del PO. **No es un spec y no es contrato**: es material de lectura |
| **Delta** | El archivo de OpenSpec que dice qué cambia en los specs vivos. **Esto sí es el contrato**, y lo aprueba el PO |

Y la advertencia que evita la confusión más cara:

> **BMAD no genera specs de OpenSpec, y no hay ningún comando que convierta lo uno en lo
> otro.** BMAD llega hasta el PRD. De ahí en adelante los specs los escribe una sesión de
> agente **dentro del repo**, leyendo el PRD. Ese paso es trabajo, y es así a propósito: el
> contrato lo firma una persona.

### Dos sesiones, y qué se hace en cada una

Es la pregunta que más marea, así que va primero:

| Sesión | Dónde se abre | Qué se hace ahí |
|---|---|---|
| **La del descubrimiento** | `~/descubrimiento-<proyecto>` | Instalar BMAD, la **lista de cobertura**, el PRD y sus vueltas de pulido (pasos 1 a 6) |
| **La del proyecto** | La carpeta del repo | El proposal, los deltas, y la **tercera columna** de la lista (pasos 7 y 8) |

**Los documentos del PO no se mueven nunca**: viven en la carpeta del descubrimiento y no
entran al repo. Lo que cruza son tres cosas: lo que el agente lee (el PRD y los documentos)
y **un archivo que se commitea**: la lista de cobertura.

### El camino completo

```
documentos     ──►  lista de   ──►  BMAD  ──►  PRD  ──►  sesión en   ──►  proposal   ──►  lista
  del PO           cobertura         (5)      (5-6)      el repo          + deltas       completa
   (3)             col. 1-2                                 (7)             (7)          col. 3 (8)
 ─────────────── sesión del descubrimiento ───────────    ────── sesión del proyecto ──────
```

---

### 1 · Un directorio aparte, fuera del repo

```bash
mkdir ~/descubrimiento-<proyecto>
cd ~/descubrimiento-<proyecto>
git init
```

⚠️ **Fuera del repo, y no es prolijidad: está medido que el CI se pone rojo.** Si instalás
BMAD dentro del repo del proyecto, dos de sus archivos traen marcadores entre dobles llaves
y el check «Sin marcadores del scaffold sin resolver» da **rojo** para siempre, sobre
archivos que nadie escribió ni puede arreglar. Y en Windows nativo `git add` falla con
`Filename too long` en los `__pycache__` de la herramienta — ver la tabla de fallos por
sistema operativo del final.

El `git init` de acá **no** versiona nada del proyecto: es para poder volver atrás si BMAD
sobrescribe algo (paso 6). En Windows nativo, dejale además un `.gitignore` con
`__pycache__/` y `.venv/` **antes** del paso 6: son salida de la herramienta, y son lo que
hace fallar ese `git add` justo cuando lo necesitás.

### 2 · Instalar BMAD ahí

```bash
npx --yes bmad-method@6.11.0 install --yes --modules bmm --tools claude-code --directory .
```

Versión exacta, nunca el nombre pelado: es la regla del marco para todo comando que
descarga. Ensayado el 2026-08-20: **termina bien**, escribe unas 49 skills y ~2,9 MB.
Necesita `uv` (lo verificaste en «Antes de empezar»).

### 3 · Poner los documentos del PO, numerados

Copialos a un subdirectorio y **numeralos al copiarlos**. Son **dos letras**, y el número es
el orden en que el PO te los entregó:

```
documentos/
  D01-procesos-recepcion.md        D = cualquier cosa escrita
  D02-casos-borde-recepcion.md
  D03-feedback-usuario.md
  P01-prototipo/                   P = el prototipo
```

**Por qué solo dos letras.** Una letra existe **únicamente si el localizador se resuelve de
otra manera**, y con eso el juego se reduce solo: en algo escrito el localizador es el
encabezado o el punto numerado que el archivo ya trae (`D01-3.2`); en el prototipo es el
rótulo de la pantalla o del control (`P01-detalle-de-recepcion`). El feedback escrito **es**
algo escrito, así que es `D`; el que vive dentro del prototipo es parte de `P`. Si algún día
aparece una **grabación**, ahí sí hace falta una tercera —`E`, con el localizador en
`hhmmss`— porque se resuelve distinto de las dos.

**Y para qué sirven los números, que si no se dice parecen burocracia:** son la única forma de
escribir «esto salió de acá» en el repo **sin copiar el documento al repo**. Los documentos
no entran nunca —pueden tener nombres de empleados, clientes y proveedores reales—, así que
lo que viaja es el código. `D01-3.2` se lee «el punto 3.2 del documento D01», y el `3.2` lo
trae el documento: no lo inventás vos.

### 4 · La lista de cobertura · **sesión del descubrimiento**

**Qué es:** la lista de todo lo que dicen los documentos del PO, numerada, para poder
verificar después que nada se perdió. Tiene tres columnas y **acá se llenan las dos
primeras**; la tercera se llena en el paso 8, cuando existan los escenarios.

**Por qué va acá y no después del PRD:** con la lista hecha primero te sirve **dos veces** —
para revisar que el PRD no perdió nada (paso 6) y para revisar que los specs no perdieron
nada (paso 8). Hecha después, solo sirve para lo segundo.

Es trabajo mecánico y le sale bien a un agente. En la sesión del descubrimiento, este prompt:

```
Leé todos los archivos de documentos/ y armá la lista de cobertura en
lista-de-cobertura.md, con este formato exacto:

| id | de dónde | qué dice | destino |
|---|---|---|---|

Reglas:
- Una fila por AFIRMACIÓN, no por documento ni por párrafo. Si un pasaje dice dos
  cosas, son dos filas. Si un documento lista doce casos borde, son doce filas.
- id: I001, I002, … correlativo, sin saltos y sin reutilizar.
- "de dónde": el código del documento, guion, y el localizador QUE EL DOCUMENTO YA
  TRAE (un número de punto, un encabezado, el rótulo de una pantalla). Ejemplo:
  D01-3.2. Si el documento no numera nada, usá el ordinal del párrafo y marcalo
  con ~ (D01-~14) para que se sepa que ese número lo pusiste vos.
- Si la afirmación NO está en el documento y la estás infiriendo, escribí en "de
  dónde" la palabra DEDUCIDO y el ancla de lo que sí dice el documento.
- "qué dice": la CITA TEXTUAL del documento, no un resumen tuyo. Si el pasaje es
  largo, la oración que contiene la afirmación, no el párrafo entero. Copiá las
  palabras como están.
- Y con una sola excepción, que es obligatoria: reemplazá todo nombre de persona,
  cliente o proveedor real por su ROL ENTRE CORCHETES — «[jefe de bodega]»,
  «[proveedor]». Los corchetes importan: son lo que deja ver que ahí hubo un
  reemplazo, y sin ellos no se distingue una cita de una paráfrasis. Este archivo
  SÍ entra al repositorio, y los documentos no.
- "destino": dejala VACÍA. Se llena más adelante.

No leas ni uses ningún PRD para esto: la lista tiene que salir de los documentos
originales, que son la fuente. Si algo no está en los documentos, no lo agregues.
```

⚠️ **Lo más importante de ese prompt es «no uses ningún PRD».** Si la lista se arma leyendo
el PRD, deja de servir para lo único que sirve: detectar lo que el PRD perdió.

Lo que tiene que salir, con las tres primeras filas de ejemplo:

| id | de dónde | qué dice | destino |
|---|---|---|---|
| `I001` | `D01-3.2` | «No se recibe mercadería sin la orden de compra firmada.» | |
| `I002` | `D01-3.2` | «La firma la da [jefe de bodega] o su suplente.» | |
| `I003` | `DEDUCIDO` desde `D01-3.2` | el documento no dice qué pasa si la orden llega después de la mercadería | |

Fijate en tres cosas del ejemplo, porque son las que se rompen: el **mismo ancla** `D01-3.2`
sostiene dos filas —el pasaje decía dos cosas—; el corchete de `[jefe de bodega]` deja ver
dónde hubo un reemplazo; y la fila `DEDUCIDO` **no** lleva comillas, porque no es una cita de
nada: es algo que notaste vos.

### 5 · Pedirle a BMAD el PRD

##### Antes: qué se decide acá, y qué ya está decidido

Es la duda más razonable de un proyecto nuevo: *¿le digo que es un sistema web, o le cuento el
proceso y que él decida si conviene un portal o un chatbot?* La respuesta corta es **ninguna de
las dos**, y por tres motivos distintos.

**1. La forma no se decide acá, y no la decide una herramienta.** El stack está fijado por el
marco: app web —React con Vite adelante, Express de API, Postgres por Prisma, Supabase Auth
para identidad— sobre ECS y RDS. Apartarse de eso es una frontera ⚠️ que **se pregunta antes de
implementar**, y la contesta una persona. Así que no le preguntes «¿portal o chatbot?»: no es
su decisión. Y si al leer los documentos tu conclusión honesta es que esto no debería ser una
app web, eso **para el trabajo y se pregunta** — no se resuelve dentro de un PRD.

**2. La estructura inicial y el login YA están.** No son un change, ni un spec, ni una tarea
pendiente. Después de la fase 3 ya tenés corriendo, con sus pruebas pasando:

| Ya existe | Qué es |
|---|---|
| Una página con el nombre del proyecto | Y el estado del API leído en vivo |
| **Ingreso por correo y menú de usuario** | El componente `Identidad` de `web/src/App.tsx`, cableado contra `web/src/auth.ts`: sin sesión pide el correo y manda el enlace de acceso; con sesión muestra el correo y el botón *Cerrar sesión* |
| `GET /api/health` | Abierto, es lo que verifica el pipeline |
| `GET /api/hello` | **Detrás de `requireAuth`**: la cadena de identidad ya funciona de punta a punta |
| `requestId`, `errorHandler`, logging | La mecánica de observabilidad que el marco exige |

Así que la pregunta «¿cómo sabe que no hay nada y tiene que crear la estructura y poner el
login?» no tiene que contestarse: **no hay nada que crear ahí**.

**3. Lo que el proyecto especifica es su negocio, y nada más.** Los ocho specs del marco
—`calidad-codigo`, `despliegue-ci`, `observabilidad`, `pipeline-entrega`…— hablan de **cómo se
trabaja y cómo se opera**, y llegan por referencia. El `openspec/specs/` del proyecto nace
vacío y es para **el comportamiento del producto**. Por eso el primer change de un proyecto
nuevo **no es «la base»**: es la primera rebanada de negocio, igual que en un proyecto que ya
existe.

##### Por qué un change sobre algo que ya existe se entiende más fácil

En un sistema en marcha el change se ve solo: *«ahora hay dos edificios y el estacionamiento es
por separado»* — hay un spec, y esto lo cambia. En un proyecto nuevo es **exactamente el mismo
trabajo**, con una sola diferencia: el spec **nace** en ese change en vez de modificarse.

| | Proyecto que ya existe | Proyecto nuevo |
|---|---|---|
| El delta dice | `MODIFIED` sobre un requirement vigente | `ADDED`: la capability nace acá |
| Todo lo demás | igual | igual |

No hay un modo «arranque» distinto. Lo que se siente distinto es solo que la primera vez no hay
nada contra qué contrastar, y para eso está la lista del paso 4.

**Lo que sí es decisión del día uno y va en el primer change**: qué roles existen y quién puede
qué, y las reglas del proceso. Lo que es decisión **técnica** —¿hace falta una cola?, ¿otra
base?— es frontera ⚠️: se pregunta, y va a `design.md` con su ADR. Nunca al PRD.

##### Antes: ¿una rebanada o todo el sistema?

Un proyecto nuevo es grande y la pregunta aparece sola. **BMAD no parte el trabajo en
changes, y eso es una decisión del marco, no una limitación.** Sus «épicas» viven en su fase
3, *después* de decidir la arquitectura —v6 las movió ahí a propósito, porque la arquitectura
cambia cómo conviene partir—, y esa fase no se adopta: el marco ya tiene `design.md`,
`tasks.md` y review cruzado. Así que **el PRD informa el recorte y el recorte lo firmás vos.**

Dos formas de trabajar, y las dos son válidas:

| | Cómo | Cuándo conviene |
|---|---|---|
| **Una rebanada** | Un `bmad-prd` con un alcance angosto declarado en el Brain dump. Un PRD, un change | Cuando querés recorrer el camino completo y ver dónde se traba |
| **Todo el área** | Un `bmad-prd` con el alcance grande, y después vos lo cortás en varios changes | Cuando ya conocés la herramienta y querés el mapa entero antes de empezar |

**Para el primer día, la rebanada angosta.** Un PRD del sistema entero te consume el día en
BMAD y no llegás a la mitad de OpenSpec; una rebanada de punta a punta te enseña todo el
camino en una tarde. Y hay una razón medida además de la práctica: el alcance **no se ensancha
mientras trabajás**, porque ensancharlo convierte «esto no lo cubrimos» en «eso quedaba
afuera», y ahí se pierde justo el hallazgo.

Las rebanadas que siguen son otro `bmad-prd` con otro alcance, u otro corte del mismo PRD.

⚠️ **BMAD tiene una fase 1 (Analysis) y no la vas a usar.** Sirve para *elicitar*, o sea
para sacarle la información a alguien preguntándole, y ese trabajo ya está hecho. El
proveedor la marca «Optional» y dice textual:

> *«Neither skill requires the other — start with `bmad-prd` directly if you already know
> what you're building.»*

**`bmad-prd` es una skill de Claude Code, no un comando de terminal.** Se invoca por su
nombre. Lo que va a pasar, en orden:

| | Qué hace | Qué hacés vos |
|---|---|---|
| 1 | Arranca sola: resuelve su configuración, lee el nombre y el idioma y te saluda | Nada |
| 2 | Detecta la intención: **Create** si no hay PRD, **Update** si ya hay, **Validate** si solo querés crítica | Nada. Si queda ambigua, pregunta |
| 3 | **Brain dump.** Es su primer movimiento y el que importa | Le pasás **rutas de archivo** o el texto pegado. No hace falta ningún formato particular |
| 4 | Dispara búsquedas web por su cuenta; te llega solo un resumen | Nada |
| 5 | **Stakes calibration** y **Working mode** | Contestás. Apunta a 2 o 3 idas y vueltas, no diez |
| 6 | El trabajo del modo elegido, y escribe la salida | Leés |

**¿Se le pasa un directorio o los archivos uno por uno?** No está verificado que la skill
acepte un directorio como tal; lo que sí es seguro es que la sesión **es Claude Code**, así
que puede listar el directorio y leer los archivos por su cuenta. Por eso el prompt de abajo
nombra el directorio **y le pide explícitamente que los liste**: si la skill solo maneja
rutas, la sesión las enumera sola. Para la prueba de media hora, en cambio, pasale **un solo
archivo por su ruta**.

El prompt de arranque:

```
Usá bmad-prd para armar el PRD.

Los documentos de entrada son TODOS los archivos del directorio documentos/ —
listalos y leelos todos, son la fuente. No hay documento previo de BMAD: el
trabajo de negocio ya está hecho.

Lo que hay que especificar ahora es solo esto: recepción de mercadería, desde que
llega el camión hasta que se concilia con la orden de compra. Corta antes del pago
al proveedor.

No propongas tecnología ni arquitectura: la forma ya está decidida y no es parte de
esto. Lo que necesito es el comportamiento que el negocio necesita.
```

Deja `prd.md`, `addendum.md` y `.memlog.md` (este último es su bitácora de decisiones, no el
PRD). **Los tres se quedan afuera del repo.**

🛑 **Si BMAD no entiende tus documentos, no le toques el prompt de una skill.** En el momento
en que editás una skill dejás de usar una herramienta y empezás a mantener un fork ajeno. Si
no los digiere, **eso es el resultado** — se anota y se sigue a mano.

### 6 · Pulir el PRD, y contrastarlo contra la lista

**Antes de cada pedido grande, commiteá.** No hay deshacer: `.memlog.md` es bitácora de
decisiones, no historial de versiones, y la skill no menciona backup ni git.

```bash
git add -A && git commit -m "prd antes de pedir cambios"
```

**Se invoca la misma skill otra vez.** No hay una skill aparte para editar: `bmad-prd`
detecta que ya existe un `prd.md`, entra en modo **Update**, y hace un paso de **Reconcile**
— compara el PRD con lo que le decís y **muestra los conflictos antes de aplicar nada**. Si
lo que querés es que lo critique **sin tocarlo**, existe el modo **Validate**.

Y acá es donde la lista del paso 4 se cobra sola:

```
Compará prd.md contra lista-de-cobertura.md y decime, en una lista corta:
1. qué filas de la lista NO aparecen de ninguna forma en el PRD;
2. qué afirma el PRD que no tenga ninguna fila que lo respalde.
No corrijas nada todavía. Solo el reporte.
```

Lo primero es lo que el PRD perdió; lo segundo es lo que el PRD agregó por su cuenta. Las
dos cosas son decisiones tuyas, no de la herramienta: con el reporte en la mano volvés a
`bmad-prd` y le pedís los cambios.

---

## Cuando termines acá

Tenés un **PRD** pulido y contrastado contra la lista de cobertura. Eso no es
todavía un cambio que se pueda mergear: es la respuesta a *qué* y *por qué*.

Seguí por [09-construir-con-openspec.md](09-construir-con-openspec.md), que
convierte ese PRD en un change de OpenSpec —proposal, design, specs y tasks— y
de ahí en un pull request.
