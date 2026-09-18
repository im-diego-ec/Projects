// BANCO DE `herramientas/actionlint-local.mjs` Y DEL HOOK QUE LO USA.
//
// QUE DEFECTO CIERRA. El paso de actionlint del job `higiene` de marco-ci.yml
// rechazaba con «Reproducilo local instalando actionlint X» y en este repositorio no
// habia nada que lo permitiera. El hook `pre-push` corria el `actionlint` que
// hubiera en el PATH —en cualquier version— y, peor, sin mirar si habia
// shellcheck: medido el 2026-09-18 en la maquina del builder, un workflow con
// `run: echo '$HOME no se expande'` da el SC2016 con shellcheck y **sale 0 sin
// decir nada** cuando shellcheck no esta (`-shellcheck=` o un PATH sin el). O sea
// que el verde local era mas debil que el del CI justo en los bloques `run:`, que
// es donde vive casi todo el marco.
//
// ORIGEN: Rigel 2.7.0, commit 218e5f6 (issue #439, 2026-09-13): dos viajes de CI
// en una sesion, el segundo por un SC2016 de una linea.
//
// QUE PRUEBA, Y QUE NO. Lo que se puede probar sin red: que la version se lea del
// MISMO input que usa el CI y reviente si no esta; que el asset corresponda a la
// maquina; que un asset sin checksum no se de por bueno; que sin shellcheck el
// veredicto no se llame «valido»; que en Windows no se intente la integracion que
// se cuelga; y que el hook bloquee con hallazgos y avise —sin bloquear— cuando la
// herramienta no pudo correr. Bajar el binario y correrlo de verdad es medir a
// GitHub y a actionlint, no a esta herramienta: eso lo hace el CI del marco.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import {
  SALIDA,
  WORKFLOW,
  argumentosDeShellcheck,
  assetDe,
  buscarEnPath,
  sha256,
  shaEsperado,
  veredicto,
  versionPinada,
} from "../../herramientas/actionlint-local.mjs";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const HOOK = path.join(RAIZ, "herramientas", "hooks", "pre-push");

test("la version sale del MISMO input que usa el CI, no de un numero escrito aca", () => {
  const texto = fs.readFileSync(WORKFLOW, "utf8");
  const v = versionPinada(texto);
  assert.match(v, /^\d+\.\d+\.\d+$/);
  assert.ok(texto.includes(`default: "${v}"`), `la version ${v} no aparece como default en ${path.relative(RAIZ, WORKFLOW)}`);
  // Y la herramienta no trae un numero propio escondido: si lo trajera, seria un
  // segundo juez que puede discrepar del CI.
  const fuente = fs.readFileSync(path.join(RAIZ, "herramientas", "actionlint-local.mjs"), "utf8");
  assert.ok(!fuente.includes(`"${v}"`), `la herramienta escribe la version ${v} a mano en vez de leerla`);
});

test("sin el input, REVIENTA en vez de elegir una version razonable", () => {
  assert.throws(() => versionPinada("on: [push]\njobs: {}\n"), /no encontre el input `version_actionlint`/);
});

test("con el input pero sin default, tambien revienta", () => {
  assert.throws(
    () => versionPinada(["      version_actionlint:", "        description: x", "      otro_input:"].join("\n")),
    /no declara un `default:`/,
  );
});

test("el default se lee del input correcto, no del siguiente", () => {
  const v = versionPinada(
    ["      version_actionlint:", "        description: la version", '        default: "1.2.3"', "      version_gitleaks:", '        default: "9.9.9"'].join("\n"),
  );
  assert.equal(v, "1.2.3");
});

test("el asset corresponde a la maquina, y una plataforma que el release no publica NO se adivina", () => {
  assert.deepEqual(assetDe("1.7.12", "linux", "x64"), { nombre: "actionlint_1.7.12_linux_amd64.tar.gz", binario: "actionlint" });
  assert.deepEqual(assetDe("1.7.12", "win32", "x64"), { nombre: "actionlint_1.7.12_windows_amd64.zip", binario: "actionlint.exe" });
  assert.deepEqual(assetDe("1.7.12", "darwin", "arm64"), { nombre: "actionlint_1.7.12_darwin_arm64.tar.gz", binario: "actionlint" });
  assert.throws(() => assetDe("1.7.12", "aix", "ppc64"), /no se que asset/);
});

