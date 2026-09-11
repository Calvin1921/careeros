import { Body, Controller, Get, Post, Put } from "@nestjs/common";
import { MatchingService } from "./matching.service";
@Controller("matching")
export class MatchingController {
  constructor(private readonly service: MatchingService) {}
  @Get("criteria") criteria() {
    return this.service.criteria();
  }
  @Put("criteria") save(@Body() input: unknown) {
    return this.service.save(input);
  }
  @Post("process") process() {
    return this.service.process();
  }
  @Get("results") results() {
    return this.service.results();
  }
  @Get("history") history() {
    return this.service.history();
  }
}
