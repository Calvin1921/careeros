import {
  Injectable,
  BadRequestException,
  ConflictException,
} from "@nestjs/common";
import { DiscoveryRepository } from "./discovery.repository";
import { MatchingRepository } from "../matching/matching.repository";
import {
  profileSignals,
  scheduledSlot,
  scannerVersion,
} from "./discovery.rules";
import { parseSettings } from "./discovery.schemas";
@Injectable()
export class DiscoveryService {
  constructor(
    private readonly repository: DiscoveryRepository,
    private readonly matching: MatchingRepository,
  ) {}
  async overview() {
    const [settings, profile, runs, criteria] = await Promise.all([
      this.repository.settings(),
      this.repository.profile(),
      this.repository.runs(),
      this.matching.criteria(),
    ]);
    return {
      settings,
      runs,
      signals: {
        ...profileSignals(profile.text, profile.conversationFacts),
        cvImportId: profile.cvImportId,
        conversationFacts: profile.conversationFacts,
      },
      criteria: criteria ?? null,
    };
  }
  saveSettings(body: unknown) {
    const value = parseSettings(body);
    return this.repository.saveSettings(value.sources, value.scheduleTimes);
  }
  async scan(trigger = "manual", slot: string | null = null) {
    const [profile, settings] = await Promise.all([
      this.repository.profile(),
      this.repository.settings(),
    ]);
    const signals = profileSignals(profile.text, profile.conversationFacts);
    let criteria = await this.matching.criteria();
    if (!criteria) {
      if (!signals.roleTerms.length)
        throw new BadRequestException(
          "Upload a CV with your role titles, or set target roles in Search criteria first.",
        );
      try {
        criteria = await this.matching.save(
          {
            roleTerms: signals.roleTerms,
            requiredTerms: [],
            excludeTerms: [],
            location: "hk-or-global",
            salaryFloorHkd: null,
            autoShortlist: true,
          },
          0,
        );
      } catch (error) {
        if (!(error instanceof ConflictException)) throw error;
        criteria = await this.matching.criteria();
      }
    }
    if (!criteria)
      throw new BadRequestException("Save your target roles first.");
    return this.repository.enqueue(
      {
        criteriaVersion: criteria.version,
        rules: criteria.rules,
        skills: signals.skills,
        sources: settings.sources,
        cvImportId: profile.cvImportId,
        conversationFacts: profile.conversationFacts,
        version: scannerVersion,
      },
      trigger,
      slot,
    );
  }
  async schedule() {
    const settings = await this.repository.settings();
    const slot = scheduledSlot(
      new Date(),
      settings.schedule_times,
      new Date(settings.updated_at),
    );
    if (slot) await this.scan("scheduled", slot);
  }
  results(id: string, verdict = "match", offset = "0") {
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        id,
      ) ||
      !["match", "review", "excluded", "all"].includes(verdict) ||
      !/^\d{1,6}$/.test(offset)
    )
      throw new BadRequestException("Invalid scan results request.");
    return this.repository.results(id, verdict, Number(offset));
  }
}
