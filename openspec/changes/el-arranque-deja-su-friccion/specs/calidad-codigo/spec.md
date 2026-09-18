## ADDED Requirements

### Requirement: La herramienta de arranque no declara terminada una corrida sin dejar su registro de fricción

La herramienta que instancia el andamio SHALL dejar, en cada corrida que termina bien y ANTES
de declararla terminada, un registro de fricción: la lista de los puntos en los que la
corrida se apartó del camino escrito, cada uno con su punto exacto y una clase de un conjunto
cerrado. El registro SHALL existir también cuando no hubo ningún apartamiento, y en ese caso
SHALL decirlo explícitamente, de modo que «no hubo nada que rodear» se distinga de «nadie
miró». Con apartamientos, la corrida SHALL decir que no es un éxito limpio.

Lo que el registro contiene SHALL salir de la corrida sin depender de que alguien lo anote:
todo aviso que la herramienta emite al seguir por un camino conservador SHALL entrar, con la
fase en la que ocurrió; un hallazgo medido sobre la cuenta no es un apartamiento. Las
respuestas que el asistente de decisiones rechazó y sus vueltas atrás SHALL entrar con la
pregunta y el motivo, aunque el asistente y el arranque corran en procesos distintos, y SHALL
NOT guardar lo que la persona escribió.

El registro SHALL NOT contener el nombre del proyecto, la cuenta ni rutas de la máquina.
Mandarlo al repositorio del marco del que salió la herramienta SHALL ofrecerse y hacerse solo
con la confirmación explícita de la persona; sin ella, o sin una terminal donde pedirla, la
herramienta SHALL dejar el comando exacto para hacerlo después, y un envío que no pudo
ocurrir SHALL avisarse.

#### Scenario: Una corrida que termina bien
- **WHEN** la herramienta de arranque completa una corrida
- **THEN** deja el registro de fricción en la raíz del proyecto y dice dónde quedó antes de la línea que declara la corrida terminada

#### Scenario: Una corrida sin ningún apartamiento
- **WHEN** la corrida termina sin haberse apartado del camino en ningún punto
- **THEN** el registro existe igual y lo dice explícitamente, en vez de quedar vacío o no escribirse

#### Scenario: Una corrida que terminó rodeando algo
- **WHEN** la corrida siguió por un camino conservador y lo avisó, por ejemplo porque no pudo comprobar algo o porque se le pidió saltear un paso
- **THEN** cada aviso queda en el registro con su punto, sin que nadie lo haya anotado, y la corrida dice que no es un éxito limpio

#### Scenario: La persona se trabó en el asistente
- **WHEN** una respuesta del asistente se rechazó o la persona volvió a una pregunta anterior, y el arranque corrió después en otro proceso
- **THEN** el registro de ese arranque lo contiene con la pregunta y el motivo, y no contiene lo que la persona escribió

#### Scenario: El registro va a un lugar que otros leen
- **WHEN** se escribe el registro
- **THEN** no contiene el nombre del proyecto, la cuenta ni rutas de la máquina de quien lo corrió

#### Scenario: Mandarlo al marco
- **WHEN** el registro quedó escrito y la persona no confirma el envío, o no hay una terminal donde confirmarlo
- **THEN** no se manda nada afuera y queda impreso el comando exacto para mandarlo después

#### Scenario: Una corrida que falla
- **WHEN** la corrida termina con error
- **THEN** no escribe el registro en el proyecto —el error y la bitácora ya dicen qué pasó— y lo que anotó el asistente queda disponible para el reintento, en vez de consumirse

#### Scenario: La herramienta corre sin la pieza que escribe el registro
- **WHEN** la herramienta corre copiada fuera de su árbol y no encuentra la pieza que escribe el registro
- **THEN** la corrida sigue y avisa que no deja registro de fricción, en vez de morir antes de empezar o callarlo

### Requirement: Un comando que una guía y una skill del marco declaran compartir se escribe igual en las dos

Cuando una guía del marco y una skill del marco declaran compartir un comando, ese comando
SHALL estar marcado en las dos con el mismo identificador, y la verificación del marco SHALL
fallar si los dos textos difieren en cualquier carácter, nombrando el comando y los dos
documentos. La diferencia de terminador de línea SHALL NOT contar como diferencia; un
carácter de más dentro de una línea, sí. La prosa alrededor no se compara.

La verificación SHALL NOT pasar por vacuidad: un par declarado sin ningún comando marcado, un
documento del par que no existe, una marca sin su bloque o un identificador repetido SHALL
hacerla fallar.

#### Scenario: El comando cambia en un solo lado
- **WHEN** un comando marcado como compartido difiere entre la guía y la skill en un solo carácter
- **THEN** la verificación del marco falla y nombra el comando y los dos documentos

#### Scenario: Solo cambia el fin de línea
- **WHEN** los dos bloques difieren únicamente en el terminador de línea
- **THEN** la verificación no lo reporta como diferencia

#### Scenario: Un par sin nada que comparar
- **WHEN** un par declarado no tiene comandos marcados, o uno de sus documentos no existe
- **THEN** la verificación falla en vez de pasar

#### Scenario: Una marca que quedó sin su bloque
- **WHEN** una marca de comando compartido no está seguida de un bloque de código, o su bloque no cierra
- **THEN** la verificación falla en vez de comparar vacío contra vacío
