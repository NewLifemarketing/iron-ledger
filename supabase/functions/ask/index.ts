// Iron Ledger — coach Edge Function
//
// Sits between the app and the Anthropic API so your API key never
// ships to the browser. Requires a signed-in caller: the JWT is
// verified against your project before anything is forwarded.
//
// Deploy:
//   supabase functions deploy ask
//   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const MODEL = "claude-sonnet-5";
const MAX_TOKENS = 700;
const MAX_QUESTION = 2000;
const MAX_CONTEXT = 6000;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  const key = Deno.env.get("ANTHROPIC_API_KEY");
  if (!key) return json({ error: "ANTHROPIC_API_KEY is not set on this project" }, 500);

  // Only signed-in users get to spend your tokens.
  const auth = req.headers.get("Authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return json({ error: "Not signed in" }, 401);
  const supa = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: auth } } },
  );
  const { data: who, error: authErr } = await supa.auth.getUser();
  if (authErr || !who?.user) return json({ error: "Not signed in" }, 401);

  let payload: {
    question?: string;
    context?: string;
    system?: string;
    history?: { role: string; content: string }[];
  };
  try {
    payload = await req.json();
  } catch {
    return json({ error: "Body must be JSON" }, 400);
  }

  const question = (payload.question ?? "").toString().slice(0, MAX_QUESTION).trim();
  if (!question) return json({ error: "No question given" }, 400);
  const context = (payload.context ?? "").toString().slice(0, MAX_CONTEXT);

  // Only user/assistant turns, newest last, capped so one long session
  // cannot balloon the request.
  const history = (Array.isArray(payload.history) ? payload.history : [])
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .slice(-8)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 4000) }));

  const messages = [
    ...history,
    { role: "user", content: `My current training data:\n${context}\n\nQuestion: ${question}` },
  ];

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: payload.system ?? "You are a strength and physique coach. Be concrete and brief.",
        messages,
      }),
    });

    const body = await res.json();
    if (!res.ok) {
      const msg = body?.error?.message ?? `Anthropic returned ${res.status}`;
      return json({ error: msg }, 502);
    }
    const reply = (body.content ?? [])
      .filter((b: { type: string }) => b.type === "text")
      .map((b: { text: string }) => b.text)
      .join("\n")
      .trim();

    return json({ reply: reply || "No answer came back.", usage: body.usage ?? null });
  } catch (e) {
    return json({ error: `Could not reach the model: ${(e as Error).message}` }, 502);
  }
});
