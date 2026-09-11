import { Injectable } from "@nestjs/common";
import { pool, SqlMemoryPort } from "@careeros/data";
import type { CurrentStageRow, StageEventRow } from "../intelligence.analytics";
@Injectable()
export class IntelligenceRepository {
  readonly memory = new SqlMemoryPort(pool);
  analyticsRows() {
    return Promise.all([
      pool.query<CurrentStageRow>(
        "SELECT stage,count(*)::int AS count FROM applications GROUP BY stage",
      ),
      pool.query<StageEventRow>(
        "SELECT application_id,from_stage,to_stage,created_at,event_kind FROM stage_events ORDER BY application_id,created_at,id",
      ),
    ]);
  }
}
