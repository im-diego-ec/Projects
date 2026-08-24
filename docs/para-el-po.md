# Para el PO

Esta página es para quien ocupa el rol de **PO** (*Product Owner*): la persona
dueña de **qué** se construye y **por qué**. No supone que escribas código y no
te va a pedir que lo hagas.

Existe porque faltaba: el PO es el rol con más poder de veto del marco —tres
rutas que solo él aprueba en el repositorio de un proyecto, dos en **este**, el
del marco— y era el único sin puerta de entrada. Esa diferencia entre los dos
repositorios es de las que se confunden solas, así que la sección 2 los separa
uno por uno. Cuando una palabra suene rara, está definida en una línea en el
[glosario](glosario.md).

---

## 1. Qué es esto y por qué existe

Cada regla de trabajo que dependía de que alguien se acordara —revisar antes de
integrar, no mandar notificaciones de prueba a usuarios reales, no congelar una
contraseña que rota sola— terminó fallando al menos una vez, con costo real y
fecha conocida. **Projects es ese conjunto de reglas convertidas en
verificaciones que corren solas**: cada vez que alguien propone un cambio, el
sistema comprueba que cumpla lo que el equipo ya prometió, y si no lo cumple no
lo deja entrar. Ninguna se inventó de escritorio; cada una nació de un incidente
con fecha, y la lista está al principio del [`README.md`](../README.md).

Lo que el marco **no** decide es qué construir. Eso es tuyo, y la separación es
literal: está escrita en un archivo del repositorio y GitHub la aplica sola.

---

## 2. Qué apruebo yo, y qué no

El archivo que reparte la propiedad se llama `CODEOWNERS`. En el repositorio de
un proyecto ([`plantilla/.github/CODEOWNERS`](../plantilla/.github/CODEOWNERS)),
lo tuyo son exactamente estas tres rutas:

| Ruta | Qué hay ahí, en castellano |
|---|---|
| `/openspec/changes/**/proposal.md` | El **porqué** de cada cambio propuesto: qué problema resuelve y qué cambia para el usuario |
| `/openspec/changes/**/specs/` | El **contrato que ese cambio quiere modificar**: qué promesa se agrega, cuál cambia y cuál se retira |
| `/openspec/specs/` | El **contrato vigente**: lo que el sistema garantiza hoy |

Todo el resto del repositorio pertenece al equipo de builders. Y hay un detalle
mecánico que conviene saber: la última línea del archivo que coincide con una
ruta **reemplaza** a las anteriores, no se suma. Por eso en esas tres rutas el
revisor que GitHub asigna sos vos, solo vos, y ningún builder puede satisfacer
tu aprobación desde el otro rol. Por la misma razón el PO **no** debe ser
miembro del equipo de builders: si lo fuera, podría aprobarse a sí mismo y la
separación se caería sin que nada se ponga en rojo.

En **este** repositorio —el del marco, no el de un producto— tu reparto es más
chico a propósito: `/openspec/specs/gobierno-contribucion/` y
`/openspec/changes/**/specs/gobierno-contribucion/`. El motivo está completo en
[`.github/CODEOWNERS`](../.github/CODEOWNERS): acá no hay producto, todo cambio
es maquinaria de ingeniería, y hacerte revisor obligatorio de cada guardrail
sería pedirte criterio sobre decisiones que no son tuyas. Lo que sí gatea tu
aprobación es la gobernanza del **trabajo**: los roles, quién aprueba qué, cómo
se revisa.

**Lo que no aprobás**: el diseño técnico (`design.md`), el plan de trabajo
(`tasks.md`), el código, los pipelines y la infraestructura. Seguís informado de
todo change —la convención es que el encabezado de cada documento lleve un campo
`informado:` con tu rol— y podés revisar lo que quieras. Acotar el gate te quita
la obligación, no el acceso.

Con una salvedad honesta sobre ese `informado:`: es convención, no compuerta.
Nada lo verifica todavía, y hoy hay documentos de changes en vuelo que no lo
llevan. Si te falta el aviso de un change, pedilo: no des por hecho que el
campo estuvo.

> **El estado real, hoy.** La regla de GitHub que convierte tu aprobación en
> condición obligatoria para integrar («review de code owner requerido») está
> **diferida a propósito** tanto acá como en el andamio de un proyecto nuevo:
> con un solo builder operativo, encenderla bloquearía todo. Está declarada como
> diferida, con motivo, en [`.github/proteccion-main.md`](../.github/proteccion-main.md).
> Mientras tanto GitHub te asigna como revisor pero no frena el merge. El día
> que se enciende, tu aprobación pasa a ser la puerta, sin excepciones para
> nadie. Lo que sigue vale igual: la práctica no espera al interruptor.

---

## 3. Cómo se lee un spec

Un **spec** describe lo que el sistema garantiza. Está hecho de dos piezas que
se alternan: **requirements** (obligaciones) y **scenarios** (el caso concreto
que hace comprobable cada obligación).

Este es un fragmento real, tal cual está en
[`openspec/specs/gobierno-contribucion/spec.md`](../openspec/specs/gobierno-contribucion/spec.md):

```markdown
### Requirement: Plantilla de pull request

El repositorio SHALL incluir una plantilla de pull request que solicite el link
al spec o change de OpenSpec asociado y la evidencia de que los tests pasan.

#### Scenario: Abrir un pull request
- **WHEN** un contribuidor abre un pull request en el repositorio
- **THEN** el cuerpo del PR se precarga con la plantilla que pide link al spec/change y evidencia de tests
```

