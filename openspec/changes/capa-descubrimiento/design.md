---
artefacto: design
dri: Builder 1
aprueba: Builder 2 (builder par)  # el delta lo gatea además PO (PO) por CODEOWNERS
informado: PO
estado: pendiente-de-revision
experimental: true
veredicto_antes_de: 2026-09-21
---

# capa-descubrimiento — Design

## Context

### El hueco, y dónde está exactamente

El flujo del marco tiene seis pasos y el primero es **proposal**
(`projects/AGENTS.md:44`, `plantilla/AGENTS.md`). Un proposal presupone resueltos el
qué y el por qué: las reglas que OpenSpec carga en cada sesión le piden
«mencionar el impacto visible para quien adopta el marco» y «declarar a qué
categoría de distribución pertenece lo que cambia» (`openspec/config.yaml`,
`rules.proposal`). Ninguna línea habla del origen de la necesidad.

Los ocho specs vivos del marco tampoco. Verificado: las únicas menciones a
OpenSpec en `openspec/specs/**` son la trazabilidad **hacia abajo** que exige la
plantilla de PR (`gobierno-contribucion:17`) y la validación en CI
(`pipeline-entrega:25`). No hay capability que describa cómo una necesidad se
vuelve spec. El tramo no está mal especificado: **no está**.

**Lo más parecido que existe se declara a sí mismo no-método.** La skill
`openspec-explore` del CLI —el modo explorar— dice literalmente de sí misma que
es una postura y no un flujo: «no fixed steps, no required sequence, no mandatory
outputs». Como compañera de pensamiento está bien diseñada. Como carril del marco
es inservible por construcción: sin salida obligatoria no hay artefacto, sin
artefacto no hay procedencia, y sin procedencia nadie puede responder de dónde
salió un `#### Scenario:` que el PO ya aprobó.

### El modo de falla que el hueco deja abierto

La 🛑 «inventar endpoints, tablas o features que no estén en el spec» protege el
tramo de implementación: el spec es la vara y el código se compara contra él.
Aguas arriba no hay vara. La invención ocurre **antes** —en la cabeza de quien
escribe el proposal— y cuando llega a ser un escenario aprobado es
indistinguible de un requerimiento real. **Ningún check del marco caza un
escenario fiel a algo que nadie pidió**, y no puede haberlo: el check compara el
spec contra el código, no el spec contra la realidad del negocio.

Ese es el hueco que una capa de descubrimiento cierra, y el único que puede
cerrar: convertir la invención silenciosa en una **pregunta escrita**.

### El disparador, con nombre y material

PO (PO) hizo las entrevistas y levantó los procesos de **Supply Chain**, el
siguiente adoptante del marco, registrado el 2026-08-14 como «grande en
complejidad y área crítica». El material existe hoy. Es él quien dice que
OpenSpec le queda corto en ese tramo, y tiene razón por construcción: OpenSpec
empieza donde él termina de no saber.

Supply Chain va a ser el primer proyecto que **nace** del scaffold. Si la
conversión de material crudo a spec se improvisa, la improvisación es lo que el
proyecto hereda el día uno — lo contrario de la razón por la que Projects existe.

### Qué es BMAD-METHOD, verificado

Investigado el 2026-08-19 contra el repositorio y el registro de paquetes, no
contra recuerdos:

- `bmad-method@6.11.0`, licencia **MIT** con reserva de marcas (BMad™, BMad
  Method™, BMad Core™ son marcas de BMad Code, LLC). `engines` declara
  **Node >= 20.12.0**; el README pide además **Python 3.10+ y uv**, y no pude
  confirmar qué módulo lo necesita — se declara la incertidumbre.
- Instala `_bmad/` (núcleo y módulos: `core`, `bmm`, `bmb`, `cis`) y escribe sus
  salidas en `_bmad-output/`. v6 abandonó los directorios con punto **a
  propósito**: los indexadores y los sistemas de contexto los filtran, y un
  método que el modelo no puede leer no sirve.
- Cuatro fases: **Analysis** (brainstorming, investigación, `product-brief.md`,
  `prfaq.md`), **Planning** (`prd.md`, especificación de experiencia si hay
  interfaz), **Solutioning** (`architecture.md`, `epics.md`, `sprint-status.yaml`)
  e **Implementation** (historias, construcción, revisión, retrospectivas).
