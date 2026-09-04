import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  PREGUNTAS,
  correrAsistente,
  derivar,
  desvios,
  lineasDeResumen,
  usaAws,
  RELLENO_AWS,
  RELLENO_SLACK,
} from "../../herramientas/projects-asistente.mjs";
import { REQUERIDOS, FORMATOS, validarValores } from "../../herramientas/projects-init.mjs";

const ANDAMIO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../plantilla");

// ---------------------------------------------------------------------------
// EL CAMINO DEL PO, PROBADO SIN UNA TERMINAL.
//
// `correrAsistente` recibe el preguntador por parametro, y esa forma es la razon
// de que este banco exista: con una funcion que devuelve respuestas escritas de
// antemano se puede afirmar CUANTAS preguntas se hicieron, EN QUE ORDEN, y que
// el archivo que sale pasa el validador de siempre. Metido adentro de main(), la
// unica forma de ejercerlo seria simular un teclado, y eso en los tres sistemas
// donde corre este banco significa un pseudo-terminal que no existe.
//
// LA AFIRMACION QUE MAS IMPORTA de todo el archivo: los valores que produce el
// asistente pasan `validarValores` —el de siempre, no una copia—. Dos
// validaciones distintas divergen, y la que se pudre es la que nadie mira.
// ---------------------------------------------------------------------------

/** Un preguntador de mentira: devuelve el guion y ANOTA lo que se pregunto.
 *
 *  SE MANTIENE EL POSICIONAL porque hay casos que necesitan afirmar el ORDEN,
 *  pero para elegir respuestas concretas se usa `contestador` de abajo. */
/** Lo que la herramienta DERIVA y no pregunta: la cuenta donde vive el marco,
 *  que sale del remoto del clon. En el banco se fija a mano para que estos casos
 *  no dependan de que la maquina donde corren tenga un remoto configurado. */
const DERIVADOS = { ORG_MARCO: "im-diego-ec" };

function guionista(respuestas) {
  const preguntado = [];
  let i = 0;
  const preguntar = async (texto) => {
    preguntado.push(texto);
    return respuestas[i++] ?? "";
  };
  return { preguntar, preguntado };
}

/** Contesta POR ID DE PREGUNTA, no por posicion.
 *
 *  EL DEFECTO QUE ESTA FUNCION CIERRA, y es el que dejo pasar dos bugs que
 *  rompian el camino feliz: con guiones posicionales, un caso de este mismo
 *  archivo se llamaba «solo, sin plataforma, slack, privado» y contestaba
 *  «correo», porque su guion se habia desalineado cuando una pregunta
 *  condicional cambio de lugar. El caso pasaba en VERDE afirmando que probaba
 *  Slack, y el camino de Slack estuvo roto con 580 pruebas en verde.
 *
 *  Contestando por id, un guion desalineado es imposible: o la pregunta se hace
 *  y se contesta lo que se quiso, o no se hace y no aparece en `preguntado`. */
function contestador(mapa) {
  const preguntado = [];
  const textos = [];
  const preguntar = async (texto, id) => {
    preguntado.push(id);
    textos.push(texto);
    return mapa[id] ?? "";
  };
  return { preguntar, preguntado, textos };
}

/** Un valor valido para cada pregunta de texto libre, por id. */
const TEXTO_VALIDO = {
  PROYECTO: "un-proyecto",
  ORG: "una-cuenta",
  BUILDER_2: "la-otra-persona",
  CUENTA_DEV: "111111111111",
  CUENTA_PROD: "222222222222",
  REGION: "us-east-1",
  PERFIL_DEV: "perfil-dev",
  PERFIL_PROD: "perfil-prod",
  DOMINIO_PROD: "midominio.com",
  CANAL_ALERTAS: "#alertas",
};

/** Cuenta las preguntas de verdad: cada una imprime una linea `[n/total]`. */
const cuantasPreguntas = (dicho) => dicho.filter((l) => l.startsWith("\n[")).length;

const PO_SOLO = { PROYECTO: "agenda-de-personas", ORG: "im-diego-ec" };
const AWS_DOS = {
  PROYECTO: "tienda-online",
  ORG: "mi-org",
  equipo: "2",
  BUILDER_2: "otra-persona",
  plataforma: "2",
  ambientes: "2",
  CUENTA_DEV: "111111111111",
  CUENTA_PROD: "222222222222",
  REGION: "us-east-1",
  PERFIL_DEV: "td-dev",
  PERFIL_PROD: "td-prod",
  dominio: "2",
  DOMINIO_PROD: "tienda.com",
};

test("el caso mas simple son NUEVE preguntas, y solo dos hay que escribirlas", async () => {
  const { preguntar } = contestador({ ...TEXTO_VALIDO, ...PO_SOLO });
  const { dicho, respuestas } = await correrAsistente(preguntar, {}, {}, () => {}, DERIVADOS);
  assert.equal(
    cuantasPreguntas(dicho),
    9,
    "el numero de preguntas del caso simple es la promesa central de esta herramienta: nueve en vez de veintiuna " +
      "casillas a mano. " +
      "Si sube, o se agrego una pregunta que no hacia falta, o se rompio un `salta`",
  );
  // Las seis restantes se contestaron con Enter, o sea con la recomendada.
  assert.deepEqual(
    {
      equipo: respuestas.equipo,
      plataforma: respuestas.plataforma,
      ambientes: respuestas.ambientes,
      dominio: respuestas.dominio,
      avisos: respuestas.avisos,
      visibilidad: respuestas.visibilidad,
    },
    { equipo: "solo", plataforma: "supabase", ambientes: "uno", dominio: "gratuito", avisos: "correo", visibilidad: "publico" },
    "Enter tiene que elegir la opcion recomendada de cada pregunta: si no, el 'caso simple' no es simple",
  );
});

