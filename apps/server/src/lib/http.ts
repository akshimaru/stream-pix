import { ZodError } from "zod";
import { AppError } from "./errors.js";

export function ok<T>(data: T) {
  return { success: true as const, data };
}

export function fail(message: string, code = "REQUEST_FAILED") {
  return { success: false as const, error: message, code };
}

export function parsePagination(query: Record<string, unknown>) {
  const page = Number(query.page ?? 1);
  const pageSize = Number(query.pageSize ?? 10);

  return {
    page: Number.isFinite(page) && page > 0 ? page : 1,
    pageSize: Number.isFinite(pageSize) && pageSize > 0 && pageSize <= 100 ? pageSize : 10,
  };
}

export function getOffset(page: number, pageSize: number) {
  return (page - 1) * pageSize;
}

export function zodToAppError(error: ZodError) {
  const message = error.issues[0]?.message ?? "Dados inválidos.";
  return new AppError(message, 400, "VALIDATION_ERROR", error.flatten());
}
