## La base tecnológica del área

<!-- projects:regla id=la-base-es-la-primera-opcion -->

- **La base de abajo es la PRIMERA OPCIÓN de todo proyecto del área, y llega ya
  escrita.** No es un default que cada repo vuelva a tipear: es el único lugar donde
  vive, y se corrige una vez para todos. Los dos proyectos que existían cuando se fijó
  habían llegado por su cuenta a la misma base y la habían escrito a mano dos veces, con
  la deriva ya empezada en los detalles (uno pinaba «React 18» y el otro no; uno decía
  «Aurora Serverless v2» y el otro «Aurora PostgreSQL»). Apartarse de cualquier capa se
  **PREGUNTA ANTES de implementar** (frontera ⚠️) y se declara como desvío de la regla de
  esa capa. El desvío vale SOLO para la capa que nombra y no relaja ninguna otra
  propiedad del marco. Una capa que este proyecto todavía no implementó **no es** un
  desvío: es un pendiente. Y lo que el proyecto agrega ENCIMA de la base va en su
  `AGENTS.md`; cambiar la pieza de una capa que la base fija, no.

<!-- projects:base:capas -->

<!-- projects:regla id=base-se-cambia-con-un-change-del-marco -->

- **La base se cambia con un change de Projects, no editando este texto**, y exige la
  decisión escrita con su alternativa descartada y su impacto en los consumidores
  evaluado. Nombra la **pieza**, no su versión mayor: qué mayor corre cada repo lo
  gobierna la política de dependencias. El gestor de paquetes está en la base porque el
  CI del marco lo ejecuta directo y depende de una propiedad del workspace —**un único
  lockfile, en la raíz**—: cambiarlo es reescribir el job de build, no sustituir un
  comando.

---
