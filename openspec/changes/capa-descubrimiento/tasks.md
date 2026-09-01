---
artefacto: tasks
dri: Builder 1
aprueba: Builder 2 (builder par)  # el delta lo gatea además PO (PO) por CODEOWNERS
informado: PO
estado: pendiente-de-revision
experimental: true
veredicto_antes_de: 2026-09-21
---

> ## ⚠️ Lo que cambió el 2026-08-22: el lunes no es un experimento
>
> Builder 1 decidió que el arranque **usa la herramienta sobre el corpus completo y se observa**.
> Sin brazo manual, sin comparación y sin veredicto. Lo que rige el lunes es
> [`piloto/observacion.md`](piloto/observacion.md).
>
> **Los bloques que dejan de aplicar, y por qué**, para que nadie los tilde por inercia:
>
> | Bloque | Estado |
> |---|---|
> | **3. Medición y veredicto** | No aplica la parte del veredicto. Las mediciones absolutas sobreviven como las cinco preguntas de `observacion.md` |
> | **4b. La segunda rebanada con el orden invertido** | No aplica: existía para acotar el sesgo de orden, y sin dos brazos no hay orden que invertir |
> | **5. SOLO si las DOS rebanadas dieron VERDE** | No aplica: no hay verde que habilite nada. Lo que decida si esto entra al carril de todos va a necesitar más de una corrida, y eso se replantea cuando haya datos |
> | **6. SOLO si el veredicto es AMARILLO o ROJO** | No aplica por lo mismo |
> | **0. Pre-registro** | Se cumple con `observacion.md` commiteado antes de la primera hora. Deja de ser una puerta —no hay veredicto que proteger— pero sigue siendo lo que separa una observación de una impresión |
>
> **El bloque 4 (caducidad del estado experimental) SÍ aplica**: es independiente del
> veredicto por diseño, y su fecha (`veredicto_antes_de: 2026-09-21`) sigue corriendo.
>
> **Lo que sigue pendiente y de verdad puede tumbar el lunes** no es ninguno de los
> anteriores: es la fila de la decisión 1.4 que dice que **no está medido que la herramienta
> acepte un corpus terminado** como entrada de su fase 1. El ensayo del 2026-08-20 midió que
> se instala (exit 0), no que ingiera. Si la herramienta insiste en elicitar en vez de
> ingerir, no hay brazo manual al que caerse. Se cierra probándolo, no leyendo el README.

---

El orden manda, y acá manda más que de costumbre porque **la mitad de los bloques
no se ejecuta**: el 5 y el 6 son excluyentes y los decide el veredicto del
piloto. Nada del bloque 5 se adelanta «para tenerlo listo»: adelantar la
maquinaria de una capa que todavía no se validó es la forma más eficiente de que
el veredicto salga verde por costo hundido.

**Y desde el 2026-08-21 hay un bloque más entre el veredicto y el bloque 5.** Builder 1
decidió que el orden del piloto se mantiene A → B y que, por eso mismo, un verde
significa **«no se refutó que la herramienta ayude»** y no «ayuda»: con la misma
persona en los dos brazos, el verde mide la herramienta más la memoria de haber
hecho ya la tarea. Ese verde habilita el **bloque 4b**, la segunda rebanada con el
orden invertido; el bloque 5 pasa a depender de que las **dos** corridas den verde.
Los umbrales y el desenlace de cada combinación viven en
`piloto/pre-registro.md`, sección 2, que es el pre-registro vigente.

El bloque 0 es bloqueante por una razón metodológica, no burocrática: un umbral
escrito después de ver el resultado no es un umbral. El sello de tiempo de git es
la evidencia.

Toda verificación de herramientas se hace **por código de salida**, nunca
grepeando su salida.

## 0. Pre-registro (BLOQUEANTE: antes de correr un solo brazo)

- [ ] 0.1 Elegir la rebanada con el PO y un builder: qué **piezas del corpus**, qué
      proceso end-to-end, dónde corta, por qué es representativa del corpus de
      Supply Chain y si el prototipo la cubre. Evidencia: la sección 1 de
      `piloto/pre-registro.md`, que es donde vive la tabla vigente con sus cinco
      filas.
- [ ] 0.2 Declarar los dos brazos, quién corre cada uno y el orden (A primero), y
      escribir el sesgo que ese orden introduce **a favor del brazo B**. Un sesgo
      declarado se puede corregir al leer; uno tapado invalida la medición.
      Evidencia: sección 2 del pre-registro.
