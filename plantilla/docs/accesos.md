# Matriz de accesos

**Quién puede qué, y qué pasa si esa persona no está.** Las reglas que el marco
deja en cada proyecto citan este archivo como el lugar donde vive esa respuesta,
así que existe desde el día uno aunque todavía no tenga filas.

**Para qué sirve de verdad.** No es un inventario de permisos: es la respuesta a
*«se fue la única persona que sabía entrar a X»*. Un acceso que sólo tiene un
titular es un punto único de falla, y esta tabla existe para que eso se vea antes
de que pase, no después.

## La tabla

Una fila por acceso. **`Bus factor` es cuántas personas pueden entrar hoy** — si
dice `1`, es un riesgo declarado, no un dato neutro.

| Acceso | Quién entra | Bus factor | Cómo se recupera si esa persona no está |
| --- | --- | --- | --- |
| *(sin filas todavía)* | | | |

## Qué anotar acá

- La cuenta de la plataforma donde publica el proyecto.
- La base de datos de producción.
- El registrador del dominio.
- Cualquier credencial que **no** viva en los secrets del repositorio: si vive
  ahí, el acceso es «quien pueda administrar el repositorio» y se anota una vez.

## Qué NO anotar acá

**Ningún valor de ninguna credencial.** Este archivo dice *quién puede*, nunca
*con qué*. Un secreto escrito en un `.md` versionado es un secreto publicado, y
rotarlo es más caro que no haberlo escrito.
