---
artefacto: tasks
dri: Builder 1
aprueba: revision adversarial (desvio del marco: un solo mantenedor, ver AGENTS.md)  # el delta de gobierno-contribucion lo gatea
                              # además PO (PO) por CODEOWNERS
informado: PO / Builder 2
estado: en-ejecucion
---

El orden de los bloques es el que manda el design, y el criterio es el mismo que
ya funcionó en `marco-se-cumple-solo`: **primero el consumidor, después el
check**. Concretamente: se rescata al canónico lo que hoy solo vive en los
consumidores (0), se construye la maquinaria y se la prueba con fixtures dentro
del marco (1–5), los consumidores migran apuntando a la **rama** de este change
(6), y el check recién le llega a todo el mundo cuando el tag `v1` se mueve (7),
que es después de que esos dos PRs estén mergeados y verificados.

Las referencias a `plantilla/AGENTS.md` son al archivo vigente al abrir el change
(355 líneas), que la tarea 5.1 parte en dos.

> **Auditado el 2026-09-17 contra el árbol: de 2/41 a 38/41.** Este archivo marcaba
> 2/41 sobre un change casi terminado: lo que pedía llegó por los changes que vinieron
> después y ninguno volvió acá a tildarlo. Un `tasks.md` cuyas casillas no describen el
> árbol empuja a rehacer lo hecho, y un change así no se puede cerrar. Cada casilla se
> verificó una por una; la evidencia —ruta y línea, o comando y salida— está en la
> sección **«Auditoría del 2026-09-17»**, al final, en una fila por tarea. Es la misma
> auditoría que Rigel hizo sobre su copia de este change (su `ccb4c8a`, de 2/41 a
> 31/41, y `9f8fec7`, que reescribió el bloque 7).
>
> **Dos correcciones de premisa, dichas acá porque cambian cómo se lee todo lo de
> abajo.** (1) El bloque 6 **no aplica**: sus dos repositorios son del linaje anterior
> a la bifurcación y no consumen Projects (ver la nota del bloque). (2) El orden
> «primero migrar, después mover `v1`» se escribió cuando `v1` era el canal; desde el
> 2026-08-21 cada versión llega por PR de bump a la versión exacta, así que el bloque 7
> se reescribió con ese canal. Quedan abiertas **tres**: 5.3 (el artifact sale vacío;
> lo arregla otro change, en paralelo), 7.3 (medir a los tres consumidores reales) y 7.4
> (el archive, que espera la aprobación del PO sobre el delta corregido).

## 0. Rescate al canónico (BLOQUEANTE: antes de tocar un consumidor)

El design lo dice y es la única forma en que este change puede hacer daño neto:
**si la primera regeneración corre antes de subir lo que hoy solo vive en los
consumidores, el escritor lo borra.** Ningún bloque posterior arranca hasta que
este cierre.

- [x] 0.1 Subir al canónico lo que el consumidor viejo aprendió y la plantilla
      diluyó o perdió: `claude.yml` como **ejecutor** de la política de modelo
      del bot (`--model sonnet --effort medium --max-turns 5`), la cifra real del
      costo por MTok que `plantilla:145-146` dejó en «varias veces el costo», el
      orden de riesgo de los majors (devDeps → runtime → auth) con su issue de
      origen, «lección repetida **3 veces**» con el conteo que la vuelve creíble,
      y la procedencia del `Closes` con su fecha y quién lo cazó. Evidencia:
      diff del canónico y, por cada ítem, el archivo y la línea del consumidor de
      donde salió.
- [x] 0.2 Subir al canónico lo que hoy vive en `projects/AGENTS.md` y gobierna al
      consumidor sin que el consumidor lo cargue: el hueco conocido del guardrail
      de deltas (un `MODIFIED` cuyo título no existe en el spec vigente no avisa)
      y «los proyectos no editan el marco desde su repo», con sus dos únicos
      caminos. Evidencia: el texto en el canónico, y la nota de que en Projects esas
      líneas quedan como fuente y no se duplican.
- [x] 0.3 Incorporar al canónico las **tres reglas fijadas el 2026-08-18**:
      escalar de modelo exige OK humano previo, cambiar settings de un repo o de
      la organización exige OK humano previo, y la infraestructura base es primera
      opción —apartarse se pregunta ANTES—. La primera entra como **corrección**
      del texto vigente, no como agregado: hay que reemplazar «escala por sesión
      cuando la tarea lo paga» (`plantilla/AGENTS.md:139-141`), porque dejarla
      conviviendo con la nueva le da al agente dos reglas contradictorias.
      Evidencia: `grep` del texto viejo en el canónico → 0 ocurrencias.
- [x] 0.4 Subir al scaffold la exclusión del formateador para lo generado (la
      doctrina que un consumidor ya documenta en su `.prettierignore:17-24`),
      incluida la ruta del artefacto nuevo. Evidencia: el archivo del scaffold
      con la entrada, y el check de formato del consumidor en verde sobre un
      artefacto recién renderizado.
- [x] 0.5 `.gitattributes` con `* text=auto eol=lf` en el marco **y** en el
      scaffold — sin él, un proyecto nuevo en Windows compara CRLF contra LF y
      sale rojo por un motivo que no es el suyo. **Ya cubierto** por el commit
      `6fab1cb` de esta misma rama; el design lo pedía porque cuando se escribió
      `plantilla/` no lo tenía. Evidencia: `ls plantilla/.gitattributes` → existe.
- [x] 0.6 Fijar el **presupuesto de líneas** del canónico y su check en el CI de
      Projects. El artefacto no ahorra contexto —lo organiza—, así que agregar una
      regla tiene que costarle algo a quien la agrega. Evidencia: corrida en rojo
      excediendo el presupuesto a propósito.

## 1. El banco de pruebas primero (Projects no puede comerse esta medicina)

D7 es explícito: `projects/AGENTS.md` es la constitución del marco, no la de un
proyecto, así que este repo **no** puede dogfoodear el check. Las dos
contramedidas son obligatorias y esta es la primera.

- [x] 1.1 Fixtures dentro de la action, corriendo en el CI de Projects, uno por
      escenario del delta: artefacto ausente; artefacto atrasado antes de la
      fecha de exigibilidad (amarillo) y después (rojo); artefacto editado a
      mano; artefacto presente y **no cargado** por una superficie declarada;
      artefacto referenciado solo **dentro de un bloque de código** (que no se
      resuelve y por eso no cuenta); desvío válido; desvío huérfano; y diferencia
      que viene solo del formateador o del fin de línea. Evidencia: los ocho
      casos en el log del job, cada uno con el veredicto esperado.
- [x] 1.2 Rastrear `.claude/` en Projects: mientras no esté rastreado, el check
      vecino de artefactos regenerados sale **mudo** en el repo que lo publica.
      **Ya cubierto** por `d8e9aca`. Evidencia: `git ls-files .claude` → 6
      archivos (4 skills, el subagente, el script de una skill).

## 2. La fuente única y el render

- [x] 2.1 El canónico en `actions/constitucion/canonico/`, viajando **dentro** de
      la composite action por `${GITHUB_ACTION_PATH}` — el mismo transporte que
      `guardrail-deltas`, y por el mismo motivo: el token de un consumidor no lee
      otro repositorio. Evidencia: la action corriendo en un consumidor sin
      credencial extra.