test("elegir AWS con dos ambientes hace DIECISEIS preguntas, y ninguna es de relleno", async () => {
  const { preguntar } = contestador({ ...TEXTO_VALIDO, ...AWS_DOS });
  const { dicho, valores } = await correrAsistente(preguntar, {}, {}, () => {}, DERIVADOS);
  assert.equal(cuantasPreguntas(dicho), 16, "con AWS y dos ambientes se preguntan las cinco de AWS mas el dominio propio");
  // El defecto que este caso vigila: la primera version del asistente SALTEABA
  // las cinco preguntas de AWS junto con el relleno, asi que quien elegia AWS
  // se quedaba sin sus propios datos y el archivo salia invalido.
  assert.equal(valores.CUENTA_DEV, "111111111111", "la cuenta de pruebas tiene que salir de la respuesta, no del relleno");
  assert.equal(valores.CUENTA_PROD, "222222222222", "con DOS ambientes las cuentas son distintas");
  assert.equal(valores.REGION, "us-east-1");
  assert.notEqual(valores.PERFIL_DEV, RELLENO_AWS.PERFIL_DEV, "eligiendo AWS, el perfil no puede ser el relleno de 'sin AWS'");
});

test("con AWS y UN ambiente no se pregunta dos veces por el mismo dato", async () => {
  const { preguntar } = contestador({
    ...TEXTO_VALIDO,
    PROYECTO: "api-interna",
    ORG: "alguien",
    plataforma: "2",
    CUENTA_DEV: "111111111111",
    REGION: "sa-east-1",
    PERFIL_DEV: "mi-perfil",
    avisos: "2",
    CANAL_ALERTAS: "#alertas",
    visibilidad: "2",
  });
  const { valores, dicho } = await correrAsistente(preguntar, {}, {}, () => {}, DERIVADOS);
  assert.equal(cuantasPreguntas(dicho), 13, "con un solo ambiente se saltean la cuenta y el perfil de produccion");
  assert.equal(valores.CUENTA_PROD, valores.CUENTA_DEV, "con un ambiente, la cuenta de 'produccion' ES la misma");
  assert.equal(valores.PERFIL_PROD, valores.PERFIL_DEV, "y el perfil tambien");
});

test("LO QUE MAS IMPORTA: lo que produce el asistente pasa el validador de siempre", async () => {
  const CASOS = {
    "PO solo, supabase, publico": PO_SOLO,
    "equipo, AWS, dos ambientes": AWS_DOS,
    "solo, AWS, un ambiente": {
      PROYECTO: "api-interna",
      ORG: "alguien",
      plataforma: "2",
      CUENTA_DEV: "111111111111",
      REGION: "sa-east-1",
      PERFIL_DEV: "mi-perfil",
    },
    "solo, sin plataforma, slack, privado": {
      PROYECTO: "idea-nueva",
      ORG: "alguien",
      plataforma: "3",
      avisos: "2",
      visibilidad: "2",
    },
    "un sitio para leer": { PROYECTO: "mi-blog", ORG: "alguien", forma: "2" },
    "un sitio, con dominio propio": {
      PROYECTO: "mi-blog",
      ORG: "alguien",
      forma: "2",
      dominio: "2",
      DOMINIO_PROD: "miblog.com",
    },
  };
  const rotos = [];
  for (const [nombre, guion] of Object.entries(CASOS)) {
    const { preguntar } = contestador({ ...TEXTO_VALIDO, ...guion });
    const { valores } = await correrAsistente(preguntar, {}, FORMATOS, () => {}, DERIVADOS);
    const faltan = REQUERIDOS.filter((k) => !(k in valores));
    const { problemas } = validarValores(valores);
    if (faltan.length || problemas.length) rotos.push(`${nombre}: faltan [${faltan}] problemas [${problemas.join(" | ")}]`);
  }
  assert.deepEqual(
    rotos,
    [],
    "el asistente produce el MISMO archivo que entra por --valores, asi que si no pasa validarValores no sirve para nada:\n  " +
      rotos.join("\n  "),
  );
});

test("las claves salen completas, ni una de mas ni una de menos", async () => {
  const { preguntar } = contestador({ ...TEXTO_VALIDO, ...PO_SOLO });
  const { valores } = await correrAsistente(preguntar, {}, {}, () => {}, DERIVADOS);
  // `plataforma` va aparte y en minuscula: no es un marcador que el andamio
  // sustituya, es la decision de QUE archivos viajan. Por eso se saca antes de
  // comparar, y por eso se comprueba que este.
  const { plataforma, forma, ...marcadores } = valores;
  assert.equal(plataforma, "supabase", "la plataforma elegida tiene que quedar escrita en el archivo de valores");
  assert.equal(forma, "aplicacion", "y la forma tambien: las dos deciden QUE archivos viajan, no que texto se sustituye");
  assert.deepEqual(
    Object.keys(marcadores).sort(),
    [...REQUERIDOS].sort(),
    "el conjunto de MARCADORES tiene que coincidir EXACTO con REQUERIDOS: una clave de mas la ignora el motor " +
      "en silencio, y una de menos aborta la corrida",
  );
});

test("una respuesta con mala forma se vuelve a pedir en el momento, no veinte preguntas despues", async () => {
  // "Agenda De Personas" con mayusculas y espacios no pasa el patron de PROYECTO.
  // La normalizacion lo arregla sola; lo que este caso vigila es que un valor
  // que NI ASI pasa se rechace ahi mismo.
  // Un preguntador que contesta VACIO la primera vez que le preguntan por el
  // nombre, y despues bien. Es el unico que ejercita el reintento de verdad.
  const yaPreguntado = new Set();
  const preguntado = [];
  const preguntar = async (_texto, id) => {
    preguntado.push(id);
    if (id === "PROYECTO" && !yaPreguntado.has(id)) {
      yaPreguntado.add(id);
      return "";
    }
    return { ...TEXTO_VALIDO, PROYECTO: "no-vale-vacio", ORG: "im-diego-ec" }[id] ?? "";
  };
  const { dicho, respuestas } = await correrAsistente(preguntar, {}, FORMATOS, () => {}, DERIVADOS);
  assert.ok(
    dicho.some((l) => l.includes("hay que contestarla")),
    "una respuesta vacia en una pregunta sin valor por defecto tiene que avisar y volver a preguntar",
  );
  assert.equal(respuestas.PROYECTO, "no-vale-vacio", "y despues tiene que aceptar la buena");
  assert.ok(preguntado.length >= 9, "volver a preguntar significa una interaccion mas, no seguir de largo");
});

