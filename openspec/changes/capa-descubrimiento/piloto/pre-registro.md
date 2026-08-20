---
artefacto: pre-registro
dri: Builder 1
aprueba: Builder 2 (builder par)
informado: PO
estado: pendiente-de-completar
experimental: true
veredicto_antes_de: 2026-09-21
---

# capa-descubrimiento — Pre-registro del piloto

Este archivo existe por una sola razón, y la razón es la fecha del commit. Los
umbrales del piloto ya estaban escritos en prosa dentro de `design.md`, y un
design se lee: se puede matizar, se puede releer con el resultado en la mano y se
puede entender distinto sin que nadie mienta. Un pre-registro es otra cosa. Es la
misma tabla con un sello de tiempo de git delante del primer dato, y ese sello es
la única evidencia de que los números no se acomodaron después de ver la salida.
La tarea 0.7 lo pide commiteado **antes** de la primera sesión, y la comprobación
es aritmética: la fecha de este commit tiene que ser anterior a la fecha de la
primera fila de `horas.csv`.

Va junto con `convencion-de-procedencia.md`, en el mismo commit y por el mismo
motivo: sin la convención de identificadores y sin la rúbrica de clasificación,
tres de los siete criterios no tienen vara con qué medirse. Los dos archivos son
pre-registro; están separados porque uno se lee entero antes de arrancar y el
otro se consulta ítem por ítem mientras se puntúa.

**Cómo se llena lo que falta.** Los huecos dicen `PENDIENTE (decide: X)` con
nombre y con la tarea que lo resuelve. Un hueco se cierra editando este archivo y
commiteándolo, siempre **antes** de la primera sesión del brazo que ese hueco
afecta. Después de esa sesión, un cambio a este archivo ya no es un
pre-registro: es una corrección con fecha posterior, y se escribe como tal, con
el motivo y sin borrar lo anterior.

**Restricción de forma de todo este directorio.** Ningún archivo de `piloto/`
lleva encabezados de bloque de delta (ADDED, MODIFIED, REMOVED) ni encabezados de
escenario de OpenSpec. Se verificó que hoy **nada lo impide**: un archivo bajo
`openspec/changes/<change>/piloto/` con esa forma pasa el guardrail de deltas y
pasa `validate --all --strict`, los dos en código de salida cero, porque ninguno
de los dos mira ahí. O sea que la regla de D2 se cumple acá por disciplina, sin
red. Eso no es una nota al pie: es evidencia para G6, y está escrita antes de
correr el piloto para que no se lea como descubrimiento posterior.

---

## 1. La rebanada

Un proceso end-to-end que aparezca en las entrevistas, elegido por el PO y un
builder antes de arrancar. Los dos brazos trabajan sobre **exactamente** el mismo
material: si los insumos difieren, la comparación mide dos cosas distintas y no
hay corrección posible después.

| Qué se declara | Valor |
|---|---|
| Entrevistas incluidas, por identificador | PENDIENTE (decide: PO (PO) con un builder, tarea 0.1) |
| Proceso end-to-end elegido | PENDIENTE (decide: PO (PO), tarea 0.1) |
| Dónde corta, dicho por el extremo que queda afuera | PENDIENTE (decide: PO (PO), tarea 0.1) |
| Por qué es representativa del material de Supply Chain | PENDIENTE (decide: PO (PO), tarea 0.1) |

Las entrevistas se nombran con los identificadores de `convencion-de-procedencia.md`,
nunca con el nombre de quien habló. La tabla que traduce identificador a persona
vive con el material, fuera del repositorio (D3).

**Por qué se declara dónde corta y no solo qué entra.** Un proceso sin borde
declarado se puede ensanchar mientras se trabaja, y ensancharlo a mitad de camino
convierte un ítem no cubierto en «eso quedaba afuera». Es la forma más limpia de
que G2 dé cero sin haber cubierto nada.

---

## 2. Los brazos, el protocolo y la regla de parada

### Quién corre qué

| Rol | Quién | Estado |
|---|---|---|
| Brazo A (control) y brazo B | Builder 2 | propuesto; lo confirma la tarea 1.3 |
| Scorer | Builder 1 | propuesto; ver la colisión de roles en la sección 3 |
| Firma de fidelidad al negocio | PO (PO) | propuesto; lo confirma la tarea 1.3 |
| Firma del veredicto | Builder 1 | regla del área, no se negocia acá |

**Los dos brazos los corre la misma persona, y eso es a propósito.** Repartirlos
entre dos builders cambiaría la variable medida: dejaría de ser «el método» y
pasaría a ser «el método más quién lo usa», con n=1 en cada celda. El costo de
que sea la misma persona es el sesgo de orden, que se declara abajo.

