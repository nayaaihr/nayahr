"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Msg = { role: "user" | "assistant"; content: string };

export function Assistant({ role }: { role: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);

  const chips =
    role === "employee" ? ["Show my record", "What's my salary?", "Apply for 2 days casual leave next Monday"]
    : role === "manager" ? ["How many people on my team?", "Average salary on my team", "Open a requisition for a Senior Engineer in Bengaluru"]
    : ["Headcount by department", "Average salary by department", "Raise Pooja Nair's salary to ₹18L"];

  async function send(q: string) {
    if (!q.trim() || busy) return;
    const next: Msg[] = [...msgs, { role: "user", content: q }];
    setMsgs(next);
    setInput("");
    setBusy(true);
    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      const data = await res.json();
      setMsgs((m) => [...m, { role: "assistant", content: data.reply ?? data.error ?? "Something went wrong." }]);
      if (data.mutated) router.refresh(); // an action changed data — re-render server components
    } catch {
      setMsgs((m) => [...m, { role: "assistant", content: "Network error — is the server running?" }]);
    } finally {
      setBusy(false);
    }
  }

  function toggle() {
    setOpen((o) => !o);
    if (!msgs.length) {
      setMsgs([{ role: "assistant", content: `Hi! Ask me about your people data. I can only see what your ${role} role allows.` }]);
    }
  }

  return (
    <>
      <button className="ai-fab" onClick={toggle} title="Ask NayaHR AI">✦</button>
      {open && (
        <div className="ai-panel">
          <div className="ai-hd">
            <div className="t">✦ NayaHR Assistant</div>
            <div className="s">Server-side · scoped to your {role} access</div>
          </div>
          <div className="ai-body">
            {msgs.map((m, i) => (
              <div key={i} className={"ai-msg " + m.role}>{m.content}</div>
            ))}
            {busy && <div className="ai-msg assistant" style={{ opacity: 0.6 }}>●●● thinking…</div>}
          </div>
          <div className="ai-chips">
            {chips.map((c) => (
              <span key={c} className="chip" onClick={() => send(c)}>{c}</span>
            ))}
          </div>
          <div className="ai-foot">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") send(input); }}
              placeholder="Ask about your people…"
            />
            <button className="btn" onClick={() => send(input)} disabled={busy}>Send</button>
          </div>
        </div>
      )}
    </>
  );
}