- [x] 2.2 Cada regla del canónico con su **id estable** en comentario HTML, y el
      formato de versión con `publicada`, `exigible_desde` y la marca `urgente`.
      Evidencia: `grep` de ids duplicados → vacío; el schema rechazando una
      versión sin fechas.
- [x] 2.3 El render literal de `{{PLACEHOLDER}}` contra `.projects-valores.json`, y
      la cabecera de una línea en comentario HTML con versión y hash. Obligatorio,
      no cosmético: sin render el artefacto lleva dobles llaves y pone rojo el
      check de marcadores del propio consumidor. Evidencia: artefacto renderizado
      sin una sola doble llave (`grep -cE "\{\{[A-Z0-9_]+\}\}"` → 0).
      **Corregido otra vez el 2026-08-20 y por medición**: los marcadores se medían
      sobre el texto ya sustituido y ANTES de insertar los desvíos, con el argumento
      de que el motivo de un desvío es prosa del proyecto. El argumento era cierto y
      la conclusión estaba al revés: un motivo que dice «lo aprobó {{PO}} para
      {{PROYECTO}}» viajaba al artefacto tal cual y el modo escribir lo emitía en
      verde (`exit 0`, dos marcadores en el archivo), mientras el rojo lo cobraba el
      check vecino del propio consumidor sobre un archivo generado que el marco
      escribió y que nadie de ese repo puede arreglar sin tocar el JSON de desvíos.
      Ahora la medición es sobre el CUERPO FINAL y el hallazgo propio
      `desvio-con-marcadores` manda a arreglar `.projects-desvios.json` en vez de a
      buscar un valor que no falta. Evidencia: `exit 0` con 2 marcadores antes,
      `exit 1` sin emitir nada después, sobre el mismo fixture.
- [x] 2.4 Las entradas del render **fuera** del directorio regenerado
      (`.projects-valores.json` y `.projects-desvios.json` en la raíz), para que
      `rm -rf .projects && render` no borre un desvío del proyecto dejando todo
      autoconsistente y en verde. Evidencia: ese comando corrido en un fixture, y
      el desvío sobreviviendo.
- [x] 2.5 Un emisor por **superficie declarada**, con el mismo cuerpo y la misma
      cabecera: el artefacto que la cadena de imports carga y el de la superficie
      que lee markdown plano sin expandir imports. Si en la implementación el
      segundo emisor se recorta, **hay que decirlo en voz alta en el CHANGELOG**
      (D2), porque hoy esa superficie lee todo el `AGENTS.md` y quedaría con
      menos que antes. Evidencia: las dos salidas comparadas por contenido en CI.
- [x] 2.6 El desvío impreso **pegado a la regla que anula** dentro del artefacto,
      con su motivo, y el motivo reimpreso como aviso en el resumen de cada
      corrida. Evidencia: artefacto de fixture donde el desvío aparece
      inmediatamente después de la regla, no al final.

## 3. El check, con su ventana de gracia

- [x] 3.1 El check corre como **job del `ci.yml` del consumidor**, invocando
      `actions/constitucion@v1` en modo verificar y colgado de `ci-ok`: artefacto
      ausente, atrasado, divergente del re-render de la versión que declara, o no
      cargado por una superficie declarada. **La ausencia es roja, nunca `exit 0`
      mudo** (D7): amarillo hasta la fecha de exigibilidad, rojo después.
      Evidencia: los fixtures de 1.1 en verde y los cuatro modos de falla en rojo.
      **Corregido el 2026-08-20 y por medición**: esto se había implementado como
      un paso inline del workflow reusable, y ese paso salía `exit 0` MUDO contra
      el único esquema de `superficies` que el scaffold emite —cero `::error::`,
      cero `::warning::`, también con la versión ya exigible— mientras rechazaba
      los artefactos que la propia action acababa de generar, porque exigía un
      sello de 64 hex del cuerpo y la action emite 12 hex del canónico. Solo la
      action compara contra el RE-RENDER, que es estrictamente más fuerte que
      comparar contra el sello: recomputar un sello es un `git commit` y cambiar el
      canónico no. El paso se borró; el reemplazo es el job, y que el consumidor lo
      cablee lo comprueba estáticamente el paso «Constitucion del marco cableada»
      (3.6).
