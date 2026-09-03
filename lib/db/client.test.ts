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
  batch: ReturnType<typeof vi.fn> = vi.fn().mockResolvedValue([result()]),
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

  it("shares one focused initialization across concurrent callers", async () => {
    const focusedBatch = deferred<TestResult[]>();
    const execute = vi.fn();
    const batch = vi.fn().mockImplementationOnce(() => focusedBatch.promise);
    const { ensureRateLimitSchema } = await loadClientModule(execute, batch);

    const first = ensureRateLimitSchema();
    const second = ensureRateLimitSchema();

    expect(batch).toHaveBeenCalledTimes(1);
    expect(execute).not.toHaveBeenCalled();
    focusedBatch.resolve([result(), result(), result()]);
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

  it("allows focused initialization to retry after a DDL rejection", async () => {
    const execute = vi.fn();
    const batch = vi.fn()
      .mockRejectedValueOnce(new Error("transient DDL failure"))
      .mockResolvedValue([result(), result(), result()]);
    const { ensureRateLimitSchema } = await loadClientModule(execute, batch);

    await expect(ensureRateLimitSchema()).rejects.toThrow("transient DDL failure");
    await ensureRateLimitSchema();

    expect(batch).toHaveBeenCalledTimes(2);
    expect(execute).not.toHaveBeenCalled();
    await ensureRateLimitSchema();
    expect(batch).toHaveBeenCalledTimes(2);
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

  it("recovers from a never-settling focused DDL before the outer storage deadline", async () => {
    vi.useFakeTimers();
    const neverSettles = new Promise<never>(() => undefined);
    const execute = vi.fn();
    const batch = vi.fn()
      .mockImplementationOnce(() => neverSettles)
      .mockResolvedValue([result(), result(), result()]);
    const { ensureRateLimitSchema } = await loadClientModule(execute, batch);

    let failure: unknown;
    const observed = ensureRateLimitSchema().catch((error: unknown) => {
      failure = error;
    });

    await vi.advanceTimersByTimeAsync(1_999);
    expect(failure).toBeUndefined();
    await vi.advanceTimersByTimeAsync(1);
    await observed;
    expect(failure).toEqual(new Error("Rate-limit schema initialization timed out"));

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

  it("does not let a timed-out focused attempt clobber its active retry", async () => {
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
      new Error("Rate-limit schema initialization timed out"),
    );

    const retry = ensureRateLimitSchema();
    expect(batch).toHaveBeenCalledTimes(2);

    oldBatch.resolve([result(), result(), result()]);
    await flushMicrotasks();

    let sharedCallerSettled = false;
    const sharedCaller = ensureRateLimitSchema().then(() => {
      sharedCallerSettled = true;
    });
    await flushMicrotasks();
    expect(sharedCallerSettled).toBe(false);

    retryBatch.resolve([result(), result(), result()]);
    await Promise.all([retry, sharedCaller]);
    expect(batch).toHaveBeenCalledTimes(2);
    expect(execute).not.toHaveBeenCalled();
  });

  it("shares focused DDL when full and focused initialization interleave", async () => {
    const focusedDdl = deferred<TestResult[]>();
    const execute = vi.fn().mockImplementation((statement: unknown) => {
      const sql = sqlText(statement);
      if (sql.includes("SELECT version FROM schema_version")) {
        return Promise.resolve(result([[12]]));
      }
      return Promise.resolve(result());
    });
    const batch = vi.fn().mockImplementationOnce(() => focusedDdl.promise);
    const { ensureRateLimitSchema, ensureSchema } = await loadClientModule(
      execute,
      batch,
    );

    const focused = ensureRateLimitSchema();
    let fullSettled = false;
    const full = ensureSchema().then(() => {
      fullSettled = true;
    });
    await flushMicrotasks();

    expect(fullSettled).toBe(false);
    expect(batch).toHaveBeenCalledTimes(1);

    focusedDdl.resolve([result(), result(), result()]);
    await Promise.all([focused, full]);

    const focusedSql = (batch.mock.calls[0][0] as unknown[]).map(sqlText);
    expect(focusedSql.filter((sql) => (
      sql.includes("CREATE TABLE IF NOT EXISTS distributed_rate_limits")
    ))).toHaveLength(1);
    expect(focusedSql.filter((sql) => (
      sql.includes("CREATE TABLE IF NOT EXISTS geocoder_provider_budget")
    ))).toHaveLength(1);
    expect(focusedSql.find((sql) => (
      sql.includes("CREATE TABLE IF NOT EXISTS geocoder_provider_budget")
    ))).toContain("daily_limit INTEGER NOT NULL");
    expect(focusedSql.filter((sql) => (
      sql.includes("idx_distributed_rate_limits_expiry")
    ))).toHaveLength(1);
    expect(batch.mock.calls[0][1]).toBe("write");

    const completedCallCount = execute.mock.calls.length;
    await Promise.all([ensureRateLimitSchema(), ensureSchema()]);
    expect(execute).toHaveBeenCalledTimes(completedCallCount);
    expect(batch).toHaveBeenCalledTimes(1);
  });
});
