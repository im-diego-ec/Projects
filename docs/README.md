# Documentación del marco

> **Este índice tiene que enumerar TODO, y todavía no lo hace cumplir un check.**
> Un índice que se queda corto es peor que no tener índice, porque hace creer que
> se vio todo. Lo que falta cazarlo solo es completamente decidible, y el comando
> es este:
>
> ```bash
> for f in $(find docs -name '*.md' ! -name 'README.md' ! -path 'docs/adr/*' | sort); do
>   grep -qF "${f#docs/}" docs/README.md || echo "SIN INDEXAR: $f"
> done
> ```
>
> Hoy no imprime nada (comprobado). `docs/adr/` queda fuera del barrido porque
> entra por una sola fila y tiene [su propio índice](adr/), con su propio comando.
> El caso de banco que falta vive en `pruebas/docs/documentacion.test.mjs`, al
> lado del que ya exige que `para-el-po.md` y `glosario.md` estén enlazados acá.

| Documento | Qué es | Cómo evoluciona |
|---|---|---|
| [empezar-sin-ser-tecnico.md](empezar-sin-ser-tecnico.md) | La puerta de entrada de **quien no es técnico** —un BA, un PO que recién llega, quien tenga que decidir si esto se adopta—: qué es el marco y por qué existe, qué te da y qué te exige, cuánto cuesta, qué decisiones te va a pedir y qué pasa si el equipo es una sola persona | **Canónico** — se actualiza cuando cambia lo que el marco fija o lo que le pide a una persona. Un banco exige dos cosas: que cada palabra del [glosario](glosario.md) que use esté enlazada ahí mismo, y que no aparezca jerga de oficio que el glosario no define —«pipeline», «check», «deploy»—, que es por donde se colaba antes |
| [stack.md](stack.md) | **El stack en un solo sitio**: qué fija el marco y por qué, qué trae el andamio implementado, qué elige el proyecto, y en qué archivo vive la versión de cada pieza. No escribe un solo número: los deriva de los manifiestos con `node pruebas/docs/versiones.mjs` | **Canónico** — la prosa se actualiza cuando cambia una decisión, no cuando cambia una versión. `pruebas/docs/stack.test.mjs` se pone rojo si una fila apunta a un archivo o a una clave que ya nadie declara, si alguien escribe un número a mano en la página, o si la página y la constitución del andamio (`plantilla/AGENTS.md`, que es la que viaja) dejan de decir lo mismo sobre el stack |
| [para-el-po.md](para-el-po.md) | La puerta del **PO**: qué es el marco sin jerga, qué rutas aprueba —con las de `CODEOWNERS` textuales—, cómo se lee un spec real línea por línea, qué significa «bloqueado» y las cuatro preguntas con las que se devuelve un change | **Canónico** — se actualiza cuando `CODEOWNERS` cambia lo que el PO aprueba, o cuando la protección de `main` enciende una de sus reglas diferidas |
| [glosario.md](glosario.md) | Las palabras propias del marco —andamio, carril, compuerta, delta, fail-open, censo, pin, capability, veredicto agregado— en una línea cada una, con el archivo que manda sobre cada una | **Canónico** — se agrega una fila cuando una palabra del marco empieza a usarse sin definirse; si una fila y el archivo de su tercera columna difieren, manda el archivo y la fila se corrige |
| [adr/](adr/) | Decisiones estructurales del marco: cómo se especifica, cómo se promueve a producción, cómo se verifica un deploy | **Canónico** — viven solo acá; los proyectos las referencian, no las copian |
| [reglas-no-escritas.md](reglas-no-escritas.md) | Las reglas que el equipo practica y ningún archivo declaraba, con su estado de enforcement y el backlog de automatización | **Canónico** — se actualiza cuando un post-mortem compra una regla o cuando un check nuevo la vuelve automática |
| [censo-de-consumidores.md](censo-de-consumidores.md) | Quién consume el marco: el diseño vigente (los PRs de bump de Dependabot), lo que se midió de él, y el plan B con su decisión de credencial pendiente | **Canónico** — se actualiza cuando el mecanismo del censo cambia o cuando se mide otra vez |
| [consumidores.md](consumidores.md) | El registro de quién consume el marco: una fila por repo, con la fecha de adopción y la versión con la que nació. **Hoy está vacío**, y ahí mismo se dice por qué eso no significa «cero consumidores» | **Canónico** — se agrega una fila en el PR de cada adopción. Mientras la fila la escriba una persona y no la herramienta, la mitad que falta está declarada en el propio archivo |
| [arrancar-un-proyecto.md](arrancar-un-proyecto.md) | El paso a paso de **no tener repo** a `ci-ok` verde y el primer change en marcha: un solo comando que deja el repo completo, y la tabla de fallos silenciosos del día 1 | **Canónico** — se actualiza cuando alguien arranca un proyecto y encuentra algo que no está |
| [upgrade-openspec.md](upgrade-openspec.md) | Cómo subir la versión pineada del CLI de OpenSpec, con sus tres trampas conocidas | **Canónico** |
| [forkear-el-marco.md](forkear-el-marco.md) | Qué hay que cambiar para que un fork del marco a otra cuenta deje de ejecutar las actions de la cuenta original, con el comando que enumera cada referencia | **Canónico** — se actualiza cuando aparece una referencia nueva a la cuenta del marco |
| [auditoria-cierre-v1.md](auditoria-cierre-v1.md) | La auditoría del 2026-08-20: veinte afirmaciones que los PRs del cierre de la v1 hacían sobre sí mismos, puestas a prueba con fixtures y código de salida — trece refutadas, siete sostenidas | **Histórico** — es una foto fechada y **no se actualiza**: se cita y se cierra por sus hallazgos. Su primera línea dice de cuándo es y qué caducó desde entonces |
| [adopciones/](adopciones/) | Un archivo fechado por adopción: dónde se trabó de verdad quien arrancó un proyecto siguiendo la guía. Hoy: [2026-08-24-supply-chain.md](adopciones/2026-08-24-supply-chain.md) | **Histórico** — cada archivo es el registro de una corrida y no se edita después; lo que se corrige con ellos es [arrancar-un-proyecto.md](arrancar-un-proyecto.md) |
| [plantillas/postmortem.md](plantillas/postmortem.md) | Convención y plantilla de post-mortem | **Scaffold** — no viaja en `plantilla/`: se copia al proyecto cuando hace falta el primer post-mortem, y desde ahí es del proyecto |
| [plantillas/runbook.md](plantillas/runbook.md) | Convención y plantilla de runbook | **Scaffold** — igual: se copia con el primer runbook, no al crear el repo |
| [plantillas/registro-de-friccion.md](plantillas/registro-de-friccion.md) | Con qué se anota dónde se traba alguien que arranca un proyecto, mientras lo arranca; el resultado se guarda en `docs/adopciones/` de este repo | **Canónico** — la plantilla se queda acá (corrige la guía del marco, no el repo del proyecto); cada adopción deja su archivo fechado en `adopciones/` |

## Por dónde empezar

- **No sos técnico y querés entender qué es esto**:
  [empezar-sin-ser-tecnico.md](empezar-sin-ser-tecnico.md). Es la página de
  antes de todas las demás: no supone nada, contesta cuánto cuesta y qué te va a
  pedir, y de ahí salen los dos caminos —el del PO y el de arrancar un proyecto—.
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
- **Queriendo saber con qué corre esto**: [stack.md](stack.md) — qué pieza usa
  cada capa, quién la decide y dónde vive su versión. Es también la página que
  contesta «¿esto me obliga a pagar algo?».
- **Con un incidente en curso**: no es acá. Los runbooks del proyecto viven
  en su propio repo, porque hablan de recursos concretos; acá está la
  plantilla con la que se escribieron.

Y en cualquiera de los cuatro casos, cuando una palabra del marco no se entienda:
[glosario.md](glosario.md), una línea por término.