- [x] 3.6 El marco comprueba que el consumidor CABLEE la verificación, porque una
      action que nadie invoca no verifica nada y ese fue el estado real hasta el
      2026-08-20 (su única invocación era el workflow de actualización, en modo
      escribir, que declara no verificar nada y delegaba en el paso inline
      apagado: circularidad completa). Asimétrico y sin calendario propio —el
      calendario vive en el manifiesto, que viaja con la action y no con el
      workflow—: repo que no versiona `.projects-valores.json`, **aviso** (todavía no
      adoptó); repo que sí lo versiona y no cablea, **rojo** (tiene la maquinaria y
      se saltea el check, y se arregla en el mismo PR que adopta). Evidencia: las
      dos ramas medidas por código de salida.
      **Corregido otra vez el 2026-08-20 y por medición**: el reemplazo se había
      implementado como un `grep -rE 'uses:.*actions/constitucion'`, o sea que
      exigía que la LÍNEA existiera en cualquier archivo bajo
      `.github/workflows`. Cinco configuraciones medidas donde nada verifica y el
      paso sale `exit 0` —cuatro de ellas MUDAS—: el `ci.yml` viejo más el
      `actualizar-marco.yml` que el propio marco reparte (modo escribir, y su
      encabezado dice que no verifica); un job con `if: false`; la única
      invocación en un `on: workflow_dispatch`; el archivo en un subdirectorio de
      `.github/workflows`, que GitHub Actions no ejecuta pero `grep -r` recorre; y
      la perilla, un `plantilla/.github/workflows/ci.yml` vacío y SIN RASTREAR que
      apagaba el check entero porque el skip se decidía con `test -f`. Ahora el
      check PARSEA el YAML (`actions/constitucion/cableado.mjs`, modo `cableado`)
      y un cableado cuenta sólo si está en el primer nivel del directorio, corre
      en `pull_request` o en `push` a la rama por defecto, invoca en modo
      verificar, no está apagado por un `if` constante falso ni tapado con
      `continue-on-error`, y cuelga de `ci-ok` por `needs`. El skip del
      distribuidor pasó a ser una propiedad POSITIVA con tres candados
      (rastreado + no adoptado + el scaffold cablea de verdad). Evidencia: los
      cinco casos con su fixture en `pruebas/cableado.test.mjs`, los cinco
      corridos contra el paso anterior dando `exit 0`, y las doce mutaciones del
      código nuevo matando a su prueba.
      **Y corregido una TERCERA vez el 2026-08-20, que es el dato importante de
      esta tarea**: las cinco condiciones cerraron los casos NOMBRADOS y se
      declaró la clase cerrada; el refutador encontró la misma clase una
      ortografía más adentro y midió VEINTE configuraciones más, todas `exit 0` y
      todas mudas. Los cuatro huecos, con su arreglo derivado de la referencia de
      GitHub Actions y no de los fixtures:
      (a) **los filtros de disparo no se miraban**. La condición era «la clave
      `pull_request` aparece en `on:`», así que pasaban `paths-ignore: ['**']`,
      `paths-ignore` con los archivos que el check protege, `paths: [docs/**]`,
      `branches: [gh-pages]`, `branches-ignore: [main]`, `types: [closed]` y
      `types: [opened]` — y era una asimetría del propio código, que de `push` sí
      comparaba `branches`. Ahora se evalúan TODAS las claves de filtro que la
      referencia permite por evento, con un matcher escrito desde la hoja de
      patrones (donde `?` y `+` son cuantificadores del carácter anterior, no
      comodines) y con la regla de orden de los `!`. Cualquier filtro de `paths`
      descalifica, por dos razones: el artefacto vence por FECHA —así que el PR
      que no lo toca es justo donde el rojo tiene que salir— y un workflow
      filtrado no reporta el check requerido en los PRs que saltea, que es el
      error que ya costó una semana de ruleset.
      (b) **`continue-on-error` se comparaba con identidad estricta contra
      `true`**, así que `${{ true }}` y `"true"` tapaban el rojo en silencio. La
      pregunta se invirtió: tapa todo lo que no se pueda demostrar FALSO. La
      cadena `"false"` tapa, porque la referencia de expresiones dice que toda
      cadena no vacía se castea a `true`.
      (c) **la quinta condición medía la ARISTA del `needs`, no que el rojo
      bloquee**, y ésta es la refutación profunda: la propiedad estaba mal
      elegida. La doc de checks requeridos dice que un job salteado por un
      condicional «reports Success» y «may not block merging», así que un `ci-ok`
      con `needs` y sin `if: always()` sale VERDE con la compuerta en rojo; y con
      `always()` sale verde igual si su `run:` no consulta `needs.<job>.result`.
      Ahora se exigen las dos mitades, más que ningún job del `needs` de la
      compuerta esté apagado (un job que cuelga de otro que nunca corre se saltea
      siempre, y un salteado reporta Success).
      (d) **la perilla del rastreo seguía enchufada un archivo más allá**:
      `leerWorkflows` y `revisarScaffold` leían el directorio con `readdirSync`,
      así que un `zz.yml` sin `git add` movía el veredicto de `exit 1` a `exit 0`
      y el notice encima mentía nombrando `ci.yml`. Ahora el universo es
      `git ls-files`, lo que no se pudo determinar NO cuenta, y el mensaje nombra
      el archivo que cablea de verdad.
      (e) **la condición 5 verificaba un NODO cuando la propiedad es de un
      CAMINO** (ronda 4). Lo prometido —«un rojo de este job impide que el
      veredicto agregado salga verde»— va del job de la compuerta, por cada
      eslabón intermedio de `needs`, hasta el check run cuyo NOMBRE exige el
      ruleset, y cada nodo del camino tiene el mismo juego de neutralizadores,
      enumerado de la referencia de `jobs.<id>` y no de fixtures. Se cerraron 16
      mutaciones que el banco de la ronda 3 dejaba pasar en VERDE: las seis
      ortografías de `continue-on-error` sobre el veredicto, el paso del
      veredicto amortiguado o apagado, la referencia que vive en un `name`, en un
      `env` que nadie lee o en una línea comentada del `run`, leer `.outputs` en
      vez de `.result`, el eslabón intermedio con `always()` +
      `continue-on-error` que LAVA el rojo en el medio, el check run con otro
      nombre o sufijado por `strategy.matrix`, y un `push` a `main` como único
      disparo (corre DESPUÉS del merge, así que mientras el PR está abierto no hay
      ningún check run que el ruleset pueda exigir).
      **RESIDUO DECLARADO**, no cerrado, y ahora ubicado donde de verdad está: la
      ronda 3 lo escribió más grande de lo que es —«el check lee que el veredicto
      CONSULTA el resultado, no lo que su `run:` hace con el valor»—, y bajo esa
      frase entraban seis cosas que sí eran decidibles y quedaron cerradas. Lo
      irreducible es sólo lo que el shell hace con el valor que YA LEYÓ: que la
      lectura exista, que sea de `.result`, que ocurra en un paso vivo y no
      amortiguado, y que cada eslabón del camino transporte el rojo, SÍ se
      verifican. Lo que no se verifica es la comparación: un
      `[ "…result" = "banana" ]` lee el valor, nunca coincide y pasa. Cerrarlo
      exige decidir el comportamiento de un shell arbitrario. La salida
      estructural es que el veredicto lo emita una action del marco en vez del
      `run:` de cada consumidor, y eso es un change propio y no un parche de este
      archivo. Evidencia: `pruebas/refutaciones-ronda-4.test.mjs`, 42 pruebas, 28
      en rojo contra el código de la ronda 3 (las 8 que pasan son los controles
      positivos y 6 son white-box sobre helpers que entonces no existían), más 14
      mutaciones del código nuevo matando cada una a su prueba.
- [x] 3.8 La compuerta se EJERCITA como compuerta, y no sólo parsea. El paso
      del carril independiente se había escrito como
      `uses: im-diego-ec/Projects/actions/constitucion@v1`, y esa action no
      existe todavía en el tag móvil ni en `main` (verificado con `git ls-tree`):
      GitHub resuelve y DESCARGA las actions de un job en «Set up job», antes de
      correr un solo paso y sin mirar el `if` de ningún paso, así que el job de
      higiene del propio Projects moría antes de evaluar nada y toda la evidencia de
      la compuerta era local. Como `uses:` no admite expresiones y una ruta local
      dentro de un workflow reusable se resuelve contra el repo de QUIEN LLAMA, un
      mismo paso no puede servir a los dos: la compuerta quedó partida en dos
      caminos totales —el consumidor la hereda por `marco-ci.yml` con la ref
      publicada, y el marco la corre en su propio `ci.yml` por
      `./actions/constitucion`— y el veredicto `marco-ok` COBRA el salteo: un
      `skipped` sólo es válido en el repo que distribuye el marco. Evidencia: el
      `git ls-tree` de la ref, la corrida del comando exacto del paso sobre el
      árbol del marco (`exit 0`, con el notice del skip del distribuidor), y dos
      pruebas que resuelven toda referencia propia contra la base de objetos de
      git.
- [x] 3.7 El sello NO es evadible subiéndole la versión a mano. Medido el
      2026-08-20: `version=1.3.0` -> `version=9.9.9` sobre un cuerpo amputado daba
      `exit 0` con avisos de `artefacto-adelantado`, porque el cuerpo no se
      comparaba contra nada. Con esta action como único verificador del contenido
      ése era el último bypass. Dos discriminadores independientes, cada uno
      suficiente: el `sha` cubre `version + secciones`, así que una cabecera que
      declara una versión más nueva y trae el sha que esta copia calcula para la
      suya se contradice sola; y si ninguna invocación del repo pudo haber escrito
      el artefacto, tampoco hay explicación inocente. Se lee el árbol y NO
      `GITHUB_ACTION_REF`: esa variable no está en la referencia de variables de
      GitHub, verificado el 2026-08-20, y una garantía no se apoya en algo
      indocumentado.
      **El segundo discriminador estaba mal medido, corregido el 2026-08-20 en la
      ronda 3**: preguntaba «¿la ref es el tag móvil?», o sea una lista de UNA
      ortografía, y el refutador la evadió con doce caracteres — con `@main`
      `exit 0`, con `@refs/heads/main` `exit 0`, con `@v1.3.0` `exit 0`, con un pin
      a SHA de 40 hex `exit 0` y SIN NINGUNA invocación `exit 0` (la ausencia de
      pin se tomaba como pin). Sólo `@v1` exacto daba rojo, y `@main` corre la copia
      más nueva igual que `v1`, así que la explicación inocente era falsa; encima el
      marco RECOMIENDA pinar por SHA, o sea que el bypass lo premiaban otras
      reglas. La pregunta correcta no es qué ortografía tiene la ref, es si en el
      repo pueden correr DOS copias del marco: el artefacto lo escribe el modo
      escribir de esta misma action, invocado por un workflow del propio repo, así
      que si todas las invocaciones usan la MISMA ref el escritor corre el mismo
      código que el verificador y no pudo emitir una versión más nueva. La causa
      benigna es que el escritor y el verificador estén pinados DISTINTO, y eso se
      ve en el árbol sin enumerar nada. Evidencia: los cinco `exit 0` de antes
      contra los cinco `error` de después con el mismo cuerpo amputado, y la rama de
      dos refs distintas quedando en aviso.
