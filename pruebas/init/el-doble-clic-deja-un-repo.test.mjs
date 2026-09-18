import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { instanciar, lineasDeVistaPrevia } from "../../herramientas/projects-init.mjs";
import {
  dejarElRepositorio,
  ejecutarDeVerdad,
  medirRepositorio,
  lineasDelPrimerEnvio,
  visibilidadDeLasRespuestas,
  MENSAJE_DEL_PRIMER_GUARDADO,
  PREGUNTA_DE_CONFIRMACION,
  LINEA_DE_SUBIDO,
} from "../../herramientas/projects-repositorio.mjs";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const HERRAMIENTA = path.join(RAIZ, "herramientas/projects-init.mjs");
const MODULO = path.join(RAIZ, "herramientas/projects-repositorio.mjs");
const ANDAMIO = path.join(RAIZ, "plantilla");

// ---------------------------------------------------------------------------
// EL DOBLE CLIC DEJABA UNA CARPETA, NO UN REPOSITORIO.
//
// QUE DEFECTO CIERRA, medido sobre el arbol del 2026-09-17. Los tres lanzadores
// (`arrancar.sh`, `arrancar.command`, `arrancar.cmd`) hacian `mkdir` e invocaban
// `projects-init.mjs` sobre `../<PROYECTO>`, y el UNICO `init` que corria en toda
// la cadena era el de OpenSpec: ni `git init`, ni rama, ni remoto. Despues la
// herramienta imprimia «el bootstrap va a main por PUSH DIRECTO» sobre una
// carpeta en la que no habia ni `main` ni a donde empujar, y docs/04 mandaba a
// hacer `gh repo create --clone` sobre esa misma carpeta, ya llena.
//
// POR QUE GIT DE VERDAD Y UN `gh` DE MENTIRA. Lo que se promete es un estado del
// disco --un `.git`, una rama `main`, un primer guardado, un `origin` con `main`
// subido-- y eso se le PREGUNTA A GIT, no se deduce de lo que la herramienta dice
// de si misma. `gh` en cambio crea cosas en GitHub: el de este banco crea un
// repositorio "remoto" que es un directorio desnudo en el temporal, y empuja ahi
// de verdad, asi que la comprobacion de "quedo subido" mira refs reales.
//
// Y NINGUN `gh` DE VERDAD PUEDE CORRER ACA. Cada caso le pasa a la herramienta
// un entorno con GH_CONFIG_DIR vacio y sin GH_TOKEN/GITHUB_TOKEN: si por un
// descuido llegara a invocarse el real, no tendria credenciales para crear nada.
// ---------------------------------------------------------------------------

const VALORES = {
  PROYECTO: "people-agenda",
  ORG: "Ejemplo-Org",
  PAQUETE_API: "api",
  PAQUETE_WEB: "web",
  PAQUETE_E2E: "e2e",
  PAQUETE_SITIO: "sitio",
  ORG_MARCO: "im-diego-ec",
  GENERAR_CLIENTE_DATOS: "prisma generate",
  EQUIPO_BUILDERS: "builders",
  EQUIPO_PO: "po",
  BUILDER_1: "builder-uno",
  BUILDER_2: "builder-dos",
  PO: "el-po",
  CUENTA_DEV: "111111111111",
  CUENTA_PROD: "222222222222",
  REGION: "us-east-1",
  PERFIL_DEV: "perfil-dev",
  PERFIL_PROD: "perfil-prod",
  PREFIJO_RECURSOS: "agenda",
  DOMINIO_DEV: "agenda-dev.ejemplo.com",
  DOMINIO_PROD: "agenda.ejemplo.com",
  CANAL_ALERTAS: "#alertas-prod",
  ID_MCP_SLACK: "id-de-slack",
};

const tmp = (nombre) => fs.mkdtempSync(path.join(os.tmpdir(), `${nombre}-`));

/** Un proyecto recien armado por el andamio, SIN git: es lo que el lanzador
 *  dejaba antes de este cambio. Con el andamio real para que su .gitignore sea
 *  el que decide que entra al primer guardado. */
function proyectoArmado(nombre = "proyecto") {
  const destino = path.join(tmp(`repo ${nombre}`), VALORES.PROYECTO);
  fs.mkdirSync(destino);
  instanciar({ raizAndamio: ANDAMIO, destino, valores: VALORES });
  return destino;
}

/** El entorno de cada caso: identidad de git controlada y ningun gh real con
 *  credenciales. GIT_CONFIG_GLOBAL apunta a un archivo propio, asi la
 *  configuracion de la maquina --que puede firmar commits o no tener identidad--
 *  no decide el resultado del banco. */
