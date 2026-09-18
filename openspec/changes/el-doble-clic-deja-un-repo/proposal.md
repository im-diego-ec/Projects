---
artefacto: proposal
dri: Builder 1
aprueba: revision adversarial (desvio del marco: un solo mantenedor, ver AGENTS.md)
informado: PO / Builder 2
estado: en-ejecucion
---

# El doble clic deja un repositorio, no una carpeta

## Por qué

**No viene de Rigel.** Es un defecto propio de Projects, encontrado en la
auditoría previa al porte de Rigel del 2026-09-17 (lote 0b, «C3»), y va antes
del porte porque rompe el camino que el marco más vende: el de la persona que no
abre una terminal. Rigel no tiene lanzador de doble clic —su arranque es
`gh repo create … --clone` a mano (`docs/arrancar-un-proyecto.md`, Fase 3)—, así
que no hay mejora que traer: hay un agujero nuestro que tapar.

**El defecto, medido sobre el árbol del 2026-09-17:**

- Los tres lanzadores —`arrancar.sh`, `arrancar.command` y `arrancar.cmd`— hacían
  `mkdir` de `../<PROYECTO>` e invocaban `herramientas/projects-init.mjs` ahí.
  El **único** `init` de toda la cadena era el de OpenSpec: ni `git init`, ni rama,
  ni remoto. Corrido tal cual, el destino queda **sin `.git`**.
- Al terminar, la herramienta imprimía «el bootstrap va a main por **PUSH
  DIRECTO**» sobre esa carpeta, en la que no había ni `main` ni a dónde empujar.
- `docs/04-arrancar-acompanado.md` se contradecía en tres lugares: decía que el
  doble clic «arma el proyecto entero» y, en el Paso 2, mandaba a hacer
  `gh repo create … --clone` sobre la carpeta que el lanzador **ya había llenado**;
  remitía a un `cd ..` de un bloque del Paso 1 que no existe; y afirmaba, sin
  condición, que la herramienta «**no crea repositorios**».

O sea que quien usaba el doble clic —el camino que existe para no tener que
teclear— terminaba con una carpeta, una lista de tareas que suponía otra cosa, y
una guía que lo mandaba a un comando que falla.

## Qué cambia

1. **Un módulo nuevo, `herramientas/projects-repositorio.mjs`**, que convierte la
   carpeta armada en un repositorio, en este orden y comprobando cada paso con git:
   - `git init` con la rama `main`, aunque la máquina prefiera otra.
   - El **primer guardado**, sólo si hay identidad de git **configurada** y el
     proyecto quedó arrancado y en verde. Medido: sin identidad, git **inventa**
     una con el usuario y el nombre de la máquina y guarda igual.
   - El **repositorio en GitHub** (`gh repo create <cuenta>/<proyecto> --source=.
     --remote=origin --push`), sólo si hay `gh` con sesión, el nombre no está
     tomado y **la persona lo confirma escribiendo «si»**. La visibilidad sale de
     la respuesta que el asistente ya guardó; si no está, se pregunta.
   - Todo lo que no se pudo hacer sale como `::warning::` con el motivo y **los
     comandos exactos** para hacerlo después.
2. **`projects-init.mjs` gana dos banderas**: `--repositorio` (lo de arriba) y
   `--sin-remoto` (lo mismo sin tocar GitHub). Y la lista de lo que sigue deja de
   suponer un envío directo: dice lo que **midió** —subido por esta corrida,
   repositorio sin remoto, carpeta sin git, o el camino a mano con su remoto—.
3. **Los lanzadores piden `--repositorio`** en su Paso 2 y aceptan `--sin-remoto`.
4. **`docs/04` se parte en dos caminos coherentes**: el del doble clic, que salta
   los Pasos 2 a 5 y el primer envío del 9, y el a mano (Pasos 2 a 5), sin las
   tres contradicciones.
5. **Un banco con git de verdad y `gh` simulado**
   (`pruebas/init/el-doble-clic-deja-un-repo.test.mjs`) que exige `.git`, rama
   `main` y, con el `gh` simulado, `origin` con `main` subido. Su caso rojo —la
   invocación de antes deja una carpeta sin `.git`— queda en el banco.

## Impacto en los proyectos consumidores

**Ninguno en su pipeline.** Todo lo que cambia es herramienta del marco que corre
desde el clon —el módulo, `projects-init.mjs`, los lanzadores— y documentación
del marco. No viaja al proyecto, no toca ningún workflow reusable, `input`,
`secret`, `output`, permiso ni nombre de job. Los tres consumidores reales
(`custodia-bingo`, `plantilla-sitio` y `plantilla-aplicacion`, todos en
`@v1.9.6`) no reciben nada nuevo en su árbol.

**Lo que sí cambia para quien arranca un proyecto nuevo con el doble clic**: la
ventana termina con un repositorio y ofrece subirlo. Es una capacidad nueva y
compatible: `--repositorio` es opcional y la invocación a mano sin la bandera
hace lo mismo que antes, salvo el texto de la lista final, que ahora describe el
estado real del destino.

**El flujo de las plantillas de GitHub** (`herramientas/plantilla-repos/personalizar.yml`)
invoca `projects-init.mjs` sin `--repositorio`, así que no cambia de
comportamiento; su registro pasa a decir que la carpeta temporal no es un
repositorio, que es cierto.

**Contrato: MINOR** (capacidad nueva, opcional). Clasificación de distribución:
**canónico** (herramienta y documentación del marco; ver `design.md`).
