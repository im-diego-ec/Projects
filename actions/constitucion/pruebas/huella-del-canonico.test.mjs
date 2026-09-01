import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const CANONICO = path.resolve(AQUI, "../canonico");
const MANIFIESTO = path.join(CANONICO, "manifiesto.json");

// ---------------------------------------------------------------------------
// EL TEXTO Y SU NUMERO DE VERSION TIENEN QUE SER LA MISMA COSA.
//
// EL DEFECTO QUE ESTE BANCO CIERRA, y era un bloqueo del dia uno que nadie veia:
// un cambio renombro `60-infra-aws-secretos.md` a `60-infra-plataforma-secretos.md`
// y le cambio el texto, y la version declarada en el manifiesto se quedo donde
// estaba. O sea que DOS textos distintos se llamaban «1.6.0».
//
// LO QUE ESO PROVOCA, medido de punta a punta ANTES DE LA 1.8.0, cuando el
// andamio pinaba `actions/constitucion@v1.7.0`. Un proyecto recien generado renderiza su
// constitucion con la accion DEL ARBOL, y despues su CI la verifica con la
// accion DEL TAG. Extraida la accion del tag con `git archive v1.7.0` y corrida
// contra un proyecto recien generado: EXIT=1 y dos `::error::` diciendo que
// `.projects/AGENTS-marco.md` y `.cursor/rules/00-marco.mdc` «difieren del texto
// que el marco publica para la version 1.6.0» — sobre archivos que la propia
// herramienta acababa de escribir.
//
// Y como `ci-ok` exige `needs.constitucion.result == success`, y `desplegar.yml`
// solo publica con el CI en verde, el despliegue no dispara NUNCA. Un rojo el dia
// uno que ademas se lleva el cuarto tramo entero, sin que nada lo anuncie.
//
// LA REGLA, DECIDIBLE Y SIN RED: la version que el manifiesto declara ultima
// lleva la huella del texto que publica. Si el texto cambia y la huella no, esto
// se pone rojo — que es exactamente el momento en que hay que decidir si eso es
// una version nueva.
// ---------------------------------------------------------------------------

/** La huella del texto canonico: los .md en orden, con su nombre adentro.
 *
 *  El NOMBRE entra en la huella a proposito: renombrar un archivo sin tocar su
 *  contenido tambien cambia lo que el marco publica —fue exactamente lo que
 *  paso— y una huella que solo mirara el contenido no lo habria visto. */
export function huellaDelCanonico(dir = CANONICO) {
  const md = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .sort();
  const h = createHash("sha256");
  for (const f of md) {
    h.update(f);
    h.update("\0");
    h.update(fs.readFileSync(path.join(dir, f)));
  }
  return { huella: h.digest("hex"), archivos: md };
}

const manifiesto = () => JSON.parse(fs.readFileSync(MANIFIESTO, "utf-8"));

test("hay canonico y hay versiones: un cero aca es este banco roto", () => {
  const { archivos } = huellaDelCanonico();
  assert.ok(archivos.length >= 5, `${archivos.length} archivos en canonico/: si cayo de golpe, mira si se movieron`);
  assert.ok(manifiesto().versiones.length >= 1, "el manifiesto no declara ninguna version");
});

test("la version que el manifiesto declara ultima lleva la huella del texto que publica", () => {
  const versiones = manifiesto().versiones;
  const actual = versiones[versiones.length - 1];
  const { huella, archivos } = huellaDelCanonico();

  assert.ok(
    actual.huella_canonico,
    `la version ${actual.version} no declara \`huella_canonico\`. Sin ella, el texto y su numero pueden separarse en ` +
      `silencio: es lo que ya paso una vez y costo un CI rojo el dia uno en cada proyecto nuevo. La huella de hoy es ` +
      `${huella}`,
  );
  assert.equal(
    actual.huella_canonico,
    huella,
    `el texto canonico cambio y la version ${actual.version} sigue declarando la huella vieja. Los ${archivos.length} ` +
      `archivos de canonico/ ya no son los que esa version publico.\n\n` +
      `NO se arregla pegando la huella nueva sobre la vieja: eso haria que dos textos distintos se llamen igual, que ` +
      `es el defecto original. Se arregla AGREGANDO una version nueva a \`versiones\` con la huella de hoy —` +
      `${huella}— y moviendo, en el release, el pin de plantilla/.github/workflows/ci.yml.\n\n` +
      `Por que importa: un proyecto renderiza su constitucion con la accion del ARBOL y su CI la verifica con la del ` +
      `TAG que el andamio pina. Si los dos textos difieren bajo el mismo numero, el proyecto nace con el job ` +
      `\`constitucion\` en rojo — y como \`ci-ok\` lo exige por \`needs\` y el despliegue solo corre con el CI en ` +
      `verde, tampoco publica nunca.`,
  );
});

test("las versiones van en orden y ninguna se repite", () => {
  const versiones = manifiesto().versiones.map((v) => v.version);
  assert.deepEqual([...new Set(versiones)], versiones, `hay versiones repetidas: ${versiones.join(", ")}`);
  const cmp = (a, b) => {
    const pa = a.split(".").map(Number);
    const pb = b.split(".").map(Number);
    for (let i = 0; i < 3; i++) if (pa[i] !== pb[i]) return pa[i] - pb[i];
    return 0;
  };
  assert.deepEqual([...versiones].sort(cmp), versiones, `las versiones no estan en orden: ${versiones.join(", ")}`);
});

test("MUERDE: un cambio en el canonico sin declarar version se caza", () => {
  // El caso que prueba que el de arriba no pasa por vacuidad. Se copia el
  // canonico a un temporal, se le cambia una letra a un archivo, y se exige que
  // la huella cambie. Sin tocar el arbol.
  const tmp = fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), "canonico-"));
  for (const f of fs.readdirSync(CANONICO)) fs.copyFileSync(path.join(CANONICO, f), path.join(tmp, f));

  const antes = huellaDelCanonico(tmp).huella;
  assert.equal(antes, huellaDelCanonico().huella, "la copia tiene que dar la misma huella que el original");

  const uno = fs.readdirSync(tmp).filter((f) => f.endsWith(".md"))[0];
  fs.appendFileSync(path.join(tmp, uno), "\nuna linea de mas\n");
  assert.notEqual(huellaDelCanonico(tmp).huella, antes, "cambiar el contenido tiene que cambiar la huella");

  // Y la otra mitad, que es la que el defecto real ejercito: RENOMBRAR sin tocar
  // el contenido. Una huella que solo mirara los bytes no lo habria visto.
  fs.copyFileSync(path.join(CANONICO, uno), path.join(tmp, uno));
  assert.equal(huellaDelCanonico(tmp).huella, antes, "restaurado, tiene que volver a la huella original");
  fs.renameSync(path.join(tmp, uno), path.join(tmp, uno.replace(/^(\d\d)-/, "$1-renombrado-")));
  assert.notEqual(huellaDelCanonico(tmp).huella, antes, "renombrar tambien tiene que cambiar la huella: fue el defecto real");

  fs.rmSync(tmp, { recursive: true, force: true });
});
