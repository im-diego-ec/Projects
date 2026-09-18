# calidad-codigo — deltas de la-ventana-se-cierra

## ADDED Requirements

### Requirement: Toda fecha que afloja una compuerta tiene un change que la posee

Cuando el código de producción del marco —sus actions, sus herramientas, sus
workflows— o el andamio que el marco reparte afloja una compuerta hasta una fecha,
esa fecha SHALL estar nombrada por un change **activo** que se declare su dueño, y el
pipeline SHALL comprobarlo. Una fecha viva que ningún change activo declara SHALL
tratarse como fallo, porque un plazo sin dueño vence sin que nadie lo decida. Declarar
no es mencionar: un change que nombra la fecha para decir que no la toca NO SHALL
contar como su dueño.

La comprobación SHALL reconocer la fecha por la fecha y NO por el nombre de lo que la
guarda: toda fecha escrita en una línea de código de producción —no en un comentario—
SHALL contar, en cualquiera de los lenguajes del marco y del andamio, incluidas las
definiciones de pipeline y las órdenes escritas directamente en un paso. El nombre lo
elige quien escribe la ventana; la fecha no la puede esconder. Además SHALL reconocerla
en las formas en que una ventana ya se escribió en este repositorio aunque la línea
esté comentada como ejemplo para copiar: una asignación de una sola línea y el valor
por defecto de un parámetro de un workflow reutilizable. Una fecha de código que es una
cita —cuándo se midió o se decidió algo— y no un plazo SHALL exceptuarse por su línea y
con su motivo escrito, y una excepción que ya no encuentra su línea SHALL fallar. El
andamio SHALL estar dentro de su alcance: una fecha que viaja en el andamio vence en el
repositorio de otro, sin pull request de actualización que la anuncie.

Y la comprobación NO SHALL poder pasar en vacío: su capacidad de ver cada forma SHALL
demostrarse sobre un sujeto fabricado, porque con cero fechas vivas «toda fecha tiene
dueño» es verdad tanto si no hay fechas como si el reconocimiento dejó de funcionar.

**El calendario que el marco publica para su propia constitución NO SHALL concederse
una ventana.** Ninguna versión que el marco publica SHALL declarar una exigibilidad
posterior a su publicación. Esa ventana vive en datos y no en código, así que la
comprobación de fechas no la ve; por eso se prohíbe en vez de exigirle dueño, y usarla
es una decisión que se toma en un change que cambie esta regla, no una fecha que se
escribe en un manifiesto.

Los pendientes que sobreviven al archivo de un change SHALL declarar dónde vive
ese trabajo, o declarar explícitamente que no bloquean y por qué. Un pendiente
archivado sin destino ni declaración SHALL tratarse como olvido.

#### Scenario: Una fecha de gracia viva en el código
- **WHEN** el código de producción declara una fecha hasta la cual una compuerta afloja
- **THEN** algún change activo se declara dueño de esa fecha, y si ninguno lo hace el pipeline falla nombrando el archivo y la fecha

#### Scenario: Una fecha de gracia que viaja en el andamio
- **WHEN** una definición de pipeline del andamio asigna en una sola línea una fecha hasta la cual una compuerta afloja
- **THEN** la comprobación la ve igual que la del código del marco y exige su dueño, porque esa fecha vencería en el repositorio de un proyecto sin que nada se lo anuncie

#### Scenario: Una fecha de gracia con un nombre que no la delata
- **WHEN** el código de producción o el andamio compara el día de la corrida contra una fecha escrita en una línea de código, sea cual sea el nombre de lo que la guarda, el lenguaje del archivo, o aunque no haya ningún nombre
- **THEN** la comprobación la ve y exige su dueño igual que si la variable se llamara ventana

#### Scenario: Una fecha de código que es una cita
- **WHEN** una línea de código de producción escribe una fecha dentro de un mensaje que cuenta cuándo se midió o se decidió algo
- **THEN** la comprobación la deja pasar solo si está exceptuada por esa línea con su motivo escrito, y falla el día en que la excepción ya no encuentra su línea

#### Scenario: Un change que menciona la fecha sin hacerse cargo
- **WHEN** la única referencia a una fecha viva en los changes activos es una mención de paso
- **THEN** el pipeline falla igual que si nadie la nombrara, porque nombrar una fecha no es poseerla

