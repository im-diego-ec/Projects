# calidad-codigo — deltas de los-changes-citan-lo-que-existe

## ADDED Requirements

### Requirement: La evidencia que cita un change vive donde el change dice

Cuando un change cite un artefacto de la constitución canónica como evidencia de
lo que el marco ya declara, esa ruta SHALL existir, y el pipeline SHALL
comprobarlo sobre todos los changes activos.

La comprobación NO SHALL exigir que exista toda ruta citada: un change propone
crear archivos, y citar lo que todavía no existe es parte de su trabajo. SHALL
acotarse a los artefactos que se citan como evidencia de lo ya vigente.

Cuando el texto citado haya cambiado de sentido, corregir la ruta NO SHALL
tratarse como suficiente: el change SHALL declararlo de forma visible antes de
poder ejecutarse, porque una cita con la ruta correcta y el contenido cambiado
parece consistente y no lo está.

#### Scenario: Un change cita un canónico renombrado

- **WHEN** un change activo cita un archivo de la constitución canónica que no existe
- **THEN** el pipeline falla nombrando el change y la ruta

#### Scenario: Un change cita un archivo que propone crear

- **WHEN** un change cita una ruta que todavía no existe porque el propio change la va a crear
- **THEN** el pipeline no falla por eso, porque proponer no es citar evidencia

#### Scenario: La ruta se corrige y el texto ya no dice lo mismo

- **WHEN** el artefacto citado sigue existiendo pero su contenido cambió de sentido
- **THEN** el change lo declara de forma visible antes de ejecutarse, en vez de quedar pareciendo consistente
