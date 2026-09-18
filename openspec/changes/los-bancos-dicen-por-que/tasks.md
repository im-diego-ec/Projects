---
artefacto: tasks
dri: Builder 1
aprueba: revision adversarial (desvio del marco: un solo mantenedor, ver AGENTS.md)
estado: en-ejecucion
---

# Tasks — los-bancos-dicen-por-que

Cada bloque va en el mismo orden: primero el caso rojo, medido sin el arreglo, y después el
arreglo. Todas las mediciones son del 2026-09-17, con Node v24.19.0 y el bash 3.2 de macOS,
salvo donde se dice otra cosa.

## 1. La evidencia no se tapa (Rigel c22595c + d71c40c)

- [x] 1.1 `pruebas/porque.mjs`: `porque(motivo, evidencia)` recorta por el final y lo dice.
      Evidencia: `pruebas/porque.mjs:50`. Los casos «`porque` recorta por el FINAL y lo DICE»
      y «acepta algo que no es cadena» están en `pruebas/banco/aserciones-con-evidencia.test.mjs`.
- [x] 1.2 Se porta la herramienta a `pruebas/aserciones-con-evidencia.mjs` y se mide contra
      una verdad independiente: el AST de `acorn` 8.18.0. Se usó la copia del caché de npx,
      solo lectura, desde un script de un solo uso fuera del repo. El script recorre cada
      `CallExpression` `assert.match`/`assert.doesNotMatch` cuyo tercer argumento es un
      `Literal` de cadena o un `TemplateLiteral` sin expresiones, y compara línea por línea
      con `ciegasEn`. **Rojo medido con la herramienta tal cual:** `ast 285 en 60 archivos |
      herramienta 246`. Dieciocho archivos difieren; por ejemplo,
      `actions/constitucion/pruebas/regresiones-auditoria.test.mjs` da
      `ast: [310,311,312,827,828] herramienta: []`.
- [x] 1.3 Arreglo: el blanqueo reconoce los literales de regex y blanquea los escapes
      (`pruebas/aserciones-con-evidencia.mjs:67` y `:148`). Evidencia: la misma medición da
      `ast 285 en 60 archivos | herramienta 285`, sin ningún `DIFIERE`.
- [x] 1.4 Banco de la herramienta: `pruebas/banco/aserciones-con-evidencia.test.mjs`, con
      34 casos: los de Rigel, más el grupo 6 (regex con comillas, divisiones, `return`) y el
      grupo 7 (modo diff). **Rojo contra la herramienta de Rigel**: el mismo banco, con el
      import cambiado a la herramienta de `d71c40c`, da `tests 34, pass 28, fail 6`. Cuatro
      de las seis fallas son los defectos (escape, dos de regex con comillas, coma o
      paréntesis en la regex). Las otras dos solo dicen que el `RAIZ` de esa copia apunta
      fuera del repo. Con la herramienta portada: `34/34`.
- [x] 1.5 El paso de CI: job `aserciones-con-evidencia` (`.github/workflows/ci.yml:1031`),
      paso en `:1051`, diff de tres puntos en `:1070`, cableado a `ci-ok` en `:1089` y
      `:1168`. Permisos auditados acción por acción: `actions/checkout` necesita
      `contents: read`. `actions/setup-node`, `git` y `node` locales no usan el token. Queda
      `contents: read` y nada más.
- [x] 1.6 Banco del paso: `pruebas/ci-del-marco/aserciones-en-el-pr.test.mjs`, con 8 casos:
      rojo con archivo y línea, banco limpio con deuda ajena, banco tocado con deuda vieja,
      PR sin bancos, banco borrado, main que avanza y base inexistente. **MUERDE:** la
      mutación de tres puntos a dos pone rojo el caso de main que avanza (`exit 1` sobre deuda
      ajena). Resultado: `8/8`.
- [x] 1.7 Los bancos que este change toca salen limpios. Comando: `node
      pruebas/aserciones-con-evidencia.mjs <los 7 bancos tocados>`. Salida: `::notice::los 7
      banco(s) que toca este pull request no tapan su evidencia`, `exit 0`. En
      `pruebas/marco-ci/permisos-compuerta.test.mjs` hubo que pagar 4 (las líneas 182, 187,
      265 y 266 de antes). Deuda del árbol después: `281 asercion(es) ... en 59 archivo(s)
      de 112 banco(s)`.

## 2. El veredicto no depende de la máquina (Rigel c38e542)

- [x] 2.1 Rojo primero: `pruebas/marco-ci/util-aisla-la-config.test.mjs` sin el arreglo da
      `pass 1, fail 2`. El caso de comportamiento muere con `fatal: no tag message?`, el
      mismo error de Rigel, forzado con `GIT_CONFIG_GLOBAL` apuntando a una config que firma.
