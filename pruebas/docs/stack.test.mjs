// BANCO DE docs/03-stack.md: LA PAGINA DEL STACK CONTRA LO QUE LOS MANIFIESTOS
// DECLARAN.
//
// POR QUE EXISTE. La pagina dice que pieza usa el marco, quien la decide y en
// que archivo vive su version. Todo eso envejece por el mismo mecanismo: alguien
// sube una dependencia, mueve un manifiesto o saca una pieza del andamio, y la
// prosa se queda diciendo lo de antes. La doctrina del repo es explicita —lo que
// depende de que alguien se acuerde no cuenta— asi que la pagina no se sostiene
// con disciplina: se sostiene con este banco.
//
// LA DECISION QUE HACE QUE ESTO SEA POSIBLE: la pagina NO escribe versiones.
// Declara, fila por fila, el archivo y la clave donde cada version vive, y el
// numero se lee del arbol (node pruebas/docs/versiones.mjs). Asi hay algo
// comparable: la pagina AFIRMA "la version de X se declara en A bajo B" y el
// banco va a A, busca B, y falla si no hay nada. Una tabla de numeros copiados
// no se puede comprobar contra nada — solo se puede releer y creer.
//
// LAS DIVERGENCIAS QUE PONE EN ROJO estan enumeradas una por una en la propia
// pagina, seccion "Que vigila el banco de pruebas" — sin conteo escrito ni aca ni
// alla, porque un numero a mano en el encabezado envejece igual que una version a
// mano en la prosa (y ya envejecio una vez: decia SEIS con siete enumeradas).
// Cada una tiene aca su caso mas su REFUTACION: la misma comprobacion corriendo
// sobre una copia mutada en memoria, donde tiene que fallar. Un check que nadie
// vio fallar no es un check, y las mutaciones van sobre copias en memoria a
// proposito: este banco no escribe una sola linea en el arbol.
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import {
  ANCLA_DISTRIBUCION,
  ANCLA_PLATAFORMAS,
  ANCLA_STACK_FIJADO,
  CONSTITUCION,
  README,
  congeladasAusentes,
  declaracionDe,
  declaracionEn,
  digitosFueraDeBloques,
  filasDeclaradas,
  formaEsperada,
  formasDelReadme,
  formasValidas,
  herramientasCongeladas,
  leer,
  PAGINA,
  paquetesDelWorkspace,
  plataformasAdmitidas,
  RAIZ,
  seccion,
} from "./versiones.mjs";

const TEXTO = leer(PAGINA);
const FILAS = filasDeclaradas(TEXTO);
const WORKSPACE = "plantilla/pnpm-workspace.yaml";
const TEXTO_README = leer(README);
const TEXTO_CONSTITUCION = leer(CONSTITUCION);
const FORMAS_DEL_README = formasDelReadme(TEXTO_README);
const CONGELADAS = herramientasCongeladas(TEXTO_CONSTITUCION);
const SECCION_ELIGE = "## Lo que elige el proyecto";

/** Las filas cuya forma no concuerda con la que el README le asigna a esa ruta.
 *
 *  La respuesta sale del README y no de la propia ruta de la fila: derivarla de
 *  la misma celda que se esta comprobando solo cazaria un tipeo, y lo que hay que
 *  cazar es una fila CLASIFICADA MAL. Confundirlas no es vocabulario — le promete
 *  a un proyecto una correccion que nunca le va a llegar. */
function formasIncoherentes(filas, formas) {
  return filas
    .filter((f) => f.forma !== formaEsperada(f.ruta, formas))
    .map(
      (f) => `${PAGINA}:${f.linea} ${f.pieza}: dice "${f.forma}" y ${f.ruta} es "${formaEsperada(f.ruta, formas)}"`,
    );
}

/** Los paquetes del monorepo que la tabla toca, DERIVADOS de sus rutas. No hay
 *  lista escrita: si manana entra un paquete al workspace y nadie le escribe
 *  fila, la comparacion de mas abajo lo dice. */
