---
artefacto: proposal
dri: Builder 1
aprueba: revision adversarial (desvio del marco: un solo mantenedor, ver AGENTS.md)
informado: PO / Builder 2
estado: en-ejecucion
---

# El arranque termina con su registro de fricción

## Por qué

El marco se corrige con lo que le pasa a quien lo usa, y para eso tiene un
[registro de fricción](../../../docs/plantillas/registro-de-friccion.md): una plantilla que
alguien llena **a mano, mientras** arranca un proyecto, y guarda en `docs/adopciones/`.
Medido el 2026-09-18 sobre el árbol del carril (main más los lotes 0b, 22, 23 y 25):

- **La plantilla está en blanco y nadie la llena.** En todo el repositorio hay una sola
  instancia, `docs/adopciones/2026-08-24-supply-chain.md`, y es la adopción de otra
  organización traída con el fork. La guía técnica la cita al final
  (`docs/05-arrancar-tecnico.md`, «Cómo evoluciona este documento»: «llená el registro de
  fricción *mientras* corrés esta guía»): es un ritual que depende de que alguien se
  acuerde, que es exactamente lo que el marco dice que no cuenta.
- **Lo que la herramienta ya sabía se imprimía y se perdía.** `projects init` emite un
  `::warning::` cada vez que sigue por el camino conservador —la protección de `main` que
  no pudo medir, el tipo de cuenta que tuvo que suponer, `--sin-arranque`—, y el asistente
  rechaza cada respuesta con la forma equivocada y deja volver atrás. Ninguna de esas señales
  llegaba al marco: la bitácora las guarda en la máquina de la persona, y la guía quedaba
  **pareciendo** sana mientras alguien la rodeaba en cada corrida.
- **La primera corrida con el registro ya encontró dos defectos que nadie había visto**
  (tarea 5.1): en el camino del doble clic la sonda de protección corre **antes** de que el
  repositorio exista en GitHub, así que siempre dice «no se pudo medir»; y para una cuenta
  que no existe, el aviso del tipo de cuenta culpa a una sesión de `gh` que sí está abierta.
- **Una guía y una skill ya divergían en un comando que dicen compartir.**
  `docs/12-upgrade-openspec.md` afirmaba que su comando para leer el pin de OpenSpec «es el
  mismo que usan las skills `projects-adoptar` y `projects-archive-change`». La segunda hace
  rato que lo lee con `aplicar-deltas.mjs --pin-openspec`. Nadie comparaba los dos textos.

**Origen en Rigel**, adaptado (1.14.0, change archivado `2026-09-01-arranque-ejecutable`):

- `herramientas/registro-de-friccion.mjs` y la skill `rigel-arrancar`, commit 8b24629
  (2026-08-31): el registro como **condición de término** —el procedimiento no puede decir
  «listo» sin él—, con clases cerradas de apartamiento, cada uno con su punto exacto, y el
  caso vacío explícito. Motivo medido allá en la adopción del 2026-08-24 (O1): un agente que
  rodea en silencio habría encontrado 2 defectos en vez de 7; la objeción se materializó el
  2026-08-25 y el 2026-08-26 (O20).
- `herramientas/comandos-compartidos.mjs`, commits 4565182, 922cf34 y d7e5e63 (y el fin de
  línea, 6e9574f): los bloques de comandos que una guía y una skill comparten, comparados byte
  a byte; sin bloques marcados es rojo, no verde por vacuidad.

**Lo que NO se porta, y por qué.** La skill `rigel-arrancar` deriva 20 de 23 valores de las
constantes de su organización y se detiene en siete paradas humanas. En Projects el arranque
**ya es ejecutable**: el asistente pregunta en castellano lo que es una decisión y `derivar()`
calcula el resto. Una skill paralela duplicaría ese árbol de decisiones; la tabla de fuentes
de Rigel (`fuentes-de-los-valores.mjs`) son valores de Orion. Acá el registro **envuelve** a
la herramienta que ya existe.

## Qué cambia

1. **`projects init` no dice `LISTO` sin dejar su registro de fricción.** Al terminar bien,
   antes de la línea `LISTO`, escribe `registro-de-friccion.md` en la raíz del proyecto —al
   lado de la bitácora— y dice dónde. También cuando no hubo nada que rodear: el registro lo
   dice en vez de no existir. Con apartamientos, la pantalla y el archivo dicen que **no es un
   éxito limpio**.
2. **Lo que registra sale solo.** Todo `::warning::` de la corrida entra al registro con la
   fase en la que salió, sin una llamada al lado de cada aviso; lo que es un hallazgo medido
   («medido —») no es un apartamiento. Seis clases cerradas: las cinco de Rigel más
   `PREGUNTA`, que es la fricción propia del asistente.
3. **El asistente anota dónde se trabó la persona** —una respuesta rechazada, una vuelta
   atrás—, **sin guardar lo que escribió**, y eso llega al registro aunque el asistente y el
   arranque corran en dos procesos (como los corren los lanzadores): un archivo intermedio
   que el arranque consume.
4. **El registro no identifica a nadie**: ni el nombre del proyecto, ni la cuenta, ni rutas
   de la máquina. Y dice el camino con números **calculados** de `derivar()`: cuántas
   preguntas se hicieron y cuántos de los valores derivó el asistente sin preguntarlos.
5. **Mandarlo al marco se ofrece y se confirma.** La herramienta propone abrirlo como issue
   en el repositorio del marco del que salió el clon (un fork manda al fork); lo hace solo si
   la persona escribe `si` en una terminal, y si no, deja impreso el comando exacto. Un envío
   que no pudo ocurrir es `::warning::` con el comando.
6. **`herramientas/comandos-compartidos.mjs`** compara byte a byte los comandos marcados con
   `<!-- projects:comando <id> -->` entre una guía y una skill, sobre el único par real de hoy
   (`docs/12-upgrade-openspec.md` y la skill `projects-adoptar`), y `docs/12` deja de afirmar
   que el comando lo usa una skill que no lo usa.
7. La plantilla del registro, `docs/05`, `docs/04` y el índice de `docs/` dicen qué parte
   ya no se anota a mano y cuál sí.

## Impacto en los proyectos consumidores

Hay tres consumidores reales, todos en `@v1.9.6` (`im-diego-ec/custodia-bingo`,
`im-diego-ec/plantilla-sitio` y `im-diego-ec/plantilla-aplicacion`). **Ninguno recibe nada
en su pipeline**: nada de esto es referenciado.

- **La herramienta de arranque** corre desde el clon del marco en la máquina de quien arranca
  un proyecto nuevo. Un consumidor existente no la vuelve a correr.
- **`plantilla/.gitignore`** gana dos líneas (`registro-de-friccion.md` y
  `.projects-friccion.json`). Es scaffold: llega a los proyectos que nazcan desde ahora, y es
  lo que hace que la puerta web —que copia el proyecto armado y hace `git add -A`— no guarde el
  registro en el repositorio de la persona. Un consumidor existente no tiene esos archivos,
  así que no necesita la línea.
- **Nuevo en la salida de `projects init`**: el bloque «EL REGISTRO DE FRICCION» antes de
  `LISTO` y, con terminal, una pregunta más (`¿Lo mando?`), cuyo Enter es «no». El código de
  salida no cambia.
- **Contrato**: ninguno de un workflow reusable. Clasificación MINOR (capacidad nueva de una
  herramienta del marco), sin nada incompatible.
