import type { NextFunction, Request, RequestHandler, Response } from "express";

/**
 * Envuelve un handler async para Express 4.
 *
 * NO es azucar: un handler `async` devuelve una Promise donde Express espera
 * void (regla no-misused-promises) y, ante un rechazo, Express 4 NO lo reenvia
 * al manejador de errores. Sin este wrapper, UNA request con un error async
 * termina en unhandledRejection — y el default de Node es matar el proceso, o
 * sea tumbar la tarea entera por un fallo de un solo usuario.
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
): RequestHandler {
  return (req, res, next) => {
    void fn(req, res, next).catch(next);
  };
}
