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

## Bloque 1 — Los dos directorios, con lo derivado funcionando y los cinco huecos

- [ ] **1.1** Crear `plantilla/infra/` y `plantilla/infra-prod/` con lo que **se deriva**
      (D3): bloque de backend del state con el bucket por cuenta y la `key` por proyecto,
      referencia al cluster compartido, referencia a la VPC, proveedor y región, prefijo de
      recursos, identidad federada del pipeline, y los dominios. Todo con marcadores de valor
      —los que `projects init` ya sustituye—, ninguno inventado.
      **Evidencia**: `grep -rhoE '\{\{[A-Z0-9_]+\}\}' plantilla/infra plantilla/infra-prod |
      sort -u` y que cada marcador que salga esté en la lista que `projects init --ejemplo`
      imprime. Un marcador que no esté ahí viaja literal al repo nuevo.

- [ ] **1.2** Escribir los **cinco huecos de decisión** con la forma de tres partes —qué
      falta, con qué criterio se decide, qué queda sin garantía—: dimensionamiento y
      autoescalado, certificado y zona DNS, programador de tareas, topología de subredes
      (D4), y alarmas (D5, **solo en `infra-prod/`** por D6).
      **Evidencia**: el paso de marcadores del pipeline corrido sobre un `projects init` de
      prueba **falla**, y su salida nombra los cinco.

- [ ] **1.3** Declarar la asimetría dev↔prod en el `README.md` de cada directorio (D6): dev
      sin alarmas y sin programador **es decisión**, no hueco.
      **Evidencia**: los dos README existen y el de `infra/` dice por qué no tiene el hueco
      de alarmas.

- [ ] **1.4** Sumar al `.gitignore` del andamio el `state` y los `.tfvars`, que en el
      consumidor de referencia ya están ignorados y conviene que **nazcan** así.
      **Evidencia**: `git check-ignore -v` sobre las rutas, en un `projects init` de prueba.

- [ ] **1.5** Ningún archivo `.tf` con recursos reales en este bloque. Es la frontera del
      change y se verifica en vez de confiarse.
      **Evidencia**: `grep -rE '^resource ' plantilla/infra plantilla/infra-prod` sale
      **vacío**. Solo `data`, `terraform`, `provider`, `variable`, `locals` y `output`.

## Bloque 2 — Que la compuerta muerda, y que sea inerte donde debe

- [ ] **2.1** Prueba en `pruebas/andamio/` con el patrón que el banco ya usa: las
      comprobaciones se escriben una vez y se corren **contra el andamio real** (donde tienen
      que pasar salvo los huecos) y **contra copias mutadas** (donde tienen que morder).
      Mutaciones mínimas: hueco borrado sin resolver, hueco sin criterio, el directorio
      entero retirado, y el hueco de alarmas movido a `infra/`.
      **Evidencia**: la prueba en verde, y cada mutación con su rojo y su mensaje.

- [ ] **2.2** Verificar que la exigencia es **inerte** para un repositorio que no se
      despliega: Projects mismo no tiene los directorios y su CI no puede empezar a fallar.
      **Evidencia**: el CI de este PR en verde es la evidencia, y se cita el run.

- [ ] **2.3** Verificar contra el consumidor real, con el patrón que ya pagó dos veces: rama
      temporal en proyecto-origen apuntando al SHA de este change, PR **en borrador
      titulado NO MERGEAR**, se recoge la evidencia y se cierra con `--delete-branch`.
      Tiene que pasar **sin tocar una línea** de ese repo, porque ya tiene los dos
      directorios con Terraform real y cero huecos.
      **Evidencia**: enlace al run, y `ci-ok` en verde.

## Bloque 3 — Que el que llega mañana lo entienda

- [ ] **3.1** Sumar los cinco huecos a la fase 5.1 de `docs/arrancar-un-proyecto.md`, que ya
      documenta el primer CI rojo como esperado y hoy cuenta tres huecos.
      **Evidencia**: el conteo de la guía coincide con el conteo real del andamio, verificado
      con el mismo `grep` de la tarea 1.2.

- [ ] **3.2** Entrada en `CHANGELOG.md` con su sección **Para consumidores**: para un repo
      que ya tiene infraestructura, **nada**; para un repo nuevo, cinco huecos más en el
      primer rojo.
      **Evidencia**: el check `changelog-en-el-pr` en verde — este bloque toca `plantilla/`,
      así que aplica.

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
