## Infraestructura, plataforma y secretos

<!-- projects:regla id=infra-base-fijada -->

- **Lo que el marco fija son CUATRO CAPACIDADES, no un producto**: (a) **dónde corre la API**, (b)
  **dónde vive la base de datos**, (c) **cómo se resuelven los secretos en el arranque de cada
  tarea**, y (d) **cómo se despliega y cómo se verifica lo desplegado**. Un proyecto cumple el
  marco cuando las cuatro tienen dueño escrito; el producto lo elige él. Fijarlo acá era un
  proveedor disfrazado de invariante: dejaba fuera a quien no puede pagar por hora.

<!-- projects:regla id=plataforma-la-elige-el-proyecto -->

- **La plataforma es un valor del proyecto**: la clave `plataforma` de `.projects-valores.json`,
  con cinco admitidos —`supabase`, `cloudflare`, `gcp`, `aws` y `ninguna`— y un **adaptador** por
  cada uno en `infra/adaptadores.md`. **Nace declarando `aws`**: es la única que el andamio
  reparte ya escrita, o sea de dónde arranca y no una recomendación —su plan gratuito vence—.
  Cambiarla, o usar una fuera de la lista, es **frontera ⚠️**.

<!-- projects:regla id=ninguna-es-una-respuesta -->

- **`ninguna` es una respuesta legítima y de primera clase**: un proyecto que todavía no despliega
  **no elige una nube para llenar el hueco**; (a) y (b) las cubre su entorno local y (c) no se
  relaja. Pero **elegirla es trabajo, no omisión**: ninguna herramienta reparte todavía el andamio
  según esa clave, así que las raíces de Terraform llegan igual y se borran a mano —el adaptador
  lista los pasos—. Mientras existan, el CI las exige; borradas, sale `::notice::` y verde.

<!-- projects:regla id=iac-es-terraform -->

- **La infraestructura que exista se declara como código, versionada y revisable**: Terraform es
  la forma por defecto —`infra/` dev, `infra-prod/` producción— porque el pipeline la verifica sin
  credenciales (`fmt -check`, `init -backend=false && validate`). Una plataforma cuyo despliegue
  no pasa por Terraform lo declara **en su adaptador**, no en la cabeza de quien despliega. Nunca
  se genera una segunda IaC al lado de la primera —ni CDK ni CloudFormation, ni como borrador—.
  Todo `apply` en producción exige el OK explícito de {{BUILDER_1}}.

<!-- projects:regla id=costo-declarado-con-techo -->

- **El costo se declara antes de elegir la plataforma, y tiene techo**: el adaptador escribe qué
  cubre el plan gratuito, cuándo se sale de él y qué pasa ese día. Un servicio que escala sin
  límite máximo no está terminado: sin techo, un pico —o un bucle— escala hasta donde aguante la
  tarjeta y el presupuesto se entera después. Los límites **se verifican contra la página del
  proveedor y se anotan con su fecha**, jamás de memoria.

<!-- projects:regla id=ante-la-duda-verificar-documentacion -->

- **Ante la duda sobre un detalle de la plataforma** (parámetro, permiso, límite, código de error)
  se verifica contra documentación en vez de adivinar, y se declara la incertidumbre si no se
  puede confirmar. **Well-Architected** sigue siendo el marco de referencia: sus preguntas
  —fiabilidad, costo, seguridad, operación— no son de un proveedor.

<!-- projects:regla id=lectura-de-aws-por-cli -->

- **El estado de la plataforma se lee por su CLI oficial**, con los perfiles que el repo ya
  permite; un servidor MCP del proveedor es configuración personal de cada máquina, no un supuesto
  del repositorio.

<!-- projects:regla id=skills-antes-de-tarea-aws -->

- **Antes de una tarea de infraestructura se carga la skill que aplique**, si la hay: su guía
  manda sobre el conocimiento general, pero **jamás es permiso para cambiar de IaC**.

<!-- projects:regla id=sin-em-dashes-en-recursos-aws -->

- **Sin em dashes en nombres ni descripciones de recursos** (usar guiones): aplica a valores que
  viajan al proveedor, no a la prosa. Estas tres conservan el sufijo `-aws` en su id porque
  renombrarlas anularía en silencio los desvíos que ya las nombran.

<!-- projects:regla id=secretos-se-resuelven-en-el-arranque -->

- **Un secreto se resuelve EN EL ARRANQUE DE CADA TAREA, por la identidad del runtime, y jamás se
  copia al build.** Es la capacidad (c) y la lección más cara del marco: el 2026-07-27 una
  credencial rotativa capturada como variable de entorno del deploy tiró una aplicación. Un
  secreto copiado al build es una caída con fecha. El nombre es el mismo en toda plataforma
  —`/{{PREFIJO_RECURSOS}}/<env>/<NOMBRE>`— y qué almacén lo implementa lo dice el adaptador.
  Ningún adaptador negocia estas dos: el valor **no entra al estado de la IaC**, y a la base se
  entra con identidad, no con contraseña.

<!-- projects:regla id=el-valor-de-un-secreto-no-entra-al-contexto -->

- **El valor de un secreto jamás entra al contexto del agente**: ningún comando que lo imprima
  —`get-secret-value`, `get-parameter --with-decryption`, o el equivalente de cada plataforma—. Se
  verifica que EXISTE y que su consumidor lo resuelve, nunca su valor.

<!-- projects:regla id=crear-o-rotar-secreto-es-tarea-humana -->

- **Crear o rotar un secreto es tarea humana**; en producción, además, exige el OK explícito de
  {{BUILDER_1}}. La matriz de accesos (quién puede qué, bus factor) vive en `docs/accesos.md`.

---
