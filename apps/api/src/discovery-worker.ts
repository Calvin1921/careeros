import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { pool } from "@careeros/data";
import { DiscoveryModule } from "./discovery/discovery.module";
import { DiscoveryService } from "./discovery/discovery.service";
import { DiscoveryRunner } from "./discovery/discovery.runner";
import { DiscoveryRepository } from "./discovery/discovery.repository";
async function main() {
  const app = await NestFactory.createApplicationContext(DiscoveryModule);
  const service = app.get(DiscoveryService),
    runner = app.get(DiscoveryRunner),
    repository = app.get(DiscoveryRepository);
  let stopping = false,
    lastSchedule = 0;
  process.once("SIGTERM", () => {
    stopping = true;
  });
  process.once("SIGINT", () => {
    stopping = true;
  });
  while (!stopping) {
    try {
      if (Date.now() - lastSchedule > 30000) {
        lastSchedule = Date.now();
        await service.schedule();
      }
      const run = await repository.claim();
      if (run) await runner.execute(run);
    } catch (error) {
      console.error("Discovery worker:", (error as Error).message);
    }
    if (!stopping) await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  await app.close();
  await pool.end();
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
