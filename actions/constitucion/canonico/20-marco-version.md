## Cuando el marco publica una versión

Este repo consume Projects por `uses: {{ORG}}/Projects/...@vX.Y.Z`, **por versión
exacta**. Cada versión nueva llega como **PR de Dependabot en este repo**: nada
del marco cambia acá sin que exista un PR que alguien pueda leer y mergear. Si un
check nuevo pone este repo en rojo, el rojo aparece **dentro de ese PR** y no en
`main`.

Hasta Projects 1.3.0 el canal era el tag móvil `v1`, que empujaba el cambio a todos a
la vez sin que nadie tocara una línea. Cambió porque el 2026-08-19 un check nuevo
enrojeció un repo que el día anterior pasaba, y nadie lo había pedido.

<!-- projects:regla id=marco-aviso-canal -->

- **El PR de bump del marco no se deja envejecer.** Es el canal: si no llega, este
  repo se queda en una versión vieja sin enterarse. Dos cosas lo silencian y las dos
  se revisan acá: que Dependabot tenga acceso al repo del marco, y que el marco esté
  en **su propio grupo** de `.github/dependabot.yml` — compartiendo el grupo `*` con
  las demás actions, un PR del grupo trabado deja de proponer el bump. Si el canal
  está roto, se le pide el acceso a {{BUILDER_1}}.

<!-- projects:regla id=marco-aviso-se-vuelve-issue -->

- **Un bump con acción requerida se convierte en issue de este repo el mismo día.**
  La sección «Para consumidores» del CHANGELOG dice qué hay que hacer; si dice algo,
  se anota. Un PR leído y no anotado es un rojo esperando al próximo PR de
  cualquiera, y quien lo cobre no va a ser quien lo leyó.

<!-- projects:regla id=marco-aviso-no-es-la-fuente -->

- **El PR es la notificación, no la fuente.** Ante cualquier duda manda el
  `CHANGELOG.md` de Projects en la versión publicada, y su sección «Para consumidores».
  Un bump marcado BREAKING se escala en Projects el mismo día en vez de trabajar
  alrededor.

<!-- projects:regla id=marco-no-se-copia-ni-se-pina-para-ganar-tiempo -->

- **Lo que NO se hace** cuando un check nuevo molesta: copiar el workflow del marco a
  este repo para editarlo, ni **quedarse** en una versión vieja para ganar tiempo. Pinar
  la versión exacta es el modelo; congelarla indefinidamente para no leer un rojo es
  otra cosa, y rompe la propiedad que hace útil al marco (un arreglo llega a todos los
  repos, cada uno por su PR). Se abre issue o change **en Projects**.

<!-- projects:regla id=marco-artefacto-al-dia -->

- **La porción del marco se regenera y hay que dejarla llegar.** Si este repo cableó
  el workflow que la regenera, su PR se revisa y se mergea; no se cierra "para
  después". Si no lo cableó, la regeneración es **manual** y el artefacto de la
  corrida dice cómo — cablearlo es la forma de que deje de depender de que alguien se
  acuerde. Un artefacto atrasado avisa primero y falla desde la fecha que el propio
  aviso imprime.

---
