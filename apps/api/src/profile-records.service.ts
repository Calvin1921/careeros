import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { createHash, randomUUID } from "node:crypto";
import { pool, transaction } from "@careeros/data";
import {
  experienceKinds,
  httpUrl,
  mapExperience,
  object,
  oneOf,
  optionalString,
  proposeExperiences,
  requiredString,
  stringList,
  uuid,
} from "./profile.shared";

@Injectable()
export class ProfileRecordsService {
  async importDetail(idValue: string) {
    const row = (
      await pool.query("SELECT * FROM cv_imports WHERE id=$1", [uuid(idValue)])
    ).rows[0];
    if (!row) throw new NotFoundException("CV import not found.");
    return row;
  }
  async updateProfile(body: unknown) {
    const data = object(body);
    const value = {
      fullName: optionalString(data.fullName, "Full name", 200),
      headline: optionalString(data.headline, "Headline", 300),
      email: optionalString(data.email, "Email", 320),
      phone: optionalString(data.phone, "Phone", 80),
      location: optionalString(data.location, "Location", 200),
      websiteUrl:
        data.websiteUrl === undefined
          ? undefined
          : httpUrl(
              optionalString(data.websiteUrl, "Website URL", 1000) ?? "",
              "Website URL",
            ),
      linkedinUrl:
        data.linkedinUrl === undefined
          ? undefined
          : httpUrl(
              optionalString(data.linkedinUrl, "LinkedIn URL", 1000) ?? "",
              "LinkedIn URL",
            ),
      summary: optionalString(data.summary, "Summary", 5000),
    };
    if (!Object.values(value).some((item) => item !== undefined))
      throw new BadRequestException(
        "Provide at least one profile field to update.",
      );
    if (value.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.email))
      throw new BadRequestException("Email is invalid.");
    return transaction(async (db) => {
      await db.query(
        "INSERT INTO candidate_profile(singleton,id) VALUES(true,$1) ON CONFLICT(singleton) DO NOTHING",
        [randomUUID()],
      );
      return (
        await db.query(
          `UPDATE candidate_profile SET full_name=COALESCE($1,full_name),headline=COALESCE($2,headline),email=COALESCE($3,email),phone=COALESCE($4,phone),location=COALESCE($5,location),website_url=COALESCE($6,website_url),linkedin_url=COALESCE($7,linkedin_url),summary=COALESCE($8,summary),updated_at=now() WHERE singleton=true RETURNING *`,
          [
            value.fullName ?? null,
            value.headline ?? null,
            value.email ?? null,
            value.phone ?? null,
            value.location ?? null,
            value.websiteUrl ?? null,
            value.linkedinUrl ?? null,
            value.summary ?? null,
          ],
        )
      ).rows[0];
    });
  }
  async importCv(body: unknown) {
    const data = object(body),
      sourceKind = oneOf(
        data.sourceKind,
        ["paste", "text", "json"] as const,
        "Source kind",
      );
    const content = requiredString(data.content, "CV content", 1, 90000),
      filename = optionalString(data.filename, "Filename", 255) ?? null;
    if (sourceKind !== "paste" && !filename)
      throw new BadRequestException("A filename is required for file imports.");
    const id = randomUUID(),
      proposals = proposeExperiences(id, sourceKind, content);
    const originalJson = sourceKind === "json" ? JSON.parse(content) : null;
    return transaction(async (db) => {
      await db.query(
        "INSERT INTO cv_imports(id,source_kind,filename,original_text,original_json,source_sha256) VALUES($1,$2,$3,$4,$5,$6)",
        [
          id,
          sourceKind,
          filename,
          content,
          originalJson === null ? null : JSON.stringify(originalJson),
          createHash("sha256").update(content).digest("hex"),
        ],
      );
      for (const proposal of proposals)
        await db.query(
          `INSERT INTO profile_experiences(id,import_id,kind,employer,role_title,start_date,end_date,location,summary,source_refs,unresolved_questions) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
          [
            randomUUID(),
            id,
            proposal.kind,
            proposal.employer,
            proposal.roleTitle,
            proposal.startDate,
            proposal.endDate,
            proposal.location,
            proposal.summary,
            JSON.stringify(proposal.sourceRefs),
            JSON.stringify(proposal.unresolvedQuestions),
          ],
        );
      return { id, sourceKind, filename, proposalCount: proposals.length };
    });
  }
  async createExperience(body: unknown) {
    const data = object(body),
      kind = oneOf(data.kind ?? "other", experienceKinds, "Experience kind"),
      summary = requiredString(data.summary, "Summary", 5, 5000);
    const row = (
      await pool.query(
        `INSERT INTO profile_experiences(id,kind,employer,role_title,start_date,end_date,location,summary,source_refs,unresolved_questions) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
        [
          randomUUID(),
          kind,
          optionalString(data.employer, "Employer", 300) ?? "",
          optionalString(data.roleTitle, "Role title", 300) ?? "",
          optionalString(data.startDate, "Start date", 80) ?? "",
          optionalString(data.endDate, "End date", 80) ?? "",
          optionalString(data.location, "Location", 200) ?? "",
          summary,
          JSON.stringify([{ type: "user-entry" }]),
          JSON.stringify([]),
        ],
      )
    ).rows[0];
    return mapExperience(row);
  }
  async updateExperience(idValue: string, body: unknown) {
    const id = uuid(idValue),
      data = object(body);
    if (typeof data.attested !== "boolean")
      throw new BadRequestException(
        "Choose whether you attest this experience before saving.",
      );
    return transaction(async (db) => {
      const current = (
        await db.query(
          "SELECT * FROM profile_experiences WHERE id=$1 FOR UPDATE",
          [id],
        )
      ).rows[0];
      if (!current) throw new NotFoundException("Experience not found.");
      const next = {
        kind:
          data.kind === undefined
            ? current.kind
            : oneOf(data.kind, experienceKinds, "Experience kind"),
        employer:
          optionalString(data.employer, "Employer", 300) ?? current.employer,
        roleTitle:
          optionalString(data.roleTitle, "Role title", 300) ??
          current.role_title,
        startDate:
          optionalString(data.startDate, "Start date", 80) ??
          current.start_date,
        endDate:
          optionalString(data.endDate, "End date", 80) ?? current.end_date,
        location:
          optionalString(data.location, "Location", 200) ?? current.location,
        summary:
          data.summary === undefined
            ? current.summary
            : requiredString(data.summary, "Summary", 5, 5000),
        unresolvedQuestions:
          data.unresolvedQuestions === undefined
            ? current.unresolved_questions
            : stringList(
                data.unresolvedQuestions,
                "Unresolved questions",
                30,
                500,
              ),
      };
      if (data.attested && next.unresolvedQuestions.length)
        throw new ConflictException(
          "Resolve or remove every open question before confirming this experience.",
        );
      if (
        data.attested &&
        next.kind === "experience" &&
        (!next.employer || !next.roleTitle)
      )
        throw new ConflictException(
          "Confirmed work experience needs both an employer and role title.",
        );
      return mapExperience(
        (
          await db.query(
            `UPDATE profile_experiences SET kind=$2,employer=$3,role_title=$4,start_date=$5,end_date=$6,location=$7,summary=$8,unresolved_questions=$9,status=$10,confirmed_at=CASE WHEN $10='confirmed' THEN now() ELSE NULL END,updated_at=now() WHERE id=$1 RETURNING *`,
            [
              id,
              next.kind,
              next.employer,
              next.roleTitle,
              next.startDate,
              next.endDate,
              next.location,
              next.summary,
              JSON.stringify(next.unresolvedQuestions),
              data.attested ? "confirmed" : "proposed",
            ],
          )
        ).rows[0],
      );
    });
  }
}
