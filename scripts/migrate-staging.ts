import { ensureSchema, getClient } from "../lib/db/client";
import { assertStagingDatabase } from "./staging-database-guard";

async function main() {
  assertStagingDatabase();
  await ensureSchema();

  const client = getClient();
  const version = await client.execute(
    "SELECT version FROM schema_version WHERE id = 1",
  );
  const tables = await client.execute(
    "SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'",
  );

  console.log(
    `Gate 7 staging schema ready (version ${Number(version.rows[0]?.[0] ?? 0)}, ${Number(tables.rows[0]?.[0] ?? 0)} tables).`,
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Staging migration failed.");
  process.exitCode = 1;
});
