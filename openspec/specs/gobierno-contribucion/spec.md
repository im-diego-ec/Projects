# gobierno-contribucion

## Purpose

Gobierno de la contribución al repositorio: plantilla de pull request que exige
trazabilidad hacia OpenSpec y evidencia de tests, propietarios de código
definidos vía CODEOWNERS, y la protección de la rama de integración —aplicada
como acto humano deliberado— documentada en el repositorio con su estado real:
qué reglas rigen, cuáles siguen diferidas y por qué, y los pasos exactos para
aplicarla desde cero.

## Requirements

### Requirement: Plantilla de pull request

El repositorio SHALL incluir una plantilla de pull request que solicite el link
al spec o change de OpenSpec asociado y la evidencia de que los tests pasan.

#### Scenario: Abrir un pull request
- **WHEN** un contribuidor abre un pull request en el repositorio
- **THEN** el cuerpo del PR se precarga con la plantilla que pide link al spec/change y evidencia de tests

### Requirement: Definición de propietarios de código

El repositorio SHALL incluir un archivo CODEOWNERS que designe revisor(es)
responsable(s) del código. La asignación SHALL hacerse por ROL —quién es dueño
del qué y quién del cómo— y no por preferencia personal, de modo que el archivo
siga siendo correcto cuando cambie quién ocupa cada rol.

#### Scenario: PR que toca código con propietario
- **WHEN** un pull request modifica archivos cubiertos por CODEOWNERS
- **THEN** el propietario correspondiente queda asignado como revisor solicitado

#### Scenario: PR que toca los artefactos de decisión de producto
- **WHEN** un pull request modifica los artefactos cuya autoría corresponde al rol de producto (proposal y specs de un change)
- **THEN** ese rol queda asignado como revisor solicitado, sin depender de que alguien se acuerde de pedírselo

### Requirement: Branch protection documentada como paso manual

La protección de la rama de integración SHALL aplicarse como acto humano
deliberado —nunca automatizada desde el pipeline— y SHALL quedar documentada en
el repositorio con su estado real y con los pasos exactos para aplicarla o
restablecerla desde cero.

La protección activa SHALL exigir pull request para integrar, impedir el
borrado de la rama y los force-push, y requerir el veredicto agregado de CI con
la rama al día. El check requerido SHALL ser el que reporta en TODOS los
carriles —tanto para cambios de código como para los del carril rápido—;
exigir uno que solo reporta en un carril bloquearía el otro de forma
permanente. La propiedad de ese veredicto la especifica la capability
`pipeline-entrega`; su nombre concreto lo fija cada proyecto y SHALL constar en
la documentación de protección tal como está configurado.

Estas reglas SHALL aplicarse sin actores de excepción: ninguna identidad
—administradores y automatizaciones incluidas— SHALL poder saltárselas, y
cualquier excepción concedida SHALL constar en la documentación con su motivo.

Toda regla de protección que el equipo decida NO activar SHALL quedar declarada
de forma explícita como diferida, con su motivo y el issue que la rastrea
—nunca omitida ni presentada como activa. Y toda modificación de la protección
SHALL reflejarse en esa documentación en el mismo cambio; la documentación
SHALL incluir cómo contrastarla contra la configuración real del proveedor.

#### Scenario: Consultar cómo proteger la rama de integración
- **WHEN** una persona del equipo busca cómo está protegida la rama de integración o cómo aplicar la protección
- **THEN** encuentra en la documentación del repositorio el estado real —reglas activas, check requerido por su nombre exacto, y qué queda deliberadamente diferido con su issue— y los pasos exactos para aplicar o restablecer esa protección desde cero, sin instrucciones que, seguidas al pie de la letra, romperían el flujo de merge

#### Scenario: La configuración de la protección cambia
- **WHEN** alguien modifica la protección de la rama de integración (activa una regla diferida, cambia el check requerido, concede un bypass)
- **THEN** la documentación del repositorio se actualiza en ese mismo cambio, y cualquiera puede contrastarla contra la configuración real consultando al proveedor con el comando que la propia documentación indica

#### Scenario: El check requerido no reporta en un carril
- **WHEN** el check exigido por la protección es uno que no reporta para los cambios de un carril determinado
- **THEN** los pull requests de ese carril quedan bloqueados sin remedio, y la corrección es cambiar el check requerido por el veredicto agregado que reporta en todos los carriles
