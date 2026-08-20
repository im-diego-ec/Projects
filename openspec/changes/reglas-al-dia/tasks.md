---
artefacto: tasks
dri: Builder 1
aprueba: Builder 2 (builder par)  # el delta de gobierno-contribucion lo gatea
                              # además PO (PO) por CODEOWNERS
informado: PO / Builder 2
estado: pendiente-de-revision
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

## 0. Rescate al canónico (BLOQUEANTE: antes de tocar un consumidor)

El design lo dice y es la única forma en que este change puede hacer daño neto:
**si la primera regeneración corre antes de subir lo que hoy solo vive en los
consumidores, el escritor lo borra.** Ningún bloque posterior arranca hasta que
este cierre.

- [ ] 0.1 Subir al canónico lo que `proyecto-origen` aprendió y la plantilla
      diluyó o perdió: `claude.yml` como **ejecutor** de la política de modelo
      del bot (`--model sonnet --effort medium --max-turns 5`), la cifra real del
      costo por MTok que `plantilla:145-146` dejó en «varias veces el costo», el
      orden de riesgo de los majors (devDeps → runtime → auth) con su issue de
      origen, «lección repetida **3 veces**» con el conteo que la vuelve creíble,
      y la procedencia del `Closes` con su fecha y quién lo cazó. Evidencia:
      diff del canónico y, por cada ítem, el archivo y la línea del consumidor de
      donde salió.
- [ ] 0.2 Subir al canónico lo que hoy vive en `projects/AGENTS.md` y gobierna al
      consumidor sin que el consumidor lo cargue: el hueco conocido del guardrail
      de deltas (un `MODIFIED` cuyo título no existe en el spec vigente no avisa)
      y «los proyectos no editan el marco desde su repo», con sus dos únicos
      caminos. Evidencia: el texto en el canónico, y la nota de que en Projects esas
      líneas quedan como fuente y no se duplican.
- [ ] 0.3 Incorporar al canónico las **tres reglas fijadas el 2026-08-18**:
      escalar de modelo exige OK humano previo, cambiar settings de un repo o de
      la organización exige OK humano previo, y la infraestructura base es primera
      opción —apartarse se pregunta ANTES—. La primera entra como **corrección**
      del texto vigente, no como agregado: hay que reemplazar «escala por sesión
      cuando la tarea lo paga» (`plantilla/AGENTS.md:139-141`), porque dejarla
      conviviendo con la nueva le da al agente dos reglas contradictorias.
      Evidencia: `grep` del texto viejo en el canónico → 0 ocurrencias.
- [ ] 0.4 Subir al scaffold la exclusión del formateador para lo generado (la
      doctrina que `proyecto-origen/.prettierignore:17-24` ya documenta),
      incluida la ruta del artefacto nuevo. Evidencia: el archivo del scaffold
      con la entrada, y el check de formato del consumidor en verde sobre un
      artefacto recién renderizado.
- [x] 0.5 `.gitattributes` con `* text=auto eol=lf` en el marco **y** en el
      scaffold — sin él, un proyecto nuevo en Windows compara CRLF contra LF y
      sale rojo por un motivo que no es el suyo. **Ya cubierto** por el commit
      `6fab1cb` de esta misma rama; el design lo pedía porque cuando se escribió
      `plantilla/` no lo tenía. Evidencia: `ls plantilla/.gitattributes` → existe.
- [ ] 0.6 Fijar el **presupuesto de líneas** del canónico y su check en el CI de
      Projects. El artefacto no ahorra contexto —lo organiza—, así que agregar una
      regla tiene que costarle algo a quien la agrega. Evidencia: corrida en rojo
      excediendo el presupuesto a propósito.

## 1. El banco de pruebas primero (Projects no puede comerse esta medicina)

D7 es explícito: `projects/AGENTS.md` es la constitución del marco, no la de un
proyecto, así que este repo **no** puede dogfoodear el check. Las dos
contramedidas son obligatorias y esta es la primera.

- [ ] 1.1 Fixtures dentro de la action, corriendo en el CI de Projects, uno por
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

