# Subir la versión pineada del CLI de OpenSpec

OpenSpec es la fuente de verdad del comportamiento
([ADR 001](adr/001-openspec-fuente-de-verdad.md)) y el marco **pina la
versión de su CLI**. Subirla es un procedimiento corto pero con tres
trampas conocidas: nadie te va a avisar de que hay versión nueva, las
skills que quedan viejas no lo dicen en voz alta, y en Windows el `archive`
puede mentir. Este documento es el procedimiento y las tres trampas.

## Por qué está pineada

1. **Mismo veredicto en CI y en tu máquina.** `validate --strict` es un
   check requerido: si el CLI de tu terminal y el del pipeline son
   versiones distintas, aparece la peor clase de fallo — el que solo se
   reproduce en un lado. Un validador nuevo puede endurecer una regla o
   nombrar un problema que el viejo no veía; eso está bien, pero tiene que
   pasarle **al equipo entero el mismo día**.
2. **El nombre pelado está ocupado.** El paquete correcto es
   **`@fission-ai/openspec`**. En npm, `openspec` a secas es un paquete
   ajeno (un placeholder `0.0.0`, squatting). El pin con el nombre completo
   y la versión exacta hace imposible el error de tipeo silencioso: sin
   versión exacta, un `npx openspec` cualquiera puede resolver a otra cosa
   y "funcionar" sin validar nada.
3. **El artefacto es reproducible.** Un change archivado hace tres meses se
   puede revalidar con la versión que lo aprobó.

## Dónde vive el pin

| Lugar | Qué es | Cómo se actualiza |
|---|---|---|
| **Workflow de validación del marco** | La línea `npx --yes @fission-ai/openspec@X.Y.Z validate --all --strict`. **Este es el pin canónico.** | A mano, en un PR del marco |
| **Las máquinas del equipo** | Cada quien invoca por `npx` con la misma versión, o tiene instalada esa versión | Se sigue del pin canónico |
| **`generatedBy` de las skills y comandos** | Front-matter de cada `SKILL.md` y de cada comando `opsx` generado | Se **regenera**, no se edita |
| **El allowlist del agente, en cada repo** | Los patrones `Bash(npx --yes @fission-ai/openspec@X.Y.Z ...)` de `.claude/settings.json`. **Es el único lugar que repite el número a la fuerza**: el permiso se concede por coincidencia literal de texto, así que no puede referenciar el pin canónico | A mano, en el mismo PR que sube el pin — en `plantilla/` y en cada repo ya creado |

El pin canónico vive en **un solo lugar del marco** y los repos que
consumen el workflow reusable **no repiten el número** en su pipeline. Si un
repo necesita otra versión, la pasa explícitamente como input — y eso es
visible, que es justamente el punto.

La excepción es el allowlist del agente, y conviene mirarla de frente porque
ya mordió. Como el permiso se concede por texto literal, cada repo lleva su
propia copia del número — y una copia es exactamente lo que envejece sin que
nadie se entere. El consumidor piloto quedó con la forma vieja del patrón,
**sin scope y sin versión**, es decir autorizando al agente a descargar y
ejecutar el paquete ajeno con `--yes`; el scaffold ya tenía el pin correcto,
pero el scaffold se copia una vez y después no se actualiza solo.

Lo que hoy **sí** falla solo es la mitad que importa: el check *Ejecutores de
paquetes pinados* del job `higiene` se pone rojo si un patrón —o cualquier
otra línea rastreada que no sea `.md`— corre un paquete sin versión exacta.
Que el número esté **atrasado** sigue siendo cosa de este procedimiento; que
esté **ausente** ya no depende de que nadie se acuerde.

Para saber qué versión está pineada hoy, sin adivinar:

```bash
grep -rn "@fission-ai/openspec@" .github/
```

```powershell
Select-String -Path ".github\workflows\*.yml" -Pattern "@fission-ai/openspec@"
```

## Trampa 1: Dependabot es CIEGO a este pin

Dependabot lee **manifests**: `package.json`, lockfiles, `Dockerfile`,
`uses:` de acciones de GitHub. Un `npx @fission-ai/openspec@1.9.0` dentro
de un `run:` es, para Dependabot, **una cadena de texto en un script de
shell**. No hay nada que actualizar porque no hay nada declarado.

