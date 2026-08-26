// ---------------------------------------------------------------------------
// EL ASISTENTE DE DECISIONES: el camino del PO, al lado del camino del builder.
//
// QUE PROBLEMA CIERRA, medido. `projects init` pide un archivo con 21 claves que
// alguien tiene que llenar a mano. Una auditoria de seis recorridos midio que
// una persona no tecnica no puede contestar buena parte de ellas —`REGION` con
// forma de AWS, `ID_MCP_SLACK`, `GENERAR_CLIENTE_DATOS`— y, peor, que LA
// DECISION MAS CARA NO ES NINGUNA DE LAS 21: la clave `plataforma` existe en
// `plantilla/.projects-valores.json` y ninguna herramienta la lee, asi que quien
// elige Supabase para no gastar recibe el andamio de AWS igual.
//
// LA REGLA DE FONDO DE ESTE ARCHIVO, y es lo que lo mantiene chico: el asistente
// NO ES UNA SEGUNDA PUERTA AL MOTOR. Es un generador del archivo que entra por la
// puerta que ya existe.
//
//   preguntas  ->  valores.json  ->  --valores  ->  validarValores  ->  copiado
//              (el asistente             (sin tocar)      (sin tocar)
//               termina aca)
//
// Dos caminos con el mismo destino, como la documentacion tiene el acompanado y
// el tecnico: el PO contesta preguntas en castellano, el builder escribe el JSON.
// Nadie valida distinto que el otro —se usa `validarValores`, el de siempre—; lo
// unico que cambia es CUANDO: el asistente corre el patron de la clave en el
// momento de la respuesta, asi que el handle mal escrito se arregla ahi y no
// veinte preguntas despues.
// ---------------------------------------------------------------------------

/** Los valores de AWS que se escriben cuando el proyecto NO usa AWS.
 *
 *  POR QUE SE ESCRIBEN Y NO SE DEJAN VACIAS. Una clave vacia no es "sin valor"
 *  para este marco: `constitucion.mjs` trata la cadena vacia igual que un
 *  marcador sin resolver, asi que el artefacto renderizado nacería reportando
 *  seis faltantes y el consumidor arrancaria en rojo por algo que decidio a
 *  proposito.
 *
 *  Y POR QUE SON ESTOS TRES NUMEROS. Son los mismos que el guard de seguridad
 *  del repositorio reconoce como no-reales: su regla caza un id de doce digitos
 *  que NO este en esta lista, justamente para que nadie confunda un ejemplo con
 *  una cuenta de verdad.
 *
 *  Esto es una curita declarada, no la solucion. La solucion es que las seis
 *  claves dejen de existir cuando la plataforma no es AWS, y eso exige editar la
 *  constitucion canonica —usa ocho de ellas en trece lugares— en el mismo acto.
 *  Mientras tanto el asistente escribe el desvio para que quede firmado. */
export const RELLENO_AWS = {
  CUENTA_DEV: "111111111111",
  CUENTA_PROD: "222222222222",
  REGION: "us-east-1",
  PERFIL_DEV: "sin-aws-dev",
  PERFIL_PROD: "sin-aws-prod",
};

/** Igual, para Slack. `CANAL_ALERTAS` exige empezar con almohadilla y el id de
 *  MCP exige forma de UUID, asi que "no uso Slack" no se puede escribir con
 *  palabras: se escribe con un valor que se lee como lo que es. */
export const RELLENO_SLACK = {
  CANAL_ALERTAS: "#sin-slack",
  ID_MCP_SLACK: "00000000-0000-0000-0000-000000000000",
};

const kebab = (t) =>
  t
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

