---
artefacto: tasks
dri: Builder 1
aprueba: revision adversarial (desvio del marco: un solo mantenedor, ver AGENTS.md)
estado: en-ejecucion
---

> **La superposición con el spec vivo que esta nota advertía quedó resuelta en el bloque 4.**
> El 2026-08-24 se promovió a `openspec/specs/operacion-infra/spec.md` el requirement «El
> andamio entrega los huecos de decisión de infraestructura con su criterio», y esta nota
> pedía decidir al archivar si el `ADDED` de este change lo reemplazaba o convivía con él.
> Decidido (design, D10): **lo reemplaza**. El `ADDED` se retiró y su contenido se fundió en el
> vivo por `RENAMED` + `MODIFIED`, reproduciendo sus cuatro escenarios. Dos requirements que
> dicen lo mismo con distinta fuerza es la forma en que un contrato empieza a mentir, y además
> decían lo contrario sobre si la verificación falla.

# infra-exigible — Tasks

Cuatro bloques. El 1 es el único que toca el andamio de entrada; el 2 verifica que la guarda
muerda de verdad; el 3 cierra la documentación; el 4 —el cierre del 2026-09-17, lote 12 del
porte de Rigel— reformula el delta para que se pueda archivar y le suma lo que Rigel aprendió
después sobre los mismos pendientes. **Un sub-issue por bloque**, colgado del issue macro, y
un PR por bloque con `Closes #<sub-issue>` desde su creación.

---

## Bloque 1 — Los dos directorios, con lo derivado funcionando y los huecos · **HECHO**

- [x] **1.1** Crear `plantilla/infra/` y `plantilla/infra-prod/` con lo que **se deriva**
      (D3): bloque de backend del state con el bucket por cuenta y la `key` por proyecto,
      referencia al cluster compartido, referencia a la VPC, proveedor y región, prefijo de
      recursos, identidad federada del pipeline, y los dominios. Todo con marcadores de valor
      —los que `projects init` ya sustituye—, ninguno inventado.
      **Evidencia**: `grep -rhoE '\{\{[A-Z0-9_]+\}\}' plantilla/infra plantilla/infra-prod |
      sort -u` y que cada marcador que salga esté en la lista que `projects init --ejemplo`
      imprime. Un marcador que no esté ahí viaja literal al repo nuevo.
      **RESULTADO**: 12 marcadores usados, **los 12 entre los que `projects init` sustituye**.
      Ninguno inventado. Y el design decía «siete valores»: son doce, corregido.

- [x] **1.2** Escribir los **huecos de decisión** con la forma de tres partes —qué
      falta, con qué criterio se decide, qué queda sin garantía—: dimensionamiento y
      autoescalado, certificado y zona DNS, programador de tareas, topología de subredes
      (D4), y alarmas (D5, **solo en `infra-prod/`** por D6).
      **Evidencia**: el paso de marcadores del pipeline corrido sobre un `projects init` de
      prueba **falla**, y su salida los nombra.
      **RESULTADO**: **6 pendientes en dev y 7 en prod** —el séptimo es alarmas, solo ahí por
      D6—. Son cinco decisiones del proyecto más los dos datos del área que encontró la
      implementación (D7). Los marcadores del `main.tf` son punteros a la sección, para que el
      fallo apunte a la línea exacta.

- [x] **1.3** Declarar la asimetría dev↔prod en el `README.md` de cada directorio (D6): dev
      sin alarmas y sin programador **es decisión**, no hueco.
      **Evidencia**: los dos README existen y el de `infra/` dice por qué no tiene el hueco
      de alarmas.

- [x] **1.4** ~~Sumar al `.gitignore`~~ **YA ESTABA HECHO**: del andamio el `state` y los `.tfvars`, que en el
      consumidor medido ya están ignorados y conviene que **nazcan** así.
      el `.gitignore` del andamio ya traía las siete reglas de Terraform —`.terraform`,
      `*.tfstate*` y `*.tfvars` para los dos directorios— para directorios que no existían.
      **Evidencia**: `grep -nE "tfstate|tfvars|terraform" plantilla/.gitignore`.

