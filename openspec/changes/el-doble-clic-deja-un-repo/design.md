---
artefacto: design
dri: Builder 1
aprueba: revision adversarial (desvio del marco: un solo mantenedor, ver AGENTS.md)
estado: en-ejecucion
---

# Design — el-doble-clic-deja-un-repo

## Clasificación de distribución

| Pieza | Forma | Por qué esa y no otra |
|---|---|---|
| `herramientas/projects-repositorio.mjs` (nuevo) | canónico | Herramienta del marco: corre desde el clon en la máquina de quien arranca y **no viaja** al proyecto. No es referenciado (nadie la consume con `uses:`), ni scaffold (no se copia), ni regenerado (no sale de un CLI pinado). Es la misma forma que ya tiene `projects-init.mjs` en el change `el-comando-que-se-pega-funciona`. |
| `herramientas/projects-init.mjs` | canónico | Ídem: dos banderas nuevas, el paso del repositorio y la lista final medida. |
| `arrancar.sh`, `arrancar.cmd` | canónico | Lanzadores del clon; `arrancar.command` no cambia (ya pasa `"$@"` a `arrancar.sh`). |
| `docs/04-arrancar-acompanado.md` | canónico | Documentación del marco; no viaja. |
| `pruebas/init/el-doble-clic-deja-un-repo.test.mjs` | canónico | Banco del marco, en el directorio que el CI corre en la matriz de tres sistemas. |

Nada es scaffold ni referenciado: **ningún consumidor recibe un archivo nuevo ni
un comportamiento nuevo en su pipeline**. Contrato: MINOR (capacidad opcional).

## Dónde vive la lógica: Node, no los lanzadores

**Elegido:** un módulo Node (`projects-repositorio.mjs`) invocado por
`projects-init.mjs` cuando recibe `--repositorio`; los lanzadores solo pasan la
bandera.

**Descartado: escribirla en `arrancar.sh` y `arrancar.cmd`.** Serían dos copias en
dos lenguajes, y la de `cmd` no la ejecuta ningún banco más allá del arranque con
la entrada cerrada. El propio encabezado de `arrancar.sh` ya dice por qué no: «dos
copias divergen, y la que se pudre es la que nadie corre». En Node la lógica es
una, corre igual en los tres sistemas y el banco la ejerce en la matriz.

## Por qué opt-in (`--repositorio`) y no por defecto

**Descartado: hacer `git init` siempre.** El camino a mano de `docs/04` crea el
repositorio **antes** (Paso 2, `gh repo create --clone`) y escribe adentro; el flujo
de las plantillas de GitHub (`herramientas/plantilla-repos/personalizar.yml`)
escribe en una carpeta temporal que después mueve a su checkout. Encender el
repositorio por defecto le cambiaría el comportamiento a los dos. Los lanzadores
—los únicos que dejaban una carpeta sin repositorio— lo piden explícitamente.

Lo que **sí** cambia para todos es la lista final: deja de afirmar un «PUSH
DIRECTO» y describe lo medido. Para el camino a mano (con `origin`) el texto es el
de siempre, porque para ese caso era verdad.

## Las decisiones de cada paso, con lo medido

**Rama `main` con `symbolic-ref` y no con `git init -b main`.** `-b` llegó en git
2.28; sobre una rama sin guardados, `git symbolic-ref HEAD refs/heads/main` hace lo
mismo en cualquier versión. El banco lo exige con un `init.defaultBranch` distinto
configurado. (El comando que se **imprime** para hacerlo a mano sí usa `-b`, porque
es el que una persona puede leer; el límite de versión queda declarado acá.)

**Identidad «configurada», no «git no se quejó».** Medido en esta máquina con un
`GIT_CONFIG_GLOBAL` vacío: `git commit` **salió 0** con la identidad inventada
`Diego <diego@MacBook-Pro-de-Diego.local>`. Un guardado así, publicado, no queda a
nombre de nadie. Por eso se exige `user.name` y `user.email` en la configuración y
además se guarda con `-c user.useConfigOnly=true`, la misma regla dicha a git.
**Descartado:** `git var GIT_COMMITTER_IDENT` como prueba de identidad; medido, sale
0 con la identidad inventada.

**Sin arranque en verde no hay primer guardado.** Con `--sin-arranque` no hay
lockfile, y el CI corre con `--frozen-lockfile`; con `--sin-herramientas` no hay
`openspec/`, y el marco lo exige. Guardar y publicar eso estrena el repositorio en
rojo por una razón que la corrida ya conoce. **Descartado:** guardar igual y
avisar; el rojo quedaría publicado en el primer envío.

**Confirmación con «si» escrito; Enter es que no.** El asistente usa el criterio
contrario —«Enter = sí»— porque su confirmación protege un archivo local que se
reescribe. Acá la acción es la única visible desde afuera (un repositorio público
es código que cualquiera lee), así que el caso común no puede ser el que la crea
por accidente. Sin terminal, no se pregunta y no se crea: la confirmación no se
supone. El fin de la entrada contesta "" (un no), porque `rl.question` no llama a
su callback al cerrarse la entrada — el mismo defecto que el asistente ya tiene
medido.

