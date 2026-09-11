import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { IntelligenceService } from "./intelligence/intelligence.service";
@Controller("intelligence")
export class IntelligenceController {
  constructor(private readonly intelligence: IntelligenceService) {}
  @Get("memory") listMemory(@Query("scope") scope: unknown) {
    return this.intelligence.listMemory(scope);
  }
  @Post("memory") proposeMemory(@Body() body: unknown) {
    return this.intelligence.proposeMemory(body);
  }
  @Patch("memory/:id/confirm") confirmMemory(
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    return this.intelligence.confirmMemory(id, body);
  }
  @Patch("memory/:id/correct") correctMemory(
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    return this.intelligence.correctMemory(id, body);
  }
  @Delete("memory/:id") deleteMemory(
    @Param("id") id: string,
    @Query("scope") scope: unknown,
  ) {
    return this.intelligence.deleteMemory(id, scope);
  }
  @Get("analytics") analytics(
    @Query("timezone") timezone: unknown,
    @Query("from") from: unknown,
    @Query("to") to: unknown,
  ) {
    return this.intelligence.analytics(timezone, from, to);
  }
}
