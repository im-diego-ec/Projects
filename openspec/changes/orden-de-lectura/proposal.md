---
artefacto: proposal
dri: PO
aprueba: revision esceptica adversarial  # el equipo es UNA persona: no existe el
                              # builder par que la regla por defecto pide. La
                              # sustitucion esta declarada en design.md y no es
                              # una excepcion silenciosa
informado: PO
estado: pendiente-de-revision
---

# orden-de-lectura — Proposal

## Por qué

Una auditoría de seis recorridos, con cada hallazgo pasado por un refutador
independiente, midió que **una persona no técnica no puede llevar este marco de
punta a punta sola**. De los cuatro tramos de esa pregunta, el primero —entender
por dónde se empieza— falla antes que ninguno: la carpeta `docs/` presentaba
trece archivos en orden alfabético, sin ninguna señal de cuál se lee primero ni
de cuáles se leen en secuencia.

El orden alfabético ponía `arrancar-un-proyecto.md` —la guía **técnica**, que la
propia página declara densa a propósito— como primer archivo de la carpeta, y
`empezar-sin-ser-tecnico.md` —la única que no supone nada— en el quinto lugar.
Quien abría la carpeta empezaba por la página equivocada.

Y hay un defecto que este cambio cierra y que es más grande que el orden:
**ninguna comprobación verificaba que un enlace apuntara a un archivo que
existe**. Medido sobre un clon: apuntando los 217 enlaces del glosario a un
archivo inexistente, sin renombrar nada, la suite daba 948 verdes de 951 — y los
tres rojos no eran chequeos de existencia, eran proxies accidentales. Se podía
romper la mitad de la navegación del repositorio y el pipeline quedaba
prácticamente verde.

## Qué cambia

- Las trece páginas de la raíz de `docs/` pasan a llamarse `NN-nombre.md`, con el
  número indicando **lugar en el camino de lectura**, no importancia. Las siete
  primeras son el camino; de la 08 a la 12 se abren el día que hace falta.
- `empezar-sin-ser-tecnico.md` pasa a ser `01-introduccion.md` y deja de ser solo
  una página de audiencia: abre diciendo qué se logra, qué **no** se logra,
  cuánto lleva y qué hay que tener antes.
- El índice se parte en tres secciones —el camino, lo que se abre cuando hace
  falta, y las carpetas sin número— con el criterio escrito.
- Entra `pruebas/docs/enlaces.test.mjs`: verifica que **todo** enlace relativo
  del repositorio apunte a un archivo existente y que **toda** ancla apunte a un
  encabezado existente.

## Impacto en los proyectos consumidores

**Ninguno.** Medido: `docs/14-consumidores.md` tiene la tabla del registro vacía,
y el único destino de adopción en curso no consume el marco. Nada de `docs/`
viaja al andamio, así que ningún repositorio nacido de `plantilla/` referencia
estas rutas. El costo del renombrado es enteramente interno.
