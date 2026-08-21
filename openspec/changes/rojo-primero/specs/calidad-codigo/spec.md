# calidad-codigo — deltas de rojo-primero

## ADDED Requirements

### Requirement: Una compuerta nueva no se estrena sin su caso rojo demostrado

Toda compuerta nueva —un check de CI, una validación, un detector— SHALL entrar
acompañada de al menos una entrada de prueba que la ponga en ROJO, y el pipeline
SHALL comprobar que esa entrada efectivamente la pone en rojo. Una compuerta cuyo
caso negativo pasa en verde SHALL tratarse como fallo de la compuerta, y no como
ausencia de hallazgos.

La comprobación SHALL correr sobre la compuerta REAL y no sobre una descripción
de ella: el caso negativo se ejecuta y se observa su código de salida.

La ausencia de datos NO SHALL leerse como éxito. Cuando una compuerta no puede
evaluar lo que le toca —falta el archivo, falla la herramienta, no hay permiso—
SHALL decirlo de forma visible y NO SHALL devolver éxito silencioso.

#### Scenario: Una compuerta nueva con su caso negativo

- **WHEN** un cambio agrega una compuerta al pipeline
- **THEN** el cambio incluye la entrada que la pone en rojo, y el pipeline verifica que con esa entrada la compuerta falla

#### Scenario: Una compuerta cuyo caso negativo pasa en verde

- **WHEN** la entrada que debería poner en rojo a una compuerta la deja en verde
- **THEN** el pipeline falla señalando la compuerta, porque una compuerta que no puede fallar no verifica nada

#### Scenario: Una compuerta que no puede evaluar lo que le toca

- **WHEN** una compuerta no encuentra el insumo que necesita, o la herramienta que invoca no puede correr
- **THEN** lo reporta de forma visible y no devuelve éxito, porque «no hay datos» no es «está todo bien»

### Requirement: Una afirmación de comportamiento se acredita por código de salida

Toda afirmación sobre una propiedad VERIFICABLE del sistema —en el cuerpo de un
pull request, en un informe de auditoría o en un documento del repositorio— SHALL
viajar con el comando que la comprueba y el código de salida que devolvió.

Interpretar la SALIDA de un comando —contar sus líneas, buscar un texto en ella—
NO SHALL contar como comprobación: una herramienta que no pudo correr produce
salida vacía, indistinguible de una corrida sin hallazgos.

Cuando una propiedad no se pudo comprobar, el documento SHALL declararlo como no
medido. Una propiedad afirmada sin comprobación SHALL tratarse como defecto del
documento.

#### Scenario: Una afirmación verificable con su evidencia

- **WHEN** un pull request o un informe afirma que el sistema tiene una propiedad comprobable
- **THEN** incluye el comando y el código de salida que lo demuestran

#### Scenario: Una propiedad que no se pudo medir

- **WHEN** quien escribe no pudo ejecutar la comprobación de una propiedad que afirma
- **THEN** la declara explícitamente como no medida, en vez de afirmarla

#### Scenario: Una comprobación que interpreta la salida en vez del código de salida

- **WHEN** una comprobación decide si hubo hallazgos leyendo el texto que imprimió una herramienta
- **THEN** se trata como no comprobado, porque una herramienta que falló al arrancar imprime lo mismo que una que no encontró nada

### Requirement: Una regla sin compuerta automática se declara como tal

El marco SHALL publicar, para cada requirement de sus specs vivos, si existe una
compuerta automática que lo verifique. Una regla sin compuerta SHALL seguir
siendo válida —hay reglas que solo puede sostener el criterio humano— pero NO
SHALL presentarse como enforzada.

La declaración SHALL derivarse de una sola fuente y NO SHALL mantenerse a mano en
paralelo: en una doble contabilidad la declaración siempre pierde contra el
código.

#### Scenario: Un requirement con compuerta

- **WHEN** un requirement de los specs vivos tiene un check que lo verifica
- **THEN** la declaración lo indica, nombrando la compuerta

#### Scenario: Un requirement sin compuerta

- **WHEN** un requirement solo puede sostenerlo el criterio humano en revisión
- **THEN** la declaración lo indica como tal, y su ausencia de compuerta no se lee como olvido

#### Scenario: Un requirement nuevo que nadie declaró

- **WHEN** se agrega un requirement a un spec vivo y la declaración no lo menciona
- **THEN** el pipeline falla, porque una regla fuera de la declaración se lee como enforzada sin serlo
