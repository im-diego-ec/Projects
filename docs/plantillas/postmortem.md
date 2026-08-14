# Plantilla y convención: post-mortem

Esta plantilla se **copia** al crear el proyecto (pieza de scaffold) y vive
como `docs/postmortems/PLANTILLA.md` en el repo del proyecto. Desde ese
momento es del proyecto: si necesita una sección más, se agrega allá.

---

## La convención (tres reglas, y ninguna es opcional)

### 1. Sin culpas

El post-mortem documenta **el SISTEMA que permitió el fallo**, no a la
persona que tecleó. No es cortesía: es la única forma de que el siguiente
post-mortem se escriba. Un equipo que asocia el post-mortem con una boleta
deja de reportar los incidentes chicos, y los incidentes chicos son
exactamente los que avisan del grande.

En la práctica, esto se lee en la redacción: se escribe en tercera persona
sobre el sistema — *"el guard de ambiente no existía"*, no *"fulano olvidó
el guard"*. Si en la causa raíz aparece un nombre propio, la causa raíz
todavía no está: la pregunta que falta es *¿qué permitió que un error humano
llegara hasta acá?*

Excepción única y en la dirección contraria: **atribuir el hallazgo sí es
correcto y se agradece**. Quien cazó el problema aparece con nombre en el
timeline y en el commit del arreglo.

### 2. Dentro de las 48 horas

Pasadas 48 horas ya nadie recuerda el orden real de los hechos, y el
post-mortem se convierte en una reconstrucción cómoda donde todo tuvo
sentido. La ventana corta obliga a escribirlo con los logs y los mensajes
todavía a la vista.

Si a las 48 horas el incidente no está cerrado, se escribe igual con lo que
hay y se marca **`estado: en curso`**. Un post-mortem parcial y fechado vale
más que uno completo que nunca llega.

### 3. Cada acción está HECHA o tiene issue

La sección *Qué cambió* no admite frases como "habría que", "sería bueno",
"queda pendiente revisar". Cada acción correctiva o:

- ya está **HECHA**, con enlace al PR, commit, ADR o alarma; o
- tiene **issue abierto en el board**, con enlace.

**Un post-mortem sin acciones enlazadas es un cuento.** Es la regla que
convierte el documento en trabajo: la lista de acciones sin enlace es
exactamente la lista de cosas que van a volver a pasar.

---

## Qué se hace con la detección

Hay una pregunta en el timeline que parece de trámite y es la más
importante del documento: **¿qué DETECTÓ el incidente, una alarma o un
humano?**

Si lo detectó un humano, **eso ya es un hallazgo** y merece su propia acción
correctiva: la alarma que faltaba, el check que no existía, la sonda que no
miraba ahí. El patrón medido en el proyecto piloto fue contundente — en los
cinco primeros post-mortems la detección fue humana en **los cinco**, y cada
uno financió una alarma o una compuerta nueva. El objetivo declarado del
marco es que el sexto lo detecte el sistema.

## Índice de post-mortems

El proyecto mantiene `docs/postmortems/README.md` con una tabla de una
línea por incidente:

| Fecha | Incidente | Lección central |
|---|---|---|
| `AAAA-MM-DD` | qué se rompió, en una frase | la regla que este incidente compró |

La columna "lección central" no es un resumen: es **la regla**, redactada
como regla. *"Ambiente compartido = serialización en el pipeline, no
disciplina humana"* sirve; *"hubo una carrera entre dos deploys"* no.

Nombre de archivo: `AAAA-MM-DD-nombre-corto.md`, en minúsculas y con
guiones. La fecha es la del incidente, no la de redacción.

---

## Plantilla (copiar desde acá)

````markdown
# AAAA-MM-DD — <título corto del incidente>

> Sin culpas: el post-mortem documenta el SISTEMA que permitió el fallo,
> no a la persona que tecleó. Se escribe dentro de las 48h del incidente.

- **Estado**: cerrado | en curso
- **Detectado por**: alarma `<nombre>` | humano (← si es humano, es un hallazgo)
- **Duración**: HH:MM a HH:MM (<zona horaria>)

## Qué pasó (timeline)

Hora a hora, con zona horaria, de la primera señal al cierre. Incluir qué
lo DETECTÓ: ¿una alarma o un humano? Si fue un humano, eso es un hallazgo
y se convierte en acción correctiva más abajo.

| Hora | Qué pasó |
|---|---|
| 00:00 | |

## Impacto

Quién lo sintió, cuánto duró, qué operaciones fallaron. Números si los
hay: cuántos usuarios, cuántas requests, cuántos minutos. "Algunos
usuarios" no es un impacto, es una sensación.

## Causa raíz

La cadena completa, no el síntoma. "El deploy falló" es un síntoma; "el
token del job no tenía el permiso X y el fail-open degradó en silencio" es
una causa. Si la causa raíz nombra a una persona, todavía falta una
pregunta: ¿qué permitió que ese error llegara hasta acá?

## Qué cambió

Acciones concretas con enlaces. Cada acción o está HECHA o tiene issue en
el board — un post-mortem sin acciones enlazadas es un cuento.

- [x] HECHA — <acción> (PR #NN)
- [ ] issue #NN — <acción>

## Lecciones

Las reglas nuevas que este incidente compró, y **dónde quedaron escritas**:
la constitución del repo, un ADR, un runbook, una alarma, un check de CI.
Una lección que no aterriza en un archivo se olvida en dos semanas.
````