### El orden, y a quién favorece

Primero A, después B, sobre el mismo material. Quien escriba A ya va a haber
pensado el problema cuando llegue a B, así que **el sesgo del orden favorece al
brazo B**. La consecuencia práctica, que hay que tener puesta al leer el
resultado: una victoria de B está inflada, y un empate o una derrota de B son una
señal fortísima. Por eso los dos criterios que justifican la existencia de la capa
(G2 y G3) piden **cero absoluto** y no «mejor que el control».

### El conjunto de salidas, idéntico para los dos brazos

Cada brazo entrega, sin excepción, las mismas tres cosas:

1. `proposal.md` de la rebanada;
2. los deltas de specs de la rebanada;
3. la tabla de trazabilidad con el formato de `convencion-de-procedencia.md`.

El brazo B produce además el informe de descubrimiento, el brief y el PRD, que
son insumos suyos y no entran en la comparación de salidas: lo que se compara es
lo que llega al contrato, no lo que se usó para llegar.

Si un brazo entrega dos de las tres, no entregó. Un brazo sin tabla de
trazabilidad hace que G1 y G2 no se puedan puntuar sobre él, y eso se registra
como criterio no medido, jamás como cero.

### La regla de parada, idéntica para los dos brazos

Sin regla de parada, las horas de G4 miden una cantidad indefinida y gana el brazo
que se detiene cuando le parece suficiente. Un brazo termina cuando se cumplen
las dos condiciones, y solo entonces:

**(a) Condición mecánica.** `node verificar-brazo.mjs <espacio> <brazo>` devuelve
código de salida cero. Eso significa: guardrail de deltas en cero, `validate --all
--strict` en cero y, para el brazo B, G0 en cero. Se lee por código de salida, no
por lo que imprime.

**(b) Condición declarada.** Quien corre el brazo escribe, con fecha, que cada
paso del proceso declarado en la sección 1 tiene en la tabla de trazabilidad al
menos una fila: cubierto por un escenario, fuera de alcance declarado, o pregunta
abierta. No «me parece que está completo»: la frase nombra los pasos.

**Techo, idéntico para los dos brazos: 5 sesiones.** Si al cabo de la quinta
sesión un brazo no cumple (a) y (b), se detiene donde está y se registra como
«detenido por techo». Para el brazo B eso hace fallar G4, porque G4 exige que su
salida pase los mismos gates. El número 5 es arbitrario y está acá justamente por
eso: un techo arbitrario escrito antes es falsable, y un techo razonable decidido
después no mide nada. Si a alguien le parece el número equivocado, se cambia en
este archivo **antes** de la primera sesión, y el commit lo demuestra.

**Lo que la regla de parada NO hace.** No garantiza que los dos brazos hayan
trabajado igual de bien: garantiza que se detuvieron por la misma condición. Es
todo lo que una regla de parada puede dar, y es lo que hoy falta.

### Protocolo del brazo A, escrito para que sea un control

D6 define el control como «el camino de hoy, con la asistencia de agente que se
usa habitualmente». Tal cual, eso no es un control: es lo que cada uno haga. Se
concreta así, y las cuatro líneas son parte del pre-registro:

- **Insumo**: las transcripciones de la rebanada, sin ningún artefacto
  intermedio. Si aparece un documento intermedio, el brazo A dejó de ser el
  control y hay que anotarlo.
- **Asistencia**: el agente de codificación con la configuración por defecto del
  área (modelo y effort del default barato, sin escalada). Escalar el modelo en
  un brazo y no en el otro invalida G4, y además exige OK humano previo.
- **Reglas cargadas**: las mismas que el brazo B, o sea el
  `openspec/config.yaml` del espacio de trabajo (ver
  `arnes/config-espacio-de-trabajo.yaml`). Un brazo que redacta con las reglas del
  marco cargadas y otro que no vuelve la comparación injusta por construcción, y
  la diferencia se leería como mérito del método.
- **Prohibido**: mirar cualquier salida del brazo B, que todavía no existe, y
  mirar el inventario del scorer, que sí existe y está commiteado antes.

---

## 3. El scorer, y la colisión de roles

**Quién puntúa.** El builder que no corrió ninguno de los dos brazos. Con el
reparto propuesto en la sección 2, es Builder 1.

