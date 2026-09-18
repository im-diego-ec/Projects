# calidad-codigo — Delta

## ADDED Requirements

### Requirement: El arreglo que el marco le indica al consumidor existe en la herramienta vigente

Cuando una verificación del marco falla o avisa y le indica al consumidor cómo
arreglarlo, el arreglo SHALL nombrar un mecanismo que la versión vigente de la
herramienta del consumidor efectivamente lee. Una opción que la herramienta retiró
PUEDE citarse para orientar a quien la conoce, pero SOLO como historia y nunca como
el arreglo: seguir un consejo que la herramienta ignora en silencio agrega una línea
inerte y deja el defecto donde estaba, con el consumidor convencido de haberlo
arreglado.

Lo mismo vale para las comprobaciones que el marco hace sobre la configuración que
reparte con su andamio: SHALL leer la configuración **efectiva** y no su prosa. Una
comprobación que encuentra lo que busca dentro de un comentario verifica el
comentario, y queda en verde el día que la configuración que sostenía la garantía
desaparece.

#### Scenario: Un archivo del cambio que ningún reporte de cobertura reclama

- **WHEN** la verificación de cobertura falla porque un archivo fuente del cambio no tiene datos de cobertura
- **THEN** el mensaje indica declarar el alcance de la medición con el mecanismo que la herramienta vigente lee, y una opción ya retirada aparece, si aparece, solo como la forma que tenía antes

#### Scenario: La configuración de cobertura del andamio pierde su alcance declarado

- **WHEN** la configuración de cobertura que reparte el andamio deja de declarar su alcance en código, aunque un comentario siga nombrándolo o nombrando la opción retirada
- **THEN** el pipeline del marco falla nombrando el archivo y lo que falta, sin pedir la opción retirada como arreglo

#### Scenario: El alcance declarado no contiene nada

- **WHEN** la configuración de cobertura que reparte el andamio declara su alcance como una lista vacía, o lo escribe solo dentro de un texto o de un comentario de bloque
- **THEN** el pipeline del marco falla igual que si no lo declarara, porque un alcance sin ningún patrón no mide nada; y un alcance con uno o más patrones, escrito en una línea o en varias, pasa

### Requirement: La configuración del proveedor de CI no se mide como código de aplicación

Los archivos que viven en el directorio de configuración del proveedor de CI SHALL
quedar fuera de la exigencia de cobertura de pruebas, aunque su extensión sea la de
un archivo fuente: corren en el ejecutor del pipeline y no en la suite de ningún
paquete, así que ninguna prueba puede producir datos de cobertura para ellos y
exigirlos es un fallo que nadie puede apagar. La exención SHALL decidirse por la
ubicación que la plataforma reserva a esa configuración y NO por «fuera de todo
paquete»: un repositorio con un manifiesto en su raíz tiene todo archivo dentro de
algún paquete, y esa regla quedaría inerte.

La exención NO SHALL ser silenciosa: la corrida SHALL nombrar esos archivos como
fuera de la medición. Y NO SHALL extenderse a ningún otro archivo: el código de
aplicación sin datos de cobertura sigue fallando como lo exige el requirement de
cobertura.

#### Scenario: Un script de CI con extensión de fuente en un repositorio con manifiesto raíz

- **WHEN** un cambio agrega un script al directorio de configuración del proveedor de CI y el repositorio tiene un manifiesto de paquete en su raíz
- **THEN** la verificación de cobertura no lo exige, y la corrida lo nombra como fuera de la medición

#### Scenario: Código de aplicación sin datos de cobertura en el mismo repositorio

- **WHEN** un cambio agrega código de aplicación que ningún reporte de cobertura reclama, en un repositorio con manifiesto raíz
- **THEN** la integración falla como antes: la exención no alcanza a nada fuera del directorio de configuración del proveedor de CI

### Requirement: El artefacto corregido que el pipeline promete se publica de verdad

Cuando el pipeline que el andamio reparte promete, como salida de un fallo, un
artefacto descargable con el arreglo ya hecho, ese artefacto SHALL publicarse con su
contenido en toda corrida, y una publicación vacía SHALL ser un fallo de la corrida y
no un aviso. Una salida de emergencia que el mensaje de fallo promete y que no existe
es peor que ninguna: manda a buscarla a quien ya está bloqueado.

#### Scenario: El artefacto corregido vive en rutas ocultas

- **WHEN** la verificación deja los archivos corregidos bajo directorios ocultos y el paso de publicación del artefacto excluye por defecto los archivos ocultos
- **THEN** el paso los incluye de forma explícita y el artefacto publicado los contiene

#### Scenario: No hay nada que publicar

- **WHEN** el paso de publicación del artefacto corregido no encuentra ningún archivo
- **THEN** la corrida falla en ese paso, en lugar de terminar con un aviso que nadie lee

#### Scenario: Una corrida verde

- **WHEN** la verificación de la constitución pasa en verde
- **THEN** el directorio que se publica igual contiene el artefacto al día, de modo que exigir que no esté vacío no enrojece una corrida sana
