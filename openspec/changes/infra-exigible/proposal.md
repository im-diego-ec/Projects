---
artefacto: proposal
dri: Builder 1
aprueba: revision adversarial (desvio del marco: un solo mantenedor, ver AGENTS.md)
informado: PO / Builder 2
estado: en-ejecucion
---

# infra-exigible — Proposal

> **Estado al 2026-09-17: se cierra reformulado.** El change nació el 2026-08-23 para que el
> andamio entregara `infra/` e `infra-prod/`; eso está hecho desde el bloque 1. Lo que lo
> tenía sin archivar era su propio delta: pedía una compuerta que nadie iba a construir y
> contradecía al requirement que ya se había promovido al spec vivo. Este cierre —lote 12 del
> porte de mejoras de Rigel— lo reformula, lo fusiona con ese requirement y le suma lo que
> Rigel aprendió después sobre los mismos pendientes. El aprobador no es el PO: su gate en
> este repo está acotado a `gobierno-contribucion`, y este delta toca `operacion-infra`.

## Why

### El hueco que abrió el change (2026-08-23)

**La regla existía y llegaba a todas las sesiones; lo que no existía era el lugar donde
apuntaba.** La constitución nombraba `infra/` (dev) e `infra-prod/` (producción) y el andamio
no creaba ninguno de los dos. Medido ese día:

```
find . -name "*.tf"                              → 0 archivos en todo el marco
ls plantilla/infra plantilla/infra-prod          → no existen
```

Un agente que carga una regla que apunta a un directorio vacío improvisa exactamente donde el
marco no quiere improvisación. El tamaño de lo que cada proyecto habría reinventado, medido
contra el consumidor de referencia de entonces: 9 archivos `.tf` y 884 líneas en dev, 12 y
1226 en producción. Los bloques 1 a 3 lo resolvieron: el andamio reparte las dos raíces con
lo derivable funcionando y lo que falta decidir escrito como **pendiente** con su criterio.

> **La cita que este change hacía de la constitución quedó vieja, y el requirement ya no se
> apoya en ella.** Decía «IaC = Terraform, sin excepción». El canónico dice hoy
> (`actions/constitucion/canonico/60-infra-plataforma-secretos.md`, regla `iac-es-terraform`)
> que Terraform es **la forma por defecto** y que una plataforma cuyo despliegue no pasa por
> Terraform lo declara en su adaptador. El requirement reformulado habla de «la forma que la
> constitución fija para su plataforma», no de Terraform sin excepción.

### Por qué se cierra reformulado (2026-09-17)

Tres defectos, los tres con su origen en Rigel y los tres medidos en este árbol.

**1. El delta pedía una compuerta que nadie iba a construir, y eso bloqueaba el archive.** El
`ADDED` decía «la verificación SHALL fallar mientras sobreviva un hueco sin resolver», lo
repetía en su título —«y lo que falta es compuerta»— y en su escenario 1 —«el pipeline falla
nombrando cada hueco»—. El árbol dice lo contrario desde el 2026-08-24: la corrección D8 pasó
los pendientes a un token propio (`PENDIENTE-INFRA`) **precisamente para que nada fallara**, y
el requirement que se promovió al spec vivo ese día (`openspec/specs/operacion-infra/spec.md`,
«El andamio entrega los huecos de decisión de infraestructura con su criterio») dice «lo que
este requirement NO exige todavía… que el hueco esté RESUELTO», con un escenario que pasa con
todos los huecos abiertos. Archivado como estaba, el spec vivo habría dicho las dos cosas en
la misma capability. Y la última tarea abierta decía «este change NO se archiva hasta que
exista [la compuerta]»: un change bloqueado por una compuerta que nadie va a construir es
deuda sin dueño.

Rigel resolvió lo mismo en su 1.10.0 (change archivado `2026-08-29-infra-exigible`). La
revisión adversarial de su change `dev-alcanzable` encontró el bloqueante «misma capability,
veredictos opuestos» (commit `cb4cb13`); se retiró la cláusula del cuerpo, y en el archive
(`462dc14`) apareció que el **título y el escenario 1 seguían pidiendo rojo** —«arreglar la
prosa y dejar el escenario es no haber arreglado nada»—. La tarea de verificar en un
consumidor quedó cerrada aparte (`160375e`).

