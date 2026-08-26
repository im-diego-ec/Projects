---
artefacto: design
dri: PO
---

# orden-de-lectura — Design

## Por qué el aprobador no es un builder par

`AGENTS.md` fija que un proposal lo escribe un builder y lo revisa el otro. Hoy
el equipo es **una sola persona**, así que ese revisor no existe y la regla, tal
cual está escrita, no se puede cumplir: fingir que sí es exactamente el
"depende de que alguien se acuerde" que este marco existe para prohibir.

La sustitución declarada es una **revisión escéptica adversarial**: agentes
independientes cuyo único trabajo es refutar cada afirmación del cambio buscando
la evidencia que lo tumbe. No es equivalente a una segunda persona y no se
presenta como tal. Lo que sí tiene, medido en este mismo repositorio, es tasa de
captura: de 56 hallazgos reportados en la auditoría que originó este cambio, **27
murieron** al pasar por ese filtro.

Cuando exista una segunda persona, esta línea se borra y vuelve la regla por
defecto.

## Por qué el glosario va segundo y no último

Es un diccionario y la tentación es ponerlo al final. Medido: hay **220 enlaces**
con forma `](...glosario.md)` en 17 archivos, y de la página 03 en adelante todas
enlazan ahí. Que el lector lo haya visto **como página** antes de tropezarse con
el primer `[compuerta](…)` es la diferencia entre "sé qué es ese enlace" y "otro
link raro". Va segundo por función, no por importancia.

## Por qué se numeran las doce y no solo las siete del camino

Numerar solo el camino y dejar el resto alfabético devuelve el problema que la
numeración viene a resolver: media carpeta ordenada y media no. Y un archivo sin
número, al lado de once numerados, se lee como "esto no está terminado".

Mover las cinco de consulta a una subcarpeta se midió y son **dos rojos**: el
banco compara las subcarpetas contra una lista de tres, y `paginasDelAlcance()`
barre solo la raíz de `docs/` — mover esas páginas las sacaría del estándar de
lectura en silencio, y el alcance caería de 14 a 9, por debajo del piso de 10.
La subcarpeta compra orden pagando con cobertura.

## Por qué `docs/README.md` no se numera

Es el índice, GitHub lo renderiza solo al abrir la carpeta, y el módulo del banco
lo fija como constante. Con los números adelante, `ls` lo deja al final, que es
donde corresponde: se consulta, no se lee primero.

## La cuarta exención de la regla de dígitos

`docs/03-stack.md` tiene prohibido escribir un dígito fuera de un bloque de
comando —un número a mano al lado de algo que otro archivo declara envejece sin
que nada lo mida—. Sus veinte enlaces a otras páginas ahora llevan `02-`, `01-`.

La exención es **angosta a propósito**: dos dígitos, un guion, y un nombre que
termina en `.md`. Un `Node 22` en prosa sigue saliendo rojo — comprobado en las
dos direcciones. Y el número de una página no es un número que envejezca solo: si
el archivo se renombra, lo caza el verificador de enlaces, que es justo la
medición cuya ausencia esta regla compensaba.

## El falso verde que este cambio mata

Hasta hoy `consumidores.md` era subcadena de `censo-de-consumidores.md`, y el
repositorio ya se había comido una vez el falso verde de dar por indexada una
página gracias a la mención de otra. Con los números la colisión murió sola.

Las dos afirmaciones del banco que describían esa colisión **se reescribieron
para decir que ya no se puede medir**, en vez de dejarlas afirmando algo falso.
La regla —buscar el destino del enlace y no el nombre suelto— se conserva: no
depende de los nombres de hoy, y el próximo par que colisione va a llegar sin
avisar.
