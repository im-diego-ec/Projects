# calidad-codigo — Delta

## MODIFIED Requirements

### Requirement: Lint y formato configurados para todos los paquetes

El repositorio SHALL tener linter y formateador configurados y ejecutables en
CADA paquete del monorepo, con reglas alineadas a la constitución de
ingeniería (`AGENTS.md`: TypeScript strict, `any` solo con justificación, sin
promesas flotantes).

Ningún paquete SHALL quedar fuera del alcance del lint: incorporar un paquete
nuevo sin su configuración SHALL ser un fallo, no un punto ciego silencioso.

Esta garantía es por PAQUETE y se conserva. Aparte se enuncia otra, más fuerte y
por ARCHIVO, porque la de paquete no alcanza: los dos agujeros que motivaron el
cambio vivían DENTRO de paquetes correctamente configurados, y ninguna propiedad
enunciada por paquete puede describirlos.

#### Scenario: Ejecutar lint en un paquete limpio
- **WHEN** se ejecuta el script `lint` de cualquier paquete del monorepo sin violaciones presentes
- **THEN** el comando termina con código de salida 0 y no reporta errores

#### Scenario: Ejecutar lint con una violación presente
- **WHEN** existe una violación de regla (por ejemplo un `any` sin comentario justificativo) y se ejecuta el script `lint`
- **THEN** el comando reporta el error con archivo y línea y termina con código de salida distinto de 0

#### Scenario: Paquete nuevo sin configuración de lint
- **WHEN** se incorpora al monorepo un paquete que no queda cubierto por la configuración de lint
- **THEN** la verificación de CI lo señala como fallo — un paquete sin lint no pasa por verificado

### Requirement: Scripts de verificación sin enmascaramiento de fallo

Los scripts de verificación declarados en los manifiestos de los paquetes
SHALL propagar el código de salida real, sin sufijos ni envoltorios que
conviertan un fallo en éxito.

La verificación de integración SHALL detectar el enmascaramiento por sí misma:
un script que convierte un rojo en verde es, por construcción, invisible para
todo lo que dependa de su código de salida —incluido el pipeline—, así que la
única forma de atraparlo es examinar el script, no ejecutarlo.

#### Scenario: Un fallo de lint se propaga al invocador
- **WHEN** el lint encuentra una violación al ejecutarse vía el script declarado del paquete
- **THEN** el proceso invocador (incluido CI) recibe un código de salida distinto de 0

#### Scenario: Un script de verificación que enmascara su fallo
- **WHEN** un script de verificación declarado en un manifiesto convierte un fallo en éxito mediante un sufijo o un envoltorio
- **THEN** la verificación de integración falla señalando el manifiesto, el script y el arreglo concreto

## ADDED Requirements

### Requirement: Ningún archivo fuente fuera del alcance de la verificación

Todo archivo de código fuente versionado en el repositorio SHALL quedar dentro
del alcance de la verificación automática de calidad: alguna herramienta de
análisis estático SHALL examinarlo y —cuando el lenguaje tenga verificación de
tipos— alguna configuración de compilación SHALL incluirlo en su programa.

Un archivo que ninguna herramienta examina SHALL ser un fallo de la
verificación, no un punto ciego silencioso. El alcance SHALL derivarse de las
herramientas realmente configuradas en el repositorio, y NO de una lista de
paquetes ni de directorios mantenida a mano: incorporar un paquete, un
directorio o un archivo nuevo SHALL quedar cubierto sin que nadie agregue nada
a ninguna lista.

Un archivo PUEDE quedar deliberadamente fuera del alcance, y en ese caso el
paquete que lo contiene SHALL declararlo con su motivo escrito. La exclusión no
vuelve imposible la evasión: la vuelve **visible**. Deja de ser una ausencia
—que no aparece en ningún diff ni en ninguna corrida— y pasa a ser una
afirmación firmada, dentro de un diff, sujeta a revisión.

#### Scenario: Un archivo fuente que ninguna herramienta examina
- **WHEN** el repositorio versiona un archivo de código fuente que ninguna configuración de análisis estático alcanza, o que —siendo de un lenguaje con verificación de tipos— ninguna configuración de compilación incluye en su programa
- **THEN** la verificación falla nombrando el archivo y las formas concretas de cubrirlo, antes del merge

#### Scenario: Archivo excluido con su motivo declarado
- **WHEN** el repositorio versiona un archivo que legítimamente ninguna herramienta examina y el paquete que lo contiene declara la exclusión junto con su justificación escrita
- **THEN** la verificación pasa y deja constancia de la exclusión y de su motivo en el resumen de la corrida

#### Scenario: Una exclusión que dejó de corresponder a un archivo
- **WHEN** una exclusión declarada ya no corresponde a ningún archivo versionado
- **THEN** la verificación falla, para que las exclusiones no sobrevivan al problema que las justificó

#### Scenario: El repositorio declara la verificación pero no la ejecuta
- **WHEN** el pipeline del repositorio no invoca la derivación del alcance en ninguno de sus flujos
- **THEN** la verificación falla indicando qué paso agregar y en qué job

### Requirement: El formato acordado se verifica en cada integración

El formato de código acordado del repositorio SHALL verificarse en cada
integración, y una divergencia SHALL detener la integración.

La verificación SHALL excluir los archivos que otra herramienta genera y
regenera: un archivo generado obedece a la herramienta que lo produce y no al
formateador, de modo que exigirle el formato del repositorio produce un fallo
permanente sobre un archivo que ninguna persona escribió ni puede corregir.

#### Scenario: Un cambio con el formato divergente
- **WHEN** un cambio introduce código que no respeta el formato acordado del repositorio
- **THEN** la integración falla indicando el comando que lo corrige

#### Scenario: Un archivo generado por otra herramienta
- **WHEN** el repositorio versiona archivos que una herramienta genera y regenera
- **THEN** la verificación de formato no los evalúa

### Requirement: La cobertura de los cambios se mide en cada integración

La cobertura de pruebas SHALL medirse en cada integración sobre **las líneas que
el cambio agrega o modifica**, y NO contra un umbral global almacenado.

La razón es una propiedad, no una preferencia: todo mecanismo basado en un
umbral almacenado obliga, el día que se borra código bien cubierto, a que una
persona baje ese número a mano por el mismo camino por el que pasa un cambio
normal. La propiedad a garantizar no es que la cobertura suba, sino que **no
exista un número que alguien deba bajar a mano**. Medir únicamente el cambio no
almacena ninguno.

La medición SHALL distinguir «cubierto» de «no medido»: la ausencia de datos de
cobertura habiendo líneas agregadas SHALL ser un fallo ruidoso y NO un éxito
silencioso.

#### Scenario: Un cambio que agrega código sin pruebas
- **WHEN** un cambio agrega líneas ejecutables y ninguna prueba las ejercita
- **THEN** la integración lo reporta, indicando qué líneas quedaron sin cubrir

#### Scenario: Un cambio que solo elimina código
- **WHEN** un cambio únicamente elimina líneas, o renombra sin agregar código ejecutable
- **THEN** la medición pasa sin producir ruido, porque no hay líneas nuevas que cubrir

#### Scenario: No hay datos de cobertura habiendo líneas agregadas
- **WHEN** un cambio agrega líneas ejecutables y la medición no encuentra datos de cobertura que les correspondan
- **THEN** la integración falla señalando el problema de configuración, en vez de reportar cobertura total
