// BANCO DEL PASO QUE VERIFICA LAS RAICES DE TERRAFORM.
//
// DONDE VIVE EL PASO, Y POR QUE CAMBIO DE ARCHIVO. Hasta el change
// la-ventana-se-cierra habia DOS copias del mismo paso: una inline en el job
// build_test de plantilla/.github/workflows/ci.yml y otra en el job `terraform`
// del workflow reusable (.github/workflows/marco-ci.yml). Este banco extraia la
// del ANDAMIO, y la del reusable —la que corre en TODO consumidor— no tenia un
// solo caso commiteado: el censo de pasos la daba por cubierta porque este
// archivo menciona el mismo nombre (colision de nombre, declarada en el
// encabezado del job). Las dos copias ya habian divergido: la del andamio no
// tenia la guarda de raices vacias ni el recorte bajo pull_request_target, y se
// salteaba justo en los PRs que solo tocan infra/ (build_test no corre en el
// carril de docs, y ^infra/ es carril de docs).
//
// La copia del andamio se RETIRO: el ci.yml del andamio ya llama a marco-ci.yml,
// cuyo job `terraform` mira las mismas raices por default. Este banco extrae
// ahora el paso del REUSABLE, y el caso «el andamio no trae una segunda copia»
// impide que vuelva.
//
// EL BANCO NO COPIA EL SCRIPT. Lo EXTRAE del YAML con el mismo extractor que usan
// los otros bancos de pasos inline y lo corre contra arboles fabricados, con un
// `terraform` falso cuyos codigos de salida controla el caso. Si el paso se
// renombra o pierde su `run:`, el extractor tira y esto se pone rojo en vez de
// dejar de probar en silencio.
//
// ── LA GRAVEDAD YA NO SALE DEL RELOJ, SALE DE LA LINEA MAYOR ───────────────
// Hasta la 1.9.6 la gravedad de un hallazgo se derivaba comparando el dia de la
// corrida con el input `ventana_terraform` (default 2026-09-30): avisaba hasta esa
// fecha y detenia desde el dia siguiente, sin PR de bump de por medio. La decision
// D9 del PO la cambio: en toda la linea 1 un hallazgo AVISA, el endurecimiento
// queda anunciado para v2, y el input queda sin efecto hasta que v2 lo quite. El
// motivo es que uno de los tres hallazgos —el binario ausente— NO se arregla en el
// arbol del consumidor: lo que lo garantiza es un hashicorp/setup-terraform pinado
// que este job todavia no lleva (decision D1: un arreglo fuera del arbol del
// consumidor va en aviso o se trata como breaking).
//
// La gravedad la fija el env `GRAVEDAD_TERRAFORM` del paso —no es un input: la
// decide la version que el consumidor pina—, y el bloque «LA LINEA MAYOR» de este
// banco la ata al CHANGELOG: el PR que publique la 2.0.0 se pone rojo si el paso
// sigue en aviso o si el input `ventana_terraform` sigue existiendo. Es lo que
// hace que el anuncio de v2 no dependa de que alguien se acuerde.
//
// LO QUE VERIFICA, sobre el script extraido y con las dos gravedades:
//   1. sin raices de Terraform, ::notice:: y verde — no hay nada que verificar;
//   2. con raices y sin binario en aviso (la linea 1), ::warning:: y verde;
//   3. con raices y sin binario con gravedad error (la v2), ::error:: y ROJO;
//   4. fmt o validate en rojo en aviso, ::warning:: y verde;
//   5. fmt o validate en rojo con gravedad error, ::error:: y ROJO;
//   6-8. la plataforma: `ninguna`, otra plataforma y la trampa del infra/ vacio;
//   9. raices_terraform declarado vacio: ::error:: y ROJO en las dos gravedades;
//  10. bajo pull_request_target, solo formato y el recorte anunciado;
//  11. el input ventana_terraform declarado: ::notice:: de que no tiene efecto;
//  12. una gravedad invalida en el env: ::error:: y ROJO;
//  13. el dia de la corrida no cambia el veredicto.
//
// LO QUE ESTE BANCO NO PUEDE. No corre Terraform de verdad: el binario es falso
// y lo que se mide es la LOGICA DE GRAVEDAD del paso, no que `terraform validate`
// tenga razon. Que las raices sean validas lo mide el CI cuando corre con el
// binario real.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { RUTA_WORKFLOW, scriptDelPaso } from "../marco-ci/extraer.mjs";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const CI_ANDAMIO = path.join(RAIZ, "plantilla", ".github", "workflows", "ci.yml");
const PASO = "Formato y validez de las raices de Terraform";

const script = scriptDelPaso(PASO, RUTA_WORKFLOW);
const marco = fs.readFileSync(RUTA_WORKFLOW, "utf8");
const andamio = fs.readFileSync(CI_ANDAMIO, "utf8");

// PATH sin el bin falso: es el escenario "el runner no trae terraform". Se
// declara aca y se comprueba abajo, porque si la maquina que corre el banco
// tuviera terraform en /usr/bin el caso 3 probaria otra cosa.
const PATH_PELADO = "/usr/bin:/bin";

/** Las lineas del bloque `env:` del paso, entre su `- name:` y su `run:`. */
function envDelPaso(texto = marco) {
  const lineas = texto.split("\n");
  const inicio = lineas.findIndex((l) => l.trim() === `- name: ${PASO}`);
  if (inicio === -1) return [];
  const env = [];
  for (let i = inicio + 1; i < lineas.length; i++) {
    if (/^\s*run: \|/.test(lineas[i]) || /^\s*- name: /.test(lineas[i])) break;
    env.push(lineas[i]);
  }
  return env;
}

