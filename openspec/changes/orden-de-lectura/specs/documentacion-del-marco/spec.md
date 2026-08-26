# documentacion-del-marco — Delta

## ADDED Requirements

### Requirement: El orden de lectura de la documentación es visible sin abrir nada

Las páginas de la raíz de `docs/` SHALL llevar un prefijo numérico de dos dígitos
que indique su lugar en el camino de lectura. El número SHALL significar orden de
lectura y no importancia, y el índice SHALL decirlo con esas palabras.

La primera página SHALL ser una introducción que no suponga conocimiento previo y
que declare, antes de cualquier otro contenido: qué se logra siguiendo las
páginas en orden, qué **no** se logra, cuánto lleva cada tramo, y qué hay que
tener antes de empezar.

El índice SHALL separar las páginas que se leen en orden de las que se abren
cuando aparece su problema, y SHALL declarar por qué las carpetas no llevan
número.

#### Scenario: Alguien abre la carpeta por primera vez

- **WHEN** una persona que no conoce el marco lista el contenido de `docs/`
- **THEN** el primer archivo de la lista es la introducción
- **AND** el orden de los archivos es el orden en que hay que leerlos
- **AND** el índice queda al final, que es donde se consulta

#### Scenario: Alguien necesita saber qué NO va a conseguir

- **WHEN** esa persona lee la introducción
- **THEN** encuentra declarado, antes de empezar el recorrido, que el marco
  todavía no publica la aplicación en internet
- **AND** esa declaración está en la página de entrada y no solamente en un
  documento técnico

### Requirement: Ningún enlace del repositorio apunta a algo que no existe

El repositorio SHALL verificar automáticamente que cada enlace relativo escrito
en un archivo `.md` rastreado apunte a un archivo o carpeta existente, y que cada
ancla apunte a un encabezado que exista en la página de destino.

La verificación SHALL excluir el `CHANGELOG.md` y SHALL declarar el motivo: ese
archivo registra lo que cada versión publicada dijo, y reescribir sus rutas
cuando un archivo se renombra falsifica lo que el consumidor leyó en su momento.

La verificación SHALL fallar si el número de enlaces encontrados cae por debajo
de un piso declarado, porque un cero ahí significa que el detector dejó de
reconocer la forma de los enlaces y no que el repositorio perdió su navegación.

#### Scenario: Un renombrado deja un enlace huérfano

- **WHEN** un archivo se renombra y alguna referencia no se actualiza
- **THEN** la verificación falla nombrando dónde está escrito el enlace y a
  dónde apunta
- **AND** falla aunque el resto de las comprobaciones del repositorio sigan en
  verde

#### Scenario: Un ancla apunta a una sección que ya no existe

- **WHEN** un encabezado se renombra y un enlace sigue apuntando a su ancla vieja
- **THEN** la verificación falla nombrando la página de origen y el ancla muerta
