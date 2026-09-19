export interface SchemaRestoreRecord {
  target: string;
  projectId: string;
  databaseHost: string;
  backupRef: string;
  sourceRef: string;
  restoredSuccessfully: boolean;
  restoreVerifiedAt: string;
  previewEvidence?: string;
  approvalRef?: string;
}

export function validateSchemaTarget(
  options: Record<string, string | boolean | undefined>,
  environment: NodeJS.ProcessEnv,
  linkedProjectId: string,
  restore?: SchemaRestoreRecord,
  now = Date.now(),
): void {
  const target = options.target;
  if (target !== "preview" && target !== "production")
    throw new Error("Pass --target preview|production");
  if (environment.VERCEL_ENV !== target)
    throw new Error("Deployment environment does not match target");
  if (
    typeof options.project !== "string" ||
    !options.project.startsWith("prj_") ||
    options.project !== linkedProjectId
  )
    throw new Error("Linked project does not match --project");
  if (
    environment.VERCEL_PROJECT_ID &&
    environment.VERCEL_PROJECT_ID !== options.project
  )
    throw new Error("Runtime project does not match --project");
  const url = new URL(environment.TURSO_DATABASE_URL ?? "invalid:");
  if (
    url.protocol !== "libsql:" ||
    url.username ||
    url.password ||
    url.port ||
    url.search ||
    url.hash ||
    (url.pathname && url.pathname !== "/") ||
    !options["database-host"] ||
    url.hostname !== options["database-host"] ||
    !environment.TURSO_AUTH_TOKEN?.trim()
  )
    throw new Error("Explicit remote database identity and token are required");
  if (!options.apply) return;
  if (
    !restore ||
    restore.target !== target ||
    restore.projectId !== options.project ||
    restore.databaseHost !== url.hostname ||
    !restore.backupRef?.trim() ||
    !restore.sourceRef?.trim() ||
    restore.restoredSuccessfully !== true
  )
    throw new Error(
      "A matching tested database/source restore record is required before writes",
    );
  const restored = Date.parse(restore.restoreVerifiedAt);
  if (
    !Number.isFinite(restored) ||
    restored > now ||
    now - restored > 86_400_000
  )
    throw new Error(
      "Restore verification must be within the preceding 24 hours",
    );
  if (
    target === "production" &&
    (!restore.previewEvidence?.trim() || !restore.approvalRef?.trim())
  )
    throw new Error(
      "Production additionally requires Preview evidence and explicit approval reference",
    );
}