test("los acentos y las mayusculas del nombre se arreglan solos, y se dice que se arreglaron", async () => {
  const { preguntar } = contestador({ ...TEXTO_VALIDO, PROYECTO: "Agenda De Añejos", ORG: "alguien" });
  const { respuestas, dicho } = await correrAsistente(preguntar, {}, FORMATOS, () => {}, DERIVADOS);
  assert.equal(respuestas.PROYECTO, "agenda-de-anejos", "GitHub no acepta mayusculas ni acentos en un nombre de repo");
  assert.ok(
    dicho.some((l) => l.includes("se guardó como")),
    "arreglarlo en silencio es peor que no arreglarlo: la persona tiene que ver con que nombre quedo",
  );
});

test("volver a correrlo ofrece lo de antes, y Enter lo mantiene", async () => {
  const previos = { PROYECTO: "lo-de-antes", ORG: "alguien" };
  // Contesta vacio a todo: lo que sostiene la corrida son los `previos`, que es
  // exactamente lo que se quiere afirmar.
  const { preguntar, textos } = contestador({});
  const { respuestas } = await correrAsistente(preguntar, previos, FORMATOS, () => {}, DERIVADOS);
  assert.equal(respuestas.PROYECTO, "lo-de-antes", "Enter sobre una respuesta previa tiene que mantenerla");
  assert.ok(
    textos.some((t) => t.includes("Enter mantiene: lo-de-antes")),
    "y el ofrecimiento tiene que verse: si no, la persona no sabe que puede apretar Enter",
  );
});

// ---------------------------------------------------------------------------
// LOS DESVIOS. El marco permite apartarse de casi cualquier pieza; lo que no
// permite es que apartarse sea algo que se descubre despues.
// ---------------------------------------------------------------------------

test("trabajar solo APAGA la aprobacion ajena y lo deja firmado", () => {
  const d = desvios({ equipo: "solo", plataforma: "aws", avisos: "slack", visibilidad: "publico" });
  const regla = d.find((x) => x.regla === "github-review-cruzado-automatizado");
  assert.ok(regla, "con una sola persona, exigir la aprobacion de otra bloquea TODO merge sin salida: eso se declara");
  assert.match(regla.motivo, /bloquearia todo merge|excepto al autor/i);
  assert.ok(regla.revisar, "un desvio sin cuando-se-revisa es un desvio que nadie va a revisar nunca");
});

test("no elegir AWS declara por que las cinco claves llevan relleno", () => {
  for (const plataforma of ["supabase", "gcp", "ninguna"]) {
    const d = desvios({ equipo: "equipo", plataforma, avisos: "slack", visibilidad: "publico" });
    const regla = d.find((x) => x.regla === "iac-es-terraform");
    assert.ok(regla, `con plataforma "${plataforma}" el relleno de AWS tiene que quedar declarado`);
    assert.match(regla.motivo, /no describen ninguna cuenta real/i, "tiene que decir que los numeros no son de verdad");
  }
  assert.equal(
    desvios({ equipo: "equipo", plataforma: "aws", avisos: "slack", visibilidad: "publico" }).find(
      (x) => x.regla === "iac-es-terraform",
    ),
    undefined,
    "eligiendo AWS no hay nada de que apartarse: los valores son de verdad",
  );
});

test("elegir privado declara que la proteccion de rama NO existe", () => {
  const d = desvios({ equipo: "equipo", plataforma: "aws", avisos: "slack", visibilidad: "privado" });
  const regla = d.find((x) => x.regla === "git-check-requerido-es-el-veredicto-agregado");
  assert.ok(regla, "es la consecuencia medida de elegir privado en el plan gratuito, y la persona tiene que verla escrita");
  assert.match(regla.motivo, /403/, "el 403 es la medicion, y sin ella esto seria una opinion");
});

test("el relleno de AWS y el de Slack pasan sus propios patrones", () => {
  // Un relleno que no pasa la validacion es peor que no tener relleno: el
  // proyecto nace rojo por una decision que la persona tomo a proposito.
  for (const [clave, valor] of Object.entries({ ...RELLENO_AWS, ...RELLENO_SLACK })) {
    const f = FORMATOS[clave];
    assert.ok(f, `${clave} tiene que tener forma declarada`);
    assert.ok(f.patron.test(valor), `el relleno de ${clave} ("${valor}") no pasa su propio patron: ${f.espera}`);
  }
});

test("los numeros de cuenta del relleno NO PUEDEN ser una cuenta de AWS", () => {
  // EL DEFECTO QUE ESTE CASO VIGILA, medido en un proyecto recien generado: el
  // relleno era `111111111111` y `222222222222`, y esos valores NO se quedaban
  // en el archivo de valores. La constitucion del proyecto los IMPRIME en su
  // tabla de ambientes —«| Cuenta AWS | 111111111111 | 222222222222 |»— donde ya
  // no se leen como relleno sino como el dato de la persona. Y le pasa a la
  // mayoria, no a un caso raro: cualquiera que no elija AWS.
  //
  // La restriccion es que FORMATOS exige doce digitos, asi que no se puede
  // escribir «sin-aws» como en los perfiles. Doce ceros si se puede, y no es una
  // cuenta de AWS ni puede serlo. Es el mismo criterio que el UUID nulo de
  // ID_MCP_SLACK, que ya estaba resuelto asi.
  for (const clave of ["CUENTA_DEV", "CUENTA_PROD"]) {
    const v = RELLENO_AWS[clave];
    assert.match(v, /^\d{12}$/, `${clave} tiene que seguir teniendo forma de cuenta o el validador lo rechaza`);
    assert.equal(
      v,
      "0".repeat(12),
      `${clave} vale "${v}", que se lee como una cuenta de verdad en la tabla de la constitucion`,
    );
  }
});