- [x] **1.5** Ningún archivo `.tf` con recursos reales en este bloque. Es la frontera del
      change y se verifica en vez de confiarse.
      **Evidencia**: `grep -rE '^resource ' plantilla/infra plantilla/infra-prod` sale
      **vacío**. Solo `data`, `terraform`, `provider`, `variable`, `locals` y `output`.
      **RESULTADO**: vacío.

## Bloque 2 — Que la compuerta muerda, y que sea inerte donde debe · **HECHO** (la 2.3 no es ejecutable)

- [x] **2.1** Prueba en `pruebas/andamio/` con el patrón que el banco ya usa: las
      comprobaciones se escriben una vez y se corren **contra el andamio real** (donde tienen
      que pasar salvo los huecos) y **contra copias mutadas** (donde tienen que morder).
      Mutaciones mínimas: hueco borrado sin resolver, hueco sin criterio, el directorio
      entero retirado, y el hueco de alarmas movido a `infra/`.
      **RESULTADO**: `pruebas/andamio/infra-pendientes.test.mjs`, **14 pruebas, 14 en verde**:
      siete propiedades sobre el andamio real y siete mutaciones que muerden. Las siete
      propiedades son estructura, cero recursos, marcadores válidos, las tres partes de cada
      pendiente, alarmas solo en prod, punteros que resuelven, y numeración correlativa.
      **Y la mordida cazó un defecto de la prueba misma**: la mutación de «CÓMO SE DECIDE»
      golpeaba la primera ocurrencia del texto, que está en el encabezado explicativo y fuera
      de toda sección, así que no degradaba ningún pendiente y no mordía. Corregida para mutar
      el cuerpo de la sección, con el motivo escrito al lado.

