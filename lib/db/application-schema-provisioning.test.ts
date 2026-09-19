import { createClient } from "@libsql/client";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

describe("explicit application schema provisioning", () => {
  it("provisions fresh storage, preserves v12 data and seed choices, and detects subsequent drift read-only", async () => {
    const dir = mkdtempSync(join(tmpdir(), "astro-schema-"));
    const url = `file:${join(dir, "test.db")}`;
    const original = process.env.TURSO_DATABASE_URL;
    process.env.TURSO_DATABASE_URL = url;
    vi.resetModules();
    const { provisionApplicationSchema, getClient } = await import("./client");
    const { verifyApplicationSchema } =
      await import("./application-schema-readiness");
    const db = createClient({ url });
    try {
      await provisionApplicationSchema();
      await verifyApplicationSchema(db);
      await db.execute(
        "UPDATE settings SET value='true' WHERE key='live_consultation_enabled'",
      );
      await db.execute(
        "INSERT INTO users(id,name,email) VALUES('fixture','Synthetic','fixture@example.invalid')",
      );
      await db.execute("UPDATE schema_version SET version=11 WHERE id=1");
      await db.execute("ALTER TABLE profiles DROP COLUMN gender");
      await expect(verifyApplicationSchema(db)).rejects.toThrow(
        "Application storage is temporarily unavailable",
      );
      getClient().close();
      vi.resetModules();
      const second = await import("./client");
      await second.provisionApplicationSchema();
      expect(
        (
          await db.execute(
            "SELECT value FROM settings WHERE key='live_consultation_enabled'",
          )
        ).rows[0][0],
      ).toBe("true");
      expect(
        (await db.execute("SELECT name FROM users WHERE id='fixture'"))
          .rows[0][0],
      ).toBe("Synthetic");
      await verifyApplicationSchema(db);
      await db.execute("DROP INDEX idx_profiles_user");
      const before = await db.execute(
        "SELECT sql FROM sqlite_schema ORDER BY name",
      );
      await expect(verifyApplicationSchema(db)).rejects.toThrow(
        "Application storage is temporarily unavailable",
      );
      expect(
        (await db.execute("SELECT sql FROM sqlite_schema ORDER BY name")).rows,
      ).toEqual(before.rows);
      second.getClient().close();
    } finally {
      db.close();
      if (original === undefined) delete process.env.TURSO_DATABASE_URL;
      else process.env.TURSO_DATABASE_URL = original;
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