- [ ] 0.3 Nombrar al scorer —el builder que **no** corre ninguno de los dos
      brazos— y dejar por escrito que arma el inventario de materia prima desde
      el **corpus** **antes** de ver cualquier salida. Con tres personas el
      rol choca con la firma del veredicto, y eso no se arregla nombrando gente:
      hay que **elegir** cuál de las dos combinaciones se usa y **escribir el
      conflicto que queda**, pegado al ciego imperfecto que `design.md` ya
      declara. Evidencia: sección 3 del pre-registro, con la elección hecha y el
      conflicto residual escrito, y el commit del inventario anterior al de las
      salidas.
- [ ] 0.4 Escribir la tabla de los siete criterios (G0–G6) con sus umbrales ya
      fijados **en `piloto/pre-registro.md`, sección 4, que es el pre-registro
      vigente**, la regla de veredicto, y el comando exacto que produce la
      evidencia de cada uno, diciendo también cuáles **no** tienen comando y
      dependen de lectura humana. Un criterio sin comando no es menos válido: es
      menos verificable, y eso hay que saberlo antes de correr y no al puntuar. La
      tabla de `design.md` D6 quedó como historia del diseño viejo y **no** es el
      gate: sus umbrales son los de la pregunta anterior, cuando el insumo eran
      transcripciones y las salidas eran tres. Evidencia: sección 4 del
      pre-registro.
- [ ] 0.5 Planilla de horas por sesión, vacía, con las columnas ya definidas (rol,
      brazo, fecha, **categoría**, horas de reloj). Sin esto, G4 se mide de memoria
      y la memoria siempre favorece a lo nuevo. Y sin la categoría, el marcado de
      escenarios que exige la vara del PO (G3b) le come el techo de horas al brazo
      **más prolijo**, que es lo contrario de lo que G4 busca. Evidencia: sección 5
      del pre-registro, y `piloto/horas.csv` con el encabezado y cero filas.
- [ ] 0.6 Pinar la versión exacta de la herramienta y anotarla. Evidencia: sección
      6 del pre-registro con la versión, y el comando de instalación registrado.
- [ ] 0.7 Commitear el pre-registro **completo** antes de la primera sesión del
      piloto. Evidencia: la fecha del commit del pre-registro es anterior a la
      fecha de la primera entrada de la planilla de horas.

Las seis que siguen se agregaron al bloque 0 después de escribirlo, porque el
bloque se podía tildar entero sin que existiera ninguna de ellas: la checklist
habría dicho «pre-registro hecho» sobre un pre-registro que no permite medir G1,
G2 ni G4. Las dos últimas se agregaron el 2026-08-21, al releer el instrumento
entero: el inventario del que cuelgan G1 y G2 no tenía dónde vivir.

- [ ] 0.8 Convención de identificadores del material y formato de la tabla de
      trazabilidad, con su domicilio decidido: la tabla vive **con el change**, al
      lado de los deltas, y no en el directorio del insumo, porque nombra
      escenarios y D2 prohíbe que un insumo tenga forma de contrato. Sin esta
      convención los dos brazos citan en dialectos distintos y G1 deja de ser
      comparable, que es el criterio que justifica la capa. Evidencia:
      `piloto/convencion-de-procedencia.md`, partes 1 y 2, commiteado antes de la
      primera sesión.
- [ ] 0.9 Rúbrica de clasificación regla de negocio / contexto / preferencia, con
      una prueba de decisión por clase y sus casos de borde. El umbral de G2 es
      condicional a la clase: si la definición llega después de ver las salidas,
      el scorer puede reclasificar como «contexto» cualquier ítem caído y el cero
      se sostiene sin que nada falle. Evidencia:
      `piloto/convencion-de-procedencia.md`, parte 3, con el commit de la rúbrica
      anterior al commit del inventario de 3.1. Incluye los dos casos que el corpus
      obliga a resolver antes: la lista de casos borde (un caso por ítem, o G2
      pierde los caídos de adentro de un solo id) y el prototipo (se inventarían
      las decisiones, no los elementos).
