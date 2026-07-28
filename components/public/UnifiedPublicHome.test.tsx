// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { UnifiedPublicHome } from "./UnifiedPublicHome";

describe("UnifiedPublicHome", () => {
  beforeEach(() => {
    const values = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      clear: () => values.clear(),
      getItem: (key: string) => values.get(key) ?? null,
      key: (index: number) => [...values.keys()][index] ?? null,
      get length() {
        return values.size;
      },
      removeItem: (key: string) => values.delete(key),
      setItem: (key: string, value: string) => values.set(key, value),
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(() => new Promise<Response>(() => undefined)),
    );
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("leads with daily Moon-sign guidance and keeps all signs available", () => {
    render(<UnifiedPublicHome />);

    expect(
      screen.getByRole("heading", { name: /your moon sign, today/i }),
    ).toBeInTheDocument();

    const signPicker = screen.getByRole("group", {
      name: "Choose your Moon sign",
    });
    expect(within(signPicker).getAllByRole("button")).toHaveLength(12);
    expect(
      within(signPicker).getByRole("button", { name: /mesha/i }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("shows every supported public occasion before profile validation", () => {
    render(<UnifiedPublicHome />);

    expect(screen.getByRole("button", { name: "Wedding" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Gruhapravesha" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Surgery" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /add your birth profile/i }),
    ).toHaveAttribute("href", "/auth/signin");
  });

  it("opens the day context controls and guides Muhurtam in real steps", () => {
    render(<UnifiedPublicHome />);

    const dayContext = document.getElementById("daily-settings");
    expect(dayContext).not.toBeNull();
    const context = within(dayContext as HTMLElement);
    expect(
      context.queryByRole("combobox", { name: "Location" }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /edit day settings/i }));
    expect(
      context.getByRole("combobox", { name: "Location" }),
    ).toBeInTheDocument();

    expect(
      screen.queryByRole("button", { name: /show general timings/i }),
    ).not.toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: /choose place and dates/i }),
    );
    expect(screen.getByLabelText("Starting date")).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: /continue to people/i }),
    );
    expect(
      screen.getByRole("link", { name: /sign in to add people/i }),
    ).toHaveAttribute("href", "/auth/signin");
    expect(
      screen.getByRole("button", { name: /show general timings/i }),
    ).toBeInTheDocument();
  });

  it("explains calendar continuity and keeps developer tooling secondary", () => {
    render(<UnifiedPublicHome />);

    expect(
      screen.getByRole("heading", {
        name: "Carry the Panchangam in your calendar",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("No account required"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", {
        name: "mcp-server-panchangam on PyPI",
      }),
    ).toHaveAttribute("href", "https://pypi.org/project/mcp-server-panchangam/");
  });

  it("keeps the complete calendar subscription journey on this page", async () => {
    render(<UnifiedPublicHome />);

    const heading = screen.getByRole("heading", {
      name: "Carry the Panchangam in your calendar",
    });
    const calendarSection = heading.closest("section");
    expect(calendarSection).not.toBeNull();
    const calendar = within(calendarSection as HTMLElement);

    fireEvent.change(calendar.getByRole("combobox", { name: "Location" }), {
      target: { value: "London" },
    });
    fireEvent.change(
      calendar.getByRole("combobox", { name: "Calculation system" }),
      { target: { value: "vakya" } },
    );
    fireEvent.click(calendar.getByLabelText(/Tithi observances/i));

    const subscriptionUrl = calendar.getByLabelText(
      /copy this subscription URL/i,
    );
    expect(subscriptionUrl).toHaveValue(
      "https://panchangam.astrochaganti.com/feeds/london-vakya-observances.ics",
    );
    expect(
      calendar.queryByRole("link", { name: /choose a calendar feed/i }),
    ).not.toBeInTheDocument();

    fireEvent.click(calendar.getByRole("button", { name: "Copy URL" }));
    await waitFor(() =>
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        "https://panchangam.astrochaganti.com/feeds/london-vakya-observances.ics",
      ),
    );

    fireEvent.click(
      calendar.getByRole("tab", { name: "Apple Calendar" }),
    );
    expect(
      calendar.getByText(/File → New Calendar Subscription/i),
    ).toBeInTheDocument();
  });
});
