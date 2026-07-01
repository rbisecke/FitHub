"use client";

import { useRef, useEffect } from "react";
import { Send, Square } from "lucide-react";

const MAX_HEIGHT_PX = 120;
const CHAR_LIMIT = 2000;
const CHAR_WARN = 1500;

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onStop?: () => void;
  disabled?: boolean;
  isStreaming?: boolean;
  autoFocus?: boolean;
}

export function ChatInput({
  value,
  onChange,
  onSubmit,
  onStop,
  disabled = false,
  isStreaming = false,
  autoFocus = false,
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (autoFocus && textareaRef.current) {
      const isMobile = window.innerWidth < 768;
      if (!isMobile) textareaRef.current.focus();
    }
  }, [autoFocus]);

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    onChange(e.target.value);
    const el = e.currentTarget;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, MAX_HEIGHT_PX)}px`;
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!disabled && !isStreaming && value.trim()) onSubmit();
    }
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      if (!disabled && !isStreaming && value.trim()) onSubmit();
    }
  }

  function resetHeight() {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }

  // Reset height when value is cleared (e.g. after send)
  useEffect(() => {
    resetHeight();
  }, [value]);

  return (
    <div className="shrink-0 border-t border-[var(--border)] bg-[var(--background)] px-[22px] py-3.5 pb-[calc(0.875rem+env(safe-area-inset-bottom))]">
      <div className="flex items-end gap-2.5">
        <textarea
          ref={textareaRef}
          rows={1}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          disabled={disabled || isStreaming}
          maxLength={CHAR_LIMIT}
          placeholder="Ask your coach..."
          aria-label="Message the coach"
          aria-describedby="chat-input-hint"
          data-testid="coach-chat-input"
          className="flex-1 resize-none overflow-y-auto rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3.5 py-3 text-[14px] leading-relaxed text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:border-[var(--accent)] min-h-[44px] max-h-[120px] disabled:opacity-50"
        />

        {isStreaming ? (
          <button
            type="button"
            onClick={onStop}
            aria-label="Stop generating"
            className="shrink-0 flex items-center justify-center rounded-[11px] bg-[var(--border)] hover:bg-[var(--border)]/80 w-11 h-11"
          >
            <Square
              size={14}
              className="text-[var(--foreground)]"
              aria-hidden
            />
          </button>
        ) : (
          <button
            type="button"
            onClick={onSubmit}
            disabled={disabled || !value.trim()}
            aria-label="Send message"
            data-testid="coach-submit"
            className="shrink-0 flex items-center justify-center rounded-[11px] bg-[var(--blue)] hover:brightness-110 transition-all w-11 h-11 disabled:opacity-40"
          >
            <Send size={14} className="text-[#0A0D12]" aria-hidden />
          </button>
        )}
      </div>

      <div className="flex items-center justify-between mt-1.5">
        <span id="chat-input-hint" className="sr-only">
          Press Enter to send, Shift+Enter for a new line
        </span>
        <span className="hidden md:block font-mono text-[10px] text-[var(--muted-foreground)]">
          ⏎ send · ⇧⏎ newline
        </span>
        {value.length >= CHAR_WARN && (
          <span className="font-mono text-[10px] text-[var(--muted-foreground)] ml-auto">
            {value.length} / {CHAR_LIMIT}
          </span>
        )}
      </div>
    </div>
  );
}
