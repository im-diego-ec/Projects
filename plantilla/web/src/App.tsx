import { useEffect, useState } from "react";
import { z } from "zod";
import type { Autenticacion, Sesion } from "./auth";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

// El nombre del proyecto llega por el marcador que sustituye `projects init`, y
// entra por un string y no suelto entre etiquetas: un marcador de doble llave
// en el cuerpo del JSX se lee como un objeto literal, asi que el archivo no
// compilaria ANTES de la sustitucion (la misma leccion que las comillas que
// ci.yml le pone al suyo para que el YAML parsee). Con el string, el andamio es
// TSX valido en los dos estados: antes y despues de `projects init`.
const NOMBRE_DEL_PROYECTO = "{{PROYECTO}}";

// La organizacion entra por el MISMO camino y por el mismo motivo de arriba: un
// marcador suelto entre etiquetas se leeria como objeto literal. Y entra por un
// marcador —no por texto escrito a mano— porque `projects init` solo sustituye
// marcadores: un nombre de organizacion tecleado aca no lo toca nadie y nace
// impreso en la portada de todo repositorio que salga del andamio.
const ORG_DEL_PROYECTO = "{{ORG}}";

// LO QUE LLEGA DEL API SE VALIDA ANTES DE USARLO, aunque el API sea nuestro
// (constitucion: "Validar TODO input externo con Zod"). Sin esto el `.json()`
// entra como `any`, el front lee campos que nadie garantiza y un cambio de
// contrato del backend se manifiesta como una interfaz rota en el navegador de
// un usuario en vez de un mensaje legible. Estos dos esquemas son, ademas, la
// documentacion mas corta de lo que el andamio espera del API.
//
// LOS NOMBRES DE CAMPO SON LOS QUE DEVUELVE EL API DE ESTE MISMO ANDAMIO:
// api/src/app.ts responde `{ estado, servicio, ts }` en /api/health y
// `{ mensaje, userId }` en /api/hello. Aca decian `status` y `message`, o sea
// el hello-world no podia leer a su propio backend: los dos safeParse fallaban
// y la portada mostraba SIEMPRE el mensaje de respuesta inesperada, con un
// diagnostico que mandaba a mirar el proxy en vez del contrato. El acople lo
// vigila pruebas/andamio/acoples-del-andamio.test.mjs, que compara estos
// esquemas contra los `res.json` de app.ts: si se separan otra vez, da rojo.
const RespuestaSalud = z.object({ estado: z.string() });
const RespuestaSaludDeLaBase = z.object({ db: z.string() });
const RespuestaHola = z.object({ mensaje: z.string(), userId: z.string() });

const SIN_CONEXION = "sin conexion con el API";
const RESPUESTA_INESPERADA = "el API respondio algo que no entiendo";
// Los dos motivos por los que la base puede no contestar se dicen distinto, y
// no por prolijidad: el arreglo NO es el mismo. Si el API no contesta, lo que
// falta es `pnpm dev`; si el API contesta 503, el API esta vivo y lo que falta
// es la base, o sea Docker.
const BASE_SIN_API = "no se pudo preguntar (el API no responde)";
const BASE_CAIDA = "no responde";

/**
 * Las cabeceras con las que sale una peticion al API.
 *
 * Con token viaja el `Authorization: Bearer <token>` que exige requireAuth
 * (api/src/middleware/auth.ts); sin token sale limpia, que es el unico modo en
 * el que un endpoint protegido puede responder algo util: el bypass de
 * desarrollo del API (ALLOW_DEV_AUTH=true). LA CABECERA NO ES OPCIONAL en un
 * ambiente real — sin ella /api/hello responde 401 aunque la persona tenga
 * sesion, que es exactamente lo que hacia esta portada antes.
 */
function cabecerasDeAuth(token: string | null): Record<string, string> {
  return token === null ? {} : { Authorization: `Bearer ${token}` };
}

async function pedirJson(ruta: string, cabeceras: Record<string, string> = {}): Promise<unknown> {
  const respuesta = await fetch(`${API_URL}${ruta}`, { headers: cabeceras });
  // Un 401 o un 500 tambien son respuestas: sin este chequeo, `.json()` de un
  // cuerpo de error se cuela como si fuera el dato bueno.
  if (!respuesta.ok) throw new Error(`el API respondio ${respuesta.status}`);
  // `as unknown` y no `any`: obliga a que lo de abajo valide antes de leer.
  return (await respuesta.json()) as unknown;
}