Línea por línea:

- **`### Requirement: Plantilla de pull request`** — el título de la obligación,
  y también su identificador. Si alguien lo retoca sin declarar el cambio de
  nombre, el sistema entiende que llegó un requisito nuevo y el viejo
  desaparece. Los títulos no se cambian por gusto.
- **`SHALL`** — la palabra que marca obligación. Si dice `SHALL` y no se cumple,
  el contrato está roto. Cuando leas «convendría» o «idealmente», eso **no es
  contrato**: pedí que se convierta en `SHALL` o que se saque del spec.
- **El párrafo** — qué tiene que ser verdad, en prosa; la parte que podés
  discutir enteramente en tus palabras. (*Pull request*: la propuesta de cambio
  en GitHub, el lugar donde se revisa antes de que entre.)
- **`#### Scenario:`** — el caso concreto. Una obligación sin escenario no se
  puede comprobar, y una promesa que nadie puede comprobar es una intención.
- La línea **WHEN** — la situación que dispara.
- La línea **THEN** — lo que tiene que pasar entonces, y tiene que ser algo
  **observable desde afuera**. «El equipo entiende que…» no sirve como THEN;
  «el cuerpo del PR se precarga con…» sí, porque alguien puede mirarlo y decir
  sí o no.

Traducido a una sola frase: *cuando alguien abre una propuesta de cambio, el
formulario ya viene con las dos preguntas que tiene que contestar —a qué spec
corresponde y qué prueba que funciona.*

**Si podés escribir esa frase con tus palabras, entendiste el spec. Si no podés,
ese es motivo suficiente para devolverlo** — y no porque no seas técnico: un
spec que no se puede decir en castellano llano no está listo.

### Lo que te llega en un change no es el spec entero

Es un **delta**: solo lo que cambia, bajo tres encabezados posibles.

| Encabezado | Qué significa | Qué mirar |
|---|---|---|
| `## ADDED Requirements` | Una promesa **nueva** | ¿Trae su escenario? ¿El THEN se puede observar? |
| `## MODIFIED Requirements` | Una promesa vigente que se **reemplaza entera** | Que repita **todos** los escenarios que siguen valiendo: lo que no reproduce, se pierde al fusionarse. Hay un check que caza este caso, y existe porque ya borró escenarios una vez |
| `## REMOVED Requirements` | Una promesa que se **retira** | Es la más cara de todas. Preguntá qué deja de estar garantizado y para quién |

---

## 4. Qué significa que un change esté «bloqueado»

Se dice igual para tres cosas distintas, y conviene separarlas:

1. **Bloqueado esperándote.** Todo lo automático salió verde y falta tu
   aprobación. Nadie puede destrabarlo por vos: eso no es un problema del
   sistema, es exactamente para lo que fue diseñado.
2. **Bloqueado por una compuerta.** Una verificación automática se puso en rojo.
   No te toca arreglarla, pero sí saber qué significa: hay algo que el equipo
   prometió por escrito y este cambio no lo cumple. Un change no se aprueba
   «para destrabar»; se destraba arreglando lo que la compuerta señala.
3. **Bloqueado a propósito, o diferido.** El equipo declara por escrito que algo
   no se activa todavía, con el motivo y con qué lo destrabaría. Eso es
   legítimo y es una regla del marco: lo que se decide no activar **se declara**,
   nunca se omite ni se presenta como activo.

Lo que no existe acá es destrabar por urgencia sin dejar rastro. Si te lo piden
así, la respuesta correcta no es decir que no: es pedir que la excepción quede
escrita, con su motivo y su fecha.

---

## 5. Las cuatro preguntas que sirven para rechazar un change

Ninguna de estas requiere saber programar. Todas rechazan cosas reales.

1. **¿Puedo decir con mis palabras qué cambia para el usuario?** Si el
   `proposal.md` no me deja hacerlo, el problema es del documento, no de mi
   lectura.
2. **¿Cada promesa tiene su escenario, y ese escenario se puede observar desde
   afuera?** Un requisito sin `#### Scenario:`, o con un THEN que nadie puede
   mirar, entra al contrato sin poder verificarse nunca.
3. **¿Qué promesa perdemos con esto?** Va dirigida a los `MODIFIED` y a los
   `REMOVED`. Es una pregunta que exige respuesta concreta; «ninguna» sin
   detalle no es respuesta.
4. **¿Por qué ahora, y qué pasa si no lo hacemos?** Un proposal que no contesta
   el costo de no hacerlo describe una preferencia, no una propuesta.

Y la regla de salida, que vale más que las cuatro: **devolver un change cuesta
barato; aprobarlo sin entenderlo, caro.** Un contrato aprobado se convierte en
la referencia de lo que el sistema garantiza, y a partir de ese momento las
discusiones —las tuyas incluidas— se ganan citándolo.

---

## Si querés seguir

- [glosario.md](glosario.md) — el vocabulario del marco, una línea por palabra,
  con el archivo que manda sobre cada una.
- [`README.md`](../README.md) — qué es Projects para el equipo entero; empieza
  con la tabla de incidentes que explica por qué existe cada regla.
- [README.md de esta carpeta](README.md) — el mapa del resto de la
  documentación, que es de ingeniería y no necesitás leer.
