import {
  BadRequestException,
  ConflictException,
  Injectable,
} from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { transaction } from "@careeros/data";
import {
  assertSelectedEvidenceIsAttested,
  confirmedExperiencesForSnapshot,
  mapExperience,
  object,
  stringList,
  uuid,
} from "./profile.shared";

@Injectable()
export class ProfileVersionService {
  async create(body: unknown) {
    const data = object(body);
    const selected =
      data.selectedEvidenceIds === undefined
        ? []
        : stringList(
            data.selectedEvidenceIds,
            "Selected evidence IDs",
            100,
            36,
          ).map((id) => uuid(id, "Evidence ID"));
    if (new Set(selected).size !== selected.length)
      throw new BadRequestException("Selected evidence IDs must be unique.");
    return transaction(async (db) => {
      await db.query("SELECT pg_advisory_xact_lock(78341022)");
      const profile = (
        await db.query(
          "SELECT * FROM candidate_profile WHERE singleton=true FOR UPDATE",
        )
      ).rows[0];
      if (!profile?.full_name)
        throw new ConflictException(
          "Add your full name before confirming a profile version.",
        );
      const experiences = confirmedExperiencesForSnapshot(
        (
          await db.query(
            "SELECT * FROM profile_experiences ORDER BY created_at FOR SHARE",
          )
        ).rows,
      );
      if (!experiences.length)
        throw new ConflictException(
          "Confirm at least one source-backed experience before creating a version.",
        );
      const evidenceRows = selected.length
        ? (
            await db.query(
              `SELECT e.*,c.name AS capability_name FROM evidence e JOIN capabilities c ON c.id=e.capability_id WHERE e.id=ANY($1::uuid[]) ORDER BY e.created_at FOR SHARE OF e`,
              [selected],
            )
          ).rows
        : [];
      const evidence = assertSelectedEvidenceIsAttested(evidenceRows, selected);
      const versionNumber = Number(
        (
          await db.query(
            "SELECT COALESCE(max(version_number),0)+1 AS next FROM profile_versions",
          )
        ).rows[0].next,
      );
      const profileSnapshot = {
        fullName: profile.full_name,
        headline: profile.headline,
        email: profile.email,
        phone: profile.phone,
        location: profile.location,
        websiteUrl: profile.website_url,
        linkedinUrl: profile.linkedin_url,
        summary: profile.summary,
      };
      const experienceSnapshot = experiences.map(mapExperience);
      const evidenceSnapshot = evidence.map((item) => ({
        id: item.id,
        capabilityId: item.capability_id,
        capabilityName: item.capability_name,
        kind: item.kind,
        summary: item.summary,
        sourceUrl: item.source_url,
        sourceLabel: item.source_label,
        attestedAt: item.attested_at,
      }));
      const sourceImportIds = [
        ...new Set(experiences.map((item) => item.import_id).filter(Boolean)),
      ];
      const id = randomUUID();
      const row = (
        await db.query(
          `INSERT INTO profile_versions(id,version_number,profile_snapshot,experience_snapshot,evidence_snapshot,source_import_ids) VALUES($1,$2,$3,$4,$5,$6) RETURNING *`,
          [
            id,
            versionNumber,
            JSON.stringify(profileSnapshot),
            JSON.stringify(experienceSnapshot),
            JSON.stringify(evidenceSnapshot),
            sourceImportIds,
          ],
        )
      ).rows[0];
      return {
        id: row.id,
        versionNumber: row.version_number,
        profileSnapshot,
        experienceSnapshot,
        evidenceSnapshot,
        sourceImportIds,
        createdAt: row.created_at,
      };
    });
  }
}