**Qué hace antes de ver cualquier salida.** Arma el inventario de materia prima
desde las transcripciones, le asigna a cada ítem su identificador y su clase
según la rúbrica de `convencion-de-procedencia.md`, y **commitea ese inventario**.
El orden es lo único mecánico que tiene esta parte: el commit del inventario tiene
que ser anterior al commit de las salidas de los brazos, y eso se lee con
`git log`. No prueba que el scorer no haya espiado; prueba que la lista contra la
que se puntúa no se escribió después de conocer el resultado.

### La colisión de roles, declarada con su elección hecha

D6 pide dos cosas que con tres personas no entran juntas: que el scorer sea el
builder que no corrió ningún brazo, y que Builder 1 firme el veredicto. Las dos
combinaciones posibles tienen conflicto:

- **Builder 2 corre los brazos, Builder 1 puntúa y firma.** El que firma el veredicto
  produjo la medición, pero **no** produjo las salidas que se miden. Su esfuerzo
  no está invertido en ninguno de los dos brazos.
- **Builder 1 corre los brazos, Builder 2 puntúa, Builder 1 firma.** El que firma el veredicto
  tiene trabajo propio invertido en el brazo B y firma el veredicto sobre su
  propia salida.

**Se elige la primera**, porque el conflicto que deja es más chico y es de otro
tipo: sesgo metodológico sin esfuerzo hundido. La segunda pone al firmante a
juzgar su propio trabajo, que es exactamente lo que un gate existe para evitar.

**El conflicto residual, dicho sin adornos: el scorer y el firmante del veredicto
son la misma persona, y nadie audita la clasificación del scorer.** Lo que lo
acota no es la buena voluntad, son tres cosas escritas antes: la rúbrica de
clasificación está pre-registrada, el inventario se commitea antes de las salidas,
y G2 y G3 piden cero absoluto en vez de una comparación que se pueda inclinar. El
PO firma la fidelidad al negocio por separado, que es la única mirada
independiente que el equipo puede poner hoy.

**Y el ciego sigue siendo imperfecto**, como ya declara `design.md`: las dos
salidas se distinguen a ojo, así que el scorer sabe cuál es cuál mientras puntúa.
Con tres personas no tiene arreglo. Queda como sesgo residual, sumado al del
orden.

---

## 4. Los siete criterios, con el comando que produce su evidencia

Los umbrales son los de `design.md` D6, sin cambios. La columna nueva es la
tercera: qué se corre para producir la evidencia, y qué parte de cada criterio
**no** tiene comando y depende de lectura humana. Decir cuáles no lo tienen es
parte del pre-registro: un criterio sin comando no es menos válido, es menos
verificable, y eso hay que saberlo antes y no después.

| | Qué se mide y con qué umbral | Cómo se produce la evidencia |
|---|---|---|
| **G0** | Ediciones a archivos del directorio de instalación de la herramienta durante el piloto. Umbral: **cero**. Si hubo que tocarla para cortar en el PRD, la adopción no es acotada: es mantener un fork de un método ajeno | Por código de salida, dentro del espacio desechable: `git diff-index --cached --quiet HEAD -- _bmad` sobre un índice temporal en el que se acaba de hacer `git add --all --force -- _bmad`. Lo corre `verificar-brazo.mjs`, que además distingue «cero ediciones» de «no se pudo mirar» (sin `_bmad`, o sin el commit de instalación, G0 **no se mide**, no se aprueba). La lista de ediciones, si hubo, sale de `git diff-index --cached --name-status HEAD -- _bmad` |
| **G1** | Escenarios del delta del brazo B con al menos un ítem de materia prima asociado. Umbral: **100%**, cero `n/a` | Sin comando: es lectura de la tabla de trazabilidad contra el inventario. Lo mecánico es el formato, que hace la lectura contable: cada fila es un par ítem-escenario y la tercera columna no puede quedar vacía ni decir `n/a` (`convencion-de-procedencia.md`, parte 2). El orden inventario-antes-que-salidas se lee con `git log --format='%cI %h %s' -- <inventario>` |
| **G2** | Ítems del inventario que no quedaron ni cubiertos, ni fuera de alcance declarado, ni pregunta abierta (**caídos en silencio**). Umbral: brazo B **cero** en los ítems clasificados como regla de negocio, y estrictamente menos que el control en el total | Sin comando, pero con denominador fijo: son los identificadores del inventario que aparecen en **cero** filas de la tabla de trazabilidad. La clase de cada ítem viene de la rúbrica pre-registrada, y reclasificar un ítem después de leer las salidas hace que G2 no se pueda puntuar (`convencion-de-procedencia.md`, parte 3) |
| **G3** | Afirmaciones de regla de negocio sin origen rastreable y sin marca de supuesto (**invención**). Umbral: brazo B **cero** | Sin comando: lista del scorer con la **cita textual** de cada afirmación y su veredicto. Es el criterio menos mecanizable de los siete y el que más depende del inventario previo |
| **G4** | Horas de reloj del PO y del builder, y número de sesiones, por brazo. Umbral: brazo B ≤ **2×** las horas de PO del control, **y** su salida pasa los mismos gates | Las horas salen de `horas.csv`, anotadas por sesión y no al final. Los gates salen de `node verificar-brazo.mjs <espacio> <brazo>`, que imprime y devuelve los códigos de salida del guardrail de deltas y de `validate --all --strict` sin enmascarar ninguno. La aceptación de los escenarios la firma el PO |
| **G5** | Puntos del piloto que dependieron de que alguien se acordara. Umbral: la lista **no puede estar vacía**, y cada ítem lleva destino (check propuesto, o queda fuera y por qué). Si todo queda fuera, el techo del veredicto es **amarillo** | Sin comando, y por eso el insumo existe desde el primer día: `bitacora-g5.md`, que se llena mientras pasa. Una lista vacía significa que nadie miró |
| **G6** | Veces que el insumo se usó como autoridad de comportamiento sin escenario que lo respalde. Umbral: **cero**. Si aparece aunque sea una, el check de D2 se estrena rojo desde el día uno, sin ventana de gracia | Búsqueda del scorer en los artefactos y en los PRs del piloto. Un dato ya medido y que cuenta acá: un archivo de `piloto/` con forma de delta pasa hoy el guardrail y `validate --all --strict` en verde, así que la forma de contrato en un insumo es invisible para todos los checks de hoy |

