import type { Client, InValue, InStatement } from "@libsql/client";
import { getClient } from "./client";
import {
  APPLICATION_SCHEMA_VERSION,
  APPLICATION_TABLES,
  APPLICATION_COLUMNS,
  APPLICATION_INDEXES,
} from "./application-schema-contract";

export class ApplicationSchemaUnavailableError extends Error {
  constructor() {
    super("Application storage is temporarily unavailable");
    this.name = "ApplicationSchemaUnavailableError";
  }
}

const names = APPLICATION_TABLES.map(() => "?").join(",");
const args: InValue[] = [...APPLICATION_TABLES];
export const APPLICATION_READINESS_QUERIES: InStatement[] = [
  { sql: "SELECT version FROM schema_version WHERE id = 1", args: [] },
  {
    sql: `SELECT s.name, p.name, p.type, p."notnull", p.dflt_value, p.pk FROM sqlite_schema s JOIN pragma_table_info(s.name) p WHERE s.type = 'table' AND s.name IN (${names}) ORDER BY s.name,p.name`,
    args,
  },
  {
    sql: `SELECT s.name, l.name, l."unique", l.origin, l.partial, i.seqno, i.name, i.coll, i.desc FROM sqlite_schema s JOIN pragma_index_list(s.name) l JOIN pragma_index_xinfo(l.name) i WHERE s.type='table' AND i.key=1 AND s.name IN (${names}) ORDER BY s.name,l.name,i.seqno`,
    args,
  },
  {
    sql: `SELECT s.name, s.sql, (SELECT COUNT(*) FROM pragma_foreign_key_list(s.name)) FROM sqlite_schema s WHERE s.type='table' AND s.name IN (${names}) ORDER BY s.name`,
    args,
  },
];

function isNonNullDefault(value: unknown): boolean {
  if (typeof value !== "string") return false;
  let literal = value.trim();
  while (literal.startsWith("(") && literal.endsWith(")"))
    literal = literal.slice(1, -1).trim();
  // Unknown expressions may evaluate to NULL; accept only demonstrably non-null literals.
  return (
    /^'(?:''|[^'])*'$/.test(literal) ||
    /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(literal) ||
    /^(?:TRUE|FALSE|CURRENT_TIMESTAMP|CURRENT_DATE|CURRENT_TIME)$/i.test(
      literal,
    )
  );
}

/** One read transaction: no schema repairs, writes, or migrations on a request. */
export async function verifyApplicationSchema(client: Client): Promise<void> {
  const results = await client.batch(
    [...APPLICATION_READINESS_QUERIES],
    "read",
  );
  const columns = results[1]?.rows.map((row) => Array.from(row)) ?? [];
  const indexes = results[2]?.rows.map((row) => Array.from(row)) ?? [];
  const requiredColumns = new Set(
    APPLICATION_COLUMNS.map((row) => `${row[0]}.${row[1]}`),
  );
  const requiredIndexes = new Set(
    APPLICATION_INDEXES.map((row) => `${row[0]}.${row[1]}`),
  );
  const contains = (
    rows: unknown[][],
    expected: readonly (readonly unknown[])[],
  ) =>
    expected.every((row) =>
      rows.some((actual) => JSON.stringify(actual) === JSON.stringify(row)),
    );
  const requiredIndexesMatch = [...requiredIndexes].every((key) => {
    const expected = APPLICATION_INDEXES.filter(
      (row) => `${row[0]}.${row[1]}` === key,
    );
    const actual = indexes.filter((row) => `${row[0]}.${row[1]}` === key);
    return JSON.stringify(actual) === JSON.stringify(expected);
  });
  const incompatibleExtraColumn = columns.some(
    (row) =>
      !requiredColumns.has(`${row[0]}.${row[1]}`) &&
      ((row[3] === 1 && !isNonNullDefault(row[4])) || row[5] !== 0),
  );
  const incompatibleExtraIndex = indexes.some(
    (row) => !requiredIndexes.has(`${row[0]}.${row[1]}`) && row[2] !== 0,
  );
  const definitions = results[3]?.rows ?? [];
  const incompatibleConstraint =
    definitions.length !== APPLICATION_TABLES.length ||
    definitions.some(
      (row) =>
        typeof row[1] !== "string" ||
        Number(row[2]) !== 0 ||
        /\bCHECK\s*\(/i.test(row[1].replace(/'(?:''|[^'])*'/g, "''")),
    );
  if (
    results[0]?.rows.length !== 1 ||
    results[0].rows[0][0] !== APPLICATION_SCHEMA_VERSION ||
    !contains(columns, APPLICATION_COLUMNS) ||
    !requiredIndexesMatch ||
    incompatibleExtraColumn ||
    incompatibleExtraIndex ||
    incompatibleConstraint
  ) {
    throw new ApplicationSchemaUnavailableError();
  }
}

let ready = false;
let attempt: Promise<void> | null = null;
let retryAfter = 0;
let transportPending = false;
const TIMEOUT_MS = 2_000;
const RETRY_DELAY_MS = 1_000;

/** Memoize successful readiness per process; share concurrent probes and bound retries. */
export async function ensureApplicationSchema(): Promise<void> {
  if (ready) return;
  if (Date.now() < retryAfter) throw new ApplicationSchemaUnavailableError();
  if (!attempt) {
    if (transportPending) throw new ApplicationSchemaUnavailableError();
    transportPending = true;
    attempt = new Promise<void>((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new ApplicationSchemaUnavailableError()),
        TIMEOUT_MS,
      );
      timer.unref?.();
      Promise.resolve()
        .then(() => verifyApplicationSchema(getClient()))
        .then(resolve, () => reject(new ApplicationSchemaUnavailableError()))
        .finally(() => {
          transportPending = false;
          clearTimeout(timer);
        });
    });
  }
  const current = attempt;
  try {
    await current;
    if (attempt === current) {
      ready = true;
      attempt = null;
    }
  } catch {
    if (attempt === current) {
      attempt = null;
      retryAfter = Date.now() + RETRY_DELAY_MS;
    }
    throw new ApplicationSchemaUnavailableError();
  }
}
