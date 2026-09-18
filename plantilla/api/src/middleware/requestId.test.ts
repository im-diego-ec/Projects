import { describe, expect, it } from "vitest";
import express from "express";
import request from "supertest";
import { contextoLog } from "../lib/log.js";
import { requestId } from "./requestId.js";

/**
 * Las TRES cosas que el middleware promete se prueban por separado a proposito:
 * si una sola se rompe, el nombre del caso que falla dice cual, sin leer el diff.
 *
 * Hasta que llego esta prueba, el middleware solo se ejercia DE REBOTE —desde
 * app.test.ts y como utileria de errorHandler.test.ts—, y el primer cambio que
 * moviera esas pruebas lo dejaba sin nadie que lo mirara.
 *
 * La tercera promesa —el contexto de AsyncLocalStorage— es la que un test
 * descuidado deja pasar: `contextoLog.run(..., next)` puede llamarse y aun asi
 * no llevar el id si el handler corre fuera del contexto. Por eso el caso lo lee
 * DESDE el handler, que es donde importa, y no desde el middleware.
 */
describe("requestId", () => {
  const app = () => {
    const a = express();
    a.use(requestId);
    a.get("/eco", (req, res) => {
      res.json({
        enLaRequest: req.requestId,
        enElContexto: contextoLog.getStore()?.requestId ?? null,
      });
    });
    return a;
  };

  it("aprovecha el trace id del balanceador en vez de inventar otro", async () => {
    const res = await request(app()).get("/eco").set("x-amzn-trace-id", "Root=1-abc");

    expect(res.body.enLaRequest).toBe("Root=1-abc");
  });

  it("devuelve el id en X-Request-Id para que el frontend lo adjunte a sus reportes", async () => {
    const res = await request(app()).get("/eco").set("x-amzn-trace-id", "Root=1-abc");

    expect(res.headers["x-request-id"]).toBe("Root=1-abc");
  });

  it("el id llega al contexto de log, que es lo que hace que toda linea lo lleve", async () => {
    const res = await request(app()).get("/eco").set("x-amzn-trace-id", "Root=1-abc");

    expect(res.body.enElContexto).toBe("Root=1-abc");
  });

  it("sin balanceador —dev local, o una plataforma sin ALB— ninguna request queda anonima", async () => {
    const res = await request(app()).get("/eco");

    // El prefijo importa: distingue de un vistazo el id generado aca del que
    // vino del balanceador, y por eso se afirma el prefijo y no solo que haya algo.
    expect(res.body.enLaRequest).toMatch(/^local-/);
    expect(res.headers["x-request-id"]).toBe(res.body.enLaRequest);
    expect(res.body.enElContexto).toBe(res.body.enLaRequest);
  });

  it("dos requests sin balanceador NO comparten id", async () => {
    // El control del caso anterior: un `local-` constante lo pasaria igual y
    // dejaria toda la observabilidad de dev colapsada en un solo id.
    const a = await request(app()).get("/eco");
    const b = await request(app()).get("/eco");

    expect(a.body.enLaRequest).not.toBe(b.body.enLaRequest);
  });
});
