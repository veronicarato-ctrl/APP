import { useLiveQuery } from "dexie-react-hooks";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { db, type Conflict } from "../db/db";
import { saveBooking } from "../db/repo";
import type { TripState } from "../model/types";
import { invite, sendSignInEmail, signInWithPassword, signOut, signUpWithPassword, syncNow, useCloudStatus, verifyCode } from "../sync/cloud";
import { Button, Card, Field, SectionLabel } from "./primitives";

const when = (iso?: string) => (iso ? new Date(iso).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }) : undefined);
const show = (v: unknown) => (v === undefined || v === null || v === "" ? "—" : typeof v === "object" && v && "text" in v ? String((v as { text: unknown }).text) : typeof v === "object" ? JSON.stringify(v) : String(v));

function Notice({ tone, children }: { tone: "warn" | "error"; children: React.ReactNode }) {
  const err = tone === "error";
  return (
    <p role="status" className="text-[13px] px-3 py-2 rounded-md mb-3"
      style={{ background: err ? "var(--error-bg)" : "var(--warn-bg)", color: err ? "var(--error-ink)" : "var(--warn-ink)", borderLeft: `3px solid ${err ? "var(--error)" : "var(--warn)"}` }}>{children}</p>
  );
}

export function SyncPage() {
  const { t } = useTranslation();
  const st = useCloudStatus();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [info, setInfo] = useState<string>();
  const [sentTo, setSentTo] = useState<string>();
  const [guest, setGuest] = useState("");
  const [msg, setMsg] = useState<string>();
  const [busy, setBusy] = useState(false);
  const run = async (f: () => Promise<void>) => {
    setBusy(true); setMsg(undefined); setInfo(undefined);
    try { await f(); } catch (e) {
      const m = e instanceof Error ? e.message : String((e as { message?: string }).message ?? e);
      setMsg(/fetch|network|load failed/i.test(m) ? t("sync.netError") : m);
    }
    setBusy(false);
  };

  if (st.phase === "local") return <p className="text-sm">{t("sync.localIntro")}</p>;

  if (st.phase === "signedOut")
    return (
      <div>
        <p className="text-sm mb-3">{t("sync.passwordIntro")}</p>
        <Field label={t("sync.email")}><input className="field" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
        <Field label={t("sync.password")}><input className="field" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
        <div className="flex flex-wrap gap-2">
          <Button disabled={!email || password.length < 8 || busy} onClick={() => run(() => signInWithPassword(email.trim(), password))}>{t("sync.signIn")}</Button>
          <Button variant="ghost" disabled={!email || password.length < 8 || busy}
            onClick={() => run(async () => { const confirm = await signUpWithPassword(email.trim(), password); if (confirm) setInfo(t("sync.confirmSent", { email: email.trim() })); })}>
            {t("sync.createAccount")}
          </Button>
        </div>
        <p className="text-[12px] text-soft mt-2">{t("sync.passwordRule")}</p>
        {info && <p className="text-[13px] mt-3">{info}</p>}
        {msg && <div className="mt-3"><Notice tone="error">{msg}</Notice></div>}

        <details className="mt-6">
          <summary className="text-[13px] text-soft cursor-pointer min-h-11 flex items-center">{t("sync.codeAlternative")}</summary>
          <p className="text-sm my-2">{t("sync.signInIntro")}</p>
          <Button disabled={!email || busy} onClick={() => run(async () => { await sendSignInEmail(email.trim()); setSentTo(email.trim()); })}>{t("sync.sendLink")}</Button>
          {sentTo && (
            <div className="mt-4">
              <p className="text-sm mb-2">{t("sync.sent", { email: sentTo })}</p>
              <Field label={t("sync.code")}><input className="field" inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value)} /></Field>
              <Button disabled={!code || busy} onClick={() => run(() => verifyCode(sentTo, code.trim()))}>{t("sync.verify")}</Button>
            </div>
          )}
        </details>
      </div>
    );

  return (
    <div>
      {st.phase === "offline" && <Notice tone="warn">{t("sync.offline")}</Notice>}
      {st.phase === "unreachable" && <Notice tone="error">{t("sync.unreachable")}</Notice>}
      {st.phase === "forbidden" && <Notice tone="error">{t("sync.forbidden")}</Notice>}
      {st.phase === "error" && <Notice tone="error">{t("sync.error", { error: st.error })}</Notice>}
      <Card className="p-3.5 mb-4">
        <p className="font-semibold">{t("sync.signedInAs", { email: st.email })}</p>
        <p className="text-[13px] text-soft">{t("sync.lastSync", { when: when(st.lastSync) ?? t("sync.never") })}</p>
        <p className="text-[13px]">{st.pending ? t("sync.pending", { count: st.pending }) : t("sync.allSent")}</p>
        <div className="flex gap-2 mt-3">
          <Button disabled={busy || st.phase === "syncing"} onClick={() => run(syncNow)}>{t("sync.syncNow")}</Button>
          <Button variant="ghost" onClick={() => run(signOut)}>{t("sync.signOut")}</Button>
        </div>
      </Card>
      <SectionLabel>{t("sync.members")}</SectionLabel>
      <div className="flex flex-col gap-1.5 mb-4">
        {st.members.map((m, i) => <p key={i} className="text-[13.5px]">{m.email ?? "—"} <span className="text-soft">({t(`sync.${m.role}`)})</span></p>)}
      </div>
      <Field label={t("sync.invite")}><input className="field" type="email" value={guest} onChange={(e) => setGuest(e.target.value)} /></Field>
      <Button disabled={!guest || busy} onClick={() => run(async () => { await invite(guest.trim()); setMsg(t("sync.invited", { email: guest.trim() })); setGuest(""); })}>{t("sync.inviteBtn")}</Button>
      {msg && <p className="text-[13px] mt-3">{msg}</p>}
    </div>
  );
}

