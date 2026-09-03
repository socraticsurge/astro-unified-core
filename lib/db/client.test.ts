const { createClientMock } = vi.hoisted(() => ({
  createClientMock: vi.fn(),
}));

vi.mock("@libsql/client", () => ({
  createClient: createClientMock,
}));

interface TestResult {
  rows: unknown[][];
}

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason: unknown) => void;
}

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function result(rows: unknown[][] = []): TestResult {
  return { rows };
}

const RATE_LIMIT_EXPIRY_INDEX = "idx_distributed_rate_limits_expiry";

function readyRateLimitSchema(): TestResult[] {
  return [
    result([[
      "table",
      "distributed_rate_limits",
      "distributed_rate_limits",
      `CREATE TABLE distributed_rate_limits (
        counter_key TEXT PRIMARY KEY
          CHECK(length(counter_key) = 64 AND counter_key NOT GLOB '*[^0-9a-f]*'),
        count INTEGER NOT NULL CHECK(count BETWEEN 1 AND 1000000),
        expires_at_ms INTEGER NOT NULL CHECK(expires_at_ms > 0)
      ) WITHOUT ROWID`,
    ]]),
    result([[
      "table",
      "geocoder_provider_budget",
      "geocoder_provider_budget",
      `CREATE TABLE geocoder_provider_budget (
        budget_key TEXT PRIMARY KEY
          CHECK(length(budget_key) = 64 AND budget_key NOT GLOB '*[^0-9a-f]*'),
        utc_day TEXT NOT NULL,
        day_count INTEGER NOT NULL CHECK(day_count BETWEEN 1 AND 1500),
        daily_limit INTEGER NOT NULL CHECK(daily_limit BETWEEN 1 AND 1500),
        next_allowed_at_ms INTEGER NOT NULL CHECK(next_allowed_at_ms > 0),
        CHECK(day_count <= daily_limit)
      ) WITHOUT ROWID`,
    ]]),
    result([[
      "index",
      RATE_LIMIT_EXPIRY_INDEX,
      "distributed_rate_limits",
      `CREATE INDEX ${RATE_LIMIT_EXPIRY_INDEX} ON distributed_rate_limits (expires_at_ms)`,
    ]]),
  ];
}

function sqlText(statement: unknown): string {
  if (typeof statement === "string") return statement;
  if (
    statement
    && typeof statement === "object"
    && "sql" in statement
    && typeof statement.sql === "string"
  ) {
    return statement.sql;
  }
  return "";
}

async function flushMicrotasks(rounds = 50): Promise<void> {
  for (let index = 0; index < rounds; index += 1) {
    await Promise.resolve();
  }
}

async function loadClientModule(
  execute: ReturnType<typeof vi.fn>,
  batch: ReturnType<typeof vi.fn> = vi.fn().mockResolvedValue(readyRateLimitSchema()),
) {
  vi.resetModules();
  createClientMock.mockReset();
  createClientMock.mockReturnValue({ execute, batch });
  process.env.TURSO_DATABASE_URL = "libsql://test.invalid";
  process.env.TURSO_AUTH_TOKEN = "test-token";
  return import("./client");
}

