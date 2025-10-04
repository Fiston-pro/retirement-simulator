"use client";

import React from "react";
import { focusRing, VisuallyHidden } from "@/components/a11y/WCAGKit";

export const dynamic = "force-dynamic";

type Msg = { role: "user" | "assistant"; content: string };

export default function AssistantPage() {
  const [messages, setMessages] = React.useState<Msg[]>([
    { role: "assistant", content: "Hi! I’m your retirement assistant. Ask me about replacement rate, pension age, or how to boost your future benefit." },
  ]);
  const [input, setInput] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  async function send() {
    const text = input.trim();
    if (!text) return;
    setInput("");
    const next = [...messages, { role: "user", content: text } as Msg];
    setMessages(next);
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next.slice(-12) }),
      });
      if (!res.ok) throw new Error("Request failed");
      const data = await res.json();
      setMessages((m) => [...m, { role: "assistant", content: data.reply }]);
    } catch (e) {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: "(Demo note) API not configured. Set OPENAI_API_KEY on Vercel and redeploy." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#F3F6FA] text-[#001B2E]">
      <section className="max-w-3xl mx-auto px-6 pt-10">
        <h1 className="text-2xl font-semibold text-[#00416E]">Retirement assistant</h1>
        <p className="text-sm text-gray-600 mt-1">Ask about pensions, savings, replacement rate, or ways to improve your outcome.</p>

        <div className="bg-white rounded-3xl p-6 shadow-sm mt-6">
          <div className="space-y-3">
            {messages.map((m, i) => (
              <div key={i} className={m.role === "user" ? "text-right" : "text-left"}>
                <div className={`inline-block px-3 py-2 rounded-2xl ${m.role === "user" ? "bg-[#3F84D2] text-white" : "bg-[#F1F5F9]"}`}>
                  {m.content}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 flex gap-2">
            <label className="sr-only" htmlFor="assistant-input">Ask assistant</label>
            <input
              id="assistant-input"
              className={`flex-1 p-2 border rounded ${focusRing}`}
              placeholder="How can I raise my replacement rate?"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") send(); }}
            />
            <button onClick={send} className={`px-4 py-2 rounded bg-[#00993F] text-white ${focusRing}`} disabled={loading}>
              {loading ? "Thinking…" : "Send"}
            </button>
          </div>

          <p className="text-xs text-gray-500 mt-2">
            Tip: Try “What’s a replacement rate?”, “What if I retire 2 years later?”, or “How to invest extra 200 PLN monthly?”.
          </p>
        </div>
      </section>
    </div>
  );
}
