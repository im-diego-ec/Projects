# Plantilla y convención: runbook

Esta plantilla se **copia** al crear el proyecto (pieza de scaffold). Los
runbooks del proyecto viven en `docs/runbooks/` de su repo, porque hablan
de recursos, URLs y log groups concretos: un runbook del marco sería un
runbook que nadie puede ejecutar.

---

## La convención (cuatro reglas)

### 1. Ejecutable a las 3am

Es el criterio único de calidad y se aplica literal: **una persona sin
contexto, medio dormida, con el teléfono en la otra mano, tiene que poder
seguirlo.** De ahí se deducen todas las demás reglas:

- Comandos **completos y copiables**, con perfil, región y nombre de
  recurso escritos. Nada de "ajustá el perfil según el ambiente".
- **Cero decisiones sin criterio.** Si un paso bifurca, el runbook dice
  cómo elegir: *"`api≠200`: el servicio no responde, andá al paso 4"*.
- **Qué va a pasar** después de cada acción peligrosa, para que lo esperado
  no parezca un fallo.
- Lo primero de todo es el **estado a la vista en 60 segundos**: tres o
  cuatro comandos que dicen qué está roto antes de diagnosticar nada.
- Sin jerga interna sin expandir, sin enlaces a conversaciones, sin "como
  ya sabemos".

Un runbook que empieza con "primero entendé la arquitectura" no es un
runbook, es documentación de arquitectura con otro nombre.

### 2. Dual-shell: cada paso en bash Y en PowerShell

El equipo trabaja en sistemas distintos y **el incidente no espera a que
traduzcas**. Cada bloque de comandos aparece dos veces, uno por shell, y
**no se mezclan**. Traducir bajo presión es exactamente cuando aparecen los
errores que cuestan minutos:

- En PowerShell, **`curl` a secas es un alias de `Invoke-WebRequest`**: la
  sintaxis de curl explota (empezando por `-w`, que PowerShell interpreta
  como `-SessionVariable`). Se usa **`curl.exe`** explícito.
- Las **continuaciones de línea de bash (`\`)** pegadas en PowerShell se
  ejecutan como comandos sueltos, cada uno con su propio error confuso. En
  los bloques de PowerShell los comandos van **en una sola línea**.
- En PowerShell 5.1, pasar comillas a un ejecutable nativo exige
  **escaparlas con `\"`** (típico en los filtros JSON de las consultas de
  logs).
- En Git Bash sobre Windows, una ruta que empieza con `/` se convierte a
  ruta de Windows: para nombres tipo `/prefijo/servicio/api` hay que
  anteponer **`MSYS_NO_PATHCONV=1`**. En PowerShell esto no pasa.
- El salto de línea en un formato es `\n` en bash y **`` `n ``** en
  PowerShell.

Los cinco se cazaron en el primer simulacro del proyecto piloto, no
leyendo documentación.

### 3. Todo comando VALIDADO, con fecha

Un comando que nadie ejecutó es una hipótesis. En un runbook, una hipótesis
a las 3am es tiempo perdido buscando el typo de otro.

Cada runbook declara en su cabecera **cuándo y contra qué se validaron sus
comandos**:

> Todos los comandos PowerShell de este runbook fueron VALIDADOS
> ejecutándolos contra prod real (AAAA-MM-DD).

Reglas de la validación:

- Los comandos de **lectura** se validan contra el ambiente real.
- Los de **escritura o destructivos** se validan en un simulacro
  (ambiente de desarrollo, o un recurso temporal) y el runbook dice
  explícitamente **qué parte no se ejecutó en producción y por qué**.
- Si al validar aparece un paso que faltaba, **el paso entra al runbook**.
  Los tres pasos que le faltaban al runbook de restore del proyecto piloto
  aparecieron así: haciendo el ensayo, no revisándolo.
- Cuando un cambio de pipeline o un post-mortem deja un comando viejo, se
  **revalida y se actualiza la fecha**. Una fecha vieja es una advertencia
  legítima para quien lee.

### 4. Se actualiza desde los post-mortems

Un runbook no se escribe una vez. Cada post-mortem se pregunta si algún
runbook quedó viejo, y cada cambio de pipeline también. El enlace es de ida
y vuelta: el post-mortem enlaza el runbook que corrigió, el runbook enlaza
el post-mortem que lo enseñó.

## Índice de runbooks

El proyecto mantiene `docs/runbooks/README.md` con una tabla **por
disparador, no por tema** — porque quien lo abre no busca "el runbook de
ECS", busca *"sonó la alarma, ¿qué hago?"*:

| Runbook | Cuándo |
|---|---|
| `incidente-prod.md` | Sonó {{CANAL_ALERTAS}} o alguien reporta que producción falla |
| `rollback.md` | Un deploy salió mal y necesitás producción sana YA |
| restore.md *(pendiente — issue #NN)* | Restaurar la base desde backup |

Los runbooks pendientes **se listan igual**, con su issue: saber que no
existe es información operativa, y descubrirlo durante el incidente es la
peor forma de enterarse.

### Los tres que todo proyecto necesita

1. **incidente-prod** — del aviso a la causa en minutos: qué significa cada
   alarma, estado a la vista, logs, tareas del servicio, cuándo saltar a
   rollback.
2. **rollback** — volver a una versión que ya estuvo sana, con el detalle
   de qué NO revierte (migraciones, frontend) y qué sí se verifica igual.
3. **restore** — recuperar datos desde backup, **ensayado de verdad**, con
   tiempos reales medidos. Un restore no ensayado es un backup no probado.

---

## Plantilla (copiar desde acá)

`````markdown
# Runbook: <disparador en lenguaje de quien lo vive>

