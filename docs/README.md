# Documentación del marco

| Documento | Qué es | Cómo evoluciona |
|---|---|---|
| [para-el-po.md](para-el-po.md) | La puerta del **PO**: qué es el marco sin jerga, qué rutas aprueba —con las de `CODEOWNERS` textuales—, cómo se lee un spec real línea por línea, qué significa «bloqueado» y las cuatro preguntas con las que se devuelve un change | **Canónico** — se actualiza cuando `CODEOWNERS` cambia lo que el PO aprueba, o cuando la protección de `main` enciende una de sus reglas diferidas |
| [glosario.md](glosario.md) | Las palabras propias del marco —andamio, carril, compuerta, delta, fail-open, censo, pin, capability, veredicto agregado— en una línea cada una, con el archivo que manda sobre cada una | **Canónico** — se agrega una fila cuando una palabra del marco empieza a usarse sin definirse; si una fila y el archivo de su tercera columna difieren, manda el archivo y la fila se corrige |
| [adr/](adr/) | Decisiones estructurales del marco: cómo se especifica, cómo se promueve a producción, cómo se verifica un deploy | **Canónico** — viven solo acá; los proyectos las referencian, no las copian |
| [reglas-no-escritas.md](reglas-no-escritas.md) | Las reglas que el equipo practica y ningún archivo declaraba, con su estado de enforcement y el backlog de automatización | **Canónico** — se actualiza cuando un post-mortem compra una regla o cuando un check nuevo la vuelve automática |
| [censo-de-consumidores.md](censo-de-consumidores.md) | Quién consume el marco: el diseño vigente (los PRs de bump de Dependabot), lo que se midió de él, y el plan B con su decisión de credencial pendiente | **Canónico** — se actualiza cuando el mecanismo del censo cambia o cuando se mide otra vez |
| [arrancar-un-proyecto.md](arrancar-un-proyecto.md) | El paso a paso de **no tener repo** a `ci-ok` verde y el primer change en marcha: un solo comando que deja el repo completo, y la tabla de fallos silenciosos del día 1 | **Canónico** — se actualiza cuando alguien arranca un proyecto y encuentra algo que no está |
| [upgrade-openspec.md](upgrade-openspec.md) | Cómo subir la versión pineada del CLI de OpenSpec, con sus tres trampas conocidas | **Canónico** |
| [auditoria-cierre-v1.md](auditoria-cierre-v1.md) | La auditoría del 2026-08-20: veinte afirmaciones que los PRs del cierre de la v1 hacían sobre sí mismos, puestas a prueba con fixtures y código de salida — trece refutadas, siete sostenidas | **Canónico** — es un registro fechado: no se edita para ponerlo al día, se cita y se cierra por sus hallazgos |
| [plantillas/postmortem.md](plantillas/postmortem.md) | Convención y plantilla de post-mortem | **Scaffold** — no viaja en `plantilla/`: se copia al proyecto cuando hace falta el primer post-mortem, y desde ahí es del proyecto |
| [plantillas/runbook.md](plantillas/runbook.md) | Convención y plantilla de runbook | **Scaffold** — igual: se copia con el primer runbook, no al crear el repo |
| [plantillas/registro-de-friccion.md](plantillas/registro-de-friccion.md) | Con qué se anota dónde se traba alguien que arranca un proyecto, mientras lo arranca; el resultado se guarda en `docs/adopciones/` de este repo | **Canónico** — la plantilla se queda acá (corrige la guía del marco, no el repo del proyecto); cada adopción deja su archivo fechado en `adopciones/` |

## Por dónde empezar

- **Sos el PO**: [para-el-po.md](para-el-po.md), y nada más. Es una página, no
  supone que escribas código, y trae las rutas que aprobás y las preguntas con
  las que se rechaza un change. El resto de esta carpeta es de ingeniería.
- **Entrando al equipo**: [reglas-no-escritas.md](reglas-no-escritas.md)
  primero. Los ADRs explican el sistema; esa página explica cómo se
  trabaja dentro de él.
- **Arrancando un proyecto**: [arrancar-un-proyecto.md](arrancar-un-proyecto.md),
  de punta a punta. Los [ADRs](adr/) explican por qué el sistema es así; esa
  página te deja el repo verde. (Decía «los ADRs y de ahí a las plantillas, que
  se copian» — consejo de antes de que existiera `projects init`.)
- **Con un incidente en curso**: no es acá. Los runbooks del proyecto viven
  en su propio repo, porque hablan de recursos concretos; acá está la
  plantilla con la que se escribieron.

Y en cualquiera de los cuatro casos, cuando una palabra del marco no se entienda:
[glosario.md](glosario.md), una línea por término.
