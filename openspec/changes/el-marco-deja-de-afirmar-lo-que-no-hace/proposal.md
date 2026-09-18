---
artefacto: proposal
dri: Builder 1
aprueba: revision adversarial (desvio del marco: un solo mantenedor, ver AGENTS.md)
informado: PO / Builder 2
estado: en-ejecucion
---

# El marco deja de afirmar lo que no hace

## Por qué

Nueve defectos vivos con la misma forma: **una superficie del marco afirma algo que
el marco no hace**, y el consumidor que le cree actúa mal. Ninguno se resuelve con
más prosa; cada uno queda atado a un check que se pone rojo solo. Líneas medidas
sobre `0c535e1`, el commit sobre el que arranca este change.

1. **La salida de emergencia del bump no existía.** El job `constitucion` del
   `ci.yml` del andamio sube el artifact `constitucion-al-dia` en toda corrida: es
   lo que el ADR 005 manda a bajar y commitear sobre el PR de Dependabot cuando
   nace rojo por el artefacto viejo. Pero `upload-artifact` excluye los archivos
   ocultos desde su v4.4, y todo lo que `actions/constitucion` deja ahí cuelga de
   `.projects/` o `.cursor/` (`constitucion.mjs:1580-1587`). Con
   `if-no-files-found: warn` (`plantilla/.github/workflows/ci.yml:127`), el
   artifact salía vacío con un aviso que nadie lee. **Origen:** Rigel 1.9.0,
   commit `06a9c94`, medido el 2026-08-28 en su consumidor de referencia, la
   primera vez que el canónico cambió después de existir el paso.

2. **La action de cobertura manda a agregar una opción que vitest ya no lee.**
   Siete mensajes de `actions/cobertura-diff/medir-cobertura-diff.mjs` (`:1088`,
   `:1092`, `:1234`, `:1269`, `:1354`, `:1362`, `:1863`), la cabecera de su
   `action.yml` (`:28-32`, que además cita un `vitest.config.base.ts` que no
   existe: es `.mjs`) y cuatro pasajes de `actions/README.md` le dictan al
   consumidor `all: true`. vitest 3 retiró `coverage.all` y la mayor 5 la ignora
   sin aviso; el andamio ya lo midió en 4.1.11 (`plantilla/vitest.config.base.mjs:89-98`).
   El scaffold y la action se contradicen, y el rojo manda a una línea inerte.
   **Origen:** Rigel 2.6.0, commit `fabe1e6`, 2026-09-13.

3. **Un check del marco da verde leyendo un comentario.** El paso «El andamio
   reparte el umbral del total del marco» de `marco-ci.yml` exige que
   `plantilla/vitest.config.base.mjs` contenga la cadena `all: true` con un
   `grep -qF` sobre el archivo entero. Esa cadena hoy aparece solo en el comentario
   que explica que la opción ya no existe. Medido: con la línea del `include:`
   comentada —lo que de verdad sostiene el total— el paso sale verde; con los
   comentarios borrados y la configuración intacta, sale rojo. Rigel tiene el mismo
   hueco y no lo cerró.

4. **Un script de CI sale rojo por cobertura sin prueba posible que lo apague.**
   `medir-cobertura-diff.mjs:1754-1774` decide «fuente» por extensión, así que un
   `.github/scripts/*.mjs` sin datos de cobertura es rojo, mientras el censo de
   fuentes del mismo pipeline lo da verde. **Origen:** Rigel 1.11.0, commits
   `7f780be` y `ff79b34` (2026-08-31, en un consumidor real). El primer arreglo de
   allá —eximir «lo que ningún paquete reclama»— quedó inerte porque los
   consumidores tienen `package.json` en la raíz; lo cazó la validación contra el
   consumidor real, no el banco.

5. **La prosa del piso de permisos describe el modo de falla equivocado.**
   `marco-ci.yml:56-59`, `plantilla/.github/workflows/ci.yml:26-29` y `:58-59`, y
   el `ci.yml` del marco (`:31-34`, `:55-57`) dicen que sin `pull-requests: read`
   la detección del carril cae al fail-open. El reusable **declara** ese permiso
   (en su encabezado desde el primer commit, y en el job `cambios`), y cuando un
   reusable declara un alcance que su llamador no concede, GitHub rechaza la corrida
   entera: `startup_failure`, cero jobs, cero checks. **Origen:** Rigel 2.0.0,
   change `2026-09-05-contrato-del-token`, commits `9ab7b24` y `b18889b`: la
   corrida 33971175258 lo midió con el alcance declarado en el encabezado del
   reusable y llamado por ruta local, y ocho repositorios con `uses:` remoto ya lo
   confirmaban. El change `el-piso-del-reusable-se-mide` dejó esta frase marcada
   como no verificada y le dio este destino. Un consumidor que recorte el permiso
   siguiendo la prosa no pierde el carril rápido: se queda sin checks.

6. **`actions/README.md` le dice al consumidor que `@v1` es el canal.** Su sección
   Versionado (`:30-36`) describía a `@v1` como un puntero que avanza con cada
   versión compatible, `:4` decía que un arreglo llega a todos sin PR, y `:416` y
   `:679` razonaban en presente sobre el tag móvil. El mismo hecho vencido estaba en
   el encabezado de `marco-ci.yml` (`:42-43`), en el del `ci.yml` del andamio
   (`:7-8`) y en la skill de archivado del andamio (`:99`). Es falso desde el
   2026-08-21 y es la superficie donde un consumidor decide cómo pinar.
   **Origen:** Rigel 2.4.0, commit `3ce8fde` (allá, la octava copia vencida del
   mismo hecho).

