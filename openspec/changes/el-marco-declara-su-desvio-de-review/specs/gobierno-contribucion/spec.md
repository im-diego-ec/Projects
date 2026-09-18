# gobierno-contribucion — deltas de el-marco-declara-su-desvio-de-review

## ADDED Requirements

### Requirement: El repositorio del marco declara la revisión que no puede cumplir, y lo sostiene un check

Cuando el repositorio que distribuye el marco tenga una sola identidad con
permiso de escritura, la revisión cruzada entre constructores que su
constitución exige SHALL declararse como desvío en la constitución que su agente
carga, pegado a la regla que anula. El desvío SHALL decir quién lo aprobó y desde
qué fecha rige, qué revisión lo reemplaza y dónde queda registrada, la condición
concreta que lo retira junto con la forma de medirla, y lo que el desvío NO
alcanza.

La revisión que reemplaza a la cruzada SHALL ser adversarial —varias lentes, cada
una con su pregunta y su evidencia, y un veredicto— y SHALL quedar registrada
dentro de cada change antes de archivarlo.

Mientras el desvío rija, ningún artefacto de un change activo SHALL nombrar como
aprobador o revisor a un rol que el desvío declara vacante. Cuando se cumpla la
condición de retiro, el desvío SHALL retirarse: uno que sobrevive a su condición
SHALL tratarse como fallo, igual que su ausencia cuando la condición no se
cumple.

El desvío NO SHALL alcanzar a la aprobación del rol de producto sobre los
artefactos que la constitución le reserva.

Cada una de estas propiedades SHALL tener una comprobación que falle sola.

#### Scenario: Una sola identidad escribe en el repositorio del marco

- **WHEN** el archivo de propietarios de código nombra un solo dueño y la constitución exige revisión cruzada
- **THEN** la constitución que carga el agente trae el desvío declarado, con aprobador, fecha, reemplazo, dónde se registra, condición de retiro con su medición y lo que no alcanza
- **AND** el pipeline falla si el desvío falta o si le falta cualquiera de esas piezas

#### Scenario: Un artefacto nombra a un aprobador que no existe

- **WHEN** un change activo declara como aprobador o revisor al constructor par mientras el desvío rige, en cualquier forma de escribirlo, o un valor que no es ninguno de los que el desvío admite
- **THEN** el pipeline falla nombrando el archivo, la línea y los valores que corresponden

#### Scenario: Se archiva un change bajo el desvío

- **WHEN** un change se archiva desde la fecha en que rige el desvío
- **THEN** lleva registrada adentro su revisión adversarial, con al menos dos lentes que dicen qué miran y qué encontraron —al menos dos de ellas con evidencia que se puede ir a verificar— y un veredicto escrito
- **AND** el pipeline falla si no la lleva, si le falta cualquiera de esas piezas, o si la carpeta del archive no dice en qué fecha se archivó

#### Scenario: Llega la segunda persona

- **WHEN** el archivo de propietarios de código pasa a nombrar a una segunda identidad
- **THEN** el pipeline falla hasta que el desvío se retire, en vez de dejarlo vigente sobre una condición que ya no se da
- **AND** retirado el desvío, el pipeline falla mientras un change activo siga declarando como aprobador la revisión que reemplazaba a la cruzada

#### Scenario: Un change toca la gobernanza del trabajo

- **WHEN** un change toca la capability que gobierna quién aprueba qué
- **THEN** su proposal y su spec siguen esperando la aprobación del rol de producto, y la revisión adversarial no la reemplaza
- **AND** el pipeline falla si su declaración de aprobador no empieza por el rol de producto

#### Scenario: Se archiva un change de la gobernanza del trabajo

- **WHEN** se archiva, bajo el desvío, un change que toca la capability que gobierna quién aprueba qué
- **THEN** lleva la constancia de la aprobación del rol de producto, con la fecha en que la dio, no posterior al archive
- **AND** el pipeline falla si no la lleva, aunque la revisión adversarial esté registrada
