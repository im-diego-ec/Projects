---
artefacto: design
dri: Builder 1
revisa: el builder que no lo escribió
estado: pendiente-de-revision
---

# ventana-vencida — Design

## D1. Se retira la política, no el mecanismo

**Decisión.** Desaparece el piso obligatorio de 28 días (`DIAS_DE_GRACIA_MINIMOS`) y la
puerta `"urgente": true`. **Sobrevive** el camino de aviso con fecha: si una entrada del
manifiesto declara un `exigible_desde` posterior a su `publicada`, la verificación avisa
hasta esa fecha, igual que hoy.

**Alternativa descartada: borrar el mecanismo entero** (`hallazgoPorFecha` sin fechas, el
campo fuera del manifiesto, el output fuera de la action). Es lo primero que se consideró y
está mal por una razón concreta: `AGENTS.md` línea 163 sigue diciendo que un endurecimiento
«se estrena en modo aviso y el endurecimiento va en el major siguiente». Borrar el
mecanismo dejaría esa regla **sin forma de cumplirse**, y una constitución con una regla
inaplicable es peor que una con una política de más. Además el costo medido era desigual:
borrarlo tocaba 10 archivos y reescribía 2 pruebas; retirar la política toca 5 y reescribe
las mismas 2.

**Alternativa descartada: dejar el piso en 28 y solo sacar la fecha de la prosa.** Es
cosmética. Medido: la fecha que un consumidor ve no sale de la versión que se publica sino
de la **entrada pendiente más vieja**, así que sacarla del CHANGELOG no la saca del
mensaje. El consumidor seguiría viendo 2026-09-19, heredado de la 1.4.2.

## D2. Las entradas históricas también pasan a exigible = publicada

**Decisión.** Las tres entradas del manifiesto quedan con `exigible_desde` igual a
`publicada`.

**Por qué no es reescribir historia.** `publicada` guarda la fecha real y no se toca.
`exigible_desde` es un campo de **política**, y la política cambió: el manifiesto que viaja
con la 1.6.0 es la declaración de la 1.6.0 sobre cuándo es exigible cada versión del
canónico. Dejar las viejas con su ventana original sería peor que inconsistente: el
consumidor que está dos versiones atrás heredaría una ventana de la 1.4.2 y el cambio no
tendría efecto sobre el único repo al que le importa — o sea, sería un cambio que no cambia
nada, que es la peor clase.

## D3. Por qué esto NO es breaking, con el test del propio marco

`AGENTS.md` define breaking como «endurecer un check de modo que **un repo que hoy pasa
mañana falle**». El test operativo es: *¿un repositorio que no toca una sola línea pasa de
verde a rojo?* Con distribución por **versión exacta e inmutable**, no: su pin resuelve el
mismo árbol para siempre. El rojo aparece únicamente dentro de un **PR de bump**, que el
consumidor abre, lee y mergea o no.

La lista de breaking de `AGENTS.md` se escribió cuando el canal era el tag móvil, donde el
cambio llegaba **empujado**. Ese bullet describe el modelo de empuje. Lo que queda de él en
el modelo actual —y sigue siendo breaking— es lo que rompe **el bump**: renombrar un job
que publica un check, exigir un permiso nuevo, quitar un input. Esto no hace nada de eso.

**Lo que sí cambia y va nombrado en mayúsculas en «Para consumidores»:** el PR de bump de
un repo atrasado llega **rojo** en vez de amarillo, y no se puede mergear sin regenerar el
artefacto. El arreglo es el mismo que ya existía y no requiere escribir nada: el propio job
sube el artefacto al día.

## D4. El output `exigible_desde` se QUEDA

**Decisión.** No se toca: ni el output de `action.yml`, ni el campo del manifiesto, ni
`hallazgoPorFecha`. Solo se corrige la descripción del output, que hoy dice «fecha desde la
cual esa version deja de ser aviso y pasa a fallar» y describe la política vieja.

**Por qué se reconsideró.** La primera versión de este design lo quitaba, con el argumento
de que no lo consume nadie —medido: ni el andamio, ni las skills, ni el `ci.yml` del
consumidor real, que solo usa `outputs.corregidos`—. Pero quitar un output es **breaking
por la letra de `AGENTS.md`**, y el beneficio era cero: el campo sigue existiendo porque el
mecanismo de aviso sobrevive (D1). Pagar una etiqueta de breaking por borrar algo que sigue
teniendo sentido es al revés.

## D5. La propiedad se enuncia donde no estaba

**Hallazgo del recon, y es la mitad más valiosa de este change:** el comportamiento del
artefacto de la constitución **no está en ningún spec vivo**. Vive en el código, en
`actions/README.md` y en la skill del release. Se buscó en las nueve capabilities: cero
requirements.

Así que el delta no «modifica» una garantía: la **escribe por primera vez**, con el
comportamiento nuevo. Eso tiene una consecuencia sana e inmediata: a partir del merge,
cambiar esta política vuelve a exigir un delta, que es lo que no ocurrió las veces
anteriores.

## D6. Lo que este change NO arregla, dicho antes de que alguien lo suponga

- **La ventana de la cobertura** (`calidad-codigo`, líneas 265-275, cierre 2026-09-30)
  tiene la misma premisa vencida y **no se toca**: otro mecanismo, otro radio, una fecha ya
  anunciada. Queda nombrada en el proposal.
- **El artefacto del consumidor no se regenera acá.** Este change hace que su
  próximo PR de bump llegue rojo; regenerarlo es trabajo de ese repo, en ese PR.
- **La premisa vencida sigue escrita en el spec vivo de la cobertura.** Corregir esa
  justificación es parte de la decisión sobre esa otra ventana, no de esta.
