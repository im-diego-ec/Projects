---
artefacto: tasks
dri: Builder 1
aprueba: Builder 2 (builder par)
informado: PO / Builder 2
estado: pendiente-de-revision
---

# entrega-referenciada — Tasks

**Este change es el primero de una serie de 4-5, y el único que además construye
el invariante.** El orden de extracción que fija `design.md` (D1) es compromiso,
no sugerencia: `one-off-ecs` → `migraciones-gate` → `build-push-ecr` →
`actualizar-servicio-express`. Acá se hace **la primera compuerta más el
invariante**; las tres siguientes son changes propios, enumerados al final con su
ritmo honesto.

El criterio de secuencia es el que ya funcionó en `marco-se-cumple-solo`:
**primero el banco de pruebas, después la pieza, después el consumidor, y el tag
`v1` al final** — y el tag es acto humano con OK explícito (`AGENTS.md:233`), no
un paso que un agente cierre solo.

Las referencias `deploy.yml:NN` son al archivo del consumidor vigente al abrir
este change (685 líneas).

## 0. Compuerta de contrato (BLOQUEANTE — y no es trabajo de este change)

`design.md` lo flaguea y no lo cierra: las actions de entrega codifican la
infraestructura fija del área, y hoy el marco dice dos cosas incompatibles con
eso —`AGENTS.md:181-183` («el deploy con la topología de su infraestructura es
del proyecto») y `README.md:265-270` («No impone stack»)—. Publicar una action de
entrega antes de resolverlo es publicar una pieza que contradice el README que la
documenta.

- [ ] 0.1 El **change de contrato** cierra la pregunta de dónde queda escrita la
      infraestructura fijada. En esta misma tanda está en vuelo el change hermano
      `stack-estandar` (capability nueva `base-tecnologica`), que publica la base
      tecnológica del área como contrato y exige OK humano ANTES de apartarse:
      ese es el change del que este depende. Verificar que su delta cubra las dos
      piezas que este change necesita —la base como primera opción y la figura de
      apartarse— y, si no las cubre, decirlo en su review, no parchearlo desde
      acá. Evidencia: el delta de `base-tecnologica` aprobado, con esas dos
      propiedades nombradas.
- [ ] 0.2 La **reconciliación de los dos textos** que hoy contradicen a las
      actions de entrega: `AGENTS.md:181-183` («el deploy con la topología de su
      infraestructura es del proyecto») y `README.md:265-270` («No impone
      stack»). Va en el change de contrato o en su estela, con la figura de
      **excepción registrada** escrita —el proyecto que no cabe conserva los
      specs como propiedades, es dueño de su deploy y no consume las piezas de
      entrega—. Este design la flaguea y no la cierra. Evidencia: los dos textos
      reconciliados y la excepción documentada.
- [ ] 0.3 No arrancar el bloque 2 hasta que ese change esté mergeado. Evidencia:
      `grep -n "topología de su infraestructura" AGENTS.md` y
      `grep -n "No impone stack" README.md` → el texto reconciliado, no el viejo.

## 1. El invariante y su banco de pruebas, ANTES de la primera extracción

El check tiene que existir antes que la pieza: si nace después, su primera
corrida verde no prueba nada (no hay nada que verificar) y el orden se pierde.

- [ ] 1.1 Check nuevo en el verificador de `marco-ci.yml`: **ninguna pieza
      referenciada del marco usada en un job de producción puede faltar en el
      tramo de dev de la misma promoción**. Lee el YAML del consumidor, no el log
      de un run. Evidencia: el paso corriendo en el CI de Projects con exit code 0
      sobre el fixture verde.
- [ ] 1.2 Fixtures, uno por escenario del delta y cada uno con su veredicto
      esperado: pieza en dev y en prod (verde); pieza **solo** en un job de prod
      (rojo, nombrando la pieza y el tramo que falta); rollback sin tramo de dev
      (verde por excepción declarada); dispatch de emergencia (verde por excepción
      declarada); reuso por tree (verde por excepción declarada); vía nueva que
      esquiva el invariante sin declararse (rojo); repositorio sin ninguna pieza
      del marco en prod (verde vacuo — el caso de todo consumidor que aún no
      adoptó). Evidencia: los siete casos en el log del job, con el veredicto de
      cada uno.
