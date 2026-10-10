import { useEffect, type CSSProperties, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { Issue } from "../engine/rules";
import type { SlotType, Source, Text } from "../model/types";
import { useIssueText } from "./format";

/** Renders stored text in its own language, so screen readers and translation tools know it. */
export const T = ({ v, className }: { v?: Text; className?: string }) =>
  v ? <span lang={v.lang} className={className}>{v.text}</span> : null;

export const typeVars = (type: SlotType | "other") => ({
  bg: `var(--${type}-bg)`, bd: `var(--${type}-bd)`, tx: `var(--${type}-tx)`, dot: `var(--${type}-dot)`,
});

export function TypePill({ type }: { type: SlotType }) {
  const { t } = useTranslation();
  const c = typeVars(type);
  return (
    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap border"
      style={{ background: c.bg, color: c.tx, borderColor: c.bd }}>{t(`type.${type}`)}</span>
  );
}

export function Card({ children, className = "", style, topColor }: { children: ReactNode; className?: string; style?: CSSProperties; topColor?: string }) {
  return (
    <div className={`bg-card rounded-[14px] border border-line overflow-hidden ${className}`}
      style={{ ...(topColor ? { borderTop: `3px solid ${topColor}` } : {}), ...style }}>{children}</div>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return <p className="text-[11px] font-bold tracking-[0.18em] uppercase text-label mb-2">{children}</p>;
}

export function IssueBox({ issue, className = "" }: { issue: Issue; className?: string }) {
  const text = useIssueText();
  const err = issue.level === "error";
  return (
    <div role={err ? "alert" : undefined} className={`text-[12.5px] px-3 py-1.5 rounded-md ${className}`}
      style={{ background: err ? "var(--error-bg)" : "var(--warn-bg)", borderLeft: `3px solid ${err ? "var(--error)" : "var(--warn)"}`, color: err ? "var(--error-ink)" : "var(--warn-ink)" }}>
      {text(issue)}
    </div>
  );
}

export function Sources({ ids, sources }: { ids?: string[]; sources: Record<string, Source> }) {
  const { t } = useTranslation();
  if (!ids?.length) return null;
  return (
    <div className="mt-1.5 text-[11.5px] text-soft flex flex-col gap-0.5">
      {ids.map((id) => sources[id] && (
        <a key={id} href={sources[id].url} target="_blank" rel="noopener noreferrer" className="underline decoration-line underline-offset-2">
          {sources[id].title} <span className="opacity-80">({t("common.checked", { date: sources[id].checkedAt })})</span>
        </a>
      ))}
    </div>
  );
}

export function Button({ children, onClick, variant = "primary", disabled, className = "", type = "button" }: {
  children: ReactNode; onClick?: () => void; variant?: "primary" | "ghost" | "danger"; disabled?: boolean; className?: string; type?: "button" | "submit";
}) {
  const styles: Record<string, CSSProperties> = {
    primary: { background: "var(--id-dark)", color: "var(--on-color)" },
    ghost: { background: "transparent", color: "var(--ink)", border: "1px solid var(--line)" },
    danger: { background: "var(--error)", color: "var(--on-color)" },
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled} style={styles[variant]}
      className={`min-h-11 px-4 rounded-[10px] font-semibold disabled:opacity-45 ${className}`}>{children}</button>
  );
}

/** Bottom sheet used by every editor. */
export function Sheet({ title, subtitle, onClose, children }: { title: ReactNode; subtitle?: ReactNode; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center" style={{ background: "var(--overlay)" }} onClick={onClose}>
      <div role="dialog" aria-modal="true" className="sheet-in bg-card text-ink w-full max-w-xl rounded-t-[14px] px-4 pt-4 pb-6 max-h-[88vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-start gap-3 mb-3">
          <div>
            <h2 className="text-lg font-bold">{title}</h2>
            {subtitle && <p className="text-sm text-soft">{subtitle}</p>}
          </div>
          <button aria-label="Close" onClick={onClose} className="min-w-11 min-h-11 -mr-2 -mt-2 text-soft text-xl">×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block mb-3 text-[12.5px] text-soft">{label}{children}</label>;
}
