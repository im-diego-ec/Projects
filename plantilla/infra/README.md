# `infra/` — ambiente de desarrollo de {{PROYECTO}}

> ## Antes de leer esto: ¿este proyecto usa AWS?
>
> **El marco ya no fija la nube.** Este directorio es el **adaptador `aws`** y llega
> desarrollado porque es el que estaba escrito, no porque sea la primera opción. Lo que el
> marco exige son cuatro capacidades —dónde corre la API, dónde vive la base, cómo se
> resuelven los secretos en el arranque de cada tarea, y cómo se despliega y se verifica lo
> desplegado—; con qué plataforma se cumplen lo decide el proyecto en
> [`adaptadores.md`](adaptadores.md), que trae las cinco opciones admitidas con su plan
> gratuito medido.
>
> **Si la plataforma de este proyecto no es `aws` —o todavía es `ninguna`—, este directorio
> y `../infra-prod/` se borran enteros.** No hay nada que desactivar: el job de Terraform
> del CI mira si las raíces existen y, cuando no, lo dice con un `::notice::` y sale verde.
> Lo único de este directorio que sobrevive es `adaptadores.md`, que se mueve a la raíz.
>
> Y si el objetivo es **coste cero**, leé el adaptador antes de quedarte con éste: el plan
> gratuito de AWS es una promoción con fecha de vencimiento, no un escalón permanente.

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

**Sin resolver, en `pendientes.tf`**: siete. Cada uno dice qué falta, **con qué
criterio se decide**, **cuándo se resuelve** y qué garantía del marco queda sin cumplir
si no se hace. El momento importa tanto como el criterio: un pendiente sin momento se lee
como trabajo futuro sin dueño.

Uno de los siete tiene una ventana que se cierra sola: **la retención y la clase del grupo
de logs del servicio** se deciden al crear el grupo, porque la clase no se puede cambiar
después. Los demás se pueden corregir; ése, sólo recreando el grupo.

⚠️ **Estos pendientes no tienen compuerta** —una comprobación que bloquea el merge—: el
pipeline **no** se pone rojo por ellos. Es a propósito —un token que cuenta desde el día
uno pondría rojo a un repositorio recién nacido por decisiones que todavía no puede
tomar—. Si el marco llega a emitir una señal sobre ellos, la trae una versión nueva y el
change —la propuesta escrita— que la decida. Hasta entonces se revisa a mano:
`grep -rn PENDIENTE-INFRA infra infra-prod`.

Dos de los siete —el bucket del state y el identificador del cluster— se parecen
más a un **dato de la organización** que a una decisión de este proyecto, cuando
la organización ya los tiene (si no, crearlos es infraestructura base y se
pregunta antes). Están como pendiente porque el andamio hoy no los sustituye. Si te toca resolverlos a mano,
anotalo: el arreglo de fondo es que pasen a ser valores y estos dos pendientes
desaparezcan.

## Lo que el CI **sí** mira desde el primer PR

El aviso de arriba es sobre los **pendientes**, no sobre el resto del archivo. El
job `terraform` del workflow del marco —el que `.github/workflows/ci.yml` llama en su
primer job, `marco`— corre en cada PR, también en los que solo tocan `infra/`, y en
cada push a `main`:

```bash
terraform fmt -check -recursive infra infra-prod
# y, en cada raíz:
terraform init -backend=false && terraform validate
```

Las dos son **inertes**: `fmt` sólo lee texto, y `-backend=false` es lo que evita
tocar el bucket del state — que es justamente el pendiente 1. No hacen falta
cuenta, credenciales ni que este repositorio se despliegue, y por eso son
exigibles desde el día uno aunque los pendientes no tengan compuerta.

Corren en **modo aviso** —un fallo se anuncia en el resumen de la corrida y no
bloquea el merge— en toda la versión 1 del marco, y **bloquean desde la versión
2**. El cambio no depende de una fecha: llega con el PR de Dependabot que sube el
marco a la versión 2, y las notas de esa versión lo dicen ahí mismo. Los mismos dos
comandos corren en tu máquina sin credenciales.

**Tres cosas se avisan, no dos.** El binario de `terraform` sale hoy de la imagen
del runner —al job del marco todavía le falta un `hashicorp/setup-terraform` pinado
por SHA—, así que _no encontrarlo_ es el tercer fallo y corre con **la misma
gravedad**: avisa en la versión 1 y detiene desde la 2. Es justamente el motivo de
que la versión 1 entera avise: el arreglo del binario es del marco y no de este
repositorio. Mientras tanto, un `::warning::` en el resumen de la corrida dice cuál
de los tres pasó, así que «no pude verificar» nunca se lee como «verifiqué y está
bien».

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
