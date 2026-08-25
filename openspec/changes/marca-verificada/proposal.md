---
artefacto: proposal
dri: Builder 1
aprueba: Builder 2 (builder par) # NO el `dri`: hasta el 2026-08-24 este campo decía
                              # `Builder 1`, o sea el propio autor, y un autor que se
                              # aprueba a sí mismo no es un review. Con
                              # `required_approving_review_count` en `0` y
                              # `require_code_owner_review` en `false`, nada más lo
                              # detiene. Sigue sin ser el PO: su gate en este repo está
                              # acotado a la capability de gobernanza
                              # (.github/CODEOWNERS, últimas líneas) y este delta es
                              # técnico
informado: PO / Builder 2
estado: pendiente-de-revision
---

# marca-verificada — Proposal

## Why

El design system de ORG existe, está completo y ya está distribuido a toda la
organización como skill (`la organización-design`, v2.1.0: 189 archivos, 40+ componentes,
7 archivos de tokens, los logos oficiales). **No falta el manual. Falta que se
cumpla.**

Y eso no es una impresión: está medido en el consumidor que hoy corre en
producción.

| Hallazgo | Dónde | Qué dice la marca |
|---|---|---|
| **Blanco sobre naranja** — 2.9:1, falla WCAG AA | 5 casos. Uno es la variante `primary` de `web/src/components/ui/button.tsx:10`, o sea **el botón de toda la aplicación** | «Texto sobre naranja siempre oscuro (`#15181D`, 6.7:1); blanco sobre naranja está **prohibido** (2.9:1)» |
| **La Estrella de la organización dibujada a mano**, con `fill="#FF7500"` en el atributo | `web/src/App.tsx:45`, `components/ErrorBoundary.tsx:41`, `components/Layout.tsx:139`. El path oficial usa curvas Bézier; el de la app son líneas rectas: son dibujos distintos | El logo se usa desde `assets/`, o inline por el componente `Wordmark` |
| **Las fuentes no son las de la marca** | `web/tailwind.config.js:13-16`: `Space Grotesk` para display y `Manrope` para cuerpo | Familia única: **Inter Tight**, dos pesos |
| **Un color de marca equivocado pero coherente** | `web/tailwind.config.js`: `bg: "#EDECE8"` | `--color-surface-base: #F9F8F6` |

Los cuatro son del mismo tipo: **nadie se apartó a propósito.** Se apartaron
porque nada lo impedía.

### Por qué la skill no alcanza, y no es un defecto de la skill

La skill hace bien lo que hace: **le dice a un agente cómo diseñar cuando alguien
la invoca.** Lo que no hace, por naturaleza y no por omisión:

1. **No pone nada en el árbol del proyecto.** Un agente que no la invoca trabaja
   sin ella, y el proyecto no tiene forma de saber que existía.
2. **No se carga sola.** Depende de que alguien se acuerde de invocarla — que es
   exactamente lo que este marco declara que no cuenta como enforcement.
3. **No pone rojo a nadie.** Trae 686 líneas de reglas de adherencia en
   `_adherence.oxlintrc.json` y **las tres claves de regla están en `warn`**;
   una de ellas es además inerte (`react/forbid-elements` con `forbid: []`). Un
   check que avisa no es una compuerta.

El marco sí tiene las tres cosas que faltan: un mecanismo que pone texto en el
árbol de todo consumidor y lo mantiene al día (la constitución), un linter que
corre en cada PR y en la máquina del builder antes del push, y una forma de
regenerar artefactos sin vendorarlos.

## What Changes

Tres piezas. **Ninguna copia el design system**, y eso es la decisión de fondo:
la skill ya está distribuida, así que una segunda casa divergiría — y «la
divergencia entre dos casas es cuestión de tiempo» es una frase que este repo ya
escribió sobre otro tema.

De los 189 archivos y 960K de la skill, **solo 10 archivos (22.671 bytes) necesitan
poder actualizarse solos** — el desglose exacto está en el `design.md`, D1.

### 1. Una sección de marca en el canónico de la constitución

Las reglas duras **enunciadas** —no los valores— más el puntero a la skill como
manual. Viaja por el mecanismo que ya existe y ya está verde: se renderiza al
árbol de cada consumidor, en cada superficie de agente, con su check de que esté
al día y siga cargada.

Es lo que hace que un agente que **no** invocó la skill igual sepa que no puede
poner blanco sobre naranja.

### 2. Las reglas verificables, en el linter que el marco ya reparte

Siete reglas al `eslint.config.mjs` del andamio. **Cero dependencias nuevas**:
son `no-restricted-syntax`, `no-restricted-imports` y `react/forbid-elements`,
todas nativas de ESLint.

Y la compuerta ya existe: el andamio corre `pnpm lint` dentro de `build_test`,
que cuelga de `ci-ok`. No hay que construir el gate, hay que cargarle las reglas.

Medido contra el consumidor real: **27 hits**, repartidos en dos familias que viven en
archivos disjuntos —los 5 de blanco sobre naranja en 4 archivos, y el resto en otros
4—, o sea **8 archivos** en total. El arreglo son unos cinco `className` y cinco hex.

> Dos correcciones a la primera versión de este párrafo, porque decía «27 avisos en 4
> archivos, cero falsos positivos». **«Avisos» es imposible**: el lint corre con
> `--max-warnings=0`. Y **el selector de píxeles crudos sí tiene falsos positivos** si
> viaja tal como está en el `_adherence`: caza los `matchMedia("(min-width: 768px)")`
> del consumidor, que son legítimos. Por eso ese selector se acota a atributos de
> estilo, y el desglose por regla va en la tarea 1.4 y no en una cifra global.