// ---------------------------------------------------------------------------
// ANTI-VACUIDAD Y MORDIDAS
// ---------------------------------------------------------------------------

test("cada opcion explica que te cuesta, no solo como se llama", () => {
  const flacas = [];
  for (const p of PREGUNTAS) {
    for (const o of p.opciones ?? []) {
      if (!o.detalle || o.detalle.length < 80) flacas.push(`${p.id} / ${o.etiqueta}`);
    }
  }
  assert.deepEqual(
    flacas,
    [],
    "una opcion sin explicacion es un formulario, no una pregunta: quien no sabe la respuesta sigue sin saberla.\n  " +
      flacas.join("\n  "),
  );
});

test("toda pregunta de opciones tiene UNA recomendada, y una sola", () => {
  const malas = [];
  for (const p of PREGUNTAS) {
    if (!p.opciones) continue;
    const n = p.opciones.filter((o) => o.recomendada).length;
    if (n !== 1) malas.push(`${p.id}: ${n} recomendadas`);
  }
  assert.deepEqual(
    malas,
    [],
    "sin recomendada, Enter no tiene que elegir; con dos, elige la primera y nadie sabe cual:\n  " + malas.join("\n  "),
  );
});

test("MUERDE: si una pregunta deja de saltarse, el conteo del caso simple lo caza", async () => {
  // El caso que prueba que el conteo de arriba no pasa por vacuidad.
  const conAws = PREGUNTAS.filter(
    (p) => !p.salta || !p.salta({ plataforma: "aws", ambientes: "dos", equipo: "equipo", dominio: "propio", avisos: "slack" }),
  );
  const conSupabase = PREGUNTAS.filter(
    (p) =>
      !p.salta || !p.salta({ plataforma: "supabase", ambientes: "uno", equipo: "solo", dominio: "gratuito", avisos: "correo" }),
  );
  assert.ok(
    conAws.length > conSupabase.length,
    `el camino de AWS tiene que preguntar MAS que el de Supabase; midio ${conAws.length} contra ${conSupabase.length}. ` +
      "Si son iguales, los `salta` dejaron de filtrar y el 'caso simple' de 8 preguntas es una coincidencia",
  );
  assert.equal(conSupabase.length, 9, "y el camino simple son exactamente nueve");
});

test("el resumen nombra TODAS las decisiones que se preguntaron, y ninguna que no", async () => {
  // ESTE CASO SE DERIVA DE LAS PREGUNTAS, y antes era una lista de ocho cadenas
  // escritas a mano. Esa lista no podia ver el agujero de raiz: `forma` --la
  // pregunta que el propio asistente presenta como "la decision que mas cuesta si
  // se toma tarde", la que decide 80 archivos contra 42 y si el proyecto se
  // publica solo-- no estaba en el resumen NI en la lista, asi que faltaba en los
  // dos lados a la vez y todo quedaba en verde.
  //
  // Derivarlo de PREGUNTAS cierra la clase entera: una pregunta nueva entra sola
  // a esta comprobacion, sin que nadie se acuerde de agregarla.
  const { preguntar } = contestador({ ...TEXTO_VALIDO, ...PO_SOLO });
  const { respuestas, desvios: d } = await correrAsistente(preguntar, {}, {}, () => {}, DERIVADOS);
  const texto = lineasDeResumen(respuestas, d).join("\n");

  const contestadas = PREGUNTAS.filter((p) => !p.salta || !p.salta(respuestas));
  assert.ok(contestadas.length >= 8, `solo se contestaron ${contestadas.length} preguntas: la comprobacion mediria poco`);
  const sinNombrar = contestadas.filter((p) => {
    const v = respuestas[p.id];
    if (v === undefined || v === null || v === "") return false;
    // Se busca el VALOR contestado, o la traduccion que el resumen le da. Lo que
    // no puede pasar es que la decision no aparezca de ninguna forma.
    const rastros = {
      forma: [/Qué vas a construir/],
      plataforma: [/Dónde vive/],
      equipo: [/Equipo/],
      dominio: [/Dirección/],
      avisos: [/Avisos/],
      visibilidad: [/Repositorio/],
      ambientes: [/Copias/],
      PROYECTO: [new RegExp(String(v))],
      ORG: [new RegExp(String(v))],
    };
    const patrones = rastros[p.id] ?? [new RegExp(String(v).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))];
    return !patrones.some((re) => re.test(texto));
  });
  assert.deepEqual(
    sinNombrar.map((p) => p.id),
    [],
    `estas decisiones se preguntaron y el resumen no las nombra:\n${texto}`,
  );

  // Y LA OTRA MITAD: nada que NO se pregunto puede aparecer. Con forma=sitio, la
  // pregunta de ambientes tiene `salta` y el resumen igual mostraba "una de prueba
  // y una de verdad" — el lado del `else` de una respuesta que nadie dio.
  const deSitio = { ...respuestas, forma: "sitio" };
  delete deSitio.ambientes;
  assert.ok(
    !/Copias/.test(lineasDeResumen(deSitio, []).join("\n")),
    "el resumen inventa la respuesta de una pregunta que no se hizo",
  );
  // La cantidad se DERIVA de los desvios que se anotaron, no se escribe: cuando
  // se agrego el desvio de la direccion publica, el numero escrito a mano quedo
  // viejo y este caso se puso rojo por la razon equivocada.
  assert.ok(d.length >= 1, "sin desvios anotados este control no mira nada");
  assert.ok(texto.includes(String(d.length)), "y el resumen tiene que decir cuantos desvios quedaron declarados");
});