- Es **escala-adaptativo**: tres carriles —flujo rápido (`tech-spec-{slug}.md`
  para 1-15 historias), método completo, y empresa— con enrutamiento por
  complejidad.
- Todo el mecanismo son **personas y workflows conversacionales**. Nada dentro de
  BMAD falla solo.

Esa última línea es la que ordena todo este diseño, y coincide con la evaluación
del área del 2026-08-14: **BMAD es elicitación facilitada honor-based; OpenSpec y
Projects son contrato enforced por máquina. No compiten en el mismo eje.** Este
change no revisa esa conclusión: la convierte en mecanismo y le pone gate.

### Dónde se solapa y dónde no

| Fase de BMAD | Artefactos | Qué tiene el marco en ese tramo | Veredicto |
|---|---|---|---|
| **1. Analysis** | brainstorming, investigación, `product-brief.md`, `prfaq.md` | nada; el modo explorar es una postura sin salidas obligatorias | **hueco puro → se adopta** |
| **2. Planning** | `prd.md`, especificación de experiencia | solapa con proposal + specs, pero por el otro lado: el PRD **ordena el problema**, el spec **fija el contrato** | **se adopta como INSUMO, jamás como contrato** |
| **3. Solutioning** | `architecture.md`, `epics.md`, compuerta y `sprint-status.yaml` | `design.md`, `tasks.md`, ADRs de marco y de proyecto | **no se adopta** |
| **4. Implementation** | historias con contexto embebido, construcción, revisión por agente, retrospectivas | `tasks.md` por bloques, sub-issues, PR por bloque, review cruzado humano, CI con veredicto agregado | **no se adopta** |
| **Flujo rápido** (transversal) | `tech-spec-{slug}.md` | la regla «¿change de OpenSpec o PR directo?» | **no se adopta** |

Las tres filas de abajo no se descartan por gusto:

- **Solutioning** pondría las decisiones técnicas en dos casas —`architecture.md`
  y `design.md`/ADRs— y la divergencia entre dos casas es cuestión de tiempo. Es
  literalmente la enfermedad que `reglas-al-dia` está curando en otra superficie,
  en esta misma tanda.
- **Implementation** compite con gates que **ya fallan solos**: el review cruzado
  asignado por CODEOWNERS, el PR por bloque con `Closes`, el veredicto agregado
  de CI. Cambiar un gate mecánico por un agente que revisa es un downgrade, y el
  marco ya aprendió que herramientas en verde no bastan para lo que cambia
  contrato.
- **Flujo rápido** sería un tercer carril al lado de «change de OpenSpec o PR
  directo», o sea la ambigüedad que esa regla existe para eliminar.

## Decisions

### D1 — La capa se corta en el PRD, y la descomposición en changes no se importa

La adopción es de las fases 1 y 2. El último artefacto que entra es el **PRD**, y
entra como **insumo**: material de lectura para escribir el proposal y los
deltas, nunca como el documento que define el comportamiento.

Hay una precisión que la evaluación previa del área no podía tener, y que sale de
verificar v6 en vez de la versión anterior: **las épicas de BMAD viven en la fase
3, no en el PRD.** v6 las movió después de la arquitectura a propósito, porque la
arquitectura cambia cómo conviene partir el trabajo. Entonces «épica del PRD →
change de OpenSpec» no se puede sostener tal cual: o importamos también
Solutioning (que descartamos), o tomamos las épicas sin la arquitectura que v6
declara necesaria — justo el orden que BMAD rechaza.

Se resuelve por el lado correcto: **la descomposición en changes es acto de
builder**, no de la capa. El PRD informa el orden; el recorte lo firma quien
escribe el `tasks.md`. Y así queda alineado con el reparto que ya rige: el PO es
dueño del qué y del por qué, los builders del cómo.

**Alternativa descartada: adoptar BMAD punta a punta.** Reemplaza gates
mecánicos por rituales conversacionales y duplica las casas de las decisiones
técnicas. La premisa del marco lo prohíbe explícitamente.

**Alternativa descartada: importar `epics.md` sin `architecture.md`.** Es la
única forma de mantener «épica → change» sin adoptar Solutioning, y es la
ordenación que la propia herramienta abandonó en v6 por experiencia.

### D2 — El insumo no puede tener FORMA de contrato, y eso se verifica

