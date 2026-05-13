import { queryVariants } from "./geocode";

describe("queryVariants", () => {
  it("handles a simple string without comma", () => {
    const res = queryVariants("Hyderabad");
    expect(res).toEqual(["Hyderabad", "Hyderabad, India"]);
  });

  it("handles a string with leading/trailing whitespace", () => {
    const res = queryVariants("  Mumbai  ");
    expect(res).toEqual(["Mumbai", "Mumbai, India"]);
  });

  it("handles a string with one comma", () => {
    const res = queryVariants("Vishakhapatnam, AP");
    expect(res).toContain("Vishakhapatnam, AP");
    expect(res).toContain("Vishakhapatnam");
    expect(res).toContain("Vishakhapatnam, India");
    expect(res).toContain("AP");
    expect(res.length).toBe(4);
  });

  it("handles multiple segments", () => {
    const res = queryVariants("Village, Mandal, District, State");
    expect(res).toContain("Village, Mandal, District, State");
    expect(res).toContain("Village");
    expect(res).toContain("Village, India");
    expect(res).toContain("State");
    expect(res).toContain("Village, Mandal, District");
  });

  it("handles empty string", () => {
    const res = queryVariants("");
    expect(res).toEqual(["", ", India"]);
  });

  it("handles single comma only", () => {
    const res = queryVariants(",");
    expect(res).toEqual([","]);
  });
});