#### Scenario: No queda ninguna fecha viva
- **WHEN** el código de producción y el andamio no declaran ninguna fecha de gracia
- **THEN** la comprobación pasa, y su capacidad de ver cada forma de ventana sigue demostrada sobre un sujeto fabricado, de modo que el verde no se confunda con un reconocimiento roto

#### Scenario: Una versión del marco se concede una ventana por datos
- **WHEN** el calendario que el marco publica declara, para alguna versión, una exigibilidad posterior a su publicación
- **THEN** el pipeline del marco falla nombrando la versión y las dos fechas, con el arreglo escrito

#### Scenario: Un pendiente que sobrevive al archive
- **WHEN** un change se archiva con tareas sin completar
- **THEN** cada una dice dónde vive ese trabajo, o declara que no bloquea con su razón

#### Scenario: Un pendiente cuyo sujeto no existe en este repositorio
- **WHEN** un pendiente heredado nombra un artefacto que en este repositorio no existe
- **THEN** se declara no bloqueante con esa razón escrita, en vez de asignarle un destino inventado

### Requirement: La verificación de la infraestructura como código tiene una sola copia y su gravedad sigue a la línea mayor

El marco SHALL verificar el formato y la validez de las raíces de infraestructura como
código de cada consumidor en **un solo lugar**: el workflow reutilizable que todo
consumidor llama. El andamio NO SHALL repartir una segunda copia de esa verificación,
porque dos copias divergen y la del andamio, una vez copiada, deja de ser del marco.

La gravedad de un hallazgo SHALL depender de la **línea mayor** del marco que el
consumidor pina, y NO SHALL depender del día de la corrida. En la línea en la que un
hallazgo todavía no se exige, la verificación SHALL anunciarlo —el hallazgo y el hecho
de que es un aviso—, nunca callarlo; y la línea mayor que lo exige SHALL estar
anunciada en las notas de versión que el consumidor lee en su pull request de
actualización. El motivo de no exigirlo antes está medido: uno de los hallazgos, la
falta del binario de la herramienta en el ejecutor, se arregla en el marco y no en el
árbol del consumidor, y un rojo que el consumidor no puede arreglar en su árbol no se
estrena dentro de una línea mayor.

El anuncio NO SHALL depender de que alguien lo recuerde: el pipeline del marco SHALL
fallar en el pull request que publique la línea mayor anunciada si la verificación
sigue en aviso, y SHALL fallar también si, dentro de la línea anterior, la
verificación se endurece antes de tiempo o se retira el parámetro con el que los
consumidores fijaban la fecha, porque las dos cosas romperían a un consumidor que
actualiza sin leer.

El parámetro que fijaba la fecha SHALL seguir aceptándose sin efecto hasta la línea
mayor que lo retira, y quien lo pase SHALL recibir un aviso que diga que no tiene
efecto y que se retira: pasar a un workflow reutilizable un parámetro que no declara
hace fallar la corrida entera.

#### Scenario: Un hallazgo de infraestructura en la línea que todavía avisa
- **WHEN** un consumidor con raíces de infraestructura tiene un archivo sin formato, una raíz que no valida o un ejecutor sin el binario, y pina una versión de la línea que todavía no lo exige
- **THEN** la verificación pasa, anuncia el hallazgo y anuncia que es un aviso y desde qué línea mayor detiene

#### Scenario: El día de la corrida
- **WHEN** el mismo árbol se verifica con la misma versión del marco en dos días distintos, antes y después de cualquier fecha
- **THEN** el veredicto y los anuncios son los mismos, porque la gravedad sale de la versión y no del reloj

#### Scenario: Se publica la línea mayor anunciada con la verificación en aviso
- **WHEN** el pull request que publica la línea mayor que anunció el endurecimiento deja la verificación en aviso o conserva el parámetro de la fecha
- **THEN** el pipeline del marco falla en ese mismo pull request, nombrando lo que falta y el arreglo

#### Scenario: Se endurece dentro de la línea que avisa
- **WHEN** un cambio dentro de la línea que todavía avisa pone la verificación a detener, o retira el parámetro de la fecha
- **THEN** el pipeline del marco falla, porque cualquiera de las dos rompería a un consumidor que actualiza sin leer

