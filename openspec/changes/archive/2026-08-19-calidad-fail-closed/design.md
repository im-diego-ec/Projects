---
artefacto: design
dri: Builder 1
aprueba: Builder 1
informado: PO / Builder 2
estado: pendiente-de-revision
---

# calidad-fail-closed — Design

## Context

La promesa incumplida —«ningún paquete queda fuera del alcance del lint»— parece
pedir un check por paquete. No lo pide. Los dos agujeros que se encontraron
buscándola viven **dentro** de paquetes que tienen lint y tienen configuración de
compilación, así que cualquier verificación que pregunte «¿este paquete está
configurado?» los declara sanos:

- un componente de dominio escrito a mano, importado por cinco archivos del
  producto, tragado por una exclusión pensada para componentes generados;
- el script de humo que decide la promoción a producción, fuera de todo programa
  de tipos.

Eso reencuadra la pregunta de diseño: la unidad de la propiedad no es el paquete,
es el **archivo**.

## Decisions

### D1 — El alcance se DERIVA de las herramientas, no se declara

Se enumera el universo de archivos fuente versionados, se le pregunta a cada
herramienta del repositorio qué archivos ve de verdad, y se resta. Lo que sobra
es rojo.

La alternativa —exigir que cada paquete declare sus scripts de verificación— se
descartó con evidencia, no por gusto: verifica **declaración**, no **alcance**, y
el contrato habla de alcance. En el consumidor real, el caso que motiva todo el
change (la suite E2E) cerraría en verde con esa suite linteada sin una sola regla
que dependa de tipos. Y sería ciego por construcción a los dos agujeros de
arriba, que son intra-paquete.

También se descartó exigir un único comando raíz de verificación. Su migración de
referencia **reduce** la cobertura de lint mientras el check queda verde: al
reemplazar los pasos enumerados por un recorrido de paquetes, desaparece el lint
de la raíz —el único que corre con cero tolerancia a warnings— y quedan los de
cada paquete, que no la tienen. Un guardrail cuya adopción baja el alcance real
es peor que no tenerlo.

### D2 — La excepción vive en el paquete que la necesita, con motivo escrito

Un archivo puede quedar legítimamente fuera. La exclusión se declara en el
manifiesto del paquete que lo contiene, con su motivo, y no en una lista central
del marco.

Esto no vuelve imposible la evasión y no hay que venderlo como si lo hiciera. Lo
que cambia es su **naturaleza**: deja de ser una ausencia —invisible en el diff,
invisible en CI— y pasa a ser una afirmación escrita, en el diff del paquete,
bajo review cruzado. Una exclusión que ya no corresponde a ningún archivo es
roja, para que no sobrevivan a lo que las justificó.

### D3 — Sin censo comiteado

Se evaluó guardar el resultado en un archivo versionado, con huella de frescura y
versión del generador. Se descartó: es la mayor parte del costo recurrente y
compra un margen angosto. Paga con ruido en cada pull request, conflictos de
merge, y un pin que enrojece a todos los consumidores con cada corrección del
script bajo un tag móvil. El alcance se deriva en cada corrida y falla ahí mismo.

### D4 — El marco ejecuta el toolchain del consumidor, y eso es una frontera nueva

Hasta hoy el marco solo leía archivos del consumidor. Interrogar a las
herramientas exige **ejecutarlas**. Está acotado —corre en el job del propio
consumidor, después de que instaló sus dependencias; no linteo, no compila, no
instala nada: solo pregunta qué archivos ven— pero es una frontera que no
existía y se declara como impacto, no se cuela como detalle.

Su consecuencia real: un cambio mayor del analizador o del compilador puede mover
la API de introspección y afectar a todos los consumidores a la vez.

### D5 — Cobertura en dos planos: el mínimo del marco y el diff sin holgura

**El mínimo acordado es 80% por paquete.** Decisión del DRI, tomada a sabiendas
de las dos objeciones que se le hicieron y que quedan registradas acá para que
nadie las vuelva a plantear como si fueran nuevas:

1. *No existe un número estándar de la industria*; el 80% es una convención.
2. *La cobertura mide qué líneas se ejecutaron, no si alguien verificó algo*: se
   puede llegar al número con pruebas que no afirman nada, y cuando el número es
   el objetivo esa es la tentación. Mitigación adoptada, barata y concreta: las
   pruebas de la puesta al día se escriben **contra los scenarios de los specs
   vivos**, que ya dicen qué tiene que pasar, de modo que el porcentaje sale de
   verificar comportamiento especificado y no de ejecutar líneas.

**Corrección de un error de razonamiento previo.** Una versión anterior de este
diseño descartó todo umbral apoyándose en la regla «invariantes como propiedades,
no como números». Esa regla está escrita para **migraciones de datos** —nació de
una migración que un conteo esperado habría abortado por un falso fallo— y no
para toda medición. Un piso de cobertura no está prohibido por la constitución.

**Dos planos, porque cada uno tapa lo que el otro deja abierto.** Sobre el diff,
sin holgura: código nuevo sin pruebas es rojo aunque el paquete tenga margen de
sobra — sin esto, un paquete al 90% admite código sin pruebas hasta agotar el
margen. Sobre el total, que no retrocede: sin esto, lo que ya está sin cubrir se
queda así para siempre, porque nada lo exige mientras nadie lo toque. Es
exactamente el hueco que tiene el enfoque por diff a solas.

**El piso sube, y bajarlo es visible.** Mientras un paquete no llegue al mínimo,
su total vigente hace de piso y la integración falla si retrocede. Se acepta el
falso positivo conocido —borrar código bien cubierto baja el porcentaje sin que
nadie empeore nada— con la misma lógica que las exclusiones del alcance: no se
vuelve imposible, se vuelve **visible**. Bajar el piso es una línea de diff con
su justificación, bajo review, y no un ajuste silencioso.

El comparador se escribe acá en vez de adoptar una herramienta externa, por una
razón que pesa más que las otras: la herramienta candidata **falla en verde**. Si
las rutas de su entrada no coinciden con las del diff, no encuentra líneas que
medir, reporta cobertura total y sale con éxito — o sea que cablearla mal deja el
gate abierto, que es exactamente lo que la constitución prohíbe. Se usa igual,
pero como oráculo de contraste en el spike, fuera del pipeline.

La ausencia de datos habiendo líneas agregadas es **roja y ruidosa**, nunca un
éxito silencioso.

### D5b — El 80% se alcanza subiendo el piso, no encendiendo un interruptor

El consumidor está hoy muy por debajo del mínimo: 31,44% en el paquete web, con
17 de 38 archivos sin ejecutar una sola línea, y el paquete de API sin medir.
Exigir 80% de golpe deja el pipeline en rojo durante todo el tiempo que lleve
escribir las pruebas —semanas, no horas—, y un rojo permanente se convierte en
un rojo que todos aprenden a ignorar, que es peor que no tener la compuerta.

Por eso el mínimo entra por el plano del diff **desde el primer día** (no
requiere trabajo previo: solo aplica a lo que se escriba de ahora en adelante) y
por el plano del total **como piso que sube**. El destino es el mismo; la
diferencia es que así la compuerta protege cada avance desde el principio en vez
de estar apagada hasta que termine la puesta al día.

### D5c — La transición lleva fecha, porque sin fecha el piso se vuelve el mínimo

**Corrección posterior, hallazgo B1 de la auditoría de cierre de v1 (2026-08-20).**
El spec de este change decía las dos cosas a la vez: el párrafo normativo prometía
que la integración falla cuando la cobertura de un paquete queda por debajo del
mínimo del marco, y su propio scenario prometía lo contrario, que falla solo si
además está por debajo del piso vigente. Lo implementado cumplía la versión débil,
y la medición sobre el consumidor real lo mostró: `web` a 70,69% de funciones con
`EXIT = 0`, 9,4 puntos por debajo del mínimo declarado de 80, en verde, contra un
piso que se había fijado en el número medido (`functions: 70.6`) con un comentario
al lado que afirmaba que el paquete ya lo superaba.