test("las preguntas se EMITEN mientras se pregunta, no al final", async () => {
  // EL DEFECTO QUE ESTE CASO VIGILA, y se midio corriendo la herramienta de
  // verdad: la primera version solo acumulaba el texto y quien llamaba lo
  // imprimia al terminar. La persona veia `Tu respuesta:` sin haber visto NUNCA
  // la pregunta, porque el texto salia despues de que ya habia contestado todo.
  const emitido = [];
  const vistoAlPreguntar = [];
  let i = 0;
  const preguntar = async (_texto, id) => {
    // En el momento de pedir la respuesta, la pregunta ya tiene que haber salido.
    vistoAlPreguntar.push(emitido.length);
    return { ...TEXTO_VALIDO, ...PO_SOLO }[id] ?? "";
  };
  await correrAsistente(preguntar, {}, FORMATOS, (l) => emitido.push(l));
  assert.ok(emitido.length > 0, "sin emision, la persona no ve nada mientras contesta");
  assert.ok(
    vistoAlPreguntar[0] > 0,
    "antes de la PRIMERA respuesta ya tiene que haberse emitido el texto de la primera pregunta; " +
      `se emitieron ${vistoAlPreguntar[0]} lineas`,
  );
  assert.ok(
    vistoAlPreguntar.every((n, k) => k === 0 || n > vistoAlPreguntar[k - 1]),
    "entre una respuesta y la siguiente tiene que salir texto nuevo: si no, las preguntas se estan acumulando",
  );
});

test("si la entrada se corta a mitad, el asistente NO devuelve valores a medias", async () => {
  // El otro modo de falla medido: con la entrada cerrada, `rl.question` nunca
  // llama a su callback, el bucle de eventos se vacia y el proceso salia con
  // CERO sin escribir nada. Un cero que no hizo nada se lee como exito.
  const preguntar = async () => {
    throw new Error("la entrada se cerro antes de contestar todas las preguntas");
  };
  await assert.rejects(
    () => correrAsistente(preguntar, {}, FORMATOS),
    /la entrada se cerro/,
    "el corte tiene que propagarse como error: quien llama lo traduce a exit 1 y a no escribir nada",
  );
});

// ---------------------------------------------------------------------------
// LA PRUEBA QUE FALTABA, y sin la cual los dos defectos de arriba pudieron
// existir con todo el banco en verde: CADA OPCION DE CADA PREGUNTA, de punta a
// punta, contra el validador de verdad.
//
// Los dos defectos que esto caza y que estuvieron vivos:
//   · Elegir Slack producia un archivo SIN `ID_MCP_SLACK`, y `projects init`
//     abortaba con exit 1. La opcion menos usada era la unica rota.
//   · El caso que decia probar Slack contestaba «correo» por un guion
//     posicional desalineado, asi que nadie lo media.
// ---------------------------------------------------------------------------

test("CADA opcion de CADA pregunta produce un archivo que el validador acepta", async () => {
  const rotos = [];
  let combinaciones = 0;

  for (const pregunta of PREGUNTAS) {
    if (!pregunta.opciones) continue;
    for (const opcion of pregunta.opciones) {
      combinaciones += 1;
      // Todo lo demas en su recomendada; solo esta pregunta se fuerza.
      const mapa = { ...TEXTO_VALIDO, [pregunta.id]: String(pregunta.opciones.indexOf(opcion) + 1) };
      const { preguntar, preguntado } = contestador(mapa);
      const { valores, respuestas } = await correrAsistente(preguntar, {}, FORMATOS, () => {}, DERIVADOS);

      if (respuestas[pregunta.id] !== opcion.valor) {
        rotos.push(`${pregunta.id}="${opcion.valor}": se contesto por id y quedo "${respuestas[pregunta.id]}"`);
        continue;
      }
      const faltan = REQUERIDOS.filter((k) => !(k in valores) || valores[k] === undefined);
      const { problemas } = validarValores(valores);
      if (faltan.length || problemas.length) {
        rotos.push(
          `${pregunta.id}="${opcion.valor}" (se preguntaron ${preguntado.length}): faltan [${faltan}] problemas [${problemas.join(" | ")}]`,
        );
      }
    }
  }

  assert.ok(combinaciones >= 12, `se esperaban al menos 12 opciones que ejercitar; se ejercitaron ${combinaciones}`);
  assert.deepEqual(
    rotos,
    [],
    `${rotos.length} de ${combinaciones} opciones producen un archivo que el motor rechaza. Una opcion que el ` +
      "asistente ofrece y que despues no funciona es peor que no ofrecerla: la persona eligio bien y el error " +
      `no habla de lo que eligio.\n  ${rotos.join("\n  ")}`,
  );
});

test("elegir Slack deja las DOS claves de Slack, no una", async () => {
  // El defecto exacto, con nombre: `RELLENO_SLACK` se aplicaba ENTERO solo
  // cuando NO se elegia Slack, asi que elegirlo dejaba `ID_MCP_SLACK` sin valor.
  const { preguntar } = contestador({ ...TEXTO_VALIDO, avisos: "2" });
  const { valores, respuestas } = await correrAsistente(preguntar, {}, FORMATOS, () => {}, DERIVADOS);
  assert.equal(respuestas.avisos, "slack", "el caso tiene que llegar de verdad a Slack, no decir que llega");
  assert.equal(valores.CANAL_ALERTAS, "#alertas", "el canal sale de la respuesta");
  assert.ok(valores.ID_MCP_SLACK, "y el id de MCP NO puede quedar sin valor: sin el, projects init aborta con exit 1");
  assert.match(valores.ID_MCP_SLACK, FORMATOS.ID_MCP_SLACK.patron, "y tiene que pasar su propio patron");
});

