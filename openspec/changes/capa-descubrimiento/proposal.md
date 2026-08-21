---
artefacto: proposal
dri: Builder 1
aprueba: PO (PO)          # es su modelo operativo de trabajo, y el delta cae
                             # en gobierno-contribucion, que CODEOWNERS le gatea
informado: Builder 2
estado: pendiente-de-revision
experimental: true           # ver "El estado experimental" al final
veredicto_antes_de: 2026-09-21
---

# capa-descubrimiento — Proposal

## Why

El flujo del área arranca en el **proposal**, y un proposal ya presupone
resueltos el qué y el por qué. Está escrito así en las dos constituciones
(`projects/AGENTS.md:44`, `plantilla/AGENTS.md`) y en las reglas que OpenSpec carga
en cada sesión (`openspec/config.yaml`, bloque `rules.proposal`): lo primero que
el marco pide es «mencionar el impacto visible para quien adopta el marco». No
hay una sola línea sobre de dónde salió la necesidad.

Entre **tres horas de transcripción de entrevistas** y un `proposal.md` con sus
deltas de specs en lenguaje de negocio no hay artefacto, no hay método y no hay
gate. Hay una persona y un salto.

**Lo más parecido que existe declara, en su propio texto, que no es un método.**
La skill `openspec-explore` —el modo explorar del CLI— dice de sí misma que es
una postura y no un flujo: «no fixed steps, no required sequence, no mandatory
outputs». Es correcta como compañera de pensamiento y es exactamente lo que el
marco no puede aceptar como carril: sin salida obligatoria no hay artefacto, sin
artefacto no hay procedencia, y sin procedencia nadie puede responder de dónde
salió un escenario aprobado.

**El disparador es concreto y ya está sobre la mesa.** PO (PO) hizo las
entrevistas y levantó los procesos del proyecto **Supply Chain**, el siguiente
adoptante del marco —«grande en complejidad y área crítica» (registro del
2026-08-14)—. El material existe. El camino para convertirlo en specs es el que
no existe, y es él quien dice que OpenSpec le queda corto en ese tramo. No es una
queja sobre la herramienta: es el tramo que la herramienta declara que no cubre.

**Por qué importa ahora y no después.** Supply Chain va a ser el primer proyecto
que nace del scaffold. Si la conversión de material crudo a spec se improvisa, la
improvisación es lo que el proyecto hereda el día uno — y la promesa del marco es
justamente que un proyecto no vuelva a descubrir por su cuenta lo que ya se pagó
una vez.

**Y el modo de falla tiene nombre en el propio marco.** La 🛑 «inventar
endpoints, tablas o features que no estén en el spec» protege el tramo de
implementación. Aguas arriba no protege nada: sin capa de descubrimiento la
invención ocurre **antes**, en la cabeza de quien escribe el proposal, y cuando
llega a ser un `#### Scenario:` aprobado por el PO es indistinguible de un
requerimiento real. Ningún check del marco caza un escenario fiel a algo que
nadie pidió. La trazabilidad que la plantilla de PR ya exige es **hacia abajo**
(PR → change); hacia arriba (change → material) no hay nada.

## What Changes

Se incorpora una **capa de descubrimiento aguas arriba de OpenSpec**. No es un
reemplazo, y esa conclusión no es nueva: la evaluación del área del 2026-08-14 ya
la fijó — BMAD es elicitación facilitada *honor-based*, OpenSpec/Projects es
contrato *enforced* por máquina; **no compiten en el mismo eje**. Este change
convierte esa conclusión en un mecanismo con gate.

- **La capa se corta en el PRD, y el corte es una decisión, no una omisión.** Se
  adoptan las fases 1 (Analysis) y 2 (Planning): informe de descubrimiento,
  brief y PRD. **No** se adoptan Solutioning ni Implementation: ahí el marco ya
  tiene `design.md`, `tasks.md`, ADRs, sub-issues por bloque, PR por bloque y
  review cruzado humano — gates que ya fallan solos. Dos casas para la misma
  decisión es la enfermedad que otro change de esta misma tanda está curando.
