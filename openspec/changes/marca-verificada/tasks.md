---
artefacto: tasks
dri: Builder 1
aprueba: Builder 1 (builder) # gate de `calidad-codigo`, no del PO
informado: PO / Builder 2
estado: pendiente-de-revision
---

El orden manda. El bloque 1 se puede hacer **sin tocar la mecánica que heredan
todos los consumidores** y por eso va primero: deja al proyecto nuevo naciendo
con el texto y con el rojo, sin transición y sin riesgo para nadie más.

El bloque 3 es el único que toca `marco-ci.yml`. Va en su propio release, con su
auditoría de permisos acción por acción, y **después** de que el piloto esté estable —
la lección de que un job nuevo se audita antes del estreno está comprada tres veces.

**Y tiene una precondición que no es técnica** (D8): el consumidor existente hereda
`marco-ci.yml`, así que el bloque 3 le llega aunque su `eslint.config.mjs` no tenga las
reglas. No se estrena hasta que ese repo haya adoptado el bloque, o hasta que se declare
por escrito que queda afuera. Un aviso que nombra una regla que el repo no puede cumplir
sin otro PR enseña a ignorar los avisos.

Toda verificación se hace **por código de salida**, nunca grepeando la salida.

---

## 0. Lo que hay que contestar antes de escribir una línea

- [x] 0.1 **La skill `la organización-design` SÍ está publicada a nivel organización.**
      Contestado por Builder 1 el 2026-08-22. El `creatorType: "user"` del manifiesto de
      esta máquina era un indicio, no una prueba: dice quién la creó, no quién la tiene.
      Con esto la sección del canónico puede apuntar a la skill como manual sin mentir:
      un builder nuevo la tiene.
- [x] 0.2 **El dueño del design system es Builder 1.** Contestado el 2026-08-22. El «Core
      Team» de seis personas del documento maestro no existe y no se sustituye por otra
      ficción: la propiedad es de una persona nombrada, que es a quien se le pregunta
      «¿esto sigue vigente?» y quien decide sobre las piezas que faltan y sobre el hueco
      de la tipografía.
- [ ] 0.3 Tomar el snapshot: copiar los 6 CSS de tokens que sí son marca (D5), su
      punto de entrada y los 3 SVG —10 archivos, 22.671 bytes— a un directorio de
      trabajo y registrar el `sha256` de cada uno con la fecha. Evidencia: la
      tabla de huellas, que después vive en el manifiesto de la action.

## 1. Lo que se puede hacer hoy (cero bytes de mecánica heredada)

- [x] 1.0 **El idioma del área, que hoy no está declarado en ningún lado.** El canónico
      entero está en castellano y las reglas de UX writing del design system son
      específicas del castellano —sentence case, CTAs predicativos, «guiamos, no
      culpamos», locale `es-EC`— pero el marco NO lo dice: no está en el canónico, no es
      un marcador, y no es una clave de `.projects-valores.json`. Es un supuesto que todos
      cumplen y nadie escribió.
      Va en `90-marca.md` como **enunciado plano con su `projects:regla id`, NO como
      marcador**: un placeholder nuevo en el canónico es rojo sin ventana para todo
      consumidor cuyo archivo de valores no tenga la clave (ver 1.1). Y no hace falta
      parametrizarlo, porque la escapatoria ya existe: un proyecto que necesite otro
      idioma lo declara en `.projects-desvios.json` y la constitución renderiza «⛔ DESVÍO
      DECLARADO».
      Lo pidió Builder 1 el 2026-08-22, preguntando si el marco no podía dejarlo por default
      «y si se necesita se cambia en el init». La respuesta es que sí, pero por enunciado
      y no por parámetro. Evidencia: quedó como `marca-idioma-castellano` en
      `90-marca.md`, enunciado plano con su id, sin marcador nuevo.
