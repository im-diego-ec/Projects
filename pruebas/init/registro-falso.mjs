// UN REGISTRO DE NPM DE MENTIRA, EN LOCALHOST.
//
// POR QUE EXISTE. Las dos herramientas que le hablan al registro tienen ramas que
// solo se recorren cuando el otro lado se porta mal: contesta 404, contesta 200
// con un JSON que no trae `latest`, acepta la conexion y se queda callado, o no
// esta. Contra el registro publico ninguna de esas ramas se puede provocar, asi
// que sin esto serian codigo que nadie ejecuto nunca — y la regla del marco es
// que una guarda que nadie vio fallar no es una guarda.
//
// Y el otro motivo, igual de concreto: un banco que sale a internet es un banco
// que se pone rojo cuando falla la red de otro. Estos casos corren en un runner
// y en la maquina de quien contribuye; ninguno de los dos deberia necesitar
// salida a internet para decidir si un `if` esta bien escrito.
//
// COMO SE APUNTA LA HERRAMIENTA ACA: por la variable de entorno que el propio
// modulo del registro declara (PROJECTS_REGISTRO_NPM). No es un gancho de
// pruebas: es la misma variable con la que una organizacion apunta el marco a su
// espejo interno.
import http from "node:http";

/** Levanta el registro y devuelve como hablarle, que le preguntaron y como
 *  apagarlo.
 *
 *  `tags`  — mapa nombre de paquete -> lo que contesta /-/package/<n>/dist-tags.
 *            Un valor de texto es el `latest`; un objeto se devuelve tal cual
 *            (para poder contestar un documento SIN `latest`); el numero 404
 *            hace que ese paquete no exista.
 *  `ping`  — el codigo con el que contesta /-/ping. 0 significa "acepta la
 *            conexion y no contesta nunca", que es el caso del proxy colgado.
 *  `mudo`  — lo mismo para TODAS las rutas.
 */
export function levantarRegistro({ tags = {}, ping = 200, mudo = false } = {}) {
  const pedidos = [];
  const servidor = http.createServer((req, res) => {
    pedidos.push(req.url);
    if (mudo) return; // Ni responde ni cierra: el socket queda abierto.
    if (req.url === "/-/ping") {
      if (ping === 0) return;
      res.writeHead(ping, { "content-type": "application/json" });
      res.end("{}");
      return;
    }
    const m = /^\/-\/package\/(.+)\/dist-tags$/.exec(req.url);
    if (m) {
      const nombre = decodeURIComponent(m[1]);
      const valor = tags[nombre];
      if (valor === undefined || valor === 404) {
        res.writeHead(404, { "content-type": "application/json" });
        res.end(JSON.stringify({ error: "Not found" }));
        return;
      }
      if (valor === "no-json") {
        res.writeHead(200, { "content-type": "application/json" });
        res.end("esto no es json");
        return;
      }
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify(typeof valor === "string" ? { latest: valor } : valor));
      return;
    }
    res.writeHead(404);
    res.end("{}");
  });
  return new Promise((resolve) => {
    // 127.0.0.1 y no "localhost": en una maquina donde localhost resuelve a ::1
    // antes que a 127.0.0.1, la URL que se arma abajo apuntaria a otra cosa.
    servidor.listen(0, "127.0.0.1", () => {
      const { port } = servidor.address();
      resolve({
        url: `http://127.0.0.1:${port}`,
        pedidos,
        cerrar: () =>
          new Promise((listo) => {
            // `closeAllConnections` hace que el caso del servidor MUDO pueda
            // apagarse: si no, el socket que quedo abierto a proposito mantiene
            // vivo el proceso del banco hasta el timeout del runner.
            servidor.closeAllConnections?.();
            servidor.close(() => listo());
          }),
      });
    });
  });
}