test("un asset que NO figura en los checksums es error, no un verde por omision", () => {
  const checksums = ["a".repeat(64) + "  otro-archivo.tar.gz", "b".repeat(64) + "  y-otro.zip"].join("\n");
  assert.throws(() => shaEsperado(checksums, "actionlint_1.7.12_linux_amd64.tar.gz"), /no figura en el checksums/);
  const sha = "c".repeat(64);
  assert.equal(shaEsperado(`${sha}  x.tar.gz`, "x.tar.gz"), sha);
  assert.equal(shaEsperado(`${sha} *x.tar.gz`, "x.tar.gz"), sha);
});

test("sha256 es el de verdad", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "actionlint-sha-"));
  try {
    const f = path.join(dir, "abc");
    fs.writeFileSync(f, "abc");
    assert.equal(sha256(f), "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("shellcheck: con el del PATH se le pasa EXPLICITO; sin el, se apaga explicito y se avisa", () => {
  const con = argumentosDeShellcheck({ plataforma: "linux", rutaShellcheck: "/usr/bin/shellcheck" });
  assert.deepEqual(con.args, ["-shellcheck=/usr/bin/shellcheck"]);
  assert.equal(con.conShellcheck, true);
  assert.equal(con.aviso, null);

  const sin = argumentosDeShellcheck({ plataforma: "darwin", rutaShellcheck: null });
  assert.deepEqual(sin.args, ["-shellcheck="]);
  assert.equal(sin.conShellcheck, false);
  assert.match(sin.aviso, /^::warning::SIN SHELLCHECK/);
  assert.match(sin.aviso, /bloques `run:`/);
});

test("Windows: la integracion que se cuelga se APAGA aunque shellcheck este en el PATH, y lo dice", () => {
  // Rigel no lo intentaba en Windows pero tampoco lo apagaba: con shellcheck en el
  // PATH, actionlint lo encuentra solo y se cuelga igual. Por eso aca va
  // `-shellcheck=` explicito.
  const win = argumentosDeShellcheck({ plataforma: "win32", rutaShellcheck: "C:\\tools\\shellcheck.exe" });
  assert.deepEqual(win.args, ["-shellcheck="]);
  assert.equal(win.conShellcheck, false);
  assert.match(win.aviso, /^::warning::en Windows/);
  const forzado = argumentosDeShellcheck({ plataforma: "win32", rutaShellcheck: "C:\\tools\\shellcheck.exe", forzado: true });
  assert.deepEqual(forzado.args, ["-shellcheck=C:\\tools\\shellcheck.exe"]);
});

test("el veredicto: nunca se llama «valido» sin shellcheck, y los codigos de actionlint se traducen", () => {
  assert.equal(SALIDA.verde, 0);
  assert.equal(SALIDA.hallazgos, 1);
  assert.equal(SALIDA.noSeCorrio, 2);

  const completo = veredicto({ status: 0, conShellcheck: true, version: "1.7.12" });
  assert.equal(completo.codigo, SALIDA.verde);
  assert.match(completo.linea, /definiciones de pipeline validas/);

  const debil = veredicto({ status: 0, conShellcheck: false, version: "1.7.12" });
  assert.equal(debil.codigo, SALIDA.verde);
  assert.doesNotMatch(debil.linea, /validas/, "un verde sin shellcheck se llamo valido");
  assert.match(debil.linea, /NO es el veredicto del CI/);

  assert.equal(veredicto({ status: 1, conShellcheck: true, version: "1.7.12" }).codigo, SALIDA.hallazgos);
  // 2 y 3 son de actionlint: argumento invalido y error fatal. No son hallazgos
  // del workflow, y confundirlos haria que el hook bloquee por un defecto de la
  // herramienta.
  assert.equal(veredicto({ status: 2, conShellcheck: true, version: "1.7.12" }).codigo, SALIDA.noSeCorrio);
  assert.equal(veredicto({ status: 3, conShellcheck: true, version: "1.7.12" }).codigo, SALIDA.noSeCorrio);
  const colgado = veredicto({ status: null, error: "ETIMEDOUT", conShellcheck: true, version: "1.7.12" });
  assert.equal(colgado.codigo, SALIDA.noSeCorrio);
  assert.match(colgado.linea, /^::error::/);
});