- [x] 3.2 Comparación con fin de línea normalizado y fuera del alcance del
      formateador. Evidencia: el mismo artefacto en CRLF y en LF dando el mismo
      veredicto.
- [x] 3.3 Desvío huérfano en rojo, con el motivo que tenía escrito en el mensaje
      de fallo. Evidencia: fixture con una regla eliminada del canónico.
- [x] 3.4 Check en el CI de **Projects** (no del consumidor) sobre el manifiesto
      del canónico: una versión cuya exigibilidad no tiene sentido es roja.
      **Reescrita el 2026-09-17.** Pedía rojo para un `exigible_desde`
      «demasiado cerca» de `publicada`, o sea el piso de 28 días que convertía
      «se estrena en modo aviso» en campo obligatorio. Ese piso se retiró en la
      1.6.0 (2026-08-22, change `ventana-vencida`) porque su premisa era el tag
      móvil: con el pin exacto el aviso previo ES el PR de bump, y el piso solo
      dejaba a un repo atrasado y verde durante cuatro semanas. Lo que queda con
      sentido, y es lo que el check exige hoy: una exigibilidad **anterior** a la
      publicación es roja, igual que un manifiesto sin versiones, desordenado o
      por encima de su presupuesto de líneas. Evidencia: fila 3.4 de la
      auditoría.
- [x] 3.5 Auditoría **acción por acción** de los permisos del token del paso
      nuevo antes del estreno — lección repetida tres veces, y acá el paso corre
      en el pipeline de todos los consumidores. Evidencia: la tabla
      acción → permiso exigido, y el `permissions:` declarado al mínimo.

## 4. Permisos del agente, asimétricos (D5)

- [x] 4.1 Paso nuevo: una entrada del allowlist que autorice una operación
      **mutante** (aplicar infraestructura, empujar, mergear, escribir en la
      nube, cualquier invocación con el perfil de producción) es **roja** salvo
      que esté declarada como desvío con motivo. La propiedad se enuncia sobre el
      **verbo**, no sobre una lista de comandos prohibidos que alguien tendría que
      mantener. Evidencia: fixture con una entrada mutante en rojo, y la misma
      con desvío declarado en verde.
- [x] 4.2 Piso recomendado de permisos: si falta una entrada, **aviso**, nunca
      rojo, y el marco **no la escribe**. Un permiso de más es riesgo; uno de
      menos es fricción, y la salida más barata bajo fricción es el archivo local
      que el repositorio ignora. Evidencia: fixture con el piso incompleto
      saliendo amarillo.
      **Lo declara y lo mide UNA sola pieza**: el manifiesto del canónico declara
      cada ítem con la `entrada` que recomienda y la propiedad que `cubre`, y lo
      mide `actions/constitucion`, que es quien lo transporta. Corregido el
      2026-08-20 y por medición: se había implementado declarándolo en el
      manifiesto y verificándolo con una lista literal en el paso del workflow, y
      las dos copias ya habían divergido en las DOS direcciones (el manifiesto
      declaraba `Bash(pnpm build)` que el paso no miraba; el paso exigía `openspec`
      que el manifiesto no declaraba), con el agravante de que mutar el manifiesto
      no movía el veredicto del paso: seguía midiendo su propio arreglo. En una
      doble contabilidad la declaración siempre pierde contra el check.
      **Y el piso se medía con palabras, corregido en dos pasos**: primero se
      cerró el relleno de cadenas sueltas (`["lint", "test", ...]` se declaraba
      100% cubierto porque la medición era una búsqueda en el archivo
      concatenado), y se dejó declarado como límite que `Bash(echo lint)` contara
      igual. La ronda 3 midió la consecuencia de ese límite: seis entradas
      `Bash(echo <palabra>)` daban CERO avisos, o sea el piso entero satisfecho
      por entradas que no corren ninguna verificación. Un límite declarado no deja
      de ser un agujero. Ahora la entrada tiene que ejecutar el mismo PROGRAMA que
      el ítem recomienda, y ese programa se DERIVA de la `entrada` del manifiesto
      —no hay lista de programas escrita en el código, ni una blocklist de `echo`,
      `true` y `printf` que envejecería—: `Bash(pnpm --filter api lint)` cubre
      `lint` y `Bash(echo lint)` no cubre nada. Evidencia: 6 de 6 ítems sin cubrir
      con el relleno ejecutable donde antes eran 0 de 6, el allowlist real del
      scaffold seguido en verde, y la mutación que saca la comparación de programa
      matando a su prueba.
      **Corregido otra vez el 2026-08-20 y por medición**: la propiedad se buscaba
      sobre el allowlist ENTERO concatenado, así que un allowlist de puro relleno
      —seis cadenas que no son entrada de permiso de nada:
      `["lint", "format", "typecheck", "test", "build", "openspec"]`— se declaraba
      100% cubierto, `exit 0` y cero avisos. La medición no decía «el agente puede
      correr el linter sin pedir permiso», decía «en algún lugar del archivo
      aparece la palabra lint». Ahora se busca dentro de UNA entrada y exigiendo la
      misma herramienta que el ítem recomienda; el límite queda declarado: esto lee
      la FORMA de la entrada, así que un `Bash(echo lint)` cuenta. Evidencia: el
      mismo allowlist de relleno, 0 de 6 sin cubrir antes y 6 de 6 después.
- [x] 4.5 El recorte del comodín del allowlist (`cmd sub:*` -> `cmd sub *`) tiene
      prueba. El allowlist admite las dos formas y las dos significan «y lo que
      siga», y sólo se normaliza el separador FINAL para no tocar los dos puntos de
      una URL o de una ruta. No había ninguna prueba: borrándolo el banco quedaba
      entero en verde mientras se creaba un FALSO ROJO sobre
      `Bash(terraform validate:*)` —la entrada que el propio scaffold reparte—,
      denunciada como si dejara el subcomando en comodín, o sea como si autorizara
      `terraform apply`. El programa de ese paso va inline en el YAML (un heredoc no
      puede cerrar dentro de un bloque indentado), así que la prueba lo EXTRAE del
      workflow y lo corre: es la única forma de que ese código, que llega a todos
      los consumidores por `@v1`, pase por un caso controlado. Evidencia: las dos
      formas dando `exit 0` sobre un subcomando de lectura y `exit 1` sobre el
      comodín de subcomando, y la mutación que borra el recorte matando la prueba.
- [x] 4.3 Repositorio que no versiona el allowlist de su agente: **aviso
      ruidoso**, nunca verde mudo. Era el caso real del repositorio en adopción del
      linaje anterior, que no tenía `.claude/` en absoluto.
      Evidencia: fixture sin allowlist rastreado.
