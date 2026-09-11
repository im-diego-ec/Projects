# gobierno-contribucion — deltas de la-puerta-declara-lo-que-el-asistente

## ADDED Requirements

### Requirement: Los dos caminos de arranque declaran lo mismo

Un proyecto SHALL nacer con las mismas declaraciones de desvío por cualquiera de
los caminos de arranque que el marco ofrezca. Un camino que produzca menos
declaraciones que otro para el mismo proyecto SHALL tratarse como fallo.

Cuando el dato que decide una declaración esté disponible en el entorno de
ejecución, SHALL derivarse de ahí y NO SHALL pedírsele a la persona.

Cuando ese dato no llegue, SHALL asumirse el caso que **produce** la declaración y
no el que la omite, porque una declaración sobrante es visible y una garantía
supuesta que no existe no lo es.

#### Scenario: Un proyecto privado nace por la puerta web

- **WHEN** alguien arranca un proyecto en un repositorio privado usando el camino sin instalar
- **THEN** el proyecto nace con el desvío que declara que la protección de rama no existe, igual que si hubiera usado el asistente

#### Scenario: El dato está en el entorno

- **WHEN** el entorno de ejecución ya trae el dato que decide una declaración
- **THEN** se deriva de ahí, sin agregar una pregunta al formulario

#### Scenario: El dato no llega

- **WHEN** el dato que decide la declaración no está disponible
- **THEN** se asume el caso que produce la declaración, y no el que la omite
