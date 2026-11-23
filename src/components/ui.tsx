import { AlertCircle, Loader2, type LucideIcon } from "lucide-react";
import Link from "next/link";
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";

export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

// ---------- Botones ----------
type ButtonKind = "primary" | "secondary" | "ghost" | "danger" | "whatsapp";

const BUTTON_STYLES: Record<ButtonKind, string> = {
  primary: "bg-brand text-white hover:bg-brand-dark border-brand",
  secondary: "bg-white text-brand border-brand hover:bg-brand-soft",
  ghost: "bg-white text-ink border-line hover:bg-surface",
  danger: "bg-white text-red-700 border-red-300 hover:bg-red-50",
  whatsapp: "bg-[#25D366] text-white border-[#25D366] hover:brightness-95",
};

export function buttonClass(kind: ButtonKind = "primary", extra?: string) {
  return cn(
    "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border-[1.5px] px-5 font-semibold transition",
    "disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
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
  "w-full rounded-lg border border-line bg-white px-3 py-3 text-ink placeholder:text-muted/70 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 aria-[invalid=true]:border-red-400";

export function Field({
  label,
  hint,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }) {
  return (
    <label className={cn("flex flex-col gap-1", className)}>
      <span className="text-sm font-semibold">{label}</span>
      <input className={inputClass} {...props} />
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </label>
  );
}

export function TextArea({
  label,
  hint,
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; hint?: string }) {
  return (
    <label className={cn("flex flex-col gap-1", className)}>
      <span className="text-sm font-semibold">{label}</span>
      <textarea rows={3} className={cn(inputClass, "resize-y")} {...props} />
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </label>
  );
}

export { inputClass };

// ---------- Chips ----------
export function chipClass(selected?: boolean, disabled?: boolean) {
  return cn(
    "inline-flex shrink-0 items-center rounded-full border px-4 py-2 text-sm font-medium transition whitespace-nowrap",
    selected
      ? "border-brand bg-brand text-white"
      : disabled
        ? "border-line bg-surface text-muted line-through"
        : "border-line bg-white text-ink hover:border-brand/50"
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
  return <div className={cn("flex flex-col gap-2 rounded-2xl border border-line bg-white p-4", className)}>{children}</div>;
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
    <div role="alert" className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
      <AlertCircle className="size-5 shrink-0" />
      {message}
    </div>
  );
}

export function PageTitle({ children, sub }: { children: ReactNode; sub?: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{children}</h1>
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
  const btn = "flex size-9 items-center justify-center rounded-full text-lg font-semibold hover:bg-surface disabled:opacity-30";
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