La decisión del dueño del área es que **el 80 por paquete se mantiene**: no se baja
la promesa para que cuadre con lo medido. Lo que faltaba no era el número, era el
final de la transición. D5b eligió llegar al 80 subiendo el piso, y eso está bien,
pero un piso que sube «a medida que se agregan pruebas» no obliga a nadie a
agregarlas: si nadie las escribe, el piso se queda donde está y el mínimo pasa de
destino a decoración. El piso sin fecha ES el mínimo de hecho.

Por eso ahora la deuda se declara **con motivo y con fecha**, en el manifiesto del
propio paquete, junto a las exclusiones. El piso sigue siendo el mecanismo de
transición y protege cada avance; la fecha es lo que la termina. Un paquete por
debajo del mínimo sin fecha declarada es rojo, y el día en que la fecha vence la
comparación pasa a ser contra el mínimo y no contra el piso. Correr la fecha se
puede, pero es una línea de diff con su motivo y con el avance conseguido desde la
anterior, bajo review, que es la misma mecánica que las exclusiones del alcance:
no se vuelve imposible, se vuelve visible.

**Alternativa descartada: exigir que el piso suba en cada PR que toque el
paquete.** Ata el avance al tránsito por el código en vez de a una fecha, y falla
en las dos direcciones. Bloquea integraciones legítimas —un cambio que toca solo
archivos ya cubiertos no puede subir nada y quedaría rojo sin defecto que
arreglar—, que es el rojo permanente que D5b existe para evitar; y admite el
avance nominal, porque subir el piso una centésima satisface la letra y deja la
deuda intacta durante años. La fecha, además, es un mecanismo que este marco ya
opera: es la misma forma de la ventana de gracia con la que se estrena un check
nuevo, y se verifica con la fecha de la corrida en lugar del historial de quién
tocó qué.

**Consecuencia inmediata, y es deliberada:** con esta redacción el estado de hoy
del consumidor real queda descrito como lo que es, un incumplimiento. `web` está
por debajo del mínimo en `functions` y no declara ni motivo ni fecha, así que la
salida no es aflojar el umbral ni excluir archivos para llegar: es subir la
cobertura de funciones a 80 con pruebas que verifiquen scenarios de los specs
vivos, o declarar la deuda con su fecha. La primera es la buena; la segunda existe
para que la transición sea honesta y no eterna.

### D5d — La compuerta del total existe, y vive donde ya vivían sus datos

**Segunda corrección del mismo hallazgo (2026-08-20).** D5c arregló la
contradicción en prosa y no construyó nada, así que la auditoría volvió a medir lo
mismo y encontró algo peor: el requirement había pasado de **una** promesa sin
implementar a **cuatro**. Un paquete sintético al 33,3% (`lcov` con `LF:6 LH:2`),
sin motivo ni fecha declarados y con las líneas del diff bien cubiertas, salía
`EXIT 0` con `COBERTURA_MINIMO=80`; con la deuda declarada y la fecha vencida en
1999-01-01, `EXIT 0`; con los cuatro umbrales del consumidor bajados a 40,
`EXIT 0`; y el deber de reporte por corrida no aparecía en ningún resumen.
Archivar eso habría congelado como contrato vigente algo que nadie implementaba:
el defecto original multiplicado por cuatro.

La decisión del dueño se mantuvo —**el 80 por paquete no se baja**—, así que la
salida era construir la compuerta.