Consecuencia directa: **nadie va a abrir el PR por vos**. Sin un disparador
propio, el pin se queda donde está hasta que alguien tropiece con una
funcionalidad nueva o con un bug ya arreglado. En el proyecto piloto esto
ya produjo drift real: el pin del pipeline estaba en `1.9.0` mientras las
skills de la máquina seguían generadas por `1.6.0`.

Es la razón por la que este documento existe en vez de ser un comentario en
el YAML.

**Cómo volverlo automático** (entra al backlog de
[reglas-no-escritas.md](reglas-no-escritas.md)): un job programado —
semanal, en el mismo día que corre Dependabot — que compare la última
versión publicada contra el pin y **abra un issue** si difieren. No un PR
automático: el upgrade incluye regenerar skills y revalidar todo, y eso
tiene un humano en el medio a propósito.

Consultar la última publicada, cuando querés mirarlo a mano:

```bash
npm view @fission-ai/openspec version
npm view @fission-ai/openspec versions --json | tail -20
```

```powershell
npm view @fission-ai/openspec version
npm view @fission-ai/openspec versions --json | Select-Object -Last 20
```

## Trampa 2: las skills NO se vendoran, se REGENERAN

Principio de distribución del marco: las skills y los comandos `opsx` son
**regenerados**, no referenciados ni copiados. El marco pina la versión del
CLI; **cada repo regenera sus propios archivos** con esa versión.

El motivo es que esos archivos son **salida del CLI**, no fuente. Si se
vendoran, envejecen en silencio: describen pasos, flags y nombres de
comando de una versión que ya no corre, y quien los sigue —persona o
agente— hace lo que la herramienta hacía el año pasado. Un archivo generado
guardado en el repo es una copia que nadie recuerda actualizar.

La versión que los generó queda registrada en su front-matter:

```yaml
metadata:
  author: openspec
  version: "1.0"
  generatedBy: "1.6.0"     # ← esta es la que importa
```

Detectar el drift es un grep:

```bash
grep -rn "generatedBy" .claude/skills/ .claude/commands/ | sort -u
```

```powershell
Select-String -Path ".claude\skills\*\SKILL.md" -Pattern "generatedBy" | ForEach-Object { $_.Line.Trim() } | Sort-Object -Unique
```

Regenerar:

```bash
npx --yes @fission-ai/openspec@X.Y.Z update --force
```

`openspec update` actualiza los archivos de instrucción de las herramientas
ya configuradas en el repo (`--force` fuerza aunque las considere al día).
Si el repo todavía no tiene herramientas configuradas —repo nuevo—, la
configuración inicial es:

```bash
npx --yes @fission-ai/openspec@X.Y.Z init --tools claude
```

Los archivos regenerados **sí se commitean** (el agente los lee del disco);
lo que no se hace es editarlos a mano. Una corrección a una skill que
sobrevive al siguiente `update` no existe: si hace falta comportamiento
propio, va en la constitución del repo, no en un archivo generado.

## Procedimiento

Una sola sesión, en una rama `chore/openspec-<version>`.

1. **Rama desde `main` actualizado** (regla 8 de
   [reglas-no-escritas.md](reglas-no-escritas.md)):

   ```bash
   git checkout main && git pull --ff-only && git checkout -b chore/openspec-X.Y.Z
   ```

2. **Leer el changelog de las versiones intermedias.** Interesa sobre todo
   qué reglas de validación cambiaron: un validador más estricto puede
   poner en rojo specs que hoy pasan, y eso es trabajo real del upgrade,
   no una sorpresa para el día siguiente.

3. **Validar con la versión NUEVA antes de tocar el pin.** Es el paso que
   convierte el upgrade en una decisión informada:

   ```bash
   npx --yes @fission-ai/openspec@X.Y.Z validate --all --strict
   ```

   - Verde → seguí.
   - Rojo → los arreglos de specs van **en este mismo PR**, con el pin. Un
     PR que sube el pin y deja el repo rojo bloquea a todo el mundo.

4. **Subir el pin canónico** en el workflow del marco. Un solo número, un
   solo lugar.