La autoridad sobre el comportamiento sigue siendo `openspec/specs/`. En prosa eso
es fácil de escribir y no cuesta nada incumplirlo, así que se traduce a una
propiedad de forma: **un artefacto de descubrimiento que contenga encabezados de
delta (`## ADDED Requirements`, `## MODIFIED Requirements`) o escenarios
(`#### Scenario:`) pone el pipeline en rojo.**

El razonamiento es de lectura, no de pureza: un documento con forma de spec **se
lee como spec**. Si el PRD trae escenarios, el primero que lo abra —humano o
agente— va a tratarlo como contrato sin que nadie lo haya aprobado como tal, y
sin que el guardrail de deltas ni `validate --strict` lo miren nunca, porque no
está en `openspec/`. La forma es lo único que se puede verificar sin leer
semántica, y alcanza para cerrar el peor modo de falla.

Corolario que hay que decir aunque incomode: **el artefacto de descubrimiento no
se importa a la cadena de contexto de los agentes.** No va al `AGENTS.md` ni a
ningún import. Un PRD son decenas de páginas de material de trabajo; meterlo al
contexto de cada sesión paga el costo completo y, peor, lo pone al mismo nivel de
autoridad que las reglas. Se lee cuando se lo busca.

**Alternativa descartada: confiar en una línea de precedencia en prosa** («ante
conflicto manda el spec»). Es una regla para el lector, y el marco ya tiene un
inventario de reglas para el lector que se incumplieron hasta volverse checks.

### D3 — La trazabilidad es por identificador estable; el material crudo no entra al repositorio

Cada requirement de un change nacido de descubrimiento apunta al ítem de material
que lo origina, y el apunte es a un **identificador estable** —entrevista y marca
de tiempo, o el id del ítem en el inventario— no a un archivo del repositorio.

La razón es doble y las dos pesan. **Privacidad:** las transcripciones son
conversaciones con empleados reales, con nombres y con juicios sobre su propio
trabajo; el repositorio del código no es su custodio, no tiene ciclo de vida para
ese material y el detector de secretos del marco no lo protege de nada porque un
nombre no es un secreto. **Ciclo de vida:** el material crudo no se versiona
—nunca cambia— así que ponerlo bajo git no compra nada y lo expone a todo el que
clone.

Consecuencia aceptada: la trazabilidad se puede seguir hasta el identificador, y
de ahí en adelante hace falta acceso al material. Es exactamente el mismo límite
que el marco ya acepta cuando dice que los secretos se verifican **donde ya
existen** en vez de traerlos al contexto.

**Alternativa descartada: commitear las transcripciones.** Da trazabilidad
perfecta y convierte al repositorio en custodio de datos de personas, con la
frontera de privacidad decidida por omisión. Si alguna vez hace falta, es una
decisión humana con su propio change, no un efecto lateral de este.

### D4 — El supuesto abierto bloquea el archive, no la propuesta

Lo que el descubrimiento no pudo resolver queda **marcado como abierto** en el
artefacto donde vive. Un supuesto abierto **impide archivar el change**: se puede
proponer, diseñar y hasta implementar con dudas declaradas; no se pueden
convertir en contrato por omisión.

El momento del bloqueo es la decisión. Bloquear el proposal mataría el uso
legítimo —un proposal existe para exponer lo que no se sabe—. Bloquear el merge
de cada PR sería fricción constante sobre algo que no cambia por PR. El archive
es el instante exacto en que el delta se vuelve spec vivo, o sea el instante en
que una duda pasaría a ser una garantía. Ahí es donde tiene que doler.

Continuidad con lo ya decidido: la evaluación del 2026-08-14 ya proponía un check
de cero supuestos abiertos. Esto es eso, con el momento del bloqueo elegido a
propósito.

**Alternativa descartada: lista de supuestos al final del PRD.** Es el diseño por
defecto de la herramienta y es donde los supuestos se van a morir sin que nadie
los lea, igual que las excepciones que `reglas-al-dia` obliga a imprimir pegadas
a la regla que anulan.

### D5 — El piloto corre FUERA de todo repositorio: huella cero hasta el veredicto

El piloto usa material real y no necesita que exista el proyecto. Corre en un
espacio de trabajo desechable, con la herramienta pinada, y **no escribe una
línea en ningún repositorio**: ni en los consumidores, ni en `plantilla/`, ni en
`openspec/specs/`. Lo único que entra a Projects son los **artefactos del piloto**
—pre-registro, mediciones y veredicto— dentro del directorio de este change, y
despersonalizados.

