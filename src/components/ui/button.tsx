export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md";

const BASE =
  "inline-flex items-center justify-center gap-1.5 rounded-md border font-medium transition-colors select-none disabled:cursor-not-allowed disabled:opacity-45";

const SIZES: Record<ButtonSize, string> = {
  sm: "px-2.5 py-1 text-xs",
  md: "px-3 py-2 text-sm",
};

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "border-transparent bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800",
  secondary:
    "border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50 active:bg-slate-100",
  ghost:
    "border-transparent bg-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-700",
  danger:
    "border-slate-300 bg-white text-red-600 hover:border-red-300 hover:bg-red-50",
};

export function buttonClass(
  variant: ButtonVariant = "secondary",
  size: ButtonSize = "md",
  extra = "",
): string {
  return [BASE, SIZES[size], VARIANTS[variant], extra]
    .filter(Boolean)
    .join(" ");
}
