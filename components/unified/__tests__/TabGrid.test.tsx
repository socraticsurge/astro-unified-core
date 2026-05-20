// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { TwoColumnTabGrid, TabColumn, TabSection } from "../TabGrid";

describe("TwoColumnTabGrid", () => {
  it("renders children inside a grid container", () => {
    render(
      <TwoColumnTabGrid>
        <TabColumn><div>left</div></TabColumn>
        <TabColumn><div>right</div></TabColumn>
      </TwoColumnTabGrid>
    );
    expect(screen.getByText("left")).toBeDefined();
    expect(screen.getByText("right")).toBeDefined();
  });
});

describe("TabSection", () => {
  it("renders the heading and children when `when` is true", () => {
    render(
      <TabSection title="What's active now">
        <p>Insight A</p>
      </TabSection>
    );
    expect(screen.getByText("What's active now")).toBeDefined();
    expect(screen.getByText("Insight A")).toBeDefined();
  });

  it("renders the heading by default (when omitted)", () => {
    render(
      <TabSection title="Always-on">
        <p>body</p>
      </TabSection>
    );
    expect(screen.getByText("Always-on")).toBeDefined();
  });

  it("renders nothing — not even the heading — when `when` is false", () => {
    const { container } = render(
      <TabSection title="What's active now" when={false}>
        <p>this should not appear</p>
      </TabSection>
    );
    expect(container.firstChild).toBeNull();
    expect(screen.queryByText("What's active now")).toBeNull();
  });

  it("renders the trailing slot next to the heading", () => {
    render(
      <TabSection title="Today's transits" trailing={<button>Refresh</button>}>
        <p>body</p>
      </TabSection>
    );
    expect(screen.getByRole("button", { name: "Refresh" })).toBeDefined();
  });

  it("renders children without a heading when title is omitted", () => {
    render(
      <TabSection>
        <p>just body</p>
      </TabSection>
    );
    expect(screen.getByText("just body")).toBeDefined();
  });
});
