import express from "express";
import cors from "cors";
import { asyncHandler } from "./lib/asyncHandler.js";
import { getPrisma } from "./lib/prisma.js";
import { requireAuth } from "./middleware/auth.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { requestId } from "./middleware/requestId.js";

/**
 * La app de Express, SIN escuchar en ningun puerto: por eso las pruebas la
 * crean y la ejercitan sin levantar un servidor de verdad. El arranque
 * (puerto, senales, fail-closed de auth) vive en server.ts.
 *
 * El orden de los middlewares no es decorativo: requestId primero, para que
 * toda linea de log de la request lo lleve; errorHandler ultimo, porque
 * Express solo lo alcanza al final de la cadena.
 */
export function createApp() {
  const app = express();

  app.use(requestId);
  app.use(cors({ origin: process.env.WEB_ORIGIN ?? "http://localhost:5173" }));
  app.use(express.json());

  // Publico: no toca base ni auth. Es lo que mira el health check del
  // balanceador, asi que tiene que seguir respondiendo cuando la base no esta.
  app.get("/api/health", (_req, res) => {
    res.json({ estado: "ok", servicio: "{{PROYECTO}}-api", ts: new Date().toISOString() });
  });

  // Protegido: la identidad sale de los claims firmados del token, nunca del
  // body ni de un header que el cliente controle.
  app.get("/api/hello", requireAuth, (req, res) => {
    res.json({ mensaje: "Hola desde el API", userId: req.auth?.userId });
  });

  // Chequeo de la base, SEPARADO de /api/health: si se mezclaran, una base
  // lenta haria que el balanceador diera de baja tareas que estan sanas.
  app.get(
    "/api/db/health",
    asyncHandler(async (_req, res) => {
      try {
        const prisma = await getPrisma();
        await prisma.$queryRaw`SELECT 1`;
        res.json({ db: "ok" });
      } catch (err) {
        res.status(503).json({
          db: "no disponible",
          detalle: err instanceof Error ? err.message : String(err),
        });
      }
    })
  );

  app.use(errorHandler);

  return app;
}
