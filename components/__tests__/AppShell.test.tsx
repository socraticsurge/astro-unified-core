// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { AppShell } from "../AppShell";

const state = vi.hoisted(() => ({ pathname: "/" }));

vi.mock("next/navigation", () => ({
  usePathname: () => state.pathname,
}));

vi.mock("../AppStarCanvas", () => ({
  AppStarCanvas: () => <div data-testid="star-canvas" />,
}));

function renderShell(rootUsesAppShell = false) {
  return render(
    <AppShell
      rootUsesAppShell={rootUsesAppShell}
      navBar={<nav>Brand navigation</nav>}
      footer={<footer>Site footer</footer>}
      feedback={<button>Feedback</button>}
    >
      <div>Page content</div>
    </AppShell>,
  );
}

describe("AppShell root behavior", () => {
  it("preserves the legacy full-bleed landing when the release switch is off", () => {
    state.pathname = "/";
    renderShell();

    expect(screen.getByText("Page content")).toBeInTheDocument();
    expect(screen.queryByText("Brand navigation")).not.toBeInTheDocument();
  });

  it("restores navigation, backdrop, footer and feedback for the unified root", () => {
    state.pathname = "/";
    renderShell(true);

    expect(screen.getByText("Brand navigation")).toBeInTheDocument();
    expect(screen.getByTestId("star-canvas")).toBeInTheDocument();
    expect(screen.getByText("Site footer")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Feedback" })).toBeInTheDocument();
  });

  it("continues to wrap non-root public pages", () => {
    state.pathname = "/unified";
    renderShell();

    expect(screen.getByText("Brand navigation")).toBeInTheDocument();
  });
});