- [ ] 2.1 El canónico en `actions/constitucion/canonico/`, viajando **dentro** de
      la composite action por `${GITHUB_ACTION_PATH}` — el mismo transporte que
      `guardrail-deltas`, y por el mismo motivo: el token de un consumidor no lee
      otro repositorio. Evidencia: la action corriendo en un consumidor sin
      credencial extra.
- [ ] 2.2 Cada regla del canónico con su **id estable** en comentario HTML, y el
      formato de versión con `publicada`, `exigible_desde` y la marca `urgente`.
      Evidencia: `grep` de ids duplicados → vacío; el schema rechazando una
      versión sin fechas.
- [ ] 2.3 El render literal de `{{PLACEHOLDER}}` contra `.projects-valores.json`, y
      la cabecera de una línea en comentario HTML con versión y hash. Obligatorio,
      no cosmético: sin render el artefacto lleva dobles llaves y pone rojo el
      check de marcadores del propio consumidor. Evidencia: artefacto renderizado
      sin una sola doble llave (`grep -cE "\{\{[A-Z0-9_]+\}\}"` → 0).
- [ ] 2.4 Las entradas del render **fuera** del directorio regenerado
      (`.projects-valores.json` y `.projects-desvios.json` en la raíz), para que
      `rm -rf .projects && render` no borre un desvío del proyecto dejando todo
      autoconsistente y en verde. Evidencia: ese comando corrido en un fixture, y
      el desvío sobreviviendo.
- [ ] 2.5 Un emisor por **superficie declarada**, con el mismo cuerpo y la misma
      cabecera: el artefacto que la cadena de imports carga y el de la superficie
      que lee markdown plano sin expandir imports. Si en la implementación el
      segundo emisor se recorta, **hay que decirlo en voz alta en el CHANGELOG**
      (D2), porque hoy esa superficie lee todo el `AGENTS.md` y quedaría con
      menos que antes. Evidencia: las dos salidas comparadas por contenido en CI.
- [ ] 2.6 El desvío impreso **pegado a la regla que anula** dentro del artefacto,
      con su motivo, y el motivo reimpreso como aviso en el resumen de cada
      corrida. Evidencia: artefacto de fixture donde el desvío aparece
      inmediatamente después de la regla, no al final.

## 3. El check, con su ventana de gracia

- [ ] 3.1 El check corre como **job del `ci.yml` del consumidor**, invocando
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
- [ ] 3.6 El marco comprueba que el consumidor CABLEE la verificación, porque una
      action que nadie invoca no verifica nada y ese fue el estado real hasta el
      2026-08-20 (su única invocación era el workflow de actualización, en modo
      escribir, que declara no verificar nada y delegaba en el paso inline
      apagado: circularidad completa). Asimétrico y sin calendario propio —el
      calendario vive en el manifiesto, que viaja con la action y no con el
      workflow—: repo que no versiona `.projects-valores.json`, **aviso** (todavía no
      adoptó); repo que sí lo versiona y no cablea, **rojo** (tiene la maquinaria y
      se saltea el check, y se arregla en el mismo PR que adopta). Evidencia: las
      dos ramas medidas por código de salida.
- [ ] 3.2 Comparación con fin de línea normalizado y fuera del alcance del
      formateador. Evidencia: el mismo artefacto en CRLF y en LF dando el mismo
      veredicto.
- [ ] 3.3 Desvío huérfano en rojo, con el motivo que tenía escrito en el mensaje
      de fallo. Evidencia: fixture con una regla eliminada del canónico.
- [ ] 3.4 Check en el CI de **Projects** (no del consumidor): una versión del
      canónico que declare `exigible_desde` demasiado cerca de `publicada` es
      roja. Es «se estrena en modo aviso» convertido en campo obligatorio, no en
      cortesía. Evidencia: corrida en rojo con una versión sin ventana.
- [ ] 3.5 Auditoría **acción por acción** de los permisos del token del paso
      nuevo antes del estreno — lección repetida tres veces, y acá el paso corre
      en el pipeline de todos los consumidores. Evidencia: la tabla
      acción → permiso exigido, y el `permissions:` declarado al mínimo.

## 4. Permisos del agente, asimétricos (D5)

