# Design — el-arranque-deja-su-friccion

## Contexto

Dos ítems del catálogo de Rigel 1.14.0 (change `2026-09-01-arranque-ejecutable`): la skill
`rigel-arrancar` con el registro de fricción como condición de término, y el comparador de
comandos entre una guía y una skill. En Rigel los dos existen porque el arranque era prosa y
una skill lo convirtió en algo ejecutable. En Projects el arranque **ya** es ejecutable —el
asistente pregunta y `derivar()` calcula; `projects init` instancia, arranca y deja el
repositorio—, así que lo trasladable no es la skill: es la propiedad de que el procedimiento
no pueda decir «listo» sin dejar lo que rodeó, aplicada a la herramienta que ya existe.

## Clasificación de distribución

| Pieza | Forma | Por qué esa y no otra |
|---|---|---|
| `herramientas/registro-de-friccion.mjs` (nuevo) | canónico | Herramienta del marco: corre desde el clon en la máquina de quien arranca y no viaja. No es referenciado (nadie la consume con `uses:`), ni scaffold (no se copia), ni regenerado (no sale de un CLI pinado). La misma forma que `projects-init.mjs` y `projects-repositorio.mjs`. |
| `herramientas/projects-init.mjs` | canónico | Ídem: abre el registro, vigila la consola y lo cierra antes de `LISTO`. |
| `herramientas/projects-asistente.mjs` | canónico | Ídem: devuelve dónde se trabó la persona y el reparto calculado de `derivar()`. |
| `herramientas/projects-repositorio.mjs` | canónico | Exporta `haySesion`, para que el envío del registro use la misma regla que la creación del repositorio. Sin cambio de comportamiento. |
| `herramientas/comandos-compartidos.mjs` (nuevo) | canónico | Herramienta del marco que corre el banco del marco; no viaja. |
| `plantilla/.gitignore` | scaffold | Es el único archivo que llega a un proyecto: dos líneas que ignoran lo que la herramienta deja en la raíz. Tiene que ser scaffold porque el archivo que se ignora aparece en el proyecto y la puerta web hace `git add -A` después de copiarlo. |
| `.gitignore` (del marco) | canónico | Los lanzadores corren el asistente parados en el clon: el archivo intermedio queda ahí. |
| `docs/12-upgrade-openspec.md`, `.claude/skills/projects-adoptar/SKILL.md` | canónico | Documentación y skill del marco (la skill la escribe el marco a mano, no la regenera ningún CLI). Ganan la marca del comando compartido. |
| `docs/plantillas/registro-de-friccion.md`, `docs/04`, `docs/05`, `docs/README.md` | canónico | Documentación del marco; la plantilla sigue siendo canónica (la cita el índice así). |
| `pruebas/init/registro-de-friccion.test.mjs`, `pruebas/docs/comandos-compartidos.test.mjs` | canónico | Bancos del marco; el primero en `pruebas/init/`, que el CI corre en la matriz de tres sistemas y dos versiones de Node. |

Ningún consumidor recibe un comportamiento nuevo en su pipeline. Contrato: MINOR.

## Decisiones

### D1 — El registro envuelve a la herramienta; no hay skill de arranque

`projects init` abre el registro al empezar (`main`, `herramientas/projects-init.mjs`) y lo
cierra en `dejarElRegistroDeFriccion`, llamada justo antes del bloque que imprime `LISTO`.

**Descartado — portar `rigel-arrancar`**. Una skill que ejecuta el arranque duplicaría el
árbol de decisiones del asistente y la derivación de valores: dos declaraciones de lo mismo,
esperando divergir. Es el conflicto que el plan del porte ya nombra («una skill paralela
duplicaría la lógica del asistente»). **Descartado — portar `fuentes-de-los-valores.mjs`**:
son los valores y las constantes de Orion. Lo que esa tabla contaba («deriva 20 de 23») acá
sale de `reparto()`, calculado con `derivar()` y las preguntas que de verdad se hicieron.

### D2 — La condición de término es el archivo; el issue se ofrece

Rigel abre el issue y sale 1 si no puede: el procedimiento «no terminó». Acá la condición de
término es **el archivo** en la raíz del proyecto (al lado de la bitácora, que ya enseñó a la
persona dónde buscar), y mandarlo como issue al repositorio del marco **se ofrece y se
confirma** escribiendo `si`.