#### Scenario: Un consumidor todavía pasa el parámetro de la fecha
- **WHEN** un consumidor pasa el parámetro con el que antes fijaba la fecha, con cualquier valor
- **THEN** la verificación da el mismo veredicto que sin él y le avisa que no tiene efecto y que se retira en la línea mayor siguiente

#### Scenario: El andamio vuelve a traer su propia copia
- **WHEN** la definición de pipeline que el andamio reparte vuelve a correr por su cuenta la verificación de formato o de validez de la infraestructura, o a fijarle una fecha o una gravedad
- **THEN** el pipeline del marco falla y dice que la verificación vive en el workflow reutilizable

## MODIFIED Requirements

### Requirement: La cobertura de pruebas alcanza el mínimo acordado y no retrocede

Cada paquete verificable del repositorio SHALL alcanzar el mínimo de cobertura
de pruebas acordado por el marco. El mínimo es el DESTINO de cada paquete y no un
promedio que se negocie corrida a corrida: mientras un paquete no lo alcance, la
distancia que le falta SHALL estar declarada y con fecha, y la integración SHALL
fallar cuando esa declaración no exista, cuando su fecha venza sin que el paquete
haya llegado, o cuando la cobertura ya conseguida retroceda.

La verificación SHALL aplicarse en dos planos, porque cada uno tapa un hueco que
el otro deja abierto:

- **Sobre las líneas que el cambio agrega o modifica**, sin holgura: código nuevo
  sin pruebas detiene la integración aunque el total del paquete siga por encima
  del mínimo. Sin este plano, un paquete con margen admite código sin pruebas
  hasta agotarlo.
- **Sobre el total del paquete**, que NO SHALL retroceder. Sin este plano, el
  código que ya existe sin pruebas puede quedarse así indefinidamente, porque
  nada lo obliga a nadie mientras nadie lo toque.

**El piso es el mecanismo de TRANSICIÓN hacia el mínimo, y no un sustituto de
él.** Mientras un paquete no alcance el mínimo, su total vigente SHALL funcionar
como piso y la integración SHALL fallar si baja de ahí. El piso de un paquete
SHALL ser el total que ya consiguió, y desde el día en que alcanza el mínimo SHALL
ser el mayor entre el mínimo del marco y ese total, para que un paquete que lo
superó no reciba licencia para volver a bajar hasta él. Estar por encima del piso
y por debajo del mínimo NO SHALL contar como cumplimiento: es una deuda, y en este
marco una deuda se declara con su fecha o pone rojo.

Esa declaración SHALL vivir en el manifiesto del propio paquete, junto a sus
exclusiones declaradas, y SHALL llevar dos datos: el motivo escrito y la fecha en
la que el paquete alcanza el mínimo. El piso SHALL declararse en ese mismo lugar,
y un paquete que no declara ninguno SHALL tener el mínimo del marco como piso: la
ausencia de declaración no baja la exigencia, la deja en el destino. Una
declaración a medio escribir —sin motivo, con una fecha que no existe en el
calendario, con una métrica que el marco no reconoce— NO SHALL contar como
declarada, porque si contara, escribirla mal sería la forma más barata de no
tener plazo.

En consecuencia la integración SHALL fallar en tres casos, y el tercero es el que
distingue esta garantía de un piso a secas:

1. cuando el total de un paquete cae por debajo de su piso vigente, esté ese piso
   arriba o abajo del mínimo;
2. cuando un paquete está por debajo del mínimo y no declara motivo ni fecha;
3. cuando la fecha declarada ya pasó y el paquete sigue por debajo del mínimo. A
   partir de ese día la comparación SHALL ser contra el mínimo del marco y no
   contra el piso, porque el plazo es lo único que impide que el piso se convierta
   en el mínimo de hecho.

Correr la fecha SHALL ser una declaración explícita y revisable: una línea de diff,
con su motivo y con el avance conseguido desde la fecha anterior, y jamás un ajuste
silencioso. Descender el piso, lo mismo.

