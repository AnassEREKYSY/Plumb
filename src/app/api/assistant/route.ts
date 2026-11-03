import { createHash } from "node:crypto";
import { openai } from "@ai-sdk/openai";
import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  isStepCount,
  streamText,
  toUIMessageStream,
  type UIMessage,
} from "ai";
import { buildAssistantInstructions } from "@/lib/assistant/instructions";
import { buildAssistantTools } from "@/lib/assistant/tools";
import { getScope } from "@/lib/data";
import { getLocale } from "@/lib/i18n/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 30;

const MAX_MESSAGES = 20; // conversation history sent to the model
const MAX_CHARS = 1000; // longest question accepted

function error(code: "not_configured" | "limit" | "too_long" | "bad_request", status: number) {
  return Response.json({ error: code }, { status });
}

/** Counts one message against the daily limits. True when the message may go through. */
async function consume(req: Request, demo: boolean): Promise<boolean> {
  if (!isSupabaseConfigured) return true; // local development without a database
  const supabase = await createClient();
  let demoKey: string | null = null;
  if (demo) {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    demoKey = createHash("sha256").update(`plumb-demo:${ip}`).digest("hex").slice(0, 32);
  }
  const { data, error: rpcError } = await supabase.rpc("assistant_consume", { p_demo_key: demoKey });
  if (rpcError) {
    console.error("assistant_consume failed", rpcError.message);
    return false;
  }
  return data === true;
}

export async function POST(req: Request) {
  if (!process.env.OPENAI_API_KEY) return error("not_configured", 503);

  let messages: UIMessage[];
  try {
    ({ messages } = (await req.json()) as { messages: UIMessage[] });
    if (!Array.isArray(messages) || messages.length === 0) throw new Error("no messages");
  } catch {
    return error("bad_request", 400);
  }

  const last = messages.at(-1);
  const question = last?.parts.map((p) => (p.type === "text" ? p.text : "")).join("") ?? "";
  if (last?.role !== "user" || !question.trim()) return error("bad_request", 400);
  if (question.length > MAX_CHARS) return error("too_long", 400);

  const { ws, account, accounts, trades, currency, tz } = await getScope();
  const demo = ws.mode === "demo";
  if (!(await consume(req, demo))) return error("limit", 429);

  const locale = await getLocale();
  const ids = new Set(accounts.map((a) => a.id));
  const rules = ws.rules.filter((r) => r.account_id == null || ids.has(r.account_id));

  const result = streamText({
    model: openai(process.env.OPENAI_MODEL || "gpt-4o-mini"),
    instructions: buildAssistantInstructions({ locale, tz, currency, account, accounts, trades, demo }),
    messages: await convertToModelMessages(messages.slice(-MAX_MESSAGES)),
    tools: buildAssistantTools({ accounts, trades, rules, setups: ws.setups, tz, currency }),
    stopWhen: isStepCount(5),
    temperature: 0.3,
    maxOutputTokens: 700,
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({ stream: result.stream }),
  });
}
