import { APPLICATION_SCHEMA_VERSION } from "../lib/db/application-schema-contract";
import { readFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { getClient, provisionApplicationSchema } from "../lib/db/client";
import { verifyApplicationSchema } from "../lib/db/application-schema-readiness";
import {
  validateSchemaTarget,
  type SchemaRestoreRecord,
} from "./application-schema-options";

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      target: { type: "string" },
      project: { type: "string" },
      "database-host": { type: "string" },
      "restore-record": { type: "string" },
      apply: { type: "boolean", default: false },
    },
    strict: true,
    allowPositionals: false,
  });
  const linked = JSON.parse(readFileSync(".vercel/project.json", "utf8")) as {
    projectId: string;
  };
  const restore = values["restore-record"]
    ? (JSON.parse(
        readFileSync(values["restore-record"], "utf8"),
      ) as SchemaRestoreRecord)
    : undefined;
  validateSchemaTarget({
    options: values,
    environment: process.env,
    linkedProjectId: linked.projectId,
    restore,
  });
  const client = getClient();
  try {
    if (!values.apply) {
      // Default is a read-only readiness check, never a speculative bootstrap.
      await verifyApplicationSchema(client);
      console.log("Application schema v12 ready; read-only check, no writes.");
      return;
    }
    // Refuse a future version before any schema write. Missing metadata is a
    // legitimate fresh database; all other inspection failures must stop.
    const metadata = await client.execute(
      "SELECT name FROM sqlite_schema WHERE type='table' AND name='schema_version'",
    );
    if (metadata.rows.length) {
      const version = await client.execute(
        "SELECT version FROM schema_version WHERE id=1",
      );
      if (Number(version.rows[0]?.[0]) > APPLICATION_SCHEMA_VERSION)
        throw new Error("Refusing to modify a future schema version");
    }
    await provisionApplicationSchema();
    await verifyApplicationSchema(client);
    console.log(
      "Application schema provisioned and verified; limiter schema unchanged.",
    );
  } finally {
    client.close();
  }
}
main().catch(() => {
  // Credentials, raw SQL, database endpoints and user rows are never printed.
  console.error(
    "Application schema operation failed; verify target, restore record and schema using the runbook.",
  );
  process.exitCode = 1;
});
