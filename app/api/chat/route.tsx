import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge"; // fast & cheap

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ reply: "(Server) OPENAI_API_KEY not set. Add it in Vercel → Settings → Environment Variables." }, { status: 200 });
    }

    const payload = {
      model: "gpt-4o-mini", // lightweight, good enough for hints
      messages: [
        { role: "system", content: "You are a friendly Polish/English retirement planning assistant. Be practical, explain replacement rate simply, and focus on actions users can take in Poland (ZUS, IKE/IKZE, delaying retirement). Keep answers concise." },
        ...messages,
      ],
      temperature: 0.4,
    };

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const txt = await res.text();
      return NextResponse.json({ reply: `OpenAI error: ${txt.slice(0, 200)}` }, { status: 200 });
    }

    const data = await res.json();
    const reply = data.choices?.[0]?.message?.content || "(No reply)";
    return NextResponse.json({ reply });
  } catch (e: any) {
    return NextResponse.json({ reply: `Server error: ${e?.message || e}` }, { status: 200 });
  }
}
