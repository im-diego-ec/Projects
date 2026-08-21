---
artefacto: tasks
dri: Builder 1
aprueba: Builder 2 (builder par)  # el delta lo gatea además PO (PO) por CODEOWNERS
informado: PO
estado: pendiente-de-revision
experimental: true
veredicto_antes_de: 2026-09-21
---

El orden manda, y acá manda más que de costumbre porque **la mitad de los bloques
no se ejecuta**: el 5 y el 6 son excluyentes y los decide el veredicto del
piloto. Nada del bloque 5 se adelanta «para tenerlo listo»: adelantar la
maquinaria de una capa que todavía no se validó es la forma más eficiente de que
el veredicto salga verde por costo hundido.

El bloque 0 es bloqueante por una razón metodológica, no burocrática: un umbral
escrito después de ver el resultado no es un umbral. El sello de tiempo de git es
la evidencia.

Toda verificación de herramientas se hace **por código de salida**, nunca
grepeando su salida.

## 0. Pre-registro (BLOQUEANTE: antes de correr un solo brazo)

- [ ] 0.0 Escribir la pregunta que el piloto responde, antes que cualquier umbral.
      Se agregó el 2026-08-21: Builder 1 aclaró que el descubrimiento ya está hecho, y
      los dos brazos que el pre-registro tenía comparaban **hacer** descubrimiento
      con la herramienta y sin ella, así que ninguno se podía correr. Un instrumento
      que mide lo que no va a pasar devuelve «no medido» en las siete celdas, o lo
      reinterpreta alguien el lunes con el resultado a la vista. Evidencia: la
      sección 0 de `piloto/pre-registro.md`, y `tail -n +2 piloto/horas.csv | wc -l`
      igual a cero, que es lo que demuestra que la reescritura sigue siendo
      pre-registro y no una corrección con fecha posterior.
- [ ] 0.1 Elegir la rebanada con el PO y un builder: qué piezas del corpus, qué
      proceso end-to-end, dónde corta, si el prototipo la cubre, y por qué es
      representativa del corpus de Supply Chain. Evidencia: la sección 1 de
      `piloto/pre-registro.md`.
- [ ] 0.2 Declarar los dos brazos, quién corre cada uno y el orden (A primero), y
      escribir el sesgo que ese orden introduce **a favor del brazo B**. Un sesgo
      declarado se puede corregir al leer; uno tapado invalida la medición.
      Evidencia: sección 2 del pre-registro.
- [ ] 0.3 Nombrar al scorer —el builder que **no** corre ninguno de los dos
      brazos— y dejar por escrito que arma el inventario de materia prima desde
      las transcripciones **antes** de ver cualquier salida. Con tres personas el
      rol choca con la firma del veredicto, y eso no se arregla nombrando gente:
      hay que **elegir** cuál de las dos combinaciones se usa y **escribir el
      conflicto que queda**, pegado al ciego imperfecto que `design.md` ya
      declara. Evidencia: sección 3 del pre-registro, con la elección hecha y el
      conflicto residual escrito, y el commit del inventario anterior al de las
      salidas.
- [ ] 0.4 Escribir la tabla de los siete criterios (G0–G6) con sus umbrales ya
      fijados, tal como están en `design.md` D6, la regla de veredicto, y el
      comando exacto que produce la evidencia de cada uno, diciendo también
      cuáles **no** tienen comando y dependen de lectura humana. Un criterio sin
      comando no es menos válido: es menos verificable, y eso hay que saberlo
      antes de correr y no al puntuar. Evidencia: sección 4 del pre-registro.
- [ ] 0.5 Planilla de horas por sesión, vacía, con las columnas ya definidas (rol,
      brazo, fecha, horas de reloj). Sin esto, G4 se mide de memoria y la memoria
      siempre favorece a lo nuevo. Evidencia: sección 5 del pre-registro.
- [ ] 0.6 Pinar la versión exacta de la herramienta y anotarla. Evidencia: sección
      6 del pre-registro con la versión, y el comando de instalación registrado.
- [ ] 0.7 Commitear el pre-registro **completo** antes de la primera sesión del
      piloto. Evidencia: la fecha del commit del pre-registro es anterior a la
      fecha de la primera entrada de la planilla de horas.

