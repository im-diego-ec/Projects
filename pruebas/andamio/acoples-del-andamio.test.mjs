// LOS ACOPLES DEL ANDAMIO: DOS ARCHIVOS QUE TIENEN QUE DECIR LO MISMO.
//
// POR QUE EXISTE ESTE BANCO. El andamio reparte varios pares de archivos donde
// el valor esta escrito DOS VECES y nada obliga a que coincidan. Cada uno de
// esos pares se arreglo alguna vez a mano, y quedo coincidiendo «porque alguien
// lo escribio bien», no porque algo lo exigiera. Los cinco que se vigilan aca
// estaban, los cinco, sin una sola asercion detras:
//
//   1. El .gitignore del andamio y los nombres de .env que el ecosistema Node
//      genera solos. Se arreglo con el patron `.env.*`; borrar esa linea —o
//      agregarle un `!.env.dev` para «desbloquear» un archivo propio— no rompia
//      nada y devolvia la fuga de credenciales tal cual estaba.
//   2. El POSTGRES_DB de docker-compose.yml y el ultimo segmento del
//      DATABASE_URL de api/.env.example. Divergir deja el contenedor sirviendo
//      una base que el API no nombra, y el sintoma no se ve: `prisma migrate
//      dev` autocrea la que falte.
//   3. El usuario NO ROOT de api/Dockerfile. Borrar `USER node` salia verde.
//   4. La arquitectura del computo, escrita en el `--platform` de api/Dockerfile
//      y en el pendiente de infra que va a crear el servicio. Si divergen, la
//      tarea muere al arrancar con "exec format error", que no nombra la
//      arquitectura.
//   5. El contrato entre el front y el API DEL MISMO ANDAMIO: los esquemas Zod
//      de web/src/App.tsx, los `res.json` de api/src/app.ts y los dobles de
//      web/src/App.test.tsx. Los tres se habian separado: el front validaba
//      `status`/`message`, el API respondia `estado`/`mensaje`, y el banco del
//      front doblaba los campos inventados — asi que los seis casos del front
//      pasaban en verde contra un API que no existe mientras la portada del
//      hello-world mostraba siempre "el API respondio algo que no entiendo".
//
// CADA COMPROBACION MUERDE. Ninguna se conforma con leer el arbol: se mutan
// copias en un directorio temporal —nunca el arbol del repo— y se exige que la
// comprobacion que le toca reporte el problema. Una comprobacion que no se vio
// fallar no es una comprobacion.
import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const ANDAMIO = path.join(RAIZ, "plantilla");

const leer = (rel) => fs.readFileSync(path.join(ANDAMIO, rel), "utf8");