**2. Dos requirements vivos de `operacion-infra` se contradicen sobre las alarmas.** «Las
caídas se detectan por alarma, no por reporte humano» fija un mínimo (5xx sostenidos,
reinicios anómalos, niveles de alerta en el log); «El andamio entrega los huecos…» dice que lo
exigido de las alarmas «NO SHALL ser cuáles ni cuántas». El CHANGELOG de la 1.7.0 lo afirmó
con todas las letras —«Las alarmas se exigen como propiedad y jamás como lista»— y el andamio
lo repite en el pendiente de alarmas de `infra-prod/pendientes.tf` y en su `README.md`.

Rigel lo cerró el 2026-09-14 (change `las-alarmas-no-se-contradicen`, issue #330, commits
`373f378` y `04166e8`): la cláusula se acotó a su verificación y la lista se conservó, porque
su action `ambiente-de-produccion` ya exigía alarmas concretas. **Projects no tiene esa action**,
así que la salida de Rigel no se puede copiar con su motivo. Y el mínimo estaba escrito en
vocabulario de un proveedor —reinicios «de las instancias de cómputo», alertas «vía filtro de
métrica»— en un marco que desde la decisión D4/D5 del PO no fija la nube. Acá se resuelve **por
capacidad**: el mínimo se conserva, enunciado por lo que la alarma detecta y no por el producto
que la arma.

**3. Los pendientes no dicen cuándo se resuelven, y el de los logs no existe.**

- **El momento.** El 2026-08-28 el segundo consumidor de Rigel llegó al bloque 7 de 14 con sus
  seis pendientes de infraestructura intactos, ninguno mal escrito: decían qué faltaba, con qué
  criterio se decidía y qué quedaba sin garantía, y ninguno decía **cuándo**. Rigel 1.9.0
  (change `dev-alcanzable`, commit `78c693c`) les sumó «CUÁNDO SE RESUELVE» y su banco pasó de
  tres partes a cuatro. En Projects, `grep "CUÁNDO" plantilla/infra*/pendientes.tf` salía vacío.
- **La retención y la clase del grupo de logs.** El contrato («Higiene operativa de logs y
  TLS») exige retención explícita en IaC en cualquier ambiente, y la clase del grupo **no se
  puede cambiar después de crearlo**. Rigel agregó el pendiente en dev en su 2.4.0 (change
  `la-clase-del-log-group`, commit `125d228`) y en su 2.5.0 descubrió que producción —el
  ambiente que no se puede rehacer— no lo tenía, escondido detrás de un README que decía
  «siete» (change `el-ambiente-se-exige`, commit `6b91fef`). En Projects no estaba en ninguno:
  `grep -E 'log_group_class|INFREQUENT_ACCESS|retention_in_days' -r plantilla/` daba 0. Y la
  fila de «Higiene operativa de logs y TLS» en `openspec/cobertura-de-requirements.md` decía
  «parcial: el pendiente correspondiente entra en la guarda» sobre un pendiente que no existía.
- **La misma forma en los pendientes de plataforma.** `plantilla/infra/adaptadores.md`
  anunciaba «la misma forma de tres partes que usa `pendientes.tf`». Con cuatro partes, esa
  frase habría mentido sin que nada se pusiera rojo, y el pendiente «el marco» ya no tenía
  «CÓMO SE DECIDE».

## What Changes

- **El delta deja de agregar un requirement y reformula el que ya está vivo.** El `ADDED` se
  retira y su contenido se funde, por `RENAMED` + `MODIFIED`, en el requirement promovido el
  2026-08-24, que pasa a llamarse «La infraestructura de un repositorio desplegable vive en su
  árbol, entregada por el andamio». Sale la cláusula del rojo —cuerpo, título y escenario—;
  entra que la forma de una señal sobre los pendientes la decide el change que mida por
  plataforma la llegada al ambiente; el pendiente pasa a tener **cuatro** partes; el de los
  logs se exige en todos los ambientes; y la cláusula de las alarmas se acota a **esta
  verificación**. Los cuatro escenarios vivos se reproducen.
- **«Las caídas se detectan por alarma» se enuncia por capacidad**, con sus dos escenarios
  reproducidos y uno nuevo para una plataforma que no es la que el andamio reparte escrita.
- **Andamio (adaptador `aws`)**: «CUÁNDO SE RESUELVE» en los trece pendientes que había; el
  pendiente nuevo de **la retención y la clase del grupo de logs** en dev (7) y en producción
  (8); el de alarmas separa el **piso** que no se elige de lo que el negocio elige por encima;
  los dos `README.md` cuentan siete y ocho y dicen las cuatro partes.
- **Catálogo de adaptadores**: los ocho `PENDIENTE-PLATAFORMA` ganan «CUÁNDO SE RESUELVE»,
  «el marco» gana «CÓMO SE DECIDE», y el encabezado anuncia cuatro partes.