- [ ] 0.14 Campo `origen` del inventario, con sus **tres** valores (`corpus`,
      `derivado` y `elicitado`) y la regla dura de que un `derivado` no sostiene un
      escenario sin marca de supuesto. Lleva el 0.14 y no un numero en secuencia
      porque llego en un merge, cuando 0.12 y 0.13 ya estaban tomadas; el orden del
      archivo no es el orden de ejecucion. Se agregó el 2026-08-21: con el corpus ya escrito, la
      invención dejó de verse como un escenario colgado de la nada y pasó a verse
      como uno perfectamente citado cuya ancla dice algo parecido pero no eso. Sin
      este campo, G3 no tiene con qué separar lo que dijo el corpus de lo que
      interpretó un agente. Evidencia: `piloto/convencion-de-procedencia.md`, parte
      1, y la columna `origen` en el formato de la tabla de trazabilidad (parte 2).
- [ ] 0.10 Regla de parada **idéntica** para los dos brazos, y protocolo escrito
      del brazo A. «El camino de hoy con la asistencia habitual» no es un control:
      es lo que cada uno haga. Y sin regla de parada las horas de G4 miden una
      cantidad indefinida, así que gana el brazo que se detiene cuando le parece
      suficiente. Evidencia: sección 2 del pre-registro, con la condición
      mecánica (código de salida del arnés), la condición escrita y el techo de
      sesiones.
- [ ] 0.11 Mecánica medible de G0: el espacio desechable lleva `git init` y
      **los dos** directorios que la instalación escribe —`_bmad/` y
      `.claude/skills/`— se commitean **apenas** se instala, antes de trabajar. Son
      dos y no uno porque la edición más probable del piloto es el prompt de una
      skill, y midiendo solo `_bmad` ese fork pasaba en verde (pre-registro,
      «Por qué G0 mira dos directorios»). «Fuera de
      todo repositorio» (D5) significa fuera de Projects, de `plantilla/` y de los
      consumidores; **no** significa sin git, porque la evidencia de G0 es un diff
      de git y sin él el criterio queda no medido, que por la regla de veredicto
      cuenta en contra. Evidencia: el primer commit del espacio, y el código de
      salida de `node piloto/arnes/verificar-brazo.mjs <espacio> B`.
- [ ] 0.12 Domicilio del inventario, declarado antes de que exista: `inventario.md`
      en el **espacio de trabajo propio del scorer**, fuera de todo repositorio del
      área y con su `git init`, y su commit es el **primero** de ese espacio. No va a
      `piloto/` porque lleva la **cita textual** de cada ítem del corpus, y eso es
      material del corpus entrando al repositorio: lo prohíbe D3 y no lo autorizó la
      decisión 1.5, que sigue bloqueante. Lo que viaja a Projects es `mediciones.md`,
      despersonalizado y después. Sin este domicilio, el archivo del que cuelgan G1
      y G2 no tiene ningún lugar legal donde commitearse el lunes. Evidencia: la
      sección 3 del pre-registro, y el `git log` del espacio del scorer con el
      inventario como primer commit, anterior a los commits de salidas de los dos
      brazos.
- [ ] 0.13 Spot-check de granularidad del inventario por el PO, antes de la primera
      sesión: que una lista de doce casos borde no haya quedado comprimida en un
      ítem. No revisa clasificaciones —las gobierna la rúbrica—, y es la única
      segunda mirada que el equipo puede poner sobre el punto donde el piloto es más
      fácil de arruinar sin mala fe. Es **propuesta**: la confirma la decisión 1.3.
      Evidencia: el visto del PO con fecha, anterior a la primera fila de
      `horas.csv`.

## 1. Lo que este change NO decide (pendiente de OK humano explícito)

Ninguna se resuelve por defecto y ninguna la toma un agente. La tabla completa, con
las seis decisiones, quién decide cada una y su estado, vive en la sección 7 del
pre-registro: acá están las que quedan por tomar y su evidencia.

- [ ] 1.1 **Dependencia de terceros** (⚠️ de `AGENTS.md`): OK para usar la
      herramienta en el piloto, y —por separado, y solo si las **dos** rebanadas
      dan verde— OK para que su pin entre al carril que consumen todos. Evidencia:
      el OK en la sesión, con la versión y el alcance de módulos escritos.
- [ ] 1.2 **Material con datos de personas**: dónde vive el corpus, y si puede
      pasar por un modelo. El repositorio no es su custodio (D3) y el piloto no
      arranca sin esta decisión tomada por una persona. Evidencia: la decisión
      escrita en el pre-registro, con quién la tomó. **RESUELTA** el 2026-08-21
      (pre-registro, decisión 1.2); su residuo abrió la decisión 1.5, que sigue
      bloqueante.
