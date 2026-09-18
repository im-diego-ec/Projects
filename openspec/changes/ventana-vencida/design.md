---
artefacto: design
dri: Builder 1
revisa: revision adversarial (desvio del marco: un solo mantenedor, ver AGENTS.md)
estado: pendiente-de-revision
---

# ventana-vencida — Design

## D1. Se retira la política, no el mecanismo

**Decisión.** Desaparece el piso obligatorio de 28 días (`DIAS_DE_GRACIA_MINIMOS`) y la
puerta `"urgente": true`. **Sobrevive** el camino de aviso con fecha: si una entrada del
manifiesto declara un `exigible_desde` posterior a su `publicada`, la verificación avisa
hasta esa fecha, igual que hoy.

**Alternativa descartada: borrar el mecanismo entero** (`hallazgoPorFecha` sin fechas, el
campo fuera del manifiesto, el output fuera de la action). Es lo primero que se consideró y
está mal por una razón concreta: `AGENTS.md` línea 163 sigue diciendo que un endurecimiento
«se estrena en modo aviso y el endurecimiento va en el major siguiente». Borrar el
mecanismo dejaría esa regla **sin forma de cumplirse**, y una constitución con una regla
inaplicable es peor que una con una política de más. Además el costo medido era desigual:
borrarlo tocaba 10 archivos y reescribía 2 pruebas; retirar la política toca 5 y reescribe
las mismas 2.

**Alternativa descartada: dejar el piso en 28 y solo sacar la fecha de la prosa.** Es
cosmética. Medido: la fecha que un consumidor ve no sale de la versión que se publica sino
de la **entrada pendiente más vieja**, así que sacarla del CHANGELOG no la saca del
mensaje. El consumidor seguiría viendo 2026-09-19, heredado de la 1.4.2.

## D2. Las entradas históricas también pasan a exigible = publicada

**Decisión.** Las tres entradas del manifiesto quedan con `exigible_desde` igual a
`publicada`.

**Por qué no es reescribir historia.** `publicada` guarda la fecha real y no se toca.
`exigible_desde` es un campo de **política**, y la política cambió: el manifiesto que viaja
con la 1.6.0 es la declaración de la 1.6.0 sobre cuándo es exigible cada versión del
canónico. Dejar las viejas con su ventana original sería peor que inconsistente: el
consumidor que está dos versiones atrás heredaría una ventana de la 1.4.2 y el cambio no
tendría efecto sobre el único repo al que le importa — o sea, sería un cambio que no cambia
nada, que es la peor clase.

## D3. Por qué esto NO es breaking, con el test del propio marco

`AGENTS.md` define breaking como «endurecer un check de modo que **un repo que hoy pasa
mañana falle**». El test operativo es: *¿un repositorio que no toca una sola línea pasa de
verde a rojo?* Con distribución por **versión exacta e inmutable**, no: su pin resuelve el
mismo árbol para siempre. El rojo aparece únicamente dentro de un **PR de bump**, que el
consumidor abre, lee y mergea o no.

La lista de breaking de `AGENTS.md` se escribió cuando el canal era el tag móvil, donde el
cambio llegaba **empujado**. Ese bullet describe el modelo de empuje. Lo que queda de él en
el modelo actual —y sigue siendo breaking— es lo que rompe **el bump**: renombrar un job
que publica un check, exigir un permiso nuevo, quitar un input. Esto no hace nada de eso.

**Lo que sí cambia y va nombrado en mayúsculas en «Para consumidores»:** el PR de bump de
un repo atrasado llega **rojo** en vez de amarillo, y no se puede mergear sin regenerar el
artefacto. El arreglo es el mismo que ya existía y no requiere escribir nada: el propio job
sube el artefacto al día.

## D4. El output `exigible_desde` se QUEDA

**Decisión.** No se toca: ni el output de `action.yml`, ni el campo del manifiesto, ni
`hallazgoPorFecha`. Solo se corrige la descripción del output, que hoy dice «fecha desde la
cual esa version deja de ser aviso y pasa a fallar» y describe la política vieja.

**Por qué se reconsideró.** La primera versión de este design lo quitaba, con el argumento
de que no lo consume nadie —medido: ni el andamio, ni las skills, ni el `ci.yml` del
consumidor real, que solo usa `outputs.corregidos`—. Pero quitar un output es **breaking
por la letra de `AGENTS.md`**, y el beneficio era cero: el campo sigue existiendo porque el
mecanismo de aviso sobrevive (D1). Pagar una etiqueta de breaking por borrar algo que sigue
teniendo sentido es al revés.