/** La gravedad que el paso DECLARA en su env, o null si no la declara. */
function gravedadDeclarada(texto = marco) {
  for (const l of envDelPaso(texto)) {
    const m = /^\s*GRAVEDAD_TERRAFORM:\s*["']?([^"'\s#]+)["']?\s*(?:#.*)?$/.exec(l);
    if (m) return m[1];
  }
  return null;
}

/** Un directorio con un `terraform` falso cuyos rc los decide el caso. */
function binFalso(dir, { fmt = 0, init = 0, validate = 0 } = {}) {
  const bin = path.join(dir, "bin");
  fs.mkdirSync(bin, { recursive: true });
  const ruta = path.join(bin, "terraform");
  fs.writeFileSync(
    ruta,
    [
      "#!/bin/sh",
      'echo "terraform-falso $*"',
      "case \"$1\" in",
      '  version) exit 0 ;;',
      `  fmt) exit ${fmt} ;;`,
      `  init) exit ${init} ;;`,
      `  validate) exit ${validate} ;;`,
      "esac",
      "exit 0",
      "",
    ].join("\n"),
  );
  fs.chmodSync(ruta, 0o755);
  return bin;
}

/** Un `date` falso que contesta siempre el mismo dia: es como se mide que el
 *  veredicto no depende del reloj sin esperar a que pase el calendario. */
function relojFalso(dir, fecha) {
  const reloj = path.join(dir, "reloj");
  fs.mkdirSync(reloj, { recursive: true });
  const ruta = path.join(reloj, "date");
  fs.writeFileSync(ruta, `#!/bin/sh\necho "${fecha}"\n`);
  fs.chmodSync(ruta, 0o755);
  return reloj;
}

/**
 * Corre un script del paso sobre un arbol fabricado.
 *
 * `raices` son los directorios de Terraform que existen; `gravedad` es el valor
 * de GRAVEDAD_TERRAFORM, que en el workflow llega por `env:`; `declaradas` es el
 * input raices_terraform y `ventana` el input ventana_terraform, que en la linea 1
 * ya no tiene efecto. `conBinario` en false deja el PATH sin el falso, que es el
 * escenario del runner pelado. `fecha`, si viene, pone un `date` falso adelante.
 *
 * `archivos` escribe rutas sueltas (clave = ruta relativa con "/", valor =
 * contenido) SIN crear ningun `.tf`. Es lo que hace medibles los arboles de una
 * plataforma que no usa Terraform.
 */
function correr({
  raices = [],
  archivos = {},
  gravedad = "warning",
  declaradas = "infra infra-prod",
  ventana = "",
  evento = "pull_request",
  conBinario = true,
  rc = {},
  fecha = null,
  texto = script,
} = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "projects-tf-"));
  for (const r of raices) {
    fs.mkdirSync(path.join(dir, r), { recursive: true });
    fs.writeFileSync(path.join(dir, r, "main.tf"), "# fixture\n");
  }
  for (const [rel, contenido] of Object.entries(archivos)) {
    const abs = path.join(dir, ...rel.split("/"));
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, contenido);
  }
  const bin = binFalso(dir, rc);
  const delante = fecha ? `${relojFalso(dir, fecha)}:` : "";
  const res = spawnSync("bash", ["-c", texto], {
    cwd: dir,
    encoding: "utf8",
    env: {
      PATH: `${delante}${conBinario ? `${bin}:${PATH_PELADO}` : PATH_PELADO}`,
      RAICES_DECLARADAS: declaradas,
      VENTANA_TERRAFORM: ventana,
      GRAVEDAD_TERRAFORM: gravedad,
      EVENTO: evento,
      HOME: dir,
    },
  });
  fs.rmSync(dir, { recursive: true, force: true });
  return { code: res.status, salida: `${res.stdout}${res.stderr}` };
}

/** Las anotaciones de una salida, para comparar dos corridas sin el ruido del log. */
const anotaciones = (salida) => salida.split("\n").filter((l) => /^::(notice|warning|error)/.test(l));

// ---------------------------------------------------------------------------
// 0 · QUE EL BANCO ESTE MIDIENDO ALGO, Y SOBRE LA UNICA COPIA
// ---------------------------------------------------------------------------

test("terraform · el extractor encontro el paso del reusable y el script no salio vacio", () => {
  assert.ok(script.length > 400, `el script salio de ${script.length} caracteres: el extractor fallo`);
  assert.match(script, /terraform fmt -check/, "el script tiene que correr fmt -check");
  assert.match(script, /-backend=false/, "el init no puede inicializar el state remoto");
  assert.match(script, /GRAVEDAD_TERRAFORM/, "la gravedad tiene que salir del env del paso");
});

test("terraform · el paso vive dentro del job terraform del reusable y no suelto", () => {
  const delJob = marco.indexOf("\n  terraform:\n");
  const delPaso = marco.indexOf(`- name: ${PASO}`);
  const delSiguiente = marco.indexOf("\n  marco_ok:\n");
  assert.ok(delJob > 0, "no existe el job terraform en marco-ci.yml");
  assert.ok(delPaso > delJob && delPaso < delSiguiente, "el paso de Terraform quedo fuera del job terraform");
});