**Un piso declarado cuya métrica llega SIN DATOS SHALL fallar.** Un piso es un
ratchet, y un ratchet que no tiene contra qué comparar dejó de proteger la ganancia
acumulada: no es una métrica que no aplica, es una compuerta apagada. Sin esta
regla, apagar el ratchet de un paquete cuesta lo mismo que cambiar el reporter de
cobertura o dejar de emitir una métrica, y la corrida sigue en verde imprimiendo
«n/a». Simétricamente, una deuda declarada sobre un paquete que no aportó ninguna
métrica medible NO SHALL fallar —no apagó ninguna comparación que existiera— pero
SHALL nombrarse en la corrida: una deuda que nadie nombra envejece en el manifiesto
y se paga sola sin que nadie sepa que estaba.

**Toda excepción a esta verificación SHALL estar escrita en el contrato y no solo en el
código, y ninguna SHALL depender de una fecha.** La que existe —la configuración del
proveedor de CI, que no se mide como código de aplicación— tiene su propio
requirement. La medición que lo obliga: la primera implementación se
estrenó con una ventana de gracia que vivía en un comentario del comparador, y contra
el consumidor real —un paquete a 70,70% de funciones sin deuda declarada— la
integración salía en verde mientras el escenario de este mismo requirement prometía
que fallaba. Un comentario no es el contrato, y una amnistía que el contrato no
nombra es indistinguible de la verificación que no existe.

**La verificación NO SHALL consultar ninguna fecha salvo la que el propio paquete
declaró en su deuda.** Hubo una segunda —el cierre de una ventana de estreno, el
2026-09-30, que convertía en aviso la falta de declaración, la métrica no medida y el
denominador corto— y se retiró: su justificación escrita era que el marco se consumía
por un tag móvil, y caducó cuando el canal pasó a la versión exacta, con la que un
veredicto nuevo llega dentro del pull request que mueve el pin y no en el pipeline de
alguien que no leyó nada. Los tres escenarios que siguen nombrando esa ventana
conservan su título a propósito: un delta `MODIFIED` no puede retirar un escenario
—los compara por nombre, y archivarlo lo borraría en silencio—, así que dicen, bajo el
título con el que nacieron, lo que ocurre ahora.

**El umbral que el proyecto configure para su propia herramienta SHALL poder
exigir MÁS que el mínimo del marco, y nunca menos.** Sobre las líneas del cambio,
bajarlo es una decisión del proyecto y alcanza con que la corrida lo diga; sobre
el total no, porque un piso que el propio paquete puede bajar no es un piso. La
verificación del total SHALL recalcularse desde los datos de cobertura y
compararse contra el mínimo del marco, en vez de creerle a la configuración local.
La medición que lo obliga: con los cuatro umbrales del consumidor bajados a 40, un
paquete al 33,3% pasaba la integración entera en verde.

**El marco SHALL repartir el umbral del total junto con su andamio**, para que un
paquete nuevo nazca con el piso puesto en vez de inventarlo. Un umbral que cada
proyecto se escribe termina fijado en el número que la medición dio ese día, y ese
número no exige nada porque ya está cumplido por construcción: así llegó el
consumidor a declarar 70,6 en funciones estando a 70,69.

Cada corrida SHALL reportar, por cada paquete que esté por debajo del mínimo,
cuánto le falta y cuánto plazo le queda. Una deuda que no se nombra en cada corrida
es una deuda que nadie mira hasta el día en que vence.

**Alternativa descartada: exigir que el piso suba en cada PR que toque el
paquete.** Ata el avance al tránsito por el código en vez de a una fecha, y falla
en las dos direcciones. Bloquea integraciones legítimas, porque un cambio que toca
solo archivos ya cubiertos no puede subir nada y quedaría rojo sin defecto que
arreglar; y admite el avance nominal, porque subir el piso una centésima satisface
la letra y deja la deuda intacta durante años. La fecha, en cambio, se verifica con
el día de la corrida en lugar del historial de quién tocó qué, y se declara donde
ya se declaran las exclusiones: en el manifiesto del paquete, dentro de un diff y
bajo revisión.

La medición SHALL distinguir «cubierto» de «no medido»: la ausencia de datos de
cobertura habiendo líneas agregadas SHALL ser un fallo ruidoso y NO un éxito
silencioso.

