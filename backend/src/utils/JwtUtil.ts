import jwt from "jsonwebtoken";

import { IJwtPayload, MyGlobal } from "../MyGlobal";

const ACCESS_SECONDS = 60 * 30;
const REFRESH_SECONDS = 60 * 60 * 24 * 14;

export interface IIssuedToken {
  type: "jwt";
  access: string;
  refresh: string;
  expires_at: string;
}

export class JwtUtil {
  public static issue(payload: IJwtPayload): IIssuedToken {
    const expiresAt = new Date(Date.now() + ACCESS_SECONDS * 1000);
    const access = jwt.sign({ ...payload, kind: "access" }, MyGlobal.jwtSecret, {
      expiresIn: ACCESS_SECONDS,
    });
    const refresh = jwt.sign(
      { ...payload, kind: "refresh" },
      MyGlobal.jwtSecret,
      { expiresIn: REFRESH_SECONDS },
    );
    return {
      type: "jwt",
      access,
      refresh,
      expires_at: expiresAt.toISOString(),
    };
  }

  public static verify(token: string, kind: "access" | "refresh"): IJwtPayload {
    const decoded = jwt.verify(token, MyGlobal.jwtSecret) as IJwtPayload & {
      kind?: string;
    };
    if (decoded.kind !== kind) throw new Error("wrong token kind");
    return decoded;
  }

  public static bearer(): string | undefined {
    const header = MyGlobal.request().authorization;
    if (!header) return undefined;
    const match = /^Bearer\s+(.+)$/i.exec(header.trim());
    return match?.[1];
  }
}