test("terraform · el andamio NO trae una segunda copia del paso, y si llama al reusable que lo corre", () => {
  // UNA COPIA, UNA GRAVEDAD. La del andamio se retiro porque ya habia divergido
  // de la del reusable y porque su gravedad no tenia linea mayor que la
  // endureciera: el andamio se copia una vez y despues es del proyecto. Se mira
  // el YAML sin sus comentarios: el comentario que explica DONDE vive ahora la
  // verificacion nombra los comandos, y eso no es una copia.
  const codigo = andamio
    .split("\n")
    .filter((l) => !/^\s*#/.test(l))
    .join("\n");
  const copias = [
    [`- name: ${PASO}`, "el paso con su nombre"],
    ["terraform fmt", "un terraform fmt inline"],
    ["terraform validate", "un terraform validate inline"],
    ["VENTANA_TERRAFORM", "la ventana de Terraform"],
    ["GRAVEDAD_TERRAFORM", "la gravedad de Terraform"],
  ].filter(([aguja]) => codigo.includes(aguja));
  assert.deepEqual(
    copias.map(([, que]) => que),
    [],
    "plantilla/.github/workflows/ci.yml volvio a traer su propia verificacion de Terraform. La verificacion vive en el " +
      "job `terraform` de marco-ci.yml, que el ci.yml del andamio ya llama y que mira infra/ e infra-prod/ por default; " +
      "una segunda copia diverge (ya divergio una vez) y su gravedad no sigue la linea mayor del marco. Arreglo: " +
      "borrala del andamio y, si le falta algo al job del reusable, agregalo ahi",
  );
  assert.match(andamio, /\/Projects\/\.github\/workflows\/marco-ci\.yml@/, "el andamio dejo de llamar a marco-ci.yml: sin eso nadie verifica sus raices");
  const porDefault = /^ {6}raices_terraform:\s*$[\s\S]*?^ {8}default:\s*"([^"]*)"/m.exec(marco)?.[1] ?? "";
  for (const r of ["infra", "infra-prod"]) {
    assert.ok(porDefault.split(/\s+/).includes(r), `el default de raices_terraform ya no incluye ${r}, que es una raiz que el andamio reparte`);
  }
});

test("terraform · el escenario del runner pelado es medible en esta maquina", () => {
  const res = spawnSync("bash", ["-c", "command -v terraform"], {
    encoding: "utf8",
    env: { PATH: PATH_PELADO },
  });
  assert.notEqual(res.status, 0, `hay un terraform en ${PATH_PELADO}: el caso del runner pelado no se puede medir aca`);
});

// ---------------------------------------------------------------------------
// LOS CAMINOS, CON LAS DOS GRAVEDADES
// ---------------------------------------------------------------------------

test("terraform · 1 · sin raices no verifica nada, lo dice y sale verde", () => {
  const { code, salida } = correr({ raices: [] });
  assert.equal(code, 0);
  assert.match(salida, /::notice::no hay raices de Terraform/);
  assert.doesNotMatch(salida, /::error::/);
});

test("terraform · 6 · `ninguna`: sin raices, gravedad error y sin binario, sigue verde", () => {
  // Las dos condiciones que en el caso 3 dan ROJO —gravedad de la v2 y runner sin
  // binario— y tiene que seguir verde, porque no hay infraestructura que
  // verificar. Es la garantia que vuelve a `ninguna` una respuesta de primera
  // clase: un proyecto que no despliega no amanece rojo el dia que el marco
  // endurezca una verificacion que no lo nombra.
  const { code, salida } = correr({ raices: [], gravedad: "error", conBinario: false });
  assert.equal(code, 0, "un repositorio sin raices de Terraform no puede ponerse rojo, ni con la gravedad de la v2");
  assert.match(salida, /::notice::no hay raices de Terraform/);
  assert.doesNotMatch(salida, /::error::/);
  assert.doesNotMatch(salida, /::warning::/, "no hay nada de que avisar: no falta un binario que no hace falta");
});

test("terraform · 7 · una plataforma sin Terraform no inventa raices", () => {
  const { code, salida } = correr({
    raices: [],
    archivos: {
      "wrangler.toml": 'name = "api"\n',
      "supabase/config.toml": "[db]\nport = 54322\n",
      "adaptadores.md": "# Adaptadores de plataforma\n",
    },
    gravedad: "error",
    conBinario: false,
  });
  assert.equal(code, 0);
  assert.match(salida, /::notice::no hay raices de Terraform/);
  assert.doesNotMatch(salida, /::error::/);
});

test("terraform · 8 · TRAMPA: un `infra/` sin un solo .tf sigue contando como raiz", () => {
  // LO QUE SE MIDE ACA ES EL COMPORTAMIENTO DE HOY, no el deseado. El paso decide
  // con `[ -d infra ]`: le alcanza con que el DIRECTORIO exista. Por eso
  // infra/adaptadores.md dice que al elegir una plataforma sin Terraform se borra
  // el directorio ENTERO y ese archivo se mueve a la raiz. El arreglo de fondo esta
  // en el paso: que la deteccion sea por presencia de `*.tf`. Cuando eso cambie,
  // esta prueba se pone roja y hay que reescribirla.
  const arbol = { raices: [], archivos: { "infra/adaptadores.md": "# Adaptadores de plataforma\n" }, conBinario: false };
  const v2 = correr({ ...arbol, gravedad: "error" });
  assert.match(v2.salida, /::error::hay raices de Terraform \(infra\)/);
  assert.equal(v2.code, 1, "hoy el directorio vacio de .tf basta para exigir Terraform: si esto salio 0, la deteccion cambio");
  const v1 = correr({ ...arbol, gravedad: "warning" });
  assert.match(v1.salida, /::warning::hay raices de Terraform \(infra\)/, "en la linea 1 la trampa avisa, no calla");
  assert.equal(v1.code, 0);
});

