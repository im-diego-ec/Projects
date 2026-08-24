# `infra/` — ambiente de desarrollo de {{PROYECTO}}

Terraform del ambiente **dev**, cuenta `{{CUENTA_DEV}}`, región `{{REGION}}`.

```bash
AWS_PROFILE={{PERFIL_DEV}} terraform init
AWS_PROFILE={{PERFIL_DEV}} terraform plan
```

`init` va a fallar hasta que resuelvas el pendiente 1, y eso es a propósito: el
marcador está dentro del nombre del bucket para que no se pueda crear un state en
un lugar equivocado.

## Qué llegó resuelto y qué no

**Resuelto, porque se deriva de los valores del proyecto** (`main.tf`): la `key`
del state, la región, el proveedor con sus etiquetas por defecto, la referencia a
la base compartida y la referencia a la red. No hay que tocar nada de eso.

**Sin resolver, en `pendientes.tf`**: seis. Cada uno dice qué falta, **con qué
criterio se decide** y qué garantía del marco queda sin cumplir si no se hace. El
pipeline se queda **rojo** mientras sobreviva uno.

Dos de los seis —el bucket del state y el identificador del cluster— se parecen
más a un **dato del área** que a una decisión de este proyecto. Están como
pendiente porque el andamio hoy no los sustituye. Si te toca resolverlos a mano,
anotalo: el arreglo de fondo es que pasen a ser valores y estos dos pendientes
desaparezcan.

## Cero recursos, y es la frontera de este andamio

No hay una sola declaración de recurso en este directorio. Lo que hay es la
infraestructura que **ya existe** referenciada, y los pendientes que describen lo
que falta crear. El andamio no reparte infraestructura sin verificar: hacerlo
significaría que cada proyecto nuevo hereda los errores de la última vez que
alguien la escribió.

## Por qué dev NO tiene pendiente de alarmas

**Es decisión tomada, no un hueco.** Las alarmas que importan son las de
producción, y dev es un ambiente compartido donde los despliegues de prueba son
constantes: una alarma que suena por un deploy de prueba entrena a ignorarla, y
entonces también se ignora la de producción.

Lo que dev **sí** tiene es la misma exigencia de logs estructurados y el mismo
contrato de niveles que producción, porque de eso depende que la verificación
post-deploy entienda lo que lee.

El pendiente de alarmas vive en `../infra-prod/pendientes.tf`.
