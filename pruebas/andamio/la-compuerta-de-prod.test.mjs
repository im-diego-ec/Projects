import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const correrAsync = promisify(execFile);
const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const WORKFLOW = path.join(RAIZ, "plantilla/.github/workflows/desplegar.yml");
const SHA = "0123456789abcdef0123456789abcdef01234567";

// ---------------------------------------------------------------------------
// LA COMPUERTA DE PRODUCCION, CORRIDA Y NO LEIDA.
//
// QUE VIGILA. Que una version llegue a produccion solo si paso por DEV y salio
// en verde. La version anterior del workflow no lo comprobaba: `produccion`
// venia detras de `dev` con un `needs:` y eso alcanzaba mientras los dos pasaban
// en la misma corrida. Pero el job de DEV hace DOS cosas --sube la version, y
// despues comprueba que su direccion conteste-- y la primera puede salir bien
// con la segunda mal: el sitio sube y sirve un 404. Esa version queda igual
// cargada en Cloudflare, promovible, y nada la distinguia de una buena.
//
// POR QUE SE CORRE EL SCRIPT EN VEZ DE LEER EL YAML. Porque lo que hay que
// probar es el comportamiento. Un `assert.match` sobre el texto del workflow
// dice que las lineas estan; no dice que hagan lo que prometen, y menos aun que
// FALLEN cuando tienen que fallar. El `gh` que usa el paso se reemplaza por uno
// de mentira que contesta lo que cada caso necesita.
//
// EL CASO QUE MAS IMPORTA es el cuarto: `gh` que no contesta. Un paso que trata
// "no pude preguntar" como "esta bien" es un fail-open, y es la forma de rotura
// que este repositorio persigue con mas insistencia --la ausencia de datos NO se
// lee como exito--. Ahi es donde un verde miente sin que nadie lo note.
//
// LO QUE ESTE BANCO NO PUEDE AFIRMAR, dicho antes de que nadie lea de mas: no
// prueba que GitHub conteste lo que el `gh` de mentira contesta. Las formas de
// esas dos respuestas estan tomadas de la API de GitHub --una lista de ids, y la
// conclusion de un job-- y `--jq` las reduce a eso antes de que el script las
// vea. Lo que si prueba es que el script haga lo correcto con cada forma.
// ---------------------------------------------------------------------------

/** El `run:` del paso que comprueba el paso por DEV, sacado del workflow. */
function scriptDeLaCompuerta() {
  const t = fs.readFileSync(WORKFLOW, "utf8");
  const desde = t.indexOf("- name: Comprobar que esta version paso por DEV, y en verde");
  assert.notEqual(desde, -1, "el paso que comprueba el paso por DEV no esta en el workflow: se promoveria cualquier cosa");
  const bloque = t.slice(desde);
  const run = bloque.slice(bloque.indexOf("run: |") + "run: |".length);
  const lineas = [];
  for (const l of run.split("\n").slice(1)) {
    if (l.trim() && !l.startsWith("          ")) break;
    lineas.push(l.slice(10));
  }
  const s = lineas.join("\n");
  assert.ok(s.includes("gh api"), "el script extraido no le pregunta nada a GitHub: el corte del bloque quedo mal");
  return s;
}

/** Corre el script con un `gh` de mentira delante del PATH.
 *
 *  `corridas` es lo que devuelve la consulta de corridas (una lista de ids, una
 *  por linea; vacio = ninguna). `dev` es la conclusion del job `dev`. Cualquiera
 *  de los dos puede ser el objeto `{ falla: "mensaje" }`, que hace que ese `gh`
 *  salga distinto de cero — que es como se ve no tener red ni permiso. */
