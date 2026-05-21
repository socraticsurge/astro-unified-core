// @vitest-environment jsdom
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider, toast, useToast } from "../Toast";

function Trigger({ message, kind }: { message: string; kind?: "success" | "error" | "info" }) {
  return (
    <button type="button" onClick={() => toast(message, kind)}>
      Fire
    </button>
  );
}

describe("ToastProvider + toast()", () => {
  it("renders a toast after toast() is called", async () => {
    render(
      <ToastProvider>
        <Trigger message="Hello" kind="success" />
      </ToastProvider>
    );
    await userEvent.click(screen.getByRole("button", { name: "Fire" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Hello");
  });

  it("auto-dismisses after the configured duration", async () => {
    vi.useFakeTimers();
    try {
      render(
        <ToastProvider>
          <Trigger message="Bye" />
        </ToastProvider>
      );
      // userEvent doesn't play well with fake timers — fire the toast directly.
      act(() => { toast("Bye", "info"); });
      expect(screen.getByRole("status")).toHaveTextContent("Bye");
      act(() => { vi.advanceTimersByTime(3500); });
      expect(screen.queryByRole("status")).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it("does not auto-dismiss when duration is 0", () => {
    vi.useFakeTimers();
    try {
      render(<ToastProvider><div /></ToastProvider>);
      act(() => { toast("Persistent", "info", { duration: 0 }); });
      act(() => { vi.advanceTimersByTime(10_000); });
      expect(screen.getByRole("status")).toHaveTextContent("Persistent");
    } finally {
      vi.useRealTimers();
    }
  });

  it("can dismiss a toast via the X button", async () => {
    render(<ToastProvider><div /></ToastProvider>);
    act(() => { toast("Dismiss me", "info", { duration: 0 }); });
    expect(screen.getByRole("status")).toBeDefined();
    await userEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("supports the useToast hook", async () => {
    function HookTrigger() {
      const { toast } = useToast();
      return <button type="button" onClick={() => toast("From hook", "success")}>Hook</button>;
    }
    render(<ToastProvider><HookTrigger /></ToastProvider>);
    await userEvent.click(screen.getByRole("button", { name: "Hook" }));
    expect(await screen.findByRole("status")).toHaveTextContent("From hook");
  });

  it("stacks multiple toasts", () => {
    render(<ToastProvider><div /></ToastProvider>);
    act(() => {
      toast("First", "info", { duration: 0 });
      toast("Second", "success", { duration: 0 });
    });
    const items = screen.getAllByRole("status");
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent("First");
    expect(items[1]).toHaveTextContent("Second");
  });
});
