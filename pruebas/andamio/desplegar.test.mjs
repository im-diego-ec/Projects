import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const ANDAMIO = path.join(RAIZ, "plantilla");
const WORKFLOW = path.join(ANDAMIO, ".github/workflows/desplegar.yml");
const CONFIG = path.join(ANDAMIO, "sitio/wrangler.jsonc");

// ---------------------------------------------------------------------------
// EL DESPLIEGUE, Y LO QUE ESTE BANCO PUEDE Y NO PUEDE AFIRMAR.
//
// LO QUE NO PUEDE, dicho primero para que nadie lea de mas: **este banco no
// comprueba que el sitio se publique**. Publicar necesita una cuenta de
// Cloudflare y una credencial, y las dos son actos humanos que este repositorio
// no va a hacer por nadie. Lo que se verifico a mano, el 2026-08-26, es que
// `wrangler deploy --dry-run` lee la configuracion, encuentra los archivos y
// calcula la subida (0.34 KiB) sin cuenta ninguna. De ahi para adelante hace
// falta una persona, y el paso a paso esta en el README del paquete.
//
// LO QUE SI PUEDE, y es lo que sostiene: que la forma del workflow sea correcta
// y que sus tres decisiones de seguridad sigan en pie. Las tres se pueden
// romper con una linea y ninguna se nota mirando el verde.
// ---------------------------------------------------------------------------

const workflow = () => fs.readFileSync(WORKFLOW, "utf-8");

test("el andamio trae el workflow y la configuracion: sin eso, todo lo de abajo pasa vacio", () => {
  assert.ok(fs.existsSync(WORKFLOW), "falta el workflow de despliegue");
  assert.ok(fs.existsSync(CONFIG), "falta la configuracion de wrangler");
});

test("NO publica si las verificaciones no terminaron en verde", () => {
  // Es la decision central: `workflow_run` dispara TAMBIEN cuando el workflow
  // anterior fallo. Sin este `if`, un CI rojo publicaria igual — o sea que el
  // marco entero, que existe para que nada entre sin verificar, dejaria salir
  // sin verificar.
  const t = workflow();
  assert.match(
    t,
    /github\.event\.workflow_run\.conclusion == 'success'/,
    "sin esta condicion, un CI en rojo publica igual: `workflow_run` dispara tambien cuando el anterior fallo",
  );
  assert.match(t, /branches: \[main\]/, "y solo desde la rama de integracion: una rama cualquiera no publica nada");
});

test("NO se pone rojo por una credencial que todavia no existe", () => {
  // Un rojo permanente por algo que la persona no configuro todavia enseña a
  // ignorar los rojos, y a partir de ahi la compuerta que SI importa tampoco se
  // mira. El paso sale con aviso amarillo y codigo cero.
  const t = workflow();
  assert.match(t, /::warning::todavia no se puede publicar/, "el aviso tiene que ser amarillo, no rojo");
  assert.match(t, /README\.md/, "y tiene que decir donde esta el paso a paso para destrabarlo");
  const bloque = /if \[ -z "\$\{TOKEN\}" \] \|\| \[ -z "\$\{CUENTA\}" \]; then[\s\S]*?exit 0/;
  assert.match(t, bloque, "la salida sin credencial tiene que ser exit 0, no un fallo");
});

test("un directorio compilado VACIO es rojo, no un despliegue limpio", () => {
  // Publicar un directorio vacio deja el dominio sirviendo nada y sin ningun
  // error: es la version de despliegue del falso verde que este repositorio
  // persigue en todos lados.
  assert.match(
    workflow(),
    /::error::la compilacion no dejo un solo archivo/,
    "sin este guard, una compilacion que no produce nada se publica y el sitio queda vacio en silencio",
  );
});

test("la credencial entra por secreto y NUNCA se escribe en un archivo", () => {
  const t = workflow();
  assert.match(t, /CLOUDFLARE_API_TOKEN: \$\{\{ secrets\.CLOUDFLARE_API_TOKEN \}\}/);
  assert.match(t, /CLOUDFLARE_ACCOUNT_ID: \$\{\{ secrets\.CLOUDFLARE_ACCOUNT_ID \}\}/);

  // Y ningun archivo del andamio puede traer un valor que parezca una
  // credencial de verdad: un secreto en el codigo es un secreto publico.
  const config = fs.readFileSync(CONFIG, "utf-8");
  assert.equal(/[A-Za-z0-9_-]{40,}/.test(config.replace(/https?:\/\/\S+/g, "")), false, "la configuracion no puede traer nada que parezca una credencial");
});

