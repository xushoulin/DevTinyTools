import type { Metadata } from "next";
import Link from "next/link";
import { buttonClass } from "@/components/ui/button";
import { TOOLS } from "@/lib/tools";

export const metadata: Metadata = {
  title: "Page not found",
  description: "The page you requested does not exist.",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-start px-4 py-16 sm:px-6 lg:px-8">
      <p className="font-mono text-xs uppercase tracking-wider text-slate-500">
        Error 404
      </p>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
        This page does not exist
      </h1>
      <p className="mt-3 text-[15px] leading-relaxed text-slate-600">
        The URL you followed may be mistyped, or the page may have been removed. Nothing has
        gone wrong with your data — no tool output is stored on this site.
      </p>

      <div className="mt-7 flex flex-wrap gap-3">
        <Link href="/" className={buttonClass("primary")}>
          Go to the homepage
        </Link>
        <Link href="/json-formatter" className={buttonClass("secondary")}>
          Open the JSON formatter
        </Link>
      </div>

      <div className="mt-10 w-full border-t border-slate-200 pt-6">
        <h2 className="text-sm font-semibold text-slate-900">Available tools</h2>
        <ul className="mt-3 space-y-2">
          {TOOLS.map((tool) => (
            <li key={tool.href}>
              <Link
                href={tool.href}
                className="text-sm text-blue-700 underline underline-offset-2"
              >
                {tool.heading}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
