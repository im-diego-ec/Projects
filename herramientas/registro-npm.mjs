// ---------------------------------------------------------------------------
// LA UNICA PUERTA DEL MARCO A registry.npmjs.org.
//
// POR QUE ES UN MODULO Y NO DOS LLAMADAS SUELTAS. Dos herramientas de esta
// carpeta necesitan preguntarle algo al registro y las dos tienen la MISMA
// obligacion: no bloquear a nadie por no tener red. `projects-versiones.mjs`
// pregunta "que version publicada tiene hoy cada paquete" y `projects-init.mjs`
// pregunta "se llega al registro?" antes de intentar un `install` que sin red
// tarda decenas de segundos en morir con un volcado del gestor de paquetes.
// Escrito dos veces, el techo de tiempo y el manejo del corte se escriben dos
// veces — y el segundo siempre es el que se olvida de alguno.
//
// LAS TRES REGLAS QUE ESTE MODULO GARANTIZA, y que valen para los dos que lo
// usan:
//   1. NUNCA TIRA. Todas las salidas son `{ ..., error }` con el error como
//      dato. Un modulo de red que lanza obliga a envolver cada llamada en un
//      try, y el try que falta es el que convierte "no hay wifi" en un volcado
//      del runtime encima de un repo recien escrito.
//   2. SIEMPRE TIENE TECHO DE TIEMPO. Un fetch sin `signal` no vuelve nunca
//      cuando el otro lado acepta la conexion y se queda callado — que es
//      exactamente lo que hace un proxy corporativo mal configurado, el caso
//      mas probable en la maquina de quien adopta el marco.
//   3. UNA SOLA PASADA, EN PARALELO. Cuarenta consultas en serie con 8 segundos
//      de techo cada una son cinco minutos de peor caso; en paralelo, ocho
//      segundos.
//
// ESTE MODULO NO TIENE POLITICA DE VERSIONES, y es deliberado: devuelve lo que
// el registro DICE (el tag `latest`) y no decide si eso es una version que
// convenga proponer. Esa decision necesita comparar numeros de version, vive en
// projects-versiones.mjs junto al comparador que ya existe en el marco, y
// meterla aca ademas cerraria un ciclo de imports entre los dos archivos.
//
// EL `buscar` INYECTABLE NO ES DECORACION. Es lo que hace que el banco pueda
// ver ROJO cada rama: un registro que contesta 404, uno que contesta un JSON sin
// `latest`, uno que acepta la conexion y no responde nunca. Sin eso, las ramas
// de error de este archivo serian codigo que nadie ejecuto jamas — y una guarda
// que nadie vio fallar no es una guarda. El banco vive en
// pruebas/init/registro-npm.test.mjs y levanta el registro de mentira de
// pruebas/init/registro-falso.mjs.
//
// LO QUE CONTESTA EL OTRO LADO ES TEXTO DE UN TERCERO, NO UN DATO DE CONFIANZA.
// Es la cuarta regla, y se agrego DESPUES de medir el agujero: la respuesta del
// registro termina —via projects-versiones.mjs— PEGADA DENTRO DE LAS COMILLAS de
// un package.json que a continuacion alguien instala. Un registro hostil, un
// espejo interno comprometido o un PROJECTS_REGISTRO_NPM apuntado mal que
// conteste
//   9.9.9"}, "scripts": { "preinstall": "echo lo-que-sea" }, "zzz": { "a": "1
// escribia un `scripts.preinstall` de PRIMER NIVEL en el manifiesto, con el
// archivo quedando JSON valido y la herramienta reportando exito — y ese script
// lo corre el `pnpm install` que la propia herramienta manda a ejecutar en la
// linea siguiente. Por eso `latest` se valida contra la forma de una version
// semver antes de devolverse (`esVersionPublicable`) y el NOMBRE se valida antes
// de armar la URL (`nombreDePaqueteValido`): las dos direcciones, no una. Lo que
// no pasa el filtro sale como ERROR —o sea, cae en "de estos no se sabe nada"— y
// nunca como un hecho.
// ---------------------------------------------------------------------------

/** El registro publico. Es el default y el unico que se usa en la practica. */
export const REGISTRO_POR_DEFECTO = "https://registry.npmjs.org";

