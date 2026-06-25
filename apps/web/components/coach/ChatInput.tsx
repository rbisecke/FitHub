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

  // Expose ref so parent can call focus after session switch
  useEffect(() => {
    resetHeight();
  }, [value]);

  return (
    <div className="shrink-0 border-t border-[#30363d] bg-[#0d1117] p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          rows={1}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          disabled={disabled || isStreaming}
          maxLength={CHAR_LIMIT}
          placeholder="Message the coach…"
          aria-label="Message the coach"
          aria-describedby="chat-input-hint"
          data-testid="coach-chat-input"
          className="flex-1 resize-none overflow-y-auto rounded-md border border-[#30363d] bg-[#161b22] px-3 py-2 font-mono text-sm text-[#e6edf3] placeholder:text-[#8b949e] focus:outline-none focus:ring-1 focus:ring-[#58a6ff] disabled:opacity-50"
        />

        {isStreaming ? (
          <button
            type="button"
            onClick={onStop}
            aria-label="Stop generating"
            className="shrink-0 flex items-center justify-center rounded-md bg-[#30363d] hover:bg-[#30363d]/80 px-3 py-2 min-h-[2.25rem] min-w-[2.25rem]"
          >
            <Square size={14} className="text-[#e6edf3]" aria-hidden />
          </button>
        ) : (
          <button
            type="button"
            onClick={onSubmit}
            disabled={disabled || !value.trim()}
            aria-label="Send message"
            data-testid="coach-submit"
            className="shrink-0 flex items-center justify-center rounded-md bg-[#58a6ff] hover:bg-[#58a6ff]/80 px-3 py-2 min-h-[2.25rem] min-w-[2.25rem] disabled:opacity-40"
          >
            <Send size={14} className="text-[#0d1117]" aria-hidden />
          </button>
        )}
      </div>

      <div className="flex items-center justify-between mt-1.5">
        <span id="chat-input-hint" className="sr-only">
          Press Enter to send, Shift+Enter for a new line
        </span>
        <span className="hidden md:block font-mono text-[10px] text-[#8b949e]">
          ⏎ send · ⇧⏎ newline
        </span>
        {value.length >= CHAR_WARN && (
          <span className="font-mono text-[10px] text-[#8b949e] ml-auto">
            {value.length} / {CHAR_LIMIT}
          </span>
        )}
      </div>
    </div>
  );
}