test("MUERDE: si una opcion dejara una clave sin valor, el caso de arriba lo ve", async () => {
  // Anti-vacuidad. Se simula el defecto sobre el resultado de derivar, sin
  // tocar el arbol: si el aserto no mirara `undefined`, esto pasaria.
  const { preguntar } = contestador(TEXTO_VALIDO);
  const { valores } = await correlacionSinUna(preguntar);
  const { problemas } = validarValores(valores);
  assert.ok(problemas.length > 0, "un archivo al que le falta una clave requerida TIENE que ser rechazado por el validador");
});

async function correlacionSinUna(preguntar) {
  const { valores } = await correrAsistente(preguntar, {}, FORMATOS, () => {}, DERIVADOS);
  const mutado = { ...valores };
  delete mutado.ID_MCP_SLACK;
  return { valores: mutado };
}

// ---------------------------------------------------------------------------
// EL PRODUCTO CARTESIANO, y por que un factor por vez no alcanzaba.
//
// EL DEFECTO QUE ESTE BANCO CIERRA, medido: las cinco preguntas de AWS se
// saltaban cuando la forma era un sitio O la plataforma no era AWS, y `derivar`
// ramificaba mirando SOLO la plataforma. Ninguna de las dos mitades esta mal
// sola; el defecto vive en el CRUCE. Barriendo las 192 combinaciones, 32
// —todas sitio+AWS— escribian cinco `undefined`, el asistente imprimia «Cuenta
// de AWS undefined» y SALIA 0, y el paso siguiente abortaba con los cinco
// «falta». Reintentar reproducia el mismo archivo: callejon sin salida.
//
// El banco de este archivo cubria las opciones de a una. Por eso paso verde.
// ---------------------------------------------------------------------------

/** Toda combinacion de respuestas a las preguntas de eleccion, en orden estable. */
function combinaciones() {
  const conOpciones = PREGUNTAS.filter((q) => q.opciones);
  const total = conOpciones.reduce((a, q) => a * q.opciones.length, 1);
  const todas = [];
  for (let i = 0; i < total; i++) {
    let resto = i;
    const eleccion = {};
    for (const q of conOpciones) {
      eleccion[q.id] = String((resto % q.opciones.length) + 1);
      resto = Math.floor(resto / q.opciones.length);
    }
    todas.push(eleccion);
  }
  return todas;
}

const LIBRES = {
  PROYECTO: "mi-proyecto",
  ORG: "alguien",
  BUILDER_2: "la-otra",
  CUENTA_DEV: "111111111111",
  CUENTA_PROD: "222222222222",
  REGION: "us-east-1",
  PERFIL_DEV: "dev",
  PERFIL_PROD: "prod",
  DOMINIO_PROD: "ejemplo.com",
  CANAL_ALERTAS: "#alertas",
};

test("TODA combinacion de respuestas produce un archivo que el validador acepta", async () => {
  const todas = combinaciones();
  assert.ok(todas.length >= 8, `con ${todas.length} combinaciones esto no barre nada: se rompio el generador`);

  const rotas = [];
  for (const eleccion of todas) {
    const { valores, respuestas, dicho } = await correrAsistente(
      async (_t, id) => eleccion[id] ?? LIBRES[id] ?? "x",
      {},
      {},
      () => {},
      { ORG_MARCO: "im-diego-ec" },
    );
    const quien = `${respuestas.forma}+${respuestas.plataforma}+${respuestas.ambientes}+${respuestas.dominio}+${respuestas.avisos}`;
    const { problemas } = validarValores(valores);
    if (problemas.length) rotas.push(`${quien}: ${problemas.join(", ")}`);
    // Y la otra mitad, que es la que la persona VE: `undefined` en pantalla es
    // el sintoma que precede al archivo roto, y salir 0 con eso escrito es lo
    // que convierte un rojo en un callejon sin salida.
    if (dicho.join("\n").includes("undefined")) rotas.push(`${quien}: se imprimio "undefined" en pantalla`);
  }
  assert.deepEqual(
    rotas,
    [],
    "el asistente ofrecio una combinacion y despues escribio un archivo que la propia herramienta rechaza. Es el " +
      `mismo defecto que ya se pago con Slack y con GCP:\n  ${rotas.slice(0, 12).join("\n  ")}`,
  );
});

test("un sitio nunca queda con valores de AWS a medias, y el desvio lo dice", async () => {
  const { valores, respuestas } = await correrAsistente(
    // Lo que no se fija a mano se contesta con la primera opcion: lo que este
    // caso mide es el CRUCE sitio+AWS, no el resto del cuestionario.
    async (_t, id) => ({ PROYECTO: "p", ORG: "o", forma: "2", plataforma: "2" })[id] ?? LIBRES[id] ?? "1",
    {},
    {},
    () => {},
    { ORG_MARCO: "im-diego-ec" },
  );
  assert.equal(respuestas.forma, "sitio");
  assert.equal(respuestas.plataforma, "aws", "el guion tiene que haber elegido AWS, o este caso no mide el cruce");
  assert.equal(usaAws(respuestas), false, "un sitio no despliega servidor propio: no usa AWS aunque se elija AWS");
  for (const k of Object.keys(RELLENO_AWS)) {
    assert.equal(valores[k], RELLENO_AWS[k], `${k} tiene que llevar el relleno declarado, no undefined`);
  }
  const d = desvios(respuestas).find((x) => x.regla === "iac-es-terraform");
  assert.ok(d, "el desvio tiene que quedar anotado: un relleno sin declarar es una mentira con formato de dato");
  assert.match(d.motivo, /sitio para leer/, "y su motivo tiene que nombrar la combinacion, no repetir el caso generico");
});

