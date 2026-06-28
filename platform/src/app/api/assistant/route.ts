import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { TOOLS, runTool, buildSystem } from "@/lib/ai-tools";

export const dynamic = "force-dynamic";

// Server-side AI: the agentic tool loop runs here, tools execute against the
// RLS + role-scoped DB, and the API key never leaves the server.
export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "AI is not configured — set ANTHROPIC_API_KEY in platform/.env." }, { status: 500 });
  }

  let session;
  try {
    session = await getSession();
  } catch {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const incoming: Array<{ role?: string; content?: unknown }> = Array.isArray(body?.messages) ? body.messages : [];

  const client = new Anthropic();
  const system = buildSystem(session);
  const convo: Anthropic.MessageParam[] = incoming.map((m) => ({
    role: m.role === "assistant" ? "assistant" : "user",
    content: String(m.content ?? ""),
  }));

  const WRITE_TOOLS = new Set(["create_requisition", "add_candidate", "request_comp_change", "request_leave"]);
  let mutated = false;

  try {
    for (let i = 0; i < 6; i++) {
      const res = await client.messages.create({
        model: "claude-opus-4-8",
        max_tokens: 1024,
        system,
        tools: TOOLS,
        messages: convo,
      });
      convo.push({ role: "assistant", content: res.content as Anthropic.ContentBlockParam[] });

      if (res.stop_reason === "tool_use") {
        const results: Anthropic.ContentBlockParam[] = [];
        for (const block of res.content) {
          if (block.type === "tool_use") {
            const out = await runTool(block.name, block.input as Record<string, unknown>, session);
            if (WRITE_TOOLS.has(block.name) && out && typeof out === "object" && "ok" in out) mutated = true;
            results.push({ type: "tool_result", tool_use_id: block.id, content: JSON.stringify(out) });
          }
        }
        convo.push({ role: "user", content: results });
        continue;
      }

      const text = res.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("\n")
        .trim();
      return NextResponse.json({ reply: text || "I couldn't find an answer to that.", mutated });
    }
    return NextResponse.json({ reply: "That took too many steps — try narrowing the question.", mutated });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "AI error" }, { status: 500 });
  }
}
