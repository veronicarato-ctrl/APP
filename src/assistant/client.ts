// Calls the assistant server function with the signed-in traveller's session.
import { cloud } from "../sync/cloud";
import type { AssistantRequest, Proposal, ProviderName } from "./protocol";

export type AssistantError = "signIn" | "offline" | "noProvider" | "refused" | "notJson" | "failed" | "tooLarge";
export class AssistantFailure extends Error { constructor(public code: AssistantError) { super(code); } }
export type Answer = Proposal & { dropped: number };

async function token() {
  const { data } = (await cloud?.auth.getSession()) ?? { data: { session: null } };
  return data.session?.access_token;
}

export async function askAssistant(req: AssistantRequest): Promise<Answer> {
  if (typeof navigator !== "undefined" && !navigator.onLine) throw new AssistantFailure("offline");
  const tk = await token();
  if (!tk) throw new AssistantFailure("signIn");
  let res: Response;
  try {
    res = await fetch("/api/assistant", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${tk}` }, body: JSON.stringify(req) });
  } catch {
    throw new AssistantFailure("offline");
  }
  const j = await res.json().catch(() => ({}));
  if (!res.ok) {
    const e = (j as { error?: string }).error;
    throw new AssistantFailure(e === "signIn" || e === "noProvider" || e === "refused" || e === "notJson" || e === "tooLarge" ? e : "failed");
  }
  return j as Answer;
}

export async function listProviders(): Promise<{ providers: ProviderName[]; default: ProviderName | null }> {
  try {
    const res = await fetch("/api/assistant");
    if (res.ok) return await res.json();
  } catch { /* offline or not deployed */ }
  return { providers: [], default: null };
}