function paquetesDeLasFilas(filas) {
  const paquetes = new Set();
  for (const fila of filas) {
    const marca = fila.ruta.match(/^plantilla\/([^/]+)\/package\.json$/);
    if (marca) paquetes.add(marca[1]);
  }
  return [...paquetes].sort();
}

test("stack · la tabla de declaraciones tiene filas: un cero aca es el parser roto, no una pagina limpia", () => {
  assert.ok(
    FILAS.length >= 15,
    `${PAGINA} declara ${FILAS.length} fila(s) con la forma \`ruta\` → \`clave\` y se esperaban al menos 15. ` +
      "O la pagina se vacio, o el formato de la celda cambio y este banco dejo de leer nada: sin filas, todos " +
      "los casos de abajo pasarian vacuamente.",
  );
});

test("stack · cada fila apunta a un archivo que existe", () => {
  const ausentes = FILAS.filter((f) => !existsSync(join(RAIZ, f.ruta))).map((f) => `${f.pieza} → ${f.ruta}`);
  assert.deepEqual(
    ausentes,
    [],
    `${PAGINA} apunta a archivos que no estan en el arbol: ${ausentes.join(", ")}. La pieza se movio o se fue ` +
      "del andamio y la pagina se quedo afirmandola. Arreglo: corregi la ruta de la fila, o borra la fila si la " +
      "pieza ya no esta.",
  );
});

test("stack · cada fila resuelve a una version que el archivo declara de verdad", (t) => {
  const sinDeclarar = [];
  for (const fila of FILAS) {
    const valor = declaracionDe(fila);
    if (valor === null || !/\d/.test(valor)) {
      sinDeclarar.push(`${fila.pieza}: ${fila.ruta} no declara nada bajo \`${fila.clave}\``);
      continue;
    }
    t.diagnostic(`${fila.pieza} · ${fila.ruta} → ${fila.clave} = ${valor}`);
  }
  assert.deepEqual(
    sinDeclarar,
    [],
    `estas filas de ${PAGINA} apuntan a una clave que el archivo ya no declara: ${sinDeclarar.join(" | ")}. ` +
      "Es el caso que mas se da: alguien saca una dependencia o renombra un input y la pagina sigue diciendo " +
      "que esta. Arreglo: corregi la clave, o borra la fila. El comando que lo remide entero es " +
      "`node pruebas/docs/versiones.mjs`.",
  );
});

test("stack · la pagina no escribe ni un numero de version a mano", () => {
  const digitos = digitosFueraDeBloques(TEXTO);
  assert.deepEqual(
    digitos.map((d) => `${PAGINA}:${d.linea}: ${d.texto}`),
    [],
    "fuera de los bloques de comando, esta pagina no puede contener un solo digito: un numero escrito a mano al " +
      "lado de algo que otro archivo declara envejece sin que nada lo mida, que es exactamente lo que este " +
      "repositorio existe para no hacer. Arreglo: en vez del numero, nombra el archivo y la clave que lo " +
      "declaran, y agregalos como fila de la tabla de declaraciones.",
  );
});

test("stack · el README declara sus formas de distribucion y donde vive cada una", () => {
  assert.ok(
    FORMAS_DEL_README.length >= 4,
    `lei ${FORMAS_DEL_README.length} forma(s) de la tabla '${ANCLA_DISTRIBUCION}...' de ${README} y se esperaban ` +
      "al menos cuatro. O la tabla se renombro, o cambio de columnas: sin formas, el caso de abajo compararia " +
      "contra nada y todas las filas de la pagina pasarian. Arreglo: actualiza el ancla en el mismo cambio.",
  );
  const sinPrefijo = FORMAS_DEL_README.filter((f) => f.prefijos.length === 0).map((f) => f.forma);
  assert.ok(
    sinPrefijo.length <= 1,
    `${sinPrefijo.length} formas del README no declaran donde viven (${sinPrefijo.join(", ")}). La columna ` +
      "'Donde vive en Projects' es la que traduce una ruta a una forma; sin ella no hay con que comparar.",
  );
});

