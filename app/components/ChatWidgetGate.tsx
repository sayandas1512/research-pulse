import ChatWidget from "./ChatWidget";

/** Renders the assistant only when a Dify app is actually configured. */
export default function ChatWidgetGate() {
  if (!process.env.DIFY_API_URL || !process.env.DIFY_API_KEY) return null;
  return <ChatWidget />;
}
