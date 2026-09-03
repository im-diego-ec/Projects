#!/usr/bin/env node
// ---------------------------------------------------------------------------
// LA PUERTA WEB: DE UN FORMULARIO DE GITHUB A UN ARCHIVO DE VALORES.
//
// QUE RESUELVE. El marco tiene dos entradas y las dos EXIGEN UNA TERMINAL: el
// asistente (que aborta si stdin no es una terminal) y `--valores` (que exige
// escribir un JSON de 25 claves a mano). Medido en la auditoria de autonomia:
// alguien que no abre una terminal no llega ni al Paso 0.
//
// ESTE ARCHIVO ES LA TERCERA ENTRADA, y no es un segundo motor: traduce las
// respuestas de un formulario web al MISMO objeto `respuestas` que produce el
// asistente, y despues llama a las MISMAS dos funciones --`derivar` y
// `desvios`--. Si el asistente cambia una derivacion, la puerta la hereda sin
// que nadie se acuerde de nada.
//
//   formulario -> respuestas -> derivar()  -> valores.json
//                            -> desvios()  -> desvios.json
//
// POR QUE UN FORMULARIO DE `workflow_dispatch` Y NO UNA WEB PROPIA. Una web
// propia necesita hosting y una identidad OAuth para crear el repositorio en la
// cuenta de la persona: eso es un producto, no una mejora. GitHub renderiza los
// `inputs` de un `workflow_dispatch` como formulario, y el runner corre con el
// token del propio repositorio. Cero infraestructura nuestra, cero credenciales
// nuevas.
//
// EL LIMITE QUE IMPONE, y por eso el formulario es corto: `workflow_dispatch`
// admite hasta DIEZ inputs. El asistente hace hasta diecisiete preguntas. Las
// que no entran no se inventan: se DERIVAN de lo que GitHub ya sabe (el nombre
// del repositorio y su dueno) o quedan en el relleno declarado que el propio
// asistente usa, con su desvio escrito al lado.
// ---------------------------------------------------------------------------

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { derivar, desvios } from "./projects-asistente.mjs";
import { invocadoDirecto } from "./projects-init.mjs";

/** La cuenta que publica el marco. Se usa SOLO para ORG_MARCO --que es un valor
 *  del proyecto, no una identidad de este repositorio-- y nunca para decidir
 *  "este es el marco": para eso esta `esElTemplate`, abajo. */
export const CUENTA_DEL_MARCO = "im-diego-ec";

/** "Este repositorio es el marco?" — resuelto por `is_template` y NO por el
 *  nombre de la cuenta.
 *
 *  POR QUE NO EL LITERAL, y lo cazo el propio banco de higiene del marco: un
 *  literal `im-diego-ec/Projects` deja de coincidir en cuanto el arbol se copia a
 *  otra cuenta --que es EXACTAMENTE lo que hace "Use this template"-- y ahi el
 *  marco deja de reconocerse a si mismo. Alguien que clone el marco a su cuenta
 *  para trabajarlo tendria la puerta armada y sin guarda: correrla borraria su
 *  copia entera.
 *
 *  `is_template` si distingue, y no depende de ninguna cuenta: el repositorio del
 *  marco es un template; una copia hecha con "Use this template" nace con
 *  `false`. GitHub lo pone en el evento, asi que el workflow lo pasa por env.
 *
 *  Si alguien marca SU copia como template, la puerta se niega. Es un fallo
 *  seguro y con motivo claro, que es lo que corresponde cuando la duda es entre
 *  no armar un proyecto y borrar un repositorio. */
export function esElTemplate(entorno = process.env) {
  return String(entorno.ES_TEMPLATE ?? "").toLowerCase() === "true";
}

/** Lo que el formulario pregunta, con lo que significa cada valor.
 *
 *  SON CINCO Y NO DIECISIETE a proposito. Las otras doce preguntas del asistente
 *  o las contesta GitHub (nombre del repo, dueno) o tienen un relleno declarado
 *  con su desvio. Preguntar algo cuya respuesta no cambia nada le cobra esfuerzo
 *  a la persona y no le devuelve nada. */
export const CAMPOS = ["forma", "plataforma", "equipo", "companero", "dominio"];

/** Traduce lo que llega del formulario al objeto `respuestas` del asistente.
 *
 *  `repo` llega como "duenio/nombre", que es el formato de `github.repository`.
 *  De ahi salen PROYECTO y ORG sin preguntarlos: GitHub ya los sabe, y
 *  preguntarle a alguien el nombre del repositorio en el que ya esta parado es
 *  pedirle que copie un dato de la barra de direcciones. */
