// Vercel Function: POST /api/assistant asks the AI, GET /api/assistant lists the configured providers.
import { handle } from "../server/assistant";

const deps = () => ({ env: process.env, fetch });

export function GET(request: Request) {
  return handle(request, deps());
}

export function POST(request: Request) {
  return handle(request, deps());
}
