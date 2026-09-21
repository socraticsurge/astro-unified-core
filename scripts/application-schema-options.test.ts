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
interface ValidationOverrides {
  options?: typeof options;
  environment?: typeof env;
  linkedProjectId?: string;
  restore?: SchemaRestoreRecord;
  now?: number;
}
function validate(overrides: ValidationOverrides = {}) {
  return validateSchemaTarget({
    options: overrides.options ?? options,
    environment: overrides.environment ?? env,
    linkedProjectId: overrides.linkedProjectId ?? "prj_fixture",
    restore: overrides.restore,
    now: overrides.now ?? now,
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
  expect(() =>
    validate({ options: o, environment: e, linkedProjectId: p }),
  ).toThrow();
});
it("requires recent proven matching restores for apply", () => {
  const apply = { ...options, apply: true };
  expect(() => validate({ options: apply })).toThrow();
  expect(() =>
    validate({
      options: apply,
      restore: { ...restore, restoredSuccessfully: false },
    }),
  ).toThrow();
  expect(() =>
    validate({ options: apply, restore, now: now + 86_400_001 }),
  ).toThrow();
  expect(() => validate({ options: apply, restore })).not.toThrow();
});
it("requires separate Production approval and Preview evidence", () => {
  const o = { ...options, target: "production", apply: true };
  const e = { ...env, VERCEL_ENV: "production" };
  const r = { ...restore, target: "production" };
  expect(() => validate({ options: o, environment: e, restore: r })).toThrow();
  expect(() =>
    validate({
      options: o,
      environment: e,
      restore: {
        ...r,
        approvalRef: "owner-record",
        previewEvidence: "preview-record",
      },
    }),
  ).not.toThrow();
});
