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
// ── LO QUE ESTE BANCO ASUMIA Y DEJO DE SER CIERTO ──────────────────────────
// Estaba escrito como si Terraform APLICARA SIEMPRE: el camino 1 era "todavia no
// hay infraestructura", un estado transitorio de camino a los otros cuatro. Desde
// que el marco dejo de fijar la nube, ya no lo es. El proyecto declara su
// plataforma —`supabase`, `cloudflare`, `gcp`, `aws` o `ninguna`— y hay dos
// familias enteras para las que el camino 1 es el estado NORMAL Y PERMANENTE:
// `ninguna`, que es una respuesta de primera clase y no un hueco, y cualquier
// plataforma cuyo despliegue no pasa por Terraform. Para esos proyectos, este paso
// no puede ponerse rojo NUNCA — ni siquiera vencida la ventana.
//
// Y el camino 1 no lo media: corria con la ventana por defecto (2999-12-31), o sea
// DENTRO de la ventana, donde el paso no se pone rojo por nada. "Sale verde" era
// verdad por el motivo equivocado. El caso 6 vence la ventana y ademas le saca el
// binario, que es la unica forma de distinguir "el paso es inerte" de "la ventana
// todavia lo tapa".
//
// LOS TRES CAMINOS QUE SE AGREGARON, todos sobre el mismo script extraido:
//   6. `ninguna`: sin raices, ventana VENCIDA y sin binario -> verde y sin error;
//   7. una plataforma sin Terraform (archivos de otro proveedor en el arbol) no
//      inventa raices: mismo camino 1, verde;
//   8. LA TRAMPA, medida: un `infra/` que quedo con documentacion y sin un solo
//      `.tf` SIGUE contando como raiz, porque el paso mira si el DIRECTORIO
//      existe. Vencida la ventana y sin binario, eso es ROJO en un proyecto que
//      no usa Terraform. Es la razon por la que infra/adaptadores.md dice que al
//      elegir una plataforma sin Terraform se borra el directorio ENTERO y ese
//      archivo se mueve a la raiz.
//
// ── EL PISO DE ARRIBA, QUE ES DONDE ESTABA EL AGUJERO DE VERDAD ────────────
// Los caminos 6, 7 y 8 corren sobre arboles FABRICADOS. Eso los deja probar la
// logica del paso y, exactamente por eso, NO prueban nada sobre el andamio: un
// caso que arma `raices: []` demuestra que "un repo sin raices sale verde", no
// que el repo que `projects init` produce sea uno de esos. Durante una ronda el
// andamio declaro `plataforma: "ninguna"` MIENTRAS repartia las dos raices de
// Terraform, y las 17 pruebas de este archivo siguieron verdes: ninguna comparaba
// la clave declarada contra lo que hay en el disco de plantilla/.
//
// Por eso el bloque del final compara las dos mitades —lo que el andamio DICE y
// lo que REPARTE— y ademas corre el paso extraido contra el reparto REAL, no
// contra uno inventado. Si vuelven a separarse, esto se pone rojo antes de que
// nadie instancie nada.
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
 *
 * `archivos` escribe rutas sueltas (clave = ruta relativa con "/", valor =
 * contenido) SIN crear ningun `.tf`. Es lo que hace medibles los arboles de una
 * plataforma que no usa Terraform: un `wrangler.toml`, un `supabase/config.toml`
 * o un `infra/` que quedo solo con documentacion.
 */
