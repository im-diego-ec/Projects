# Plantilla: registro de fricción de una adopción

Se llena **mientras** alguien arranca un proyecto siguiendo
[la guía](../arrancar-un-proyecto.md), y el resultado se guarda en
`docs/adopciones/AAAA-MM-DD-<proyecto>.md` de este repo. No va al repo del
proyecto: la guía es un documento del marco, y sus correcciones salen de acá.

## Las dos reglas de uso

**1. No arregles mientras corrés.** Si un paso te traba, anotalo y seguí. Arreglar
sobre la marcha te deja una guía que funciona para vos y para nadie más — y borra
justo el dato que vinimos a buscar, que es *dónde* se traba alguien que no la
escribió.

**2. Un tropiezo cuyo arreglo es «acordate» no es un arreglo.** Si la corrección
que se te ocurre empieza con *hay que recordar que…*, no va a la guía: va como fila
al [backlog](../reglas-no-escritas.md#backlog-de-automatización). La premisa del
marco es que un ritual que alguien debe recordar no cuenta como enforcement, y eso
vale también para la documentación.

---

## Cabecera

| | |
|---|---|
| Proyecto | |
| Fecha | |
| Quién ejecuta | |
| Quién acompaña | |
| Versión del marco pinada | |
| Commit de Projects del que salió el andamio | |
| Máquina / SO | |
| Sesión de agente | nueva / continuada · modelo y effort |

## El reloj, fase por fase

Una línea por fase, cuatro casillas. Se llena al terminar cada fase, no al final:
al final ya nadie recuerda los minutos.

La columna **duración que promete la guía** existe porque la guía promete tiempos
(*«4 comandos, 30 segundos»*) y nadie los midió nunca. Una promesa que se equivoca
por 10× es un defecto de la guía, no del que la corrió.

| Fase | Promete | Real | ¿Se trabó? | ¿Debería haber sido automático? |
|---|---|---|---|---|
| 0 · Verificar, no hacer | 30 s | | sí / no | sí / no · qué |
| 1 · Arrancar lo asíncrono | — | | | |
| 2 · Los 21 valores | — | | | |
| 3 · El repo | 2 comandos | | | |
| 3.1 · Qué quedó en el repo | — | | | |
| 3.2 · Escritura de los equipos | — | | | |
| 3.3 · Si el repo ya existía | — | | | |
| 4 · El lockfile | 1 comando | | | |
| 4.1 · Comprobarlo antes de pushear | — | | | |
| 5 · Primer push a `main` | — | | | |
| 5.1 · El primer CI sale rojo | — | | | |
| 6.1 · Protección de `main` | — | | | |
| 6.2 · Las seis labels | — | | | |
| 6.3 · Dependabot | — | | | |
| 6.4 · Los dos secrets | — | | | |
| 7 · Primer change de OpenSpec | — | | | |

**Total real de punta a punta**: ____ · **de eso, esperando a otra persona**: ____

La segunda cifra es la que decide si la guía está bien ordenada: si esperar a otro
domina el total, el problema es el orden de las fases, no los comandos.

## Los tropiezos

Un bloque por tropiezo. Si no hubo ninguno en una fase, no hay bloque — la ausencia
ya quedó en la tabla.

### T1 · fase __

- **Qué esperaba que pasara**:
- **Qué pasó** (mensaje o salida textual, no parafraseado):
- **Cómo lo saqué**:
- **Cuánto me costó**: ____ min
- **Clase** — marcá una, porque decide adónde va el arreglo:
  - [ ] `guía` — no lo decía, o lo decía mal → PR a `docs/arrancar-un-proyecto.md`
  - [ ] `andamio` — lo que llegó estaba mal o faltaba → PR a `plantilla/`
  - [ ] `marco` — un check o una action se portó distinto de lo documentado → issue o change
  - [ ] `entorno` — la máquina (Windows, rutas largas, versiones locales) → nota en la guía
  - [ ] `github` — permisos, settings, cosas de la organización → paso explícito en la fase 6
  - [ ] `humano` — esperé a otra persona → revisar el orden de las fases
- **¿Se resuelve solo o hay que decidir?**: arreglo directo / necesita decisión de alguien

### T2 · fase __

*(copiar el bloque)*

## Lo que NO se probó

Alcance honesto del ensayo. Lo que no se ejecutó no está verificado, y un ensayo que
no lo dice se lee como cobertura completa.

-
-

## Cierre: de qué sirvió esto

Tres preguntas, y las tres se contestan el mismo día. Un registro sin esta sección es
una anécdota.

1. **Qué se arregla en la guía** — un PR, con los tropiezos de clase `guía` citados por
   su número:
2. **Qué se arregla en el andamio o en el marco** — issue o change por cada tropiezo de
   clase `andamio` / `marco`:
3. **Qué queda como disciplina declarada** — los tropiezos cuyo arreglo sería
   *«acordate»*, con su fila propia en el backlog:

**Veredicto en una línea** — ¿un builder que recién conoce el marco podría arrancar un
proyecto solo con la guía, hoy?
