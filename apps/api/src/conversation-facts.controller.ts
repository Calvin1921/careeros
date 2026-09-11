import { Body, Controller, Get, Header, Put } from "@nestjs/common";
import { ConversationFactsService } from "./conversation-facts.service";
@Controller("profile/conversation-facts")
export class ConversationFactsController {
  constructor(private readonly service: ConversationFactsService) {}
  @Get() @Header("Cache-Control", "no-store") get() {
    return this.service.get();
  }
  @Put() @Header("Cache-Control", "no-store") replace(@Body() body: unknown) {
    return this.service.replace(body);
  }
}
