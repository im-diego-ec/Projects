## ADDED Requirements

### Requirement: Solo el código integrado en la rama de integración alcanza una credencial que publica

Una credencial capaz de publicar en producción SHALL quedar al alcance únicamente
de jobs que ejecutan código ya integrado en `main` del propio repositorio. Ni el
código de un pull request —venga de un fork o del mismo repositorio— ni el de una
rama de trabajo SHALL ejecutarse en un job que tenga esa credencial en su entorno.
Donde el proveedor no permite acotar la credencial del ambiente de desarrollo por
debajo de la de producción, la credencial de desarrollo es, para esta regla, una
credencial que publica en producción.

Cuando el deploy se dispara por la conclusión del workflow de CI, la condición de
cada job SHALL comprobar el evento que disparó ese CI, el repositorio del que
viene el commit y la rama; el nombre de la rama solo no alcanza, porque en un
pull request desde un fork lo elige quien lo abre. Cuando una persona elige a mano
qué versión promover, esa versión SHALL pertenecer a la historia de `main` antes
de que su código se traiga al job que tiene la credencial.

La versión que se publica SHALL derivarse de un único commit por corrida —el que
el CI verificó— y ese mismo commit SHALL rotular lo publicado: bajo un disparo por
conclusión de CI, la punta de `main` en el momento de la corrida puede no ser lo
que el CI midió.

#### Scenario: Pull request desde un fork con una rama llamada como la de integración
- **WHEN** el CI de un pull request abierto desde un fork, cuya rama se llama `main`, concluye con éxito
- **THEN** ningún job del workflow de deploy corre —ni siquiera uno que no traiga el código del fork—, ningún paso resuelve una credencial, y no se publica nada en ningún ambiente

#### Scenario: Pull request del mismo repositorio
- **WHEN** el CI de un pull request cuya rama vive en el mismo repositorio concluye con éxito
- **THEN** el tramo de dev no corre y el código del pull request no se ejecuta en ningún job del deploy: solo un push a `main` del propio repositorio habilita el tramo de dev

#### Scenario: Push a la rama de integración con CI en verde
- **WHEN** el CI concluye con éxito sobre un push a `main` del propio repositorio
- **THEN** el tramo de dev corre con el commit que el CI verificó, y la versión publicada queda rotulada con ese mismo commit aunque `main` haya avanzado mientras tanto

#### Scenario: Promover una versión que no está en la rama de integración
- **WHEN** una persona pide promover a producción un commit que no pertenece a la historia de `main`, o un valor que no es un commit completo
- **THEN** la promoción se rechaza antes de traer ese código, nombrando lo pedido, y la credencial no llega a ningún paso; el apartamiento que permite saltear el ambiente de prueba no saltea esta regla

#### Scenario: La credencial guardada donde cualquier job la alcanza
- **WHEN** la credencial que publica en producción está guardada también donde cualquier job del repositorio puede leerla, fuera del Environment que la restringe a `main`
- **THEN** cada corrida del deploy disparada desde el propio repositorio lo advierte, nombrando dónde moverla y sin imprimir nunca su valor, y la corrida no se pone en rojo por eso: el arreglo es configuración del proveedor de CI, fuera del árbol del proyecto

## MODIFIED Requirements

### Requirement: La rama determina el ambiente de destino

El repositorio usa una sola rama permanente (`main`, trunk-based); las ramas de
trabajo salen de `main` y vuelven vía pull request. El pipeline SHALL desplegar
a producción únicamente desde `main` (tras CI en verde, vía la compuerta de
`pipeline-entrega`), y al ambiente de desarrollo por dos vías: el disparo
manual sobre una rama de trabajo, y el tramo de dev de la promoción de un merge
de código a `main`, cuya secuencia especifica `verificacion-desplegada`. Ningún
push SHALL disparar un deploy a dev de forma directa: el tramo de dev de la
promoción cuelga del éxito de CI sobre `main`, no del push.

La vía del disparo manual sobre una rama de trabajo existe SOLO donde la
credencial del ambiente de desarrollo no puede publicar en producción. Donde la
misma credencial —o una de igual alcance— sirve a los dos ambientes, el tramo de
dev queda bajo el requirement «Solo el código integrado en la rama de integración
alcanza una credencial que publica», y un disparo manual desde otra rama SHALL
terminar en rojo, sin traer el código de esa rama a ningún job ni ejecutar un
paso con la credencial, diciendo que `main` es el único origen admitido.

#### Scenario: CI en verde sobre la rama de integración
- **WHEN** el workflow de CI concluye con éxito sobre `main` para un merge que toca alguna ruta fuera de la lista de `verificacion-desplegada`
- **THEN** corren los jobs de despliegue a dev como tramo de dev de la promoción y, solo con dev en verde, los jobs de despliegue a producción; el tramo de dev queda `skipped` únicamente si ese mismo tree ya fue verificado en dev dentro de la ventana de reuso

#### Scenario: Disparo manual sobre una rama de trabajo
- **WHEN** una persona dispara manualmente el workflow de deploy eligiendo una rama distinta de `main`, y la credencial de dev no puede publicar en producción
- **THEN** corren los jobs de dev con el código de esa rama, sin esperar a CI, y los jobs de producción quedan `skipped`

#### Scenario: Disparo manual sobre una rama de trabajo con una credencial que también publica en producción
- **WHEN** una persona dispara manualmente el workflow de deploy eligiendo una rama distinta de `main`, y la credencial de dev puede publicar en producción
- **THEN** ningún job trae el código de esa rama ni ejecuta un paso con la credencial, la corrida termina en rojo, y el mensaje nombra `main` como el único origen desde el que se publica

#### Scenario: Push a una rama de trabajo
- **WHEN** se hace push a una rama de trabajo
- **THEN** el workflow de deploy no se dispara (CI corre vía pull request, pero ningún ambiente se despliega)
