import { NestFactory } from "@nestjs/core";
import { AppModule } from "./AppModule";

async function main(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  await app.listen(37001);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});