function entornoDePrueba({ identidad = true, antesDelPath = null } = {}) {
  const dir = tmp("entorno");
  const gitconfig = path.join(dir, "gitconfig");
  fs.writeFileSync(
    gitconfig,
    (identidad ? "[user]\n\tname = Persona de Prueba\n\temail = persona@ejemplo.com\n" : "") +
      "[commit]\n\tgpgsign = false\n[init]\n\tdefaultBranch = otra-rama\n",
  );
  const entorno = { ...process.env };
  for (const k of ["GH_TOKEN", "GITHUB_TOKEN", "GH_ENTERPRISE_TOKEN", "GIT_AUTHOR_NAME", "GIT_AUTHOR_EMAIL", "GIT_COMMITTER_NAME", "GIT_COMMITTER_EMAIL", "EMAIL"]) {
    delete entorno[k];
  }
  entorno.GIT_CONFIG_GLOBAL = gitconfig;
  entorno.GIT_CONFIG_NOSYSTEM = "1";
  entorno.GH_CONFIG_DIR = path.join(dir, "gh-vacio");
  fs.mkdirSync(entorno.GH_CONFIG_DIR);
  if (antesDelPath) entorno.PATH = `${antesDelPath}${path.delimiter}${process.env.PATH}`;
  return entorno;
}

/** Lo que git dice del destino, preguntado con git y no con la herramienta. */
function git(destino, entorno, ...args) {
  try {
    return execFileSync("git", args, { cwd: destino, env: entorno, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return null;
  }
}

function estadoSegunGit(destino, entorno) {
  const tieneGit = fs.existsSync(path.join(destino, ".git"));
  return {
    repo: tieneGit,
    rama: tieneGit ? git(destino, entorno, "symbolic-ref", "--short", "HEAD") : null,
    commit: tieneGit ? git(destino, entorno, "rev-parse", "--verify", "--quiet", "HEAD") : null,
    origin: tieneGit ? git(destino, entorno, "remote", "get-url", "origin") : null,
  };
}

/** Un `gh` de mentira, en proceso, para los casos que corren en los tres
 *  sistemas. Delega en git de verdad lo que el real haria con git: crea un
 *  repositorio desnudo que hace de "GitHub", agrega el `origin` y empuja.
 *  `modo` decide la historia: sin-sesion, existe, miente (sale 0 sin hacer nada). */
function ghInyectado({ modo = "normal", remotos = tmp("remotos") } = {}) {
  const llamadas = [];
  const ejecutar = (programa, args, opciones = {}) => {
    if (programa !== "gh") return ejecutarDeVerdad(programa, args, opciones);
    llamadas.push(args.join(" "));
    if (modo === "sin-gh") return { presente: false, codigo: null, stdout: "", stderr: "" };
    const [a, b] = args;
    if (a === "--version") return { presente: true, codigo: 0, stdout: "gh version 2.99.0 (de mentira)\n", stderr: "" };
    if (a === "api" && b === "user") {
      return modo === "sin-sesion"
        ? { presente: true, codigo: 4, stdout: "", stderr: "To get started with GitHub CLI, please run:  gh auth login\n" }
        : { presente: true, codigo: 0, stdout: "cuenta-de-prueba\n", stderr: "" };
    }
    if (a === "auth") {
      return modo === "sin-sesion"
        ? { presente: true, codigo: 1, stdout: "", stderr: "You are not logged into any GitHub hosts. To log in, run: gh auth login\n" }
        : { presente: true, codigo: 0, stdout: "", stderr: "  ✓ Logged in to github.com account cuenta-de-prueba (keyring)\n" };
    }
    if (a === "repo" && b === "view") {
      return modo === "existe"
        ? { presente: true, codigo: 0, stdout: '{"name":"people-agenda"}\n', stderr: "" }
        : { presente: true, codigo: 1, stdout: "", stderr: `GraphQL: Could not resolve to a Repository with the name '${args[2]}'. (repository)\n` };
    }
    if (a === "repo" && b === "create") {
      if (modo === "miente") return { presente: true, codigo: 0, stdout: "", stderr: "" };
      const desnudo = path.join(remotos, `${args[2].replace("/", "__")}.git`);
      execFileSync("git", ["init", "--quiet", "--bare", desnudo], { env: opciones.entorno });
      execFileSync("git", ["remote", "add", "origin", desnudo], { cwd: opciones.cwd, env: opciones.entorno });
      execFileSync("git", ["push", "--quiet", "-u", "origin", "HEAD"], { cwd: opciones.cwd, env: opciones.entorno, stdio: "ignore" });
      return { presente: true, codigo: 0, stdout: `https://github.com/${args[2]}\n`, stderr: "" };
    }
    return { presente: true, codigo: 1, stdout: "", stderr: `gh de mentira: no se que hacer con ${args.join(" ")}\n` };
  };
  return { ejecutar, llamadas, remotos };
}

/** Junta lo que la herramienta dice y lo que avisa, para poder mirar las dos cosas. */
function consola() {
  const dicho = [];
  const avisado = [];
  // `completo` y no `todo`: pruebas/banco/integridad.test.mjs lee `x.todo(` como
  // un caso apagado en el cuerpo, y tiene razon en desconfiar de esa forma.
  return { decir: (l) => dicho.push(l), avisar: (l) => avisado.push(l), dicho, avisado, completo: () => [...dicho, ...avisado].join("\n") };
}

const responde = (...respuestas) => async () => respuestas.shift() ?? "";

// ═══════════════════ EL ROJO: lo que el lanzador dejaba antes ═══════════════════

/** La CLI tal como la invoca el lanzador en su Paso 2, sin red y sin OpenSpec. */
function correrInit(destino, entorno, ...extra) {
  const valores = path.join(path.dirname(destino), "valores.json");
  fs.writeFileSync(valores, JSON.stringify(VALORES));
  const r = spawnSync(
    process.execPath,
    [HERRAMIENTA, "--sin-herramientas", "--sin-arranque", "--valores", valores, "--destino", destino, ...extra],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], env: entorno },
  );
  return { codigo: r.status, salida: `${r.stdout ?? ""}${r.stderr ?? ""}`, stdout: r.stdout ?? "" };
}

