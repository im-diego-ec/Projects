---
artefacto: proposal
dri: Builder 1
aprueba: revision adversarial (desvio del marco: un solo mantenedor, ver AGENTS.md)  # change técnico de `calidad-codigo`
informado: PO / Builder 2
estado: en-ejecucion
---

# Las dos ventanas del 2026-09-30 se cierran, y ninguna fecha vuelve a decidir una gravedad

`aprueba` es la revisión adversarial y no el PO porque el delta es de `calidad-codigo`,
que es maquinaria y no la capability de gobernanza del trabajo. Lo que sí es del PO —si
la ventana se cierra o se extiende, y qué pasa con Terraform— ya lo decidió: es la
decisión D9, citada abajo.

## Por qué

**El marco tenía dos fechas vivas, las dos el 2026-09-30, y este change era dueño de la
mitad.** La primera versión de este change nació el 2026-09-10 para darle dueño a una:

```js
// actions/cobertura-diff/medir-cobertura-diff.mjs:127 (en fcc9548)
const VENTANA_DE_GRACIA_HASTA = "2026-09-30";
```

Hasta esa fecha, un paquete por debajo del mínimo **sin deuda declarada**, una métrica
que el reporte no midió y un denominador más corto que el declarado salían en amarillo;
desde el día siguiente, en rojo, sin que nadie tocara una línea. Los pendientes que
quedaron vivos al archivar `2026-08-19-calidad-fail-closed` —el 4.5c y el 4.5d— hablaban
de esa fecha sin decir dónde vivía el trabajo, y al 2026-09-10 faltaban 20 días.

**La segunda la encontró una revisión adversarial y ningún change la planificaba.** El
input `ventana_terraform` del workflow reusable (`.github/workflows/marco-ci.yml:263-276`
en `fcc9548`, `default: "2026-09-30"`) hacía lo mismo con el job `terraform`: un archivo sin formato,
una raíz que no valida o **un runner sin el binario** avisaban hasta el 30 y detenían
desde el 1. Y el andamio traía una **tercera copia** de esa fecha
(`plantilla/.github/workflows/ci.yml:281` en `fcc9548`, `VENTANA_TERRAFORM: "2026-09-30"` en el env
de un paso inline), que la compuerta de fechas con dueño no veía: su patrón exigía el `=`
de JavaScript y no miraba `plantilla/`. Esa es la de peor pronóstico, porque el andamio
se copia una vez y después es del proyecto: vence en el repo de otro, sin PR de bump que
la anuncie.

**La justificación escrita de las dos ventanas caducó el 2026-08-21.** Decía que el
marco se consumía por el tag móvil `v1`, así que un check nuevo aparecía en el pipeline
de cada consumidor sin que nadie lo hubiera leído. Desde la distribución por versión
exacta, un veredicto nuevo llega dentro del PR de Dependabot que mueve el pin: el «modo
aviso» es ese PR.

**La decisión del PO (D9, 2026-09-17):** «La ventana de gracia se cierra. El
endurecimiento de Terraform queda anunciado para v2, y `ventana_terraform` queda como
no-op hasta v2.» Y la D1, que la enmarca: una compuerta nueva o endurecida se exige en
rojo el día que sale, salvo que su arreglo quede **fuera del árbol del consumidor**, que
entonces va en aviso o se trata como breaking. Terraform cae en esa excepción: el
binario ausente se arregla con un `hashicorp/setup-terraform` pinado que es del marco,
no del consumidor.

### El origen en Rigel

Rigel borró la misma ventana de cobertura en su **2.0.0**, antes de su fecha de cierre,
dentro del change `2026-09-05-linea-v2`, commit `771ba2c` (2026-09-04). De ahí vienen
tres cosas que este change porta: que endurecen **tres** veredictos y no uno (el
denominador corto era una amnistía que el contrato no nombraba), que dos casos del banco
del diff se apoyaban en la ventana y se arreglan con un fixture que declara `FNF:0`/`BRF:0`
en vez de aflojar la compuerta, y el banco que impide reintroducir la ventana **por
datos** (`exigible_desde` posterior a `publicada` en el manifiesto del canónico). Rigel
no tiene la segunda ventana: `ventana_terraform` es de Projects, y su tratamiento es la
D9.

## Qué cambia

1. **Cobertura (`cobertura-diff`, referenciado).** Se borra la ventana entera: la
   constante, el parámetro que la propagaba, el veredicto `sin-plazo-en-gracia`, las
   etiquetas y mensajes que la nombraban y el resumen que la anunciaba. Los tres
   veredictos son rojos cualquier día. La única fecha que la action mira es la que el
   propio paquete declara en su deuda.