/** El techo de tiempo por consulta. Ocho segundos es holgado para una respuesta
 *  que en una red sana llega en menos de 300 ms, y es corto frente a lo que
 *  cuesta la alternativa: quedarse colgado. */
export const TIMEOUT_POR_DEFECTO = 8000;

/** La variable de entorno que apunta el marco a OTRO registro.
 *
 *  POR QUE EXISTE, y no es un gancho de pruebas disfrazado —aunque el banco lo
 *  use—: hay organizaciones donde el unico registro alcanzable es un espejo
 *  interno, y una herramienta que solo sabe hablarle a la URL publica ahi no
 *  reporta "esta desactualizado": reporta que no hay red, sobre paquetes que si
 *  se pueden consultar. Y del lado del banco es lo que permite levantar un
 *  registro de mentira en localhost y ver las ramas de error de verdad. */
export const VARIABLE_DE_REGISTRO = "PROJECTS_REGISTRO_NPM";

/** Cuantas consultas pueden estar en vuelo a la vez.
 *
 *  POR QUE HAY UN TECHO Y NO UN `Promise.all` PELADO sobre la lista entera. Hoy
 *  el andamio declara 40 nombres unicos y 40 sockets a la vez no le molestan a
 *  nadie, pero esta herramienta tambien se apunta con `--raiz` a un proyecto ya
 *  instanciado: ahi la lista la decide ESE arbol, no este repo, y un monorepo de
 *  varios cientos de dependencias abre varios cientos de conexiones simultaneas
 *  contra el registro. Eso no falla claro —se reparte entre 429 del registro,
 *  timeouts de la propia herramienta y un proxy corporativo que corta— o sea que
 *  se lee como "el registro no contesta" sobre paquetes que si estaban.
 *
 *  Diecisies es el numero que deja el peor caso donde estaba: 40 paquetes salen
 *  en 3 tandas de 8 segundos de techo, no en 40 esperas en serie. Es un techo de
 *  CONCURRENCIA, no un lote rigido: en cuanto una consulta vuelve entra la
 *  siguiente. */
export const MAX_EN_PARALELO = 16;

/** La forma que puede tener una version que el registro declara publicada: la
 *  gramatica de semver y nada mas (`1.2.3`, `8.0.0-rc.10`, `1.0.0+build.5`).
 *
 *  ESTO NO ES COSMETICA NI "validar por validar": es lo unico que separa el
 *  texto que contesta un tercero de lo que se escribe dentro de las comillas de
 *  un package.json. El juego de caracteres que este patron deja pasar
 *  —`[0-9A-Za-z.+-]`— no contiene comilla, ni barra invertida, ni `$`, ni
 *  caracteres de control: o sea que lo que pasa por aca NO PUEDE cerrar la
 *  cadena JSON en la que se lo pega, ni actuar como patron de reemplazo en el
 *  `String.replace` que lo pega. El caso de largo esta acotado aparte porque la
 *  gramatica de semver no acota el largo y un `latest` de megas no rompe nada
 *  pero tampoco es una version: la publicacion mas larga del registro publico
 *  esta muy por debajo de 128. */
export const LARGO_MAXIMO_DE_VERSION = 128;
const FORMA_DE_VERSION = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;

export function esVersionPublicable(v) {
  return typeof v === "string" && v.length > 0 && v.length <= LARGO_MAXIMO_DE_VERSION && FORMA_DE_VERSION.test(v);
}

