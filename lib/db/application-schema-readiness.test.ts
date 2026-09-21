import { createClient } from "@libsql/client";
import {
  APPLICATION_COLUMNS,
  APPLICATION_INDEXES,
  APPLICATION_TABLES,
} from "./application-schema-contract";

const mocks = vi.hoisted(() => ({ getClient: vi.fn() }));
vi.mock("./client", () => ({ getClient: mocks.getClient }));
function ready(): Array<{ rows: unknown[][] }> {
  return [
    { rows: [[12]] },
    { rows: APPLICATION_COLUMNS.map((r) => [...r]) },
    { rows: APPLICATION_INDEXES.map((r) => [...r]) },
    {
      rows: APPLICATION_TABLES.map((name) => [
        name,
        "CREATE TABLE example(id TEXT)",
        0,
      ]),
    },
  ];
}
type ReadyResults = ReturnType<typeof ready>;

async function setup(batch = vi.fn().mockResolvedValue(ready())) {
  vi.resetModules();
  const execute = vi.fn();
  mocks.getClient.mockReturnValue({ batch, execute });
  return {
    ...(await import("./application-schema-readiness")),
    batch,
    execute,
  };
}

async function expectRejected(
  mutate: (results: ReadyResults) => void,
): Promise<void> {
  const results = ready();
  mutate(results);
  const m = await setup(vi.fn().mockResolvedValue(results));
  await expect(m.ensureApplicationSchema()).rejects.toThrow(
    m.ApplicationSchemaUnavailableError,
  );
  expect(m.execute).not.toHaveBeenCalled();
}
afterEach(() => {
  vi.useRealTimers();
});
describe("read-only application schema readiness", () => {
  it("shares one read transaction across concurrent callers and warm requests", async () => {
    const m = await setup();
    await Promise.all(
      Array.from({ length: 20 }, () => m.ensureApplicationSchema()),
    );
    await m.ensureApplicationSchema();
    expect(m.batch).toHaveBeenCalledTimes(1);
    expect(m.batch.mock.calls[0][1]).toBe("read");
    expect(
      m.batch.mock.calls[0][0].every((s: { sql: string }) =>
        /^SELECT\b/.test(s.sql),
      ),
    ).toBe(true);
    expect(m.execute).not.toHaveBeenCalled();
  });
  it.each([0, 11, 13])(
    "rejects missing/behind/future version %s",
    async (version) => {
      await expectRejected((results) => {
        results[0].rows = [[version]];
      });
    },
  );
  it.each([1, 2])(
    "rejects missing or drifted structural metadata result %s",
    async (index) => {
      await expectRejected((results) => {
        results[index].rows = [];
      });
    },
  );
  it("sanitizes SQL failures and bounds retry frequency", async () => {
    vi.useFakeTimers();
    const m = await setup(
      vi
        .fn()
        .mockRejectedValueOnce(new Error("secret database URL / SQL text"))
        .mockResolvedValue(ready()),
    );
    await expect(m.ensureApplicationSchema()).rejects.toThrow(
      "Application storage is temporarily unavailable",
    );
    await expect(m.ensureApplicationSchema()).rejects.toThrow(
      m.ApplicationSchemaUnavailableError,
    );
    expect(m.batch).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1000);
    await m.ensureApplicationSchema();
    expect(m.batch).toHaveBeenCalledTimes(2);
  });
  it("bounds uncancellable transports and retries only after the old transport settles", async () => {
    vi.useFakeTimers();
    let oldResolve!: (value: unknown) => void;
    const m = await setup(
      vi
        .fn()
        .mockImplementationOnce(
          () =>
            new Promise((r) => {
              oldResolve = r;
            }),
        )
        .mockResolvedValue(ready()),
    );
    const old = m.ensureApplicationSchema().catch((e) => e);
    await vi.advanceTimersByTimeAsync(2000);
    expect(await old).toBeInstanceOf(m.ApplicationSchemaUnavailableError);
    await vi.advanceTimersByTimeAsync(1000);
    await expect(m.ensureApplicationSchema()).rejects.toThrow(
      m.ApplicationSchemaUnavailableError,
    );
    expect(m.batch).toHaveBeenCalledTimes(1);
    oldResolve(ready());
    await vi.advanceTimersByTimeAsync(0);
    // A late success must not mark the process ready: a fresh probe is required.
    await m.ensureApplicationSchema();
    expect(m.batch).toHaveBeenCalledTimes(2);
  });
  it("allows additive non-unique indexes and nullable columns", async () => {
    const r = ready();
    r[1].rows.push(["profiles", "optional_note", "TEXT", 0, null, 0]);
    r[2].rows.push(["profiles", "idx_extra", 0, "c", 0, 0, "name"]);
    const m = await setup(vi.fn().mockResolvedValue(r));
    await m.ensureApplicationSchema();
  });
  it.each(["unique", "required-column", "foreign-key", "check"])(
    "rejects incompatible added %s",
    async (kind) => {
      await expectRejected((results) => {
        if (kind === "unique")
          results[2].rows.push(["profiles", "idx_extra", 1, "c", 0, 0, "name"]);
        if (kind === "required-column")
          results[1].rows.push(["profiles", "required_note", "TEXT", 1, null, 0]);
        if (kind === "foreign-key") results[3].rows[0][2] = 1;
        if (kind === "check")
          results[3].rows[0][1] = "CREATE TABLE example(id TEXT CHECK(length(id)>10))";
      });
    },
  );
  it("rejects additional columns in a required unique index", async () => {
    const r = ready();
    const emailIndex = APPLICATION_INDEXES.find(
      (row) => row[0] === "users" && row[3] === "u",
    );
    if (!emailIndex) throw new Error("Missing email uniqueness fixture");
    const extra: unknown[] = [...emailIndex];
    extra[5] = 1;
    extra[6] = "name";
    r[2].rows.push(extra);
    const m = await setup(vi.fn().mockResolvedValue(r));
    await expect(m.ensureApplicationSchema()).rejects.toThrow(
      m.ApplicationSchemaUnavailableError,
    );
  });
  it.each(["NULL", "(NULL)", " null ", "(random())"])(
    "rejects unsafe required-column default %s",
    async (defaultValue) => {
      await expectRejected((results) => {
        results[1].rows.push([
          "profiles",
          "required_note",
          "TEXT",
          1,
          defaultValue,
          0,
        ]);
      });
    },
  );
  it("allows an added required column with a non-null literal default", async () => {
    const r = ready();
    r[1].rows.push(["profiles", "new_status", "TEXT", 1, "'pending'", 0]);
    const m = await setup(vi.fn().mockResolvedValue(r));
    await m.ensureApplicationSchema();
  });
  it("does not bootstrap a real empty database", async () => {
    const client = createClient({ url: "file::memory:" });
    try {
      const m = await setup();
      await expect(m.verifyApplicationSchema(client)).rejects.toThrow();
      const schema = await client.execute("SELECT name FROM sqlite_schema");
      expect(schema.rows).toHaveLength(0);
    } finally {
      client.close();
    }
  });
});