- [ ] 1.3 Las **tres excepciones reconocidas por nombre**, no por heurística: el
      verificador dice cuál excepción aplicó y por qué. Una excepción que el
      verificador aplica en silencio es un fail-open silencioso, que es lo que
      `AGENTS.md:221-222` prohíbe. Evidencia: `::notice::` con el nombre de la
      excepción en cada uno de los tres fixtures.
- [ ] 1.4 Verificación **por exit code** de todo YAML que este bloque toque —el
      grep de la salida ya dio un falso verde en este repo—. Evidencia: por cada
      archivo, `js-yaml <archivo> >/dev/null 2>&1; echo $?` → 0, y `actionlint
      -shellcheck=` → 0 (en Windows, `-shellcheck` sin `=` hace deadlock).
- [ ] 1.5 Aviso —**no rojo**— cuando el repositorio conserva mecánica copiada que
      ya existe como pieza referenciada, nombrando la pieza que la reemplaza. Es
      el ítem 2 de la revisión trimestral («adopción de lo referenciado») que se
      vuelve señal automática. Evidencia: fixture con la mecánica copiada → aviso
      presente y job en verde.

## 2. `one-off-ecs`: la primera compuerta

El patrón que aparece cuatro veces (`deploy.yml:121`, `:206`, `:324`, `:480`) y
el sustrato de las tres compuertas siguientes.

- [ ] 2.1 La action en `actions/one-off-ecs/`, con **entradas nombradas** y sin
      herencia indiscriminada de secretos (D5). El contrato mínimo sale del
      archivo real: el comando a ejecutar, el override de entorno (el caso de
      migraciones pasa el usuario de base), el prefijo de `started-by` y el
      timeout. Evidencia: `action.yml` parseando (`js-yaml` → exit 0) y el
      catálogo de `actions/README.md` con su fila.
- [ ] 2.2 El **check del exit code de la tarea es parte de la pieza**, no del
      llamador: las cuatro copias lo hacen de dos formas distintas
      (`deploy.yml:130-131` con `describe-tasks` en JSON, `:331-333` inline), y esa
      divergencia es precisamente lo que se está eliminando. Evidencia: prueba de
      la action con exit code distinto de 0 → la action falla, y el mensaje nombra
      la tarea.
- [ ] 2.3 La variante que el consumidor necesita **sin romper el invariante**: la
      limpieza del E2E corre aunque la suite falle (`deploy.yml:300-304`), así que
      la pieza no puede asumir `set -e` del llamador ni condicionar su propia
      ejecución. Evidencia: fixture que ejecuta la action tras un paso fallido.
- [ ] 2.4 Cero valores de un proyecto dentro de la pieza (`AGENTS.md:243-245`):
      ni dominios, ni cuentas, ni ARNs, ni log groups. Evidencia:
      `grep -rnE "ejemplo|arn:aws|[0-9]{12}" actions/one-off-ecs/` → vacío.
- [ ] 2.5 Permisos **auditados acción por acción** antes del estreno, la lección
      que este repo ya pagó tres veces (`deploy.yml:360-366`). Evidencia: la tabla
      de permisos mínimos en el catálogo, y una corrida con exactamente esos
      permisos.
- [ ] 2.6 `CHANGELOG.md` en el **mismo PR** (`AGENTS.md:227`), con la línea de
      «qué tiene que hacer un consumidor» (normalmente: nada, hasta que adopte).
      Evidencia: la entrada bajo `[No publicado]`.
- [ ] 2.7 `openspec validate --all --strict` verde tras cualquier edición de
      `openspec/`, más la relectura de coherencia proposal/design/tasks/delta
      (`AGENTS.md:75-76`). Evidencia: comando y su exit code.

## 3. El debut pinado en un consumidor real

`AGENTS.md:242` es 🛑: no se publica un cambio del marco que no se probó contra
un consumidor real. Y `AGENTS.md:255-256` es 🛑 en la otra dirección: **este
trabajo no se hace desde una sesión de Projects** — el PR del consumidor se abre
desde el repo del consumidor.

- [ ] 3.1 En `un-proyecto-anterior`, reemplazar las **tres apariciones del tramo de
      dev** (`deploy.yml:121`, `:206`, `:324`) por `uses: .../one-off-ecs@<SHA>`,
      pinado al SHA de este change (`AGENTS.md:177-179`). Evidencia: el diff del
      PR del consumidor y el run de dispatch verde sobre su rama.
