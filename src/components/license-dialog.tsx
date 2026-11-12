"use client";

import { useEffect, useRef, useState } from "react";
import { buttonClass } from "@/components/ui/button";
import { activateLicense, useProUnlocked } from "@/lib/license";

/**
 * Inline dialog for activating a Pro license key. Kept deliberately small:
 * a disclosure toggle, one input, one submit. Successful activation reloads
 * the page so every limit on the tool re-computes against the unlocked tier.
 */
export function LicenseDialog() {
  const [open, setOpen] = useState(false);
  const [key, setKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [justActivated, setJustActivated] = useState(false);
  const unlocked = useProUnlocked() || justActivated;
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  async function handleActivate() {
    if (busy) return;
    setBusy(true);
    setMessage(null);

    const result = await activateLicense(key);
    setBusy(false);

    if (!result.ok) {
      setMessage(result.error);
      return;
    }

    setJustActivated(true);
    setMessage("Pro is active on this browser. Reloading…");
    // Limits are read during render; a reload is the honest way to apply them.
    window.location.reload();
  }

  if (unlocked) {
    return (
      <p className="mt-3 text-xs text-emerald-700">
        ✓ Pro is active on this browser.
      </p>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-3 text-xs text-slate-500 underline decoration-slate-300 underline-offset-2 hover:text-slate-700"
      >
        Already have a license key? Activate it
      </button>
    );
  }

  return (
    <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
      <label
        htmlFor="license-key-input"
        className="block text-xs font-medium text-slate-700"
      >
        License key
      </label>
      <div className="mt-1.5 flex flex-wrap items-center gap-2">
        <input
          id="license-key-input"
          ref={inputRef}
          type="text"
          value={key}
          onChange={(event) => setKey(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") handleActivate();
          }}
          placeholder="e.g. a1b2c3d4-e5f6-7890-abcd-ef0123456789"
          autoComplete="off"
          spellCheck={false}
          className="min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 font-mono text-xs text-slate-800 outline-none focus:border-blue-500"
        />
        <button
          type="button"
          onClick={handleActivate}
          disabled={busy || !key.trim()}
          className={buttonClass("primary", "sm")}
        >
          {busy ? "Activating…" : "Activate"}
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setMessage(null);
          }}
          className={buttonClass("ghost", "sm")}
        >
          Cancel
        </button>
      </div>
      {message ? <p className="mt-2 text-xs text-slate-600">{message}</p> : null}
    </div>
  );
}
