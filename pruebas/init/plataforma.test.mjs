import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  seExcluyeDelCopiado,
  noViajanPorPlataforma,
  renombresPorPlataforma,
  plataformaDe,
  podarPorPlataforma,
  destinoDe,
  archivosDelAndamio,
  archivosDelAndamioAMano,
  instanciar,
} from "../../herramientas/projects-init.mjs";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const ANDAMIO = path.join(RAIZ, "plantilla");

// ---------------------------------------------------------------------------
// LA ELECCION DE PLATAFORMA, QUE HASTA HOY NO SERVIA PARA NADA.
//
// El hallazgo mas caro de la auditoria de la ruta no tecnica: la guia tiene una
// tabla para elegir entre cinco plataformas —con lo que da cada una gratis, en
// numeros medidos— y la clave `plataforma` existia en el archivo de valores del
// andamio... y NINGUNA herramienta la leia. Medido: `grep -rn plataforma
// herramientas/` daba un solo resultado y era un comentario sobre otra cosa.
//
// O sea que quien leia la tabla, elegia Supabase para no gastar, y recibia
// igual `infra/` e `infra-prod/` con el proveedor `hashicorp/aws` adentro, mas
// seis casillas obligatorias de una nube que no iba a usar. Una tabla que invita
// a elegir y una herramienta que ignora la eleccion es peor que no ofrecer la
// eleccion: promete algo que no cumple.
//
// Este banco fija que la eleccion mande.
// ---------------------------------------------------------------------------

test("aws es el valor por defecto, y eso protege a los proyectos viejos", () => {
  // Un archivo de valores escrito ANTES de que esta clave se leyera describe un
  // proyecto de AWS. Cambiar eso en silencio le sacaria la infraestructura a un
  // proyecto que la tiene, que es un modo de falla mucho peor que repartir una
  // carpeta de mas.
  assert.equal(plataformaDe({}), "aws", "sin la clave, se asume AWS");
  assert.equal(plataformaDe({ plataforma: "" }), "aws", "una cadena vacia no es una eleccion");
  assert.equal(plataformaDe({ plataforma: "   " }), "aws", "ni un espacio");
  assert.equal(plataformaDe(null), "aws", "ni un archivo que ni siquiera es un objeto");
  assert.equal(plataformaDe({ plataforma: "SUPABASE" }), "supabase", "la mayuscula no cambia la eleccion");
  assert.equal(plataformaDe({ plataforma: " gcp " }), "gcp", "ni los espacios de los costados");
});

test("con AWS viaja todo; sin AWS no viajan las dos raices de Terraform", () => {
  assert.deepEqual(noViajanPorPlataforma("aws"), [], "eligiendo AWS no se saca nada");
  for (const p of ["supabase", "gcp", "ninguna"]) {
    assert.deepEqual(noViajanPorPlataforma(p), ["infra", "infra-prod"], `con "${p}" las dos raices se quedan`);
  }
});

test("lo que se MUDA no se excluye por donde vivia", () => {
  // El defecto que este caso vigila, y se midio corriendo la herramienta: la
  // exclusion corre antes que el renombre, asi que `infra/adaptadores.md` —que
  // empieza con `infra/`— se lo comia la exclusion antes de que el renombre
  // llegara a mudarlo. El proyecto salia sin infra/ (correcto) y tambien sin la
  // unica pagina que explica las cinco plataformas.
  assert.equal(seExcluyeDelCopiado("infra/adaptadores.md", "supabase"), false, "el catalogo de plataformas TIENE que viajar");
  assert.equal(destinoDe("infra/adaptadores.md", "supabase"), "PLATAFORMAS.md", "y aterriza en la raiz del proyecto");
  assert.equal(destinoDe("infra/adaptadores.md", "aws"), "infra/adaptadores.md", "con AWS se queda donde estaba");
  assert.equal(seExcluyeDelCopiado("infra/main.tf", "supabase"), true, "el resto de infra/ no viaja");
  assert.equal(seExcluyeDelCopiado("infra-prod/pendientes.tf", "supabase"), true, "ni el de produccion");
  assert.equal(seExcluyeDelCopiado("infra/main.tf", "aws"), false, "con AWS viaja entero");
});

