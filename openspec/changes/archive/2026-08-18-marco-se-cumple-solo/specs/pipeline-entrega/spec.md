# pipeline-entrega — Delta

## ADDED Requirements

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
