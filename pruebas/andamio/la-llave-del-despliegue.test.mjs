import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

import { elDisparoDejaPasar, evaluar, jobsConCondiciones, veraz } from "./expresiones.mjs";

const correrAsync = promisify(execFile);
const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const WORKFLOW = path.join(RAIZ, "plantilla/.github/workflows/desplegar.yml");
const README_SITIO = path.join(RAIZ, "plantilla/sitio/README.md");
const PAGINA_PUBLICAR = path.join(RAIZ, "docs/10-publicar.md");

// ---------------------------------------------------------------------------
// QUIEN LLEGA HASTA LA CREDENCIAL QUE PUBLICA, EVALUADO Y NO LEIDO.
//
// EL DEFECTO QUE ESTE BANCO CIERRA (auditoria del 2026-09-17, hallazgo C1). El
// despliegue del andamio se dispara por `workflow_run` cuando el CI termina, con
// `branches: [main]` como unico filtro de origen. Ese filtro compara el NOMBRE
// de la rama que corrio el CI, y en un pull request desde un FORK ese nombre lo
// elige quien lo abre: basta llamar `main` a la rama del fork. El CI del PR
// termina en verde (el workflow de CI de un PR lo escribe el propio PR), el `if`
// del job solo miraba `conclusion == 'success'`, y el job traia el arbol del
// commit del PR, corria `pnpm install` de ese codigo y ejecutaba `wrangler` con
// CLOUDFLARE_API_TOKEN en el entorno. Ese token es de toda la cuenta de
// Cloudflare y es el mismo que publica en produccion. En la 1.9.6 publicada el
// job hacia `wrangler deploy` directo a produccion con ese mismo disparador.
//
// POR QUE EVALUADO. El banco de al lado (`desplegar.test.mjs`) buscaba
// `conclusion == 'success'` y `branches: [main]` con un regex, y las dos cosas
// ESTABAN: el defecto no era que faltara una linea, era que las lineas que
// estaban dejaban pasar al fork. Solo se ve corriendo la condicion contra el
// evento. Aca cada caso es un evento simulado con su veredicto esperado -que
// job corre y cual no-, y la condicion se lee del archivo tal como esta.
//
// LO QUE ESTE BANCO NO PUEDE AFIRMAR, dicho primero. No prueba que GitHub llene
// el contexto como lo llena el banco: los campos (`workflow_run.event`,
// `head_repository.full_name`, `head_branch`, `head_sha`) salen del esquema
// publicado de «Get a workflow run» de la API REST, y el valor de `GITHUB_SHA` y
// `GITHUB_REF` bajo `workflow_run` («Last commit on default branch», «Default
// branch») de la referencia de eventos, leidos el 2026-09-17. Tampoco prueba la
// politica de rama de un environment, que es configuracion de GitHub y no vive
// en el arbol: por eso la guarda de verdad es el `if` de cada job, y el
// environment es la segunda llave.
// ---------------------------------------------------------------------------

const REPO = "dueno/sitio";
const VERIFICADO = "1111111111111111111111111111111111111111"; // lo que el CI midio
const PUNTA = "2222222222222222222222222222222222222222"; // lo que main apunta cuando arranca el despliegue
const DISPARO = "3333333333333333333333333333333333333333"; // la punta de la rama de un disparo a mano

/** Un despliegue disparado porque un CI termino. */
function porCI({ evento, repoDelCommit, rama = "main", conclusion = "success" }) {
  return {
    event_name: "workflow_run",
    repository: REPO,
    // Bajo `workflow_run`, GITHUB_REF es la rama por defecto y GITHUB_SHA su
    // punta, NO el commit que el CI midio: es la mitad del defecto OPS-04.
    ref: "refs/heads/main",
    ref_name: "main",
    sha: PUNTA,
    event: {
      workflow_run: {
        name: "CI",
        event: evento,
        conclusion,
        head_branch: rama,
        head_sha: VERIFICADO,
        head_repository: { full_name: repoDelCommit },
        repository: { full_name: REPO },
      },
    },
  };
}

