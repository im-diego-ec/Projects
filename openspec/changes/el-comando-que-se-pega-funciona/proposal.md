---
artefacto: proposal
dri: Builder 1
aprueba: Builder 2 (builder par)  # change técnico de `calidad-codigo`; el gate del
                              # PO en este repo está acotado a la capability de
                              # gobernanza. NO puede ser el propio `dri`
informado: PO / Builder 2
estado: pendiente-de-revision
---

# El comando que la herramienta manda a pegar tiene que poder pegarse

## Por qué

`herramientas/projects-init.mjs` existe para que alguien que no programa no
tenga que transcribir nada. Cuando no puede terminar el trabajo sola, imprime el
comando exacto que hay que pegar en una terminal. **Ese comando se arma
interpolando rutas sin comillas**, así que en cuanto una ruta tiene un espacio,
el comando que la herramienta entrega **no corre**.

No es hipotético y no hace falta buscarlo: el propio repositorio del marco vive
hoy en `.../Personal/No Coders/Projects`, y el comando sale así:

```
node /Users/…/Personal/No Coders/Projects/herramientas/projects-init.mjs --valores …
```

La shell lee eso como `node /Users/…/Personal/No`, y falla con un mensaje que no
menciona espacios ni comillas por ningún lado. Para quien no programa, la
herramienta simplemente dejó de funcionar sin decir por qué.

**Y es el público exacto de este marco.** Las carpetas donde una persona no
técnica guarda sus cosas se llaman «Mis Documentos», «My Documents», «Google
Drive», «No Coders». El espacio no es el caso raro acá: es el caso normal.

**Por qué el CI no lo vio nunca.** GitHub hace checkout en
`/home/runner/work/Projects/Projects`, que no tiene espacios. El banco **sí** lo
caza —`pruebas/init/el-doble-clic-llega.test.mjs` extrae el comando impreso y lo
**corre**— pero sólo se pone rojo cuando el clon está en una ruta con espacio, o
sea en la máquina de un usuario y no en CI. Hoy ese banco está en rojo localmente
y verde en CI, que es la peor combinación posible: la evidencia existe y nadie la
ve.

## Qué cambia

1. **Las rutas que viajan dentro de un comando impreso se entrecomillan** cuando
   lo necesitan. Cinco sitios en `herramientas/projects-init.mjs`.
2. **`pruebas/init/el-doble-clic-llega.test.mjs`** extrae el comando aceptando
   argumentos entrecomillados, que es lo que ahora imprime la herramienta.
3. **`actions/guardrail-deltas/pruebas/guardrail-deltas.test.mjs`** deja de armar
   rutas con `new URL(...).pathname` y usa `fileURLToPath`. `.pathname` devuelve
   la ruta **percent-encoded**, así que con un espacio en el clon le pasaba al
   guardrail un `.../No%20Coders/...` que no existe — y el guardrail, al no
   encontrar nada, salía **en verde** diciendo «no hay ningún delta que
   comparar». El banco lo cazaba de casualidad, por el caso que exige comparar
   más de cero.

## Lo que este change NO arregla, y hay que decirlo

**El guardrail sale verde cuando le dan un directorio que no existe.** Eso es un
fail-open y `AGENTS.md` lo prohíbe explícitamente. Acá sólo se corrige el banco
que le pasaba la ruta mal; **el fail-open del guardrail queda vivo**.

**Destino:** change propio, porque toca el contrato de una action publicada que
los consumidores ya ejecutan —hacer que se ponga roja ante un directorio ausente
puede enrojecer a un consumidor que hoy pasa—, y eso se estrena en modo aviso y
se endurece en la mayor siguiente. Meterlo acá lo convertiría en un breaking
escondido dentro de una corrección de comillas.

## Impacto en los proyectos consumidores

**Ninguno.** Los cinco sitios están en la herramienta que corre en la máquina de
quien arranca; los otros dos archivos son bancos del marco. No se toca ningún
workflow reusable, `input`, `secret`, `output`, permiso ni nombre de job. Es
PATCH.