## D5. La propiedad se enuncia donde no estaba

**Hallazgo del recon, y es la mitad más valiosa de este change:** el comportamiento del
artefacto de la constitución **no está en ningún spec vivo**. Vive en el código, en
`actions/README.md` y en la skill del release. Se buscó en las nueve capabilities: cero
requirements.

Así que el delta no «modifica» una garantía: la **escribe por primera vez**, con el
comportamiento nuevo. Eso tiene una consecuencia sana e inmediata: a partir del merge,
cambiar esta política vuelve a exigir un delta, que es lo que no ocurrió las veces
anteriores.

## D6. Lo que este change NO arregla, dicho antes de que alguien lo suponga

- **La ventana de la cobertura** (`calidad-codigo`, líneas 265-275, cierre 2026-09-30)
  tiene la misma premisa vencida y **no se toca**: otro mecanismo, otro radio, una fecha ya
  anunciada. Queda nombrada en el proposal.
- **El artefacto del consumidor no se regenera acá.** Este change hace que su
  próximo PR de bump llegue rojo; regenerarlo es trabajo de ese repo, en ese PR.
- **La premisa vencida sigue escrita en el spec vivo de la cobertura.** Corregir esa
  justificación es parte de la decisión sobre esa otra ventana, no de esta.

---

## Adenda del 2026-09-17 — el cierre (porte de Rigel, lote 3)

> **D1 queda superada en su mitad «opt-in».** Su argumento era que `AGENTS.md` pedía
> estrenar un endurecimiento «en modo aviso», y que borrar el mecanismo dejaba esa regla
> sin forma de cumplirse. La decisión D1 del PO del 2026-09-17 cambió la regla: una
> compuerta se exige en rojo el día que sale, salvo que su arreglo quede **fuera** del
> árbol del consumidor. Regenerar este artefacto queda adentro. La reescritura de
> `AGENTS.md` es de otro change (`que-es-breaking`); esta adenda solo deja de apoyarse en
> la frase vieja. D2, D3, D4 y D5 siguen valiendo tal como están.

### D7. La excepción sale del spec; el mecanismo, todavía no

**Decisión.** El delta deja de ofrecer la fecha de exigibilidad futura: la versión
exigible es la publicada, sin excepción. En el código, `hallazgoPorFecha` conserva sus dos
ramas y el manifiesto conserva el campo `exigible_desde`, pero la rama de aviso queda
**inalcanzable por datos**: un banco del marco rechaza cualquier versión con dos fechas
distintas. El campo, la rama y el output se retiran en v2.

**Alternativas descartadas.**

- **Retirar el mecanismo entero ya** (campo, rama y output, como hizo Rigel en su 2.0.0).
  Quitar un output es breaking por la letra de `AGENTS.md`, y la línea v2 se abre una sola
  vez con todos los breaking juntos (decisión D1 del PO). Queda preparado para ese change.
- **Hacerlo cumplir en `validarManifiesto()`**, que corre en el pipeline de cada
  consumidor. El manifiesto lo escribe el marco: si alguien declara una segunda fecha, el
  defecto es del marco y el rojo tiene que caer en **su** PR, antes de publicar, y no en el
  job `constitucion` de un repo que no hizo nada. Además rompería las pruebas del
  mecanismo que sigue en el código hasta v2.
- **Dejar la excepción en el spec**, como estaba aprobado. Contradice la decisión del PO,
  y el spec prometería algo que el banco rechaza.

### D8. El texto del canónico gana una versión, y no se pisa la de antes

**Decisión.** La regla `marco-artefacto-al-dia` pasa de «avisa primero y falla desde la
fecha que el propio aviso imprime» a «es **rojo** desde el PR de bump que lo deja atrás».
El manifiesto gana la entrada **1.10.0** con la huella del texto nuevo y las dos fechas
iguales. El número es tentativo: la nota del propio manifiesto manda corregirlo en el PR
del release si sale con otro, y el release refresca las fechas.

**Por qué versión nueva y no pisar la huella de la 1.7.0.** Es exactamente el defecto
que `huella-del-canonico.test.mjs` existe para impedir: dos textos distintos con el mismo
número. Pisarla haría que el artefacto de un consumidor en 1.7.0 dejara de coincidir con
el re-render de «su» versión y la verificación lo reportara como **edición a mano**, que
es el mensaje equivocado para lo que pasó.

