import { NestMiddleware } from "@nestjs/common";
import { NextFunction, Request, Response } from "express";

import { MyGlobal } from "../MyGlobal";

export class RequestContextMiddleware implements NestMiddleware {
  public use(req: Request, _res: Response, next: NextFunction): void {
    const forwarded = req.headers["x-forwarded-for"];
    const ip =
      (typeof forwarded === "string" ? forwarded.split(",")[0] : undefined) ??
      req.ip ??
      "127.0.0.1";
    MyGlobal.als.run(
      {
        authorization: req.headers.authorization,
        ip,
        href: `${req.protocol}://${req.get("host")}${req.originalUrl}`,
        referrer: req.get("referer") ?? req.get("referrer") ?? "",
      },
      () => next(),
    );
  }
}
