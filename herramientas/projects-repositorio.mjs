// ---------------------------------------------------------------------------
// projects-repositorio — lo que convierte la carpeta armada en un repositorio.
//
// QUE DEFECTO CIERRA, medido sobre el arbol del 2026-09-17. Los tres lanzadores
// de doble clic (`arrancar.sh`, `arrancar.command`, `arrancar.cmd`) hacian
// `mkdir` de `../<PROYECTO>` e invocaban `projects-init.mjs` ahi. El UNICO
// `init` de toda la cadena era el de OpenSpec: ni `git init`, ni rama, ni
// remoto. Y despues la herramienta imprimia «el bootstrap va a main por PUSH
// DIRECTO» sobre una carpeta en la que no habia ni `main` ni a donde empujar.
// La persona que no abre una terminal --la que el doble clic existe para
// servir-- terminaba con una carpeta y una lista de tareas que suponia otra cosa.
//
// QUE HACE, en este orden, y cada paso se comprueba preguntandole a git y no
// creyendole a la salida de nadie:
//   1. `git init` con la rama `main`, aunque la maquina prefiera otra.
//   2. El primer guardado, SOLO si hay identidad de git CONFIGURADA y el
//      proyecto quedo arrancado y en verde. Sin identidad, git inventa una con el
//      usuario y el nombre de la maquina y guarda igual; ese guardado subido a
//      GitHub no es de nadie.
//   3. El repositorio en GitHub, SOLO si hay `gh` con sesion, el nombre no esta
//      tomado, y la persona lo CONFIRMA escribiendo que si. Crear algo en GitHub
//      es visible desde afuera: sin terminal donde preguntar, no se crea.
//
// Y NADA DE ESO FALLA EN SILENCIO. Cada paso que no se pudo hacer sale como
// `::warning::` con el motivo y los comandos exactos para hacerlo despues. El
// proyecto ya esta escrito y en verde cuando esto corre: un rojo aca mandaria a
// la persona a reabrir el lanzador, que choca con el destino ocupado. Por eso la
// salida es aviso y comandos, igual que `--sin-arranque`.
//
// SIN SHELL, en los tres sistemas. Viajan el nombre de la cuenta y el del
// proyecto, y con shell en Windows Node concatena los argumentos sin escapar
// (DEP0190). git y gh son .exe en Windows, asi que no hace falta el shell que
// obligan los .cmd de npm.
// ---------------------------------------------------------------------------

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { citarRuta } from "./projects-init.mjs";
import { PATRON_DE_SESION } from "./projects-doctor.mjs";

/** El mensaje del primer guardado. El mismo que docs/04 mandaba a escribir a
 *  mano en su Paso 9: quien arranca por los dos caminos ve la misma historia. */
export const MENSAJE_DEL_PRIMER_GUARDADO = "chore: bootstrap del proyecto con el andamio del marco";

/** El mensaje del guardado de la portada, cuando el primero ya esta subido. */
export const MENSAJE_DE_LA_PORTADA = "docs: la portada del proyecto";

/** LA PREGUNTA, en un solo lugar: la imprime la herramienta y la cita docs/04.
 *  Si divergen, la persona busca en pantalla una frase que no esta. Enter NO es
 *  que si: crear algo afuera exige escribirlo. */
export const PREGUNTA_DE_CONFIRMACION = '  ¿Lo creo y lo subo? Escribí "si" para crearlo (Enter lo deja para después): ';

export const PREGUNTA_DE_VISIBILIDAD = '  ¿Público o privado? Escribí "publico" o "privado": ';

/** La linea que dice que quedo en GitHub. La cita docs/04 como la señal de exito. */
export const LINEA_DE_SUBIDO = "REPOSITORIO CREADO Y SUBIDO";

/** Cuanto se espera a gh. Crear y empujar el primer guardado es lo mas largo:
 *  unos cientos de archivos chicos, sin node_modules. Al vencer, aviso y comandos. */
const TIMEOUT_DE_GH = 180_000;
const TIMEOUT_DE_CONSULTA = 30_000;

/** Las formas de un `<cuenta>/<repo>` de GitHub. La cuenta: alfanumerico con
 *  guiones simples, hasta 39 (la misma que FORMATOS.ORG). El repo: la de GitHub,
 *  no la convencion kebab del marco. Lo que no calza no llega a gh. */