- **El insumo no es contrato, y eso deja de depender de que se entienda.** La
  autoridad sobre el comportamiento sigue siendo `openspec/specs/`. Un artefacto
  de descubrimiento con **forma** de spec —encabezados de delta, escenarios— se
  lee como contrato aunque nadie lo haya aprobado como tal: el pipeline lo
  rechaza.
- **Trazabilidad hacia arriba, y por identificador.** Cada requirement de un
  change nacido de descubrimiento apunta al ítem de material que lo origina. El
  material crudo —transcripciones con nombres de empleados reales— **no entra al
  repositorio**: la trazabilidad se apoya en identificadores estables, no en el
  contenido.
- **El supuesto abierto bloquea donde duele.** Lo que el descubrimiento no pudo
  resolver queda marcado como abierto, y un supuesto abierto **impide el
  archive**: se puede proponer y diseñar con dudas; no se puede convertirlas en
  contrato por omisión.
- **El estado experimental caduca por fecha.** Un change que declara ser
  experimental declara también su fecha de veredicto, y el pipeline se pone rojo
  cuando esa fecha pasa sin veredicto. Sin esto, «change activo y sin archivar»
  es una frase, y las frases no cuentan como enforcement en este repo.

Lo que este change **no** hace hoy: no mueve `v1`, no agrega un check al
pipeline de nadie, no toca `plantilla/` y no instala nada en ningún repositorio.
Toda la maquinaria está condicionada al veredicto del piloto.

## Capabilities

### Modified Capabilities

- `gobierno-contribucion`: **dos requirements nuevos** — (1) el descubrimiento
  llega al contrato con procedencia y no lo reemplaza; (2) el estado experimental
  de un change caduca por fecha. Los tres requirements vigentes de la capability
  **no se tocan** (el delta es solo `ADDED`, así que el hueco conocido del
  guardrail de deltas —un `MODIFIED` cuyo título no existe en el spec vivo no
  avisa— no aplica acá).

`reglas-al-dia` también agrega un requirement a esta capability. Los títulos no
colisionan, y el `## Purpose` —que los deltas no transportan— lo amplía el
archive de cada change: el que archive segundo relee lo que dejó el primero.

## Impact

**Distribución.** Hoy este change toca **solo lo canónico** (el delta) y
`docs/`. Si las **dos** rebanadas del piloto dan verde, la tanda de implementación
toca además:
*referenciado* (los cuatro checks viajan en el workflow reusable y llegan a todo
consumidor de `@v1`, **inertes** hasta que un repositorio declara material de
descubrimiento o un change se declara experimental), *scaffold* (el directorio
declarado, su entrada en CODEOWNERS del rol de producto y la exclusión del
formateador) y *regenerado* (el pin de la herramienta de descubrimiento: se pina
la versión y cada repo la instala; no se vendora, igual que el CLI de OpenSpec).

**Impacto en los proyectos consumidores.** Hoy: **ninguno**. Un repo que hace
`uses: ...@v1` y no modifica una línea no ve nada de este change, porque no hay
nada publicado. Tras los dos veredictos verdes: sigue siendo ninguno mientras no
declare material de descubrimiento ni changes experimentales — los checks son
opt-in por declaración, no por presencia. Eso lo vuelve **MINOR y no breaking**:
ningún repositorio que hoy pasa, mañana falla.

**Hay tres decisiones humanas que este change no puede tomar** y que están
pendientes de OK explícito, listadas en `tasks.md` bloque 1 junto con la
verificación de qué exige de verdad la cadena de herramientas:

1. **Dependencia de terceros** (⚠️ de `AGENTS.md`): la herramienta de
   descubrimiento entra —solo si las **dos** rebanadas del piloto dan verde, y con
   un OK aparte— al carril de todos los consumidores. Se pina por versión exacta y
   se declara su alcance de módulos.
