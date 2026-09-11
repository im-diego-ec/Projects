# gobierno-contribucion — deltas de las-plantillas-no-quedan-atras

## ADDED Requirements

### Requirement: Un consumidor que no recibe el bump se verifica en el release

Cuando exista un consumidor del marco que **no** puede recibir la versión nueva por
el mecanismo habitual de propuesta automática, el procedimiento de publicación SHALL
verificarlo explícitamente antes de dar el release por cerrado, y SHALL nombrarlo.

La lista de esos consumidores NO SHALL escribirse a mano en el procedimiento: SHALL
derivarse de la pieza del marco que los produce, de modo que uno nuevo no pueda
quedar fuera en silencio.

El procedimiento SHALL verificar además que ese consumidor siga siendo utilizable
por el camino que la documentación indica, cuando esa propiedad pueda perderse sin
aviso.

#### Scenario: Se publica una versión del marco

- **WHEN** se corta y publica una versión
- **THEN** el procedimiento verifica con qué versión quedaron los consumidores que no reciben propuesta automática, y los nombra

#### Scenario: Aparece un consumidor nuevo de esa clase

- **WHEN** la pieza que los produce empieza a generar uno más
- **THEN** el pipeline falla hasta que el procedimiento de publicación lo nombre

#### Scenario: El consumidor deja de ser utilizable por el camino documentado

- **WHEN** el repositorio pierde la propiedad que la guía necesita para que el camino funcione
- **THEN** el procedimiento lo detecta en el release, y no la persona que intenta usarlo
