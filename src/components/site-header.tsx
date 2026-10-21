import Link from "next/link";
import { DesktopNav, MobileNav } from "@/components/nav-links";

function LogoMark() {
  return (
    <span
      aria-hidden="true"
      className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-900 font-mono text-[13px] font-bold text-white"
    >
      {"{}"}
    </span>
  );
}

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2 rounded-md py-1 pr-1"
          aria-label="DevTinyTools home"
        >
          <LogoMark />
          <span className="text-[15px] font-semibold tracking-tight text-slate-900">
            DevTinyTools
          </span>
        </Link>

        <div className="ml-2 hidden md:block">
          <DesktopNav />
        </div>

        <div className="ml-auto flex items-center gap-2">
          <Link
            href="/json-formatter"
            className="hidden rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-slate-700 sm:inline-flex"
          >
            Open formatter
          </Link>
          <MobileNav />
        </div>
      </div>
    </header>
  );
}