2. **Material con datos de personas**: dónde vive el corpus y si puede pasar por un
   modelo. El repositorio no es su custodio y este change no lo decide por defecto.
   **Contestada por Builder 1 el 2026-08-21** —el descubrimiento vive fuera del
   repositorio y entra como insumo al inicio de la sesión—, con un residuo que
   sigue abierto y es bloqueante: si lo que entra está **despersonalizado**.
3. **Correr el piloto**: consume tiempo del PO y de dos builders, y su
   pre-registro se commitea antes de la primera sesión.

**Lo que este change NO promete.** La capa puede garantizar que un escenario
tenga **procedencia**; no que la procedencia sea **buena**. Una transcripción
puede contener una mala idea, y la trazabilidad la va a rastrear con toda
fidelidad hasta su origen. Y la herramienta de descubrimiento es conversacional:
nada dentro de ella falla solo. Lo único que se puede gatear es su **salida**, y
eso es exactamente lo que este change gatea. El resto de los límites está en
`design.md`.

## El estado experimental

Este change **no se archiva hoy, y eso es el diseño**. Un change de OpenSpec
activo y sin archivar es el estado experimental nativo del marco: la propuesta
existe, está revisada, es citable y **no es contrato**. Se archiva —o sea, sus
deltas se funden en los specs vivos— **solo si las dos rebanadas del piloto dan
verde**: la primera con el orden A → B y la segunda con el orden invertido.

- **El piloto arranca el lunes 2026-08-24** con el corpus de descubrimiento que el
  PO ya produjo para Supply Chain: documentos, procesos, casos borde y un prototipo
  con feedback de usuario. No depende de que el proyecto exista: corre fuera de todo
  repositorio y su huella es cero hasta el veredicto.
- **El gate está pre-registrado en `piloto/pre-registro.md`** (sección 4), que es el
  documento vigente: siete criterios eliminatorios con sus umbrales escritos
  **antes** de correr, y commiteados antes de la primera sesión — el sello de tiempo
  de git es la evidencia de que no se acomodó después. La tabla de `design.md` (D6)
  quedó como historia del diseño viejo, de cuando el insumo eran transcripciones y
  el descubrimiento todavía no estaba hecho; donde las dos difieran, manda el
  pre-registro.
- **La fecha de veredicto es el 2026-09-21** (28 días desde el arranque, la misma
  ventana que el marco ya usa para estrenar en modo aviso). El campo
  `veredicto_antes_de` del frontmatter no es decorativo: el requirement 2 de este
  delta lo vuelve rojo cuando vence.
- **Los veredictos, con su desenlace escrito de antemano** en D8 y en la sección 2
  del pre-registro: verde → **segunda rebanada con el orden invertido**; verde y
  después verde → archive; amarillo → herramienta del PO documentada en `docs/`,
  sin requirement y sin huella en el scaffold; rojo → ADR de rechazo con las
  mediciones. En los dos últimos casos el requirement de caducidad se rescata a
  un change propio: es el único ítem de acá que vale con independencia del
  piloto.
- **Un verde de la primera rebanada significa «no se refutó que ayude», no
  «ayuda».** Lo decidió Builder 1 el 2026-08-21 y es la lectura correcta del
  instrumento: la misma persona corre los dos brazos, así que llega al brazo B con
  el corpus ya digerido, y el propio pre-registro dice que leerlo es la parte más
  cara. Un verde mide entonces la herramienta **más la memoria de haber hecho ya
  la tarea**, y eso no se puede separar con n=1. Por eso el orden se mantiene
  A → B —el control limpio se escribe una sola vez— y el verde habilita una
  segunda rebanada **invertida**: dos corridas con el sesgo en direcciones opuestas
  acotan el efecto real, una lo infla y la otra lo deprime. El archive, el estreno
  de los checks y el pin en el carril de los consumidores esperan esa segunda
  corrida.
