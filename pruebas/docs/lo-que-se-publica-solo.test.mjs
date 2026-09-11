import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const WORKFLOW = path.join(RAIZ, "plantilla/.github/workflows/desplegar.yml");

// ---------------------------------------------------------------------------
// QUIEN APRIETA EL BOTON, SEGUN EL WORKFLOW, Y SEGUN LAS PAGINAS.
//
// EL DEFECTO QUE ESTO CIERRA, y lo cometio quien escribe esta prueba: el commit
// que hizo que produccion dejara de publicarse sola dejo CINCO paginas diciendo
// lo contrario --"se publica solo", "no hay que apretar nada", "no hay una copia
// de prueba desplegada"--. Se encontraron a mano, con un grep, DESPUES de
// publicar el cambio. O sea: la unica defensa era acordarse, y la doctrina de
// este repositorio dice que una regla que depende de que alguien se acuerde no
// cuenta.
//
// QUE ATA ESTA COMPUERTA. El mecanismo y la promesa, en los dos sentidos. Del
// workflow se DERIVA si produccion se publica sola --no se asume-- y contra eso
// se contrastan las paginas que le cuentan a una persona que va a pasar. Si
// manana la promocion vuelve a ser automatica, esto se pone rojo hasta que las
// paginas lo digan: cambiar el mecanismo sin cambiar la promesa deja de ser
// posible en silencio.
//
// LO QUE ESTE BANCO NO PUEDE AFIRMAR, dicho antes de que nadie lea de mas: no
// entiende castellano. Busca la CONVIVENCIA, en una misma oracion, de una
// palabra de produccion y una de automatismo — es una heuristica, y una frase
// suficientemente creativa se le escapa. Lo que si garantiza es que las cuatro
// paginas nombren el acto humano, que es la mitad que de verdad se olvida.
// ---------------------------------------------------------------------------

/** Las paginas donde vive la promesa. No es "toda la documentacion": son las
 *  cuatro que le dicen a una persona QUE va a pasar cuando mergee. Tres viajan
 *  al proyecto y una es canonica del marco. */
const PAGINAS = [
  "docs/10-publicar.md",
  "docs/03-stack.md",
  "plantilla/README-del-proyecto.md",
  "plantilla/sitio/README.md",
];

/** ¿El job de produccion se dispara solo? Se DERIVA del archivo, mirando si su
 *  condicion acepta el evento automatico. Es la misma lectura que hace el banco
 *  del andamio, y a proposito: dos formas distintas de leer lo mismo terminan
 *  discrepando. */
function produccionSePublicaSola(texto) {
  const t = texto ?? fs.readFileSync(WORKFLOW, "utf8");
  const desde = t.indexOf("\n  produccion:\n");
  assert.notEqual(desde, -1, "el job `produccion` no esta en el workflow: esta compuerta mira al vacio");
  const resto = t.slice(desde + 1);
  const fin = resto.slice(1).search(/\n {2}[a-z_]+:\n/);
  const bloque = (fin === -1 ? resto : resto.slice(0, fin + 1)).split("steps:")[0];
  return /workflow_run/.test(bloque);
}

