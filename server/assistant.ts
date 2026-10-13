// The assistant endpoint: checks the traveller, asks the chosen AI, checks its answer and the proposed places.
import { PROVIDERS, parseProposal, systemPrompt, userMessage, type AssistantRequest, type Mode, type Proposal, type ProposedPlace, type Verification } from "../src/assistant/protocol";
import { userFromToken } from "./auth";
import { verifyPlace } from "./places";
import { callProvider, configured, defaultProvider, ProviderError, type CallResult, type Env } from "./providers";

export interface Deps {
  env: Env;
  fetch: typeof fetch;
  call?: typeof callProvider;
  now?: () => Date;
}

const MODES: Mode[] = ["propose", "mood", "ask"];
const MAX_BODY = 400_000;
const MAX_CHECKS = 40;
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });

export async function handle(req: Request, deps: Deps): Promise<Response> {
  const { env } = deps;
  if (req.method === "GET") return json(200, { providers: configured(env), default: defaultProvider(env) ?? null });
  if (req.method !== "POST") return json(405, { error: "method" });

  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!(await userFromToken(token, env, deps.fetch))) return json(401, { error: "signIn" });

  const raw = await req.text();
  if (raw.length > MAX_BODY) return json(413, { error: "tooLarge" });
  let body: AssistantRequest;
  try { body = JSON.parse(raw); } catch { return json(400, { error: "badRequest" }); }
  if (!MODES.includes(body?.mode) || typeof body.text !== "string" || !body.state?.trip) return json(400, { error: "badRequest" });

  const provider = body.provider && PROVIDERS.includes(body.provider) && configured(env).includes(body.provider) ? body.provider : defaultProvider(env);
  if (!provider) return json(503, { error: "noProvider" });

  const started = Date.now();
  let r: CallResult;
  try {
    r = await (deps.call ?? callProvider)(provider, systemPrompt(body.mode), userMessage(body), env, deps.fetch);
  } catch (e) {
    const code = e instanceof ProviderError ? e.code : "failed";
    return json(code === "refused" ? 422 : 502, { error: code, provider });
  }
  const ms = Date.now() - started;
  const { proposal, dropped, error } = parseProposal(r.text);
  if (!proposal) return json(502, { error: error ?? "notJson", provider });

  const now = (deps.now ?? (() => new Date()))();
  const places = proposal.ops.flatMap((o) => (o.op === "addPlace" ? [o.place] : [])).slice(0, MAX_CHECKS);
  const checks: Record<string, Verification> = {};
  await Promise.all(places.map(async (p: ProposedPlace) => { checks[p.ref] = await verifyPlace(p, env, now, deps.fetch); }));

  const out: Proposal & { dropped: number } = {
    ...proposal, checks, dropped,
    meta: { provider, model: r.model, ms, inputTokens: r.inputTokens, outputTokens: r.outputTokens },
  };
  return json(200, out);
}
