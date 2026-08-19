# despliegue-ci — Delta

## ADDED Requirements

### Requirement: Los despliegues a un ambiente compartido se serializan

Cuando dos o más corridas de despliegue apuntan al mismo ambiente compartido,
SHALL ejecutarse de a una: la corrida que llega mientras otra está en vuelo
SHALL hacer cola, y NO SHALL cancelar ni ser cancelada por la que está en curso.

La distinción que gobierna esta regla es si la interrupción deja estado a medias.
Una corrida de verificación interrumpida no deja nada: cancelar la que un cambio
posterior ya volvió obsoleta es correcto y ahorra recursos. Una corrida de
despliegue interrumpida sí deja estado: el ambiente queda en una combinación que
ninguna de las dos corridas describe, y ambas pueden reportar éxito.

Ese desenlace —dos corridas en verde y el ambiente corrupto— es el que motiva el
requirement: "salió verde" y "fue correcto" dejan de ser lo mismo en cuanto dos
despliegues se solapan.

#### Scenario: Un despliegue llega mientras otro está en curso
- **WHEN** una corrida de despliegue sobre un ambiente compartido comienza mientras otra sigue en vuelo
- **THEN** la nueva espera a que la anterior termine, y ninguna de las dos se cancela

#### Scenario: Ambientes distintos
- **WHEN** dos corridas de despliegue apuntan a ambientes que no comparten estado
- **THEN** pueden ejecutarse en paralelo
