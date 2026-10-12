"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";

type Message = { role: "user" | "assistant"; text: string };

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!panelRef.current) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (open) {
      panelRef.current.style.display = "flex";
      if (reduceMotion) {
        gsap.set(panelRef.current, { opacity: 1, scale: 1, y: 0 });
      } else {
        gsap.fromTo(
          panelRef.current,
          { opacity: 0, scale: 0.95, y: 12 },
          { opacity: 1, scale: 1, y: 0, duration: 0.25, ease: "power2.out" },
        );
      }
    } else if (panelRef.current.style.display === "flex") {
      if (reduceMotion) {
        panelRef.current.style.display = "none";
      } else {
        gsap.to(panelRef.current, {
          opacity: 0,
          scale: 0.95,
          y: 12,
          duration: 0.18,
          ease: "power1.in",
          onComplete: () => {
            if (panelRef.current) panelRef.current.style.display = "none";
          },
        });
      }
    }
  }, [open]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, sending]);

  async function send() {
    const query = input.trim();
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

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close assistant" : "Open assistant"}
        className="fixed bottom-5 right-5 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--accent)] text-[var(--accent-foreground)] shadow-lg shadow-[var(--accent)]/30 transition-transform hover:scale-105 active:scale-95"
      >
        {open ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
          </svg>
        )}
      </button>

      <div
        ref={panelRef}
        style={{ display: "none" }}
        className="fixed bottom-20 right-5 z-40 w-[min(92vw,360px)] flex-col overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl"
      >
        <div className="border-b border-[var(--border)] px-4 py-3">
          <p className="text-sm font-semibold text-[var(--foreground)]">Research Pulse assistant</p>
          <p className="text-xs text-[var(--muted)]">Ask about this week&apos;s brief, past picks, or how the pipeline works.</p>
        </div>

        <div ref={scrollRef} className="flex max-h-80 min-h-40 flex-col gap-2 overflow-y-auto px-4 py-3">
          {messages.length === 0 && !sending && (
            <p className="text-sm text-[var(--muted)]">No messages yet — ask a question to get started.</p>
          )}
          {messages.map((m, i) => (
            <div
              key={i}
              className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                m.role === "user"
                  ? "self-end bg-[var(--accent)] text-[var(--accent-foreground)]"
                  : "self-start bg-[var(--surface-muted)] text-[var(--foreground)]"
              }`}
            >
              {m.text}
            </div>
          ))}
          {sending && <p className="self-start text-xs text-[var(--muted)]">Thinking...</p>}
          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>

        <div className="flex items-center gap-2 border-t border-[var(--border)] p-3">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="Ask a question..."
            disabled={sending}
            className="min-w-0 flex-1 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent)] disabled:opacity-60"
          />
          <button
            type="button"
            onClick={send}
            disabled={sending || !input.trim()}
            className="shrink-0 rounded-md bg-[var(--accent)] px-3 py-1.5 text-sm font-medium text-[var(--accent-foreground)] transition-opacity hover:opacity-90 disabled:pointer-events-none disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </div>
    </>
  );
}
