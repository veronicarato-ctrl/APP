// The AI providers the assistant can use. Keys and model names live only in the server's environment
// (Vercel project settings), never in the app. Claude goes through the official Anthropic SDK; the others
// through their chat completions HTTP API, to be confirmed at the first real call (SPEC, blind test).
import Anthropic from "@anthropic-ai/sdk";
import type { ProviderName } from "../src/assistant/protocol";

export type Env = Record<string, string | undefined>;
export interface CallResult { text: string; model: string; inputTokens: number; outputTokens: number }
export class ProviderError extends Error {
  constructor(public code: "refused" | "failed" | "notConfigured", message: string) { super(message); }
}

export const DEFAULT_ANTHROPIC_MODEL = "claude-opus-5-5";

/** Providers whose key (and model, where one must be named) is set on the server. */
export function configured(env: Env): ProviderName[] {
  const out: ProviderName[] = [];
  if (env.ANTHROPIC_API_KEY) out.push("anthropic");
  if (env.OPENAI_API_KEY && env.OPENAI_MODEL) out.push("openai");
  if (env.MISTRAL_API_KEY && env.MISTRAL_MODEL) out.push("mistral");
  return out;
}

export function defaultProvider(env: Env): ProviderName | undefined {
  const list = configured(env);
  const wanted = env.AI_PROVIDER as ProviderName | undefined;
  return wanted && list.includes(wanted) ? wanted : list[0];
}

export async function callProvider(name: ProviderName, system: string, user: string, env: Env, f: typeof fetch = fetch): Promise<CallResult> {
  if (!configured(env).includes(name)) throw new ProviderError("notConfigured", name);
  if (name === "anthropic") return callAnthropic(system, user, env);
  const base = name === "openai" ? "https://api.openai.com/v1" : "https://api.mistral.ai/v1";
  const key = name === "openai" ? env.OPENAI_API_KEY : env.MISTRAL_API_KEY;
  const model = (name === "openai" ? env.OPENAI_MODEL : env.MISTRAL_MODEL)!;
  const res = await f(`${base}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model, messages: [{ role: "system", content: system }, { role: "user", content: user }], response_format: { type: "json_object" } }),
  });
  if (!res.ok) throw new ProviderError("failed", `${name} ${res.status}`);
  const j = (await res.json()) as { model?: string; choices?: { message?: { content?: string }; finish_reason?: string }[]; usage?: { prompt_tokens?: number; completion_tokens?: number } };
  const text = j.choices?.[0]?.message?.content;
  if (typeof text !== "string") throw new ProviderError("failed", `${name} empty answer`);
  return { text, model: j.model ?? model, inputTokens: j.usage?.prompt_tokens ?? 0, outputTokens: j.usage?.completion_tokens ?? 0 };
}

async function callAnthropic(system: string, user: string, env: Env): Promise<CallResult> {
  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  const model = env.ANTHROPIC_MODEL || DEFAULT_ANTHROPIC_MODEL;
  try {
    // Planning a whole trip is demanding: high effort. A refused request is retried by the API on a fallback model.
    const r = await client.beta.messages.create({
      model, max_tokens: 16000, system, messages: [{ role: "user", content: user }],
      output_config: { effort: "high" },
      betas: ["server-side-fallback-2026-07-01"], fallbacks: "default",
    });
    if (r.stop_reason === "refusal") throw new ProviderError("refused", r.stop_details?.category ?? "refusal");
    const text = r.content.map((b) => (b.type === "text" ? b.text : "")).join("");
    return { text, model: r.model, inputTokens: r.usage.input_tokens, outputTokens: r.usage.output_tokens };
  } catch (e) {
    if (e instanceof ProviderError) throw e;
    if (e instanceof Anthropic.APIError) throw new ProviderError("failed", `anthropic ${e.status ?? ""}`.trim());
    throw new ProviderError("failed", "anthropic unreachable");
  }
}