- [ ] 1.3 **Correr el piloto**: consume tiempo del PO y de dos builders, e incluye
      confirmar el reparto de roles de la sección 2 del pre-registro. Evidencia: el
      OK y las fechas reservadas.
- [ ] 1.4 **Cadena de herramientas**, dos mitades y ninguna opcional: (a) la
      instalación ensayada **en la máquina que va a correr el brazo B**, con lo que
      pidió de verdad —el ensayo del 2026-08-20 ya midió que pide `uv`, y no midió
      el caso sin `uv`—; y (b) **si la fase 1 ingiere un corpus terminado en vez de
      elicitar**, que es lo que puede tumbar el brazo B y no se cierra leyendo el
      README. Evidencia: los dos resultados escritos en la sección 6 del
      pre-registro, con su código de salida.
- [ ] 1.5 **Despersonalización del corpus** (decisión 1.5 del pre-registro,
      **bloqueante**): si las piezas que entran a la sesión traen nombres de
      empleados y juicios sobre su propio trabajo. La toma PO con Builder 1, y hasta
      que esté tomada el inventario del scorer —que lleva **cita textual** de cada
      ítem— no tiene domicilio legal en ningún repositorio. Evidencia: la decisión
      escrita en el pre-registro, con quién la tomó y cuándo.

## 2. El piloto (arranca el lunes 2026-08-24)

- [ ] 2.1 **Brazo A (control)**: desde el **corpus** de la rebanada, leído directo,
      a las **cinco** salidas —proposal, deltas, tabla de trazabilidad, design y
      tasks—, con el protocolo del control escrito en la sección 2 del
      pre-registro. Ahí está el conjunto de salidas vigente, y ahí está por qué el
      control lee el corpus y no transcripciones: el descubrimiento ya está hecho.
      Evidencia: los artefactos del brazo A, y las horas anotadas por sesión en la
      planilla.
- [ ] 2.2 **Brazo B**: fases 1 y 2 de la herramienta sobre el **mismo corpus**
      → informe de descubrimiento, brief y PRD; y desde ahí, las mismas cinco
      salidas. Evidencia: los artefactos del brazo B y sus horas.
- [ ] 2.3 Registrar **cada** edición que haya hecho falta hacer sobre los
      directorios de instalación de la herramienta —`_bmad/` y `.claude/skills/`,
      los dos— para que ingiera el corpus o para cortar en el PRD (G0). Si la lista
      queda vacía, decirlo explícitamente: es el resultado esperado y hay que poder
      distinguirlo de «no se miró». Evidencia: el código de salida de
      `node piloto/arnes/verificar-brazo.mjs <espacio> B`, que nombra los dos
      directorios y lista archivo por archivo lo que difiere.
- [ ] 2.4 Correr el piloto **fuera de todo repositorio** (D5). Nada se escribe en
      los consumidores, ni en `plantilla/`, ni en `openspec/specs/`. Evidencia:
      los repos sin un solo commit del piloto.
- [ ] 2.5 Anotar, mientras pasa y no al final, cada punto donde el piloto dependió
      de que alguien se acordara de algo (insumo de G5). Al final de un piloto de
      cuatro semanas esa lista se reconstruye mal. Evidencia: la lista con fecha
      por ítem.
- [ ] 2.6 Anotar, en el momento y en `lista-de-observacion.md` del espacio del
      brazo, **cada pregunta que la herramienta o el brazo le haga al PO y que el
      corpus no contestaba**, con su `L0xx`, su fecha, la pregunta textual y la
      respuesta en una línea. Es lo que le da ancla a un escenario `elicitado`
      —satisface G1 y queda afuera de G2 y G3— y es lo que el PO revisa al firmar:
      una entrada que no reconozca es un hallazgo de G3. Anotada después de entregar
      las salidas no es una elicitación, es una reconstrucción. Evidencia: la lista
      con una entrada por pregunta y las horas del PO imputadas a `elicitacion`.

## 3. Medición y veredicto

- [ ] 3.1 El scorer arma el inventario de materia prima **desde el corpus** y
      clasifica cada ítem (regla de negocio / contexto / preferencia), con su
      `origen` según la convención. Vive en `inventario.md` del espacio del scorer
      (0.12) y su commit es anterior al de las salidas de los dos brazos. Evidencia:
      ese `git log`, y después `piloto/mediciones.md` con el inventario ya
      despersonalizado y el id de cada ítem.
