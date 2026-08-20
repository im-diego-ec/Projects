---
artefacto: pre-registro
dri: Builder 1
aprueba: Builder 2 (builder par)
informado: PO
estado: pendiente-de-revision
experimental: true
veredicto_antes_de: 2026-09-21
---

# capa-descubrimiento — Convención de procedencia

Este archivo también es pre-registro, y va en el **mismo commit** que
`pre-registro.md`. Cierra tres huecos que hoy dejan sin vara a la mitad del gate:

- La tarea 3.1 pide «el id de cada ítem» y G1 exige 100% de escenarios con ítem
  asociado y cero `n/a`, pero ninguna línea del change dice **cómo se nombra un
  ítem**. Si se inventa el lunes, los dos brazos citan en dialectos distintos y
  G1 deja de ser comparable: es el criterio que justifica la capa y se queda sin
  vara.
- El umbral de G2 es condicional a la clase («cero en los ítems que el scorer
  clasifica como regla de negocio») y `design.md` no dice qué hace que un ítem
  sea de una clase o de otra. Escrita después de ver las salidas, esa definición
  le permite al scorer reclasificar como «contexto» cualquier ítem caído, y el
  cero se sostiene sin que nada falle. Es exactamente el modo de falla que un
  pre-registro existe para cerrar.
- La tabla de trazabilidad es la junta entre la capa y OpenSpec, es la evidencia
  de G1 y es lo que el check 5.2 tendría que parsear el día que exista. Hoy no
  tiene formato, no tiene domicilio y no tiene dueño.

Ninguna de las tres es una preferencia de estilo. Las tres son la diferencia entre
un criterio medible y un criterio que se puede acomodar sin mentir.

---

## Parte 1. La gramática del identificador

### Dos niveles, y por qué hacen falta los dos

**El ancla** localiza la evidencia en el material. **El identificador de
inventario** es lo que se cita en la tabla de trazabilidad y en el delta. No son
lo mismo, y colapsarlos rompe los dos casos que aparecen siempre: un ítem que sale
de dos entrevistas distintas, y un pasaje que contiene dos ítems.

| Nivel | Forma | Ejemplo | Quién lo asigna |
|---|---|---|---|
| Entrevista | `E` más dos dígitos, en el orden en que se hicieron | `E03` | el PO, cuando entrega el material |
| Ancla en el material | el identificador de entrevista, guion, y seis dígitos `hhmmss` de **inicio** del pasaje | `E03-011240` | el scorer, al armar el inventario |
| Ítem de inventario | `I` más tres dígitos, monótono y sin reutilización | `I017` | el scorer, al armar el inventario |

**El ancla apunta al inicio del pasaje, no a su rango.** El final es un juicio
(«dónde termina la idea») y dos personas lo cortarían distinto; el inicio es un
punto y no se discute. El texto del pasaje vive en el inventario, no en el ancla.

**La tabla que traduce `E03` a una entrevista concreta vive con el material, fuera
del repositorio.** Eso es D3 hecho convención: el repositorio nunca dice quién
habló. Sin esa tabla, `E03-011240` es una etiqueta sin contenido, y eso es
exactamente el límite que el marco ya acepta para los secretos: se verifica que
existe y dónde, no se lo trae al contexto.

### Las tres reglas duras

1. **Un identificador es inmutable desde el commit del inventario.** No se
   renumera, no se reutiliza y no se recicla. Renumerar rompe en silencio todas
   las citas que ya se escribieron, y nada lo detecta: la cita sigue existiendo y
   ahora apunta a otra cosa.
2. **Un ítem que se descarta no desaparece: se marca.** Si dos ítems resultan ser
   uno, el de identificador más bajo sobrevive y el otro queda en la lista con
   `fusionado en I0xx`. Un identificador que se borra convierte un caído en
   silencio en un ítem que nunca existió, y G2 cuenta caídos.
3. **Un pasaje con dos afirmaciones son dos ítems.** Si un ancla lleva una regla
   de negocio y una preferencia, se parten con dos identificadores. Un ítem mixto
   lo clasifica la mitad que el scorer mire primero, y ahí la rúbrica de la parte 3
   deja de servir.

### Cómo se cita en el delta

