# ADR 004 — El área fija su base tecnológica, incluida la infraestructura, y es la primera opción

- **Fecha**: 2026-08-18 (decidida), registrada 2026-08-20
- **Estado**: aceptada
- **Decisores**: builders (con el PO informado; el gate del PO está acotado a la
  capability de gobernanza)

## Contexto

El marco sostenía dos frases contradictorias sobre lo mismo, y las dos estaban
escritas acá. `README.md` declaraba **«No impone stack»** en la lista de «Qué NO
es Projects». El `AGENTS.md` de la plantilla declaraba, de las filas Infra, CI/CD y
Package manager de su tabla de stack, que **«llegan llenas porque no son elección
del proyecto»**. Una declaración falsa en prosa no se puede razonar: no dice qué
está fijado, no dice quién lo cambia y no le da ninguna salida al proyecto que
necesita otra cosa.

**La base ya era el estado de hecho, 2 de 2, tipeada a mano dos veces.** Los dos
proyectos del área coincidían capa por capa —React + Vite + TypeScript, Node +
Express, PostgreSQL, Clerk, Zod, AWS + Terraform, GitHub Actions, pnpm con
workspaces, Vitest— y también en la topología: los dos corrían el backend como
contenedor de Express sobre ECS y los datos en una base relacional administrada.
Cada uno la había escrito por su cuenta, y la deriva ya había empezado en los
detalles: uno pinaba «React 18» y el otro no; uno decía «Aurora Serverless v2» y
el otro «Aurora PostgreSQL».

**Y el scaffold delegaba exactamente lo que ya estaba decidido**: entregaba la
tabla con huecos en Frontend, Backend, Datos, Auth, Validación de input y Tests,
bajo la instrucción «COMPLETAR AL CREAR EL PROYECTO», con el motivo escrito de que
«una plantilla que trae el stack de otro proyecto miente desde el día 1». Con la
base fijada ese motivo se invierte: no es el stack de otro proyecto, es el del
área. El resultado era el peor de los dos mundos — el proyecto tres volvía a
tipear la misma tabla y lo que escribiera mal no lo cazaba nada.

**Había además un change esperando esta decisión.** `entrega-referenciada`
flagueaba sin cerrarlo que «dónde queda escrita la infraestructura fijada y la
reescritura de "No impone stack" son decisiones del change de contrato», porque
sus actions nuevas codifican Express sobre ECS y base relacional administrada. Sin
esta decisión, esa topología quedaba **quemada** en el carril referenciado —el que
llega a todos los consumidores sin que nadie lo revise— sin ningún contrato que
dijera qué hace un proyecto que legítimamente no cabe en ella.

### Alternativas descartadas

- **Dejar «no impone stack» y quitar lo que el scaffold fija.** Sería coherente y
  cuesta el carril de entrega entero: una promoción que sabe desplegar
  «cualquier cosa» no sabe desplegar nada, y el 100% de los proyectos paga una
  generalidad que usa ninguno.
- **La forma débil: excepción registrada DESPUÉS.** Rechazada explícitamente. Su
  modo de falla ya estaba escrito en el propio canónico: «descubrir en el review
  que el servicio ya está desplegado convierte la decisión en un hecho
  consumado». Un review sobre algo ya desplegado no evalúa una decisión, la
  ratifica.
- **Base sin salida.** La rigidez sin salida legal no produce cumplimiento,
  produce evasión: el proyecto copia el workflow del marco a su repo o forkea
  Projects, que son las dos cosas que el marco prohíbe.
- **Nombrar las piezas dentro de los requirements.** Rompe la simetría con las
  ocho capabilities vivas, que no nombran una sola tecnología, y crea dos tablas
  —la del spec y la del canónico— que pueden divergir. El nombre del servicio es
  **dato**; que haya un solo dato y que nadie lo cambie por su cuenta es la
  **propiedad**.

## Decisión

