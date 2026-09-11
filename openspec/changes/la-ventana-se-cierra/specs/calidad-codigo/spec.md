# calidad-codigo — deltas de la-ventana-se-cierra

## ADDED Requirements

### Requirement: Toda fecha que afloja una compuerta tiene un change que la posee

Cuando el código de producción del marco afloja una compuerta hasta una fecha,
esa fecha SHALL estar nombrada por un change **activo**, y el pipeline SHALL
comprobarlo. Una fecha viva que ningún change activo nombra SHALL tratarse como
fallo, porque un plazo sin dueño vence sin que nadie lo decida.

Los pendientes que sobreviven al archivo de un change SHALL declarar dónde vive
ese trabajo, o declarar explícitamente que no bloquean y por qué. Un pendiente
archivado sin destino ni declaración SHALL tratarse como olvido.

#### Scenario: Una fecha de gracia viva en el código

- **WHEN** el código de producción declara una fecha hasta la cual una compuerta afloja
- **THEN** algún change activo nombra esa fecha, y si ninguno la nombra el pipeline falla

#### Scenario: Un pendiente que sobrevive al archive

- **WHEN** un change se archiva con tareas sin completar
- **THEN** cada una dice dónde vive ese trabajo, o declara que no bloquea con su razón

#### Scenario: Un pendiente cuyo sujeto no existe en este repositorio

- **WHEN** un pendiente heredado nombra un artefacto que en este repositorio no existe
- **THEN** se declara no bloqueante con esa razón escrita, en vez de asignarle un destino inventado
