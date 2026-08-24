# Registro de fricción — adopción de Supply Chain

Instancia de [la plantilla](../plantillas/registro-de-friccion.md), con la cabecera
ya llena con lo que se sabe al 2026-08-23. **Es el primer ensayo del marco desde
cero**: la guía nunca se corrió completa por alguien que no la escribió.

## Las dos reglas de uso, que son las que se rompen

**1. No arregles la guía mientras la corrés.** Anotá y seguí. Arreglar sobre la
marcha deja un documento que funciona para quien lo arregló y para nadie más, y borra
el dato que vinimos a buscar: *dónde* se traba alguien que no lo escribió.

**2. Un tropiezo cuyo arreglo empieza con «hay que recordar que…» no va a la guía.**
Va como fila al [backlog](../reglas-no-escritas.md#backlog-de-automatización).

---

## Cabecera

| | |
|---|---|
| Proyecto | Supply Chain |
| Repo destino | *a decidir* — `im-diego-ec/Procurement` existe y **no está vacío**: un `README.md` de 13 bytes y un solo commit («Initial commit», 2026-08-14, autor `po`). Tiene rama `main`, así que `projects init` aterriza sobre historia existente, no sobre un repo virgen |
| Fecha | 2026-08-24 |
| Quién ejecuta | @builder-uno (builder) |
| Quién acompaña | @po (PO) — primer día en la organización |
| Versión del marco pinada | `v1.6.0` (es lo que escriben los `uses:` del andamio) |
| Commit de Projects del que salió el andamio | *llenar con* `git -C <projects> rev-parse --short HEAD` *antes de correr `projects init`* |
| Máquina / SO | Windows 11 |
| Sesión de agente | **nueva** · modelo y effort: |

**Lo que ya se sabe de este arranque, para no medirlo como sorpresa:**

- El primer CI **sale rojo en un job y es esperado** (fase 5.1): tres recuadros 🕳️ del
  andamio, y uno de los tres no se puede borrar antes de que el CI haya corrido.
- El repo nuevo va a mostrar **2 alertas críticas de seguridad** el día uno: vitest del
  andamio ([projects#62](https://github.com/im-diego-ec/Projects/issues/62)).
  Exposición real medida: nula. No es un tropiezo del ensayo.
- El andamio **no trae `infra/` ni pipeline de deploy**, aunque la constitución los
  exige. Es hueco conocido, no hallazgo.

## Lo que falta ANTES de empezar (medido el 2026-08-23, solo Builder 1 puede)

Sin esto el ejercicio se traba, y ninguno se arregla desde la sesión de agente.

| Qué | Estado medido | Cómo se verifica |
|---|---|---|
| `po` miembro de la organización | **NO** — y sin invitación pendiente, pese a haber creado `Procurement` el 2026-08-14 | `gh api orgs/im-diego-ec/members/po --include` → `404` |
| Team `po` con miembros | **VACÍO** (el team existe, id 18994571) | `gh api orgs/im-diego-ec/teams/po/members` → `[]` |
| Acceso del team al repo destino | **NO** — en `Procurement` los colaboradores son builder-uno (admin), builder-dos (read) y la-organizacion (admin); ningún team | `gh api repos/.../Procurement/collaborators` |
| Labels `area:*` en el repo destino | pendiente (fase 6.2 de la guía las crea) | `gh label list --repo ...` |
| Los dos secrets de la fase 6.4 | pendiente (ninguno gatea el pipeline) | `gh secret list --repo ...` — verificar EXISTENCIA, nunca el valor |

**Por qué el team `po` vacío importa más de lo que parece**: CODEOWNERS le da al PO la propiedad de
proposals y specs, y ahí su aprobación **es** el gate. Con el team vacío, GitHub no le pide review a
nadie para esas rutas — el gate existe en el archivo y no existe en la práctica. Se nota recién en la
fase 7, cuando el primer change de OpenSpec necesita al PO.

## El reloj, fase por fase

| Fase | Promete | Real | ¿Se trabó? | ¿Debería haber sido automático? |
|---|---|---|---|---|
| 0 · Verificar, no hacer | 30 s | | | |
| 1 · Arrancar lo asíncrono | — | | | |
| 2 · Los 21 valores | — | | | |
| 3 · El repo | 2 comandos | | | |
| 3.1 · Qué quedó en el repo | — | | | |
| 3.2 · Escritura de los equipos | — | | | |
| 3.3 · Si el repo ya existía | *no aplica: se crea repo nuevo* | — | — | — |
| 4 · El lockfile | 1 comando | | | |
| 4.1 · Comprobarlo antes de pushear | — | | | |
| 4.2 · lo que ya viene hecho | *no es trabajo: es inventario* | — | — | — |
| 5 · Primer push a `main` | — | | | |
| 5.1 · El primer CI sale rojo | — | | | |
| 6.1 · Protección de `main` | — | | | |
| 6.2 · Las seis labels | — | | | |
| 6.3 · Dependabot | — | | | |
| 6.4 · Los dos secrets | — | | | |
| 7 · Primer change de OpenSpec | — | | | |
| **7.1** · de los documentos a los specs | — | | | |
| 7.1 · 1-2 · directorio aparte e instalar BMAD | — | | | |
| 7.1 · 3 · documentos numerados | — | | | |
| 7.1 · 4 · **la lista de cobertura** | — | | | |
| 7.1 · 5 · **el PRD con `bmad-prd`** | 2-3 vueltas | | | |
| 7.1 · 6 · pulir el PRD y contrastarlo | — | | | |
| 7.1 · 7 · la sesión del repo: proposal y deltas | — | | | |
| 7.1 · 8 · la tercera columna de la lista | — | | | |

**Los tres pasos que nadie corrió nunca son el 4, el 5 y el 6.** Ahí es donde el reloj
importa de verdad: si el 5 se come la tarde, eso es el resultado del día.

**Total real punta a punta**: ____ · **de eso, esperando a otra persona**: ____

## Los tropiezos

### T1 · fase __

- **Qué esperaba que pasara**:
- **Qué pasó** (salida textual):
- **Cómo lo saqué**:
- **Cuánto costó**: ____ min
- **Clase**: [ ] `guía` · [ ] `andamio` · [ ] `marco` · [ ] `entorno` · [ ] `github` · [ ] `humano`
- **¿Arreglo directo o necesita decisión?**:

*(copiar el bloque por cada tropiezo)*

## Lo que NO se probó

-

## Cierre

1. **Qué se arregla en la guía** (PR, citando los tropiezos por número):
2. **Qué se arregla en el andamio o en el marco** (issue o change):
3. **Qué queda como disciplina declarada** (fila en el backlog):

**Veredicto en una línea** — ¿un builder que recién conoce el marco podría arrancar un
proyecto solo con la guía, hoy?