test("stack · la forma de distribucion de cada fila concuerda con donde vive el archivo, segun el README", () => {
  const validas = formasValidas(FORMAS_DEL_README);
  const desconocidas = FILAS.filter((f) => !validas.includes(f.forma)).map((f) => `${f.pieza}: "${f.forma}"`);
  assert.deepEqual(
    desconocidas,
    [],
    `estas filas declaran una forma que el README no reconoce (las validas son ${validas.join(", ")}): ` +
      `${desconocidas.join(", ")}`,
  );
  assert.deepEqual(
    formasIncoherentes(FILAS, FORMAS_DEL_README),
    [],
    "una fila dice una forma de distribucion y su archivo vive donde el README asigna otra. Decir 'Referenciado' " +
      "de algo que esta en plantilla/ le promete a un proyecto una correccion que nunca le va a llegar; decirlo " +
      "de algo que no llega al proyecto de ninguna manera —la herramienta que se corre una vez para crearlo— es " +
      "prometer una correccion que del lado del proyecto no tiene nada que corregir: esa etiqueta es 'No viaja'.",
  );
});

// LA PAGINA CONTRA plantilla/AGENTS.md, QUE ES EL ARCHIVO QUE EL PROYECTO HEREDA.
//
// QUE CIERRA. La pagina se vende como "el stack en un solo sitio", pero el sitio
// que el proyecto lee todos los dias es su propia constitucion, copiada del
// andamio. Cuando las dos difieren gana la copiada — y la divergencia no la ve
// nadie, porque nadie abre las dos el mismo dia. Los dos casos de abajo son las
// dos formas en que ya divergieron: una pieza congelada que la pagina no nombraba
// (shadcn/ui) y piezas congeladas presentadas como eleccion libre del proyecto.
test("stack · la pagina nombra todas las herramientas que la constitucion del andamio congela", () => {
  assert.ok(
    TEXTO_CONSTITUCION.includes(ANCLA_STACK_FIJADO),
    `no encontre '${ANCLA_STACK_FIJADO}' en ${CONSTITUCION}. Este caso NO se declara verde por no haber podido ` +
      "medir: si la seccion se renombro, actualiza el ancla en el mismo cambio.",
  );
  assert.ok(
    CONGELADAS.length >= 10,
    `lei ${CONGELADAS.length} herramienta(s) congelada(s) de ${CONSTITUCION} y se esperaban al menos diez: el ` +
      "parseo de su tabla dejo de reconocer las celdas y la comparacion pasaria vacuamente.",
  );
  assert.deepEqual(
    congeladasAusentes(TEXTO, CONGELADAS),
    [],
    `${CONSTITUCION} congela estas piezas y ${PAGINA} no las nombra. Son dos documentos diciendo cosas ` +
      "distintas sobre el mismo stack, y el que manda es el que viaja al proyecto. Arreglo: agregalas a la tabla " +
      "'Lo que el andamio trae implementado', o sacalas de la constitucion del andamio si de verdad ya no estan.",
  );
});

test("stack · 'Lo que elige el proyecto' no ofrece como elegible una pieza que el andamio congela", () => {
  const cuerpo = seccion(TEXTO, SECCION_ELIGE);
  assert.ok(
    cuerpo !== null,
    `no encontre la seccion '${SECCION_ELIGE}' en ${PAGINA}: si se renombro, actualiza este ancla en el mismo ` +
      "cambio en vez de dejar el caso midiendo nada.",
  );
  const ofrecidas = CONGELADAS.filter((h) => cuerpo.includes(h));
  assert.deepEqual(
    ofrecidas,
    [],
    `la seccion '${SECCION_ELIGE}' de ${PAGINA} ofrece ${ofrecidas.join(", ")} como decision del proyecto, y ` +
      `${CONSTITUCION} las declara congeladas: salvo la plataforma, ninguna fila de esa tabla es eleccion del ` +
      "proyecto. Apartarse de una es una decision que se pide y queda escrita, que no es lo mismo que elegir.",
  );
  assert.ok(
    cuerpo.includes(CONSTITUCION),
    `la seccion '${SECCION_ELIGE}' de ${PAGINA} no nombra ${CONSTITUCION}, que es el archivo que fija el camino ` +
      "para apartarse de una pieza congelada. Sin ese puntero, el lector no sabe a quien pedirselo.",
  );
});

