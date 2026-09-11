import { Controller, Get, Post, Patch, Param, Body } from "@nestjs/common";
import { CareerService } from "./career/career.service";
@Controller()
export class CareerController {
  constructor(private readonly career: CareerService) {}
  @Get("health") health() {
    return this.career.health();
  }
  @Get("jobs") list() {
    return this.career.list();
  }
  @Post("jobs") create(@Body() body: unknown) {
    return this.career.create(body);
  }
  @Get("jobs/:id") detail(@Param("id") id: string) {
    return this.career.detail(id);
  }
  @Patch("jobs/:id/stage") stage(
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    return this.career.stage(id, body);
  }
  @Post("jobs/:id/artifacts") artifact(
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    return this.career.artifact(id, body);
  }
  @Get("capabilities") capabilities() {
    return this.career.capabilities();
  }
  @Post("capabilities") capability(@Body() body: unknown) {
    return this.career.capability(body);
  }
  @Post("evidence") evidence(@Body() body: unknown) {
    return this.career.evidence(body);
  }
  @Get("analytics") analytics() {
    return this.career.analytics();
  }
}