/** El texto a mostrar del healthcheck. Nunca lanza: la interfaz siempre dice algo. */
async function leerSalud(): Promise<string> {
  let cuerpo: unknown;
  try {
    cuerpo = await pedirJson("/api/health");
  } catch {
    return SIN_CONEXION;
  }
  // safeParse y no parse: una respuesta con otra forma es un caso ESPERADO
  // —una version anterior del API todavia desplegada, o un proxy que devuelve
  // HTML—, no una excepcion. Se distingue de "no hay conexion" a proposito:
  // los dos fallos se arreglan en lugares distintos y el mensaje tiene que
  // decir cual es.
  const leido = RespuestaSalud.safeParse(cuerpo);
  return leido.success ? leido.data.estado : RESPUESTA_INESPERADA;
}

/** El texto a mostrar del chequeo de LA BASE. Nunca lanza.
 *
 *  POR QUE ES UNA SEGUNDA CONSULTA Y NO ALCANZA CON LA DE ARRIBA. `/api/health`
 *  NO TOCA LA BASE, y esta escrito a proposito en api/src/app.ts: si se mezclaran,
 *  una base lenta haria que el balanceador diera de baja tareas que estan sanas.
 *
 *  Pero esa separacion, que es correcta en produccion, dejaba a esta portada
 *  diciendo "API health: ok" con Postgres apagado. Y es EL caso de la primera
 *  corrida: quien acaba de armar el proyecto todavia no levanto Docker, ve un
 *  verde, y se va convencido de que anda. Un tablero que se pone verde sin haber
 *  mirado la pieza que mas se rompe es peor que no tener tablero.
 *
 *  `/api/db/health` contesta 200 con {db:"ok"} o 503, y el 503 no trae la causa a
 *  proposito: el endpoint es publico y el mensaje del driver nombra el host y el
 *  usuario de la base. Aca alcanza con distinguir los dos.
 */
async function leerSaludDeLaBase(): Promise<string> {
  let cuerpo: unknown;
  try {
    cuerpo = await pedirJson("/api/db/health");
  } catch (e) {
    // `pedirJson` lanza tanto si no hubo conexion como si hubo respuesta con
    // codigo de error. Son dos cosas distintas, se arreglan en lugares distintos,
    // y el texto del error es lo unico que las separa de este lado.
    return /respondio \d/.test(String(e)) ? BASE_CAIDA : BASE_SIN_API;
  }
  const leido = RespuestaSaludDeLaBase.safeParse(cuerpo);
  return leido.success ? leido.data.db : RESPUESTA_INESPERADA;
}

/**
 * El texto a mostrar de /api/hello (endpoint protegido). Nunca lanza.
 *
 * El token se pide JUSTO ANTES de llamar y no se guarda en el estado: vence, y
 * el proveedor lo renueva por su cuenta. `auth` puede ser null (proyecto sin
 * proveedor configurado) y entonces la peticion sale sin cabecera: la respuesta
 * util en ese caso la da el bypass de desarrollo del API, y si no esta puesto,
 * el 401 se muestra con el mensaje de abajo en vez de una pantalla en blanco.
 */
async function leerHola(auth: Autenticacion | null): Promise<string> {
  let cuerpo: unknown;
  try {
    // Dentro del try junto con la peticion: un rechazo del proveedor al pedir
    // el token es otra forma de "no se pudo llamar", y esta funcion no lanza.
    const token = (await auth?.token()) ?? null;
    cuerpo = await pedirJson("/api/hello", cabecerasDeAuth(token));
  } catch {
    return "no se pudo llamar /api/hello (revisa la sesion y que el API este arriba)";
  }
  const leido = RespuestaHola.safeParse(cuerpo);
  if (!leido.success) return RESPUESTA_INESPERADA;
  return `${leido.data.mensaje} (userId: ${leido.data.userId})`;
}

const ENLACE_ENVIADO = "Revisa tu correo: te enviamos un enlace de acceso.";
const ENLACE_FALLIDO = "No se pudo enviar el enlace de acceso.";

/**
 * El bloque de identidad de la portada. Sale a un componente propio porque
 * tiene los TRES estados que hay que poder ver por separado (sin proveedor, con
 * proveedor y sin sesion, con sesion) y porque asi App queda con una sola
 * responsabilidad de datos.
 */
