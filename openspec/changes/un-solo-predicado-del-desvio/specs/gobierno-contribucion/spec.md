# gobierno-contribucion — deltas de un-solo-predicado-del-desvio

## ADDED Requirements

### Requirement: Una excepción incompleta no pasa muda por ningún camino

Cuando más de una pieza del marco lee la misma declaración de excepción, ninguna
de ellas SHALL aceptar en silencio una declaración que otra rechaza. La pieza
menos estricta SHALL emitir un aviso visible que nombre el dato faltante y diga
que otra pieza ya lo trata como error.

Mientras el endurecimiento no se haya publicado, la excepción incompleta SHALL
seguir surtiendo efecto: el aviso NO SHALL cambiar el veredicto. El cambio de
veredicto SHALL viajar en una línea mayor, porque endurece un check que hoy
dejan pasar repositorios que no pidieron el cambio.

#### Scenario: Una excepción sin quien la aprobó

- **WHEN** una declaración de excepción no dice quién la aprobó
- **THEN** el paso avisa nombrando el permiso y el dato que falta, y la excepción sigue surtiendo efecto

#### Scenario: Una excepción sin fecha

- **WHEN** una declaración de excepción no trae una fecha en el formato exigido
- **THEN** el paso avisa nombrando la fecha, y no el aprobador

#### Scenario: Una excepción completa

- **WHEN** una declaración de excepción trae motivo, aprobador y fecha válida
- **THEN** no se emite ningún aviso, porque un aviso que suena siempre no distingue nada

#### Scenario: El veredicto no cambia con el estreno

- **WHEN** un repositorio pasa hoy con una excepción incompleta
- **THEN** sigue pasando, y el aviso le anticipa que en la línea mayor siguiente dejará de pasar