**Dónde vive, y por qué no en una action nueva.** El plano del total quedó DENTRO
de `cobertura-diff`, no en una pieza aparte, y la razón es la que ya obligó a
importar el censo en vez de copiarlo: los dos planos leen **los mismos** reportes
`lcov`, resuelven **las mismas** rutas `SF:` contra el control de versiones y
consultan **las mismas** exclusiones declaradas. Una action aparte habría
duplicado por tercera vez la resolución de rutas —la parte del código que existe
precisamente porque cablearla mal produce un falso verde— y habría dejado dos
piezas midiendo cosas distintas con el mismo nombre. La contrapartida honesta es
que el nombre de la action ya no describe todo lo que hace; es un tag `v1` y
renombrar la ruta rompería a los consumidores, así que se corrigieron su `name`,
su descripción y su documentación en lugar de su ubicación.

**Qué cambió en el orden de la corrida.** La lectura de los reportes y de los
manifiestos subió por encima de los controles del rango del diff. No es
cosmético: el total de un paquete no depende de ningún rango, así que en un push a
`main` —donde el plano del diff *no aplica* y salía 0— el total quedaba sin medir.
Y el veredicto del total no cortocircuita: se guarda en un piso de salida que
`terminar()` respeta, de modo que el plano del diff sigue imprimiendo su
diagnóstico completo y ningún `exit 0` de los que ya existían puede tapar un total
en falta.

**Las métricas salen de los registros por ítem, no de los resúmenes del `lcov`.**
`DA`, `FN`/`FNDA` y `BRDA` se pueden fusionar cuando dos suites miden el mismo
archivo; `LF`/`LH`, `FNF`/`FNH` y `BRF`/`BRH` no —sumarlos cuenta el denominador
dos veces—, y ese es justamente el error que infla un total sin que nadie lo note.
Consecuencia declarada: un reporter que no emita `FN`/`FNDA` deja la métrica de
funciones sin denominador, y entonces sale como `n/a` en el resumen en vez de
callarse.

**La asimetría del umbral local es deliberada.** Sobre las líneas del cambio el
proyecto puede pedir menos que el marco, y alcanza con que la corrida lo grite;
sobre el total, el mínimo del marco es piso duro y el umbral local solo puede
subirlo. Con la regla simétrica, apagar la compuerta del total costaba bajar un
número — que es exactamente lo que la auditoría hizo para demostrar que no
existía.

**Y el marco ahora reparte el umbral.** El andamio trae `vitest.config.base.mjs`
con las cuatro métricas en el mínimo del marco, `all: true` y el `projectRoot` del
reporter en la raíz del monorepo. Como eso son dos copias del mismo número en dos
archivos, un check del `marco-ci` las compara: dos números que tienen que
coincidir y que nadie compara son un número que va a divergir.

**El estreno lleva ventana, y la ventana se cierra sola.** Medido contra un
espejo del consumidor real —`un-proyecto-anterior` en `main`, con sus dos reportes
`lcov` del 2026-08-20— el plano del total da **rojo**: `web` está en 70,70% de
funciones, 9,30 puntos por debajo del mínimo, y no declara ni motivo ni fecha. El
arreglo existe y está medido, pero vive en una rama sin mergear
(`feat/cobertura-web-funciones-80`, con umbrales de 93,6 en funciones), así que el
orden importa: si la compuerta aterriza antes que esa rama, el consumidor amanece
rojo por un cambio del marco y no por un defecto propio. Y con `v1` como tag móvil
eso llega solo, sin que nadie lo lea — pasó el 2026-08-19.

D6 resolvió el caso anterior con el orden en lugar del modo aviso («el consumidor
se pone al día primero, el check aterriza después»), y esa salida sirve cuando se
controla el momento del aterrizaje. Acá no: la publicación del marco y el merge de
la rama del consumidor son dos repositorios distintos. Así que el estreno lleva una
**ventana con fecha**, escrita en una constante del comparador
(`VENTANA_DE_GRACIA_HASTA = "2026-09-30"`, 41 días desde la medición):