- **Por qué no salir 1**: el proyecto ya está armado y en verde cuando esto corre. Un rojo
  acá manda a la persona —que puede no programar— a reabrir el lanzador, que choca con la
  guarda del destino ocupado: el mismo razonamiento con que `projects-repositorio.mjs`
  convierte en aviso todo lo que no pudo hacer.
- **Por qué confirmar**: abrir un issue es visible desde afuera, y el repositorio del marco
  es público. Es la regla que el PO fijó para `gh repo create` en el lote 0b. Sin terminal no
  se llama a `gh` ni para mirar.
- **Sin label**: Rigel usa `area:proceso`. `gh issue create --label X` falla entero si la
  label no existe en el repositorio de destino, y un fork no tiene por qué tenerla. El título
  empieza siempre con «Friccion del arranque», que es lo que se busca.
- **El destino se deriva** del remoto del clon (`repoDelRemoto`), igual que `ORG_MARCO`: un
  fork manda su registro a su fork, que es quien puede corregir lo que ese fork entregó.

### D3 — Lo que se registra sale solo: se vigila la consola

`vigilarAvisos` intercepta `console.log/error/warn` durante la corrida y anota cada
`::warning::` con la fase actual como punto (`friccion.enFase(...)` en cada sección de
`main`). Es el criterio de la bitácora: interceptar una vez en vez de envolver cada llamada.

**Descartado — una llamada `anotar()` al lado de cada aviso**: el primer aviso nuevo que
alguien escriba sin esa llamada quedaría afuera, en silencio. Así, un fail-open que se agregue
mañana entra solo. La clase sale de `CLASE_DE_AVISO`: «medido —» (la convención de la
herramienta para un hallazgo sobre la cuenta) no es un apartamiento; el tipo de cuenta
supuesto es `VALOR_INFERIDO`; `--sin-arranque`/`--sin-herramientas`, `PASO_NO_APLICA`; todo lo
demás, `SIN_COMPROBAR`, que es el lado que no pierde nada. Si la fase queda vieja porque
alguien agrega una sección sin `enFase`, el aviso entra igual, con un punto menos preciso.

### D4 — Seis clases cerradas: las cinco de Rigel más `PREGUNTA`

`PREGUNTA` existe porque Projects tiene asistente y Rigel no: una respuesta rechazada por su
forma (el correo donde va el usuario de GitHub) no es un comando reemplazado, ni un paso que
no aplica, ni un valor inferido. Volver atrás es `ORDEN`. El banco fija el conjunto exacto.

### D5 — Lo del asistente cruza procesos por un archivo que se consume

Los lanzadores corren `--asistente --solo-valores` y después `--valores` en dos procesos. El
asistente deja `.projects-friccion.json` al lado de los otros tres archivos que escribe; el
arranque lo lee al cerrar el registro y lo borra. Si la corrida falla, no se consume y queda
para el reintento. Lo ignoran el `.gitignore` del marco (el lanzador lo deja en el clon) y el
del andamio (el camino a mano lo deja en la carpeta del proyecto).

**Descartado — guardarlo dentro de `.projects-respuestas.json`**: ese archivo son las
respuestas que se ofrecen como valor por defecto; mezclarle otra cosa la convierte en una
«respuesta» más. **Descartado — que el asistente abra su propio registro**: serían dos issues
por corrida, y el del asistente no sabría cómo terminó el arranque.

### D6 — El registro no identifica a nadie, y eso se decide al escribirlo

`redactar` tapa, antes de escribir el archivo, los valores que identifican a un proyecto o a
una persona (`PROYECTO`, `ORG`, los roles, cuentas, dominios, prefijo, canal) y las rutas del
destino, de la carpeta de valores, del clon, de la carpeta temporal y del directorio personal,
en su forma escrita y resuelta. El asistente, además, nunca guarda lo que la persona
escribió: solo la pregunta y el motivo del rechazo.

**Descartado — limpiar solo al mandar**: el archivo ES el cuerpo del issue
(`--body-file`), y uno que hay que acordarse de limpiar antes de mandar es una fuga esperando
a que alguien se apure.