const FORMA_DE_CUENTA = /^[A-Za-z0-9](?:-?[A-Za-z0-9]){0,38}$/;
const FORMA_DE_REPO = /^(?!\.{1,2}$)[A-Za-z0-9._][A-Za-z0-9._-]{0,99}$/;

/** Lanza un programa y devuelve lo que dejo, sin tirar. `presente: false` es
 *  "no esta en el PATH", que se distingue de "estaba y fallo". */
export function ejecutarDeVerdad(programa, args, { cwd, entorno = process.env, timeout = 0 } = {}) {
  try {
    const stdout = execFileSync(programa, args, {
      cwd,
      env: entorno,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout,
      shell: false,
    });
    return { presente: true, codigo: 0, stdout: String(stdout ?? ""), stderr: "" };
  } catch (e) {
    if (e?.code === "ENOENT") return { presente: false, codigo: null, stdout: "", stderr: "" };
    return {
      presente: true,
      codigo: typeof e?.status === "number" ? e.status : null,
      stdout: String(e?.stdout ?? ""),
      stderr: String(e?.stderr ?? "") || String(e?.message ?? ""),
    };
  }
}

const bien = (r) => r.presente && r.codigo === 0;
const texto = (r) => (bien(r) ? r.stdout.trim() : "") || null;

/** El estado del repositorio del destino, PREGUNTADO A GIT.
 *
 *  `repo` exige un `.git` EN el destino. Sin eso git contesta por la carpeta de
 *  arriba si es un repositorio --el clon del marco, un monorepo--, y decir "ya
 *  es repositorio" ahi seria saltarse el del proyecto.
 *
 *  `subido` es local y se puede afirmar sin red: la rama remota que deja un push
 *  exitoso (`refs/remotes/origin/<rama>`) apunta al mismo guardado que HEAD. */
export function medirRepositorio(destino, { ejecutar = ejecutarDeVerdad, entorno = process.env } = {}) {
  const vacio = { git: false, repo: false, rama: null, commit: null, origin: null, subido: false };
  const correr = (args) => ejecutar("git", args, { cwd: destino, entorno });
  if (!bien(correr(["--version"]))) return vacio;
  if (!fs.existsSync(path.join(destino, ".git"))) return { ...vacio, git: true };
  const rama = texto(correr(["symbolic-ref", "--quiet", "--short", "HEAD"]));
  const commit = texto(correr(["rev-parse", "--verify", "--quiet", "HEAD"]));
  const origin = texto(correr(["remote", "get-url", "origin"]));
  const remota = rama && origin ? texto(correr(["rev-parse", "--verify", "--quiet", `refs/remotes/origin/${rama}`])) : null;
  return { git: true, repo: true, rama, commit, origin, subido: Boolean(commit && remota && remota === commit) };
}

/** La visibilidad que la persona ya eligio en el asistente. Vive en
 *  `.projects-respuestas.json`, al lado del archivo de valores: ahi la deja el
 *  asistente, y el lanzador pasa ese archivo. Lo que no sea una de las dos que gh
 *  entiende es "no se sabe", y entonces se pregunta. */
export function visibilidadDeLasRespuestas(rutaDeValores) {
  try {
    const ruta = path.join(path.dirname(path.resolve(rutaDeValores)), ".projects-respuestas.json");
    const v = JSON.parse(fs.readFileSync(ruta, "utf8"))?.visibilidad;
    return v === "publico" || v === "privado" ? v : null;
  } catch {
    return null;
  }
}

/** El comando que crea el repositorio en GitHub y sube el primer guardado. */
export function comandoDeCrear({ org, proyecto, visibilidad }) {
  return `gh repo create ${org}/${proyecto} ${visibilidad === "privado" ? "--private" : "--public"} --source=. --remote=origin --push`;
}

/** Lo que falta, como comandos para pegar, segun lo medido. Puro. */
export function comandosPendientes(estado, { destino, org, proyecto, visibilidad }) {
  const c = [`cd ${citarRuta(destino)}`];
  if (!estado.repo) c.push("git init -b main");
  if (!estado.commit) c.push("git add -A", `git commit -m "${MENSAJE_DEL_PRIMER_GUARDADO}"`);
  if (!estado.origin) c.push(comandoDeCrear({ org, proyecto, visibilidad }));
  else if (!estado.subido) c.push(`git push -u origin ${estado.rama ?? "main"}`);
  return c;
}

/** Las lineas de la nota de visibilidad cuando no se sabe cual eligio la persona. */
function notaDeVisibilidad(visibilidad) {
  return visibilidad ? [] : ["     (--public lo puede LEER cualquiera; si tiene que ser privado, --private en su lugar)"];
}

