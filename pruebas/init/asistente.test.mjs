import test from "node:test";
import assert from "node:assert/strict";

import { PREGUNTAS, correrAsistente, derivar, desvios, lineasDeResumen, RELLENO_AWS, RELLENO_SLACK } from "../../herramientas/projects-asistente.mjs";
import { REQUERIDOS, FORMATOS, validarValores } from "../../herramientas/projects-init.mjs";

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
  const preguntar = async (_texto, id) => {
    preguntado.push(id);
    return mapa[id] ?? "";
  };
  return { preguntar, preguntado };
}

/** Cuenta las preguntas de verdad: cada una imprime una linea `[n/total]`. */
const cuantasPreguntas = (dicho) => dicho.filter((l) => l.startsWith("\n[")).length;

const PO_SOLO = ["agenda-de-personas", "im-diego-ec", "", "", "", "", "", "", ""];
const AWS_DOS = ["tienda-online", "mi-org", "2", "otra-persona", "2", "2", "802589444524", "635352382411", "us-east-1", "td-dev", "td-prod", "2", "tienda.com", "1", "1"];

test("el caso mas simple son OCHO preguntas, y solo dos hay que escribirlas", async () => {
  const { preguntar } = guionista(PO_SOLO);
  const { dicho, respuestas } = await correrAsistente(preguntar);
  assert.equal(
    cuantasPreguntas(dicho),
    8,
    "el numero de preguntas del caso simple es la promesa central de esta herramienta: 8 en vez de 21 casillas. " +
      "Si sube, o se agrego una pregunta que no hacia falta, o se rompio un `salta`",
  );
  // Las seis restantes se contestaron con Enter, o sea con la recomendada.
  assert.deepEqual(
    { equipo: respuestas.equipo, plataforma: respuestas.plataforma, ambientes: respuestas.ambientes, dominio: respuestas.dominio, avisos: respuestas.avisos, visibilidad: respuestas.visibilidad },
    { equipo: "solo", plataforma: "supabase", ambientes: "uno", dominio: "gratuito", avisos: "correo", visibilidad: "publico" },
    "Enter tiene que elegir la opcion recomendada de cada pregunta: si no, el 'caso simple' no es simple",
  );
});

test("elegir AWS con dos ambientes hace QUINCE preguntas, y ninguna es de relleno", async () => {
  const { preguntar } = guionista(AWS_DOS);
  const { dicho, valores } = await correrAsistente(preguntar);
  assert.equal(cuantasPreguntas(dicho), 15, "con AWS y dos ambientes se preguntan las cinco de AWS mas el dominio propio");
  // El defecto que este caso vigila: la primera version del asistente SALTEABA
  // las cinco preguntas de AWS junto con el relleno, asi que quien elegia AWS
  // se quedaba sin sus propios datos y el archivo salia invalido.
  assert.equal(valores.CUENTA_DEV, "802589444524", "la cuenta de pruebas tiene que salir de la respuesta, no del relleno");
  assert.equal(valores.CUENTA_PROD, "635352382411", "con DOS ambientes las cuentas son distintas");
  assert.equal(valores.REGION, "us-east-1");
  assert.notEqual(valores.PERFIL_DEV, RELLENO_AWS.PERFIL_DEV, "eligiendo AWS, el perfil no puede ser el relleno de 'sin AWS'");
});

test("con AWS y UN ambiente no se pregunta dos veces por el mismo dato", async () => {
  const guion = ["api-interna", "alguien", "", "2", "", "111111111111", "sa-east-1", "mi-perfil", "", "", "2", "#alertas", "2"];
  const { preguntar } = guionista(guion);
  const { valores, dicho } = await correrAsistente(preguntar);
  assert.equal(cuantasPreguntas(dicho), 11, "con un solo ambiente se saltean la cuenta y el perfil de produccion");
  assert.equal(valores.CUENTA_PROD, valores.CUENTA_DEV, "con un ambiente, la cuenta de 'produccion' ES la misma");
  assert.equal(valores.PERFIL_PROD, valores.PERFIL_DEV, "y el perfil tambien");
});

test("LO QUE MAS IMPORTA: lo que produce el asistente pasa el validador de siempre", async () => {
  const CASOS = {
    "PO solo, supabase, publico": PO_SOLO,
    "equipo, AWS, dos ambientes": AWS_DOS,
    "solo, AWS, un ambiente": ["api-interna", "alguien", "", "2", "", "111111111111", "sa-east-1", "mi-perfil", "", "", "2", "#alertas", "2"],

    "equipo, gcp, dominio propio": ["otra-cosa", "org2", "2", "revisor", "3", "", "2", "midominio.com", "", "", ""],
  };
  const rotos = [];
  for (const [nombre, guion] of Object.entries(CASOS)) {
    const { preguntar } = guionista(guion);
    const { valores } = await correrAsistente(preguntar);
    const faltan = REQUERIDOS.filter((k) => !(k in valores));
    const { problemas } = validarValores(valores);
    if (faltan.length || problemas.length) rotos.push(`${nombre}: faltan [${faltan}] problemas [${problemas.join(" | ")}]`);
  }
  assert.deepEqual(
    rotos,
    [],
    "el asistente produce el MISMO archivo que entra por --valores, asi que si no pasa validarValores no sirve para nada:\n  " + rotos.join("\n  "),
  );
});

