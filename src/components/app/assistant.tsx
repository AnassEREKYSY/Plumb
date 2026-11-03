"use client";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { ArrowUp, MessageCircleQuestion, RotateCcw, Square, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { useI18n } from "@/lib/i18n/client";

const SUGGESTIONS = ["s1", "s2", "s3", "s4"] as const;
type ErrorCode = "limit" | "not_configured" | "too_long" | "generic";

function errorCode(err: Error | undefined): ErrorCode | null {
  if (!err) return null;
  try {
    const code = (JSON.parse(err.message) as { error?: string }).error;
    if (code === "limit" || code === "not_configured" || code === "too_long") return code;
  } catch {
    // not a JSON error from our route
  }
  return "generic";
}

const textOf = (m: UIMessage) =>
  m.parts
    .map((p) => (p.type === "text" ? p.text : ""))
    .join("")
    .trim();

/** Chat panel: questions about the trader's own journal, answered from their data. */
export function Assistant() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const { messages, sendMessage, status, error, stop, setMessages, clearError } = useChat({
    transport: new DefaultChatTransport({ api: "/api/assistant" }),
  });

  const busy = status === "submitted" || status === "streaming";
  const code = errorCode(error);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, status]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const send = (text: string) => {
    const q = text.trim();
    if (!q || busy) return;
    if (error) clearError();
    sendMessage({ text: q });
    setInput("");
  };

  const last = messages.at(-1);
  const waiting = busy && (!last || last.role === "user" || !textOf(last));

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label={t("assistant.open")}
        aria-expanded={open}
        aria-controls="plumb-assistant"
        className={cn(
          "fixed right-4 bottom-4 z-40 inline-flex h-11 items-center gap-2 rounded-full bg-plum pr-4 pl-3.5 text-[13.5px] font-medium text-on-plum shadow-float transition-[transform,opacity] duration-200 hover:bg-plum-hover sm:right-6 sm:bottom-6",
          open && "pointer-events-none translate-y-2 opacity-0",
        )}
      >
        <MessageCircleQuestion className="size-[18px]" strokeWidth={1.8} />
        {t("assistant.open")}
      </button>

      <section
        id="plumb-assistant"
        role="dialog"
        aria-label={t("assistant.title")}
        className={cn(
          "fixed inset-x-0 bottom-0 z-50 flex h-[min(640px,85dvh)] flex-col overflow-hidden border border-line bg-paper shadow-float transition-[transform,opacity,visibility] duration-200",
          "rounded-t-2xl sm:inset-x-auto sm:right-6 sm:bottom-6 sm:w-[400px] sm:rounded-2xl",
          open ? "visible translate-y-0 opacity-100" : "invisible translate-y-4 opacity-0",
        )}
      >
        <header className="flex items-start gap-3 border-b border-line px-4 py-3">
          <div className="min-w-0 flex-1">
            <h2 className="text-[15px] font-semibold text-ink">{t("assistant.title")}</h2>
            <p className="text-[12.5px] leading-snug text-muted">{t("assistant.subtitle")}</p>
          </div>
          {messages.length > 0 && (
            <button
              onClick={() => {
                stop();
                setMessages([]);
                clearError();
              }}
              aria-label={t("assistant.clear")}
              title={t("assistant.clear")}
              className="grid size-8 place-items-center rounded-md text-muted hover:bg-surface-2 hover:text-ink"
            >
              <RotateCcw className="size-4" />
            </button>
          )}
          <button
            onClick={() => setOpen(false)}
            aria-label={t("assistant.close")}
            className="grid size-8 place-items-center rounded-md text-muted hover:bg-surface-2 hover:text-ink"
          >
            <X className="size-[18px]" />
          </button>
        </header>

        <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4" aria-live="polite">
          {messages.length === 0 && (
            <div>
              <p className="mb-2 text-[12px] font-medium tracking-wide text-muted uppercase">{t("assistant.suggestionsTitle")}</p>
              <div className="flex flex-col items-start gap-2">
                {SUGGESTIONS.map((k) => (
                  <button
                    key={k}
                    onClick={() => send(t(`assistant.${k}`))}
                    className="rounded-full border border-line-strong bg-surface px-3 py-1.5 text-left text-[13px] text-ink-2 hover:border-mauve/60 hover:text-ink"
                  >
                    {t(`assistant.${k}`)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m) => {
            const text = textOf(m);
            if (!text) return null;
            return (
              <div key={m.id} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[88%] rounded-2xl px-3.5 py-2 text-[13.5px] leading-relaxed whitespace-pre-wrap",
                    m.role === "user" ? "rounded-br-md bg-plum text-on-plum" : "rounded-bl-md border border-line bg-surface text-ink",
                  )}
                >
                  {text}
                </div>
              </div>
            );
          })}

          {waiting && (
            <div className="flex items-center gap-2 text-[12.5px] text-muted">
              <span className="flex gap-1" aria-hidden>
                {[0, 1, 2].map((i) => (
                  <span key={i} className="size-1.5 animate-pulse rounded-full bg-mauve" style={{ animationDelay: `${i * 150}ms` }} />
                ))}
              </span>
              {t("assistant.thinking")}
            </div>
          )}

          {code && (
            <p role="alert" className="rounded-lg bg-loss-tint px-3 py-2 text-[13px] text-loss">
              {t(`assistant.errors.${code}`)}
            </p>
          )}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="border-t border-line px-3 pt-3 pb-2"
        >
          <div className="flex items-end gap-2 rounded-xl border border-line-strong bg-surface px-3 py-2 focus-within:border-mauve/70">
            <label htmlFor="assistant-input" className="sr-only">
              {t("assistant.placeholder")}
            </label>
            <textarea
              id="assistant-input"
              ref={inputRef}
              rows={1}
              value={input}
              maxLength={1000}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(input);
                }
              }}
              placeholder={t("assistant.placeholder")}
              className="max-h-28 min-h-6 flex-1 resize-none bg-transparent text-[14px] text-ink placeholder:text-muted focus:outline-none"
            />
            {busy ? (
              <button
                type="button"
                onClick={() => stop()}
                aria-label={t("assistant.stop")}
                className="grid size-8 shrink-0 place-items-center rounded-lg bg-surface-2 text-ink hover:bg-surface-3"
              >
                <Square className="size-3.5" fill="currentColor" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={!input.trim()}
                aria-label={t("assistant.send")}
                className="grid size-8 shrink-0 place-items-center rounded-lg bg-plum text-on-plum hover:bg-plum-hover disabled:opacity-40"
              >
                <ArrowUp className="size-4" strokeWidth={2.2} />
              </button>
            )}
          </div>
          <p className="mt-1.5 text-center text-[11px] text-muted">{t("assistant.disclaimer")}</p>
        </form>
      </section>
    </>
  );
}