- [ ] 4.1 Paso nuevo: una entrada del allowlist que autorice una operación
      **mutante** (aplicar infraestructura, empujar, mergear, escribir en la
      nube, cualquier invocación con el perfil de producción) es **roja** salvo
      que esté declarada como desvío con motivo. La propiedad se enuncia sobre el
      **verbo**, no sobre una lista de comandos prohibidos que alguien tendría que
      mantener. Evidencia: fixture con una entrada mutante en rojo, y la misma
      con desvío declarado en verde.
- [ ] 4.2 Piso recomendado de permisos: si falta una entrada, **aviso**, nunca
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
- [ ] 4.3 Repositorio que no versiona el allowlist de su agente: **aviso
      ruidoso**, nunca verde mudo. Es el caso real de `intranet`, que hoy no tiene
      `.claude/` en absoluto (verificado: la ruta da 404 en la rama de adopción).
      Evidencia: fixture sin allowlist rastreado.
- [ ] 4.4 **No** duplicar el check de ejecutores pinados dentro de este paso: ya
      existe y mira los archivos rastreados no-`.md`. En una doble contabilidad la
      declaración siempre pierde contra el check. Evidencia: la nota en el código
      del paso apuntando al check vecino.

## 5. El escritor del lado del consumidor y el scaffold

- [ ] 5.1 Partir `plantilla/AGENTS.md` en «lo del marco» (que pasa al canónico) y
      «lo del proyecto» (lo que el scaffold sigue entregando), con la línea de
      import y la regla de precedencia escrita en prosa: ante conflicto manda el
      bloque del marco, y el único override válido es un desvío declarado.
      Evidencia: la suma de las dos partes contra el archivo de hoy, sin reglas
      perdidas (el diff se revisa regla por regla, que es exactamente lo que la
      copia de `intranet` no tuvo).
- [ ] 5.2 `plantilla/.github/workflows/actualizar-marco.yml`: `schedule` semanal
      más `workflow_dispatch`, permisos mínimos de escritura de contenido y de
      pull requests, que corre la action en modo escribir y **abre un PR**. Jamás
      commitea a la rama de integración. Evidencia: la corrida abriendo un PR en
      un repo de prueba, y el workflow validado como código por el check que ya
      existe.
- [ ] 5.3 Modo verificar que sube el artefacto corregido como artifact de la
      corrida, para el consumidor que todavía no tiene el escritor (el escritor
      es scaffold; el check llega por el carril referenciado, y esa asimetría es
      del diseño). Evidencia: el artifact descargable en una corrida de fixture.
- [ ] 5.4 Entrada del `CHANGELOG.md` en **este mismo PR**, con la sección «Para
      consumidores» diciendo los cinco pasos obligatorios, la fecha de
      exigibilidad de esta versión y qué pasa si no se hace nada. Evidencia: la
      entrada escrita, y el veredicto agregado de CI en verde.

## 6. Migración de los dos consumidores (después de 0, y antes de mover `v1`)

Los PRs de esta sección se abren **desde el repo del consumidor**: escribir en el
repositorio de un proyecto desde una sesión de Projects es 🛑. Y se prueban apuntando
a la **rama** de este change, con el pin revertido en el mismo PR — es la única
corrida real que este código tiene antes de llegar a todos.

- [ ] 6.1 `proyecto-origen`: `.projects-valores.json` con sus placeholders,
      correr el escritor, y reescribir `AGENTS.md` dejando solo lo genuinamente
      propio (la tabla de stack, el `spec/` archivado en `docs/legacy-spec/`, el
      enforcement duro que «se activa cuando Builder 2 esté operativo»), más la ruta
      del artefacto en `.prettierignore`. **Se recomienda partirlo en dos PRs**: el
      mecánico primero, el de contenido después, para que las correcciones
      sustantivas no se diluyan en el ruido. Evidencia verificable en el mismo
      PR: vuelven «cola, **nunca cancelación**», el nombre del check requerido
      `ci-ok` (hoy con cero ocurrencias en el archivo), el porqué de los
      invariantes de propiedades y la regla de ejecutores pinados; y la palabra
      «Projects» pasa de 0 a presente.