describe("database schema initialization", () => {
  afterEach(() => {
    vi.useRealTimers();
    delete process.env.TURSO_DATABASE_URL;
    delete process.env.TURSO_AUTH_TOKEN;
  });

  it("shares one read-only readiness probe across concurrent guest callers", async () => {
    const focusedBatch = deferred<TestResult[]>();
    const execute = vi.fn();
    const batch = vi.fn().mockImplementationOnce(() => focusedBatch.promise);
    const { ensureRateLimitSchema } = await loadClientModule(execute, batch);

    const first = ensureRateLimitSchema();
    const second = ensureRateLimitSchema();

    expect(batch).toHaveBeenCalledTimes(1);
    expect(execute).not.toHaveBeenCalled();
    const [statements, mode] = batch.mock.calls[0] as [unknown[], string];
    expect(mode).toBe("read");
    expect(statements).toHaveLength(3);
    for (const statement of statements) {
      expect(sqlText(statement)).toMatch(/^\s*SELECT\b/i);
      expect(sqlText(statement)).not.toMatch(
        /\b(?:CREATE|ALTER|DROP|INSERT|UPDATE|DELETE|REPLACE)\b/i,
      );
    }

    focusedBatch.resolve(readyRateLimitSchema());
    await Promise.all([first, second]);

    expect(batch).toHaveBeenCalledTimes(1);
    await ensureRateLimitSchema();
    expect(batch).toHaveBeenCalledTimes(1);
  });

  it("shares one full initialization across concurrent callers", async () => {
    const firstDdl = deferred<TestResult>();
    const execute = vi.fn()
      .mockImplementationOnce(() => firstDdl.promise)
      .mockImplementation((statement: unknown) => Promise.resolve(
        sqlText(statement).includes("SELECT version FROM schema_version")
          ? result([[12]])
          : result(),
      ));
    const { ensureSchema } = await loadClientModule(execute);

    const first = ensureSchema();
    const second = ensureSchema();

    expect(execute).toHaveBeenCalledTimes(1);
    firstDdl.resolve(result());
    await Promise.all([first, second]);
    const completedCallCount = execute.mock.calls.length;

    expect(
      execute.mock.calls.filter(([statement]) => (
        sqlText(statement).includes("CREATE TABLE IF NOT EXISTS schema_version")
      )),
    ).toHaveLength(1);
    await ensureSchema();
    expect(execute).toHaveBeenCalledTimes(completedCallCount);
  });

  it("fails closed on a missing limiter table and retries the readiness probe", async () => {
    const execute = vi.fn();
    const batch = vi.fn()
      .mockRejectedValueOnce(new Error("SQLITE_ERROR: no such table: distributed_rate_limits"))
      .mockResolvedValue(readyRateLimitSchema());
    const { ensureRateLimitSchema } = await loadClientModule(execute, batch);

    await expect(ensureRateLimitSchema()).rejects.toThrow(
      "no such table: distributed_rate_limits",
    );
    await ensureRateLimitSchema();

    expect(batch).toHaveBeenCalledTimes(2);
    expect(batch.mock.calls.every((call) => call[1] === "read")).toBe(true);
    expect(batch.mock.calls.flatMap((call) => call[0] as unknown[]).every(
      (statement) => !/\bCREATE\b/i.test(sqlText(statement)),
    )).toBe(true);
    expect(execute).not.toHaveBeenCalled();
    await ensureRateLimitSchema();
    expect(batch).toHaveBeenCalledTimes(2);
  });

  it("fails closed when the required expiry index is missing", async () => {
    const execute = vi.fn();
    const schema = readyRateLimitSchema();
    schema[2] = result();
    const batch = vi.fn().mockResolvedValue(schema);
    const { ensureRateLimitSchema } = await loadClientModule(execute, batch);

    await expect(ensureRateLimitSchema()).rejects.toThrow(
      `Rate-limit schema object is missing or incompatible: ${RATE_LIMIT_EXPIRY_INDEX}`,
    );

    expect(batch).toHaveBeenCalledTimes(1);
    expect(batch.mock.calls[0][1]).toBe("read");
    expect(execute).not.toHaveBeenCalled();
  });

  it("fails closed on drifted limiter keys, constraints, and index definitions", async () => {
    const cases: Array<{
      objectIndex: number;
      from: string;
      to: string;
      expectedName: string;
    }> = [
      {
        objectIndex: 0,
        from: "counter_key TEXT PRIMARY KEY",
        to: "counter_key TEXT UNIQUE",
        expectedName: "distributed_rate_limits",
      },
      {
        objectIndex: 0,
        from: "CHECK(count BETWEEN 1 AND 1000000)",
        to: "CHECK(count >= 1)",
        expectedName: "distributed_rate_limits",
      },
      {
        objectIndex: 0,
        from: "*[^0-9a-f]*",
        to: "*[^0-9A-F]*",
        expectedName: "distributed_rate_limits",
      },
      {
        objectIndex: 0,
        from: ") WITHOUT ROWID",
        to: ")",
        expectedName: "distributed_rate_limits",
      },
      {
        objectIndex: 1,
        from: "CHECK(day_count <= daily_limit)",
        to: "CHECK(day_count < daily_limit)",
        expectedName: "geocoder_provider_budget",
      },
      {
        objectIndex: 2,
        from: "(expires_at_ms)",
        to: "(count)",
        expectedName: RATE_LIMIT_EXPIRY_INDEX,
      },
    ];

    for (const drift of cases) {
      const schema = readyRateLimitSchema();
      const row = schema[drift.objectIndex]?.rows[0];
      if (!row || typeof row[3] !== "string") {
        throw new Error("Invalid test fixture");
      }
      row[3] = row[3].replace(drift.from, drift.to);
      const execute = vi.fn();
      const batch = vi.fn().mockResolvedValue(schema);
      const { ensureRateLimitSchema } = await loadClientModule(execute, batch);

      await expect(ensureRateLimitSchema()).rejects.toThrow(
        `Rate-limit schema object is missing or incompatible: ${drift.expectedName}`,
      );
      expect(batch.mock.calls[0][1]).toBe("read");
      expect(execute).not.toHaveBeenCalled();
    }
  });

  it("allows full initialization to retry after a DDL rejection", async () => {
    const execute = vi.fn()
      .mockRejectedValueOnce(new Error("schema bootstrap failed"))
      .mockImplementation((statement: unknown) => Promise.resolve(
        sqlText(statement).includes("SELECT version FROM schema_version")
          ? result([[12]])
          : result(),
      ));
    const { ensureSchema } = await loadClientModule(execute);

    await expect(ensureSchema()).rejects.toThrow("schema bootstrap failed");
    await ensureSchema();
    const completedCallCount = execute.mock.calls.length;

    expect(completedCallCount).toBeGreaterThan(1);
    await ensureSchema();
    expect(execute).toHaveBeenCalledTimes(completedCallCount);
  });

  it("recovers from a never-settling readiness read before the outer storage deadline", async () => {
    vi.useFakeTimers();
    const neverSettles = new Promise<never>(() => undefined);
    const execute = vi.fn();
    const batch = vi.fn()
      .mockImplementationOnce(() => neverSettles)
      .mockResolvedValue(readyRateLimitSchema());
    const { ensureRateLimitSchema } = await loadClientModule(execute, batch);

    let failure: unknown;
    const observed = ensureRateLimitSchema().catch((error: unknown) => {
      failure = error;
    });

    await vi.advanceTimersByTimeAsync(1_999);
    expect(failure).toBeUndefined();
    await vi.advanceTimersByTimeAsync(1);
    await observed;
    expect(failure).toEqual(
      new Error("Rate-limit schema readiness timed out"),
    );

    await ensureRateLimitSchema();
    expect(batch).toHaveBeenCalledTimes(2);
    expect(execute).not.toHaveBeenCalled();
  });

  it("recovers from a never-settling full-schema DDL at its longer deadline", async () => {
    vi.useFakeTimers();
    const neverSettles = new Promise<never>(() => undefined);
    const execute = vi.fn()
      .mockImplementationOnce(() => neverSettles)
      .mockImplementation((statement: unknown) => Promise.resolve(
        sqlText(statement).includes("SELECT version FROM schema_version")
          ? result([[12]])
          : result(),
      ));
    const { ensureSchema } = await loadClientModule(execute);

    let failure: unknown;
    const observed = ensureSchema().catch((error: unknown) => {
      failure = error;
    });

    await vi.advanceTimersByTimeAsync(14_999);
    expect(failure).toBeUndefined();
    await vi.advanceTimersByTimeAsync(1);
    await observed;
    expect(failure).toEqual(new Error("Database schema initialization timed out"));

    await ensureSchema();
    const completedCallCount = execute.mock.calls.length;
    expect(completedCallCount).toBeGreaterThan(1);
    await ensureSchema();
    expect(execute).toHaveBeenCalledTimes(completedCallCount);
  });

  it("does not let a timed-out readiness probe clobber its active retry", async () => {
    vi.useFakeTimers();
    const oldBatch = deferred<TestResult[]>();
    const retryBatch = deferred<TestResult[]>();
    const execute = vi.fn();
    const batch = vi.fn()
      .mockImplementationOnce(() => oldBatch.promise)
      .mockImplementationOnce(() => retryBatch.promise);
    const { ensureRateLimitSchema } = await loadClientModule(execute, batch);

    const timedOut = ensureRateLimitSchema().catch((error: unknown) => error);
    await vi.advanceTimersByTimeAsync(2_000);
    await expect(timedOut).resolves.toEqual(
      new Error("Rate-limit schema readiness timed out"),
    );

    const retry = ensureRateLimitSchema();
    expect(batch).toHaveBeenCalledTimes(2);

    oldBatch.resolve(readyRateLimitSchema());
    await flushMicrotasks();

    let sharedCallerSettled = false;
    const sharedCaller = ensureRateLimitSchema().then(() => {
      sharedCallerSettled = true;
    });
    await flushMicrotasks();
    expect(sharedCallerSettled).toBe(false);

    retryBatch.resolve(readyRateLimitSchema());
    await Promise.all([retry, sharedCaller]);
    expect(batch).toHaveBeenCalledTimes(2);
    expect(execute).not.toHaveBeenCalled();
  });

  it("creates limiter objects only through explicit controlled provisioning", async () => {
    const execute = vi.fn();
    const batch = vi.fn().mockResolvedValue([result(), result(), result()]);
    const { provisionRateLimitSchema } = await loadClientModule(execute, batch);

    await provisionRateLimitSchema();

    expect(batch).toHaveBeenCalledTimes(1);
    const [statements, mode] = batch.mock.calls[0] as [unknown[], string];
    const ddl = statements.map(sqlText);
    expect(mode).toBe("write");
    expect(ddl.filter((sql) => (
      sql.includes("CREATE TABLE IF NOT EXISTS distributed_rate_limits")
    ))).toHaveLength(1);
    expect(ddl.filter((sql) => (
      sql.includes("CREATE TABLE IF NOT EXISTS geocoder_provider_budget")
    ))).toHaveLength(1);
    expect(ddl.find((sql) => (
      sql.includes("CREATE TABLE IF NOT EXISTS geocoder_provider_budget")
    ))).toContain("daily_limit INTEGER NOT NULL");
    expect(ddl.filter((sql) => (
      sql.includes(RATE_LIMIT_EXPIRY_INDEX)
    ))).toHaveLength(1);
    expect(execute).not.toHaveBeenCalled();
  });

  it("keeps limiter DDL out of lazy full bootstrap and probes it read-only", async () => {
    const execute = vi.fn().mockImplementation((statement: unknown) => {
      const sql = sqlText(statement);
      if (sql.includes("SELECT version FROM schema_version")) {
        return Promise.resolve(result([[12]]));
      }
      return Promise.resolve(result());
    });
    const batch = vi.fn().mockResolvedValue(readyRateLimitSchema());
    const { ensureRateLimitSchema, ensureSchema } = await loadClientModule(
      execute,
      batch,
    );

    await ensureSchema();

    expect(batch).not.toHaveBeenCalled();

    const completedCallCount = execute.mock.calls.length;
    await ensureRateLimitSchema();
    expect(execute).toHaveBeenCalledTimes(completedCallCount);
    expect(batch).toHaveBeenCalledTimes(1);
    expect(batch.mock.calls[0][1]).toBe("read");
    expect((batch.mock.calls[0][0] as unknown[]).every(
      (statement) => /^\s*SELECT\b/i.test(sqlText(statement)),
    )).toBe(true);
    await Promise.all([ensureRateLimitSchema(), ensureSchema()]);
    expect(execute).toHaveBeenCalledTimes(completedCallCount);
    expect(batch).toHaveBeenCalledTimes(1);
  });
});