- [ ] 3.2 Recién con dev verde, la aparición de producción (`:480`). Es el orden
      que el invariante describe y la primera vez que el check tiene algo real que
      verificar. Evidencia: promoción completa con el check del invariante en
      verde y el `::notice::` que nombra el tramo de dev que la ejerció.
- [ ] 3.3 **Pendiente de OK humano, no lo cierra un agente**: el merge del PR del
      consumidor a su `main` dispara la promoción a **producción** — exige el OK
      explícito del Builder 1 en la sesión. Evidencia: el OK escrito, y después el run
      de promoción.
- [ ] 3.4 Revertir el pin a `@v1` en el mismo PR que lo introdujo
      (`AGENTS.md:177-179`), una vez que el tag se movió. Evidencia:
      `grep -n "one-off-ecs@" .github/workflows/deploy.yml` en el consumidor → solo
      `@v1`.

## 4. Cierre del change

- [ ] 4.1 **Pendiente de OK humano** (`AGENTS.md:233`): mover `v1` al release que
      publica `one-off-ecs`. MINOR — capacidad nueva compatible; el check del
      invariante es vacuo para quien no adoptó (ver `proposal.md`, Impact).
      Evidencia: el OK escrito, el tag inmutable y `v1` apuntando a él.
- [ ] 4.2 Extender el **Purpose** de `pipeline-entrega` en el mismo PR del
      archive: la capability suma la distribución de la mecánica de entrega y el
      invariante dev-antes-que-prod. Es el gotcha conocido del CLI —lo que el
      archive deja incompleto queda incompleto— y no se deja para después.
      Evidencia: el spec vivo con su Purpose al día y `validate --strict` verde.
- [ ] 4.3 Registrar en la revisión trimestral los dos contadores que este change
      crea y que **no fallan solos**: cuántas compuertas quedan sin extraer, y
      cuántas excepciones registradas hay (dos son un dato, tres son una premisa
      equivocada y se reabre el design). Evidencia: el issue de la revisión con
      los dos ítems.

## 5. El resto de la serie, y el ritmo honesto

Lo que sigue son **changes propios**, uno por compuerta, cada uno con su banco de
pruebas, su debut pinado en un consumidor real, su entrada de CHANGELOG y su
movimiento de `v1` con OK humano:

| Change | Compuerta | Origen en el consumidor |
| --- | --- | --- |
| 2 | `migraciones-gate` (one-off con usuario migrator vía IAM auth; el fallo deja el servicio intacto) | `deploy.yml:109-137` / `:468-496` |
| 3 | `build-push-ecr` (tag de SHA inmutable + fail-fast del rollback contra el registro) | `deploy.yml:79-96` / `:441-461` |
| 4 | `actualizar-servicio-express` | `deploy.yml:135-139` / `:497-500` |
| 5 | El esqueleto de topología al scaffold (~200 líneas) + el endurecimiento del verificador, **estrenado en modo aviso** (`AGENTS.md:143-145`) | `deploy.yml` completo |

**Y el ritmo, escrito sin adornos:** son 4-5 changes con debut pinado cada uno,
o sea **semanas de builder**. El estado intermedio —mitad extraído, mitad
copiado— es **peor que cualquiera de los dos extremos** si se abandona a medias:
el proyecto queda con dos fuentes para la misma mecánica, la corrección de un
incidente vuelve a tener que portarse a mano justo en la mitad que quedó copiada,
y el lector del deploy no sabe cuál de las dos manda. Por eso el orden de
extracción es compromiso del design y no una lista de deseos, y por eso el avance
se audita en la revisión trimestral (ítem «adopción de lo referenciado»), con el
aviso de la tarea 1.5 como la señal automática que más cerca queda de un check
sin romper repos ajenos.

**Lo que la serie NO incluye, para que no aparezca como sorpresa:** las sondas de
producción (`deploy.yml:505-626` — frescura del bundle `:560-565`, 401 exacto de
auth `:579-593`, vigilancia de logs `:608-611`) **no se extraen**: no tienen
gemelo de dev, así que una action `sonda` violaría el invariante que este change
crea. O se diseña un tramo `verificar-dev` —deseable por su propio mérito: hoy
nadie sonda la frescura del bundle de dev—, o esas sondas se quedan en el
proyecto con la razón escrita. Es un change propio, no un apéndice de este.