/** La forma que puede tener un NOMBRE de paquete antes de entrar a una URL.
 *
 *  LA OTRA DIRECCION DEL MISMO AGUJERO, y tambien esta medida. El nombre sale de
 *  las CLAVES de un package.json —o sea, de un archivo que esta herramienta no
 *  escribio— y se interpola en la ruta de la peticion. Sin validar:
 *   · una clave `..` sacaba la consulta del endpoint de paquete y terminaba
 *     pegandole a `/-/dist-tags`;
 *   · `a?x=1` metia query string en la URL del registro;
 *   · `a#f` cortaba en el fragmento y la herramienta reportaba la version de
 *     OTRO paquete (`a`) como si fuera la de `a#f`, que es el peor de los tres:
 *     no falla, MIENTE;
 *   · en `@a/b/c` la segunda barra quedaba sin codificar y alcanzaba otra ruta
 *     del host.
 *  Contra el registro publico eso da 404 o una mala atribucion; contra el espejo
 *  interno al que existe PROJECTS_REGISTRO_NPM para apuntar, alcanzar otras
 *  rutas del host si importa.
 *
 *  Se acepta la forma que documenta npm: un scope opcional y un nombre, con el
 *  primer caracter alfanumerico. Las mayusculas se dejan pasar porque hay
 *  paquetes viejos publicados con ellas y rechazarlos seria reportar "no se
 *  sabe" sobre dependencias legitimas. Lo que NO pasa es `/` fuera del scope,
 *  `?`, `#`, `%`, `:`, `..` y todo lo demas. */
export const LARGO_MAXIMO_DE_NOMBRE = 214; // el maximo que acepta npm al publicar
const FORMA_DE_SEGMENTO = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

export function nombreDePaqueteValido(nombre) {
  if (typeof nombre !== "string" || nombre === "" || nombre.length > LARGO_MAXIMO_DE_NOMBRE) return false;
  const partes = nombre.startsWith("@") ? nombre.slice(1).split("/") : [nombre];
  if (nombre.startsWith("@") && partes.length !== 2) return false;
  if (!nombre.startsWith("@") && partes.length !== 1) return false;
  return partes.every((p) => FORMA_DE_SEGMENTO.test(p));
}

/** El registro que corresponde usar. Una cadena vacia o con espacios cuenta como
 *  ausente: `PROJECTS_REGISTRO_NPM=` en un shell que exporta la variable vacia es
 *  "no la configure", no "usa la cadena vacia como URL". */
export function registroDe(env = process.env) {
  const v = env?.[VARIABLE_DE_REGISTRO];
  if (typeof v !== "string" || v.trim() === "") return REGISTRO_POR_DEFECTO;
  return sinBarraFinal(v.trim());
}

function sinBarraFinal(url) {
  return url.replace(/\/+$/, "");
}

/** La URL de las ETIQUETAS de un paquete, y no la del documento del paquete.
 *
 *  ESTO ES UNA DIFERENCIA MEDIDA, no una preferencia. El documento completo trae
 *  una entrada por cada version publicada: medido contra el registro publico con
 *  la cabecera abreviada, `prisma` pesa 23 MB y `typescript` 8,6 MB. Cuarenta
 *  paquetes en paralelo asi son cientos de megas bajados y parseados para leer
 *  un numero de cada uno. El endpoint de etiquetas devuelve SOLO el mapa de tags:
 *  medido, entre 63 y 308 bytes por paquete.
 *
 *  La barra de un scope (`@eslint/js`) se codifica y el resto NO. No es
 *  cosmetica: sin codificar, el registro lee `@eslint` y `js` como dos segmentos
 *  de ruta y contesta 404 sobre un paquete que existe — o sea, la herramienta
 *  reportaria "no pude consultarlo" para los paquetes con scope del andamio y
 *  verde para el resto. `encodeURIComponent` sobre el nombre entero tampoco
 *  sirve: codifica tambien la arroba, y esa forma no es la que el registro
 *  documenta.
 *
 *  Y SE CODIFICA SEGMENTO POR SEGMENTO, no con un `replace("/", "%2F")` que solo
 *  toca la PRIMERA barra: con una sola barra tocada, la clave `@a/b/c` dejaba la
 *  segunda sin codificar y la peticion alcanzaba otra ruta del host. Codificando
 *  cada segmento, ni una barra de mas, ni un `?` ni un `#` sobreviven. La arroba
 *  se devuelve sin codificar a proposito (`%40` no es la forma que el registro
 *  documenta).
 *
 *  LO QUE ESTA CODIFICACION *NO* PUEDE CERRAR, y esta MEDIDO: el recorrido de
 *  directorio. `new URL("http://r/-/package/%2E%2E/dist-tags").pathname` devuelve
 *  `/-/dist-tags` — el parser de WHATWG, que es el que usa `fetch`, decodifica
 *  el `%2E` y despues colapsa el segmento de puntos, asi que escapar los puntos
 *  es un consuelo falso y por eso no se hace. Esa direccion la cierra
 *  `nombreDePaqueteValido`, que corre en `consultarEtiquetas` —la unica puerta
 *  de este modulo a la red— ANTES de armar esta URL. Escribirlo aca en vez de
 *  fingir una defensa que no defiende es la diferencia entre una guarda y un
 *  comentario tranquilizador. */