**Alternativa descartada: pilotear dentro de Projects.** Los specs de dominio de
Supply Chain no son canónico del marco: `openspec/specs/` describe el carril, no
lo que viaja por él. Meterlos acá aunque sea «de prueba» contamina el contrato.

**Alternativa descartada: crear un repositorio de sandbox.** Crear repos y tocar
configuración de la organización es frontera con OK humano, y el piloto no lo
necesita: un directorio local alcanza.

### D6 — (obligatoria) El gate es una medición pre-registrada sobre el MISMO material, con dos brazos

Un gate que se aprueba con «pareció útil» no es un gate. El piloto es una
comparación con umbrales **escritos antes de correr y commiteados antes de la
primera sesión** — el sello de tiempo de git es la prueba de que no se acomodaron
después de ver el resultado.

**La rebanada.** Un proceso end-to-end que aparezca en las entrevistas, elegido
por el PO y un builder antes de arrancar, declarado por escrito: qué entrevistas,
qué proceso y dónde corta.

**Brazo A (control).** El camino de hoy: desde las transcripciones directo a
`proposal.md` + deltas, con la asistencia de agente que se usa habitualmente.

**Brazo B.** Fases 1 y 2 de la herramienta sobre el **mismo** material → brief +
PRD; y desde el PRD, `proposal.md` + deltas.

**El orden es A primero, y el sesgo se declara.** Quien escriba los dos brazos ya
va a haber pensado el problema cuando llegue a B, así que **el sesgo del orden
favorece a B**. Por eso los umbrales de B no son solo comparativos: los dos
criterios que justifican la capa (G2 y G3) exigen **cero absoluto**, no «mejor que
el control». Un empate o una derrota de B sería una señal fortísima; una victoria
está inflada y se lee con esa corrección puesta.

**Quién puntúa.** El builder que **no** corrió ninguno de los dos brazos. Arma el
inventario de materia prima desde las transcripciones antes de mirar las salidas,
y después puntúa las dos. El ciego es imperfecto —las dos salidas se distinguen a
ojo— y con tres personas no tiene arreglo: queda declarado como sesgo residual.
El PO firma la fidelidad al negocio; Builder 1 firma el veredicto.

**Los siete criterios, todos eliminatorios:**

| | Qué se mide | Umbral pre-registrado | Evidencia que se pide |
|---|---|---|---|
| **G0** | ediciones a archivos del directorio de instalación de la herramienta, durante el piloto | **cero**. Si hubo que tocarla para cortar en el PRD, la adopción no es «acotada»: es mantener un fork de un método ajeno | estado de git del espacio de trabajo, y la lista de ediciones si hubo alguna |
| **G1** | escenarios del delta del brazo B con al menos un ítem de materia prima asociado | **100%**, cero `n/a` | tabla de trazabilidad: ítem → sección del insumo → escenario |
| **G2** | ítems del inventario que no quedaron ni cubiertos, ni fuera de alcance declarado, ni pregunta abierta (**caídos en silencio**) | brazo B: **cero** en los ítems que el scorer clasifica como *regla de negocio*, y estrictamente menos que el control en el total | lista del scorer, ítem por ítem, con su clasificación y su destino |
| **G3** | afirmaciones de regla de negocio sin origen rastreable y sin marca de supuesto (**invención**) | brazo B: **cero** | lista del scorer con la cita textual y el veredicto de cada una |
| **G4** | horas de reloj del PO y del builder, y número de sesiones, por brazo | brazo B ≤ **2×** las horas de PO del control, **y** su salida pasa los mismos gates: `validate --strict` y guardrail de deltas verdes **por código de salida**, más la aceptación de los escenarios por el PO | planilla de horas por sesión declarada de antemano, y los dos exit codes |
| **G5** | puntos del piloto que dependieron de que alguien se acordara | la lista **no puede estar vacía** —una lista vacía significa que nadie miró— y cada ítem lleva destino: «check propuesto» o «queda fuera, y por qué». Si todo queda fuera, el techo del veredicto es **amarillo** | la lista con su columna de destino |
| **G6** | veces que el insumo se usó como autoridad de comportamiento sin escenario que lo respalde | **cero**. Si aparece aunque sea una, el modo de falla es fácil y el check de D2 se estrena **rojo desde el día uno**, sin ventana de gracia | búsqueda del scorer en los artefactos y en los PRs del piloto |

