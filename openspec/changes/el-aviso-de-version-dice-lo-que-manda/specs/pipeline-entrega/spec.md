# pipeline-entrega — Delta

## ADDED Requirements

### Requirement: El aviso de versión transmite entera la acción que pide

Cuando un repositorio anuncia una versión a sus consumidores con el aviso de versión
del marco, cada declaración de ruptura del changelog SHALL llegar al mensaje
completa, aunque su texto ocupe varias líneas, y SHALL terminar donde termina esa
declaración.

El texto fijo del aviso SHALL nombrar el canal por el que los consumidores reciben la
versión según la configuración que el andamio reparte, y el puntero móvil de la línea
mayor de la versión anunciada, derivado de esa versión y no escrito a mano. NO SHALL
llevar conteos de referencias internas del marco mantenidos a mano.

#### Scenario: Una declaración de ruptura envuelta en varias líneas

- **WHEN** la entrada de la versión declara una ruptura cuyo texto continúa en las líneas siguientes
- **THEN** el mensaje la lleva entera, con su consecuencia y con el formato que abre también cerrado

#### Scenario: Lo que sigue a una declaración de ruptura no se le pega

- **WHEN** después de la declaración viene una línea vacía, otra viñeta o un encabezado
- **THEN** el mensaje no los une a la declaración anterior

#### Scenario: Se anuncia la primera versión de una línea mayor nueva

- **WHEN** se anuncia una versión cuya línea mayor es distinta de la de la versión anterior
- **THEN** el aviso nombra el puntero de la línea de esa versión y no el de otra

#### Scenario: El andamio deja de recibir el marco por el canal que el aviso nombra

- **WHEN** la configuración que reparte el andamio cambia el canal por el que llega la versión del marco
- **THEN** el banco del aviso falla hasta que el texto fijo nombre el canal vigente, en vez de dejar la frase vieja viajando a los consumidores

### Requirement: El aviso de la próxima versión se mide en el pull request que lo escribe

El pipeline del repositorio que publica versiones SHALL medir, en cada pull request,
el mensaje que el aviso armaría para las secciones del changelog que todavía puede
mandar —la que acumula los cambios sin publicar y la versión más alta declarada—,
usando la misma lógica con la que el aviso lo arma y no una estimación.

SHALL fallar cuando una de esas secciones no traiga el resumen para consumidores,
aunque el mensaje entre en el límite; cuando ese resumen siga siendo el texto de
fábrica y la sección ya declare cambios; o cuando el mensaje no entre en el límite.
Cada falla SHALL traer su arreglo, distinto según la causa, y la de resumen ausente
SHALL decir cuánto del mensaje llegaría de verdad al destino. No encontrar ninguna
sección que medir SHALL ser falla, no un resultado exitoso.

El límite contra el que se mide SHALL ser el mismo que el aviso aplica al enviar, y
SHALL estar declarado en un solo lugar. El procedimiento de corte de versión SHALL
dictar una sección sin publicar que esta medición acepta, y el pipeline SHALL
comprobarlo sobre el texto que ese procedimiento manda escribir.

#### Scenario: Falta el resumen para consumidores

- **WHEN** la sección sin publicar no trae su resumen para consumidores, aunque el mensaje entre en el límite
- **THEN** el pipeline falla, manda a escribir el resumen y no a acortar nada, y dice cuánto del mensaje llegaría al destino

#### Scenario: El pull request que corta una versión

- **WHEN** el pull request corta una versión y deja la sección sin publicar con el texto de fábrica
- **THEN** se mide también la versión recién cortada, y un mensaje que no entra falla en ese pull request y no después de enviarse

#### Scenario: El texto de fábrica quedó encima de cambios reales

- **WHEN** la sección sin publicar declara cambios y su resumen para consumidores sigue siendo el texto de fábrica
- **THEN** el pipeline falla nombrando las subsecciones de cambios

#### Scenario: El texto de fábrica sin cambios

- **WHEN** la sección sin publicar tiene únicamente su resumen con el texto de fábrica
- **THEN** el pipeline no falla por eso

#### Scenario: No hay nada que medir

- **WHEN** el changelog no tiene sección sin publicar ni ninguna versión declarada
- **THEN** el pipeline falla en vez de declarar un resultado exitoso por no haber podido medir

#### Scenario: El límite se repite en un segundo lugar

- **WHEN** la declaración de la pieza que arma el aviso fija su propio límite por defecto
- **THEN** el banco del pipeline falla nombrando dónde quitarlo

#### Scenario: El procedimiento de release cambia el texto que dicta

- **WHEN** el procedimiento de corte de versión dicta una sección sin publicar sin resumen para consumidores, o con un texto que no es el que la medición reconoce como de fábrica
- **THEN** el banco del pipeline falla antes del release y no dentro del pull request que lo corta

### Requirement: El diagnóstico del aviso nombra la causa real y su arreglo

Al armar el aviso, cuando el mensaje se recorte o falte el resumen para consumidores,
la pieza SHALL advertirlo diciendo cuánto llega de verdad y el límite que aplicó, y el
arreglo que propone SHALL corresponder a la rama que tomó: escribir el resumen cuando
falta, acortarlo cuando existe. NO SHALL afirmar que el mensaje llega completo cuando
lo recorta.

#### Scenario: Falta el resumen y el mensaje no entra

- **WHEN** la entrada no trae resumen para consumidores y el cuerpo que se arma en su lugar supera el límite
- **THEN** la advertencia manda a escribir el resumen, no a acortarlo, y dice a cuánto se recortó

#### Scenario: El resumen existe y no entra

- **WHEN** la entrada trae su resumen para consumidores y el mensaje supera el límite
- **THEN** la advertencia manda a acortar el resumen

#### Scenario: Falta el resumen y el mensaje entra

- **WHEN** la entrada no trae resumen para consumidores y el cuerpo entra en el límite
- **THEN** la advertencia de ausencia sale igual y ninguna advertencia afirma un recorte que no ocurrió

### Requirement: Una corrida del aviso que no envía nada lo dice donde se ve

Cuando el aviso se dispara a mano en modo simulacro, la corrida SHALL declararlo con
una advertencia que diga cómo enviarlo de verdad, y SHALL declararlo también en el
nombre de la corrida, que es lo visible sin abrirla. El modo simulacro SHALL seguir
siendo el valor por defecto del disparo manual.

#### Scenario: Un disparo manual sin desmarcar el simulacro

- **WHEN** alguien dispara el aviso a mano y deja el simulacro marcado
- **THEN** el nombre de la corrida dice que no envía, y el registro emite una advertencia con el arreglo para enviarlo

#### Scenario: El aviso que sale por la publicación de un release

- **WHEN** el aviso se dispara por la publicación de un release
- **THEN** la corrida no se nombra como simulacro y el mensaje se envía
