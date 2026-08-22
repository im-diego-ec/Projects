# Documentación del marco

| Documento | Qué es | Cómo evoluciona |
|---|---|---|
| [adr/](adr/) | Decisiones estructurales del marco: cómo se especifica, cómo se promueve a producción, cómo se verifica un deploy | **Canónico** — viven solo acá; los proyectos las referencian, no las copian |
| [reglas-no-escritas.md](reglas-no-escritas.md) | Las reglas que el equipo practica y ningún archivo declaraba, con su estado de enforcement y el backlog de automatización | **Canónico** — se actualiza cuando un post-mortem compra una regla o cuando un check nuevo la vuelve automática |
| [censo-de-consumidores.md](censo-de-consumidores.md) | Quién consume el marco: el diseño vigente (los PRs de bump de Dependabot), lo que se midió de él, y el plan B con su decisión de credencial pendiente | **Canónico** — se actualiza cuando el mecanismo del censo cambia o cuando se mide otra vez |
| [upgrade-openspec.md](upgrade-openspec.md) | Cómo subir la versión pineada del CLI de OpenSpec, con sus tres trampas conocidas | **Canónico** |
| [plantillas/postmortem.md](plantillas/postmortem.md) | Convención y plantilla de post-mortem | **Scaffold** — no viaja en `plantilla/`: se copia al proyecto cuando hace falta el primer post-mortem, y desde ahí es del proyecto |
| [plantillas/runbook.md](plantillas/runbook.md) | Convención y plantilla de runbook | **Scaffold** — igual: se copia con el primer runbook, no al crear el repo |

## Por dónde empezar

- **Entrando al equipo**: [reglas-no-escritas.md](reglas-no-escritas.md)
  primero. Los ADRs explican el sistema; esa página explica cómo se
  trabaja dentro de él.
- **Arrancando un proyecto**: los tres [ADRs](adr/) y de ahí a las
  plantillas, que se copian.
- **Con un incidente en curso**: no es acá. Los runbooks del proyecto viven
  en su propio repo, porque hablan de recursos concretos; acá está la
  plantilla con la que se escribieron.