function Identidad({ auth, sesion }: { auth: Autenticacion | null; sesion: Sesion | null }) {
  const [email, setEmail] = useState("");
  const [aviso, setAviso] = useState("");

  if (!auth) {
    return (
      <p className="text-xs text-neutral-500">
        Supabase no configurado (dev). Agrega VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY para
        activar auth.
      </p>
    );
  }

  // Copia en un `const` y no uso directo de la prop: TypeScript no conserva el
  // estrechamiento de un parametro DENTRO de una funcion anidada (el onClick, el
  // handler), asi que sin esto cada uso pediria un `!` o un `?.` — un `!` es una
  // afirmacion que el compilador no verifica, y justo aca no hace falta.
  const proveedor = auth;

  if (sesion) {
    return (
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-neutral-700">{sesion.email ?? sesion.userId}</span>
        <button
          onClick={() => void proveedor.salir()}
          className="px-4 py-2 rounded-lg bg-neutral-900 text-white text-sm"
        >
          Cerrar sesión
        </button>
      </div>
    );
  }

  async function enviarEnlace() {
    // El handler atrapa SIEMPRE: una promesa rechazada en un onClick no la ve
    // nadie, y el usuario se queda mirando un formulario que no dijo nada.
    try {
      await proveedor.ingresar(email);
      setAviso(ENLACE_ENVIADO);
    } catch {
      setAviso(ENLACE_FALLIDO);
    }
  }

  return (
    <div className="space-y-2">
      <label htmlFor="email-de-ingreso" className="block text-sm text-neutral-500">
        Correo
      </label>
      <input
        id="email-de-ingreso"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full px-3 py-2 rounded-lg border border-neutral-300 text-sm"
      />
      <button
        onClick={enviarEnlace}
        className="w-full px-4 py-2 rounded-lg bg-neutral-900 text-white text-sm"
      >
        Enviar enlace de acceso
      </button>
      {aviso && <p className="text-sm text-neutral-700">{aviso}</p>}
    </div>
  );
}

export default function App({ auth }: { auth: Autenticacion | null }) {
  const [salud, setSalud] = useState("...");
  const [base, setBase] = useState("...");
  const [hola, setHola] = useState("");
  const [sesion, setSesion] = useState<Sesion | null>(null);

  useEffect(() => {
    // `void` explicito: es un fire-and-forget intencional y leerSalud() no
    // lanza, asi que no hay rechazo que atrapar (no-floating-promises exige
    // que la intencion este escrita, no que se ignore).
    void leerSalud().then(setSalud);
    void leerSaludDeLaBase().then(setBase);
  }, []);

  useEffect(() => {
    if (!auth) return;
    // Las DOS cosas hacen falta: la sesion que YA existe (el navegador vuelve
    // con ella desde el almacenamiento) y las que vengan despues (el usuario
    // entra por el enlace del correo, o cierra sesion en otra pestana). Con
    // solo la primera, la portada se queda diciendo "sin sesion" para siempre.
    void auth.sesionActual().then(setSesion);
    return auth.alCambiar(setSesion);
  }, [auth]);

  async function llamarHola() {
    setHola(await leerHola(auth));
  }

  return (
    <main className="min-h-screen bg-neutral-50 text-neutral-900 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white border border-neutral-200 rounded-xl p-8 space-y-6">
        <header className="space-y-1">
          <p className="text-sm font-medium text-orange-600">{ORG_DEL_PROYECTO}</p>
          <h1 className="text-2xl font-semibold">{NOMBRE_DEL_PROYECTO}</h1>
          <p className="text-sm text-neutral-500">React + Node + Prisma + Supabase · hello world</p>
        </header>

        <div className="text-sm space-y-1">
          <div>
            <span className="text-neutral-500">API: </span>
            <span className="font-mono" aria-label="Estado del API">
              {salud}
            </span>
          </div>
          {/* LA BASE VA APARTE Y NO SUMADA A LA DE ARRIBA. Con un solo indicador,
              el "ok" del API tapaba una base apagada, que es el estado normal de
              la primera corrida. Y cuando esta caida dice QUE HACER: el mensaje
              generico obligaba a saber de antemano que la base vive en Docker. */}
          <div>
            <span className="text-neutral-500">Base de datos: </span>
            <span className="font-mono" aria-label="Estado de la base de datos">
              {base}
            </span>
          </div>
          {base === BASE_CAIDA && (
            <p className="text-xs text-neutral-500">
              El API responde pero la base no. Levantala con <code className="font-mono">docker compose up -d</code> y
              recarga esta pagina.
            </p>
          )}
        </div>

        <Identidad auth={auth} sesion={sesion} />

        <div className="space-y-2">
          {/* Texto OSCURO sobre el naranja de marca, no blanco: blanco sobre
              naranja da 2.9:1 y falla WCAG AA; el oscuro da 6.7:1. El linter
              del marco lo pone en rojo, y el codigo heredado lo tenia al
              reves. */}
          <button
            onClick={llamarHola}
            className="w-full px-4 py-2 rounded-lg bg-orange-600 text-neutral-900 text-sm hover:bg-orange-700"
          >
            Llamar /api/hello
          </button>
          {hola && <p className="text-sm text-neutral-700">{hola}</p>}
        </div>
      </div>
    </main>
  );
}
