# Para el builder

Esta página es para quien ocupa el rol de **[builder](02-glosario.md)**: la persona que
**construye** lo que el [PO](02-glosario.md) decidió que se construya. Es la
hermana de [06-para-el-po.md](06-para-el-po.md), con la misma forma y en el mismo
orden, porque el reparto entre los dos roles es el corazón de cómo trabaja este
marco.

**Y sirve igual si sos las dos personas a la vez.** Trabajar solo no elimina los
dos roles: los junta en una cabeza. Lo que cambia no es qué hay que hacer, es
quién lo hace — y saber en cuál de los dos estás parado cuando tomás una decisión
es justamente lo que evita aprobarte a vos mismo sin pensarlo. La sección 5 dice
qué se apaga cuando sos uno solo y qué **no** se apaga.

**Palabras del marco que vas a ver acá**, cada una definida en una línea en el
[glosario](02-glosario.md): [change](02-glosario.md), [proposal](02-glosario.md),
[spec](02-glosario.md), [scenario](02-glosario.md), [delta](02-glosario.md),
[compuerta](02-glosario.md), [carril](02-glosario.md),
[veredicto agregado](02-glosario.md), [archive](02-glosario.md),
[andamio](02-glosario.md), [builder](02-glosario.md),
[CODEOWNERS](02-glosario.md).

---

## 1. Qué te toca a vos y qué no

El reparto en una línea: **el PO decide qué se construye y por qué; vos decidís
cómo, y sos quien responde por que funcione.**

| | El PO | Vos |
| --- | --- | --- |
| **Qué problema resolvemos** | decide | opina |
| **Por qué ahora** | decide | opina |
| **Cómo se comporta** (los escenarios de la spec) | aprueba | propone |
| **Con qué se construye** | informado | decide |
| **Cómo se organiza el código** | no participa | decide |
| **Qué se rompe si esto sale mal** | informado | mide |
| **Cuándo entra** | informado | decide, dentro de lo acordado |

Las dos filas que más se confunden son las del medio. **Los escenarios no los
escribís vos solo y no los aprueba el PO solo**: los proponés vos porque hace
falta saber qué es construible, y los aprueba el PO porque hace falta saber qué
es lo que el negocio pidió. Un escenario que solo entiende uno de los dos está
mal escrito.

---

## 2. Qué apruebo yo, y qué no

Esto no es una convención: está escrito en [`.github/CODEOWNERS`](02-glosario.md) de tu
proyecto y
GitHub lo hace cumplir sin que nadie se acuerde.

| Ruta | Quién la aprueba |
| --- | --- |
| **Todo el repositorio** | vos (el builder que **no** escribió el cambio) |
| `openspec/changes/**/proposal.md` | el PO |
| `openspec/changes/**/specs/` | el PO |
| `openspec/specs/` | el PO |

Leído al derecho: **vos aprobás todo, menos el «qué» y el «cómo se comporta»**.
Esas tres rutas son del PO y tu aprobación no las destraba — hacen falta las dos.

**La trampa que hay que conocer.** GitHub le pide revisión a los dueños del
código **excepto al autor del cambio**. Si sos el único dueño, tu propio pull
request no le pide revisión a nadie, y no aparece ningún error: simplemente no
se asigna. Un review que no aparece no es un review que falló, y por eso el marco
prefiere decir en voz alta que la regla está apagada antes que fingir que corre.

---

## 3. Cómo se escribe un change

Un change es una carpeta con cuatro archivos, y cada uno contesta una pregunta
distinta. Esto es lo que la página del PO enseña a **leer**; acá está lo que hay
que **escribir**.

| Archivo | Contesta | Quién lo aprueba |
| --- | --- | --- |
| `proposal.md` | **por qué** y qué cambia | el PO |
| `design.md` | **cómo**, y qué se descartó | el otro builder |
| `specs/` | **cómo se comporta**, en escenarios concretos | el PO |
| `tasks.md` | **los pasos**, en orden | el otro builder |

### El proposal es lo primero y no se escribe solo

Se escribe **antes de programar**, y esa es toda la gracia: escribirlo después es
documentar una decisión ya tomada, que no es lo mismo que tomarla. Tiene que
contestar las cuatro preguntas con las que el PO puede devolvértelo —están
listadas en [06-para-el-po.md](06-para-el-po.md) sección 5— así que conviene
leerlas antes de escribir, no después de que te lo rechacen.

### El design es donde vive lo que descartaste

La parte que más se salta y la que más sirve seis meses después. Un design que
solo cuenta lo que se hizo obliga a la próxima persona a redescubrir por qué las
otras dos opciones no servían. **Lo descartado, con su motivo, vale más que lo
elegido.**