test("MUERDE: la invocacion de antes (sin --repositorio) deja una carpeta sin .git, y este banco lo ve", () => {
  // Es el caso ROJO del defecto, dejado en el banco para siempre: si la
  // comprobacion de abajo no distinguiera esta carpeta de un repositorio, todos
  // los verdes de este archivo serian decorado.
  const entorno = entornoDePrueba();
  const destino = path.join(tmp("antes"), VALORES.PROYECTO);
  fs.mkdirSync(destino);
  const r = correrInit(destino, entorno);
  assert.equal(r.codigo, 0, r.salida.slice(-800));
  assert.equal(estadoSegunGit(destino, entorno).repo, false, "sin --repositorio aparecio un .git: el caso ya no reproduce el defecto");
  // Y la salida ya no miente sobre eso: no manda a un push directo que no puede existir.
  assert.match(r.stdout, /NO es un repositorio git/, `la lista de lo que sigue no dice que la carpeta no es un repositorio:\n${r.stdout.slice(-2500)}`);
  assert.match(r.stdout, /git init -b main/, "no dice con que comando se arregla");
});

test("con --repositorio la carpeta sale repositorio, con rama main aunque git prefiera otra", () => {
  const entorno = entornoDePrueba();
  const destino = path.join(tmp("con-flag"), VALORES.PROYECTO);
  fs.mkdirSync(destino);
  const r = correrInit(destino, entorno, "--repositorio");
  assert.equal(r.codigo, 0, r.salida.slice(-800));
  const e = estadoSegunGit(destino, entorno);
  assert.equal(e.repo, true, `no quedo .git:\n${r.salida.slice(-1500)}`);
  assert.equal(e.rama, "main", `la rama es ${e.rama}: el gitconfig de prueba pide otra-rama por defecto y la herramienta tiene que imponer main`);
  // SIN arranque no hay primer guardado, y lo DICE: sin el install no hay
  // lockfile y el CI corre con --frozen-lockfile, asi que ese envio saldria rojo.
  assert.equal(e.commit, null, "hizo un primer guardado sin haber corrido el arranque: ese envio nace rojo");
  assert.match(r.salida, /::warning::el primer guardado NO se hizo/, "no aviso por que no hay primer guardado");
});

test("--sin-remoto implica --repositorio y la herramienta no le pregunta nada a GitHub", () => {
  const entorno = entornoDePrueba();
  const destino = path.join(tmp("sin-remoto-cli"), VALORES.PROYECTO);
  fs.mkdirSync(destino);
  const r = correrInit(destino, entorno, "--sin-remoto");
  assert.equal(r.codigo, 0, r.salida.slice(-800));
  assert.equal(estadoSegunGit(destino, entorno).repo, true, "--sin-remoto no dejo el repositorio local");
});

// ═══════════════════ LO QUE HACE, caso por caso ═══════════════════

test("identidad + gh con sesion + un «si»: .git, main, primer guardado, origin y main SUBIDO", async () => {
  const entorno = entornoDePrueba();
  const destino = proyectoArmado("feliz");
  const gh = ghInyectado();
  const c = consola();
  const r = await dejarElRepositorio({
    destino, org: VALORES.ORG, proyecto: VALORES.PROYECTO, visibilidad: "publico",
    preguntar: responde("si"), ejecutar: gh.ejecutar, entorno, decir: c.decir, avisar: c.avisar,
  });
  const e = estadoSegunGit(destino, entorno);
  assert.equal(e.repo, true);
  assert.equal(e.rama, "main");
  assert.ok(e.commit, `no hubo primer guardado:\n${c.completo()}`);
  assert.equal(git(destino, entorno, "log", "-1", "--format=%s"), MENSAJE_DEL_PRIMER_GUARDADO);
  assert.equal(git(destino, entorno, "log", "-1", "--format=%ae"), "persona@ejemplo.com", "el guardado no es de la identidad configurada");
  assert.ok(e.origin, "no quedo origin");
  // Subido de verdad: la rama main del "GitHub" de mentira apunta al mismo guardado.
  assert.equal(git(e.origin, entorno, "rev-parse", "main"), e.commit, "main no quedo subido al remoto");
  assert.ok(
    gh.llamadas.includes(`repo create ${VALORES.ORG}/${VALORES.PROYECTO} --public --source=. --remote=origin --push`),
    `gh no se llamo con el comando esperado: ${gh.llamadas.join(" | ")}`,
  );
  assert.equal(r.subido, true);
  assert.match(c.completo(), new RegExp(`${LINEA_DE_SUBIDO}: https://github.com/${VALORES.ORG}/${VALORES.PROYECTO}`));
  assert.equal(c.avisado.filter((l) => l.startsWith("::warning::")).length, 0, `aviso en el camino feliz:\n${c.avisado.join("\n")}`);
  // Nada de lo que el .gitignore del andamio excluye entro al guardado.
  const rastreados = git(destino, entorno, "ls-files") ?? "";
  assert.ok(rastreados.includes(".gitignore") && rastreados.includes("AGENTS.md"), "el guardado no tiene el andamio");
});

