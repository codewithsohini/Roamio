export const TOKEN_KEY = "roamio_token";

export const API_BASE: string =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export async function apiFetch(
  path: string,
  opts: RequestInit = {}
): Promise<Response> {
  const token = getToken();
  const headers = new Headers(opts.headers);

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers,
  });

  if (res.status === 401) {
    clearToken();
    window.location.href = "/login";
    throw new Error("Unauthorized");
  }

  return res;
}

export async function streamPost(
  path: string,
  body: object,
  onChunk: (chunk: string) => void,
  onDone: () => void,
  onError: (msg: string) => void
): Promise<void> {
  try {
    const token = getToken();

    const headers = new Headers({
      "Content-Type": "application/json",
      Accept: "text/event-stream",
    });

    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    const res = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    if (res.status === 401) {
      clearToken();
      window.location.href = "/login";
      return;
    }

    if (!res.ok) {
      const text = await res.text();
      onError(`Request failed: ${res.status} ${text}`);
      return;
    }

    if (!res.body) {
      onError("No response body");
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      const parts = buffer.split("\n\n");
      buffer = parts.pop() || "";

      for (const part of parts) {
        const line = part.trim();

        if (!line.startsWith("data: ")) continue;

        const data = line.slice(6);

        if (data === "[DONE]") {
          onDone();
          return;
        }

        if (data.startsWith("[ERROR]")) {
          onError(data.slice(7).trim());
          return;
        }

        onChunk(data);
      }
    }

    onDone();
  } catch (error) {
    onError(
      error instanceof Error ? error.message : "Unknown error occurred"
    );
  }
}