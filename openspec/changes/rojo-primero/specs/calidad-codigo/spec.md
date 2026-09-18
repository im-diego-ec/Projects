# calidad-codigo — deltas de rojo-primero

## ADDED Requirements

### Requirement: Una compuerta nueva no se estrena sin su caso rojo demostrado

Toda compuerta nueva —un check de CI, una validación, un detector— SHALL entrar
acompañada de al menos una entrada de prueba que la ponga en ROJO, y el pipeline
SHALL comprobar que esa entrada efectivamente la pone en rojo. Una compuerta cuyo
caso negativo pasa en verde SHALL tratarse como fallo de la compuerta, y no como
ausencia de hallazgos.

La comprobación SHALL correr sobre la compuerta REAL y no sobre una descripción
de ella: el caso negativo ejecuta el texto que corre de verdad y se observa su
código de salida.

La ausencia de datos NO SHALL leerse como éxito. Cuando una compuerta no puede
evaluar lo que le toca —falta el archivo, falla la herramienta, no hay permiso—
SHALL decirlo de forma visible y NO SHALL devolver éxito silencioso.

**El pipeline SHALL saber, de cada paso de cada superficie donde el marco escribe
pasos, si algún banco lo corre.** Las superficies son las definiciones de pipeline
del propio marco, las que el andamio reparte y las de las acciones que el marco
publica, y SHALL derivarse del árbol y no de una lista: una superficie nueva entra
sola. Un paso que ningún banco corre SHALL estar declarado en una de dos formas, y
las dos formas NO SHALL confundirse:

- **Deuda**: el paso tiene lógica propia de decisión y nadie le escribió el caso
  todavía. Se declara con su motivo, y el pipeline SHALL publicarla en cada corrida.
- **Sin rojo propio**: el paso no verifica nada que un caso pueda refutar —es una
  acción, es la invocación directa de una herramienta, o avisa por diseño—. Se
  declara con su tipo y su motivo, y NO es trabajo pendiente.

Que un banco "corra" un paso se decide por el texto del banco, y SHALL constar como
proxy declarado: un nombre que se repite en dos superficies NO SHALL darse por
corrido en las dos porque un banco corrió uno.

#### Scenario: Una compuerta nueva con su caso negativo

- **WHEN** un cambio agrega una compuerta al pipeline
- **THEN** el cambio incluye la entrada que la pone en rojo, y el pipeline verifica que con esa entrada la compuerta falla

#### Scenario: Una compuerta cuyo caso negativo pasa en verde

- **WHEN** la entrada que debería poner en rojo a una compuerta la deja en verde
- **THEN** el pipeline falla señalando la compuerta, porque una compuerta que no puede fallar no verifica nada

#### Scenario: Una compuerta que no puede evaluar lo que le toca

- **WHEN** una compuerta no encuentra el insumo que necesita, o la herramienta que invoca no puede correr
- **THEN** lo reporta de forma visible y no devuelve éxito, porque «no hay datos» no es «está todo bien»

#### Scenario: Un paso que ningún banco corre y nadie declaró

- **WHEN** una superficie del marco —incluida la que el andamio reparte— trae un paso que ningún banco corre y que no está declarado como deuda ni como sin rojo propio
- **THEN** el pipeline falla nombrando el paso, su archivo y su línea, y diciendo las tres salidas: escribirle el banco, declararlo como deuda con su motivo, o declararlo sin rojo propio con su tipo y su motivo

#### Scenario: Una deuda que ya se pagó

- **WHEN** un paso declarado como deuda ya tiene un banco que lo corre, o la declaración nombra un paso o un archivo que ya no existe
- **THEN** el pipeline falla pidiendo borrar la declaración, porque una lista de deuda que no se poda deja de decir qué falta

#### Scenario: Un nombre repetido en dos superficies

- **WHEN** dos superficies traen un paso con el mismo nombre y un banco corre solo uno de ellos
- **THEN** el otro no cuenta como corrido, y queda sin estado hasta que un banco lo corra o se lo declare

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

Las plantillas de pull request que el marco usa y que el andamio reparte SHALL
pedir el comando con su código de salida y un lugar para lo no medido.

#### Scenario: Una afirmación verificable con su evidencia