Las cuatro que siguen se agregaron al bloque 0 después de escribirlo, porque el
bloque se podía tildar entero sin que existiera ninguna de ellas: la checklist
habría dicho «pre-registro hecho» sobre un pre-registro que no permite medir G1,
G2 ni G4.

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
- [ ] 0.12 Campo `origen` del inventario, con sus dos valores (`corpus` y
      `derivado`) y la regla dura de que un `derivado` no sostiene un escenario sin
      marca de supuesto. Se agregó el 2026-08-21: con el corpus ya escrito, la
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
      `_bmad/` se commitea **apenas** se instala, antes de trabajar. «Fuera de
      todo repositorio» (D5) significa fuera de Projects, de `plantilla/` y de los
      consumidores; **no** significa sin git, porque la evidencia de G0 es un diff
      de git y sin él el criterio queda no medido, que por la regla de veredicto
      cuenta en contra. Evidencia: el primer commit del espacio, y el código de
      salida de `node piloto/arnes/verificar-brazo.mjs <espacio> B`.

## 1. Lo que este change NO decide (pendiente de OK humano explícito)

Ninguna de estas seis se resuelve por defecto, y ninguna la toma un agente. Las
dos últimas nacieron el 2026-08-21, cuando la respuesta del Builder 1 a 1.2 la resolvió
y a la vez dejó a la vista lo que no cubría.

- [ ] 1.1 **Dependencia de terceros** (⚠️ de `AGENTS.md`): OK para usar la
      herramienta en el piloto, y —por separado, y solo si el veredicto es
      verde— OK para que su pin entre al carril que consumen todos. Evidencia: el
      OK en la sesión, con la versión y el alcance de módulos escritos.
- [x] 1.2 **Material con datos de personas**: dónde vive el corpus, y si puede
      pasar por un modelo. El repositorio no es su custodio (D3) y el piloto no
      arranca sin esta decisión tomada por una persona. **RESUELTA: la contestó
      Builder 1 el 2026-08-21** — el descubrimiento se produce fuera del repositorio y
      entra como insumo al inicio de la sesión, así que el repositorio no es su
      custodio, y entrar como insumo de la sesión implica que sí pasa por un
      modelo. Evidencia: `piloto/pre-registro.md` sección 7, con el enunciado
      textual, la fecha, y la separación entre lo que la respuesta cubre y lo que
      deja abierto.
- [ ] 1.3 **Correr el piloto**: consume tiempo del PO y de dos builders.
      Evidencia: el OK y las fechas reservadas.
- [ ] 1.4 **Cadena de herramientas**: confirmar si la instalación exige Python y
      `uv` además de Node, y para qué módulo; **y** si la fase 1 ingiere un corpus
      terminado en vez de elicitar. La segunda mitad se agregó el 2026-08-21: el
      ensayo del 2026-08-20 midió que la herramienta se instala (exit 0), no que
      acepte material terminado, porque cuando se corrió la pregunta del piloto era
      otra. Es lo que puede tumbar el brazo B el lunes. Evidencia: la instalación
      corrida en la máquina del brazo B con lo que pidió de verdad, y la fase 1
      corrida contra una pieza del corpus con lo que pasó.
- [ ] 1.5 **Despersonalización del corpus**: si las piezas que entran a la sesión
      traen nombres de empleados y juicios sobre su propio trabajo, o ya vienen
      despersonalizadas. Es el residuo de 1.2 y es **otra** frontera: custodia y
      contenido no son lo mismo, y la respuesta del Builder 1 cierra la primera. Depende
      de ver el corpus, así que no se puede cerrar sin él. Evidencia: la decisión
      escrita en el pre-registro (1.5), con quién la tomó.
- [ ] 1.6 **Inventario de piezas del corpus**: el identificador y la letra de tipo
      (`E`/`D`/`P`/`F`) de cada pieza, que es lo que la rebanada va a citar. Lo
      entrega el PO con el corpus. Sin esto la sección 1 del pre-registro no se
      puede llenar sin inventar nombres. Evidencia: la tabla identificador-pieza,
      que vive **con el corpus** y fuera del repositorio (D3), y la sección 1
      citando esos identificadores.

## 2. El piloto (arranca el lunes 2026-08-24)

- [ ] 2.1 **Brazo A (control)**: desde el corpus directo a `proposal.md`, deltas,
      tabla de trazabilidad, `design.md` y `tasks.md` de la rebanada, con la
      asistencia de agente habitual y sin ningún artefacto intermedio producido
      dentro del piloto. Evidencia: los cinco artefactos del brazo A, y las horas
      anotadas por sesión en la planilla.
