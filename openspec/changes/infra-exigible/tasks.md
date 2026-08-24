---
artefacto: tasks
dri: Builder 1
revisa: Builder 2 (builder par)
estado: pendiente-de-revision
---

# infra-exigible — Tasks

Tres bloques. El 1 es el único que toca el andamio; el 2 verifica que la compuerta muerda de
verdad; el 3 cierra la documentación. **Un sub-issue por bloque**, colgado del issue macro, y
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
      consumidor de referencia ya están ignorados y conviene que **nazcan** así.
      el `.gitignore` del andamio ya traía las siete reglas de Terraform —`.terraform`,
      `*.tfstate*` y `*.tfvars` para los dos directorios— para directorios que no existían.
      **Evidencia**: `grep -nE "tfstate|tfvars|terraform" plantilla/.gitignore`.

- [x] **1.5** Ningún archivo `.tf` con recursos reales en este bloque. Es la frontera del
      change y se verifica en vez de confiarse.
      **Evidencia**: `grep -rE '^resource ' plantilla/infra plantilla/infra-prod` sale
      **vacío**. Solo `data`, `terraform`, `provider`, `variable`, `locals` y `output`.
      **RESULTADO**: vacío.

## Bloque 2 — Que la compuerta muerda, y que sea inerte donde debe · **HECHO** (la 2.3 salió a issue propio)

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

- [ ] **2.3** **MOVIDA A ISSUE PROPIO (#73)**, y el motivo es que su compuerta no es técnica:
      abre una rama temporal en proyecto-origen y eso exige el OK de @builder-uno, aunque
      el PR sea borrador y no se mergee. Un bloque no se cierra con una tarea pendiente de un
      gate humano adentro, y dejarla acá habría hecho que el PR del bloque 2 cerrara un issue
      incompleto.
      Sigue siendo obligatoria antes del archive del change.

## Bloque 3 — Que el que llega mañana lo entienda

- [ ] **3.1** Sumar los huecos a la fase 5.1 de `docs/arrancar-un-proyecto.md`, que ya
      documenta el primer CI rojo como esperado y hoy cuenta tres huecos.
      **Evidencia**: el conteo de la guía coincide con el conteo real del andamio, verificado
      con el mismo `grep` de la tarea 1.2.

- [x] **3.2** ~~Entrada en `CHANGELOG.md`~~ **CORREGIDA DE LUGAR al implementar el bloque 1.**
      Esta tarea estaba mal puesta acá: el check `changelog-en-el-pr` exige la entrada en el PR
      que **toca `plantilla/`**, o sea en el bloque 1, y la regla del marco dice lo mismo —«se
      escribe en el PR que introduce el cambio, no al cortar la versión». Diferirla al bloque 3
      habría puesto rojo al PR del bloque 1.
      Queda, para el PR de este bloque: **revisar** que la entrada refleje lo que los tres
      bloques dejaron, y agregarle lo que el bloque 2 haya cambiado.
      **Evidencia**: el check `changelog-en-el-pr` en verde en el PR del bloque 1.

- [ ] **3.3** Anotar en `docs/reglas-no-escritas.md` la deuda que el design declara y que
      ningún check puede cerrar: **que el hueco lleve un criterio útil** no es decidible con
      un escaneo, y se revisa una vez acá en vez de una vez por proyecto.
      **Evidencia**: la fila existe y dice por qué no se puede automatizar.

---

## Lo que NO es tarea de este change, y está declarado

El Terraform con recursos reales, el `deploy.yml`, `verificar-prod` como pieza referenciada,
y las otras garantías operativas del tercer nivel. Cada una es su propio change; la
justificación está en el `design.md` y en el issue #66.

## Orden y dependencias

El bloque 1 antes del 2 —no se puede probar una compuerta que no existe— y el 3 último,
porque su tarea 3.1 cita el conteo real de huecos que deja el bloque 1. El 2.3 exige el OK de
@builder-uno para abrir la rama temporal en el consumidor, aunque el PR sea borrador y no
se mergee.