**Por qué ahora, con consumidores reales.** Cada versión del canónico pone rojo el PR de
bump de cada consumidor hasta que regenere, y hoy hay tres en `@v1.9.6`. Por eso el
change `el-canonico-dice-como-se-trabaja` (lote 11 del porte) mete sus reglas nuevas en
**esta misma** versión, que todavía no se publicó: un solo rojo por consumidor en vez de
dos. Actualizar la huella de una entrada **no publicada** no es pisar historia.

**El costo de líneas.** Medido con `leerCanonico()`, que es como cuenta el presupuesto la
action (pega las secciones con una línea en blanco entre cada par): 697 antes, **696**
después, sobre 700. La frase nueva cabe en una línea.

### D9. Clasificación de distribución de cada pieza que se toca

| Pieza | Forma | Por qué esa |
| --- | --- | --- |
| `actions/constitucion/canonico/20-marco-version.md` y `manifiesto.json` | **Canónico** que viaja dentro de una action **referenciada**, y llega al consumidor como artefacto **regenerado** | Es la fuente única de la porción del marco. No es scaffold: el consumidor no la edita, la regenera. |
| Comentarios de `action.yml`, `constitucion.mjs`, `cableado.mjs` y la descripción del output | **Referenciado** | Viajan con la action por `uses:@vX.Y.Z`. Cero cambio de comportamiento: ni un `input`, ni un `output`, ni un nombre de job. |
| `plantilla/.github/workflows/actualizar-marco.yml` (un comentario) | **Scaffold** | Lo recibe solo un proyecto nuevo; los tres que existen conservan su copia. Es prosa: no cambia nada que corra. |
| `actions/README.md` | Documentación del marco | No viaja. |
| `.claude/skills/projects-release/SKILL.md` | Herramienta interna del repo | Skill propia de Projects, no la regenera el CLI de OpenSpec, así que se edita a mano sin perder nada. |
| `actions/constitucion/pruebas/la-ventana-no-vuelve.test.mjs` | Banco interno | Corre en el CI de Projects (`actions/**/pruebas/*.test.mjs`). Viaja en el árbol de la action pero ningún consumidor lo ejecuta. |
| Deltas de `calidad-codigo` (este change) y `gobierno-contribucion` (`reglas-al-dia`) | **Canónico** (specs del marco) | El segundo es de la capability de gobernanza: lo aprueba el PO. |

### D10. Qué lo hace cumplir solo, y qué no

- **Una sola fecha por versión:** `la-ventana-no-vuelve.test.mjs` sobre el manifiesto
  real. Medido: poner `exigible_desde` en 2026-09-28 a la 1.7.0 lo pone rojo nombrando la
  versión y las dos fechas.
- **La regla del canónico dice rojo:** el mismo banco busca el bloque de
  `marco-artefacto-al-dia` por su id estable y exige «rojo» y ningún «aviso/avisa».
- **La prosa que describe el veredicto:** el mismo banco caza las seis redacciones que ya
  estuvieron escritas, en el canónico, la action, su README, la skill del release y el
  actualizador del andamio. **Límite declarado:** es una lista cerrada. No caza una
  redacción nueva de la misma promesa, porque decidir si una frase promete un aviso no es
  decidible con un patrón. Lo que cubre ese resto es la revisión adversarial del change,
  que es donde esta clase apareció las dos veces.
- **Que el texto y su número no se separen:** `huella-del-canonico.test.mjs`, que ya
  existía.

### D11. Lo que la auditoría de cierre encontró y este change NO arregla

- **El arreglo que imprime el rojo miente a medias.** Dice «correr el modo escribir de
  esta action (el PR semanal de actualizacion lo hace solo)», y con Dependabot como canal
  (decisión D2 del PO) el actualizador corre el pin **viejo**: su propio encabezado dice
  que es un no-op para una versión nueva. Y la otra salida, «bajar el artefacto corregido
  que este job sube», sale vacía hasta que el andamio suba archivos ocultos (tarea 5.3 de
  `reglas-al-dia`). Es otra promesa y otra pieza: va con el change
  `el-marco-deja-de-afirmar-lo-que-no-hace`.
- **El resumen de cada corrida imprime «exigible desde».** Es verdad —es la misma fecha
  que la publicación— y se va con el output en v2.


## Adenda del 2026-09-18 — la revisión adversarial del carril

