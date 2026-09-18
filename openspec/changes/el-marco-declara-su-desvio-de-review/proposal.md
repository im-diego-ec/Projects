---
artefacto: proposal
dri: Builder 1
aprueba: PO  # toca `gobierno-contribucion` (quién aprueba qué y cómo se revisa),
             # que es el gate del PO. El desvío lo decidió el PO el 2026-09-17, en
             # la sesión que fijó las reglas del porte de Rigel
informado: PO / Builder 2
estado: en-ejecucion
---

# El marco declara que tiene un solo mantenedor, y deja de esperar una revisión que no puede llegar

## Por qué

`AGENTS.md` pide, en los puntos 1, 2, 3 y 5 de su flujo, que lo que escribe un
builder **lo revise el otro**, y en «GitHub y estilo» que cada PR tenga **review
cruzado**. En este repositorio hay **una sola identidad con permiso de
escritura**. Medido el 2026-09-17:

```
gh api "repos/{owner}/{repo}/collaborators" --jq '.[] | "\(.login): \(.role_name)"'
→ un solo login, con rol admin
```

y `.github/CODEOWNERS` termina en un único handle, cosa que su propio encabezado
ya explica: GitHub pide la revisión a los dueños **excepto al autor**, así que con
un dueño que además escribe todos los PRs la resta da cero. La revisión cruzada
no está debilitada: **no existe**. Y nada lo decía en el lugar donde se aplica la
regla.

**Lo que esa ficción costaba, medido:**

- **58 líneas** `aprueba: Builder 2 (builder par)` o `revisa: …` en **58
  artefactos de 22 changes activos**, nombrando como aprobador a alguien que no
  está.
- **Once changes con todas sus casillas tildadas** esperando en
  `pendiente-de-revision` una revisión que no tenía de dónde salir, más
  `orden-de-lectura` con dos casillas abiertas que dependían de lo mismo.
- **2 changes archivados en Projects contra 38 en Rigel**, y **41 requirements
  vivos contra 81** (Rigel medido en `main`, `8e6487d`, 2026-09-14). El contrato
  vivo de Projects es la mitad del de Rigel no porque haga la mitad, sino porque
  lo terminado no se podía cerrar.

**El origen, en Rigel.** Rigel se trabó en lo mismo y se destrabó en su versión
**1.10.0** (commit `e48860d`, 2026-08-29, *«declarar el desvio del review cruzado
y corregir los 29 artefactos»*): un recuadro de desvío en su `AGENTS.md`, con su
aprobador, su fecha, su condición de retiro y lo que **no** cambia, más el
barrido del campo `aprueba` de 29 artefactos. Rigel además lo anotó en su
`.rigel-desvios.json`; acá eso no se puede, y el design explica por qué con la
medición.

**Lo que Rigel dejó sin cerrar, y este change sí:** en Rigel el desvío quedó
escrito y **nada lo sostiene** — un artefacto nuevo puede volver a nombrar al
builder par, el recuadro puede sobrevivir a la llegada del segundo builder, y un
change se puede archivar sin la revisión que reemplaza a la cruzada. Por la regla
de oro de este marco («si no falla solo, no es un guardrail») eso es
documentación, no gobierno. Acá lo sostiene un banco.

## Qué cambia

1. **`AGENTS.md` declara el desvío** en un recuadro pegado al flujo que anula:
   quién lo aprobó y desde cuándo, la **revisión adversarial con lentes
   independientes** que reemplaza a la cruzada y dónde se registra
   (`revision-adversarial.md` dentro del change), la **condición de retiro** —un
   segundo handle con permiso de escritura— con el comando que la mide, y lo que
   **no** cambia: la aprobación del PO sobre `gobierno-contribucion`.
2. **El barrido**: las 58 líneas pasan a
   `revision adversarial (desvio del marco: un solo mantenedor, ver AGENTS.md)`,
   conservando los comentarios que acotan el gate del PO. Las líneas `informado:`
   no se tocan: estar informado no es una compuerta.
3. **`openspec/config.yaml`** lo dice en las reglas del proposal, que es lo que
   lee quien escribe un artefacto nuevo.
4. **`.github/CODEOWNERS`** dice que la condición de retiro se lee de él.
5. **Un banco**, `pruebas/ci-del-marco/desvio-de-review-del-marco.test.mjs`, con
   seis reglas que se ponen rojas solas: el desvío existe con un solo dueño y
   está completo; se retira con dos; el `aprueba:` de un change activo toma un
   valor de una lista cerrada mientras rige, y deja de nombrarlo cuando se
   retira; todo change archivado desde el desvío trae su revisión registrada,
   con contenido y evidencia; todo change que toca `gobierno-contribucion`
   nombra al PO en su `aprueba:`; y ninguno de esos se archiva sin la constancia
   `aprobado_por_po:` en su proposal.
6. **Lo que el desvío desbloquea**: la revisión adversarial de los doce changes
   terminados, registrada en cada uno, y el archive de los que no necesitan otra
   aprobación. Los seis que tocan `gobierno-contribucion` quedan revisados y
   **esperando el OK del PO** —el desvío no toca esa aprobación, y fingirla sería
   repetir el defecto que este change cierra—.

## Qué NO cambia

- **La aprobación del PO sobre `gobierno-contribucion`.** Ni un builder ni una
  revisión adversarial pueden darla por él.
- **Los roles.** Siguen siendo `PO`, `Builder 1` y `Builder 2`; lo que el desvío
  declara es que hoy los ocupa una persona. Reasignarlos a personas distintas es
  editar `.github/CODEOWNERS`, un solo lugar.
- **El PR y el veredicto agregado de CI** siguen siendo obligatorios.
- **Los proyectos.** El desvío de un proyecto de una sola persona ya existía
  (`.projects-desvios.json`, lo escribe el asistente). Este es el del marco.

## Impacto en los proyectos consumidores

**Ninguno en su pipeline.** Hay tres consumidores reales en `@v1.9.6`
(`im-diego-ec/custodia-bingo`, `im-diego-ec/plantilla-sitio`,
`im-diego-ec/plantilla-aplicacion`), y nada de este change viaja a ellos: no se
toca ningún workflow reusable, ninguna action, ningún archivo del andamio, ningún
`input`, `secret`, `output`, permiso ni nombre de job. Lo que sí ven, en el PR de
bump de la versión que lo lleve, es el `CHANGELOG`: el marco tiene un mantenedor y
lo dice, y el contrato vivo crece con los requirements de los changes que se
archivan. Es **PATCH** del gobierno del repositorio, sin contrato de consumidor.
