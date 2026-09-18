# calidad-codigo — Delta

## ADDED Requirements

### Requirement: Ninguna pieza del marco viaja a un consumidor por una referencia que se mueve

El marco NO SHALL referenciar sus propias piezas, dentro de lo que un consumidor
ejecuta, por una referencia que pueda cambiar de contenido sin que el consumidor
mergee nada. Toda invocación del marco a una pieza propia SHALL ser **versión
exacta** o **ruta local**, sin lista de excepciones, y el pipeline del marco SHALL
fallar cuando no lo sea, nombrando el archivo, la línea y la pieza.

**Por qué es del marco y no del consumidor.** Un consumidor puede pinar la versión
exacta del workflow reusable y aun así recibir comportamiento nuevo sin pull request,
si ese workflow invoca a una pieza hermana por un tag que se mueve. Su pin exacto es
entonces una media verdad, y no tiene forma de arreglarlo: la referencia no vive en su
árbol.

**La circularidad del release se resuelve con partición, no con un tag móvil.** Una
referencia a la versión que se está cortando apunta a un tag que todavía no existe
mientras corre el pull request que la corta. Toda referencia remota a una pieza propia
SHALL vivir en un job que **no corre** en el repositorio que distribuye el marco,
decidido en la condición del job y no en la de un paso, porque las piezas de un job se
resuelven antes de evaluar la condición de cualquiera de sus pasos. La verificación
SHALL **evaluar** esa condición en lugar de buscar su texto: una condición que contiene
la partición pero no la exige no particiona nada. Y cada pieza que se saltea así SHALL
correr por ruta local en el pipeline del propio marco, para que se ejercite con el
código del pull request que la cambia y no con el de la versión publicada.

**Las versiones ya publicadas quedan fuera del alcance, y se dice.** Este requirement
gobierna el árbol del marco. Una versión publicada que llevaba adentro una referencia
móvil la sigue llevando, y mientras un consumidor pueda estar pinado a ella esa
referencia SHALL seguir resolviendo: no se borra lo que un consumidor resuelve. Moverla
SHALL requerir una decisión humana explícita, porque su único efecto es cambiar lo que
corre en repositorios que no mergearon nada.

#### Scenario: Toda invocación propia es exacta o local
- **WHEN** se verifica el árbol del marco
- **THEN** cada invocación a una pieza propia es versión exacta o ruta local, y la verificación falla si no encuentra ninguna invocación que clasificar, en vez de pasar en verde sobre una lista vacía

#### Scenario: Una invocación propia por tag mayor móvil
- **WHEN** un workflow del marco invoca una pieza propia por un tag mayor móvil
- **THEN** el pipeline del marco falla nombrando el archivo, la línea y la pieza, y el mensaje dice que el arreglo es particionar el job, no eximir la línea

#### Scenario: Una referencia remota propia en un job que corre en el marco
- **WHEN** un job tiene una referencia remota a una pieza propia y su condición, evaluada como si el repositorio fuera el que distribuye el marco, lo deja correr —porque no tiene condición de job, porque la partición está en un paso, o porque la condición contiene la partición sin exigirla—
- **THEN** el pipeline del marco falla nombrando el job y la referencia, porque durante el pull request que corta una versión esa referencia no resuelve y deja el veredicto agregado en rojo

#### Scenario: Una partición que apaga la pieza en todas partes
- **WHEN** la condición del job lo saltea también cuando el repositorio es un consumidor
- **THEN** la verificación falla, porque una pieza que no corre en ningún lado no está particionada sino apagada

#### Scenario: La pieza se ejercita con el código del pull request que la cambia
- **WHEN** una pieza propia se saltea en el repositorio que distribuye el marco
- **THEN** el pipeline del propio marco la corre por ruta local, y si ninguno lo hace la verificación falla, porque el marco estaría publicando una pieza que nunca corrió sobre su propio árbol

#### Scenario: El pull request que corta una versión
- **WHEN** el pull request que corta una versión mueve las invocaciones propias a esa misma versión, cuyo tag todavía no existe
- **THEN** el pipeline del marco pasa, porque ninguna de esas referencias se resuelve en el repositorio que distribuye el marco

#### Scenario: Un consumidor pinado a una versión publicada con la referencia vieja
- **WHEN** un consumidor sigue pinado a una versión publicada cuyo workflow invoca una pieza propia por el tag mayor móvil
- **THEN** el tag sigue existiendo, y el procedimiento de release no lo mueve sin una decisión humana explícita, porque moverlo cambiaría lo que corre en ese consumidor sin un pull request
