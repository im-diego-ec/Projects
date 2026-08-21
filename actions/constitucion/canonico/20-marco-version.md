## Cuando el marco publica una versión

Este repo consume Projects por `uses: {{ORG}}/Projects/...@v1`, y **`v1` es un tag
móvil**: lo que Projects publique llega a este pipeline sin que nadie acá toque una
línea. Ese es el valor de lo referenciado —una corrección del marco llega sola— y
también su riesgo: un check nuevo puede poner este repo en rojo **sin que nadie lo
haya leído**. Pasó el 2026-08-19, al mover `v1` la primera vez.

<!-- projects:regla id=marco-aviso-canal -->

- **Estar en el canal donde Projects avisa cada versión es requisito del proyecto**, no
  una cortesía. El destino se configura en Projects, no acá; si los avisos no llegan, se
  le pide el acceso a {{BUILDER_1}}.

<!-- projects:regla id=marco-aviso-se-vuelve-issue -->

- **Un aviso con acción requerida se convierte en issue de este repo el mismo día.**
  Un mensaje leído y no anotado es un rojo esperando al próximo PR de cualquiera, y
  quien lo cobre no va a ser quien lo leyó.

<!-- projects:regla id=marco-aviso-no-es-la-fuente -->

- **El aviso es la notificación, no la fuente.** Ante cualquier duda manda el
  `CHANGELOG.md` de Projects en la versión publicada. Un aviso marcado BREAKING sobre
  `v1` no debería existir: si aparece, no se trabaja alrededor — se escala en Projects
  ese mismo día.

<!-- projects:regla id=marco-no-se-copia-ni-se-pina-para-ganar-tiempo -->

- **Lo que NO se hace** cuando un check nuevo molesta: copiar el workflow del marco a
  este repo para editarlo, ni pinar una versión vieja para ganar tiempo. Las dos cosas
  rompen la propiedad que hace útil al marco (un arreglo llega a todos). Se abre issue
  o change **en Projects**.

<!-- projects:regla id=marco-artefacto-al-dia -->

- **La porción del marco se actualiza sola, y hay que dejarla.** El PR semanal que
  regenera este archivo se revisa y se mergea; no se cierra "para después". Un
  artefacto atrasado avisa primero y falla desde la fecha que el propio aviso
  imprime.

---
