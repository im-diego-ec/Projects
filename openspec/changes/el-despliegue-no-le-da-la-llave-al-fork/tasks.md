---
artefacto: tasks
dri: Builder 1
aprueba: revision adversarial (desvio del marco: un solo mantenedor, ver AGENTS.md)
estado: en-ejecucion
---

# Tasks — el-despliegue-no-le-da-la-llave-al-fork

Líneas medidas sobre el árbol de este change. Las de `desplegar.yml` anteriores
al change se citan en el proposal contra `fde8f4e`.

## 1. El banco primero, con el rojo a la vista

- [x] 1.1 Evaluador de condiciones de GitHub Actions, con la semántica de GitHub
      (cadenas sin distinguir mayúsculas, coerción a número, `||`/`&&` que
      devuelven operandos) y que **lanza** ante lo que no entiende.
      Evidencia: `pruebas/andamio/expresiones.mjs`; caso «el evaluador entiende la
      semantica de GitHub, no la de JavaScript» (`la-llave-del-despliegue.test.mjs:253`).
- [x] 1.2 Banco que evalúa la condición de cada job contra doce eventos simulados
      (push propio en verde y en rojo, PR desde fork con rama `main` y `Main`, PR
      propio desde rama de trabajo y desde `main`, push a otra rama, push con
      commit ajeno, cuatro disparos a mano) y exige la lista exacta de jobs que
      corren, más la propiedad sin tabla: con el evento del fork no corre ningún
      job que lea un secreto.
      Evidencia: `pruebas/andamio/la-llave-del-despliegue.test.mjs:278`.
- [x] 1.3 **Rojo demostrado contra el árbol sin arreglar**, antes de tocar el
      workflow: `node --test pruebas/andamio/la-llave-del-despliegue.test.mjs` →
      `tests 14 · pass 4 · fail 10`, con
      `pull request desde un FORK cuya rama se llama main, con el CI en verde: corren [dev] y tienen que correr []`
      y `con un PR desde un fork corren jobs que ven secretos: dev`.
- [x] 1.4 Rojo demostrado también contra las condiciones **reales** que tenían el
      defecto —la de la 1.9.6 y la del job `dev` anterior—, corriendo la misma
      función que la regla. Evidencia: caso «ROJO: la condicion de la 1.9.6 y la
      del job dev anterior dejan pasar al fork» (`:408`), en verde.
- [x] 1.5 Una mutación por cláusula (`conclusion`, `event == 'push'`,
      `head_branch`, `head_repository`, `github.ref` en `dev` y en `produccion`, la
      condición de `guardas`), cada una poniendo rojo su caso. Evidencia: `:429`.

## 2. El workflow (`plantilla/.github/workflows/desplegar.yml`)

- [x] 2.1 La condición de `dev` exige `event == 'push'`, `head_branch == 'main'` y
      `head_repository.full_name == github.repository` bajo `workflow_run`, y
      `github.ref == 'refs/heads/main'` a mano. Evidencia: `desplegar.yml:205-213`.
- [x] 2.2 `produccion` exige el disparo desde `main`. Evidencia: `desplegar.yml:493`.
- [x] 2.3 Job `guardas` (`desplegar.yml:137`), `permissions: {}`, sin environment,
      que no corre con el evento de un fork: rechazo en rojo del disparo desde
      otra rama (`:155`) y aviso en amarillo de la credencial de repositorio
      (`:175`). Evidencia: casos `:290` y `:310`, que **corren** los dos pasos.
- [x] 2.4 `dev` declara `environment: dev` (`desplegar.yml:221-223`). Evidencia:
      caso «todo job que trae el arbol y ve la credencial declara su environment» (`:332`).
- [x] 2.5 Un solo commit por corrida: paso `version` (`desplegar.yml:237`), y el
      `ci-ok`, el checkout, la etiqueta (`:371`) y el resumen (`:442`) lo leen de
      ahí. Evidencia: caso `:355`, que evalúa la derivación bajo `workflow_run` y
      a mano; mutación `:462`.
- [x] 2.6 La versión que se promueve tiene que ser un commit completo de la
      historia de `main`, antes de traer nada y también con `sin_pasar_por_dev`
      (`desplegar.yml:563` y `:572`). Evidencia:
      `pruebas/andamio/la-compuerta-de-prod.test.mjs:266`, `:280`, `:297`, y el
      rojo demostrado sacando el bloque (`:308`).
- [x] 2.7 `persist-credentials: false` en los dos checkouts (`desplegar.yml:296`,
      `:645`). Evidencia: caso `:347` y su mutación `:457`.
- [x] 2.8 El filtro `branches: [main]` queda, con el comentario de que no es una
      guarda (`desplegar.yml:62`); el banco afirma que deja pasar al fork (`:269`).
- [x] 2.9 Permisos auditados acción por acción: `guardas` no llama a nada del
      token; la consulta `compare` de `produccion` usa `contents: read`, que el
      job ya tenía; `dev` no suma permisos. `pruebas/andamio/permisos-por-job.test.mjs`
      en verde.