test("stack · los paquetes que toca la tabla son los que declara el workspace", () => {
  const delWorkspace = paquetesDelWorkspace(leer(WORKSPACE), "plantilla").sort();
  assert.ok(
    delWorkspace.length >= 2,
    `${WORKSPACE} declaro ${delWorkspace.length} paquete(s): o el archivo cambio de forma, o el parseo dejo de ` +
      "reconocerlo. Menos de dos no es un monorepo.",
  );
  assert.deepEqual(
    paquetesDeLasFilas(FILAS),
    delWorkspace,
    `los paquetes que ${PAGINA} toca en su tabla y los que declara ${WORKSPACE} difieren. Un paquete del ` +
      "workspace sin ninguna fila es una capa del stack que la pagina no cuenta; una fila que apunta a un " +
      "paquete que ya no esta en el workspace es una capa que la pagina inventa.",
  );
});

test("stack · la pagina esta enlazada desde el README y desde el indice de docs/", () => {
  const raiz = leer("README.md");
  const indice = leer("docs/README.md");
  assert.ok(
    raiz.includes("docs/03-stack.md"),
    "README.md no enlaza docs/03-stack.md. La pagina se vende como el unico sitio donde el stack esta declarado: " +
      "si la puerta de entrada del repositorio no la nombra, no es el unico sitio, es un sitio mas.",
  );
  assert.ok(
    indice.includes("03-stack.md"),
    "docs/README.md no menciona 03-stack.md, y ese indice se vende como el mapa de la documentacion: un documento " +
      "que no aparece ahi es un documento que nadie encuentra.",
  );
});

// EL README NO VUELVE A FIJAR UN PROVEEDOR.
//
// QUE CIERRA. El README afirmaba que el marco FIJA "ECS Express + RDS como
// primera opcion de infraestructura". Lo que el marco fija de verdad es el flujo
// de specs, el pipeline, la gobernanza y los guardrails — propiedades que un
// proyecto cumple desplegando donde sea. Nombrar un proveedor ahi le cuesta plata
// a quien lee: da por cerrada una decision que es suya, y es la decision con mas
// impacto en el costo.
//
// ALCANCE DECLARADO: solo la seccion "Que NO es Projects", que es donde vivia la
// afirmacion. El resto del README puede nombrar un proveedor con toda razon —la
// tabla de incidentes cuenta uno real, con su fecha— y este caso no lo mira.
//
// DE DONDE SALE LA LISTA, y por que no es solo escrita. Los nombres escritos son
// productos concretos que ya aparecieron en este repo. A ellos se SUMAN los
// valores de plataforma que plantilla/AGENTS.md admite, leidos de ese archivo:
// son los que un proyecto tiene en la cabeza porque eligio uno, o sea los que mas
// chance tienen de volver, y el que se agregue manana entra a la guarda solo. La
// comparacion NO distingue mayusculas: `aws` en minuscula dentro de un spec es
// exactamente el mismo defecto que "AWS".
const PROVEEDORES_ESCRITOS = [
  "ECS",
  "RDS",
  "Aurora",
  "EKS",
  "Fargate",
  "Lambda",
  "AWS",
  "GCP",
  "Azure",
  "Terraform",
  "Supabase",
  "Cloudflare",
  "Vercel",
  "Heroku",
];
const PLATAFORMAS = plataformasAdmitidas(TEXTO_CONSTITUCION);
const PROVEEDORES = [
  ...PROVEEDORES_ESCRITOS,
  ...PLATAFORMAS.filter((p) => !PROVEEDORES_ESCRITOS.some((e) => e.toLowerCase() === p.toLowerCase())),
];

