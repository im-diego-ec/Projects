# gobierno-contribucion — Delta

## ADDED Requirements

### Requirement: El descubrimiento llega al contrato con procedencia, y no lo reemplaza

Cuando un change nace de material de descubrimiento —entrevistas, procesos
levantados, investigación—, el repositorio SHALL conservar los artefactos
derivados de ese material en una **ubicación declarada, fuera del árbol de
specs**, y cada requirement del change —y cada escenario que lo ilustra— SHALL
poder rastrearse hasta el ítem de material que lo origina.

La trazabilidad que el repositorio ya exige va del cambio hacia el spec. Esta va
en la dirección contraria y cierra un hueco distinto: sin ella, un requerimiento
inventado y un requerimiento levantado son **indistinguibles** una vez escritos
como escenario, y ningún check puede separarlos porque los checks comparan el
spec contra el código, no contra la realidad del negocio.

La autoridad sobre el comportamiento SHALL seguir siendo únicamente los specs
vivos. Un artefacto de descubrimiento NO SHALL adoptar la forma de un spec, y el
pipeline SHALL rechazarlo cuando lo haga: un documento con forma de contrato **se
lee** como contrato, y así queda gobernando el comportamiento sin haber pasado
por la aprobación ni por la validación que el contrato exige.

El material crudo que contiene datos de personas NO SHALL entrar al repositorio.
La trazabilidad SHALL apoyarse en identificadores estables del material y no en
su contenido, de modo que la procedencia se pueda seguir sin que el repositorio
se vuelva custodio de ese material.

Todo supuesto que el descubrimiento no pudo resolver SHALL quedar marcado como
abierto en el artefacto donde vive, y un supuesto abierto SHALL impedir que el
change se archive. Proponer y diseñar con dudas declaradas es legítimo;
convertirlas en garantía por omisión no lo es, y el archive es el instante exacto
en que eso ocurriría.

#### Scenario: Un escenario que nadie puede rastrear
- **WHEN** un change nacido de material de descubrimiento declara un escenario que no apunta a ningún ítem de ese material, o lo apunta en blanco
- **THEN** el pipeline falla nombrando el escenario sin procedencia, porque un requerimiento inventado y uno levantado son indistinguibles una vez escritos y esta es la única señal que los separa

#### Scenario: Un insumo con forma de contrato
- **WHEN** un artefacto de la ubicación declarada para el descubrimiento contiene encabezados de delta o escenarios, o sea la forma con la que el repositorio expresa su contrato
- **THEN** el pipeline falla indicando que ese artefacto es insumo y que el contrato vive en los specs, porque un documento con forma de contrato se lee como contrato sin haber pasado por su aprobación ni por su validación

#### Scenario: Un supuesto que nadie resolvió
- **WHEN** el change que alimenta un artefacto de descubrimiento con supuestos todavía marcados como abiertos llega al momento de archivarse
- **THEN** el pipeline falla listando los supuestos abiertos, y el change se puede seguir proponiendo, diseñando e implementando, pero no archivando hasta que cada supuesto quede resuelto o convertido en una decisión escrita

#### Scenario: La procedencia se sigue sin que el material esté en el repositorio
- **WHEN** alguien quiere verificar de dónde salió un escenario y el material crudo no vive en el repositorio
- **THEN** el identificador estable que el artefacto declara lo lleva al ítem exacto del material, y la verificación se completa sin que el contenido de ese material —ni los datos de las personas que participaron— haya entrado al repositorio

### Requirement: El estado experimental de un change caduca por fecha

Un change puede declararse **experimental**: su propuesta existe, está revisada y
es citable, y todavía no es contrato porque falta la evidencia que la confirme o
la refute. Ese estado SHALL tener fecha de vencimiento.

Un change que se declara experimental SHALL declarar también la fecha en que su
veredicto vence. El pipeline SHALL rechazar el repositorio cuando esa fecha pase
sin veredicto registrado, y también cuando un change se declare experimental sin
fecha —de lo contrario la salida al rojo sería simplemente no declarar la fecha.

La verificación SHALL ser inerte para los changes que no se declaran
experimentales: un repositorio que no usa este estado NO SHALL ver ninguna señal
nueva. La caducidad existe contra un modo de falla concreto: un experimento que
nadie confirma ni descarta se queda en el repositorio, envejece, y con el tiempo
nadie puede distinguir una propuesta viva de un resto abandonado.

#### Scenario: Un experimento que llegó a su fecha sin veredicto
- **WHEN** un change declarado experimental alcanza la fecha de vencimiento de su veredicto y no hay veredicto registrado
- **THEN** el pipeline falla nombrando el change y su fecha, y sigue fallando hasta que el veredicto se registre —confirmando el experimento, acotándolo o descartándolo con su evidencia

#### Scenario: Un experimento sin fecha
- **WHEN** un change se declara experimental y no declara la fecha en que su veredicto vence
- **THEN** el pipeline falla, porque un estado experimental sin vencimiento es indistinguible de un resto abandonado y omitir la fecha sería la forma más barata de evitar el vencimiento

#### Scenario: Un change que no es experimental
- **WHEN** un change no se declara experimental
- **THEN** la verificación no emite ninguna señal sobre él, y ningún repositorio que hoy pasa empieza a fallar por la existencia de esta regla
