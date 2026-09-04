import {
  ensureRateLimitSchema,
  getClient,
  provisionRateLimitSchema,
} from "../lib/db/client";

type DeploymentTarget = "preview" | "production";

function requestedTarget(args: string[]): DeploymentTarget {
  const target = args.length === 2 && args[0] === "--target"
    ? args[1]
    : undefined;
  if (target !== "preview" && target !== "production") {
    throw new Error("Pass exactly one deployment target: --target preview|production");
  }
  return target;
}

function requireMatchingEnvironment(target: DeploymentTarget): void {
  if (process.env.VERCEL_ENV !== target) {
    throw new Error(
      `VERCEL_ENV must equal ${target}; refusing to provision an ambiguous database`,
    );
  }
  if (!process.env.TURSO_DATABASE_URL?.startsWith("libsql://")) {
    throw new Error("TURSO_DATABASE_URL must identify an explicit remote libSQL database");
  }
  if (!process.env.TURSO_AUTH_TOKEN?.trim()) {
    throw new Error("TURSO_AUTH_TOKEN is required");
  }
}

async function main(): Promise<void> {
  const target = requestedTarget(process.argv.slice(2));
  requireMatchingEnvironment(target);

  const client = getClient();
  try {
    await provisionRateLimitSchema(client);
    await ensureRateLimitSchema();
    console.log(`Rate-limit schema provisioned and verified for ${target}.`);
  } finally {
    client.close();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown provisioning failure";
  console.error(`Rate-limit schema provisioning failed: ${message}`);
  process.exitCode = 1;
});
