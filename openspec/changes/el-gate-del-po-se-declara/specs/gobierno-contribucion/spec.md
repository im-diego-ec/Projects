# gobierno-contribucion — deltas de el-gate-del-po-se-declara

## ADDED Requirements

### Requirement: Una separación de roles que el andamio no puede sostener se declara

Cuando el andamio asigne a una misma persona dos roles que la constitución separa,
SHALL emitir un desvío sobre la regla que declara esa separación, con su motivo,
quién lo aprueba y su fecha.

El motivo SHALL corresponder al caso real. Cuando exista otra persona a quien
asignarle el rol, el desvío SHALL decirlo y nombrarla, y NO SHALL justificarse con
la ausencia de personas. Un motivo que no describe la situación es peor que la
ausencia de motivo: sostiene una regla correcta sobre una premisa falsa.

Cuando la separación pueda restablecerse sin esperar a nadie, el momento de
revisión SHALL ser inmediato y no condicionado a la llegada de otra persona.

#### Scenario: Una sola persona en el proyecto

- **WHEN** el andamio asigna el rol de dueño del qué y el de constructor a la misma y única persona
- **THEN** emite el desvío diciendo que no hay a quién darle el otro rol, y lo deja para cuando entre la segunda persona

#### Scenario: Dos personas y un solo rol repartido

- **WHEN** el proyecto tiene dos personas y el andamio le da los dos roles a la misma
- **THEN** el desvío nombra a la otra persona como quien puede tomar el rol, y su revisión es inmediata

#### Scenario: El desvío no se confunde con el de la revisión cruzada

- **WHEN** se declaran los desvíos de un proyecto de una sola persona
- **THEN** el de la revisión entre constructores y el de la separación de roles son dos desvíos distintos, porque apagan cosas distintas