**Regla de veredicto**, sin cambios respecto de D6: verde exige los siete. Rojo si
falla G0, G1, G2 o G3, que son la razón de existir de la capa. Amarillo si falla
solo G4, o si G5 queda entero afuera. G6 no cambia el veredicto: cambia con qué
dureza se estrena el check de D2.

**Un criterio no medido no es un criterio aprobado.** Si algo no se pudo medir, se
escribe «no medido» con el motivo, y el veredicto se calcula con esa celda en
contra. Es la única lectura que no premia la falta de datos.

---

## 5. La planilla de horas

Vive en `horas.csv`, al lado de este archivo, con el encabezado ya escrito y cero
filas. Está en csv y no en una tabla de markdown porque se agrega una fila por
sesión sin reformatear nada, y porque es la fuente directa del número de G4.

Columnas y valores admitidos:

| Columna | Qué va | Valores |
|---|---|---|
| `fecha` | día de la sesión | `AAAA-MM-DD` |
| `rol` | quién puso las horas | `po` o `builder` |
| `brazo` | a qué brazo se le imputan | `A` o `B` |
| `sesion` | número de sesión de ese brazo | entero, arranca en 1, tope 5 (sección 2) |
| `horas_reloj` | horas de reloj de esa sesión | decimal con punto, por ejemplo `1.5` |
| `nota` | qué se hizo, en una línea | texto libre sin comas |

**Se anota al cerrar cada sesión, no al final del piloto.** La memoria de cuatro
semanas siempre favorece a lo nuevo, y G4 es el único criterio que se puede
falsear sin mentir: alcanza con reconstruir de memoria. La primera fila con datos
tiene que llevar fecha **posterior** a la del commit de este archivo. Esa
comparación es la comprobación de la tarea 0.7.

---

## 6. La herramienta: versión, instalación y lo que pidió de verdad

| Qué | Valor |
|---|---|
| Paquete y versión pinada | `bmad-method@6.11.0` (investigado el 2026-08-19 contra el repositorio y el registro de paquetes, según `design.md`) |
| Licencia | MIT, con reserva de marcas de un tercero. Se la nombra por su nombre y no se la presenta como propia |
| Comando de instalación, copiado verbatim del ensayo | PENDIENTE (decide: quien corra la tarea 1.4) |
| Código de salida de la instalación | PENDIENTE (tarea 1.4) |
| Qué pidió de verdad la instalación | PENDIENTE (tarea 1.4) |

**La forma del comando no es opcional.** Cualquier invocación que corra por un
ejecutor que descarga se escribe con el paquete completo y su versión exacta. El
nombre pelado de un paquete en npm lo puede tener otro, y el marco ya tiene el
caso escrito: `openspec` a secas es un placeholder ajeno. El check «Ejecutores de
paquetes pinados» excluye los `.md`, así que este archivo no lo dispara: la regla
vale igual, y quien la incumpla acá no se va a enterar por un rojo.

