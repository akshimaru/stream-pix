import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, passwordHash: string) {
  return bcrypt.compare(password, passwordHash);
}

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function createOpaqueToken(size = 32) {
  return randomBytes(size).toString("hex");
}

export function createPublicToken(prefix: string) {
  return `${prefix}_${nanoid(24)}`;
}

export function createIdempotencyKey(seed?: string) {
  return seed ?? `idem_${nanoid(18)}`;
}