> Objetivo: **del aviso a la causa en minutos**. Los umbrales exactos viven
> en <archivo de infraestructura donde están definidas las alarmas>.

> **Cada paso viene en bash Y en PowerShell — usá el bloque de tu shell.**
> Todos los comandos de este runbook fueron VALIDADOS ejecutándolos contra
> <ambiente> el <AAAA-MM-DD>. No mezcles shells: en PowerShell, `curl` a
> secas es un alias de `Invoke-WebRequest` y las continuaciones `\` de bash
> se ejecutan como comandos sueltos.

## 0. Qué significa cada alarma

Todos los `alarm_name` reales llevan el prefijo `[{{PREFIJO_RECURSOS}}-prod] `.

| Alarma | Significa | Primer reflejo |
|---|---|---|
| `<nombre real de la alarma>` | qué está pasando de verdad | a qué paso ir |

## 1. Estado a la vista (60 segundos)

````bash
curl -s -o /dev/null -w "api=%{http_code}\n" https://{{DOMINIO_PROD}}/api/health
curl -s -o /dev/null -w "db=%{http_code}\n"  https://{{DOMINIO_PROD}}/api/db/health
````

````powershell
curl.exe -s -o NUL -w "api=%{http_code}`n" https://{{DOMINIO_PROD}}/api/health
curl.exe -s -o NUL -w "db=%{http_code}`n"  https://{{DOMINIO_PROD}}/api/db/health
````

- `api≠200`: el servicio no responde — andá al paso de tareas del servicio.
- `api=200, db=503`: el servicio vive pero no llega a la base.
- Todo 200 con la alarma sonando: el problema es de tasa, no de caída — a
  los logs.

¿Hubo deploy reciente? `gh run list --workflow=Deploy --limit 3` (igual en
ambos shells). Si el incidente empezó con un deploy, el rollback es el
camino corto — **diagnosticá DESPUÉS, con producción sana**.

## 2. Logs (la fuente de verdad)

Log group: `<nombre real del log group>`. Los logs son JSON por línea: se
consulta POR CAMPO.

````bash
aws logs filter-log-events --log-group-name "<log group>" \
  --start-time $(($(date +%s%3N) - 900000)) \
  --filter-pattern '{ $.nivel = "fatal" }' \
  --query 'events[].message' --output text \
  --profile {{PERFIL_PROD}} --region {{REGION}}
````

> Git Bash: si la ruta del log group se convierte en ruta de Windows,
> anteponé `MSYS_NO_PATHCONV=1`. (En PowerShell esto no pasa.)

````powershell
$desde = [DateTimeOffset]::UtcNow.AddMinutes(-15).ToUnixTimeMilliseconds()
aws logs filter-log-events --log-group-name "<log group>" --start-time $desde --filter-pattern '{ $.nivel = \"fatal\" }' --query 'events[].message' --output text --profile {{PERFIL_PROD}} --region {{REGION}}
````

Con un `requestId` a mano, todas las líneas de esa misma request salen con
el mismo filtro cambiando el campo. Ese es el atajo que convierte "algo
falla" en "esta línea de este archivo".

## 3. <siguiente paso del diagnóstico>

...

## Qué hacer con lo que encontraste

| Hallazgo | Acción |
|---|---|
| Empezó con un deploy | el runbook `rollback.md` del proyecto |
| Datos corruptos o borrados | restore |
| Causa clara y arreglo chico | fix-forward por el flujo normal (PR + promoción) |

## Después

Si hubo impacto a usuarios: **post-mortem dentro de las 48h**
(`docs/postmortems/PLANTILLA.md`). Si este runbook te falló en algo,
arreglalo en el mismo PR — mientras lo tenés fresco.
`````
