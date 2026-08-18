# pipeline-entrega

## Purpose

Compuerta de calidad del pipeline de entrega: CI verifica TODOS los paquetes
del monorepo de forma bloqueante —typecheck, lint, tests y build—, salvo el
carril rápido de cambios que no alteran lo servido, y expone su veredicto en un
check agregado que reporta en todos los carriles; el deploy solo corre cuando
ese CI concluye con éxito sobre `main`. La correspondencia rama→ambiente, el
Environment de producción y los claims OIDC se especifican en la capability
`despliegue-ci`; la secuencia de promoción dev→prod, en
`verificacion-desplegada`; cuál es el check requerido por la protección de
rama, en `gobierno-contribucion`.

## Requirements

### Requirement: CI verifica todos los paquetes de forma bloqueante

El workflow de CI SHALL ejecutar, para CADA paquete del monorepo, las etapas de
typecheck, lint, tests y build; y SHALL fallar el pipeline si cualquiera de
esas etapas falla. Cuando el cambio toca únicamente rutas que no alteran lo que
los ambientes sirven —la lista que especifica la capability
`verificacion-desplegada` (requirement «Producción solo recibe lo que dev ya
verificó», escenario «Merge que no altera lo servido»)— esas etapas SHALL
omitirse; la validación de OpenSpec SHALL correr siempre, sea documentación o
código. Ante CUALQUIER ruta fuera de esa lista o duda del detector, SHALL
correr todo (fail-open).

El workflow SHALL exponer su veredicto en un check agregado que reporte en
TODOS los carriles, incluido el rápido, y ese veredicto SHALL ser apto como
check requerido por la protección de la rama de integración: un check que solo
reporta en uno de los carriles bloquearía para siempre los cambios del otro.
Cuál es el check requerido —y su nombre— lo fija la capability
`gobierno-contribucion`.

#### Scenario: Un test roto detiene CI
- **WHEN** un push o pull request que toca alguna ruta fuera de la lista de `verificacion-desplegada` incluye un test que falla en cualquier paquete del monorepo
- **THEN** el workflow de CI concluye en estado de fallo

#### Scenario: Un error de lint detiene CI
- **WHEN** el código tiene una violación de lint y el cambio toca alguna ruta fuera de esa lista
- **THEN** el workflow de CI concluye en estado de fallo antes de considerar el build exitoso

#### Scenario: Un error de tipos detiene CI
- **WHEN** el typecheck de cualquier paquete reporta un error en un cambio que toca alguna ruta fuera de esa lista
- **THEN** el workflow de CI concluye en estado de fallo

#### Scenario: Un pull request que no altera lo servido
- **WHEN** un pull request toca únicamente rutas de la lista de `verificacion-desplegada`
- **THEN** las etapas de typecheck, lint, tests y build quedan `skipped`, la validación de OpenSpec corre igual y el check agregado reporta su veredicto: el PR es mergeable sin haber compilado nada

#### Scenario: El detector de rutas duda
- **WHEN** el detector no puede determinar con certeza qué rutas cambiaron
- **THEN** CI corre todas las etapas (fail-open) — la duda nunca se resuelve omitiendo verificación

### Requirement: El deploy está gateado por el éxito de CI

El workflow de deploy SHALL ejecutarse únicamente cuando CI haya concluido con
éxito sobre el commit correspondiente de `main`, la única rama permanente
(trunk-based; la estrategia de ramas y la correspondencia rama→ambiente se
especifican en la capability `despliegue-ci`). Esa compuerta abre la secuencia
de promoción —dev primero, producción solo con dev verificado— que especifica
`verificacion-desplegada`. El ambiente de desarrollo tiene ADEMÁS una vía que
NO depende de esta compuerta: el disparo manual sobre una rama de trabajo, que
despliega a dev sin exigir CI. El disparo manual sobre `main` queda como vía de
emergencia explícita y salta la verificación en dev.

#### Scenario: CI en rojo no despliega
- **WHEN** CI concluye en fallo para un commit de `main`
- **THEN** el workflow de deploy no despliega ese commit a ningún ambiente

#### Scenario: CI en verde habilita la promoción
- **WHEN** CI concluye con éxito para un commit de `main` que toca alguna ruta fuera de la lista de `verificacion-desplegada`
- **THEN** el workflow de deploy despliega ese commit exacto (el SHA que CI verificó) al ambiente dev y, solo con las verificaciones de dev en verde, ESE MISMO SHA continúa a producción — las compuertas de la promoción se especifican en `verificacion-desplegada`

#### Scenario: Deploy manual de emergencia
- **WHEN** una persona con permisos dispara manualmente el deploy sobre `main`
- **THEN** el deploy corre sin esperar a CI, como excepción manual y auditable en el historial del proveedor de CI

### Requirement: Cada deploy es reproducible y reversible

Cada artefacto desplegable SHALL publicarse al registro con un tag inmutable
derivado del SHA del commit, además del tag móvil que consume el servicio de
cada ambiente; y SHALL existir un procedimiento de rollback que despliegue un
SHA anterior por disparo manual, sin reconstruir el artefacto.

#### Scenario: Trazabilidad de lo desplegado
- **WHEN** se inspecciona el artefacto que corre en producción
- **THEN** su tag identifica exactamente el commit del que se construyó

#### Scenario: Rollback a una versión anterior
- **WHEN** un deploy resulta defectuoso y se dispara el procedimiento de rollback con el SHA anterior
- **THEN** el servicio vuelve al artefacto de ese SHA en minutos, sin build nuevo y sin editar la infraestructura como código

### Requirement: Los artefactos regenerados no divergen de la versión pinada

Cuando el marco pina la versión de una herramienta y delega en cada repositorio
la regeneración de los artefactos que esa herramienta produce, CI SHALL verificar
que los artefactos presentes declaren la misma versión que el pin vigente, y
SHALL fallar el pipeline cuando no coincidan.

El fallo SHALL nombrar el comando exacto de regeneración: un artefacto
desactualizado es un problema con una solución conocida, y obligar a
redescubrirla convierte el check en fricción en vez de en ayuda.

Esta verificación cierra la única forma de distribución del marco que se apoyaba
solo en que alguien recordara ejecutarla.

#### Scenario: Un artefacto quedó generado por una versión anterior
- **WHEN** el pin de la herramienta sube y un repositorio conserva artefactos generados por la versión previa
- **THEN** el pipeline falla indicando qué artefactos divergen y con qué comando se regeneran

#### Scenario: Los artefactos están al día
- **WHEN** todos los artefactos generados declaran la versión que el marco pina
- **THEN** la verificación pasa sin producir ruido en el log
