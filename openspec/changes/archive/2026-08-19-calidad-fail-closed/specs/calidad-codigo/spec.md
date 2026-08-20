# calidad-codigo — Delta

## RENAMED Requirements

- FROM: `### Requirement: Scripts de lint sin enmascaramiento de fallo`
- TO: `### Requirement: Scripts de verificación sin enmascaramiento de fallo`

El título decía "lint" desde el principio mientras su cuerpo ya hablaba de
"scripts de verificación". El retitulado alinea el título con lo que el
requirement siempre dijo, y con el hecho de que ahora hay un check que lo
comprueba sobre cualquier script de verificación, no solo el de lint.

## MODIFIED Requirements

### Requirement: Lint y formato configurados para todos los paquetes

El repositorio SHALL tener linter y formateador configurados y ejecutables en
CADA paquete del monorepo, con reglas alineadas a la constitución de
ingeniería (`AGENTS.md`: TypeScript strict, `any` solo con justificación, sin
promesas flotantes).

Ningún paquete SHALL quedar fuera del alcance del lint: incorporar un paquete
nuevo sin su configuración SHALL ser un fallo, no un punto ciego silencioso.

Esta garantía es por PAQUETE y se conserva. Aparte se enuncia otra, más fuerte y
por ARCHIVO, porque la de paquete no alcanza: los dos agujeros que motivaron el
cambio vivían DENTRO de paquetes correctamente configurados, y ninguna propiedad
enunciada por paquete puede describirlos.

#### Scenario: Ejecutar lint en un paquete limpio
- **WHEN** se ejecuta el script `lint` de cualquier paquete del monorepo sin violaciones presentes
- **THEN** el comando termina con código de salida 0 y no reporta errores

#### Scenario: Ejecutar lint con una violación presente
- **WHEN** existe una violación de regla (por ejemplo un `any` sin comentario justificativo) y se ejecuta el script `lint`
- **THEN** el comando reporta el error con archivo y línea y termina con código de salida distinto de 0

#### Scenario: Paquete nuevo sin configuración de lint
- **WHEN** se incorpora al monorepo un paquete que no queda cubierto por la configuración de lint
- **THEN** la verificación de CI lo señala como fallo — un paquete sin lint no pasa por verificado

### Requirement: Scripts de verificación sin enmascaramiento de fallo

Los scripts de verificación declarados en los manifiestos de los paquetes
SHALL propagar el código de salida real, sin sufijos ni envoltorios que
conviertan un fallo en éxito.

La verificación de integración SHALL detectar el enmascaramiento por sí misma:
un script que convierte un rojo en verde es, por construcción, invisible para
todo lo que dependa de su código de salida —incluido el pipeline—, así que la
única forma de atraparlo es examinar el script, no ejecutarlo.

#### Scenario: Un fallo de lint se propaga al invocador
- **WHEN** el lint encuentra una violación al ejecutarse vía el script declarado del paquete
- **THEN** el proceso invocador (incluido CI) recibe un código de salida distinto de 0

#### Scenario: Un script de verificación que enmascara su fallo
- **WHEN** un script de verificación declarado en un manifiesto convierte un fallo en éxito mediante un sufijo o un envoltorio
- **THEN** la verificación de integración falla señalando el manifiesto, el script y el arreglo concreto

## ADDED Requirements

### Requirement: Ningún archivo fuente fuera del alcance de la verificación

Todo archivo de código fuente versionado en el repositorio SHALL quedar dentro
del alcance de la verificación automática de calidad: alguna herramienta de
análisis estático SHALL examinarlo y —cuando el lenguaje tenga verificación de
tipos— alguna configuración de compilación SHALL incluirlo en su programa.

Un archivo que ninguna herramienta examina SHALL ser un fallo de la
verificación, no un punto ciego silencioso. El alcance SHALL derivarse de las
herramientas realmente configuradas en el repositorio, y NO de una lista de
paquetes ni de directorios mantenida a mano: incorporar un paquete, un
directorio o un archivo nuevo SHALL quedar cubierto sin que nadie agregue nada
a ninguna lista.

Un archivo PUEDE quedar deliberadamente fuera del alcance, y en ese caso el
paquete que lo contiene SHALL declararlo con su motivo escrito. La exclusión no
vuelve imposible la evasión: la vuelve **visible**. Deja de ser una ausencia
—que no aparece en ningún diff ni en ninguna corrida— y pasa a ser una
afirmación firmada, dentro de un diff, sujeta a revisión.

#### Scenario: Un archivo fuente que ninguna herramienta examina
- **WHEN** el repositorio versiona un archivo de código fuente que ninguna configuración de análisis estático alcanza, o que —siendo de un lenguaje con verificación de tipos— ninguna configuración de compilación incluye en su programa
- **THEN** la verificación falla nombrando el archivo y las formas concretas de cubrirlo, antes del merge