test("la fecha de compatibilidad esta declarada, y eso no es burocracia", () => {
  // Sin ella, Cloudflare puede cambiar el comportamiento de la plataforma por
  // debajo y el sitio se comporta distinto sin que nadie haya tocado una linea.
  const config = fs.readFileSync(CONFIG, "utf-8");
  assert.match(config, /"compatibility_date":\s*"\d{4}-\d{2}-\d{2}"/, "hace falta una fecha de compatibilidad con forma de fecha");
});

test("una direccion que no existe devuelve un error, no la portada", () => {
  // `single-page-application` devolveria siempre el index.html, y entonces un
  // enlace mal escrito mostraria la portada en vez de un error. Para una
  // aplicacion eso es lo correcto; para un sitio de paginas es esconder el
  // problema.
  const config = fs.readFileSync(CONFIG, "utf-8");
  assert.match(config, /"not_found_handling":\s*"404-page"/);
});

test("el motor de Cloudflare esta en la lista de scripts de instalacion permitidos", () => {
  // EL DEFECTO QUE ESTE CASO VIGILA, medido: sin `workerd` en esa lista,
  // `pnpm install` lo deja a medias y CUALQUIER comando posterior del paquete
  // —no solo el despliegue, tambien el `build`— muere con
  // ERR_PNPM_IGNORED_BUILDS y una traza del gestor de paquetes que no habla de
  // Cloudflare por ningun lado.
  const ws = fs.readFileSync(path.join(ANDAMIO, "pnpm-workspace.yaml"), "utf-8");
  assert.match(ws, /^\s*workerd:\s*true\s*$/m, "sin esto, el paquete del sitio no instala y el error no dice por que");
});

test("el paso a paso humano esta escrito, y dice que es humano", () => {
  const readme = fs.readFileSync(path.join(ANDAMIO, "sitio/README.md"), "utf-8");
  for (const senal of ["dash.cloudflare.com", "CLOUDFLARE_API_TOKEN", "CLOUDFLARE_ACCOUNT_ID", "Edit Cloudflare Workers"]) {
    assert.ok(readme.includes(senal), `el paso a paso tiene que nombrar "${senal}": sin eso la persona no sabe donde ir`);
  }
  assert.match(readme, /desplegar:prueba/, "y tiene que ofrecer el ensayo que NO publica, para probar antes de tener cuenta");
  assert.match(
    readme,
    /No los pegues en ning(ú|u)n archivo del repositorio/i,
    "un secreto en el codigo es un secreto publico, y eso hay que decirlo donde se pide el secreto",
  );
});

