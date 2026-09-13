import { AsyncLocalStorage } from "node:async_hooks";
import { PrismaClient } from "./prisma/client";

export interface IRequestContext {
  authorization?: string;
  ip: string;
  href: string;
  referrer: string;
}

export interface IJwtPayload {
  typ: "admin" | "guest" | "producer" | "csr" | "client";
  aid: string;
  sid: string;
  oid?: string;
}

export class MyGlobal {
  public static readonly prisma = new PrismaClient();
  public static readonly als = new AsyncLocalStorage<IRequestContext>();
  public static readonly jwtSecret =
    process.env.JWT_SECRET ?? "brokerdesk-dev-jwt-secret";

  public static request(): IRequestContext {
    return (
      MyGlobal.als.getStore() ?? {
        ip: "127.0.0.1",
        href: "http://localhost:37001/",
        referrer: "http://localhost:37001/",
      }
    );
  }
}
