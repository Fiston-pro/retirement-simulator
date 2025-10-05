import { NextRequest, NextResponse } from "next/server";
export const runtime = "edge";

export async function POST(req: NextRequest) {
  try {
    const { messages, userContext } = await req.json();
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return NextResponse.json({ reply: "(Server) OPENAI_API_KEY not set. Add it in Vercel." }, { status: 200 });

    const contextLine = userContext
      ? `User context: ${JSON.stringify(userContext)}. Use this to tailor guidance (e.g., refer to user's salary/desired pension succinctly).`
      : "No user context provided.";

    const payload = {
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a concise PL/EN retirement assistant. Short paragraphs, up to 5 bullets. Explain replacement rate in one line, focus on ZUS/IKE/IKZE and delaying retirement.",
        },
        { role: "system", content: contextLine },
        ...messages,
      ],
      temperature: 0.3,
      max_tokens: 350,
    };

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const t = await res.text();
      return NextResponse.json({ reply: `OpenAI error: ${t.slice(0, 200)}` }, { status: 200 });
    }
    const data = await res.json();
    return NextResponse.json({ reply: data.choices?.[0]?.message?.content || "(No reply)" });
  } catch (e: any) {
    return NextResponse.json({ reply: `Server error: ${e?.message || e}` }, { status: 200 });
  }
}