const esSi = (r) => /^(s|si|sí|y|yes)$/i.test(String(r ?? "").trim());

/** Si gh tiene una sesion abierta. Primero `gh api user`, que es un DATO igual en
 *  toda version; si no contesta (sin red), `gh auth status`, leyendo el codigo y
 *  el texto con el MISMO patron que usa el comprobador del Paso 0. */
function haySesion(correr) {
  const login = correr(["api", "user", "--jq", ".login"], TIMEOUT_DE_CONSULTA);
  if (bien(login) && FORMA_DE_CUENTA.test(login.stdout.trim())) return true;
  const estado = correr(["auth", "status"], TIMEOUT_DE_CONSULTA);
  if (!estado.presente) return false;
  return estado.codigo === 0 || PATRON_DE_SESION.test(`${estado.stdout}${estado.stderr}`);
}

/** La primera linea util de lo que dejo un proceso, para un aviso de una linea. */
const primeraLinea = (r) => `${r.stderr}\n${r.stdout}`.split(/\r?\n/).map((l) => l.trim()).find(Boolean) ?? `salio ${r.codigo}`;

/** LO QUE HACE ESTE MODULO. Devuelve el estado medido al final, con `resultado`
 *  diciendo en que paso se detuvo. `preguntar` es `null` cuando no hay terminal:
 *  sin alguien que confirme, no se crea nada afuera. */