- [x] 2.10 El YAML parsea (verificación local con PyYAML sobre el archivo con
      `{{PAQUETE_SITIO}}` sustituido; no se agregó ninguna dependencia al repo):
      tres jobs, `guardas` con `permissions: {}`, `dev` con `environment: dev`,
      los dos checkouts con `persist-credentials: False`.
- [x] 2.11 Sin acentos en los comentarios del workflow:
      `pruebas/marco-ci/acentos-en-los-yml.test.mjs` en verde.

## 3. La guía

- [x] 3.1 `plantilla/sitio/README.md` paso 4 (`:96`): dos environments limitados a
      `main`, los dos secretos en cada uno, por qué, y la excepción del repositorio
      privado en el plan gratuito (`:122`) como único lugar donde se nombra «New
      repository secret». Paso 5 (`:138`): «Use workflow from» → `main`. Tabla de
      errores (`:193`). Sigue siendo el mismo paso 4: la cuenta de actos humanos
      no cambia (`pruebas/docs/actos-humanos.test.mjs` en verde).
- [x] 3.2 `docs/10-publicar.md:112`: el token va en los environments, no en los
      secretos del repositorio, con la excepción y el puntero al CHANGELOG.
      Evidencia: caso «la guia manda la credencial a los environments» (`:373`).
- [x] 3.3 **La guía le atribuía al environment la guarda contra el fork** (hallazgo
      RV-H3 de la revisión adversarial). `docs/10-publicar.md` y el paso 4 de
      `plantilla/sitio/README.md` decían que el environment limitado a `main` solo le
      llega a código que ya pasó por un pull request; bajo `workflow_run` el
      `GITHUB_REF` es siempre `main` (D1), así que eso lo garantiza la condición del
      job, no el environment. Rojo primero: caso nuevo en
      `pruebas/andamio/la-llave-del-despliegue.test.mjs` (las dos frases, y que las dos
      páginas digan «segunda llave» y nombren la condición) → `# tests 15 · # pass 14
      · # fail 1`. Reescritas las dos: el environment es la segunda llave, la condición
      del job es la primera → `15/15`, y `pruebas/docs/` en verde.

## 4. Bancos existentes que el cambio obligó a tocar, y por qué

- [x] 4.1 `pruebas/andamio/desplegar.test.mjs` «se publica el commit que paso el
      CI» (`:255`): exigía `ref: head_sha` literal; ahora exige el commit fijado y
      **evalúa** que ese commit sea `head_sha` bajo `workflow_run`. Vigila lo
      mismo, en los dos eslabones.
- [x] 4.2 `desplegar.test.mjs` «produccion promueve LA ETIQUETA QUE PUSO DEV»
      (`:432`) y su MUERDE (`:482`): comparaban **nombres** de variable
      (`GITHUB_SHA` == `GITHUB_SHA`); ahora comparan **valores** evaluados bajo el
      único evento que promueve, y la refutación muta los dos lados.
- [x] 4.3 `pruebas/andamio/post-despliegue.test.mjs`: el paso ahora recibe `SHA`;
      el banco le pasa `GITHUB_SHA` con **otro** valor y exige que el resumen mande
      a pegar el fijado. Rojo demostrado a mano: con el resumen viejo
      (`$GITHUB_SHA`) el caso da `not ok 1` (`pass 5 · fail 1`); restaurado, 6/6.
- [x] 4.4 `pruebas/andamio/la-compuerta-de-prod.test.mjs`: el `gh` de mentira
      contesta `compare` y anota cada llamada; el caso «se promueve la version
      ELEGIDA» exige además la pregunta a GitHub.
- [x] 4.5 `pruebas/docs/lo-que-se-publica-solo.test.mjs` marcó una oración nueva del
      README («…publica en producción, así que tiene que estar donde solo llega…»)
      como promesa de publicación automática. Es un falso positivo de su
      heurística; se reescribió la oración («únicamente») y el banco no se tocó.
- [x] 4.6 `pruebas/docs/cobertura-de-requirements.test.mjs` «un ancla que se pasa
      del final del archivo»: mutaba la cadena fija `desplegar.test.mjs:35`, que
      se corrió a `:37`. Ahora toma de la página cualquier ancla de banco con
      línea: prueba lo mismo sin atarse a una.

## 5. Contrato y cobertura

- [x] 5.1 Delta de `despliegue-ci`: `ADDED` «Solo el código integrado en la rama
      de integración alcanza una credencial que publica» (cinco escenarios) y
      `MODIFIED` «La rama determina el ambiente de destino».