test("terraform · 2 · sin binario en AVISO (la linea 1) avisa y sale verde", () => {
  const { code, salida } = correr({ raices: ["infra", "infra-prod"], gravedad: "warning", conBinario: false });
  assert.equal(code, 0);
  assert.match(salida, /::warning::hay raices de Terraform \(infra infra-prod\) y este runner no trae el binario/);
  assert.match(salida, /::notice::verificacion de Terraform en modo aviso/, "el aviso tiene que decir que es aviso, y hasta cuando");
});

test("terraform · 3 · sin binario con gravedad ERROR (la v2) es ROJO — el fail-open que no puede volver", () => {
  const { code, salida } = correr({ raices: ["infra", "infra-prod"], gravedad: "error", conBinario: false });
  assert.match(salida, /::error::hay raices de Terraform \(infra infra-prod\) y este runner no trae el binario/);
  assert.equal(code, 1, "con la gravedad de la v2, no poder verificar tiene que detener el CI y no avisar");
});

test("terraform · 4 · fmt y validate en rojo en AVISO avisan y salen verde", () => {
  const fmt = correr({ raices: ["infra"], gravedad: "warning", rc: { fmt: 3 } });
  assert.equal(fmt.code, 0);
  assert.match(fmt.salida, /::warning::hay archivos de Terraform sin formatear/);

  const val = correr({ raices: ["infra"], gravedad: "warning", rc: { validate: 1 } });
  assert.equal(val.code, 0);
  assert.match(val.salida, /::warning::terraform validate fallo en 'infra'/);
});

test("terraform · 5 · fmt y validate en rojo con gravedad ERROR son ROJO", () => {
  const fmt = correr({ raices: ["infra"], gravedad: "error", rc: { fmt: 3 } });
  assert.match(fmt.salida, /::error::hay archivos de Terraform sin formatear/);
  assert.equal(fmt.code, 1);

  const val = correr({ raices: ["infra", "infra-prod"], gravedad: "error", rc: { validate: 1 } });
  assert.match(val.salida, /::error::terraform validate fallo en 'infra'/);
  assert.match(val.salida, /::error::terraform validate fallo en 'infra-prod'/, "la segunda raiz se sigue mirando");
  assert.equal(val.code, 1);
});

test("terraform · con binario y todo en orden, verde y sin un solo aviso, en las dos gravedades", () => {
  for (const gravedad of ["warning", "error"]) {
    const { code, salida } = correr({ raices: ["infra", "infra-prod"], gravedad });
    assert.equal(code, 0, `gravedad ${gravedad}`);
    assert.doesNotMatch(salida, /::error::/);
    assert.doesNotMatch(salida, /::warning::/);
  }
});

// ---------------------------------------------------------------------------
// LAS RAMAS DEL REUSABLE QUE NINGUN CASO EJERCITABA
// ---------------------------------------------------------------------------

test("terraform · 9 · raices_terraform declarado VACIO es ROJO en las dos gravedades: no es un repo sin infra", () => {
  for (const gravedad of ["warning", "error"]) {
    const { code, salida } = correr({ raices: ["infra"], declaradas: "   ", gravedad });
    assert.equal(code, 1, `gravedad ${gravedad}: un with: mal escrito no puede salir verde diciendo que no hay infraestructura`);
    assert.match(salida, /::error::el input raices_terraform llego vacio/);
    assert.doesNotMatch(salida, /::notice::no hay raices de Terraform/, "no puede afirmar que no hay raices");
  }
});

test("terraform · 10 · bajo pull_request_target verifica formato y NO validez, y lo anuncia", () => {
  // validate rojo con gravedad error: si corriera, saldria 1. Bajo
  // pull_request_target no puede correr (init descarga y validate ejecuta codigo
  // elegido por el PR, con el token y los secretos del llamador).
  const r = correr({ raices: ["infra"], gravedad: "error", evento: "pull_request_target", rc: { validate: 1 } });
  assert.equal(r.code, 0, r.salida);
  assert.match(r.salida, /::notice::bajo pull_request_target este paso verifica FORMATO y no validez/);
  assert.doesNotMatch(r.salida, /terraform-falso init/, "init no puede correr bajo pull_request_target");
  assert.doesNotMatch(r.salida, /terraform-falso validate/, "validate no puede correr bajo pull_request_target");
  // Y el formato SI se mira.
  const fmt = correr({ raices: ["infra"], gravedad: "error", evento: "pull_request_target", rc: { fmt: 3 } });
  assert.equal(fmt.code, 1);
  assert.match(fmt.salida, /::error::hay archivos de Terraform sin formatear/);
});

test("terraform · 11 · el input ventana_terraform ya no tiene efecto, y quien lo pasa se entera", () => {
  // Con la fecha que era el default, con una vencida, y con un valor que ni es
  // fecha: el veredicto es el mismo que sin el input, y un ::notice:: le dice al
  // consumidor que lo saque antes de que v2 lo quite (pasar un input que el
  // reusable no declara rompe la llamada).
  const sin = correr({ raices: ["infra"], gravedad: "warning", rc: { fmt: 3 } });
  assert.doesNotMatch(sin.salida, /ventana_terraform/, "sin el input no hay nada que avisar sobre el");
  for (const ventana of ["2026-09-30", "2000-01-01", "manana"]) {
    const con = correr({ raices: ["infra"], gravedad: "warning", rc: { fmt: 3 }, ventana });
    assert.equal(con.code, sin.code, `con ventana_terraform=${ventana} el veredicto cambio`);
    assert.match(con.salida, /::notice::el input ventana_terraform llego como '[^']*' y ya no tiene efecto/);
    assert.match(con.salida, /se quita en v2/);
    assert.doesNotMatch(con.salida, /::error::/, `ventana_terraform=${ventana} no puede producir un error: el input no tiene efecto`);
  }
});

