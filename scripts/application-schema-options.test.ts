import {
  validateSchemaTarget,
  type SchemaRestoreRecord,
} from "./application-schema-options";
const now = Date.parse("2026-09-19T00:00:00Z");
const options = {
  target: "preview",
  project: "prj_fixture",
  "database-host": "fixture.invalid",
};
const env = {
  VERCEL_ENV: "preview",
  TURSO_DATABASE_URL: "libsql://fixture.invalid",
  TURSO_AUTH_TOKEN: "test",
};
const restore: SchemaRestoreRecord = {
  target: "preview",
  projectId: "prj_fixture",
  databaseHost: "fixture.invalid",
  backupRef: "fixture-backup",
  sourceRef: "fixture-source",
  restoredSuccessfully: true,
  restoreVerifiedAt: new Date(now).toISOString(),
};
function validate(
  selectedOptions = options,
  environment = env,
  linkedProjectId = "prj_fixture",
  selectedRestore: SchemaRestoreRecord | undefined = undefined,
  selectedNow = now,
) {
  return validateSchemaTarget({
    options: selectedOptions,
    environment,
    linkedProjectId,
    restore: selectedRestore,
    now: selectedNow,
  });
}
it("permits read-only verification only for matching explicit identity", () => {
  expect(() => validate()).not.toThrow();
});
it.each([
  [{ ...options, target: "production" }, env, "prj_fixture"],
  [options, env, "prj_wrong"],
  [options, { ...env, TURSO_DATABASE_URL: "file:local.db" }, "prj_fixture"],
  [
    options,
    { ...env, TURSO_DATABASE_URL: "libsql://other.invalid" },
    "prj_fixture",
  ],
  [options, { ...env, TURSO_AUTH_TOKEN: "" }, "prj_fixture"],
  [options, { ...env, VERCEL_PROJECT_ID: "prj_wrong" }, "prj_fixture"],
])("rejects ambiguous or mismatched target %#", (o, e, p) => {
  expect(() => validate(o, e, p)).toThrow();
});
it("requires recent proven matching restores for apply", () => {
  const apply = { ...options, apply: true };
  expect(() => validate(apply)).toThrow();
  expect(() => validate(apply, env, "prj_fixture", { ...restore, restoredSuccessfully: false })).toThrow();
  expect(() => validate(apply, env, "prj_fixture", restore, now + 86_400_001)).toThrow();
  expect(() => validate(apply, env, "prj_fixture", restore)).not.toThrow();
});
it("requires separate Production approval and Preview evidence", () => {
  const o = { ...options, target: "production", apply: true };
  const e = { ...env, VERCEL_ENV: "production" };
  const r = { ...restore, target: "production" };
  expect(() => validate(o, e, "prj_fixture", r)).toThrow();
  expect(() =>
    validate(
      o,
      e,
      "prj_fixture",
      { ...r, approvalRef: "owner-record", previewEvidence: "preview-record" },
    ),
  ).not.toThrow();
});