5. **Regenerar skills y comandos** con la versión nueva
   (`update --force`, ver arriba) y confirmar que `generatedBy` quedó en
   `X.Y.Z` en **todos** los archivos, no en algunos.

6. **Correr la suite local antes del push** (regla 7): validación estricta,
   el guardrail de deltas y el lint del repo.

7. **PR con `Closes #<issue>` desde la creación** (regla 9), y en el cuerpo:
   versión anterior → nueva, qué cambió en la validación, y si hubo specs
   que ajustar, cuáles y por qué.

8. **Verificación posterior al merge**: la primera corrida de CI sobre
   `main` con el pin nuevo. Si algo se rompe, el revert es limpio porque el
   pin es un número en un archivo.

9. **Avisar al equipo** dónde corresponda: quien tenga el CLI instalado
   globalmente tiene que alinearse, o pasarse a `npx` con la versión del
   pin.

## Trampa 3: en Windows, `openspec archive` puede mentir

**Verificado el 2026-08-14, reproducido dos veces.**

`openspec archive` falla con **`EPERM` al renombrar la carpeta del change**
y **hace ROLLBACK de todo, incluidos los specs que ya había escrito**. Lo
peligroso no es que falle: es **cómo** falla.

> Imprime **`Specs updated successfully`** y no queda nada aplicado.

Si te quedaste con el mensaje, seguís adelante creyendo que el change está
archivado y los specs vivos actualizados. No lo están.

**Qué se sabe de la causa.** El lock es sobre el **rename del directorio**,
no sobre los archivos: `git mv` mueve los mismos archivos uno por uno sin
problema. Es el patrón clásico de Windows cuando algo tiene el directorio
abierto (indexador, antivirus, un watcher del editor, la propia terminal
parada adentro).

**Cómo detectarlo, siempre, no solo cuando sospechás.** Después de
cualquier `archive`, mirá el estado del repo en vez del mensaje:

```bash
git status --short
```

```powershell
git status --short
```

Si `openspec/specs/` no tiene modificaciones y el change sigue fuera de
`changes/archive/`, **el archive no hizo nada** por mucho que haya dicho
que sí.

**Rodeos, en orden de preferencia:**

1. **Correr el archive en CI, sobre Linux.** Es la solución de fondo: un
   job con `workflow_dispatch` que recibe el nombre del change, corre
   `openspec archive`, valida y abre el PR con el resultado. Elimina la
   clase entera de problema y de paso alinea con la regla 4 (toda acción
   manual por botón, no a mano).
2. **Aplicar a mano, con método.** Es lo que se hizo en el piloto:
   - aplicar los `MODIFIED` con un script que **replica la semántica del
     archive** — reemplazo del **requirement completo**, no un merge línea
     a línea (esa semántica es la que el archive implementa, y hacerlo
     "a ojo" es cómo se pierden escenarios);
   - mover el change con **`git mv`**, que sí funciona;
   - cerrar con `validate --all --strict`, el guardrail de deltas y
     `openspec list` **sin changes activos**. Los tres verdes son la
     evidencia de que el archive quedó bien hecho.
3. **Reintentar en limpio.** Cerrar editores y terminales apoyados en la
   carpeta del change, excluir el repo del antivirus en tiempo real y
   reintentar. A veces alcanza; no es confiable como procedimiento.

Nunca: dar el archive por bueno porque el CLI dijo `successfully`.

## Checklist del upgrade

- [ ] `validate --all --strict` en verde con la versión **nueva**, antes de mover el pin
- [ ] Pin canónico actualizado en un solo lugar
- [ ] Skills y comandos regenerados: `generatedBy` en `X.Y.Z` en **todos**
- [ ] Patrones de `.claude/settings.json` actualizados a `X.Y.Z` (en `plantilla/`
      y en cada repo). Que estén **sin versión** ya lo caza el check *Ejecutores
      de paquetes pinados*; que estén **atrasados**, no — eso es este ítem
- [ ] Suite local antes del push
- [ ] PR con `Closes #<issue>` desde la creación y el diff de versiones en el cuerpo
- [ ] Primera corrida de CI sobre `main` en verde
- [ ] Equipo avisado
