# base-tecnologica — deltas de una-sola-lista-de-plataformas

## ADDED Requirements

### Requirement: Lo que la constitución admite y lo que la herramienta entrega no divergen en silencio

El conjunto de plataformas que la constitución de un proyecto declara admitidas
SHALL coincidir con el que la herramienta de arranque reconoce, y el pipeline
SHALL comprobarlo en **todas** las copias de esa lista, incluidas las que viven
en prosa y las que un banco se haya escrito para sí mismo.

Cuando una plataforma esté admitida por la constitución y **no** implementada,
SHALL declararse como pendiente con su destino, y NO SHALL retirarse de la
constitución para hacer coincidir las listas: el hueco es de implementación y
esconderlo lo haría indistinguible de una decisión de diseño.

Una plataforma declarada pendiente NO SHALL figurar a la vez como implementada.

#### Scenario: Una plataforma admitida que aún no tiene adaptador

- **WHEN** alguien elige una plataforma que la constitución admite y la herramienta todavía no implementa
- **THEN** el mensaje dice que está admitida pero no implementada y nombra dónde vive ese trabajo, en vez de tratarla como un valor inválido

#### Scenario: Una copia de la lista se mueve

- **WHEN** cualquiera de las copias de la lista de plataformas deja de coincidir con las demás
- **THEN** el pipeline falla nombrando la copia que divergió

#### Scenario: Se tapa el hueco moviendo una pendiente a implementada

- **WHEN** una plataforma pendiente se agrega a las implementadas sin que exista su adaptador
- **THEN** el pipeline falla, porque figuraría como implementada y pendiente a la vez
