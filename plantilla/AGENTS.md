# AGENTS.md — {{ORG}} / {{PROYECTO}}

> Este archivo es la **constitución de ESTE proyecto** para humanos y para agentes de IA
> (Claude Code, Cursor). Se carga en **cada sesión** de codificación, y tiene dos mitades:
>
> - **Lo del marco** — las reglas comunes del área (cómo trabajamos con OpenSpec, git y
>   despliegue, las fronteras de tres niveles, seguridad y observabilidad, AWS, secretos,
>   GitHub). **No están escritas acá**: llegan como artefacto generado en
>   `.projects/AGENTS-marco.md`, que carga la línea de abajo. Ese archivo **no se edita a
>   mano** —lo reescribe el marco y el CI compara su contenido contra el texto publicado—,
>   y por eso una regla común se corrige **una vez para todos** en vez de envejecer copia
>   por copia en cada repo.
> - **Lo del proyecto** — todo lo que sigue en este archivo: su stack, sus decisiones, las
>   reglas que valen acá y en ningún otro repo. Es de este repo: editalo cuando el proyecto
>   lo necesite.

@.projects/AGENTS-marco.md

**Lo que NO va en este archivo**: las reglas comunes del área —están en el artefacto, y ahí
se corrigen una vez para todos— y las excepciones a ellas, que se declaran en
`.projects-desvios.json` con su motivo escrito. El artefacto explica cómo se declara un desvío
y qué manda ante conflicto; una copia divergente de una regla del marco es un defecto del
repo, no un matiz.

---

## 🕳️ Antes del primer commit (borrar esta sección cuando esté hecho)

El scaffold llega con huecos a propósito: lo que es de ESTE proyecto no lo puede adivinar
una plantilla. Lo que sí llega resuelto es la base tecnológica del área, que la publica el
marco: no hay ninguna tabla de stack que completar.

1. Reemplazar todos los placeholders de doble llave del repo, **incluidos los valores de
   `.projects-valores.json`** (la lista completa, con qué poner en cada uno, está en el README
   del scaffold de Projects). Ese archivo es el que el marco lee para renderizar su porción de
   la constitución con los valores de este proyecto: si queda a medias, el artefacto sale
   con dobles llaves adentro y el CI se pone rojo por marcadores sin resolver.
2. Confirmar los tres roles (PO y dos builders) y que `.github/CODEOWNERS` tenga los
   equipos reales de la organización.
3. **Generar el artefacto del marco**: `gh workflow run actualizar-marco.yml` y mergear el
   PR que abre (o esperar la corrida semanal). Hasta que ese archivo exista, la línea
   `@.projects/AGENTS-marco.md` de arriba no carga nada y el CI lo avisa en cada corrida.
4. Pedir el acceso al canal donde el marco avisa cada versión que publica. Este repo
   consume `@v1`, que es un tag **móvil**: sin ese aviso, el proyecto se entera de un
   comportamiento nuevo del marco el día que un check lo pone en rojo. Qué hacer con cada
   aviso está en el artefacto del marco.
5. Borrar esta sección y este párrafo. **Recién ahí** corre la verificación final:
   `grep -rnE "\{\{[A-Z0-9_]+\}\}" --exclude-dir=node_modules --exclude-dir=.git .` no debe
   devolver nada (esta sección es la única que menciona la doble llave a propósito; el
   patrón exige mayúsculas para no marcar las expresiones `${{ ... }}` de GitHub Actions).

---

## Lo que este proyecto agrega sobre la base

**La base tecnológica del área no se escribe acá.** Qué pieza corre en cada capa —cómputo,
persistencia, frontend, backend, identidad, validación de input externo, IaC, pipeline,
gestor de paquetes y pruebas— la publica el marco en un solo lugar y llega **ya escrita**
en el artefacto (`.projects/AGENTS-marco.md`). No hay ninguna tabla que llenar: por eso este
scaffold ya no trae una, y por eso el proyecto que nace hoy no vuelve a tipear la misma
lista con la deriva que eso produce.

Acá va lo que este proyecto agrega **encima** de la base: una librería de UI, el cliente de
un tercero, una herramienta de su dominio. Una vez escrito queda congelado igual que la
tabla vieja: introducir algo que no esté ni en la base ni acá es una decisión y no una
implementación, y las fronteras del marco dicen cómo se pide.

Y si lo que el proyecto necesita es **otra pieza en una capa que la base ya fija**, eso no
es una fila que se edita: es un **desvío**, se pregunta ANTES de implementarlo y se declara
en `.projects-desvios.json` con su aprobador y su motivo. El bloque `base` de
`.projects-valores.json` llega lleno con la base publicada y solo se toca cuando ese desvío
está aprobado; el CI compara las dos cosas en cada corrida.

Los **ambientes** de este proyecto —dominios, cuentas, perfiles, región—, el canal de
alertas y el prefijo de sus recursos NO se escriben acá: son valores, viven en
`.projects-valores.json` y el marco los imprime en su tabla de ambientes al renderizar el
artefacto. Así el día que cambie uno se cambia en un solo lugar y no hay dos tablas
diciendo cosas distintas.

---

## Lo propio de este proyecto

> 🕳️ Acá van las reglas que son de **este** repo y de ningún otro: una restricción de su
> dominio, una particularidad de su infraestructura, un acuerdo con otro equipo, una
> herencia que todavía no se terminó de limpiar. Escribilas con la misma forma que las del
> marco: qué se hace, qué no, y por qué.
>
> Ejemplos reales de otros repos del área, para calibrar el tamaño:
>
> - "El `spec/` viejo quedó archivado en `docs/legacy-spec/`, sin autoridad: la fuente de
>   verdad es `openspec/`."
> - "Todavía no existe `infra-prod/`: producción no está aprovisionada, así que la
>   promoción termina en dev."
> - "El enforcement duro del ruleset se activa cuando el segundo builder esté operativo."
>
> **Si al escribir una regla acá pensás "esto le sirve a todos los proyectos", no va acá**:
> se propone como change en el marco y llega por el artefacto. Y si lo que querés es
> apartarte de una regla del marco, eso no se escribe como regla propia — se declara como
> desvío en `.projects-desvios.json`, que es lo único que el marco reconoce como override.

Este proyecto todavía no tiene ninguna regla propia. Borrá esta línea al escribir la
primera.