**Y el DENOMINADOR del total SHALL verificarse contra el que el propio reporte
declara.** Un porcentaje es cubiertas sobre encontradas, y «encontradas» se
reconstruye ítem por ítem de un reporte que el proyecto genera: un denominador
más corto que el real no baja la cobertura, la INFLA, así que apagar parte de la
medición rinde más que agregar pruebas. Por eso la verificación SHALL comparar
los ítems que llegaron contra el denominador que el reporte declara para esa
métrica y ese archivo, y SHALL fallar cuando lleguen menos. Y SHALL distinguir
«esta métrica vale cero» —el reporte declara su denominador en cero, y eso es un
n/a legítimo— de «esta métrica no se midió» —el reporte no declara denominador
alguno y no llegó ni un ítem—, que es «no medido» otra vez y NO SHALL pasar en
verde ni en silencio. La medición que lo obliga: sobre el reporte real del
consumidor, el paquete a 70,70% de funciones pasaba a EXIT 0 y a un «n/a» mudo
con solo dejar de emitir los registros de funciones —una opción documentada del
generador de reportes, y también lo que hace por su cuenta un generador de una
versión más nueva—; y borrándole los registros sin cubrir dejando el denominador
declarado intacto, la corrida publicaba 95,83% con la fila en OK teniendo el
propio reporte declaradas 215 funciones de las que llegaban 120. Las dos rondas
anteriores endurecieron la REGLA y ninguna la ENTRADA que la regla lee.

Un archivo del reporte cuya ruta no corresponde a ningún archivo versionado
queda fuera del total, y eso SHALL decirse en CUALQUIER evento del pipeline y no
solo en los que miden el diff: un archivo que sale del denominador sin dejar
rastro es la misma inflación por otra puerta.

Un paquete PUEDE excluir del cálculo el código que no le corresponde probar
—generado por otra herramienta, o puro arranque de la aplicación— declarándolo
con su motivo escrito, del mismo modo que las exclusiones del alcance.

#### Scenario: Un cambio que agrega código sin pruebas
- **WHEN** un cambio agrega líneas ejecutables y las pruebas no las ejercitan en la proporción mínima acordada
- **THEN** la integración falla indicando qué líneas quedaron sin cubrir, aunque el total del paquete siga por encima del mínimo

#### Scenario: Un paquete por debajo del mínimo con su plazo declarado y vigente
- **WHEN** la cobertura total de un paquete está por debajo del mínimo del marco, no retrocedió respecto de su piso vigente, y el paquete declara el motivo y la fecha en la que alcanza el mínimo
- **THEN** la integración pasa y reporta cuánto falta para el mínimo y cuánto plazo queda, de modo que la deuda se vea en cada corrida y no el día en que vence

#### Scenario: Un paquete por debajo del mínimo sin plazo declarado
- **WHEN** la cobertura total de un paquete está por debajo del mínimo del marco y el paquete no declara el motivo y la fecha en la que lo alcanza
- **THEN** la integración falla comparando contra el mínimo del marco, y nombra el paquete y la distancia que le falta: un paquete por debajo del mínimo sin plazo escrito no está en transición, está incumpliendo

#### Scenario: El plazo declarado venció y el paquete sigue por debajo del mínimo
- **WHEN** la fecha que el paquete declaró ya pasó y su cobertura total sigue por debajo del mínimo del marco
- **THEN** la integración falla comparando contra el mínimo y no contra el piso vigente, aunque el paquete no haya retrocedido

#### Scenario: La cobertura total de un paquete retrocede
- **WHEN** el total de un paquete cae por debajo de su piso vigente
- **THEN** la integración falla aunque el total siga por encima del mínimo del marco, porque el piso es la ganancia acumulada y no vuelve atrás

#### Scenario: El proyecto configura para sí mismo un umbral menor que el mínimo del marco
- **WHEN** la configuración de cobertura de un paquete exige menos que el mínimo del marco y su total está por debajo de ese mínimo
- **THEN** la integración falla comparando contra el mínimo del marco: bajar el umbral local sube la exigencia o no la mueve, y jamás vuelve verde un paquete en deuda

#### Scenario: Una declaración de deuda o de piso mal escrita
- **WHEN** un paquete por debajo del mínimo declara su deuda sin motivo, con una fecha que no existe en el calendario, o con una métrica que el marco no reconoce
- **THEN** la integración falla nombrando el manifiesto y el error: una declaración inválida no es una declaración, y no compra plazo