test("dos publicaciones a la vez HACEN COLA: ninguna cancela a la otra", () => {
  // EL DEFECTO QUE ESTE CASO VIGILA: el workflow traia `cancel-in-progress:
  // true` y un comentario que defendia lo contrario de lo que el marco exige.
  //
  // `openspec/specs/despliegue-ci/spec.md` lo escribe con su motivo: una corrida
  // de VERIFICACION interrumpida no deja nada —cancelarla es correcto—, pero una
  // de DESPLIEGUE si deja estado, y entonces el destino queda en una combinacion
  // que ninguna de las dos corridas describe mientras las dos reportan exito.
  // Se miran las lineas EJECUTABLES: el comentario de al lado nombra el valor
  // viejo para explicar por que se cambio, y buscar en el texto entero haria
  // que documentar la decision rompiera el control que la sostiene.
  const t = workflow();
  const ejecutable = t
    .split("\n")
    .filter((l) => !/^\s*#/.test(l))
    .join("\n");
  assert.match(t, /concurrency:/, "sin grupo de concurrencia, dos publicaciones corren a la vez");
  assert.match(ejecutable, /cancel-in-progress:\s*false/, "un despliegue interrumpido deja el destino a medias con las dos en verde");
  assert.equal(/cancel-in-progress:\s*true/.test(ejecutable), false);
});

test("el workflow que espera existe de verdad, con ese nombre exacto", () => {
  // Un `workflows: ["ci"]` que no corresponde al `name:` de ningun workflow del
  // arbol no falla: simplemente NUNCA dispara. Es la forma mas silenciosa de
  // quedarse sin despliegue, y ningun rojo la anuncia.
  const sinComentarios = workflow()
    .split("\n")
    .filter((l) => !/^\s*#/.test(l))
    .join("\n");
  const esperados = [...sinComentarios.matchAll(/workflows:\s*\[([^\]]+)\]/g)].flatMap((m) =>
    m[1].split(",").map((x) => x.trim().replace(/^["']|["']$/g, "")),
  );
  assert.ok(esperados.length >= 1, "el workflow tiene que esperar a alguno, o este control no mira nada");

  const dir = path.join(ANDAMIO, ".github/workflows");
  const nombres = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".yml"))
    .map((f) => (fs.readFileSync(path.join(dir, f), "utf-8").match(/^name:\s*(.+)$/m) ?? [])[1]?.trim())
    .filter(Boolean);
  for (const e of esperados) {
    assert.ok(nombres.includes(e), `desplegar.yml espera al workflow "${e}" y ninguno del andamio se llama asi: ${nombres.join(", ")}`);
  }
});

test("cada `-C <paquete>` del despliegue apunta a una carpeta que la forma reparte", () => {
  // El despliegue solo viaja a la forma `sitio`. Si nombrara un paquete que esa
  // forma no trae, el paso moriria en la publicacion —despues de que el CI ya
  // dijo verde—, que es el peor momento para descubrirlo.
  const paquetes = [...workflow().matchAll(/-C\s+\{\{(\w+)\}\}/g)].map((m) => m[1]);
  assert.ok(paquetes.length >= 1, "el workflow tiene que compilar algun paquete, o este control mide aire");
  for (const marcador of paquetes) {
    assert.equal(marcador, "PAQUETE_SITIO", `el despliegue nombra {{${marcador}}}, que la forma sitio no reparte`);
  }
});

test("MUERDE: sacar la condicion del verde se caza DE VERDAD", () => {
  // LA VERSION ANTERIOR DE ESTE CASO ERA TAUTOLOGICA. Hacia
  // `workflow().replace(/…success'/, "true")` y despues afirmaba que el regex ya
  // no matcheaba. Con un regex sin `g`, si la cadena NO esta, `replace` es un
  // no-op y el aserto pasa igual: no podia fallar NUNCA contra un archivo que
  // hubiera perdido la condicion. Era el unico anti-vacuidad del banco y no
  // media nada.
  //
  // Ahora se afirma primero que la condicion ESTA, que es lo que lo vuelve una
  // mutacion y no un deseo.
  const CONDICION = /github\.event\.workflow_run\.conclusion == 'success'/;
  const t = workflow();
  assert.match(t, CONDICION, "el archivo real tiene que traer la condicion: sin eso, mutarla no prueba nada");
  assert.equal(CONDICION.test(t.replace(CONDICION, "true")), false, "y sacada, la deteccion tiene que ver que no esta");
});

test("se publica el commit que paso el CI, no la punta de main", () => {
  // EL DEFECTO QUE ESTE CASO VIGILA: un `actions/checkout` pelado bajo
  // `workflow_run` trae lo que `main` apunte EN ESE MOMENTO, no lo que verifico
  // la corrida que disparo el workflow. Entre que el CI termina y el despliegue
  // arranca puede entrar otro merge, y entonces se publica codigo que ningun CI
  // aprobo — en silencio, porque las dos corridas reportan exito.
  const t = workflow();
  assert.match(t, /uses: actions\/checkout@/, "sin checkout no hay nada que publicar");
  assert.match(
    t,
    /ref:\s*\$\{\{\s*github\.event\.workflow_run\.head_sha\s*\}\}/,
    "el checkout tiene que pedir el commit que el CI midio (`head_sha`), no la rama",
  );
});