function segmentoDeRuta(s) {
  return encodeURIComponent(s).replace(/%40/g, "@");
}

export function urlDeEtiquetas(nombre, registro = REGISTRO_POR_DEFECTO) {
  const ruta = String(nombre).split("/").map(segmentoDeRuta).join("%2F");
  return `${sinBarraFinal(registro)}/-/package/${ruta}/dist-tags`;
}

/** `fetch` con techo de tiempo, sin dejar el temporizador vivo.
 *
 *  `AbortSignal.timeout` haria esto en una linea, pero llego en Node 17.3 y las
 *  herramientas de esta carpeta declaran un piso de 18.17: el ahorro no vale
 *  estrenar un `TypeError` en la franja baja de ese rango. `AbortController`
 *  existe desde Node 15. */
async function pedir(url, { timeout, buscar }) {
  const control = new AbortController();
  const reloj = setTimeout(() => control.abort(), timeout);
  try {
    return { respuesta: await buscar(url, { signal: control.signal, headers: { accept: "application/json" } }), error: null };
  } catch (e) {
    // Un abort propio y un corte de red son cosas distintas para quien lee el
    // mensaje: "no contesto en 8000 ms" manda a mirar el proxy, "fetch failed"
    // manda a mirar si hay red. Colapsarlos en uno solo manda a mirar mal.
    const abortado = e?.name === "AbortError" || control.signal.aborted;
    return { respuesta: null, error: abortado ? `no contesto en ${timeout} ms` : (e?.message ?? String(e)) };
  } finally {
    clearTimeout(reloj);
  }
}

/** Que version tiene el tag `latest` de UN paquete, segun el registro.
 *
 *  `latest` es lo que el PUBLICADOR declara como la version que se instala por
 *  defecto. Es el dato correcto para preguntar "que hay hoy", y no es lo mismo
 *  que "el numero mas alto publicado": el numero mas alto puede ser una
 *  prerelease. Que hacer cuando el propio `latest` es una prerelease lo decide
 *  quien llama — este modulo devuelve el hecho, no la politica.
 *
 *  NO TIRA NUNCA: devuelve `{ paquete, latest, error }` y el error es dato. */
export async function consultarEtiquetas(nombre, opciones = {}) {
  const { registro = registroDe(), timeout = TIMEOUT_POR_DEFECTO, buscar = fetch } = opciones;
  // El nombre se mira ANTES de armar la URL: una clave rara de un package.json
  // no puede decidir a que ruta del registro se le pega. Ver
  // `nombreDePaqueteValido` para los cuatro casos medidos.
  if (!nombreDePaqueteValido(nombre)) {
    return {
      paquete: nombre,
      latest: null,
      error: `ese nombre de paquete no tiene la forma que documenta npm (scope opcional + nombre alfanumerico), asi que NO se consulta: con el armado la URL apuntaria a otra ruta del registro`,
    };
  }
  const { respuesta, error } = await pedir(urlDeEtiquetas(nombre, registro), { timeout, buscar });
  if (error) return { paquete: nombre, latest: null, error };
  if (!respuesta.ok) {
    return {
      paquete: nombre,
      latest: null,
      error:
        respuesta.status === 404
          ? "el registro no conoce ese paquete (404)"
          : `el registro contesto ${respuesta.status}`,
    };
  }
  let cuerpo;
  try {
    cuerpo = await respuesta.json();
  } catch (e) {
    return { paquete: nombre, latest: null, error: `la respuesta no era JSON: ${e?.message ?? e}` };
  }
  const latest = cuerpo?.latest;
  if (typeof latest !== "string" || latest === "") {
    // Un espejo interno mal configurado contesta 200 con un documento sin
    // `latest`. Tratar eso como "no hay version" y seguir seria reportar
    // "al dia" sobre un paquete que nunca se consulto de verdad.
    return { paquete: nombre, latest: null, error: "la respuesta no trae el tag latest" };
  }
  // Y LA FORMA DE LO QUE TRAE, que es la guarda que faltaba. Un `latest` que no
  // es una version no es "una version rara": es texto de un tercero camino a las
  // comillas de un package.json. Ver el encabezado de este archivo para el
  // payload exacto que entraba por aca. Sale como error para que caiga en "de
  // estos NO se sabe nada" y no como un hecho.
  if (!esVersionPublicable(latest)) {
    return {
      paquete: nombre,
      latest: null,
      error:
        `el tag latest que contesto ${registro} no tiene forma de version publicable ` +
        `(${JSON.stringify(latest.length > 80 ? `${latest.slice(0, 80)}…` : latest)}). NO se usa: ese texto termina ` +
        `dentro de las comillas de un package.json`,
    };
  }
  return { paquete: nombre, latest, error: null };
}

