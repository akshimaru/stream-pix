import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { config } from "dotenv";
import { z } from "zod";

const envCandidates = [
  resolve(process.cwd(), ".env"),
  resolve(process.cwd(), "../../.env"),
  resolve(process.cwd(), "../.env"),
];

for (const candidate of envCandidates) {
  if (existsSync(candidate)) {
    config({ path: candidate, override: false });
  }
}

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().default("mysql://root:root@localhost:3306/streampix"),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  REDIS_ENABLED: z
    .union([z.string(), z.boolean()])
    .optional()
    .transform((value) => (value === undefined ? undefined : value === true || value === "true")),
  WEB_ORIGIN: z.string().default("http://localhost:3000"),
  SERVER_URL: z.string().default("http://localhost:4000"),
  JWT_ACCESS_SECRET: z.string().default("streampix-access-secret-dev"),
  JWT_REFRESH_SECRET: z.string().default("streampix-refresh-secret-dev"),
  JWT_SOCKET_SECRET: z.string().default("streampix-socket-secret-dev"),
  ACCESS_COOKIE_NAME: z.string().default("streampix_access_token"),
  REFRESH_COOKIE_NAME: z.string().default("streampix_refresh_token"),
  COOKIE_DOMAIN: z.string().optional(),
  COOKIE_SECURE: z
    .union([z.string(), z.boolean()])
    .optional()
    .transform((value) => value === true || value === "true"),
  MOCK_AUTO_CONFIRM_SECONDS: z.coerce.number().default(0),
  DEFAULT_PLATFORM_FEE_PERCENTAGE: z.coerce.number().default(4.99),
  DEFAULT_PLATFORM_FIXED_FEE: z.coerce.number().default(0.39),
});

const parsedEnv = envSchema.parse(process.env);

export const env = {
  ...parsedEnv,
  REDIS_ENABLED: parsedEnv.REDIS_ENABLED ?? parsedEnv.NODE_ENV === "production",
};
export const isProd = env.NODE_ENV === "production";
