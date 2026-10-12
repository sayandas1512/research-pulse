"use client";

import Link from "next/link";
import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";
import { gsap, prefersReducedMotion } from "./motion/gsap";
import { OPEN_ASSISTANT_EVENT } from "./events";

type Message = { role: "user" | "assistant"; text: string };

const SUGGESTIONS = [
  "What's in this week's brief?",
  "How are papers picked?",
  "How do I share picks with a client?",
];

// **bold** and in-app page paths like /runs or /brief/2026-W41 (rendered as links).
const INLINE_PATTERN = /(\*\*[^*]+\*\*|\/(?:archive|log|export|runs|settings|backtest|brief\/[\w-]+)\b)/g;

function renderInline(text: string): ReactNode[] {
  // split() with a capture group puts the matches at the odd indexes.
  return text.split(INLINE_PATTERN).map((part, i) => {
    if (i % 2 === 0) return <Fragment key={i}>{part}</Fragment>;
    if (part.startsWith("**")) return <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>;
    return (
      <Link key={i} href={part} className="font-medium text-[var(--accent)] underline underline-offset-2">
        {part}
      </Link>
    );
  });
}

/** Minimal formatter for the assistant's replies: paragraphs, "- " bullet lists, bold, page links. */
function FormattedAnswer({ text }: { text: string }) {
  const blocks: ReactNode[] = [];
  let bullets: string[] = [];
  const flush = () => {
    if (bullets.length === 0) return;
    blocks.push(
      <ul key={`ul-${blocks.length}`} className="list-disc space-y-1 pl-4 marker:text-[var(--accent)]">
        {bullets.map((b, i) => (
          <li key={i}>{renderInline(b)}</li>
        ))}
      </ul>,
    );
    bullets = [];
  };
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    const bullet = line.match(/^[-*•]\s+(.*)$/);
    if (bullet) {
      bullets.push(bullet[1]);
      continue;
    }
    flush();
    if (line) blocks.push(<p key={`p-${blocks.length}`}>{renderInline(line.replace(/^#+\s*/, ""))}</p>);
  }
  flush();
  return <div className="space-y-2">{blocks}</div>;
}

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const panelRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const openAssistant = () => setOpen(true);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener(OPEN_ASSISTANT_EVENT, openAssistant);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener(OPEN_ASSISTANT_EVENT, openAssistant);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    const reduceMotion = prefersReducedMotion();
    if (open) {
      panel.style.display = "flex";
      inputRef.current?.focus();
      if (reduceMotion) gsap.set(panel, { opacity: 1, scale: 1, y: 0 });
      else gsap.fromTo(panel, { opacity: 0, scale: 0.96, y: 16 }, { opacity: 1, scale: 1, y: 0, duration: 0.35, ease: "power3.out" });
    } else if (panel.style.display === "flex") {
      if (reduceMotion) panel.style.display = "none";
      else
        gsap.to(panel, {
          opacity: 0,
          scale: 0.96,
          y: 16,
          duration: 0.2,
          ease: "power2.in",
          onComplete: () => {
            panel.style.display = "none";
          },
        });
    }
  }, [open]);

  useEffect(() => {
    const scroller = scrollRef.current;
    if (!scroller) return;
    scroller.scrollTop = scroller.scrollHeight;
    const all = scroller.querySelectorAll<HTMLElement>("[data-message]");
    const last = all[all.length - 1];
    if (last && !prefersReducedMotion()) gsap.from(last, { opacity: 0, y: 10, duration: 0.35, ease: "power2.out" });
  }, [messages.length]);

  async function send(text?: string) {
    const query = (text ?? input).trim();
    if (!query || sending) return;
    setInput("");
    setError(null);
    const nextMessages: Message[] = [...messages, { role: "user", text: query }];
    setMessages(nextMessages);
    setSending(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message ?? "Something went wrong.");
        return;
      }
      setMessages((m) => [...m, { role: "assistant", text: data.answer }]);
    } catch {
      setError("Couldn't reach the assistant.");
    } finally {
      setSending(false);
    }
  }

  // Keep clear of the right-hand navigation column on large screens.
  const offset = "right-5 lg:right-[calc(16rem+1.5rem)]";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close assistant" : "Open assistant"}
        aria-expanded={open}
        className={`fixed bottom-5 ${offset} z-40 flex h-13 items-center gap-2 rounded-full bg-[var(--foreground)] px-5 py-3.5 text-sm font-medium text-[var(--background)] shadow-[0_14px_30px_-12px_rgba(0,0,0,0.5)] transition-transform hover:scale-[1.03] active:scale-95`}
      >
        {open ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 12h4l2-7 4 14 3-11 2 4h5" />
          </svg>
        )}
        {open ? "Close" : "Ask"}
      </button>

      <div
        ref={panelRef}
        role="dialog"
        aria-label="Research Pulse assistant"
        style={{ display: "none" }}
        className={`fixed bottom-22 ${offset} z-40 max-h-[min(640px,calc(100vh-8rem))] w-[min(92vw,380px)] origin-bottom-right flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[0_30px_60px_-20px_rgba(0,0,0,0.35)]`}
      >
        <div className="border-b border-[var(--border)] px-5 pb-4 pt-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">Assistant</p>
          <p className="mt-1 font-serif text-2xl leading-none text-[var(--foreground)]">Ask Research Pulse</p>
          <p className="mt-1.5 text-xs text-[var(--muted)]">Short, plain answers about your briefs and how the app works.</p>
        </div>

        <div ref={scrollRef} className="flex min-h-48 flex-1 flex-col gap-3 overflow-y-auto px-5 py-4">
          {messages.length === 0 && !sending && (
            <div>
              <p className="mb-3 text-sm text-[var(--muted)]">Try one of these:</p>
              <div className="flex flex-col items-start gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => send(s)}
                    className="rounded-full border border-[var(--border)] px-3 py-1.5 text-left text-sm text-[var(--foreground)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((m, i) => (
            <div
              key={i}
              data-message
              className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                m.role === "user"
                  ? "self-end rounded-br-md bg-[var(--accent)] text-[var(--accent-foreground)]"
                  : "self-start rounded-bl-md bg-[var(--surface-muted)] text-[var(--foreground)]"
              }`}
            >
              {m.role === "assistant" ? <FormattedAnswer text={m.text} /> : m.text}
            </div>
          ))}
          {sending && (
            <div className="flex items-center gap-1 self-start rounded-2xl bg-[var(--surface-muted)] px-3.5 py-3" aria-label="Thinking">
              {[0, 150, 300].map((d) => (
                <span key={d} className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--muted)]" style={{ animationDelay: `${d}ms` }} />
              ))}
            </div>
          )}
          {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
          className="flex items-center gap-2 border-t border-[var(--border)] p-3"
        >
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question…"
            disabled={sending}
            className="min-w-0 flex-1 rounded-full border border-[var(--border)] bg-[var(--background)] px-4 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent)] disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            className="shrink-0 rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--accent-foreground)] transition-opacity hover:opacity-90 disabled:pointer-events-none disabled:opacity-40"
          >
            Send
          </button>
        </form>
      </div>
    </>
  );
}
