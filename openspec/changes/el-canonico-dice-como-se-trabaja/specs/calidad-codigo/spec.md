# calidad-codigo — Delta de `el-canonico-dice-como-se-trabaja`

## ADDED Requirements

### Requirement: El presupuesto de líneas de la constitución declara cómo se mide, y cambiarlo queda escrito

La porción del marco de la constitución SHALL tener un tope de líneas declarado, y
el pipeline del marco SHALL fallar cuando el texto que se publica lo supere. Cada
línea de ese texto la carga cada sesión de cada proyecto: el tope es lo único que
contiene el incentivo de que agregar una regla al marco sea barato mientras el
costo lo paga otro.

El tope SHALL declarar, junto al número, **cómo se mide**: nombrando la medición
que cobra el pipeline y advirtiendo contra la que parece obvia y da menos. Un
margen medido con otra cuenta que la del pipeline es un margen que no existe, y
quien lo cree agrega una regla que sale en rojo sin entender por qué.

La explicación que acompaña al tope SHALL nombrar el valor vigente, de modo que
cambiar el número sin reescribir la decisión que lo justifica ponga el pipeline en
rojo: subir el tope es una decisión con su motivo, no un ajuste para que el
pipeline pase. Y la aritmética que esa explicación describe SHALL ser la que el
pipeline cobra: si cambia la forma en que se arma el texto medido, el pipeline
SHALL fallar hasta que la explicación vuelva a decir la verdad.

#### Scenario: El texto de la constitución supera el tope
- **WHEN** un cambio del marco deja la porción del marco de la constitución con más líneas que el tope declarado
- **THEN** el pipeline del marco falla diciendo cuántas líneas usa y cuál es el tope, y que subirlo es una decisión

#### Scenario: Se sube el tope sin escribir la decisión
- **WHEN** alguien cambia el número del tope y deja la explicación que lo acompaña nombrando el valor anterior, o sin explicación
- **THEN** el pipeline del marco falla nombrando el valor que falta y qué tiene que decir la explicación

#### Scenario: La explicación deja de decir cómo se mide
- **WHEN** la explicación del tope deja de nombrar la medición que cobra el pipeline o deja de advertir contra la cuenta que da menos
- **THEN** el pipeline del marco falla, porque sin esa advertencia el próximo que mida a mano cree tener un margen que no tiene

#### Scenario: Cambia cómo se arma el texto que se mide
- **WHEN** un cambio altera cómo se junta el texto de la constitución, de modo que su conteo deja de ser la suma de las secciones más el separador que la explicación describe
- **THEN** el pipeline del marco falla pidiendo reescribir la explicación en el mismo cambio
