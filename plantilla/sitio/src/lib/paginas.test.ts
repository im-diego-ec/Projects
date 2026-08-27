import { describe, it, expect } from "vitest";
import { masNuevasPrimero } from "./paginas";

describe("masNuevasPrimero", () => {
  it("ordena de la mas nueva a la mas vieja", () => {
    const entradas = [
      { titulo: "vieja", fecha: "2026-01-01" },
      { titulo: "nueva", fecha: "2026-08-01" },
      { titulo: "media", fecha: "2026-04-01" },
    ];
    expect(masNuevasPrimero(entradas).map((e) => e.titulo)).toEqual(["nueva", "media", "vieja"]);
  });

  it("no modifica el arreglo que recibe", () => {
    const entradas = [
      { titulo: "a", fecha: "2026-01-01" },
      { titulo: "b", fecha: "2026-08-01" },
    ];
    masNuevasPrimero(entradas);
    expect(entradas[0].titulo).toBe("a");
  });
});
