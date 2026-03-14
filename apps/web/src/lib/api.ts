import type { ApiResponse } from "@streampix/shared";

function trimTrailingSlash(value: string) {
  return value.replace(/\/$/, "");
}

function resolveClientApiUrl() {
  const configuredUrl = process.env.NEXT_PUBLIC_API_URL;

  if (typeof window === "undefined") {
    return trimTrailingSlash(configuredUrl ?? process.env.SERVER_URL ?? "http://localhost:4000");
  }

  if (!configuredUrl) {
    return `${window.location.protocol}//${window.location.hostname}:4000`;
  }

  try {
    const parsed = new URL(configuredUrl);
    const currentHost = window.location.hostname;
    const usesLoopbackHost = parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
    const currentIsLoopback = currentHost === "localhost" || currentHost === "127.0.0.1";

    if (usesLoopbackHost && !currentIsLoopback) {
      parsed.hostname = currentHost;
    }

    return trimTrailingSlash(parsed.toString());
  } catch {
    return trimTrailingSlash(configuredUrl);
  }
}

export function getApiUrl() {
  return resolveClientApiUrl();
}

export const API_URL = getApiUrl();
const AUTH_REFRESH_PATH = "/v1/auth/refresh";
const AUTH_PATHS_WITHOUT_REFRESH = new Set([
  "/v1/auth/login",
  "/v1/auth/register",
  "/v1/auth/refresh",
  "/v1/auth/logout",
  "/v1/auth/forgot-password",
  "/v1/auth/reset-password",
]);

function buildRequestHeaders(init?: RequestInit) {
  const headers = new Headers(init?.headers ?? {});
  const hasBody = init?.body !== undefined && init?.body !== null;
  const isFormData = typeof FormData !== "undefined" && init?.body instanceof FormData;

  if (hasBody && !isFormData && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  return headers;
}

async function parseResponse<T>(response: Response) {
  const payload = (await response.json().catch(() => null)) as ApiResponse<T> | null;

  if (!response.ok || !payload?.success) {
    throw new Error(payload?.error ?? "Nao foi possivel concluir a requisicao.");
  }

  return payload.data as T;
}

function shouldAttemptSessionRefresh(path: string) {
  return !AUTH_PATHS_WITHOUT_REFRESH.has(path);
}

async function refreshSession() {
  const response = await fetch(`${getApiUrl()}${AUTH_REFRESH_PATH}`, {
    method: "POST",
    credentials: "include",
    cache: "no-store",
  });

  if (!response.ok) {
    return false;
  }

  const payload = (await response.json().catch(() => null)) as ApiResponse<unknown> | null;

  return payload?.success === true;
}

export async function apiFetch<T>(path: string, init?: RequestInit, options?: { retryOnUnauthorized?: boolean }) {
  const response = await fetch(`${getApiUrl()}${path}`, {
    ...init,
    credentials: "include",
    headers: buildRequestHeaders(init),
    cache: "no-store",
  });

  if (
    response.status === 401 &&
    options?.retryOnUnauthorized !== false &&
    typeof window !== "undefined" &&
    shouldAttemptSessionRefresh(path)
  ) {
    const refreshed = await refreshSession();

    if (refreshed) {
      return apiFetch<T>(path, init, { retryOnUnauthorized: false });
    }
  }

  return parseResponse<T>(response);
}

export async function apiPost<T>(path: string, body?: unknown, init?: RequestInit) {
  return apiFetch<T>(path, {
    method: "POST",
    body: body === undefined ? undefined : JSON.stringify(body),
    ...init,
  });
}

export async function apiPatch<T>(path: string, body?: unknown, init?: RequestInit) {
  return apiFetch<T>(path, {
    method: "PATCH",
    body: body === undefined ? undefined : JSON.stringify(body),
    ...init,
  });
}

export async function publicFetch<T>(path: string) {
  const response = await fetch(`${getApiUrl()}${path}`, {
    cache: "no-store",
  });

  return parseResponse<T>(response);
}