**La incertidumbre que hay que cerrar antes del lunes, y por qué es urgente y no
formal.** `design.md` declara que el README de la herramienta pide Python 3.10+ y
`uv` además de Node, sin poder confirmar qué módulo lo necesita. En la máquina
donde se escribió este pre-registro, medido hoy por código de salida:

| Comando | Salida | Código |
|---|---|---|
| `node --version` | `v26.5.0` | 0 |
| `pnpm --version` | `11.18.0` | 0 |
| `uv --version` | `uv 0.12.0` | 0 |
| `python --version` | «Python was not found», el alias de la tienda | **49** |
| `python3 --version` | «Python was not found», el alias de la tienda | **49** |
| `py --version` | no está en el PATH | **127** |

Node cumple el `engines >= 20.12.0` que `design.md` declara, y `uv` está. Python
**no**: lo que responde es el alias de la Microsoft Store, que no es un
intérprete. Si algún módulo de la herramienta lo necesita de verdad, el brazo B se
cae el lunes a la mañana en la primera sesión, y las horas de esa caída se le
imputan a G4. Por eso la tarea 1.4 se corre **en la máquina que va a correr el
brazo B** y antes del lunes, y su resultado se pega en la tabla de arriba tal como
salió.

**Lo que no se hizo a propósito**: la herramienta no está instalada. Es la
dependencia de terceros que la tarea 1.1 pone detrás de un OK humano, y un agente
no toma esa decisión.

---

## 7. Las decisiones humanas del bloque 1

Ninguna se resuelve por defecto y ninguna la toma un agente. Dos de las cuatro son
bloqueantes duras para el lunes.

| | Decisión | Quién | Cuándo | Estado |
|---|---|---|---|---|
| 1.1 | Usar una dependencia de terceros en el piloto, con su versión y su alcance de módulos. El OK para que el pin entre al carril de todos los consumidores es **otro** OK, y solo si el veredicto es verde | Builder 1 | antes de la primera sesión | PENDIENTE. **Bloqueante** |
| 1.2 | Dónde viven las transcripciones y si pueden pasar por un modelo. El repositorio no es su custodio (D3) | Builder 1, con el PO | antes de abrir el material | PENDIENTE. **Bloqueante**: sin esto no se abre el material el lunes |
| 1.3 | Correr el piloto: reserva de tiempo del PO y de dos builders, y confirmación del reparto de roles de la sección 2 | Builder 1, PO (PO), Builder 2 | antes de la primera sesión | PENDIENTE |
| 1.4 | Cadena de herramientas: instalación ensayada en la máquina del brazo B, con lo que pidió de verdad | quien corra el brazo B | antes de la primera sesión | PENDIENTE |

Cuando una se resuelve, se escribe acá **quién la tomó y en qué fecha**. Una
decisión sin autor es una decisión que nadie va a poder discutir en seis meses.

---

## 8. Lo que este piloto NO mide

Está acá para que no se lea como olvido, y para que un veredicto verde no se
compre más autoridad de la que tiene.

- **No mide si la capa sirve en general.** n=1: una rebanada, un proyecto, un PO,
  una persona corriendo los dos brazos. El gate está diseñado para poder decir
  no; no puede decir sí más allá de este caso. La asimetría es deliberada.
- **No mide la calidad de la procedencia.** Que un escenario tenga origen no dice
  nada sobre si el origen era una buena idea. La trazabilidad va a rastrear con
  fidelidad perfecta hasta una mala decisión del negocio. Lo que se cierra es la
  invención silenciosa.
- **No mide nada de lo que pasa dentro de la herramienta.** Es conversacional de
  punta a punta: nada adentro falla solo. Todo lo que se gatea es su salida.
- **No mide las fases 3 y 4 de la herramienta**, que no se adoptan (D1). Un
  veredicto verde no dice nada sobre Solutioning ni sobre Implementation, y
  usarlo para justificarlas después sería estirar la medición más allá de lo que
  se midió.
- **No mide el costo para los consumidores.** El pin entra al carril de repos que
  no participaron de esta decisión, y ese costo no aparece en ninguna de las
  siete celdas. Es la razón por la que agregar una dependencia es frontera con OK
  humano y no una consecuencia del veredicto.
- **No mide el envejecimiento del insumo.** El PRD queda congelado y fechado, el
  spec vivo es la autoridad, y ningún check compara los dos. Un PRD que en seis
  meses miente no pone nada en rojo, y el piloto dura cuatro semanas: no puede
  ver ese modo de falla.
- **No mide la dirección inversa.** Lo que el piloto aprenda sobre el método y
  quiera devolverle a la herramienta de terceros no tiene canal, y este piloto no
  lo abre.