/** Lo mismo para MUCHOS paquetes, en una sola pasada y en paralelo.
 *
 *  Los nombres se deduplican antes de salir a la red: `typescript` esta
 *  declarado en tres manifiestos del andamio y son una consulta, no tres.
 *  Devuelve un Map nombre -> resultado, con una entrada por nombre unico
 *  SIEMPRE — incluidas las que fallaron, que ahi llevan `latest: null` y su
 *  error. Un Map al que le faltan las que fallaron obliga a quien llama a
 *  distinguir "no esta" de "fallo", y esa distincion es donde se cuela el
 *  "al dia" sobre algo que no se pudo consultar. */
export async function consultarEtiquetasDe(nombres, opciones = {}) {
  const { maxEnParalelo = MAX_EN_PARALELO } = opciones;
  const unicos = [...new Set(nombres)];
  const resultados = new Array(unicos.length);
  // Un cursor compartido y N obreros: en cuanto uno termina toma el siguiente
  // nombre, asi que nunca hay mas de N en vuelo y tampoco se espera a que
  // termine una tanda entera para empezar la que sigue. Ver MAX_EN_PARALELO.
  let siguiente = 0;
  const obrero = async () => {
    for (;;) {
      const i = siguiente++;
      if (i >= unicos.length) return;
      resultados[i] = await consultarEtiquetas(unicos[i], opciones);
    }
  };
  const cuantos = Math.max(1, Math.min(maxEnParalelo, unicos.length));
  await Promise.all(Array.from({ length: cuantos }, obrero));
  return new Map(resultados.map((r) => [r.paquete, r]));
}

/** Se llega al registro?
 *
 *  QUIEN PREGUNTA ESTO Y POR QUE. `projects-init.mjs`, antes de lanzar el
 *  `install` del arranque. Sin red ese install no falla rapido: tarda decenas de
 *  segundos en agotar sus reintentos y muere con un volcado del gestor de
 *  paquetes que no dice "no hay red" en ninguna parte — encima de un repo recien
 *  escrito, que es el peor momento para leer un diagnostico equivocado.
 *  Preguntando primero, la herramienta puede decir la verdad ("sin red: el
 *  arranque queda pendiente, corre estos comandos cuando la tengas") y SEGUIR,
 *  que es lo que el arranque promete.
 *
 *  `/-/ping` y no un paquete cualquiera: es el endpoint que el registro publica
 *  para esto, no depende de que un nombre siga existiendo, y su respuesta es de
 *  bytes contados. El techo es la mitad del normal porque esto es una pregunta
 *  de si/no delante de un paso largo, no un dato que alguien vaya a leer. */
export async function alcanzaElRegistro(opciones = {}) {
  const { registro = registroDe(), timeout = Math.round(TIMEOUT_POR_DEFECTO / 2), buscar = fetch } = opciones;
  const { respuesta, error } = await pedir(`${sinBarraFinal(registro)}/-/ping`, { timeout, buscar });
  if (error) return { ok: false, registro, error };
  if (!respuesta.ok) return { ok: false, registro, error: `contesto ${respuesta.status}` };
  return { ok: true, registro, error: null };
}