/** Un directorio temporal propio, borrado pase lo que pase. */
function enTemporal(prefijo, fn) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), `projects-${prefijo}-`));
  try {
    return fn(tmp);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

// ---------------------------------------------------------------------------
// 1 · EL .gitignore DEL ANDAMIO IGNORA TODA VARIANTE DE .env, Y NINGUN
//     .env.example
//
// No se lee el archivo ni se busca el patron con una expresion regular: se le
// PREGUNTA A GIT. Las reglas de .gitignore tienen precedencia, negacion y
// anclaje, y una guarda que reimplementara esa semantica estaria verificando su
// propia copia de las reglas en vez del comportamiento que importa. Se arma un
// repositorio vacio en un temporal, se le pone este .gitignore tal cual y se
// corre `git check-ignore` sobre una lista de nombres.
//
// ── AISLAMIENTO ────────────────────────────────────────────────────────────
// El repo de prueba corre con HOME apuntando al temporal y con
// GIT_CONFIG_NOSYSTEM=1: sin eso, un `core.excludesFile` en la maquina de quien
// corre el banco podria ignorar nombres por su cuenta y esta prueba pasaria en
// verde por una razon que no viaja al repo nuevo.
// ---------------------------------------------------------------------------

// Los nombres que el ecosistema Node normaliza y que un desarrollador crea sin
// pensarlo. Los cuatro del medio son los que la version anterior del .gitignore
// dejaba entrar: lo que hay adentro esta declarado en api/.env.example
// (SUPABASE_URL, SUPABASE_ANON_KEY y SUPABASE_JWT_SECRET), y una clave del
// proveedor de identidad en la historia de git ya no se saca borrando el archivo.
const NO_PUEDEN_ENTRAR = [
  ".env",
  ".env.local",
  ".env.production",
  ".env.development",
  ".env.dev",
  ".env.test",
  ".env.staging",
  "api/.env.dev",
  "api/.env.test",
  "web/.env.production",
  // LO QUE ESCRIBE PLAYWRIGHT CUANDO UNA PRUEBA FALLA, y por que esta en la
  // MISMA lista que los .env y no en una aparte: el criterio de esta lista no es
  // "es un secreto", es "una herramienta lo escribe sola y el `git add -A` del
  // Paso 9 lo sube sin que nadie lo decida".
  //
  // MEDIDO en una maquina sin navegadores instalados --el estado normal la
  // primera vez--: `pnpm e2e` falla, deja `e2e/test-results/` escrito, y el
  // `pnpm verificar` SIGUIENTE sale rojo por archivos que la persona nunca
  // escribio. Es el mismo caso que `coverage/` y `**/.astro/`, que ya estaban.
  "e2e/test-results/traza.zip",
  "test-results/captura.png",
];

// Los dos ejemplos que el andamio SI versiona, mas la raiz: si la negacion se
// perdiera, un repo nuevo naceria sin la plantilla de variables y nadie sabria
// que variables hay que poner.
const TIENEN_QUE_ENTRAR = [".env.example", "api/.env.example", "web/.env.example"];

/** Los nombres que `git check-ignore` declara ignorados bajo ese .gitignore. */
function ignoradosPorGit(textoGitignore, nombres) {
  return enTemporal("gitignore", (tmp) => {
    const entorno = { ...process.env, HOME: tmp, XDG_CONFIG_HOME: tmp, GIT_CONFIG_NOSYSTEM: "1" };
    execFileSync("git", ["init", "-q", tmp], { env: entorno, stdio: "ignore" });
    fs.writeFileSync(path.join(tmp, ".gitignore"), textoGitignore, "utf8");
    // check-ignore sale 1 cuando NINGUN nombre esta ignorado: es un resultado,
    // no un error, y por eso se lee el stdout del throw en vez de propagarlo.
    let salida = "";
    try {
      salida = execFileSync("git", ["-C", tmp, "check-ignore", "--stdin"], {
        input: nombres.join("\n"),
        env: entorno,
        encoding: "utf8",
      });
    } catch (e) {
      if (e.status !== 1) throw e;
      salida = String(e.stdout ?? "");
    }
    return new Set(salida.split("\n").map((l) => l.trim()).filter(Boolean));
  });
}

/** Los problemas de un .gitignore del andamio, medidos con git. */
function problemasDeEnv(textoGitignore) {
  const ignorados = ignoradosPorGit(textoGitignore, [...NO_PUEDEN_ENTRAR, ...TIENEN_QUE_ENTRAR]);
  const problemas = [];
  for (const n of NO_PUEDEN_ENTRAR) {
    if (!ignorados.has(n)) problemas.push(`SE COMMITEA ${n}: el .gitignore del andamio lo deja entrar a la historia`);
  }
  for (const n of TIENEN_QUE_ENTRAR) {
    if (ignorados.has(n)) problemas.push(`IGNORADO ${n}: el andamio tiene que versionar sus ejemplos de variables`);
  }
  return problemas;
}

test("andamio · ninguna variante de .env puede entrar a la historia, y los .env.example si", () => {
  assert.deepEqual(
    problemasDeEnv(leer(".gitignore")),
    [],
    "plantilla/.gitignore dejo de cubrir alguna variante de .env. Arreglo: el patron es `.env.*` con `!.env.example` DESPUES, no una lista de nombres",
  );
});

test("andamio · la comprobacion de .env MUERDE", () => {
  const texto = leer(".gitignore");
  // La version anterior, textual: tres nombres literales en vez del patron.
  const ancla = ".env\n.env.*\n!.env.example\n";
  assert.ok(texto.includes(ancla), "el ancla de la mutacion se movio: esta prueba estaba mutando en vacio");
  const mutado = texto.replace(ancla, ".env\n.env.local\n.env.production\n");
  const fugados = problemasDeEnv(mutado)
    .filter((p) => p.startsWith("SE COMMITEA "))
    .map((p) => p.slice("SE COMMITEA ".length).split(":")[0]);
  assert.deepEqual(
    fugados,
    [".env.development", ".env.dev", ".env.test", ".env.staging", "api/.env.dev", "api/.env.test"],
    "volver a la lista de nombres literales tiene que dejar entrar exactamente las variantes que el patron cubre",
  );

  // Y la otra mitad del par: una negacion de mas —el «desbloqueo» del archivo
  // propio— reabre el agujero por arriba de la regla.
  const conDesbloqueo = texto.replace(ancla, ".env\n.env.*\n!.env.example\n!.env.dev\n");
  assert.notDeepEqual(problemasDeEnv(conDesbloqueo), [], "un `!.env.dev` agregado despues del patron no fue detectado");

  // Y si se perdiera la negacion, los ejemplos dejarian de viajar.
  const sinNegacion = texto.replace(ancla, ".env\n.env.*\n");
  assert.notDeepEqual(problemasDeEnv(sinNegacion), [], "perder `!.env.example` no fue detectado");
});

// ---------------------------------------------------------------------------
// 2 · EL NOMBRE DE LA BASE LOCAL, ESCRITO EN DOS ARCHIVOS
// ---------------------------------------------------------------------------

/** El valor de POSTGRES_DB del compose, con la marca de si venia entrecomillado. */
function baseDelCompose(texto) {
  const m = texto.match(/^\s*POSTGRES_DB:[ \t]*(.*)$/m);
  if (!m) return null;
  const crudo = m[1].trim();
  const entrecomillado = /^".*"$/.test(crudo);
  return { valor: entrecomillado ? crudo.slice(1, -1) : crudo, entrecomillado };
}

/** El ultimo segmento del DATABASE_URL de api/.env.example. */
function baseDelEnvExample(texto) {
  const m = texto.match(/^DATABASE_URL="?[^"\n]*?\/([^"/\n?]+)"?\s*$/m);
  return m ? m[1] : null;
}

/** Los problemas del acople del nombre de la base. */
function problemasDeLaBase(raizAndamio) {
  const compose = baseDelCompose(fs.readFileSync(path.join(raizAndamio, "docker-compose.yml"), "utf8"));
  const env = baseDelEnvExample(fs.readFileSync(path.join(raizAndamio, "api", ".env.example"), "utf8"));
  const problemas = [];
  if (compose === null) return ["docker-compose.yml no declara POSTGRES_DB: el acople quedo sin un lado que comparar"];
  if (env === null) return ["api/.env.example no declara un DATABASE_URL con nombre de base: el acople quedo sin un lado que comparar"];
  if (compose.valor !== env) {
    problemas.push(
      `el contenedor sirve la base "${compose.valor}" y api/.env.example apunta a "${env}". Arreglo: los dos salen del MISMO marcador, {{PROYECTO}}`,
    );
  }
  // Un marcador sin comillas no rompe el YAML: lo convierte en otra cosa. `{`
  // abre un mapa en flujo, asi que el valor parsea como un mapa anidado y no
  // como texto, y no hay error que mirar.
  if (compose.valor.includes("{") && !compose.entrecomillado) {
    problemas.push("POSTGRES_DB lleva un marcador SIN comillas: en YAML eso parsea como un mapa, no como texto");
  }
  return problemas;
}

test("andamio · el POSTGRES_DB del compose y el DATABASE_URL del API nombran la misma base", () => {
  assert.deepEqual(problemasDeLaBase(ANDAMIO), []);
  // Sin marcador, los dos lados coincidirian por un literal que projects init
  // no toca y todo repo nuevo naceria con el nombre del andamio.
  assert.equal(baseDelCompose(leer("docker-compose.yml")).valor, "{{PROYECTO}}");
});

test("andamio · la comprobacion del nombre de la base MUERDE", () => {
  const mutaciones = [
    {
      nombre: "el compose vuelve a un literal fijo",
      mutar: (raiz) => reemplazar(path.join(raiz, "docker-compose.yml"), 'POSTGRES_DB: "{{PROYECTO}}"', 'POSTGRES_DB: "appdb"'),
    },
    {
      nombre: "el DATABASE_URL apunta a otra base",
      mutar: (raiz) => reemplazar(path.join(raiz, "api/.env.example"), "5432/{{PROYECTO}}", "5432/appdb"),
    },
    {
      nombre: "al marcador del compose le sacan las comillas",
      mutar: (raiz) => reemplazar(path.join(raiz, "docker-compose.yml"), 'POSTGRES_DB: "{{PROYECTO}}"', "POSTGRES_DB: {{PROYECTO}}"),
    },
  ];
  for (const m of mutaciones) {
    enTemporal("base", (tmp) => {
      const copia = path.join(tmp, "plantilla");
      fs.cpSync(ANDAMIO, copia, { recursive: true });
      m.mutar(copia);
      assert.notDeepEqual(problemasDeLaBase(copia), [], `la mutacion "${m.nombre}" no fue detectada`);
    });
  }
});

/** Reemplazo textual que se niega a pasar en vacio. */
function reemplazar(archivo, de, a) {
  const antes = fs.readFileSync(archivo, "utf8");
  const despues = antes.replace(de, a);
  assert.notEqual(despues, antes, `el ancla "${de}" ya no esta en ${archivo}: la mutacion habria pasado en vacio`);
  fs.writeFileSync(archivo, despues, "utf8");
}

// ---------------------------------------------------------------------------
// 3 · LA IMAGEN DEL API NO ATIENDE HTTP COMO ROOT
//
// Es un escaneo de TEXTO del Dockerfile, y esta declarado: no construye la
// imagen ni la corre. Lo que verifica es el ORDEN de las instrucciones, que es
// donde vive el defecto —un `USER node` puesto antes del install deja el
// install sin permisos; puesto despues del CMD no lo aplica nadie— y que el
// chown y el cache de corepack, que son sus dos precondiciones, sigan ahi. Lo
// que NO puede afirmar —que el proceso corra de verdad como `node` y que pnpm
// se resuelva sin salir a la red— queda escrito al final del propio Dockerfile
// con el comando exacto de docker que lo mide.
// ---------------------------------------------------------------------------

/** Los problemas de no-root de un Dockerfile del API. */
function problemasDeNoRoot(texto) {
  const lineas = texto.split(/\r?\n/);
  const donde = (re) => lineas.findIndex((l) => re.test(l));
  const problemas = [];

  const user = donde(/^USER\s+node\s*$/);
  if (user === -1) return ["el Dockerfile no baja de root: falta `USER node`, y todo lo de abajo corre como uid 0"];

  const install = donde(/^RUN\s+pnpm\s+install/);
  const generate = donde(/prisma\s+generate/);
  const chown = donde(/^RUN\s+chown\s+-R\s+node:node\s+/);
  const cmd = donde(/^CMD\s/);
  const expone = donde(/^EXPOSE\s/);
  const corepackHome = lineas.findIndex((l) => /^ENV\s+COREPACK_HOME=/.test(l));
  const mkdir = donde(/^RUN\s+mkdir\s+-p\s+\/opt\/corepack/);

  if (install === -1) problemas.push("el Dockerfile ya no instala dependencias: este banco quedo mirando al vacio");
  if (install > user) problemas.push("`USER node` esta ANTES del install: el install escribe en /app y ahi ya no tiene permiso");
  if (generate === -1) problemas.push("el Dockerfile ya no genera el cliente de datos: este banco quedo mirando al vacio");
  if (generate > user) problemas.push("`USER node` esta ANTES de `prisma generate`: el generate escribe en node_modules y ahi ya no tiene permiso");
  if (chown === -1) problemas.push("falta el `chown -R node:node`: el install y el generate dejan /app en manos de root y el usuario `node` no puede leerlo");
  else if (chown > user) problemas.push("el chown esta DESPUES de `USER node`: un usuario sin privilegio no puede cambiarle el dueno a nada");
  if (cmd === -1 || cmd < user) problemas.push("el CMD no queda debajo de `USER node`: el proceso que atiende HTTP volveria a ser root");
  if (expone !== -1 && expone < user) problemas.push("el EXPOSE quedo arriba del USER: el archivo dejo de leerse en el orden en el que corre");

  if (corepackHome === -1) {
    problemas.push("falta COREPACK_HOME: el pnpm que baja corepack quedaria en el $HOME de root y el usuario `node` no lo veria");
  } else {
    const destino = lineas[corepackHome].replace(/^ENV\s+COREPACK_HOME=/, "").trim();
    if (/^(\/root|~|\$HOME)/.test(destino)) {
      problemas.push(`COREPACK_HOME apunta a ${destino}, que esta dentro del HOME de root: el usuario \`node\` no lo lee y corepack intentaria bajar pnpm otra vez, sin red`);
    }
    if (chown !== -1 && !lineas[chown].includes(destino)) {
      problemas.push(`el chown no incluye ${destino}: el cache de corepack se queda con dueno root`);
    }
    if (mkdir === -1) {
      problemas.push("falta el `mkdir -p /opt/corepack`: si el directorio no existe, el `chown -R` muere con «cannot access» y el build entero se cae");
    } else if (mkdir > chown && chown !== -1) {
      problemas.push("el `mkdir -p /opt/corepack` esta despues del chown: la precondicion se crea tarde");
    }
  }
  return problemas;
}

test("andamio · la imagen del API no atiende HTTP como root", () => {
  assert.deepEqual(problemasDeNoRoot(leer("api/Dockerfile")), []);
});

test("andamio · la comprobacion de no-root MUERDE", () => {
  const texto = leer("api/Dockerfile");
  const mutaciones = [
    { nombre: "se borra `USER node`", mutar: (t) => t.replace(/^USER node\n/m, "") },
    { nombre: "el USER sube arriba del install", mutar: (t) => t.replace(/^USER node\n/m, "").replace(/^(RUN pnpm install)/m, "USER node\n$1") },
    { nombre: "se borra el chown", mutar: (t) => t.replace(/^RUN chown -R node:node .*\n/m, "") },
    { nombre: "COREPACK_HOME vuelve al HOME de root", mutar: (t) => t.replace(/^ENV COREPACK_HOME=.*$/m, "ENV COREPACK_HOME=/root/.cache/node/corepack") },
    { nombre: "se borra el mkdir que el chown necesita", mutar: (t) => t.replace(/^RUN mkdir -p \/opt\/corepack.*$/m, "RUN corepack enable") },
    { nombre: "el CMD se mueve arriba del USER", mutar: (t) => t.replace(/^CMD .*\n/m, "").replace(/^(USER node)$/m, 'CMD ["pnpm", "start"]\n$1') },
  ];
  for (const m of mutaciones) {
    const mutado = m.mutar(texto);
    assert.notEqual(mutado, texto, `la mutacion "${m.nombre}" no cambio nada: el ancla se movio y la prueba mutaba en vacio`);
    assert.notDeepEqual(problemasDeNoRoot(mutado), [], `la mutacion "${m.nombre}" no fue detectada`);
  }
});

// ---------------------------------------------------------------------------
// 4 · LA ARQUITECTURA DEL COMPUTO SE DECLARA EN LOS DOS LADOS
//
// api/Dockerfile fija `--platform` para que la imagen no herede la arquitectura
// de la maquina de quien construye. Ese valor y el `runtime_platform` de la
// definicion de tarea son UNO SOLO escrito dos veces. El puntero era de una
// sola via —el Dockerfile nombraba el pendiente de infra, y el pendiente no
// nombraba al Dockerfile—, que es justo el modo de falla: quien vaya a dimensionar
// el computo no tiene por que abrir el Dockerfile.
// ---------------------------------------------------------------------------

/** Como se escribe en ECS la arquitectura que el Dockerfile llama `amd64`/`arm64`. */
const EN_ECS = { amd64: "X86_64", arm64: "ARM64" };

function problemasDeArquitectura(raizAndamio) {
  const dockerfile = fs.readFileSync(path.join(raizAndamio, "api", "Dockerfile"), "utf8");
  const m = dockerfile.match(/^FROM\s+--platform=linux\/(\S+)\s/m);
  if (!m) {
    return ["api/Dockerfile no fija --platform: la imagen sale con la arquitectura de la maquina del build y la tarea muere con «exec format error» el dia del primer despliegue"];
  }
  const enEcs = EN_ECS[m[1]];
  if (!enEcs) return [`api/Dockerfile fija linux/${m[1]}, que este banco no sabe traducir a la forma de ECS. Arreglo: agregalo a EN_ECS con su equivalente`];

  const problemas = [];
  const pendientes = fs.readFileSync(path.join(raizAndamio, "infra", "pendientes.tf"), "utf8");
  if (!/runtime_platform/.test(pendientes)) {
    problemas.push("infra/pendientes.tf no nombra `runtime_platform`: quien dimensione el computo no va a enterarse de que la arquitectura ya esta decidida en api/Dockerfile");
  }
  if (!/api\/Dockerfile/.test(pendientes)) {
    problemas.push("infra/pendientes.tf no nombra api/Dockerfile: el puntero volvio a ser de una sola via");
  }
  // La UNICA declaracion legible por maquina del lado de infra. Es una linea
  // sola y con forma fija a proposito: la prosa de alrededor nombra las dos
  // arquitecturas —tiene que hacerlo, porque explica cuando se cambia—, asi que
  // «el archivo menciona ARM64» no distingue nada. Esta linea dice cual rige HOY.
  const declarada = pendientes.match(/ARQUITECTURA DE HOY:\s*linux\/(\S+)\s*\((\w+)\)/);
  if (!declarada) {
    problemas.push("infra/pendientes.tf no declara «ARQUITECTURA DE HOY: linux/<arq> (<ECS>)»: sin esa linea no hay nada del lado de infra que se pueda comparar con el --platform del Dockerfile");
  } else if (declarada[1] !== m[1] || declarada[2] !== enEcs) {
    problemas.push(
      `api/Dockerfile construye linux/${m[1]} (${enEcs}) y infra/pendientes.tf declara linux/${declarada[1]} (${declarada[2]}): los dos lados de la arquitectura divergieron, y una tarea que arranque esa imagen muere con «exec format error»`,
    );
  }

  // Y cuando infra deje de ser un pendiente y declare la arquitectura de
  // verdad, tiene que declarar la MISMA.
  for (const dir of ["infra", "infra-prod"]) {
    const d = path.join(raizAndamio, dir);
    if (!fs.existsSync(d)) continue;
    for (const f of fs.readdirSync(d)) {
      if (!f.endsWith(".tf")) continue;
      const texto = fs.readFileSync(path.join(d, f), "utf8");
      for (const decl of texto.matchAll(/^\s*cpu_architecture\s*=\s*"([^"]+)"/gm)) {
        if (decl[1] !== enEcs) {
          problemas.push(`${dir}/${f} declara cpu_architecture = "${decl[1]}" y api/Dockerfile construye ${enEcs}: la tarea no va a poder arrancar esa imagen`);
        }
      }
    }
  }
  return problemas;
}

test("andamio · la arquitectura del computo esta declarada en el Dockerfile y en el pendiente de infra", () => {
  assert.deepEqual(problemasDeArquitectura(ANDAMIO), []);
});

test("andamio · la comprobacion de la arquitectura MUERDE", () => {
  const mutaciones = [
    {
      nombre: "el Dockerfile pasa a arm64 y nadie toca infra",
      mutar: (raiz) => reemplazar(path.join(raiz, "api/Dockerfile"), "FROM --platform=linux/amd64", "FROM --platform=linux/arm64"),
    },
    {
      nombre: "se borra el --platform del Dockerfile",
      mutar: (raiz) => reemplazar(path.join(raiz, "api/Dockerfile"), "FROM --platform=linux/amd64 ", "FROM "),
    },
    {
      nombre: "el pendiente de infra deja de nombrar runtime_platform",
      mutar: (raiz) => reemplazar(path.join(raiz, "infra/pendientes.tf"), "runtime_platform", "dimensionamiento"),
    },
    {
      nombre: "el pendiente de infra deja de nombrar al Dockerfile",
      mutar: (raiz) => {
        const p = path.join(raiz, "infra/pendientes.tf");
        const antes = fs.readFileSync(p, "utf8");
        const despues = antes.split("api/Dockerfile").join("la imagen del API");
        assert.notEqual(despues, antes, "el ancla api/Dockerfile ya no esta en infra/pendientes.tf");
        fs.writeFileSync(p, despues, "utf8");
      },
    },
    {
      nombre: "infra declara que hoy rige otra arquitectura",
      mutar: (raiz) => reemplazar(path.join(raiz, "infra/pendientes.tf"), "ARQUITECTURA DE HOY: linux/amd64 (X86_64)", "ARQUITECTURA DE HOY: linux/arm64 (ARM64)"),
    },
    {
      nombre: "se borra la linea que declara la arquitectura vigente",
      mutar: (raiz) => reemplazar(path.join(raiz, "infra/pendientes.tf"), "ARQUITECTURA DE HOY:", "Arquitectura:"),
    },
    {
      nombre: "infra declara una arquitectura distinta de la que construye la imagen",
      mutar: (raiz) => fs.appendFileSync(path.join(raiz, "infra/main.tf"), '\nresource "x" "y" {\n  cpu_architecture = "ARM64"\n}\n'),
    },
  ];
  for (const m of mutaciones) {
    enTemporal("arquitectura", (tmp) => {
      const copia = path.join(tmp, "plantilla");
      fs.cpSync(ANDAMIO, copia, { recursive: true });
      m.mutar(copia);
      assert.notDeepEqual(problemasDeArquitectura(copia), [], `la mutacion "${m.nombre}" no fue detectada`);
    });
  }
});

// ---------------------------------------------------------------------------
// 5 · EL FRONT DEL ANDAMIO PUEDE LEER AL API DEL ANDAMIO
//
// Tres declaraciones del mismo contrato: lo que el API RESPONDE (los `res.json`
// de api/src/app.ts), lo que el front EXIGE (los esquemas Zod de
// web/src/App.tsx) y lo que el banco del front DOBLA (las constantes de
// web/src/App.test.tsx). Las reglas, en los dos sentidos:
//
//   · lo que el front exige tiene que estar entre lo que el API responde
//     —si no, la portada del hello-world no puede leer a su propio backend—;
//   · lo que el banco dobla tiene que estar entre lo que el API responde
//     —si no, el banco esta verde contra un API que no existe, que es lo que
//     hacia que el defecto de arriba no lo cazara nada—;
//   · y el doble tiene que satisfacer al esquema, o el banco estaria probando
//     el camino de error creyendo probar el bueno.
//
// ── LIMITE DECLARADO ───────────────────────────────────────────────────────
// Es un escaneo de TEXTO sobre los tres archivos: compara NOMBRES de campo, no
// tipos ni valores. Un `estado: z.number()` contra un `estado: "ok"` se le
// escapa; eso lo caza el banco del front, que ejercita el componente de verdad.
// Lo que aca se vigila es lo que ningun banco podia ver, porque cada paquete se
// prueba contra su propio doble: que las tres declaraciones hablen del mismo
// contrato.
// ---------------------------------------------------------------------------

/** Los marcadores del andamio, neutralizados. `{{PROYECTO}}` trae LLAVES, y sin
 *  esto un `servicio: "{{PROYECTO}}-api"` corta cualquier lectura de un objeto
 *  literal en la llave equivocada. Se sustituye por una palabra —no se borra—
 *  para que el literal siga siendo un literal. */
function sinMarcadores(t) {
  return t.replace(/\{\{[A-Z0-9_]+\}\}/g, "MARCADOR");
}

/** El texto sin literales de cadena: un "00:00:00" adentro de un string no es un campo. */
function sinCadenas(t) {
  return t.replace(/"(?:[^"\\]|\\.)*"/g, '""').replace(/'(?:[^'\\]|\\.)*'/g, "''").replace(/`(?:[^`\\]|\\.)*`/g, "``");
}