2. **Terraform (`marco-ci.yml`, referenciado).** El input `ventana_terraform` queda
   declarado **sin efecto**, con default vacío; si llega con valor, un `::notice::` le
   dice al consumidor que no hace nada y que se quita en v2. La gravedad deja de salir
   del reloj y la fija el env `GRAVEDAD_TERRAFORM` del paso: `warning` en toda la línea
   1, `error` desde v2. Un banco la ata al CHANGELOG en las dos direcciones.
3. **El andamio deja de traer su propia copia del paso de Terraform** (scaffold). El
   `ci.yml` del andamio ya llama al reusable, cuyo job `terraform` mira las mismas
   raíces por default y corre también en los PRs que sólo tocan `infra/` —la copia vivía
   en `build_test`, que en esos PRs no corre—. La documentación del andamio que la
   nombraba (`AGENTS.md`, `infra/README.md`, `infra-prod/README.md`,
   `infra/adaptadores.md`) se corrige.
4. **La compuerta de fechas con dueño ve el andamio y la asignación YAML de una línea**, y
   su anti-vacuidad pasa a un sujeto sintético, porque en el árbol real ya no queda
   ninguna fecha que ver.
5. **Banco nuevo `pruebas/ci-del-marco/sin-exigibilidad-futura.test.mjs`**, de Rigel:
   ninguna versión del manifiesto del canónico se declara exigible después de publicada.

## La decisión que este change NO toma, y la que deja preparada

No quita el input `ventana_terraform` ni endurece el job `terraform`: las dos cosas son
breaking y van juntas en la línea v2, que se abre una sola vez con todos los breaking
(decisión D1). Lo que sí hace es que v2 **no se pueda publicar sin hacerlas**: el banco
de la línea mayor se pone rojo en el PR que agregue `## [2.0.0]` al CHANGELOG si el paso
sigue en `warning` o el input sigue declarado.

## Impacto en los proyectos consumidores

Hay **tres** consumidores reales, los tres en `@v1.9.6`: `im-diego-ec/custodia-bingo`
(privado; consume `marco-ci`, `constitucion`, `censo-fuentes` y `cobertura-diff`),
`im-diego-ec/plantilla-sitio` (público; además `desplegar.yml`) e
`im-diego-ec/plantilla-aplicacion` (público). La primera versión de este change decía
«cero consumidores»; hoy es falso, y se corrige.

- **Con su pin actual, el 2026-10-01 endurecen dos cosas solas**, porque las fechas
  viven en el código de la 1.9.6 que pinan: el total de `cobertura-diff` (tres veredictos
  a rojo) y el job `terraform` de `marco-ci.yml`. Este change no puede evitarlo: el
  código ya está publicado. Lo que sí hace es escribirlo en «Para consumidores» antes de
  la fecha, con el arreglo de cada uno.
- **Al subir a la versión que traiga este change**, la cobertura queda como la 1.9.6
  después del 30 —rojo, sin fecha— y el job `terraform` **avisa** hasta v2. Si la versión
  sale antes del 2026-10-01, el rojo de cobertura se adelanta a ese PR de bump (D1); si
  sale después, para la cobertura no cambia nada.
- **Un repo nacido del andamio entre la 1.8.0 y la 1.9.6 trae la copia inline del paso
  de Terraform con su propia fecha** (`VENTANA_TERRAFORM: "2026-09-30"`), y esa copia es
  scaffold: **no viaja con el bump**. El parche manual está en el fragmento del
  CHANGELOG (borrar el paso; el job del reusable hace lo mismo).

Contrato: **cambio de contrato dentro de la línea 1, autorizado por la D9 del PO**. Nada
se quita ni se vuelve requerido y el input sigue aceptándose, pero su default pasa de
`"2026-09-30"` a `""` y deja de tener efecto: `AGENTS.md` cuenta como breaking «cambiar
un valor por defecto de forma que cambie el comportamiento», y acá cambia —desde el
2026-10-01, un repo con hallazgos de Terraform pasa de rojo con la 1.9.6 a aviso con esta
versión—. La D9 lo decide así hasta v2 (design, D2), y «Para consumidores» lo nombra como
cambio de contrato. El endurecimiento de la cobertura, en cambio, es exigible el día que
sale (D1). La clasificación de distribución de cada pieza está en el design.