- [x] 1.1 `actions/constitucion/canonico/90-marca.md`: las reglas duras
      **enunciadas** más el puntero a la skill como manual. **Cero hex, cero
      nombres de token, cero placeholders nuevos** —un placeholder nuevo es rojo
      sin ventana para todo consumidor— y solo los marcadores que ya existen.
      Hecho: **7 reglas con id estable** (idioma, texto oscuro sobre el acento, solo
      tokens, el logo no se redibuja, temas y foco, redacción, y lo que el marco no
      transporta), 62 líneas.
      Presupuesto, con el conteo de la propia action (`cuerpo.split("\n").length - 1`,
      que es el que manda): **673 de 700, margen 27**. La estimación de esta tarea —«usa
      611, quedan 81, esta sección ~38»— salió corta: el canónico ya estaba en 611 sin
      marca y la sección pesa 62, no 38. Se recortó desde 69 antes de commitear, porque
      ese costo lo paga cada sesión de cada repo.
      Evidencia: el conteo de arriba, y las 381 pruebas de `actions/**/pruebas` en verde
      (incluida la del presupuesto).
- [x] 1.2 Entrada nueva en `canonico/manifiesto.json` con el número del release
      real y `exigible_desde` a 28 días o más. Hecho: `1.6.0`, publicada 2026-08-22,
      exigible 2026-09-19 (28 días exactos, el mínimo declarado).
      **Por qué la entrada va en ESTE PR y no al cortar la versión**: cambiar el canónico
      sin su entrada de versión haría que el artefacto ya generado de un consumidor deje
      de coincidir con el re-render, y la action lo reportaría como «editado a mano» —el
      mensaje equivocado para lo que en realidad pasó—. Es el mismo defecto que el delta
      de este change arregla en los specs.
      Evidencia: `openspec validate --all --strict` → 14/14, y la suite de la action en
      verde.
- [x] 1.3 El bloque `[FRONT]` en `plantilla/eslint.config.mjs` con las 7 reglas **en
      severidad de error** —no hay modo aviso posible: el lint corre con
      `--max-warnings=0`, así que un `warn` ya es un rojo (D8)—,
      **con los gemelos de `TemplateElement`** (D4.1) y el `files` que excluye el
      archivo de configuración de estilos (D4.2). La regla de blanco sobre naranja
      hay que escribirla: no existe en el `_adherence`.

      **Lo hecho NO es 1 regla = 1 selector, y conviene leer por qué.** Son **10
      selectores que cubren 5 de las 7 reglas**; las otras dos quedan fuera a propósito y
      el archivo lo dice en su encabezado:
      · `marca-idioma-castellano`: un árbol de sintaxis no juzga idioma. La fija el
        instalador al crear el repo.
      · `marca-lo-que-el-marco-no-transporta`: es la regla que declara que **el marco no
        pone en rojo a nadie por tipografía** mientras la marca no entregue los archivos.
        Lintear la tipografía habría contradicho al canónico en el mismo PR que lo
        escribe. Por eso el bloque no tiene regla de `font-family`, aunque el
        `_adherence` sí la tiene.
      Y dos reglas se llevan más de un selector: la del acento y la de tokens necesitan su
      gemelo de `TemplateElement` (D4.1), y la de tokens suma el barrido de valores
      arbitrarios entre corchetes (`z-[9999]`, `w-[13px]`), que es la forma en que
      Tailwind dice «me salgo de la escala».
      También se descartó una regla que estaba escrita y guardaba nada: prohibir el import
      profundo de `la organización-design`. El design system no llega a un consumidor como paquete
      de node, así que el patrón no podía coincidir con ninguna ruta real.

      Alcance: `files: ["{{PAQUETE_WEB}}/src/**/*.{ts,tsx}"]` **propio**, no heredado del
      `ignores` global (D4.2). El motivo medido: el un consumidor borró
      `**/*.config.js` de su lista, así que apoyarse en ella habría dejado las reglas
      mordiendo la configuración de estilos, que es el único lugar legítimo donde los
      valores de marca se escriben.

      Evidencia, en tres planos:
      1. `projects init` instancia el andamio y el config generado queda **sin un solo
         marcador** y sintácticamente válido.
      2. Ese config generado **carga en un ESLint 9 real** y pone en rojo
         `web/src/components/ui/button.tsx:10` con el mensaje del acento — el caso que
         está en la variante primaria del botón, o sea en toda la aplicación.
      3. Medido contra el frontend entero del consumidor: **26 hallazgos en 17 archivos**
         (5 de blanco sobre el acento, 5 hex crudo, 8 valores arbitrarios, 1 `outline-none`
         sin reemplazo, 2 `focus:`, 5 SVG a mano). Tres reglas dan 0 en este repo, y su
         única evidencia es la del banco sintético.
