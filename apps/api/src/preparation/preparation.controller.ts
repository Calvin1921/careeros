import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Put,
} from "@nestjs/common";
import {
  PreparationConflictError,
  PreparationNotFoundError,
  PreparationValidationError,
} from "./preparation.errors";
import {
  parsePreparationUpdate,
  parseRequirementInput,
  parseRequirementKey,
  parseTaskInput,
  parseUuid,
} from "./preparation.schemas";
import { PreparationService } from "./preparation.service";

async function transport<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (error) {
    if (error instanceof PreparationValidationError)
      throw new BadRequestException(error.message);
    if (error instanceof PreparationNotFoundError)
      throw new NotFoundException(error.message);
    if (
      error instanceof PreparationConflictError ||
      (error as { code?: string }).code === "23505"
    )
      throw new ConflictException(
        error instanceof Error
          ? error.message
          : "Preparation changed concurrently.",
      );
    throw error;
  }
}

@Controller()
export class PreparationController {
  constructor(private readonly service: PreparationService) {}

  @Get("jobs/:id/preparation")
  get(@Param("id") id: string) {
    return transport(() => this.service.get(parseUuid(id, "Job ID")));
  }

  @Post("jobs/:id/preparation/requirements")
  addRequirement(@Param("id") id: string, @Body() body: unknown) {
    return transport(() => {
      const { text } = parseRequirementInput(body);
      return this.service.addRequirement(parseUuid(id, "Job ID"), text);
    });
  }

  @Put("jobs/:id/preparation/requirements/:key")
  update(
    @Param("id") id: string,
    @Param("key") key: string,
    @Body() body: unknown,
  ) {
    return transport(() =>
      this.service.update(
        parseUuid(id, "Job ID"),
        parseRequirementKey(key),
        parsePreparationUpdate(body),
      ),
    );
  }

  @Post("jobs/:id/preparation/requirements/:key/tasks")
  createTask(
    @Param("id") id: string,
    @Param("key") key: string,
    @Body() body: unknown,
  ) {
    return transport(() => {
      const { dueDate } = parseTaskInput(body);
      return this.service.createTask(
        parseUuid(id, "Job ID"),
        parseRequirementKey(key),
        dueDate,
      );
    });
  }
}
