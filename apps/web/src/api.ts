export type FieldError = { field: string; message: string };

export class ApiError extends Error {
  errors: FieldError[];
  constructor(message: string, errors: FieldError[] = []) {
    super(message);
    this.errors = errors;
  }
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  const token = localStorage.getItem("ebokt.token");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (options.body && !(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const response = await fetch(path, { ...options, headers });
  const payload = await response.json().catch(() => ({}));
  if (response.status === 401 && !path.endsWith("/auth/login")) {
    localStorage.removeItem("ebokt.token");
    if (location.pathname !== "/login") location.assign("/login");
  }
  if (!response.ok) {
    const message = typeof payload.message === "string" ? payload.message : "Əməliyyat alınmadı";
    throw new ApiError(message, Array.isArray(payload.errors) ? payload.errors : []);
  }
  return payload as T;
}

export async function downloadBlob(path: string, name: string) {
  const headers = new Headers();
  const token = localStorage.getItem("ebokt.token");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const response = await fetch(path, { headers });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    const message = typeof payload.message === "string" ? payload.message : "Fayl açılmadı";
    throw new ApiError(message);
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

export function errorText(error: unknown) {
  return error instanceof Error ? error.message : "Əməliyyat alınmadı";
}

export function fieldMessage(errors: FieldError[], field: string) {
  return errors.find((item) => item.field === field || item.field.startsWith(`${field}.`))?.message ?? "";
}