test("terraform · 12 · una gravedad invalida en el env es ROJO, y dice que el defecto es del marco", () => {
  for (const gravedad of ["", "rojo", "notice"]) {
    const { code, salida } = correr({ raices: ["infra"], gravedad });
    assert.equal(code, 1, `GRAVEDAD_TERRAFORM='${gravedad}' tiene que detener: un valor desconocido dejaria la compuerta en un lado sin decir cual`);
    assert.match(salida, /::error::GRAVEDAD_TERRAFORM vale/);
    assert.match(salida, /defecto DEL MARCO/);
  }
});

test("terraform · 13 · el DIA de la corrida no cambia el veredicto", () => {
  // Es la propiedad que la ventana violaba: el mismo arbol, con la misma
  // version del marco, salia verde el 2026-09-30 y rojo el 2026-10-01. Con un
  // `date` falso adelante en el PATH, dos dias opuestos tienen que dar el mismo
  // codigo y las mismas anotaciones, en las dos gravedades.
  for (const gravedad of ["warning", "error"]) {
    const antes = correr({ raices: ["infra"], gravedad, rc: { fmt: 3 }, fecha: "2000-01-01", ventana: "2026-09-30" });
    const despues = correr({ raices: ["infra"], gravedad, rc: { fmt: 3 }, fecha: "2999-12-31", ventana: "2026-09-30" });
    assert.equal(antes.code, despues.code, `gravedad ${gravedad}: el codigo de salida dependio del dia`);
    assert.deepEqual(anotaciones(antes.salida), anotaciones(despues.salida), `gravedad ${gravedad}: las anotaciones dependieron del dia`);
  }
});

test("terraform · la gravedad declarada MUERDE: clavada en warning, el rojo de la v2 desaparece", () => {
  // Se muta el script EXTRAIDO, nunca el archivo del repo: se le saca la linea que
  // toma la gravedad del env, que es como se ve un arreglo que "simplifica" la
  // compuerta hasta dejarla en aviso perpetuo. Con la mutacion, el arbol que con
  // gravedad error sale rojo tiene que salir verde; si siguiera rojo, el rojo no
  // dependia de la gravedad declarada.
  const clavado = script.replace(/GRAVEDAD="\$\{GRAVEDAD_TERRAFORM\}"/, 'GRAVEDAD="warning"');
  assert.notEqual(clavado, script, "la mutacion no encontro la linea que toma la gravedad del env");
  const arbol = { raices: ["infra"], gravedad: "error", rc: { fmt: 3 } };
  assert.equal(correr({ ...arbol, texto: clavado }).code, 0, "con la gravedad clavada en warning el paso tiene que dejar de detener");
  assert.equal(correr(arbol).code, 1, "sin la mutacion, el mismo arbol con gravedad error tiene que salir rojo");
});

// ---------------------------------------------------------------------------
// LA LINEA MAYOR: el anuncio de v2 no depende de que alguien se acuerde
// ---------------------------------------------------------------------------

/** El mayor de la version publicada mas reciente: la primera `## [X.Y.Z]` del
 *  CHANGELOG. `[No publicado]` no matchea a proposito. */
