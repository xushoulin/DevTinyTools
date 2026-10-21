/**
 * Clipboard helper with a fallback for browsers where the async Clipboard API
 * is unavailable (insecure context, older Safari, permission denial).
 *
 * Never throws: callers get a boolean and decide what to tell the user.
 */
export async function copyText(text: string): Promise<boolean> {
  if (!text) return false;

  if (typeof navigator !== "undefined" && navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall through to the legacy path below.
    }
  }

  return legacyCopy(text);
}

function legacyCopy(text: string): boolean {
  if (typeof document === "undefined") return false;

  let area: HTMLTextAreaElement | null = null;

  try {
    area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.setAttribute("aria-hidden", "true");
    area.style.position = "fixed";
    area.style.top = "-9999px";
    area.style.left = "-9999px";
    area.style.opacity = "0";

    document.body.appendChild(area);
    area.select();
    area.setSelectionRange(0, text.length);

    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    if (area && area.parentNode) {
      area.parentNode.removeChild(area);
    }
  }
}