- [x] 1.4 Banco con el **rojo evidenciado** de cada una de las 7 reglas: un
      fixture que la viola en un atributo y otro que la viola dentro de un
      template literal.
      Hecho en `pruebas/marca/banco-eslint.mjs`, con ESLint 9 de verdad: **10 casos
      violatorios** (uno por selector, no por regla, por lo dicho en 1.3), **18 casos
      legítimos** y un control no-op con un componente completo. El caso del atributo y
      el del template literal están los dos, y son nodos distintos del árbol: el atributo
      `className="..."` es un `Literal`, la parte fija de una plantilla es un
      `TemplateElement`. Cada caso violatorio tiene que disparar **su** selector **una
      vez** y ningún otro: la contaminación entre reglas también es rojo.
      **Por qué este banco no corre en CI**: el marco no tiene `package.json` ni
      `node_modules`, y eso es una propiedad —no le impone dependencias a nadie, ni a sí
      mismo—. Se corre a mano contra un repo que las tenga y su salida va al PR. Trae un
      modo `--medir` que cuenta violaciones por regla en un árbol real, que es de donde
      salieron los 26 hallazgos de 1.3.
      Los selectores se **leen** del andamio (`pruebas/marca/extraer.mjs`), nunca se
      copian: una copia se desincroniza y desde ahí el banco pasa contra un archivo que ya
      no es el que se distribuye.
      Evidencia: `node pruebas/marca/banco-eslint.mjs --repo <consumidor>` → BANCO VERDE
      (29 líneas OK), y sin `--repo` sale 2 con el motivo escrito.
- [x] 1.5 Control de que el bloque no es un no-op: un fixture con el bloque
      **retirado** tiene que dar rojo en la verificación. Sin esto, borrar el
      bloque deja el pipeline verde para siempre.
      Hecho, y más ancho de lo pedido: la guarda de CI
      (`pruebas/marca/reglas-marca.test.mjs`, 10 pruebas, cero dependencias) tiene una
      prueba que muta **copias** del andamio en un directorio temporal y exige que **cada
      una de sus nueve comprobaciones muerda**. Las ocho mutaciones: el bloque retirado
      entero (el caso que pide esta tarea), sin `files`, en `warn`, un selector nuevo sin
      su caso, un regex roto, un regex que deja de detectar su propia violación, un regex
      ensanchado que muerde trabajo honesto, y una regla del canónico sin decidir.
      Dos detalles que costaron una corrida cada uno, anotados para el que venga:
      · Si el ancla de una mutación se mueve, eso también es rojo. Una mutación que no
        cambia nada dejaría de estar probando la mordida de nada, en silencio.
      · Quitar el `]` de una clase de caracteres **no** sirve como mutación de «regex
        roto»: el resultado sigue siendo un regex válido y la comprobación pasa con razón.
        Hace falta un paréntesis sin cerrar.
      Se mutan copias, no el archivo del repo: un fallo a mitad de camino no puede dejar
      el andamio modificado, y la prueba lo verifica al final.
      Evidencia: `node --test pruebas/marca/reglas-marca.test.mjs` → 10/10.