/** Las oraciones de un texto, con el ruido de Markdown sacado. */
function oraciones(texto) {
  return texto
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/\|/g, " ")
    .split(/(?<=[.:!?])\s+|\n\n+/)
    .map((o) => o.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

const PRODUCCION = /producci[oó]n|DOMINIO_PROD/i;
const SOLA = /\b(sola|solo|autom[aá]tic\w*)\b|no hay que apretar/i;
/** Lo que nombra el acto humano. Cualquiera alcanza: son las formas en que las
 *  cuatro paginas lo dicen hoy, cada una en su registro. */
const ACTO_HUMANO = /Run workflow|la public[aá]s vos|lo llev[aá]s vos|apretando un bot[oó]n|apret[aá]s/i;

test("hay paginas que revisar, y el workflow que las gobierna existe", () => {
  for (const f of PAGINAS) {
    assert.ok(fs.existsSync(path.join(RAIZ, f)), `falta ${f}: si se movio, hay que reapuntar esta compuerta`);
  }
  assert.ok(fs.existsSync(WORKFLOW), "falta el workflow de despliegue");
});

test("las cuatro paginas nombran el acto humano que el workflow exige", () => {
  if (produccionSePublicaSola()) return; // el otro caso lo cubre
  const mudas = PAGINAS.filter((f) => !ACTO_HUMANO.test(fs.readFileSync(path.join(RAIZ, f), "utf8")));
  assert.deepEqual(
    mudas,
    [],
    `produccion NO se publica sola --derivado de ${path.relative(RAIZ, WORKFLOW)}-- y estas paginas no lo dicen: ${mudas.join(", ")}. ` +
      "Una persona que las lea va a esperar que su sitio salga solo, y se va a quedar esperando sin ninguna senal de que falta apretar algo",
  );
});

test("ninguna pagina promete que produccion salga sola, si no sale sola", () => {
  if (produccionSePublicaSola()) return;
  const malas = [];
  for (const f of PAGINAS) {
    for (const o of oraciones(fs.readFileSync(path.join(RAIZ, f), "utf8"))) {
      // La oracion tiene que hablar de produccion Y de automatismo Y NO nombrar
      // el acto humano: "produccion no se publica sola" y "a produccion lo
      // llevas vos apretando" son correctas y traen las dos palabras.
      if (PRODUCCION.test(o) && SOLA.test(o) && !ACTO_HUMANO.test(o) && !/\bno\b|\bni\b|deten/i.test(o)) {
        malas.push(`${f}  «${o.slice(0, 110)}»`);
      }
    }
  }
  assert.deepEqual(malas, [], `estas oraciones prometen una publicacion automatica que el workflow ya no hace:\n${malas.join("\n")}`);
});

test("y si produccion volviera a publicarse sola, las paginas tendrian que decirlo", () => {
  // EL OTRO SENTIDO DE LA COMPUERTA, que es lo que la vuelve un vinculo y no una
  // regla de estilo. Hoy no se ejerce --produccion es manual-- asi que en vez de
  // quedar dormido, el caso se ejerce sobre una lectura MUTADA del workflow: se
  // comprueba que el derivador distinga los dos mundos. Sin esto, todo el archivo
  // podria estar leyendo mal el YAML y sus tres casos pasarian igual.
  const t = fs.readFileSync(WORKFLOW, "utf8");
  assert.equal(produccionSePublicaSola(), false, "produccion volvio a dispararse sola: actualiza las cuatro paginas de esta compuerta y despues este caso");

  const mutado = t.replace(
    "      github.event_name == 'workflow_dispatch' &&\n      github.event.inputs.promover_a_produccion == 'true'",
    "      github.event.workflow_run.conclusion == 'success'",
  );
  assert.notEqual(mutado, t, "la mutacion no cambio nada: el derivador podria estar leyendo otra cosa");

  // LA MUTACION VA EN MEMORIA Y NO EN DISCO, y esto no es un detalle de estilo:
  // `node --test` corre los archivos de prueba EN PARALELO, y el banco del
  // andamio lee este mismo workflow. Escribir el archivo mutado --aunque se
  // restaure en un `finally`-- abre una ventana en la que ese otro banco lee un
  // archivo que nadie escribio a proposito. Un rojo asi aparece una vez cada
  // tantas corridas, no se reproduce, y se termina culpando a la red.
  assert.equal(
    produccionSePublicaSola(mutado),
    true,
    "el derivador NO ve la diferencia entre una promocion automatica y una manual: los tres casos de arriba no miden nada",
  );
});

test("MUERDE: una promesa vieja colada en cualquiera de las cuatro se caza", () => {
  // Anti-vacuidad del caso de arriba: se inyecta la frase exacta que el commit
  // de la promocion dejo escrita --y que nadie vio hasta el grep-- y se comprueba
  // que el reconocedor la ve.
  const vieja = "Cada vez que las verificaciones terminan en verde sobre main, el sitio sale a produccion solo.";
  const vistas = oraciones(vieja).filter((o) => PRODUCCION.test(o) && SOLA.test(o) && !ACTO_HUMANO.test(o) && !/\bno\b|\bni\b|deten/i.test(o));
  assert.equal(vistas.length, 1, "el reconocedor no ve la promesa que de verdad se escribio: entonces el caso de arriba pasa por no mirar");

  // Y el control: la frase CORRECTA no se marca. Un reconocedor que muerde las
  // dos formas obliga a no hablar de produccion, que es peor que el defecto.
  const buena = "Producción no se publica sola: la publicás vos, apretando un botón.";
  const falsos = oraciones(buena).filter((o) => PRODUCCION.test(o) && SOLA.test(o) && !ACTO_HUMANO.test(o) && !/\bno\b|\bni\b|deten/i.test(o));
  assert.deepEqual(falsos, [], "el reconocedor muerde la frase correcta: obligaria a las paginas a no explicar el mecanismo");
});