test("las 21 claves salen completas, ni una de mas ni una de menos", async () => {
  const { preguntar } = guionista(PO_SOLO);
  const { valores } = await correrAsistente(preguntar);
  // `plataforma` va aparte y en minuscula: no es un marcador que el andamio
  // sustituya, es la decision de QUE archivos viajan. Por eso se saca antes de
  // comparar, y por eso se comprueba que este.
  const { plataforma, ...marcadores } = valores;
  assert.equal(plataforma, "supabase", "la plataforma elegida tiene que quedar escrita en el archivo de valores");
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
  const { preguntar, preguntado } = guionista(["", "no-vale-vacio", "im-diego-ec", "", "", "", "", "", "", ""]);
  const { dicho, respuestas } = await correrAsistente(preguntar, {}, FORMATOS);
  assert.ok(
    dicho.some((l) => l.includes("hay que contestarla")),
    "una respuesta vacia en una pregunta sin valor por defecto tiene que avisar y volver a preguntar",
  );
  assert.equal(respuestas.PROYECTO, "no-vale-vacio", "y despues tiene que aceptar la buena");
  assert.ok(preguntado.length > 8, "volver a preguntar significa una interaccion mas, no seguir de largo");
});

test("los acentos y las mayusculas del nombre se arreglan solos, y se dice que se arreglaron", async () => {
  const { preguntar } = guionista(["Agenda De Añejos", "alguien", "", "", "", "", "", "", ""]);
  const { respuestas, dicho } = await correrAsistente(preguntar, {}, FORMATOS);
  assert.equal(respuestas.PROYECTO, "agenda-de-anejos", "GitHub no acepta mayusculas ni acentos en un nombre de repo");
  assert.ok(
    dicho.some((l) => l.includes("se guardó como")),
    "arreglarlo en silencio es peor que no arreglarlo: la persona tiene que ver con que nombre quedo",
  );
});

test("volver a correrlo ofrece lo de antes, y Enter lo mantiene", async () => {
  const previos = { PROYECTO: "lo-de-antes", ORG: "alguien" };
  const { preguntar, preguntado } = guionista(["", "", "", "", "", "", "", ""]);
  const { respuestas } = await correrAsistente(preguntar, previos, FORMATOS);
  assert.equal(respuestas.PROYECTO, "lo-de-antes", "Enter sobre una respuesta previa tiene que mantenerla");
  assert.ok(
    preguntado.some((t) => t.includes("Enter mantiene: lo-de-antes")),
    "y el ofrecimiento tiene que verse: si no, la persona no sabe que puede apretar Enter",
  );
});

// ---------------------------------------------------------------------------
// LOS DESVIOS. El marco permite apartarse de casi cualquier pieza; lo que no
// permite es que apartarse sea algo que se descubre despues.
// ---------------------------------------------------------------------------

test("trabajar solo APAGA la aprobacion ajena y lo deja firmado", () => {
  const d = desvios({ equipo: "solo", plataforma: "aws", avisos: "slack", visibilidad: "publico" });
  const regla = d.find((x) => x.regla === "revision-cruzada-obligatoria");
  assert.ok(regla, "con una sola persona, exigir la aprobacion de otra bloquea TODO merge sin salida: eso se declara");
  assert.match(regla.motivo, /bloquearia todo merge|excepto al autor/i);
  assert.ok(regla.revisar, "un desvio sin cuando-se-revisa es un desvio que nadie va a revisar nunca");
});

test("no elegir AWS declara por que las cinco claves llevan relleno", () => {
  for (const plataforma of ["supabase", "gcp", "ninguna"]) {
    const d = desvios({ equipo: "equipo", plataforma, avisos: "slack", visibilidad: "publico" });
    const regla = d.find((x) => x.regla === "infraestructura-declarada-en-terraform");
    assert.ok(regla, `con plataforma "${plataforma}" el relleno de AWS tiene que quedar declarado`);
    assert.match(regla.motivo, /no describen ninguna cuenta real/i, "tiene que decir que los numeros no son de verdad");
  }
  assert.equal(
    desvios({ equipo: "equipo", plataforma: "aws", avisos: "slack", visibilidad: "publico" }).find((x) => x.regla === "infraestructura-declarada-en-terraform"),
    undefined,
    "eligiendo AWS no hay nada de que apartarse: los valores son de verdad",
  );
});