- [x] 4.4 **No** duplicar el check de ejecutores pinados dentro de este paso: ya
      existe y mira los archivos rastreados no-`.md`. En una doble contabilidad la
      declaración siempre pierde contra el check. Evidencia: la nota en el código
      del paso apuntando al check vecino.

## 5. El escritor del lado del consumidor y el scaffold

- [x] 5.1 Partir `plantilla/AGENTS.md` en «lo del marco» (que pasa al canónico) y
      «lo del proyecto» (lo que el scaffold sigue entregando), con la línea de
      import y la regla de precedencia escrita en prosa: ante conflicto manda el
      bloque del marco, y el único override válido es un desvío declarado.
      Evidencia: la suma de las dos partes contra el archivo de hoy, sin reglas
      perdidas (el diff se revisa regla por regla, que es exactamente lo que la
      copia del repositorio en adopción no tuvo).
- [x] 5.2 `plantilla/.github/workflows/actualizar-marco.yml`: `schedule` semanal
      más `workflow_dispatch`, permisos mínimos de escritura de contenido y de
      pull requests, que corre la action en modo escribir y **abre un PR**. Jamás
      commitea a la rama de integración. Evidencia: la corrida abriendo un PR en
      un repo de prueba, y el workflow validado como código por el check que ya
      existe.
- [ ] 5.3 Modo verificar que sube el artefacto corregido como artifact de la
      corrida, para el consumidor que todavía no tiene el escritor (el escritor
      es scaffold; el check llega por el carril referenciado, y esa asimetría es
      del diseño). Evidencia: el artifact descargable en una corrida de fixture.
      **ABIERTA, y no por falta de código: el artifact sale VACÍO.** La mitad de
      la action está (`actions/constitucion/constitucion.mjs:1580-1593` deja el
      artefacto al día en `$RUNNER_TEMP/.projects-al-dia` en cada corrida) y el
      paso que lo sube también (`plantilla/.github/workflows/ci.yml:122-127`),
      pero `upload-artifact` excluye los archivos ocultos por defecto desde su
      v4.4 y **las tres rutas empiezan con punto** —`.projects-al-dia/`, y adentro
      `.projects/` y `.cursor/`—, mientras el paso no declara
      `include-hidden-files` (`grep -c include-hidden-files
      plantilla/.github/workflows/ci.yml` → `0`) y su `if-no-files-found: warn`
      convierte el vacío en un aviso que nadie lee. Es el defecto que Rigel midió
      el 2026-08-28 en su consumidor de referencia y cerró en `06a9c94`. Lo porta
      el change `el-marco-deja-de-afirmar-lo-que-no-hace`, que se trabaja en
      paralelo con este; la tarea se tilda cuando eso esté integrado, con el caso
      verde que demuestre que el directorio no queda vacío.
- [x] 5.4 Entrada del `CHANGELOG.md` en **este mismo PR**, con la sección «Para
      consumidores» diciendo los cinco pasos obligatorios, la fecha de
      exigibilidad de esta versión y qué pasa si no se hace nada. Evidencia: la
      entrada escrita, y el veredicto agregado de CI en verde.

## 6. Migración de los dos consumidores — NO APLICA a Projects (declarado el 2026-09-17)

> **Por qué este bloque no aplica, y por qué eso no es lo mismo que «hecho».** Las
> cinco tareas se escribieron el 2026-08-19, cinco días antes de la bifurcación, para
> dos repositorios de ese linaje: «el consumidor viejo» y el que en ese momento
> adoptaba el marco. **Ninguno es consumidor de Projects.** El segundo figuraba con un
> nombre de esta cuenta que era un renombrado mecánico, no un repositorio real, y el
> documento con su diff de migración (`migracion-intranet.md`) se retiró del change
> por eso: describía archivos de un repositorio ajeno, y dejarlo acá presentaba como
> consumidor de Projects a un repositorio que no lo es. Ejecutarlas desde acá sería,
> además, 🛑: escribir en el repositorio de otro.
>
> Lo que el bloque protegía sí tiene dueño en Projects, y no es una migración. Los tres
> consumidores reales (todos en `@v1.9.6`) nacieron con el mecanismo ya publicado: el
> arranque les genera el artefacto (`herramientas/projects-init.mjs:3836-3839`), así
> que no hay texto copiado a mano que rescatar. Que estén al día y en verde es la
> tarea **7.3**, que queda abierta.
>
> Las casillas van tildadas porque la decisión está tomada y escrita, no porque el
> trabajo se haya hecho: cada una dice **no aplica** en sus primeras palabras, y lo que
> la tarea quería proteger está nombrado al lado con dónde vive hoy.

- [x] 6.1 **No aplica.** Migrar al consumidor viejo del linaje anterior (valores,
      render, `AGENTS.md` reducido a lo propio, `.prettierignore`). No consume
      Projects. Lo que la tarea quería devolverle —«cola, **nunca cancelación**»,
      el nombre del check requerido `ci-ok`, el porqué de los invariantes de
      propiedades y la regla de ejecutores pinados— está en el canónico que recibe
      todo consumidor de Projects, y lo fija
      `actions/constitucion/pruebas/constitucion.test.mjs:826`.
- [x] 6.2 **No aplica.** Alinear el allowlist del agente de ese mismo repositorio
      con el piso y con los ejecutores pinados. En un consumidor de Projects eso lo
      miran solos el paso «Ejecutores de paquetes pinados»
      (`.github/workflows/marco-ci.yml:1956`) y el piso recomendado que mide
      `actions/constitucion`, los dos por el workflow reusable que el consumidor ya
      llama.
- [x] 6.3 **No aplica.** Migrar al repositorio en adopción del linaje anterior
      dentro de su PR de adopción. No consume Projects, y su diff de migración se
      retiró del change.
- [x] 6.4 **No aplica.** Arreglar la regla invertida de ese repositorio sobre la
      instancia de identidad de dev. La regla correcta, con `APP_ENV=prod` como
      guard estructural, está en el canónico
      (`actions/constitucion/canonico/40-fronteras.md:106`, id
      `dev-no-contacta-usuarios`), y el desvío declarado es el mecanismo que un
      consumidor de Projects usaría para apartarse de ella: impreso pegado a la
      regla, medido en la fila 2.6 de la auditoría. Lo que la tarea arreglaba era
      un archivo de otro repositorio.
- [x] 6.5 **No aplica.** Decidir si ese repositorio versiona el allowlist de su
      agente. En un consumidor de Projects, no versionarlo sale `::warning::` y
      nunca verde mudo: tarea 4.3.

## 7. Estreno y cierre

> **Reescrito el 2026-09-17, según el canal que rige.** El bloque original daba por
> hecho que el estreno era **mover el tag `v1`** y que había que amortiguarlo con una
> ventana de gracia. Las dos premisas caducaron antes de esta auditoría: `v1` dejó de
> ser el canal el 2026-08-21 —cada consumidor pina la versión exacta y recibe cada
> versión nueva como PR de bump de Dependabot, donde el rojo se lee antes de mergear—
> y la ventana se retiró en la 1.6.0 (2026-08-22). Una tarea con la premisa caduca es
> peor que una abierta: manda a hacer algo que el repositorio ya no admite. Cada tarea
> dice qué cambió. Y hay un hecho que ordena todo el bloque: **el mecanismo ya se
> estrenó** (1.3.0, 2026-08-21) y los tres consumidores reales lo corren en `@v1.9.6`,
> así que archivar este change no publica nada: actualiza un spec canónico de este
> repositorio y no viaja.

