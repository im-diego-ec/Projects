---
artefacto: tasks
dri: Builder 1
aprueba: revision adversarial (desvio del marco: un solo mantenedor, ver AGENTS.md)
estado: en-ejecucion
---

# ventana-vencida — Tasks

Un solo bloque: el cambio es chico y no se puede partir sin dejar el árbol en un estado
donde la política dice una cosa y el manifiesto otra.

> **Nota del 2026-09-17.** El bloque 1 estaba hecho desde la 1.6.0 y marcaba 0 de 7:
> nadie volvió a este archivo. Se verificó casilla por casilla **contra el árbol de
> Projects**, no contra el de Rigel ni de memoria, y la evidencia de cada una es la de
> hoy. Al verificarlo apareció el bloque 2, que no estaba escrito: nueve textos seguían
> prometiendo la ventana. Ver la auditoría al final.

## 1. Retirar la política

- [x] 1.1 `actions/constitucion/constitucion.mjs`: se va la constante
      `DIAS_DE_GRACIA_MINIMOS` y la rama de validación que exigía 28 días o
      `"urgente": true`. Se va también el hallazgo `version-urgente`, que era el aviso de
      una puerta de atrás a una puerta que ya no existe.
      Se QUEDA `hallazgoPorFecha` con sus dos ramas (D1): el estreno con aviso sigue siendo
      posible, deja de ser el default.
      Evidencia: `exigible_desde` igual a `publicada` deja de ser un problema de
      validación, y sigue siéndolo un `exigible_desde` ausente o mal formado.
      **Hecho, verificado el 2026-09-17:** `grep -c DIAS_DE_GRACIA_MINIMOS
      actions/constitucion/constitucion.mjs` → `0`; `version-urgente` no aparece en el
      código (solo en la prueba que exige su ausencia, `constitucion.test.mjs:725`).
      `hallazgoPorFecha` sigue en `constitucion.mjs:1320`; lo que sigue siendo inválido
      es la fecha ausente (`:350`) y la anterior a la publicación (`:358`).
      *La mitad «el estreno con aviso sigue siendo posible» quedó superada por D7: el
      mecanismo sigue en el código, pero ninguna versión publicada puede usarlo.*
- [x] 1.2 `canonico/manifiesto.json`: las tres entradas con `exigible_desde` =
      `publicada` (D2). `publicada` no se toca.
      Evidencia: la corrida de la action sobre el consumidor simulado pasa de **aviso con
      fecha 2026-09-19** a **rojo**, con el mismo arreglo escrito.
      **Hecho:** `node -e` sobre el manifiesto → `1.3.0:true 1.4.2:true 1.6.0:true
      1.7.0:true 1.10.0:true` (cinco de cinco, contando la que agrega el bloque 2).
      Corrida medida hoy sobre un consumidor de juguete con el artefacto en 1.7.0,
      contra el árbol: `exit=1`, dos `::error::` «declara la version 1.7.0 y el marco
      publica la 1.10.0: le faltan reglas. Es exigible desde 2026-09-17, asi que ya es un
      fallo».
- [x] 1.3 La descripción del output `exigible_desde` en `action.yml`, que hoy describe la
      política vieja («fecha desde la cual esa version deja de ser aviso»). El output NO se
      quita (D4). Y el bloque de cabecera de `action.yml` que promete «::warning:: hasta el
      exigible_desde… ::error:: desde esa fecha» pasa a describir el default nuevo.
      Evidencia: ningún consumidor tocado — medido: no lo lee nadie, y sigue existiendo.
      **Hecho a medias hasta hoy, igual que en Rigel:** la cabecera ya decía `::error::
      desde el dia que la version se publica`, pero `action.yml:66` seguía diciendo en
      presente «La ventana de gracia es para reglas nuevas, no para ediciones a mano», y
      la descripción del output ofrecía «un estreno con aviso». Corregido en la 2.3:
      `action.yml:48-56`, `:66-69` y `:240-245`. El output sigue publicándose
      (`constitucion.mjs:1451`).
