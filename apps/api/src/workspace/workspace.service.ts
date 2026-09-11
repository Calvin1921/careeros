import { Injectable, BadRequestException } from "@nestjs/common";
import { isCalendarDate } from "../intelligence.analytics";
import { WorkspaceRepository } from "./workspace.repository";
@Injectable()
export class WorkspaceService {
  constructor(private readonly repository: WorkspaceRepository) {}
  overview(today?: string) {
    const date = today ?? new Date().toISOString().slice(0, 10);
    if (!isCalendarDate(date))
      throw new BadRequestException("Use YYYY-MM-DD for today.");
    return this.repository.overview(date);
  }
}
