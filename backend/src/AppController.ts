import { Controller, Get } from "@nestjs/common";

@Controller()
export class AppController {
  /**
   * Health check.
   *
   * Returns a plain OK string so infrastructure probes can confirm the
   * backend process is alive without touching any business logic.
   *
   * @returns "OK"
   */
  @Get()
  public get(): string {
    return "OK";
  }
}