- afloja **una sola** cosa: un paquete por debajo del mínimo que **no declara**
  deuda pasa en amarillo, con un `::warning::` que nombra el día en que será rojo;
- **no** afloja lo que el paquete escribió y rompió —una deuda declarada y
  vencida, un retroceso por debajo de un piso declarado, una declaración
  inválida—, porque esos tres exigen que alguien haya escrito algo;
- **se cierra sola**: pasada la fecha, el mismo estado es rojo sin que nadie toque
  una línea. Una ventana que hay que acordarse de cerrar no se cierra nunca; esta
  se borra después, en un PR de limpieza, y borrarla no cambia el comportamiento.

Verificado en las dos direcciones sobre el mismo repositorio sintético: dentro de
la ventana, `EXIT 0` con el aviso; con la ventana cerrada, `EXIT 1`.

**Lo que sigue sin verificarse, y se declara.** Ningún check compara el delta que
un change archiva contra el spec vivo. Los dos se editaron con un solo script y se
comprobaron iguales por md5 en la sección completa del requirement, pero eso es
disciplina de la sesión y no una propiedad del repositorio: mañana alguien edita
uno solo y nada lo delata.

Y el check que falta **no es** una comparación byte a byte permanente entre
`changes/archive/**/specs/` y `openspec/specs/`: eso sería incorrecto por diseño.
El archive es historia inmutable y el spec vivo evoluciona, así que un change
posterior que toque el mismo requirement hace divergir a los dos **con razón**; un
check así daría rojo para siempre y enseñaría a arreglarlo reescribiendo la
historia. Lo que hay que verificar es más angosto: **mientras el PR que archiva un
change está abierto**, su delta y el spec vivo son dos caras del mismo cambio y
tienen que coincidir en los requirements que toca. Eso es exactamente la situación
de este change —su PR de archive todavía no está mergeado— y es la razón por la que
acá se editaron los dos. Un check con ese alcance sí es correcto, y es el que queda
pendiente; dejar constancia de la forma correcta vale más que dejar el pendiente a
secas, porque el pendiente escrito mal se implementa mal.

### D5e — La amnistía se escribe en el contrato, y el piso sin datos es rojo

**Verificación adversarial independiente de D5d (2026-08-20).** D5d fue la única de
las tres ramas del cierre de v1 que quedó sin refutador —el suyo murió por un error
529 del servidor—, así que sus números eran los del implementador. Esta ronda los
midió de cero, con fábrica propia: ni un helper compartido con el banco de la rama,
porque si el banco y el verificador comparten el andamio, un defecto del andamio se
esconde dos veces. Los cuatro casos que D5d afirma **se sostienen**, y también sus
vecinos: fecha ausente, motivo vacío, fecha fuera del calendario, dos paquetes con
un solo culpable, `lcov` sin funciones, paquete sin ramas. Y sobre un espejo de
solo lectura del consumidor real, bajar los cuatro umbrales a 40 y el `minimo` de
la action a 40 **no vuelve verde nada**.

Aparecieron dos huecos, y los dos son de la misma clase: **la compuerta desaparece
sin que nada lo diga.**

**1. La ventana de estreno no estaba en el contrato.** Con la fecha REAL de la
corrida —la que tiene el pipeline de un consumidor— el caso central del
requirement salía `EXIT 0`. Un paquete al 33,33% sin deuda declarada: amarillo. El
espejo del consumidor real: amarillo. Y el escenario del spec vivo decía, textual,
«la integración **falla**». El banco de D5d era honesto (corre el régimen con la
ventana cerrada y tiene dos pruebas propias para la ventana), y el comentario del
comparador explicaba todo; el **contrato**, no. Es la afirmación A07 regenerada una
ortografía más adentro: A07 prometía rojo sin compuerta, y D5d construyó la
compuerta con una amnistía que el contrato no nombraba. Un comentario no es el
contrato: una amnistía que el spec no dice es indistinguible de la verificación que
no existe.

