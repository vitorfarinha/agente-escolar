import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

// text-base (16px) evita o zoom automático do iOS Safari ao focar o campo;
// só encolhe para text-sm a partir do breakpoint sm.
const fieldClass =
  "rounded-xl border border-subtle bg-surface-card px-3 py-2 text-base text-primary placeholder:text-muted outline-none focus:border-brand-900 focus:ring-2 focus:ring-brand-900 sm:text-sm";

export function Input({ className = "", ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...rest} className={`${fieldClass} ${className}`} />;
}

export function Select({ className = "", ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...rest} className={`${fieldClass} ${className}`} />;
}

export function Textarea({ className = "", ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...rest} className={`${fieldClass} ${className}`} />;
}

type ButtonVariant = "primary" | "ghost" | "danger" | "link" | "danger-link" | "icon-danger";

const buttonVariants: Record<ButtonVariant, string> = {
  primary: "rounded-full bg-brand-900 px-4 py-2 text-white hover:bg-brand-900/90",
  ghost: "rounded-full px-4 py-2 text-secondary hover:bg-surface-bg",
  danger: "rounded-full px-4 py-2 text-red-600 hover:bg-red-50",
  link: "px-0 py-0 text-brand-900 hover:underline",
  "danger-link": "px-0 py-0 text-red-600 hover:underline",
  "icon-danger": "rounded-full p-2 text-secondary hover:bg-red-50 hover:text-red-600",
};

export function Button({
  variant = "primary",
  className = "",
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  const base =
    "inline-flex items-center justify-center gap-1.5 text-sm font-medium transition disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-900 focus-visible:ring-offset-2";
  return <button {...rest} className={`${base} ${buttonVariants[variant]} ${className}`} />;
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-subtle bg-surface-card p-4 shadow-sm sm:p-6 ${className}`}>{children}</div>;
}

export function Badge({ tone = "neutral", children }: { tone?: "neutral" | "success"; children: ReactNode }) {
  const tones = { neutral: "bg-surface-bg text-secondary", success: "bg-emerald-50 text-emerald-700" };
  return <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${tones[tone]}`}>{children}</span>;
}

export function PageHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-6">
      <h1 className="text-xl font-bold text-primary">{title}</h1>
      {description && <p className="mt-1 text-sm text-secondary">{description}</p>}
    </div>
  );
}

export function FieldLabel({ children }: { children: ReactNode }) {
  return <span className="mb-1 block text-xs font-medium text-secondary">{children}</span>;
}