/** Los nombres de campo de un cuerpo de objeto literal (o de un z.object). */
function campos(cuerpo) {
  return new Set([...sinCadenas(cuerpo).matchAll(/([A-Za-z_$][\w$]*)\s*:/g)].map((m) => m[1]));
}

/** Lo que responde un endpoint de api/src/app.ts. */
function camposDelApi(texto, ruta) {
  const re = new RegExp(`app\\.get\\(\\s*"${ruta.replace(/\//g, "\\/")}"[\\s\\S]*?res\\.json\\(\\{([^}]*)\\}\\)`);
  const m = texto.match(re);
  return m ? campos(m[1]) : null;
}

/** Lo que exige un esquema Zod de web/src/App.tsx. */
function camposDelEsquema(texto, nombre) {
  const m = texto.match(new RegExp(`const ${nombre} = z\\.object\\(\\{([^}]*)\\}\\)`));
  return m ? campos(m[1]) : null;
}

/** Lo que dobla una constante de web/src/App.test.tsx. */
function camposDelDoble(texto, nombre) {
  const m = texto.match(new RegExp(`const ${nombre} = \\{([^}]*)\\}`));
  return m ? campos(m[1]) : null;
}

const ENDPOINTS = [
  { ruta: "/api/health", esquema: "RespuestaSalud", doble: "SALUD_OK" },
  { ruta: "/api/hello", esquema: "RespuestaHola", doble: "HOLA_OK" },
];

