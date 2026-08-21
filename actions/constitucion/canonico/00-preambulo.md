# La porción del marco · {{ORG}} / {{PROYECTO}}

> Reglas de ingeniería del área que valen para **cualquier** proyecto. Este archivo
> lo escribe **Projects** y llega renderizado a este repositorio; lo propio de
> {{PROYECTO}} vive en su `AGENTS.md`.
>
> Regla de oro: **el spec es la fuente de verdad; el código es el artefacto generado
> y verificable.**

<!-- projects:regla id=artefacto-no-se-edita-a-mano -->

- **Esto no se edita acá.** Una edición a mano pone rojo el pipeline en la corrida
  siguiente y se pierde en la regeneración, sin dejar rastro. Si el texto está mal,
  se arregla en Projects y llega a todos; si está bien pero no aplica a {{PROYECTO}}, se
  declara un desvío (abajo).

<!-- projects:regla id=precedencia-del-marco -->

- **Precedencia.** Si el `AGENTS.md` de {{PROYECTO}} y este archivo dicen cosas
  distintas sobre lo mismo, **manda este archivo**. El único override válido es un
  **desvío declarado** en `.projects-desvios.json`: nombra la regla, quién lo aprobó y
  el motivo escrito, y queda impreso acá mismo, pegado a la regla que anula. Una
  contradicción sin desvío es un defecto del repositorio: se arregla borrando la
  copia divergente, no eligiendo cuál leer.

<!-- projects:regla id=el-proyecto-no-edita-el-marco -->

- **{{PROYECTO}} no edita el marco desde su repo.** Lo que falta es un parámetro o
  es un change de OpenSpec **en Projects**. Copiar un workflow del marco para editarlo
  acá, o pinar una versión vieja para ganar tiempo, rompen la propiedad que hace útil
  al marco: que un arreglo llegue a todos.

---
