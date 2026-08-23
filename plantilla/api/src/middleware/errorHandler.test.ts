import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import type { Request, Response } from "express";
import request from "supertest";
import { asyncHandler } from "../lib/asyncHandler.js";
import { errorHandler } from "./errorHandler.js";
import { requestId } from "./requestId.js";

describe("errorHandler", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("un error async termina en 500 con requestId, no en la pagina HTML de Express", async () => {
    const app = express();
    app.use(requestId);
    app.get(
      "/boom",
      asyncHandler(() => Promise.reject(new Error("boom")))
    );
    app.use(errorHandler);

    const res = await request(app).get("/boom").set("x-amzn-trace-id", "Root=1-xyz");
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: "Error interno", requestId: "Root=1-xyz" });
    // El detalle queda en el log, no en la respuesta: el cliente no recibe stacks.
    expect(res.text).not.toContain("boom");
    const registro = JSON.parse(
      (console.error as unknown as { mock: { calls: string[][] } }).mock.calls[0][0]
    );
    expect(registro.nivel).toBe("error");
    expect(registro.error.mensaje).toBe("boom");
    expect(registro.requestId).toBe("Root=1-xyz");
  });

  it("si la respuesta ya salio, no intenta escribir de nuevo", () => {
    const res = { headersSent: true, status: vi.fn(), json: vi.fn() } as unknown as Response;
    errorHandler(new Error("tarde"), { originalUrl: "/x" } as Request, res, vi.fn());
    expect(res.status).not.toHaveBeenCalled();
  });
});