/** Confirmed bookings changed on both phones: shows both values and lets the user switch. */
export function Conflicts({ s }: { s: TripState }) {
  const { t } = useTranslation();
  const list = useLiveQuery(() => db.conflicts.where({ tripId: s.trip.id }).filter((c) => !c.dismissed).toArray(), [s.trip.id]) ?? [];
  if (!list.length) return null;
  const dismiss = (c: Conflict) => db.conflicts.update(c.id, { dismissed: true });
  const switchValue = async (c: Conflict) => {
    const b = s.bookings.find((x) => x.id === c.recordId);
    if (!b) return;
    const patch = Object.fromEntries(c.fields.map((f) => [f.field, f.kept === "mine" ? f.theirs : f.mine]));
    await saveBooking(s.trip.id, { ...b, ...patch });
    await dismiss(c);
  };
  return (
    <div className="mb-5">
      <p className="text-[11px] font-bold tracking-[0.18em] uppercase mb-2" style={{ color: "var(--error-ink)" }}>{t("sync.conflictsTitle")}</p>
      <p className="text-[13px] mb-2">{t("sync.conflictIntro")}</p>
      {list.map((c) => (
        <Card key={c.id} className="p-3.5 mb-2" topColor="var(--error)">
          <strong>{c.title}</strong>
          <table className="w-full text-[13px] mt-2">
            <thead><tr className="text-left text-soft"><th className="pr-2" /><th className="pr-2">{t("sync.mine")}</th><th>{t("sync.theirs")}</th></tr></thead>
            <tbody>
              {c.fields.map((f) => (
                <tr key={f.field} className="border-t border-line align-top">
                  <td className="pr-2 py-1 text-soft">{f.field}</td>
                  <td className="pr-2 py-1">{show(f.mine)}{f.kept === "mine" && <b> ({t("sync.kept")})</b>}</td>
                  <td className="py-1">{show(f.theirs)}{f.kept === "theirs" && <b> ({t("sync.kept")})</b>}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex gap-2 mt-2">
            <Button variant="ghost" onClick={() => switchValue(c)}>{t("sync.useOther")}</Button>
            <Button onClick={() => dismiss(c)}>{t("sync.dismiss")}</Button>
          </div>
        </Card>
      ))}
    </div>
  );
}