- [x] **2.2** Verificar que la exigencia es **inerte** para un repositorio que no se
      despliega: Projects mismo no tiene los directorios y su CI no puede empezar a fallar.
      **RESULTADO**: el CI del PR del bloque 1 (#72) en verde. Y leído el log en vez de
      suponerlo: el paso imprime «este repo distribuye un scaffold (plantilla/): los marcadores
      son su materia prima… verificacion omitida». O sea que en Projects **el check no mira**, y
      por eso ese verde acredita la inertness y NO que la compuerta muerda — eso lo acreditan
      el banco de la 2.1 y la verificación contra el consumidor.

- [x] **2.3** **No ejecutable, declarado el 2026-09-17** (design, D15). La casilla va tildada
      porque la decisión está tomada y escrita, no porque el trabajo se haya hecho — la misma
      convención que `reglas-al-dia` usó para su bloque 6.
      La tarea era abrir una rama temporal en un repositorio consumidor, con un PR en borrador,
      para ver morder la compuerta. Decía «sigue siendo obligatoria antes del archive». Deja de
      serlo por tres motivos, y cualquiera alcanza: (1) **su objeto no existe**: lo que tenía que
      morder era la compuerta de pendientes sin resolver, y el bloque 4 la retira del
      requirement; (2) **nada de este change corre en un consumidor**: toca scaffold, un spec
      canónico y un banco del marco, y ningún workflow, action ni `input` cambia; (3) abrir una
      rama en un consumidor desde una sesión de Projects es 🛑 en `AGENTS.md` — la prueba
      contra un consumidor real es de la versión, antes del release
      (`projects-validar-consumidor`), no de este change.
      El `#73` que citaba es un número de la historia de origen de este change, no un issue de
      este repositorio.

## Bloque 3 — Que el que llega mañana lo entienda · **HECHO**

- [x] **3.1** **REFORMULADA por la corrección de D8**, y el motivo importa: los pendientes
      de infraestructura **ya no gatean**, así que sumarlos a la fase 5.1 —que explica por qué
      el primer CI sale rojo— habría sido **falso**. La 5.1 sigue contando tres recuadros y eso
      es correcto.
      Lo que se hizo en su lugar: la fase 3.1 gana los dos directorios en su tabla y una
      subsección propia que dice qué traen, que cada pendiente lleva su criterio, y **que no
      van a poner el CI en rojo** — para que nadie los confunda con la causa del primer rojo.
      **Evidencia, medida**: `projects init` escribe **75 archivos con 156 sustituciones** (eran 69
      y 116), y el total del repo pasa de 87 a **93**. Los tres números están en la guía.

- [x] **3.2** ~~Entrada en `CHANGELOG.md`~~ **CORREGIDA DE LUGAR al implementar el bloque 1.**
      Esta tarea estaba mal puesta acá: el check `changelog-en-el-pr` exige la entrada en el PR
      que **toca `plantilla/`**, o sea en el bloque 1, y la regla del marco dice lo mismo —«se
      escribe en el PR que introduce el cambio, no al cortar la versión». Diferirla al bloque 3
      habría puesto rojo al PR del bloque 1.
      Queda, para el PR de este bloque: **revisar** que la entrada refleje lo que los tres
      bloques dejaron, y agregarle lo que el bloque 2 haya cambiado.
      **Evidencia**: el check `changelog-en-el-pr` en verde en el PR del bloque 1.

- [x] **3.3** Dos filas en `docs/11-reglas-no-escritas.md`, no una — la corrección de D8 agregó
      la segunda:
      · **fila 22**, la compuerta que falta, con la medición que explica por qué no se puede
        poner hoy (3 marcadores → 21, y `ci-ok` inalcanzable el día uno);
      · **fila 23**, que un pendiente lleve un criterio **útil** no lo puede verificar ningún
        check, y por qué la salida no es un check más sino que la revisión ocurra una vez.
      **Evidencia**: las dos filas existen y las dos dicen por qué no se pueden cerrar hoy.

---

## Corrección posterior al bloque 1 · **la compuerta se difiere** (D8)

- [x] Los pendientes pasan del marcador 🕳️ del andamio a un token propio
      (`PENDIENTE-INFRA`) que el paso de marcadores **no** cuenta.
      **Motivo, medido**: con 🕳️ un repositorio nuevo pasaba de **3 marcadores a 21**, y 18
      de ellos son decisiones que nadie puede tomar el primer día. El paso es fallo duro,
      así que arrastraba `ci-ok`: **un repo recién nacido no podía llegar a verde**. Y eso
      violaba el propio requirement de este change, que exige inertness para un repositorio
      que no se despliega.
      **Evidencia**: `grep -rc 🕳️ plantilla/infra plantilla/infra-prod` sale vacío, y la
      octava propiedad del banco lo verifica con su mutación.

- [x] La prosa se corrige donde afirmaba lo que ya no es cierto: los dos `README.md`, los
      encabezados de los dos `pendientes.tf` y el de `infra/main.tf` decían que el pipeline
      se queda rojo. Ahora dicen que **todavía no hay compuerta**, con el motivo y el
      comando de revisión a mano.
      **Evidencia**: `grep -rniE "queda rojo|se queda .rojo" plantilla/infra*` sale vacío.

- [x] **La compuerta ya no bloquea el archive, porque el requirement dejó de pedirla.**
      Esta tarea decía: *«La compuerta queda pendiente para el change del despliegue, y este
      change NO se archiva hasta que exista: su requirement pide compuerta y hoy hay
      disciplina declarada»*. La premisa se disolvió en el bloque 4 (design, D9): la cláusula
      «la verificación SHALL fallar mientras sobreviva un hueco sin resolver» sale del cuerpo,
      del título y del escenario 1. Lo que la reemplaza **no es un aviso ya cableado** —en
      Rigel sí lo era; acá no existe—: es una declaración explícita de que la forma de la señal
      la decide el change que mida por plataforma la llegada al ambiente. Hasta entonces sigue
      la disciplina declarada, y ahora el requirement la nombra en vez de prometer lo contrario.
      **Evidencia**: `grep -n "SHALL fallar mientras" openspec/changes/infra-exigible/specs/operacion-infra/spec.md`
      → sin salida; y el escenario «Un repositorio con todos sus huecos abiertos» del delta
      dice que la verificación pasa.

---

## Bloque 4 — El cierre: el delta deja de contradecirse y los pendientes dicen cuándo · 2026-09-17

Lote 12 del porte de Rigel. Origen: Rigel 1.9.0 (`dev-alcanzable`, `78c693c`), 1.10.0
(`2026-08-29-infra-exigible`, `cb4cb13`, `160375e`, `462dc14`), 2.4.0 (`la-clase-del-log-group`,
`125d228`), 2.5.0 (`el-ambiente-se-exige`, `6b91fef`) y el change sin publicar
`2026-09-14-las-alarmas-no-se-contradicen` (`373f378`, `04166e8`). Toda la evidencia es del
worktree de la rama del porte, corrida el 2026-09-17.

### 4.a — La guarda primero, y vista en rojo

- [x] **4.1** El banco pasa de tres partes a **cuatro** con una sola lista (`PARTES`) para los
      dos tokens, y suma dos comprobaciones: `retencionDeLogsEnLosDosAmbientes` y
      `pendientesDePlataformaConSusCuatroPartes` (con guarda de vacuidad: cero encabezados
      `### PENDIENTE-PLATAFORMA` es rojo). Tres mutaciones nuevas, y la mordida se mide contra
      el árbol real: una mutación tiene que dar **más** hallazgos que el árbol, no solo alguno.
      **Evidencia**: `pruebas/andamio/infra-pendientes.test.mjs:87` (`PARTES`), `:226`, `:245`,
      `:266`; mutaciones desde `:393`.

- [x] **4.2** **Rojo antes del arreglo**, sobre el andamio sin tocar:
      `node --test --test-reporter=tap pruebas/andamio/infra-pendientes.test.mjs` →
      `# tests 21 · # pass 15 · # fail 6`. Rojas: `pendientesConSusCuatroPartes` (13
      pendientes sin «CUÁNDO SE RESUELVE»: 6 de dev y 7 de producción),
      `retencionDeLogsEnLosDosAmbientes` (falta en las dos raíces),
      `pendientesDePlataformaConSusCuatroPartes` (ocho sin «CUÁNDO», y «el marco» sin «CÓMO
      SE DECIDE»), y las tres mutaciones nuevas, que no tenían qué mutar.

### 4.b — El andamio

- [x] **4.3** «CUÁNDO SE RESUELVE» en los trece pendientes que había, con texto propio cada
      uno (design, D12), y el párrafo del cómputo administrado en los dos dimensionamientos.
      El bucket del state **sigue siendo pendiente** y no pasa a marcador.
      **Evidencia**: `grep -c '^# CUÁNDO SE RESUELVE'` → 7 en `plantilla/infra/pendientes.tf`
      y 8 en `plantilla/infra-prod/pendientes.tf`, igual que sus secciones numeradas; en `HEAD`
      antes del lote, `grep -c CUÁNDO plantilla/infra/pendientes.tf` → 0.

- [x] **4.4** El pendiente nuevo **«La retención y la clase del grupo de logs del servicio»**:
      `plantilla/infra/pendientes.tf:252` (7) y `plantilla/infra-prod/pendientes.tf:211` (8),
      con el criterio condicional en dev y la clase casi fija en producción (design, D13).
      Medido contra la tabla «Supported features» de «Log classes» de la documentación de
      CloudWatch Logs el 2026-09-17: `Metric filters` → No, `GetLogEvents`/`FilterLogEvents` →
      «Not supported», y «After a log group is created, its log class can't be changed».
      **Evidencia**: `grep -rnE 'log_group_class|INFREQUENT_ACCESS|retention_in_days' plantilla/`
      → 4 líneas (antes, 0).

- [x] **4.5** El pendiente de alarmas separa el **piso** por capacidad —tres detecciones,
      citando el requirement— de lo que el negocio elige por encima, y ata la tercera al
      pendiente 8. Los encabezados de los dos `pendientes.tf` pasan a «estos pendientes no
      tienen compuerta» sin prometer que llega con el change del despliegue.
      **Evidencia**: `plantilla/infra-prod/pendientes.tf:162` (alarmas) y los encabezados.

- [x] **4.6** Los dos `README.md` cuentan siete y ocho, dicen las cuatro partes, nombran el
      pendiente de logs y el piso de alarmas.
      **Evidencia**: `pruebas/docs/lo-que-lee-el-consumidor.test.mjs` en verde (las
      explicaciones declaradas de «compuerta» y «change» siguen en las páginas).

- [x] **4.7** `plantilla/infra/adaptadores.md`: el encabezado anuncia cuatro partes, los ocho
      `PENDIENTE-PLATAFORMA` dicen «CUÁNDO SE RESUELVE», «el marco» suma «CÓMO SE DECIDE», y
      la lista de pendientes que viven en `pendientes.tf` suma el programador de tareas y los
      logs.
      **Evidencia**, sobre `plantilla/infra/adaptadores.md`: encabezados
      `### PENDIENTE-PLATAFORMA` → 8; líneas que abren con `**CUÁNDO SE RESUELVE**` → 8; con
      `**CÓMO SE DECIDE**` → 8.

- [x] **4.8** Verde después del arreglo: el mismo comando → `# tests 21 · # pass 21 · # fail 0`.

### 4.c — El contrato

- [x] **4.9** El delta retira el `ADDED` y declara `RENAMED` + `MODIFIED` del requirement vivo
      (design, D10) y `MODIFIED` de «Las caídas se detectan por alarma» por capacidad (D11).
      **Verificado a mano**, porque el guardrail tiene un hueco conocido con los títulos:
      el título de cada `MODIFIED` existe en el spec vivo —«Las caídas…» directo, y «La
      infraestructura…» por el `FROM` del `RENAMED`, que existe (`openspec/specs/operacion-infra/spec.md:87`)—;
      el `TO` no existe en el vivo; no queda ningún `ADDED`. Los seis escenarios vivos de los dos
      requirements están en el delta con su título exacto (`grep -cF` → 1 cada uno); el delta
      tiene 12.

- [x] **4.10** `npx --yes --ignore-scripts @fission-ai/openspec@1.9.0 validate infra-exigible --strict`
      → «Change 'infra-exigible' is valid». `node actions/guardrail-deltas/check-openspec-deltas.mjs`
      → «22 requirement(s) comparados… ningún MODIFIED perdería escenarios» (eran 20: los dos
      `MODIFIED` nuevos, el renombrado resuelto por el `RENAMED`).

- [x] **4.11** Ensayo del archive sin escribir:
      `node .claude/skills/projects-archive-change/aplicar-deltas.mjs infra-exigible --simulacro`
      → «3 operacion(es) planificadas y NO escritas»: el `RENAMED` y los dos `MODIFIED`, en
      `operacion-infra`.

### 4.d — La documentación que decía otra cosa

- [x] **4.12** `openspec/cobertura-de-requirements.md`: la fila de «Higiene operativa de logs y
      TLS» decía «el pendiente correspondiente» sobre un pendiente que no existía; ahora nombra
      la comprobación que lo exige en las dos raíces. Las filas del state, de las caídas y de
      los huecos pasan a cuatro partes y a las anclas nuevas del banco (las viejas `:164`,
      `:183`, `:201`, `:240`, `:284` caían sobre código cualquiera y el banco de la página no lo
      podía ver). El párrafo de «parcial» deja de prometer la compuerta.
      **Evidencia**: `openspec/cobertura-de-requirements.md:232-237`;
      `pruebas/docs/cobertura-de-requirements.test.mjs` en verde.

- [x] **4.13** `docs/05-arrancar-tecnico.md` (siete y ocho, cuatro partes, «no gatean» sin
      «todavía») y las filas 22 y 23 de `docs/11-reglas-no-escritas.md`. La primera redacción
      de la fila 22 citaba la cláusula retirada con su `SHALL`, y
      `pruebas/docs/estandar-de-lectura.test.mjs` la puso roja (palabra del glosario sin
      enlazar): se reescribió sin la palabra.
      **Evidencia de cierre del bloque**: suite completa del marco
      (`find actions pruebas -name '*.test.mjs' -print0 | xargs -0 node --test`) →
      `# tests 1485 · # pass 1485 · # fail 0` (eran 1480: dos comprobaciones y tres mutaciones
      nuevas); `openspec validate --all --strict` → «Totals: 30 passed, 0 failed».

### 4.e — Lo que queda para la pasada final, y lo que no se hizo

- [ ] **4.14** **La retención de logs de las plataformas que no son `aws`**, como
      `PENDIENTE-PLATAFORMA` de cada adaptador. No se hizo: cada proveedor tiene su retención
      y su forma de fijarla, y la regla `costo-declarado-con-techo` prohíbe escribir un límite
      de plataforma sin medirlo contra la página del proveedor con su fecha. Destino: un
      change propio, o la pieza del porte que mida la llegada al ambiente por plataforma.

- [ ] **4.15** **Revisión adversarial** registrada en `revision-adversarial.md` de este change,
      con al menos dos lentes y un veredicto. La pide el desvío de `AGENTS.md` antes de
      archivar, y la hace la pasada final del porte, no el lote que escribió el cambio.

- [ ] **4.16** **Archive**, con `projects-archive-change`. Al aplicarlo, en el mismo commit:
      renombrar la fila de `openspec/cobertura-de-requirements.md` al título nuevo (el banco de
      la página se pone rojo si no); y extender el `Purpose` de `operacion-infra`, que no nombra
      que la infraestructura exista en el árbol ni que lo que falta decidir llegue escrito
      (Rigel lo agregó en su archive, hallazgo 10 de su revisión). El conteo de requirements
      de la capability queda en 6.

- [ ] **4.17** **La entrada del CHANGELOG.** Escrita como fragmento en
      `.porte/changelog/12-infra-exigible.md`; entra a `CHANGELOG.md` al integrar el porte.

### 4.f — La revisión adversarial del carril (2026-09-18)

- [x] **4.18** **Los «CUÁNDO SE RESUELVE» nombran el rol, no el handle** (RV-L12-01). Las
      tres líneas que este lote había escrito con `@{{PO}}` (dev, pendiente 6; producción,
      pendiente 6) y `@{{BUILDER_1}}` (producción, pendiente 2) dicen ahora «el PO», «al PO» y
      «Builder 1»: `projects-init` sustituye el marcador una sola vez al nacer el proyecto, y
      cada handle escrito es un lugar más que editar cuando se reasigna el rol (decisión D8
      del PO). `grep -rn '@{{' plantilla/infra plantilla/infra-prod` → solo los tres
      encabezados 🛑 de producción, anteriores a este change (ver 4.20).
- [x] **4.19** **Los pendientes del bucket y del cluster dejan de afirmar la topología de un
      área** (RV-L12-02). El fragmento y D12 decían que el bucket compartido por cuenta «era un
      dato del área de origen, no del marco», y los pendientes 1 y 2 —en dev y en producción—
      seguían diciendo «el área tiene un bucket por cuenta» y «un cluster por cuenta». Ahora
      el «CÓMO SE DECIDE» es condicional: si la organización ya los tiene, se pide el dato; si
      no, crearlos es infraestructura base, fuera de este root, y se pregunta antes. Lo mismo
      en el comentario del `data "aws_rds_cluster"` de `plantilla/infra/main.tf` y en
      `plantilla/infra/README.md`. El código no cambia: el root sigue LEYENDO el cluster.
      `pruebas/andamio/` → `tests 187 / pass 187`.
- [ ] **4.20** **Los tres encabezados 🛑 de producción siguen con `@{{BUILDER_1}}`**
      (`plantilla/infra-prod/main.tf`, `pendientes.tf` y `README.md`, anteriores a este
      change). **Motivo:** `AGENTS.md` manda usar los handles por rol en el andamio, y D8 pide
      que reasignar un rol cueste editar un solo lugar; en un encabezado que dice a quién
      pedirle el OK las dos reglas chocan, y cuál gana lo decide el PO para todo el andamio
      (el `CODEOWNERS` de cada proyecto tiene el mismo problema), no este change.

## Lo que NO es tarea de este change, y está declarado

El Terraform con recursos reales, el `deploy.yml`, `verificar-prod` como pieza referenciada,
y las otras garantías operativas del tercer nivel. Cada una es su propio change; la
justificación está en el `design.md`. Tampoco lo es la señal —aviso o rojo— sobre los
pendientes sin resolver, ni la compuerta del mínimo de alarmas (design, D9 y D11).

## Orden y dependencias

El bloque 1 antes del 2 —no se puede probar una compuerta que no existe— y el 3 último,
porque su tarea 3.1 cita el conteo real de huecos que deja el bloque 1. En el 4, la guarda
antes que el andamio (4.1–4.2 antes que 4.3–4.7), y el delta antes del archive: 4.15 y 4.16
van en ese orden, en la pasada final.
