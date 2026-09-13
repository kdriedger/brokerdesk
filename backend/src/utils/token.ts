import { createHash, randomBytes } from "node:crypto";

export const hashToken = (token: string): string =>
  createHash("sha256").update(token).digest("hex");

export const newSecretToken = (): string => randomBytes(24).toString("hex");

export const placeholderPasswordHash = (
  hash: (plain: string) => string,
): string => hash(randomBytes(32).toString("hex"));
