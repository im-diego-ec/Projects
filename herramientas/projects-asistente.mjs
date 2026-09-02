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
/** SI ESTE PROYECTO USA AWS DE VERDAD, y por que es una funcion y no una
 *  comparacion suelta repetida en siete lugares.
 *
 *  EL DEFECTO QUE CIERRA, medido barriendo las 192 combinaciones de las
 *  preguntas de eleccion: las cinco preguntas de AWS se saltaban cuando la forma
 *  era un sitio O la plataforma no era AWS, y `derivar` ramificaba mirando SOLO
 *  la plataforma. Las dos mitades decidian distinto, asi que sitio+AWS —32 de
 *  las 192— no preguntaba nada y despues escribia cinco `undefined`. El
 *  asistente imprimia «Cuenta de AWS undefined», SALIA 0, y el paso siguiente
 *  abortaba con los cinco «falta». Volver a correrlo reproducia el mismo archivo
 *  roto: un callejon sin salida, y ningun mensaje nombraba la combinacion
 *  culpable.
 *
 *  Que la herramienta afirme exito sobre un archivo que ella misma rechaza dos
 *  segundos despues es peor que un rojo.
 *
 *  Y HABIA UNA TERCERA MITAD, que la primera version de este comentario nego:
 *  decia «con un solo predicado, las dos mitades no pueden volver a discrepar» y
 *  eran TRES los lugares que deciden. El que faltaba es `noViajanPorPlataforma`
 *  de projects-init.mjs, o sea el que decide QUE ARCHIVOS VIAJAN: seguia mirando
 *  solo la plataforma, asi que sitio+AWS recibia igual `infra/` e `infra-prod/`
 *  con dos raices de Terraform apuntando a la cuenta del relleno. El rojo se
 *  habia ido y el arbol equivocado quedaba, que es peor porque nada lo dice.
 *
 *  Hoy las tres deciden por lo mismo, y hay un caso del banco que las cruza. */
export const usaAws = (r) => r.plataforma === "aws" && r.forma !== "sitio";

