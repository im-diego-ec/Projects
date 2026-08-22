## Identidad visual y el idioma del producto

Las aplicaciones del área son mayormente interfaz, así que la marca es parte del
contrato. El manual completo —tokens, componentes, tipografía, data viz— es la skill
**`la organización-design`** de la organización. Acá viven solo las reglas que un agente tiene
que conocer **sin haber invocado nada**.

<!-- projects:regla id=marca-idioma-castellano -->

- **El área trabaja en castellano**, y eso incluye lo que un agente escribe: interfaz,
  errores, documentos. Las reglas de redacción de abajo son específicas del castellano,
  así que el idioma es la precondición del resto. Una herramienta que se instale en un
  proyecto se configura en castellano **al instalarla**. Otro idioma se declara como
  desvío, con su motivo.

<!-- projects:regla id=marca-texto-oscuro-sobre-acento -->

- **Texto oscuro sobre el naranja de marca, nunca blanco.** El blanco da 2.9:1 y **falla
  WCAG AA**; el oscuro da 6.7:1. Es la más fácil de romper sin darse cuenta —el blanco
  «se ve bien»— y la que más veces se rompió: cinco casos en el consumidor de
  referencia al 2026-08-22, uno en la variante primaria de su botón, o sea en toda la
  aplicación.

<!-- projects:regla id=marca-solo-tokens -->

- **Solo tokens: cero colores, medidas o z-index a mano.** Un literal no es un atajo: es
  un valor que nadie va a poder cambiar cuando la marca cambie, y que ningún check
  distingue de un error de tipeo. El único lugar donde los valores se escriben es la
  configuración de estilos del proyecto, y ahí tienen que coincidir con los del sistema.

<!-- projects:regla id=marca-el-logo-no-se-redibuja -->

- **El logo y la Estrella de la organización no se redibujan.** Se usan los archivos del sistema o
  su componente. Un SVG hecho a mano «que se parece» es otra marca con el mismo nombre:
  pasó tres veces en el consumidor, con una estrella de líneas rectas donde la oficial
  tiene curvas.

<!-- projects:regla id=marca-tema-y-foco -->

- **Los dos temas y el foco visible son requisito de entrada.** Claro y oscuro con su
  interruptor a la vista, y anillo doble solo en `:focus-visible`. Quitar el contorno
  del foco sin reemplazarlo deja la interfaz inusable con teclado: una forma de romperla
  que no se ve mirándola.

<!-- projects:regla id=marca-redaccion -->

- **Cómo se escribe lo que el usuario lee.** Mayúscula solo al principio de la frase.
  Los botones dicen qué va a pasar (`Guardar`, `Crear cuenta`), nunca `Aceptar` ni
  `Click aquí`. Los errores dicen qué falló y cómo seguir, sin culpar a quien los lee. Y
  números, fechas y monedas se formatean con las herramientas de internacionalización,
  nunca concatenando: una fecha armada a mano va a estar mal en algún locale.

<!-- projects:regla id=marca-lo-que-el-marco-no-transporta -->

- **Lo que el marco NO trae.** La tipografía llega sin archivos propios: el sistema
  declara que la carga de un proveedor externo porque la marca no entregó los binarios.
  Mientras ese hueco esté abierto el marco **no** pone en rojo a nadie por la tipografía:
  poner su sello sobre una sustitución la convertiría en la norma. Cerrarlo es un archivo
  que la marca tiene que entregar. Con los iconos pasa lo mismo, y ahí el sistema los toma
  de un proveedor sin fijar versión, que es lo contrario de lo que este marco pide para
  todo lo que ejecuta.