- [x] 2.2 Arreglo: `git config tag.gpgsign false` en `repoDeJuguete`
      (`pruebas/marco-ci/util.mjs:63`). Resultado: `3/3`.
- [x] 2.3 Estado latente, medido con `grep -rn '"tag"' pruebas actions/*/pruebas`: ningún
      banco llama a `git tag`. El único resultado es `pruebas/docs/lectura.mjs:133`, que no es git.

## 3. El instrumento que reproduce intermitencias (Rigel b047c16 + c38e542 + 0448928)

- [x] 3.1 Se verifica el estado final del PR #540 de Rigel, todavía abierto. Comando:
      `git -C rigel log --oneline main..origin/fix/el-instrumento-pierde-su-medicion`.
      Salida: un solo commit, `0448928`. Se portó ese estado.
- [x] 3.2 `.github/workflows/reproducir-intermitente.yml`. Tiene la vuelta cero (`:210`), la
      línea por vuelta con el acumulado (`:238`, `:241`), el presupuesto declarado
      (`TOPE_MINUTOS` en `:207`, igual a `timeout-minutes` en `:75`) y la validación de
      vueltas (`:120`). La forma `banco` corre el grupo de `ci.yml`, y en la forma `banco`
      sin globstar se niega en voz alta (`:150`).
- [x] 3.3 Adaptación a Projects: tres grupos en lugar de un patrón único. No lleva
      `fetch-depth: 0` ni `corepack`, porque el job real de acá no los usa. Reusa
      `actions/upload-artifact@330a01c…` (v5), el mismo SHA que el andamio: no entra ninguna
      action de terceros nueva. Permisos: `contents: read`, porque upload-artifact usa el
      token de runtime.
- [x] 3.4 Banco: `pruebas/banco/reproducir-intermitente.test.mjs`, 13 casos. Cubre verde con
      cota, intermitente con línea por vuelta, base roja sin contar vueltas, presupuesto con
      MUERDE (`TOPE_MINUTOS=-1`), vueltas inválidas (`0`, `abc`, vacío, `-3`, `2.5`), banco
      inexistente o fuera del CI, los tres grupos, y las cuatro copias atadas contra `ci.yml`
      y el propio job. Resultado: `13/13`. **Límite:** en macOS, los grupos que usan globstar
      ejercen la negativa. La selección real se ejerce en el runner de CI.
- [ ] 3.5 Primera corrida real por `workflow_dispatch`. **No se hizo:** exige el workflow en
      la rama por defecto del remoto, y esta sesión no hace push. Va después del merge, con
      el default (`pruebas/marco-ci/distribuidor.test.mjs`, forma `banco`).

## 4. El extractor devuelve el paso pedido (Rigel c12f831)

- [x] 4.1 Rojo primero: `pruebas/marco-ci/extraer.test.mjs` sin el arreglo da `pass 2,
      fail 3`. Falla en los tres bordes: `- id:` con run, `- uses:` seguido de un paso sin
      nombre con run, y el último paso de un job.
- [x] 4.2 Arreglo: el límite es cualquier `- ` a la sangría del paso pedido, más el fin de la
      lista (`pruebas/marco-ci/extraer.mjs:36`, `:59` y `:60`). Resultado: `5/5`. La
      propiedad sobre los workflows reales compara los 41 pasos de nombre único de los cinco
      workflows del marco y no encuentra ninguna diferencia.
- [x] 4.3 Sin regresión en los bancos que usan el extractor. Comando:
      `grep -rln scriptDelPaso pruebas actions/*/pruebas | xargs node --test`, en verde. El
      banco completo de 7.1 también está en verde.

## 5. Continuaciones cortadas (Rigel cffa81f)

- [x] 5.1 Control y MUERDE en `pruebas/marco-ci/sintaxis-de-los-run.test.mjs:211`, `:225` y
      `:248`. Premisa medida: `bash -n` sale 0 sobre la continuación cortada.