function mayorPublicada() {
  const ch = fs.readFileSync(path.join(RAIZ, "CHANGELOG.md"), "utf8");
  const m = ch.match(/^## \[(\d+)\.\d+\.\d+\]/m);
  assert.ok(m, "CHANGELOG.md no tiene ninguna entrada `## [X.Y.Z]`: sin eso no hay linea mayor con que comparar");
  return Number(m[1]);
}

/** Que le falta al paso para decir lo que su linea mayor promete. Vacio = coherente. */
function problemasDeLinea({ mayor, gravedad, inputVentana }) {
  const p = [];
  if (mayor >= 2) {
    if (gravedad !== "error") {
      p.push(
        `la ${mayor}.x se publico y el paso de Terraform sigue con GRAVEDAD_TERRAFORM=${gravedad}: la v2 anuncio que un hallazgo DETIENE. ` +
          `Arreglo: GRAVEDAD_TERRAFORM: error en el env del paso de marco-ci.yml (y el hashicorp/setup-terraform pinado por SHA que ` +
          `el encabezado del job describe, para que el binario ausente deje de ser un defecto del marco)`,
      );
    }
    if (inputVentana) {
      p.push(
        `la ${mayor}.x se publico y el input ventana_terraform sigue declarado: la v2 lo quita. Arreglo: borralo de los inputs ` +
          `de marco-ci.yml, del env del paso y del ejemplo del encabezado`,
      );
    }
  } else {
    if (gravedad !== "warning") {
      p.push(
        `en la linea ${mayor} el paso de Terraform tiene que AVISAR (decision D9: el endurecimiento va en v2) y declara ` +
          `GRAVEDAD_TERRAFORM=${gravedad}. Endurecerlo dentro de la linea 1 pone rojo a un consumidor que mergea el bump sin ` +
          `leerlo, por un binario que no puede arreglar en su arbol. Arreglo: GRAVEDAD_TERRAFORM: warning`,
      );
    }
    if (!inputVentana) {
      p.push(
        `en la linea ${mayor} el input ventana_terraform tiene que seguir declarado (sin efecto): quitar un input es BREAKING ` +
          `y rompe la llamada de todo consumidor que lo pase. Arreglo: devolverlo como no-op, se quita en v2`,
      );
    }
  }
  return p;
}

const INPUT_VENTANA = /^ {6}ventana_terraform:\s*$/m;

test("terraform · la gravedad del paso y el input ventana_terraform siguen a la LINEA MAYOR del CHANGELOG", () => {
  const gravedad = gravedadDeclarada();
  assert.ok(gravedad, "el paso de Terraform no declara GRAVEDAD_TERRAFORM en su env: la gravedad no puede quedar implicita");
  const problemas = problemasDeLinea({ mayor: mayorPublicada(), gravedad, inputVentana: INPUT_VENTANA.test(marco) });
  assert.deepEqual(problemas, [], `\n${problemas.join("\n")}\n`);
});

test("terraform · la LINEA MAYOR MUERDE en las cuatro direcciones", () => {
  // Sin esto, el caso de arriba podria ser una funcion que devuelve [] pase lo que
  // pase. Las cuatro formas en que el paso y su linea se separan:
  const casos = [
    [{ mayor: 2, gravedad: "warning", inputVentana: false }, /sigue con GRAVEDAD_TERRAFORM=warning/],
    [{ mayor: 2, gravedad: "error", inputVentana: true }, /el input ventana_terraform sigue declarado/],
    [{ mayor: 1, gravedad: "error", inputVentana: true }, /tiene que AVISAR/],
    [{ mayor: 1, gravedad: "warning", inputVentana: false }, /quitar un input es BREAKING/],
  ];
  for (const [estado, espera] of casos) {
    const p = problemasDeLinea(estado);
    assert.ok(p.some((x) => espera.test(x)), `${JSON.stringify(estado)} no fue detectado: ${JSON.stringify(p)}`);
  }
  // Los dos estados coherentes no disparan nada.
  assert.deepEqual(problemasDeLinea({ mayor: 1, gravedad: "warning", inputVentana: true }), []);
  assert.deepEqual(problemasDeLinea({ mayor: 2, gravedad: "error", inputVentana: false }), []);
  // Y el lector del env no inventa: sin la linea, no hay gravedad declarada.
  assert.equal(gravedadDeclarada(marco.replace(/^\s*GRAVEDAD_TERRAFORM:.*$/m, "")), null);
});

// ---------------------------------------------------------------------------
// EL OTRO LADO: lo que el ANDAMIO declara sobre su plataforma
//
// Los caminos 6, 7 y 8 miden el PASO. Lo que sigue mide la otra mitad del mismo
// hecho: que el andamio declare una plataforma admitida y que el catalogo de
// adaptadores conteste, para cada una, lo que el marco le exige contestar. Sin
// esto, "el CI no exige raices con `ninguna`" seria una propiedad del script sin
// nadie del lado del andamio que la eligiera.
// ---------------------------------------------------------------------------

/** Los cinco valores admitidos. UNA sola declaracion en este archivo. */
const PLATAFORMAS = ["supabase", "cloudflare", "gcp", "aws", "ninguna"];

const ANDAMIO = path.join(RAIZ, "plantilla");
const ADAPTADORES = path.join(ANDAMIO, "infra", "adaptadores.md");

/** Una fecha ISO en cualquier parte del texto. */
const FECHA = /\b\d{4}-\d{2}-\d{2}\b/;

/** El encabezado de una etiqueta del adaptador, SIN su lista: desde la etiqueta
 *  hasta el primer item que la sigue. No se puede mirar solo la linea, porque la
 *  fecha se va a la siguiente en cuanto la URL del proveedor es larga —le pasa a
 *  `gcp` hoy— y una comprobacion por linea daria un falso rojo ahi y ninguno en
 *  el caso real. Devuelve null si la etiqueta no esta. */
function declaracionDe(cuerpo, etiqueta) {
  const i = cuerpo.indexOf(etiqueta);
  if (i === -1) return null;
  const resto = cuerpo.slice(i);
  const fin = resto.search(/\n\s*[-*] /);
  return fin === -1 ? resto : resto.slice(0, fin);
}

/** Las secciones `## ...` de un markdown, con su encabezado y su cuerpo. */
function seccionesMd(texto) {
  const partes = texto.split(/^## /m).slice(1);
  return partes.map((p) => {
    const corte = p.indexOf("\n");
    return { titulo: p.slice(0, corte === -1 ? undefined : corte), cuerpo: p };
  });
}

/** Que le falta al catalogo de adaptadores. Vacio significa que esta completo. */
function problemasDeAdaptadores(texto) {
  const problemas = [];
  const secciones = seccionesMd(texto);
  for (const nombre of PLATAFORMAS) {
    const s = secciones.find((x) => x.titulo.includes(`\`${nombre}\``));
    if (!s) {
      problemas.push(
        `no hay adaptador para \`${nombre}\`. Es uno de los cinco valores admitidos: sin su seccion, elegirlo ` +
          `es elegir a ciegas`,
      );
      continue;
    }
    for (const parte of ["CUBRE", "COSTO", "PLAN GRATUITO"]) {
      if (!s.cuerpo.includes(parte)) {
        problemas.push(`el adaptador \`${nombre}\` no declara ${parte}, que es una de las tres que todos declaran`);
      }
    }
    // LA FECHA ES LA MITAD DEL DATO, y es la mitad que caduca. La regla
    // `costo-declarado-con-techo` y el encabezado de este catalogo dicen lo
    // mismo: «una cifra sin fecha es una cifra que ya no se puede verificar».
    // Comprobar solo que la etiqueta PLAN GRATUITO exista deja pasar el caso que
    // de verdad hace dano —cifras que nadie puede fechar y por lo tanto nadie
    // puede refutar— asi que lo que se exige es la LINEA de la etiqueta: o dice
    // que no aplica, o dice donde y cuando se midio.
    const plan = declaracionDe(s.cuerpo, "PLAN GRATUITO");
    if (plan !== null && !/no aplica/i.test(plan) && !(/medido/i.test(plan) && FECHA.test(plan))) {
      problemas.push(
        `el adaptador \`${nombre}\` declara PLAN GRATUITO sin decir donde y cuando se midio ` +
          `(hace falta "medido en <pagina> el AAAA-MM-DD", o "no aplica"). Los planes gratuitos cambian sin ` +
          `aviso: una cifra sin fecha no se puede verificar, y una cifra que no se puede verificar no es un dato`,
      );
    }
    if (!/PENDIENTE-PLATAFORMA/.test(s.cuerpo)) {
      problemas.push(
        `el adaptador \`${nombre}\` no deja ningun PENDIENTE-PLATAFORMA. Ninguna plataforma llega sin nada que ` +
          `decidir: si de verdad no queda nada, hay que escribir que no queda`,
      );
    }
  }
  // Las cuatro capacidades son el contrato: si el catalogo deja de nombrarlas,
  // vuelve a ser una lista de productos.
  for (const capacidad of ["Cómputo de la API", "Base de datos", "Secretos", "Despliegue y verificación"]) {
    if (!texto.includes(capacidad)) {
      problemas.push(`el catalogo no nombra la capacidad «${capacidad}»: sin las cuatro no hay contrato que cumplir`);
    }
  }
  return problemas;
}

/** Que reparte HOY el andamio en cada raiz: null = el directorio no existe,
 *  0 = existe y no trae un solo `.tf` (la trampa del caso 8), N = trae N. */
function repartoDelAndamio(raiz = ANDAMIO) {
  const reparto = {};
  for (const d of ["infra", "infra-prod"]) {
    const abs = path.join(raiz, d);
    reparto[d] = fs.existsSync(abs) ? fs.readdirSync(abs).filter((n) => n.endsWith(".tf")).length : null;
  }
  return reparto;
}

/**
 * Que la plataforma DECLARADA y el arbol REPARTIDO digan lo mismo.
 *
 * De las cinco, `aws` es la unica que el andamio trae escrita como Terraform, asi
 * que la equivalencia es exacta y en las dos direcciones: declarar `aws` obliga a
 * repartir las dos raices con `.tf` adentro, y declarar cualquier otra obliga a no
 * repartir ninguna. No es una preferencia de estilo: el paso del CI decide con
 * `[ -d infra ]`, o sea que el disco MANDA sobre la clave. Una clave que dice
 * `ninguna` sobre un arbol con raices no es una inexactitud de documentacion, es
 * un repositorio que exige un binario de Terraform —en aviso en la linea 1, en
 * rojo desde v2— por infraestructura que su propio registro dice que no tiene.
 */
function problemasDeCoherencia(plataforma, reparto) {
  const problemas = [];
  const presentes = Object.keys(reparto).filter((d) => reparto[d] !== null);
  if (plataforma === "aws") {
    for (const d of Object.keys(reparto)) {
      if (reparto[d] === null) {
        problemas.push(
          `el andamio declara \`aws\` y no reparte \`${d}/\`: la plataforma declarada tiene que ser la que el ` +
            `repositorio trae escrita, o el registro miente sobre su propio arbol`,
        );
      } else if (reparto[d] === 0) {
        problemas.push(
          `\`${d}/\` llega sin un solo archivo .tf. Un directorio vacio de Terraform SIGUE contando como raiz ` +
            `para el paso del CI (mira si el directorio existe), asi que esto exige un binario para no verificar nada`,
        );
      }
    }
  } else if (presentes.length > 0) {
    problemas.push(
      `el andamio declara plataforma \`${plataforma}\` y reparte igual ${presentes.map((d) => `\`${d}/\``).join(" y ")}. ` +
        `El paso de Terraform del CI decide por el DISCO y no por esta clave, asi que el repositorio recien ` +
        `nacido va a exigir un binario de Terraform que su plataforma no usa —en aviso en la linea 1 y en rojo ` +
        `desde v2—. Arreglo: o el andamio deja de repartir esas raices, o la clave dice \`aws\``,
    );
  }
  return problemas;
}