- [ ] 1.6 Subir los 5 pines del andamio al release. No depende de acordarse:
      `pruebas/andamio/pinado.test.mjs` los compara contra el CHANGELOG.
      **Pendiente a propósito: esta tarea es del corte de versión, no de este bloque.**
      Nada de lo del bloque 1 llega a un consumidor hasta que se publique una versión, así
      que en `main` es inerte. La entrada del CHANGELOG ya está (1.7) y de ahí sale el
      número cuando se corte.
- [x] 1.7 Entrada en el CHANGELOG **en este mismo PR**, con su sección «Para
      consumidores» diciendo qué tiene que hacer un repo existente: **nada, y el
      motivo es estructural** — el bloque de reglas vive en el andamio, que no llega
      a un repo ya creado. Un consumidor existente adopta el bloque cuando quiera,
      en un PR suyo, y ahí verá sus violaciones de una vez (D8).
      Hecho, en `[No publicado]`. Dice las dos piezas, los 673/700, los 26 hallazgos
      medidos, las dos reglas que **no** se lintean con su motivo, y los límites: el
      nombre de la clase del acento lo elige el proyecto (se reconocen `orange` y
      `accent`; otro nombre se sale del alcance sin que nada avise) y los selectores ven
      strings, no estilo computado.
      La sección para consumidores separa las dos piezas, porque no viajan igual: el
      bloque de ESLint llega **solo a repos nuevos** (andamio) y la porción de la
      constitución llega **a todos** con su ventana de gracia (exigible 2026-09-19).

## 2. `actions/marca` (después del piloto)

- [ ] 2.1 La action, hermana de `actions/constitucion` y **no dentro** (D2): lee
      su canónico, escribe los 10 archivos (6 tokens + entrada + 3 SVG) al paquete de
      frontend, y emite
      el `@import`. Modos `escribir` y `verificar`, como la hermana.
- [ ] 2.2 La verificación **por re-render** (D6), no por sello guardado.
      Evidencia: un fixture con el artefacto editado a mano da rojo nombrando el
      archivo y la diferencia.
- [ ] 2.3 El ledger con las huellas de la 0.3, y la validación de que **falta una
      huella es inválido**. Evidencia: un fixture sin huella da rojo.
- [ ] 2.4 La regla de `var()` huérfano (D7). Evidencia: un fixture que refiere un
      token que el canónico no define da rojo con archivo y línea.
- [ ] 2.5 El barrido de hex en **CSS**, que ESLint no puede hacer porque no lee
      CSS. Va en la action. Evidencia: el fixture con dos hex crudos en un
      `index.css` da rojo.
- [ ] 2.6 El job de `verificar` en `plantilla/.github/workflows/ci.yml` con su
      `needs` en `ci-ok`. Es un archivo **del consumidor**, no `marco-ci.yml`: el
      riesgo es del proyecto nuevo, no de todos.
- [ ] 2.7 `styles.css` con **6 `@import`, no 7** (D5), y el aviso del hueco de la
      tipografía en cada corrida. Evidencia: la corrida imprime el aviso y no
      falla por él.
- [ ] 2.8 La validación del tercer requirement, que la primera versión de estas tareas
      no entregaba: el manifiesto declara qué piezas son **sustitución**, y el canónico
      que incluya una de ellas es **inválido**. Sin esto, el requirement escribe una
      garantía que nadie comprueba y basta con que alguien agregue `fonts.css` al
      canónico para que la promesa se rompa en silencio. Evidencia: un fixture con una
      pieza marcada como sustitución dentro del canónico da rojo.