### D7 — El módulo se carga cuando hace falta

`main` importa `registro-de-friccion.mjs` con `import()` y, si falta, la corrida sigue y lo
dice con `::warning::` donde iba el registro. **Descartado — el import estático**: medido, los
bancos que copian `projects-init.mjs` solo a un clon parcial morían con
`ERR_MODULE_NOT_FOUND` antes de la primera línea, sin `::error::` y sin bitácora (10 casos de
`pruebas/init/projects-init.test.mjs` en rojo). Es el patrón que ya siguen
`projects-repositorio.mjs` y `registro-npm.mjs`. Por lo mismo el asistente no importa el
módulo: devuelve objetos planos que el arranque valida al anotarlos.

### D8 — La capability es `calidad-codigo`, no `gobierno-contribucion`

Rigel puso sus tres requirements en `gobierno-contribucion` («cómo se ejecutan los
procedimientos del marco»). Acá lo que se exige es una propiedad de una herramienta —no dice
LISTO sin su registro— y de la documentación ejecutable —dos textos que dicen ser el mismo,
lo son—: maquinaria, que es de builders. Los requirements del arranque de este carril viven
en `calidad-codigo`, y `gobierno-contribucion` es la capability que el PO gatea y que otro
carril está tocando.

### D9 — El comparador solo se trae porque hay un par real

El plan lo condiciona: «solo si existe un par guía-skill real». Existe:
`docs/12-upgrade-openspec.md` declara, en prosa, que su comando para leer el pin de OpenSpec
es el mismo que usa la skill `projects-adoptar`, y los dos bloques eran idénticos. La misma
frase nombraba también a `projects-archive-change`, que ya no lo usa: la divergencia que la
herramienta existe para cazar, encontrada el día que se trajo.

- **Pares declarados en `PARES`** dentro de la herramienta; sin argumentos compara todos, que
  es como la corre una persona y como la corre el banco.
- **Un lado que falta es rojo**, no aviso (Rigel avisaba porque su skill todavía no existía).
  Acá un par solo se declara cuando los dos existen; que uno desaparezca es romperlo sin
  decidirlo.
- **Se hace cumplir desde el banco** (`pruebas/docs/comandos-compartidos.test.mjs`), que el job
  `pruebas-actions` del CI del marco ya corre sobre todo `pruebas/**`: no hace falta tocar
  ningún workflow.

## Qué lo hace cumplir solo

| Propiedad | Compuerta |
|---|---|
| No hay `LISTO` sin registro, y se dice antes | `pruebas/init/registro-de-friccion.test.mjs`, «LA CONDICION DE TERMINO…»: corre la CLI de verdad y exige el archivo y el orden de las líneas. Mutante (la llamada anulada): rojo. |
| Todo aviso entra solo | el mismo banco, «todo ::warning:: de la corrida entra…» y el caso de punta a punta, que busca el apartamiento de `--sin-arranque`. Mutante (consola sin vigilar): 2 rojos. |
| No identifica a nadie | el caso de punta a punta y «el registro no lleva el nombre…». Mutante (sin tapar): 2 rojos. |
| El vacío se dice | «una corrida SIN apartamientos…». Mutante: rojo. |
| Lo del asistente cruza procesos y se consume | el caso de punta a punta, con el archivo intermedio sembrado. |
| Sin terminal no se manda nada; Enter no es sí | los cuatro casos de `ofrecerElIssue`, con un `gh` falso que registra cada llamada. |
| Copiada sola, avisa | «copiada SOLA fuera de su clon…». |
| Los comandos compartidos coinciden | `pruebas/docs/comandos-compartidos.test.mjs`, «EL PAR REAL…» y «MUERDE sobre el par real…». |

**Lo que NO se hace cumplir, declarado.** Que el registro **llegue** al marco depende de que
la persona confirme el envío: ningún check puede exigirlo sin convertir el arranque de otra
persona en un rojo por algo fuera de su proyecto. La parte humana del camino (el reloj, los
ajustes de GitHub, el primer change) sigue siendo la plantilla a mano. Y la clase de un aviso
nuevo cae en `SIN_COMPROBAR` hasta que alguien le agregue su fila a `CLASE_DE_AVISO`: se
registra igual, con una clase posiblemente imprecisa.
