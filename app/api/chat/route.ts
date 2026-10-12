import { NextResponse } from "next/server";

interface ChatRequestBody {
  query?: string;
  conversationId?: string;
}

export async function POST(request: Request) {
  const apiUrl = process.env.DIFY_API_URL;
  const apiKey = process.env.DIFY_API_KEY;
  if (!apiUrl || !apiKey) {
    return NextResponse.json({ error: "not_configured", message: "The assistant isn't set up yet." }, { status: 503 });
  }

  let body: ChatRequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "bad_request", message: "Malformed request." }, { status: 400 });
  }

  const query = body.query?.trim();
  if (!query) {
    return NextResponse.json({ error: "bad_request", message: "Message is empty." }, { status: 400 });
  }

  try {
    const res = await fetch(`${apiUrl.replace(/\/$/, "")}/chat-messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        inputs: {},
        query,
        response_mode: "blocking",
        conversation_id: body.conversationId || undefined,
        user: "kavita",
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      console.error("Dify chat-messages error", res.status, detail);
      return NextResponse.json({ error: "upstream_error", message: "The assistant couldn't answer that just now." }, { status: 502 });
    }

    const data = await res.json();
    return NextResponse.json({ answer: data.answer as string, conversationId: data.conversation_id as string });
  } catch (error) {
    console.error("Dify chat-messages request failed", error);
    return NextResponse.json({ error: "network_error", message: "Couldn't reach the assistant." }, { status: 502 });
  }
}
