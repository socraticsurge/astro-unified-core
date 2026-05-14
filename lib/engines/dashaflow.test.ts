import { fetchDashaflow, DashaflowInput } from "./dashaflow";

describe("fetchDashaflow", () => {
  const mockInput: DashaflowInput = {
    date_of_birth: "1990-01-01",
    time_of_birth: "12:00",
    latitude: 28.6139,
    longitude: 77.2090,
    timezone: "Asia/Kolkata",
  };

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("should return data successfully on 200 OK", async () => {
    const mockData = { planets: [], houses: [] };
    jest.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: "success", data: mockData }),
    } as Response);

    const result = await fetchDashaflow(mockInput);
    expect(result.data).toEqual(mockData);
    expect(result.error).toBeUndefined();
  });

  it("should return error detail on non-200 with JSON detail", async () => {
    jest.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: false,
      status: 400,
      statusText: "Bad Request",
      json: async () => ({ detail: "Invalid input format" }),
    } as Response);

    const result = await fetchDashaflow(mockInput);
    expect(result.data).toBeNull();
    expect(result.error).toBe("Invalid input format");
  });

  it("should return default error on non-200 with no JSON detail", async () => {
    jest.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
      json: async () => ({}), // Empty JSON object, no 'detail' property
    } as Response);

    const result = await fetchDashaflow(mockInput);
    expect(result.data).toBeNull();
    // In current implementation, if err.detail is undefined, it defaults to Sidecar HTTP <status>
    expect(result.error).toBe("Sidecar HTTP 500");
  });

  it("should return statusText if JSON parsing fails on non-200", async () => {
    jest.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: false,
      status: 503,
      statusText: "Service Unavailable",
      json: async () => { throw new Error("Invalid JSON"); },
    } as Response);

    const result = await fetchDashaflow(mockInput);
    expect(result.data).toBeNull();
    expect(result.error).toBe("Service Unavailable");
  });

  it("should handle network errors (fetch throws)", async () => {
    jest.spyOn(global, "fetch").mockRejectedValueOnce(new Error("Network Error"));

    const result = await fetchDashaflow(mockInput);
    expect(result.data).toBeNull();
    expect(result.error).toBe("Network Error");
  });
});
