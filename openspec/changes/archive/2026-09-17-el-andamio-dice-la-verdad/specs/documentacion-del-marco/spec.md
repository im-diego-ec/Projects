# documentacion-del-marco — deltas de el-andamio-dice-la-verdad

## ADDED Requirements

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
