import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { askAssistant, AssistantFailure, listProviders, type Answer } from "../assistant/client";
import { compactState, type Mode, type ProviderName } from "../assistant/protocol";
import { lastAssistantUndo, undoAssistantChanges } from "../db/repo";
import type { ISODate, TripState } from "../model/types";
import { useCloudStatus } from "../sync/cloud";
import { BlindTest } from "./BlindTest";
import { fmtDay } from "./format";
import { ProposalReview } from "./ProposalReview";
import { Button, Card, SectionLabel } from "./primitives";

/** One request to the assistant and its answer, with the waiting time shown (a whole trip can take minutes). */
export function useAsk(s: TripState) {
  const [answer, setAnswer] = useState<Answer>();
  const [error, setError] = useState<string>();
  const [since, setSince] = useState<number>();
  const [, tick] = useState(0);
  useEffect(() => { if (!since) return; const i = setInterval(() => tick((n) => n + 1), 1000); return () => clearInterval(i); }, [since]);
  const ask = async (mode: Mode, text: string, date?: ISODate, provider?: ProviderName) => {
    setError(undefined); setAnswer(undefined); setSince(Date.now());
    try { setAnswer(await askAssistant({ mode, text, date, provider, state: compactState(s) })); }
    catch (e) { setError(e instanceof AssistantFailure ? e.code : "failed"); }
    finally { setSince(undefined); }
  };
  const waited = since ? Math.round((Date.now() - since) / 1000) : 0;
  return { answer, error, busy: !!since, waited, ask, clear: () => { setAnswer(undefined); setError(undefined); } };
}

export function AskStatus({ busy, waited, error }: { busy: boolean; waited: number; error?: string }) {
  const { t } = useTranslation();
  if (busy) return <p role="status" className="text-[13px] text-soft">{t("assistant.thinking", { s: waited })}</p>;
  if (error) return <p role="alert" className="text-[13px] px-3 py-2 rounded-md" style={{ background: "var(--error-bg)", color: "var(--error-ink)", borderLeft: "3px solid var(--error)" }}>{t(`assistant.error_${error}`)}</p>;
  return null;
}

export function AssistantPage({ s, openSync }: { s: TripState; openSync: () => void }) {
  const { t } = useTranslation();
  const cloud = useCloudStatus();
  const { answer, error, busy, waited, ask, clear } = useAsk(s);
  const [text, setText] = useState("");
  const [providers, setProviders] = useState<ProviderName[]>([]);
  const [provider, setProvider] = useState<ProviderName>();
  const [blind, setBlind] = useState(false);
  const undo = useLiveQuery(() => lastAssistantUndo(s.trip.id), [s.trip.id]);
  useEffect(() => { listProviders().then((p) => { setProviders(p.providers); setProvider(p.default ?? undefined); }); }, []);
  const signedIn = cloud.phase !== "local" && cloud.phase !== "signedOut";

  if (blind) return <BlindTest providers={providers} onClose={() => setBlind(false)} />;
  if (answer) return <ProposalReview s={s} proposal={answer} onDone={() => { clear(); setText(""); }} />;

  return (
    <div className="flex flex-col gap-4">
      {!signedIn && (
        <Card className="p-3.5 text-[13.5px]">
          <p>{t("assistant.needSignIn")}</p>
          <Button className="mt-2" variant="ghost" onClick={openSync}>{t("assistant.goSignIn")}</Button>
        </Card>
      )}
      <div>
        <SectionLabel>{t("assistant.fromWishes")}</SectionLabel>
        {s.trip.intent ? <p className="text-[13.5px] italic mb-2" lang={s.trip.intent.lang}>« {s.trip.intent.text} »</p> : <p className="text-[13px] text-soft mb-2">{t("assistant.noWishes")}</p>}
        <Button className="w-full" disabled={busy || !signedIn} onClick={() => ask("propose", s.trip.intent?.text ?? "", undefined, provider)}>{t("assistant.proposeTrip")}</Button>
      </div>
      <div>
        <SectionLabel>{t("assistant.request")}</SectionLabel>
        <textarea className="field min-h-24" value={text} onChange={(e) => setText(e.target.value)} placeholder={t("assistant.requestPlaceholder")} />
        <Button className="w-full mt-2" disabled={busy || !signedIn || !text.trim()} onClick={() => ask("ask", text, undefined, provider)}>{t("assistant.send")}</Button>
      </div>
      <AskStatus busy={busy} waited={waited} error={error} />
      {providers.length > 1 && (
        <label className="block text-[12.5px] text-soft">{t("assistant.provider")}
          <select className="field" value={provider} onChange={(e) => setProvider(e.target.value as ProviderName)}>
            {providers.map((p) => <option key={p} value={p}>{t(`assistant.provider_${p}`)}</option>)}
          </select>
        </label>
      )}
      {undo && (
        <Card className="p-3.5 text-[13px] flex items-center justify-between gap-3">
          <span>{t("assistant.undoInfo", { date: fmtDay(undo.at.slice(0, 10)), time: undo.at.slice(11, 16) })}</span>
          <Button variant="ghost" onClick={() => window.confirm(t("assistant.undoConfirm")) && undoAssistantChanges(s.trip.id)}>{t("assistant.undo")}</Button>
        </Card>
      )}
      <p className="text-[12px] text-soft">{t("assistant.principles")}</p>
      <button className="text-left text-[13px] underline min-h-11" onClick={() => setBlind(true)}>{t("blind.open")}</button>
    </div>
  );
}
