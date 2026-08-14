# calidad-codigo

## Purpose

Calidad de código de un repositorio del marco: lint y formato configurados y
ejecutables en TODOS los paquetes del monorepo, con reglas alineadas a la
constitución de ingeniería del repositorio (`AGENTS.md`: TypeScript strict,
`any` solo con justificación, sin promesas flotantes), scripts que propagan el
fallo real al invocador —para que CI no pueda quedar verde sobre un lint
roto— y la regla de que todo defecto conocido entra acompañado del test que lo
reproduce.

## Requirements

### Requirement: Lint y formato configurados para todos los paquetes

El repositorio SHALL tener linter y formateador configurados y ejecutables en
CADA paquete del monorepo, con reglas alineadas a la constitución de
ingeniería (`AGENTS.md`). Ningún paquete SHALL quedar fuera del alcance del
lint: agregar un paquete nuevo sin su configuración SHALL ser un fallo, no un
punto ciego silencioso.

#### Scenario: Ejecutar lint en un paquete limpio
- **WHEN** se ejecuta el script `lint` de cualquier paquete del monorepo sin violaciones presentes
- **THEN** el comando termina con código de salida 0 y no reporta errores

#### Scenario: Ejecutar lint con una violación presente
- **WHEN** existe una violación de regla (por ejemplo un `any` sin comentario justificativo) y se ejecuta el script `lint`
- **THEN** el comando reporta el error con archivo y línea y termina con código de salida distinto de 0

#### Scenario: Paquete nuevo sin configuración de lint
- **WHEN** se incorpora al monorepo un paquete que no queda cubierto por la configuración de lint
- **THEN** la verificación de CI lo señala como fallo — un paquete sin lint no pasa por verificado

### Requirement: Prohibir `any` sin justificación

La configuración de lint SHALL marcar como error el uso de `any` que no venga
acompañado de un comentario que lo justifique, replicando la regla escrita en
la constitución de ingeniería del repositorio.

#### Scenario: `any` sin comentario
- **WHEN** el código introduce un tipo `any` sin un comentario que explique por qué
- **THEN** el lint falla señalando la ubicación

#### Scenario: `any` justificado con comentario
- **WHEN** el código usa `any` acompañado del comentario justificativo acordado
- **THEN** el lint no reporta error para ese caso

### Requirement: Prohibir promesas flotantes

La configuración de lint SHALL marcar como error toda promesa cuyo resultado
no se espera ni se maneja, incluidas las mutaciones asíncronas de la capa de
datos del cliente invocadas sin `try/catch` ni manejador de error — el patrón
que deja la interfaz colgada sin que nadie se entere.

#### Scenario: Mutación asíncrona sin manejo de error
- **WHEN** un componente invoca una mutación asíncrona sin `try/catch` ni manejador de rechazo
- **THEN** el lint falla señalando la promesa flotante

### Requirement: Scripts de lint sin enmascaramiento de fallo

Los scripts de verificación declarados en los manifiestos de los paquetes
SHALL propagar el código de salida real, sin sufijos ni envoltorios que
conviertan un fallo en éxito.

#### Scenario: Un fallo de lint se propaga al invocador
- **WHEN** el lint encuentra una violación al ejecutarse vía el script declarado del paquete
- **THEN** el proceso invocador (incluido CI) recibe un código de salida distinto de 0

### Requirement: Test de regresión obligatorio por defecto conocido

Todo defecto conocido que se corrige (hallazgo de auditoría o incidente) SHALL
entrar acompañado de un test que primero lo REPRODUCE (falla antes del fix,
pasa después) y que permanece en la suite. El test SHALL escribirse al nivel
más bajo que reproduzca el defecto: unitario cuando sea suficiente;
integración o E2E solo cuando el defecto emerge de la integración entre
componentes.

#### Scenario: Fix de un hallazgo con test que lo reproduce
- **WHEN** se corrige un defecto conocido (por ejemplo un error de la capa de datos que se traduce en un 500, o una carrera de concurrencia entre dos solicitudes)
- **THEN** el PR incluye un test que falla sin el fix y pasa con él, al nivel más bajo suficiente (error de la capa de datos → unitario con doble de prueba; carrera → integración contra una base real)

#### Scenario: Fix sin test de regresión
- **WHEN** un PR corrige un defecto conocido sin incluir su test de regresión
- **THEN** la revisión lo rechaza hasta que el test exista
