---
artefacto: tasks
dri: Builder 1
aprueba: Builder 2 (builder par)
informado: PO / Builder 2
estado: pendiente-de-revision
---

# stack-estandar — Tasks

**Dependencia dura con `reglas-al-dia`, y va primero.** Este change consume tres
piezas de ese change como dadas: el artefacto de constitución que los agentes
cargan, el ledger de versiones con su ventana de gracia, y el canal de desvíos
con aprobador y motivo escrito. Ningún bloque de acá arranca antes de que esas
tres existan en `main`: si la base se publica sin ese carril, la tabla de stack
vuelve a ser texto que cada repo copia a mano, o sea el problema que este change
existe para cerrar.

**Dependencia en la otra dirección con `entrega-referenciada`.** Ese change
necesita el requirement 3 de acá (la cláusula anti-quemado) para poder codificar
la topología fija en sus actions sin dejar sin salida a un proyecto distinto. El
orden correcto es: este contrato aprobado → sus actions. Si por cualquier razón
sale primero el otro, su design tiene que anotar que la salida está flagueada y
no escrita, que es exactamente el estado que hoy declara en
`entrega-referenciada/design.md:350-354`.

## 0. El contrato (este bloque es el change mismo)

- [x] 0.1 Delta de la capability nueva `base-tecnologica` con los tres
      requirements y sus scenarios. Evidencia:
      `openspec/changes/stack-estandar/specs/base-tecnologica/spec.md`.
- [x] 0.2 Proposal y design con las alternativas descartadas —incluida la de
      nombrar las piezas dentro del requirement (D2)— y la reconciliación de
      `README.md:265-270` escrita, no delegada. Evidencia: `proposal.md`,
      `design.md`.
- [ ] 0.3 Validar por **código de salida**, no grepeando salida:
      `npx --yes "@fission-ai/openspec@1.9.0" validate --all --strict; echo $?`
      → `0`, y el guardrail de deltas
      (`node actions/guardrail-deltas/check-openspec-deltas.mjs`) → `0`.
      Evidencia: los dos exit codes pegados en el PR.
- [ ] 0.4 Revisión adversarial del delta por el builder par. El guardrail tiene
      un hueco conocido (un `MODIFIED` cuyo título no existe en el spec vigente
      no avisa, `AGENTS.md:78-84`); acá el delta es todo `ADDED`, así que lo que
      hay que revisar a mano es lo contrario: que ninguno de los tres
      requirements repita una propiedad que ya vive en otra capability.
      Evidencia: comentario del revisor nombrando las capabilities contra las que
      contrastó.
- [ ] 0.5 Dejar escrito el `Purpose` de la capability **para el PR del archive**.
      Una capability que nace por `openspec archive` nace con `Purpose: TBD` y
      completarlo es parte de ese mismo PR (`canonico/10-openspec.md:52`). Texto a copiar:

      > La base tecnológica del área: qué pieza corre en cada capa —cómputo,
      > persistencia, frontend, backend, identidad, validación de input externo,
      > infraestructura como código, pipeline, gestor de paquetes y pruebas—,
      > publicada en un solo lugar que los proyectos consumen sin copiar y
      > entregada ya escrita. La base es la primera opción de todo proyecto;
      > apartarse de una capa exige aprobación humana antes de implementar la
      > alternativa, queda acotado a esa capa, y no exime de ninguna otra
      > propiedad del marco. Las piezas de entrega del marco pueden codificar la
      > base; el contrato queda satisfacible sin ellas, para que un proyecto con
      > una necesidad legítimamente distinta conserve las propiedades siendo
      > dueño de su despliegue.

      Evidencia: el texto en el PR del archive, y `grep -n "Purpose: TBD"
      openspec/specs/base-tecnologica/spec.md` → sin resultados.

## 1. La base publicada, con fuente única

