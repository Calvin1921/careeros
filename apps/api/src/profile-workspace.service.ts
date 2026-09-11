import { Injectable } from "@nestjs/common";
import { pool } from "@careeros/data";
import { mapExperience, readiness, type EvidenceKind } from "./profile.shared";

@Injectable()
export class ProfileWorkspaceService {
  async get() {
    const [
      profile,
      imports,
      experiences,
      versions,
      capabilities,
      evidence,
      milestones,
    ] = await Promise.all([
      pool.query("SELECT * FROM candidate_profile WHERE singleton=true"),
      pool.query(
        "SELECT id,source_kind,filename,source_sha256,created_at,left(original_text,240) AS preview FROM cv_imports ORDER BY created_at DESC",
      ),
      pool.query("SELECT * FROM profile_experiences ORDER BY created_at DESC"),
      pool.query("SELECT * FROM profile_versions ORDER BY version_number DESC"),
      pool.query("SELECT * FROM capabilities ORDER BY created_at"),
      pool.query("SELECT * FROM evidence ORDER BY created_at"),
      pool.query(
        "SELECT * FROM learning_milestones ORDER BY week_start,created_at",
      ),
    ]);
    const evidenceRows = evidence.rows as Array<
      Record<string, unknown> & {
        capability_id: string;
        kind: EvidenceKind;
        verified: boolean;
        attested_at: string | null;
      }
    >;
    return {
      profile: profile.rows[0] ?? null,
      imports: imports.rows.map((row) => ({
        id: row.id,
        sourceKind: row.source_kind,
        filename: row.filename,
        sourceSha256: row.source_sha256,
        preview: row.preview,
        createdAt: row.created_at,
      })),
      experiences: experiences.rows.map(mapExperience),
      versions: versions.rows.map((row) => ({
        id: row.id,
        versionNumber: row.version_number,
        profileSnapshot: row.profile_snapshot,
        experienceSnapshot: row.experience_snapshot,
        evidenceSnapshot: row.evidence_snapshot,
        sourceImportIds: row.source_import_ids,
        createdAt: row.created_at,
      })),
      capabilities: capabilities.rows.map((capability) => {
        const items = evidenceRows.filter(
          (item) => item.capability_id === capability.id,
        );
        return { ...capability, evidence: items, readiness: readiness(items) };
      }),
      milestones: milestones.rows.map((row) => ({
        ...row,
        weekly_hours: Number(row.weekly_hours),
      })),
    };
  }
}
