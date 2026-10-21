/**
 * File download helpers. Filenames are generated from fixed prefixes plus a
 * timestamp, never from user input, so a download can never escape the
 * Downloads folder or inherit dangerous characters from the pasted text.
 */

const SAFE_FILENAME_PATTERN = /[^a-zA-Z0-9._-]+/g;

/** Strip anything that is not alphanumeric, dot, dash or underscore. */
export function safeFilename(candidate: string, fallback = "data.json"): string {
  const cleaned = candidate
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(SAFE_FILENAME_PATTERN, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^[-.]+/, "")
    .slice(0, 80);

  if (!cleaned || cleaned === ".json") return fallback;
  return cleaned;
}

export interface DownloadResult {
  ok: boolean;
  filename: string;
}

/** Trigger a client-side download. Returns `ok: false` instead of throwing. */
export function downloadTextFile(
  content: string,
  filename: string,
  mimeType = "application/json;charset=utf-8",
): DownloadResult {
  const safeName = safeFilename(filename);

  if (typeof window === "undefined" || typeof document === "undefined") {
    return { ok: false, filename: safeName };
  }

  let url: string | null = null;

  try {
    const blob = new Blob([content], { type: mimeType });
    url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = safeName;
    link.rel = "noopener";
    link.style.display = "none";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    return { ok: true, filename: safeName };
  } catch {
    return { ok: false, filename: safeName };
  } finally {
    if (url) {
      // Give the browser a moment to start the download before revoking.
      window.setTimeout(() => URL.revokeObjectURL(url as string), 10_000);
    }
  }
}

/** `json-2026-10-21-0920.json` style names: stable, sortable, safe. */
export function timestampedFilename(prefix: string, now: Date = new Date()): string {
  const pad = (value: number) => value.toString().padStart(2, "0");
  const stamp = [
    now.getFullYear(),
    pad(now.getMonth() + 1),
    pad(now.getDate()),
    "-",
    pad(now.getHours()),
    pad(now.getMinutes()),
  ].join("");

  return safeFilename(`${prefix}-${stamp}.json`, `${prefix}.json`);
}
