// TODA REFERENCIA REMOTA A UNA PIEZA PROPIA VIVE EN UN JOB QUE NO CORRE EN EL MARCO.
//
// POR QUE EXISTE. Los workflows de `.github/workflows` corren en DOS lugares: en el
// repo del marco (ci.yml llama a marco-ci.yml por ruta local) y en cada consumidor
// (que llama a marco-ci.yml por `@vX.Y.Z`). Adentro, marco-ci.yml invoca actions
// hermanas por referencia REMOTA —`<cuenta>/Projects/actions/<x>@vX.Y.Z`—, porque una
// ruta local dentro de un reusable se resuelve contra el arbol de QUIEN LLAMA. Y
// GitHub resuelve y descarga las actions de un job en «Set up job», ANTES de evaluar
// el `if` de cualquier paso. Consecuencia, en las dos direcciones:
//
//   · Si ese job corre en el repo del marco, durante el PR que corta una version la
//     referencia apunta a un tag que todavia no existe (se crea despues del merge): el
//     job muere en «Set up job», el veredicto agregado queda rojo y el release no se
//     puede mergear. Medido el 2026-08-22 con "Unable to resolve action ...@v1.4.2".
//   · Para no morir asi, esa linea tenia que ir por el tag mayor movil `@v1`, y el pin
//     exacto del consumidor era una MEDIA VERDAD: recibia el workflow de su version y
//     la action de donde apuntara el tag.
//
// Lo que rompe el nudo es saltear el JOB entero en el repo del marco —no un paso: el
// `if` de un paso llega tarde— con la sonda `needs.cambios.outputs.es_distribuidor`,
// y correr la misma pieza por ruta local en el ci.yml del marco. Con eso el pin
// exacto deja de ser circular. Es lo que hacen hoy `deltas` y `constitucion_cableada`,
// y es la propiedad que hace posible el change `guardrail-deltas-por-version-exacta`.
//
// HASTA ESTE BANCO NADIE LO COBRABA. `pruebas/marco-ci/distribuidor.test.mjs` cuenta
// usos de la sonda (un piso de tres), y el caso (7) de
// `actions/constitucion/pruebas/refutaciones-ronda-3.test.mjs` verifica que la ref
// EXISTA si el job corre —y sin tags en el clon, solo avisa—. Ninguno se pone rojo si
// aparece un TERCER job con un `uses:` remoto propio y sin particion: el caso de
// crecimiento. Portado de Rigel (2.4.0, commit 64fc6f8), con una diferencia de fondo:
// alla la particion se busca como TEXTO dentro del `if:`; aca la condicion se
// EVALUA con el mismo evaluador que los bancos del despliegue, asi que un
// `always() || <particion>` —que contiene el texto y no particiona nada— es rojo.

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { evaluar, FUNCIONES, jobsConCondiciones, veraz } from "./expresiones.mjs";
import { RAIZ } from "./workflows.mjs";

const DIR_WORKFLOWS = path.join(RAIZ, ".github", "workflows");

/** Un `uses:` REMOTO a una pieza de este repo: `<cuenta>/Projects/<ruta>@<ref>`.
 *  La cuenta no se fija a proposito: en una copia del arbol a otra cuenta, las lineas
 *  siguen nombrando `<alguna cuenta>/Projects`, y siguen siendo propias. Anclado al
 *  principio de la linea: un `echo "uses: ..."` dentro de un `run:` —marco-ci.yml
 *  imprime uno como consejo de cableado— no resuelve nada. */