- [ ] 2.2 **Brazo B**: fases 1 y 2 de la herramienta sobre el **mismo** corpus →
      informe de descubrimiento, brief y PRD; y desde el PRD, las mismas cinco
      salidas que el brazo A. Evidencia: los artefactos del brazo B y sus horas.
- [ ] 2.3 Registrar **cada** edición que haya hecho falta hacer sobre el
      directorio de instalación de la herramienta, sea para que ingiera el corpus o
      para cortar en el PRD (G0). Si la lista queda vacía, decirlo explícitamente:
      es el resultado esperado y hay que poder distinguirlo de «no se miró».
      Evidencia: estado de git del espacio de trabajo del piloto.
- [ ] 2.6 Anotar **aparte** todo lo que la herramienta elicite del PO y que el
      corpus no contestaba, con su brazo, su fecha y la pregunta que lo produjo. No
      entra a los denominadores de G1, G2 ni G3, que se congelan en el commit del
      inventario: si entrara, los dos brazos dejarían de trabajar sobre el mismo
      material y la comparación se rompería en silencio. La regla es simétrica para
      los dos brazos o es un sesgo. Evidencia: la lista, y la declaración de que el
      inventario no se tocó después de su commit.
- [ ] 2.4 Correr el piloto **fuera de todo repositorio** (D5). Nada se escribe en
      los consumidores, ni en `plantilla/`, ni en `openspec/specs/`. Evidencia:
      los repos sin un solo commit del piloto.
- [ ] 2.5 Anotar, mientras pasa y no al final, cada punto donde el piloto dependió
      de que alguien se acordara de algo (insumo de G5). Al final de un piloto de
      cuatro semanas esa lista se reconstruye mal. Evidencia: la lista con fecha
      por ítem.

## 3. Medición y veredicto

- [ ] 3.1 El scorer arma el inventario de materia prima desde las transcripciones
      y clasifica cada ítem (regla de negocio / contexto / preferencia).
      Evidencia: `piloto/mediciones.md`, sección inventario, con el id de cada
      ítem.
- [ ] 3.2 Puntuar G1 (procedencia 100%) y G2 (caídos en silencio) contra ese
      inventario, ítem por ítem y para los dos brazos. Evidencia: las dos listas
      con veredicto por ítem.
- [ ] 3.3 Puntuar G3 (invención): afirmaciones de regla de negocio sin origen
      rastreable y sin marca de supuesto, con la **cita textual** de cada una.
      Evidencia: la lista; para el brazo B el umbral es cero absoluto.
- [ ] 3.4 Cerrar G4: horas de la planilla, y los gates de siempre sobre la salida
      del brazo B —`openspec validate --strict` y el guardrail de deltas—
      verificados **por código de salida**. Evidencia: las horas y los dos exit
      codes, con el comando exacto.
- [ ] 3.5 Cerrar G5: la lista del 2.5 con su columna de destino («check propuesto»
      o «queda fuera, y por qué»). Si todo queda fuera, el techo del veredicto es
      amarillo y hay que escribirlo así. Evidencia: la lista completa.
- [ ] 3.6 Cerrar G6: buscar en los artefactos y PRs del piloto cada vez que el
      insumo se usó como autoridad de comportamiento sin escenario que lo
      respalde. Si aparece alguna, el check de D2 se estrena rojo desde el día uno
      y eso queda anotado como consecuencia, no como nota al pie. Evidencia: la
      búsqueda y su resultado.
- [ ] 3.7 Escribir `piloto/veredicto.md`: los siete resultados con sus números, el
      veredicto según la regla de D6, y las tres firmas (PO por fidelidad al
      negocio, scorer por la medición, Builder 1 por el veredicto). Evidencia: el
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

## 5. SOLO si el veredicto es VERDE

Nada de este bloque se adelanta. Adelantarlo compra costo hundido y el costo
hundido decide veredictos.

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

## 6. SOLO si el veredicto es AMARILLO o ROJO

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

- [ ] 7.1 Anotar en `docs/reglas-no-escritas.md` qué queda automático y qué queda
      como disciplina declarada: que la procedencia se verifica pero su calidad
      no; que el insumo puede envejecer hasta mentir sin poner nada en rojo; y que
      el material crudo fuera del repositorio no lo hace cumplir ningún check.
      Evidencia: las filas nuevas con su estado 🟢/🟡/🔴.
- [ ] 7.2 Registrar el resultado en el board del área como cierre del pendiente de
      descubrimiento, con el link al veredicto o al ADR. Evidencia: el issue
      actualizado.

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