test("buscarEnPath encuentra el ejecutable y no inventa uno", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "actionlint-path-"));
  try {
    const nombre = process.platform === "win32" ? "shellcheck.exe" : "shellcheck";
    fs.writeFileSync(path.join(dir, nombre), "");
    if (process.platform !== "win32") fs.chmodSync(path.join(dir, nombre), 0o755);
    assert.equal(buscarEnPath("shellcheck", { PATH: dir }), path.join(dir, nombre));
    assert.equal(buscarEnPath("shellcheck", { PATH: path.join(dir, "no-existe") }), null);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("el rojo del CI manda a la herramienta que existe, no a instalar a mano", () => {
  // Se lee la LINEA del mensaje y no el paso por su nombre, a proposito: este caso
  // mira el texto que ve quien recibe el rojo, no ejercita el paso —que baja
  // actionlint y sin red no se puede correr—. Citarlo por nombre lo daria por
  // cubierto en pruebas/marco-ci/cobertura-de-los-pasos.test.mjs sin serlo.
  const texto = fs.readFileSync(WORKFLOW, "utf8");
  const linea = texto.split("\n").find((l) => /::error::las definiciones de pipeline no pasan la validacion/.test(l));
  assert.ok(linea, "no encontre el mensaje de rojo del paso de actionlint en marco-ci.yml");
  assert.match(linea, /herramientas\/actionlint-local\.mjs/, "el rojo sigue mandando a instalar actionlint sin decir con que");
  assert.ok(fs.existsSync(path.join(RAIZ, "herramientas", "actionlint-local.mjs")), "el rojo manda a una herramienta que no existe");
});

// EL HOOK, corrido de verdad con un `node` de mentira delante del PATH.
//
// ROJO MEDIDO antes del cambio: el hook llamaba al `actionlint` del PATH. Con un
// `actionlint` falso que sale 0 y la herramienta pineada diciendo que hay
// hallazgos, el hook salia 0 y dejaba empujar.
function correrHook({ rcHerramienta, conActionlintFalso = false }) {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), "pre-push-"));
  const bin = path.join(base, "bin");
  fs.mkdirSync(bin);
  fs.mkdirSync(path.join(base, "pruebas"));
  fs.writeFileSync(path.join(base, "pruebas", "uno.test.mjs"), "");
  fs.writeFileSync(
    path.join(bin, "node"),
    ["#!/bin/sh", 'case "$*" in', `  *actionlint-local.mjs*) exit ${rcHerramienta} ;;`, "  *) exit 0 ;;", "esac", ""].join("\n"),
    { mode: 0o755 },
  );
  if (conActionlintFalso) fs.writeFileSync(path.join(bin, "actionlint"), "#!/bin/sh\nexit 0\n", { mode: 0o755 });
  const r = spawnSync("sh", [HOOK], {
    cwd: base,
    encoding: "utf8",
    env: { ...process.env, PATH: `${bin}${path.delimiter}${process.env.PATH}` },
  });
  fs.rmSync(base, { recursive: true, force: true });
  return { codigo: r.status, salida: `${r.stdout ?? ""}${r.stderr ?? ""}` };
}

const SIN_SH = process.platform === "win32" ? "el hook es sh: en Windows lo corre Git Bash, no este banco" : false;

test("hook: hallazgos de la herramienta pineada BLOQUEAN, aunque haya un actionlint del PATH que diga que no", { skip: SIN_SH }, () => {
  const r = correrHook({ rcHerramienta: SALIDA.hallazgos, conActionlintFalso: true });
  assert.equal(r.codigo, 1, r.salida);
  assert.match(r.salida, /actionlint/);
});

test("hook: si la herramienta no pudo correr, AVISA y deja empujar — el CI la corre igual", { skip: SIN_SH }, () => {
  const r = correrHook({ rcHerramienta: SALIDA.noSeCorrio });
  assert.equal(r.codigo, 0, r.salida);
  assert.match(r.salida, /AVISO/);
  assert.match(r.salida, /NO se corrio/);
});

test("hook: verde de la herramienta -> OK", { skip: SIN_SH }, () => {
  const r = correrHook({ rcHerramienta: SALIDA.verde });
  assert.equal(r.codigo, 0, r.salida);
  assert.match(r.salida, /pre-push: OK/);
});
