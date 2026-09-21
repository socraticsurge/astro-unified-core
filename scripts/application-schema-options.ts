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
const TARGET_ERROR = "Pass --target preview|production";
const PROJECT_ERROR = "Linked project does not match --project";
const DATABASE_ERROR = "Explicit remote database identity and token are required";
const RESTORE_ERROR =
  "A matching tested database/source restore record is required before writes";
const RESTORE_AGE_ERROR =
  "Restore verification must be within the preceding 24 hours";

function requireCondition(
  condition: unknown,
  message: string,
): asserts condition {
  if (!condition) throw new Error(message);
}

function parseTarget(value: string | boolean | undefined): SchemaTarget {
  requireCondition(value === "preview" || value === "production", TARGET_ERROR);
  return value;
}

function validateProject(
  project: string | boolean | undefined,
  linkedProjectId: string,
  runtimeProjectId: string | undefined,
): string {
  requireCondition(typeof project === "string", PROJECT_ERROR);
  requireCondition(project.startsWith("prj_"), PROJECT_ERROR);
  requireCondition(project === linkedProjectId, PROJECT_ERROR);
  requireCondition(
    !runtimeProjectId || runtimeProjectId === project,
    "Runtime project does not match --project",
  );
  return project;
}

function validateDatabase(
  environment: NodeJS.ProcessEnv,
  requestedHost: string | boolean | undefined,
): string {
  const url = new URL(environment.TURSO_DATABASE_URL ?? "invalid:");
  const disallowedUrlParts = [
    url.username,
    url.password,
    url.port,
    url.search,
    url.hash,
  ];
  requireCondition(url.protocol === "libsql:", DATABASE_ERROR);
  requireCondition(disallowedUrlParts.every((value) => !value), DATABASE_ERROR);
  requireCondition(!url.pathname || url.pathname === "/", DATABASE_ERROR);
  requireCondition(typeof requestedHost === "string", DATABASE_ERROR);
  requireCondition(url.hostname === requestedHost, DATABASE_ERROR);
  requireCondition(environment.TURSO_AUTH_TOKEN?.trim(), DATABASE_ERROR);
  return url.hostname;
}

function validateRestoreIdentity(
  restore: SchemaRestoreRecord | undefined,
  target: SchemaTarget,
  projectId: string,
  databaseHost: string,
): SchemaRestoreRecord {
  requireCondition(restore, RESTORE_ERROR);
  requireCondition(restore.target === target, RESTORE_ERROR);
  requireCondition(restore.projectId === projectId, RESTORE_ERROR);
  requireCondition(restore.databaseHost === databaseHost, RESTORE_ERROR);
  requireCondition(restore.restoredSuccessfully === true, RESTORE_ERROR);
  requireCondition(restore.backupRef?.trim(), RESTORE_ERROR);
  requireCondition(restore.sourceRef?.trim(), RESTORE_ERROR);
  return restore;
}

function validateRestoreAge(restore: SchemaRestoreRecord, now: number): void {
  const restored = Date.parse(restore.restoreVerifiedAt);
  requireCondition(Number.isFinite(restored), RESTORE_AGE_ERROR);
  requireCondition(restored <= now, RESTORE_AGE_ERROR);
  requireCondition(now - restored <= 86_400_000, RESTORE_AGE_ERROR);
}

function validateProductionEvidence(
  target: SchemaTarget,
  restore: SchemaRestoreRecord,
): void {
  if (target !== "production") return;
  const error =
    "Production additionally requires Preview evidence and explicit approval reference";
  requireCondition(restore.previewEvidence?.trim(), error);
  requireCondition(restore.approvalRef?.trim(), error);
}

export function validateSchemaTarget({
  options,
  environment,
  linkedProjectId,
  restore,
  now = Date.now(),
}: SchemaTargetValidation): void {
  const target = parseTarget(options.target);
  requireCondition(
    environment.VERCEL_ENV === target,
    "Deployment environment does not match target",
  );
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