#### Scenario: Archivo excluido con su motivo declarado
- **WHEN** el repositorio versiona un archivo que legítimamente ninguna herramienta examina y el paquete que lo contiene declara la exclusión junto con su justificación escrita
- **THEN** la verificación pasa y deja constancia de la exclusión y de su motivo en el resumen de la corrida

#### Scenario: Una exclusión que dejó de corresponder a un archivo
- **WHEN** una exclusión declarada ya no corresponde a ningún archivo versionado
- **THEN** la verificación falla, para que las exclusiones no sobrevivan al problema que las justificó

#### Scenario: El repositorio declara la verificación pero no la ejecuta
- **WHEN** el pipeline del repositorio no invoca la derivación del alcance en ninguno de sus flujos
- **THEN** la verificación falla indicando qué paso agregar y en qué job

### Requirement: El formato acordado se verifica en cada integración

El formato de código acordado del repositorio SHALL verificarse en cada
integración, y una divergencia SHALL detener la integración.

La verificación SHALL excluir los archivos que otra herramienta genera y
regenera: un archivo generado obedece a la herramienta que lo produce y no al
formateador, de modo que exigirle el formato del repositorio produce un fallo
permanente sobre un archivo que ninguna persona escribió ni puede corregir.

#### Scenario: Un cambio con el formato divergente
- **WHEN** un cambio introduce código que no respeta el formato acordado del repositorio
- **THEN** la integración falla indicando el comando que lo corrige

#### Scenario: Un archivo generado por otra herramienta
- **WHEN** el repositorio versiona archivos que una herramienta genera y regenera
- **THEN** la verificación de formato no los evalúa

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

**El estreno de la verificación del total lleva VENTANA DE GRACIA, con su fecha
escrita.** El marco se consume por un tag móvil, así que una verificación nueva
aparece en el pipeline de cada proyecto sin que nadie la haya leído: por eso se
estrena en modo aviso. Hasta la fecha de cierre —**2026-09-30**— un paquete por
debajo del mínimo que NO declara nada SHALL avisar en vez de detener, y la corrida
SHALL nombrar el día desde el cual el mismo estado es rojo. La ventana SHALL
cerrarse por el paso del tiempo y no por una edición: pasada esa fecha, el mismo
repositorio falla sin que nadie toque una línea.

Y la ventana SHALL aflojar ÚNICAMENTE la falta de declaración. Una deuda declarada
y vencida, un retroceso por debajo del piso, un piso sin datos y una declaración
inválida SHALL fallar dentro de la ventana igual que fuera: en esos cuatro casos
alguien escribió algo, y lo escrito se sostiene desde el día en que se escribió.

La fecha de cierre SHALL estar escrita acá y no solo en el código. La medición que
lo obliga: la primera implementación de esta verificación puso la ventana en un
comentario del comparador, y contra el consumidor real —un paquete a 70,70% de
funciones sin deuda declarada— la integración salía en verde mientras el escenario
de este mismo requirement prometía que fallaba. Un comentario no es el contrato, y
una amnistía que el contrato no nombra es indistinguible de la verificación que no
existe.

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

#### Scenario: Una deuda declarada sobre un paquete sin nada que medir
- **WHEN** un paquete declara una deuda y no aporta ninguna métrica medible en la corrida
- **THEN** la integración pasa y nombra el manifiesto: la deuda no excusa nada porque no hay nada medido, y una deuda que ninguna corrida nombra envejece sin que nadie la vea

#### Scenario: El estreno de la verificación del total, antes de que su ventana cierre
- **WHEN** la verificación del total se estrena y un paquete queda por debajo del mínimo sin declarar motivo ni fecha, antes de la fecha de cierre de la ventana de gracia
- **THEN** la integración pasa avisando y nombra el día desde el cual el mismo estado es rojo, para que el proyecto se entere por un aviso con fecha y no por un rojo que llegó de un cambio del marco

#### Scenario: La ventana de estreno ya cerró
- **WHEN** pasó la fecha de cierre de la ventana de gracia y un paquete sigue por debajo del mínimo sin declarar motivo ni fecha
- **THEN** la integración falla sin que nadie haya editado nada, porque la ventana se cierra por el paso del tiempo y no por una decisión que alguien tenga que recordar

#### Scenario: Un caso que la ventana de estreno NO afloja
- **WHEN** dentro de la ventana de gracia un paquete tiene una deuda declarada y vencida, o retrocede por debajo de su piso, o declara un piso para una métrica sin datos, o su declaración es inválida
- **THEN** la integración falla igual que fuera de la ventana: la ventana perdona la ausencia de declaración, nunca una declaración que el paquete escribió y rompió

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
