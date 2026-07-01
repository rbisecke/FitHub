"use client";

import { useRef, useEffect } from "react";
import { Square } from "lucide-react";

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
    <div className="shrink-0 px-[14px] pt-[10px] pb-[calc(14px+env(safe-area-inset-bottom))]">
      {/* Unified input container — matches mockup */}
      <div
        className="flex items-end gap-2.5 border border-[var(--border)]"
        style={{
          background: "var(--card)",
          borderRadius: 14,
          padding: "8px 8px 8px 16px",
        }}
      >
        <textarea
          ref={textareaRef}
          rows={1}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          disabled={disabled || isStreaming}
          maxLength={CHAR_LIMIT}
          placeholder="Ask your coach anything…"
          aria-label="Message the coach"
          aria-describedby="chat-input-hint"
          data-testid="coach-chat-input"
          className="flex-1 resize-none bg-transparent border-0 text-[14px] leading-relaxed text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none min-h-[24px] max-h-[120px] py-1.5 disabled:opacity-50"
        />

        {isStreaming ? (
          <button
            type="button"
            onClick={onStop}
            aria-label="Stop generating"
            className="shrink-0 flex items-center justify-center w-10 h-10"
            style={{ borderRadius: 10, background: "var(--border)" }}
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
            className="shrink-0 flex items-center justify-center w-10 h-10 hover:brightness-110 transition-all disabled:opacity-40"
            style={{ borderRadius: 10, background: "var(--accent)" }}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#0A0D12"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
            </svg>
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