- **WHEN** un pull request o un informe afirma que el sistema tiene una propiedad comprobable
- **THEN** incluye el comando y el código de salida que lo demuestran

#### Scenario: Una propiedad que no se pudo medir

- **WHEN** quien escribe no pudo ejecutar la comprobación de una propiedad que afirma
- **THEN** la declara explícitamente como no medida, en vez de afirmarla

#### Scenario: Una comprobación que interpreta la salida en vez del código de salida

- **WHEN** una comprobación decide si hubo hallazgos leyendo el texto que imprimió una herramienta
- **THEN** se trata como no comprobado, porque una herramienta que falló al arrancar imprime lo mismo que una que no encontró nada

#### Scenario: La plantilla de pull request pide la evidencia con su forma

- **WHEN** alguien abre un pull request en el marco, o en un proyecto nacido del andamio
- **THEN** la plantilla le pide el comando y su código de salida, con un ejemplo, y un lugar para lo que el pull request afirma y no pudo comprobar

### Requirement: Una regla sin compuerta automática se declara como tal

El marco SHALL publicar, para cada requirement de sus specs vivos, si existe una
compuerta automática que lo verifique. Una regla sin compuerta SHALL seguir
siendo válida —hay reglas que solo puede sostener el criterio humano— pero NO
SHALL presentarse como enforzada.

La declaración SHALL vivir en una sola superficie y NO SHALL mantenerse en
paralelo en otra: en una doble contabilidad la declaración siempre pierde contra
el código. Lo que esa superficie afirma y se puede medir —qué requirements existen,
cuántos hay, qué pasos cita— SHALL verificarlo el pipeline contra el árbol.

**La declaración SHALL poder citar compuertas de todas las superficies donde una
compuerta del marco puede vivir, incluidas las que el marco distribuye.** Una
compuerta que corre en el pipeline de cada proyecto nacido del andamio es una
compuerta del marco igual que las que corren en el suyo.

**Una pieza que NO PUEDE ponerse roja NO SHALL contar como la compuerta de un
requirement, y el pipeline SHALL fallar cuando la declaración la cite como tal.**
Subcontar produce una tabla fea; sobrecontar produce una tabla falsa, en la
dirección que nadie revisa. El criterio SHALL ser mecánico y SHALL constar como
proxy declarado: leer, en el propio paso o en el job que lo contiene, el
modificador que le desactiva el rojo. Juzgar si una frase en prosa afirma «no
puedo fallar» sería el mismo fail-open que este requirement prohíbe.

#### Scenario: Un requirement con compuerta

- **WHEN** un requirement de los specs vivos tiene un check que lo verifica
- **THEN** la declaración lo indica, nombrando la compuerta

#### Scenario: Un requirement sin compuerta

- **WHEN** un requirement solo puede sostenerlo el criterio humano en revisión
- **THEN** la declaración lo indica como tal, y su ausencia de compuerta no se lee como olvido

#### Scenario: Un requirement nuevo que nadie declaró

- **WHEN** se agrega un requirement a un spec vivo y la declaración no lo menciona
- **THEN** el pipeline falla, porque una regla fuera de la declaración se lee como enforzada sin serlo

#### Scenario: Una compuerta que vive en lo que el marco distribuye

- **WHEN** la declaración cita como compuerta un paso que vive en las definiciones de pipeline que el andamio reparte
- **THEN** el pipeline lo reconoce como un paso existente del marco, igual que si viviera en el pipeline del propio marco, y falla si deja de existir con ese nombre

#### Scenario: Una pieza que no puede fallar, citada como compuerta

- **WHEN** la declaración cita como la compuerta de un requirement un paso que lleva, en su cuerpo o en el de su job, el modificador que le desactiva el rojo
- **THEN** el pipeline falla nombrando el paso, su archivo y la línea del modificador
- **AND** el arreglo válido es retirar la cita —dejando al requirement con la cobertura que de verdad tenga— o quitarle el modificador y darle un rojo de verdad; no lo es escribir un motivo mejor

#### Scenario: Un paso cuyo rojo es el de la herramienta que invoca

- **WHEN** un paso no lleva ningún modificador que le desactive el rojo y su rojo es el de la herramienta o de las pruebas que corre
- **THEN** la declaración puede citarlo como compuerta y el pipeline no falla, porque su rojo existe aunque ningún banco aparte lo provoque
