# gobierno-contribucion — deltas de el-consumidor-se-anota

## ADDED Requirements

### Requirement: La adopción del marco deja escrito quién lo consume

La herramienta que instancia un proyecto SHALL nombrar, entre los actos humanos
que imprime al terminar, el registro de consumidores del marco, y SHALL entregar
los tres datos que la fila necesita ya resueltos: la coordenada `<cuenta>/<repo>`
del repositorio, la fecha de adopción, y la versión exacta del marco con la que
ese repositorio nace.

La versión SHALL leerse del árbol que la propia herramienta acaba de escribir en
el destino, y NO SHALL declararse como constante dentro de la herramienta: el pin
lo fija el andamio y lo mueve el release, así que una constante sería una segunda
declaración del mismo hecho y podría divergir sin que nada lo cruce.

Cuando la versión no se pueda leer del árbol escrito, la herramienta SHALL
decirlo en la propia línea y NO SHALL inventar un valor ni omitir el pendiente:
una fila con una versión adivinada no se distingue de una medida.

Este requirement NO promete que la fila se escriba sola. La escritura y el merge
siguen siendo actos humanos; lo que se exige es que el dato llegue resuelto al
único momento en que existe con certeza.

#### Scenario: Un proyecto que se instancia

- **WHEN** la herramienta termina de escribir un proyecto nuevo en el destino
- **THEN** entre los actos humanos que imprime aparece el registro de consumidores, con el repo, la fecha y la versión exacta con la que ese repo nace

#### Scenario: La versión que se publica es la que el repo tiene

- **WHEN** la herramienta informa la versión con la que nace el repositorio
- **THEN** esa versión es la que quedó escrita en el `ci.yml` del destino, y no un valor declarado aparte en la herramienta

#### Scenario: El árbol escrito no permite leer la versión

- **WHEN** la herramienta no puede leer el pin del marco en el árbol que escribió
- **THEN** el pendiente se imprime igual, diciendo que la versión no se pudo leer, en vez de omitir la línea o completar un valor inventado

### Requirement: El registro de consumidores declara su alcance y su límite

La página del registro de consumidores SHALL declarar explícitamente que una
tabla vacía no significa «cero consumidores», y SHALL nombrar por separado las
causas de las filas ausentes: las adopciones anteriores al registro, que no se
pueden reponer desde el árbol, y las adopciones nuevas.

Cuando la mitad automática exista, la página NO SHALL seguir declarándola
pendiente: la medición que la propia página define SHALL ser la que decida si
ese texto corresponde.

#### Scenario: Alguien lee la tabla vacía

- **WHEN** una persona abre el registro y no encuentra filas
- **THEN** la página le dice que eso no significa que nadie consuma el marco, y le separa las dos causas de la ausencia

#### Scenario: La mitad automática ya existe

- **WHEN** la herramienta ya nombra el registro entre los actos humanos
- **THEN** la página deja de declarar esa mitad como pendiente, porque su propia medición devuelve la línea