La ventana **se mantiene** —la medición que la justifica sigue en pie: contra el
`main` del consumidor la compuerta da rojo y su arreglo vive en una rama sin
mergear—, y lo que se corrige es la coherencia. La fecha de cierre, qué afloja y
qué no, y que se cierra por el paso del tiempo, quedaron escritos en el requirement
con cuatro escenarios nuevos. Y para que la coherencia no dependa de que alguien se
acuerde, una prueba lee la constante del comparador y exige que esa fecha esté en
el spec vivo **y** en el delta archivado: mover la constante sin tocar el contrato
es rojo.

**Alternativa descartada: sacar la ventana y que el consumidor amanezca rojo.**
Deja el contrato verdadero sin escribir una línea de spec, y es peor por dos
razones. El rojo lo cobra quien pase por ahí, no quien lo causó —el defecto está en
un repositorio y el rojo aparece en otro—, y sobre todo enseña la lección
equivocada: que un cambio del marco puede detener a un consumidor que no tocó nada.
Ese es el incidente del 2026-08-19 al mover `v1` la primera vez, y repetirlo a
propósito para ahorrar treinta líneas de spec sería cambiar contrato por comodidad.

**2. Un piso declarado cuya métrica llega sin datos dejaba de exigirse, en verde.**
Medido: un paquete que declara `piso: { funciones: 90 }` y cuyo reporte deja de
emitir `FN:` salía `EXIT 0`, con la fila impresa como `n/a` y sin un solo
`::warning::`. El piso es la única defensa de la **ganancia acumulada**, y apagarla
costaba lo mismo que cambiar el reporter, apagar `all: true` o subir de mayor de
vitest. Es fail-open, y la constitución del marco pide que todo fail-open sea
ruidoso.

La regla que lo cierra está derivada del principio y no del ejemplo: **una
declaración que no se puede comparar contra ningún dato no protege nada, y decirlo
es obligatorio.** Piso sin datos → rojo, porque desapareció una comparación que
existía y el arreglo es una línea de diff bajo review. Deuda sobre un paquete sin
ninguna métrica medible → amarillo ruidoso, porque no apagó nada, pero una deuda
que ninguna corrida nombra envejece en el manifiesto y se paga sola sin que nadie
sepa que estaba.

**Lo que a propósito NO cambió:** el caso «no hay ningún reporte en la corrida»
sigue siendo el aviso que ya era. Ahí no desapareció ninguna compuerta —no se
emitió cobertura— y enrojecerlo pondría en rojo permanente cualquier carril que no
corra pruebas, que es el rojo que D5b existe para evitar.

**El control negativo que lo pidió.** Mutar `!m || !m.encontradas` a `!m` sobrevivía
al banco entero. La única prueba de `n/a` que había pasaba la métrica **ausente**
(la clave no estaba en el objeto), nunca una presente con `encontradas = 0`, que es
la que un `lcov` real produce. Una prueba que no distingue esos dos casos no estaba
midiendo el que importa.

**3. El banco estaba rojo por el fin de línea del disco.** 90 de 91 pruebas verdes,
y la única roja lo era porque este repositorio no versiona `.gitattributes`: con
`core.autocrlf=true` (el default de Git para Windows) los fixtures llegan en CRLF,
las pruebas escriben LF y el diff ve el archivo entero reescrito. Las dos rondas
anteriores lo trataron como ruido del entorno y lo rodearon a mano. Ahora el helper
`fixture()` normaliza a LF: un banco que necesita un rito manual antes de creerle
deja al que lo mira decidiendo si el rojo cuenta, y esa decisión es exactamente lo
que un código de salida existe para no tener que tomar.

### D5f — El delta archivado se compara contra el spec vivo