async function correr({ script, corridas = "", dev = "success", entorno = {} }) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "compuerta-prod-"));
  fs.writeFileSync(path.join(dir, "paso.sh"), script);
  const bin = path.join(dir, "bin");
  fs.mkdirSync(bin);

  // UNA LINEA POR VALOR, con un `echo` cada una. La version anterior pasaba la
  // lista entera por un solo `printf '%s'`, y el `\n` de la cadena JS llegaba al
  // shell como dos caracteres literales: el script recibia UN id llamado
  // `101\\n102` en vez de dos. El caso de las dos corridas pasaba igual --habia
  // un solo "id" y contestaba success-- o sea que certificaba un recorrido que no
  // existia. Es exactamente el defecto que los casos de este archivo persiguen,
  // cometido por el banco mismo.
  const rama = (v) =>
    typeof v === "object" && v?.falla
      ? `  echo ${JSON.stringify(v.falla)} >&2\n  exit 1`
      : String(v)
          .split("\n")
          .filter((l) => l !== "")
          .map((l) => `  echo ${JSON.stringify(l)}`)
          .concat("  exit 0")
          .join("\n");

  fs.writeFileSync(
    path.join(bin, "gh"),
    `#!/bin/sh
# gh de mentira: contesta segun QUE se le pregunte.
case "$*" in
  *"/runs?head_sha="*)
${rama(corridas)}
    ;;
  *"/runs/101/jobs"*)
${rama(typeof dev === "object" && !dev?.falla ? dev["101"] : dev)}
    ;;
  *"/jobs"*)
${rama(typeof dev === "object" && !dev?.falla ? dev["102"] : dev)}
    ;;
esac
exit 0
`,
    { mode: 0o755 },
  );

  const salidaGh = path.join(dir, "salida.txt");
  fs.writeFileSync(salidaGh, "");
  try {
    const { stdout, stderr } = await correrAsync("bash", [path.join(dir, "paso.sh")], {
      encoding: "utf8",
      env: {
        PATH: `${bin}${path.delimiter}${process.env.PATH}`,
        GH_TOKEN: "de-mentira",
        GITHUB_REPOSITORY: "una/cosa",
        GITHUB_SHA: SHA,
        GITHUB_ACTOR: "quien-sea",
        GITHUB_OUTPUT: salidaGh,
        VERSION: "",
        SIN_DEV: "false",
        ...entorno,
      },
    });
    return { codigo: 0, salida: `${stdout}${stderr}`, outputs: fs.readFileSync(salidaGh, "utf8") };
  } catch (e) {
    return {
      codigo: e.code ?? -1,
      salida: `${e.stdout ?? ""}${e.stderr ?? ""}`,
      outputs: fs.readFileSync(salidaGh, "utf8"),
    };
  }
}

test(
  "una version que paso por DEV en verde se promueve",
  async () => {
    const script = scriptDeLaCompuerta();
    const r = await correr({ script, corridas: "101", dev: "success" });
    assert.equal(r.codigo, 0, `tendria que dejar promover y salio ${r.codigo}:\n${r.salida}`);
    assert.match(r.outputs, new RegExp(`sha=${SHA}`), "el paso no publica que version eligio: el resto del job no sabria cual promover");
  },
);

test(
  "una version cuyo DEV termino en ROJO no se promueve",
  async () => {
    const script = scriptDeLaCompuerta();
    const r = await correr({ script, corridas: "101", dev: "failure" });
    assert.notEqual(r.codigo, 0, "se promovio una version que no paso la prueba");
    assert.match(r.salida, /::error::/, "no deja rojo visible");
    assert.ok(r.salida.includes(SHA), "el error no nombra la version rechazada, que es lo que pide el requirement");
    assert.match(r.salida, /sin_pasar_por_dev/, "no dice cual es la salida si de verdad hace falta publicar");
  },
);

test(
  "una version que NUNCA se subio a DEV no se promueve, y se dice eso y no otra cosa",
  async () => {
    const script = scriptDeLaCompuerta();
    const r = await correr({ script, corridas: "" });
    assert.notEqual(r.codigo, 0, "se promovio una version que no existe en DEV");
    assert.match(r.salida, /nunca se subió a DEV/, "confunde 'no existe' con 'salio mal': mandan a mirar a lugares distintos");
    assert.ok(r.salida.includes(SHA), "el error no nombra la version");
  },
);

test(
  "MUERDE: si no se puede preguntar, NO se promueve — la ausencia de datos no es un exito",
  async () => {
    const script = scriptDeLaCompuerta();
    const r = await correr({ script, corridas: { falla: "gh: could not read from remote" } });
    assert.notEqual(r.codigo, 0, "FAIL-OPEN: no se pudo consultar nada y la promocion siguio igual");
    assert.match(r.salida, /no se pudo preguntar/i, "no distingue 'no se sabe' de 'esta mal'");
    assert.match(r.salida, /no se lee como éxito/i, "el mensaje no dice por que frena, que es la doctrina que sostiene esta rama");
  },
);

