---
artefacto: design
dri: Builder 1
aprueba: Builder 1
informado: PO / Builder 2
estado: pendiente-de-revision
---

# calidad-fail-closed — Design

## Context

La promesa incumplida —«ningún paquete queda fuera del alcance del lint»— parece
pedir un check por paquete. No lo pide. Los dos agujeros que se encontraron
buscándola viven **dentro** de paquetes que tienen lint y tienen configuración de
compilación, así que cualquier verificación que pregunte «¿este paquete está
configurado?» los declara sanos:

- un componente de dominio escrito a mano, importado por cinco archivos del
  producto, tragado por una exclusión pensada para componentes generados;
- el script de humo que decide la promoción a producción, fuera de todo programa
  de tipos.

Eso reencuadra la pregunta de diseño: la unidad de la propiedad no es el paquete,
es el **archivo**.

## Decisions

### D1 — El alcance se DERIVA de las herramientas, no se declara

Se enumera el universo de archivos fuente versionados, se le pregunta a cada
herramienta del repositorio qué archivos ve de verdad, y se resta. Lo que sobra
es rojo.

La alternativa —exigir que cada paquete declare sus scripts de verificación— se
descartó con evidencia, no por gusto: verifica **declaración**, no **alcance**, y
el contrato habla de alcance. En el consumidor real, el caso que motiva todo el
change (la suite E2E) cerraría en verde con esa suite linteada sin una sola regla
que dependa de tipos. Y sería ciego por construcción a los dos agujeros de
arriba, que son intra-paquete.

También se descartó exigir un único comando raíz de verificación. Su migración de
referencia **reduce** la cobertura de lint mientras el check queda verde: al
reemplazar los pasos enumerados por un recorrido de paquetes, desaparece el lint
de la raíz —el único que corre con cero tolerancia a warnings— y quedan los de
cada paquete, que no la tienen. Un guardrail cuya adopción baja el alcance real
es peor que no tenerlo.

### D2 — La excepción vive en el paquete que la necesita, con motivo escrito

Un archivo puede quedar legítimamente fuera. La exclusión se declara en el
manifiesto del paquete que lo contiene, con su motivo, y no en una lista central
del marco.

Esto no vuelve imposible la evasión y no hay que venderlo como si lo hiciera. Lo
que cambia es su **naturaleza**: deja de ser una ausencia —invisible en el diff,
invisible en CI— y pasa a ser una afirmación escrita, en el diff del paquete,
bajo review cruzado. Una exclusión que ya no corresponde a ningún archivo es
roja, para que no sobrevivan a lo que las justificó.

### D3 — Sin censo comiteado

Se evaluó guardar el resultado en un archivo versionado, con huella de frescura y
versión del generador. Se descartó: es la mayor parte del costo recurrente y
compra un margen angosto. Paga con ruido en cada pull request, conflictos de
merge, y un pin que enrojece a todos los consumidores con cada corrección del
script bajo un tag móvil. El alcance se deriva en cada corrida y falla ahí mismo.

### D4 — El marco ejecuta el toolchain del consumidor, y eso es una frontera nueva

Hasta hoy el marco solo leía archivos del consumidor. Interrogar a las
herramientas exige **ejecutarlas**. Está acotado —corre en el job del propio
consumidor, después de que instaló sus dependencias; no linteo, no compila, no
instala nada: solo pregunta qué archivos ven— pero es una frontera que no
existía y se declara como impacto, no se cuela como detalle.

Su consecuencia real: un cambio mayor del analizador o del compilador puede mover
la API de introspección y afectar a todos los consumidores a la vez.

### D5 — Cobertura sobre el diff, con comparador propio

La propiedad no es «el número sube», es **«no existe un número que alguien deba
bajar a mano»**. Todo umbral almacenado obliga, el día que se borra código bien
cubierto, a que una persona lo baje por el mismo camino por el que pasa un
cambio normal. Medir solo las líneas del cambio no almacena ninguno.