function nombrados(texto) {
  return PROVEEDORES.filter((p) => new RegExp(`\\b${p}\\b`, "i").test(texto));
}

test("stack · la lista de proveedores vigilados incluye las plataformas que el andamio admite", () => {
  assert.ok(
    TEXTO_CONSTITUCION.includes(ANCLA_PLATAFORMAS),
    `no encontre '${ANCLA_PLATAFORMAS}' en ${CONSTITUCION}, que es donde el andamio enumera las plataformas ` +
      "admitidas. Este caso NO se declara verde por no haber podido medir: si la frase se reescribio, actualiza " +
      "el ancla en el mismo cambio, porque de esa lista salen los nombres que los dos casos de abajo vigilan.",
  );
  assert.ok(
    PLATAFORMAS.length >= 3,
    `lei ${PLATAFORMAS.length} plataforma(s) admitida(s) de ${CONSTITUCION} y se esperaban al menos tres`,
  );
  const fuera = PLATAFORMAS.filter((p) => !nombrados(p).length);
  assert.deepEqual(
    fuera,
    [],
    `estas plataformas que ${CONSTITUCION} admite no las vigila nadie: ${fuera.join(", ")}. Son justamente los ` +
      "nombres con mas chance de volver a un spec o al README.",
  );
});

test("stack · el README no vuelve a nombrar un proveedor entre lo que el marco fija", () => {
  const raiz = leer("README.md");
  const desde = raiz.indexOf("## Qué NO es Projects");
  assert.ok(
    desde !== -1,
    "no encontre la seccion '## Qué NO es Projects' en README.md, que es donde vive lo que el marco fija y lo " +
      "que no. Este caso NO se declara verde por no haber podido medir: si la seccion se renombro, actualiza " +
      "este ancla en el mismo cambio.",
  );
  const cuerpo = raiz.slice(desde);
  const encontrados = nombrados(cuerpo);
  assert.deepEqual(
    encontrados,
    [],
    `la seccion 'Qué NO es Projects' del README nombra ${encontrados.join(", ")}. Lo que el marco fija se enumera ` +
      "sin proveedor: el flujo de specs, el pipeline, la gobernanza y los guardrails. Donde se despliega es " +
      "decision del proyecto —la de mas impacto en el costo— y se explica en docs/03-stack.md.",
  );
  assert.ok(
    cuerpo.includes("docs/03-stack.md"),
    "la seccion 'Qué NO es Projects' del README no enlaza docs/03-stack.md, que es donde el stack esta declarado " +
      "capa por capa. Sin el enlace, el lector se queda con el resumen y sin el detalle.",
  );
});

// LA MISMA REGLA DE LA PAGINA, APLICADA AL EJEMPLO DEL README.
//
// QUE CIERRA. El README manda apuntar a la version exacta y escribe el marcador
// `@vX.Y.Z` cuando lo explica, pero su bloque de ejemplo traia un pin literal
// —`@v1.4.1`— que nadie movia: el andamio ya pinaba otro. Un numero de version en
// la prosa envejece igual aca que en docs/03-stack.md, y este repo ya se comio esa
// leccion dos veces. El marcador no envejece; la version vigente la declara
// plantilla/.github/workflows/ci.yml, que es el ejemplo que de verdad se copia.
function pinesLiterales(texto) {
  return texto
    .split("\n")
    .map((linea, i) => ({ linea: linea.trim(), n: i + 1 }))
    .filter(({ linea }) => /@v\d+\.\d+\.\d+/.test(linea))
    .map(({ linea, n }) => `${README}:${n}: ${linea}`);
}