test("MUERDE: si las dos mitades volvieran a decidir distinto, el barrido lo ve", async () => {
  // El caso que prueba que el barrido no pasa por vacuidad. `usaAws` es el
  // predicado unico; si alguien lo reemplaza por la comparacion vieja —mirar
  // solo la plataforma— sitio+AWS vuelve a quedar sin valores.
  const viejo = (r) => r.plataforma === "aws";
  const sitioConAws = { forma: "sitio", plataforma: "aws" };
  assert.equal(viejo(sitioConAws), true, "el predicado viejo decia que si");
  assert.equal(usaAws(sitioConAws), false, "y el nuevo dice que no: en esa diferencia vivia el defecto");
  assert.equal(usaAws({ forma: "aplicacion", plataforma: "aws" }), true, "y una aplicacion en AWS sigue usando AWS");
});

// ---------------------------------------------------------------------------
// LA DIRECCION QUE SE ESCRIBE TIENE QUE SER LA DEL PRODUCTO QUE PUBLICA.
//
// EL DEFECTO QUE ESTE BANCO CIERRA: el asistente derivaba
// `<proyecto>.pages.dev` para quien no tiene dominio propio —la opcion
// recomendada, o sea la mayoria—, y este andamio NO publica en Cloudflare
// Pages: publica en Cloudflare Workers con `wrangler deploy`, decision
// argumentada en sitio/wrangler.jsonc citando a la propia Cloudflare. Un
// `.pages.dev` solo existe si alguien crea un proyecto de Pages, y aca eso no
// pasa nunca. Ese valor aterrizaba en el `site:` de Astro, de donde salen los
// enlaces canonicos del sitio publicado.
// ---------------------------------------------------------------------------

test("la direccion gratuita nombra el producto que de verdad publica el andamio", async () => {
  const { valores, respuestas } = await correrAsistente(
    async (_t, id) => ({ PROYECTO: "mi-sitio", ORG: "o", forma: "2", dominio: "1" })[id] ?? LIBRES[id] ?? "1",
    {},
    {},
    () => {},
    { ORG_MARCO: "im-diego-ec" },
  );
  assert.equal(respuestas.dominio, "gratuito", "el guion tiene que elegir la gratuita, o esto no mide nada");
  assert.match(valores.DOMINIO_PROD, /\.workers\.dev$/, "la gratuita de este andamio es de Workers");
  assert.equal(/pages\.dev/.test(valores.DOMINIO_PROD), false, "Pages es otro producto y aca no se crea ninguno");

  // Y lo que NO se puede saber queda declarado: el subdominio de la cuenta.
  const d = desvios(respuestas).find((x) => x.regla === "urls-canonicas-por-cors");
  assert.ok(d, "una direccion incompleta sin desvio anotado es una mentira con formato de dato");
  assert.match(d.motivo, /subdominio/i, "el desvio tiene que decir QUE le falta");
  assert.match(d.revisar, /primera publicacion/i, "y CUANDO se sabe");
});

test("el andamio no nombra Pages en ningun lado donde publica con Workers", () => {
  // ANTI-VACUIDAD por el otro lado: si manana el andamio publicara en Pages,
  // este caso tiene que caerse para que alguien lo mire, no quedarse verde.
  const wrangler = fs.readFileSync(path.join(ANDAMIO, "sitio/wrangler.jsonc"), "utf-8");
  assert.equal(/"pages_build_output_dir"/.test(wrangler), false, "una configuracion de Pages cambiaria toda esta regla");
  assert.match(wrangler, /"assets"/, "el andamio tiene que seguir publicando assets de Workers");
});

// ---------------------------------------------------------------------------
// LOS DESVIOS: LA FORMA QUE SU LECTOR ESPERA, Y REGLAS QUE EXISTEN.
//
// DOS DEFECTOS ENCADENADOS, los dos medidos:
//
//   1. LA FORMA. El asistente escribia `.projects-desvios.json` como una LISTA
//      pelada y la accion de constitucion lee `datos.desvios`, o sea un objeto
//      con esa clave. `Array.isArray(datos?.desvios)` sobre una lista da false,
//      asi que veia CERO desvios y no decia nada. La persona declaraba cuatro
//      apartamientos de las reglas del marco y la constitucion de su proyecto
//      salia como si no hubiera ninguno.
//
//   2. LOS IDS. Los cinco `regla` que el asistente escribia NO EXISTIAN en el
//      canonico. Ninguno. Y la accion caza «desvios muertos» —una regla que ya
//      no existe—, asi que arreglar SOLO la forma habria cambiado un silencio
//      por cinco rojos el dia uno.
//
// Por eso los dos se arreglan juntos y este banco los mide juntos.
// ---------------------------------------------------------------------------

test("todo desvio declara una regla que EXISTE en el canonico del marco", async () => {
  const canonico = path.resolve(ANDAMIO, "../actions/constitucion/canonico");
  const idsDelCanonico = new Set(
    fs
      .readdirSync(canonico)
      .filter((f) => f.endsWith(".md"))
      .flatMap((f) =>
        [...fs.readFileSync(path.join(canonico, f), "utf-8").matchAll(/projects:regla id=([a-z0-9-]+)/g)].map((m) => m[1]),
      ),
  );
  assert.ok(idsDelCanonico.size >= 20, `el canonico declara ${idsDelCanonico.size} reglas: se rompio la lectura`);

  // Se recorren TODAS las combinaciones que producen desvios, no una: cada rama
  // de `desvios()` escribe un id distinto y probar una sola deja las otras sin
  // mirar, que es como los cinco llegaron a estar mal a la vez.
  const vistos = new Set();
  for (const eleccion of combinaciones()) {
    const { respuestas } = await correrAsistente(
      async (_t, id) => eleccion[id] ?? LIBRES[id] ?? "x",
      {},
      {},
      () => {},
      { ORG_MARCO: "im-diego-ec" },
    );
    for (const d of desvios(respuestas)) vistos.add(d.regla);
  }
  assert.ok(vistos.size >= 4, `solo se vieron ${vistos.size} reglas distintas: el barrido dejo ramas sin recorrer`);

  const inventadas = [...vistos].filter((r) => !idsDelCanonico.has(r));
  assert.deepEqual(
    inventadas,
    [],
    "un desvio con una regla que el canonico no declara es un «desvio muerto»: la accion de constitucion lo caza y " +
      `pone el proyecto en rojo, y mientras tanto el desvio no se muestra al lado de la regla de la que se aparta. ` +
      `Inventadas: ${inventadas.join(", ")}`,
  );
});

