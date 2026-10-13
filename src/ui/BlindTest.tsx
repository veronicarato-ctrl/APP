import { useLiveQuery } from "dexie-react-hooks";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { assignCodes, blindState, proposalCost, summary, verifiedShare, type BlindRun, type BlindTestState } from "../assistant/blind";
import { askAssistant, AssistantFailure } from "../assistant/client";
import type { ProviderName } from "../assistant/protocol";
import { db } from "../db/db";
import { wallClock } from "../lib/time";
import { fmtMoney } from "./format";
import { ProposalReview } from "./ProposalReview";
import { Button, Card, SectionLabel } from "./primitives";

const KEY = "blindtest";
const EMPTY: BlindTestState = { stories: [], runs: [], revealed: false };
const save = (x: BlindTestState) => db.settings.put({ key: KEY, value: x });

/** Blind comparison of the AI providers configured on the server; results stay on this phone. */
export function BlindTest({ providers, onClose }: { providers: ProviderName[]; onClose: () => void }) {
  const { t } = useTranslation();
  const st = (useLiveQuery(() => db.settings.get(KEY), []))?.value as BlindTestState | undefined ?? EMPTY;
  const [draft, setDraft] = useState<string>();
  const [running, setRunning] = useState<string>();
  const [open, setOpen] = useState<string>();
  const stories = draft ?? st.stories.join("\n\n");
  const today = wallClock(Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC", new Date()).date;

  const run = async () => {
    const list = stories.split(/\n\s*\n/).map((x) => x.trim()).filter(Boolean);
    let state: BlindTestState = { stories: list, runs: [], revealed: false };
    await save(state);
    for (let i = 0; i < list.length; i++) {
      for (const { code, provider } of assignCodes(providers)) {
        setRunning(t("blind.running", { story: i + 1, total: list.length, code }));
        const r: BlindRun = { story: i, code, provider, scores: {} };
        try { r.answer = await askAssistant({ mode: "propose", text: list[i], provider, state: blindState(list[i], today) }); }
        catch (e) { r.error = e instanceof AssistantFailure ? e.code : "failed"; }
        state = { ...state, runs: [...state.runs, r] };
        await save(state);
      }
    }
    setRunning(undefined);
  };
  const score = async (r: BlindRun, k: keyof BlindRun["scores"], v: string) => {
    const n = v === "" ? undefined : Number(v);
    await save({ ...st, runs: st.runs.map((x) => (x === r ? { ...x, scores: { ...x.scores, [k]: n } } : x)) });
  };
  const exportJson = () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(st, null, 2)], { type: "application/json" }));
    const a = document.createElement("a"); a.href = url; a.download = `blind-test-${today}.json`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  };

  return (
    <div className="flex flex-col gap-4">
      <button onClick={onClose} className="min-h-11 text-sm font-semibold text-label self-start">‹ {t("blind.back")}</button>
      <h2 className="text-xl font-bold">{t("blind.title")}</h2>
      <p className="text-[13px] text-soft">{t("blind.intro", { count: providers.length })}</p>
      {providers.length < 2 && <p className="text-[13px]" style={{ color: "var(--warn-ink)" }}>{t("blind.needTwo")}</p>}
      <label className="block text-[12.5px] text-soft">{t("blind.stories")}
        <textarea className="field min-h-40" value={stories} onChange={(e) => setDraft(e.target.value)} placeholder={t("blind.storiesPlaceholder")} />
      </label>
      <Button disabled={!!running || providers.length < 2 || !stories.trim()} onClick={() => window.confirm(t("blind.confirmRun")) && run()}>{t("blind.run")}</Button>
      {running && <p role="status" className="text-[13px] text-soft">{running}</p>}

      {st.stories.map((story, i) => (
        <div key={i}>
          <SectionLabel>{t("blind.story", { n: i + 1 })}</SectionLabel>
          <p className="text-[13px] italic mb-2">« {story} »</p>
          <div className="flex flex-col gap-2">
            {st.runs.filter((r) => r.story === i).sort((a, b) => a.code.localeCompare(b.code)).map((r) => {
              const id = `${i}-${r.code}`;
              const cost = r.answer && proposalCost(r.answer);
              const v = r.answer && verifiedShare(r.answer);
              return (
                <Card key={id} className="p-3.5 text-[13px]">
                  <div className="flex justify-between gap-2">
                    <strong>{t("blind.answer", { code: r.code })}{st.revealed ? ` · ${t(`assistant.provider_${r.provider}`)}` : ""}</strong>
                    {r.answer && <button className="underline min-h-8" onClick={() => setOpen(open === id ? undefined : id)}>{open === id ? t("blind.hide") : t("blind.read")}</button>}
                  </div>
                  {r.error && <p style={{ color: "var(--error-ink)" }}>{t(`assistant.error_${r.error}`)}</p>}
                  {cost && v && (
                    <p className="text-[12px] text-soft mt-1">
                      {t("blind.auto", { cost: fmtMoney(Math.round(cost.total), cost.currency ?? "EUR"), budget: cost.budget ? fmtMoney(cost.budget, cost.currency ?? "EUR") : "–", verified: v.verified, places: v.places, s: Math.round((r.answer!.meta?.ms ?? 0) / 1000), tin: r.answer!.meta?.inputTokens ?? 0, tout: r.answer!.meta?.outputTokens ?? 0 })}
                      {cost.otherCurrency > 0 && ` ${t("blind.otherCurrency", { count: cost.otherCurrency })}`}
                    </p>
                  )}
                  {open === id && r.answer && <div className="mt-2"><ProposalReview proposal={{ ...r.answer, meta: undefined }} /></div>}
                  {r.answer && (
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      {(["refusals", "fidelity", "french"] as const).map((k) => (
                        <label key={k} className="text-[11.5px] text-soft">{t(`blind.score_${k}`)}
                          <select className="field" value={r.scores[k] ?? ""} onChange={(e) => score(r, k, e.target.value)}>
                            <option value="">–</option>
                            {Array.from({ length: k === "refusals" ? 11 : 6 }, (_, n) => <option key={n} value={n}>{n}</option>)}
                          </select>
                        </label>
                      ))}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </div>
      ))}

      {st.runs.length > 0 && !st.revealed && <Button variant="ghost" onClick={() => window.confirm(t("blind.confirmReveal")) && save({ ...st, revealed: true })}>{t("blind.reveal")}</Button>}
      {st.revealed && (
        <div>
          <SectionLabel>{t("blind.results")}</SectionLabel>
          <Card>
            {summary(st.runs).map((x) => (
              <div key={x.provider} className="px-3.5 py-2 border-t border-line first:border-t-0 text-[13px]">
                <strong>{t(`assistant.provider_${x.provider}`)}</strong>
                <p className="text-[12.5px] text-soft">{t("blind.resultLine", {
                  answered: x.answered, failed: x.failed, over: x.overBudget, fidelity: x.fidelity?.toFixed(1) ?? "–", french: x.french?.toFixed(1) ?? "–",
                  refusals: x.refusals?.toFixed(1) ?? "–", verified: x.verified === undefined ? "–" : Math.round(x.verified * 100), s: x.seconds?.toFixed(0) ?? "–",
                  tin: Math.round(x.inputTokens ?? 0), tout: Math.round(x.outputTokens ?? 0),
                })}</p>
              </div>
            ))}
          </Card>
        </div>
      )}
      {st.runs.length > 0 && <Button variant="ghost" onClick={exportJson}>{t("blind.export")}</Button>}
    </div>
  );
}