Cada requirement, y cada escenario que lo ilustra, cita uno o más identificadores
de inventario. El ancla no se cita en el delta: se cita en el inventario, una vez
por ítem. Así el delta queda legible y la resolución hacia el material ocurre en
un solo lugar.

---

## Parte 2. La tabla de trazabilidad

### Dónde vive, y por qué ahí

**Vive con el change, al lado de los deltas. No en el directorio de artefactos de
descubrimiento.** La decisión es explícita porque las dos opciones son
defendibles y una de las dos es un problema:

La tabla nombra escenarios. Un archivo que vive en el directorio del insumo y
nombra escenarios es un insumo que empieza a tener forma de contrato, y D2 lo
prohíbe justamente porque un documento con forma de contrato **se lee** como
contrato. Además, la tabla habla del delta y no del material: cuando el delta
cambia, la tabla cambia con él, y tiene que viajar en el mismo PR y quedar bajo el
mismo review. El insumo, en cambio, queda congelado y fechado.

Durante el piloto: la tabla de cada brazo vive en el espacio de trabajo desechable,
al lado del delta de ese brazo, y entra a `piloto/` como evidencia de G1 ya
despersonalizada. En régimen, si el veredicto es verde: vive con el change en el
repositorio del proyecto.

**Dueño**: quien escribe el delta. No el scorer, y no el PO. El que escribe el
escenario es el único que sabe de dónde lo sacó, y una tabla que llena un tercero
después es una reconstrucción.

### El formato

Tres columnas, las mismas tres que pide la evidencia de G1, y **una fila por par
ítem-escenario**:

| ítem | sección del insumo | escenario |
|---|---|---|
| `I017` | PRD, «Recepción de mercadería», punto 3 | Una recepción sin orden firmada |
| `I017` | PRD, «Recepción de mercadería», punto 3 | Una orden firmada que llega después de la mercadería |
| `I023` | PRD, «Recepción de mercadería», punto 5 | fuera de alcance declarado: la rebanada corta antes del pago a proveedor |
| `I031` | (sin insumo intermedio: control) | pregunta abierta: quién autoriza una recepción parcial cuando el jefe de bodega no está |

**Una fila por par, y no una fila por ítem**, porque eso es lo que hace contables
las dos direcciones a la vez: G1 cuenta escenarios que aparecen en al menos una
fila, y G2 cuenta identificadores de inventario que aparecen en **cero** filas. Con
una fila por ítem y una lista de escenarios adentro de la celda, las dos cuentas
dependen de parsear prosa.

**La segunda columna en el brazo A** dice `(sin insumo intermedio: control)`. El
control no tiene PRD, y escribir ahí el ancla del material sería inventarle un
insumo que no tuvo. La columna queda declarada como vacía a propósito, que no es
lo mismo que vacía.

### La tercera columna no puede quedar vacía, y no puede decir `n/a`

Toma exactamente una de tres formas:

| Forma | Cuándo | Qué significa para el gate |
|---|---|---|
| el título del escenario | el ítem llegó al contrato | cuenta para G1, y saca al ítem de la cuenta de G2 |
| `fuera de alcance declarado: <razón>` | el ítem es real y la rebanada lo deja afuera a propósito | saca al ítem de la cuenta de G2, y la razón es auditable contra el corte declarado en el pre-registro |
| `pregunta abierta: <la pregunta>` | el descubrimiento no lo pudo resolver | saca al ítem de la cuenta de G2 **y** es un supuesto abierto: por D4 impide el archive hasta que se resuelva o se convierta en decisión escrita |

**Por qué `n/a` está prohibido**, y no es una manía de formato: `n/a` colapsa tres
destinos distintos en una palabra. Los dos últimos son resultados legítimos del
descubrimiento y el primero es su ausencia; G2 existe para separar «no llegó al
contrato porque lo dejamos afuera a propósito» de «no llegó y nadie se dio
cuenta». Escrito `n/a`, un caído en silencio y una pregunta abierta se ven igual,
y encima la pregunta abierta deja de bloquear el archive porque nadie la escribió
como pregunta. Es la forma más barata de que G1 dé 100% y G2 dé cero sin haber
hecho nada.

**Un ítem sin ninguna fila es un caído en silencio.** Ese es el denominador de G2,
dicho como cuenta y no como impresión: los identificadores del inventario que no
aparecen en la tabla.

---

## Parte 3. La rúbrica de clasificación

