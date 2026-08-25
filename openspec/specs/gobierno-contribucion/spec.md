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
de forma explícita como diferida, con su motivo, el issue que la rastrea, **el
disparador concreto que la activaría** y **una fecha límite**. Un diferimiento
sin disparador ni fecha es permanente por defecto y deja de distinguirse de un
olvido; vencida la fecha sin decisión escrita, el diferimiento SHALL contar como
incumplimiento, no como estado vigente. Y toda modificación de la protección
SHALL reflejarse en esa documentación en el mismo cambio; la documentación
SHALL incluir cómo contrastarla contra la configuración real del proveedor.

Ninguna regla del repositorio que dependa de la protección para tener efecto
SHALL presentarse como automática mientras esa protección esté diferida. En
particular, la asignación de propietarios de código **asigna revisores**; se
convierte en compuerta solo cuando la protección exige aprobaciones y exige
review del propietario. Con esas dos reglas diferidas, quien escribe puede
integrar su propio cambio con el veredicto de CI en verde y cero aprobaciones:
cualquier documento que cuente ese review cruzado entre lo que ya es automático
está describiendo una intención. La documentación SHALL decir cuál de las dos
cosas es cada regla, y SHALL corregirse en el mismo cambio en que la
configuración real deje de coincidir.

#### Scenario: Consultar cómo proteger la rama de integración
- **WHEN** una persona del equipo busca cómo está protegida la rama de integración o cómo aplicar la protección
- **THEN** encuentra en la documentación del repositorio el estado real —reglas activas, check requerido por su nombre exacto, y qué queda deliberadamente diferido con su issue— y los pasos exactos para aplicar o restablecer esa protección desde cero, sin instrucciones que, seguidas al pie de la letra, romperían el flujo de merge

#### Scenario: La configuración de la protección cambia
- **WHEN** alguien modifica la protección de la rama de integración (activa una regla diferida, cambia el check requerido, concede un bypass)
- **THEN** la documentación del repositorio se actualiza en ese mismo cambio, y cualquiera puede contrastarla contra la configuración real consultando al proveedor con el comando que la propia documentación indica

#### Scenario: Una regla que solo asigna revisores contada como enforcement
- **WHEN** la documentación del repositorio lista como automática una regla cuyo efecto depende de una protección que está declarada como diferida
- **THEN** esa entrada es incorrecta y se mueve al backlog con su estado real y con la condición de activación escrita, porque un lector que la ve en la lista de lo automático concluye que está protegido y no lo está

#### Scenario: Un diferimiento que venció sin decisión
- **WHEN** llega la fecha límite de una regla diferida y nadie la activó ni escribió por qué se posterga otra vez
- **THEN** cuenta como incumplimiento y se trata como tal, en vez de seguir figurando como diferida vigente

#### Scenario: El check requerido no reporta en un carril
- **WHEN** el check exigido por la protección es uno que no reporta para los cambios de un carril determinado
- **THEN** los pull requests de ese carril quedan bloqueados sin remedio, y la corrección es cambiar el check requerido por el veredicto agregado que reporta en todos los carriles
