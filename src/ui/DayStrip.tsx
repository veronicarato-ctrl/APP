import { useEffect, useRef } from "react";
import type { Issue } from "../engine/rules";
import { dateRange, weekday, weekdayName } from "../lib/dates";
import { LOCALE } from "../i18n";
import type { ISODate, TripState } from "../model/types";
import { fmtDayLong } from "./format";
import { dayBackground, dayRegions } from "./regions";

export function DayStrip({ s, issues, selected, onSelect }: { s: TripState; issues: Issue[]; selected?: ISODate; onSelect: (d: ISODate) => void }) {
  const dates = dateRange(s.trip.start, s.trip.end);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (selected) ref.current?.querySelector(`[data-date="${selected}"]`)?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [selected]);
  return (
    <div ref={ref} role="list" aria-label="Trip days" className="flex gap-1 overflow-x-auto py-1 [scrollbar-width:none]">
      {dates.map((d) => {
        const err = issues.some((i) => i.date === d && i.level === "error");
        const sel = selected === d;
        return (
          <button key={d} data-date={d} role="listitem" onClick={() => onSelect(d)}
            aria-label={fmtDayLong(d) + (err ? ", has errors" : "")} aria-current={sel ? "date" : undefined}
            className="relative shrink-0 w-11 min-h-12 rounded-lg text-center leading-tight text-[11px] font-semibold"
            style={{ background: dayBackground(dayRegions(s, d)), color: "var(--id-darker)", boxShadow: sel ? "0 0 0 2px var(--on-color)" : undefined }}>
            <span className="block opacity-80">{weekdayName(weekday(d), LOCALE, "short")}</span>
            <b className="block text-base">{Number(d.slice(8))}</b>
            {err && <span className="absolute top-1 right-1 w-2 h-2 rounded-full" style={{ background: "var(--error)", boxShadow: "0 0 0 1.5px var(--on-color)" }} />}
          </button>
        );
      })}
    </div>
  );
}