function problemasDelContrato(raizAndamio) {
  const api = sinMarcadores(fs.readFileSync(path.join(raizAndamio, "api", "src", "app.ts"), "utf8"));
  const front = sinMarcadores(fs.readFileSync(path.join(raizAndamio, "web", "src", "App.tsx"), "utf8"));
  const banco = sinMarcadores(fs.readFileSync(path.join(raizAndamio, "web", "src", "App.test.tsx"), "utf8"));
  const problemas = [];

  for (const e of ENDPOINTS) {
    const responde = camposDelApi(api, e.ruta);
    const exige = camposDelEsquema(front, e.esquema);
    const dobla = camposDelDoble(banco, e.doble);

    // Cero campos en cualquiera de los tres lados dejaria todo lo de abajo
    // pasando en vacio, que es peor que un rojo.
    if (!responde?.size) { problemas.push(`no se pudo leer que responde ${e.ruta} en api/src/app.ts: la guarda del contrato quedo mirando al vacio`); continue; }
    if (!exige?.size) { problemas.push(`no se pudo leer el esquema ${e.esquema} en web/src/App.tsx: la guarda del contrato quedo mirando al vacio`); continue; }
    if (!dobla?.size) { problemas.push(`no se pudo leer el doble ${e.doble} en web/src/App.test.tsx: la guarda del contrato quedo mirando al vacio`); continue; }

    for (const c of exige) {
      if (!responde.has(c)) problemas.push(`web/src/App.tsx exige "${c}" de ${e.ruta} y el API responde ${[...responde].join(", ")}: el front no puede leer a su propio backend`);
    }
    for (const c of dobla) {
      if (!responde.has(c)) problemas.push(`web/src/App.test.tsx dobla "${c}" para ${e.ruta} y el API no lo devuelve: el banco del front esta verde contra un API que no existe`);
    }
    for (const c of exige) {
      if (!dobla.has(c)) problemas.push(`el doble ${e.doble} no trae "${c}", que el esquema ${e.esquema} exige: el banco estaria probando el camino de error creyendo probar el bueno`);
    }
  }
  return problemas;
}