El comparador se escribe acá en vez de adoptar una herramienta externa, por una
razón que pesa más que las otras: la herramienta candidata **falla en verde**. Si
las rutas de su entrada no coinciden con las del diff, no encuentra líneas que
medir, reporta cobertura total y sale con éxito — o sea que cablearla mal deja el
gate abierto, que es exactamente lo que la constitución prohíbe. Se usa igual,
pero como oráculo de contraste en el spike, fuera del pipeline.

La ausencia de datos habiendo líneas agregadas es **roja y ruidosa**, nunca un
éxito silencioso.

### D6 — El orden reemplaza al modo aviso, otra vez

El consumidor da rojo el día del estreno. La constitución define eso como
endurecer un check y prescribe estrenar en modo aviso. Acá se resuelve igual que
en `marco-se-cumple-solo`: **el consumidor se pone al día primero, el check
aterriza después**. Hecho en ese orden, ningún repositorio que no modifique una
línea queda roto —la letra de la regla— y no hay línea mayor que abrir. Es
precedente aplicado, no una excepción nueva.

El modo aviso queda para cuando haya consumidores que no controlamos.

## Cómo se hace cumplir solo

| Requirement | Check | Falla cuando |
|---|---|---|
| Ningún archivo fuera del alcance | derivación en el job del consumidor | un archivo versionado no lo mira ninguna herramienta y nadie declaró la exclusión |
| Exclusión que dejó de aplicar | ídem | una exclusión no corresponde a ningún archivo versionado |
| El repo declara pero no ejecuta | job de marco (estático) | el pipeline no invoca la derivación en ningún flujo |
| Scripts sin enmascaramiento | job de marco (estático) | un script de verificación convierte un fallo en éxito |
| Formato verificado | job del consumidor | el formato diverge del acordado |
| Cobertura del cambio | job del consumidor | hay líneas agregadas sin datos de cobertura que les correspondan |

## Riesgos y límites declarados

- **El censo dice «alguien lo mira», no «lo mira con las reglas del contrato».**
  Un archivo puede estar dentro del alcance y aun así quedar fuera de las reglas
  que dependen de tipos. Es otra propiedad y otro check.
- **Un programa de tipos que nadie ejecuta da cobertura falsa.** Crear una
  configuración que ningún script corre satisface la propiedad entera. Se mitiga
  con un aviso, y un aviso no es enforcement: es documentación, y así hay que
  leerlo.
- **Cableado vivo pero job muerto.** Deshabilitar el paso deja el check estático
  en verde mientras la derivación no ocurre. Los dos jobs corren en paralelo y
  preguntarle a la API por el otro sería una carrera.
- **La exclusión con motivo de trámite pasa.** Se exige que el motivo exista, no
  que sea sincero. Juzgar una justificación no es automatizable sin falsos
  positivos.
- **Ignorar un archivo del control de versiones lo saca del universo.** Es la
  evasión más limpia que existe; la única defensa es que ignorar código propio es
  una línea de diff que no se justifica sola.
- **La lista de extensiones de fuente se mantiene a mano.** Es la regla de
  «propiedades, no listas» mordiéndose la cola. Vive en el marco, así que se
  arregla una vez para todos, pero un proyecto con otro lenguaje de plantillas
  tiene archivos invisibles para el censo mismo.
- **El marco no se dogfoodea acá.** No tiene manifiestos propios, así que el
  censo no verifica nada en este repositorio — igual que el check de marcadores.
  La diferencia es que este trae código no trivial: por eso el banco de pruebas
  con casos sintéticos y la validación contra el consumidor real son
  obligatorios, no buenas prácticas.
- **La cobertura del diff no prueba el orden.** Cierra «cambio sin prueba», no
  «prueba escrita después del arreglo». Y un cambio que BORRA pruebas dejando el
  código pasa el gate: eso solo lo cerraría un umbral global, que es justamente
  lo que se descartó.