test("stack · el README no escribe un pin literal del marco en sus ejemplos", () => {
  assert.deepEqual(
    pinesLiterales(TEXTO_README),
    [],
    `${README} escribe una version exacta del marco a mano. El propio README manda escribir el marcador ` +
      "`@vX.Y.Z` y despues su ejemplo traia un pin que ya nadie movia, dos versiones por detras del que pina el " +
      "andamio. Arreglo: dejar el marcador y que la version vigente la declare " +
      "plantilla/.github/workflows/ci.yml, que es el ci.yml que de verdad se copia.",
  );
});

test("refutacion · un pin literal metido en el README se ve", () => {
  // Por INCREMENTO y no por total, como la guarda de digitos: asi este caso sigue
  // diciendo la verdad aunque el README ya traiga un pin (que es justo cuando el
  // caso de arriba esta rojo y este tiene que seguir midiendo lo suyo).
  const linea = (v) => `\n    uses: im-diego-ec/Projects/.github/workflows/marco-ci.yml@${v}\n`;
  assert.equal(
    pinesLiterales(`${TEXTO_README}${linea("v9.9.9")}`).length,
    pinesLiterales(TEXTO_README).length + 1,
    "le meti un pin literal a una copia del README y la comprobacion no lo vio",
  );
  assert.deepEqual(
    pinesLiterales(`${TEXTO_README}${linea("vX.Y.Z")}`),
    pinesLiterales(TEXTO_README),
    "la comprobacion marca el marcador `@vX.Y.Z`, que es justamente lo que hay que escribir: asi seria " +
      "imposible de cumplir",
  );
});

