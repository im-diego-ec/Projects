---
artefacto: design
dri: Builder 1
aprueba: revision adversarial (desvio del marco: un solo mantenedor, ver AGENTS.md)
estado: en-ejecucion
---

# Design — el-marco-declara-su-desvio-de-review

## Clasificación de distribución de cada pieza que se toca

**Nada de este change viaja a un proyecto.** Es el gobierno del repositorio del
marco. Las piezas del andamio que se parecen a éstas —`plantilla/AGENTS.md`,
`plantilla/.github/CODEOWNERS`— **no se tocan**: el desvío de un proyecto de una
sola persona ya existe y lo escribe el asistente en su `.projects-desvios.json`.

| Pieza | Forma | Por qué esa y no otra |
|---|---|---|
| `AGENTS.md` (raíz) | no viaja — constitución del repo del marco | Es lo que la sesión de un agente en este repo carga sin buscarlo. `plantilla/AGENTS.md` es otra cosa (scaffold) y no cambia |
| `.github/CODEOWNERS` (raíz) | no viaja | Dice que la condición de retiro se lee de él; el del andamio no cambia |
| `openspec/config.yaml` (raíz) | no viaja | Es lo que lee quien escribe un artefacto de un change de este repo |
| `pruebas/ci-del-marco/desvio-de-review-del-marco.test.mjs` | banco del marco, no viaja | Lo recoge el glob `pruebas/**/*.test.mjs` del job `pruebas-actions`, que cobra el veredicto agregado |
| Frontmatter de 58 artefactos de 22 changes activos | no viaja | Documentos internos del marco |
| Delta de `gobierno-contribucion` | **canónico** | Al archivarse entra a `openspec/specs/`, que vive solo en este repo |
| `openspec/specs/{calidad-codigo,base-tecnologica,documentacion-del-marco}` | **canónico** | Lo que promueven los seis archives. `base-tecnologica` y `documentacion-del-marco` nacen hoy |
| `openspec/cobertura-de-requirements.md` | medición del marco, no viaja | Su banco exige que cuente lo que el árbol tiene |
| `docs/01-introduccion.md` | documentación del marco, no viaja | Corrección que encontró la revisión de `orden-de-lectura` |
| `pruebas/andamio/piso-del-reusable.test.mjs` | banco del marco | Solo cambia el nombre de un caso, que contradecía su aserción |

## Decisiones, con lo que se descartó

### Dónde vive el desvío: en `AGENTS.md`, y solo ahí

Rigel lo escribió dos veces —`AGENTS.md` y `.rigel-desvios.json`—. Acá se midió
antes de copiarlo, y el plan pedía medir una cosa concreta: si un
`.projects-desvios.json` en la raíz altera la sonda `es_distribuidor` de
`marco-ci.yml`.

- **No la altera, medido corriéndola.** La sonda (paso «Este repo es el que
  distribuye el marco») mira tres archivos rastreados
  —`plantilla/.github/workflows/ci.yml`, `actions/constitucion/action.yml` y
  `.projects-valores.json`— y ese no es ninguno. Su bloque `run`, extraído y
  ejecutado sobre un clon descartable, da `es_distribuidor=true` sin el archivo y
  con el archivo rastreado. Tampoco lo leería mal el paso «Permisos del agente sin escritura»: solo
  consume entradas con `permiso`, y una con `regla` la saltea. Y el job
  `constitucion` de `ci.yml` corre en `modo: cableado`, que no lee desvíos.
- **Pero la ruta está tomada, y eso decide.** `.gitignore` ignora
  `.projects-desvios.json` en la raíz **a propósito**: los tres lanzadores corren
  el asistente parados en el clon, y el asistente escribe ahí el
  `.projects-desvios.json` **del proyecto que se está armando**. Un archivo del
  marco en esa ruta haría falta forzarlo contra el `.gitignore`, y el primer doble
  clic lo pisaría con los desvíos de otro repositorio.
- **Y no le llegaría a nadie.** El marco no renderiza su propia porción de la
  constitución —el hallazgo de Rigel, que acá vale igual—, así que el agente de
  una sesión en este repo nunca leería ese JSON. `AGENTS.md` es lo único que
  carga sin buscarlo.

**Descartado:** el JSON como segunda copia. No aporta un lector y rompe el
lanzador.

### El aprobador que no existe se reemplaza, no se simula

**Descartado:** poner el mismo handle como Builder 2. Sería un autor que se
aprueba a sí mismo, y `openspec/config.yaml` ya lo prohíbe con el motivo escrito.
**Descartado:** crear equipos —en una cuenta personal no existen, medido en el
encabezado de `.github/CODEOWNERS`—. **Descartado:** activar
`require_code_owner_review` —con un solo dueño bloquearía todo merge—.

