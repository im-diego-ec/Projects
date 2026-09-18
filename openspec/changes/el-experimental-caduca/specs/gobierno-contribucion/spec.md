# gobierno-contribucion — Delta

## ADDED Requirements

### Requirement: El estado experimental de un change caduca por fecha

Un change puede declararse **experimental**: su propuesta existe, está revisada y
es citable, y todavía no es contrato porque falta la evidencia que la confirme o
la refute. Ese estado SHALL tener fecha de vencimiento.

Un change que se declara experimental SHALL declarar también la fecha en que su
veredicto vence. El pipeline SHALL rechazar el repositorio cuando esa fecha haya
pasado sin un veredicto registrado en el change, y también cuando un change se
declare experimental sin fecha —de lo contrario la salida al rojo sería
simplemente no declarar la fecha—. El día declarado todavía es vigente: el rechazo
empieza el día siguiente.

Un veredicto registrado SHALL ganarle a la fecha: un experimento que concluyó no
es un zombi aunque su fecha haya pasado, y exigir que se corra la fecha igual
convertiría la regla en una medida de prolijidad en lugar de conclusiones. Si los
artefactos de un change declaran fechas distintas, SHALL mandar la más temprana,
para que agregar un artefacto con otra fecha no corra el vencimiento sin que nadie
lo decida. Una declaración que no se puede leer —una fecha que no existe en el
calendario, o un estado experimental que no es verdadero ni falso— SHALL ser
rechazada y no tomarse por ausente.

La verificación SHALL ser inerte para los changes que no se declaran
experimentales y para los ya archivados: un repositorio que no usa este estado NO
SHALL ver ninguna señal nueva, y la historia archivada no se puede corregir. La
caducidad existe contra un modo de falla concreto: un experimento que nadie
confirma ni descarta se queda en el repositorio, envejece, y con el tiempo nadie
puede distinguir una propuesta viva de un resto abandonado.

#### Scenario: Un experimento que llegó a su fecha sin veredicto
- **WHEN** un change declarado experimental llega al día siguiente de la fecha de vencimiento de su veredicto y no hay veredicto registrado
- **THEN** el pipeline falla nombrando el change y su fecha, con las tres salidas legítimas escritas —registrar el veredicto, correr la fecha con el motivo escrito, o descartar el change—, y sigue fallando hasta que se tome una

#### Scenario: El último día todavía es vigente
- **WHEN** un change declarado experimental está en el mismo día de su fecha de vencimiento y no hay veredicto registrado
- **THEN** el pipeline no falla por esa fecha, porque la fecha declarada es el último día del experimento y no el primero después

#### Scenario: Un experimento que concluyó después de su fecha
- **WHEN** la fecha de un change experimental ya pasó y el change tiene un veredicto registrado
- **THEN** el pipeline no falla, porque lo que la regla persigue es el experimento sin conclusión y no la fecha vencida

#### Scenario: Un experimento sin fecha
- **WHEN** un change se declara experimental y ninguno de sus artefactos declara la fecha en que su veredicto vence
- **THEN** el pipeline falla, porque un estado experimental sin vencimiento es indistinguible de un resto abandonado y omitir la fecha sería la forma más barata de evitar el vencimiento

#### Scenario: Dos fechas en el mismo change
- **WHEN** los artefactos de un change experimental declaran fechas de vencimiento distintas
- **THEN** manda la más temprana, y correr el vencimiento exige correr la fecha en todos los artefactos que la declaran

#### Scenario: Una declaración que no se puede leer
- **WHEN** un change declara una fecha de vencimiento que no existe en el calendario, o declara su estado experimental con un valor que no es verdadero ni falso
- **THEN** el pipeline falla nombrando el change y el valor, en vez de tratar la declaración como ausente y pasar en verde

#### Scenario: Un change que no es experimental
- **WHEN** un change no se declara experimental, o ya está archivado
- **THEN** la verificación no emite ninguna señal sobre él, y ningún repositorio que hoy pasa empieza a fallar por la existencia de esta regla
