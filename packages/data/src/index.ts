import { Pool, PoolClient } from "pg";
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
});
export async function transaction<T>(
  run: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const value = await run(client);
    await client.query("COMMIT");
    return value;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export { SqlMemoryPort, MemoryNotFoundError } from "./memory";
