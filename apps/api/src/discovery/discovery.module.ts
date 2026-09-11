import { CvExtractionController } from "./cv-extraction.controller";
import { Module } from "@nestjs/common";
import { DiscoveryController } from "./discovery.controller";
import { DiscoveryService } from "./discovery.service";
import { DiscoveryRepository } from "./discovery.repository";
import { DiscoveryRunner } from "./discovery.runner";
import { MatchingRepository } from "../matching/matching.repository";
import { PipelineRepository } from "../pipeline/pipeline.repository";
@Module({
  controllers: [DiscoveryController, CvExtractionController],
  providers: [
    DiscoveryService,
    DiscoveryRepository,
    DiscoveryRunner,
    MatchingRepository,
    PipelineRepository,
  ],
})
export class DiscoveryModule {}
