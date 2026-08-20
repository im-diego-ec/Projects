# Diseño — rojo primero

## D1. Cómo se comprueba que el caso negativo de una compuerta realmente falla

**Decisión: cada compuerta declara su fixture negativo, y el pipeline corre la
compuerta contra ese fixture esperando un código de salida distinto de cero.**

La comprobación es mecánica y no opina sobre la calidad del fixture: solo exige
que exista y que ponga rojo. Vive junto al banco de pruebas de cada compuerta,
que es donde ya está el resto de su verificación.

**Alternativa descartada: dejarlo como convención de revisión.** Es exactamente
lo que ya teníamos. El check «Constitución del marco al día» pasó revisión
humana, se leía correcto, y devolvía exit 0 sobre un consumidor sin artefacto con
la fecha vencida. Trece afirmaciones falsas de veinte es la medida de cuánto
sostiene una convención acá.

**Alternativa descartada: pruebas de mutación sobre las compuertas.** Cubriría
más —encontraría fixtures débiles, no solo ausentes— pero las compuertas del
marco son shell y YAML invocando herramientas externas, donde mutar no produce
variantes con sentido. Costo alto, señal ruidosa. Si algún día las compuertas
son mayoritariamente código, se reconsidera.

**Límite honesto de lo elegido:** esto detecta la compuerta que NO PUEDE fallar.
No detecta la compuerta que falla por el motivo equivocado. Un fixture que pone
rojo por una razón distinta de la que la compuerta promete cuidar pasa esta
verificación. Para eso sigue haciendo falta el review humano, y conviene no
pretender lo contrario.

## D2. De dónde sale la declaración de qué regla tiene compuerta

**Decisión: cada compuerta declara qué requirements cubre, y el censo se DERIVA
de esas declaraciones cruzadas contra los requirements de los specs vivos.**

Un requirement que ninguna compuerta reclama aparece como sin compuerta. Un
requirement nuevo que nadie declaró pone rojo el pipeline, porque el silencio
por omisión es el que produjo la brecha entre 6 y 39.

**Alternativa descartada: una tabla mantenida a mano en `docs/`.** Es doble
contabilidad, y ya sabemos cómo termina: la auditoría encontró que
`piso_permisos` estaba escrito en dos lados y que los dos ya habían divergido.
La regla del propio marco lo dice —en una doble contabilidad la declaración
siempre pierde contra el código— y una tabla a mano la contradice el mismo día
que alguien agrega un check sin acordarse de la tabla.

**Alternativa descartada: derivar solo del código de las compuertas, sin
declaración.** Obligaría a adivinar qué requirement cubre cada check leyendo su
implementación. Frágil y no auditable.

## D3. Cómo se estrena sin enrojecer a nadie

**Decisión: el mismo orden que ya usa el marco. El repo se pone al día primero;
la compuerta aterriza después.**

La constitución del marco clasifica como BREAKING endurecer un check de modo que
un repo que hoy pasa mañana falle. Las tres propiedades nuevas lo serían si
aterrizaran de golpe: hoy ninguna compuerta declara sus requirements, y varias no
tienen fixture negativo.

Por eso el orden de `tasks.md` es: primero se agregan los fixtures negativos y
las declaraciones a las compuertas que YA existen, y recién cuando el repo está
completo aterriza el check que lo exige. Así ningún consumidor amanece rojo por
algo que todavía no podía satisfacer, y no hace falta ventana de gracia para el
repo del marco.

Para los consumidores que el marco no controla, la compuerta estrena en modo
aviso con su fecha exigible, y el manifiesto ya rechaza menos de 28 días entre
publicación y exigibilidad.

## D4. Qué NO entra en el alcance

- **No se exige compuerta para toda regla.** El marco necesita reglas que solo
  sostiene el criterio humano —«escribir en producción exige OK explícito» no es
  automatizable— y forzarlas produciría checks decorativos, que son peores que la
  ausencia porque se leen como protección.
- **No se toca el TDD del código de aplicación de los proyectos.** Funciona.
- **No se audita retroactivamente cada afirmación ya escrita** en PRs cerrados o
  en el archive. La propiedad aplica a lo que se escriba desde el merge.