- [ ] 3.2 Puntuar G1 (100% de escenarios con ítem asociado, `I0xx` o `L0xx`) y G2
      (caídos en silencio) contra ese inventario, ítem por ítem y para los dos
      brazos. G1 es **simétrico**: se exige el 100% en las **dos** tablas, y si la
      del control no llega, las comparativas de G2 y G4 quedan **no medidas** —una
      tabla A subllenada le regalaría a B la comparativa—. Evidencia: las dos listas
      con veredicto por ítem.
- [ ] 3.3 Puntuar G3, las dos mitades. **G3a (invención)**: enumerar **todas** las
      afirmaciones de regla de negocio del delta, una por línea y con veredicto por
      afirmación —no solo las falladas: una omisión invisible favorece al veredicto
      que el scorer firma—, con la **cita textual**, el ancla invocada y lo que esa
      ancla dice de verdad. **G3b (fidelidad al negocio)**: las tres marcas del PO
      por escenario, anotadas **antes** de ver los otros criterios. Evidencia: la
      lista completa y la columna del PO; para el brazo B el umbral es cero absoluto
      en G3a y 100% «describe» en G3b, y las dos son eliminatorias.
- [ ] 3.4 Cerrar G4: horas de la planilla **por categoría** —`conversion` y
      `elicitacion` entran a la comparación, `marcado` queda afuera—, y los gates de
      siempre sobre la salida del brazo B —`openspec validate --strict` y el
      guardrail de deltas— verificados **por código de salida**. Evidencia: las
      horas y los dos exit codes, con el comando exacto.
- [ ] 3.4b Reportar, **sin umbral y por brazo**, la distribución de los ítems de
      regla de negocio entre `cubierto` / `fuera de alcance declarado` / `pregunta
      abierta`. No hace fallar nada por sí sola, y sin ella un verde con un delta
      hueco es ilegible: ninguna de las siete celdas mide cuánto se convirtió, y un
      brazo que puntúa mucho y convierte poco pasa los siete gates. Evidencia: los
      tres números y el total, para los dos brazos, en `piloto/veredicto.md`.
- [ ] 3.5 Cerrar G5: la lista del 2.5 con su columna de destino («check propuesto»
      o «queda fuera, y por qué»). Si todo queda fuera, el techo del veredicto es
      amarillo y hay que escribirlo así. Evidencia: la lista completa.
- [ ] 3.6 Cerrar G6: buscar en los artefactos y PRs del piloto cada vez que el
      insumo se usó como autoridad de comportamiento sin escenario que lo
      respalde. Si aparece alguna, el check de D2 se estrena rojo desde el día uno
      y eso queda anotado como consecuencia, no como nota al pie. Evidencia: la
      búsqueda y su resultado.
- [ ] 3.7 Escribir `piloto/veredicto.md`: los siete resultados con sus números, el
      veredicto según la regla de la sección 4 del pre-registro, y las tres firmas
      (PO por fidelidad al negocio, scorer por la medición, Builder 1 por el veredicto).
      Y escribir qué habilita ese veredicto con las palabras que le corresponden:
      un verde significa **«no se refutó que ayude»** y habilita el bloque 4b —la
      segunda rebanada con el orden invertido—, no el bloque 5. Evidencia: el
      archivo, con fecha anterior al `veredicto_antes_de`.

## 4. Caducidad del estado experimental (independiente del veredicto)

Este bloque **no** depende del piloto: es lo que vuelve honesto el estado
experimental de cualquier change, incluido este.

- [ ] 4.1 Paso nuevo en el job de marco: un change que declara ser experimental
      sin fecha de veredicto es rojo; y uno cuya fecha pasó sin veredicto
      registrado es rojo. **Inerte** para los changes que no se declaran
      experimentales, y por eso MINOR y no breaking. Evidencia: los tres casos —sin
      fecha, fecha vencida, change normal— con su veredicto esperado, por código
      de salida.
- [ ] 4.2 Dogfooding real: el check corre en el CI de Projects y su primer sujeto es
      **este mismo change**. Evidencia: la corrida de Projects en verde con
      `veredicto_antes_de: 2026-09-21` vigente, y en rojo con una fecha vencida a
      propósito.