El área **fija su base tecnológica**, incluida la infraestructura, y Projects la
publica en **un solo lugar** que los proyectos consumen sin copiar: el bloque
`base` del manifiesto del canónico, que se renderiza en la sección que los agentes
cargan. Las capas son cómputo, persistencia, frontend, backend, identidad,
validación de input externo, IaC, pipeline, gestor de paquetes y pruebas
(unitarias y E2E).

La base es la **primera opción siempre**. Apartarse de cualquier capa se
**pregunta ANTES de implementar**, y el desvío se declara con aprobador nombrado,
fecha y motivo escrito. Cada capa tiene su propia regla con id estable
(`base-capa-<capa>`), así que un desvío nombra la capa por construcción, queda
acotado a ella y caduca solo el día que esa capa deja de existir.

Se **revierte «no impone stack»**: el README pasa a decir que el marco trae una
base y que la salida está declarada. La base nombra la **pieza**, no su versión
mayor.

## Consecuencias

- **Lo bueno.** Una capa se corrige una vez para todos. El proyecto nuevo no
  vuelve a tipear la tabla, así que no puede tipearla mal. Y el marco puede
  codificar la topología en sus piezas de entrega sin parámetros especulativos,
  que es lo que `entrega-referenciada` necesitaba para no quemar la decisión.
- **Lo caro, y hay que decirlo sin adornos: el proyecto que se aparta paga más
  que antes.** Pierde el carril de entrega y mantiene su propio despliegue. Es
  deliberado —es el precio de que los demás no paguen la generalidad— pero para
  ese proyecto adoptar Projects vale menos que para los otros.
- **El check compara declaraciones, no infraestructura desplegada.** Lo que hace
  que declarar mentira no pague no es otro check: es que el carril de entrega solo
  sabe desplegar la base, así que el repo que se aparta sin declararlo no queda
  con un check verde y un problema oculto, queda sin deploy. Esa contención es
  **estructural**, y se debilita el día que exista una segunda forma de desplegar
  dentro del marco.
- **«Preguntó antes» no es verificable**, solo «está contestado por escrito antes
  de integrarse». Un equipo decidido a implementar primero y pedir después puede
  hacerlo; lo que no puede es que pase inadvertido.
- **Trigger de reevaluación.** La evidencia son **dos** proyectos que
  coincidieron. `entrega-referenciada` fija el umbral: *dos son un dato, tres son
  una premisa equivocada*. El **tercer** proyecto que necesite apartarse de la
  capa de cómputo o de persistencia reabre esta decisión, no su desvío. Y Projects no
  lee los repos de los consumidores, así que contarlos sigue siendo la revisión
  trimestral: es deuda declarada, no resuelta.

## Cómo lo hace cumplir el marco

- **`Base tecnologica declarada`**, paso del job `higiene` del workflow reusable:
  compara el bloque `base` del archivo de valores del consumidor contra la base
  publicada. Capa distinta sin desvío, rojo; **sin bloque, también** —la ausencia
  no es «no aplica», es una comprobación que no se pudo hacer—. Se estrena en modo
  aviso con la ventana de gracia del ledger: un endurecimiento que pone rojo el día
  uno a un repo que hoy pasa es breaking sobre un tag móvil.
- **El banco de pruebas de la action `constitucion`** cubre los cinco casos: sin
  bloque, base igual, capa distinta con desvío, capa distinta sin desvío, y desvío
  que nombra una capa que la base no publica.
- **Fuente única, verificada**: la base se renderiza desde el manifiesto, así que
  no hay una segunda copia que pueda divergir; y el CI de Projects compara el dato
  inline del workflow reusable contra el manifiesto, porque desde ese workflow no
  hay con qué leer el canónico.
- **Lo que NO tiene check, dicho**: distinguir «corrección de redacción» de
  «cambio de base» no es mecanizable. Lo acota que la base viva bajo CODEOWNERS y
  que un cambio de base exija su decisión escrita.