- [ ] 6.2 `proyecto-origen`: alinear el allowlist del agente con el piso
      recomendado y con el check de ejecutores pinados —hoy autoriza `npx --yes
      openspec` sin scope ni versión, o sea el paquete ajeno con `--yes`—. No es
      tarea de este mecanismo: es el check vecino que ya existe. Evidencia: el
      check de ejecutores en verde en ese repo.
- [ ] 6.3 `intranet`, **en el mismo PR de adopción que todavía está abierto** (es
      el caso más urgente, no el más nuevo: la corrección tiene que entrar antes
      de que la copia con 114 líneas perdidas quede en la rama de integración).
      `.projects-valores.json`, render, y su `AGENTS.md` baja a lo propio: tabla de
      stack, «no existe `infra-prod/` todavía», «producción no aprovisionada»,
      «credenciales por defecto sin perfil nombrado». Evidencia: vuelven las cinco
      reglas que la copia perdió —ejecutores pinados, logging con `no-console`,
      origen preciso de las alarmas, sistemas de terceros sin compuerta,
      Well-Architected— más la sección «Cuando el marco publica una versión».
- [ ] 6.4 `intranet`: **arreglar la regla invertida**, y arreglarla en dos
      movimientos porque uno solo no alcanza. (a) **Borrar del `AGENTS.md` la
      frase «dev usa la instancia real de Clerk pero con datos de prueba»**:
      completar lo que falta sin borrarla dejaría la versión invertida conviviendo
      con la correcta, o sea el agente leyendo una prohibición y una autorización
      sobre lo mismo, sin saber cuál manda — y esa regla nació del incidente del
      2026-07-28, donde dev notificó a usuarios reales. (b) Declarar la diferencia
      real —que hoy comparte instancia de identidad— como **desvío** nombrando el
      id de esa regla, con aprobador y motivo escrito, para que quede impreso al
      lado de la 🛑 que anula. Evidencia: `grep -c "instancia real"` → 0 en el
      `AGENTS.md`; el desvío en `.projects-desvios.json`; y el artefacto renderizado
      mostrando el desvío pegado a la regla.
- [ ] 6.5 `intranet`: decidir si versiona el allowlist de su agente. Hoy no lo
      tiene y eso sale como **aviso**, no como rojo: lo no rastreado no se puede
      mirar, y callarse sería declararlo sano. Evidencia: el aviso en la corrida,
      o el archivo versionado.

## 7. Estreno y cierre

- [ ] 7.1 Publicar en **MINOR** con la ventana de gracia activa: amarillo para
      los dos consumidores desde el día uno. Evidencia: las dos corridas en
      amarillo, con la fecha de exigibilidad impresa.
- [ ] 7.2 Mover el tag `v1` **solo después** de que los dos PRs de migración
      estén mergeados y verificados, y con **OK humano explícito**: mover el tag
      es frontera ⚠️ y publicar sin probar contra un consumidor real es 🛑.
      Evidencia: los dos PRs mergeados, las dos corridas verdes, y el OK en la
      sesión.
- [ ] 7.3 Confirmar que ningún consumidor quedó rojo por el aterrizaje.
      Evidencia: el veredicto agregado de CI en verde en los dos repos.
- [ ] 7.4 Archivar el change, y en **ese mismo PR** ampliar el `## Purpose` de
      `gobierno-contribucion`: hoy enumera plantilla de PR, CODEOWNERS y
      protección de la rama, y no menciona la distribución de la constitución.
      Evidencia: `openspec validate --all --strict` en verde y el guardrail de
      deltas en verde, los dos por código de salida.
- [ ] 7.5 Anotar en las reglas no escritas qué filas cierra esto y cuáles quedan
      abiertas —declaradas como deuda, no como olvido—: que el `AGENTS.md` del
      proyecto contradiga al artefacto no lo caza ningún check (la mitigación es
      de migración: borrar el duplicado); un consumidor que saca el `uses:` o lo
      pina a un SHA deja de recibir reglas y desde Projects eso no se ve; la
      dirección inversa —la mejora que un proyecto descubre y debería subir al
      marco— sigue dependiendo de la revisión trimestral; y nada limita cuántos
      desvíos declara un proyecto.

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
- El límite de fondo: el marco garantiza que el **texto** llegue, no que el
  agente lo **obedezca**. No hay tarea que cierre eso.