// ---------------------------------------------------------------------------
// LAS PREGUNTAS
//
// Cada opcion trae POR QUE la elegirias, QUE TE CUESTA y QUE LIMITE REAL tiene,
// con numeros medidos y no adjetivos. Es la diferencia entre un formulario y una
// pregunta que alguien puede contestar sin saber de antemano la respuesta.
//
// `salta` mira las respuestas anteriores: una pregunta que ya no tiene sentido
// no se hace. Preguntar por el segundo revisor a quien dijo que trabaja solo es
// como pedirle los datos de AWS a quien eligio Supabase.
// ---------------------------------------------------------------------------
export const PREGUNTAS = [
  {
    id: "PROYECTO",
    libre: true,
    texto: "¿Cómo se va a llamar el proyecto? Es el nombre del repositorio en GitHub.",
    ayuda: "Minúsculas, sin espacios, con guiones. Ejemplo: agenda-de-personas",
    // Sin valor por defecto a proposito: es el unico dato que nadie puede
    // adivinar. Y cambiarlo despues es caro —el nombre viaja a 27 archivos del
    // proyecto, desde el docker-compose hasta el index.html— asi que conviene
    // pensarlo una vez.
    normaliza: kebab,
  },
  {
    id: "ORG",
    libre: true,
    texto: "¿Bajo qué cuenta de GitHub va a vivir? Escribí tu usuario, sin la arroba.",
    ayuda: "Si no lo recordás: es lo que aparece en github.com/TU-USUARIO",
    normaliza: (t) => t.trim().replace(/^@/, ""),
  },
  {
    id: "equipo",
    texto: "¿Trabajás solo en este proyecto, o hay más gente que va a revisar el código?",
    opciones: [
      {
        valor: "solo",
        etiqueta: "Solo yo, por ahora",
        detalle:
          "El marco automatiza que otra persona revise cada cambio antes de que entre. Con una sola " +
          "persona eso es imposible por construcción: GitHub le pide revisión a los dueños del código " +
          "EXCEPTO al autor, así que todo cambio tuyo le pediría revisión a nadie. Encender esa " +
          "exigencia te bloquearía TODO merge sin salida. Se deja apagada, se anota como decisión " +
          "firmada, y el pull request con su verificación en verde siguen siendo obligatorios.",
        recomendada: true,
      },
      {
        valor: "equipo",
        etiqueta: "Somos dos o más",
        detalle:
          "Es la forma para la que el marco está pensado: el que no escribió, revisa. Te va a pedir el " +
          "usuario de GitHub de la otra persona. La regla queda encendida desde el primer día.",
      },
    ],
  },
  {
    id: "BUILDER_2",
    libre: true,
    salta: (r) => r.equipo !== "equipo",
    texto: "¿Cuál es el usuario de GitHub de la otra persona que va a revisar? Sin la arroba.",
    ayuda: "Tiene que tener permiso de escritura sobre el repositorio, o GitHub no le va a asignar nada.",
    normaliza: (t) => t.trim().replace(/^@/, ""),
  },
  {
    id: "plataforma",
    texto: "¿Dónde va a vivir tu proyecto? O sea: quién guarda tus datos y en qué computadora corre.",
    opciones: [
      {
        valor: "supabase",
        etiqueta: "Supabase + Cloudflare",
        detalle:
          "Para una idea o un proyecto chico. Supabase te da la base de datos y las cuentas de usuario; " +
          "Cloudflare publica el sitio. Empieza gratis y SIN TARJETA. Los límites que sorprenden: 500 MB " +
          "de base, 50.000 personas usándolo al mes, 2 proyectos activos, y el proyecto se pausa solo si " +
          "no lo tocás por una semana (se despausa con un clic). Con esto NO necesitás Terraform.",
        recomendada: true,
      },
      {
        valor: "aws",
        etiqueta: "AWS",
        detalle:
          "Para algo grande o de empresa. Lo más potente y lo más caro de aprender: pide tarjeta desde " +
          "el día uno, y para configurarlo hay que saber qué es una cuenta, una región y un perfil. Acá " +
          "Terraform SÍ vale la pena, y es lo único que el andamio trae preparado hoy.",
      },
      {
        valor: "gcp",
        etiqueta: "GCP (Google)",
        detalle:
          "Mismo perfil que AWS: potente, pide tarjeta, requiere saber de cuentas y regiones. Aviso " +
          "honesto: hoy el andamio NO lo trae preparado — habría que construirlo.",
      },
      {
        valor: "ninguna",
        etiqueta: "Todavía no sé",
        detalle:
          "Querés el código y las verificaciones automáticas funcionando, y decidís dónde publicarlo más " +
          "adelante. Es una respuesta legítima y no te va a pedir datos de ninguna nube.",
      },
    ],
  },
  {
    id: "ambientes",
    texto: "¿Cuántas copias del proyecto querés? Una para probar sin miedo, otra para lo que ve la gente de verdad.",
    opciones: [
      {
        valor: "uno",
        etiqueta: "Una sola, para empezar",
        detalle:
          "Más simple y más barato. Con el plan gratuito de Supabase es lo que conviene: te deja 2 " +
          "proyectos activos, y usar los dos en dos copias te deja sin margen. Cuando haya gente " +
          "usándolo de verdad, agregás la segunda.",
        recomendada: true,
      },
      {
        valor: "dos",
        etiqueta: "Dos: una de prueba y una de verdad",
        detalle:
          "Lo correcto cuando ya hay personas usando tu proyecto: probás en una sin romperle nada a " +
          "nadie, y cuando funciona pasa a la otra. Cuesta el doble de configuración.",
      },
    ],
  },
  // -------------------------------------------------------------------------
  // LAS CINCO DE AWS. Solo se preguntan si la plataforma ES AWS, y ese `salta`
  // es la razon de ser de todo este archivo: hasta hoy las cinco eran
  // OBLIGATORIAS para todo el mundo, asi que quien elegia Supabase para no
  // gastar tenia que conseguir igual un numero de cuenta de AWS de doce digitos.
  // -------------------------------------------------------------------------
  {
    id: "CUENTA_DEV",
    libre: true,
    salta: (r) => r.plataforma !== "aws",
    texto: (r) =>
      r.ambientes === "dos"
        ? "¿Cuál es el número de cuenta de AWS donde vas a PROBAR? Son doce dígitos."
        : "¿Cuál es el número de cuenta de AWS? Son doce dígitos.",
    ayuda: "Lo ves arriba a la derecha en la consola de AWS, o con: aws sts get-caller-identity",
    normaliza: (t) => t.replace(/[\s-]/g, ""),
  },
  {
    id: "CUENTA_PROD",
    libre: true,
    salta: (r) => r.plataforma !== "aws" || r.ambientes !== "dos",
    texto: "¿Y el número de cuenta de AWS donde va lo que ve la gente de verdad?",
    ayuda: "Conviene que sea una cuenta DISTINTA de la de pruebas: es lo que impide que un error de prueba toque lo real.",
    normaliza: (t) => t.replace(/[\s-]/g, ""),
  },
  {
    id: "REGION",
    libre: true,
    salta: (r) => r.plataforma !== "aws",
    texto: "¿En qué región de AWS? Es en qué parte del mundo viven tus datos.",
    ayuda: "Ejemplo: us-east-1 (Virginia) · sa-east-1 (São Paulo). Elegí la más cercana a tu gente.",
    normaliza: (t) => t.trim().toLowerCase(),
  },
  {
    id: "PERFIL_DEV",
    libre: true,
    salta: (r) => r.plataforma !== "aws",
    texto: (r) =>
      r.ambientes === "dos"
        ? "¿Cómo se llama tu perfil de AWS en esta computadora, el de pruebas?"
        : "¿Cómo se llama tu perfil de AWS en esta computadora?",
    ayuda: "Es el nombre que le pusiste al configurarlo. Los ves con: aws configure list-profiles",
    normaliza: (t) => t.trim(),
  },
  {
    id: "PERFIL_PROD",
    libre: true,
    salta: (r) => r.plataforma !== "aws" || r.ambientes !== "dos",
    texto: "¿Y el perfil de AWS de lo que ve la gente de verdad?",
    ayuda: "Los ves con: aws configure list-profiles",
    normaliza: (t) => t.trim(),
  },
  {
    id: "dominio",
    texto: "¿Tenés un dominio propio? Es la dirección que la gente escribe en el navegador, como miproyecto.com",
    opciones: [
      {
        valor: "gratuito",
        etiqueta: "Todavía no tengo",
        detalle:
          "Se usa la dirección gratuita que da Cloudflare, del tipo tu-proyecto.pages.dev. Funciona " +
          "desde el primer día y sirve para mostrarle el proyecto a alguien. Cuando compres uno propio, " +
          "se cambia y listo.",
        recomendada: true,
      },
      {
        valor: "propio",
        etiqueta: "Sí, ya tengo uno",
        detalle: "Te lo va a pedir. Tené a mano dónde lo compraste: hay que apuntarlo, y eso se hace ahí.",
      },
    ],
  },
  {
    id: "DOMINIO_PROD",
    libre: true,
    salta: (r) => r.dominio !== "propio",
    texto: "¿Cuál es el dominio? Sin http:// ni barra al final.",
    ayuda: "Ejemplo: miproyecto.com",
    normaliza: (t) => t.trim().replace(/^https?:\/\//, "").replace(/\/+$/, ""),
  },
  {
    id: "avisos",
    texto: "Cuando algo falle —se cae el sitio, falla una verificación— ¿dónde querés que te avise?",
    opciones: [
      {
        valor: "correo",
        etiqueta: "Al correo de GitHub, nada más",
        detalle:
          "GitHub ya te manda un correo cuando algo se pone en rojo. Para una persona sola alcanza y no " +
          "hay que configurar nada.",
        recomendada: true,
      },
      {
        valor: "slack",
        etiqueta: "Slack",
        detalle:
          "Si ya usás Slack. Útil cuando hay equipo y querés que el aviso llegue a todos a la vez, no a " +
          "la casilla de uno solo. Te va a pedir el nombre del canal.",
      },
    ],
  },
  {
    id: "CANAL_ALERTAS",
    libre: true,
    salta: (r) => r.avisos !== "slack",
    texto: "¿A qué canal de Slack? Con la almohadilla adelante.",
    ayuda: "Ejemplo: #alertas-produccion",
    normaliza: (t) => (t.trim().startsWith("#") ? t.trim() : `#${t.trim()}`),
  },
  {
    id: "visibilidad",
    texto: "¿El repositorio va a ser público o privado?",
    opciones: [
      {
        valor: "publico",
        etiqueta: "Público",
        detalle:
          "Cualquiera puede LEER tu código; nadie puede cambiarlo sin que vos lo apruebes. Y hay algo " +
          "que solo esta opción te da gratis: podés PROTEGER la rama principal, o sea que las reglas de " +
          "este marco se pueden hacer cumplir de verdad.",
        recomendada: true,
      },
      {
        valor: "privado",
        etiqueta: "Privado",
        detalle:
          "Nadie ve tu código. El costo está medido y no es opinión: GitHub responde 403 y la protección " +
          "de la rama principal NO EXISTE ni puede existir en un repositorio privado del plan gratuito. " +
          "Las reglas quedan escritas y nada las hace cumplir. Se destraba pagando GitHub Pro o " +
          "mudando el repositorio a una organización.",
      },
    ],
  },
];

/** Las claves de las 21 que salen de una respuesta y no de un relleno. */
export function derivar(r) {
  const solo = r.equipo !== "equipo";
  const unDominio = r.dominio === "propio" ? r.DOMINIO_PROD : `${r.PROYECTO}.pages.dev`;
  // Con UN ambiente los dos dominios son el mismo a proposito: el andamio
  // todavia sustituye los dos marcadores, y escribir dos direcciones distintas
  // para una sola copia seria inventar una que no existe.
  const dominioDev = r.ambientes === "dos" ? `dev.${unDominio}` : unDominio;

  return {
    PROYECTO: r.PROYECTO,
    ORG: r.ORG,
    PAQUETE_API: "api",
    PAQUETE_WEB: "web",
    PAQUETE_E2E: "e2e",
    GENERAR_CLIENTE_DATOS: "prisma generate",
    // Los equipos de GitHub NO EXISTEN en una cuenta personal, y GitHub no lo
    // rechaza: simplemente no le asigna la revision a nadie. Los slugs se
    // escriben igual porque el andamio los exige, y el desvio lo deja anotado
    // para que el dia que el review no aparezca haya donde leer por que.
    EQUIPO_BUILDERS: "builders",
    EQUIPO_PO: "po",
    BUILDER_1: r.ORG,
    BUILDER_2: solo ? r.ORG : r.BUILDER_2,
    PO: r.ORG,
    ...(r.plataforma === "aws"
      ? {
          CUENTA_DEV: r.CUENTA_DEV,
          // Con UN ambiente no se pregunta dos veces por lo mismo: la cuenta y
          // el perfil de "produccion" SON los mismos, y decirlo asi es mas
          // honesto que pedir dos veces el mismo dato.
          CUENTA_PROD: r.ambientes === "dos" ? r.CUENTA_PROD : r.CUENTA_DEV,
          REGION: r.REGION,
          PERFIL_DEV: r.PERFIL_DEV,
          PERFIL_PROD: r.ambientes === "dos" ? r.PERFIL_PROD : r.PERFIL_DEV,
        }
      : RELLENO_AWS),
    PREFIJO_RECURSOS: kebab(r.PROYECTO).slice(0, 20),
    DOMINIO_DEV: dominioDev,
    DOMINIO_PROD: unDominio,
    ...(r.avisos === "slack" ? { CANAL_ALERTAS: r.CANAL_ALERTAS } : RELLENO_SLACK),
  };
}

/** Lo que el proyecto se aparta de lo que el marco supone, con su motivo.
 *
 *  NO ES DECORACION. El marco permite apartarse de casi cualquier pieza; lo que
 *  no permite es que apartarse sea algo que se descubre despues. Cada linea de
 *  aca nace de una respuesta y dice que regla queda sin cumplir y por que. */
export function desvios(r) {
  const lista = [];
  if (r.equipo !== "equipo") {
    lista.push({
      regla: "revision-cruzada-obligatoria",
      motivo:
        "El equipo es una sola persona. GitHub pide revision a los duenos del codigo excepto al autor, " +
        "asi que exigir una aprobacion ajena bloquearia todo merge sin salida. El pull request y la " +
        "verificacion en verde siguen siendo obligatorios; lo que queda apagado es la aprobacion humana ajena.",
      revisar: "cuando entre la segunda persona al proyecto",
    });
  }
  if (r.plataforma !== "aws") {
    lista.push({
      regla: "infraestructura-declarada-en-terraform",
      motivo:
        `La plataforma elegida es "${r.plataforma}" y el andamio solo trae Terraform de AWS. Las cinco ` +
        "claves de AWS del archivo de valores llevan relleno porque una clave vacia se lee como marcador " +
        "sin resolver y pondria el proyecto en rojo el dia uno. No describen ninguna cuenta real.",
      revisar: "cuando el andamio reparta infraestructura segun la plataforma elegida",
    });
  }
  if (r.avisos !== "slack") {
    lista.push({
      regla: "alertas-a-un-canal-del-equipo",
      motivo:
        "Los avisos van al correo de GitHub. Las dos claves de Slack llevan relleno por el mismo motivo " +
        "que las de AWS: vacias se leerian como marcador sin resolver.",
      revisar: "cuando haya equipo y un canal donde avisarle",
    });
  }
  if (r.visibilidad === "privado") {
    lista.push({
      regla: "proteccion-de-la-rama-principal",
      motivo:
        "El repositorio es privado en el plan gratuito de GitHub, donde la proteccion de rama no existe " +
        "y la API responde 403. Las reglas del marco quedan escritas sin nada que las haga cumplir.",
      revisar: "al pasar a publico, a GitHub Pro, o a una organizacion con plan Team",
    });
  }
  return lista;
}

/** El texto de una pregunta tal cual sale por pantalla. Se separa de la
 *  impresion para que el banco pueda afirmarlo sin capturar la consola. */
export function lineasDePregunta(p, numero, total, r = {}) {
  const texto = typeof p.texto === "function" ? p.texto(r) : p.texto;
  const l = [`\n[${numero}/${total}]  ${texto}`];
  if (p.ayuda) l.push(`        ${p.ayuda}`);
  if (p.opciones) {
    p.opciones.forEach((o, i) => {
      l.push(`\n  ${i + 1}) ${o.etiqueta}${o.recomendada ? "   ← recomendada" : ""}`);
      for (const trozo of envolver(o.detalle, 88)) l.push(`     ${trozo}`);
    });
  }
  return l;
}

function envolver(texto, ancho) {
  const salida = [];
  let linea = "";
  for (const palabra of texto.split(/\s+/)) {
    if (linea && `${linea} ${palabra}`.length > ancho) {
      salida.push(linea);
      linea = palabra;
    } else linea = linea ? `${linea} ${palabra}` : palabra;
  }
  if (linea) salida.push(linea);
  return salida;
}

/** Corre el cuestionario.
 *
 *  `preguntar` entra por parametro, igual que en projects-versiones.mjs y por la
 *  misma razon: asi el banco lo ejercita sin una terminal, pasandole respuestas
 *  escritas de antemano, y puede afirmar CUANTAS preguntas se hicieron y EN QUE
 *  ORDEN. Metido adentro de main() la unica forma de probarlo seria simular un
 *  teclado, y eso en los tres sistemas donde corre este banco no existe.
 *
 *  `previos` son respuestas que ya se tienen —de una corrida anterior— y se
 *  ofrecen como valor por defecto. Es lo que hace que volver a correrlo no
 *  obligue a contestar todo de nuevo.
 *
 *  No imprime nada: devuelve las lineas para que quien llama las emita. Una
 *  funcion que decide y ademas escribe en la consola no se puede afirmar. */
export async function correrAsistente(preguntar, previos = {}, formatos = {}, emitir = () => {}) {
  const respuestas = { ...previos };
  const dicho = [];

  // SE EMITE EN EL MOMENTO Y ADEMAS SE GUARDA, y las dos mitades hacen falta.
  // La primera version solo guardaba y quien llamaba imprimia al final: la
  // persona veia `Tu respuesta:` sin haber visto NUNCA la pregunta, porque el
  // texto salia despues de que ya habia contestado todo. Guardar sigue haciendo
  // falta para que el banco pueda afirmar cuantas preguntas se hicieron y en
  // que orden sin capturar la consola.
  const decir = (linea) => {
    dicho.push(linea);
    emitir(linea);
  };

  // EL TOTAL SE RECALCULA EN CADA PREGUNTA, y no se fija al principio.
  //
  // El defecto que esto cierra, medido: la primera version contaba las preguntas
  // activas ANTES del bucle, cuando `respuestas` estaba vacio. Pero cuantas
  // preguntas hay DEPENDE de lo que se vaya contestando —elegir AWS agrega
  // cinco—, asi que el denominador nacia viejo y la pantalla decia `[13/8]`.
  // "trece de ocho" no significa nada para nadie, y quien lo lee no sabe si el
  // programa se rompio, si conto mal, o cuanto falta.
  //
  // Recalcularlo es honesto en todo momento: al empezar son ocho porque con las
  // respuestas de ese momento son ocho, y en cuanto se elige AWS pasa a trece.
  const cuantasQuedan = () => PREGUNTAS.filter((q) => !q.salta || !q.salta(respuestas)).length;

  let n = 0;
  for (const p of PREGUNTAS) {
    if (p.salta && p.salta(respuestas)) continue;
    n += 1;
    const previo = previos[p.id];

    for (;;) {
      for (const linea of lineasDePregunta(p, n, cuantasQuedan(), respuestas)) decir(linea);

      if (p.opciones) {
        const porDefecto = previo ?? p.opciones.find((o) => o.recomendada)?.valor;
        const idx = p.opciones.findIndex((o) => o.valor === porDefecto);
        const cruda = (await preguntar(`\n  Elegí un número [Enter = ${idx + 1}]: `)).trim();
        if (!cruda) {
          respuestas[p.id] = porDefecto;
          decir(`  → ${p.opciones[idx].etiqueta}`);
          break;
        }
        const elegida = p.opciones[Number(cruda) - 1];
        if (!elegida) {
          decir(`  ✗ "${cruda}" no es una de las opciones. Escribí un número del 1 al ${p.opciones.length}.`);
          continue;
        }
        respuestas[p.id] = elegida.valor;
        decir(`  → ${elegida.etiqueta}`);
        break;
      }

      const sufijo = previo ? ` [Enter mantiene: ${previo}]` : "";
      const cruda = (await preguntar(`\n  Tu respuesta${sufijo}: `)).trim();
      const valor = cruda ? (p.normaliza ? p.normaliza(cruda) : cruda) : previo;
      if (!valor) {
        decir("  ✗ Esta no tiene valor por defecto: hay que contestarla.");
        continue;
      }
      // Se valida CON EL PATRON DE SIEMPRE y en el momento. Dos validaciones
      // distintas divergen, y la que se pudre es la que nadie mira.
      const formato = formatos[p.id];
      if (formato?.patron && !formato.patron.test(valor)) {
        decir(`  ✗ "${valor}" no tiene la forma que corresponde: ${formato.espera}`);
        continue;
      }
      respuestas[p.id] = valor;
      if (cruda && p.normaliza && valor !== cruda) decir(`  → se guardó como: ${valor}`);
      break;
    }
  }

  return { respuestas, valores: derivar(respuestas), desvios: desvios(respuestas), dicho };
}

/** El resumen que se imprime antes de escribir nada, para que la persona vea lo
 *  que eligio junto y pueda arrepentirse. */
export function lineasDeResumen(r, desviosDeR) {
  const l = ["", "Esto es lo que elegiste:", ""];
  const filas = [
    ["Proyecto", r.PROYECTO],
    ["Cuenta de GitHub", `@${r.ORG}`],
    ["Equipo", r.equipo === "solo" ? "trabajás solo" : `vos y @${r.BUILDER_2}`],
    ["Dónde vive", { supabase: "Supabase + Cloudflare", aws: "AWS", gcp: "GCP", ninguna: "todavía sin decidir" }[r.plataforma]],
    ["Copias", r.ambientes === "uno" ? "una sola" : "una de prueba y una de verdad"],
    ["Dirección", r.dominio === "propio" ? r.DOMINIO_PROD : `${r.PROYECTO}.pages.dev  (la gratuita de Cloudflare)`],
    ["Avisos", r.avisos === "slack" ? r.CANAL_ALERTAS : "al correo de GitHub"],
    ["Repositorio", r.visibilidad === "publico" ? "público" : "privado"],
  ];
  // Las de AWS son las UNICAS que la persona tuvo que ir a buscar a otro lado, y
  // la primera version del resumen no las mostraba: se llamaba "todo lo que
  // elegiste" y se comia justo las cinco que mas cuesta verificar.
  if (r.plataforma === "aws") {
    filas.push(["Cuenta de AWS", r.ambientes === "dos" ? `${r.CUENTA_DEV} (pruebas) y ${r.CUENTA_PROD} (de verdad)` : r.CUENTA_DEV]);
    filas.push(["Región", r.REGION]);
    filas.push(["Perfil de AWS", r.ambientes === "dos" ? `${r.PERFIL_DEV} y ${r.PERFIL_PROD}` : r.PERFIL_DEV]);
  }
  const ancho = Math.max(...filas.map(([k]) => k.length));
  for (const [k, v] of filas) l.push(`  ${k.padEnd(ancho)}   ${v}`);

  if (desviosDeR.length) {
    l.push("", `Y esto queda apartado de lo que el marco supone, con su motivo escrito (${desviosDeR.length}):`, "");
    for (const d of desviosDeR) l.push(`  · ${d.regla} — se revisa ${d.revisar}`);
  }
  return l;
}