test("lo que se pregunta lleva la visibilidad: privado viaja como --private", async () => {
  const entorno = entornoDePrueba();
  const gh = ghInyectado();
  const c = consola();
  await dejarElRepositorio({
    destino: proyectoArmado("privado"), org: VALORES.ORG, proyecto: VALORES.PROYECTO, visibilidad: "privado",
    preguntar: responde("sí"), ejecutar: gh.ejecutar, entorno, decir: c.decir, avisar: c.avisar,
  });
  assert.ok(gh.llamadas.some((l) => l.startsWith("repo create") && l.includes("--private") && !l.includes("--public")), gh.llamadas.join(" | "));
  assert.match(c.completo(), /PRIVADO/, "no le dijo a la persona que iba a ser privado antes de preguntarle");
});

test("si el asistente no dejo la visibilidad, se PREGUNTA antes de confirmar", async () => {
  const entorno = entornoDePrueba();
  const gh = ghInyectado();
  const c = consola();
  const preguntas = [];
  const respuestas = ["privado", "si"];
  await dejarElRepositorio({
    destino: proyectoArmado("sin-visibilidad"), org: VALORES.ORG, proyecto: VALORES.PROYECTO, visibilidad: null,
    preguntar: async (t) => { preguntas.push(t); return respuestas.shift(); },
    ejecutar: gh.ejecutar, entorno, decir: c.decir, avisar: c.avisar,
  });
  assert.equal(preguntas.length, 2, `esperaba la pregunta de visibilidad y la de confirmacion: ${preguntas.join(" | ")}`);
  assert.ok(gh.llamadas.some((l) => l.startsWith("repo create") && l.includes("--private")), gh.llamadas.join(" | "));
});

test("Enter o un «no»: primer guardado local, NADA en GitHub, y el comando exacto para despues", async () => {
  for (const respuesta of ["", "no", "tal vez"]) {
    const entorno = entornoDePrueba();
    const destino = proyectoArmado("dice-que-no");
    const gh = ghInyectado();
    const c = consola();
    const r = await dejarElRepositorio({
      destino, org: VALORES.ORG, proyecto: VALORES.PROYECTO, visibilidad: "publico",
      preguntar: responde(respuesta), ejecutar: gh.ejecutar, entorno, decir: c.decir, avisar: c.avisar,
    });
    const e = estadoSegunGit(destino, entorno);
    assert.ok(e.commit, "sin confirmacion igual tiene que quedar el guardado local");
    assert.equal(e.origin, null, `con «${respuesta}» se creo un remoto: crear afuera exige un si explicito`);
    assert.ok(!gh.llamadas.some((l) => l.startsWith("repo create")), `con «${respuesta}» se llamo a gh repo create`);
    assert.equal(r.subido, false);
    assert.match(c.completo(), /gh repo create Ejemplo-Org\/people-agenda --public --source=\. --remote=origin --push/, "no dejo el comando exacto para hacerlo despues");
  }
});

test("--sin-remoto: primer guardado local y a gh ni se lo llama", async () => {
  const entorno = entornoDePrueba();
  const destino = proyectoArmado("sin-remoto");
  const gh = ghInyectado();
  const c = consola();
  await dejarElRepositorio({
    destino, org: VALORES.ORG, proyecto: VALORES.PROYECTO, visibilidad: "publico", remoto: false,
    preguntar: responde("si"), ejecutar: gh.ejecutar, entorno, decir: c.decir, avisar: c.avisar,
  });
  const e = estadoSegunGit(destino, entorno);
  assert.ok(e.commit && e.rama === "main");
  assert.equal(e.origin, null);
  assert.deepEqual(gh.llamadas, [], "con --sin-remoto se le pregunto algo a gh");
  assert.match(c.completo(), /gh repo create/, "no dice como subirlo cuando quiera");
});

