"use client";

import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";

type Base = { label: string; error?: string; hint?: ReactNode; className?: string; optional?: boolean };

function Wrap({ id, label, error, hint, className, optional, children }: Base & { id: string; children: ReactNode }) {
  return (
    <div className={className}>
      <label htmlFor={id} className="field-label">
        {label}
        {optional && <span className="field-optional ml-1 font-normal tracking-normal normal-case">(opcional)</span>}
      </label>
      {children}
      {error ? (
        <p id={`${id}-err`} className="field-error mt-1.5 text-xs" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="field-hint mt-1.5 text-xs">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function TextField({ label, error, hint, className, optional, ...props }: Base & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  return (
    <Wrap id={id} label={label} error={error} hint={hint} className={className} optional={optional}>
      <input id={id} className="field" aria-invalid={!!error} aria-describedby={error ? `${id}-err` : hint ? `${id}-hint` : undefined} {...props} />
    </Wrap>
  );
}

export function SelectField({
  label,
  error,
  hint,
  className,
  optional,
  options,
  placeholder,
  optionLabels,
  ...props
}: Base & SelectHTMLAttributes<HTMLSelectElement> & { options: string[]; placeholder?: string; optionLabels?: Record<string, string> }) {
  const id = useId();
  return (
    <Wrap id={id} label={label} error={error} hint={hint} className={className} optional={optional}>
      <div className="relative">
        <select id={id} className="field appearance-none pr-10" aria-invalid={!!error} {...props}>
          {placeholder && (
            <option value="" className="bg-ink">
              {placeholder}
            </option>
          )}
          {options.map((o) => (
            <option key={o} value={o} className="bg-ink">
              {optionLabels?.[o] ?? o}
            </option>
          ))}
        </select>
        <svg className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-brand" width="12" height="8" viewBox="0 0 12 8" aria-hidden>
          <path d="M1 1l5 5 5-5" stroke="currentColor" strokeWidth="1.6" fill="none" />
        </svg>
      </div>
    </Wrap>
  );
}

export function TextArea({ label, error, hint, className, optional, ...props }: Base & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const id = useId();
  return (
    <Wrap id={id} label={label} error={error} hint={hint} className={className} optional={optional}>
      <textarea id={id} className="field min-h-28 resize-y" aria-invalid={!!error} aria-describedby={error ? `${id}-err` : undefined} {...props} />
    </Wrap>
  );
}
