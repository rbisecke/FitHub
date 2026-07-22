/**
 * User turn — right-aligned, filled hero-accent bubble (design-spec 03 §0.3).
 * One turn-taking mechanism for the whole domain: filled user bubble vs. flush
 * assistant block (see `AssistantMessage`), never row-banding.
 */
export function UserBubble({ content }: { content: string }) {
  return (
    <div className="flex justify-end">
      <div
        className="max-w-[85%] rounded-2xl px-4 py-2.5 font-sans text-[15px] leading-relaxed break-words whitespace-pre-wrap"
        style={{
          background: "var(--accent)",
          color: "var(--accent-foreground)",
        }}
        data-testid="chat-user-bubble"
      >
        {content}
      </div>
    </div>
  );
}