- [x] 5.2 Rojo sobre el árbol real, con sabotaje: un comentario después de la línea 572 de
      `marco-ci.yml` (`gh api ... \`). **Solo** el control nuevo sale rojo, y el de sintaxis
      sigue verde. Después se restauró desde una copia, y `git diff --stat` del archivo quedó
      vacío.
- [x] 5.3 Hoy no hay ninguna continuación cortada. El control está en verde sobre 49
      continuaciones reales; su anti-vacuidad exige que vea al menos 5.

## 6. Los dos lectores de `permiso`, atados por comportamiento (Rigel ac55ddc)

- [x] 6.1 Rojo primero: `pruebas/marco-ci/desvio-de-permiso-una-sola-norma.test.mjs` sobre el
      árbol publicado encuentra **4 discrepancias**. En `2026-02-30`, `2026-02-29` y
      `2026-04-31` «la action la ACEPTA y el paso la objeta (exit 0, absorbe=true,
      avisa=true)». Con regla más permiso, «la action la rechaza (desvio-ambiguo) y el paso la
      ACEPTA en silencio».
- [x] 6.2 Arreglo en `marco-ci.yml`. La fecha usa el predicado de `esFecha` (`:3530`). Un
      desvío que nombra una regla avisa con `title=Desvio de permiso ambiguo` (`:3491` y
      `:3494`), y sigue absorbiendo. Resultado: `4/4`, incluido el MUERDE que reintroduce la
      validación de ida y vuelta y la ve fallar el 30 de febrero.
- [x] 6.3 «Se escriben distinto y deciden igual»: el paso usa `[0-9]{4}` y
      `fecha + "T00:00:00Z"`, y la action usa `\d{4}` y un template. La tabla da el mismo
      veredicto en las 20 grafías.
- [x] 6.4 `pruebas/marco-ci/permisos-compuerta.test.mjs`: el ancla de su mutación pasa de
      `fechaReal` a `fechaValida`, porque la variable cambió de nombre al cambiar de
      significado. Se corrige su comentario, que atribuía a `esFecha` una exigencia que no
      tiene. Resultado: `13/13`.

## 7. Verificación

- [x] 7.1 Banco completo. Comando: `find actions pruebas -name '*.test.mjs' -print0 | xargs
      -0 node --test --test-reporter=tap`. Resultado: `# tests 1520`, `# pass 1520`,
      `# fail 0`. Antes del change: 1451/1451.
- [x] 7.2 `npx --yes --ignore-scripts @fission-ai/openspec@1.9.0 validate --all --strict`.
      Salida: `Totals: 33 passed, 0 failed (33 items)`.
- [x] 7.3 A mano, por el hueco conocido del guardrail de deltas: ninguno de los seis títulos
      ADDED existe en `openspec/specs/calidad-codigo/spec.md` ni en otro change activo. No hay
      MODIFIED.
- [ ] 7.4 actionlint y shellcheck sobre `reproducir-intermitente.yml` y el job nuevo de
      `ci.yml`. **No se midió en local:** esta máquina no tiene ninguno de los dos, y bajarlos
      sería una herramienta nueva. Los corre el paso «Definiciones de pipeline validas» del
      job `marco` en el CI de este PR.
- [ ] 7.5 Ensayo contra un consumidor real del cambio al paso de permisos. **No se hizo:**
      esta sesión no escribe en repos consumidores. Va en el release, con la skill
      `projects-validar-consumidor`.
- [x] 7.6 CHANGELOG: el fragmento está en `.porte/changelog/14-los-bancos-dicen-por-que.md`,
      no en `CHANGELOG.md`, por instrucción del porte: se integra al juntar los carriles.

## 8. Pendientes declarados, que NO entran acá

- **Exigir que la fecha de un desvío exista**, en los dos lectores a la vez. Hoy los dos
  aceptan el 30 de febrero. Es un endurecimiento, así que es breaking. **Destino:** línea
  v2 (lote 38).
- **Valores que no son cadena en un desvío.** La action los pasa por `String()` y el paso
  los descarta: `"aprobado_por": 123` vale para una y no para el otro. La tabla es de lo que
  una persona escribe. **Destino:** el change que mueva la lectura de desvíos dentro de la
  action (ver `un-solo-predicado-del-desvio`).
- **La deuda del árbol (281 aserciones en 59 archivos)** se paga por área, cuando alguien
  toque cada banco. **Destino:** ninguno; lo hace cumplir el job nuevo.
- **El job `changelog-en-el-pr` usa un diff de DOS puntos** (`ci.yml:977`). Tiene el mismo
  falso rojo que el D1 del design evita acá: si main cambia una superficie que viaja
  después de abrir el PR, el PR queda obligado a tocar el CHANGELOG sin haberla tocado.
  **Destino:** el lote 8 del porte, que ya toca ese job. No se toca acá para no pisar ese
  carril.
- **`un-solo-predicado-del-desvio` dice que un banco que cruce los dos predicados «hoy no
  se puede»**, porque la validación no estaría exportada. `clasificarDesvios` sí está
  exportada, y el banco de 6.1 lo hace. **Destino:** quien archive ese change (lote 2) lo
  anota al cerrarlo. No se edita desde acá porque es de otro carril.
- **Revisión adversarial** con lentes independientes. **Destino:** la pasada final del
  porte, antes del archive.
