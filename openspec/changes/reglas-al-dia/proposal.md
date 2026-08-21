---
artefacto: proposal
dri: Builder 1
aprueba: Builder 2 (builder par)  # y PO (PO) el delta: la capability de
                              # gobernanza del trabajo la gatea el PO por
                              # CODEOWNERS (.github/CODEOWNERS, últimas líneas)
informado: PO / Builder 2
estado: pendiente-de-revision
---

# reglas-al-dia — Proposal

## Why

El área implementa con agentes, y en ese modo **las reglas que el agente lee SON
el producto**: una regla que no entra al contexto de la sesión no existe, por
bien escrita que esté en otro repo. La superficie que las transporta —los
`AGENTS.md`, los `CLAUDE.md`, el allowlist del agente— es la única de las cuatro
formas de distribución sin actualización y sin check: el propio README dice de
*scaffold* que **«no se actualiza solo»** (`README.md:64`). El change anterior
(`marco-se-cumple-solo`) cerró el hueco de *regenerado* y no contempló este.

Tres hechos verificados hoy, cada uno con su número. Las referencias a
`plantilla/AGENTS.md` son al archivo **vigente al abrir este change** —355
líneas, el que la adopción de `intranet` copió—, que es justamente el que este
change parte en dos.

**1. El scaffold no entrega bien ni la primera vez.** La adopción de
`im-diego-ec/intranet` (rama `projects/adopcion-marco`, PR #1, todavía sin
mergear) copió `plantilla/AGENTS.md` y el resultado tiene **241 líneas contra
355: 114 líneas perdidas**. No es reflujo de formato, son reglas enteras: de las
7 viñetas ✅ quedaron 5, y de las 9 🛑 quedaron 8. Se cayeron cinco reglas
nombrables —el logging estructurado con `no-console` (✅), la 🛑 de escribir en
sistemas de terceros sin compuerta de aprobación, el origen preciso de las
alarmas, Well-Architected como marco de referencia, y **la única regla del
bloque ✅ que tiene un check vivo detrás**: la de ejecutores que descargan sin
versión exacta, que el marco ya verifica solo (check *Ejecutores de paquetes
pinados*)—. Las cuatro primeras dan **cero ocurrencias** en la copia, y la
quinta también: ni «npx» ni «Ejecutores» aparecen una vez. Y desapareció entera
la sección «Cuando el marco publica una versión» (29 líneas): justo el
procedimiento por el que ese repo se enteraría de que el marco cambió.

**2. Donde el texto llegó, llegó cambiado en la sustancia.** La 🛑 «Contactar
usuarios reales desde dev» del scaffold dice que la instancia dev del proveedor
de identidad es **separada** y que el modo real exige `APP_ENV=prod` como guard
estructural. La copia dice que **«dev usa la instancia real de Clerk pero con
datos de prueba»**, y la cadena `APP_ENV` no aparece **ni una vez** en el
archivo. La regla no llegó incompleta: llegó **invertida**. Nació del incidente
del 2026-07-28 —el scheduler de dev notificó a usuarios reales y cuatro
empleados «reservaron» en el ambiente de pruebas (`README.md:39`)—, así que un
agente que mañana trabaje en ese repo lee una constitución que autoriza
exactamente lo que ese incidente prohibió, y nada en el repositorio lo señala.

**3. En el consumidor viejo la divergencia ya corre en las dos direcciones.**
`proyecto-origen/AGENTS.md:127` dice «los Deploy se serializan (cola)» donde
`plantilla/AGENTS.md:196` dice «(cola, **nunca cancelación**)»: falta
exactamente la mitad que ES la lección del 2026-08-13, cuando dos deploys
concurrentes sobre dev salieron **los dos verdes** y dejaron la configuración
del ambiente corrupta. El nombre del check requerido `ci-ok` —que
`README.md:154-160` marca como *el error más caro de la migración*— no aparece
en ningún archivo que un agente cargue: **cero ocurrencias** en su `AGENTS.md`.
Y sus **264 líneas mencionan cero veces la palabra «Projects»**: la constitución de
un repo que consume el marco no nombra al marco.

A eso se suma que tres reglas fijadas hoy —escalar de modelo exige OK humano
previo, cambiar settings de un repo exige OK humano previo, y la infraestructura
base es primera opción y apartarse se pregunta ANTES— no llegaron a ningún
archivo, y la primera está **contradicha** por el texto vigente
(`plantilla/AGENTS.md:139-141` y `proyecto-origen/AGENTS.md:100-102` dicen
«escala por sesión cuando la tarea lo paga», sin compuerta). Un agente que lea
la constitución vigente escala solo, y lo hace bien según lo escrito.

La contramedida actual son dos rituales: la revisión trimestral, cuyo propio
texto admite que **«no es enforcement»** (`AGENTS.md:207-208`), y el aviso de
release, que le pide a alguien convertir un mensaje de chat en issue el mismo
día. Es exactamente lo que la premisa del marco declara que no cuenta
(`README.md:14-20`).

La pregunta no es *qué* reglas distribuir. Es **quién escribe el texto que el
agente carga**, y hoy la respuesta es «cada proyecto, una vez, a mano».

## What Changes

La porción del marco de la constitución deja de ser scaffold y pasa a ser un
**artefacto generado desde una fuente única**, con su check en el carril
referenciado:

