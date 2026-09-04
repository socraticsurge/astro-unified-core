// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { ProfileForm } from "../ProfileForm";
import { ProfileFormFields, emptyProfileFormState } from "../profile/ProfileFormFields";
import { OnboardingClient } from "../../app/onboarding/OnboardingClient";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

describe("ProfileForm geocoder attribution", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, {
      status: 204,
    })));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function expectOpenStreetMapNotice(): void {
    expect(screen.getByText(/Enter a city or town/)).toBeInTheDocument();
    const attribution = screen.getByRole("link", {
      name: "© OpenStreetMap contributors",
    });
    expect(attribution).toHaveAttribute(
      "href",
      "https://www.openstreetmap.org/copyright",
    );
    expect(attribution).toHaveAttribute("target", "_blank");
    expect(attribution).toHaveAttribute("rel", "noopener noreferrer");
  }

  it("keeps linked OpenStreetMap attribution beside the full edit form", () => {
    render(<ProfileForm />);

    expectOpenStreetMapNotice();
  });

  it("keeps the same notice in the shared inline create and edit fields", () => {
    render(
      <ProfileFormFields
        form={emptyProfileFormState()}
        onChange={vi.fn()}
      />,
    );

    expectOpenStreetMapNotice();
  });

  it("shows the notice on the onboarding birthplace step", () => {
    const { container } = render(<OnboardingClient googleName="Test User" />);
    const selects = screen.getAllByRole("combobox");
    fireEvent.change(selects[0], { target: { value: "Self" } });
    fireEvent.change(selects[1], { target: { value: "Female" } });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    fireEvent.change(container.querySelector('input[type="date"]')!, {
      target: { value: "1990-01-01" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    expect(screen.getByText("Where were they born?")).toBeInTheDocument();
    expectOpenStreetMapNotice();
  });
});