- [x] 1.4 Las dos pruebas de la ventana, reescritas (no borradas): la que exigía el piso de
      28 días pasa a exigir que **cero días sea válido**, y la de `urgente` pasa a exigir
      que el campo **ya no cambie nada**. Y se agrega la que faltaba: un `exigible_desde`
      futuro **sigue** dando aviso, que es la mitad que sobrevive y que nadie estaba
      fijando como propiedad deliberada.
      Evidencia: las 381 pruebas de `actions/**/pruebas` en verde, con el conteo antes y
      después.
      **Hecho:** `constitucion.test.mjs:694` («cero dias de gracia es lo NORMAL»), `:713`
      («el campo urgente ya no cambia nada»), `:728` («un artefacto atrasado es ROJO el
      mismo dia»), y el aviso con fecha futura lo fijan `VERSIONES_UNA_EN_VENTANA`
      (`:131`) y las pruebas que la usan. Hoy `actions/**/pruebas` son **421 de 421** en
      verde (eran 381 cuando se escribió esta casilla).
- [x] 1.5 La documentación que la promete: `actions/README.md` (los dos párrafos del
      calendario) y `.claude/skills/projects-release/SKILL.md` (la instrucción de crear la
      entrada con «28 dias minimo, y la puerta `urgente`»). Una política retirada del
      código y viva en la skill del release es la clase de defecto que este repo ya cazó
      cuatro veces: se arregla en un lugar y sobrevive en otro.
      Evidencia: `grep -rn "28 dias\|DIAS_DE_GRACIA\|urgente"` sin resultados fuera de
      pruebas y del CHANGELOG histórico.
      **Hecho, con un resto:** `git grep -n -e "28 dias" -e "28 días" -e DIAS_DE_GRACIA
      -e urgente -- actions .claude/skills/projects-release plantilla ':!*/pruebas/*'` →
      seis líneas, **todas en pasado** («Hubo hasta el 2026-08-22…», `actions/README.md:843`)
      y una ajena (`plantilla/infra/adaptadores.md:125`, «lo menos urgente»). El resto:
      el README y la skill seguían **ofreciendo** el estreno con aviso; ver 2.4.
- [x] 1.6 Entrada en el CHANGELOG **en este mismo PR**, en la sección de la versión que se
      publica, con «Para consumidores» diciendo **en mayúsculas** que el PR de bump de un
      repo atrasado llega rojo y cómo se arregla sin escribir nada.
      **Hecho en la 1.6.0:** `CHANGELOG.md:2599`, «el PR de bump a 1.6.0 llega ROJO».
- [x] 1.7 El delta enuncia la propiedad por primera vez (D5). Evidencia:
      `openspec validate --all --strict` en verde y el guardrail de deltas en cero.
      **Hecho, y corregido hoy** (2.5): `npx --yes --ignore-scripts
      @fission-ai/openspec@1.9.0 validate --all --strict` → `Totals: 29 passed, 0 failed`;
      `node actions/guardrail-deltas/check-openspec-deltas.mjs` → «20 requirement(s)
      comparados en 19 delta(s) activo(s) y 8 delta(s) archivado(s); ningún MODIFIED
      perdería escenarios».

## 2. El cierre: lo que seguía prometiendo la ventana (2026-09-17)

- [x] 2.1 **El banco, primero en rojo:**
      `actions/constitucion/pruebas/la-ventana-no-vuelve.test.mjs`, siete pruebas y dos
      reglas (D10). Corrido sobre el árbol sin tocar → `tests 7 / pass 5 / fail 2`: la
      regla de la prosa con **nueve** hallazgos (`20-marco-version.md:50`,
      `action.yml:66`, `constitucion.mjs:40`, `:44`, `:51`, `:1416`,
      `actions/README.md:851`, `SKILL.md:201`, `actualizar-marco.yml:39`) y la regla
      positiva del canónico («no dice que un artefacto atrasado es rojo»). La regla del
      manifiesto se mordió aparte, mutando el árbol: `exigible_desde` de la 1.7.0 a
      2026-09-28 → `not ok 2` con «1.7.0: publicada 2026-08-31, exigible_desde
      2026-09-28»; restaurado.
- [x] 2.2 **El canónico dice rojo, y gana su versión** (D8):
      `20-marco-version.md:50` «Un artefacto atrasado es **rojo** desde el PR de bump que
      lo deja atrás»; `manifiesto.json:61` entrada `1.10.0` (número tentativo, lo corrige
      el release), fechas iguales, huella `006fa20b…9939`. `leerCanonico()` → `1.10.0 696
      [] 90c41b5865e9`: 696 de 700 líneas, cero problemas.