export const RELLENO_AWS = {
  // LOS CEROS NO SON DECORACION: son la unica forma que tiene una clave con
  // formato de cuenta de AWS de decir «acá no hay ninguna».
  //
  // El relleno anterior era `111111111111` y `222222222222`. La restriccion es
  // que FORMATOS exige doce digitos, asi que no se puede escribir «sin-aws»
  // como en los perfiles. Y esos valores no se quedaban en el archivo: la
  // constitucion del proyecto los IMPRIME en su tabla de ambientes —«| Cuenta
  // AWS | 111111111111 | 222222222222 |»— y ahi ya no se leen como relleno,
  // se leen como el dato de la persona.
  //
  // Doce ceros no es una cuenta de AWS y no puede serlo. Es el mismo criterio
  // que el UUID nulo de ID_MCP_SLACK, que ya estaba resuelto asi.
  CUENTA_DEV: "000000000000",
  CUENTA_PROD: "000000000000",
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
    id: "forma",
    texto: "¿Qué vas a construir? Es la decisión que más cuesta si se toma tarde.",
    opciones: [
      {
        valor: "aplicacion",
        etiqueta: "Una aplicación detrás de una puerta",
        detalle:
          "HOY NO SE PUBLICA SOLO: el marco todavía no reparte un paso que la lleve a internet, así que por " +
          "ahora se levanta en tu máquina. " +
          "La gente entra con usuario y contraseña y trabaja adentro un rato largo: un panel de gestión, " +
          "un inventario, una herramienta de trabajo. Se siente como un programa y no como un sitio — entrás " +
          "una vez y las pantallas cambian al instante. LO QUE TE CUESTA: ninguna de tus pantallas va a " +
          "aparecer en Google ni se va a previsualizar al compartir el enlace, y eso NO se arregla con un " +
          "ajuste. Si nadie de afuera entra por un enlace, este límite no te toca nunca.",
        recomendada: true,
      },
      {
        valor: "sitio",
        etiqueta: "Un sitio para leer",
        detalle:
          "SE PUBLICA SOLO: cada vez que las verificaciones quedan en verde, sale a internet. " +
          "Páginas que alguien abre y lee: un blog, un manual, la web de un producto, un catálogo. Nadie se " +
          "registra y nadie guarda nada. Es la más barata de todas: sin base de datos, sin servidor, sin " +
          "contraseñas que proteger, y las páginas abren al instante porque no mandan ni un programa al " +
          "navegador. Es lo único que aparece bien en Google. LO QUE TE CUESTA: no hay botón de publicar — " +
          "cada corrección de un texto es un cambio en el repositorio. Y el día que dos o tres personas " +
          "quieran escribir sin tocar código, vas a necesitar otra herramienta.",
      },
    ],
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
        // DOS AFIRMACIONES SALIERON DE ACA PORQUE NO SE SOSTIENEN CONTRA LA FUENTE.
        //
        // 1. «SIN TARJETA». La cita rastreable de Supabase es un post de marzo de
        //    2021 sobre el pricing de la BETA, un esquema que ya no existe; la
        //    pagina de precios de hoy no lleva la frase. Y ninguna pagina de
        //    Cloudflare dice «sin tarjeta» en ningun lado --ni /plans, ni la de
        //    precios de Workers, ni el get-started--. Probablemente sea cierto en
        //    la practica, y por eso la frase VUELVE el dia que alguien de de alta
        //    una cuenta real de cada uno y lo compruebe: es media hora de trabajo.
        //    Mientras tanto no se afirma, porque es justo la columna que una
        //    persona sin tarjeta mira primero para decidir si puede empezar.
        //
        // 2. «se pausa solo (se despausa con un clic)» OMITIA QUE SI AVISA. Supabase
        //    manda un mail una semana antes y otro al pausar, y la pausa se evita
        //    entrando al panel. La redaccion vieja la hacia sonar como una trampa
        //    silenciosa --el proyecto deja de andar y nadie te dice por que-- y eso
        //    era el argumento mas fuerte para mover a alguien de proveedor.
        //    Verificado el 2026-09-01 contra
        //    https://supabase.com/docs/guides/platform/free-project-pausing
        detalle:
          "Para una idea o un proyecto chico. Supabase te da la base de datos y las cuentas de usuario; " +
          "Cloudflare publica el sitio. Empieza gratis. Los límites que sorprenden: 500 MB de base, " +
          "50.000 personas usándolo al mes, y 2 proyectos activos. Y si pasa una semana entera sin que " +
          "nadie entre, Supabase lo pausa: te avisan por mail una semana antes y otro al pausarlo, y se " +
          "despausa con un clic. Con esto NO necesitás Terraform.",
        recomendada: true,
      },
      {
        valor: "aws",
        etiqueta: "AWS",
        // LO QUE ESTE DETALLE AFIRMABA Y NO ERA CIERTO PARA QUIEN LO LEE.
        //
        // Decia que «acá Terraform SÍ vale la pena, y es lo único que el andamio
        // trae preparado hoy», presentandolo como LA VENTAJA de elegir AWS.
        // Terraform es una herramienta de terminal, y quien contesta estas
        // preguntas no tiene terminal --por eso existe este archivo--. La ventaja
        // estaba fuera de su alcance, y aun asi la usabamos para venderle la
        // opcion.
        //
        // Y FALTABA EL LIMITE QUE MAS DUELE, verificado el 2026-09-01: la cuenta
        // gratuita de AWS SE CIERRA SOLA a los 6 meses o al agotarse los
        // creditos, lo que pase primero; despues AWS retiene los datos 90 dias y
        // los borra. https://aws.amazon.com/free/free-tier-faqs/
        // Alguien podia elegir AWS creyendo que empezaba gratis y perder el
        // proyecto medio ano despues sin que nada se lo hubiera dicho.
        //
        // SI ESTA OPCION SE VA DEL MENU es otra decision, y esta escrita aparte
        // en openspec/changes/menu-que-no-miente/. No se toma sola desde un
        // comentario: sacarla deja inalcanzables las cinco preguntas de AWS y el
        // predicado `usaAws`, y eso es codigo muerto que hay que resolver en el
        // mismo acto. Mientras tanto, la opcion se queda --pero deja de prometer
        // lo que no puede dar--.
        detalle:
          "Para algo grande o de empresa, y sólo si tenés a mano a alguien técnico. Pide tarjeta desde " +
          "el día uno. Ojo con esto: la cuenta gratuita SE CIERRA SOLA a los 6 meses, o antes si se " +
          "acaban los créditos — después AWS guarda tus datos 90 días y los borra. El andamio te deja " +
          "listo el Terraform, pero aplicarlo se hace desde una terminal: si no usás terminal, esta " +
          "opción te va a dejar a mitad de camino.",
      },
      // GCP SALE DE LAS OPCIONES, y es la misma leccion que Slack.
      //
      // Su propio texto admitia que «hoy el andamio NO lo trae preparado», y aun
      // asi se ofrecia como elegible: quien la elegia recibia un proyecto sin
      // infraestructura y sin nada que se lo explicara, igual que quien elegia
      // Slack recibia un archivo que el motor rechazaba. Una opcion que se
      // ofrece y no funciona es peor que no ofrecerla.
      //
      // Vuelve el dia que exista su adaptador, y ese dia la fila de la carta y
      // esta opcion se mueven JUNTAS —hay un banco que lo exige—. Mientras
      // tanto, quien quiera GCP elige «todavia no se» y lo deja anotado como
      // desvio, que es lo honesto: el proyecto queda sin infraestructura, y eso
      // es exactamente lo que el marco puede darle hoy.
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
    // NO SE PREGUNTA PARA UN SITIO, y el motivo es que la respuesta no cambiaba
    // nada. Medido: contestar «dos» sobre forma=sitio produce los MISMOS 42
    // archivos que contestar «una», y lo unico que se mueve es el valor declarado
    // `DOMINIO_DEV`. No hay un segundo destino que desplegar: un sitio publica en
    // uno solo, y ese es el publico.
    //
    // Preguntar algo cuya respuesta no cambia nada es peor que no preguntarlo: le
    // hace creer a la persona que eligio una arquitectura cuando eligio un texto.
    // Es el mismo criterio con el que las cinco preguntas de AWS ya se saltan.
    salta: (r) => r.forma === "sitio",
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
    salta: (r) => !usaAws(r),
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
    salta: (r) => !usaAws(r) || r.ambientes !== "dos",
    texto: "¿Y el número de cuenta de AWS donde va lo que ve la gente de verdad?",
    ayuda: "Conviene que sea una cuenta DISTINTA de la de pruebas: es lo que impide que un error de prueba toque lo real.",
    normaliza: (t) => t.replace(/[\s-]/g, ""),
  },
  {
    id: "REGION",
    libre: true,
    salta: (r) => !usaAws(r),
    texto: "¿En qué región de AWS? Es en qué parte del mundo viven tus datos.",
    ayuda: "Ejemplo: us-east-1 (Virginia) · sa-east-1 (São Paulo). Elegí la más cercana a tu gente.",
    normaliza: (t) => t.trim().toLowerCase(),
  },
  {
    id: "PERFIL_DEV",
    libre: true,
    salta: (r) => !usaAws(r),
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
    salta: (r) => !usaAws(r) || r.ambientes !== "dos",
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
          "Se usa la dirección gratuita que da Cloudflare, del tipo tu-proyecto.tu-cuenta.workers.dev. " +
          "Funciona desde el primer día y sirve para mostrarle el proyecto a alguien. La parte del medio la " +
          "elegís vos al abrir la cuenta y Cloudflare te la imprime la primera vez que publicás; hasta " +
          "entonces queda anotada como pendiente. Cuando compres un dominio propio, se cambia y listo.",
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
  // LA DIRECCION GRATUITA ES DE WORKERS, NO DE PAGES, y la diferencia no es de
  // nombre: este andamio publica con `wrangler deploy` sobre Cloudflare Workers
  // —argumentado en sitio/wrangler.jsonc citando a la propia Cloudflare— y un
  // `.pages.dev` solo existe si alguien crea un proyecto de Pages, cosa que aca
  // no ocurre nunca. Escrito asi, el `site:` de Astro apuntaba a una direccion
  // que no iba a resolver jamas, y de ahi salen los enlaces canonicos del sitio
  // publicado.
  //
  // LO QUE NO SE PUEDE DERIVAR, y por eso queda anotado como desvio: la direccion
  // real lleva el subdominio de la cuenta en el medio
  // (`<proyecto>.<subdominio>.workers.dev`), y ese subdominio lo elige la persona
  // al abrir la cuenta —que no existe todavia cuando se contesta esta pregunta—.
  // Cloudflare lo imprime en la primera publicacion.
  const unDominio = r.dominio === "propio" ? r.DOMINIO_PROD : `${r.PROYECTO}.workers.dev`;
  // Con UN ambiente los dos dominios son el mismo a proposito: el andamio
  // todavia sustituye los dos marcadores, y escribir dos direcciones distintas
  // para una sola copia seria inventar una que no existe.
  const dominioDev = r.ambientes === "dos" ? `dev.${unDominio}` : unDominio;

  return {
    // EN MINUSCULA Y FUERA DE LOS 21 a proposito: no es un marcador que el
    // andamio sustituya en ningun archivo, es una decision sobre QUE archivos
    // viajan. La clave ya existia en plantilla/.projects-valores.json; lo unico
    // que faltaba era que alguien la leyera.
    plataforma: r.plataforma,
    forma: r.forma,
    // NO SE PREGUNTA. Es la cuenta donde vive el MARCO, no la del proyecto, y
    // quien corre esta herramienta la tiene delante: sale del remoto del clon.
    // Preguntarla seria pedirle a la persona un dato que el programa ya sabe —y
    // que ademas no puede contestar, porque no es una decision suya.
    ORG_MARCO: r.ORG_MARCO,
    PROYECTO: r.PROYECTO,
    ORG: r.ORG,
    PAQUETE_API: "api",
    PAQUETE_WEB: "web",
    PAQUETE_E2E: "e2e",
    PAQUETE_SITIO: "sitio",
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
    ...(usaAws(r)
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
    // EL RELLENO VA SIEMPRE Y EL CANAL LO PISA. Escrito al reves —el relleno
    // ENTERO solo cuando no hay Slack— elegir Slack dejaba `ID_MCP_SLACK` sin
    // valor, y el archivo salia invalido: `::error::falta ID_MCP_SLACK`, exit 1.
    // O sea que la opcion menos usada del asistente era la unica que no
    // funcionaba, y quien la elegia quedaba tirado con un error que no habla de
    // lo que eligio. El id de MCP no se pregunta a proposito: es un UUID que
    // sale de la configuracion de la herramienta, no una decision de negocio.
    ...RELLENO_SLACK,
    ...(r.avisos === "slack" ? { CANAL_ALERTAS: r.CANAL_ALERTAS } : {}),
  };
}

/** Lo que el proyecto se aparta de lo que el marco supone, con su motivo.
 *
 *  NO ES DECORACION. El marco permite apartarse de casi cualquier pieza; lo que
 *  no permite es que apartarse sea algo que se descubre despues. Cada linea de
 *  aca nace de una respuesta y dice que regla queda sin cumplir y por que. */
/** LOS DESVIOS DECLARADOS, y por que su `regla` no es texto libre.
 *
 *  EL DEFECTO QUE CIERRA, medido: los cinco ids que esta funcion escribia
 *  —`revision-cruzada-obligatoria`, `infraestructura-declarada-en-terraform`,
 *  `alertas-a-un-canal-del-equipo`, `proteccion-de-la-rama-principal` y
 *  `direccion-publica-declarada`— NO EXISTIAN EN EL CANONICO. Ninguno.
 *
 *  El campo `regla` es el id de la regla del canonico de la que el proyecto se
 *  aparta, y la accion de constitucion lo usa para dos cosas: mostrar el desvio
 *  al lado de su regla, y cazar «desvios muertos» (una regla que ya no existe).
 *  Con ids inventados, lo primero no ocurria y lo segundo habria puesto rojo el
 *  proyecto entero el dia que el otro defecto —la forma del archivo— se
 *  arreglara. Los dos se arreglan juntos a proposito: arreglar uno solo cambia
 *  un silencio por cinco rojos. */
export function desvios(r, hoy = new Date().toISOString().slice(0, 10)) {
  // LOS CUATRO CAMPOS DEL CONTRATO, y faltaban dos.
  //
  // `actions/constitucion` exige `regla`, `motivo`, `aprobado_por` y `fecha`, y
  // pone ROJO el proyecto por cada desvio al que le falte alguno. El asistente
  // escribia solo los dos primeros: medido corriendo la accion contra un par de
  // archivos recien generados, cuatro `::error::` de «no dice quien lo aprobo».
  //
  // QUIEN APRUEBA es la persona que contesto el cuestionario, que es la duenia
  // de la cuenta donde va el proyecto: la decision fue suya y el archivo tiene
  // que decirlo con un nombre, no con un «alguien». LA FECHA entra por parametro
  // para que el banco pueda afirmar sobre ella sin depender del dia que corra.
  const comun = { aprobado_por: r.ORG, fecha: hoy };
  const lista = [];
  if (r.equipo !== "equipo") {
    lista.push({
      ...comun,
      regla: "github-review-cruzado-automatizado",
      motivo:
        "El equipo es una sola persona. GitHub pide revision a los duenos del codigo excepto al autor, " +
        "asi que exigir una aprobacion ajena bloquearia todo merge sin salida. El pull request y la " +
        "verificacion en verde siguen siendo obligatorios; lo que queda apagado es la aprobacion humana ajena.",
      revisar: "cuando entre la segunda persona al proyecto",
    });
  }
  if (!usaAws(r)) {
    lista.push({
      ...comun,
      regla: "iac-es-terraform",
      motivo:
        (r.plataforma === "aws"
          ? "La plataforma elegida es AWS pero la forma es un sitio para leer: se publica en Cloudflare y no tiene " +
            "servidor propio que desplegar, asi que las cinco preguntas de AWS no se hicieron. "
          : `La plataforma elegida es "${r.plataforma}" y el andamio solo trae Terraform de AWS. `) +
        "Las cinco " +
        "claves de AWS del archivo de valores llevan relleno porque una clave vacia se lee como marcador " +
        "sin resolver y pondria el proyecto en rojo el dia uno. No describen ninguna cuenta real.",
      revisar: "cuando el andamio reparta infraestructura segun la plataforma elegida",
    });
  }
  if (r.avisos !== "slack") {
    lista.push({
      ...comun,
      regla: "alertar-con-origen-preciso",
      motivo:
        "Los avisos van al correo de GitHub. Las dos claves de Slack llevan relleno por el mismo motivo " +
        "que las de AWS: vacias se leerian como marcador sin resolver.",
      revisar: "cuando haya equipo y un canal donde avisarle",
    });
  }
  if (r.dominio !== "propio") {
    lista.push({
      ...comun,
      regla: "urls-canonicas-por-cors",
      motivo:
        "No hay dominio propio, asi que se anoto la direccion gratuita de Cloudflare Workers " +
        "`<proyecto>.workers.dev`. LE FALTA EL SUBDOMINIO DE LA CUENTA en el medio " +
        "(`<proyecto>.<subdominio>.workers.dev`): lo elige la persona al abrir la cuenta y no existe todavia " +
        "cuando se contesta esta pregunta. Cloudflare imprime la direccion completa en la primera publicacion; " +
        "hasta entonces el `site:` de Astro apunta a un nombre que no resuelve, lo que afecta los enlaces " +
        "canonicos del HTML publicado y nada mas.",
      revisar: "despues de la primera publicacion, con la direccion que imprime Cloudflare",
    });
  }
  // LA PROMOCION POR AMBIENTES, que la constitucion declara y el andamio no
  // reparte. Va SIEMPRE, para las dos formas, y por eso no lleva condicion.
  //
  // EL DEFECTO QUE CIERRA, medido en un proyecto recien generado: la constitucion
  // que aterriza en TODO proyecto declara «merge → deploy a DEV → smoke API → E2E
  // → deploy a PROD → verificar-prod» como la practica de ese proyecto, y el
  // andamio no trae un solo workflow que haga nada de eso: los que viajan son
  // ci.yml, claude.yml, actualizar-marco.yml y —solo para un sitio—
  // desplegar.yml, que publica en UN destino y no promueve.
  //
  // Una regla que describe maquinaria inexistente es peor que una regla ausente:
  // los agentes del proyecto la leen como practica vigente y planifican contra
  // ella. El marco ya tiene el mecanismo para esto y es este: declararlo.
  lista.push({
    ...comun,
    regla: "promocion-por-ambientes",
    motivo:
      "El andamio no reparte pipeline de promocion: no hay deploy a dev, ni smoke, ni promocion a prod. Lo que " +
      "viaja hoy es la verificacion (ci.yml) y, solo para la forma «un sitio para leer», una publicacion a UN " +
      "destino (desplegar.yml). La regla queda escrita como el destino, no como lo que este proyecto hace hoy. " +
      "Lo mismo vale para `dev-es-staging-compartido`, que describe la misma maquinaria.",
    revisar: "cuando el marco reparta el pipeline de promocion, o cuando este proyecto escriba el suyo",
  });
  if (r.visibilidad === "privado") {
    lista.push({
      ...comun,
      regla: "git-check-requerido-es-el-veredicto-agregado",
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
 *  `preguntar` recibe DOS argumentos: el texto y el ID DE LA PREGUNTA. El segundo
 *  no lo usa la terminal —a una persona el id no le dice nada— y existe para el
 *  banco, por un defecto medido: mientras el falso preguntador contestaba por
 *  POSICION, un guion escrito a mano se desalineaba en silencio en cuanto una
 *  pregunta condicional cambiaba de lugar. El caso llamado «slack» del banco
 *  contestaba «correo» y pasaba en verde, asi que el camino de Slack estuvo roto
 *  —el archivo salia sin `ID_MCP_SLACK` y `projects init` abortaba— con 580
 *  pruebas en verde. Contestando por id eso no puede volver a pasar.
 *
 *  `previos` son respuestas que ya se tienen —de una corrida anterior— y se
 *  ofrecen como valor por defecto. Es lo que hace que volver a correrlo no
 *  obligue a contestar todo de nuevo.
 *
 *  No imprime nada: devuelve las lineas para que quien llama las emita. Una
 *  funcion que decide y ademas escribe en la consola no se puede afirmar. */
export async function correrAsistente(preguntar, previos = {}, formatos = {}, emitir = () => {}, derivados = {}) {
  const respuestas = { ...derivados, ...previos };
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

    // EL TECHO DE REINTENTOS, y no es paranoia: es un modo de falla medido.
    //
    // Una pregunta sin valor por defecto vuelve a preguntar mientras la
    // respuesta sea vacia. Frente a una persona eso es correcto —contesta o
    // insiste—, pero frente a algo que devuelve vacio para siempre —un guion de
    // prueba que se quedo corto, una tuberia agotada— el bucle no termina
    // NUNCA: el banco entero se colgo 41 segundos hasta que el corredor lo
    // mato, y un banco colgado no dice que esta mal, solo que no termina.
    let intentos = 0;
    for (;;) {
      if (++intentos > 50) {
        throw new Error(
          `la pregunta "${p.id}" se repitio 50 veces sin una respuesta valida. Si esto salio en un banco, el ` +
            "preguntador se quedo sin respuestas; si salio en una terminal, es un defecto de esta herramienta.",
        );
      }
      for (const linea of lineasDePregunta(p, n, cuantasQuedan(), respuestas)) decir(linea);

      if (p.opciones) {
        const porDefecto = previo ?? p.opciones.find((o) => o.recomendada)?.valor;
        const idx = p.opciones.findIndex((o) => o.valor === porDefecto);
        const cruda = (await preguntar(`\n  Elegí un número [Enter = ${idx + 1}]: `, p.id)).trim();
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
      const cruda = (await preguntar(`\n  Tu respuesta${sufijo}: `, p.id)).trim();
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
    [
      "Dirección",
      r.dominio === "propio"
        ? r.DOMINIO_PROD
        : `${r.PROYECTO}.workers.dev  (la gratuita de Cloudflare; le falta el subdominio de tu cuenta en el medio, ` +
          `y sale en la primera publicación)`,
    ],
    ["Avisos", r.avisos === "slack" ? r.CANAL_ALERTAS : "al correo de GitHub"],
    ["Repositorio", r.visibilidad === "publico" ? "público" : "privado"],
  ];
  // Las de AWS son las UNICAS que la persona tuvo que ir a buscar a otro lado, y
  // la primera version del resumen no las mostraba: se llamaba "todo lo que
  // elegiste" y se comia justo las cinco que mas cuesta verificar.
  if (usaAws(r)) {
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