**Regla de veredicto.** Verde exige los siete. Rojo si falla G0, G1, G2 o G3 —esos
cuatro son la razón de existir de la capa—. Amarillo si falla solo G4, o si G5
queda entero afuera. G6 no cambia el veredicto: cambia con qué dureza se estrena
el check de D2.

**Sobre los números, y la regla que parece contradecir.** El marco prohíbe los
invariantes con cantidades esperadas, y con razón: una migración abortada por un
conteo que no coincidía. Esa regla es sobre **invariantes que corren
repetidamente** contra datos que cambian. Un gate de piloto es una **medición
única con umbral pre-registrado**, y ahí el número es lo que hace la afirmación
falsable. Son los dos modos de falla opuestos: en un invariante el número inventa
un fallo; en un gate, la ausencia de número inventa un éxito.

### D7 — (obligatoria) El estado experimental caduca por fecha, y el marco lo hace cumplir

Un change activo y sin archivar **es** el estado experimental nativo del marco:
la propuesta existe, está revisada, es citable y no es contrato. Es el mecanismo
correcto y tiene un modo de falla obvio: el zombi. Un change que nadie archiva ni
descarta se queda ahí, envejece, y al año siguiente nadie sabe si es una promesa
o basura.

Entonces: un change que declara `experimental: true` **declara también**
`veredicto_antes_de: <fecha>`, y el pipeline se pone rojo cuando esa fecha pasa
sin veredicto. Dos rojos, no uno: declararse experimental **sin** fecha también
falla, porque si no, la puerta de escape es no poner la fecha.

Es inerte para todo lo demás: un change que no se declara experimental no ve nada.
Eso lo vuelve MINOR y no breaking — ningún repositorio que hoy pasa, mañana falla.

**Y este check sí se puede dogfoodear.** A diferencia del de `reglas-al-dia`,
que no puede correr en el repo que lo publica, este corre sobre
`openspec/changes/` de cualquier repo — incluido Projects, cuyo primer sujeto es
**este mismo change**. El banco de pruebas es real desde el día uno.

**Acoplamiento declarado, con su salida.** Este requirement vale con o sin BMAD:
es la única pieza de acá que no depende del veredicto. Se lo deja en este delta
porque sin él el gate de este change es honor-based, y eso es lo que el repo no
acepta. Si el veredicto es rojo o amarillo, **se rescata a un change propio y se
archiva por separado**; está escrito como tarea, no como buena intención.

**Alternativa descartada: dejar el change activo hasta que alguien decida.** Es
el estado por defecto y es el zombi. La revisión trimestral lo cazaría, y su
propio texto admite que no es enforcement.

### D8 — Los tres veredictos, con su desenlace escrito de antemano

| Veredicto | Qué significa | Qué pasa con este change |
|---|---|---|
| **Verde** (los siete criterios) | la capa produce material trazable, no inventa y cuesta lo declarado | se archiva: los dos requirements entran a los specs vivos, se amplía el `## Purpose`, y arranca la tanda de implementación (checks, scaffold, pin) |
| **Amarillo** (falla solo el costo, o G5 entero afuera) | sirve, pero no como requisito del marco | queda como **herramienta del PO documentada en `docs/`**: sin requirement, sin huella en el scaffold y sin check. El change **no** se archiva: su evidencia se escribe como ADR y el directorio se borra en ese mismo PR. El requirement de caducidad se rescata aparte |
| **Rojo** (G0, G1, G2 o G3) | no cierra el hueco, o hay que forkear el método para usarlo | ADR de rechazo con las mediciones, y el directorio del change se borra en ese mismo PR. El plan B queda anotado en el ADR |

Por qué el desenlace de amarillo y rojo **no** es archivar: archivar es fundir el
delta en el contrato. Un delta que el piloto refutó no se funde. Y por qué no es
simplemente borrar: la medición es lo más valioso que produce el piloto, y
`docs/adr/` es el lugar que el marco ya tiene para las decisiones estructurales
que alguien va a querer entender en seis meses sin arqueología de chat.

### D9 — Clasificación de distribución de cada pieza

`AGENTS.md` la exige por pieza tocada, y con la justificación de por qué esa y no
otra:

| Pieza | Forma | Por qué esa |
|---|---|---|
| Los dos requirements nuevos | **Canónico** | son contrato del marco. Un proyecto no los copia: los cumple |
| Los cuatro checks (forma de spec, procedencia, supuestos abiertos, caducidad) | **Referenciado** | tienen que corregirse una vez para todos y llegar sin que el proyecto toque nada |
| El directorio declarado de artefactos de descubrimiento, su entrada en CODEOWNERS del rol de producto y su exclusión del formateador | **Scaffold** | desde el día uno son del proyecto: el nombre del directorio y quién revisa esos artefactos son suyos |
| El pin de la herramienta de descubrimiento | **Regenerado** | idéntico razonamiento al del CLI de OpenSpec: el marco pina la versión, cada repo la instala, **no se vendora**. Vendorarla congelaría para todos la versión que la generó |
| El directorio de instalación de la herramienta en el repo del consumidor | **ninguna: se ignora en git** | es dependencia instalada, no fuente. Lo que se versiona son sus **salidas** |
| Los artefactos del piloto (pre-registro, mediciones, veredicto) | **ninguna** | son la historia de una decisión. Viajan con el change al archive, o al ADR si el veredicto no es verde |

### D10 — El delta va en `gobierno-contribucion`, y el motivo es mecánico

El delta podría ser una capability nueva —`descubrimiento`— y suena más limpio.
Se descarta por CODEOWNERS.

El gate del PO en este repo está cableado a dos rutas exactas:
`/openspec/specs/gobierno-contribucion/` y
`/openspec/changes/**/specs/gobierno-contribucion/`. Una capability nueva caería
en `*` → equipo de builders, o sea que **el PO no quedaría asignado
automáticamente al artefacto que más le pertenece**: la gobernanza de su propio
método de trabajo. Y agregar la ruta nueva a CODEOWNERS en este mismo PR no lo
arregla: GitHub usa el CODEOWNERS de la **rama base** del PR, así que la línea
agregada no gatea el PR que la agrega. El gate del PO degradaría a «acordate de
pedirle review al PO», que es la definición de lo que acá no cuenta.

Encaja además por contenido: la capability ya gobierna la trazabilidad **hacia
abajo** (la plantilla de PR exige el link al change). Esto es la misma propiedad
**hacia arriba**.

Si la capa crece, partirla a su propia capability es un change posterior que
empieza por agregar sus dos líneas de CODEOWNERS y recién después mueve el
requirement. En ese orden, no en el inverso.

## La propiedad, enunciada

> **Requirement: El descubrimiento llega al contrato con procedencia, y no lo
> reemplaza**
>
> Cuando un change nace de material de descubrimiento, el repositorio SHALL
> conservar los artefactos derivados en una ubicación declarada fuera del árbol
> de specs, y cada requirement del change —y cada escenario que lo ilustra—
> SHALL poder rastrearse hasta el ítem de material que lo origina.
>
> La autoridad sobre el comportamiento SHALL seguir siendo únicamente los specs
> vivos: un artefacto de descubrimiento NO SHALL adoptar la forma de un spec, y
> el pipeline SHALL rechazarlo cuando lo haga.
>
> Todo supuesto que el descubrimiento no pudo resolver SHALL quedar marcado como
> abierto, y un supuesto abierto SHALL impedir que el change se archive.

> **Requirement: El estado experimental de un change caduca por fecha**
>
> Un change que se declara experimental SHALL declarar la fecha en que su
> veredicto vence, y el pipeline SHALL rechazar el repositorio cuando esa fecha
> pase sin veredicto, o cuando el change se declare experimental sin fecha.

Ninguno de los dos enunciados nombra un producto, un formato de archivo ni un
directorio. Si mañana se cambia de herramienta de descubrimiento, cambia el pin y
el nombre del directorio declarado; las propiedades siguen siendo las mismas.

## Cómo se hace cumplir solo

