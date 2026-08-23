import { describe, expect, it, vi } from "vitest";
import type { Request, Response } from "express";
import { asyncHandler } from "./asyncHandler.js";

const req = {} as Request;
const res = {} as Response;

describe("asyncHandler", () => {
  it("deja pasar el camino feliz sin devolver una promesa a Express", () => {
    const fn = vi.fn(async () => {});
    const resultado = asyncHandler(fn)(req, res, vi.fn());
    expect(resultado).toBeUndefined();
    expect(fn).toHaveBeenCalledOnce();
  });

  it("manda el rechazo a next(err) en vez de dejarlo suelto", async () => {
    // Sin esto el rechazo termina en unhandledRejection y el default de Node es
    // matar el proceso: un usuario con un error async tumba la tarea entera.
    const boom = new Error("boom");
    const next = vi.fn();
    asyncHandler(() => Promise.reject(boom))(req, res, next);
    await vi.waitFor(() => expect(next).toHaveBeenCalledWith(boom));
  });
});
