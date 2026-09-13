import { NestFactory } from "@nestjs/core";
import { AppModule } from "./AppModule";

async function main(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  const port = Number(process.env.PORT ?? 37001);
  await app.listen(port);
  console.log(`BrokerDesk API listening on http://127.0.0.1:${port}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});