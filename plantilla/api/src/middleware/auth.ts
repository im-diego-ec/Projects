import type { Request, RequestHandler } from "express";
import { verifyToken } from "@clerk/backend";
import { asyncHandler } from "../lib/asyncHandler.js";
import { log } from "../lib/log.js";

/**
 * Autorizacion: el backend es la autoridad. El token se verifica OFFLINE
 * (firma contra CLERK_JWT_KEY, sin red y sin cookies) y la identidad sale
 * SIEMPRE de los claims firmados, jamas del body ni de un header que el
 * cliente controle.
 *
 * Se usa @clerk/backend y no @clerk/express a proposito: este API es puro
 * (SPA en otro origen, token siempre por header Authorization). El
 * clerkMiddleware de @clerk/express agrega ademas su propio "handshake"
 * pensado para sesiones por cookie del mismo dominio, y cuando no encuentra
 * token ese handshake lanza sin capturar — un 500 donde correspondia un 401.
 * Le paso en el proyecto de referencia; el andamio no lo hereda.
 */

/** Se leen en cada llamada, no como const de import: los tests las alternan. */
export function clerkConfigurado(env: NodeJS.ProcessEnv = process.env): boolean {
  return Boolean(env.CLERK_SECRET_KEY);
}

/**
 * El bypass de desarrollo exige el opt-in EXPLICITO ALLOW_DEV_AUTH=true.
 * Nunca se activa "porque falta CLERK_SECRET_KEY", y menos por NODE_ENV: ese
 * fue el bug critico del proyecto de referencia — NODE_ENV no se seteaba en
 * produccion, el guard quedaba muerto y el API aceptaba identidades del
 * cliente. Una condicion de seguridad no depende de una variable que puede
 * faltar.
 */
export function devAuthPermitido(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.ALLOW_DEV_AUTH === "true";
}

/**
 * Fail-closed: sin Clerk y sin el opt-in de dev, el API esta en configuracion
 * insegura. server.ts lo consulta para NEGARSE a arrancar, en vez de servir
 * peticiones sin verificar a nadie.
 */
export function authConfigInsegura(env: NodeJS.ProcessEnv = process.env): boolean {
  return !clerkConfigurado(env) && !devAuthPermitido(env);
}

/**
 * La clave publica llega por variable de entorno con "\n" LITERALES: ninguna
 * plataforma cloud acepta saltos de linea reales ahi. Sin esta conversion el
 * PEM es invalido y toda verificacion falla con un error que no dice por que.
 */
export function clavePublica(env: NodeJS.ProcessEnv = process.env): string | undefined {
  return env.CLERK_JWT_KEY?.replace(/\\n/g, "\n");
}

function tokenBearer(req: Request): string | null {
  const header = req.header("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice("Bearer ".length);
}

/** Exige un usuario autenticado. Sin claim valido: 401, sin excepciones. */
export const requireAuth: RequestHandler = asyncHandler(async (req, res, next) => {
  if (clerkConfigurado()) {
    const token = tokenBearer(req);
    if (token) {
      try {
        // verifyToken LANZA ante cualquier token invalido (no devuelve un
        // resultado que se pueda ignorar). El try/catch no es opcional: este
        // handler es async y un rechazo suelto en Express 4 no llega a ningun
        // lado.
        const payload = await verifyToken(token, { jwtKey: clavePublica() });
        // Los claims custom no estan en el tipo de verifyToken: vista
        // estructural en vez de `any`, y el typeof sigue siendo el guard real.
        const claims = payload as { email?: unknown; name?: unknown };
        if (typeof payload.sub === "string" && payload.sub) {
          req.auth = {
            userId: payload.sub,
            email: typeof claims.email === "string" ? claims.email : undefined,
            name: typeof claims.name === "string" ? claims.name : undefined,
          };
          next();
          return;
        }
      } catch (err) {
        // Auth fallida es RUTINA (un token vencido no es una falla del
        // sistema): warn, no error — la semantica de niveles la leen las
        // alarmas.
        log.warn("token rechazado", { error: err });
      }
    }
    res.status(401).json({ error: "No autenticado" });
    return;
  }

  if (devAuthPermitido()) {
    // Solo con el opt-in explicito, y jamas en produccion: el id lo puede
    // elegir quien llama, que es exactamente por que esto no puede existir
    // fuera de una maquina de desarrollo.
    req.auth = { userId: req.header("x-dev-user-id") ?? "dev-user" };
    next();
    return;
  }

  log.warn("peticion rechazada: el API corre sin Clerk y sin ALLOW_DEV_AUTH");
  res.status(401).json({ error: "No autenticado" });
});
