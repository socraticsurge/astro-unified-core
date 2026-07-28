// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SettingsTab } from "./SettingsTab";

const appSettings = {
  written_consultation_enabled: true,
  live_consultation_enabled: false,
  written_fee_paise: 120000,
  live_fee_paise: 500000,
};

describe("SettingsTab consultation availability", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("exposes named switch state to assistive technology", () => {
    render(<SettingsTab appSettings={appSettings} initialSlots={[]} />);

    expect(screen.getByRole("switch", { name: "Written Response" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expect(screen.getByRole("switch", { name: "Live Session" })).toHaveAttribute(
      "aria-checked",
      "false",
    );
  });

  it("keeps the previous state and reports an API failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ error: "Database unavailable" }),
      }),
    );
    const user = userEvent.setup();
    render(<SettingsTab appSettings={appSettings} initialSlots={[]} />);

    const writtenSwitch = screen.getByRole("switch", { name: "Written Response" });
    await user.click(writtenSwitch);

    expect(writtenSwitch).toHaveAttribute("aria-checked", "true");
    expect(await screen.findByRole("alert")).toHaveTextContent("Database unavailable");
  });

  it("updates the switch only after the API confirms success", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      }),
    );
    const user = userEvent.setup();
    render(<SettingsTab appSettings={appSettings} initialSlots={[]} />);

    const liveSwitch = screen.getByRole("switch", { name: "Live Session" });
    await user.click(liveSwitch);

    expect(liveSwitch).toHaveAttribute("aria-checked", "true");
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Consultation availability updated.",
    );
  });

  it("reports a slot API failure without clearing the requested time", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ error: "Slot conflicts with another booking" }),
      }),
    );
    const user = userEvent.setup();
    render(<SettingsTab appSettings={appSettings} initialSlots={[]} />);

    const startInput = screen.getByLabelText("Date & Time (IST)");
    fireEvent.change(startInput, { target: { value: "2026-08-10T10:00" } });
    await user.click(screen.getByRole("button", { name: "Add Slot" }));

    expect(startInput).toHaveValue("2026-08-10T10:00");
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Slot conflicts with another booking",
    );
  });
});
