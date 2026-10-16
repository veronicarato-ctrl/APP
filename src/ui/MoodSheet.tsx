import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { ISODate, TripState } from "../model/types";
import { AskStatus, useAsk } from "./AssistantPage";
import { fmtDay } from "./format";
import { ProposalReview } from "./ProposalReview";
import { Button, Sheet } from "./primitives";

const QUICK = ["tired", "rain", "lessTime", "moreTime", "eatWell", "spendLess"] as const;

/** Mood of the day: the travellers say how they feel and what they want; only this day is adjusted. */
export function MoodSheet({ s, date, onClose }: { s: TripState; date: ISODate; onClose: () => void }) {
  const { t } = useTranslation();
  const [text, setText] = useState("");
  const { answer, error, busy, waited, ask } = useAsk(s);
  return (
    <Sheet title={t("mood.title")} subtitle={fmtDay(date)} onClose={onClose}>
      {answer ? <ProposalReview s={s} proposal={answer} onDone={onClose} /> : (
        <>
          <p className="text-[13px] text-soft mb-2">{t("mood.intro")}</p>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {QUICK.map((k) => (
              <button key={k} className="min-h-9 px-3 rounded-full text-[12.5px] font-semibold border border-line"
                onClick={() => setText((x) => (x ? `${x} ${t(`mood.${k}`)}` : t(`mood.${k}`)))}>{t(`mood.${k}`)}</button>
            ))}
          </div>
          <textarea className="field min-h-24" value={text} onChange={(e) => setText(e.target.value)} placeholder={t("mood.placeholder")} />
          <AskStatus busy={busy} waited={waited} error={error} />
          <div className="flex justify-end gap-2 mt-3">
            <Button variant="ghost" onClick={onClose}>{t("common.cancel")}</Button>
            <Button disabled={busy || !text.trim()} onClick={() => ask("mood", text, date)}>{t("mood.ask")}</Button>
          </div>
        </>
      )}
    </Sheet>
  );
}
