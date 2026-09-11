import "reflect-metadata";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
async function main() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.useBodyParser("json", { limit: "8mb" });
  app.enableCors({
    origin: process.env.WEB_ORIGIN ?? "http://localhost:3000",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  });
  app.enableShutdownHooks();
  await app.listen(
    Number(process.env.API_PORT ?? 4000),
    process.env.API_HOST ?? "127.0.0.1",
  );
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