const REMOTA_PROPIA = /^\s*(?:-\s+)?uses:\s*["']?[A-Za-z0-9_.-]+\/Projects\/([^@\s"']+)@([^\s"'#]+)/i;

/** Un `uses:` LOCAL: `./<ruta>`. Es la otra mitad de la particion. */
const LOCAL = /^\s*(?:-\s+)?uses:\s*["']?\.\/([^\s"'#@]+)/;

/** El mundo en el que se evalua el `if:` de un job: la sonda con el valor pedido y
 *  las funciones de estado de una corrida normal (nadie cancelo, lo anterior paso).
 *  Cualquier OTRO contexto que la condicion nombre (`github`, `inputs`, `vars`) no
 *  esta y hace LANZAR al evaluador: una condicion que depende de algo que este banco
 *  no modela no puede leerse como particionada. */
function mundo(esDistribuidor) {
  return {
    needs: { cambios: { result: "success", outputs: { es_distribuidor: esDistribuidor } } },
    [FUNCIONES]: { cancelled: () => false, always: () => true, success: () => true, failure: () => false },
  };
}

/** Toda referencia remota propia de los workflows de un directorio, con su job. */
function remotasPorJob(dir = DIR_WORKFLOWS) {
  const salida = [];
  for (const archivo of fs.readdirSync(dir).filter((f) => /\.ya?ml$/.test(f)).sort()) {
    const texto = fs.readFileSync(path.join(dir, archivo), "utf8");
    if (!/^jobs:\s*$/m.test(texto)) continue;
    for (const job of jobsConCondiciones(texto)) {
      for (const linea of job.cuerpo.split("\n")) {
        if (/^\s*#/.test(linea)) continue;
        const m = REMOTA_PROPIA.exec(linea);
        if (!m) continue;
        salida.push({
          archivo,
          job: job.nombre,
          si: job.si,
          // `uses:` a nivel de JOB (cuatro espacios, sin guion): llama a un workflow
          // reusable, no a una action.
          deJob: /^ {4}uses:/.test(linea),
          pieza: m[1].replace(/\/+$/, ""),
          ref: m[2],
          texto: linea.trim(),
        });
      }
    }
  }
  return salida;
}

/** Si la referencia vive bien particionada, y si no, por que. */
function particion(r) {
  if (r.deJob) {
    return {
      ok: false,
      motivo:
        "es la llamada a un workflow REUSABLE propio por referencia remota. Esa forma no se particiona " +
        "con un `if:`: GitHub carga los reusables al armar la corrida, y este banco no mide que un `if:` " +
        "de job alcance. Se elige el lado cerrado: el marco llama a sus reusables por ruta local, como " +
        "ci.yml llama a ./.github/workflows/marco-ci.yml",
    };
  }
  if (r.si === null) {
    return {
      ok: false,
      motivo:
        "el job no tiene `if:` de JOB, asi que corre en el repo del marco. Un `if:` de PASO no alcanza: " +
        "«Set up job» ya resolvio la referencia antes de mirarlo",
    };
  }
  let enElMarco;
  let enUnConsumidor;
  try {
    enElMarco = veraz(evaluar(r.si, mundo("true")));
    enUnConsumidor = veraz(evaluar(r.si, mundo("false")));
  } catch (e) {
    return {
      ok: false,
      motivo:
        `el \`if:\` del job no se pudo evaluar (${e.message}). Una condicion que este banco no entiende ` +
        "no se lee como particionada: o se simplifica, o se modela lo que nombra en `mundo()` con su caso",
    };
  }
  if (enElMarco) {
    return {
      ok: false,
      motivo:
        "el `if:` del job NO lo saltea cuando la sonda dice que este es el repo del marco: evaluado con " +
        "es_distribuidor='true', el job corre. Tener el texto de la sonda en la condicion no es particionar",
    };
  }
  if (!enUnConsumidor) {
    return {
      ok: false,
      motivo:
        "el `if:` del job lo apaga TAMBIEN en un consumidor (evaluado con es_distribuidor='false', no corre): " +
        "la pieza dejo de correr en todas partes, que no es una particion sino una compuerta apagada",
    };
  }
  return { ok: true, motivo: "" };
}

/** Las rutas que algun workflow del directorio invoca por `./<ruta>`. */
function localesDe(dir = DIR_WORKFLOWS) {
  const salida = new Set();
  for (const archivo of fs.readdirSync(dir).filter((f) => /\.ya?ml$/.test(f))) {
    for (const linea of fs.readFileSync(path.join(dir, archivo), "utf8").split(/\r?\n/)) {
      if (/^\s*#/.test(linea)) continue;
      const m = LOCAL.exec(linea);
      if (m) salida.add(m[1].replace(/\/+$/, ""));
    }
  }
  return salida;
}

const ARREGLO =
  "Arreglo: el job lleva `needs: [cambios]` y `if: ${{ !cancelled() && needs.cambios.outputs.es_distribuidor != 'true' }}` " +
  "—combinado con la condicion que ya tenga, con `&&`—, y la misma pieza corre por ruta local " +
  "(`uses: ./actions/<pieza>`) en el ci.yml del marco. Es lo que hacen los jobs `deltas` y " +
  "`constitucion_cableada` de marco-ci.yml.";

test("toda referencia remota a una pieza propia vive en un job que se saltea en el repo del marco", () => {
  const remotas = remotasPorJob();
  // «No encontre nada» no es verde: hoy son dos (guardrail-deltas y constitucion).
  assert.ok(
    remotas.length >= 2,
    `esperaba al menos las dos referencias remotas propias de marco-ci.yml (jobs deltas y constitucion_cableada) ` +
      `y encontre ${remotas.length}: o el patron REMOTA_PROPIA o la lectura de jobs dejo de matchear. ` +
      "Revisalo antes de creerle al verde",
  );
  const mal = remotas
    .map((r) => ({ r, v: particion(r) }))
    .filter(({ v }) => !v.ok)
    .map(({ r, v }) => `${r.archivo}: job '${r.job}' -> ${r.texto}\n    ${v.motivo}`);
  assert.deepEqual(
    mal,
    [],
    "hay una referencia remota a una pieza del marco en un job que CORRE en el repo del marco.\n" +
      "GitHub resuelve las actions de un job en «Set up job», antes de evaluar el `if` de cualquier paso: " +
      "durante el PR que corta una version ese tag todavia no existe, el job muere ahi y el veredicto " +
      "agregado queda rojo con el release sin forma de mergearse. La salida vieja era apuntar al tag mayor " +
      "movil, y eso convierte el pin exacto del consumidor en una media verdad.\n" +
      ARREGLO +
      "\n" +
      mal.join("\n"),
  );
});

test("y cada pieza que se saltea aca corre por ruta local en el CI del propio marco", () => {
  // La otra mitad de la particion. Un job salteado en el marco es un job que el marco
  // no corre: si la pieza no se ejercita por ruta local en otro lado, el marco publica
  // una version sin haberla corrido NUNCA contra su propio arbol ni con el codigo del
  // PR que la cambia. Es el hueco de dogfooding que Rigel cerro en su 2.3.0.
  const locales = localesDe();
  const piezas = [...new Set(remotasPorJob().filter((r) => !r.deJob).map((r) => r.pieza))].sort();
  assert.ok(piezas.length >= 2, `esperaba al menos dos piezas remotas propias y vi ${piezas.length}`);
  const sinLocal = piezas.filter((p) => !locales.has(p));
  assert.deepEqual(
    sinLocal,
    [],
    "estas piezas se invocan por referencia remota en un job que se saltea en el repo del marco, y " +
      "ningun workflow de .github/workflows las corre por ruta local: el marco las publica sin haberlas " +
      "corrido sobre su propio arbol. Arreglo: un job en el ci.yml del marco con `uses: ./<pieza>`, y " +
      "su resultado cobrado en el veredicto agregado `ci-ok`",
  );
});

test("y MUERDE: la particion se EVALUA, no se busca como texto", () => {
  // Los fixtures son la clase entera de formas de fallar, cada una con su veredicto.
  // `conO` es la que un chequeo por substring —el de Rigel— deja pasar: tiene el texto
  // exacto de la sonda y no saltea nada, porque `always()` hace verdadera la condicion.
  const P = "needs.cambios.outputs.es_distribuidor != 'true'";
  const fixtures = {
    "a-bien.yml": [
      "jobs:",
      "  bien:",
      "    needs: [cambios]",
      `    if: \${{ !cancelled() && ${P} }}`,
      "    runs-on: ubuntu-latest",
      "    steps:",
      "      - uses: Org/Projects/actions/pieza@v9.9.9",
    ],
    "b-paso.yml": [
      "jobs:",
      "  solo_en_el_paso:",
      "    runs-on: ubuntu-latest",
      "    steps:",
      `      - if: \${{ ${P} }}`,
      "        uses: Org/Projects/actions/pieza@v9.9.9",
    ],
    "c-bloque.yml": [
      "jobs:",
      "  en_bloque:",
      "    needs: [cambios]",
      "    if: >-",
      "      !cancelled() &&",
      `      ${P}`,
      "    runs-on: ubuntu-latest",
      "    steps:",
      '      - uses: "Org/Projects/actions/pieza@v9.9.9"',
    ],
    "d-o.yml": [
      "jobs:",
      "  con_o:",
      "    needs: [cambios]",
      `    if: \${{ always() || ${P} }}`,
      "    runs-on: ubuntu-latest",
      "    steps:",
      "      - uses: Org/Projects/actions/pieza@v9.9.9",
    ],
    "e-apagado.yml": [
      "jobs:",
      "  apagado:",
      "    needs: [cambios]",
      `    if: \${{ false && ${P} }}`,
      "    runs-on: ubuntu-latest",
      "    steps:",
      "      - uses: Org/Projects/actions/pieza@v9.9.9",
    ],
    "f-reusable.yml": [
      "jobs:",
      "  reusable:",
      "    needs: [cambios]",
      `    if: \${{ ${P} }}`,
      "    uses: Org/Projects/.github/workflows/otro.yml@v9.9.9",
    ],
    "g-no-modelado.yml": [
      "jobs:",
      "  no_modelado:",
      "    needs: [cambios]",
      `    if: \${{ github.event_name == 'push' && ${P} }}`,
      "    runs-on: ubuntu-latest",
      "    steps:",
      "      - uses: Org/Projects/actions/pieza@v9.9.9",
    ],
    // LA CABECERA CON COMENTARIO (hallazgo FO-H3 de la revision adversarial): YAML
    // valido, y el lector de jobs no la reconocia. Sus lineas se le pegaban al job
    // anterior y heredaban su `if:`: la referencia sin particion salia verde,
    // atribuida a un job particionado que no la tiene.
    "i-cabecera-comentada.yml": [
      "jobs:",
      "  particionado:",
      "    needs: [cambios]",
      `    if: \${{ !cancelled() && ${P} }}`,
      "    runs-on: ubuntu-latest",
      "    steps:",
      "      - run: echo nada remoto aca",
      "  comentado: # raices de Terraform",
      "    runs-on: ubuntu-latest",
      "    steps:",
      "      - uses: Org/Projects/actions/pieza@v9.9.9",
    ],
    // Lo que NO es una referencia: un comentario y un `echo` dentro de un `run:`.
    "h-ruido.yml": [
      "jobs:",
      "  ruido:",
      "    runs-on: ubuntu-latest",
      "    steps:",
      "      # - uses: Org/Projects/actions/pieza@v1",
      "      - run: |",
      '          echo "        uses: Org/Projects/actions/pieza@v9.9.9"',
    ],
  };
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "projects-refs-propias-"));
  try {
    for (const [nombre, lineas] of Object.entries(fixtures)) {
      fs.writeFileSync(path.join(dir, nombre), `${lineas.join("\n")}\n`);
    }
    const vistas = remotasPorJob(dir);
    assert.deepEqual(
      vistas.map((v) => v.job),
      ["bien", "solo_en_el_paso", "en_bloque", "con_o", "apagado", "reusable", "no_modelado", "comentado"],
      "el recorrido tiene que ver las ocho referencias de verdad, cada una en SU job, y ni el comentario ni el echo",
    );
    const veredicto = Object.fromEntries(vistas.map((v) => [v.job, particion(v)]));
    assert.equal(veredicto.bien.ok, true, `la particion en el if de job cuenta: ${veredicto.bien.motivo}`);
    assert.equal(veredicto.en_bloque.ok, true, `un if en bloque plegado tambien cuenta: ${veredicto.en_bloque.motivo}`);
    assert.equal(veredicto.solo_en_el_paso.ok, false, "un if de PASO no particiona: el uses ya se resolvio");
    assert.match(veredicto.solo_en_el_paso.motivo, /no tiene `if:` de JOB/);
    assert.equal(veredicto.con_o.ok, false, "always() || <sonda> tiene el texto y corre igual en el marco");
    assert.match(veredicto.con_o.motivo, /NO lo saltea/);
    assert.equal(veredicto.apagado.ok, false, "apagar el job en todas partes no es particionar");
    assert.match(veredicto.apagado.motivo, /TAMBIEN en un consumidor/);
    assert.equal(veredicto.reusable.ok, false, "un reusable propio por ref remota es rojo aunque lleve la sonda");
    assert.match(veredicto.reusable.motivo, /REUSABLE/);
    assert.equal(veredicto.no_modelado.ok, false, "lo que el banco no modela no se lee como particionado");
    assert.match(veredicto.no_modelado.motivo, /no se pudo evaluar/);
    assert.equal(veredicto.comentado.ok, false, "una cabecera con comentario no hereda el `if:` del job anterior");
    assert.match(veredicto.comentado.motivo, /no tiene `if:` de JOB/);
    // Y el censo independiente coincide con el lector sobre el fixture entero.
    for (const [nombre, lineas] of Object.entries(fixtures)) {
      const texto = `${lineas.join("\n")}\n`;
      assert.deepEqual(
        jobsConCondiciones(texto).map((j) => j.nombre),
        censoDeJobs(texto),
        `${nombre}: el lector de jobs y el censo independiente no ven los mismos jobs`,
      );
    }
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

/** Los jobs de un workflow contados SIN el lector de expresiones.mjs: toda linea no
 *  vacia y no comentada a DOS espacios dentro de `jobs:` es la cabecera de un job, y
 *  su nombre es lo que va antes de los dos puntos (con o sin comillas). Una linea a
 *  dos espacios que no tiene esa forma se devuelve entera, para que el rojo la nombre.
 *  Es la contraprueba del lector: si una forma de cabecera nueva lo engana, sus jobs
 *  desaparecen del censo del lector y no de este. */
function censoDeJobs(texto) {
  const lineas = texto.split(/\r?\n/);
  const inicio = lineas.findIndex((l) => /^jobs:\s*(?:#.*)?$/.test(l));
  if (inicio === -1) return [];
  const salida = [];
  for (const l of lineas.slice(inicio + 1)) {
    if (/^\S/.test(l) && !/^#/.test(l)) break; // otra clave de primer nivel
    if (!/^ {2}\S/.test(l) || /^ {2}#/.test(l)) continue;
    const m = /^ {2}(["']?)([^"'\s:#]+)\1\s*:/.exec(l);
    salida.push(m ? m[2] : l);
  }
  return salida;
}

test("el lector de jobs ve los mismos jobs que un censo independiente, en cada workflow del marco", () => {
  // Hallazgo FO-H3 de la revision adversarial: `jobsConCondiciones` solo abria un job
  // con la cabecera EXACTA `  nombre:`. Con `  terraform: # raices` el job terraform
  // desaparecia y sus referencias se le atribuian al job anterior, con su `if:`. El
  // banco hermano la-llave-del-despliegue se protege con una lista exacta de nombres;
  // este mira todos los workflows, asi que la contraprueba es un conteo que no usa el
  // lector.
  const distintos = [];
  let vistos = 0;
  for (const archivo of fs.readdirSync(DIR_WORKFLOWS).filter((f) => /\.ya?ml$/.test(f)).sort()) {
    const texto = fs.readFileSync(path.join(DIR_WORKFLOWS, archivo), "utf8");
    if (!/^jobs:\s*$/m.test(texto)) continue;
    const delLector = jobsConCondiciones(texto).map((j) => j.nombre);
    const delCenso = censoDeJobs(texto);
    vistos += delCenso.length;
    if (JSON.stringify(delLector) !== JSON.stringify(delCenso)) {
      distintos.push(`${archivo}: lector ${JSON.stringify(delLector)} / censo ${JSON.stringify(delCenso)}`);
    }
  }
  assert.ok(vistos >= 10, `el censo independiente vio ${vistos} jobs en .github/workflows: el recorrido se rompio`);
  assert.deepEqual(
    distintos,
    [],
    "el lector de jobs de pruebas/andamio/expresiones.mjs no ve los mismos jobs que un conteo de las cabeceras a dos " +
      "espacios: un job que el lector no abre le presta su `if:` al anterior, y una referencia remota sin particion " +
      "sale verde atribuida a otro job. Arreglo: que el lector reconozca esa forma de cabecera",
  );
});

test("el evaluador sigue lanzando ante una funcion que el banco no declaro", () => {
  // La extension de expresiones.mjs es opt-in: sin FUNCIONES, `cancelled()` lanza como
  // lanzaba. Si esto deja de ser cierto, los bancos del despliegue —que confian en que
  // una funcion desconocida es rojo— pasan a evaluar funciones que nadie modelo.
  assert.throws(() => evaluar("!cancelled()", { needs: {} }), /funcion no soportada/);
  assert.throws(
    () => evaluar("contains('a', 'b')", { [FUNCIONES]: { contains: () => true } }),
    /con argumentos/,
    "una funcion con argumentos no se evalua aunque este declarada: el banco solo modela las de estado",
  );
  assert.equal(evaluar("!cancelled()", { [FUNCIONES]: { cancelled: () => false } }), true);
});
