# calidad-codigo — Delta

## ADDED Requirements

### Requirement: Las definiciones de pipeline se validan como código

Las definiciones de pipeline del repositorio SHALL validarse en CI con la misma
dureza que el resto del código: un error de sintaxis, una referencia inválida o
una expresión mal formada SHALL detener el pipeline antes de que el cambio se
integre.

La validación SHALL correr también cuando el cambio toca únicamente las
definiciones de pipeline. El carril rápido omite las etapas que verifican lo que
se sirve en runtime, y una definición de pipeline no se sirve — pero sí se
ejecuta, y un error en ella se manifiesta en la corrida siguiente, cuando ya está
integrada y, en el caso del marco, cuando otros repositorios ya la consumen.

#### Scenario: Una definición de pipeline con sintaxis inválida
- **WHEN** un cambio introduce un error de sintaxis o una expresión inválida en una definición de pipeline
- **THEN** el pipeline falla señalando el archivo y la línea, antes del merge

#### Scenario: Un cambio que solo toca definiciones de pipeline
- **WHEN** el cambio entra por el carril rápido porque no altera lo que se sirve
- **THEN** la validación de las definiciones de pipeline corre igual

### Requirement: Un repositorio nacido del scaffold no conserva marcadores sin resolver

Un repositorio que adoptó el scaffold del marco SHALL quedar libre de los
marcadores que el scaffold emite para señalar lo que hay que completar
—sustituciones pendientes y huecos de decisión—, y CI SHALL fallar mientras
alguno sobreviva.

La verificación SHALL comprobar la ausencia de esos marcadores, no la corrección
de los valores que los reemplazaron: validar que un identificador exista o que
corresponda al proyecto exige credenciales y contexto que CI no tiene, y su falso
positivo bloquearía integraciones legítimas.

Este requirement existe porque el modo de falla es silencioso: un marcador sin
sustituir en el archivo de propietarios de código no produce error alguno —
simplemente no asigna revisores, y el review cruzado que el marco promete
desaparece sin ruido desde el primer día del proyecto.

#### Scenario: El bootstrap quedó a medias
- **WHEN** un repositorio conserva un marcador del scaffold sin resolver
- **THEN** el pipeline falla indicando el archivo y el marcador pendiente

#### Scenario: Sintaxis parecida que no es un marcador
- **WHEN** el repositorio usa legítimamente una sintaxis similar que el proveedor de CI resuelve en cada corrida
- **THEN** la verificación no la confunde con un marcador pendiente
