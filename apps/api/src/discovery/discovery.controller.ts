import { Body, Controller, Get, Param, Post, Put, Query } from "@nestjs/common";
import { DiscoveryService } from "./discovery.service";
@Controller("discovery")
export class DiscoveryController {
  constructor(private readonly service: DiscoveryService) {}
  @Get() overview() {
    return this.service.overview();
  }
  @Put("settings") settings(@Body() body: unknown) {
    return this.service.saveSettings(body);
  }
  @Post("scans") scan() {
    return this.service.scan();
  }
  @Get("scans/:id/results") results(
    @Param("id") id: string,
    @Query("verdict") verdict?: string,
    @Query("offset") offset?: string,
  ) {
    return this.service.results(id, verdict, offset);
  }
}
