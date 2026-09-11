import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { MemoryNotFoundError } from "@careeros/data";
import {
  buildOperationalAnalytics,
  isCalendarDate,
  isTimeZone,
} from "../intelligence.analytics";
import {
  object,
  only,
  text,
  id,
  optionalQuery,
  expiry,
} from "./intelligence.validation";
import { IntelligenceRepository } from "./intelligence.repository";
@Injectable()
export class IntelligenceService {
  constructor(private readonly repository: IntelligenceRepository) {}
  private get memory() {
    return this.repository.memory;
  }

  private notFound(error: unknown): never {
    if (error instanceof MemoryNotFoundError)
      throw new NotFoundException("Memory entry not found in this scope.");
    throw error;
  }

  async listMemory(rawScope: unknown) {
    const scope = text(rawScope, "Scope", 200);
    return {
      scope,
      truthBoundary:
        "These are episodic notes with source provenance. Verification does not turn a note into a canonical career fact.",
      entries: await this.memory.retrieve(scope),
    };
  }

  async proposeMemory(rawBody: unknown) {
    const body = object(rawBody);
    only(body, ["scope", "sourceId", "content", "expiresAt"]);
    const value = {
      scope: text(body.scope, "Scope", 200),
      sourceId: text(body.sourceId, "Source", 500),
      content: text(body.content, "Content", 10_000),
      expiresAt: expiry(body.expiresAt),
    };
    const memoryId = await this.memory.propose(value);
    return { id: memoryId, verified: false };
  }

  async confirmMemory(rawId: string, rawBody: unknown) {
    const body = object(rawBody);
    only(body, ["scope"]);
    try {
      return await this.memory.confirm(
        id(rawId),
        text(body.scope, "Scope", 200),
      );
    } catch (error) {
      this.notFound(error);
    }
  }

  async correctMemory(rawId: string, rawBody: unknown) {
    const body = object(rawBody);
    only(body, ["scope", "content", "correctionSourceId"]);
    try {
      return await this.memory.correct(
        id(rawId),
        text(body.scope, "Scope", 200),
        {
          content: text(body.content, "Content", 10_000),
          correctionSourceId: text(
            body.correctionSourceId,
            "Correction source",
            500,
          ),
        },
      );
    } catch (error) {
      this.notFound(error);
    }
  }

  async deleteMemory(rawId: string, rawScope: unknown) {
    try {
      await this.memory.forget(id(rawId), text(rawScope, "Scope", 200));
      return { deleted: true };
    } catch (error) {
      this.notFound(error);
    }
  }

  async analytics(rawTimezone: unknown, rawFrom: unknown, rawTo: unknown) {
    const timezone = optionalQuery(rawTimezone, "Timezone", 100) ?? "UTC";
    const from = optionalQuery(rawFrom, "From date", 10);
    const to = optionalQuery(rawTo, "To date", 10);
    if (!isTimeZone(timezone))
      throw new BadRequestException("Invalid timezone.");
    if ((from && !isCalendarDate(from)) || (to && !isCalendarDate(to)))
      throw new BadRequestException("Dates must use YYYY-MM-DD.");
    if (from && to && from > to)
      throw new BadRequestException("From date must be on or before to date.");

    const asOf = new Date();
    const [currentResult, eventResult] = await this.repository.analyticsRows();
    return buildOperationalAnalytics(currentResult.rows, eventResult.rows, {
      timezone,
      from,
      to,
      asOf,
    });
  }
}