**Verificar en el disco, no en el código de salida.** «`gh` salió 0» no es
evidencia: este repositorio tiene medido que los CLI mienten en Windows (imprimen
éxito y revierten). Se exige `origin` y que `refs/remotes/origin/main` apunte al
mismo guardado que `HEAD`. Se comprueba sin red, con lo que deja un push exitoso.

**«Subido por esta corrida», no «HEAD igual a origin».** Un checkout de GitHub —el
de un runner, un clon con historia— tiene `HEAD` igual a `origin/main` y el andamio
recién escrito **sin guardar**. Medir solo las refs diría «el primer envío ya está en
GitHub» sobre archivos que no se enviaron. La lista afirma lo que la corrida hizo.

**El nombre tomado se detecta antes de preguntar.** `gh repo create` sobre un
nombre existente devuelve 422 (`name already exists`, medido en Rigel,
`docs/arrancar-un-proyecto.md` §3.3). `gh repo view` lo dice antes, sin tocar nada,
y la salida explica cómo conectarlo si está vacío. Un error de red en esa consulta
no bloquea: se sigue a la pregunta y, si la creación falla, el aviso lo dice.

**Una historia ajena no se toca.** Si el destino ya era un repositorio con
guardados, no se agrega uno encima ni se publica: no la armó esta corrida. Si era un
repositorio vacío (el de un `--clone` de un repositorio recién creado), se guarda
encima en `main` y se respeta su `origin`.

## Sin shell, en los tres sistemas

Viajan el nombre de la cuenta y el del proyecto. Con `shell: true` en Windows, Node
concatena los argumentos sin escapar (DEP0190). git y gh se instalan como `.exe`,
así que se lanzan con `shell: false` en todos los sistemas, y además se validan
contra la forma de un `<cuenta>/<repo>` de GitHub antes de llegar a `gh`.

**Descartado: `shell` en Windows para poder usar un `gh.cmd` falso en el banco.**
Sería empeorar la invocación real para acomodar la prueba. El caso con un `gh` falso
**en el PATH** corre en Linux y macOS; en Windows la misma lógica se ejerce con un
`gh` inyectado que delega en git de verdad. Queda declarado en el banco.

## Descartado: el orden de `docs/04` de antes

`gh repo create --clone` primero y después armar adentro es el camino a mano, y
sigue ahí. Para el doble clic no sirve: el lanzador arma primero (la carpeta
nace llena), y clonar sobre una carpeta llena falla. Por eso el doble clic crea el
repositorio **al final**, desde la carpeta (`--source=.`).

## Descartado para este lote: volver a sondear la protección de `main` tras publicar

La sonda de la protección corre antes de que el repositorio exista y deja escrito
«GitHub no conoce (todavía) a ese repositorio», con el arreglo de volver a
sondearla después del envío fundacional. Resondear al final daría un estado medido,
pero el documento ya quedó en el primer guardado: reescribirlo dejaría el árbol
sucio justo después de publicarlo. Queda como está, que es verdad.

## Qué lo hace cumplir solo

`pruebas/init/el-doble-clic-deja-un-repo.test.mjs`, en `pruebas/init/`, que el CI
del marco corre en la matriz ubuntu/windows/macos y en Node 18.17 y 20.12:

- **El caso rojo, permanente**: la invocación sin `--repositorio` deja una carpeta
  sin `.git`, y el mismo predicado que la detecta es el que exige el repositorio en
  los demás casos.
- git **de verdad** en cada caso (`.git`, rama `main`, autor del guardado, `origin`,
  `main` publicado en un repositorio desnudo que hace de GitHub).
- Los estados de falla: sin identidad, sin `gh`, sin sesión, sin terminal, nombre
  tomado, `gh` que sale 0 sin crear nada, arranque sin verde, historia ajena.
- Estático: los lanzadores pasan `--repositorio` y aceptan `--sin-remoto`; el módulo
  no usa shell; `docs/04` cita las frases que la herramienta imprime y no conserva
  las tres contradicciones.

Mutaciones medidas (una por guarda, cada una pone rojo exactamente su caso): el
lanzador sin `$MODO_REPO`; el control de identidad apagado; la verificación en el
disco apagada; Enter tomado como sí; «subido» por refs en vez de por la corrida.

## Deuda declarada

- **`arrancar.cmd` no se ejecutó en Windows en esta sesión** (máquina macOS). El
  banco de lanzadores lo ejecuta en `windows-latest` con la entrada cerrada, lo que
  cubre el bloque nuevo de opciones (va antes del Paso 0) pero **no** el Paso 2 con
  `%MODO_REPO%`, que necesita una persona contestando. La lógica que ese paso invoca
  corre en Windows en el banco con el `gh` inyectado.
- El caso del `gh` falso en el PATH se saltea en Windows (ver arriba).