- [ ] 4.3 Auditoría **acción por acción** de los permisos del token del paso nuevo
      antes del estreno — lección repetida tres veces, y el paso corre en el
      pipeline de todos los consumidores. Evidencia: la tabla acción → permiso, y
      el `permissions:` declarado al mínimo.
- [ ] 4.4 Entrada del `CHANGELOG.md` en el mismo PR que estrena el paso, con la
      sección «para consumidores» diciendo lo que tienen que hacer: **nada**,
      mientras no declaren un change experimental. Evidencia: la entrada escrita.
- [ ] 4.5 Check nuevo en el CI de **Projects**: si el cuerpo del canónico cambia y el
      `manifiesto.json` no gana una entrada de versión, es rojo. Salió de una
      medición del 2026-08-21 (D11) y no de una intuición: con una regla nueva en el
      canónico y el manifiesto intacto, `node --test
      actions/constitucion/pruebas/*.test.mjs` devuelve **0** con 203 pruebas en
      verde, el presupuesto de líneas tampoco lo caza (600 de 700), y el consumidor
      al día con la 1.3.0 devuelve **1** con `::error::` «difiere del texto que el
      marco publica para la version 1.3.0». O sea que el rojo cae río abajo, en el
      pipeline de repos que no hicieron nada. Es dogfoodeable sin consumidor:
      compara dos archivos de este repo. **No depende del veredicto del piloto.**
      Evidencia: los tres casos —canónico tocado sin versión nueva, canónico tocado
      con versión nueva, canónico intacto— con su veredicto esperado, por código de
      salida.
- [ ] 4.6 Cortar la versión del canónico que publica la mitad **operativa** de D11
      («el descubrimiento se produce fuera del repositorio y entra como insumo al
      inicio de la sesión»), con el texto que D11 ya trae escrito, y con
      `exigible_desde` a **28 días o más** de `publicada`, que es lo que la propia
      action exige. Está en el bloque 4 y no en el 5 porque **no depende del
      veredicto**: es la forma en que el área trabaja, con o sin la herramienta.
      **Es tarea humana y no la toma un agente**: cortar una versión mueve el
      calendario de todos los consumidores, y la 1.3.0 ya se publicó el 2026-08-21
      con `v1` apuntando a su commit. Hoy no se cortó a propósito, y el motivo está
      medido en D11. Evidencia: la entrada nueva en `manifiesto.json`, la ventana de
      28 días verificada por la action, y la sección del `CHANGELOG.md`.

## 4b. La segunda rebanada, con el orden invertido (SOLO si la primera dio verde)

No es una repetición del piloto: es la corrida que acota el sesgo de orden. La
primera va A → B y deja el sesgo a favor de B; esta va **B primero** y lo deja en
contra. Con las dos, el efecto real queda encerrado entre un número inflado y uno
deprimido, y el sesgo pasa de defecto a instrumento. Por eso la primera no se
invierte: el control limpio se puede escribir una sola vez.

- [ ] 4b.1 Elegir la **segunda rebanada** con el PO y un builder, con las mismas
      cinco declaraciones de la sección 1 del pre-registro. Tiene que ser otra
      rebanada del mismo corpus: repetir la primera mide memoria, no herramienta.
      Evidencia: la sección 1 del pre-registro de la segunda corrida, commiteada
      antes de su primera sesión.
- [ ] 4b.2 Correr los dos brazos con el orden **invertido**: primero B, después A.
      Todo lo demás idéntico —misma persona, misma regla de parada, mismo techo de
      5 sesiones, mismo conjunto de cinco salidas—. Evidencia: los artefactos de
      los dos brazos y sus horas, con el orden visible en las fechas de
      `horas.csv`.
- [ ] 4b.3 Puntuar los siete criterios de la misma tabla y con los mismos umbrales,
      sin tocar ninguno: mover un umbral entre corridas vuelve incomparables las
      dos. Evidencia: el `veredicto.md` de la segunda corrida.
- [ ] 4b.4 Escribir la lectura conjunta: el efecto de cada criterio en las dos
      corridas, y qué queda en pie cuando el sesgo apunta al revés. Evidencia: la
      sección de lectura conjunta, con los dos números por criterio.

Si la segunda corrida **no** da verde, no corre el bloque 5: corre el 6, con las
mediciones de las **dos** corridas adentro del ADR (D8).

