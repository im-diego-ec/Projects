---
artefacto: hoja-de-observacion
dri: quien corra la sesión
informado: Builder 1, PO
experimental: true
---

# El lunes: usar la herramienta y ver cómo fue

**Esto no es un experimento.** Builder 1 lo decidió el 2026-08-22: el lunes se usa la
herramienta sobre el corpus completo y se observa el resultado. No hay brazo manual, no
hay comparación, no hay veredicto que aprobar o reprobar.

Esta hoja es **la única que rige el lunes**. El instrumento del experimento que no se va a
correr sigue en [`pre-registro.md`](pre-registro.md), con el razonamiento entero y lo que
se descartó: se lee cuando haya que decidir si esto entra al marco, no el lunes.

---

## Por qué igual hay algo escrito antes

Porque «ver cómo fue» sin anotar nada de antemano termina siendo «me acuerdo de lo que
salió bien». No es mala fe: es cómo funciona la memoria de una jornada larga. Media página
escrita antes cuesta cinco minutos y es la diferencia entre una observación y una
impresión.

## Lo que se anota MIENTRAS pasa

Tres cosas, y las tres se pierden si se dejan para el final:

| Qué | Dónde | Por qué esta |
|---|---|---|
| **Cada punto que funcionó solo porque alguien se acordó** | [`bitacora-g5.md`](bitacora-g5.md) | Es lo más valioso de un primer uso. Lo que hoy es memoria de quien corre la sesión, mañana es un paso que otro se saltea sin saber que existía |
| **Cada pregunta que la herramienta le hizo al PO** | `lista-de-observacion.md` del espacio de trabajo | Dice cuánto PO consume, que es el costo que nadie ve hasta que el PO no está disponible |
| **Las horas, con su fecha y su categoría** | [`horas.csv`](horas.csv) | Un número sin comparación no decide nada, pero sin el número no hay nada que comparar la próxima vez |

## Lo que se contesta AL FINAL

Cinco preguntas. Ninguna necesita un brazo manual: las cinco se contestan mirando lo que
salió contra lo que PO entregó.

1. **¿Hubo que tocarle las tripas a la herramienta para que trague el corpus?** Si sí, no
   se adoptó una herramienta: se mantiene un fork ajeno. Lo verifica el arnés, que compara
   los directorios de instalación —`node arnes/verificar-brazo.mjs <espacio> B`—.
2. **¿Cada escenario que salió dice de dónde salió?** Un escenario que no se rastrea a una
   pieza del corpus es un escenario que alguien va a tener que defender sin fuente.
3. **¿Se perdió alguna regla de negocio?** Ésta es la que exige el inventario del PO
   (decisión 1.6): sin la lista de lo que entró no se puede decir «esto no llegó», solo
   «creo que llegó todo».
4. **¿Se inventó algo que el corpus no dice?** Un escenario que afirma lo que el material
   no afirma es peor que uno que falta: el que falta se nota.
5. **¿PO reconoce su negocio en cada escenario?** La más importante de las cinco, y la
   que menos depende de herramientas. Se marca **describe / no describe / no puedo
   saberlo**, y «no puedo saberlo» cuenta como no reconocido.

Y dos controles que son un código de salida, no una opinión: la salida pasa el guardrail
de deltas y `openspec validate --all --strict`. Si no pasan, lo que salió no es un spec
todavía.

## El corpus entra completo, y eso tiene una consecuencia

Builder 1 decidió el 2026-08-22 que **entra todo, sin elegir una rebanada**. Eso saca de encima
la pregunta de si el pedazo elegido representaba al resto, y saca el trabajo de elegirlo.

Pero deja un borde sin auditar, y conviene tenerlo a la vista: cuando había una rebanada,
lo que quedaba afuera estaba **declarado**, así que un ítem no cubierto se podía revisar
contra ese corte. Con el corpus completo, un ítem que no se convirtió se puede explicar
con «eso quedaba afuera» y nadie tiene contra qué comprobarlo.

**El arreglo es de una línea y es de la persona que observa:** si un ítem del inventario
no terminó en ningún escenario, se escribe **por qué**, ítem por ítem. No hace falta un
umbral; hace falta que la razón esté escrita al lado del identificador.

## Lo que esto NO decide

- **No decide si la herramienta entra al marco para todos.** Eso nunca iba a salir de una
  corrida: el instrumento original ya decía que un buen resultado solo habilitaba una
  segunda vuelta. Sigue igual de cierto sin experimento.
- **No dice si sale más barato que hacerlo a mano.** Sin brazo manual no hay con qué
  comparar. Las horas quedan anotadas para la próxima.
- **No dice si la herramienta pierde más material que una persona.** Sí dice si perdió
  reglas de negocio, que es una pregunta absoluta.

## La ingesta ya está probada: la herramienta pide los documentos ella misma

**Medido el 2026-08-22 sobre la skill instalada**, no sobre la web. `bmad-prd` declara esto
como su **primer movimiento**:

