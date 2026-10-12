import ChatWidget from "./ChatWidget";

/** Renders the assistant only when Gemini is actually configured (it always should be —
 * the pipeline itself depends on it — but fail closed rather than crash if it's ever missing). */
export default function ChatWidgetGate() {
  if (!process.env.GEMINI_API_KEY || !process.env.GEMINI_MODEL) return null;
  return <ChatWidget />;
}
