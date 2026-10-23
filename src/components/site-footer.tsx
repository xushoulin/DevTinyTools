import Link from "next/link";
import { TOOLS } from "@/lib/tools";
import { GITHUB_REPO_URL, SITE_NAME } from "@/lib/site";

/**
 * Internal links render through next/link; `external` entries render as a
 * plain anchor, because next/link would try to prefetch a route that does not
 * exist in this app.
 */
type FooterLink = { href: string; label: string; external?: boolean };

const SITE_LINKS: FooterLink[] = [
  { href: "/guides", label: "Guides" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
  { href: "/privacy-policy", label: "Privacy Policy" },
  { href: GITHUB_REPO_URL, label: "Source on GitHub", external: true },
];

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-16 border-t border-slate-200 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-900 font-mono text-[11px] font-bold text-white"
              >
                {"{}"}
              </span>
              <span className="text-sm font-semibold text-slate-900">{SITE_NAME}</span>
            </div>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-slate-600">
              Small developer tools that do one job well. Every tool runs locally
              in your browser, so the data you paste never leaves your device.
            </p>
          </div>

          <nav aria-label="Tools">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Tools
            </h2>
            <ul className="mt-3 space-y-2">
              {TOOLS.map((tool) => (
                <li key={tool.href}>
                  <Link
                    href={tool.href}
                    className="text-sm text-slate-600 hover:text-slate-900 hover:underline"
                  >
                    {tool.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Site">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Site
            </h2>
            <ul className="mt-3 space-y-2">
              {SITE_LINKS.map((link) => (
                <li key={link.href}>
                  {link.external ? (
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-slate-600 hover:text-slate-900 hover:underline"
                    >
                      {link.label}
                    </a>
                  ) : (
                    <Link
                      href={link.href}
                      className="text-sm text-slate-600 hover:text-slate-900 hover:underline"
                    >
                      {link.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="mt-10 flex flex-col gap-2 border-t border-slate-200 pt-6 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {year} {SITE_NAME}. Tools are provided as-is, without warranty.
          </p>
          <p>No accounts. No uploads. Your JSON never leaves the browser.</p>
        </div>
      </div>
    </footer>
  );
}