Cada ítem del inventario se clasifica como **regla de negocio**, **contexto** o
**preferencia**. Esta rúbrica se escribe antes de que el scorer clasifique, y
antes de que exista una sola salida que mirar, porque el umbral de G2 depende de
la clase: si la definición llega después, cualquier ítem caído se puede mover a
«contexto» y el cero se sostiene solo.

### Las tres pruebas, y el orden en que se aplican

Se aplican **en este orden** y gana la primera que dispare. El orden es lo que
impide la degradación hacia abajo: un ítem solo puede ser «contexto» si la prueba
de regla de negocio ya falló, y esa prueba está escrita acá.

**1. Regla de negocio.** *Si el sistema hiciera lo contrario, ¿alguien del negocio
tendría que corregirlo, o se rompería un compromiso con un tercero?* Si la
respuesta es sí, es regla de negocio. La confianza con la que se dijo, cuántas
veces se dijo y quién lo dijo **no entran en la prueba**: una regla mencionada una
sola vez al pasar sigue siendo una regla.

**2. Contexto.** *¿Se podría construir el sistema ignorando esto y seguiría siendo
correcto, aunque quede mal dimensionado o mal integrado?* Si la respuesta es sí,
es contexto. Describe el mundo tal como está, y restringe o explica sin exigir por
sí mismo un comportamiento.

**3. Preferencia.** *Si no se honra, ¿hay alguien cuyo trabajo se rompe, o a quien
haya que avisarle?* Si no hay nadie, es preferencia.

### Dos ejemplos de borde por clase

Son de borde a propósito: los casos fáciles no necesitan rúbrica.

**Regla de negocio**

- «Nunca despachamos sin la orden firmada», dicho una vez, al pasar, por una sola
  persona. Es regla de negocio: lo contrario rompe un compromiso. La poca
  confianza de quien lo dijo **no baja la clase**, se convierte en una pregunta
  abierta *sobre la regla*, con su propio identificador. Bajarla a «contexto» por
  haberse dicho una sola vez es exactamente la reclasificación que esta rúbrica
  existe para bloquear.
- «El sistema tiene que avisarle a compras cuando el stock baja del mínimo». Suena
  a pedido de feature, y es regla de negocio: si no ocurre, compras se queda sin
  señal y alguien tiene que corregirlo. Comparar con el segundo ejemplo de
  preferencia, que es la misma gramática y otra clase.

**Contexto**

- «Hoy movemos unas 400 órdenes por semana». Es contexto: el sistema se puede
  construir ignorándolo y sigue siendo correcto, solo mal dimensionado. Se vuelve
  regla de negocio únicamente si alguien declara un límite («no se puede pasar de
  X»), y entonces la regla es el límite, no el número.
- «Eso hoy lo hacemos en una planilla que mantiene el jefe de bodega». Es
  contexto: describe el mundo. Si en la misma conversación alguien agrega «y tiene
  que seguir siendo así», esa frase es **otro ítem**, con su identificador, y esa
  sí es regla de negocio.

**Preferencia**

- «Me gustaría verlo todo en una sola pantalla». Es preferencia: si son dos
  pantallas no se rompe nada y no hay a quién avisarle.
- «Preferiría que el aviso llegue por correo y no por chat». Es preferencia,
  **salvo** que la persona nombre una consecuencia («si llega por chat no lo ve
  nadie del turno noche»). En ese caso el ítem se parte: la preferencia queda
  preferencia y la consecuencia nace como ítem propio, candidato a regla de
  negocio por la prueba 1.

### La clase se asigna una vez

Se asigna en el commit del inventario, antes de leer ninguna salida.
Reclasificar después es posible, y cuesta: se agrega una línea con fecha y motivo,
sin borrar la clase anterior.

**Y hay una reclasificación que tiene consecuencia sobre el veredicto:** mover un
ítem de «regla de negocio» a otra clase **después** de haber leído las salidas hace
que G2 no se pueda puntuar, porque G2 mide contra un denominador que acaba de
moverse. En ese caso G2 se registra como **no medido**, y por la regla de la
sección 4 del pre-registro un criterio no medido cuenta en contra: el veredicto no
puede ser verde. Sin esa consecuencia escrita, la rúbrica sería una recomendación,
y este repo ya tiene bastantes reglas que se incumplieron hasta volverse checks.
