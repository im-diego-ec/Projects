## ADDED Requirements

### Requirement: El asistente sólo ofrece opciones que el andamio sabe producir

The assistant SHALL offer only those platform options for which the scaffold can
generate a complete, working project, and SHALL NOT present an option whose
selection leads to a project the scaffold cannot produce.

Es la regla que el marco ya aplicó cuando sacó GCP del mismo menú: una opción que
se ofrece y no funciona es peor que no ofrecerla. Quien elige mal por culpa del
menú no lo descubre leyendo — lo descubre después, con el proyecto ya armado.

#### Scenario: Una plataforma que el andamio no sabe generar
- **WHEN** el andamio no sabe generar un proyecto completo para una plataforma
- **THEN** esa plataforma no aparece entre las opciones del asistente

#### Scenario: La elección que sí queda
- **WHEN** alguien recorre el asistente hasta el final
- **THEN** cada opción que se le ofreció produce un proyecto que el andamio genera entero

### Requirement: Una opción no se ofrece si su ventaja exige una herramienta que quien elige no tiene

The assistant SHALL NOT offer an option whose stated advantage requires a tool
outside the reach of the person answering, and SHALL keep that option available
through the values file for whoever does have that tool.

El asistente existe porque hay alguien sin terminal. Ofrecerle una opción cuyo
único beneficio es una herramienta de terminal es cobrarle una decisión que no
puede aprovechar.

#### Scenario: La ventaja está fuera de alcance
- **WHEN** el beneficio declarado de una opción exige una herramienta de terminal
- **THEN** esa opción no aparece en el asistente

#### Scenario: El camino del builder sigue abierto
- **WHEN** alguien escribe esa plataforma a mano en el archivo de valores
- **THEN** el andamio reparte su infraestructura igual que antes, sin cambios