**El pendiente que D5d declaró, cerrado, y con un alcance distinto del que D5d
proponía.** D5d dejó escrito que el check correcto era el PR-scoped: «mientras el PR
que archiva un change está abierto, su delta y el spec vivo tienen que coincidir».
Ese alcance es correcto y **no se implementó**, porque exige leer el diff del PR y
eso convierte un script de sistema de archivos en un script que depende de git, de
la profundidad del clon y del contexto del evento. Un check que solo funciona
dentro de un PR además no protege a `main`, que es donde el daño queda.

El alcance que se implementó es más ancho y sigue siendo sano: **todo requirement
que un delta archivado declara en ADDED o MODIFIED tiene que estar en el spec vivo,
con todos sus escenarios, salvo que algún delta archivado lo declare REMOVED o
RENAMED.** El falso positivo que D5d temía —el archive es historia y un change
posterior hace divergir a los dos con razón— se evita justamente con esa
resolución: las dos únicas formas legítimas de que un requirement archivado no esté
vivo son la baja y el retitulado, y las dos son **declaradas**. Y la invariante que
lo hace sano ya la garantizaba este mismo script en su primer plano: un MODIFIED
debe reproducir todos los escenarios vigentes, así que los títulos de escenario no
desaparecen en silencio.

Medido: sobre el repositorio real el check compara **9 requirements en 2 deltas
archivados** y sale `EXIT 0` —o sea que no es un check que da rojo sobre historia
correcta— y con un escenario sacado a mano del spec vivo sale `EXIT 1` nombrando el
change, el requirement y el escenario. La medición que lo originó: en esta misma
rama, donde el único cambio de spec vive dentro de `changes/archive/`, el guardrail
salía `EXIT 0` diciendo «ningún MODIFIED perdería requirements ni escenarios»
habiendo comparado **cero** deltas. La coherencia entre el delta archivado y el
spec vivo estaba sostenida por un md5 que alguien corrió a mano una vez.

**Y el verde dejó de ser mudo.** Toda corrida imprime cuántos deltas y cuántos
requirements comparó, y un árbol sin deltas lo dice con esas palabras.

**Residuo declarado, y es irreducible con este alcance:** lo que este check **no**
puede ver es un archive que aplicó el delta al spec vivo y además le agregó algo
que ningún delta declara. La comparación es de **subconjunto** (todo lo archivado
está vivo), no de igualdad, y no puede ser de igualdad sin volverse el check
permanente byte a byte que D5d ya descartó por diseño. Para cerrar eso haría falta
el alcance PR-scoped, con git.

**Una consecuencia lateral que vale nombrar:** `guardrail-deltas` llegó a la v1 sin
un solo caso sintético, y el propio `ci.yml` del marco lo estaba avisando en cada
corrida (`::warning::` de «actions con script propio y ningún banco»). El aviso
existía, era correcto, y nadie lo cobró: un fail-open ruidoso solo sirve si alguien
lee el ruido. Ahora tiene banco, con 13 casos, incluidos los dos falsos positivos
que harían inservible al check.

### D6 — El orden reemplaza al modo aviso, otra vez

El consumidor da rojo el día del estreno. La constitución define eso como
endurecer un check y prescribe estrenar en modo aviso. Acá se resuelve igual que
en `marco-se-cumple-solo`: **el consumidor se pone al día primero, el check
aterriza después**. Hecho en ese orden, ningún repositorio que no modifique una
línea queda roto —la letra de la regla— y no hay línea mayor que abrir. Es
precedente aplicado, no una excepción nueva.

El modo aviso queda para cuando haya consumidores que no controlamos.

### D6b — Apareció el segundo consumidor, y la decisión se tomó igual por rojo

El 2026-08-19 un segundo proyecto —una intranet que **no nació del scaffold**—
adoptó el marco y pasó sus cuatro checks en verde. Es la validación más fuerte
que el marco tuvo hasta hoy: otro repositorio no podía darla, porque el
marco se destiló de él y le calza por construcción.

