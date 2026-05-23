// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EngineError } from "../EngineError";

describe("EngineError", () => {
  it("renders nothing when error is nullish", () => {
    const { container } = render(<EngineError error={null} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders a string error", () => {
    render(<EngineError error="Failed to load chart" />);
    expect(screen.getByRole("alert")).toHaveTextContent("Failed to load chart");
  });

  it("extracts message from an Error instance", () => {
    render(<EngineError error={new Error("Server unavailable")} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Server unavailable");
  });

  it("uses the danger tone by default", () => {
    render(<EngineError error="boom" />);
    expect(screen.getByRole("alert").className).toMatch(/\bdanger\b/);
  });

  it("uses the warn tone when tone='warning'", () => {
    render(<EngineError error="soft" tone="warning" />);
    const alert = screen.getByRole("alert");
    expect(alert.className).toMatch(/\bwarn\b/);
    expect(alert.className).not.toMatch(/\bdanger\b/);
  });

  it("does not render Retry when onRetry is absent", () => {
    render(<EngineError error="oops" />);
    expect(screen.queryByRole("button", { name: /retry/i })).toBeNull();
  });

  it("invokes onRetry when the button is clicked", async () => {
    const onRetry = vi.fn();
    render(<EngineError error="oops" onRetry={onRetry} />);
    await userEvent.click(screen.getByRole("button", { name: /retry/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