### 3. `actions/marca`: los tokens y los logos como artefacto regenerado

Los 6 CSS de tokens que sí son marca, su punto de entrada, y los 3 logos SVG
**tienen que estar en el árbol** para que
el build los use; no se pueden referenciar por `uses:` como un workflow. Se
regeneran desde un canónico pinado, y el check compara contra el **re-render**,
no contra un sello guardado — porque recomputar un sello es un commit y cambiar
el canónico no.

## Impact

- **Capability afectada:** `calidad-codigo`. **No nace una capability nueva**: su
  requirement «Lint y formato configurados para todos los paquetes» ya es la casa
  de este tipo de garantía.
- **Consumidores existentes: no se enteran, y el motivo es estructural.** El bloque
  de reglas vive en el `eslint.config.mjs` del **andamio**, que se copia una vez al
  crear el repo: un repo que ya existe **no lo recibe nunca**. Sus violaciones —27 en
  el caso real— aparecen el día que su dueño decida adoptar el bloque, en un PR suyo.
  El estreno con fecha existe, pero recién en el bloque 3 y por otra vía; el `design.md`
  D8 explica por qué en el lint no puede haberlo.
- **Proyectos nuevos:** nacen con el texto y con el rojo, sin transición.
- **Repos sin frontend:** el bloque de reglas se saltea solo por `files`. No
  exige que nadie lo apague.

## Qué NO entra, y es deliberado

| Qué | Por qué |
|---|---|
| **Los 40+ componentes React** | El proyecto elige su framework. El consumidor actual ya tiene su `Button` sobre `cva` + Tailwind, y elige mejor que el kit en un punto: usa `lucide-react` versionado |
| **`fonts.css`** | Es el único de los 8 CSS que **no es marca**: sus cinco líneas son cuatro de disclaimer —«no font binaries were provided; Inter Tight is loaded from Google Fonts»—. Repartirlo convertiría una sustitución declarada en el estándar verificado del área, con un rojo para quien la corrija. Entra como **hueco declarado** con aviso en cada corrida |
| **Los iconos** | El kit usa Lucide desde CDN con `@latest`, **sin pin** — que viola `ejecutores-con-version-exacta` del propio canónico |
| **RTL** | 24 hits más en el consumidor actual por un beneficio que nadie pidió (interfaces en español, LTR). Fuera hasta que se decida |
| **Contraste y foco reales** | Necesitan un navegador (`@axe-core/playwright`): dependencia nueva y un job que sirva el front en el PR. Va después, y con su propio OK |

## Lo que este change NO puede cerrar

Se dice acá y no en una nota al pie, porque es la parte que un lector va a querer
saber antes de aprobar:

1. **La divergencia entre el canónico del marco y el árbol de la skill no es
   detectable, y no puede serlo.** La skill no es un repo: vive bajo UUID de
   sesión, sin `.git`, sin tag, y **sin un campo de versión legible por
   máquina** —solo aparece en prosa—. Mitigación: el manifiesto guarda el
   `sha256` de cada CSS tal como se tomó, con fecha. No detecta el desvío; hace
   **contestable** la pregunta «qué snapshot es este», que hoy no se puede
   contestar de ninguna forma.
2. **Un valor de marca equivocado pero coherente no lo caza ningún linter**, y la
   primera versión de este proposal decía que «lo cierra la pieza 3 y solo ella».
   **Era falso, y la contradicción era interna:** el defecto medido —`bg: "#EDECE8"`
   donde la marca dice `#F9F8F6`— vive en el archivo de configuración de estilos, que
   el design saca del alcance del linter a propósito (es el lugar legítimo de esos
   valores) y que la pieza 3 nunca mira, porque escribe y barre **CSS**. O sea que el
   cuarto hallazgo de la tabla de arriba quedaba verde para siempre, y el delta lo
   garantizaba por escrito.

   **Se cierra, pero hace falta decir cómo:** el archivo de configuración es el lugar
   correcto para esos valores **y** sus valores tienen que coincidir con los tokens del
   canónico pinado. Eso es sintácticamente decidible —se leen los dos y se comparan— y
   por eso entra como escenario del segundo requirement en vez de quedar como límite.
3. **Un token eliminado en una versión futura** sale del canónico, el CSS deja de
   definirlo, y el `var(--token-viejo)` del proyecto resuelve a nada: silencioso,
   en runtime, invisible al diff. Hace falta una regla de `var()` huérfano, y va
   en la misma action y no en un TODO. Hay precedente de que pasa:
   `tokens/deprecated.css` ya tiene siete alias «se eliminan en v3.0.0» y ninguno
   avisa de nada.
4. **El techo que el propio marco declara de sí mismo:** garantiza que el texto
   *llegue*, no que un agente lo *obedezca* en el turno 40 de una sesión larga.
   La mitad accionable la cierra el linter; la otra sigue siendo review humano.

## Dos cosas que el change no decide y alguien tiene que contestar

1. **¿La skill `la organización-design` está publicada a nivel organización?** El
   manifiesto de esta máquina la marca `creatorType: "user"`. Si no lo está, la
   sección del canónico apuntaría a un manual que un builder nuevo no tiene, y el
   texto mentiría desde el día uno.
2. **¿Quién es dueño del design system?** Su `ORG-MASTER.md` asigna la
   propiedad a un «Core Team» de seis personas que no existe en un área de tres.
   Sin dueño, la pregunta «¿esto sigue vigente?» no tiene a quién hacerse.
