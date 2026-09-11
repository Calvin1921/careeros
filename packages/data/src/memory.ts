import { randomUUID } from "node:crypto";
import type { MemoryPort } from "@careeros/domain";

export interface QueryResult<Row> {
  rows: Row[];
  rowCount: number | null;
}

export interface Queryable {
  query<Row extends Record<string, unknown> = Record<string, unknown>>(
    text: string,
    values?: unknown[],
  ): Promise<QueryResult<Row>>;
}

export interface MemoryEntry {
  id: string;
  scope: string;
  sourceId: string;
  content: string;
  verified: boolean;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
  confirmedAt: string | null;
  correctionSourceId: string | null;
}

export class MemoryNotFoundError extends Error {
  constructor() {
    super("Memory entry not found in this scope");
    this.name = "MemoryNotFoundError";
  }
}

type MemoryRow = {
  id: string;
  scope: string;
  source_id: string;
  content: string;
  verified: boolean;
  expires_at: Date | string | null;
  created_at: Date | string;
  updated_at: Date | string;
  confirmed_at: Date | string | null;
  correction_source_id: string | null;
};

function iso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value;
}

function entry(row: MemoryRow): MemoryEntry {
  return {
    id: row.id,
    scope: row.scope,
    sourceId: row.source_id,
    content: row.content,
    verified: row.verified,
    expiresAt: row.expires_at === null ? null : iso(row.expires_at),
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
    confirmedAt: row.confirmed_at === null ? null : iso(row.confirmed_at),
    correctionSourceId: row.correction_source_id,
  };
}

const columns = `id,scope,source_id,content,verified,expires_at,created_at,
  updated_at,confirmed_at,correction_source_id`;

/**
 * SQL-backed proposed memory. Even a verified entry remains an episodic note;
 * callers must never treat it as a canonical career fact.
 */
export class SqlMemoryPort implements MemoryPort {
  constructor(private readonly db: Queryable) {}

  async propose(value: {
    scope: string;
    sourceId: string;
    content: string;
    expiresAt?: string;
  }): Promise<string> {
    const id = randomUUID();
    await this.db.query(
      `INSERT INTO memory_entries(id,scope,source_id,content,verified,expires_at)
       VALUES($1,$2,$3,$4,false,$5)`,
      [id, value.scope, value.sourceId, value.content, value.expiresAt ?? null],
    );
    return id;
  }

  async retrieve(scope: string): Promise<MemoryEntry[]> {
    const result = await this.db.query<MemoryRow>(
      `SELECT ${columns}
       FROM memory_entries
       WHERE scope=$1 AND (expires_at IS NULL OR expires_at > now())
       ORDER BY verified DESC, updated_at DESC, id`,
      [scope],
    );
    return result.rows.map(entry);
  }

  async confirm(id: string, scope: string): Promise<MemoryEntry> {
    const result = await this.db.query<MemoryRow>(
      `UPDATE memory_entries
       SET verified=true,confirmed_at=now(),updated_at=now()
       WHERE id=$1 AND scope=$2 AND (expires_at IS NULL OR expires_at > now())
       RETURNING ${columns}`,
      [id, scope],
    );
    if (!result.rows[0]) throw new MemoryNotFoundError();
    return entry(result.rows[0]);
  }

  async correct(
    id: string,
    scope: string,
    value: { content: string; correctionSourceId: string },
  ): Promise<MemoryEntry> {
    const result = await this.db.query<MemoryRow>(
      `UPDATE memory_entries
       SET content=$3,verified=false,confirmed_at=NULL,updated_at=now(),
           correction_source_id=$4
       WHERE id=$1 AND scope=$2 AND (expires_at IS NULL OR expires_at > now())
       RETURNING ${columns}`,
      [id, scope, value.content, value.correctionSourceId],
    );
    if (!result.rows[0]) throw new MemoryNotFoundError();
    return entry(result.rows[0]);
  }

  async forget(id: string, scope: string): Promise<void> {
    const result = await this.db.query(
      "DELETE FROM memory_entries WHERE id=$1 AND scope=$2",
      [id, scope],
    );
    if (!result.rowCount) throw new MemoryNotFoundError();
  }
}
