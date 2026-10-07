"use client";

import { useId, type ComponentProps, type InputHTMLAttributes, type ReactNode } from "react";

import { Icon } from "@/components/icons";
import { cn } from "@/lib/cn";

/**
 * Form primitives.
 *
 * `Field` owns the id wiring, so every control has a real `<label for>`, hint and
 * error text are linked with `aria-describedby`, and invalid controls expose
 * `aria-invalid`. A control cannot be rendered without a label.
 */

// 16 px text on small screens: iOS Safari zooms the page when a control with
// smaller text is focused, which pushes the tool off screen under the keyboard.
export const controlClasses =
  "w-full rounded-[var(--radius)] border border-border-strong bg-bg px-3 py-2.5 text-base text-fg sm:text-sm " +
  "transition-colors hover:border-fg-subtle focus-visible:border-accent " +
  "disabled:cursor-not-allowed disabled:opacity-60 aria-[invalid=true]:border-danger-fg";

export interface FieldContext {
  id: string;
  describedBy: string | undefined;
  invalid: boolean;
}

export interface FieldProps {
  label: ReactNode;
  hint?: ReactNode;
  error?: string | null;
  className?: string;
  /** Visually hide the label (it stays available to assistive technology). */
  hideLabel?: boolean;
  /** Extra content on the label row, such as a character count. */
  aside?: ReactNode;
  children: (context: FieldContext) => ReactNode;
}

export function Field({ label, hint, error, className, hideLabel, aside, children }: FieldProps) {
  const base = useId();
  const id = `${base}-control`;
  const hintId = hint ? `${base}-hint` : undefined;
  const errorId = error ? `${base}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className={cn("flex items-baseline justify-between gap-3", hideLabel && !aside && "sr-only")}>
        <label htmlFor={id} className={cn("text-sm font-medium text-fg", hideLabel && "sr-only")}>
          {label}
        </label>
        {aside ? <span className="text-xs text-fg-subtle">{aside}</span> : null}
      </div>
      {hint ? (
        <p id={hintId} className="text-xs leading-relaxed text-fg-muted">
          {hint}
        </p>
      ) : null}
      {children({ id, describedBy, invalid: Boolean(error) })}
      {error ? (
        <p id={errorId} className="flex items-start gap-1.5 text-sm text-danger-fg">
          <Icon name="alert" size={16} className="mt-0.5 shrink-0" />
          {error}
        </p>
      ) : null}
    </div>
  );
}

type WithContext<T> = T & { context: FieldContext };

export function TextInput({ context, className, ...rest }: WithContext<ComponentProps<"input">>) {
  return (
    <input
      id={context.id}
      aria-describedby={context.describedBy}
      aria-invalid={context.invalid || undefined}
      className={cn(controlClasses, className)}
      {...rest}
    />
  );
}

export function TextArea({ context, className, rows = 8, ...rest }: WithContext<ComponentProps<"textarea">>) {
  return (
    <textarea
      id={context.id}
      rows={rows}
      aria-describedby={context.describedBy}
      aria-invalid={context.invalid || undefined}
      className={cn(controlClasses, "resize-y leading-relaxed", className)}
      {...rest}
    />
  );
}

export function Select({ context, className, children, ...rest }: WithContext<ComponentProps<"select">>) {
  return (
    <div className="relative">
      <select
        id={context.id}
        aria-describedby={context.describedBy}
        aria-invalid={context.invalid || undefined}
        className={cn(controlClasses, "appearance-none pr-9", className)}
        {...rest}
      >
        {children}
      </select>
      <Icon
        name="chevron-down"
        size={16}
        className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-fg-subtle"
      />
    </div>
  );
}

export function Checkbox({
  label,
  description,
  className,
  ...rest
}: Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & { label: ReactNode; description?: ReactNode }) {
  const id = useId();
  const descriptionId = description ? `${id}-description` : undefined;
  return (
    <div className={cn("flex items-start gap-2.5", className)}>
      <input
        id={id}
        type="checkbox"
        aria-describedby={descriptionId}
        className="mt-0.5 size-5 shrink-0 cursor-pointer accent-(--accent)"
        {...rest}
      />
      <div className="min-w-0">
        <label htmlFor={id} className="cursor-pointer text-sm text-fg">
          {label}
        </label>
        {description ? (
          <p id={descriptionId} className="text-xs text-fg-muted">
            {description}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export interface SegmentedOption<T extends string> {
  value: T;
  label: ReactNode;
}

/**
 * A choice between a few options, as native radio buttons in a fieldset. Arrow
 * keys move between options, as users of assistive technology expect.
 */
export function Segmented<T extends string>({
  legend,
  value,
  options,
  onChange,
  className,
  hint,
}: {
  legend: ReactNode;
  value: T;
  options: readonly SegmentedOption<T>[];
  onChange: (value: T) => void;
  className?: string;
  hint?: ReactNode;
}) {
  const name = useId();
  const hintId = hint ? `${name}-hint` : undefined;
  return (
    <fieldset className={cn("flex min-w-0 flex-col gap-1.5", className)} aria-describedby={hintId}>
      <legend className="mb-1.5 text-sm font-medium text-fg">{legend}</legend>
      <div className="flex flex-wrap gap-1 rounded-[var(--radius)] border border-border-strong bg-bg p-1">
        {options.map((option) => (
          <label
            key={option.value}
            className={cn(
              "relative flex min-h-9 flex-1 cursor-pointer items-center justify-center rounded-md px-3 text-sm whitespace-nowrap transition-colors",
              "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-1 has-[:focus-visible]:outline-accent",
              value === option.value
                ? "bg-surface-raised font-medium text-fg shadow-sm"
                : "text-fg-muted hover:text-fg",
            )}
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              className="sr-only"
            />
            {option.label}
          </label>
        ))}
      </div>
      {hint ? (
        <p id={hintId} className="text-xs text-fg-muted">
          {hint}
        </p>
      ) : null}
    </fieldset>
  );
}
