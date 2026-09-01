import type { INestiaConfig } from "@nestia/sdk";
import { NestFactory } from "@nestjs/core";

import { AppModule } from "./src/AppModule";

export const NESTIA_CONFIG: INestiaConfig = {
  input: () => NestFactory.create(AppModule),
  output: "packages/api",
  swagger: {
    openapi: "3.1",
    output: "packages/api/swagger.json",
  },
};

export default NESTIA_CONFIG;