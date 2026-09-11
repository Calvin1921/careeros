import { ConversationFactsController } from "./conversation-facts.controller";
import { ConversationFactsService } from "./conversation-facts.service";
import { DiscoveryModule } from "./discovery/discovery.module";
import { MatchingController } from "./matching/matching.controller";
import { MatchingService } from "./matching/matching.service";
import { MatchingRepository } from "./matching/matching.repository";
import { PipelineIngestionService } from "./pipeline/pipeline-ingestion.service";
import { PipelineRepository } from "./pipeline/pipeline.repository";
import { PipelineQueryService } from "./pipeline/pipeline-query.service";
import { PipelineDecisionsService } from "./pipeline/pipeline-decisions.service";
import { PipelineStageService } from "./pipeline/pipeline-stage.service";
import { ProfileWorkspaceService } from "./profile-workspace.service";
import { ProfileRecordsService } from "./profile-records.service";
import { ProfileVersionService } from "./profile-version.service";
import { ProfileCapabilityService } from "./profile-capability.service";
import { CareerService } from "./career/career.service";
import { CareerRepository } from "./career/career.repository";
import { WorkspaceService } from "./workspace/workspace.service";
import { WorkspaceRepository } from "./workspace/workspace.repository";
import { IntelligenceService } from "./intelligence/intelligence.service";
import { IntelligenceRepository } from "./intelligence/intelligence.repository";
import { Module } from "@nestjs/common";
import { CareerController } from "./career.controller";
import { PipelineController } from "./pipeline.controller";
import { ProfileController } from "./profile.controller";
import { ProfileService } from "./profile.service";
import { IntelligenceController } from "./intelligence.controller";
import { WorkspaceController } from "./workspace.controller";
import { PreparationController } from "./preparation/preparation.controller";
import { PreparationService } from "./preparation/preparation.service";
import { PreparationRepository } from "./preparation/preparation.repository";
@Module({
  imports: [DiscoveryModule],
  controllers: [
    ConversationFactsController,
    MatchingController,
    CareerController,
    PipelineController,
    ProfileController,
    IntelligenceController,
    WorkspaceController,
    PreparationController,
  ],
  providers: [
    ConversationFactsService,
    MatchingService,
    MatchingRepository,
    PipelineIngestionService,
    PipelineRepository,
    PipelineQueryService,
    PipelineDecisionsService,
    PipelineStageService,
    ProfileService,
    ProfileWorkspaceService,
    ProfileRecordsService,
    ProfileVersionService,
    ProfileCapabilityService,
    CareerService,
    CareerRepository,
    WorkspaceService,
    WorkspaceRepository,
    IntelligenceService,
    IntelligenceRepository,
    PreparationService,
    PreparationRepository,
  ],
})
export class AppModule {}
