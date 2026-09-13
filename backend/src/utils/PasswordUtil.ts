import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const KEYLEN = 32;

export class PasswordUtil {
  public static hash(plain: string): string {
    const salt = randomBytes(16).toString("hex");
    const hash = scryptSync(plain, salt, KEYLEN).toString("hex");
    return `scrypt$${salt}$${hash}`;
  }

  public static equals(plain: string, stored: string): boolean {
    const parts = stored.split("$");
    if (parts.length !== 3 || parts[0] !== "scrypt") return false;
    const [, salt, expected] = parts;
    const actual = scryptSync(plain, salt, KEYLEN);
    const expectedBuf = Buffer.from(expected, "hex");
    if (actual.length !== expectedBuf.length) return false;
    return timingSafeEqual(actual, expectedBuf);
  }
}
