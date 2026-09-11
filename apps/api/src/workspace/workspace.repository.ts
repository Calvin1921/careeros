import { Injectable } from "@nestjs/common";
import { pool } from "@careeros/data";
@Injectable()
export class WorkspaceRepository {
  async overview(date: string) {
    const [decisions, materials, claims, counts] = await Promise.all([
      pool.query(
        `SELECT d.id,d.job_id,d.title,d.due_date::text,j.company,j.title AS role_title
        FROM application_decision_tasks d JOIN jobs j ON j.id=d.job_id
        JOIN applications a ON a.job_id=j.id
        WHERE d.completed_at IS NULL AND d.due_date <= $1::date
          AND a.stage NOT IN ('accepted','rejected','withdrawn')
        ORDER BY d.due_date,d.created_at`,
        [date],
      ),
      pool.query(`SELECT j.id,j.company,j.title, EXISTS (SELECT 1 FROM artifacts ar WHERE ar.job_id=j.id AND ar.kind='application-package' AND ar.status='ready') AS has_draft FROM jobs j JOIN applications a ON a.job_id=j.id
        WHERE a.stage='shortlisted'
        ORDER BY a.updated_at`),
      pool.query(`SELECT id,employer,role_title,summary FROM profile_experiences
        WHERE status='proposed' ORDER BY created_at`),
      pool.query(`SELECT count(*)::int AS total,
        count(*) FILTER (WHERE stage IN ('applied','screening','interview'))::int AS active
        FROM applications`),
    ]);
    return {
      today: date,
      decisions: decisions.rows,
      missingMaterials: materials.rows,
      pendingClaims: claims.rows,
      counts: counts.rows[0],
    };
  }
}
