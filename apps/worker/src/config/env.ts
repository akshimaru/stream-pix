import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { config } from "dotenv";
import { z } from "zod";

for (const candidate of [
  resolve(process.cwd(), ".env"),
  resolve(process.cwd(), "../../.env"),
  resolve(process.cwd(), "../.env"),
]) {
  if (existsSync(candidate)) {
    config({ path: candidate, override: false });
  }
}

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().default("mysql://root:root@localhost:3306/streampix"),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  REDIS_ENABLED: z
    .union([z.string(), z.boolean()])
    .optional()
    .transform((value) => (value === undefined ? undefined : value === true || value === "true")),
});

const parsedEnv = schema.parse(process.env);

export const env = {
  ...parsedEnv,
  REDIS_ENABLED: parsedEnv.REDIS_ENABLED ?? parsedEnv.NODE_ENV === "production",
};
