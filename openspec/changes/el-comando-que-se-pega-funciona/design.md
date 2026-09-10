---
artefacto: design
dri: Builder 1
aprueba: Builder 2 (builder par)
estado: pendiente-de-revision
---

# Design — el-comando-que-se-pega-funciona

## Clasificación de distribución

| Pieza | Forma | Por qué |
|---|---|---|
| `herramientas/projects-init.mjs` | canónico | corre desde el clon, no viaja al proyecto |
| `pruebas/init/el-doble-clic-llega.test.mjs` | canónico | banco del marco |
| `actions/guardrail-deltas/pruebas/guardrail-deltas.test.mjs` | canónico | banco de una action; el banco no viaja, la action sí |

Nada viaja al consumidor: impacto cero en sus pipelines.

## Comillas dobles y no simples

La misma línea tiene que poder pegarse en **bash, zsh, cmd y PowerShell** — la
herramienta corre en las tres plataformas y su banco tiene matriz de sistema
operativo, justamente porque acá el marco no elige la máquina.

Las comillas **simples** son las más seguras en POSIX, y por eso son la elección
por defecto en la mayoría de los proyectos. Acá se descartan: `cmd` no las
entiende, así que en Windows la línea quedaría peor de lo que estaba.

Las **dobles** funcionan en las cuatro shells para el caso que importa —una ruta
con espacios— y dejan los backslashes de una ruta de Windows literales tanto en
`cmd` como en bash, que es lo que hace falta para que `C:\Users\Mis Documentos\x`
sobreviva.

**El límite, declarado:** una ruta que contenga `"` o `$` necesita escape, y el
escape correcto difiere entre bash y cmd. Se escapa la comilla doble, que es lo
que rompería la sintaxis; `$` en una ruta de archivo es lo bastante raro como
para no justificar una rama por shell que nadie podría probar en las cuatro. Si
algún día aparece, el modo de falla es visible —el comando falla al pegarlo— y no
silencioso.

## Se entrecomilla sólo cuando hace falta

Envolver siempre haría ruidosa la salida en el caso normal, que es una ruta sin
espacios. La función mira la ruta y decide. El efecto secundario útil es que la
mayoría de las líneas de la documentación y de las capturas existentes no cambian.

## Por qué el banco del guardrail se toca acá y el guardrail no

`.pathname` es un defecto del **banco**: le pasaba al guardrail una ruta que no
existe. Corregirlo es una línea y entra en el mismo change porque es la misma
causa —una ruta con espacio— manifestada en otro archivo.

El **fail-open del guardrail** —salir en verde ante un directorio ausente— es un
defecto distinto, en una action **publicada que los consumidores ejecutan**.
Endurecerlo puede enrojecer a un repo que hoy pasa, así que por la regla de
`AGENTS.md` se estrena en modo aviso y se endurece en la mayor siguiente. Va en su
propio change, y este proposal lo declara con destino en vez de dejarlo mudo.
