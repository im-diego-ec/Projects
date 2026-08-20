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

- [ ] 0.1 Elegir la rebanada con el PO y un builder: qué entrevistas, qué proceso
      end-to-end, dónde corta y por qué es representativa del material de Supply
      Chain. Evidencia: la sección 1 de `piloto/pre-registro.md`.
- [ ] 0.2 Declarar los dos brazos, quién corre cada uno y el orden (A primero), y
      escribir el sesgo que ese orden introduce **a favor del brazo B**. Un sesgo
      declarado se puede corregir al leer; uno tapado invalida la medición.
      Evidencia: sección 2 del pre-registro.
- [ ] 0.3 Nombrar al scorer —el builder que **no** corre ninguno de los dos
      brazos— y dejar por escrito que arma el inventario de materia prima desde
      las transcripciones **antes** de ver cualquier salida. Evidencia: sección 3
      del pre-registro, y el commit del inventario anterior al de las salidas.
- [ ] 0.4 Escribir la tabla de los siete criterios (G0–G6) con sus umbrales ya
      fijados, tal como están en `design.md` D6, y la regla de veredicto.
      Evidencia: sección 4 del pre-registro.
- [ ] 0.5 Planilla de horas por sesión, vacía, con las columnas ya definidas (rol,
      brazo, fecha, horas de reloj). Sin esto, G4 se mide de memoria y la memoria
      siempre favorece a lo nuevo. Evidencia: sección 5 del pre-registro.
- [ ] 0.6 Pinar la versión exacta de la herramienta y anotarla. Evidencia: sección
      6 del pre-registro con la versión, y el comando de instalación registrado.
- [ ] 0.7 Commitear el pre-registro **completo** antes de la primera sesión del
      piloto. Evidencia: la fecha del commit del pre-registro es anterior a la
      fecha de la primera entrada de la planilla de horas.

## 1. Lo que este change NO decide (pendiente de OK humano explícito)

Ninguna de estas cuatro se resuelve por defecto, y ninguna la toma un agente.

- [ ] 1.1 **Dependencia de terceros** (⚠️ de `AGENTS.md`): OK para usar la
      herramienta en el piloto, y —por separado, y solo si el veredicto es
      verde— OK para que su pin entre al carril que consumen todos. Evidencia: el
      OK en la sesión, con la versión y el alcance de módulos escritos.
- [ ] 1.2 **Material con datos de personas**: dónde viven las transcripciones, y
      si pueden pasar por un modelo. El repositorio no es su custodio (D3) y el
      piloto no arranca sin esta decisión tomada por una persona. Evidencia: la
      decisión escrita en el pre-registro, con quién la tomó.
- [ ] 1.3 **Correr el piloto**: consume tiempo del PO y de dos builders.
      Evidencia: el OK y las fechas reservadas.
- [ ] 1.4 **Cadena de herramientas**: confirmar si la instalación exige Python y
      `uv` además de Node, y para qué módulo. Hoy está declarado como
      incertidumbre en `design.md`. Evidencia: la instalación corrida en una
      máquina limpia, con lo que pidió de verdad.

## 2. El piloto (arranca el lunes 2026-08-24)

- [ ] 2.1 **Brazo A (control)**: desde las transcripciones directo a `proposal.md`
      y deltas de specs de la rebanada, con la asistencia de agente habitual.
      Evidencia: los artefactos del brazo A, y las horas anotadas por sesión en la
      planilla.
- [ ] 2.2 **Brazo B**: fases 1 y 2 de la herramienta sobre el **mismo** material
      → informe de descubrimiento, brief y PRD; y desde el PRD, `proposal.md` y
      deltas. Evidencia: los artefactos del brazo B y sus horas.
- [ ] 2.3 Registrar **cada** edición que haya hecho falta hacer sobre el
      directorio de instalación de la herramienta para cortar en el PRD (G0). Si
      la lista queda vacía, decirlo explícitamente: es el resultado esperado y hay
      que poder distinguirlo de «no se miró». Evidencia: estado de git del espacio
      de trabajo del piloto.
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

## 5. SOLO si el veredicto es VERDE

Nada de este bloque se adelanta. Adelantarlo compra costo hundido y el costo
hundido decide veredictos.

- [ ] 5.1 Check de forma: un artefacto de la ubicación declarada que contenga
      encabezados de delta o escenarios es rojo. Evidencia: fixture con un insumo
      con forma de spec en rojo, y el mismo insumo sin esa forma en verde.
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
      archivarlo por separado: es el único ítem de acá que vale con independencia
      del piloto (D7). Evidencia: el change nuevo, con su delta y su archive.
- [ ] 6.4 Borrar el directorio de este change en el mismo PR del ADR. Un delta que
      el piloto refutó no se funde en el contrato, y un change que nadie archiva ni
      descarta es el zombi que el bloque 4 existe para evitar. Evidencia: el
      directorio ausente y `validate --all --strict` en verde por código de salida.

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