> *«**Brain dump.** Always the first move… Ask for verbal context *and* any existing inputs
> they want you to read — product brief, research, customer transcripts, competitive
> analysis, prior PRD draft, design docs. **Paths or paste; big docs are fine, you will
> subagent-extract.**»*

Nombra por su nombre los tipos de pieza que PO tiene —investigación, transcripciones,
documentos de diseño— y dice que los documentos grandes están bien. Y su regla interna es
**«Extract, don't ingest»**: manda cada documento a un subagente que extrae, y el principal
arma el PRD con los extractos.

Así que no hay prueba que hacer antes: **se entra por `bmad-prd` y se le dan las piezas**.
La fase 1 (Analysis) se saltea, está marcada opcional por el propio proveedor.

### Y trae una respuesta a la pregunta 3 por su cuenta

Tiene un paso llamado **Input reconciliation** que corre un subagente por cada documento
entregado y **reporta los huecos**: *«Surface gaps — especially qualitative ideas (tone,
voice, feel) the FR structure silently drops»*.

O sea que la herramienta dice ella misma qué dejó afuera. **Eso no reemplaza al inventario
del PO: lo cruza.** Dos fuentes independientes para la misma pregunta valen más que
cualquiera de las dos sola — si la herramienta dice «no dejé nada» y el inventario muestra
tres piezas sin escenario, esa diferencia es el hallazgo.

### Dos cosas de configuración que cuestan minutos y se pagan caro

**El idioma. Builder 1 lo confirmó el 2026-08-22: entrada y salida en castellano.** Sale en
inglés por defecto, así que es lo primero que se cambia, antes de la primera pregunta.
En `_bmad/bmm/config.yaml`, dos líneas:

```yaml
communication_language: spanish
document_output_language: spanish
```

Son **nombres de idioma en texto libre**, no códigos de locale. Y son dos campos separados
a propósito —la herramienta permite conversar en uno y escribir en otro—: acá los dos van
en castellano, porque los specs del área están en castellano y la sesión es con PO.

`bmad-prd` **sí respeta la config**: su skill dice que resuelve `{communication_language}` y
que se queda en él «for every turn for the entire run, not just the greeting». Verificado
leyendo la skill instalada, no la web.

**La excepción conocida, para que no sorprenda:** hay un bug abierto del proveedor
(issue #1457) por el cual **`bmad-help` ignora la config** y contesta en inglés. Es solo
esa skill —el reporte identifica que su `help.md` no carga la variable— y no afecta al
flujo del PRD. Si se usa `bmad-help` y contesta en inglés, es eso y no una config mal
puesta.

**El `.memlog.md` es la memoria de la corrida**, y la herramienta lo dice textual:
*«whatever isn't logged is lost on resume»*. Si la sesión se corta, lo que sobrevive es ese
archivo. Necesita `uv` para escribirse, que ya está instalado (0.12.0).


**Antes de abrir el corpus entero.** Se entra por la fase 2 de la herramienta
(`bmad-prd`), no por la fase 1: el mapa de workflows del proveedor marca la fase 1 como
opcional y dice que `bmad-prd` hace *source-extract* de documentos en su Discovery, y que
«ninguna de las dos skills requiere la otra».

Lo que **no** está medido es si source-extrae un corpus cualquiera —entrevistas, mapas de
proceso, planillas— o solamente un documento con la forma que la herramienta espera. Así
que la primera prueba es con **una sola pieza**:

1. Elegí una pieza del inventario, la más típica.
2. Entrá por `bmad-prd` y dale esa pieza como fuente.
3. Anotá **qué hizo**: la leyó y extrajo, o te empezó a preguntar como si no existiera.

**Si te pregunta en vez de leer, ese es el resultado del lunes** — y es un resultado útil,
porque dice qué forma tendría que tener un corpus para que la herramienta lo aproveche. No
es un fracaso del día: es lo que veníamos a averiguar. Lo que sí sería un desperdicio es
descubrirlo a las cuatro horas de haberle dado todo.

Antes había un brazo manual al que caerse. Ahora no hay, y por eso esta prueba va primero
y con una pieza sola.

---

## Lo que hace falta antes de abrir el material

| # | Qué | Quién |
|---|---|---|
| 1 | **El inventario del corpus**: una fila por pieza, con su identificador, qué es y dónde está. Es lo que la pregunta 3 necesita para no ser una impresión | PO, decisión 1.6 |
| 2 | Una mirada al corpus antes de abrirlo en la sesión, y el resultado anotado —«revisadas N piezas, cero nombres»— | quien lo reciba, decisión 1.5 |
| 3 | Si el prototipo que ya existe cubre parte de esto, y qué parte | PO |

Nada más. El reparto de roles del instrumento original —un builder que corre y otro que
puntúa sin haber corrido— **no aplica**: existía para que nadie juzgara su propio
veredicto, y acá no hay veredicto.