- **Banco** (`pruebas/andamio/infra-pendientes.test.mjs`): una sola lista de cuatro partes para
  los dos tokens; el pendiente de logs en las dos raíces; los `PENDIENTE-PLATAFORMA` con la
  misma forma; tres mutaciones nuevas; y la mordida pasa a medirse contra el árbol real.
- **Documentación**: `docs/05-arrancar-tecnico.md`, las filas 22 y 23 de
  `docs/11-reglas-no-escritas.md` y cuatro filas de `openspec/cobertura-de-requirements.md`.

**Lo que este change NO hace, y el motivo de cada cosa:**

- **No construye una señal sobre los pendientes sin resolver.** Su disparador es «este
  repositorio llegó a su ambiente», medido por plataforma, y ésa es otra pieza del porte (la
  que trae el aviso de Rigel `aviso-llego-al-ambiente` adaptado a los adaptadores). Cuando
  llegue, la decisión D1 del PO —una compuerta nueva sale en rojo el día que sale— y la D6 —no
  desplegar es legítimo— le fijan el marco.
- **No porta el bucket del state como marcador.** Rigel lo pasó a `{{BUCKET_STATE_DEV}}` y
  `{{BUCKET_STATE_PROD}}` porque en su área hay un bucket por cuenta compartido; es un dato de
  esa organización, no del marco. El pendiente 1 se queda y gana su momento.
- **No porta la inversión de Rigel** «todo consumidor SHALL tener ambientes, y un repositorio
  que no los tiene SHALL quedar en rojo aunque eso lo detenga» (change `el-ambiente-se-exige`):
  contradice la decisión D6 del PO. El requirement conserva la inercia y la cita.
- **No agrega el pendiente de retención de logs a los adaptadores que no son `aws`.** Cada
  proveedor tiene su propia retención y su propia forma de fijarla, y el marco no escribe un
  límite de plataforma sin medirlo contra la página del proveedor con fecha
  (`costo-declarado-con-techo`). Queda como tarea abierta.
- **No construye la compuerta de «Las caídas se detectan por alarma».** Tampoco existe en Rigel
  (su #344). Este change deja el contrato en condiciones de que alguien la escriba sin elegir
  antes entre dos textos.

## Capabilities

### Modified Capabilities

- `operacion-infra`: `RENAMED` + `MODIFIED` de «El andamio entrega los huecos de decisión de
  infraestructura con su criterio» (pasa a «La infraestructura de un repositorio desplegable
  vive en su árbol, entregada por el andamio»), y `MODIFIED` de «Las caídas se detectan por
  alarma, no por reporte humano». Ningún `ADDED`, ningún `REMOVED`.

## Impact

**Distribución.** *Canónico*: el delta de `operacion-infra`. *Scaffold*: los dos
`pendientes.tf` y los dos `README.md` del adaptador `aws`, y `infra/adaptadores.md`.
*Referenciado*: nada. *Regenerado*: nada. El banco y la documentación son del marco y no viajan.

**Impacto en los consumidores: nada que hacer, y ningún pipeline cambia.** Los tres consumidores
reales —todos en `@v1.9.6`— no reciben nada de esto por el PR de actualización de versión: no
cambia ningún workflow, action, `input`, `output`, permiso ni nombre de job, y el contenido del
andamio se copia una sola vez al crear el proyecto. Un consumidor nacido con la plataforma `aws`
puede copiar a mano el pendiente de logs y los «CUÁNDO SE RESUELVE» —el fragmento del CHANGELOG
dice cuáles—; ninguno queda en rojo por no hacerlo. El mínimo de alarmas reescrito por capacidad
no es más estricto: son las mismas tres detecciones, sin el producto.

**Impacto en un repositorio nuevo.** Nace con siete pendientes en dev y ocho en producción, cada
uno con su momento. Su CI no cambia: los pendientes siguen sin compuerta, y la guía de arranque
lo sigue diciendo.

**Contrato: MINOR.** Cambia lo que un proyecto nuevo hereda y el enunciado de un spec canónico,
sin endurecer ningún check que corra en un consumidor.

## Fuera de alcance, declarado

- El Terraform con recursos reales, el workflow de despliegue de una aplicación y
  `verificar-prod` como pieza referenciada.
- La señal —aviso o rojo— sobre pendientes sin resolver, y la medición por plataforma de la
  llegada al ambiente.
- La retención de logs de las plataformas que no son `aws`.
- Las otras garantías operativas del tercer nivel —presupuesto, backups, restore—.