/** La plataforma que el andamio declara. */
function plataformaDelAndamio() {
  return JSON.parse(fs.readFileSync(path.join(ANDAMIO, ".projects-valores.json"), "utf8")).plataforma;
}

test("plataforma · el andamio declara una plataforma admitida", () => {
  const valores = JSON.parse(fs.readFileSync(path.join(ANDAMIO, ".projects-valores.json"), "utf8"));
  assert.ok(
    Object.hasOwn(valores, "plataforma"),
    "plantilla/.projects-valores.json no declara `plataforma`: el repo que nazca del andamio no dice quien cubre las cuatro capacidades",
  );
  assert.ok(
    PLATAFORMAS.includes(valores.plataforma),
    `plantilla/.projects-valores.json declara plataforma "${valores.plataforma}", que no es una de ${PLATAFORMAS.join(", ")}`,
  );
});

test("plataforma · lo que el andamio DECLARA y lo que REPARTE dicen lo mismo", () => {
  const problemas = problemasDeCoherencia(plataformaDelAndamio(), repartoDelAndamio());
  assert.deepEqual(problemas, [], `\n${problemas.join("\n")}\n`);
});

test("plataforma · la comprobacion de coherencia MUERDE", () => {
  // Las tres formas en que las dos mitades se separan, cada una sobre el arbol
  // REAL o sobre un reparto fabricado. Sin esto, el verde de arriba podria ser
  // una funcion que devuelve [] pase lo que pase — que es exactamente lo que
  // paso la ronda anterior, con la clave diciendo `ninguna` sobre este mismo
  // arbol y el banco entero en verde.
  const real = repartoDelAndamio();
  const casos = [
    {
      nombre: "la clave dice `ninguna` sobre el arbol que hay hoy",
      correr: () => problemasDeCoherencia("ninguna", real),
      espera: /declara plataforma `ninguna` y reparte igual/,
    },
    {
      nombre: "la clave dice `aws` y no hay raices",
      correr: () => problemasDeCoherencia("aws", { infra: null, "infra-prod": null }),
      espera: /declara `aws` y no reparte `infra\/`/,
    },
    {
      nombre: "una raiz quedo sin un solo .tf",
      correr: () => problemasDeCoherencia("aws", { infra: 0, "infra-prod": 3 }),
      espera: /`infra\/` llega sin un solo archivo \.tf/,
    },
  ];
  for (const c of casos) {
    const problemas = c.correr();
    assert.ok(
      problemas.some((p) => c.espera.test(p)),
      `"${c.nombre}" no fue detectado: ${JSON.stringify(problemas)}`,
    );
  }
  // Y el control: el arbol de hoy, con su clave de hoy, no dispara nada.
  assert.deepEqual(problemasDeCoherencia(plataformaDelAndamio(), real), []);
});