- [x] 7.1 Publicar en **MINOR**. Lo que vuelve seguro el estreno **no es una
      ventana de gracia**: es que el rojo de una versión nueva aparezca dentro del
      PR de bump, que es donde alguien lo lee antes de mergear, y que la población
      esté cubierta antes de publicar.
      **Por qué cambió.** Pedía «la ventana de gracia activa: amarillo para los dos
      consumidores desde el día uno». La ventana se retiró en la 1.6.0 porque su
      premisa era el tag móvil. El campo `exigible_desde` sobrevive en el formato
      como opt-in de quien publica, y **todas** las versiones del canónico lo fijan
      igual a `publicada`. Evidencia: fila 7.1 de la auditoría.
- [x] 7.2 **Mover `v1` no es el estreno de este change, y no es tarea suya.**
      **Por qué cambió.** Pedía mover `v1` recién cuando los dos PRs de migración
      estuvieran mergeados. Con el canal por versión exacta, mover `v1` no le
      entrega nada a ningún consumidor: el andamio pina la versión exacta en los
      tres lugares donde invoca al marco, y un pin a `@v1` en un consumidor es
      justamente lo que el marco prohíbe, porque no recibe PR de bump. `v1` sigue
      existiendo por **una** línea interna del marco, la de
      `actions/guardrail-deltas` (`AGENTS.md`, «Versionado»), que el release mueve
      en su paso 5 con OK humano (frontera ⚠️) — y eso es del release, no de este
      change. Lo que sí sigue en pie del texto original es la 🛑 de no publicar
      sin probar contra un consumidor real; rige al próximo release, y este change
      no publica nada. Evidencia: fila 7.2 de la auditoría.
- [ ] 7.3 Confirmar que **ningún consumidor real** está rojo por la constitución.
      Evidencia: el veredicto agregado en verde en la rama por defecto de cada uno
      de los tres consumidores de Projects en `@v1.9.6`, con el job `constitucion`
      en `success`, leído por código de salida y sin escribir nada en esos repos
      (`gh run list --repo <consumidor> --branch main --workflow ci.yml
      --limit 1 --json conclusion`).
      **Por qué cambió.** Decía «los dos repos», que eran los del linaje anterior
      (bloque 6). La población de Projects es otra: tres repositorios, y el
      registro de consumidores todavía no los nombra (tarea 7.3 del change
      `el-marco-declara-su-desvio-de-review`).
      **ABIERTA**: esta auditoría no lee repositorios consumidores; se mide en la
      pasada de cierre, antes del archive.
- [ ] 7.4 Archivar el change, y en **ese mismo PR** ampliar el `## Purpose` de
      `gobierno-contribucion`: hoy enumera plantilla de PR, CODEOWNERS y
      protección de la rama, y no menciona la distribución de la constitución.
      Evidencia: `openspec validate --all --strict` en verde y el guardrail de
      deltas en verde, los dos por código de salida.
      **La premisa sigue siendo cierta en Projects** (en Rigel no lo era: allá otro
      change ya había escrito ese `Purpose`): verificado el 2026-09-17,
      `openspec/specs/gobierno-contribucion/spec.md:5-10` no nombra la
      constitución. **ABIERTA**, y espera tres cosas en este orden: la aprobación
      del PO sobre el delta —que se **corrigió** en esta auditoría, porque
      prometía un aviso durante una ventana y un PR con el artefacto regenerado,
      y el árbol no hace ninguna de las dos—, la revisión adversarial registrada
      en `revision-adversarial.md`, y la tarea 5.3.
- [x] 7.5 Anotar en las reglas no escritas qué filas cierra esto y cuáles quedan
      abiertas —declaradas como deuda, no como olvido—: que el `AGENTS.md` del
      proyecto contradiga al artefacto no lo caza ningún check (la mitigación es
      de migración: borrar el duplicado); un consumidor que saca el `uses:` o lo
      pina a un SHA deja de recibir reglas y desde Projects eso no se ve; la
      dirección inversa —la mejora que un proyecto descubre y debería subir al
      marco— sigue dependiendo de la revisión trimestral; y nada limita cuántos
      desvíos declara un proyecto. Evidencia: fila 7.5 de la auditoría.

## Fuera de alcance, declarado

No son tareas de este change; se anotan para que no se lean como olvido.

- **El design no clasifica la distribución de las skills del marco ni del
  subagente** (`.claude/skills/`, `.claude/agents/` de Projects), que hoy ve solo
  este repo. Si esta tanda los mete en `plantilla/` —el árbol de trabajo ya tiene
  `plantilla/.claude/skills/` y `plantilla/.claude/agents/` sin rastrear—, la
  clasificación y su justificación tienen que entrar al `design.md` antes del
  merge: `AGENTS.md` la exige por pieza tocada, y la 🛑 de vendorar lo que una
  herramienta regenera obliga a distinguir las skills escritas a mano del marco
  de las que genera el CLI. Este mecanismo no decide eso por analogía.
  *Estado al 2026-09-17:* ya entraron — `git ls-files plantilla/.claude` lista
  `agents/cazador-fail-open.md`, `settings.json` y la skill
  `projects-archive-change` — y ningún design de un change activo ni archivado
  las clasifica. Sigue fuera del alcance de este change; queda anotado como
  pendiente de la pasada de cierre del porte, no resuelto por omisión.
- El límite de fondo: el marco garantiza que el **texto** llegue, no que el
  agente lo **obedezca**. No hay tarea que cierre eso.

---

## Auditoría del 2026-09-17 — de dónde sale cada casilla

Este change marcaba **2/41** y, auditado tarea por tarea contra el árbol, marca
**38/41**. Las marcas nuevas **no son trabajo de este PR**: son el reconocimiento de
trabajo que ya estaba en el árbol —llegó por los changes que vinieron después
(`marco-se-cumple-solo`, `ventana-vencida`, `rojo-primero` y las rondas de refutación
de la constitución)— más cinco declaraciones de «no aplica» (bloque 6) y dos tareas
reescritas porque su premisa caducó (3.4 y el bloque 7). Lo único escrito nuevo es la
deuda de la 7.5 en `docs/11-reglas-no-escritas.md` y la corrección del delta.

**Cómo se midió.** Por archivo y línea, y por comando con su salida, sobre este
árbol. Donde la tarea pedía una corrida, se corrió: un repositorio de juguete armado
desde `plantilla/` con los marcadores resueltos, sobre el que se ejecutó
`actions/constitucion/constitucion.mjs` en sus dos modos, y los programas inline de
`marco-ci.yml` extraídos del YAML igual que lo hacen sus bancos. Nada de eso se
escribió en el repositorio: vivió en un directorio temporal.

**Por qué importa dejarlo escrito y no tildar y seguir.** Un `tasks.md` que dice 2/41
sobre un change casi terminado empuja a rehacer lo hecho. Esta sección existe para
que el próximo que lo abra vea de dónde salió cada marca, y pueda refutarla.

### Hechas (33), con su evidencia