test("andamio · el front, el API y el banco del front hablan del mismo contrato", () => {
  assert.deepEqual(problemasDelContrato(ANDAMIO), []);
});

test("andamio · la comprobacion del contrato MUERDE", () => {
  const mutaciones = [
    {
      nombre: "el API renombra un campo y el front se queda con el viejo",
      mutar: (raiz) => reemplazar(path.join(raiz, "api/src/app.ts"), 'res.json({ estado: "ok"', 'res.json({ status: "ok"'),
    },
    {
      nombre: "el front vuelve a exigir el nombre en ingles",
      mutar: (raiz) => reemplazar(path.join(raiz, "web/src/App.tsx"), "z.object({ estado: z.string() })", "z.object({ status: z.string() })"),
    },
    {
      nombre: "el banco del front vuelve a doblar un campo inventado",
      mutar: (raiz) => reemplazar(path.join(raiz, "web/src/App.test.tsx"), "const HOLA_OK = { mensaje:", "const HOLA_OK = { message:"),
    },
  ];
  for (const m of mutaciones) {
    enTemporal("contrato", (tmp) => {
      const copia = path.join(tmp, "plantilla");
      fs.cpSync(ANDAMIO, copia, { recursive: true });
      m.mutar(copia);
      assert.notDeepEqual(problemasDelContrato(copia), [], `la mutacion "${m.nombre}" no fue detectada`);
    });
  }
});

