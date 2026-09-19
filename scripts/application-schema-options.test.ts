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
it("permits read-only verification only for matching explicit identity", () => {
  expect(() =>
    validateSchemaTarget(options, env, "prj_fixture", undefined, now),
  ).not.toThrow();
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
  expect(() => validateSchemaTarget(o, e, p, undefined, now)).toThrow();
});
it("requires recent proven matching restores for apply", () => {
  const apply = { ...options, apply: true };
  expect(() =>
    validateSchemaTarget(apply, env, "prj_fixture", undefined, now),
  ).toThrow();
  expect(() =>
    validateSchemaTarget(
      apply,
      env,
      "prj_fixture",
      { ...restore, restoredSuccessfully: false },
      now,
    ),
  ).toThrow();
  expect(() =>
    validateSchemaTarget(apply, env, "prj_fixture", restore, now + 86_400_001),
  ).toThrow();
  expect(() =>
    validateSchemaTarget(apply, env, "prj_fixture", restore, now),
  ).not.toThrow();
});
it("requires separate Production approval and Preview evidence", () => {
  const o = { ...options, target: "production", apply: true };
  const e = { ...env, VERCEL_ENV: "production" };
  const r = { ...restore, target: "production" };
  expect(() => validateSchemaTarget(o, e, "prj_fixture", r, now)).toThrow();
  expect(() =>
    validateSchemaTarget(
      o,
      e,
      "prj_fixture",
      { ...r, approvalRef: "owner-record", previewEvidence: "preview-record" },
      now,
    ),
  ).not.toThrow();
});