export async function dejarElRepositorio({
  destino,
  org,
  proyecto,
  visibilidad = null,
  remoto = true,
  listoParaGuardar = true,
  motivoSinGuardar = null,
  preguntar = null,
  ejecutar = ejecutarDeVerdad,
  entorno = process.env,
  decir = (l) => console.log(l),
  avisar = (l) => console.error(l),
}) {
  const git = (args) => ejecutar("git", args, { cwd: destino, entorno });
  const gh = (args, timeout = TIMEOUT_DE_CONSULTA) => ejecutar("gh", args, { cwd: destino, entorno, timeout });
  const medir = () => medirRepositorio(destino, { ejecutar, entorno });
  let vis = visibilidad;
  const comandos = (estado) => [...comandosPendientes(estado, { destino, org, proyecto, visibilidad: vis }).map((c) => `     ${c}`), ...notaDeVisibilidad(vis)];
  const fin = (estado, resultado) => ({ ...estado, resultado });
  const avisarConComandos = (primera, estado, ...explicacion) => {
    avisar(`::warning::${primera}`);
    for (const l of explicacion) avisar(l);
    avisar("  Cuando quieras, parado en la carpeta del proyecto:");
    for (const l of comandos(estado)) avisar(l);
  };

  decir("");
  decir("── EL REPOSITORIO ──");

  // ── 1. git ──
  let estado = medir();
  if (!estado.git) {
    avisarConComandos(
      `no encontre \`git\` en esta computadora, asi que ${destino} quedo escrito y en verde pero NO es un repositorio.`,
      estado,
      "  Se baja de https://git-scm.com/downloads. Despues de instalarlo:",
    );
    return fin(estado, "sin-git");
  }

  // ── 2. el repositorio, con main ──
  const yaEraRepo = estado.repo;
  if (!yaEraRepo) {
    const init = git(["init", "--quiet"]);
    // `symbolic-ref` y no `init -b`: la bandera llego en git 2.28, y sobre una
    // rama sin guardados esto hace lo mismo en cualquier version.
    if (bien(init)) git(["symbolic-ref", "HEAD", "refs/heads/main"]);
    estado = medir();
    if (!estado.repo || estado.rama !== "main") {
      avisarConComandos(`git init no dejo un repositorio con la rama main en ${destino}: ${primeraLinea(init)}`, estado);
      return fin(estado, "init-fallo");
    }
    decir(`Repositorio git creado en ${destino}, rama main.`);
  } else if (estado.commit) {
    // UNA HISTORIA QUE NO ARMO ESTA CORRIDA no se toca: ni un guardado encima, ni
    // subirla a un repositorio nuevo. Es de quien la hizo.
    decir(`${destino} ya era un repositorio git con historia (rama ${estado.rama ?? "sin nombre"}): no se le agrega nada ni se sube.`);
    return fin(estado, "ya-era-repo");
  } else {
    // Un repositorio vacio --tipicamente el de `gh repo create --clone`--: se
    // guarda encima, en main, y se deja el remoto que ya tiene.
    if (estado.rama !== "main") git(["symbolic-ref", "HEAD", "refs/heads/main"]);
    estado = medir();
    decir(`${destino} ya era un repositorio git, todavia sin guardados: se usa ese, en la rama main.`);
  }

  // ── 3. el primer guardado ──
  if (!listoParaGuardar) {
    avisarConComandos(
      `el primer guardado NO se hizo: ${motivoSinGuardar ?? "el proyecto no quedo arrancado y en verde"}.`,
      estado,
      "  Guardar y subir un proyecto que no quedo completo y en verde estrena el repositorio con el CI en",
      "  rojo, por una razon que esta corrida ya conoce. Primero lo que la herramienta dijo arriba; despues esto.",
    );
    return fin(estado, "sin-guardar");
  }
  const nombre = texto(git(["config", "--get", "user.name"]));
  const email = texto(git(["config", "--get", "user.email"]));
  if (!nombre || !email) {
    avisarConComandos(
      `git no tiene tu identidad configurada (${[!nombre && "user.name", !email && "user.email"].filter(Boolean).join(" y ")}), asi que el primer guardado NO se hizo.`,
      estado,
      "  Sin ella git inventa una con tu usuario y el nombre de esta maquina, y ese guardado subido a GitHub",
      "  no queda a tu nombre. Se configura una vez por computadora, con el correo de tu cuenta de GitHub:",
      '     git config --global user.name "Tu Nombre"',
      '     git config --global user.email "tu-correo@ejemplo.com"',
    );
    return fin(estado, "sin-identidad");
  }
  const agregado = git(["add", "-A"]);
  // `user.useConfigOnly`: la misma regla que el control de arriba, dicha a git.
  // Si algo cambiara entre la pregunta y el guardado, git se niega en vez de
  // inventar la identidad.
  const guardado = bien(agregado) ? git(["-c", "user.useConfigOnly=true", "commit", "--quiet", "-m", MENSAJE_DEL_PRIMER_GUARDADO]) : agregado;
  estado = medir();
  if (!estado.commit) {
    avisarConComandos(`el primer guardado fallo: ${primeraLinea(guardado)}`, estado);
    return fin(estado, "guardado-fallo");
  }
  decir(`Primer guardado en main: ${estado.commit.slice(0, 7)} "${MENSAJE_DEL_PRIMER_GUARDADO}", a nombre de ${nombre} <${email}>.`);

  // ── 4. el repositorio en GitHub ──
  if (!remoto) {
    decir("Se pidio --sin-remoto: el repositorio queda SOLO en esta computadora. Cuando quieras subirlo a GitHub:");
    for (const l of comandos(estado)) decir(l);
    return fin(estado, "sin-remoto");
  }
  if (estado.origin) {
    decir(`Ya tiene un remoto (origin = ${estado.origin}): no se crea otro. El primer envio queda para vos, y la lista de abajo dice cuando.`);
    return fin(estado, "ya-tenia-origin");
  }
  if (!FORMA_DE_CUENTA.test(String(org ?? "")) || !FORMA_DE_REPO.test(String(proyecto ?? ""))) {
    avisarConComandos(`${JSON.stringify(`${org}/${proyecto}`)} no tiene la forma de un <cuenta>/<repositorio> de GitHub: no se crea nada.`, estado);
    return fin(estado, "nombre-invalido");
  }
  if (!bien(gh(["--version"]))) {
    avisarConComandos(
      "no encontre `gh`, el programa que habla con GitHub: el proyecto quedo guardado en esta computadora y NO en GitHub.",
      estado,
      "  Se baja de https://cli.github.com; despues `gh auth login` una vez, y esto:",
    );
    return fin(estado, "sin-gh");
  }
  if (!haySesion((args, t) => gh(args, t))) {
    avisarConComandos(
      "`gh` no tiene la sesion de GitHub abierta: el proyecto quedo guardado en esta computadora y NO en GitHub.",
      estado,
      "  Se abre con `gh auth login` (una vez por computadora), y despues esto:",
    );
    return fin(estado, "sin-sesion");
  }
  const vista = gh(["repo", "view", `${org}/${proyecto}`, "--json", "name"]);
  if (bien(vista)) {
    avisar(`::warning::${org}/${proyecto} YA EXISTE en GitHub, y no se toca: ni se crea otro ni se sube encima.`);
    avisar("  Si es tuyo y esta VACIO (recien creado, sin archivos), se conecta y se sube asi:");
    avisar(`     cd ${citarRuta(destino)}`);
    avisar(`     git remote add origin https://github.com/${org}/${proyecto}.git`);
    avisar("     git push -u origin main");
    avisar("  Si ya tiene archivos, es otro proyecto: elegi otro nombre y volve a crear este con ese nombre.");
    return fin(estado, "ya-existe");
  }
  if (!preguntar) {
    avisarConComandos(
      `crear ${org}/${proyecto} en GitHub se hace SOLO si lo confirmas, y esta corrida no tiene una terminal donde preguntartelo: no se creo nada afuera.`,
      estado,
    );
    return fin(estado, "sin-terminal");
  }
  decir("");
  decir(`Falta una cosa, y es la unica de todo el recorrido que se ve desde afuera: crear ${org}/${proyecto} en GitHub`);
  decir("y subirle este primer guardado. Sin eso el proyecto vive solo en esta computadora.");
  if (!vis) {
    decir("El asistente no dejo anotado si el repositorio es publico o privado:");
    const r = String((await preguntar(PREGUNTA_DE_VISIBILIDAD)) ?? "").trim().toLowerCase();
    vis = /^pri/.test(r) ? "privado" : /^pu|^pú/.test(r) ? "publico" : null;
    if (!vis) {
      decir("No elegiste ninguno de los dos, asi que no se creo nada en GitHub. Cuando quieras:");
      for (const l of comandos(estado)) decir(l);
      return fin(estado, "no-confirmado");
    }
  }
  decir(
    vis === "publico"
      ? "  Va a ser PÚBLICO: cualquiera puede LEER el código; nadie puede cambiarlo sin que lo apruebes."
      : "  Va a ser PRIVADO: nadie lo ve. En el plan gratuito, la rama principal no se puede proteger.",
  );
  const respuesta = await preguntar(PREGUNTA_DE_CONFIRMACION);
  if (!esSi(respuesta)) {
    decir("No se creo nada en GitHub. El proyecto queda guardado en esta computadora. Cuando quieras subirlo:");
    for (const l of comandos(estado)) decir(l);
    return fin(estado, "no-confirmado");
  }
  const creado = gh(
    ["repo", "create", `${org}/${proyecto}`, vis === "privado" ? "--private" : "--public", "--source=.", "--remote=origin", "--push"],
    TIMEOUT_DE_GH,
  );
  for (const l of `${creado.stdout}\n${creado.stderr}`.split(/\r?\n/).filter((x) => x.trim())) decir(`  gh: ${l.trim()}`);
  estado = medir();
  if (!bien(creado)) {
    avisarConComandos(`gh no pudo crear ${org}/${proyecto}: ${primeraLinea(creado)}`, estado);
    return fin(estado, "crear-fallo");
  }
  // gh dijo que si. Eso no es evidencia: el origin y la rama remota en el disco si.
  if (!estado.subido) {
    avisarConComandos(
      `gh salio 0 pero ${estado.origin ? "main no quedo subido" : "no dejo ningun origin"}: no se da por subido algo que no se ve en el disco.`,
      estado,
      `  Mira https://github.com/${org}/${proyecto} antes de reintentar: si existe, conectalo con git remote add origin.`,
    );
    return fin(estado, "no-verificado");
  }
  decir(`${LINEA_DE_SUBIDO}: https://github.com/${org}/${proyecto}`);
  return fin(estado, "subido");
}

