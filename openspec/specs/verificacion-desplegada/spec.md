# verificacion-desplegada

## Purpose

Las compuertas automáticas del pipeline de entrega: producción solo recibe
código que dev ya verificó (promoción con smoke de API y suite E2E), las
verificaciones limpian lo que crean, las credenciales de prueba viven fuera del
repositorio, y en producción toda verificación es de solo lectura. El humano
queda para la aceptación de features — jamás como paso obligatorio de un
deploy.

## Requirements

### Requirement: El deploy a dev se verifica solo, sin pedirle smoke a nadie

Tras cada deploy a dev, el pipeline SHALL correr automáticamente (1) el smoke
de API —los flujos core de negocio que el proyecto declare, ejecutados contra
la base real de dev, verificando resultados exactos y no solo códigos de
estado— y (2) la suite E2E con navegador —login real contra la instancia de
desarrollo del proveedor de identidad y los flujos core de la interfaz. Un
deploy a dev en verde SHALL significar "los flujos core funcionan
desplegados"; el humano queda para aceptación de features nuevas.

#### Scenario: Deploy a dev en verde
- **WHEN** el deploy a dev termina y el smoke de API y el E2E pasan
- **THEN** nadie tiene que pedir una probada manual a ninguna persona del equipo — el run verde ES la evidencia

#### Scenario: El smoke o el E2E fallan
- **WHEN** cualquiera de las dos verificaciones falla tras el deploy a dev
- **THEN** el run queda rojo con el paso exacto que falló — dev queda marcado como "desplegado pero no confiable" antes de que nadie lo use como referencia

### Requirement: Producción solo recibe lo que dev ya verificó

Un merge de código a la rama de integración SHALL desplegarse primero a dev,
pasar el smoke de API y la suite E2E y solo entonces continuar a producción —
la promoción es del COMMIT verificado, automática y sin pasos manuales. Un
fallo en dev SHALL detener el pipeline antes de tocar producción. Las únicas
vías que saltan dev SHALL ser deliberadas y quedar registradas: el rollback a
un artefacto que ya estuvo en producción, y el disparo manual de emergencia
sobre la rama de integración.

#### Scenario: Merge de código a la rama de integración
- **WHEN** un pull request con cambios de código se mergea y CI pasa
- **THEN** el pipeline despliega a dev, corre el smoke, y solo con dev en verde despliega a producción — "lo duro" jamás se prueba por primera vez en producción

#### Scenario: El smoke falla en dev
- **WHEN** el smoke de API falla tras el deploy a dev
- **THEN** producción no se toca: el run queda rojo señalando el paso exacto, y producción sigue sirviendo la versión anterior

#### Scenario: Merge que no altera lo servido
- **WHEN** el merge solo toca rutas que no alteran lo que los ambientes sirven — los artefactos de OpenSpec, la documentación, la metadata y los workflows del proveedor de CI, y los roots de infraestructura como código (la metadata y los workflows aplican en el run siguiente; la infraestructura jamás fluye por este pipeline)
- **THEN** no se despliega nada a ningún ambiente; ante CUALQUIER ruta fuera de esa lista o duda del detector, se despliega todo (fail-open)

#### Scenario: El contenido ya pasó por dev antes del merge
- **WHEN** el tree del merge es idéntico al de un disparo manual a dev exitoso con smoke verde dentro de la ventana de reuso configurada (el flujo cuidadoso: probar en dev antes de mergear)
- **THEN** la promoción reutiliza esa verificación — dev no se repite, producción procede referenciando la corrida original, y ante CUALQUIER duda en la detección se cae a la promoción completa (fail-open)

### Requirement: Las verificaciones limpian lo que crean

Los datos que el smoke y el E2E crean en dev SHALL eliminarse al final de la
corrida, incluso si un paso intermedio falló (limpieza en `finally`). Una
corrida SHALL poder repetirse inmediatamente sin chocar con residuos de la
anterior.

#### Scenario: Corrida fallida a mitad de camino
- **WHEN** el E2E falla en un paso intermedio de la secuencia
- **THEN** la limpieza corre igual y dev no queda con datos huérfanos de prueba

#### Scenario: Dos corridas seguidas
- **WHEN** se repite la verificación inmediatamente después de una corrida previa
- **THEN** la segunda corrida pasa sin chocar con datos que dejó la primera

### Requirement: Credenciales de prueba fuera del repositorio y de los logs

El usuario de prueba SHALL vivir solo en la instancia de desarrollo del
proveedor de identidad —jamás en producción— y sus identificadores SHALL
llegar a las verificaciones vía el almacén de secretos del proveedor de CI:
nunca hardcodeados en el repositorio ni impresos en los logs del pipeline.

#### Scenario: Lectura del repositorio o de un log del pipeline
- **WHEN** alguien revisa el código de las verificaciones o la salida de un run
- **THEN** no encuentra credenciales: el run enmascara los secrets y el código solo referencia variables de entorno

### Requirement: La verificación de producción es read-only

En producción, la verificación post-deploy SHALL limitarse a señales de solo
lectura: estado de las instancias de cómputo, health checks públicos, ventana
de logs, frescura del bundle servido y sanidad de la capa de autenticación.
Ninguna verificación automática SHALL escribir datos en producción —ni de
negocio ni de usuarios, ya que un login "de prueba" crearía un registro real
vía sincronización de identidades: el E2E SHALL apuntar únicamente a dev.

#### Scenario: Deploy a producción
- **WHEN** termina un deploy a producción
- **THEN** la verificación confirma instancia nueva sirviendo, health en 200 y ventana de logs limpia — y ni un solo registro fue creado por la verificación

#### Scenario: La invalidación del CDN falló y se sirve el bundle viejo
- **WHEN** el deploy del frontend a producción terminó pero el documento servido aún referencia el bundle anterior
- **THEN** la verificación falla — responder 200 con contenido viejo no cuenta como deploy exitoso

#### Scenario: La capa de auth quedó mal cableada tras el deploy
- **WHEN** la verificación envía un token deliberadamente inválido a un endpoint autenticado
- **THEN** espera exactamente 401; un 500 o un timeout marcan la verificación en rojo — el health público no puede ver este fallo, la sonda sí
