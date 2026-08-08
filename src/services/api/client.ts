import { env } from "@/lib/env";
import { supabase } from "@/services/supabase/client";

type ApiRequestOptions = {
  auth?: boolean;
  body?: unknown;
  method?: "GET" | "POST" | "PATCH" | "DELETE";
};

async function getFreshAccessToken(): Promise<string> {
  const { data, error } = await supabase.auth.getSession();
  const accessToken = data.session?.access_token;
  if (error || !accessToken) {
    throw new Error("Your session expired. Please sign in again.");
  }

  return accessToken;
}

function apiUrl(path: string): string {
  const baseUrl = env.apiBaseUrl.replace(/\/$/, "");
  return `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
}

function getErrorMessage(payload: unknown, fallback: string): string {
  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    if (typeof record.message === "string") {
      return record.message;
    }
    if (typeof record.detail === "string") {
      return record.detail;
    }
    if (record.detail && typeof record.detail === "object") {
      const detail = record.detail as Record<string, unknown>;
      if (typeof detail.message === "string") {
        return detail.message;
      }
    }
  }

  return fallback;
}

export async function apiRequest<T>(
  path: string,
  { auth = true, body, method = body === undefined ? "GET" : "POST" }: ApiRequestOptions = {},
): Promise<T> {
  const headers: Record<string, string> = {};
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }
  if (auth) {
    headers.Authorization = `Bearer ${await getFreshAccessToken()}`;
  }

  const response = await fetch(apiUrl(path), {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const text = await response.text();
  let payload: unknown = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = { message: text };
    }
  }

  if (!response.ok) {
    throw new Error(getErrorMessage(payload, "Request failed."));
  }

  return payload as T;
}

export function apiGet<T>(path: string, options?: Pick<ApiRequestOptions, "auth">) {
  return apiRequest<T>(path, { ...options, method: "GET" });
}

export function apiPost<T>(path: string, body?: unknown) {
  return apiRequest<T>(path, { body, method: "POST" });
}

export function apiPatch<T>(path: string, body?: unknown) {
  return apiRequest<T>(path, { body, method: "PATCH" });
}