// ---------------------------------------------------------------------------
// 6 · NINGUNA ORGANIZACION CONCRETA VIAJA ESCRITA A MANO EN EL CODIGO DEL
//     ESQUELETO
//
// La portada del andamio traia `ORG · <nombre de un area concreta>` como texto
// pelado. `ORG` no es el marcador `{{ORG}}`, asi que el control de «cero
// marcadores sobrevivientes» de `projects init` no lo ve y la herramienta no lo
// toca: todo repositorio nuevo nacia con esa palabra y con el nombre de un area
// ajena en su pantalla principal.
//
// ── ALCANCE ────────────────────────────────────────────────────────────────
// Se miran los tres paquetes de codigo del esqueleto (api/, web/, e2e/) y no
// todo plantilla/, para que la regla sea EXACTA y no necesite excepciones:
// plantilla/.projects-valores.json usa `ORG` como CLAVE, que es legitimo, y una
// lista de excepciones que hay que mantener es como una guarda se convierte en
// un agujero.
// ---------------------------------------------------------------------------

const PAQUETES_DE_CODIGO = ["api", "web", "e2e"];

function archivosDe(dir, acumulado = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === "node_modules") continue;
      archivosDe(abs, acumulado);
      continue;
    }
    if (/\.(png|jpe?g|gif|ico|pdf|woff2?)$/i.test(e.name)) continue;
    acumulado.push(abs);
  }
  return acumulado;
}

