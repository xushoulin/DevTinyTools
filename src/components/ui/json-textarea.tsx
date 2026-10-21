import type { KeyboardEventHandler, ReactNode } from "react";

interface JsonTextAreaProps {
  id: string;
  label: string;
  value: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  placeholder?: string;
  invalid?: boolean;
  /** Right-hand side of the panel header, e.g. a character counter. */
  meta?: ReactNode;
  /** Header actions rendered above the text area. */
  actions?: ReactNode;
  bodyClassName?: string;
  onKeyDown?: KeyboardEventHandler<HTMLTextAreaElement>;
  describedBy?: string;
}

export function JsonTextArea({
  id,
  label,
  value,
  onChange,
  readOnly = false,
  placeholder,
  invalid = false,
  meta,
  actions,
  bodyClassName = "h-[300px] lg:h-[440px]",
  onKeyDown,
  describedBy,
}: JsonTextAreaProps) {
  return (
    <div
      className={`flex min-w-0 flex-col overflow-hidden rounded-lg border bg-slate-950 ${
        invalid ? "border-red-400" : "border-slate-800"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 bg-slate-900 px-3 py-1.5">
        <label
          htmlFor={id}
          className="text-[11px] font-semibold uppercase tracking-wider text-slate-300"
        >
          {label}
        </label>
        <div className="flex items-center gap-3 text-[11px] text-slate-400">
          {meta}
          {actions}
        </div>
      </div>

      <textarea
        id={id}
        name={id}
        value={value}
        readOnly={readOnly}
        onChange={
          onChange
            ? (event) => onChange(event.target.value)
            : undefined
        }
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        aria-readonly={readOnly || undefined}
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
        autoComplete="off"
        wrap="off"
        className={`code-field block w-full resize-none border-0 bg-slate-950 px-3 py-3 text-slate-100 outline-none placeholder:text-slate-600 ${bodyClassName}`}
      />
    </div>
  );
}
