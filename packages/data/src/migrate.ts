import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { pool, transaction } from "./index";
async function migrate() {
  await transaction(async (client) => {
    await client.query("SELECT pg_advisory_xact_lock(78341021)");
    await client.query(
      "CREATE TABLE IF NOT EXISTS schema_migrations(name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())",
    );
    const directory = resolve(__dirname, "../migrations");
    for (const name of readdirSync(directory)
      .filter((x) => x.endsWith(".sql"))
      .sort()) {
      if (
        (
          await client.query("SELECT 1 FROM schema_migrations WHERE name=$1", [
            name,
          ])
        ).rowCount
      )
        continue;
      await client.query(readFileSync(resolve(directory, name), "utf8"));
      await client.query("INSERT INTO schema_migrations(name) VALUES($1)", [
        name,
      ]);
      console.log("Applied", name);
    }
  });
}
migrate()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