- [ ] 1.1 Declarar la base en el manifiesto del canónico
      (`actions/constitucion/canonico/manifiesto.json`) como bloque capa → pieza,
      con las once capas: cómputo, persistencia, frontend, backend, identidad,
      validación de input externo, IaC, pipeline, gestor de paquetes, pruebas
      unitarias, pruebas E2E. Valores de la decisión del 2026-08-18: Express
      sobre ECS; base relacional administrada (PostgreSQL); React + Vite +
      TypeScript; Node + Express; Clerk; Zod; AWS + Terraform; GitHub Actions;
      pnpm con workspaces; Vitest; Playwright. Evidencia: el diff del
      manifiesto, y el `presupuesto_lineas` del canónico todavía en verde.
- [ ] 1.2 Imprimir la base en la sección del canónico que la publica, con su id
      de regla estable (el patrón `<!-- projects:regla id=... -->` que ya usa
      `canonico/60-infra-aws-secretos.md:3`), **renderizada desde el
      manifiesto** y no tipeada al lado. Evidencia: artefacto renderizado con la
      tabla, y el check de constitución en verde.
- [ ] 1.3 Reemplazar la tabla de `plantilla/AGENTS.md:57-73`: se van los seis 🕳️
      y la instrucción «COMPLETAR AL CREAR EL PROYECTO»; queda una sección corta
      de «lo que este proyecto agrega sobre la base». Y se cae el paso 1 de
      «Antes del primer commit» (`:32-33`), que hoy pide llenar el stack.
      Evidencia: `grep -c "🕳️" plantilla/AGENTS.md` baja en seis, y el bootstrap
      de un repo de prueba no pide llenar ninguna capa.
- [ ] 1.4 Check en el CI de **Projects**: la tabla que entrega el scaffold y la base
      del canónico no divergen porque salen del mismo manifiesto. Evidencia:
      corrida en rojo con las dos desalineadas a propósito, y en verde tras
      re-renderizar.

## 2. El check del consumidor, en el carril referenciado

- [ ] 2.1 Paso nuevo `Base tecnologica declarada` en el job `higiene` de
      `.github/workflows/marco-ci.yml`: compara el bloque de base del archivo de
      valores del consumidor contra la base publicada por la versión vigente del
      canónico. Capa distinta sin desvío → rojo. **Sin bloque → rojo**, nunca
      `exit 0` mudo (D6, y la doctrina que el hermano fijó en su D7). Evidencia:
      el paso corriendo, con su `permissions` auditado acción por acción antes
      del estreno.
- [ ] 2.2 Fixtures dentro de la action, corriendo en el CI de Projects, uno por
      caso: (a) sin bloque de base; (b) base igual a la publicada; (c) capa
      distinta con desvío aprobado; (d) capa distinta sin desvío; (e) desvío que
      nombra una capa que la base no tiene. Evidencia: los cinco veredictos en el
      log del job.
- [ ] 2.3 Verificar el YAML por código de salida, no por grep de la salida:
      `npx --yes js-yaml@4.1.0 .github/workflows/marco-ci.yml >/dev/null 2>&1;
      echo $?` → `0`, y `actionlint -shellcheck= ...; echo $?` → `0` (en Windows
      `-shellcheck=` es obligatorio: con la forma `-shellcheck <ruta>` el proceso
      hace deadlock). Evidencia: los dos exit codes.
- [ ] 2.4 Mensaje de error del check: nombra la capa, la pieza declarada, la
      pieza de la base y **cómo se declara el desvío**. Un rojo sin la salida
      escrita empuja al atajo (editar la declaración para que coincida), que es
      la mentira que D6 no puede cazar. Evidencia: el texto del fallo en el log
      de un fixture.

## 3. La reconciliación de la documentación

- [ ] 3.1 Reemplazar el bullet `README.md:265-270` («No impone stack») por el
      texto de D7. Evidencia: `grep -n "No impone stack" README.md` → sin
      resultados, y el bullet nuevo nombrando la capability.
