# gobierno-contribucion — deltas de la-evidencia-del-ensayo-viaja

## ADDED Requirements

### Requirement: La evidencia de una precondición sobrevive al procedimiento que la produce

Cuando el marco exige haber probado algo antes de publicar, la evidencia de esa
prueba SHALL quedar en una superficie que el propio procedimiento **no destruye**,
y que ya se verifique por otra razón. NO SHALL depender de un artefacto que un
paso posterior manda borrar.

La verificación final del release SHALL comprobar que esa evidencia está presente
en lo publicado, identificándola por su forma —un id de corrida y un identificador
de commit completo— y NO por el tamaño del texto que la contiene. Medir el volumen
de un texto NO SHALL contar como acreditar su contenido.

Cuando la evidencia falte, el release NO SHALL darse por cerrado.

#### Scenario: Se recoge la evidencia de un ensayo

- **WHEN** se valida una versión contra un consumidor real
- **THEN** la terna queda escrita en la superficie que viaja a las notas publicadas, y no en un artefacto que el procedimiento cierra y borra

#### Scenario: Se cierra un release sin evidencia

- **WHEN** las notas publicadas no traen un id de corrida ni un identificador de commit completo
- **THEN** el release no se da por cerrado, porque su precondición no está acreditada

#### Scenario: Las notas traen texto pero ninguna evidencia

- **WHEN** el cuerpo publicado es largo pero no contiene la terna
- **THEN** la verificación falla igual, porque el largo del texto no dice nada sobre el ensayo

#### Scenario: El rastro temporal se sigue destruyendo

- **WHEN** termina la validación contra el consumidor
- **THEN** la rama y el pin temporal se cierran igual, porque conservarlos para preservar el rastro dejaría vivo un pin a un SHA
