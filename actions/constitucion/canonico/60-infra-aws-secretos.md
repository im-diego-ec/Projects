## Infraestructura, AWS y secretos

<!-- projects:regla id=infra-base-fijada -->

- **La infraestructura base no se elige por proyecto: es la de la base tecnológica del
  área** (capas _Cómputo_ y _Persistencia_), y es la PRIMERA OPCIÓN siempre. No es una
  preferencia estética: es la topología que el pipeline del marco sabe desplegar,
  verificar y rollbackear, y la que el equipo sabe operar de guardia. Cualquier otra
  forma de cómputo o de persistencia —serverless, colas como base, otro motor, otro
  proveedor— se **pregunta antes de implementar** (frontera ⚠️) y se declara como desvío
  **de esa capa**. El proyecto con ese desvío aprobado deja de consumir las piezas de
  entrega del marco y es dueño de su deploy, sin dejar de cumplir la promoción, las
  compuertas de CI, la serialización sobre el ambiente compartido, la verificación de lo
  desplegado, la observabilidad ni el manejo de secretos.

<!-- projects:regla id=iac-es-terraform -->

- **IaC = Terraform, sin excepción**: `infra/` (dev, cuenta {{CUENTA_DEV}}),
  `infra-prod/` (prod, cuenta {{CUENTA_PROD}}), región {{REGION}}. En los repos del
  área NO se genera CDK ni CloudFormation, ni siquiera como borrador o comparación.
  Tocar Terraform ya requiere OK humano (⚠️) y todo `apply` en producción exige el OK
  explícito de {{BUILDER_1}}.

<!-- projects:regla id=lectura-de-aws-por-cli -->

- **Lectura de AWS por CLI**, con los perfiles que el repo ya permite
  (`{{PERFIL_DEV}}`, `{{PERFIL_PROD}}`): `terraform validate`, `terraform plan`,
  `describe-*`, Logs Insights. El servidor MCP de AWS es configuración personal de cada
  máquina, no un supuesto del repo: si no está, la CLI es el camino normal, no un
  sustituto degradado.

<!-- projects:regla id=skills-antes-de-tarea-aws -->

- **Skills**: antes de una tarea de AWS, revisar si hay una skill que aplique y
  cargarla; su guía manda sobre el conocimiento general. Ojo: las skills disponibles
  cubren CDK, CloudFormation y serverless, **no Terraform** — se usan como referencia
  del SERVICIO, jamás como permiso para cambiar de IaC.

<!-- projects:regla id=ante-la-duda-verificar-documentacion -->

- **Ante la duda sobre un detalle de AWS** (parámetro de API, permiso, límite, código
  de error) se verifica contra documentación en vez de adivinar, y se declara la
  incertidumbre si no se puede confirmar. **Well-Architected** es el marco de
  referencia al diseñar infraestructura.

<!-- projects:regla id=sin-em-dashes-en-recursos-aws -->

- **Sin em dashes en nombres ni descripciones de recursos AWS** (usar guiones). Aplica
  SOLO a valores que viajan a AWS; la prosa de docs y los comentarios siguen el estilo
  normal del área.

### Secretos: dónde viven y cómo NO se leen

<!-- projects:regla id=secretos-se-resuelven-en-el-arranque -->

- Mecanismo del marco: **SSM Parameter Store (SecureString)**, resuelto por el rol de
  ejecución del runtime en **cada arranque de tarea**
  (`value_from = "arn:aws:ssm:{{REGION}}:<cuenta>:parameter/{{PREFIJO_RECURSOS}}/<env>/<NOMBRE>"`).
  Los parámetros se crean por CLI, **fuera de Terraform**, para que el valor nunca entre
  al tfstate. La base usa **IAM auth**, no password. El 2026-07-27 una credencial
  rotativa capturada como env var del deploy tiró la aplicación: un secreto copiado al
  build es una caída con fecha.

<!-- projects:regla id=el-valor-de-un-secreto-no-entra-al-contexto -->

- **El valor de un secreto jamás entra al contexto del agente**: nada de
  `secretsmanager get-secret-value`, `batch-get-secret-value` ni
  `ssm get-parameter --with-decryption`. Se verifica que el secreto EXISTE y que su
  consumidor lo resuelve, nunca su valor.

<!-- projects:regla id=crear-o-rotar-secreto-es-tarea-humana -->

- **Crear o rotar un parámetro es tarea humana**; en producción, además, exige el OK
  explícito de {{BUILDER_1}}. La matriz de accesos (quién puede qué, bus factor) vive
  en `docs/accesos.md`.

---