### D12. Las dos fechas iguales no alcanzan: tampoco pueden ser futuras

**El hueco.** La regla de D7 pedía `exigible_desde` igual a `publicada` y no miraba
**cuáles**. Una entrada con las dos en el futuro la pasaba, y la rama de aviso de
`hallazgoPorFecha` volvía a ser alcanzable: medido por la revisión, un consumidor con el
artefacto en 1.7.0 salía `exit 0` con «Hasta el 2026-12-01 esto es un aviso». No es un
caso de laboratorio: la entrada del canónico se abre con número tentativo antes del
release, y la skill del release mandaba «refrescar las dos fechas», que es acordarse.

**Decisión.** Una tercera regla en `la-ventana-no-vuelve.test.mjs`: ninguna fecha del
manifiesto es posterior a hoy, medido en UTC+14 —el día más adelantado del planeta—
para que la hora a la que se corre no ponga rojo un release legítimo. Es monótona: lo
que hoy pasa, pasa mañana. Como el PR del release corre el banco el día que se corta y
el tag se crea sobre ese merge, una fecha futura no llega a publicarse.

**Descartado: igualar `publicada` a la fecha del CHANGELOG.** Es lo que sugería la
revisión, y se midió antes de escribirlo: la entrada «1.7.0» dice 2026-08-31, la sección
[1.7.0] del CHANGELOG dice 2026-08-23, y ese texto del canónico lo publicó la v1.8.0 del
2026-09-01 (`git show v1.8.0:actions/constitucion/canonico/manifiesto.json`). La igualdad
pondría rojo un dato histórico que no se corrige sin cambiar la versión que declaran los
artefactos de los consumidores; y lo que protege —que el aviso no se vuelva alcanzable—
ya lo cubre la regla de hoy.

### D13. El proyecto nace con la constitución de su pin, no con la del clon

**El defecto** (RV-L3L11-01, severidad alta). La 1.10.0 de este change y de
`el-canonico-dice-como-se-trabaja` vive en el árbol antes de su release, y el andamio
pina `actions/constitucion@v1.9.6`, cuyo canónico termina en la 1.7.0. `projects-init`
renderizaba con la action **del clon** y el CI del proyecto verifica con la **del
tag**: reproducido con un proyecto generado desde este árbol y verificado con
`git archive v1.9.6 actions/constitucion`, `exit=1` y dos `::error::` («declara la
version 1.10.0 y esta copia del marco es la 1.7.0»). Con eso, `ci-ok` rojo y el
despliegue sin dispararse. En local salía verde: se verificaba con la misma action.

**Decisión.** `projects-init` lee el pin del `ci.yml` ya instanciado del destino y, si
el clon tiene ese tag, extrae la action con git (`ls-tree` + `cat-file`, sin `tar`) y
renderiza con ella. Es lo que `herramientas/plantilla-repos/personalizar.yml` ya hacía
para las plantillas, «no `main`», por el mismo motivo medido. Misma reproducción con el
arreglo: `exit=0`, cero `::error::`.

**Sin el tag no se corta el camino.** Una descarga en ZIP —el camino acompañado de
`docs/04`— no trae tags. Ahí se renderiza con el clon, y la herramienta avisa **solo si
el aviso es verdad**: si el canónico del clon declara una versión mayor que el pin,
ningún release la publicó y el primer CI va a ser rojo. Si no es mayor, el clon y el tag
dicen lo mismo (la huella no deja cambiar el texto sin agregar una versión) y un aviso
sería ruido para quien arranca con doble clic.

**Alternativas descartadas.**

- **Que ningún cambio del canónico llegue a `main` antes de su release**, con un banco
  que exija que la última versión del manifiesto no supere el pin del andamio. Cierra
  también el camino ZIP, pero en este porte estaría rojo por construcción hasta que el
  lote 38 mueva los pines, y decide cómo se integra el porte a `main`: es una decisión
  del PO, no de este change. Queda como tarea abierta con su motivo.
- **Bajar la action del pin por la red.** Agrega una dependencia de red a una
  herramienta que corre en la máquina de quien arranca, para cubrir la ventana entre un
  merge y un release. No compensa.

**Clasificación de distribución.** `herramientas/projects-init.mjs` es **herramienta
del marco**: corre desde el clon y no viaja al proyecto. Contrato: corrección de
comportamiento (patch) — el proyecto nace con lo que su propio CI verifica.