7. **La constitución manda a revisar a mano lo que el CI caza, y calla el hueco
   real.** `AGENTS.md:82-85` y la skill `projects-archive-change`
   (`.claude/…/SKILL.md:141-144` y `:402`, y su copia del andamio) dicen que el
   guardrail de deltas no avisa un `MODIFIED` cuyo título no existe en el spec
   vivo. `check-openspec-deltas.mjs:151-171` lo reporta como huérfano y sale 1.
   El hueco que sí existe es el simétrico: medido el 2026-09-17 sobre un árbol de
   juguete, un `ADDED` cuyo título ya existe en el spec vivo pasa el guardrail
   **y** `openspec validate --all --strict` 1.9.0 en verde; lo frena recién
   `aplicar-deltas.mjs` al archivar. **Origen:** Rigel 2.3.0 (commit `dc1f2c6`) y
   2.4.0 (commit `8966753`, issue #408).

8. **Un PR que solo toca el workflow de despliegue saltea el build sin avisar.**
   El default de `rutas_carril_docs` (`marco-ci.yml:237-243`) incluye
   `^\.github/` entero. **Origen:** Rigel 1.9.0, change
   `2026-08-29-carril-no-exime-al-pipeline`, medido el 2026-08-28: 9 PRs mergeados
   con el build salteado en sus dos consumidores, 3 tocando el workflow de
   despliegue, verdes en 3-5 segundos. `AGENTS.md`, en «Siempre», exige que todo
   fail-open sea ruidoso; este era mudo.

9. **El logger del andamio promete un filtro que nadie corre, con el mecanismo que
   el spec prohíbe.** `plantilla/api/src/lib/log.ts:10-13` dice que «el filtro»
   busca una subcadena de nivel. Ninguna pieza del marco lee ese campo (la
   verificación posterior al despliegue no existe todavía) y el requirement «La
   verificación post-deploy entiende el formato del log» de `observabilidad` exige
   leer el campo, sin subcadenas. **Origen:** Rigel 2.5.0, change
   `2026-09-11-el-ambiente-se-exige`, commit `3acc5e1`, medido el 2026-09-10.

## Qué cambia

- `plantilla/.github/workflows/ci.yml`: el artifact sube los ocultos y es rojo si
  sale vacío; la prosa del piso dice `startup_failure`; el encabezado deja de decir
  que un arreglo llega sin PR.
- `actions/cobertura-diff`: los siete mensajes y la cabecera nombran
  `coverage.include` (la forma vieja, solo como historia); un archivo fuente bajo
  `.github/` no se mide y la corrida lo nombra en un `::notice::`.
- `marco-ci.yml`: el paso del umbral lee `include:` y las cuatro métricas en líneas
  de código, no en comentarios; el paso que decide el carril gana nombre
  («Detectar el carril de docs», el `id` no cambia) y un `::warning::` cuando el
  carril exime un archivo no-markdown de un subdirectorio de `.github/`; la prosa
  del piso y del encabezado, corregidas.
- `actions/README.md`, `AGENTS.md`, las dos copias de la skill de archivado, el
  `ci.yml` del marco, `log.ts` y su prueba: prosa al día.
- Cinco bancos nuevos y tres ampliados, que fallan solos (detalle en `design.md`), y
  dos entradas menos de deuda en `cobertura-de-los-pasos.test.mjs`.
- Deltas: tres requirements `ADDED` en `calidad-codigo` y uno en `pipeline-entrega`.

## Impacto en los proyectos consumidores

Hay tres consumidores reales, todos en `@v1.9.6`. Nada de esto les llega sin el PR
de bump de Dependabot.

- **Lo referenciado (con la próxima versión):** un archivo fuente bajo `.github/` deja
  de poner rojo `cobertura-diff` —un rojo que pasa a verde, nunca al revés— y aparece
  en un `::notice::`; los mensajes de cobertura cambian de texto; un PR del carril
  rápido que toca un workflow suma un `::warning::`. Ningún check cambia de nombre,
  ningún input ni output cambia, ningún permiso nuevo. El paso del umbral solo actúa
  en el repositorio que distribuye el andamio: en un consumidor sigue omitiéndose con
  su `::notice::`.
- **Lo del scaffold no viaja solo.** Los tres repos nacidos con la 1.9.6 o antes
  tienen el `upload-artifact` con `warn` y sin ocultos: la salida de emergencia del
  bump no les funciona hasta que copien las dos líneas (van en «Para consumidores»
  del CHANGELOG). La prosa corregida del piso de permisos y de `log.ts` es opcional
  para ellos.
- **Nada es incompatible.** Cambiar el default de `rutas_carril_docs` sí lo sería
  —un consumidor pasaría a correr el build en PRs que hoy lo saltean— y por eso no
  entra acá: queda para la línea `v2` (lote 38), y el aviso nuevo le da al
  consumidor el arreglo para adelantarlo en su propio `ci.yml`.

## Clasificación de distribución

Referenciado (`actions/cobertura-diff`, `marco-ci.yml`), scaffold (`ci.yml` del
andamio, `log.ts`, la skill de archivado del andamio), canónico (los deltas) y
documentación/herramienta del marco que no viaja (`AGENTS.md`, `actions/README.md`,
la skill de archivado del marco, los bancos). Nada regenerado. Detalle y motivo por
pieza en `design.md`. Contrato: **patch**.