- [x] 5.2 Verificado **a mano**, por el hueco conocido del guardrail: el título
      del `MODIFIED` existe en `openspec/specs/despliegue-ci/spec.md:17`; el del
      `ADDED` no existe en ningún spec vivo (`grep -rn` sin resultados); el
      `MODIFIED` reproduce el texto vigente y **los tres** escenarios vigentes
      —`diff` contra el spec vivo: solo el párrafo agregado, la condición sumada
      al `WHEN` de «Disparo manual sobre una rama de trabajo» y el escenario
      nuevo—.
- [x] 5.3 `npx --yes --ignore-scripts @fission-ai/openspec@1.9.0 validate --all --strict`
      → `Totals: 33 passed, 0 failed (33 items)`.
- [x] 5.4 `openspec/cobertura-de-requirements.md`: anclas corridas y filas de
      `despliegue-ci` (la rama y el Environment) y de `pipeline-entrega` (el deploy
      gateado) al día; los conteos no cambian —el Environment sigue en
      **ninguno** que se ponga rojo, con el aviso nombrado—.
      `pruebas/docs/cobertura-de-requirements.test.mjs` 13/13.

## 6. CHANGELOG

- [x] 6.1 Fragmento en `.porte/changelog/0a-el-despliegue-no-le-da-la-llave-al-fork.md`
      (`### Seguridad` y `### Corregido`), con el parche manual exacto para los
      repositorios nacidos con `desplegar.yml` de la 1.8.0 a la 1.9.6. El
      `CHANGELOG.md` no se edita en este lote: se integra en la pasada final.
- [x] 6.2 El parche manual **funciona**, medido: aplicado a una copia de
      `git show v1.9.6:plantilla/.github/workflows/desplegar.yml`, el YAML parsea
      (PyYAML) y su condición, evaluada con `pruebas/andamio/expresiones.mjs`, da
      push propio → corre; fork con rama `main` → no; PR propio → no; CI rojo →
      no; a mano desde `main` → corre; a mano desde otra rama → no. La condición
      sin parchear da «corre» en el fork, en el PR propio y a mano desde otra rama.

## 7. Verificación

- [x] 7.1 `find actions pruebas -name '*.test.mjs' -print0 | xargs -0 node --test --test-reporter=tap`
      → `# tests 1469 · # pass 1469 · # fail 0` (antes del change: 1451/1451;
      +14 del banco nuevo, +4 de la compuerta de producción).
- [x] 7.2 `openspec validate --all --strict` → 33 passed, 0 failed.

## 8. Lo que no se pudo hacer acá, con su motivo

- [ ] 8.1 **Probar contra un consumidor real.** Pide un repositorio con
      `desplegar.yml` y credenciales de Cloudflare; el único consumidor que lo
      tiene es `plantilla-sitio`, y esta sesión no escribe en repositorios
      consumidores. Tampoco hay un runner de GitHub en el banco: los campos del
      evento salen del esquema publicado. Va antes de publicar la versión que
      lleve este change, con la skill `projects-validar-consumidor`.
- [ ] 8.2 **Aplicar el parche en `plantilla-sitio`** y revisar si alguna corrida
      de su `desplegar` vino de un fork (rotar el token si la hubo). Acto humano en
      el repositorio consumidor, escrito en el fragmento de CHANGELOG.
- [ ] 8.3 **Revisión adversarial con lentes independientes**, que reemplaza el
      review cruzado por el desvío del mantenedor único. Va en la pasada final del
      porte; se registra acá.
- [ ] 8.4 **Archivar.** Después de 8.3, en la pasada final.
- [ ] 8.5 **Detectar el defecto en los consumidores que ya lo tienen**: un check
      referenciado (en `marco-ci.yml`) que marque un `workflow_run` que lee
      secretos sin mirar el evento ni el repositorio del commit. Pondría en rojo a
      `plantilla-sitio` el día del bump, y por la decisión D1 del PO eso es lo que
      corresponde: el arreglo —el `if:` de su `desplegar.yml`— está dentro de su
      árbol, así que va en un **MINOR, exigible en rojo**, con el parche del
      fragmento 0a en «Para consumidores». No es breaking ni va a la v2: la versión
      anterior de esta tarea lo decía citando la D1 al revés (hallazgo RV-H2 de la
      revisión adversarial; design, «Qué lo hace cumplir solo, y qué no»). Destino:
      un change propio, con su diseño y su ensayo contra `plantilla-sitio`; no entra
      acá porque este change cierra el andamio y ese check es contrato nuevo del
      reusable.
- [ ] 8.6 **Analizadores de terceros para workflows** (zizmor, poutine): este lote
      tiene prohibido agregarlos. Quedan para un change que los evalúe y los pine
      por SHA.
- [ ] 8.7 **Residuo de D6**: en la carrera de un merge que entra entre el fin del
      CI y el arranque del despliegue, la compuerta de producción puede no
      encontrar la corrida de DEV y dar rojo cerrado. No se midió qué `head_sha`
      tiene una corrida disparada por `workflow_run`; si es la punta de `main`, la
      compuerta tendría que buscar por la etiqueta y no por la corrida.
