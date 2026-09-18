# calidad-codigo — deltas de el-comando-que-se-pega-funciona

## ADDED Requirements

### Requirement: Un comando que la herramienta manda a ejecutar tiene que poder ejecutarse

Cuando una herramienta del marco imprime un comando para que una persona lo
copie y lo ejecute, ese comando SHALL ser ejecutable tal cual se imprimió, sin
que quien lo recibe tenga que corregirlo.

Toda ruta del sistema de archivos que viaje dentro de un comando impreso SHALL
entrecomillarse cuando contenga espacios o cualquier carácter que la shell
interprete. La comprobación NO SHALL depender de que la ruta de quien corre la
herramienta esté libre de espacios: las carpetas donde las personas guardan sus
cosas los tienen.

#### Scenario: El clon vive en una ruta con espacios

- **WHEN** la herramienta imprime un comando que nombra una ruta con espacios
- **THEN** la ruta viaja entrecomillada y el comando se ejecuta sin editarlo

#### Scenario: El comando impreso se ejecuta de verdad

- **WHEN** el banco verifica un comando que la herramienta propone
- **THEN** lo extrae de la salida y lo ejecuta, en vez de comprobar que el texto se parezca al esperado

### Requirement: Una ruta del sistema de archivos no se deriva de la parte de una URL

El código del marco NO SHALL construir rutas del sistema de archivos con la
propiedad `pathname` de una URL. `pathname` devuelve la ruta percent-encoded, de
modo que un espacio viaja como `%20` y produce una ruta que no existe. La
conversión SHALL hacerse con la función que la biblioteca estándar provee para
eso.

Este requirement aplica a rutas de archivos. NO aplica a la lectura del componente
de una URL de red, que es el uso legítimo de esa propiedad.

#### Scenario: Un banco arma la ruta de un directorio del repositorio

- **WHEN** una prueba necesita la ruta de un directorio del repositorio a partir de la URL de su propio módulo
- **THEN** la obtiene con la conversión de URL a ruta, y no leyendo `pathname`

#### Scenario: Una ruta percent-encoded llega a una herramienta

- **WHEN** una herramienta recibe un directorio que no existe porque la ruta viajó codificada
- **THEN** el banco que la ejerce falla, en vez de pasar en verde sobre un directorio vacío