| # | Qué la prueba |
| --- | --- |
| 0.1 | En `actions/constitucion/canonico/`: `max-turns 5` (`70-agentes-modelos.md:33`), `$10/$50 vs $3/$15 por MTok` (`:38-39`), `devDeps → runtime → auth` (`40-fronteras.md:52`), lección repetida **3 veces** (`50-seguridad-observabilidad.md:40`), y el `Closes` con su fecha, 2026-08-13, cazado en review (`80-github.md:27-32`). El ejecutor del bot: `plantilla/.github/workflows/claude.yml:251-253` (`--model sonnet --effort medium --max-turns 5`). El número del issue de origen del orden de riesgo **no** se copió a propósito: era de un repositorio ajeno a Projects |
| 0.2 | `el-proyecto-no-edita-el-marco` en `actions/constitucion/canonico/00-preambulo.md:26-31`, con sus dos caminos (parámetro que falta o change en Projects). El guardrail de deltas en `actions/constitucion/canonico/10-openspec.md:29-45`. **La premisa cambió**: el canónico ya no lo llama hueco, dice que el guardrail **caza** los dos casos y nombra el límite que sí queda (el archive cuenta operaciones declaradas); lo fija `actions/constitucion/pruebas/regresiones-auditoria.test.mjs:820` |
| 0.3 | Las tres reglas con id: `40-fronteras.md:73` (`escalar-modelo-exige-ok-previo`), `:82` (`config-de-repo-u-organizacion-exige-ok-previo`), `:91` (`apartarse-de-la-infra-base-exige-preguntar-antes`). El texto viejo que había que reemplazar: `grep -rc "cuando la tarea lo paga" actions/constitucion/canonico/` → `0` en los once archivos. Lo fijan `constitucion.test.mjs:804` y `:816` |
| 0.4 | `plantilla/.prettierignore:32` (`.projects/`), `:35` (`.cursor/rules/00-marco.mdc`), `:49-50` (los artefactos del CLI de OpenSpec, por el mismo motivo). El arranque renderiza el artefacto al nacer (`herramientas/projects-init.mjs:3836-3839`), y la medición de `pnpm format:check` sobre un repo recién nacido está anotada en el mismo archivo (`:43-44`). `prettier` no se volvió a correr en esta auditoría: no está instalado en el árbol del marco, e instalarlo sería una dependencia nueva |
| 0.5 | Ya tildada. `* text=auto eol=lf` en `plantilla/.gitattributes:24` y en `.gitattributes:23` |
| 0.6 | `"presupuesto_lineas": 700` en `actions/constitucion/canonico/manifiesto.json:3`, verificado en `actions/constitucion/constitucion.mjs:277-283`. El rojo al excederlo: `constitucion.test.mjs:766` (presupuesto 3). Medido hoy con `leerCanonico`: **697 de 700** |
| 1.1 | Los ocho casos del delta, en `actions/constitucion/pruebas/constitucion.test.mjs`: ausente (`:165`, `:176`), atrasado en ventana (`:189`) y el mismo día sin ventana (`:726`), editado a mano (`:384`), no cargado (`:426`, `:455`), referencia dentro de un bloque de código (`:444`), desvío válido (`:511`), desvío huérfano (`:580`), fin de línea y formateador (`:609`, `:621`). Corren en el CI de Projects: job `pruebas_actions`, `.github/workflows/ci.yml:142` y `:156`. Hoy: `node --test actions/constitucion/pruebas/*.test.mjs` → **234 pass, 0 fail** |
| 1.2 | Ya tildada. `git ls-files .claude \| wc -l` → `6` |
| 2.1 | `git ls-files actions/constitucion/canonico \| wc -l` → `11`, y el script se corre desde `${GITHUB_ACTION_PATH}` (`actions/constitucion/action.yml:293`). La action no tiene ningún input de token, y el job del andamio que la invoca pide solo `contents: read` (`plantilla/.github/workflows/ci.yml:104-105`) |
| 2.2 | `leerCanonico` sobre el canónico real → **86 ids, 86 únicos**, cero problemas. El formato de versión lo valida `constitucion.test.mjs:743` (sin versiones, fechas mal o desordenado es inválido). La marca `urgente` **se retiró** con el piso de 28 días (1.6.0) y hoy no cambia nada: `constitucion.test.mjs:711` |
| 2.3 | Cabecera `<!-- projects:constitucion version=… sha=… superficie=… -->` en `constitucion.mjs:735`. Render del canónico real sin llaves: `constitucion.test.mjs:785`. Sobre el repositorio de juguete: `grep -cE "\{\{[A-Z0-9_]+\}\}"` → `0` en las dos superficies. El hallazgo `desvio-con-marcadores` (`constitucion.mjs:1113`) y su banco (`regresiones-auditoria.test.mjs:620`, `:648`) |
| 2.4 | Medido en el repositorio de juguete, con un desvío declarado sobre `dev-no-contacta-usuarios`: modo escribir → `exit 0`; `rm -rf .projects .cursor` y otra vez modo escribir → `exit 0`, `.projects-desvios.json` sigue en la raíz y el artefacto regenerado vuelve a traer el desvío (1 bloque «DESVÍO DECLARADO»); modo verificar → `exit 0`, 0 `::error::` |
| 2.5 | En el repositorio de juguete, el modo escribir emite `.projects/AGENTS-marco.md` y `.cursor/rules/00-marco.mdc`, con la misma versión y el mismo sha en la cabecera (`version=1.7.0 sha=22d439df187b`). Las dos salidas comparadas por contenido: `constitucion.test.mjs:488`. El emisor de Cursor no se recortó |
| 2.6 | En el artefacto del repositorio de juguete, la regla está en la línea 350, el desvío en la **359** y la regla siguiente en la 363: pegado, no al final. El motivo se reimprime como `::notice::desvio vigente sobre dev-no-contacta-usuarios …` en la corrida de verificar. Bancos: `constitucion.test.mjs:511` y `:534` |
| 3.1 | Job `constitucion` en `plantilla/.github/workflows/ci.yml:89`, **sin `if` de solo-docs** (`:81-83` dice por qué), que invoca la action en `modo: verificar` (`:115-117`) y cuelga del veredicto: `needs` en `:594`, `if: always()` en `:595` y el resultado consultado en `:615` |
| 3.2 | `constitucion.test.mjs:609` (CRLF no es divergencia), `:621` (espacios finales y saltos de más), `:632` (qué deja `normalizar`). Fuera del formateador: fila 0.4 |
| 3.3 | Hallazgo `desvio-muerto` en `constitucion.mjs:902`; `constitucion.test.mjs:580` (rojo con el motivo que tenía escrito) y `:598` (un desvío muerto no se imprime) |
| 3.4 | **Reescrita.** El piso se retiró en la 1.6.0 (`CHANGELOG.md:2524`); la política retirada y el mecanismo que queda están en `constitucion.mjs:111-124`. Lo que el CI de Projects rechaza hoy: exigibilidad anterior a la publicación (`constitucion.test.mjs:701`), manifiesto inválido (`:743`), presupuesto excedido (`:766`), y el manifiesto real validado entero (`:777`). Cero días es lo normal: `:692` |
| 3.5 | `permissions: contents: read` declarado por job en `plantilla/.github/workflows/ci.yml:104-105` (con el porqué en `:100-103`) y en `.github/workflows/marco-ci.yml:3883-3884`. Acción por acción: `actions/checkout` → `contents: read`; `actions/setup-node` → ninguno; `actions/constitucion` → ninguno (lee el árbol, no llama a la API: `actions/constitucion/action.yml:7-15`); `actions/upload-artifact` → ninguno del `GITHUB_TOKEN` (usa la credencial de runtime del runner). Que todo job declare sus permisos lo exige `pruebas/andamio/permisos-por-job.test.mjs` sobre los dos árboles |
| 3.6 | Job `constitucion-cableada` en `.github/workflows/marco-ci.yml:3871`, con `modo: cableado` en `:3900`, que **parsea** el YAML (`actions/constitucion/cableado.mjs`). Bancos: `cableado.test.mjs` (38 pass), `refutaciones-ronda-3.test.mjs` (43 pass) y `refutaciones-ronda-4.test.mjs` (43 pass). El residuo que la tarea declara —lo que el `run:` hace con el valor ya leído— sigue declarado, ahora como 🟠 modo aviso: `actions/constitucion/action.yml:95-117` y la fila 15 de `docs/11-reglas-no-escritas.md` |
| 3.7 | `artefacto-sello-incoherente` (`constitucion.mjs:1242`) y `artefacto-adelantado` (`:1250`, `:1263`). Bancos: `constitucion.test.mjs:221` (versión subida a mano con el sello de esta copia: rojo), `:253` (dos refs distintas: aviso), `:291` (escritor en la ref del verificador: rojo, se escriba como se escriba), `:318` |
| 3.8 | Los dos caminos: el marco corre la compuerta por ruta local (`.github/workflows/ci.yml:834-845`, `uses: ./actions/constitucion`) y el consumidor la hereda por `marco-ci.yml` con la ref publicada; el veredicto cobra el salteo y solo lo acepta en el distribuidor (`.github/workflows/marco-ci.yml:4208`). `git ls-tree v1.9.6 actions/constitucion/` → trae `action.yml`. Las pruebas que resuelven las referencias propias contra la base de objetos de git: `refutaciones-ronda-3.test.mjs:648` y `:695`; la que corre el comando exacto del paso sobre este árbol: `:719`. **Límite**: esas pruebas miran los workflows de `.github/workflows`, no las refs del andamio; llevarlas a `plantilla/` y volverlas fail-closed es de otro change del porte de Rigel (`las-actions-publicadas-resuelven-y-se-documentan`) |
| 4.1 | Paso `Permisos del agente sin escritura`, `.github/workflows/marco-ci.yml:3149`. Medido con su programa inline extraído del YAML: `Bash(git push *)` sin desvío → `exit 1` con `::error … Permiso de escritura sin desvio declarado`; la misma entrada con un desvío de permiso con motivo, aprobador y fecha → `exit 0`. Banco: `pruebas/marco-ci/permisos-compuerta.test.mjs` |
| 4.2 | El piso vive una sola vez, en `actions/constitucion/canonico/manifiesto.json:4-35`, y lo mide `actions/constitucion`. Bancos en `regresiones-auditoria.test.mjs`: se mide contra el allowlist y no contra una copia (`:374`), mutar el canónico mueve el veredicto (`:387`), allowlist ausente no se declara sano (`:435`), sale como aviso y jamás como rojo (`:450`), el relleno no cubre (`:678`), la propiedad se busca dentro de una entrada (`:697`) |
| 4.3 | `.github/workflows/marco-ci.yml:3236-3237`. Medido con el paso entero (bash más node) sobre un consumidor de juguete sin `.claude/settings.json` rastreado → `exit 0` con `::warning file=.claude/settings.json::este repo no rastrea .claude/settings.json …` |
| 4.4 | `grep -c "name: Ejecutores de paquetes pinados" .github/workflows/marco-ci.yml` → `1` (`:1956`). La nota que apunta al vecino, dentro del paso de permisos: `.github/workflows/marco-ci.yml:3104-3108` |
| 4.5 | El recorte, en `.github/workflows/marco-ci.yml:3553`. Bancos: `regresiones-auditoria.test.mjs:766`, `:781` y `:794`. **Mutación corrida hoy**: sacando el `replace` de esa línea, fallan `:766` y `:781`; con el archivo restaurado, `git diff --stat` vacío |
| 5.1 | `wc -l plantilla/AGENTS.md` → **199** (era 355), con el import en `:17`. La precedencia, en prosa y en el canónico: `actions/constitucion/canonico/00-preambulo.md:17-24`. Las reglas que la copia con pérdidas había perdido, fijadas en `constitucion.test.mjs:826` |
| 5.2 | `plantilla/.github/workflows/actualizar-marco.yml`: `schedule` semanal y `workflow_dispatch` (`:88-91`), `contents: write` y `pull-requests: write` solo en su job (`:113-115`), la action en `modo: escribir` (`:173-176`), rama propia (`:124`) y `push` a esa rama, nunca a `main` (`:215`). La corrida en un repositorio recién creado está anotada en `:248-251`. Validado como código por los bancos que recorren `plantilla/.github/workflows` (`pruebas/andamio/permisos-por-job.test.mjs`, `pruebas/andamio/techo-de-tiempo.test.mjs`). **Su límite está declarado en el propio archivo** (`:14-32`): ante una versión nueva es un no-op, porque corre con el pin viejo. Eso no es esta tarea, es el ADR 005 |
| 5.4 | `CHANGELOG.md:3776-3812`, sección «Para consumidores» de la 1.3.0: los pasos obligatorios (seis, uno más que los que pedía la tarea: cablear el job), el estreno y qué pasa si no se hace nada |
| 7.1 | La 1.3.0 es MINOR (`CHANGELOG.md:2976`) y trae el mecanismo (`:3447`). Las cuatro versiones del canónico con `exigible_desde` igual a `publicada`, medido con `node -e` sobre `manifiesto.json`: `1.3.0`, `1.4.2`, `1.6.0`, `1.7.0` → las cuatro `IGUAL` |
| 7.2 | `AGENTS.md:144-163` («Versionado»: `v1` dejó de ser el canal el 2026-08-21 y sobrevive en una sola línea). El andamio pina exacto: `plantilla/.github/workflows/ci.yml:50` y `:115`, `plantilla/.github/workflows/actualizar-marco.yml:174`, los tres en `@v1.9.6`. La única invocación con `@v1` hoy es `.github/workflows/marco-ci.yml:990` (`guardrail-deltas`), y lo fija `pruebas/andamio/pinado.test.mjs:203` y `:268` |
| 7.5 | `docs/11-reglas-no-escritas.md:659-664` (la regla entra a «Lo que YA es automático») y `:666-701` (los cuatro huecos, declarados como deuda) |

### No aplica (5), declarado

6.1 a 6.5: ver la nota del bloque 6. Los dos repositorios eran del linaje anterior a
la bifurcación y no consumen Projects; lo que cada tarea quería proteger está nombrado
en la tarea misma con dónde vive hoy.

### Abiertas (3)

| # | Qué falta y por qué |
| --- | --- |
| 5.3 | El artifact `constitucion-al-dia` sale **vacío**: `upload-artifact` excluye los ocultos desde su v4.4 y las tres rutas empiezan con punto. Lo porta el change `el-marco-deja-de-afirmar-lo-que-no-hace` (`include-hidden-files: true` e `if-no-files-found: error` en el andamio), que se trabaja en paralelo. No se arregla acá para no editar dos veces las mismas líneas del andamio |
| 7.3 | Medir a los tres consumidores reales en `@v1.9.6`: su veredicto agregado en verde en la rama por defecto, con el job `constitucion` en `success`. Esta auditoría no lee repositorios consumidores; se hace en la pasada de cierre, solo lectura |
| 7.4 | El archive, que espera la aprobación del PO sobre el delta corregido de `gobierno-contribucion`, la revisión adversarial registrada y la 5.3. La ampliación del `Purpose` que la tarea pide sigue haciendo falta en Projects |
