import type { ButtonHTMLAttributes, ReactNode } from "react";

export function BrandMark({ large = false }: { large?: boolean }) {
  return (
    <div className={`brand ${large ? "brand-large" : ""}`}>
      <span className="brand-mark" aria-hidden />
      <span className="brand-name">HabitLedger</span>
      <style>{`
        .brand {
          display: inline-flex;
          align-items: center;
          gap: 0.7rem;
          font-family: var(--font-display);
          font-weight: 700;
          letter-spacing: -0.03em;
        }
        .brand-large { font-size: clamp(2rem, 5vw, 3.4rem); }
        .brand-mark {
          width: 0.85em;
          height: 0.85em;
          border-radius: 0.28em;
          background:
            radial-gradient(circle at 30% 30%, #e8ff9a, var(--accent) 55%, #7aa312);
          box-shadow: inset 0 0 0 1px rgba(0,0,0,0.2);
        }
        .brand-name { line-height: 1; }
      `}</style>
    </div>
  );
}

export function Panel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`panel ${className}`}>
      {children}
      <style>{`
        .panel {
          background: linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.015));
          border: 1px solid var(--line);
          border-radius: var(--radius);
          padding: 1.25rem;
        }
      `}</style>
    </div>
  );
}

export function Button({
  variant = "primary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "oauth";
}) {
  return <button className={`btn btn-${variant}`} {...props} />;
}
