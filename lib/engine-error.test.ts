import { extractEngineError } from "./engine-error";

describe("extractEngineError", () => {
  test("returns null for falsy or non-object inputs", () => {
    expect(extractEngineError(null)).toBeNull();
    expect(extractEngineError(undefined)).toBeNull();
    expect(extractEngineError("string")).toBeNull();
    expect(extractEngineError(123)).toBeNull();
  });

  test("returns error string if error property is a non-empty string", () => {
    expect(extractEngineError({ error: "Something went wrong" })).toBe("Something went wrong");
  });

  test("ignores empty string error property", () => {
    expect(extractEngineError({ error: "" })).toBeNull();
  });

  test("handles VedAstro shape with errors and no raw_responses", () => {
    const output = {
      raw_responses: {},
      errors: { call1: "Error 1", call2: "Error 2" }
    };
    expect(extractEngineError(output)).toBe("Error 1; Error 2");
  });

  test("does not return VedAstro errors if there are raw_responses", () => {
    const output = {
      raw_responses: { call3: "Some data" },
      errors: { call1: "Error 1", call2: "Error 2" }
    };
    expect(extractEngineError(output)).toBeNull();
  });

  test("does not return VedAstro errors if errors object is empty", () => {
    const output = {
      raw_responses: {},
      errors: {}
    };
    expect(extractEngineError(output)).toBeNull();
  });

  test("returns generic message if data is strictly null", () => {
    expect(extractEngineError({ data: null })).toBe("Engine returned no data");
  });

  test("returns null if data is not null", () => {
    expect(extractEngineError({ data: [] })).toBeNull();
    expect(extractEngineError({ data: "some data" })).toBeNull();
  });

  test("returns null for generic objects without special keys", () => {
    expect(extractEngineError({})).toBeNull();
    expect(extractEngineError({ foo: "bar" })).toBeNull();
  });
});
