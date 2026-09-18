---
artefacto: design
dri: Builder 1
aprueba: revision adversarial (desvio del marco: un solo mantenedor, ver AGENTS.md)
informado: PO
estado: en-ejecucion
---

# Design — el-canonico-dice-como-se-trabaja

## Clasificación de distribución de cada pieza que se toca

| Pieza | Forma | Por qué esa y no otra |
|---|---|---|
| `actions/constitucion/canonico/40-fronteras.md` (cuatro reglas) | **canónico** | Es la única superficie que entra al contexto de cada sesión de cada proyecto sin que nadie la invoque. El que se está yendo en círculo no sabe que tendría que leer nada |
| `actions/constitucion/canonico/30-git-despliegue.md` (`terminado-en-local-y-no-cerrado`) | **canónico** | Tiene que estar al lado de `definicion-de-done`, que vive ahí |
| `actions/constitucion/canonico/10-openspec.md` y `80-github.md` (enlace) | **canónico** | Son las dos reglas que decían «cierra» |
| `actions/constitucion/canonico/90-marca.md` (residuos) | **canónico** | Es donde estaban |
| `actions/constitucion/canonico/manifiesto.json` | **canónico** (metadato) | Presupuesto, su nota y la huella de la 1.10.0 |
| `.claude/skills/projects-archive-change/SKILL.md` | no viaja — skill del repo del marco | Es la que usa este repo para archivar |
| `plantilla/.claude/skills/projects-archive-change/SKILL.md` | **scaffold** | La copia que recibe un proyecto nuevo. No es un artefacto del CLI de OpenSpec (no lleva `generatedBy`): la escribe el marco, así que se edita acá |
| `plantilla/eslint.config.mjs` (comentario) | **scaffold** | Sólo cambia prosa; un proyecto nacido conserva la suya |
| `actions/constitucion/pruebas/inventario-canonico.test.mjs`, `presupuesto-del-canonico.test.mjs`, `pruebas/andamio/residuos-del-renombrado.test.mjs` | bancos del marco, no viajan | Los recoge el job `pruebas-actions` por glob y cuentan en el veredicto agregado |
| `docs/09-construir-con-openspec.md`, `docs/11-reglas-no-escritas.md` | documentación del marco | La forma de declarar el estado, y la regla 9 sin la excepción que ya no hace falta |
| Deltas de `gobierno-contribucion` y `calidad-codigo` | **canónico** (specs) | Viven sólo en este repo |

**Descartado para las cuatro reglas y para `terminado-en-local`: una skill.** Sólo
actúa cuando alguien la invoca, y quien más la necesita no la va a llamar.
**Descartado: el `AGENTS.md` del andamio.** Llegaría sólo a proyectos nuevos y
quedaría congelado ahí; los tres consumidores reales no la recibirían nunca.

## Decisiones, con lo que se descartó

### D1 — Una sola versión del canónico, la 1.10.0 que ya abrió `ventana-vencida`

Cada versión nueva del canónico deja el PR de bump de cada consumidor en rojo hasta
que regenera. `ventana-vencida` ya subió a 1.10.0 en este mismo carril (sin
publicar). Este change **reescribe la huella de esa 1.10.0** en vez de abrir otra.

**Descartado: una 1.11.0 propia.** Dos rojos para el mismo consumidor por dos
cambios de texto que salen en el mismo release. **Por qué pisar la huella es
legítimo acá y no en la 1.7.0**: la 1.10.0 no se publicó, así que ningún artefacto
de ningún consumidor la declara todavía. Pisar la huella de una versión publicada
haría que dos textos distintos se llamen igual —lo que `huella-del-canonico.test.mjs`
existe para impedir—.

**Riesgo para la integración, declarado**: el lote 1 (otro carril) trae la regla
«si cambia la huella de la última versión respecto de la base del PR, `versiones[]`
tiene que crecer». Contra `main`, que no tiene la 1.10.0, la integración agrega la
entrada y la regla queda verde. Si alguien integrara este change sobre una base que
ya tuviera la 1.10.0 con la huella de `ventana-vencida`, esa regla lo pondría rojo,
y la salida correcta sería esa misma: fusionar las dos en una versión antes de
publicar.