Lo que queda es decir la verdad en el campo: `aprueba: revision adversarial
(desvio del marco: un solo mantenedor, ver AGENTS.md)`. El texto nombra el
mecanismo y dónde está declarado, y es un valor fijo, así que un banco lo puede
distinguir del valor viejo sin interpretar prosa.

### El PO queda afuera del desvío, y eso también se mide

El desvío reemplaza la revisión **entre builders**. La aprobación del PO sobre
`gobierno-contribucion` no es una revisión cruzada: es el gate del dueño del qué,
y el PO existe (es la misma persona, pero el rol está ocupado). **Descartado:**
archivar los seis changes de `gobierno-contribucion` con la revisión adversarial
sola. Quedan revisados, con su hallazgo escrito, y esperando el OK del PO.

Al medir esto apareció un caso real: `reglas-al-dia` nombraba al PO **solo en un
comentario** al costado del `aprueba:`, que ningún lector de frontmatter ve. Se
corrigió al valor, y la regla 5 del banco lo exige.

### Un check y no un párrafo

Rigel dejó el desvío escrito y nada lo sostiene. **Descartado** copiarlo así: por
la regla de oro del marco, eso es documentación. El banco tiene seis reglas y
cada una muerde sobre texto mutado en memoria:

1. Un solo dueño en `CODEOWNERS` → el recuadro existe y trae sus siete piezas.
2. Dos dueños → el recuadro se retiró.
3. Mientras rija, todo `aprueba:`/`revisa:` de un change activo toma un valor de
   una **lista cerrada**; retirado, ninguno sigue nombrando el desvío.
4. Todo change archivado desde la fecha del desvío trae `revision-adversarial.md`
   con al menos dos lentes con nombre y contenido, dos de ellas con evidencia
   verificable, y un veredicto escrito; una carpeta del archive sin fecha es rojo.
5. Todo change activo con delta de `gobierno-contribucion` nombra al PO en el
   valor del `aprueba:` de su proposal, y el valor **empieza** con el rol.
6. Todo change con delta de `gobierno-contribucion` archivado bajo el desvío
   trae `aprobado_por_po: AAAA-MM-DD` en su proposal, no posterior al archive.

**Por qué una lista cerrada y no una lista de nombres prohibidos** (corregido el
2026-09-18, revisión adversarial del carril). La primera versión de la regla 3
buscaba al builder par con una regex. Le pasaban por al lado `builder-2`, «el
otro builder» —la forma en que lo dice el propio `AGENTS.md`—, un valor YAML en
bloque, la clave con mayúscula y una línea en blanco antes del `---`: cinco
formas de escribir lo mismo, todas verdes. Enumerar lo prohibido sobre texto
libre no cierra; enumerar lo que vale sí. **Descartado:** exigir frontmatter en
todo `.md` de un change activo —los deltas de spec no lo llevan, y cuatro
artefactos de otros changes (`menu-que-no-miente/proposal.md`,
`promocion-por-ambientes/proposal.md`, `rojo-primero/tasks.md` y `design.md`) no
lo traen—; queda como tarea abierta.

**Por qué la regla 6 existe.** La 5 mira lo que un change **activo** declara que
va a pasar. La revisión del carril archivó en un clon `el-consumidor-se-anota`
—todavía en `pendiente-de-revision`— y el banco y el guardrail de deltas salieron
verdes: nada miraba la aprobación en el momento en que importa. El campo va en el
proposal porque el archive lo mueve entero y no lo reescribe. Es una
declaración, igual que todo lo que se escribe en un repo de un solo mantenedor;
lo que la regla cambia es que omitirla deja de ser posible por descuido.

**Descartado:** medir el permiso de escritura contra la API de GitHub. El banco
del marco corre sin red, y colgarlo de un tercero lo pone rojo por motivos ajenos.
Se lee el proxy que está en el árbol —los dueños de `CODEOWNERS`, que es lo que
alguien edita el día que entra un segundo builder porque es lo que hace que GitHub
le pida la revisión— y el recuadro deja escrito el comando que mide el permiso
real.

## Lo que queda como deuda, dicho

- **La independencia de las lentes es de método, no de agente.** La revisión de
  los doce changes la corrió un solo agente, en una sesión, con lentes separadas
  y evidencia propia por lente. No hubo un segundo agente disponible. Si el PO
  quiere agentes separados, se re-corre; el formato de `revision-adversarial.md`
  no cambia.
- **El proxy de `CODEOWNERS` puede quedar atrás del permiso real** (un segundo
  colaborador con escritura que nadie agrega a `CODEOWNERS`). En ese caso el
  desvío sigue declarado con un revisor que ya existiría. El recuadro dice cómo
  medirlo; no hay compuerta que lo haga sola.
