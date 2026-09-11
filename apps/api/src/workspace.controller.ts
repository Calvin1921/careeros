import { Controller, Get, Query } from "@nestjs/common";
import { WorkspaceService } from "./workspace/workspace.service";
@Controller("workspace")
export class WorkspaceController {
  constructor(private readonly workspace: WorkspaceService) {}
  @Get("overview") overview(@Query("today") today?: string) {
    return this.workspace.overview(today);
  }
}