test("POR QUE NO ALCANZA CON VACIAR LOS DIRECTORIOS: el pipeline decide por existencia", () => {
  // El paso de Terraform del pipeline que el andamio reparte decide con
  // `[ -d "${D}" ]`, no con "hay .tf adentro". Un infra/ con un solo documento
  // adentro sigue contando como raiz de Terraform, asi que dejar el directorio
  // con el catalogo adentro haria que el proyecto arranque verificando una
  // infraestructura que no tiene. Este caso fija esa lectura del pipeline: si
  // manana cambia a mirar el contenido, la decision de aca se puede revisar.
  const ci = fs.readFileSync(path.join(ANDAMIO, ".github/workflows/ci.yml"), "utf-8");
  assert.match(
    ci,
    /if \[ -d "\$\{D\}" \]; then RAICES\+=/,
    "el pipeline sigue decidiendo por existencia del directorio. Si esto cambia, revisa por que `infra/` no viaja entero",
  );
});

test("el censo de archivos del andamio cambia con la plataforma, y las DOS mediciones coinciden", () => {
  const conAws = archivosDelAndamio(ANDAMIO, "aws");
  const sinAws = archivosDelAndamio(ANDAMIO, "supabase");
  assert.ok(conAws.length > sinAws.length, `con AWS tienen que viajar mas archivos; midio ${conAws.length} contra ${sinAws.length}`);
  assert.ok(sinAws.length >= 60, `un proyecto sin AWS sigue siendo un proyecto completo; midio ${sinAws.length} archivos`);
  assert.ok(sinAws.includes("infra/adaptadores.md"), "el catalogo se cuenta con su nombre de ORIGEN: el renombre es del destino");
  assert.equal(sinAws.some((r) => r === "infra/main.tf"), false, "los .tf no");

  // La segunda medicion existe justamente para que una copia parcial sea roja.
  // Si las dos no coincidieran al filtrar por plataforma, esa defensa se
  // convertiria en un rojo permanente.
  assert.deepEqual(
    archivosDelAndamioAMano(ANDAMIO, "supabase").sort(),
    sinAws.slice().sort(),
    "las dos APIs que recorren el andamio tienen que dar la misma lista tambien al filtrar por plataforma",
  );
});

// ---------------------------------------------------------------------------
// LA PODA. Dos archivos quedaban con referencias muertas, y ninguno se queja.
// ---------------------------------------------------------------------------