/** Un despliegue disparado a mano desde el boton «Run workflow». */
function aMano({ rama = "main", promover = false }) {
  return {
    event_name: "workflow_dispatch",
    repository: REPO,
    ref: `refs/heads/${rama}`,
    ref_name: rama,
    sha: DISPARO,
    // `github.event.inputs` trae los valores del formulario como TEXTO.
    event: {
      inputs: {
        promover_a_produccion: String(promover),
        version: "",
        sin_esperar_ci: "false",
        sin_pasar_por_dev: "false",
      },
    },
  };
}

const contexto = (github) => ({ github, inputs: github.event.inputs ?? {}, steps: {} });

// LOS CASOS. `corren` es la lista EXACTA de jobs que tienen que correr, leyendo
// SOLO la condicion de cada job: el filtro `branches:` del disparo no cuenta como
// guarda, porque es justamente lo que el fork controla. Cada caso nombra por que
// espera lo que espera.
const CASOS = [
  {
    nombre: "push propio a main con el CI en verde",
    github: porCI({ evento: "push", repoDelCommit: REPO }),
    corren: ["dev", "guardas"],
    motivo: "es el camino normal: lo que entro a main y paso el CI sube a DEV",
  },
  {
    nombre: "push propio a main con el CI en rojo",
    github: porCI({ evento: "push", repoDelCommit: REPO, conclusion: "failure" }),
    corren: ["guardas"],
    motivo: "`workflow_run` dispara tambien cuando el CI fallo: un rojo no publica",
  },
  {
    nombre: "pull request desde un FORK cuya rama se llama main, con el CI en verde",
    github: porCI({ evento: "pull_request", repoDelCommit: "atacante/sitio" }),
    corren: [],
    motivo: "es el ataque: el codigo del fork no puede correr en NINGUN job que vea un secreto",
  },
  {
    nombre: "pull request desde un fork cuya rama se llama `Main`",
    github: porCI({ evento: "pull_request", repoDelCommit: "atacante/sitio", rama: "Main" }),
    corren: [],
    motivo: "GitHub compara cadenas sin distinguir mayusculas: el nombre de la rama no frena a nadie",
  },
  {
    nombre: "pull request del mismo repositorio desde una rama de trabajo",
    github: porCI({ evento: "pull_request", repoDelCommit: REPO, rama: "feat/algo" }),
    corren: ["guardas"],
    motivo: "el CI de un PR midio una mezcla que todavia no esta en main; `guardas` no toca codigo, y hoy ni despierta: el filtro del disparo no deja pasar esa rama",
  },
  {
    nombre: "pull request del mismo repositorio desde su main hacia otra base",
    github: porCI({ evento: "pull_request", repoDelCommit: REPO }),
    corren: ["guardas"],
    motivo: "el CI midio la mezcla con OTRA base, no main: solo un push a main habilita DEV",
  },
  {
    nombre: "push a una rama que no es main (si el CI del proyecto llegara a correr ahi)",
    github: porCI({ evento: "push", repoDelCommit: REPO, rama: "feat/algo" }),
    corren: ["guardas"],
    motivo: "la condicion no se apoya en el filtro del disparo: tiene que frenarlo sola",
  },
  {
    nombre: "defensa en profundidad: un push cuyo commit viene de otro repositorio",
    github: porCI({ evento: "push", repoDelCommit: "otro/sitio" }),
    corren: [],
    motivo:
      "GitHub no produce hoy este evento; la condicion lo exige igual, para que la guarda no dependa de un solo campo",
  },
  {
    nombre: "a mano desde main, sin promover",
    github: aMano({}),
    corren: ["dev", "guardas"],
    motivo: "es la primera publicacion que pide la guia",
  },
  {
    nombre: "a mano desde main, promoviendo",
    github: aMano({ promover: true }),
    corren: ["guardas", "produccion"],
    motivo: "la promocion es el unico camino a produccion, y sale de main",
  },
  {
    nombre: "a mano desde otra rama, sin promover",
    github: aMano({ rama: "feat/algo" }),
    corren: ["guardas"],
    motivo: "la credencial de DEV es de toda la cuenta: codigo que no esta en main no la alcanza",
  },
  {
    nombre: "a mano desde otra rama, promoviendo",
    github: aMano({ rama: "feat/algo", promover: true }),
    corren: ["guardas"],
    motivo: "produccion sale solo de main",
  },
];

