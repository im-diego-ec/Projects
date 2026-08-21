## Agentes: modelos, effort y herramientas

El área implementa con agentes. Dos consecuencias: el costo se decide en cada sesión,
y **las reglas que el agente lee son el producto** — una regla que no entra al
contexto no existe.

<!-- projects:regla id=modelo-default-barato -->

- **El default es el barato**: `"model": "sonnet"`, `"effortLevel": "medium"` en la
  configuración personal (`~/.claude/settings.json`). Cubre implementar bloques con
  tasks aprobadas, tests, docs y deps, que es la mayoría del trabajo. Los repos del
  área **no** imponen modelo en su `.claude/settings.json`.

<!-- projects:regla id=escalar-solo-con-ok-previo -->

- **Escalar cuesta y no se decide solo.** Un modelo o un effort más caro exige **OK
  humano previo** en esa sesión (frontera ⚠️ `escalar-modelo-exige-ok-previo`). Los
  casos que normalmente lo justifican —diseñar un change, cirugía de pipeline,
  diagnóstico de un incidente, review adversarial— son razones para **pedirlo**, no
  autorizaciones que el agente pueda aplicarse a sí mismo. `xhigh` y las corridas de
  auditoría, igual: se piden.

<!-- projects:regla id=subagentes-baratos -->

- **Subagentes: lo mecánico barato.** Recon, lectura masiva y recolección van en
  `model: sonnet` + `effort: low`; solo los verificadores llevan effort alto. Un
  subagente hereda el modelo con el que se lo lanza y **no lo cambia**: la escalada de
  un subagente es una escalada, con la misma compuerta.

<!-- projects:regla id=bot-de-github-acotado -->

- **El bot de GitHub corre acotado y por configuración**: `sonnet`, `medium`,
  `max-turns 5` en su workflow. El límite vive en el archivo, no en la buena voluntad
  del que lo invoca.

<!-- projects:regla id=fast-no-se-usa -->

- **`/fast` no se usa.** Es el modelo premium a precio premium ($10/$50 vs $3/$15 por
  MTok): paga velocidad que este trabajo no necesita.

<!-- projects:regla id=la-palanca-real-no-es-de-config -->

- **La palanca grande no es de config**: sesiones acotadas por bloque, este archivo
  como contexto compartido, memoria persistente y el carril de docs. Un modelo más
  caro no arregla una sesión sin foco.

<!-- projects:regla id=fin-de-linea-lf -->

- **Fin de línea LF en todo lo versionado** (`* text=auto eol=lf` en
  `.gitattributes`). Sin eso, en Windows el árbol de trabajo queda con CRLF mientras
  los blobs son LF, y las comparaciones byte a byte —incluida la de esta porción del
  marco— fallan por un motivo que no es el suyo.

<!-- projects:regla id=lo-generado-fuera-del-formateador -->

- **Lo generado queda fuera del formateador** (`.prettierignore`): los artefactos del
  CLI de OpenSpec, el archive de OpenSpec y `.projects/`. Formatear lo que una herramienta
  regenera produce un rojo permanente sobre archivos que ninguna persona escribió ni
  puede arreglar.

---