#### Scenario: Un piso declarado cuya métrica llega sin datos
- **WHEN** un paquete declara un piso para una métrica y su cobertura llega sin un solo dato de esa métrica
- **THEN** la integración falla nombrando el manifiesto y la métrica: un piso que no se puede comparar contra nada dejó de proteger la ganancia acumulada, y reportarlo como «n/a» en verde es indistinguible de no tener piso

#### Scenario: Una métrica que el reporte no midió
- **WHEN** una métrica de un paquete llega sin un solo dato y el reporte no declara ningún denominador para ella
- **THEN** la integración la trata como NO MEDIDA y no como una métrica que no aplica, porque apagar la métrica que enrojece costaría una línea de configuración del generador de reportes

#### Scenario: Una métrica que el reporte declara en cero
- **WHEN** una métrica de un paquete llega sin un solo dato y el reporte declara su denominador en cero
- **THEN** la corrida la reporta como «n/a» y pasa: el reporte está diciendo que midió y no había nada que medir, y esa es la única forma de no aplicar que no se puede fabricar apagando la medición

#### Scenario: El denominador llega más corto que el que el reporte declara
- **WHEN** los ítems de una métrica que llegan al cálculo son menos que los que el propio reporte declara para ese archivo
- **THEN** la integración falla diciendo cuántos declaró y cuántos llegaron, y NO publica el porcentaje como total: los ítems que faltan no están «sin cubrir», están fuera del denominador, y un denominador corto infla la cobertura

#### Scenario: Una deuda declarada sobre un paquete sin nada que medir
- **WHEN** un paquete declara una deuda y no aporta ninguna métrica medible en la corrida
- **THEN** la integración pasa y nombra el manifiesto: la deuda no excusa nada porque no hay nada medido, y una deuda que ninguna corrida nombra envejece sin que nadie la vea

#### Scenario: El estreno de la verificación del total, antes de que su ventana cierre
- **WHEN** una versión del marco estrena o endurece la verificación del total y un paquete queda por debajo del mínimo sin declarar motivo ni fecha
- **THEN** la integración falla desde esa misma versión, sin ninguna ventana que esperar: el rojo aparece dentro del pull request que mueve el pin, que es donde todavía se puede leer y arreglar antes de mergear

#### Scenario: La ventana de estreno ya cerró
- **WHEN** se compara el veredicto de un paquete por debajo del mínimo sin declaración, o de una métrica que el reporte no midió, o de un denominador más corto que el declarado, el día en que la versión se publica y cualquier día posterior
- **THEN** el veredicto es el mismo en todos: rojo, porque no hay ninguna ventana que se cierre por el paso del tiempo y el día de la corrida no entra en la decisión

#### Scenario: Un caso que la ventana de estreno NO afloja
- **WHEN** un paquete tiene una deuda declarada y vencida, o retrocede por debajo de su piso, o declara un piso para una métrica sin datos, o su declaración es inválida
- **THEN** la integración falla, igual que falla la ausencia de declaración: retirada la ventana ya no hay dos mitades, y lo escrito y lo no escrito se sostienen los dos desde el día en que la versión se publica

#### Scenario: Un paquete nuevo creado desde el andamio del marco
- **WHEN** un proyecto se crea copiando el andamio que el marco reparte
- **THEN** su configuración de cobertura llega con el mínimo del marco puesto en todas sus métricas, sin ningún número que el proyecto tenga que inventar

#### Scenario: Un cambio que solo elimina código
- **WHEN** un cambio únicamente elimina líneas, o renombra sin agregar código ejecutable
- **THEN** la medición del cambio pasa sin producir ruido, porque no hay líneas nuevas que cubrir

#### Scenario: No hay datos de cobertura habiendo líneas agregadas
- **WHEN** un cambio agrega líneas ejecutables y la medición no encuentra datos de cobertura que les correspondan
- **THEN** la integración falla señalando el problema de configuración, en vez de reportar cobertura total

#### Scenario: Código excluido del cálculo con su motivo declarado
- **WHEN** un paquete declara, con su justificación escrita, que cierto código no le corresponde probar
- **THEN** ese código no cuenta en el cálculo y la exclusión queda registrada en el resumen de la corrida
