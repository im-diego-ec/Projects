// BANCO DEL PASO QUE VERIFICA LAS RAICES DE TERRAFORM DEL ANDAMIO.
//
// POR QUE EXISTE. El paso vive INLINE en el `run:` de
// plantilla/.github/workflows/ci.yml, y hasta este cambio nada lo habia
// ejecutado nunca: era una compuerta cuyo veredicto dependia de una comparacion
// de fechas contra el reloj, escrita a mano y nunca corrida. Un paso asi puede
// estar roto en la direccion mas cara —salir 0 cuando debia salir 1— durante
// meses, porque en modo aviso el resultado observable de "funciona" y el de "no
// hace nada" son el mismo.
//
// EL BANCO NO COPIA EL SCRIPT. Lo EXTRAE del YAML con el mismo extractor que usan
// los otros bancos de pasos inline y lo corre contra arboles fabricados, con un
// `terraform` falso cuyos codigos de salida controla el caso. Si el paso se
// renombra o pierde su `run:`, el extractor tira y esto se pone rojo en vez de
// dejar de probar en silencio — que es tambien lo que impide borrar el paso sin
// que nada lo note.
//
// LO QUE VERIFICA, y son los cinco caminos que el paso tiene:
//   1. sin raices de Terraform, ::notice:: y verde — no hay nada que verificar;
//   2. con raices y sin binario DENTRO de la ventana, ::warning:: y verde;
//   3. con raices y sin binario con la VENTANA VENCIDA, ::error:: y ROJO;
//   4. fmt o validate en rojo dentro de la ventana, ::warning:: y verde;
//   5. fmt o validate en rojo con la ventana vencida, ::error:: y ROJO.
//
// EL CAMINO 3 ES EL QUE HABIA QUE ESCRIBIR Y MEDIR. Antes, el binario ausente
// salia 0 con un aviso PARA SIEMPRE, sin importar la fecha: bastaba con que la
// imagen del runner dejara de traer terraform para que el paso pasara en verde
// sin haber verificado nada, indefinidamente. Los dos README de infra prometen
// que despues de la ventana esto se pone rojo solo; este banco es lo que mide
// que la promesa sea cierta tambien cuando falta el binario.
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
import { scriptDelPaso } from "../marco-ci/extraer.mjs";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const CI = path.join(RAIZ, "plantilla", ".github", "workflows", "ci.yml");
const PASO = "Formato y validez de las raices de Terraform";

const script = scriptDelPaso(PASO, CI);
const yaml = fs.readFileSync(CI, "utf8");

// PATH sin el bin falso: es el escenario "el runner no trae terraform". Se
// declara aca y se comprueba abajo, porque si la maquina que corre el banco
// tuviera terraform en /usr/bin el caso 3 probaria otra cosa.
const PATH_PELADO = "/usr/bin:/bin";

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

/**
 * Corre el script del paso sobre un arbol fabricado.
 *
 * `raices` son los directorios de Terraform que existen; `ventana` es el valor
 * de VENTANA_TERRAFORM, que en el workflow llega por `env:`. `conBinario` en
 * false deja el PATH sin el falso, que es el escenario del runner pelado.
 */
function correr({ raices = [], ventana = "2999-12-31", conBinario = true, rc = {} } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "projects-tf-"));
  for (const r of raices) {
    fs.mkdirSync(path.join(dir, r), { recursive: true });
    fs.writeFileSync(path.join(dir, r, "main.tf"), "# fixture\n");
  }
  const bin = binFalso(dir, rc);
  const res = spawnSync("bash", ["-c", script], {
    cwd: dir,
    encoding: "utf8",
    env: {
      PATH: conBinario ? `${bin}:${PATH_PELADO}` : PATH_PELADO,
      VENTANA_TERRAFORM: ventana,
      HOME: dir,
    },
  });
  fs.rmSync(dir, { recursive: true, force: true });
  return { code: res.status, salida: `${res.stdout}${res.stderr}` };
}

// ---------------------------------------------------------------------------
// 0 · QUE EL BANCO ESTE MIDIENDO ALGO
// ---------------------------------------------------------------------------

test("terraform · el extractor encontro el paso y el script no salio vacio", () => {
  assert.ok(script.length > 400, `el script salio de ${script.length} caracteres: el extractor fallo`);
  assert.match(script, /terraform fmt -check/, "el script tiene que correr fmt -check");
  assert.match(script, /-backend=false/, "el init tiene que ser inerte");
  assert.match(script, /VENTANA_TERRAFORM/, "la gravedad tiene que derivarse de la ventana");
});

test("terraform · el paso vive dentro del job build_test y no suelto", () => {
  const deBuildTest = yaml.indexOf("\n  build_test:");
  const delPaso = yaml.indexOf(`- name: ${PASO}`);
  assert.ok(deBuildTest > 0, "no existe el job build_test en el ci.yml del andamio");
  assert.ok(delPaso > deBuildTest, "el paso de Terraform quedo fuera del job build_test");
  const siguienteJob = yaml.slice(deBuildTest + 1).search(/\n {2}[a-z_]+:\n/);
  assert.ok(delPaso - deBuildTest < siguienteJob, "el paso de Terraform cayo en otro job");
});