// LA PROPIEDAD EN LA QUE SE APOYA TODO LO DE ARRIBA: los specs del marco no
// nombran un proveedor.
//
// Es lo que hace que "el marco no fija donde se despliega" sea verdad y no una
// promesa: si un requirement nombrara la topologia, un proyecto que despliega en
// otro lado no podria satisfacerlo por mucho que lo hiciera bien. Medido hoy: los
// specs vivos no traen una sola tecnologia concreta. Este caso lo vuelve exigible
// en vez de dejarlo como casualidad historica.
test("stack · ningun spec vivo del marco nombra un proveedor de infraestructura", () => {
  const specs = readdirSync(join(RAIZ, "openspec/specs"), { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => `openspec/specs/${e.name}/spec.md`)
    .filter((ruta) => existsSync(join(RAIZ, ruta)));
  assert.ok(
    specs.length >= 5,
    `encontre ${specs.length} spec(s) vivos y se esperaban al menos 5: sin specs este caso pasaria vacuamente`,
  );
  const encontrados = [];
  for (const ruta of specs) {
    for (const proveedor of nombrados(leer(ruta))) encontrados.push(`${ruta}: ${proveedor}`);
  }
  assert.deepEqual(
    encontrados,
    [],
    `estos specs del marco nombran un proveedor: ${encontrados.join(", ")}. Un requirement que nombra la ` +
      "implementacion de referencia deja de poder cumplirlo un proyecto que despliega en otro lado, y ahi el " +
      "marco pasa a fijar la plataforma sin decirlo. Las propiedades se enuncian sin proveedor —promocion, " +
      "compuertas, verificacion de lo desplegado, secretos— y la pieza concreta se nombra en docs/03-stack.md.",
  );
});

// ---------------------------------------------------------------------------
// REFUTACIONES. Cada comprobacion de arriba, corriendo sobre una copia MUTADA en
// memoria, donde tiene que fallar. Sin esto, todos los verdes de arriba podrian
// ser un parser que no lee nada.
// ---------------------------------------------------------------------------

test("refutacion · una version escrita en la prosa se ve", () => {
  const mutada = TEXTO.replace("## Cómo leer los números de hoy", "## Cómo leer los números de hoy\n\npnpm 9.15.0\n");
  // Por incremento y no por total, para que el caso siga midiendo lo suyo aunque
  // la pagina ya traiga un digito (que es cuando el caso de arriba esta rojo).
  const nuevos = digitosFueraDeBloques(mutada).length - digitosFueraDeBloques(TEXTO).length;
  assert.equal(nuevos, 1, "la guarda de digitos no vio la version que se le metio a la prosa");
  assert.ok(digitosFueraDeBloques(mutada).some((d) => /9\.15\.0/.test(d.texto)));
});

test("refutacion · control · un numero DENTRO de un bloque de comando no se marca", () => {
  const mutada = `${TEXTO}\n\n\`\`\`bash\nnode --version   # v22\n\`\`\`\n`;
  assert.deepEqual(
    digitosFueraDeBloques(mutada),
    digitosFueraDeBloques(TEXTO),
    "la guarda de digitos mordio un bloque cercado: ahi vive el comando que IMPRIME los numeros, que es el " +
      "reemplazo de la tabla escrita a mano. Si muerde ahi, la pagina no puede publicar su propio comando.",
  );
});

test("refutacion · una clave que el manifiesto no declara no resuelve", () => {
  for (const fila of FILAS.slice(0, 3)) {
    const texto = leer(fila.ruta);
    assert.equal(
      declaracionEn(fila.ruta, texto, `${fila.clave}-que-no-existe`),
      null,
      `el lector de ${fila.ruta} devolvio algo para una clave inventada: entonces sus verdes de arriba no ` +
        "significan nada",
    );
  }
});

test("refutacion · una dependencia que se saca del manifiesto deja su fila sin resolver", () => {
  // La fila tiene que ser una DEPENDENCIA y no un campo de la raiz del
  // manifiesto (packageManager, por ejemplo): borrar los dos bloques de
  // dependencias no le sacaria nada a esa, y el caso pasaria sin morder.
  const fila = FILAS.find((f) => {
    if (!f.ruta.endsWith("package.json")) return false;
    const manifiesto = JSON.parse(leer(f.ruta));
    return ["dependencies", "devDependencies"].some((b) => manifiesto[b] && f.clave in manifiesto[b]);
  });
  assert.ok(fila, "ninguna fila apunta a una dependencia de un package.json: este caso no probaria nada");
  const manifiesto = JSON.parse(leer(fila.ruta));
  for (const bloque of ["dependencies", "devDependencies"]) {
    if (manifiesto[bloque]) delete manifiesto[bloque][fila.clave];
  }
  assert.equal(
    declaracionEn(fila.ruta, JSON.stringify(manifiesto), fila.clave),
    null,
    `saque ${fila.clave} de una copia de ${fila.ruta} y el lector siguio devolviendo una version: la ` +
      "comprobacion de divergencia no muerde",
  );
});

test("refutacion · una forma de distribucion cambiada se ve", () => {
  const mutadas = FILAS.map((f, i) => (i === 0 ? { ...f, forma: f.forma === "Scaffold" ? "Referenciado" : "Scaffold" } : f));
  // Se cuenta el INCREMENTO y no el total: asi el caso sigue midiendo lo suyo
  // aunque la pagina ya traiga una fila incoherente (que es cuando el caso de
  // arriba esta rojo y este tiene que seguir diciendo la verdad).
  assert.equal(
    formasIncoherentes(mutadas, FORMAS_DEL_README).length,
    formasIncoherentes(FILAS, FORMAS_DEL_README).length + 1,
    "le cambie la forma a una fila y la comprobacion no la señalo",
  );
});

test("refutacion · la forma esperada sale del README y no de la ruta que la fila escribe", () => {
  // La prueba de que la tautologia se fue: se muta el README —no la fila— y la
  // respuesta para la MISMA ruta cambia. Con la version vieja
  // (ruta.startsWith("plantilla/") ? ...) este caso seria imposible de escribir.
  const fila = FILAS.find((f) => f.ruta.startsWith("plantilla/"));
  assert.ok(fila, "ninguna fila del andamio: este caso no probaria nada");
  assert.equal(formaEsperada(fila.ruta, FORMAS_DEL_README), "Scaffold");
  const mutado = TEXTO_README.replace("| **Scaffold** |", "| **Repartido** |");
  assert.notEqual(mutado, TEXTO_README, "no encontre la fila Scaffold en la tabla del README: el ancla se movio");
  assert.equal(
    formaEsperada(fila.ruta, formasDelReadme(mutado)),
    "Repartido",
    "le renombre la forma al README y la respuesta para plantilla/ no cambio: entonces no la esta leyendo de ahi",
  );
});

test("refutacion · un archivo que el README no ubica en ninguna forma no viaja", () => {
  assert.equal(
    formaEsperada("herramientas/lo-que-sea.mjs", FORMAS_DEL_README),
    "No viaja",
    "el README no ubica herramientas/ en ninguna de sus formas, asi que lo que vive ahi no llega al proyecto: " +
      "si esta funcion contesta 'Referenciado', la fila mal clasificada que este caso vino a cazar volveria a pasar",
  );
});

test("refutacion · una herramienta congelada que la pagina deja de nombrar se ve", () => {
  const herramienta = CONGELADAS[CONGELADAS.length - 1];
  const mutada = TEXTO.split(herramienta).join("");
  const yaAusentes = congeladasAusentes(TEXTO, CONGELADAS);
  assert.deepEqual(
    congeladasAusentes(mutada, CONGELADAS).filter((h) => !yaAusentes.includes(h)),
    [herramienta],
    `saque "${herramienta}" de una copia de la pagina y la comparacion contra ${CONSTITUCION} no lo vio`,
  );
});

test("refutacion · una pieza congelada ofrecida como eleccion del proyecto se ve", () => {
  // Sobre una seccion sintetica y no sobre la de la pagina: si la pagina ya
  // nombrara una congelada ahi, este caso quedaria midiendo el defecto en vez de
  // medir la comprobacion, y el rojo de arriba ya lo esta diciendo.
  const herramienta = CONGELADAS[0];
  const mutado = `- **Donde se despliega**, y con que proveedor.\n- **${herramienta}**, si el equipo prefiere otra.\n`;
  assert.deepEqual(
    CONGELADAS.filter((h) => mutado.includes(h)),
    [herramienta],
    `meti "${herramienta}" en la lista de lo que elige el proyecto y la comprobacion no lo marco`,
  );
});

test("refutacion · un proveedor en minuscula se ve igual que en mayuscula", () => {
  // La guarda vieja era case-sensitive y la lista no traia aws ni gcp: las dos
  // formas en que este caso se le escapaba, medidas juntas.
  for (const forma of ["AWS", "aws", "Gcp", "terraform"]) {
    assert.ok(
      nombrados(`el deploy corre en ${forma} y se verifica despues`).length > 0,
      `"${forma}" paso la guarda de proveedores: escrito asi, nadie lo veria`,
    );
  }
  assert.deepEqual(
    nombrados("el despliegue se verifica en el ambiente compartido antes de promover"),
    [],
    "la guarda marca una frase que no nombra ningun proveedor: asi seria imposible de cumplir y la proxima " +
      "persona la apagaria en vez de arreglarla",
  );
});

test("refutacion · un paquete del workspace sin fila se ve", () => {
  const delWorkspace = paquetesDelWorkspace(leer(WORKSPACE), "plantilla").sort();
  const paquete = paquetesDeLasFilas(FILAS)[0];
  const mutadas = FILAS.filter((f) => !f.ruta.startsWith(`plantilla/${paquete}/`));
  assert.notDeepEqual(
    paquetesDeLasFilas(mutadas),
    delWorkspace,
    `borre todas las filas de plantilla/${paquete}/ y la comparacion con el workspace siguio dando igual`,
  );
});