- [ ] 3.2 Reemplazar `AGENTS.md:181-183` («su deploy con la topología de su
      infraestructura» es del proyecto) por el texto de D7: el proyecto de la base
      es dueño de la **configuración** de sus ambientes, no de la mecánica; el
      proyecto con desvío aprobado es dueño de su deploy entero. Es la otra mitad
      que `entrega-referenciada/tasks.md:44-51` asignó a este change, y sin ella
      sus actions contradicen la constitución del propio marco. Evidencia:
      `grep -n "topología de su infraestructura" AGENTS.md` → el texto
      reconciliado, y el check 0.3 de ese change hermano pasando.
- [ ] 3.3 Revisar la prosa de las cuatro formas de distribución
      (`README.md:61-66` y su contexto): la tabla de stack deja de ser *scaffold*
      y pasa a llegar por el artefacto del marco. La tabla de las formas no
      cambia; sí lo que se dice de la fila Scaffold. Evidencia: el diff, y una
      lectura de coherencia del README completo.
- [ ] 3.4 ADR nuevo en `docs/adr/` (siguiente número disponible): fijar la base
      tecnológica del área, incluida la infraestructura, y revertir «no impone
      stack». Es la clase de decisión estructural que esa carpeta guarda, y el
      change archivado guarda el porqué operativo pero no queda en el índice de
      decisiones. Evidencia: el archivo y su entrada en `docs/adr/README.md`.
- [ ] 3.5 Coherencia con el canónico: la frontera ⚠️ de apartarse
      (`canonico/40-fronteras.md:93-97`) y el texto de infraestructura
      (`canonico/60-infra-aws-secretos.md:5-11`) tienen que apuntar a la base
      renderizada en vez de repetirla en prosa. Dos textos que dicen la misma
      base son dos textos que pueden divergir. Evidencia: `grep` de la topología
      escrita a mano en el canónico → una sola aparición, la renderizada.

## 4. Los dos consumidores

- [ ] 4.1 `proyecto-origen`: agregar el bloque de base a su archivo de
      valores. Verificado al abrir este change: su tabla
      (`AGENTS.md:28-37`) coincide capa por capa con la base, y su topología
      también (`infra/ecs.tf`, `infra-prod/database.tf`), así que el PR es el
      bloque y nada más y el check nace verde. Evidencia: el check en verde en su
      PR, sin ningún desvío declarado.
- [ ] 4.2 `intranet`: ídem sobre la rama de adopción. Su tabla
      (`AGENTS.md:18-28`) también coincide, y su `infra/` también es ECS.
      **Cuidado con el ruido**: que no exista `infra-prod/` ni suite E2E
      (`:25,28`) **no** es un desvío de la base sino un pendiente del proyecto
      (D5) — si entra por el canal de desvíos, el ledger deja de significar lo
      que tiene que significar. Evidencia: el check en verde, cero desvíos
      declarados, y las dos ausencias anotadas como pendientes donde
      correspondan.
- [ ] 4.3 Escribir en el change lo que la migración enseñó. Si los dos PRs son
      triviales, eso **es** el hallazgo: el check nació verde en el 100% de la
      población y por lo tanto está poco probado, que es la razón de D8 y no una
      formalidad. Evidencia: párrafo en el PR final del change.

## 5. Estreno

- [ ] 5.1 Entrada de `CHANGELOG.md` en el **mismo PR** que introduce el cambio,
      con la sección «qué tiene que hacer un consumidor»: declarar su base. No es
      breaking para `@v1` —el paso se estrena en modo aviso con la ventana de
      gracia del ledger— y eso se dice explícitamente. Evidencia: el diff del
      CHANGELOG.
- [ ] 5.2 Validar contra un consumidor real apuntando al SHA de la rama, no al
      tag, y revertir el pin en el mismo PR que lo introdujo
      (`AGENTS.md:176-179`). Evidencia: la corrida verde en el consumidor con el
      SHA pinado, y el commit que revierte el pin.
- [ ] 5.3 Mover `v1` recién después de 4.1, 4.2 y 5.2 (`AGENTS.md:150-156`).
      **Requiere OK humano** (`AGENTS.md:233`): no se hace en una sesión sin
      alguien mirando. Evidencia: el tag movido y el release con su nota.
