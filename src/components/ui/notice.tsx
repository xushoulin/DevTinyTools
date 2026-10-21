import type { ReactNode } from "react";

export type NoticeTone = "success" | "error" | "info";

const TONES: Record<
  NoticeTone,
  { wrapper: string; icon: string; title: string; symbol: string }
> = {
  success: {
    wrapper: "border-emerald-200 bg-emerald-50 text-emerald-900",
    icon: "bg-emerald-600 text-white",
    title: "text-emerald-900",
    symbol: "✓",
  },
  error: {
    wrapper: "border-red-200 bg-red-50 text-red-900",
    icon: "bg-red-600 text-white",
    title: "text-red-900",
    symbol: "!",
  },
  info: {
    wrapper: "border-slate-200 bg-slate-50 text-slate-700",
    icon: "bg-slate-500 text-white",
    title: "text-slate-900",
    symbol: "i",
  },
};

interface NoticeProps {
  tone: NoticeTone;
  title: string;
  children?: ReactNode;
  /** Announce updates to assistive technology. */
  live?: boolean;
}

export function Notice({ tone, title, children, live = true }: NoticeProps) {
  const style = TONES[tone];

  return (
    <div
      className={`flex items-start gap-2.5 rounded-md border px-3 py-2.5 text-sm ${style.wrapper}`}
      role={tone === "error" ? "alert" : "status"}
      aria-live={live ? (tone === "error" ? "assertive" : "polite") : "off"}
    >
      <span
        aria-hidden="true"
        className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold leading-none ${style.icon}`}
      >
        {style.symbol}
      </span>
      <div className="min-w-0 space-y-1">
        <p className={`font-medium ${style.title}`}>{title}</p>
        {children ? <div className="text-[13px] leading-relaxed">{children}</div> : null}
      </div>
    </div>
  );
}