test("sin AWS, dependabot deja de vigilar directorios que no existen", () => {
  const original = fs.readFileSync(path.join(ANDAMIO, ".github/dependabot.yml"), "utf-8");
  assert.ok(original.includes("# projects:solo-si-hay-infra"), "el centinela vive en el andamio, no en la herramienta");

  const podado = podarPorPlataforma(original, ".github/dependabot.yml", "supabase");
  assert.equal(/directory: "\/infra/.test(podado), false, "no puede quedar una entrada apuntando a un directorio que no viaja");
  assert.equal(podado.includes("projects:solo-si-hay-infra"), false, "y el centinela se va con el bloque");
  assert.ok(podado.includes('package-ecosystem: "npm"'), "el resto del archivo se queda entero");

  assert.equal(podarPorPlataforma(original, ".github/dependabot.yml", "aws"), original, "con AWS no se toca nada");
});

test("sin AWS, los permisos de terraform se van, y el archivo sigue siendo JSON", () => {
  const original = fs.readFileSync(path.join(ANDAMIO, ".claude/settings.json"), "utf-8");
  const podado = podarPorPlataforma(original, ".claude/settings.json", "supabase");
  const j = JSON.parse(podado); // si esto tira, el proyecto nace con un settings roto
  const todos = [...(j.permissions?.allow ?? []), ...(j.permissions?.ask ?? []), ...(j.permissions?.deny ?? [])];
  assert.equal(
    todos.some((x) => /terraform|AWS_PROFILE/i.test(x)),
    false,
    "un permiso de mas no rompe nada hoy; lo que hace es que la proxima persona que lea la lista crea que este proyecto usa Terraform",
  );
  assert.ok(todos.length > 0, "no se puede vaciar la lista entera: eso seria otro defecto, no el arreglo");
  assert.equal(podarPorPlataforma(original, ".claude/settings.json", "aws"), original, "con AWS no se toca nada");
});

test("la poda no toca ningun otro archivo", () => {
  const cualquiera = "texto con la palabra terraform y AWS_PROFILE adentro\n";
  assert.equal(podarPorPlataforma(cualquiera, "README.md", "supabase"), cualquiera);
  assert.equal(podarPorPlataforma(cualquiera, "api/package.json", "supabase"), cualquiera);
});

test("un settings.json que no parsea NO tumba la corrida entera", () => {
  // Es un problema del andamio y lo caza otro banco. Convertirlo aca en un corte
  // cambiaria un diagnostico preciso por uno inventado por esta funcion.
  const roto = "{ esto no es json";
  assert.equal(podarPorPlataforma(roto, ".claude/settings.json", "supabase"), roto);
});

// ---------------------------------------------------------------------------
// DE PUNTA A PUNTA
// ---------------------------------------------------------------------------

function instanciarCon(plataforma) {
  const destino = fs.mkdtempSync(path.join(os.tmpdir(), `plat-${plataforma}-`));
  const valores = JSON.parse(fs.readFileSync(path.join(ANDAMIO, ".projects-valores.json"), "utf-8"));
  valores.plataforma = plataforma;
  const r = instanciar({ raizAndamio: ANDAMIO, destino, valores });
  return { destino, r };
}

test("de punta a punta: un proyecto sin AWS no recibe una sola linea de Terraform", () => {
  const { destino, r } = instanciarCon("supabase");
  assert.equal(fs.existsSync(path.join(destino, "infra")), false, "ni infra/");
  assert.equal(fs.existsSync(path.join(destino, "infra-prod")), false, "ni infra-prod/");
  assert.ok(fs.existsSync(path.join(destino, "PLATAFORMAS.md")), "y el catalogo de plataformas SI, en la raiz");
  assert.ok(r.escritos.length >= 60, `sigue siendo un proyecto completo: ${r.escritos.length} archivos`);

  const dep = fs.readFileSync(path.join(destino, ".github/dependabot.yml"), "utf-8");
  assert.equal(/package-ecosystem: "terraform"/.test(dep), false, "sin infraestructura no se vigilan sus dependencias");
});

test("de punta a punta: un proyecto de AWS recibe todo, como siempre", () => {
  const { destino, r } = instanciarCon("aws");
  assert.ok(fs.existsSync(path.join(destino, "infra/main.tf")), "infra/ entera");
  assert.ok(fs.existsSync(path.join(destino, "infra-prod/main.tf")), "infra-prod/ tambien");
  assert.ok(fs.existsSync(path.join(destino, "infra/adaptadores.md")), "y el catalogo se queda donde estaba");
  assert.equal(fs.existsSync(path.join(destino, "PLATAFORMAS.md")), false, "sin mudarse a la raiz");

  const dep = fs.readFileSync(path.join(destino, ".github/dependabot.yml"), "utf-8");
  assert.ok(/package-ecosystem: "terraform"/.test(dep), "y Dependabot sigue vigilando la infraestructura");
});

test("MUERDE: si la plataforma dejara de leerse, los dos proyectos saldrian iguales", () => {
  // El caso que prueba que todo lo de arriba no pasa por vacuidad. Es
  // exactamente el estado del que se viene: la clave existia y nadie la leia.
  const sin = instanciarCon("supabase");
  const con = instanciarCon("aws");
  assert.notEqual(
    sin.r.escritos.length,
    con.r.escritos.length,
    "si los dos proyectos tienen la misma cantidad de archivos, la eleccion de plataforma volvio a no significar nada",
  );
});

test("el archivo de valores del PROYECTO declara la plataforma que se eligio, no la del andamio", () => {
  // EL DEFECTO QUE ESTE CASO VIGILA, medido sobre un proyecto ya armado: en el
  // andamio esta clave es un LITERAL —`"plataforma": "aws"`— y no un marcador
  // `{{ASI}}`, asi que la sustitucion no la tocaba: el proyecto de alguien que
  // eligio Supabase viajaba declarando `aws` en su propio archivo de valores.
  //
  // Y no es un archivo cualquiera. Es el que la action de la constitucion lee en
  // CADA corrida del proyecto para renderizar su ley: un archivo que declara la
  // eleccion y la contradice es la peor version del problema que este cambio
  // vino a resolver.
  const original = fs.readFileSync(path.join(ANDAMIO, ".projects-valores.json"), "utf-8");
  for (const plataforma of ["supabase", "gcp", "ninguna", "aws"]) {
    const escrito = JSON.parse(podarPorPlataforma(original, ".projects-valores.json", plataforma));
    assert.equal(escrito.plataforma, plataforma, `eligiendo "${plataforma}", el archivo del proyecto tiene que declarar eso`);
  }
});

test("y se escribe TAMBIEN cuando la plataforma es aws", () => {
  // Si solo se escribiera en el caso raro, el literal del andamio seguiria
  // siendo la unica fuente para el caso comun y volveria a poder mentir el dia
  // que ese literal cambie. La clave se escribe siempre, venga de donde venga.
  const inventado = JSON.stringify({ plataforma: "lo-que-sea", PROYECTO: "x" }, null, 2);
  const escrito = JSON.parse(podarPorPlataforma(inventado, ".projects-valores.json", "aws"));
  assert.equal(escrito.plataforma, "aws", "el valor del andamio no manda sobre la eleccion, ni siquiera cuando coinciden");
  assert.equal(escrito.PROYECTO, "x", "y el resto del archivo se queda entero");
});