test("el archivo de desvios tiene la forma que su lector espera", () => {
  // La accion lee `datos.desvios`. Se comprueba contra ESA lectura, escrita
  // igual que en actions/constitucion/constitucion.mjs, y no contra una idea de
  // como deberia ser.
  const comoLoLeeLaAccion = (datos) => (Array.isArray(datos?.desvios) ? datos.desvios : []);
  const lista = [{ regla: "iac-es-terraform", motivo: "x", revisar: "y" }];

  assert.deepEqual(comoLoLeeLaAccion(lista), [], "una lista pelada se descarta ENTERA, y en silencio: era el defecto");
  assert.deepEqual(comoLoLeeLaAccion({ desvios: lista }), lista, "envuelta en `desvios`, la accion la ve");
});

test("todo desvio trae los cuatro campos que la accion de constitucion exige", async () => {
  // EL DEFECTO QUE ESTE CASO VIGILA, medido corriendo la accion de verdad contra
  // un par de archivos recien generados: el asistente escribia `regla` y
  // `motivo` y nada mas. La accion exige ademas `aprobado_por` y `fecha`, y pone
  // un `::error::` por cada desvio al que le falte alguno: cuatro rojos el dia
  // uno, sobre decisiones que la persona habia tomado bien.
  //
  // Los cuatro nombres se leen del contrato escrito en actions/README.md, no se
  // copian aca: si el contrato cambia, este caso lo sigue.
  const contrato = fs.readFileSync(path.resolve(ANDAMIO, "../actions/README.md"), "utf-8");
  const linea = contrato.match(/`\.projects-desvios\.json`:[^.]*/)?.[0] ?? "";
  const exigidos = [...linea.matchAll(/`([a-z_]+)`/g)].map((m) => m[1]).filter((c) => c !== "json");
  assert.ok(exigidos.length >= 3, `se leyeron ${exigidos.length} campos del contrato: se rompio la lectura`);

  const faltan = [];
  for (const eleccion of combinaciones()) {
    const { respuestas } = await correrAsistente(
      async (_t, id) => eleccion[id] ?? LIBRES[id] ?? "x",
      {},
      {},
      () => {},
      { ORG_MARCO: "im-diego-ec" },
    );
    for (const d of desvios(respuestas, "2026-01-01")) {
      for (const campo of exigidos) if (!d[campo]) faltan.push(`${d.regla}: le falta \`${campo}\``);
    }
  }
  assert.deepEqual(
    [...new Set(faltan)],
    [],
    `la accion pone un ::error:: por cada uno:\n  ${[...new Set(faltan)].join("\n  ")}`,
  );

  // Y la fecha tiene forma de fecha: la accion la valida con `esFecha`.
  const uno = desvios({ equipo: "solo", ORG: "alguien" }, "2026-01-01")[0];
  assert.match(uno.fecha, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(uno.aprobado_por, "alguien", "quien aprueba es quien contesto, con nombre y no con un «alguien»");
});

test("lo que la constitucion promete y el andamio no reparte queda declarado como desvio", async () => {
  // EL DEFECTO QUE ESTE CASO VIGILA, medido en un proyecto recien generado: la
  // constitucion que aterriza en TODO proyecto declara «Promocion por ambientes:
  // merge → deploy a DEV → smoke API → E2E → deploy a PROD → verificar-prod» como
  // la practica de ese proyecto, y el andamio no trae un solo workflow que haga
  // nada de eso. Los que viajan son ci.yml, claude.yml, actualizar-marco.yml y
  // —solo para un sitio— desplegar.yml, que publica en UN destino.
  //
  // Una regla que describe maquinaria inexistente es peor que una regla ausente:
  // los agentes del proyecto la leen como practica vigente y planifican contra
  // ella. El marco tiene un mecanismo para esto —el desvio declarado— y no lo
  // estaba usando aca.
  //
  // VA PARA TODA COMBINACION, y por eso se barre: no depende de la forma ni de la
  // plataforma. Ninguna reparte promocion.
  const sinDeclarar = [];
  for (const eleccion of combinaciones()) {
    const { respuestas } = await correrAsistente(
      async (_t, id) => eleccion[id] ?? LIBRES[id] ?? "x",
      {},
      {},
      () => {},
      { ORG_MARCO: "im-diego-ec" },
    );
    const d = desvios(respuestas).find((x) => x.regla === "promocion-por-ambientes");
    if (!d) sinDeclarar.push(`${respuestas.forma}+${respuestas.plataforma}`);
  }
  assert.deepEqual(
    [...new Set(sinDeclarar)],
    [],
    `estas combinaciones no declaran el desvio de promocion, asi que su constitucion afirma una maquinaria que su ` +
      `arbol no tiene: ${[...new Set(sinDeclarar)].join(", ")}`,
  );

  // Y ANTI-VACUIDAD POR EL OTRO LADO: si el andamio empezara a repartir un
  // workflow de promocion, este desvio sobraria y conviene que el banco lo diga
  // en vez de dejarlo declarando algo que ya no es cierto.
  const workflows = fs.readdirSync(path.join(ANDAMIO, ".github/workflows"));
  const promueve = workflows.filter((f) => /promo|promocion|promote/i.test(f));
  assert.deepEqual(
    promueve,
    [],
    `el andamio ya reparte ${promueve.join(", ")}: si eso promueve de dev a prod, el desvio de ` +
      "`promocion-por-ambientes` dejo de corresponder y hay que sacarlo",
  );
});
