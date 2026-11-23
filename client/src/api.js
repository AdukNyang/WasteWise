const API_BASE = (import.meta.env.VITE_API_URL || "http://localhost:5000").replace(/\/+$/, "");

export async function apiRequest(path, token, options = {}) {
  const headers = new Headers(options.headers || {});
  if (token) headers.set("Authorization", `Bearer ${token}`);

  let body = options.body;
  if (body && !(body instanceof FormData) && typeof body !== "string") {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(body);
  }

  const response = await fetch(`${API_BASE}${path}`, { ...options, headers, body });
  const contentType = response.headers.get("content-type") || "";
  const result = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const message = typeof result === "object" ? result.message : result;
    throw new Error(message || `Request failed with status ${response.status}`);
  }

  return result;
}

export async function getUploadedFile(path, token) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new Error(`Could not load evidence (status ${response.status})`);
  }

  const blob = await response.blob();
  const type = blob.type && blob.type !== "application/octet-stream"
    ? blob.type
    : await detectMediaType(blob);
  const media = type ? blob.slice(0, blob.size, type) : blob;
  return { url: URL.createObjectURL(media), type };
}

async function detectMediaType(blob) {
  const bytes = new Uint8Array(await blob.slice(0, 16).arrayBuffer());
  const header = String.fromCharCode(...bytes);

  if (header.startsWith("\x89PNG\r\n\x1a\n")) return "image/png";
  if (header.startsWith("\xff\xd8\xff")) return "image/jpeg";
  if (header.startsWith("GIF8")) return "image/gif";
  if (header.startsWith("RIFF") && header.slice(8, 12) === "WEBP") return "image/webp";
  if (header.startsWith("\x1a\x45\xdf\xa3")) return "video/webm";
  if (header.slice(4, 8) === "ftyp") {
    return header.includes("qt  ") ? "video/quicktime" : "video/mp4";
  }
  return blob.type;
}
