---
artefacto: bitacora
dri: quien esté corriendo la sesión
informado: Builder 1, Builder 2, PO
experimental: true
veredicto_antes_de: 2026-09-21
---

# Bitácora de G5: los puntos que dependieron de que alguien se acordara

Este archivo se llena **mientras pasa**, no al final. La tarea 2.5 lo pide así
por un motivo que el propio `design.md` admite de sí mismo: al final de un piloto
de cuatro semanas esta lista se reconstruye mal. Lo que se recuerda es lo que
salió mal fuerte; lo que se olvida es exactamente lo que G5 busca, que son los
momentos chicos en que el piloto siguió andando porque una persona se acordó de
algo que ningún check verifica.

**Cómo se anota.** Una fila por vez, en el momento, aunque parezca menor. Lo
menor es el material de G5: un guardrail nace de un olvido barato, no de una
catástrofe. Si no está claro si algo cuenta, se anota y el scorer decide después.

**Lo que NO va acá, para que no se mezclen dos listas.** Las preguntas que la
herramienta o el brazo le hagan al PO y que el corpus no contestaba van a
`lista-de-observacion.md` del espacio de ese brazo, con su `L0xx`: son procedencia
de un escenario, no deuda de disciplina. Si además hubo que acordarse de anotarlas,
**eso** sí es un ítem de esta bitácora.

**La regla dura, impresa acá para que no haga falta buscarla:** esta lista **no
puede terminar vacía**. Una lista vacía no significa que el piloto no dependió de
la memoria de nadie; significa que nadie miró, y así se lee en el veredicto. Y si
todos los ítems terminan con destino «queda fuera», el techo del veredicto es
**amarillo**, por la regla de veredicto de la sección 4 del pre-registro, que es la
vigente. O sea que llenar la columna de destino con
«queda fuera» en todo no es la salida barata: es un resultado con consecuencia.

**Sin nombres de entrevistados**, ni citas que los identifiquen. Los roles del
equipo sí van (PO, builder, scorer): hacen falta para entender el punto.

| fecha | en qué punto el piloto dependió de que alguien se acordara | quién lo notó | destino |
|---|---|---|---|

El destino toma una de dos formas, y ninguna otra:

- `check propuesto: <qué verificaría y cuándo fallaría>` — la única forma que
  cuenta como enforcement en este repo.
- `queda fuera: <por qué>` — decisión legítima, con su motivo escrito. Cuenta
  para el techo amarillo.
