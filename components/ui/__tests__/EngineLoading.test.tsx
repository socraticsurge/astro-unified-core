// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { EngineLoading } from "../EngineLoading";

describe("EngineLoading", () => {
  it("renders the default message and spinner", () => {
    render(<EngineLoading />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading…");
  });

  it("renders a custom message", () => {
    render(<EngineLoading message="Calculating Tarabalam…" />);
    expect(screen.getByRole("status")).toHaveTextContent("Calculating Tarabalam…");
  });

  it("wraps in a card when variant is 'card'", () => {
    render(<EngineLoading variant="card" />);
    const root = screen.getByRole("status");
    expect(root.className).toMatch(/ac-card/);
    expect(root.className).toMatch(/ac-card-pad/);
  });

  it("omits the card wrapper for inline variant", () => {
    render(<EngineLoading variant="inline" />);
    const root = screen.getByRole("status");
    expect(root.className).not.toMatch(/ac-card/);
  });
});