| Propiedad | Check | Falla cuando |
|---|---|---|
| El insumo no tiene forma de contrato | paso nuevo en el job de marco | un artefacto del directorio declarado contiene encabezados de delta o escenarios |
| Cada escenario tiene procedencia | ídem | hay escenarios en el delta del change sin entrada en la tabla de trazabilidad, o con procedencia vacía |
| Supuesto abierto no se vuelve contrato | ídem, y solo en el PR que archiva | el change que se archiva cita material con supuestos abiertos |
| El experimento caduca | paso nuevo, **inerte** hasta que un change se declara experimental | un change declara `experimental` sin fecha, o su fecha pasó sin veredicto |
| El artefacto de descubrimiento no entra al contexto de los agentes | **— sin check** | nada distingue mecánicamente un import legítimo de uno indebido. La mitigación es que el artefacto vive fuera de la cadena de imports y la regla queda escrita en el canónico |
| El material crudo con datos de personas no entra al repositorio | **— sin check** | un nombre no es un secreto y el detector no lo ve. La mitigación es que la trazabilidad funciona **sin** el material, así que no hay incentivo para subirlo |
| La procedencia es buena, no solo existente | **— sin check, y no puede haberlo** | ver la última sección |

## El pre-registro, y qué se commitea antes de arrancar

Antes de la primera sesión del piloto entra al directorio de este change un
`piloto/pre-registro.md` con, y nada más que:

1. la rebanada elegida (entrevistas, proceso, dónde corta) y por qué es
   representativa;
2. los dos brazos, quién corre cada uno y en qué orden;
3. quién puntúa, y la declaración de que arma el inventario antes de ver las
   salidas;
4. la tabla de los siete criterios con los umbrales **ya escritos**;
5. la planilla vacía de horas por sesión;
6. la versión exacta pinada de la herramienta.

Después del piloto entran `piloto/mediciones.md` (el inventario, las listas del
scorer y las horas) y `piloto/veredicto.md` (los siete resultados, el veredicto y
las tres firmas). Todo despersonalizado: ni nombres de entrevistados ni citas que
los identifiquen.

## Lo que este diseño NO resuelve

- **La procedencia no es calidad.** La capa garantiza que un escenario tenga
  origen; no que el origen sea bueno. Una transcripción puede contener una mala
  idea, y la trazabilidad la va a rastrear con fidelidad perfecta hasta su
  fuente. Lo que se cierra es la invención **silenciosa**, no el error de
  criterio del negocio.
- **BMAD no puede ser enforcement, nunca.** Es conversacional de punta a punta:
  nada adentro falla solo. Todo lo que este diseño gatea es su **salida**. Si
  alguien lee esto como «el marco ahora garantiza buen descubrimiento», va a
  poner confianza donde no hay mecanismo.
- **El PRD envejece y nadie lo va a notar.** Queda congelado y fechado como
  insumo, y el spec vivo es la autoridad. Ningún check compara los dos: un PRD
  que hoy describe el sistema y en seis meses miente no pone nada en rojo. Es la
  misma forma de hueco que `reglas-al-dia` declara para el `AGENTS.md` del
  proyecto que contradice al artefacto del marco.
- **El piloto tiene n=1.** Una rebanada, un proyecto, un PO. Puede **refutar** la
  capa; no puede demostrar que sirve en general. El gate está diseñado para poder
  decir no, no para poder decir sí — y esa asimetría es deliberada.
- **El ciego del scorer es imperfecto** y con tres personas no tiene arreglo. Más
  el sesgo del orden, que favorece al brazo B. Los umbrales absolutos de G2 y G3
  son la compensación, no la solución.
- **Una dependencia de terceros en el carril de todos.** Si el veredicto es
  verde, el pin entra a un carril que consumen repos que no participaron de la
  decisión. Se pina por versión exacta y se acota a los módulos que se usan, y
  aun así el riesgo de que un cambio ajeno mueva el piso queda: es la razón por la
  que agregar una dependencia es frontera con OK humano.
- **La cadena de herramientas se ensancha.** El README de BMAD pide Python 3.10+
  y uv además de Node, en un área que hoy es TypeScript y pnpm. No pude confirmar
  qué módulo lo necesita; si el piloto lo confirma, es un costo que hay que
  escribir en el CHANGELOG y no descubrir en la máquina de alguien.
- **La marca es de otro.** BMad™ y BMad Method™ son marcas registradas de un
  tercero, con licencia MIT sobre el código. En la documentación del marco se lo
  nombra por su nombre y no se lo renombra ni se lo presenta como propio.
- **La dirección inversa sigue sin mecanismo.** Lo que el piloto aprenda sobre el
  método de descubrimiento y quiera devolverle a la herramienta no tiene canal;
  igual que la mejora que un proyecto descubre y debería subir al marco.
