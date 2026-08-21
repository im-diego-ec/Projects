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

El scaffold llega con huecos a propósito: una plantilla que trae el stack de otro proyecto
miente desde el día 1.

1. Llenar **Stack fijado** (la sección siguiente). Sin eso, las reglas del marco que
   nombran "el stack" no tienen referente.
2. Reemplazar todos los placeholders de doble llave del repo, **incluidos los valores de
   `.projects-valores.json`** (la lista completa, con qué poner en cada uno, está en el README
   del scaffold de Projects). Ese archivo es el que el marco lee para renderizar su porción de
   la constitución con los valores de este proyecto: si queda a medias, el artefacto sale
   con dobles llaves adentro y el CI se pone rojo por marcadores sin resolver.
3. Confirmar los tres roles (PO y dos builders) y que `.github/CODEOWNERS` tenga los
   equipos reales de la organización.
4. **Generar el artefacto del marco**: `gh workflow run actualizar-marco.yml` y mergear el
   PR que abre (o esperar la corrida semanal). Hasta que ese archivo exista, la línea
   `@.projects/AGENTS-marco.md` de arriba no carga nada y el CI lo avisa en cada corrida.
5. Pedir el acceso al canal donde el marco avisa cada versión que publica. Este repo
   consume `@v1`, que es un tag **móvil**: sin ese aviso, el proyecto se entera de un
   comportamiento nuevo del marco el día que un check lo pone en rojo. Qué hacer con cada
   aviso está en el artefacto del marco.
6. Borrar esta sección y este párrafo. **Recién ahí** corre la verificación final:
   `grep -rnE "\{\{[A-Z0-9_]+\}\}" --exclude-dir=node_modules --exclude-dir=.git .` no debe
   devolver nada (esta sección es la única que menciona la doble llave a propósito; el
   patrón exige mayúsculas para no marcar las expresiones `${{ ... }}` de GitHub Actions).

---

## Stack fijado

> 🕳️ **COMPLETAR AL CREAR EL PROYECTO.** Llená cada fila con la herramienta elegida y
> borrá las filas que no apliquen (un proyecto sin frontend no tiene fila Frontend).
> El valor de esta tabla no es la lista: es que **queda congelada**. Una vez llena,
> introducir un framework, ORM, base de datos o servicio que no esté acá es una decisión y
> no una implementación — las fronteras del marco dicen cómo se pide.

| Capa | Herramienta |
|---|---|
| Frontend | 🕳️ |
| Backend | 🕳️ |
| Datos | 🕳️ |
| Auth | 🕳️ |
| Validación de input externo | 🕳️ (por defecto del marco: **Zod**) |
| Infra | **AWS** + **Terraform** (IaC; `infra/` dev, `infra-prod/` producción) |
| CI/CD | **GitHub Actions** (promoción por ambientes, workflows reusables del marco) |
| Package manager | **pnpm** con workspaces (monorepo: {{PAQUETES}}) |
| Tests | 🕳️ (unit/integración) + 🕳️ (E2E contra dev) |

Las filas **Infra**, **CI/CD** y **Package manager** llegan llenas porque no son elección
del proyecto: Terraform como IaC, GitHub Actions como pipeline y pnpm con workspaces los
fija el marco. Todo lo demás lo decide el proyecto una vez, acá.

pnpm está fijado porque el CI que trae el scaffold lo ejecuta directamente (`corepack
enable`, `pnpm install --frozen-lockfile`, y `pnpm list -r` para derivar de pnpm —y no de
una lista escrita a mano— qué paquetes hay que verificar) y porque depende de una propiedad
concreta del workspace: **un único lockfile, en la raíz**. Un lockfile suelto dentro de un
paquete hace que local y CI resuelvan dependencias distinto; por eso el `.gitignore` del
scaffold los bloquea. Cambiar de package manager no es sustituir un comando: es reescribir
el job de build del CI y rehacer esa garantía.

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