### D2 — Las cuatro reglas de revisión con meta, con un id cada una

Van en ✅ Siempre porque son conducta que se hace sin preguntar. **Ids separados**:
un desvío anula la regla entera, así que agruparlas obligaría a quien quiera
apartarse de una a apartarse de las cuatro.

La tercera nombra al rol por `{{PO}}` y no por «el PO» a secas, que es lo que tiene
Rigel: la decisión D8 dice que reasignar un rol tiene que costar editar un solo
lugar, y ese lugar es `.projects-valores.json`. `{{PO}}` ya lo exige
`openspec-roles`, así que **no hay marcador nuevo** que documentar.

**Descartado: partirlas entre `40-fronteras` y `10-openspec`.** La cuarta —congelar
el change contra su insumo— encaja por tema en `10-openspec`, pero partir las cuatro
las vuelve reglas sueltas en vez de una disciplina. Va con las otras, y
`10-openspec` lleva una remisión.

**La remisión va dentro del bloque `openspec-flujo`, no en `openspec-ciclo-de-vida`
como en Rigel.** El flujo es donde aparecen el PO y lo que entrega; el ciclo de vida
habla de specs vivos y deltas. Ninguno de los dos ids tiene hoy un desvío que el
asistente escriba (medido: el asistente escribe desvíos para siete ids y ninguno es
de `10-openspec` salvo `openspec-roles`), así que la ubicación no altera a nadie.

### D3 — `terminado-en-local-y-no-cerrado` en `gobierno-contribucion`, no en `operacion-infra`

En Rigel el requirement vive en `operacion-infra`, adentro de «el arranque llega a un
ambiente». En Projects esa premisa no vale: con plataforma `ninguna` **no hay**
ambiente al que llegar, y D6 dice que eso es legítimo. El estado deja de ser una
fase transitoria de la infraestructura y pasa a ser **cómo se da por terminado un
trabajo**, que es gobernanza del trabajo y la gatea el PO.

**Descartado: `operacion-infra`.** Lo toca el lote 12 (`infra-exigible`) con otro
enunciado; ponerlo ahí mezclaría dos changes sobre el mismo requirement.

La redacción es la corregida de Rigel (`c736b37`): lo abierto es el **bloque**, no
sus tareas. La primera redacción decía «`[~]` en vez de `[x]`», y el primer caso real
—92 tareas hechas de verdad y 14 bloques sin casilla— la desmintió. A eso Projects le
agrega lo propio: con plataforma `ninguna` el estado **no vence**.

### D4 — El enlace es del cuerpo, con los ids intactos

Cambian dos frases y ningún `projects:regla id=`. Un id nuevo caducaría por
`desvio-muerto` cualquier desvío que lo nombre, y ese rojo aparece en el pipeline de
un consumidor que no hizo nada.

A la skill de archive se le suma, además de lo que portó Rigel, el segundo `Closes`
**en el ejemplo del comando**: Rigel cambió el texto («el PR final lleva DOS») y dejó
el `gh pr create` con uno solo, que es lo que se copia.

### D5 — El presupuesto sube a 738, y la subida queda escrita en el manifiesto

**Cómo se mide**, que el manifiesto no decía: `leerCanonico()` arma un cuerpo
pegando las secciones con una línea en blanco entre cada par, así que cobra la suma
de los archivos más (secciones − 1). Con diez secciones, nueve líneas más que
`wc -l`.

**La subida**: 696 → 733 usadas (+37: 23 de las cuatro reglas, 10 de
`terminado-en-local`, 4 de la remisión; el enlace y los residuos entraron con cero).
El tope queda en 738: **cinco de colchón**, que sirven para reajustar un párrafo y
**no** alcanzan para una regla nueva (comentario de id, cuerpo y blancos). Agregar
una regla vuelve a ser una decisión con su número.

**Descartado: la reserva de 30 líneas de Rigel** (`a3e00a6`, para
`05-base-tecnologica`). La decisión D4/D5 del PO no porta esa sección, y una reserva
sin un change que la reclame es margen libre con otro nombre.

**Descartado: recortar `10-openspec` para no subir.** Es el único candidato real
—sus cuatro reglas más largas suman 52 líneas con texto, buena parte explicación— y
la nota lo deja medido. Pero recortar reglas vigentes para hacerle lugar a otras
cambia lo que dicen, y eso es otro change con su propia revisión.