test("plataforma · el paso corrido contra el reparto REAL hace lo que AGENTS.md promete", () => {
  // LOS CASOS 6, 7 Y 8 CORREN SOBRE ARBOLES INVENTADOS. Este corre el mismo
  // script extraido sobre las raices que plantilla/ tiene de verdad, sin binario,
  // que es el escenario mas duro, y con las DOS gravedades: la que el paso declara
  // hoy y la de la v2. No mide una preferencia: mide que la documentacion del repo
  // que nace y el comportamiento del CI de ese repo digan lo mismo.
  const presentes = Object.entries(repartoDelAndamio())
    .filter(([, n]) => n !== null)
    .map(([d]) => d);
  const hoy = correr({ raices: presentes, gravedad: gravedadDeclarada(), conBinario: false });
  const v2 = correr({ raices: presentes, gravedad: "error", conBinario: false });

  if (plataformaDelAndamio() === "aws") {
    // El repositorio nace CON infraestructura, asi que este paso es una compuerta
    // real: en la linea 1 avisa que no pudo verificar, y con la gravedad de la v2
    // detiene. Las dos salidas —agregar hashicorp/setup-terraform pinado por SHA,
    // o borrar las raices al elegir otra plataforma— estan escritas en AGENTS.md y
    // en infra/README.md; lo que no puede pasar es que el marco prometa verde y el
    // paso de rojo, ni que calle.
    assert.match(hoy.salida, /::(warning|error)::hay raices de Terraform/, "el andamio reparte raices: sin binario, el paso no puede callar");
    assert.equal(hoy.code, gravedadDeclarada() === "error" ? 1 : 0, "el codigo de salida no coincide con la gravedad declarada");
    assert.equal(v2.code, 1, "el andamio reparte raices de Terraform: con la gravedad de la v2 este paso TIENE que detener");
    assert.match(v2.salida, /::error::hay raices de Terraform/);
  } else {
    for (const r of [hoy, v2]) {
      assert.equal(r.code, 0, "el andamio no reparte raices: este paso no puede ponerse rojo en ninguna gravedad");
      assert.match(r.salida, /::notice::no hay raices de Terraform/);
    }
  }
});

test("plataforma · el catalogo de adaptadores contesta por las cinco", () => {
  const texto = fs.readFileSync(ADAPTADORES, "utf8");
  assert.deepEqual(problemasDeAdaptadores(texto), [], `\n${problemasDeAdaptadores(texto).join("\n")}\n`);
});

test("plataforma · la comprobacion del catalogo MUERDE", () => {
  const texto = fs.readFileSync(ADAPTADORES, "utf8");
  const mutaciones = [
    {
      nombre: "se borra el adaptador de `ninguna`",
      mutar: (t) => t.replace(/^## `ninguna`[\s\S]*?(?=^## )/m, ""),
      espera: /no hay adaptador para `ninguna`/,
    },
    {
      nombre: "un adaptador se queda sin su plan gratuito",
      mutar: (t) => t.replace("**PLAN GRATUITO** _(medido en supabase.com/pricing", "**Costes** _(medido en supabase.com/pricing"),
      espera: /`supabase` no declara PLAN GRATUITO/,
    },
    {
      // LA MUTACION QUE FALTABA. Renombrar la etiqueta entera es la forma facil
      // y no es la que pasa: lo que pasa de verdad es que alguien copia una
      // cifra nueva y se come la fecha, y entonces el catalogo queda afirmando
      // un limite que ya nadie puede contrastar contra nada.
      nombre: "a un plan gratuito se le cae la fecha de medicion",
      mutar: (x) => x.replace(" _(medido en supabase.com/pricing el 2026-08-24)_", ""),
      espera: /`supabase` declara PLAN GRATUITO sin decir donde y cuando se midio/,
    },
    {
      nombre: "el catalogo deja de nombrar una de las cuatro capacidades",
      mutar: (t) => t.replaceAll("Base de datos", "Almacenamiento"),
      espera: /no nombra la capacidad «Base de datos»/,
    },
  ];
  for (const m of mutaciones) {
    const mutado = m.mutar(texto);
    assert.notEqual(mutado, texto, `la mutacion "${m.nombre}" no cambio nada: su ancla se movio y esta prueba pasaba en vacio`);
    const problemas = problemasDeAdaptadores(mutado);
    assert.ok(
      problemas.some((p) => m.espera.test(p)),
      `la mutacion "${m.nombre}" no fue detectada: ${JSON.stringify(problemas)}`,
    );
  }
});
