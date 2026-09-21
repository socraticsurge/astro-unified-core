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

interface SchemaTargetValidation {
  options: Record<string, string | boolean | undefined>;
  environment: NodeJS.ProcessEnv;
  linkedProjectId: string;
  restore?: SchemaRestoreRecord;
  now?: number;
}

type SchemaTarget = "preview" | "production";

function parseTarget(value: string | boolean | undefined): SchemaTarget {
  if (value !== "preview" && value !== "production")
    throw new Error("Pass --target preview|production");
  return value;
}

function validateProject(
  project: string | boolean | undefined,
  linkedProjectId: string,
  runtimeProjectId: string | undefined,
): string {
  if (typeof project !== "string" || !project.startsWith("prj_"))
    throw new Error("Linked project does not match --project");
  if (project !== linkedProjectId)
    throw new Error("Linked project does not match --project");
  if (runtimeProjectId && runtimeProjectId !== project)
    throw new Error("Runtime project does not match --project");
  return project;
}

function validateDatabase(
  environment: NodeJS.ProcessEnv,
  requestedHost: string | boolean | undefined,
): string {
  const url = new URL(environment.TURSO_DATABASE_URL ?? "invalid:");
  const isRemoteLibsql = url.protocol === "libsql:";
  const hasOnlyHost =
    !url.username &&
    !url.password &&
    !url.port &&
    !url.search &&
    !url.hash &&
    (!url.pathname || url.pathname === "/");
  if (!isRemoteLibsql || !hasOnlyHost)
    throw new Error("Explicit remote database identity and token are required");
  if (typeof requestedHost !== "string" || url.hostname !== requestedHost)
    throw new Error("Explicit remote database identity and token are required");
  if (!environment.TURSO_AUTH_TOKEN?.trim())
    throw new Error("Explicit remote database identity and token are required");
  return url.hostname;
}

function validateRestoreIdentity(
  restore: SchemaRestoreRecord | undefined,
  target: SchemaTarget,
  projectId: string,
  databaseHost: string,
): SchemaRestoreRecord {
  if (!restore) throw new Error("A matching tested database/source restore record is required before writes");
  if (restore.target !== target || restore.projectId !== projectId)
    throw new Error("A matching tested database/source restore record is required before writes");
  if (restore.databaseHost !== databaseHost || restore.restoredSuccessfully !== true)
    throw new Error("A matching tested database/source restore record is required before writes");
  if (!restore.backupRef?.trim() || !restore.sourceRef?.trim())
    throw new Error("A matching tested database/source restore record is required before writes");
  return restore;
}

function validateRestoreAge(restore: SchemaRestoreRecord, now: number): void {
  const restored = Date.parse(restore.restoreVerifiedAt);
  if (!Number.isFinite(restored) || restored > now)
    throw new Error("Restore verification must be within the preceding 24 hours");
  if (now - restored > 86_400_000)
    throw new Error("Restore verification must be within the preceding 24 hours");
}

function validateProductionEvidence(
  target: SchemaTarget,
  restore: SchemaRestoreRecord,
): void {
  if (target !== "production") return;
  if (!restore.previewEvidence?.trim() || !restore.approvalRef?.trim())
    throw new Error(
      "Production additionally requires Preview evidence and explicit approval reference",
    );
}

export function validateSchemaTarget({
  options,
  environment,
  linkedProjectId,
  restore,
  now = Date.now(),
}: SchemaTargetValidation): void {
  const target = parseTarget(options.target);
  if (environment.VERCEL_ENV !== target)
    throw new Error("Deployment environment does not match target");
  const projectId = validateProject(
    options.project,
    linkedProjectId,
    environment.VERCEL_PROJECT_ID,
  );
  const databaseHost = validateDatabase(environment, options["database-host"]);
  if (!options.apply) return;
  const record = validateRestoreIdentity(restore, target, projectId, databaseHost);
  validateRestoreAge(record, now);
  validateProductionEvidence(target, record);
}
