import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { STRAND_TAG, STRANDS } from "../../state/strands";
import { Tag } from "./Tag";

afterEach(cleanup);

describe("etiqueta de hebra", () => {
  it("muestra el nombre corto de la hebra", () => {
    render(<Tag strand="foco" />);
    expect(screen.getByText("Estudiar").getAttribute("data-strand")).toBe("foco");
  });
  it("las cuatro hebras tienen nombre distinto", () => {
    expect(new Set(STRANDS.map((s) => STRAND_TAG[s])).size).toBe(4);
  });
});