## 5. SOLO si las DOS rebanadas dieron VERDE

Nada de este bloque se adelanta, y desde el 2026-08-21 tampoco arranca con un solo
verde. Adelantarlo compra costo hundido y el costo hundido decide veredictos.

- [ ] 5.1 Check de forma: un artefacto de la ubicación declarada que contenga
      encabezados de delta o escenarios es rojo. **Buscar la estructura, no la
      palabra**: medido el 2026-08-21, `validate --all --strict` cuenta el
      encabezado `####` y no el literal `Scenario:` (renombrar los tres escenarios
      del delta a `#### <cualquier cosa>` sale 0; borrarles el encabezado y dejar
      los `WHEN`/`THEN` sale 1). Un check que greppee `#### Scenario:` deja pasar un
      insumo que el validador ya trataría como contrato. Evidencia: fixture con un
      insumo con forma de spec en rojo, el mismo insumo con encabezados `####` que
      no dicen «Scenario» **también** en rojo, y el insumo sin esa forma en verde.
- [ ] 5.2 Check de procedencia: escenarios del delta sin entrada en la tabla de
      trazabilidad, o con procedencia vacía, en rojo. Evidencia: fixture con un
      escenario huérfano.
- [ ] 5.3 Check de supuestos abiertos **en el PR que archiva**, no antes.
      Evidencia: fixture con un supuesto abierto bloqueando el archive, y el mismo
      change proponiendo e implementando sin bloqueo.
- [ ] 5.4 Scaffold: la ubicación declarada, su entrada en CODEOWNERS del rol de
      producto y su exclusión del formateador. Evidencia: los tres archivos, y el
      check de formato en verde sobre un artefacto recién generado.
- [ ] 5.5 Pin de la herramienta como **regenerado**: se pina la versión, cada repo
      la instala, no se vendora ni una copia. Evidencia: la versión pinada en un
      solo lugar, y el directorio de instalación ignorado en git.
- [ ] 5.6 Estrenar en **MINOR** con ventana de gracia, salvo lo que G6 haya
      obligado a estrenar rojo. Evidencia: la corrida amarilla con la fecha de
      exigibilidad impresa.
- [ ] 5.7 Probar contra un consumidor real antes de mover `v1`, y mover `v1` con
      **OK humano explícito** (frontera ⚠️). Evidencia: la corrida en el
      consumidor apuntando al SHA de la rama, y el OK en la sesión.
- [ ] 5.8 Archivar el change y, en **ese mismo PR**, ampliar el `## Purpose` de
      `gobierno-contribucion` —que hoy no menciona ni el descubrimiento ni el
      estado experimental— releyendo lo que dejó el archive de `reglas-al-dia`, que
      toca el mismo `Purpose`. Evidencia: `openspec validate --all --strict` y el
      guardrail de deltas, los dos **por código de salida**.

## 6. SOLO si el veredicto es AMARILLO o ROJO, o si la SEGUNDA rebanada no dio verde

- [ ] 6.1 ADR nuevo en `docs/adr/` con contexto, decisión y consecuencias, y con
      **las mediciones adentro**: los siete criterios con sus números. La
      medición es lo más valioso que produce el piloto y no se puede ir con el
      directorio del change. Evidencia: el ADR, y los números trazables al
      `veredicto.md`.
- [ ] 6.2 Si es **amarillo**: documentar la capa en `docs/` como herramienta del
      PO —sin requirement, sin huella en el scaffold y sin check—, diciendo
      explícitamente que no es requisito del marco. Evidencia: el documento, y
      cero cambios en `openspec/specs/` y en `plantilla/`.
- [ ] 6.3 Rescatar el requirement de caducidad (bloque 4) a un **change propio** y
      archivarlo por separado (D7). Evidencia: el change nuevo, con su delta y su
      archive.
- [ ] 6.4 Rescatar, al mismo change propio del 6.3 o a uno aparte, el requirement
      de **D11**: el descubrimiento se produce fuera del repositorio y entra como
      insumo al inicio de la sesión. Es el **segundo** ítem de este change que vale
      con independencia del veredicto, y por eso el 6.3 ya no dice «el único». Builder 1
      lo enunció como la forma en que el área trabaja, no como consecuencia de
      adoptar la herramienta; está en este delta porque hoy es la única ruta que
      conserva el gate del PO por CODEOWNERS (D10). Evidencia: el requirement en el
      spec vivo de `gobierno-contribucion`, con `validate --all --strict` y el
      guardrail de deltas en cero por código de salida.