test(
  "MUERDE: si las corridas se leen pero sus jobs no, tampoco se promueve",
  async () => {
    const script = scriptDeLaCompuerta();
    const r = await correr({ script, corridas: "101\n102", dev: { falla: "HTTP 403" } });
    assert.notEqual(r.codigo, 0, "FAIL-OPEN: ninguna corrida se pudo leer y se promovio igual");
    assert.match(r.salida, /no se pudo leer ninguna/, "dice que DEV salio mal cuando lo que pasa es que no se pudo mirar");
  },
);

test(
  "un segundo intento en verde alcanza: un rojo viejo no condena al commit",
  async () => {
    const script = scriptDeLaCompuerta();
    // Un mismo commit puede tener dos corridas --la primera roja por una red
    // caida, la segunda verde--. Si el paso mirara solo la primera, un commit
    // perfectamente bueno quedaria sin poder publicarse NUNCA, y el sintoma seria
    // "este commit no se puede promover" sin ninguna causa a la vista.
    //
    // Las dos corridas contestan DISTINTO a proposito: con las dos en verde este
    // caso pasaria aunque el paso mirara solo la primera, o sea que no mediria el
    // recorrido que dice medir.
    const script2 = script;
    const r = await correr({ script: script2, corridas: "101\n102", dev: { 101: "failure", 102: "success" } });
    assert.equal(r.codigo, 0, `con una corrida en verde tendria que dejar promover:\n${r.salida}`);
    assert.match(r.salida, /corrida 101: dev = failure/, "no llego a mirar la primera: el recorrido no es tal");
    assert.match(r.salida, /corrida 102: dev = success/, "no llego a la segunda, que es la que habilita");
  },
);

test(
  "el apartamiento existe, tiene nombre, y deja escrito quien lo pidio",
  async () => {
    const script = scriptDeLaCompuerta();
    // La doctrina del repositorio: apartarse se puede; apartarse en silencio no.
    const r = await correr({ script, corridas: "", entorno: { SIN_DEV: "true", GITHUB_ACTOR: "diego" } });
    assert.equal(r.codigo, 0, "el apartamiento no deja pasar: entonces no es un apartamiento");
    assert.match(r.salida, /::warning::/, "se aparto en silencio: tiene que quedar en amarillo en la corrida");
    assert.match(r.salida, /@diego/, "no queda escrito QUIEN se aparto, que es la mitad del rastro");
  },
);

test(
  "se promueve la version ELEGIDA, no la punta de la rama",
  async () => {
    const script = scriptDeLaCompuerta();
    const otra = "fedcba9876543210fedcba9876543210fedcba98";
    const r = await correr({ script, corridas: "101", dev: "success", entorno: { VERSION: otra } });
    assert.equal(r.codigo, 0);
    assert.match(r.outputs, new RegExp(`sha=${otra}`), "eligio otra version que la que se le pidio");
    assert.ok(!r.outputs.includes(SHA), "eligio la punta de la rama teniendo una version pedida");
  },
);

test(
  "MUERDE: con la comprobacion sacada, el banco lo ve",
  async () => {
    const script = scriptDeLaCompuerta();
    // Anti-vacuidad de todo lo de arriba. Si alguien le saca los `exit 1` al
    // script, los casos que exigen rojo tienen que empezar a fallar. Se comprueba
    // aca mismo, sobre una copia mutada, para que la propiedad no dependa de que
    // alguien recuerde correr el banco despues de tocar el workflow.
    const mutado = scriptDeLaCompuerta().replaceAll("exit 1", "exit 0");
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "compuerta-mutada-"));
    const bin = path.join(dir, "bin");
    fs.mkdirSync(bin);
    fs.writeFileSync(path.join(bin, "gh"), "#!/bin/sh\nexit 0\n", { mode: 0o755 });
    fs.writeFileSync(path.join(dir, "paso.sh"), mutado);
    let codigo = 0;
    try {
      await correrAsync("bash", [path.join(dir, "paso.sh")], {
        encoding: "utf8",
        env: {
          PATH: `${bin}${path.delimiter}${process.env.PATH}`,
          GH_TOKEN: "x",
          GITHUB_REPOSITORY: "una/cosa",
          GITHUB_SHA: SHA,
          GITHUB_ACTOR: "quien-sea",
          GITHUB_OUTPUT: path.join(dir, "salida.txt"),
          VERSION: "",
          SIN_DEV: "false",
        },
      });
    } catch (e) {
      codigo = e.code ?? -1;
    }
    assert.equal(codigo, 0, "la mutacion no llego a cambiar nada: entonces los casos de arriba no miden que el script FRENE");
  },
);