**Descartado: sacar alguna regla.** Los ids son estables; un desvío que nombra un id
borrado es `desvio-muerto`.

### D6 — Los residuos se reescriben, no se reemplazan

Fue un reemplazo mecánico lo que dejó «la skill `la organización-design`», así que el
arreglo no es otra sustitución de palabra: es reescribir la frase para que diga lo
que es cierto en cualquier proyecto («el sistema de diseño de la organización»,
«un consumidor», «los símbolos de la marca»). Ninguna de las tres reglas cambia lo
que exige, y ningún id cambia. Esto **restituye** un requirement que ya está vivo
—`documentacion-del-marco`, «Un artefacto que la constitución canónica cite como
fuente de una respuesta SHALL existir en el andamio»: el canónico citaba una skill
que no existe—, así que no lleva delta propio.

## Qué hace cumplir el cambio solo

| Propiedad | Compuerta | Vista en rojo |
|---|---|---|
| Las cuatro reglas están, con ids distintos, y la del PO usa `{{PO}}` | `inventario-canonico.test.mjs`, «las reglas de cómo se trabaja llegan a cada repo…» | Sí: sobre el árbol anterior nombra los cuatro ids faltantes; y cada mutación de «…muerde» da su rojo |
| `terminado-en-local-y-no-cerrado` existe, va inmediatamente después de `definicion-de-done`, y dice `[~]`, `ninguna` y BLOQUE | el mismo banco | Sí: renombrar su id da rojo |
| Ninguna de las dos reglas del enlace dice «cierra el issue macro», y las dos dicen «desde que se crea» | el mismo banco | Sí: sobre el árbol anterior da dos rojos; reescribir `80-github` con la frase vieja da rojo |
| El presupuesto declara `presupuesto_nota`, que nombra `leerCanonico()`, advierte `wc -l` y nombra el tope vigente | `presupuesto-del-canonico.test.mjs` | Sí: sobre el manifiesto anterior, «no trae `presupuesto_nota`»; subir el número sin la nota da rojo |
| La aritmética de la nota es la del check, y el canónico cabe en el tope | el mismo banco (y `leerCanonico()`, que ya fallaba al pasarse) | La aritmética se verifica sobre el árbol real en cada corrida |
| Nada de lo que viaja lleva residuos del renombrado | `residuos-del-renombrado.test.mjs` | Sí: sobre el árbol anterior, cinco líneas (cuatro de `90-marca.md` y `eslint.config.mjs:187`) |

**Lo que ningún check hace cumplir, dicho como deuda:**

- **La conducta de las reglas de revisión con meta.** Una revisión declara su meta en
  la sesión, y eso no deja archivo. Lo que se verifica es que la regla **llegue** a
  cada sesión. La mitad cableable —que cada pendiente de un change declare qué
  bloquea— es el lote 19.
- **Que un change no se archive contando como hechos bloques sin desplegar.** Ni la
  skill de archive ni el guardrail de deltas miran `[~]`. Queda escrito en la regla y
  en la guía; no hay compuerta.
- **Que el PR final lleve de verdad los dos `Closes`.** El texto lo dice y la skill lo
  pide verificar; la compuerta sobre el cuerpo del PR es el lote 16.
- **Las formas de residuo que no están en la lista.** El banco declara su límite: una
  lista cerrada de formas.

## Dependencias con otros lotes

- **Lote 5 (otro carril)**: arregla el `constitucion-al-dia` que sale vacío en los repos
  nacidos hasta la 1.9.6. Hasta que entre, el rojo del PR de bump sólo se arregla
  corriendo el modo `escribir` a mano: el artifact que el mensaje ofrece llega vacío.
  Toca también las dos copias de la skill de archive, en otra zona (la tabla de
  trampas y el paso 1).
- **Lote 3 (este carril, hecho)**: abrió la 1.10.0 que este change reusa.
- **Lote 16**: la compuerta del enlace, que esta redacción habilita.
- **Lote 19**: el check de pendientes, la mitad cableable de revisión con meta.
- **Lote 34**: la marca opt-in (D7), que decide qué queda de `90-marca.md`.