- [x] 2.3 **La action deja de prometerla**, sin tocar comportamiento:
      `action.yml:48-56`, `:66-69`, `:240-245`; `constitucion.mjs` cabecera (`:39-52`),
      la nota de «hoy» (`:86`), el bloque de la ventana (`:111-129`), `validarManifiesto`
      (`:309-330`), `verificar` (`:965-977`), la rama sin valores (`:1043-1045`),
      `hallazgoPorFecha` (`:1313-1319`) y la asimetría de `main` (`:1417-1423`);
      `cableado.mjs:684` («el artefacto vence por FECHA»). `node --check` de los dos en
      verde.
- [x] 2.4 **La documentación deja de ofrecer el estreno con aviso:**
      `actions/README.md:851-859` («La versión exigible es la publicada, sin excepción»),
      `.claude/skills/projects-release/SKILL.md:196-208` (las dos fechas son SIEMPRE la
      misma, y qué banco lo exige), `plantilla/.github/workflows/actualizar-marco.yml:39`
      (el comentario que decía «hasta que el check pase de aviso a rojo»), y los dos
      comentarios de prueba que lo describían (`constitucion.test.mjs:682-691` y
      `:953-956`).
- [x] 2.5 **Los deltas dicen una sola fecha** (D7): el de este change pierde la excepción
      opt-in y el escenario «Quien publica quiere estrenar un endurecimiento con aviso», y
      gana «Una versión del canónico declara una fecha de exigibilidad distinta de su
      publicación» y «La porción del marco vuelve a prometer un aviso previo». El de
      `reglas-al-dia` (`gobierno-contribucion`) pierde su «única excepción»: esa
      corrección la aprueba el PO, y quedó anotada en su tarea 7.4. Los dos siguen siendo
      ADDED: títulos verificados a mano, ninguno existe en `openspec/specs/` y ninguno se
      repite entre deltas (`git grep` de cada título → una sola aparición, la del delta).
- [x] 2.6 **CHANGELOG en fragmento**, no en `CHANGELOG.md` (el porte integra los
      fragmentos): `.porte/changelog/03-ventana-vencida.md`, con «Para consumidores»
      diciendo que el PR de bump llega ROJO y cómo se arregla.
- [x] 2.7 **Verificación completa:** `find actions pruebas -name '*.test.mjs' -print0 |
      xargs -0 node --test` → `tests 1470 / pass 1470 / fail 0` (1463 antes + 7 del
      banco nuevo); con el banco nuevo y el árbol sin arreglar, `actions/**/pruebas` daba
      `421 / 419 / 2`. `openspec validate --all --strict` → 29 de 29.
- [ ] 2.8 **Revisión adversarial registrada** en `revision-adversarial.md`, con al menos
      dos lentes y un veredicto. **Abierta:** el desvío del marco la exige antes del
      archive, y la hace alguien que no escribió esto.
- [ ] 2.9 **Archivar** con la skill `projects-archive-change`. **Abierta:** espera 2.8, y
      no la hace este lote (el archive del porte va en una pasada final). El delta es un
      ADDED en `calidad-codigo`: al fundirlo, revisar que el `## Purpose` de la capability
      nombre la constitución (Rigel lo encontró corto tres archives seguidos).

## 3. La revisión adversarial del carril (2026-09-18)

- [x] 3.1 **La fecha única tampoco puede ser futura** (FO-S1, D12). Refutación escrita
      primero: `la-ventana-no-vuelve.test.mjs` → `tests 8 / pass 7 / fail 1`, la
      nueva en rojo. Con la regla: `tests 10 / pass 10`. Mordida sobre el árbol:
      la 1.10.0 del manifiesto a `2026-12-01` en las dos fechas → la regla de la
      fecha única sigue verde y la nueva da `not ok` con «1.10.0: publicada
      2026-12-01, exigible_desde 2026-12-01»; restaurado. Contrapeso en la misma
      refutación: la entrada tentativa del 2026-09-17 y un release del mismo día no
      se cazan. La igualdad contra el CHANGELOG se descartó con la medición de la
      1.7.0 (D12). Dicen «o una fecha que todavía no llegó» el bloque de la
      ventana en `constitucion.mjs`, la cabecera y el output de `action.yml`, la
      skill del release y el delta (un escenario nuevo).