Eso activó la condición que este mismo design declaraba: *«el modo aviso queda
para endurecer contra consumidores que no controlamos, que hoy no aplica porque
hay uno solo y es nuestro; cuando haya varios, se estrena como aviso»*. Con dos
consumidores, la regla pedía estrenar el check de cableado en modo aviso.

**Se decidió estrenarlo en rojo igual**, y la razón no anula la regla: la
intranet **está en desarrollo y no salió al aire**, así que el rojo no
interrumpe ninguna operación, hay margen para corregirlo antes de su
lanzamiento, y su responsable está disponible para hacerlo. El modo aviso
protege a un consumidor al que no se puede coordinar; acá se puede.

Queda escrito porque es una **excepción deliberada a una regla propia**, no un
descuido: la próxima vez que haya un consumidor en producción al que no
controlemos, la regla vuelve a aplicar sin discusión y el estreno es en aviso.

## Cómo se hace cumplir solo

| Requirement | Check | Falla cuando |
|---|---|---|
| Ningún archivo fuera del alcance | derivación en el job del consumidor | un archivo versionado no lo mira ninguna herramienta y nadie declaró la exclusión |
| Exclusión que dejó de aplicar | ídem | una exclusión no corresponde a ningún archivo versionado |
| El repo declara pero no ejecuta | job de marco (estático) | el pipeline no invoca la derivación en ningún flujo |
| Scripts sin enmascaramiento | job de marco (estático) | un script de verificación convierte un fallo en éxito |
| Formato verificado | job del consumidor | el formato diverge del acordado |
| Cobertura del cambio | job del consumidor | hay líneas agregadas sin datos de cobertura que les correspondan |
| Cobertura total por paquete | job del consumidor, mismo paso | un paquete está por debajo del mínimo del marco sin motivo ni fecha declarados, con la fecha vencida, en retroceso respecto de su piso, o con su declaración mal escrita |
| El marco reparte el umbral del total | job de marco (estático) | el andamio no trae la configuración de cobertura, o su número no coincide con el del comparador |

## Riesgos y límites declarados

- **El censo dice «alguien lo mira», no «lo mira con las reglas del contrato».**
  Un archivo puede estar dentro del alcance y aun así quedar fuera de las reglas
  que dependen de tipos. Es otra propiedad y otro check.
- **Un programa de tipos que nadie ejecuta da cobertura falsa.** Crear una
  configuración que ningún script corre satisface la propiedad entera. Se mitiga
  con un aviso, y un aviso no es enforcement: es documentación, y así hay que
  leerlo.
- **Cableado vivo pero job muerto.** Deshabilitar el paso deja el check estático
  en verde mientras la derivación no ocurre. Los dos jobs corren en paralelo y
  preguntarle a la API por el otro sería una carrera.
- **La exclusión con motivo de trámite pasa.** Se exige que el motivo exista, no
  que sea sincero. Juzgar una justificación no es automatizable sin falsos
  positivos.
- **Ignorar un archivo del control de versiones lo saca del universo.** Es la
  evasión más limpia que existe; la única defensa es que ignorar código propio es
  una línea de diff que no se justifica sola.
- **La lista de extensiones de fuente se mantiene a mano.** Es la regla de
  «propiedades, no listas» mordiéndose la cola. Vive en el marco, así que se
  arregla una vez para todos, pero un proyecto con otro lenguaje de plantillas
  tiene archivos invisibles para el censo mismo.
- **El marco no se dogfoodea acá.** No tiene manifiestos propios, así que el
  censo no verifica nada en este repositorio — igual que el check de marcadores.
  La diferencia es que este trae código no trivial: por eso el banco de pruebas
  con casos sintéticos y la validación contra el consumidor real son
  obligatorios, no buenas prácticas.
- **La cobertura del diff no prueba el orden.** Cierra «cambio sin prueba», no
  «prueba escrita después del arreglo». Y un cambio que BORRA pruebas dejando el
  código pasa el gate: eso solo lo cerraría un umbral global, que es justamente
  lo que se descartó.
