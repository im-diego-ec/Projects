# documentacion-del-marco

## Purpose

Veracidad y navegabilidad de lo que el marco escribe para ser leído: la
documentación de este repositorio y lo que el andamio reparte a cada proyecto
nuevo. Lo que se entrega describe el comportamiento vigente de las herramientas
y no promete lo que nadie comprobó; el orden de lectura se ve sin abrir nada,
con una introducción que declara qué se logra y qué no; y ningún enlace apunta a
algo que no existe.

## Requirements

### Requirement: Lo que el andamio entrega no afirma lo que el árbol contradice

Todo documento que el andamio reparta a un proyecto nuevo SHALL describir el
comportamiento vigente de las herramientas del marco. Un documento que mande a
sostener a mano una propiedad que una herramienta ya sostiene, o que declare
pendiente una pieza que ya existe, SHALL tratarse como defecto y no como prosa
desactualizada.

Un artefacto que la constitución canónica cite como fuente de una respuesta SHALL
existir en el andamio.

Ninguna página que viaje SHALL prometer una condición comercial —un precio, una
gratuidad, la ausencia de un requisito de pago— sin constancia de que alguien la
comprobó.

Un pendiente que el andamio reparta SHALL decir dónde vive el trabajo que lo
cierra.

#### Scenario: Un documento del andamio describe una herramienta

- **WHEN** una página que viaja afirma que una clave o un archivo no se usa todavía
- **THEN** esa afirmación corresponde al comportamiento vigente, o el pipeline la trata como defecto

#### Scenario: El canónico cita un artefacto del andamio

- **WHEN** la constitución canónica nombra un archivo como el lugar donde vive una respuesta
- **THEN** ese archivo existe en el andamio

#### Scenario: Una página que viaja promete algo sobre dinero

- **WHEN** un documento o workflow del andamio afirma que algo es gratis o no pide tarjeta
- **THEN** esa afirmación tiene constancia registrada, o no se escribe

#### Scenario: El andamio reparte un pendiente

- **WHEN** el andamio entrega una excepción o un pendiente declarado
- **THEN** dice dónde vive el trabajo que lo cierra, y no sólo por qué existe

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
- **THEN** encuentra declarado, antes de empezar el recorrido, cada tramo que el
  marco todavía no cubre para la forma de proyecto que va a elegir —por ejemplo,
  que no publique en internet esa forma—
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