- [x] 3.2 **El proyecto nace con la constitución de su pin** (RV-L3L11-01, D13). Banco
      nuevo, `pruebas/init/la-constitucion-nace-con-el-pin.test.mjs`, escrito
      primero: `tests 4 / pass 2 / fail 2` («actual: 'render del-arbol', expected:
      'render del-tag'» y el aviso ausente). Con `accionDeConstitucion` en
      `herramientas/projects-init.mjs`: `tests 4 / pass 4`. Reproducción de punta a
      punta con la herramienta real sobre este árbol, verificada con
      `git archive v1.9.6 actions/constitucion`: antes `exit=1` y dos `::error::`;
      después «render … con la action de v1.9.6», `exit=0` y cero `::error::`. El
      delta gana el escenario «Un repositorio se crea desde un clon del marco que va
      adelante de su release». La auditoría de argumentos de
      `pruebas/init/projects-init.test.mjs` («la unica entrada que puede llegar a un
      shell es el pin») cambió su residuo declarado `path.join(raizMarco)` por
      `accion.script`, con su motivo: la invocación sigue sin shell.
- [ ] 3.3 **El camino ZIP sigue naciendo rojo mientras el canónico del árbol vaya
      adelante del pin** (el resto de RV-L3L11-01): sin tags no hay action del pin
      que usar, y la herramienta solo puede avisarlo. **Motivo:** cerrarlo es decidir
      que ningún cambio del canónico llega a `main` antes de su release —un banco que
      exija que la última versión de `manifiesto.json` no supere el pin de
      `plantilla/.github/workflows/ci.yml`—, y ese banco estaría rojo en todo el
      porte hasta que el lote 38 mueva los pines. Lo decide el PO junto con cómo se
      integra el porte a `main`; mientras tanto, los fragmentos 03 y 11 lo avisan.
- [x] 3.4 **Las citas por línea de este archivo**, rehechas contra el árbol final
      (RV-L4-01): la 2.2 citaba `manifiesto.json:60` para la 1.10.0, que está en
      `:61`. Ver la tabla de abajo.

## Fuera de alcance, declarado

- La ventana de la **cobertura** (`calidad-codigo` 265-275, cierre 2026-09-30) no se toca:
  otro mecanismo, otra decisión (D6). Es del change `la-ventana-se-cierra`.
- El artefacto del consumidor **no se regenera acá**: eso pasa en su PR de
  bump.
- **Quitar el output, el campo y la rama** `exigible_desde`: breaking, va con la línea v2
  (D7).
- **El arreglo que imprime el rojo** («el PR semanal de actualizacion lo hace solo») y el
  artefacto `constitucion-al-dia` vacío: D11, change
  `el-marco-deja-de-afirmar-lo-que-no-hace`.

---

## Auditoría de cierre (2026-09-17)

Las siete casillas del bloque 1 estaban **sin tildar y el trabajo hecho**. Verificadas una
por una contra el árbol de Projects:

| | verificado con | resultado |
|---|---|---|
| 1.1 | `grep -c DIAS_DE_GRACIA_MINIMOS constitucion.mjs` | **0**; `hallazgoPorFecha` en `:1320` |
| 1.2 | las entradas del manifiesto | `exigible_desde` == `publicada` en **5 de 5** |
| 1.3 | `action.yml` | ⚠️ **quedaba un resto en presente** (`:66`) y la descripción del output ofrecía el estreno con aviso — corregidos en 2.3 |
| 1.4 | las pruebas de la ventana | **reescritas, no borradas** (`constitucion.test.mjs:694`, `:713`, `:728`) |
| 1.5 | `actions/README.md:843` y la skill | en pasado, pero los dos seguían **ofreciendo** el estreno con aviso — corregidos en 2.4 |
| 1.6 | `CHANGELOG.md:2599` | la entrada existe, en la 1.6.0 |
| 1.7 | `specs/` + validate | el delta enuncia la propiedad; corregido en 2.5 |

**Lo que la auditoría encontró y el plan no traía.** El plan nombraba dos textos (la
frase de `action.yml` y la regla del canónico); el banco encontró nueve, y la lectura
completa de la action encontró siete comentarios más que ninguna de sus redacciones
cazaba (`constitucion.mjs:86`, `:307`, `:972`, `:1041`, `:1312`; `cableado.mjs:684`;
`action.yml:236`). Es la misma clase que Rigel dejó escrita al archivar su copia de este
change: *contar menciones no distingue la nota histórica del texto que sigue
prometiendo*. Por eso el banco caza redacciones y no menciones, y por eso declara su
límite (D10).