export function respuestasDelFormulario(entrada, repo) {
  const [duenio, nombre] = String(repo ?? "").split("/");
  if (!duenio || !nombre) throw new Error(`no pude leer el repositorio de "${repo}": se esperaba duenio/nombre`);

  const equipo = entrada.equipo === "equipo" ? "equipo" : "solo";
  const companero = (entrada.companero ?? "").trim();
  const dominio = (entrada.dominio ?? "").trim();

  const r = {
    PROYECTO: nombre.toLowerCase(),
    ORG: duenio,
    forma: entrada.forma === "sitio" ? "sitio" : "aplicacion",
    plataforma: entrada.plataforma === "ninguna" ? "ninguna" : "supabase",
    equipo,
    // Trabajando solo, la otra persona es la misma: es lo que hace el asistente.
    BUILDER_2: equipo === "equipo" ? companero : duenio,
    ambientes: "una",
    dominio_propio: dominio ? "si" : "no",
    avisos: "github",
  };
  if (dominio) r.DOMINIO = dominio;
  return r;
}

/** Lo que falta comprobar ANTES de escribir nada. Devuelve la lista de
 *  problemas, vacia si esta todo bien. */
export function problemas(entrada, repo) {
  const p = [];
  if (esElTemplate()) {
    p.push(
      `esto se corrio en ${repo}, que es un repositorio TEMPLATE. ` +
        "Armar un proyecto aca adentro borraria el repositorio entero: el paso de reemplazo vacia la raiz. " +
        'Lo que corresponde es apretar "Use this template" arriba, y correr esto en la copia.',
    );
  }
  if (entrada.equipo === "equipo" && !(entrada.companero ?? "").trim()) {
    p.push('elegiste "en equipo" y no pusiste el usuario de la otra persona: sin eso no se puede armar CODEOWNERS');
  }
  const dominio = (entrada.dominio ?? "").trim();
  if (dominio && !/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/i.test(dominio)) {
    p.push(`"${dominio}" no tiene forma de dominio. Se escribe como miproyecto.com, sin http:// y sin barra al final`);
  }
  return p;
}

/** Escribe los dos archivos que el paso siguiente lee. Devuelve lo escrito. */
export function escribir(destino, entrada, repo) {
  const r = respuestasDelFormulario(entrada, repo);
  // ORG_MARCO NO SALE DE `derivar`, y por un motivo que no aplica aca: el
  // asistente lo deduce del remoto del clon (`git remote get-url origin`),
  // porque quien corre el asistente esta PARADO en el clon del marco. Por la
  // puerta no: el runner esta parado en la COPIA del template, cuyo remoto es el
  // repositorio de la persona. Preguntarle el remoto a esa copia devolveria la
  // cuenta de ella, y el proyecto nacería consumiendo workflows de un repositorio
  // que no existe --que es exactamente el defecto que ORG_MARCO vino a cerrar--.
  //
  // Acá se sabe por otro lado y sin adivinar: es la cuenta que publica el marco.
  const valores = { ...derivar(r), ORG_MARCO: CUENTA_DEL_MARCO };
  const apartamientos = desvios(r);
  fs.mkdirSync(destino, { recursive: true });
  const rutaValores = path.join(destino, "valores.json");
  const rutaDesvios = path.join(destino, "desvios.json");
  fs.writeFileSync(rutaValores, `${JSON.stringify(valores, null, 2)}\n`);
  fs.writeFileSync(rutaDesvios, `${JSON.stringify({ desvios: apartamientos }, null, 2)}\n`);
  return { respuestas: r, valores, desvios: apartamientos, rutaValores, rutaDesvios };
}

export function main() {
  const entrada = Object.fromEntries(CAMPOS.map((c) => [c, process.env[`ENTRADA_${c.toUpperCase()}`] ?? ""]));
  const repo = process.env.GITHUB_REPOSITORY ?? "";
  const destino = process.argv[2] || ".";

  const malos = problemas(entrada, repo);
  if (malos.length) {
    console.error("::error::no se armo nada, y estos son los motivos:");
    for (const m of malos) console.error(`  - ${m}`);
    return 1;
  }

  const hecho = escribir(destino, entrada, repo);
  process.stdout.write(`Escrito: ${hecho.rutaValores}\n`);
  process.stdout.write(`Escrito: ${hecho.rutaDesvios}  (${hecho.desvios.length} desvio(s) declarado(s))\n`);
  process.stdout.write("\nEsto es lo que se va a armar:\n");
  process.stdout.write(`  proyecto      ${hecho.valores.PROYECTO}\n`);
  process.stdout.write(`  cuenta        ${hecho.valores.ORG}\n`);
  process.stdout.write(`  forma         ${hecho.respuestas.forma === "sitio" ? "un sitio para leer" : "una aplicación"}\n`);
  process.stdout.write(`  dónde vive    ${hecho.respuestas.plataforma}\n`);
  process.stdout.write(`  dirección     ${hecho.valores.DOMINIO_PROD}\n`);
  return 0;
}

// `invocadoDirecto` y no la comparacion ingenua con `argv[1]`: esa falla
// siempre en Windows y en macOS cuando la ruta pasa por un enlace simbolico, y
// falla saliendo 0 sin imprimir nada. Ver su comentario en projects-init.
if (invocadoDirecto(import.meta.url)) process.exit(main());