test("sin identidad de git configurada NO se guarda con una inventada, y se dice como configurarla", async () => {
  // git, sin user.name/user.email, INVENTA una identidad con el usuario y el
  // nombre de la maquina (medido: «diego@MacBook-Pro-de-Diego.local») y guarda
  // igual. Ese guardado subido a GitHub no es de nadie. Por eso la condicion es
  // "configurada", no "git no se quejo".
  const entorno = entornoDePrueba({ identidad: false });
  const destino = proyectoArmado("sin-identidad");
  const gh = ghInyectado();
  const c = consola();
  const r = await dejarElRepositorio({
    destino, org: VALORES.ORG, proyecto: VALORES.PROYECTO, visibilidad: "publico",
    preguntar: responde("si"), ejecutar: gh.ejecutar, entorno, decir: c.decir, avisar: c.avisar,
  });
  const e = estadoSegunGit(destino, entorno);
  assert.equal(e.repo, true);
  assert.equal(e.rama, "main");
  assert.equal(e.commit, null, "guardo con una identidad que nadie configuro");
  assert.deepEqual(gh.llamadas, [], "sin guardado no hay nada que subir, y se llamo a gh igual");
  assert.equal(r.subido, false);
  assert.ok(c.avisado.some((l) => l.startsWith("::warning::")), "fallo abierto en silencio: no hubo ::warning::");
  assert.match(c.completo(), /git config --global user\.name/, "no dice como configurar la identidad");
  assert.match(c.completo(), /git commit -m "chore: bootstrap/, "no deja el comando del primer guardado");
});

test("sin gh: guardado local, ::warning:: y el comando exacto", async () => {
  const entorno = entornoDePrueba();
  const gh = ghInyectado({ modo: "sin-gh" });
  const c = consola();
  const r = await dejarElRepositorio({
    destino: proyectoArmado("sin-gh"), org: VALORES.ORG, proyecto: VALORES.PROYECTO, visibilidad: "publico",
    preguntar: responde("si"), ejecutar: gh.ejecutar, entorno, decir: c.decir, avisar: c.avisar,
  });
  assert.equal(r.subido, false);
  assert.ok(r.commit, "sin gh igual tiene que quedar el guardado local");
  assert.ok(c.avisado.some((l) => /^::warning::.*`gh`/.test(l)), c.avisado.join("\n"));
  assert.match(c.completo(), /cli\.github\.com/, "no dice de donde se baja");
  assert.match(c.completo(), /gh repo create Ejemplo-Org\/people-agenda/);
});

test("gh sin sesion: ::warning::, gh auth login, y nada creado", async () => {
  const entorno = entornoDePrueba();
  const gh = ghInyectado({ modo: "sin-sesion" });
  const c = consola();
  const r = await dejarElRepositorio({
    destino: proyectoArmado("sin-sesion"), org: VALORES.ORG, proyecto: VALORES.PROYECTO, visibilidad: "publico",
    preguntar: responde("si"), ejecutar: gh.ejecutar, entorno, decir: c.decir, avisar: c.avisar,
  });
  assert.equal(r.subido, false);
  assert.ok(!gh.llamadas.some((l) => l.startsWith("repo create")));
  assert.ok(c.avisado.some((l) => l.startsWith("::warning::")));
  assert.match(c.completo(), /gh auth login/);
});

test("sin terminal NO se crea nada afuera, aunque haya sesion: la confirmacion no se puede suponer", async () => {
  const entorno = entornoDePrueba();
  const gh = ghInyectado();
  const c = consola();
  const r = await dejarElRepositorio({
    destino: proyectoArmado("sin-terminal"), org: VALORES.ORG, proyecto: VALORES.PROYECTO, visibilidad: "publico",
    preguntar: null, ejecutar: gh.ejecutar, entorno, decir: c.decir, avisar: c.avisar,
  });
  assert.equal(r.subido, false);
  assert.ok(!gh.llamadas.some((l) => l.startsWith("repo create")), "creo el repositorio sin que nadie lo confirmara");
  assert.ok(c.avisado.some((l) => /^::warning::.*confirm/.test(l)), c.avisado.join("\n"));
});

test("si ya existe en GitHub no se crea ni se pisa, y se dice como conectarlo", async () => {
  const entorno = entornoDePrueba();
  const gh = ghInyectado({ modo: "existe" });
  const c = consola();
  const r = await dejarElRepositorio({
    destino: proyectoArmado("ya-existe"), org: VALORES.ORG, proyecto: VALORES.PROYECTO, visibilidad: "publico",
    preguntar: responde("si"), ejecutar: gh.ejecutar, entorno, decir: c.decir, avisar: c.avisar,
  });
  assert.equal(r.subido, false);
  assert.ok(!gh.llamadas.some((l) => l.startsWith("repo create")));
  assert.ok(c.avisado.some((l) => /^::warning::.*YA EXISTE/.test(l)), c.avisado.join("\n"));
  assert.match(c.completo(), /git remote add origin https:\/\/github\.com\/Ejemplo-Org\/people-agenda\.git/);
});

test("MUERDE: un gh que sale 0 sin crear nada NO se da por subido", async () => {
  // Es el modo de falla que este repo tiene medido para los CLI en Windows:
  // exito impreso y nada hecho. «gh dijo que si» no es evidencia; el origin y la
  // rama remota en el disco si lo son.
  const entorno = entornoDePrueba();
  const gh = ghInyectado({ modo: "miente" });
  const c = consola();
  const r = await dejarElRepositorio({
    destino: proyectoArmado("miente"), org: VALORES.ORG, proyecto: VALORES.PROYECTO, visibilidad: "publico",
    preguntar: responde("si"), ejecutar: gh.ejecutar, entorno, decir: c.decir, avisar: c.avisar,
  });
  assert.equal(r.subido, false, "se dio por subido un repositorio que no existe");
  assert.ok(!c.dicho.some((l) => l.includes(LINEA_DE_SUBIDO)), "imprimio que quedo subido");
  assert.ok(c.avisado.some((l) => l.startsWith("::warning::")), "el fallo quedo en silencio");
});

test("si el arranque no quedo en verde no hay primer guardado: ese envio naceria rojo", async () => {
  const entorno = entornoDePrueba();
  const destino = proyectoArmado("sin-arranque");
  const gh = ghInyectado();
  const c = consola();
  const r = await dejarElRepositorio({
    destino, org: VALORES.ORG, proyecto: VALORES.PROYECTO, visibilidad: "publico",
    listoParaGuardar: false, motivoSinGuardar: "se pidio --sin-arranque",
    preguntar: responde("si"), ejecutar: gh.ejecutar, entorno, decir: c.decir, avisar: c.avisar,
  });
  const e = estadoSegunGit(destino, entorno);
  assert.equal(e.repo, true);
  assert.equal(e.commit, null);
  assert.deepEqual(gh.llamadas, []);
  assert.equal(r.subido, false);
  assert.match(c.avisado.join("\n"), /::warning::el primer guardado NO se hizo: se pidio --sin-arranque/);
});

test("un destino que YA era repositorio con historia no se toca", async () => {
  const entorno = entornoDePrueba();
  const destino = proyectoArmado("ya-era");
  execFileSync("git", ["init", "--quiet"], { cwd: destino, env: entorno });
  execFileSync("git", ["commit", "--quiet", "--allow-empty", "-m", "historia ajena"], { cwd: destino, env: entorno });
  const antes = git(destino, entorno, "rev-parse", "HEAD");
  const gh = ghInyectado();
  const c = consola();
  await dejarElRepositorio({
    destino, org: VALORES.ORG, proyecto: VALORES.PROYECTO, visibilidad: "publico",
    preguntar: responde("si"), ejecutar: gh.ejecutar, entorno, decir: c.decir, avisar: c.avisar,
  });
  assert.equal(git(destino, entorno, "rev-parse", "HEAD"), antes, "agrego un guardado sobre una historia que no es suya");
  assert.deepEqual(gh.llamadas, [], "subio una historia que no armo esta corrida");
});

// ═══════════════════ EL gh DE VERDAD DEL PATH, con un ejecutable falso ═══════════════════

// APAGADO A PROPOSITO: en Windows, y solo este caso. El gh de mentira es un guion
// de shell, y en Windows gh es gh.exe lanzado sin shell (DEP0190): un gh.cmd
// falso exigiria empeorar la invocacion real. La misma logica corre en Windows
// con el gh inyectado de los casos de arriba.
const SOLO_UNIX =
  process.platform === "win32"
    ? {
        skip:
          "el gh de este caso es un guion de shell; en Windows gh es gh.exe y se invoca sin shell. " +
          "La logica que decide corre igual en Windows con el gh inyectado de los casos de arriba",
      }
    : {};

test("de punta a punta con un gh FALSO en el PATH: la invocacion real llega, sin shell, y deja origin", SOLO_UNIX, async () => {
  const bin = tmp("gh-en-el-path");
  const remotos = tmp("remotos-path");
  const bitacora = path.join(bin, "llamadas.txt");
  // El guion hace lo mismo que el gh inyectado: contesta la sesion, dice que el
  // repositorio no existe, y en `repo create` arma un desnudo, agrega el origin y
  // empuja. Anota cada llamada para que el caso pueda afirmar que fue EL el que corrio.
  fs.writeFileSync(
    path.join(bin, "gh"),
    [
      "#!/bin/sh",
      `echo "$*" >> "${bitacora}"`,
      'case "$1 $2" in',
      '  "--version "*) echo "gh version 2.99.0 (de mentira)"; exit 0 ;;',
      '  "api user") echo "cuenta-de-prueba"; exit 0 ;;',
      "  \"repo view\") echo \"GraphQL: Could not resolve to a Repository with the name '$3'. (repository)\" >&2; exit 1 ;;",
      '  "repo create")',
      `    desnudo="${remotos}/$(echo "$3" | tr / _).git"`,
      '    git init --quiet --bare "$desnudo" && git remote add origin "$desnudo" && git push --quiet -u origin HEAD 2>/dev/null',
      "    exit $? ;;",
      "esac",
      "exit 1",
      "",
    ].join("\n"),
    { mode: 0o755 },
  );
  const entorno = entornoDePrueba({ antesDelPath: bin });
  const destino = proyectoArmado("path");
  const c = consola();
  const r = await dejarElRepositorio({
    destino, org: VALORES.ORG, proyecto: VALORES.PROYECTO, visibilidad: "publico",
    preguntar: responde("si"), entorno, decir: c.decir, avisar: c.avisar,
  });
  const llamadas = fs.existsSync(bitacora) ? fs.readFileSync(bitacora, "utf8") : "";
  assert.match(llamadas, /repo create Ejemplo-Org\/people-agenda --public --source=\. --remote=origin --push/, `el gh del PATH no recibio la creacion:\n${llamadas}`);
  const e = estadoSegunGit(destino, entorno);
  assert.ok(e.origin && e.origin.startsWith(remotos), `no quedo el origin del gh falso: ${e.origin}`);
  assert.equal(git(e.origin, entorno, "rev-parse", "main"), e.commit);
  assert.equal(r.subido, true, c.completo());
});

// ═══════════════════ LO QUE SIGUE, dicho segun lo medido ═══════════════════

test("la lista de lo que sigue dice lo que se MIDIO, en los cuatro estados", () => {
  const base = { destino: "/tmp/p", org: "Ejemplo-Org", proyecto: "people-agenda", visibilidad: "publico" };
  const subido = lineasDelPrimerEnvio({ git: true, repo: true, rama: "main", commit: "abc", origin: "x", subido: true, resultado: "subido" }, base).join("\n");
  assert.match(subido, /YA ESTA EN GitHub/);
  assert.doesNotMatch(subido, /ANTES DEL PRIMER PUSH/, "manda a hacer un primer envio que ya se hizo");
  assert.match(subido, /git push/, "no dice como mandar la portada");

  // Un checkout de GitHub (un runner, un clon con historia) tiene HEAD igual a
  // origin/main y el andamio SIN guardar. Las refs dicen "subido"; los archivos
  // recien escritos no se enviaron. Afirmar "lo hizo esta corrida" ahi es mentir.
  const checkout = lineasDelPrimerEnvio({ git: true, repo: true, rama: "main", commit: "abc", origin: "x", subido: true }, base).join("\n");
  assert.doesNotMatch(checkout, /YA ESTA EN GitHub/, "dio por enviado un andamio que esta corrida no guardo ni subio");
  assert.match(checkout, /PUSH DIRECTO/);

  const local = lineasDelPrimerEnvio({ git: true, repo: true, rama: "main", commit: "abc", origin: null, subido: false }, base).join("\n");
  assert.match(local, /TODAVIA NO ESTA EN GitHub/);
  assert.match(local, /gh repo create Ejemplo-Org\/people-agenda --public --source=\. --remote=origin --push/);
  assert.doesNotMatch(local, /git init/, "manda a crear un repositorio que ya existe");

  const carpeta = lineasDelPrimerEnvio({ git: true, repo: false, rama: null, commit: null, origin: null, subido: false }, base).join("\n");
  assert.match(carpeta, /NO es un repositorio git/);
  assert.match(carpeta, /git init -b main/);

  const aMano = lineasDelPrimerEnvio({ git: true, repo: true, rama: "main", commit: null, origin: "https://github.com/x/y.git", subido: false }, base).join("\n");
  assert.match(aMano, /PUSH DIRECTO/, "el camino a mano (repo clonado de GitHub) perdio su instruccion");
  assert.match(aMano, /ANTES DEL PRIMER PUSH/);
});

test("la visibilidad se lee de las respuestas que dejo el asistente, al lado del archivo de valores", () => {
  const dir = tmp("respuestas");
  const valores = path.join(dir, "valores.json");
  assert.equal(visibilidadDeLasRespuestas(valores), null, "sin archivo de respuestas no hay visibilidad que inventar");
  fs.writeFileSync(path.join(dir, ".projects-respuestas.json"), JSON.stringify({ visibilidad: "privado" }));
  assert.equal(visibilidadDeLasRespuestas(valores), "privado");
  fs.writeFileSync(path.join(dir, ".projects-respuestas.json"), JSON.stringify({ visibilidad: "cualquiera" }));
  assert.equal(visibilidadDeLasRespuestas(valores), null, "acepto una visibilidad que gh no conoce");
});

test("medirRepositorio no confunde el repositorio de la carpeta de arriba con el propio", () => {
  // Si el clon del marco (o cualquier carpeta madre) es un repositorio, git
  // contesta por ESE cuando se le pregunta desde un hijo sin .git. Decir "ya es
  // repositorio" ahi seria saltarse el git init del proyecto.
  const entorno = entornoDePrueba();
  const madre = tmp("madre");
  execFileSync("git", ["init", "--quiet"], { cwd: madre, env: entorno });
  const hijo = path.join(madre, "hijo");
  fs.mkdirSync(hijo);
  assert.equal(medirRepositorio(hijo, { entorno }).repo, false);
});

// ═══════════════════ LOS LANZADORES Y LA GUIA ═══════════════════

test("los dos lanzadores con logica piden el repositorio y aceptan --sin-remoto", () => {
  for (const [archivo, pide, sinRemoto] of [
    ["arrancar.sh", /--destino "\$DESTINO" "\$MODO_REPO"/, /--sin-remoto\)\s*MODO_REPO="--sin-remoto"/],
    ["arrancar.cmd", /--destino "%DESTINO%" %MODO_REPO%/, /"%~1"=="--sin-remoto" set MODO_REPO=--sin-remoto/i],
  ]) {
    const t = fs.readFileSync(path.join(RAIZ, archivo), "utf8");
    assert.match(t, /MODO_REPO=--repositorio|MODO_REPO="--repositorio"/, `${archivo} no pide el repositorio por defecto`);
    assert.match(t, pide, `${archivo} no le pasa el modo del repositorio a la herramienta`);
    assert.match(t, sinRemoto, `${archivo} no acepta --sin-remoto`);
  }
  // El de macOS no tiene logica: pasa sus argumentos al de Linux tal cual.
  assert.match(fs.readFileSync(path.join(RAIZ, "arrancar.command"), "utf8"), /arrancar\.sh" "\$@"/);
});

test("el modulo no pasa por un shell: git y gh se lanzan sin cmd.exe ni sh en el medio", () => {
  // Con shell en Windows, Node concatena los argumentos SIN ESCAPAR (DEP0190).
  // Aca viajan el nombre de la cuenta y del proyecto: se lanzan sin shell en los
  // tres sistemas, que en Windows funciona porque git y gh son .exe.
  const fuente = fs.readFileSync(MODULO, "utf8");
  const codigo = fuente
    .split("\n")
    .filter((l) => !/^\s*(\/\/|\*|\/\*\*)/.test(l))
    .join("\n");
  const shells = [...codigo.matchAll(/shell:\s*([^,}\n]+)/g)].map((m) => m[1].trim());
  assert.ok(shells.length >= 1, "no se encontro ninguna opcion shell: este control no mira nada");
  assert.deepEqual([...new Set(shells)], ["false"], `hay un shell que no es false: ${shells.join(", ")}`);
  for (const [nombre, patron] of [
    ["execSync", /\bexecSync\(/],
    ["exec", /(?<![.\w])exec\(/],
    ["spawn", /(?<![.\w])spawn\(/],
    ["spawnSync", /\bspawnSync\(/],
  ]) {
    assert.equal(patron.test(codigo), false, `${nombre}() en el modulo del repositorio`);
  }
});

test("la vista previa con --repositorio no promete que no se toca GitHub", () => {
  const sin = lineasDeVistaPrevia(ANDAMIO, os.tmpdir(), VALORES).join("\n");
  assert.match(sin, /No se toca ninguna cuenta tuya ni ningún ajuste de GitHub/, "sin --repositorio la promesa de siempre tiene que seguir");
  const con = lineasDeVistaPrevia(ANDAMIO, os.tmpdir(), VALORES, { repositorio: true }).join("\n");
  assert.doesNotMatch(con, /No se toca ninguna cuenta tuya/, "con --repositorio promete no tocar GitHub y despues ofrece crear un repositorio ahi");
  assert.match(con, /sólo si lo confirmás/, "no dice que crear el repositorio en GitHub pide confirmacion");
});

const GUIA = fs.readFileSync(path.join(RAIZ, "docs/04-arrancar-acompanado.md"), "utf8");

test("docs/04 cita lo que la herramienta imprime: la pregunta y la linea de subido", () => {
  const pregunta = PREGUNTA_DE_CONFIRMACION.trim().split("\n").pop().slice(0, 40);
  assert.ok(GUIA.includes(pregunta), `la guia no cita la pregunta que la persona va a ver: «${pregunta}»`);
  assert.ok(GUIA.includes(LINEA_DE_SUBIDO), `la guia no cita la linea que dice que quedo subido: «${LINEA_DE_SUBIDO}»`);
});

test("docs/04: el doble clic y el camino a mano no se contradicen", () => {
  // Las tres contradicciones medidas: el Paso 2 remitia a un `cd ..` de un bloque
  // que no existe, decia sin condicion que la herramienta «no crea repositorios»,
  // y mandaba a clonar sobre la carpeta que el lanzador ya habia llenado.
  assert.doesNotMatch(GUIA, /terminaba con `cd \.\.`/, "remite a un `cd ..` que ningun paso manda correr");
  assert.doesNotMatch(GUIA, /\*\*no crea repositorios\*\*/, "afirma sin condicion que no se crean repositorios, y el doble clic los crea");
  const i = GUIA.indexOf("## Paso 2 —");
  const paso2 = GUIA.slice(i, GUIA.indexOf("## Paso 3 —", i));
  assert.match(paso2, /doble clic/i, "el Paso 2 no le dice a quien uso el doble clic que lo salte");
  assert.match(GUIA, /## Dos caminos desde acá/, "falta la seccion que parte la guia en los dos caminos");
});
