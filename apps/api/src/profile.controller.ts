import { Body, Controller, Get, Param, Patch, Post } from "@nestjs/common";
import { ProfileService } from "./profile.service";

@Controller()
export class ProfileController {
  constructor(private readonly profiles: ProfileService) {}

  @Get("profile") workspace() {
    return this.profiles.workspace();
  }

  @Patch("profile") updateProfile(@Body() body: unknown) {
    return this.profiles.updateProfile(body);
  }

  @Post("profile/imports") importCv(@Body() body: unknown) {
    return this.profiles.importCv(body);
  }

  @Get("profile/imports/:id") importDetail(@Param("id") id: string) {
    return this.profiles.importDetail(id);
  }

  @Post("profile/experiences") createExperience(@Body() body: unknown) {
    return this.profiles.createExperience(body);
  }

  @Patch("profile/experiences/:id") updateExperience(
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    return this.profiles.updateExperience(id, body);
  }

  @Post("profile/versions") createVersion(@Body() body: unknown) {
    return this.profiles.createVersion(body);
  }

  @Patch("capabilities/:id") updateCapability(
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    return this.profiles.updateCapability(id, body);
  }

  @Patch("evidence/:id") updateEvidence(
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    return this.profiles.updateEvidence(id, body);
  }

  @Post("learning-milestones") createMilestone(@Body() body: unknown) {
    return this.profiles.createMilestone(body);
  }

  @Patch("learning-milestones/:id") updateMilestone(
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    return this.profiles.updateMilestone(id, body);
  }
}