function problemasDeOrganizacion(raizAndamio) {
  const problemas = [];
  for (const paquete of PAQUETES_DE_CODIGO) {
    const dir = path.join(raizAndamio, paquete);
    if (!fs.existsSync(dir)) continue;
    for (const abs of archivosDe(dir)) {
      const texto = fs.readFileSync(abs, "utf8");
      const rel = path.relative(raizAndamio, abs).split(path.sep).join("/");
      texto.split(/\r?\n/).forEach((linea, i) => {
        // Se le quitan primero los marcadores: `{{ORG}}` es justamente la forma
        // correcta y no puede contar como hallazgo.
        if (/\bORG\b/.test(linea.replace(/\{\{[A-Z0-9_]+\}\}/g, ""))) {
          problemas.push(`${rel}:${i + 1} escribe ORG como texto y no como marcador {{ORG}}: projects init no lo sustituye y viaja literal a todo repositorio nuevo`);
        }
      });
    }
  }
  return problemas;
}

test("andamio · el esqueleto no trae el nombre de ninguna organizacion escrito a mano", () => {
  // Cero archivos escaneados seria un banco roto, no un esqueleto limpio.
  const cuantos = PAQUETES_DE_CODIGO.reduce((n, p) => n + archivosDe(path.join(ANDAMIO, p)).length, 0);
  assert.ok(cuantos > 20, `solo ${cuantos} archivos escaneados: el recorrido de los paquetes se rompio`);
  assert.deepEqual(problemasDeOrganizacion(ANDAMIO), []);
  // Y el lado positivo: la portada SI muestra la organizacion, por marcador.
  const front = leer("web/src/App.tsx");
  assert.match(front, /const ORG_DEL_PROYECTO = "\{\{ORG\}\}";/);
  assert.match(front, /\{ORG_DEL_PROYECTO\}/);
});