/** EL ORDEN DEL PRIMER ENVIO, dicho segun lo que se MIDIO del destino.
 *
 *  Reemplaza a un bloque que afirmaba «el bootstrap va a main por PUSH DIRECTO»
 *  sobre cualquier destino, incluida una carpeta sin git ni remoto. Cuatro
 *  estados, cuatro textos: subido POR ESTA CORRIDA, repositorio sin remoto,
 *  carpeta sin git, y el camino a mano (con remoto, el primer envio es de la
 *  persona), que conserva el texto de siempre porque para ese era verdad.
 *
 *  "SUBIDO POR ESTA CORRIDA" Y NO "HEAD YA ESTA EN origin". Un checkout de
 *  GitHub --el de un runner, o un clon con historia-- tiene HEAD igual a
 *  origin/main y el andamio recien escrito SIN guardar: medir solo las refs
 *  diria "el primer envio ya esta en GitHub" sobre archivos que no se enviaron.
 *  Lo que se afirma es lo que esta corrida hizo y verifico. Puro sobre el estado. */
export function lineasDelPrimerEnvio(estado, { destino, org, proyecto, visibilidad }) {
  const l = [];
  const orden = [
    "  EL ORDEN IMPORTA. El plano del cambio de la compuerta de cobertura mide las lineas",
    "  que un PR agrega sin pruebas, y el commit fundacional agrega el esqueleto entero: por",
    "  PR sale rojo, por push a main sale `NO APLICABLE`. Ademas `ci-ok` no aparece en la",
    "  lista de checks del ruleset hasta que el CI haya corrido una vez. Push -> CI verde ->",
    "  recien ahi el ruleset -> y desde ese momento todo por PR.",
  ];
  const portada = [
    "     El andamio deja un README con la estructura puesta y los valores ya",
    "     sustituidos, y con huecos marcados RELLENAR donde van las respuestas",
    "     que ninguna herramienta puede inventar: que hace el proyecto, su",
    "     alcance, que dispara cada despliegue, y el runbook de sus alarmas.",
    "     Es lo unico que GitHub renderiza en la portada del repo, o sea lo",
    "     primero que lee quien llega — y un README que quedo con los rotulos",
    "     del andamio no pone nada en rojo: se lee como si el proyecto no",
    "     tuviera la respuesta. Cuantos quedan lo dice el grep, no esta lista:",
    "          grep -n RELLENAR README.md",
  ];
  if (estado?.resultado === "subido") {
    l.push(`  EL PRIMER ENVIO YA ESTA EN GitHub, directo a main: lo hizo esta corrida`);
    l.push(`  (https://github.com/${org}/${proyecto}). Lo que queda del orden: que el CI de ese envio`);
    l.push("  termine en verde -> recien ahi el ruleset (`ci-ok` no aparece en su lista hasta haber");
    l.push("  corrido una vez) -> y desde ese momento todo por PR.");
    l.push("");
    l.push("  1. ANTES DEL RULESET — llenar `README.md` y mandarlo tambien directo a main:");
    l.push(...portada);
    l.push("     Y cuando el grep no imprima nada:");
    l.push("          git add README.md");
    l.push(`          git commit -m "${MENSAJE_DE_LA_PORTADA}"`);
    l.push("          git push");
    return l;
  }
  if (estado?.origin) {
    // El camino a mano: el repositorio ya existe en GitHub (Paso 2 de docs/04) y
    // el primer envio es de la persona. Para este caso el texto de siempre era
    // verdad, y se conserva.
    l.push("  EL ORDEN IMPORTA. Lo medido: el bootstrap va a main por PUSH DIRECTO y la");
    l.push("  proteccion se aplica DESPUES. El plano del cambio de la compuerta de cobertura");
    l.push("  mide las lineas que un PR agrega sin pruebas, y el commit fundacional agrega");
    l.push("  el esqueleto entero: por PR sale rojo, por push a main sale `NO APLICABLE`.");
    l.push("  Ademas `ci-ok` no aparece en la lista de checks del ruleset hasta que el CI");
    l.push("  haya corrido una vez. Push -> CI verde -> recien ahi el ruleset -> y desde");
    l.push("  ese momento todo por PR.");
    l.push("");
    l.push("  1. ANTES DEL PRIMER PUSH — llenar `README.md`:");
    l.push(...portada);
    return l;
  }
  if (!estado?.repo) {
    l.push(`  ESTA CARPETA NO ES UN REPOSITORIO: ${destino} NO es un repositorio git, asi`);
    l.push("  que no hay ni rama main ni a donde enviar. Si es la del proyecto, lo que falta, en este orden:");
  } else {
    l.push(`  ESTE PROYECTO TODAVIA NO ESTA EN GitHub: es un repositorio git${estado.commit ? " con su primer guardado en main" : ""}, sin`);
    l.push("  remoto. Lo que falta para subirlo, en este orden:");
  }
  for (const c of comandosPendientes(estado ?? {}, { destino, org, proyecto, visibilidad })) l.push(`       ${c}`);
  l.push(...notaDeVisibilidad(visibilidad));
  l.push("");
  l.push(...orden);
  l.push("");
  l.push("  1. ANTES DE ESE PRIMER ENVIO — llenar `README.md`:");
  l.push(...portada);
  if (estado?.commit) {
    l.push("     El primer guardado ya esta hecho, asi que la portada va en uno aparte, ANTES del gh repo create:");
    l.push("          git add README.md");
    l.push(`          git commit -m "${MENSAJE_DE_LA_PORTADA}"`);
  }
  return l;
}