- [ ] 2.9 **«Nombra el token que corresponde usar»: encontrado al releer el delta contra
      lo construido en el bloque 1, y no lo cierra el linter.** El scenario «Un valor de
      color escrito a mano donde hay un token» pide que el reporte nombre el token que
      corresponde. El bloque 1 reporta el archivo, la línea y **dónde está el catálogo**,
      pero no el token: los mensajes de `no-restricted-syntax` son **estáticos por
      selector**, no se computan desde el texto que coincidió, así que ningún arreglo de
      redacción alcanza. Para nombrar el token hace falta el mapa hex → token, que llega
      con el canónico de la 2.1, y un verificador que pueda computar el mensaje: la action
      de la 2.5 ya hace exactamente eso para CSS.
      Se cierra extendiendo ese barrido a `.ts`/`.tsx`, con el linter quedando como la
      compuerta que corta el paso y la action como la que dice cuál era el token.
      Si al llegar acá se decide que no vale la pena, la alternativa NO es dejar el
      scenario a medias: es que el PO ajuste el scenario. Un scenario que nadie satisface
      es peor que uno más chico. Evidencia: un fixture con un hex de marca en un `.tsx`
      reportado con el nombre del token, o el scenario ajustado con el OK del PO.

## 3. El job en la mecánica compartida (release aparte)

- [ ] 3.1 La comprobación de que un repo con frontend tenga las reglas **cargadas y en
      severidad de error**. Y acá hay una decisión de ubicación que la primera versión de
      estas tareas resolvió mal: decía «con `--print-config` y no con un grep», pero
      `--print-config` necesita los `node_modules` del consumidor y **`marco-ci.yml` no
      instala dependencias en ningún job**. El marco ya resolvió esta clase al revés con
      el censo de fuentes: el reusable comprueba **por grep que el paso esté cableado**, y
      el check real corre en el `ci.yml` del consumidor, que sí instaló. Se hace igual:
      el grep de cableado va en `marco-ci.yml`, y el `--print-config` va en el job del
      consumidor de la tarea 2.6. Evidencia: los dos, con su fixture de bloque retirado.
- [ ] 3.2 Auditoría de permisos del job acción por acción **antes** del estreno.
      Es la lección repetida tres veces y no se salta.
- [ ] 3.3 Banco del paso inline, en `pruebas/marco-ci/`, con su fixture de bloque
      retirado.
- [ ] 3.4 Estreno en modo aviso con la fecha impresa, y el endurecimiento en el
      release siguiente. **Este es el único lugar donde el aviso es posible** (D8): la
      anotación de un workflow sí tiene estado intermedio, la severidad de eslint no.
      Acá va la ventana de 28 días del ledger.

## 4. Lo que este change NO hace

- [ ] 4.2 Nombrar en el archive un hueco que este change NO cierra y que conviene no
      descubrir después: **nada comprueba que la sección del canónico siga existiendo.**
      La prueba del canónico solo exige que haya dos o más secciones, así que borrar
      `90-marca.md` deja nueve y pasa verde. El artefacto del consumidor cambiaría —y su
      check lo vería— pero el canónico del marco no protesta.
- [ ] 4.1 Dejar escrito en el archive, al cerrar, qué quedó abierto: el contraste
      y el foco reales (necesitan navegador y una dependencia nueva), el hueco de
      la tipografía, los iconos, RTL, y las piezas de marca que el sistema de diseño no
      entrega (una contra su documento maestro, tres contra la hoja de marca; ver el
      final del `design.md`).

## Fuera de alcance, declarado

- **Los 40+ componentes React.** El proyecto elige su framework.
- **`@axe-core/playwright`** y todo lo que exija una página renderizada. Dependencia
  nueva, y hoy la suite E2E corre contra un ambiente **ya desplegado**: un fallo de
  contraste llegaría después del merge, que es tarde.
- **RTL.** 24 hits en el consumidor actual por algo que nadie pidió.
- **Publicar los assets de marca que faltan.** Es del dueño de la marca.
- **Adoptar la constitución en el consumidor actual.** Ya está hecho; despinar sus
  referencias flotantes es otro asunto y otro PR.