- [ ] 6.5 Borrar el directorio de este change en el mismo PR del ADR. Va **último**
      del bloque a propósito: los dos rescates (6.3 y 6.4) tienen que estar hechos
      antes, porque borrar el directorio se lleva los enunciados con él. Un delta
      que el piloto refutó no se funde en el contrato, y un change que nadie
      archiva ni descarta es el zombi que el bloque 4 existe para evitar.
      Evidencia: el directorio ausente y `validate --all --strict` en verde por
      código de salida.

## 7. Cierre, en cualquiera de los tres casos

- [ ] 7.1 Anotar en `docs/11-reglas-no-escritas.md` qué queda automático y qué queda
      como disciplina declarada: que la procedencia se verifica pero su calidad
      no; que el insumo puede envejecer hasta mentir sin poner nada en rojo; y que
      el material crudo fuera del repositorio no lo hace cumplir ningún check.
      Evidencia: las filas nuevas con su estado 🟢/🟡/🔴.
- [ ] 7.2 Registrar el resultado en el board del área como cierre del pendiente de
      descubrimiento, con el link al veredicto o al ADR. Evidencia: el issue
      actualizado.

## 8. Romper el acople del arnés ANTES de archivar o descartar (BLOQUEANTE)

`openspec/changes/` es una carpeta transitoria: archivar este change lo mueve a
`openspec/changes/archive/<fecha>-capa-descubrimiento/` y descartarlo lo borra. Hoy
el banco **requerido** del marco depende de una ruta de adentro, así que cualquiera
de las dos operaciones deja el CI en rojo por algo que no tiene nada que ver con
specs. La dirección del acople está al revés y se arregla acá, no el día del
archive.

Medido el 2026-08-24, con el comando que lo mide:

```bash
git grep -n -F "openspec/changes/capa-descubrimiento" -- ':!openspec/changes/capa-descubrimiento'
# -> pruebas/piloto/arnes-d5.test.mjs:31
```

- [ ] 8.1 Mover el arnés fuera de la carpeta transitoria y actualizar a quien lo
      nombra, en el mismo commit:
      `git mv openspec/changes/capa-descubrimiento/piloto/arnes/verificar-brazo.mjs herramientas/verificar-brazo.mjs`
      y en `pruebas/piloto/arnes-d5.test.mjs` cambiar la constante `ARNES` a
      `path.join(RAIZ, "herramientas/verificar-brazo.mjs")`.
      Evidencia: `node --test pruebas/piloto/arnes-d5.test.mjs` en verde y el
      `git grep` de arriba sin salida.
- [ ] 8.2 Decidir qué pasa con `openspec/changes/capa-descubrimiento/piloto/arnes/config-espacio-de-trabajo.yaml`,
      que viaja con el arnés: o se mueve junto, o el arnés deja de leerlo de una
      ruta relativa al change. Evidencia: el arnés corre desde su ruta nueva.
- [ ] 8.3 Comprobar que la guarda del archivado ya no se dispara:
      `node .claude/skills/projects-archive-change/aplicar-deltas.mjs capa-descubrimiento --simulacro`
      tiene que dejar de imprimir «ruta transitoria». Evidencia: la salida del
      comando. **Esa guarda ya está puesta y hoy sale roja sobre este change**:
      es la que impide archivarlo con el acople encima, así que 8.1 no se puede
      olvidar.

## Fuera de alcance, declarado

No son tareas de este change; se anotan para que no se lean como olvido.

- **Los specs de dominio de Supply Chain.** El piloto produce deltas de una
  rebanada como *medición*, no como el contrato de ese proyecto. El proyecto no
  existe todavía y sus specs nacen en su repo, no acá.
- **La descomposición del PRD en changes.** Es acto de builder (D1) y no se
  importa de la herramienta. Lo que el piloto mide es el insumo, no el recorte.
- **La dirección inversa.** Lo que el piloto aprenda sobre el método y quiera
  devolverle a la herramienta de terceros no tiene canal en este change.
- **Partir el descubrimiento a su propia capability.** Si la capa crece, es un
  change posterior que empieza agregando sus dos líneas de CODEOWNERS y recién
  después mueve el requirement — en ese orden, porque GitHub lee el CODEOWNERS de
  la rama base (D10).