### Los escenarios se escriben en ejemplos, no en adjetivos

**Y hay una palabra que va en inglés aunque todo lo demás sea castellano:** la
línea que declara qué tiene que hacer el sistema necesita **[`SHALL`](02-glosario.md)**
o `MUST`,
en mayúsculas. Es lo que el validador busca para reconocerla, y ese validador
corre en las verificaciones automáticas. Con `DEBE` sale rojo, y el error **no
menciona la palabra**. Está explicado con un ejemplo completo en
[09-construir-con-openspec.md](09-construir-con-openspec.md).

«El sistema debe ser rápido» no es un escenario: no hay forma de saber si se
cumple. «**Cuando** el catálogo tiene 10.000 artículos, **entonces** la primera
pantalla aparece en menos de dos segundos» sí. La prueba de que un escenario está
bien escrito es que alguien pueda decir *sí* o *no* sin discutir.

---

## 4. Qué te va a poner rojo, y qué hacer con cada uno

El pipeline no es un examen sorpresa: podés correr **lo mismo que corre él**
antes de enviar nada.

```bash
pnpm verificar
```

Ese comando encadena, en este orden, todo lo que la verificación automática va a
comprobar: genera el cliente de la capa de datos, revisa el estilo, revisa el
formato, revisa los tipos, corre las pruebas y compila. **Si esto está en verde
en tu computadora, no hay sorpresas en el pull request.**

| Si se corta en | Quiere decir | Se arregla con |
| --- | --- | --- |
| `datos` | el cliente de la capa de datos no se pudo generar | mirá el error: casi siempre es el esquema |
| `lint` | hay algo que el equipo acordó no escribir así | `pnpm lint` te dice el archivo y la línea |
| `format:check` | el formato no es el del equipo | `pnpm format`, y listo |
| `typecheck` | los tipos no cierran | es el único que hay que pensar |
| `test` | una prueba dejó de pasar | si la rompiste vos, arreglala; si la rompió el cambio a propósito, actualizala **en el mismo pull request** |
| `build` | no compila | casi siempre viene con `typecheck` |

**Y una compuerta que no es de código:** si tocaste `openspec/`, el pipeline
exige que el change valide y que sus cuatro partes no se contradigan entre sí.
Un `tasks.md` que hace algo que el `design.md` descartó es rojo, y con razón.

---

## 5. Si sos vos solo, qué se apaga y qué no

Trabajar solo apaga **una** cosa y solo una: **la aprobación de otra persona**.
Todo lo demás sigue en pie, y no por rigor: cada pieza sigue haciendo su trabajo
aunque no haya nadie más.

| | Con dos personas | Vos solo |
| --- | --- | --- |
| Pull request obligatorio | sí | **sí** |
| Verificación en verde para integrar | sí | **sí** |
| Escribir el change antes de programar | sí | **sí** |
| Aprobación de otra persona | sí | **apagada, y declarada** |

Por qué se apaga y no se finge: con un solo dueño del código, exigir la
aprobación de alguien más **bloquea todo merge sin salida** — tu cambio le pide
revisión a nadie y se queda esperando para siempre. El marco prefiere admitir que
la regla no está garantizada antes que declararla vigente porque está escrita.

Queda anotado en `.projects-desvios.json`, con el motivo y con **cuándo se
revisa**: el día que entre la segunda persona.

**Lo que sí perdés, y conviene saberlo:** el otro par de ojos. Ninguna
verificación automática reemplaza a alguien que pregunta «¿por qué así?». Si
trabajás solo, el sustituto más barato es dejar pasar una noche entre escribir el
change y aprobártelo — el proposal escrito ayer se lee distinto que el de hace
cinco minutos.

---

## Si querés seguir

- [06-para-el-po.md](06-para-el-po.md) — la otra mitad de este reparto: qué
  aprueba el PO, cómo lee un spec y con qué preguntas lo devuelve. Aunque hagas
  los dos roles, vale leerla como el rol que no estás ocupando.
- [11-reglas-no-escritas.md](11-reglas-no-escritas.md) — las reglas que el equipo
  practica y ningún archivo declaraba, con cuáles ya son automáticas y cuáles
  todavía dependen de que alguien se acuerde.
- [05-arrancar-tecnico.md](05-arrancar-tecnico.md) — si además te toca crear el
  proyecto desde cero.
- [03-stack.md](03-stack.md) — con qué corre esto, quién decide cada pieza y en
  qué archivo vive cada versión.
