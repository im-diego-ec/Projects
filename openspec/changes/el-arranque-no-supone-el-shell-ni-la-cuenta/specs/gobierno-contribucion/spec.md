## ADDED Requirements

### Requirement: En una organización, el rol de producto que el archivo de propietarios nombra se contrasta contra sus equipos

Cuando el repositorio vive en una organización y el archivo de propietarios de código le
asigna los artefactos de decisión de producto a un equipo, el arranque SHALL consultar al
proveedor —en solo lectura— quiénes forman ese equipo y el de construcción, y SHALL avisar
cuando fuera del equipo de construcción no quede exactamente una persona, o cuando esa
persona no sea la que el proyecto declara en el rol de producto. SHALL no elegir una entre
varias.

El aviso SHALL traer el arreglo escrito y el comando para mirarlo a mano, porque el arreglo
—la composición de los equipos— es un acto de quien administra la organización, fuera del
árbol del proyecto. Si la consulta no se pudo hacer, el arranque SHALL decirlo con su motivo
y SHALL no afirmar que el cableado está bien. En una cuenta personal, donde los equipos no
existen, SHALL no consultar nada.

El mismo control SHALL poder correrse a pedido, fuera del arranque, sobre el archivo de
valores del proyecto.

#### Scenario: El equipo del rol de producto no sostiene el gate
- **WHEN** en una organización el equipo del rol de producto está vacío, o todos sus miembros están también en el equipo de construcción, o tiene más de una persona fuera de él, o la única no es la declarada
- **THEN** el arranque avisa qué encontró, qué hay que cambiar y con qué comando mirarlo, sin elegir a nadie en lugar de la persona declarada

#### Scenario: No se pudo consultar
- **WHEN** la consulta de los equipos falla por falta de sesión, de red, de permisos o porque el equipo no es visible
- **THEN** el arranque dice que no se pudo comprobar y por qué, y no presenta el cableado como verificado

#### Scenario: Cuenta personal
- **WHEN** el repositorio vive en una cuenta personal
- **THEN** el arranque no consulta equipos

### Requirement: Los comandos para contrastar la protección documentada se corren tal como están escritos

Los comandos con que la documentación de la protección manda contrastarla contra la
configuración real del proveedor SHALL poder correrse tal como están escritos: si uno
necesita un identificador que devuelve otro, la secuencia SHALL encadenarlo sin pedir que se
copie a mano, y la documentación SHALL declarar el shell que suponen junto con el error que
se ve fuera de él.

#### Scenario: Una secuencia que necesita un identificador
- **WHEN** la documentación manda correr varios comandos y uno necesita el identificador que devuelve otro
- **THEN** la secuencia lo encadena sola, busca el conjunto de reglas por el nombre que la misma documentación le da, y el documento dice en qué shell corre y qué error se ve en otro
