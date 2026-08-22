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

- [ ] 1.0 **El idioma del área, que hoy no está declarado en ningún lado.** El canónico
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
      y no por parámetro. Evidencia: la regla renderizada en el artefacto del andamio
      instanciado.
- [ ] 1.1 `actions/constitucion/canonico/90-marca.md`: las reglas duras
      **enunciadas** más el puntero a la skill como manual. **Cero hex, cero
      nombres de token, cero placeholders nuevos** —un placeholder nuevo es rojo
      sin ventana para todo consumidor— y solo los marcadores que ya existen.
      Presupuesto: el manifiesto declara 700 líneas y el canónico usa 611 por `wc -l`
      (619 por el conteo de la propia action, que es el que manda), así que quedan **81**
      y esta sección usa ~38. Evidencia: la corrida de la action reportando el conteo por
      debajo del presupuesto — no un `wc -l` a mano, que fue de dónde salió la cifra
      equivocada de la primera versión.
- [ ] 1.2 Entrada nueva en `canonico/manifiesto.json` con el número del release
      real y `exigible_desde` a 28 días o más. Evidencia: `openspec validate` en
      cero y la corrida de la action reportando la fecha.
- [ ] 1.3 El bloque `[FRONT]` en `plantilla/eslint.config.mjs` con las 7 reglas **en
      severidad de error** —no hay modo aviso posible: el lint corre con
      `--max-warnings=0`, así que un `warn` ya es un rojo (D8)—,
      **con los gemelos de `TemplateElement`** (D4.1) y el `files` que excluye el
      archivo de configuración de estilos (D4.2). La regla de blanco sobre naranja
      hay que escribirla: no existe en el `_adherence`. Evidencia: el lint del
      andamio instanciado en cero.
- [ ] 1.4 Banco con el **rojo evidenciado** de cada una de las 7 reglas: un
      fixture que la viola en un atributo y otro que la viola dentro de un
      template literal. Evidencia: el banco falla contra los fixtures y pasa
      contra el árbol limpio, con los dos códigos de salida anotados.
- [ ] 1.5 Control de que el bloque no es un no-op: un fixture con el bloque
      **retirado** tiene que dar rojo en la verificación. Sin esto, borrar el
      bloque deja el pipeline verde para siempre.
- [ ] 1.6 Subir los 5 pines del andamio al release. No depende de acordarse:
      `pruebas/andamio/pinado.test.mjs` los compara contra el CHANGELOG.
- [ ] 1.7 Entrada en el CHANGELOG **en este mismo PR**, con su sección «Para
      consumidores» diciendo qué tiene que hacer un repo existente: **nada, y el
      motivo es estructural** — el bloque de reglas vive en el andamio, que no llega
      a un repo ya creado. Un consumidor existente adopta el bloque cuando quiera,
      en un PR suyo, y ahí verá sus violaciones de una vez (D8).

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