test("terraform · la ventana es UNA fecha ISO y vive solo en el env del paso", () => {
  const marca = yaml.match(/VENTANA_TERRAFORM: "(\d{4}-\d{2}-\d{2})"/g) || [];
  assert.equal(marca.length, 1, `la ventana esta escrita ${marca.length} veces: una sola declaracion o divergen`);
});

test("terraform · el escenario del runner pelado es medible en esta maquina", () => {
  const res = spawnSync("bash", ["-c", "command -v terraform"], {
    encoding: "utf8",
    env: { PATH: PATH_PELADO },
  });
  assert.notEqual(res.status, 0, `hay un terraform en ${PATH_PELADO}: el caso del runner pelado no se puede medir aca`);
});

// ---------------------------------------------------------------------------
// LOS CINCO CAMINOS
// ---------------------------------------------------------------------------

test("terraform · 1 · sin raices no verifica nada, lo dice y sale verde", () => {
  const { code, salida } = correr({ raices: [] });
  assert.equal(code, 0);
  assert.match(salida, /::notice::no hay raices de Terraform/);
  assert.doesNotMatch(salida, /::error::/);
});

test("terraform · 2 · sin binario DENTRO de la ventana avisa y sale verde", () => {
  const { code, salida } = correr({ raices: ["infra", "infra-prod"], ventana: "2999-12-31", conBinario: false });
  assert.equal(code, 0);
  assert.match(salida, /::warning::hay raices de Terraform \(infra infra-prod\) y este runner no trae el binario/);
});

test("terraform · 3 · sin binario con la VENTANA VENCIDA es ROJO — el fail-open que se cerro", () => {
  const { code, salida } = correr({ raices: ["infra", "infra-prod"], ventana: "2000-01-01", conBinario: false });
  assert.match(salida, /::error::hay raices de Terraform \(infra infra-prod\) y este runner no trae el binario/);
  assert.equal(code, 1, "vencida la ventana, no poder verificar tiene que detener el CI y no avisar");
});

test("terraform · 4 · fmt y validate en rojo DENTRO de la ventana avisan y salen verde", () => {
  const fmt = correr({ raices: ["infra"], ventana: "2999-12-31", rc: { fmt: 3 } });
  assert.equal(fmt.code, 0);
  assert.match(fmt.salida, /::warning::hay archivos de Terraform sin formatear/);

  const val = correr({ raices: ["infra"], ventana: "2999-12-31", rc: { validate: 1 } });
  assert.equal(val.code, 0);
  assert.match(val.salida, /::warning::terraform validate fallo en 'infra'/);
});

test("terraform · 5 · fmt y validate en rojo con la ventana vencida son ROJO", () => {
  const fmt = correr({ raices: ["infra"], ventana: "2000-01-01", rc: { fmt: 3 } });
  assert.match(fmt.salida, /::error::hay archivos de Terraform sin formatear/);
  assert.equal(fmt.code, 1);

  const val = correr({ raices: ["infra", "infra-prod"], ventana: "2000-01-01", rc: { validate: 1 } });
  assert.match(val.salida, /::error::terraform validate fallo en 'infra'/);
  assert.match(val.salida, /::error::terraform validate fallo en 'infra-prod'/, "la segunda raiz se sigue mirando");
  assert.equal(val.code, 1);
});

test("terraform · con binario y todo en orden, verde y sin un solo aviso", () => {
  const { code, salida } = correr({ raices: ["infra", "infra-prod"], ventana: "2000-01-01" });
  assert.equal(code, 0);
  assert.doesNotMatch(salida, /::error::/);
  assert.doesNotMatch(salida, /::warning::/);
});

// ---------------------------------------------------------------------------
// QUE LA DERIVACION POR RELOJ MUERDA
// ---------------------------------------------------------------------------

test("terraform · la derivacion por reloj MUERDE: clavada en warning, el rojo desaparece", () => {
  // Se muta el script EXTRAIDO, nunca el archivo del repo: se le saca la rama que
  // deriva "error" del reloj, que es como se ve un arreglo que "simplifica" la
  // compuerta hasta dejarla en aviso perpetuo. Los tres caminos rojos tienen que
  // ponerse verdes; si alguno siguiera rojo, es que no dependia de la ventana.
  const clavado = script.replace(/GRAVEDAD="error"/g, 'GRAVEDAD="warning"');
  assert.notEqual(clavado, script, "la mutacion no encontro la rama de error");

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "projects-tf-mut-"));
  fs.mkdirSync(path.join(dir, "infra"), { recursive: true });
  const bin = binFalso(dir, { fmt: 3 });
  const conMutacion = spawnSync("bash", ["-c", clavado], {
    cwd: dir,
    encoding: "utf8",
    env: { PATH: `${bin}:${PATH_PELADO}`, VENTANA_TERRAFORM: "2000-01-01", HOME: dir },
  });
  assert.equal(conMutacion.status, 0, "con la gravedad clavada en warning el paso tiene que dejar de detener");

  const sinMutacion = spawnSync("bash", ["-c", script], {
    cwd: dir,
    encoding: "utf8",
    env: { PATH: `${bin}:${PATH_PELADO}`, VENTANA_TERRAFORM: "2000-01-01", HOME: dir },
  });
  assert.equal(sinMutacion.status, 1, "sin la mutacion, el mismo arbol tiene que salir rojo");
  fs.rmSync(dir, { recursive: true, force: true });
});
