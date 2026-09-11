import { Injectable } from "@nestjs/common";
import { ProfileCapabilityService } from "./profile-capability.service";
import { ProfileRecordsService } from "./profile-records.service";
import { ProfileVersionService } from "./profile-version.service";
import { ProfileWorkspaceService } from "./profile-workspace.service";

@Injectable()
export class ProfileService {
  constructor(
    private readonly workspaceService: ProfileWorkspaceService,
    private readonly records: ProfileRecordsService,
    private readonly versions: ProfileVersionService,
    private readonly capabilities: ProfileCapabilityService,
  ) {}
  workspace() {
    return this.workspaceService.get();
  }
  importDetail(id: string) {
    return this.records.importDetail(id);
  }
  updateProfile(body: unknown) {
    return this.records.updateProfile(body);
  }
  importCv(body: unknown) {
    return this.records.importCv(body);
  }
  createExperience(body: unknown) {
    return this.records.createExperience(body);
  }
  updateExperience(id: string, body: unknown) {
    return this.records.updateExperience(id, body);
  }
  createVersion(body: unknown) {
    return this.versions.create(body);
  }
  updateCapability(id: string, body: unknown) {
    return this.capabilities.updateCapability(id, body);
  }
  updateEvidence(id: string, body: unknown) {
    return this.capabilities.updateEvidence(id, body);
  }
  createMilestone(body: unknown) {
    return this.capabilities.createMilestone(body);
  }
  updateMilestone(id: string, body: unknown) {
    return this.capabilities.updateMilestone(id, body);
  }
}

export {
  assertSelectedEvidenceIsAttested,
  confirmedExperiencesForSnapshot,
  evidenceVerificationAfterPatch,
  parseCapabilityPatch,
  proposeExperiences,
} from "./profile.shared";
