# calidad-codigo — deltas de el-piso-del-reusable-se-mide

## ADDED Requirements

### Requirement: El piso de permisos que se documenta es el que el reusable exige

Cuando el marco documenta qué permisos hay que concederle a su workflow
reusable, esa declaración SHALL comprobarse contra los permisos que los jobs del
reusable declaran de verdad, y SHALL fallar cuando se quede corta.

La comprobación SHALL cubrir **todas** las copias de esa declaración, incluida la
que el andamio reparte a los proyectos nuevos. Una copia que quede corta SHALL
tratarse como fallo aunque las demás estén al día.

#### Scenario: Un job del reusable gana un permiso

- **WHEN** un job del workflow reusable declara un permiso que las copias del piso documentado no conceden
- **THEN** el pipeline falla nombrando el archivo y el permiso que falta

#### Scenario: El andamio reparte el piso

- **WHEN** el andamio entrega su plantilla de integración continua a un proyecto nuevo
- **THEN** el piso que esa plantilla concede cubre lo que el reusable exige en ese momento
