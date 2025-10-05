// components/site/ui.tsx
"use client";

import React from "react";
import { usePathname, useRouter } from "next/navigation";
import { focusRing } from "@/components/a11y/WCAGKit";
import { useUserCtx } from "@/lib/userCtx";
import Image from "next/image";

import { loginAnon, loginGoogle, logout } from "@/lib/firebase";


/* ---------- ZUS palette (RGB → HEX) ---------- */
const ZUS = {
  orange: "#FFB34F", // (255,179,79)
  green:  "#00993F", // (0,153,63)
  gray:   "#BEC3CE", // (190,195,206)
  blue:   "#3F84D2", // (63,132,210)
  navy:   "#00416E", // (0,65,110)
  red:    "#F05E5E", // (240,94,94)
  black:  "#000000", // (0,0,0)
} as const;

/* ---------- Header ---------- */

// We keep UI header auth simple; Simulate page uses Firebase auth for real saving
export function Header() {
  const path = usePathname();
  const router = useRouter();
  const { user, profile } = useUserCtx();

  const link = (href: string, label: string) => (
    <a href={href} className={`px-3 py-2 rounded-2xl text-sm ${focusRing} ${path === href ? "bg-white/20 text-white" : "text-white/90 hover:text-white"}`}>
      {label}
    </a>
  );

  const initials =
    (profile?.name || user?.displayName || "")
      .split(" ")
      .map((s) => s[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase();

  return (
    <header className={`${headerGradient} text-white`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
        <button onClick={() => router.push("/")} className={`flex items-center gap-2 ${focusRing}`} aria-label="Home">
          <Image src="/brand/logo.png" alt="Pension Simulator logo" width={32} height={32} className="rounded-lg bg-white" priority />
          <span className="font-semibold">Pension Simulator</span>
        </button>

        <nav aria-label="Primary" className="hidden md:flex items-center gap-1">
          {link("/simulate", "Simulator")}
          {link("/admin", "Admin")}
        </nav>

        <div className="flex items-center gap-2">
          {!user ? (
            <>
              <button onClick={loginAnon} className={`px-3 py-2 rounded-2xl bg-white/20 text-white ${focusRing}`}>Anon</button>
              <button onClick={loginGoogle} className={`px-3 py-2 rounded-2xl bg-white text-[#00416E] font-medium ${focusRing}`}>Google</button>
            </>
          ) : (
            <>
              <button onClick={() => router.push("/profile")} className={`flex items-center gap-2 px-3 py-2 rounded-2xl bg-white/15 ${focusRing}`} aria-label="Open simulator">
                <div aria-hidden className="w-7 h-7 rounded-full bg-white/90 text-[#00416E] grid place-items-center text-xs font-bold">
                  {initials || "U"}
                </div>
                <span className="hidden sm:inline">{profile?.name || user.displayName || user.email}</span>
              </button>
              <button onClick={logout} className={`px-3 py-2 rounded-2xl bg-white text-[#00416E] font-medium ${focusRing}`}>Log out</button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

/* ---------- Assistant Widget ---------- */

// UI roles we actually render as chat bubbles
type ChatRole = "user" | "assistant";
type ChatMessage = { role: ChatRole; content: string };

export const pageGradient = "bg-[linear-gradient(135deg,#F3F6FA_0%,#EAF1FB_40%,#E7F6EE_100%)]";
const headerGradient = "bg-[linear-gradient(90deg,#3F84D2_0%,#00993F_100%)]";


// Normalize any string roles coming back from your API
function normalizeRole(r: string | undefined): ChatRole {
  return r === "user" ? "user" : "assistant";
}

export function AssistantWidget() {
  const [open, setOpen] = React.useState(false);
  const [input, setInput] = React.useState("");
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);

  // Allow opening via #assistant hash
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const check = () => {
      if (window.location.hash.toLowerCase().includes("assistant")) setOpen(true);
    };
    check();
    window.addEventListener("hashchange", check);
    (window as any).__openAssistant = () => setOpen(true);
    return () => window.removeEventListener("hashchange", check);
  }, []);

  async function sendMessage() {
    const text = input.trim();
    if (!text) return;

    // Append the user's message
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setInput("");

    try {
      // Call your chat API. Adjust payload shape to match your /api/chat implementation.
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, { role: "user", content: text }],
        }),
      });

      const data = await res.json();

      // Find a reply string safely
      const replyText: string =
        data?.reply ??
        data?.message ??
        (Array.isArray(data?.messages) ? data.messages.at(-1)?.content : "") ??
        "";

      setMessages((prev) => [
        ...prev,
        { role: normalizeRole(data?.role || "assistant"), content: String(replyText || "…") },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, I couldn’t reach the assistant right now." },
      ]);
    }
  }

  return (
    <div className="fixed right-3 bottom-3 z-40">
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className={`rounded-full p-3 shadow-lg text-white ${focusRing}`}
          style={{ background: `linear-gradient(135deg,${ZUS.blue},${ZUS.green})` }}
          aria-label="Open assistant"
        >
          💬
        </button>
      ) : (
        <div className="w-[92vw] max-w-sm rounded-2xl bg-white shadow-xl border overflow-hidden">
          <div
            className="px-3 py-2 text-white flex items-center justify-between"
            style={{ background: `linear-gradient(135deg,${ZUS.blue},${ZUS.green})` }}
          >
            <strong>Assistant</strong>
            <button
              onClick={() => setOpen(false)}
              className={`px-2 py-1 rounded bg-white/20 ${focusRing}`}
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          {/* Chat transcript */}
          <div className="p-4 max-h-[55vh] overflow-auto space-y-3 text-sm">
            {messages.map((m, i) => (
              <div key={i} className={m.role === "user" ? "text-right" : "text-left"}>
                <div
                  className={`inline-block px-3 py-2 rounded-2xl ${
                    m.role === "user"
                      ? "text-white"
                      : "bg-[#F1F5F9] text-[#001B2E]"
                  }`}
                  style={
                    m.role === "user"
                      ? { background: ZUS.blue }
                      : undefined
                  }
                >
                  {m.content}
                </div>
              </div>
            ))}
            {messages.length === 0 && (
              <div className="text-gray-500 text-center">
                Ask anything about your retirement plan, replacement rate, or how to reach your goal.
              </div>
            )}
          </div>

          {/* Composer */}
          <form
            className="p-3 border-t flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage();
            }}
          >
            <input
              className={`flex-1 p-2 border rounded ${focusRing}`}
              placeholder="Ask about your retirement…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
            <button
              type="submit"
              className={`px-3 py-2 rounded text-white ${focusRing}`}
              style={{ background: ZUS.green }}
            >
              Send
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

/* ---------- (Optional) Footer ---------- */

export function Footer() {
  return (
    <footer className="mt-8 text-xs text-center text-[#475569] py-6">
      Built for education. Estimates only — not an official ZUS calculation.
    </footer>
  );
}
