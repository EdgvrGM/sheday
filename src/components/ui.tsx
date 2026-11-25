import { AlertCircle, Loader2, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useId, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from "react";

export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

// ---------- Botones ----------
type ButtonKind = "primary" | "secondary" | "ghost" | "danger" | "whatsapp";

const BUTTON_STYLES: Record<ButtonKind, string> = {
  // Ciruela como color principal; el rosa queda solo como detalle de marca
  primary: "bg-ink text-paper hover:bg-ink/85 border-ink",
  secondary: "bg-raised text-ink border-ink hover:bg-surface",
  ghost: "bg-raised text-ink border-line hover:bg-surface",
  danger: "bg-raised text-danger border-danger-line hover:bg-danger-soft",
  whatsapp: "bg-[#25D366] text-white border-[#25D366] hover:brightness-95",
};

export function buttonClass(kind: ButtonKind = "primary", extra?: string) {
  return cn(
    "inline-flex min-h-12 items-center justify-center gap-2 rounded-full border-[1.5px] px-6 font-semibold transition",
    "disabled:pointer-events-none disabled:opacity-50 active:scale-[0.97]",
    BUTTON_STYLES[kind],
    extra
  );
}

export function Button({
  kind = "primary",
  icon: Icon,
  loading,
  className,
  children,
  disabled,
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { kind?: ButtonKind; icon?: LucideIcon; loading?: boolean }) {
  return (
    <button type={type} disabled={disabled || loading} className={buttonClass(kind, className)} {...props}>
      {loading ? <Loader2 className="size-5 animate-spin" /> : Icon && <Icon className="size-5" />}
      {children}
    </button>
  );
}

export function ButtonLink({
  href,
  kind = "primary",
  icon: Icon,
  className,
  children,
  external,
}: {
  href: string;
  kind?: ButtonKind;
  icon?: LucideIcon;
  className?: string;
  children: ReactNode;
  external?: boolean;
}) {
  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={buttonClass(kind, className)}>
        {Icon && <Icon className="size-5" />}
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={buttonClass(kind, className)}>
      {Icon && <Icon className="size-5" />}
      {children}
    </Link>
  );
}

// ---------- Formularios ----------
const inputClass =
  "w-full rounded-xl border border-line bg-raised px-3.5 py-3 text-ink placeholder:text-muted/70 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 aria-[invalid=true]:border-danger-line";

/** Ayuda o error debajo del campo (el error reemplaza a la ayuda). */
export function FieldNote({ id, hint, error }: { id: string; hint?: string; error?: string | null }) {
  if (error) {
    return (
      <span id={id} className="text-sm font-medium text-danger">
        {error}
      </span>
    );
  }
  return hint ? (
    <span id={id} className="text-xs text-muted">
      {hint}
    </span>
  ) : null;
}

export function Field({
  label,
  hint,
  error,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string; error?: string | null }) {
  // useId: único aunque dos campos tengan la misma etiqueta
  const id = useId();
  return (
    <label className={cn("flex flex-col gap-1", className)}>
      <span className="text-sm font-semibold">{label}</span>
      <input
        className={inputClass}
        aria-invalid={error ? true : props["aria-invalid"]}
        aria-describedby={error || hint ? `${id}-note` : undefined}
        {...props}
      />
      <FieldNote id={`${id}-note`} hint={hint} error={error} />
    </label>
  );
}

export function TextArea({
  label,
  hint,
  error,
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; hint?: string; error?: string | null }) {
  const id = useId();
  return (
    <label className={cn("flex flex-col gap-1", className)}>
      <span className="text-sm font-semibold">{label}</span>
      <textarea
        rows={3}
        className={cn(inputClass, "resize-y")}
        aria-invalid={error ? true : undefined}
        aria-describedby={error || hint ? `${id}-note` : undefined}
        {...props}
      />
      <FieldNote id={`${id}-note`} hint={hint} error={error} />
    </label>
  );
}

export { inputClass };

// ---------- Chips ----------
/**
 * `solid`: filtro o elección principal (seleccionado relleno en ciruela).
 * `subtle`: filtro secundario, como las categorías (seleccionado solo con borde ciruela),
 * para que no compita con el principal.
 */
export function chipClass(selected?: boolean, disabled?: boolean, variant: "solid" | "subtle" = "solid") {
  return cn(
    "inline-flex min-h-11 shrink-0 items-center rounded-full border px-4 text-sm font-medium transition whitespace-nowrap",
    selected
      ? variant === "solid"
        ? "border-ink bg-ink text-paper"
        : "border-ink bg-raised font-semibold text-ink"
      : disabled
        ? "border-line bg-surface text-muted line-through"
        : "border-line bg-raised text-ink hover:border-ink/40"
  );
}

export function Chip({
  selected,
  disabled,
  children,
  onClick,
}: {
  selected?: boolean;
  disabled?: boolean;
  children: ReactNode;
  onClick?: () => void;
}) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} aria-pressed={selected} className={chipClass(selected, disabled)}>
      {children}
    </button>
  );
}

// ---------- Varios ----------
export function Badge({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn("inline-flex w-fit rounded-full px-2.5 py-0.5 text-xs font-bold", className)}>{children}</span>;
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("flex flex-col gap-2 rounded-xl border border-line bg-raised p-4", className)}>{children}</div>;
}

export function Spinner({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-1 items-center justify-center py-20", className)}>
      <Loader2 className="size-8 animate-spin text-brand" />
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  message,
  children,
}: {
  icon: LucideIcon;
  title: string;
  message?: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
      <Icon className="size-14 text-line" strokeWidth={1.5} />
      <h2 className="text-lg font-bold">{title}</h2>
      {message && <p className="max-w-sm text-muted">{message}</p>}
      {children && <div className="mt-2 flex w-full max-w-xs flex-col gap-2">{children}</div>}
    </div>
  );
}

export function ErrorBox({ message }: { message: string }) {
  return (
    <div role="alert" className="flex items-center gap-2 rounded-xl bg-danger-soft p-3 text-sm text-danger">
      <AlertCircle className="size-5 shrink-0" />
      {message}
    </div>
  );
}

export function PageTitle({ children, sub }: { children: ReactNode; sub?: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <h1 className="font-display text-3xl font-semibold text-balance md:text-4xl">{children}</h1>
      {sub && <p className="text-muted">{sub}</p>}
    </div>
  );
}

export function QuantityStepper({
  value,
  onChange,
  min = 1,
  max = 99,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
}) {
  const btn = "flex size-11 items-center justify-center rounded-full text-xl font-semibold hover:bg-surface disabled:opacity-30";
  return (
    <div className="inline-flex items-center rounded-full border border-line px-1">
      <button type="button" aria-label="Menos" className={btn} disabled={value <= min} onClick={() => onChange(Math.max(min, value - 1))}>
        −
      </button>
      <span className="min-w-7 text-center font-semibold">{value}</span>
      <button type="button" aria-label="Más" className={btn} disabled={value >= max} onClick={() => onChange(Math.min(max, value + 1))}>
        +
      </button>
    </div>
  );
}
