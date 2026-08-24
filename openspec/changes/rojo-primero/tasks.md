# Tareas — rojo primero

El orden importa y no es negociable: los bloques 1 y 2 ponen al repo en condición
de cumplir, y el bloque 3 recién entonces exige. Al revés, el propio repo del
marco amanece rojo por algo que todavía no podía satisfacer, que es exactamente
el estreno que la constitución clasifica como breaking.

## Bloque 1 — Fixture negativo para las compuertas que ya existen

- [ ] 1.1 Inventariar las compuertas vivas del marco y, para cada una, si ya
      tiene una entrada de prueba que la ponga en rojo.
      **Evidencia**: la lista, con el comando y el código de salida de cada
      fixture negativo que ya existe.
- [ ] 1.2 Escribir el fixture negativo que falte, uno por compuerta.
      **Evidencia**: por cada fixture nuevo, el comando y su exit distinto de
      cero. Un fixture que no pone rojo no cuenta como hecho.
- [ ] 1.3 Cazar las compuertas que hoy NO pueden fallar. Es el hallazgo de la
      auditoría y hay que suponer que la del artefacto al día no era la única.
      **Evidencia**: por cada una, el caso que debía ponerla roja, el exit que
      devolvió antes y el que devuelve después.

## Bloque 2 — Cada compuerta declara qué requirement cubre

- [ ] 2.1 Definir el formato de la declaración y dónde vive, junto a la
      compuerta y no en un documento aparte (D2).
      **Evidencia**: el formato escrito y una compuerta ya declarada.
- [ ] 2.2 Declarar los requirements que cubre cada compuerta viva.
      **Evidencia**: el censo derivado, con el total de requirements y cuántos
      quedan con compuerta. El número de partida medido es alrededor de 6 de 39;
      si al derivarlo sale distinto, vale el derivado y se corrige el proposal.
- [ ] 2.3 Publicar el censo donde se lea sin abrir el CI.
      **Evidencia**: el archivo generado, y que se regenera y no se edita a mano.

## Bloque 3 — La compuerta que exige las tres propiedades

- [ ] 3.1 Check que corre cada fixture negativo y falla si alguno pasa en verde.
      **Evidencia**: su propio fixture negativo —una compuerta trucada para no
      poder fallar— y el exit distinto de cero que produce.
- [ ] 3.2 Check que falla cuando un requirement de un spec vivo no aparece en
      ninguna declaración.
      **Evidencia**: un requirement de prueba sin declarar, y el rojo.
- [ ] 3.3 Estreno: verificar que el repo del marco pasa los dos checks nuevos
      ANTES de hacerlos requeridos, y que el consumidor real también.
      **Evidencia**: la corrida verde en el marco y en el repo del consumidor, por
      código de salida.

## Bloque 4 — La propiedad de las afirmaciones

- [ ] 4.1 Llevar la exigencia de «comando y exit code» a la plantilla de pull
      request y a la plantilla de informe de auditoría.
      **Evidencia**: las plantillas, y un PR que la use.
- [ ] 4.2 Decidir y escribir si esta propiedad admite compuerta automática o si
      queda como regla de revisión declarada sin compuerta.
      **Evidencia**: la decisión escrita con su alternativa descartada. Que la
      respuesta sea «no se puede automatizar» es un resultado válido, siempre que
      quede declarada como regla sin compuerta y no se lea como enforzada.

## Fuera de alcance, escrito para que nadie lo agregue después

- Auditar retroactivamente las afirmaciones de PRs ya cerrados y del archive.
- Exigir compuerta para toda regla del marco. Hay reglas que solo sostiene el
  criterio humano y forzarlas produce checks decorativos.
- Pruebas de mutación sobre las compuertas (descartado en D1, con su motivo).