- **Una fuente, N salidas.** El texto canónico vive dentro de una composite
  action del marco y se **renderiza** contra los valores del proyecto para
  producir un artefacto por cada **superficie de instrucciones que el
  repositorio declara** (hoy dos, porque los `AGENTS.md` del área dicen «Claude
  Code, Cursor»). El `AGENTS.md` del consumidor se queda con lo genuinamente
  propio y una línea de import.
- **El check llega solo, por `@v1`.** Artefacto ausente, atrasado, editado a
  mano, o presente pero **no cargado** por una superficie declarada: falla. El
  eslabón de carga roto es el caso que hoy no emite ninguna señal y es
  indistinguible de que la regla nunca haya existido.
- **La regla nueva entra con ventana de gracia fechada.** Cada versión del texto
  declara cuándo se publica y desde cuándo es exigible; entre las dos fechas el
  atraso avisa, desde la segunda falla. Deja de ser cortesía y pasa a ser
  propiedad del formato.
- **La puesta al día se propone sola.** El repositorio consumidor abre por sí
  mismo el pull request con el artefacto regenerado. El camino normal deja de
  ser «acordate de correr algo».
- **El desvío legítimo se declara y se lee.** Un proyecto puede apartarse de una
  regla nombrándola, con quién aprobó y su motivo escrito; el desvío se imprime
  **pegado a la regla que anula, dentro del artefacto que los agentes cargan**, y
  se vuelve rojo cuando la regla que anulaba deja de existir.
- **El allowlist del agente se verifica por propiedades, y asimétricas**: una
  entrada que autoriza una operación mutante sin desvío declarado es roja; un
  permiso que falta es aviso, nunca rojo, y el marco no lo escribe. Un permiso
  de más es riesgo; uno de menos es fricción.

Los detalles y las alternativas descartadas están en `design.md`; el rescate de
lo que hoy solo vive en los consumidores y la migración de los dos, en
`tasks.md`.

## Capabilities

### Modified Capabilities

- `gobierno-contribucion`: **un requirement nuevo** —las reglas del marco llegan
  íntegras a los agentes de cada proyecto: artefacto generado desde fuente
  única, entregado, verificado en el pipeline del consumidor, cargado por las
  superficies declaradas y con el desvío declarado como única salida legítima.
  Los tres requirements vigentes de la capability **no se tocan**.

## Impact

**Distribución.** Cambian tres de las cuatro formas: **canónico** (el requirement
nuevo, y el texto de la constitución que pasa a vivir acá como fuente única),
**referenciado** (el check y el texto viajan dentro del workflow reusable y su
composite action, así que llegan solos a todo consumidor de `@v1`) y **scaffold**
(el `AGENTS.md` de la plantilla se parte en «lo del marco» + «lo del proyecto», y
entra el workflow que abre el PR de actualización). *Regenerado* no se toca.

**Hay una acción obligatoria del consumidor, y no es opcional.** Cada
repositorio adoptante tiene que, en un PR propio:

1. crear su archivo de valores con los placeholders del marco (los handles y las
   cuentas reales viven del lado del consumidor, nunca acá);
2. generar el artefacto para cada superficie que declara;
3. **dejar la línea de import en su `AGENTS.md` y borrar de ese archivo el texto
   derivado del marco** — sin esto el artefacto existe y ningún agente lo carga,
   que es el modo de falla que este change existe para cerrar, y el duplicado le
   deja al agente dos versiones de la misma regla;
4. excluir el directorio del artefacto de su formateador;
5. declarar como desvío, con motivo escrito, cualquier diferencia legítima
   respecto del texto del marco.

Sin el paso 1 el render deja dobles llaves y pone rojo el check de marcadores
del propio consumidor. Sin el paso 3 el check de carga se pone rojo, y con
razón.

**¿Rompe a los adoptantes existentes?** No, si se hace en el orden que el change
fija: el rescate al canónico primero, los dos consumidores después, y el tag
`v1` recién cuando esos dos PRs estén mergeados y verificados. El paso se
estrena en **MINOR con la ventana de gracia activa** —amarillo para todos desde
el día uno— así que ningún repositorio que no modifique una línea queda roto
antes de su fecha de exigibilidad. Desde esa fecha sí se pone rojo, y eso es el
diseño: el rojo del día 28 es para el repo que ignoró cuatro pull requests.

**Efecto neto para un proyecto**: las correcciones del marco dejan de depender
de que alguien las copie. En el mismo PR de migración, `proyecto-origen`
recupera «cola, **nunca cancelación**», el nombre del check requerido `ci-ok`, el
porqué de los invariantes de propiedades y la regla de ejecutores pinados —cuya
ausencia hoy convive con un allowlist que autoriza `npx --yes openspec`—, e
`intranet` recupera las cinco reglas que la copia perdió y su regla invertida
sobre la instancia de identidad pasa a ser un **desvío declarado**, con id de
regla, aprobador y motivo, impreso al lado de la 🛑 que anula.

**Lo que este change NO promete.** El marco puede garantizar que el **texto**
llegue íntegro y al día a la superficie que el agente carga; no que el agente lo
**obedezca**. Cierra el hueco de distribución, no el de comportamiento, y
confundir las dos cosas produce confianza mal puesta. El resto de los límites
—incluido que el desvío puede volverse puerta de escape y que el artefacto no
ahorra un token de contexto— está declarado en `design.md`.