function correr({ raices = [], archivos = {}, ventana = "2999-12-31", conBinario = true, rc = {} } = {}) {
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

// ---------------------------------------------------------------------------
// LA PLATAFORMA: los caminos que aparecieron cuando el marco dejo de fijar la nube
// ---------------------------------------------------------------------------

test("terraform · 6 · `ninguna`: sin raices, VENTANA VENCIDA y sin binario, sigue verde", () => {
  // El caso 1 corria dentro de la ventana, que es donde el paso no se pone rojo
  // por nada: "salio verde" no distinguia entre un paso inerte y uno tapado por
  // la fecha. Aca la ventana esta vencida Y no hay binario —las dos condiciones
  // que en el caso 3 dan ROJO— y tiene que seguir verde, porque no hay
  // infraestructura que verificar. Es la garantia que vuelve a `ninguna` una
  // respuesta de primera clase: un proyecto que no despliega no amanece rojo el
  // dia que vence una ventana que no lo nombra.
  const { code, salida } = correr({ raices: [], ventana: "2000-01-01", conBinario: false });
  assert.equal(code, 0, "un repositorio sin raices de Terraform no puede ponerse rojo, ni vencida la ventana");
  assert.match(salida, /::notice::no hay raices de Terraform/);
  assert.doesNotMatch(salida, /::error::/);
  assert.doesNotMatch(salida, /::warning::/, "no hay nada de que avisar: no falta un binario que no hace falta");
});

test("terraform · 7 · una plataforma sin Terraform no inventa raices", () => {
  // El arbol de un proyecto que eligio otra plataforma: su configuracion de
  // despliegue existe, y NO es Terraform. El paso mira `infra` e `infra-prod` y
  // nada mas, asi que esto tiene que leerse igual que un repositorio vacio.
  const { code, salida } = correr({
    raices: [],
    archivos: {
      "wrangler.toml": 'name = "api"\n',
      "supabase/config.toml": "[db]\nport = 54322\n",
      "adaptadores.md": "# Adaptadores de plataforma\n",
    },
    ventana: "2000-01-01",
    conBinario: false,
  });
  assert.equal(code, 0);
  assert.match(salida, /::notice::no hay raices de Terraform/);
  assert.doesNotMatch(salida, /::error::/);
});

test("terraform · 8 · TRAMPA: un `infra/` sin un solo .tf sigue contando como raiz", () => {
  // LO QUE SE MIDE ACA ES EL COMPORTAMIENTO DE HOY, no el deseado. El paso decide
  // con `[ -d infra ]`: le alcanza con que el DIRECTORIO exista. Asi que un
  // proyecto que eligio `supabase`, borro los `.tf` y se dejo `infra/` con la
  // documentacion adentro queda exigiendo un binario de Terraform que no usa —y,
  // vencida la ventana, con el CI rojo por infraestructura que no tiene.
  //
  // Por eso infra/adaptadores.md dice que al elegir una plataforma sin Terraform
  // se borra el directorio ENTERO y ese archivo se mueve a la raiz: mientras el
  // paso mire directorios y no archivos `.tf`, dejar la carpeta es la trampa.
  //
  // El arreglo de fondo esta en el paso y no aca: que la deteccion sea por
  // presencia de `*.tf`. Cuando eso cambie, esta prueba se pone roja y hay que
  // reescribirla — que es exactamente lo que se quiere de una trampa documentada.
  const { code, salida } = correr({
    raices: [],
    archivos: { "infra/adaptadores.md": "# Adaptadores de plataforma\n" },
    ventana: "2000-01-01",
    conBinario: false,
  });
  assert.match(salida, /::error::hay raices de Terraform \(infra\)/);
  assert.equal(code, 1, "hoy el directorio vacio de .tf basta para exigir Terraform: si esto salio 0, la deteccion cambio");
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
 * un repositorio que amanece rojo el dia que vence la ventana por infraestructura
 * que su propio registro dice que no tiene.
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
        `nacido va a exigir un binario de Terraform que su plataforma no usa —y en rojo, en cuanto venza la ` +
        `ventana—. Arreglo: o el andamio deja de repartir esas raices, o la clave dice \`aws\``,
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
  // script extraido sobre las raices que plantilla/ tiene de verdad, con la
  // ventana vencida y sin binario, que es el escenario mas duro. No mide una
  // preferencia: mide que la documentacion del repo que nace y el comportamiento
  // del CI de ese repo digan lo mismo.
  const presentes = Object.entries(repartoDelAndamio())
    .filter(([, n]) => n !== null)
    .map(([d]) => d);
  const { code, salida } = correr({ raices: presentes, ventana: "2000-01-01", conBinario: false });

  if (plataformaDelAndamio() === "aws") {
    // El repositorio nace CON infraestructura, asi que este paso es una compuerta
    // real y despues de la ventana detiene: o alguien agrega
    // hashicorp/setup-terraform pinado por SHA, o borra las raices al elegir otra
    // plataforma. Las dos salidas estan escritas en AGENTS.md y en infra/README.md;
    // lo que no puede pasar es que el marco prometa verde y el paso de rojo.
    assert.equal(code, 1, "el andamio reparte raices de Terraform: vencida la ventana este paso TIENE que detener");
    assert.match(salida, /::error::hay raices de Terraform/);
  } else {
    assert.equal(code, 0, "el andamio no reparte raices: este paso no puede ponerse rojo ni vencida la ventana");
    assert.match(salida, /::notice::no hay raices de Terraform/);
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