const workflow = () => fs.readFileSync(WORKFLOW, "utf-8");
const sinComentarios = (t) =>
  t
    .split("\n")
    .filter((l) => !/^\s*#/.test(l))
    .join("\n");

/** Que jobs corren con este evento, leyendo SOLO la condicion de cada uno. */
function queCorre(texto, github) {
  return jobsConCondiciones(texto)
    .filter((j) => j.si === null || veraz(evaluar(j.si, contexto(github))))
    .map((j) => j.nombre)
    .sort();
}

/** Los jobs que tocan un secreto en alguna linea ejecutable. */
const jobsConSecretos = (texto) =>
  jobsConCondiciones(texto)
    .filter((j) => /\bsecrets\./.test(sinComentarios(j.cuerpo)))
    .map((j) => j.nombre);

/** Todo lo que un workflow hace mal contra la tabla de casos. Es LA funcion que
 *  corre la regla y la que corren las refutaciones: si la mutacion probara contra
 *  una copia de la logica, no probaria nada. */
function desviosDeLaTabla(texto) {
  const mal = [];
  const conSecretos = new Set(jobsConSecretos(texto));
  for (const c of CASOS) {
    const corren = queCorre(texto, c.github);
    const esperados = [...c.corren].sort();
    if (corren.join(",") !== esperados.join(",")) {
      mal.push(`${c.nombre}: corren [${corren}] y tienen que correr [${esperados}] (${c.motivo})`);
    }
  }
  // La propiedad dicha sin tabla: con el evento del fork, NINGUN job que vea un
  // secreto corre. Es la que importa, y se comprueba aparte para que agregar un
  // job nuevo con secretos no pueda pasar por no estar en la tabla.
  const fork = CASOS.find((c) => c.nombre.startsWith("pull request desde un FORK"));
  const expuestos = queCorre(texto, fork.github).filter((j) => conSecretos.has(j));
  if (expuestos.length) mal.push(`con un PR desde un fork corren jobs que ven secretos: ${expuestos.join(", ")}`);
  return mal;
}

/** Reemplaza la condicion de un job por otra, en memoria. */
function conCondicion(texto, job, nueva) {
  const lineas = texto.split("\n");
  const desde = lineas.indexOf(`  ${job}:`);
  assert.notEqual(desde, -1, `el job ${job} no esta: la mutacion no tiene donde caer`);
  let i = desde + 1;
  while (i < lineas.length && !/^ {4}if:/.test(lineas[i])) i += 1;
  assert.ok(i < lineas.length, `el job ${job} no tiene if: la mutacion no tiene donde caer`);
  let fin = i + 1;
  while (fin < lineas.length && (/^ {5,}\S/.test(lineas[fin]) || lineas[fin].trim() === "")) fin += 1;
  lineas.splice(i, fin - i, `    if: ${nueva}`);
  return lineas.join("\n");
}

// ---------------------------------------------------------------------------
// LAS GUARDAS DEL PROPIO BANCO: sin esto, todo lo de abajo pasa vacio.
// ---------------------------------------------------------------------------

test("el lector ve los jobs y sus condiciones: un cero aca es este banco roto", () => {
  const jobs = jobsConCondiciones(workflow());
  const nombres = jobs.map((j) => j.nombre).sort();
  assert.deepEqual(nombres, ["dev", "guardas", "produccion"], "el workflow cambio de forma: revisa la tabla de casos antes que nada");
  for (const j of jobs) {
    assert.ok(j.si, `el job ${j.nombre} no tiene condicion: correria con CUALQUIER evento, incluido el del fork`);
  }
  assert.ok(jobsConSecretos(workflow()).length >= 2, "el lector no ve los jobs que leen secretos: la propiedad del fork quedaria vacia");
});

test("el evaluador entiende la semantica de GitHub, no la de JavaScript", () => {
  const g = { github: { a: "Main", n: null, obj: { x: "1" } } };
  assert.equal(evaluar("github.a == 'main'", g), true, "GitHub compara cadenas sin distinguir mayusculas");
  assert.equal(evaluar("github.nada.mas.abajo == 'x'", g), false, "navegar desde lo que no existe da null, no un error");
  assert.equal(evaluar("github.n == null", g), true);
  assert.equal(evaluar("!(github.a != 'MAIN') && github.obj.x == 1", g), true, "tipos distintos se comparan como numeros");
  assert.equal(evaluar("github.n || 'defecto'", g), "defecto", "`||` devuelve el operando, no un booleano");
  assert.equal(evaluar("${{ github.a == 'main' }}", g), true, "las llaves de expresion se aceptan");
  assert.throws(() => evaluar("contains(github.a, 'x')", g), /funcion no soportada/, "lo que no entiende LANZA, no adivina");
  assert.throws(() => evaluar("otro.contexto == 'x'", g), /no esta en el banco/, "un contexto olvidado no se lee como null");
});

// ---------------------------------------------------------------------------
// LA REGLA
// ---------------------------------------------------------------------------

test("el filtro `branches:` del disparo deja pasar al fork: por eso no es una guarda", () => {
  // Se afirma EN VOZ ALTA lo que motivo todo: si alguien vuelve a leer
  // `branches: [main]` como proteccion, este caso le dice que no lo es.
  const fork = CASOS.find((c) => c.nombre.startsWith("pull request desde un FORK")).github;
  assert.equal(elDisparoDejaPasar(workflow(), fork), true, "el modelo del disparo tiene que dejar pasar al fork, como GitHub");
  const trabajo = CASOS.find((c) => c.nombre === "pull request del mismo repositorio desde una rama de trabajo").github;
  assert.equal(elDisparoDejaPasar(workflow(), trabajo), false, "y frenar una rama que no se llama main: si no, el modelo no mide nada");
});

test("con cada evento corren exactamente los jobs que tienen que correr", () => {
  const mal = desviosDeLaTabla(workflow());
  assert.deepEqual(
    mal,
    [],
    "la condicion de algun job deja pasar un evento que no deberia, o frena uno que deberia pasar. El que mas importa " +
      "es el del fork: su codigo no puede correr al lado de una credencial que publica. El arreglo va en el `if:` del " +
      "job, no en el filtro del disparo, que compara un nombre de rama que el fork elige:\n  " +
      mal.join("\n  "),
  );
});

test("el disparo a mano desde otra rama NO se va en silencio: se pone rojo y dice desde donde", async () => {
  // Con dev y produccion saltados, una corrida desde otra rama terminaria GRIS y
  // sin una palabra, y quien la disparo creeria que publico. Un paso de `guardas`
  // la pone roja con el arreglo escrito.
  const guardas = jobsConCondiciones(workflow()).find((j) => j.nombre === "guardas");
  const rechazo = guardas.pasos.find((p) => /otra rama/i.test(p.name ?? ""));
  assert.ok(rechazo, "no hay un paso en `guardas` que rechace el disparo desde otra rama");
  for (const c of CASOS) {
    const aManoDesdeOtra = c.github.event_name === "workflow_dispatch" && c.github.ref !== "refs/heads/main";
    const corre = queCorre(workflow(), c.github).includes("guardas") && veraz(evaluar(rechazo.si, contexto(c.github)));
    assert.equal(corre, aManoDesdeOtra, `${c.nombre}: el rechazo ${corre ? "corre" : "no corre"} y tendria que ${aManoDesdeOtra ? "correr" : "no correr"}`);
  }
  const r = await correrPaso(rechazo.run, { RAMA: "feat/algo" });
  assert.notEqual(r.codigo, 0, "el rechazo tiene que poner la corrida en rojo");
  assert.match(r.salida, /::error::/, "y decirlo como error");
  assert.match(r.salida, /feat\/algo/, "nombrando la rama desde la que se disparo");
  assert.match(r.salida, /main/, "y cual es la unica desde la que se publica");
  assert.match(r.salida, /Use workflow from/, "con el arreglo escrito: donde se elige la rama en el formulario");
});

test("la credencial guardada donde cualquier job la lee se AVISA en cada corrida", async () => {
  // Un secreto de repositorio lo resuelve cualquier job de cualquier workflow; el
  // de un environment solo un job que lo declara, y el environment con politica
  // de rama `main` solo si corre desde main. `guardas` NO declara environment a
  // proposito: asi lo que lee es exactamente lo que ve cualquier otro job.
  const guardas = jobsConCondiciones(workflow()).find((j) => j.nombre === "guardas");
  assert.ok(!/^ {4}environment:/m.test(guardas.cuerpo), "`guardas` declara un environment: dejaria de ver lo que ve cualquier job");
  const aviso = guardas.pasos.find((p) => /CLOUDFLARE_API_TOKEN/.test(Object.values(p.env).join(" ")));
  assert.ok(aviso, "no hay un paso que mire si la credencial esta al alcance de cualquier job");
  const variable = Object.entries(aviso.env).find(([, v]) => /secrets\.CLOUDFLARE_API_TOKEN/.test(v))[0];

  const con = await correrPaso(aviso.run, { [variable]: "un-valor-cualquiera" });
  assert.equal(con.codigo, 0, "es un aviso: el arreglo es configuracion de GitHub, fuera del arbol del proyecto");
  assert.match(con.salida, /::warning::/, "tiene que quedar en amarillo");
  assert.match(con.salida, /produccion/, "y decir a que environment moverla");
  assert.ok(!con.salida.includes("un-valor-cualquiera"), "el aviso JAMAS imprime el valor");

  const sin = await correrPaso(aviso.run, { [variable]: "" });
  assert.equal(sin.codigo, 0);
  assert.doesNotMatch(sin.salida, /::warning::/, "sin credencial de repositorio no hay nada que avisar");
});

test("todo job que trae el arbol y ve la credencial declara su environment", () => {
  // El environment es la segunda llave: un secreto que vive SOLO en `dev` o en
  // `produccion` no lo resuelve un job que no los declara, y con politica de rama
  // `main` no lo resuelve un job que corre desde otra. Sin el environment, el
  // job lee el secreto de repositorio, que es el que cualquiera alcanza.
  const esperado = { dev: "dev", produccion: "produccion" };
  for (const j of jobsConCondiciones(workflow())) {
    const traeArbol = /uses: actions\/checkout@/.test(j.cuerpo);
    const veCredencial = /secrets\.CLOUDFLARE_API_TOKEN/.test(sinComentarios(j.cuerpo));
    if (!traeArbol || !veCredencial) continue;
    const nombre = /^ {4}environment:\s*\n {6}name:\s*(\S+)/m.exec(j.cuerpo)?.[1];
    assert.equal(nombre, esperado[j.nombre], `el job ${j.nombre} trae codigo y ve la credencial sin declarar su environment`);
  }
});

test("ningun checkout deja el token del workflow escrito en el arbol", () => {
  // `actions/checkout` guarda por defecto el token en `.git/config`, y el paso
  // siguiente corre `pnpm install` del codigo traido. Ese codigo no tiene por que
  // poder leerlo.
  const mal = checkoutsSinCerrar(workflow());
  assert.deepEqual(mal, [], `checkouts sin persist-credentials: false: ${mal.join(", ")}`);
});

test("un solo commit por corrida: el que trae el arbol, el que rotula la version y el que se comprueba", () => {
  const t = workflow();
  const dev = jobsConCondiciones(t).find((j) => j.nombre === "dev");
  const fija = dev.pasos.find((p) => p.id === "version");
  assert.ok(fija, "DEV no tiene un paso que fije el commit: cada paso elige el suyo, que es el defecto OPS-04");

  // La derivacion, evaluada: bajo `workflow_run` es el commit que el CI MIDIO,
  // no la punta de main; a mano, la punta de la rama del disparo.
  const expr = fija.env.SHA;
  assert.ok(expr, "el paso que fija el commit no lo deriva de una expresion legible");
  const push = CASOS[0].github;
  assert.equal(evaluar(expr, contexto(push)), VERIFICADO, "bajo workflow_run se rotularia la punta de main y no lo que el CI midio");
  assert.equal(evaluar(expr, contexto(aMano({}))), DISPARO, "a mano tiene que ser el commit del disparo");

  const mal = mezclasDeCommits(dev);
  assert.deepEqual(mal, [], `DEV usa otro commit que el fijado:\n  ${mal.join("\n  ")}`);
});

test("la guia manda la credencial a los environments, no a los secretos del repositorio", () => {
  const readme = fs.readFileSync(README_SITIO, "utf-8");
  const paso4 = readme.slice(readme.indexOf("### 4 ·"), readme.indexOf("### 5 ·"));
  assert.ok(paso4.length > 200, "no se pudo aislar el paso 4 del README: cambio la forma de los encabezados");
  for (const senal of ["Environments", "`dev`", "`produccion`", "main", "Deployment branches"]) {
    assert.ok(paso4.includes(senal), `el paso 4 tiene que nombrar ${senal}`);
  }
  // «New repository secret» sobrevive SOLO en el parrafo del plan que no ofrece
  // environments: ahi es la unica salida, y se dice con su costo.
  for (const parrafo of paso4.split(/\n\s*\n/)) {
    if (/New repository\s*secret/.test(parrafo)) {
      assert.match(parrafo, /plan gratuito/, `el paso 4 manda a «New repository secret» fuera del caso del plan gratuito: «${parrafo.slice(0, 120)}»`);
    }
  }
  const pagina = fs.readFileSync(PAGINA_PUBLICAR, "utf-8");
  assert.doesNotMatch(
    pagina,
    /Secrets and variables → Actions\*\* de tu repositorio, y en\s+ningún otro lado/,
    "docs/10 sigue mandando el token a los secretos del repositorio",
  );
  assert.match(pagina, /`produccion`/, "docs/10 tiene que nombrar el environment donde vive el token");
});

test("la guia no le atribuye al environment la guarda contra el fork: esa es la condicion del job", () => {
  // Hallazgo RV-H3 de la revision adversarial del porte. docs/10 y el README del sitio
  // decian que un environment limitado a `main` solo le llega a codigo que ya paso por
  // un pull request. Bajo `workflow_run` el GITHUB_REF es siempre la rama por defecto
  // (design D1 de el-despliegue-no-le-da-la-llave-al-fork), asi que la politica de rama
  // del environment DEJA PASAR un job disparado por el CI de un fork: lo que lo frena es
  // la condicion de cada job. Quien lee la frase vieja cree que alcanza con el
  // environment, y en el plan que no lo ofrece cree que quedo desprotegido.
  //
  // LIMITE DECLARADO: son las formas exactas que aparecieron, no un detector de la idea.
  const aplanar = (t) => t.replace(/\r?\n[ \t]*>?[ \t]*/g, " ").replace(/[ \t]+/g, " ");
  const FALSAS = [
    "solo llega a un job que corre con código que ya pasó por un pull request",
    "donde únicamente llega código que ya pasó por un pull request",
  ];
  for (const [ruta, nombre] of [[README_SITIO, "plantilla/sitio/README.md"], [PAGINA_PUBLICAR, "docs/10-publicar.md"]]) {
    const texto = aplanar(fs.readFileSync(ruta, "utf-8"));
    for (const f of FALSAS) {
      assert.ok(!texto.includes(f), `${nombre} le atribuye al environment una garantia que no da: «${f}»`);
    }
    assert.match(texto, /segunda llave/, `${nombre} tiene que decir que el environment es la segunda llave`);
    assert.match(texto, /condición/, `${nombre} tiene que nombrar la condición del job como la guarda contra el fork`);
  }
});

// ---------------------------------------------------------------------------
// LAS REFUTACIONES: el caso ROJO, demostrado contra las condiciones REALES que
// tenia el defecto, y una mutacion por cada clausula de las guardas. Cada una
// corre la MISMA funcion que la regla.
// ---------------------------------------------------------------------------

// Tal cual estaban. La primera es la de la 1.9.6 publicada, con el job que
// publicaba en produccion; la segunda la del job `dev` antes de este cambio.
const IF_1_9_6 = "github.event_name == 'workflow_dispatch' || github.event.workflow_run.conclusion == 'success'";
const IF_DEV_ANTERIOR =
  "github.event.workflow_run.conclusion == 'success' || (github.event_name == 'workflow_dispatch' && github.event.inputs.promover_a_produccion != 'true')";

test("ROJO: la condicion de la 1.9.6 y la del job dev anterior dejan pasar al fork, y la regla lo caza", () => {
  const fork = CASOS.find((c) => c.nombre.startsWith("pull request desde un FORK")).github;
  assert.equal(veraz(evaluar(IF_1_9_6, contexto(fork))), true, "la condicion publicada en la 1.9.6 deja correr al fork");
  assert.equal(veraz(evaluar(IF_DEV_ANTERIOR, contexto(fork))), true, "la del job dev anterior tambien");

  for (const [nombre, condicion] of [
    ["1.9.6", IF_1_9_6],
    ["dev anterior", IF_DEV_ANTERIOR],
  ]) {
    const mal = desviosDeLaTabla(conCondicion(workflow(), "dev", condicion));
    assert.ok(
      mal.some((m) => m.startsWith("pull request desde un FORK")),
      `con la condicion ${nombre}, la regla tiene que nombrar el caso del fork. Dijo: ${mal.join(" / ")}`,
    );
    assert.ok(
      mal.some((m) => m.startsWith("con un PR desde un fork corren jobs que ven secretos: dev")),
      `y la propiedad sin tabla tambien. Dijo: ${mal.join(" / ")}`,
    );
  }
});

test("MUERDE: cada clausula de las guardas es la que frena algun caso", () => {
  const t = workflow();
  const dev = jobsConCondiciones(t).find((j) => j.nombre === "dev").si;
  const prod = jobsConCondiciones(t).find((j) => j.nombre === "produccion").si;
  const guardas = jobsConCondiciones(t).find((j) => j.nombre === "guardas").si;
  const sacar = (condicion, clausula) => {
    assert.ok(condicion.includes(clausula), `la condicion no tiene «${clausula}»: la mutacion no probaria nada`);
    return condicion.replace(clausula, "true");
  };
  const mutaciones = [
    ["dev", sacar(dev, "github.event.workflow_run.event == 'push'"), "pull request del mismo repositorio desde su main hacia otra base"],
    ["dev", sacar(dev, "github.event.workflow_run.head_repository.full_name == github.repository"), "defensa en profundidad"],
    ["dev", sacar(dev, "github.event.workflow_run.head_branch == 'main'"), "push a una rama que no es main"],
    ["dev", sacar(dev, "github.event.workflow_run.conclusion == 'success'"), "push propio a main con el CI en rojo"],
    ["dev", sacar(dev, "github.ref == 'refs/heads/main'"), "a mano desde otra rama, sin promover"],
    ["produccion", sacar(prod, "github.ref == 'refs/heads/main'"), "a mano desde otra rama, promoviendo"],
    ["guardas", "true", "pull request desde un FORK"],
  ];
  assert.equal(guardas === "true", false, "`guardas` no tiene condicion propia: la ultima mutacion no mediria nada");
  for (const [job, condicion, caso] of mutaciones) {
    const mal = desviosDeLaTabla(conCondicion(t, job, condicion));
    assert.ok(
      mal.some((m) => m.startsWith(caso)),
      `sacada una clausula de ${job}, el caso «${caso}» tenia que ponerse rojo. Dijo: ${mal.join(" / ") || "nada"}`,
    );
  }
});

test("MUERDE: un checkout que vuelve a guardar el token se caza", () => {
  const mutado = workflow().replace(/\n {10}persist-credentials: false/, "");
  assert.equal(checkoutsSinCerrar(mutado).length, 1, "sacado un persist-credentials, la deteccion tiene que ver exactamente uno");
});

test("MUERDE: la mezcla de commits de antes de este cambio se caza", () => {
  // El job dev anterior rotulaba con la punta de main (`GITHUB_SHA`) lo que habia
  // traido del commit medido (`head_sha`): bajo `workflow_run` son distintos si
  // entro otro merge mientras el CI corria, y la version quedaba con el nombre de
  // un commit y el codigo de otro.
  const dev = jobsConCondiciones(workflow()).find((j) => j.nombre === "dev");
  const anterior = {
    ...dev,
    pasos: dev.pasos.map((p) =>
      p.name === "Subir la version a DEV" ? { ...p, env: { ...p.env }, run: p.run.replace(/"\$\{SHA\}"/g, '"${GITHUB_SHA}"') } : p,
    ),
  };
  anterior.pasos.push({ name: "Traer el arbol (anterior)", id: null, env: {}, with: ["ref: ${{ github.event.workflow_run.head_sha }}"], run: null, texto: "" });
  const mal = mezclasDeCommits(anterior);
  assert.ok(mal.some((m) => /GITHUB_SHA/.test(m)), `la etiqueta con la punta de main tiene que cazarse. Dijo: ${mal.join(" / ")}`);
  assert.ok(mal.some((m) => /head_sha/.test(m)), `y el checkout que elige su propio commit tambien. Dijo: ${mal.join(" / ")}`);
});

// ---------------------------------------------------------------------------
// AUXILIARES
// ---------------------------------------------------------------------------

/** Los checkouts sin `persist-credentials: false`, por linea. */
function checkoutsSinCerrar(texto) {
  const lineas = texto.split("\n");
  const mal = [];
  for (let i = 0; i < lineas.length; i += 1) {
    if (!/^\s*uses: actions\/checkout@/.test(lineas[i])) continue;
    let cerrado = false;
    for (let j = i + 1; j < lineas.length && !/^ {6}- /.test(lineas[j]) && !/^ {2}\S/.test(lineas[j]); j += 1) {
      if (/^\s*persist-credentials:\s*false\s*$/.test(lineas[j])) cerrado = true;
    }
    if (!cerrado) mal.push(`linea ${i + 1}`);
  }
  return mal;
}

/** Las referencias a un commit dentro de DEV que no pasan por el fijado.
 *
 *  Fuera del paso `version`, ningun paso de DEV puede nombrar `github.sha`,
 *  `GITHUB_SHA` ni `head_sha`: todo commit sale de `steps.version.outputs.sha`. */
function mezclasDeCommits(job) {
  const mal = [];
  for (const p of job.pasos) {
    if (p.id === "version") continue;
    // Los comentarios del script quedan fuera: el que explica por que se dejo de
    // usar GITHUB_SHA tiene que poder nombrarlo sin romper el control.
    const run = (p.run ?? "")
      .split("\n")
      .filter((l) => !/^\s*#/.test(l))
      .join("\n");
    const ejecutable = [Object.values(p.env).join("\n"), p.with.join("\n"), run].join("\n");
    for (const m of ejecutable.matchAll(/github\.sha|GITHUB_SHA|head_sha/g)) {
      mal.push(`paso «${p.name}»: nombra ${m[0]} en vez del commit fijado`);
    }
  }
  return mal;
}

/** Corre el `run:` de un paso con bash, con el entorno dado. */
async function correrPaso(script, entorno) {
  assert.ok(script && script.trim(), "el paso no tiene `run:` que correr: el lector lo corto mal");
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "llave-"));
  fs.writeFileSync(path.join(dir, "paso.sh"), script);
  try {
    const { stdout, stderr } = await correrAsync("bash", [path.join(dir, "paso.sh")], {
      encoding: "utf8",
      env: { PATH: process.env.PATH, ...entorno },
    });
    return { codigo: 0, salida: `${stdout}${stderr}` };
  } catch (e) {
    return { codigo: e.code ?? -1, salida: `${e.stdout ?? ""}${e.stderr ?? ""}` };
  }
}