test("andamio · la comprobacion de la organizacion MUERDE", () => {
  enTemporal("organizacion", (tmp) => {
    const copia = path.join(tmp, "plantilla");
    fs.cpSync(ANDAMIO, copia, { recursive: true });
    reemplazar(path.join(copia, "web/src/App.tsx"), "{ORG_DEL_PROYECTO}", "ORG · un area concreta");
    assert.notDeepEqual(problemasDeOrganizacion(copia), [], "una organizacion escrita a mano en la portada no fue detectada");
  });
});

// ---------------------------------------------------------------------------
// LOS TRES IGNORES TIENEN QUE COINCIDIR SOBRE LO QUE OTRA HERRAMIENTA ESCRIBE.
//
// EL DEFECTO QUE ESTE BANCO CIERRA, medido en un sitio recien generado:
// `astro build` escribe `sitio/.astro/{content,types}.d.ts`, y eso no estaba en
// ningun ignore. Consecuencia: `pnpm verificar` salia 0 la PRIMERA vez y 1 la
// SEGUNDA, sin tocar una linea, con seis errores de eslint sobre archivos que
// la persona no escribio. Y el `git add -A` del Paso 9 de docs/04 los subia al
// primer commit, dejando el CI rojo por lo mismo.
//
// LO QUE ESTE BANCO NO PUEDE AFIRMAR, dicho primero: no corre `pnpm verificar`
// dos veces —eso pide un install con red y varios minutos—. Lo que se midio a
// mano, el 2026-08-31, sobre un sitio recien generado: con estas lineas las
// tres corridas seguidas salen 0, y sin ellas la segunda sale 1.
//
// LO QUE SI PUEDE, y es lo que sostiene: que los tres ignores no discrepen. Un
// directorio que otra herramienta reescribe y que git ignora tiene que estar
// tambien fuera del linter y del formateador; si no, el rojo aparece la segunda
// vez que alguien corre la verificacion y no habla de lo que pasa.
// ---------------------------------------------------------------------------

/** Directorios que OTRA herramienta escribe y este repo no policia.
 *
 *  Cada uno con quien lo escribe, porque la lista solo tiene sentido si se sabe
 *  por que esta cada linea. */
const GENERADOS = [
  { dir: "coverage", quien: "el reporte HTML que escribe `pnpm test`" },
  { dir: ".astro", quien: "los tipos de colecciones que escribe `astro build`" },
];

/** Si un texto de ignores nombra ese directorio como un segmento de ruta.
 *
 *  Se compara por SEGMENTOS y no por subcadena: `.astro` aparece tambien en
 *  `index.astro`, que es un archivo fuente del proyecto y no un generado. */
function ignoraElDirectorio(texto, dir) {
  return texto
    .split("\n")
    .filter((l) => !l.trim().startsWith("#"))
    .some((l) => l.split(/[\s,"'[\]]+/).some((t) => t.split("/").includes(dir)));
}

test("lo que otra herramienta escribe esta fuera de git y del linter", () => {
  // LOS DOS QUE SE EXIGEN SON LOS DOS QUE SE MIDIERON EN ROJO. El formateador
  // NO esta en la lista, y no por olvido: medido el 2026-08-31 sobre una
  // aplicacion recien generada, con `coverage/` presente y SIN declararlo en
  // .prettierignore, `pnpm format:check` sale 0. Exigirlo seria pedir una linea
  // que no arregla nada, y una regla que no corresponde a un rojo real es como
  // empiezan los ignores que nadie sabe por que estan.
  const donde = {
    ".gitignore": ["un `git add -A` lo commitea y el CI nace rojo"],
    "eslint.config.mjs": ["la SEGUNDA verificacion sale roja sobre archivos que nadie escribio"],
  };
  const faltan = [];
  for (const [archivo, [consecuencia]] of Object.entries(donde)) {
    const texto = fs.readFileSync(path.join(ANDAMIO, archivo), "utf-8");
    for (const { dir, quien } of GENERADOS) {
      if (!ignoraElDirectorio(texto, dir)) faltan.push(`${dir} (${quien}) falta en ${archivo}: ${consecuencia}`);
    }
  }
  assert.deepEqual(
    faltan,
    [],
    "un directorio que otra herramienta reescribe tiene que estar fuera de los TRES. Si falta en uno solo, el rojo " +
      `aparece la segunda vez que alguien verifica y no habla de lo que pasa:\n  ${faltan.join("\n  ")}`,
  );
});

test("MUERDE: sacar la linea de uno de los tres se caza, y un archivo fuente no la simula", () => {
  const gitignore = fs.readFileSync(path.join(ANDAMIO, ".gitignore"), "utf-8");
  assert.equal(ignoraElDirectorio(gitignore, ".astro"), true, "tiene que ver la linea que si esta");
  assert.equal(
    ignoraElDirectorio(gitignore.split("\n").filter((l) => !l.includes(".astro")).join("\n"), ".astro"),
    false,
    "y no verla cuando se la saca",
  );
  // Y la otra mitad: `src/pages/index.astro` NO puede hacer pasar el control.
  // Comparar por subcadena lo haria, y ese es el error facil.
  assert.equal(ignoraElDirectorio("sitio/src/pages/index.astro\n", ".astro"), false, "un archivo fuente no es el directorio");
});