test("elegir privado declara que la proteccion de rama NO existe", () => {
  const d = desvios({ equipo: "equipo", plataforma: "aws", avisos: "slack", visibilidad: "privado" });
  const regla = d.find((x) => x.regla === "proteccion-de-la-rama-principal");
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

test("los dos numeros de cuenta del relleno son los que el guard reconoce como NO reales", () => {
  // Es la razon de que sean esos y no otros: el guard de seguridad del
  // repositorio caza un id de doce digitos que no este en su lista de ejemplos.
  assert.equal(RELLENO_AWS.CUENTA_DEV, "111111111111");
  assert.equal(RELLENO_AWS.CUENTA_PROD, "222222222222");
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
    "una opcion sin explicacion es un formulario, no una pregunta: quien no sabe la respuesta sigue sin saberla.\n  " + flacas.join("\n  "),
  );
});

test("toda pregunta de opciones tiene UNA recomendada, y una sola", () => {
  const malas = [];
  for (const p of PREGUNTAS) {
    if (!p.opciones) continue;
    const n = p.opciones.filter((o) => o.recomendada).length;
    if (n !== 1) malas.push(`${p.id}: ${n} recomendadas`);
  }
  assert.deepEqual(malas, [], "sin recomendada, Enter no tiene que elegir; con dos, elige la primera y nadie sabe cual:\n  " + malas.join("\n  "));
});

test("MUERDE: si una pregunta deja de saltarse, el conteo del caso simple lo caza", async () => {
  // El caso que prueba que el conteo de arriba no pasa por vacuidad.
  const conAws = PREGUNTAS.filter((p) => !p.salta || !p.salta({ plataforma: "aws", ambientes: "dos", equipo: "equipo", dominio: "propio", avisos: "slack" }));
  const conSupabase = PREGUNTAS.filter((p) => !p.salta || !p.salta({ plataforma: "supabase", ambientes: "uno", equipo: "solo", dominio: "gratuito", avisos: "correo" }));
  assert.ok(
    conAws.length > conSupabase.length,
    `el camino de AWS tiene que preguntar MAS que el de Supabase; midio ${conAws.length} contra ${conSupabase.length}. ` +
      "Si son iguales, los `salta` dejaron de filtrar y el 'caso simple' de 8 preguntas es una coincidencia",
  );
  assert.equal(conSupabase.length, 8, "y el camino simple son exactamente ocho");
});

test("el resumen nombra las ocho decisiones, para poder arrepentirse antes de escribir nada", async () => {
  const { preguntar } = guionista(PO_SOLO);
  const { respuestas, desvios: d } = await correrAsistente(preguntar);
  const texto = lineasDeResumen(respuestas, d).join("\n");
  for (const esperado of ["agenda-de-personas", "@im-diego-ec", "trabajás solo", "Supabase", "una sola", "pages.dev", "correo de GitHub", "público"]) {
    assert.ok(texto.includes(esperado), `el resumen tiene que nombrar "${esperado}": es lo que la persona lee antes de confirmar`);
  }
  assert.ok(texto.includes("3"), "y tiene que decir cuantos desvios quedaron declarados");
});

test("las preguntas se EMITEN mientras se pregunta, no al final", async () => {
  // EL DEFECTO QUE ESTE CASO VIGILA, y se midio corriendo la herramienta de
  // verdad: la primera version solo acumulaba el texto y quien llamaba lo
  // imprimia al terminar. La persona veia `Tu respuesta:` sin haber visto NUNCA
  // la pregunta, porque el texto salia despues de que ya habia contestado todo.
  const emitido = [];
  const vistoAlPreguntar = [];
  let i = 0;
  const preguntar = async () => {
    // En el momento de pedir la respuesta, la pregunta ya tiene que haber salido.
    vistoAlPreguntar.push(emitido.length);
    return PO_SOLO[i++] ?? "";
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
      const { valores, respuestas } = await correrAsistente(preguntar, {}, FORMATOS);

      if (respuestas[pregunta.id] !== opcion.valor) {
        rotos.push(`${pregunta.id}="${opcion.valor}": se contesto por id y quedo "${respuestas[pregunta.id]}"`);
        continue;
      }
      const faltan = REQUERIDOS.filter((k) => !(k in valores) || valores[k] === undefined);
      const { problemas } = validarValores(valores);
      if (faltan.length || problemas.length) {
        rotos.push(`${pregunta.id}="${opcion.valor}" (se preguntaron ${preguntado.length}): faltan [${faltan}] problemas [${problemas.join(" | ")}]`);
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
  const { valores, respuestas } = await correrAsistente(preguntar, {}, FORMATOS);
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
  const { valores } = await correrAsistente(preguntar, {}, FORMATOS);
  const mutado = { ...valores };
  delete mutado.ID_MCP_SLACK;
  return { valores: mutado };
}
