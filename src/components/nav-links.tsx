"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const LINKS = [
  { href: "/json-formatter", label: "Formatter" },
  { href: "/json-validator", label: "Validator" },
  { href: "/json-minifier", label: "Minifier" },
  { href: "/json-diff", label: "Diff" },
  { href: "/guides", label: "Guides" },
] as const;

function isActive(pathname: string, href: string): boolean {
  // A section stays highlighted on its child pages, e.g. /guides/<slug>.
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function DesktopNav() {
  const pathname = usePathname() ?? "/";

  return (
    <nav aria-label="Main" className="hidden md:block">
      <ul className="flex items-center gap-1">
        {LINKS.map((link) => {
          const active = isActive(pathname, link.href);
          return (
            <li key={link.href}>
              <Link
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`rounded-md px-2.5 py-1.5 text-sm transition-colors ${
                  active
                    ? "bg-slate-100 font-medium text-slate-900"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                {link.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname() ?? "/";

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const close = () => setOpen(false);

  return (
    <div className="relative md:hidden">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls="mobile-menu"
        className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
      >
        <span className="sr-only">Toggle navigation menu</span>
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        >
          {open ? (
            <path d="M5 5l10 10M15 5L5 15" />
          ) : (
            <path d="M3 5.5h14M3 10h14M3 14.5h14" />
          )}
        </svg>
      </button>

      {open ? (
        <div
          id="mobile-menu"
          className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-56 rounded-lg border border-slate-200 bg-white p-1.5 shadow-lg"
        >
          <ul>
            {LINKS.map((link) => {
              const active = isActive(pathname, link.href);
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    onClick={close}
                    aria-current={active ? "page" : undefined}
                    className={`block rounded-md px-3 py-2 text-sm ${
                      active
                        ? "bg-slate-100 font-medium text-slate-900"
                        : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {link.label}
                  </Link>
                </li>
              );
            })}
          </ul>
          <div className="mt-1 border-t border-slate-100 pt-1">
            <Link
              href="/privacy-policy"
              onClick={close}
              className="block rounded-md px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              Privacy Policy
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
